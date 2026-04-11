# orchestration.md

> Référencé depuis CLAUDE.md §16 et §19.

-----

## Les 3 modes d’isolation

|Mode                      |Isolation                    |Communication               |Usage                             |
|--------------------------|-----------------------------|----------------------------|----------------------------------|
|**Fork** (subagent)       |Contexte propre              |Résultat → parent uniquement|Exploration, tâche ciblée         |
|**Teammate** (Agent Teams)|Contexte + mailbox           |Peer-to-peer entre agents   |Coordination temps réel           |
|**Worktree**              |Contexte + branche git isolée|Via commits/merge           |Refactor risqué, feature parallèle|


> Worktree = seul mode où les fichiers sont isolés jusqu’au merge.
> Refactor > 3 fichiers → toujours `isolation: worktree`.

-----

## Activation Agent Teams

```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

-----

## Quand utiliser quel mode

|Situation                             |Mode           |
|--------------------------------------|---------------|
|Exploration codebase large            |Fork — Haiku   |
|Feature + tests + doc simultanés      |Teammate × 3   |
|Audit sécurité + perf en parallèle    |Teammate × 2   |
|Refactor multi-fichiers risqué        |Worktree × N   |
|Tâches indépendantes sans coordination|Fork parallèles|

-----

## Quand ne pas paralléliser

- Tâches séquentielles avec dépendances (A finit avant B)
- Tâches < 2 min (overhead > gain)
- Budget token serré

-----

## Modèle par rôle

|Rôle                      |Modèle              |
|--------------------------|--------------------|
|Team Lead                 |Sonnet              |
|Architecte                |Opus (si nécessaire)|
|Implémenteurs             |Sonnet              |
|Exploration / Tests / Lint|Haiku               |

-----

## Règles spawn

- Prompt spawn : court, ciblé, sans contexte superflu
- 5–6 tâches max par teammate (au-delà → overhead coordination)
- Chaque teammate = fichiers distincts → zéro overlap
- Nettoyer les agents dès la tâche terminée (consomment même idle)
- Teammate ne peut pas spawner d’autres teammates (architecture plate)

-----

## MCP — règles de chargement

- Charger uniquement les MCPs nécessaires à la session
- Trop de MCPs simultanés : fenêtre 200k → ~70k effectifs
- Lister les MCPs actifs dans §0 de CLAUDE.md
- Purger en fin de session si non persistants

-----

## /loop — watcher récurrent

```bash
/loop 5m check if deployment is complete
/loop 10m run tests, fix failures if any
/loop 20m /review-pr 1234
```

-----

## Pattern tâche de nuit

```bash
# Préparer les specs dans /docs/ avant de dormir
# Lancer avec budget plafonné
claude --permission-mode acceptEdits \
  "Implémenter selon /docs/specs.md, \
   écrire les tests, \
   committer chaque étape de façon atomique, \
   ne pas pusher"

# Le matin : git log → review → git push si gate verte
```