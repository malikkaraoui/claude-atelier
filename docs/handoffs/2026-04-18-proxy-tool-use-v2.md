# Handoff — Proxy tool_use v0.2.0 + fix routing + MAJ §0

> Date : 2026-04-18
> Type : review
> Priorité : haute
> reviewedRange: 955895bfd4a725288068406c301bd629aa8f841d..5ee66d7d6940fb4029c020a2af8691639f9bb78a

---

## De : Claude (Opus 4.6)

### Contexte

3 chantiers dans un seul commit :

**1. Proxy Go tool_use v0.2.0** (`scripts/ollama-proxy/main.go` — réécriture majeure, +312/-110 lignes)

Le proxy Anthropic → Ollama retournait 501 sur toute requête contenant des `tools`. Claude Code envoie des tools à chaque message, donc le proxy était inutilisable.

Implémentation du mapping bidirectionnel :
- **Request** : `AnthropicTool{name, input_schema}` → `OllamaTool{type:"function", function:{name, parameters}}`
- **Messages tool_use** : content block `{type:"tool_use", id, name, input}` dans un message assistant → `tool_calls:[{type:"function", function:{name, arguments}}]` dans OllamaMessage
- **Messages tool_result** : content block `{type:"tool_result", tool_use_id, content}` dans un message user → message séparé `{role:"tool", tool_name, content}` pour Ollama
- **Response** : Ollama `tool_calls` → Anthropic `tool_use` content blocks avec ID généré (`toolu_proxy_*`)
- Version health passée de 0.1.0 à 0.2.0
- `stop_reason` mis à `"tool_use"` quand Ollama retourne des tool_calls

Testé en réel avec curl : round-trip complet (user → tool_use → tool_result → réponse texte) validé avec qwen3.5:4b.

**Limites connues non adressées :**
- Streaming toujours non supporté (buffered response only)
- `usage.input_tokens` / `output_tokens` toujours à 0 (Ollama ne les retourne pas de façon fiable)
- Pas de mapping `tool_use_id` → `tool_name` cross-messages (le proxy ne maintient pas d'état entre requêtes). Les tool_result envoyés par Claude Code contiennent un `tool_use_id` mais le proxy ne peut pas résoudre le `tool_name` associé — il passe un string vide à Ollama
- Variable globale `toolUseCounter` pour générer les IDs — pas thread-safe si requêtes concurrentes
- Le modèle `qwen3.5:4b` (4B paramètres) peut ne pas bien gérer les tools complexes avec de nombreux paramètres

**2. Fix routing detection** (`hooks/routing-check.sh` — +20/-15 lignes)

Bug : le hook affichait toujours le modèle du cache session-start, même après `/model sonnet`. Cause : `LIVE_MODEL` lu depuis `d.get('model', '')` du JSON stdin, mais UserPromptSubmit ne fournit pas de champ `model`. Le cache (écrit au SessionStart) n'était jamais mis à jour.

Fix : le transcript est maintenant vérifié à chaque message pour détecter les entrées "Set model to ...". Si un changement est détecté, il override le cache et le met à jour. Priorité : live > transcript > cache (avant : live > cache > transcript, et transcript jamais atteint).

**3. MAJ §0** (`.claude/CLAUDE.md`)

§0 était vide (tous les champs à `—`). Rempli avec le contexte actuel : Phase 2 proxy, Stack Node+Go, endpoints proxy:4000 + Ollama:11434.

Fix supplémentaire : le diagnostic §0 dans routing-check.sh pointait vers `src/fr/CLAUDE.md` (ancien chemin) au lieu de `.claude/CLAUDE.md`.

**4. Skill ollama-router** (`.claude/skills/ollama-router/SKILL.md`)

Retrait de la mention "Limitation MVP : tool_use retourne 501" → remplacé par "v0.2.0 : tool_use supporté".

### Question précise

1. Le mapping tool_use est-il correct et complet ? Y a-t-il des cas edge que j'ai manqués dans la traduction Anthropic ↔ Ollama (ex: tool_result avec `is_error: true`, content blocks mixtes text+tool_result dans un même message, multiple tool_use dans une seule réponse) ?

2. La variable globale `toolUseCounter` est-elle un risque réel ? Le proxy est mono-utilisateur (localhost), mais Go sert les requêtes en goroutines concurrentes.

3. Le fix routing (transcript > cache) est-il robuste ? Le grep du transcript cherche `Set model to claude-(opus|sonnet|haiku)-...` — est-ce que ce pattern peut matcher du contenu utilisateur cité dans le transcript (faux positif) ?

4. Le fait de ne pas passer `tool_name` dans les messages `role:"tool"` à Ollama (car le proxy ne maintient pas d'état cross-requêtes) — est-ce un problème ? Ollama accepte-t-il les tool results sans tool_name ?

### Fichiers à lire

```
scripts/ollama-proxy/main.go          # +312/-110 — tout le mapping tool_use
hooks/routing-check.sh                # lignes 66-92 — nouveau flow transcript > cache
.claude/CLAUDE.md                     # §0 lignes 6-16
.claude/skills/ollama-router/SKILL.md # lignes 127-129 — retrait limitation MVP
```

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne
- Le streaming est hors scope pour cette review (Phase 3)
- Les token counts à 0 sont acceptés (limitation Ollama connue)
- Se concentrer sur la solidité du mapping tool_use et les edge cases manqués

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
