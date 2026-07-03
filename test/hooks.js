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
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateHooksSection } from '../bin/hooks-gen.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TEST_TMP = mkdtempSync(resolve(tmpdir(), 'claude-atelier-hooks-'));
const ROUTING_LEGACY_MODEL = resolve(TEST_TMP, 'claude-atelier-current-model');
const ROUTING_CACHE_DIR = resolve(TEST_TMP, 'claude-atelier-model-cache');
const ROUTING_DIAGNOSTIC_LAST = resolve(TEST_TMP, 'claude-atelier-diagnostic-last');

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

function hook(name, stdinObj = {}, env = {}) {
  return spawnSync('bash', [`hooks/${name}`], {
    input: JSON.stringify(stdinObj),
    encoding: 'utf8',
    cwd: ROOT,
    env: { ...process.env, CLAUDE_ATELIER_TMPDIR: TEST_TMP, ...env }
  });
}

function resetRoutingEnv() {
  try {
    rmSync(ROUTING_LEGACY_MODEL);
  } catch {}
  try {
    rmSync(ROUTING_CACHE_DIR, { recursive: true, force: true });
  } catch {}
  writeFileSync(ROUTING_DIAGNOSTIC_LAST, `${Math.floor(Date.now() / 1000)}`);
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

test('§25 muet si review_copilot désactivé (feat/fix/refactor)', () => {
  // review_copilot=false dans .claude/features.json → le rappel §25 est
  // court-circuité AVANT tout calcul de lignes. Le check FR reste actif.
  const cmd = `git commit -m "feat: ajout du panneau de contrôle des features"`;
  const r = hook('guard-commit-french.sh', { tool_input: { command: cmd } });
  ok(r.status === 0, 'exit 0 — message FR valide, pas de blocage');
  ok(!/needs-review|no-review-needed|§25/.test(r.stdout), 'aucun rappel §25 quand review_copilot=false');
});

// ─────────────────────────────────────────────────────────────
// session-model.sh + routing-check.sh
// Règle §1 : modèle live > cache > transcript (post bug-fix compaction)
// ─────────────────────────────────────────────────────────────
console.log('\n── session-model.sh + routing-check.sh ──');

test('session-model capture le modèle depuis le JSON du hook', () => {
  resetRoutingEnv();
  const r = hook('session-model.sh', { model: 'claude-sonnet-4-6' });
  ok(r.status === 0, 'exit 0');
  ok(readFileSync(ROUTING_LEGACY_MODEL, 'utf8').trim() === 'claude-sonnet-4-6', 'modèle capturé');
});

test('routing-check préfère le modèle live au cache stale', () => {
  resetRoutingEnv();
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-sonnet-4-6\n');
  const r = hook('routing-check.sh', { prompt: 'audit rapide', model: 'claude-opus-4-6[1m]' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[ROUTING] modèle actif: claude-opus-4-6 (Opus (archi))'), 'le modèle live doit gagner');
  ok(r.stdout.includes('[ROUTING] source modèle: live'), 'la source doit être live');
  ok(readFileSync(ROUTING_LEGACY_MODEL, 'utf8').trim() === 'claude-opus-4-6', 'cache mis à jour');
});

test("routing-check bascule sur le transcript si le modèle live est absent", () => {
  resetRoutingEnv();
  const dir = mkdtempSync(resolve(tmpdir(), 'claude-routing-'));
  const transcript = resolve(dir, 'session.jsonl');
  writeFileSync(transcript, JSON.stringify({type:"assistant",message:{role:"assistant",model:"claude-haiku-4-5",content:[{type:"text",text:"ok"}]}}) + "\n");
  const r = hook('routing-check.sh', { prompt: 'liste les fichiers', transcript_path: transcript });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[ROUTING] modèle actif: claude-haiku-4-5 (Haiku (exploration))'), 'fallback transcript attendu');
  ok(r.stdout.includes('[ROUTING] source modèle: transcript'), 'source transcript attendue');
  rmSync(dir, { recursive: true, force: true });
});

test("routing-check accepte aussi le schéma assistant.message/data.message", () => {
  resetRoutingEnv();
  const dir = mkdtempSync(resolve(tmpdir(), 'claude-routing-'));
  const transcript = resolve(dir, 'session.jsonl');
  writeFileSync(transcript, JSON.stringify({type:"assistant.message",data:{message:{role:"assistant",model:"claude-opus-4-6"}}}) + "\n");
  const r = hook('routing-check.sh', { prompt: 'audit', transcript_path: transcript });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[ROUTING] modèle actif: claude-opus-4-6 (Opus (archi))'), 'fallback transcript multi-schéma attendu');
  ok(r.stdout.includes('[ROUTING] source modèle: transcript'), 'source transcript attendue');
  rmSync(dir, { recursive: true, force: true });
});

test("routing-check accepte le format date claude-haiku-20240307 depuis le transcript", () => {
  resetRoutingEnv();
  const dir = mkdtempSync(resolve(tmpdir(), 'claude-routing-'));
  const transcript = resolve(dir, 'session.jsonl');
  writeFileSync(transcript, JSON.stringify({type:"assistant",message:{role:"assistant",model:"claude-haiku-20240307",content:[{type:"text",text:"ok"}]}}) + "\n");
  const r = hook('routing-check.sh', { prompt: 'bonjour', transcript_path: transcript });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[ROUTING] modèle actif: claude-haiku-20240307 (Haiku (exploration))'), 'format date accepté');
  ok(r.stdout.includes('[ROUTING] source modèle: transcript'), 'source transcript attendue');
  rmSync(dir, { recursive: true, force: true });
});

test('routing-check signale quand il ne lui reste que le cache', () => {
  resetRoutingEnv();
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-sonnet-4-6\n');
  const r = hook('routing-check.sh', { prompt: 'bonjour' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[ROUTING] source modèle: cache'), 'source cache attendue');
  ok(r.stdout.includes('modèle issu du cache legacy global'), 'warning cache attendu');
});

test('routing-check alerte fort si aucun modèle n’est disponible', () => {
  resetRoutingEnv();
  const r = hook('routing-check.sh', { prompt: 'bonjour' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[HORODATAGE]'), 'horodatage toujours présent');
  ok(r.stdout.includes('| inconnu'), 'modèle inconnu attendu');
  ok(r.stdout.includes('🚨 [ROUTING] MODÈLE INCONNU'), 'alerte forte attendue');
});

test('garde-fou #1 : session-model à compact sans model invalide le cache', () => {
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-opus-4-6\n');
  const r = hook('session-model.sh', { source: 'compact', hook_event_name: 'SessionStart' });
  ok(r.status === 0, 'exit 0');
  let cacheExists = true;
  try { readFileSync(ROUTING_LEGACY_MODEL, 'utf8'); } catch { cacheExists = false; }
  ok(!cacheExists, 'cache supprimé post-compact sans model live');
});

test('session-model scope le cache par session et évite la contamination croisée', () => {
  resetRoutingEnv();
  hook('session-model.sh', { model: 'claude-opus-4-6', session_id: 'session-a' });
  const sameSession = hook('routing-check.sh', { prompt: 'bonjour', session_id: 'session-a' });
  const otherSession = hook('routing-check.sh', { prompt: 'bonjour', session_id: 'session-b' });
  ok(sameSession.stdout.includes('[ROUTING] modèle actif: claude-opus-4-6 (Opus (archi))'), 'session A doit relire son cache');
  ok(sameSession.stdout.includes('[ROUTING] source modèle: cache'), 'session A utilise son cache');
  ok(otherSession.stdout.includes('🚨 [ROUTING] MODÈLE INCONNU'), 'session B ne doit pas hériter du cache de A');
});

test('compact sur une session n’invalide pas le cache d’une autre session', () => {
  resetRoutingEnv();
  hook('session-model.sh', { model: 'claude-opus-4-6', session_id: 'session-a' });
  hook('session-model.sh', { model: 'claude-sonnet-4-6', session_id: 'session-b' });
  hook('session-model.sh', { source: 'compact', session_id: 'session-a' });
  const sessionA = hook('routing-check.sh', { prompt: 'bonjour', session_id: 'session-a' });
  const sessionB = hook('routing-check.sh', { prompt: 'bonjour', session_id: 'session-b' });
  ok(sessionA.stdout.includes('🚨 [ROUTING] MODÈLE INCONNU'), 'session A doit perdre son cache après compact');
  ok(sessionB.stdout.includes('[ROUTING] modèle actif: claude-sonnet-4-6 (Sonnet (dev))'), 'session B garde son cache');
});

test("garde-fou #2 : routing-check transcript lit message.model (fix /model)", () => {
  resetRoutingEnv();
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-opus-4-6\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'claude-routing-'));
  const transcript = resolve(dir, 'session.jsonl');
  // JSONL avec une réponse assistant dont message.model = haiku
  writeFileSync(transcript, JSON.stringify({type:"assistant",message:{role:"assistant",model:"claude-haiku-4-5",content:[{type:"text",text:"ok"}]}}) + "\n");
  const r = hook('routing-check.sh', { prompt: 'audit', transcript_path: transcript });
  ok(r.status === 0, 'exit 0');
  // transcript message.model (haiku) > cache (opus)
  ok(r.stdout.includes('[ROUTING] source mod\xe8le: transcript'), 'transcript doit primer sur cache');
  ok(readFileSync(ROUTING_LEGACY_MODEL, 'utf8').trim() === 'claude-haiku-4-5', 'cache mis a jour');
  rmSync(dir, { recursive: true, force: true });
});

test('routing-check N\'émet PLUS de pollution Ollama / mode A-M / proxy', () => {
  resetRoutingEnv();
  // Ollama, proxy et switch automatique ont été retirés : aucune de ces lignes ne doit sortir.
  const r = hook('routing-check.sh', { prompt: 'bonjour', model: 'claude-sonnet-4-6' }, {
    ANTHROPIC_BASE_URL: 'http://localhost:4000'  // ancien proxy : doit être totalement ignoré
  });
  ok(r.status === 0, 'exit 0');
  ok(!r.stdout.includes('[OLLAMA]'), 'plus de ligne [OLLAMA]');
  ok(!r.stdout.includes('[SWITCH-MODE]'), 'plus de ligne [SWITCH-MODE]');
  ok(!/🦙|🔌/.test(r.stdout), 'plus de pastille ollama/proxy');
  ok(!r.stdout.includes('ANTHROPIC_BASE_URL'), 'plus de suggestion proxy');
  ok(r.stdout.includes('[ROUTING] modèle actif: claude-sonnet-4-6'), 'le modèle reste détecté (source du header)');
});

// ─────────────────────────────────────────────────────────────
// guard-tests-before-push.sh — §11/§24 : tests avant push
// ─────────────────────────────────────────────────────────────
console.log('\n── guard-tests-before-push.sh ──');

test('marque qu\'un test runner a tourné (npm test)', () => {
  try { rmSync('/tmp/claude-atelier-tests-ran', { force: true }); } catch {}
  const r = hook('guard-tests-before-push.sh', { tool_input: { command: 'npm test' } });
  ok(r.status === 0, 'exit 0 (marquage silencieux)');
  ok(readFileSync('/tmp/claude-atelier-tests-ran', 'utf8').trim().length > 0, 'fichier marqueur créé');
});

test('laisse passer git push si des tests ont tourné récemment', () => {
  writeFileSync('/tmp/claude-atelier-tests-ran', `${Math.floor(Date.now() / 1000)}\n`);
  const r = hook('guard-tests-before-push.sh', { tool_input: { command: 'git push origin main' } });
  ok(r.status === 0, 'exit 0 — tests détectés');
});

test('silencieux sur commande non liée (ls, cd)', () => {
  const r = hook('guard-tests-before-push.sh', { tool_input: { command: 'ls -la' } });
  ok(r.status === 0, 'exit 0 — no-op');
  ok(r.stdout.trim() === '', 'aucune sortie');
});

// ─────────────────────────────────────────────────────────────
// guard-review-auto.sh — §25 : gate push + challenger commit
// ─────────────────────────────────────────────────────────────
console.log('\n── guard-review-auto.sh ──');

test('bloque git push si diff ≥ seuil et review absente', () => {
  try { rmSync('/tmp/claude-atelier-review-done', { force: true }); } catch {}
  const r = hook('guard-review-auto.sh',
    { tool_input: { command: 'git push origin main' } },
    { REVIEW_ORACLE_TEST_LINES: '100' }
  );
  ok(r.status === 2, `exit 2 attendu (reçu ${r.status})`);
  ok(r.stdout.includes('REVIEW-ORACLE'), 'message REVIEW-ORACLE présent');
});

test('autorise git push si flag review présent', () => {
  writeFileSync('/tmp/claude-atelier-review-done', '');
  const r = hook('guard-review-auto.sh',
    { tool_input: { command: 'git push origin main' } },
    { REVIEW_ORACLE_TEST_LINES: '100' }
  );
  ok(r.status === 0, 'exit 0 — review validée');
});

test('efface le flag après push autorisé', () => {
  writeFileSync('/tmp/claude-atelier-review-done', '');
  hook('guard-review-auto.sh',
    { tool_input: { command: 'git push origin main' } },
    { REVIEW_ORACLE_TEST_LINES: '100' }
  );
  let exists = true;
  try { readFileSync('/tmp/claude-atelier-review-done'); } catch { exists = false; }
  ok(!exists, 'flag effacé après push');
});

// ─────────────────────────────────────────────────────────────
// model-metrics.sh — §1 pastille + §15 auto-métriques
// ─────────────────────────────────────────────────────────────
console.log('\n── model-metrics.sh ──');

function makeTranscript(dir, turns) {
  const transcript = resolve(dir, 'session.jsonl');
  const lines = turns.map(tools =>
    JSON.stringify({ type: 'assistant', message: { content: tools.map((name, i) => ({ type: 'tool_use', id: `t${i}`, name, input: {} })) } })
  );
  writeFileSync(transcript, lines.join('\n'));
  return transcript;
}

test('opus + 5 tours Read/Glob/Grep → surdimensionné ⬇️', () => {
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-opus-4-6\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'metrics-'));
  const transcript = makeTranscript(dir, [
    ['Read'], ['Glob'], ['Grep'], ['Read', 'Glob'], ['Grep', 'Read'],
  ]);
  const r = hook('model-metrics.sh', { transcript_path: transcript });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[METRICS]'), '[METRICS] présent');
  ok(r.stdout.includes('⬇️'), 'flèche ⬇️ attendue (descendre)');
  ok(r.stdout.includes('surdimensionné') || r.stdout.includes('/model sonnet'), 'verdict surdimensionné');
  rmSync(dir, { recursive: true, force: true });
});

test('haiku + 5 tours Agent/WebSearch → insuffisant ⬆️', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'metrics-'));
  const transcript = makeTranscript(dir, [
    ['Agent'], ['WebSearch'], ['Agent', 'WebFetch'], ['Agent'], ['WebSearch'],
  ]);
  const r = hook('model-metrics.sh', { transcript_path: transcript, model: 'claude-haiku-4-5' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[METRICS]'), '[METRICS] présent');
  ok(r.stdout.includes('⬆️'), 'flèche ⬆️ pour insuffisant (monter)');
  ok(r.stdout.includes('insuffisant') || r.stdout.includes('/model opus'), 'verdict insuffisant');
  rmSync(dir, { recursive: true, force: true });
});

test('sonnet + 5 tours Edit/Write → optimal 🟢', () => {
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-sonnet-4-6\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'metrics-'));
  const transcript = makeTranscript(dir, [
    ['Edit', 'Write'], ['Edit'], ['Bash', 'Write'], ['Edit', 'Edit'], ['Write'],
  ]);
  const r = hook('model-metrics.sh', { transcript_path: transcript });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[METRICS]'), '[METRICS] présent');
  ok(r.stdout.includes('🟢'), 'pastille 🟢 pour optimal');
  rmSync(dir, { recursive: true, force: true });
});

