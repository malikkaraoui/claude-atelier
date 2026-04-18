# Handoff — Memoire 3 niveaux (Phase 1)

> Date : 2026-04-18
> Type : review
> Priorite : haute
> reviewedRange: c78455f1778a3473007bd38823f4f9b8388e24ec..417151283cdb7a4e180d29a98c337ad8ec4f99f0

---

## De : Claude (Opus 4.6)

### Contexte

Implementation complete du systeme memoire 3 niveaux pour claude-atelier, inspire de GoClaw. 14 commits, 10 scripts crees, 20 tests.

**Architecture** : SQLite fichier unique (`.claude/memory.db`) avec 3 niveaux :
- **Working** (niveau 1) : fenetre de contexte existante, inchangee
- **Episodique** (niveau 2) : table `episodes` — resumes de sessions, dedup par session_id
- **Semantique** (niveau 3) : tables `nodes` + `edges` — graphe relationnel de concepts, scripts, personnes

**Recherche hybride** : FTS5 (BM25 lexical) + embeddings vectoriels Ollama (optionnel) + fusion RRF. 3 modes degrades : FULL → LEXICAL → MINIMAL.

**Hooks** : SessionStart injecte les 5 derniers episodes, UserPromptSubmit injecte les concepts pertinents au prompt.

### Question precise

Review de la feature complete avant merge sur main. Points a challenger :

1. **Robustesse** : les scripts gerent-ils correctement les edge cases (DB corrompue, Ollama timeout, JSON invalide dans topics/files) ?
2. **Securite** : risques d'injection SQL via les arguments CLI ? Stoplist suffisante ?
3. **Performance** : le hybrid search (FTS5 + scan vectoriel) tiendra-t-il avec 500 nodes et 365 jours d'episodes ?
4. **Architecture** : la separation en 10 scripts standalone est-elle le bon pattern vs un module unique ?
5. **Tests** : couverture suffisante ? Cas manquants critiques ?
6. **Integration** : les hooks ne risquent-ils pas de ralentir le demarrage session / chaque prompt ?

### Fichiers a lire

| Fichier | Lignes | Role |
| ------- | ------ | ---- |
| `scripts/memory-lib.js` | 186 | Bibliotheque partagee (DB, mode detection, cosine, embed) |
| `scripts/memory-init.sh` | 102 | Schema SQLite + FTS5 + triggers |
| `scripts/memory-read.js` | 341 | Recherche hybride (le plus complexe) |
| `scripts/memory-write.js` | 148 | Upsert nodes/edges |
| `scripts/memory-episode.js` | 149 | Episodes de session + dedup |
| `scripts/memory-gc.js` | 190 | Garbage collection + retention |
| `scripts/memory-embed.js` | 133 | Client Ollama |
| `scripts/memory-migrate.js` | 168 | Import legacy .md |
| `scripts/memory-export.js` | 139 | Export SQLite → .md |
| `test/memory.js` | 857 | 20 tests (unit + e2e) |

Spec de reference : `docs/superpowers/specs/2026-04-17-memory-3-levels-design.md`

### Contraintes / hors scope

- Ne pas proposer de reecrire ce qui fonctionne
- Se concentrer sur ce qui manque ou est fragile
- Les embeddings Ollama sont optionnels (mode LEXICAL fonctionne sans)
- Le session_id singleton est un P1 connu, documente dans la spec

---

## Reponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
1. Tu DOIS ecrire ta reponse directement dans **ce meme fichier `.md`**, section `## Reponse de : Copilot/GPT`.
2. Tu ne dois PAS repondre dans le chat, ni dans un autre fichier.
3. **INTERDIT DE MODIFIER DU CODE SOURCE.** Tu es reviewer, pas developpeur. Ton role est d'observer, critiquer, signaler — jamais de toucher aux fichiers `.js`, `.ts`, `.json`, `.sh`, `.md` hors de ce handoff. Si tu vois un bug, decris-le. Ne le corrige pas.
4. **INTERDIT DE MODIFIER LE FRONTMATTER** (Date, Type, Priorite, reviewedRange). Ces champs sont ancres par Claude. Les changer casse la CI.
5. Quand tu as fini, dis : "J'ai repondu dans [chemin du fichier]."

---

## Integration
<!-- Claude remplit apres lecture de la reponse -->
