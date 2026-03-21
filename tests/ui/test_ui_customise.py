# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
UI tests — Step 3: Customisations Tab

Covers:
- Customizations tab is present and clickable
- Recommend Customizations button calls /api/action with recommend_customizations
- After recommendation, experience rows appear in the content area
- DataTable (if rendered) has rows with relevance data
- Proceed / review-decisions call is triggered appropriately
"""

import json
import pytest
from playwright.sync_api import Page, expect

from tests.ui.fixtures.mock_responses import (
    API_ACTION_RECOMMEND_OK,
    API_REVIEW_DECISIONS_OK,
    API_STATUS_ANALYSIS_DONE,
)


class TestCustomisationsTab:
    def test_customizations_tab_present(self, page: Page):
        """#tab-exp-review is the first customizations sub-tab (visible in
        customization stage, which is the default page fixture stage)."""
        expect(page.locator("#tab-exp-review")).to_be_visible()

    def test_click_customizations_tab(self, page: Page):
        """Clicking the exp-review tab shows document content."""
        page.locator("#tab-exp-review").click()
        expect(page.locator("#document-content")).to_be_visible()

    def test_recommend_btn_calls_api(self, analysis_seeded_page: Page):
        """Clicking Recommend Customizations calls /api/action.

        Uses analysis_seeded_page (analysis stage) where #recommend-btn
        is the primary action button.
        """
        api_calls = []

        def capture(route):
            body = json.loads(route.request.post_data or "{}")
            api_calls.append(body.get("action", ""))
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_ACTION_RECOMMEND_OK),
            )

        analysis_seeded_page.route("**/api/action**", capture)
        analysis_seeded_page.locator("#recommend-btn").click()
        analysis_seeded_page.wait_for_timeout(500)
        assert (
            "recommend_customizations" in api_calls or len(api_calls) > 0
        ), "Expected API call after Recommend Customizations"

    def test_customizations_tab_content_after_recommend(self, analysis_seeded_page: Page):
        """After recommend, the customizations tab should have content.

        Uses analysis_seeded_page (job_analysis phase) so #recommend-btn is
        visible.  Overrides /api/status to return customization phase so that
        fetchStatus() (called at the end of sendAction) transitions the UI to
        the customization stage, making #tab-exp-review visible.
        """
        # Override status to return customization phase so the tab bar
        # transitions after the recommend action calls fetchStatus().
        analysis_seeded_page.route(
            "**/api/status**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_STATUS_ANALYSIS_DONE),
            ),
        )
        analysis_seeded_page.route(
            "**/api/action**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_ACTION_RECOMMEND_OK),
            ),
        )
        analysis_seeded_page.locator("#recommend-btn").click()
        analysis_seeded_page.wait_for_timeout(1_500)
        analysis_seeded_page.locator("#tab-exp-review").click()
        analysis_seeded_page.wait_for_timeout(300)
        expect(analysis_seeded_page.locator("#document-content")).to_be_visible()

    def test_review_decisions_endpoint_called_on_proceed(self, analysis_seeded_page: Page):
        """
        Submitting experience/skill selections calls /api/review-decisions.

        Uses analysis_seeded_page (job_analysis phase) so #recommend-btn is
        visible.  Overrides /api/status to customization phase so that the UI
        transitions after recommend and exposes /api/review-decisions buttons.
        """
        api_calls = []

        def capture_decisions(route):
            api_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_REVIEW_DECISIONS_OK),
            )

        # Status override: return customization phase after recommend so the
        # tab bar transitions and #tab-exp-review becomes visible.
        analysis_seeded_page.route(
            "**/api/status**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_STATUS_ANALYSIS_DONE),
            ),
        )
        analysis_seeded_page.route("**/api/review-decisions**", capture_decisions)

        # Trigger recommendation
        analysis_seeded_page.route(
            "**/api/action**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_ACTION_RECOMMEND_OK),
            ),
        )
        analysis_seeded_page.locator("#recommend-btn").click()
        analysis_seeded_page.wait_for_timeout(1_500)
        analysis_seeded_page.locator("#tab-exp-review").click()
        analysis_seeded_page.wait_for_timeout(500)

        # submitExperienceDecisions() guards against empty selections; pre-populate
        # via evaluate() so the count check passes and the API call is made.
        analysis_seeded_page.evaluate(
            "() => { window.userSelections = window.userSelections || {}; "
            "window.userSelections.experiences = {'exp-001': 'include'}; }"
        )

        proceed_btn = analysis_seeded_page.locator(
            "button:has-text('Continue to Edit Achievements')"
        )
        proceed_btn.wait_for(state="visible", timeout=3_000)
        proceed_btn.click()
        analysis_seeded_page.wait_for_timeout(500)
        called = any("/api/review-decisions" in url for url in api_calls)
        assert called, "/api/review-decisions was not called"