test('silencieux si pas de transcript', () => {
  const r = hook('model-metrics.sh', { prompt: 'bonjour' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.trim() === '', 'aucune sortie sans transcript');
});

test('format role/content (fallback) — sonnet + 5 tours Read → léger surplus ⬇️', () => {
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-sonnet-4-6\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'metrics-'));
  const transcript = resolve(dir, 'session.jsonl');
  // Format alternatif : {"role":"assistant","content":[...]}
  const lines = [['Read'], ['Glob'], ['Grep'], ['Read'], ['Read']].map(tools =>
    JSON.stringify({ role: 'assistant', content: tools.map((name, i) => ({ type: 'tool_use', id: `t${i}`, name, input: {} })) })
  );
  writeFileSync(transcript, lines.join('\n'));
  const r = hook('model-metrics.sh', { transcript_path: transcript });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[METRICS]'), '[METRICS] présent (format role/content)');
  ok(r.stdout.includes('⬇️'), 'flèche ⬇️ pour léger surplus sonnet/low');
  rmSync(dir, { recursive: true, force: true });
});

// CTX% — fenêtre contexte (schémas JSONL variants) — ligne [CTX] séparée, plus dans l'entête §1
test('CTX% schéma type=assistant + message.usage → [CTX] dans sortie', () => {
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-sonnet-4-6\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'ctx-'));
  const transcript = resolve(dir, 'session.jsonl');
  // 40k input + 20k cache_read = 60k / 200k = 30% → ✅ (fenêtre épinglée à 200k via env)
  const usage = { input_tokens: 40000, cache_read_input_tokens: 20000, cache_creation_input_tokens: 0, output_tokens: 100 };
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { usage, content: [] } }) + '\n');
  const r = hook('model-metrics.sh', { transcript_path: transcript }, { CLAUDE_ATELIER_CTX_WINDOW: '200000' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[CTX]'), '[CTX] présent (schéma type=assistant/message.usage)');
  ok(r.stdout.includes('30%✅'), 'indicateur 30%✅ correct');
  // L'entête §1 porte désormais la conso contexte : [date | model | ctx N%] PASTILLE
  ok(r.stdout.includes('ctx 30%'), 'entête §1 porte la conso contexte (ctx 30%)');
  ok(!r.stdout.includes('[CTX-WARN]'), 'pas d\'alerte sous le seuil 45% (ici 30%)');
  rmSync(dir, { recursive: true, force: true });
});

