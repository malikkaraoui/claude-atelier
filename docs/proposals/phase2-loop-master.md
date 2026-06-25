# Phase 2 — Loop Master : Claude Code comme orchestrateur d'équipe

> Statut : design validé · à implémenter · 2026-06-25  
> Auteur : session design avec l'utilisateur  
> Principe : Claude Code ne travaille JAMAIS seul. Il orchestre une équipe de sous-agents spécialisés avant de déclarer "j'ai fini".

---

## Problème résolu

Aujourd'hui Claude Code travaille en solo et livre sans passer par un contre-pouvoir interne. Le `/review-oracle` existe mais s'active uniquement avant `git push`. La Phase 2 insère un pipeline qualité **dès que le code bouge**, invisible pour l'utilisateur jusqu'au résultat final.

---

## Principe fondateur

> "Comme une vraie société" — chaque rôle a une responsabilité précise, personne ne valide son propre travail, le Chef de Projet surveille la progression et la consommation.

---

## Composants à construire

### Nouveaux SKILL.md

| Skill | Rôle | Fichier |
|-------|------|---------|
| `/loop-master` | Orchestrateur — lance et boucle le pipeline | `.claude/skills/loop-master/SKILL.md` |
| `/chef-projet` | PM · monitoring · token audit · apprentissage | `.claude/skills/chef-projet/SKILL.md` |
| `/relecteur` | Reviewer indépendant (code + sécu + tests) | `.claude/skills/relecteur/SKILL.md` |
| `/documentaliste` | Maintient le vault Obsidian à jour | `.claude/skills/documentaliste/SKILL.md` |

### Nouveau fichier vault

| Fichier | Contenu |
|---------|---------|
| `vault/50-token-history.md` | Historique estimations token par phase (apprentissage continu) |

### Modification CLAUDE.md

- §3 : ajouter obligation `/loop-master` avant toute réponse "j'ai fini" sur tâche code

---

## Architecture du flux

```
[UTILISATEUR] → définit la TARGET
                (texte direct · vault/40-roadmap.md · tout fichier markdown)
      ↓
╔══════════════════════════════════════════════╗
║         CHEF PROJET — permanent              ║
║                                              ║
║  • confirme compréhension TARGET             ║
║  • découpe en sprints / objectifs clairs     ║
║  • estime tokens (vault/50-token-history.md) ║
║  • annonce : "Sprint N · cible · ~Xk tokens" ║
║  • dit GO                                    ║
║  • surveille toutes les 30s                  ║
║  • parle au client (l'utilisateur)           ║
╚══════════╤═══════════════════════════════════╝
           │ GO par sprint
           ↓
╔══════════════════════════════════════════════╗
║              BOUCLE QUALITÉ                  ║
║                                              ║
║  [CODEUR]          implémente les objectifs  ║
║       ↓                                      ║
║  [RELECTEUR]       code · sécu · tests réels ║
║       ↓                                      ║
║  [DOCUMENTALISTE]  met à jour vault Obsidian ║
║       ↓                                      ║
║    résultats → CHEF PROJET                   ║
╚══════════════════════════════════════════════╝
           │
           ↓
    TARGET atteinte ?
    NON → nouveau sprint → GO → CODEUR
    OUI → livrer à l'utilisateur
```

---

## Chef de Projet — responsabilités détaillées

### Monitoring temps réel

Toutes les ~30s (après chaque étape du pipeline) :

```
[CHEF] Boucle 2/5 · Relecteur en cours · 34k/~80k tokens (43%)
       Relecteur : 2 findings mineurs sur hooks/guard-review-auto.sh
       Temps écoulé : 1m40s · estimé restant : ~3min
```

### Budget token

| Seuil | Action |
|-------|--------|
| Pré-phase | Estimer depuis `50-token-history.md` + annoncer |
| 100K dépassé | Alerte + justification obligatoire avant de continuer |
| Fin de phase | Écrire `estimé vs réel` dans `50-token-history.md` |

### Apprentissage des estimations

`vault/50-token-history.md` accumule :
- type de tâche (refactor · feature · fix · docs)
- tokens estimés / tokens réels
- nombre de boucles
- durée

Objectif : après quelques cycles, estimation juste à quelques centaines de tokens près.

---

## Format vault/50-token-history.md

```markdown
# Token History — Estimations vs Réel

| Date | Type | Estimé | Réel | Écart | Boucles | Durée |
|------|------|--------|------|-------|---------|-------|
| 2026-06-25 | refactor | 40k | 47k | +17% | 2 | 4min |
```

