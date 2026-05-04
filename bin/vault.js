#!/usr/bin/env node
/**
 * claude-atelier vault — Initialise et inspecte le vault dynamique projet.
 *
 * Usage:
 *   claude-atelier vault init    [--cwd <path>] [--dry-run]
 *   claude-atelier vault status  [--cwd <path>]
 *   claude-atelier vault report  [--cwd <path>] [--json]
 *   claude-atelier vault stale   [--cwd <path>] [--json]
 *   claude-atelier vault update  [--cwd <path>] [--json]
 *   claude-atelier vault graph   [--cwd <path>] [--json]
 *   claude-atelier vault query   "<texte>" [--cwd <path>] [--json]
 *   claude-atelier vault path    <nodeA> <nodeB> [--cwd <path>] [--json]
 *   claude-atelier vault explain <node> [--cwd <path>] [--json]
 *   claude-atelier vault maintain [--cwd <path>] [--json]
 *   claude-atelier vault cron    start|stop|status [--cwd <path>] [--interval <15m|6h|1d>] [--json]
 */

import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
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
  let args = argv.slice(2);
  if (args[0] === 'vault') args = args.slice(1);
  const sub = args[0] ?? 'status';
  const flagsWithValues = new Set(['--cwd', '--interval']);
  const positional = [];
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('-')) { if (flagsWithValues.has(args[i])) i++; continue; }
    positional.push(args[i]);
  }
  return {
    sub,
    positional,
    queryText: positional.join(' '),
    cwd: resolve(getFlag(args, '--cwd') ?? process.cwd()),
    dryRun: args.includes('--dry-run'),
    json: args.includes('--json'),
    intervalText: getFlag(args, '--interval'),
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

  // Sections graphe Phase C
  const graphPath = join(vaultDir, 'index', 'graph.json');
  if (existsSync(graphPath)) {
    let graph = null;
    try { graph = JSON.parse(readFileSync(graphPath, 'utf8')); } catch { /* skip */ }
    if (graph) {
      s('## Nœuds centraux');
      s('');
      const centralNodes = graph.stats?.centralNodes ?? [];
      if (centralNodes.length) {
        const deg = {};
        for (const e of graph.edges ?? []) {
          deg[e.from] = (deg[e.from] || 0) + 1;
          deg[e.to] = (deg[e.to] || 0) + 1;
        }
        for (const nodeId of centralNodes.slice(0, 8)) {
          const node = (graph.nodes ?? []).find(n => n.id === nodeId);
          const rel = deg[nodeId] || 0;
          const pathStr = node?.path ? ` — ${node.path}` : '';
          s(`- ${nodeId} — ${rel} relation(s)${pathStr}`);
        }
      } else {
        s('- Aucun nœud central calculé — relancez vault graph');
      }
      s('');
      s('## Documents pivots');
      s('');
      const pivots = (graph.nodes ?? [])
        .filter(n => (n.type === 'markdown_document' || n.type === 'vault_file') && n.path)
        .slice(0, 5);
      if (pivots.length) {
        for (const n of pivots) {
          s(`- ${n.path}${n.label && n.label !== n.path ? ` — ${n.label}` : ''}`);
        }
      } else {
        s('- Aucun document pivot trouvé');
      }
      s('');
      s('## Questions utiles');
      s('');
      s('- Quels documents expliquent la phase actuelle ?');
      s('- Quelles décisions structurent le projet ?');
      s('- Quels risques bloquent la prochaine étape ?');
      s('');
    }
  } else {
    s('## Nœuds centraux');
    s('');
    s('- Graphe absent — lancer `claude-atelier vault graph`.');
    s('');
  }

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

  const graphFilePath = join(vaultDir, 'index', 'graph.json');
  if (!existsSync(graphFilePath)) {
    // Phase C optionnelle : INFO ne bloque pas "Vault à jour"
    add('vault/index/graph.json', 'INFO', 'Graphe absent — lancez : claude-atelier vault graph (Phase C)');
  } else {
    const dg = daysSince(graphFilePath);
    add('vault/index/graph.json',
      dg > 1 ? 'WARN' : 'OK',
      dg > 1
        ? `Graphe généré il y a ${Math.floor(dg)} jour(s) — relancer vault graph`
        : `Graphe à jour (${Math.floor(dg * 24)}h)`);
  }

  const cronPath = join(vaultDir, '.peter', 'cron.json');
  const cron = loadCronConfig(cronPath);
  if (!cron) {
    add('vault/.peter/cron.json', 'INFO', 'Autonomie désactivée — lancez : claude-atelier vault cron start');
  } else if (!cron.enabled) {
    add('vault/.peter/cron.json', 'WARN', 'Cron Peter désactivé — relancez : claude-atelier vault cron start');
  } else {
    const nextRunAt = cron.nextRunAt ? new Date(cron.nextRunAt).getTime() : 0;
    const overdue = nextRunAt > 0 && nextRunAt < Date.now();
    add('vault/.peter/cron.json', overdue ? 'WARN' : 'OK', overdue
      ? `Réveil Peter dépassé (${cron.intervalLabel ?? `${cron.intervalMinutes}m`}) — relancer vault maintain`
      : `Réveil autonome armé (${cron.intervalLabel ?? `${cron.intervalMinutes}m`})`);
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
const CRON_VERSION = 1;
const DEFAULT_CRON_INTERVAL = '6h';

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

function loadCronConfig(cronPath) {
  if (!existsSync(cronPath)) return null;
  try { return JSON.parse(readFileSync(cronPath, 'utf8')); } catch { return null; }
}

function saveCronConfig(cronPath, config) {
  mkdirSync(dirname(cronPath), { recursive: true });
  writeFileSync(cronPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

function appendEvent(eventsPath, event) {
  mkdirSync(dirname(eventsPath), { recursive: true });
  appendFileSync(eventsPath, JSON.stringify(event) + '\n', 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

function shortSha(sha) {
  return typeof sha === 'string' && sha ? sha.slice(0, 8) : 'inconnu';
}

function addMinutes(isoString, minutes) {
  return new Date(new Date(isoString).getTime() + minutes * 60_000).toISOString();
}

function parseIntervalToMinutes(input = DEFAULT_CRON_INTERVAL) {
  const raw = String(input || DEFAULT_CRON_INTERVAL).trim().toLowerCase();
  const match = raw.match(/^(\d+)(m|h|d)$/);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(value) || value <= 0) return null;
  const factor = unit === 'm' ? 1 : unit === 'h' ? 60 : 1440;
  const minutes = value * factor;
  if (minutes < 15) return null;
  return { minutes, label: `${value}${unit}` };
}

function ensureMailboxFile(vaultDir) {
  const mailboxPath = join(vaultDir, '10-mailbox.md');
  if (!existsSync(mailboxPath)) {
    const mailboxTemplate = VAULT_FILES.find(file => file.name === '10-mailbox.md');
    if (mailboxTemplate) writeFileSync(mailboxPath, renderFile(mailboxTemplate), 'utf8');
  }
  return mailboxPath;
}

function appendMailboxAlerts(vaultDir, alerts, headSha) {
  if (!alerts.length) return { written: 0, mailboxPath: join(vaultDir, '10-mailbox.md') };
  const mailboxPath = ensureMailboxFile(vaultDir);
  let content = readFileSync(mailboxPath, 'utf8').trimEnd();
  const stamp = nowIso().slice(0, 16).replace('T', ' ');
  for (const alert of alerts) {
    const detailLine = alert.details?.length ? `\n- Détail : ${alert.details.join(', ')}` : '';
    const refLine = headSha ? `\n- Réf : ${alert.type}:${shortSha(headSha)}` : '';
    content += `\n\n### ${stamp} — Peter auto-maintenance\n\n- Source : Peter auto-maintenance\n- Statut : ${alert.status}\n- Résumé : ${alert.summary}\n- Pourquoi ici : ${alert.reason}\n- Action proposée : ${alert.action}${detailLine}${refLine}`;
  }
  writeFileSync(mailboxPath, content + '\n', 'utf8');
  return { written: alerts.length, mailboxPath };
}

function gitChildEnv() {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_OBJECT_DIRECTORY;
  delete env.GIT_ALTERNATE_OBJECT_DIRECTORIES;
  return env;
}

function getGitHead(cwd) {
  try {
    return execSync('git rev-parse HEAD', {
      cwd,
      env: gitChildEnv(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

function listChangedFilesSince(cwd, previousHead, currentHead) {
  if (!previousHead || !currentHead || previousHead === currentHead) return [];
  try {
    const output = execSync(`git --no-pager diff --name-only ${previousHead}..${currentHead}`, {
      cwd,
      env: gitChildEnv(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return output ? output.split('\n').map(line => line.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function isProductChangePath(filePath) {
  return filePath === 'package.json'
    || filePath === 'README.md'
    || filePath === 'index.js'
    || filePath.startsWith('bin/')
    || filePath.startsWith('hooks/')
    || filePath.startsWith('src/')
    || filePath.startsWith('scripts/');
}

function isWebsiteDocsPath(filePath) {
  return filePath.startsWith('website/docs/');
}

function collectMaintenanceAlerts(cwd, previousHead, currentHead) {
  if (!previousHead) return { alerts: [], changedFiles: [], mode: 'baseline' };
  const changedFiles = listChangedFilesSince(cwd, previousHead, currentHead);
  if (!changedFiles.length) return { alerts: [], changedFiles, mode: 'no-change' };

  const productFiles = changedFiles.filter(isProductChangePath);
  const docsFiles = changedFiles.filter(isWebsiteDocsPath);
  const alerts = [];

  if (productFiles.length > 0 && docsFiles.length === 0) {
    alerts.push({
      type: 'stale-docs',
      status: 'à challenger',
      summary: `${productFiles.length} fichier(s) produit ont changé depuis ${shortSha(previousHead)} sans mise à jour de website/docs.`,
      reason: 'website/docs/ fait partie du périmètre Peter et doit refléter l’état réel du package public.',
      action: 'Mettre à jour website/docs puis relancer la boucle handoff/review.',
      details: productFiles.slice(0, 5),
    });
  }

  return { alerts, changedFiles, mode: 'diff' };
}

function updateCronHeartbeat(cwd, runAt) {
  const cronPath = join(cwd, 'vault', '.peter', 'cron.json');
  const cron = loadCronConfig(cronPath);
  if (!cron?.enabled || !Number.isFinite(cron.intervalMinutes)) return null;
  const updated = {
    ...cron,
    lastHeartbeat: runAt,
    lastRunAt: runAt,
    nextRunAt: addMinutes(runAt, cron.intervalMinutes),
    updatedAt: runAt,
  };
  saveCronConfig(cronPath, updated);
  return updated;
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

// ─── Phase C — Graphe minimal ─────────────────────────────────────────────────

const GRAPH_VERSION = 1;

const BMAD_MARKERS = ['.bmad-method', '.bmad', 'bmad-core'];

const GENERIC_CONCEPTS_EXTRACT = new Set([
  'avec', 'pour', 'dans', 'vers', 'plus', 'cette', 'comme', 'sans',
  'aussi', 'meme', 'sont', 'sera', 'etre', 'avoir', 'faire', 'tout',
  'quoi', 'dont', 'mais', 'donc', 'bien', 'tres', 'entre', 'tous',
  'lors', 'apres', 'avant', 'depuis', 'selon', 'ainsi', 'alors',
  'enfin', 'cela', 'ceci', 'celui', 'celle', 'type', 'null', 'vrai',
]);

const EXCLUDED_FROM_CENTRAL = new Set([
  'concept:projet', 'concept:todo', 'concept:update', 'concept:readme',
  'concept:document', 'project:root',
]);

const ROADMAP_SECTION_TAGS = {
  'Sur le feu': 'sur_le_feu',
  'Ensuite': 'ensuite',
  'Parking': 'parking',
  'Idées à challenger': 'idee_a_challenger',
};

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function extractConcepts(text) {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = normalized
    .replace(/[#*`[\](){}|:]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length >= 4 && !GENERIC_CONCEPTS_EXTRACT.has(w));
  return [...new Set(words)].slice(0, 8);
}

function isBmadPath(relPath) {
  return BMAD_MARKERS.some(m => relPath.includes(m));
}

function readExcerpt(filePath, maxLen = 120) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('>'));
    const text = lines.slice(0, 3).join(' ').trim();
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  } catch {
    return '';
  }
}

function getFileMtime(filePath) {
  try { return statSync(filePath).mtime.toISOString(); } catch { return ''; }
}

// ── Lot 1+2: docs scan, classify, organize + graph v2 enrichi ──

function extractH1(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function extractBmadSignals(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const signals = [];
    if (content.includes('.bmad')) signals.push('.bmad');
    if (content.includes('.bmad-method')) signals.push('.bmad-method');
    if (content.includes('bmad-core')) signals.push('bmad-core');
    return signals;
  } catch {
    return [];
  }
}

function classifyMarkdownKind(filename, relPath, content) {
  const pathLower = relPath.toLowerCase();
  
  if (pathLower.includes('decision') || content.includes('## Décision')) return 'decision';
  if (pathLower.includes('roadmap') || pathLower.includes('plan') || pathLower.includes('milestone')) return 'roadmap';
  if (pathLower.includes('brief') || pathLower.includes('overview') || pathLower.includes('intro')) return 'brief';
  if (pathLower.includes('skill') || pathLower.includes('competence')) return 'skill';
  if (pathLower.includes('template') || pathLower.includes('modele')) return 'template';
  if (pathLower.includes('config') || pathLower.includes('configuration')) return 'config';
  if (pathLower.includes('handoff')) return 'handoff';
  if (pathLower.includes('log') || pathLower.includes('journal') || pathLower.includes('report')) return 'log';
  if (filename.toLowerCase() === 'readme.md') return 'readme';
  
  return 'unknown';
}

function calculateVaultRelevance(kind, pathLower) {
  if (pathLower.startsWith('vault/')) return 0.9;
  if (['config', 'skill'].includes(kind)) return 0.7;
  if (['decision', 'roadmap'].includes(kind)) return 0.5;
  if (['readme', 'log'].includes(kind)) return 0.3;
  return 0.1;
}

function suggestDestination(kind, pathLower, hasBmad) {
  if (hasBmad) return pathLower; // Protégé, ne pas déplacer
  if (pathLower.startsWith('vault/')) return pathLower;
  
  const suggestions = {
    decision: 'vault/decisions/',
    roadmap: 'vault/roadmap/',
    brief: 'vault/briefs/',
    skill: 'vault/skills/',
    template: 'vault/templates/',
    config: 'vault/configs/',
    handoff: 'vault/handoffs/',
    log: 'vault/logs/',
    readme: 'vault/library/readme/',
    unknown: 'vault/library/archive/',
  };
  
  return suggestions[kind] || 'vault/library/archive/';
}

function scanDocs(cwd) {
  const vaultDir = join(cwd, 'vault');
  if (!existsSync(vaultDir)) {
    return { ok: false, error: 'Aucun vault projet. Lancez : claude-atelier vault init' };
  }

  const documents = [];
  const libraryDir = join(vaultDir, 'library');
  mkdirSync(libraryDir, { recursive: true });

  const findMarkdownFiles = (dir, basePath = '') => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      const relPath = join(basePath, entry.name).replace(/\\/g, '/');

      if (['node_modules', '.git', '.venv', 'dist', 'build', '.next'].includes(entry.name)) continue;
      if (relPath.includes('.claude/worktrees/')) continue;

      if (entry.isDirectory()) {
        findMarkdownFiles(fullPath, relPath);
      } else if (entry.name.endsWith('.md')) {
        try {
          const content = readFileSync(fullPath, 'utf8');
          const stat = statSync(fullPath);
          const hash = createHash('sha256').update(content).digest('hex');
          const title = extractH1(fullPath) || entry.name.replace(/\.md$/, '');
          const kind = classifyMarkdownKind(entry.name, relPath, content);
          const bmadSignals = extractBmadSignals(fullPath);
          const vaultRelevance = calculateVaultRelevance(kind, relPath.toLowerCase());
          const suggested = suggestDestination(kind, relPath.toLowerCase(), bmadSignals.length > 0);

          documents.push({
            path: relPath,
            filename: entry.name,
            title,
            sha256: hash,
            mtime: stat.mtime.toISOString(),
            size: stat.size,
            kind,
            confidence: 0.85,
            status: 'active',
            vaultRelevance,
            reason: `Classification ${kind} basée sur structure fichier et contenu`,
            suggestedDestination: suggested,
            protected: bmadSignals.length > 0,
            bmadSignals,
            graphNodeId: `markdown_document:${relPath}`,
          });
        } catch (e) {
          // Ignore les fichiers illisibles
        }
      }
    }
  };

  findMarkdownFiles(cwd);

  const catalogPath = join(libraryDir, 'catalog.json');
  writeFileSync(catalogPath, JSON.stringify({ documents }, null, 2) + '\n', 'utf8');

  return {
    ok: true,
    catalogPath,
    fileCount: documents.length,
    byKind: documents.reduce((acc, e) => { acc[e.kind] = (acc[e.kind] || 0) + 1; return acc; }, {}),
    protected: documents.filter(e => e.protected).length,
  };
}

function classifyDocs(cwd) {
  const vaultDir = join(cwd, 'vault');
  const catalogPath = join(vaultDir, 'library', 'catalog.json');
  if (!existsSync(catalogPath)) {
    return { ok: false, error: 'catalog.json absent — lancez : claude-atelier vault docs scan' };
  }

  let documents;
  try {
    const parsed = JSON.parse(readFileSync(catalogPath, 'utf8'));
    documents = parsed.documents || parsed;
  } catch {
    return { ok: false, error: 'catalog.json illisible' };
  }

  const byKind = {};
  const protected_ = [];
  const unknown = [];
  const byVaultRelevance = documents.slice().sort((a, b) => b.vaultRelevance - a.vaultRelevance);

  for (const doc of documents) {
    if (!byKind[doc.kind]) byKind[doc.kind] = [];
    byKind[doc.kind].push(doc);
    if (doc.protected) protected_.push(doc);
    if (doc.kind === 'unknown') unknown.push(doc);
  }

  return {
    ok: true,
    byKind,
    protected: protected_,
    topByVaultRelevance: byVaultRelevance.slice(0, 10),
    unknown,
    totalCount: documents.length,
  };
}

function organizeDocs(cwd, apply = false, confirm = false) {
  const vaultDir = join(cwd, 'vault');
  const catalogPath = join(vaultDir, 'library', 'catalog.json');
  if (!existsSync(catalogPath)) {
    return { ok: false, error: 'catalog.json absent — lancez : claude-atelier vault docs scan' };
  }

  if (apply && !confirm) {
    return { ok: false, error: 'Drapeaux --apply ET --confirm requis pour modifier les fichiers' };
  }

  let documents;
  try {
    const parsed = JSON.parse(readFileSync(catalogPath, 'utf8'));
    documents = parsed.documents || parsed;
  } catch {
    return { ok: false, error: 'catalog.json illisible' };
  }

  const plan = [];
  const protected_ = [];
  const moved = [];
  const libraryDir = join(vaultDir, 'library');
  const migrationsPath = join(libraryDir, 'migrations.json');
  const eventsPath = join(libraryDir, 'events.jsonl');

  // Identifier les fichiers à déplacer
  for (const doc of documents) {
    if (doc.protected) {
      protected_.push(doc);
    } else if (doc.kind === 'unknown' && !doc.path.startsWith('vault/')) {
      const dest = suggestDestination(doc.kind, doc.path.toLowerCase(), false);
      plan.push({
        from: doc.path,
        to: dest + doc.filename,
        kind: doc.kind,
        reason: 'Document non classifié dans le vault',
      });
    }
  }

  // Sauvegarder le plan
  writeFileSync(migrationsPath, JSON.stringify({ plan, protected: protected_.length, timestamp: new Date().toISOString() }, null, 2) + '\n', 'utf8');

  if (!apply) {
    return {
      ok: true,
      simulation: true,
      migrationsPath,
      plan,
      protected: protected_,
      message: 'Plan de réorganisation (lecture seule)',
    };
  }

  // Appliquer le plan
  for (const migration of plan) {
    try {
      const srcPath = join(cwd, migration.from);
      const destPath = join(cwd, migration.to);
      mkdirSync(dirname(destPath), { recursive: true });
      renameSync(srcPath, destPath);
      moved.push(migration);
      appendFileSync(eventsPath, JSON.stringify({ type: 'moved', from: migration.from, to: migration.to, timestamp: new Date().toISOString() }) + '\n', 'utf8');
    } catch (e) {
      // Ignorer les erreurs de déplacement
    }
  }

  return {
    ok: true,
    simulation: false,
    migrationsPath,
    moved,
    protected: protected_,
    eventsPath,
  };
}

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
    });
    addEdge({ from: 'project:root', to: `vault_file:${relPath}`, type: 'contains', confidence: 'EXTRACTED', source: 'vault/', weight: 1 });
  }

  // Décisions (20-decisions.md)
  const decisionsPath = join(vaultDir, '20-decisions.md');
  if (existsSync(decisionsPath)) {
    const content = readFileSync(decisionsPath, 'utf8');
    let cur = null;
    const flushDecision = () => {
      if (!cur) return;
      const nodeId = `decision:${cur.date}_${slugify(cur.title)}`;
      addNode({ id: nodeId, type: 'decision', label: cur.title, path: 'vault/20-decisions.md', tags: ['decision', cur.date], excerpt: cur.decision, mtime: getFileMtime(decisionsPath), sha256: '', confidence: 'EXTRACTED' });
      addEdge({ from: 'vault_file:vault/20-decisions.md', to: nodeId, type: 'documents', confidence: 'EXTRACTED', source: 'vault/20-decisions.md', weight: 2 });
      for (const c of extractConcepts(cur.title)) {
        addNode({ id: `concept:${c}`, type: 'concept', label: c, path: '', tags: [], excerpt: '', mtime: '', sha256: '', confidence: 'EXTRACTED' });
        addEdge({ from: nodeId, to: `concept:${c}`, type: 'mentions', confidence: 'EXTRACTED', source: 'vault/20-decisions.md', weight: 1 });
      }
    };
    for (const line of content.split('\n')) {
      const m = line.match(/^### (\d{4}-\d{2}-\d{2}) — (.+)/);
      if (m) { flushDecision(); cur = { date: m[1], title: m[2].trim(), decision: '' }; }
      else if (cur && line.trim().startsWith('- Décision : ')) {
        cur.decision = line.trim().slice('- Décision : '.length).trim();
      }
    }
    flushDecision();
  }

  // Roadmap (40-roadmap.md)
  const roadmapPath = join(vaultDir, '40-roadmap.md');
  if (existsSync(roadmapPath)) {
    let currentSection = '';
    for (const line of readFileSync(roadmapPath, 'utf8').split('\n')) {
      if (line.startsWith('### ')) { currentSection = line.slice(4).trim(); continue; }
      if (line.trim().startsWith('- ') && currentSection) {
        const item = line.trim().slice(2).trim();
        if (!item) continue;
        const tag = ROADMAP_SECTION_TAGS[currentSection] || slugify(currentSection);
        const nodeId = `roadmap_item:${tag}_${slugify(item)}`;
        const isBlocking = /bloquant|bloque|bloquer/.test(item.toLowerCase());
        addNode({ id: nodeId, type: 'roadmap_item', label: item, path: 'vault/40-roadmap.md', tags: [tag], excerpt: item, mtime: getFileMtime(roadmapPath), sha256: '', confidence: 'EXTRACTED' });
        addEdge({ from: 'vault_file:vault/40-roadmap.md', to: nodeId, type: isBlocking ? 'blocks' : 'suggests', confidence: 'EXTRACTED', source: 'vault/40-roadmap.md', weight: 2 });
        for (const c of extractConcepts(item)) {
          addNode({ id: `concept:${c}`, type: 'concept', label: c, path: '', tags: [], excerpt: '', mtime: '', sha256: '', confidence: 'EXTRACTED' });
          addEdge({ from: nodeId, to: `concept:${c}`, type: 'mentions', confidence: 'EXTRACTED', source: 'vault/40-roadmap.md', weight: 1 });
        }
      }
    }
  }

  // Sources (90-sources.md)
  const sourcesPath = join(vaultDir, '90-sources.md');
  if (existsSync(sourcesPath)) {
    let cur = null;
    const flushSource = () => {
      if (!cur?.title) return;
      const nodeId = `source:${cur.date}_${slugify(cur.title)}`;
      addNode({ id: nodeId, type: 'source', label: cur.title, path: 'vault/90-sources.md', tags: ['source'], excerpt: cur.resume, mtime: getFileMtime(sourcesPath), sha256: '', confidence: 'EXTRACTED' });
      addEdge({ from: 'vault_file:vault/90-sources.md', to: nodeId, type: 'documents', confidence: 'EXTRACTED', source: 'vault/90-sources.md', weight: 1 });
      if (cur.lieTo) {
        const ls = slugify(cur.lieTo);
        addNode({ id: `concept:${ls}`, type: 'concept', label: cur.lieTo, path: '', tags: [], excerpt: '', mtime: '', sha256: '', confidence: 'INFERRED' });
        addEdge({ from: nodeId, to: `concept:${ls}`, type: 'derived_from_source', confidence: 'EXTRACTED', source: 'vault/90-sources.md', weight: 1 });
      }
    };
    for (const line of readFileSync(sourcesPath, 'utf8').split('\n')) {
      const m = line.match(/^### (\d{4}-\d{2}-\d{2}) — (.+)/);
      if (m) { flushSource(); cur = { date: m[1], title: m[2].trim(), resume: '', lieTo: '' }; }
      else if (cur) {
        if (line.trim().startsWith('- Résumé : ')) cur.resume = line.trim().slice('- Résumé : '.length).trim();
        if (line.trim().startsWith('- Lié à : ')) cur.lieTo = line.trim().slice('- Lié à : '.length).trim();
      }
    }
    flushSource();
  }

  // Markdown projet hors vault (depuis manifest)
  const mdFiles = manifest
    ? manifest.files.filter(f =>
        f.path.endsWith('.md') &&
        !f.path.startsWith('vault/') &&
        !f.path.startsWith('node_modules/'))
    : [];

  for (const fileEntry of mdFiles) {
    const absPath = join(cwd, fileEntry.path);
    if (!existsSync(absPath)) continue;

    if (isBmadPath(fileEntry.path)) {
      const nodeId = `protected_artifact:${fileEntry.path}`;
      addNode({ id: nodeId, type: 'protected_artifact', label: readFirstHeading(absPath) || fileEntry.path, path: fileEntry.path, tags: ['bmad', 'protected'], excerpt: '', mtime: fileEntry.mtime, sha256: fileEntry.sha256, confidence: 'EXTRACTED' });
      addNode({ id: 'method:bmad', type: 'concept', label: 'BMAD Method', path: '', tags: ['method', 'bmad'], excerpt: '', mtime: '', sha256: '', confidence: 'INFERRED' });
      addEdge({ from: nodeId, to: 'method:bmad', type: 'protected_by_method', confidence: 'EXTRACTED', source: fileEntry.path, weight: 1 });
      continue;
    }

    const heading = readFirstHeading(absPath);
    const tags = [];
    if (fileEntry.path.includes('handoff')) tags.push('handoff');
    if (fileEntry.path.includes('review')) tags.push('review');
    if (fileEntry.path.includes('proposal')) tags.push('proposal');
    if (fileEntry.path.includes('plan')) tags.push('plan');

    const nodeId = `doc:${fileEntry.path}`;
    addNode({ id: nodeId, type: 'markdown_document', label: heading || fileEntry.path, path: fileEntry.path, tags, excerpt: readExcerpt(absPath), mtime: fileEntry.mtime, sha256: fileEntry.sha256, confidence: 'EXTRACTED' });
    addEdge({ from: 'project:root', to: nodeId, type: 'contains', confidence: 'EXTRACTED', source: fileEntry.path, weight: 1 });

    try {
      const fileContent = readFileSync(absPath, 'utf8');
      const concepts = [...new Set(
        fileContent.split('\n')
          .filter(l => l.startsWith('#'))
          .flatMap(h => extractConcepts(h.replace(/^#+\s+/, '')))
      )].slice(0, 5);
      for (const c of concepts) {
        addNode({ id: `concept:${c}`, type: 'concept', label: c, path: '', tags: [], excerpt: '', mtime: '', sha256: '', confidence: 'EXTRACTED' });
        addEdge({ from: nodeId, to: `concept:${c}`, type: 'mentions', confidence: 'EXTRACTED', source: fileEntry.path, weight: 1 });
      }
    } catch { /* skip */ }
  }

  // Centralité — degré pondéré
  const degree = {};
  for (const edge of edges) {
    degree[edge.from] = (degree[edge.from] || 0) + 1;
    degree[edge.to] = (degree[edge.to] || 0) + 1;
  }
  const decisionEdgesCount = {};
  const roadmapEdgesCount = {};
  for (const edge of edges) {
    const fromNode = nodes.get(edge.from);
    if (fromNode?.type === 'decision') decisionEdgesCount[edge.to] = (decisionEdgesCount[edge.to] || 0) + 1;
    if (fromNode?.type === 'roadmap_item') roadmapEdgesCount[edge.to] = (roadmapEdgesCount[edge.to] || 0) + 1;
  }

  const centralNodes = [...nodes.values()]
    .filter(n => !EXCLUDED_FROM_CENTRAL.has(n.id))
    .map(n => ({
      id: n.id,
      score: (degree[n.id] || 0) + 2 * (decisionEdgesCount[n.id] || 0) + 2 * (roadmapEdgesCount[n.id] || 0),
    }))
    .filter(n => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(n => n.id);

  // ── Lot 1+2 graph v2 enrichment ──
  const catalogPath = join(vaultDir, 'library', 'catalog.json');
  let catalogDocuments = [];
  if (existsSync(catalogPath)) {
    try {
      const catalogData = JSON.parse(readFileSync(catalogPath, 'utf8'));
      catalogDocuments = catalogData.documents || catalogData;
    } catch {
      // Ignorer les erreurs
    }
  }
  
  // Créer doc_category nodes et classified_as edges
  for (const doc of catalogDocuments) {
    const catId = `doc_category:${doc.kind}`;
    if (!nodes.has(catId)) {
      addNode({
        id: catId,
        type: 'doc_category',
        label: doc.kind,
        path: '',
        tags: ['category'],
        excerpt: `Catégorie: ${doc.kind}`,
        mtime: now,
        sha256: '',
        confidence: 'INFERRED',
      });
    }
    addEdge({
      from: `markdown_document:${doc.path}`,
      to: catId,
      type: 'classified_as',
      confidence: 'CATALOGUE',
      source: 'catalog.json',
      weight: 1,
    });
  }
  
  // Extraire risques et questions depuis vault files
  const vaultFilenames = ['00-brief.md', '10-mailbox.md', '20-decisions.md', '30-discoveries.md', '40-roadmap.md', '90-sources.md'];
  for (const filename of vaultFilenames) {
    const fp = join(vaultDir, filename);
    if (!existsSync(fp)) continue;
    try {
      const content = readFileSync(fp, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        if (line.match(/^(⚠️|\s*[-*]\s*⚠️|[-*]\s*(Risque|RISQUE|risk):\s*)/i)) {
          const text = line.replace(/^(⚠️|\s*[-*]\s*⚠️|[-*]\s*(Risque|RISQUE|risk):\s*)/i, '').trim();
          if (text.length > 0) {
            const slug = text.slice(0, 40).toLowerCase().replace(/[^a-z0-9]/g, '-');
            const nodeId = `risk:${slug}`;
            if (!nodes.has(nodeId)) {
              addNode({
                id: nodeId,
                type: 'risk',
                label: text.slice(0, 80),
                path: `vault/${filename}`,
                tags: ['risk'],
                excerpt: text.slice(0, 120),
                mtime: now,
                sha256: '',
                confidence: 'EXTRACTED',
              });
              addEdge({
                from: `vault_file:vault/${filename}`,
                to: nodeId,
                type: 'identifies',
                confidence: 'EXTRACTED',
                source: `vault/${filename}`,
                weight: 1,
              });
            }
          }
        }
      }
      
      for (const line of lines) {
        if (line.match(/^([-*]\s*\?|[-*]\s*Question:|[-*]\s*Q:)/i)) {
          const text = line.replace(/^([-*]\s*\?|[-*]\s*Question:|[-*]\s*Q:)\s*/i, '').trim();
          if (text.length > 0) {
            const slug = text.slice(0, 40).toLowerCase().replace(/[^a-z0-9]/g, '-');
            const nodeId = `question:${slug}`;
            if (!nodes.has(nodeId)) {
              addNode({
                id: nodeId,
                type: 'question',
                label: text.slice(0, 80),
                path: `vault/${filename}`,
                tags: ['question'],
                excerpt: text.slice(0, 120),
                mtime: now,
                sha256: '',
                confidence: 'EXTRACTED',
              });
              addEdge({
                from: `vault_file:vault/${filename}`,
                to: nodeId,
                type: 'asks',
                confidence: 'EXTRACTED',
                source: `vault/${filename}`,
                weight: 1,
              });
            }
          }
        }
      }
    } catch {
      // Ignorer
    }
  }
  
  // Ajouter byKind stats
  const byKindStats = {};
  for (const doc of catalogDocuments) {
    byKindStats[doc.kind] = (byKindStats[doc.kind] || 0) + 1;
  }

  // Calculer les communautés
  const communities = computeCommunities([...nodes.values()], edges);

  const nodeList = [...nodes.values()].map(node => ({
    ...node,
    community: communities.nodeIdToCommunityId.get(node.id) ?? 0,
  }));

  return {
    version: GRAPH_VERSION,
    generatedAt: now,
    root: cwd,
    sourceManifest: existsSync(manifestPath) ? relative(cwd, manifestPath) : null,
    nodes: nodeList,
    edges,
    stats: {
      nodeCount: nodeList.length,
      edgeCount: edges.length,
      byType,
      byKind: byKindStats,
      centralNodes,
      communities: {
        count: communities.count,
        byId: communities.byId,
      },
    },
  };
}

function graphVault(cwd) {
  const vaultDir = join(cwd, 'vault');
  if (!existsSync(vaultDir)) {
    return { ok: false, error: 'Aucun vault projet. Lancez : claude-atelier vault init' };
  }
  const graph = buildGraph(cwd);
  const graphPath = join(vaultDir, 'index', 'graph.json');
  mkdirSync(dirname(graphPath), { recursive: true });
  writeFileSync(graphPath, JSON.stringify(graph, null, 2) + '\n', 'utf8');
  return {
    ok: true,
    graphPath,
    nodeCount: graph.stats.nodeCount,
    edgeCount: graph.stats.edgeCount,
    centralNodes: graph.stats.centralNodes.slice(0, 5).map(id => id.split(':').pop()),
  };
}

function printGraph(result, cwd) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  console.log(`\n${CYAN}[PETER] vault graph${NC}`);
  console.log(`  Nœuds     : ${result.nodeCount}`);
  console.log(`  Relations : ${result.edgeCount}`);
  console.log(`  → ${relative(cwd, result.graphPath)} mis à jour`);
  if (result.centralNodes.length) {
    console.log(`\n${CYAN}[PETER]${NC} Nœuds centraux : ${result.centralNodes.join(', ')}`);
  }
  console.log(`\n${GREEN}✓${NC} Graphe minimal Peter prêt.`);
}

function scoreNode(node, tokens) {
  const haystack = [node.id, node.label || '', ...(node.tags || []), node.excerpt || '']
    .join(' ')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  let score = 0;
  for (const token of tokens) {
    const count = haystack.split(token).length - 1;
    if (count > 0) score += count;
  }
  return score;
}

function queryGraph(graph, queryText, limit = 10) {
  const tokens = (queryText || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .filter(t => t.length >= 2);

  if (!tokens.length) return { ok: true, results: [], neighbors: [] };

  const scored = (graph.nodes || [])
    .map(n => ({ node: n, score: scoreNode(n, tokens) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const resultIds = new Set(scored.map(r => r.node.id));
  const neighborIds = new Set();
  for (const edge of (graph.edges || [])) {
    if (resultIds.has(edge.from) && !resultIds.has(edge.to)) neighborIds.add(edge.to);
    if (resultIds.has(edge.to) && !resultIds.has(edge.from)) neighborIds.add(edge.from);
  }

  return {
    ok: true,
    results: scored.map(r => ({
      id: r.node.id, type: r.node.type, label: r.node.label,
      score: r.score, path: r.node.path || '',
    })),
    neighbors: [...neighborIds].slice(0, 10).map(id => id.split(':').pop()),
  };
}

function queryVaultGraph(cwd, queryText) {
  const graphPath = join(cwd, 'vault', 'index', 'graph.json');
  if (!existsSync(graphPath)) {
    return { ok: false, error: 'graph.json absent — lancez : claude-atelier vault graph' };
  }
  let graph;
  try { graph = JSON.parse(readFileSync(graphPath, 'utf8')); }
  catch { return { ok: false, error: 'graph.json illisible — relancez vault graph' }; }
  return queryGraph(graph, queryText);
}

// ─── Lot 3 — vault path + vault explain + communautés ────────────────────────

function findNodeByIdOrLabel(nodes, searchTerm) {
  const normalized = (searchTerm || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Cherche d'abord une correspondance exacte sur l'id
  for (const node of nodes) {
    if (node.id.toLowerCase() === searchTerm.toLowerCase()) return node;
  }
  // Puis une correspondance partielle sur label ou id
  for (const node of nodes) {
    const label = (node.label || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const id = node.id.toLowerCase();
    if (label.includes(normalized) || id.includes(normalized)) return node;
  }
  return null;
}

function bfsPath(nodes, edges, startId, endId) {
  if (startId === endId) return { path: [startId], edges: [] };

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const edgesByFrom = {};
  const edgesByTo = {};

  for (const edge of edges) {
    if (!edgesByFrom[edge.from]) edgesByFrom[edge.from] = [];
    if (!edgesByTo[edge.to]) edgesByTo[edge.to] = [];
    edgesByFrom[edge.from].push(edge);
    edgesByTo[edge.to].push(edge);
  }

  const visited = new Set();
  const queue = [{ id: startId, path: [startId], edgesUsed: [] }];
  visited.add(startId);

  while (queue.length > 0) {
    const { id, path, edgesUsed } = queue.shift();

    // Explore edges partant de ce nœud
    if (edgesByFrom[id]) {
      for (const edge of edgesByFrom[id]) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          const newPath = [...path, edge.to];
          const newEdges = [...edgesUsed, edge];

          if (edge.to === endId) {
            return { path: newPath, edges: newEdges };
          }
          queue.push({ id: edge.to, path: newPath, edgesUsed: newEdges });
        }
      }
    }

    // Explore edges pointant vers ce nœud (graphe non orienté)
    if (edgesByTo[id]) {
      for (const edge of edgesByTo[id]) {
        if (!visited.has(edge.from)) {
          visited.add(edge.from);
          const newPath = [edge.from, ...path];
          const newEdges = [...edgesUsed, { ...edge, reversed: true }];

          if (edge.from === endId) {
            return { path: newPath, edges: newEdges };
          }
          queue.push({ id: edge.from, path: newPath, edgesUsed: newEdges });
        }
      }
    }
  }

  return null;
}

function pathVaultGraph(cwd, nodeA, nodeB) {
  const graphPath = join(cwd, 'vault', 'index', 'graph.json');
  if (!existsSync(graphPath)) {
    return { ok: false, error: 'graph.json absent — lancez : claude-atelier vault graph' };
  }
  let graph;
  try { graph = JSON.parse(readFileSync(graphPath, 'utf8')); }
  catch { return { ok: false, error: 'graph.json illisible — relancez vault graph' }; }

  const nodeA_obj = findNodeByIdOrLabel(graph.nodes, nodeA);
  const nodeB_obj = findNodeByIdOrLabel(graph.nodes, nodeB);

  if (!nodeA_obj || !nodeB_obj) {
    return { ok: false, error: `Nœud(s) introuvable(s): "${nodeA}", "${nodeB}"` };
  }

  const result = bfsPath(graph.nodes, graph.edges, nodeA_obj.id, nodeB_obj.id);
  if (!result) {
    return { ok: true, path: [], edges: [], message: `Aucun chemin entre "${nodeA_obj.label}" et "${nodeB_obj.label}"` };
  }

  const pathWithLabels = result.path.map(id => {
    const node = graph.nodes.find(n => n.id === id);
    return { id, label: node?.label || id, type: node?.type || 'unknown' };
  });

  return { ok: true, path: pathWithLabels, edges: result.edges };
}

function printPath(result, nodeA, nodeB) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  console.log(`\n${CYAN}[PETER] vault path${NC}`);
  console.log(`  De   : ${nodeA}`);
  console.log(`  À    : ${nodeB}`);
  console.log('');

  if (!result.path.length || result.message) {
    console.log(`  ${result.message || 'Aucun chemin trouvé'}`);
    return;
  }

  console.log(`Chemin (${result.path.length} nœud${result.path.length > 1 ? 's' : ''}):`);
  for (let i = 0; i < result.path.length; i++) {
    const node = result.path[i];
    console.log(`  ${i}. ${node.label} (${node.type})`);
    if (i < result.edges.length) {
      const edge = result.edges[i];
      console.log(`     → ${edge.type}${edge.confidence ? ` [${edge.confidence}]` : ''}`);
    }
  }
}

function explainVaultNode(cwd, nodeId) {
  const graphPath = join(cwd, 'vault', 'index', 'graph.json');
  if (!existsSync(graphPath)) {
    return { ok: false, error: 'graph.json absent — lancez : claude-atelier vault graph' };
  }
  let graph;
  try { graph = JSON.parse(readFileSync(graphPath, 'utf8')); }
  catch { return { ok: false, error: 'graph.json illisible — relancez vault graph' }; }

  const node = findNodeByIdOrLabel(graph.nodes, nodeId);
  if (!node) {
    return { ok: false, error: `Nœud introuvable: "${nodeId}"` };
  }

  // Collecter les voisins entrants et sortants
  const neighbors = { in: [], out: [] };
  for (const edge of graph.edges) {
    if (edge.to === node.id) {
      const neighbor = graph.nodes.find(n => n.id === edge.from);
      if (neighbor) {
        neighbors.in.push({ node: neighbor, edgeType: edge.type, confidence: edge.confidence });
      }
    } else if (edge.from === node.id) {
      const neighbor = graph.nodes.find(n => n.id === edge.to);
      if (neighbor) {
        neighbors.out.push({ node: neighbor, edgeType: edge.type, confidence: edge.confidence });
      }
    }
  }

  // Générer une explication textuelle simple
  const parts = [];
  parts.push(`Ce nœud est un ${node.type}.`);

  if (node.label) {
    parts.push(`Son label est "${node.label}".`);
  }

  const allNeighbors = [...neighbors.out, ...neighbors.in];
  if (allNeighbors.length > 0) {
    const keyNeighbors = allNeighbors.slice(0, 2).map(n => n.node.label).join(', ');
    parts.push(`Il est lié à: ${keyNeighbors}.`);
  }

  const explanation = parts.join(' ');

  return {
    ok: true,
    node: {
      id: node.id,
      type: node.type,
      label: node.label,
      excerpt: node.excerpt || '',
      path: node.path || '',
      tags: node.tags || [],
      mtime: node.mtime || '',
      confidence: node.confidence || '',
    },
    neighbors: {
      incoming: neighbors.in.map(n => ({ edgeType: n.edgeType, node: n.node.label, confidence: n.confidence })),
      outgoing: neighbors.out.map(n => ({ edgeType: n.edgeType, node: n.node.label, confidence: n.confidence })),
    },
    explanation,
  };
}

function printExplain(result) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  const node = result.node;
  console.log(`\n${CYAN}[PETER] vault explain${NC}`);
  console.log(`  Nœud    : ${node.id}`);
  console.log(`  Type    : ${node.type}`);
  console.log(`  Label   : ${node.label}`);
  if (node.path) console.log(`  Path    : ${node.path}`);
  if (node.tags?.length) console.log(`  Tags    : ${node.tags.join(', ')}`);
  if (node.mtime) console.log(`  MTime   : ${node.mtime}`);
  console.log('');
  console.log(`${result.explanation}`);

  if (result.neighbors.incoming.length > 0) {
    console.log('');
    console.log('Entrantes :');
    for (const n of result.neighbors.incoming) {
      console.log(`  - ${n.node} (via ${n.edgeType})`);
    }
  }
  if (result.neighbors.outgoing.length > 0) {
    console.log('');
    console.log('Sortantes :');
    for (const n of result.neighbors.outgoing) {
      console.log(`  - ${n.node} (via ${n.edgeType})`);
    }
  }
}

function computeCommunities(nodes, edges) {
  const adjacency = new Map();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
    adjacency.get(edge.from).push(edge.to);
    adjacency.get(edge.to).push(edge.from);
  }

  const communities = new Map();
  const visited = new Set();
  let communityId = 0;

  for (const nodeId of adjacency.keys()) {
    if (visited.has(nodeId)) continue;

    // BFS pour trouver la composante connexe
    const queue = [nodeId];
    const community = [];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift();
      community.push(current);

      for (const neighbor of adjacency.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    communities.set(communityId, community);
    communityId++;
  }

  // Retourner { nodeIdToCommunityId, byId }
  const nodeIdToCommunityId = new Map();
  const byId = {};
  for (const [cid, members] of communities) {
    byId[cid] = members;
    for (const nid of members) {
      nodeIdToCommunityId.set(nid, cid);
    }
  }

  return { nodeIdToCommunityId, byId, count: communities.size };
}

function printQuery(result, queryText) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  console.log(`\n${CYAN}[PETER] vault query${NC}`);
  console.log(`  Question : ${queryText}`);
  console.log('');
  if (!result.results.length) {
    console.log(`  Aucun résultat pour "${queryText}".`);
    return;
  }
  console.log('Résultats :');
  for (const r of result.results) {
    const pathStr = r.path ? ` — ${r.path}` : '';
    console.log(`- ${r.id} — score ${r.score}${pathStr}`);
  }
  if (result.neighbors.length) {
    console.log('');
    console.log('Voisins utiles :');
    for (const n of result.neighbors) console.log(`- ${n}`);
  }
}

function maintainVault(cwd) {
  const vaultDir = join(cwd, 'vault');
  if (!existsSync(vaultDir)) {
    return { ok: false, error: 'Aucun vault projet. Lancez : claude-atelier vault init' };
  }

  const statePath = join(vaultDir, '.peter', 'state.json');
  const eventsPath = join(vaultDir, '.peter', 'events.jsonl');
  const previousState = loadState(statePath) ?? {};
  const previousHead = previousState.git?.head ?? previousState.maintenance?.lastHead ?? '';
  const currentHead = getGitHead(cwd);

  const update = updateVault(cwd);
  if (!update.ok) return update;

  const graph = graphVault(cwd);
  if (!graph.ok) return graph;

  const maintenanceCheck = collectMaintenanceAlerts(cwd, previousHead, currentHead);
  const mailbox = appendMailboxAlerts(vaultDir, maintenanceCheck.alerts, currentHead);
  const report = reportVault(cwd);
  if (!report.ok) return report;

  const runAt = nowIso();
  const cron = updateCronHeartbeat(cwd, runAt);
  const state = {
    ...loadState(statePath),
    version: STATE_VERSION,
    lastRun: runAt,
    lastCommand: 'maintain',
    health: maintenanceCheck.alerts.length > 0 ? 'warn' : 'ok',
    git: currentHead ? { head: currentHead } : (previousState.git ?? {}),
    maintenance: {
      lastRun: runAt,
      previousHead,
      lastHead: currentHead || previousHead,
      changedFiles: maintenanceCheck.changedFiles,
      changedCount: maintenanceCheck.changedFiles.length,
      alertsCount: maintenanceCheck.alerts.length,
      mailboxWritten: mailbox.written,
      docsCheck: maintenanceCheck.alerts.some(alert => alert.type === 'stale-docs') ? 'warn' : maintenanceCheck.mode,
    },
    pulse: {
      status: maintenanceCheck.alerts.length > 0 ? 'warn' : 'ok',
      mode: cron?.enabled ? 'cron' : 'manual',
      lastBeatAt: runAt,
      nextBeatAt: cron?.nextRunAt ?? null,
    },
  };
  saveState(statePath, state);

  appendEvent(eventsPath, {
    ts: runAt,
    type: 'maintain',
    head: currentHead || null,
    alerts: maintenanceCheck.alerts.map(alert => ({ type: alert.type, summary: alert.summary, details: alert.details ?? [] })),
    update: {
      fileCount: update.fileCount,
      newCount: update.newCount,
      modCount: update.modCount,
      deletedCount: update.deletedCount,
    },
    graph: {
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
    },
    report: {
      freshness: report.freshness,
      reportPath: relative(cwd, report.reportPath),
    },
    cron: cron ? {
      enabled: cron.enabled,
      intervalLabel: cron.intervalLabel,
      nextRunAt: cron.nextRunAt,
    } : { enabled: false },
  });

  return {
    ok: true,
    update,
    graph,
    report,
    alerts: maintenanceCheck.alerts,
    mailboxWritten: mailbox.written,
    mailboxPath: mailbox.mailboxPath,
    statePath,
    eventsPath,
    cron,
  };
}

function printMaintain(result, cwd) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  console.log(`\n${CYAN}[PETER] vault maintain${NC}`);
  console.log(`  Projet   : ${cwd}`);
  console.log(`  Fichiers : ${result.update.fileCount} (${result.update.newCount} new, ${result.update.modCount} mod, ${result.update.deletedCount} del)`);
  console.log(`  Graphe   : ${result.graph.nodeCount} nœuds / ${result.graph.edgeCount} relations`);
  console.log(`  Rapport  : ${relative(cwd, result.report.reportPath)}`);
  console.log(`  Events   : ${relative(cwd, result.eventsPath)}`);
  if (result.mailboxWritten > 0) {
    console.log(`  ${YELLOW}[MAILBOX]${NC} ${result.mailboxWritten} alerte(s) écrite(s) dans ${relative(cwd, result.mailboxPath)}`);
  }
  if (result.cron?.enabled) {
    console.log(`  ${GREEN}[PULSE]${NC} prochain réveil prévu : ${result.cron.nextRunAt}`);
  }
  console.log(`\n${result.alerts.length ? YELLOW : GREEN}${result.alerts.length ? '⚠' : '✓'}${NC} ${result.alerts.length ? `${result.alerts.length} alerte(s) détectée(s).` : 'Maintenance Peter terminée.'}`);
}

function startVaultCron(cwd, intervalText) {
  const vaultDir = join(cwd, 'vault');
  if (!existsSync(vaultDir)) {
    return { ok: false, error: 'Aucun vault projet. Lancez : claude-atelier vault init' };
  }
  const parsed = parseIntervalToMinutes(intervalText);
  if (!parsed) {
    return { ok: false, error: 'Intervalle invalide. Utilisez par exemple --interval 30m, 6h ou 1d (minimum 15m).' };
  }
  const cronPath = join(vaultDir, '.peter', 'cron.json');
  const eventsPath = join(vaultDir, '.peter', 'events.jsonl');
  const now = nowIso();
  const existing = loadCronConfig(cronPath) ?? {};
  const config = {
    ...existing,
    version: CRON_VERSION,
    enabled: true,
    intervalMinutes: parsed.minutes,
    intervalLabel: parsed.label,
    startedAt: existing.startedAt ?? now,
    updatedAt: now,
    nextRunAt: addMinutes(now, parsed.minutes),
  };
  saveCronConfig(cronPath, config);
  appendEvent(eventsPath, { ts: now, type: 'cron_start', intervalLabel: parsed.label, intervalMinutes: parsed.minutes });
  return { ok: true, cronPath, eventsPath, config };
}

function stopVaultCron(cwd) {
  const vaultDir = join(cwd, 'vault');
  if (!existsSync(vaultDir)) {
    return { ok: false, error: 'Aucun vault projet. Lancez : claude-atelier vault init' };
  }
  const cronPath = join(vaultDir, '.peter', 'cron.json');
  const eventsPath = join(vaultDir, '.peter', 'events.jsonl');
  const existing = loadCronConfig(cronPath) ?? { version: CRON_VERSION };
  const now = nowIso();
  const config = {
    ...existing,
    enabled: false,
    updatedAt: now,
    stoppedAt: now,
  };
  saveCronConfig(cronPath, config);
  appendEvent(eventsPath, { ts: now, type: 'cron_stop' });
  return { ok: true, cronPath, eventsPath, config };
}

function statusVaultCron(cwd) {
  const vaultDir = join(cwd, 'vault');
  if (!existsSync(vaultDir)) {
    return { ok: false, error: 'Aucun vault projet. Lancez : claude-atelier vault init' };
  }
  const cronPath = join(vaultDir, '.peter', 'cron.json');
  const statePath = join(vaultDir, '.peter', 'state.json');
  const config = loadCronConfig(cronPath);
  const state = loadState(statePath) ?? {};
  return {
    ok: true,
    cronPath,
    enabled: !!config?.enabled,
    config,
    lastRun: state.maintenance?.lastRun ?? state.lastRun ?? null,
    pulse: state.pulse ?? null,
  };
}


function printScanDocs(result, cwd) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  process.stdout.write(`${CYAN}[PETER] vault docs scan${NC}\n`);
  process.stdout.write(`  Fichiers : ${result.fileCount} fichiers .md indexés\n\n`);
  
  process.stdout.write('Classification :\n');
  for (const [kind, count] of Object.entries(result.byKind).sort()) {
    process.stdout.write(`  - ${kind}: ${count}\n`);
  }
  
  process.stdout.write(`\n  Protégés (BMAD) : ${result.protected}\n`);
  process.stdout.write(`  ${GREEN}→${NC} ${result.catalogPath} généré\n\n`);
  process.stdout.write(`${GREEN}✓${NC} Catalogue Markdown scanné.\n`);
}

function printClassifyDocs(result, cwd) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  process.stdout.write(`${CYAN}[PETER] vault docs classify${NC}\n`);
  process.stdout.write(`\nClassification : ${result.totalCount} documents\n\n`);
  
  for (const [kind, docs] of Object.entries(result.byKind).sort()) {
    process.stdout.write(`  ${kind}: ${docs.length}\n`);
  }
  
  if (result.protected.length > 0) {
    process.stdout.write(`\nProtected (BMAD) : ${result.protected.length}\n`);
    for (const doc of result.protected) {
      process.stdout.write(`  - ${doc.path}\n`);
    }
  }
  
  if (result.unknown.length > 0) {
    process.stdout.write(`\nUnknown (à réorganiser) : ${result.unknown.length}\n`);
    for (const doc of result.unknown.slice(0, 5)) {
      process.stdout.write(`  - ${doc.path}\n`);
    }
    if (result.unknown.length > 5) {
      process.stdout.write(`  ... et ${result.unknown.length - 5} de plus\n`);
    }
  }
  process.stdout.write('\n');
}

function printOrganizeDocs(result, cwd) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  
  process.stdout.write(`${CYAN}[PETER] vault docs organize${NC}\n`);
  const mode = result.simulation ? 'PLAN' : 'APPLIED';
  process.stdout.write(`\nMode : ${mode}\n`);
  
  if (result.plan && result.plan.length > 0) {
    process.stdout.write(`\nMigrations prévues : ${result.plan.length}\n`);
    for (const mig of result.plan.slice(0, 5)) {
      process.stdout.write(`  ${mig.from} → ${mig.to}\n`);
    }
    if (result.plan.length > 5) {
      process.stdout.write(`  ... et ${result.plan.length - 5} de plus\n`);
    }
  }
  
  if (result.protected && result.protected.length > 0) {
    process.stdout.write(`\n⚠️  Fichiers protégés (BMAD) : ${result.protected.length}\n`);
    for (const doc of result.protected.slice(0, 3)) {
      process.stdout.write(`  - ${doc.path}\n`);
    }
  }
  
  if (result.simulation) {
    process.stdout.write(`\n${result.migrationsPath} généré\n`);
    process.stdout.write(`Lancez : claude-atelier vault docs organize --apply --confirm\n`);
  } else {
    process.stdout.write(`\n${result.moved.length} fichiers déplacés\n`);
  }
  process.stdout.write('\n');
}

function printCron(result, cwd, action) {
  if (!result.ok) {
    process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
    return;
  }
  if (action === 'start') {
    console.log(`\n${CYAN}[PETER] vault cron start${NC}`);
    console.log(`  Config  : ${relative(cwd, result.cronPath)}`);
    console.log(`  Interval: ${result.config.intervalLabel} (${result.config.intervalMinutes} min)`);
    console.log(`  Prochain réveil : ${result.config.nextRunAt}`);
    console.log(`\n${GREEN}✓${NC} Pouls Peter armé. Brancher CronCreate/scheduler externe sur \`claude-atelier vault maintain\`.`);
    return;
  }
  if (action === 'stop') {
    console.log(`\n${CYAN}[PETER] vault cron stop${NC}`);
    console.log(`  Config : ${relative(cwd, result.cronPath)}`);
    console.log(`\n${YELLOW}✓${NC} Réveil autonome Peter désactivé.`);
    return;
  }
  console.log(`\n${CYAN}[PETER] vault cron status${NC}`);
  if (!result.config) {
    console.log(`  ${YELLOW}[OFF]${NC} Aucun cron Peter configuré.`);
    return;
  }
  console.log(`  État     : ${result.enabled ? `${GREEN}ON${NC}` : `${YELLOW}OFF${NC}`}`);
  console.log(`  Interval : ${result.config.intervalLabel ?? `${result.config.intervalMinutes}m`}`);
  if (result.config.lastHeartbeat) console.log(`  Dernier battement : ${result.config.lastHeartbeat}`);
  if (result.config.nextRunAt) console.log(`  Prochain réveil   : ${result.config.nextRunAt}`);
  if (result.lastRun) console.log(`  Dernière maintenance : ${result.lastRun}`);
}

export async function runVault(argv) {
  const { sub, positional, queryText, cwd, dryRun, json, intervalText } = parseArgs(argv);

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

  if (sub === 'graph') {
    const result = graphVault(cwd);
    if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else printGraph(result, cwd);
    return result.ok ? 0 : 1;
  }

  if (sub === 'query') {
    const result = queryVaultGraph(cwd, queryText);
    if (json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      if (!result.ok) process.stderr.write(`${RED}[PETER]${NC} ${result.error}\n`);
      else printQuery(result, queryText);
    }
    return result.ok ? 0 : 1;
  }

  if (sub === 'maintain') {
    const result = maintainVault(cwd);
    if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else printMaintain(result, cwd);
    return result.ok ? 0 : 1;
  }


  if (sub === 'docs') {
    const action = positional[0];
    if (action === 'scan') {
      const result = scanDocs(cwd);
      if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      else printScanDocs(result, cwd);
      return result.ok ? 0 : 1;
    }
    if (action === 'classify') {
      const result = classifyDocs(cwd);
      if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      else printClassifyDocs(result, cwd);
      return result.ok ? 0 : 1;
    }
    if (action === 'organize') {
      const apply = argv.includes('--apply');
      const confirm = argv.includes('--confirm');
      const isPlan = argv.includes('--plan');
      const result = organizeDocs(cwd, apply && !isPlan, confirm);
      if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      else printOrganizeDocs(result, cwd);
      return result.ok ? 0 : 1;
    }
    process.stderr.write(`${RED}error${NC}: vault docs <scan|classify|organize>\n`);
    return 1;
  }

  if (sub === 'cron') {
    const action = positional[0] ?? 'status';
    const result = action === 'start'
      ? startVaultCron(cwd, intervalText)
      : action === 'stop'
        ? stopVaultCron(cwd)
        : action === 'status'
          ? statusVaultCron(cwd)
          : { ok: false, error: `Action cron inconnue "${action}"` };
    if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else printCron(result, cwd, action);
    return result.ok ? 0 : 1;
  }

  if (sub === 'path') {
    const nodeA = positional[0];
    const nodeB = positional[1];
    if (!nodeA || !nodeB) {
      process.stderr.write(`${RED}error${NC}: vault path <nodeA> <nodeB>\n`);
      return 1;
    }
    const result = pathVaultGraph(cwd, nodeA, nodeB);
    if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else printPath(result, nodeA, nodeB);
    return result.ok ? 0 : 1;
  }

  if (sub === 'explain') {
    const nodeId = positional[0];
    if (!nodeId) {
      process.stderr.write(`${RED}error${NC}: vault explain <node>\n`);
      return 1;
    }
    const result = explainVaultNode(cwd, nodeId);
    if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else printExplain(result);
    return result.ok ? 0 : 1;
  }

  process.stderr.write(`${RED}error${NC}: sous-commande vault inconnue "${sub}"\n`);
  process.stderr.write('Usage: claude-atelier vault [init|status|report|stale|update|graph|query|explain|path|maintain|cron] [--cwd <path>] [--dry-run] [--json]\n');
  return 1;
}
