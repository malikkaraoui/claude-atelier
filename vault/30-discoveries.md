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

### 2026-07-02 — Fix bug CTX #2 : table fenêtre/modèle ne connaissait pas claude-sonnet-5 (LOT-0 incomplet)

- **Contexte / but** : Malik signale via capture d'écran `/context` que le vrai usage est 440.5k/967k tokens = 46%, alors que mon entête §1 rapportait 214-220% tout au long de la session (modèle actif : `claude-sonnet-5`). Le fix LOT-0 (`d4eec5b`) avait corrigé la race de résolution de modèle (cache scoppé vs legacy) mais PAS la table modèle→taille-fenêtre elle-même.
- **Cause racine** : `hooks/model-metrics.sh` mappe le modèle actif à une fenêtre via un `case` en dur (`*opus-4-8*→1M, sinon 200k`). `claude-sonnet-5` ne matchait aucun des deux motifs `[1m]`/`opus-4-8` → retombait sur le défaut 200k alors que sa vraie fenêtre est ~967k-1M (confirmé par `/context`, seule source faisant autorité — Claude Code y calcule lui-même `context_window_size`). Diviser l'usage réel par un dénominateur ~4.8x trop petit gonfle le % rapporté d'autant (220/46 ≈ 4.78 ≈ 967000/200000 ≈ 4.84 — ratio cohérent, confirme le diagnostic).
- **Vérification archi** : `strings` sur le binaire Claude Code installé (`~/.local/share/claude/versions/2.1.198`) confirme que l'objet `context_window` (avec `context_window_size`/`used_percentage`) n'est documenté et exposé QUE pour le hook `statusLine` — jamais pour `UserPromptSubmit` (schéma générique : `session_id, tool_name, tool_input, tool_response` seulement). Conséquence : `model-metrics.sh` ne peut pas lire la vraie fenêtre depuis Claude Code lui-même, il doit maintenir sa table manuellement et la revérifier via `/context` à chaque nouveau modèle.
- **Fix** : ajout de `*sonnet-5*` au motif 1M dans `hooks/model-metrics.sh` (`case "$LIVE_MODEL$MODEL" in *'[1m]'*|*'[1M]'*|*opus-4-8*|*sonnet-5*) CONTEXT_WINDOW=1000000 ;; ...`). Nouveau test de non-régression ajouté (`test/hooks.js` : `claude-sonnet-5 → 5%`, pas 25%), suite complète 85/85 verte, `.claude/hooks-manifest.json` resynchronisé (SHA du hook modifié).
- **Gotcha réutilisable** : une table modèle→fenêtre en dur est un point de dérive garanti à chaque nouveau modèle — pas de solution automatique côté hook (le champ faisant autorité n'est accessible qu'au hook statusLine), donc la revérifier via `/context` reste manuel. Si un futur modèle affiche un % incohérent après bascule, présumer d'abord cette table avant de re-suspecter la résolution du modèle (déjà fixée en LOT-0).

### 2026-07-02 — Publication v0.28.0→v0.28.2 : doc resynchronisée, 2 bugs trouvés en review, CI npm cassée

- **Contexte / but** : suite au plan LOT-0→LOT-6 livré, Malik demande de committer/pousser/bumper/publier + mettre à jour README (npm + GitHub) via sous-agents.
- **Doc (agent worktree isolé, puis review-oracle 4 agents)** : CHANGELOG 0.28.0 + README (FR/EN) + `website/docs/{hooks,skills,intro}.md` resynchronisés sur le code réel. 3 erreurs trouvées et corrigées avant push :
  1. 🔴 **Hallucination** — l'agent a inventé un agent nommé « Xavier » dans `website/docs/intro.md` (le roster réel est Steve/Isaac/Mohamed/La Bise/Amine/Séréna/Peter, 7 agents dans `website/docs/agents.md`) — jamais vérifié une liste de noms propres inventée par un sous-agent doc sans la recouper au fichier source.
  2. `website/docs/hooks.md` attribuait `guard-loop-master.sh` à « §25 » au lieu de « §3 » (vérifié dans `.claude/hooks-manifest.json` champ `rule`).
  3. `atelier-doctor/SKILL.md` désynchronisé (« 27+ checks » vs 28 réels) — nécessite un `cp src/skills/X → .claude/skills/X` manuel après édition (`npm run lint:runtime-skills` le détecte).
