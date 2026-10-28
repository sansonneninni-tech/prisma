/**
 * Dati della scheda opera (DIREZIONE §6 P3, C15 C16 C20; solo server / frontmatter).
 * Una funzione per pagina: `datiScheda(art, lang)` restituisce tutto quello che i componenti mostrano, già tradotto.
 * Regola: un dato che manca non diventa una riga vuota né un segnaposto, la riga non c'è.
 *  - Tecnica e cornice: solo la versione pulita e tradotta in `galleria.opere_dati.<id>` (presa da Casa); il dato grezzo
 *    di opere.json ha note di lavoro («dai metadati della scheda…») e non si mostra.
 *  - Descrizione: `galleria.descrizioni.<id>` (1–2 frasi, presa da Casa, nelle 3 lingue); le descrizioni lunghe di
 *    opere.json hanno «[…]» e parole da brochure.
 *  - Anno: solo se c'è (oggi nessuna opera). Firma: se c'è la foto della firma.
 * Misure in scala (figura e AR) da `misureAr()` del core (09 = 90 × 90 con la cornice).
 */
import { getArtworks, getArtworkImage, artworkAlt, toCartProduct, toPrintCartProducts, type Artwork } from '@ne/core/catalog';
import { formatDimensions, formatPrice, sep, SHIPPING_RATES, MAX_PRINT_QUANTITY, PREPARATION_BUSINESS_DAYS, type CartProduct, type Locale } from '@ne/core';
import { FRAMES, PRINT_MATERIALS, framePrice } from '@ne/core/config';
import { hrefOpera } from './opera-link';
import { misureAr, modelliAr, type MisureAr } from '@ne/core/ar';
import { href, useT, type Translator } from './i18n';
import { SEP } from './misure';
import firme from '../data/firme.json';

/** Riquadro della firma: la finestra 1/zoom centrata sulla firma, tenuta dentro la tela (la foto firma ha una banda
 *  bianca a destra e in basso: tela fino a x 0,93 e y 0,70). Restituisce lo stile dell'<img> ingrandita. */
function finestraFirma(id: string): { zoom: number; stile: string } | null {
  const f = (firme as unknown as Record<string, [number, number, number] | null | string>)[id];
  if (!Array.isArray(f)) return null;
  const [fx, fy, z] = f;
  const w = 1 / z;
  const dentro = (c: number, max: number) => Math.min(Math.max(c - w / 2, 0), Math.max(0, max - w));
  const x = dentro(fx, 0.93), y = dentro(fy, 0.70);
  const pc = (n: number) => `${(n * 100).toFixed(2)}%`;
  return { zoom: z, stile: `--fz:${pc(z)};--fx:${pc(-x * z)};--fy:${pc(-y * z)}` };
}

export interface RigaDato { chiave: string; etichetta: string; valore: string }
export interface Particolare { id: 'detail1' | 'detail2' | 'signature'; nome: string; zoom?: number; stile?: string }
export interface VarianteStampa { chiave: string; formato: string; supporto: string; cornice: string; prezzo: string; cents: number; product: CartProduct }
export interface ScalinoEdizione { da: number; a: number; prezzo: string; stato: 'venduto' | 'attuale' | 'futuro' }

