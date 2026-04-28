// src/pulse/write.js
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCHEMA_VERSION } from './parse.js';

export function serialisePoulsMd(data, body) {
  const yaml = [
    `schema: ${SCHEMA_VERSION}`,
    `agent:`,
    `  id: "${data.agent.id}"`,
    `  name: "${data.agent.name}"`,
    `  role: "${data.agent.role}"`,
    `  provider: "${data.agent.provider}"`,
    ``,
    `status: "${data.status}"`,
    `lastPulse: "${data.lastPulse}"`,
    `ttl: ${data.ttl}`,
    ``,
    `phase: "${data.phase}"`,
    `intensity:`,
    `  current: ${Number(data.intensity.current).toFixed(2)}`,
    `  ceiling: ${Number(data.intensity.ceiling).toFixed(2)}`,
    ``,
    `lang: "${data.lang}"`,
  ].join('\n');

  return `---\n${yaml}\n---\n\n${body ?? ''}\n`;
}

export function writePoulsMd(filePath, data, body) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, serialisePoulsMd(data, body), 'utf8');
}
