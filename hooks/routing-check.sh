#!/bin/bash
# Hook UserPromptSubmit — Model Routing Enforcement
# Injecté à chaque message utilisateur pour forcer le check du modèle

MODEL="${CLAUDE_MODEL:-inconnu}"

cat <<EOF
[ROUTING] modèle actif : $MODEL
Règle §15 : Opus → architecture/debug bloquant uniquement | Sonnet → dev standard | Haiku → exploration
Si mismatch tâche/modèle → annoncer + recommander /model [haiku|sonnet|opus] avant de continuer.
EOF
