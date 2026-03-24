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