#!/bin/bash
# PostToolUse guard — §13 : commits en français
# Alerte si le message de commit semble être en anglais

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//;s/"$//')

if echo "$COMMAND" | grep -qi "git commit"; then
  # Extraire le message de commit (-m "...")
  MSG=$(echo "$COMMAND" | sed -n 's/.*-m[[:space:]]*["'"'"']\([^"'"'"']*\)["'"'"'].*/\1/p')
  if [ -n "$MSG" ]; then
    # Mots anglais courants dans les messages de commit
    EN_WORDS=$(echo "$MSG" | grep -ciwE "add|fix|update|remove|implement|refactor|change|create|delete|move|rename|improve|initial|merge|release" || true)
    FR_WORDS=$(echo "$MSG" | grep -ciwE "ajout|corriger|corrige|mettre|supprimer|implementer|modifier|creer|deplacer|renommer|ameliorer|initial|fusionner|version|feat|refactor|docs|fix" || true)

    # Si beaucoup de mots anglais et aucun mot français → alerte
    if [ "$EN_WORDS" -ge 2 ] && [ "$FR_WORDS" -eq 0 ]; then
      echo "§13 : les messages de commit doivent être en français. Message détecté en anglais."
      exit 2
    fi
  fi
fi
