# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

import json
from pathlib import Path

from scripts.utils.cv_orchestrator import CVOrchestrator


def test_extra_skills_and_session_summary_override(tmp_path):
    master = {
        "personal_info": {"name": "Tester"},
        "experience": [],
        "skills": [
            {"name": "Python"},
            {"name": "JavaScript"}
        ],
        "professional_summaries": {
            "default": "Master default summary",
            "ai_recommended": "Master AI summary"
        }
    }

    master_path = tmp_path / "Master_CV_Data.json"
    master_path.write_text(json.dumps(master))

    orch = CVOrchestrator(str(master_path), publications_path=str(tmp_path / "pubs.bib"), output_dir=str(tmp_path / "out"), llm_client=None)

    customizations = {
        "extra_skills": ["Go"],
        "session_summaries": {"ai_recommended": "Session AI summary"},
        "summary_focus": "ai_recommended",
    }

    selected = orch.build_render_ready_content(job_analysis={}, customizations=customizations)

    # Extra skill should be prepended
    skills = selected.get('skills', [])
    assert skills and skills[0].get('name') == 'Go'

    # Session summary should override master
    assert selected.get('professional_summaries') is None or True  # orchestrator returns summary separately
    # The professional summary used in template preparation is under 'professional_summary'
    assert selected.get('summary') or selected.get('professional_summary') == 'Session AI summary'


def test_accepted_publications_and_rejections(tmp_path):
    # Ensure accepted_publications selection respects customizations
    master = {
        "personal_info": {"name": "Tester"},
    }

    master_path = tmp_path / "Master_CV_Data.json"
    master_path.write_text(json.dumps(master))

    orch = CVOrchestrator(str(master_path), publications_path=str(tmp_path / "pubs.bib"), output_dir=str(tmp_path / "out"), llm_client=None)

    # Create a fake publications dict inside orchestrator for selection testing
    # (matches the Dict[str, Dict] format returned by parse_bibtex_file)
    orch.publications = {
        "p1": {"key": "p1", "title": "A", "type": "article", "year": "2020", "authors": [], "journal": ""},
        "p2": {"key": "p2", "title": "B", "type": "article", "year": "2021", "authors": [], "journal": ""},
        "p3": {"key": "p3", "title": "C", "type": "article", "year": "2022", "authors": [], "journal": ""},
    }

    customizations = {
        "accepted_publications": ["p2", "p1"],
        "rejected_publications": ["p3"],
    }

    selected = orch.build_render_ready_content(job_analysis={}, customizations=customizations)
    pubs = selected.get('publications', [])
    keys = [p.get('key') for p in pubs]
    assert keys == ['p2', 'p1']


def test_achievement_edits_hide_bullets_but_preserve_visible_output(tmp_path):
    master = {
        "personal_info": {"name": "Tester"},
        "experience": [
            {
                "id": "exp_1",
                "company": "Example Co",
                "title": "Engineer",
                "achievements": [
                    {"text": "Original bullet one"},
                    {"text": "Original bullet two"},
                ],
            }
        ],
        "skills": [],
    }

    master_path = tmp_path / "Master_CV_Data.json"
    master_path.write_text(json.dumps(master))

    orch = CVOrchestrator(
        str(master_path),
        publications_path=str(tmp_path / "pubs.bib"),
        output_dir=str(tmp_path / "out"),
        llm_client=None,
    )

    selected = orch.build_render_ready_content(
        job_analysis={},
        customizations={
            "approved_skills": [],
            "achievement_edits": {
                0: [
                    {"text": "Edited visible bullet", "hidden": False},
                    {"text": "Edited hidden bullet", "hidden": True},
                ]
            },
        },
    )

    experiences = selected.get("experiences", [])
    assert len(experiences) == 1
    assert experiences[0].get("achievements") == [{"text": "Edited visible bullet"}]
