#!/bin/bash
# PostToolUse guard — §3/§25 : review auto + angle-mort aux moments clés
# Après un git commit :
#   - Compte les lignes changées, alerte à 100+ → /review-copilot
#   - Détecte les moments clés → rappel /angle-mort

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COUNTER_FILE="/tmp/claude-atelier-lines-since-review"
COMMIT_COUNT_FILE="/tmp/claude-atelier-commits-since-anglemort"
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//;s/"$//')

if echo "$COMMAND" | grep -qi "git commit"; then
  # --- §25 : compteur de lignes ---
  LINES=$(cd "$REPO_ROOT" && git diff --shortstat HEAD~1 HEAD 2>/dev/null | grep -oE '[0-9]+ insertion|[0-9]+ deletion' | grep -oE '[0-9]+' | paste -sd+ - | bc 2>/dev/null || echo 0)

  PREV=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
  TOTAL=$((PREV + LINES))
  echo "$TOTAL" > "$COUNTER_FILE"

  if [ "$TOTAL" -ge 100 ]; then
    echo "§25 : $TOTAL lignes modifiées depuis la dernière review → proposer /review-copilot"
    echo "0" > "$COUNTER_FILE"
  fi

  # --- §3 : angle-mort aux moments clés ---
  # Détecter les messages de commit qui signalent une feature terminée
  COMMIT_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%s 2>/dev/null || echo "")
  FEATURE_DONE=false

  # Mots-clés de feature terminée dans le message de commit
  if echo "$COMMIT_MSG" | grep -qiE "feat:|feature|termine|complet|implemente|refactor:"; then
    FEATURE_DONE=true
  fi

  # Compteur de commits depuis dernier angle-mort
  PREV_COMMITS=$(cat "$COMMIT_COUNT_FILE" 2>/dev/null || echo 0)
  COMMITS=$((PREV_COMMITS + 1))
  echo "$COMMITS" > "$COMMIT_COUNT_FILE"

  # Rappel /angle-mort si feature terminée OU 10+ commits sans review
  if [ "$FEATURE_DONE" = true ]; then
    echo "§3 : feature détectée dans le commit. Moment clé → envisager /angle-mort avant de continuer."
    echo "0" > "$COMMIT_COUNT_FILE"
  elif [ "$COMMITS" -ge 10 ]; then
    echo "§3 : $COMMITS commits sans /angle-mort. Pause recommandée → /angle-mort"
    echo "0" > "$COMMIT_COUNT_FILE"
  fi
fi
