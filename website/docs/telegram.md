---
id: telegram
title: Bridge Telegram
---

Bridge bidirectionnel Telegram ↔ Claude Code. Reçoit des commandes depuis votre mobile, envoie des alertes de session en temps réel. Zéro dépendance cloud — transcription vocale et polish par Ollama en local.

---

## Installation

```bash
# 1. Copier le template env
cp src/templates/telegram.env.example .env

# 2. Remplir les valeurs obligatoires
TELEGRAM_BOT_TOKEN=<de @BotFather>
TELEGRAM_CHAT_ID=<ton chat ID>
ALLOWED_USERS=<ton user_id Telegram>
APPROVED_DIRECTORY=/Users/moi/projects/mon-app

# 3. Vérifier Ollama actif (:11434)
ollama list

# 4. Lancer
npx claude-atelier telegram start
```

**Prérequis** : Token Telegram, Ollama actif (4 GB VRAM min), Faster-Whisper (`pip3 install faster-whisper`).

---

## Commandes disponibles

| Commande | Effet |
|---|---|
| `/status` | État session Claude + budget restant |
| `/new <prompt>` | Nouvelle tâche avec prompt |
| `/stop` | Pause la session Claude |
| `/resume` | Reprend après `/stop` |
| `/cd <path>` | Change le répertoire de travail |
| `/budget` | Affiche le budget utilisé / restant |
| `/pulse` | Logs 10 dernières lignes |

---

## Messages vocaux (Phase B)

Envoyez un message vocal au bot → il est transcrit en français par **faster-whisper** (local, CPU), poli par **Ollama** (local), puis transmis à Claude.

```
[Vous] 🎤 "ajouter un test unitaire pour le module auth"
       ↓ faster-whisper transcrit
       ↓ Ollama polish (modèle configurable)
[Claude] reçoit : "Ajouter un test unitaire pour le module auth"
```

Variables d'environnement :

```env
WHISPER_MODEL=base          # tiny / base / small / medium / large-v2
OLLAMA_POLISH_MODEL=llama3  # modèle Ollama pour le polish
OLLAMA_POLISH_ENABLED=true  # désactiver pour skip le polish
```

:::info Fallback gracieux
Si Ollama est indisponible, la transcription brute est utilisée directement. Le bridge ne crashe pas.
:::

---

## Alertes FIFO — Mode nuit

Claude envoie des alertes via `/tmp/claude-telegram-out`. Le bridge écoute et relaie vers Telegram (< 2s).

| Alerte | Déclencheur |
|---|---|
| `✅ Commit : {message}` | hook git post-commit |
| `🚀 Push sur {branch}` | hook git post-push |
| `🔴 Gate KO : {étape}` | pre-push-gate.sh |
| `⚠️ Session silencieuse depuis {durée}` | heartbeat checker |
| `💰 Budget {max}$ atteint` | meter avant appel API |

Écrire une alerte depuis un hook :

```bash
echo "✅ Commit : feat: add oauth" > /tmp/claude-telegram-out
```

---

## Gestion du processus

```bash
npx claude-atelier telegram start   # lance le bridge (PID dans /tmp/)
npx claude-atelier telegram stop    # arrête proprement
npx claude-atelier telegram status  # état + PID
npx claude-atelier telegram test    # envoie un message de test
```

---

## Sécurité

- `ALLOWED_USERS` — whitelist user_id Telegram (un seul accès)
- `APPROVED_DIRECTORY` — racine de tous les chemins relatifs
- `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW` — anti-flood
- Token Telegram : toujours dans `.env`, jamais en dur

`.env` doit être dans `.gitignore`.
