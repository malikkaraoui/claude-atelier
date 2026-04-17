# Handoff — Handoff boundary + bugfix grep

> Date : 2026-04-17
> Type : review
> Priorité : haute
> reviewedRange: 9255ad527c5d9fe885ee31b08b47dfb67856abc5..67dc178d9e6c97b88243b4303e373302209b90f3

---

## De : Claude (Sonnet 4.6)

### Contexte

Deux corrections suite à un incident de boucle CI causé par un handoff mal cadré :

1. **GPT boundary dans review-copilot/SKILL.md** — Le template de handoff n'interdisait pas explicitement à GPT/Copilot de modifier du code source ou le frontmatter. Résultat : GPT a modifié le `reviewedRange`, cassé `validate-handoff.js`, empêché la dette §25 de se résoudre, bloquant la CI en boucle. Fix : 5 instructions numérotées dans la section "INSTRUCTION POUR LE LLM QUI REPOND", dont interdiction de toucher au code et au frontmatter.

2. **Bug `handoff-debt.sh` ligne 109** — `grep -cE "pattern" || echo 0` produisait `0\n0` (deux tokens) quand zéro match, car `grep -c` retourne exit code 1 sur zéro match, déclenchant le `echo 0` qui s'ajoutait au `0` de grep. `[[ $FEAT_COUNT -gt 0 ]]` recevait deux arguments → syntax error bash. Fix : `|| true` au lieu de `|| echo 0`.

### Question précise

Le durcissement GPT boundary est-il suffisant ? Les 5 instructions couvrent-elles tous les cas de débordement possibles ? Le fix grep est-il correct ou y a-t-il d'autres occurrences du même pattern dans les scripts ?

### Fichiers à lire

```
.claude/skills/review-copilot/SKILL.md
src/skills/review-copilot/SKILL.md
scripts/handoff-debt.sh
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
5. Quand tu as fini, dis : "J'ai répondu dans docs/handoffs/2026-04-17-handoff-boundary-bugfix.md."

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
