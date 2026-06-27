#!/bin/bash
# Hook Stop — Vérifie que la réponse qui VIENT de se terminer commence par l'entête §1.
#
# Conception : l'enforcement §1 contrôle MA SORTIE (événement Stop), jamais l'entrée
# de l'utilisateur. Brancher ce contrôle sur UserPromptSubmit punissait le prompt
# suivant de l'utilisateur pour une faute de la réponse précédente — chaîne bloquée.
# Sur Stop, si l'entête manque → exit 2 : je suis relancé pour émettre un correctif.
#
# GARANTIE « jamais de verrou » — DOUBLE escape, indépendants :
#   1. stop_hook_active=true (champ Stop natif Claude Code) → on laisse passer.
#   2. Coupe-circuit fichier fail-safe : si on a bloqué il y a < 30 s (marqueur
#      scoppé par SESSION), on ne re-bloque JAMAIS — même si (1) n'est pas fourni.
#      => au pire UNE relance, jamais de boucle, quel que soit le runtime.
#
# Isolation multi-session (2 fenêtres en parallèle) : la clé du marqueur vient de
# session_id, à défaut d'un hash du transcript_path (unique + stable par session).
# Jamais "global" quand un transcript existe → pas de collision inter-sessions.
# Robustesse : l'epoch est stocké DANS le marqueur (lu par cat) — pas de `stat`,
# donc pas de divergence BSD/GNU ni de verrou si `stat` échoue.
# Trade-off assumé : pendant la fenêtre de 30 s suivant une relance, une violation
# qui persiste passe sans nouveau blocage (prix de la garantie anti-boucle).
# Test : GUARD_S1_TEST_SKIP=1 pour les tests automatisés.

[ "${GUARD_S1_TEST_SKIP:-}" = "1" ] && exit 0

_RAW_INPUT=$(cat)

# session_id + transcript_path en une passe
_IDS=$(echo "$_RAW_INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('session_id', '') or '')
    print(d.get('transcript_path', '') or '')
    print('1' if d.get('stop_hook_active') else '0')
except:
    print(''); print(''); print('0')
" 2>/dev/null)
SESSION=$(printf '%s\n' "$_IDS" | sed -n '1p')
TRANSCRIPT=$(printf '%s\n' "$_IDS" | sed -n '2p')
STOP_ACTIVE=$(printf '%s\n' "$_IDS" | sed -n '3p')

# Clé du marqueur : session_id > hash(transcript) > global (ce dernier jamais atteint
# en pratique car sans transcript on sort plus bas).
if [ -n "$SESSION" ]; then
    KEY="${SESSION//\//_}"
elif [ -n "$TRANSCRIPT" ]; then
    KEY="t$(printf '%s' "$TRANSCRIPT" | cksum | cut -d' ' -f1)"
else
    KEY="global"
fi
MARKER="/tmp/claude-atelier-s1-relance-${KEY}"

# Vrai si on a bloqué il y a < 30 s (epoch lu dans le contenu du marqueur)
_recent_block() {
    [ -f "$MARKER" ] || return 1
    local armed now
    armed=$(cat "$MARKER" 2>/dev/null)
    case "$armed" in ''|*[!0-9]*) return 1 ;; esac
    now=$(date +%s)
    [ $(( now - armed )) -lt 30 ]
}

# Escape 1 (primaire) : déjà dans une relance Stop → laisser passer + désarmer
[ "$STOP_ACTIVE" = "1" ] && { rm -f "$MARKER"; exit 0; }

# Pas de transcript = rien à vérifier
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then rm -f "$MARKER"; exit 0; fi

