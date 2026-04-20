# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for _persist_provider_model_to_config (auth_routes).

Tests the function that writes llm.default_provider and llm.default_model
back to config.yaml whenever the user switches model via POST /api/model.

All file I/O is performed against a real temporary directory so the
atomic-write logic (tmp -> bak -> final) is exercised end-to-end.
Network access is never required.
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

import yaml

from routes.auth_routes import _persist_provider_model_to_config


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_yaml(path: Path, data: dict) -> None:
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding='utf-8')


def _read_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding='utf-8')) or {}


# ---------------------------------------------------------------------------
# Core persistence logic
# ---------------------------------------------------------------------------

class TestPersistProviderModelToConfig(unittest.TestCase):

    def setUp(self):
        import tempfile
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp_dir = Path(self._tmp.name)
        self.config_path = self.tmp_dir / 'config.yaml'

    def tearDown(self):
        self._tmp.cleanup()

    def _call(self, provider='copilot-sdk', model='claude-sonnet-4-6'):
        """Call the function with the config path wired via env-var override."""
        with patch.dict('os.environ', {'CV_BUILDER_CONFIG_FILE': str(self.config_path)}):
            _persist_provider_model_to_config(provider, model)

    # ── happy path ──────────────────────────────────────────────────────────

    def test_writes_provider_and_model_to_nonexistent_file(self):
        """Creates config.yaml from scratch when none exists."""
        self.assertFalse(self.config_path.exists())
        self._call()
        doc = _read_yaml(self.config_path)
        self.assertEqual(doc['llm']['default_provider'], 'copilot-sdk')
        self.assertEqual(doc['llm']['default_model'],    'claude-sonnet-4-6')

    def test_updates_existing_provider_and_model(self):
        """Overwrites prior provider/model values."""
        _write_yaml(self.config_path, {
            'llm': {'default_provider': 'github', 'default_model': 'gpt-4o'},
        })
        self._call(provider='openai', model='gpt-4o-mini')
        doc = _read_yaml(self.config_path)
        self.assertEqual(doc['llm']['default_provider'], 'openai')
        self.assertEqual(doc['llm']['default_model'],    'gpt-4o-mini')

    def test_adds_llm_section_when_missing(self):
        """Inserts llm block into config that has other sections but no llm key."""
        _write_yaml(self.config_path, {'web': {'port': 5000}})
        self._call()
        doc = _read_yaml(self.config_path)
        self.assertIn('llm', doc)
        self.assertEqual(doc['llm']['default_provider'], 'copilot-sdk')

    def test_preserves_other_top_level_sections(self):
        """Pre-existing keys outside llm are not destroyed."""
        _write_yaml(self.config_path, {
            'llm':        {'default_provider': 'github', 'default_model': 'gpt-4o'},
            'web':        {'port': 5001},
            'generation': {'max_skills': 20},
        })
        self._call()
        doc = _read_yaml(self.config_path)
        self.assertEqual(doc['web']['port'],               5001)
        self.assertEqual(doc['generation']['max_skills'],  20)

    def test_preserves_other_llm_keys(self):
        """Extra keys inside the llm section (e.g. temperature) are kept."""
        _write_yaml(self.config_path, {
            'llm': {
                'default_provider': 'github',
                'default_model':    'gpt-4o',
                'temperature':      0.5,
                'max_tokens':       2048,
            },
        })
        self._call()
        doc = _read_yaml(self.config_path)
        self.assertAlmostEqual(doc['llm']['temperature'], 0.5)
        self.assertEqual(doc['llm']['max_tokens'], 2048)

    # ── config path resolution ───────────────────────────────────────────────

    def test_env_var_overrides_default_path(self):
        """CV_BUILDER_CONFIG_FILE points to an alternate path."""
        alt = self.tmp_dir / 'custom_config.yaml'
        with patch.dict('os.environ', {'CV_BUILDER_CONFIG_FILE': str(alt)}):
            _persist_provider_model_to_config('anthropic', 'claude-3-opus-20240229')
        doc = _read_yaml(alt)
        self.assertEqual(doc['llm']['default_provider'], 'anthropic')

    def test_falls_back_to_cwd_config_yaml(self):
        """Without the env var, uses Path.cwd() / 'config.yaml'."""
        import os

        original_cwd = os.getcwd()
        try:
            os.chdir(self.tmp_dir)
            os.environ.pop('CV_BUILDER_CONFIG_FILE', None)
            _persist_provider_model_to_config('gemini', 'gemini-1.5-pro')
        finally:
            os.chdir(original_cwd)

        doc = _read_yaml(self.config_path)  # config_path is tmp_dir / 'config.yaml'
        self.assertEqual(doc['llm']['default_provider'], 'gemini')
        self.assertEqual(doc['llm']['default_model'],    'gemini-1.5-pro')

    # ── atomic write behaviour ───────────────────────────────────────────────

    def test_backup_file_is_created_when_original_exists(self):
        """config.yaml.bak is written when config.yaml exists before the call."""
        _write_yaml(self.config_path, {'llm': {'default_provider': 'github', 'default_model': 'gpt-4o'}})
        self._call()
        backup = self.config_path.with_suffix('.yaml.bak')
        self.assertTrue(backup.exists(), "Expected .bak file to be created")

    def test_no_tmp_file_left_after_successful_write(self):
        """The .tmp file is removed after a successful write."""
        self._call()
        tmp = self.config_path.with_suffix('.yaml.tmp')
        self.assertFalse(tmp.exists(), "Stale .tmp file should not remain after success")

    def test_tmp_file_cleaned_up_on_write_failure(self):
        """If replace() raises, the .tmp file is deleted and the function returns."""
        _write_yaml(self.config_path, {'llm': {'default_provider': 'github', 'default_model': 'gpt-4o'}})

        orig_exists = self.config_path.exists

        def _flaky_replace(target):
            raise OSError("simulated disk full")

        with patch.dict('os.environ', {'CV_BUILDER_CONFIG_FILE': str(self.config_path)}):
            # Patch Path.replace only for the tmp->config step to simulate failure.
            real_path_cls = Path

            class _PatchedPath(type(self.config_path)):
                def replace(self, target):
                    if str(self).endswith('.tmp'):
                        raise OSError("simulated disk full")
                    return super().replace(target)

            with patch('routes.auth_routes.Path', side_effect=lambda *a, **kw: _PatchedPath(*a, **kw)):
                try:
                    _persist_provider_model_to_config('openai', 'gpt-4.1')
                except Exception:
                    pass  # Implementation catches the error; we just verify cleanup.

        tmp = self.config_path.with_suffix('.yaml.tmp')
        self.assertFalse(tmp.exists(), "Stale .tmp file should be cleaned up on failure")

    # ── error handling ───────────────────────────────────────────────────────

    def test_corrupt_yaml_logs_and_returns_without_writing(self):
        """When config.yaml contains invalid YAML the function logs and returns safely."""
        self.config_path.write_text(":\t:invalid yaml::{\n", encoding='utf-8')
        mtime_before = self.config_path.stat().st_mtime

        with patch.dict('os.environ', {'CV_BUILDER_CONFIG_FILE': str(self.config_path)}):
            with self.assertLogs('routes.auth_routes', level='ERROR'):
                _persist_provider_model_to_config('openai', 'gpt-4o')

        # File must not have been replaced with a good write.
        self.config_path.exists()  # still there
        doc_text = self.config_path.read_text(encoding='utf-8')
        self.assertNotIn('default_provider', doc_text)

    def test_empty_config_yaml_treated_as_empty_dict(self):
        """A config.yaml of zero bytes (or just whitespace) does not crash."""
        self.config_path.write_text('', encoding='utf-8')
        self._call()
        doc = _read_yaml(self.config_path)
        self.assertEqual(doc['llm']['default_provider'], 'copilot-sdk')

    def test_llm_key_is_non_dict_is_replaced(self):
        """If llm is a string or null in existing config, it is replaced with a dict."""
        _write_yaml(self.config_path, {'llm': None})
        self._call()
        doc = _read_yaml(self.config_path)
        self.assertIsInstance(doc['llm'], dict)
        self.assertEqual(doc['llm']['default_provider'], 'copilot-sdk')


