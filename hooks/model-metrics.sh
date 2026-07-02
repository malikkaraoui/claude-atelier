#!/bin/bash
# Hook UserPromptSubmit — Model Metrics (métriques de complexité automatiques)
#
# Analyse les 5 derniers tours assistant dans le transcript JSONL.
# Émet [METRICS] fit:VERDICT | model:MODEL | MESSAGE PASTILLE
# La flèche (⬆️/⬇️/=) est lue par Claude pour construire la ligne §1.
#
# Ne bloque jamais — warning-only. Silencieux si pas de transcript.
#
# Biais connu (V1) : `Bash` est toujours classé `medium` sans analyse du contenu.
# Les sessions shell-légères (ls/cat/git status/find) remontent donc en `medium`
# au lieu de `low`. Signal = mix d'outils observés, pas coût réel du travail.
# Accepté comme heuristique — ré-ingénierie reportée en V2+ si gênant en prod.

_RAW_INPUT=$(cat)

TRANSCRIPT=$(echo "$_RAW_INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('transcript_path', ''))
except: pass
" 2>/dev/null)

LIVE_MODEL=$(echo "$_RAW_INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('model', ''))
except: pass
" 2>/dev/null)

SESSION_ID=$(echo "$_RAW_INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('session_id', ''))
except: pass
" 2>/dev/null)

# Pas de transcript = silencieux
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0

# Résoudre le modèle : cache scoppé session (rafraîchi par routing-check.sh,
# qui tourne AVANT ce hook sur le même événement UserPromptSubmit — cf. ordre
# dans .claude/settings.json) > live (stdin brut, peut retarder d'un tour
# juste après un /model) > cache legacy global.
# Avant ce fix : LIVE_MODEL était prioritaire sur le cache, donc un LIVE_MODEL
# brut périmé faisait calculer la fenêtre de contexte sur l'ANCIEN modèle
# (ex: fenêtre 1M d'Opus gardée après switch vers Sonnet 200k) → % incohérent.
BASE_TMP="${CLAUDE_ATELIER_TMPDIR:-/tmp}"
if [ -n "$SESSION_ID" ]; then
    CACHE_SCOPE="$SESSION_ID"
elif [ -n "$TRANSCRIPT" ]; then
    CACHE_SCOPE=$(printf '%s' "$TRANSCRIPT" | cksum | awk '{print $1}')
else
    CACHE_SCOPE="global"
fi
SCOPED_MODEL_FILE="$BASE_TMP/claude-atelier-model-cache/${CACHE_SCOPE}.model"

MODEL=""
if [ -f "$SCOPED_MODEL_FILE" ]; then
    MODEL=$(cat "$SCOPED_MODEL_FILE" 2>/dev/null | tr -d '\r\n')
fi
if [ -z "$MODEL" ] && [ -n "$LIVE_MODEL" ]; then
    MODEL=$(echo "$LIVE_MODEL" | sed 's/\[.*$//' | tr -d '\r\n')
fi
if [ -z "$MODEL" ]; then
    MODEL=$(cat "$BASE_TMP/claude-atelier-current-model" 2>/dev/null | tr -d '\r\n')
fi
[ -z "$MODEL" ] && exit 0

# Fenêtre de contexte du MODÈLE ACTIF (pas du projet). Avant : 200k en dur → faux
# 95% sur une session 1M (vraie conso ~5%). La dériver du projet (valeur figée)
# recrée le bug en miroir si on bascule sur un 200k → on la dérive du modèle.
# Le champ `model` du transcript ne porte PAS toujours [1m] → on déduit par id.
# Priorité : env (override/tests) > features.json "contextWindow" (pin explicite,
# optionnel, NON posé par défaut) > table modèle→fenêtre > 200k.
# Hypothèse env-spécifique (vérifiée ici via /context) : claude-opus-4-8 tourne en
# 1M ; sonnet/haiku = 200k. Un `[1m]` explicite force 1M quel que soit le modèle.
CONTEXT_WINDOW=""
case "${CLAUDE_ATELIER_CTX_WINDOW:-}" in
    ''|*[!0-9]*) ;;
    *) CONTEXT_WINDOW="$CLAUDE_ATELIER_CTX_WINDOW" ;;
esac
if [ -z "$CONTEXT_WINDOW" ]; then
    _FF_WIN="$(cd "$(dirname "$0")/.." && pwd)/.claude/features.json"
    CONTEXT_WINDOW=$(python3 -c "
import json, sys, os
p = sys.argv[1]
try:
    d = json.load(open(p)) if os.path.exists(p) else {}
    v = int(d.get('contextWindow', 0) or 0)
    print(v if v > 0 else '')
except Exception:
    print('')
" "$_FF_WIN" 2>/dev/null)
fi
if [ -z "$CONTEXT_WINDOW" ]; then
    case "$LIVE_MODEL$MODEL" in
        *'[1m]'*|*'[1M]'*|*opus-4-8*) CONTEXT_WINDOW=1000000 ;;
        *) CONTEXT_WINDOW=200000 ;;
    esac
