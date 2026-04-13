#!/bin/bash
# PostToolUse guard — §13 : jamais signer les commits
# Bloque si Co-Authored-By ou Signed-off-by détecté dans un git commit

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | sed -n 's/.*"tool_input"[[:space:]]*:[[:space:]]*{[^}]*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
if [ -z "$COMMAND" ]; then
  COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//;s/"$//')
fi

if echo "$COMMAND" | grep -qi "git commit"; then
  if echo "$COMMAND" | grep -qi "Co-Authored-By\|Signed-off-by\|--signoff\|-s"; then
    echo "BLOCKED"
    echo "§13 : jamais signer les commits. Pas de Co-Authored-By, Signed-off-by, ni --signoff."
    exit 2
  fi
fi
