# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for Phase: Interview Preparation generation endpoint.

Covers:
  - POST /api/interview-prep/generate: returns 400 when no job_analysis exists
  - POST /api/interview-prep/generate: calls LLM and stores questions in state
  - POST /api/interview-prep/generate: returns question_count in response
  - POST /api/interview-prep/generate: returns 500 when LLM request fails
  - POST /api/interview-prep/generate: returns 500 when the LLM response is not JSON
  - POST /api/interview-prep/generate: returns 500 when the JSON lacks a questions array
"""
import argparse
import json
import sys
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch

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
        'personal_info':          {'name': 'Dr. Test', 'headline': 'Scientist'},
        'skills':                 ['Python', 'R', 'ML'],
        'selected_achievements':  [{'id': 'sa1', 'title': 'Led important project',
                                    'description': 'Grew performance 20%'}],
        'professional_summaries': {'ml': 'Experienced ML scientist.'},
    }
    mock_orchestrator.master_data_path = '/tmp/fake_master.json'

    state = {
        'phase':               'refinement',
        'job_analysis':        {'company': 'Acme', 'title': 'Data Scientist',
                                'ats_keywords': ['Python', 'MLOps'],
                                'required_skills': ['scikit-learn']},
        'post_analysis_answers': {},
        'approved_rewrites':    [],
    }
    if state_overrides:
        state.update(state_overrides)

    mock_conversation = MagicMock()
    mock_conversation.state = state
    mock_conversation.normalize_skills_data = lambda sk: sk

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
# POST /api/interview-prep/generate
# ---------------------------------------------------------------------------

class TestInterviewPrepGenerate(unittest.TestCase):

    def test_returns_400_when_no_job_analysis(self):
        """No job_analysis in state blocks generation with a clear error."""
        app, _, mock_llm, sid, stack = _make_app(state_overrides={'job_analysis': None})

        with stack, app.test_client() as client:
            res  = client.post('/api/interview-prep/generate',
                               json={'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 400)
        self.assertFalse(data['ok'])
        self.assertIn('job analysis', data['error'])
        mock_llm.chat.assert_not_called()

    def test_generate_calls_llm_and_stores_questions(self):
        """Valid JSON questions array is parsed and persisted to session state."""
        app, conv, mock_llm, sid, stack = _make_app()
        mock_llm.chat.return_value = json.dumps({
            'questions': [
                {'question': 'Tell me about a Python project.', 'rationale': 'probes depth', 'hint': 'mention scikit-learn'},
                {'question': 'Why Acme?', 'rationale': 'probes fit', 'hint': 'mention MLOps'},
            ],
        })

        with stack, app.test_client() as client:
            res  = client.post('/api/interview-prep/generate',
                               json={'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['question_count'], 2)
        self.assertEqual(len(data['questions']), 2)
        self.assertEqual(data['questions'][0]['question'], 'Tell me about a Python project.')
        self.assertEqual(conv.state['interview_prep'][1]['question'], 'Why Acme?')

    def test_prompt_grounds_hints_in_candidate_profile(self):
        """The LLM system prompt forbids inventing experiences not in the CV."""
        app, _, mock_llm, sid, stack = _make_app()
        mock_llm.chat.return_value = json.dumps({'questions': [
            {'question': 'Q', 'rationale': 'R', 'hint': 'H'},
        ]})

        with stack, app.test_client() as client:
            client.post('/api/interview-prep/generate', json={'session_id': sid})

        call_payload = mock_llm.chat.call_args
        system_msg    = call_payload.kwargs['messages'][0]['content']
        user_prompt   = call_payload.kwargs['messages'][1]['content']
        self.assertIn('do not invent experiences, metrics, or facts', system_msg)
        self.assertIn('Dr. Test', user_prompt)
        self.assertIn('Data Scientist', user_prompt)

    def test_llm_failure_returns_500(self):
        """LLM exception surfaces a 500 with a helpful message."""
        app, _, mock_llm, sid, stack = _make_app()
        mock_llm.chat.side_effect = RuntimeError('LLM down')

        with stack, app.test_client() as client:
            res  = client.post('/api/interview-prep/generate',
                               json={'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 500)
        self.assertFalse(data['ok'])
        self.assertIn('LLM request failed', data['error'])

    def test_non_json_llm_response_returns_500(self):
        """A non-JSON LLM response is surfaced as a parsing failure."""
        app, _, mock_llm, sid, stack = _make_app()
        mock_llm.chat.return_value = 'Sorry, I could not do that.'

        with stack, app.test_client() as client:
            res  = client.post('/api/interview-prep/generate',
                               json={'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 500)
        self.assertFalse(data['ok'])

    def test_json_without_questions_array_returns_500(self):
        """An object without a list under 'questions' is rejected."""
        app, _, mock_llm, sid, stack = _make_app()
        mock_llm.chat.return_value = json.dumps({'foo': 'bar'})

        with stack, app.test_client() as client:
            res  = client.post('/api/interview-prep/generate',
                               json={'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 500)
        self.assertFalse(data['ok'])
        self.assertIn('Unexpected response format', data['error'])

    def test_filters_malformed_and_empty_questions(self):
        """Entries lacking a non-empty question string are dropped."""
        app, conv, mock_llm, sid, stack = _make_app()
        mock_llm.chat.return_value = json.dumps({'questions': [
            {'question': '  ', 'rationale': 'x', 'hint': 'y'},
            {'rationale': 'no question field'},
            {'question': 'Keep me', 'rationale': 'r', 'hint': 'h'},
        ]})

        with stack, app.test_client() as client:
            res  = client.post('/api/interview-prep/generate',
                               json={'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertEqual(data['question_count'], 1)
        self.assertEqual(data['questions'][0]['question'], 'Keep me')
        self.assertEqual(len(conv.state['interview_prep']), 1)

    def test_all_questions_dropped_returns_500(self):
        """If every generated entry is invalid, the endpoint errors."""
        app, _, mock_llm, sid, stack = _make_app()
        mock_llm.chat.return_value = json.dumps({'questions': [
            {'question': '  '},
            {'question': ''},
        ]})

        with stack, app.test_client() as client:
            res  = client.post('/api/interview-prep/generate',
                               json={'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 500)
        self.assertFalse(data['ok'])
        self.assertIn('No questions were generated', data['error'])