export interface DatiScheda {
  art: Artwork;
  /** Titolo nella lingua della pagina. */
  titolo: string;
  autore: string;
  edizione: null | {
    numero: number | null;
    totale: number;
    restano: number;
    proveArtista: number;
    scalini: ScalinoEdizione[];
    /** Copie rimaste a questo prezzo e prezzo successivo (per «Ultima copia a questo prezzo»). */
    aQuestoPrezzo: number;
    prossimo: string | null;
    misura: string;
    misuraCornice: string;
    carta: string;
    cornice: string;
  };
  /** Per l'anteprima della stampa (cornice, carta, figura in scala): misure in cm e nomi brevi. */
  anteprima: {
    formati: Record<string, { w: number; h: number; et: string }>;
    carte: Record<string, string>;
    cornici: Record<string, string>;
    ed: null | { w: number; h: number; fw: number; fh: number; carta: string; cornice: string; et: string };
  };
  carte: { id: string; nome: string; nota: string }[];
  cornici: { id: string; nome: string; nota: string }[];
  venduta: boolean;
  /** Ci sono stampe (le panoramiche 24 e 25 no). */
  stampabile: boolean;
  misure: string | null;
  righe: RigaDato[];
  descrizione: string | null;
  /** Prezzo dell'originale, già formattato; null se venduta. */
  prezzo: string | null;
  notaPrezzo: string;
  notaPrezzoStampa: string;
  tempiOriginale: string;
  tempiStampa: string;
  originale: CartProduct | null;
  formati: { id: string; etichetta: string }[];
  stampe: VarianteStampa[];
  /** Prima variante (formato più piccolo, carta): quella scelta all'apertura. */
  primaStampa: VarianteStampa | null;
  maxStampe: number;
  particolari: Particolare[];
  ar: { glb: string; usdz: string; misure: MisureAr | null; testoMisure: string | null; poster: string;
    /** Un modello per vista: `ed` (edizione con cornice) e ogni formato di stampa. */
    modelli: Record<string, { glb: string; usdz: string; testo: string }>; iniziale: string };
  precedente: Artwork;
  successiva: Artwork;
  /** Opera molto più larga che alta (24, 25): l'opera prende tutta la larghezza della scheda. */
  panoramica: boolean;
  /** Dati strutturati (VisualArtwork + Product, Offer solo se disponibile). */
  jsonLd: string;
  metaDescrizione: string;
}

/** Ordine delle schede = ordine di Opere (le vendute in fondo); precedente/successiva girano in tondo. */
export function opereInOrdine(): Artwork[] {
  return getArtworks()
    .map((art, i) => ({ art, i }))
    .sort((a, b) => Number(a.art.status === 'sold') - Number(b.art.status === 'sold') || a.i - b.i)
    .map((x) => x.art);
}

/** Traduttore per InstallmentsNote del core: «(DEMO)» in maiuscolo non va (DIREZIONE §2.2), qui «(demo)». */
export function tRate(t: Translator): Translator {
  const f = ((k: string, p?: Record<string, string | number>) => (k === 'demo.etichetta' ? t('galleria.scheda.demo') : t(k, p))) as Translator;
  return Object.assign(f, { raw: t.raw, has: t.has, lang: t.lang });
}

const RAPPORTO_PANORAMICA = 1.6;

