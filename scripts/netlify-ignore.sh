#!/usr/bin/env bash
# Netlify chiama questo script prima di ogni build: exit 0 = salta, exit 1 = costruisci.
# Ogni pubblicazione costa crediti, quindi ogni progetto si ricostruisce solo se è cambiato il suo codice.
set -uo pipefail
PREV="${CACHED_COMMIT_REF:-}"
CUR="${COMMIT_REF:-HEAD}"
# primo deploy o storia non disponibile: costruisci
if [ -z "$PREV" ] || ! git cat-file -e "$PREV" 2>/dev/null; then exit 1; fi
COMUNI="scripts/netlify-build.sh"
NE="ninni-ernesto/packages ninni-ernesto/dati ninni-ernesto/assets ninni-ernesto/package.json ninni-ernesto/package-lock.json ninni-ernesto/tsconfig.base.json"
case "${SITE_NAME:-}" in
  ninni-ernesto) PERCORSI="$COMUNI $NE ninni-ernesto/sites/foto" ;;
  ninni-ernesto-libera) PERCORSI="$COMUNI $NE ninni-ernesto/sites/libera" ;;
  ninni-ernesto-ispirata) PERCORSI="$COMUNI $NE ninni-ernesto/sites/ispirata" ;;
  *)
    # PRISMA: tutto tranne ninni-ernesto/
    if git diff --quiet "$PREV" "$CUR" -- . ':(exclude)ninni-ernesto'; then exit 0; else exit 1; fi ;;
esac
# shellcheck disable=SC2086
if git diff --quiet "$PREV" "$CUR" -- $PERCORSI; then exit 0; else exit 1; fi
