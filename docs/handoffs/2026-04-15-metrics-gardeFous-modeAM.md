# Handoff — Métriques, garde-fous compaction, mode A/M

> Date : 2026-04-15
> Type : review
> Priorité : haute (infrastructure hooks critique)
> reviewedRange: c281580..d9ef381

---

## De : Claude (Sonnet 4.6)

### Contexte

Depuis le dernier handoff (`c281580`), 5 commits sur l'infrastructure de routing/métriques :

**`fix(routing)` — garde-fous compaction (2c12c67)**
Problème : après `/compact`, le transcript tronqué contenait un stale model qui corrompait le cache `/tmp/claude-atelier-current-model`. Claude affichait le mauvais modèle dans §1.
- Garde-fou #1 (`session-model.sh`) : si `source == "compact"` et pas de model live → supprimer le cache
- Garde-fou #2 (`routing-check.sh`) : le transcript ne peut JAMAIS écrire le cache — priorité `live > cache > transcript (lecture seule)`

**`feat(switch)` — P1 session_id + mode A/M (02c6e02)**
- `routing-check.sh` persiste `session_id` à chaque message → `/tmp/claude-atelier-current-session-id` (pré-requis V2 socket)
- Lecture de `/tmp/claude-atelier-switch-mode` → émet `[SWITCH-MODE] A|M` à chaque message
- `CLAUDE.md §1` : format `[DATE | MODEL] PASTILLE MODE`, comportement mode A (switch immédiat) vs mode M (propose + attente)

**`fix(switch-model)` — transparence (b479d19)**
- `switch_model.py` : message `[INJECTED]` au lieu de `[OK]` — pas de post-condition vérifiée
- Header `model-metrics.sh` : biais Bash→medium documenté

**`fix(metrics)` — pastille 🟢 (d9ef381)**
- `=` remplacé par `🟢` pour le cas "modèle optimal" — cohérence avec la convention couleur originale

### Question précise

**Review générale — fiabilité et robustesse des hooks de routing :**

1. **Garde-fou #1** (`session-model.sh`) : la suppression du cache sur `source == "compact"` est-elle sûre ? Y a-t-il un risque de supprimer le cache à tort (faux positif compact) ?

2. **Garde-fou #2** (`routing-check.sh`) : la règle "transcript ne peut jamais écrire le cache" est-elle suffisante ou faut-il aussi invalider le cache si la source passe de `live` à `cache` plusieurs messages de suite ?

3. **Mode A/M** : le mode A appelle `switch_model.py` qui injecte `/model X` dans un pane tmux. Aucune post-condition. Est-ce une régression UX vs mode M, ou est-ce acceptable en l'état ?

4. **session_id persist** (`/tmp/claude-atelier-current-session-id`) : utilisé comme pré-requis V2 socket. Le fichier est écrasé à chaque message — est-ce thread-safe si deux sessions sont ouvertes ?

### Fichiers à lire

1. `hooks/routing-check.sh` — priorité live > cache > transcript + session_id + SWITCH-MODE
2. `hooks/session-model.sh` — garde-fou #1 (invalidation cache au compact)
3. `hooks/_parse-input.sh` — parsing partagé, HOOK_SOURCE
4. `scripts/switch_model.py` — injection tmux, message [INJECTED]
5. `hooks/model-metrics.sh` — verdicts ⬆️/⬇️/🟢, biais Bash→medium
6. `test/hooks.js` — 36 tests, garde-fou #1 et #2 couverts

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne
- Se concentrer sur ce qui est fragile ou manquant
- Le socket V2 claudec est hors scope (non implémenté)

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, à la
suite du document existant, dans la section `## Réponse de : Copilot/GPT`.
Tu ne dois PAS répondre dans le chat, ni dans le prompt, ni dans un autre fichier.
Ce document est le vase communicant entre GPT et Claude. Utilise Edit/Write.
Quand tu as fini, dis : "J'ai répondu dans [chemin du fichier]."

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
