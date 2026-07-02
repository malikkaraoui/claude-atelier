#!/usr/bin/env node
/**
 * test/post-install-checks.js — Tests de bin/post-install-checks.js
 * Couvre le bug ENOLOCK : npm audit sans lockfile ne doit pas afficher
 * un faux positif "vulnérabilités high/critical détectées".
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { runPostInstallChecks } from '../bin/post-install-checks.js';

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

function captureLogs(fn) {
  const lines = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => lines.push(args.join(' '));
  console.error = (...args) => lines.push(args.join(' '));
  try {
    fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  return lines.join('\n');
}

console.log('\n[POST-INSTALL-CHECKS] npm audit — faux positif ENOLOCK');

test('projet sans lockfile → message calme "ignoré", pas de faux "vulnérabilités"', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'post-install-'));
  writeFileSync(resolve(dir, 'package.json'), JSON.stringify({ name: 'tmp-test', version: '1.0.0' }));
  const output = captureLogs(() => runPostInstallChecks(dir, process.cwd()));
  ok(!output.includes('vulnérabilités high/critical détectées'), 'ne doit PAS afficher le faux positif');
  ok(output.includes('npm audit ignoré'), 'doit afficher le message calme "ignoré"');
  ok(output.includes('pas de lockfile'), 'le message doit mentionner l\'absence de lockfile');
  rmSync(dir, { recursive: true, force: true });
});

test('pas de package.json → message "audit ignoré (pas de package.json)", inchangé', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'post-install-empty-'));
  const output = captureLogs(() => runPostInstallChecks(dir, process.cwd()));
  ok(output.includes('npm audit ignoré (pas de package.json'), 'branche existante non régressée');
  ok(!output.includes('vulnérabilités'), 'aucun faux positif sans package.json non plus');
  rmSync(dir, { recursive: true, force: true });
});

console.log(`\n${pass + fail} tests — ${pass} ✓ ${fail} ✗\n`);
process.exit(fail > 0 ? 1 : 0);