export function datiScheda(art: Artwork, lang: Locale, site?: URL): DatiScheda {
  const t = useT(lang);
  const venduta = art.status === 'sold';
  const misure = art.dimensions ? formatDimensions(art.dimensions, lang) : null;
  const path = `/${art.author}/${art.slug}/`;
  const titolo = lang === 'en' && art.titleEn ? art.titleEn : art.title;

  // --- dati (solo quelli che esistono) ---
  const righe: RigaDato[] = [];
  righe.push({ chiave: 'autore', etichetta: t('galleria.scheda.fotografo'), valore: art.author === 'ernesto' ? 'Ernesto' : 'Ninni' });
  if (art.place) righe.push({ chiave: 'luogo', etichetta: t('galleria.scheda.luogo'), valore: art.place });
  if (art.year) righe.push({ chiave: 'anno', etichetta: t('etichette.anno'), valore: String(art.year) });
  if (art.edition) righe.push({ chiave: 'edizione', etichetta: t('galleria.edizione.etichetta'), valore: t(art.edition.artistProofs === 1 ? 'galleria.edizione.valore_1' : 'galleria.edizione.valore', { n: art.edition.size, pa: art.edition.artistProofs }) });
  righe.push({ chiave: 'stampa', etichetta: t('galleria.scheda.stampa_t'), valore: t('galleria.scheda.stampa_v') });
  const kd = `galleria.descrizioni.${art.id}`;
  const descrizione = t.has(kd) ? t(kd) : null;

  // --- acquisto ---
  const originale = toCartProduct(art, lang, { path });
  const varianti = toPrintCartProducts(art, lang, { path, formats: 'all' });
  const stampe: VarianteStampa[] = varianti.map((v) => ({
    chiave: `${v.format.id}:${v.material}:${v.frame}`,
    formato: v.format.id,
    supporto: v.material,
    cornice: v.frame,
    cents: v.product.unitPriceCents,
    prezzo: formatPrice(v.product.unitPriceCents, lang),
    product: v.product,
  }));
  const formati = [...new Map(varianti.map((v) => [v.format.id, v.format])).values()]
    .sort((a, b) => a.widthCm * a.heightCm - b.widthCm * b.heightCm)
    .map((f) => ({ id: f.id, etichetta: formatDimensions(f, lang) }));
  // all'apertura: il formato di mezzo (effetto «medio» del menu: il più scelto quando ci sono tre taglie), Photo Rag, senza cornice
  const fApertura = formati[Math.min(1, formati.length - 1)];
  const primaStampa = fApertura ? stampe.find((s) => s.formato === fApertura.id && s.supporto === 'rag' && s.cornice === 'none') ?? stampe.find((s) => s.formato === fApertura.id) ?? null : null;

  const it = SHIPPING_RATES.italy;
  const notaPrezzo = [t('galleria.edizione.incluso'), it.original.perItemCents === 0 ? t('galleria.scheda.spedizione_inclusa') : null].filter(Boolean).join(SEP);
  const notaPrezzoStampa = it.print.freeAboveCents
    ? t('galleria.scheda.spedizione_gratis_da', { prezzo: formatPrice(it.print.freeAboveCents, lang) })
    : t('galleria.scheda.spedizione_stampe', { prezzo: formatPrice(it.print.firstItemCents, lang) });

  // --- edizione limitata (scarsità vera: numero, copie rimaste, prezzo che sale a scaglioni) ---
  const e = art.edition;
  const edizione = e ? {
    numero: e.nextNumber,
    totale: e.size,
    restano: e.remaining,
    proveArtista: e.artistProofs,
    scalini: e.steps.map((s, i) => {
      const da = i === 0 ? 1 : e.steps[i - 1]!.upTo + 1;
      const stato: ScalinoEdizione['stato'] = e.nextNumber === null || s.upTo < e.nextNumber ? 'venduto' : da <= e.nextNumber ? 'attuale' : 'futuro';
      return { da, a: s.upTo, prezzo: formatPrice(s.priceCents, lang), stato };
    }),
    aQuestoPrezzo: e.leftAtThisPrice,
    prossimo: e.nextStepPriceCents ? formatPrice(e.nextStepPriceCents, lang) : null,
    misura: formatDimensions(e.dimensions, lang),
    misuraCornice: formatDimensions(e.framedDimensions, lang),
    carta: t(`carte.${e.paper}.nome`),
    cornice: t(`cornici.${e.frame}.nome`),
  } : null;
  const carte = PRINT_MATERIALS.map((id) => ({ id, nome: t(`carte.${id}.nome`), nota: t(`carte.${id}.nota`) }));
  const cornici = FRAMES.map((id) => ({ id, nome: t(`cornici.${id}.nome`), nota: t(`cornici.${id}.nota`) }));
  void framePrice;
  const anteprima: DatiScheda['anteprima'] = {
    formati: Object.fromEntries(varianti.map((v) => [v.format.id, { w: v.format.widthCm, h: v.format.heightCm, et: formatDimensions(v.format, lang) }])),
    carte: Object.fromEntries([...PRINT_MATERIALS, 'bizan'].map((id) => [id, t(`carte.${id}.breve`)])),
    cornici: Object.fromEntries(FRAMES.map((id) => [id, t(`cornici.${id}.breve`)])),
    ed: e ? { w: e.dimensions.widthCm, h: e.dimensions.heightCm, fw: e.framedDimensions.widthCm, fh: e.framedDimensions.heightCm, carta: e.paper, cornice: e.frame, et: formatDimensions(e.dimensions, lang) } : null,
  };

  // --- particolari (lente) ---
  const particolari: Particolare[] = [];
  if (art.images.detail1) particolari.push({ id: 'detail1', nome: t('galleria.scheda.particolare') });
  if (art.images.detail2) particolari.push({ id: 'detail2', nome: t('galleria.scheda.particolare') });
  // la firma solo dove la foto la mostra davvero (data/firme.json), inquadrata sulla firma
  const ff = art.images.signature ? finestraFirma(art.id) : null;
  if (ff) particolari.push({ id: 'signature', nome: t('etichette.firma'), zoom: ff.zoom, stile: ff.stile });

  // --- AR ---
  const modelli: Record<string, { glb: string; usdz: string; testo: string }> = {};
  const voce = (chiave: string, id: string, testo: (m: string) => string) => {
    const m = misureAr(id);
    if (!m) return;
    modelli[chiave] = { ...modelliAr(id), testo: testo(formatDimensions({ widthCm: m.larghezzaCm, heightCm: m.altezzaCm }, lang)) };
  };
  if (art.edition) voce('ed', `${art.id}-ed`, (m) => t('galleria.ar.misura_cornice', { misure: m }));
  for (const f of formati) voce(f.id, `${art.id}-${f.id}`, (m) => t('galleria.ar.misura', { misure: m }));
  // si apre sulla stampa (audit 28/10): il modello AR iniziale è quello del formato di stampa scelto
  const arIniziale = primaStampa && modelli[primaStampa.formato] ? primaStampa.formato : art.edition && art.status !== 'sold' ? 'ed' : Object.keys(modelli)[0] ?? 'ed';
  const scelto = modelli[arIniziale] ?? Object.values(modelli)[0]!;
  const { glb, usdz } = scelto;
  const mAr = misureAr(`${art.id}-${arIniziale}`);
  const testoMisureAr = scelto.testo;
  const poster = getArtworkImage(art, 'canvas', { width: 960 }).src;

  // --- precedente / successiva ---
  const lista = opereInOrdine();
  const i = lista.findIndex((a) => a.id === art.id);
  const precedente = lista[(i - 1 + lista.length) % lista.length]!;
  const successiva = lista[(i + 1) % lista.length]!;

  // --- dati strutturati ---
  const url = site ? new URL(href(lang, path), site).href : href(lang, path);
  const img = getArtworkImage(art, 'canvas', { width: 1200 });
  const immagine = site ? new URL(img.src, site).href : img.src;
  const autrice = { '@type': 'Person', name: art.author === 'ernesto' ? 'Ernesto' : 'Ninni' };
  const opera: Record<string, unknown> = {
    '@type': 'VisualArtwork',
    '@id': `${url}#opera`,
    name: titolo,
    creator: autrice,
    artform: 'Photograph',
    image: immagine,
    url,
  };
  if (art.dimensions) {
    opera.width = { '@type': 'Distance', name: `${art.dimensions.widthCm} cm` };
    opera.height = { '@type': 'Distance', name: `${art.dimensions.heightCm} cm` };
  }
  if (art.year) opera.dateCreated = String(art.year);
  if (descrizione) opera.description = descrizione;
  const prodotto: Record<string, unknown> = {
    '@type': 'Product',
    name: titolo,
    image: immagine,
    url,
    brand: autrice,
    subjectOf: { '@id': `${url}#opera` },
  };
  if (descrizione) prodotto.description = descrizione;
  if (!venduta && art.priceCents !== null) {
    prodotto.offers = {
      '@type': 'Offer',
      price: (art.priceCents / 100).toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url,
    };
  }
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': [opera, prodotto] }).replace(/</g, '\\u003c');

  const metaDescrizione = t('galleria.scheda.descrizione', { titolo, misure: misure ?? '' }).replace(/\s*[.。]\s*[.。]$/, sep(lang).p.trim());

  return {
    art,
    titolo,
    autore: art.author === 'ernesto' ? 'Ernesto' : 'Ninni',
    edizione,
    carte,
    cornici,
    anteprima,
    venduta,
    stampabile: stampe.length > 0,
    misure,
    righe,
    descrizione,
    prezzo: !venduta && art.priceCents !== null ? formatPrice(art.priceCents, lang) : null,
    notaPrezzo,
    notaPrezzoStampa,
    tempiOriginale: t('etichette.tempi_originale', { giorni: PREPARATION_BUSINESS_DAYS.original }),
    tempiStampa: t('etichette.tempi_stampa', { giorni: PREPARATION_BUSINESS_DAYS.print }),
    originale,
    formati,
    stampe,
    primaStampa,
    maxStampe: MAX_PRINT_QUANTITY,
    particolari,
    ar: { glb, usdz, misure: mAr, testoMisure: testoMisureAr, poster, modelli, iniziale: arIniziale },
    precedente,
    successiva,
    panoramica: art.aspectRatio > RAPPORTO_PANORAMICA,
    jsonLd,
    metaDescrizione,
  };
}

/** Alt dell'opera (titolo, dipinto di…), dal core. */
export const altOpera = (art: Artwork, lang: Locale) => artworkAlt(art, lang);
