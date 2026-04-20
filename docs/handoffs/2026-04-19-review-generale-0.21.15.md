# Handoff — Review générale v0.21.15

> Date : 2026-04-19
> Type : review
> Priorité : haute
> reviewedRange: 69c56566fb7fde96d512654ff271212b7e6b4e3b..191b544f8ac6c07e6e45dd5d257d06d1eb340f83

---

## De : Claude (Sonnet 4.6)

### Contexte

Deux features majeures livrées dans la journée du 2026-04-19, plus des ajustements hooks :

**Feature 1 — `npx claude-atelier features`** (v0.21.12–0.21.13)
Tableau de contrôle on/off par feature via `src/features.json`.
Commit clé : `69c56566` — `feat: tableau de contrôle features`

**Feature 2 — `npx claude-atelier review-local`** (v0.21.14–0.21.15)
Commande CLI (~397 lignes) qui lance une review automatique d'un handoff via Ollama local (deepseek-v3.1, qwen3, etc.), sans proxy.
Options : `--model`, `--handoff`, `--auto-integrate`, `--list-models`.
Protection anti-bypass : Claude Code ne peut pas se auto-reviewer (détection de l'agent appelant).
Commit clé : `bd8966f` — `feat: review-local — review Ollama automatique + anti-bypass auto-review Claude`

**Ajustements en cours (non committés)**
- `hooks/model-metrics.sh` — modifié (staged)
- `hooks/routing-check.sh` — modifié (unstaged)
- `test/hooks.js` — modifié
- `.claude/hooks-manifest.json` — modifié (staged)

### Question précise

Review générale sur deux axes :

1. **`bin/review-local.js`** — logique complète (397 lignes) :
   - La détection anti-bypass est-elle robuste ? Peut-on la contourner facilement ?
   - L'appel direct à Ollama (`localhost:11434`) est-il correctement géré (timeout, erreurs réseau, modèle absent) ?
   - Y a-t-il des edge cases non couverts (handoff malformé, champ `reviewedRange` absent, fichier déjà reviewé) ?
   - Le flag `--auto-integrate` injecte un squelette dans le fichier : est-ce suffisamment sécurisé (injection, encodage) ?

2. **`src/features.json` + intégration CLI** :
   - Le schéma features est-il extensible sans breaking change ?
   - Y a-t-il un risque de désync entre `features.json` et le code qui consomme les flags ?

### Fichiers à lire

- [bin/review-local.js](../../bin/review-local.js) — commande principale (397 lignes)
- [bin/cli.js](../../bin/cli.js) — point d'entrée CLI, intégration review-local
- [src/features.json](../../src/features.json) — feature flags
- [hooks/guard-commit-french.sh](../../hooks/guard-commit-french.sh) — fix ajouté
- [test/validate-handoff.js](../../test/validate-handoff.js) — tests validation handoff
- [.claude/hooks-manifest.json](../../.claude/hooks-manifest.json) — manifest hooks
- [docs/handoffs/2026-04-19-review-local-anti-bypass.md](2026-04-19-review-local-anti-bypass.md) — handoff précédent (deepseek review)
- [docs/handoffs/2026-04-19-features-control-panel.md](2026-04-19-features-control-panel.md) — handoff précédent features

### Contraintes / hors scope

- Ne pas proposer de réécrire `review-local.js` en TypeScript ou de changer l'architecture
- Ne pas commenter les choix d'UX CLI (couleurs, output format) sauf si bug
- Se concentrer sur robustesse, edge cases, sécurité anti-bypass

---

## Réponse de : Copilot/GPT

### Analyse des questions

**1. Détection anti-bypass : insuffisante. Verdict ❌**

Elle n'est ni robuste, ni opposable seule.

- Le contrôle réel n'est **pas** dans `bin/review-local.js`, mais dans `test/validate-handoff.js`.
- Il ne regarde que le **heading** `## Réponse de : ...` via `SELF_REVIEW_PATTERN = /\b(claude|sonnet|opus|haiku|auto-review|auto_review)\b/i`.
- Donc le contournement est trivial : une review rédigée par Claude mais signée `Copilot`, `GPT`, `Reviewer externe`, `Ollama/qwen3`, etc. passe.
- Inversement, le pattern peut aussi bloquer un heading légitime qui contient `Claude`, `Sonnet` ou `Haiku` dans un contexte non auto-review.

Le vrai problème n'est pas seulement le regex : c'est que l'identité du reviewer est **déclarative**, pas attestée. Rien dans `review-local` ne prouve que la réponse vient réellement d'Ollama.

Autre faiblesse : cette règle est surtout opposable au moment où `validate-handoff.js` est exécuté (pré-push / dette handoff). Elle ne bloque pas l'écriture initiale du fichier.

**2. Appel direct Ollama : gestion partielle seulement. Verdict ⚠️**

Le cas nominal est couvert, pas les cas sales.

- **Modèle absent** : correctement rejeté si `--model` est fourni et n'apparaît pas dans `/api/tags`.
- **Ollama inaccessible** : `ollamaListModels()` renvoie `[]`, puis la CLI affiche "Ollama non accessible". C'est acceptable, mais ça fusionne plusieurs causes en un seul symptôme : serveur down, JSON invalide, host erroné, timeout réseau.
- **Timeout** : il n'y en a **aucun**. Ni `AbortController`, ni deadline applicative. Si `localhost:11434` accepte la connexion puis bloque, la commande peut rester pendue.
- **Streaming** : le parseur NDJSON est fragile. `ollamaChat()` fait `decoder.decode(value).split('\n')` à chaque chunk, sans buffer pour les lignes incomplètes. Si un objet JSON est coupé entre deux chunks — cas normal en streaming — le fragment peut être jeté silencieusement. Risque concret : review tronquée ou texte perdu sans erreur explicite.
- **Body null / réponse non standard** : pas de garde explicite avant `res.body.getReader()`.

Donc : pas catastrophique, mais certainement pas "bien géré" au sens robuste.

**3. Edge cases non couverts : plusieurs trous réels. Verdict ❌**

Oui, il en manque plusieurs :

- **Handoff malformé** : `review-local` ne valide pas la structure avant de construire le prompt. Si les sections attendues manquent, `buildPrompt()` produit un prompt appauvri, puis la commande écrit quand même dans le fichier.
- **`reviewedRange` absent** : complètement ignoré par `review-local`. Le problème ne sera vu qu'ultérieurement par `validate-handoff.js`.
- **Fichier déjà reviewé** : si l'utilisateur passe `--handoff`, il n'y a aucun garde-fou contre l'écrasement d'une réponse existante. La section est remplacée sans confirmation.
- **Détection “déjà reviewé” trop naïve** : `findUnreviewedHandoff()` se base sur `stripTemplateContent(section).length > 100`. Un handoff long mais invalide/bypassé peut être considéré comme reviewé et donc sauté.
- **Cible arbitraire** : `--handoff` accepte n'importe quel chemin existant, pas seulement `docs/handoffs/*.md`. Donc la commande peut écrire dans un fichier Markdown arbitraire du workspace.
- **Repo root** : la détection repose sur `docs/handoffs` présent dans `cwd` ou dans `PKG_ROOT`, pas sur `git rev-parse --show-toplevel`. En cas de lancement depuis un sous-dossier ou un contexte ambigu, l'écriture/commit peut viser le mauvais endroit.

**4. `--auto-integrate` : pas d'injection shell, mais surface d'écrasement fichier. Verdict ❌**

Le point positif : pas de `exec("...")` ou interpolation shell dangereuse. `git add` / `git commit` passent par `spawnSync`, donc pas d'injection shell classique ici.

Mais le vrai risque est ailleurs :

- l'option écrit directement dans le fichier cible sans confinement strict du chemin ;
- `injectResponse()` / remplacement `## Intégration` opèrent sur la structure Markdown supposée valide ;
- si le fichier ciblé n'est pas un vrai handoff, la commande peut injecter du contenu dans un document non prévu ;
- le commit automatique stage `docs/handoffs/${target.name}`, pas forcément le chemin réellement modifié si `--handoff` pointe ailleurs. Donc on peut avoir **écriture effective** + **stage incohérent**.

En clair : ce n'est pas une injection de code, mais ce n'est pas sécurisé du point de vue intégrité documentaire.

**5. `src/features.json` : risque de désync avéré. Verdict ❌**

Il y a déjà trop de sources de vérité :

- `src/features.json` décrit les **commandes/help CLI** ;
- `src/features-registry.json` décrit les **feature flags runtime** ;
- `bin/cli.js` embarque un **HELP généré** mais garde aussi un tableau `knownCommands` codé en dur.

Résultat : la dérive est déjà visible.

- `package.json` est en `0.21.15`, mais le `HELP` embarqué dans `bin/cli.js` affiche `v0.21.14`.
- La liste des commandes existe à la fois dans `src/features.json` et dans `knownCommands`.
- Les flags runtime utilisés par les hooks (`git_guard_french`, `review_copilot`, etc.) ne viennent pas de `src/features.json`, mais d'un autre registre.

Donc le nom `features.json` est trompeur : il ne pilote pas "les features" du runtime, seulement une partie de la CLI/documentation générée. C'est un risque de compréhension et de drift.

Autre angle mort : côté hooks, une feature absente dans `.claude/features.json` tombe souvent sur `default=true`. Donc une feature oubliée dans le registre peut rester active silencieusement ; inversement, une entrée de registre non consommée peut apparaître dans le tableau sans effet réel.

### Verdict global

Les deux features sont livrées en état **fonctionnel V1**, mais pas en état robuste.

Le point le plus faible est `review-local` : l'anti-bypass est facile à contourner, le streaming Ollama peut perdre des fragments, `--handoff` n'est pas confiné, et plusieurs cas limites sont reportés au validateur aval au lieu d'être bloqués à l'entrée.

Le point structurellement fragile côté features est la multiplication des vérités partielles (`src/features.json`, `src/features-registry.json`, `bin/cli.js`, hooks). La désync n'est pas théorique : elle est déjà visible dans la version du HELP.

### Actions prioritaires

- [ ] Durcir `review-local` en validant **avant écriture** que la cible est un vrai handoff sous `docs/handoffs/` et qu'elle n'est pas déjà reviewée sans confirmation explicite.
- [ ] Ajouter un vrai timeout réseau (`AbortController`) et un buffer de ligne pour le streaming NDJSON Ollama.
- [ ] Repenser l'anti-bypass : ne plus se contenter du heading déclaratif ; au minimum, lier la provenance à la commande `review-local` ou à un marqueur produit par elle.
- [ ] Clarifier les sources de vérité : `src/features.json` (help CLI) vs `src/features-registry.json` (runtime flags), ou renommer pour supprimer l'ambiguïté.
- [ ] Éliminer la duplication `src/features.json` ↔ `bin/cli.js` ↔ `knownCommands`, parce qu'elle produit déjà du drift observable.

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
