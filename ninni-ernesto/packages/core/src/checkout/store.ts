/**
 * Checkout state machine: details → shipping → payment → confirmation.
 * Everything stays in the browser: the draft (no card data) in sessionStorage, the last order too
 * (for the email preview). Use it with the `CheckoutFlow` component or with your own markup.
 *
 *   const checkout = createCheckout({ lang: 'it' });
 *   checkout.$state.subscribe(render);
 *   checkout.submitDetails(new FormData(form));
 */
import { atom, type ReadableAtom } from 'nanostores';
import { $cart, $cartCountry, clearCart, setCartCountry } from '../cart/store.ts';
import { readJson, removeKey, writeJson } from '../cart/storage.ts';
import { ERR, type FieldErrors } from '../forms/validators.ts';
import { calculateInstallments } from '../pricing/installments.ts';
import { calculateTotals } from '../pricing/totals.ts';
import type { Locale } from '../types.ts';
import { DemoPaymentProvider, createOrderNumber, type PaymentProvider, type PaymentRequest } from './payment.ts';
import { CHECKOUT_STEPS, type CardInput, type CheckoutStep, type CustomerDetails, type Order, type PaymentMethod, type ShippingDetails } from './types.ts';
import { validateCustomer, validateShipping } from './validation.ts';

export const DRAFT_STORAGE_KEY = 'isa:checkout-draft:v1';
export const LAST_ORDER_STORAGE_KEY = 'isa:last-order:v1';

export interface CheckoutState {
  step: CheckoutStep;
  customer: Partial<CustomerDetails>;
  shipping: ShippingDetails;
  method: PaymentMethod;
  /** Field errors of the current step: field name → text key. */
  errors: Record<string, string>;
  /** General error (text key), e.g. card declined. */
  formError: string | null;
  /**
   * More specific text key for `formError`, when there is one. Today: the card was declined and instalments
   * are not available for this total → `core.checkout.carta_rifiutata_senza_rate` (the standard text suggests
   * instalments). Read it through `checkoutErrorKey(state, t)`, which falls back to `formError`.
   */
  formErrorDetail?: string | null;
  processing: boolean;
  order: Order | null;
}

/** Text key used when a card is declined and instalments are not an alternative (total outside the range). */
export const DECLINED_NO_INSTALLMENTS_KEY = 'core.checkout.carta_rifiutata_senza_rate';

/**
 * Text key to show for the general checkout error: `formErrorDetail` when the page has that string
 * (`t.has`), otherwise `formError`. Returns `null` when there is no error.
 *
 *   el.textContent = t(checkoutErrorKey(state, t) ?? '', { min, max });
 */
export function checkoutErrorKey(state: Pick<CheckoutState, 'formError' | 'formErrorDetail'>, t?: { has(key: string): boolean }): string | null {
  if (!state.formError) return null;
  const detail = state.formErrorDetail;
  if (detail && (!t || t.has(detail))) return detail;
  return state.formError;
}

export interface Checkout {
  readonly $state: ReadableAtom<CheckoutState>;
  readonly provider: PaymentProvider;
  submitDetails(input: Record<string, unknown> | FormData): boolean;
  submitShipping(input?: Record<string, unknown> | FormData): boolean;
  setMethod(method: PaymentMethod): void;
  pay(input: { card?: Partial<CardInput>; acceptTerms: boolean }): Promise<boolean>;
  /** Go back to a previous step (forward moves only through the submit functions). */
  goTo(step: CheckoutStep): void;
  /** Start over (keeps the customer details draft). */
  reset(): void;
}

export interface CheckoutOptions {
  lang: Locale;
  provider?: PaymentProvider;
  /** Persist the draft in sessionStorage (default true). */
  persist?: boolean;
}

interface Draft {
  customer: Partial<CustomerDetails>;
  shipping: ShippingDetails;
  method: PaymentMethod;
}

