# Archive — Marketplace inter-agents

> Archivé 2026-06-25. Concept non livré, extrait pour projet dédié futur.

## Intent

Marketplace de crédits inter-agents : chaque agent (architecte, reviewer, code…)
accumule des crédits selon la qualité de ses contributions. Un ledger JSON maintient
l'état. Les features de l'atelier peuvent être "offertes" ou "pénalisées" selon le
comportement des agents.

## Fichiers archivés

- `marketplace.js` — module pulse : état, ledger, sweep, feature offers
- `pulse-marketplace-watch.js` — daemon standalone de surveillance (loop)
- `marketplace-inter-agents.md` — spec fonctionnelle initiale
- `marketplace-poc-handoff-v0.md` — POC handoff v0
- `marketplace-premier-marche.md` — premier marché (use cases)

## Pourquoi archivé

Couplé au daemon Telegram/Maestro (supprimé). Non essentiel au cœur atelier.
Candidat naturel pour un package `claude-marketplace` séparé.

## Pour reprendre

1. Nouveau repo `claude-marketplace`
2. Partir de `marketplace.js` comme noyau
3. Découpler de pulse/maestro — interface propre via events ou MCP tool
