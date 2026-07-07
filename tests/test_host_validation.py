# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Regression tests for GAP-55 — Host-header validation / DNS-rebinding protection."""

import argparse
import os
import unittest
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

from scripts.web_app import create_app


def _make_args(**overrides):
    defaults = dict(
        llm_provider='local',
        model=None,
        master_data=None,
        publications=None,
        output_dir='/tmp/cv_test_output',
        job_file=None,
    )
    defaults.update(overrides)
    return argparse.Namespace(**defaults)


def _make_app(env: dict):
    stack = ExitStack()
    for k, v in env.items():
        stack.enter_context(patch.dict(os.environ, {k: v}, clear=False))

    stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=MagicMock()))
    stack.enter_context(patch('scripts.web_app.CVOrchestrator', return_value=MagicMock()))
    stack.enter_context(patch('scripts.web_app.ConversationManager', return_value=MagicMock()))

    app = create_app(_make_args())
    app.config['TESTING'] = True
    return app, stack


class TestHostValidationLoopback(unittest.TestCase):
    """When CV_WEB_HOST=127.0.0.1 (default), only loopback Host headers are allowed."""

    def setUp(self):
        # Unset any leftover CV_ALLOWED_HOSTS from the environment
        self._env_patch = patch.dict(os.environ, {'CV_WEB_HOST': '127.0.0.1'}, clear=False)
        self._env_patch.start()
        os.environ.pop('CV_ALLOWED_HOSTS', None)
        self.app, self.stack = _make_app({'CV_WEB_HOST': '127.0.0.1'})

    def tearDown(self):
        self.stack.close()
        self._env_patch.stop()

    def _get(self, host):
        with self.app.test_client() as client:
            return client.get('/api/status', headers={'Host': host})

    def test_localhost_accepted(self):
        r = self._get('localhost:5001')
        self.assertNotEqual(r.status_code, 400)

    def test_127_0_0_1_accepted(self):
        r = self._get('127.0.0.1:5001')
        self.assertNotEqual(r.status_code, 400)

    def test_external_host_rejected(self):
        r = self._get('attacker.example.com')
        self.assertEqual(r.status_code, 400)

    def test_rebinding_host_rejected(self):
        """DNS-rebinding: attacker controls attacker.com → 127.0.0.1."""
        r = self._get('evil.rebind.network')
        self.assertEqual(r.status_code, 400)


class TestHostValidationWildcard(unittest.TestCase):
    """CV_ALLOWED_HOSTS=* disables the check (reverse-proxy deployment)."""

    def setUp(self):
        os.environ['CV_ALLOWED_HOSTS'] = '*'
        os.environ['CV_WEB_HOST'] = '127.0.0.1'
        self.app, self.stack = _make_app({'CV_WEB_HOST': '127.0.0.1', 'CV_ALLOWED_HOSTS': '*'})

    def tearDown(self):
        self.stack.close()
        os.environ.pop('CV_ALLOWED_HOSTS', None)

    def test_any_host_accepted_when_wildcard(self):
        with self.app.test_client() as client:
            r = client.get('/api/status', headers={'Host': 'cv-builder.example.com'})
        self.assertNotEqual(r.status_code, 400)


class TestHostValidationCustomList(unittest.TestCase):
    """CV_ALLOWED_HOSTS=<comma list> restricts to the listed hosts."""

    def setUp(self):
        os.environ['CV_ALLOWED_HOSTS'] = 'cv-builder.cc,127.0.0.1'
        self.app, self.stack = _make_app({
            'CV_WEB_HOST': '0.0.0.0',
            'CV_ALLOWED_HOSTS': 'cv-builder.cc,127.0.0.1',
        })

    def tearDown(self):
        self.stack.close()
        os.environ.pop('CV_ALLOWED_HOSTS', None)

    def test_listed_host_accepted(self):
        with self.app.test_client() as client:
            r = client.get('/api/status', headers={'Host': 'cv-builder.cc'})
        self.assertNotEqual(r.status_code, 400)

    def test_unlisted_host_rejected(self):
        with self.app.test_client() as client:
            r = client.get('/api/status', headers={'Host': 'attacker.example.com'})
        self.assertEqual(r.status_code, 400)


if __name__ == '__main__':
    unittest.main()
