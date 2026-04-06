#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for credential management helpers and HTTP routes.

Tests cover:
- _credential_is_set — env-var and config.yaml paths
- _write_api_key_to_config — file write + os.environ side-effect
- GET /api/settings/credentials/status — shape, never returns key values
- POST /api/settings/credentials — happy path, unknown provider, empty key,
  device_flow rejection
"""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

import yaml
from routes.status_routes import (
    _PROVIDER_CREDENTIAL_MAP,
    _credential_is_set,
    _write_api_key_to_config,
    create_blueprint,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_flask_app(config_path: Path):
    """Return a Flask test client wired to a temporary config.yaml path."""
    from flask import Flask
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret'

    deps = MagicMock()
    deps.config.config_path = config_path
    deps.session_registry = MagicMock()

    # Patch _resolve_config_yaml_path so routes use our temp path.
    with patch('routes.status_routes._resolve_config_yaml_path', return_value=config_path):
        bp = create_blueprint(deps)
    app.register_blueprint(bp)
    return app.test_client()


# ---------------------------------------------------------------------------
# _credential_is_set
# ---------------------------------------------------------------------------

class TestCredentialIsSet(unittest.TestCase):

    def test_returns_false_for_unknown_provider(self):
        self.assertFalse(_credential_is_set('nonexistent', {}))

    def test_returns_false_for_device_flow_provider(self):
        self.assertFalse(_credential_is_set('copilot-oauth', {}))

    def test_returns_false_for_cli_provider(self):
        self.assertFalse(_credential_is_set('copilot-sdk', {}))

    def test_returns_false_for_none_provider(self):
        self.assertFalse(_credential_is_set('local', {}))

    def test_returns_true_when_env_var_set(self):
        with patch.dict(os.environ, {'GITHUB_MODELS_TOKEN': 'ghp_test'}, clear=False):
            self.assertTrue(_credential_is_set('github', {}))

    def test_env_var_empty_string_is_not_set(self):
        with patch.dict(os.environ, {'GITHUB_MODELS_TOKEN': '   '}, clear=False):
            self.assertFalse(_credential_is_set('github', {}))

    def test_returns_true_when_config_key_is_present(self):
        config_doc = {'api_keys': {'github_token': 'ghp_from_yaml'}}
        with patch.dict(os.environ, {}, clear=True):
            # Unset relevant env vars so only config_doc matters.
            env = {k: '' for k in ('GITHUB_MODELS_TOKEN', 'GITHUB_TOKEN')}
            with patch.dict(os.environ, env, clear=False):
                self.assertTrue(_credential_is_set('github', config_doc))

    def test_returns_false_when_config_key_is_empty_string(self):
        config_doc = {'api_keys': {'openai_api_key': ''}}
        with patch.dict(os.environ, {'OPENAI_API_KEY': ''}, clear=False):
            self.assertFalse(_credential_is_set('openai', config_doc))

    def test_env_var_takes_precedence_over_empty_config(self):
        config_doc = {'api_keys': {'anthropic_api_key': ''}}
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'sk-ant-test'}, clear=False):
            self.assertTrue(_credential_is_set('anthropic', config_doc))


# ---------------------------------------------------------------------------
# _write_api_key_to_config
# ---------------------------------------------------------------------------

class TestWriteApiKeyToConfig(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.config_path = Path(self.tmpdir) / 'config.yaml'

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _write_initial(self, content: dict):
        self.config_path.write_text(
            yaml.safe_dump(content, sort_keys=False),
            encoding='utf-8',
        )

    def test_creates_config_file_when_missing(self):
        self.assertFalse(self.config_path.exists())
        _write_api_key_to_config(self.config_path, 'api_keys.github_token', 'ghp_new', 'GITHUB_MODELS_TOKEN')
        self.assertTrue(self.config_path.exists())
        doc = yaml.safe_load(self.config_path.read_text())
        self.assertEqual(doc['api_keys']['github_token'], 'ghp_new')

    def test_writes_nested_key_preserving_other_settings(self):
        self._write_initial({'llm': {'default_provider': 'github'}, 'api_keys': {}})
        _write_api_key_to_config(self.config_path, 'api_keys.openai_api_key', 'sk-test', 'OPENAI_API_KEY')
        doc = yaml.safe_load(self.config_path.read_text())
        self.assertEqual(doc['api_keys']['openai_api_key'], 'sk-test')
        self.assertEqual(doc['llm']['default_provider'], 'github')

    def test_sets_env_var_immediately(self):
        os.environ.pop('GROQ_API_KEY', None)
        _write_api_key_to_config(self.config_path, 'api_keys.groq_api_key', 'gsk_test', 'GROQ_API_KEY')
        self.assertEqual(os.environ.get('GROQ_API_KEY'), 'gsk_test')
        os.environ.pop('GROQ_API_KEY', None)

    def test_overwrites_existing_key(self):
        self._write_initial({'api_keys': {'anthropic_api_key': 'sk-ant-old'}})
        _write_api_key_to_config(self.config_path, 'api_keys.anthropic_api_key', 'sk-ant-new', 'ANTHROPIC_API_KEY')
        doc = yaml.safe_load(self.config_path.read_text())
        self.assertEqual(doc['api_keys']['anthropic_api_key'], 'sk-ant-new')

    def test_backup_file_created(self):
        self._write_initial({'api_keys': {}})
        _write_api_key_to_config(self.config_path, 'api_keys.gemini_api_key', 'gm_test', 'GEMINI_API_KEY')
        backup = self.config_path.with_suffix('.yaml.bak')
        self.assertTrue(backup.exists())


# ---------------------------------------------------------------------------
# GET /api/settings/credentials/status
# ---------------------------------------------------------------------------

class TestCredentialsStatusRoute(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.config_path = Path(self.tmpdir) / 'config.yaml'
        with patch('routes.status_routes._resolve_config_yaml_path', return_value=self.config_path):
            self.client = _make_flask_app(self.config_path)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _get_status(self):
        with patch('routes.status_routes._resolve_config_yaml_path', return_value=self.config_path):
            return self.client.get('/api/settings/credentials/status')

    def test_returns_200_with_ok_flag(self):
        r = self._get_status()
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.data)
        self.assertTrue(data['ok'])

    def test_all_known_providers_present(self):
        r = self._get_status()
        data = json.loads(r.data)
        for provider in _PROVIDER_CREDENTIAL_MAP:
            self.assertIn(provider, data['providers'])

    def test_response_shape_per_provider(self):
        r = self._get_status()
        data = json.loads(r.data)
        for provider, info in data['providers'].items():
            self.assertIn('auth_type', info)
            self.assertIn('is_set', info)
            self.assertIn('label', info)
            self.assertIn('get_key_url', info)
            self.assertIn('help_text', info)

    def test_key_values_never_returned(self):
        """The response must never echo back actual key material."""
        self.config_path.write_text(
            yaml.safe_dump({'api_keys': {'github_token': 'ghp_secret'}}),
            encoding='utf-8',
        )
        r = self._get_status()
        body = r.data.decode()
        self.assertNotIn('ghp_secret', body)

    def test_is_set_false_when_no_config_and_no_env(self):
        with patch.dict(os.environ, {'GITHUB_MODELS_TOKEN': '', 'GITHUB_TOKEN': ''}, clear=False):
            r = self._get_status()
        data = json.loads(r.data)
        self.assertFalse(data['providers']['github']['is_set'])

    def test_is_set_true_from_env_var(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'sk-present'}, clear=False):
            r = self._get_status()
        data = json.loads(r.data)
        self.assertTrue(data['providers']['openai']['is_set'])


# ---------------------------------------------------------------------------
# POST /api/settings/credentials
# ---------------------------------------------------------------------------

class TestSaveCredentialRoute(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.config_path = Path(self.tmpdir) / 'config.yaml'
        with patch('routes.status_routes._resolve_config_yaml_path', return_value=self.config_path):
            self.client = _make_flask_app(self.config_path)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _post(self, body: dict):
        with patch('routes.status_routes._resolve_config_yaml_path', return_value=self.config_path):
            return self.client.post(
                '/api/settings/credentials',
                data=json.dumps(body),
                content_type='application/json',
            )

    def test_happy_path_saves_key_and_returns_200(self):
        r = self._post({'provider': 'openai', 'key_value': 'sk-test-key'})
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.data)
        self.assertTrue(data['ok'])
        self.assertTrue(data['is_set'])
        self.assertEqual(data['provider'], 'openai')

    def test_happy_path_key_not_echoed_in_response(self):
        r = self._post({'provider': 'openai', 'key_value': 'sk-test-key'})
        body = r.data.decode()
        self.assertNotIn('sk-test-key', body)

    def test_happy_path_writes_to_config_file(self):
        self._post({'provider': 'anthropic', 'key_value': 'sk-ant-saved'})
        doc = yaml.safe_load(self.config_path.read_text())
        self.assertEqual(doc['api_keys']['anthropic_api_key'], 'sk-ant-saved')

    def test_happy_path_sets_env_var(self):
        os.environ.pop('GROQ_API_KEY', None)
        self._post({'provider': 'groq', 'key_value': 'gsk_env_test'})
        self.assertEqual(os.environ.get('GROQ_API_KEY'), 'gsk_env_test')
        os.environ.pop('GROQ_API_KEY', None)

    def test_unknown_provider_returns_400(self):
        r = self._post({'provider': 'totally_fake', 'key_value': 'some_key'})
        self.assertEqual(r.status_code, 400)
        data = json.loads(r.data)
        self.assertFalse(data['ok'])

    def test_missing_provider_returns_400(self):
        r = self._post({'key_value': 'some_key'})
        self.assertEqual(r.status_code, 400)
        data = json.loads(r.data)
        self.assertFalse(data['ok'])

    def test_empty_key_value_returns_400(self):
        r = self._post({'provider': 'openai', 'key_value': ''})
        self.assertEqual(r.status_code, 400)
        data = json.loads(r.data)
        self.assertFalse(data['ok'])

    def test_whitespace_only_key_returns_400(self):
        r = self._post({'provider': 'openai', 'key_value': '   '})
        self.assertEqual(r.status_code, 400)
        data = json.loads(r.data)
        self.assertFalse(data['ok'])

    def test_device_flow_provider_rejected(self):
        r = self._post({'provider': 'copilot-oauth', 'key_value': 'not_applicable'})
        self.assertEqual(r.status_code, 400)
        data = json.loads(r.data)
        self.assertFalse(data['ok'])
        self.assertIn('device_flow', data['error'])

    def test_cli_provider_rejected(self):
        r = self._post({'provider': 'copilot-sdk', 'key_value': 'not_applicable'})
        self.assertEqual(r.status_code, 400)
        data = json.loads(r.data)
        self.assertFalse(data['ok'])

    def test_none_auth_provider_rejected(self):
        r = self._post({'provider': 'local', 'key_value': 'not_applicable'})
        self.assertEqual(r.status_code, 400)
        data = json.loads(r.data)
        self.assertFalse(data['ok'])

    def test_github_provider_uses_correct_config_key(self):
        self._post({'provider': 'github', 'key_value': 'ghp_gh_test'})
        doc = yaml.safe_load(self.config_path.read_text())
        self.assertEqual(doc['api_keys']['github_token'], 'ghp_gh_test')


# ---------------------------------------------------------------------------
# _PROVIDER_CREDENTIAL_MAP sanity checks
# ---------------------------------------------------------------------------

class TestProviderCredentialMap(unittest.TestCase):

    REQUIRED_FIELDS = ('auth_type', 'config_key', 'env_var', 'label', 'get_key_url', 'help_text')

    def test_all_entries_have_required_fields(self):
        for provider, meta in _PROVIDER_CREDENTIAL_MAP.items():
            for field in self.REQUIRED_FIELDS:
                self.assertIn(field, meta, msg=f"Provider '{provider}' missing field '{field}'")

    def test_auth_types_are_valid(self):
        valid = {'api_key', 'device_flow', 'cli', 'none'}
        for provider, meta in _PROVIDER_CREDENTIAL_MAP.items():
            self.assertIn(meta['auth_type'], valid, msg=f"Invalid auth_type for '{provider}'")

    def test_copilot_oauth_is_device_flow(self):
        self.assertEqual(_PROVIDER_CREDENTIAL_MAP['copilot-oauth']['auth_type'], 'device_flow')

    def test_local_is_none_auth(self):
        self.assertEqual(_PROVIDER_CREDENTIAL_MAP['local']['auth_type'], 'none')

    def test_copilot_sdk_is_cli_auth(self):
        self.assertEqual(_PROVIDER_CREDENTIAL_MAP['copilot-sdk']['auth_type'], 'cli')


if __name__ == '__main__':
    unittest.main()
