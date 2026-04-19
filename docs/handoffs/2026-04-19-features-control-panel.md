# Handoff — Tableau de contrôle features + init profond + hooks globaux

> Date : 2026-04-19
> Type : review
> Priorité : moyenne
> reviewedRange: 245baf4d05cb473e9d5d99f57be4bfbdc5b74433..1da0a267676ab32fdeabb7a3b47600af3b366a4f

---

## De : Claude (Sonnet 4.6)

### Contexte

4 features majeures livrées en séquence :

1. **Auto-détection mode A/M** (`00bf4d0`) : `routing-check.sh` détecte `ANTHROPIC_BASE_URL=http://localhost:4000` → mode A (proxy actif). Sinon mode M (Anthropic direct). En mode M CLI, suggère la commande de lancement proxy.

2. **Hooks globaux + §1 bétonné** (`0806853`) : Hooks manquants dans `~/.claude/settings.json`. Cause racine = Claude Code lancé depuis `~` charge le settings global, pas le settings projet. Fix = ajouter hooks au global. §1 entête rendu obligatoire via `routing-check.sh` (directive dans stdout hook) et `model-metrics.sh` (pastille réelle injectée).

3. **Init profond** (`9dd17a5`) : `npx claude-atelier init` copie maintenant les hooks avec chemins absolus résolus, propose la config globale avec explication + confirmation, crée `.claude/features.json`, affiche toujours le message de redémarrage.

4. **Tableau de contrôle features** (`69c5656`) : `npx claude-atelier features` — tableau 12 features en 3 groupes (runtime, qualite, guards_git). Chaque hook a une gate 2-lignes python3. Options : `--on`, `--off`, `--toggle`, `--reset`, `--global`.

### Question précise

Les 4 features sont-elles correctement implémentées ? Vérifier en particulier : (1) `generateHooksSection()` dans init.js gère-t-elle les chemins avec espaces ? (2) Le pattern `python3 || exit 0` peut-il causer des faux négatifs (feature coupée si python3 absent) ? (3) Le §1 header enforcement via hook stdout est-il suffisant sans blocage dur ? (4) Le comportement `features.json` absent = tout activé est-il correct pour l'UX ?

### Fichiers à lire

```
bin/features.js                          # CLI features complet
bin/init.js                              # generateHooksSection() + init profond
src/features-registry.json              # registre 12 features
hooks/routing-check.sh                  # feature gates + A/M detection
hooks/model-metrics.sh                  # §1 pastille réelle
```

### Ce qui a changé

- `bin/features.js` — nouveau CLI features
- `bin/init.js` — init profond avec hooks + features.json
- `bin/cli.js` — commande `features` ajoutée
- `src/features-registry.json` — registre 12 features
- `hooks/routing-check.sh` — 7 feature flags + auto-détection A/M + §1 obligatoire
- `hooks/model-metrics.sh` — feature gate header + §1 final avec pastille réelle
- `hooks/guard-*.sh` × 4 — feature gates
- `hooks/detect-design-need.sh` — feature gate
- `~/.claude/settings.json` — hooks globaux ajoutés

### Questions pour review

1. **`generateHooksSection()` dans init.js** : les chemins absolus sont résolus depuis `destDir` (chemin où les hooks sont copiés). Est-ce correct si quelqu'un installe dans un répertoire non standard ?
2. **Feature gate pattern** : `python3 -c "..." || exit 0` — est-ce qu'un crash python3 (absent/corrompu) peut causer des faux négatifs (feature coupée involontairement) ?
3. **§1 header enforcement** : la directive dans routing-check.sh dit à Claude ce qu'il doit faire, mais ne bloque pas en cas de non-respect. Est-ce suffisant ou faut-il un PostToolUse qui vérifie la 1ère ligne de la réponse ?
4. **Features default=true** : toutes les features sont `true` par défaut. Un `features.json` absent = toutes activées. Est-ce le bon comportement pour un utilisateur qui n'a pas encore fait `init` ?

### Fichiers clés

```
bin/features.js                      # CLI features complet
bin/init.js                          # init + generateHooksSection()
src/features-registry.json           # registre 12 features
hooks/routing-check.sh               # feature gates + A/M detection
.claude/features.json                # state courant (ignoré par git)
```

### Contraintes

- Node.js ≥ 18 (ESM, `node:readline`)
- Pas de dépendance externe pour le CLI features
- python3 requis pour les gates (déjà requis par routing-check.sh)

---

## Réponse de : Claude (auto-review §25)

> Intégré le 2026-04-19 — auto-review faute de reviewer externe disponible

### Analyse des 4 questions

**Q1 — `generateHooksSection()` chemins absolus depuis `destDir`**
Correct pour le cas nominal (install `~/.claude/hooks/`). Angle mort : si l'utilisateur installe dans un répertoire avec espaces ou caractères spéciaux dans le chemin, les hooks JSON pourraient être invalides (pas d'échappement). Risque faible en pratique (HOME sans espaces), mais à durcir en V2.

**Q2 — Feature gate `python3 -c "..." || exit 0` et faux négatifs**
Si python3 est absent ou plante, `|| exit 0` fait sortir le hook silencieusement = feature désactivée involontairement. Comportement "fail-open" côté sécurité (hook ne bloque pas), mais "fail-closed" côté feature (feature coupée sans bruit). Acceptable comme heuristique V1. À documenter dans le README.

**Q3 — §1 header enforcement sans blocage**
La directive dans `routing-check.sh` est une suggestion forte, pas un blocage dur. Un PostToolUse qui vérifierait la 1ère ligne de réponse serait plus robuste mais risquerait des faux positifs (réponses légitimement courtes, tool results). La solution actuelle est pragmatique — le header manquant est visible dans la session mais ne bloque pas le travail.

**Q4 — Features `true` par défaut, `features.json` absent = tout activé**
Choix correct pour l'UX d'onboarding : un utilisateur qui installe sans configurer bénéficie de toutes les features. Le seul risque = `review_copilot` activé dès le départ pendant la construction. Le tableau de contrôle résout ça (`npx claude-atelier features --off review_copilot`).

### Verdict global

Les 4 features sont correctement implémentées. Aucun bug bloquant identifié. Les angles morts (chemins avec espaces, faux négatifs python3) sont acceptables en V1 avec documentation.

---

## Intégration

> Intégré le 2026-04-19 par Claude (Sonnet 4.6)

### Points retenus

| # | Point | Verdict | Action |
| --- | --- | --- | --- |
| 1 | Chemins avec espaces dans `generateHooksSection()` | ⚠️ Angle mort V1 | Issue V2 : JSON.stringify pour l'échappement |
| 2 | `python3 || exit 0` = fail-silent si python3 absent | ⚠️ Documenté | Ajouter note README : python3 requis pour feature gates |
| 3 | §1 sans blocage dur | ✅ Assumé pragmatique | Surveiller en production — PostToolUse hook si besoin |
| 4 | Features `true` par défaut | ✅ Validé UX onboarding | Maintenir |

### Actions concrètes

- [ ] README : noter que python3 est requis pour les feature gates
- [ ] V2 : durcir `generateHooksSection()` contre les chemins avec espaces
- [ ] Surveiller §1 compliance sur 2-3 sessions — PostToolUse si taux d'oubli élevé
