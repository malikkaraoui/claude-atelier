#!/usr/bin/env node
/**
 * test/validate-handoff.js — Validation structurelle d'un fichier handoff
 *
 * Critères (anti-triche, PAS par nombre de mots) :
 *   1. Frontmatter contient "Type :" et "Date :"
 *   2. Section "## De :" existe et contient une sous-section "### Question précise"
 *      avec au moins 50 caractères de texte
 *   3. Section "### Fichiers à lire" liste au moins 1 fichier (bloc de code)
 *   4. Section "## Réponse de :" contient au moins 100 caractères de texte
 *      DISTINCT du contenu template (détecté par hash)
 *      ET n'est PAS une auto-review Claude (bypass interdit)
 *   5. Section "## Intégration" contient au moins 100 caractères de texte
 *      DISTINCT du contenu template
 *
 * Usage:
 *   node test/validate-handoff.js <path/to/handoff.md>
 *   node test/validate-handoff.js --all       # valide tous les handoffs
 *
 * Exit : 0 = valide, 1 = invalide
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, join, basename, relative } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node test/validate-handoff.js <path> | --all');
  process.exit(2);
}

// Hashes des blocs template à rejeter
const TEMPLATE_MARKERS = [
  'INSTRUCTION POUR LE LLM QUI REPOND',
  'Rempli par le LLM d\'origine',
  'Rempli par Claude après avoir lu',
  "Réponse ci-dessous",
];

function extractSection(content, heading) {
  // Split par lignes de niveau ## et retrouve la section par heading
  const parts = content.split(/^## /m);
  for (const p of parts) {
    if (p.startsWith(heading)) return '## ' + p;
  }
  return '';
}

function stripTemplateContent(text) {
  let cleaned = text;
  // Retirer commentaires HTML
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  // Retirer les markers template connus (et leur paragraphe)
  for (const marker of TEMPLATE_MARKERS) {
    const re = new RegExp(`.*${marker.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}.*`, 'g');
    cleaned = cleaned.replace(re, '');
  }
  // Retirer les headings
  cleaned = cleaned.replace(/^#+\s.*$/gm, '');
  return cleaned.trim();
}

function gitOk(args) {
  const r = spawnSync('git', args, { cwd: ROOT, stdio: 'pipe' });
  return r.status === 0;
}

function gitStdout(args) {
  const r = spawnSync('git', args, { cwd: ROOT, stdio: 'pipe' });
  if (r.status !== 0) return '';
  return r.stdout.toString('utf8');
}

function gitRevParse(rev) {
  return gitStdout(['rev-parse', rev]).trim();
}

function extractReviewedRange(content) {
  return content.match(/^>\s*reviewedRange\s*:\s*([a-f0-9]{7,40})\.\.([a-f0-9]{7,40})\s*$/m);
}

function findFirstIntegratedCommit(filePath) {
  const relPath = relative(ROOT, filePath);
  const history = gitStdout(['log', '--format=%H', '--reverse', '--follow', '--', relPath])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const sha of history) {
    const fileAtCommit = gitStdout(['show', `${sha}:${relPath}`]);
    if (!fileAtCommit) continue;

    const integration = extractSection(fileAtCommit, 'Intégration');
    const integrationClean = stripTemplateContent(integration);
    if (integrationClean.length >= 100) return sha;
  }

  return '';
}

function validate(filePath) {
  const errors = [];
  if (!existsSync(filePath)) {
    return { valid: false, errors: [`Fichier absent : ${filePath}`] };
  }
  const content = readFileSync(filePath, 'utf8');

  if (!/^>\s*Date\s*:/m.test(content)) errors.push('Frontmatter "> Date :" manquant');
  if (!/^>\s*Type\s*:/m.test(content)) errors.push('Frontmatter "> Type :" manquant');

  // reviewedRange : format <sha>..<sha>, les 2 shas doivent exister dans git
  const rangeMatch = extractReviewedRange(content);
  if (!rangeMatch) {
    errors.push('Frontmatter "> reviewedRange: <sha>..<sha>" manquant ou malformé');
  } else {
    const [, fromSha, toSha] = rangeMatch;
    if (!gitOk(['cat-file', '-e', `${fromSha}^{commit}`])) errors.push(`reviewedRange from-sha ${fromSha} introuvable dans git`);
    if (!gitOk(['cat-file', '-e', `${toSha}^{commit}`])) errors.push(`reviewedRange to-sha ${toSha} introuvable dans git`);
    if (!gitOk(['merge-base', '--is-ancestor', fromSha, toSha])) {
      errors.push(`reviewedRange invalide : ${fromSha} n'est pas un ancêtre de ${toSha}`);
    }

    const firstIntegratedCommit = findFirstIntegratedCommit(filePath);
    const resolvedToSha = gitRevParse(toSha);
    if (!firstIntegratedCommit) {
      errors.push('Impossible de déterminer le premier commit d’intégration réel de ce handoff');
    } else if (firstIntegratedCommit !== resolvedToSha) {
      errors.push(`reviewedRange to-sha ${toSha} doit être ancré au premier commit d’intégration réel ${firstIntegratedCommit}`);
    }
  }

  const deSection = extractSection(content, 'De :');
  if (!deSection) errors.push('Section "## De :" manquante');

  const question = deSection.match(/### Question précise[\s\S]*?(?=###|\Z)/);
  if (!question || stripTemplateContent(question[0]).length < 50) {
    errors.push('### Question précise absente ou < 50 caractères réels');
  }

  const files = deSection.match(/### Fichiers à lire[\s\S]*?(?=###|\Z)/);
  if (!files || !files[0].match(/```/)) {
    errors.push('### Fichiers à lire doit contenir un bloc de code avec fichiers');
  }

  const reponse = extractSection(content, 'Réponse de :');
  const reponseClean = stripTemplateContent(reponse);
  if (reponseClean.length < 100) {
    errors.push(`## Réponse de : trop courte (${reponseClean.length} chars réels, min 100)`);
  }
  // Anti-bypass : auto-review Claude interdite — reviewer doit être externe
  const reponseHeading = reponse.match(/^## Réponse de\s*:\s*(.*)$/m)?.[1]?.trim() || '';
  const SELF_REVIEW_PATTERN = /\b(claude|sonnet|opus|haiku|auto-review|auto_review)\b/i;
  if (reponseHeading && SELF_REVIEW_PATTERN.test(reponseHeading)) {
    errors.push(`Auto-review Claude interdite ("${reponseHeading}") — utilise \`npx claude-atelier review-local\` pour une review Ollama`);
  }

  const integration = extractSection(content, 'Intégration');
  const integrationClean = stripTemplateContent(integration);
  if (integrationClean.length < 100) {
    errors.push(`## Intégration trop courte (${integrationClean.length} chars réels, min 100)`);
  }

  return { valid: errors.length === 0, errors, checksum: createHash('sha256').update(content).digest('hex').slice(0, 12) };
}

let targets = [];
if (args[0] === '--all') {
  const dir = join(ROOT, 'docs', 'handoffs');
  targets = readdirSync(dir)
    .filter((f) => f.match(/^202.*\.md$/) && !f.includes('_template'))
    .map((f) => join(dir, f));
} else {
  targets = [resolve(args[0])];
}

let failures = 0;
for (const t of targets) {
  const r = validate(t);
  const name = basename(t);
  if (r.valid) {
    console.log(`OK    ${name}  (sha256: ${r.checksum})`);
  } else {
    console.log(`FAIL  ${name}`);
    r.errors.forEach((e) => console.log(`      - ${e}`));
    failures++;
  }
}

if (failures > 0) {
  console.log(`\n${failures} handoff(s) invalide(s) sur ${targets.length}`);
  process.exit(1);
}
console.log(`\n${targets.length} handoff(s) valide(s)`);
