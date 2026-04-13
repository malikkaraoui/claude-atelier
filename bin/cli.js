#!/usr/bin/env node
/**
 * claude-atelier — CLI entry point
 *
 * P1 scope: version + help only. All real commands (init, update, doctor, lint)
 * are stubbed and will be implemented in P4.
 *
 * Usage:
 *   claude-atelier --version
 *   claude-atelier --help
 *   claude-atelier <command> [options]
 */

import { spawnSync, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

const HELP = `
claude-atelier v${pkg.version}
${pkg.description}

Usage:
  claude-atelier <command> [options]

Commands:
  init              Install config into ./.claude/ (or ~/.claude/ with --global)
  update            Update config, preserving project §0
  doctor            Verify installation integrity
  lint              Validate markdown references and CLAUDE core length

Options:
  --version, -v     Print version and exit
  --help, -h        Print this help and exit
  --global          Target global config (~/.claude/) instead of project
  --lang <fr|en>    Language (default: fr)

Status:
  Available now: init, lint, doctor
  Still stubbed: update
  Repo: ${pkg.homepage}
`;

function runNodeScript(relativePath) {
  const result = spawnSync(process.execPath, [join(__dirname, '..', relativePath)], {
    stdio: 'inherit'
  });

  if (typeof result.status === 'number') {
    return result.status;
  }

  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
  }

  return 1;
}

function runLint() {
  const scripts = ['test/lint-refs.js', 'test/lint-length.js'];

  for (const script of scripts) {
    const exitCode = runNodeScript(script);

    if (exitCode !== 0) {
      return exitCode;
    }
  }

  return 0;
}

async function main(argv) {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    process.stdout.write(HELP);
    return 0;
  }

  if (args.includes('--version') || args.includes('-v')) {
    process.stdout.write(`${pkg.version}\n`);
    return 0;
  }

  const command = args[0];
  const knownCommands = ['init', 'update', 'doctor', 'lint'];

  if (!knownCommands.includes(command)) {
    process.stderr.write(`error: unknown command "${command}"\n`);
    process.stderr.write(`run "claude-atelier --help" for usage\n`);
    return 1;
  }

  if (command === 'lint') {
    return runLint();
  }

  if (command === 'doctor') {
    return runNodeScript('test/doctor.js');
  }

  if (command === 'init') {
    const { runInit } = await import('./init.js');
    return runInit(process.argv);
  }

  process.stderr.write(
    `error: command "${command}" is not yet implemented\n`
  );
  return 2;
}

function checkForUpdate() {
  try {
    const latest = execSync('npm view claude-atelier version 2>/dev/null', { encoding: 'utf8', timeout: 5000 }).trim();
    if (latest && latest !== pkg.version) {
      process.stderr.write(`\n\x1b[33m[UPDATE]\x1b[0m claude-atelier ${pkg.version} → \x1b[32m${latest}\x1b[0m disponible\n`);
      process.stderr.write(`  \x1b[36mnpm update claude-atelier\x1b[0m ou \x1b[36mnpx claude-atelier@latest init\x1b[0m\n\n`);
    }
  } catch (_) {}
}

main(process.argv).then(code => {
  checkForUpdate();
  process.exit(code);
});
