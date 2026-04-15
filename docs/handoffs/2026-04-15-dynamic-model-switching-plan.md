# Handoff — dynamic-model-switching-plan

> Date : 2026-04-15
> Type : plan-review (aucun code écrit — review avant dev)
> Priorité : haute
> reviewedRange: afc212d3c6ca041e9fc09a5d8fc54c7bfcca0c52..afc212d3c6ca041e9fc09a5d8fc54c7bfcca0c52

---

## De : Claude (Sonnet 4.6)

### Contexte

Nouvelle feature en deux volets, **aucun code n'existe encore** — ce handoff est une review de plan avant implémentation.

**Volet 1 — Model switching dynamique**
Malik a confirmé l'approche : injection de `/model <alias>` via tmux dans le REPL Claude Code, sans redémarrage de session, isolée par pane (pas d'impact cross-fenêtres VSCode). La doc de référence est `claude-code-dynamic-model-switching.md` à la racine du repo.

**Volet 2 — Auto-métriques par prompt (la vraie nouveauté)**
Exigence explicite de Malik : "je ne veux pas que cela soit à ma discrétion, ni même que tu y penses — je veux retour métric sans que cela soit de ta volonté." Autrement dit : un hook qui publie des métriques de model-fit à **chaque prompt**, automatiquement, sans que Claude décide de le faire.

---

### Plan d'implémentation proposé

#### Composant 1 — `scripts/switch_model.py`

Script Python qui injecte `/model <alias>` dans un pane tmux ciblé :

```
Claude détecte surdimensionnement
  → propose switch (1 ligne)
  → attend confirmation Malik
  → exécute : python scripts/switch_model.py sonnet
  → confirm switch effectif
```

- Modèles valides : `opus`, `sonnet`, `haiku` (+ `opusplan` si supporté)
- Pane cible passé en arg ou configuré dans settings
- Isolation totale entre fenêtres VSCode (pane ID = scope)

**Question (a)** : L'intégration doit-elle être dans `bin/cli.js` comme sous-commande `claude-atelier model <alias>` ou rester un script standalone dans `scripts/` ? La CLI est plus propre mais ajoute une surface d'API publique.

---

#### Composant 2 — `hooks/model-metrics.sh` (nouveau hook UserPromptSubmit)

Un hook qui s'exécute à chaque prompt **sans intervention de Claude** et sort une ligne `[METRICS]` dans le contexte.

**Source des données** : parsing du transcript JSONL (déjà disponible via le payload du hook `routing-check.sh`). Les 10 derniers `tool_use` sont classifiés :

| Catégorie | Outils |
|-----------|--------|
| high complexity | `Agent`, `Bash` (long/multi-commandes), `Write` (nouveau fichier) |
| routine | `Read`, `Glob`, `Grep`, `Edit` |

**Métriques produites (1 ligne)** :

```
[METRICS] complexity:low(8/10) | model:opus | verdict:⚠️ surdimensionné → /model sonnet
[METRICS] complexity:high(7/10) | model:sonnet | verdict:✓ optimal
[METRICS] complexity:high(7/10) | model:haiku | verdict:⚠️ insuffisant → /model sonnet
```

**Seuils envisagés** :
- `opus` + `low >= 80%` → surdimensionné → recommander sonnet
- `haiku` + `high >= 50%` → insuffisant → recommander sonnet
- `sonnet` + `high >= 70%` → envisager opus si architecture/plan

