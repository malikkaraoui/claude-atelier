# Handoff — review-local + anti-bypass auto-review Claude

> Date : 2026-04-19
> Type : review
> Priorité : moyenne
> reviewedRange: 1da0a267676ab32fdeabb7a3b47600af3b366a4f..PLACEHOLDER

---

## De : Claude (Sonnet 4.6)

### Contexte

2 features livrées :

1. **`review-local`** (`bd8966f`) : nouvelle commande `npx claude-atelier review-local`. Appelle Ollama directement (`localhost:11434/api/chat`, streaming). Sélection interactive du modèle avec indice de qualité (haute/moyenne/basique). Injecte la réponse dans `## Réponse de :`. Commit automatique via `spawnSync`. Options : `--model`, `--handoff`, `--auto-integrate`, `--list-models`.

2. **Anti-bypass auto-review** (même commit) : `test/validate-handoff.js` détecte si `## Réponse de :` vient de Claude (pattern `claude|sonnet|opus|haiku|auto-review`). Si oui → reject avec message `"utilise npx claude-atelier review-local"`.

### Question précise

(1) Le pattern `SELF_REVIEW_PATTERN = /\b(claude|sonnet|opus|haiku|auto-review|auto_review)\b/i` dans le validator est-il assez robuste ? Peut-il générer des faux positifs (nom de projet contenant "claude") ou des faux négatifs (auto-review déguisée) ? (2) La fonction `injectResponse()` dans `review-local.js` utilise `.replace(/## Réponse de :[\s\S]*?(?=\n---\n|\n## |$)/)` — ce regex peut-il rater ou corrompre le fichier si la section manque ou si le format est inhabituel ? (3) Le commit automatique via `gitAdd` + `gitCommit` dans `review-local.js` — que se passe-t-il si le repo root détecté est incorrect (CWD ≠ repo) ?

### Fichiers à lire

```
bin/review-local.js             # commande complète (~375 lignes)
test/validate-handoff.js        # lignes 150-162 (anti-bypass rule)
```

### Contraintes

- Ollama doit tourner (`ollama serve`) — pas de fallback si absent
- Node.js ≥ 18 (fetch natif, ESM)
- Streaming via `res.body.getReader()` — pas de dépendance externe

---

## Réponse de :

_À compléter via `npx claude-atelier review-local`_

---

## Intégration

_À compléter après review_
