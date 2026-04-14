#!/usr/bin/env node
/**
 * test/hooks.js — Amine 🧪
 *
 * Tests unitaires des hooks bash.
 * Chaque hook = JSON stdin → stdout + exit code attendus.
 * Zéro dépendance externe : Node.js + bash suffisent.
 *
 * Usage : node test/hooks.js   (ou : npm run test:hooks)
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

function hook(name, stdinObj = {}) {
  return spawnSync('bash', [`hooks/${name}`], {
    input: JSON.stringify(stdinObj),
    encoding: 'utf8',
    cwd: ROOT,
    env: { ...process.env }
  });
}

function resetRoutingEnv() {
  try {
    rmSync('/tmp/claude-atelier-current-model');
  } catch {}
  writeFileSync('/tmp/claude-atelier-diagnostic-last', `${Math.floor(Date.now() / 1000)}`);
}

// ─────────────────────────────────────────────────────────────
// guard-qmd-first.sh
// Règle : fire sur .md projet, silencieux sur exceptions
// ─────────────────────────────────────────────────────────────
console.log('\n── guard-qmd-first.sh ──');

test('fire sur un .md projet générique', () => {
  const r = hook('guard-qmd-first.sh', { tool_input: { file_path: '/project/docs/spec.md' } });
  ok(r.stdout.includes('QMD-FIRST'), 'doit contenir [QMD-FIRST]');
  ok(r.status === 0, 'non-bloquant (exit 0)');
});

test('contient les 3 commandes QMD dans sa sortie', () => {
  const r = hook('guard-qmd-first.sh', { tool_input: { file_path: '/project/feature.md' } });
  ok(r.stdout.includes('mcp__qmd__get'), 'commande get présente');
  ok(r.stdout.includes('mcp__qmd__query'), 'commande query présente');
  ok(r.stdout.includes('mcp__qmd__multi_get'), 'commande multi_get présente');
});

test('silencieux sur fichier non-.md', () => {
  const r = hook('guard-qmd-first.sh', { tool_input: { file_path: '/project/src/app.js' } });
  ok(r.stdout.trim() === '', 'aucune sortie attendue');
});

test('silencieux sur CLAUDE.md', () => {
  const r = hook('guard-qmd-first.sh', { tool_input: { file_path: '/project/CLAUDE.md' } });
  ok(r.stdout.trim() === '', 'CLAUDE.md exclu');
});

test('silencieux sur README.md', () => {
  const r = hook('guard-qmd-first.sh', { tool_input: { file_path: '/project/README.md' } });
  ok(r.stdout.trim() === '', 'README.md exclu');
});

test('silencieux sur MEMORY.md', () => {
  const r = hook('guard-qmd-first.sh', { tool_input: { file_path: '/home/.claude/projects/proj/memory/user.md' } });
  ok(r.stdout.trim() === '', 'memory exclu');
});

test('silencieux sur docs/handoffs/*.md', () => {
  const r = hook('guard-qmd-first.sh', { tool_input: { file_path: '/project/docs/handoffs/2026-04-13-review.md' } });
  ok(r.stdout.trim() === '', 'handoffs exclu');
});

test('silencieux sur fichier dans /hooks/', () => {
  const r = hook('guard-qmd-first.sh', { tool_input: { file_path: '/project/hooks/routing-check.sh' } });
  ok(r.stdout.trim() === '', '/hooks/ exclu');
});

test('silencieux sur fichier dans /runtime/', () => {
  const r = hook('guard-qmd-first.sh', { tool_input: { file_path: '/project/src/fr/runtime/theatre.md' } });
  ok(r.stdout.trim() === '', '/runtime/ exclu');
});

test('silencieux sur fichier dans /templates/', () => {
  const r = hook('guard-qmd-first.sh', { tool_input: { file_path: '/project/src/templates/settings.md' } });
  ok(r.stdout.trim() === '', '/templates/ exclu');
});

// ─────────────────────────────────────────────────────────────
// guard-no-sign.sh
// Règle §13 : bloque Co-Authored-By, Signed-off-by, --signoff
// ─────────────────────────────────────────────────────────────
console.log('\n── guard-no-sign.sh ──');

test('bloque Co-Authored-By dans la commande', () => {
  const cmd = 'git commit -m "feat: ajout Co-Authored-By: Claude <n@a.com>"';
  const r = hook('guard-no-sign.sh', { tool_input: { command: cmd } });
  ok(r.status === 2, 'exit 2 bloquant');
  ok(r.stdout.includes('jamais signer') || r.stdout.includes('BLOCKED'), 'message de blocage présent');
});

test('bloque Signed-off-by dans la commande', () => {
  const cmd = 'git commit -m "feat: ajout Signed-off-by: Malik"';
  const r = hook('guard-no-sign.sh', { tool_input: { command: cmd } });
  ok(r.status === 2, 'exit 2 bloquant');
});

test('bloque --signoff dans la commande', () => {
  const cmd = 'git commit --signoff -m "feat: ajout"';
  const r = hook('guard-no-sign.sh', { tool_input: { command: cmd } });
  ok(r.status === 2, 'exit 2 bloquant');
});

test('laisse passer un commit propre', () => {
  const cmd = 'git commit -m "feat: ajout fonctionnalité QMD-first"';
  const r = hook('guard-no-sign.sh', { tool_input: { command: cmd } });
  ok(r.status === 0, 'exit 0 autorisé');
  ok(r.stdout.trim() === '', 'aucun output');
});

test('silencieux sur commande non-commit', () => {
  const r = hook('guard-no-sign.sh', { tool_input: { command: 'git status' } });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.trim() === '', 'aucun output');
});

// ─────────────────────────────────────────────────────────────
// guard-commit-french.sh
// Règle §13 : messages de commit en français
// ─────────────────────────────────────────────────────────────
console.log('\n── guard-commit-french.sh ──');

test('bloque message purement anglais (≥ 2 mots EN, 0 FR)', () => {
  // "fix" est dans les deux listes (préfixe conventionnel) → utiliser add+update
  const cmd = `git commit -m "add new feature and update changelog"`;
  const r = hook('guard-commit-french.sh', { tool_input: { command: cmd } });
  ok(r.status === 2, 'exit 2 bloquant');
});

test('laisse passer un message en français', () => {
  const cmd = `git commit -m "feat: ajout de la fonctionnalité QMD-first"`;
  const r = hook('guard-commit-french.sh', { tool_input: { command: cmd } });
  ok(r.status === 0, 'exit 0 autorisé');
});

test('laisse passer les préfixes conventionnels (fix, feat, docs)', () => {
  const cmd = `git commit -m "fix: correction du hook routing-check"`;
  const r = hook('guard-commit-french.sh', { tool_input: { command: cmd } });
  ok(r.status === 0, 'exit 0 — fix est dans le lexique FR');
});

test('laisse passer un message court sans mots détectés', () => {
  const cmd = `git commit -m "0.3.11"`;
  const r = hook('guard-commit-french.sh', { tool_input: { command: cmd } });
  ok(r.status === 0, 'exit 0 — version sans mots clés');
});

test('silencieux sur commande non-commit', () => {
  const r = hook('guard-commit-french.sh', { tool_input: { command: 'git push origin main' } });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.trim() === '', 'aucun output');
});

// ─────────────────────────────────────────────────────────────
// session-model.sh + routing-check.sh
// Règle §1 : modèle live > transcript > cache
// ─────────────────────────────────────────────────────────────
console.log('\n── session-model.sh + routing-check.sh ──');

test('session-model capture le modèle depuis le JSON du hook', () => {
  resetRoutingEnv();
  const r = hook('session-model.sh', { model: 'claude-sonnet-4-6' });
  ok(r.status === 0, 'exit 0');
  ok(readFileSync('/tmp/claude-atelier-current-model', 'utf8').trim() === 'claude-sonnet-4-6', 'modèle capturé');
});

test('routing-check préfère le modèle live au cache stale', () => {
  resetRoutingEnv();
  writeFileSync('/tmp/claude-atelier-current-model', 'claude-sonnet-4-6\n');
  const r = hook('routing-check.sh', { prompt: 'audit rapide', model: 'claude-opus-4-6[1m]' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[ROUTING] modèle actif: claude-opus-4-6 (Opus (archi))'), 'le modèle live doit gagner');
  ok(r.stdout.includes('[ROUTING] source modèle: live'), 'la source doit être live');
  ok(readFileSync('/tmp/claude-atelier-current-model', 'utf8').trim() === 'claude-opus-4-6', 'cache mis à jour');
});

test('routing-check bascule sur le transcript si le modèle live est absent', () => {
  resetRoutingEnv();
  const dir = mkdtempSync(resolve(tmpdir(), 'claude-routing-'));
  const transcript = resolve(dir, 'session.jsonl');
  writeFileSync(transcript, '...\nSet model to claude-haiku-4-5\n...\n');
  const r = hook('routing-check.sh', { prompt: 'liste les fichiers', transcript_path: transcript });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[ROUTING] modèle actif: claude-haiku-4-5 (Haiku (exploration))'), 'fallback transcript attendu');
  ok(r.stdout.includes('[ROUTING] source modèle: transcript'), 'source transcript attendue');
  rmSync(dir, { recursive: true, force: true });
});

test('routing-check accepte le format date claude-haiku-20240307 depuis le transcript', () => {
  resetRoutingEnv();
  const dir = mkdtempSync(resolve(tmpdir(), 'claude-routing-'));
  const transcript = resolve(dir, 'session.jsonl');
  writeFileSync(transcript, '...\nSet model to claude-haiku-20240307\n...\n');
  const r = hook('routing-check.sh', { prompt: 'bonjour', transcript_path: transcript });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[ROUTING] modèle actif: claude-haiku-20240307 (Haiku (exploration))'), 'format date accepté');
  ok(r.stdout.includes('[ROUTING] source modèle: transcript'), 'source transcript attendue');
  rmSync(dir, { recursive: true, force: true });
});

test('routing-check signale quand il ne lui reste que le cache', () => {
  resetRoutingEnv();
  writeFileSync('/tmp/claude-atelier-current-model', 'claude-sonnet-4-6\n');
  const r = hook('routing-check.sh', { prompt: 'bonjour' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[ROUTING] source modèle: cache'), 'source cache attendue');
  ok(r.stdout.includes('modèle issu du cache session-start'), 'warning cache attendu');
});

test('routing-check alerte fort si aucun modèle n’est disponible', () => {
  resetRoutingEnv();
  const r = hook('routing-check.sh', { prompt: 'bonjour' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[HORODATAGE]'), 'horodatage toujours présent');
  ok(r.stdout.includes('| inconnu'), 'modèle inconnu attendu');
  ok(r.stdout.includes('🚨 [ROUTING] MODÈLE INCONNU'), 'alerte forte attendue');
});

// ─────────────────────────────────────────────────────────────
// Bilan
// ─────────────────────────────────────────────────────────────
const total = pass + fail;
console.log(`\n── Amine 🧪 : ${pass}/${total} tests passés${fail > 0 ? ` · ${fail} ÉCHECS` : ''} ──\n`);
if (fail > 0) process.exit(1);
