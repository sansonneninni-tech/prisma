/**
 * Payment abstraction. The demo uses `DemoPaymentProvider`; going live means writing a
 * `StripePaymentProvider implements PaymentProvider` (Payment Element + a server endpoint that
 * creates the PaymentIntent) and passing it to `createCheckout({ provider })`. Nothing else changes.
 */
import { calculateInstallments } from '../pricing/installments.ts';
import type { InstallmentPlan } from '../types.ts';
import { ERR, type FieldErrors } from '../forms/validators.ts';
import { validateCard } from './validation.ts';
import type { CardInput, PaymentMethod } from './types.ts';

export interface PaymentRequest {
  orderNumber: string;
  amountCents: number;
  currency: 'EUR';
  method: PaymentMethod;
  customer: { email: string; name: string };
}

export type PaymentResult =
  | { status: 'succeeded'; paymentId: string; method: PaymentMethod; last4?: string; installments?: InstallmentPlan }
  /** The card/fields are invalid: show errors next to the fields. */
  | { status: 'invalid'; errors: FieldErrors<CardInput> }
  /** Payment refused: show `errorKey` (a text key) as a general message. */
  | { status: 'failed'; errorKey: string };

export interface PaymentProvider {
  readonly id: string;
  /** True for fake providers: the UI shows the DEMO badge and test card hints. */
  readonly isDemo: boolean;
  readonly methods: readonly PaymentMethod[];
  /**
   * Optional: prepare the payment before the payment step is shown
   * (Stripe: create the PaymentIntent on the server and mount the Payment Element in `container`).
   */
  prepare?(request: PaymentRequest, container?: HTMLElement): Promise<void>;
  /** Performs the payment. `card` is only used by providers that collect card data themselves. */
  pay(request: PaymentRequest, card?: Partial<CardInput>): Promise<PaymentResult>;
}

/** Test cards understood by the demo provider. */
export const DEMO_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
} as const;

export interface DemoProviderOptions {
  /** Simulated processing time in ms (default 800). */
  delayMs?: number;
  now?: () => Date;
}

/**
 * Fake payments, entirely in the browser: no network request, no card data stored.
 * - `4242 4242 4242 4242` + any future date + any CVC → succeeded
 * - `4000 0000 0000 0002` → declined
 * - any other valid card → refused with "only the test card works in demo mode"
 * - installments → always succeeded (simulated plan)
 */
export class DemoPaymentProvider implements PaymentProvider {
  readonly id = 'demo';
  readonly isDemo = true;
  readonly methods = ['card', 'installments'] as const;
  readonly #delayMs: number;
  readonly #now: () => Date;

  constructor(options: DemoProviderOptions = {}) {
    this.#delayMs = options.delayMs ?? 800;
    this.#now = options.now ?? (() => new Date());
  }

  async pay(request: PaymentRequest, card?: Partial<CardInput>): Promise<PaymentResult> {
    if (request.method === 'installments') {
      const plan = calculateInstallments(request.amountCents);
      await this.#wait();
      if (!plan.eligible) return { status: 'failed', errorKey: 'core.checkout.rate_non_disponibili' };
      return { status: 'succeeded', paymentId: demoId('inst'), method: 'installments', installments: plan };
    }

    const check = validateCard(card ?? {}, this.#now());
    if (!check.valid) return { status: 'invalid', errors: check.errors };
    await this.#wait();
    const number = check.data.number;
    if (number === DEMO_CARDS.declined) return { status: 'failed', errorKey: ERR.cardDeclined };
    if (number !== DEMO_CARDS.success) return { status: 'invalid', errors: { number: ERR.cardDemoOnly } };
    return { status: 'succeeded', paymentId: demoId('pay'), method: 'card', last4: number.slice(-4) };
  }

  #wait(): Promise<void> {
    return this.#delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, this.#delayMs)) : Promise.resolve();
  }
}

function demoId(prefix: string): string {
  return `${prefix}_demo_${randomCode(12).toLowerCase()}`;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** Random code from an unambiguous alphabet (crypto when available). */
export function randomCode(length: number): string {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Fake order number: `NE-DEMO-YYMM-XXXXXX`. */
export function createOrderNumber(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `NE-DEMO-${yy}${mm}-${randomCode(6)}`;
}
