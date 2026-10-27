/**
 * «Vedi sulla tua parete» (C16, DIREZIONE §9): apertura e chiusura del dialog intorno all'ArViewer del core.
 * Il viewer (model-viewer, QR, Quick Look diretto senza WebGL) è tutto del core e non si tocca: qui solo
 *  - apertura da `[data-parete-apri]` o con #parete nell'indirizzo (il QR del computer punta lì);
 *  - voce #parete nella storia: Indietro, Esc e Chiudi chiudono senza far rifare la pagina al ClientRouter
 *    (dialog-storia.ts, logica di stanza-client.ts di Casa), anche quando model-viewer aggiunge
 *    #model-viewer-no-ar-fallback (Scene Viewer che non parte);
 *  - prova di WebGL alla prima apertura (non al caricamento: Chromium scrive un avviso sul WebGL software): senza,
 *    `data-no-webgl` sul dialog e al posto del riquadro vuoto si vede la foto della tela. Su iPhone/iPad il core mette
 *    `data-webgl="no"` e il bottone apre lo stesso Quick Look;
 *  - fuoco intrappolato (dialog modale), scroll bloccato, fuoco che torna al link.
 * Modulo caricato una volta: si avvia su `astro:page-load` e si spegne su `astro:before-swap`.
 */
import { lockScroll, unlockScroll } from './scroll-lock';
import { storiaDialog, arrivoConHash } from './dialog-storia';

const HASH = '#parete';
const CHIAVE = 'galParete';
const HASH_FALLBACK_AR = '#model-viewer-no-ar-fallback';
const movimento = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

function haWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function avviaParete(dlg: HTMLDialogElement): () => void {
  const pulizie: (() => void)[] = [];
  let ritorno: HTMLElement | null = null;
  let webglProvato = false;
  let anim: Animation | null = null;

  /** Il dialog si scopre dal basso solo con transform, stesso aspetto, durata e curva di prima (lavoro «animazioni
   *  fluide» 22/10; prima clip-path inset(100% 0 0 0) → inset(0) su tutto lo schermo, ridisegnato a ogni fotogramma):
   *  il dialog, che ritaglia il contenuto (overflow hidden), sale da +100% e i figli scendono della stessa misura, così
   *  restano fermi e il bordo in alto sale scoprendoli. Chiudendo resta dov'è finita (fill) fino a close(). */
  const tendina = (apri: boolean, durata: number): Animation => {
    const h = dlg.clientHeight;
    const o: KeyframeAnimationOptions = { duration: durata, easing: EASE_OUT, fill: apri ? 'none' : 'forwards', id: 'tendina' };
    const k = (da: string) => (apri ? [{ transform: da }, { transform: 'none' }] : [{ transform: 'none' }, { transform: da }]);
    for (const c of dlg.children) {
      const el = c as HTMLElement;
      el.getAnimations().filter((x) => x.id === 'tendina').forEach((x) => x.cancel());
      el.animate(k(`translateY(${-h}px)`), o);
    }
    return dlg.animate(k('translateY(100%)'), o);
  };
  const pulisciTendina = () => {
    for (const c of dlg.children) (c as HTMLElement).getAnimations().filter((x) => x.id === 'tendina').forEach((x) => x.cancel());
  };

  // la prova di WebGL (creare un contesto costa decine di ms, a volte centinaia) si fa quando il puntatore o il fuoco
  // arrivano sul bottone, non al clic: il primo fotogramma della tendina non la aspetta (lavoro «animazioni fluide»
  // 22/10). Mai al caricamento della pagina (vedi sopra)
  const provaWebGL = () => {
    if (webglProvato) return;
    webglProvato = true;
    dlg.toggleAttribute('data-no-webgl', !haWebGL());
  };
  const vicino = (e: Event) => { if ((e.target as Element | null)?.closest?.('[data-parete-apri]')) provaWebGL(); };
  for (const n of ['pointerover', 'pointerdown', 'focusin'] as const) {
    document.addEventListener(n, vicino, { passive: true });
    pulizie.push(() => document.removeEventListener(n, vicino));
  }

  /** Il visore 3D del core (model-viewer, ~1 MB: valutazione del modulo, costruttore, WebGL) si carica quando il suo
   *  riquadro diventa visibile (IntersectionObserver del core): cioè a metà tendina, che si fermava per ~200 ms.
   *  Correzioni di fluidità n7: durante la tendina d'apertura il riquadro del core (`isa-ar-viewer`) sta fuori dallo
   *  schermo per il suo osservatore e i suoi figli tornano esattamente al loro posto (due `translate` opposti: a schermo
   *  non cambia niente, si vede il poster come prima); a tendina finita torna dov'è e il core carica il visore. Il
   *  visore si carica dopo la tendina, mai durante. */
  const viewer = dlg.querySelector<HTMLElement>('isa-ar-viewer');
  const dopoTendina = (a: Animation) => {
    if (!viewer || viewer.dataset.ar !== 'attesa' || viewer.dataset.modello) return;
    dlg.setAttribute('data-tendina', '');
    const via = () => { if (anim === a || !dlg.open) dlg.removeAttribute('data-tendina'); };
    a.finished.then(via, via);
  };

  const apri = (da?: HTMLElement | null) => {
    if (dlg.open) return;
    ritorno = da ?? document.querySelector<HTMLElement>('[data-parete-apri]');
    provaWebGL();
    anim?.cancel();
    dlg.showModal();
    lockScroll();
    dlg.querySelector<HTMLElement>('[data-parete-chiudi]')?.focus({ preventScroll: true });
    dlg.scrollTop = 0;
    anim = movimento()
      ? tendina(true, 450)
      : dlg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
    dopoTendina(anim);
    storia.entra();
  };

  /** chiusura con animazione; `close` fa il resto (storia, scroll, fuoco) */
  const chiudi = ({ subito = false } = {}) => {
    if (!dlg.open) return;
    anim?.cancel();
    if (subito) { dlg.close(); return; }
    anim = movimento()
      ? tendina(false, 300)
      : dlg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear' });
    anim.finished.then(() => { dlg.close(); pulisciTendina(); }, () => {});
  };

  const storia = storiaDialog({ hash: HASH, chiave: CHIAVE, aperto: () => dlg.open, chiudi: () => chiudi(), riapri: () => apri(), hashExtra: HASH_FALLBACK_AR });
  pulizie.push(() => storia.stacca());

  const onClose = () => {
    dlg.removeAttribute('data-tendina');
    unlockScroll();
    storia.esci();
    ritorno?.focus({ preventScroll: true });
  };
  dlg.addEventListener('close', onClose);
  pulizie.push(() => dlg.removeEventListener('close', onClose));

  const onCancel = (e: Event) => { e.preventDefault(); chiudi(); };
  dlg.addEventListener('cancel', onCancel);
  pulizie.push(() => dlg.removeEventListener('cancel', onCancel));

  // Tab gira dentro il dialog (audit finale 2, N4: dall'anteprima 3D il fuoco usciva sul body), come nel cassetto.
  // L'anteprima 3D prende il fuoco dentro il suo shadow DOM: il suo host non è mai :focus-visible, quindi l'anello
  // si accende qui (data-fuoco-tastiera) quando ci si arriva con Tab, e si spegne quando il fuoco esce.
  const mv = dlg.querySelector<HTMLElement>('model-viewer');
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const f = [...dlg.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), model-viewer, [tabindex]:not([tabindex="-1"])')]
      .filter((x) => x.getClientRects().length && !x.closest('[hidden]'));
    if (!f.length) return;
    const primo = f[0]!, ultimo = f[f.length - 1]!;
    const qui = f.find((x) => x === document.activeElement || x.contains(document.activeElement));
    if (e.shiftKey && (qui === primo || !qui)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && (qui === ultimo || !qui)) { e.preventDefault(); primo.focus(); }
    // se il Tab nativo è uscito comunque dal dialog (anteprima 3D non ancora pronta), si torna al primo
    window.setTimeout(() => {
      if (!dlg.open) return;
      if (!dlg.contains(document.activeElement)) primo.focus();
      if (mv && document.activeElement === mv) mv.setAttribute('data-fuoco-tastiera', '');
    }, 0);
  };
  const onFuoriMv = () => mv?.removeAttribute('data-fuoco-tastiera');
  mv?.addEventListener('focusout', onFuoriMv);
  mv?.addEventListener('pointerdown', onFuoriMv);
  pulizie.push(() => { mv?.removeEventListener('focusout', onFuoriMv); mv?.removeEventListener('pointerdown', onFuoriMv); });
  dlg.addEventListener('keydown', onKey);
  pulizie.push(() => dlg.removeEventListener('keydown', onKey));

  const onClick = (e: MouseEvent) => {
    const el = e.target as Element | null;
    const a = el?.closest?.<HTMLElement>('[data-parete-apri]');
    if (a) { e.preventDefault(); apri(a); return; }
    if (el?.closest?.('[data-parete-chiudi]')) chiudi();
  };
  document.addEventListener('click', onClick);
  pulizie.push(() => document.removeEventListener('click', onClick));

  // modello della scelta corrente: edizione con cornice o formato di stampa (misura reale di quello che si compra)
  const modelli = (() => { try { return JSON.parse(dlg.dataset.modelli ?? '{}') as Record<string, { glb: string; usdz: string; testo: string }>; } catch { return {}; } })();
  const mvAr = dlg.querySelector<HTMLElement>('model-viewer');
  const testoMisura = dlg.querySelector<HTMLElement>('[data-parete-misura]');
  const titoloAr = dlg.dataset.titolo ?? '';
  let attuale = dlg.dataset.iniziale ?? '';
  const usaModello = (chiave?: string) => {
    const m = chiave ? modelli[chiave] : undefined;
    if (!m || chiave === attuale || !mvAr) return;
    attuale = chiave!;
    mvAr.setAttribute('src', `${m.glb}&title=${encodeURIComponent(titoloAr)}`);
    mvAr.setAttribute('ios-src', m.usdz);
    dlg.querySelectorAll<HTMLAnchorElement>('a[rel="ar"]').forEach((a) => { a.href = `${m.usdz}#allowsContentScaling=0`; });
    if (testoMisura) testoMisura.textContent = m.testo;
  };
  const onModello = (e: Event) => usaModello((e as CustomEvent<{ chiave: string }>).detail?.chiave);
  document.addEventListener('galleria:modello-ar', onModello);
  pulizie.push(() => document.removeEventListener('galleria:modello-ar', onModello));
  usaModello(document.documentElement.dataset.modelloAr);

  // QR del computer: questa scheda, già su #parete (senza la query della scheda Stampa: la AR è dell'originale)
  if (viewer) viewer.dataset.urlQr = `${location.origin}${location.pathname}${HASH}`;

  // arrivo con #parete (dal QR): tolgo l'àncora dalla voce corrente e apro
  if (arrivoConHash(HASH, CHIAVE)) requestAnimationFrame(() => apri());
  // #parete scritto a mano nell'indirizzo con la pagina già aperta
  const onHash = () => { if (!dlg.open && arrivoConHash(HASH, CHIAVE)) apri(); };
  window.addEventListener('hashchange', onHash);
  pulizie.push(() => window.removeEventListener('hashchange', onHash));

  return () => {
    if (dlg.open) { dlg.removeEventListener('close', onClose); dlg.close(); unlockScroll(); }
    for (const p of pulizie) p();
  };
}

let spegni: (() => void) | null = null;
function avvia() {
  spegni?.();
  spegni = null;
  const dlg = document.querySelector<HTMLDialogElement>('dialog[data-parete]');
  if (dlg) spegni = avviaParete(dlg);
}
document.addEventListener('astro:page-load', avvia);
document.addEventListener('astro:before-swap', () => { spegni?.(); spegni = null; });
