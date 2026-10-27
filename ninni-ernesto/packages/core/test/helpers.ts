import type { CartLine, CartProduct } from '../src/types.ts';

export function original(id: string, priceCents: number, extra: Partial<CartProduct> = {}): CartProduct {
  return { kind: 'original', artworkId: id, slug: `opera-${id}`, title: `Opera ${id}`, unitPriceCents: priceCents, ...extra };
}

export function print(id: string, priceCents: number, formatId = '40x60', material: 'rag' | 'baryta' | 'washi' = 'rag', frame: 'none' | 'alu' | 'oak' | 'walnut' = 'none'): CartProduct {
  const [w, h] = formatId.split('x').map(Number);
  return {
    kind: 'print',
    artworkId: id,
    slug: `opera-${id}`,
    title: `Stampa ${id}`,
    unitPriceCents: priceCents,
    print: { formatId, material, frame, widthCm: w ?? 0, heightCm: h ?? 0 } as CartProduct['print'],
  };
}

export function line(product: CartProduct, quantity = 1): CartLine {
  return { ...product, key: `${product.kind}:${product.artworkId}:${product.print?.formatId ?? ''}`, quantity, addedAt: 0 };
}
