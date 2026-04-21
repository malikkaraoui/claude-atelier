---
name: atelier-config
description: "Tableau de contrôle des features claude-atelier (on/off, paramètres). Affiche l'état de chaque rail et permet de les activer/désactiver."
figure: Régie
---

# Atelier Config — Tableau de contrôle

> La régie. Tous les rails sous les yeux. On allume, on éteint, on règle.

## Procédure

1. Lance `npx claude-atelier features` (ou `node bin/cli.js features` dans le repo source) et affiche le résultat.
2. Présente le tableau de bord avec l'état actuel de chaque feature (ON ✅ / OFF ❌).
3. Si l'utilisateur veut modifier un paramètre → exécute la commande correspondante.
4. Confirme le changement et rappelle que **Claude Code doit être relancé pour l'appliquer**.

## Commandes disponibles

```bash
# Afficher le tableau complet
npx claude-atelier features

# Activer / désactiver une feature
npx claude-atelier features --on  <feature>
npx claude-atelier features --off <feature>
npx claude-atelier features --toggle <feature>

# Cibler la config globale (~/.claude/features.json)
npx claude-atelier features --global

# Restaurer tous les défauts
npx claude-atelier features --reset
```

## Features disponibles

| ID | Groupe | Description |
|---|---|---|
| `header` | Runtime | En-tête §1 cockpit à chaque réponse |
| `ollama_status` | Runtime | Statut Ollama + proxy à chaque message |
| `model_routing_hints` | Runtime | Suggestions Haiku (exploration) / alerte Opus (tâche courte) |
| `session_length_warning` | Runtime | Alerte contexte > 300KB / 600KB |
| `review_copilot` | Qualité | Handoff §25 auto (feat terminée, 100+ lignes) |
| `stack_detection` | Qualité | Agent nommé selon stack détectée (Steve, Gaëlle…) |
| `design_detection` | Qualité | Propose Séréna si besoin UI/UX/design |
| `diagnostic` | Qualité | Vérification QMD / §0 / gate toutes les 30 min |
| `anti_loop` | Qualité | Bloque après 3 tentatives identiques consécutives |
| `git_guard_sign` | Guards Git | Bloque commits signés (Co-Authored-By) |
| `git_guard_french` | Guards Git | Messages de commit en français obligatoires |
| `git_guard_tests` | Guards Git | npm test doit passer avant git push |
| `skill_bmad` | Skills & Outils | Cycle complet analyse→plan→archi→implem (gros projets) |
| `skill_design_promax` | Skills & Outils | Propose Séréna + installe UI/UX Pro Max si besoin design |
| `skill_qmd` | Skills & Outils | QMD-first sur tous les .md (moteur recherche hybride) |
| `skill_copilot_loop` | Skills & Outils | Loop autonome PR→Copilot review→handoff→fixes→merge |
| `skill_ollama_router` | Skills & Outils | Setup et routing automatique Ollama local (proxy :4000) |

## Agents disponibles — commandes slash

Après avoir affiché le tableau de contrôle, affiche **toujours** ce tableau d'agents :

| Commande | Agent | Rôle |
|---|---|---|
| `/atelier-help` | Atelier Help | État du projet + commandes disponibles |
| `/atelier-setup` | Atelier Setup | Onboarding post-install, setup watchdog & QMD |
| `/atelier-doctor` | Atelier Doctor | Diagnostic complet installation (27+ checks) |
| `/atelier-config` | Atelier Config | Ce tableau de contrôle |
| `/review-copilot` | Review Copilot | Génère un handoff review pour Copilot/GPT (§25) |
| `/integrate-review` | Integrate Review | Intègre la réponse Copilot depuis docs/handoffs/ |
| `/copilot-loop` | Copilot Loop | Loop autonome PR→review→merge |
| `/la-bise` | La Bise | Échange inter-LLM (GPT/Mistral) |
| `/angle-mort` | Angle Mort | Review anti-complaisance avant release |
| `/compress` | Compress | Compresse CLAUDE.md pour réduire les tokens |
| `/audit-safe` | Audit Safe | Scan secrets, gate, permissions, .claudeignore |
| `/night-launch` | Night Launch | Prépare le mode nuit (autonomie) |
| `/token-routing` | Token Routing | Configure le routing Haiku/Sonnet/Opus |
| `/design-senior` | Design Senior | Propose Séréna + installe UI/UX Pro Max |
| `/bmad-init` | BMAD Init | Installe BMAD-METHOD dans le projet |
| `/qmd-init` | QMD Init | Installe QMD (moteur recherche .md local) |
| `/ollama-router` | Ollama Router | Setup Ollama bout-en-bout + proxy |
| `/ios-setup` | iOS Setup | Workflow iOS/tvOS : VS Code + Xcode + Makefile |
| `/freebox-init` | Freebox Init | Bootstrap autorisation app Freebox |
| `/handoff-debt` | Handoff Debt | Affiche la dette §25 + draft handoff |

## Conseils d'usage

- **Début de projet (build from scratch)** : désactive `review_copilot` et `diagnostic` pour aller vite sans friction.
- **Mode focus** : désactive `session_length_warning` si tu sais que le contexte sera long.
- **Mode revue qualité** : tout ON — aucun rail ne doit être ignoré.
- **La config vit dans** `.claude/features.json` — commitable dans le repo pour aligner l'équipe.
