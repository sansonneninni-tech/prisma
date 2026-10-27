import { describe, expect, it } from 'vitest';
import { calculateShipping } from '../src/pricing/shipping.ts';
import { calculateTotals } from '../src/pricing/totals.ts';
import { line, original, print } from './helpers.ts';

describe('calculateTotals', () => {
  const lines = [line(original('08', 350000)), line(print('10', 28060, '50x70', 'canvas'), 2)];

  it('sums gross prices and shows VAT per rate (VAT included, not added)', () => {
    const totals = calculateTotals(lines);
    expect(totals.itemsCount).toBe(3);
    expect(totals.subtotalCents).toBe(350000 + 2 * 28060);
    expect(totals.vat).toEqual([
      { kind: 'original', rate: 0.05, grossCents: 350000, netCents: 333333, vatCents: 16667 },
      { kind: 'print', rate: 0.22, grossCents: 56120, netCents: 46000, vatCents: 10120 },
    ]);
    expect(totals.vatTotalCents).toBe(16667 + 10120);
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
    expect(included.subtotalCents).toBe(406120);

    const exempt = calculateTotals(lines, { country: 'US', vatOutsideEU: 'exempt' });
    expect(exempt.vatExempt).toBe(true);
    expect(exempt.vatTotalCents).toBe(0);
    expect(exempt.subtotalCents).toBe(333333 + 46000);

    // inside the EU the exemption never applies
    expect(calculateTotals(lines, { country: 'FR', vatOutsideEU: 'exempt' }).vatExempt).toBe(false);
  });

  it('handles an empty cart', () => {
    const totals = calculateTotals([], { country: 'IT' });
    expect(totals).toMatchObject({ itemsCount: 0, subtotalCents: 0, vat: [], vatTotalCents: 0, shipping: null, totalCents: 0 });
  });
});
