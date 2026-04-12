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

## Supervision — Tâche planifiée Cowork

Le watchdog utilise les **tâches planifiées Cowork** (app Claude desktop),
pas un script bash custom. La tâche planifiée tourne en parallèle de
Claude Code dans VSCode, sur la même machine.

### Comment ça marche

| Composant | Rôle |
| --- | --- |
| Claude Code (VSCode) | Travaille en `acceptEdits` sur la tâche |
| Tâche planifiée Cowork | Vérifie périodiquement que le repo bouge |
| Dispatch (mobile) | Reçoit les notifications push si crash détecté |

### Créer le watchdog

**App Claude desktop → Programmé → + Nouvelle tâche :**

- **Nom** : `night-watchdog`
- **Description** : Surveille l'activité Claude Code sur le projet courant
- **Prompt** :

```text
Regarde les fichiers du dossier de travail. Trouve le fichier modifie
le plus recemment. Si aucun fichier n'a ete modifie depuis plus de
10 minutes, envoie une notification : "Claude Code semble bloque sur
[nom du projet] — aucune activite depuis 10 minutes. Dernier fichier
modifie : [nom] a [heure]." Si des fichiers ont ete modifies recemment,
ne fais rien et termine silencieusement.
```

- **Fréquence** : Horaire (puis ajuster via `/schedule update` si besoin)
- **Dossier de travail** : le repo du projet courant
- **Modèle** : Claude Haiku 4.5 (suffisant, pas cher)

### 3 méthodes de scheduling comparées

| Méthode | Tourne sur | Machine allumée ? | Accès fichiers locaux | Intervalle min |
| --- | --- | --- | --- | --- |
| **Desktop (Cowork)** | Ta machine | Oui + app ouverte | Oui | 1 min |
| **Cloud** (claude.ai) | Cloud Anthropic | **Non** | Non (clone GitHub) | 1 heure |
| **`/loop`** | Ta machine | Oui + session ouverte | Oui | 1 min |

**Desktop = le bon choix pour le night-mode** : ta machine est allumée
(sinon Claude Code ne tournerait pas), l'app Claude est ouverte, et la
tâche a accès aux fichiers locaux.

Cloud = utile si tu veux vérifier le repo GitHub même machine éteinte
(ex : un CI overnight). Intervalle minimum 1 heure.

### Ce que Dispatch apporte

Dispatch = un fil de conversation persistant entre ton iPhone et le
desktop. Quand la tâche planifiée détecte un problème :

1. **Notification push sur iPhone** via l'app Claude
2. Tu peux **répondre depuis ton tel** (ex : « relance la session »)
3. Dispatch route ta demande vers Cowork sur le desktop
4. Claude agit (relance, diagnostic, rapport)

### Procédure night-mode complète

```bash
# 1. Soir — préparer les specs
vim docs/specs.md

# 2. Créer le watchdog dans l'app Claude desktop
#    (Programmé → + Nouvelle tâche → config ci-dessus)

# 3. Lancer Claude Code
claude --permission-mode acceptEdits \
  "Implementer selon docs/specs.md. Committer chaque etape. Ne pas pusher."

# 4. Aller dormir — le watchdog surveille

# 5. Matin — review
git log --oneline
bash scripts/pre-push-gate.sh
git push
```

### Fallback : watchdog bash

Si l'app Claude desktop n'est pas disponible (headless, serveur CI),
le script `scripts/night-watchdog.sh` reste utilisable comme fallback.
Il notifie via `osascript` (macOS) au lieu de Dispatch.

## Cas où ce mode est une mauvaise idée

- Décision architecturale ouverte (pas assez de cadrage)
- Tâche avec inconnues métier (Claude va improviser)
- Refactor sur du code flou non documenté
- Première session sur un projet inconnu (pas de `§0` rempli)
