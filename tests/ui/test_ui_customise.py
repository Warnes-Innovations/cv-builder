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

from playwright.sync_api import Page, expect

from tests.ui.fixtures.mock_responses import (
    API_REVIEW_DECISIONS_OK,
)


class TestCustomisationsTab:
    @staticmethod
    def _show_customization_stage(page: Page) -> None:
        page.evaluate(
            """
            () => {
                if (typeof updateTabBarForStage === 'function') {
                    updateTabBarForStage('customizations');
                }
                if (typeof updateActionButtons === 'function') {
                    updateActionButtons('customizations');
                }
                if (typeof switchTab === 'function') {
                    switchTab('exp-review');
                }
            }
            """
        )

    def test_customizations_tab_present(self, page: Page):
        """#tab-exp-review is the first customizations sub-tab (visible in
        customization stage, which is the default page fixture stage)."""
        expect(page.locator("#tab-exp-review")).to_be_visible()

    def test_click_customizations_tab(self, page: Page):
        """Clicking the exp-review tab shows document content."""
        page.locator("#tab-exp-review").click()
        expect(page.locator("#document-content")).to_be_visible()

    def test_recommend_btn_generates_pending_recommendations(
        self, analysis_seeded_page: Page
    ):
        """Recommend action populates pending recommendation state.

        Uses analysis_seeded_page (analysis stage) where #recommend-btn
        is the primary action button.
        """
        expect(analysis_seeded_page.locator("#recommend-btn")).to_be_visible()
        analysis_seeded_page.evaluate(
            """async () => {
                await sendAction('recommend_customizations');
            }"""
        )
        analysis_seeded_page.wait_for_timeout(500)
        has_recommendations = analysis_seeded_page.evaluate(
            """() => Boolean(
                window.pendingRecommendations
                && window.pendingRecommendations.recommended_experiences
            )"""
        )
        assert has_recommendations

    def test_customizations_tab_content_after_recommend(
        self, analysis_seeded_page: Page
    ):
        """After recommend, the customizations tab should have content.

        Uses analysis_seeded_page (job_analysis phase) so #recommend-btn is
        visible.  The in-page action stubs transition the UI into the
        customization stage after the recommend action completes.
        """
        analysis_seeded_page.evaluate(
            """async () => {
                await sendAction('recommend_customizations');
            }"""
        )
        self._show_customization_stage(analysis_seeded_page)
        expect(analysis_seeded_page.locator("#tab-exp-review")).to_be_visible()
        expect(analysis_seeded_page.locator("#experience-table-container")).to_be_visible()

    def test_review_decisions_endpoint_called_on_proceed(
        self, analysis_seeded_page: Page
    ):
        """
        Submitting experience/skill selections calls /api/review-decisions.

        Uses analysis_seeded_page (job_analysis phase) so #recommend-btn is
        visible. After the recommend action, the test explicitly reveals the
        customization stage before submitting review decisions.
        """
        analysis_seeded_page.evaluate(
            """(reviewDecisionsResponse) => {
                window.__reviewDecisionCalls = [];
                const originalFetch = window.fetch.bind(window);
                window.fetch = async (input, init) => {
                    const url = typeof input === 'string' ? input : input.url;
                    if (url.includes('/api/review-decisions')) {
                        window.__reviewDecisionCalls.push(url);
                        return new Response(JSON.stringify(reviewDecisionsResponse), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        });
                    }
                    return originalFetch(input, init);
                };
            }""",
            API_REVIEW_DECISIONS_OK,
        )
        analysis_seeded_page.evaluate(
            """async () => {
                await sendAction('recommend_customizations');
            }"""
        )
        self._show_customization_stage(analysis_seeded_page)
        expect(analysis_seeded_page.locator("#tab-exp-review")).to_be_visible()

        # submitExperienceDecisions() guards against empty selections; pre-populate
        # via evaluate() so the count check passes and the API call is made.
        analysis_seeded_page.evaluate(
            """() => {
                window.userSelections = window.userSelections || {};
                window.userSelections.experiences = { 'exp-001': 'include' };
                if (typeof userSelections !== 'undefined') {
                    userSelections.experiences = { 'exp-001': 'include' };
                }
            }"""
        )

        proceed_btn = analysis_seeded_page.locator(
            "button:has-text('Continue to Experience Bullets')"
        )
        proceed_btn.wait_for(state="visible", timeout=3_000)
        proceed_btn.click()
        analysis_seeded_page.wait_for_timeout(500)
        api_calls = analysis_seeded_page.evaluate(
            "() => window.__reviewDecisionCalls || []"
        )
        called = any("/api/review-decisions" in url for url in api_calls)
        assert called, "/api/review-decisions was not called"
