// Realta' aumentata: testi predefiniti del componente ArViewer (IT / EN / ZH)
// e percorsi dei modelli. Ogni sito puo' passare i propri testi con la prop
// `testi` (anche solo alcuni campi). Guida: packages/core/AR.md
import { ASSETS_BASE } from '../catalog/images.ts';
import indiceAr from '../../../../assets/ar/index.json' with { type: 'json' };

export { TESTI_AR, testiAr, type LinguaAr, type TestiAr } from './testi.ts';

/**
 * Percorsi dei modelli di un'opera, dato l'id ("01".."26").
 * `base` = cartella pubblica in cui il sito serve siti/assets/ar
 * (default: <ASSETS_BASE>ar, cioe' "/assets/ar" con l'integrazione di @ne/core).
 */
/** Versione dei file in assets/ar: aumentarla ogni volta che si rigenerano i modelli. */
export const VERSIONE_MODELLI_AR = '3';

export function modelliAr(id: string | number, base: string = `${ASSETS_BASE}ar`) {
  const nn = String(id).padStart(2, '0');
  const b = base.replace(/\/$/, '');
  // `?v=` cambia quando i modelli vengono rigenerati, cosi' telefoni e CDN non
  // riaprono una copia vecchia (v2, 19/10: USDZ ruotato per l'ancoraggio a muro su iPhone).
  return { glb: `${b}/${nn}.glb?v=${VERSIONE_MODELLI_AR}`, usdz: `${b}/${nn}.usdz?v=${VERSIONE_MODELLI_AR}` };
}

// ── Misure dei modelli ──────────────────────────────────────────────────────

/** Misure (cm) con cui e' stato generato il modello 3D di un'opera: cornice compresa, se c'e'. */
export interface MisureAr {
  larghezzaCm: number;
  altezzaCm: number;
  profonditaCm: number;
}

interface VoceIndiceAr {
  id: string;
  larghezza_cm: number;
  altezza_cm: number;
  profondita_cm: number;
}

const MISURE_AR: ReadonlyMap<string, MisureAr> = new Map(
  (indiceAr as { opere: VoceIndiceAr[] }).opere.map((o) => [
    o.id,
    { larghezzaCm: o.larghezza_cm, altezzaCm: o.altezza_cm, profonditaCm: o.profondita_cm },
  ]),
);

/**
 * Misure del modello AR di un'opera (da `siti/assets/ar/index.json`, scritto da `scripts/ar/genera_ar.py`),
 * `null` se il modello non c'e'. Possono differire da `artwork.dimensions` quando l'opera ha la cornice:
 * es. `misureAr('09')` → 90 × 90 cm, mentre la tela e' 71 × 71. Utile per le viste "in scala" coerenti con la AR.
 * Solo lato server (frontmatter): importato in uno script client porterebbe con se' l'indice (~10 KB).
 */
export function misureAr(id: string | number): MisureAr | null {
  return MISURE_AR.get(String(id).padStart(2, '0')) ?? null;
}
