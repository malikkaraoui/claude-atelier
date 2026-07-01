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

### YYYY-MM-DD — Découverte

- Observation :
- Impact :
- Source :
- Remontée globale candidate : non
