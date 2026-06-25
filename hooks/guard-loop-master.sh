#!/bin/bash
# Hook PreToolUse — Bloque git commit si /loop-master n'a pas été exécuté sur la tâche courante.
# Obligation §3 : toute tâche feature/refactor/fix (> 1 fichier) doit passer par le pipeline.
#
# Bypass : GUARD_LOOP_TEST_SKIP=1 (tests auto) ou flag /tmp/claude-atelier-loop-done présent.

[ "${GUARD_LOOP_TEST_SKIP:-}" = "1" ] && exit 0

# Lire la commande depuis le JSON stdin
COMMAND=$(cat | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    cmd = d.get('tool_input', {}).get('command', '') or d.get('command', '')
    print(cmd)
except:
    print('')
" 2>/dev/null)

# N'agir que sur git commit
echo "$COMMAND" | grep -q "git commit" || exit 0

# Si le flag loop-done est posé → OK
[ -f "/tmp/claude-atelier-loop-done" ] && exit 0

# Compter les fichiers modifiés dans le diff staged (env override pour tests)
if [ -n "${GUARD_LOOP_TEST_STAGED:-}" ]; then
  STAGED_FILES="$GUARD_LOOP_TEST_STAGED"
else
  STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
fi

# Moins de 2 fichiers → tâche courte, pas d'obligation pipeline
[ "${STAGED_FILES:-0}" -lt 2 ] && exit 0

cat >&2 <<'EOF'
╔══════════════════════════════════════════════════════════════╗
║  §3 VIOLATION — commit sans /loop-master                     ║
║                                                              ║
║  Cette tâche touche plusieurs fichiers.                      ║
║  Tu DOIS exécuter /loop-master avant de committer.           ║
║                                                              ║
║  Pipeline : Chef → Codeur → Relecteur → Documentaliste       ║
║                                                              ║
║  Pour débloquer après /loop-master :                         ║
║    touch /tmp/claude-atelier-loop-done                       ║
╚══════════════════════════════════════════════════════════════╝
EOF
exit 2
