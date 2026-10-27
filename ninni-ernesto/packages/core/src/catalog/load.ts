/**
 * Loads and normalises the raw data files into English-named domain objects.
 * Kept separate from `index.ts` so it can be unit-tested with fixture data.
 */
import { MAX_PRINTABLE_ASPECT_RATIO } from '../config/prints.ts';
import { FRAME_BORDER_CM } from '../config/prints.ts';
import type { Artwork, ArtworkImageVariant, Edition, ImageAsset, ImageFile, Orientation } from '../types.ts';
import { rawArtworkSchema, rawManifestSchema, type RawArtwork, type RawImage, type RawManifest } from './schema.ts';
import { slugify } from './slug.ts';

export const VARIANT_MAP: Record<string, ArtworkImageVariant> = {
  tela: 'canvas',
  miniatura: 'thumbnail',
  totale: 'full',
  'dettaglio-1': 'detail1',
  'dettaglio-2': 'detail2',
  firma: 'signature',
};

const ORIENTATION_MAP: Record<string, Orientation> = {
  orizzontale: 'landscape',
  verticale: 'portrait',
  quadrato: 'square',
};

const CONFIDENCE_MAP = { alta: 'high', media: 'medium', bassa: 'low' } as const;

function toFile(f: { w: number; h: number; file: string }): ImageFile {
  return { file: f.file, width: f.w, height: f.h };
}

export function toImageAsset(raw: RawImage, fallback: { lqip?: string | null; dominantColor?: string | null } = {}): ImageAsset {
  const avif = raw.avif.map(toFile);
  const webp = raw.webp.map(toFile);
  const biggest = [...avif, ...webp].sort((a, b) => b.width - a.width)[0];
  const width = raw.w ?? biggest?.width ?? 0;
  const height = raw.h ?? biggest?.height ?? 0;
  return {
    width,
    height,
    aspectRatio: raw.aspect_ratio ?? (height > 0 ? width / height : 1),
    avif,
    webp,
    jpg: raw.jpg ? toFile(raw.jpg) : null,
    lqip: raw.lqip ?? fallback.lqip ?? null,
    dominantColor: raw.colore_dominante ?? fallback.dominantColor ?? null,
  };
}

function buildEdition(raw: RawArtwork): Edition | null {
  const e = raw.edizione;
  if (!e) return null;
  const steps = [...e.scaglioni].sort((a, b) => a.fino - b.fino).map((x) => ({ upTo: x.fino, priceCents: Math.round(x.eur * 100) }));
  const sold = Math.min(e.vendute, e.esemplari);
  const nextNumber = sold < e.esemplari ? sold + 1 : null;
  const i = nextNumber === null ? -1 : steps.findIndex((s) => nextNumber <= s.upTo);
  const cur = i >= 0 ? steps[i]! : null;
  const b = FRAME_BORDER_CM[e.cornice] * 2;
  return {
    size: e.esemplari,
    artistProofs: e.prove_artista,
    sold,
    nextNumber,
    remaining: e.esemplari - sold,
    steps,
    nextStepPriceCents: i >= 0 && steps[i + 1] ? steps[i + 1]!.priceCents : null,
    leftAtThisPrice: cur && nextNumber ? Math.min(cur.upTo, e.esemplari) - nextNumber + 1 : 0,
    dimensions: { widthCm: e.larghezza_cm, heightCm: e.altezza_cm },
    framedDimensions: { widthCm: e.larghezza_cm + b, heightCm: e.altezza_cm + b },
    paper: e.carta,
    frame: e.cornice,
  };
}

export function editionPriceCents(ed: Edition): number | null {
  if (ed.nextNumber === null) return null;
  return ed.steps.find((s) => ed.nextNumber! <= s.upTo)?.priceCents ?? ed.steps[ed.steps.length - 1]!.priceCents;
}

export function isSoldAvailability(value: string): boolean {
  return /esaurit|vendut|sold/i.test(value);
}

