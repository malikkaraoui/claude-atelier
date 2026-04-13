---
id: mode-nuit
title: Mode Nuit
---

Le mode nuit permet de laisser Claude travailler en autonomie complète pendant que vous dormez : commit → gate → push, sans intervention humaine.

---

## Principe

```
Soir : specs claires + watchdog configuré
         ↓
Claude travaille en acceptEdits
         ↓
Commits atomiques → gate pré-push → git push
         ↓
Matin : review du diff + log
```

---

## Pré-requis

- `.claudeignore` configuré
- `settings.json` avec `defaultMode: acceptEdits`
- `maxBudgetUsd` défini (obligatoire — sinon boucle infinie possible)
- `sudo` et `rm -rf` en `deny`
- Specs écrites dans `docs/specs.md`

---

## Lancer une session de nuit

```bash
claude --permission-mode acceptEdits \
  "Implementer selon docs/specs.md. \
   Ecrire les tests. \
   Committer chaque etape atomique. \
   Lancer bash scripts/pre-push-gate.sh apres chaque commit. \
   Si gate verte : git push. Si echec : stopper et noter dans todo."
```

---

## Format de specs

```markdown
# Objectif
<une phrase>

# Contexte
<fichiers concernés, contraintes, tests à passer>

# Critère de réussite
<conditions pour considérer la tâche faite>

# Hors scope
<ce qu'il ne faut PAS toucher>
```

:::warning Specs vagues = divergence garantie
Toujours inclure « Hors scope ». Sans ça, Claude interprète librement.
:::

---

## Le Watchdog

Tâche planifiée dans l'**app Claude desktop** (Programmé → + Nouvelle tâche).

| Paramètre | Valeur |
|---|---|
| Fréquence | Horaire |
| Modèle | Claude Haiku 4.5 |
| Connecteurs | Read and Send iMessages |
| Computer use | Activé |

### Comportements v4

| Situation | Action |
|---|---|
| Commit < 15 min | Termine silencieusement |
| Bouton permission visible | Screenshot → clic auto → iMessage |
| Spinner actif | Termine silencieusement |
| Session crashée | iMessage alerte |
| Quota limit | Silence → attend 1h → clic + Return |
| Erreur API 500 | iMessage uniquement — ne touche pas VSCode |

:::danger Règle absolue
Le watchdog **n'interagit jamais avec VSCode** lors d'une erreur API 500. iMessage uniquement.
:::

---

## Protocole REPRISE

Déclencheurs reconnus :

- `REPRISE suite à la limite de quota`
- `relance suite a une erreur API Anthropic`
- `relance` (mot seul)

Comportement :
1. Ne pas demander d'explication
2. Lire le TodoWrite → tâches `[ ]` ou `[→]`
3. `git log -5` pour le contexte
4. Reprendre là où c'était arrêté
5. `[REPRISE] Relancé après <cause>. Reprise depuis : <tâche>`

---

## Review le matin

```bash
git log --oneline
git diff origin/main..HEAD
bash scripts/pre-push-gate.sh
git push  # si gate verte
```

---

## Quand ce mode est une mauvaise idée

- Décision architecturale ouverte
- Inconnues métier (Claude va improviser)
- Première session sur un projet inconnu (§0 vide)
- Refactor sur du code non documenté
