# Handoff — Extension 20 stacks langages

> Date : 2026-04-17
> Type : review
> Priorité : moyenne
> reviewedRange: fd4b8d50bec06273e84165a8684c72d83f627dd7..521a76e17e5237c1c99145179cd28c3804aa63a6

---

## De : Claude (Sonnet 4.6)

### Contexte

Extension massive des satellites de stack dans l'atelier claude-atelier. L'objectif est de couvrir 20 langages de programmation avec des bonnes pratiques à jour (2025-2026), outils, sécurité, gestion mémoire, performance et conventions actualisées.

**Travail réalisé (8 commits, 24 fichiers, +1357 lignes) :**

1. **4 stacks existants améliorés** — Ajout systématique des sections Sécurité, Performance & Mémoire, Ce qu'on ne fait plus, Tests :
   - `python.md` : uv (100x pip), ruff, bandit, free-threaded 3.13, pyright
   - `java.md` : Virtual Threads Java 21+, Structured Concurrency Java 25, Testcontainers, JEP 491
   - `javascript.md` : Biome (remplace ESLint+Prettier), Bun production-ready, Vitest, TypeScript 6
   - `ios-xcode.md` : Swift 6 strict concurrency, Swift Testing framework, Observation framework

2. **16 nouveaux satellites créés** — Chacun avec agent féminin, frontmatter YAML, 8 sections standard (60-100 lignes) :
   - Systèmes : C (Clara 🔧), C++ (Célia ⚙️), Rust (Roxane 🦀), Assembly (Astrid 🔩), Ada (Ada 👑)
   - Managés : C# (Carmen 🎵), PHP (Phoebe 🐘), Go (Gaëlle 🦫), Perl (Perla 🐪), Visual Basic (Violette 💜)
   - Scientifique : SQL (Selma 🗄️), R (Rosalie 📊), Fortran (Florence 🔬), MATLAB (Mathilde 📐), Delphi (Daphné 🏛️), Scratch (Sofia 🧩)

3. **Intégration** :
   - `CLAUDE.md §10` : liste 26 stacks (vs 10 avant)
   - `routing-check.sh` : détection auto C/C++, Rust, Go, PHP, C#, Ada, SQL (+8 langages)
   - `context7-mapping.md` : entrées pour les 13 nouveaux langages
   - `hooks-manifest.json` : SHA resynchronisé

### Question précise

1. **Cohérence inter-langages** : les 16 nouveaux satellites suivent-ils un format uniforme ? Y a-t-il des incohérences de structure, de profondeur ou de ton entre les fichiers ?

2. **Exactitude technique** : les informations 2025-2026 sont-elles correctes pour chaque langage ? Repérer toute erreur factuelle (versions, outils, API dépréciées) — notamment pour C++26, Java 24+, Go 1.26, PHP 8.4, Rust Edition 2024, Ada 2022.

3. **routing-check.sh** : les patterns regex de détection sont-ils robustes ? Risque de faux positifs (ex: "go build" matche dans un texte non-Go) ou faux négatifs (langage utilisé mais non détecté) ?

4. **Couverture sécurité** : chaque stack a-t-il une section sécurité pertinente ? Des vulnérabilités connues manquantes pour un langage donné ?

5. **Lacunes** : manque-t-il un outil ou une pratique incontournable 2025-2026 pour l'un des 20 langages ?

### Fichiers à lire

- `src/stacks/c.md` — Nouveau (Clara)
- `src/stacks/cpp.md` — Nouveau (Célia)
- `src/stacks/rust.md` — Nouveau (Roxane)
- `src/stacks/go.md` — Nouveau (Gaëlle)
- `src/stacks/php.md` — Nouveau (Phoebe)
- `src/stacks/csharp.md` — Nouveau (Carmen)
- `src/stacks/python.md` — Amélioré
- `src/stacks/java.md` — Amélioré
- `src/stacks/javascript.md` — Amélioré
- `hooks/routing-check.sh` (lignes 230-310)

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne
- Se concentrer sur les erreurs factuelles et les lacunes
- Les stubs existants (docker, firebase, react-vite, ollama) ne sont pas dans le scope

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
1. Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, section `## Réponse de : Copilot/GPT`.
2. Tu ne dois PAS répondre dans le chat, ni dans un autre fichier.
3. **INTERDIT DE MODIFIER DU CODE SOURCE.** Tu es reviewer, pas développeur. Ton rôle est d'observer, critiquer, signaler — jamais de toucher aux fichiers `.js`, `.ts`, `.json`, `.sh`, `.md` hors de ce handoff. Si tu vois un bug, décris-le. Ne le corrige pas.
4. **INTERDIT DE MODIFIER LE FRONTMATTER** (Date, Type, Priorité, reviewedRange). Ces champs sont ancrés par Claude. Les changer casse la CI.
5. Quand tu as fini, dis : "J'ai répondu dans docs/handoffs/2026-04-17-extension-20-stacks-langages.md."

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
