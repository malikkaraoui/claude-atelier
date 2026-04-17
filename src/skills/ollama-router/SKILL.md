---
name: ollama-router
description: "Configure et lance ollama-proxy pour router Claude Code vers un LLM local via Ollama. Détecte Ollama, liste les modèles disponibles, recommande le preset selon la RAM, pull si manquant, documente la commande de lancement, écrit ANTHROPIC_BASE_URL dans .env.local, vérifie le healthcheck."
figure: Isaac
---

# Ollama Router

> Isaac 🔌 branche la prise, teste le courant, vérifie que le signal passe.
> Quand le proxy est prêt, il se lève et annonce : « La ligne est ouverte. »
>
> *"Un outil local non connecté est juste du silicium dormant."*

Configure le proxy Anthropic → Ollama pour utiliser un LLM local avec Claude Code.

## Procédure

### Étape 1 — Détecter Ollama

```bash
curl -s http://localhost:11434/api/tags | head -c 200
```

Si Ollama ne répond pas :
- « Ollama n'est pas en cours d'exécution. Lance `ollama serve` dans un autre terminal, puis relance `/ollama-router`. »
- Arrêt ici.

### Étape 2 — Lister les modèles disponibles

```bash
ollama list
```

Afficher la liste à l'utilisateur. Identifier les modèles présents.

### Étape 3 — Recommander le preset selon la RAM

Poser la question :

> « Quelle est ta RAM disponible ?
> - < 8 GB → preset `light` (`llama3.2:3b`)
> - 8–16 GB → preset `standard` (`mistral`)
> - > 16 GB → preset `heavy` (`llama3.1:70b`) »

Si l'utilisateur indique directement un modèle, l'utiliser tel quel.

### Étape 4 — Tirer le modèle si manquant

Si le modèle recommandé n'est pas dans `ollama list` :

```bash
ollama pull <modèle>
```

Exemples :
```bash
ollama pull llama3.2:3b    # preset light
ollama pull mistral         # preset standard
ollama pull llama3.1:70b   # preset heavy (long — prévoir 30-60 min)
```

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

> **Note** : ne jamais écrire `.env.local` dans `.claude/` — il va à la racine du projet.

### Étape 8 — Healthcheck

Une fois que l'utilisateur confirme que le proxy tourne :

```bash
curl -s http://localhost:4000/health
```

Réponse attendue : `{"status":"ok","proxy":"ollama","version":"0.1.0"}`

Si le healthcheck échoue :
- Vérifier que `go run main.go` tourne dans le bon répertoire
- Vérifier que le port 4000 est libre (`lsof -i :4000`)
- Proposer `PORT=4001 go run main.go` + adapter `ANTHROPIC_BASE_URL`

### Étape 9 — Confirmer

```
Isaac 🔌 : « Proxy opérationnel. ANTHROPIC_BASE_URL pointe vers localhost:4000.
Lance `claude` — les messages seront routés vers <modèle>. »
```

Rappeler le mode dégradé :
> **Limitation MVP** : les requêtes avec `tools` (tool_use / tool_result) retournent 501.
> Si Claude Code échoue avec une erreur 501, c'est que le contexte exige un vrai modèle Anthropic.

## Règles

- Ne jamais lancer `go run` ou `go build` automatiquement — documenter seulement
- Ne jamais modifier les fichiers Go sans instruction explicite
- Si Ollama absent → arrêt immédiat, message clair
- Si Go absent (`go version` échoue) → signaler avant l'étape 6
- `.env.local` à la racine uniquement, jamais dans `.claude/`
