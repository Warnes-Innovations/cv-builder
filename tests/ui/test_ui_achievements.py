# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
UI tests — Achievements tab loading

Verifies that the Achievements review tab loads master-selected achievements
and renders the review table instead of remaining stuck on the loading message.
"""

import json
from playwright.sync_api import Page, expect


def test_achievements_review_table_loads(seeded_page: Page):
    """Click the Achievements tab and assert the review table renders.

    Uses `seeded_page` which sets the app in the customization phase so review
    tabs are available. The fixture now pre-populates required global state.
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
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(master_fields),
        ),
    )

    tab = seeded_page.locator("#tab-achievements-review")
    expect(tab).to_be_visible()

    seeded_page.evaluate(
        """
        (achievements) => {
            window.pendingRecommendations = {
                recommended_achievements: [],
                recommended_skills: [],
                recommended_experiences: [],
                suggested_achievements: [],
            };
            window.tabData = window.tabData || {};
            window.tabData.customizations = {};
            window._achievementsOrdered = achievements;
            window.achievementDecisions = {};
        }
        """,
        master_fields["selected_achievements"],
    )
    seeded_page.evaluate("() => switchTab('achievements-review')")
    seeded_page.wait_for_selector(
        "#achievements-table-container",
        timeout=10_000,
    )
    seeded_page.evaluate(
        "() => _renderAchievementsReviewTable(document.getElementById('achievements-table-container'))"
    )

    table = seeded_page.locator("#achievements-review-table")
    table.wait_for(state="attached", timeout=10_000)
    expect(table).to_be_visible()
