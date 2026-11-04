// Galleria — configurazione Astro.
// L'integrazione di @ne/core imposta i18n (it/en/zh, prefisso sempre presente)
// e serve le immagini di siti/assets su /assets/ (in build le copia in dist/assets/).
import { defineConfig } from 'astro/config';
import isabellaCore from '@ne/core/integration';

export default defineConfig({
  site: 'https://ninni-ernesto-ispirata.netlify.app',
  trailingSlash: 'always',
  integrations: [isabellaCore({ assetFolders: ['opere', 'foto', 'ar'] })],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  build: { inlineStylesheets: 'auto' },
  // catalogo bloccato al 28/10 (dati/opere-v1.json): le novità del 03/11 (foto di Ernesto, una sola edizione di Ninni)
  // valgono solo per il sito attuale (sites/foto), ninni: «non toccarle»
  vite: { resolve: { alias: [{ find: /^(.*)\/dati\/opere\.json$/, replacement: '$1/dati/opere-v1.json' }] } },
});
