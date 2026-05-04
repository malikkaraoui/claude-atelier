#!/usr/bin/env node
/**
 * bin/heartbeat.js — claude-atelier heartbeat
 *
 * Surveille le telegram bridge en continu et le redémarre si mort.
 * Garantit que Claude ne dort jamais.
 *
 * Usage:
 *   npx claude-atelier heartbeat start   → lance le watchdog en background
 *   npx claude-atelier heartbeat stop    → stoppe le watchdog
 *   npx claude-atelier heartbeat status  → état watchdog + bridge + dernier log
 *   npx claude-atelier heartbeat logs    → affiche les dernières lignes du log
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const HEARTBEAT_PID_FILE = '/tmp/claude-atelier-heartbeat.pid';
const TELEGRAM_PID_FILE  = '/tmp/claude-atelier-telegram.pid';
const LOG_FILE           = '/tmp/claude-atelier-heartbeat.log';
const WATCHDOG_SCRIPT    = join(ROOT, 'scripts', 'heartbeat-watchdog.sh');

function readPid(path) {
  try { return parseInt(readFileSync(path, 'utf8').trim(), 10); } catch { return null; }
}

function isAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function runStart() {
  const existingPid = readPid(HEARTBEAT_PID_FILE);
  if (isAlive(existingPid)) {
    process.stdout.write(`[heartbeat] déjà actif (PID: ${existingPid})\n`);
    return 0;
  }

  const child = spawn('bash', [WATCHDOG_SCRIPT], {
    detached: true,
    stdio: 'ignore',
    cwd: ROOT,
  });
  child.unref();
  writeFileSync(HEARTBEAT_PID_FILE, `${child.pid}\n`, 'utf8');
  process.stdout.write(`[heartbeat] watchdog démarré (PID: ${child.pid})\n`);
  process.stdout.write(`[heartbeat] logs: ${LOG_FILE}\n`);
  return 0;
}

function runStop() {
  const pid = readPid(HEARTBEAT_PID_FILE);
  if (!isAlive(pid)) {
    process.stderr.write('[heartbeat] watchdog non actif\n');
    try { unlinkSync(HEARTBEAT_PID_FILE); } catch {}
    return 1;
  }
  try {
    process.kill(pid, 'SIGTERM');
    unlinkSync(HEARTBEAT_PID_FILE);
    process.stdout.write(`[heartbeat] watchdog arrêté (PID: ${pid})\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`[heartbeat] erreur stop: ${err.message}\n`);
    return 1;
  }
}

function runStatus() {
  const hbPid   = readPid(HEARTBEAT_PID_FILE);
  const tgPid   = readPid(TELEGRAM_PID_FILE);
  const hbAlive = isAlive(hbPid);
  const tgAlive = isAlive(tgPid);

  const hbLine = hbAlive ? `✅ actif (PID ${hbPid})` : '❌ arrêté';
  const tgLine = tgAlive ? `✅ actif (PID ${tgPid})` : '❌ arrêté';

  process.stdout.write(`Watchdog heartbeat : ${hbLine}\n`);
  process.stdout.write(`Telegram bridge    : ${tgLine}\n`);

  // Dernière ligne de log
  if (existsSync(LOG_FILE)) {
    try {
      const lines = readFileSync(LOG_FILE, 'utf8').trim().split('\n');
      const last = lines[lines.length - 1];
      if (last) process.stdout.write(`Dernier log        : ${last}\n`);
    } catch {}
  }

  if (!hbAlive) {
    process.stdout.write('\nDémarre avec : npx claude-atelier heartbeat start\n');
  }
  return hbAlive && tgAlive ? 0 : 1;
}

function runLogs() {
  if (!existsSync(LOG_FILE)) {
    process.stderr.write('[heartbeat] aucun log disponible\n');
    return 1;
  }
  try {
    const lines = readFileSync(LOG_FILE, 'utf8').trim().split('\n');
    lines.slice(-30).forEach(l => process.stdout.write(l + '\n'));
    return 0;
  } catch (err) {
    process.stderr.write(`[heartbeat] erreur lecture log: ${err.message}\n`);
    return 1;
  }
}

function main(argv) {
  const cmd = argv[2] ?? 'status';
  switch (cmd) {
    case 'start':  return runStart();
    case 'stop':   return runStop();
    case 'status': return runStatus();
    case 'logs':   return runLogs();
    default:
      process.stderr.write(`[heartbeat] commande inconnue: ${cmd}\n`);
      process.stderr.write('commandes: start, stop, status, logs\n');
      return 1;
  }
}

process.exit(main(process.argv));
