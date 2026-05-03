#!/usr/bin/env node
/**
 * claude-atelier vault — Initialise et inspecte le vault dynamique projet.
 *
 * Usage:
 *   claude-atelier vault init    [--cwd <path>] [--dry-run]
 *   claude-atelier vault status  [--cwd <path>]
 *   claude-atelier vault report  [--cwd <path>] [--json]
 *   claude-atelier vault stale   [--cwd <path>] [--json]
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

const CYAN = '\x1b[0;36m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const RED = '\x1b[0;31m';
const NC = '\x1b[0m';

const VAULT_FILES = [
  {
    name: 'PETER.md',
    title: 'Peter — Agent mainteneur du vault',
    body: `## Mission

Peter maintient le vault dynamique du projet.

Il ne fige pas la mémoire. Il trie, résume, date, relie et prépare le contexte utile pour Claude.

## Responsabilités

- maintenir un brief court et exploitable ;
- transformer les notes entrantes en courrier projet ;
- éviter la pollution du contexte ;
- conserver les sources et décisions importantes ;
- signaler les idées à challenger ;
- préparer la reprise de session sans brûler les tokens.

## Règles

- Ne jamais transformer une hypothèse en fait.
- Ne jamais supprimer une source sans trace.
- Garder le brief court.
- Préférer une action proposée à une archive passive.
- Si une note concerne plusieurs projets, le signaler explicitement.
`,
  },
  {
    name: '00-brief.md',
    title: 'Brief projet',
    body: `## État court

- Projet : à compléter.
- Phase : à compléter.
- Objectif courant : à compléter.
- Prochaine action utile : à compléter.

## À lire en priorité

-

## Décisions actives

-

## Risques / angles morts

-
`,
  },
  {
    name: '10-mailbox.md',
    title: 'Mailbox projet',
    body: `## Courrier entrant

Notes, vocaux, captures, liens ou idées routés vers ce projet.

Format recommandé :

### YYYY-MM-DD — Titre court

- Source : note | vocal | capture | URL | YouTube | autre
- Statut : nouveau | à challenger | à planifier | intégré | rejeté
- Résumé :
- Pourquoi ici :
- Action proposée :
`,
  },
  {
    name: '20-decisions.md',
    title: 'Décisions projet',
    body: `## Décisions durables

### YYYY-MM-DD — Décision

- Contexte :
- Décision :
- Conséquence :
- À revalider si :
`,
  },
  {
    name: '30-discoveries.md',
    title: 'Découvertes projet',
    body: `## Découvertes

Ce que Claude ou Peter apprend sur le projet et qui mérite de survivre à la session.

### YYYY-MM-DD — Découverte

- Observation :
- Impact :
- Source :
- Remontée globale candidate : non
`,
  },
  {
    name: '40-roadmap.md',
    title: 'Roadmap vivante',
    body: `## Roadmap vivante

### Sur le feu

-

### Ensuite

-

### Idées à challenger

-

### Parking

-
`,
  },
  {
    name: '90-sources.md',
    title: 'Sources',
    body: `## Sources liées au projet

### YYYY-MM-DD — Source

- Type : note | vocal | capture | URL | YouTube | PDF | autre
- Emplacement :
- Résumé :
- Lié à :
`,
  },
];

function getFlag(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

function parseArgs(argv) {
  const args = argv.slice(2).filter(a => a !== 'vault');
  return {
    sub: args[0] ?? 'status',
    cwd: resolve(getFlag(args, '--cwd') ?? process.cwd()),
    dryRun: args.includes('--dry-run'),
    json: args.includes('--json'),
  };
}

function renderFile({ title, body }) {
  return `# ${title}\n\n> Géré par Peter via claude-atelier vault. Markdown vivant, pas document gravé.\n\n${body.trim()}\n`;
}

function initVault(cwd, dryRun = false) {
  const vaultDir = join(cwd, 'vault');
  const created = [];
  const skipped = [];

  if (!dryRun && !existsSync(vaultDir)) {
    mkdirSync(vaultDir, { recursive: true });
  }

  for (const file of VAULT_FILES) {
    const target = join(vaultDir, file.name);
    if (existsSync(target)) {
      skipped.push(target);
      continue;
    }
    created.push(target);
    if (!dryRun) {
      writeFileSync(target, renderFile(file), 'utf8');
    }
  }

  return { vaultDir, created, skipped };
}

function readJsonIfExists(filePath, fallback = {}) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function entryContainsVaultHook(entry) {
  if (!entry || !Array.isArray(entry.hooks)) return false;
  return entry.hooks.some(hook => hook && typeof hook.command === 'string' && hook.command.includes('vault-context.sh'));
}

function installPeterHook(cwd, dryRun = false) {
  const projectHookDir = join(cwd, 'hooks');
  const projectHook = join(projectHookDir, 'vault-context.sh');
  const packageHook = join(PKG_ROOT, 'hooks', 'vault-context.sh');
  const settingsPath = join(cwd, '.claude', 'settings.json');
  const copied = [];
  const changed = [];

  if (!existsSync(projectHook)) {
    copied.push(projectHook);
    if (!dryRun) {
      mkdirSync(projectHookDir, { recursive: true });
      copyFileSync(packageHook, projectHook);
    }
  }

  const settings = readJsonIfExists(settingsPath, {});
  const hooks = settings.hooks ?? {};
  const sessionStart = Array.isArray(hooks.SessionStart) ? hooks.SessionStart : [];
  // Chemin relatif à la racine du projet — portable entre machines
  const relHookPath = relative(cwd, projectHook);
  const shellCommand = `bash "${relHookPath}"`;
  const alreadyInstalled = sessionStart.some(entryContainsVaultHook);

  if (!alreadyInstalled) {
    const targetEntry = sessionStart.find(entry => entry && entry.matcher === '');
    if (targetEntry) {
      targetEntry.hooks = Array.isArray(targetEntry.hooks) ? targetEntry.hooks : [];
      targetEntry.hooks.push({ type: 'command', command: shellCommand });
    } else {
      sessionStart.push({ matcher: '', hooks: [{ type: 'command', command: shellCommand }] });
    }
    hooks.SessionStart = sessionStart;
    settings.hooks = hooks;
    changed.push(settingsPath);
    if (!dryRun) {
      mkdirSync(dirname(settingsPath), { recursive: true });
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    }
  }

  return { copied, changed, alreadyInstalled };
}

function readFirstHeading(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const line = content.split('\n').find(l => l.startsWith('# '));
    return line ? line.replace(/^#\s+/, '') : '';
  } catch {
    return '';
  }
}

function statusVault(cwd) {
  const vaultDir = join(cwd, 'vault');
  if (!existsSync(vaultDir)) {
    return { exists: false, vaultDir, files: [] };
  }
  const files = readdirSync(vaultDir)
    .filter(name => name.endsWith('.md'))
    .sort()
    .map(name => {
      const filePath = join(vaultDir, name);
      const stat = statSync(filePath);
      return {
        name,
        title: readFirstHeading(filePath),
        bytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
      };
    });
  return { exists: true, vaultDir, files };
}

// ─── Seuils de fraîcheur (jours) ──────────────────────────────────────────────
const STALE_DAYS = { brief: 7, roadmap: 14, report: 1, mailbox_warn: 3 };

function daysSince(filePath) {
  if (!existsSync(filePath)) return Infinity;
  return (Date.now() - statSync(filePath).mtimeMs) / 86_400_000;
}

function extractBulletItems(content, heading) {
  const lines = content.split('\n');
  const items = [];
  let active = false;
  for (const line of lines) {
    if (/^#{1,3} /.test(line)) {
      if (active) break;
      if (line.replace(/^#+\s+/, '') === heading) { active = true; continue; }
    }
    if (active && line.trim().startsWith('- ')) {
      const item = line.trim().slice(2).trim();
      if (item) items.push(item);
    }
  }
  return items;
}

function extractSubsectionItems(content, section, subsection) {
  const lines = content.split('\n');
  const items = [];
  let inSec = false;
  let inSub = false;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (inSec) break;
      inSec = line.slice(3).trim() === section;
      continue;
    }
    if (inSec && line.startsWith('### ')) {
      if (inSub) break;
      inSub = line.slice(4).trim() === subsection;
      continue;
    }
    if (inSub && line.trim().startsWith('- ')) {
      const item = line.trim().slice(2).trim();
      if (item) items.push(item);
    }
  }
  return items;
}

function extractMailboxPending(content) {
  const lines = content.split('\n');
  const entries = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (cur) entries.push(cur);
      cur = { title: line.slice(4).trim(), status: '', action: '' };
    }
    if (cur && line.trim().startsWith('- Statut : ')) {
      cur.status = line.trim().slice('- Statut : '.length).trim();
    }
    if (cur && line.trim().startsWith('- Action proposée : ')) {
      cur.action = line.trim().slice('- Action proposée : '.length).trim();
    }
  }
  if (cur) entries.push(cur);
  return entries.filter(e => e.status === 'nouveau' || e.status === 'à challenger');
}

function extractDecisions(content) {
  const lines = content.split('\n');
  const decisions = [];
  let inSec = false;
  let cur = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      inSec = line.slice(3).trim() === 'Décisions durables';
      continue;
    }
    if (inSec && line.startsWith('### ')) {
      if (cur) decisions.push(cur);
      cur = { title: line.slice(4).trim(), decision: '' };
    }
    if (cur && line.trim().startsWith('- Décision : ')) {
      cur.decision = line.trim().slice('- Décision : '.length).trim();
    }
  }
  if (cur) decisions.push(cur);
  return decisions.slice(0, 5);
}

function getStateLine(content, key) {
  const prefix = `- ${key} : `;
  for (const line of content.split('\n')) {
    if (line.trim().startsWith(prefix)) return line.trim().slice(prefix.length).trim();
  }
  return '—';
}

function generateReport(vaultDir) {
  const read = (name) => {
    const p = join(vaultDir, name);
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  };

  const brief = read('00-brief.md');
  const mailbox = read('10-mailbox.md');
  const decisions = read('20-decisions.md');
  const roadmap = read('40-roadmap.md');

  const projet = getStateLine(brief, 'Projet');
  const phase = getStateLine(brief, 'Phase');
  const nextAction = getStateLine(brief, 'Prochaine action utile');

  const stale =
    daysSince(join(vaultDir, '00-brief.md')) > STALE_DAYS.brief ||
    daysSince(join(vaultDir, '40-roadmap.md')) > STALE_DAYS.roadmap;
  const freshness = stale ? 'STALE' : 'OK';

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const risques = extractBulletItems(brief, 'Risques / angles morts');
  const feuItems = extractSubsectionItems(roadmap, 'Roadmap vivante', 'Sur le feu');
  const mailboxPending = extractMailboxPending(mailbox);
  const decisionItems = extractDecisions(decisions);
  const priorityRead = extractBulletItems(brief, 'À lire en priorité');

  const L = [];
  const s = (line) => L.push(line);

  s('# PETER_REPORT');
  s('');
  s(`> Généré par Peter — ${now} — Ne pas éditer manuellement.`);
  s('');
  s('## Bureau préparé');
  s('');
  s(`- Projet : ${projet}`);
  s(`- Phase : ${phase}`);
  s(`- Dernière mise à jour : ${now}`);
  s(`- Fraîcheur : ${freshness}`);
  s('');
  s("## À savoir avant d'agir");
  s('');
  if (priorityRead.length) {
    priorityRead.forEach(i => s(`- ${i}`));
  } else {
    s('- Aucun élément prioritaire signalé dans 00-brief.md');
  }
  s('');
  s('## Décisions actives');
  s('');
  if (decisionItems.length) {
    decisionItems.forEach(d => s(`- **${d.title}**${d.decision ? ` — ${d.decision}` : ''}`));
  } else {
    s('- Aucune décision enregistrée dans 20-decisions.md');
  }
  s('');
  s('## Roadmap — Sur le feu');
  s('');
  if (feuItems.length) {
    feuItems.forEach(i => s(`- ${i}`));
  } else {
    s('- Rien en cours dans 40-roadmap.md');
  }
  s('');
  s('## Risques / contradictions');
  s('');
  if (risques.length) {
    risques.forEach(r => s(`- ${r}`));
  } else {
    s('- Aucun risque documenté dans 00-brief.md');
  }
  s('');
  s('## Mailbox à traiter');
  s('');
  if (mailboxPending.length) {
    mailboxPending.forEach(e => s(`- **${e.title}** [${e.status}]${e.action ? ` → ${e.action}` : ''}`));
  } else {
    s('- Aucune entrée en attente dans 10-mailbox.md');
  }
  s('');
  s('## Prochaine action recommandée');
  s('');
  s(`- ${nextAction !== '—' ? nextAction : 'À définir dans vault/00-brief.md'}`);
  s('');

  return L.join('\n');
}

function reportVault(cwd) {
  const vaultDir = join(cwd, 'vault');
  if (!existsSync(vaultDir)) {
    return { ok: false, error: 'Aucun vault projet. Lancez : claude-atelier vault init' };
  }
  const content = generateReport(vaultDir);
  const reportPath = join(vaultDir, 'PETER_REPORT.md');
  writeFileSync(reportPath, content, 'utf8');
  const freshness = /- Fraîcheur : (\w+)/.exec(content)?.[1] ?? 'OK';
  return { ok: true, reportPath, freshness };
}

function staleVault(cwd) {
  const vaultDir = join(cwd, 'vault');
  if (!existsSync(vaultDir)) {
    return { ok: false, error: 'Aucun vault projet.' };
  }

  const checks = [];
  const add = (file, status, msg) => checks.push({ file, status, msg });

  const briefPath = join(vaultDir, '00-brief.md');
  if (!existsSync(briefPath)) {
    add('00-brief.md', 'MANQUANT', 'Fichier absent');
  } else {
    const d = daysSince(briefPath);
    add('00-brief.md',
      d > STALE_DAYS.brief ? 'STALE' : 'OK',
      d > STALE_DAYS.brief
        ? `Non mis à jour depuis ${Math.floor(d)} jours (seuil : ${STALE_DAYS.brief}j)`
        : `Mis à jour il y a ${Math.floor(d)} jour(s)`);
  }

  const roadmapPath = join(vaultDir, '40-roadmap.md');
  if (!existsSync(roadmapPath)) {
    add('40-roadmap.md', 'MANQUANT', 'Fichier absent');
  } else {
    const d = daysSince(roadmapPath);
    add('40-roadmap.md',
      d > STALE_DAYS.roadmap ? 'STALE' : 'OK',
      d > STALE_DAYS.roadmap
        ? `Non mis à jour depuis ${Math.floor(d)} jours (seuil : ${STALE_DAYS.roadmap}j)`
        : `Mis à jour il y a ${Math.floor(d)} jour(s)`);
  }

  const reportPath = join(vaultDir, 'PETER_REPORT.md');
  if (!existsSync(reportPath)) {
    add('PETER_REPORT.md', 'MANQUANT', 'Pas encore généré — lancez : claude-atelier vault report');
  } else {
    const d = daysSince(reportPath);
    add('PETER_REPORT.md',
      d > STALE_DAYS.report ? 'STALE' : 'OK',
      d > STALE_DAYS.report
        ? `Généré il y a ${Math.floor(d)} jour(s) — relancer vault report`
        : `Généré il y a ${Math.floor(d * 24)} heure(s)`);
  }

  const mailboxPath = join(vaultDir, '10-mailbox.md');
  if (existsSync(mailboxPath)) {
    const pending = extractMailboxPending(readFileSync(mailboxPath, 'utf8'));
    const count = pending.length;
    add('10-mailbox.md',
      count > STALE_DAYS.mailbox_warn ? 'STALE' : count > 0 ? 'WARN' : 'OK',
      count > 0 ? `${count} entrée(s) en attente (nouveau|à challenger)` : 'Mailbox à jour');
  }

  const manifestPath = join(vaultDir, 'index', 'manifest.json');
  const statePath = join(vaultDir, '.peter', 'state.json');
  if (!existsSync(manifestPath)) {
    // Phase B optionnelle : INFO ne bloque pas "Vault à jour"
    add('vault/index/manifest.json', 'INFO', 'Index absent — lancez : claude-atelier vault update (Phase B)');
  } else {
    const d = daysSince(manifestPath);
    const state = loadState(statePath);
    const needsUpdate = state?.needsUpdate === true;
    add('vault/index/manifest.json',
      needsUpdate ? 'STALE' : d > 1 ? 'WARN' : 'OK',
      needsUpdate
        ? 'Marqué comme dépassé — lancez : claude-atelier vault update'
        : `${state?.fileCount ?? '?'} fichiers indexés, mis à jour il y a ${Math.floor(d * 24)}h`);
  }

  return { ok: true, checks };
}

function printInit(result, cwd, dryRun) {
  console.log(`\n${CYAN}claude-atelier vault init${NC}`);
  console.log(`  Projet : ${cwd}`);
  console.log(`  Vault  : ${result.vaultDir}`);
  if (dryRun) console.log(`  ${YELLOW}DRY RUN${NC} — rien ne sera écrit`);
  console.log('');

  for (const file of result.created) {
    console.log(`  ${GREEN}[CREATE]${NC} ${relative(cwd, file)}`);
  }
  for (const file of result.skipped) {
    console.log(`  ${YELLOW}[SKIP]${NC}   ${relative(cwd, file)} existe déjà`);
  }
  for (const file of result.hook.copied) {
    console.log(`  ${GREEN}[HOOK]${NC}   ${relative(cwd, file)} installé`);
  }
  for (const file of result.hook.changed) {
    console.log(`  ${GREEN}[HOOK]${NC}   ${relative(cwd, file)} mis à jour`);
  }
  if (result.hook.alreadyInstalled) {
    console.log(`  ${YELLOW}[SKIP]${NC}   hook Peter déjà installé`);
  }
  console.log(`\n${GREEN}✓${NC} Peter peut maintenir ce vault projet.`);
}

function printStatus(status, cwd) {
  console.log(`\n${CYAN}claude-atelier vault status${NC}`);
  console.log(`  Projet : ${cwd}`);
  console.log(`  Vault  : ${status.vaultDir}`);
  if (!status.exists) {
    console.log(`\n${YELLOW}Aucun vault projet.${NC} Lancez : claude-atelier vault init`);
    return;
  }
  console.log('');
  for (const file of status.files) {
    console.log(`  ${GREEN}•${NC} ${file.name.padEnd(18)} ${file.title || '—'} (${file.bytes} o)`);
  }
}

function printReport(result, cwd) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  console.log(`\n${CYAN}[PETER] vault report${NC}`);
  console.log(`  Rapport : ${relative(cwd, result.reportPath)}`);
  console.log(`  Fraîcheur : ${result.freshness === 'OK' ? GREEN : YELLOW}${result.freshness}${NC}`);
  console.log(`\n${GREEN}✓${NC} PETER_REPORT.md généré.`);
}

function printStale(result) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  const COLORS = { OK: GREEN, WARN: YELLOW, STALE: RED, MANQUANT: RED, INFO: CYAN };
  console.log(`\n${CYAN}[PETER] vault stale${NC}`);
  for (const c of result.checks) {
    const col = COLORS[c.status] ?? NC;
    console.log(`  ${col}[${c.status}]${NC} ${c.file.padEnd(30)} ${c.msg}`);
  }
  // INFO n'est pas un problème — ne bloque pas "Vault à jour"
  const hasIssue = result.checks.some(c => c.status !== 'OK' && c.status !== 'INFO');
  console.log(`\n${hasIssue ? YELLOW : GREEN}${hasIssue ? '⚠' : '✓'}${NC} ${hasIssue ? 'Certains éléments nécessitent attention.' : 'Vault à jour.'}`);
}

// ─── Phase B — Index incrémental ──────────────────────────────────────────────

const MANIFEST_VERSION = 1;
const STATE_VERSION = 1;

const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
  '__pycache__', '.turbo', '.svelte-kit', 'out', '.output',
]);

const DEFAULT_IGNORE_PATTERNS = [
  '*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '*.min.js', '*.min.css', '*.map', '.DS_Store', 'Thumbs.db',
];

function parseIgnoreFile(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

function globToRegex(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      re += '.*'; i++;
      if (pattern[i + 1] === '/') i++;
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

function buildIgnoreMatcher(extraPatterns = [], prefixExclusions = []) {
  const patterns = [...DEFAULT_IGNORE_PATTERNS, ...extraPatterns]
    .filter(p => !p.startsWith('!'))
    .map(p => {
      const anchored = p.startsWith('/');
      const dirOnly = p.endsWith('/');
      const clean = p.replace(/^\//, '').replace(/\/$/, '');
      try {
        return { raw: clean, anchored, dirOnly, re: globToRegex(clean) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return (relPath, isDir) => {
    // Exclusions de sous-arborescences entières (vault/.peter, vault/index, etc.)
    for (const prefix of prefixExclusions) {
      if (relPath === prefix || relPath.startsWith(prefix + '/')) return true;
    }
    const name = relPath.split('/').pop();
    for (const pat of patterns) {
      if (pat.dirOnly && !isDir) continue;
      const test = pat.anchored
        ? pat.re.test(relPath)
        : pat.re.test(relPath) || pat.re.test(name);
      if (test) return true;
    }
    return false;
  };
}

function computeFileSHA256(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

function* walkDir(dir, isIgnored, relPrefix = '') {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
      if (isIgnored(relPath, true)) continue;
      yield* walkDir(join(dir, entry.name), isIgnored, relPath);
    } else if (entry.isFile()) {
      if (isIgnored(relPath, false)) continue;
      yield relPath;
    }
  }
}

function loadManifest(manifestPath) {
  if (!existsSync(manifestPath)) return null;
  try { return JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { return null; }
}

function saveManifest(manifestPath, manifest) {
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

function loadState(statePath) {
  if (!existsSync(statePath)) return null;
  try { return JSON.parse(readFileSync(statePath, 'utf8')); } catch { return null; }
}

function saveState(statePath, state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function updateVault(cwd) {
  const vaultDir = join(cwd, 'vault');
  if (!existsSync(vaultDir)) {
    return { ok: false, error: 'Aucun vault projet. Lancez : claude-atelier vault init' };
  }

  const manifestPath = join(vaultDir, 'index', 'manifest.json');
  const statePath = join(vaultDir, '.peter', 'state.json');
  const cachePath = join(vaultDir, '.peter', 'cache');

  mkdirSync(join(vaultDir, 'index'), { recursive: true });
  mkdirSync(cachePath, { recursive: true });

  const oldManifest = loadManifest(manifestPath);
  const oldByPath = new Map((oldManifest?.files ?? []).map(f => [f.path, f]));

  const ignorePatterns = [
    ...parseIgnoreFile(join(cwd, '.gitignore')),
    ...parseIgnoreFile(join(cwd, '.peterignore')),
    ...parseIgnoreFile(join(cwd, '.claudeignore')),
  ];
  // Exclure les répertoires internes de Peter (état, cache, sorties générées)
  const peterInternalDirs = ['vault/.peter', 'vault/index'];
  const isIgnored = buildIgnoreMatcher(ignorePatterns, peterInternalDirs);

  const now = new Date().toISOString();
  const files = [];
  let newCount = 0;
  let modCount = 0;
  let unchanged = 0;

  for (const relPath of walkDir(cwd, isIgnored)) {
    const absPath = join(cwd, relPath);
    let stat;
    try { stat = statSync(absPath); } catch { continue; }
    const mtime = stat.mtime.toISOString();
    const old = oldByPath.get(relPath);

    let sha256;
    if (old && old.mtime === mtime) {
      sha256 = old.sha256;
      unchanged++;
    } else {
      try { sha256 = computeFileSHA256(absPath); } catch { continue; }
      if (old) modCount++; else newCount++;
    }

    files.push({
      path: relPath,
      sha256,
      mtime,
      size: stat.size,
      ext: relPath.includes('.') ? '.' + relPath.split('.').pop() : '',
    });
  }

  const deletedCount = Math.max(0, (oldManifest?.fileCount ?? 0) - (files.length - newCount));

  const manifest = {
    version: MANIFEST_VERSION,
    generatedAt: now,
    root: cwd,
    fileCount: files.length,
    files,
  };
  saveManifest(manifestPath, manifest);

  const state = {
    version: STATE_VERSION,
    lastRun: now,
    lastCommand: 'update',
    needsUpdate: false,
    health: 'ok',
    fileCount: files.length,
    newFiles: newCount,
    modifiedFiles: modCount,
    unchangedFiles: unchanged,
    deletedFiles: deletedCount,
  };
  saveState(statePath, state);

  return {
    ok: true,
    manifestPath,
    statePath,
    cachePath,
    fileCount: files.length,
    newCount,
    modCount,
    unchanged,
    deletedCount,
    ignorePatternCount: ignorePatterns.length,
  };
}

function printUpdate(result, cwd) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  console.log(`\n${CYAN}[PETER] vault update${NC}`);
  console.log(`  Projet  : ${cwd}`);
  console.log(`  Ignorés : defaults + ${result.ignorePatternCount} patterns lus`);
  console.log('');
  if (result.newCount > 0) console.log(`  ${GREEN}[NEW]${NC}      ${result.newCount} fichier(s) nouveaux`);
  if (result.modCount > 0) console.log(`  ${YELLOW}[MOD]${NC}      ${result.modCount} fichier(s) modifiés`);
  if (result.deletedCount > 0) console.log(`  ${RED}[DEL]${NC}      ${result.deletedCount} fichier(s) supprimés`);
  if (result.unchanged > 0) console.log(`  ${GREEN}[SKIP]${NC}     ${result.unchanged} fichier(s) inchangés (cache mtime)`);
  console.log('');
  console.log(`  → ${relative(cwd, result.manifestPath)} mis à jour (${result.fileCount} fichiers)`);
  console.log(`  → ${relative(cwd, result.statePath)} mis à jour`);
  console.log(`\n${GREEN}✓${NC} Index incrémental Peter à jour.`);
}

export async function runVault(argv) {
  const { sub, cwd, dryRun, json } = parseArgs(argv);

  if (sub === 'init') {
    const result = initVault(cwd, dryRun);
    result.hook = installPeterHook(cwd, dryRun);
    if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else printInit(result, cwd, dryRun);
    return 0;
  }

  if (sub === 'status') {
    const status = statusVault(cwd);
    if (json) process.stdout.write(JSON.stringify(status, null, 2) + '\n');
    else printStatus(status, cwd);
    return 0;
  }

  if (sub === 'report') {
    const result = reportVault(cwd);
    if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else printReport(result, cwd);
    return result.ok ? 0 : 1;
  }

  if (sub === 'stale') {
    const result = staleVault(cwd);
    if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else printStale(result);
    return result.ok ? 0 : 1;
  }

  if (sub === 'update') {
    const result = updateVault(cwd);
    if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else printUpdate(result, cwd);
    return result.ok ? 0 : 1;
  }

  process.stderr.write(`${RED}error${NC}: sous-commande vault inconnue "${sub}"\n`);
  process.stderr.write('Usage: claude-atelier vault [init|status|report|stale|update] [--cwd <path>] [--dry-run] [--json]\n');
  return 1;
}
