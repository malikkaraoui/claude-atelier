// src/vault/core/associations.js — bidirectional file ↔ vault observation index

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { slugify } from './utils.js';

/**
 * buildAssociations(vaultDir) → { byFile, byObsId }
 *
 * Scans vault files (20-decisions.md, 30-discoveries.md) for "Fichiers liés:" field,
 * builds a bidirectional index:
 *   - byFile: { 'path/to/file.js': [obsId1, obsId2, ...] }
 *   - byObsId: { obsId1: { files: [...], type, title, date, ... }, ... }
 *
 * obsId = unique identifier within vault (e.g., 'decision:feature-x', 'discovery:2026-07-01-...')
 */
function buildAssociations(vaultDir) {
  const assoc = {
    version: 1,
    generatedAt: new Date().toISOString(),
    byFile: {},      // { filePath: [obsId, ...] }
    byObsId: {},     // { obsId: { files, type, title, date, content } }
  };

  // Parse 20-decisions.md
  const decisionPath = join(vaultDir, '20-decisions.md');
  if (existsSync(decisionPath)) {
    const content = readFileSync(decisionPath, 'utf8');
    const decisions = extractDecisionsWithFiles(content);
    for (const d of decisions) {
      const obsId = `decision:${slugify(d.title)}`;
      const files = d.files || [];

      assoc.byObsId[obsId] = {
        type: 'decision',
        title: d.title,
        date: d.date,
        files,
        content: d.decision || '',
      };

      for (const filePath of files) {
        if (!assoc.byFile[filePath]) assoc.byFile[filePath] = [];
        if (!assoc.byFile[filePath].includes(obsId)) {
          assoc.byFile[filePath].push(obsId);
        }
      }
    }
  }

  // Parse 30-discoveries.md
  const discoveryPath = join(vaultDir, '30-discoveries.md');
  if (existsSync(discoveryPath)) {
    const content = readFileSync(discoveryPath, 'utf8');
    const discoveries = extractDiscoveriesWithFiles(content);
    for (const disc of discoveries) {
      const obsId = `discovery:${slugify(disc.title)}`;
      const files = disc.files || [];

      assoc.byObsId[obsId] = {
        type: 'discovery',
        title: disc.title,
        date: disc.date,
        files,
        content: disc.content || '',
      };

      for (const filePath of files) {
        if (!assoc.byFile[filePath]) assoc.byFile[filePath] = [];
        if (!assoc.byFile[filePath].includes(obsId)) {
          assoc.byFile[filePath].push(obsId);
        }
      }
    }
  }

  return assoc;
}

/**
 * extractDecisionsWithFiles(content) — extract decisions from 20-decisions.md
 * Looks for: ### YYYY-MM-DD — Title ... - Fichiers liés: path1, path2
 */
function extractDecisionsWithFiles(content) {
  const lines = content.split('\n');
  const decisions = [];
  let inSec = false;
  let cur = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      inSec = line.slice(3).trim() === 'Décisions durables';
      continue;
    }

    if (inSec && line.startsWith('### ')) {
      if (cur) decisions.push(cur);
      const rawTitle = line.slice(4).trim();
      const dashIdx = rawTitle.indexOf(' — ');
      const dateStr = rawTitle.slice(0, dashIdx >= 0 ? dashIdx : 0).trim();
      const title = dashIdx >= 0 ? rawTitle.slice(dashIdx + 3) : rawTitle;
      cur = { title, date: dateStr, decision: '', files: [] };
    }

    if (cur) {
      if (line.trim().startsWith('- Décision : ')) {
        cur.decision = line.trim().slice('- Décision : '.length).trim();
      } else if (line.trim().startsWith('- Fichiers liés : ') || line.trim().startsWith('- Fichiers liés: ')) {
        const raw = line.trim().replace(/^- Fichiers liés ?: /, '');
        cur.files = raw.split(',').map(f => f.trim()).filter(f => f);
      }
    }
  }

  if (cur) decisions.push(cur);
  return decisions;
}

/**
 * extractDiscoveriesWithFiles(content) — extract discoveries from 30-discoveries.md
 * Flexible format: looks for "Fichiers liés:" field anywhere in the entry
 */
function extractDiscoveriesWithFiles(content) {
  const lines = content.split('\n');
  const discoveries = [];
  let cur = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of new discovery: ### YYYY-MM-DD — Title
    if (line.startsWith('### ') && /^\d{4}-\d{2}-\d{2}/.test(line.slice(4))) {
      if (cur && cur.title) discoveries.push(cur);
      const rawTitle = line.slice(4).trim();
      const dashIdx = rawTitle.indexOf(' — ');
      const dateStr = rawTitle.slice(0, dashIdx >= 0 ? dashIdx : 0).trim();
      const title = dashIdx >= 0 ? rawTitle.slice(dashIdx + 3) : rawTitle;
      cur = { title, date: dateStr, content: '', files: [] };
    }

    if (cur) {
      // Accumulate content
      if (!line.startsWith('### ')) {
        cur.content += line + '\n';
      }

      // Extract "Fichiers liés:" field
      if (line.trim().startsWith('- Fichiers liés : ') || line.trim().startsWith('- Fichiers liés: ')) {
        const raw = line.trim().replace(/^- Fichiers liés ?: /, '');
        cur.files = raw.split(',').map(f => f.trim()).filter(f => f);
      }
    }
  }

  if (cur && cur.title) discoveries.push(cur);
  return discoveries;
}

/**
 * saveAssociations(vaultDir, assoc) — persist associations to vault/index/associations.json
 */
function saveAssociations(vaultDir, assoc) {
  const indexDir = join(vaultDir, 'index');
  mkdirSync(indexDir, { recursive: true });
  const assocPath = join(indexDir, 'associations.json');
  writeFileSync(assocPath, JSON.stringify(assoc, null, 2) + '\n', 'utf8');
  return assocPath;
}

/**
 * loadAssociations(vaultDir) — load from vault/index/associations.json if exists
 */
function loadAssociations(vaultDir) {
  const assocPath = join(vaultDir, 'index', 'associations.json');
  if (!existsSync(assocPath)) return null;
  try {
    return JSON.parse(readFileSync(assocPath, 'utf8'));
  } catch {
    return null;
  }
}

export {
  buildAssociations,
  saveAssociations,
  loadAssociations,
  extractDecisionsWithFiles,
  extractDiscoveriesWithFiles,
};
