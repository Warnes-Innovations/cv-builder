#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for Copilot OAuth authentication and LLM provider initialization.

All HTTP calls are mocked; no network access required.
"""

import time
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.copilot_auth import CopilotAuthManager, poll_for_github_token
from utils.llm_client import get_llm_provider, CopilotOAuthClient


# ---------------------------------------------------------------------------
# Helpers — bypass __init__ to avoid touching real cache files
# ---------------------------------------------------------------------------

def _make_authenticated_manager() -> CopilotAuthManager:
    """Return a CopilotAuthManager pre-loaded with a valid (mock) token."""
    mgr = CopilotAuthManager.__new__(CopilotAuthManager)
    mgr._cache = {
        "github_oauth_token": "gho_test123",
        "copilot_token":      "tid=testcopilottoken",
        "copilot_expires_at": time.time() + 3600,
    }
    return mgr


def _make_unauthenticated_manager() -> CopilotAuthManager:
    """Return a CopilotAuthManager with an empty cache."""
    mgr = CopilotAuthManager.__new__(CopilotAuthManager)
    mgr._cache = {}
    return mgr

# ---------------------------------------------------------------------------
# CopilotAuthManager — unauthenticated state
# ---------------------------------------------------------------------------

class TestCopilotAuthManagerUnauthenticated(unittest.TestCase):

    def test_is_not_authenticated_with_empty_cache(self):
        mgr = _make_unauthenticated_manager()
        self.assertFalse(mgr.is_authenticated())

    def test_status_unauthenticated(self):
        mgr = _make_unauthenticated_manager()
        st  = mgr.status
        self.assertFalse(st["authenticated"])
        self.assertFalse(st["copilot_token_ready"])

    def test_get_copilot_token_raises_when_not_authenticated(self):
        mgr = _make_unauthenticated_manager()
        with self.assertRaises(RuntimeError):
            mgr.get_copilot_token()

    def test_logout_clears_cache(self):
        mgr = _make_authenticated_manager()
        with patch("utils.copilot_auth.clear_cache"):
            mgr.logout()
        self.assertFalse(mgr.is_authenticated())
        self.assertEqual(mgr._cache, {})


# ---------------------------------------------------------------------------
# CopilotAuthManager — authenticated state
# ---------------------------------------------------------------------------

class TestCopilotAuthManagerAuthenticated(unittest.TestCase):

    def test_is_authenticated_with_github_token(self):
        mgr = _make_authenticated_manager()
        self.assertTrue(mgr.is_authenticated())

    def test_status_authenticated(self):
        mgr = _make_authenticated_manager()
        st  = mgr.status
        self.assertTrue(st["authenticated"])
        self.assertTrue(st["copilot_token_ready"])
        self.assertGreater(st["copilot_expires_in"], 0)

    def test_get_copilot_token_returns_cached_token(self):
        mgr   = _make_authenticated_manager()
        token = mgr.get_copilot_token()
        self.assertEqual(token, "tid=testcopilottoken")

    def test_get_copilot_token_refreshes_when_expired(self):
        mgr = _make_authenticated_manager()
        mgr._cache["copilot_expires_at"] = time.time() - 10  # already expired

        with patch("utils.copilot_auth.exchange_for_copilot_token") as mock_exchange, \
             patch("utils.copilot_auth._save_cache"):
            mock_exchange.return_value = {
                "token":      "tid=freshtoken",
                "expires_at": time.time() + 1680,
            }
            token = mgr.get_copilot_token()

        self.assertEqual(token, "tid=freshtoken")
        mock_exchange.assert_called_once_with("gho_test123")


# ---------------------------------------------------------------------------
# CopilotAuthManager — device flow
# ---------------------------------------------------------------------------

class TestCopilotAuthDeviceFlow(unittest.TestCase):

    @patch("utils.copilot_auth.start_device_flow")
    def test_start_device_flow_delegates_to_module_function(self, mock_start):
        mock_start.return_value = {
            "device_code":      "dev_abc",
            "user_code":        "ABCD-1234",
            "verification_uri": "https://github.com/login/device",
            "interval":         5,
            "expires_in":       900,
        }
        mgr  = _make_unauthenticated_manager()
        flow = mgr.start_device_flow()
        self.assertEqual(flow["user_code"],   "ABCD-1234")
        self.assertEqual(flow["device_code"], "dev_abc")

    @patch("utils.copilot_auth.poll_for_github_token")
    @patch("utils.copilot_auth._save_cache")
    def test_complete_device_flow_stores_github_token(self, mock_save, mock_poll):
        mock_poll.return_value = "gho_newtoken"
        mgr = _make_unauthenticated_manager()
        mgr.complete_device_flow("dev_abc", interval=0)
        self.assertEqual(mgr._cache["github_oauth_token"], "gho_newtoken")
        mock_save.assert_called_once()


# ---------------------------------------------------------------------------
# poll_for_github_token (module-level)
# ---------------------------------------------------------------------------

class TestPollForGithubToken(unittest.TestCase):

    @patch("utils.copilot_auth.requests.post")
    def test_returns_token_on_success(self, mock_post):
        pending = MagicMock()
        pending.json.return_value = {"error": "authorization_pending"}
        pending.raise_for_status  = MagicMock()

        success = MagicMock()
        success.json.return_value = {"access_token": "gho_realtoken"}
        success.raise_for_status  = MagicMock()

        mock_post.side_effect = [pending, success]
        token = poll_for_github_token("dev_abc", interval=0, timeout=30)
        self.assertEqual(token, "gho_realtoken")

    @patch("utils.copilot_auth.requests.post")
    def test_raises_runtime_error_on_access_denied(self, mock_post):
        denied = MagicMock()
        denied.json.return_value = {"error": "access_denied"}
        denied.raise_for_status  = MagicMock()
        mock_post.return_value   = denied
        with self.assertRaises(RuntimeError):
            poll_for_github_token("dev_abc", interval=0, timeout=10)

    @patch("utils.copilot_auth.requests.post")
    def test_raises_timeout_when_never_approved(self, mock_post):
        pending = MagicMock()
        pending.json.return_value = {"error": "authorization_pending"}
        pending.raise_for_status  = MagicMock()
        mock_post.return_value    = pending
        with self.assertRaises(TimeoutError):
            poll_for_github_token("dev_abc", interval=0, timeout=0)


# ---------------------------------------------------------------------------
# CopilotOAuthClient
# ---------------------------------------------------------------------------

class TestCopilotOAuthClient(unittest.TestCase):

    def test_raises_runtime_error_when_not_authenticated(self):
        mgr    = _make_unauthenticated_manager()
        client = CopilotOAuthClient(model="gpt-4o", auth_manager=mgr)
        with self.assertRaises(RuntimeError):
            client.chat([{"role": "user", "content": "hello"}])

    def test_default_model_is_gpt4o(self):
        """get_llm_provider applies the gpt-4o default when model is None."""
        mgr    = _make_unauthenticated_manager()
        client = get_llm_provider(provider="copilot-oauth", model=None, api_key=None, auth_manager=mgr)
        self.assertEqual(client.model, "gpt-4o")


# ---------------------------------------------------------------------------
# get_llm_provider
# ---------------------------------------------------------------------------

class TestGetLLMProvider(unittest.TestCase):

    def test_copilot_oauth_instantiates_correct_client(self):
        mgr    = _make_unauthenticated_manager()
        client = get_llm_provider(
            provider="copilot-oauth",
            model="gpt-4o",
            api_key=None,
            auth_manager=mgr,
        )
        self.assertIsInstance(client, CopilotOAuthClient)

    def test_copilot_oauth_default_model_when_none(self):
        mgr    = _make_unauthenticated_manager()
        client = get_llm_provider(
            provider="copilot-oauth",
            model=None,
            api_key=None,
            auth_manager=mgr,
        )
        self.assertEqual(client.model, "gpt-4o")

    def test_unknown_provider_raises_value_error(self):
        with self.assertRaises(ValueError):
            get_llm_provider(provider="nonexistent-xyz", model=None, api_key=None)


if __name__ == "__main__":
    unittest.main(verbosity=2)
