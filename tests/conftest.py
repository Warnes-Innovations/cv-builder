# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Shared pytest fixtures for the cv-builder test suite.
"""

import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import pytest
import requests


def _test_server_base_url() -> str:
    """Return the integration-test server base URL.

    Priority:
    1) CV_SERVER_URL (explicit)
    2) CV_SERVER_PORT (host defaults to 127.0.0.1)
    3) Default 127.0.0.1:5002 (matches run_tests.py integration harness)
    """
    explicit = (os.environ.get("CV_SERVER_URL") or "").strip()
    if explicit:
        return explicit.rstrip("/")

    port = (os.environ.get("CV_SERVER_PORT") or "5002").strip()
    return f"http://127.0.0.1:{port}"


def _server_is_up(base_url: str) -> bool:
    """Return True if the web server is reachable."""
    try:
        requests.get(f"{base_url}/api/status", timeout=2)
        return True
    except (requests.ConnectionError, requests.Timeout):
        return False


def _server_port(base_url: str) -> int:
    """Extract the server port from a URL (fallback by scheme)."""
    parsed = urlparse(base_url)
    if parsed.port:
        return parsed.port
    return 443 if parsed.scheme == "https" else 80


def _wait_for_server(base_url: str, timeout_seconds: int) -> bool:
    """Poll /api/status until the server becomes reachable or times out."""
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if _server_is_up(base_url):
            return True
        time.sleep(0.5)
    return False


@pytest.fixture(autouse=False, scope="session")
def require_server():
    """Ensure integration tests have a running Flask server.

    Behavior:
    - Reuses an already running server at CV_SERVER_URL/CV_SERVER_PORT.
    - Auto-starts a local server when unavailable (default behavior).
    - To disable auto-start and keep skip behavior, set CV_AUTO_START_SERVER=0.

    Apply to integration tests that talk to the running Flask app:

        def test_something(require_server):
            ...
    """
    base_url = _test_server_base_url()
    if _server_is_up(base_url):
        yield base_url
        return

    auto_start_raw = (os.environ.get("CV_AUTO_START_SERVER") or "1")
    auto_start = auto_start_raw.strip().lower() not in {
        "0", "false", "no", "off"
    }

    if not auto_start:
        port = os.environ.get("CV_SERVER_PORT", "5002")
        pytest.skip(
            f"Web server not available at {base_url} — "
            "start it with: conda activate cvgen && "
            f"python scripts/web_app.py --port {port}"
        )

    project_root = Path(__file__).resolve().parent.parent
    scripts_web_app = project_root / "scripts" / "web_app.py"
    port = _server_port(base_url)

    env = os.environ.copy()
    env.setdefault("FLASK_ENV", "testing")

    proc = subprocess.Popen(
        [
            sys.executable,
            str(scripts_web_app),
            "--llm-provider", "stub",
            "--port", str(port),
        ],
        cwd=str(project_root),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    timeout_raw = os.environ.get("CV_SERVER_STARTUP_TIMEOUT") or "20"
    timeout_seconds = int(timeout_raw.strip())
    if not _wait_for_server(base_url, timeout_seconds):
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        pytest.fail(
            f"Auto-started test server failed to come up at {base_url} "
            f"within {timeout_seconds}s"
        )

    try:
        yield base_url
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
