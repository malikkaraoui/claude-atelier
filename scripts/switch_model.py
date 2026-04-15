#!/usr/bin/env python3
"""
scripts/switch_model.py — Injecte /model <alias> dans le pane tmux cible.

Usage:
    python3 scripts/switch_model.py <model> [pane]

Modèles valides : opus | sonnet | haiku | opusplan
Pane            : ID ou nom de fenêtre tmux (défaut : claude-session)

Exemples:
    python3 scripts/switch_model.py sonnet
    python3 scripts/switch_model.py opus 0:0.0
    python3 scripts/switch_model.py haiku my-window

Identifier les panes disponibles :
    tmux list-panes -a
    tmux rename-window "claude-session"
"""

import subprocess
import sys

VALID_MODELS = ["opus", "sonnet", "haiku", "opusplan"]


def switch_model(model: str, pane: str = "claude-session") -> bool:
    if model not in VALID_MODELS:
        print(
            f"[ERROR] Modèle '{model}' invalide. Valides : {VALID_MODELS}",
            file=sys.stderr,
        )
        return False

    result = subprocess.run(
        ["tmux", "send-keys", "-t", pane, f"/model {model}", "Enter"],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(
            f"[ERROR] tmux send-keys failed : {result.stderr.strip()}",
            file=sys.stderr,
        )
        return False

    print(f"[OK] Switch → {model} injecté dans pane '{pane}'")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/switch_model.py <model> [pane]", file=sys.stderr)
        print(f"Modèles valides : {VALID_MODELS}", file=sys.stderr)
        sys.exit(1)

    model = sys.argv[1]
    pane = sys.argv[2] if len(sys.argv) > 2 else "claude-session"

    success = switch_model(model, pane)
    sys.exit(0 if success else 1)
