#!/bin/bash
# Helper source-able — parse features et params depuis registry JSON
# Usage: source "$(dirname "$0")/_parse-features.sh"
# Fournit: _get_param <name> [default] → lit param du registry avec override .claude/features.json

_get_param() {
  local param_name="$1"
  local default_value="${2:-0}"
  local proj_root
  proj_root=$(cd "$(dirname "$0")/.." && pwd)

  local registry_path="$proj_root/src/features-registry.json"
  local features_path="$proj_root/.claude/features.json"

  python3 -c "
import json, os, sys

param_name, default_value, registry_path, features_path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

def coerce(v):
    if isinstance(v, bool):
        return '1' if v else '0'
    return str(v)

try:
    if os.path.exists(features_path):
        overrides = json.load(open(features_path))
        if param_name in overrides:
            print(coerce(overrides[param_name]))
            sys.exit(0)
except Exception:
    pass

try:
    if os.path.exists(registry_path):
        registry = json.load(open(registry_path))
        p = registry.get('params', {}).get(param_name)
        if p is not None and 'default' in p:
            print(coerce(p['default']))
            sys.exit(0)
except Exception:
    pass

print(default_value)
" "$param_name" "$default_value" "$registry_path" "$features_path" 2>/dev/null
}
