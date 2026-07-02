# Découvertes projet

> Géré par Peter via claude-atelier vault. Markdown vivant, pas document gravé.

## Découvertes

Ce que Claude ou Peter apprend sur le projet et qui mérite de survivre à la session.

### 2026-07-01 — Session nettoyage : entête §1, routing, Pulse (commit 06c6125, NON poussé)

- **Contexte / but** : Peter mène un grand nettoyage du framework — supprimer les features mortes, remettre le repo « en vérité » (README = code), fonction par fonction, Peter décide garde/évolue/supprime. Voir `00-brief.md`.
- **Livré ce jour** (commit local `06c6125`, +456/−1337, 29 fichiers) :
  1. **Entête §1** simplifiée à `[MM-DD HH:MM:SS | model | ctx N%] PASTILLE` (plus d'année, plus de mode A/M, plus de 🦙/🔌). Fenêtre ctx dérivée du **modèle actif** (bug corrigé : 200k en dur affichait un faux 95% sur session Opus 1M) — table opus-4-8/`[1m]`→1M sinon 200k, override env `CLAUDE_ATELIER_CTX_WINDOW` > `features.json contextWindow`.
  2. **Faux blocage §1 en boucle corrigé** : `guard-s1-header.sh` (hook **Stop**, contrôle la sortie) prenait le feedback du hook Stop — réinjecté comme tour `user isMeta:true` APRÈS ma réponse — pour « le dernier prompt », masquant mon entête → blocage. Fix : ignorer les tours `isMeta` dans le calcul du `start`. Diagnostic fait sur le transcript JSONL réel (le format 3-segments était innocent).
  3. **routing-check.sh nettoyé** : Ollama / proxy / mode A-M supprimés (LLM cloud only). Détection modèle + stack + diagnostic + header conservés. Banner handoff basculé `/review-copilot` → `/review-oracle`.
  4. **Feature Pulse supprimée** entièrement (10 fichiers : hook, bin, src/pulse, scripts, test + refs). Révocation tracée dans `20-decisions.md`.
- **Review** : review-oracle 4 agents (DOCTRINE/CODE/SÉCURITÉ/TESTS) → RATIFIÉ après fixes (DOCTRINE avait raison : révoquer une décision verrouillée exige de tracer la révocation dans le vault). 219 tests verts.
- ⛔ **PUSH BLOQUÉ** : `git push` échoue sur l'auth GitHub (HTTPS, `gh` non connecté). 6 commits `main` en avance sur `origin/main`. **Rien n'est sur le remote.** → `gh auth login` puis `git push`.
- **Gotcha réutilisable** : tout hook qui lit le transcript pour isoler « le tour courant » doit filtrer `isMeta:true` (relances/feedback de hooks) ; diagnostiquer sur le JSONL réel avant de toucher la logique.

### 2026-05-04 — Phase B Telegram voix livrée (PR #49 mergée)

- **VoiceTranscriber** : faster-whisper lazy-loaded (device=cpu, compute_type=int8), `asyncio.to_thread` obligatoire — le générateur faster-whisper DOIT être consommé entièrement dans le thread (pas dans la boucle événement asyncio, sinon deadlock)
- **OllamaPolisher** : httpx async, POST `/api/generate`, timeout 10s, fallback gracieux sur texte brut
- **6 fixes Copilot robustesse** : try/finally download (cleanup partial), try/except transcription (reply erreur user), polished[:4000] troncation, reply explicite si project_dir invalide, inbox_writer en try/except, `_run()` helper consommant le générateur en thread
- **17/17 smoke tests passants** — 4 nouveaux tests Phase B ajoutés à test/telegram.test.js
- **Déférés PR #49** : mcp/server.js framing stdio (Phase G), graph reload, test vault maintain

### 2026-05-04 — État multi-chantiers après merge PR #50

- **main propre, 0 PR ouverte** — Lots 0+4+10 + 6 fixes Copilot mergés, 74/74 tests
- **feat/lot3-vault** : 1 commit en avance (telegram-bridge-plan.md update Copilot) — à merger ou squasher
- **PETER_REPORT** : décalé (dit v0.23.5 / Phase B) — vault/00-brief.md pas encore mis à jour avec Lots 0+4+10
- **Déférés PR #50** : mcp/server.js framing stdio (Phase G), graph reload, telegram-bridge.py erreurs vocaux, test vault maintain
- **Prochains chantiers identifiés** : bump version, Phase B voix (faster-whisper), Phase C graphe minimal (déjà partiellement implémenté dans Lots 0+4+10)

### 2026-07-02 — Fix bug CTX bascule modèle + lancement plan intégration 4 repos externes

- **Contexte / but** : Malik signale un bug réel — `[CTX] fenêtre: N%` devient incohérent (ex: 136%) juste après un `/model` switch. En parallèle, 5 repos externes analysés (claude-mem, last30days-skill, loop-engineering, ponytail, andrej-karpathy-skills) pour extraire des patterns réutilisables ; plan de chantier validé (`/Users/malik/.claude/plans/replicated-dancing-dijkstra.md`), Malik en chef d'orchestre, moi en exécutant multi-agents.
- **Livré ce jour (LOT-0 + lot Karpathy, RATIFIÉ par relecture indépendante, 81/81 tests)** :
  1. **Fix bug CTX** — `hooks/model-metrics.sh` avait sa propre résolution de modèle (LIVE_MODEL brut → cache legacy), indépendante de `routing-check.sh` qui tourne AVANT lui sur le même événement et rafraîchit un cache scoppé session. Un LIVE_MODEL périmé après un switch faisait retomber sur le cache legacy (obsolète) → mauvaise fenêtre (1M au lieu de 200k). Fix : lire le cache scoppé session en priorité (même clé que `routing-check.sh`/`session-model.sh` : session_id sinon hash transcript).
  2. **§3 CLAUDE.md renforcé** (`.claude/CLAUDE.md`) : ajout du principe *Goal-driven* (`1. [étape] → verify: [check]` avant d'exécuter une tâche multi-étapes) — seul apport net du repo andrej-karpathy-skills (les 3 autres principes recoupent §5/§7/§8 déjà en place).
- **Review** : agent Relecteur indépendant → RATIFIÉ sur le fix CTX (`hooks/model-metrics.sh`, `test/hooks.js`, `.claude/hooks-manifest.json`) avant commit `d4eec5b`. Diff complet (2 commits, +§3 Karpathy +cette entrée vault) revalidé ensuite par un 2e passage review-oracle (CODE/SÉCURITÉ/TESTS RATIFIÉ) avant push — voir `20-decisions.md` si une décision en découle.
- **Gotcha réutilisable** : deux hooks qui résolvent le même modèle indépendamment (au lieu de partager une source unique) créent une race silencieuse dès que l'un des deux est en retard d'un tour — toujours faire lire la valeur déjà résolue par le hook qui tourne en premier plutôt que ré-implémenter sa propre résolution.
- ⚠️ **Découverte annexe (non résolue, hors scope)** : `src/fr/CLAUDE.md` (committed, propre) référence désormais `AGENTS.md` pour §3 (nouvelle architecture delta + fichier partagé), mais `AGENTS.md` à la racine est **untracked** (`git status` : `??`) — repo cassé pour un clone frais tant qu'il n'est pas commité ou que la référence n'est pas retirée. Distinct du problème déjà connu (`.claude/CLAUDE.md`/`.claude/settings.json` modifiés localement, restore en attente côté Malik). Ne pas toucher sans validation explicite — périmètre flou entre les deux soucis.

### 2026-07-02 — LOT-1 livré (fondation vault + paramètres configurables), bug critique corrigé en review

- **Livré** (worktree agent, rebasé sur LOT-0 puis mergé `ff-only`, commits `760ad3a` + `051d225`) : `src/vault/core/associations.js` (index `{byFile, byObsId}` depuis `Fichiers liés:` en template dans `20-decisions.md`/`30-discoveries.md`), `hooks/_parse-features.sh` (`_get_param` : lit `src/features-registry.json` avec override `.claude/features.json`), `guard-anti-loop.sh` paramétré (`anti_loop_count` au lieu de `3` en dur).
- 🔴 **Bug critique attrapé en review (moi-même, pas l'agent codeur)** : `_get_param` faisait `python3 -c "..." && return 0` sans jamais vérifier si la clé demandée avait vraiment été trouvée — python sort toujours en succès même sans rien imprimer, donc `return 0` se déclenchait systématiquement dès que `.claude/features.json` existait (ce qui est le cas dans ce repo), renvoyant une chaîne **vide** au lieu du défaut registry. Les 2 tests écrits par l'agent codeur ne l'ont pas détecté : ils ne vérifiaient que l'exit code (toujours 0, warning-only), jamais la vraie valeur du seuil.
- **Gotcha réutilisable** : un test qui vérifie seulement qu'un hook "warning-only" renvoie exit 0 ne prouve RIEN sur la valeur qu'il a réellement lue/utilisée — toujours faire asserter le comportement observable qui dépend de la valeur (ici : le 3e échec précis, pas le 1er ni le 2e) pour qu'un bug de calcul silencieux fasse échouer le test.
- **Review** : vérification manuelle directe (reproduction du bug par exécution réelle du hook, fix, test de non-régression ajouté, `npm test` 84/84 + 77/77 verts) — pas de 4e passage agent séparé vu le volume de contexte de session déjà élevé à ce stade.

### YYYY-MM-DD — Découverte

- Observation :
- Impact :
- Source :
- Remontée globale candidate : non
- Fichiers liés : (optionnel, chemin relatif séparé par virgule)
