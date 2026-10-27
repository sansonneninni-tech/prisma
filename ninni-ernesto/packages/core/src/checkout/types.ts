import type { CartLine, CartTotals, InstallmentPlan, Locale } from '../types.ts';

export const CHECKOUT_STEPS = ['details', 'shipping', 'payment', 'confirmation'] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

/** Customer + delivery address (step "I tuoi dati"). */
export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  postalCode: string;
  city: string;
  province: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  notes: string;
  wantsInvoice: boolean;
  taxCode: string;
  sdiOrPec: string;
}

/** Step "Spedizione": gift options (the shipping cost itself depends only on the country). */
export interface ShippingDetails {
  isGift: boolean;
  giftMessage: string;
}

export type PaymentMethod = 'card' | 'installments';

export interface CardInput {
  number: string;
  /** `MM/AA` */
  expiry: string;
  cvc: string;
  holder: string;
}

export interface Order {
  /** e.g. `IP-DEMO-2610-7K3F9Q` */
  number: string;
  createdAt: string;
  lang: Locale;
  /** Always true until a real provider is plugged in. */
  isDemo: boolean;
  customer: CustomerDetails;
  shipping: ShippingDetails;
  lines: CartLine[];
  totals: CartTotals;
  payment: {
    providerId: string;
    method: PaymentMethod;
    paymentId: string;
    last4?: string;
    installments?: InstallmentPlan;
  };
}
