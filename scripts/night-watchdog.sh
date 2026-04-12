#!/usr/bin/env bash
# scripts/night-watchdog.sh — Watchdog for Claude Code night sessions
#
# Surveille qu'une session Claude Code est vivante en vérifiant que le
# working directory change (git status, fichiers modifiés). Si rien ne
# bouge pendant TIMEOUT minutes, envoie une notification macOS et
# optionnellement kill + relance la session.
#
# Usage:
#   bash scripts/night-watchdog.sh                    # defaults: 10 min timeout
#   bash scripts/night-watchdog.sh --timeout 15       # 15 min timeout
#   bash scripts/night-watchdog.sh --kill              # kill + relance si stuck
#   bash scripts/night-watchdog.sh --log watchdog.log  # log to file
#
# Prérequis: macOS (utilise osascript pour les notifications)
# Pour Linux: remplacer osascript par notify-send

set -euo pipefail

TIMEOUT_MIN=10
KILL_ON_STUCK=false
LOG_FILE=""
CHECK_INTERVAL=60  # seconds between checks

while [[ $# -gt 0 ]]; do
    case "$1" in
        --timeout) TIMEOUT_MIN="$2"; shift 2 ;;
        --kill) KILL_ON_STUCK=true; shift ;;
        --log) LOG_FILE="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

TIMEOUT_SEC=$((TIMEOUT_MIN * 60))

log() {
    local msg
    msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg"
    if [[ -n "$LOG_FILE" ]]; then
        echo "$msg" >> "$LOG_FILE"
    fi
}

notify() {
    local title="$1"
    local body="$2"
    osascript -e "display notification \"$body\" with title \"$title\" sound name \"Funk\"" 2>/dev/null || true
}

get_fingerprint() {
    # Fingerprint = hash of git status + last modified time of tracked files
    {
        git status --porcelain 2>/dev/null || true
        git diff --stat 2>/dev/null || true
        find . -name '*.md' -newer /tmp/.watchdog-marker 2>/dev/null | head -20 || true
    } | md5 2>/dev/null || md5sum 2>/dev/null | cut -d' ' -f1
}

# Create initial marker
touch /tmp/.watchdog-marker

log "Watchdog demarré (timeout: ${TIMEOUT_MIN}min, kill: ${KILL_ON_STUCK})"
notify "Claude Watchdog" "Surveillance demarrée — timeout ${TIMEOUT_MIN}min"

LAST_FINGERPRINT=""
STUCK_SINCE=0

while true; do
    sleep "$CHECK_INTERVAL"

    CURRENT_FP=$(get_fingerprint)

    if [[ "$CURRENT_FP" == "$LAST_FINGERPRINT" ]]; then
        # Nothing changed
        STUCK_SINCE=$((STUCK_SINCE + CHECK_INTERVAL))

        if [[ $STUCK_SINCE -ge $TIMEOUT_SEC ]]; then
            STUCK_MIN=$((STUCK_SINCE / 60))
            log "ALERTE: Aucune activité depuis ${STUCK_MIN} minutes"
            notify "Claude STUCK" "Aucune activité depuis ${STUCK_MIN}min — session probablement morte"

            if $KILL_ON_STUCK; then
                # Find and kill claude processes (the node process, not VSCode)
                CLAUDE_PIDS=$(pgrep -f "claude" 2>/dev/null | head -5 || true)
                if [[ -n "$CLAUDE_PIDS" ]]; then
                    log "Kill des processus claude: $CLAUDE_PIDS"
                    echo "$CLAUDE_PIDS" | xargs kill -TERM 2>/dev/null || true
                    notify "Claude Watchdog" "Session tuée après ${STUCK_MIN}min d'inactivité"
                fi
            fi

            # Reset timer to avoid spamming
            STUCK_SINCE=0
            touch /tmp/.watchdog-marker
        fi
    else
        # Activity detected
        if [[ $STUCK_SINCE -gt 120 ]]; then
            log "Activité reprise apres $((STUCK_SINCE / 60))min de silence"
        fi
        STUCK_SINCE=0
        touch /tmp/.watchdog-marker
    fi

    LAST_FINGERPRINT="$CURRENT_FP"
done
