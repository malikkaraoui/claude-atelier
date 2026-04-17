# Handoff — Feature B AGENTS.md P1 + bridge skills + npm pipeline

> Date : 2026-04-17
> Type : review
> Priorité : moyenne
> reviewedRange: 706892ced5edd1687fd6aa5427e4ddbb14f9c24e..7fe0be1f5bba8453fdc286b9da66f884b73e964b

---

## De : Claude (Sonnet 4.6)

### Contexte

9 commits / +510 lignes depuis le dernier handoff intégré. Trois features livrées :

**1. npm publish pipeline (`fix`, `docs`)**
- `.github/workflows/npm-publish.yml` : `npm publish` déplacé en CI uniquement (supprimé du `postversion` local pour éviter E403 sur versions déjà publiées)
- `src/stacks/npm-publish.md` : satellite créé avec la règle "CI seul publisher, jamais en local"
- `bin/cli.js`, `package.json` : alignement version + HELP régénéré

**2. Bridge `.claude/skills/` → `.github/skills/` (`feat`)**
- `bin/init.js` et `bin/update.js` : nouvelle fonction `bridgeSkillsToGithub()` — crée des symlinks `.github/skills/<nom>.md → .claude/skills/<nom>/SKILL.md` à l'install et à l'update
- Objectif : rendre les skills découvrables par Copilot, Gemini, Codex sans duplication

**3. Feature B — AGENTS.md P1 (`feat`)**
- `src/templates/AGENTS.md` créé : §3 flow, §5 anti-hallucination, §6 erreurs, §7 qualité, §8 anti-patterns, §9 archi, §11 tests, §12 review, §13 git, §14 cloud/CI — avec header hiérarchie explicite ("AGENTS.md prime, fichiers agent-specific = deltas")
- `src/fr/CLAUDE.md` allégé : sections migrées remplacées par pointeurs `→ AGENTS.md`
- `bin/init.js` : copie `AGENTS.md` à la racine des nouveaux projets (skip si existe)
- `bin/update.js` : copie `AGENTS.md` additivement + flag `--migrate-agents-md` pour migration opt-in

### Questions précises

**1. Bridge skills symlinks — robustesse**

La fonction `bridgeSkillsToGithub()` crée des symlinks relatifs (Unix) avec fallback `copyFileSync` (Windows). Le symlink pointe vers `.claude/skills/<nom>/SKILL.md` depuis `.github/skills/`. Si l'utilisateur déplace son projet ou si `.claude/` est dans un sous-répertoire non standard, le symlink se casse silencieusement. Est-ce un angle mort notable, ou est-ce acceptable pour le MVP sachant que l'immense majorité des projets ont `.claude/` à la racine ?

**2. AGENTS.md — sections référencées mais non chargées**

`src/fr/CLAUDE.md` pointe maintenant vers `AGENTS.md` via des lignes comme `## §5 Anti-hallucination → AGENTS.md (absolu)`. Ces pointeurs sont lisibles par un humain, mais un agent LLM qui reçoit uniquement `CLAUDE.md` sans `AGENTS.md` dans son contexte ne verra que des stubs vides. Est-ce que cette architecture crée un risque de régression silencieuse pour les setups où CLAUDE.md est chargé seul (ex: `~/.claude/CLAUDE.md` global sans AGENTS.md à la racine) ?

**3. `bin/update.js` — AGENTS.md dans `report` avant le print**

Le code ajoute AGENTS.md au `report[]` via `copyAgentsMd()` entre l'étape 2 (copy template) et l'étape 3 (print report). Les tags 'SKIP' sont filtrés à l'affichage. Est-ce que l'absence de message visible quand AGENTS.md existe déjà (`[SKIP]`) peut surprendre l'utilisateur qui se demande si le fichier a été mis à jour ? Faut-il un `console.log` `[SKIP]` explicite comme `init.js` le fait pour `.claudeignore` et `.gitignore` ?

**4. Pas de version EN de AGENTS.md**

`src/fr/CLAUDE.md` a été mis à jour, mais `src/en/CLAUDE.md` (s'il existe) n'a pas été touché. Est-ce une dette technique visible, ou est-ce que l'EN est suffisamment "work in progress" pour que ce soit acceptable sans gate ?

### Fichiers à lire

```text
bin/init.js                       (280-340 lignes — bridge + AGENTS.md copy)
bin/update.js                     (185-280 lignes — bridge + AGENTS.md additive + --migrate-agents-md)
src/templates/AGENTS.md           (nouveau fichier — règles communes)
src/fr/CLAUDE.md                  (sections migrées → stubs)
src/stacks/npm-publish.md         (nouveau satellite)
.github/workflows/npm-publish.yml (CI publish)
```

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne
- Ne pas remettre en question la décision AGENTS.md-first (validée par review plan)
- Se concentrer sur les angles morts opérationnels et les régressions silencieuses

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
1. Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, section `## Réponse de : Copilot/GPT`.
2. Tu ne dois PAS répondre dans le chat, ni dans un autre fichier.
3. **INTERDIT DE MODIFIER DU CODE SOURCE.** Tu es reviewer, pas développeur. Ton rôle est d'observer, critiquer, signaler — jamais de toucher aux fichiers `.js`, `.ts`, `.json`, `.sh`, `.md` hors de ce handoff. Si tu vois un bug, décris-le. Ne le corrige pas.
4. **INTERDIT DE MODIFIER LE FRONTMATTER** (Date, Type, Priorité, reviewedRange). Ces champs sont ancrés par Claude. Les changer casse la CI.
5. Quand tu as fini, dis : "J'ai répondu dans docs/handoffs/2026-04-17-agents-md-bridge-skills-npm-pipeline.md"

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
