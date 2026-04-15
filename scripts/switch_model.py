#!/usr/bin/env python3
"""
scripts/switch_model.py — Injecte /model <alias> dans la session Claude Code active.

Stratégie automatique par ordre de priorité :
  1. tmux disponible  → tmux send-keys (terminal)
  2. osascript (macOS) → simulation clavier dans VS Code (nécessite Accessibilité)
  3. Aucun            → erreur explicite

Usage:
    python3 scripts/switch_model.py <model> [pane_tmux]

Modèles valides : opus | sonnet | haiku | opusplan

Prérequis macOS (une seule fois) :
    Réglages système → Confidentialité → Accessibilité → autoriser Terminal (ou VS Code)
"""

import shutil
import subprocess
import sys

VALID_MODELS = ["opus", "sonnet", "haiku", "opusplan"]

# Programmes full-screen qui absorberaient l'injection de façon indésirable (tmux)
_UNSAFE_COMMANDS = {"vim", "nvim", "less", "man", "nano", "more", "vi"}


# ── Backend tmux ──────────────────────────────────────────────────────────────

def _pane_current_command(pane: str) -> str:
    r = subprocess.run(
        ["tmux", "display-message", "-p", "-t", pane, "#{pane_current_command}"],
        capture_output=True, text=True,
    )
    return r.stdout.strip() if r.returncode == 0 else ""


def _switch_via_tmux(model: str, pane: str) -> bool:
    current_cmd = _pane_current_command(pane)
    if current_cmd in _UNSAFE_COMMANDS:
        print(
            f"[ERROR] Pane '{pane}' est dans '{current_cmd}' — injection annulée. "
            "Quitte l'éditeur puis relance.",
            file=sys.stderr,
        )
        return False
    r = subprocess.run(
        ["tmux", "send-keys", "-t", pane, f"/model {model}", "Enter"],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print(f"[ERROR] tmux send-keys: {r.stderr.strip()}", file=sys.stderr)
        return False
    print(f"[OK] Switch → {model} injecté dans pane tmux '{pane}'")
    return True


# ── Backend osascript (macOS / VS Code) ───────────────────────────────────────

_OSASCRIPT_TEMPLATE = """\
tell application "Visual Studio Code" to activate
delay 0.4
tell application "System Events"
    tell process "Code"
        keystroke "/model {model}"
        key code 36
    end tell
end tell
"""


def _switch_via_osascript(model: str) -> bool:
    script = _OSASCRIPT_TEMPLATE.format(model=model)
    r = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    if r.returncode != 0:
        err = r.stderr.strip()
        if "not allowed" in err.lower() or "1002" in err or "-1719" in err or "-25211" in err or "saisies" in err:
            print(
                "[ERROR] Permissions Accessibilité manquantes.\n"
                "→ Réglages système → Confidentialité & Sécurité → Accessibilité\n"
                "→ Autoriser Terminal (ou l'application depuis laquelle tu lances ce script)",
                file=sys.stderr,
            )
        else:
            print(f"[ERROR] osascript: {err}", file=sys.stderr)
        return False
    print(f"[OK] Switch → {model} injecté via osascript (VS Code)")
    return True


# ── Point d'entrée ────────────────────────────────────────────────────────────

def switch_model(model: str, pane: str = "claude-session") -> bool:
    if model not in VALID_MODELS:
        print(
            f"[ERROR] Modèle '{model}' invalide. Valides : {VALID_MODELS}",
            file=sys.stderr,
        )
        return False

    if shutil.which("tmux"):
        return _switch_via_tmux(model, pane)

    if shutil.which("osascript"):
        return _switch_via_osascript(model)

    print(
        "[ERROR] Ni tmux ni osascript disponible — switch impossible.\n"
        "  tmux  : disponible en mode terminal\n"
        "  osascript : disponible sur macOS",
        file=sys.stderr,
    )
    return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/switch_model.py <model> [pane_tmux]", file=sys.stderr)
        print(f"Modèles valides : {VALID_MODELS}", file=sys.stderr)
        sys.exit(1)

    model = sys.argv[1]
    pane = sys.argv[2] if len(sys.argv) > 2 else "claude-session"

    sys.exit(0 if switch_model(model, pane) else 1)
