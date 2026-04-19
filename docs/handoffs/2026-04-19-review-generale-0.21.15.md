# Handoff — Review générale v0.21.15

> Date : 2026-04-19
> Type : review
> Priorité : haute
> reviewedRange: 69c56566fb7fde96d512654ff271212b7e6b4e3b..191b544f8ac6c07e6e45dd5d257d06d1eb340f83

---

## De : Claude (Sonnet 4.6)

### Contexte

Deux features majeures livrées dans la journée du 2026-04-19, plus des ajustements hooks :

**Feature 1 — `npx claude-atelier features`** (v0.21.12–0.21.13)
Tableau de contrôle on/off par feature via `src/features.json`.
Commit clé : `69c56566` — `feat: tableau de contrôle features`

**Feature 2 — `npx claude-atelier review-local`** (v0.21.14–0.21.15)
Commande CLI (~397 lignes) qui lance une review automatique d'un handoff via Ollama local (deepseek-v3.1, qwen3, etc.), sans proxy.
Options : `--model`, `--handoff`, `--auto-integrate`, `--list-models`.
Protection anti-bypass : Claude Code ne peut pas se auto-reviewer (détection de l'agent appelant).
Commit clé : `bd8966f` — `feat: review-local — review Ollama automatique + anti-bypass auto-review Claude`

**Ajustements en cours (non committés)**
- `hooks/model-metrics.sh` — modifié (staged)
- `hooks/routing-check.sh` — modifié (unstaged)
- `test/hooks.js` — modifié
- `.claude/hooks-manifest.json` — modifié (staged)

### Question précise

Review générale sur deux axes :

1. **`bin/review-local.js`** — logique complète (397 lignes) :
   - La détection anti-bypass est-elle robuste ? Peut-on la contourner facilement ?
   - L'appel direct à Ollama (`localhost:11434`) est-il correctement géré (timeout, erreurs réseau, modèle absent) ?
   - Y a-t-il des edge cases non couverts (handoff malformé, champ `reviewedRange` absent, fichier déjà reviewé) ?
   - Le flag `--auto-integrate` injecte un squelette dans le fichier : est-ce suffisamment sécurisé (injection, encodage) ?

2. **`src/features.json` + intégration CLI** :
   - Le schéma features est-il extensible sans breaking change ?
   - Y a-t-il un risque de désync entre `features.json` et le code qui consomme les flags ?

### Fichiers à lire

- [bin/review-local.js](../../bin/review-local.js) — commande principale (397 lignes)
- [bin/cli.js](../../bin/cli.js) — point d'entrée CLI, intégration review-local
- [src/features.json](../../src/features.json) — feature flags
- [hooks/guard-commit-french.sh](../../hooks/guard-commit-french.sh) — fix ajouté
- [test/validate-handoff.js](../../test/validate-handoff.js) — tests validation handoff
- [.claude/hooks-manifest.json](../../.claude/hooks-manifest.json) — manifest hooks
- [docs/handoffs/2026-04-19-review-local-anti-bypass.md](2026-04-19-review-local-anti-bypass.md) — handoff précédent (deepseek review)
- [docs/handoffs/2026-04-19-features-control-panel.md](2026-04-19-features-control-panel.md) — handoff précédent features

### Contraintes / hors scope

- Ne pas proposer de réécrire `review-local.js` en TypeScript ou de changer l'architecture
- Ne pas commenter les choix d'UX CLI (couleurs, output format) sauf si bug
- Se concentrer sur robustesse, edge cases, sécurité anti-bypass

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
1. Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, section `## Réponse de : Copilot/GPT`.
2. Tu ne dois PAS répondre dans le chat, ni dans un autre fichier.
3. **INTERDIT DE MODIFIER DU CODE SOURCE.** Tu es reviewer, pas développeur. Ton rôle est d'observer, critiquer, signaler — jamais de toucher aux fichiers `.js`, `.ts`, `.json`, `.sh`, `.md` hors de ce handoff. Si tu vois un bug, décris-le. Ne le corrige pas.
4. **INTERDIT DE MODIFIER LE FRONTMATTER** (Date, Type, Priorité, reviewedRange). Ces champs sont ancrés par Claude. Les changer casse la CI.
5. Quand tu as fini, dis : "J'ai répondu dans [chemin du fichier]."

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
