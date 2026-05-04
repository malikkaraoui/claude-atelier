# Chantier : Telegram Bridge bidirectionnel — claude-atelier

> Auteur : Claude Sonnet 4.6 — 2026-05-04
> Statut : Proposition — à valider par Copilot avant implémentation
> Source d'inspiration : https://github.com/RichardAtCT/claude-code-telegram

---

## Objectif

Permettre une communication bidirectionnelle complète entre l'utilisateur et Claude via Telegram :
- **Entrantes** : messages texte, vocaux (2 min+), fichiers, images
- **Sortantes** : réponses Claude, alertes mode nuit, résumés de commits, notifications d'erreur
- **100% local** : transcription vocale via `faster-whisper`, polish via Ollama — aucune API externe obligatoire hors Telegram et Anthropic

---

## Architecture globale

```
┌─────────────────────────────────────────────────────────┐
│                    UTILISATEUR                          │
│                  (Telegram mobile)                      │
└────────────────────────┬────────────────────────────────┘
                         │ vocal / texte / fichier / image
                         ▼
┌─────────────────────────────────────────────────────────┐
│            telegram-bridge.py  (service Python)         │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Bot       │  │  Transcription│  │  Session      │  │
│  │  Telegram   │  │  faster-      │  │  SQLite       │  │
│  │  (polling)  │  │  whisper local│  │  (persistence)│  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
│         └────────────────▼───────────────────┘          │
│                          │                              │
│                  ┌───────▼────────┐                     │
│                  │  Ollama :11434  │                     │
│                  │  qwen2.5:3b    │                     │
│                  │  (polish texte)│                     │
│                  └───────┬────────┘                     │
└──────────────────────────┼──────────────────────────────┘
                           │ texte propre
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Claude CLI (subprocess)                 │
│              (session auto-resume par projet)           │
└────────────────────────┬────────────────────────────────┘
                         │ réponse texte
                         ▼
┌─────────────────────────────────────────────────────────┐
│           vault/10-mailbox.md  (Peter)                  │
│     chaque échange Telegram → entrée mailbox            │
│     Peter classe → décision ou découverte               │
└─────────────────────────────────────────────────────────┘
```

---

## Flux détaillés

### A) Message texte → Claude → Telegram

```
1. Utilisateur envoie texte dans Telegram
2. Bot (polling) reçoit le message
3. Whitelist auth : ALLOWED_USERS vérifié
4. Rate limiter token bucket
5. Recherche session active (user_id, project_dir) dans SQLite
6. Si session existante → resume avec session_id
   Si nouvelle → nouvelle session Claude CLI
7. Claude CLI exécute, stream la réponse
8. Réponse formatée envoyée via bot.send_message()
9. Session mise à jour en SQLite
10. Entrée dans vault/10-mailbox.md si interaction significative
```

### B) Vocal → transcription locale → Claude → Telegram

```
1. Utilisateur envoie vocal (ogg/mp3) dans Telegram
2. Bot télécharge le fichier audio localement (/tmp/)
3. faster-whisper (modèle base, local CPU) → texte brut
   - Modèle : base (74M params, ~10s pour 2min audio)
   - Langue : fr détectée automatiquement
4. Ollama :11434 qwen2.5:3b → polish léger
   - Prompt : "Corrige légèrement ce texte transcrit sans le réécrire"
   - Timeout : 10s max, fallback = texte brut si timeout
5. Texte poli → même flux que message texte (étapes 5-10 ci-dessus)
6. Fichier audio supprimé de /tmp/ après traitement
```

### C) Claude → Telegram (notifications sortantes)

```
Mode nuit / alertes :
Claude écrit dans un fichier pipe (/tmp/claude-telegram-out)
    ↓
telegram-bridge.py surveille le pipe (asyncio)
    ↓
bot.send_message(TELEGRAM_CHAT_ID, message)

Déclencheurs :
- Commit atomique effectué → "✅ Commit : {message}"
- Gate pré-push passée → "🚀 Push effectué sur {branch}"
- Gate échouée → "🔴 Gate KO : {étape} — {détail}"
- Session crashée (pouls silencieux) → "⚠️ Session silencieuse depuis {durée}"
- Erreur API 500 → "🔴 Erreur Anthropic API — Claude stoppé"
- Budget atteint → "💰 Budget {max}$ atteint — session stoppée"
```

