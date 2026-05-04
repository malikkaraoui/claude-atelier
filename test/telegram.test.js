#!/usr/bin/env node
/**
 * test/telegram.test.js — Smoke tests Telegram bridge
 *
 * Tests structuraux : fichiers présents, dépendances, aucun secret hardcodé.
 * Pas de test d'exécution du bot (nécessiterait un vrai token Telegram).
 *
 * Usage: node test/telegram.test.js (ou: npm run test:telegram)
 */

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

let pass = 0;
let fail = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    pass++;
  } catch (e) {
    console.error(`  ✗ ${label}`);
    console.error(`    └ ${e.message}`);
    fail++;
  }
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg ?? 'assertion échouée');
}

console.log('\n── Telegram Bridge Smoke Tests ──\n');

// ─────────────────────────────────────────────────────────────
// Vérifications de structure
// ─────────────────────────────────────────────────────────────
console.log('Structure:');

test('scripts/telegram-bridge.py existe', () => {
  const path = resolve(ROOT, 'scripts', 'telegram-bridge.py');
  ok(existsSync(path), `fichier manquant: ${path}`);
});

test('src/templates/telegram.env.example existe', () => {
  const path = resolve(ROOT, 'src', 'templates', 'telegram.env.example');
  ok(existsSync(path), `fichier manquant: ${path}`);
});

test('.claude/autonomy/telegram.md existe', () => {
  const path = resolve(ROOT, '.claude', 'autonomy', 'telegram.md');
  ok(existsSync(path), `fichier manquant: ${path}`);
});

test('bin/telegram.js existe', () => {
  const path = resolve(ROOT, 'bin', 'telegram.js');
  ok(existsSync(path), `fichier manquant: ${path}`);
});

// ─────────────────────────────────────────────────────────────
// Vérifications de contenu
// ─────────────────────────────────────────────────────────────
console.log('\nContenu:');

test('bin/telegram.js est exécutable', () => {
  const path = resolve(ROOT, 'bin', 'telegram.js');
  const content = readFileSync(path, 'utf8');
  ok(content.startsWith('#!/usr/bin/env node'), 'shebang absent');
});

test('bin/telegram.js définit les commandes start/stop/status/test', () => {
  const path = resolve(ROOT, 'bin', 'telegram.js');
  const content = readFileSync(path, 'utf8');
  ok(content.includes("case 'start'"), 'commande start absente');
  ok(content.includes("case 'stop'"), 'commande stop absente');
  ok(content.includes("case 'status'"), 'commande status absente');
  ok(content.includes("case 'test'"), 'commande test absente');
});

test('bin/telegram.js gère le PID file', () => {
  const path = resolve(ROOT, 'bin', 'telegram.js');
  const content = readFileSync(path, 'utf8');
  ok(content.includes('PID_FILE'), 'gestion PID absente');
  ok(content.includes('/tmp/claude-atelier-telegram.pid'), 'chemin PID attendu');
});

test('scripts/telegram-bridge.py commence par #!/usr/bin/env python3', () => {
  const path = resolve(ROOT, 'scripts', 'telegram-bridge.py');
  const content = readFileSync(path, 'utf8');
  ok(content.startsWith('#!/usr/bin/env python3'), 'shebang Python absent');
});

test('src/templates/telegram.env.example contient des placeholders, pas de secrets', () => {
  const path = resolve(ROOT, 'src', 'templates', 'telegram.env.example');
  const content = readFileSync(path, 'utf8');
  // Vérifier qu'il y a au moins une variable de config
  ok(content.includes('TELEGRAM_BOT_TOKEN'), 'TELEGRAM_BOT_TOKEN manquant du template');
  // Vérifier que ce n'est pas un token réel
  ok(!content.match(/TELEGRAM_BOT_TOKEN\s*=\s*\d+:[A-Za-z0-9_-]{24,}/), 'token réel détecté dans template');
});

// ─────────────────────────────────────────────────────────────
// Vérifications de sécurité
// ─────────────────────────────────────────────────────────────
console.log('\nSécurité:');

test('scripts/telegram-bridge.py ne contient pas de token hardcodé', () => {
  const path = resolve(ROOT, 'scripts', 'telegram-bridge.py');
  const content = readFileSync(path, 'utf8');
  // Pattern simple pour détecter un token Telegram hardcodé (nombre:alphanumérique)
  ok(!content.match(/["\']?\d{9,10}:[A-Za-z0-9_-]{20,}["\']?/), 'token hardcodé détecté');
});

test('bin/telegram.js ne contient pas d\'API key en dur', () => {
  const path = resolve(ROOT, 'bin', 'telegram.js');
  const content = readFileSync(path, 'utf8');
  // Vérifier qu'il n'y a pas de token réel assigné (TELEGRAM_BOT_TOKEN = "123:ABC...")
  ok(!content.match(/TELEGRAM_BOT_TOKEN\s*=\s*["\']?\d{9,10}:[A-Za-z0-9_-]/), 'token Telegram ne doit pas être assigné en dur');
  ok(!content.includes('sk_'), 'clé API ne doit pas être en dur');
});

test('.claude/autonomy/telegram.md ne contient pas de secrets', () => {
  const path = resolve(ROOT, '.claude', 'autonomy', 'telegram.md');
  const content = readFileSync(path, 'utf8');
  // Basique : check qu'il n'y a pas de patterns de tokens
  ok(!content.match(/\d{9,10}:[A-Za-z0-9_-]{20,}/), 'token détecté dans autonomy doc');
});

// ─────────────────────────────────────────────────────────────
// Vérifications des dépendances Python (optionnel)
// ─────────────────────────────────────────────────────────────
console.log('\nDépendances Python:');

test('[optionnel] python3 -c "import telegram" disponible', () => {
  const result = spawnSync('python3', ['-c', 'import telegram'], {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  // Cette vérification est optionnelle (ne pas hard fail si python-telegram-bot n'est pas installé)
  if (result.status !== 0) {
    console.log('    (⚠ python-telegram-bot non installé, skippé)');
  } else {
    ok(true, 'python-telegram-bot disponible');
  }
});

// ─────────────────────────────────────────────────────────────
// Résumé
// ─────────────────────────────────────────────────────────────
const total = pass + fail;
console.log(`\n── Tests Telegram: ${pass}/${total} passés${fail > 0 ? ` · ${fail} ÉCHECS` : ''} ──\n`);

if (fail > 0) process.exit(1);
