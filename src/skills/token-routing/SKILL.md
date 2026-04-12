---
name: token-routing
description: "Explique et configure le routing Haiku/Sonnet/Opus pour économiser les tokens. Utiliser quand l'utilisateur s'inquiète du coût ou veut optimiser."
---

# Token Routing

Le routing des modèles est une stratégie d'économie de tokens qui
assigne le bon modèle au bon rôle. Le but : ne pas utiliser Opus
pour un `grep`.

## Table de routing

| Rôle | Modèle | Pourquoi |
| --- | --- | --- |
| **Session principale** | Sonnet | Bon ratio coût/qualité |
| **Subagents Explore** | Haiku | Rapide, pas cher, suffisant pour lire |
| **Tests / lint** | Haiku | Tâche mécanique |
| **Architecture critique** | Opus | Raisonnement profond |
| **Debug bloquant** | Opus (via `/effort high`) | Quand Sonnet tourne en rond |

## Configuration actuelle

Vérifie `.claude/settings.json` :

```json
{
  "model": "sonnet",
  "env": {
    "CLAUDE_CODE_SUBAGENT_MODEL": "haiku",
    "MAX_THINKING_TOKENS": "10000"
  }
}
```

## Le problème que ça résout

Sans routing, une session de nuit peut consommer **10× plus de tokens**
qu'une session routée :

- Opus pour explorer 50 fichiers = 💸💸💸
- Haiku pour explorer 50 fichiers = 💰 (50× moins cher)

Le routing n'est pas de l'optimisation prématurée. C'est de la
**survie budgétaire** en night-mode.

## Quand monter en effort

- `/effort low` : rename, typo, lookup → ~2k thinking tokens
- `/effort medium` : implémentation standard → ~10k (défaut)
- `/effort high` : architecture, debug complexe → ~30k+

Monter en `/effort high` automatiquement quand le champ lexical
contient : architecture, plan, conception, migration, refactor
critique, schéma DB, decision irréversible.

## Action

Si la config n'est pas en place → proposer de l'ajouter dans
settings.json. Si elle est en place → afficher la table et confirmer
que tout est configuré.
