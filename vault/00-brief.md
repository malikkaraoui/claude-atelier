# Brief projet

> Géré par Peter via claude-atelier vault. Markdown vivant, pas document gravé.

## État court

- Projet : claude-atelier (framework Claude Code, npm public v0.26.1)
- Phase : **Grand nettoyage / simplification** — élimination des features mortes + mise en vérité du repo (README ↔ code réel). En cours, feature par feature.
- Dernier livré : commit `06c6125` (2026-06-27) — entête §1 robuste + nettoyage `routing-check.sh` (Ollama/proxy/mode A-M retirés) + suppression complète de la feature **Pulse**. Review-oracle RATIFIÉ (4 agents), 219 tests verts.
- ⛔ **PUSH EN ATTENTE — RIEN N'EST POUSSÉ** : `main` locale = **6 commits en avance** sur `origin/main`. `git push` bloqué sur l'auth GitHub (remote HTTPS, `gh` non connecté, pas de credentials). → Peter doit `gh auth login` puis `git push` (ou push depuis son terminal).

## But de la démarche (Peter, 2026-07-01)

Peter veut un framework **simple, efficace, honnête** : zéro pollution dans les sorties de hook, zéro code superflu, docs qui reflètent EXACTEMENT le code. Méthode imposée : **passer le repo en revue fonction par fonction** ; pour chaque item Peter tranche lui-même **garde / fait évoluer / supprime** — Claude ne coupe JAMAIS unilatéralement (il propose dans l'ordre, explique la fonction, attend la décision). Pas de dette technique : on commit/push au fil de l'eau. Toute suppression multi-fichiers passe par le panel review-oracle (4 sous-agents) avant push.

## Prochaine action utile

1. **Pousser les 6 commits** (auth GitHub) — priorité absolue, rien n'est sur le remote.
2. Reprendre la revue des résidus **un par un** (Claude propose dans l'ordre, Peter décide) — voir « Résidus à trancher » ci-dessous.

## Résidus à trancher (revue un-par-un, prochaine session)

- **Telegram** (mort) : `website/docs/telegram.md` (115 l.), highlight « Bridge Telegram » dans `bin/cli.js` + `src/features.json`, `.claude/EXECUTOR.md:32`, `website/docs/intro.md`.
- **Binaire proxy** : `scripts/ollama-proxy/ollama-proxy` (8,7 Mo, mort, pas de source).
- **review-local.js** (Ollama) : `bin/review-local.js` appelle `localhost:11434` — mort.
- **marketplace_watch** : feature morte dans `src/features-registry.json` (desc « lié au pouls »).
- **review-copilot** : skill `review-copilot` + `integrate-review` + `handoff-debt` — doublon potentiel avec review-oracle (Copilot déjà remplacé).
- **Flags entête morts** : `header_show_mode`, `header_show_ollama`, `header_show_proxy` dans `features-registry.json`.
- **README complet** : chiffres à corriger (21 skills, 16 hooks, 219 tests) + retirer Jeffrey 🦙/Ollama, mode A/M, « Loop Copilot autonome » ; format §1 3-segments.
- **Champ `pulse` du `vault maintain`** (`bin/vault.js` + 3 tests `test/vault.js`) : battement lastBeatAt/mode — ≠ feature Pulse supprimée. Garder ou renommer (décision séparée).

## Repères techniques (état vrai)

- Entête §1 final : `` `[MM-DD HH:MM:SS | model | ctx N%] PASTILLE` `` — pastille ⬆️ (monter) / ⬇️ (descendre) / 🟢 (ok). Fenêtre ctx dérivée du modèle actif (opus-4-8 ou suffixe `[1m]` → 1M ; sinon 200k).
- Enforcement §1 = hook **Stop** `guard-s1-header.sh` : contrôle la SORTIE de Claude (jamais l'entrée user). Ignore les tours user `isMeta:true` (= feedback des hooks eux-mêmes) sinon faux blocage en boucle.
- Gates : `commit` → flag `/tmp/claude-atelier-loop-done` (guard-loop-master) ; `push` → flag `/tmp/claude-atelier-review-done` (guard-review-auto, posé par `/review-oracle` verdict RATIFIÉ/MAJEUR).
- `npm test` = lint + doctor + hooks (75) + merge (14) + apply-profile (19) + vault (74) + vault-update (37) = **219 verts**.
- Inventaire : 16 hooks, 21 skills, 24 stacks (Ollama retiré ; Go/Gaëlle vivant).

## Décisions actives

- **LLM cloud uniquement** (Opus/Sonnet/Haiku via API Anthropic). Ollama, proxy Go, mode A/M **supprimés** (routing-check nettoyé).
- Switch modèle **toujours manuel** (la pastille conseille, jamais d'auto-switch).
- Peter = couche mémoire vivante ; vault local-first ; pas de cloud obligatoire.
- Pre-push gate obligatoire ; **jamais signer** les commits (pas de `Co-Authored-By`) ; commits en français.
- Suppressions : décidées par Peter, exécutées par Claude, tracées dans `vault/20-decisions.md`.

## À lire en priorité

- `vault/30-discoveries.md` — journal de session détaillé (dernière entrée 2026-07-01)
- `vault/20-decisions.md` — décisions (dont révocation Pulse 2026-06-27)
- `.claude/CLAUDE.md` §0 — contexte session courant
