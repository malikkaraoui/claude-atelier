#!/bin/bash
# PreToolUse guard — §11/§24 : tests avant push
# Bloque git push si aucun test n'a tourné dans la session

TESTS_RAN_FILE="/tmp/claude-atelier-tests-ran"
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//;s/"$//')

# Marquer que des tests ont tourné
if echo "$COMMAND" | grep -qiE "npm test|npm run test|jest|vitest|pytest|mvn test|gradle test"; then
  date +%s > "$TESTS_RAN_FILE"
fi

# Bloquer push sans tests
if echo "$COMMAND" | grep -qi "git push"; then
  if [ ! -f "$TESTS_RAN_FILE" ]; then
    echo "BLOCKED"
    echo "§11/§24 : tests obligatoires avant push. Aucun test détecté dans cette session."
    exit 2
  fi
fi
