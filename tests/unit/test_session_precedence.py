# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

import json
from pathlib import Path

from scripts.utils.cv_orchestrator import CVOrchestrator


def test_session_customizations_override_master(tmp_path):
    # Create a simple Master_CV_Data.json
    master = {
        "personal_info": {"name": "Test User"},
        "experience": [
            {
                "id": "exp1",
                "company": "Acme",
                "achievements": [
                    {"text": "First achievement"},
                    {"text": "Second achievement"}
                ]
            }
        ],
        "skills": [
            {"name": "Python"},
            {"name": "SQL"}
        ],
        "selected_achievements": []
    }

    master_path = tmp_path / "Master_CV_Data.json"
    master_path.write_text(json.dumps(master))

    # Instantiate orchestrator pointing at the temp master file. llm_client can be None.
    orch = CVOrchestrator(str(master_path), publications_path=str(tmp_path / "pubs.bib"), output_dir=str(tmp_path / "out"), llm_client=None)

    # Customizations: reorder achievements and omit a skill
    customizations = {
        "achievement_orders": {
            "exp1": [1, 0]
        },
        "omitted_skills": ["SQL"]
    }

    selected = orch.build_render_ready_content(job_analysis={}, customizations=customizations)

    # Achievements should be reordered per session customization
    exps = selected.get('experiences', [])
    assert exps, "No experiences returned"
    ordered = exps[0].get('ordered_achievements') or []
    assert ordered[0]['text'] == 'Second achievement'

    # Skills should not include omitted skill
    skills = selected.get('skills', [])
    skill_names = [s.get('name') for s in skills]
    assert 'SQL' not in skill_names
