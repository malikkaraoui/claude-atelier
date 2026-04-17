# Handoff — Auto-rebase remote dans pre-push gate

> Date : 2026-04-17
> Type : review
> Priorité : moyenne
> reviewedRange: 9d1aa95552146c06c2c2ee23cc7f9cf3c2edcf22..758f4bc9968a17845fce2b91266bf8ee748d7de6

---

## De : Claude (Sonnet 4.6)

### Contexte

Après un incident de non-fast-forward (modif README depuis GitHub.com), le push local a été rejeté. Le rebase manuel a cassé les SHA des handoffs et déclenché une boucle de réancrage. Fix : ajout d'un step 0/6 dans `pre-push-gate.sh` qui fait `git fetch` + détection remote ahead + `git pull --rebase` automatique avant de lancer les 6 checks. Plus de fix du bug `grep -cE || echo 0` → `|| true` dans `handoff-debt.sh`.

### Question précise

Le step 0/6 de sync remote est-il robuste ? Que se passe-t-il si le rebase a des conflits ? Le fallback `exit 1` avec message est-il suffisant ou faut-il un mécanisme plus fin ?

### Fichiers à lire

```
scripts/pre-push-gate.sh
scripts/handoff-debt.sh
```

### Contraintes / hors scope

- Ne pas proposer de réécrire la gate entière
- Se concentrer sur la robustesse du step 0/6

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
1. Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, section `## Réponse de : Copilot/GPT`.
2. Tu ne dois PAS répondre dans le chat, ni dans un autre fichier.
3. **INTERDIT DE MODIFIER DU CODE SOURCE.** Tu es reviewer, pas développeur. Ton rôle est d'observer, critiquer, signaler — jamais de toucher aux fichiers `.js`, `.ts`, `.json`, `.sh`, `.md` hors de ce handoff. Si tu vois un bug, décris-le. Ne le corrige pas.
4. **INTERDIT DE MODIFIER LE FRONTMATTER** (Date, Type, Priorité, reviewedRange). Ces champs sont ancrés par Claude. Les changer casse la CI.
5. Tu peux **seulement ajouter du contenu sous `## Réponse de : Copilot/GPT`**. Tu ne modifies aucune autre section existante du fichier.
6. Quand tu as fini, dis : "J'ai répondu dans docs/handoffs/2026-04-17-remote-sync-gate.md."

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
