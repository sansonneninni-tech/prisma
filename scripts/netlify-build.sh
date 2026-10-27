#!/usr/bin/env bash
# Un solo repo, due progetti Netlify: il progetto "ninni-ernesto" costruisce il sito foto, tutti gli altri PRISMA.
set -euo pipefail
if [ "${SITE_NAME:-}" = "ninni-ernesto" ]; then
  cd ninni-ernesto
  npm ci --no-audit --no-fund
  npm run build
  cd ..
  rm -rf dist
  cp -R ninni-ernesto/sites/foto/dist dist
else
  npm run build
fi
