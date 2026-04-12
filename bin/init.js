#!/usr/bin/env node
/**
 * claude-atelier init — Install config into .claude/ or ~/.claude/
 *
 * Usage:
 *   claude-atelier init                 # project-local (./.claude/)
 *   claude-atelier init --global        # user-global (~/.claude/)
 *   claude-atelier init --lang en       # English version
 *   claude-atelier init --dry-run       # show what would be copied
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const CYAN = '\x1b[0;36m';
const NC = '\x1b[0m';

function parseArgs(argv) {
  const args = argv.slice(2).filter(a => a !== 'init');
  return {
    global: args.includes('--global'),
    dryRun: args.includes('--dry-run'),
    lang: args.includes('--lang') ? args[args.indexOf('--lang') + 1] || 'fr' : 'fr',
  };
}

function copyDirRecursive(src, dest, dryRun, copied) {
  if (!existsSync(src)) return;

  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') continue;

    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!dryRun && !existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }
      copyDirRecursive(srcPath, destPath, dryRun, copied);
    } else {
      if (dryRun) {
        copied.push(destPath);
      } else {
        if (!existsSync(dirname(destPath))) {
          mkdirSync(dirname(destPath), { recursive: true });
        }
        copyFileSync(srcPath, destPath);
        copied.push(destPath);
      }
    }
  }
}

function mergeSettings(existingPath, templatePath) {
  const template = JSON.parse(readFileSync(templatePath, 'utf8'));

  if (!existsSync(existingPath)) {
    return template;
  }

  const existing = JSON.parse(readFileSync(existingPath, 'utf8'));

  // Merge strategy: keep existing values, add missing keys from template
  const merged = { ...template, ...existing };

  // Deep merge env
  if (template.env || existing.env) {
    merged.env = { ...template.env, ...(existing.env || {}) };
  }

  // Deep merge permissions
  if (template.permissions || existing.permissions) {
    merged.permissions = { ...template.permissions, ...(existing.permissions || {}) };
    // Merge allow/deny arrays (union, no duplicates)
    if (template.permissions?.allow || existing.permissions?.allow) {
      merged.permissions.allow = [...new Set([
        ...(template.permissions?.allow || []),
        ...(existing.permissions?.allow || []),
      ])];
    }
    if (template.permissions?.deny || existing.permissions?.deny) {
      merged.permissions.deny = [...new Set([
        ...(template.permissions?.deny || []),
        ...(existing.permissions?.deny || []),
      ])];
    }
  }

  // Deep merge preferences
  if (template.preferences || existing.preferences) {
    merged.preferences = { ...template.preferences, ...(existing.preferences || {}) };
  }

  return merged;
}

export function runInit(argv) {
  const { global: isGlobal, dryRun, lang } = parseArgs(argv);

  // Validate lang — must have a CLAUDE.md to be considered ready
  const langDir = join(PKG_ROOT, 'src', lang);
  const langClaude = join(langDir, 'CLAUDE.md');
  if (!existsSync(langDir)) {
    const available = readdirSync(join(PKG_ROOT, 'src'))
      .filter(d => statSync(join(PKG_ROOT, 'src', d)).isDirectory() && !['stacks', 'templates'].includes(d));
    process.stderr.write(`${RED}error${NC}: language "${lang}" not available. Available: ${available.join(', ')}\n`);
    return 1;
  }
  if (!existsSync(langClaude)) {
    process.stderr.write(`${RED}error${NC}: language "${lang}" exists but has no CLAUDE.md — not ready for use.\n`);
    process.stderr.write(`See src/${lang}/README.md for the translation roadmap.\n`);
    return 1;
  }

  // Determine target
  const target = isGlobal
    ? join(homedir(), '.claude')
    : join(process.cwd(), '.claude');

  const label = isGlobal ? `~/.claude/ (global)` : `./.claude/ (project)`;

  console.log(`\n${CYAN}claude-atelier init${NC}`);
  console.log(`Target: ${label}`);
  console.log(`Language: ${lang}`);
  if (dryRun) console.log(`${YELLOW}DRY RUN${NC} — nothing will be written\n`);
  else console.log('');

  const copied = [];

  // 1. Copy lang files (runtime, orchestration, autonomy, security, ecosystem)
  const srcLang = join(PKG_ROOT, 'src', lang);
  copyDirRecursive(srcLang, target, dryRun, copied);

  // 2. Copy stacks
  const srcStacks = join(PKG_ROOT, 'src', 'stacks');
  const destStacks = join(target, 'stacks');
  copyDirRecursive(srcStacks, destStacks, dryRun, copied);

  // 2b. Copy skills into .claude/skills/ (slash commands)
  const srcSkills = join(PKG_ROOT, 'src', 'skills');
  const destSkills = isGlobal
    ? join(homedir(), '.claude', 'skills')
    : join(process.cwd(), '.claude', 'skills');
  copyDirRecursive(srcSkills, destSkills, dryRun, copied);

  // 3. Merge settings.json (don't overwrite existing)
  const settingsTemplate = join(PKG_ROOT, 'src', 'templates', 'settings.json');
  const settingsDest = join(target, 'settings.json');
  if (existsSync(settingsTemplate)) {
    if (dryRun) {
      if (existsSync(settingsDest)) {
        copied.push(`${settingsDest} (merged with existing)`);
      } else {
        copied.push(settingsDest);
      }
    } else {
      const merged = mergeSettings(settingsDest, settingsTemplate);
      if (!existsSync(dirname(settingsDest))) {
        mkdirSync(dirname(settingsDest), { recursive: true });
      }
      writeFileSync(settingsDest, JSON.stringify(merged, null, 2) + '\n');
      copied.push(settingsDest);
    }
  }

  // 4. Copy .claudeignore to project root (not inside .claude/)
  const claudeignoreSrc = join(PKG_ROOT, 'src', 'templates', '.claudeignore');
  const claudeignoreDest = isGlobal
    ? join(homedir(), '.claudeignore')
    : join(process.cwd(), '.claudeignore');
  if (existsSync(claudeignoreSrc) && !existsSync(claudeignoreDest)) {
    if (!dryRun) {
      copyFileSync(claudeignoreSrc, claudeignoreDest);
    }
    copied.push(claudeignoreDest);
  } else if (existsSync(claudeignoreDest)) {
    console.log(`${YELLOW}[SKIP]${NC} .claudeignore already exists`);
  }

  // 5. Copy .gitignore template to project root (skip if exists)
  const gitignoreSrc = join(PKG_ROOT, 'src', 'templates', '.gitignore');
  const gitignoreDest = isGlobal
    ? null  // no .gitignore for global install
    : join(process.cwd(), '.gitignore');
  if (gitignoreDest && existsSync(gitignoreSrc) && !existsSync(gitignoreDest)) {
    if (!dryRun) {
      copyFileSync(gitignoreSrc, gitignoreDest);
    }
    copied.push(gitignoreDest);
  } else if (gitignoreDest && existsSync(gitignoreDest)) {
    console.log(`${YELLOW}[SKIP]${NC} .gitignore already exists`);
  }

  // 6. Copy scripts/
  const scriptsSrc = join(PKG_ROOT, 'scripts');
  const scriptsDest = isGlobal
    ? join(homedir(), '.claude', 'scripts')
    : join(process.cwd(), 'scripts');
  copyDirRecursive(scriptsSrc, scriptsDest, dryRun, copied);

  // Summary
  console.log(`\n${GREEN}${copied.length} files${NC} ${dryRun ? 'would be' : ''} installed:\n`);
  for (const f of copied) {
    const display = f.startsWith(process.cwd())
      ? relative(process.cwd(), f)
      : f;
    console.log(`  ${display}`);
  }

  if (!dryRun) {
    console.log(`\n${GREEN}Done.${NC} Run ${CYAN}claude-atelier doctor${NC} to verify.\n`);
  } else {
    console.log(`\n${YELLOW}DRY RUN complete.${NC} Remove --dry-run to install for real.\n`);
  }

  return 0;
}
