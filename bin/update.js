#!/usr/bin/env node
/**
 * claude-atelier update — Update config, preserving all user customizations
 *
 * Strategy:
 *  1. Backup current .claude/ → .claude/.backup-YYYYMMDD-HHMMSS/
 *  2. Copy all template files from package .claude/ to target
 *  3. settings.json : merge (user values win, new keys added)
 *  4. CLAUDE.md     : merge §0 (project context preserved)
 *  5. Report what changed: [NEW] / [UPDATED] / [MERGED] / [SKIP]
 *
 * Usage:
 *   claude-atelier update                 # project-local (./.claude/)
 *   claude-atelier update --global        # user-global (~/.claude/)
 *   claude-atelier update --dry-run       # show what would change
 */

import {
  existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync,
  readdirSync, statSync, cpSync,
} from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

const GREEN  = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const CYAN   = '\x1b[0;36m';
const DIM    = '\x1b[2m';
const NC     = '\x1b[0m';

function parseArgs(argv) {
  const args = argv.slice(2).filter(a => a !== 'update');
  return {
    global: args.includes('--global'),
    dryRun: args.includes('--dry-run'),
  };
}

// ── settings.json : user values win, new template keys added ─────────────────
function mergeSettings(templatePath, existingPath) {
  const template = JSON.parse(readFileSync(templatePath, 'utf8'));
  if (!existsSync(existingPath)) return { result: template, merged: false };

  const existing = JSON.parse(readFileSync(existingPath, 'utf8'));
  const merged   = { ...template, ...existing };

  if (template.env || existing.env) {
    merged.env = { ...(template.env || {}), ...(existing.env || {}) };
  }

  if (template.permissions || existing.permissions) {
    merged.permissions = { ...(template.permissions || {}), ...(existing.permissions || {}) };
    if (template.permissions?.allow || existing.permissions?.allow) {
      merged.permissions.allow = [...new Set([
        ...(template.permissions?.allow || []),
        ...(existing.permissions?.allow || []),
      ])];
    }
    // deny: existing wins (user explicitly chose these)
    if (existing.permissions?.deny) {
      merged.permissions.deny = existing.permissions.deny;
    } else if (template.permissions?.deny) {
      merged.permissions.deny = template.permissions.deny;
    }
  }

  if (template.preferences || existing.preferences) {
    merged.preferences = { ...(template.preferences || {}), ...(existing.preferences || {}) };
  }

  return { result: merged, merged: true };
}

