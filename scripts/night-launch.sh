#!/usr/bin/env bash
# scripts/night-launch.sh — Lanceur sécurisé pour sessions Claude Code de nuit
#
# Combine : Claude en mode acceptEdits + watchdog + budget + logging
#
# Usage:
#   bash scripts/night-launch.sh "Implementer selon docs/specs.md"
#   bash scripts/night-launch.sh --timeout 20 "Refactorer le module auth"
#
# Ce script:
# 1. Vérifie les prérequis (.claudeignore, .gitignore, settings.json)
# 2. Lance le watchdog en arrière-plan
# 3. Lance Claude avec le bon prompt et le mode acceptEdits
# 4. Quand Claude termine (ou crash), arrête le watchdog
# 5. Log tout dans logs/night-<date>.log

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

TIMEOUT_MIN=10
PROMPT=""

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        --timeout) TIMEOUT_MIN="$2"; shift 2 ;;
        *) PROMPT="$1"; shift ;;
    esac
done

if [[ -z "$PROMPT" ]]; then
    echo -e "${RED}Usage:${NC} bash scripts/night-launch.sh [--timeout N] \"<prompt>\""
    exit 1
fi

# ─── Prérequis ────────────────────────────────────────────────────────────────

echo -e "${CYAN}Night mode — prérequis${NC}"

ERRORS=0
for f in .claudeignore .gitignore; do
    if [[ -f "$f" ]]; then
        echo -e "${GREEN}[OK]${NC} $f"
    else
        echo -e "${RED}[FAIL]${NC} $f manquant — lancer 'npx claude-atelier init' d'abord"
        ERRORS=$((ERRORS + 1))
    fi
done

if [[ $ERRORS -gt 0 ]]; then
    echo -e "\n${RED}Prérequis non satisfaits. Abandon.${NC}"
    exit 1
fi

# ─── Logging ──────────────────────────────────────────────────────────────────

mkdir -p logs
LOG_FILE="logs/night-$(date '+%Y%m%d-%H%M%S').log"
echo -e "${GREEN}[OK]${NC} Logs → $LOG_FILE"

{
    echo "=== Night session ==="
    echo "Date: $(date)"
    echo "Prompt: $PROMPT"
    echo "Timeout watchdog: ${TIMEOUT_MIN}min"
    echo "Working dir: $(pwd)"
    echo "Git branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
    echo "Git status: $(git status --short 2>/dev/null | wc -l | tr -d ' ') fichiers modifies"
    echo "==="
} >> "$LOG_FILE"

# ─── Watchdog ─────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WATCHDOG_SCRIPT="$SCRIPT_DIR/night-watchdog.sh"

if [[ -f "$WATCHDOG_SCRIPT" ]]; then
    bash "$WATCHDOG_SCRIPT" --timeout "$TIMEOUT_MIN" --log "$LOG_FILE" &
    WATCHDOG_PID=$!
    echo -e "${GREEN}[OK]${NC} Watchdog PID $WATCHDOG_PID (timeout ${TIMEOUT_MIN}min)"
else
    echo -e "${YELLOW}[WARN]${NC} Watchdog non trouvé. Session sans filet de sécurité."
    WATCHDOG_PID=""
fi

# ─── Claude ───────────────────────────────────────────────────────────────────

echo -e "\n${CYAN}Lancement de Claude...${NC}\n"

FULL_PROMPT="$PROMPT. Committer chaque etape de facon atomique. Ne pas pusher. Mettre a jour §0 de CLAUDE.md si necessaire."

claude --permission-mode acceptEdits "$FULL_PROMPT" 2>&1 | tee -a "$LOG_FILE"
CLAUDE_EXIT=$?

# ─── Cleanup ──────────────────────────────────────────────────────────────────

if [[ -n "${WATCHDOG_PID:-}" ]]; then
    kill "$WATCHDOG_PID" 2>/dev/null || true
    echo -e "\n${GREEN}[OK]${NC} Watchdog arrêté"
fi

{
    echo ""
    echo "=== Session terminée ==="
    echo "Date: $(date)"
    echo "Exit code Claude: $CLAUDE_EXIT"
    echo "Git log depuis le debut:"
    git log --oneline -10 2>/dev/null || true
    echo "==="
} >> "$LOG_FILE"

if [[ $CLAUDE_EXIT -eq 0 ]]; then
    echo -e "\n${GREEN}Session terminée normalement.${NC}"
    echo -e "Review: ${CYAN}git log --oneline${NC}"
    echo -e "Gate:   ${CYAN}bash scripts/pre-push-gate.sh${NC}"
    echo -e "Push:   ${CYAN}git push${NC}"
else
    echo -e "\n${RED}Session terminée avec erreur (exit $CLAUDE_EXIT).${NC}"
    echo -e "Logs:   ${CYAN}cat $LOG_FILE${NC}"
fi

echo -e "Log complet: $LOG_FILE"
