#!/bin/bash
# PostToolUse guard — Système Challenger
# Détecte les moments où un coéquipier (Copilot/GPT) devrait intervenir :
#   - Review code : 100+ lignes modifiées sans review
#   - Angle mort : feature/refactor terminé sans challenge
#   - Bug help : 3+ tentatives échouées sur le même problème
#   - README : feature ajoutée sans mise à jour vitrine
#   - Architecture : nouveau fichier structurant créé sans validation

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LINES_FILE="/tmp/claude-atelier-lines-since-review"
COMMITS_FILE="/tmp/claude-atelier-commits-since-anglemort"
FAIL_FILE="/tmp/claude-atelier-fix-attempts"

INPUT=$(cat)

# Parse tool_input.command (PostToolUse Bash)
COMMAND=$(echo "$INPUT" | sed -n 's/.*"tool_input"[[:space:]]*:[[:space:]]*{[^}]*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
if [ -z "$COMMAND" ]; then
  COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//;s/"$//')
fi

# ===================================================================
# TRIGGER 1 : git commit détecté
# ===================================================================
if echo "$COMMAND" | grep -qi "git commit"; then

  # --- Compteur de lignes → /review-copilot ---
  LINES=$(cd "$REPO_ROOT" && git diff --shortstat HEAD~1 HEAD 2>/dev/null | grep -oE '[0-9]+ insertion|[0-9]+ deletion' | grep -oE '[0-9]+' | paste -sd+ - | bc 2>/dev/null || echo 0)
  PREV=$(cat "$LINES_FILE" 2>/dev/null || echo 0)
  TOTAL=$((PREV + LINES))
  echo "$TOTAL" > "$LINES_FILE"

  if [ "$TOTAL" -ge 100 ]; then
    echo ""
    echo "🔍 [CHALLENGER] $TOTAL lignes modifiées depuis la dernière review."
    echo "   Tu as la tête dans le guidon — un coéquipier verrait ce que tu ne vois plus."
    echo "   → /review-copilot pour un handoff review externe"
    echo "   → /angle-mort pour une auto-review anti-complaisance"
    echo ""
    echo "0" > "$LINES_FILE"
  fi

  # --- Détection feature/refactor → /angle-mort ---
  COMMIT_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%s 2>/dev/null || echo "")
  FEATURE_DONE=false

  if echo "$COMMIT_MSG" | grep -qiE "^feat:|^feature|^refactor:"; then
    FEATURE_DONE=true
  fi

  PREV_COMMITS=$(cat "$COMMITS_FILE" 2>/dev/null || echo 0)
  COMMITS=$((PREV_COMMITS + 1))
  echo "$COMMITS" > "$COMMITS_FILE"

  if [ "$FEATURE_DONE" = true ]; then
    echo ""
    echo "🎯 [CHALLENGER] Feature/refactor détecté : \"$COMMIT_MSG\""
    echo "   C'est le moment de challenger ce travail AVANT de continuer."
    echo "   → /angle-mort — review anti-complaisance (miroir dur)"
    echo "   → /review-copilot — handoff pour un autre LLM"
    echo ""
    echo "   📋 README : vérifier que cette feature est reflétée dans README.md (FR + EN)"
    echo ""
    echo "0" > "$COMMITS_FILE"
  elif [ "$COMMITS" -ge 10 ]; then
    echo ""
    echo "⏰ [CHALLENGER] $COMMITS commits sans challenge externe."
    echo "   Trop longtemps seul sur le code — les angles morts s'accumulent."
    echo "   → /angle-mort ou /review-copilot"
    echo ""
    echo "0" > "$COMMITS_FILE"
  fi

  # --- Détection architecture : nouveaux fichiers structurants ---
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
    echo "🏗️  [CHALLENGER] Fichier(s) architecturaux créé(s) :$ARCHI_FILES"
    echo "   Un choix d'architecture mérite un deuxième regard."
    echo "   → /review-copilot pour validation externe"
    echo ""
  fi
fi

# ===================================================================
# TRIGGER 2 : échec répété → proposer aide externe
# ===================================================================
# Récupérer le code de sortie
EXIT_CODE=$(echo "$INPUT" | grep -o '"exitCode"[[:space:]]*:[[:space:]]*[0-9]*' | grep -oE '[0-9]+$' || echo "")
if [ -z "$EXIT_CODE" ]; then
  EXIT_CODE=$(echo "$INPUT" | grep -o '"exit_code"[[:space:]]*:[[:space:]]*[0-9]*' | grep -oE '[0-9]+$' || echo "0")
fi

if [ "$EXIT_CODE" != "0" ] && [ -n "$COMMAND" ]; then
  # Hash de la commande pour tracker les tentatives
  CMD_HASH=$(echo "$COMMAND" | tr -s ' ' | md5 -q 2>/dev/null || echo "$COMMAND" | tr -s ' ' | md5sum 2>/dev/null | cut -d' ' -f1)

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
    echo "🚨 [CHALLENGER] $COUNT tentatives échouées sur la même commande."
    echo "   STOP. Tu tournes en rond."
    echo "   → /review-copilot avec le contexte d'erreur — un autre LLM verra peut-être ce que tu rates"
    echo "   → Changer d'approche complètement"
    echo "   → Décomposer le problème en sous-problèmes"
    echo ""
    echo "" > "$FAIL_FILE"
  fi
else
  # Commande réussie → reset compteur d'échecs
  if [ -f "$FAIL_FILE" ]; then
    echo "" > "$FAIL_FILE"
  fi
fi
