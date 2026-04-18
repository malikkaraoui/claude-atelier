# Handoff — Phase 4 : triage routing Ollama LOCAL/ANTHROPIC

> Date : 2026-04-18
> Type : review
> Priorité : haute
> reviewedRange: 7269db7503eeb88fc4aa61b7932091bf58582677..7a5400eb79dae7e3a47af3fbd57bd24eb89ecbf8

---

## De : Claude (Sonnet 4.6)

### Contexte

Phase 4 du proxy Go (Anthropic → Ollama) : ajout du routage par triage.

Avant Phase 4, le proxy routait **toutes** les requêtes vers Ollama, sans distinction. L'utilisateur veut que les requêtes simples (ex : « change la couleur en rouge ») soient traitées localement par Ollama, tandis que les requêtes complexes soient renvoyées au vrai Anthropic.

Désormais le proxy (quand `"triage": true` dans config.json) :

1. Détecte les `tool_result` dans les messages → route systématiquement vers Anthropic (boucle agentique en cours)
2. Sinon, envoie un appel de classification à Ollama :
   > « Réponds uniquement avec LOCAL ou ANTHROPIC. LOCAL = question simple. ANTHROPIC = trop complexe. »
3. Si Ollama répond `LOCAL` → traitement local (chemin Phases 1-3 inchangé)
4. Si Ollama répond `ANTHROPIC` → `forwardToAnthropic()` : pipe le body original + header `Authorization: Bearer` verbatim vers `https://api.anthropic.com/v1/messages` et retourne la réponse (streaming ou buffered) telle quelle
5. Si la classification échoue (Ollama injoignable, timeout) → fallback LOCAL (proxy ne casse jamais)

Commits inclus :
- `ee07f17` — feat: Phase 4 triage routing (main.go +221 lignes, main_test.go +115 lignes, config.json)
- `7a5400e` — chore: sync cli.js version

4 nouveaux tests Go couvrent : classify LOCAL, classify ANTHROPIC, tool_result heuristique, forwardToAnthropic pipe. `go test ./...` → 10/10 PASS.

### Question précise

L'architecture de triage est-elle solide pour un MVP local ?

Points spécifiques à examiner :

1. **Triage par LLM** : demander à Ollama de se classifier lui-même (LOCAL/ANTHROPIC) crée-t-il un biais ? Le modèle est-il incité à répondre `LOCAL` systématiquement pour « garder » les requêtes ?

2. **Latence triage** : chaque requête déclenche un appel Ollama supplémentaire (non-streaming, `num_predict: 5`) avant de router. En pratique, quel est l'impact sur l'expérience utilisateur dans VS Code ?

3. **Cas manquants dans les heuristiques** : l'heuristique `tool_result → Anthropic` couvre les boucles agentiques. Y a-t-il d'autres patterns de requêtes Claude Code qui devraient toujours aller vers Anthropic (ex : requêtes système, continuations longues) ?

4. **Sécurité du pipe Anthropic** : `forwardToAnthropic` copie tous les headers de la réponse Anthropic (`resp.Header`) verbatim. Certains headers HTTP peuvent-ils créer des problèmes (ex : `Content-Length` incorrect, headers de sécurité, CORS) ?

5. **Activation** : le triage est désactivé par défaut (`"triage": false`). Est-ce le bon défaut, ou devrait-il être activé dès l'installation avec un mode dégradé si Anthropic est injoignable ?

### Fichiers à lire

```text
scripts/ollama-proxy/main.go       — focus : classifyRequest(), forwardToAnthropic(), bloc triage dans makeHandler()
scripts/ollama-proxy/main_test.go  — 4 tests triage (lignes 170-260 environ)
scripts/ollama-proxy/config.json   — champs triage, triage_model, anthropic_url
```

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne
- Se concentrer sur ce qui manque ou est fragile
- Le proxy est un MVP local — pas de TLS, pas d'auth propre, pas de cache
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
