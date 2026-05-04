// src/vault/graph/build.js — graph construction from vault

import { join, relative } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { loadManifest } from '../core/manifest.js';
import { 
  getStateLine, slugify, extractConcepts, buildIgnoreMatcher, parseIgnoreFile, 
  computeFileSHA256, DEFAULT_IGNORE_DIRS, DEFAULT_IGNORE_PATTERNS,
  extractBulletItems, extractSubsectionItems, extractMailboxPending, extractDecisions 
} from '../core/utils.js';
import { readFirstHeading, readExcerpt, getFileMtime, extractBmadSignals } from '../docs/scan.js';

function buildGraph(cwd) {
  const vaultDir = join(cwd, 'vault');
  const manifestPath = join(vaultDir, 'index', 'manifest.json');
  const manifest = loadManifest(manifestPath);
  const now = new Date().toISOString();

  const nodes = new Map();
  const edges = [];
  const byType = {};

  function addNode(n) {
    if (!nodes.has(n.id)) {
      // Auto-add community field based on node type
      if (typeof n.community === 'undefined') {
        n.community = 0; // Default community
      }
      nodes.set(n.id, n);
      byType[n.type] = (byType[n.type] || 0) + 1;
    }
  }

  function addEdge(e) { edges.push(e); }

  // Nœud projet racine
  const briefPath = join(vaultDir, '00-brief.md');
  const briefContent = existsSync(briefPath) ? readFileSync(briefPath, 'utf8') : '';
  const projectName = getStateLine(briefContent, 'Projet') || 'projet';
  addNode({
    id: 'project:root', type: 'project', label: projectName, path: '',
    tags: ['project'], excerpt: getStateLine(briefContent, 'Phase') || '',
    mtime: now, sha256: '', confidence: 'INFERRED',
    community: 0,
  });

  // Fichiers vault connus
  const KNOWN_VAULT_FILES = [
    '00-brief.md', '10-mailbox.md', '20-decisions.md',
    '30-discoveries.md', '40-roadmap.md', '90-sources.md', 'PETER_REPORT.md',
  ];
  for (const name of KNOWN_VAULT_FILES) {
    const fp = join(vaultDir, name);
    if (!existsSync(fp)) continue;
    const relPath = `vault/${name}`;
    addNode({
      id: `vault_file:${relPath}`, type: 'vault_file',
      label: readFirstHeading(fp) || name, path: relPath,
      tags: ['vault'], excerpt: readExcerpt(fp),
      mtime: getFileMtime(fp), sha256: '', confidence: 'EXTRACTED',
      community: 0,
    });
    // Edge from project:root to vault file
    addEdge({ from: 'project:root', to: `vault_file:${relPath}`, relation: 'document' });
  }

  // Décisions depuis 20-decisions.md
  const decisionsPath = join(vaultDir, '20-decisions.md');
  if (existsSync(decisionsPath)) {
    const decisionsContent = readFileSync(decisionsPath, 'utf8');
    const decisions = extractDecisions(decisionsContent);
    for (const d of decisions) {
      // Extract clean label from full title (e.g., "2026-05-01 — Node.js" → "Node.js")
      let cleanLabel = d.title;
      const dashIdx = d.title.indexOf(' — ');
      if (dashIdx >= 0) {
        cleanLabel = d.title.slice(dashIdx + 3);
      }
      const decisionId = `decision:${slugify(cleanLabel)}`;
      addNode({
        id: decisionId, type: 'decision', label: cleanLabel, path: 'vault/20-decisions.md',
        tags: ['decision'], excerpt: d.decision || '',
        mtime: now, sha256: '', confidence: 'EXTRACTED',
        community: 0,
      });
      addEdge({ from: `vault_file:vault/20-decisions.md`, to: decisionId, relation: 'contains' });
    }
  }

  // Roadmap items depuis 40-roadmap.md
  const roadmapPath = join(vaultDir, '40-roadmap.md');
  if (existsSync(roadmapPath)) {
    const roadmapContent = readFileSync(roadmapPath, 'utf8');
    const feuItems = extractSubsectionItems(roadmapContent, 'Roadmap vivante', 'Sur le feu');
    for (let i = 0; i < feuItems.length; i++) {
      const itemId = `roadmap_item:feu_${i}`;
      addNode({
        id: itemId, type: 'roadmap_item', label: feuItems[i], path: 'vault/40-roadmap.md',
        tags: ['roadmap', 'sur_le_feu'], excerpt: feuItems[i],
        mtime: now, sha256: '', confidence: 'EXTRACTED',
        community: 0,
      });
      addEdge({ from: `vault_file:vault/40-roadmap.md`, to: itemId, relation: 'contains' });
    }
  }

  // BMAD artifacts - scan vault for protected markdown
  const bmadSignals = extractBmadSignals(briefPath);
  if (bmadSignals && bmadSignals.length > 0) {
    for (const signal of bmadSignals) {
      const bmadId = `protected_artifact:${slugify(signal)}`;
      addNode({
        id: bmadId, type: 'protected_artifact', label: signal, path: 'vault/BMAD',
        tags: ['protected'], excerpt: 'Protected Business-Model-Analysis Document',
        mtime: now, sha256: '', confidence: 'PROTECTED',
        community: 0,
      });
    }
  }

  // Nœuds concepts
  if (manifest && manifest.concepts && Array.isArray(manifest.concepts)) {
    for (const concept of manifest.concepts) {
      addNode({
        id: `concept:${concept.name}`, type: 'concept',
        label: concept.name, path: '',
        tags: ['concept'], excerpt: concept.description || '',
        mtime: now, sha256: '', confidence: 'MANIFEST',
        frequency: concept.frequency || 0,
        community: 0,
      });
    }
  }

  // Retourner le graph
  return {
    version: 1,
    generatedAt: now,
    nodes: Array.from(nodes.values()),
    edges,
    stats: {
      byType,
      byKind: {},
      centralNodes: Array.from(nodes.keys()).slice(0, 8),
      nodeCount: nodes.size,
      edgeCount: edges.length,
    },
  };
}

export { buildGraph };
