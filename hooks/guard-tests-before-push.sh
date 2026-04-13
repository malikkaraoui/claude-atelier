#!/bin/bash
# PreToolUse + PostToolUse guard — §11/§24 : tests avant push
# Marque quand des tests tournent, bloque push si aucun test n'a tourné

source "$(dirname "$0")/_parse-input.sh"

TESTS_RAN_FILE="/tmp/claude-atelier-tests-ran"

# Marquer que des tests ont tourné
if echo "$HOOK_COMMAND" | grep -qiE "npm test|npm run test|jest|vitest|pytest|mvn test|gradle test"; then
  date +%s > "$TESTS_RAN_FILE"
fi

# Bloquer push sans tests — seulement si un test runner existe dans le projet
if echo "$HOOK_COMMAND" | grep -qi "git push"; then
  if [ -f "package.json" ] || [ -f "setup.py" ] || [ -f "pyproject.toml" ] || [ -f "pom.xml" ] || [ -f "build.gradle" ] || [ -f "Cargo.toml" ] || [ -f "Makefile" ]; then
    if [ ! -f "$TESTS_RAN_FILE" ]; then
      echo "BLOCKED"
      echo "§11/§24 : tests obligatoires avant push. Aucun test détecté dans cette session."
      exit 2
    fi
  fi
fi
