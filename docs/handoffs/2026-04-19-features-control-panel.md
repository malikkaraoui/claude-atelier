# Handoff — Tableau de contrôle features + init profond + hooks globaux

> Date : 2026-04-19
> Type : review
> Priorité : moyenne
> reviewedRange: 245baf4d05cb473e9d5d99f57be4bfbdc5b74433..HEAD

---

## De : Claude (Sonnet 4.6)

### Contexte

4 features majeures livrées en séquence :

1. **Auto-détection mode A/M** (`00bf4d0`) : `routing-check.sh` détecte `ANTHROPIC_BASE_URL=http://localhost:4000` → mode A (proxy actif). Sinon mode M (Anthropic direct). En mode M CLI, suggère la commande de lancement proxy.

2. **Hooks globaux + §1 bétonné** (`0806853`) : Hooks manquants dans `~/.claude/settings.json`. Cause racine = Claude Code lancé depuis `~` charge le settings global, pas le settings projet. Fix = ajouter hooks au global. §1 entête rendu obligatoire via `routing-check.sh` (directive dans stdout hook) et `model-metrics.sh` (pastille réelle injectée).

3. **Init profond** (`9dd17a5`) : `npx claude-atelier init` copie maintenant les hooks avec chemins absolus résolus, propose la config globale avec explication + confirmation, crée `.claude/features.json`, affiche toujours le message de redémarrage.

4. **Tableau de contrôle features** (`69c5656`) : `npx claude-atelier features` — tableau 12 features en 3 groupes (runtime, qualite, guards_git). Chaque hook a une gate 2-lignes python3. Options : `--on`, `--off`, `--toggle`, `--reset`, `--global`.

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

## Réponse de :

_À compléter par le reviewer externe_

---

## Intégration

_À compléter après review_
