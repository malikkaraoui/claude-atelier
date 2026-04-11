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

### Phase 1 — Foundation (in progress)

#### Added
- MIT `LICENSE`
- Root `.gitignore` (node_modules, secrets, OS files, Claude Code local state)
- `package.json` with semver `0.1.0`, `bin: claude-atelier`, `files` whitelist
- Bilingual FR/EN `README.md` with quickstart, target structure and phase roadmap
- `CHANGELOG.md` (this file) following Keep a Changelog

#### Planned for P1
- `src/` scaffolding (fr, en, stacks, templates) with `.gitkeep`
- Relocation of legacy files into `src/fr/**/_legacy.md`
- Relocation of `QMD-config.md` to `docs/qmd-user-guide.md`
- `bin/cli.js` skeleton (version + help only)

---

## [0.1.0] — 2026-04-11 (scaffolding)

Initial scaffolding commit. No functional code yet — infrastructure only.

[Unreleased]: https://github.com/malikkaraoui/claude-atelier/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/malikkaraoui/claude-atelier/releases/tag/v0.1.0
