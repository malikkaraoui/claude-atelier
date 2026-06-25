#!/bin/bash
# Hook UserPromptSubmit — Vérifie que la dernière réponse assistant commence par l'entête §1.
# Si absent → exit 2 : bloque le message entrant jusqu'à correction.
#
# Bypass : si le message entrant contient "§1-ack" (acquittement explicite), passe.
# Test   : GUARD_S1_TEST_SKIP=1 pour les tests automatisés.

[ "${GUARD_S1_TEST_SKIP:-}" = "1" ] && exit 0

_RAW_INPUT=$(cat)

# Bypass si acquittement explicite dans le prompt
PROMPT=$(echo "$_RAW_INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('prompt', '') or d.get('message', '') or '')
except:
    print('')
" 2>/dev/null)

if echo "$PROMPT" | grep -q "§1-ack"; then
    exit 0
fi

# Récupérer le chemin du transcript
TRANSCRIPT=$(echo "$_RAW_INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('transcript_path', ''))
except:
    print('')
" 2>/dev/null)

# Pas de transcript = première réponse de session, on laisse passer
[ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ] && exit 0

# Extraire le premier bloc de texte de la dernière réponse assistant
LAST_HEADER=$(python3 -c "
import json, sys

def is_assistant(node):
    if not isinstance(node, dict):
        return False
    if node.get('type') in ('assistant', 'assistant.message'):
        return True
    data = node.get('data', {}) if isinstance(node.get('data'), dict) else {}
    msg  = node.get('message', {}) if isinstance(node.get('message'), dict) else {}
    dm   = data.get('message', {}) if isinstance(data.get('message'), dict) else {}
    roles = [node.get('role',''), data.get('role',''), msg.get('role',''), dm.get('role','')]
    return any(r == 'assistant' for r in roles)

def extract_text(node):
    # Cherche le premier contenu texte dans un message assistant
    for key in ('content', 'message'):
        val = node.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip().split('\n')[0]
        if isinstance(val, list):
            for item in val:
                if isinstance(item, dict) and item.get('type') == 'text':
                    t = item.get('text','').strip()
                    if t:
                        return t.split('\n')[0]
        if isinstance(val, dict):
            t = val.get('text','').strip()
            if t:
                return t.split('\n')[0]
            # Descend dans val.content (ex: message.content list)
            inner = val.get('content')
            if isinstance(inner, list):
                for item in inner:
                    if isinstance(item, dict) and item.get('type') == 'text':
                        t = item.get('text','').strip()
                        if t:
                            return t.split('\n')[0]
            elif isinstance(inner, str) and inner.strip():
                return inner.strip().split('\n')[0]
    data = node.get('data', {}) if isinstance(node.get('data'), dict) else {}
    return extract_text(data) if data else ''

last_line = ''
with open('$TRANSCRIPT') as f:
    for line in f:
        try:
            d = json.loads(line)
            if is_assistant(d):
                t = extract_text(d)
                if t:
                    last_line = t
        except:
            pass
print(last_line)
" 2>/dev/null)

# Pattern §1 : [YYYY-MM-DD HH:MM:SS | model]
if echo "$LAST_HEADER" | grep -qE '^\[20[0-9]{2}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2} \|'; then
    exit 0
fi

# Header absent ou mal formé → bloquer
cat >&2 <<'EOF'
╔══════════════════════════════════════════════════════════════╗
║  §1 VIOLATION — réponse précédente sans entête obligatoire   ║
║                                                              ║
║  Ta prochaine réponse DOIT commencer par :                   ║
║  `[YYYY-MM-DD HH:MM:SS | model] PASTILLE M`                  ║
║                                                              ║
║  Pour débloquer : inclure "§1-ack" dans ce message           ║
╚══════════════════════════════════════════════════════════════╝
EOF
exit 2
