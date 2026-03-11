"""
Playwright conftest for cv-builder UI tests.

Fixtures
--------
live_server   (session-scoped) — starts Flask on port 5001, yields base URL
page          (function-scoped) — fresh browser context, clears localStorage,
              intercepts all LLM-backed API routes with fixture JSON
seeded_page   (function-scoped) — `page` with a job already submitted (Step 1 done)
"""

import json
import os
import subprocess
import sys
import time
import threading
import pytest

from playwright.sync_api import Page, Route

# Adjust path so we can import fixtures
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from tests.ui.fixtures.mock_responses import (
    SAMPLE_JOB_TEXT,
    API_JOB_OK,
    API_STATUS_JOB_LOADED,
    API_STATUS_ANALYSIS_DONE,
    API_ACTION_ANALYZE_OK,
    API_ACTION_RECOMMEND_OK,
    API_POST_ANALYSIS_OK,
    API_REVIEW_DECISIONS_OK,
    API_REWRITES_GET,
    API_REWRITES_APPROVE_OK,
    API_SPELL_CHECK_OK,
    API_GENERATE_OK,
    API_RESET_OK,
    API_HISTORY_EMPTY,
)

BASE_URL = "http://127.0.0.1:5001"
SERVER_STARTUP_TIMEOUT = 15  # seconds


# ---------------------------------------------------------------------------
# Live server fixture
# ---------------------------------------------------------------------------

def _wait_for_server(url: str, timeout: int) -> bool:
    """Poll url until it responds 200 or timeout."""
    import urllib.request
    import urllib.error
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except Exception:
            time.sleep(0.5)
    return False


