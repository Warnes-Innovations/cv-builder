# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""The user's include/omit decisions beat the LLM's per-item recommendations.

GitHub #156: an experience the LLM marked "Omit" stayed omitted even after the
user decided to include it.  Sibling: skill recommendations were read by `name`
while their schema key is `skill`, so LLM skill "Omit" was never applied.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from utils.cv_orchestrator import CVOrchestrator  # noqa: E402

MASTER = {
    "personal_info": {"name": "Test User"},
    "experience": [
        {"id": "exp_keep", "title": "Engineer", "company": "A", "end_date": "2020-01"},
        {"id": "exp_llm_omit", "title": "Analyst", "company": "B", "end_date": "2010-01"},
    ],
    "skills": [{"name": "R"}, {"name": "COBOL"}],
    "education": [],
}
JOB = {"title": "Statistician", "ats_keywords": ["R"]}


def _orch(tmp_path):
    master = tmp_path / "Master_CV_Data.json"
    master.write_text(json.dumps(MASTER))
    pubs = tmp_path / "publications.bib"
    pubs.touch()
    orch = CVOrchestrator(master_data_path=str(master), publications_path=str(pubs),
                          output_dir=str(tmp_path), llm_client=None)
    orch.llm = None
    return orch


def _select(tmp_path, customizations):
    content = _orch(tmp_path)._select_content_hybrid(JOB, customizations, use_semantic_match=False)
    exp_ids = [e.get("id") for e in content["experiences"]]
    skills = [s if isinstance(s, str) else s.get("name") for s in content["skills"]]
    return exp_ids, skills


def test_user_include_beats_llm_omit_for_experience(tmp_path):
    exp_ids, _ = _select(tmp_path, {
        "experience_recommendations": [{"id": "exp_llm_omit", "recommendation": "Omit"}],
        "recommended_experiences": ["exp_keep", "exp_llm_omit"],   # user decisions
        "omitted_experiences": [],
    })
    assert "exp_llm_omit" in exp_ids


def test_llm_omit_still_applies_when_user_has_not_decided(tmp_path):
    exp_ids, _ = _select(tmp_path, {
        "experience_recommendations": [{"id": "exp_llm_omit", "recommendation": "Omit"}],
    })
    assert "exp_llm_omit" not in exp_ids


def test_user_omit_beats_llm_include_for_experience(tmp_path):
    exp_ids, _ = _select(tmp_path, {
        "experience_recommendations": [{"id": "exp_keep", "recommendation": "Emphasize"}],
        "omitted_experiences": ["exp_keep"],
    })
    assert "exp_keep" not in exp_ids


def test_llm_skill_omit_is_read_from_skill_key(tmp_path):
    _, skills = _select(tmp_path, {
        "skill_recommendations": [{"skill": "COBOL", "recommendation": "Omit"}],
    })
    assert "COBOL" not in skills


def test_user_skill_include_beats_llm_skill_omit(tmp_path):
    _, skills = _select(tmp_path, {
        "skill_recommendations": [{"skill": "COBOL", "recommendation": "Omit"}],
        "recommended_skills": ["COBOL"],
        "omitted_skills": [],
    })
    assert "COBOL" in skills