/** Validates both files and builds the artwork list (order of `opere.json`). */
export function buildArtworks(rawArtworks: unknown, rawManifest: unknown): Artwork[] {
  const artworks = rawArtworkSchema.array().parse(rawArtworks);
  const manifest: RawManifest = rawManifestSchema.parse(rawManifest);
  const byId = new Map(manifest.opere.map((o) => [o.id, o]));
  const slugs = new Set<string>();

  return artworks.map((raw: RawArtwork): Artwork => {
    const m = byId.get(raw.id);
    if (!m) throw new Error(`[catalog] artwork ${raw.id} has no entry in assets/manifest.json`);

    let slug = slugify(raw.titolo) || `opera-${raw.id}`;
    if (slugs.has(slug)) slug = `${slug}-${raw.id}`;
    slugs.add(slug);

    const images: Artwork['images'] = {};
    for (const [key, img] of Object.entries(m.immagini)) {
      const variant = VARIANT_MAP[key];
      if (!variant) continue;
      // The canvas LQIP/colour live at artwork level in the manifest; the 4:5 thumbnail is a crop of the canvas.
      const fallback =
        variant === 'canvas' ? { lqip: m.lqip, dominantColor: m.colore_dominante } : variant === 'thumbnail' ? { dominantColor: m.colore_dominante } : {};
      images[variant] = toImageAsset(img, fallback);
    }

    const edition = buildEdition(raw);
    const sold = edition ? edition.nextNumber === null : isSoldAvailability(raw.disponibilita);
    const description: Artwork['description'] = {};
    if (raw.descrizione_it) description.it = raw.descrizione_it;
    if (raw.descrizione_en) description.en = raw.descrizione_en;
    if (raw.descrizione_zh) description.zh = raw.descrizione_zh;

    return {
      id: raw.id,
      slug,
      title: raw.titolo,
      status: sold ? 'sold' : 'available',
      priceCents: edition ? editionPriceCents(edition) : !sold && raw.prezzo_eur !== null ? Math.round(raw.prezzo_eur * 100) : null,
      dimensions: edition ? edition.framedDimensions : raw.misure ? { widthCm: raw.misure.larghezza_cm, heightCm: raw.misure.altezza_cm } : null,
      dimensionsNote: raw.misure?.testo ?? null,
      technique: raw.tecnica,
      frame: raw.cornice,
      frameNote: raw.cornice_note ?? null,
      year: raw.anno,
      description,
      alt: m.alt ? { it: m.alt } : {},
      orientation: ORIENTATION_MAP[m.orientamento] ?? 'portrait',
      aspectRatio: m.aspect_ratio,
      dominantColor: m.colore_dominante,
      palette: m.palette,
      printable: m.aspect_ratio <= MAX_PRINTABLE_ASPECT_RATIO,
      images,
      sourceUrl: raw.fonte_url ?? null,
      quality: {
        confidence: raw.confidenza_abbinamento ? CONFIDENCE_MAP[raw.confidenza_abbinamento] : 'low',
        missingFields: raw.campi_mancanti ?? [],
        notes: raw.note_abbinamento ?? '',
      },
      author: raw.autore,
      titleEn: raw.titolo_en ?? null,
      place: raw.luogo ?? null,
      edition,
      maxPrintLongSideCm: raw.stampa_max_cm,
    };
  });
}

export interface Photo {
  id: string;
  /** `ritratti` | `atelier` | `processo` | `altre-opere` */
  group: string;
  subject: string | null;
  recommendedUse: string[];
  blackAndWhite: boolean;
  aspectRatio: number;
  image: ImageAsset;
}

export function buildPhotos(rawManifest: unknown): Photo[] {
  const manifest = rawManifestSchema.parse(rawManifest);
  return manifest.foto.map((f) => ({
    id: f.id,
    group: f.gruppo,
    subject: f.soggetto ?? null,
    recommendedUse: f.uso_consigliato ?? [],
    blackAndWhite: f.bianco_e_nero ?? false,
    aspectRatio: f.aspect_ratio,
    image: toImageAsset({ ...f, aspect_ratio: f.aspect_ratio, colore_dominante: f.colore_dominante }),
  }));
}
