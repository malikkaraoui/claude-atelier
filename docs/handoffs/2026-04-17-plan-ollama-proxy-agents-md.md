# Handoff — Plan : Proxy Ollama (Go) + AGENTS.md P1

> Date : 2026-04-17
> Type : review
> Priorité : haute
> reviewedRange: 914aa5126e091e5cb9db6809d82a5d8060b7da92..5850f4e90f91e57e5ed21a214ef04f0826cbe9b8

---

## De : Claude (Sonnet 4.6)

### Contexte

Deux nouvelles features planifiées pour `claude-atelier`. Rien n'est encore codé — ce handoff est une review de plan avant implémentation.

**Feature A — Proxy Ollama (Go)**

Un proxy HTTP léger écrit en Go qui intercepte les appels Claude Code vers l'API Anthropic et les redirige vers Ollama en local. Objectif : zéro token facturé sur les tâches légères (exploration, lint, questions rapides), zéro friction (pas de fork du CLI, pas de sortie de VS Code).

Architecture cible :
```
Claude Code → POST /v1/messages (format Anthropic)
                    ↓
    scripts/ollama-proxy/main.go (localhost:4000)
                    ↓ mapping via config.json
    Ollama /api/chat (localhost:11434)
```

Mapping modèles prévu dans `config.json` :
```json
{
  "claude-haiku-*":  "llama3.2",
  "claude-sonnet-*": "mistral",
  "claude-opus-*":   "llama3.1:70b"
}
```

Activation : `ANTHROPIC_BASE_URL=http://localhost:4000` dans `.env.local`. Rien d'autre à toucher.

**Skill associé : `/ollama-router`**

Un skill interactif qui prend en charge tout le lifecycle :
1. Détecte si Ollama tourne (`curl localhost:11434`)
2. Liste les modèles disponibles (`ollama list`)
3. Recommande selon RAM disponible (< 8 Go → llama3.2:3b, 8–16 Go → llama3.2, > 16 Go → llama3.1:70b)
4. Pull le modèle si absent (`ollama pull`)
5. Lance le proxy en background (via `spawnSync` Node ou `go run`)
6. Écrit `ANTHROPIC_BASE_URL` dans `.env.local`
7. Test rapide et confirmation

**Feature B — AGENTS.md P1**

Migration de CLAUDE.md vers un modèle `AGENTS.md`-first, aligné sur le standard Linux Foundation / AAIF (Anthropic + OpenAI + Google + Microsoft).

Plan :
- Créer `src/templates/AGENTS.md` avec les règles universelles extraites de CLAUDE.md : §3 (flow), §5 (anti-hallucination), §7 (qualité), §8 (anti-patterns), §9 (architecture)
- CLAUDE.md devient un satellite : importe AGENTS.md + ajoute le delta Claude-specific (§0 §1 §2 §13 §15 §25)
- `init.js` copie `AGENTS.md` à la racine projet (à côté de `CLAUDE.md`)
- Les autres agents (Copilot, Gemini, Codex) lisent AGENTS.md directement

### Question précise

**Je ne demande pas de code.** Je demande une review de plan sur les points suivants :

**Sur le proxy Go (Feature A) :**

1. **Traduction des tools** — Le format `tool_use` / `tool_result` d'Anthropic est différent du format `tools` d'Ollama. Pour le MVP, est-il raisonnable de faire un proxy passthrough sans supporter les tools (répondre avec une erreur explicite si `tools` est présent dans la requête), ou ce cas est-il trop fréquent dans Claude Code pour être ignoré ?

2. **Lancement du proxy** — Le skill envisage de lancer le proxy via `spawnSync` depuis Node (automatisé). Est-ce plus robuste qu'un lancement manuel documenté ? Y a-t-il un risque de processus orphelin ou de port déjà occupé qu'on n't a pas anticipé ?

3. **Mapping modèles** — Le mapping `claude-haiku-* → llama3.2` est-il pertinent en termes de parité de capacité ? Un utilisateur qui route vers Haiku s'attend à de la rapidité + coût faible. llama3.2 (3B) est-il un choix solide, ou faut-il proposer plusieurs options dans `config.json` ?

**Sur AGENTS.md P1 (Feature B) :**

4. **Périmètre du delta Claude-specific** — J'ai prévu de garder dans CLAUDE.md : §0 (contexte projet), §1 (horodatage + modèle), §2 (langue/ton), §13 (git), §15 (token routing), §25 (handoff inter-agents). Est-ce que certains de ces paragraphes devraient plutôt aller dans AGENTS.md (ex: §13 git est-il vraiment Claude-specific ou universel) ?

5. **Rétrocompatibilité** — Pour les projets existants qui ont déjà un CLAUDE.md installé par claude-atelier, `update.js` va écraser CLAUDE.md avec le nouveau format. Est-ce que la migration devrait être opt-in (flag `--migrate-agents-md`) ou automatique ?

6. **Découvrabilité** — Un utilisateur qui arrive avec Copilot ou Gemini dans un projet claude-atelier doit trouver AGENTS.md à la racine et comprendre que c'est la source des règles communes. Est-ce suffisant ou faut-il un commentaire d'en-tête explicite dans AGENTS.md qui explique la structure ?

### Fichiers à lire

```text
bin/init.js                     (270-295 lignes — flow post-install)
bin/update.js                   (155-220 lignes — flow update + post-install)
.claude/CLAUDE.md               (§0 à §25 — structure actuelle complète)
src/templates/settings.json     (configuration Claude Code)
.env.example                    (ce qui existe déjà côté env)
scripts/switch_model.py         (routing actuel Haiku/Sonnet/Opus)
```

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne
- Le proxy doit rester zéro dépendance externe Go (stdlib uniquement)
- Ne pas remettre en question le choix Go pour le proxy (décision prise)
- La migration AGENTS.md doit être non-destructive pour §0 (contexte projet utilisateur)
- Ne pas coder : observer, critiquer, signaler uniquement

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
1. Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, section `## Réponse de : Copilot/GPT`.
2. Tu ne dois PAS répondre dans le chat, ni dans un autre fichier.
3. **INTERDIT DE MODIFIER DU CODE SOURCE.** Tu es reviewer, pas développeur. Ton rôle est d'observer, critiquer, signaler — jamais de toucher aux fichiers `.js`, `.ts`, `.json`, `.sh`, `.md` hors de ce handoff. Si tu vois un problème, décris-le. Ne le corrige pas.
4. **INTERDIT DE MODIFIER LE FRONTMATTER** (Date, Type, Priorité, reviewedRange). Ces champs sont ancrés par Claude. Les changer casse la CI.
5. Réponds aux 6 questions numérotées. Ajoute un verdict global en fin.
6. Quand tu as fini, dis : "J'ai répondu dans docs/handoffs/2026-04-17-plan-ollama-proxy-agents-md.md"

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
