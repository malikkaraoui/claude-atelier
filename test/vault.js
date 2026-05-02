#!/usr/bin/env node
/**
 * test/vault.js — Tests de la commande claude-atelier vault.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

let pass = 0;
let fail = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    pass++;
  } catch (e) {
    console.error(`  ✗ ${label}`);
    console.error(`    └ ${e.message}`);
    fail++;
  }
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion échouée');
}

function countPeterHooks(settings) {
  const sessionStart = settings.hooks?.SessionStart ?? [];
  return sessionStart.reduce((count, entry) => {
    const hooks = Array.isArray(entry.hooks) ? entry.hooks : [];
    return count + hooks.filter(hook => hook?.command?.includes('vault-context.sh')).length;
  }, 0);
}

function cli(args, cwd) {
  return spawnSync(process.execPath, [join(ROOT, 'bin', 'cli.js'), ...args], {
    cwd,
    encoding: 'utf8',
  });
}

/** Initialise un vault de test et retourne le chemin racine. */
function initTestVault() {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-vault-'));
  const r = cli(['vault', 'init', '--cwd', dir], dir);
  if (r.status !== 0) throw new Error(`vault init a échoué: ${r.stderr}`);
  return dir;
}

console.log('\n── claude-atelier vault ──');

test('vault init crée les fichiers attendus', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-vault-'));
  try {
    const r = cli(['vault', 'init', '--cwd', dir], dir);
    ok(r.status === 0, `exit 0 attendu, reçu ${r.status}: ${r.stderr}`);
    for (const name of ['PETER.md', '00-brief.md', '10-mailbox.md', '20-decisions.md', '30-discoveries.md', '40-roadmap.md', '90-sources.md']) {
      ok(existsSync(join(dir, 'vault', name)), `${name} doit exister`);
    }
    const peter = readFileSync(join(dir, 'vault', 'PETER.md'), 'utf8');
    ok(peter.includes('Peter maintient le vault dynamique'), 'charte Peter attendue');
    ok(existsSync(join(dir, 'hooks', 'vault-context.sh')), 'hook Peter doit être copié dans le projet');
    const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'));
    ok(JSON.stringify(settings).includes('vault-context.sh'), 'settings doit installer le hook Peter');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault init est idempotent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-vault-'));
  try {
    cli(['vault', 'init', '--cwd', dir], dir);
    const r = cli(['vault', 'init', '--cwd', dir], dir);
    ok(r.status === 0, 'deuxième init doit passer');
    ok(r.stdout.includes('[SKIP]'), 'les fichiers existants doivent être skippés');
    const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'));
    ok(countPeterHooks(settings) === 1, `le hook Peter ne doit être installé qu'une seule fois`);
    ok(settings.hooks.SessionStart[0].hooks[0].command.includes('vault-context.sh'), 'le hook Peter doit rester dans SessionStart');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault status signale un vault absent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-vault-'));
  try {
    const r = cli(['vault', 'status', '--cwd', dir], dir);
    ok(r.status === 0, 'status sans vault doit passer');
    ok(r.stdout.includes('Aucun vault projet'), 'message vault absent attendu');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault report génère PETER_REPORT.md', () => {
  const dir = initTestVault();
  try {
    const r = cli(['vault', 'report', '--cwd', dir], dir);
    ok(r.status === 0, `exit 0 attendu: ${r.stderr}`);
    const reportPath = join(dir, 'vault', 'PETER_REPORT.md');
    ok(existsSync(reportPath), 'PETER_REPORT.md doit exister');
    const content = readFileSync(reportPath, 'utf8');
    ok(content.includes('# PETER_REPORT'), 'titre PETER_REPORT attendu');
    ok(content.includes('## Bureau préparé'), 'section Bureau préparé attendue');
    ok(content.includes('## Décisions actives'), 'section Décisions actives attendue');
    ok(content.includes('## Roadmap — Sur le feu'), 'section Roadmap attendue');
    ok(content.includes('## Mailbox à traiter'), 'section Mailbox attendue');
    ok(content.includes('## Prochaine action recommandée'), 'section Prochaine action attendue');
    ok(content.includes('- Fraîcheur : OK'), 'fraîcheur OK attendue sur vault frais');
    ok(r.stdout.includes('PETER_REPORT.md généré'), 'message succès attendu');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault report extrait projet/phase depuis 00-brief.md', () => {
  const dir = initTestVault();
  try {
    const briefPath = join(dir, 'vault', '00-brief.md');
    const brief = readFileSync(briefPath, 'utf8')
      .replace('- Projet : à compléter.', '- Projet : claude-atelier-test')
      .replace('- Phase : à compléter.', '- Phase : Phase 2');
    writeFileSync(briefPath, brief, 'utf8');

    cli(['vault', 'report', '--cwd', dir], dir);
    const content = readFileSync(join(dir, 'vault', 'PETER_REPORT.md'), 'utf8');
    ok(content.includes('- Projet : claude-atelier-test'), 'projet extrait depuis brief');
    ok(content.includes('- Phase : Phase 2'), 'phase extraite depuis brief');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault report extrait décisions depuis 20-decisions.md', () => {
  const dir = initTestVault();
  try {
    const decisionsPath = join(dir, 'vault', '20-decisions.md');
    writeFileSync(decisionsPath, `# Décisions projet\n\n## Décisions durables\n\n### 2026-05-01 — Utiliser Node.js\n\n- Contexte : choix de stack\n- Décision : Node.js pour les scripts\n- Conséquence : aucune\n- À revalider si : changement d'équipe\n`, 'utf8');

    cli(['vault', 'report', '--cwd', dir], dir);
    const content = readFileSync(join(dir, 'vault', 'PETER_REPORT.md'), 'utf8');
    ok(content.includes('2026-05-01 — Utiliser Node.js'), 'décision extraite dans le rapport');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault report limite à 5 décisions et prend les premières (comportement documenté)', () => {
  const dir = initTestVault();
  try {
    const decisionsPath = join(dir, 'vault', '20-decisions.md');
    // 7 décisions : les 5 premières doivent apparaître, la 6e et 7e non
    const entries = Array.from({ length: 7 }, (_, i) => {
      const n = i + 1;
      return `### 2026-0${n}-01 — Décision ${n}\n\n- Contexte : ctx\n- Décision : choix ${n}\n- Conséquence : aucune\n- À revalider si : jamais\n`;
    });
    writeFileSync(decisionsPath, `# Décisions projet\n\n## Décisions durables\n\n${entries.join('\n')}`, 'utf8');

    cli(['vault', 'report', '--cwd', dir], dir);
    const content = readFileSync(join(dir, 'vault', 'PETER_REPORT.md'), 'utf8');
    // Les 5 premières doivent figurer
    for (let i = 1; i <= 5; i++) {
      ok(content.includes(`Décision ${i}`), `décision ${i} doit figurer dans le rapport`);
    }
    // La 6e et 7e ne doivent pas figurer (slice(0,5))
    ok(!content.includes('Décision 6'), 'décision 6 ne doit pas figurer (limite 5)');
    ok(!content.includes('Décision 7'), 'décision 7 ne doit pas figurer (limite 5)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault report sans vault retourne exit 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-vault-'));
  try {
    const r = cli(['vault', 'report', '--cwd', dir], dir);
    ok(r.status === 1, `exit 1 attendu si pas de vault, reçu ${r.status}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault report --json retourne JSON valide', () => {
  const dir = initTestVault();
  try {
    const r = cli(['vault', 'report', '--cwd', dir, '--json'], dir);
    ok(r.status === 0, `exit 0 attendu: ${r.stderr}`);
    const result = JSON.parse(r.stdout);
    ok(result.ok === true, 'ok:true attendu');
    ok(typeof result.reportPath === 'string', 'reportPath attendu');
    ok(result.freshness === 'OK', 'freshness OK attendu');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault stale signale PETER_REPORT.md manquant', () => {
  const dir = initTestVault();
  try {
    const r = cli(['vault', 'stale', '--cwd', dir], dir);
    ok(r.status === 0, `exit 0 attendu: ${r.stderr}`);
    ok(r.stdout.includes('MANQUANT'), 'PETER_REPORT.md absent → statut MANQUANT attendu');
    ok(r.stdout.includes('vault report'), 'rappel de commande attendu');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault stale est OK après vault report', () => {
  const dir = initTestVault();
  try {
    cli(['vault', 'report', '--cwd', dir], dir);
    const r = cli(['vault', 'stale', '--cwd', dir], dir);
    ok(r.status === 0, `exit 0 attendu: ${r.stderr}`);
    ok(!r.stdout.includes('MANQUANT'), 'pas de MANQUANT après vault report');
    ok(r.stdout.includes('Vault à jour'), 'message Vault à jour attendu');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault stale détecte un brief stale', () => {
  const dir = initTestVault();
  try {
    const briefPath = join(dir, 'vault', '00-brief.md');
    // Simuler un fichier vieux de 8 jours (seuil = 7)
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    utimesSync(briefPath, oldDate, oldDate);

    const r = cli(['vault', 'stale', '--cwd', dir], dir);
    ok(r.status === 0, `exit 0 attendu: ${r.stderr}`);
    ok(r.stdout.includes('00-brief.md'), 'fichier brief dans la sortie');
    ok(r.stdout.includes('STALE'), 'statut STALE attendu');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault stale --json retourne JSON valide', () => {
  const dir = initTestVault();
  try {
    const r = cli(['vault', 'stale', '--cwd', dir, '--json'], dir);
    ok(r.status === 0, `exit 0 attendu: ${r.stderr}`);
    const result = JSON.parse(r.stdout);
    ok(result.ok === true, 'ok:true attendu');
    ok(Array.isArray(result.checks), 'checks array attendu');
    ok(result.checks.length >= 3, 'au moins 3 checks (brief, roadmap, report)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vault stale sans vault retourne exit 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atelier-vault-'));
  try {
    const r = cli(['vault', 'stale', '--cwd', dir], dir);
    ok(r.status === 1, `exit 1 attendu si pas de vault, reçu ${r.status}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const total = pass + fail;
console.log(`\n── Vault : ${pass}/${total} tests passés${fail > 0 ? ` · ${fail} ÉCHECS` : ''} ──\n`);
if (fail > 0) process.exit(1);
