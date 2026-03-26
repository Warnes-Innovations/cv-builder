# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for Phase 4 additions: GET /api/rewrites and POST /api/rewrites/approve.

Covers:
  - GET /api/rewrites: normal path (proposals returned, phase → rewrite_review)
  - GET /api/rewrites: empty proposals (no LLM / nothing to rewrite → phase unchanged)
  - GET /api/rewrites: missing job_analysis returns 400
  - GET /api/rewrites: missing master_data returns 400
  - GET /api/rewrites: pending_rewrites stored and saved
  - POST /api/rewrites/approve: normal path returns counts and phase
  - POST /api/rewrites/approve: missing decisions key returns 400
  - POST /api/rewrites/approve: decisions not a list returns 400
  - POST /api/rewrites/approve: empty decisions list accepted
  - conversation_manager generate_cv call passes approved_rewrites
"""
import argparse
import sys
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch, call

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

import scripts.web_app as web_app_module
from scripts.web_app import create_app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_args(**overrides) -> argparse.Namespace:
    """Return a minimal Namespace that create_app expects."""
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


def _make_app():
    """Create a Flask test app with mocked conversation and orchestrator.

    Returns (app, mock_conversation, mock_orchestrator, session_id, stack).
    The ExitStack keeps patches active until stack.close() is called.
    """
    mock_llm          = MagicMock()
    mock_llm.rewrite_achievement.return_value = 'AI-rewritten achievement text.'
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data = {'summary': 'Test summary'}

    mock_conversation = MagicMock()
    mock_conversation.state = {
        'phase':                'customization',
        'job_analysis':         {'keywords': ['Python', 'MLOps']},
        'pending_rewrites':     None,
        'persuasion_warnings':  [],
        'approved_rewrites':    [],
        'rewrite_audit':        [],
    }
    mock_conversation.run_persuasion_checks.return_value = []

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.CVOrchestrator', return_value=mock_orchestrator))
    stack.enter_context(patch('scripts.web_app.ConversationManager', return_value=mock_conversation))

    app = create_app(_make_args())
    app.config['TESTING'] = True

    with app.test_client() as tmp_client:
        sid = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, mock_conversation, mock_orchestrator, sid, stack


SAMPLE_REWRITES = [
    {
        'id':                  'b1',
        'type':                'bullet',
        'location':            'exp_001.achievements[0]',
        'original':            'Wrote automation scripts.',
        'proposed':            'Developed Python automation pipelines.',
        'keywords_introduced': ['Python'],
        'rationale':           'Aligns with job keywords.',
    },
]

SAMPLE_DECISIONS = [
    {'id': 'b1', 'outcome': 'accept', 'final_text': None},
]


# ---------------------------------------------------------------------------
# 4.1 GET /api/rewrites
# ---------------------------------------------------------------------------

class TestGetRewrites(unittest.TestCase):

    def setUp(self):
        app, self.conv, self.orch, self.session_id, self._stack = _make_app()
        self.client = app.test_client()
        self.addCleanup(self._stack.close)

    def test_returns_rewrites_and_rewrite_review_phase(self):
        """When orchestrator returns proposals, phase advances to rewrite_review."""
        self.orch.propose_rewrites.return_value = SAMPLE_REWRITES

        resp = self.client.get('/api/rewrites', query_string={'session_id': self.session_id})
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['rewrites'], SAMPLE_REWRITES)
        self.assertEqual(data['phase'], 'rewrite_review')

    def test_phase_set_to_rewrite_review_in_state(self):
        """State['phase'] is updated to rewrite_review when proposals are non-empty."""
        self.orch.propose_rewrites.return_value = SAMPLE_REWRITES

        self.client.get('/api/rewrites', query_string={'session_id': self.session_id})

        self.assertEqual(self.conv.state['phase'], 'rewrite_review')

    def test_pending_rewrites_stored_in_state(self):
        """Proposals are stored in state['pending_rewrites']."""
        self.orch.propose_rewrites.return_value = SAMPLE_REWRITES

        self.client.get('/api/rewrites', query_string={'session_id': self.session_id})

        self.assertEqual(self.conv.state['pending_rewrites'], SAMPLE_REWRITES)

    def test_session_saved(self):
        """_save_session is called after storing proposals."""
        self.orch.propose_rewrites.return_value = SAMPLE_REWRITES

        self.client.get('/api/rewrites', query_string={'session_id': self.session_id})

        self.conv._save_session.assert_called()

    def test_empty_proposals_phase_unchanged(self):
        """When orchestrator returns [], phase is 'generation' (graceful skip)."""
        self.orch.propose_rewrites.return_value = []
        self.conv.state['phase'] = 'customization'

        resp = self.client.get('/api/rewrites', query_string={'session_id': self.session_id})
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['rewrites'], [])
        self.assertEqual(data['phase'], 'generation')

    def test_missing_job_analysis_returns_400(self):
        """Returns 400 when job_analysis has not been run yet."""
        self.conv.state['job_analysis'] = None

        resp = self.client.get('/api/rewrites', query_string={'session_id': self.session_id})

        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.get_json())

    def test_missing_master_data_returns_400(self):
        """Returns 400 when orchestrator has no master_data loaded."""
        self.orch.master_data = None

        resp = self.client.get('/api/rewrites', query_string={'session_id': self.session_id})

        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.get_json())

    def test_propose_rewrites_called_with_content_and_analysis(self):
        """orchestrator.propose_rewrites receives master_data and job_analysis."""
        self.orch.propose_rewrites.return_value = []
        analysis = {'keywords': ['Python']}
        self.conv.state['job_analysis'] = analysis

        self.client.get('/api/rewrites', query_string={'session_id': self.session_id})

        self.orch.propose_rewrites.assert_called_once_with(
            self.orch.master_data,
            analysis,
            conversation_history=self.conv.conversation_history,
            user_preferences=self.conv.state.get('post_analysis_answers'),
        )


# ---------------------------------------------------------------------------
# 4.2 POST /api/rewrites/approve
# ---------------------------------------------------------------------------

class TestApproveRewrites(unittest.TestCase):

    def setUp(self):
        app, self.conv, self.orch, self.session_id, self._stack = _make_app()
        self.client = app.test_client()
        self.addCleanup(self._stack.close)
        self.conv.submit_rewrite_decisions.return_value = {
            'approved_count': 1,
            'rejected_count': 0,
            'phase':          'generation',
        }

    def test_returns_ok_with_counts_and_phase(self):
        """Normal path: returns approved_count, rejected_count, phase."""
        resp = self.client.post(
            '/api/rewrites/approve',
            json={'decisions': SAMPLE_DECISIONS, 'session_id': self.session_id},
        )
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['approved_count'], 1)
        self.assertEqual(data['rejected_count'], 0)
        self.assertEqual(data['phase'], 'generation')

    def test_delegates_to_submit_rewrite_decisions(self):
        """submit_rewrite_decisions is called with the decisions list."""
        self.client.post(
            '/api/rewrites/approve',
            json={'decisions': SAMPLE_DECISIONS, 'session_id': self.session_id},
        )

        self.conv.submit_rewrite_decisions.assert_called_once_with(SAMPLE_DECISIONS)

    def test_empty_decisions_accepted(self):
        """Empty decisions list is valid — all proposals rejected."""
        self.conv.submit_rewrite_decisions.return_value = {
            'approved_count': 0,
            'rejected_count': 0,
            'phase':          'generation',
        }
        resp = self.client.post(
            '/api/rewrites/approve',
            json={'decisions': [], 'session_id': self.session_id},
        )

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.get_json()['ok'])

    def test_missing_decisions_key_returns_400(self):
        """400 when the 'decisions' key is absent from the request body."""
        resp = self.client.post(
            '/api/rewrites/approve',
            json={'other': 'data', 'session_id': self.session_id},
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.get_json())

    def test_decisions_not_list_returns_400(self):
        """400 when 'decisions' is not a JSON array."""
        resp = self.client.post(
            '/api/rewrites/approve',
            json={'decisions': 'bad', 'session_id': self.session_id},
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.get_json())

    def test_no_body_returns_400(self):
        """400 when request body is empty / non-JSON."""
        resp = self.client.post('/api/rewrites/approve', data='', content_type='text/plain')

        self.assertEqual(resp.status_code, 400)


# ---------------------------------------------------------------------------
# 4.3 generate_cv call sites pass approved_rewrites
# ---------------------------------------------------------------------------

class TestGenerateCvApprovedRewrites(unittest.TestCase):
    """Verify that both generate_cv call sites in conversation_manager forward
    reviewed rewrite/spell state from session state to orchestrator.generate_cv()."""

    def _make_manager(self):
        mock_orchestrator = MagicMock()
        mock_orchestrator.master_data      = {'summary': 'test'}
        mock_orchestrator.generate_cv.return_value = {
            'files': ['cv.pdf'],
            'output_dir': '/tmp/out',
        }

        mock_llm = MagicMock()
        mock_llm.recommend_customizations.return_value = {
            'recommended_experiences': [],
            'recommended_skills':      [],
        }

        from utils.conversation_manager import ConversationManager
        cm = ConversationManager(orchestrator=mock_orchestrator, llm_client=mock_llm)
        cm.session_dir = Path('/tmp')
        return cm, mock_orchestrator

    def test_interactive_generate_cv_passes_approved_rewrites(self):
        """_execute_action('generate_cv') forwards state['approved_rewrites']."""
        cm, orch = self._make_manager()

        approved = [
            {'id': 'b1', 'type': 'bullet', 'proposed': 'Developed Python pipelines.'}
        ]
        spell_audit = [
            {'section_id': 'summary', 'outcome': 'accept', 'original': 'teh', 'final': 'the'}
        ]
        cm.state['approved_rewrites'] = approved
        cm.state['spell_audit']       = spell_audit
        cm.state['job_analysis']      = {'title': 'Data Scientist', 'keywords': []}
        cm.state['customizations']    = {
            'recommended_experiences': [],
            'recommended_skills':      [],
        }

        action = {'action': 'generate_cv'}
        cm._execute_action(action)

        _, kwargs = orch.generate_cv.call_args
        self.assertEqual(kwargs.get('approved_rewrites'), approved)
        self.assertEqual(kwargs.get('spell_audit'), spell_audit)

    def test_interactive_generate_cv_passes_empty_approved_rewrites_by_default(self):
        """When review state is absent, [] is passed (not None)."""
        cm, orch = self._make_manager()

        cm.state.pop('approved_rewrites', None)
        cm.state.pop('spell_audit', None)
        cm.state['job_analysis']   = {'title': 'Data Scientist', 'keywords': []}
        cm.state['customizations'] = {
            'recommended_experiences': [],
            'recommended_skills':      [],
        }

        action = {'action': 'generate_cv'}
        cm._execute_action(action)

        _, kwargs = orch.generate_cv.call_args
        self.assertEqual(kwargs.get('approved_rewrites'), [])
        self.assertEqual(kwargs.get('spell_audit'), [])


# ---------------------------------------------------------------------------
# Tests: POST /api/rewrite-achievement (session persistence)
# ---------------------------------------------------------------------------

class TestRewriteAchievementPersistence(unittest.TestCase):
    """Verify that /api/rewrite-achievement logs the interaction to the session."""

    def setUp(self):
        self.app, self.conversation, self.orchestrator, self.sid, self.stack = _make_app()
        self.client = self.app.test_client()

    def tearDown(self):
        self.stack.close()

    def _post(self, body):
        body['session_id'] = self.sid
        return self.client.post('/api/rewrite-achievement',
                                json=body,
                                content_type='application/json')

    def test_returns_log_id_alongside_rewritten(self):
        self.conversation.log_achievement_rewrite.return_value = 'abc123def456'
        self.conversation.state['job_description'] = ''

        resp = self._post({'achievement_text': 'Grew revenue 10%.'})

        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIn('rewritten', data)
        self.assertIn('log_id', data)
        self.assertEqual(data['log_id'], 'abc123def456')

    def test_log_achievement_rewrite_called_with_correct_args(self):
        self.conversation.state['job_description'] = 'some JD'
        self.conversation.log_achievement_rewrite.return_value = 'id001'

        resp = self._post({
            'achievement_text':     'Old text.',
            'experience_index':     2,
            'achievement_index':    1,
            'user_instructions':    'be concise',
            'previous_suggestions': ['Earlier attempt.'],
        })

        self.assertEqual(resp.status_code, 200)
        self.conversation.log_achievement_rewrite.assert_called_once()
        call_kwargs = self.conversation.log_achievement_rewrite.call_args[1]
        self.assertEqual(call_kwargs['original_text'], 'Old text.')
        self.assertEqual(call_kwargs['experience_index'], 2)
        self.assertEqual(call_kwargs['achievement_index'], 1)
        self.assertEqual(call_kwargs['user_instructions'], 'be concise')
        self.assertEqual(call_kwargs['previous_suggestions'], ['Earlier attempt.'])

    def test_missing_achievement_text_returns_400(self):
        resp = self._post({'achievement_text': ''})
        self.assertEqual(resp.status_code, 400)
        self.conversation.log_achievement_rewrite.assert_not_called()


# ---------------------------------------------------------------------------
# Tests: POST /api/rewrite-achievement-outcome
# ---------------------------------------------------------------------------

class TestRewriteAchievementOutcome(unittest.TestCase):
    """Verify /api/rewrite-achievement-outcome updates the session log entry."""

    def setUp(self):
        self.app, self.conversation, self.orchestrator, self.sid, self.stack = _make_app()
        self.client = self.app.test_client()

    def tearDown(self):
        self.stack.close()

    def _post(self, body):
        body['session_id'] = self.sid
        return self.client.post('/api/rewrite-achievement-outcome',
                                json=body,
                                content_type='application/json')

    def test_accepted_outcome_updates_session(self):
        self.conversation.update_achievement_rewrite_outcome.return_value = True
        resp = self._post({'log_id': 'abc', 'outcome': 'accepted', 'accepted_text': 'Final text.'})
        self.assertEqual(resp.status_code, 200)
        self.conversation.update_achievement_rewrite_outcome.assert_called_once_with(
            log_id='abc', outcome='accepted', accepted_text='Final text.'
        )

    def test_rejected_outcome_updates_session(self):
        self.conversation.update_achievement_rewrite_outcome.return_value = True
        resp = self._post({'log_id': 'xyz', 'outcome': 'rejected'})
        self.assertEqual(resp.status_code, 200)
        self.conversation.update_achievement_rewrite_outcome.assert_called_once_with(
            log_id='xyz', outcome='rejected', accepted_text=None
        )

    def test_missing_log_id_returns_400(self):
        resp = self._post({'outcome': 'accepted'})
        self.assertEqual(resp.status_code, 400)
        self.conversation.update_achievement_rewrite_outcome.assert_not_called()

    def test_invalid_outcome_returns_400(self):
        resp = self._post({'log_id': 'abc', 'outcome': 'maybe'})
        self.assertEqual(resp.status_code, 400)
        self.conversation.update_achievement_rewrite_outcome.assert_not_called()

    def test_unknown_log_id_returns_404(self):
        self.conversation.update_achievement_rewrite_outcome.return_value = False
        resp = self._post({'log_id': 'notfound', 'outcome': 'rejected'})
        self.assertEqual(resp.status_code, 404)


if __name__ == '__main__':
    unittest.main()
