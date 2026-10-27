/**
 * Shared domain types for the Isabella Pistillo sites.
 *
 * Conventions:
 * - Money is always an integer number of euro cents (`priceCents: 350000` = 3.500 €).
 * - Prices are VAT-inclusive (gross). VAT is derived from the product kind.
 * - Dimensions are width × height in centimetres.
 */

/** Supported site languages. `it` is the default. */
export type Locale = 'it' | 'en' | 'zh';

/** A value available in some of the site languages. Missing languages fall back to Italian. */
export type Localized<T = string> = Partial<Record<Locale, T>>;

/** What kind of product a cart line is: drives VAT rate and shipping cost. */
export type ProductKind = 'original' | 'print';

export type ArtworkStatus = 'available' | 'sold';

export type Orientation = 'portrait' | 'landscape' | 'square';

export interface Dimensions {
  widthCm: number;
  heightCm: number;
}

export interface PaletteColor {
  /** `#rrggbb` */
  hex: string;
  /** Share of the canvas surface, 0–1. */
  share: number;
}

/** Image variant names. Mapping to the manifest: canvas=tela, thumbnail=miniatura, full=totale, detail1/2=dettaglio-1/2, signature=firma. */
export type ArtworkImageVariant = 'canvas' | 'thumbnail' | 'full' | 'detail1' | 'detail2' | 'signature';

export interface ImageFile {
  /** Path relative to the assets base, e.g. `opere/01/opera-01_tela_480.avif`. */
  file: string;
  width: number;
  height: number;
}

/** One image with all its encoded sizes, as described by `assets/manifest.json`. */
export interface ImageAsset {
  width: number;
  height: number;
  aspectRatio: number;
  avif: ImageFile[];
  webp: ImageFile[];
  /** Largest JPEG, used as `<img src>` fallback. */
  jpg: ImageFile | null;
  /** Tiny base64 WebP placeholder. */
  lqip: string | null;
  dominantColor: string | null;
}

/** Ready-to-render responsive image (output of `getArtworkImage` / `getPhotoImage`). */
export interface ResponsiveImage {
  sources: { type: 'image/avif' | 'image/webp'; srcset: string }[];
  /** Fallback URL: the smallest JPEG/WebP covering `fallbackWidth` (default 2 × `width`), or the original JPEG. */
  src: string;
  /** Rendered width/height to put on `<img>` (keeps aspect ratio, avoids layout shift). */
  width: number;
  height: number;
  sizes: string;
  lqip: string | null;
  dominantColor: string | null;
  palette: PaletteColor[];
}

export interface DataQuality {
  confidence: 'high' | 'medium' | 'low';
  /** Field names still missing in the source data (Italian names, as in `opere.json`). */
  missingFields: string[];
  notes: string;
}

export interface Artwork {
  /** Two-digit archive id, e.g. `"04"`. Matches the asset folders. */
  id: string;
  /** URL slug derived from the title, e.g. `dea-alea`. */
  slug: string;
  title: string;
  status: ArtworkStatus;
  /** Gross price (VAT 5% included). `null` when sold or "price on request". */
  priceCents: number | null;
  dimensions: Dimensions | null;
  /** Free text from the source data (e.g. "71 × 71 cm (opera); 90 × 90 cm con cornice"). */
  dimensionsNote: string | null;
  technique: string | null;
  /** Public frame description (e.g. "Cornice nera minimal inclusa"); `null` = no frame info. */
  frame: string | null;
  /** Internal note about the frame from `cornice_note` (to verify; not for publication). */
  frameNote?: string | null;
  year: number | null;
  description: Localized;
  alt: Localized;
  orientation: Orientation;
  aspectRatio: number;
  dominantColor: string;
  palette: PaletteColor[];
  /** True when prints can be ordered (panoramic friezes excluded). */
  printable: boolean;
  images: Partial<Record<ArtworkImageVariant, ImageAsset>>;
  sourceUrl: string | null;
  quality: DataQuality;
  /** Photographer: each one has a separate, signed catalogue. */
  author: AuthorId;
  /** English title (falls back to `title`). */
  titleEn: string | null;
  place: string | null;
  /** Numbered, signed limited edition (sold as kind `original`). `null` = open edition prints only. */
  edition: Edition | null;
  /** Longest side (cm) a print can have at good resolution. */
  maxPrintLongSideCm: number;
}

