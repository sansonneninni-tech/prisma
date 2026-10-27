/**
 * Carrello nel browser (pezzo 5): pezzi in comune fra cassetto (C11), pagina carrello e checkout.
 * Stato e conti sono del core (`@ne/core/cart`: $cart, $cartTotals…; `@ne/core`: prezzi, IVA, zone, rate).
 * Qui c'è solo il markup di Galleria: righe C12, conto, opere vendute nel frattempo. Logica presa da Casa
 * (`sites/casa/src/lib/carrello-client.ts`), markup e stile propri.
 */
import { $cart, pruneUnavailable, removeFromCart, setQuantity, maxQuantityFor } from '@ne/core/cart';
import {
  MAX_PRINT_QUANTITY, addBusinessDays, formatDateRange, formatDimensions, formatPrice, preparationDays, sep,
  type CartLine, type CartTotals, type Locale, type Translator,
} from '@ne/core';

/** Dati delle opere preparati sul server (lib/acquisto.ts → catalogoCarrello). */
export interface OperaCarrello { stato: 'a' | 's'; w: number | null; h: number | null; ar: number; img: string | null; jpg: string | null }
export type Catalogo = Record<string, OperaCarrello>;

export const movimento = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
export const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

export function leggiCatalogo(el: HTMLElement | null): Catalogo {
  try { return JSON.parse(el?.dataset.catalogo ?? '{}') as Catalogo; } catch { return {}; }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Segno − o + come C6 (tratto 1,6, mai un carattere del font). */
function segno(piu: boolean): SVGSVGElement {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 20 20');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  s.setAttribute('class', 'rc__segno');
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', piu ? 'M10 4v12M4 10h12' : 'M4 10h12');
  s.append(p);
  return s;
}

/** «Carrello (2)», in cinese «购物车（2）». */
export function titoloCarrello(t: Translator, lang: Locale, n: number): string {
  const s = sep(lang);
  return `${t('galleria.nav.carrello')}${s.ap}${n}${s.ch}`;
}

/** «Originale · 100 × 140 cm» / «Stampa su tela · 70 × 50 cm». */
export function metaRiga(line: CartLine, t: Translator, lang: Locale, cat: Catalogo): string {
  if (line.kind === 'print' && line.print) {
    const tipo = line.print.material === 'canvas' ? t('galleria.acquisto.stampa_tela') : t('galleria.acquisto.stampa_carta');
    return `${tipo} · ${formatDimensions({ widthCm: line.print.widthCm, heightCm: line.print.heightCm }, lang)}`;
  }
  const o = cat[line.artworkId];
  const misure = o?.w && o?.h ? ` · ${formatDimensions({ widthCm: o.w, heightCm: o.h }, lang)}` : '';
  return `${t('galleria.acquisto.originale')}${misure}`;
}

/** Proporzione vera: quella dell'opera (stampa = formato scelto). */
export function proporzione(line: CartLine, cat: Catalogo): number {
  if (line.kind === 'print' && line.print) return line.print.widthCm / line.print.heightCm;
  return cat[line.artworkId]?.ar ?? (line.image ? line.image.width / line.image.height : 0.8);
}

/** Miniatura dell'opera intera (mai ritagliata) in un box con le sue proporzioni. */
export function miniatura(line: CartLine, cat: Catalogo, cls: string): HTMLElement {
  const ar = proporzione(line, cat);
  const box = el(line.url ? 'a' : 'span', cls) as HTMLAnchorElement;
  if (line.url) { box.href = line.url; box.tabIndex = -1; box.setAttribute('aria-hidden', 'true'); }
  box.style.setProperty('--ar', String(ar));
  const src = cat[line.artworkId]?.img ?? line.image?.src;
  if (src) {
    const img = el('img');
    img.src = src; img.alt = ''; img.decoding = 'async';
    img.width = 200; img.height = Math.round(200 / ar);
    box.append(img);
  }
  return box;
}

export interface OpzioniRiga { lang: Locale; t: Translator; cat: Catalogo; /** prefisso per ritrovare il fuoco dopo un ridisegno */ id: string; cents?: 'always' | 'auto' }

/** Prezzi delle righe in colonna coerente: se una riga ha i centesimi, li mostrano tutte (mai «1.403 €» sopra «561,20 €»). */
export function centesimiRighe(lines: readonly CartLine[]): 'always' | 'auto' {
  return lines.some((l) => (l.unitPriceCents * l.quantity) % 100 !== 0) ? 'always' : 'auto';
}

/** C12: miniatura 72 px, titolo 560, tipo · misure, quantità (solo stampe), prezzo, «Rimuovi». */
export function creaRiga(line: CartLine, o: OpzioniRiga): HTMLLIElement {
  const { t, lang, cat } = o;
  const li = el('li', `rc rc--${line.kind}`);
  li.dataset.key = line.key;
  li.append(miniatura(line, cat, 'rc__img'));

  const testo = el('div', 'rc__testo');
  const titolo = line.url ? el('a', 'rc__titolo', line.title) : el('p', 'rc__titolo', line.title);
  if (titolo instanceof HTMLAnchorElement) titolo.href = line.url!;
  // le misure non si spezzano (in cinese «厘米» andava a capo da solo)
  const meta = el('p', 'rc__meta');
  const parti = metaRiga(line, t, lang, cat).split(' · ');
  parti.forEach((x, k) => { if (k) meta.append(' · '); meta.append(k === parti.length - 1 && k ? el('span', 'rc__misure', x) : x); });
  testo.append(titolo, meta);

  if (line.kind === 'print') {
    const max = Math.min(maxQuantityFor(line.kind), MAX_PRINT_QUANTITY);
    const q = el('div', 'rc__q');
    q.setAttribute('role', 'group');
    q.setAttribute('aria-label', t('galleria.acquisto.quantita_di', { titolo: line.title }));
    const meno = el('button', 'rc__qb');
    meno.type = 'button';
    meno.append(segno(false));
    meno.setAttribute('aria-label', t('core.cart.diminuisci', { titolo: line.title }));
    meno.dataset.fuoco = `${o.id}:${line.key}:meno`;
    meno.disabled = line.quantity <= 1; // a 1 si toglie con «Rimuovi»: niente righe perse per sbaglio
    meno.addEventListener('click', () => setQuantity(line.key, line.quantity - 1));
    const n = el('output', 'rc__qn num', String(line.quantity));
    const piu = el('button', 'rc__qb');
    piu.type = 'button';
    piu.append(segno(true));
    piu.setAttribute('aria-label', t('core.cart.aumenta', { titolo: line.title }));
    piu.dataset.fuoco = `${o.id}:${line.key}:piu`;
    piu.disabled = line.quantity >= max;
    piu.addEventListener('click', () => setQuantity(line.key, line.quantity + 1));
    q.append(meno, n, piu);
    testo.append(q);
  }
  li.append(testo);

  const destra = el('div', 'rc__destra');
  destra.append(el('p', 'rc__prezzo num', formatPrice(line.unitPriceCents * line.quantity, lang, { cents: o.cents ?? 'auto' })));
  const togli = el('button', 'rc__togli', t('bottoni.rimuovi'));
  togli.type = 'button';
  togli.setAttribute('aria-label', t('core.cart.rimuovi', { titolo: line.title }));
  togli.dataset.fuoco = `${o.id}:${line.key}:togli`;
  togli.addEventListener('click', () => {
    // il fuoco va al «Rimuovi» della riga dopo (o prima); se il carrello si svuota decide chi disegna
    const vicino = (li.nextElementSibling ?? li.previousElementSibling) as HTMLElement | null;
    const chiave = vicino?.dataset.key;
    const zona = li.closest<HTMLElement>('[data-carrello-zona]');
    removeFromCart(line.key);
    requestAnimationFrame(() => {
      const prossimo = chiave && zona ? zona.querySelector<HTMLElement>(`[data-key="${CSS.escape(chiave)}"] .rc__togli`) : null;
      if (prossimo) prossimo.focus();
      else zona?.dispatchEvent(new CustomEvent('galleria:carrello-svuotato', { bubbles: true }));
    });
  });
  destra.append(togli);
  li.append(destra);
  return li;
}

/** Ridisegna una lista di righe conservando il fuoco sul controllo equivalente. */
export function disegnaRighe(lista: HTMLElement, lines: readonly CartLine[], o: OpzioniRiga): void {
  const fuoco = (document.activeElement as HTMLElement | null)?.dataset?.fuoco;
  // righe e conto con lo stesso formato (audit finale 1, #9): «5.000,00 €» anche nella riga se il conto ha centesimi
  const oc = { ...o, cents: o.cents === 'always' ? 'always' as const : centesimiRighe(lines) };
  lista.replaceChildren(...lines.map((l) => creaRiga(l, oc)));
  if (!fuoco) return;
  const dopo = lista.querySelector<HTMLButtonElement>(`[data-fuoco="${CSS.escape(fuoco)}"]`);
  if (dopo && !dopo.disabled) dopo.focus();
  else dopo?.closest('.rc__q')?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
}

/**
 * «Consegna stimata»: preparazione in atelier (il pezzo più lento) + giorni della zona, in giorni lavorativi da oggi.
 * formatDateRange del core con lo stesso mese usa formatRange, che in italiano dà «04–11 novembre»: tolgo lo zero.
 */
export function dateConsegna(lines: readonly CartLine[], s: NonNullable<CartTotals['shipping']>, lang: Locale): string {
  const oggi = new Date();
  const prep = preparationDays(lines);
  return formatDateRange(addBusinessDays(oggi, prep + s.deliveryDays.min), addBusinessDays(oggi, prep + s.deliveryDays.max), lang)
    .replace(/(^|[^\d])0(\d)/g, '$1$2');
}

/* ---------------------------------------------------------------- conto */
export interface RigaConto { tipo: 'sub' | 'sped' | 'tot' | 'iva' | 'iva-det'; label: string; valore: string }

/**
 * Righe del conto: Subtotale, Spedizione · zona, Totale, di cui IVA (una riga se l'aliquota è una sola, altrimenti
 * il totale IVA e il dettaglio 5% / 22%). Senza paese: «al checkout» e «Totale senza spedizione».
 */
/** Il conto ha centesimi (IVA, spedizione, assicurazione)? Allora tutti gli importi vicini li mostrano. */
export function centesimiConto(totals: CartTotals): 'always' | 'auto' {
  const importi = [totals.subtotalCents, totals.totalCents, totals.vatTotalCents, ...totals.vat.map((v) => v.vatCents),
    totals.shipping?.totalCents ?? 0, totals.shipping?.insuranceCents ?? 0];
  return importi.some((c) => c % 100 !== 0) ? 'always' : 'auto';
}

export function righeConto(totals: CartTotals, t: Translator, lang: Locale): RigaConto[] {
  // una colonna coerente: se un importo ha i centesimi, tutti li mostrano (mai «5.671 €» sopra «359,10 €»)
  const cents = centesimiConto(totals);
  const p = (c: number) => formatPrice(c, lang, { cents });
  const r: RigaConto[] = [{ tipo: 'sub', label: t('carrello.subtotale'), valore: p(totals.subtotalCents) }];
  const s = totals.shipping;
  if (s) r.push({ tipo: 'sped', label: `${t('carrello.spedizione')} · ${t(`core.zone.${s.zone}`)}`, valore: s.totalCents === 0 ? t('galleria.acquisto.inclusa') : p(s.totalCents) });
  else r.push({ tipo: 'sped', label: t('carrello.spedizione'), valore: t('galleria.acquisto.al_checkout') });
  if (s && s.insuranceCents > 0) r.push({ tipo: 'iva-det', label: t('core.cart.assicurazione'), valore: p(s.insuranceCents) });
  r.push({ tipo: 'tot', label: s ? t('carrello.totale') : t('galleria.acquisto.totale_senza'), valore: p(totals.totalCents) });
  if (totals.vatExempt) { r.push({ tipo: 'iva', label: t('core.cart.iva_esente'), valore: '' }); return r; }
  if (totals.vat.length === 1) {
    const v = totals.vat[0]!;
    r.push({ tipo: 'iva', label: t('galleria.acquisto.iva_una', { aliquota: Math.round(v.rate * 100) }), valore: p(v.vatCents) });
    return r;
  }
  if (totals.vat.length) r.push({ tipo: 'iva', label: t('carrello.iva_inclusa'), valore: p(totals.vatTotalCents) });
  for (const v of totals.vat) {
    r.push({ tipo: 'iva-det', label: v.kind === 'original' ? t('carrello.iva_dettaglio_originali') : t('carrello.iva_dettaglio_stampe'), valore: p(v.vatCents) });
  }
  return r;
}

/** Disegna un <dl class="conto"> con le righe. */
export function disegnaConto(dl: HTMLElement, righe: RigaConto[]): void {
  dl.replaceChildren(...righe.map((r) => {
    const div = el('div', `conto__riga conto__riga--${r.tipo}`);
    div.append(el('dt', undefined, r.label), el('dd', 'num', r.valore));
    return div;
  }));
}

/* ---------------------------------------------------------------- venduta nel frattempo */
const CHIAVE_VENDUTE = 'galleria:vendute:v1';
export interface Venduta { key: string; titolo: string }

export function avvisiVendute(): Venduta[] {
  try { return JSON.parse(sessionStorage.getItem(CHIAVE_VENDUTE) ?? '[]') as Venduta[]; } catch { return []; }
}
function salvaAvvisi(v: Venduta[]): void {
  try { if (v.length) sessionStorage.setItem(CHIAVE_VENDUTE, JSON.stringify(v)); else sessionStorage.removeItem(CHIAVE_VENDUTE); } catch { /* solo in memoria */ }
  document.dispatchEvent(new CustomEvent('galleria:vendute-cambiate'));
}

/** Toglie dal carrello gli originali venduti nel frattempo (pruneUnavailable del core) e ricorda l'avviso nella sessione. */
export function controllaVendute(cat: Catalogo): void {
  if (!Object.keys(cat).length || !$cart.get().some((l) => l.kind === 'original')) return;
  const disponibili = Object.entries(cat).filter(([, o]) => o.stato === 'a').map(([id]) => id);
  const tolte = pruneUnavailable(disponibili);
  if (!tolte.length) return;
  const prima = avvisiVendute();
  salvaAvvisi([...prima, ...tolte.filter((l) => !prima.some((p) => p.key === l.key)).map((l) => ({ key: l.key, titolo: l.title }))]);
}

/** Avvisi «venduta nel frattempo»: una riga con ■, link alle commissioni e «Chiudi». */
export function disegnaAvvisi(box: HTMLElement, t: Translator, hrefSimile: string): void {
  const v = avvisiVendute();
  box.hidden = v.length === 0;
  box.replaceChildren(...v.map((a) => {
    const d = el('div', 'avviso');
    d.setAttribute('role', 'status');
    d.append(el('p', 'avviso__t', t('galleria.acquisto.venduta', { titolo: a.titolo })));
    const az = el('p', 'avviso__az');
    const link = el('a', 'lnk', t('galleria.scheda.simile'));
    link.href = hrefSimile;
    const ok = el('button', 'lnk', t('bottoni.chiudi'));
    ok.type = 'button';
    ok.addEventListener('click', () => salvaAvvisi(avvisiVendute().filter((x) => x.key !== a.key)));
    az.append(link, ok);
    d.append(az);
    return d;
  }));
}

export { $cart };
