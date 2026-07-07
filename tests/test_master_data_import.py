# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Tests for GAP-19 16.16: full-file JSON import with diff review.

Covered scenarios:
  - POST /api/master-data/import-preview: section-level changed/count
    summary, schema-validation rejection, non-object payload rejection,
    phase-gating
  - POST /api/master-data/import-confirm: real-repo commit, no-repo case,
    schema-validation rejection (nothing written), phase-gating
"""

import argparse
import json
import shutil
import subprocess
import sys
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.web_app import create_app
from scripts.utils.master_data_validator import ValidationResult


def _init_git_repo(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    env = {'HOME': str(path), 'PATH': '/usr/bin:/bin:/usr/local/bin'}
    subprocess.run(['git', 'init'], cwd=str(path), check=True, capture_output=True, env=env)
    subprocess.run(['git', 'config', 'user.email', 'test@example.com'], cwd=str(path), check=True, capture_output=True, env=env)
    subprocess.run(['git', 'config', 'user.name', 'Test User'], cwd=str(path), check=True, capture_output=True, env=env)
    marker = path / '.gitkeep'
    marker.write_text('')
    subprocess.run(['git', 'add', '.gitkeep'], cwd=str(path), check=True, capture_output=True, env=env)
    subprocess.run(['git', 'commit', '-m', 'chore: initial'], cwd=str(path), check=True, capture_output=True, env=env)


def _make_args(**overrides) -> argparse.Namespace:
    defaults = dict(
        llm_provider='local', model=None, master_data=None,
        publications=None, output_dir='/tmp/cv_test_output', job_file=None,
    )
    defaults.update(overrides)
    return argparse.Namespace(**defaults)


def _make_app_with_real_master(master_path: Path, master_data: dict, phase: str = 'refinement'):
    """App wired to a real master-data file on disk, for import-preview/confirm tests."""
    master_path.parent.mkdir(parents=True, exist_ok=True)
    master_path.write_text(json.dumps(master_data, indent=2))

    mock_llm = MagicMock()
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data = master_data
    mock_orchestrator.master_data_path = str(master_path)

    mock_conversation = MagicMock()
    mock_conversation.state = {'phase': phase}

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.CVOrchestrator', return_value=mock_orchestrator))
    stack.enter_context(patch('scripts.web_app.ConversationManager', return_value=mock_conversation))
    stack.enter_context(patch(
        'scripts.web_app.validate_master_data_file',
        return_value=ValidationResult(valid=True),
    ))

    app = create_app(_make_args())
    app.config['TESTING'] = True

    with app.test_client() as tmp_client:
        sid = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, mock_orchestrator, mock_conversation, sid, stack


def _fresh_tmp_dir(path: Path) -> Path:
    shutil.rmtree(path, ignore_errors=True)
    path.mkdir(parents=True, exist_ok=True)
    return path


class TestImportPreviewRoute(unittest.TestCase):

    def test_returns_section_level_diff_summary(self, tmp_path=Path('/tmp/mdu_import_preview1')):
        _fresh_tmp_dir(tmp_path)
        master_path = tmp_path / 'Master_CV_Data.json'
        current = {'experience': [{'id': 'e1'}], 'skills': ['Python']}
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, current)
        new_data = {'experience': [{'id': 'e1'}, {'id': 'e2'}], 'skills': ['Python']}

        with stack, app.test_client() as client:
            res = client.post('/api/master-data/import-preview', json={'data': new_data, 'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        by_section = {s['section']: s for s in data['sections']}
        self.assertTrue(by_section['experience']['changed'])
        self.assertEqual(by_section['experience']['current_count'], 1)
        self.assertEqual(by_section['experience']['new_count'], 2)
        self.assertFalse(by_section['skills']['changed'])

    def test_diff_summary_handles_section_shape_change_without_crashing(self, tmp_path=Path('/tmp/mdu_import_preview_shape')):
        """A section changing shape (list -> categorized dict) between current
        and uploaded data is both schema-valid (skills allows either shape)
        and must not crash the count-based diff summary."""
        _fresh_tmp_dir(tmp_path)
        master_path = tmp_path / 'Master_CV_Data.json'
        current = {'experience': [], 'skills': ['Python', 'R']}
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, current)
        new_data = {'experience': [], 'skills': {'ml': {'category': 'ML', 'skills': ['Python']}}}

        with stack, app.test_client() as client:
            res = client.post('/api/master-data/import-preview', json={'data': new_data, 'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        by_section = {s['section']: s for s in data['sections']}
        self.assertTrue(by_section['skills']['changed'])
        self.assertEqual(by_section['skills']['current_count'], 2)
        self.assertEqual(by_section['skills']['new_count'], 1)

    def test_non_object_payload_returns_400(self, tmp_path=Path('/tmp/mdu_import_preview2')):
        _fresh_tmp_dir(tmp_path)
        master_path = tmp_path / 'Master_CV_Data.json'
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, {'experience': []})

        with stack, app.test_client() as client:
            res = client.post('/api/master-data/import-preview', json={'data': ['not', 'an', 'object'], 'session_id': sid})

        self.assertEqual(res.status_code, 400)

    def test_schema_invalid_payload_returns_400_with_errors(self, tmp_path=Path('/tmp/mdu_import_preview3')):
        _fresh_tmp_dir(tmp_path)
        master_path = tmp_path / 'Master_CV_Data.json'
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, {'experience': []})

        with stack, app.test_client() as client:
            res = client.post(
                '/api/master-data/import-preview',
                json={'data': {'experience': 'not-a-list'}, 'session_id': sid},
            )
            data = res.get_json()

        self.assertEqual(res.status_code, 400)
        self.assertFalse(data['ok'])
        self.assertIn('validation_errors', data)

    def test_phase_gating_409(self, tmp_path=Path('/tmp/mdu_import_preview4')):
        _fresh_tmp_dir(tmp_path)
        master_path = tmp_path / 'Master_CV_Data.json'
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, {'experience': []}, phase='analysis')

        with stack, app.test_client() as client:
            res = client.post('/api/master-data/import-preview', json={'data': {'experience': []}, 'session_id': sid})

        self.assertEqual(res.status_code, 409)


class TestImportConfirmRoute(unittest.TestCase):

    def test_import_confirm_writes_and_commits_in_real_repo(self, tmp_path=Path('/tmp/mdu_import_confirm1')):
        _fresh_tmp_dir(tmp_path)
        repo_dir = tmp_path / 'cv_repo'
        _init_git_repo(repo_dir)
        master_path = repo_dir / 'Master_CV_Data.json'
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, {'experience': [], 'skills': ['Python']})
        new_data = {'experience': [{'id': 'e1', 'title': 'Engineer', 'company': 'Acme'}], 'skills': ['Python', 'Rust']}

        with stack, app.test_client() as client:
            res = client.post('/api/master-data/import-confirm', json={'data': new_data, 'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertIsNotNone(data['commit_hash'])
        self.assertIsNone(data['git_error'])
        written = json.loads(master_path.read_text())
        self.assertEqual(len(written['experience']), 1)
        self.assertIn('Rust', written['skills'])

        commit_subject = subprocess.run(
            ['git', '-C', str(repo_dir), 'show', '-s', '--format=%s', 'HEAD'],
            capture_output=True, text=True,
        ).stdout
        self.assertIn('Import full master CV data', commit_subject)

    def test_import_confirm_git_error_when_no_repo(self, tmp_path=Path('/tmp/mdu_import_confirm2')):
        _fresh_tmp_dir(tmp_path)
        master_path = tmp_path / 'no_git' / 'Master_CV_Data.json'
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, {'experience': []})
        new_data = {'experience': [{'id': 'e1', 'title': 'Engineer', 'company': 'Acme'}]}

        with stack, app.test_client() as client:
            res = client.post('/api/master-data/import-confirm', json={'data': new_data, 'session_id': sid})
            data = res.get_json()

        self.assertTrue(data['ok'])
        self.assertIsNone(data['commit_hash'])
        self.assertIsNotNone(data['git_error'])
        written = json.loads(master_path.read_text())
        self.assertEqual(len(written['experience']), 1)

    def test_import_confirm_rejects_invalid_schema_and_writes_nothing(self, tmp_path=Path('/tmp/mdu_import_confirm3')):
        _fresh_tmp_dir(tmp_path)
        master_path = tmp_path / 'Master_CV_Data.json'
        original = {'experience': [{'id': 'keep-me'}]}
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, original)

        with stack, app.test_client() as client:
            res = client.post(
                '/api/master-data/import-confirm',
                json={'data': {'experience': 'not-a-list'}, 'session_id': sid},
            )
            data = res.get_json()

        self.assertEqual(res.status_code, 400)
        self.assertFalse(data['ok'])
        # Nothing written — original file on disk is untouched.
        self.assertEqual(json.loads(master_path.read_text()), original)

    def test_import_confirm_non_object_payload_returns_400(self, tmp_path=Path('/tmp/mdu_import_confirm4')):
        _fresh_tmp_dir(tmp_path)
        master_path = tmp_path / 'Master_CV_Data.json'
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, {'experience': []})

        with stack, app.test_client() as client:
            res = client.post('/api/master-data/import-confirm', json={'data': 'not an object', 'session_id': sid})

        self.assertEqual(res.status_code, 400)

    def test_import_confirm_phase_gating_409(self, tmp_path=Path('/tmp/mdu_import_confirm5')):
        _fresh_tmp_dir(tmp_path)
        master_path = tmp_path / 'Master_CV_Data.json'
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, {'experience': []}, phase='analysis')

        with stack, app.test_client() as client:
            res = client.post('/api/master-data/import-confirm', json={'data': {'experience': []}, 'session_id': sid})

        self.assertEqual(res.status_code, 409)

    def test_import_confirm_rejects_if_phase_changed_since_preview(self, tmp_path=Path('/tmp/mdu_import_confirm6')):
        """Phase gating must be re-checked fresh at confirm time, not just
        relied upon from an earlier preview call in an editable phase."""
        _fresh_tmp_dir(tmp_path)
        master_path = tmp_path / 'Master_CV_Data.json'
        original = {'experience': [{'id': 'keep-me'}]}
        app, orch, conv, sid, stack = _make_app_with_real_master(master_path, original, phase='refinement')
        new_data = {'experience': [{'id': 'e1', 'title': 'Engineer', 'company': 'Acme'}]}

        with stack, app.test_client() as client:
            preview_res = client.post('/api/master-data/import-preview', json={'data': new_data, 'session_id': sid})
            self.assertEqual(preview_res.status_code, 200)

            # Phase changes to a non-editable stage between preview and confirm
            # (e.g. the user started job analysis in another tab).
            conv.state['phase'] = 'analysis'

            confirm_res = client.post('/api/master-data/import-confirm', json={'data': new_data, 'session_id': sid})

        self.assertEqual(confirm_res.status_code, 409)
        # Nothing written — original file on disk is untouched.
        self.assertEqual(json.loads(master_path.read_text()), original)


if __name__ == '__main__':
    unittest.main()
