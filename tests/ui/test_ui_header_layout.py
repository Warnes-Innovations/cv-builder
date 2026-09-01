# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
UI tests — Header layout with a long position name.

Regression coverage for a real bug found via manual testing (not caught by
any existing test): a long position name made the top header bar wrap
across many lines, since (a) the sidebar "Current session: ..." subtitle
repeated the full position name with no length limit, and (b) the
session-switcher button's label had no truncation, so both grew unbounded
and pushed/wrapped the whole header row.

This is exactly the class of bug jsdom-based vitest tests structurally
cannot catch (no real layout/box-model engine) — it requires a real
browser, which is what this Playwright suite provides. Nothing in the
existing UI test suite checked element geometry/overflow before this file.
"""

from playwright.sync_api import Page

_LONG_POSITION_NAME = (
    "Open Rank Professor of Computer Science and Mathematics "
    "at Southern Virginia University"
)


def _set_session_header(page: Page, position_name: str, phase: str = "final_generation") -> None:
    """Call the real header-update function directly with a long position name."""
    page.evaluate(
        """
        ({ positionName, phase }) => {
            if (typeof _updateSessionSwitcherHeader === 'function') {
                _updateSessionSwitcherHeader({ position_name: positionName, phase });
            }
        }
        """,
        {"positionName": position_name, "phase": phase},
    )


class TestHeaderDoesNotWrapForLongPositionNames:
    def test_session_switcher_label_stays_on_one_line(self, page: Page):
        _set_session_header(page, _LONG_POSITION_NAME)
        box = page.locator("#session-switcher-label").bounding_box()
        assert box is not None
        # A single line of this font-size is well under 30px tall; multiple
        # wrapped lines would push this well past that.
        assert box["height"] < 30, (
            f"session-switcher-label wrapped to multiple lines (height={box['height']})"
        )

    def test_session_switcher_label_is_truncated_not_overflowing(self, page: Page):
        _set_session_header(page, _LONG_POSITION_NAME)
        overflowing = page.evaluate(
            """
            () => {
                const el = document.getElementById('session-switcher-label');
                return el.scrollWidth > el.clientWidth;
            }
            """
        )
        # scrollWidth > clientWidth confirms the CSS ellipsis/overflow rule is
        # actually engaged (content is wider than the box), i.e. the long
        # text is being truncated rather than allowed to grow the button.
        assert overflowing is True

    def test_sidebar_subtitle_does_not_repeat_the_full_position_name(self, page: Page):
        _set_session_header(page, _LONG_POSITION_NAME)
        subtitle_text = page.locator("#header-session-name").inner_text()
        assert _LONG_POSITION_NAME not in subtitle_text

    def test_sidebar_subtitle_stays_on_one_line(self, page: Page):
        _set_session_header(page, _LONG_POSITION_NAME)
        box = page.locator("#header-session-name").bounding_box()
        assert box is not None
        assert box["height"] < 25, (
            f"header-session-name wrapped to multiple lines (height={box['height']})"
        )
