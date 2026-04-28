#!/usr/bin/env node
/**
 * test/pulse.js — Tests unitaires système Pulse & Maestro
 * Usage: node test/pulse.js  (ou: npm run test:pulse)
 */

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsePoulsMd, parsePoulsMdContent, isExpired, ageSeconds } from '../src/pulse/parse.js';
import { computeIntensity, intensityToStatus, getProfile } from '../src/pulse/intensity.js';
import { serialisePoulsMd, writePoulsMd } from '../src/pulse/write.js';
import { statusLabel, pulseIndicator, renderStatusTable, _clearCache } from '../src/pulse/format.js';
import { sanitizeHostname, buildAgentId, buildKnownAgentIds } from '../src/pulse/identity.js';
import { computePulseSummary } from '../src/pulse/summary.js';

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

// ── intensity.js ─────────────────────────────────────────────────────────────
console.log('\n[intensity.js]');

test('getProfile dev: ceiling 0.8', () => {
  const p = getProfile('dev');
  ok(p.ceiling === 0.8, `ceiling=${p.ceiling}`);
  ok(p.base === 0.3, `base=${p.base}`);
});

test('getProfile inconnu → profile par défaut', () => {
  const p = getProfile('unknown_role');
  ok(p.ceiling > 0, 'ceiling doit être positif');
});

test('computeIntensity dev + phase impl → boost', () => {
  const base = computeIntensity('dev', '');
  const boosted = computeIntensity('dev', 'Phase 2 — implémentation proxy');
  ok(boosted > base, `boosted(${boosted}) > base(${base})`);
});

test('computeIntensity dev + phase freeze → réduit', () => {
  const base = computeIntensity('dev', '');
  const frozen = computeIntensity('dev', 'freeze release');
  ok(frozen <= base, `frozen(${frozen}) <= base(${base})`);
});

test('computeIntensity ne dépasse jamais le ceiling', () => {
  const profile = getProfile('secretary');
  const val = computeIntensity('secretary', 'impl code fix feat deploy release');
  ok(val <= profile.ceiling, `val(${val}) <= ceiling(${profile.ceiling})`);
});

test('computeIntensity toujours >= 0', () => {
  const val = computeIntensity('ops', 'freeze pause repos');
  ok(val >= 0, `val(${val}) doit être >= 0`);
});

test('intensityToStatus: 0 → off', () => ok(intensityToStatus(0) === 'off', 'off'));
test('intensityToStatus: 0.15 → idle', () => ok(intensityToStatus(0.15) === 'idle', 'idle'));
test('intensityToStatus: 0.3 → low', () => ok(intensityToStatus(0.3) === 'low', 'low'));
test('intensityToStatus: 0.5 → medium', () => ok(intensityToStatus(0.5) === 'medium', 'medium'));
test('intensityToStatus: 0.7 → high', () => ok(intensityToStatus(0.7) === 'high', 'high'));
test('intensityToStatus: 0.9 → critical', () => ok(intensityToStatus(0.9) === 'critical', 'critical'));

test('intensityToStatus: 0.2 (exact) → idle', () => ok(intensityToStatus(0.2) === 'idle', 'idle at 0.2'));
test('intensityToStatus: 0.4 (exact) → low', () => ok(intensityToStatus(0.4) === 'low', 'low at 0.4'));
test('intensityToStatus: 0.6 (exact) → medium', () => ok(intensityToStatus(0.6) === 'medium', 'medium at 0.6'));
test('intensityToStatus: 0.8 (exact) → high', () => ok(intensityToStatus(0.8) === 'high', 'high at 0.8'));

test('computeIntensity: phase UPPERCASE → même résultat que lowercase', () => {
  const low = computeIntensity('dev', 'impl');
  const up  = computeIntensity('dev', 'IMPL');
  ok(low === up, `lowercase(${low}) === uppercase(${up})`);
});

// ── summary.js ───────────────────────────────────────────────────────────────
console.log('\n[summary.js]');

test('computePulseSummary compte tous les agents actifs, pas seulement le plus intense', () => {
  const fresh = new Date().toISOString();
  const agents = [
    { status: 'high', lastPulse: fresh, ttl: 300, intensity: { current: 0.7, ceiling: 0.8 } },
    { status: 'medium', lastPulse: fresh, ttl: 300, intensity: { current: 0.5, ceiling: 0.8 } },
    { status: 'idle', lastPulse: fresh, ttl: 300, intensity: { current: 0.1, ceiling: 0.8 } },
    { status: 'high', lastPulse: '2020-01-01T00:00:00Z', ttl: 300, intensity: { current: 0.9, ceiling: 0.9 } },
  ];

  const summary = computePulseSummary(agents);
  ok(summary.active === 3, `active=${summary.active} attendu 3`);
  ok(summary.topStatus === 'high', `topStatus=${summary.topStatus} attendu high`);
  ok(summary.topIntensity === 0.7, `topIntensity=${summary.topIntensity} attendu 0.7`);
});

// ── identity.js ──────────────────────────────────────────────────────────────
console.log('\n[identity.js]');

test('sanitizeHostname normalise le hostname pour le slug', () => {
  ok(sanitizeHostname('Malik\'s.MacBook Pro.local') === 'malik-s-macbook-pro-local', 'hostname sanitisé');
});

