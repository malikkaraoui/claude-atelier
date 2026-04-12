#!/bin/bash
# PostToolUse guard — §25 : review auto si 100+ lignes modifiées
# Après un git commit, compte les lignes changées depuis le dernier check

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COUNTER_FILE="/tmp/claude-atelier-lines-since-review"
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//;s/"$//')

if echo "$COMMAND" | grep -qi "git commit"; then
  # Compter les lignes du dernier commit
  LINES=$(cd "$REPO_ROOT" && git diff --shortstat HEAD~1 HEAD 2>/dev/null | grep -oE '[0-9]+ insertion|[0-9]+ deletion' | grep -oE '[0-9]+' | paste -sd+ - | bc 2>/dev/null || echo 0)

  # Accumuler
  PREV=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
  TOTAL=$((PREV + LINES))
  echo "$TOTAL" > "$COUNTER_FILE"

  if [ "$TOTAL" -ge 100 ]; then
    echo "§25 : $TOTAL lignes modifiées depuis la dernière review. Proposer /review-copilot à Malik."
    echo "0" > "$COUNTER_FILE"  # Reset après alerte
  fi
fi
