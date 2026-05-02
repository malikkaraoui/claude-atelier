#!/usr/bin/env node
/**
 * test/vault.js — Tests de la commande claude-atelier vault.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
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
  if (!cond) throw new Error(msg || 'assertion échouée');
}

function countPeterHooks(settings) {
  const sessionStart = settings.hooks?.SessionStart ?? [];
  return sessionStart.reduce((count, entry) => {
    const hooks = Array.isArray(entry.hooks) ? entry.hooks : [];
    return count + hooks.filter(hook => hook?.command?.includes('vault-context.sh')).length;
  }, 0);
}

function cli(args, cwd) {
  return spawnSync(process.execPath, [join(ROOT, 'bin', 'cli.js'), ...args], {
    cwd,
    encoding: 'utf8',
  });
}

console.log('\n── claude-atelier vault ──');

test('vault init crée les fichiers attendus', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-vault-'));
  try {
    const r = cli(['vault', 'init', '--cwd', dir], dir);
    ok(r.status === 0, `exit 0 attendu, reçu ${r.status}: ${r.stderr}`);
    for (const name of ['PETER.md', '00-brief.md', '10-mailbox.md', '20-decisions.md', '30-discoveries.md', '40-roadmap.md', '90-sources.md']) {
      ok(existsSync(join(dir, 'vault', name)), `${name} doit exister`);
    }
    const peter = readFileSync(join(dir, 'vault', 'PETER.md'), 'utf8');
    ok(peter.includes('Peter maintient le vault dynamique'), 'charte Peter attendue');
    ok(existsSync(join(dir, 'hooks', 'vault-context.sh')), 'hook Peter doit être copié dans le projet');
    const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'));
    ok(JSON.stringify(settings).includes('vault-context.sh'), 'settings doit installer le hook Peter');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault init est idempotent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-vault-'));
  try {
    cli(['vault', 'init', '--cwd', dir], dir);
    const r = cli(['vault', 'init', '--cwd', dir], dir);
    ok(r.status === 0, 'deuxième init doit passer');
    ok(r.stdout.includes('[SKIP]'), 'les fichiers existants doivent être skippés');
    const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'));
    ok(countPeterHooks(settings) === 1, 'le hook Peter ne doit être installé qu’une seule fois');
    ok(settings.hooks.SessionStart[0].hooks[0].command.includes('vault-context.sh'), 'le hook Peter doit rester dans SessionStart');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault status signale un vault absent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-vault-'));
  try {
    const r = cli(['vault', 'status', '--cwd', dir], dir);
    ok(r.status === 0, 'status sans vault doit passer');
    ok(r.stdout.includes('Aucun vault projet'), 'message vault absent attendu');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const total = pass + fail;
console.log(`\n── Vault : ${pass}/${total} tests passés${fail > 0 ? ` · ${fail} ÉCHECS` : ''} ──\n`);
if (fail > 0) process.exit(1);
