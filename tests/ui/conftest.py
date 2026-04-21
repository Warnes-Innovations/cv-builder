# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Playwright conftest for cv-builder UI tests.

Fixtures
--------
live_server   (session-scoped) — starts Flask on port 5001, yields base URL
page          (function-scoped) — fresh browser context, clears localStorage,
              intercepts all LLM-backed API routes with fixture JSON
seeded_page   (function-scoped) — `page` with a job already submitted
              (Step 1 done)
"""

import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.parse

import pytest

# Extend path before importing project-local test fixtures.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from playwright.sync_api import Page, Route  # noqa: E402
from tests.ui.fixtures.mock_responses import (  # noqa: E402
    API_JOB_OK,
    API_STATUS_INIT,
    API_STATUS_JOB_LOADED,
    API_STATUS_ANALYSIS_DONE,
    API_STATUS_IN_ANALYSIS,
    API_STATUS_REWRITE,
    API_STATUS_SPELL,
    API_STATUS_GENERATE,
    API_STATUS_FINALISE,
    API_ACTION_ANALYZE_OK,
    API_ACTION_RECOMMEND_OK,
    API_POST_ANALYSIS_OK,
    API_REVIEW_DECISIONS_OK,
    API_REWRITES_GET,
    API_REWRITES_APPROVE_OK,
    API_GENERATE_OK,
    API_HISTORY_EMPTY,
)

BASE_URL = os.environ.get("CV_SERVER_URL", "http://127.0.0.1:5002")
SERVER_STARTUP_TIMEOUT = int(os.environ.get("CV_SERVER_STARTUP_TIMEOUT", "30"))  # seconds


def _base_url_port(url: str) -> int:
    p = urllib.parse.urlparse(url)
    if p.port:
        return p.port
    return 443 if p.scheme == "https" else 80


# ---------------------------------------------------------------------------
# Live server fixture
# ---------------------------------------------------------------------------

def _wait_for_server(url: str, timeout: int) -> bool:
    """Poll url until it responds with any HTTP status or timeout expires.

    Uses urllib so that any HTTP response (including 4xx) counts as "up".
    Connection-refused errors are the only sign the server isn't listening yet.
    """
    import urllib.request
    import urllib.error
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except urllib.error.HTTPError:
            # Got an HTTP error response — server is listening.
            return True
        except Exception:
            time.sleep(0.5)
    return False


def _playwright_browsers_installed() -> bool:
    """Return True if the Playwright Chromium executable is present on disk.

    Resolves the path in a child process to avoid conflicting with the
    pytest-playwright plugin's own session-scoped Playwright context.
    """
    try:
        result = subprocess.run(
            [sys.executable, "-c",
             "from playwright.sync_api import sync_playwright;"
             "pw=sync_playwright().start();"
             "print(pw.chromium.executable_path);"
             "pw.stop()"],
            capture_output=True, text=True, timeout=10,
        )
        path = result.stdout.strip()
        return bool(path) and os.path.exists(path)
    except Exception:
        return False


@pytest.fixture(scope="session")
def live_server():
    """
    Start the Flask web app on port 5001 for the test session.

    Skips gracefully when:
    - Playwright Chromium is not installed, OR
    - A server cannot be started within the timeout.

    If a server is already running on 5001 (e.g. started by the outer test
    harness), it is reused without launching a new process.

    NOTE: when reusing an already-running server the output directory is not
    controlled by this fixture; session directories may accumulate in that
    server's configured output path.
    """
    if not _playwright_browsers_installed():
        pytest.skip(
            "Playwright Chromium browser not installed — "
            "run `playwright install chromium` to enable UI tests."
        )

    # Reuse an already-running server (e.g. started by the test harness).
    # /api/status now returns 200 without a session_id so urlopen succeeds.
    if _wait_for_server(f"{BASE_URL}/api/status", timeout=2):
        yield BASE_URL
        return

    project_root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..")
    )
    server_port = _base_url_port(BASE_URL)

    tmp_dir = tempfile.TemporaryDirectory(prefix="cv_builder_ui_test_")
    try:
        cmd = [
            sys.executable,
            os.path.join(project_root, "scripts", "web_app.py"),
            "--llm-provider", "stub",
            "--output-dir", tmp_dir.name,
            "--port", str(server_port),
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

        reachable = _wait_for_server(
            f"{BASE_URL}/api/status", SERVER_STARTUP_TIMEOUT
        )
        if not reachable:
            proc.terminate()
            pytest.skip(
                f"Flask server did not start within {SERVER_STARTUP_TIMEOUT}s"
            )

        yield BASE_URL

        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    finally:
        tmp_dir.cleanup()


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


def _install_mock_routes(
    page: Page, status_response: dict | None = None
) -> None:
    """
    Intercept LLM-backed API calls so tests are deterministic and require
    no API credentials.

    Routes intercepted:
      POST /api/job                → API_JOB_OK
      GET  /api/status    → status_response (default: API_STATUS_JOB_LOADED)
      GET  /api/history            → API_HISTORY_EMPTY
      POST /api/action             → dispatch on action field
      POST /api/post-analysis-*    → API_POST_ANALYSIS_OK
      POST /api/review-decisions   → API_REVIEW_DECISIONS_OK
      GET  /api/rewrites           → API_REWRITES_GET
      POST /api/rewrites/approve   → API_REWRITES_APPROVE_OK
    POST /api/generate           → API_GENERATE_OK
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
            _json_route(
                route,
                {"ok": True, "phase": "customization", "result": {}},
            )

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

    def handle_ats_score(route: Route):
        _json_route(route, {
            "ok": True,
            "ats_score": {
                "overall": 72.0,
                "hard_requirement_score": 80.0,
                "soft_requirement_score": 50.0,
                "keyword_status": [],
                "section_scores": {
                    "skills": 60.0,
                    "experience": 40.0,
                    "education": 0.0,
                    "summary": 0.0,
                },
                "computed_at": "2026-03-19T00:00:00+00:00",
                "basis": "review_checkpoint",
            },
        })

    def handle_copilot_status(route: Route):
        _json_route(route, {"authenticated": False})

    def handle_copilot_start(route: Route):
        _json_route(route, {
            "user_code": "TEST-1234",
            "verification_uri": "https://github.com/login/device",
            "interval": 5,
            "expires_in": 900,
        })

    def handle_sessions_claim(route: Route):
        _json_route(route, {"ok": True, "session_id": "test-session-id"})

    def handle_sessions_new(route: Route):
        _json_route(route, {"ok": True, "session_id": "test-session-id"})

    def handle_sessions_active(route: Route):
        _json_route(route, {
            "sessions": [
                {
                    "session_id": "test-session-id",
                    "position_name": "Test Session",
                    "phase": status_response.get("phase", "init") if isinstance(status_response, dict) else "init",
                    "claimed": True,
                    "owned_by_requester": True,
                    "has_job": True,
                    "has_analysis": True,
                }
            ]
        })

    def handle_load_items(route: Route):
        _json_route(route, {"items": []})

    def handle_intake_metadata(route: Route):
        _json_route(route, {"confirmed": True})

    def handle_master_fields(route: Route):
        _json_route(route, {
            "selected_achievements": [],
            "selected_experiences": [],
            "selected_skills": [],
            "keywords": [],
        })

    # api-client.js patches window.fetch to append ?session_id=…&owner_token=…
    # to every /api/* URL.  All patterns therefore need a trailing ** so
    # Playwright's glob matches the appended query string as well.
    # (Routes excluded from injection — /api/sessions/new, /api/sessions/claim —
    # keep their bare patterns since no query params are added to them.)
    page.route("**/api/job**", handle_job)
    page.route("**/api/status**", handle_status)
    page.route("**/api/history**", handle_history)
    page.route("**/api/load-items**", handle_load_items)
    page.route("**/api/action**", handle_action)
    page.route("**/api/post-analysis-responses**", handle_post_analysis)
    page.route("**/api/post-analysis-questions**", handle_post_analysis)
    page.route("**/api/review-decisions**", handle_review_decisions)
    # Register /rewrites FIRST then /rewrites/approve SECOND.
    # LIFO ordering means the more-specific /approve handler is tried first,
    # so approve requests are never swallowed by the generic rewrites handler.
    page.route("**/api/rewrites**", handle_rewrites_get)
    page.route("**/api/rewrites/approve**", handle_rewrites_approve)
    page.route("**/api/generate**", handle_generate)
    page.route("**/api/cv/ats-score**", handle_ats_score)
    page.route("**/api/intake-metadata**", handle_intake_metadata)
    page.route("**/api/master-fields**", handle_master_fields)

    # Staged generation routes (GAP-20 Phase 1)
    # Use trailing ** so query-string variants (e.g. ?session_id=…) also match.
    page.route(
        "**/api/cv/generation-state**",
        lambda r: _json_route(r, {
            "ok": True,
            "phase": "idle",
            "preview_available": False,
            "layout_confirmed": False,
            "page_count_estimate": None,
            "page_length_warning": False,
            "layout_instructions_count": 0,
            "final_generated_at": None,
        }),
    )
    page.route(
        "**/api/cv/generate-preview**",
        lambda r: _json_route(r, {
            "ok": True,
            "html": "<html><body><h1>CV Preview</h1></body></html>",
            "preview_request_id": "test-preview-id-001",
            "page_count_estimate": 2,
            "page_length_warning": False,
        }),
    )
    page.route(
        "**/api/cv/layout-refine**",
        lambda r: _json_route(r, {
            "ok": True,
            "html": "<html><body><h1>CV Preview (refined)</h1></body></html>",
            "summary": "Adjusted margins",
            "confidence": 0.95,
            "preview_request_id": "test-preview-id-002",
        }),
    )
    page.route(
        "**/api/cv/confirm-layout**",
        lambda r: _json_route(r, {
            "ok": True,
            "confirmed": True,
            "confirmed_at": "2026-03-19T12:00:00",
            "hash": "abc123def456",
        }),
    )
    page.route(
        "**/api/cv/generate-final**",
        lambda r: _json_route(r, {
            "ok": True,
            "generated_at": "2026-03-19T12:01:00",
            "outputs": {
                "output_dir": "/tmp/test-cv-output",
                "final_html": "/tmp/test-cv-output/CV_final.html",
                "final_pdf": "/tmp/test-cv-output/CV_final.pdf",
            },
        }),
    )

    # Mock copilot-auth so openCopilotAuthModal shows the modal (not confirm())
    page.route("**/api/copilot-auth/status**", handle_copilot_status)
    page.route("**/api/copilot-auth/start**", handle_copilot_start)
    # Mock session management so tests don't get blocked by the sessions modal
    page.route("**/api/sessions/claim", handle_sessions_claim)
    page.route("**/api/sessions/new", handle_sessions_new)
    page.route("**/api/sessions/active**", handle_sessions_active)


