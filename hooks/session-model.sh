#!/bin/bash
# SessionStart hook — capture le modèle actif dans un fichier tmp
# Le modèle est disponible UNIQUEMENT au démarrage de session

INPUT=$(cat)
MODEL=$(echo "$INPUT" | grep -o '"model"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"model"[[:space:]]*:[[:space:]]*"//;s/"$//')

if [ -n "$MODEL" ]; then
  echo "$MODEL" > /tmp/claude-atelier-current-model
fi
