#!/usr/bin/env python3
"""
Telegram Bridge for claude-atelier — Phase A (text only)
Bidirectional Telegram ↔ Claude CLI communication with session management,
rate limiting, cost tracking, and Peter vault integration.
"""

import asyncio
import json
import logging
import os
import sqlite3
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from collections import defaultdict

from dotenv import load_dotenv
from telegram import Update, Chat
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

load_dotenv()

# ============================================================================
# Configuration
# ============================================================================

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = int(os.getenv("TELEGRAM_CHAT_ID", "0"))
ALLOWED_USERS = set(map(int, os.getenv("ALLOWED_USERS", "").split(","))) if os.getenv("ALLOWED_USERS") else set()
APPROVED_DIRECTORY = os.getenv("APPROVED_DIRECTORY", os.path.expanduser("~"))

CLAUDE_MAX_TURNS = int(os.getenv("CLAUDE_MAX_TURNS", "20"))
CLAUDE_TIMEOUT_SECONDS = int(os.getenv("CLAUDE_TIMEOUT_SECONDS", "300"))
CLAUDE_MAX_COST_USD = float(os.getenv("CLAUDE_MAX_COST_USD", "50.0"))

RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "3600"))

VAULT_INBOX = os.getenv("VAULT_INBOX", "vault/.peter/inbox/telegram")
VAULT_WRITE_ENABLED = os.getenv("VAULT_WRITE_ENABLED", "true").lower() == "true"

DB_PATH = os.path.expanduser("~/.claude/telegram-bridge.db")
FIFO_PATH = "/tmp/claude-telegram-out"

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


# ============================================================================
# Database & Session Management
# ============================================================================

