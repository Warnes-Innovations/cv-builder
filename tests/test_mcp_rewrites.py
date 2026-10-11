# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""MCP rewrite tools use the shared headless prompt path."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import mcp_server
from utils.agent_bridge import OperationType
from utils.headless_session import HeadlessSession


def test_registered_rewrites_prepare_returns_render_ready_prompt_bundle():
    manager = SimpleNamespace(
        config=None,
        llm=object(),
        state={
            "job_analysis": {
                "ats_keywords": ["data pipelines"],
                "required_skills": ["Python"],
                "domain": "data science",
            },
            "customizations": {"summary": "Raw session customization."},
            "experience_decisions": {"exp_001": "include"},
            "approved_rewrites": [],
            "spell_audit": [],
            "max_skills": 8,
        },
        conversation_history=[],
    )
    render_ready_content = {
        "summary": "Render-ready summary from selected CV data.",
        "experiences": [],
        "skills": [],
    }
    build_render_ready_content = MagicMock(return_value=render_ready_content)
    orchestrator = SimpleNamespace(
        llm=object(),
        master_data={"selected_achievements": []},
        build_render_ready_content=build_render_ready_content,
    )
    session = HeadlessSession.from_conversation_manager(manager, orchestrator)
    tool = mcp_server.mcp._tool_manager.get_tool("rewrites_prepare")

    assert tool.fn is mcp_server.rewrites_prepare
    with patch.object(mcp_server, "_get_session", return_value=session):
        result = tool.fn("session-id")

    assert result["ok"] is True
    assert result["operation"] == OperationType.REWRITE.value
    assert "Render-ready summary from selected CV data." in result["messages"][-1]["content"]
    assert "Raw session customization." not in result["messages"][-1]["content"]
    assert "evidence" in result["output_schema"]["items"]["properties"]
    assert build_render_ready_content.call_count == 1