def _wait_for_ui_ready(page: Page) -> None:
    """Wait until app init exposes stage/tab helpers used by tests."""
    page.wait_for_function(
        """
        () => typeof updateActionButtons === 'function'
            && typeof updateTabBarForStage === 'function'
            && document.readyState === 'complete'
        """
    )


def _setup_global_state(page: Page, phase: str = 'customization') -> None:
    """Set up required global state for UI tests.
    
    Most UI workflows require pendingRecommendations and tabData to be present.
    This helper initializes them with sensible defaults.
    """
    page.evaluate(
        """
        (phase) => {
            window.pendingRecommendations = window.pendingRecommendations || {
                recommended_achievements: [],
                recommended_skills: [],
                recommended_experiences: [],
                suggested_achievements: []
            };
            window.tabData = window.tabData || {};
            window.tabData.customizations = true;
            window.tabData.analysis = { required_skills: [], responsibilities: [] };
            window.achievementDecisions = window.achievementDecisions || {};
            window.userSelections = window.userSelections || {};
        }
        """,
        phase,
    )


def _force_stage(page: Page, stage: str) -> None:
    """Force second-bar tabs and stage action button into a deterministic state."""
    page.evaluate(
        """
        (s) => {
            if (typeof updateTabBarForStage === 'function') updateTabBarForStage(s);
            if (typeof updateActionButtons === 'function') updateActionButtons(s);
            const map = {
                job: 'job',
                analysis: 'analysis',
                customizations: 'exp-review',
                rewrite: 'rewrite',
                spell: 'spell',
                generate: 'generate',
                layout: 'layout',
                finalise: 'download',
            };
            const tab = map[s];
            if (tab && typeof switchTab === 'function') switchTab(tab);
        }
        """,
        stage,
    )


