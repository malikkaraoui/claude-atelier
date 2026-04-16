# Handoff — Post-install experience : checks, welcome screen, gen-help

> Date : 2026-04-16
> Type : review
> Priorité : moyenne
> reviewedRange: 68d62806af514712c6b8987b69c9bdbdd1bec359..bd3d69e

---

## De : Claude (Sonnet 4.6)

### Contexte

Trois modules ajoutés au CLI `claude-atelier` pour améliorer l'expérience post-install/update :

**1. `bin/post-install-checks.js`** — lancé après chaque `init` et `update`
- `npm audit --audit-level=high` (non-bloquant, affiche le résultat)
- `node test/lint-npm-files.js` — vérifie que tous les répertoires référencés par les scripts CLI sont dans `package.json#files`

**2. `bin/welcome.js`** — écran d'accueil adaptatif selon l'état du projet
- Lit et parse §0 de `CLAUDE.md` (7 champs analysés)
- Classifie : **vide** (< 20% rempli), **amorçage** (20–70%), **mature** (> 70%)
- Adapte le message : instructions bootstrap / liste des champs manquants / résumé projet
- Affiche toujours : version, action (init/update), footer avec lien docs

**3. `src/features.json` + `scripts/gen-help.js`** — auto-génération du HELP CLI
- `features.json` = source de vérité des commandes, options, highlights
- `gen-help.js` regenerate le bloc `const HELP = \`...\`` dans `bin/cli.js` à partir du JSON
- Câblé dans `preversion` : `gen-help → version-gate` → HELP toujours sync avant bump

**Câblage dans `init.js` et `update.js` :**
```
init/update
  → setup-s0 (wizard §0)        [existant]
  → runPostInstallChecks()       [nouveau]
  → showWelcome()                [nouveau]
  → check version npm            [existant]
```

**Également dans ce range (commits précédents) :**
- README : ajout pastilles token routing (⬆️/⬇️/🟢) + modes M/A
- `hooks/routing-check.sh` + `session-model.sh` : petits ajustements
- `scripts/switch_model.py` : corrections mineures
- Handoff VS Code switch V2 intégré (doc uniquement)

### Question précise

Review l'ensemble du mécanisme post-install (les 3 nouveaux fichiers + leur câblage) :

1. **`bin/welcome.js`** — la classification vide/amorçage/mature est-elle robuste ? Le parser §0 peut-il casser sur des CLAUDE.md atypiques (lignes supplémentaires, formatage légèrement différent) ?

2. **`bin/post-install-checks.js`** — `npm audit` dans `projectRoot` vs `pkgRoot` : est-ce le bon répertoire ? Un utilisateur qui installe `claude-atelier` globalement (`--global`) va lancer audit dans son CWD, pas dans le répertoire du package npm — est-ce intentionnel ou un bug ?

3. **`scripts/gen-help.js`** — la regex de remplacement du bloc HELP dans cli.js est-elle fragile ? Si quelqu'un édite cli.js manuellement et casse la structure `const HELP = \`...\``, gen-help ne pourra plus le trouver. Y a-t-il un fallback ou une vérification ?

4. **Cohérence globale** — le flow `setup-s0 → post-install-checks → welcome` a-t-il le bon ordre ? Est-ce qu'il manque quelque chose pour qu'un utilisateur fraîchement installé soit vraiment guidé ?

### Fichiers à lire

- `bin/welcome.js` (161 lignes — logique classification + affichage)
- `bin/post-install-checks.js` (39 lignes — npm audit + lint-npm-files)
- `scripts/gen-help.js` (82 lignes — regex remplacement HELP)
- `src/features.json` (37 lignes — source de vérité commandes)
- `bin/init.js` (lignes ~229–260 — câblage post-setup-s0)
- `bin/update.js` (lignes ~200–215 — câblage post-copy)

### Contraintes / hors scope
- Ne pas proposer de réécrire ce qui fonctionne
- Se concentrer sur ce qui est fragile ou manquant
- Le mécanisme §0 est intentionnellement non-bloquant (utilisateur peut skip)

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, à la
suite du document existant, dans la section `## Réponse de : Copilot/GPT`.
Tu ne dois PAS répondre dans le chat, ni dans le prompt, ni dans un autre fichier.
Ce document est le vase communicant entre GPT et Claude. Utilise Edit/Write.
Quand tu as fini, dis : "J'ai répondu dans [chemin du fichier]."

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
