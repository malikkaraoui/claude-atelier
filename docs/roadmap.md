# claude-atelier — Roadmap

> **Document de reprise.** Permet à n'importe quelle session Claude
> de reprendre le travail exactement où il s'est arrêté.
>
> Mis à jour : 2026-04-12
> Source de vérité : ce fichier (pas la mémoire, pas le CHANGELOG).

---

## Principes directeurs

- **Bilingue FR/EN** — FR est la source de vérité, EN mirroré plus tard
- **Workflow personnel** — la config est opinionated, pas générique
- **Commits atomiques** — 1 par étape, messages français, **jamais signer**
  (pas de trailer `Co-Authored-By`)
- **CLAUDE.md ≤ 150 lignes** — règle absolue, vérifier à chaque édition
- **Zéro faux positif de hook accepté** — toujours filtrer les
  suggestions `vercel-plugin` / `ai-sdk` / etc. quand hors-sujet
- **Distribution** : A (NPM plain `npx claude-atelier init`) d'abord,
  B (Claude Code plugin) ensuite

---

## État d'avancement

### ✅ P1 — Foundation (terminée, poussée)

10 commits : LICENSE, .gitignore, package.json 0.1.0, README bilingue,
CHANGELOG Keep a Changelog, arborescence `src/`, déplacement des 5
fichiers historiques, `bin/cli.js` squelette.

### ✅ P2 — Refactor core (terminée, poussée)

9 commits :

- Résolu contradiction §5 ↔ §12 (plus de critique inventée forcée)
- Corrigé toutes les refs `/docs/claude/*` cassées
- Extrait §10 → 7 fichiers `src/stacks/` (javascript/python/java complets,
  react-vite/firebase/docker/ollama en stubs)
- Extrait §9 → `src/templates/project-structure.md`
- Consolidé `settings.json` dans `src/templates/`
  (fin de la drift §15 / §23)
- Extrait §12 → `src/fr/runtime/code-review.md`
- Extrait §17, §18 → `src/fr/runtime/todo-session.md` +
  `extended-thinking.md`
- Réduit `CLAUDE.md` de 285 → 149 lignes (cible ≤ 150)
- Warnings lint legacy réglés (MD041, MD012, MD040, MD047, MD060)

### ✅ P3.a — Ecosystem (terminée, poussée)

5 commits, 5 nouveaux satellites qui comblent des angles morts :

- `src/fr/ecosystem/skills.md` — skills system (local + plugin)
- `src/fr/ecosystem/plugins.md` — marketplace + discipline
- `src/fr/ecosystem/hooks.md` — hooks Claude Code + pièges
- `src/fr/ecosystem/memory-system.md` — auto-memory
- `src/fr/ecosystem/qmd-integration.md` — QMD pour Claude
  (guide user complet reste dans `docs/qmd-user-guide.md`)

### ✅ P3.b — Autonomy refactor (terminée, poussée)

4 commits :

- `permission-modes.md` — table des 5 modes + anti-patterns
- `night-mode.md` — **source canonique unique** (était dupliqué entre
  autonomy et orchestration)
- `loop-watchers.md` — **source canonique unique** (idem)
- Supprimé `autonomy/_legacy.md`
- Mis à jour CLAUDE.md §23 → `./autonomy/` (dossier)

---

## 🚧 P3.c — Orchestration refactor (à faire)

**Split de `src/fr/orchestration/_legacy.md` en satellites structurés.**

Fichiers à créer (un commit par fichier) :

1. **`src/fr/orchestration/modes.md`**
   Contenu : table Fork / Teammate / Worktree + activation Agent Teams
   (env var `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`).
   Règle : refactor > 3 fichiers → toujours `isolation: worktree`.

2. **`src/fr/orchestration/subagents.md`** ⭐ **NOUVEAU**
   Contenu : catalog des subagents disponibles dans un harness Claude
   Code moderne :
   - `Explore` (recherche large), `Plan` (architecte)
   - `feature-dev:code-explorer` / `code-architect` / `code-reviewer`
   - `code-simplifier:code-simplifier`
   - `superpowers:*`
   - Plugins bundlés (vercel-plugin:*, Notion:*, etc.)
   Pour chaque : quand l'utiliser, quand NE PAS, coût, sortie attendue.
   Angle mort : l'ancien CLAUDE-core.md ne parlait que de Fork/Teammate/
   Worktree, pas des subagents nommés.

