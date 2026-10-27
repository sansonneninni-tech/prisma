/**
 * Responsive image helpers (AVIF + WebP srcset, JPEG fallback, LQIP placeholder, palette).
 * Pure functions: they only build URLs, they never read files.
 */
import type { ImageAsset, ImageFile, PaletteColor, ResponsiveImage } from '../types.ts';

/**
 * Public URL prefix of `siti/assets/`. The Astro integration serves/copies the folder at `/assets/`.
 * Override with the `PUBLIC_ISA_ASSETS_BASE` env variable (e.g. a CDN), keeping the trailing slash.
 */
export const ASSETS_BASE: string = (() => {
  const fromEnv = (import.meta.env as Record<string, string | undefined> | undefined)?.PUBLIC_ISA_ASSETS_BASE;
  const base = fromEnv && fromEnv.length > 0 ? fromEnv : '/assets/';
  return base.endsWith('/') ? base : `${base}/`;
})();

/** Full URL of a file in `assets/`. */
export function assetUrl(file: string, base: string = ASSETS_BASE): string {
  return `${base}${file.replace(/^\/+/, '')}`;
}

function srcset(files: readonly ImageFile[], base: string): string {
  return [...files]
    .sort((a, b) => a.width - b.width)
    .map((f) => `${assetUrl(f.file, base)} ${f.width}w`)
    .join(', ');
}

export interface ImageOptions {
  /**
   * Width (CSS px) the image is displayed at. Sets `width`/`height` attributes and a default `sizes`.
   * Never larger than the original.
   */
  width?: number;
  /** Custom `sizes` attribute, e.g. `(min-width: 1024px) 50vw, 100vw`. */
  sizes?: string;
  /** Override the assets base URL. */
  base?: string;
  /**
   * Minimum width (px) of the `<img src>` fallback file.
   * Default: `2 × width` when `width` is set (sharp on 2x screens), otherwise the original JPEG.
   * The smallest JPEG/WebP file at least this wide is used, never wider than the original JPEG.
   * `'original'` always keeps the largest JPEG (behaviour before 0.2.0).
   */
  fallbackWidth?: number | 'original';
}

/** Builds the `<picture>` data for an image asset. */
export function toResponsiveImage(asset: ImageAsset, options: ImageOptions = {}, palette: PaletteColor[] = []): ResponsiveImage {
  const base = options.base ?? ASSETS_BASE;
  const width = Math.round(options.width ? Math.min(options.width, asset.width) : asset.width);
  const height = Math.round(width / asset.aspectRatio);
  const sizes = options.sizes ?? (options.width ? `(max-width: ${width}px) 100vw, ${width}px` : '100vw');

  const sources: ResponsiveImage['sources'] = [];
  if (asset.avif.length) sources.push({ type: 'image/avif', srcset: srcset(asset.avif, base) });
  if (asset.webp.length) sources.push({ type: 'image/webp', srcset: srcset(asset.webp, base) });

  const fallback = pickFallback(asset, options);
  return {
    sources,
    src: fallback ? assetUrl(fallback.file, base) : '',
    width,
    height,
    sizes,
    lqip: asset.lqip,
    dominantColor: asset.dominantColor,
    palette,
  };
}

/** Smallest encoded file at least `minWidth` wide (or the largest available). Useful for cart thumbnails and emails. */
export function pickFile(files: readonly ImageFile[], minWidth: number): ImageFile | undefined {
  const sorted = [...files].sort((a, b) => a.width - b.width);
  return sorted.find((f) => f.width >= minWidth) ?? sorted[sorted.length - 1];
}

function pickFallback(asset: ImageAsset, options: ImageOptions): ImageFile | undefined {
  const original = asset.jpg ?? largest(asset.webp) ?? largest(asset.avif);
  const target = options.fallbackWidth ?? (options.width ? Math.ceil(options.width * 2) : 'original');
  if (target === 'original') return original;
  // JPEG first so it wins a tie with a WebP of the same width (widest browser support).
  const candidates = [...(asset.jpg ? [asset.jpg] : []), ...asset.webp];
  if (candidates.length === 0) return original;
  const picked = pickFile(candidates, target);
  // Never wider than the original JPEG: the fallback can only get lighter than before.
  if (!picked || (asset.jpg && picked.width > asset.jpg.width)) return original;
  return picked;
}

function largest(files: readonly ImageFile[]): ImageFile | undefined {
  return [...files].sort((a, b) => b.width - a.width)[0];
}
