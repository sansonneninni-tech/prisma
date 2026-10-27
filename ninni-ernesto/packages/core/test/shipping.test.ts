import { afterEach, describe, expect, it } from 'vitest';
import { SHIPPABLE_COUNTRIES, SHIPPING_RATES, ZONE_COUNTRIES } from '../src/config/shipping.ts';
import { calculateShipping, getShippingZone, isInsideEU } from '../src/pricing/shipping.ts';
import { line, original, print } from './helpers.ts';

describe('getShippingZone', () => {
  it('maps countries to the five zones', () => {
    expect(getShippingZone('IT')).toBe('italy');
    expect(getShippingZone('sm')).toBe('italy');
    expect(getShippingZone('DE')).toBe('eu');
    expect(getShippingZone('FR')).toBe('eu');
    expect(getShippingZone('GB')).toBe('uk-ch');
    expect(getShippingZone('CH')).toBe('uk-ch');
    expect(getShippingZone('CN')).toBe('asia');
    expect(getShippingZone('JP')).toBe('asia');
    expect(getShippingZone('US')).toBe('world');
    expect(getShippingZone('XX')).toBe('world');
  });

  it('has no country in two zones and lists every zone country as shippable', () => {
    const all = Object.values(ZONE_COUNTRIES).flat();
    expect(new Set(all).size).toBe(all.length);
    for (const c of all) expect(SHIPPABLE_COUNTRIES).toContain(c);
    expect(new Set(SHIPPABLE_COUNTRIES).size).toBe(SHIPPABLE_COUNTRIES.length);
  });

  it('knows which zones are in the EU', () => {
    expect(isInsideEU('italy')).toBe(true);
    expect(isInsideEU('eu')).toBe(true);
    expect(isInsideEU('uk-ch')).toBe(false);
    expect(isInsideEU('world')).toBe(false);
    expect(isInsideEU('asia')).toBe(false);
  });
});

describe('calculateShipping', () => {
  it('uses the demo rates from ninni (18/10): originals free in Italy, 90 € EU, 180 € world', () => {
    const one = [line(original('08', 350000, { longestSideCm: 100 }))];
    expect(calculateShipping(one, 'italy').totalCents).toBe(0);
    expect(calculateShipping(one, 'eu').totalCents).toBe(9000);
    expect(calculateShipping(one, 'world').totalCents).toBe(18000);
    // extra zones reuse the nearest group
    expect(calculateShipping(one, 'uk-ch').totalCents).toBe(9000);
    expect(calculateShipping(one, 'asia').totalCents).toBe(18000);
  });

  it('uses the demo rates for prints: 12 € Italy, 25 € EU, 45 € world (flat per order)', () => {
    const prints = [line(print('01', 10980), 2), line(print('02', 13420))];
    expect(calculateShipping(prints, 'italy').printsCents).toBe(1200);
    expect(calculateShipping(prints, 'eu').printsCents).toBe(2500);
    expect(calculateShipping(prints, 'world').printsCents).toBe(4500);
  });

  it('charges originals per piece and adds prints once', () => {
    const q = calculateShipping([line(original('08', 350000)), line(original('09', 500000)), line(print('01', 10980))], 'eu');
    expect(q.originalsCents).toBe(2 * SHIPPING_RATES.eu.original.perItemCents);
    expect(q.printsCents).toBe(SHIPPING_RATES.eu.print.firstItemCents);
    expect(q.totalCents).toBe(q.originalsCents + q.insuranceCents + q.printsCents);
    expect(q.deliveryDays).toEqual(SHIPPING_RATES.eu.deliveryDays);
    expect(q.dutiesMayApply).toBe(false);
  });

  it('reports free shipping when the total is zero (original in Italy)', () => {
    expect(calculateShipping([line(original('08', 350000))], 'italy').freeShipping).toBe(true);
    expect(calculateShipping([line(print('01', 10980))], 'italy').freeShipping).toBe(false);
  });

  it('flags duties outside the EU', () => {
    expect(calculateShipping([line(print('01', 10980))], 'world').dutiesMayApply).toBe(true);
    expect(calculateShipping([line(print('01', 10980))], 'uk-ch').dutiesMayApply).toBe(true);
  });

  it('returns zero for an empty cart without claiming free shipping', () => {
    const q = calculateShipping([], 'italy');
    expect(q.totalCents).toBe(0);
    expect(q.freeShipping).toBe(false);
  });

  it('ignores zero quantities', () => {
    expect(calculateShipping([line(print('01', 10980), 0)], 'eu').totalCents).toBe(0);
  });

  describe('optional model features (insurance, oversize, extra prints, free threshold)', () => {
    afterEach(() => {
      Object.assign(SHIPPING_RATES.eu, structuredClone(saved));
    });
    const saved = structuredClone(SHIPPING_RATES.eu);

    it('adds insurance with a minimum and an oversize surcharge', () => {
      Object.assign(SHIPPING_RATES.eu.original, { insuranceRate: 0.01, insuranceMinCents: 1000, oversizeSurchargeCents: 5000 });
      const big = calculateShipping([line(original('25', 1500000, { longestSideCm: 280 }))], 'eu');
      expect(big.insuranceCents).toBe(15000);
      expect(big.originalsCents).toBe(9000 + 5000);
      const cheap = calculateShipping([line(original('x', 30000, { longestSideCm: 50 }))], 'eu');
      expect(cheap.insuranceCents).toBe(1000);
      expect(cheap.originalsCents).toBe(9000);
    });

    it('charges extra prints and makes prints free above a threshold', () => {
      Object.assign(SHIPPING_RATES.eu.print, { additionalItemCents: 500, freeAboveCents: 30000 });
      expect(calculateShipping([line(print('01', 10980), 2)], 'eu').printsCents).toBe(2500 + 500);
      expect(calculateShipping([line(print('01', 10980), 3)], 'eu').printsCents).toBe(0);
    });
  });
});
