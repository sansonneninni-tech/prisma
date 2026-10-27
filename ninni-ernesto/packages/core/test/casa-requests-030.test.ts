/**
 * Regression tests for the requests of 19/10 in direzioni/casa/richieste_core.md (see CHANGELOG.md, 0.3.0).
 */
import { describe, expect, it, vi } from 'vitest';
import { TESTI_AR } from '../src/ar/index.ts';
import { artworkAlt, getArtwork, getComingSoon, getPrintOptions, getProposals, toPrintCartProduct } from '../src/catalog/index.ts';
import { INSTALLMENTS } from '../src/config/installments.ts';
import { canvasPrintPacking, MAX_PRINT_QUANTITY } from '../src/config/prints.ts';
import { PREPARATION_BUSINESS_DAYS, preparationDays } from '../src/config/shipping.ts';
import { describeLine } from '../src/email/order-email.ts';
import { CORE_MESSAGES } from '../src/i18n/core-messages.ts';
import { formatDate, formatDateRange, LOCALE_TAGS, sep, SITE_TEXTS, useTranslations } from '../src/i18n/index.ts';
import { groupedErrorFields } from '../src/ui/dom.ts';
import { line, print } from './helpers.ts';

const NB = ' ';
const WJ = '⁠';

describe('one maximum for identical prints (5)', () => {
  it('is used by maxQuantityFor, addToCart and setQuantity', async () => {
    vi.resetModules();
    const cart = await import('../src/cart/store.ts');
    expect(MAX_PRINT_QUANTITY).toBe(5);
    expect(cart.maxQuantityFor('print')).toBe(5);
    const r = cart.addToCart(print('10', 13420), 9);
    expect(r.ok && r.line.quantity).toBe(5);
    cart.setQuantity(cart.$cart.get()[0]!.key, 8);
    expect(cart.$cart.get()[0]?.quantity).toBe(5);
  });
});

describe('Scalapay and preparation times in the common texts', () => {
  it('has no Klarna and no [N] for the preparation times', () => {
    expect(INSTALLMENTS.providerLabel).toBe('Scalapay');
    for (const lang of ['it', 'en', 'zh'] as const) {
      expect(JSON.stringify(SITE_TEXTS[lang])).not.toContain('Klarna');
      const t = useTranslations(lang);
      for (const key of ['etichette.tempi_originale', 'etichette.tempi_stampa', 'email_conferma.tempi_testo', 'legale.spedizioni.preparazione']) {
        expect(t(key)).not.toContain('[');
      }
      expect(t('etichette.rate', { importo: 'x' })).toContain('Scalapay');
    }
    expect(useTranslations('it')('etichette.tempi_originale')).toContain('5 giorni');
    expect(useTranslations('it')('etichette.tempi_stampa')).toContain('3 giorni');
  });

  it('keeps 5 business days for originals, 3 for prints; an order waits for the longest', () => {
    expect(PREPARATION_BUSINESS_DAYS).toEqual({ original: 5, print: 3 });
    expect(preparationDays([{ kind: 'print' }])).toBe(3);
    expect(preparationDays([{ kind: 'print' }, { kind: 'original' }])).toBe(5);
  });
});

