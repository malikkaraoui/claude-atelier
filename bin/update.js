#!/usr/bin/env node
/**
 * claude-atelier update — Update config, preserving project customizations
 *
 * Strategy:
 *  1. Copy all template files like init does
 *  2. For CLAUDE.md: extract §0 (Contexte projet actif) from existing, merge with new template
 *  3. Preserve other user-customized files (e.g., custom rules)
 *
 * Usage:
 *   claude-atelier update                 # project-local (./.claude/)
 *   claude-atelier update --global        # user-global (~/.claude/)
 *   claude-atelier update --dry-run       # show what would be copied
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
  const args = argv.slice(2).filter(a => a !== 'update');
  return {
    global: args.includes('--global'),
    dryRun: args.includes('--dry-run'),
  };
}

function extractSection0(claudeMdContent) {
  // Extract §0 Contexte projet actif (lines between "## §0" and next "## §")
  const section0Regex = /^## §0 Contexte projet actif\n\n[\s\S]*?(?=^## §\d|$)/m;
  const match = claudeMdContent.match(section0Regex);
  return match ? match[0].trim() : null;
}

function mergeClaudeMd(newContent, existingPath) {
  // If no existing file, return new content as-is
  if (!existsSync(existingPath)) {
    return newContent;
  }

  const existingContent = readFileSync(existingPath, 'utf8');
  const section0 = extractSection0(existingContent);

  if (!section0) {
    // Couldn't extract §0, just use new template
    return newContent;
  }

  // Replace §0 in new template with preserved §0
  const newSection0Regex = /^## §0 Contexte projet actif\n\n[\s\S]*?(?=^## §\d)/m;
  return newContent.replace(newSection0Regex, section0 + '\n\n');
}

function copyDirRecursive(src, dest, dryRun, copied, excludeDirs = []) {
  if (!existsSync(src)) return;

  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.gitkeep' || excludeDirs.includes(entry.name)) continue;

    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!dryRun && !existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }
      copyDirRecursive(srcPath, destPath, dryRun, copied, excludeDirs);
    } else {
      // Special handling for CLAUDE.md
      if (entry.name === 'CLAUDE.md') {
        const newContent = readFileSync(srcPath, 'utf8');
        const mergedContent = mergeClaudeMd(newContent, destPath);

        if (dryRun) {
          copied.push(`${destPath} (merged §0)`);
        } else {
          if (!existsSync(dirname(destPath))) {
            mkdirSync(dirname(destPath), { recursive: true });
          }
          writeFileSync(destPath, mergedContent, 'utf8');
          copied.push(`${destPath} (merged §0)`);
        }
        continue;
      }

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

export async function runUpdate(argv) {
  const opts = parseArgs(argv);

  // Determine target directory
  const targetDir = opts.global
    ? join(homedir(), '.claude')
    : join(process.cwd(), '.claude');

  // Source template
  const templateDir = join(PKG_ROOT, '.claude');

  if (!existsSync(templateDir)) {
    console.error(`${RED}✘${NC} Template directory not found: ${templateDir}`);
    return 1;
  }

  const copied = [];
  copyDirRecursive(templateDir, targetDir, opts.dryRun, copied);

  if (opts.dryRun) {
    console.log(`\n${CYAN}[DRY RUN]${NC} Would update:\n`);
    copied.forEach(f => console.log(`  ${f}`));
    console.log(`\nRun \`claude-atelier update${opts.global ? ' --global' : ''}\` to apply.\n`);
    return 0;
  }

  console.log(`\n${GREEN}✓${NC} Config updated in ${targetDir}\n`);
  if (copied.length > 0) {
    console.log(`${copied.length} file(s) updated, §0 preserved in CLAUDE.md\n`);
  }

  return 0;
}

runUpdate(process.argv).then(code => process.exit(code));