test('[CTX-WARN] s\'affiche dès que le contexte atteint 45%', () => {
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-sonnet-4-6\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'ctx-'));
  const transcript = resolve(dir, 'session.jsonl');
  // 90k tokens = 90k / 200k = 45% → ≥ 45% → alerte (fenêtre épinglée à 200k via env)
  const usage = { input_tokens: 90000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 100 };
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { usage, content: [] } }) + '\n');
  const r = hook('model-metrics.sh', { transcript_path: transcript }, { CLAUDE_ATELIER_CTX_WINDOW: '200000' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('45%'), 'indicateur 45% calculé');
  ok(r.stdout.includes('[CTX-WARN]'), 'alerte [CTX-WARN] présente au seuil 45%');
  ok(r.stdout.includes('seuil 45%'), 'message mentionne le seuil 45%');
  rmSync(dir, { recursive: true, force: true });
});

test('fenêtre 1M dérivée du modèle actif (opus-4-8, sans config) → 5% (fix faux 95%)', () => {
  // Table modèle : claude-opus-4-8 → 1M. Aucun features.json contextWindow, aucun env.
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-opus-4-8\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'ctx-'));
  const transcript = resolve(dir, 'session.jsonl');
  // 50k tokens : sur 1M = 5% ; sur 200k ce serait 25% (le faux d'avant).
  const usage = { input_tokens: 50000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 100 };
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { usage, content: [] } }) + '\n');
  const r = hook('model-metrics.sh', { transcript_path: transcript, model: 'claude-opus-4-8' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes(' 5%✅'), '[CTX] = 5% (fenêtre 1M via table modèle)');
  ok(!r.stdout.includes('25%'), 'PAS 25% — opus-4-8 mappé sur 1M');
  ok(!r.stdout.includes('[CTX-WARN]'), 'pas d\'alerte (5% < 45%)');
  ok(r.stdout.includes('ctx 5%'), 'entête §1 porte ctx 5%');
  rmSync(dir, { recursive: true, force: true });
});