### D) Commandes Telegram → contrôle Claude

```
/status   → état session courante (modèle, coût, durée, tâche en cours)
/new      → force nouvelle session (abandon contexte courant)
/stop     → stoppe Claude proprement (équivalent Ctrl+C)
/resume   → reprend la dernière session interrompue
/cd <dir> → change le répertoire projet actif
/budget   → affiche le coût cumulé de la session
/pulse    → état du pouls (agents actifs, derniers heartbeats)
```

---

## Stack technique

### Service Python

```
telegram-bridge.py          # point d'entrée unique (~300 lignes)
├── TelegramBot             # polling, handlers, auth
├── VoiceTranscriber        # faster-whisper wrapper
├── OllamaPolisher          # appel HTTP Ollama :11434
├── SessionManager          # SQLite CRUD sessions
├── ClaudeRunner            # subprocess Claude CLI
├── NotificationPipe        # lecture /tmp/claude-telegram-out
└── VaultWriter             # écriture vault/10-mailbox.md
```

### Dépendances Python

```
python-telegram-bot>=22.6   # bot Telegram (polling)
faster-whisper>=1.0.0       # transcription vocale locale
anthropic>=0.40.0           # SDK Claude (session_id tracking)
aiosqlite>=0.19.0           # SQLite async (sessions)
python-dotenv               # .env loading
httpx                       # appels Ollama REST
```

### Modèles locaux requis

| Usage | Modèle | Taille | Outil |
|-------|--------|--------|-------|
| Transcription vocale | Whisper base | 74M | faster-whisper (auto-DL) |
| Polish texte | qwen2.5:3b | ~2GB | Ollama (déjà en place) |

---

## Variables d'environnement

```bash
# Obligatoires
TELEGRAM_BOT_TOKEN=...          # depuis @BotFather
TELEGRAM_CHAT_ID=...            # ton ID (t.me/userinfobot)
ALLOWED_USERS=...               # ton Telegram user_id (whitelist)
APPROVED_DIRECTORY=/path/to/    # répertoire projet par défaut

# Claude
ANTHROPIC_API_KEY=...           # ou claude auth login déjà fait
CLAUDE_MAX_TURNS=20
CLAUDE_TIMEOUT_SECONDS=300
CLAUDE_MAX_COST_USD=50.0

# Transcription vocale (local — pas d'API externe)
WHISPER_MODEL=base              # tiny/base/small selon perf CPU
WHISPER_LANGUAGE=fr             # ou 'auto' pour détection

# Ollama polish
OLLAMA_HOST=http://localhost:11434
OLLAMA_POLISH_MODEL=qwen2.5:3b
OLLAMA_POLISH_TIMEOUT=10        # secondes, fallback=texte brut si dépassé
OLLAMA_POLISH_ENABLED=true      # false = skip polish, texte brut direct

# Sécurité
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# Vault Peter
VAULT_MAILBOX=vault/10-mailbox.md
VAULT_WRITE_ENABLED=true        # false = désactive l'écriture vault
```

---

## Structure fichiers dans claude-atelier

```
claude-atelier/
├── bin/
│   └── telegram.js              # CLI : npx claude-atelier telegram start|stop|status|test
├── scripts/
│   └── telegram-bridge.py       # service Python complet
├── .claude/
│   └── autonomy/
│       └── telegram.md          # docs usage + mode nuit
├── templates/
│   └── telegram.env.example     # template variables d'env
└── test/
    └── telegram.test.js         # tests smoke (bridge démarré ?)
```

---

## Intégration Peter / Vault

Chaque échange Telegram significatif génère une entrée dans `vault/10-mailbox.md` :

