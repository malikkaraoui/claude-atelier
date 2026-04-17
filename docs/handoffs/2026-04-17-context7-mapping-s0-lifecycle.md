# Handoff — Context7 Mapping + §0 Lifecycle

> Date : 2026-04-17
> Type : review
> Priorité : haute
> reviewedRange: c076125..HEAD (uncommitted)

---

## De : Claude (Sonnet 4.6)

### Contexte

Session d'architecture sur l'intégration Context7 dans claude-atelier. Malik a voulu comprendre ce que Context7 apportait concrètement, en termes de dev, d'utilité, d'exécution et surtout d'impact sur les tokens. Suite à cette analyse, trois évolutions ont été livrées :

1. **Satellite `context7-mapping.md`** — Un fichier dans `.claude/ecosystem/` qui mappe chaque combinaison Phase × Stack (depuis §0) vers les librairies Context7 à charger. Couvre : tous les langages (JS, Python, Java, Rust, Go, C/C++, C#, Swift, Kotlin), tous les frameworks web (Next.js, FastAPI, Django, Spring Boot, NestJS…), toutes les plateformes cloud (Firebase, GCP, AWS, Azure), et les SDKs IA (AI SDK, Anthropic, LangChain, OpenAI, Ollama).

2. **§0 Obligation non négociable** — Si `Phase` ou `Stack` est vide (`—`) en début de session, Claude doit bloquer et demander le contexte projet avant toute action. Raison : sans §0 renseigné, le modèle recommandé, les docs chargées et le stack satellite sont tous incorrects.

3. **§0 Logbook de clôture** — En fin de session significative, Claude met à jour §0 automatiquement (Phase, Stack, Next step) pour que la session suivante reprenne exactement là où on s'est arrêtés, via la persistance fichier.

4. **Compression CLAUDE.md** — 156 → 148 lignes. Prose compressée (articles, filler, hedges supprimés), structure et sémantique intactes.

### Question précise

Review complète sur trois axes :

1. **Satellite context7-mapping.md** : La couverture des stacks est-elle pertinente ? Le mapping Phase → comportement context7 (aucun en brainstorming, complet en implémentation) est-il bien calibré ? Y a-t-il des stacks ou combinaisons manquantes qui seraient utiles ?

2. **§0 comme point de contrôle** : L'obligation de bloquer si §0 est vide est-elle trop agressive ? Le logbook de clôture auto est-il suffisant ou risque-t-il de dériver (mauvaise inférence de phase) ? Proposer des garde-fous si nécessaire.

3. **Compression CLAUDE.md** : La compression syntaxique a-t-elle introduit des ambiguïtés ? Les règles critiques (§5, §22) restent-elles parfaitement claires ?

### Fichiers à lire

```
.claude/CLAUDE.md                           — core compressé (148 lignes)
.claude/ecosystem/context7-mapping.md       — satellite context7 (nouveau)
```

### Diff CLAUDE.md (résumé des changements)

```diff
+ §0 OBLIGATION : bloquer si Phase/Stack vide
+ §0 Logbook de clôture : MAJ auto en fin de session
+ §10 Context7 : branchement satellite context7-mapping.md
~ §3 Flow : bullet list compressée en 2 lignes
~ §4 Format : 3 points fusionnés en 1 ligne
~ §15 Token Management : prose compressée (-40%)
~ §20 : "Ce fichier" → "Évolue"
```

### Contraintes / hors scope

- Ne pas proposer de réécrire le satellite complet — review ciblée
- Ne pas toucher aux règles absolues (§5, §21, §22) — intouchables
- Se concentrer sur ce qui est fragile, ambigu ou manquant

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
Tu DOIS écrire ta réponse directement dans **ce même fichier `.md`**, à la
suite du document existant, dans la section `## Réponse de : Copilot/GPT`.
Tu ne dois PAS répondre dans le chat, ni dans le prompt, ni dans un autre fichier.
Ce document est le vase communicant entre GPT et Claude. Utilise Edit/Write.
Quand tu as fini, dis : "J'ai répondu dans docs/handoffs/2026-04-17-context7-mapping-s0-lifecycle.md."

---

## Intégration
<!-- Claude remplit après lecture de la réponse -->
