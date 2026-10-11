# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""session_evict must remove a cached session (GitHub #154).

It called _SessionCache.pop(), which did not exist, so every call failed and
a cached session could not be forced to reload from disk.
"""

import pytest

pytest.importorskip("mcp.server.mcpserver")

import mcp_server  # noqa: E402


@pytest.fixture
def cache(monkeypatch):
    c = mcp_server._SessionCache()
    monkeypatch.setattr(mcp_server, "_sessions", c)
    return c


def test_session_evict_removes_cached_session(cache):
    sentinel = object()
    cache.put("abc", sentinel)

    result = mcp_server.session_evict("abc")

    assert result == {"ok": True, "evicted": True}
    assert cache.get("abc") is None


def test_session_evict_unknown_id_reports_not_evicted(cache):
    assert mcp_server.session_evict("missing") == {"ok": True, "evicted": False}


def test_pop_returns_the_session_and_default(cache):
    sentinel = object()
    cache.put("abc", sentinel)

    assert cache.pop("abc") is sentinel
    assert cache.pop("abc", "dflt") == "dflt"
