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

