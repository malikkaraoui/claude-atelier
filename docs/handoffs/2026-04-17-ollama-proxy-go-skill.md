# Handoff — Feature A Ollama proxy Go + skill ollama-router

> Date : 2026-04-17
> Type : review
> Priorité : moyenne
> reviewedRange: c2d9bfab2d00855696096cd2ba5c0cbe8ac6a47c..179dc6e8a6870e414bd8de5cdfffc248cd8feba8

---

## De : Claude (Sonnet 4.6)

### Contexte

3 commits / +669 lignes depuis le dernier handoff intégré. Une feature livrée :

**Feature A — Ollama proxy Go + skill ollama-router**

- `scripts/ollama-proxy/main.go` : proxy HTTP Go stdlib-only, écoute `localhost:4000`
  - Traduit `POST /v1/messages` (Anthropic) → `POST /api/chat` (Ollama)
  - Résolution modèle via presets RAM (`llama3.2:3b` / `mistral` / `llama3.1:70b`)
  - Mode dégradé contractuel : requêtes avec `tools` → 501 Not Implemented
  - Route healthcheck `GET /health`
  - Timeout 120s sur les requêtes Ollama
- `scripts/ollama-proxy/config.json` : presets RAM avec tags explicites
- `scripts/ollama-proxy/README.md` : guide lancement manuel, healthcheck, pull modèle
- `src/skills/ollama-router/SKILL.md` + `.claude/skills/ollama-router/SKILL.md` : skill Isaac 🔌 — détection Ollama, recommandation preset RAM, pull modèle, lancement documenté (jamais automatique), écriture `ANTHROPIC_BASE_URL` dans `.env.local`, healthcheck

### Question précise

**1. Résolution modèle — logique de matching**

La fonction `translateMessages` est appelée avant la résolution modèle, et la résolution se fait par `strings.Contains(anthropicReq.Model, p.Name)` (match sur le nom du preset, ex: "light") OU `anthropicReq.Model == p.Model` (match exact sur le tag Ollama). Si le client envoie `claude-sonnet-4-6` ou `claude-3-5-haiku`, aucun preset ne matche et le code tombe sur le dernier preset (`heavy` = `llama3.1:70b`). Ce fallback silencieux est-il un angle mort notable pour le MVP, ou est-ce acceptable que le proxy ne cherche pas à mapper les noms de modèles Claude vers des presets Ollama ?

**2. Parsing `content` — robustesse**

`extractText()` gère deux cas : `string` et `[]interface{}`. Mais l'API Anthropic peut envoyer des blocs `image`, `document`, ou `tool_result` dans `content`. Ces types sont silencieusement ignorés (pas de texte extrait). Est-ce acceptable pour le MVP de perdre silencieusement ces blocs, ou faut-il au moins logguer un warning quand un bloc non-texte est ignoré ?

**3. Skill — lancement sans `go build`**

Le skill documente `go run main.go` uniquement. Pour une utilisation régulière, `go build -o ollama-proxy && ./ollama-proxy` serait plus performant (pas de recompilation à chaque lancement). Est-ce un manque notable dans le skill, ou est-ce intentionnel pour garder le skill simple (MVP, usage occasionnel) ?

**4. `.env.local` — écriture silencieuse**

Le skill écrit `ANTHROPIC_BASE_URL=http://localhost:4000` dans `.env.local` sans vérifier si d'autres variables sont présentes dans le fichier. Si `.env.local` contient déjà des valeurs importantes, l'ajout est additif (pas destructif), mais l'utilisateur n'en est pas forcément informé. Est-ce que l'étape 7 du skill est assez précise sur ce comportement ?

### Fichiers à lire

```text
scripts/ollama-proxy/main.go           (294 lignes — proxy complet)
scripts/ollama-proxy/config.json       (presets RAM)
scripts/ollama-proxy/README.md         (guide utilisateur)
src/skills/ollama-router/SKILL.md      (skill Isaac 🔌 — 9 étapes)
```

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne
- Go stdlib only — pas de dépendances externes
- Le lancement manuel (non automatique) est une décision validée, ne pas remettre en question
- Mode dégradé (tools → 501) est contractuel MVP, ne pas remettre en question

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
