# Brief projet

> Géré par Peter via claude-atelier vault. Markdown vivant, pas document gravé.

## État court

- Projet : claude-atelier (framework Claude Code)
- Phase : Phase 2 — v0.23.5 livrée (Phase B vault : index incrémental Peter) · next: Phase C graphe minimal
- Objectif courant : Phase C — vault/index/graph.json + vault query + nœuds centraux dans PETER_REPORT
- Prochaine action utile : Démarrer Phase C (graph.json — nœuds fichiers/docs/décisions, relations extraites Markdown)

## À lire en priorité

- docs/proposals/peter-vault-graphify-plus-plan.md — plan complet Peter
- .claude/CLAUDE.md §0 — contexte session courant
- vault/40-roadmap.md — prochaines phases Peter

## Décisions actives

- Stack Node.js pour hooks/scripts, Go uniquement pour ollama-proxy
- Peter = couche mémoire vivante (pas archive statique)
- Vault local-first, pas de cloud obligatoire
- Pre-push gate obligatoire avant tout push

## Risques / angles morts

- proxy tool_use mapping Go encore incomplet (bloquant pour Ollama bidirectionnel)
- Cache mtime Phase B : faux-négatifs possibles en cas d'écriture programmatique très rapide (< 1ms) — différé Phase C
- MCPs actifs (qmd + github) consomment fenêtre contexte (~70k)
