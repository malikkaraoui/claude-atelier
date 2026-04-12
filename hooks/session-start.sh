#!/bin/bash
# Hook SessionStart — Vérification automatique des conditions au démarrage
# Injecté une fois à l'ouverture de la session.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ISSUES=""

# --- 1. Modèle actif ---
MODEL="${CLAUDE_MODEL:-inconnu}"
echo "[SESSION] modèle: $MODEL | règle §15: Opus→archi, Sonnet→dev, Haiku→exploration"

# --- 2. QMD : installé ? indexé ? ---
MD_COUNT=$(find "$REPO_ROOT" -name "*.md" -not -path "*/.git/*" -not -path "*/node_modules/*" | wc -l | tr -d ' ')

if [ "$MD_COUNT" -ge 5 ]; then
  if ! command -v qmd &>/dev/null; then
    ISSUES="${ISSUES}\n⚠️  QMD non installé ($MD_COUNT fichiers .md détectés) → lancer /qmd-init"
  else
    # Vérifier si la collection existe et est à jour
    QMD_STATUS=$(qmd status 2>/dev/null | grep -c "outdated\|Outdated" || true)
    if [ "$QMD_STATUS" -gt 0 ]; then
      ISSUES="${ISSUES}\n⚠️  QMD index obsolète → taper: qmd embed"
    fi
  fi
fi

# --- 3. §0 de CLAUDE.md rempli ? ---
CLAUDE_MD="$REPO_ROOT/src/fr/CLAUDE.md"
if [ -f "$CLAUDE_MD" ]; then
  EMPTY_S0=$(grep -c "| — |" "$CLAUDE_MD" 2>/dev/null || echo 0)
  if [ "$EMPTY_S0" -ge 3 ]; then
    ISSUES="${ISSUES}\n⚠️  §0 CLAUDE.md incomplet ($EMPTY_S0 champs vides) → mettre à jour le contexte projet"
  fi
fi

# --- 4. Handoff récent ? (> 7 jours = suggérer review) ---
HANDOFF_DIR="$REPO_ROOT/docs/handoffs"
if [ -d "$HANDOFF_DIR" ]; then
  LATEST=$(find "$HANDOFF_DIR" -name "*.md" -not -name "_template*" -not -name "README*" -newer "$HANDOFF_DIR/README.md" 2>/dev/null | head -1)
  if [ -z "$LATEST" ]; then
    DAYS_SINCE=$(( ($(date +%s) - $(stat -f %m "$HANDOFF_DIR" 2>/dev/null || echo $(date +%s))) / 86400 ))
    if [ "$DAYS_SINCE" -ge 7 ]; then
      ISSUES="${ISSUES}\n⚠️  Pas de handoff depuis $DAYS_SINCE jours → envisager /review-copilot"
    fi
  fi
fi

# --- 5. Pre-push gate présent ? ---
if [ ! -f "$REPO_ROOT/scripts/pre-push-gate.sh" ]; then
  ISSUES="${ISSUES}\n⚠️  pre-push-gate.sh manquant → git push non protégé"
fi

# --- Affichage ---
if [ -n "$ISSUES" ]; then
  echo -e "[SESSION] Points à vérifier :$ISSUES"
else
  echo "[SESSION] ✓ Tout est en ordre."
fi
