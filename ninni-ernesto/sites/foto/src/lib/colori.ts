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
  '07': ['+rossi'],
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

/** hex → OKLCH [L, C, h°] */
function oklch(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

/**
 * «Galleria, ma con del colore»: la tinta di fondo di una foto. Si prende il colore più vivo della palette (croma
 * pesata sulla superficie), poi lo si porta molto chiaro (L 0,955) e tenue (croma al massimo 0,035): resta leggibile
 * il testo nero e la foto non si confonde col fondo. Foto senza colore (bianco e nero): grigio caldo appena accennato.
 */
export function tintaOpera(art: Artwork): string {
  let best: [number, number, number] | null = null;
  let score = 0;
  for (const c of art.palette) {
    const k = oklch(c.hex);
    const sc = k[1] * Math.sqrt(c.share);
    if (sc > score) { score = sc; best = k; }
  }
  if (!best || best[1] < 0.03) return 'oklch(0.96 0.006 80)';
  const C = Math.min(0.035, best[1] * 0.3);
  return `oklch(0.955 ${C.toFixed(3)} ${best[2].toFixed(1)})`;
}
