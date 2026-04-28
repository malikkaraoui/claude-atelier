#!/usr/bin/env node
/**
 * test/pulse.js — Tests unitaires système Pulse & Maestro
 * Usage: node test/pulse.js  (ou: npm run test:pulse)
 */

import { parsePoulsMdContent, isExpired, ageSeconds } from '../src/pulse/parse.js';

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

// ── parse.js ──────────────────────────────────────────────────────────────────
console.log('\n[parse.js]');

const VALID_MD = `---
schema: pouls/1.0
agent:
  id: claude-code/test
  name: Test Agent
  role: dev
  provider: claude

status: idle
lastPulse: "2020-01-01T00:00:00Z"
ttl: 300

phase: "Phase test"
intensity:
  current: 0.30
  ceiling: 0.80

lang: fr
---

## État
test
`;

test('parse frontmatter valide', () => {
  const p = parsePoulsMdContent(VALID_MD);
  ok(p.schema === 'pouls/1.0', 'schema');
  ok(p.agent.id === 'claude-code/test', 'agent.id');
  ok(p.agent.role === 'dev', 'agent.role');
  ok(p.agent.name === 'Test Agent', 'agent.name');
  ok(p.agent.provider === 'claude', 'agent.provider');
  ok(p.status === 'idle', 'status');
  ok(p.ttl === 300, 'ttl number');
  ok(p.intensity.current === 0.30, 'intensity.current');
  ok(p.intensity.ceiling === 0.80, 'intensity.ceiling');
  ok(p.lang === 'fr', 'lang');
  ok(p._body.includes('## État'), '_body');
});

test('erreur si frontmatter absent', () => {
  let threw = false;
  try { parsePoulsMdContent('# no frontmatter'); } catch { threw = true; }
  ok(threw, 'doit lever une erreur');
});

test('erreur si schema incorrect', () => {
  const bad = VALID_MD.replace('pouls/1.0', 'pouls/2.0');
  let threw = false;
  try { parsePoulsMdContent(bad); } catch { threw = true; }
  ok(threw, 'doit lever une erreur schema');
});

test('isExpired: lastPulse ancienne → expiré', () => {
  const p = parsePoulsMdContent(VALID_MD);
  ok(isExpired(p), 'doit être expiré (lastPulse 2020)');
});

test('isExpired: lastPulse récente → non expiré', () => {
  const fresh = VALID_MD.replace('"2020-01-01T00:00:00Z"', `"${new Date().toISOString()}"`);
  const p = parsePoulsMdContent(fresh);
  ok(!isExpired(p), 'ne doit pas être expiré');
});

test('ageSeconds: renvoie un nombre positif', () => {
  const p = parsePoulsMdContent(VALID_MD);
  const age = ageSeconds(p);
  ok(age > 0 && isFinite(age), `age=${age} doit être positif fini`);
});

// ── résumé ────────────────────────────────────────────────────────────────────
console.log(`\n  ${pass} passed · ${fail} failed\n`);
if (fail > 0) process.exit(1);
