---
name: ollama-router
description: "Setup automatique Ollama de bout en bout : détecte → installe si absent → lance si éteint → détecte RAM → choisit preset → pull modèles manquants (+ nomic-embed-text) → configure proxy → écrit .env.local → healthcheck. Zéro question inutile."
figure: Isaac
---

# Ollama Router

> Isaac 🔌 branche la prise, teste le courant, vérifie que le signal passe.
> Quand le proxy est prêt, il se lève et annonce : « La ligne est ouverte. »
>
> *"Un outil local non connecté est juste du silicium dormant."*

Configure le proxy Anthropic → Ollama pour utiliser un LLM local avec Claude Code.

## Procédure

### Étape 1 — Détecter, installer et lancer Ollama

**Automatiser de bout en bout — ne rien demander à l'utilisateur si on peut agir.**

1. Vérifier si Ollama est installé : `which ollama`
2. Si **pas installé** (macOS) : `brew install ollama` — si brew absent, `curl -fsSL https://ollama.com/install.sh | sh`
3. Si **installé mais pas lancé** (`curl -s --max-time 3 http://localhost:11434/api/tags` échoue) : lancer `ollama serve &>/dev/null &` puis `sleep 2` et revérifier
4. Si toujours pas de réponse après lancement → « Ollama ne démarre pas. Vérifier les logs : `ollama serve` en foreground. »

### Étape 2 — Lister les modèles disponibles

```bash
ollama list
```

Afficher la liste à l'utilisateur. Identifier les modèles présents.

### Étape 3 — Détecter la RAM et choisir le preset automatiquement

**Ne pas demander — détecter.**

```bash
# macOS
sysctl -n hw.memsize | awk '{print int($1/1073741824)}'
# Linux
grep MemTotal /proc/meminfo | awk '{print int($2/1048576)}'
```

Appliquer automatiquement :
- < 8 GB → preset `light` (`llama3.2:3b`)
- 8–16 GB → preset `standard` (`mistral`)
- \> 16 GB → preset `heavy` (`llama3.1:70b`)

Annoncer le choix : « RAM détectée : X GB → preset `standard` (`mistral`). »
Si l'utilisateur veut un autre modèle, il le dit — sinon on continue.

### Étape 4 — Pull automatique si modèle manquant

Vérifier si le modèle choisi est dans `ollama list`. Si absent, **le pull directement** sans demander :

```bash
ollama pull <modèle>
```

Aussi vérifier et pull `nomic-embed-text` s'il est absent (requis pour la mémoire 3 niveaux en mode FULL).

### Étape 5 — Vérifier config.json

Lire `scripts/ollama-proxy/config.json`. Confirmer que le preset choisi est présent.
Si besoin, proposer une modification du `config.json`.

### Étape 6 — Documenter le lancement manuel

**Le proxy ne se lance PAS automatiquement.** Afficher la commande exacte :

```bash
# Terminal dédié (garder ouvert)
cd scripts/ollama-proxy
go run main.go
```

Variables d'environnement optionnelles :
```bash
PORT=4001 go run main.go          # port alternatif
```

### Étape 7 — Écrire ANTHROPIC_BASE_URL

Vérifier si `.env.local` existe à la racine. Ajouter ou mettre à jour la ligne :

```bash
ANTHROPIC_BASE_URL=http://localhost:4000
```

Si le fichier n'existe pas, le créer. Si la ligne existe déjà, signaler qu'elle est déjà configurée.

> **Comportement** : si `.env.local` existe déjà, seule la ligne `ANTHROPIC_BASE_URL` est ajoutée ou mise à jour — le reste du fichier est préservé tel quel. Aucune autre variable n'est touchée.

> **Note** : ne jamais écrire `.env.local` dans `.claude/` — il va à la racine du projet.

### Étape 8 — Healthcheck automatique

**Ne pas attendre de confirmation** — tester directement :

```bash
curl -s --max-time 3 http://localhost:4000/health
```

Réponse attendue : `{"status":"ok","proxy":"ollama","version":"0.1.0"}`

Si le healthcheck échoue :
- Vérifier que `go run main.go` tourne : `lsof -i :4000`
- Si le port est libre, rappeler la commande de lancement
- Si le port est occupé par autre chose, proposer `PORT=4001` + adapter `ANTHROPIC_BASE_URL`

### Étape 9 — Confirmer

```
Isaac 🔌 : « Proxy opérationnel. ANTHROPIC_BASE_URL pointe vers localhost:4000.
Lance `claude` — les messages seront routés vers <modèle>. »
```

Rappeler le mode dégradé :
> **Limitation MVP** : les requêtes avec `tools` (tool_use / tool_result) retournent 501.
> Si Claude Code échoue avec une erreur 501, c'est que le contexte exige un vrai modèle Anthropic.

## Règles

- **Automatiser au maximum** : ne demander à l'utilisateur que s'il y a un vrai choix à faire
- Installer Ollama si absent, le lancer si éteint, pull les modèles si manquants — tout ça sans poser de question
- Ne jamais lancer `go run` ou `go build` automatiquement — documenter seulement
- Ne jamais modifier les fichiers Go sans instruction explicite
- Si Go absent (`go version` échoue) → signaler avant l'étape 6
- `.env.local` à la racine uniquement, jamais dans `.claude/`