export function createCheckout(options: CheckoutOptions): Checkout {
  const provider = options.provider ?? new DemoPaymentProvider();
  const persist = options.persist ?? true;
  const draft = persist ? readJson<Draft>(DRAFT_STORAGE_KEY, 'session') : null;

  const initialCustomer: Partial<CustomerDetails> = draft?.customer ?? {};
  if (!initialCustomer.country && $cartCountry.get()) initialCustomer.country = $cartCountry.get() ?? undefined;

  const $state = atom<CheckoutState>({
    step: 'details',
    customer: initialCustomer,
    shipping: draft?.shipping ?? { isGift: false, giftMessage: '' },
    method: draft?.method ?? 'card',
    errors: {},
    formError: null,
    formErrorDetail: null,
    processing: false,
    order: null,
  });

  const update = (patch: Partial<CheckoutState>) => {
    const next = { ...$state.get(), ...patch };
    // A new general error without its own detail must not inherit the previous one.
    if ('formError' in patch && !('formErrorDetail' in patch)) next.formErrorDetail = null;
    $state.set(next);
    if (persist) writeJson(DRAFT_STORAGE_KEY, { customer: next.customer, shipping: next.shipping, method: next.method } satisfies Draft, 'session');
  };

  const stepIndex = (s: CheckoutStep) => CHECKOUT_STEPS.indexOf(s);

  return {
    $state,
    provider,

    submitDetails(input) {
      const result = validateCustomer(input);
      if (!result.valid) {
        update({ customer: result.data, errors: result.errors as Record<string, string>, formError: null });
        return false;
      }
      setCartCountry(result.data.country);
      update({ customer: result.data, errors: {}, formError: null, step: 'shipping' });
      return true;
    },

    submitShipping(input = {}) {
      const result = validateShipping(input);
      update({ shipping: result.data, errors: {}, formError: null, step: 'payment' });
      return true;
    },

    setMethod(method) {
      if (!provider.methods.includes(method)) return;
      update({ method, errors: {}, formError: null });
    },

    async pay({ card, acceptTerms }) {
      const state = $state.get();
      if (state.processing) return false;
      const lines = $cart.get();
      if (lines.length === 0) {
        update({ formError: 'core.checkout.carrello_vuoto' });
        return false;
      }
      const errors: FieldErrors<CardInput & { acceptTerms: boolean }> = {};
      if (!acceptTerms) errors.acceptTerms = ERR.terms;
      if (Object.keys(errors).length) {
        update({ errors: errors as Record<string, string>, formError: null });
        return false;
      }
      const customer = validateCustomer(state.customer as Record<string, unknown>);
      if (!customer.valid) {
        update({ step: 'details', errors: customer.errors as Record<string, string> });
        return false;
      }

      const totals = calculateTotals(lines, { country: customer.data.country });
      const number = createOrderNumber();
      const request: PaymentRequest = {
        orderNumber: number,
        amountCents: totals.totalCents,
        currency: 'EUR',
        method: state.method,
        customer: { email: customer.data.email, name: `${customer.data.firstName} ${customer.data.lastName}` },
      };

      update({ processing: true, errors: {}, formError: null });
      let result;
      try {
        result = await provider.pay(request, card);
      } catch {
        update({ processing: false, formError: ERR.generic });
        return false;
      }
      if (result.status === 'invalid') {
        update({ processing: false, errors: result.errors as Record<string, string> });
        return false;
      }
      if (result.status === 'failed') {
        const detail =
          result.errorKey === ERR.cardDeclined && !calculateInstallments(request.amountCents).eligible
            ? DECLINED_NO_INSTALLMENTS_KEY
            : null;
        update({ processing: false, formError: result.errorKey, formErrorDetail: detail });
        return false;
      }

      const payment: Order['payment'] = { providerId: provider.id, method: result.method, paymentId: result.paymentId };
      if (result.last4) payment.last4 = result.last4;
      if (result.installments) payment.installments = result.installments;
      const order: Order = {
        number,
        createdAt: new Date().toISOString(),
        lang: options.lang,
        isDemo: provider.isDemo,
        customer: customer.data,
        shipping: state.shipping,
        lines,
        totals,
        payment,
      };
      writeJson(LAST_ORDER_STORAGE_KEY, order, 'session');
      clearCart();
      update({ processing: false, order, step: 'confirmation' });
      return true;
    },

    goTo(step) {
      const current = $state.get().step;
      if (current === 'confirmation') return;
      if (stepIndex(step) < stepIndex(current)) update({ step, errors: {}, formError: null });
    },

    reset() {
      update({ step: 'details', errors: {}, formError: null, processing: false, order: null });
    },
  };
}

/** Last demo order of this tab (for the email preview page). */
export function getLastOrder(): Order | null {
  return readJson<Order>(LAST_ORDER_STORAGE_KEY, 'session');
}

export function clearCheckoutDraft(): void {
  removeKey(DRAFT_STORAGE_KEY, 'session');
}
