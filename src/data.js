/* =========================================================
   PRISMA — dati del sito (unico punto da modificare)
   Testi in due lingue: { it, en }
   ========================================================= */

export const CONTATTI = {
  // SEGNAPOSTO: sostituire con i dati veri
  whatsapp: '390000000000',           // solo cifre, con prefisso internazionale
  whatsappLabel: '+39 000 000 0000',
  email: 'ciao@prisma-studio.it',
  instagram: 'prisma.mov',
  sitoFoto: 'https://ninnieernesto.netlify.app', // sito foto Ninni & Ernesto (segnaposto)
}

/* Formati: id usati nei filtri del portfolio e nel modulo */
export const FORMATI = {
  editoriale: { it: 'Editoriale', en: 'Editorial' },
  social: { it: 'Short form', en: 'Short form' },
  evento: { it: 'Reel evento', en: 'Event reel' },
  sistema: { it: 'Sistema contenuti', en: 'Content system' },
}

/* Portfolio clienti.
   media: cartella in /media/<id>/ con web.mp4, poster.jpg, originale.mp4
   drive: link esterno quando il video non è nel sito
   cover: immagine statica (se manca si usa il poster del video) */
export const LAVORI = [
  {
    id: 'isabella', cliente: 'Isabella Pistillo', formato: 'sistema',
    sub: { it: 'Artista · 1 giornata, 14 contenuti', en: 'Artist · 1 day, 14 pieces' },
    media: 'isabella-editoriale', caso: '/isabella/', ratio: '4/5',
  },
  {
    id: 'df-marmi', cliente: 'DF Marmi', formato: 'editoriale', logo: 'df-marmi.png',
    sub: { it: 'Homepage del sito', en: 'Website homepage' },
    media: 'df-marmi', cover: 'df-marmi.jpg', ratio: '16/9',
  },
  {
    id: 'archemi-editoriale', cliente: 'Archemi', formato: 'editoriale', logo: 'archemi.png',
    sub: { it: 'Architettura e design', en: 'Architecture & design' },
    media: 'archemi-editoriale', cover: 'archemi-editoriale.jpg', ratio: '9/16',
  },
  {
    id: 'nugnes-editoriale', cliente: 'Nugnes', formato: 'editoriale', logo: 'nugnes.png',
    sub: { it: 'Boutique', en: 'Boutique' },
    cover: 'nugnes-editoriale.jpg', ratio: '1/1',
    drive: 'https://drive.google.com/file/d/1psDn95FfSQ9k7f2-OykYEwM0e1FF6YvX/view?usp=sharing',
  },
  {
    id: 'panegos', cliente: 'Panegos & Co.', formato: 'editoriale', logo: 'panegos.png',
    sub: { it: 'Distillerie', en: 'Distillery' },
    cover: 'panegos.jpg', ratio: '1/1',
    drive: 'https://drive.google.com/file/d/1hI-f0zENdiKV97nHA_YT--lPw81E0Nyw/view?usp=vids_web',
  },
  {
    id: 'archemi-social', cliente: 'Archemi', formato: 'social', logo: 'archemi.png',
    sub: { it: 'Architettura e design', en: 'Architecture & design' },
    media: 'archemi-social', cover: 'archemi-social.jpg', ratio: '9/16',
  },
  {
    id: 'edward', cliente: 'Edward', formato: 'social', logo: 'edward.png',
    sub: { it: 'Trani', en: 'Trani' },
    media: 'edward', cover: 'edward.jpg', ratio: '9/16',
  },
  {
    id: 'tgtm', cliente: 'T.G.T.M.', formato: 'social', logo: 'tgtm.png',
    sub: { it: 'Smash burger artigianale', en: 'Craft smash burgers' },
    media: 'tgtm', cover: 'tgtm.jpg', ratio: '9/16',
  },
  {
    id: 'archemi-evento', cliente: 'Archemi', formato: 'evento', logo: 'archemi.png',
    sub: { it: 'Evento in studio', en: 'Studio event' },
    media: 'archemi-evento', ratio: '9/16',
  },
  {
    id: 'nugnes-evento', cliente: 'Nugnes', formato: 'evento', logo: 'nugnes.png',
    sub: { it: 'Evento in boutique', en: 'Boutique event' },
    cover: 'nugnes-evento.jpg', ratio: '1/1',
    drive: 'https://drive.google.com/file/d/1Rs1ZgnkERuI8ItaPIFlD3PsrWwJ6O4Cc/view?usp=sharing',
  },
  {
    id: 'antica-enotria', cliente: 'Antica Enotria', formato: 'evento', logo: 'antica-enotria.png',
    sub: { it: 'Evento in cantina', en: 'Winery event' },
    cover: 'antica-enotria.jpg', ratio: '1/1',
    drive: 'https://drive.google.com/file/d/1qFHoYn0aoZgPtC0Vy3YTWulynaZpOZ4E/view?usp=drive_link',
  },
]

