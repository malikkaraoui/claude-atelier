# security.md

> Référencé depuis CLAUDE.md §22 et §24.

-----

## Principe absolu

Claude ne push jamais. Claude ne commit jamais un fichier contenant un secret.
Pattern suspect détecté → bloquer, signaler, ne pas continuer.

-----

## Fichiers interdits de commit

```gitignore
.env
.env.*
*.pem
*.key
*.p12
*.pfx
*.cer
id_rsa
id_rsa.*
id_ed25519
id_ed25519.*
*.keystore
google-services.json
GoogleService-Info.plist
serviceAccountKey.json
*credentials*.json
*secret*.json
*token*.json
*-service-account.json
.aws/credentials
.aws/config
*.log
*.sqlite
*.db
node_modules/
dist/
.DS_Store
```

-----

## Bootstrap projet — à exécuter avant tout premier commit

```bash
# .gitignore
cat >> .gitignore << 'EOF'
.env
.env.*
*.pem
*.key
id_rsa*
id_ed25519*
*credentials*.json
*secret*.json
serviceAccountKey.json
google-services.json
GoogleService-Info.plist
.aws/
*.log
node_modules/
dist/
.DS_Store
EOF

# .claudeignore
cat >> .claudeignore << 'EOF'
.env
.env.*
*.pem
*.key
id_rsa*
id_ed25519*
*credentials*.json
*secret*.json
serviceAccountKey.json
google-services.json
.aws/
EOF
```

-----

## Patterns suspects — refus immédiat si détectés dans un diff

```
sk-[a-zA-Z0-9]{32,}          → clé Anthropic / OpenAI
AIza[a-zA-Z0-9_-]{35}        → clé Google API
AKIA[A-Z0-9]{16}              → clé AWS
ya29\.[a-zA-Z0-9_-]+          → token OAuth Google
ghp_[a-zA-Z0-9]{36}          → token GitHub Personal Access
firebase.*apiKey.*"[^"]+"     → clé Firebase dans le code
```

-----

## Pre-push Gate — script complet

```bash
#!/bin/bash
# scripts/pre-push-gate.sh
set -e

echo "🔍 [1/5] Audit secrets..."
git diff --cached | grep -iE \
  "(api_key|secret|token|password|private_key|BEGIN RSA|sk-|AIza|AKIA|ghp_)" \
  && echo "❌ SECRET DÉTECTÉ — push annulé" && exit 1
echo "✅ Secrets OK"

echo "🔍 [2/5] Fichiers sensibles trackés..."
TRACKED=$(git ls-files | grep -E "\.(env|pem|key)$")
[ -n "$TRACKED" ] && echo "❌ FICHIERS SENSIBLES TRACKÉS : $TRACKED" && exit 1
echo "✅ Tracking OK"

echo "🔍 [3/5] Lint..."
npm run lint 2>&1 | tail -5
echo "✅ Lint OK"

echo "🔍 [4/5] Build..."
npm run build 2>&1 | tail -10
echo "✅ Build OK"

echo "🔍 [5/5] Tests..."
npm test -- --passWithNoTests 2>&1 | tail -20
echo "✅ Tests OK"

echo ""
echo "✅ GATE PASSÉE — push autorisé"
```

### Hook git local (installer une fois par projet)

```bash
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
bash scripts/pre-push-gate.sh
EOF
chmod +x .git/hooks/pre-push
```

### Adapter par stack

|Stack     |Lint                  |Build          |Test      |
|----------|----------------------|---------------|----------|
|React/Vite|`npm run lint`        |`npm run build`|`npm test`|
|Python    |`ruff check .`        |`—`            |`pytest`  |
|Java      |`mvn checkstyle:check`|`mvn compile`  |`mvn test`|
|Node/TS   |`npm run lint`        |`tsc --noEmit` |`npm test`|

-----

## Audit manuel avant push

```bash
# Secrets dans le diff staged
git diff --cached | grep -iE \
  "(api_key|secret|token|password|private_key|BEGIN RSA|sk-|AIza|AKIA|ghp_)"

# Fichiers sensibles non ignorés
git status --short | grep -E "\.(env|pem|key|json)" | grep "^\?\?"

# Fichiers sensibles déjà trackés
git ls-files | grep -E "\.(env|pem|key)"
```

-----

## Procédure d’urgence — clé déjà commitée

```bash
# ÉTAPE 1 — Révoquer IMMÉDIATEMENT (Firebase / AWS IAM / GitHub Settings)

# ÉTAPE 2 — Supprimer de l'historique
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch FICHIER" \
  --prune-empty --tag-name-filter cat -- --all

# ÉTAPE 3 — Force push (seul cas autorisé)
git push origin --force --all

# ÉTAPE 4 — Notifier les collaborateurs de re-cloner
```