---
kind: autonomy
name: night-mode
loads_from: src/fr/CLAUDE.md §23
status: canonical
replaces: src/fr/autonomy/_legacy.md + src/fr/orchestration/_legacy.md (dedoublonnage)
---

# Autonomy — Night mode

> **Source canonique unique.** Avant P3, ce pattern était dupliqué entre
> `autonomy/_legacy.md` et `orchestration/_legacy.md`. Ce fichier est
> désormais la seule référence.

## Principe

Le **night mode** permet de laisser Claude travailler en autonomie sur
une tâche longue (build, refactor massif, série de tests, migration)
pendant que l'utilisateur est absent. Il repose sur :

1. Des **specs claires** écrites avant de lancer
2. Un **mode de permission** `acceptEdits` avec allow/deny listes strictes
3. Un **disjoncteur budget** (`maxBudgetUsd`)
4. Une **review manuelle le matin** avant tout push

## Pré-requis non négociables

- `.claudeignore` configuré (cf. `../security/secrets-rules.md` en P3.d)
- `.gitignore` à jour et committé
- `settings.json` chargé avec `defaultMode: acceptEdits` + allow/deny
  (cf. `../../templates/settings.json`)
- `maxBudgetUsd` **toujours défini**
- `git push` **toujours** en `deny`
- `sudo` et `rm -rf` **toujours** en `deny`

## Procédure

### 1. Préparer les specs avant de fermer

```bash
# Ecrire les specs dans un fichier partage avec Claude
vim docs/specs.md
# ou /docs/night-<date>.md pour garder un historique
```

Format minimal de specs :

```markdown
# Objectif
<une phrase>

# Contexte
<fichiers concernes, contraintes, tests a passer>

# Critere de reussite
<conditions pour considerer la tache faite>

# Hors scope
<ce qu'il ne faut PAS toucher>
```

### 2. Lancer Claude avec le bon mode

```bash
claude --permission-mode acceptEdits \
  "Implementer selon /docs/specs.md. \
   Ecrire les tests. \
   Committer chaque etape de facon atomique. \
   Ne pas pusher. \
   Mettre a jour §0 de CLAUDE.md si necessaire."
```

### 3. Review le matin

```bash
# 1. Review des commits
git log --oneline

# 2. Diff cumule depuis le dernier push
git diff origin/main..HEAD

# 3. Gate pre-push complete
bash scripts/pre-push-gate.sh

# 4. Push si tout est vert
git push
```

## Pièges classiques

- **Specs trop vagues** : Claude divergera vers une interprétation qu'on
  ne voulait pas. Toujours inclure un « Hors scope ».
- **Pas de `maxBudgetUsd`** : boucle infinie possible → portefeuille vidé.
  Ne jamais oublier.
- **`git push` autorisé** : du code non relu arrive en prod pendant la
  nuit. Jamais.
- **Tests manquants** : sans tests, aucune garantie de non-régression.
  Inclure « écrire les tests » dans le prompt de lancement.
- **Review expéditive le matin** : lire vraiment le diff, pas juste
  checker que la gate passe.

## Cas d'usage typiques

- Implémentation d'un plan BMAD déjà validé
- Refactor mécanique (rename, restructuration de fichiers)
- Migration de dépendances avec codemod
- Génération + itération sur une suite de tests
- Bug difficile laissé en exploration autonome avec hypothèses

## Supervision — Dispatch watchdog (architecture cible)

> **Le bash watchdog (`scripts/night-watchdog.sh`) est un fallback.**
> La vraie solution utilise les outils natifs Anthropic.

**Architecture cible :**

1. **Claude Code (VSCode)** travaille en `acceptEdits` sur la tâche
2. **Dispatch (Claude desktop app)** est programmé en parallèle comme
   superviseur : il vérifie périodiquement que le repo bouge (git status,
   fichiers modifiés récents)
3. Si Dispatch détecte une inactivité > N minutes → **notification push**
   sur iPhone via l'app Claude
4. Optionnel : Dispatch peut tenter de relancer la session ou créer un
   rapport de l'état au moment du crash

**Avantages vs bash watchdog :**

- Notifications push natives (iPhone) au lieu de osascript macOS
- Dispatch survit au crash de VSCode (processus indépendant)
- Cowork peut inspecter l'état visuel de VSCode si besoin
- Pas de script custom à maintenir

**Prérequis à investiguer :**

- [ ] Dispatch « Programmé » : peut-il exécuter un check récurrent ?
- [ ] Dispatch : a-t-il accès aux fichiers locaux / terminal ?
- [ ] Cowork : peut-il surveiller un autre processus Claude ?

> Quand ces questions sont résolues, remplacer cette section par la
> procédure concrète et retirer `scripts/night-watchdog.sh` du repo.

## Cas où ce mode est une mauvaise idée

- Décision architecturale ouverte (pas assez de cadrage)
- Tâche avec inconnues métier (Claude va improviser)
- Refactor sur du code flou non documenté
- Première session sur un projet inconnu (pas de `§0` rempli)
