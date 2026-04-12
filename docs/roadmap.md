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

## ✅ P3.e — Cleanup refs CLAUDE.md (terminé)

Toutes les refs `_legacy.md` supprimées. §16→`./orchestration/`,
§19→`./orchestration/mcp-lifecycle.md`, §22→`./security/`,
§24→`./security/pre-push-gate.md`. 0 ref cassée (vérifié par lint).

---

## ✅ P3.f — CHANGELOG P3 (terminé)

Section `[Unreleased]` mise à jour avec tous les ajouts P3.

---

## 🚧 P3.g — Étoffer les stubs de stacks (optionnel, bas prio)

4 stubs à enrichir avec du contenu vrai :

- `src/stacks/react-vite.md`, `firebase.md`, `docker.md`, `ollama.md`

À faire quand l'utilisateur démarre un projet réel utilisant chaque
stack — le contenu sera meilleur en étant dicté par le vrai besoin.

---

## ✅ P4 — CLI & tests & CI (terminé 2026-04-12)

### ✅ P4.1 — CI GitHub Actions

`.github/workflows/ci.yml` — `npm run lint` + `shellcheck` sur push
main et PR. Pas de secrets, pas d'input non fiable.

### ✅ P4.2 — `doctor` réel

`test/doctor.js` — 27 checks : CLAUDE.md longueur, 21 satellites
présents, settings.json valide, .gitignore/.claudeignore, gate
executable, refs markdown, zéro _legacy, hook git pre-push (optional).
Dual mode source repo / projet installé.

### ✅ P4.3 — `init` réel

`bin/init.js` — 32 fichiers installés. Copie `src/<lang>/` vers
`.claude/`, stacks vers `.claude/stacks/`, merge intelligent
`settings.json` (union allow/deny, preserve existant), templates
`.claudeignore` + `.gitignore` (skip si existe), `scripts/pre-push-gate.sh`.
Modes `--global`, `--lang fr|en`, `--dry-run`.

### ✅ P4.4 — Stratégie EN

FR-only pour v0.2.0. `src/en/README.md` placeholder explique la
stratégie et le guide de contribution EN. `init --lang en` est câblé.

### ✅ P4.5 — Système de handoff inter-LLM

`docs/handoffs/` — convention, template, premier handoff réel
(review P1→P4 pour Copilot/GPT). Pipeline : générer → copier →
répondre → coller → intégrer. Indexable par QMD.

---

## 🚧 Reste à faire

### P4.d — Premier vrai release NPM

- Bump semver (0.1.0 → 0.2.0)
- Tag git (`git tag -a v0.2.0`)
- `npm publish --access public`
- Vérifier que `npx claude-atelier init` fonctionne depuis un dossier vierge
- Ajouter `release.yml` GitHub Actions (tag `v*` → CI → publish)

### P5 — Claude Code plugin wrapper (optionnel)

Packager la config comme un **Claude Code plugin** installable via
`/plugin install claude-atelier`.

Priorité : basse. À faire **après** que P4 soit stable.

### Backlog

- `update` command (mise à jour en préservant §0 et settings.json custom)
- `lint-contradictions.js` (détecte les patterns §5↔§12-like)
- `lint-translations.js` (parité FR↔EN quand EN existe)
- `hooks/session-start.sh` et `hooks/user-prompt-submit.sh`
- Étoffer les 4 stubs de stacks (P3.g, opportuniste)

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
