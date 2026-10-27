import { afterEach, describe, expect, it, vi } from 'vitest';
import { DemoPaymentProvider, createOrderNumber, type PaymentRequest } from '../src/checkout/payment.ts';
import { validateCard, validateCustomer } from '../src/checkout/validation.ts';
import { isFutureExpiry, luhn } from '../src/forms/validators.ts';
import { original, print } from './helpers.ts';

const validCustomer = {
  firstName: 'Anna',
  lastName: 'Rossi',
  email: 'anna@example.com',
  phone: '+39 333 1234567',
  address1: 'Via Roma 1',
  postalCode: '70121',
  city: 'Bari',
  country: 'IT',
};

describe('checkout validation', () => {
  it('accepts a complete customer', () => {
    const r = validateCustomer(validCustomer);
    expect(r.valid).toBe(true);
    expect(r.data.country).toBe('IT');
  });

  it('reports missing and wrong fields with text keys', () => {
    const r = validateCustomer({ ...validCustomer, firstName: ' ', email: 'anna@', postalCode: '7012', phone: 'abc' });
    expect(r.errors).toEqual({ firstName: 'errori.obbligatorio', email: 'errori.email', postalCode: 'errori.cap', phone: 'errori.telefono' });
  });

  it('checks the postal code generically outside Italy and refuses unknown countries', () => {
    expect(validateCustomer({ ...validCustomer, country: 'GB', postalCode: 'SW1A 1AA' }).valid).toBe(true);
    expect(validateCustomer({ ...validCustomer, country: 'ZZ' }).errors.country).toBe('errori.paese_non_servito');
  });

  it('requires a tax code when an invoice is requested', () => {
    expect(validateCustomer({ ...validCustomer, wantsInvoice: 'on' }).errors.taxCode).toBe('errori.obbligatorio');
  });

  it('validates card format', () => {
    expect(luhn('4242424242424242')).toBe(true);
    expect(luhn('4242424242424241')).toBe(false);
    const now = new Date(2026, 9, 18);
    expect(isFutureExpiry('10/26', now)).toBe(true);
    expect(isFutureExpiry('09/26', now)).toBe(false);
    expect(validateCard({ number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123', holder: 'A R' }, now).valid).toBe(true);
    expect(validateCard({ number: '1234', expiry: '01/20', cvc: '1', holder: '' }, now).errors).toEqual({
      number: 'errori.carta_numero',
      expiry: 'errori.carta_scadenza',
      cvc: 'errori.carta_cvc',
      holder: 'errori.obbligatorio',
    });
  });
});

describe('DemoPaymentProvider', () => {
  const provider = new DemoPaymentProvider({ delayMs: 0, now: () => new Date(2026, 9, 18) });
  const request: PaymentRequest = { orderNumber: 'X', amountCents: 350000, currency: 'EUR', method: 'card', customer: { email: 'a@b.it', name: 'A' } };
  const card = { expiry: '12/30', cvc: '123', holder: 'Anna Rossi' };

  it('accepts the test card 4242', async () => {
    expect(await provider.pay(request, { ...card, number: '4242 4242 4242 4242' })).toMatchObject({ status: 'succeeded', method: 'card', last4: '4242' });
  });

  it('declines 4000 0000 0000 0002', async () => {
    expect(await provider.pay(request, { ...card, number: '4000 0000 0000 0002' })).toEqual({ status: 'failed', errorKey: 'errori.carta_rifiutata' });
  });

  it('refuses real cards in demo mode', async () => {
    expect(await provider.pay(request, { ...card, number: '5555 5555 5555 4444' })).toEqual({ status: 'invalid', errors: { number: 'errori.carta_demo' } });
  });

  it('simulates installments without a card', async () => {
    const r = await provider.pay({ ...request, method: 'installments' });
    expect(r).toMatchObject({ status: 'succeeded', method: 'installments', installments: { count: 3, amounts: [116667, 116667, 116666] } });
  });

  it('creates fake order numbers', () => {
    expect(createOrderNumber(new Date(2026, 9, 18))).toMatch(/^IP-DEMO-2610-[A-Z2-9]{6}$/);
  });
});

describe('createCheckout', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('walks details → shipping → payment → confirmation and empties the cart', async () => {
    vi.resetModules();
    const { createCheckout, getLastOrder } = await import('../src/checkout/store.ts');
    const cart = await import('../src/cart/store.ts');
    cart.addToCart(original('08', 350000));
    cart.addToCart(print('10', 13420));

    const checkout = createCheckout({ lang: 'it', provider: new DemoPaymentProvider({ delayMs: 0 }), persist: false });
    expect(checkout.submitDetails({ ...validCustomer, email: 'bad' })).toBe(false);
    expect(checkout.$state.get().errors).toEqual({ email: 'errori.email' });
    expect(checkout.$state.get().step).toBe('details');

    expect(checkout.submitDetails(validCustomer)).toBe(true);
    expect(cart.$cartCountry.get()).toBe('IT');
    expect(checkout.$state.get().step).toBe('shipping');
    checkout.submitShipping({ isGift: 'on', giftMessage: 'Auguri' });
    expect(checkout.$state.get().step).toBe('payment');

    expect(await checkout.pay({ acceptTerms: false, card: {} })).toBe(false);
    expect(checkout.$state.get().errors).toEqual({ acceptTerms: 'errori.termini' });

    expect(await checkout.pay({ acceptTerms: true, card: { number: '4000000000000002', expiry: '12/40', cvc: '123', holder: 'A' } })).toBe(false);
    expect(checkout.$state.get().formError).toBe('errori.carta_rifiutata');

    const ok = await checkout.pay({ acceptTerms: true, card: { number: '4242424242424242', expiry: '12/40', cvc: '123', holder: 'A' } });
    expect(ok).toBe(true);
    const state = checkout.$state.get();
    expect(state.step).toBe('confirmation');
    expect(state.order?.isDemo).toBe(true);
    expect(state.order?.lines).toHaveLength(2);
    expect(state.order?.shipping).toEqual({ isGift: true, giftMessage: 'Auguri' });
    expect(state.order?.totals.shipping?.zone).toBe('italy');
    expect(cart.$cart.get()).toEqual([]);
    expect(getLastOrder()).toBeNull(); // no sessionStorage in node: stays in memory only

    checkout.goTo('details'); // not allowed after confirmation
    expect(checkout.$state.get().step).toBe('confirmation');
  });
});
