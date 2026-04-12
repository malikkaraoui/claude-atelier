#!/bin/bash
# Hook UserPromptSubmit — Model Routing + Diagnostic périodique
# Routing : à chaque message
# Diagnostic : toutes les 30 minutes (throttle via timestamp)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
THROTTLE_FILE="/tmp/claude-atelier-diagnostic-last"
THROTTLE_SECONDS=1800  # 30 minutes

# ===== ROUTING (chaque message) =====
MODEL="${CLAUDE_MODEL:-inconnu}"
echo "[ROUTING] modèle: $MODEL | Opus→archi | Sonnet→dev | Haiku→exploration"

# ===== DIAGNOSTIC (throttled) =====
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

  # Affichage
  if [ -n "$ISSUES" ]; then
    echo -e "[DIAGNOSTIC]$ISSUES"
  fi
fi
