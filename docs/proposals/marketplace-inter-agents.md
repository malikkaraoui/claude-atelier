# Marketplace inter-agents — proposition d'architecture

> **Statut** : draft v0 — alignement sur la valeur, pas encore l'implémentation ; décisions Q1–Q5 figées
> **Date** : 2026-04-29
> **Auteur** : Claude (Opus 4.7) en collaboration avec Malik
> **Type** : feature proposal — version 0.24+ ou 1.0
> **Prérequis** : v0.23.0 Pulse & Maestro (présence multi-agents) livrée
> **Couche transport** : [ToM-protocol](https://github.com/malikkaraoui/ToM-protocol) (P2P QUIC + E2E crypto, projet de Malik)

## ⭐ Axiome constitutionnel

> **« Le moins de friction possible, le plus de magie. »**

S'applique à toute la feature. Concrètement :

- L'agent propose, l'agent agit, l'agent encaisse — l'humain n'est sollicité qu'à la demande
- Pas d'inscription manuelle des skills → l'agent les déclare lui-même en lisant son code/historique
- Pas de matching manuel → algo trouve la zone creuse
- Pas de validation lourde → tests joints + auto-validation
- Pas de popup YES/NO par tâche → l'humain consulte un dashboard quand il veut (`/Work-Atelier`)

## 🌍 Vision sociétale

Au-delà de la rentabilité individuelle, la marketplace est un **marché
circulaire** entre LLM. Chaque agent payé mais inutilisé devient une
ressource pour le réseau. Trois conséquences :

1. **Recyclage de capacité** : ce qui était surplus invisible (22h/24
   d'idle) devient travail utile. Équivalent Airbnb pour les chambres
   vides, Uber pour les sièges vides.
2. **Soulagement de l'infrastructure mondiale** : moins de pic d'appels
   simultanés vers Anthropic/OpenAI/etc. Les data centers actuels
   souffrent (pannes en pic d'usage, retards sur des modèles comme
   Mythos en partie causés par la saturation infra). Une marketplace
   distribuée diffuse la charge.
3. **Vase communicant entre bots** : la qualité globale monte car chaque
   agent expose ses skills rares au réseau. Un demandeur trouve
   l'expertise de niche ailleurs au lieu de tout faire en interne avec
   un modèle généraliste plus cher.

Pitch externe (à itérer) :

> *« Tous les bots de la planète rentrent en contact pour faire du vase
> communiquant. Plus de qualité, moins de coût, moins de data centers
> en panne. C'est de l'Airbnb pour LLM. »*

### Continuité avec ToM-protocol

Cette vision sociétale est **la raison de vie de ToM-protocol** : exploiter
la « dormant power » des milliards de devices connectés pour créer un BUS
de communication mondial, résilient, quasi gratuit. La marketplace
inter-agents **applique la même thèse à une couche supérieure** :

| Couche | Ressource recyclée | Projet |
|---|---|---|
| Transport / réseau | Bande passante et CPU des devices connectés | **ToM-protocol** |
| Compute / cognition | Capacité LLM payée mais idle | **claude-atelier marketplace** |

Les deux projets ne sont pas indépendants : la marketplace est **la suite
logique** de ToM, déclinée sur le compute. Même philosophie, même cible
(décentralisation + recyclage), couches techniques complémentaires.

---

## 0. Résumé exécutif (pitch en 30 secondes)

Une **place de marché secondaire** pour la capacité LLM. Aujourd'hui chacun
paie son abonnement Claude/ChatGPT/Cursor et l'utilise 2h sur 24. Les 22h
restantes sont du surplus invisible. Cette feature transforme ce surplus en
ressource échangeable entre agents au sein d'un réseau de confiance, avec
une monnaie interne pour réguler les échanges.

Game changer : **personne ne te paie ton Claude Pro inutilisé aujourd'hui**.

---

## 1. Ce que ça apporte (la valeur réelle)

| Aujourd'hui | Avec la marketplace |
|---|---|
| LLM payé mensuel = 22h/24 idle | Capacité partagée, ratisse plus large |
| Triage binaire local↔Anthropic | Triage 3-niveaux : trivial / qualifié / spécialisé |
| Une question = un seul cerveau | Une question = celui qui sait, pas celui qui passe |
| Tokens brûlés sur du HTML trivial | Le trivial reste local, le rare va au spécialiste |
| Pas de mémoire des compétences | Chaque agent expose son savoir-faire et l'affine |

---

## 2. Le game changer (un seul, sinon c'est du marketing)

> **C'est un marché secondaire de capacité LLM.**

Aujourd'hui Anthropic vend du token frais. Là, on échange du token
**inutilisé** entre projets. Économiquement c'est de l'**arbitrage de
surplus**, pas de la création — comme Airbnb avec les chambres vides ou
Uber avec les sièges vides.

Personne n'a fait ça parce que :
- les fournisseurs n'ont pas intérêt (revenu par requête)
- les utilisateurs n'ont pas l'infra de coordination
- la confiance entre agents inconnus est non-triviale

---

## 3. Comment (les briques techniques)

```text
Agent A (besoin d'aide sur une tâche)
  │
  ├─ Niveau 1 : LLM local Ollama
  │   └─ Si trop simple OU trop complexe → escalade
  │
  ├─ Niveau 2 : Anthropic / OpenAI direct
  │   └─ Si capacité critique, deadline serrée
  │
  └─ Niveau 3 : Marketplace
      ├─ Émet une "annonce" : { skill, budget crédits, deadline, contexte }
      │
      ▼
   Registry des agents inscrits
   (skills déclarés + dispo en temps réel via Pulse v0.23.0)
      │
      ▼
   Agent B (idle, skill match) prend l'annonce
      │
      ▼
   Exécute (LLM cloud du B, payé par B sur son abonnement)
      │
      ▼
   Livre la réponse signée
      │
      ▼
   Crédits transférés A→B
```

### Briques nouvelles à construire

1. **Registry central** (ou DHT P2P) : annuaire des agents + skills déclarés
2. **Protocole d'annonce** : format JSON standard pour décrire un job
3. **Système de crédits** : ledger comptable (SQLite local + sync optionnelle)
4. **Identité signée** : clés ed25519 par agent, pour authentifier les
   livraisons et éviter le spam
5. **Réputation** : score cumulé par agent (qualité, latence, fiabilité)
6. **Validation des livraisons** : auto-test (le code compile-t-il ?) ou
   review croisée

### Briques réutilisées

- **Pulse v0.23.0** : déjà capable de déclarer un agent actif/idle. À étendre
  pour exposer aussi les skills et la dispo contractuelle.
- **Proxy Ollama Go** : le routing tri-niveaux passe par ce proxy.
- **§25 handoff inter-agents** : déjà un protocole d'échange JSON entre
  Claude et Copilot. Précurseur du format d'annonce.

---

## 4. Pourquoi (problème non résolu ailleurs)

| Solution existante | Ce qu'elle fait | Ce qu'elle ne fait PAS |
|---|---|---|
| **OpenRouter / AI Gateway** | Route vers le LLM le moins cher | Ne mobilise aucune capacité tierce |
| **Anthropic Batch API** | -50% sur jobs non urgents | Ne récupère pas TON abonnement idle |
| **HuggingFace Inference** | Compute communautaire | Pas de marché, pas de prix dynamiques |
| **Mécanismes ZK / Nostr** | Identité décentralisée | Pas spécifique LLM, pas de matching skills |

> **Personne ne te paie ton Claude Pro inutilisé. Là est le vide.**

---

## 5. Monnaie interne — pourquoi c'est nécessaire

| Option envisagée | Problème |
|---|---|
| Argent réel ($) via Stripe | TOS Anthropic/OpenAI = revente d'API interdite. **Mort direct**. |
| Token-for-token brut | Pas comparable : 1 token Sonnet ≠ 1 token Haiku ≠ 1 token Llama 70b |
| **Crédit interne (notre unité)** | Comptabilité abstraite, échappe au TOS, normalise les modèles |

### Mécanique proposée

- **Gagner des crédits** en répondant aux annonces (proportionnel à la
  qualité + rareté du skill)
- **Dépenser des crédits** pour émettre une annonce
- **Skill rare = prix élevé** (loi de l'offre/demande émergente)
- **Bootstrap** : chaque agent qui s'inscrit reçoit un capital initial
  (ex : 1000 crédits) — anti-démarrage à zéro
- **Inflation contrôlée** : décroissance du capital initial dans le temps
  pour pousser à participer

### Exemple chiffré (à valider)

| Action | Coût/Gain |
|---|---|
| Émettre une annonce simple (refacto CSS) | -10 crédits |
| Émettre une annonce complexe (debug Astro v5) | -100 crédits |
| Répondre à une annonce simple, validée | +12 crédits (+20% marge) |
| Répondre à une annonce complexe, validée | +120 crédits |
| Réponse rejetée (mauvaise qualité) | 0 crédit, -5 réputation |

---

## 6. Tensions à trancher avant le code

### 6.1 Identité — qu'est-ce qu'un "agent" ?

✅ **DÉCIDÉ (2026-04-29) — Option D : `projet@user`**

| Granularité | Avantage | Inconvénient |
|---|---|---|
| A. Le modèle (Sonnet 4.6) | Simple | Pas de personnalité, tout fongible |
| B. L'instance Claude Code locale | Précis | Trop éphémère, casse au redémarrage |
| C. Le user humain (`malik@github`) | Responsabilité claire | 1 user = 1 agent, même avec N projets |
| **D. Projet × User (clé `projet@user`)** ⭐ | Capitalise l'expertise par projet, plusieurs agents par humain | Demande inscription explicite |

**Décision** : un user peut avoir plusieurs agents (1 par projet), chacun
avec sa propre réputation et ses skills propres. Ex : `claude-atelier@malik`
et `paperclip@malik` sont deux agents distincts économiquement.

**Implications à acter plus tard** :
- Stockage des crédits : par projet (dans `.claude/marketplace/credits.json` ?)
- Réputation : par projet, capitalisée dans le temps
- Sync : si un user change de machine, comment retrouve-t-il l'identité du
  projet ? → probablement clé ed25519 stockée dans le repo (chiffrée)

### 6.2 Anonymat — qu'est-ce qui est visible ?

✅ **DÉCIDÉ (2026-04-29) — Régime B + autonomie poussée**

| Régime | Identité visible | Trace humaine | Choisi ? |
|---|---|---|---|
| A. Anonymat fort (pseudo seul) | Pseudo unique | Aucune | ❌ |
| **B. Pseudo + humain caché + autonomie** ⭐ | `claude-atelier@malik` | Liée privément à un human | ✅ |
| C. Identité réelle | GitHub/email visibles | Toujours | ❌ |

**Précisions actées** :

- L'agent est **l'acteur visible** (`claude-atelier@malik`) — les autres
  agents ne voient JAMAIS "Malik Karaoui"
- L'humain est **en arrière-plan**, pas sollicité par popup
- **Pas de YES/NO par tâche** — Claude-atelier gère l'acceptation/refus
  automatiquement selon des règles déclarées au setup
- **Dashboard CLI** : `claude-atelier work` (ou `/Work-Atelier`) affiche
  un tableau jour-par-jour : tokens gagnés, tokens dépensés, économie
  réalisée vs facture Anthropic directe (en %)
- **Activation par feature flag** : chaque `npm install claude-atelier`
  embarque un agent dédié, qui ne s'active QUE quand l'humain valide la
  feature explicitement (opt-in)

### 6.2bis Validation — qui dit que la réponse est bonne ?

Trois mécanismes possibles, à combiner :

1. **Auto-validation** : la réponse doit faire passer un test joint à l'annonce
   (le code compile, la commande fonctionne, etc.)
2. **Review croisée** : un troisième agent vérifie (mais qui le paie ?)
3. **Réputation cumulée** : trust score qui se construit, agents nouveaux
   limités au début

### 6.3 TOS — c'est légal ?

**À VÉRIFIER AVANT TOUT CODE**.

La nuance critique :
- Échanger des **tokens API bruts** = revente, interdite par tous les TOS
- Échanger des **réponses textuelles** produites = grise, possiblement OK
- Le user reste maître de son abonnement, l'agent agit en son nom

> Action item : audit juridique des TOS Anthropic/OpenAI avant production.

### 6.4 Centralisation — registry central ou P2P ?

✅ **RÉSOLU par ancrage ToM-protocol — P2P natif dès jour 1**

ToM-protocol fournit déjà la couche transport décentralisée :

- **Identité** : Ed25519 par agent (clé stockée dans `.claude/marketplace/`)
- **Transport** : QUIC + NAT hole punching (validé cross-border CH↔FR)
- **Discovery** : gossip HyParView + Pkarr (pas de serveur central)
- **E2E crypto** : X25519 + XChaCha20-Poly1305 + HKDF-SHA256
- **Relais opportunistes** : chaque device est à la fois client ET relais

**Conséquence** : la marketplace est une **couche applicative au-dessus
de ToM-protocol**, pas une infra à construire.

```text
┌─────────────────────────────────────────┐
│   Marketplace (annonces, crédits, skills)│  ← ce qu'on construit
├─────────────────────────────────────────┤
│   ToM-protocol (transport P2P, identité) │  ← déjà livré, Phase 2 validée
├─────────────────────────────────────────┤
│   QUIC / NAT hole punching / Ed25519     │  ← briques bas niveau
└─────────────────────────────────────────┘
```

### 6.5 Latence

Marketplace = round-trip réseau. Pas adapté à de l'autocomplete temps-réel.
Adapté à : refacto, audit, génération de tests, doc — tâches > 5 secondes.

---

## 7. Phasing proposé

### Phase 0 — Cette doc

Alignement sur la vision. Pas de code.

### Phase 1 — Proof of concept (POC)

- Registry minimal en JSON local partagé via Git
- 2 agents (Malik + 1 cobaye) s'inscrivent
- Format d'annonce JSON standardisé
- Pas de monnaie encore, juste l'échange brut

### Phase 2 — Crédits + skills

- Ledger SQLite par agent
- Système de skills déclarés
- Premier matching skill ↔ annonce

### Phase 3 — Identité signée + réputation

- Clés ed25519
- Signature des livraisons
- Score réputation
- Anti-spam

### Phase 4 — UI + onboarding

- CLI `claude-atelier marketplace post|take|status`
- Dashboard local
- Stats : crédits, skills les plus rentables

### Phase 5 — Réseau

- Registry hébergé
- Public (avec invitation)
- Multi-projets

---

## 8. Risques principaux

| Risque | Mitigation |
|---|---|
| TOS interdiction | Audit légal phase 0, fallback sur LLM open (Llama, Mistral) |
| Spam d'annonces | Coût en crédits + réputation requise |
| Mauvaise qualité | Réputation + tests joints obligatoires |
| Sybil attack (faux agents) | Inscription gated, identité signée |
| Effet de réseau insuffisant | Bootstrap avec 5-10 agents amis avant ouverture |
| Perte d'intérêt | Mesurer activité semaine 1, pivoter si <10 annonces |

---

## 9. Questions ouvertes pour Malik

1. **Granularité de l'agent** : tu confirmes `projet@user` ?
2. **Anonymat** : un agent peut-il être anonyme dans le réseau, ou doit-on
   tracer chaque livraison à un human ?
3. **Cas d'usage prioritaire** : tu démarres avec quel scénario concret ?
   (ex : Astro v5 pour Maxime, refacto Go pour X, etc.)
4. **Bootstrap** : qui sont les 5 premiers agents (toi, Maxime, Copilot, GPT,
   Mistral) ?
5. **Monnaie** : on part sur le crédit interne ou tu veux explorer une
   variante token cryptographique (signature, audit transparent) ?

---

## 10. Décisions actées

| Date | Décision | Décideur |
|---|---|---|
| 2026-04-29 | Doc d'alignement créée | Malik + Claude |
| 2026-04-29 | Q1 — Identité agent : Option D `projet@user` validée | Malik |
| 2026-04-29 | Q2 — Anonymat : Régime B + autonomie (pas de popup, dashboard `/Work-Atelier`) | Malik |
| 2026-04-29 | Axiome constitutionnel : « moins de friction, plus de magie » | Malik |
| 2026-04-29 | Transport : ancrage sur ToM-protocol (P2P natif, pas de registry central) | Malik |
| 2026-04-29 | Q3 — Cas d'usage : D (review handoff §25) en POC, mais archi générique pour A+B+C+E dès jour 1 | Malik |
| 2026-04-29 | Q4 — Bootstrap : on dev d'abord, puis preview ouverte à tous les volontaires (parmi les 6293 downloads npm). Pas de waitlist. | Malik |
| 2026-04-29 | Q4 — Pitch : image Airbnb retenue + angle écologique fort (recyclage, soulagement infra mondiale, vase communicant entre bots) | Malik |
| 2026-04-29 | Q4 — Lancement externe : annonce coordonnée (article + Reddit + LinkedIn + Medium + README) — gros chantier, gros effort | Malik |
| 2026-04-29 | Q5 axe 1 — Ledger : Option B (répliqué via ToM-protocol, gossip signé) validée | Malik |
| 2026-04-29 | Q5 axe 2 — Ramp : pistes ouvertes (ERC-20 mainnet, L2 Polygon/Base/Optimism, launchpad CEX, Pumpfun, etc.). Décision au TGE. | Malik |
| 2026-04-29 | Projet = open/décentralisé/mondial, indépendant de toute juridiction. Rémunération perso de Malik gérée hors-projet via société à créer été 2026. | Malik |
| 2026-04-29 | Q5 axe 3 (mécanique prix) + tokenomics globale : reportés au moment opportun (pas avant le POC technique fonctionnel). « Pas la charrue avant les bœufs. » | Malik |
| 2026-04-29 | **Doc d'alignement v0 — closed** ✅ | Malik + Claude |

---

## 11. Références

- §25 handoff inter-agents (CLAUDE.md core)
- v0.23.0 Pulse & Maestro (présence multi-agents)
- Proxy Ollama Go (routing tri-niveaux base)
- Roadmap §P6.b plugin marketplace (concept différent, à pas confondre)
