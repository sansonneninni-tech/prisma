/**
 * Scheda opera (pezzo 4) — parte che gira nel browser. Modulo caricato una volta: si avvia su `astro:page-load` e si
 * spegne su `astro:before-swap` (ClientRouter).
 *  - C14 schede Stampa / Edizione limitata: frecce, Home, End; `?v=stampa` nell'URL con replaceState(history.state) e
 *    l'evento `galleria:url-cambiato` (le lingue lo seguono). Lo stato iniziale lo mette lo script inline della scheda.
 *  - Carrello: addToCart del core (originale: «Nel carrello» al posto del bottone; stampa: formato + supporto,
 *    prezzo, al massimo MAX_PRINT_QUANTITY uguali, «Nel carrello: n»).
 *  - Barra fissa in basso (sotto 1024): prezzo + azione quando il bottone vero non si vede; imposta
 *    `--ingombro-basso` su <html> (regola di Casa).
 *  - Anteprima della stampa e lente sulla foto: lib/anteprima-client.ts (audit 28/10, al posto della vecchia Lente).
 *  - A3: «Precedente / Successiva» con la pagina che esce di lato (view transition del ClientRouter, CSS in scheda.css).
 */
import { $cart, addToCart, lineKey } from '@ne/core/cart';
import type { CartProduct } from '@ne/core';
import { avviaAnteprima, type Scelta } from './anteprima-client';

const leggiJson = <T>(el: HTMLElement, k: string): T => { try { return JSON.parse(el.dataset[k] ?? '{}') as T; } catch { return {} as T; } };

