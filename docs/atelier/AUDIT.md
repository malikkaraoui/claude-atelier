# AUDIT — claude-atelier v0.26.1

> Généré Phase 0 refonte/atelier-core — 2026-06-25. Zéro modification du code.
> Scope : cartographie complète + 3 listes pour validation kill-list.

---

## Cartographie

```
claude-atelier/
├── bin/           CLI commands (14 fichiers)
├── src/           Logique core : merge, profiles, pulse, vault, skills, stacks
├── hooks/         Claude Code hooks (18 hooks)
├── scripts/       Scripts build + runtime (27 fichiers + ollama-proxy Go)
├── test/          Test suite (15 fichiers)
├── .claude/       Config Claude Code (CLAUDE.md, settings, hooks-manifest, skills, stacks…)
├── docs/          Docs, proposals, handoffs
├── website/       Docusaurus (non publié)
└── vault/         Peter — état projet vivant (hors scope refonte)
```

**Entrées CLI `claude-atelier <cmd>`** : init · update · doctor · lint · features · review-local · apply · pulse · vault

**Hooks actifs** (settings.json) : session-model · vault-context · routing-check · guard-no-sign · guard-commit-french · guard-qmd-first · guard-anti-loop · guard-tests-before-push · telegram-notify · guard-review-auto · model-metrics · guard-hooks-reload · start-maestro · stop-pulse · detect-design-need · peter-inbox-check · notify-master-done

---

## ✅ KEEP — Ce qui sert le cœur

### bin/
| Fichier | Rôle |
|---|---|
| `bin/cli.js` | Point d'entrée CLI, routing des commandes |
| `bin/init.js` | Installe `.claude/` dans le projet cible |
| `bin/update.js` | Met à jour la config en préservant §0 |
| `bin/apply.js` | Applique un profil de config |
| `bin/features.js` | Gestion des feature flags |
| `bin/hooks-gen.js` | Génère hooks depuis manifest |
| `bin/post-install-checks.js` | Vérifications post-install |
| `bin/review-local.js` | Review handoff via Ollama local |
| `bin/setup-s0.js` | Setup §0 initial |
| `bin/pulse.js` | CLI pulse multi-agents |
| `bin/vault.js` | CLI vault (init, query, explain…) |
| `bin/vault-watch.js` | Watch daemon vault (inotify fichiers) |
| `bin/welcome.js` | Message de bienvenue post-init |

### src/
| Fichier/Dir | Rôle |
|---|---|
| `src/merge.js` | Fusion config cible + source (§0-preserving) |
| `src/apply-profile.js` | Application des profils de config |
| `src/features.json`, `src/features-registry.json` | Registre des features |
| `src/en/`, `src/fr/` | Templates localisés (CLAUDE.md, skills…) |
| `src/profiles/` | Profils de config (minimal, full, custom) |
| `src/pulse/parse.js` | Parse `pouls.md` |
| `src/pulse/write.js` | Écrit `pouls.md` |
| `src/pulse/intensity.js` | Calcule intensité pulse |
| `src/pulse/format.js` | Formatage labels pulse |
| `src/pulse/identity.js` | Identité agent / agent IDs |
| `src/pulse/summary.js` | Résumé pulse multi-agents |
| `src/vault/` | Tout le vault : core, graph, mcp, watch, extractors |
| `src/skills/` | Définitions skills (mirroir `.claude/skills/`) |
| `src/stacks/` | Config stacks (js, py, go…) |
| `src/templates/` | Templates projet (AGENTS.md, settings.json…) |

### hooks/
| Hook | Type | Rôle |
|---|---|---|
| `hooks/_parse-input.sh` | helper | Parser stdin partagé |
| `hooks/session-model.sh` | SessionStart | Détecte le modèle actif → §1 |
| `hooks/vault-context.sh` | SessionStart | Injecte vault en contexte session |
| `hooks/routing-check.sh` | UserPromptSubmit | Vérifie routing modèle |
| `hooks/model-metrics.sh` | UserPromptSubmit | Émet `[METRICS]` pour §1 |
| `hooks/detect-design-need.sh` | UserPromptSubmit | Détecte besoin design → propose Séréna |
| `hooks/guard-no-sign.sh` | PreToolUse | Bloque `--gpg-sign` |
| `hooks/guard-commit-french.sh` | PreToolUse | Bloque commits non-FR |
| `hooks/guard-qmd-first.sh` | PreToolUse | Force QMD avant Read sur .md |
| `hooks/guard-anti-loop.sh` | PostToolUse | Détecte boucles outil infinie |
| `hooks/guard-tests-before-push.sh` | Pre+PostToolUse | Gate tests avant push |
| `hooks/guard-review-auto.sh` | PostToolUse | Déclenche review §25 auto |
| `hooks/guard-hooks-reload.sh` | PostToolUse | Reload manifest si modifié |
| `hooks/stop-pulse.sh` | Stop | Met à jour `pouls.md` fin de session |