```markdown
## 2026-05-04 22:31 — Telegram [vocal 1m42s]

**Transcrit :** "Pour le hook pre-push, est-ce qu'on pourrait ajouter une vérification
des fichiers de config avant de push ?"

**Claude a répondu :** Proposition de modifier scripts/pre-push-gate.sh étape 2
pour inclure un audit .claude/settings.json...

**Session :** feat/pre-push-config-audit | Coût : $0.08
```

Peter lit la mailbox à chaque `vault update` et peut promouvoir en décision (`vault/20-decisions.md`) ou découverte (`vault/30-discoveries.md`).

---

## Intégration Mode Nuit

Claude (en session nuit) peut notifier via :

```bash
# Depuis un hook PostToolUse ou en fin de tâche
echo "✅ Commit : feat: add pre-push config audit" > /tmp/claude-telegram-out
echo "🚀 Push effectué — gate verte, 3 étapes, 0 erreur" > /tmp/claude-telegram-out
```

Le bridge lit le pipe et envoie immédiatement. Pas de polling, pas de délai.

---

## Phases d'implémentation

### Phase A — Bridge minimal bidirectionnel (texte only)
- `telegram-bridge.py` : bot polling + auth whitelist + Claude CLI subprocess
- SQLite sessions (resume automatique)
- `/status`, `/new`, `/stop`
- Test : envoyer "bonjour" depuis Telegram, recevoir réponse Claude

### Phase B — Voix locale
- Intégration `faster-whisper` (auto-download modèle base)
- Intégration Ollama polish (qwen2.5:3b)
- Fallback texte brut si Ollama timeout
- Test : vocal 2min → texte propre → Claude répond

### Phase C — Notifications sortantes (mode nuit)
- Pipe `/tmp/claude-telegram-out` surveillé en asyncio
- Hook PostToolUse écrit dans le pipe après chaque commit/push/erreur
- `telegram.md` mise à jour avec exemples d'alertes

### Phase D — Vault Peter + CLI
- `VaultWriter` : écriture automatique `vault/10-mailbox.md`
- `npx claude-atelier telegram start|stop|status|test` (`bin/telegram.js`)
- Lifecycle managé (PID file, restart auto)
- `test/telegram.test.js` smoke tests

---

## Contraintes et garde-fous

- **Whitelist stricte** : `ALLOWED_USERS` = liste fermée, refus silencieux si non listé
- **Path isolation** : Claude ne peut écrire qu'en dehors de `APPROVED_DIRECTORY`
- **Budget hard cap** : `CLAUDE_MAX_COST_USD` — session stoppée au dépassement, alerte Telegram
- **Pas d'API externe pour la voix** : faster-whisper tourne en local, Ollama idem
- **Fichiers audio éphémères** : supprimés de `/tmp/` immédiatement après transcription
- **Rate limit** : 100 requêtes / heure par utilisateur (token bucket)
- **Pas de secrets dans les logs** : `ANTHROPIC_API_KEY` et `TELEGRAM_BOT_TOKEN` masqués

---

## Hors scope (v1)

- Multi-utilisateurs (design pensé pour usage solo)
- Interface web de monitoring
- Upload de fichiers volumineux (>20MB)
- Réponses vocales (text-to-speech) — prévu v2
- Support de groupes Telegram (chat privé uniquement)
- Webhook mode (polling suffit pour usage solo)

---

## Questions ouvertes pour Copilot

1. `faster-whisper` en mode CPU pur sur Mac M-series — est-ce que le modèle `base` tient les 10s pour 2min audio, ou faut-il `tiny` ?
2. Le pipe `/tmp/claude-telegram-out` est-il fiable pour la notification mode nuit, ou préférer un socket Unix ?
3. L'écriture dans `vault/10-mailbox.md` depuis le bridge Python — conflit possible avec Peter Node.js qui écrit aussi dans ce fichier ?
4. `aiosqlite` ou simple `sqlite3` synchrone (le bridge est mono-utilisateur, la concurrence n'est pas un enjeu) ?
