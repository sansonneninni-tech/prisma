/**
 * Pagina Opere nel browser (pezzo 3): schede (C14), pannello dei filtri (C10, A9), filtri attivi, URL, A5 titolo (senza GSAP dal 22/10), hover delle card in CSS (A6 tolta il 22/10).
 * Il calcolo (chi resta, conteggi, colonne) è in `opere-motore.js` (window.GalleriaOpere), già eseguito inline prima
 * del primo disegno. Qui si collegano i controlli. Modulo caricato una volta: si avvia su `astro:page-load` e si spegne
 * su `astro:before-swap` (ClientRouter).
 */
import { lockScroll, unlockScroll } from './scroll-lock';
import { dopoTransizione, pronto } from './movimento';
import { storiaDialog, arrivoConHash } from './dialog-storia';

type Gruppo = 'colore' | 'formato' | 'prezzo' | 'forma';
type Stato = { vista: 'originali' | 'stampe'; colore: Set<string>; formato: Set<string>; prezzo: Set<string>; forma: Set<string>; stato: string };
interface Motore {
  GRUPPI: Record<string, Gruppo[]>;
  vuoto(vista?: string): Stato;
  leggiUrl(search: string): Stato;
  query(s: Stato): string;
  attivi(s: Stato): number;
  applica(root: HTMLElement, s: Stato): number;
  normalizza(s: Stato): Stato;
}
declare global { interface Window { GalleriaOpere?: Motore } }

const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const movimento = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

let spegni: (() => void) | null = null;

