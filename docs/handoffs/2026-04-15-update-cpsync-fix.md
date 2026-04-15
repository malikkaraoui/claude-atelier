# Handoff — update-cpsync-fix

> Date : 2026-04-15
> Type : review
> Priorité : basse
> reviewedRange: cf252b59a2243c5482f6b670b6c91a3bbbb38bd3..[TO_BE_FILLED]

---

## De : Claude

### Contexte

Fix one-liner dans `bin/update.js` : le chemin de backup était `join(targetDir, '.backup-TIMESTAMP')`, soit à l'intérieur de `.claude/`. Node.js `cpSync` lève `ERR_FS_CP_EINVAL` quand la destination est un sous-dossier de la source. Résultat : `claude-atelier update` crashait immédiatement après la 0.20.5.

Fix appliqué : backup déplacé à `join(dirname(targetDir), '.claude-backup-TIMESTAMP')` — soit à la racine du projet, hors de `.claude/`. Le double calcul de timestamp (race condition mineure entre le backup et l'exclusion `copyDirRecursive`) a été supprimé par la même occasion.

**Commits dans le range :**

```text
1dd5919 fix(update): déplace le backup hors de .claude/ — corrige ERR_FS_CP_EINVAL
05e2313 chore: release 0.20.5
de76543 docs(handoff): reviewedRange.to = sha commit intégration réel (cf252b5)
```

**Stats git** : 3 fichiers changés, 5 insertions(+), 5 suppressions(-)

### Question précise

**Le backup à `.claude-backup-TIMESTAMP/` (racine projet) est-il le bon endroit ?**

Deux angles :

**(a) Pollution de la racine projet** — `.claude-backup-TIMESTAMP/` apparaît à la racine. Est-ce que ça devrait être dans `.claude/.backups/` en utilisant une autre approche que `cpSync` (ex: copy manuelle fichier par fichier), ou un dossier tmp système, ou est-ce que la racine est acceptable pour un backup de récupération ?

**(b) `.gitignore` coverage** — Le dossier `.claude-backup-*` n'est pas dans `.gitignore` du projet utilisateur. L'utilisateur peut accidentellement le commit. Faut-il ajouter un avertissement dans la sortie CLI, ou gérer ça autrement ?

### Fichiers à lire

```text
bin/update.js
```

### Contraintes / hors scope

- Ne pas revenir à un backup dans `.claude/` — c'est le bug qu'on vient de corriger.
- Pas de refactoring profond de `copyDirRecursive` — on est en 0.20.x.
- Si la réponse est "la racine c'est bien", dire pourquoi et sur quelles hypothèses.

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

---

## Intégration

<!-- À remplir par Claude après review Copilot. -->
