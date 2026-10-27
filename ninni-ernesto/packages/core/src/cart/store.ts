/**
 * Cart store (nanostores). Works in any island or plain `<script>`:
 *
 *   import { $cartCount, addToCart } from '@ne/core/cart';
 *   $cartCount.subscribe((n) => (badge.textContent = String(n)));
 *
 * - Persisted in localStorage (`isa:cart:v1`), synced across tabs, in-memory fallback.
 * - Originals: max quantity 1. Prints: one line per format + material, max `MAX_PRINT_QUANTITY`.
 * - Language-agnostic: announcements are events; `CartLiveRegion` turns them into text.
 */
import { atom, computed } from 'nanostores';
import { MAX_PRINT_QUANTITY } from '../config/prints.ts';
import { calculateTotals } from '../pricing/totals.ts';
import type { CartLine, CartProduct, CartTotals } from '../types.ts';
import { readJson, removeKey, writeJson } from './storage.ts';

export const CART_STORAGE_KEY = 'ne:cart:v1';
export const COUNTRY_STORAGE_KEY = 'ne:cart-country:v1';

export type CartEvent =
  | { type: 'added'; title: string; key: string; quantity: number }
  | { type: 'removed'; title: string; key: string }
  | { type: 'quantity'; title: string; key: string; quantity: number }
  | { type: 'max-quantity'; title: string; key: string; kind: CartLine['kind'] }
  | { type: 'cleared' };

export type AddResult =
  | { ok: true; line: CartLine }
  | { ok: false; reason: 'max-quantity' | 'invalid-product'; line?: CartLine };

/** Line key: `original:04`, `print:04:50x70:paper`. */
export function lineKey(product: Pick<CartProduct, 'kind' | 'artworkId' | 'print'>): string {
  return product.kind === 'original'
    ? `original:${product.artworkId}`
    : `print:${product.artworkId}:${product.print?.formatId ?? '?'}:${product.print?.material ?? '?'}:${product.print?.frame ?? 'none'}`;
}

export function maxQuantityFor(kind: CartLine['kind']): number {
  return kind === 'original' ? 1 : MAX_PRINT_QUANTITY;
}

/** Checks a product/line shape (data comes from HTML attributes and localStorage: never trust it blindly). */
export function isValidProduct(value: unknown): value is CartProduct {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<CartProduct>;
  return (
    (p.kind === 'original' || (p.kind === 'print' && !!p.print && typeof p.print.formatId === 'string')) &&
    typeof p.artworkId === 'string' &&
    typeof p.title === 'string' &&
    typeof p.slug === 'string' &&
    Number.isInteger(p.unitPriceCents) &&
    (p.unitPriceCents ?? -1) >= 0
  );
}

function sanitize(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const lines: CartLine[] = [];
  for (const item of raw) {
    if (!isValidProduct(item)) continue;
    const line = item as CartLine;
    const key = lineKey(line);
    if (seen.has(key)) continue;
    seen.add(key);
    const quantity = Math.min(Math.max(1, Math.floor(Number(line.quantity) || 1)), maxQuantityFor(line.kind));
    lines.push({ ...line, key, quantity, addedAt: Number(line.addedAt) || Date.now() });
  }
  return lines;
}

/** Cart lines. Read with `$cart.get()`, never mutate the array: use the actions below. */
export const $cart = atom<CartLine[]>(sanitize(readJson(CART_STORAGE_KEY)));

/** Destination country (ISO code) chosen in the cart; drives shipping. `null` = not chosen yet. */
export const $cartCountry = atom<string | null>(readJson<string>(COUNTRY_STORAGE_KEY));

/** Last cart event, for `aria-live` announcements and toasts. */
export const $cartEvent = atom<(CartEvent & { at: number }) | null>(null);

export const $cartCount = computed($cart, (lines) => lines.reduce((n, l) => n + l.quantity, 0));

export const $cartTotals = computed([$cart, $cartCountry], (lines, country): CartTotals => calculateTotals(lines, { country }));

