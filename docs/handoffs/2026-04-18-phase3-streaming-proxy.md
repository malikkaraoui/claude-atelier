# Handoff — Phase 3 : streaming proxy Ollama NDJSON → Anthropic SSE

> Date : 2026-04-18
> Type : review
> Priorité : moyenne
> reviewedRange: 432e69889d4411e69939783c101fde8bae68e6dc..ca720dea9057c75757ead6ca254986d804bbbc67

---

## De : Claude (Opus 4.6)

### Contexte

Phase 3 du proxy Go (Anthropic → Ollama) : ajout du streaming SSE.

Avant Phase 3, le proxy renvoyait toujours une réponse JSON unique (non-streaming), même si Claude Code envoyait `"stream": true`. Désormais le proxy :

1. Détecte `stream: true` dans la requête Anthropic entrante
2. Lit le stream NDJSON d'Ollama ligne par ligne (`bufio.Scanner`)
3. Traduit chaque chunk en événements SSE Anthropic (`message_start` → `content_block_start` → `content_block_delta` × N → `content_block_stop` → `message_delta` → `message_stop`)
4. Gère le fallback `thinking → content` (qwen3.5 met parfois la réponse dans le champ `thinking` et laisse `content` vide) avec log + préfixe `[thinking fallback]`
5. Gère le `tool_use` en streaming via `input_json_delta` (Ollama ne livre les `tool_calls` que sur le chunk `done:true`)

Commits inclus (depuis le dernier handoff intégré) :
- `72e5c9f` — feat Phase 3 streaming + v0.3.0 (main.go, main_test.go, go.mod, hooks, tests)
- `ca720de` — chore exclure binaire Go du git

5 tests Go couvrent les cas nominaux + thinking fallback + tool_use. `go test ./...` → 5/5 PASS.

Version proxy : `v0.2.0` → `v0.3.0`.

### Question précise

La traduction NDJSON → SSE est-elle fidèle au protocole Anthropic ?

Points spécifiques à examiner :

1. **Ordre et complétude des événements SSE** : `message_start` → `ping` → `content_block_start` → `content_block_delta` × N → `content_block_stop` → `message_delta` (avec `stop_reason`) → `message_stop` — est-ce l'ordre exact attendu par Claude Code ?
2. **`input_json_delta` pour tool_use** : Ollama livre les `tool_calls` seulement sur le chunk `done:true` (pas de streaming des arguments). Le proxy émet un seul `input_json_delta` avec tous les arguments JSON sérialisés. Est-ce que Claude Code accepte ça, ou attend-il plusieurs deltas ?
3. **Thinking fallback en streaming** : le fallback est géré dans le bloc `done:true` — si le stream arrive avec plusieurs chunks dont le dernier seul a `thinking` non vide, la détection est-elle correcte ?
4. **Robustesse** : quid d'un stream Ollama qui ferme la connexion brutalement (scanner EOF avant `done:true`) ?

### Fichiers à lire

- `scripts/ollama-proxy/main.go` — proxy complet (focus : `handleStreamingRequest`, `writeSSE`, `translateResponse`)
- `scripts/ollama-proxy/main_test.go` — 5 tests Go (mocks NDJSON → assertions SSE)
- `scripts/ollama-proxy/go.mod` — module Go
- `hooks/routing-check.sh` — version string (ligne ~211)
- `test/hooks.js` — section Go tests intégrés (lignes ~522-552)

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne
- Se concentrer sur ce qui manque ou est fragile
- Le proxy est un MVP local — pas de TLS, pas d'auth, pas de pool de connexions
- Ne pas modifier le code source ni le frontmatter de ce fichier

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
