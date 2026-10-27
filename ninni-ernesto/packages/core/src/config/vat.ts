/**
 * VAT (IVA) configuration.
 *
 * Decided in the client meeting (20:44): 5% on hand-painted, signed originals, 22% on prints.
 * Prices in the catalogue are VAT-inclusive; the checkout only shows how much VAT they contain.
 */
import type { ProductKind } from '../types.ts';

export const VAT_RATES: Record<ProductKind, number> = {
  // Regime forfettario: nessuna IVA da esporre (il sito non la nomina).
  original: 0,
  print: 0,
};

/**
 * What to do with VAT when the destination is outside the EU.
 * - `'include'`: keep VAT-inclusive prices everywhere (current behaviour of the shop).
 * - `'exempt'`: remove Italian VAT for exports (non-imponibile art. 8 DPR 633/72).
 * TODO(commercialista): confirm the fiscal treatment before going live.
 */
export const VAT_OUTSIDE_EU: 'include' | 'exempt' = 'include';