3. **`src/fr/orchestration/parallelization.md`**
   Contenu : table « Quand utiliser quel mode » + section « Quand ne pas
   paralléliser » (dépendances, < 2 min, budget serré).

4. **`src/fr/orchestration/models-routing.md`**
   Contenu : table Modèle par rôle (Team Lead / Architecte / Implémenteurs
   / Tests = Sonnet / Opus / Sonnet / Haiku).

5. **`src/fr/orchestration/spawn-rules.md`**
   Contenu : règles spawn (prompt court, 5-6 tâches max, fichiers distincts,
   nettoyage, architecture plate).

6. **`src/fr/orchestration/mcp-lifecycle.md`**
   Contenu : règles de chargement MCP (purger, lister dans §0, fenêtre
   200k → ~70k avec trop de MCPs).

7. **Commit final P3.c** : supprimer `orchestration/_legacy.md`,
   mettre à jour CLAUDE.md §16 et §19 (ref vers `./orchestration/`).

> ⚠️ Pour le template de spawn et les règles, `night-mode.md` et
> `loop-watchers.md` sont les sources canoniques — ici on pointe vers
> elles, on ne duplique pas.

---

## 🚧 P3.d — Security refactor + livraison script (à faire)

**Split de `src/fr/security/_legacy.md` + enfin livrer
`scripts/pre-push-gate.sh`.**

Fichiers à créer :

1. **`src/fr/security/secrets-rules.md`**
   Contenu : principe absolu, liste `.gitignore` + `.claudeignore`,
   patterns suspects regex (sk-, AKIA, ghp_, AIza, etc.), audit manuel.

2. **`src/fr/security/pre-push-gate.md`**
   Contenu : documentation du gate (5 étapes : secrets → fichiers
   sensibles → lint → build → tests), adaptation par stack (table),
   règle « jamais `--no-verify` ».
   **Référence** le vrai script `scripts/pre-push-gate.sh` (à livrer
   au même commit).

3. **`src/fr/security/emergency.md`**
   Contenu : procédure d'urgence clé committée accidentellement
   (révoquer → filter-branch → force push → notifier).
   ⚠️ Marquer explicitement que `--force push` est le **seul cas
   autorisé**, en écho à §22.

4. **`scripts/pre-push-gate.sh`** ⭐ **ENFIN LIVRÉ**
   Le script shell complet, testable, avec shebang + exit codes clairs.
   Adapté par stack via détection auto (présence de `package.json`,
   `pyproject.toml`, `pom.xml`, `build.gradle`).

5. **`src/templates/.claudeignore`**
   Template d'ignore list pour Claude lui-même (secrets que Claude ne
   doit jamais lire).

6. **Commit final P3.d** : supprimer `security/_legacy.md`, mettre à
   jour CLAUDE.md §22 et §24.

---

## 🚧 P3.e — Cleanup refs CLAUDE.md

Un commit unique pour passer en revue `src/fr/CLAUDE.md` et s'assurer
que **plus aucune ref `_legacy.md` ne subsiste** après P3.c et P3.d.

Vérifier aussi :

- §16 Orchestration → `./orchestration/` (dossier)
- §19 MCP → `./orchestration/mcp-lifecycle.md`
- §22 Secrets → `./security/`
- §24 Pre-push → `./security/pre-push-gate.md` + script
- §25 Inter-agents : déplacer dans `./orchestration/subagents.md` ?
  Ou garder comme rappel inline ? Décision à prendre.
- Longueur finale : **≤ 150 lignes obligatoire**

---

## 🚧 P3.f — CHANGELOG P3

Mettre à jour la section `[Unreleased]` avec toutes les additions P3 :
5 satellites ecosystem, 3 fichiers autonomy, 6 fichiers orchestration,
3 fichiers security, script pre-push-gate.sh, template .claudeignore.

Format : même style que la section P2 dans CHANGELOG.md actuel.

---

## 🚧 P3.g — Étoffer les stubs de stacks (optionnel, bas prio)

4 stubs à enrichir avec du contenu vrai :

- `src/stacks/react-vite.md` — composants, hooks rules, Zustand/Jotai,
  Vitest, a11y, perf (memo/lazy/suspense)