test('anti-régression : bascule sur sonnet (200k) → 25%, pas 5% (fenêtre suit le modèle)', () => {
  // Le bug miroir signalé par le challenger : une fenêtre figée donnerait 5%.
  // La table modèle mappe sonnet sur 200k → 50k/200k = 25% (correct).
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-opus-4-8\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'ctx-'));
  const transcript = resolve(dir, 'session.jsonl');
  const usage = { input_tokens: 50000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 100 };
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { usage, content: [] } }) + '\n');
  const r = hook('model-metrics.sh', { transcript_path: transcript, model: 'claude-sonnet-4-6' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('ctx 25%'), 'entête §1 = ctx 25% (sonnet → 200k)');
  ok(!r.stdout.includes('ctx 5%'), 'PAS 5% — pas de sous-estimation figée');
  rmSync(dir, { recursive: true, force: true });
});

test('fenêtre 1M dérivée du modèle actif (sonnet-5, sans config) → 5% (fix bug /context : 220% rapporté vs 46% réel)', () => {
  // Bug signalé par Peter via /context : claude-sonnet-5 tombait dans le défaut
  // 200k (comme les sonnet plus anciens) alors que sa vraie fenêtre est ~1M
  // (967k réel + buffer autocompact) — d'où un % rapporté ~4.8x trop haut.
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-sonnet-5\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'ctx-'));
  const transcript = resolve(dir, 'session.jsonl');
  const usage = { input_tokens: 50000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 100 };
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { usage, content: [] } }) + '\n');
  const r = hook('model-metrics.sh', { transcript_path: transcript, model: 'claude-sonnet-5' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes(' 5%✅'), '[CTX] = 5% (fenêtre 1M via table modèle)');
  ok(!r.stdout.includes('25%'), 'PAS 25% — sonnet-5 doit être mappé sur 1M, pas 200k');
  ok(r.stdout.includes('ctx 5%'), 'entête §1 porte ctx 5%');
  rmSync(dir, { recursive: true, force: true });
});

test('fix bug bascule modèle : cache scoppé session (frais) prime sur cache legacy (périmé)', () => {
  // routing-check.sh tourne AVANT model-metrics.sh (ordre .claude/settings.json) et
  // rafraîchit le cache scoppé dès qu'il détecte un modèle via live/transcript.
  // Avant ce fix, model-metrics.sh ignorait ce cache scoppé et retombait sur le
  // cache legacy (périmé) dès que son propre LIVE_MODEL était vide → mauvaise
  // fenêtre (1M au lieu de 200k) juste après une bascule opus → sonnet.
  resetRoutingEnv();
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-opus-4-8\n');
  mkdirSync(ROUTING_CACHE_DIR, { recursive: true });
  writeFileSync(resolve(ROUTING_CACHE_DIR, 'sess-abc.model'), 'claude-sonnet-4-6\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'ctx-'));
  const transcript = resolve(dir, 'session.jsonl');
  const usage = { input_tokens: 50000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 100 };
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { usage, content: [] } }) + '\n');
  // Pas de `model` dans le stdin (LIVE_MODEL vide) → force la résolution par cache.
  const r = hook('model-metrics.sh', { transcript_path: transcript, session_id: 'sess-abc' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('ctx 25%'), 'fenêtre 200k (sonnet, cache scoppé) → 25%, pas 5% (opus/legacy périmé)');
  ok(!r.stdout.includes('ctx 5%'), 'PAS 5% — le cache legacy périmé ne doit plus primer sur le cache scoppé');
  rmSync(dir, { recursive: true, force: true });
});

