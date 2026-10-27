/**
 * zod schemas for the raw data files (Italian field names, as written by the data thread).
 * They document the files and fail the build with a clear message if a file changes shape.
 */
import { z } from 'zod';

/** One entry of `dati/opere.json`. */
export const rawArtworkSchema = z.object({
  id: z.string().regex(/^\d{2}$/),
  titolo: z.string().min(1),
  tecnica: z.string().nullable(),
  misure: z
    .object({
      larghezza_cm: z.number().positive(),
      altezza_cm: z.number().positive(),
      testo: z.string().optional(),
    })
    .nullable(),
  /** Euro, VAT included. `null` = sold or price on request. */
  prezzo_eur: z.number().nonnegative().nullable(),
  prezzo_note: z.string().nullable().optional(),
  /** "disponibile (…)" or "esaurito". */
  disponibilita: z.string(),
  descrizione_it: z.string().nullable(),
  descrizione_en: z.string().nullable().optional(),
  descrizione_zh: z.string().nullable().optional(),
  cornice: z.string().nullable(),
  /** Internal note about the frame (never shown on the site). */
  cornice_note: z.string().optional(),
  anno: z.number().int().nullable(),
  fonte_url: z.string().nullable().optional(),
  confidenza_abbinamento: z.enum(['alta', 'media', 'bassa']).optional(),
  campi_mancanti: z.array(z.string()).optional(),
  note_abbinamento: z.string().optional(),
  /** Fotografo: ogni catalogo è separato e firmato da uno solo. */
  autore: z.enum(['ninni', 'ernesto']),
  titolo_en: z.string().nullable().optional(),
  luogo: z.string().nullable().optional(),
  /** Lato lungo massimo di stampa in cm (dipende dalla risoluzione del file). */
  stampa_max_cm: z.number().positive(),
  edizione: z
    .object({
      esemplari: z.number().int().positive(),
      prove_artista: z.number().int().nonnegative(),
      vendute: z.number().int().nonnegative(),
      larghezza_cm: z.number().positive(),
      altezza_cm: z.number().positive(),
      carta: z.enum(['rag', 'baryta', 'washi', 'bizan']),
      cornice: z.enum(['none', 'alu', 'oak', 'walnut']),
      /** Prezzi a scaglioni: fino alla copia n° `fino` costa `eur`. */
      scaglioni: z.array(z.object({ fino: z.number().int().positive(), eur: z.number().positive() })).min(1),
    })
    .nullable(),
});
export type RawArtwork = z.infer<typeof rawArtworkSchema>;

const imageFileSchema = z.object({ w: z.number(), h: z.number(), file: z.string() });

/** One image variant in `assets/manifest.json`. */
export const rawImageSchema = z.object({
  src: z.string().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  aspect_ratio: z.number().optional(),
  lqip: z.string().optional(),
  colore_dominante: z.string().optional(),
  avif: z.array(imageFileSchema),
  webp: z.array(imageFileSchema),
  jpg: imageFileSchema.optional(),
});
export type RawImage = z.infer<typeof rawImageSchema>;

export const rawManifestArtworkSchema = z.object({
  id: z.string(),
  slug: z.string(),
  aspect_ratio: z.number(),
  orientamento: z.enum(['orizzontale', 'verticale', 'quadrato']),
  colore_dominante: z.string(),
  palette: z.array(z.object({ hex: z.string(), share: z.number() })),
  lqip: z.string().optional(),
  alt: z.string().nullable().optional(),
  immagini: z.record(z.string(), rawImageSchema),
});

export const rawManifestPhotoSchema = z.object({
  id: z.string(),
  gruppo: z.string(),
  soggetto: z.string().optional(),
  uso_consigliato: z.array(z.string()).optional(),
  bianco_e_nero: z.boolean().optional(),
  aspect_ratio: z.number(),
  colore_dominante: z.string().optional(),
  lqip: z.string().optional(),
  avif: z.array(imageFileSchema),
  webp: z.array(imageFileSchema),
  jpg: imageFileSchema.optional(),
});

export const rawManifestSchema = z.object({
  versione: z.number(),
  opere: z.array(rawManifestArtworkSchema),
  foto: z.array(rawManifestPhotoSchema).default([]),
});
export type RawManifest = z.infer<typeof rawManifestSchema>;
