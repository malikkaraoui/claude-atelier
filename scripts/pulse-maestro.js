#!/usr/bin/env node
/**
 * scripts/pulse-maestro.js — Start hook Maestro
 * Lit §0.Phase, détecte les changements, calcule l'intensité de tous les agents,
 * écrit /tmp/claude-atelier-pulse-status pour injection dans l'entête §1.
 */

import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePoulsMd, isExpired } from '../src/pulse/parse.js';
import { writePoulsMd } from '../src/pulse/write.js';
import { computeIntensity, intensityToStatus, getProfile } from '../src/pulse/intensity.js';
import { statusLabel } from '../src/pulse/format.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_FILE = '/tmp/claude-atelier-last-phase';
const STATUS_FILE = '/tmp/claude-atelier-pulse-status';

function readPhase(root) {
  const claudeMd = join(root, '.claude', 'CLAUDE.md');
  if (!existsSync(claudeMd)) return '';
  try {
    const content = readFileSync(claudeMd, 'utf8');
    const m = content.match(/\|\s*Phase\s*\|([^|\n]+)\|/);
    return m ? m[1].trim() : '';
  } catch { return ''; }
}

function readLang(root) {
  const cfg = join(root, '.claude', 'atelier-config.json');
  if (!existsSync(cfg)) return 'fr';
  try { return JSON.parse(readFileSync(cfg, 'utf8')).lang ?? 'fr'; } catch { return 'fr'; }
}

function findPoulsMdFiles(dir, depth = 0) {
  if (depth > 4) return [];
  const results = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = join(dir, e.name);
    if (e.isFile() && e.name === 'pouls.md') results.push(full);
    else if (e.isDirectory()) results.push(...findPoulsMdFiles(full, depth + 1));
  }
  return results;
}

const phase = readPhase(ROOT);
const lang = readLang(ROOT);

// ── Détection changement de phase ──
let phaseChanged = false;
let lastPhase = '';
if (existsSync(CACHE_FILE)) {
  lastPhase = readFileSync(CACHE_FILE, 'utf8').trim();
}
if (phase !== lastPhase) {
  phaseChanged = true;
  try { writeFileSync(CACHE_FILE, phase, 'utf8'); } catch (_) {}
}

if (phaseChanged && lastPhase) {
  process.stderr.write(`[MAESTRO] ⚡ Phase changée : "${lastPhase}" → "${phase}"\n`);
  process.stderr.write(`[MAESTRO] 💡 Nouvelle phase détectée → /compact recommandé + nouvelle session\n`);
} else if (phase !== lastPhase && lastPhase === '') {
  try { writeFileSync(CACHE_FILE, phase, 'utf8'); } catch (_) {}
}

// ── Mise à jour de tous les pouls.md ──
const files = findPoulsMdFiles(ROOT);
let active = 0;
let topIntensity = 0;
let topStatus = 'idle';

for (const f of files) {
  try {
    const existing = parsePoulsMd(f);
    if (!existing) continue;

    const role = existing.agent?.role ?? 'dev';
    const profile = getProfile(role);
    const intensity = computeIntensity(role, phase);
    const status = intensityToStatus(intensity);

    const nowIso = new Date().toISOString();
    const updated = {
      ...existing,
      status,
      lastPulse: nowIso,
      phase: phase || existing.phase,
      intensity: { current: intensity, ceiling: profile.ceiling },
    };

    writePoulsMd(f, updated, existing._body);

    if (!isExpired(updated) && intensity > topIntensity) {
      topIntensity = intensity;
      topStatus = status;
      active++;
    }
  } catch (e) {
    process.stderr.write(`[MAESTRO] erreur ${f}: ${e.message}\n`);
  }
}

// ── Écriture du statut pour model-metrics.sh ──
const total = files.length;
const label = statusLabel(topStatus, lang);
const indicator = `💓${label}·${active}/${total}`;

try {
  writeFileSync(STATUS_FILE, indicator, 'utf8');
} catch (_) {}

process.stdout.write(`[PULSE] ${indicator}\n`);
process.exit(0);
