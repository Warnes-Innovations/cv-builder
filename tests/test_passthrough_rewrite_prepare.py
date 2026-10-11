# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""rewrites_prepare must return a REWRITE prompt bundle (GitHub #153).

_propose_rewrites_via_chat wraps chat() in `except Exception`, which swallowed
PassthroughLLMClient's PromptBundleReady signal, so no bundle was produced.
The prompt must also be built from render-ready CV content, not the raw
recommendations dict, or it has no bullets to rewrite.
"""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from utils.agent_bridge import OperationType, PromptBundleReady  # noqa: E402
from utils.config import get_config  # noqa: E402
from utils.conversation_manager import ConversationManager  # noqa: E402
from utils.cv_orchestrator import CVOrchestrator  # noqa: E402
from utils.headless_session import HeadlessSession  # noqa: E402
from utils.llm_client import LLMClient  # noqa: E402

BULLET = "Built R packages for mapping clinical-trial data into CDISC domains."
MASTER = {
    "personal_info": {"name": "Test User"},
    "experience": [{"id": "exp_a", "title": "Data Scientist", "company": "Acme",
                    "end_date": "2018-07", "achievements": [{"text": BULLET}]}],
    "skills": [{"name": "R"}], "education": [],
}


def _session(tmp_path):
    master = tmp_path / "Master_CV_Data.json"
    master.write_text(json.dumps(MASTER))
    pubs = tmp_path / "publications.bib"
    pubs.touch()
    llm = MagicMock(spec=LLMClient)
    orch = CVOrchestrator(master_data_path=str(master), publications_path=str(pubs),
                          output_dir=str(tmp_path), llm_client=llm)
    mgr = ConversationManager(orchestrator=orch, llm_client=llm, config=get_config())
    mgr.state.update({
        "job_analysis": {"title": "Statistician", "company": "Co",
                         "ats_keywords": ["R", "CDISC"]},
        "customizations": {"experience_recommendations": []},
        "experience_decisions": {"exp_a": "include"},
    })
    return HeadlessSession.from_conversation_manager(mgr, orch)


def test_rewrite_prepare_returns_a_bundle(tmp_path):
    bundle = _session(tmp_path).prepare_llm_call(OperationType.REWRITE)

    assert bundle.operation == OperationType.REWRITE
    assert bundle.messages


def test_rewrite_prompt_contains_the_cv_bullets(tmp_path):
    bundle = _session(tmp_path).prepare_llm_call(OperationType.REWRITE)

    prompt = json.dumps(bundle.messages)
    assert "CDISC domains" in prompt


def test_prompt_bundle_ready_is_not_swallowed_by_except_exception():
    assert not issubclass(PromptBundleReady, Exception)
