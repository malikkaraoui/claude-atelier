# Brief projet

> Géré par Peter via claude-atelier vault. Markdown vivant, pas document gravé.

## État court

- Projet : claude-atelier (framework Claude Code)
- Phase : Phase 2 — v0.23.0 livrée (Pulse & Maestro multi-agents) · next: proxy tool_use mapping
- Objectif courant : Faire avancer Peter vault (Phase B — index + cache + graphe minimal)
- Prochaine action utile : Implémenter `vault update` avec manifest.json + cache SHA256 (Phase B)

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
- Peter Phase B (cache/index) non démarrée — PETER_REPORT.md non persistant encore
- MCPs actifs (qmd + github) consomment fenêtre contexte (~70k)
