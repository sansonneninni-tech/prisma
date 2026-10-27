/**
 * Catalogue API — SERVER ONLY (use it in Astro frontmatter / getStaticPaths).
 * Data: `siti/dati/opere.json` + `siti/assets/manifest.json`, validated with zod at first use.
 */
import manifestJson from '../../../../assets/manifest.json' with { type: 'json' };
import artworksJson from '../../../../dati/opere.json' with { type: 'json' };
import { COMING_SOON, type ComingSoonCategory } from '../config/coming-soon.ts';
import { PROPOSALS } from '../config/proposals.ts';
import { sep } from '../i18n/format.ts';
import { localizePath } from '../i18n/routing.ts';
import type {
  Artwork,
  ArtworkImageVariant,
  ArtworkStatus,
  CartProduct,
  Locale,
  Orientation,
  PaletteColor,
  PrintFormat,
  PrintMaterial,
  FrameId,
  PrintOptions,
  ResponsiveImage,
} from '../types.ts';
import { assetUrl, pickFile, toResponsiveImage, type ImageOptions } from './images.ts';
import { buildArtworks, buildPhotos, type Photo } from './load.ts';
import { getPrintOptions, getPrintPrice, type PrintOptionsQuery } from './prints.ts';
import { FRAMES, PRINT_MATERIALS } from '../config/prints.ts';

export * from './images.ts';
export type * from '../types.ts';
export { getPrintOptions, getPrintPrice, type PrintOptionsQuery } from './prints.ts';
export { slugify } from './slug.ts';
export type { Photo } from './load.ts';
export type { ComingSoonCategory, ComingSoonExample } from '../config/coming-soon.ts';

let artworksCache: Artwork[] | null = null;
let photosCache: Photo[] | null = null;

function all(): Artwork[] {
  artworksCache ??= buildArtworks(artworksJson, manifestJson);
  return artworksCache;
}

export interface ArtworkFilter {
  status?: ArtworkStatus;
  orientation?: Orientation;
  printable?: boolean;
}

/** All artworks (order of `opere.json`), optionally filtered. */
export function getArtworks(filter: ArtworkFilter = {}): Artwork[] {
  return all().filter(
    (a) =>
      (filter.status === undefined || a.status === filter.status) &&
      (filter.orientation === undefined || a.orientation === filter.orientation) &&
      (filter.printable === undefined || a.printable === filter.printable),
  );
}

export function getArtwork(id: string): Artwork | undefined {
  return all().find((a) => a.id === id);
}

export function getArtworkBySlug(slug: string): Artwork | undefined {
  return all().find((a) => a.slug === slug);
}

/** Like `getArtwork` but throws: for ids that must exist (config files). */
export function requireArtwork(id: string): Artwork {
  const artwork = getArtwork(id);
  if (!artwork) throw new Error(`[catalog] unknown artwork id "${id}"`);
  return artwork;
}

/** Alt text: from the data if present, otherwise "Title, painting by Isabella Pistillo" in the page language (sep(lang).v). */
export function artworkAlt(artwork: Artwork, lang: Locale): string {
  const fromData = artwork.alt[lang] ?? (lang === 'it' ? artwork.alt.it : undefined);
  if (fromData) return fromData;
  const nome = artwork.author === 'ernesto' ? 'Ernesto' : 'Ninni';
  const by = { it: `fotografia di ${nome}`, en: `photograph by ${nome}`, zh: `${nome}` }[lang];
  return `${artwork.title}${sep(lang).v}${by}`;
}

/** Description in the page language, falling back to Italian (texts in `opere.json` are Italian only for now). */
export function artworkDescription(artwork: Artwork, lang: Locale): { text: string; lang: Locale } | null {
  const text = artwork.description[lang];
  if (text) return { text, lang };
  if (artwork.description.it) return { text: artwork.description.it, lang: 'it' };
  return null;
}

/** Responsive image for an artwork (or its id). Throws if the variant is missing. */
export function getArtworkImage(artworkOrId: Artwork | string, variant: ArtworkImageVariant = 'canvas', options: ImageOptions = {}): ResponsiveImage {
  const artwork = typeof artworkOrId === 'string' ? requireArtwork(artworkOrId) : artworkOrId;
  const asset = artwork.images[variant];
  if (!asset) throw new Error(`[catalog] artwork ${artwork.id} has no "${variant}" image`);
  return toResponsiveImage(asset, options, artwork.palette);
}

/** Photos of Isabella and the atelier from the manifest. */
export function getPhotos(filter: { group?: string; use?: string } = {}): Photo[] {
  photosCache ??= buildPhotos(manifestJson);
  return photosCache.filter(
    (p) => (filter.group === undefined || p.group === filter.group) && (filter.use === undefined || p.recommendedUse.includes(filter.use)),
  );
}

export function getPhotoImage(id: string, options: ImageOptions = {}): ResponsiveImage {
  const photo = getPhotos().find((p) => p.id === id);
  if (!photo) throw new Error(`[catalog] unknown photo id "${id}"`);
  return toResponsiveImage(photo.image, options);
}

// ── Prints ──────────────────────────────────────────────────────────────────

export interface PrintProduct {
  artwork: Artwork;
  options: PrintOptions;
}

