/**
 * Génère la section `hooks` du settings.json.
 *
 * `hooksRef`/`scriptsRef` sont des PRÉFIXES de commande, jamais des chemins
 * absolus gravés :
 *   - projet  → `${CLAUDE_PROJECT_DIR}/hooks` (résolu par Claude Code au
 *     lancement → insensible au renommage/déplacement du dossier projet) ;
 *   - global  → `~/.claude/hooks` absolu (jamais déplacé).
 *
 * Chaque commande embarque une garde runtime : si le script est absent, le
 * hook sort en exit 0 silencieux (aucune erreur de hook au démarrage). Le
 * chemin est passé en `$0` → tolérant aux espaces (« Claude Atelier »).
 */
export function generateHooksSection(hooksRef, scriptsRef) {
  const h = name => `bash -c '[ -f "$0" ] && exec bash "$0" || exit 0' "${hooksRef}/${name}"`;
  const n = (name, ...args) => {
    const tail = args.length ? ' ' + args.join(' ') : '';
    return `bash -c '[ -f "$0" ] && exec node "$0" "$@" || exit 0' "${scriptsRef}/${name}"${tail}`;
  };
  return {
    SessionStart: [{
      matcher: '',
      hooks: [
        { type: 'command', command: h('session-model.sh') },
        { type: 'command', command: h('vault-context.sh') },
        { type: 'command', command: n('memory-read.js', '--episodes-only', '--timeout', '2000') },
      ],
    }],
    UserPromptSubmit: [{
      matcher: '',
      hooks: [
        { type: 'command', command: h('routing-check.sh') },
        { type: 'command', command: h('model-metrics.sh') },
        { type: 'command', command: h('detect-design-need.sh') },
        { type: 'command', command: n('memory-read.js', '--context', '--timeout', '2000') },
      ],
    }],
    PreToolUse: [
      {
        matcher: 'Read',
        hooks: [{ type: 'command', command: h('guard-qmd-first.sh') }],
      },
      {
        matcher: 'Bash',
        hooks: [
          { type: 'command', command: h('guard-no-sign.sh'), if: 'Bash(*git commit*)' },
          { type: 'command', command: h('guard-commit-french.sh'), if: 'Bash(*git commit*)' },
          { type: 'command', command: h('guard-tests-before-push.sh'), if: 'Bash(*git push*)' },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: 'Edit|Write',
        hooks: [{ type: 'command', command: h('guard-hooks-reload.sh') }],
      },
      {
        matcher: 'Bash',
        hooks: [
          { type: 'command', command: h('guard-review-auto.sh'), if: 'Bash(*git commit*)' },
          { type: 'command', command: h('guard-anti-loop.sh') },
        ],
      },
    ],
  };
}
