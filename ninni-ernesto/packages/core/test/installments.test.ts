import { describe, expect, it } from 'vitest';
import { INSTALLMENTS } from '../src/config/installments.ts';
import { calculateInstallments } from '../src/pricing/installments.ts';

describe('calculateInstallments', () => {
  it('splits into 3 equal installments', () => {
    const plan = calculateInstallments(360000);
    expect(plan).toMatchObject({ eligible: true, count: 3, amounts: [120000, 120000, 120000], intervalDays: 30 });
  });

  it('puts the remainder cents on the first installments and always sums exactly', () => {
    expect(calculateInstallments(350000).amounts).toEqual([116667, 116667, 116666]);
    for (const total of [5000, 5001, 5002, 10980, 1234567]) {
      const plan = calculateInstallments(total);
      expect(plan.amounts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(Math.max(...plan.amounts) - Math.min(...plan.amounts)).toBeLessThanOrEqual(1);
    }
  });

  it('respects minimum and maximum', () => {
    expect(calculateInstallments(INSTALLMENTS.minCents - 1)).toMatchObject({ eligible: false, reason: 'below-minimum' });
    expect(calculateInstallments(INSTALLMENTS.minCents).eligible).toBe(true);
    expect(calculateInstallments(INSTALLMENTS.maxCents + 1)).toMatchObject({ eligible: false, reason: 'above-maximum' });
  });

  it('supports other counts and can be disabled', () => {
    expect(calculateInstallments(10000, { count: 4 }).amounts).toEqual([2500, 2500, 2500, 2500]);
    expect(calculateInstallments(10000, { enabled: false })).toMatchObject({ eligible: false, reason: 'disabled' });
  });

  it('rejects invalid totals', () => {
    expect(() => calculateInstallments(-5)).toThrow();
    expect(() => calculateInstallments(12.5)).toThrow();
  });
});
