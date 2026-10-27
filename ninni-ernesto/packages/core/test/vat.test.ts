import { describe, expect, it } from 'vitest';
import { VAT_RATES } from '../src/config/vat.ts';
import { assertCents, splitVat, vatRateFor } from '../src/pricing/vat.ts';

describe('VAT', () => {
  it('uses no VAT (flat-rate regime: prices are final, VAT is never shown)', () => {
    expect(vatRateFor('original')).toBe(0);
    expect(vatRateFor('print')).toBe(0);
    expect(VAT_RATES).toEqual({ original: 0, print: 0 });
  });

  it('splits a VAT-inclusive price into net + VAT', () => {
    expect(splitVat(10500, 0.05)).toEqual({ netCents: 10000, vatCents: 500 });
    expect(splitVat(12200, 0.22)).toEqual({ netCents: 10000, vatCents: 2200 });
  });

  it('matches the real print price list (109,80 € = 90 € + 22%)', () => {
    expect(splitVat(10980, 0.22)).toEqual({ netCents: 9000, vatCents: 1980 });
  });

  it('rounds to the cent and always adds up', () => {
    for (const gross of [1, 99, 350000, 700000, 1234567, 13420]) {
      for (const rate of [0.05, 0.22]) {
        const { netCents, vatCents } = splitVat(gross, rate);
        expect(Number.isInteger(netCents)).toBe(true);
        expect(netCents + vatCents).toBe(gross);
      }
    }
    // 7.000 € original: 7000 / 1.05 = 6666.666… → net 6666,67, VAT 333,33
    expect(splitVat(700000, 0.05)).toEqual({ netCents: 666667, vatCents: 33333 });
  });

  it('rejects non-integer or negative amounts', () => {
    expect(() => assertCents(10.5)).toThrow(RangeError);
    expect(() => assertCents(-1)).toThrow(RangeError);
    expect(() => splitVat(0.5, 0.05)).toThrow(RangeError);
  });
});