@pytest.fixture(scope="session")
def live_server():
    """
    Start the Flask web app on port 5001 for the test session.

    The server is started as a subprocess so it can be properly killed
    afterwards.  If a server is already running on 5001 (e.g. started
    manually), it is used as-is.
    """
    # Check whether a server is already up
    if _wait_for_server(f"{BASE_URL}/api/status", timeout=2):
        yield BASE_URL
        return

    project_root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..")
    )
    cmd = [
        sys.executable,
        os.path.join(project_root, "scripts", "web_app.py"),
        "--llm-provider", "github",
        "--port", "5001",
    ]
    env = os.environ.copy()
    env["FLASK_ENV"] = "testing"

    proc = subprocess.Popen(
        cmd,
        cwd=project_root,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    reachable = _wait_for_server(f"{BASE_URL}/api/status", SERVER_STARTUP_TIMEOUT)
    if not reachable:
        proc.terminate()
        pytest.fail(
            f"Flask server did not start within {SERVER_STARTUP_TIMEOUT}s. "
            "Run `python scripts/web_app.py --llm-provider github --port 5001` manually."
        )

    yield BASE_URL

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


# ---------------------------------------------------------------------------
# Route-interception helpers
# ---------------------------------------------------------------------------

def _json_route(route: Route, body: dict, status: int = 200) -> None:
    """Fulfill a Playwright route with a JSON response."""
    route.fulfill(
        status=status,
        content_type="application/json",
        body=json.dumps(body),
    )


def _install_mock_routes(page: Page, status_response: dict | None = None) -> None:
    """
    Intercept LLM-backed API calls so tests are deterministic and require
    no API credentials.

    Routes intercepted:
      POST /api/job                → API_JOB_OK
      GET  /api/status             → status_response (default: API_STATUS_JOB_LOADED)
      GET  /api/history            → API_HISTORY_EMPTY
      POST /api/action             → dispatch on action field
      POST /api/post-analysis-*    → API_POST_ANALYSIS_OK
      POST /api/review-decisions   → API_REVIEW_DECISIONS_OK
      GET  /api/rewrites           → API_REWRITES_GET
      POST /api/rewrites/approve   → API_REWRITES_APPROVE_OK
      POST /api/generate           → API_GENERATE_OK
      POST /api/reset              → API_RESET_OK
    """
    if status_response is None:
        status_response = API_STATUS_JOB_LOADED

    def handle_job(route: Route):
        _json_route(route, API_JOB_OK)

    def handle_status(route: Route):
        _json_route(route, status_response)

    def handle_history(route: Route):
        _json_route(route, API_HISTORY_EMPTY)

    def handle_action(route: Route):
        post_data = route.request.post_data or "{}"
        try:
            body = json.loads(post_data)
        except Exception:
            body = {}
        action = body.get("action", "")
        if action == "analyze_job":
            _json_route(route, API_ACTION_ANALYZE_OK)
        elif action == "recommend_customizations":
            _json_route(route, API_ACTION_RECOMMEND_OK)
        else:
            _json_route(route, {"ok": True, "phase": "customization", "result": {}})

    def handle_post_analysis(route: Route):
        _json_route(route, API_POST_ANALYSIS_OK)

    def handle_review_decisions(route: Route):
        _json_route(route, API_REVIEW_DECISIONS_OK)

    def handle_rewrites_get(route: Route):
        _json_route(route, API_REWRITES_GET)

    def handle_rewrites_approve(route: Route):
        _json_route(route, API_REWRITES_APPROVE_OK)

    def handle_generate(route: Route):
        _json_route(route, API_GENERATE_OK)

    def handle_reset(route: Route):
        _json_route(route, API_RESET_OK)

    def handle_copilot_status(route: Route):
        _json_route(route, {"authenticated": False})

    def handle_copilot_start(route: Route):
        _json_route(route, {
            "user_code": "TEST-1234",
            "verification_uri": "https://github.com/login/device",
            "interval": 5,
            "expires_in": 900,
        })

    page.route("**/api/job", handle_job)
    page.route("**/api/status", handle_status)
    page.route("**/api/history", handle_history)
    page.route("**/api/action", handle_action)
    page.route("**/api/post-analysis-responses", handle_post_analysis)
    page.route("**/api/post-analysis-questions", handle_post_analysis)
    page.route("**/api/review-decisions", handle_review_decisions)
    page.route("**/api/rewrites", handle_rewrites_get)
    page.route("**/api/rewrites/approve", handle_rewrites_approve)
    page.route("**/api/generate", handle_generate)
    page.route("**/api/reset", handle_reset)
    # Mock copilot-auth so openCopilotAuthModal shows the modal (not confirm())
    page.route("**/api/copilot-auth/status", handle_copilot_status)
    page.route("**/api/copilot-auth/start", handle_copilot_start)


# ---------------------------------------------------------------------------
# Page fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def page(browser, live_server):
    """
    Fresh browser context per test.

    - Clears localStorage so each test starts from a clean state.
    - Installs mock routes before the page loads.
    - Sets a generous default timeout for async operations.
    """
    context = browser.new_context()
    p = context.new_page()
    p.set_default_timeout(10_000)  # 10 s — generous for local CI

    _install_mock_routes(p)

    p.goto(live_server)
    # Wait for the app to initialise (Analyze Job button becomes present)
    p.wait_for_selector("#analyze-btn", timeout=10_000)

    yield p
    context.close()


# ---------------------------------------------------------------------------
# Seeded page fixture (past Step 1 — job already submitted)
# ---------------------------------------------------------------------------

@pytest.fixture
def seeded_page(browser, live_server):
    """
    Page with a job description already submitted and analysis complete.

    Uses API_STATUS_ANALYSIS_DONE as the /api/status mock so the app
    thinks it is in the `customization` phase.
    """
    context = browser.new_context()
    p = context.new_page()
    p.set_default_timeout(10_000)

    _install_mock_routes(p, status_response=API_STATUS_ANALYSIS_DONE)

    p.goto(live_server)
    p.wait_for_selector("#analyze-btn", timeout=10_000)

    yield p
    context.close()
