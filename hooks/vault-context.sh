#!/bin/bash
# SessionStart hook — Peter injecte un contexte vault court et dynamique.

set -eu

ROOT="$(pwd)"
VAULT_DIR="$ROOT/vault"
BRIEF="$VAULT_DIR/00-brief.md"
MAILBOX="$VAULT_DIR/10-mailbox.md"
ROADMAP="$VAULT_DIR/40-roadmap.md"
MAX_CHARS_PER_FILE=8000
MAX_CHARS_PER_LINE=500

print_mtime() {
  file="$1"
  if [ -f "$file" ]; then
    if stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S %z' "$file" >/dev/null 2>&1; then
      stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S %z' "$file"
    else
      stat -c '%y' "$file" 2>/dev/null || echo "inconnue"
    fi
  fi
}

print_file_limited() {
  file="$1"
  max_lines="$2"
  if [ -f "$file" ]; then
    awk -v max_lines="$max_lines" -v max_chars="$MAX_CHARS_PER_FILE" -v max_line_chars="$MAX_CHARS_PER_LINE" '
      NR > max_lines {
        print "\n… contenu tronqué par Peter — lire le fichier vault si nécessaire."
        exit
      }
      {
        line = $0
        if (length(line) > max_line_chars) {
          line = substr(line, 1, max_line_chars) "… [ligne tronquée]"
        }
        total += length(line) + 1
        if (total > max_chars) {
          print "\n… contexte vault tronqué par Peter — limite dure atteinte."
          exit
        }
        print line
      }
    ' "$file"
  fi
}

if [ ! -d "$VAULT_DIR" ]; then
  exit 0
fi

echo "[VAULT-PETER] Vault projet détecté : vault/"
echo "[VAULT-PETER] Règle : lire ce résumé d'abord, puis ouvrir les fichiers vault seulement si utile."
echo ""

if [ -f "$BRIEF" ]; then
  echo "## vault/00-brief.md"
  echo "Dernière modification : $(print_mtime "$BRIEF")"
  echo ""
  print_file_limited "$BRIEF" 80
  echo ""
fi

if [ -f "$MAILBOX" ]; then
  echo "## vault/10-mailbox.md"
  echo "Dernière modification : $(print_mtime "$MAILBOX")"
  echo ""
  print_file_limited "$MAILBOX" 80
  echo ""
fi

if [ -f "$ROADMAP" ]; then
  echo "## vault/40-roadmap.md"
  echo "Dernière modification : $(print_mtime "$ROADMAP")"
  echo ""
  print_file_limited "$ROADMAP" 60
  echo ""
fi

echo "[VAULT-PETER] Pour maintenir la mémoire : écrire découvertes dans vault/30-discoveries.md, décisions dans vault/20-decisions.md, courrier entrant dans vault/10-mailbox.md."