---

## Séquence de build

### Lot 1 — Squelette (débloquer la boucle)
1. `vault/50-token-history.md` — créer vide avec structure
2. `/chef-projet` SKILL.md — monitoring + estimation (pas encore d'historique)
3. `/loop-master` SKILL.md — pipeline séquentiel, 1 boucle max pour commencer
4. MAJ §3 CLAUDE.md — obligation `/loop-master`

### Lot 2 — Agents métier
5. `/relecteur` SKILL.md — code + sécu + `npm test` réel
6. `/documentaliste` SKILL.md — écrit vault via MCP obsidian-vault

### Lot 3 — Apprentissage
7. Chef de Projet lit `50-token-history.md` pour calibrer les estimations
8. Chef de Projet écrit dans `50-token-history.md` après chaque phase
9. Calibration sur 3-5 cycles → estimation précise

---

## Règles non négociables

- **Zéro boîte noire** : toujours un log visible toutes les ~30s
- **Sous-agents = lecture seule** (sauf Documentaliste → vault uniquement, pas de code)
- **Circuit breaker** : max 5 boucles par phase — si toujours NON au bout de 5 → escalader à l'utilisateur
- **Temps = décrit et justifié**, jamais un bloquant
- **Token > 100K par phase** → justification obligatoire, pas un arrêt silencieux

---

## Convention de nommage des agents — NON NÉGOCIABLE

La vue terminal Claude Code affiche chaque agent avec : **label · durée · tokens**

```
○ general-purpose   Challenger le plan Phase 2          20s · ↓ 19.4k tokens
○ general-purpose   Relire le plan Phase 2 pour complétude  16s · ↓ 28.2k tokens
○ general-purpose   Chiffrer l'effort Lot 1 Phase 2    19s · ↓ 30.2k tokens
```

**Règle** : le label agent = `[RÔLE] verbe + objet + contexte` — lisible froid, sans ambiguïté.

| ✅ Correct | ❌ Interdit |
|-----------|------------|
| `Challenger le plan Phase 2` | `agent-1` |
| `Relecteur — guard-review-auto.sh` | `review` |
| `Documentaliste — vault/20-decisions.md` | `doc update` |
| `Chef Projet — boucle 2/5 · TARGET atteinte ?` | `chef` |

Cette vue **est** le monitoring temps réel. Pas besoin d'un dashboard séparé — le terminal suffit si les labels sont précis. Le Chef de Projet doit nommer chaque sous-agent qu'il spawne avec ce standard.

---

## Décisions techniques — session design 2026-06-25

Issues identifiées par les agents (Challenger + Relecteur + Chiffreur) avant validation :

| # | Problème | Décision |
|---|----------|----------|
| A | Déclenchement loop-master invérifiable via CLAUDE.md seul | → Hook exclusivement. CLAUDE.md = dernier recours si le hook ne peut pas le faire. Règle : si un hook peut le faire, le hook le fait. |
| B | Tokens inter-sessions impossibles à partager | → Chaque sous-agent écrit dans `/tmp/claude-atelier-loop-metrics.json` |
| C | État boucle / objectifs sprints transmis comment | → Documentaliste gère son propre format. Il choisit : JSON tmp + vault/50-token-history.md ou markdown dédié. Il sait ce qu'il doit écrire. |
| D | MCP Documentaliste : via session parente ou direct ? | → Direct via MCP obsidian-vault. Obsidian tourne sur la machine. Documentaliste a tous les droits. |
| E | sync src/skills/ ↔ .claude/skills/ | → Obligatoire, inclus dans Lot 1 |
| F | Tests npm pour nouveaux skills | → Obligatoire. On ne ship pas sans npm test vert. |
| G | Chef de Projet dans le flux | → Permanent : ouvre, découpe, estime, dit GO, surveille, ferme. Pas en bout de chaîne. |

---

## Critères de succès (Phase 2 livrée)

- [ ] Claude Code n'est plus jamais "seul" sur une tâche code
- [ ] Le Chef de Projet parle toutes les ~30s
- [ ] L'estimation token pré-phase existe dès le 1er cycle
- [ ] Après 5 cycles : estimation juste à ±20%
- [ ] Le vault Obsidian est mis à jour automatiquement après chaque phase
- [ ] `npm test` passe (nouveaux skills dans manifest + tests)
