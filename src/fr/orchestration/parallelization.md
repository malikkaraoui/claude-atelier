---
kind: orchestration
name: parallelization
loads_from: src/fr/CLAUDE.md §16
replaces: src/fr/orchestration/_legacy.md (partiel)
---

# Orchestration — Parallélisation

> Chargé à la demande. Aide à décider quand paralléliser et quand ne pas.

## Quand paralléliser

- **Tâches réellement indépendantes** : aucune ne dépend du résultat d'une
  autre (ex: écrire des tests pour 3 modules distincts)
- **Gain de temps significatif** : chaque tâche prend > 2 minutes seule
- **Budget disponible** : chaque agent parallèle consomme des tokens

## Quand NE PAS paralléliser

- **Tâches séquentielles** avec dépendances (A doit finir avant B)
- **Tâches < 2 min** : l'overhead de coordination > le gain
- **Budget token serré** : 3 agents en parallèle = 3× le coût d'un seul
- **Incertitude** : si on ne sait pas encore quoi faire, planifier d'abord
  (séquentiel), puis exécuter (potentiellement parallèle)

## Patterns de parallélisation recommandés

| Pattern | Agents | Exemple |
| --- | --- | --- |
| Fork exploratoire | 2-3 Explore en // | Chercher un pattern dans 3 dossiers différents |
| Feature parallèle | 2-3 Teammates | Feature + tests + docs simultanément |
| Audit croisé | 2 Teammates | Sécurité + performance en parallèle |
| Worktree parallèle | 2 Worktrees | Deux features indépendantes sur branches isolées |

## Discipline

- **Maximum 3-4 agents parallèles** en pratique : au-delà, la coordination
  et le budget dérapent
- **Toujours assigner des fichiers distincts** à chaque agent pour éviter
  les conflits
- **Un agent coordinator** (le parent) synthétise les résultats
- **Arrêter un agent dès qu'il a fini** : ne pas laisser idle

## Voir aussi

- `./modes.md` — Fork vs Teammate vs Worktree
- `./spawn-rules.md` — règles de prompt et limites par agent
- `./models-routing.md` — quel modèle pour quel rôle
