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
Le JSON est lu par **Copilot via la PR GitHub** — pas de copier-coller, pas de VS Code.
Flux : branche `handoff/` → commit JSON → push → `gh pr create` → Copilot review PR → `/integrate-review`.

## Procédure

### Étape 1 — Collecter le contexte

Exécute silencieusement :

```bash
# Stats depuis le dernier handoff
git log --oneline -20
git diff --stat HEAD~10 2>/dev/null || git diff --stat HEAD~5
ls -lt docs/handoffs/*.json 2>/dev/null | grep -v _template | head -1
# SHA complets
git rev-parse HEAD
```

Infère automatiquement le sujet depuis les commits récents (feat/fix dominants).
**Ne pas demander le sujet à l'utilisateur — déduire depuis git log.**

### Étape 2 — Créer la branche handoff

```bash
SLUG="<sujet-slug-depuis-commits>"   # ex: atelier-config-features-agents
BRANCH="handoff/$(date +%Y-%m-%d)-${SLUG}"
git checkout -b "$BRANCH"
```

### Étape 3 — Générer le handoff JSON

**reviewedRange** : `sha-from` = SHA du dernier handoff intégré (résolu via `git rev-parse`). `sha-to` = HEAD courant. Jamais de `..HEAD (uncommitted)`.

Créer `docs/handoffs/YYYY-MM-DD-<sujet-slug>.json` :

```json
{
  "meta": {
    "subject": "[sujet inféré depuis git log]",
    "date": "YYYY-MM-DD",
    "type": "review",
    "priority": "[haute si bug fix critique, moyenne sinon]",
    "reviewedRange": "[sha-from]..[sha-to]"
  },
  "from": {
    "model": "claude-sonnet-4-6",
    "context": "[résumé de ce qui a été fait, basé sur les commits récents]",
    "question": "[UNE question précise sur ce qui est fragile ou manquant]",
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

### Étape 4 — Committer + pousser la branche + créer la PR

La gate §25 est bypassée sur les branches feature/handoff — pas de deadlock.

```bash
git add docs/handoffs/[fichier].json
git commit -m "docs: handoff review [sujet]"
git push -u origin "$BRANCH"

# Créer la PR — Copilot la reviewera automatiquement
gh pr create \
  --title "handoff: review [sujet]" \
  --body "$(cat <<'EOF'
## Handoff review — [sujet]

Copilot : lis `docs/handoffs/[fichier].json` et réponds dans `response.content`.

**Question :** [valeur de from.question]

**Fichiers clés :** [valeur de from.filesToRead]

**Contraintes :** reviewer uniquement, pas de modification de code ni de meta/from.
EOF
)"
```

### Étape 5 — Annoncer et attendre

Afficher à l'utilisateur :
"PR créée : [URL]. Copilot va reviewer le JSON dans la PR. Quand Copilot répond, lance `/integrate-review`."

**Ne pas afficher de prompt copier-coller. Copilot lit directement la PR GitHub.**

## Règles

- Format `.json` obligatoire — le markdown n'est pas reviewé par Copilot PR review
- Toujours passer par une branche `handoff/YYYY-MM-DD-slug` — jamais commit direct sur main
- Un handoff par review (pas de méga-fichier)
- La PR doit mentionner le fichier JSON et la question dans le body
- Committer le handoff avant de créer la PR (Copilot a besoin du fichier dans le diff)
