# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Headless generation must honour the same session edits as the web routes.

`generate_cv_from_session_state` (used by HeadlessSession / the MCP server)
used to build customizations by hand and dropped `achievement_edits`
(per-bullet show/hide) and the "omit publications" answer (GitHub #155).
"""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from utils.config import get_config  # noqa: E402
from utils.conversation_manager import ConversationManager  # noqa: E402
from utils.cv_orchestrator import CVOrchestrator  # noqa: E402
from utils.llm_client import LLMClient  # noqa: E402

MASTER = {
    "personal_info": {"name": "Test User", "contact": {"email": "t@example.com"}},
    "experience": [
        {"id": "exp_a", "title": "Engineer", "company": "Acme",
         "achievements": [{"text": "Keep this bullet"}, {"text": "Hide this bullet"}]},
    ],
    "skills": [], "education": [], "awards": [],
}

EDITS = {"0": [{"text": "Keep this bullet", "hidden": False},
               {"text": "Hide this bullet", "hidden": True}]}


def _manager(tmp_path):
    master = tmp_path / "Master_CV_Data.json"
    master.write_text(json.dumps(MASTER))
    pubs = tmp_path / "publications.bib"
    pubs.touch()
    llm = MagicMock(spec=LLMClient)
    orch = CVOrchestrator(master_data_path=str(master), publications_path=str(pubs),
                          output_dir=str(tmp_path), llm_client=llm)
    mgr = ConversationManager(orchestrator=orch, llm_client=llm, config=get_config())
    mgr.state.update({
        "job_analysis": {"title": "Engineer", "company": "Co"},
        "customizations": {"experience_recommendations": []},
        "experience_decisions": {"exp_a": "include"},
        "achievement_edits": EDITS,
        "post_analysis_answers": {"include_publications": "No - omit publications"},
    })
    render = MagicMock(return_value={"files": [], "output_dir": str(tmp_path)})
    orch.generate_preview_html_only = render
    return mgr, render


def _customizations_passed(render):
    args, kwargs = render.call_args
    return kwargs.get("customizations", args[1] if len(args) > 1 else None)


def test_headless_generation_passes_achievement_edits(tmp_path):
    mgr, render = _manager(tmp_path)

    mgr.generate_cv_from_session_state(output_dir=tmp_path, html_preview_only=True)

    cust = _customizations_passed(render)
    assert cust["achievement_edits"][0][1] == {"text": "Hide this bullet", "hidden": True}


def test_headless_generation_honours_omit_publications_answer(tmp_path):
    mgr, render = _manager(tmp_path)

    mgr.generate_cv_from_session_state(output_dir=tmp_path, html_preview_only=True)

    assert _customizations_passed(render)["accepted_publications"] == []
