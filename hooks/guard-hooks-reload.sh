#!/bin/bash
# PostToolUse guard — détecte les modifications de hooks ou settings.json
# Rappelle que Claude Code doit redémarrer pour charger les changements

INPUT=$(cat)

# Récupérer le fichier modifié (Edit tool → file_path, Write tool → file_path)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"file_path"[[:space:]]*:[[:space:]]*"//;s/"$//')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

NEEDS_RELOAD=false
WHAT=""

# Détection : hooks modifiés
if echo "$FILE_PATH" | grep -qE "hooks/guard-|hooks/routing-"; then
  NEEDS_RELOAD=true
  WHAT="hook $(basename "$FILE_PATH")"
fi

# Détection : settings.json modifié (contient la config des hooks)
if echo "$FILE_PATH" | grep -qE "settings\.json"; then
  NEEDS_RELOAD=true
  WHAT="settings.json (config hooks)"
fi

# Détection : .mcp.json modifié
if echo "$FILE_PATH" | grep -qE "\.mcp\.json"; then
  NEEDS_RELOAD=true
  WHAT=".mcp.json (serveurs MCP)"
fi

if [ "$NEEDS_RELOAD" = true ]; then
  echo ""
  echo "⚠️  RECHARGEMENT REQUIS — $WHAT modifié"
  echo "Les hooks, permissions et MCP sont chargés au démarrage du processus."
  echo "Ce changement ne sera PAS effectif dans cette session."
  echo ""
  echo "  → Fermer et rouvrir VS Code complètement"
  echo "    (Cmd+Shift+P → Claude Code: Restart peut ne pas suffire pour les permissions)"
  echo ""
fi
