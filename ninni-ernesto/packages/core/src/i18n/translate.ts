import type { Locale } from '../types.ts';
import { DEFAULT_LOCALE } from './config.ts';

/** A nested texts dictionary, as in `testi/it.json`. */
export type Messages = { [key: string]: unknown };

export type TranslateParams = Record<string, string | number>;

export interface Translator {
  /** Text for a key (`'carrello.totale'`, `'proposte.set[0].nome'`) with `{variable}` interpolation. */
  (key: string, params?: TranslateParams): string;
  /** Raw value (array/object/string) for a key, or `undefined`. */
  raw<T = unknown>(key: string): T | undefined;
  /** True if the key exists in this language or in the fallback. */
  has(key: string): boolean;
  readonly lang: Locale;
}

/** Reads `a.b[0].c` from a nested object. */
export function getPath(source: unknown, key: string): unknown {
  const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let node: unknown = source;
  for (const part of parts) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** Replaces `{name}` placeholders. Unknown placeholders are left untouched (e.g. `[N]` notes stay visible). */
export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

/**
 * Builds a translator. Lookup order: each dictionary for `lang` in order, then the same for Italian, then the key itself.
 * `layers` is a list of per-language dictionaries, highest priority first (site texts, then core fallbacks).
 */
export function createTranslator(lang: Locale, layers: Partial<Record<Locale, Messages>>[]): Translator {
  const order: Locale[] = lang === DEFAULT_LOCALE ? [lang] : [lang, DEFAULT_LOCALE];
  const lookup = (key: string): unknown => {
    for (const l of order) {
      for (const layer of layers) {
        const value = getPath(layer[l], key);
        if (value !== undefined && value !== null) return value;
      }
    }
    return undefined;
  };
  const t = ((key: string, params?: TranslateParams) => {
    const value = lookup(key);
    if (typeof value === 'string') return interpolate(value, params);
    if (typeof value === 'number') return String(value);
    if (import.meta.env?.DEV) console.warn(`[i18n] missing text "${key}" (${lang})`);
    return key;
  }) as Translator;
  t.raw = <T,>(key: string) => lookup(key) as T | undefined;
  t.has = (key: string) => lookup(key) !== undefined;
  Object.defineProperty(t, 'lang', { value: lang, enumerable: true });
  return t;
}

/**
 * Flattens the given keys into a plain object, to pass translated strings to client scripts
 * through a `data-i18n` attribute: `pickStrings(t, ['carrello.totale'])` → `{ 'carrello.totale': 'Totale' }`.
 * Values keep their `{placeholders}`: interpolate them in the browser with `interpolate()`.
 */
export function pickStrings(t: Translator, keys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = t.raw(key);
    out[key] = typeof value === 'string' ? value : key;
  }
  return out;
}

/**
 * Translator over a flat `{ key: text }` map (the output of `pickStrings`), for client scripts:
 *   const t = translatorFromStrings('it', JSON.parse(el.dataset.i18n));
 */
export function translatorFromStrings(lang: Locale, strings: Record<string, string>): Translator {
  const t = ((key: string, params?: TranslateParams) => interpolate(strings[key] ?? key, params)) as Translator;
  t.raw = <T,>(key: string) => strings[key] as T | undefined;
  t.has = (key: string) => key in strings;
  Object.defineProperty(t, 'lang', { value: lang, enumerable: true });
  return t;
}