/** All printable artworks with their formats (sold originals included: their prints are still for sale). */
export function getPrints(query: PrintOptionsQuery = {}): PrintProduct[] {
  return all().flatMap((artwork) => {
    const options = getPrintOptions(artwork, query);
    return options ? [{ artwork, options }] : [];
  });
}

// ── Cart products (serialisable snapshots for the browser) ──────────────────

function cartThumb(artwork: Artwork, lang: Locale): CartProduct['image'] {
  const asset = artwork.images.thumbnail ?? artwork.images.canvas;
  const file = asset ? pickFile(asset.webp, 300) : undefined;
  if (!file) return undefined;
  return { src: assetUrl(file.file), width: file.width, height: file.height, alt: artworkAlt(artwork, lang) };
}

export interface CartProductOptions extends PrintOptionsQuery {
  /** Product page path without language, e.g. `/opere/dea-alea`. Localised automatically. */
  path?: string;
}

/** Cart snapshot of an original. `null` if not purchasable (sold or no price). */
export function toCartProduct(artwork: Artwork, lang: Locale, options: CartProductOptions = {}): CartProduct | null {
  if (artwork.status !== 'available' || artwork.priceCents === null) return null;
  const product: CartProduct = {
    kind: 'original',
    artworkId: artwork.id,
    slug: artwork.slug,
    title: artwork.title,
    unitPriceCents: artwork.priceCents,
  };
  if (artwork.dimensions) product.longestSideCm = Math.max(artwork.dimensions.widthCm, artwork.dimensions.heightCm);
  const image = cartThumb(artwork, lang);
  if (image) product.image = image;
  if (options.path) product.url = localizePath(options.path, lang);
  return product;
}

/** Cart snapshot of one print variant (any format of the price list, extra ones included). `null` if it does not exist. */
export function toPrintCartProduct(
  artwork: Artwork,
  formatId: string,
  material: PrintMaterial,
  lang: Locale,
  options: CartProductOptions = {},
  frame: FrameId = 'none',
): CartProduct | null {
  const printOptions = getPrintOptions(artwork, { formats: 'all' });
  if (!printOptions) return null;
  const price = getPrintPrice(printOptions, formatId, material, frame);
  const format = printOptions.formats.find((f) => f.id === formatId);
  if (price === null || !format) return null;
  const product: CartProduct = {
    kind: 'print',
    artworkId: artwork.id,
    slug: artwork.slug,
    title: artwork.title,
    unitPriceCents: price,
    print: { formatId, material, frame, widthCm: format.widthCm, heightCm: format.heightCm },
  };
  const image = cartThumb(artwork, lang);
  if (image) product.image = image;
  if (options.path) product.url = localizePath(options.path, lang);
  return product;
}

/** Every print variant of an artwork as cart products (for a format/material picker). */
export function toPrintCartProducts(artwork: Artwork, lang: Locale, options: CartProductOptions = {}): { format: PrintFormat; material: PrintMaterial; frame: FrameId; product: CartProduct }[] {
  const printOptions = getPrintOptions(artwork, options);
  if (!printOptions) return [];
  return printOptions.formats.flatMap((format) =>
    PRINT_MATERIALS.flatMap((material) =>
      FRAMES.flatMap((frame) => {
        const product = toPrintCartProduct(artwork, format.id, material, lang, options, frame);
        return product ? [{ format, material, frame, product }] : [];
      }),
    ),
  );
}

// ── Coming soon & proposals ─────────────────────────────────────────────────

/** "Prossimamente" categories (not purchasable). Texts: `t(\`prossimamente.voci[${c.textIndex}].nome\`)`. */
export function getComingSoon(): ComingSoonCategory[] {
  return COMING_SOON;
}

export interface Proposal {
  id: string;
  /** Index in `proposte.set` of the texts. */
  textIndex: number;
  original: Artwork;
  print: { artwork: Artwork; format: PrintFormat; material: PrintMaterial; priceCents: number };
  object: ComingSoonCategory;
  /** Combined palette of the set (main colours of the two artworks, by surface share). */
  palette: PaletteColor[];
}

/** "Le proposte di Isa": resolved sets. Throws on broken references in `config/proposals.ts`. */
export function getProposals(): Proposal[] {
  return PROPOSALS.map((cfg) => {
    const original = requireArtwork(cfg.originalId);
    const printArtwork = requireArtwork(cfg.print.artworkId);
    const options = getPrintOptions(printArtwork);
    const format = options?.formats.find((f) => f.id === cfg.print.formatId);
    const priceCents = options ? getPrintPrice(options, cfg.print.formatId, cfg.print.material) : null;
    if (!format || priceCents === null) {
      throw new Error(`[catalog] proposal "${cfg.id}": print ${cfg.print.artworkId} ${cfg.print.formatId}/${cfg.print.material} does not exist`);
    }
    const object = COMING_SOON.find((c) => c.id === cfg.objectId);
    if (!object) throw new Error(`[catalog] proposal "${cfg.id}": unknown object "${cfg.objectId}"`);
    const palette = [...original.palette.slice(0, 3), ...printArtwork.palette.slice(0, 2)].sort((a, b) => b.share - a.share);
    return {
      id: cfg.id,
      textIndex: cfg.textIndex,
      original,
      print: { artwork: printArtwork, format, material: cfg.print.material, priceCents },
      object,
      palette,
    };
  });
}
