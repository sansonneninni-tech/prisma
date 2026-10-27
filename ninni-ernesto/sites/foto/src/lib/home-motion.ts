/**
 * Sequenza dell'apertura (C18, DIREZIONE §8 A4): l'opera cambia ogni 2,5 s (home.json: `intervalloMs`),
 * di colpo («taglio») o con dissolvenza; didascalia, contatore e link cambiano insieme all'opera.
 * Si ferma con: Pausa (diventa «Riprendi»), riduci movimento (resta la prima opera e Pausa non c'è),
 * scheda nascosta, fuoco o mouse sull'opera, apertura fuori dallo schermo. Ripartendo aspetta un intervallo intero.
 * Si scarica solo la prossima opera (dopo `load` la seconda, poi a ogni cambio quella dopo: audit di ninni 22/10, peso),
 * della misura giusta (srcset/sizes AVIF/WebP in Sequenza.astro); si passa a un'opera solo quando è decodificata.
 * Funziona anche dopo il ClientRouter (astro:page-load) e si spegne prima del cambio pagina.
 */
const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
let spegni: (() => void) | null = null;

function caricata(pic: HTMLElement): Promise<void> {
  const img = pic.querySelector('img');
  if (!img) return Promise.resolve();
  for (const s of pic.querySelectorAll<HTMLSourceElement>('source[data-srcset]')) {
    s.srcset = s.dataset.srcset!;
    s.removeAttribute('data-srcset');
  }
  if (img.dataset.src) {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  }
  return img.decode().catch(() => undefined);
}

function avvia() {
  const root = document.querySelector<HTMLElement>('[data-seq]');
  if (!root || root.dataset.seqPronta) return;
  root.dataset.seqPronta = '';
  const pics = [...root.querySelectorAll<HTMLElement>('[data-seq-pic]')];
  const ctrl = root.querySelector<HTMLElement>('[data-seq-ctrl]');
  const btn = root.querySelector<HTMLButtonElement>('[data-seq-btn]');
  const link = root.querySelector<HTMLAnchorElement>('[data-seq-a]');
  const cap = root.querySelector<HTMLElement>('.seq__cap');
  const t0 = root.querySelector<HTMLElement>('[data-seq-t]');
  const m0 = root.querySelector<HTMLElement>('[data-seq-m]');
  const virgola = m0?.previousSibling?.textContent ?? ', ';
  const acq0 = root.querySelector<HTMLElement>('[data-seq-acq]');
  const tm0 = root.querySelector<HTMLElement>('[data-seq-tm]');
  const conta = root.querySelector<HTMLElement>('[data-seq-n]');
  if (pics.length < 2 || !ctrl || !btn || !link) return;

  const passo = Math.max(1000, Number(root.dataset.intervallo) || 2500);
  const totale = String(pics.length).padStart(2, '0');
  const pronte = new Map<number, Promise<void>>([[0, Promise.resolve()]]);
  const carica = (k: number) => {
    let p = pronte.get(k);
    if (!p) { p = caricata(pics[k]!); pronte.set(k, p); }
    return p;
  };

  let i = 0;
  let timer = 0;
  let pausa = false; // scelta di chi guarda (bottone)
  let sopra = false; // mouse sull'opera
  let fuoco = false; // fuoco sull'opera
  let visibile = true; // apertura sullo schermo
  let caricamento = false; // dopo load: si può scaricare la prossima opera

  const ferma = () => pausa || sopra || fuoco || !visibile || document.hidden || RM.matches;

  function mostra(k: number) {
    const pic = pics[k]!;
    pics[i]!.removeAttribute('data-on');
    pic.setAttribute('data-on', '');
    i = k;
    link!.href = pic.dataset.href ?? link!.href;
    // didascalia rifatta con nodi nuovi: i nodi che restano e si spostano conterebbero come layout shift (CLS)
    if (cap && t0) {
      const t = t0.cloneNode(false) as HTMLElement;
      t.textContent = pic.dataset.titolo ?? '';
      const tm = (tm0 ?? cap).cloneNode(false) as HTMLElement;
      tm.append(t);
      if (pic.dataset.misure && m0) {
        const m = m0.cloneNode(false) as HTMLElement;
        m.textContent = pic.dataset.misure;
        tm.append(document.createTextNode(virgola), m);
      }
      const nodi: Node[] = tm0 ? [tm] : [...tm.childNodes];
      // prezzo e «Acquista →» (shop, audit ninni 22/10): copia fresca del gruppo, col prezzo e il link dell'opera
      if (acq0) {
        const acq = acq0.cloneNode(true) as HTMLElement;
        acq.hidden = !pic.dataset.prezzo;
        const p = acq.querySelector<HTMLElement>('[data-seq-p]');
        const a = acq.querySelector<HTMLAnchorElement>('[data-seq-buy]');
        if (p) p.textContent = pic.dataset.prezzo ?? '';
        if (a && pic.dataset.href) a.href = pic.dataset.href;
        nodi.push(document.createTextNode(' '), acq);
      }
      cap.replaceChildren(...nodi);
    }
    if (conta) conta.textContent = `${String(k + 1).padStart(2, '0')} / ${totale}`;
  }

  function programma() {
    window.clearTimeout(timer);
    timer = 0;
    if (ferma()) return;
    timer = window.setTimeout(async () => {
      const k = (i + 1) % pics.length;
      await carica(k);
      if (ferma() || !root!.isConnected) return;
      mostra(k);
      prossima();
      programma();
    }, passo);
  }

  // solo la prossima: è pronta molto prima dei suoi 2,5 s, e chi non resta sull'apertura non scarica le altre
  function prossima() {
    if (!caricamento || RM.matches) return;
    void carica((i + 1) % pics.length);
  }

  function aggiorna() {
    ctrl!.hidden = RM.matches;
    caricamento = !RM.matches;
    prossima();
    programma();
  }

  btn.addEventListener('click', () => {
    pausa = !pausa;
    btn.textContent = (pausa ? btn.dataset.riprendi : btn.dataset.pausa) ?? btn.textContent;
    programma();
  });
  link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { sopra = true; programma(); } });
  link.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { sopra = false; programma(); } });
  link.addEventListener('focus', () => { fuoco = true; programma(); });
  link.addEventListener('blur', () => { fuoco = false; programma(); });

  const io = new IntersectionObserver(([e]) => { visibile = !!e?.isIntersecting; programma(); }, { threshold: 0.25 });
  io.observe(link);
  document.addEventListener('visibilitychange', programma);
  RM.addEventListener('change', aggiorna);

  const dopoLoad = () => aggiorna();
  if (document.readyState === 'complete') aggiorna();
  else {
    ctrl.hidden = RM.matches; // Pausa subito; le immagini dopo load
    window.addEventListener('load', dopoLoad, { once: true });
  }

  spegni = () => {
    window.clearTimeout(timer);
    io.disconnect();
    document.removeEventListener('visibilitychange', programma);
    RM.removeEventListener('change', aggiorna);
    window.removeEventListener('load', dopoLoad);
    spegni = null;
  };
}

document.addEventListener('astro:page-load', avvia);
document.addEventListener('astro:before-swap', () => spegni?.());
avvia(); // il modulo può arrivare dopo il primo astro:page-load (home aperta col ClientRouter)
