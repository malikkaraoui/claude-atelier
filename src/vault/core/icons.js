// src/vault/core/icons.js — Icon classification for vault observations

/**
 * Default icon mapping by type
 */
const ICON_MAP = {
  decision: '🟤',           // Decisions durables (default)
  discovery: '🟣',          // Découvertes (default)
  vault_file: '📄',
  roadmap_item: '🎯',
  risk: '⚠️',
  question: '❓',
  project: '📦',
  concept: '💡',
  doc_category: '📚',
  markdown_document: '📝',
  protected_artifact: '🔒',
};

/**
 * classifyIcon(node) → icon string
 *
 * Heuristic classification based on node type and excerpt/title patterns.
 * Applied in order:
 *   1. Regex patterns for critical signals (gotcha, bug, trade-off, etc.)
 *   2. Default by type
 */
function classifyIcon(node) {
  if (!node) return '❓';

  const excerpt = (node.excerpt || '').toLowerCase();
  const label = (node.label || '').toLowerCase();
  const combined = `${label} ${excerpt}`;

  // Critical gotcha / bug / blocker — must be first
  if (/🔴|bug|critique|cassé|bloquer|invalide|révoque|faux|erreur|bloquant/i.test(combined)) {
    return '🔴';
  }

  // Specific accomplishment: explicitly "livré", "shipped", "merged", "déployed"
  if (/livré|shipped|merged|déployed|release/i.test(combined)) {
    return '🟢';
  }

  // Pattern / gotcha réutilisable / design insight — before broad technical patterns
  if (/gotcha|pattern|réutilisable|apprentissage|lesson|insight|anti-pattern/i.test(combined)) {
    return '🔵';
  }

  // Trade-off / decision point
  if (/trade\s*[-‐–—]?off|vs\s|ou\s|trade|compromise|tradeoff/i.test(combined)) {
    return '⚖️';
  }

  // Raison / pourquoi / explication causale
  if (/raison|pourquoi|cause|explication|rationale|justification|motif/i.test(combined)) {
    return '🟠';
  }

  // Problème / solution / fix
  if (/problème|problème-solution|issue|fix|solution|repair/i.test(combined)) {
    return '🟡';
  }

  // Broad technical patterns (low priority, easy false positives)
  if (/fonctionnement|implementation|detail|spécifications|comportement/i.test(combined)) {
    return '🔵';
  }

  // Default by type
  return ICON_MAP[node.type] || '❓';
}

export { ICON_MAP, classifyIcon };
