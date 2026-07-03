# Brief projet

> Géré par Peter via claude-atelier vault. Markdown vivant, pas document gravé.

## État court

- Projet : claude-atelier (framework Claude Code, npm public **v0.28.2**, `latest`)
- Phase : plan d'intégration 4 repos externes (claude-mem, last30days-skill, loop-engineering, ponytail) + Karpathy livré en totalité (LOT-0 à LOT-6, hors Vision V1-V4 non lancées). 2 bugs CTX corrigés (résolution modèle puis table fenêtre sonnet-5). Doc (CHANGELOG/README/website) resynchronisée avec le code réel via review-oracle.
- ⚠️ **CI npm-publish cassée** (2026-07-02) : `NPM_TOKEN_PUBLISH` (secret GitHub) échoue en boucle (EOTP puis 403) malgré plusieurs régénérations bypass-2FA côté npmjs.com. **Publication manuelle en attendant** : `npm publish --access public` en local (flux navigateur ou `--otp=<code>`). v0.28.0 et v0.28.2 publiés ainsi ; v0.27.0 et v0.28.1 jamais publiés (tags git existent, supersédés, sans conséquence — `latest` = 0.28.2 contient tout).
- `main` propre, tout poussé sur `origin/main`.

## Prochaine action utile

1. Régler la CI npm-publish (token bypass-2FA mal configuré) — non bloquant, publication manuelle fonctionne.
2. Reprendre la revue des résidus **un par un** (Claude propose dans l'ordre, Peter décide) — voir « Résidus à trancher » ci-dessous.

## Résidus à trancher (revue un-par-un, prochaine session)

- **Telegram** (mort ?) : `website/docs/telegram.md`, refs dans `bin/cli.js` + `src/features.json` + `website/docs/intro.md`/`agents.md` — toujours présent, statut à confirmer.
- **Binaire proxy** : `scripts/ollama-proxy/ollama-proxy` (8,7 Mo, mort, pas de source).
- **review-local.js** (Ollama) : `bin/review-local.js` appelle toujours `localhost:11434` — mort.

Résolus depuis (2026-07-02) : `marketplace_watch` et flags entête morts (`header_show_mode/ollama/proxy`) supprimés ; `review-copilot` rendu **toggleable** (plus un doublon, off par défaut) ; README chiffres corrigés (21 skills, 15 hooks) ; champ `pulse` du `vault maintain` confirmé **conservé** (décision 2026-06-27, indépendant de la feature Pulse supprimée).

## Repères techniques (état vrai)

- Entête §1 final : `` `[MM-DD HH:MM:SS | model | ctx N%] PASTILLE` `` — pastille ⬆️ (monter) / ⬇️ (descendre) / 🟢 (ok). Fenêtre ctx dérivée du modèle actif via table (`opus-4-8`, `sonnet-5` → 1M ; sinon 200k) — table à revérifier via `/context` à chaque nouveau modèle, pas d'auto-détection possible (le champ authoritative `context_window` n'est exposé qu'au hook `statusLine`, jamais à `UserPromptSubmit`).
- Enforcement §1 = hook **Stop** `guard-s1-header.sh` : contrôle la SORTIE de Claude (jamais l'entrée user). Ignore les tours user `isMeta:true` (= feedback des hooks eux-mêmes) sinon faux blocage en boucle.
- Gates : `commit` → flag `/tmp/claude-atelier-loop-done` (guard-loop-master) ; `push` → flag `/tmp/claude-atelier-review-done` (guard-review-auto, posé par `/review-oracle` verdict RATIFIÉ/MAJEUR).
- Inventaire réel : 15 hooks enforcement, 21 skills, 24 stacks (Ollama retiré comme feature exposée, reste backend embeddings mémoire interne).

## Décisions actives

- **LLM cloud uniquement** (Opus/Sonnet/Haiku via API Anthropic). Ollama, proxy Go, mode A/M **supprimés** (routing-check nettoyé).
- Switch modèle **toujours manuel** (la pastille conseille, jamais d'auto-switch).
- Peter = couche mémoire vivante ; vault local-first ; pas de cloud obligatoire.
- Pre-push gate obligatoire ; **jamais signer** les commits (pas de `Co-Authored-By`) ; commits en français.
- Suppressions : décidées par Peter, exécutées par Claude, tracées dans `vault/20-decisions.md`.

## À lire en priorité

- `vault/30-discoveries.md` — journal de session détaillé (dernière entrée 2026-07-02)
- `vault/20-decisions.md` — décisions (dont révocation Pulse 2026-06-27)
- `.claude/CLAUDE.md` §0 — contexte session courant
