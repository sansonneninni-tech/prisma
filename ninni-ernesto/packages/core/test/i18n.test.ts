import { describe, expect, it } from 'vitest';
import {
  alternateLinks,
  detectPreferredLocale,
  formatDimensions,
  formatPrice,
  getLocaleFromUrl,
  localizePath,
  pickStrings,
  switchLocalePath,
  translatorFromStrings,
  useTranslations,
} from '../src/i18n/index.ts';

describe('i18n', () => {
  it('formats euro prices per language', () => {
    expect(formatPrice(350000, 'it')).toBe('3.500 €');
    expect(formatPrice(13420, 'it')).toBe('134,20 €');
    expect(formatPrice(350000, 'en')).toBe('€3,500');
    expect(formatPrice(13420, 'en')).toBe('€134.20');
    expect(formatPrice(350000, 'zh')).toBe('€3,500');
    expect(formatPrice(350000, 'it', { cents: 'always' })).toBe('3.500,00 €');
  });

  it('formats dimensions', () => {
    expect(formatDimensions({ widthCm: 100, heightCm: 140 }, 'it')).toBe('100\u00a0×\u00a0140\u00a0cm');
    expect(formatDimensions({ widthCm: 100, heightCm: 140 }, 'en', { inches: true })).toBe('100\u00a0×\u00a0140\u00a0cm (39.4\u00a0×\u00a055.1\u00a0in)');
  });

  it('translates from the site texts with variables and array indexes', () => {
    const it_ = useTranslations('it');
    const en = useTranslations('en');
    expect(it_('carrello.totale')).toBe('Totale');
    expect(en('carrello.aggiunto', { titolo: 'Strong' })).toContain('Strong');
    expect(it_('proposte.set[0].id')).toBe('rosso-notte');
    expect(Array.isArray(it_.raw('checkout.prossimi_passi'))).toBe(true);
  });

  it('falls back to core texts, then Italian, then the key', () => {
    expect(useTranslations('zh')('core.zone.asia')).toBe('中国及亚洲');
    expect(useTranslations('en', { it: { solo: { it: 'Solo italiano' } } })('solo.it')).toBe('Solo italiano');
    expect(useTranslations('en')('non.esiste')).toBe('non.esiste');
  });

  it('lets a site override texts', () => {
    const t = useTranslations('en', { en: { carrello: { totale: 'Grand total' } } });
    expect(t('carrello.totale')).toBe('Grand total');
  });

  it('passes strings to the browser', () => {
    const strings = pickStrings(useTranslations('it'), ['carrello.aggiunto']);
    const t = translatorFromStrings('it', strings);
    expect(t('carrello.aggiunto', { titolo: 'Strong' })).toBe('Strong è nel carrello.');
  });

  it('builds localised paths', () => {
    expect(localizePath('/opere/dea-alea', 'en')).toBe('/en/opere/dea-alea');
    expect(localizePath('/', 'zh')).toBe('/zh/');
    expect(localizePath('/it/opere?x=1#a', 'en')).toBe('/en/opere?x=1#a');
    expect(switchLocalePath('/en/opere/x', 'zh')).toBe('/zh/opere/x');
    expect(switchLocalePath('/en', 'it')).toBe('/it/');
    expect(localizePath('/opere/x', 'en', { trailingSlash: 'always' })).toBe('/en/opere/x/');
    expect(localizePath('/opere/x/?a=1', 'en', { trailingSlash: 'never' })).toBe('/en/opere/x?a=1');
    expect(localizePath('/opere', 'it', { base: '/demo/', trailingSlash: 'always' })).toBe('/demo/it/opere/');
    expect(localizePath('/file.pdf', 'it', { trailingSlash: 'always' })).toBe('/it/file.pdf');
    expect(getLocaleFromUrl(new URL('https://x.it/zh/opere'))).toBe('zh');
    expect(getLocaleFromUrl('/opere')).toBe('it');
    expect(alternateLinks('/it/opere', 'https://casa.netlify.app').map((l) => l.hreflang)).toEqual(['it', 'en', 'zh-Hans', 'x-default']);
  });

  it('detects the preferred language', () => {
    expect(detectPreferredLocale(['zh-CN', 'en'])).toBe('zh');
    expect(detectPreferredLocale(['de-DE', 'en-US'])).toBe('en');
    expect(detectPreferredLocale(['fr'])).toBe('it');
  });
});
