# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Shared pytest fixtures for the cv-builder test suite.
"""

import os
import shlex
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import urlparse


# ---------------------------------------------------------------------------
# LLM API key bootstrap
# ---------------------------------------------------------------------------

def _bootstrap_llm_keys() -> None:
    """Source llm-keys.zsh (if present) and inject LLM API keys into the
    current process environment so tests that probe real providers work
    without requiring manual shell setup.

    The key file is sourced with ENABLE_LLM_KEYS=1; only the specific known
    key names are imported.  Existing env vars take priority (setdefault).
    """
    _KEY_NAMES = {
        'GITHUB_MODELS_TOKEN',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'GEMINI_API_KEY',
        'GROQ_API_KEY',
        'CLINE_API_KEY',
    }

    key_file = Path.home() / '.oh-my-zsh-custom' / 'llm-keys.zsh'
    if not key_file.exists():
        return

    # Source the script in a subshell with ENABLE_LLM_KEYS=1 and collect the
    # resulting environment as NUL-delimited "key=value" pairs.
    env = os.environ.copy()
    env['ENABLE_LLM_KEYS'] = '1'
    try:
        result = subprocess.run(
            ['zsh', '-c', f'source {shlex.quote(str(key_file))} 2>/dev/null && env -0'],
            capture_output=True,
            text=True,
            env=env,
            timeout=15,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return

    if result.returncode != 0:
        return

    for item in result.stdout.split('\0'):
        if '=' not in item:
            continue
        k, _, v = item.partition('=')
        if k in _KEY_NAMES:
            os.environ.setdefault(k, v)


_bootstrap_llm_keys()

import pytest
import requests

from tests.helpers.example_profiles import materialize_example_profile


def _test_server_base_url() -> str:
    """Return the integration-test server base URL.

    Priority:
    1) CV_SERVER_URL (explicit)
    2) Default 127.0.0.1:5002 for compatibility messaging only
    """
    explicit = (os.environ.get("CV_SERVER_URL") or "").strip()
    if explicit:
        return explicit.rstrip("/")

    return "http://127.0.0.1:5002"


def _free_port() -> int:
    """Return an OS-assigned free TCP port for an isolated test server."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


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
        - Reuses an explicitly configured server only when
            CV_SERVER_URL is set.
        - Otherwise auto-starts an isolated local server on a free port.
        - The auto-started server always uses repo-owned example profile files
            copied into a temporary test-only directory.
    - To disable auto-start and keep skip behavior, set CV_AUTO_START_SERVER=0.

    Apply to integration tests that talk to the running Flask app:

        def test_something(require_server):
            ...
    """
    explicit_base_url = (os.environ.get("CV_SERVER_URL") or "").strip()
    if explicit_base_url:
        base_url = explicit_base_url.rstrip("/")
        if _server_is_up(base_url):
            yield base_url
            return
    else:
        base_url = ""

    auto_start_raw = os.environ.get("CV_AUTO_START_SERVER") or "1"
    auto_start = auto_start_raw.strip().lower() not in {
        "0",
        "false",
        "no",
        "off",
    }

    if not auto_start:
        port = os.environ.get("CV_SERVER_PORT", "5002")
        unavailable_url = base_url or _test_server_base_url()
        pytest.skip(
            f"Web server not available at {unavailable_url} — "
            "start it with: conda activate cvgen && "
            f"python scripts/web_app.py --port {port}"
        )

    project_root = Path(__file__).resolve().parent.parent
    scripts_web_app = project_root / "scripts" / "web_app.py"
    profile_name = (
        (os.environ.get("CV_TEST_PROFILE") or "medium").strip().lower()
    )

    port = _free_port()
    base_url = f"http://127.0.0.1:{port}"

    env = os.environ.copy()
    env.setdefault("FLASK_ENV", "testing")

    previous_server_url = os.environ.get("CV_SERVER_URL")
    previous_server_port = os.environ.get("CV_SERVER_PORT")

    with tempfile.TemporaryDirectory(prefix="cv_builder_server_") as tmpdir:
        fixture_root = Path(tmpdir)
        master_data_path, publications_path, output_dir = (
            materialize_example_profile(
                fixture_root,
                profile_name=profile_name,
            )
        )

        proc = subprocess.Popen(
            [
                sys.executable,
                str(scripts_web_app),
                "--llm-provider",
                "stub",
                "--port",
                str(port),
                "--master-data",
                str(master_data_path),
                "--publications",
                str(publications_path),
                "--output-dir",
                str(output_dir),
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
            pytest.skip(
                f"Auto-started test server failed to come up at {base_url} "
                f"within {timeout_seconds}s — skipping (server resource "
                f"unavailable in this environment)"
            )

        try:
            os.environ["CV_SERVER_URL"] = base_url
            os.environ["CV_SERVER_PORT"] = str(port)
            yield base_url
        finally:
            if previous_server_url is None:
                os.environ.pop("CV_SERVER_URL", None)
            else:
                os.environ["CV_SERVER_URL"] = previous_server_url

            if previous_server_port is None:
                os.environ.pop("CV_SERVER_PORT", None)
            else:
                os.environ["CV_SERVER_PORT"] = previous_server_port

            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
