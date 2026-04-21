---
name: review-copilot
description: "Génère un handoff review structuré pour Copilot/GPT. Utiliser après une feature, un bug fix, ou quand > 100 lignes ont changé. Aussi déclenché automatiquement par §25."
figure: Mohamed
---

# Review Copilot

> Mohamed 📋 passe en arrière-salle, relit les commits un par un,
> compte les lignes, formule la question précise — et dépose le dossier
> sur le bureau de Copilot sans un mot de trop.
>
> *"Un code non challengé n'est pas fini. C'est une bombe à retardement."*

Handoff structuré pour Copilot/GPT, créé dans `docs/handoffs/` au format `.json`.
Le JSON est lisible par Copilot PR review ET par GPT/Mistral — pas le markdown.

## Procédure

### Étape 1 — Collecter le contexte

Exécute silencieusement :

```bash
# Stats depuis le dernier handoff (ou les 20 derniers commits)
git log --oneline -20
git diff --stat HEAD~10 2>/dev/null || git diff --stat HEAD~5
ls -lt docs/handoffs/*.json 2>/dev/null | grep -v _template | head -1
```

### Étape 2 — Demander le sujet

"Quel est le sujet de cette review ?
1. Review générale (tout ce qui a changé récemment)
2. Feature spécifique : [laquelle ?]
3. Bug fix : [lequel ?]
4. Architecture / décision technique"

### Étape 3 — Générer le handoff JSON

**reviewedRange** : utiliser des SHA complets (`git rev-parse`). `sha-from` = dernier handoff OU `HEAD~N` résolu. `sha-to` = `HEAD` au moment du commit du handoff. Jamais de brouillon, jamais de `..HEAD (uncommitted)`.

Créer le fichier `docs/handoffs/YYYY-MM-DD-<sujet-slug>.json` :

```json
{
  "meta": {
    "subject": "[sujet]",
    "date": "YYYY-MM-DD",
    "type": "review",
    "priority": "[haute si bug fix critique, moyenne sinon]",
    "reviewedRange": "[sha-from]..[sha-to]"
  },
  "from": {
    "model": "claude-sonnet-4-6",
    "context": "[résumé de ce qui a été fait, basé sur les commits récents]",
    "question": "[UNE question précise formulée selon le choix de l'étape 2]",
    "filesToRead": [
      "[les fichiers les plus modifiés, max 10]"
    ],
    "constraints": [
      "Ne pas proposer de réécrire ce qui fonctionne",
      "Se concentrer sur ce qui manque ou est fragile",
      "INTERDIT de modifier du code source — tu es reviewer, pas développeur",
      "INTERDIT de modifier meta ou from — ces champs sont ancrés par Claude"
    ]
  },
  "response": {
    "model": null,
    "content": null,
    "_instruction": "Écrire la réponse dans le champ 'content'. Ne pas modifier 'meta' ni 'from'. Utiliser l'outil d'édition de fichier. Quand terminé, dire : \"J'ai répondu dans [chemin du fichier].\""
  },
  "integration": null
}
```

### Étape 4 — Générer le prompt copier-coller

Afficher à l'utilisateur :

"Handoff créé : `docs/handoffs/[fichier].json`

**Copie ce prompt dans Copilot / GPT ↓**

---
Contexte : [valeur de from.context]

Question : [valeur de from.question]

Fichiers à lire : [valeur de from.filesToRead]

Contraintes : [valeur de from.constraints]

Réponds dans le champ `response.content` du fichier `[chemin]`.
---

Quand Copilot/GPT répond (dans le fichier), dis-moi et je remplirai `integration`."

### Étape 5 — Committer le handoff

```bash
git add docs/handoffs/[fichier].json
git commit -m "docs: handoff review [sujet]"
```

## Règles

- Format `.json` obligatoire — le markdown n'est pas reviewé par Copilot PR review
- Un handoff par review (pas de méga-fichier)
- Le prompt copier-coller doit être **complet et autonome**
- Inclure les fichiers à lire (le LLM cible en a besoin pour le contexte)
- Committer le handoff (traçabilité)
