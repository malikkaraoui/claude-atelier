# Handoff — cli-update-files-fix

> Date : 2026-04-15
> Type : review
> Priorité : haute
> reviewedRange: db742ffb4a2be32539611f4ea91054e2dbea819e..INTEGRATION_SHA

---

## De : Claude

### Contexte

Fix critique une ligne : `.claude/` était absent du tableau `files` dans `package.json`. Résultat : `npm install -g claude-atelier` n'emballait pas le dossier template, et toute commande `claude-atelier update` ou `claude-atelier init` échouait avec :

```
✘ Template directory not found: /Users/.../.nvm/.../claude-atelier/.claude
```

Le bug était silencieux depuis le début — `init.js` contourne le problème en lisant depuis `src/` (qui était dans `files`), mais `update.js` lit directement depuis `.claude/` du package.

**Range analysé** : `db742ffb4a2be32539611f4ea91054e2dbea819e..5a28af1`
**Stats git** : 5 files changed, 20 insertions(+), 14 deletions(-)

**Commits dans le range :**

```text
5a28af1 fix(cli): ajoute .claude/ dans files npm — update et init trouvaient pas le templateDir
5a84fd2 docs(handoffs): renforce instruction LLM dans template + SKILL — vase communicant explicite
4e278f8 chore: release 0.20.4 — MAJ logo README (fix manuel GitHub front-end par Malik)
59fa215 Fix ASCII art formatting in README.md
56256c5 chore: release 0.20.3 — revert logo cassé
5a166be revert(readme): retour au logo ANSI Shadow original — pure-block était illisible
2db6a10 chore: release 0.20.2 — manifest validator + logo pure-block + fix shell-drift
b6609d7 docs(handoff): reviewedRange.to = sha commit d'intégration (db742ff)
```

### Question précise

**`update.js` a-t-il un trou de contrat sur la préservation des customisations utilisateur ?**

Voici ce que fait `copyDirRecursive` : elle copie **tout** le contenu de `.claude/` du package vers le `.claude/` du projet cible, récursivement, sans condition. Seule exception : `CLAUDE.md` merge le §0 de l'existant.

Trois angles à vérifier :

**(a) Écrasement de `settings.json`** — `settings.json` contient les permissions `allow`/`deny` configurées par l'utilisateur. Si l'utilisateur a ajouté ses propres règles (`allow: ["Bash(git:*)"]` etc.), `update` les écrase silencieusement. Est-ce un bug ou un design assumé ?

**(b) Écrasement des skills custom** — si l'utilisateur a créé `.claude/skills/mon-skill/SKILL.md`, `update` ne touche pas ce dossier (il n'existe pas dans le package), donc pas de problème. Mais si un skill livré par le package est modifié localement par l'utilisateur (ex: `.claude/skills/review-copilot/SKILL.md`), il est écrasé. Aucun avertissement. Faille ou comportement attendu d'un `update` ?

**(c) Absence de dry-run dans `npm run update`** — `--dry-run` existe en CLI mais rien dans `package.json` n'expose cette commande ni ne l'encourage. Un utilisateur qui lance `claude-atelier update` pour la première fois ne sait pas ce qu'il va perdre. Est-ce que le `console.log` post-update est suffisant comme seul feedback ?

### Fichiers à lire

```text
bin/update.js
bin/init.js
package.json
.claude/settings.json
```

### Contraintes / hors scope

- **Ne propose pas de migration vers un système de merge JSON sophistiqué** — on est en 0.20.x, on garde simple.
- **Ne remets pas en cause le choix `.claude/` comme source template** — décision prise vs `src/`.
- **Ignore les commits README et handoff template** — cosmétique, pas le sujet.
- **Pas de refactor architectural** — focus uniquement sur les trous de contrat de `update.js`.

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
Tu DOIS écrire ta réponse **directement dans CE MÊME FICHIER `.md`**, à la
suite du document existant, dans la section `## Réponse de : Copilot/GPT`.
**Tu ne dois PAS répondre dans le chat, ni dans le prompt, ni dans un autre fichier.**
Ce document est le **vase communicant** entre GPT et Claude : la réponse utile
doit vivre ici, pas ailleurs. Utilise ton outil d'édition de fichier
(Edit, Write, ou équivalent) pour écrire ci-dessous.
Quand tu as fini, dis simplement à l'utilisateur :
"J'ai écrit ma réponse dans [chemin du fichier]. Tu peux la montrer à Claude."

<!-- Réponse ci-dessous -->
