#!/bin/bash
# SessionStart hook — Peter injecte un contexte vault court et dynamique.

set -eu

ROOT="$(pwd)"
VAULT_DIR="$ROOT/vault"
BRIEF="$VAULT_DIR/00-brief.md"
MAILBOX="$VAULT_DIR/10-mailbox.md"
ROADMAP="$VAULT_DIR/40-roadmap.md"

print_file_limited() {
  file="$1"
  max_lines="$2"
  if [ -f "$file" ]; then
    awk -v max="$max_lines" 'NR <= max { print } NR == max + 1 { print "\n… contenu tronqué par Peter — lire le fichier vault si nécessaire."; exit }' "$file"
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
  print_file_limited "$BRIEF" 80
  echo ""
fi

if [ -f "$MAILBOX" ]; then
  echo "## vault/10-mailbox.md"
  print_file_limited "$MAILBOX" 80
  echo ""
fi

if [ -f "$ROADMAP" ]; then
  echo "## vault/40-roadmap.md"
  print_file_limited "$ROADMAP" 60
  echo ""
fi

echo "[VAULT-PETER] Pour maintenir la mémoire : écrire découvertes dans vault/30-discoveries.md, décisions dans vault/20-decisions.md, courrier entrant dans vault/10-mailbox.md."
