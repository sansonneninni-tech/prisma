import { VAT_OUTSIDE_EU } from '../config/vat.ts';
import type { CartLine, CartTotals, ProductKind, ShippingZoneId, VatBreakdownRow } from '../types.ts';
import { calculateShipping, getShippingZone, isInsideEU } from './shipping.ts';
import { splitVat, vatRateFor } from './vat.ts';

export interface TotalsOptions {
  /** ISO country code of the destination. Takes precedence over `zone`. */
  country?: string | null;
  zone?: ShippingZoneId | null;
  /** Override of `VAT_OUTSIDE_EU` from the config. */
  vatOutsideEU?: 'include' | 'exempt';
}

type TotalsLine = Pick<CartLine, 'kind' | 'quantity' | 'unitPriceCents' | 'longestSideCm'>;

/**
 * Cart/order totals: subtotal, VAT breakdown per rate, shipping and grand total.
 * Prices are VAT-inclusive: VAT is "of which" (di cui), not added on top —
 * unless the destination is outside the EU and VAT is configured as `exempt`, in which case it is removed.
 * Shipping is shown as a separate gross amount (its VAT treatment follows the goods: TODO commercialista).
 */
export function calculateTotals(lines: readonly TotalsLine[], options: TotalsOptions = {}): CartTotals {
  const zone = options.country ? getShippingZone(options.country) : (options.zone ?? null);
  const vatPolicy = options.vatOutsideEU ?? VAT_OUTSIDE_EU;
  const vatExempt = zone !== null && !isInsideEU(zone) && vatPolicy === 'exempt';

  const grossByKind = new Map<ProductKind, number>();
  let itemsCount = 0;
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    itemsCount += line.quantity;
    grossByKind.set(line.kind, (grossByKind.get(line.kind) ?? 0) + line.unitPriceCents * line.quantity);
  }

  const vat: VatBreakdownRow[] = [];
  let subtotalCents = 0;
  for (const kind of ['original', 'print'] as const) {
    const gross = grossByKind.get(kind);
    if (gross === undefined) continue;
    const rate = vatRateFor(kind);
    const { netCents, vatCents } = splitVat(gross, rate);
    if (vatExempt) {
      vat.push({ kind, rate, grossCents: netCents, netCents, vatCents: 0 });
      subtotalCents += netCents;
    } else {
      vat.push({ kind, rate, grossCents: gross, netCents, vatCents });
      subtotalCents += gross;
    }
  }

  const vatTotalCents = vat.reduce((sum, row) => sum + row.vatCents, 0);
  const shipping = zone !== null && itemsCount > 0 ? calculateShipping(lines, zone) : null;
  return {
    itemsCount,
    subtotalCents,
    vat,
    vatTotalCents,
    shipping,
    totalCents: subtotalCents + (shipping?.totalCents ?? 0),
    vatExempt,
  };
}
