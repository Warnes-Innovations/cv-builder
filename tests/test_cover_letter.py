# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for Phase 14: Cover Letter generation endpoints.

Covers:
  - GET /api/cover-letter/prior: returns sessions that have cover_letter_text
  - GET /api/cover-letter/prior: skips sessions without cover_letter_text
  - GET /api/cover-letter/prior: includes full_text (not just preview)
  - POST /api/cover-letter/generate: generates text via LLM and stores in state
  - POST /api/cover-letter/generate: builds header block from date + company_address
  - POST /api/cover-letter/generate: uses skills/achievements from master data
  - POST /api/cover-letter/save: writes DOCX and updates metadata.json
  - POST /api/cover-letter/save: returns 400 when text is empty
  - POST /api/cover-letter/save: returns 400 when no generated CV exists
"""
import argparse
import json
import sys
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, call, mock_open, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.web_app import create_app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


def _make_app(state_overrides=None):
    mock_llm          = MagicMock()
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data = {
        'personal_info':         {'name': 'Dr. Test', 'headline': 'Scientist'},
        'skills':                ['Python', 'R', 'ML'],
        'selected_achievements': [{'id': 'sa1', 'title': 'Led important project'}],
        'professional_summaries': {'ml': 'Experienced ML scientist.'},
    }
    mock_orchestrator.master_data_path = '/tmp/fake_master.json'

    state = {
        'phase':               'refinement',
        'job_analysis':        {'company': 'Acme', 'title': 'Data Scientist',
                                'ats_keywords': ['Python', 'MLOps'],
                                'required_skills': ['scikit-learn']},
        'generated_files':     {'output_dir': '/tmp/cv_output', 'files': []},
        'post_analysis_answers': {},
        'cover_letter_text':   None,
        'cover_letter_params': None,
        'cover_letter_reused_from': None,
    }
    if state_overrides:
        state.update(state_overrides)

    mock_conversation = MagicMock()
    mock_conversation.state = state

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.CVOrchestrator', return_value=mock_orchestrator))
    stack.enter_context(patch('scripts.web_app.ConversationManager', return_value=mock_conversation))

    app = create_app(_make_args())
    app.config['TESTING'] = True

    with app.test_client() as tmp_client:
        sid = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, mock_conversation, mock_llm, sid, stack


# ---------------------------------------------------------------------------
# GET /api/cover-letter/prior
# ---------------------------------------------------------------------------

class TestCoverLetterPrior(unittest.TestCase):

    def _write_session(self, tmpdir: Path, cover_letter_text: str = None,
                       company: str = 'Beta Corp', role: str = 'Engineer',
                       tone: str = 'startup/tech') -> Path:
        """Write a session.json file into a sub-dir of tmpdir."""
        session_dir = tmpdir / f'{company.replace(" ", "_")}_{role.replace(" ", "_")}'
        session_dir.mkdir(parents=True, exist_ok=True)
        state = {'job_analysis': {'company': company, 'title': role}}
        if cover_letter_text is not None:
            state['cover_letter_text']   = cover_letter_text
            state['cover_letter_params'] = {'tone': tone}
        data = {'timestamp': '2025-01-15T10:00:00', 'state': state}
        session_file = session_dir / 'session.json'
        session_file.write_text(json.dumps(data))
        return session_file

    def test_returns_sessions_with_cover_letter(self):
        """Sessions that have cover_letter_text are returned in the list."""
        app, _, _, _, stack = _make_app()
        with stack, tempfile.TemporaryDirectory() as tmpdir:
            self._write_session(Path(tmpdir), cover_letter_text='Dear Hiring Manager, I am excited…')

            mock_cfg = MagicMock()
            mock_cfg.get.return_value = tmpdir

            with app.test_client() as client, \
                 patch('utils.config.get_config', return_value=mock_cfg):
                res  = client.get('/api/cover-letter/prior')
                data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(len(data['sessions']), 1)
        s = data['sessions'][0]
        self.assertEqual(s['company'], 'Beta Corp')
        self.assertEqual(s['tone'],    'startup/tech')
        self.assertIn('preview',   s)
        self.assertIn('full_text', s)

    def test_skips_sessions_without_cover_letter(self):
        """Sessions without cover_letter_text are excluded."""
        app, _, _, _, stack = _make_app()
        with stack, tempfile.TemporaryDirectory() as tmpdir:
            self._write_session(Path(tmpdir), cover_letter_text=None)

            mock_cfg = MagicMock()
            mock_cfg.get.return_value = tmpdir

            with app.test_client() as client, \
                 patch('utils.config.get_config', return_value=mock_cfg):
                data = client.get('/api/cover-letter/prior').get_json()

        self.assertEqual(data['sessions'], [])

    def test_full_text_included_for_reuse(self):
        """full_text field is the complete cover_letter_text (not truncated to 200 chars)."""
        app, _, _, _, stack = _make_app()
        long_letter = 'A' * 500
        with stack, tempfile.TemporaryDirectory() as tmpdir:
            self._write_session(Path(tmpdir), cover_letter_text=long_letter)

            mock_cfg = MagicMock()
            mock_cfg.get.return_value = tmpdir

            with app.test_client() as client, \
                 patch('utils.config.get_config', return_value=mock_cfg):
                data = client.get('/api/cover-letter/prior').get_json()

        s = data['sessions'][0]
        self.assertEqual(len(s['full_text']), 500)
        self.assertEqual(len(s['preview']),   200)


# ---------------------------------------------------------------------------
# POST /api/cover-letter/generate
# ---------------------------------------------------------------------------

class TestCoverLetterGenerate(unittest.TestCase):

    def test_generate_returns_text_and_stores_in_state(self):
        """Generate endpoint calls LLM and stores cover_letter_text in session state."""
        app, conv, mock_llm, sid, stack = _make_app()
        mock_llm.chat.return_value = 'Dear Hiring Manager,\n\nI am delighted…\n\nSincerely,\nDr. Test'

        with stack, app.test_client() as client:
            res  = client.post('/api/cover-letter/generate',
                               json={'tone': 'startup/tech', 'hiring_manager': 'Dr. Smith',
                                     'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertIn('text', data)
        self.assertIn('Dear Hiring Manager', data['text'])
        self.assertEqual(conv.state['cover_letter_text'], data['text'])

    def test_generate_includes_date_header(self):
        """Generated letter text is prefixed with a date block."""
        app, conv, mock_llm, sid, stack = _make_app()
        mock_llm.chat.return_value = 'Dear Dr. Jones,\n\nBody text.'

        with stack, app.test_client() as client:
            res  = client.post('/api/cover-letter/generate',
                               json={'tone': 'academia', 'company_address': '123 Elm St',
                                     'session_id': sid})
            data = res.get_json()

        text = data['text']
        self.assertIn('Date:', text)
        self.assertIn('123 Elm St', text)

    def test_generate_llm_error_returns_500(self):
        """LLM failure returns 500 with ok=False."""
        app, _, mock_llm, sid, stack = _make_app()
        mock_llm.chat.side_effect = RuntimeError('LLM down')

        with stack, app.test_client() as client:
            res  = client.post('/api/cover-letter/generate',
                               json={'tone': 'academia', 'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 500)
        self.assertFalse(data['ok'])
        self.assertIn('LLM error', data['error'])

    def test_generate_stores_params(self):
        """cover_letter_params is stored in session state with correct fields."""
        app, conv, mock_llm, sid, stack = _make_app()
        mock_llm.chat.return_value = 'Dear Team, body.'

        with stack, app.test_client() as client:
            client.post('/api/cover-letter/generate',
                        json={'tone': 'financial', 'hiring_manager': 'Ms Jones',
                              'highlight': 'Grew revenue 3x', 'session_id': sid})

        params = conv.state['cover_letter_params']
        self.assertEqual(params['tone'],            'financial')
        self.assertEqual(params['hiring_manager'],  'Ms Jones')
        self.assertEqual(params['highlight'],       'Grew revenue 3x')


# ---------------------------------------------------------------------------
# POST /api/cover-letter/save
# ---------------------------------------------------------------------------

class TestCoverLetterSave(unittest.TestCase):

    def test_save_writes_docx_and_updates_metadata(self):
        """Save writes a DOCX file and appends cover_letter_text to metadata.json."""
        app, conv, _, sid, stack = _make_app()
        existing_meta = json.dumps({'company': 'Acme', 'role': 'Scientist'})

        mock_doc = MagicMock()

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=existing_meta)), \
             patch('pathlib.Path.exists', return_value=True), \
             patch('json.dump') as mock_dump, \
             patch('docx.Document', return_value=mock_doc):

            res  = client.post('/api/cover-letter/save',
                               json={'text': 'Dear Hiring Manager,\n\nGreat role!',
                                     'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertIn('CoverLetter_', data['filename'])
        self.assertIn('.docx', data['filename'])
        dumped_meta = mock_dump.call_args[0][0]
        self.assertEqual(dumped_meta['cover_letter_text'], 'Dear Hiring Manager,\n\nGreat role!')

    def test_save_empty_text_returns_400(self):
        """Sending empty or missing text returns 400."""
        app, _, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post('/api/cover-letter/save', json={'text': '', 'session_id': sid})
        self.assertEqual(res.status_code, 400)

    def test_save_without_generated_cv_returns_400(self):
        """Save without a generated CV in session state returns 400."""
        app, _, _, sid, stack = _make_app(state_overrides={'generated_files': None})
        with stack, app.test_client() as client:
            res = client.post('/api/cover-letter/save',
                              json={'text': 'Dear Hiring Manager, …', 'session_id': sid})
        self.assertEqual(res.status_code, 400)
        self.assertIn('generate', res.get_json()['error'].lower())


if __name__ == '__main__':
    unittest.main()
