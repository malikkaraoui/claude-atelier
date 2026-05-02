#!/usr/bin/env node
/**
 * claude-atelier vault — Initialise et inspecte le vault dynamique projet.
 *
 * Usage:
 *   claude-atelier vault init [--cwd <path>] [--dry-run]
 *   claude-atelier vault status [--cwd <path>]
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const command = `bash "${projectHook}"`;
  const alreadyInstalled = sessionStart.some(entry => String(entry).includes('vault-context.sh'));

  if (!alreadyInstalled) {
    const targetEntry = sessionStart.find(entry => entry && entry.matcher === '');
    if (targetEntry) {
      targetEntry.hooks = Array.isArray(targetEntry.hooks) ? targetEntry.hooks : [];
      targetEntry.hooks.push({ type: 'command', command });
    } else {
      sessionStart.push({ matcher: '', hooks: [{ type: 'command', command }] });
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

  process.stderr.write(`${RED}error${NC}: sous-commande vault inconnue "${sub}"\n`);
  process.stderr.write('Usage: claude-atelier vault [init|status] [--cwd <path>] [--dry-run] [--json]\n');
  return 1;
}
