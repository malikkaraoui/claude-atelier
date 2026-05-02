# Décisions projet

> Géré par Peter via claude-atelier vault. Markdown vivant, pas document gravé.

## Décisions durables

### 2026-04-17 — Peter = agent mainteneur, pas dossier Markdown

- Contexte : risque de réduire Peter à un README enrichi sans valeur propre
- Décision : Peter doit avoir carte + graphe + mémoire vivante + tri inbox + stratégie de reprise
- Conséquence : implémentation incrémentale en 7 phases (A→G), Phase A livrée en v0.23.0
- À revalider si : scope trop lourd pour usage quotidien

### 2026-04-17 — Local-first, pas de cloud obligatoire pour le core

- Contexte : dépendances cloud bloquent l'usage offline et la confidentialité
- Décision : Peter core doit tourner sans service externe ; multimodal/cloud optionnel
- Conséquence : extraction via AST/regex local, cache SHA256 fichier, pas d'API IA obligatoire
- À revalider si : besoin de sémantique profonde sans GPU local

### 2026-03-15 — Pulse & Maestro multi-agents (v0.23.0)

- Contexte : orchestration multi-agents nécessite coordination et état partagé
- Décision : pouls.md comme registre de présence, Maestro §0 watcher pour supervision
- Conséquence : hooks Pulse + skill Maestro dans le framework, state visible en session
- À revalider si : trop de friction pour projets solo

### 2026-02-01 — Node.js pour hooks/scripts, Go pour proxy Ollama seulement

- Contexte : Go offre performance mais alourdit la maintenance pour les scripts quotidiens
- Décision : Node.js pour tout sauf l'ollama-proxy (performance réseau critique)
- Conséquence : stack cohérente, tests npm, pas de dualité Go/Node dans le repo principal
- À revalider si : besoin de perf critique hors proxy
