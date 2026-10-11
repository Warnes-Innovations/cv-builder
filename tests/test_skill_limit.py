# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""The user's skill limit, and skills they emphasized or included (GitHub #158).

Rules: the user sets how many skills are shown (max_skills); every skill they
marked Emphasize or Include is always shown, even past that number, with a
warning; the ATS DOCX shows the same skills instead of its own top-15.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from utils.cv_orchestrator import CVOrchestrator  # noqa: E402
from utils.session_data_view import SessionDataView  # noqa: E402

SKILLS = ["R", "Python", "SAS", "Rcpp", "Shiny", "COBOL"]
MASTER = {
    "personal_info": {"name": "Test User"},
    "experience": [],
    "skills": [{"name": s} for s in SKILLS],
    "education": [],
}
JOB = {"title": "Statistician", "ats_keywords": ["R", "Python", "SAS"],
       "required_skills": ["R"]}


def _orch(tmp_path):
    master = tmp_path / "Master_CV_Data.json"
    master.write_text(json.dumps(MASTER))
    pubs = tmp_path / "publications.bib"
    pubs.touch()
    orch = CVOrchestrator(master_data_path=str(master), publications_path=str(pubs),
                          output_dir=str(tmp_path), llm_client=None)
    orch.llm = None
    return orch


def _select(tmp_path, customizations, max_skills):
    content = _orch(tmp_path)._select_content_hybrid(
        JOB, customizations, max_skills=max_skills, use_semantic_match=False)
    names = [s.get("name") for s in content["skills"]]
    return names, content.get("skill_limit_warnings", [])


def test_guaranteed_skills_kept_past_the_limit_with_a_warning(tmp_path):
    names, warnings = _select(tmp_path, {"guaranteed_skills": ["Rcpp", "Shiny", "COBOL"]}, 2)

    assert {"Rcpp", "Shiny", "COBOL"} <= set(names)
    assert len(names) == 3
    assert warnings and "2" in warnings[0]


def test_limit_is_filled_after_guaranteed_without_warning(tmp_path):
    names, warnings = _select(tmp_path, {"guaranteed_skills": ["Shiny"]}, 3)

    assert "Shiny" in names
    assert len(names) == 3
    assert warnings == []


def test_guaranteed_exactly_at_limit_adds_nothing_more(tmp_path):
    names, warnings = _select(tmp_path, {"guaranteed_skills": ["Rcpp", "Shiny"]}, 2)

    assert sorted(names) == ["Rcpp", "Shiny"]
    assert warnings == []


def test_llm_recommended_skills_respect_the_limit(tmp_path):
    names, warnings = _select(tmp_path, {"recommended_skills": SKILLS[:5]}, 2)

    assert len(names) == 2
    assert warnings == []


def test_only_emphasize_and_include_decisions_are_guaranteed():
    state = {"skill_decisions": {"Rcpp": "emphasize", "Shiny": "include",
                                 "SAS": "de-emphasize", "COBOL": "exclude"}}
    cust = SessionDataView(MASTER, state, {}).materialize_generation_customizations()

    assert sorted(cust["guaranteed_skills"]) == ["Rcpp", "Shiny"]


def test_ats_docx_keeps_every_selected_skill(tmp_path):
    orch = _orch(tmp_path)
    many = [{"name": f"Skill{i}"} for i in range(18)] + [{"name": "R"}]

    names = orch._optimize_skills_for_ats(many, JOB)

    assert len(names) == 19
    assert names[0] == "R"   # still ordered by ATS relevance
