#!/bin/bash
# SessionStart hook — capture le modèle actif dans un fichier tmp.
#
# Garde-fou #1 contre corruption cache post-compaction :
# si source == "compact" et pas de HOOK_MODEL live → invalider le cache
# pour éviter qu'une valeur stale (héritée du transcript tronqué) persiste.

set -eu

# shellcheck source=/dev/null
source "$(dirname "$0")/_parse-input.sh"

CACHE_FILE=/tmp/claude-atelier-current-model

if [ -n "${HOOK_MODEL:-}" ]; then
  # Vérité runtime disponible → écrire cache
  printf '%s\n' "$HOOK_MODEL" > "$CACHE_FILE"
elif [ "${HOOK_SOURCE:-}" = "compact" ]; then
  # Compact sans model live → invalider cache (force re-détection au prochain message)
  rm -f "$CACHE_FILE"
fi
