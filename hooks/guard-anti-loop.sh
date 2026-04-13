#!/bin/bash
# PostToolUse guard — §6 : anti-boucle >3 tentatives identiques

source "$(dirname "$0")/_parse-input.sh"

LOOP_FILE="/tmp/claude-atelier-loop-detect"

if [ -z "$HOOK_COMMAND" ]; then
  exit 0
fi

CMD_HASH=$(echo "$HOOK_COMMAND" | tr -s ' ' | md5 -q 2>/dev/null || echo "$HOOK_COMMAND" | tr -s ' ' | md5sum 2>/dev/null | cut -d' ' -f1)

if [ "$HOOK_EXIT_CODE" != "0" ]; then
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
