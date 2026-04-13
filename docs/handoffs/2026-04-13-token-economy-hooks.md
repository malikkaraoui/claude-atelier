# Handoff — Token Economy & Enforcement Hooks (session 2026-04-13)

> Date : 2026-04-13
> Type : review
> Priorité : haute (hooks d'enforcement actifs en production)

---

## De : Claude (Sonnet 4.6)

### Contexte

Session de travail du 2026-04-13. 5 commits, 198 lignes nettes sur 8 fichiers.
Objectif : renforcer l'économie de tokens et boucher les trous dans l'enforcement.

**Commits couverts (du plus récent au plus ancien) :**

```
3a5c2e2 fix: §25 cross-session — review check béton armé au démarrage de session
0e63d7e feat: horodatage machine + modèle en tête de réponse (§1) + README rails 14
7eb5c91 feat: QMD-first — hook PreToolUse Read redirige les .md vers QMD + règle §15
a0d7158 fix: hook PostToolUse — séparer les patterns npm test en entrées distinctes (syntaxe ':' invalide)
eafb8a1 feat: token economy — session length detection + Haiku routing suggestion
```

---

### Features implémentées

#### 1. Session length monitoring (`hooks/routing-check.sh`)
- À chaque UserPromptSubmit, `stat -f %z` sur le transcript JSONL
- ≥ 300KB → `⚠️ [SESSION]` warning
- ≥ 600KB → `🔴 [SESSION]` alerte forte + suggestion `/compact`

#### 2. Haiku auto-suggestion (`hooks/routing-check.sh`)
- Si prompt < 200 chars ET contient un mot d'exploration (`cherche`, `liste`, `grep`, `audit`, `scan`…)
- ET modèle actif ≠ haiku → `💡 Exploration détectée → /model haiku`

#### 3. QMD-first (`hooks/guard-qmd-first.sh` + `settings.json` + `src/fr/CLAUDE.md §15`)
- Nouveau hook PreToolUse sur `Read`
- Intercepte tout `Read` sur un `.md` projet
- Injecte les commandes QMD équivalentes avant exécution
- Exclusions : `CLAUDE.md`, `MEMORY.md`, `/memory/`, `/hooks/`, `/runtime/`, `/security/`, etc.
- §15 CLAUDE.md mis à jour : règle QMD-first avec offset+limit obligatoire

#### 4. Horodatage machine + modèle (`hooks/routing-check.sh` + `src/fr/CLAUDE.md §1`)
- `$(date '+%Y-%m-%d %H:%M:%S')` injecté en premier dans le hook output
- Format : `[HORODATAGE] YYYY-MM-DD HH:MM:SS | model`
- §1 mis à jour : Claude DOIT ouvrir chaque réponse avec cette ligne

#### 5. §25 cross-session fix (`hooks/routing-check.sh` + `hooks/guard-review-auto.sh`)
- Gap identifié : `guard-review-auto.sh` aveugle aux commits des sessions précédentes
- Fix : `routing-check.sh` scanne `git log` au premier message de chaque session
- Session-flag scopé via hash du transcript path (unique par session VS Code)
- Checkpoint `/tmp/claude-atelier-last-reviewed-commit` partagé entre les deux hooks
- `guard-review-auto.sh` écrit ce checkpoint quand il fire (synchronisation)

---

### Fichiers à lire

1. `hooks/routing-check.sh` — logique principale (session length, Haiku, horodatage, §25 cross-session)
2. `hooks/guard-qmd-first.sh` — hook QMD-first (nouveau)
3. `hooks/guard-review-auto.sh` — mise à jour checkpoint §25
4. `.claude/settings.json` — PreToolUse Read matcher ajouté, PostToolUse patterns corrigés
5. `src/fr/CLAUDE.md` — §1 et §15 mis à jour (149 lignes, cible ≤ 150)

---

### Question précise

**Review globale de robustesse et angles morts sur les 5 implémentations.**

Points spécifiques à challenger :

1. **Session-hash collision** : `cksum` sur le transcript path → est-ce suffisamment unique pour séparer deux sessions VS Code simultanées ? Y a-t-il un risque de collision entre deux projets ouverts en même temps ?

2. **Liste d'exclusion QMD-first** : le hook exclut `CLAUDE.md`, `MEMORY.md`, `/memory/`, `/hooks/`, `/runtime/`, `/orchestration/`, `/autonomy/`, `/security/`. Est-ce complet ? Y a-t-il des `.md` légitimes que Claude devrait pouvoir lire directement sans passer par QMD ?

3. **`stat -f %z` macOS-only** : cette commande est macOS-spécifique. Le hook a un fallback `|| echo 0` mais ce fallback désactive silencieusement le monitoring sur Linux. Est-ce un problème pour la distribution npm ?

4. **Checkpoint cross-session** : si le fichier `/tmp/claude-atelier-last-reviewed-commit` est supprimé (reboot, /tmp cleanup), le hook tombe en mode `HEAD~10..HEAD`. Est-ce que cette plage de 10 commits est suffisante ou peut-on rater des commits anciens non reviewés ?

5. **Haiku suggestion** : le regex couvre `cherche|liste|grep|audit|scan|…`. Y a-t-il des cas où ce trigger serait un faux positif gênant (ex: un prompt de debug complexe qui contient par hasard "liste" ou "cherche") ?

---

### Contraintes / hors scope

- Ne pas proposer de réécrire la logique de routing (elle vient d'être refactorisée)
- Ne pas toucher aux règles absolues §5 et §22
- Focus : robustesse, edge cases, portabilité cross-OS

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
Tu DOIS écrire ta réponse directement dans ce fichier, dans cette
section. N'écris PAS ta réponse dans le chat. Utilise Edit/Write.
Quand tu as fini, dis : "J'ai répondu dans docs/handoffs/2026-04-13-token-economy-hooks.md"

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
