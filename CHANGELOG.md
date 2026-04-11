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

### Phase 2 — Core refactor (in progress)

#### Fixed

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

#### Changed

- **`src/fr/CLAUDE.md` trimmed from 285 → 149 lines** (target ≤ 150).
  Sections §0–§25 preserved for stable referencing.
- **`§15 Token Management`** now points to `../templates/settings.json`
  instead of inlining an env block.
- **`§13 Git Workflow`** now explicitly states « jamais signer (pas de
  trailer `Co-Authored-By`) » — enforces the user's permanent preference.

#### Added

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

#### Added

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

[Unreleased]: https://github.com/malikkaraoui/claude-atelier/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/malikkaraoui/claude-atelier/releases/tag/v0.1.0