$cart.listen((lines) => {
  if (lines.length === 0) removeKey(CART_STORAGE_KEY);
  else writeJson(CART_STORAGE_KEY, lines);
});
$cartCountry.listen((country) => {
  if (country) writeJson(COUNTRY_STORAGE_KEY, country);
  else removeKey(COUNTRY_STORAGE_KEY);
});

// Keep tabs in sync.
if (typeof window !== 'undefined') {
  try {
    window.addEventListener('storage', (event) => {
      if (event.key === CART_STORAGE_KEY) $cart.set(sanitize(readJson(CART_STORAGE_KEY)));
      if (event.key === COUNTRY_STORAGE_KEY) $cartCountry.set(readJson<string>(COUNTRY_STORAGE_KEY));
    });
  } catch {
    /* ignore */
  }
}

function emit(event: CartEvent): void {
  $cartEvent.set({ ...event, at: Date.now() });
}

/** Adds a product. Originals can be added once; prints add up to `MAX_PRINT_QUANTITY`. */
export function addToCart(product: CartProduct, quantity = 1): AddResult {
  if (!isValidProduct(product)) return { ok: false, reason: 'invalid-product' };
  const key = lineKey(product);
  const lines = $cart.get();
  const existing = lines.find((l) => l.key === key);
  const max = maxQuantityFor(product.kind);
  const wanted = Math.max(1, Math.floor(quantity));

  if (existing) {
    if (existing.quantity >= max) {
      emit({ type: 'max-quantity', title: existing.title, key, kind: existing.kind });
      return { ok: false, reason: 'max-quantity', line: existing };
    }
    const updated: CartLine = { ...existing, quantity: Math.min(max, existing.quantity + wanted) };
    $cart.set(lines.map((l) => (l.key === key ? updated : l)));
    emit({ type: 'added', title: updated.title, key, quantity: updated.quantity });
    return { ok: true, line: updated };
  }

  const line: CartLine = { ...product, key, quantity: Math.min(max, wanted), addedAt: Date.now() };
  $cart.set([...lines, line]);
  emit({ type: 'added', title: line.title, key, quantity: line.quantity });
  return { ok: true, line };
}

/** Sets a line quantity (clamped to the allowed range); 0 removes the line. */
export function setQuantity(key: string, quantity: number): void {
  const lines = $cart.get();
  const line = lines.find((l) => l.key === key);
  if (!line) return;
  const q = Math.floor(quantity);
  if (q <= 0) {
    removeFromCart(key);
    return;
  }
  const max = maxQuantityFor(line.kind);
  if (q > max) emit({ type: 'max-quantity', title: line.title, key, kind: line.kind });
  const clamped = Math.min(max, q);
  if (clamped === line.quantity) return;
  $cart.set(lines.map((l) => (l.key === key ? { ...l, quantity: clamped } : l)));
  emit({ type: 'quantity', title: line.title, key, quantity: clamped });
}

export function removeFromCart(key: string): void {
  const lines = $cart.get();
  const line = lines.find((l) => l.key === key);
  if (!line) return;
  $cart.set(lines.filter((l) => l.key !== key));
  emit({ type: 'removed', title: line.title, key });
}

export function clearCart(): void {
  $cart.set([]);
  emit({ type: 'cleared' });
}

export function setCartCountry(country: string | null): void {
  $cartCountry.set(country ? country.toUpperCase() : null);
}

/** True if the original/print variant is already in the cart. */
export function isInCart(product: Pick<CartProduct, 'kind' | 'artworkId' | 'print'>): boolean {
  const key = lineKey(product);
  return $cart.get().some((l) => l.key === key);
}

/**
 * Removes originals that have been sold in the meantime (pass the ids still available).
 * Returns the removed lines so the UI can show `carrello.venduta_nel_frattempo`.
 */
export function pruneUnavailable(availableOriginalIds: readonly string[]): CartLine[] {
  const lines = $cart.get();
  const removed = lines.filter((l) => l.kind === 'original' && !availableOriginalIds.includes(l.artworkId));
  if (removed.length) $cart.set(lines.filter((l) => !removed.includes(l)));
  return removed;
}
