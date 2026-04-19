#!/usr/bin/env node
/**
 * claude-atelier features — Tableau de contrôle des features
 *
 * Usage:
 *   claude-atelier features                    # affiche le tableau
 *   claude-atelier features --on  <feature>    # active
 *   claude-atelier features --off <feature>    # désactive
 *   claude-atelier features --toggle <feature> # bascule
 *   claude-atelier features --reset            # restaure les défauts
 *   claude-atelier features --global           # cible ~/.claude/features.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT  = join(__dirname, '..');

const GREEN = '\x1b[0;32m';
const RED   = '\x1b[0;31m';
const YELLOW= '\x1b[0;33m';
const CYAN  = '\x1b[0;36m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const NC    = '\x1b[0m';

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadRegistry() {
  return JSON.parse(readFileSync(join(PKG_ROOT, 'src', 'features-registry.json'), 'utf8'));
}

function resolveFeaturesPath(global) {
  if (global) return join(homedir(), '.claude', 'features.json');
  // Walk up from cwd looking for .claude/
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const p = join(dir, '.claude', 'features.json');
    if (existsSync(p)) return p;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.cwd(), '.claude', 'features.json');
}

function loadFeatures(path) {
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch (_) { return {}; }
}

function saveFeatures(path, features) {
  const d = dirname(path);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  writeFileSync(path, JSON.stringify(features, null, 2) + '\n');
}

function isEnabled(features, registry, id) {
  if (id in features) return features[id];
  return registry.features[id]?.default ?? true;
}

// ── Display ───────────────────────────────────────────────────────────────────

function display(registry, features, featuresPath) {
  const exists = existsSync(featuresPath);
  const label  = exists ? featuresPath : `${featuresPath} ${DIM}(sera créé à la première modification)${NC}`;

  console.log(`\n${BOLD}claude-atelier — Tableau de contrôle des features${NC}`);
  console.log(`${DIM}Config : ${label}${NC}\n`);

  for (const [, group] of Object.entries(registry.groups)) {
    console.log(`${CYAN}${group.label}${NC}`);
    console.log('─'.repeat(68));

    const maxLen = Math.max(...group.features.map(f => f.length));
    for (const id of group.features) {
      const feat = registry.features[id];
      if (!feat) continue;
      const on      = isEnabled(features, registry, id);
      const status  = on ? `${GREEN}✅ ON ${NC}` : `${RED}❌ OFF${NC}`;
      const defMark = !(id in features) ? ` ${DIM}(défaut)${NC}` : '';
      console.log(`  ${id.padEnd(maxLen + 2)}  ${status}  ${feat.description}${defMark}`);
    }
    console.log('');
  }

  console.log(`${DIM}Commandes :${NC}`);
  console.log(`  ${CYAN}npx claude-atelier features --on  <feature>${NC}`);
  console.log(`  ${CYAN}npx claude-atelier features --off <feature>${NC}`);
  console.log(`  ${CYAN}npx claude-atelier features --toggle <feature>${NC}`);
  console.log(`  ${CYAN}npx claude-atelier features --reset${NC}         (restaure tous les défauts)`);
  console.log(`  ${CYAN}npx claude-atelier features --global${NC}        (cible ~/.claude/features.json)\n`);

  console.log(`${YELLOW}💡 Conseil :${NC} désactivez ${CYAN}review_copilot${NC} en début de projet (build from scratch),`);
  console.log(`   réactivez-le quand le codebase grossit pour garder la qualité.\n`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function runFeatures(argv) {
  const args        = argv.slice(2).filter(a => a !== 'features');
  const isGlobal    = args.includes('--global');
  const featuresPath= resolveFeaturesPath(isGlobal);
  const registry    = loadRegistry();
  let features      = loadFeatures(featuresPath);

  // --reset
  if (args.includes('--reset')) {
    saveFeatures(featuresPath, {});
    console.log(`${GREEN}✅ Features réinitialisées aux défauts${NC} — ${featuresPath}`);
    console.log(`${YELLOW}⚡ Relancez Claude Code pour appliquer.${NC}`);
    return 0;
  }

  // --on / --off / --toggle
  for (const flag of ['--on', '--off', '--toggle']) {
    const idx = args.indexOf(flag);
    if (idx === -1) continue;

    const id = args[idx + 1];
    if (!id || !registry.features[id]) {
      const all = Object.keys(registry.features).join(', ');
      process.stderr.write(`${RED}error${NC}: feature inconnue "${id || '(manquante)'}"\n`);
      process.stderr.write(`Features disponibles : ${all}\n`);
      return 1;
    }

    const current = isEnabled(features, registry, id);
    const newVal  = flag === '--toggle' ? !current : flag === '--on';

    if (newVal === registry.features[id].default && !(id in features)) {
      console.log(`${DIM}${id} est déjà à sa valeur par défaut (${newVal ? 'ON' : 'OFF'}) — aucun changement.${NC}`);
      return 0;
    }

    // Si la nouvelle valeur = défaut, on supprime la clé (revient au défaut)
    if (newVal === registry.features[id].default) {
      delete features[id];
    } else {
      features[id] = newVal;
    }

    saveFeatures(featuresPath, features);
    const statusStr = newVal ? `${GREEN}✅ ON ${NC}` : `${RED}❌ OFF${NC}`;
    console.log(`${statusStr}  ${id}`);
    console.log(`${DIM}Sauvegardé : ${featuresPath}${NC}`);
    console.log(`${YELLOW}⚡ Relancez Claude Code pour appliquer.${NC}`);
    return 0;
  }

  // Affichage par défaut
  display(registry, features, featuresPath);
  return 0;
}
