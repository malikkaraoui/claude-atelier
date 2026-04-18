# Handoff — Routing multi-schéma + cache scoppé session + fix proxy thinking

> Date : 2026-04-18
> Type : review
> Priorité : haute
> reviewedRange: c87bcd688e688ebcbad76cc8ebca197d649ead2b..b96e483c6cc1f1bf99df2e8295bc476f2ee8c330

---

## De : Claude (Opus 4.6)

### Contexte

Suite au handoff `2026-04-18-retour-claude-sortie-boucle-iteration.md` (Copilot → Claude), 3 chantiers corrigés dans cette itération :

**1. Routing transcript multi-schémas** (`hooks/routing-check.sh` — +211/-92 lignes)

Le parsing JSONL du transcript était rigide : il ne cherchait que `{type:"assistant", message:{model:...}}`. Copilot avait contesté que ce format correspondait au transcript réel. Après vérification directe sur le vrai fichier JSONL, le format est confirmé correct — mais pour la robustesse, le parser accepte maintenant aussi :
- `{type:"assistant.message", data:{message:{model:...}}}`
- `{role:"assistant", model:...}` (au niveau root ou data)

Fonction `assistant_like()` et `candidates()` en python3 inline — testent tous les chemins connus.

**2. Cache modèle scoppé par session** (`hooks/routing-check.sh` + `hooks/session-model.sh`)

Problème : `/tmp/claude-atelier-current-model` était un singleton global. Avec 2 sessions ouvertes, last-writer-wins → un `/model sonnet` dans une session polluait l'autre.

Fix : cache dans `/tmp/claude-atelier-model-cache/<scope>.model` où scope = `session_id` (prioritaire) ou `cksum(transcript_path)` ou `global` (fallback). Legacy `/tmp/claude-atelier-current-model` toujours écrit pour compatibilité, lu uniquement si scope = global et aucun cache scoppé trouvé.

**3. Ollama status remonté dans l'entête** (`hooks/routing-check.sh`)

Le bloc `[OLLAMA]` était en fin de sortie, après les détections de stack. Remonté juste après `[HORODATAGE]` et avant `[SWITCH-MODE]` pour meilleure visibilité.

**4. Fix proxy thinking mode** (`scripts/ollama-proxy/main.go` — +28/-8 lignes)

qwen3.5:4b mettait sa réponse dans `thinking` au lieu de `content`. Fix : `think: false` dans la requête + fallback `thinking→content` si content vide.

**5. Seuil §25 calibré** (`scripts/handoff-debt.sh`)

Seuil commits 12 → 15 pour éviter la boucle de dette auto-alimentée par les commits chore post-intégration.

### Question précise

1. Le parser multi-schéma transcript (`assistant_like()` + `candidates()`) est-il trop permissif ? Risque-t-il de matcher des entrées qui ne sont pas des réponses assistant et d'extraire un faux modèle ?

2. Le scoping du cache par `session_id` est-il fiable ? Le `session_id` est extrait du JSON stdin de chaque hook — est-il garanti stable pour toute la durée d'une session Claude Code ?

3. Le fallback `thinking→content` dans le proxy Go est-il correct ? Si `think: false` est respecté par Ollama, `thinking` devrait être vide — le fallback ne sert que si le modèle ignore `think: false`. Est-ce un risque ?

4. Le seuil commits à 15 est-il toujours trop bas ou trop haut ? Le vrai levier n'est-il pas plutôt la qualité des `reviewedRange` dans les handoffs ?

### Fichiers à lire

```
hooks/routing-check.sh                # lignes 47-175 — nouveau flow multi-schéma + cache scoppé
hooks/session-model.sh                # lignes 17-49 — scope cache par session
test/hooks.js                         # lignes 225-340 — 5 nouveaux tests (multi-schéma, cache, Ollama)
scripts/ollama-proxy/main.go          # fonction translateResponse — fallback thinking→content
scripts/handoff-debt.sh               # ligne 29 — seuil 15
```

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne
- Le streaming (Phase 3) est hors scope pour cette review
- Se concentrer sur la robustesse du parsing transcript et du scoping cache

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
1. Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, section `## Réponse de : Copilot/GPT`.
2. Tu ne dois PAS répondre dans le chat, ni dans un autre fichier.
3. **INTERDIT DE MODIFIER DU CODE SOURCE.** Tu es reviewer, pas développeur. Ton rôle est d'observer, critiquer, signaler — jamais de toucher aux fichiers `.js`, `.ts`, `.json`, `.sh`, `.md` hors de ce handoff. Si tu vois un bug, décris-le. Ne le corrige pas.
4. **INTERDIT DE MODIFIER LE FRONTMATTER** (Date, Type, Priorité, reviewedRange). Ces champs sont ancrés par Claude. Les changer casse la CI.
5. Quand tu as fini, dis : "J'ai répondu dans docs/handoffs/2026-04-18-routing-cache-scope-review.md"

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