test('buildAgentId différencie deux hostnames qui convergent vers le même slug', () => {
  const left = buildAgentId('Dev.Box');
  const right = buildAgentId('Dev-Box');

  ok(left !== right, `${left} ne doit pas égaler ${right}`);
});

test('buildKnownAgentIds garde la compatibilité avec les anciens identifiants agent', () => {
  const ids = buildKnownAgentIds('Maliks-MacBook-Pro.local');

  ok(ids.includes(buildAgentId('Maliks-MacBook-Pro.local')), 'doit inclure le nouvel id');
  ok(ids.includes('claude-code/maliks-macbook-pro-local'), 'doit inclure le legacy sanitisé');
  ok(ids.includes('claude-code/Maliks-MacBook-Pro.local'), 'doit inclure le legacy brut');
});

// ── write.js ─────────────────────────────────────────────────────────────────
console.log('\n[write.js]');

const SAMPLE_DATA = {
  agent: { id: 'claude-code/test', name: 'Test', role: 'dev', provider: 'claude' },
  status: 'high',
  lastPulse: '2026-04-28T12:00:00Z',
  ttl: 300,
  phase: 'Phase test',
  intensity: { current: 0.70, ceiling: 0.80 },
  lang: 'fr',
};

test('serialisePoulsMd produit un frontmatter YAML parsable', () => {
  const content = serialisePoulsMd(SAMPLE_DATA, '## Corps\nTest.');
  const parsed = parsePoulsMdContent(content);
  ok(parsed.agent.id === 'claude-code/test', 'agent.id round-trip');
  ok(parsed.status === 'high', 'status round-trip');
  ok(parsed.ttl === 300, 'ttl round-trip');
  ok(parsed.intensity.current === 0.70, 'intensity.current round-trip');
  ok(parsed._body.includes('## Corps'), '_body round-trip');
});

test('serialisePoulsMd commence par ---', () => {
  const content = serialisePoulsMd(SAMPLE_DATA, '');
  ok(content.startsWith('---\n'), 'doit commencer par ---');
});

test('serialisePoulsMd: agent.name avec ":" ne casse pas le round-trip', () => {
  const data = { ...SAMPLE_DATA, agent: { ...SAMPLE_DATA.agent, name: 'Test: Code Review' } };
  const content = serialisePoulsMd(data, '');
  const parsed = parsePoulsMdContent(content);
  ok(parsed.agent.name === 'Test: Code Review', `name="${parsed.agent.name}"`);
});

test('writePoulsMd écrit sur disque sans laisser de fichier temporaire', () => {
  const dir = mkdtempSync(join(tmpdir(), 'claude-atelier-pulse-'));
  const filePath = join(dir, 'agents', 'pouls.md');

  try {
    writePoulsMd(filePath, SAMPLE_DATA, '## Corps\nInitial.');
    writePoulsMd(filePath, { ...SAMPLE_DATA, status: 'low' }, '## Corps\nMis à jour.');

    ok(existsSync(filePath), 'pouls.md doit exister');

    const parsed = parsePoulsMd(filePath);
    ok(parsed.status === 'low', `status=${parsed.status} attendu low`);

    const files = readdirSync(join(dir, 'agents'));
    ok(files.length === 1 && files[0] === 'pouls.md', `fichiers inattendus: ${files.join(', ')}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── format.js ────────────────────────────────────────────────────────────────
console.log('\n[format.js]');
_clearCache();

test('statusLabel FR: high → élevé', () => {
  ok(statusLabel('high', 'fr') === 'élevé', 'élevé');
});

test('statusLabel EN: high → high', () => {
  ok(statusLabel('high', 'en') === 'high', 'high');
});

test('statusLabel FR: idle → repos', () => {
  ok(statusLabel('idle', 'fr') === 'repos', 'repos');
});

test('pulseIndicator format correct FR', () => {
  const ind = pulseIndicator('high', 2, 3, 'fr');
  ok(ind === '💓élevé·2/3', `attendu 💓élevé·2/3, reçu: ${ind}`);
});

test('pulseIndicator format correct EN', () => {
  const ind = pulseIndicator('high', 2, 3, 'en');
  ok(ind === '💓high·2/3', `attendu 💓high·2/3, reçu: ${ind}`);
});

test('renderStatusTable contient la séparation et le récapitulatif', () => {
  const agents = [
    { agent: { id: 'a/b', role: 'dev' }, status: 'high', lastPulse: new Date().toISOString(), ttl: 300, phase: 'Phase test', intensity: { current: 0.7, ceiling: 0.8 } },
    { agent: { id: 'c/d', role: 'ops' }, status: 'idle', lastPulse: '2020-01-01T00:00:00Z', ttl: 300, phase: 'Phase test', intensity: { current: 0.1, ceiling: 0.5 } },
  ];
  const table = renderStatusTable(agents, 'fr');
  ok(table.includes('💓'), 'doit contenir 💓');
  ok(table.includes('agents'), 'doit contenir "agents"');
  ok(table.includes('EXPIRÉ'), 'doit contenir EXPIRÉ pour le 2e agent');
});

// ── résumé ────────────────────────────────────────────────────────────────────
console.log(`\n  ${pass} passed · ${fail} failed\n`);
if (fail > 0) process.exit(1);