test('override env CLAUDE_ATELIER_CTX_WINDOW=200k prime sur la table modèle → 25%', () => {
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-opus-4-8\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'ctx-'));
  const transcript = resolve(dir, 'session.jsonl');
  // Même 50k sur opus : forcés sur 200k via env → 25% (priorité env > table).
  const usage = { input_tokens: 50000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 100 };
  writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { usage, content: [] } }) + '\n');
  const r = hook('model-metrics.sh', { transcript_path: transcript, model: 'claude-opus-4-8' }, { CLAUDE_ATELIER_CTX_WINDOW: '200000' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('ctx 25%'), 'entête §1 = ctx 25% (env override 200k > table 1M)');
  rmSync(dir, { recursive: true, force: true });
});

test('CTX% schéma role=assistant + usage racine → [CTX] dans sortie', () => {
  writeFileSync(ROUTING_LEGACY_MODEL, 'claude-sonnet-4-6\n');
  const dir = mkdtempSync(resolve(tmpdir(), 'ctx-'));
  const transcript = resolve(dir, 'session.jsonl');
  // 110k tokens input = 110k / 200k = 55% → 🔥 (fenêtre épinglée à 200k via env)
  const usage = { input_tokens: 110000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 200 };
  writeFileSync(transcript, JSON.stringify({ role: 'assistant', usage, content: [] }) + '\n');
  const r = hook('model-metrics.sh', { transcript_path: transcript }, { CLAUDE_ATELIER_CTX_WINDOW: '200000' });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('[CTX]'), '[CTX] présent (schéma role=assistant/usage racine)');
  ok(r.stdout.includes('55%🔥'), 'indicateur 55%🔥 correct (seuil ≥50%)');
  rmSync(dir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────
// detect-design-need.sh — Séréna auto-proposition
// ─────────────────────────────────────────────────────────────
console.log('\n── detect-design-need.sh ──');

function resetSerenaFlag() {
  for (const name of readdirSync('/tmp')) {
    if (name.startsWith('claude-atelier-serena-proposed-')) {
      try { rmSync(`/tmp/${name}`, { force: true }); } catch {}
    }
  }
}

test('détecte "landing page" et propose Séréna', () => {
  resetSerenaFlag();
  const r = hook('detect-design-need.sh', {
    prompt: 'je veux créer une landing page pour mon SaaS',
    session_id: 'serena-session-1'
  });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('SÉRÉNA'), 'proposition Séréna présente');
  ok(r.stdout.includes('/design-senior'), 'slash command mentionné');
});

test('détecte "charte graphique" et propose Séréna', () => {
  resetSerenaFlag();
  const r = hook('detect-design-need.sh', {
    prompt: 'on doit refaire la charte graphique du projet',
    session_id: 'serena-session-2'
  });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.includes('SÉRÉNA'), 'proposition Séréna présente');
});

test('throttle : pas de double proposition dans la même session', () => {
  resetSerenaFlag();
  hook('detect-design-need.sh', {
    prompt: 'créer un dashboard ui',
    session_id: 'serena-same-session'
  });
  const r2 = hook('detect-design-need.sh', {
    prompt: 'ajoute un sidebar au design',
    session_id: 'serena-same-session'
  });
  ok(r2.stdout.trim() === '', 'deuxième appel silencieux (throttle)');
});

test('sessions distinctes : la proposition repart une fois par session', () => {
  resetSerenaFlag();
  hook('detect-design-need.sh', {
    prompt: 'créer un dashboard ui',
    session_id: 'serena-session-a'
  });
  const r2 = hook('detect-design-need.sh', {
    prompt: 'ajoute un sidebar au design',
    session_id: 'serena-session-b'
  });
  ok(r2.stdout.includes('SÉRÉNA'), 'la nouvelle session doit reproposer Séréna');
});

test('fallback transcript_path : throttle isolé par transcript si session_id absent', () => {
  resetSerenaFlag();
  hook('detect-design-need.sh', {
    prompt: 'je veux une hero section',
    transcript_path: '/tmp/serena-transcript-a.jsonl'
  });
  const r2 = hook('detect-design-need.sh', {
    prompt: 'je veux une hero section',
    transcript_path: '/tmp/serena-transcript-b.jsonl'
  });
  ok(r2.stdout.includes('SÉRÉNA'), 'un transcript distinct ne doit pas être throttlé');
});

test('silencieux sur prompt sans rapport avec le design', () => {
  resetSerenaFlag();
  const r = hook('detect-design-need.sh', {
    prompt: 'corrige le bug dans le hook routing-check',
    session_id: 'serena-session-3'
  });
  ok(r.status === 0, 'exit 0');
  ok(r.stdout.trim() === '', 'aucune sortie');
});

// ─────────────────────────────────────────────────────────────
// vault-context.sh — Peter injecte le vault projet au SessionStart
// ─────────────────────────────────────────────────────────────
console.log('\n── vault-context.sh ──');

test('silencieux si aucun vault projet', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'vault-hook-'));
  try {
    const r = spawnSync('bash', [resolve(ROOT, 'hooks', 'vault-context.sh')], {
      cwd: dir,
      input: JSON.stringify({ hook_event_name: 'SessionStart' }),
      encoding: 'utf8',
    });
    ok(r.status === 0, 'exit 0');
    ok(r.stdout.trim() === '', 'aucune sortie sans vault/');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('injecte brief et mailbox si vault projet présent', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'vault-hook-'));
  try {
    mkdirSync(resolve(dir, 'vault'), { recursive: true });
    writeFileSync(resolve(dir, 'vault', '00-brief.md'), '# Brief projet\n\nObjectif courant : livrer le MVP.\n');
    writeFileSync(resolve(dir, 'vault', '10-mailbox.md'), `# Mailbox projet\n\nIdée vendredi soir : challenger Peter.\n${'x'.repeat(900)}\n`);
    const r = spawnSync('bash', [resolve(ROOT, 'hooks', 'vault-context.sh')], {
      cwd: dir,
      input: JSON.stringify({ hook_event_name: 'SessionStart' }),
      encoding: 'utf8',
    });
    ok(r.status === 0, 'exit 0');
    ok(r.stdout.includes('[VAULT-PETER]'), 'marqueur Peter attendu');
    ok(r.stdout.includes('Objectif courant'), 'brief injecté');
    ok(r.stdout.includes('Idée vendredi soir'), 'mailbox injectée');
    ok(r.stdout.includes('Dernière modification :'), 'mtime attendu pour éviter la mémoire stale');
    ok(r.stdout.includes('[ligne tronquée]'), 'ligne longue tronquée attendue');
    ok(!r.stdout.includes('x'.repeat(700)), 'une ligne longue ne doit pas passer entière');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});


