# claude-atelier

> Framework de travail pour Claude Code — règles runtime bilingues, enforcement par hooks, orchestration multi-agents, sécurité, satellites par stack. Installable en une commande.

[![npm version](https://img.shields.io/npm/v/claude-atelier.svg)](https://www.npmjs.com/package/claude-atelier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

🇫🇷 [Français](#français) · 🇬🇧 [English](#english)

---

## Français

### Le problème

Claude Code sans structure, c'est ça :
- Opus qui tourne toute la nuit sur une tâche Haiku → budget cramé
- Commit signé avec `Co-Authored-By` × 50 → historique pollué
- Push sans tests → régression en prod silencieuse
- 200+ lignes modifiées sans review → angles morts garantis
- Rules dans CLAUDE.md → intentions. Pas des garanties.

`claude-atelier` remplace les intentions par des rails.

---

### Ce que c'est

Un framework complet pour Claude Code : règles runtime, hooks d'enforcement, skills slash commands, satellites par stack, mode nuit supervisé. Tout ce qu'on a durci en production.

**11 règles sur 16 enforcées par des mécanismes système.** Pas du texte dans un fichier.

---

### Installation

```bash
# Initialiser dans le projet courant
npx claude-atelier init

# Initialiser globalement (~/.claude/)
npx claude-atelier init --global

# Choisir la langue (défaut: fr)
npx claude-atelier init --lang en

# Diagnostic santé (27+ checks)
npx claude-atelier doctor

# Mettre à jour (préserve le §0 du projet)
npx claude-atelier update
```

---

### Les rails — Hooks d'enforcement

Les règles critiques ne sont pas dans un README. Elles sont dans des hooks qui se déclenchent à chaque action.

| Règle | Hook | Déclencheur |
| --- | --- | --- |
| Routing modèle (Opus/Sonnet/Haiku) | `routing-check.sh` UserPromptSubmit | Chaque message |
| Diagnostic QMD / §0 / gate / handoff | `routing-check.sh` throttle 30 min | Toutes les 30 min |
| Jamais signer les commits | `guard-no-sign.sh` PreToolUse | `git commit` |
| Commits en français | `guard-commit-french.sh` PreToolUse | `git commit` |
| Tests obligatoires avant push | `guard-tests-before-push.sh` PreToolUse | `git push` |
| Review auto si 100+ lignes | `guard-review-auto.sh` PostToolUse | `git commit` |
| `/angle-mort` aux moments clés | `guard-review-auto.sh` PostToolUse | feat/refactor commit ou 10e commit |
| Anti-boucle (3+ échecs identiques) | `guard-anti-loop.sh` PostToolUse | Chaque commande bash |

**Bilan : 11 rails / 16 règles.** Les 4 non automatisables (anti-hallucination, qualité code, anti-patterns) relèvent du jugement du modèle.

---

### Token Routing — Ne plus brûler son budget

Le hook `routing-check.sh` injecte le modèle actif à chaque message et recommande un switch si mismatch :

```
[ROUTING] modèle: claude-opus-4-6 | Opus→archi | Sonnet→dev | Haiku→exploration
```

| Modèle | Usage | Coût relatif |
| --- | --- | --- |
| **Haiku 4.5** | Exploration, subagents, lint | 1× |
| **Sonnet 4.6** | Dev quotidien, features, bug fixes | ~5× |
| **Opus 4.6** | Architecture, debug bloquant, décision irréversible | ~50× |

---

### Skills — 12 slash commands

```
/atelier-help       → Oracle : état du projet + commandes disponibles
/atelier-setup      → Onboarding interactif (7 étapes)
/atelier-doctor     → Diagnostic santé (27+ checks)
/angle-mort         → Review anti-complaisance avant release
/audit-safe         → Audit sécurité (5 checks)
/review-copilot     → Handoff review pour Copilot/GPT
/integrate-review   → Ferme la boucle (lit réponse, trie, checklist)
/night-launch       → Prépare le mode nuit (8 prérequis)
/token-routing      → Configure Haiku/Sonnet/Opus
/compress           → Compresse CLAUDE.md pour réduire les tokens input
/qmd-init           → Installe QMD (moteur recherche markdown local)
/bmad-init          → Installe BMAD (optionnel, gros projets)
```

---

### Mode Nuit — Autonomie supervisée

Claude qui crash à 22h34, personne s'en rend compte, 8h perdues.

```text
Claude Code (VSCode)          Watchdog Cowork (Haiku)
acceptEdits mode              Tâche planifiée horaire
commits atomiques             git log → delta > 15 min ?
ne push jamais                Screenshot VSCode → diagnostic
                              CAS A: bouton Allow → auto-clic
                              CAS B: spinner → silence
                              CAS C: figé → iMessage alerte
                              CAS D: fermé → iMessage alerte
```

---

### Parallelisation — 3 patterns de puissance

**Parallel Audit Storm** — 4 agents Haiku en un message (secrets + lint + refs + tests). Audit complet en 3 min au lieu de 15.

**Background Copilot Review** — Agent background écrit le handoff pendant que tu continues à coder. Zéro interruption du flow.

**Multi-Session CLI** — 2-3 terminaux Claude indépendants (dev + tests continus + lint watcher). CI locale temps réel.

---

### Review Inter-LLM — Claude ↔ Copilot

Un seul LLM ne voit pas ses propres angles morts.

```
/review-copilot → handoff .md → Copilot répond
→ /integrate-review → trier (retenu / à garder / écarté) → actions
```

Déclenchement automatique via hook : feature terminée, 100+ lignes modifiées, 3+ tentatives échouées.

---

### Satellites par stack

Chargés conditionnellement selon le projet actif.

| Stack | Fichier |
| --- | --- |
| JavaScript/TypeScript | `stacks/javascript.md` |
| Python | `stacks/python.md` |
| Java | `stacks/java.md` |
| React + Vite | `stacks/react-vite.md` |
| Firebase | `stacks/firebase.md` |
| Docker | `stacks/docker.md` |
| Ollama | `stacks/ollama.md` |

---

### Structure

```text
src/
├── fr/ · en/          Règles runtime bilingues (FR source de vérité)
│   ├── CLAUDE.md      Core ≤ 150 lignes, rechargé à chaque message
│   ├── orchestration/ Fork/Teammate/Worktree, subagents, MCP, routing
│   ├── autonomy/      Modes permission, night-mode, loop-watchers
│   ├── security/      Secrets, pre-push gate, procédure d'urgence
│   ├── runtime/       Flow, format, extended thinking, todo-session
│   └── ecosystem/     Skills, plugins, hooks, memory, QMD
├── stacks/            Satellites par stack
├── skills/            12 slash commands SKILL.md
└── templates/         .gitignore, .claudeignore, settings.json

hooks/                 6 hooks d'enforcement prêts à l'emploi
scripts/               pre-push-gate.sh (5 checks : secrets→lint→build→tests)
bin/cli.js             CLI (init, doctor, lint, update)
```

---

### Sécurité

| Couche | Protection |
| --- | --- |
| `.gitignore` | Fichiers sensibles exclus |
| `.claudeignore` | Invisibles pour Claude |
| `settings.json` deny list | Commandes destructives bloquées |
| `pre-push-gate.sh` | 5 étapes avant chaque push |
| Patterns regex | Détection secrets (sk-, AKIA, ghp_, AIza…) |
| Hooks PreToolUse | Bloquant avant exécution (exit 2) |

---

### Licence

MIT — voir [LICENSE](LICENSE).

---

## English

### The Problem

Claude Code without structure looks like this:
- Opus running overnight on a Haiku-level task → budget gone
- `Co-Authored-By` on every commit × 50 → polluted git history
- Push without tests → silent regression in prod
- 200+ lines changed with no review → guaranteed blind spots
- Rules in CLAUDE.md → intentions. Not guarantees.

`claude-atelier` replaces intentions with rails.

---

### What it is

A complete framework for Claude Code: runtime rules, enforcement hooks, slash command skills, per-stack satellites, supervised night mode. Everything hardened in production.

**11 out of 16 rules enforced by system-level mechanisms.** Not text in a file.

---

### Installation

```bash
# Initialize in current project
npx claude-atelier init

# Initialize globally (~/.claude/)
npx claude-atelier init --global

# Pick language (default: fr)
npx claude-atelier init --lang en

# Health diagnostic (27+ checks)
npx claude-atelier doctor

# Update (preserves project §0)
npx claude-atelier update
```

---

### The Rails — Enforcement Hooks

Critical rules aren't in a README. They're in hooks that fire on every action.

| Rule | Hook | Trigger |
| --- | --- | --- |
| Model routing (Opus/Sonnet/Haiku) | `routing-check.sh` UserPromptSubmit | Every message |
| Diagnostic QMD / §0 / gate / handoff | `routing-check.sh` 30-min throttle | Every 30 min |
| Never sign commits | `guard-no-sign.sh` PreToolUse | `git commit` |
| Commits in French | `guard-commit-french.sh` PreToolUse | `git commit` |
| Tests required before push | `guard-tests-before-push.sh` PreToolUse | `git push` |
| Auto review at 100+ lines | `guard-review-auto.sh` PostToolUse | `git commit` |
| `/angle-mort` at key moments | `guard-review-auto.sh` PostToolUse | feat/refactor or 10th commit |
| Anti-loop (3+ identical failures) | `guard-anti-loop.sh` PostToolUse | Every bash command |

---

### Token Routing — Stop burning budget

The `routing-check.sh` hook injects the active model on every message and recommends a switch if there's a mismatch:

| Model | Usage | Relative cost |
| --- | --- | --- |
| **Haiku 4.5** | Exploration, subagents, lint | 1× |
| **Sonnet 4.6** | Daily dev, features, bug fixes | ~5× |
| **Opus 4.6** | Architecture, blocking debug, irreversible decisions | ~50× |

---

### Skills — 12 slash commands

```
/atelier-help       → Oracle: project state + available commands
/atelier-setup      → Interactive onboarding (7 steps)
/atelier-doctor     → Health diagnostic (27+ checks)
/angle-mort         → Anti-complacency review before release
/audit-safe         → Security audit (5 checks)
/review-copilot     → Handoff review for Copilot/GPT
/integrate-review   → Close the loop (read response, sort, checklist)
/night-launch       → Prepare night mode (8 prerequisites)
/token-routing      → Configure Haiku/Sonnet/Opus
/compress           → Compress CLAUDE.md to reduce input tokens
/qmd-init           → Install QMD (local markdown search engine)
/bmad-init          → Install BMAD (optional, large projects)
```

---

### Night Mode — Supervised autonomy

Claude crashes at 10:34pm, nobody notices, 8 hours lost.

```text
Claude Code (VSCode)          Watchdog Cowork (Haiku)
acceptEdits mode              Hourly scheduled task
atomic commits                git log → delta > 15 min?
never pushes                  Screenshot VSCode → diagnosis
                              CASE A: Allow button → auto-click
                              CASE B: spinner → silence
                              CASE C: frozen → iMessage alert
                              CASE D: closed → iMessage alert
```

---

### License

MIT — see [LICENSE](LICENSE).
