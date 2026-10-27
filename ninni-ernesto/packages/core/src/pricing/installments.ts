import { INSTALLMENTS, type InstallmentsConfig } from '../config/installments.ts';
import type { InstallmentPlan } from '../types.ts';
import { assertCents } from './vat.ts';

/**
 * Splits a total into equal installments (DEMO: display only).
 * Remainder cents go to the first installments, so the sum is always exact:
 * `calculateInstallments(100)` → amounts `[34, 33, 33]`.
 */
export function calculateInstallments(
  totalCents: number,
  options: Partial<Omit<InstallmentsConfig, 'providerLabel'>> = {},
): InstallmentPlan {
  assertCents(totalCents);
  const cfg = { ...INSTALLMENTS, ...options };
  const count = Math.max(1, Math.floor(cfg.count));
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  const amounts = Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
  const plan: InstallmentPlan = { eligible: true, count, amounts, intervalDays: cfg.intervalDays };
  if (!cfg.enabled) return { ...plan, eligible: false, reason: 'disabled' };
  if (totalCents < cfg.minCents) return { ...plan, eligible: false, reason: 'below-minimum' };
  if (totalCents > cfg.maxCents) return { ...plan, eligible: false, reason: 'above-maximum' };
  return plan;
}
