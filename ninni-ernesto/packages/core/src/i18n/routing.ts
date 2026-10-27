import type { Locale } from '../types.ts';
import { DEFAULT_LOCALE, LOCALES, isLocale } from './config.ts';

/** `getStaticPaths()` helper for pages under `src/pages/[lang]/`. */
export function localeStaticPaths(): { params: { lang: Locale } }[] {
  return LOCALES.map((lang) => ({ params: { lang } }));
}

/** Reads the language from a URL or pathname (`/en/opere` → `en`); falls back to Italian. */
export function getLocaleFromUrl(url: URL | string): Locale {
  const pathname = typeof url === 'string' ? url : url.pathname;
  const first = pathname.split('/').filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

/** Removes the language prefix: `/en/opere/x` → `/opere/x`. */
export function stripLocale(pathname: string): string {
  const parts = pathname.split('/');
  if (isLocale(parts[1])) parts.splice(1, 1);
  const out = parts.join('/');
  return out === '' ? '/' : out;
}

export type TrailingSlash = 'always' | 'never' | 'ignore';

/**
 * Astro `trailingSlash` setting of the site, injected by the integration
 * (`PUBLIC_ISA_TRAILING_SLASH`). With `'always'` generated links end with `/`, with `'never'` they do not.
 */
export const TRAILING_SLASH: TrailingSlash = (() => {
  const value = (import.meta.env as Record<string, string | undefined> | undefined)?.PUBLIC_ISA_TRAILING_SLASH;
  return value === 'always' || value === 'never' ? value : 'ignore';
})();

export interface PathOptions {
  /** Astro `base` if the site is not served at the domain root. */
  base?: string;
  /** Defaults to the site setting (`TRAILING_SLASH`). */
  trailingSlash?: TrailingSlash;
}

function applyTrailingSlash(pathname: string, mode: TrailingSlash): string {
  if (mode === 'ignore' || /\.[a-z0-9]+$/i.test(pathname)) return pathname;
  if (mode === 'always') return pathname.endsWith('/') ? pathname : `${pathname}/`;
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * Adds the language prefix to a site path: `localizePath('/opere', 'en')` → `/en/opere`
 * (`/en/opere/` when the site uses `trailingSlash: 'always'`).
 * Keeps query string and hash. Paths that already have a prefix are re-prefixed.
 * The third argument can be the Astro `base` (string) or `{ base, trailingSlash }`.
 */
export function localizePath(path: string, lang: Locale, options: string | PathOptions = {}): string {
  const { base = '', trailingSlash = TRAILING_SLASH } = typeof options === 'string' ? { base: options } : options;
  const match = /^([^?#]*)(.*)$/.exec(path);
  const pathname = match?.[1] ?? path;
  const rest = match?.[2] ?? '';
  const clean = stripLocale(pathname.startsWith('/') ? pathname : `/${pathname}`);
  const joined = clean === '/' ? `/${lang}/` : `/${lang}${clean}`;
  const prefix = base.replace(/\/$/, '');
  return `${prefix}${applyTrailingSlash(joined, trailingSlash)}${rest}`;
}

/** Same page in another language: `switchLocalePath('/en/opere/x', 'zh')` → `/zh/opere/x`. */
export function switchLocalePath(currentPathname: string, lang: Locale, options: string | PathOptions = {}): string {
  const opts = typeof options === 'string' ? { base: options } : options;
  const prefix = (opts.base ?? '').replace(/\/$/, '');
  const withoutBase = prefix && currentPathname.startsWith(prefix) ? currentPathname.slice(prefix.length) || '/' : currentPathname;
  return localizePath(withoutBase, lang, opts);
}

/** `<link rel="alternate" hreflang>` data for the current page (plus `x-default` → Italian). */
export function alternateLinks(currentPathname: string, site: URL | string | undefined, options: string | PathOptions = {}): { hreflang: string; href: string }[] {
  const toHref = (lang: Locale) => {
    const path = switchLocalePath(currentPathname, lang, options);
    return site ? new URL(path, site).href : path;
  };
  return [
    ...LOCALES.map((lang) => ({ hreflang: lang === 'zh' ? 'zh-Hans' : lang, href: toHref(lang) })),
    { hreflang: 'x-default', href: toHref(DEFAULT_LOCALE) },
  ];
}

/** Picks the best site language from `navigator.languages` (used by `LocaleRedirect`). */
export function detectPreferredLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const primary = tag.toLowerCase().split('-')[0];
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
