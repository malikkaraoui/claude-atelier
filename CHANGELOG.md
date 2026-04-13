# Changelog

All notable changes to `claude-atelier` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning policy

- **MAJOR** — breaking change to an absolute rule (anti-hallucination, secrets, rule hierarchy)
- **MINOR** — new satellite, new stack, new CLI command, new opt-in feature
- **PATCH** — wording fix, typo, broken link, dependency bump

---

## [Unreleased]

---

## [0.3.7] — 2026-04-13

### Token economy — session length + Haiku routing

#### Added

- **Hook session length** (`routing-check.sh`) — détecte la taille du transcript JSONL à chaque message :
  - ≥ 300KB : avertissement `⚠️ [SESSION] Contexte long → /compact recommandé`
  - ≥ 600KB : alerte forte `🔴 [SESSION] Contexte très long` avec suggestion `/compact`
- **Suggestion Haiku automatique** (`routing-check.sh`) — si le prompt est court (< 200 chars) et contient des mots d'exploration (`cherche`, `liste`, `grep`, `audit`, `scan`, `résumé`...), suggère `/model haiku` (10x moins cher qu'Opus)

---

## [0.2.0] — 2026-04-12

### Phase 5 — Skills, méthodologie & token routing (completed 2026-04-12)

#### Added (phase 5)

- `src/skills/` — 11 slash commands as SKILL.md files:
  `/atelier-help` (oracle + catalog CSV), `/atelier-setup` (7-step onboarding),
  `/review-copilot` (handoff Copilot/GPT), `/integrate-review` (closes inter-LLM loop),
  `/angle-mort` (blind-spot review), `/audit-safe` (5-step security audit),
  `/night-launch` (night-mode preflight), `/atelier-doctor` (27-check diagnostic),
  `/token-routing` (Haiku/Sonnet/Opus routing guide), `/bmad-init` (installs BMAD-METHOD),
  `/qmd-init` (installs QMD if ≥ 5 .md files)
- `src/skills/atelier-help/atelier-help.csv` — machine-readable catalog (code, skill,
  display-name, description, phase, required)
- `docs/methodology.md` — complete 9-section framework doc (Token Routing, Permissions,
  Git Workflow, Night-Mode, Review Inter-LLM, Security, Multi-Stack, Orchestration,
  Slash Commands)

#### Changed (phase 5)

- `src/fr/CLAUDE.md §15` — model alert now suggests `/model sonnet` / `/model haiku`
  with the exact command instead of vague "recommend a switch"
- `src/fr/CLAUDE.md §18` — auto-montée + auto-descente effort levels, anti-flapping rule
  (no change > 1 per message)
- `src/fr/CLAUDE.md §25` — automatic Copilot review trigger added (feature done, critical
  bug fix, 100+ lines changed, 3+ failed attempts)
- `src/fr/autonomy/night-mode.md` — watchdog v4 (screenshot + auto-click Allow +
  iMessage), v5 adds Étape 0 pgrep check (terminate silently if no Claude process),
  comparison table of 3 scheduling methods
- `bin/init.js` — copies `src/skills/` into `.claude/skills/` during installation
- `package.json` — added `test/` to `files` array (fix: CLI lint+doctor would crash
  after npm publish)
- `src/skills/token-routing/SKILL.md` — documents `/model` command for mid-session
  model switching

### Phase 4 — CLI, CI & inter-LLM (completed 2026-04-12)

#### Added (phase 4)

- `.github/workflows/ci.yml` — GitHub Actions CI: `npm run lint` +
  `shellcheck scripts/pre-push-gate.sh` on push main and PRs
- `test/doctor.js` — 27-check health verification (CLAUDE.md length,
  21 satellite files present, settings.json valid, .gitignore/.claudeignore,
  gate executable, markdown refs, zero _legacy, git hooks).
  Dual mode: source repo vs installed project.
- `bin/init.js` — real installer: copies 32 files to `.claude/`,
  merges `settings.json` intelligently (union allow/deny lists, preserves
  existing values), copies templates to project root, copies scripts.
  Supports `--global`, `--lang fr|en`, `--dry-run`.
