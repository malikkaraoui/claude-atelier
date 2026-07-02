---
id: hooks
title: Hooks d'enforcement
---

> Rules in CLAUDE.md → intentions. Hooks → guarantees.

Les hooks sont des scripts shell exécutés automatiquement par le harness Claude Code. Ils ne dépendent pas du raisonnement de Claude — ils s'exécutent inconditionnellement.

---

## Cockpit §1 — heads-up display

Chaque réponse Claude s'ouvre sur une ligne d'en-tête générée par les hooks :

```
`[06-25 18:55:13 | claude-opus-4-6] ⬇️`
```

| Champ | Valeurs | Signification |
|---|---|---|
| `timestamp` | `MM-DD HH:MM:SS` | Horodatage (mois-jour heure:minute:seconde) |
| `model` | `claude-opus-4-6` | Modèle actif (extrait du transcript live) |
| Pastille | `🟢` optimal · `⬆️` sous-dimensionné · `⬇️` surdimensionné | Fit modèle/complexité (METRICS) |

Un vrai tableau de bord pilote : modèle, coût, routage, infrastructure — en un coup d'œil.

---

## Les rails actifs

| # | Hook | Événement | Ce qu'il fait |
|---|---|---|---|
| 1 | `session-model.sh` | `SessionStart` | Cache le modèle de session pour routing cross-hooks |
| 2 | `vault-context.sh` | `SessionStart` | Charge le résumé Peter (brief/mailbox/roadmap) en contexte |
| 3 | `routing-check.sh` | `UserPromptSubmit` | Routing modèle (live > transcript > cache), détection stack, diagnostic, longueur session |
| 4 | `model-metrics.sh` | `UserPromptSubmit` | Analyse 5 derniers tours assistant → pastille `🟢/⬆️/⬇️` → §1 entête final |
| 5 | `detect-design-need.sh` | `UserPromptSubmit` | Détecte besoin UI/UX/design → propose Séréna 🎨 |
| 6 | `peter-inbox-check.sh` | `UserPromptSubmit` | Vérifie vault mailbox, signale priorités |
| 7 | `guard-no-sign.sh` | `PreToolUse` | Bloque `Co-Authored-By`, `--signoff` (commit) |
| 8 | `guard-commit-french.sh` | `PreToolUse` | Bloque messages purement anglais (commit) |
| 9 | `guard-qmd-first.sh` | `PreToolUse` | Redirige `.md` vers QMD avant lecture (Read) |
| 10 | `guard-loop-master.sh` | `PreToolUse` | Bloque commit si flag §25 manque (commit) |
| 11 | `guard-tests-before-push.sh` | `PreToolUse + PostToolUse` | Exige tests vert avant push (push / rappel) |
| 12 | `guard-review-auto.sh` | `PreToolUse + PostToolUse` | Gate 100+ lignes, feat, 10 commits, archi (push / challenger) |
| 13 | `guard-anti-loop.sh` | `PostToolUse` | Détecte N+ tentatives identiques (param configurable) |
| 14 | `guard-hooks-reload.sh` | `PostToolUse` | Rappel rechargement si hooks/settings modifiés |
| 15 | `guard-s1-header.sh` | `Stop` | Applique le format entête §1 final |

---

## Principe de fonctionnement

```
Utilisateur envoie un message
         ↓
UserPromptSubmit hooks (routing-check, model-metrics, detect-design)
         ↓
Claude raisonne + choisit un outil
         ↓
PreToolUse hooks s'exécutent
  Exit 0 → l'outil s'exécute
  Exit 2 → bloqué, message injecté dans le contexte
         ↓
PostToolUse hooks s'exécutent
```

---

## Pastille METRICS — fit modèle/complexité

`model-metrics.sh` analyse les 5 derniers tours assistant et classe chaque outil utilisé :

| Catégorie | Outils |
|---|---|
| `low` | Read, Glob, Grep, NotebookRead |
| `high` | Agent, WebSearch, WebFetch |
| `medium` | tout le reste (Edit, Write, Bash…) |

Si 60%+ des tours sont `high` → complexité `high`. Si 60%+ sont `low` → complexité `low`. Sinon `medium`.

| Complexité + Modèle | Verdict | Pastille |
|---|---|---|
| high + opus | optimal | 🟢 |
| high + sonnet | limite | ⬆️ |
| medium + sonnet | optimal | 🟢 |
| medium + opus | léger surplus | ⬇️ |
| low + haiku | optimal | 🟢 |
| low + sonnet | léger surplus | ⬇️ |

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

## Hooks et chemins machine-spécifiques

Les hooks dans `settings.json` contiennent des **chemins absolus** propres à chaque machine. `claude-atelier init` et `claude-atelier update` les **régénèrent systématiquement** — ils ne sont jamais réutilisés depuis une ancienne installation.

:::caution Ne pas copier settings.json entre machines
Les chemins de hooks sont absolus et machine-spécifiques. Lancer `claude-atelier init` sur chaque machine pour générer les bons chemins.
:::

---

## Tests des hooks

```bash
npm test
```

(`test/hooks.js`) — 37+ tests couvrant routing, METRICS, mode M/A, Ollama, race condition inter-hooks, gate handoff. Doit passer avant tout push.
