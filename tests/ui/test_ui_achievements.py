"""
UI tests — Achievements tab loading

Verifies that the Achievements review tab loads master-selected achievements
and renders the review table instead of remaining stuck on the loading message.
"""

import json
import pytest
from playwright.sync_api import Page, expect


def test_achievements_review_table_loads(seeded_page: Page):
    """Click the Achievements tab and assert the review table renders.

    Uses `seeded_page` which sets the app in the customization phase so review
    tabs are available.  Mocks `/api/master-fields` to return a small set of
    `selected_achievements` and asserts that `#achievements-review-table`
    is inserted into the DOM.
    """

    master_fields = {
        "selected_achievements": [
            {"id": "ach-001", "title": "Improved model accuracy", "description": "Increased accuracy by 12%", "importance": 8},
            {"id": "ach-002", "title": "Reduced latency", "description": "Cut inference latency by 40%", "importance": 7},
        ]
    }

    # Route master-fields to return sample achievements
    seeded_page.route(
        "**/api/master-fields",
        lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(master_fields)),
    )

    # Ensure no prior pendingRecommendations will block rendering
    seeded_page.evaluate("() => { window.pendingRecommendations = window.pendingRecommendations || {}; }")

    # Click achievements review tab and wait for table
    tab = seeded_page.locator("#tab-achievements-review")
    expect(tab).to_be_visible()
    tab.click()

    # Wait a short while for the loader to be replaced
    seeded_page.wait_for_timeout(500)

    # The table should be present
    table = seeded_page.locator("#achievements-review-table")
    expect(table).to_be_visible()
