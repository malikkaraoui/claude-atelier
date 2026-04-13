---
id: hooks
title: Hooks d'enforcement
---

> Rules in CLAUDE.md → intentions. Hooks → guarantees.

Les hooks sont des scripts shell exécutés automatiquement par le harness Claude Code. Ils ne dépendent pas du raisonnement de Claude — ils s'exécutent inconditionnellement.

---

## Les 14 rails

| # | Hook | Événement | Ce qu'il fait |
|---|---|---|---|
| 1 | `routing-check.sh` | `SessionStart` | Injecte horodatage + modèle actif |
| 2 | `session-context.sh` | `SessionStart` | Charge `§0` du projet courant |
| 3 | `guard-no-sign.sh` | `PreToolUse` (commit) | Bloque `Co-Authored-By`, `--signoff` |
| 4 | `guard-commit-french.sh` | `PreToolUse` (commit) | Bloque messages purement anglais |
| 5 | `guard-secrets.sh` | `PreToolUse` (bash) | Détecte patterns de secrets dans les diffs |
| 6 | `guard-no-force-push.sh` | `PreToolUse` (push) | Bloque `git push --force` |
| 7 | `guard-tests-required.sh` | `PreToolUse` (commit) | Exige des tests sur les commits `feat:` |
| 8 | `guard-review-auto.sh` | `PostToolUse` (commit) | Challenger : 100+ lignes, feature, 10 commits, archi |
| 9 | `guard-anti-loop.sh` | `PostToolUse` | Détecte 3+ tentatives identiques → STOP |
| 10 | `guard-readme-sync.sh` | `PostToolUse` (commit `feat:`) | Rappel de mettre le README à jour |
| 11 | `guard-budget-check.sh` | `SessionStart` | Vérifie `maxBudgetUsd` défini en mode autonome |
| 12 | `guard-claudeignore.sh` | `PreToolUse` | Vérifie `.claudeignore` avant premier commit |
| 13 | `guard-gitignore.sh` | `PreToolUse` | Vérifie `.gitignore` avant premier commit |
| 14 | `guard-pre-push.sh` | `PreToolUse` (push) | Lance `scripts/pre-push-gate.sh` complet |

---

## Principe de fonctionnement

```
Claude veut exécuter un outil
         ↓
PreToolUse hooks s'exécutent
         ↓
Exit 0 → l'outil s'exécute
Exit 1+ → bloqué, message injecté dans le contexte
         ↓
PostToolUse hooks s'exécutent
```

Les hooks écrivent sur `stderr` — Claude voit leur output comme contexte injecté.

---

## Configuration dans settings.json

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/guard-secrets.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/guard-review-auto.sh" }
        ]
      }
    ]
  }
}
```

---

## Challenger — le garde-fou automatique

Le hook `guard-review-auto.sh` détecte 5 situations :

| Trigger | Signal | Action proposée |
|---|---|---|
| 100+ lignes modifiées | Volume élevé | `/review-copilot` ou `/angle-mort` |
| Commit `feat:` / `refactor:` | Feature terminée | `/angle-mort` avant de continuer |
| 10 commits sans review | Endurance | `/angle-mort` pause minimale |
| Fichier architecturant créé | Choix structurant | `/review-copilot` validation |
| 3+ tentatives échouées | Boucle | STOP, changer d'approche |

Le Challenger **propose**, il ne bloque pas. Exit code 0 toujours.

---

## Tests des hooks

```bash
npm test
```

Amine 🧪 (`test/hooks.js`) vérifie les 20 cas de chaque hook. Doit passer avant tout push.
