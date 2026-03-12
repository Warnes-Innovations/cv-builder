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
    """Create a Flask test app with mocked conversation and orchestrator."""
    mock_llm          = MagicMock()
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data = {'summary': 'Test summary'}

    mock_conversation = MagicMock()
    mock_conversation.state = {
        'phase':                'customization',
        'job_analysis':         {'keywords': ['Python', 'MLOps']},
        'pending_rewrites':     None,
        'persuasion_warnings':  [],  # Phase 10
        'approved_rewrites':    [],
        'rewrite_audit':        [],
    }
    # Mock run_persuasion_checks to return empty list by default (Phase 10)
    mock_conversation.run_persuasion_checks.return_value = []

    with patch('scripts.web_app.get_llm_provider', return_value=mock_llm), \
         patch('scripts.web_app.CVOrchestrator', return_value=mock_orchestrator), \
         patch('scripts.web_app.ConversationManager', return_value=mock_conversation):
        app = create_app(_make_args())

    app.config['TESTING'] = True
    return app, mock_conversation, mock_orchestrator


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
        app, self.conv, self.orch = _make_app()
        self.client = app.test_client()

    def test_returns_rewrites_and_rewrite_review_phase(self):
        """When orchestrator returns proposals, phase advances to rewrite_review."""
        self.orch.propose_rewrites.return_value = SAMPLE_REWRITES

        resp = self.client.get('/api/rewrites')
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['rewrites'], SAMPLE_REWRITES)
        self.assertEqual(data['phase'], 'rewrite_review')

    def test_phase_set_to_rewrite_review_in_state(self):
        """State['phase'] is updated to rewrite_review when proposals are non-empty."""
        self.orch.propose_rewrites.return_value = SAMPLE_REWRITES

        self.client.get('/api/rewrites')

        self.assertEqual(self.conv.state['phase'], 'rewrite_review')

    def test_pending_rewrites_stored_in_state(self):
        """Proposals are stored in state['pending_rewrites']."""
        self.orch.propose_rewrites.return_value = SAMPLE_REWRITES

        self.client.get('/api/rewrites')

        self.assertEqual(self.conv.state['pending_rewrites'], SAMPLE_REWRITES)

    def test_session_saved(self):
        """_save_session is called after storing proposals."""
        self.orch.propose_rewrites.return_value = SAMPLE_REWRITES

        self.client.get('/api/rewrites')

        self.conv._save_session.assert_called()

    def test_empty_proposals_phase_unchanged(self):
        """When orchestrator returns [], phase is 'generation' (graceful skip)."""
        self.orch.propose_rewrites.return_value = []
        self.conv.state['phase'] = 'customization'

        resp = self.client.get('/api/rewrites')
        data = resp.get_json()

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['rewrites'], [])
        # Frontend expects 'generation' to fall through gracefully (spec 4.1.5)
        self.assertEqual(data['phase'], 'generation')

    def test_missing_job_analysis_returns_400(self):
        """Returns 400 when job_analysis has not been run yet."""
        self.conv.state['job_analysis'] = None

        resp = self.client.get('/api/rewrites')

        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.get_json())

    def test_missing_master_data_returns_400(self):
        """Returns 400 when orchestrator has no master_data loaded."""
        self.orch.master_data = None

        resp = self.client.get('/api/rewrites')

        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.get_json())

    def test_propose_rewrites_called_with_content_and_analysis(self):
        """orchestrator.propose_rewrites receives master_data and job_analysis."""
        self.orch.propose_rewrites.return_value = []
        analysis = {'keywords': ['Python']}
        self.conv.state['job_analysis'] = analysis

        self.client.get('/api/rewrites')

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
        app, self.conv, self.orch = _make_app()
        self.client = app.test_client()
        self.conv.submit_rewrite_decisions.return_value = {
            'approved_count': 1,
            'rejected_count': 0,
            'phase':          'generation',
        }

    def test_returns_ok_with_counts_and_phase(self):
        """Normal path: returns approved_count, rejected_count, phase."""
        resp = self.client.post(
            '/api/rewrites/approve',
            json={'decisions': SAMPLE_DECISIONS},
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
            json={'decisions': SAMPLE_DECISIONS},
        )

        self.conv.submit_rewrite_decisions.assert_called_once_with(SAMPLE_DECISIONS)

    def test_empty_decisions_accepted(self):
        """Empty decisions list is valid — all proposals rejected."""
        self.conv.submit_rewrite_decisions.return_value = {
            'approved_count': 0,
            'rejected_count': 0,
            'phase':          'generation',
        }
        resp = self.client.post('/api/rewrites/approve', json={'decisions': []})

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.get_json()['ok'])

    def test_missing_decisions_key_returns_400(self):
        """400 when the 'decisions' key is absent from the request body."""
        resp = self.client.post('/api/rewrites/approve', json={'other': 'data'})

        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.get_json())

    def test_decisions_not_list_returns_400(self):
        """400 when 'decisions' is not a JSON array."""
        resp = self.client.post('/api/rewrites/approve', json={'decisions': 'bad'})

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
    approved_rewrites from state to orchestrator.generate_cv()."""

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
        cm.state['approved_rewrites'] = approved
        cm.state['job_analysis']      = {'title': 'Data Scientist', 'keywords': []}
        cm.state['customizations']    = {
            'recommended_experiences': [],
            'recommended_skills':      [],
        }

        action = {'action': 'generate_cv'}
        cm._execute_action(action)

        _, kwargs = orch.generate_cv.call_args
        self.assertEqual(kwargs.get('approved_rewrites'), approved)

    def test_interactive_generate_cv_passes_empty_approved_rewrites_by_default(self):
        """When approved_rewrites is absent, [] is passed (not None)."""
        cm, orch = self._make_manager()

        cm.state.pop('approved_rewrites', None)
        cm.state['job_analysis']   = {'title': 'Data Scientist', 'keywords': []}
        cm.state['customizations'] = {
            'recommended_experiences': [],
            'recommended_skills':      [],
        }

        action = {'action': 'generate_cv'}
        cm._execute_action(action)

        _, kwargs = orch.generate_cv.call_args
        self.assertEqual(kwargs.get('approved_rewrites'), [])


if __name__ == '__main__':
    unittest.main()
