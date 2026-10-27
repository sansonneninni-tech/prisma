import { describe, expect, it } from 'vitest';
import type { Order } from '../src/checkout/types.ts';
import { renderOrderEmail } from '../src/email/order-email.ts';
import { validateCommission, validateContact, validateWaitlist } from '../src/forms/forms.ts';
import { useTranslations } from '../src/i18n/index.ts';
import { calculateTotals } from '../src/pricing/totals.ts';
import { line, original, print } from './helpers.ts';

describe('forms', () => {
  it('validates a commission request (narrative, few required fields)', () => {
    const ok = validateCommission({ name: 'Anna', email: 'anna@example.com', message: 'Un quadro rosso per il soggiorno, sopra il divano.', privacy: 'on' });
    expect(ok.valid).toBe(true);
    const ko = validateCommission({ name: '', email: 'x', message: 'corto', privacy: false, photo: { name: 'a.pdf', size: 10, type: 'application/pdf' } });
    expect(ko.errors).toEqual({
      name: 'errori.obbligatorio',
      email: 'errori.email',
      message: 'errori.messaggio_breve',
      photo: 'errori.file_formato',
      privacy: 'errori.consenso',
    });
    const big = validateCommission({ name: 'A', email: 'a@b.it', message: 'x'.repeat(40), privacy: true, photo: { name: 'a.jpg', size: 11 * 1024 * 1024, type: 'image/jpeg' } });
    expect(big.errors.photo).toBe('errori.file_peso');
  });

  it('validates the contact form and the waiting list', () => {
    expect(validateContact({ name: 'A', email: 'a@b.it', topic: 'ordine', message: 'Dov\'è il mio ordine?', privacy: true }).valid).toBe(true);
    expect(validateContact({ name: 'A', email: 'a@b.it', topic: 'hack', message: 'Messaggio lungo abbastanza', privacy: true }).data.topic).toBe('altro');
    expect(validateWaitlist({ email: 'a@b.it', interests: ['vasi'] })).toMatchObject({ valid: true, data: { interests: ['vasi'] } });
    expect(validateWaitlist({ email: '' }).errors.email).toBe('errori.obbligatorio');
  });
});

describe('order email', () => {
  const lines = [line(original('08', 350000, { image: { src: '/assets/opere/08/x.webp', width: 400, height: 500 } })), line(print('10', 13420), 2)];
  const order: Order = {
    number: 'IP-DEMO-2610-ABCDEF',
    createdAt: '2026-10-18T10:00:00.000Z',
    lang: 'it',
    isDemo: true,
    customer: {
      firstName: 'Anna', lastName: 'Rossi <script>', email: 'anna@example.com', phone: '+39 333', address1: 'Via Roma 1', address2: '',
      postalCode: '70121', city: 'Bari', province: 'BA', country: 'IT', notes: '', wantsInvoice: false, taxCode: '', sdiOrPec: '',
    },
    shipping: { isGift: false, giftMessage: '' },
    lines,
    totals: calculateTotals(lines, { country: 'IT' }),
    payment: { providerId: 'demo', method: 'card', paymentId: 'pay_demo_x', last4: '4242' },
  };

  for (const lang of ['it', 'en', 'zh'] as const) {
    it(`renders in ${lang}`, () => {
      const email = renderOrderEmail({ ...order, lang }, { t: useTranslations(lang), theme: { brandName: 'Isabella Pistillo', accentColor: '#8a1c1c' }, baseUrl: 'https://example.netlify.app' });
      expect(email.subject).toContain('IP-DEMO-2610-ABCDEF');
      expect(email.html).toContain('<!DOCTYPE html>');
      expect(email.html).toContain('#8a1c1c');
      expect(email.html).toContain('https://example.netlify.app/');
      expect(email.html).not.toContain('<script>');
      expect(email.html).toContain('Rossi &lt;script&gt;');
      expect(email.text).toContain('4242');
    });
  }

  it('shows the VAT detail for both rates', () => {
    const { html } = renderOrderEmail(order, { t: useTranslations('it') });
    expect(html).toContain('IVA 5% su opere originali');
    expect(html).toContain('IVA 22% su stampe');
  });
});
