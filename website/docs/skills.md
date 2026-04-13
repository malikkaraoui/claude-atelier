---
id: skills
title: Skills — Slash Commands
---

Les skills sont des slash commands disponibles dans Claude Code. Ils chargent dynamiquement une procédure dans le contexte.

---

## Les 13 skills

| Skill | Commande | Description |
|---|---|---|
| Atelier Help | `/atelier-help` | Vue d'ensemble, navigation, aide |
| Atelier Setup | `/atelier-setup` | Configuration initiale d'un nouveau projet |
| Atelier Doctor | `/atelier-doctor` | Audit de l'installation |
| Night Launch | `/night-launch` | Lance une session de nuit avec checklist |
| Review Copilot | `/review-copilot` | Génère un handoff markdown pour GPT/Copilot |
| Angle Mort | `/angle-mort` | Auto-review rapide, cherche les angles morts |
| Integrate Review | `/integrate-review` | Trie les retours d'un review externe |
| Audit Safe | `/audit-safe` | Audit sécurité + secrets sur le diff staged |
| BMAD Init | `/bmad-init` | Plan → validation → implémentation |
| Compress | `/compress` | Résume le contexte pour `/compact` |
| QMD Init | `/qmd-init` | Configure l'intégration QMD |
| iOS Setup | `/ios-setup` | Configure un projet iOS |
| Token Routing | `/token-routing` | Recommande le bon modèle pour la tâche |

---

## Review Copilot — workflow

```
/review-copilot
      ↓
docs/handoffs/YYYY-MM-DD-<feature>.md généré
      ↓
Colle dans Copilot ou ChatGPT
      ↓
/integrate-review — triage des retours
```

---

## Angle Mort — auto-review

`/angle-mort` en 3 étapes :

1. Parcourt les derniers commits
2. Identifie ce qui n'a pas été challengé (tests, edge cases, doc)
3. Liste les risques — ne propose pas de fix, signale uniquement

---

## BMAD Init

Build, Map, Architect, Deliver.

```
/bmad-init
      ↓
Phase 1 : Plan (architecture, fichiers à créer)
      ↓
Validation humaine
      ↓
Phase 2 : Implement (commits atomiques)
      ↓
Phase 3 : Deliver (gate + push)
```

---

## Créer un skill custom

```markdown
---
name: mon-skill
description: Description courte pour la détection automatique
---

# Contenu du skill

Procédure, règles, templates, checklist.
```

Placement : `.claude/skills/mon-skill/SKILL.md`
