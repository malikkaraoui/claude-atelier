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

13 agents · 16 skills · mémoire persistante · Context7 dynamique · mode éco · verrou review

[![npm version](https://img.shields.io/npm/v/claude-atelier.svg?style=flat-square&color=CB3837)](https://www.npmjs.com/package/claude-atelier)
[![npm downloads](https://img.shields.io/npm/dm/claude-atelier.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/claude-atelier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/license/MIT)
[![Token savings](https://img.shields.io/badge/token%20savings-up%20to%2090%25-brightgreen?style=flat-square)](https://claude-atelier.vercel.app/token-savings)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Malik%20Karaoui-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/malik-karaoui/)

**[📦 npm](https://www.npmjs.com/package/claude-atelier) · [📖 Docs](https://claude-atelier.vercel.app) · [📜 Philosophy](PHILOSOPHY.md) · [📊 Parity](PARITY.md) · [🐛 Issues](https://github.com/malikkaraoui/claude-atelier/issues)**

```bash
npx claude-atelier init
```

> *2 000+ téléchargements par semaine · utilisé en prod · MIT*

---

### 🔥 Killer bundle — tout le cockpit Claude Code dans un seul NPM

| Killer function | Ce que ça change vraiment |
| --- | --- |
| **Token killer** | Routing Haiku/Sonnet/Opus, `/compact`, QMD-first, `maxBudgetUsd` → beaucoup moins de tokens brûlés pour rien |
| **Contexte dynamique du Context7** | Le contexte doc se calibre selon `§0` (phase + stack) → tu charges les bonnes libs au bon moment, pas toute la bibliothèque du monde |
| **Mémoire persistante intelligente** | Mémoire locale par projet + feedback user + règles de lecture/écriture → Claude reprend entre sessions sans repartir de zéro |
| **Agents spécialisés** | 13 agents nommés + 16 slash commands → le bon spécialiste au bon moment |
| **Verrou review avant push/release** | `git push` et `npm version` bloqués tant qu'un handoff §25 externe n'a pas été intégré |
| **Mode éco visible en un clin d'œil** | Pastilles `⬆️ / 🟢 / ⬇️` et métriques runtime → tu vois immédiatement si le modèle est sous-régime ou sur-régime |
| **Arsenal tout-en-un** | Hooks, skills, scripts, sécurité, satellites par stack, onboarding : un seul package npm |

Un vrai arsenal de qualité supérieure : coût, contexte, mémoire, review, sécurité et agents — sans bricolage éparpillé.

### 💰 Token killer — up to 90% token cost reduction

| Technique                                     | Savings                    |
| --------------------------------------------- | -------------------------- |
| Model routing — Haiku/Sonnet vs always-Opus   | **~80%**                   |
| `/compact` context compression                | **60–80%** per session     |
| Conditional stack loading (§10)               | **~30%**                   |
| QMD-first search instead of full file Read    | **~20%**                   |
| `maxBudgetUsd` hard cap                       | 100% runaway prevention    |

→ Typical 2h session: **$8–12** without framework → **$0.80–1.50** with claude-atelier · [Details](https://claude-atelier.vercel.app/token-savings)

</div>

---

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

Un framework complet pour Claude Code : règles runtime, hooks d'enforcement, skills slash commands, satellites par stack, agents nommés, mémoire persistante, verrou review avant push/release, mode éco, mode nuit supervisé. Tout ce qu'on a durci en production.

**Des rails réels, pas des promesses en prose.** Push, versioning, review, coût et hygiène passent par des mécanismes système — pas par de simples intentions dans un prompt.

### Workflow VS Code + Claude Code ↔ Xcode

Pour les projets Apple (iOS, tvOS, iPadOS) : **80-95% du dev se fait dans VS Code avec Claude Code**. Xcode n'intervient que là où Apple l'impose (signing, device, LLDB, Archive).

```text
VS Code (Claude édite Swift / Rust / C)
    ↓  Cmd+Shift+B
Makefile → xcodebuild + simctl
    ↓
Simulateur (iPhone / iPad / Apple TV)
    ↓  seulement si nécessaire
Xcode (signing, device physique, Instruments)
```

FFI Rust→Swift inclus. Troubleshooting inclus. Mentionnez `xcode` ou `swift` dans un message — l'agent **Steve** 🍎 arrive avec tout le contexte, automatiquement.

---

### Installation

```bash
# Initialiser dans le projet courant
npx claude-atelier init

# Initialiser globalement (~/.claude/)
npx claude-atelier init --global

# Choisir la langue (défaut: fr)
npx claude-atelier init --lang en

# Diagnostic santé (28 checks · 10 catégories · shellcheck inclus · --json)
npx claude-atelier doctor
npx claude-atelier doctor --json   # output structuré CI-friendly

# Mettre à jour (préserve le §0 du projet)
npx claude-atelier update
```

---

### Les rails — Hooks d'enforcement

Les règles critiques ne sont pas dans un README. Elles sont dans des hooks qui se déclenchent à chaque action.

| Règle | Hook | Déclencheur |
| --- | --- | --- |
| Routing modèle (Opus/Sonnet/Haiku) | `routing-check.sh` UserPromptSubmit | Chaque message |
| Détection stack + agent nommé | `routing-check.sh` UserPromptSubmit | Chaque message |
| Diagnostic QMD / §0 / gate / handoff | `routing-check.sh` throttle 30 min | Toutes les 30 min |
| Jamais signer les commits | `guard-no-sign.sh` PreToolUse | `git commit` |
| Commits en français | `guard-commit-french.sh` PreToolUse | `git commit` |
| Tests obligatoires avant push | `guard-tests-before-push.sh` PreToolUse | `git push` |
| Review auto si 100+ lignes | `guard-review-auto.sh` PostToolUse | `git commit` |
| `/angle-mort` aux moments clés | `guard-review-auto.sh` PostToolUse | feat/refactor commit ou 10e commit |
| Anti-boucle (3+ échecs identiques) | `guard-anti-loop.sh` PostToolUse | Chaque commande bash |
| Challenger (review + angle-mort + archi) | `guard-review-auto.sh` PostToolUse | Commit feat/refactor, 100+ lignes, 10 commits |
| Rechargement hooks/MCP requis | `guard-hooks-reload.sh` PostToolUse | Edit/Write sur hooks, settings.json, .mcp.json |
| QMD-first : redirige `.md` → QMD | `guard-qmd-first.sh` PreToolUse | `Read` sur tout `.md` projet |
| Longueur de session (300KB/600KB) | `routing-check.sh` UserPromptSubmit | Chaque message |
| Suggestion Haiku (prompt court + mots d'exploration) | `routing-check.sh` UserPromptSubmit | Chaque message |
| Détection besoin design → propose Séréna | `detect-design-need.sh` UserPromptSubmit | Chaque message |

**Bilan : 15 rails actifs.** Les règles purement de jugement (anti-hallucination, qualité code) restent du ressort du modèle.

---

### Agents nommés — Chaque domaine a son spécialiste

Quand un domaine spécifique est détecté dans le message, l'atelier charge automatiquement un satellite et active un agent nommé avec sa personnalité et son expertise.

| Agent | Domaine | Déclencheur | Ce qu'il apporte |
| --- | --- | --- | --- |
| **Steve** 🍎 | iOS / tvOS / iPadOS + Xcode | `swift`, `xcode`, `ios`, `simctl`... | Workflow V4 complet : Makefile, FFI Rust→Swift, troubleshooting, `Cmd+Shift+B` |
| **Isaac** 📦 | NPM Publish / Registry | `npm publish`, `npm version`, `registry`... | Pipeline CI/CD, versionning sémantique, tokens, troubleshooting |
| **Mohamed** 📋 | Review inter-LLM | `feat:` commit, 100+ lignes, 10 commits, session restart | Instruit le dossier review : commits, diff, question précise, handoff Copilot/GPT |
| **Amine** 🧪 | Tests hooks | `feat:` commit sans fichier `test/` modifié | Alerte feat sans tests, 42 tests unitaires hooks, `npm run test:hooks` |
| **Xavier** 📡 | Freebox API | `freebox`, `fbx`, `app_token`, `mafreebox`... | Auth LCD complète : discovery → app_token → HMAC-SHA1 session → NAT |
| **Pascal** 🐳 | Docker | `Dockerfile`, `docker-compose`, `.dockerignore`... | Multi-stage, non-root, layer cache, healthchecks, BuildKit secrets |
| **Anthonio** 🐍 | Python | `*.py`, `pyproject.toml`, `requirements*.txt`... | PEP 8, typage strict, uv + ruff + pyright, gestion d'erreurs frontière |
| **Marcel** ☕ | Java | `*.java`, `pom.xml`, `build.gradle`... | Optional, Records, Maven/Gradle, JUnit 5, package-by-feature |
| **Nicolas & Fazia** ⚡ | React + Vite | `vite.config.*`, `*.jsx`, `*.tsx`... | Hooks, Zustand, Vitest, code splitting, perf first |
| **Camille** 🔥 | Firebase | `firebase.json`, `firestore.rules`, `functions/**`... | Règles Firestore, Auth providers, Emulator Suite, Secret Manager |
| **Jeffrey** 🦙 | Ollama | `Modelfile`, `**/ollama*`... | Local first, quantization Q4/Q5/Q8, embeddings, API OpenAI-compat |
| **Nael** 🔷 | JavaScript / TypeScript | `*.js`, `*.ts`, `*.tsx`, `*.mjs`... | Zéro `any`, zéro `var`, erreurs typées, Vitest/Playwright |
| **Séréna** 🎨 | Design / UI/UX / Charte | `design`, `ui`, `ux`, `landing page`, `charte`... | Design-first : design system, palette, typo, composants 21st.dev (MCP magic) |

*« Stay hungry, stay foolish — mais build depuis le Makefile. »* — Steve
*« npm install — deux mots qui doivent toujours marcher. »* — Isaac
*« Un code non challengé n'est pas fini. C'est une bombe à retardement. »* — Mohamed
*« Pas de test, pas de feat. C'est pas négociable. »* — Amine
*« Un bouton LCD. Une seule pression. Un token permanent. »* — Xavier
*« Sur les docks, on soulève pas des idées. On soulève des volumes. »* — Pascal
*« Sans moi, ton modèle tourne sur quoi ? Du PowerPoint ? »* — Anthonio
*« Depuis 1995. J'ai tout vu. J'ai tout survécu. »* — Marcel
*« 0.3s de hot reload — t'as pas connu avant, tu peux pas comprendre. »* — Nicolas & Fazia
*« Auth Google ? Un switch. Storage ? Un switch. Elle a pas le temps. »* — Camille
*« Local first. Always. »* — Jeffrey
*« Le compilateur ne pardonne pas. Moi non plus. »* — Nael
*« Le code vient après. D'abord, on conçoit. »* — Séréna

Steve et Isaac sont injectés via `routing-check.sh` sur détection de stack. Mohamed arrive via les hooks Challenger (`guard-review-auto.sh`) et le cross-session check. Amine vérifie que chaque feat commit inclut des tests — automatiquement, sans que tu aies à y penser. Séréna s'active via `detect-design-need.sh` dès qu'un besoin UI/UX/design est détecté dans le prompt.

---

### Challenger — Le coéquipier qui te dit la vérité

Un dev seul ne voit pas ses propres angles morts. Le système Challenger détecte automatiquement 5 situations où tu as besoin d'un regard extérieur :

| Trigger | Seuil | Action |
| --- | --- | --- |
| Volume de code | 100+ lignes modifiées | → `/review-copilot` |
| Feature terminée | Commit `feat:` ou `refactor:` | → `/angle-mort` + check README |
| Endurance | 10 commits sans review | → `/angle-mort` |
| Architecture | Nouveau fichier structurant | → `/review-copilot` |
| Bug bloquant | 3+ échecs identiques | → `/review-copilot` + contexte erreur |

Le Challenger ne bloque rien — il rappelle de demander de l'aide. Parce que personne ne le fait spontanément.

---

### Hookify — Apprendre de ses erreurs

Quand un problème revient plus de 2 fois, il ne faut plus le documenter — il faut le hookifier.

```text
Erreur observée → Pattern identifiable ? → Quel hook ? → Script bash → Test → Rail
```

Le concept Hookify transforme chaque erreur répétée en un hook d'enforcement permanent. Voir `src/fr/ecosystem/hookify.md` pour le guide complet.

---

### Permissions Proactives — Arrête de me demander

Claude Code demande une permission. Tu approuves. Il redemande. Tu re-approuves. Encore une fois. Trois fois la même chose — le flow est cassé.

L'atelier détecte ce pattern et propose :

> *« Tu m'as donné 3 fois la permission pour éditer settings.json. Je l'ajoute définitivement ? »*

Un seul "oui" et la permission est ajoutée dans `settings.json` → plus jamais interrompu pour la même action.

Permissions incluses par défaut : `Read`, `Edit`, `Write`, `Glob`, `Grep`, `git *`, `npm *`, `gh *`. Les commandes destructives (`rm -rf`, `sudo`, `git push --force`) restent bloquées — toujours.

---

### Mémoire persistante — Claude n'oublie plus tout entre deux sessions

Le harness maintient une mémoire locale par projet : préférences user, feedbacks, décisions non dérivables du code, références externes.

```text
~/.claude/projects/<project-slug>/memory/
├── MEMORY.md
├── user_*.md
├── feedback_*.md
├── project_*.md
└── reference_*.md
```

- **Persistante** : la mémoire survit aux sessions
- **Intelligente** : on n'y stocke pas le code, seulement ce qui manque au repo
- **Disciplinée** : si mémoire et code se contredisent, le code courant gagne

---

### Contexte dynamique du Context7 — la bonne doc, au bon moment

Le principe n'est pas de gaver la session avec toute la doc possible. Le principe est de **calibrer le contexte**.

`claude-atelier` croise `§0` (**phase + stack**) avec le satellite `context7-mapping.md` pour décider **quelles docs valent vraiment le coût token** :

- en **brainstorming** → pas de doc parasite
- en **architecture** → patterns et ADR, pas des APIs au kilomètre
- en **implémentation** → seulement les libs de la stack active
- en **maintenance** → la lib du bug, pas le reste

Résultat : moins de bruit, moins de tokens, plus de précision. C'est ça, le **contexte dynamique du Context7**.

---

### Token Routing — Mode éco automatique

Comme le mode éco d'une voiture : à chaque message, le système observe ce que tu fais et te dit si tu roules avec le bon moteur.

```text
`[2026-04-15 14:32:11 | claude-sonnet-4-6] 🟢 M`
```

**Trois pastilles — une seule lecture :**

| Pastille | Signal | Exemple |
| --- | --- | --- |
| `🟢` | Modèle optimal pour la tâche en cours | Sonnet sur du dev standard |
| `⬆️` | Tâche trop complexe — passe au modèle supérieur | Haiku sur de l'archi → monte sur Sonnet |
| `⬇️` | Modèle surdimensionné — descends | Opus sur un `ls` → descends sur Haiku |

Le hook `model-metrics.sh` analyse les 5 derniers tours d'assistant, classe les outils utilisés par complexité, et compare au tier du modèle actif. Résultat émis à chaque message — mécanique, pas à la discrétion du modèle.

**Deux modes de switch :**

- **Mode M (défaut)** — le modèle *propose*, tu valides. Fiable, aucun risque.
- **Mode A (opt-in, terminal + tmux)** — switch automatique immédiat. `echo A > /tmp/claude-atelier-switch-mode` pour activer.

```text
[ROUTING] modèle: claude-opus-4-6 | Opus→archi | Sonnet→dev | Haiku→exploration
```

| Modèle | Usage | Coût relatif |
| --- | --- | --- |
| **Haiku 4.5** | Exploration, subagents, lint | 1× |
| **Sonnet 4.6** | Dev quotidien, features, bug fixes | ~5× |
| **Opus 4.6** | Architecture, debug bloquant, décision irréversible | ~50× |

**Session length monitoring** — à chaque message, le hook mesure la taille du transcript JSONL :

- ≥ 300KB : `⚠️ [SESSION] Contexte long → /compact recommandé`
- ≥ 600KB : `🔴 [SESSION] Contexte très long` — chaque message brûle des tokens en pure perte

**Haiku auto-suggestion** — prompt court (< 200 chars) + mot d'exploration (`cherche`, `liste`, `grep`, `audit`, `scan`…) → `💡 Exploration détectée → /model haiku`

**QMD-first** — tout `Read` sur un `.md` projet déclenche `guard-qmd-first.sh` : le hook injecte les commandes QMD équivalentes avant que la lecture s'exécute. Moins d'appels `Read`, moins de tokens input.

---

### Skills — 16 slash commands

```text
/atelier-help       → Oracle : état du projet + commandes disponibles
/atelier-setup      → Onboarding interactif (8 étapes)
/design-senior      → Séréna : chef designer senior, design-first (MCP magic 21st.dev)
/atelier-doctor     → Diagnostic santé (28 checks · 10 catégories · --json)
/angle-mort         → Review anti-complaisance avant release
/audit-safe         → Audit sécurité (5 checks)
/handoff-debt       → Dette §25 live + génération de draft de handoff
/review-copilot     → Handoff review pour Copilot/GPT
/integrate-review   → Ferme la boucle (lit réponse, trie, checklist)
/night-launch       → Prépare le mode nuit (8 prérequis)
/token-routing      → Configure Haiku/Sonnet/Opus
/compress           → Compresse CLAUDE.md pour réduire les tokens input
/qmd-init           → Installe QMD (moteur recherche markdown local)
/bmad-init          → Installe BMAD (optionnel, gros projets)
/ios-setup          → Configure le workflow iOS/tvOS : VS Code + Xcode + Makefile V4
/freebox-init       → Bootstrap Freebox : app_token LCD + session HMAC-SHA1 + NAT
```

---

### Mode Nuit — Autonomie supervisée

Claude qui crash à 22h34, personne s'en rend compte, 8h perdues.

```text
Claude Code (VSCode)          Watchdog Cowork (Haiku)
acceptEdits mode              Tâche planifiée horaire
commits atomiques             git log → delta > 15 min ?
push après gate verte         Screenshot VSCode → diagnostic
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

```text
/review-copilot → handoff .md → Copilot répond
→ /integrate-review → trier (retenu / à garder / écarté) → actions
```

Déclenchement automatique via hook : feature terminée, 100+ lignes modifiées, 3+ tentatives échouées.

---

### Verrou §25 — pas de publish sauvage

Le mécanisme n'est pas une "clé crypto" au sens strict. Le verrou réel, aujourd'hui, c'est :

- **`pre-push-gate.sh` étape 6** : bloque `git push` si la dette de handoff §25 est dépassée
- **`version-gate.js`** : bloque `npm version` tant qu'un handoff externe valide n'a pas été intégré
- **source de vérité = git** : la dette est calculée depuis l'historique, pas depuis un compteur décoratif
- **reset uniquement via `/integrate-review`** : pas de faux acquittement automatique

Résultat : Claude ne peut pas publier proprement une feature lourde sans passer par la boucle de review/handoff.

---

### Satellites par stack

Chargés conditionnellement selon le projet actif. Certains activent un agent nommé.

| Stack | Fichier | Agent |
| --- | --- | --- |
| iOS / tvOS / iPadOS | `stacks/ios-xcode.md` | **Steve** 🍎 |
| NPM Publish / Registry | `stacks/npm-publish.md` | **Isaac** 📦 |
| Freebox API | `stacks/freebox.md` | **Xavier** 📡 |
| JavaScript/TypeScript | `stacks/javascript.md` | **Nael** 🔷 |
| Python | `stacks/python.md` | **Anthonio** 🐍 |
| Java | `stacks/java.md` | **Marcel** ☕ |
| React + Vite | `stacks/react-vite.md` | **Nicolas & Fazia** ⚡ |
| Firebase | `stacks/firebase.md` | **Camille** 🔥 |
| Docker | `stacks/docker.md` | **Pascal** 🐳 |
| Ollama | `stacks/ollama.md` | **Jeffrey** 🦙 |

---

### CI/CD — Publication npm automatique

Un workflow GitHub Actions publie automatiquement sur npm à chaque push d'un tag `v*` :

```bash
git tag v0.3.0 && git push --tags
# → GitHub Actions : tests + npm publish automatique
```

Le token npm est stocké dans les secrets GitHub (`NPM_TOKEN`). Plus besoin de `npm publish` manuellement.

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
│   └── ecosystem/     Skills, plugins, hooks, memory, QMD, Hookify
├── stacks/            Satellites par stack (iOS, JS, Python, Java…)
├── skills/            16 slash commands SKILL.md
└── templates/         .gitignore, .claudeignore, settings.json

.claude/hooks-manifest.json  Manifeste typé de tous les hooks (12 entrées, helper inclus)
hooks/                 11 hooks d'enforcement + 1 helper partagé
scripts/               pre-push-gate.sh (5 checks : secrets→lint→build→tests)
                       update-security.js (sync auto SECURITY.md depuis package.json)
bin/cli.js             CLI (init, doctor, lint, update)
.github/workflows/     CI (matrice Node 18/20/22) + npm publish sur tag
test/                  lint-refs.js, lint-length.js, lint-hooks-manifest.js,
                       doctor.js (28 checks · mode --json), hooks.js (42 tests)
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

A complete framework for Claude Code: runtime rules, enforcement hooks, slash command skills, per-stack satellites, named agents, persistent memory, dynamic Context7, review lock before push/release, eco mode, supervised night mode. Everything hardened in production.

**Real rails, not prose promises.** Push, versioning, review, cost and hygiene go through system mechanisms — not wishful prompt text.

### VS Code + Claude Code ↔ Xcode Workflow

For Apple projects (iOS, tvOS, iPadOS): **80-95% of dev happens in VS Code with Claude Code**. Xcode only steps in where Apple requires it (signing, device, LLDB, Archive).

```text
VS Code (Claude edits Swift / Rust / C)
    ↓  Cmd+Shift+B
Makefile → xcodebuild + simctl
    ↓
Simulator (iPhone / iPad / Apple TV)
    ↓  only when needed
Xcode (signing, physical device, Instruments)
```

Rust→Swift FFI included. Troubleshooting included. Mention `xcode` or `swift` in a message — agent **Steve** 🍎 shows up with full context, automatically.

---

### Installation (EN)

```bash
# Initialize in current project
npx claude-atelier init

# Initialize globally (~/.claude/)
npx claude-atelier init --global

# Pick language (default: fr)
npx claude-atelier init --lang en

# Health diagnostic (28 checks · 10 categories · shellcheck included · --json)
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
| Stack detection + named agent | `routing-check.sh` UserPromptSubmit | Every message |
| Diagnostic QMD / §0 / gate / handoff | `routing-check.sh` 30-min throttle | Every 30 min |
| Never sign commits | `guard-no-sign.sh` PreToolUse | `git commit` |
| Commits in French | `guard-commit-french.sh` PreToolUse | `git commit` |
| Tests required before push | `guard-tests-before-push.sh` PreToolUse | `git push` |
| Auto review at 100+ lines | `guard-review-auto.sh` PostToolUse | `git commit` |
| `/angle-mort` at key moments | `guard-review-auto.sh` PostToolUse | feat/refactor or 10th commit |
| Anti-loop (3+ identical failures) | `guard-anti-loop.sh` PostToolUse | Every bash command |
| Challenger (review + blind spots + archi) | `guard-review-auto.sh` PostToolUse | feat/refactor commit, 100+ lines, 10 commits |
| Hook/MCP reload required | `guard-hooks-reload.sh` PostToolUse | Edit/Write on hooks, settings.json, .mcp.json |
| QMD-first: redirect `.md` → QMD | `guard-qmd-first.sh` PreToolUse | `Read` on any project `.md` |
| Session length (300KB/600KB) | `routing-check.sh` UserPromptSubmit | Every message |
| Haiku suggestion (short prompt + exploration) | `routing-check.sh` UserPromptSubmit | Every message |
| Design need detection → propose Séréna | `detect-design-need.sh` UserPromptSubmit | Every message |

---

### Named Agents — Domain specialists

When a specific domain is detected in your message, the atelier automatically loads a satellite and activates a named agent with its own personality and expertise.

| Agent | Domain | Trigger | What it brings |
| --- | --- | --- | --- |
| **Steve** 🍎 | iOS / tvOS / iPadOS + Xcode | `swift`, `xcode`, `ios`, `simctl`... | Full V4 workflow: Makefile, Rust→Swift FFI, troubleshooting, `Cmd+Shift+B` |
| **Isaac** 📦 | NPM Publish / Registry | `npm publish`, `npm version`, `registry`... | CI/CD pipeline, semantic versioning, tokens, troubleshooting |
| **Mohamed** 📋 | Inter-LLM Review | `feat:` commit, 100+ lines, 10 commits, session restart | Prepares review dossier: commits, diff, precise question, Copilot/GPT handoff |
| **Amine** 🧪 | Hook Tests | `feat:` commit without `test/` changes | Alerts feat without tests, 42 hook unit tests, `npm run test:hooks` |
| **Xavier** 📡 | Freebox API | `freebox`, `fbx`, `app_token`, `mafreebox`... | Full LCD auth: discovery → app_token → HMAC-SHA1 session → NAT |
| **Pascal** 🐳 | Docker | `Dockerfile`, `docker-compose`, `.dockerignore`... | Multi-stage, non-root, layer cache, healthchecks, BuildKit secrets |
| **Anthonio** 🐍 | Python | `*.py`, `pyproject.toml`, `requirements*.txt`... | PEP 8, strict typing, uv + ruff + pyright, boundary error handling |
| **Marcel** ☕ | Java | `*.java`, `pom.xml`, `build.gradle`... | Optional, Records, Maven/Gradle, JUnit 5, package-by-feature |
| **Nicolas & Fazia** ⚡ | React + Vite | `vite.config.*`, `*.jsx`, `*.tsx`... | Hooks, Zustand, Vitest, code splitting, perf first |
| **Camille** 🔥 | Firebase | `firebase.json`, `firestore.rules`, `functions/**`... | Firestore rules, Auth providers, Emulator Suite, Secret Manager |
| **Jeffrey** 🦙 | Ollama | `Modelfile`, `**/ollama*`... | Local first, Q4/Q5/Q8 quantization, embeddings, OpenAI-compat API |
| **Nael** 🔷 | JavaScript / TypeScript | `*.js`, `*.ts`, `*.tsx`, `*.mjs`... | Zero `any`, zero `var`, typed errors, Vitest/Playwright |
| **Séréna** 🎨 | Design / UI/UX / Brand | `design`, `ui`, `ux`, `landing page`, `brand`... | Design-first: design system, palette, typo, 21st.dev components (MCP magic) |

*"Stay hungry, stay foolish — but build from the Makefile."* — Steve
*"npm install — two words that must always work."* — Isaac
*"Unchallenged code isn't done. It's a time bomb."* — Mohamed
*"No test, no feat. Not negotiable."* — Amine
*"One LCD button. One press. One permanent token."* — Xavier
*"On the docks, we don't lift ideas. We lift volumes."* — Pascal
*"Without me, what does your model run on? PowerPoint?"* — Anthonio
*"Since 1995. Seen it all. Survived it all."* — Marcel
*"0.3s hot reload — you can't understand unless you've known the rest."* — Nicolas & Fazia
*"Auth Google? One switch. Storage? One switch. She doesn't have time."* — Camille
*"Local first. Always."* — Jeffrey
*"The compiler doesn't forgive. Neither do I."* — Nael
*"Code comes after. First, we design."* — Séréna

Steve and Isaac are injected via `routing-check.sh` on stack detection. Mohamed arrives via the Challenger hooks (`guard-review-auto.sh`) and the cross-session check. Amine verifies that every feat commit includes tests — automatically, no manual trigger. Séréna activates via `detect-design-need.sh` whenever a UI/UX/design need is detected in the prompt.

---

### Challenger — The teammate who tells you the truth

A solo dev can't see their own blind spots. The Challenger system automatically detects 5 situations where you need an external pair of eyes:

| Trigger | Threshold | Action |
| --- | --- | --- |
| Code volume | 100+ lines modified | → `/review-copilot` |
| Feature complete | `feat:` or `refactor:` commit | → `/angle-mort` + README check |
| Endurance | 10 commits without review | → `/angle-mort` |
| Architecture | New structural file | → `/review-copilot` |
| Blocking bug | 3+ identical failures | → `/review-copilot` + error context |

The Challenger doesn't block anything — it reminds you to ask for help. Because nobody does it spontaneously.

---

### Hookify — Learn from mistakes

When a problem happens more than twice, don't document it — hookify it.

```text
Observed error → Identifiable pattern? → Which hook? → Bash script → Test → Rail
```

The Hookify concept turns every repeated error into a permanent enforcement hook. See `src/fr/ecosystem/hookify.md` for the full guide.

---

### Proactive Permissions — Stop asking me

Claude Code asks for permission. You approve. It asks again. You approve again. Three times for the same thing — flow broken.

The atelier detects this pattern and proposes:

> *"You've approved editing settings.json 3 times. Want me to add it permanently?"*

One "yes" and the permission is added to `settings.json` — never interrupted for the same action again.

Default permissions included: `Read`, `Edit`, `Write`, `Glob`, `Grep`, `git *`, `npm *`, `gh *`. Destructive commands (`rm -rf`, `sudo`, `git push --force`) stay blocked — always.

---

### Persistent memory — Claude does not reboot to amnesia between sessions

The harness keeps a local project memory: user preferences, feedback, non-derivable decisions, external references.

```text
~/.claude/projects/<project-slug>/memory/
├── MEMORY.md
├── user_*.md
├── feedback_*.md
├── project_*.md
└── reference_*.md
```

- **Persistent**: survives across sessions
- **Selective**: stores what the repo cannot tell on its own
- **Disciplined**: if memory and current code disagree, current code wins

---

### Dynamic Context7 — the right docs, at the right time

The point is not to stuff the session with every possible doc source. The point is to **calibrate context**.

`claude-atelier` crosses `§0` (**phase + stack**) with `context7-mapping.md` to decide **which docs are actually worth the token cost**:

- in **brainstorming** → no doc noise
- in **architecture** → patterns and ADRs, not giant API dumps
- in **implementation** → only the active stack libs
- in **maintenance** → the bug's library, not the whole ecosystem

Result: less noise, fewer tokens, more precision. That's the idea behind **Dynamic Context7**.

---

### Token Routing — Eco mode, automatic

Like the eco mode on a car: every message, the system watches what you're doing and tells you if you're running on the right engine.

```text
`[2026-04-15 14:32:11 | claude-sonnet-4-6] 🟢 M`
```

**Three indicators — one glance:**

| Indicator | Signal | Example |
| --- | --- | --- |
| `🟢` | Model is optimal for the current task | Sonnet on standard dev |
| `⬆️` | Task is too complex — switch up | Haiku on architecture → go up to Sonnet |
| `⬇️` | Model is oversized — switch down | Opus on a `ls` → drop to Haiku |

The `model-metrics.sh` hook analyzes the last 5 assistant turns, classifies tools used by complexity, and compares against the active model tier. Emitted every message — mechanical, not at the model's discretion.

**Two switch modes:**

- **Mode M (default)** — the model *proposes*, you validate. Reliable, zero risk.
- **Mode A (opt-in, terminal + tmux)** — immediate automatic switch. `echo A > /tmp/claude-atelier-switch-mode` to enable.

| Model | Usage | Relative cost |
| --- | --- | --- |
| **Haiku 4.5** | Exploration, subagents, lint | 1× |
| **Sonnet 4.6** | Daily dev, features, bug fixes | ~5× |
| **Opus 4.6** | Architecture, blocking debug, irreversible decisions | ~50× |

**Session length monitoring** — every message, the hook measures the JSONL transcript size:

- ≥ 300KB: `⚠️ [SESSION] Long context → /compact recommended`
- ≥ 600KB: `🔴 [SESSION] Very long context` — every message burns tokens wastefully

**Haiku auto-suggestion** — short prompt (< 200 chars) + exploration keyword (`find`, `list`, `grep`, `audit`, `scan`…) → `💡 Exploration detected → /model haiku`

**QMD-first** — every `Read` on a project `.md` triggers `guard-qmd-first.sh`: the hook injects QMD equivalent commands before the read executes. Fewer `Read` calls, fewer input tokens.

---

### Skills — 16 slash commands (EN)

```text
/atelier-help       → Oracle: project state + available commands
/atelier-setup      → Interactive onboarding (8 steps)
/design-senior      → Séréna: senior design lead, design-first (MCP magic 21st.dev)
/atelier-doctor     → Health diagnostic (28 checks · 10 categories · --json)
/angle-mort         → Anti-complacency review before release
/audit-safe         → Security audit (5 checks)
/handoff-debt       → Live §25 debt + handoff draft generation
/review-copilot     → Handoff review for Copilot/GPT
/integrate-review   → Close the loop (read response, sort, checklist)
/night-launch       → Prepare night mode (8 prerequisites)
/token-routing      → Configure Haiku/Sonnet/Opus
/compress           → Compress CLAUDE.md to reduce input tokens
/qmd-init           → Install QMD (local markdown search engine)
/bmad-init          → Install BMAD (optional, large projects)
/ios-setup          → Configure iOS/tvOS workflow: VS Code + Xcode + Makefile V4
/freebox-init       → Bootstrap Freebox: LCD app_token + HMAC-SHA1 session + NAT
```

---

### Night Mode — Supervised autonomy

Claude crashes at 10:34pm, nobody notices, 8 hours lost.

```text
Claude Code (VSCode)          Watchdog Cowork (Haiku)
acceptEdits mode              Hourly scheduled task
atomic commits                git log → delta > 15 min?
push after green gate         Screenshot VSCode → diagnosis
                              CASE A: Allow button → auto-click
                              CASE B: spinner → silence
                              CASE C: frozen → iMessage alert
                              CASE D: closed → iMessage alert
```

---

### Parallelization — 3 power patterns

**Parallel Audit Storm** — 4 Haiku agents in a single message (secrets + lint + refs + tests). Full audit in 3 min instead of 15.

**Background Copilot Review** — Background agent writes the handoff while you keep coding. Zero flow interruption.

**Multi-Session CLI** — 2-3 independent Claude terminals (dev + continuous tests + lint watcher). Real-time local CI.

---

### Inter-LLM Review — Claude ↔ Copilot

A single LLM cannot see its own blind spots.

```text
/review-copilot → handoff .md → Copilot replies
→ /integrate-review → sort (kept / to keep / discarded) → actions
```

Auto-triggered via hook: feature completed, 100+ lines modified, 3+ failed attempts.

---

### §25 lock — no cowboy publish

This is not a literal crypto key. The real lock today is:

- **`pre-push-gate.sh` step 6**: blocks `git push` when §25 handoff debt is above threshold
- **`version-gate.js`**: blocks `npm version` until a valid external handoff has been integrated
- **source of truth = git**: debt is computed from git history, not from decorative counters
- **reset only via `/integrate-review`**: no automatic self-acquittal

Net effect: Claude cannot cleanly publish a heavy feature without going through the review/handoff loop.

---

### Satellites per stack

Loaded conditionally based on the active project. Some activate a named agent.

| Stack | File | Agent |
| --- | --- | --- |
| iOS / tvOS / iPadOS | `stacks/ios-xcode.md` | **Steve** 🍎 |
| NPM Publish / Registry | `stacks/npm-publish.md` | **Isaac** 📦 |
| Freebox API | `stacks/freebox.md` | **Xavier** 📡 |
| JavaScript/TypeScript | `stacks/javascript.md` | **Nael** 🔷 |
| Python | `stacks/python.md` | **Anthonio** 🐍 |
| Java | `stacks/java.md` | **Marcel** ☕ |
| React + Vite | `stacks/react-vite.md` | **Nicolas & Fazia** ⚡ |
| Firebase | `stacks/firebase.md` | **Camille** 🔥 |
| Docker | `stacks/docker.md` | **Pascal** 🐳 |
| Ollama | `stacks/ollama.md` | **Jeffrey** 🦙 |

---

### CI/CD — Automatic npm publishing

A GitHub Actions workflow auto-publishes to npm on every `v*` tag push:

```bash
git tag v0.3.0 && git push --tags
# → GitHub Actions: tests + automatic npm publish
```

The npm token is stored in GitHub secrets (`NPM_TOKEN`). No more manual `npm publish`.

A separate `CI` workflow runs `npm test` (lint + doctor + 20 hook tests) on every PR and push to main, on Node **18 / 20 / 22**, with `shellcheck --severity=warning` on all `hooks/*.sh` and `scripts/*.sh`. Doctor JSON output is uploaded as an artifact for debugging.

---

### Structure (EN)

```text
src/
├── fr/ · en/          Bilingual runtime rules (FR is source of truth)
│   ├── CLAUDE.md      Core ≤ 150 lines, reloaded on every message
│   ├── orchestration/ Fork/Teammate/Worktree, subagents, MCP, routing
│   ├── autonomy/      Permission modes, night-mode, loop-watchers
│   ├── security/      Secrets, pre-push gate, emergency procedure
│   ├── runtime/       Flow, format, extended thinking, todo-session
│   └── ecosystem/     Skills, plugins, hooks, memory, QMD, Hookify
├── stacks/            Per-stack satellites (iOS, JS, Python, Java…)
├── skills/            16 slash commands SKILL.md
└── templates/         .gitignore, .claudeignore, settings.json

.claude/hooks-manifest.json  Typed manifest of all hooks (12 entries, helper included)
hooks/                 11 enforcement hooks + 1 shared helper
scripts/               pre-push-gate.sh (5 checks: secrets→lint→build→tests)
                       update-security.js (auto-syncs SECURITY.md from package.json)
bin/cli.js             CLI (init, doctor, lint, update)
.github/workflows/     CI (Node 18/20/22 matrix) + npm publish on tag
test/                  lint-refs.js, lint-length.js, lint-hooks-manifest.js,
                       doctor.js (28 checks · --json mode), hooks.js (42 tests)
```

---

### Security (EN)

| Layer | Protection |
| --- | --- |
| `.gitignore` | Sensitive files excluded |
| `.claudeignore` | Invisible to Claude |
| `settings.json` deny list | Destructive commands blocked |
| `pre-push-gate.sh` | 5 steps before every push |
| Regex patterns | Secret detection (sk-, AKIA, ghp_, AIza…) |
| PreToolUse hooks | Blocking before execution (exit 2) |
| `SECURITY.md` | Vulnerability reporting policy (auto-synced version) |

---

### License

MIT — see [LICENSE](LICENSE).