def _sync_workflow_steps(page: Page, status_response: dict | None) -> None:
    """Apply workflow-step classes to match the mocked backend status."""
    if not isinstance(status_response, dict):
        return

    page.evaluate(
        """
        (status) => {
            if (typeof updateWorkflowSteps === 'function') {
                updateWorkflowSteps(status);
            }
        }
        """,
        status_response,
    )


# ---------------------------------------------------------------------------
# Page fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def page(browser, live_server):
    """
    Fresh browser context per test.

    - Uses API_STATUS_ANALYSIS_DONE (customization phase) so the page starts
      in a stable state without triggering auto-analysis.
    - Session ID is injected via URL so the sessions modal does not block.
    - Installs mock routes before the page loads.
    - Sets a generous default timeout for async operations.
    """
    context = browser.new_context()
    p = context.new_page()
    p.set_default_timeout(10_000)  # 10 s — generous for local CI

    _install_mock_routes(p, status_response=API_STATUS_ANALYSIS_DONE)

    p.goto(f"{live_server}/?session=test-session-id",
           wait_until="load")
    _wait_for_ui_ready(p)
    _setup_global_state(p, "customization")
    _force_stage(p, "customizations")
    _sync_workflow_steps(p, API_STATUS_ANALYSIS_DONE)

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

    p.goto(f"{live_server}/?session=test-session-id",
           wait_until="load")
    _wait_for_ui_ready(p)
    _setup_global_state(p, "customization")
    _force_stage(p, "customizations")
    _sync_workflow_steps(p, API_STATUS_ANALYSIS_DONE)

    yield p
    context.close()


