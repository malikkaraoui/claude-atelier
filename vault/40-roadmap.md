# Roadmap vivante

> Géré par Peter via claude-atelier vault. Markdown vivant, pas document gravé.

## Roadmap vivante

### Livré

- ✅ Telegram bridge Phase A — service Python, sessions SQLite, CLI npx (PR #47)
- ✅ Telegram bridge Phase B — voix faster-whisper + Ollama polish + 6 fixes robustesse (PR #49)

### Sur le feu

- **Bump version** (post-Phase B)
- **Telegram Phase C** — FIFO hardening : hook PostToolUse → alertes commit/push/gate en temps réel
- Peter Phase C — graphe minimal : graph.json + `vault query` + nœuds centraux PETER_REPORT
- proxy tool_use mapping Go (ollama-proxy bidirectionnel)

### Ensuite

- Telegram Phase D — vault inbox + lifecycle CLI
- Peter Phase C — graphe minimal : graph.json + `vault query` + `vault path` + `vault explain`
- Enrichissement PETER_REPORT.md avec nœuds centraux (god nodes)
- Peter Phase D — `vault add` + `vault route` + inbox intelligente

### Idées à challenger

- MCP Peter natif (`vault mcp` — tools query_vault, get_node, neighbors)
- Export Obsidian (`vault export --obsidian`)
- Visualisation D3/vis.js locale (`vault export --html`)
- Multimodal : URL fetch, transcripts, Apple Notes import

### Parking

- Peter Phase F — Apple Notes / captures / vocaux (dépendances lourdes)
- Peter Phase G — MCP Peter complet
- MIRROR global multi-projets (futur lointain)
