Lance `node bin/cli.js features` (ou `npx claude-atelier features` hors repo source) et affiche le résultat complet du tableau de contrôle des features claude-atelier.

Si l'utilisateur demande à modifier une feature, exécute la commande correspondante :
- Activer : `node bin/cli.js features --on <feature>`
- Désactiver : `node bin/cli.js features --off <feature>`
- Basculer : `node bin/cli.js features --toggle <feature>`
- Réinitialiser : `node bin/cli.js features --reset`

Après chaque modification, rappelle que Claude Code doit être relancé pour appliquer le changement.
