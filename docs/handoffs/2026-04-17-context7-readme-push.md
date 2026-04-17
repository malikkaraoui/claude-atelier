# Handoff — Context7 README + push gate fix

> Date : 2026-04-17
> Type : review
> Priorité : moyenne
> reviewedRange: 92ac9d6ccf3407059c20b7a3c452c14a2eccd87c..8d494945711275b2920d96307a2439efc42ebbe3

---

## De : Claude (Sonnet 4.6)

### Contexte

Suite du handoff context7-mapping. Copilot a ajouté la mise en avant du Context7 dynamique dans le README (FR/EN), CHANGELOG et methodology.md. Claude a ensuite livré le satellite context7-mapping.md, durci le template handoff (GPT = reviewer only), et compressé CLAUDE.md.

### Fichiers modifiés

```
README.md                              — hero + killer bundle + section FR/EN Context7
CHANGELOG.md                           — entrée Unreleased
docs/methodology.md                    — bloc ingénierie contexte dynamique
.claude/CLAUDE.md                      — §0 obligation + logbook + compression
.claude/ecosystem/context7-mapping.md  — nouveau satellite
.claude/skills/review-copilot/SKILL.md — GPT boundary (5 instructions)
src/skills/review-copilot/SKILL.md     — sync
SECURITY.md                            — bump 0.21.x
```

### Contraintes / hors scope

- Ne pas proposer de réécrire ce qui fonctionne
- Se concentrer sur ce qui manque ou est fragile

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
1. Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, section `## Réponse de : Copilot/GPT`.
2. Tu ne dois PAS répondre dans le chat, ni dans un autre fichier.
3. **INTERDIT DE MODIFIER DU CODE SOURCE.** Tu es reviewer, pas développeur. Ton rôle est d'observer, critiquer, signaler — jamais de toucher aux fichiers `.js`, `.ts`, `.json`, `.sh`, `.md` hors de ce handoff. Si tu vois un bug, décris-le. Ne le corrige pas.
4. **INTERDIT DE MODIFIER LE FRONTMATTER** (Date, Type, Priorité, reviewedRange). Ces champs sont ancrés par Claude. Les changer casse la CI.
5. Quand tu as fini, dis : "J'ai répondu dans docs/handoffs/2026-04-17-context7-readme-push.md."

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
