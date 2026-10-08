# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""MCP tools must accept JSON parameters as objects/arrays, not only strings.

GitHub #159: Claude Code decodes JSON-looking arguments before sending them,
so `str`-typed parameters (user_preferences, *_decisions, approved_ids, ...)
were rejected by validation, and `result: str | dict` rejected arrays.
These tests go through MCPServer.call_tool so the declared types are enforced.
"""

import json

import anyio
import pytest

pytest.importorskip("mcp.server.mcpserver")

import mcp_server  # noqa: E402


@pytest.fixture
def passthrough(monkeypatch, tmp_path):
    monkeypatch.setenv("CV_OUTPUT_DIR", str(tmp_path))
    monkeypatch.setattr(mcp_server, "_DEFAULT_PROVIDER", None)
    monkeypatch.setattr(mcp_server, "_DEFAULT_MODEL", None)
    monkeypatch.setattr(mcp_server, "_sessions", mcp_server._SessionCache())


def _call(name, args):
    result = anyio.run(mcp_server.mcp.call_tool, name, args)
    assert not getattr(result, "is_error", False), result
    payload = result.structured_content or json.loads(result.content[0].text)
    return payload.get("result", payload)


def _new_session():
    sid = _call("session_new", {})["session_id"]
    _call("job_submit_text", {"session_id": sid, "job_text": "Senior R developer."})
    return sid


def test_decisions_submit_accepts_objects(passthrough):
    sid = _new_session()

    out = _call("decisions_submit", {
        "session_id": sid,
        "experience_decisions": {"exp_001": "include"},
        "extra_skills": ["Shiny"],
    })

    assert out["ok"] is True, out
    assert mcp_server._sessions.get(sid).state["experience_decisions"] == {"exp_001": "include"}


def test_rewrites_submit_accepts_an_array(passthrough):
    sid = _new_session()
    mcp_server._sessions.get(sid).state["job_analysis"] = {"title": "T"}

    out = _call("rewrites_submit", {"session_id": sid, "result": [
        {"id": "r1", "type": "bullet", "location": "exp_001.achievements[0]",
         "original": "a", "proposed": "b", "keywords_introduced": [], "rationale": "x"},
    ]})

    assert out["ok"] is True, out
    assert out["proposal_count"] == 1


def test_rewrites_approve_accepts_an_array(passthrough):
    sid = _new_session()
    mcp_server._sessions.get(sid).state["pending_rewrites"] = [{"id": "r1"}]

    out = _call("rewrites_approve", {"session_id": sid, "approved_ids": ["r1"]})

    assert out["ok"] is True, out


def test_user_preferences_that_is_not_an_object_gets_a_clear_error(passthrough):
    sid = _new_session()

    out = _call("recommendations_prepare", {"session_id": sid, "user_preferences": '"just a string"'})

    assert out["ok"] is False
    assert "object" in out["error"]
