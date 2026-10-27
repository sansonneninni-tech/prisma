/**
 * "Le proposte di Isa": sets of pieces that work together on one wall.
 * Texts (name, colours, description) are in `testi/*.json` under `proposte.set[textIndex]`.
 *
 * DRAFT, to confirm with Isabella. Aligned with Casa (19/10): the original is the starting painting of each set
 * (Casa DIREZIONE §9: 09 / 25 / 18 / 21) and the print is the first print of Casa's set (`sites/casa/src/data/proposte.json`).
 * A site with richer sets (more pieces, photos) keeps its own data, as Casa does.
 */
import type { PrintMaterial } from '../types.ts';
import type { ComingSoonCategory } from './coming-soon.ts';

export interface ProposalConfig {
  /** Matches `proposte.set[i].id` in the texts. */
  id: 'rosso-notte' | 'ocra-mezzogiorno' | 'smeraldo-oro' | 'petrolio-avorio';
  textIndex: number;
  /** The original painting of the set. */
  originalId: string;
  /** A print of another artwork. */
  print: { artworkId: string; formatId: string; material: PrintMaterial };
  /** An object from the "Prossimamente" categories (not purchasable yet). */
  objectId: ComingSoonCategory['id'];
}

export const PROPOSALS: ProposalConfig[] = [];
