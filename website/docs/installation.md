---
id: installation
title: Installation
---

## Démarrage rapide

```bash
npx claude-atelier init
```

Une commande. Claude Code est configuré avec 14 rails d'enforcement dans `.claude/`.

---

## Options

| Option | Description |
|---|---|
| `npx claude-atelier init` | Installation projet (`./.claude/`) |
| `npx claude-atelier init --global` | Installation globale (`~/.claude/`) |
| `npx claude-atelier init --lang en` | Version anglaise |
| `npx claude-atelier init --dry-run` | Aperçu sans écriture |

---

## Ce qui est installé

```
.claude/
├── CLAUDE.md              ← Runtime core (§0–§25)
├── settings.json          ← Permissions, hooks, budget
├── hooks/                 ← 14 scripts d'enforcement
├── autonomy/              ← Mode nuit, watchdog, loop
├── orchestration/         ← Fork, Teammate, Worktree
├── runtime/               ← Todo, extended thinking, théâtre
├── security/              ← Gate, secrets, emergency
├── ecosystem/             ← Hooks, skills, agents, QMD
└── skills/                ← 13 slash commands
.claudeignore              ← Patterns sensibles exclus
.gitignore                 ← Template si absent
scripts/
└── pre-push-gate.sh       ← Gate pré-push (5 étapes)
```

---

## Wizard §0

Après l'installation, un wizard interactif s'ouvre pour configurer `§0` de `CLAUDE.md` :

```
Nom du projet ?  > mon-app
Stack principale ?  > javascript
Repo GitHub ?  > https://github.com/moi/mon-app
```

Ces valeurs permettent à Claude de charger le bon satellite de stack et de connaître le contexte du projet dès la première session.

---

## Mise à jour

```bash
npx claude-atelier@latest init
```

:::info CLAUDE.md préservé
`CLAUDE.md` n'est **jamais écrasé** lors d'une mise à jour — vos personnalisations `§0` sont préservées. Tous les autres fichiers sont mis à jour.
:::

---

## Vérification

```bash
npx claude-atelier doctor
```

Vérifie que tous les hooks sont en place, que `settings.json` est valide et que la gate pré-push fonctionne.

---

## Désinstallation

```bash
rm -rf .claude/ .claudeignore scripts/pre-push-gate.sh
```