**Question (b)** : La classification `Write = high` et `Edit = routine` est-elle correcte ? `Write` crée un nouveau fichier (plus d'intention), `Edit` est un patch ciblé. Ou les deux devraient-ils être `routine` ?

**Question (c)** : Faut-il un hook **séparé** (`model-metrics.sh`) ou plutôt un module intégré dans `routing-check.sh` ? Séparé = isolation de responsabilité mais deux processus à chaque prompt. Intégré = un seul fork mais `routing-check.sh` devient très gros.

---

#### Composant 3 — Logging des tool calls (optionnel)

Alternative au parsing transcript : un hook `PostToolUse` (matcher `.*`) qui log chaque outil utilisé dans `/tmp/claude-session-tasks-$PPID.jsonl`.

Avantage : données structurées, pas de parsing JSONL complexe.
Inconvénient : hook supplémentaire sur chaque tool call (performance ? overhead ?).

**Question (d)** : Parsing du transcript vs logger PostToolUse — lequel est plus robuste ? Le transcript peut changer de format entre versions ; le logger PostToolUse dépend d'un overhead par outil.

---

#### Composant 4 — `CLAUDE.md` §15 (mise à jour)

Remplacer "Routing : Haiku exploration / Sonnet standard / Opus architecture" par :

> Les métriques de model-fit sont **auto-injectées à chaque prompt** via `hooks/model-metrics.sh`. La ligne `[METRICS]` apparaît en contexte avant chaque réponse. Claude **ne décide pas** de surveiller — c'est mécanique.

Et ajouter une règle : si `[METRICS]` indique `surdimensionné` ou `insuffisant`, Claude **doit** proposer le switch dans sa prochaine réponse (pas optionnel).

---

#### Composant 5 — Tests + Manifest

- `hooks-manifest.json` : entrée `model-metrics.sh`
- `test/hooks.js` : 2 nouveaux cas (complexity=low + opus → verdict surdimensionné ; complexity=high + haiku → verdict insuffisant)
- `npm test` doit passer

---

### Questions précises pour Copilot

**(a) CLI intégrée vs script standalone pour switch_model ?**
Avantages/risques de chaque approche dans le contexte d'un outil CLI public.

**(b) Classif tool calls : Write = high ou routine ?**
Et plus généralement : est-ce que `Agent` seul devrait être `high`, les autres `medium` et `low` ? 3 niveaux vs 2 ?

**(c) hook séparé vs module routing-check.sh ?**
Du point de vue maintenabilité et performance (overhead à chaque prompt).

**(d) Transcript parsing vs PostToolUse logger ?**
Robustesse, fragilité, performances.

**(e) Format 1 ligne `[METRICS]` : risque de pollution de contexte ?**
Si ce hook fire à chaque prompt, sur 100 échanges = 100 lignes `[METRICS]` dans l'historique. Est-ce que ça pollue ? Faut-il un throttle (ex: 1 fois toutes les 3 prompts) ?

### Fichiers à lire

```text
claude-code-dynamic-model-switching.md
hooks/routing-check.sh
.claude/settings.json (section hooks)
.claude/hooks-manifest.json
test/hooks.js
```

### Contraintes / hors scope

- Pas de dépendance Python obligatoire pour les hooks shell (Python peut être utilisé en fallback si bash devient complexe)
- Le switch model doit rester une **proposition** + confirmation Malik, jamais automatique sans accord
- Rester < 2 lignes de sortie hook pour ne pas polluer le contexte
- Pas de refactor de `routing-check.sh` avant validation du plan

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
Tu DOIS écrire ta réponse **directement dans CE MÊME FICHIER `.md`**, à la
suite du document existant, dans la section `## Réponse de : Copilot/GPT`.
**Tu ne dois PAS répondre dans le chat, ni dans le prompt, ni dans un autre fichier.**
Ce document est le **vase communicant** entre GPT et Claude : la réponse utile
doit vivre ici, pas ailleurs. Utilise ton outil d'édition de fichier
(Edit, Write, ou équivalent) pour écrire ci-dessous.
Quand tu as fini, dis simplement à l'utilisateur :
"J'ai écrit ma réponse dans [chemin du fichier]. Tu peux la montrer à Claude."

<!-- Réponse ci-dessous -->

---

## Intégration
<!-- Claude remplit après lecture de la réponse Copilot -->
