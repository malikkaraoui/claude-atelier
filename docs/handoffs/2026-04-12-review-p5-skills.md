# Handoff — Review P5 : skills, watchdog, token routing

> Date : 2026-04-12
> Type : review
> Priorité : haute

---

## De : Claude (Opus 4.6)

### Contexte

Depuis la dernière review GPT-5.4 (il y a quelques heures), 9 commits et 901
lignes modifiées. Le projet `claude-atelier` est passé de « config statique
installable » à « framework avec slash commands, supervision night-mode
validée, et gestion automatique du routing de tokens ».

Changements majeurs :
1. **8 skills créés** (`src/skills/`) inspirés du pattern BMAD-METHOD : chaque
   skill = un dossier avec `SKILL.md` comme entry point. Commandes :
   `/atelier-help`, `/atelier-setup`, `/review-copilot`, `/angle-mort`,
   `/audit-safe`, `/night-launch`, `/atelier-doctor`, `/token-routing`.
2. **Watchdog night-mode v4 validé** : tâche planifiée Cowork qui screenshot
   VSCode, clique auto sur les boutons "Allow", envoie iMessage si crash.
   Bash scripts supprimés, remplacés par outils natifs Anthropic.
3. **Token routing avec auto-montée/descente** : §18 monte automatiquement
   en `high` si champ lexical complexe, redescend après. Night-mode force
   `low/medium` pour économiser.
4. **§25 review Copilot automatique** : Claude propose un handoff sans
   attendre si feature terminée, bug fix critique, 100+ lignes, ou boucle.
5. **Permissions déverrouillées** : `Bash(*)` + deny list au lieu de 56
   règles au cas par cas. Zéro prompt de permission.
6. **Plan P5 complet** dans le roadmap : intégrations BMAD + QMD optionnelles,
   onboarding interactif, publication NPM repoussée à P6.

### Question précise

**Les 8 skills sont-ils bien conçus ?** Spécifiquement :
1. Le format SKILL.md (frontmatter + instructions) est-il assez clair pour
   qu'un LLM les exécute correctement ?
2. `/atelier-setup` couvre-t-il tous les cas d'un vrai onboarding ?
3. `/review-copilot` et `/angle-mort` : le workflow handoff est-il solide ?
4. `/token-routing` : le cycle montée/descente est-il cohérent ?
5. Manque-t-il un skill évident qu'on aurait dû créer ?
6. L'intégration BMAD + QMD comme options dans `/atelier-setup` est-elle
   la bonne approche ?
7. Quels sont les angles morts de cette architecture de skills ?

### Fichiers à lire

```text
src/skills/atelier-help/SKILL.md
src/skills/atelier-help/atelier-help.csv
src/skills/atelier-setup/SKILL.md
src/skills/review-copilot/SKILL.md
src/skills/angle-mort/SKILL.md
src/skills/audit-safe/SKILL.md
src/skills/night-launch/SKILL.md
src/skills/token-routing/SKILL.md
src/skills/atelier-doctor/SKILL.md
src/fr/CLAUDE.md (§18 et §25)
src/fr/autonomy/night-mode.md (watchdog v4)
docs/roadmap.md (section P5)
```

### Contraintes / hors scope

- Ne pas proposer de changer le format SKILL.md (on suit le standard BMAD)
- Ne pas proposer de publier sur NPM maintenant (décision prise : P6)
- Se concentrer sur la qualité des skills et les trous dans la couverture

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
Tu DOIS écrire ta réponse **directement dans ce fichier**, dans cette
section. N'écris PAS ta réponse dans le chat. Utilise ton outil d'édition
de fichier (Edit, Write, ou équivalent) pour écrire ci-dessous.
Quand tu as fini, dis simplement à l'utilisateur :
"J'ai écrit ma réponse dans docs/handoffs/2026-04-12-review-p5-skills.md.
Tu peux la montrer à Claude."

<!-- Réponse ci-dessous -->

---

## Intégration

<!-- Claude remplit après lecture de la réponse -->
