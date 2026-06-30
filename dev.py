#!/usr/bin/env python3
"""
Acme CMS — one-command dev orchestrator.

Usage:
    python dev.py

Starts both services concurrently and streams their output to a single terminal
with colour-coded prefixes so you can tell which service is talking.

    API:  http://localhost:3000       (NestJS content service)
    Docs: http://localhost:3000/docs  (Swagger / OpenAPI)
    Web:  http://localhost:5173       (Vite + React SPA)

Press Ctrl-C to shut down both services cleanly.

Prerequisites:
    Node.js 18+  — https://nodejs.org
    Python 3.8+  — (you're already running it)
    Optional: pip install python-dotenv  (loads .env automatically)
"""

import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass  # python-dotenv not installed — env vars must be set manually

ROOT = Path(__file__).parent.resolve()
API_DIR = ROOT / "apps" / "api"
WEB_DIR = ROOT / "apps" / "web"

# ANSI colour codes for prefixed log output.
RESET = "\x1b[0m"
COLOURS = {
    "api": "\x1b[36m",   # cyan
    "web": "\x1b[35m",   # magenta
}


# ── Helpers ────────────────────────────────────────────────────────────────


def check_node() -> None:
    if not shutil.which("node"):
        sys.exit("❌  Node.js not found. Install from https://nodejs.org")
    result = subprocess.run(["node", "--version"], capture_output=True, text=True)
    version_str = result.stdout.strip().lstrip("v")
    major = int(version_str.split(".")[0])
    if major < 18:
        sys.exit(f"❌  Node.js 18+ required, found {result.stdout.strip()}")
    print(f"  ✅  Node.js {result.stdout.strip()}")


def ensure_deps(name: str, app_dir: Path) -> None:
    if not (app_dir / "node_modules").exists():
        print(f"  📦  Installing {name} dependencies…")
        subprocess.run(["npm", "install"], cwd=app_dir, check=True, env=os.environ)


def stream_output(proc: subprocess.Popen, label: str) -> None:
    """Read stdout/stderr lines and re-print them with a coloured prefix."""
    colour = COLOURS.get(label, "")
    prefix = f"{colour}[{label}]{RESET} "

    def _pipe(stream):
        for line in stream:
            print(f"{prefix}{line}", end="", flush=True)

    if proc.stdout:
        threading.Thread(target=_pipe, args=(proc.stdout,), daemon=True).start()
    if proc.stderr:
        threading.Thread(target=_pipe, args=(proc.stderr,), daemon=True).start()


# ── Main ────────────────────────────────────────────────────────────────────


def main() -> None:
    print("\n🚀  Starting Acme CMS dev server…\n")

    check_node()
    ensure_deps("api", API_DIR)
    ensure_deps("web", WEB_DIR)

    print()

    api_proc = subprocess.Popen(
        ["npm", "run", "start:dev"],
        cwd=API_DIR,
        env=os.environ,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    web_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=WEB_DIR,
        env=os.environ,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    stream_output(api_proc, "api")
    stream_output(web_proc, "web")

    print("  📡  API:  http://localhost:3000")
    print("  📖  Docs: http://localhost:3000/docs")
    print("  🌐  Web:  http://localhost:5173")
    print("\n  Press Ctrl-C to stop.\n")

    try:
        # Block until either process exits (usually neither unless there's an error).
        while True:
            if api_proc.poll() is not None or web_proc.poll() is not None:
                break
            api_proc.wait(timeout=1)
    except KeyboardInterrupt:
        pass
    except subprocess.TimeoutExpired:
        pass
    finally:
        print("\n🛑  Shutting down…")
        for proc in (api_proc, web_proc):
            if proc.poll() is None:
                proc.terminate()
        for proc in (api_proc, web_proc):
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        print("👋  Done.")


if __name__ == "__main__":
    main()
