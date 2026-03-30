# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Integration tests for git commit behaviour in generation and master-data routes.

These tests spin up a real git repository inside a tmp_path fixture so that the
subprocess calls made by the production code succeed (or fail) naturally, without
patching subprocess.run.  This verifies that the -C flag pattern used in both
finalise and harvest-apply routes correctly locates the repository from the data
path rather than from __file__.

Covered scenarios:
  - finalise: git add+commit succeeds when output_dir is inside a git repo
  - finalise: git error returned when output_dir is outside any git repo
  - harvest-apply: git add+commit succeeds when master_path is inside a git repo
  - harvest-apply: git error returned when master_path is outside any git repo
  - _save_master: git add stages the file when master_path is inside a git repo
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

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.web_app import create_app
from scripts.utils.master_data_validator import ValidationResult


# ---------------------------------------------------------------------------
# Git repo helper
# ---------------------------------------------------------------------------

def _init_git_repo(path: Path) -> None:
    """Initialise a bare git repository at *path* with an empty initial commit."""
    path.mkdir(parents=True, exist_ok=True)
    env = {'HOME': str(path), 'PATH': '/usr/bin:/bin:/usr/local/bin'}
    subprocess.run(['git', 'init'], cwd=str(path), check=True, capture_output=True, env=env)
    subprocess.run(
        ['git', 'config', 'user.email', 'test@example.com'],
        cwd=str(path), check=True, capture_output=True, env=env,
    )
    subprocess.run(
        ['git', 'config', 'user.name', 'Test User'],
        cwd=str(path), check=True, capture_output=True, env=env,
    )
    # Create an initial commit so HEAD is valid
    marker = path / '.gitkeep'
    marker.write_text('')
    subprocess.run(['git', 'add', '.gitkeep'], cwd=str(path), check=True, capture_output=True, env=env)
    subprocess.run(
        ['git', 'commit', '-m', 'chore: initial'],
        cwd=str(path), check=True, capture_output=True, env=env,
    )


# ---------------------------------------------------------------------------
# App factory helper
# ---------------------------------------------------------------------------

def _make_app_with_paths(output_dir: Path, master_path: Path) -> tuple:
    """Return (app, mock_conversation, mock_orchestrator, session_id, stack).

    The mock_orchestrator.master_data_path points to master_path so that
    harvest-apply can derive the correct -C root.
    """
    mock_llm          = MagicMock()
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data      = {'experience': [], 'skills': [], 'summary_variants': []}
    mock_orchestrator.master_data_path = str(master_path)

    state = {
        'phase':                'refinement',
        'job_analysis':         {'company': 'Acme', 'title': 'Engineer', 'ats_keywords': []},
        'generated_files':      {
            'output_dir': str(output_dir),
            'files':      ['cv.pdf'],
        },
        'approved_rewrites':    [],
        'rewrite_audit':        [],
        'customizations':       {},
        'post_analysis_answers': {},
        'spell_audit':          [],
        'layout_instructions':  [],
    }

    mock_conversation = MagicMock()
    mock_conversation.state = state
    mock_conversation.orchestrator = mock_orchestrator
    mock_conversation.run_persuasion_checks.return_value = []

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider',     return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.CVOrchestrator',        return_value=mock_orchestrator))
    stack.enter_context(patch('scripts.web_app.ConversationManager',   return_value=mock_conversation))
    stack.enter_context(patch(
        'scripts.web_app.validate_master_data_file',
        return_value=ValidationResult(valid=True),
    ))

    args = argparse.Namespace(
        llm_provider='local',
        model=None,
        master_data=None,
        publications=None,
        output_dir=str(output_dir),
        job_file=None,
    )
    app = create_app(args)
    app.config['TESTING'] = True

    with app.test_client() as tmp_client:
        sid = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, mock_conversation, mock_orchestrator, sid, stack


# ---------------------------------------------------------------------------
# Finalise git-commit integration tests
# ---------------------------------------------------------------------------

