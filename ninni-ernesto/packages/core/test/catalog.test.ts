import { describe, expect, it } from 'vitest';
import {
  artworkAlt,
  getArtwork,
  getArtworkBySlug,
  getArtworkImage,
  getArtworks,
  getPhotoImage,
  getPhotos,
  getPrintOptions,
  getPrintPrice,
  toCartProduct,
  toPrintCartProduct,
  toPrintCartProducts,
} from '../src/catalog/index.ts';
import { slugify } from '../src/catalog/slug.ts';

describe('catalog (real data files: Ninni & Ernesto)', () => {
  it('loads the 8 photos by Ninni and the 10 by Ernesto (Mare su tela is one series of 8)', () => {
    const all = getArtworks();
    expect(all).toHaveLength(18);
    expect(all.filter((a) => a.author === 'ninni')).toHaveLength(8);
    expect(all.filter((a) => a.author === 'ernesto')).toHaveLength(10);
    const mare = getArtwork('51')!;
    expect(mare.series).toHaveLength(8);
    expect(mare.edition).toMatchObject({ size: 10, dimensions: { widthCm: 20, heightCm: 30 } });
    expect(getPrintOptions(mare, { formats: 'all' })).toBeNull();
    expect(getArtwork('52')!.series).toEqual([]);
    const tulip = getArtwork('01');
    expect(tulip).toMatchObject({ slug: 'tulipano', title: 'Tulipano', status: 'available', orientation: 'portrait' });
    expect(Object.keys(tulip?.images ?? {})).toEqual(expect.arrayContaining(['canvas', 'detail1', 'detail2', 'thumbnail']));
  });

  it('builds the numbered limited edition with real scarcity and a price ladder', () => {
    // Ninni has one limited edition only: Volto, 150 cm on the long side
    expect(getArtworks().filter((a) => a.author === 'ninni' && a.edition).map((a) => a.id)).toEqual(['03']);
    const ed = getArtwork('03')!.edition!;
    expect(ed).toMatchObject({ size: 5, artistProofs: 1, sold: 0, nextNumber: 1, remaining: 5, dimensions: { widthCm: 100, heightCm: 150 } });
    // copies 1–2 at 2.400 €, then 2.900 €: two left at this price
    expect(getArtwork('03')!.priceCents).toBe(240000);
    expect(ed.nextStepPriceCents).toBe(290000);
    expect(ed.leftAtThisPrice).toBe(2);
    // the edition is sold framed: the page shows the framed size
    expect(getArtwork('03')!.dimensions).toEqual(ed.framedDimensions);
    // prints-only photos have no edition
    expect(getArtwork('01')!.edition).toBeNull();
  });

  it('has unique slugs and finds by slug', () => {
    const slugs = getArtworks().map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(getArtworkBySlug('croce-rossa')?.id).toBe('07');
    expect(slugify('Croce Rossa')).toBe('croce-rossa');
  });

  it('builds responsive images with avif/webp srcset, size and LQIP', () => {
    const img = getArtworkImage('01', 'canvas', { width: 600 });
    expect(img.sources.map((s) => s.type)).toEqual(['image/avif', 'image/webp']);
    expect(img.sources[0]?.srcset).toMatch(/^\/assets\/opere\/01\/foto-01_tela_\d+\.avif \d+w, /);
    expect(img.src).toMatch(/\.jpg$/);
    expect(img.width).toBe(600);
    expect(img.height).toBe(Math.round(600 / getArtwork('01')!.aspectRatio));
    expect(img.lqip).toMatch(/^data:image\/webp;base64,/);
    expect(img.palette.length).toBeGreaterThan(0);
  });

  it('never upscales beyond the original', () => {
    const asset = getArtwork('01')!.images.canvas!;
    expect(getArtworkImage('01', 'canvas', { width: 9000 }).width).toBe(asset.width);
  });

  it('offers print formats by proportion, up to the largest size each file allows', () => {
    expect(getPrintOptions(getArtwork('01')!, { formats: 'all' })?.formats.map((f) => f.id)).toEqual(['20x30', '30x45', '40x60', '60x90']);
    expect(getPrintOptions(getArtwork('05')!, { formats: 'all' })?.formats.map((f) => f.id)).toEqual(['20x30']);
    expect(getPrintOptions(getArtwork('04')!, { formats: 'all' })?.formats.map((f) => f.id)).toEqual(['30x30', '50x50', '70x70']);
    expect(getPrintOptions(getArtwork('01')!)?.fromCents).toBe(6000);
  });

  it('prices paper and frame: base × paper factor (rounded to 5 €) + frame by size band', () => {
    const o = getPrintOptions(getArtwork('01')!, { formats: 'all' })!;
    expect(getPrintPrice(o, '40x60', 'rag')).toBe(12000);
    expect(getPrintPrice(o, '40x60', 'baryta')).toBe(14000); // 138 € rounded to the nearest 5 €
    expect(getPrintPrice(o, '40x60', 'rag', 'oak')).toBe(12000 + 18000);
    expect(getPrintPrice(o, '60x90', 'rag', 'walnut')).toBe(22000 + 54000);
    expect(getPrintPrice(o, '50x70', 'rag')).toBeNull();
  });

  it('builds cart products on the server, one per format × paper × frame', () => {
    const ed = toCartProduct(getArtwork('03')!, 'en', { path: '/ninni/volto' });
    expect(ed).toMatchObject({ kind: 'original', artworkId: '03', unitPriceCents: 240000, url: '/en/ninni/volto' });
    expect(ed?.image?.src).toMatch(/^\/assets\/opere\/03\/.+\.webp$/);
    expect(toPrintCartProduct(getArtwork('01')!, '40x60', 'rag', 'it', {}, 'oak')).toMatchObject({
      kind: 'print', unitPriceCents: 30000, print: { formatId: '40x60', material: 'rag', frame: 'oak' },
    });
    expect(toPrintCartProducts(getArtwork('05')!, 'it')).toHaveLength(1 * 3 * 4);
  });

  it('gives a localised fallback alt text', () => {
    const a = { ...getArtwork('01')!, alt: {} };
    expect(artworkAlt(a, 'en')).toBe('Tulipano, photograph by Ninni');
  });

  it('exposes the photos of the manifest (portrait of Ninni & Ernesto)', () => {
    const photos = getPhotos();
    expect(photos.some((p) => p.id === 'ninni-ernesto-ritratto')).toBe(true);
    const img = getPhotoImage('ninni-ernesto-ritratto', { width: 800 });
    expect(img.sources[0]?.srcset).toContain('/assets/foto/');
  });
});
