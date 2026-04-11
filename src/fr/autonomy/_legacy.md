# autonomy.md

> Référencé depuis CLAUDE.md §23.

-----

## Modes de permission disponibles

|Mode               |Comportement                        |Quand                                     |
|-------------------|------------------------------------|------------------------------------------|
|`default`          |Confirmation à chaque action        |Dev interactif                            |
|`acceptEdits`      |Auto-approuve éditions, demande bash|**Plan Pro — tâches longues**             |
|`plan`             |Plan validé puis exécution libre    |Tâches complexes avec contrôle stratégique|
|`auto`             |Classifier IA décide                |Team/Enterprise uniquement                |
|`bypassPermissions`|Zéro guardrails                     |Docker/sandbox isolé uniquement           |


> Plan Pro → `acceptEdits` est le mode autonome disponible.
> `auto` mode nécessite un plan Team ou Enterprise (sorti le 24 mars 2026).

-----

## Config nuit — `.claude/settings.json`

```json
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git diff:*)",
      "Bash(git status:*)",
      "Read", "Glob", "Grep"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(sudo:*)",
      "Bash(git push:*)",
      "Bash(git push --force:*)"
    ]
  },
  "preferences": {
    "maxBudgetUsd": 20
  }
}
```

> `maxBudgetUsd` = disjoncteur automatique. Boucle infinie impossible au-delà.
> `git push` en deny = rien ne part en prod sans review manuelle le matin.

-----

## Pattern tâche de nuit

```bash
# 1. Écrire les specs dans /docs/specs.md avant de fermer
# 2. Lancer
claude --permission-mode acceptEdits \
  "Implémenter selon /docs/specs.md. \
   Écrire les tests. \
   Committer chaque étape de façon atomique. \
   Ne pas pusher. \
   Mettre à jour §0 de CLAUDE.md si nécessaire."

# 3. Le matin
git log --oneline        # review des commits
bash scripts/pre-push-gate.sh  # gate complète
git push                 # si tout est vert
```

-----

## Règles de sécurité non négociables en mode autonome

- `.claudeignore` obligatoire avant d’activer
- `git push` toujours en `deny`
- `sudo` toujours en `deny`
- `rm -rf` toujours en `deny`
- `maxBudgetUsd` toujours défini
- Audit log à relire le matin avant tout push

-----

## /loop — watcher récurrent (si supporté)

```bash
/loop 5m  check if deployment is complete
/loop 10m run tests, fix failures if any
/loop 15m /review-pr 1234
```