class SessionManager:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._ensure_db()

    def _ensure_db(self):
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                user_id INTEGER,
                project_dir TEXT,
                session_id TEXT,
                created_at TIMESTAMP,
                last_activity TIMESTAMP,
                total_cost_usd REAL DEFAULT 0.0,
                PRIMARY KEY (user_id, project_dir)
            )
        """)
        conn.commit()
        conn.close()

    def get_or_create(self, user_id: int, project_dir: str) -> Dict[str, Any]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()

        cursor.execute(
            "SELECT session_id, total_cost_usd FROM sessions WHERE user_id = ? AND project_dir = ?",
            (user_id, project_dir)
        )
        row = cursor.fetchone()

        if row:
            session_id, cost = row
            cursor.execute(
                "UPDATE sessions SET last_activity = ? WHERE user_id = ? AND project_dir = ?",
                (now, user_id, project_dir)
            )
            conn.commit()
            conn.close()
            return {"session_id": session_id, "total_cost_usd": cost, "created_at": row}

        session_id = f"{user_id}_{int(time.time())}_{os.urandom(4).hex()}"
        cursor.execute(
            "INSERT INTO sessions (user_id, project_dir, session_id, created_at, last_activity, total_cost_usd) "
            "VALUES (?, ?, ?, ?, ?, 0.0)",
            (user_id, project_dir, session_id, now, now)
        )
        conn.commit()
        conn.close()
        return {"session_id": session_id, "total_cost_usd": 0.0, "created_at": now}

    def update_cost(self, user_id: int, project_dir: str, delta_cost: float):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute(
            "UPDATE sessions SET total_cost_usd = total_cost_usd + ?, last_activity = ? "
            "WHERE user_id = ? AND project_dir = ?",
            (delta_cost, now, user_id, project_dir)
        )
        conn.commit()
        conn.close()

    def get_session(self, user_id: int, project_dir: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT session_id, total_cost_usd, created_at, last_activity FROM sessions "
            "WHERE user_id = ? AND project_dir = ?",
            (user_id, project_dir)
        )
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "session_id": row[0],
                "total_cost_usd": row[1],
                "created_at": row[2],
                "last_activity": row[3]
            }
        return None


# ============================================================================
# Rate Limiter
# ============================================================================

class RateLimiter:
    def __init__(self, requests: int = RATE_LIMIT_REQUESTS, window: int = RATE_LIMIT_WINDOW):
        self.requests = requests
        self.window = window
        self.tokens: Dict[int, list] = defaultdict(list)

    def is_allowed(self, user_id: int) -> bool:
        now = time.time()
        self.tokens[user_id] = [t for t in self.tokens[user_id] if now - t < self.window]

        if len(self.tokens[user_id]) < self.requests:
            self.tokens[user_id].append(now)
            return True
        return False


# ============================================================================
# Claude Runner
# ============================================================================

class ClaudeRunner:
    def __init__(self, cwd: str = APPROVED_DIRECTORY):
        self.cwd = cwd
        self.current_process: Optional[subprocess.Popen] = None
        self.turn_count = 0

    async def run_command(self, command: str) -> tuple[str, float]:
        """
        Run a Claude CLI command and return output + estimated cost.
        Timeout after CLAUDE_TIMEOUT_SECONDS.
        """
        if self.turn_count >= CLAUDE_MAX_TURNS:
            return f"Max turns ({CLAUDE_MAX_TURNS}) reached", 0.0

        self.turn_count += 1
        estimated_cost = 0.01  # Placeholder: would parse actual metrics

        try:
            result = await asyncio.wait_for(
                asyncio.create_subprocess_shell(
                    command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.cwd
                ),
                timeout=CLAUDE_TIMEOUT_SECONDS
            )
            self.current_process = result
            stdout, stderr = await result.communicate()
            output = stdout.decode() + (stderr.decode() if stderr else "")
            return output[:2000], estimated_cost  # Truncate for Telegram
        except asyncio.TimeoutError:
            if self.current_process:
                self.current_process.kill()
                await asyncio.sleep(0.1)
            self.turn_count = 0
            return f"Claude timeout after {CLAUDE_TIMEOUT_SECONDS}s", 0.0
        except Exception as e:
            logger.error(f"ClaudeRunner error: {e}")
            return f"Error running Claude: {str(e)}", 0.0

    def reset(self):
        self.turn_count = 0
        if self.current_process:
            self.current_process.kill()
            self.current_process = None


# ============================================================================
# FIFO Notification Handler
# ============================================================================

class NotificationFifo:
    def __init__(self, fifo_path: str = FIFO_PATH):
        self.fifo_path = fifo_path
        self._create_fifo()

    def _create_fifo(self):
        try:
            os.remove(self.fifo_path)
        except FileNotFoundError:
            pass
        try:
            os.mkfifo(self.fifo_path)
            logger.info(f"FIFO created: {self.fifo_path}")
        except FileExistsError:
            logger.info(f"FIFO already exists: {self.fifo_path}")

    async def watch_and_send(self, bot_application: Application, chat_id: int):
        """
        Monitor FIFO in background and send messages to Telegram.
        Non-blocking: reads line-by-line as they arrive.
        """
        await asyncio.sleep(1)  # Let application fully initialize
        try:
            with open(self.fifo_path, "r", buffering=1) as fifo:
                for line in fifo:
                    line = line.strip()
                    if line:
                        await bot_application.bot.send_message(
                            chat_id=chat_id,
                            text=line,
                            parse_mode="Markdown"
                        )
        except Exception as e:
            logger.error(f"FIFO watcher error: {e}")


# ============================================================================
# Peter Vault Integration
# ============================================================================

class InboxWriter:
    def __init__(self, vault_inbox: str = VAULT_INBOX, enabled: bool = VAULT_WRITE_ENABLED):
        self.vault_inbox = vault_inbox
        self.enabled = enabled

    def write(self, entry: Dict[str, Any]):
        if not self.enabled:
            return

        Path(self.vault_inbox).mkdir(parents=True, exist_ok=True)
        today = datetime.utcnow().strftime("%Y-%m-%d")
        inbox_file = Path(self.vault_inbox) / f"{today}.jsonl"

        try:
            with open(inbox_file, "a") as f:
                f.write(json.dumps(entry) + "\n")
            logger.debug(f"Inbox written: {inbox_file}")
        except Exception as e:
            logger.error(f"InboxWriter error: {e}")


# ============================================================================
# Path Validation
# ============================================================================

def validate_project_dir(path: str, approved_base: str = APPROVED_DIRECTORY) -> Optional[str]:
    """
    Validate that path:
    1. Is absolute and resolvable
    2. Doesn't escape approved_base via symlinks or ..
    3. Returns normalized path or None if invalid
    """
    try:
        resolved = os.path.realpath(os.path.expanduser(path))
        approved = os.path.realpath(approved_base)

        if not resolved.startswith(approved):
            logger.warning(f"Path escape attempt: {path} -> {resolved} (approved: {approved})")
            return None

        if not os.path.isdir(resolved):
            logger.warning(f"Path not a directory: {resolved}")
            return None

        return resolved
    except Exception as e:
        logger.error(f"validate_project_dir error: {e}")
        return None


# ============================================================================
# Telegram Bot Handlers
# ============================================================================

class TelegramBot:
    def __init__(self):
        self.session_mgr = SessionManager()
        self.rate_limiter = RateLimiter()
        self.claude_runners: Dict[int, ClaudeRunner] = {}
        self.notification_fifo = NotificationFifo()
        self.inbox_writer = InboxWriter()
        self.app: Optional[Application] = None

    async def _check_auth(self, user_id: int) -> bool:
        if ALLOWED_USERS and user_id not in ALLOWED_USERS:
            logger.warning(f"Unauthorized user: {user_id}")
            return False
        return True

    async def _check_ratelimit(self, user_id: int) -> bool:
        if not self.rate_limiter.is_allowed(user_id):
            logger.warning(f"Rate limit exceeded: {user_id}")
            return False
        return True

    def _get_claude_runner(self, user_id: int, project_dir: str) -> ClaudeRunner:
        if user_id not in self.claude_runners:
            self.claude_runners[user_id] = ClaudeRunner(cwd=project_dir)
        return self.claude_runners[user_id]

    async def cmd_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if not await self._check_auth(user_id):
            return

        project_dir = validate_project_dir(context.user_data.get("project_dir", APPROVED_DIRECTORY))
        if not project_dir:
            await update.message.reply_text("Invalid or unset project directory.")
            return

        session = self.session_mgr.get_session(user_id, project_dir)
        if not session:
            await update.message.reply_text("No active session.")
            return

        runner = self._get_claude_runner(user_id, project_dir)
        uptime = datetime.utcnow().isoformat()
        status = (
            f"*Session Status*\n"
            f"Session ID: `{session['session_id']}`\n"
            f"Project: `{project_dir}`\n"
            f"Cost: ${session['total_cost_usd']:.2f}\n"
            f"Turns: {runner.turn_count}/{CLAUDE_MAX_TURNS}\n"
            f"Created: {session['created_at']}\n"
        )
        await update.message.reply_text(status, parse_mode="Markdown")

    async def cmd_new(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if not await self._check_auth(user_id):
            return

        project_dir = validate_project_dir(context.user_data.get("project_dir", APPROVED_DIRECTORY))
        if not project_dir:
            await update.message.reply_text("Invalid or unset project directory.")
            return

        if user_id in self.claude_runners:
            self.claude_runners[user_id].reset()
        session = self.session_mgr.get_or_create(user_id, project_dir)
        await update.message.reply_text(f"New session created: `{session['session_id']}`", parse_mode="Markdown")

    async def cmd_stop(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if not await self._check_auth(user_id):
            return

        if user_id in self.claude_runners:
            self.claude_runners[user_id].reset()
            await update.message.reply_text("Claude process stopped.")
        else:
            await update.message.reply_text("No active Claude process.")

    async def cmd_resume(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if not await self._check_auth(user_id):
            return

        project_dir = validate_project_dir(context.user_data.get("project_dir", APPROVED_DIRECTORY))
        if not project_dir:
            await update.message.reply_text("Invalid or unset project directory.")
            return

        session = self.session_mgr.get_session(user_id, project_dir)
        if session:
            await update.message.reply_text(f"Resumed session: `{session['session_id']}`", parse_mode="Markdown")
        else:
            await update.message.reply_text("No session to resume. Use /new to create one.")

    async def cmd_cd(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if not await self._check_auth(user_id):
            return

        if not context.args:
            await update.message.reply_text("Usage: /cd <path>")
            return

        path = " ".join(context.args)
        validated = validate_project_dir(path)
        if not validated:
            await update.message.reply_text(f"Invalid path: {path}")
            return

        context.user_data["project_dir"] = validated
        await update.message.reply_text(f"Project directory set to: `{validated}`", parse_mode="Markdown")

    async def cmd_budget(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if not await self._check_auth(user_id):
            return

        project_dir = validate_project_dir(context.user_data.get("project_dir", APPROVED_DIRECTORY))
        if not project_dir:
            await update.message.reply_text("Invalid or unset project directory.")
            return

        session = self.session_mgr.get_session(user_id, project_dir)
        if session:
            remaining = CLAUDE_MAX_COST_USD - session['total_cost_usd']
            status = (
                f"*Budget Status*\n"
                f"Used: ${session['total_cost_usd']:.2f}\n"
                f"Limit: ${CLAUDE_MAX_COST_USD:.2f}\n"
                f"Remaining: ${remaining:.2f}\n"
            )
            await update.message.reply_text(status, parse_mode="Markdown")
        else:
            await update.message.reply_text("No session data.")

    async def cmd_pulse(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if not await self._check_auth(user_id):
            return

        runner = self.claude_runners.get(user_id)
        if runner and runner.current_process:
            await update.message.reply_text("💓 Claude process is active")
        else:
            await update.message.reply_text("Claude process is idle")

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if not await self._check_auth(user_id):
            await update.message.reply_text("Unauthorized.")
            return

        if not await self._check_ratelimit(user_id):
            await update.message.reply_text("Rate limit exceeded. Please retry later.")
            return

        project_dir = validate_project_dir(context.user_data.get("project_dir", APPROVED_DIRECTORY))
        if not project_dir:
            await update.message.reply_text("Invalid or unset project directory. Use /cd first.")
            return

        user_message = update.message.text
        session = self.session_mgr.get_or_create(user_id, project_dir)
        runner = self._get_claude_runner(user_id, project_dir)

        if runner.turn_count >= CLAUDE_MAX_TURNS:
            await update.message.reply_text(
                f"Max turns ({CLAUDE_MAX_TURNS}) reached for this session. Use /new to reset."
            )
            return

        await update.message.reply_text("Processing...")

        command = f"echo '{user_message}' | claude"
        output, cost = await runner.run_command(command)

        if cost > 0:
            self.session_mgr.update_cost(user_id, project_dir, cost)

        if cost >= CLAUDE_MAX_COST_USD - self.session_mgr.get_session(user_id, project_dir)['total_cost_usd']:
            await update.message.reply_text("Budget limit reached.")
            return

        await update.message.reply_text(f"```\n{output}\n```", parse_mode="Markdown")

        entry = {
            "ts": datetime.utcnow().isoformat(),
            "type": "text",
            "transcript": user_message,
            "response_summary": output[:200],
            "session": session['session_id'],
            "cost_usd": cost
        }
        self.inbox_writer.write(entry)

    async def run(self):
        if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
            raise ValueError("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required")

        self.app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

        self.app.add_handler(CommandHandler("status", self.cmd_status))
        self.app.add_handler(CommandHandler("new", self.cmd_new))
        self.app.add_handler(CommandHandler("stop", self.cmd_stop))
        self.app.add_handler(CommandHandler("resume", self.cmd_resume))
        self.app.add_handler(CommandHandler("cd", self.cmd_cd))
        self.app.add_handler(CommandHandler("budget", self.cmd_budget))
        self.app.add_handler(CommandHandler("pulse", self.cmd_pulse))
        self.app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))

        async with self.app:
            asyncio.create_task(self.notification_fifo.watch_and_send(self.app, TELEGRAM_CHAT_ID))
            await self.app.start()
            await self.app.updater.start_polling()
            logger.info("Telegram bot started (polling mode)")
            await asyncio.Event().wait()


# ============================================================================
# Main
# ============================================================================

async def main():
    bot = TelegramBot()
    await bot.run()


if __name__ == "__main__":
    asyncio.run(main())