describe('American English and 您 for every site', () => {
  it('uses en-US and US dates', () => {
    expect(LOCALE_TAGS.en).toBe('en-US');
    expect(formatDate(new Date(2026, 9, 28), 'en')).toBe('October 28, 2026');
  });

  it('has no British spellings in the English texts', () => {
    const en = JSON.stringify(SITE_TEXTS.en) + JSON.stringify(CORE_MESSAGES.en);
    for (const word of ['colour', 'centre', 'instalment', 'working day', 'basket', 'postcode', 'catalogue', 'favourite', 'dispatch', '"Bag', ' bag']) {
      expect(en.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  it('has no 你 and no 购物袋 in the Chinese texts', () => {
    const zh = JSON.stringify(SITE_TEXTS.zh) + JSON.stringify(CORE_MESSAGES.zh) + JSON.stringify(TESTI_AR.zh);
    expect(zh).not.toContain('你');
    expect(zh).not.toContain('购物袋');
  });
});

describe('Chinese dates', () => {
  it('writes 月/日 by hand, also for ranges', () => {
    expect(formatDate(new Date(2026, 9, 28), 'zh', { day: 'numeric', month: 'short' })).toBe('10月28日');
    expect(formatDateRange(new Date(2026, 9, 28), new Date(2026, 9, 29), 'zh')).toBe('10月28日至29日');
    expect(formatDateRange(new Date(2026, 9, 28), new Date(2026, 10, 3), 'zh')).toBe('10月28日至11月3日');
    expect(formatDateRange(new Date(2026, 9, 28), new Date(2026, 9, 28), 'zh')).toBe('10月28日');
  });

  it('keeps other ranges on one line', () => {
    expect(formatDateRange(new Date(2026, 9, 28), new Date(2026, 9, 29), 'en', { day: 'numeric', month: 'short' })).toBe(`Oct${NB}28${WJ}–${WJ}29`);
    expect(formatDateRange(new Date(2026, 9, 28), new Date(2026, 10, 3), 'it', { day: 'numeric', month: 'short' })).toBe(`28${NB}ott${WJ}–${WJ}3${NB}nov`);
  });
});

describe('separators per language', () => {
  it('uses full-width punctuation in Chinese', () => {
    expect(sep('zh').dp).toBe('：');
    expect(sep('it').v).toBe(', ');
    expect(artworkAlt(getArtwork('04')!, 'it')).toBe('Dea Alea, dipinto di Isabella Pistillo');
  });
});

describe('measures in the order email', () => {
  it('never wrap between number and unit', () => {
    const t = useTranslations('it');
    expect(describeLine(line(print('10', 13420, '50x70', 'canvas')), t)).toBe(`Stampa 50${NB}×${NB}70${NB}cm · ${t('etichette.tela')}`);
    expect(describeLine(line(print('10', 13420, '50x70')), useTranslations('zh'))).toContain(`50${NB}×${NB}70${NB}厘米`);
  });
});

describe('print formats of the Dual Soul price list', () => {
  it('keeps 4 formats by default and offers 8 on request', () => {
    const art = getArtwork('08')!; // 70 × 100, portrait
    expect(getPrintOptions(art)?.formats.map((f) => f.id)).toEqual(['40x60', '50x70', '70x100', '100x150']);
    const all = getPrintOptions(art, { formats: 'all' })!;
    expect(all.formats.map((f) => f.id)).toEqual(['40x60', '50x70', '60x90', '70x100', '80x100', '90x120', '90x150', '100x150']);
    expect(all.formats.find((f) => f.id === '60x90')?.prices).toEqual({ paper: 15860, canvas: 31720 });
    expect(toPrintCartProduct(art, '90x120', 'canvas', 'it')?.unitPriceCents).toBe(63440);
  });

  it('tells stretcher or tube for canvas prints', () => {
    expect(canvasPrintPacking({ widthCm: 70, heightCm: 100 })).toBe('stretcher');
    expect(canvasPrintPacking({ widthCm: 80, heightCm: 100 })).toBe('tube');
    expect(canvasPrintPacking({ widthCm: 50, heightCm: 70 }, 'eu')).toBe('tube');
  });
});

describe('proposals and coming soon', () => {
  it('start from the same paintings as Casa and give indicative object sizes', () => {
    expect(getProposals().map((p) => p.original.id)).toEqual(['09', '25', '18', '21']);
    const sizes = Object.fromEntries(getComingSoon().map((c) => [c.id, c.indicativeDimensions]));
    expect(sizes['vasi']).toEqual({ widthCm: 22, heightCm: 32 });
    expect(sizes['candele-the-moon']).toEqual({ widthCm: 12, heightCm: 16 });
  });
});

describe('texts for components with their own translator', () => {
  it('has the AR texts under core.ar, so a site can override them', () => {
    expect(useTranslations('zh')('core.ar.bottone')).toBe(TESTI_AR.zh.bottone);
    expect(useTranslations('en', { en: { core: { ar: { bottone: 'See it at home' } } } })('core.ar.bottone')).toBe('See it at home');
  });
});

describe('grouped required fields in the error summary', () => {
  it('groups 2+ fields with the same error, off by default', () => {
    const errors = { email: 'errori.obbligatorio', phone: 'errori.obbligatorio', cvc: 'errori.cvc' };
    expect(groupedErrorFields(errors, undefined)).toEqual([]);
    expect(groupedErrorFields(errors, true)).toEqual(['email', 'phone']);
    expect(groupedErrorFields({ email: 'errori.obbligatorio' }, true)).toEqual([]);
    expect(useTranslations('it')('core.checkout.campi_da_compilare')).toBe('Campi da compilare');
  });
});
