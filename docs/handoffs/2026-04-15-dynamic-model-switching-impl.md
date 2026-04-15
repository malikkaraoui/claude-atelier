# Handoff — dynamic-model-switching (implémentation)

> Date : 2026-04-15
> Type : review
> Priorité : moyenne
> reviewedRange: afc212d..02b4c12

---

## De : Claude (Sonnet 4.6)

### Contexte

Feature complète en un commit (`02b4c12`). Deux volets :

**1. `hooks/model-metrics.sh`** — hook `UserPromptSubmit` qui analyse les 5 derniers tours assistant dans le transcript JSONL de la session Claude Code. Pour chaque tour, il identifie l'outil dominant (low = Read/Glob/Grep, high = Agent/WebSearch/WebFetch, medium = tout le reste). Il détermine la complexité dominante sur l'échantillon, la compare au modèle actif, et émet une ligne `[METRICS]` avec une pastille 🟢/🟠/🔴.

**2. `scripts/switch_model.py`** — script autonome qui injecte `/model <alias>` dans le pane tmux cible via `tmux send-keys`. Permet de changer de modèle en cours de session sans redémarrage, de façon chirurgicale par pane ID.

**Modifications support :**
- `settings.json` : hook ajouté + `python/python3 scripts/switch_model.py*` et `tmux send-keys*` en `permissions.allow`
- `CLAUDE.md` §1 : pastille ajoutée à la ligne d'horodatage
- `CLAUDE.md` §15 : règle auto-métriques + switch explicite direct
- 4 nouveaux tests (33/33 vert)

### Question précise

Trois angles à challenger :

**(a) Robustesse du parsing JSONL**
Le hook parse le transcript Claude Code avec `json.loads()` ligne par ligne. Il cherche `{"type":"assistant","message":{"content":[{"type":"tool_use","name":"X"}]}}` ou `{"role":"assistant","content":[...]}`. Ces deux formats sont-ils exhaustifs pour le transcript réel de Claude Code 0.20.x ? Y a-t-il des formats intermédiaires (nested, streaming chunks, system messages avec tool_use) qui pourraient fausser les comptages ?

**(b) Classification 3 niveaux**
`LOW_TOOLS = {Read, Glob, Grep, NotebookRead, ...}` — `HIGH_TOOLS = {Agent, WebSearch, WebFetch}` — tout le reste est `medium`.
Est-ce que `TodoWrite` en medium est correct ? `ToolSearch` ? `Bash` est medium même pour une commande longue/complexe — est-ce une approximation acceptable pour V1, ou un biais structurel qui produira des faux 🟢 ?

**(c) Sécurité tmux injection**
`tmux send-keys -t <pane> "/model sonnet" Enter` — si le pane cible est en train d'attendre une entrée dans un autre contexte (ex: vim, less, une confirmation y/n), l'injection `/model sonnet\n` sera envoyée à ce contexte, pas au REPL Claude Code. Quel est le risque réel ? Faut-il un guard (ex: vérifier que le pane contient `>` ou `claude`) avant d'injecter ?

### Fichiers à lire

```text
hooks/model-metrics.sh
scripts/switch_model.py
.claude/settings.json  (section hooks + permissions uniquement)
test/hooks.js          (section model-metrics.sh, lignes ~280-340)
```

### Contraintes / hors scope

- Ne pas réécrire le parsing Python — il est intentionnellement minimaliste (V1)
- Ne pas proposer PostToolUse comme source de données — décision Copilot précédente (handoff plan)
- Le throttle et l'émission conditionnelle sont V2 — pas en scope
- Si tmux guard est nécessaire, proposer le patch le plus minimal possible

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, à la
suite du document existant, dans la section `## Réponse de : Copilot/GPT`.
Tu ne dois PAS répondre dans le chat, ni dans le prompt, ni dans un autre fichier.
Ce document est le vase communicant entre GPT et Claude. Utilise Edit/Write.
Quand tu as fini, dis : "J'ai répondu dans [chemin du fichier]."

<!-- Réponse ci-dessous -->

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
