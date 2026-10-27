import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { original, print } from './helpers.ts';

class MemoryStorage implements Storage {
  #data = new Map<string, string>();
  get length() {
    return this.#data.size;
  }
  clear() {
    this.#data.clear();
  }
  getItem(key: string) {
    return this.#data.get(key) ?? null;
  }
  key(i: number) {
    return [...this.#data.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.#data.delete(key);
  }
  setItem(key: string, value: string) {
    this.#data.set(key, String(value));
  }
}

async function freshCart(storage: Storage | (() => never) = new MemoryStorage()) {
  vi.resetModules();
  if (typeof storage === 'function') {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: storage });
  } else {
    vi.stubGlobal('localStorage', storage);
  }
  return { cart: await import('../src/cart/store.ts'), storage };
}

describe('cart store', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    // remove a throwing getter if a test installed one
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: undefined, writable: true });
  });

  it('adds an original only once (max quantity 1)', async () => {
    const { cart } = await freshCart();
    expect(cart.addToCart(original('08', 350000))).toMatchObject({ ok: true });
    expect(cart.addToCart(original('08', 350000))).toMatchObject({ ok: false, reason: 'max-quantity' });
    expect(cart.$cart.get()).toHaveLength(1);
    expect(cart.$cartCount.get()).toBe(1);
    expect(cart.$cartEvent.get()).toMatchObject({ type: 'max-quantity', kind: 'original' });
  });

  it('keeps originals at quantity 1 even through setQuantity or a bigger add', async () => {
    const { cart } = await freshCart();
    cart.addToCart(original('08', 350000), 5);
    expect(cart.$cart.get()[0]?.quantity).toBe(1);
    cart.setQuantity('original:08', 3);
    expect(cart.$cart.get()[0]?.quantity).toBe(1);
  });

  it('stores one line per print format, paper and frame, summing quantities', async () => {
    const { cart } = await freshCart();
    cart.addToCart(print('10', 12000, '40x60', 'rag'));
    cart.addToCart(print('10', 12000, '40x60', 'rag'));
    cart.addToCart(print('10', 13800, '40x60', 'baryta'));
    cart.addToCart(print('10', 30000, '40x60', 'rag', 'oak'));
    cart.addToCart(print('10', 22000, '60x90', 'rag'));
    const lines = cart.$cart.get();
    expect(lines.map((l) => [l.key, l.quantity])).toEqual([
      ['print:10:40x60:rag:none', 2],
      ['print:10:40x60:baryta:none', 1],
      ['print:10:40x60:rag:oak', 1],
      ['print:10:60x90:rag:none', 1],
    ]);
    expect(cart.$cartCount.get()).toBe(5);
  });

  it('caps print quantity', async () => {
    const { cart } = await freshCart();
    const { MAX_PRINT_QUANTITY } = await import('../src/config/prints.ts');
    cart.addToCart(print('10', 13420), MAX_PRINT_QUANTITY + 5);
    expect(cart.$cart.get()[0]?.quantity).toBe(MAX_PRINT_QUANTITY);
    expect(cart.addToCart(print('10', 13420))).toMatchObject({ ok: false, reason: 'max-quantity' });
  });

  it('updates quantities, removes lines and clears', async () => {
    const { cart } = await freshCart();
    cart.addToCart(print('10', 13420));
    cart.addToCart(original('08', 350000));
    cart.setQuantity('print:10:40x60:rag:none', 3);
    expect(cart.$cartCount.get()).toBe(4);
    expect(cart.$cartEvent.get()).toMatchObject({ type: 'quantity', quantity: 3 });
    cart.setQuantity('print:10:40x60:rag:none', 0);
    expect(cart.$cart.get().map((l) => l.key)).toEqual(['original:08']);
    cart.removeFromCart('original:08');
    expect(cart.$cartEvent.get()).toMatchObject({ type: 'removed', title: 'Opera 08' });
    cart.addToCart(original('09', 500000));
    cart.clearCart();
    expect(cart.$cart.get()).toEqual([]);
    expect(cart.$cartEvent.get()).toMatchObject({ type: 'cleared' });
  });

  it('rejects invalid products', async () => {
    const { cart } = await freshCart();
    expect(cart.addToCart({ ...original('08', 350000), unitPriceCents: 10.5 })).toMatchObject({ ok: false, reason: 'invalid-product' });
    expect(cart.addToCart({ ...print('08', 100), print: undefined })).toMatchObject({ ok: false, reason: 'invalid-product' });
    expect(cart.$cart.get()).toEqual([]);
  });

  it('computes totals (no VAT: flat-rate regime) and shipping for the chosen country', async () => {
    const { cart } = await freshCart();
    cart.addToCart(original('08', 350000));
    cart.addToCart(print('10', 13420));
    expect(cart.$cartTotals.get().shipping).toBeNull();
    cart.setCartCountry('it');
    expect(cart.$cartCountry.get()).toBe('IT');
    const totals = cart.$cartTotals.get();
    expect(totals.shipping?.zone).toBe('italy');
    expect(totals.vatTotalCents).toBe(0);
    expect(totals.totalCents).toBe(350000 + 13420 + (totals.shipping?.totalCents ?? 0));
  });

  it('persists to localStorage and restores on reload', async () => {
    const storage = new MemoryStorage();
    const first = await freshCart(storage);
    first.cart.addToCart(original('08', 350000));
    first.cart.addToCart(print('10', 13420), 2);
    first.cart.setCartCountry('DE');
    expect(storage.getItem(first.cart.CART_STORAGE_KEY)).toContain('original:08');

    const second = await freshCart(storage);
    expect(second.cart.$cart.get().map((l) => [l.key, l.quantity])).toEqual([
      ['original:08', 1],
      ['print:10:40x60:rag:none', 2],
    ]);
    expect(second.cart.$cartCountry.get()).toBe('DE');
  });

  it('ignores corrupted or tampered storage', async () => {
    const storage = new MemoryStorage();
    storage.setItem('ne:cart:v1', '{not json');
    expect((await freshCart(storage)).cart.$cart.get()).toEqual([]);

    storage.setItem(
      'ne:cart:v1',
      JSON.stringify([
        { ...original('08', 350000), quantity: 7 }, // original with qty 7 → clamped to 1
        { ...original('08', 350000), quantity: 1 }, // duplicate → dropped
        { kind: 'gift', artworkId: 'x' }, // unknown kind → dropped
      ]),
    );
    const { cart } = await freshCart(storage);
    expect(cart.$cart.get().map((l) => [l.key, l.quantity])).toEqual([['original:08', 1]]);
  });

  it('keeps working in memory when localStorage throws', async () => {
    const { cart } = await freshCart(() => {
      throw new Error('SecurityError');
    });
    expect(cart.addToCart(original('08', 350000))).toMatchObject({ ok: true });
    expect(cart.$cartCount.get()).toBe(1);
  });

  it('removes originals sold in the meantime', async () => {
    const { cart } = await freshCart();
    cart.addToCart(original('08', 350000));
    cart.addToCart(original('09', 500000));
    cart.addToCart(print('24', 13420));
    const removed = cart.pruneUnavailable(['09']);
    expect(removed.map((l) => l.artworkId)).toEqual(['08']);
    expect(cart.$cart.get().map((l) => l.key)).toEqual(['original:09', 'print:24:40x60:rag:none']);
    expect(cart.isInCart(original('09', 0))).toBe(true);
  });
});