// ── CLAUDE.md : extract §0 from existing, inject into new template ───────────
function extractSection0(content) {
  const m = content.match(/^## §0 Contexte projet actif\n\n[\s\S]*?(?=^## §\d|$)/m);
  return m ? m[0].trim() : null;
}

function mergeClaude(templateContent, existingPath) {
  if (!existsSync(existingPath)) return { result: templateContent, merged: false };

  const existing = readFileSync(existingPath, 'utf8');
  const section0 = extractSection0(existing);
  if (!section0) return { result: templateContent, merged: false };

  const merged = templateContent.replace(
    /^## §0 Contexte projet actif\n\n[\s\S]*?(?=^## §\d)/m,
    section0 + '\n\n'
  );
  return { result: merged, merged: true };
}

// ── Recursive copy with per-file smart merge ──────────────────────────────────
function copyDirRecursive(src, dest, dryRun, report, excludeDirs = []) {
  if (!existsSync(src)) return;

  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.gitkeep' || excludeDirs.includes(entry.name)) continue;

    const srcPath  = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!dryRun && !existsSync(destPath)) mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath, dryRun, report, excludeDirs);
      continue;
    }

    const exists = existsSync(destPath);

    // settings.json — always merge
    if (entry.name === 'settings.json') {
      if (!dryRun) {
        const { result, merged } = mergeSettings(srcPath, destPath);
        if (!existsSync(dirname(destPath))) mkdirSync(dirname(destPath), { recursive: true });
        writeFileSync(destPath, JSON.stringify(result, null, 2) + '\n');
        report.push({ tag: merged ? 'MERGED' : 'NEW', path: destPath });
      } else {
        report.push({ tag: exists ? 'MERGED' : 'NEW', path: destPath });
      }
      continue;
    }

    // CLAUDE.md — merge §0
    if (entry.name === 'CLAUDE.md') {
      if (!dryRun) {
        const templateContent = readFileSync(srcPath, 'utf8');
        const { result, merged } = mergeClaude(templateContent, destPath);
        if (!existsSync(dirname(destPath))) mkdirSync(dirname(destPath), { recursive: true });
        writeFileSync(destPath, result);
        report.push({ tag: merged ? 'MERGED' : 'NEW', path: destPath });
      } else {
        report.push({ tag: exists ? 'MERGED' : 'NEW', path: destPath });
      }
      continue;
    }

    // All other files — copy (update)
    if (!dryRun) {
      if (!existsSync(dirname(destPath))) mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
    report.push({ tag: exists ? 'UPDATED' : 'NEW', path: destPath });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
export async function runUpdate(argv) {
  const opts = parseArgs(argv);

  const targetDir = opts.global
    ? join(homedir(), '.claude')
    : join(process.cwd(), '.claude');

  const templateDir = join(PKG_ROOT, '.claude');

  if (!existsSync(templateDir)) {
    process.stderr.write(`✘ Template directory not found: ${templateDir}\n`);
    return 1;
  }

  console.log(`\n${CYAN}claude-atelier update${NC}`);
  console.log(`Target : ${opts.global ? '~/.claude/' : './.claude/'}`);
  if (opts.dryRun) console.log(`${YELLOW}DRY RUN${NC} — nothing will be written\n`);
  else console.log('');

  // 1. Backup existing .claude/ before touching anything
  let backupPath = null;
  if (!opts.dryRun && existsSync(targetDir)) {
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
    backupPath = join(dirname(targetDir), `.claude-backup-${ts}`);
    cpSync(targetDir, backupPath, { recursive: true });
    console.log(`${DIM}Backup → ${relative(process.cwd(), backupPath)}/ (temporaire — ajoutez .claude-backup-*/ à votre .gitignore)${NC}\n`);
  }

  // 2. Copy/merge all template files (skip backup dir as exclude)
  const report = [];
  copyDirRecursive(templateDir, targetDir, opts.dryRun, report);

  // 3. Print report grouped by tag
  const groups = { NEW: [], MERGED: [], UPDATED: [] };
  for (const { tag, path } of report) {
    const display = path.startsWith(process.cwd()) ? relative(process.cwd(), path) : path;
    groups[tag].push(display);
  }

  for (const [tag, files] of Object.entries(groups)) {
    if (files.length === 0) continue;
    const color = tag === 'NEW' ? GREEN : tag === 'MERGED' ? CYAN : YELLOW;
    console.log(`${color}[${tag}]${NC} ${files.length} fichier(s) :`);
    files.forEach(f => console.log(`  ${DIM}${f}${NC}`));
    console.log('');
  }

  if (opts.dryRun) {
    console.log(`${YELLOW}DRY RUN complete.${NC} Retire --dry-run pour appliquer.\n`);
    return 0;
  }

  console.log(`${GREEN}✓ Mise à jour terminée.${NC}`);
  if (backupPath) {
    console.log(`${DIM}Backup conservé : ${relative(process.cwd(), backupPath)}/${NC}`);
    console.log(`${DIM}Pour annuler : cp -r ${relative(process.cwd(), backupPath)}/ ${relative(process.cwd(), targetDir)}/${NC}`);
  }
  console.log(`\nRun ${CYAN}claude-atelier doctor${NC} pour vérifier.\n`);

  return 0;
}

runUpdate(process.argv).then(code => process.exit(code));
