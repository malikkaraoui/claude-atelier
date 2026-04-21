---
name: copilot-loop
description: "Loop autonome PR → Copilot review → handoff JSON → fixes → merge. Lance le polling automatique après un git push sur une branche feature. Zéro intervention utilisateur."
figure: La Bise
---

# Copilot Loop

> 🌬️ La Bise surveille la boîte aux lettres GitHub.
> Quand Copilot répond, elle lit, intègre, corrige et ferme la boucle.
> Sans un mot de l'utilisateur.

Loop autonome complet : PR feature → Copilot review automatique → handoff JSON → fixes → merge main.

## Quand utiliser

Lancer immédiatement après `git push` sur une branche feature + `gh pr create`.
Le loop tourne en arrière-plan via `ScheduleWakeup`.

## Procédure

### Étape 1 — Collecter le contexte de départ

```bash
PR_NUM=$(gh pr view --json number -q .number)
CURRENT_SHA=$(git rev-parse HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
LAST_HANDOFF=$(ls -t docs/handoffs/202*.json 2>/dev/null | grep -v _template | head -1 || echo "")
```

### Étape 2 — Activer le loop via ScheduleWakeup

Appeler `ScheduleWakeup` avec :
- `delaySeconds: 300` (5 minutes)
- `reason: "Polling Copilot review PR #N (tentative X/12)"`
- `prompt` : le prompt de réveil ci-dessous (auto-suffisant)

**Prompt de réveil (template)** — remplacer les variables :

```
Loop Copilot PR #[PR_NUM] branche [BRANCH] — tentative [X]/12.
Repo: [REPO] (ex: malikkaraoui/claude-atelier — dérivé de gh repo view).

1. Vérifier la review Copilot :
   gh pr view [PR_NUM] --json reviews | python3 -c "import json,sys; rs=json.load(sys.stdin)['reviews']; [print(r['author']['login'], r['commit']['oid'][:8]) for r in rs]"

2. Si Copilot a reviewé le commit [CURRENT_SHA][:8] :
   a. Lire les commentaires inline :
      gh api repos/[REPO]/pulls/[PR_NUM]/comments
   b. Créer docs/handoffs/[DATE]-[SLUG].json à partir de _template.json.
      Champs minimum requis par validate-handoff.js :
      - meta.date (YYYY-MM-DD), meta.type, meta.reviewedRange (sha..sha valides dans git)
      - from.question (≥ 50 chars), from.filesToRead (≥ 1 fichier réel)
      - response.model = "github-copilot-pr-reviewer"
      - response.content = résumé structuré des commentaires (≥ 100 chars)
      - integration.retained_implement, integration.verdict (total ≥ 100 chars)
   c. Appliquer les fixes suggérés dans le code
   d. Valider le handoff : node test/validate-handoff.js [HANDOFF_FILE]
   e. Si valide :
      git add [HANDOFF_FILE] [fichiers modifiés]
      git commit -m "fix: appliquer review Copilot #[PR_NUM]"
      git push
   f. Vérifier CI : gh pr view [PR_NUM] --json statusCheckRollup
   g. Si CI verte ET handoff valide → merger :
      gh pr merge [PR_NUM] --merge --delete-branch
      git checkout main && git pull
      LOOP TERMINÉ ✅

3. Si Copilot n'a pas encore reviewé ce commit :
   - Si tentative < 12 → ScheduleWakeup 300s (tentative X+1/12)
   - Si tentative = 12 → "Copilot n'a pas reviewé après 1h — merger manuellement ?"

Filets de sécurité :
- Ne jamais merger si CI échoue
- Ne jamais merger si handoff invalide (node test/validate-handoff.js retourne exit 1)
- Ne jamais merger si Copilot a des commentaires bloquants non traités
- Stopper après 12 tentatives (1h max)
```

### Étape 3 — Confirmer à l'utilisateur

"Loop Copilot activé sur PR #[N] — je surveille toutes les 5 min (max 1h).
Je mergerai automatiquement quand :
- Copilot a reviewé ✓
- Handoff JSON valide ✓  
- CI verte ✓
Je vous notifie au merge ou si timeout."

## Règles

- Toujours valider le handoff avant de merger (exit code 0 de validate-handoff.js)
- Toujours vérifier CI verte avant de merger
- Max 12 tentatives (1h) — au-delà, notifier et laisser l'utilisateur décider
- Ne pas re-committer si le handoff n'a pas changé (éviter les commits vides)
- Un seul loop actif par PR à la fois
