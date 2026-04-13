#!/bin/bash
# PostToolUse guard — §6 : anti-boucle >3 tentatives identiques
# Doublon volontaire de guard-review-auto.sh Trigger 2
# Ce hook tourne sur TOUTES les commandes bash (pas seulement git commit)
# pour détecter les boucles même hors contexte git

LOOP_FILE="/tmp/claude-atelier-loop-detect"
INPUT=$(cat)

COMMAND=$(echo "$INPUT" | sed -n 's/.*"tool_input"[[:space:]]*:[[:space:]]*{[^}]*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
if [ -z "$COMMAND" ]; then
  COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//;s/"$//')
fi

EXIT_CODE=$(echo "$INPUT" | grep -o '"exitCode"[[:space:]]*:[[:space:]]*[0-9]*' | grep -oE '[0-9]+$' || echo "")
if [ -z "$EXIT_CODE" ]; then
  EXIT_CODE=$(echo "$INPUT" | grep -o '"exit_code"[[:space:]]*:[[:space:]]*[0-9]*' | grep -oE '[0-9]+$' || echo "0")
fi

if [ -z "$COMMAND" ]; then
  exit 0
fi

CMD_HASH=$(echo "$COMMAND" | tr -s ' ' | md5 -q 2>/dev/null || echo "$COMMAND" | tr -s ' ' | md5sum 2>/dev/null | cut -d' ' -f1)

if [ "$EXIT_CODE" != "0" ]; then
  PREV_HASH=$(head -1 "$LOOP_FILE" 2>/dev/null || echo "")
  PREV_COUNT=$(tail -1 "$LOOP_FILE" 2>/dev/null || echo 0)

  if [ "$CMD_HASH" = "$PREV_HASH" ]; then
    COUNT=$((PREV_COUNT + 1))
  else
    COUNT=1
  fi

  echo "$CMD_HASH" > "$LOOP_FILE"
  echo "$COUNT" >> "$LOOP_FILE"

  if [ "$COUNT" -ge 3 ]; then
    echo "§6 : $COUNT tentatives échouées sur la même commande. STOP. Changer d'approche."
    echo "" > "$LOOP_FILE"
  fi
else
  echo "" > "$LOOP_FILE"
fi
