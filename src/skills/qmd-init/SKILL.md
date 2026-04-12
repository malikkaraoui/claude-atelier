---
name: qmd-init
description: "Installe et configure QMD (moteur de recherche markdown local). Proposé automatiquement par /atelier-setup si le projet contient >= 5 fichiers .md."
---

# QMD Init

Tu installes QMD dans le projet courant pour indexer les fichiers
markdown (plans, bug reports, handoffs, reviews, specs).

## Quand proposer

- Le projet contient ≥ 5 fichiers `.md`
- L'utilisateur travaille avec des handoffs inter-LLM (docs/handoffs/)
- Pipeline Claude ↔ Copilot actif (les fichiers s'accumulent vite)
- Projet BMAD en cours (beaucoup d'artefacts .md)

## Procédure

### Étape 1 — Vérifier les prérequis

```bash
node --version   # doit être >= 22
```

### Étape 2 — Installer QMD

```bash
npm install -g @tobilu/qmd
qmd --version
```

### Étape 3 — Créer la collection

```bash
qmd collection add . --name [nom-projet] --mask "**/*.md"
qmd context add qmd://[nom-projet] "Plans, specs, handoffs, reviews, bug reports"
```

### Étape 4 — Indexer

```bash
qmd embed
qmd status
```

### Étape 5 — Configurer le MCP

Ajouter dans `.claude/settings.json` :

```json
{
  "mcpServers": {
    "qmd": {
      "command": "qmd",
      "args": ["mcp"]
    }
  }
}
```

Mettre à jour §0 de CLAUDE.md : `MCPs actifs | qmd`.

### Étape 6 — Test

```bash
qmd query "test" --files -n 3
```

Si des résultats → QMD fonctionne.

"QMD installé et indexé. [N] fichiers markdown indexés.
Pour chercher : `qmd query 'ton sujet' --files`
Guide complet : docs/qmd-user-guide.md"

## Règles

- Ne proposer que si ≥ 5 fichiers .md dans le projet
- Ne pas forcer l'installation
- Guide complet → `docs/qmd-user-guide.md` (déjà dans le repo)
- Voir aussi `src/fr/ecosystem/qmd-integration.md` pour les règles
  d'utilisation par Claude