@pytest.fixture
def analysis_seeded_page(browser, live_server):
    """
    Page in job_analysis phase with analysis data available.
    The tab bar shows the analysis-stage tabs (tab-analysis, tab-questions).
    """
    context = browser.new_context()
    p = context.new_page()
    p.set_default_timeout(10_000)

    _install_mock_routes(p, status_response=API_STATUS_IN_ANALYSIS)

    p.goto(f"{live_server}/?session=test-session-id",
           wait_until="load")
    _wait_for_ui_ready(p)
    _setup_global_state(p, "job_analysis")
    _force_stage(p, "analysis")
    _sync_workflow_steps(p, API_STATUS_IN_ANALYSIS)

    yield p
    context.close()


@pytest.fixture
def job_stage_page(browser, live_server):
    """
    Page in init/job phase where the Analyze Job action button is visible.
    Use this for tests that need to interact with #analyze-btn.
    """
    context = browser.new_context()
    p = context.new_page()
    p.set_default_timeout(10_000)

    _install_mock_routes(p, status_response=API_STATUS_INIT)

    p.goto(f"{live_server}/?session=test-session-id",
           wait_until="load")
    _wait_for_ui_ready(p)
    _setup_global_state(p, "init")
    _force_stage(p, "job")
    _sync_workflow_steps(p, API_STATUS_INIT)

    yield p
    context.close()


@pytest.fixture
def rewrite_stage_page(browser, live_server):
    """Page in rewrite_review phase — #tab-rewrite is visible."""
    context = browser.new_context()
    p = context.new_page()
    p.set_default_timeout(10_000)
    _install_mock_routes(p, status_response=API_STATUS_REWRITE)
    p.goto(f"{live_server}/?session=test-session-id",
           wait_until="load")
    _wait_for_ui_ready(p)
    _setup_global_state(p, "rewrite_review")
    _force_stage(p, "rewrite")
    _sync_workflow_steps(p, API_STATUS_REWRITE)
    yield p
    context.close()


@pytest.fixture
def spell_stage_page(browser, live_server):
    """Page in spell_check phase — #tab-spell is visible."""
    context = browser.new_context()
    p = context.new_page()
    p.set_default_timeout(10_000)
    _install_mock_routes(p, status_response=API_STATUS_SPELL)
    p.goto(f"{live_server}/?session=test-session-id",
           wait_until="load")
    _wait_for_ui_ready(p)
    _setup_global_state(p, "spell_check")
    _force_stage(p, "spell")
    _sync_workflow_steps(p, API_STATUS_SPELL)
    yield p
    context.close()


@pytest.fixture
def finalise_stage_page(browser, live_server):
    """Page in refinement phase — #tab-download and #tab-finalise visible."""
    context = browser.new_context()
    p = context.new_page()
    p.set_default_timeout(10_000)
    _install_mock_routes(p, status_response=API_STATUS_FINALISE)
    p.goto(f"{live_server}/?session=test-session-id",
           wait_until="load")
    _wait_for_ui_ready(p)
    _setup_global_state(p, "refinement")
    _force_stage(p, "finalise")
    _sync_workflow_steps(p, API_STATUS_FINALISE)
    yield p
    context.close()


@pytest.fixture
def generate_stage_page(browser, live_server):
    """Page in generation phase — #tab-generate is visible."""
    context = browser.new_context()
    p = context.new_page()
    p.set_default_timeout(10_000)
    _install_mock_routes(p, status_response=API_STATUS_GENERATE)
    p.goto(f"{live_server}/?session=test-session-id",
           wait_until="load")
    _wait_for_ui_ready(p)
    _setup_global_state(p, "generation")
    _force_stage(p, "generate")
    _sync_workflow_steps(p, API_STATUS_GENERATE)
    yield p
    context.close()
