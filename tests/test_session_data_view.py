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


def test_normalized_skills_apply_session_category_overrides() -> None:
    view = SessionDataView(
        master_data={
            "skills": {
                "programming": {
                    "category": "Programming",
                    "skills": [
                        {"name": "Python"},
                        "R",
                    ],
                }
            }
        },
        session_state={"skill_category_overrides": {"Python": "Data Science"}},
    )

    assert view.normalized_skills() == [
        {"name": "Python", "category": "Data Science"},
        {"name": "R", "category": "Programming"},
    ]


def test_materialize_customizations_includes_non_summary_session_overlays() -> None:
    view = SessionDataView(
        master_data={},
        session_state={
            "achievement_overrides": {"ach-1": {"title": "Edited"}},
            "removed_achievement_ids": ["ach-2"],
            "skill_group_overrides": {"Python": "scripting"},
            "skill_category_overrides": {"Python": "Programming"},
            "skill_category_order": ["Programming", "Data Science"],
            "skill_qualifier_overrides": {
                "Python": {
                    "proficiency": "expert",
                    "subskills": ["Pandas", "NumPy"],
                }
            },
        },
        customizations={"approved_skills": ["Python"]},
    )

    materialized = view.materialize_customizations()

    assert materialized["achievement_overrides"] == {"ach-1": {"title": "Edited"}}
    assert materialized["removed_achievement_ids"] == ["ach-2"]
    assert materialized["skill_group_overrides"] == {"Python": "scripting"}
    assert materialized["skill_category_overrides"] == {"Python": "Programming"}
    assert materialized["skill_category_order"] == ["Programming", "Data Science"]
    assert materialized["skill_qualifier_overrides"] == {
        "Python": {
            "proficiency": "expert",
            "subskills": ["Pandas", "NumPy"],
        }
    }


def test_normalized_skills_apply_session_qualifier_overrides() -> None:
    view = SessionDataView(
        master_data={
            "skills": [
                {"name": "Python", "proficiency": "intermediate"},
                {"name": "SQL"},
            ]
        },
        session_state={
            "skill_qualifier_overrides": {
                "Python": {
                    "proficiency": "expert",
                    "subskills": ["Pandas", "NumPy"],
                },
                "SQL": {
                    "parenthetical": "Window functions, query tuning",
                },
            }
        },
    )

    assert view.normalized_skills() == [
        {
            "name": "Python",
            "proficiency": "expert",
            "subskills": ["Pandas", "NumPy"],
        },
        {
            "name": "SQL",
            "parenthetical": "Window functions, query tuning",
        },
    ]


def test_materialize_generation_customizations_applies_review_decisions() -> None:
    view = SessionDataView(
        master_data={"professional_summaries": {"default": "Master summary"}},
        session_state={
            "experience_decisions": {
                "exp-1": "include",
                "exp-2": "exclude",
            },
            "skill_decisions": {
                "Python": "emphasize",
                "Cobol": "exclude",
            },
            "achievement_decisions": {
                "ach-1": "de-emphasize",
                "ach-2": "omit",
            },
            "publication_decisions": {
                "pub-1": True,
                "pub-2": False,
            },
            "accepted_suggested_achievements": [{"id": "extra-ach"}],
            "extra_skills": ["Leadership"],
            "achievement_orders": {"exp-1": ["ach-1"]},
            "experience_row_order": ["exp-1"],
            "skill_row_order": ["Python"],
            "base_font_size": "11pt",
        },
        customizations={"approved_skills": ["SQL"]},
    )

    materialized = view.materialize_generation_customizations()

    assert materialized["recommended_experiences"] == ["exp-1"]
    assert materialized["omitted_experiences"] == ["exp-2"]
    assert materialized["recommended_skills"] == ["Python"]
    assert materialized["omitted_skills"] == ["Cobol"]
    assert materialized["recommended_achievements"] == ["ach-1"]
    assert materialized["omitted_achievements"] == ["ach-2"]
    assert materialized["accepted_publications"] == ["pub-1"]
    assert materialized["rejected_publications"] == ["pub-2"]
    assert materialized["extra_achievements"] == [{"id": "extra-ach"}]
    assert materialized["extra_skills"] == ["Leadership"]
    assert materialized["achievement_orders"] == {"exp-1": ["ach-1"]}
    assert materialized["experience_row_order"] == ["exp-1"]
    assert materialized["skill_row_order"] == ["Python"]
    assert materialized["base_font_size"] == "11pt"


def test_materialize_generation_customizations_prefers_legacy_publication_overrides() -> None:
    view = SessionDataView(
        master_data={},
        session_state={
            "publication_decisions": {"pub-1": True, "pub-2": False},
            "post_analysis_answers": {
                "publication_accepted": "pub-3, pub-4",
                "publication_rejected": "pub-5",
            },
        },
    )

    materialized = view.materialize_generation_customizations()

    assert materialized["accepted_publications"] == ["pub-3", "pub-4"]
    assert materialized["rejected_publications"] == ["pub-5"]