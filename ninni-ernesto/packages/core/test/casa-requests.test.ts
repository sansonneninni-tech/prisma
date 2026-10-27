/**
 * Regression tests for the requests in direzioni/casa/richieste_core.md (see CHANGELOG.md, 0.2.0).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { misureAr, testiAr } from '../src/ar/index.ts';
import { getArtwork, getArtworkImage } from '../src/catalog/index.ts';
import { DemoPaymentProvider } from '../src/checkout/payment.ts';
import { checkoutErrorKey, DECLINED_NO_INSTALLMENTS_KEY } from '../src/checkout/store.ts';
import type { Order } from '../src/checkout/types.ts';
import { renderOrderEmail } from '../src/email/order-email.ts';
import { CORE_MESSAGES } from '../src/i18n/core-messages.ts';
import { formatDimensions, useTranslations } from '../src/i18n/index.ts';
import { calculateInstallments } from '../src/pricing/installments.ts';
import { calculateTotals } from '../src/pricing/totals.ts';
import { line, original } from './helpers.ts';

describe('Chinese: one unit form and 您 (0.3.0: 您 instead of 你)', () => {
  it('formatDimensions uses 厘米 in zh, like testi/zh.json', () => {
    expect(formatDimensions({ widthCm: 100, heightCm: 140 }, 'zh')).toBe('100\u00a0×\u00a0140\u00a0厘米');
    expect(formatDimensions({ widthCm: 100, heightCm: 140 }, 'it')).toBe('100\u00a0×\u00a0140\u00a0cm');
    expect(useTranslations('zh')('etichette.misure_valore', { base: 100, altezza: 140 })).toBe('100\u00a0×\u00a0140\u00a0厘米');
  });

  it('no 你 in the core texts', () => {
    const all = JSON.stringify(CORE_MESSAGES.zh) + JSON.stringify(testiAr('zh'));
    expect(all).not.toContain('你');
    expect(testiAr('zh').bottone).toContain('您');
  });
});

describe('artwork 26 frame', () => {
  it('has a public frame text and a separate internal note', () => {
    const two = getArtwork('26');
    expect(two?.frame).toBe('Tela con cornice');
    expect(two?.frameNote).toMatch(/foto/);
    expect(getArtwork('04')?.frameNote).toBeNull();
  });
});

describe('getArtworkImage fallback src', () => {
  it('respects width (2x) and keeps the original JPEG without width', () => {
    const full = getArtworkImage('04', 'canvas');
    const small = getArtworkImage('04', 'canvas', { width: 200 });
    expect(full.src).toMatch(/\.jpg$/);
    expect(small.src).not.toBe(full.src);
    const w = Number(small.src.match(/_(\d+)\.(?:webp|jpg)$/)?.[1]);
    expect(w).toBeGreaterThanOrEqual(400);
    expect(getArtworkImage('04', 'canvas', { width: 200, fallbackWidth: 'original' }).src).toBe(full.src);
  });
});

describe('declined card when instalments are not available', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sets formErrorDetail and checkoutErrorKey picks it only if the page has the string', async () => {
    vi.resetModules();
    const { createCheckout } = await import('../src/checkout/store.ts');
    const cart = await import('../src/cart/store.ts');
    cart.addToCart(original('01', 2_500_000)); // 25.000 € > instalments max
    expect(calculateInstallments(2_500_000).eligible).toBe(false);
    const checkout = createCheckout({ lang: 'it', provider: new DemoPaymentProvider({ delayMs: 0 }), persist: false });
    checkout.submitDetails({
      firstName: 'Anna', lastName: 'Rossi', email: 'anna@example.com', phone: '+39 333 1234567', address1: 'Via Roma 1',
      postalCode: '70121', city: 'Bari', province: 'BA', country: 'IT',
    });
    checkout.submitShipping({});
    await checkout.pay({ acceptTerms: true, card: { number: '4000000000000002', expiry: '12/40', cvc: '123', holder: 'A' } });
    const state = checkout.$state.get();
    expect(state.formError).toBe('errori.carta_rifiutata'); // unchanged for existing pages
    expect(state.formErrorDetail).toBe(DECLINED_NO_INSTALLMENTS_KEY);
    expect(checkoutErrorKey(state, useTranslations('it'))).toBe(DECLINED_NO_INSTALLMENTS_KEY);
    expect(checkoutErrorKey(state, { has: () => false })).toBe('errori.carta_rifiutata');
    expect(useTranslations('it')(DECLINED_NO_INSTALLMENTS_KEY)).not.toMatch(/rate/);
  });

  it('keeps the standard text when instalments are possible', () => {
    expect(checkoutErrorKey({ formError: 'errori.carta_rifiutata', formErrorDetail: null })).toBe('errori.carta_rifiutata');
    expect(checkoutErrorKey({ formError: null, formErrorDetail: DECLINED_NO_INSTALLMENTS_KEY })).toBeNull();
  });
});

describe('order email: payment method row can wrap', () => {
  it('has no nowrap on the method cell, keeps it on amounts', () => {
    const lines = [line(original('08', 350000))];
    const totals = calculateTotals(lines, { country: 'IT' });
    const order: Order = {
      number: 'IP-DEMO-2610-ABCDEF',
      createdAt: '2026-10-18T10:00:00.000Z',
      lang: 'it',
      isDemo: true,
      customer: {
        firstName: 'Anna', lastName: 'Rossi', email: 'anna@example.com', phone: '', address1: 'Via Roma 1', address2: '',
        postalCode: '70121', city: 'Bari', province: 'BA', country: 'IT', notes: '', wantsInvoice: false, taxCode: '', sdiOrPec: '',
      },
      shipping: { isGift: false, giftMessage: '' },
      lines,
      totals,
      payment: { providerId: 'demo', method: 'installments', paymentId: 'inst_demo_x', installments: calculateInstallments(totals.totalCents) },
    };
    const { html } = renderOrderEmail(order, { t: useTranslations('it') });
    const t = useTranslations('it');
    const methodRow = html.split('<tr>').find((r) => r.includes(t('email_conferma.riga_metodo')));
    expect(methodRow).toBeDefined();
    expect(methodRow).not.toContain('nowrap');
    const totalRow = html.split('<tr>').find((r) => r.includes(t('email_conferma.riga_totale')));
    expect(totalRow).toContain('white-space:nowrap');
  });
});

describe('misureAr', () => {
  it('reads the model sizes from assets/ar/index.json (frame included)', () => {
    expect(misureAr('09')).toMatchObject({ larghezzaCm: 90, altezzaCm: 90 });
    expect(misureAr(9)).toEqual(misureAr('09'));
    expect(getArtwork('09')?.dimensions).toEqual({ widthCm: 71, heightCm: 71 });
    expect(misureAr('99')).toBeNull();
  });
});