- 🔴 **Incident sous-agent worktree** : un agent `isolation: "worktree"` à qui j'avais interdit de toucher `.claude/CLAUDE.md`/`.claude/settings.json`/`.gitignore` (dommage local pré-existant que Malik voulait restaurer lui-même) a signalé les avoir « accidentellement touchés puis restaurés ». Un worktree démarre **propre depuis HEAD**, pas depuis l'état sale du checkout principal — sa « restauration » a donc resynchronisé ces 3 fichiers sur HEAD dans MON checkout principal au retour de ses modifications non commitées, écrasant silencieusement le dommage local que Malik n'avait pas encore traité. Détecté via `git diff HEAD` (vide alors qu'avant l'agent ça montrait des `M`). Contenu HEAD confirmé correct/complet (§0 rempli, déjà pushé) → Malik a validé « laisser tel quel ».
- **Fix faux positif `npm audit` critique** (`bin/post-install-checks.js`) : un projet fraîchement `update` sans lockfile faisait échouer `npm audit` en `ENOLOCK` (pas de lockfile, pas une vraie CVE), mais le code affichait quand même « vulnérabilités high/critical détectées » — n'importe quel `status !== 0` déclenchait le message alarmant. Fix en 2 passes (review-oracle SÉCURITÉ + CODE) : extraction d'une fonction pure `classifyAuditResult(auditResult, hasLockfile)`, détection par **existence réelle du lockfile** plutôt que parsing du texte stderr (fragile), et restriction aux seuls lockfiles que `npm audit` comprend (`package-lock.json`/`npm-shrinkwrap.json` — PAS `yarn.lock`/`pnpm-lock.yaml`, que npm audit ignore complètement).
- **Bug pipeline version** : `gen-help.js` (régénère le HELP de `bin/cli.js`) tournait dans `preversion`, donc AVANT le bump — il gravait systématiquement l'ANCIENNE version, et comme `npm version` ne git-add pas les fichiers touchés par `preversion` (seul le hook `version` bénéficie du staging auto), le résultat n'était jamais committé. Le paquet 0.28.0 publié montrait encore `v0.26.2` dans `--help`. Fix : déplacé sur le hook npm `version` (après bump, avant commit).
- ⚠️ **CI npm-publish cassée** : `NODE_AUTH_TOKEN` (`NPM_TOKEN` puis renommé `NPM_TOKEN_PUBLISH`) échoue en boucle — `EOTP` (2FA requis) puis `E403` (après désactivation 2FA compte : « 2FA OU token bypass-2FA requis, aucun des deux satisfait ») puis de nouveau `EOTP` (après réactivation 2FA + nouveau token bypass généré dans le mauvais ordre). Cause précise non confirmée (token généré pendant 2FA off n'a probablement pas hérité du flag bypass une fois 2FA réactivé). Contournement : publication manuelle en local (`npm publish --access public`, flux navigateur ou `--otp=<code>`) — a fonctionné pour 0.28.0 et 0.28.2. **Doctrine violée** (« jamais npm publish en local », `src/stacks/npm-publish.md`) par nécessité, assumé explicitement par Malik.
- **Fix additionnel découvert en cours de route** : `package.json#files` n'incluait pas `PHILOSOPHY.md`/`PARITY.md` référencés par le README → `lint-refs` échouait sur tout paquet installé (commit direct de Malik pendant la session, rebasé proprement).
- **Gotcha réutilisable** : un agent `isolation: worktree` à qui on interdit de toucher des fichiers X peut quand même faire remonter un état différent sur ces fichiers dans le checkout principal si le worktree les touche puis les « restaure » — le worktree ne connaît que HEAD, pas le désordre local du checkout principal. Vérifier `git diff HEAD` sur les fichiers protégés juste après le retour d'un agent worktree, pas seulement avant de le lancer.

### YYYY-MM-DD — Découverte

- Observation :
- Impact :
- Source :
- Remontée globale candidate : non
- Fichiers liés : (optionnel, chemin relatif séparé par virgule)