- `src/stacks/firebase.md` — règles Firestore/Storage, Cloud Functions,
  emulator suite, Secret Manager
- `src/stacks/docker.md` — multi-stage, non-root user, healthchecks,
  BuildKit secrets, tags immuables
- `src/stacks/ollama.md` — modèle local vs cloud, Modelfile, VRAM,
  quantization, embeddings, sécurité API locale

À faire quand l'utilisateur démarre un projet réel utilisant chaque
stack — le contenu sera meilleur en étant dicté par le vrai besoin.

---

## 🚧 P4 — CLI & tests & CI

### P4.a — Vrai installeur `bin/cli.js`

Remplacer les stubs par :

- `init` : copie `src/` dans `.claude/` (projet) ou `~/.claude/` (global),
  fusionne `settings.json` sans écraser un existant, crée `CLAUDE.project.md`
  depuis `templates/CLAUDE.project.md`, installe les hooks
- `init --lang fr|en` : choix de la langue (fr défaut)
- `init --global` : installe dans `~/.claude/`
- `init --dry-run` : affiche ce qui serait copié sans rien faire
- `update` : met à jour en préservant `§0` du projet et `settings.json` custom
- `doctor` : vérifie que `.claude/` est conforme à `src/`, signale les
  drifts, les refs cassées, les hooks manquants
- `lint` : valide que tous les refs markdown résolvent

### P4.b — Tests auto

- `test/lint-refs.js` — regex + fs.existsSync sur tous les liens
  `./X/Y.md` et `../X/Y.md` dans `src/`
- `test/lint-length.js` — `CLAUDE.md` ≤ 150 lignes (échec si dépassé)
- `test/lint-contradictions.js` — détecte les patterns problématiques
  (ex : nouvelle « Contradiction active » qui reviendrait dans §12)
- `test/lint-translations.js` — parité structurelle FR ↔ EN (sections,
  ordre, nombre de satellites)
- `test/shellcheck.sh` — lance shellcheck sur `scripts/` et `hooks/`

### P4.c — CI GitHub Actions

- `.github/workflows/ci.yml` — lance `lint`, `test`, `shellcheck` sur
  chaque PR et sur push `main`
- `.github/workflows/release.yml` — à la création d'un tag `v*`,
  lance la CI puis `npm publish --access public`

### P4.d — Premier vrai release NPM

- Bump semver (0.1.0 → 0.2.0, pré-release possible en `0.2.0-beta.1`)
- Tag git signé (`git tag -a v0.2.0`)
- `npm publish`
- Vérifier que `npx claude-atelier init` fonctionne depuis un dossier vierge

---

## 🚧 P5 — Claude Code plugin wrapper (optionnel)

Packager la config comme un **Claude Code plugin** installable via
`/plugin install claude-atelier`.

- Créer `.claude-plugin/plugin.json` au format marketplace
- Exposer les slash commands (`/claude-atelier-init`, etc.)
- Publier via un repo marketplace (le repo actuel ou un fork)

Priorité : basse. À faire **après** que P4 soit stable et qu'on ait
des retours d'usage sur P4 quelques semaines.

---

## Ordre de priorité recommandé

```text
1. P3.c — Orchestration refactor         (7 commits)
2. P3.d — Security refactor + script     (6 commits)
3. P3.e — Cleanup CLAUDE.md refs         (1 commit)
4. P3.f — CHANGELOG P3                   (1 commit)
5. Push  → checkpoint GitHub
6. P4.a — Vrai installeur CLI            (~10 commits)
7. P4.b — Tests auto                     (~5 commits)
8. P4.c — CI GitHub Actions              (~2 commits)
9. P4.d — Release NPM 0.2.0              (~2 commits)
10. P3.g — Étoffer stubs stacks          (opportuniste, 4 commits)
11. P5   — Plugin wrapper                (plus tard)
```

## Checklist de reprise (à suivre à chaque session)

1. Lire ce fichier en premier
2. Vérifier `git status` et `git log --oneline -5`
3. Lire la mémoire (`~/.claude/projects/*/memory/MEMORY.md`)
4. Pointer `CLAUDE.md` — toujours ≤ 150 lignes, pas de ref cassée
5. Identifier la dernière étape cochée ✅ dans ce roadmap
6. Reprendre à la première étape 🚧
