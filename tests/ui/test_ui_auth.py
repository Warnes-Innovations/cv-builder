# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
UI tests — Copilot OAuth Authentication

Covers:
- Auth badge is visible in the header
- Clicking the badge opens the auth modal (async: status → start → show)
- Modal shows device code area
- Cancel/close button dismisses the modal
- Auth badge reflects authenticated state
"""

import json
import pytest
from playwright.sync_api import Page, expect


def _open_modal(page: Page) -> None:
    """Click the auth badge and wait for the modal to become visible."""
    page.locator("#copilot-auth-badge").click()
    # openCopilotAuthModal is async: checks status then calls /start before
    # showing the overlay — wait for the overlay to actually appear.
    page.locator("#auth-modal-overlay").wait_for(state="visible", timeout=5000)


class TestAuthBadge:
    def test_auth_badge_present(self, page: Page):
        expect(page.locator("#copilot-auth-badge")).to_be_visible()

    def test_auth_badge_shows_unauthenticated(self, page: Page):
        """Badge shows unauthenticated state when status mock returns false."""
        badge = page.locator("#copilot-auth-badge")
        expect(badge).to_be_visible()
        badge_text = badge.inner_text().lower()
        badge_class = badge.get_attribute("class") or ""
        is_unauthenticated = (
            "not authenticated" in badge_text
            or "unauthenticated" in badge_class
            or "⚠" in badge_text
        )
        assert is_unauthenticated, \
            f"Badge should show unauthenticated. Got: '{badge_text}'"

    def test_auth_badge_label_present(self, page: Page):
        expect(page.locator("#auth-badge-label")).to_be_visible()

    def test_auth_badge_icon_present(self, page: Page):
        expect(page.locator("#auth-badge-icon")).to_be_visible()


class TestAuthModal:
    def test_auth_modal_overlay_in_dom(self, page: Page):
        """The auth modal overlay element exists in the DOM."""
        assert page.locator("#auth-modal-overlay").count() > 0

    def test_click_badge_opens_modal(self, page: Page):
        """Clicking the auth badge opens the authentication modal."""
        _open_modal(page)
        expect(page.locator("#auth-modal-overlay")).to_be_visible()

    def test_modal_shows_device_code_area(self, page: Page):
        """Auth modal contains the device code display area."""
        _open_modal(page)
        expect(page.locator("#auth-user-code")).to_be_visible()

    def test_modal_has_cancel_button(self, page: Page):
        """Auth modal has a cancel/close button."""
        _open_modal(page)
        cancel = page.locator(
            "button:has-text('Cancel'), .auth-btn-secondary"
        )
        assert cancel.count() > 0, "Cancel button should be in auth modal"

    def test_cancel_closes_modal(self, page: Page):
        """Clicking Cancel closes the auth modal."""
        _open_modal(page)
        cancel = page.locator(
            "button:has-text('Cancel'), .auth-btn-secondary"
        )
        if cancel.count() == 0:
            pytest.skip("No Cancel button in auth modal")
        cancel.first.click()
        page.locator("#auth-modal-overlay").wait_for(
            state="hidden", timeout=5000
        )
        assert not page.locator("#auth-modal-overlay").is_visible(), \
            "Modal should be hidden after Cancel"

    def test_auth_start_btn_present_in_modal(self, page: Page):
        """Auth modal has an 'Open GitHub' button."""
        _open_modal(page)
        btn = page.locator("#auth-open-btn, button:has-text('Open GitHub')")
        assert btn.count() > 0, \
            "Open GitHub button should be in auth modal"

    def test_badge_click_calls_copilot_start(self, page: Page):
        """
        Clicking the badge calls /api/copilot-auth/start automatically
        (openCopilotAuthModal fetches the device code before showing the modal).
        """
        start_calls = []

        def capture(route):
            start_calls.append(route.request.url)
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "user_code": "ABCD-1234",
                    "verification_uri": "https://github.com/login/device",
                    "interval": 5,
                    "expires_in": 900,
                }),
            )

        page.route("**/api/copilot-auth/start**", capture)
        _open_modal(page)
        assert any("/api/copilot-auth/start" in url for url in start_calls), \
            "/api/copilot-auth/start was not called on badge click"
