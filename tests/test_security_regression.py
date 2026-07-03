# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Security regression tests (GAP-57, GAP-58, GAP-59, GAP-65).

GAP-57: DNS-rebinding regression — SSRF check resolves hostname and rejects
        private-range results even when the public hostname looks legitimate.
GAP-58: Static-route path-traversal regression — confirm the static file
        handler refuses ../.. traversal inputs.
GAP-59: _save_master git-add failure is non-fatal — the write succeeds and
        a warning is logged even when git add exits non-zero.
"""

import argparse
import json
import os
import sys
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_args(**overrides):
    defaults = dict(
        llm_provider='local',
        model=None,
        master_data=None,
        publications=None,
        output_dir='/tmp/cv_sec_test',
        job_file=None,
    )
    defaults.update(overrides)
    return argparse.Namespace(**defaults)


def _make_app():
    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=MagicMock()))
    stack.enter_context(patch('scripts.web_app.CVOrchestrator', return_value=MagicMock()))
    stack.enter_context(patch('scripts.web_app.ConversationManager', return_value=MagicMock()))
    from scripts.web_app import create_app
    app = create_app(_make_args())
    app.config['TESTING'] = True
    return app, stack


# ---------------------------------------------------------------------------
# GAP-57: DNS-rebinding SSRF regression
# ---------------------------------------------------------------------------

class TestDnsRebindingSsrfRejection(unittest.TestCase):
    """URL fetch endpoint must reject hostnames that resolve to private IPs."""

    def setUp(self):
        self.app, self.stack = _make_app()

    def tearDown(self):
        self.stack.close()

    def _post(self, url, mock_getaddrinfo=None):
        """POST /api/fetch-job-url with an optional getaddrinfo mock."""
        with self.app.test_client() as client:
            # First create a session so the route can look it up
            sid = client.post('/api/sessions/new').get_json()['session_id']
            if mock_getaddrinfo:
                with patch('socket.getaddrinfo', mock_getaddrinfo):
                    return client.post(
                        f'/api/fetch-job-url?session_id={sid}',
                        json={'url': url},
                        content_type='application/json',
                        headers={'Host': 'localhost:5001'},
                    )
            return client.post(
                f'/api/fetch-job-url?session_id={sid}',
                json={'url': url},
                content_type='application/json',
                headers={'Host': 'localhost:5001'},
            )

    def test_bare_loopback_ip_rejected(self):
        r = self._post('http://127.0.0.1/secret')
        self.assertEqual(r.status_code, 400)
        self.assertIn('not permitted', r.get_json().get('error', '').lower())

    def test_bare_private_ip_rejected(self):
        r = self._post('http://192.168.1.1/secret')
        self.assertEqual(r.status_code, 400)

    def test_localhost_name_rejected(self):
        r = self._post('http://localhost/secret')
        self.assertEqual(r.status_code, 400)

    def test_hostname_resolving_to_private_rejected(self):
        """DNS-rebinding: public-looking hostname resolves to 192.168.x.x."""
        def _fake_getaddrinfo(host, port, *args, **kwargs):
            return [(2, 1, 6, '', ('192.168.0.1', 80))]
        r = self._post('http://evil.rebind.example.com/jd', mock_getaddrinfo=_fake_getaddrinfo)
        self.assertEqual(r.status_code, 400)

    def test_hostname_resolving_to_loopback_rejected(self):
        """Hostname that resolves to 127.x is rejected after DNS resolution."""
        def _fake_getaddrinfo(host, port, *args, **kwargs):
            return [(2, 1, 6, '', ('127.0.0.2', 80))]
        r = self._post('http://rebind.attack.net/jd', mock_getaddrinfo=_fake_getaddrinfo)
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------------------
# GAP-58: Static-route path-traversal regression
# ---------------------------------------------------------------------------

class TestStaticRoutePathTraversal(unittest.TestCase):
    """Static file handler must refuse traversal sequences."""

    def setUp(self):
        self.app, self.stack = _make_app()

    def tearDown(self):
        self.stack.close()

    def _get(self, path):
        with self.app.test_client() as client:
            return client.get(path, headers={'Host': 'localhost:5001'})

    def test_double_dot_slash_rejected(self):
        r = self._get('/web/../etc/passwd')
        self.assertIn(r.status_code, (400, 404))

    def test_encoded_traversal_rejected(self):
        r = self._get('/web/%2e%2e%2fetc%2fpasswd')
        self.assertIn(r.status_code, (400, 404))

    def test_double_dot_in_filename_rejected(self):
        r = self._get('/web/../../secret')
        self.assertIn(r.status_code, (400, 404))


# ---------------------------------------------------------------------------
# GAP-59: _save_master git-add failure is non-fatal
# ---------------------------------------------------------------------------

class TestSaveMasterGitAddFailure(unittest.TestCase):
    """_save_master must log a warning when git add fails but not raise."""

    def test_git_add_failure_is_non_fatal(self):
        import logging
        from routes.master_data_routes import _save_master

        master = {'personal_info': {'name': 'Test'}, 'experiences': [], 'skills': [], 'professional_summaries': []}

        with tempfile.TemporaryDirectory() as tmpdir:
            master_path = Path(tmpdir) / 'Master_CV_Data.json'

            failed_result = MagicMock()
            failed_result.returncode = 1
            failed_result.stderr = b'not a git repository'
            failed_result.stdout = b''

            with patch('subprocess.run', return_value=failed_result), \
                 patch('routes.master_data_routes.logger') as mock_logger:
                _save_master(master, master_path)
                mock_logger.warning.assert_called_once()
                warning_msg = str(mock_logger.warning.call_args)
                self.assertIn('git add', warning_msg)

            # File must have been written successfully despite git failure
            self.assertTrue(master_path.exists())
            written = json.loads(master_path.read_text())
            self.assertEqual(written['personal_info']['name'], 'Test')


if __name__ == '__main__':
    unittest.main()
