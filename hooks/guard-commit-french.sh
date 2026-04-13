#!/bin/bash
# PreToolUse guard — §13 : commits en français
# Alerte si le message de commit semble être en anglais

source "$(dirname "$0")/_parse-input.sh"

if echo "$HOOK_COMMAND" | grep -qi "git commit"; then
  # Extraire le message de commit (-m "...")
  MSG=$(echo "$HOOK_COMMAND" | sed -n 's/.*-m[[:space:]]*["'"'"']\([^"'"'"']*\)["'"'"'].*/\1/p')
  if [ -n "$MSG" ]; then
    EN_WORDS=$(echo "$MSG" | grep -ciwE "add|fix|update|remove|implement|refactor|change|create|delete|move|rename|improve|initial|merge|release" || true)
    FR_WORDS=$(echo "$MSG" | grep -ciwE "ajout|corriger|corrige|mettre|supprimer|implementer|modifier|creer|deplacer|renommer|ameliorer|initial|fusionner|version|feat|refactor|docs|fix" || true)

    if [ "$EN_WORDS" -ge 2 ] && [ "$FR_WORDS" -eq 0 ]; then
      echo "§13 : les messages de commit doivent être en français. Message détecté en anglais."
      exit 2
    fi
  fi
fi
