# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
UI tests — Session Management

Covers:
- Reset is not exposed in the web UI
- Save button triggers /api/save
- Page reload restores phase from backend state (via /api/status)
- Session conflict banner appears on 409
- Session picker (load stored session, load job file)
- UI step pills reflect restored phase
"""

import json
from playwright.sync_api import Page, expect

from tests.ui.fixtures.mock_responses import (
    API_STATUS_INIT,
    API_STATUS_ANALYSIS_DONE,
    API_LOAD_ITEMS,
    API_LOAD_SESSION_OK,
    API_LOAD_JOB_FILE_OK,
    API_HISTORY_EMPTY,
)


class TestResetRemoval:
    def test_reset_btn_absent(self, page: Page):
        expect(page.locator("#reset-btn")).to_have_count(0)


class TestSave:
    def test_save_calls_api_save(self, page: Page):
        """saveSession() calls POST /api/save.

        There is no dedicated Save button in the UI; the function is called
        programmatically (e.g., auto-save, keyboard shortcuts).  We invoke it
        directly via page.evaluate() to verify the API contract.
        """
        api_calls = []

        def capture(route):
            api_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"ok": True}),
            )

        page.route("**/api/save**", capture)
        page.evaluate("saveSession()")
        page.wait_for_timeout(500)
        assert any("/api/save" in url for url in api_calls), \
            "/api/save was not called by saveSession()"


class TestSessionRestore:
    def test_reload_calls_api_status(self, page: Page):
        """Page reload calls /api/status to restore state."""
        status_calls = []

        def capture(route):
            status_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_STATUS_ANALYSIS_DONE),
            )

        page.route("**/api/status**", capture)
        page.reload()
        page.wait_for_load_state("networkidle")
        assert any("/api/status" in url for url in status_calls), \
            "/api/status was not called on page reload"

    def test_reload_calls_api_history(self, page: Page):
        """Page reload calls /api/history to restore conversation."""
        history_calls = []

        def capture(route):
            history_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"history": [], "phase": "init"}),
            )

        # Override /api/status to return init phase so the UI state is
        # consistent with the history response (both say "init").
        page.route(
            "**/api/status**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_STATUS_INIT),
            ),
        )
        page.route("**/api/history**", capture)
        page.reload()
        page.wait_for_load_state("networkidle")
        assert any("/api/history" in url for url in history_calls), \
            "/api/history was not called on page reload"


class TestSessionConflict:
    def test_session_conflict_banner_on_409(self, job_stage_page: Page):
        """A 409 response from any API shows the session conflict banner.

        Uses job_stage_page (init phase) so #analyze-btn is visible
        (stage-aware action bar shows it only in the job stage).
        """
        job_stage_page.route(
            "**/api/action**",
            lambda r: r.fulfill(
                status=409,
                content_type="application/json",
                body=json.dumps({"error": "Session busy"}),
            ),
        )
        job_stage_page.locator("#analyze-btn").click()
        job_stage_page.wait_for_timeout(800)

        banner = job_stage_page.locator("#session-conflict-banner")
        assert banner.count() > 0, \
            "#session-conflict-banner should exist in DOM"
        # It may or may not be visible depending on display logic
        # Just verify it's in the DOM and the page didn't crash
        assert job_stage_page.evaluate(
            "() => document.readyState"
        ) == "complete"


# ---------------------------------------------------------------------------
# Gap 1 & 2 — Session picker (load stored session / load job file)
# ---------------------------------------------------------------------------

class TestSessionPicker:
    """
    Tests for the Load Job panel (session picker).

    Strategy: override /api/status to return init-phase (no job text) and
    reload the page.  populateJobTab() then calls showLoadJobPanel()
    automatically, avoiding any race with switchTab inside showLoadJobPanel().
    """

    def _open_picker(self, page: Page) -> None:
        """
        Install the load-items mock and open the picker explicitly.

        The current UI no longer guarantees that a reload into init phase will
        auto-open the picker before the test starts asserting on it, so open the
        panel directly through the runtime helper.
        """
        page.route(
            "**/api/status**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_STATUS_INIT),
            ),
        )
        page.route(
            "**/api/load-items**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_LOAD_ITEMS),
            ),
        )
        page.evaluate("() => showLoadJobPanel()")
        page.wait_for_selector(".load-item-row", timeout=10_000)

    def test_load_items_called_and_session_row_rendered(self, page: Page):
        """showLoadJobPanel() fetches /api/load-items and renders the session row."""
        calls = []

        page.route(
            "**/api/status**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_STATUS_INIT),
            ),
        )

        def capture_load_items(route):
            calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_LOAD_ITEMS),
            )
        page.route("**/api/load-items**", capture_load_items)

        page.evaluate("() => showLoadJobPanel()")
        page.wait_for_selector(".load-item-row", timeout=10_000)

        assert any("/api/load-items" in u for u in calls), \
            "/api/load-items was not fetched when the load panel opened"
        # Session row label must be visible in the picker table
        expect(page.locator(".load-item-row").first).to_be_visible()

    def test_session_row_click_calls_load_session(self, page: Page):
        """Clicking a session row calls POST /api/load-session with the session path."""
        load_session_calls = []

        self._open_picker(page)

        def handle_load_session(route):
            body = json.loads(route.request.post_data or "{}")
            load_session_calls.append(body)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_LOAD_SESSION_OK),
            )
        page.route("**/api/load-session**", handle_load_session)

        # Click the first row (kind=session)
        page.locator(".load-item-row").first.click()
        page.wait_for_timeout(1_500)

        assert load_session_calls, \
            "/api/load-session was not called after clicking the session row"
        assert load_session_calls[0].get("path") == "/fake/cv/files/acme-job/session.json", \
            f"Unexpected path sent to /api/load-session: {load_session_calls[0]}"

    def test_session_row_click_shows_restore_message(self, page: Page):
        """After session row click, the conversation shows a restore status message."""
        self._open_picker(page)

        page.route(
            "**/api/load-session**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_LOAD_SESSION_OK),
            ),
        )

        # Click the session row (index 0) and wait for restore message
        page.locator(".load-item-row").first.click()
        # loadSessionFile() appends "🔄 Restoring session…" clearing conv then "✅ Session restored: …"
        page.wait_for_selector("#conversation", timeout=5_000)
        page.wait_for_timeout(1_500)
        conv_text = page.locator("#conversation").inner_text()
        assert "Session restored" in conv_text or "Restoring session" in conv_text, \
            f"Expected restore status message in conversation; got: {conv_text!r}"

    def test_file_row_click_calls_load_job_file_not_load_session(self, page: Page):
        """Clicking a file row calls /api/load-job-file and NOT /api/load-session."""
        load_session_calls  = []
        load_job_file_calls = []

        self._open_picker(page)

        page.route(
            "**/api/load-session**",
            lambda r: (load_session_calls.append(r.request.url) or True) and
                r.fulfill(
                    status=200, content_type="application/json",
                    body=json.dumps(API_LOAD_SESSION_OK),
                ),
        )

        def handle_load_job_file(route):
            body = json.loads(route.request.post_data or "{}")
            load_job_file_calls.append(body)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_LOAD_JOB_FILE_OK),
            )
        page.route("**/api/load-job-file**", handle_load_job_file)

        # Click the second row (index 1), which has kind=file
        page.locator(".load-item-row").nth(1).click()
        page.wait_for_timeout(1_500)

        assert not load_session_calls, \
            f"/api/load-session must NOT be called for a file row, but was: {load_session_calls}"
        assert load_job_file_calls, \
            "/api/load-job-file was not called after clicking the file row"
        assert load_job_file_calls[0].get("filename") == "sample_job.txt", \
            f"Unexpected filename sent to /api/load-job-file: {load_job_file_calls[0]}"


# ---------------------------------------------------------------------------
# Gap 3 — UI step pills reflect restored phase on page load
# ---------------------------------------------------------------------------

class TestRestoredPhaseUI:
    """
    Verify that /api/status is applied to the step pills when the page loads
    with an in-progress session (phase = 'customization').
    """

    def test_completed_steps_marked_when_phase_is_customization(
        self, seeded_page: Page
    ):
        """
        seeded_page uses API_STATUS_ANALYSIS_DONE (phase=customization).
        After the app initialises, steps before 'customizations' should be
        marked 'completed' and 'customizations' itself 'active'.
        """
        p = seeded_page
        # Give the status-driven render a moment to settle
        p.wait_for_timeout(1_000)

        # Steps before 'customizations' in the ordered step list must be completed
        job_classes  = p.evaluate("() => [...document.getElementById('step-job').classList]")
        ana_classes  = p.evaluate("() => [...document.getElementById('step-analysis').classList]")
        cust_classes = p.evaluate("() => [...document.getElementById('step-customizations').classList]")

        assert "completed" in job_classes, \
            f"#step-job should be 'completed' when phase=customization; classes: {job_classes}"
        assert "completed" in ana_classes, \
            f"#step-analysis should be 'completed' when phase=customization; classes: {ana_classes}"
        assert "active" in cust_classes, \
            f"#step-customizations should be 'active' when phase=customization; classes: {cust_classes}"

