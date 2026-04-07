# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
UI tests — LLM Configuration Wizard & Auth

Covers:
- The LLM status pill is visible in the header
- Clicking the model-selector button opens the wizard overlay
- Navigating to step 2 with copilot-oauth shows the auth panel
- The auth panel contains the device-code area and start-signin button
- Clicking Start Sign-In calls POST /api/copilot-auth/start and shows the code
- The wizard close button dismisses the overlay
"""

import json
import pytest
from playwright.sync_api import Page, expect


# ---------------------------------------------------------------------------
# Mock responses for wizard API routes
# ---------------------------------------------------------------------------

_WIZARD_MODEL_RESPONSE = {
    "ok": True,
    "provider": "copilot-oauth",
    "model": "gpt-4o",
    "providers": ["copilot-oauth", "openai", "github"],
    "list_models_capable": [],
    "available": [],
    "all_models": [],
}

_WIZARD_CATALOG_RESPONSE = {
    "ok": True,
    "all_models": [
        {
            "provider":        "copilot-oauth",
            "model":           "gpt-4o-copilot",
            "context_window":  128000,
            "source":          "fallback_static",
        },
    ],
    "providers":          ["copilot-oauth"],
    "list_models_capable": [],
    "pricing_updated_at": "2026-04-07T00:00:00Z",
    "pricing_source":     "static",
}


def _json_route(route, body, status=200):
    route.fulfill(
        status=status,
        content_type="application/json",
        body=json.dumps(body),
    )


def _install_wizard_routes(page: Page) -> None:
    """Add mock routes required by the LLM config wizard."""

    def handle_model_routes(route):
        url = route.request.url
        if "model-catalog" in url:
            _json_route(route, _WIZARD_CATALOG_RESPONSE)
        elif "/api/model" in url:
            _json_route(route, _WIZARD_MODEL_RESPONSE)
        else:
            route.continue_()

    # Register as one handler to avoid the **/api/model** glob matching catalog.
    page.route("**/api/model**", handle_model_routes)
    page.route("**/api/copilot-auth/poll**", lambda r: _json_route(r, {"ok": True}))


def _open_wizard(page: Page) -> None:
    """Click the LLM model-selector button and wait for the wizard overlay."""
    page.locator("#model-selector-btn").click()
    page.locator("#model-modal-overlay").wait_for(state="visible", timeout=5_000)


def _navigate_to_copilot_auth_step(page: Page) -> None:
    """
    Open the wizard, choose copilot-oauth, advance to step 2.

    Step 2 loads models for the selected provider and shows the GitHub
    Copilot authorization panel when copilot-oauth is active.
    """
    _open_wizard(page)
    # Select the copilot-oauth radio in the provider list
    page.locator(
        '#model-provider-list input[type="radio"][value="copilot-oauth"]'
    ).click()
    # Next button loads models then switches to step 2
    page.locator("#model-wizard-next-btn").click()
    # Auth panel only becomes visible once the provider models are loaded
    page.locator("#model-auth-panel").wait_for(state="visible", timeout=8_000)


# ---------------------------------------------------------------------------
# Status pill (replaces the old "auth badge")
# ---------------------------------------------------------------------------

class TestLlmStatusPill:
    def test_model_selector_btn_present(self, page: Page):
        """The LLM model-selector button is visible in the header."""
        expect(page.locator("#model-selector-btn")).to_be_visible()

    def test_status_pill_shows_not_ready(self, page: Page):
        """Status pill reflects not-ready / unauthenticated state on load."""
        pill = page.locator("#llm-status-pill")
        expect(pill).to_be_visible()
        pill_class = pill.get_attribute("class") or ""
        pill_text  = pill.inner_text().lower()
        is_not_ready = (
            "unauthenticated" in pill_class
            or "unconfigured"  in pill_class
            or "⚠"             in pill_text
            or "not ready"     in pill_text
            or "not configured" in pill_text
        )
        assert is_not_ready, (
            f"Pill should show not-ready state. class={pill_class!r}, text={pill_text!r}"
        )

    def test_status_pill_label_present(self, page: Page):
        expect(page.locator("#llm-status-label")).to_be_visible()

    def test_status_pill_icon_present(self, page: Page):
        expect(page.locator("#llm-status-icon")).to_be_visible()


# ---------------------------------------------------------------------------
# LLM Config Wizard (integration — navigates the full flow)
# ---------------------------------------------------------------------------

class TestModelWizard:
    def test_model_wizard_overlay_in_dom(self, page: Page):
        """The wizard overlay element exists in the DOM before it is opened."""
        assert page.locator("#model-modal-overlay").count() > 0

    def test_click_selector_btn_opens_wizard(self, page: Page):
        """Clicking the LLM selector button opens the wizard overlay."""
        _install_wizard_routes(page)
        _open_wizard(page)
        expect(page.locator("#model-modal-overlay")).to_be_visible()

    def test_wizard_has_close_button(self, page: Page):
        """Wizard has a close button in the modal header."""
        _install_wizard_routes(page)
        _open_wizard(page)
        close = page.locator(".modal-close-btn")
        assert close.count() > 0, "Close button should be in the wizard header"

    def test_close_wizard_dismisses_overlay(self, page: Page):
        """Clicking the close button hides the wizard overlay."""
        _install_wizard_routes(page)
        _open_wizard(page)
        page.locator(".modal-close-btn").click()
        page.locator("#model-modal-overlay").wait_for(state="hidden", timeout=5_000)
        assert not page.locator("#model-modal-overlay").is_visible(), \
            "Wizard overlay should be hidden after close"

    def test_wizard_step2_shows_auth_panel_for_copilot_oauth(self, page: Page):
        """Step 2 reveals the Copilot auth panel when copilot-oauth is selected."""
        _install_wizard_routes(page)
        _navigate_to_copilot_auth_step(page)
        expect(page.locator("#model-auth-panel")).to_be_visible()

    def test_wizard_auth_step_has_device_code_area(self, page: Page):
        """Auth panel contains the device-code element (populated after sign-in starts)."""
        _install_wizard_routes(page)
        _navigate_to_copilot_auth_step(page)
        # #model-auth-code is in the DOM but starts empty; it fills once auth begins.
        assert page.locator("#model-auth-code").count() > 0, \
            "#model-auth-code element not found in the auth panel"

    def test_wizard_auth_step_has_start_signin_btn(self, page: Page):
        """Auth panel contains the Start Sign-In button."""
        _install_wizard_routes(page)
        _navigate_to_copilot_auth_step(page)
        expect(page.locator("#model-auth-start-btn")).to_be_visible()

    def test_start_signin_calls_copilot_start_and_shows_code(self, page: Page):
        """
        Clicking Start Sign-In calls POST /api/copilot-auth/start via the
        wizard and displays the returned device code in #model-auth-code.
        """
        start_calls = []

        def capture_start(route):
            start_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "user_code":         "ABCD-1234",
                    "verification_uri":  "https://github.com/login/device",
                    "interval":          5,
                    "expires_in":        900,
                }),
            )

        _install_wizard_routes(page)
        page.route("**/api/copilot-auth/start**", capture_start)

        _navigate_to_copilot_auth_step(page)
        page.locator("#model-auth-start-btn").click()
        page.wait_for_timeout(1_000)

        assert any("/api/copilot-auth/start" in url for url in start_calls), \
            "/api/copilot-auth/start was not called when Start Sign-In was clicked"

        code_text = page.locator("#model-auth-code").inner_text()
        assert "ABCD-1234" in code_text, \
            f"Device code not shown in #model-auth-code; got: {code_text!r}"

