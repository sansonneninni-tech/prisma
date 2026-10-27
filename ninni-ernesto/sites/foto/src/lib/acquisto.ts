/**
 * Carrello, cassetto e checkout (pezzo 5) — aiuti lato server (frontmatter).
 * Prezzi, IVA, zone, rate, carrello e checkout sono di @ne/core: qui si preparano solo i dati che servono agli
 * script del browser (che non caricano il catalogo) e i testi. Logica presa da Casa (`sites/casa/src/lib/acquisto.ts`).
 */
import { getArtworks, getArtworkImage } from '@ne/core/catalog';
import { countryName, pickStrings, type Locale, type Translator } from '@ne/core/i18n';
import { useT } from './i18n';
import { SHIPPABLE_COUNTRIES } from '@ne/core';

/**
 * Testi comuni sostituiti nel browser da quelli di Galleria: quelli con una nota fra quadre (`[da confermare]`)
 * e l'errore dei campi vuoti, più corto. Vale anche per l'email d'ordine, che il core scrive con le chiavi comuni.
 */
const SOSTITUZIONI: Record<string, string> = {
  'carrello.nota_extra_ue': 'galleria.acquisto.dazi',
  'email_conferma.corpo_originale': 'galleria.acquisto.email_originale',
  // sotto ogni campo vuoto: due parole invece di una frase ripetuta sette volte
  'errori.obbligatorio': 'galleria.acquisto.obbligatorio',
};

/**
 * Traduttore delle pagine d'acquisto. Fino al pezzo 5 in cinese convertiva 您 → 你; dal pezzo 6 tutto il sito dà del 您
 * (scelta del core 0.3.0 per tutti i siti), quindi è lo stesso traduttore del resto del sito.
 */
export function useTAcquisto(lang: Locale): Translator {
  return useT(lang);
}

/** Testi per gli script del browser (`data-i18n`, letti con `readTranslator` del core). Mai una quadra visibile. */
export function testiBrowser(t: Translator, chiavi: readonly string[]): Record<string, string> {
  const out = pickStrings(t, [...new Set(chiavi)]);
  for (const [k, v] of Object.entries(SOSTITUZIONI)) if (k in out) out[k] = t(v);
  for (const [k, v] of Object.entries(out)) {
    if (v.includes('[')) throw new Error(`[galleria] testo con una quadra nel browser: ${k} = ${v}`);
  }
  return out;
}

/** Chiavi comuni a cassetto, pagina carrello e checkout (righe e conto). */
export const CHIAVI_RIGHE = [
  'galleria.nav.carrello', 'galleria.acquisto.originale', 'galleria.acquisto.stampa_carta', 'galleria.acquisto.stampa_tela',
  'galleria.acquisto.quantita_di', 'galleria.acquisto.inclusa', 'galleria.acquisto.al_checkout', 'galleria.acquisto.totale_senza',
  'galleria.acquisto.iva_una', 'galleria.acquisto.venduta', 'galleria.scheda.simile',
  'bottoni.rimuovi', 'bottoni.chiudi', 'core.cart.rimuovi', 'core.cart.diminuisci', 'core.cart.aumenta',
  'carrello.subtotale', 'carrello.totale', 'carrello.spedizione', 'carrello.iva_inclusa',
  'carrello.iva_dettaglio_originali', 'carrello.iva_dettaglio_stampe', 'core.cart.iva_esente', 'core.cart.assicurazione',
  'core.zone.italy', 'core.zone.eu', 'core.zone.uk-ch', 'core.zone.asia', 'core.zone.world',
] as const;

/**
 * Le opere come le serve al carrello nel browser: stato (per «venduta nel frattempo»), misure, proporzione e una
 * miniatura della tela intera (la miniatura del core è un ritaglio 4:5), più il JPEG per l'email (molti programmi di
 * posta non leggono WebP). ~5 KB per 26 opere: sta inline, nessuna richiesta in più.
 */
export interface OperaCarrello { stato: 'a' | 's'; w: number | null; h: number | null; ar: number; img: string | null; jpg: string | null }
let cacheCatalogo: Record<string, OperaCarrello> | null = null;
export function catalogoCarrello(): Record<string, OperaCarrello> {
  if (cacheCatalogo) return cacheCatalogo;
  const out: Record<string, OperaCarrello> = {};
  for (const a of getArtworks()) {
    let img: string | null = null;
    try {
      const im = getArtworkImage(a.id, 'canvas', { width: 200 });
      const webp = im.sources.find((s) => s.type === 'image/webp')?.srcset.split(',')
        .map((c) => c.trim().split(/\s+/)).map(([u, w]) => ({ u: u!, w: parseInt(w ?? '0', 10) }))
        .filter((c) => c.u && c.w).sort((x, y) => x.w - y.w)[0]?.u;
      img = webp ?? im.src;
    } catch { img = null; }
    let jpg: string | null = null;
    try { const src = getArtworkImage(a.id, 'thumbnail', { fallbackWidth: 'original' }).src; jpg = /\.jpe?g$/i.test(src) ? src : null; } catch { jpg = null; }
    out[a.id] = {
      stato: a.status === 'sold' ? 's' : 'a',
      w: a.dimensions?.widthCm ?? null,
      h: a.dimensions?.heightCm ?? null,
      ar: Math.round(a.aspectRatio * 1000) / 1000,
      img,
      jpg,
    };
  }
  cacheCatalogo = out;
  return out;
}

/** Paesi serviti (dal core): Italia in testa, gli altri in ordine alfabetico nella lingua. */
export function paesi(lang: Locale): { value: string; label: string }[] {
  const coll = new Intl.Collator(lang === 'zh' ? 'zh-Hans' : lang);
  return [...SHIPPABLE_COUNTRIES]
    .map((code) => ({ value: code, label: countryName(code, lang) }))
    .sort((a, b) => (a.value === 'IT' ? -1 : b.value === 'IT' ? 1 : coll.compare(a.label, b.label)));
}
