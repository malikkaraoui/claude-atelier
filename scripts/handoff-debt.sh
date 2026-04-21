#!/usr/bin/env bash
# scripts/handoff-debt.sh — Calcule la dette §25 DEPUIS GIT (jamais depuis un JSON)
#
# Source de vérité : git log + docs/handoffs/
# Jamais de compteur /tmp ou de cache éditable.
#
# Usage:
#   bash scripts/handoff-debt.sh           # output texte
#   bash scripts/handoff-debt.sh --json    # output JSON
#   bash scripts/handoff-debt.sh --check   # exit 1 si seuil dépassé (pour pre-push gate)
#
# Définition de "handoff intégré" :
#   1. Fichier dans docs/handoffs/*.md ou *.json (exclus _template)
#   2. .md  : section "## Intégration" avec > 100 chars réels hors template
#      .json : champ "integration" non null avec > 100 chars réels
#   3. Passe le validateur test/validate-handoff.js
#
# Dette = git log <reviewedRange.to>..HEAD --shortstat (recalcul live)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HANDOFF_DIR="$REPO_ROOT/docs/handoffs"

# Seuils (configurables via env)
# Anciens seuils (trop bas → boucle de dette auto-alimentée) :
#   lines=100, commits=3, days=7
# Nouveaux seuils calibrés pour bloquer les vrais oublis, pas l'infra :
THRESHOLD_LINES="${HANDOFF_THRESHOLD_LINES:-300}"
THRESHOLD_COMMITS="${HANDOFF_THRESHOLD_COMMITS:-15}"
THRESHOLD_DAYS="${HANDOFF_THRESHOLD_DAYS:-7}"

MODE="text"
CHECK_ONLY=false
[[ "${1:-}" == "--json" ]] && MODE="json"
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true

# ─── Trouver le dernier handoff intégré ────────────────────────────────────

LATEST_INTEGRATED=""
LATEST_SHA=""