fi

# Analyse Python — 5 derniers tours assistant → classification → verdict
METRICS=$(python3 - "$TRANSCRIPT" "$MODEL" <<'PYEOF'
import sys, json

transcript_path = sys.argv[1]
model = sys.argv[2]

LOW_TOOLS  = {'Read', 'Glob', 'Grep', 'NotebookRead', 'ListMcpResourcesTool', 'ReadMcpResourceTool'}
HIGH_TOOLS = {'Agent', 'WebSearch', 'WebFetch'}
# medium = tout le reste (Edit, Write, Bash, TodoWrite, ToolSearch, etc.)
# NOTE: Bash est toujours medium — proxy grossier sur le mix d'outils observé,
# pas une estimation de complexité réelle. Les sessions shell-intensives peuvent
# produire des faux 🟢. V1 assumée comme heuristique, pas comme contrat.

lines = []
try:
    with open(transcript_path, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
except Exception:
    sys.exit(0)

# Extraire les tours assistant avec tool_use
assistant_turns = []
for line in lines:
    line = line.strip()
    if not line:
        continue
    try:
        obj = json.loads(line)
    except Exception:
        continue

    content = None
    if obj.get('type') == 'assistant':
        content = obj.get('message', {}).get('content', [])
    elif obj.get('role') == 'assistant':
        content = obj.get('content', [])

    if content:
        tools = [c.get('name', '') for c in content if isinstance(c, dict) and c.get('type') == 'tool_use']
        if tools:
            assistant_turns.append(tools)

last5 = assistant_turns[-5:]

# Minimum 2 tours pour émettre
if len(last5) < 2:
    sys.exit(0)

LOW_C = 0
MED_C = 0
HIGH_C = 0

for turn_tools in last5:
    low_n  = sum(1 for t in turn_tools if t in LOW_TOOLS)
    high_n = sum(1 for t in turn_tools if t in HIGH_TOOLS)
    med_n  = len(turn_tools) - low_n - high_n
    if high_n > low_n and high_n >= med_n:
        HIGH_C += 1
    elif low_n >= med_n:
        LOW_C += 1
    else:
        MED_C += 1

total = len(last5)

# Tier modèle
model_lower = model.lower()
if 'opus' in model_lower:
    tier = 'opus'
elif 'haiku' in model_lower:
    tier = 'haiku'
else:
    tier = 'sonnet'

# Complexité dominante
if HIGH_C >= total * 0.6:
    complexity = 'high'
elif LOW_C >= total * 0.6:
    complexity = 'low'
else:
    complexity = 'medium'

# Verdict + pastille
VERDICTS = {
    # pastille : ⬆️ = monter de modèle, ⬇️ = descendre, = = optimal
    ('high',   'opus'):   ('optimal',      '🟢', ''),
    ('high',   'sonnet'): ('limite',        '⬆️', '/model opus recommandé'),
    ('high',   'haiku'):  ('insuffisant',   '⬆️', 'tâches complexes → /model opus'),
    ('medium', 'sonnet'): ('optimal',       '🟢', ''),
    ('medium', 'haiku'):  ('limite basse',  '⬆️', 'tâches standard → /model sonnet'),
    ('medium', 'opus'):   ('léger surplus', '⬇️', 'tâches standard → /model sonnet'),
    ('low',    'haiku'):  ('optimal',       '🟢', ''),
    ('low',    'sonnet'): ('léger surplus', '⬇️', 'tâches simples → /model haiku'),
    ('low',    'opus'):   ('surdimensionné','⬇️', 'tâches simples → /model sonnet'),
}

verdict, pastille, suggestion = VERDICTS.get((complexity, tier), ('inconnu', '=', ''))
detail = f"{HIGH_C}h/{MED_C}m/{LOW_C}l/{total}t"

line = f"[METRICS] fit:{complexity}({detail}) | model:{model} | {verdict}"
if suggestion:
    line += f" → {suggestion}"
line += f" {pastille}"

print(line)
PYEOF
)

if [ -n "$METRICS" ]; then
    echo "$METRICS"
fi

# Fenêtre contexte — somme input + cache_read + cache_creation du dernier tour assistant
# Détection assistant_like alignée sur routing-check.sh (type assistant/assistant.message + rôles imbriqués)
_CTX_INDICATOR=""
_CTX_RAW=$(python3 - "$TRANSCRIPT" "$CONTEXT_WINDOW" <<'PYEOF'
import sys, json

path = sys.argv[1]
last_total = 0

def assistant_like(node):
    if not isinstance(node, dict):
        return False
    if node.get('type') in ('assistant', 'assistant.message'):
        return True
    data = node.get('data', {}) if isinstance(node.get('data', {}), dict) else {}
    message = node.get('message', {}) if isinstance(node.get('message', {}), dict) else {}
    data_message = data.get('message', {}) if isinstance(data.get('message', {}), dict) else {}
    roles = [node.get('role', ''), data.get('role', ''), message.get('role', ''), data_message.get('role', '')]
    return any(r == 'assistant' for r in roles)

def extract_usage(node):
    """Cherche usage dans les 4 emplacements possibles du JSONL transcript."""
    if not isinstance(node, dict):
        return None
    data = node.get('data', {}) if isinstance(node.get('data', {}), dict) else {}
    message = node.get('message', {}) if isinstance(node.get('message', {}), dict) else {}
    data_message = data.get('message', {}) if isinstance(data.get('message', {}), dict) else {}
    for candidate in (message.get('usage'), data_message.get('usage'), node.get('usage'), data.get('usage')):
        if isinstance(candidate, dict):
            return candidate
    return None

try:
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                obj = json.loads(line)
            except Exception: continue
            if not assistant_like(obj):
                continue
            usage = extract_usage(obj)
            if usage:
                total = (usage.get('input_tokens') or 0) + \
                        (usage.get('cache_read_input_tokens') or 0) + \
                        (usage.get('cache_creation_input_tokens') or 0)
                if total > 0:
                    last_total = total
except Exception:
    sys.exit(0)

if last_total == 0:
    sys.exit(0)

try:
    CONTEXT_WINDOW = int(sys.argv[2])
except (IndexError, ValueError):
    CONTEXT_WINDOW = 200000
if CONTEXT_WINDOW <= 0:
    CONTEXT_WINDOW = 200000
pct = round(last_total / CONTEXT_WINDOW * 100)
indicator = f"{pct}%{'🔥' if pct >= 50 else '✅'}"
print(f"[CTX] fenêtre: {indicator}")
if pct >= 40:
    print(f"[CTX-WARN] ⚠️ CONTEXTE {pct}% — seuil 40% dépassé → /compact")
if pct >= 60:
    print("CTX-ALERT")
elif pct >= 35:
    print("CTX-COMPACT")
PYEOF
)
_CTX_PCT=""
if [ -n "$_CTX_RAW" ]; then
    echo "$_CTX_RAW" | grep '^\[CTX\]'
    echo "$_CTX_RAW" | grep '^\[CTX-WARN\]' || true
    _CTX_INDICATOR=$(echo "$_CTX_RAW" | grep '^\[CTX\]' | grep -oE '[0-9]+%[✅🔥]')
    _CTX_PCT=$(echo "$_CTX_RAW" | grep '^\[CTX\]' | grep -oE '[0-9]+%' | head -1)
fi

# §1 ENTÊTE — émis toujours si model connu (indépendant du nombre de tours dans le transcript).
# Garantit la pastille même en session compactée / début de session.
_FF="$(cd "$(dirname "$0")/.." && pwd)/.claude/features.json"
python3 -c "import json,sys,os; d=json.load(open(sys.argv[1])) if os.path.exists(sys.argv[1]) else {}; sys.exit(0 if d.get('header',True) else 1)" "$_FF" 2>/dev/null || exit 0
# Pastille : extraire depuis METRICS si disponible, 🟢 par défaut (session courte / compactée)
_PASTILLE=$(printf '%s' "$METRICS" | grep -oE '(⬆️|⬇️|🟢)' | tail -1)
[ -z "$_PASTILLE" ] && _PASTILLE="🟢"
# Entête strict : [date heure | model | ctx N%] PASTILLE. Rien d'autre (ni mode, ni ollama, ni proxy).
# La conso contexte n'est ajoutée que si connue (transcript avec usage) — sinon omise proprement.
_HDR_CTX=""
[ -n "$_CTX_PCT" ] && _HDR_CTX=" | ctx $_CTX_PCT"
[ -n "$MODEL" ] && {
    echo "⚡ §1 ENTÊTE FINAL (pastille réelle) :"
    echo "\`[$(date '+%m-%d %H:%M:%S') | $MODEL$_HDR_CTX] $_PASTILLE\`"
}

exit 0
