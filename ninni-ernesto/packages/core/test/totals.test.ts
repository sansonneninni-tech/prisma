import { describe, expect, it } from 'vitest';
import { calculateShipping } from '../src/pricing/shipping.ts';
import { calculateTotals } from '../src/pricing/totals.ts';
import { line, original, print } from './helpers.ts';

describe('calculateTotals', () => {
  const lines = [line(original('01', 99000)), line(print('05', 22000, '60x90', 'rag'), 2)];

  it('sums final prices with no VAT (flat-rate regime)', () => {
    const totals = calculateTotals(lines);
    expect(totals.itemsCount).toBe(3);
    expect(totals.subtotalCents).toBe(99000 + 2 * 22000);
    expect(totals.vat.every((v) => v.rate === 0 && v.vatCents === 0 && v.netCents === v.grossCents)).toBe(true);
    expect(totals.vatTotalCents).toBe(0);
    expect(totals.shipping).toBeNull();
    expect(totals.totalCents).toBe(totals.subtotalCents);
    expect(totals.vatExempt).toBe(false);
  });

  it('adds shipping once the country is known', () => {
    const totals = calculateTotals(lines, { country: 'DE' });
    const shipping = calculateShipping(lines, 'eu');
    expect(totals.shipping).toEqual(shipping);
    expect(totals.totalCents).toBe(totals.subtotalCents + shipping.totalCents);
  });

  it('accepts a zone instead of a country', () => {
    expect(calculateTotals(lines, { zone: 'asia' }).shipping?.zone).toBe('asia');
  });

  it('keeps VAT outside the EU by default and removes it when configured as exempt', () => {
    const included = calculateTotals(lines, { country: 'US' });
    expect(included.vatExempt).toBe(false);
    expect(included.subtotalCents).toBe(143000);

    const exempt = calculateTotals(lines, { country: 'US', vatOutsideEU: 'exempt' });
    expect(exempt.vatExempt).toBe(true);
    expect(exempt.vatTotalCents).toBe(0);
    expect(exempt.subtotalCents).toBe(143000);

    // inside the EU the exemption never applies
    expect(calculateTotals(lines, { country: 'FR', vatOutsideEU: 'exempt' }).vatExempt).toBe(false);
  });

  it('handles an empty cart', () => {
    const totals = calculateTotals([], { country: 'IT' });
    expect(totals).toMatchObject({ itemsCount: 0, subtotalCents: 0, vat: [], vatTotalCents: 0, shipping: null, totalCents: 0 });
  });
});