// ─────────────────────────────────────────────────────────────
// guard-s1-header.sh — §1 : entête obligatoire (hook Stop, contrôle de la sortie)
// ─────────────────────────────────────────────────────────────
console.log('\n── guard-s1-header.sh ──');

function makeS1Transcript(dir, lastAssistantText) {
  const transcript = resolve(dir, 'session.jsonl');
  const line = JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'text', text: lastAssistantText }] }
  });
  writeFileSync(transcript, line + '\n');
  return transcript;
}

test('passe si header §1 correct', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  try {
    const t = makeS1Transcript(dir, '[2026-06-25 18:00:00 | claude-sonnet-4-6] 🟢 M | réponse valide');
    const r = hook('guard-s1-header.sh', { transcript_path: t });
    ok(r.status === 0, 'exit 0 si header présent');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('bloque (exit 2) si header absent, stop_hook_active=false → relance', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  const marker = '/tmp/claude-atelier-s1-relance-s1-block';
  try {
    try { rmSync(marker); } catch {}
    const t = makeS1Transcript(dir, 'Je termine ma réponse sans header...');
    const r = hook('guard-s1-header.sh', { transcript_path: t, session_id: 's1-block', stop_hook_active: false });
    ok(r.status === 2, 'exit 2 si header manquant (stop_hook_active explicitement false)');
    ok(r.stderr.includes('§1 VIOLATION'), 'message §1 VIOLATION dans stderr');
  } finally { rmSync(dir, { recursive: true, force: true }); try { rmSync(marker); } catch {} }
});

test('escape si stop_hook_active=true (anti-boucle primaire)', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  try {
    const t = makeS1Transcript(dir, 'réponse sans header du tout');
    const r = hook('guard-s1-header.sh', { transcript_path: t, stop_hook_active: true, session_id: 's1-active' });
    ok(r.status === 0, 'exit 0 si déjà relancé une fois');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('coupe-circuit fail-safe : 2e blocage consécutif passe (jamais de verrou)', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  const marker = '/tmp/claude-atelier-s1-relance-s1-cb';
  try {
    try { rmSync(marker); } catch {}
    const t = makeS1Transcript(dir, 'toujours pas de header');
    // 1er Stop sans header et sans stop_hook_active → bloque (arme le marqueur)
    const r1 = hook('guard-s1-header.sh', { transcript_path: t, session_id: 's1-cb', stop_hook_active: false });
    ok(r1.status === 2, '1er passage bloque');
    // 2e Stop identique, runtime ne fournit PAS stop_hook_active → coupe-circuit force le passage
    const r2 = hook('guard-s1-header.sh', { transcript_path: t, session_id: 's1-cb', stop_hook_active: false });
    ok(r2.status === 0, '2e passage consécutif laisse passer (pas de boucle)');
  } finally { rmSync(dir, { recursive: true, force: true }); try { rmSync(marker); } catch {} }
});

test('vérifie la PREMIÈRE réponse du tour, pas la dernière', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  try {
    const t = resolve(dir, 'session.jsonl');
    const lines = [
      JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'fais X' }] } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: '[2026-06-25 18:00:00 | claude-opus-4-8] 🟢 M | je commence' }] } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'voilà, terminé sans header' }] } })
    ];
    writeFileSync(t, lines.join('\n') + '\n');
    const r = hook('guard-s1-header.sh', { transcript_path: t });
    ok(r.status === 0, 'exit 0 — header sur la 1ère réponse du tour suffit');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('passe si entête entouré de backticks (markdown) — sans année', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  try {
    const t = makeS1Transcript(dir, '`[06-25 18:55:16 | claude-opus-4-8] ⬇️`');
    const r = hook('guard-s1-header.sh', { transcript_path: t });
    ok(r.status === 0, 'exit 0 — backticks tolérés + format MM-DD sans année');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('passe si entête 3-segments avec conso contexte [MM-DD HH:MM:SS | model | ctx N%] PASTILLE', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  try {
    const t = makeS1Transcript(dir, '`[06-25 18:55:16 | claude-opus-4-8 | ctx 5%] 🟢`');
    const r = hook('guard-s1-header.sh', { transcript_path: t });
    ok(r.status === 0, 'exit 0 — nouveau format 3-segments (segment ctx) accepté');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('NE bloque PAS quand un feedback Stop isMeta suit ma réponse à header (anti-boucle)', () => {
  // Bug réel : le feedback du hook Stop, injecté comme tour user isMeta:true APRÈS
  // ma réponse, devenait le "dernier prompt" → header hors fenêtre → faux blocage.
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  const transcript = resolve(dir, 'session.jsonl');
  try {
    const lines = [
      { type: 'user', message: { role: 'user', content: 'vrai prompt utilisateur' } },
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: '`[06-25 21:17:10 | claude-opus-4-8 | ctx 15%] ⬇️`' }] } },
      { type: 'user', isMeta: true, message: { role: 'user', content: 'Stop hook feedback:\n§1 VIOLATION ...' } }
    ];
    writeFileSync(transcript, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
    const r = hook('guard-s1-header.sh', { transcript_path: transcript, session_id: 's1-meta', stop_hook_active: false });
    ok(r.status === 0, 'exit 0 — le feedback isMeta est ignoré, mon header reste détecté');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('bloque quand même si AUCUN header, même feedback isMeta présent (vraie violation)', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  const transcript = resolve(dir, 'session.jsonl');
  const marker = '/tmp/claude-atelier-s1-relance-s1-meta-real';
  try {
    try { rmSync(marker); } catch {}
    const lines = [
      { type: 'user', message: { role: 'user', content: 'vrai prompt' } },
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'réponse sans header du tout' }] } },
      { type: 'user', isMeta: true, message: { role: 'user', content: 'Stop hook feedback:\n§1 VIOLATION ...' } }
    ];
    writeFileSync(transcript, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
    const r = hook('guard-s1-header.sh', { transcript_path: transcript, session_id: 's1-meta-real', stop_hook_active: false });
    ok(r.status === 2, 'exit 2 — le skip isMeta ne masque pas une vraie absence de header');
  } finally { try { rmSync(marker); } catch {} rmSync(dir, { recursive: true, force: true }); }
});

