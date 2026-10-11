# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Passthrough generation must make no LLM calls (GitHub #157).

generate_cv used semantic_match (one LLM call per experience/skill) during
content selection, and could ask the LLM for recommendations — both of which
fail or bill an unrequested provider when the calling agent is the LLM.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from utils.agent_bridge import PassthroughLLMClient  # noqa: E402
from utils.cv_orchestrator import CVOrchestrator  # noqa: E402
from utils.headless_session import HeadlessSession  # noqa: E402


def _session_with(llm, tmp_path):
    manager = MagicMock()
    manager.state = {}
    manager.session_dir = tmp_path
    orchestrator = MagicMock()
    orchestrator.llm = llm
    orchestrator.output_dir = tmp_path
    return HeadlessSession.from_conversation_manager(manager, orchestrator), manager


def test_passthrough_session_disables_llm_during_generation(tmp_path):
    session, manager = _session_with(PassthroughLLMClient(), tmp_path)

    session.generate_cv(html_preview_only=True)

    kwargs = manager.generate_cv_from_session_state.call_args.kwargs
    assert kwargs["use_semantic_match"] is False
    assert kwargs["allow_llm_recommendations"] is False


def test_real_llm_session_keeps_llm_features(tmp_path):
    session, manager = _session_with(MagicMock(name="RealLLMClient"), tmp_path)

    session.generate_cv(html_preview_only=True)

    kwargs = manager.generate_cv_from_session_state.call_args.kwargs
    assert kwargs["use_semantic_match"] is True
    assert kwargs["allow_llm_recommendations"] is True


class _Captured(Exception):
    pass


@pytest.mark.parametrize("entry_point", ["generate_cv", "generate_preview_html_only"])
def test_orchestrator_entry_points_forward_use_semantic_match(entry_point, tmp_path):
    orch = object.__new__(CVOrchestrator)
    seen = {}

    def _capture(*args, **kwargs):
        seen.update(kwargs)
        raise _Captured

    orch.build_render_ready_content = _capture
    orch.output_dir = tmp_path
    with pytest.raises(_Captured):
        getattr(orch, entry_point)({"title": "T", "company": "C"}, {},
                                   output_dir=tmp_path,
                                   use_semantic_match=False)
    assert seen["use_semantic_match"] is False
