/**
 * Listino stampe — SI CAMBIA QUI.
 *
 * Tre famiglie di formati (seguono le proporzioni della foto): 2:3, 3:4, quadrato.
 * Prezzo = prezzo base del formato (Hahnemühle Photo Rag) × fattore della carta, arrotondato a 5 €.
 * La cornice si aggiunge a parte (FRAME_PRICES, per fascia di grandezza).
 * Riferimenti (ricerca 27/10/2026): LUMAS open edition da 119 €, Tinelli 40×60/60×90 490/700 $ (ed. 6),
 * Bragotto 70×100 700–800 €, WhiteWall cornici a cassetta da 120 €.
 * Carte: rag = Hahnemühle Photo Rag 308 · baryta = Hahnemühle Photo Rag Baryta 315 · washi = Awagami Kozo (rotolo).
 * La Awagami Bizan fatta a mano (fogli fino ad A1) è riservata alle edizioni limitate ≤ 60 cm.
 * Importi in centesimi di euro. Niente IVA indicata (regime forfettario).
 */
import type { Dimensions, FrameId, PrintFormat, PrintMaterial, ShippingZoneId } from '../types.ts';

/** Ordine in cui le carte compaiono. La prima è quella scelta all'apertura. */
export const PRINT_MATERIALS: PrintMaterial[] = ['rag', 'baryta', 'washi'];

export const PAPER_FACTORS: Record<PrintMaterial, number> = {
  rag: 1,
  baryta: 1.15,
  washi: 1.35,
};

/** Formati in verticale (larghezza × altezza), prezzo base in centesimi. */
const FAMIGLIE: Record<'2:3' | '3:4' | '1:1', { w: number; h: number; base: number }[]> = {
  '2:3': [
    { w: 20, h: 30, base: 6000 },
    { w: 30, h: 45, base: 9000 },
    { w: 40, h: 60, base: 12000 },
    { w: 60, h: 90, base: 22000 },
  ],
  '3:4': [
    { w: 30, h: 40, base: 9000 },
    { w: 45, h: 60, base: 14000 },
    { w: 60, h: 80, base: 22000 },
  ],
  '1:1': [
    { w: 30, h: 30, base: 7500 },
    { w: 50, h: 50, base: 14000 },
    { w: 70, h: 70, base: 22000 },
  ],
};

/** La carta giapponese fatta a mano esiste solo in fogli: niente formati con lato lungo oltre questa misura. */
export const WASHI_MAX_LONG_SIDE_CM = 111;

function arrotonda5(cents: number): number {
  return Math.round(cents / 500) * 500;
}

export function familyFor(aspectRatio: number): '2:3' | '3:4' | '1:1' {
  const r = aspectRatio > 1 ? 1 / aspectRatio : aspectRatio;
  if (Math.abs(r - 1) <= SQUARE_TOLERANCE) return '1:1';
  return Math.abs(r - 0.75) < Math.abs(r - 2 / 3) ? '3:4' : '2:3';
}

/** Formati di una foto (già girati se è orizzontale), fino al lato lungo massimo consentito dalla risoluzione. */
export function formatsFor(aspectRatio: number, maxLongSideCm: number): PrintFormat[] {
  const fam = FAMIGLIE[familyFor(aspectRatio)];
  const land = aspectRatio > 1 + SQUARE_TOLERANCE;
  return fam
    .filter((f) => Math.max(f.w, f.h) <= maxLongSideCm)
    .map((f) => {
      const widthCm = land ? f.h : f.w;
      const heightCm = land ? f.w : f.h;
      const prices = Object.fromEntries(
        PRINT_MATERIALS.map((m) => [m, m === 'washi' && Math.max(f.w, f.h) > WASHI_MAX_LONG_SIDE_CM ? null : arrotonda5(f.base * PAPER_FACTORS[m])]),
      ) as Record<PrintMaterial, number | null>;
      return { id: `${widthCm}x${heightCm}`, widthCm, heightCm, prices };
    });
}

/** Cornici. `none` = stampa arrotolata in tubo / in cartella rigida. */
export const FRAMES: FrameId[] = ['none', 'alu', 'oak', 'walnut'];

/** Sovrapprezzo cornice per fascia (lato lungo della stampa ≤ 45, ≤ 60, ≤ 90 cm), in centesimi. */
export const FRAME_PRICES: Record<Exclude<FrameId, 'none'>, [number, number, number]> = {
  alu: [11000, 16000, 26000],
  oak: [12000, 18000, 29000],
  walnut: [18000, 33000, 54000],
};

/** Larghezza a vista della cornice + passe-partout, per le misure finali e la AR (cm per lato). */
export const FRAME_BORDER_CM: Record<FrameId, number> = { none: 0, alu: 1.5, oak: 6, walnut: 7 };

export function framePrice(frame: FrameId, format: Dimensions): number {
  if (frame === 'none') return 0;
  const lato = Math.max(format.widthCm, format.heightCm);
  const i = lato <= 45 ? 0 : lato <= 60 ? 1 : 2;
  return FRAME_PRICES[frame][i];
}

/** Foto molto più larghe che alte non si stampano. */
export const MAX_PRINTABLE_ASPECT_RATIO = 2.2;

export const SQUARE_TOLERANCE = 0.04;

/** Massimo di copie uguali (formato + carta + cornice) in una riga del carrello. */
export const MAX_PRINT_QUANTITY = 5;

/** Spedizione delle stampe: senza cornice in tubo, con cornice in cassa. */
export function printPacking(frame: FrameId, _zone: ShippingZoneId = 'italy'): 'tube' | 'crate' {
  return frame === 'none' ? 'tube' : 'crate';
}
