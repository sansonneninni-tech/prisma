// Galleria — configurazione Astro.
// L'integrazione di @ne/core imposta i18n (it/en/zh, prefisso sempre presente)
// e serve le immagini di siti/assets su /assets/ (in build le copia in dist/assets/).
import { defineConfig } from 'astro/config';
import isabellaCore from '@ne/core/integration';

export default defineConfig({
  site: 'https://ninni-ernesto-libera.netlify.app',
  trailingSlash: 'always',
  integrations: [isabellaCore({ assetFolders: ['opere', 'foto', 'ar'] })],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  build: { inlineStylesheets: 'auto' },
});