function avvia() {
  spegni?.();
  spegni = null;
  const root = document.querySelector<HTMLElement>('[data-opere]');
  const M = window.GalleriaOpere;
  if (!root || !M) return;
  const ac = new AbortController();
  const on = <K extends keyof DocumentEventMap>(el: EventTarget, tipo: K | string, f: (e: any) => void) => el.addEventListener(tipo, f, { signal: ac.signal });
  const pulizie: (() => void)[] = [];

  let s = M.leggiUrl(location.search);
  const dialogo = root.querySelector<HTMLDialogElement>('[data-filtri]')!;
  const pan = root.querySelector<HTMLElement>('[data-filtri-pan]')!;
  const velo = root.querySelector<HTMLElement>('.flt__velo')!;
  const apriBtn = root.querySelector<HTMLButtonElement>('[data-filtri-apri]')!;
  const annuncio = root.querySelector<HTMLElement>('[data-annuncio]');
  let annuncioT = 0;

  /** Applica, scrive l'URL (tenendo lo stato del ClientRouter) e avvisa header e lingue. */
  function aggiorna({ annuncia = true } = {}) {
    M!.applica(root!, s);
    const url = location.pathname + M!.query(s) + location.hash;
    if (url !== location.pathname + location.search + location.hash) {
      history.replaceState(history.state, '', url);
      document.dispatchEvent(new CustomEvent('galleria:url-cambiato'));
    }
    document.dispatchEvent(new CustomEvent('galleria:opere-cambiate'));
    if (annuncia && annuncio) {
      clearTimeout(annuncioT);
      const n = root!.querySelector('.attivi__n')?.textContent ?? '';
      annuncioT = window.setTimeout(() => { annuncio.textContent = n; }, 350);
    }
  }

  /* ---------- C14 schede: clic e frecce (attivazione automatica) ---------- */
  const schede = [...root.querySelectorAll<HTMLButtonElement>('[data-scheda]')];
  const scegliScheda = (b: HTMLButtonElement, fuoco = false) => {
    const v = b.dataset.valore as Stato['vista'];
    if (v !== s.vista) {
      s.vista = v;
      M.normalizza(s);
      aggiorna({ annuncia: false });
    }
    if (fuoco) b.focus();
  };
  for (const b of schede) {
    on(b, 'click', () => scegliScheda(b));
    on(b, 'keydown', (e: KeyboardEvent) => {
      const i = schede.indexOf(b);
      let j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % schede.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + schede.length) % schede.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = schede.length - 1;
      if (j < 0) return;
      e.preventDefault();
      scegliScheda(schede[j]!, true);
    });
  }

  /* ---------- voci dei filtri, filtri attivi, azzera ---------- */
  on(root, 'click', (e: MouseEvent) => {
    const el = e.target as Element;
    const op = el.closest<HTMLButtonElement>('[data-opzione]');
    if (op && !op.disabled) {
      const g = op.dataset.gruppo!, v = op.dataset.valore!;
      if (g === 'stato') s.stato = s.stato === v ? 'tutte' : v;
      else { const set = s[g as Gruppo]; if (set.has(v)) set.delete(v); else set.add(v); }
      aggiorna();
      return;
    }
    const chip = el.closest<HTMLButtonElement>('[data-chip]');
    if (chip) {
      const g = chip.dataset.gruppo!, v = chip.dataset.valore!;
      const lista = [...root.querySelectorAll<HTMLButtonElement>('[data-chip]')];
      const i = lista.indexOf(chip);
      if (g === 'stato') s.stato = 'tutte'; else s[g as Gruppo].delete(v);
      aggiorna();
      // il fuoco va al filtro accanto, oppure a «Filtra» se non ne resta nessuno
      const dopo = [...root.querySelectorAll<HTMLButtonElement>('[data-chip]')];
      (dopo[Math.min(i, dopo.length - 1)] ?? apriBtn).focus();
      return;
    }
    const azzera = el.closest<HTMLButtonElement>('[data-azzera]');
    if (azzera && !azzera.disabled) {
      const fuori = !dialogo.contains(azzera);
      s = M.vuoto(s.vista);
      aggiorna();
      if (fuori) apriBtn.focus();
    }
  });

  /* ---------- C10 pannello: dialog modale, A9, focus intrappolato, Esc ---------- */
  let anim: Animation[] = [];
  const ferma = () => { anim.forEach((a) => a.cancel()); anim = []; };
  function apri() {
    if (dialogo.open) return;
    ferma();
    dialogo.showModal();
    lockScroll();
    storia.entra();
    apriBtn.setAttribute('aria-expanded', 'true');
    root!.querySelector<HTMLElement>('.flt__corpo')!.scrollTop = 0;
    dialogo.querySelector<HTMLButtonElement>('.flt__chiudi')?.focus({ preventScroll: true });
    if (movimento()) {
      anim = [
        pan.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: 450, easing: EASE_OUT }),
        velo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: EASE_OUT }),
      ];
    } else {
      anim = [dialogo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' })];
    }
  }
  function chiudi({ subito = false, fuoco = true } = {}) {
    if (!dialogo.open) return;
    ferma();
    apriBtn.setAttribute('aria-expanded', 'false');
    const fine = () => {
      dialogo.close();
      unlockScroll();
      storia.esci();
      if (fuoco) apriBtn.focus({ preventScroll: true });
    };
    if (subito) { fine(); return; }
    anim = movimento()
      ? [
          pan.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], { duration: 300, easing: EASE_OUT, fill: 'forwards' }),
          velo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: EASE_OUT, fill: 'forwards' }),
        ]
      : [dialogo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear', fill: 'forwards' })];
    Promise.all(anim.map((a) => a.finished)).then(() => { fine(); ferma(); }, () => {});
  }
  // Indietro del telefono chiude i filtri (audit finale 1, telefono #1): una voce di storia `#filtri`. I filtri scelti
  // col pannello aperto finiscono nella query di quella voce: tolta la voce, si riscrivono nella voce della pagina.
  const storia = storiaDialog({ hash: '#filtri', chiave: 'galFiltri', aperto: () => dialogo.open, chiudi: () => chiudi(), riapri: () => apri(), dopo: () => aggiorna({ annuncia: false }) });
  pulizie.push(() => storia.stacca());
  arrivoConHash('#filtri', 'galFiltri');
  on(apriBtn, 'click', apri);
  for (const b of root.querySelectorAll('[data-filtri-chiudi]')) on(b, 'click', () => chiudi());
  on(root.querySelector('[data-filtri-mostra]')!, 'click', () => {
    chiudi();
    // dopo un filtro la griglia può essere più corta: se eri già sotto l'inizio delle opere, si riparte dall'alto
    const griglia = root.querySelector<HTMLElement>('.op-bar')!;
    if (griglia.getBoundingClientRect().bottom < 0) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  });
  on(dialogo, 'cancel', (e: Event) => { e.preventDefault(); chiudi(); });
  on(dialogo, 'keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const f = [...dialogo.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')].filter((el) => el.getClientRects().length);
    if (!f.length) return;
    const primo = f[0]!, ultimo = f[f.length - 1]!;
    if (e.shiftKey && (document.activeElement === primo || document.activeElement === dialogo)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primo.focus(); }
  });
  pulizie.push(() => { storia.rilascia(); if (dialogo.open) chiudi({ subito: true, fuoco: false }); });

  /* ---------- colonne: 2 → 3 a 1280 px ---------- */
  const mq = window.matchMedia('(min-width: 1280px)');
  on(mq, 'change', () => { M.applica(root, s); document.dispatchEvent(new CustomEvent('galleria:opere-cambiate')); });

  /* ---------- A5 (solo senza riduci movimento) ---------- */
  // il ripristino dello scroll (lib/movimento.ts) aspetta che A5 sia pronto; parte dopo il cambio pagina
  if (movimento()) pronto(dopoTransizione().then(() => { if (!ac.signal.aborted) titolo(root, pulizie); }));

  spegni = () => {
    ac.abort();
    clearTimeout(annuncioT);
    pulizie.splice(0).forEach((f) => f());
  };
}