### scripts/
| Script | Rôle |
|---|---|
| `scripts/pre-push-gate.sh` | Gate 5 étapes avant push (non-négociable) |
| `scripts/switch_model.py` | Switch modèle Claude en session |
| `scripts/gen-help.js` | Génère le bloc HELP de cli.js |
| `scripts/manifest-sync.js` | Sync hooks-manifest → settings.json |
| `scripts/handoff-debt.sh` | Calcule dette handoff §25 |
| `scripts/handoff-draft.sh` | Draft handoff pré-rempli |
| `scripts/install-git-hooks.sh` | Installe git hooks locaux |
| `scripts/memory-*.js/sh` | Système mémoire SQLite (embed, read, write, gc…) |
| `scripts/ollama-proxy/` | Go proxy Ollama bidirectionnel (tool_use) |
| `scripts/update-security.js` | Mise à jour .claudeignore sécurité |
| `scripts/version-gate.js` | Gate avant npm version bump |
| `scripts/pulse-update.js` | Mise à jour pulse fin de session (appelé par stop-pulse.sh) |

### .claude/skills/
Tous les skills sauf `steve/` (vide) :
`angle-mort` · `atelier-config` · `atelier-doctor` · `atelier-help` · `atelier-setup` · `audit-safe` · `bmad-init` · `compress` · `copilot-loop` · `design-senior` · `handoff-debt` · `integrate-review` · `la-bise` · `night-launch` · `ollama-router` · `qmd-init` · `review-copilot` · `token-routing`

### .claude/ config
`CLAUDE.md` · `settings.json` · `hooks-manifest.json` · `orchestration/` · `runtime/` · `security/` · `stacks/` · `autonomy/` (sans telegram.md) · `ecosystem/`

### Racine
`index.js` · `package.json` · `package-lock.json` · `CHANGELOG.md` · `README.md` · `CONTRIBUTING.md` · `PHILOSOPHY.md` · `PARITY.md` · `SECURITY.md` · `LICENSE` · `.github/` · `.gitignore` · `.npmignore` · `.claudeignore` · `.mcp.json`

### test/
Tout sauf `test/telegram.test.js` : `hooks.js` · `merge.js` · `apply-profile.js` · `pulse.js` · `vault.js` · `vault-update.js` · `memory.js` · `lint-*.js` · `manifest-validator.js` · `validate-handoff.js` · `doctor.js`

---

## ❌ KILL — Hors-scope ou mort

### Telegram / MasterClaude (daemon externe)
| Fichier | Raison |
|---|---|
| `bin/master.js` | Daemon MasterClaude — Telegram polling + routing Claude sessions. Hors-scope npm. Bloqué si Telegram absent. |
| `bin/telegram.js` | CLI de gestion du bridge Telegram (start/stop/status). Hors-scope. |
| `src/master/` (4 fichiers) | Module entier : context-monitor, session-manager, vault-loader, index. Dépend du bridge Telegram. |
| `scripts/telegram-bridge.py` | Bridge Python Telegram + faster-whisper + SQLite sessions. Hors-scope, 400+ lignes. |
| `scripts/mailbox-watcher.sh` | Surveille vault/10-mailbox.md → répond sur Telegram via CLI. One-shot daemon. |
| `scripts/install-daemon.sh` | Installe mailbox-watcher comme LaunchAgent macOS. One-shot. |
| `scripts/claude-notify.sh` | Envoie un message Telegram depuis Claude + log vault. Hors-scope. |
| `hooks/telegram-notify.sh` | PostToolUse FIFO alerts → Telegram. Dead si bridge absent. |
| `hooks/start-maestro.sh` | SessionStart → lance pulse-maestro.js (rebaptisé ci-dessous). Couplé à Maestro/Telegram. |
| `hooks/notify-master-done.sh` | Stop hook → écrit `/tmp/masterclaude-atelier-done`. Dead si MasterClaude absent. |
| `.claude/autonomy/telegram.md` | Doc mode autonomie Telegram. Caduc après kill. |
| `test/telegram.test.js` | Tests du bridge Telegram. Dead après kill. |

