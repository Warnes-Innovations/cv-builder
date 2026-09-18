# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for the `testing` and `version` identity markers on GET /api/status.

Why these exist: the test harness reuses an already-running server when one
answers, and /api/status previously returned nothing that distinguished a
disposable test server from the live app. The marker closes that by letting a
caller ask before it writes.

The load-bearing test here is `test_reports_not_testing_for_a_live_app`. A
false `testing: true` is the failure that matters — it hands a test run the
live app, which is the exact outcome the marker exists to prevent — so the
default must be False on every unknown path.
"""
import argparse
import json
import os
import sys
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.web_app import create_app
from utils.app_identity import (
    UNKNOWN_VERSION,
    get_app_version,
    is_testing_server,
)

REPO_ROOT = Path(__file__).parent.parent

# Neutralise the ambient environment: pytest itself may be run with FLASK_ENV
# set, which would make the negative cases pass for the wrong reason.
_NO_TEST_SIGNALS = {'FLASK_ENV': '', 'CV_BUILDER_TESTING': ''}


def _make_args(**overrides) -> argparse.Namespace:
    defaults = dict(
        llm_provider = 'local',
        model        = None,
        master_data  = None,
        publications = None,
        output_dir   = '/tmp/cv_test_output',
        job_file     = None,
    )
    defaults.update(overrides)
    return argparse.Namespace(**defaults)


def _make_app(testing_config=True):
    mock_llm          = MagicMock()
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data_path = '/tmp/fake_master.json'
    mock_orchestrator.master_data = None

    mock_conversation = MagicMock()
    mock_conversation.state = {'phase': 'job_analysis'}
    mock_conversation.session_dir = None

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.CVOrchestrator', return_value=mock_orchestrator))
    stack.enter_context(patch('scripts.web_app.ConversationManager', return_value=mock_conversation))

    app = create_app(_make_args())
    app.config['TESTING'] = testing_config

    with app.test_client() as tmp_client:
        sid = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, sid, stack


class TestGetAppVersion(unittest.TestCase):

    def setUp(self):
        get_app_version.cache_clear()

    def tearDown(self):
        get_app_version.cache_clear()

    def test_reports_the_version_from_package_json(self):
        expected = json.loads(
            (REPO_ROOT / 'package.json').read_text(encoding='utf-8')
        )['version']

        self.assertEqual(get_app_version(), expected)

    def test_falls_back_to_unknown_when_package_json_is_unreadable(self):
        with patch('pathlib.Path.read_text', side_effect=OSError('nope')):
            self.assertEqual(get_app_version(), UNKNOWN_VERSION)

    def test_falls_back_to_unknown_when_package_json_is_malformed(self):
        with patch('pathlib.Path.read_text', return_value='{not json'):
            self.assertEqual(get_app_version(), UNKNOWN_VERSION)

    def test_falls_back_to_unknown_when_version_key_is_absent(self):
        with patch('pathlib.Path.read_text', return_value='{"name": "cv-builder"}'):
            self.assertEqual(get_app_version(), UNKNOWN_VERSION)

    def test_falls_back_to_unknown_when_version_is_blank(self):
        with patch('pathlib.Path.read_text', return_value='{"version": "   "}'):
            self.assertEqual(get_app_version(), UNKNOWN_VERSION)


class TestIsTestingServer(unittest.TestCase):

    def test_true_when_flask_env_marks_a_test_run(self):
        for value in ('testing', 'TESTING', 'test'):
            with self.subTest(value=value):
                with patch.dict(os.environ, {**_NO_TEST_SIGNALS, 'FLASK_ENV': value}):
                    self.assertTrue(is_testing_server())

    def test_true_when_cv_builder_testing_is_truthy(self):
        for value in ('1', 'true', 'yes', 'on'):
            with self.subTest(value=value):
                with patch.dict(os.environ, {**_NO_TEST_SIGNALS, 'CV_BUILDER_TESTING': value}):
                    self.assertTrue(is_testing_server())

    def test_false_when_no_signal_is_present(self):
        # The fail-safe default: no signal, no app context, not a test server.
        with patch.dict(os.environ, _NO_TEST_SIGNALS):
            self.assertFalse(is_testing_server())

    def test_false_for_unrelated_flask_env_values(self):
        for value in ('production', 'development', 'staging'):
            with self.subTest(value=value):
                with patch.dict(os.environ, {**_NO_TEST_SIGNALS, 'FLASK_ENV': value}):
                    self.assertFalse(is_testing_server())

    def test_false_for_non_truthy_cv_builder_testing(self):
        for value in ('0', 'false', 'no', 'off'):
            with self.subTest(value=value):
                with patch.dict(os.environ, {**_NO_TEST_SIGNALS, 'CV_BUILDER_TESTING': value}):
                    self.assertFalse(is_testing_server())


class TestStatusEndpointMarkers(unittest.TestCase):

    def test_probe_response_carries_both_markers(self):
        # The no-session branch: what a harness or the CLI actually probes.
        app, _sid, stack = _make_app()
        with stack, app.test_client() as client:
            data = client.get('/api/status').get_json()

        self.assertTrue(data['alive'])
        self.assertIn('testing', data)
        self.assertIn('version', data)
        self.assertIsInstance(data['testing'], bool)
        self.assertEqual(data['version'], get_app_version())

    def test_session_response_carries_both_markers(self):
        # Same answer whether or not the caller holds a session.
        app, sid, stack = _make_app()
        with stack, app.test_client() as client:
            data = client.get(f'/api/status?session_id={sid}').get_json()

        self.assertIn('testing', data)
        self.assertIn('version', data)
        self.assertEqual(data['version'], get_app_version())

    def test_reports_testing_true_for_a_test_server(self):
        app, _sid, stack = _make_app(testing_config=True)
        with patch.dict(os.environ, _NO_TEST_SIGNALS):
            with stack, app.test_client() as client:
                data = client.get('/api/status').get_json()

        self.assertTrue(data['testing'])

    def test_reports_not_testing_for_a_live_app(self):
        # THE case this marker exists for. If this ever inverts, a test run can
        # be pointed at Dr. Greg's running app and treated as disposable.
        app, _sid, stack = _make_app(testing_config=False)
        with patch.dict(os.environ, _NO_TEST_SIGNALS):
            with stack, app.test_client() as client:
                data = client.get('/api/status').get_json()

        self.assertFalse(data['testing'])


if __name__ == '__main__':
    unittest.main()
