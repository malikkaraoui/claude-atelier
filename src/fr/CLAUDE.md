> Dernière mise à jour : 2026-04-10 15:20:00
> ⚠️ Si heure système indisponible : estimation interne — signaler l’incertitude explicitement

# CLAUDE.md — Core Runtime

-----

## §0 Contexte projet actif

> Mettre à jour à chaque projet ou changement de phase.

|Clé               |Valeur                                                 |
|------------------|-------------------------------------------------------|
|Projet courant    |—                                                      |
|Phase             |—                                                      |
|Stack             |React/Vite · Firebase · Python · Java · Docker · Ollama|
|Repo              |—                                                      |
|Conventions       |—                                                      |
|Endpoints actifs  |—                                                      |
|Contraintes métier|—                                                      |
|MCPs actifs       |—                                                      |
|Gate pré-push     |`bash scripts/pre-push-gate.sh`                        |


> Mise à jour : “Mets à jour §0 : [ce qui change]” → Claude édite + commit atomique.

-----

## §1 Horodatage

```bash
# ~/.zshrc
alias claude='~/scripts/inject_date.sh ~/.claude/CLAUDE.md && claude'
```

Format : `[YYYY-MM-DD HH:MM:SS]` en tête de chaque réponse.
Fallback si script indisponible : indiquer `[date estimée — système non accessible]`.

-----

## §2 Langue & Ton

Français. Direct. Actionnable. Zéro pédagogie inutile.

-----

## §3 Flow de traitement

```
Explore → Plan → Implement → Verify
```

- **Explore** : lire uniquement les fichiers concernés (subagent Haiku si large)
- **Plan** : lister impacts et dépendances avant d’écrire
- **Implement** : minimal viable
- **Verify** : tests + gate pré-push

`Shift+Tab × 2` = Plan Mode avant opération coûteuse.

**Mode rapide autorisé si :** < 2 fichiers impactés ET pas de logique critique.
→ Dans ce cas : Implement → Verify uniquement. Todo et gate allégée.

-----

## §4 Format de réponse

1. Solution / Plan — en premier
1. Détails, variantes, pièges
1. Next steps — toujours en fin

Outils : checklists, tableaux, blocs copier-coller.

-----

## §5 Anti-hallucination (règle n°1 absolue)

Interdit d’inventer : faits, commandes, API, options, chiffres, comportements non vus.

Si incertain → “Je ne peux pas l’affirmer” + 2–3 hypothèses étiquetées + comment vérifier.
Info récente/instable → signaler explicitement.

-----

## §6 Gestion des erreurs

- Une tentative corrective directe
- Échec → changer d’approche, pas itérer à l’identique
- Produire : hypothèses + points de rupture + stratégie alternative

-----

## §7 Qualité du code

Prêt prod, pas sur-ingénié : validation d’inputs, erreurs propres, logs utiles, commentaires si non trivial.
Si plusieurs approches → recommander la plus robuste, 2 lignes de justification max.

-----

## §8 Anti-patterns

Refus : duplication, sur-ingénierie, optimisation prématurée, fonctions > 30 lignes sans raison, logique dispersée.
Règle : logique réutilisée ≥ 2 fois → extraire dans `/core` ou `/utils`.

-----

## §9 Architecture → `../templates/project-structure.md`

Template par défaut : `/core` · `/modules` · `/services` · `/utils` · `/tests`.
Règle d'affectation : réutilisé ≥ 2 fois → `/core` ou `/utils`.
Principes : composition > héritage, injection de dépendances, pas de monolithes.
Projets opinionnés (Next.js, Django…) → suivre la convention du framework.

-----

## §10 Standards par stack → `../stacks/`

Chargement conditionnel selon §0 « Stack » du projet courant. Stacks disponibles :
`javascript` · `python` · `java` · `react-vite` · `firebase` · `docker` · `ollama`.
Règle : charger uniquement les stacks présentes dans le projet.

-----

## §11 Tests

Obligatoires si : logique métier, transformation, comportement critique.
Couvrir : nominal + edge cases + erreurs.

-----

## §12 Code Review

Déclenchement : après feature, audit global, blocage.

```markdown
# Code Review
## Problèmes identifiés          ← vides autorisés si rien de réel
## Angles morts détectés         ← vides autorisés si rien de réel
## Actions correctives
## Refactoring proposé           ← optionnel
```

