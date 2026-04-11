# claude-atelier

> Opinionated Claude Code configuration — bilingual runtime rules, orchestration patterns, autonomy modes, security gates, stack-specific satellites. Installable via CLI.
>
> Version: `0.1.0` — **work in progress**, not yet published to NPM.

🇫🇷 [Français](#français) · 🇬🇧 [English](#english)

---

## Français

### Pourquoi

Travailler avec Claude Code sans guardrails ni routine codifiée, c'est bosser sur un tréteau : ça tient debout, mais chaque bourrasque relance la même discussion. `claude-atelier` est la configuration que j'utilise au quotidien, extraite et durcie, pour que mes sessions Claude soient :

- **Prévisibles** — mêmes règles runtime partout
- **Sûres** — secrets, gate pré-push, modes d'autonomie cadrés
- **Rapides** — budget tokens maîtrisé, satellites chargés à la demande
- **Extensibles** — satellites par stack (React/Vite, Firebase, Python, Java, Docker, Ollama)

### Structure (cible)

```
src/
├── fr/ · en/          Runtime rules bilingues (FR source de vérité)
│   ├── CLAUDE.md      Core ≤ 150 lignes, rechargé à chaque message
│   ├── rules/         Règles absolues (anti-hallucination, secrets, qualité)
│   ├── runtime/       Flow Explore→Plan→Implement→Verify, format, erreurs, ton
│   ├── orchestration/ Fork/Teammate/Worktree, subagents, MCP, routing
│   ├── autonomy/      Modes permission, night-mode, loop-watchers
│   ├── security/      Secrets, pre-push gate, procédure d'urgence
│   └── ecosystem/     Skills, plugins, hooks, memory, QMD
├── stacks/            Satellites par stack (neutre linguistiquement)
└── templates/         .gitignore, .claudeignore, settings.json, CLAUDE.project.md

bin/cli.js             Installeur CLI (init, update, doctor, lint)
scripts/               Scripts shell réellement fournis (pre-push-gate, inject-date)
hooks/                 Hooks Claude Code prêts à l'emploi
```

### Installation

> ⚠️ **Pas encore publié sur NPM.** Le CLI est un squelette pour l'instant.

Prévu à partir de `0.2.0` :

```bash
# Installer dans le projet courant (./.claude/)
npx claude-atelier init

# Installer globalement (~/.claude/)
npx claude-atelier init --global

# Choisir la langue (défaut: fr)
npx claude-atelier init --lang en

# Vérifier l'intégrité
npx claude-atelier doctor

# Mettre à jour (préserve le §0 du projet)
npx claude-atelier update
```

### État d'avancement

Voir [CHANGELOG.md](CHANGELOG.md).

- **P1 — Foundation** : en cours (arborescence, manifests, déplacement des fichiers existants)
- **P2 — Refactor core** : à venir (découpage de `CLAUDE.md`, résolution des contradictions)
- **P3 — Satellites & modernité** : à venir (skills, plugins, hooks, memory, stacks)
- **P4 — CLI & tests** : à venir (installeur, lint markdown, CI)

### Licence

MIT — voir [LICENSE](LICENSE).

---

## English

### Why

Using Claude Code without guardrails or a codified routine is like building on a trestle: it stands, but every gust restarts the same discussion. `claude-atelier` is the config I use daily, extracted and hardened, so my Claude sessions stay:

- **Predictable** — same runtime rules everywhere
- **Safe** — secrets, pre-push gate, bounded autonomy modes
- **Fast** — controlled token budget, satellites loaded on demand
- **Extensible** — per-stack satellites (React/Vite, Firebase, Python, Java, Docker, Ollama)

### Structure (target)

```
src/
├── fr/ · en/          Bilingual runtime rules (FR is the source of truth)
│   ├── CLAUDE.md      Core, ≤ 150 lines, reloaded on every message
│   ├── rules/         Absolute rules (anti-hallucination, secrets, quality)
│   ├── runtime/       Explore→Plan→Implement→Verify flow, format, errors, tone
│   ├── orchestration/ Fork/Teammate/Worktree, subagents, MCP, model routing
│   ├── autonomy/      Permission modes, night mode, loop watchers
│   ├── security/      Secrets, pre-push gate, emergency procedure
│   └── ecosystem/     Skills, plugins, hooks, memory, QMD
├── stacks/            Per-stack satellites (language-neutral)
└── templates/         .gitignore, .claudeignore, settings.json, CLAUDE.project.md

bin/cli.js             CLI installer (init, update, doctor, lint)
scripts/               Actual shell scripts shipped (pre-push-gate, inject-date)
hooks/                 Ready-to-use Claude Code hooks
```

### Installation

> ⚠️ **Not yet published on NPM.** CLI is currently a stub.

Planned from `0.2.0` onwards:

```bash
# Install into the current project (./.claude/)
npx claude-atelier init

# Install globally (~/.claude/)
npx claude-atelier init --global

# Pick language (default: fr)
npx claude-atelier init --lang en

# Verify integrity
npx claude-atelier doctor

# Update (preserves project's §0)
npx claude-atelier update
```

### Status

See [CHANGELOG.md](CHANGELOG.md).

- **P1 — Foundation**: in progress (scaffolding, manifests, relocating existing files)
- **P2 — Core refactor**: pending (split `CLAUDE.md`, resolve contradictions)
- **P3 — Satellites & modern surface**: pending (skills, plugins, hooks, memory, stacks)
- **P4 — CLI & tests**: pending (installer, markdown lint, CI)

### License

MIT — see [LICENSE](LICENSE).
