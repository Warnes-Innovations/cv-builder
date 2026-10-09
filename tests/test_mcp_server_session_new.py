# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""session_new must return a usable session_id before anything is saved.

ConversationManager.save_session() skips a session with no job description,
and only assigns session_id on first save — so session_new used to return
session_id=None, leaving job_submit_* with nothing to address.
"""

import json

import pytest

pytest.importorskip("mcp.server.mcpserver")

import mcp_server  # noqa: E402


@pytest.fixture
def passthrough_server(monkeypatch, tmp_path, example_master_data):
    monkeypatch.setenv("CV_OUTPUT_DIR", str(tmp_path))
    monkeypatch.setattr(mcp_server, "_effective_provider", lambda: None)
    monkeypatch.setattr(mcp_server, "_effective_model", lambda: None)
    monkeypatch.setattr(mcp_server, "_sessions", mcp_server._SessionCache())
    return tmp_path


def test_session_new_returns_non_null_id(passthrough_server):
    result = mcp_server.session_new()
    assert result["ok"] is True
    assert result["session_id"]
    assert result["session_file"] is None  # empty session is not written


def test_session_new_id_is_usable_by_job_submit(passthrough_server):
    sid = mcp_server.session_new()["session_id"]

    result = mcp_server.job_submit_text(sid, "Senior R developer, MMRM.")

    assert result["ok"] is True, result
    files = list(passthrough_server.rglob("session.json"))
    assert len(files) == 1
    assert json.loads(files[0].read_text())["session_id"] == sid
