# Handoff — Review : auto-métriques modèle + switch tmux + plan V2 socket

> Date : 2026-04-15
> Type : review
> Priorité : haute
> reviewedRange: d4bcacb..e9e7e8b

---

## De : Claude (Sonnet 4.6)

### Contexte

Depuis le dernier handoff intégré, 5 commits ont été livrés sur la feature **model routing automatique** :

1. `02b4c12` **feat(metrics)** — `hooks/model-metrics.sh` (nouveau hook, 155 lignes) : analyse les 5 derniers tours assistant dans le transcript JSONL, calcule une complexité (high/medium/low), émet `[METRICS] fit:VERDICT | model:MODEL | ... PASTILLE` à chaque `UserPromptSubmit`.
2. `3caff01` **docs** — intégration du plan Copilot dynamic-model-switching : 5 décisions validées, angle mort whitelist identifié.
3. `9b3a95e` **docs** — handoff review dynamic-model-switching-impl (rempli par Copilot, section Intégration en attente).
4. `312b335` **fix(switch-model)** — `scripts/switch_model.py` : suppression de la branche osascript (non fonctionnelle dans le plugin VS Code), guard tmux renforcé, INFO explicite pour VS Code, nettoyage permissions settings.json.
5. `e9e7e8b` **feat(metrics)** — pastilles 🟢/🟠/🔴 remplacées par flèches ⬆️/⬇️/= (UX clarté), `HOOK_SESSION_ID` ajouté dans `hooks/_parse-input.sh`, plan V2 socket créé (`docs/handoffs/2026-04-15-v2-plugin-socket-actionneur-plan.md`), sync manifest + tests 34/34 OK.

État courant des couches :

| Couche | Fichier | État |
|---|---|---|
| Capteur | `hooks/model-metrics.sh` | ✅ livré, testé |
| Actionneur CLI | `scripts/switch_model.py` | ✅ tmux-only, nettoyé |
| Actionneur plugin | V2 socket (claudec) | ⏳ plan validé, implémentation non démarrée |
| Parse hook | `hooks/_parse-input.sh` | ✅ HOOK_SESSION_ID ajouté |
| CLAUDE.md §1 | `.claude/CLAUDE.md` | ✅ mis à jour (flèches + auto-métriques) |

### Question précise

**Trois questions distinctes à traiter :**

**Q1 — model-metrics.sh : fiabilité de la classification**

La classification repose sur les noms d'outils utilisés dans les tours assistant. `Bash` est classé `medium` sans analyse du contenu. Est-ce que cette heuristique produit trop de faux positifs (Bash léger → signal medium au lieu de low) ? Quels cas de figure vont systématiquement mal classer ?

**Q2 — switch_model.py : guard tmux suffisant ?**

Le guard actuel vérifie `tmux` disponible + `TMUX` env var. Est-ce que ces deux conditions couvrent tous les cas d'échec silencieux (tmux sans session active, pane cible inexistant, `send-keys` sans écho) ? Y a-t-il un risque de faux succès (le script sort 0 mais le modèle n'a pas changé) ?

**Q3 — V2 socket plan : angle mort avant implémentation**

Le plan `2026-04-15-v2-plugin-socket-actionneur-plan.md` préconise `claudec` (claude-commander, tier externe) comme wrapper socket. Avant de l'implémenter dans `switch_model.py` : est-ce qu'il manque une condition de fallback ou un contrat de validation suffisant pour que l'actionneur socket soit robuste sans introduire de régression sur la branche tmux existante ?

### Fichiers à lire

1. `hooks/model-metrics.sh` — capteur complet (155 lignes)
2. `scripts/switch_model.py` — actionneur (80 lignes)
3. `hooks/_parse-input.sh` — helper parse (59 lignes)
4. `docs/handoffs/2026-04-15-v2-plugin-socket-actionneur-plan.md` — plan V2 socket (340 lignes)
5. `.claude/CLAUDE.md` §1 et §15 — contrat runtime métriques
6. `test/hooks.js` — 34 tests, assertions flèches

### Contraintes / hors scope

- Ne pas proposer de réécrire model-metrics.sh en Python complet — le shell wrapper + heredoc Python fonctionne, c'est voulu
- Ne pas remettre en cause le choix tmux comme fallback — c'est le seul actionneur confirmé en prod aujourd'hui
- Se concentrer sur ce qui est fragile ou manquant, pas sur le style

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
