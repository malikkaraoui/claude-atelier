#!/usr/bin/env bash
# heartbeat-watchdog.sh — Garde le telegram bridge vivant 24/7
#
# Usage (lancer une fois, tourne en boucle) :
#   bash scripts/heartbeat-watchdog.sh &
#   echo $! > /tmp/claude-atelier-heartbeat.pid
#
# Ou via cron (vérifie toutes les minutes) :
#   * * * * * /chemin/vers/claude-atelier/scripts/heartbeat-watchdog.sh --cron

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="/tmp/claude-atelier-telegram.pid"
HEARTBEAT_PID_FILE="/tmp/claude-atelier-heartbeat.pid"
LOG_FILE="/tmp/claude-atelier-heartbeat.log"
RESTART_DELAY=5   # secondes entre les redémarrages
CHECK_INTERVAL=30 # secondes entre les checks en mode daemon

_log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [heartbeat] $*" | tee -a "$LOG_FILE"; }

_bridge_running() {
    [[ -f "$PID_FILE" ]] || return 1
    local pid
    pid=$(cat "$PID_FILE" 2>/dev/null) || return 1
    kill -0 "$pid" 2>/dev/null
}

_start_bridge() {
    _log "Démarrage du telegram bridge..."
    cd "$ROOT"
    node bin/telegram.js start
    sleep 1
    if _bridge_running; then
        _log "Bridge démarré (PID $(cat "$PID_FILE"))"
    else
        _log "ERREUR: bridge n'a pas démarré"
        return 1
    fi
}

_notify_telegram() {
    local msg="$1"
    # Tente d'envoyer une alerte via le FIFO si disponible
    if [[ -p "/tmp/claude-telegram-out" ]]; then
        echo "⚠️ Heartbeat: $msg" > /tmp/claude-telegram-out 2>/dev/null || true
    fi
}

# Mode --cron : vérifie une fois et sort
if [[ "${1:-}" == "--cron" ]]; then
    if ! _bridge_running; then
        _log "Bridge mort — redémarrage..."
        _start_bridge && _notify_telegram "Bridge redémarré automatiquement"
    fi
    exit 0
fi

# Mode daemon : boucle infinie
_log "Watchdog démarré (PID $$) — interval ${CHECK_INTERVAL}s"
echo $$ > "$HEARTBEAT_PID_FILE"

trap '_log "Watchdog arrêté (SIGTERM/SIGINT)"; rm -f "$HEARTBEAT_PID_FILE"; exit 0' TERM INT

while true; do
    if ! _bridge_running; then
        _log "Bridge mort — redémarrage dans ${RESTART_DELAY}s..."
        sleep "$RESTART_DELAY"
        if _start_bridge; then
            _notify_telegram "Bridge redémarré par watchdog $(date '+%H:%M')"
        else
            _log "Redémarrage échoué, retry dans ${CHECK_INTERVAL}s"
        fi
    fi
    sleep "$CHECK_INTERVAL"
done