export type AuthorId = 'ninni' | 'ernesto';

export interface EditionStep {
  /** Copies 1..upTo are sold at this price. */
  upTo: number;
  priceCents: number;
}

export interface Edition {
  size: number;
  artistProofs: number;
  /** Copies already sold (true scarcity: update by hand after each sale). */
  sold: number;
  /** Next copy number for sale, or `null` if sold out. */
  nextNumber: number | null;
  remaining: number;
  steps: EditionStep[];
  /** Price of the following step (after the current one), for "il prezzo sale a …". */
  nextStepPriceCents: number | null;
  /** Copies left at the current price. */
  leftAtThisPrice: number;
  dimensions: Dimensions;
  /** Framed outer size (cm). */
  framedDimensions: Dimensions;
  /** `bizan` = Awagami Bizan fatta a mano, solo per le edizioni. */
  paper: PrintMaterial | 'bizan';
  frame: FrameId;
}

/** Fine art papers (see config/prints.ts). */
export type PrintMaterial = 'rag' | 'baryta' | 'washi';

export type FrameId = 'none' | 'alu' | 'oak' | 'walnut';

export interface PrintFormat {
  /** e.g. `50x70` (always width x height of the print as hung). */
  id: string;
  widthCm: number;
  heightCm: number;
  /** Gross prices (VAT 22% included). `null` = not available in that material. */
  prices: Record<PrintMaterial, number | null>;
}

export interface PrintOptions {
  formats: PrintFormat[];
  /** Lowest available price, for "da {prezzo}". */
  fromCents: number;
}

/**
 * The data a cart line needs, built on the server (`toCartProduct`) so the browser
 * does not need to load the catalogue.
 */
export interface CartProduct {
  kind: ProductKind;
  artworkId: string;
  slug: string;
  title: string;
  unitPriceCents: number;
  /** Longest side in cm (used for oversize shipping surcharge on originals). */
  longestSideCm?: number;
  print?: { formatId: string; material: PrintMaterial; frame: FrameId; widthCm: number; heightCm: number };
  image?: { src: string; width: number; height: number; alt?: string };
  /** Optional absolute or relative product URL (for the cart and the email). */
  url?: string;
}

export interface CartLine extends CartProduct {
  /** Unique key: `original:04` or `print:04:40x60:rag:oak`. */
  key: string;
  quantity: number;
  addedAt: number;
}

export type ShippingZoneId = 'italy' | 'eu' | 'uk-ch' | 'asia' | 'world';

export interface ShippingQuote {
  zone: ShippingZoneId;
  originalsCents: number;
  insuranceCents: number;
  printsCents: number;
  totalCents: number;
  freeShipping: boolean;
  deliveryDays: { min: number; max: number };
  /** Outside the EU customs duties may be charged to the recipient. */
  dutiesMayApply: boolean;
}

export interface VatBreakdownRow {
  kind: ProductKind;
  /** e.g. 0.05 */
  rate: number;
  grossCents: number;
  netCents: number;
  vatCents: number;
}

export interface CartTotals {
  itemsCount: number;
  /** Sum of gross line totals (VAT included). */
  subtotalCents: number;
  vat: VatBreakdownRow[];
  vatTotalCents: number;
  /** `null` until a destination country is known. */
  shipping: ShippingQuote | null;
  totalCents: number;
  /** True when VAT was removed because the destination is outside the EU and config says so. */
  vatExempt: boolean;
}

export interface InstallmentPlan {
  eligible: boolean;
  /** Why not eligible. */
  reason?: 'below-minimum' | 'above-maximum' | 'disabled';
  count: number;
  /** Amounts in cents; they always add up to the total exactly. */
  amounts: number[];
  /** Days between installments. */
  intervalDays: number;
}