# Extraire la PREMIÈRE ligne de texte de la réponse assistant du TOUR COURANT
# (après le dernier vrai prompt utilisateur) — c'est là que §1 exige l'entête.
# Un message assistant 100% tool_use (sans texte) est sauté ; si AUCUN texte dans
# tout le tour, on renvoie le sentinelle __NOTEXT__ (pas de blocage parasite).
HEADER=$(python3 -c "
import json, sys

def first_text(node):
    if not isinstance(node, dict):
        return ''
    for key in ('content', 'message'):
        val = node.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip().split('\n')[0]
        if isinstance(val, list):
            for item in val:
                if isinstance(item, dict) and item.get('type') == 'text':
                    t = item.get('text', '').strip()
                    if t:
                        return t.split('\n')[0]
        if isinstance(val, dict):
            t = val.get('text', '').strip()
            if t:
                return t.split('\n')[0]
            inner = val.get('content')
            if isinstance(inner, list):
                for item in inner:
                    if isinstance(item, dict) and item.get('type') == 'text':
                        t = item.get('text', '').strip()
                        if t:
                            return t.split('\n')[0]
            elif isinstance(inner, str) and inner.strip():
                return inner.strip().split('\n')[0]
    data = node.get('data', {}) if isinstance(node.get('data'), dict) else {}
    return first_text(data) if data else ''

def role_of(node):
    if not isinstance(node, dict):
        return ''
    if node.get('type') in ('assistant', 'assistant.message'):
        return 'assistant'
    if node.get('type') in ('user', 'user.message', 'human'):
        return 'user'
    data = node.get('data', {}) if isinstance(node.get('data'), dict) else {}
    msg  = node.get('message', {}) if isinstance(node.get('message'), dict) else {}
    dm   = data.get('message', {}) if isinstance(data.get('message'), dict) else {}
    for r in (node.get('role',''), data.get('role',''), msg.get('role',''), dm.get('role','')):
        if r in ('assistant', 'user'):
            return r
    return ''

entries = []
with open('$TRANSCRIPT') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            entries.append(json.loads(line))
        except:
            pass

# Index du dernier VRAI prompt utilisateur (texte reel, pas un tool_result).
# On IGNORE les tours user synthetiques marques isMeta:true — typiquement le
# feedback du hook Stop lui-meme, injecte APRES ma reponse. Sans ce filtre, ce
# feedback devient le dernier prompt, mon entete (anterieure) sort de la fenetre
# [start:] → extraction vide → faux blocage en boucle. (Les task-notifs arrivent
# AVANT ma reponse, isMeta absent → sans effet, conservees.)
start = 0
for i, d in enumerate(entries):
    if role_of(d) == 'user' and not d.get('isMeta') and first_text(d):
        start = i

seen_assistant = False
header = ''
for d in entries[start:]:
    if role_of(d) == 'assistant':
        seen_assistant = True
        t = first_text(d)
        if t:
            header = t
            break
# Tour 100% outils (assistant sans aucun texte) → ne pas bloquer
print(header if header else ('__NOTEXT__' if seen_assistant else ''))
" 2>/dev/null)

# Tour sans texte assistant → rien à enforcer
[ "$HEADER" = "__NOTEXT__" ] && { rm -f "$MARKER"; exit 0; }

# Normaliser : retirer backticks et espaces de tête (la doc §1 montre l'entête en
# `backticks` — l'entête réel est [MM-DD ...], pas le délimiteur markdown).
HEADER_CLEAN=$(printf '%s' "$HEADER" | sed 's/^[`[:space:]]*//')

# Header présent → OK, on désarme le coupe-circuit.
# Format strict [MM-DD HH:MM:SS | ...] ; année (20XX-) tolérée pour rétro-compat.
if printf '%s' "$HEADER_CLEAN" | grep -qE '^\[(20[0-9]{2}-)?[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2} \|'; then
    rm -f "$MARKER"
    exit 0
fi

# Header ABSENT. Escape 2 (coupe-circuit fail-safe) : si on a bloqué il y a < 30 s,
# ne JAMAIS re-bloquer — désarme et laisse passer. Indépendant de stop_hook_active.
if _recent_block; then rm -f "$MARKER"; exit 0; fi

# Violation fraîche → armer le marqueur (epoch dans le contenu) et relancer une fois.
date +%s > "$MARKER"
cat >&2 <<'EOF'
╔══════════════════════════════════════════════════════════════╗
║  §1 VIOLATION — ta réponse s'est terminée sans entête        ║
║                                                              ║
║  Émets MAINTENANT un court message correctif commençant par : ║
║  `[MM-DD HH:MM:SS | model] PASTILLE`                         ║
║                                                              ║
║  (Contrôle sur ta sortie — l'utilisateur n'est jamais bloqué.)║
╚══════════════════════════════════════════════════════════════╝
EOF
exit 2
