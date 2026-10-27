/**
 * "Prossimamente" categories: explorable, NOT purchasable.
 * Names and descriptions live in `testi/*.json` under `prossimamente.voci[textIndex]`
 * (ids here match `prossimamente.voci[i].id`).
 */
import type { Dimensions } from '../types.ts';

export interface ComingSoonExample {
  title: string;
  /** Indicative price shown as information only. */
  priceCents: number | null;
  dimensions: Dimensions | null;
  /** Source page on the current shop, if any. */
  sourceUrl?: string;
}

export interface ComingSoonCategory {
  id: 'fabric-art' | 'vasi' | 'candele-the-moon' | 'abiti-dipinti';
  /** Index in `prossimamente.voci` of the texts files. */
  textIndex: number;
  /** Who makes it, when it is not Isabella. */
  maker: { name: string; brand?: string } | null;
  purchasable: false;
  /** Colours to build a placeholder visual while there are no photos. */
  palette: string[];
  /**
   * Size of one typical piece, to draw it to scale next to the paintings (e.g. in the proposals).
   * INDICATIVE, the same values Casa uses (19/10): to confirm with Isabella and Francesca. `null` = not known.
   */
  indicativeDimensions: Dimensions | null;
  examples: ComingSoonExample[];
}

export const COMING_SOON: ComingSoonCategory[] = [
  {
    id: 'fabric-art',
    textIndex: 0,
    maker: null,
    purchasable: false,
    palette: ['#1a1a1a', '#b23a2b', '#e9e1d4'],
    indicativeDimensions: null,
    examples: [
      { title: 'Presenze', priceCents: 80000, dimensions: { widthCm: 50, heightCm: 70 }, sourceUrl: 'https://isabellapistillo.com/shop/fabric-art/presenze/' },
      { title: 'Orizzonti di donna', priceCents: 60000, dimensions: { widthCm: 48, heightCm: 36 }, sourceUrl: 'https://isabellapistillo.com/shop/fabric-art/orizzonti-di-donna/' },
    ],
  },
  {
    id: 'vasi',
    textIndex: 1,
    maker: null,
    purchasable: false,
    palette: ['#c8902e', '#7a3b22', '#efe6d6'],
    indicativeDimensions: { widthCm: 22, heightCm: 32 },
    examples: [],
  },
  {
    id: 'candele-the-moon',
    textIndex: 2,
    maker: { name: 'Francesca', brand: 'The Moon' },
    purchasable: false,
    palette: ['#f2ede4', '#d8c7a6', '#2b2b2b'],
    indicativeDimensions: { widthCm: 12, heightCm: 16 },
    examples: [],
  },
  {
    id: 'abiti-dipinti',
    textIndex: 3,
    maker: null,
    purchasable: false,
    palette: ['#0f3d4a', '#c0392b', '#e8b33a'],
    indicativeDimensions: null,
    examples: [],
  },
];
