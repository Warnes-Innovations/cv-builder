# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Passthrough mode must not build a provider LLM client (GitHub #152).

Without --provider the calling agent is the LLM.  Sessions used to fall back
to config.yaml's llm.default_provider, so creating one could fail on a missing
provider package or silently bill that provider.
"""

import pytest

pytest.importorskip("mcp.server.mcpserver")

import mcp_server  # noqa: E402
import utils.headless_session as headless_session  # noqa: E402


@pytest.fixture
def passthrough(monkeypatch, tmp_path):
    monkeypatch.setenv("CV_OUTPUT_DIR", str(tmp_path))
    monkeypatch.setattr(mcp_server, "_DEFAULT_PROVIDER", None)
    monkeypatch.setattr(mcp_server, "_DEFAULT_MODEL", None)
    monkeypatch.setattr(mcp_server, "_sessions", mcp_server._SessionCache())

    def _no_provider_client(*args, **kwargs):
        raise AssertionError("passthrough mode built a provider LLM client")

    monkeypatch.setattr(headless_session, "get_llm_provider", _no_provider_client)


def test_session_new_does_not_build_provider_client(passthrough):
    result = mcp_server.session_new()

    assert result["ok"] is True, result
    assert mcp_server._sessions.get(result["session_id"])._provider is None


def test_run_tool_without_provider_explains_how_to_proceed(passthrough):
    sid = mcp_server.session_new()["session_id"]
    mcp_server.job_submit_text(sid, "Senior R developer.")

    result = mcp_server.run_analysis(sid)

    assert result["ok"] is False
    assert "provider" in result["error"]


def test_session_list_error_text_is_returned(passthrough, monkeypatch):
    def _boom():
        raise RuntimeError("disk unreadable")

    monkeypatch.setattr(mcp_server.HeadlessSession, "list_sessions", staticmethod(_boom))

    result = mcp_server.session_list()

    assert result["ok"] is False
    assert "disk unreadable" in result["error"]