if [[ -d "$HANDOFF_DIR" ]]; then
  # Rassembler tous les handoffs (md + json) dans un tableau puis ls -t en un seul appel
  # (xargs peut fragmenter le tri si la liste dépasse la taille d'argument — fix Copilot)
  _hfiles=()
  while IFS= read -r -d '' _f; do _hfiles+=("$_f"); done < <(
    find "$HANDOFF_DIR" -maxdepth 1 \( -name "202*.md" -o -name "202*.json" \) \
      -not -name "_template*" -print0 2>/dev/null
  )
  SORTED=$([[ ${#_hfiles[@]} -gt 0 ]] && ls -t "${_hfiles[@]}" 2>/dev/null || true)

  while IFS= read -r f; do
    [[ -z "$f" ]] && continue

    # Vérifier intégration selon le format
    CONTENT_LEN=0
    REVIEWED_RANGE=""

    if [[ "$f" == *.json ]]; then
      # Format JSON : lire via python3
      INTEG_CHECK=$(python3 -c "
import json, sys
try:
    d = json.load(open('$f'))
    integ = d.get('integration') or {}
    if isinstance(integ, dict):
        text = json.dumps(integ).replace(' ', '')
        print(len(text))
    else:
        print(0)
except Exception:
    print(0)
" 2>/dev/null || echo 0)
      CONTENT_LEN=$INTEG_CHECK
      if [[ $CONTENT_LEN -gt 100 ]]; then
        REVIEWED_RANGE=$(python3 -c "
import json, sys
try:
    d = json.load(open('$f'))
    print(d.get('meta', {}).get('reviewedRange', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")
      fi
    else
      # Format Markdown
      INTEGRATION=$(awk '/^## Intégration/{flag=1; next} flag' "$f" 2>/dev/null || echo "")
      REAL_CONTENT=$(echo "$INTEGRATION" | sed 's/<!--.*-->//g' | grep -v "^##\|^$" | tr -d '[:space:]' || echo "")
      CONTENT_LEN=${#REAL_CONTENT}
      if [[ $CONTENT_LEN -gt 100 ]]; then
        REVIEWED_RANGE=$(grep -E "^>[[:space:]]*reviewedRange[[:space:]]*:" "$f" 2>/dev/null | head -1 | sed -E 's/^>[[:space:]]*reviewedRange[[:space:]]*:[[:space:]]*//; s/[[:space:]]+$//' || echo "")
      fi
    fi

    if [[ $CONTENT_LEN -gt 100 ]]; then
      if ! node "$REPO_ROOT/test/validate-handoff.js" "$f" >/dev/null 2>&1; then
        continue
      fi
      if [[ "$REVIEWED_RANGE" =~ ^[a-f0-9]{7,40}\.\.[a-f0-9]{7,40}$ ]]; then
        TO_SHA="${REVIEWED_RANGE##*..}"
        LATEST_INTEGRATED="$f"
        LATEST_SHA="$TO_SHA"
        break
      fi
    fi
  done <<< "$SORTED"
fi

# ─── Calculer la dette depuis git ──────────────────────────────────────────

if [[ -z "$LATEST_SHA" ]]; then
  RANGE="HEAD~30..HEAD"
else
  RANGE="${LATEST_SHA}..HEAD"
fi

# Commits dans le range
COMMITS_SINCE=$(git -C "$REPO_ROOT" rev-list --count "$RANGE" 2>/dev/null || echo 0)

# Lignes ajoutées/supprimées dans le range
LINES_ADDED=0
LINES_DELETED=0
if [[ $COMMITS_SINCE -gt 0 ]]; then
  SHORTSTAT=$(git -C "$REPO_ROOT" log "$RANGE" --shortstat --format="" 2>/dev/null | awk '
    /insertion/ { for(i=1;i<=NF;i++) if($i~/^\+?[0-9]+$/ && $(i+1)~/insertion/) ins+=$i }
    /deletion/  { for(i=1;i<=NF;i++) if($i~/^\+?[0-9]+$/ && $(i+1)~/deletion/)  del+=$i }
    END { print (ins+0) " " (del+0) }
  ')
  LINES_ADDED=$(echo "$SHORTSTAT" | awk '{print $1}')
  LINES_DELETED=$(echo "$SHORTSTAT" | awk '{print $2}')
fi

# Jours depuis le dernier handoff intégré
if [[ -n "$LATEST_SHA" ]]; then
  HANDOFF_DATE=$(git -C "$REPO_ROOT" log -1 --format=%ct "$LATEST_SHA" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  DAYS_SINCE=$(( (NOW - HANDOFF_DATE) / 86400 ))
else
  DAYS_SINCE=999
fi

# Dépassement de seuil ?
EXCEEDS=false
REASONS=""
if [[ $LINES_ADDED -ge $THRESHOLD_LINES ]]; then
  EXCEEDS=true
  REASONS="${REASONS}lines_added($LINES_ADDED>=$THRESHOLD_LINES) "
fi
if [[ $COMMITS_SINCE -ge $THRESHOLD_COMMITS ]]; then
  # Compter uniquement les commits qui apportent du code (feat/fix/refactor)
  # Exclure : docs, chore, style, ci, test, build (infra pure)
  FEAT_COUNT=$(git -C "$REPO_ROOT" log "$RANGE" --format=%s 2>/dev/null | grep -cE "^(feat|fix|refactor)" || true)
  if [[ $FEAT_COUNT -ge 2 ]]; then
    EXCEEDS=true
    REASONS="${REASONS}commits($COMMITS_SINCE>=$THRESHOLD_COMMITS, $FEAT_COUNT feat/fix) "
  fi
fi
if [[ $DAYS_SINCE -ge $THRESHOLD_DAYS ]] && [[ $COMMITS_SINCE -gt 0 ]]; then
  EXCEEDS=true
  REASONS="${REASONS}days($DAYS_SINCE>=$THRESHOLD_DAYS) "
fi

# ─── Output ─────────────────────────────────────────────────────────────────

if [[ "$MODE" == "json" ]]; then
  REL_HANDOFF=""
  [[ -n "$LATEST_INTEGRATED" ]] && REL_HANDOFF="${LATEST_INTEGRATED#$REPO_ROOT/}"
  cat <<EOF
{
  "source": "git (jamais un JSON éditable)",
  "lastIntegratedHandoff": {
    "file": "$REL_HANDOFF",
    "sha": "$LATEST_SHA"
  },
  "reviewedRange": "$RANGE",
  "currentDebt": {
    "commitsSince": $COMMITS_SINCE,
    "linesAdded": $LINES_ADDED,
    "linesDeleted": $LINES_DELETED,
    "daysSince": $DAYS_SINCE
  },
  "thresholds": {
    "lines": $THRESHOLD_LINES,
    "commits": $THRESHOLD_COMMITS,
    "days": $THRESHOLD_DAYS
  },
  "exceedsThreshold": $EXCEEDS,
  "reasons": "$REASONS"
}
EOF
elif ! $CHECK_ONLY; then
  echo "Handoff debt (calculé depuis git) :"
  echo "  Dernier handoff intégré : ${LATEST_INTEGRATED:-AUCUN}"
  echo "  Range analysé           : $RANGE"
  echo "  Commits depuis          : $COMMITS_SINCE"
  echo "  Lignes ajoutées         : $LINES_ADDED  (seuil: $THRESHOLD_LINES)"
  echo "  Lignes supprimées       : $LINES_DELETED"
  echo "  Jours depuis handoff    : $DAYS_SINCE  (seuil: $THRESHOLD_DAYS)"
  echo "  Seuil dépassé           : $EXCEEDS"
  [[ -n "$REASONS" ]] && echo "  Raisons                 : $REASONS"
fi

# Exit code
if $EXCEEDS; then
  exit 1
else
  exit 0
fi
