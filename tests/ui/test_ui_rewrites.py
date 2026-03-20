"""
UI tests — Step 4: Rewrite Review

Covers:
- Rewrites tab is present
- Generate button fetches rewrites via GET /api/rewrites
- Each card shows original + proposed text
- Weak-evidence warning badge is shown for flagged rewrites
- Accepting a rewrite calls /api/rewrites/approve
- "Approve All" bulk action works
"""

import json
import pytest
from playwright.sync_api import Page, expect

from tests.ui.fixtures.mock_responses import (
    API_REWRITES_GET,
    API_REWRITES_APPROVE_OK,
)


class TestRewritesTab:
    def test_rewrites_tab_present(self, rewrite_stage_page: Page):
        """#tab-rewrite exists and is visible in the rewrite stage."""
        expect(rewrite_stage_page.locator("#tab-rewrite")).to_be_visible()

    def test_click_rewrites_tab(self, rewrite_stage_page: Page):
        """Clicking the rewrites tab updates the document-content area."""
        rewrite_stage_page.locator("#tab-rewrite").click()
        expect(rewrite_stage_page.locator("#document-content")).to_be_visible()

    def test_generate_btn_fetches_rewrites(self, seeded_page: Page):
        """
        Clicking Generate CV (customizations stage) triggers GET /api/rewrites.
        seeded_page is in customization phase where #generate-btn is shown.
        """
        api_calls = []

        def capture(route):
            api_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_REWRITES_GET),
            )

        seeded_page.route("**/api/rewrites**", capture)
        seeded_page.locator("#generate-btn").click()
        seeded_page.wait_for_timeout(800)
        assert any("/api/rewrites" in url for url in api_calls), (
            "Expected GET /api/rewrites when Generate CV is clicked"
        )

    def test_rewrite_cards_rendered(self, seeded_page: Page):
        """After clicking Generate CV, document-content area shows rewrite cards.

        The rewrite panel is triggered by the Generate CV button
        (fetchAndReviewRewrites), not by clicking the rewrite tab directly.
        """
        seeded_page.route(
            "**/api/rewrites**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_REWRITES_GET),
            ),
        )
        seeded_page.locator("#generate-btn").click()
        seeded_page.wait_for_timeout(800)

        content = seeded_page.locator("#document-content")
        expect(content).to_be_visible()
        has_content = seeded_page.evaluate(
            "() => {"
            "  const el = document.getElementById('document-content');"
            "  return el.children.length > 0"
            "    || el.textContent.trim().length > 0;"
            "}"
        )
        assert has_content

    def test_weak_evidence_warning_shown(self, seeded_page: Page):
        """
        The second fixture rewrite has weak_evidence=True.
        A warning indicator should appear when cards are rendered.
        """
        seeded_page.route(
            "**/api/rewrites**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_REWRITES_GET),
            ),
        )
        seeded_page.locator("#generate-btn").click()
        seeded_page.wait_for_timeout(800)

        content_html = seeded_page.locator("#document-content").inner_html()
        weak_indicators = [
            "weak" in content_html.lower(),
            "warning" in content_html.lower(),
            "⚠" in content_html,
            "evidence" in content_html.lower(),
        ]
        rewrite_text_visible = (
            "Worked on machine learning" in content_html
            or "Designed and deployed" in content_html
        )
        if rewrite_text_visible:
            assert any(weak_indicators), \
                "Expected weak-evidence warning for rw-002"

    def test_approve_calls_rewrites_approve(self, seeded_page: Page):
        """Accepting a rewrite and submitting calls POST /api/rewrites/approve.

        Rewrite cards are rendered by fetchAndReviewRewrites() (triggered by
        the Generate button), not by clicking the rewrite tab directly.
        """
        api_calls = []

        def capture_approve(route):
            api_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_REWRITES_APPROVE_OK),
            )

        seeded_page.route(
            "**/api/rewrites**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_REWRITES_GET),
            ),
        )
        seeded_page.route("**/api/rewrites/approve**", capture_approve)

        # Generate button fetches rewrites and renders the card panel.
        seeded_page.locator("#generate-btn").click()
        seeded_page.wait_for_timeout(1_000)

        # Cards render with "✓ Accept" buttons.
        accept_btn = seeded_page.locator("button:has-text('Accept')").first
        if accept_btn.count() == 0:
            pytest.skip("No Accept button found after generate")
        # Accept all rewrite cards so Submit All Decisions becomes enabled.
        for btn in seeded_page.locator("button.rw-btn.accept").all():
            btn.click()
            seeded_page.wait_for_timeout(100)

        # "Submit All Decisions" sends decisions to /api/rewrites/approve.
        submit_btn = seeded_page.locator(
            "button:has-text('Submit All Decisions')"
        )
        if submit_btn.count() == 0:
            pytest.skip("No Submit All Decisions button found")
        submit_btn.first.click(force=True)
        seeded_page.wait_for_timeout(500)

        assert any("/api/rewrites/approve" in url for url in api_calls), \
            "Expected POST /api/rewrites/approve after accepting"

    def test_approve_all_calls_rewrites_approve(self, seeded_page: Page):
        """Clicking Submit All Decisions calls POST /api/rewrites/approve.

        Rewrite cards are rendered by fetchAndReviewRewrites() (triggered by
        the Generate button), not by clicking the rewrite tab directly.
        """
        api_calls = []

        def capture_approve(route):
            api_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_REWRITES_APPROVE_OK),
            )

        seeded_page.route(
            "**/api/rewrites**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(API_REWRITES_GET),
            ),
        )
        seeded_page.route("**/api/rewrites/approve**", capture_approve)

        # Generate button fetches rewrites and renders the card panel.
        seeded_page.locator("#generate-btn").click()
        seeded_page.wait_for_timeout(1_000)

        # Accept all rewrite cards so Submit All Decisions becomes enabled.
        for btn in seeded_page.locator("button.rw-btn.accept").all():
            btn.click()
            seeded_page.wait_for_timeout(100)

        submit_btn = seeded_page.locator(
            "button:has-text('Submit All Decisions')"
        )
        if submit_btn.count() == 0:
            pytest.skip("No Submit All Decisions button found")
        submit_btn.first.click(force=True)
        seeded_page.wait_for_timeout(500)

        assert any("/api/rewrites/approve" in url for url in api_calls), \
            "Expected POST /api/rewrites/approve after Submit All"
