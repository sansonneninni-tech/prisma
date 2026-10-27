/**
 * Gruppi di colore delle opere (solo server / frontmatter). Logica copiata da Casa (`sites/casa/src/lib/colori.ts`),
 * stessi gruppi e soglie (DIREZIONE §6 P2); qui senza stanze e senza i campioni colorati (l'interfaccia resta in bianco e nero).
 *
 * Ogni colore della palette del manifest (k-means, con la sua quota di superficie) va nel gruppo più vicino per
 * tinta/saturazione/luminosità; un'opera è nel gruppo se la somma delle quote è ≥ 15% (≥ 30% per Neri e Grigi:
 * quasi ogni quadro ha un fondo scuro o chiaro). Le correzioni a mano stanno in CORREZIONI, da far vedere a Isabella.
 */
import type { Artwork } from '@ne/core/catalog';

export const GRUPPI_COLORE = ['rossi', 'ocra', 'verdi', 'blu', 'neri', 'grigi'] as const;
export type GruppoColore = (typeof GRUPPI_COLORE)[number];

const SOGLIA = 0.15;
const SOGLIA_NEUTRI = 0.3;

/** `+gruppo` aggiunge, `-gruppo` toglie. 05 e 09: il rosso cadmio è il segno del quadro ma nella palette pesa 13–15%. */
const CORREZIONI: Record<string, string[]> = {
  '05': ['+rossi'],
  '09': ['+rossi'],
};

function hsv(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

/** Gruppo di un singolo colore. */
export function gruppoDi(hex: string): GruppoColore {
  const [h, s, v] = hsv(hex);
  if (v < 0.22) return 'neri';
  const neutro: GruppoColore = v < 0.33 ? 'neri' : 'grigi';
  if (s < 0.25) return neutro;
  if (h >= 330 || h < 15) return 'rossi';
  if (h < 28) return s >= 0.55 ? 'rossi' : neutro; // terracotta e bruni
  if (h < 62) return s >= 0.4 ? 'ocra' : neutro; // ocra e oro; i beige vanno con gli avori
  if (h < 172) return 'verdi';
  if (h < 262) return 'blu';
  return 'rossi'; // magenta e cremisi
}

/** Gruppi di colore dell'opera, nell'ordine dei filtri. */
export function coloriOpera(art: Artwork): GruppoColore[] {
  const q = Object.fromEntries(GRUPPI_COLORE.map((g) => [g, 0])) as Record<GruppoColore, number>;
  for (const c of art.palette) q[gruppoDi(c.hex)] += c.share;
  const out = new Set<GruppoColore>(GRUPPI_COLORE.filter((id) => q[id] >= (id === 'neri' || id === 'grigi' ? SOGLIA_NEUTRI : SOGLIA)));
  for (const c of CORREZIONI[art.id] ?? []) {
    const id = c.slice(1) as GruppoColore;
    if (c.startsWith('+')) out.add(id);
    else out.delete(id);
  }
  return GRUPPI_COLORE.filter((id) => out.has(id));
}
