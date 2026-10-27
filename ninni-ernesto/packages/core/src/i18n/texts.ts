/**
 * Site texts from `siti/testi/{it,en,zh}.json` (written by the texts thread; keys in Italian, nested).
 * SERVER ONLY: importing this in a client script would ship ~120 KB of JSON to the browser.
 * Pass the strings a script needs with `pickStrings()` instead.
 */
import en from '../../../../testi/en.json' with { type: 'json' };
import it from '../../../../testi/it.json' with { type: 'json' };
import zh from '../../../../testi/zh.json' with { type: 'json' };
import type { Locale } from '../types.ts';
import type { Messages } from './translate.ts';

export const SITE_TEXTS: Record<Locale, Messages> = { it, en, zh };
