#!/bin/bash
# PreToolUse + PostToolUse guard — §25 : review oracle local
# Gate : bloque git push si diff ≥ THRESHOLD lignes et review absente
# Challenger : suggestions post-commit (non bloquant)

source "$(dirname "$0")/_parse-input.sh"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
_FF="$REPO_ROOT/.claude/features.json"
python3 -c "import json,sys,os; d=json.load(open(sys.argv[1])) if os.path.exists(sys.argv[1]) else {}; sys.exit(0 if d.get(sys.argv[2],True) else 1)" "$_FF" "review_oracle" 2>/dev/null || exit 0

REVIEW_FLAG="/tmp/claude-atelier-review-done"
LINES_FILE="/tmp/claude-atelier-lines-since-review"
COMMITS_FILE="/tmp/claude-atelier-commits-since-review"
FAIL_FILE="/tmp/claude-atelier-fix-attempts"
THRESHOLD=50

# ===== GATE : git push → bloquer si review absente et diff ≥ THRESHOLD =====
if echo "$HOOK_COMMAND" | grep -qE "git push"; then
  if [ ! -f "$REVIEW_FLAG" ]; then
    # Env override pour tests ; sinon calcul réel depuis upstream
    LINES="${REVIEW_ORACLE_TEST_LINES:-}"
    if [ -z "$LINES" ]; then
      LINES=$(cd "$REPO_ROOT" && git diff --shortstat "@{u}" HEAD 2>/dev/null | grep -oE '[0-9]+' | paste -sd+ - | bc 2>/dev/null || \
              git diff --shortstat HEAD~1 HEAD 2>/dev/null | grep -oE '[0-9]+' | paste -sd+ - | bc 2>/dev/null || echo 0)
    fi

    if [ "${LINES:-0}" -ge "$THRESHOLD" ]; then
      printf '\n⛔ [REVIEW-ORACLE] %s lignes non reviewées.\n' "$LINES"
      printf '   git push bloqué — lance /review-oracle avant de pusher.\n'
      printf '   /review-oracle pose le flag et déverrouille le push.\n\n'
      exit 2
    fi
  else
    # Flag présent → push autorisé, effacer le flag + reset compteurs
    rm -f "$REVIEW_FLAG" 2>/dev/null || true
    echo "0" > "$LINES_FILE"
    echo "0" > "$COMMITS_FILE"
  fi
fi

# ===== CHALLENGER : git commit → suggestions (non bloquant) =====
if echo "$HOOK_COMMAND" | grep -qi "git commit"; then

  # Volume lignes
  LINES=$(cd "$REPO_ROOT" && git diff --shortstat HEAD~1 HEAD 2>/dev/null | grep -oE '[0-9]+ insertion|[0-9]+ deletion' | grep -oE '[0-9]+' | paste -sd+ - | bc 2>/dev/null || echo 0)
  PREV=$(cat "$LINES_FILE" 2>/dev/null || echo 0)
  TOTAL=$((PREV + LINES))
  echo "$TOTAL" > "$LINES_FILE"

  if [ "$TOTAL" -ge 300 ]; then
    echo ""
    echo "📋 [CHALLENGER] $TOTAL lignes modifiées — review oracle recommandée."
    echo "   → /review-oracle — analyse multi-agents indépendante"
    echo "   → /angle-mort — auto-review anti-complaisance"
    echo ""
  fi

  # Feature / Refactor
  COMMIT_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%s 2>/dev/null || echo "")
  FEATURE_DONE=false
  if echo "$COMMIT_MSG" | grep -qiE "^feat:|^feature|^refactor:"; then
    FEATURE_DONE=true
  fi

  PREV_COMMITS=$(cat "$COMMITS_FILE" 2>/dev/null || echo 0)
  COMMITS=$((PREV_COMMITS + 1))
  echo "$COMMITS" > "$COMMITS_FILE"

  if [ "$FEATURE_DONE" = true ]; then
    TEST_CHANGES=$(cd "$REPO_ROOT" && git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -cE "^test/" || echo 0)
    if [ "${TEST_CHANGES:-0}" -eq 0 ]; then
      echo ""
      echo "🧪 Feat sans tests → \"$COMMIT_MSG\" → test/hooks.js"
      echo ""
    fi
    echo "📋 [CHALLENGER] Feature : \"$COMMIT_MSG\""
    echo "   → /review-oracle avant de continuer"
    echo ""
  elif [ "$COMMITS" -ge 10 ]; then
    echo ""
    echo "📋 [CHALLENGER] $COMMITS commits sans review oracle — angles morts accumulés."
    echo "   → /review-oracle ou /angle-mort"
    echo ""
  fi

  # Fichiers architecturaux
  NEW_FILES=$(cd "$REPO_ROOT" && git diff --name-only --diff-filter=A HEAD~1 HEAD 2>/dev/null || echo "")
  ARCHI_FILES=""
  for f in $NEW_FILES; do
    case "$f" in
      src/stacks/*|src/skills/*/SKILL.md|hooks/*|.github/workflows/*|src/fr/ecosystem/*|src/fr/orchestration/*)
        ARCHI_FILES="$ARCHI_FILES $f"
        ;;
    esac
  done
  if [ -n "$ARCHI_FILES" ]; then
    echo ""
    echo "🏗️  [CHALLENGER] Fichier(s) architecturaux créés :$ARCHI_FILES"
    echo "   → /review-oracle pour validation"
    echo ""
  fi
fi

# ===== TRIGGER : échec répété =====
if [ "$HOOK_EXIT_CODE" != "0" ] && [ -n "$HOOK_COMMAND" ]; then
  CMD_HASH=$(echo "$HOOK_COMMAND" | tr -s ' ' | md5 -q 2>/dev/null || echo "$HOOK_COMMAND" | tr -s ' ' | md5sum 2>/dev/null | cut -d' ' -f1)
  PREV_HASH=$(head -1 "$FAIL_FILE" 2>/dev/null || echo "")
  PREV_COUNT=$(tail -1 "$FAIL_FILE" 2>/dev/null || echo 0)

  if [ "$CMD_HASH" = "$PREV_HASH" ]; then
    COUNT=$((PREV_COUNT + 1))
  else
    COUNT=1
  fi
  echo "$CMD_HASH" > "$FAIL_FILE"
  echo "$COUNT" >> "$FAIL_FILE"

  if [ "$COUNT" -ge 3 ]; then
    echo ""
    echo "🚨 [CHALLENGER] $COUNT tentatives échouées. STOP."
    echo "   → /review-oracle avec le contexte d'erreur"
    echo "   → Changer d'approche complètement"
    echo ""
    echo "" > "$FAIL_FILE"
  fi
else
  if [ -f "$FAIL_FILE" ]; then
    echo "" > "$FAIL_FILE"
  fi
fi
