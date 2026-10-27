/**
 * C11 Cassetto nel browser (pezzo 5). Un modulo solo, caricato una volta: gli ascoltatori sul documento sono delegati
 * e il dialog si ritrova a ogni `astro:page-load`, così tutto sopravvive al ClientRouter (i componenti del core con
 * script che si agganciano una volta sola, dopo un cambio pagina restavano senza ascoltatori).
 *   - i link `[data-carrello]` aprono il cassetto invece di andare alla pagina (non su carrello e checkout);
 *   - A9: pannello da destra (`translateX(100%)` → 0, 0,45 s) e velo 0 → 0,32; riduci movimento: dissolvenza 0,2 s;
 *   - focus intrappolato, Esc, clic sul velo, ritorno del fuoco al link che l'ha aperto; scroll bloccato.
 * Righe e conti: lib/carrello-client.ts sopra lo store del core.
 */
import { $cart, $cartTotals, $cartCountry, setCartCountry } from '@ne/core/cart';
import type { Locale } from '@ne/core';
import { readTranslator } from '@ne/core/ui';
import { formatDateRange, formatDimensions, formatPrice } from '@ne/core/i18n';
import { lockScroll, unlockScroll } from './scroll-lock';
import { storiaDialog, arrivoConHash, seguiLink, type Storia } from './dialog-storia';
import {
  leggiCatalogo, centesimiConto, disegnaRighe, righeConto, disegnaConto, titoloCarrello, controllaVendute, disegnaAvvisi,
  movimento, EASE_OUT, type Catalogo,
} from './carrello-client';

let dlg: HTMLDialogElement | null = null;
let cat: Catalogo = {};
let origine: HTMLElement | null = null;
let anim: Animation[] = [];
let spegni: (() => void)[] = [];
// Indietro del telefono chiude il cassetto (audit finale 1, telefono #1): una voce di storia `#carrello`
let storia: Storia | null = null;

/** Sulla pagina carrello e nel checkout il cassetto non c'è: «Carrello (n)» porta alla pagina. */
const paginaAcquisto = () => /^\/(it|en|zh)\/(carrello|checkout)\/?$/.test(location.pathname);
const ferma = () => { anim.forEach((a) => a.cancel()); anim = []; };

function disegna() {
  const d = dlg;
  if (!d) return;
  const t = readTranslator(d);
  const lang = (d.dataset.lang ?? 'it') as Locale;
  const lines = $cart.get();
  const n = lines.reduce((s, l) => s + l.quantity, 0);
  d.querySelector<HTMLElement>('[data-cas-titolo]')!.textContent = titoloCarrello(t, lang, n);
  const righe = d.querySelector<HTMLElement>('[data-cas-righe]')!;
  disegnaRighe(righe, lines, { lang, t, cat, id: 'cas', cents: centesimiConto($cartTotals.get()) });
  righe.hidden = lines.length === 0;
  d.querySelector<HTMLElement>('[data-cas-vuoto]')!.hidden = lines.length > 0;
  d.querySelector<HTMLElement>('[data-cas-piede]')!.hidden = lines.length === 0;
  // nel cassetto solo spedizione e totale (styleguide §07); IVA e dettagli nella pagina carrello
  const conto = righeConto($cartTotals.get(), t, lang).filter((r) => r.tipo === 'sped' || r.tipo === 'tot');
  disegnaConto(d.querySelector<HTMLElement>('[data-cas-conto]')!, conto);
  disegnaAvvisi(d.querySelector<HTMLElement>('[data-cas-avvisi]')!, t, d.dataset.simile ?? '/');
}

function apri(da: HTMLElement | null) {
  const d = dlg;
  if (!d || d.open) return;
  ferma();
  origine = da;
  controllaVendute(cat);
  disegna();
  d.showModal();
  lockScroll();
  storia?.entra();
  d.querySelector<HTMLElement>('.cas__corpo')!.scrollTop = 0;
  d.querySelector<HTMLElement>('[data-cas-titolo]')!.focus({ preventScroll: true });
  const pan = d.querySelector<HTMLElement>('[data-cas-pan]')!;
  const velo = d.querySelector<HTMLElement>('.cas__velo')!;
  anim = movimento()
    ? [
        pan.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: 450, easing: EASE_OUT }),
        velo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: EASE_OUT }),
      ]
    : [d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' })];
}

function chiudi({ subito = false, fuoco = true } = {}) {
  const d = dlg;
  if (!d?.open) return;
  ferma();
  const fine = () => {
    if (d.open) d.close();
    unlockScroll();
    storia?.esci();
    if (fuoco) {
      const o = origine?.isConnected && origine.getClientRects().length ? origine : document.querySelector<HTMLElement>('.hd [data-carrello]');
      o?.focus({ preventScroll: true });
    }
    origine = null;
  };
  if (subito) { fine(); return; }
  const pan = d.querySelector<HTMLElement>('[data-cas-pan]')!;
  const velo = d.querySelector<HTMLElement>('.cas__velo')!;
  anim = movimento()
    ? [
        pan.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], { duration: 300, easing: EASE_OUT, fill: 'forwards' }),
        velo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: EASE_OUT, fill: 'forwards' }),
      ]
    : [d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear', fill: 'forwards' })];
  Promise.all(anim.map((a) => a.finished)).then(() => { fine(); ferma(); }, () => {});
}

