# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for Phase 15: Screening Question endpoints.

Covers:
  - POST /api/screening/search: returns prior match when similarity >= 0.25
  - POST /api/screening/search: returns empty prior when library has no match
  - POST /api/screening/search: surfaces top 3 experiences by similarity
  - POST /api/screening/search: returns 400 when question is missing
  - POST /api/screening/generate: calls LLM and returns draft text
  - POST /api/screening/generate: injects post_analysis_answers context
  - POST /api/screening/generate: returns 400 when question is missing
  - POST /api/screening/generate: returns 500 on LLM error
  - POST /api/screening/save: writes DOCX, updates metadata.json, upserts library
  - POST /api/screening/save: returns 400 when no responses provided
"""
import argparse
import json
import sys
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.web_app import create_app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_MASTER_DATA = {
    'personal_info': {'name': 'Dr. Test'},
    'skills':        ['Python', 'Statistics'],
    'experience': [
        {
            'title':        'Senior Data Scientist',
            'company':      'Acme Corp',
            'date_range':   '2020–2024',
            'summary':      'Led machine learning projects and cross-functional teams.',
            'achievements': ['Delivered ML pipeline saving $2M', 'Led team of 8'],
        },
        {
            'title':        'Biostatistician',
            'company':      'Pharma Inc',
            'date_range':   '2017–2020',
            'summary':      'Clinical trial statistics and regulatory submissions.',
            'achievements': ['Contributed to NDA submisson', 'Developed SAS macros'],
        },
        {
            'title':        'Research Analyst',
            'company':      'University Lab',
            'date_range':   '2015–2017',
            'summary':      'Published genomics research and developed bioinformatics pipelines.',
            'achievements': ['4 peer-reviewed publications'],
        },
    ],
}

_RESPONSE_LIBRARY = [
    {
        'question':      'Describe a time you led a cross-functional team.',
        'topic_tag':     'leadership',
        'response_text': 'I led a cross-functional team of engineers and scientists to deliver a machine learning pipeline on time and under budget.',
        'format':        'star',
        'company':       'OldCo',
        'date':          '2024-01-10',
        'session_path':  '/tmp/old_session',
    },
]


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


def _make_app(state_overrides=None, output_dir: str = '/tmp/cv_test_output'):
    mock_llm          = MagicMock()
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data      = _MASTER_DATA
    mock_orchestrator.master_data_path = '/tmp/fake_master.json'
    mock_orchestrator.output_dir       = output_dir

    state = {
        'phase':                    'refinement',
        'job_analysis':             {'company': 'Acme', 'title': 'Data Scientist'},
        'generated_files':          {'output_dir': output_dir, 'files': []},
        'post_analysis_answers':    {},
        'cover_letter_text':        None,
        'cover_letter_params':      None,
        'cover_letter_reused_from': None,
        'screening_responses':      [],
    }
    if state_overrides:
        state.update(state_overrides)

    mock_conversation       = MagicMock()
    mock_conversation.state = state

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider',    return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.CVOrchestrator',       return_value=mock_orchestrator))
    stack.enter_context(patch('scripts.web_app.ConversationManager',  return_value=mock_conversation))

    app = create_app(_make_args(output_dir=output_dir))
    app.config['TESTING'] = True

    with app.test_client() as tmp_client:
        sid = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, mock_conversation, mock_llm, sid, stack


def _make_mock_cfg(master_cv_path: str = '/tmp/fake/Master_CV_Data.json'):
    cfg = MagicMock()
    cfg.master_cv_path = master_cv_path
    return cfg


# ---------------------------------------------------------------------------
# POST /api/screening/search
# ---------------------------------------------------------------------------

class TestScreeningSearch(unittest.TestCase):

    def _search(self, question: str, master: dict = None, library: list = None):
        """Helper: call /api/screening/search with mocked filesystem."""
        app, _, _, _, stack = _make_app()
        m = master if master is not None else _MASTER_DATA
        lib = library if library is not None else []

        with stack, tempfile.TemporaryDirectory() as td:
            lib_path    = Path(td) / 'response_library.json'
            master_path = Path(td) / 'Master_CV_Data.json'
            lib_path.write_text(json.dumps(lib))
            master_path.write_text(json.dumps(m))
            cfg = _make_mock_cfg(master_cv_path=str(master_path))

            with app.test_client() as client, \
                 patch('utils.config.get_config', return_value=cfg):
                res  = client.post('/api/screening/search',
                                   json={'question': question})
                data   = res.get_json()
                status = res.status_code
                if status >= 400:
                    raise AssertionError(f'search returned {status}: {data}')
                return data, status

    def test_returns_prior_match_when_similarity_high(self):
        data, status = self._search(
            'Describe a time you led a cross-functional team.',
            library=_RESPONSE_LIBRARY,
        )
        self.assertEqual(status, 200)
        self.assertTrue(data['ok'])
        self.assertIsNotNone(data['prior'])
        self.assertEqual(data['prior']['topic_tag'], 'leadership')

    def test_no_prior_when_library_empty(self):
        data, status = self._search(
            'What is your experience with Python?',
            library=[],
        )
        self.assertEqual(status, 200)
        self.assertIsNone(data['prior'])

    def test_returns_up_to_three_experiences(self):
        data, status = self._search('machine learning research pipeline')
        self.assertEqual(status, 200)
        self.assertLessEqual(len(data['experiences']), 3)
        self.assertGreater(len(data['experiences']), 0)

    def test_experience_has_required_fields(self):
        data, _ = self._search('describe your leadership experience')
        exp = data['experiences'][0]
        for field in ('idx', 'score', 'title', 'company', 'date_range', 'summary'):
            self.assertIn(field, exp, f'Missing field: {field}')

    def test_returns_400_when_question_missing(self):
        app, _, _, _, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post('/api/screening/search', json={})
            self.assertEqual(res.status_code, 400)


# ---------------------------------------------------------------------------
# POST /api/screening/generate
# ---------------------------------------------------------------------------

class TestScreeningGenerate(unittest.TestCase):

    def _generate(self, payload: dict, llm_response: str = 'Draft response text.',
                  state_overrides: dict = None):
        app, conv, mock_llm, sid, stack = _make_app(state_overrides=state_overrides)
        mock_llm.chat.return_value = llm_response

        with stack, tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text(json.dumps(_MASTER_DATA))
            cfg = _make_mock_cfg(master_cv_path=str(master_path))

            with app.test_client() as client, \
                 patch('utils.config.get_config', return_value=cfg):
                res  = client.post('/api/screening/generate', json={**payload, 'session_id': sid})
                return res.get_json(), res.status_code, mock_llm

    def test_returns_draft_text(self):
        data, status, _ = self._generate({
            'question': 'Describe a leadership challenge.',
            'format':   'star',
        })
        self.assertEqual(status, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['text'], 'Draft response text.')

    def test_injects_post_analysis_answers(self):
        data, _, mock_llm = self._generate(
            {'question': 'Why do you want this role?', 'format': 'direct'},
            state_overrides={'post_analysis_answers': {'career_goal': 'Lead ML teams'}},
        )
        prompt_used = mock_llm.chat.call_args
        # Check that the clarification context appears in the messages
        call_kwargs = prompt_used[1] if prompt_used[1] else {}
        messages    = call_kwargs.get('messages') or prompt_used[0][0]
        full_prompt = ' '.join(m['content'] for m in messages)
        self.assertIn('career_goal', full_prompt)

    def test_cover_letter_snippet_included_when_present(self):
        _, _, mock_llm = self._generate(
            {'question': 'What motivates you?', 'format': 'direct'},
            state_overrides={'cover_letter_text': 'I am excited about transformative AI work.'},
        )
        messages   = mock_llm.chat.call_args[1]['messages']
        full_prompt = ' '.join(m['content'] for m in messages)
        self.assertIn('Cover letter excerpt', full_prompt)

    def test_returns_400_when_question_missing(self):
        data, status, _ = self._generate({'format': 'star'})
        self.assertEqual(status, 400)
        self.assertFalse(data['ok'])

    def test_returns_500_on_llm_error(self):
        app, conv, mock_llm, sid, stack = _make_app()
        mock_llm.chat.side_effect = RuntimeError('LLM unavailable')

        with stack, tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text(json.dumps(_MASTER_DATA))
            cfg = _make_mock_cfg(master_cv_path=str(master_path))

            with app.test_client() as client, \
                 patch('utils.config.get_config', return_value=cfg):
                res  = client.post('/api/screening/generate',
                                   json={'question': 'Tell me about yourself.', 'format': 'direct',
                                         'session_id': sid})
                self.assertEqual(res.status_code, 500)
                self.assertIn('LLM request failed', res.get_json()['error'])


# ---------------------------------------------------------------------------
# POST /api/screening/save
# ---------------------------------------------------------------------------

class TestScreeningSave(unittest.TestCase):

    _RESPONSES = [
        {
            'question':      'Describe a leadership challenge.',
            'topic_tag':     'leadership',
            'format':        'star',
            'response_text': 'I led a cross-functional team through a difficult transition…',
        },
        {
            'question':  'Tell me about your Python experience.',
            'topic_tag': 'technical',
            'format':    'direct',
            'response_text': 'I have 10 years of Python experience…',
        },
    ]

    def test_save_writes_docx_and_updates_metadata_and_library(self):
        with tempfile.TemporaryDirectory() as td:
            out_dir     = Path(td)
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text(json.dumps(_MASTER_DATA))
            lib_path    = Path(td) / 'response_library.json'
            lib_path.write_text(json.dumps([]))
            cfg = _make_mock_cfg(master_cv_path=str(master_path))

            app, conv, _, sid, stack = _make_app(output_dir=str(out_dir))

            with stack, app.test_client() as client, \
                 patch('utils.config.get_config', return_value=cfg):
                res  = client.post('/api/screening/save',
                                   json={'responses': self._RESPONSES, 'session_id': sid})
                data = res.get_json()

            self.assertEqual(res.status_code, 200)
            self.assertTrue(data['ok'])
            self.assertEqual(data['count'], 2)

            docx_files = list(out_dir.glob('Screening_Responses_*.docx'))
            self.assertEqual(len(docx_files), 1)

            meta = json.loads((out_dir / 'metadata.json').read_text())
            self.assertEqual(len(meta['screening_responses']), 2)
            self.assertEqual(meta['screening_responses'][0]['topic_tag'], 'leadership')

            lib = json.loads(lib_path.read_text())
            self.assertEqual(len(lib), 2)
            self.assertEqual(lib[0]['question'], 'Describe a leadership challenge.')

    def test_save_returns_400_when_no_responses(self):
        app, _, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post('/api/screening/save', json={'responses': [], 'session_id': sid})
            self.assertEqual(res.status_code, 400)

    def test_save_updates_conversation_state(self):
        with tempfile.TemporaryDirectory() as td:
            out_dir     = Path(td)
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text(json.dumps(_MASTER_DATA))
            cfg = _make_mock_cfg(master_cv_path=str(master_path))

            app, conv, _, sid, stack = _make_app(output_dir=str(out_dir))

            with stack, app.test_client() as client, \
                 patch('utils.config.get_config', return_value=cfg):
                client.post('/api/screening/save', json={'responses': self._RESPONSES, 'session_id': sid})

        self.assertEqual(conv.state['screening_responses'], self._RESPONSES)


if __name__ == '__main__':
    unittest.main()