test('passe si tour 100% tool_use (aucun texte assistant) — pas de faux-positif', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  try {
    const t = resolve(dir, 'session.jsonl');
    const lines = [
      JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'lance un outil' }] } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: {} }] } })
    ];
    writeFileSync(t, lines.join('\n') + '\n');
    const r = hook('guard-s1-header.sh', { transcript_path: t, session_id: 's1-tooluse' });
    ok(r.status === 0, 'exit 0 — pas de blocage quand le tour n\'a aucun texte');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('isolation multi-session : deux transcripts distincts → marqueurs distincts', () => {
  const dirA = mkdtempSync(resolve(tmpdir(), 's1A-'));
  const dirB = mkdtempSync(resolve(tmpdir(), 's1B-'));
  try {
    const tA = makeS1Transcript(dirA, 'session A sans header');
    const tB = makeS1Transcript(dirB, 'session B sans header');
    // Pas de session_id → clé dérivée du transcript_path (unique par session)
    const rA = hook('guard-s1-header.sh', { transcript_path: tA, stop_hook_active: false });
    ok(rA.status === 2, 'session A bloque (arme son propre marqueur)');
    // Session B < 30s après : NE DOIT PAS être suppressée par le marqueur de A
    const rB = hook('guard-s1-header.sh', { transcript_path: tB, stop_hook_active: false });
    ok(rB.status === 2, 'session B bloque aussi — pas de collision via marqueur global');
  } finally {
    rmSync(dirA, { recursive: true, force: true });
    rmSync(dirB, { recursive: true, force: true });
  }
});

test('passe si pas de transcript (rien à vérifier)', () => {
  const r = hook('guard-s1-header.sh', {});
  ok(r.status === 0, 'exit 0 sans transcript');
});