/** Il primo formato di un prezzo (o di una misura, di una data) nella lingua della pagina carica i dati ICU: al primo
 *  clic sul carrello costava ~100 ms a CPU ×4 nello stesso compito dell'apertura, e il cassetto partiva in ritardo.
 *  Si fa una volta nei momenti liberi dopo il caricamento: i formattatori dei prezzi (0 e 2 decimali) restano nella cache
 *  del core e si riusano, per misure e date restano caricati i dati della lingua (correzioni di fluidità n7). */
const scaldati = new Set<string>();
function scaldaFormati(lang: Locale) {
  if (scaldati.has(lang)) return;
  scaldati.add(lang);
  const fai = () => {
    try {
      formatPrice(100, lang); formatPrice(150, lang);
      formatDimensions({ widthCm: 50, heightCm: 70 }, lang);
      formatDateRange(Date.now(), Date.now() + 2 * 864e5, lang);
    } catch { /* solo un anticipo: il cassetto formatta comunque all'apertura */ }
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fai, { timeout: 3000 }); else setTimeout(fai, 500);
}

function init() {
  spegni.forEach((f) => f());
  spegni = [];
  dlg = document.querySelector<HTMLDialogElement>('[data-cassetto]');
  const d = dlg;
  for (const a of document.querySelectorAll<HTMLElement>('[data-carrello]')) {
    if (d && !paginaAcquisto()) a.setAttribute('aria-haspopup', 'dialog');
    else a.removeAttribute('aria-haspopup');
  }
  if (!d) return;
  storia = storiaDialog({ hash: '#carrello', chiave: 'galCassetto', aperto: () => d.open, chiudi: () => chiudi(), riapri: () => apri(null) });
  spegni.push(() => { storia?.stacca(); storia = null; });
  arrivoConHash('#carrello', 'galCassetto');
  cat = leggiCatalogo(d);
  scaldaFormati((d.dataset.lang ?? 'it') as Locale);
  // sul sito italiano il paese di consegna parte dall'Italia (si cambia nel carrello e nel checkout)
  if (!$cartCountry.get() && d.dataset.lang === 'it') setCartCountry('IT');
  controllaVendute(cat); // un originale venduto mentre era nel carrello esce subito (anche dal contatore)

  spegni.push($cart.listen(() => { if (d.open) disegna(); }));
  spegni.push($cartTotals.listen(() => { if (d.open) disegna(); }));
  const avvisi = () => { if (d.open) disegna(); };
  document.addEventListener('galleria:vendute-cambiate', avvisi);
  spegni.push(() => document.removeEventListener('galleria:vendute-cambiate', avvisi));

  const onClick = (e: MouseEvent) => {
    if ((e.target as Element).closest('[data-cas-chiudi]')) chiudi();
  };
  const onCancel = (e: Event) => { e.preventDefault(); chiudi(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const f = [...d.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter((x) => x.getClientRects().length);
    if (!f.length) return;
    const primo = f[0]!, ultimo = f[f.length - 1]!;
    if (e.shiftKey && (document.activeElement === primo || !f.includes(document.activeElement as HTMLElement))) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primo.focus(); }
  };
  // l'ultima riga tolta: il fuoco va al titolo (sotto compaiono le due porte)
  const onSvuotato = () => d.querySelector<HTMLElement>('[data-cas-titolo]')?.focus();
  d.addEventListener('click', onClick);
  d.addEventListener('cancel', onCancel);
  d.addEventListener('keydown', onKey);
  d.addEventListener('galleria:carrello-svuotato', onSvuotato);
  spegni.push(() => {
    d.removeEventListener('click', onClick);
    d.removeEventListener('cancel', onCancel);
    d.removeEventListener('keydown', onKey);
    d.removeEventListener('galleria:carrello-svuotato', onSvuotato);
  });
}

// link al carrello → cassetto. In cattura: deve arrivare prima del ClientRouter, che altrimenti va a /carrello/.
document.addEventListener('click', (e) => {
  const a = (e.target as Element | null)?.closest?.<HTMLElement>('[data-carrello]');
  if (!a || !dlg || paginaAcquisto() || dlg.contains(a)) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault(); // il ClientRouter non segue i clic già fermati
  apri(a);
}, { capture: true });

// un link dentro il cassetto (Procedi, un'opera, Vai al carrello): la voce `#carrello` diventa la pagina d'arrivo
document.addEventListener('click', (e) => {
  if (!dlg?.open || !dlg.contains(e.target as Node)) return;
  seguiLink(e, storia, () => chiudi({ subito: true, fuoco: false }));
}, { capture: true });
// il cassetto si chiude subito, senza animazione
document.addEventListener('astro:before-swap', () => { storia?.rilascia(); chiudi({ subito: true, fuoco: false }); spegni.forEach((f) => f()); spegni = []; dlg = null; });
document.addEventListener('astro:page-load', init);
