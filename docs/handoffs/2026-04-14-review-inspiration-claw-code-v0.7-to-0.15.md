# Handoff — Review séance "inspiration claw-code" (0.7.0 → 0.15.0)

> Date : 2026-04-14
> Type : review
> Priorité : haute

---

## De : Claude

### Contexte

Malik a demandé d'analyser le repo [ultraworkers/claw-code](https://github.com/ultraworkers/claw-code) (réimplémentation Rust de Claude Code, 82k LOC) et d'en adapter la **logique métier** à `claude-atelier` (notre package npm de configs Claude Code, stack markdown + shell + JS — pas de Rust). Un agent Explore a sorti un rapport priorisé de 9 idées. J'ai livré 4 + 3 + 1 = **9 features** sur la séance, du bump `0.7.0` au `0.15.0`, plus 1 fix CI post-push (cache npm cargo-cult).

C'est la première fois que je sollicite ton review sur ce projet en mode « release globale ». Le user m'a explicitement reproché de ne **jamais** déclencher §25 (handoff Copilot auto) malgré 9 triggers évidents (100+ lignes par feature, features terminées). Tu es donc le contre-pouvoir manquant.

### Question précise

**Identifie les 3 angles morts les plus dangereux dans ce que j'ai livré entre 0.7.0 et 0.15.0** — les choix d'archi qui vont vieillir mal, les bouts de code fragiles, les docs qui mentent à l'avenir, ou les omissions que je n'ai pas vues. Pas un audit ligne-par-ligne — un jugement opinionné sur ce qui va se péter en premier.

### Fichiers à lire

**Code livré sur la séance :**

```text
PHILOSOPHY.md                            # nouveau — 0.8.0
PARITY.md                                # nouveau — 0.9.0
.claude/hooks-manifest.json              # nouveau — 0.10.0
test/lint-hooks-manifest.js              # nouveau — 0.10.0
test/doctor.js                           # réécrit — 0.11.0 puis enrichi 0.12.0 + 0.15.0
hooks/_parse-input.sh                    # annoté shellcheck — 0.12.0
.github/workflows/ci.yml                 # enrichi — 0.13.0 puis fix 0.13.x puis actionlint 0.15.0
README.md                                # 4 sections EN + chiffres FR — 0.14.0
.claude/CLAUDE.md                        # §1 réécrit (impératif) + §11 manifest — 0.10.0 + 0.15.0
SECURITY.md                              # automation 0.7.0 (avant la séance "inspiration")
scripts/update-security.js               # nouveau — avant la séance
scripts/pre-push-gate.sh                 # auto-sync SECURITY — avant la séance
CHANGELOG.md                             # entrées 0.8.0 → 0.15.0 ajoutées
package.json                             # bumps 0.7.0 → 0.15.0
```

**Sources d'inspiration (référentiel) :**

```text
/tmp/claw-code/PHILOSOPHY.md             # source de PHILOSOPHY.md
/tmp/claw-code/PARITY.md                 # source de PARITY.md
/tmp/claw-code/rust/crates/plugins/src/lib.rs   # PluginHooks → notre hooks-manifest
/tmp/claw-code/rust/crates/rusty-claude-cli/src/commands/doctor.rs  # source du doctor refait
```

(Si tu n'as pas accès à `/tmp/claw-code/`, les originaux sont sur https://github.com/ultraworkers/claw-code)

**Pièges que J'AI déjà identifiés (pour ne pas les re-soulever) :**

1. **Cargo-cult cache npm** : j'ai mis `cache: 'npm'` dans le CI sans vérifier qu'on avait un lockfile. Fail au premier push, fixé en supprimant. Cause confirmée : §8 anti-pattern violé par moi-même.
2. **Manquement §1 horodatage** : j'ai dérivé pendant des dizaines de réponses. Diagnostic d'un agent Explore : §1 disait "ouvrir chaque réponse" (passif) → biais "le hook l'injecte déjà". Fix appliqué : §1 réécrit en règle impérative.
3. **§25 Review Copilot jamais déclenché** : j'ai documenté la règle moi-même mais ne l'ai jamais appliquée. C'est ce handoff. Pattern reconnu sur d'autres projets.

### Contraintes / hors scope

- **Ne propose pas de migration vers Rust** ou autre stack — l'atelier reste npm + shell + JS, par parti pris (cf. PHILOSOPHY.md).
- **Ne propose pas de réécrire la pre-push-gate en YAML/policy engine** — j'ai déjà jugé que c'était de l'over-engineering, ne reviens pas dessus sauf si tu as un argument NEUF.
- **Ne fais pas de revue ligne-par-ligne** — concentre-toi sur les 3 risques structurels les plus dangereux.
- **Ne propose pas de fix** dans cette réponse — donne-moi le diagnostic, je décide ensuite quoi faire.
- **Pas de complaisance** : si tu vois que j'ai sur-vendu PHILOSOPHY/PARITY (docs marketing déguisés en docs techniques), dis-le. Si le doctor à 27 checks est de la bureaucratie déguisée en rigueur, dis-le.

---

## Réponse de : Copilot/GPT

**INSTRUCTION POUR LE LLM QUI REPOND :**
Tu DOIS écrire ta réponse **directement dans ce fichier**, dans cette
section. N'écris PAS ta réponse dans le chat. Utilise ton outil d'édition
de fichier (Edit, Write, ou équivalent) pour écrire ci-dessous.
Quand tu as fini, dis simplement à l'utilisateur :
"J'ai écrit ma réponse dans [chemin du fichier]. Tu peux la montrer à Claude."

<!-- Réponse ci-dessous -->

---

## Intégration

<!-- Rempli par Claude après avoir lu la réponse.
     Qu'est-ce qui a été retenu ? Qu'est-ce qui a été écarté et pourquoi ? -->
