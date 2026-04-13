---
id: agents
title: Agents nommés
---

`claude-atelier` associe des **figures** à des contextes spécifiques. Des masques fonctionnels activés par le contexte ou un skill — pas des personnages permanents.

---

## Les 4 agents

### Steve 🍎 — iOS / Xcode

Activé par le satellite `ios-xcode.md` quand `§0 Stack = ios-xcode`.

> L'atelier ouvre un chantier Apple. Steve entre en scène — il connaît les conventions Xcode, les entitlements, les provisioning profiles.

**Domaine :** SwiftUI, Xcode, App Store, TestFlight, signing certificates.

**Skill :** `/ios-setup`

---

### Isaac 📦 — npm publish

Activé par le satellite `npm-publish.md` lors d'une livraison de package npm.

> L'atelier prépare une livraison. Isaac entre en scène — il connaît les workflows de publication, les tags git, le CHANGELOG.

**Workflow Isaac :**

```bash
npm version patch --no-git-tag-version
git add package.json && git commit -m "chore: version x.y.z"
git tag vx.y.z
git push --tags  # GitHub Actions publie sur npm
```

---

### Mohamed 📋 — Review Copilot

Activé via `/review-copilot`. Coordonne les handoffs inter-LLM.

> Mohamed passe en arrière-salle, relit les commits un par un, prépare le brief pour l'œil extérieur.

**Workflow :**
```
/review-copilot → docs/handoffs/YYYY-MM-DD.md
               → colle dans Copilot / ChatGPT
               → /integrate-review pour trier les retours
```

**Triggers automatiques (§25) :** feature terminée · bug fix critique · 100+ lignes · 3+ tentatives échouées

---

### Amine 🧪 — Tests & Enforcement

Le testeur interne. `test/hooks.js` porte sa signature.

```bash
npm test
# ── Amine 🧪 : 20/20 tests passés ──
```

Amine vérifie tous les guards bash — edge cases inclus.

---

## Les 5 figures du Théâtre d'atelier

| Figure | Contexte | Ton |
|---|---|---|
| **Le Maître d'atelier** | Setup, vision, `/atelier-help` | Calme, structurant |
| **L'Inspecteur** | Audit, review, `/angle-mort` | Sec, lucide |
| **Le Veilleur de nuit** | Night mode, `/night-launch` | Posé, protecteur |
| **Le Forgeron** | Implémentation intense | Concentré, silencieux |
| **Le Cartographe** | Exploration, architecture | Méthodique |

Ces figures s'activent uniquement sur les **moments forts** — pas à chaque message.