- `src/en/README.md` — EN strategy placeholder. FR-only for v0.2.0,
  EN parity planned for v0.3.0.
- `docs/handoffs/` — inter-LLM handoff system (Claude ↔ Copilot/GPT):
  convention, template, first real handoff (P1→P4 review request).
  Structured markdown exchange, versionable, QMD-indexable.

#### Changed (phase 4)

- `bin/cli.js` — `init` and `doctor` commands now functional (were stubs).
  `main()` is now async. Help text updated.
- `package.json` — added `doctor` script, `test` now runs `lint + doctor`

### Added (validation tooling — pre-P4)

- Real validation entrypoints:
  - `npm run lint` checks markdown references + CLAUDE.md length
  - `claude-atelier lint` runs the same from CLI

### Fixed (validation tooling — pre-P4)

- CLI help advertises `lint` as implemented
- `src/fr/security/pre-push-gate.md` points to real script path

### Phase 3 — Satellites & modernité (completed 2026-04-12)

#### Added (phase 3 — ecosystem)

- `src/fr/ecosystem/skills.md` — skills system (local + plugin), when to
  use, when not to, hygiene (max 2-3 simultaneous), creating a skill
- `src/fr/ecosystem/plugins.md` — marketplace plugins, discipline,
  understanding plugin suggestions (MANDATORY vs best-practice)
- `src/fr/ecosystem/hooks.md` — Claude Code hooks (SessionStart,
  UserPromptSubmit, PreToolUse, PostToolUse, Stop), pitfalls (false
  positives, context saturation)
- `src/fr/ecosystem/memory-system.md` — auto-memory system
  (`~/.claude/projects/*/memory/`), types (user/feedback/project/reference),
  read/write discipline
- `src/fr/ecosystem/qmd-integration.md` — how Claude should use QMD
  (when to query, score filtering, invocation patterns)

#### Added (phase 3 — orchestration)

- `src/fr/orchestration/modes.md` — Fork/Teammate/Worktree details
- `src/fr/orchestration/subagents.md` — **new**: complete catalog of
  available subagents (Explore, Plan, feature-dev:*, code-simplifier,
  superpowers:*, plugin agents) with cost indicators
- `src/fr/orchestration/parallelization.md` — when to parallelize and
  patterns (fork exploratoire, feature parallèle, audit croisé)
- `src/fr/orchestration/models-routing.md` — model per role table
  (Haiku/Sonnet/Opus), when to escalate
- `src/fr/orchestration/spawn-rules.md` — 5 fundamental spawn rules,
  prompt template, limits
- `src/fr/orchestration/mcp-lifecycle.md` — MCP loading/purging, context
  window impact (200k → ~70k)

#### Added (phase 3 — security)

- `src/fr/security/secrets-rules.md` — absolute principle, forbidden files
  list, suspect patterns regex, manual audit commands
- `src/fr/security/pre-push-gate.md` — gate documentation (5 steps, stack
  auto-detection table, git hook installation)
- `src/fr/security/emergency.md` — secret leak procedure (revoke →
  filter-branch → force push → notify), timeline, post-mortem template
- `scripts/pre-push-gate.sh` — **finally shipped**: the pre-push gate
  script referenced since P1 §0, with stack auto-detection (node/python/
  maven/gradle), `--quick` mode, colored output, strict bash
- `src/templates/.claudeignore` — template for files Claude must never read
- `src/templates/.gitignore` — multi-stack .gitignore template

#### Added (phase 3 — autonomy)

- `src/fr/autonomy/permission-modes.md` — 5 permission modes with rules,
  recommendations per context, anti-patterns
- `src/fr/autonomy/night-mode.md` — **canonical source** (was duplicated
  between autonomy and orchestration), specs template, pitfalls, use cases
- `src/fr/autonomy/loop-watchers.md` — **canonical source** (was duplicated),
  syntax, discipline, anti-patterns

#### Changed (phase 3)

- `src/fr/CLAUDE.md` — all `_legacy.md` references replaced with structured
  satellite paths. File now at 145 lines (target ≤ 150).

