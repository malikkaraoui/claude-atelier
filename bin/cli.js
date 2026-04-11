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
  lint              Lint markdown references and structure

Options:
  --version, -v     Print version and exit
  --help, -h        Print this help and exit
  --global          Target global config (~/.claude/) instead of project
  --lang <fr|en>    Language (default: fr)

Status:
  P1 scaffolding only — commands are stubs until P4.
  Repo: ${pkg.homepage}
`;

function main(argv) {
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

  process.stderr.write(
    `error: command "${command}" is not yet implemented (planned for P4)\n`
  );
  return 2;
}

process.exit(main(process.argv));
