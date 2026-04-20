---
name: atelier-config
description: "Tableau de contrôle des features claude-atelier (on/off, paramètres). Affiche l'état de chaque rail et permet de les activer/désactiver."
figure: Régie
---

# Atelier Config — Tableau de contrôle

> La régie. Tous les rails sous les yeux. On allume, on éteint, on règle.

## Procédure

1. Lance `npx claude-atelier features` (ou `node bin/cli.js features` dans le repo source) et affiche le résultat.
2. Présente le tableau de bord avec l'état actuel de chaque feature (ON ✅ / OFF ❌).
3. Si l'utilisateur veut modifier un paramètre → exécute la commande correspondante.
4. Confirme le changement et rappelle que **Claude Code doit être relancé pour l'appliquer**.

## Commandes disponibles

```bash
# Afficher le tableau complet
npx claude-atelier features

# Activer / désactiver une feature
npx claude-atelier features --on  <feature>
npx claude-atelier features --off <feature>
npx claude-atelier features --toggle <feature>

# Cibler la config globale (~/.claude/features.json)
npx claude-atelier features --global

# Restaurer tous les défauts
npx claude-atelier features --reset
```

## Features disponibles

| ID | Groupe | Description |
|---|---|---|
| `header` | Runtime | En-tête §1 cockpit à chaque réponse |
| `ollama_status` | Runtime | Statut Ollama + proxy à chaque message |
| `model_routing_hints` | Runtime | Suggestions Haiku (exploration) / alerte Opus (tâche courte) |
| `session_length_warning` | Runtime | Alerte contexte > 300KB / 600KB |
| `review_copilot` | Qualité | Handoff §25 auto (feat terminée, 100+ lignes) |
| `stack_detection` | Qualité | Agent nommé selon stack détectée (Steve, Gaëlle…) |
| `design_detection` | Qualité | Propose Séréna si besoin UI/UX/design |
| `diagnostic` | Qualité | Vérification QMD / §0 / gate toutes les 30 min |
| `anti_loop` | Qualité | Bloque après 3 tentatives identiques consécutives |
| `git_guard_sign` | Guards Git | Bloque commits signés (Co-Authored-By) |
| `git_guard_french` | Guards Git | Messages de commit en français obligatoires |
| `git_guard_tests` | Guards Git | npm test doit passer avant git push |

## Conseils d'usage

- **Début de projet (build from scratch)** : désactive `review_copilot` et `diagnostic` pour aller vite sans friction.
- **Mode focus** : désactive `session_length_warning` si tu sais que le contexte sera long.
- **Mode revue qualité** : tout ON — aucun rail ne doit être ignoré.
- **La config vit dans** `.claude/features.json` — commitable dans le repo pour aligner l'équipe.
