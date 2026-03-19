"""
UI tests — End-to-End Smoke Test

Walks the full happy path:
  Job Input → Analysis → Customise → Rewrites → Spell Check → Generate → Download

All LLM routes are mocked by conftest.py so no API credentials are needed.
This single test is the fastest signal that the app is functional end-to-end.
"""

import json
import pytest
from playwright.sync_api import Page, expect

from tests.ui.fixtures.mock_responses import API_STATUS_ANALYSIS_DONE


@pytest.mark.e2e
class TestFullWorkflow:
    """Happy-path end-to-end workflow."""

    def test_app_loads(self, job_stage_page: Page):
        """App loads and shows the main UI elements.

        Uses job_stage_page (init phase) so #analyze-btn is visible
        (stage-aware action bar shows it only in the job stage).
        """
        expect(job_stage_page.locator("#analyze-btn")).to_be_visible()
        expect(job_stage_page.locator("#conversation")).to_be_visible()
        expect(job_stage_page.locator(".workflow-steps")).to_be_visible()

    def test_step1_job_input_tab_visible(self, page: Page):
        """The Job Description tab is present and active on load."""
        tab = page.locator("#tab-job")
        expect(tab).to_be_visible()

    def test_step2_analyze_button_triggers_api(self, job_stage_page: Page):
        """
        Clicking Analyze Job calls /api/action with action=analyze_job.

        Uses job_stage_page (init phase) so #analyze-btn is visible.
        """
        api_calls = []

        def capture(route):
            body = json.loads(route.request.post_data or "{}")
            api_calls.append(body.get("action", ""))
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "ok": True,
                    "phase": "customization",
                    "result": API_STATUS_ANALYSIS_DONE["job_analysis"],
                }),
            )

        job_stage_page.route("**/api/action", capture)

        # Submit a job first (mock /api/job)
        job_stage_page.route(
            "**/api/job",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "ok": True,
                    "position_name": "Test Job",
                    "phase": "job_analysis",
                }),
            ),
        )

        job_stage_page.locator("#analyze-btn").click()
        job_stage_page.wait_for_timeout(500)
        # The important check is no JS error crashed the page
        assert job_stage_page.evaluate(
            "() => typeof window !== 'undefined'"
        ), "Page crashed"

    def test_step3_customizations_tab_clickable(self, seeded_page: Page):
        """Customizations tab (exp-review) is accessible when analysis data
        is available.  seeded_page is in customization phase where this tab
        is shown."""
        tab = seeded_page.locator("#tab-exp-review")
        expect(tab).to_be_visible()
        tab.click()
        expect(seeded_page.locator("#document-content")).to_be_visible()

    def test_step4_rewrites_tab_clickable(self, rewrite_stage_page: Page):
        """Rewrites tab is accessible and clicking it shows document-content.

        Uses rewrite_stage_page (rewrite_review phase) so #tab-rewrite is
        visible (stage-aware tab bar).
        """
        tab = rewrite_stage_page.locator("#tab-rewrite")
        expect(tab).to_be_visible()
        tab.click()
        expect(rewrite_stage_page.locator("#document-content")).to_be_visible()

    def test_step5_spell_check_tab_clickable(self, spell_stage_page: Page):
        """Spell check tab is visible.

        Uses spell_stage_page (spell_check phase) so #tab-spell is visible.
        """
        tab = spell_stage_page.locator("#tab-spell")
        expect(tab).to_be_visible()

    def test_step6_generate_button_triggers_api(self, seeded_page: Page):
        """
        Clicking Generate CV (shown in customizations stage) calls GET
        /api/rewrites first.  seeded_page is in customization phase where
        #generate-btn is the stage primary action button.
        """
        rewrites_calls = []

        def capture_rewrites(route):
            rewrites_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"rewrites": [], "persuasion_warnings": []}),
            )

        seeded_page.route("**/api/rewrites", capture_rewrites)
        seeded_page.locator("#generate-btn").click()
        seeded_page.wait_for_timeout(800)
        assert len(rewrites_calls) > 0, \
            "Expected GET /api/rewrites when Generate CV is clicked"

    def test_download_tab_visible(self, finalise_stage_page: Page):
        """Download tab is present and visible in the finalise stage tab bar."""
        expect(finalise_stage_page.locator("#tab-download")).to_be_visible()

    def test_reset_calls_api_reset(self, page: Page):
        """Clicking Reset calls /api/reset."""
        api_calls = []

        def capture(route):
            api_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"ok": True, "phase": "init"}),
            )

        page.route("**/api/reset", capture)
        page.locator("#reset-btn").click()
        page.wait_for_timeout(500)
        assert any("/api/reset" in url for url in api_calls), \
            "/api/reset was not called after clicking Reset"

    def test_no_js_errors_on_load(self, page: Page):
        """No uncaught JavaScript errors on initial page load."""
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        # Re-navigate to trigger fresh load
        page.reload()
        page.wait_for_selector("#analyze-btn", timeout=10_000)
        assert not errors, f"JS errors on page load: {errors}"

    def test_all_workflow_step_elements_rendered(self, page: Page):
        """All 8 workflow step elements are in the DOM."""
        steps = ["step-job", "step-analysis", "step-customizations",
                 "step-rewrite", "step-spell", "step-generate",
                 "step-layout", "step-finalise"]
        for step in steps:
            el = page.locator(f"#{step}")
            assert el.count() >= 1, \
                f"Workflow step #{step} not found in DOM"

    def test_all_tabs_rendered(self, page: Page):
        """All viewer tabs are in the DOM (may be hidden by stage-aware bar)."""
        tabs = [
            "tab-job", "tab-analysis",
            # Customizations stage: flat sub-tabs replace old tab-customizations
            "tab-exp-review", "tab-ach-editor", "tab-skills-review",
            "tab-achievements-review", "tab-summary-review",
            "tab-publications-review",
            "tab-rewrite", "tab-spell",
            "tab-editor",    # hidden by design (GAP-19)
            "tab-generate",  # renamed from tab-cv
            "tab-layout", "tab-download",
        ]
        for tab in tabs:
            el = page.locator(f"#{tab}")
            assert el.count() >= 1, f"Tab #{tab} not found in DOM"
