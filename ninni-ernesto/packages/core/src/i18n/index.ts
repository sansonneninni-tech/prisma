/**
 * i18n entry point (server side): `useTranslations(lang)` merges the site texts with the core fallbacks.
 * Pure helpers (formatting, routing) are also re-exported from `@ne/core`.
 */
import type { Locale } from '../types.ts';
import { CORE_MESSAGES } from './core-messages.ts';
import { SITE_TEXTS } from './texts.ts';
import { createTranslator, type Messages, type Translator } from './translate.ts';

export * from './config.ts';
export * from './format.ts';
export * from './routing.ts';
export * from './translate.ts';
export { CORE_MESSAGES } from './core-messages.ts';
export { SITE_TEXTS } from './texts.ts';
export type { Locale } from '../types.ts';

const cache = new Map<Locale, Translator>();

/**
 * Translator for a language: site texts first, then core fallbacks, then Italian.
 * `extra` lets a site add or override texts (e.g. site-specific strings) without touching `testi/`.
 */
export function useTranslations(lang: Locale, extra?: Partial<Record<Locale, Messages>>): Translator {
  if (!extra) {
    const cached = cache.get(lang);
    if (cached) return cached;
  }
  const layers = extra ? [extra, SITE_TEXTS, CORE_MESSAGES] : [SITE_TEXTS, CORE_MESSAGES];
  const t = createTranslator(lang, layers);
  if (!extra) cache.set(lang, t);
  return t;
}
