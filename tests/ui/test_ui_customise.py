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

import re

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

    def test_previous_next_buttons_step_through_tabs(self, page: Page):
        """Previous/Next move between Customise tabs in tab-bar order."""
        self._show_customization_stage(page)   # lands on Experiences
        nav = page.locator("#tab-step-nav")
        prev_btn = nav.locator('[data-dir="prev"]')
        next_btn = nav.locator('[data-dir="next"]')
        expect(nav).to_be_visible()
        expect(prev_btn).to_have_text(re.compile(r"^← .*Questions$"))
        expect(next_btn).to_have_text(re.compile(r"Experience Bullets →$"))

        next_btn.click()
        expect(page.locator("#tab-ach-editor")).to_have_class(re.compile(r"\bactive\b"))
        prev_btn.click()
        prev_btn.click()
        expect(page.locator("#tab-questions")).to_have_class(re.compile(r"\bactive\b"))

    def test_previous_next_stop_at_stage_ends(self, page: Page):
        """No Previous on the first tab, no Next on the last; none on one-tab stages."""
        self._show_customization_stage(page)
        nav = page.locator("#tab-step-nav")
        page.evaluate("() => switchTab('customise-guide')")
        expect(nav.locator('[data-dir="prev"]')).to_be_hidden()
        expect(nav.locator('[data-dir="next"]')).to_be_visible()
        page.evaluate("() => switchTab('ats-score')")
        expect(nav.locator('[data-dir="next"]')).to_be_hidden()
        page.evaluate("() => switchTab('job')")
        expect(nav).to_be_hidden()

    def test_tabs_have_no_one_off_back_buttons(self, analysis_seeded_page: Page):
        """The Previous/Next bar replaced the per-tab "← Back to …" buttons.

        Each tab must still render its Continue button (which saves the
        tab's decisions); that also keeps this test from passing on a tab
        that failed to render at all.
        """
        page = analysis_seeded_page
        page.evaluate("async () => { await sendAction('recommend_customizations'); }")
        self._show_customization_stage(page)
        # ach-editor (Experience Bullets) is not listed: this fixture's master
        # CV has no experiences, so that tab renders no buttons at all.
        for tab in ("skills-review", "achievements-review", "tagline-review",
                    "summary-review", "publications-review"):
            page.evaluate(f"() => switchTab('{tab}')")
            content = page.locator("#document-content")
            expect(content.locator(".continue-btn").first).to_be_visible()
            expect(content.locator(".back-btn")).to_have_count(0)
            expect(content).not_to_contain_text("← Back to")

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

    def test_recommend_lands_on_guide_tab(self, analysis_seeded_page: Page):
        """After recommend, the user lands on the Customisation Guide — the
        first tab of the Customise stage — rather than on a review sub-tab."""
        analysis_seeded_page.evaluate(
            """async () => {
                await sendAction('recommend_customizations');
            }"""
        )
        # The stubbed /api/status stays in job_analysis, so reveal the
        # customise stage's tab bar — but do NOT switchTab: which tab is
        # active must come from the app's own post-recommend landing.
        analysis_seeded_page.evaluate("() => updateTabBarForStage('customizations')")
        guide_tab = analysis_seeded_page.locator("#tab-customise-guide")
        expect(guide_tab).to_be_visible()
        expect(guide_tab).to_have_class(re.compile(r"\bactive\b"))
        first_visible = analysis_seeded_page.evaluate(
            """() => [...document.querySelectorAll('#tab-bar .tab')]
                     .find(t => t.style.display !== 'none').id"""
        )
        assert first_visible == "tab-customise-guide"
        expect(analysis_seeded_page.locator("#customizations-guide-tab")).to_be_visible()
        analysis_seeded_page.locator('[data-guide-target="exp-review"]').click()
        expect(analysis_seeded_page.locator("#tab-exp-review")).to_have_class(
            re.compile(r"\bactive\b")
        )

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
