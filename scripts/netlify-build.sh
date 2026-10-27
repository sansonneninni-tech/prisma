#!/usr/bin/env bash
# Un solo repo, più progetti Netlify. Il nome del progetto (SITE_NAME, impostato da Netlify) sceglie il sito:
#   ninni-ernesto           → ninni-ernesto/sites/foto      (versione attuale)
#   ninni-ernesto-libera    → ninni-ernesto/sites/libera    (versione libera)
#   ninni-ernesto-ispirata  → ninni-ernesto/sites/ispirata  (versione ispirata a Luke & Nik)
#   qualsiasi altro         → PRISMA (radice del repo)
set -euo pipefail
case "${SITE_NAME:-}" in
  ninni-ernesto) SITO=foto ;;
  ninni-ernesto-libera) SITO=libera ;;
  ninni-ernesto-ispirata) SITO=ispirata ;;
  *) SITO= ;;
esac
if [ -n "$SITO" ]; then
  cd ninni-ernesto
  npm ci --no-audit --no-fund
  npm run build -w "sites/$SITO"
  cd ..
  rm -rf dist
  cp -R "ninni-ernesto/sites/$SITO/dist" dist
else
  npm run build
fi
