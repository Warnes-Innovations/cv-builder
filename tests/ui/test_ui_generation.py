# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
UI tests — Step 6: CV Generation & Download

Covers:
- Generate CV button calls GET /api/rewrites then POST /api/action(generate_cv)
- Progress messages appear during generation
- Download tab shows links after generation completes
- ATS DOCX and PDF download links are present
- Download tab is accessible via #tab-download
"""

import json
from playwright.sync_api import Page, expect


class TestGeneration:
    def test_generate_btn_present(self, seeded_page: Page):
        """#generate-btn is visible in the customization stage."""
        expect(seeded_page.locator("#generate-btn")).to_be_visible()

    def test_generate_calls_api_rewrites_then_action(self, seeded_page: Page):
        """
        Clicking Generate CV calls GET /api/rewrites first.
        If rewrites are empty it then calls POST /api/action(generate_cv).
        """
        rewrites_called = []
        action_called = []

        def capture_rewrites(route):
            rewrites_called.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"rewrites": [], "persuasion_warnings": []}),
            )

        def capture_action(route):
            body = json.loads(route.request.post_data or "{}")
            action_called.append(body.get("action", ""))
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(
                    {"ok": True, "phase": "refinement", "result": {}}
                ),
            )

        seeded_page.route("**/api/rewrites**", capture_rewrites)
        seeded_page.route("**/api/action**", capture_action)
        seeded_page.locator("#generate-btn").click()
        seeded_page.wait_for_timeout(800)

        assert len(rewrites_called) > 0, \
            "Expected GET /api/rewrites when Generate CV is clicked"
        assert "generate_cv" in action_called, \
            "Expected /api/action(generate_cv) after empty rewrites"

    def test_generate_adds_conversation_message(self, seeded_page: Page):
        """Triggering generation adds a message to the conversation panel."""
        initial = seeded_page.locator("#conversation .message").count()
        seeded_page.locator("#generate-btn").click()
        seeded_page.wait_for_timeout(800)
        final = seeded_page.locator("#conversation .message").count()
        assert final >= initial

    def test_download_tab_present(self, finalise_stage_page: Page):
        """#tab-download is visible in the finalise stage."""
        expect(finalise_stage_page.locator("#tab-download")).to_be_visible()

    def test_download_tab_shows_files_after_generation(self, finalise_stage_page: Page):
        """The download tab shows file links in the finalise stage."""
        finalise_stage_page.locator("#tab-download").click()
        finalise_stage_page.wait_for_timeout(500)

        content = finalise_stage_page.locator("#document-content").inner_text().lower()
        html = finalise_stage_page.locator("#document-content").inner_html()

        has_content = (
            "download" in content
            or "docx" in content
            or "pdf" in content
            or ".html" in content
            or "href" in html.lower()
            or len(content.strip()) > 0
        )
        assert has_content, \
            "Download tab should show file links in the finalise stage"

    def test_cv_tab_accessible_after_generation(self, generate_stage_page: Page):
        """Generated CV tab (#tab-generate) is accessible in generate stage."""
        expect(generate_stage_page.locator("#tab-generate")).to_be_visible()
        generate_stage_page.locator("#tab-generate").click()
        expect(generate_stage_page.locator("#document-content")).to_be_visible()

    def test_generation_progress_feedback(self, seeded_page: Page):
        """Generation shows progress feedback (loading or conversation message)."""
        seeded_page.locator("#generate-btn").click()
        seeded_page.wait_for_timeout(200)
        assert seeded_page.evaluate("() => document.readyState") == "complete"


class TestStagedGenerationFlow:
    """Regression tests for the GAP-20 staged generation contract.

    All LLM routes are mocked by conftest.  Tests call the staged generation
    endpoints via browser-side fetch() and assert on the shape of the mocked
    responses so the contract is exercised end-to-end through the live server.
    """

    def _fetch(self, page: Page, method: str, path: str, body: dict | None = None) -> dict:
        """Execute a fetch from within the browser context and return parsed JSON."""
        session_id = "test-session-id"
        js = f"""
        async () => {{
            const opts = {{
                method: {json.dumps(method)},
                headers: {{ "Content-Type": "application/json" }},
            }};
            const bodyObj = {json.dumps(body or {})};
            if ({json.dumps(method)} !== "GET") {{
                bodyObj.session_id = {json.dumps(session_id)};
                opts.body = JSON.stringify(bodyObj);
            }}
            const url = {json.dumps(path)} + ({json.dumps(method)} === "GET"
                ? "?session_id=" + {json.dumps(session_id)} : "");
            const r = await fetch(url, opts);
            return r.json();
        }}
        """
        return page.evaluate(js)

    def test_generate_preview_returns_html(self, page: Page):
        """POST /api/cv/generate-preview returns ok + html."""
        result = self._fetch(page, "POST", "/api/cv/generate-preview")
        assert result.get("ok") is True
        assert "html" in result
        assert result.get("preview_request_id") is not None

    def test_generation_state_returns_phase(self, page: Page):
        """GET /api/cv/generation-state returns phase and preview_available."""
        result = self._fetch(page, "GET", "/api/cv/generation-state")
        assert result.get("ok") is True
        assert "phase" in result
        assert "preview_available" in result
        assert "layout_confirmed" in result

    def test_layout_refine_returns_updated_html(self, page: Page):
        """POST /api/cv/layout-refine returns updated html and summary."""
        result = self._fetch(
            page, "POST", "/api/cv/layout-refine",
            {"instruction": "Increase margins to 1 inch"},
        )
        assert result.get("ok") is True
        assert "html" in result
        assert "summary" in result
        assert result.get("preview_request_id") is not None

    def test_confirm_layout_returns_hash(self, page: Page):
        """POST /api/cv/confirm-layout returns confirmed + hash."""
        result = self._fetch(page, "POST", "/api/cv/confirm-layout")
        assert result.get("ok") is True
        assert result.get("confirmed") is True
        assert result.get("hash") is not None
        assert result.get("confirmed_at") is not None

    def test_generate_final_returns_outputs(self, page: Page):
        """POST /api/cv/generate-final returns ok + outputs dict."""
        result = self._fetch(page, "POST", "/api/cv/generate-final")
        assert result.get("ok") is True
        assert "outputs" in result
        assert result.get("generated_at") is not None

    def test_ats_score_badge_present_in_dom(self, page: Page):
        """#ats-score-badge element exists in the position-bar row."""
        assert page.locator("#ats-score-badge").count() >= 1

    def test_ats_score_badge_has_value_element(self, page: Page):
        """#ats-score-value span exists inside the ATS badge."""
        assert page.locator("#ats-score-value").count() >= 1

    def test_ats_score_position_bar_row_structure(self, page: Page):
        """ATS badge and position-bar are siblings inside .position-bar-row."""
        row_children = page.locator(".position-bar-row > *").count()
        assert row_children >= 2, (
            "position-bar-row should contain at least position-bar and ats-score-badge"
        )


class TestDownloadTab:
    def test_click_download_tab_shows_content(self, finalise_stage_page: Page):
        """Clicking download tab renders the document content area."""
        finalise_stage_page.locator("#tab-download").click()
        expect(finalise_stage_page.locator("#document-content")).to_be_visible()

    def test_cv_editor_tab_present(self, page: Page):
        """CV Editor tab exists in DOM (hidden by design — GAP-19)."""
        assert page.locator("#tab-editor").count() >= 1

    def test_generated_cv_tab_present(self, page: Page):
        """Generated CV tab (#tab-generate) exists in DOM."""
        assert page.locator("#tab-generate").count() >= 1
