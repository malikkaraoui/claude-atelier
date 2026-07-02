> **English** | [Français](#french)
>
> **claude-atelier** — Claude Code enforcement framework: hooks, named agents, stack-specific rules, night mode, proactive permissions. Zero dependency. Node.js only.
>
> Install: `npm install -g claude-atelier` · [Documentation](https://claude-atelier.vercel.app)

---

# claude-atelier

<div align="center">

```text
          ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
         ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
       ██║     ██║     ███████║██║   ██║██║  ██║█████╗
       ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝
         ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
          ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
                        A T E L I E R
```

## ⚡ From vibes to rails — Claude Code, disciplined

22 agents · 21 skills · MCP GitHub · persistent memory · dynamic vault + graph · Context7 · review gates

[![npm version](https://img.shields.io/npm/v/claude-atelier.svg?style=flat-square&color=CB3837)](https://www.npmjs.com/package/claude-atelier)
[![npm downloads](https://img.shields.io/npm/dm/claude-atelier.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/claude-atelier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/license/MIT)
[![Token savings](https://img.shields.io/badge/token%20savings-up%20to%2090%25-brightgreen?style=flat-square)](https://claude-atelier.vercel.app/token-savings)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Malik%20Karaoui-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/malik-karaoui/)

**[📦 npm](https://www.npmjs.com/package/claude-atelier) · [📖 Docs](https://claude-atelier.vercel.app) · [📜 Philosophy](PHILOSOPHY.md) · [📊 Parity](PARITY.md) · [🐛 Issues](https://github.com/malikkaraoui/claude-atelier/issues)**

```bash
npx claude-atelier init
```

> *2 000+ downloads/week · production-hardened · MIT*

---

### 🔥 Killer bundle — full Claude Code cockpit in one npm package

| Feature | Impact |
| --- | --- |
| **Token killer** | Haiku/Sonnet/Opus routing, `/compact`, QMD-first, `maxBudgetUsd` → 80–90% token cost reduction |
| **22 named agents + 21 skills** | Auto-detected domain experts (iOS→Steve 🍎, Go→Gaëlle 🦫, Design→Séréna 🎨…) |
| **Vault + dynamic memory** | Local project context: decisions, discoveries, roadmap. Peter auto-injects `PETER_REPORT.md` at session start. |
| **Review gates** | `/review-oracle` (4 local agents) auto-triggers on 50+ line diffs. Manual enforcement with `/tmp` flag. |
| **Cockpit §1** | Timestamp + model + fit pastille `[HH:MM | model] 🟢/⬆️/⬇️` — at-a-glance context window health. |
| **Context7 calibration** | Docs auto-load by phase+stack. Brainstorm→no docs. Archi→patterns. Implementation→active libs only. |
| **Real rails, not prose** | Hooks block destructive actions at system level: no unsigned commits, tests required before push, secrets scanning. |

### 💰 Token savings breakdown

| Technique | Savings |
| --- | --- |
| Model routing (Haiku/Sonnet vs always-Opus) | ~80% |
| `/compact` context compression | 60–80% per session |
| Conditional stack loading | ~30% |
| QMD-first search | ~20% |
| `maxBudgetUsd` runaway prevention | 100% safety |

→ **Typical 2h session**: $8–12 → **$0.80–1.50** · [Full breakdown](https://claude-atelier.vercel.app/token-savings)

</div>

---

🇫🇷 [Français](#french) · 🇬🇧 [English](#english)

---

## Français

### Le problème

Claude Code sans structure : Opus toute la nuit sur une tâche Haiku → budget cramé. 200+ lignes sans review → angles morts. Commits signés → historique pollué. Push sans tests → régressions silencieuses. Rules dans CLAUDE.md → intentions, pas garanties.

`claude-atelier` remplace les intentions par des rails.

### Ce que c'est

Framework complet : règles runtime, hooks d'enforcement (15 actifs), skills (21), agents nommés (22), mémoire persistante, vault dynamique, contexte calibré, gates review, mode éco. Tout ce qu'on a durci en production.

**Des rails réels.** Push, versioning, review, coût et hygiène passent par des mécanismes système, pas par du texte en prose.

---

### Installation & Quick start

```bash
npx claude-atelier init                        # Initialize project + config
npx claude-atelier doctor                      # Health check (28 tests)
npx claude-atelier vault init                  # Create dynamic memory (Peter)
npx claude-atelier vault graph && vault query  # Build + search project graph
```

---

### Vault dynamique — Peter (mémoire persistante)

Le vault projet est la mémoire opérationnelle locale de Claude. À chaque démarrage, `vault-context.sh` injecte soit `PETER_REPORT.md` (synthétique : décisions, prochaines actions, nœuds centraux), soit les fichiers bruts (`00-brief.md`, `10-mailbox.md`, `40-roadmap.md`).

```bash
npx claude-atelier vault init              # Create vault/ structure
npx claude-atelier vault update             # SHA256 index (local, gitignored)
npx claude-atelier vault graph              # Extract graph + centrality
npx claude-atelier vault query "concept"    # Search + neighbors (Progressive Disclosure)
npx claude-atelier vault explain <obsId>   # Explode node avec icônes
```

Crée : `brief.md`, `mailbox.md`, `decisions.md`, `discoveries.md`, `roadmap.md`, `sources.md` + `index/manifest.json` + `index/graph.json` + `index/associations.json`.

**Progressive Disclosure** : `vault query --tier [index|summary|full]` permet de contrôler le volume réponse (~40–200 tokens vs 1000+). Défaut `index` : id/label/score/path. Expose aussi en MCP pour accès Claude en session.

**Icônes par observation** : 🔴 critique · 🟢 livré · 🔵 pattern · ⚖️ trade-off · 🟠 pourquoi · 🟡 problème-solution · 🟤 décision · 🟣 découverte.

**Résultat** : Claude reprend contexte sans relire tout le repo. Tokens économisés, sessions plus fluides, réponses contextuées par type d'observation.

---

### Review gates — `/review-oracle`

Automatique : `git push` avec diff ≥ 50 lignes bloqué par `guard-review-auto.sh` tant que le flag `/tmp/claude-atelier-review-done` manque.

Manuel : `/review-oracle` lance 4 agents **en parallèle** :
- **DOCTRINE** : checks §5 (anti-hallucination), §22 (secrets), §13 (french commits), décisions verrouillées
- **CODE** : bugs, logique cassée, edge cases, side-effects silencieux
- **SÉCURITÉ** : secrets en dur, injections, gate court-circuité
- **TESTS** : `npm run test` réel, couverture logique

Verdict : RATIFIÉ (✅ poser flag) → MAJEUR (fix obligatoires) → BLOQUANT (corriger + relancer).

**La Bise** 🌬️ : optionnel, prépare brief pour GPT/Mistral + intègre réponses inter-LLM.

---

### Agents nommés — 22 spécialistes par domaine

Détection automatique. Example : mention `swift` → Steve 🍎 (iOS + Xcode). Mention `design` → Séréna 🎨 (Design-first, MCP magic 21st.dev).

| Agent | Domaine | Déclencheur |
| --- | --- | --- |
| **Steve** 🍎 | iOS/tvOS/iPadOS | swift, xcode, ios |
| **Isaac** 📦 | NPM Publish | npm publish, version |
| **Mohamed** 📋 | Review §25 (inter-LLM) | feat commit, 100+ lignes |
| **Séréna** 🎨 | Design/UI/UX | design, ui, ux |
| **Peter** 🗂️ | Vault/Mémoire | vault/ présent |
| **Xavier** 📡 | Freebox | freebox |
| **16 figures stack** | C→Clara, C++→Célia, Rust→Roxane, Go→Gaëlle 🦫, PHP→Phoebe, C#→Carmen, SQL→Selma, R→Rosalie, Ada, Assembly→Astrid, Perl→Perla, VB→Violette, Fortran→Florence, MATLAB→Mathilde, Delphi→Daphné, Scratch→Sofia | Auto-détecté par type de fichier |

*Autres stacks (Python, Java, JS/TS, React, Firebase, Docker…) : règles chargées sans persona nommé.*

---

### Hooks — 15 enforcement rails

| Rule | Hook | Trigger |
| --- | --- | --- |
| Model routing | `routing-check.sh` | Every message |
| Stack detection + agent | `routing-check.sh` | Every message |
| No signed commits | `guard-no-sign.sh` | `git commit` |
| French commit messages | `guard-commit-french.sh` | `git commit` |
| Tests before push | `guard-tests-before-push.sh` | `git push` |
| Auto-review if 100+ lines | `guard-review-auto.sh` | `git commit` |
| Anti-loop (3+ errors) | `guard-anti-loop.sh` | Every bash command |
| QMD-first on .md read | `guard-qmd-first.sh` | `Read *.md` |
| Cockpit §1 header | `guard-s1-header.sh` | Every response |
| Vault injection | `vault-context.sh` | SessionStart |
| Session length warning | `routing-check.sh` | Every message (300KB / 600KB thresholds) |

**Real enforcement.** PreToolUse hooks block at shell level (exit 2). PostToolUse suggest actions.

---

### Skills — 21 slash commands

```text
/atelier-help        /atelier-setup       /atelier-doctor
/atelier-config      /design-senior       /angle-mort
/audit-safe          /handoff-debt        /review-oracle
/review-copilot      /integrate-review    /night-launch
/token-routing       /compress            /qmd-init
/bmad-init           /ios-setup           /freebox-init
/la-bise             /loop-master         /chef-projet
```

**Key skills**: `/review-oracle` (4-agent review), `/loop-master` (recurring tasks), `/token-routing` (Haiku/Sonnet/Opus config), `/vault` (manage project memory).

---

### Token routing — eco mode for Claude

Every message, `model-metrics.sh` analyzes last 5 assistant turns, classifies tool complexity, emits pastille:

- `🟢` : Model optimal (e.g., Sonnet on dev)
- `⬆️` : Task too hard → upgrade (Haiku on archi → Sonnet)
- `⬇️` : Overkill → downgrade (Opus on ls → Haiku)

**Session monitoring**: 300KB warn, 600KB critical. `/compact` recommended.

| Model | Usage | Cost |
| --- | --- | --- |
| Haiku 4.5 | Exploration, subagents | 1× |
| Sonnet 4.6 | Daily dev, features | ~5× |
| Opus 4.6 | Architecture, hard debug | ~50× |

---

### PaperClip integration

3 profiles: `full` (20 skills, 11 hooks), `lean` (token-routing, 3 guards), `review-only` (no hooks).

```js
import { applyProfile } from 'claude-atelier'
await applyProfile({ cwd: path, profile: 'lean', dryRun: false })
```

---

### Structure

```text
src/
├── fr/ · en/                        Rules (FR = source of truth)
├── stacks/                          24 stack satellites (iOS, JS, Python, Rust…)
├── skills/                          21 slash command SKILLs
├── features-registry.json           18 toggleable features
└── templates/                       .gitignore, settings.json
hooks/                 11 enforcement + 1 helper
scripts/               pre-push-gate (5 checks), CI/CD
test/                  80 hook tests, doctor (28 checks), lint
```

---

### Security

- `.gitignore` + `.claudeignore` : sensitive files
- `settings.json` deny list : destructive commands blocked
- `pre-push-gate.sh` : 5 checks (secrets→lint→tests) before push
- Hooks `PreToolUse` : block at shell level
- Regex patterns : detect sk-, AKIA, ghp_, etc.

---

### License

MIT — [LICENSE](LICENSE)

---

## English

### The Problem

Claude Code without structure: Opus overnight on Haiku-level task → budget gone. 200+ lines unreviewed → blind spots. Signed commits → dirty history. Push without tests → silent regressions. Rules in CLAUDE.md → wishes, not guarantees.

`claude-atelier` replaces wishes with rails.

### What It Is

Complete framework: runtime rules, 15 enforcement hooks, 21 skills, 22 named agents, persistent memory, dynamic vault, calibrated context, review gates, eco mode. Hardened in production.

**Real rails.** Push, versioning, review, cost and hygiene operate through system mechanisms, not prose promises.

---

### Installation & Quick start

```bash
npx claude-atelier init                        # Initialize project + config
npx claude-atelier doctor                      # Health check (28 tests)
npx claude-atelier vault init                  # Create dynamic memory (Peter)
npx claude-atelier vault graph && vault query  # Build + search project graph
```

---

### Dynamic vault — Peter (persistent memory)

Project vault is Claude's **local operational memory**. At session start, `vault-context.sh` injects either `PETER_REPORT.md` (synthetic: decisions, next actions, central nodes) or raw files (`00-brief.md`, `10-mailbox.md`, `40-roadmap.md`).

```bash
npx claude-atelier vault init              # Create vault/ structure
npx claude-atelier vault update             # SHA256 index (local, gitignored)
npx claude-atelier vault graph              # Extract graph + centrality
npx claude-atelier vault query "concept"    # Search + neighbors
```

Creates: `brief.md`, `mailbox.md`, `decisions.md`, `discoveries.md`, `roadmap.md`, `sources.md` + `index/manifest.json` + `index/graph.json`.

**Result**: Claude resumes context without re-reading entire repo. Tokens saved, sessions faster.

---

### Review gates — `/review-oracle`

Automatic: `git push` with diff ≥ 50 lines blocked by `guard-review-auto.sh` until `/tmp/claude-atelier-review-done` flag set.

Manual: `/review-oracle` spawns 4 agents **in parallel**:
- **DOCTRINE**: checks §5 (anti-hallucination), §22 (secrets), §13 (french commits), locked decisions
- **CODE**: bugs, inverted logic, edge cases, silent side-effects
- **SECURITY**: hardcoded secrets, injections, gate bypass
- **TESTS**: real `npm run test`, logical coverage

Verdict: RATIFIED (✅ set flag) → MAJOR (required fixes) → BLOCKING (fix + re-run).

**La Bise** 🌬️ (optional): prepare brief for GPT/Mistral + integrate inter-LLM responses.

---

### Named agents — 22 domain specialists

Auto-detected. Example: mention `swift` → Steve 🍎 (iOS + Xcode). Mention `design` → Séréna 🎨 (Design-first, MCP magic 21st.dev).

| Agent | Domain | Trigger |
| --- | --- | --- |
| **Steve** 🍎 | iOS/tvOS/iPadOS | swift, xcode, ios |
| **Isaac** 📦 | NPM Publish | npm publish, version |
| **Mohamed** 📋 | Review §25 (inter-LLM) | feat commit, 100+ lines |
| **Séréna** 🎨 | Design/UI/UX | design, ui, ux |
| **Peter** 🗂️ | Vault/Memory | vault/ exists |
| **Xavier** 📡 | Freebox | freebox |
| **16 stack figures** | C→Clara, C++→Célia, Rust→Roxane, Go→Gaëlle 🦫, PHP→Phoebe, C#→Carmen, SQL→Selma, R→Rosalie, Ada, Assembly→Astrid, Perl→Perla, VB→Violette, Fortran→Florence, MATLAB→Mathilde, Delphi→Daphné, Scratch→Sofia | Auto-detected by file type |

*Other stacks (Python, Java, JS/TS, React, Firebase, Docker…): rules load without a named persona.*

---

### Hooks — 15 enforcement rails

| Rule | Hook | Trigger |
| --- | --- | --- |
| Model routing | `routing-check.sh` | Every message |
| Stack detection + agent | `routing-check.sh` | Every message |
| No signed commits | `guard-no-sign.sh` | `git commit` |
| English/French commits | `guard-commit-french.sh` | `git commit` |
| Tests before push | `guard-tests-before-push.sh` | `git push` |
| Auto-review if 100+ lines | `guard-review-auto.sh` | `git commit` |
| Anti-loop (3+ errors) | `guard-anti-loop.sh` | Every bash command |
| QMD-first on .md read | `guard-qmd-first.sh` | `Read *.md` |
| Cockpit §1 header | `guard-s1-header.sh` | Every response |
| Vault injection | `vault-context.sh` | SessionStart |
| Session length warning | `routing-check.sh` | Every message (300KB / 600KB thresholds) |

**Real enforcement.** PreToolUse hooks block at shell level (exit 2). PostToolUse suggest actions.

---

### Skills — 21 slash commands

```text
/atelier-help        /atelier-setup       /atelier-doctor
/atelier-config      /design-senior       /angle-mort
/audit-safe          /handoff-debt        /review-oracle
/review-copilot      /integrate-review    /night-launch
/token-routing       /compress            /qmd-init
/bmad-init           /ios-setup           /freebox-init
/la-bise             /loop-master         /chef-projet
```

**Key skills**: `/review-oracle` (4-agent review), `/loop-master` (recurring tasks), `/token-routing` (Haiku/Sonnet/Opus config), `/vault` (manage project memory).

---

### Token routing — eco mode for Claude

Every message, `model-metrics.sh` analyzes last 5 assistant turns, classifies tool complexity, emits pastille:

- `🟢`: Model optimal (e.g., Sonnet on dev)
- `⬆️`: Task too hard → upgrade (Haiku on archi → Sonnet)
- `⬇️`: Overkill → downgrade (Opus on ls → Haiku)

**Session monitoring**: 300KB warn, 600KB critical. `/compact` recommended.

| Model | Usage | Cost |
| --- | --- | --- |
| Haiku 4.5 | Exploration, subagents | 1× |
| Sonnet 4.6 | Daily dev, features | ~5× |
| Opus 4.6 | Architecture, hard debug | ~50× |

---

### PaperClip integration

3 profiles: `full` (20 skills, 11 hooks), `lean` (token-routing, 3 guards), `review-only` (no hooks).

```js
import { applyProfile } from 'claude-atelier'
await applyProfile({ cwd: path, profile: 'lean', dryRun: false })
```

---

### Structure

```text
src/
├── fr/ · en/                        Rules (FR = source of truth)
├── stacks/                          24 stack satellites (iOS, JS, Python, Rust…)
├── skills/                          21 slash command SKILLs
├── features-registry.json           18 toggleable features
└── templates/                       .gitignore, settings.json
hooks/                 11 enforcement + 1 helper
scripts/               pre-push-gate (5 checks), CI/CD
test/                  80 hook tests, doctor (28 checks), lint
```

---

### Security

- `.gitignore` + `.claudeignore`: sensitive files
- `settings.json` deny list: destructive commands blocked
- `pre-push-gate.sh`: 5 checks (secrets→lint→tests) before push
- Hooks `PreToolUse`: block at shell level
- Regex patterns: detect sk-, AKIA, ghp_, etc.

---

### License

MIT — [LICENSE](LICENSE)
