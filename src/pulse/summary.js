import { isExpired } from './parse.js';

export function computePulseSummary(agents = []) {
  let active = 0;
  let topIntensity = 0;
  let topStatus = 'idle';

  for (const agent of agents) {
    if (!agent || isExpired(agent)) continue;

    active++;

    const intensity = Number(agent.intensity?.current ?? 0);
    if (intensity > topIntensity) {
      topIntensity = intensity;
      topStatus = agent.status ?? 'idle';
    }
  }

  return {
    active,
    topIntensity,
    topStatus,
  };
}