/** A5: scorrendo i primi 300 px il titolo scala da --t-title a --t-title-min (origine in alto a sinistra) e resta in
 *  alto (sticky); sotto, una striscia bianca a tutta larghezza (`.tg__fondo`) si accorcia con lui. Solo `transform`
 *  (lavoro «animazioni fluide» 22/10: prima clip-path sulla striscia, ridisegnata a ogni fotogramma):
 *  - dove il browser ha le animazioni legate allo scorrimento (`animation-timeline: scroll()`: Chrome 115, Safari 26)
 *    le fa il CSS (opere.css, .tg--a5-css), sul compositore: il filo principale non fa niente mentre si scorre;
 *  - altrimenti un ascoltatore di scroll passivo scrive le due trasformazioni, al massimo una volta per fotogramma, e
 *    niente dopo i 300 px. Si misura solo all'avvio e al ridimensionamento. */
const SCROLL_CSS = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()');
function titolo(root: HTMLElement, pulizie: (() => void)[]) {
  const html = document.documentElement;
  const tg = root.querySelector<HTMLElement>('[data-tg]');
  const h = tg?.querySelector<HTMLElement>('[data-tg-h]');
  if (!tg || !h) return;
  const FINE_A5 = 300;
  const sonda = document.createElement('span');
  sonda.style.cssText = 'position:absolute;visibility:hidden;font-size:var(--t-title-min)';
  const fondo = document.createElement('span');
  fondo.className = 'tg__fondo';
  fondo.setAttribute('aria-hidden', 'true');
  tg.append(sonda, fondo);
  tg.classList.add('tg--a5');
  let k = 1, f = 1, ultimo = -1, raf = 0;
  const misura = () => {
    const fs = parseFloat(getComputedStyle(h).fontSize);
    k = Math.min(1, parseFloat(getComputedStyle(sonda).fontSize) / fs);
    const pad = parseFloat(getComputedStyle(tg).paddingTop) || 0;
    const banda = pad + (h.offsetHeight + 0.06 * fs) * k + 8; // offsetHeight comprende già l'aria del discendente
    const alto = tg.offsetHeight;
    f = alto > 0 ? Math.min(1, banda / alto) : 1;
    tg.style.setProperty('--a5-k', String(k));
    tg.style.setProperty('--a5-f', String(f));
    // il fuoco da tastiera non deve finire sotto la striscia del titolo (WCAG 2.4.11)
    html.style.scrollPaddingTop = `calc(var(--header-h) + env(safe-area-inset-top) + ${Math.ceil(banda) + 16}px)`;
    ultimo = -1;
  };
  const disegna = () => {
    raf = 0;
    const p = Math.min(1, Math.max(0, window.scrollY / FINE_A5));
    if (p === ultimo) return;
    ultimo = p;
    h.style.transform = `scale(${1 - (1 - k) * p})`;
    fondo.style.transform = `scaleY(${1 - (1 - f) * p})`;
  };
  const chiedi = () => { if (!raf) raf = requestAnimationFrame(disegna); };
  const ridimensiona = () => { misura(); if (!SCROLL_CSS) chiedi(); };
  misura();
  if (SCROLL_CSS) tg.classList.add('tg--a5-css');
  else { disegna(); window.addEventListener('scroll', chiedi, { passive: true }); }
  window.addEventListener('resize', ridimensiona, { passive: true });
  pulizie.push(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('scroll', chiedi);
    window.removeEventListener('resize', ridimensiona);
    html.style.removeProperty('scroll-padding-top');
    tg.classList.remove('tg--a5', 'tg--a5-css');
    tg.style.removeProperty('--a5-k');
    tg.style.removeProperty('--a5-f');
    h.style.removeProperty('transform');
    sonda.remove();
    fondo.remove();
  });
}

document.addEventListener('astro:page-load', avvia);
document.addEventListener('astro:before-swap', () => { spegni?.(); spegni = null; });
avvia();