#### Removed (phase 3)

- `src/fr/autonomy/_legacy.md` — replaced by 3 structured satellites
- `src/fr/orchestration/_legacy.md` — replaced by 6 structured satellites
- `src/fr/security/_legacy.md` — replaced by 3 structured satellites
- **All `_legacy.md` files are now gone.** Zero legacy debt remaining.

#### Fixed (phase 3)

- **Night-mode duplication eliminated.** Was duplicated between autonomy
  and orchestration. Now single canonical source in `autonomy/night-mode.md`.
- **`/loop` duplication eliminated.** Same fix, canonical source in
  `autonomy/loop-watchers.md`.

### Phase 2 — Core refactor (completed 2026-04-12)

#### Fixed (phase 2)

- **Contradiction §5 vs §12 resolved.** `§12 Code Review` used to demand
  « at least one critique even if the code seems correct », forcing Claude
  to violate `§5 Anti-hallucination`. Section removed from the template;
  empty `Problèmes identifiés` / `Angles morts détectés` are now a valid
  quality signal. `§5 prime` explicitly documented.
- **Broken `/docs/claude/*` references fixed.** All §13/§16/§19/§22/§23/§24
  cross-refs now point to real relative paths under `./security/_legacy.md`,
  `./orchestration/_legacy.md`, `./autonomy/_legacy.md`.
- **Legacy markdown lint issues cleared** in `src/fr/CLAUDE.md` (MD041,
  MD012, MD040, MD047, MD060).

#### Changed (phase 2)

- **`src/fr/CLAUDE.md` trimmed from 285 → 149 lines** (target ≤ 150).
  Sections §0–§25 preserved for stable referencing.
- **`§15 Token Management`** now points to `../templates/settings.json`
  instead of inlining an env block.
- **`§13 Git Workflow`** now explicitly states « jamais signer (pas de
  trailer `Co-Authored-By`) » — enforces the user's permanent preference.

#### Added (phase 2)

- `src/templates/settings.json` — single source of truth consolidating
  `env`, `permissions.allow`, `permissions.deny`, `preferences.maxBudgetUsd`.
  Strengthened denylist (`git reset --hard`, `git filter-branch`,
  `curl | sh` patterns); broadened allowlist (`pnpm`, `git log`, `npm ci`).
- `src/templates/project-structure.md` — extracted from former §9, with
  a « Quand ne pas utiliser ce template » section for opinionated frameworks.
- `src/stacks/javascript.md`, `python.md`, `java.md` — migrated from former §10.
- `src/stacks/react-vite.md`, `firebase.md`, `docker.md`, `ollama.md` —
  stubs reserving architecture slots, detailed content planned for P3.
- `src/fr/runtime/code-review.md` — extracted from former §12 with
  anti-patterns and context-to-load section.
- `src/fr/runtime/todo-session.md` — extracted from former §17.
- `src/fr/runtime/extended-thinking.md` — extracted from former §18 with
  a decision table for `low`/`medium`/`high` effort levels.

### Phase 1 — Foundation (completed 2026-04-11)

#### Added (phase 1)

- MIT `LICENSE`
- Root `.gitignore` (node_modules, secrets, OS files, Claude Code local state)
- `package.json` with semver `0.1.0`, `bin: claude-atelier`, `files` whitelist
- Bilingual FR/EN `README.md` with quickstart, target structure and phase roadmap
- `CHANGELOG.md` (this file) following Keep a Changelog
- `src/` scaffolding (fr, en, stacks, templates) with `.gitkeep`
- Legacy files relocated into `src/fr/**/_legacy.md`
- `QMD-config.md` relocated to `docs/qmd-user-guide.md` (no longer runtime)
- `bin/cli.js` skeleton (`--version`, `--help`, stubbed commands)

---

## [0.1.0] — 2026-04-11 (scaffolding)

Initial scaffolding commit. No functional code yet — infrastructure only.

[Unreleased]: https://github.com/malikkaraoui/claude-atelier/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/malikkaraoui/claude-atelier/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/malikkaraoui/claude-atelier/releases/tag/v0.1.0
