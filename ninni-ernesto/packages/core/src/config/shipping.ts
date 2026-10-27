/**
 * Shipping table — EDIT HERE to change costs or delivery times. The only file to touch.
 *
 * All amounts are euro cents, VAT included.
 * Ninni & Ernesto (27/10/2026, valori dimostrativi): edizioni limitate incluse in Italia, 45 € Europa, 90 € resto del mondo;
 * stampe 12 € Italia (gratis da 150 €), 25 € Europa (gratis da 300 €), 45 € resto del mondo.
 * Valori originari del progetto di partenza:
 *   originals: shipping included in Italy, 90 € Europe, 180 € rest of the world
 *   prints:    12 € Italy, 25 € Europe, 45 € rest of the world (flat per order)
 * The core has 5 zones; the two extra ones reuse the values of the nearest group:
 *   'uk-ch' (UK, Switzerland, Norway) → Europe values; 'asia' (China and Asia) → rest-of-the-world values.
 * Delivery days: Italy 2–3 and EU 5–8 come from the current shop; the others are estimates.
 *
 * The model also supports insurance (% of the artwork price), an oversize surcharge, a cost per extra
 * print and a free-shipping threshold: they are set to 0/null to match the flat demo prices above.
 */
import type { ShippingZoneId } from '../types.ts';

export interface ZoneRates {
  original: {
    /** Packing + courier, per original. */
    perItemCents: number;
    /** Insurance as a fraction of the artwork price (e.g. 0.01 = 1%). */
    insuranceRate: number;
    /** Minimum insurance per original. */
    insuranceMinCents: number;
    /** Extra cost per original whose longest side exceeds `OVERSIZE_THRESHOLD_CM`. */
    oversizeSurchargeCents: number;
  };
  print: {
    firstItemCents: number;
    additionalItemCents: number;
    /** Prints subtotal (gross) from which print shipping is free; `null` = never free. */
    freeAboveCents: number | null;
  };
  deliveryDays: { min: number; max: number };
  /** Show the "duties may apply" note. */
  outsideEU: boolean;
}

export const OVERSIZE_THRESHOLD_CM = 150;

/**
 * Business days in the studio before shipping (demo decision of 19/10/2026, to confirm with Isabella).
 * Prints: 3, as on the current shop. An order leaves all together: the longest wins (`preparationDays`).
 */
export const PREPARATION_BUSINESS_DAYS: Record<'original' | 'print', number> = { original: 10, print: 5 };

export function preparationDays(lines: readonly { kind: 'original' | 'print' }[]): number {
  if (!lines.length) return PREPARATION_BUSINESS_DAYS.original;
  return Math.max(...lines.map((l) => PREPARATION_BUSINESS_DAYS[l.kind]));
}

/** Order matters: it is the order zones are shown in tables. */
export const SHIPPING_ZONE_ORDER: ShippingZoneId[] = ['italy', 'eu', 'uk-ch', 'world', 'asia'];

const NO_EXTRAS = { insuranceRate: 0, insuranceMinCents: 0, oversizeSurchargeCents: 0 };

export const SHIPPING_RATES: Record<ShippingZoneId, ZoneRates> = {
  italy: {
    original: { perItemCents: 0, ...NO_EXTRAS },
    print: { firstItemCents: 1200, additionalItemCents: 0, freeAboveCents: 15000 },
    deliveryDays: { min: 2, max: 3 },
    outsideEU: false,
  },
  eu: {
    original: { perItemCents: 4500, ...NO_EXTRAS },
    print: { firstItemCents: 2500, additionalItemCents: 0, freeAboveCents: 30000 },
    deliveryDays: { min: 5, max: 8 },
    outsideEU: false,
  },
  // same values as Europe
  'uk-ch': {
    original: { perItemCents: 4500, ...NO_EXTRAS },
    print: { firstItemCents: 2500, additionalItemCents: 0, freeAboveCents: 30000 },
    deliveryDays: { min: 5, max: 10 },
    outsideEU: true,
  },
  world: {
    original: { perItemCents: 9000, ...NO_EXTRAS },
    print: { firstItemCents: 4500, additionalItemCents: 0, freeAboveCents: null },
    deliveryDays: { min: 7, max: 12 },
    outsideEU: true,
  },
  // same values as the rest of the world
  asia: {
    original: { perItemCents: 9000, ...NO_EXTRAS },
    print: { firstItemCents: 4500, additionalItemCents: 0, freeAboveCents: null },
    deliveryDays: { min: 8, max: 14 },
    outsideEU: true,
  },
};

/** ISO 3166-1 alpha-2 country codes per zone. Countries not listed fall into `world`. */
export const ZONE_COUNTRIES: Record<Exclude<ShippingZoneId, 'world'>, string[]> = {
  italy: ['IT', 'SM', 'VA'],
  eu: [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
    'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'MC',
  ],
  'uk-ch': ['GB', 'CH', 'LI', 'NO'],
  asia: ['CN', 'HK', 'MO', 'TW', 'JP', 'KR', 'SG', 'TH', 'MY', 'VN', 'PH', 'ID', 'IN'],
};

/**
 * Countries offered in the checkout country select (in this order after the user's own).
 * Names are produced at runtime with `Intl.DisplayNames`, so no translation is needed.
 */
export const SHIPPABLE_COUNTRIES: string[] = [
  'IT', 'SM', 'VA',
  ...ZONE_COUNTRIES.eu,
  ...ZONE_COUNTRIES['uk-ch'],
  'US', 'CA', 'AU', 'NZ', 'AE', 'IL', 'BR', 'MX',
  ...ZONE_COUNTRIES.asia,
];
