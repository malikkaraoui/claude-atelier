#!/usr/bin/env node
/**
 * test/memory.js — Memory system tests
 *
 * Tests for the 3-level memory system:
 * - memory-lib.js exports (openDb, closeDb, detectMode, etc.)
 * - memory-init.sh schema creation
 *
 * Zero dependencies: Node.js builtin only.
 *
 * Usage: node test/memory.js
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

let pass = 0;
let fail = 0;
const testFns = [];

function test(label, fn) {
  testFns.push({ label, fn, async: false });
}

function testAsync(label, fn) {
  testFns.push({ label, fn, async: true });
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg ?? 'assertion failed');
}

async function runTests() {
  for (const { label, fn, async: isAsync } of testFns) {
    try {
      if (isAsync) {
        await fn();
      } else {
        fn();
      }
      console.log(`  ✓ ${label}`);
      pass++;
    } catch (e) {
      console.error(`  ✗ ${label}`);
      console.error(`    └ ${e.message}`);
      fail++;
    }
  }
}

// Import memory-lib functions
import {
  openDb,
  closeDb,
  detectMode,
  cosineSimilarity,
  float32ToBuffer,
  bufferToFloat32
} from '../scripts/memory-lib.js';

// ─────────────────────────────────────────────────────────────
// Test: openDb returns a database instance
// ─────────────────────────────────────────────────────────────
console.log('\n── memory-lib.js ──');

test('openDb returns a database instance', () => {
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'memory-test-'));
  const dbPath = resolve(tmpDir, 'test.db');

  try {
    const db = openDb(dbPath);
    ok(db !== null && typeof db === 'object', 'db should be an object');
    ok(typeof db.prepare === 'function', 'db should have prepare method');
    closeDb(db);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

testAsync('detectMode returns MINIMAL for nonexistent path', async () => {
  const nonexistentPath = resolve(tmpdir(), `nonexistent-${Date.now()}.db`);
  const mode = await detectMode(nonexistentPath);
  ok(mode === 'MINIMAL', `expected MINIMAL, got ${mode}`);
});

test('cosineSimilarity identity vectors = 1.0', () => {
  const vec = new Float32Array([1, 0, 0]);
  const similarity = cosineSimilarity(vec, vec);
  ok(Math.abs(similarity - 1.0) < 0.001, `expected ~1.0, got ${similarity}`);
});

test('cosineSimilarity orthogonal vectors = 0.0', () => {
  const v1 = new Float32Array([1, 0, 0]);
  const v2 = new Float32Array([0, 1, 0]);
  const similarity = cosineSimilarity(v1, v2);
  ok(Math.abs(similarity) < 0.001, `expected ~0.0, got ${similarity}`);
});

test('float32ToBuffer roundtrips correctly', () => {
  const original = new Float32Array([1.5, -2.5, 3.14]);
  const buf = float32ToBuffer(original);
  const restored = bufferToFloat32(buf);

  ok(buf instanceof Buffer, 'float32ToBuffer should return Buffer');
  ok(restored instanceof Float32Array, 'bufferToFloat32 should return Float32Array');

  for (let i = 0; i < original.length; i++) {
    ok(Math.abs(original[i] - restored[i]) < 0.001,
      `index ${i}: expected ${original[i]}, got ${restored[i]}`);
  }
});

// ─────────────────────────────────────────────────────────────
// Test: memory-init.sh schema creation
// ─────────────────────────────────────────────────────────────
console.log('\n── memory-init.sh ──');

test('memory-init.sh creates database with all tables', () => {
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'memory-init-'));
  const dbPath = resolve(tmpDir, 'memory.db');

  try {
    const result = spawnSync('bash', [resolve(ROOT, 'scripts/memory-init.sh'), dbPath], {
      encoding: 'utf8',
      cwd: ROOT
    });

    ok(result.status === 0, `init should exit 0, got ${result.status}: ${result.stderr}`);
    ok(existsSync(dbPath), 'database file should exist');

    // Verify tables exist using sqlite3 command
    const tableCheck = spawnSync('sqlite3', [dbPath, '.tables'], { encoding: 'utf8' });
    const tables = tableCheck.stdout.split(/\s+/).filter(t => t);

    ok(tables.includes('episodes'), 'episodes table missing');
    ok(tables.includes('nodes'), 'nodes table missing');
    ok(tables.includes('edges'), 'edges table missing');
    ok(tables.includes('embeddings'), 'embeddings table missing');
    ok(tables.includes('episodes_fts'), 'episodes_fts table missing');
    ok(tables.includes('nodes_fts'), 'nodes_fts table missing');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('memory-init.sh skips if db exists', () => {
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'memory-init-'));
  const dbPath = resolve(tmpDir, 'memory.db');

  try {
    // First run
    const result1 = spawnSync('bash', [resolve(ROOT, 'scripts/memory-init.sh'), dbPath], {
      encoding: 'utf8',
      cwd: ROOT
    });
    ok(result1.status === 0, `first init should exit 0`);

    // Second run
    const result2 = spawnSync('bash', [resolve(ROOT, 'scripts/memory-init.sh'), dbPath], {
      encoding: 'utf8',
      cwd: ROOT
    });
    ok(result2.status === 0, `second init should exit 0`);
    ok(result2.stdout.includes('skip') || result2.stdout.includes('exists'),
      `second init should print skip message: ${result2.stdout}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('FTS5 trigger: insert node, verify nodes_fts has matching row', () => {
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'memory-fts-'));
  const dbPath = resolve(tmpDir, 'memory.db');

  try {
    // Initialize DB
    const initResult = spawnSync('bash', [resolve(ROOT, 'scripts/memory-init.sh'), dbPath], {
      encoding: 'utf8',
      cwd: ROOT
    });
    ok(initResult.status === 0, `init should exit 0`);

    // Open DB and insert a node
    const db = openDb(dbPath);
    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO nodes (name, type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('test-node', 'script', 'Test description', now, now);

      // Check FTS5 table
      const row = db.prepare(`
        SELECT * FROM nodes_fts WHERE name = ?
      `).get('test-node');

      ok(row, 'FTS5 trigger should have inserted row into nodes_fts');
    } finally {
      closeDb(db);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────
// Test: memory-read.js search modes
// ─────────────────────────────────────────────────────────────
console.log('\n── memory-read.js ──');

test('--episodes-only returns recent episodes', () => {
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'memory-read-'));
  const dbPath = resolve(tmpDir, 'memory.db');

  try {
    // Initialize DB
    const initResult = spawnSync('bash', [resolve(ROOT, 'scripts/memory-init.sh'), dbPath], {
      encoding: 'utf8',
      cwd: ROOT
    });
    ok(initResult.status === 0, `init should exit 0`);

    // Insert an episode
    const db = openDb(dbPath);
    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO episodes (session_id, summary, timestamp)
        VALUES (?, ?, ?)
      `).run('sess-1', 'Test episode summary', now);
    } finally {
      closeDb(db);
    }

    // Read with --episodes-only
    const readResult = spawnSync('node', [resolve(ROOT, 'scripts/memory-read.js'), '--episodes-only', '--db', dbPath], {
      encoding: 'utf8',
      cwd: ROOT
    });

    ok(readResult.status === 0, `read should exit 0: ${readResult.stderr}`);
    ok(readResult.stdout.includes('EPISODES_ONLY'), 'output should mention mode');
    ok(readResult.stdout.includes('Test episode'), 'output should include episode summary');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('FTS5 search finds matching nodes', () => {
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'memory-read-fts-'));
  const dbPath = resolve(tmpDir, 'memory.db');

  try {
    // Initialize DB
    const initResult = spawnSync('bash', [resolve(ROOT, 'scripts/memory-init.sh'), dbPath], {
      encoding: 'utf8',
      cwd: ROOT
    });
    ok(initResult.status === 0, `init should exit 0`);

    // Insert 3 nodes
    const db = openDb(dbPath);
    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO nodes (name, type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('routing-engine', 'concept', 'Request routing logic', now, now);
      db.prepare(`
        INSERT INTO nodes (name, type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('database', 'concept', 'Data storage', now, now);
      db.prepare(`
        INSERT INTO nodes (name, type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('api-gateway', 'concept', 'Gateway for APIs', now, now);
    } finally {
      closeDb(db);
    }

    // Search for "routing"
    const readResult = spawnSync('node', [resolve(ROOT, 'scripts/memory-read.js'), 'routing', '--db', dbPath], {
      encoding: 'utf8',
      cwd: ROOT
    });

    ok(readResult.status === 0, `read should exit 0: ${readResult.stderr}`);
    ok(readResult.stdout.includes('FULL'), 'output should mention FULL mode');
    ok(readResult.stdout.includes('routing-engine'), 'output should include routing node');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('--graph shows 1-hop neighbors', () => {
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'memory-read-graph-'));
  const dbPath = resolve(tmpDir, 'memory.db');

  try {
    // Initialize DB
    const initResult = spawnSync('bash', [resolve(ROOT, 'scripts/memory-init.sh'), dbPath], {
      encoding: 'utf8',
      cwd: ROOT
    });
    ok(initResult.status === 0, `init should exit 0`);

    // Create 2 nodes and an edge
    const db = openDb(dbPath);
    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO nodes (name, type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('routing', 'concept', 'Routing logic', now, now);
      db.prepare(`
        INSERT INTO nodes (name, type, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('cache', 'concept', 'Caching layer', now, now);

      // Get node IDs
      const routingNode = db.prepare(`SELECT id FROM nodes WHERE name = ?`).get('routing');
      const cacheNode = db.prepare(`SELECT id FROM nodes WHERE name = ?`).get('cache');

      db.prepare(`
        INSERT INTO edges (source_id, target_id, relation, weight, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(routingNode.id, cacheNode.id, 'depends_on', 1.0, now);
    } finally {
      closeDb(db);
    }

    // Query --graph routing
    const readResult = spawnSync('node', [resolve(ROOT, 'scripts/memory-read.js'), '--graph', 'routing', '--db', dbPath], {
      encoding: 'utf8',
      cwd: ROOT
    });

    ok(readResult.status === 0, `read should exit 0: ${readResult.stderr}`);
    ok(readResult.stdout.includes('GRAPH'), 'output should mention GRAPH mode');
    ok(readResult.stdout.includes('cache'), 'output should include neighbor node');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────
// Run all tests
// ─────────────────────────────────────────────────────────────
await runTests();


console.log(`\n──────────────────────`);
console.log(`✓ ${pass} passed`);
if (fail > 0) console.log(`✗ ${fail} failed`);
console.log(`──────────────────────\n`);

process.exit(fail > 0 ? 1 : 0);
