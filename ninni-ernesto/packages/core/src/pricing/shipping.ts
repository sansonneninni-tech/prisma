import { OVERSIZE_THRESHOLD_CM, SHIPPING_RATES, ZONE_COUNTRIES } from '../config/shipping.ts';
import type { CartLine, ShippingQuote, ShippingZoneId } from '../types.ts';

/** Maps an ISO 3166-1 alpha-2 country code to its shipping zone (unknown → `world`). */
export function getShippingZone(country: string): ShippingZoneId {
  const code = country.trim().toUpperCase();
  for (const [zone, countries] of Object.entries(ZONE_COUNTRIES) as [Exclude<ShippingZoneId, 'world'>, string[]][]) {
    if (countries.includes(code)) return zone;
  }
  return 'world';
}

/** True for EU (incl. Italy) destinations. */
export function isInsideEU(zone: ShippingZoneId): boolean {
  return !SHIPPING_RATES[zone].outsideEU;
}

type ShippableLine = Pick<CartLine, 'kind' | 'quantity' | 'unitPriceCents' | 'longestSideCm'>;

/**
 * Shipping cost for a set of cart lines to a zone.
 * Originals: per piece + insurance (% of price, with minimum) + oversize surcharge.
 * Prints: first + additional, free above the zone threshold (on the prints subtotal).
 */
export function calculateShipping(lines: readonly ShippableLine[], zone: ShippingZoneId): ShippingQuote {
  const rates = SHIPPING_RATES[zone];
  let originalsCents = 0;
  let insuranceCents = 0;
  let printCount = 0;
  let printsSubtotal = 0;

  for (const line of lines) {
    if (line.quantity <= 0) continue;
    if (line.kind === 'original') {
      const r = rates.original;
      originalsCents += r.perItemCents * line.quantity;
      if ((line.longestSideCm ?? 0) > OVERSIZE_THRESHOLD_CM) originalsCents += r.oversizeSurchargeCents * line.quantity;
      const insurance = Math.max(Math.round(line.unitPriceCents * r.insuranceRate), r.insuranceMinCents);
      insuranceCents += insurance * line.quantity;
    } else {
      printCount += line.quantity;
      printsSubtotal += line.unitPriceCents * line.quantity;
    }
  }

  let printsCents = 0;
  if (printCount > 0) {
    const r = rates.print;
    const free = r.freeAboveCents !== null && printsSubtotal >= r.freeAboveCents;
    printsCents = free ? 0 : r.firstItemCents + r.additionalItemCents * (printCount - 1);
  }

  const totalCents = originalsCents + insuranceCents + printsCents;
  const hasItems = lines.some((l) => l.quantity > 0);
  return {
    zone,
    originalsCents,
    insuranceCents,
    printsCents,
    totalCents,
    freeShipping: hasItems && totalCents === 0,
    deliveryDays: { ...rates.deliveryDays },
    dutiesMayApply: rates.outsideEU,
  };
}
