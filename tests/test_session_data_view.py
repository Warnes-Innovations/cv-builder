# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Tests for session/master overlay resolution helpers."""

from scripts.utils.session_data_view import SessionDataView


def test_professional_summaries_overlay_session_variants() -> None:
    view = SessionDataView(
        master_data={"professional_summaries": {"default": "Master summary"}},
        session_state={"session_summaries": {"ai_generated": "Session summary"}},
    )

    assert view.professional_summaries() == {
        "default": "Master summary",
        "ai_generated": "Session summary",
    }


def test_selected_summary_prefers_explicit_customization_text() -> None:
    view = SessionDataView(
        master_data={"professional_summaries": {"default": "Master summary"}},
        session_state={
            "session_summaries": {"targeted": "Session targeted"},
            "summary_focus_override": "targeted",
        },
        customizations={"selected_summary": "Pinned summary"},
    )

    assert view.selected_summary() == "Pinned summary"


def test_materialize_summary_selection_uses_session_focus_when_customizations_lack_it() -> None:
    view = SessionDataView(
        master_data={"professional_summaries": {"default": "Master summary"}},
        session_state={
            "session_summaries": {"targeted": "Session targeted"},
            "summary_focus_override": "targeted",
        },
        customizations={"approved_skills": ["Python"]},
    )

    materialized = view.materialize_summary_selection()

    assert materialized["summary_focus"] == "targeted"
    assert materialized["selected_summary"] == "Session targeted"
    assert materialized["session_summaries"] == {"targeted": "Session targeted"}


def test_selected_achievements_overlay_session_edits_and_removals() -> None:
    view = SessionDataView(
        master_data={
            "selected_achievements": [
                {"id": "ach-1", "title": "Original", "description": "Keep"},
                {"id": "ach-2", "title": "Remove me"},
            ]
        },
        session_state={
            "achievement_overrides": {
                "ach-1": {"title": "Edited"},
                "ach-3": {"title": "Session only"},
            },
            "removed_achievement_ids": ["ach-2"],
        },
    )

    assert view.selected_achievements() == [
        {"id": "ach-1", "title": "Edited", "description": "Keep"},
        {"id": "ach-3", "title": "Session only"},
    ]


def test_normalized_skills_apply_session_group_overrides() -> None:
    view = SessionDataView(
        master_data={
            "skills": [
                {"name": "Python", "group": "backend"},
                {"name": "SQL", "experiences": ["exp_1"]},
            ]
        },
        session_state={"skill_group_overrides": {"Python": "scripting", "SQL": None}},
    )

    assert view.normalized_skills() == [
        {"name": "Python", "group": "scripting"},
        {"name": "SQL", "experiences": ["exp_1"]},
    ]


def test_materialize_customizations_includes_non_summary_session_overlays() -> None:
    view = SessionDataView(
        master_data={},
        session_state={
            "achievement_overrides": {"ach-1": {"title": "Edited"}},
            "removed_achievement_ids": ["ach-2"],
            "skill_group_overrides": {"Python": "scripting"},
        },
        customizations={"approved_skills": ["Python"]},
    )

    materialized = view.materialize_customizations()

    assert materialized["achievement_overrides"] == {"ach-1": {"title": "Edited"}}
    assert materialized["removed_achievement_ids"] == ["ach-2"]
    assert materialized["skill_group_overrides"] == {"Python": "scripting"}