def test_finalise_git_commit_succeeds_in_real_repo(tmp_path):
    """POST /api/finalise commits output_dir when it lives inside a real git repo."""
    repo_dir = tmp_path / 'cv_repo'
    _init_git_repo(repo_dir)

    output_dir = repo_dir / 'Acme_Engineer_2026-01-01'
    output_dir.mkdir()
    (output_dir / 'cv.pdf').write_bytes(b'%PDF-1.4')

    metadata_content = json.dumps({'company': 'Acme', 'role': 'Engineer'})
    master_path = tmp_path / 'Master_CV_Data.json'

    app, conv, orch, sid, stack = _make_app_with_paths(output_dir, master_path)

    with stack, app.test_client() as client, \
         patch('pathlib.Path.exists', return_value=True), \
         patch('builtins.open', unittest.mock.mock_open(read_data=metadata_content)), \
         patch('json.dump'):

        res  = client.post('/api/finalise', json={'status': 'ready', 'session_id': sid})
        data = res.get_json()

    assert res.status_code == 200
    assert data['ok'] is True
    assert data['git_error'] is None
    assert data['commit_hash'] is not None
    assert len(data['commit_hash']) >= 7


def test_finalise_git_error_when_no_repo(tmp_path):
    """POST /api/finalise sets git_error when output_dir is outside any git repo."""
    output_dir = tmp_path / 'no_git' / 'Acme_Engineer_2026-01-01'
    output_dir.mkdir(parents=True)
    (output_dir / 'cv.pdf').write_bytes(b'%PDF-1.4')

    metadata_content = json.dumps({'company': 'Acme', 'role': 'Engineer'})
    master_path = tmp_path / 'Master_CV_Data.json'

    app, conv, orch, sid, stack = _make_app_with_paths(output_dir, master_path)

    with stack, app.test_client() as client, \
         patch('pathlib.Path.exists', return_value=True), \
         patch('builtins.open', unittest.mock.mock_open(read_data=metadata_content)), \
         patch('json.dump'):

        res  = client.post('/api/finalise', json={'status': 'ready', 'session_id': sid})
        data = res.get_json()

    assert res.status_code == 200
    assert data['ok'] is True
    assert data['commit_hash'] is None
    assert data['git_error'] is not None


def test_finalise_git_commit_succeeds_for_generation_phase(tmp_path):
    """POST /api/finalise transitions phase and captures commit_hash from generation phase."""
    repo_dir = tmp_path / 'cv_repo'
    _init_git_repo(repo_dir)

    output_dir = repo_dir / 'BetaCorp_Dev_2026-01-01'
    output_dir.mkdir()
    (output_dir / 'cv.pdf').write_bytes(b'%PDF-1.4')

    metadata_content = json.dumps({'company': 'BetaCorp', 'role': 'Dev'})
    master_path = tmp_path / 'Master_CV_Data.json'

    app, conv, orch, sid, stack = _make_app_with_paths(output_dir, master_path)
    conv.state['phase'] = 'generation'
    conv.state['generated_files'] = {'output_dir': str(output_dir), 'files': ['cv.pdf']}

    with stack, app.test_client() as client, \
         patch('pathlib.Path.exists', return_value=True), \
         patch('builtins.open', unittest.mock.mock_open(read_data=metadata_content)), \
         patch('json.dump'):

        res  = client.post('/api/finalise', json={'status': 'ready', 'session_id': sid})
        data = res.get_json()

    assert res.status_code == 200
    assert data['ok'] is True
    assert data['git_error'] is None
    assert data['commit_hash'] is not None


# ---------------------------------------------------------------------------
# Harvest-apply git-commit integration tests
# ---------------------------------------------------------------------------

