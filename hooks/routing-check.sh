#!/bin/bash
# Hook UserPromptSubmit — Model Routing + Détection stack + Diagnostic périodique

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
THROTTLE_FILE="/tmp/claude-atelier-diagnostic-last"
THROTTLE_SECONDS=1800  # 30 minutes

# Lire le message utilisateur (JSON stdin)
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | grep -o '"prompt"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/"prompt"[[:space:]]*:[[:space:]]*"//;s/"$//' 2>/dev/null || echo "")

# ===== ROUTING (chaque message) =====
MODEL_FILE="/tmp/claude-atelier-current-model"
MODEL=$(cat "$MODEL_FILE" 2>/dev/null || echo "inconnu")

# Détecter le tier pour recommander un switch
TIER=""
ALERT=""
case "$MODEL" in
  *opus*) TIER="Opus (archi)" ;;
  *sonnet*) TIER="Sonnet (dev)" ;;
  *haiku*) TIER="Haiku (exploration)" ;;
  *) TIER="inconnu" ;;
esac

echo "[ROUTING] modèle actif: $MODEL ($TIER)"
echo "  Opus→archi/décision | Sonnet→dev quotidien | Haiku→exploration/lint"

# Alerte si Opus sur tâche courante (heuristique: message court = tâche simple)
PROMPT_LEN=${#PROMPT}
if echo "$MODEL" | grep -qi "opus"; then
  if [ "$PROMPT_LEN" -lt 100 ]; then
    echo "  ⚠️  Tu es sur Opus pour un message court. Sonnet suffirait → /model sonnet"
  fi
fi

# ===== DÉTECTION STACK (chaque message) =====
# iOS / Xcode
if echo "$PROMPT" | grep -qiE "xcode|ios|tvos|ipados|swiftui|swift|simctl|xcodebuild|iphone|ipad|app store|testflight|make run|make tvrun"; then
  STACK_FILE="$REPO_ROOT/src/stacks/ios-xcode.md"
  if [ -f "$STACK_FILE" ]; then
    echo "[STEVE] 🍎 Chantier Apple détecté. Steve prend le relais — satellite chargé."
    cat "$STACK_FILE"
  fi
fi

# NPM Publish
if echo "$PROMPT" | grep -qiE "npm publish|npm version|npmjs|npm token|npm tag|registry|package\.json version|npm pack"; then
  STACK_FILE="$REPO_ROOT/src/stacks/npm-publish.md"
  if [ -f "$STACK_FILE" ]; then
    echo "[MARCEL] 📦 Livraison npm détectée. Isaac prend le relais — satellite chargé."
    cat "$STACK_FILE"
  fi
fi

# ===== DIAGNOSTIC (throttled toutes les 30 min) =====
RUN_DIAGNOSTIC=false
if [ ! -f "$THROTTLE_FILE" ]; then
  RUN_DIAGNOSTIC=true
else
  LAST_RUN=$(cat "$THROTTLE_FILE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  ELAPSED=$(( NOW - LAST_RUN ))
  if [ "$ELAPSED" -ge "$THROTTLE_SECONDS" ]; then
    RUN_DIAGNOSTIC=true
  fi
fi

if [ "$RUN_DIAGNOSTIC" = true ]; then
  date +%s > "$THROTTLE_FILE"
  ISSUES=""

  # 1. QMD
  MD_COUNT=$(find "$REPO_ROOT" -name "*.md" -not -path "*/.git/*" -not -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$MD_COUNT" -ge 5 ]; then
    if ! command -v qmd &>/dev/null; then
      ISSUES="${ISSUES}\n⚠️  QMD non installé ($MD_COUNT .md) → /qmd-init"
    else
      QMD_STATUS=$(qmd status 2>/dev/null | grep -c "outdated\|Outdated" || true)
      if [ "$QMD_STATUS" -gt 0 ]; then
        ISSUES="${ISSUES}\n⚠️  QMD index obsolète → qmd embed"
      fi
    fi
  fi

  # 2. §0 CLAUDE.md
  CLAUDE_MD="$REPO_ROOT/src/fr/CLAUDE.md"
  if [ -f "$CLAUDE_MD" ]; then
    EMPTY_S0=$(grep -c "| — |" "$CLAUDE_MD" 2>/dev/null || echo 0)
    if [ "$EMPTY_S0" -ge 3 ]; then
      ISSUES="${ISSUES}\n⚠️  §0 incomplet ($EMPTY_S0 champs vides)"
    fi
  fi

  # 3. Handoff récent
  HANDOFF_DIR="$REPO_ROOT/docs/handoffs"
  if [ -d "$HANDOFF_DIR" ]; then
    LATEST_HANDOFF=$(find "$HANDOFF_DIR" -name "202*.md" -not -name "_template*" 2>/dev/null | sort -r | head -1)
    if [ -n "$LATEST_HANDOFF" ]; then
      DAYS_SINCE=$(( ($(date +%s) - $(stat -f %m "$LATEST_HANDOFF" 2>/dev/null || echo $(date +%s))) / 86400 ))
      if [ "$DAYS_SINCE" -ge 7 ]; then
        ISSUES="${ISSUES}\n⚠️  Dernier handoff il y a $DAYS_SINCE jours → /review-copilot"
      fi
    fi
  fi

  # 4. Pre-push gate
  if [ ! -f "$REPO_ROOT/scripts/pre-push-gate.sh" ]; then
    ISSUES="${ISSUES}\n⚠️  pre-push-gate.sh manquant"
  fi

  # 5. Mise à jour claude-atelier disponible
  PKG_JSON="$REPO_ROOT/node_modules/claude-atelier/package.json"
  if [ -f "$PKG_JSON" ]; then
    LOCAL_VERSION=$(node -p "require('$PKG_JSON').version" 2>/dev/null || echo "")
    if [ -n "$LOCAL_VERSION" ]; then
      LATEST_VERSION=$(npm view claude-atelier version 2>/dev/null || echo "")
      if [ -n "$LATEST_VERSION" ] && [ "$LOCAL_VERSION" != "$LATEST_VERSION" ]; then
        ISSUES="${ISSUES}\n🆕 claude-atelier $LOCAL_VERSION → $LATEST_VERSION disponible → npx claude-atelier update"
      fi
    fi
  fi

  if [ -n "$ISSUES" ]; then
    echo -e "[DIAGNOSTIC]$ISSUES"
  fi
fi
