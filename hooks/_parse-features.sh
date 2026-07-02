#!/bin/bash
# Helper source-able — parse features et params depuis registry JSON
# Usage: source "$(dirname "$0")/_parse-features.sh"
# Fournit: _get_param <name> [default] → lit param du registry avec override .claude/features.json
# shellcheck disable=SC2034

_get_param() {
  local param_name="$1"
  local default_value="${2:-0}"
  local proj_root
  proj_root=$(cd "$(dirname "$0")/.." && pwd)

  local registry_path="$proj_root/src/features-registry.json"
  local features_path="$proj_root/.claude/features.json"

  # Essayer override .claude/features.json d'abord (pour les valeurs non-bool aussi)
  if [ -f "$features_path" ]; then
    python3 -c "
import json, sys, os
try:
    overrides = json.load(open('$features_path'))
    if '$param_name' in overrides:
        val = overrides['$param_name']
        if isinstance(val, bool):
            print(1 if val else 0)
        else:
            print(val)
        sys.exit(0)
except: pass
" 2>/dev/null && return 0
  fi

  # Sinon, lire du registry default
  if [ -f "$registry_path" ]; then
    python3 -c "
import json, sys
try:
    registry = json.load(open('$registry_path'))
    if 'params' in registry and '$param_name' in registry['params']:
        default = registry['params']['$param_name'].get('default', $default_value)
        if isinstance(default, bool):
            print(1 if default else 0)
        else:
            print(default)
    else:
        print($default_value)
except:
    print($default_value)
" 2>/dev/null
  else
    echo "$default_value"
  fi
}
