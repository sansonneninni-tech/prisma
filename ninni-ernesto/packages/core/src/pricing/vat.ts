import { VAT_RATES } from '../config/vat.ts';
import type { ProductKind } from '../types.ts';

/** VAT rate for a product kind (0.05 originals, 0.22 prints). */
export function vatRateFor(kind: ProductKind): number {
  return VAT_RATES[kind];
}

/**
 * Splits a VAT-inclusive (gross) amount into net + VAT, rounding VAT to the cent.
 * `splitVat(10500, 0.05)` → `{ netCents: 10000, vatCents: 500 }`.
 */
export function splitVat(grossCents: number, rate: number): { netCents: number; vatCents: number } {
  assertCents(grossCents);
  const netCents = Math.round(grossCents / (1 + rate));
  return { netCents, vatCents: grossCents - netCents };
}

/** Throws if the value is not a non-negative integer number of cents. */
export function assertCents(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`Expected a non-negative integer amount of cents, got ${value}`);
  }
}
