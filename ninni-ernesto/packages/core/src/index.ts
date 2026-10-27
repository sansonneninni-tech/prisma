/**
 * @ne/core — isomorphic entry point (safe in the browser: no catalogue JSON, no site texts).
 *
 * Server-only data lives in `@ne/core/catalog` and `@ne/core/i18n`;
 * browser stores in `@ne/core/cart` and `@ne/core/checkout`.
 */
export type * from './types.ts';

// Pricing: VAT, shipping, installments, totals
export * from './pricing/index.ts';

// Pure i18n helpers (no texts)
export * from './i18n/config.ts';
export * from './i18n/format.ts';
export * from './i18n/routing.ts';
export { createTranslator, translatorFromStrings, interpolate, getPath, pickStrings } from './i18n/translate.ts';
export type { Translator, TranslateParams, Messages } from './i18n/translate.ts';

// Editable configuration tables
export * from './config/index.ts';

// Form validation
export * from './forms/index.ts';

// Email
export * from './email/index.ts';