test('passe si GUARD_S1_TEST_SKIP=1', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 's1-'));
  try {
    const t = makeS1Transcript(dir, 'pas de header');
    const r = hook('guard-s1-header.sh', { transcript_path: t, prompt: 'test' }, { GUARD_S1_TEST_SKIP: '1' });
    ok(r.status === 0, 'exit 0 avec skip');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ─────────────────────────────────────────────────────────────
// guard-loop-master.sh — §3 : pipeline obligatoire
// ─────────────────────────────────────────────────────────────
console.log('\n── guard-loop-master.sh ──');

test('passe si GUARD_LOOP_TEST_SKIP=1', () => {
  const r = hook('guard-loop-master.sh',
    { tool_input: { command: 'git commit -m "test"' } },
    { GUARD_LOOP_TEST_SKIP: '1' }
  );
  ok(r.status === 0, 'exit 0 avec skip env');
});

test('passe si commande n\'est pas git commit', () => {
  const r = hook('guard-loop-master.sh',
    { tool_input: { command: 'git status' } },
    { GUARD_LOOP_TEST_SKIP: '0', GUARD_LOOP_TEST_STAGED: '5' }
  );
  ok(r.status === 0, 'exit 0 si pas git commit');
});

test('passe si moins de 2 fichiers stagés', () => {
  const r = hook('guard-loop-master.sh',
    { tool_input: { command: 'git commit -m "fix typo"' } },
    { GUARD_LOOP_TEST_STAGED: '1' }
  );
  ok(r.status === 0, 'exit 0 si 1 seul fichier');
});

test('bloque (exit 2) si multi-fichiers et loop-done absent', () => {
  // Le flag est un fichier /tmp global, partagé avec une vraie session en cours
  // (loop-master réel) : le nettoyer avant d'asserter son absence, sinon faux
  // échec si un /loop-master a légitimement tourné juste avant ce test.
  try { rmSync('/tmp/claude-atelier-loop-done'); } catch {}
  const r = hook('guard-loop-master.sh',
    { tool_input: { command: 'git commit -m "feat: nouveau skill"' } },
    { GUARD_LOOP_TEST_STAGED: '3' }
  );
  ok(r.status === 2, 'exit 2 si pipeline non exécuté');
  ok(r.stderr.includes('§3 VIOLATION'), '§3 VIOLATION dans stderr');
});

test('passe si flag /tmp/claude-atelier-loop-done présent', () => {
  const flagPath = '/tmp/claude-atelier-loop-done';
  try {
    writeFileSync(flagPath, '');
    const r = hook('guard-loop-master.sh',
      { tool_input: { command: 'git commit -m "feat: livraison loop-master"' } },
      { GUARD_LOOP_TEST_STAGED: '5' }
    );
    ok(r.status === 0, 'exit 0 si flag présent');
  } finally {
    try { rmSync(flagPath); } catch {}
  }
});

// ─────────────────────────────────────────────────────────────
// guard-anti-loop.sh — seuil paramétré via _parse-features.sh
// ─────────────────────────────────────────────────────────────
console.log('\n── guard-anti-loop.sh ──');

test('cumule les échecs d\'une même commande', () => {
  const loopFile = resolve(TEST_TMP, 'guard-anti-loop-test');
  const env = { CLAUDE_ATELIER_TMPDIR: TEST_TMP };
  // Première exécution échouée
  let r = hook('guard-anti-loop.sh', { tool_input: { command: 'npm run lint' }, tool_response: { exitCode: 1 } }, env);
  ok(r.status === 0, 'exit 0 même après erreur (warning-only)');
  // Deuxième exécution échouée (même commande)
  r = hook('guard-anti-loop.sh', { tool_input: { command: 'npm run lint' }, tool_response: { exitCode: 1 } }, env);
  ok(r.status === 0, 'cumul OK (exit 0)');
});

test('réinitialise après succès', () => {
  const env = { CLAUDE_ATELIER_TMPDIR: TEST_TMP };
  // Succès = réinitialisation
  const r = hook('guard-anti-loop.sh', { tool_input: { command: 'npm run lint' }, tool_response: { exitCode: 0 } }, env);
  ok(r.status === 0, 'exit 0 après succès (réinitialise)');
});

test('seuil réellement lu depuis le registry via _get_param (pas juste exit 0)', () => {
  // guard-anti-loop.sh utilise /tmp/claude-atelier-loop-detect en dur (pas
  // CLAUDE_ATELIER_TMPDIR) — on nettoie ce fichier réel avant/après pour ne
  // pas polluer d'autres tests. Vérifie que le seuil par défaut du registry
  // (3) déclenche bien le message au 3e échec, pas avant — preuve que
  // _get_param renvoie une vraie valeur numérique, pas une chaîne vide.
  const realLoopFile = '/tmp/claude-atelier-loop-detect';
  let saved = null;
  try { saved = readFileSync(realLoopFile, 'utf8'); } catch {}
  try {
    writeFileSync(realLoopFile, '');
    const cmd = 'echo test-seuil-registry-unique';
    let r = hook('guard-anti-loop.sh', { tool_input: { command: cmd }, tool_response: { exitCode: 1 } });
    ok(!r.stdout.includes('§6'), '1er échec : pas encore de warning');
    r = hook('guard-anti-loop.sh', { tool_input: { command: cmd }, tool_response: { exitCode: 1 } });
    ok(!r.stdout.includes('§6'), '2e échec : toujours pas de warning (seuil=3)');
    r = hook('guard-anti-loop.sh', { tool_input: { command: cmd }, tool_response: { exitCode: 1 } });
    ok(r.stdout.includes('§6') && r.stdout.includes('seuil=3'), '3e échec : warning avec seuil=3 (registry, pas vide)');
  } finally {
    if (saved !== null) writeFileSync(realLoopFile, saved);
    else { try { rmSync(realLoopFile); } catch {} }
  }
});

// ─────────────────────────────────────────────────────────────
// generateHooksSection — install : chemins runtime, jamais d'absolu gravé
// Fix panne "SessionStart hook error / No such file or directory" au
// renommage/déplacement du projet consommateur.
// ─────────────────────────────────────────────────────────────
console.log('\n── generateHooksSection (chemins hooks) ──');

test('projet : référence ${CLAUDE_PROJECT_DIR}, jamais un absolu machine', () => {
  const hooks = generateHooksSection('${CLAUDE_PROJECT_DIR}/hooks', '${CLAUDE_PROJECT_DIR}/scripts');
  const dump = JSON.stringify(hooks);
  ok(dump.includes('${CLAUDE_PROJECT_DIR}/hooks/session-model.sh'), 'session-model référencé via CLAUDE_PROJECT_DIR');
  ok(!/"[^"]*\/(Users|home)\//.test(dump), 'aucun chemin absolu machine gravé dans les commandes');
});

test('guard runtime : script absent → exit 0 silencieux, zéro pollution', () => {
  const hooks = generateHooksSection('${CLAUDE_PROJECT_DIR}/hooks', '${CLAUDE_PROJECT_DIR}/scripts');
  const cmd = hooks.SessionStart[0].hooks[0].command;
  ok(cmd.includes('[ -f "$0" ]') && cmd.includes('exit 0'), 'garde présence + exit 0 présente');
  // Simulation réelle : substitue CLAUDE_PROJECT_DIR par un dossier SANS le script.
  const emptyDir = mkdtempSync(resolve(tmpdir(), 'no-hooks-'));
  try {
    const resolved = cmd.replace(/\$\{CLAUDE_PROJECT_DIR\}/g, emptyDir);
    const r = spawnSync('bash', ['-c', resolved], { input: '{}', encoding: 'utf8' });
    ok(r.status === 0, `exit 0 sur script absent (reçu ${r.status})`);
    ok(r.stdout.trim() === '' && r.stderr.trim() === '', 'aucune pollution stdout/stderr au démarrage');
  } finally {
    rmSync(emptyDir, { recursive: true, force: true });
  }
});

test('chemin référencé existe réellement dans le package (script livré)', () => {
  // Refs absolues sur le repo = miroir de la disposition livrée dans le tarball.
  const hooks = generateHooksSection(resolve(ROOT, 'hooks'), resolve(ROOT, 'scripts'));
  const cmd = hooks.SessionStart[0].hooks[0].command;
  const m = cmd.match(/"([^"]+session-model\.sh)"/);
  ok(m, 'chemin session-model.sh extractible de la commande');
  ok(existsSync(m[1]), `le script référencé existe sur disque : ${m && m[1]}`);
});

test('chemin tolérant aux espaces : « Claude Atelier » résolu correctement', () => {
  const spaced = mkdtempSync(resolve(tmpdir(), 'Claude Atelier '));
  try {
    mkdirSync(resolve(spaced, 'hooks'), { recursive: true });
    writeFileSync(resolve(spaced, 'hooks', 'session-model.sh'), '#!/bin/bash\ncat >/dev/null\necho SPACED_OK\n');
    const hooks = generateHooksSection('${CLAUDE_PROJECT_DIR}/hooks', '${CLAUDE_PROJECT_DIR}/scripts');
    const cmd = hooks.SessionStart[0].hooks[0].command.replace(/\$\{CLAUDE_PROJECT_DIR\}/g, spaced);
    const r = spawnSync('bash', ['-c', cmd], { input: '{}', encoding: 'utf8' });
    ok(r.status === 0, `exit 0 malgré l'espace dans le chemin (reçu ${r.status})`);
    ok(r.stdout.includes('SPACED_OK'), 'le script est bien exécuté malgré l\'espace');
  } finally {
    rmSync(spaced, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────
// Bilan
// ─────────────────────────────────────────────────────────────
const total = pass + fail;
console.log(`\n── Amine 🧪 : ${pass}/${total} tests passés${fail > 0 ? ` · ${fail} ÉCHECS` : ''} ──\n`);
if (fail > 0) process.exit(1);
