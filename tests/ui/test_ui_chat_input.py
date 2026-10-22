# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
UI tests — chat box accepts multi-line prompts.

Covers, with real key presses in the browser:
- Default "Enter sends": Shift+Enter adds a line, Enter sends, and the sent
  message keeps its line breaks.
- Unchecking "Enter sends": Enter adds a line, Ctrl+Enter sends.
- The choice is remembered across a reload.
"""

import re

from playwright.sync_api import Page, expect


def _last_user_message(page: Page):
    return page.locator("#conversation .message.user .content").last


class TestMultiLineChatInput:
    def test_shift_enter_adds_line_and_enter_sends(self, page: Page):
        box = page.locator("#message-input")
        expect(page.locator("#enter-sends-toggle")).to_be_checked()

        box.click()
        box.type("first line")
        box.press("Shift+Enter")
        box.type("second line")
        expect(box).to_have_value("first line\nsecond line")

        box.press("Enter")
        expect(box).to_have_value("")
        message = _last_user_message(page)
        expect(message).to_contain_text("first line")
        expect(message.locator("br")).to_have_count(1)
        expect(message).to_contain_text("second line")

    def test_enter_adds_line_when_toggle_off_and_ctrl_enter_sends(self, page: Page):
        page.locator("#enter-sends-toggle").uncheck()
        box = page.locator("#message-input")
        expect(box).to_have_attribute("placeholder", re.compile(r"Ctrl/⌘\+Enter to send"))

        box.click()
        box.type("alpha")
        box.press("Enter")
        box.type("beta")
        expect(box).to_have_value("alpha\nbeta")

        box.press("Control+Enter")
        expect(box).to_have_value("")
        expect(_last_user_message(page).locator("br")).to_have_count(1)

    def test_toggle_choice_survives_reload(self, page: Page):
        page.locator("#enter-sends-toggle").uncheck()
        page.reload()
        expect(page.locator("#enter-sends-toggle")).not_to_be_checked()
        page.locator("#enter-sends-toggle").check()   # restore the default
