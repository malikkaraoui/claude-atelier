# claude-atelier — Méthodologie complète

> Ce document décrit la méthodologie de travail codifiée dans l'atelier.
> Ce n'est pas juste une config : c'est un framework de travail complet.

---

## 1. Token Routing — Ne pas brûler son budget

Le problème originel : Claude qui boucle toute la nuit en Opus et
consomme la totalité des tokens.

| Modèle | Usage | Coût relatif |
| --- | --- | --- |
| **Haiku 4.5** | Exploration, subagents, watchdog, lint, tests | 1× |
| **Sonnet 4.6** | Dev quotidien, features, bug fixes, implémentation | ~5× |
| **Opus 4.6** | Architecture, debug bloquant, décision irréversible | ~50× |

**Règles :**
- En début de session, Claude **signale le modèle actif** et recommande
  un switch si surdimensionné
- Subagents toujours en Haiku (`CLAUDE_CODE_SUBAGENT_MODEL: haiku`)
- Night-mode : Sonnet max, jamais Opus (sauf bug bloquant)
- Auto-montée `/effort high` sur champ lexical complexe, auto-descente
  quand la tâche est terminée
- Pas de changement plus d'une fois par message (anti-flapping)
- **Input tokens** : ne pas relire un fichier déjà lu dans la session
- **Edit ciblé** : jamais réécriture complète si > 20 lignes non modifiées
- **`/compress`** : compresse la prose de CLAUDE.md avant un night-mode long
  (~40-65% de réduction → économie permanente sur toute la session)

---

## 2. Permissions — Zéro friction, maximum sécurité

Le problème : Claude demande une permission bash toutes les 2 minutes,
bloquant le night-mode.

**Solution :** `Bash(*)` dans allow + deny list stricte.

```json
{
  "allow": ["Bash(*)", "Read(*)", "Write(*)", "Edit(*)", "WebFetch(*)", ...],
  "deny": ["Bash(sudo:*)", "Bash(rm -rf /*:*)", "Bash(git push --force:*)", ...]
}
```

**Philosophie :** tout autoriser sauf ce qui est destructif ou irréversible.
Le watchdog Cowork compense en cliquant sur les éventuels prompts restants.

---

## 3. Git Workflow — Discipline sans cérémonie

| Règle | Pourquoi |
| --- | --- |
| Commits atomiques | Un commit = une chose. Reviewable, revertable. |
| Messages en français | Langue du projet. |
| **Jamais signer** (pas de `Co-Authored-By`) | Propreté, vitesse. |
| Committer régulièrement | Le watchdog détecte l'inactivité via `git log`. |
| **Jamais `git push` sans gate** | 5 checks : secrets → fichiers sensibles → lint → build → tests. |
| **Jamais `--no-verify`** | Si la gate bloque, corriger le problème, pas le contourner. |
| Push précédé de tests | Tests locaux avant déploiement. |
| Checkpoint avant action risquée | `git stash` ou branch avant refactor. |

---

## 4. Night-Mode — Autonomie supervisée

Le problème : Claude crash à 22h34, personne ne s'en rend compte,
8 heures perdues.

**Architecture :**

```text
Claude Code (VSCode)          Watchdog Cowork (Haiku)
acceptEdits mode              Tâche planifiée horaire
commits atomiques             git log → delta > 15 min ?
ne push jamais                Screenshot VSCode → diagnostic
                              CAS A: bouton Allow → auto-clic
                              CAS B: spinner → silence
                              CAS C: figé → iMessage alerte
                              CAS D: fermé → iMessage alerte
```

**Pré-requis non négociables :**
- `.claudeignore` configuré
- `git push` en deny
- `maxBudgetUsd` défini (disjoncteur)
- Watchdog 🐶 configuré dans l'app Claude desktop
- Specs écrites avant de lancer

---

## 5. Review Inter-LLM — Claude ↔ Copilot

Le problème : un seul LLM ne voit pas ses propres angles morts.

**Pipeline :**

```text
/review-copilot → handoff .md → Copilot répond dans le fichier
→ /integrate-review → trier (retenu/à garder/écarté) → actions
```

**Déclenchement automatique (§25) :**
- Feature terminée
- Bug fix critique
- 100+ lignes modifiées
- 3+ tentatives échouées (boucle)

**Filet de sécurité :** tâche planifiée Cowork « Review Reminder »
vérifie toutes les heures si > 100 lignes et pas de handoff récent
→ iMessage.

---

## 6. Sécurité — Parano par défaut

| Couche | Protection |
| --- | --- |
| `.gitignore` | Fichiers sensibles exclus du tracking |
| `.claudeignore` | Fichiers sensibles invisibles pour Claude |
| `settings.json` deny list | Commandes destructives bloquées |
| Pre-push gate (5 étapes) | Dernière ligne de défense avant push |
| Patterns regex | Détection secrets (sk-, AKIA, ghp_, AIza...) |
| Procédure d'urgence | Révoquer → filter-branch → force push → notifier |

---

## 7. Multi-Stack — Un atelier, plusieurs langages

L'atelier s'adapte au projet via des satellites par stack, chargés
conditionnellement selon §0 :

| Stack | Fichier | Contenu |
| --- | --- | --- |
| JavaScript/TypeScript | `stacks/javascript.md` | Fonctions pures, typage strict, ESM |
| Python | `stacks/python.md` | PEP8, ruff, uv, dataclasses |
| Java | `stacks/java.md` | Optional, records, SLF4J, JUnit 5 |
| React + Vite | `stacks/react-vite.md` | Composants, hooks, Zustand |
| Firebase | `stacks/firebase.md` | Règles, Functions, Emulator |
| Docker | `stacks/docker.md` | Multi-stage, non-root, healthchecks |
| Ollama | `stacks/ollama.md` | Modelfile, VRAM, quantization |

---

## 8. Orchestration — Le bon agent au bon moment

| Mode | Quand | Comment |
| --- | --- | --- |
| **Fork (subagent)** | Tâche isolée, exploration | Contexte propre, résultat → parent |
| **Teammate (Agent Teams)** | Coordination temps réel | Peer-to-peer, mailbox partagée |
| **Worktree** | Refactor risqué > 3 fichiers | Branche git isolée |
| **BMAD (optionnel)** | Gros projet, cycle complet | 6 agents spécialisés, 4 phases |

**Règles de spawn :**
- Prompt court et ciblé (le subagent ne voit pas la conversation parent)
- 5-6 tâches max par agent
- Fichiers distincts par agent (zéro overlap)
- Nettoyer dès terminé (coût idle)

---

## 9. Slash Commands — Les portes d'entrée

```text
/atelier-help       → Oracle : état du projet + commandes disponibles
/atelier-setup      → Onboarding interactif (7 étapes)
/review-copilot     → Handoff review pour Copilot/GPT
/integrate-review   → Ferme la boucle (lit réponse, trie, checklist)
/angle-mort         → Review ciblée "qu'est-ce que je ne vois pas"
/audit-safe         → Audit sécurité (5 checks)
/night-launch       → Prépare le night-mode (8 prérequis)
/atelier-doctor     → Diagnostic santé (27+ checks)
/token-routing      → Configure Haiku/Sonnet/Opus
/bmad-init          → Installe BMAD (optionnel, gros projets)
/qmd-init           → Installe QMD (optionnel, ≥ 5 fichiers .md)
/compress           → Compresse CLAUDE.md pour réduire les tokens input
```