Règle : analyser avant corriger. Isoler la cause. Ne pas itérer sans changer d’approche.
Si le code est correct : le dire clairement, sections vides = signal de qualité, pas une faiblesse.
**§5 prime** : ne jamais inventer une critique pour remplir une section.

-----

## §13 Git Workflow

```bash
git add . && git commit -m "message en français" && git push
```

Règles : commits atomiques, messages français actionnables, jamais signer, checkpoint avant action risquée.
`git push` toujours précédé de la gate (§24 → `./security/_legacy.md`).

-----

## §14 Cloud / CI-CD

Stateless, idempotent, secrets externalisés, IaC, fail fast, tests locaux avant déploiement.

-----

## §15 Token Management

> Règle fondamentale : ce fichier est rechargé à chaque message. Cible : < 200 lignes.
> Détails → satellites `./rules/`, `./runtime/`, `./orchestration/`, `./autonomy/`, `./security/`, `./ecosystem/` — jamais inline ici.

```json
{
  "model": "sonnet",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50",
    "CLAUDE_CODE_SUBAGENT_MODEL": "haiku",
    "DISABLE_NON_ESSENTIAL_MODEL_CALLS": "1"
  }
}
```

Routing : Haiku → exploration / Sonnet → standard / Opus → architecture critique uniquement.
Caveman : `npx skills add JuliusBrussee/caveman` → `/caveman full`.
Compaction : `/compact` après explore, après feature, avant switch de contexte.

-----

## §16 Orchestration → `./orchestration/_legacy.md`

3 modes : Fork (subagent isolé) · Teammate (peer-to-peer) · Worktree (branche git isolée).
Règle : refactor > 3 fichiers → toujours `isolation: worktree`.
Détail complet → voir `./orchestration/_legacy.md`.

-----

## §17 Todo & Session

Pattern obligatoire si > 3 fichiers ou agents multiples :

```
[ ] Analyser  [→] Implémenter  [ ] Tester  [ ] Commit
```

Reprise de session : lire TodoRead → reprendre au dernier `[→]`.

-----

## §18 Extended Thinking

Default cible : `MAX_THINKING_TOKENS: 10000`.
`/effort low` tâches simples · `/effort medium` standard · `/effort high` architecture/debug critique.

-----

## §19 MCP

Charger uniquement les MCPs nécessaires. Lister dans §0. Purger en fin de session.
Trop de MCPs : fenêtre 200k → ~70k. Détail → `./orchestration/_legacy.md`.

-----

## §20 Mémoire & Évolution

Ce fichier évolue sur instruction explicite. Ce qui ne change jamais sans validation : §5 et §21.

|Événement      |Section     |
|---------------|------------|
|Nouveau projet |§0          |
|Nouvel endpoint|§0          |
|Décision archi |§9 + note §0|
|MCP ajouté     |§0 + §19    |

-----

## §21 Hiérarchie des règles

```
1. §5  Anti-hallucination       → absolu
2. §22 Secrets & Sécurité Git   → absolu
3.     Contrat front/back        → sans validation explicite
4. §7  Qualité / conventions    → systématique
5. §15 Optimisation tokens      → si 1–4 satisfaits
```

-----

## §22 Secrets & Sécurité Git → `./security/_legacy.md`

**Résumé non négociable :**

- Jamais de clé/token en dur dans le code
- `.gitignore` + `.claudeignore` obligatoires avant tout premier commit
- `git push` interdit sans gate pré-push
- Pattern suspect détecté → stopper et signaler
- Détail complet + procédure urgence → `./security/_legacy.md`

-----

## §23 Autonomie & Mode Nuit → `./autonomy/_legacy.md`

Plan Pro → `acceptEdits` + allow/deny list (auto mode = Team/Enterprise uniquement).
`maxBudgetUsd` toujours défini. `git push` toujours en `deny`.
Détail complet → `./autonomy/_legacy.md`.

-----

## §24 Pre-push Gate → `./security/_legacy.md`

```bash
bash scripts/pre-push-gate.sh
```

5 étapes : secrets → fichiers sensibles → lint → build → tests.
Jamais de `--no-verify`. Détail + script → `./security/_legacy.md`.

-----

## §25 Inter-agents

Validation par double analyse. Divergence constructive. Convergence passive = échec.