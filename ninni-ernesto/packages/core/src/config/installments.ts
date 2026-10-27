/**
 * Installments ("3 rate senza interessi" with Scalapay) — DEMO ONLY: calculation and display.
 * No request is ever sent to a provider.
 */
export interface InstallmentsConfig {
  enabled: boolean;
  providerLabel: string;
  count: number;
  intervalDays: number;
  minCents: number;
  maxCents: number;
}

export const INSTALLMENTS: InstallmentsConfig = {
  enabled: true,
  /** Provider name to show (demo decision of 19/10/2026: Scalapay). */
  providerLabel: 'Scalapay',
  count: 3,
  intervalDays: 30,
  /** Minimum order total (cents). */
  minCents: 5000,
  /** Maximum order total (cents). Real providers cap lower: this is a demo value. */
  maxCents: 2_000_000,
};
