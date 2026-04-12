#!/usr/bin/env node
/**
 * claude-atelier doctor — Verify installation integrity
 *
 * Checks:
 * 1. CLAUDE.md exists and is ≤ 150 lines
 * 2. All satellite directories exist with expected files
 * 3. settings.json exists
 * 4. .gitignore and .claudeignore exist
 * 5. scripts/pre-push-gate.sh exists and is executable
 * 6. No broken markdown references
 * 7. No _legacy.md files remaining
 * 8. Git hooks installed (optional warning)
 *
 * Exit codes: 0 = healthy, 1 = issues found
 */

import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const NC = '\x1b[0m';

let errors = 0;
let warnings = 0;

function pass(msg) { console.log(`${GREEN}[OK]${NC}   ${msg}`); }
function fail(msg) { console.log(`${RED}[FAIL]${NC} ${msg}`); errors++; }
function warn(msg) { console.log(`${YELLOW}[WARN]${NC} ${msg}`); warnings++; }

// ─── Detect target: installed project (.claude/) or source repo (src/) ──────

const isInstalledProject = existsSync(join(process.cwd(), '.claude', 'CLAUDE.md'));
const srcDir = isInstalledProject
  ? join(process.cwd(), '.claude')
  : join(ROOT, 'src', 'fr');

const templatesDir = isInstalledProject
  ? join(process.cwd(), '.claude')
  : join(ROOT, 'src', 'templates');

const scriptsDir = isInstalledProject
  ? join(process.cwd(), 'scripts')
  : join(ROOT, 'scripts');

const mode = isInstalledProject ? 'installed project' : 'source repo';
console.log(`\nclaude-atelier doctor (${mode})\n`);

// ─── 1. CLAUDE.md exists and length ─────────────────────────────────────────

const claudePath = join(srcDir, 'CLAUDE.md');
if (existsSync(claudePath)) {
  const lines = readFileSync(claudePath, 'utf8').split('\n').length;
  if (lines <= 150) {
    pass(`CLAUDE.md exists (${lines} lines, ≤ 150)`);
  } else {
    fail(`CLAUDE.md exceeds 150 lines (${lines} lines)`);
  }
} else {
  fail(`CLAUDE.md not found at ${claudePath}`);
}

// ─── 2. Satellite directories ───────────────────────────────────────────────

const expectedDirs = ['runtime', 'orchestration', 'autonomy', 'security', 'ecosystem'];
const expectedFiles = {
  runtime: ['code-review.md', 'todo-session.md', 'extended-thinking.md'],
  orchestration: ['modes.md', 'subagents.md', 'parallelization.md', 'models-routing.md', 'spawn-rules.md', 'mcp-lifecycle.md'],
  autonomy: ['permission-modes.md', 'night-mode.md', 'loop-watchers.md'],
  security: ['secrets-rules.md', 'pre-push-gate.md', 'emergency.md'],
  ecosystem: ['skills.md', 'plugins.md', 'hooks.md', 'memory-system.md', 'qmd-integration.md'],
};

for (const dir of expectedDirs) {
  const dirPath = join(srcDir, dir);
  if (!existsSync(dirPath)) {
    fail(`Missing directory: ${dir}/`);
    continue;
  }

  const files = expectedFiles[dir] || [];
  for (const file of files) {
    const filePath = join(dirPath, file);
    if (existsSync(filePath)) {
      pass(`${dir}/${file}`);
    } else {
      fail(`Missing file: ${dir}/${file}`);
    }
  }
}

// ─── 3. Settings / templates ────────────────────────────────────────────────

const settingsPath = join(templatesDir, 'settings.json');
if (existsSync(settingsPath)) {
  try {
    JSON.parse(readFileSync(settingsPath, 'utf8'));
    pass('settings.json exists and is valid JSON');
  } catch {
    fail('settings.json exists but is invalid JSON');
  }
} else {
  fail(`settings.json not found at ${settingsPath}`);
}

// ─── 4. .gitignore and .claudeignore ────────────────────────────────────────

for (const name of ['.gitignore', '.claudeignore']) {
  // Check in templates (source repo) or project root (installed)
  const checkPath = isInstalledProject
    ? join(process.cwd(), name)
    : join(ROOT, 'src', 'templates', name);

  if (existsSync(checkPath)) {
    pass(`${name} exists`);
  } else {
    fail(`${name} not found`);
  }
}

// ─── 5. pre-push-gate.sh ───────────────────────────────────────────────────

const gatePath = join(scriptsDir, 'pre-push-gate.sh');
if (existsSync(gatePath)) {
  const stat = statSync(gatePath);
  const isExecutable = (stat.mode & 0o111) !== 0;
  if (isExecutable) {
    pass('scripts/pre-push-gate.sh exists and is executable');
  } else {
    warn('scripts/pre-push-gate.sh exists but is NOT executable (chmod +x)');
  }
} else {
  fail('scripts/pre-push-gate.sh not found');
}

// ─── 6. Broken refs (reuse lint-refs) ───────────────────────────────────────

const lintRefsResult = spawnSync(process.execPath, [join(__dirname, 'lint-refs.js')], {
  stdio: 'pipe'
});

if (lintRefsResult.status === 0) {
  pass('All markdown references resolve');
} else {
  fail('Broken markdown references detected (run `npm run lint:refs` for details)');
}

// ─── 7. No _legacy.md files ────────────────────────────────────────────────

function findLegacyFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findLegacyFiles(fullPath));
    } else if (entry.name.includes('_legacy')) {
      results.push(fullPath);
    }
  }
  return results;
}

const legacyFiles = findLegacyFiles(srcDir);
if (legacyFiles.length === 0) {
  pass('No _legacy.md files remaining');
} else {
  for (const f of legacyFiles) {
    fail(`Legacy file still present: ${f}`);
  }
}

// ─── 8. Git hooks (optional) ───────────────────────────────────────────────

if (isInstalledProject) {
  const hookPath = join(process.cwd(), '.git', 'hooks', 'pre-push');
  if (existsSync(hookPath)) {
    pass('Git pre-push hook installed');
  } else {
    warn('Git pre-push hook not installed (optional but recommended)');
  }
}

// ─── Summary ───────────────────────────────────────────────────────────────

console.log('');
if (errors === 0 && warnings === 0) {
  console.log(`${GREEN}HEALTHY${NC} — all checks passed`);
} else if (errors === 0) {
  console.log(`${YELLOW}OK with ${warnings} warning(s)${NC}`);
} else {
  console.log(`${RED}UNHEALTHY${NC} — ${errors} error(s), ${warnings} warning(s)`);
}

process.exit(errors > 0 ? 1 : 0);
