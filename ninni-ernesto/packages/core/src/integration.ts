/**
 * Astro integration shared by the three sites.
 *
 *   import isabellaCore from '@ne/core/integration';
 *   export default defineConfig({ integrations: [isabellaCore()] });
 *
 * - Sets Astro i18n (it default, en, zh; every URL prefixed).
 * - Serves `siti/assets/` at `/assets/` in dev and copies it into `dist/assets/` on build
 *   (only the folders listed in `assetFolders`, default `opere`, `foto`, `ar`).
 * - Writes Netlify `_headers` rules so 3D models get the right content type
 *   (`.usdz` → `model/vnd.usdz+zip`, required by iOS Quick Look; `.glb` → `model/gltf-binary`)
 *   and assets are cached. If the site has its own `public/_headers`, the rules are appended.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { appendFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { astroI18nConfig } from './i18n/config.ts';

export interface IsabellaCoreOptions {
  /** Absolute path of the assets folder. Default: `siti/assets` (two levels above this package). */
  assetsDir?: string;
  /** Sub-folders of the assets folder copied into the build (default `['opere', 'foto', 'ar']`). */
  assetFolders?: string[];
  /** Public URL prefix (must match `PUBLIC_ISA_ASSETS_BASE`, default `/assets/`). */
  publicPath?: string;
  /** Set Astro i18n automatically (default true). */
  i18n?: boolean;
  /** Write Netlify `_headers` rules for the assets (default true). */
  netlifyHeaders?: boolean;
}

/** Content types served in dev (and declared in `_headers` for the 3D models). */
export const ASSET_MIME: Record<string, string> = {
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.usdz': 'model/vnd.usdz+zip',
};

const HEADERS_MARKER = '# @ne/core assets';

/** Netlify `_headers` block for the assets folder. */
export function netlifyHeadersFor(publicPath: string): string {
  return [
    HEADERS_MARKER,
    `${publicPath}*`,
    '  Cache-Control: public, max-age=604800',
    `${publicPath}ar/*.usdz`,
    '  Content-Type: model/vnd.usdz+zip',
    `${publicPath}ar/*.glb`,
    '  Content-Type: model/gltf-binary',
    '',
  ].join('\n');
}

export default function isabellaCore(options: IsabellaCoreOptions = {}): AstroIntegration {
  const here = dirname(fileURLToPath(import.meta.url));
  const assetsDir = options.assetsDir ?? resolve(here, '../../../assets');
  const folders = options.assetFolders ?? ['opere', 'foto', 'ar'];
  const publicPath = `/${(options.publicPath ?? '/assets/').replace(/^\/+|\/+$/g, '')}/`;

  return {
    name: '@ne/core',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, logger }) => {
        if (!existsSync(assetsDir)) logger.warn(`assets folder not found: ${assetsDir}`);
        updateConfig({
          ...(options.i18n === false
            ? {}
            : { i18n: { ...astroI18nConfig, locales: [...astroI18nConfig.locales], routing: { ...astroI18nConfig.routing } } }),
          vite: {
            define: {
              'import.meta.env.PUBLIC_ISA_ASSETS_BASE': JSON.stringify(publicPath),
              'import.meta.env.PUBLIC_ISA_TRAILING_SLASH': JSON.stringify(config.trailingSlash),
            },
          },
        });
      },

      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split('?')[0] ?? '';
          if (!url.startsWith(publicPath)) return next();
          let relative: string;
          try {
            relative = decodeURIComponent(url.slice(publicPath.length));
          } catch {
            return next();
          }
          const file = normalize(join(assetsDir, relative));
          if (!file.startsWith(assetsDir + sep) || !existsSync(file) || !statSync(file).isFile()) return next();
          res.setHeader('Content-Type', ASSET_MIME[extname(file).toLowerCase()] ?? 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          createReadStream(file).pipe(res);
        });
      },

      'astro:build:done': async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const out = join(distDir, publicPath);
        await mkdir(out, { recursive: true });
        for (const folder of folders) {
          const from = join(assetsDir, folder);
          if (!existsSync(from)) continue;
          await cp(from, join(out, folder), { recursive: true, dereference: true });
        }
        logger.info(`copied assets (${folders.join(', ')}) to ${publicPath}`);

        if (options.netlifyHeaders !== false) {
          const headersFile = join(distDir, '_headers');
          const existing = existsSync(headersFile) ? await readFile(headersFile, 'utf8') : '';
          if (!existing.includes(HEADERS_MARKER)) {
            if (existing) await appendFile(headersFile, `\n${netlifyHeadersFor(publicPath)}`);
            else await writeFile(headersFile, netlifyHeadersFor(publicPath));
            logger.info('wrote Netlify _headers (3D model content types, caching)');
          }
        }
      },
    },
  };
}
