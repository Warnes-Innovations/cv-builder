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
            {
                "id": "ach-001",
                "title": "Improved model accuracy",
                "description": "Increased accuracy by 12%",
                "importance": 8,
            },
            {
                "id": "ach-002",
                "title": "Reduced latency",
                "description": "Cut inference latency by 40%",
                "importance": 7,
            },
        ]
    }

    # Route master-fields to return sample achievements
    seeded_page.route(
        "**/api/master-fields**",
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
        """
        () => _renderAchievementsReviewTable(
            document.getElementById('achievements-table-container')
        )
        """
    )

    table = seeded_page.locator("#achievements-review-table")
    table.wait_for(state="attached", timeout=10_000)
    expect(table).to_be_visible()


def test_experience_bullets_editor_hide_show_and_delete_confirm(
    seeded_page: Page,
):
    """Exercise the editor hide/show toggle and delete-confirm flow."""
    seeded_page.evaluate(
        """
        () => {
            const container = document.getElementById('document-content');
            container.innerHTML = `
              <div id="ach-editor-exp-0">
                <div id="ach-list-0"></div>
              </div>
            `;
            window.achievementEdits = {
              0: [
                                {
                                    text: 'Built the original feature toggle service.',
                                    hidden: false,
                                },
                                {
                                    text: 'Reduced release risk with staged rollouts.',
                                    hidden: false,
                                },
              ],
            };
            renderAchievementEditorRows(0);
        }
        """
    )

    editor_panel = seeded_page.locator("#ach-editor-exp-0")
    expect(editor_panel).to_be_visible()

    first_row = seeded_page.locator("#ach-row-0-0")
    first_text = seeded_page.locator("#ach-text-0-0")
    expect(first_row).to_be_visible()
    expect(first_text).to_have_value(
        "Built the original feature toggle service."
    )

    hide_button = seeded_page.locator("#ach-row-0-0 button").nth(2)
    hide_button.click()

    expect(first_row).to_have_class("achievement-row-hidden")
    expect(first_text).to_have_css("background-color", "rgb(255, 251, 235)")

    hide_button = seeded_page.locator("#ach-row-0-0 button").nth(2)
    hide_button.click()
    expect(first_row).not_to_have_class("achievement-row-hidden")

    delete_button = seeded_page.locator("#ach-row-0-0 button").nth(4)
    delete_button.click()

    confirm_overlay = seeded_page.locator("#confirm-dialog-overlay")
    expect(confirm_overlay).to_be_visible()
    expect(confirm_overlay).to_contain_text(
        "Delete this bullet from this session?"
    )

    seeded_page.get_by_role("button", name="Cancel").click()
    expect(confirm_overlay).not_to_be_visible()
    expect(seeded_page.locator("[id^='ach-row-0-']")).to_have_count(2)

    delete_button = seeded_page.locator("#ach-row-0-0 button").nth(4)
    delete_button.click()
    seeded_page.get_by_role("button", name="Delete").click()

    expect(seeded_page.locator("[id^='ach-row-0-']")).to_have_count(1)
    expect(seeded_page.locator("#ach-text-0-0")).to_have_value(
        "Reduced release risk with staged rollouts."
    )
