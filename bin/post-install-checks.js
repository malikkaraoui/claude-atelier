import { spawnSync } from 'node:child_process';

const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const CYAN = '\x1b[0;36m';
const NC = '\x1b[0m';

export function runPostInstallChecks(projectRoot, pkgRoot) {
  console.log(`\n${CYAN}Post-install checks${NC}\n`);

  // 1. npm audit
  const auditResult = spawnSync('npm', ['audit', '--audit-level=high'], {
    cwd: projectRoot,
    encoding: 'utf-8',
  });

  if (auditResult.status === 0) {
    console.log(`${GREEN}✓${NC} npm audit OK`);
  } else {
    console.log(`${RED}⚠${NC} npm audit found vulnerabilities`);
    if (auditResult.stdout) console.log(auditResult.stdout);
    if (auditResult.stderr) console.error(auditResult.stderr);
  }

  // 2. lint-npm-files check
  const lintResult = spawnSync('node', ['test/lint-npm-files.js'], {
    cwd: pkgRoot,
    encoding: 'utf-8',
  });

  if (lintResult.status === 0) {
    console.log(`${GREEN}✓${NC} package.json#files OK`);
  } else {
    console.log(`${YELLOW}⚠${NC} package.json#files incomplet`);
    if (lintResult.stdout) console.log(lintResult.stdout);
    if (lintResult.stderr) console.error(lintResult.stderr);
  }
}
