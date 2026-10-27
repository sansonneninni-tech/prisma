/**
 * Voci di navigazione. Un solo posto per Indice, mappa e footer.
 * `path` senza lingua; `chiave` = testo in i18n/galleria.*.json.
 * CONTATTI SEGNAPOSTO: da sostituire con quelli veri prima di pubblicare.
 */
import { href, type Locale } from './i18n';

export interface Voce { chiave: string; path: string; /** voce attiva solo con questa vista (?vista=…) */ vista?: string }

/** Indice sul telefono: 4 voci giganti numerate. */
export const INDICE_PRINCIPALE: Voce[] = [
  { chiave: 'galleria.nav.ninni', path: '/ninni/' },
  { chiave: 'galleria.nav.ernesto', path: '/ernesto/' },
  { chiave: 'galleria.nav.carte', path: '/carte-e-cornici/' },
  { chiave: 'galleria.nav.chi_siamo', path: '/chi-siamo/' },
];

/** Indice: voci piccole sotto il filetto (anche nella riga sotto la mappa, su computer). */
export const INDICE_SECONDARIO: Voce[] = [
  { chiave: 'galleria.nav.stampe', path: '/ninni/?vista=stampe', vista: 'stampe' },
  { chiave: 'galleria.nav.prisma', path: 'https://prisma.example' },
  { chiave: 'galleria.nav.contatti', path: '/chi-siamo/#contatti' },
];

/** Riga di link sotto la mappa della home (da 768). */
export const MAPPA_RIGA: Voce[] = [INDICE_SECONDARIO[0]!, INDICE_PRINCIPALE[2]!, INDICE_PRINCIPALE[3]!, INDICE_SECONDARIO[1]!, INDICE_SECONDARIO[2]!];

export const INSTAGRAM = 'https://www.instagram.com/prisma.mov/';
export const FACEBOOK = '';
/** Segnaposto (risposta 1 e 16 di ninni): WhatsApp, email e modulo. */
export const EMAIL = 'ciao@ninnieernesto.example';
export const TELEFONO = '+39 000 000 0000';
export const WHATSAPP = 'https://wa.me/390000000000';
export const MAPPE = 'https://www.google.com/maps/search/?api=1&query=Puglia';
export const PRISMA = 'https://prisma.example';

/** Footer. */
export const FOOTER: Voce[] = [
  { chiave: 'galleria.footer.instagram', path: INSTAGRAM },
  { chiave: 'galleria.footer.spedizioni', path: '/info/#spedizioni' },
  { chiave: 'galleria.footer.privacy', path: '/info/#privacy' },
  { chiave: 'galleria.footer.note_legali', path: '/info/#note-legali' },
];
/** Indirizzo di una voce nella lingua (i link esterni restano come sono). */
export const hrefVoce = (lang: Locale, v: Voce) => (/^https?:/.test(v.path) ? v.path : href(lang, v.path));

/**
 * Stato della voce rispetto alla pagina: 'page' se è la pagina stessa, 'true' se è una sua sotto-pagina
 * (scheda opera → Opere), altrimenti undefined. Le voci con àncora (#contatti) non sono mai correnti.
 * La vista (?vista=stampe) si conosce solo nel browser: Header/Indice la correggono con uno script.
 */
export function corrente(pathname: string, lang: Locale, v: Voce): 'page' | 'true' | undefined {
  if (/^https?:|#/.test(v.path)) return undefined;
  const base = href(lang, v.path.split('?')[0]);
  const cur = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (v.vista) return undefined; // decide il browser
  if (cur === base) return 'page';
  return cur.startsWith(base) ? 'true' : undefined;
}