/* Lavori senza cliente (sezione separata) */
export const ORIGINAL = [
  { id: 'original-trailer', titolo: 'Trailer', media: 'original-trailer' },
  { id: 'original-petali', titolo: 'Petali', media: 'original-petali' },
  { id: 'original-pagine', titolo: 'Pagine', media: 'original-pagine' },
  { id: 'original-outro', titolo: 'Outro', media: 'original-outro' },
]

/* Clip che passano dentro il prisma in apertura */
export const SHOWREEL = ['df-marmi', 'archemi-editoriale', 'isabella-editoriale', 'tgtm', 'original-petali', 'edward', 'archemi-social', 'original-trailer']

/* Formati e prezzi: forbice da… a… (nessuna IVA nominata) */
export const PREZZI = {
  evento: { da: 350, a: 550 },
  social: { da: 299, a: 690 },
  editoriale: { da: 899, a: 2400 },
  sistema: { base: 1499, contenuti: 14 },
}

/* Estensioni del sistema contenuti (dal preventivo artista) */
export const ESTENSIONI = [
  { id: 'nessuna', prezzo: 0, piu: 0, it: 'Solo il pacchetto', en: 'Package only', det: { it: '14 contenuti', en: '14 pieces' } },
  { id: 'a', prezzo: 99, piu: 3, it: '+3 video brevi', en: '+3 short videos', det: { it: '17 contenuti', en: '17 pieces' } },
  { id: 'b', prezzo: 199, piu: 8, it: '+3 brevi, +5 micro', en: '+3 short, +5 micro', det: { it: '22 contenuti', en: '22 pieces' } },
  { id: 'completo', prezzo: 549, piu: 24, it: 'Tutta la riserva', en: 'The whole reserve', det: { it: '38 contenuti', en: '38 pieces' }, top: true },
]

/* Il metodo: facce del prisma */
export const METODO = [
  {
    id: 'brief',
    nome: { it: 'Brief', en: 'Brief' },
    claim: { it: 'Ascoltare è il primo lavoro.', en: 'Listening comes first.' },
    body: { it: 'Obiettivi, pubblico, tono, canali. Prima di accendere una camera sappiamo cosa deve succedere dopo.', en: 'Goals, audience, tone, channels. Before a camera rolls, we know what has to happen next.' },
  },
  {
    id: 'produzione',
    nome: { it: 'Produzione', en: 'Production' },
    claim: { it: 'Pensiamo a tutto.', en: 'We handle everything.' },
    body: { it: 'Sopralluogo, piano di ripresa, regia, luci e audio. Sul set siamo discreti e puntuali.', en: 'Scouting, shot plan, direction, light and sound. On set we are quiet and on time.' },
  },
  {
    id: 'editing',
    nome: { it: 'Editing', en: 'Editing' },
    claim: { it: 'Workflow cinematografico.', en: 'A cinema workflow.' },
    body: { it: 'Montaggio, color grading, sound design, lettering. Ogni formato: 9:16, 4:5, 16:9.', en: 'Edit, colour grading, sound design, lettering. Every format: 9:16, 4:5, 16:9.' },
  },
  {
    id: 'metodo',
    nome: { it: 'Metodo', en: 'Method' },
    claim: { it: 'Su misura, non in serie.', en: 'Tailored, not mass-made.' },
    body: { it: 'Un concept condiviso tiene insieme tutti i contenuti: stessa luce, stessa identità, per mesi.', en: 'One shared concept holds every piece together: same light, same identity, for months.' },
  },
]

/* Caso Isabella: i numeri reali del sistema */
export const ISABELLA = {
  giornate: 1,
  potenziali: { manifesto: 1, brevi: 12, micro: 25 }, // 38
  pronti: { manifesto: 1, brevi: 5, micro: 8 },       // 14
  settimane: 12,
  riservaMesi: 12,
}
