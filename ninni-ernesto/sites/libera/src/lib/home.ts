/**
 * Dati della home (solo server): legge src/data/home.json e lo trasforma in opere e foto del core.
 * Un id sbagliato ferma la build con un messaggio chiaro (requireArtwork / getPhotoImage del core).
 */
import { requireArtwork, getPhotos, type Artwork } from '@ne/core/catalog';
import dati from '../data/home.json' with { type: 'json' };

export type ModoSequenza = 'taglio' | 'dissolvenza';
export type VoceAltro = 'carte' | 'chi_siamo' | 'prisma';

const MODI: ModoSequenza[] = ['taglio', 'dissolvenza'];
export const VOCI_ALTRO: Record<VoceAltro, string> = { carte: '/carte-e-cornici/', chi_siamo: '/chi-siamo/', prisma: 'https://prisma.example' };

function foto(id: string | null): string | null {
  if (id === null) return null;
  if (!getPhotos().some((p) => p.id === id)) throw new Error(`[home.json] foto sconosciuta "${id}"`);
  return id;
}

const modo = dati.sequenza.modo as ModoSequenza;
if (!MODI.includes(modo)) throw new Error(`[home.json] sequenza.modo deve essere "taglio" o "dissolvenza", non "${modo}"`);

export const HOME = {
  sequenza: {
    opere: dati.sequenza.opere.map(requireArtwork) as Artwork[],
    modo,
    intervalloMs: Math.max(1000, Number(dati.sequenza.intervalloMs) || 2500),
  },
  mappa: {
    sfondo: foto(dati.mappa.sfondo),
    sfondoPosizione: dati.mappa.sfondoPosizione || '50% 50%',
    ritratto: foto(dati.mappa.ritratto) ?? 'ninni-ernesto-ritratto',
    opere: dati.mappa.opere.map(requireArtwork) as Artwork[],
    altro: {
      voci: (dati.mappa.altro.voci as VoceAltro[]).map((v) => {
        if (!(v in VOCI_ALTRO)) throw new Error(`[home.json] voce di Altro sconosciuta "${v}"`);
        return { chiave: `galleria.nav.${v}`, path: VOCI_ALTRO[v] };
      }),
      opera: requireArtwork(dati.mappa.altro.opera),
    },
  },
};