### Marketplace inter-agents (non livré, hors-scope)
| Fichier | Raison |
|---|---|
| `src/pulse/marketplace.js` | Marketplace inter-agents (crédits, ledger, feature offers). Concept non livré. Importé par pulse-maestro mais non essentiel au pulse. |
| `scripts/pulse-marketplace-watch.js` | Daemon standalone qui boucle sur le marketplace. Hors-scope. |

### Docs orphelins racine (notes one-shot, non publiés)
| Fichier | Raison |
|---|---|
| `BUILD_FFI_TROUBLESHOOTING.md` | Troubleshooting FFI iOS/tvOS. Note projet Tom, pas claude-atelier. |
| `freebox-sdk-workflow.md` | Référence Freebox SDK. Projet Tom, pas claude-atelier. |
| `ios_vscode_claude_workflow_v4.md` | Workflow iOS V4. Projet Tom, pas claude-atelier. |
| `systems-programming-2025-2026-research.md` | Notes recherche langages 2025-2026. Stale, pas de code. |
| `TOM-TVOS-NODE-PLAN.md` | Plan projet Tom tvOS. Hors-scope. |
| `workflow-vscode-xcode.md` | Workflow Xcode. Projet Tom, pas claude-atelier. |
| `watchdog-report-2026-04-12-19h02.txt` | Ancien rapport watchdog nuit. Artefact stale. |

### Worktrees prunable (branches supprimées, artefacts)
| Entrée | Raison |
|---|---|
| `.worktrees/lot-0-modularisation` | Branch `feat/lot-0-modularisation` prunable (supprimée). Doublon physique en `.worktrees/`. |
| `.worktrees/lot-10-mcp` | Branch `feat/lot-10-mcp` prunable. Doublon physique. |

---

## ❓ DOUTE — Tu tranches

| Fichier / Dir | Question |
|---|---|
| `scripts/pulse-maestro.js` | SessionStart pulse : lit §0.Phase, écrit `/tmp/claude-atelier-pulse-status` pour §1. **Utile.** Mais importe `marketplace.js` (à KILL) et dépend du nom "maestro" lié au daemon Telegram. **Proposition : garder, renommer en `pulse-session-start.js`, supprimer les imports marketplace.** À valider. |
| `hooks/peter-inbox-check.sh` | UserPromptSubmit : vérifie vault/10-mailbox.md → si entrée non lue, alerte Peter. **Utile pour le vault — mais couplé à la notion Peter (vault agent).** À garder si on conserve Peter/vault. À KILL si on sépare. |
| `src/pulse/marketplace.js` | Marketplace inter-agents : crédits, ledger, feature offers. **Concept en cours.** Non livré mais non nul. Inclus dans `pulse-maestro.js`. Tu veux qu'on le conserve pour la Phase D vault, ou on KILL maintenant et on repart propre avec `/wave` ? |
| `.claude/skills/steve/` | Dossier vide — skill en cours ou abandonné ? **Aucun SKILL.md.** Kill si abandonné. |
| `.claude/skills/freebox-init/` | Skill Freebox : spécifique à l'API Freebox Player. Utile pour les utilisateurs Freebox. **À garder si le package est générique, à KILL si on l'exclut du scope.** |
| `.claude/skills/ios-setup/` | Skill iOS/tvOS : workflow Xcode + Claude. Même question que freebox-init. |
| `docs/proposals/` (10 fichiers) | Plans architecturaux : marketplace, mirror, telegram, peter-vault, etc. **Certains sont caducs (telegram-bridge-plan.md, marketplace-*), d'autres toujours actifs (peter-vault-graphify-plus-plan.md).** Proposition : garder peter-vault + mirror-architecture, KILL le reste. À confirmer. |
| `claude-code-dynamic-model-switching.md` | Doc technique sur le dynamic model switching. **Contenu potentiellement utile comme référence** mais pas publiable. Migrer dans `docs/` ou KILL ? |
| `vercel.json` | Config déploiement Vercel. Pour le website Docusaurus. **Site actif ou abandonné ?** |
| `src/templates/telegram.env.example` | Template .env Telegram. Caduc si bridge KILL. |

---

## Résumé chiffré

| Catégorie | Fichiers |
|---|---|
| KEEP | ~110 fichiers |
| KILL (ferme) | 22 fichiers/entrées |
| DOUTE | 10 entrées |

**STOP — attends validation de la kill-list avant toute suppression.**
