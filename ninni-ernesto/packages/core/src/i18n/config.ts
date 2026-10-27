import type { Locale } from '../types.ts';

export const LOCALES = ['it', 'en'] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = 'it';

/** BCP 47 tags used for `Intl` formatting and `<html lang>`. English is American (clients in New York), as in the texts. */
export const LOCALE_TAGS: Record<Locale, string> = {
  it: 'it-IT',
  en: 'en-US',
  zh: 'zh-CN',
};

/** Language names in their own language (for the language switcher). */
export const LOCALE_NAMES: Record<Locale, string> = {
  it: 'Italiano',
  en: 'English',
  zh: '中文',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Astro `i18n` config. Every URL has a language prefix (`/it/…`, `/en/…`, `/zh/…`).
 * The integration (`@ne/core/integration`) applies it automatically.
 */
export const astroI18nConfig = {
  defaultLocale: DEFAULT_LOCALE,
  locales: [...LOCALES],
  routing: {
    prefixDefaultLocale: true,
    redirectToDefaultLocale: false,
    fallbackType: 'redirect',
  },
} as const;
