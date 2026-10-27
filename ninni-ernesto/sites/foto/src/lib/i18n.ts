/**
 * Lingue di Galleria (solo server / frontmatter).
 * Usa @ne/core/i18n e aggiunge i testi propri del sito (src/i18n/galleria.*.json, chiavi `galleria.*`).
 * Ordine di ricerca: testi Galleria → testi comuni (siti/testi) → testi tecnici del core → italiano.
 */
import {
  useTranslations as coreTranslations,
  localizePath,
  switchLocalePath,
  alternateLinks,
  LOCALES,
  type Locale,
  type Translator,
} from '@ne/core/i18n';
import it from '../i18n/galleria.it.json' with { type: 'json' };
import en from '../i18n/galleria.en.json' with { type: 'json' };

export { LOCALES, localizePath, switchLocalePath, alternateLinks, type Locale, type Translator };

const TESTI = { it, en, zh: it } as const;

/** Valore di `<html lang>` (BCP 47, come LOCALE_TAGS del core ma con il cinese semplificato esplicito). */
export const HTML_LANG: Record<Locale, string> = { it: 'it-IT', en: 'en-GB', zh: 'zh-CN' };

/** Sigla nel selettore dell'header. */
export const LANG_LABEL: Record<Locale, string> = { it: 'IT', en: 'EN', zh: '中文' };
/** Nome completo (title dell'abbreviazione, lettori di schermo). */
export const LANG_NOME: Record<Locale, string> = { it: 'Italiano', en: 'English', zh: '简体中文' };
/** hreflang / lang dei link lingua. */
export const LANG_TAG: Record<Locale, string> = { it: 'it', en: 'en', zh: 'zh-Hans' };

const cache = new Map<Locale, Translator>();

/** Traduttore della lingua, con i testi di Galleria sopra quelli comuni. */
export function useT(lang: Locale): Translator {
  let t = cache.get(lang);
  if (!t) {
    t = coreTranslations(lang, TESTI);
    cache.set(lang, t);
  }
  return t;
}

/** Percorso del sito nella lingua data, sempre con la barra finale: `href('en', '/opere')` → `/en/opere/`. */
export function href(lang: Locale, path = '/'): string {
  const out = localizePath(path, lang);
  const i = out.search(/[?#]/);
  const p = i < 0 ? out : out.slice(0, i);
  const rest = i < 0 ? '' : out.slice(i);
  return (p.endsWith('/') ? p : `${p}/`) + rest;
}

/** La stessa pagina in un'altra lingua (barra finale compresa). */
export function hrefLingua(pathname: string, lang: Locale): string {
  const resto = pathname.replace(/^\/(it|en|zh)(?=\/|$)/, '').replace(/\.html$/, '').replace(/\/index$/, '/');
  return href(lang, resto || '/');
}

/** Lingua dal primo segmento del percorso (`/en/opere/` → `en`); italiano se manca. */
export function linguaDa(pathname: string): Locale {
  const seg = pathname.split('/').filter(Boolean)[0];
  return (LOCALES as readonly string[]).includes(seg ?? '') ? (seg as Locale) : 'it';
}
