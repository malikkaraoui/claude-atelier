# Handoff — V2 switch modèle VS Code : plan invalidé, quelle alternative ?

> Date : 2026-04-15
> Type : architecture / décision technique
> Priorité : haute (bloque la roadmap V2)
> reviewedRange: c281580..2fbc948

---

## De : Claude (Sonnet 4.6)

### Contexte

Le plan V2 de `switch_model.py` reposait sur l'hypothèse qu'on pouvait switcher
le modèle d'une session Claude Code en cours via un socket Unix exposé par `claudec`.

**Deux tests concrets effectués aujourd'hui ont invalidé ce plan :**

**Test 1 — Socket claudec**
```bash
ls /tmp/claudec-*.sock
# → no matches found
```
claudec ne crée pas de socket Unix. L'hypothèse initiale était fausse.

**Test 2 — `claude config set model`**
```bash
claude config get model
# → lance claudec en mode interactif (pas une commande shell)
```
`claude config` n'est pas disponible comme commande shell dans ce contexte.
Claude à l'intérieur de claudec a confirmé : le CLI n'est pas disponible
directement, le modèle est lu depuis un settings file (ligne 60 de la config).

**Conclusion actuelle :**

| Approche | Status | Raison |
|---|---|---|
| Unix socket claudec | ❌ | Pas de socket créé |
| `claude config set model` shell | ❌ | Lance claudec interactif, pas CLI |
| Édition `~/.claude/settings.json` | ⚠️ | Nouvelles sessions seulement |
| tmux send-keys `/model X` | ✅ | Fonctionne en terminal uniquement |
| VS Code API pour switcher Claude | ❓ | Non exploré |

L'édition directe de settings.json ne résout pas le problème : elle n'affecte
que les nouvelles sessions, pas la session VS Code en cours. Inutile pour le
cas d'usage réel (routing dynamique en cours de session).

### Question précise

**Y a-t-il une approche viable pour changer le modèle d'une session Claude Code
VS Code en cours, de manière programmatique ?**

Sous-questions :

1. **Extension VS Code** : l'extension Claude Code VS Code expose-t-elle une API,
   un event bus, ou un IPC permettant d'envoyer des commandes à la session active ?
   (ex: VS Code `postMessage`, `WorkspaceState`, commandes enregistrées via
   `vscode.commands.registerCommand`)

2. **Settings.json hot-reload** : est-ce que Claude Code relit `settings.json` à
   chaque message (hot-reload), ou seulement au démarrage ? Si hot-reload →
   éditer le fichier depuis `switch_model.py` devient viable.

3. **Transcript injection** : est-il possible d'injecter un pseudo-message
   système dans le transcript JSONL pour déclencher un changement de modèle ?
   (risqué — mais théoriquement possible si Claude Code relit le transcript)

4. **Alternative radicale** : renoncer au switch en cours de session pour VS Code.
   Mode M = seul comportement fiable (proposition → l'utilisateur tape `/model X`).
   Est-ce acceptable comme contrat long terme, ou doit-on trouver une solution ?

### Fichiers à lire

```text
scripts/switch_model.py
hooks/routing-check.sh
docs/handoffs/2026-04-15-v2-plugin-socket-actionneur-plan.md
```

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne (tmux mode A reste valide)
- Se concentrer sur ce qui est réellement faisable, pas théorique
- Le socket claudec est définitivement exclu (testé, pas de socket)
- `claude config set model` shell est exclu (testé, lance claudec interactif)

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
