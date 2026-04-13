#!/bin/bash
# PreToolUse guard — §13 : jamais signer les commits
# Bloque si Co-Authored-By ou Signed-off-by détecté dans un git commit

source "$(dirname "$0")/_parse-input.sh"

if echo "$HOOK_COMMAND" | grep -qi "git commit"; then
  if echo "$HOOK_COMMAND" | grep -qi "Co-Authored-By\|Signed-off-by\|--signoff\|-s "; then
    echo "BLOCKED"
    echo "§13 : jamais signer les commits. Pas de Co-Authored-By, Signed-off-by, ni --signoff."
    exit 2
  fi
fi
