#!/bin/bash
# SessionStart hook — capture le modèle actif dans un fichier tmp

set -eu

# shellcheck source=/dev/null
source "$(dirname "$0")/_parse-input.sh"

if [ -n "${HOOK_MODEL:-}" ]; then
  printf '%s\n' "$HOOK_MODEL" > /tmp/claude-atelier-current-model
fi
