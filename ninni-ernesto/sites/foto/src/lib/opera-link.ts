/** Indirizzo della scheda di una foto: `/[lang]/[autore]/[slug]/` (ogni fotografo ha il suo catalogo). */
import type { Artwork } from '@ne/core/catalog';
import { href, type Locale } from './i18n';

export const hrefOpera = (lang: Locale, art: Pick<Artwork, 'slug' | 'author'>): string => href(lang, `/${art.author}/${art.slug}/`);

/** Catalogo di un fotografo. */
export const hrefCatalogo = (lang: Locale, autore: 'ninni' | 'ernesto' = 'ninni', vista?: 'stampe'): string =>
  href(lang, `/${autore}/${vista ? `?vista=${vista}` : ''}`);