# ---------------------------------------------------------------------------
# Integration: POST /api/model calls _persist_provider_model_to_config
# ---------------------------------------------------------------------------

class TestPostModelPersistsToConfig(unittest.TestCase):
    """Verify that a successful POST /api/model triggers config persistence."""

    def setUp(self):
        import argparse
        import json
        import tempfile
        from contextlib import ExitStack

        self._tmp = tempfile.TemporaryDirectory()
        tmp_dir = Path(self._tmp.name)

        master_path = tmp_dir / 'Master_CV_Data.json'
        master_path.write_text(json.dumps({
            'personal_info': {'name': 'Test User'},
            'experiences': [],
            'education':   [],
            'skills':      [],
            'awards':      [],
            'publications': [],
            'summary':     '',
        }), encoding='utf-8')

        (tmp_dir / 'publications.bib').touch()

        args = argparse.Namespace(
            llm_provider='local',
            model=None,
            master_data=str(master_path),
            publications=str(tmp_dir / 'publications.bib'),
            output_dir=str(tmp_dir / 'output'),
            job_file=None,
        )

        mock_llm = MagicMock()
        mock_llm.chat.return_value = {
            'response':    'ready',
            'stop_reason': 'end_turn',
            'usage':       {'prompt_tokens': 5, 'completion_tokens': 1},
        }
        mock_llm.model = 'local-model'

        self.stack = ExitStack()
        self.stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=mock_llm))
        self.stack.enter_context(patch('scripts.web_app.get_cached_pricing', return_value={}))
        self.stack.enter_context(patch('scripts.web_app.get_pricing_updated_at', return_value='2024-01-01'))
        self.stack.enter_context(patch('scripts.web_app.get_pricing_source', return_value='static'))

        from scripts.web_app import create_app
        app = create_app(args)
        app.config['TESTING'] = True
        self.client = app.test_client()
        self._tmp_dir = tmp_dir

    def tearDown(self):
        self.stack.close()
        self._tmp.cleanup()

    def test_successful_model_switch_calls_persist(self):
        """A valid POST /api/model invokes _persist_provider_model_to_config."""
        probe_client = MagicMock()
        probe_client.chat.return_value = {
            'response':    'ready',
            'stop_reason': 'end_turn',
            'usage':       {'prompt_tokens': 5, 'completion_tokens': 1},
        }

        with patch('routes.auth_routes.get_llm_provider', return_value=probe_client), \
             patch('routes.auth_routes._persist_provider_model_to_config') as mock_persist:
            response = self.client.post('/api/model', json={
                'provider': 'openai',
                'model':    'gpt-4o',
            })

        self.assertEqual(response.status_code, 200)
        mock_persist.assert_called_once_with('openai', 'gpt-4o')

    def test_failed_probe_does_not_call_persist(self):
        """A probe failure (bad auth) must NOT persist provider/model to config."""
        bad_client = MagicMock()
        bad_client.chat.side_effect = RuntimeError("Authentication failed")

        with patch('routes.auth_routes.get_llm_provider', return_value=bad_client), \
             patch('routes.auth_routes._persist_provider_model_to_config') as mock_persist:
            response = self.client.post('/api/model', json={
                'provider': 'github',
                'model':    'gpt-4o',
            })

        self.assertEqual(response.status_code, 400)
        mock_persist.assert_not_called()

    def test_missing_model_does_not_call_persist(self):
        """POST /api/model with no model field returns 400 without persisting."""
        with patch('routes.auth_routes._persist_provider_model_to_config') as mock_persist:
            response = self.client.post('/api/model', json={'provider': 'openai'})

        self.assertEqual(response.status_code, 400)
        mock_persist.assert_not_called()


if __name__ == '__main__':
    unittest.main()
