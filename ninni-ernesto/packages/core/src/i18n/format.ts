import type { Dimensions, Locale } from '../types.ts';
import { LOCALE_TAGS } from './config.ts';

export interface FormatPriceOptions {
  /** `'auto'` (default): no decimals for whole euros. `'always'`: always 2 decimals. */
  cents?: 'auto' | 'always';
}

const priceFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Formats euro cents for a language.
 * `formatPrice(350000, 'it')` → "3.500 €", `formatPrice(13420, 'en')` → "€134.20", `formatPrice(350000, 'zh')` → "€3,500".
 */
export function formatPrice(cents: number, lang: Locale, options: FormatPriceOptions = {}): string {
  const whole = cents % 100 === 0;
  const digits = options.cents === 'always' || !whole ? 2 : 0;
  const cacheKey = `${lang}:${digits}`;
  let formatter = priceFormatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE_TAGS[lang], {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      // Italian CLDR data does not group 4-digit numbers ("3500 €"): force "3.500 €".
      useGrouping: 'always',
    });
    priceFormatters.set(cacheKey, formatter);
  }
  return formatter.format(cents / 100);
}

/**
 * Unit label for centimetres per language. Chinese uses "厘米", the same form as
 * `etichette.cm` / `etichette.misure_valore` in testi/zh.json.
 */
export const CM_UNIT: Readonly<Record<Locale, string>> = { it: 'cm', en: 'cm', zh: '厘米' };

/** Non-breaking space (U+00A0): measures never wrap in the middle ("50 × 70 cm" stays on one line). */
export const NBSP = '\u00a0';

/**
 * "100 × 140 cm" (width × height); in Chinese "100 × 140 厘米". The spaces are non-breaking (`NBSP`).
 * With `inches: true` adds " (39.4 × 55.1 in)": the space before "(" is a normal one, so the inches can wrap.
 */
export function formatDimensions(dimensions: Dimensions, lang: Locale, options: { inches?: boolean } = {}): string {
  const nf = new Intl.NumberFormat(LOCALE_TAGS[lang], { maximumFractionDigits: 1 });
  const pair = (w: number, h: number, unit: string) => `${nf.format(w)}${NBSP}×${NBSP}${nf.format(h)}${NBSP}${unit}`;
  const cm = pair(dimensions.widthCm, dimensions.heightCm, CM_UNIT[lang] ?? 'cm');
  if (!options.inches) return cm;
  const inch = (v: number) => Math.round((v / 2.54) * 10) / 10;
  return `${cm} (${pair(inch(dimensions.widthCm), inch(dimensions.heightCm), 'in')})`;
}

/**
 * Punctuation the code puts between two texts (accessible names, alt, composed lines). Chinese uses full-width
 * marks and no spaces. `v` comma, `dp` colon, `p` full stop, `ap`/`ch` brackets, `pv` semicolon, `el` list ("、" in Chinese).
 */
export const SEPARATORS = {
  it: { v: ', ', dp: ': ', p: '. ', ap: ' (', ch: ')', pv: '; ', el: ', ' },
  en: { v: ', ', dp: ': ', p: '. ', ap: ' (', ch: ')', pv: '; ', el: ', ' },
  zh: { v: '，', dp: '：', p: '。', ap: '（', ch: '）', pv: '；', el: '、' },
} as const satisfies Record<Locale, Record<string, string>>;

export const sep = (lang: Locale) => SEPARATORS[lang] ?? SEPARATORS.it;

/** Localised country name from an ISO code, e.g. `countryName('DE', 'it')` → "Germania". */
export function countryName(code: string, lang: Locale): string {
  try {
    return new Intl.DisplayNames([LOCALE_TAGS[lang]], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Chinese year/month/day written by hand: with `month: 'short'` some engines give "10/28" instead of "10月28日". */
function zhDate(date: Date | number, o: Intl.DateTimeFormatOptions): string | null {
  if (Object.keys(o).some((k) => k !== 'year' && k !== 'month' && k !== 'day')) return null;
  const d = new Date(date);
  return `${o.year ? `${d.getFullYear()}年` : ''}${o.month ? `${d.getMonth() + 1}月` : ''}${o.day ? `${d.getDate()}日` : ''}` || null;
}

/** Localised date, e.g. "21 ottobre 2026", "October 21, 2026", "2026年10月21日". */
export function formatDate(date: Date | number, lang: Locale, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string {
  return (lang === 'zh' && zhDate(date, options)) || new Intl.DateTimeFormat(LOCALE_TAGS[lang], options).format(date);
}

/**
 * Date range on one line: "28–29 ottobre", "Oct 28–Nov 3", "10月28日至29日". The month is not repeated when it is the same;
 * dash without spaces, joined with word joiners, inner spaces non-breaking.
 */
export function formatDateRange(from: Date | number, to: Date | number, lang: Locale, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }): string {
  if (lang === 'zh') {
    const a = new Date(from);
    const b = new Date(to);
    const sameYear = a.getFullYear() === b.getFullYear();
    if (sameYear && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()) return formatDate(a, lang, options);
    const end = sameYear && a.getMonth() === b.getMonth() ? `${b.getDate()}日` : formatDate(b, lang, sameYear ? { month: options.month, day: options.day } : options);
    return `${formatDate(a, lang, options)}至${end}`;
  }
  const f = new Intl.DateTimeFormat(LOCALE_TAGS[lang], options);
  const a = new Date(from);
  const b = new Date(to);
  // formatRange only when the month is the same ("28–29 ottobre"); otherwise ICU may pad the day ("03 nov")
  let out = `${f.format(a)}–${f.format(b)}`;
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    try {
      out = f.formatRange(a, b);
    } catch {
      /* keep the plain version */
    }
  }
  return out.replace(/\s*[-–]\s*/g, '\u2060–\u2060').replace(/\s/g, NBSP);
}

/** Adds business days (Mon–Fri) to a date. Used for "Consegna stimata: {data_da}–{data_a}". */
export function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from.getTime());
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return date;
}

/** Percentage label for a VAT rate: `formatPercent(0.22, 'it')` → "22%". */
export function formatPercent(rate: number, lang: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[lang], { style: 'percent', maximumFractionDigits: 1 }).format(rate);
}
