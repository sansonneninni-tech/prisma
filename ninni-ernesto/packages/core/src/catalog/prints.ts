import { formatsFor, framePrice } from '../config/prints.ts';
import type { Artwork, FrameId, PrintMaterial, PrintOptions } from '../types.ts';

export interface PrintOptionsQuery {
  /** Mantenuto per compatibilità: tutti i formati disponibili per la foto. */
  formats?: 'standard' | 'all';
}

/** Formati di stampa di una foto. `null` se la foto non si stampa. */
export function getPrintOptions(artwork: Pick<Artwork, 'printable' | 'aspectRatio' | 'maxPrintLongSideCm'>, _query: PrintOptionsQuery = {}): PrintOptions | null {
  if (!artwork.printable) return null;
  const formats = formatsFor(artwork.aspectRatio, artwork.maxPrintLongSideCm);
  const prices = formats.flatMap((f) => Object.values(f.prices)).filter((p): p is number => p !== null);
  if (prices.length === 0) return null;
  return { formats, fromCents: Math.min(...prices) };
}

/** Prezzo di una variante (formato + carta + cornice), o `null` se non esiste. */
export function getPrintPrice(options: PrintOptions, formatId: string, material: PrintMaterial, frame: FrameId = 'none'): number | null {
  const f = options.formats.find((x) => x.id === formatId);
  const base = f?.prices[material] ?? null;
  return base === null || !f ? null : base + framePrice(frame, f);
}
