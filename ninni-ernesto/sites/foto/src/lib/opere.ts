/**
 * Dati della pagina Opere (DIREZIONE §6 P2, C7 C8 C10; solo server / frontmatter).
 * Per ogni card: gruppi dei filtri (colore, formato, fascia di prezzo, forma), ordine e altezza relativa per il masonry.
 * Il calcolo nel browser (filtri, conteggi, colonne) è in `opere-motore.js`, con la stessa regola del masonry.
 */
import { getArtworks, getPrints, type Artwork, type AuthorId } from '@ne/core/catalog';
import { formatDimensions, formatPrice, type Locale } from '@ne/core';
import { coloriOpera, GRUPPI_COLORE } from './colori';

export { GRUPPI_COLORE };
export const FORMATI = ['piccoli', 'medi', 'grandi', 'panoramici'] as const;
export const FASCE = ['fino-3500', '3500-5000', 'oltre-5000'] as const;
export const FORME = ['verticali', 'orizzontali', 'quadrate'] as const;
export type Formato = (typeof FORMATI)[number];
export type Fascia = (typeof FASCE)[number];
export type Forma = (typeof FORME)[number];

/** Soglie di §6 P2 (lato maggiore in cm, prezzi in centesimi). Le panoramiche (rapporto > 1,6) stanno solo in «Panoramici». */
export const PICCOLI_MAX_CM = 70;
export const GRANDI_MIN_CM = 100;
export const FASCIA_1_MAX = 80_000;
export const FASCIA_2_MAX = 110_000;

export function formatoOpera(art: Artwork): Formato | null {
  if (!art.dimensions) return null;
  if (art.aspectRatio > 1.6) return 'panoramici';
  const lato = Math.max(art.dimensions.widthCm, art.dimensions.heightCm);
  return lato <= PICCOLI_MAX_CM ? 'piccoli' : lato >= GRANDI_MIN_CM ? 'grandi' : 'medi';
}

/** Fascia di prezzo dell'originale in vendita (le vendute non hanno prezzo e non entrano in nessuna fascia). */
export function fasciaOpera(art: Artwork): Fascia | null {
  if (art.status !== 'available' || art.priceCents === null) return null;
  return art.priceCents <= FASCIA_1_MAX ? 'fino-3500' : art.priceCents <= FASCIA_2_MAX ? '3500-5000' : 'oltre-5000';
}

export function formaOpera(art: Artwork): Forma {
  if (Math.abs(art.aspectRatio - 1) <= 0.06) return 'quadrate';
  return art.aspectRatio > 1 ? 'orizzontali' : 'verticali';
}

/**
 * Masonry (C8): ogni card va nella colonna più corta. Altezza = immagine (1 / rapporto dell'immagine) + didascalia e
 * vuoto sotto (ALTEZZA_DIDA, in larghezze di colonna: costante, uguale per tutte, quindi conta solo l'immagine).
 * A parità vince la colonna più a sinistra. Stessa regola in `opere-motore.js`.
 */
export const ALTEZZA_DIDA = 0.35;
export const altezzaCard = (art: Artwork): number => Number((1 / art.aspectRatio).toFixed(4));
export function colonne<T>(lista: T[], n: number, h: (x: T) => number): T[][] {
  const cols = Array.from({ length: n }, () => ({ v: [] as T[], h: 0 }));
  for (const x of lista) {
    let c = cols[0]!;
    for (const k of cols) if (k.h < c.h - 1e-9) c = k;
    c.v.push(x);
    c.h += h(x) + ALTEZZA_DIDA;
  }
  return cols.map((c) => c.v);
}

export interface CardDati {
  art: Artwork;
  tipo: 'originale' | 'stampa';
  ordine: number;
  colori: string[];
  formato: Formato | null;
  fascia: Fascia | null;
  forma: Forma;
  venduta: boolean;
  /** Seconda riga della didascalia (misure · prezzo, oppure «stampa da …»); `venduta` → «Esaurita» in rosso. */
  misure: string | null;
  prezzo: string | null;
  /** Edizione: «Restano 3 di 7» (scarsità vera, solo sulle edizioni limitate). */
  restano?: { n: number; di: number } | null;
}

/** Edizioni limitate del fotografo, le esaurite in fondo (l'ordine resta quello di opere.json). */
export function cardOriginali(lang: Locale, autore: AuthorId = 'ninni'): CardDati[] {
  return getArtworks()
    .filter((art) => art.author === autore && art.edition)
    .map((art, i) => ({
      art, tipo: 'originale' as const, ordine: i,
      colori: coloriOpera(art), formato: formatoOpera(art), fascia: fasciaOpera(art), forma: formaOpera(art),
      venduta: art.status === 'sold',
      misure: art.dimensions ? formatDimensions(art.dimensions, lang) : null,
      prezzo: art.status === 'available' && art.priceCents !== null ? formatPrice(art.priceCents, lang) : null,
      restano: art.edition ? { n: art.edition.remaining, di: art.edition.size } : null,
    }))
    .sort((a, b) => Number(a.venduta) - Number(b.venduta) || a.ordine - b.ordine);
}

/** Stampe: le opere che hanno stampe (anche di originali venduti), con il prezzo più basso fra gli 8 formati. */
export function cardStampe(lang: Locale, autore: AuthorId = 'ninni'): (CardDati & { daCents: number })[] {
  return getPrints({ formats: 'all' }).filter(({ artwork }) => artwork.author === autore).map(({ artwork: art, options }, i) => ({
    art, tipo: 'stampa' as const, ordine: i,
    colori: coloriOpera(art), formato: null, fascia: null, forma: formaOpera(art), venduta: false,
    misure: null, prezzo: formatPrice(options.fromCents, lang), daCents: options.fromCents,
  }));
}
