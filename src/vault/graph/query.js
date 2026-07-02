// src/vault/graph/query.js — graph querying and scoring

function scoreNode(node, tokens) {
  const haystack = [node.id, node.label || '', ...(node.tags || []), node.excerpt || '']
    .join(' ')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  let score = 0;
  for (const token of tokens) {
    const count = haystack.split(token).length - 1;
    if (count > 0) score += count;
  }
  return score;
}

// Estime les tokens consommés par une chaîne (heuristique simple : 1 token ~= 4 caractères)
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

function queryGraph(graph, queryText, limit = 10, tier = 'index') {
  const tokens = (queryText || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .filter(t => t.length >= 2);

  if (!tokens.length) return { ok: true, results: [], neighbors: [] };

  const scored = (graph.nodes || [])
    .map(n => ({ node: n, score: scoreNode(n, tokens) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const resultIds = new Set(scored.map(r => r.node.id));
  const neighborIds = new Set();
  for (const edge of (graph.edges || [])) {
    if (resultIds.has(edge.from) && !resultIds.has(edge.to)) neighborIds.add(edge.to);
    if (resultIds.has(edge.to) && !resultIds.has(edge.from)) neighborIds.add(edge.from);
  }

  // Normaliser le tier
  const validTiers = ['index', 'summary', 'full'];
  const normalizedTier = validTiers.includes(tier) ? tier : 'index';

  // Projette les résultats selon le tier demandé
  const results = scored.map(r => {
    const base = {
      id: r.node.id,
      label: r.node.label,
      score: r.score,
      path: r.node.path || '',
    };

    if (normalizedTier === 'index') {
      // Index tier : id, label, score, path (léger, ~40 tokens)
      return base;
    } else if (normalizedTier === 'summary') {
      // Summary tier : + excerpt, tags (PAS type)
      return {
        ...base,
        excerpt: r.node.excerpt || '',
        tags: r.node.tags || [],
      };
    } else {
      // Full tier : + type, excerpt, tags, mtime
      return {
        ...base,
        type: r.node.type,
        excerpt: r.node.excerpt || '',
        tags: r.node.tags || [],
      };
    }
  });

  return {
    ok: true,
    results,
    neighbors: [...neighborIds].slice(0, 10).map(id => id.split(':').pop()),
    tier: normalizedTier,
    tokenEstimate: Math.ceil(JSON.stringify(results).length / 4),
  };
}

export { scoreNode, queryGraph };