def test_harvest_apply_git_commit_succeeds_in_real_repo(tmp_path):
    """POST /api/harvest/apply commits master_path when it lives inside a real git repo."""
    repo_dir = tmp_path / 'cv_repo'
    _init_git_repo(repo_dir)

    master_path = repo_dir / 'Master_CV_Data.json'
    master_data = {'experience': [], 'skills': ['Python'], 'summary_variants': []}
    master_path.write_text(json.dumps(master_data, indent=2))

    output_dir = tmp_path / 'some_output'
    output_dir.mkdir()

    app, conv, orch, sid, stack = _make_app_with_paths(output_dir, master_path)
    orch.master_data      = master_data
    orch.master_data_path = str(master_path)

    candidate_id = 'skill_MachineLearning'
    conv.state['phase'] = 'refinement'
    candidate = {
        'id':            candidate_id,
        'type':          'new_skill',
        'proposed_skill': {'name': 'MachineLearning'},
        'proposed':      'MachineLearning',
        'original':      '(not in master data)',
        'label':         'New skill — MachineLearning',
        'rationale':     'Test candidate',
    }

    with stack, app.test_client() as client:
        with patch(
            'scripts.routes.generation_routes._compile_harvest_candidates',
            return_value=[candidate],
        ):
            res  = client.post(
                '/api/harvest/apply',
                json={'selected_ids': [candidate_id], 'session_id': sid},
            )
            data = res.get_json()

    assert res.status_code == 200
    assert data['ok'] is True
    assert data['git_error'] is None
    assert data['commit_hash'] is not None


def test_harvest_apply_git_error_when_no_repo(tmp_path):
    """POST /api/harvest/apply sets git_error when master_path is outside any git repo."""
    master_path = tmp_path / 'no_git' / 'Master_CV_Data.json'
    master_path.parent.mkdir(parents=True)
    master_data = {'experience': [], 'skills': ['Python'], 'summary_variants': []}
    master_path.write_text(json.dumps(master_data, indent=2))

    output_dir = tmp_path / 'some_output'
    output_dir.mkdir()

    app, conv, orch, sid, stack = _make_app_with_paths(output_dir, master_path)
    orch.master_data      = master_data
    orch.master_data_path = str(master_path)

    candidate_id = 'skill_MachineLearning'
    conv.state['phase'] = 'refinement'
    candidate = {
        'id':            candidate_id,
        'type':          'new_skill',
        'proposed_skill': {'name': 'MachineLearning'},
        'proposed':      'MachineLearning',
        'original':      '(not in master data)',
        'label':         'New skill — MachineLearning',
        'rationale':     'Test candidate',
    }

    with stack, app.test_client() as client:
        with patch(
            'scripts.routes.generation_routes._compile_harvest_candidates',
            return_value=[candidate],
        ):
            res  = client.post(
                '/api/harvest/apply',
                json={'selected_ids': [candidate_id], 'session_id': sid},
            )
            data = res.get_json()

    assert res.status_code == 200
    assert data['ok'] is True
    assert data['commit_hash'] is None
    assert data['git_error'] is not None


# ---------------------------------------------------------------------------
# _save_master git-add integration test (master_data_routes)
# ---------------------------------------------------------------------------

def test_save_master_stages_file_in_real_repo(tmp_path):
    """_save_master() stages the master file in git when it is inside a real repo."""
    repo_dir = tmp_path / 'cv_repo'
    _init_git_repo(repo_dir)

    master_path = repo_dir / 'Master_CV_Data.json'
    master_data = {'experience': [], 'skills': []}

    from scripts.routes.master_data_routes import _save_master

    _save_master(master_data, master_path)

    # Verify the file was written
    assert master_path.exists()
    saved = json.loads(master_path.read_text())
    assert saved == master_data

    # Verify git sees it as staged (index)
    result = subprocess.run(
        ['git', '-C', str(repo_dir), 'diff', '--cached', '--name-only'],
        capture_output=True, text=True,
    )
    assert 'Master_CV_Data.json' in result.stdout


def test_save_master_does_not_raise_outside_repo(tmp_path):
    """_save_master() silently skips git staging when master_path is outside any repo."""
    master_path = tmp_path / 'no_git' / 'Master_CV_Data.json'
    master_path.parent.mkdir(parents=True)
    master_data = {'experience': [], 'skills': []}

    from scripts.routes.master_data_routes import _save_master

    # Should not raise even though there is no git repo
    _save_master(master_data, master_path)

    assert master_path.exists()
    saved = json.loads(master_path.read_text())
    assert saved == master_data
