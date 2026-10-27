import { describe, expect, it } from 'vitest';
import {
  artworkAlt,
  getArtwork,
  getArtworkBySlug,
  getArtworkImage,
  getArtworks,
  getComingSoon,
  getPhotoImage,
  getPhotos,
  getPrintOptions,
  getPrints,
  getProposals,
  toCartProduct,
  toPrintCartProduct,
  toPrintCartProducts,
} from '../src/catalog/index.ts';
import { slugify } from '../src/catalog/slug.ts';

describe('catalog (real data files)', () => {
  it('loads the 26 artworks with English field names', () => {
    const all = getArtworks();
    expect(all).toHaveLength(26);
    const dea = getArtwork('04');
    expect(dea).toMatchObject({ slug: 'dea-alea', title: 'Dea Alea', status: 'available', priceCents: 500000, orientation: 'portrait' });
    expect(dea?.dimensions).toEqual({ widthCm: 100, heightCm: 140 });
    expect(Object.keys(dea?.images ?? {}).sort()).toEqual(['canvas', 'detail1', 'detail2', 'full', 'signature', 'thumbnail']);
  });

  it('marks sold works ("esaurito") with no price', () => {
    const sold = getArtworks({ status: 'sold' });
    expect(sold.map((a) => a.id).sort()).toEqual(['24', '26']);
    for (const a of sold) expect(a.priceCents).toBeNull();
  });

  it('has unique slugs and finds by slug', () => {
    const slugs = getArtworks().map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(getArtworkBySlug('maesta-riflessa')?.id).toBe('23');
    expect(slugify('Maestà Riflessa')).toBe('maesta-riflessa');
  });

  it('builds responsive images with avif/webp srcset, size and LQIP', () => {
    const img = getArtworkImage('04', 'canvas', { width: 600 });
    expect(img.sources.map((s) => s.type)).toEqual(['image/avif', 'image/webp']);
    expect(img.sources[0]?.srcset).toMatch(/^\/assets\/opere\/04\/opera-04_tela_\d+\.avif \d+w, /);
    expect(img.src).toMatch(/\.jpg$/);
    expect(img.width).toBe(600);
    expect(img.height).toBe(Math.round(600 / getArtwork('04')!.aspectRatio));
    expect(img.lqip).toMatch(/^data:image\/webp;base64,/);
    expect(img.dominantColor).toBe('#97a4ac');
    expect(img.palette.length).toBeGreaterThan(0);
    expect(img.sizes).toBe('(max-width: 600px) 100vw, 600px');
  });

  it('never upscales beyond the original', () => {
    const asset = getArtwork('01')!.images.canvas!;
    expect(getArtworkImage('01', 'canvas', { width: 5000 }).width).toBe(asset.width);
  });

  it('offers prints matching the orientation, not for panoramic friezes', () => {
    expect(getPrintOptions(getArtwork('04')!)?.formats.map((f) => f.id)).toEqual(['40x60', '50x70', '70x100', '100x150']);
    expect(getPrintOptions(getArtwork('01')!)?.formats.map((f) => f.id)).toEqual(['60x40', '70x50', '100x70', '150x100']);
    expect(getPrintOptions(getArtwork('09')!)?.formats.map((f) => f.id)).toEqual(['50x50', '80x80', '100x100']);
    expect(getPrintOptions(getArtwork('24')!)).toBeNull();
    expect(getPrintOptions(getArtwork('04')!)?.fromCents).toBe(10980);
    expect(getPrints().length).toBe(24);
  });

  it('builds cart products on the server', () => {
    const p = toCartProduct(getArtwork('04')!, 'en', { path: '/opere/dea-alea' });
    expect(p).toMatchObject({ kind: 'original', artworkId: '04', unitPriceCents: 500000, longestSideCm: 140, url: '/en/opere/dea-alea' });
    expect(p?.image?.src).toMatch(/^\/assets\/opere\/04\/.+\.webp$/);
    expect(toCartProduct(getArtwork('24')!, 'it')).toBeNull();
    expect(toPrintCartProduct(getArtwork('04')!, '50x70', 'canvas', 'it')).toMatchObject({ kind: 'print', unitPriceCents: 28060, print: { formatId: '50x70', material: 'canvas' } });
    expect(toPrintCartProduct(getArtwork('04')!, '40x60', 'canvas', 'it')).toBeNull();
    expect(toPrintCartProducts(getArtwork('04')!, 'it')).toHaveLength(7);
  });

  it('resolves the four proposals and the coming-soon categories', () => {
    const proposals = getProposals();
    expect(proposals.map((p) => p.id)).toEqual(['rosso-notte', 'ocra-mezzogiorno', 'smeraldo-oro', 'petrolio-avorio']);
    for (const p of proposals) {
      expect(p.original.status).toBe('available');
      expect(p.print.priceCents).toBeGreaterThan(0);
      expect(p.object.purchasable).toBe(false);
    }
    expect(getComingSoon().map((c) => c.id)).toEqual(['fabric-art', 'vasi', 'candele-the-moon', 'abiti-dipinti']);
  });

  it('gives a localised fallback alt text', () => {
    expect(artworkAlt(getArtwork('04')!, 'en')).toBe('Dea Alea, painting by Isabella Pistillo');
    expect(artworkAlt(getArtwork('04')!, 'zh')).toBe('Dea Alea，伊莎贝拉·皮斯蒂洛的画作');
  });

  it('exposes the photos of the manifest', () => {
    const portraits = getPhotos({ group: 'ritratti' });
    expect(portraits.length).toBeGreaterThan(0);
    const img = getPhotoImage(portraits[0]!.id, { width: 800 });
    expect(img.sources[0]?.srcset).toContain('/assets/foto/');
  });
});