/* ======================================================================= acquisto */
function avviaAcquisto(sk: HTMLElement): () => void {
  const pulizie: (() => void)[] = [];
  const acq = sk.querySelector<HTMLElement>('[data-acq]');
  if (!acq) return () => {};
  const iniziale = sk.dataset.iniziale === 's' ? 's' : 'o';
  const tabs = [...acq.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const pannelli = [...acq.querySelectorAll<HTMLElement>('[data-pan]')];
  const tempi = [...acq.querySelectorAll<HTMLElement>('[data-tempi]')];
  const barra = sk.querySelector<HTMLElement>('[data-barra]');
  const barraPrezzo = barra?.querySelector<HTMLElement>('[data-barra-prezzo]');
  const barraBtn = barra?.querySelector<HTMLButtonElement>('[data-barra-btn]');
  const testoAggiungi = barraBtn?.textContent ?? '';

  const corrente = (): 'o' | 's' => (pannelli.find((p) => !p.hidden)?.dataset.pan === 's' ? 's' : 'o');

  /* ---------- schede ---------- */
  const scegli = (v: 'o' | 's', { fuoco = false, url = true } = {}) => {
    for (const b of tabs) {
      const s = b.dataset.v === v;
      b.setAttribute('aria-selected', String(s));
      b.tabIndex = s ? 0 : -1;
      if (s && fuoco) b.focus();
    }
    for (const p of pannelli) p.hidden = p.dataset.pan !== v;
    for (const p of tempi) p.hidden = p.dataset.tempi !== v;
    sk.dataset.vista = v; // i dati dicono di chi sono le misure (audit finale 1, telefono #14)
    annunciaModello();
    if (url) {
      const u = new URL(location.href);
      if (v === iniziale) u.searchParams.delete('v');
      else u.searchParams.set('v', v === 's' ? 'stampa' : 'originale');
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
      document.dispatchEvent(new CustomEvent('galleria:url-cambiato'));
    }
    aggiornaBarra();
  };
  for (const b of tabs) {
    const onClick = () => scegli(b.dataset.v === 's' ? 's' : 'o');
    b.addEventListener('click', onClick);
    pulizie.push(() => b.removeEventListener('click', onClick));
  }
  const lista = acq.querySelector<HTMLElement>('[data-acq-tabs]');
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t === document.activeElement);
    if (i < 0) return;
    const n = tabs.length;
    const j = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    scegli(tabs[j]!.dataset.v === 's' ? 's' : 'o', { fuoco: true });
  };
  lista?.addEventListener('keydown', onKey);
  pulizie.push(() => lista?.removeEventListener('keydown', onKey));

  /* ---------- originale ---------- */
  const fo = acq.querySelector<HTMLFormElement>('[data-acq-form="o"]');
  const originale = fo ? leggiJson<{ original?: CartProduct }>(fo, 'products').original : undefined;
  const nelCarrello = (p: CartProduct) => $cart.get().find((l) => l.key === lineKey(p))?.quantity ?? 0;
  const disegnaO = () => {
    if (!fo || !originale) return;
    const dentro = nelCarrello(originale) > 0;
    fo.querySelector<HTMLElement>('[data-acq-btn]')!.hidden = dentro;
    fo.querySelector<HTMLElement>('[data-acq-in]')!.hidden = !dentro;
  };
  if (fo && originale) {
    const onSubmit = (e: SubmitEvent) => {
      e.preventDefault();
      if (nelCarrello(originale) > 0) return;
      addToCart(originale);
      // il fuoco resta su un comando visibile: il bottone sparisce, al suo posto c'è «Nel carrello»
      if (fo.contains(document.activeElement) || document.activeElement === barraBtn) {
        const dentro = fo.querySelector<HTMLElement>('[data-acq-in]');
        requestAnimationFrame(() => { if (document.activeElement === document.body || !document.activeElement?.checkVisibility?.()) dentro?.focus(); });
      }
    };
    fo.addEventListener('submit', onSubmit);
    pulizie.push(() => fo.removeEventListener('submit', onSubmit));
  }

  /* ---------- stampa ---------- */
  const fs = acq.querySelector<HTMLFormElement>('[data-acq-form="s"]');
  const prodotti = fs ? leggiJson<Record<string, CartProduct>>(fs, 'products') : {};
  const prezzi = fs ? leggiJson<Record<string, string>>(fs, 'prices') : {};
  const cents = fs ? leggiJson<Record<string, number>>(fs, 'cents') : {};
  const max = Number(fs?.dataset.max ?? 5);
  const scelto = (n: string) => fs?.querySelector<HTMLInputElement>(`input[name="${n}"]:checked`)?.value ?? '';
  const chiaveScelta = () => `${scelto('formato')}:${scelto('supporto')}:${scelto('cornice') || 'none'}`;
  // differenza di prezzo accanto a carta e cornice («+ 45 €»), rispetto alla scelta più semplice
  const lingua = document.documentElement.dataset.lang === 'en' ? 'en-US' : 'it-IT';
  const fmt = new Intl.NumberFormat(lingua, { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const piu = (c: number) => (fs?.dataset.tPiu ?? '+ {prezzo}').replace('{prezzo}', fmt.format(c / 100));
  const sincronizza = () => {
    if (!fs) return;
    const f = scelto('formato');
    const supporti = [...fs.querySelectorAll<HTMLInputElement>('input[name="supporto"]')];
    for (const s of supporti) s.disabled = !prodotti[`${f}:${s.value}:none`];
    if (supporti.find((s) => s.checked)?.disabled) {
      const primo = supporti.find((s) => !s.disabled);
      if (primo) primo.checked = true;
    }
    const s = scelto('supporto'), c = scelto('cornice') || 'none';
    const base = cents[`${f}:rag:${c}`];
    for (const el of fs.querySelectorAll<HTMLElement>('[data-delta-carta]')) {
      const v = cents[`${f}:${el.dataset.deltaCarta}:${c}`];
      el.textContent = v === undefined ? '' : v === base ? '' : piu(v - base!);
    }
    const senza = cents[`${f}:${s}:none`];
    for (const el of fs.querySelectorAll<HTMLElement>('[data-delta-cornice]')) {
      const v = cents[`${f}:${s}:${el.dataset.deltaCornice}`];
      el.textContent = v === undefined || v === senza ? '' : piu(v - senza!);
    }
    const out = fs.querySelector<HTMLElement>('[data-acq-prezzo]');
    if (out) out.textContent = prezzi[chiaveScelta()] ?? '';
    annunciaModello();
  };
  const disegnaS = () => {
    if (!fs) return;
    const p = prodotti[chiaveScelta()];
    const n = p ? nelCarrello(p) : 0;
    const btn = fs.querySelector<HTMLButtonElement>('[data-acq-btn]')!;
    const nota = fs.querySelector<HTMLElement>('[data-acq-nota]')!;
    const testo = nota.querySelector<HTMLElement>('[data-acq-nota-t]')!;
    btn.disabled = !p || n >= max;
    nota.hidden = n === 0;
    testo.textContent = n >= max ? (fs.dataset.tMax ?? '') : (fs.dataset.tN ?? '').replace('{n}', String(n));
  };
  if (fs) {
    const onChange = () => { sincronizza(); disegnaS(); aggiornaBarra(); };
    const onSubmit = (e: SubmitEvent) => {
      e.preventDefault();
      const p = prodotti[chiaveScelta()];
      if (p) addToCart(p);
    };
    fs.addEventListener('change', onChange);
    fs.addEventListener('submit', onSubmit);
    pulizie.push(() => { fs.removeEventListener('change', onChange); fs.removeEventListener('submit', onSubmit); });
    sincronizza();
  }

  /* ---------- modello AR della scelta (edizione o formato di stampa) ---------- */
  function annunciaModello() {
    const chiave = corrente() === 'o' ? 'ed' : scelto('formato');
    document.documentElement.dataset.modelloAr = chiave;
    document.dispatchEvent(new CustomEvent('galleria:modello-ar', { detail: { chiave } }));
    // anteprima della stampa e figura in scala (lib/anteprima-client.ts)
    document.dispatchEvent(new CustomEvent<Scelta>('galleria:anteprima', {
      detail: { vista: corrente(), formato: scelto('formato'), carta: scelto('supporto') || 'rag', cornice: scelto('cornice') || 'none' },
    }));
  }

  /* ---------- barra fissa in basso ---------- */
  const visibili = new Set<Element>();
  let io: IntersectionObserver | null = null;
  const mqBarra = window.matchMedia('(max-width: 1023.98px)');
  const box = sk.querySelector<HTMLElement>('.sk__box');
  function aggiornaBarra() {
    if (!barra || !barraBtn || !barraPrezzo) return;
    const v = corrente();
    const form = v === 's' ? fs : fo;
    const vendutaO = v === 'o' && !originale;
    const attiva = mqBarra.matches && !!form && !vendutaO;
    barra.hidden = !attiva;
    if (!attiva) { document.documentElement.style.setProperty('--ingombro-basso', '0px'); barra.removeAttribute('data-su'); return; }
    barraPrezzo.textContent = form!.querySelector('[data-acq-prezzo]')?.textContent ?? '';
    if (v === 'o' && originale && nelCarrello(originale) > 0) {
      barraBtn.textContent = fo!.querySelector('[data-acq-in]')?.textContent ?? '';
      barraBtn.classList.add('btn--linea');
      barraBtn.disabled = false;
    } else {
      barraBtn.textContent = testoAggiungi;
      barraBtn.classList.remove('btn--linea');
      barraBtn.disabled = v === 's' ? !!fs?.querySelector<HTMLButtonElement>('[data-acq-btn]')?.disabled : false;
    }
    // si vede quando nessun comando principale della scheda attiva è sullo schermo
    const comandi = [...form!.querySelectorAll<HTMLElement>('[data-acq-btn], [data-acq-in]')].filter((el) => !el.hidden);
    // …e mai sopra l'opera: finché il fondo dell'opera è nella fascia della barra la barra resta giù (320×568)
    const fondo = box?.getBoundingClientRect();
    const sopraOpera = !!fondo && fondo.bottom > window.innerHeight - barra.offsetHeight && fondo.top < window.innerHeight;
    // …e mai mentre il prezzo della scheda è (anche solo in parte) sullo schermo: lo taglierebbe e lo ripeterebbe
    // (audit finale 1, telefono #2: 393×852, «5.000 €» mezzo coperto dalla barra)
    const pr = form!.querySelector<HTMLElement>('[data-acq-prezzo]')?.getBoundingClientRect();
    const hd = document.querySelector<HTMLElement>('[data-hd]')?.getBoundingClientRect().bottom ?? 0;
    const prezzoInVista = !!pr && pr.height > 0 && pr.bottom > hd && pr.top < window.innerHeight;
    // …e mai prima di arrivare al blocco d'acquisto: sale solo dopo che è passato sopra (audit finale 2, telefono #2:
    // la venduta che apre su Stampa ha il blocco sotto la piega e la barra copriva la riga sopra)
    const sotto = comandi.some((el) => el.getBoundingClientRect().top > window.innerHeight - 72);
    const su = !comandi.some((el) => visibili.has(el)) && !sopraOpera && !prezzoInVista && !sotto;
    barra.toggleAttribute('data-su', su);
    barra.inert = !su;
    document.documentElement.style.setProperty('--ingombro-basso', su ? `${barra.offsetHeight}px` : '0px');
  }
  if (barra && barraBtn) {
    io = new IntersectionObserver((voci) => {
      for (const v of voci) { if (v.isIntersecting) visibili.add(v.target); else visibili.delete(v.target); }
      aggiornaBarra();
    }, { rootMargin: '0px 0px -72px 0px' });
    for (const el of acq.querySelectorAll('[data-acq-btn], [data-acq-in]')) io.observe(el);
    const onBarra = () => {
      const v = corrente();
      if (v === 'o' && originale && nelCarrello(originale) > 0) { fo?.querySelector<HTMLAnchorElement>('[data-acq-in]')?.click(); return; }
      (v === 's' ? fs : fo)?.requestSubmit();
    };
    barraBtn.addEventListener('click', onBarra);
    let rafBarra = 0;
    const onScroll = () => { if (!rafBarra) rafBarra = requestAnimationFrame(() => { rafBarra = 0; aggiornaBarra(); }); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    pulizie.push(() => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(rafBarra); });
    const onMq = () => aggiornaBarra();
    mqBarra.addEventListener('change', onMq);
    pulizie.push(() => { barraBtn.removeEventListener('click', onBarra); mqBarra.removeEventListener('change', onMq); io?.disconnect(); });
  }

  const disegna = () => { disegnaO(); disegnaS(); aggiornaBarra(); };
  const stacca = $cart.subscribe(disegna);
  pulizie.push(stacca);
  pulizie.push(() => document.documentElement.style.setProperty('--ingombro-basso', '0px'));
  return () => { for (const p of pulizie) p(); };
}

/* ======================================================================= A3 */
// Il ClientRouter fa la view transition; qui si dice da che parte va la pagina (scheda.css fa il resto).
// La direzione sta su <html> della pagina vecchia (istantanea «old») e di quella nuova (lo swap del ClientRouter
// rimpiazza gli attributi di <html>), e si toglie a transizione finita.
let direzioneA3: string | null = null;
let scrollA3 = 0;
document.addEventListener('astro:before-preparation', (e) => {
  const da = (e as Event & { sourceElement?: Element }).sourceElement?.closest?.<HTMLElement>('[data-a3]');
  direzioneA3 = da?.dataset.a3 ?? null;
  scrollA3 = window.scrollY;
  if (direzioneA3) document.documentElement.dataset.a3 = direzioneA3;
  else delete document.documentElement.dataset.a3;
});
document.addEventListener('astro:before-swap', (e) => {
  const ev = e as Event & { newDocument?: Document; viewTransition?: { finished: Promise<void> } };
  if (!direzioneA3 || !ev.newDocument) return;
  ev.newDocument.documentElement.dataset.a3 = direzioneA3;
  ev.newDocument.documentElement.style.setProperty('--a3-y', `${-Math.round(scrollA3)}px`);
  const togli = () => { delete document.documentElement.dataset.a3; document.documentElement.style.removeProperty('--a3-y'); };
  if (ev.viewTransition) ev.viewTransition.finished.then(togli, togli);
  else setTimeout(togli, 0);
  direzioneA3 = null;
});

/* ======================================================================= avvio */
let spegni: (() => void) | null = null;
function avvia() {
  spegni?.();
  spegni = null;
  const sk = document.querySelector<HTMLElement>('[data-scheda]');
  if (!sk) return;
  const l = avviaAnteprima(sk); // prima dell'acquisto: ascolta già la prima scelta
  const a = avviaAcquisto(sk);
  spegni = () => { a(); l(); };
}
document.addEventListener('astro:page-load', avvia);
document.addEventListener('astro:before-swap', () => { spegni?.(); spegni = null; });
