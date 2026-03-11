"""
Unit tests for scripts/utils/conversation_manager.py — Phase 3 additions.

Covers:
  - State schema: new keys in __init__ and _reset_conversation
  - submit_rewrite_decisions: accept, reject, edit, mixed
  - Phase advancement and _save_session call
  - _execute_action submit_rewrites delegation
  - _build_system_prompt rewrite_review case
  - load_session backward-compat defaults for new keys
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.conversation_manager import ConversationManager


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_manager(tmp_path: Path) -> ConversationManager:
    """Return a ConversationManager wired to mocked orchestrator/LLM."""
    mock_orchestrator         = MagicMock()
    mock_orchestrator.master_data     = {}
    mock_orchestrator.publications    = {}

    mock_llm = MagicMock()

    cm = ConversationManager(
        orchestrator = mock_orchestrator,
        llm_client   = mock_llm,
    )
    # Wire a session dir so _save_session works without creating files
    cm.session_dir = tmp_path
    return cm


SAMPLE_PENDING = [
    {
        'id':                 'b1',
        'type':               'bullet',
        'location':           'exp_001.achievements[0]',
        'original':           'Wrote scripts to automate reporting.',
        'proposed':           'Developed Python automation pipelines to streamline reporting.',
        'keywords_introduced': ['Python', 'automation'],
        'rationale':          'Aligns with job keyword Python and automation.',
    },
    {
        'id':                 's1',
        'type':               'skill_rename',
        'location':           'skills',
        'original':           'ML',
        'proposed':           'Machine Learning',
        'keywords_introduced': ['Machine Learning'],
        'rationale':          'Exact phrase used in job posting.',
    },
    {
        'id':                 'b2',
        'type':               'bullet',
        'location':           'exp_002.achievements[1]',
        'original':           'Led cross-functional team of five.',
        'proposed':           'Led cross-functional team of five engineers.',
        'keywords_introduced': [],
        'rationale':          'Minor clarification.',
    },
]


# ---------------------------------------------------------------------------
# 3.1 State schema
# ---------------------------------------------------------------------------

class TestStateSchema(unittest.TestCase):

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.cm  = _make_manager(self.tmp)

    def test_pending_rewrites_initialised_to_none(self):
        self.assertIsNone(self.cm.state['pending_rewrites'])

    def test_approved_rewrites_initialised_to_empty_list(self):
        self.assertEqual(self.cm.state['approved_rewrites'], [])

    def test_rewrite_audit_initialised_to_empty_list(self):
        self.assertEqual(self.cm.state['rewrite_audit'], [])

    def test_phase_comment_includes_rewrite_review(self):
        """Phase value must be one of the valid phases; rewrite_review is accepted without error."""
        self.cm.state['phase'] = 'rewrite_review'  # should just work

    def test_reset_conversation_restores_new_keys(self):
        # Pollute state
        self.cm.state['pending_rewrites']  = [{'id': 'x'}]
        self.cm.state['approved_rewrites'] = [{'id': 'x'}]
        self.cm.state['rewrite_audit']     = [{'id': 'x', 'outcome': 'accept'}]

        # Simulate confirm response
        with patch('builtins.input', return_value='yes'):
            self.cm._reset_conversation()

        self.assertIsNone(self.cm.state['pending_rewrites'])
        self.assertEqual(self.cm.state['approved_rewrites'], [])
        self.assertEqual(self.cm.state['rewrite_audit'],     [])
        self.assertEqual(self.cm.state['phase'], 'init')


# ---------------------------------------------------------------------------
# 3.2 submit_rewrite_decisions
# ---------------------------------------------------------------------------

class TestSubmitRewriteDecisions(unittest.TestCase):

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.cm  = _make_manager(self.tmp)
        self.cm.state['pending_rewrites'] = SAMPLE_PENDING

    def _save_spy(self):
        """Patch _save_session so we can assert it was called."""
        return patch.object(self.cm, '_save_session')

    # --- accept ---

    def test_accept_populates_approved_rewrites(self):
        decisions = [{'id': 'b1', 'outcome': 'accept', 'final_text': None}]
        self.cm.submit_rewrite_decisions(decisions)

        approved = self.cm.state['approved_rewrites']
        self.assertEqual(len(approved), 1)
        self.assertEqual(approved[0]['id'], 'b1')
        # proposed text unchanged for accept
        self.assertEqual(approved[0]['proposed'], SAMPLE_PENDING[0]['proposed'])

    # --- reject ---

    def test_reject_excluded_from_approved_rewrites(self):
        decisions = [{'id': 'b1', 'outcome': 'reject', 'final_text': None}]
        self.cm.submit_rewrite_decisions(decisions)

        self.assertEqual(self.cm.state['approved_rewrites'], [])

    def test_reject_still_appears_in_audit(self):
        decisions = [{'id': 'b1', 'outcome': 'reject', 'final_text': None}]
        self.cm.submit_rewrite_decisions(decisions)

        audit = self.cm.state['rewrite_audit']
        self.assertEqual(len(audit), 1)
        self.assertEqual(audit[0]['outcome'], 'reject')
        self.assertEqual(audit[0]['id'], 'b1')

    # --- edit ---

    def test_edit_replaces_proposed_with_final_text(self):
        edited = 'Created automation scripts using Python for data pipelines.'
        decisions = [{'id': 'b1', 'outcome': 'edit', 'final_text': edited}]
        self.cm.submit_rewrite_decisions(decisions)

        approved = self.cm.state['approved_rewrites']
        self.assertEqual(len(approved), 1)
        self.assertEqual(approved[0]['proposed'], edited)

    def test_edit_preserves_original_in_audit(self):
        edited = 'Created automation scripts using Python for data pipelines.'
        decisions = [{'id': 'b1', 'outcome': 'edit', 'final_text': edited}]
        self.cm.submit_rewrite_decisions(decisions)

        audit = self.cm.state['rewrite_audit']
        self.assertEqual(audit[0]['final'], edited)
        self.assertEqual(audit[0]['original'], SAMPLE_PENDING[0]['original'])

    # --- mixed ---

    def test_mixed_decisions_correct_counts(self):
        decisions = [
            {'id': 'b1', 'outcome': 'accept', 'final_text': None},
            {'id': 's1', 'outcome': 'reject', 'final_text': None},
            {'id': 'b2', 'outcome': 'edit',   'final_text': 'Led a team of five.'},
        ]
        summary = self.cm.submit_rewrite_decisions(decisions)

        self.assertEqual(summary['approved_count'], 2)   # accept + edit
        self.assertEqual(summary['rejected_count'], 1)
        self.assertEqual(len(self.cm.state['approved_rewrites']), 2)
        self.assertEqual(len(self.cm.state['rewrite_audit']),     3)

    def test_unknown_id_produces_empty_proposal_in_audit(self):
        decisions = [{'id': 'UNKNOWN', 'outcome': 'accept', 'final_text': None}]
        self.cm.submit_rewrite_decisions(decisions)

        audit = self.cm.state['rewrite_audit']
        self.assertEqual(len(audit), 1)
        # proposal fields default to empty (no KeyError raised)
        self.assertNotIn('original', audit[0])  # proposal dict was {}

    # --- phase & persistence ---

    def test_phase_advances_to_generation(self):
        self.cm.state['phase'] = 'rewrite_review'
        self.cm.submit_rewrite_decisions([])
        self.assertEqual(self.cm.state['phase'], 'spell_check')

    def test_save_session_called(self):
        with self._save_spy() as mock_save:
            self.cm.submit_rewrite_decisions([])
        mock_save.assert_called_once()

    def test_empty_decisions_returns_zeros(self):
        summary = self.cm.submit_rewrite_decisions([])
        self.assertEqual(summary['approved_count'], 0)
        self.assertEqual(summary['rejected_count'], 0)
        self.assertEqual(summary['phase'],          'spell_check')


# ---------------------------------------------------------------------------
# 3.15 complete_spell_check
# ---------------------------------------------------------------------------

class TestCompleteSpellCheck(unittest.TestCase):

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.cm  = _make_manager(self.tmp)
        self.cm.state['phase'] = 'spell_check'
        self.cm.state['customizations'] = {'recommended_experiences': []}

    def test_phase_advances_to_generation(self):
        self.cm.complete_spell_check([])
        self.assertEqual(self.cm.state['phase'], 'generation')

    def test_empty_audit_stored(self):
        self.cm.complete_spell_check([])
        self.assertEqual(self.cm.state['spell_audit'], [])

    def test_audit_entries_stored(self):
        audit = [{'context_type': 'bullet', 'location': 'Exp', 'original': 'teh', 'suggestion': 'the',
                  'rule': 'MORFOLOGIK_RULE_EN_US', 'outcome': 'accept', 'final': 'the'}]
        self.cm.complete_spell_check(audit)
        self.assertEqual(self.cm.state['spell_audit'], audit)

    def test_return_values(self):
        audit = [
            {'outcome': 'accept', 'original': 'teh', 'suggestion': 'the', 'final': 'the',
             'context_type': 'bullet', 'location': 'X', 'rule': 'r'},
            {'outcome': 'reject', 'original': 'foo', 'suggestion': 'bar', 'final': 'foo',
             'context_type': 'summary', 'location': 'Y', 'rule': 'r'},
        ]
        result = self.cm.complete_spell_check(audit)
        self.assertEqual(result['flag_count'], 2)
        self.assertEqual(result['accepted_count'], 1)
        self.assertEqual(result['phase'], 'generation')

    def test_none_audit_treated_as_empty(self):
        self.cm.complete_spell_check(None)
        self.assertEqual(self.cm.state['spell_audit'], [])


# ---------------------------------------------------------------------------
# 3.2 _execute_action submit_rewrites delegation
# ---------------------------------------------------------------------------

class TestExecuteActionSubmitRewrites(unittest.TestCase):

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.cm  = _make_manager(self.tmp)
        self.cm.state['pending_rewrites'] = SAMPLE_PENDING

    def test_submit_rewrites_action_calls_submit_rewrite_decisions(self):
        decisions = [{'id': 'b1', 'outcome': 'accept', 'final_text': None}]
        with patch.object(
            self.cm,
            'submit_rewrite_decisions',
            return_value={'approved_count': 1, 'rejected_count': 0, 'phase': 'generation'},
        ) as mock_submit:
            result = self.cm._execute_action({'action': 'submit_rewrites', 'decisions': decisions})

        mock_submit.assert_called_once_with(decisions)
        self.assertIn('1 approved', result)
        self.assertIn('0 rejected', result)

    def test_submit_rewrites_action_defaults_empty_decisions(self):
        """Missing 'decisions' key in action defaults to empty list."""
        with patch.object(
            self.cm,
            'submit_rewrite_decisions',
            return_value={'approved_count': 0, 'rejected_count': 0, 'phase': 'generation'},
        ) as mock_submit:
            self.cm._execute_action({'action': 'submit_rewrites'})

        mock_submit.assert_called_once_with([])


# ---------------------------------------------------------------------------
# 3.3 _build_system_prompt rewrite_review case
# ---------------------------------------------------------------------------

class TestBuildSystemPromptRewriteReview(unittest.TestCase):

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.cm  = _make_manager(self.tmp)

    def test_rewrite_review_phase_adds_context(self):
        self.cm.state['phase']            = 'rewrite_review'
        self.cm.state['pending_rewrites'] = SAMPLE_PENDING

        prompt = self.cm._build_system_prompt()

        self.assertIn('Rewrite Review', prompt)
        self.assertIn('3 pending rewrite proposal', prompt)
        self.assertIn('accept, edit, or reject', prompt)

    def test_other_phase_no_rewrite_review_context(self):
        self.cm.state['phase'] = 'generation'
        prompt = self.cm._build_system_prompt()
        self.assertNotIn('Rewrite Review', prompt)

    def test_rewrite_review_with_zero_pending(self):
        self.cm.state['phase']            = 'rewrite_review'
        self.cm.state['pending_rewrites'] = []

        prompt = self.cm._build_system_prompt()
        self.assertIn('0 pending rewrite proposal', prompt)


# ---------------------------------------------------------------------------
# load_session backward-compat defaults
# ---------------------------------------------------------------------------

class TestLoadSessionBackwardCompat(unittest.TestCase):

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.cm  = _make_manager(self.tmp)

    def _write_old_session(self, state: dict) -> Path:
        """Write a session.json without the new Phase 3 keys."""
        session_file = self.tmp / 'session.json'
        session_data = {
            'timestamp':            '2025-01-01T00:00:00',
            'state':                state,
            'conversation_history': [],
        }
        session_file.write_text(json.dumps(session_data), encoding='utf-8')
        return session_file

    def test_load_session_adds_pending_rewrites_default(self):
        old_state = {'phase': 'generation', 'post_analysis_questions': [], 'post_analysis_answers': {}}
        session_file = self._write_old_session(old_state)
        self.cm.load_session(str(session_file))
        self.assertIsNone(self.cm.state['pending_rewrites'])

    def test_load_session_adds_approved_rewrites_default(self):
        old_state = {'phase': 'generation', 'post_analysis_questions': [], 'post_analysis_answers': {}}
        session_file = self._write_old_session(old_state)
        self.cm.load_session(str(session_file))
        self.assertEqual(self.cm.state['approved_rewrites'], [])

    def test_load_session_adds_rewrite_audit_default(self):
        old_state = {'phase': 'generation', 'post_analysis_questions': [], 'post_analysis_answers': {}}
        session_file = self._write_old_session(old_state)
        self.cm.load_session(str(session_file))
        self.assertEqual(self.cm.state['rewrite_audit'], [])

    def test_load_session_preserves_existing_new_keys(self):
        """A session that already has the new keys keeps its values."""
        existing_audit = [{'id': 'b1', 'outcome': 'accept'}]
        new_state = {
            'phase':               'generation',
            'pending_rewrites':    None,
            'approved_rewrites':   [{'id': 'b1'}],
            'rewrite_audit':       existing_audit,
            'post_analysis_questions': [],
            'post_analysis_answers':   {},
        }
        session_file = self._write_old_session(new_state)
        self.cm.load_session(str(session_file))
        self.assertEqual(self.cm.state['rewrite_audit'],    existing_audit)
        self.assertEqual(self.cm.state['approved_rewrites'], [{'id': 'b1'}])



# ---------------------------------------------------------------------------
# Phase 8 — back_to_phase and re_run_phase
# ---------------------------------------------------------------------------

class TestBackToPhase(unittest.TestCase):

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.cm  = _make_manager(self.tmp)
        # Simulate a post-generation session with prior decisions intact
        self.cm.state.update({
            'phase':            'refinement',
            'job_description':  'Software Engineer at Acme',
            'job_analysis':     {'title': 'SE', 'company': 'Acme'},
            'customizations':   {'recommended_experiences': []},
            'generated_files':  {'files': []},
            'experience_decisions': {'exp_001': 'emphasize'},
        })

    def test_back_to_customizations_sets_phase(self):
        result = self.cm.back_to_phase('customizations')
        self.assertEqual(self.cm.state['phase'], 'customization')
        self.assertTrue(result['ok'])

    def test_back_to_analysis_sets_phase(self):
        result = self.cm.back_to_phase('analysis')
        self.assertEqual(self.cm.state['phase'], 'job_analysis')

    def test_back_does_not_clear_downstream_state(self):
        """Generated files and decisions must survive back-navigation."""
        self.cm.back_to_phase('customizations')
        self.assertIsNotNone(self.cm.state.get('generated_files'))
        self.assertIsNotNone(self.cm.state.get('job_analysis'))
        self.assertEqual(self.cm.state.get('experience_decisions'), {'exp_001': 'emphasize'})

    def test_iterating_flag_set(self):
        self.cm.back_to_phase('rewrite')
        self.assertTrue(self.cm.state.get('iterating'))

    def test_reentry_phase_stored(self):
        self.cm.back_to_phase('customizations')
        self.assertEqual(self.cm.state.get('reentry_phase'), 'customization')

    def test_accepts_internal_phase_string(self):
        """Internal phase strings (e.g. 'customization') should also work."""
        result = self.cm.back_to_phase('customization')
        self.assertTrue(result['ok'])
        self.assertEqual(self.cm.state['phase'], 'customization')


class TestReRunPhase(unittest.TestCase):

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.cm  = _make_manager(self.tmp)
        self.cm.state.update({
            'phase':           'refinement',
            'job_description': 'Software Engineer at Acme',
            'job_analysis':    {'title': 'SE', 'company': 'Acme', 'ats_keywords': []},
            'customizations':  {'recommended_experiences': []},
        })
        # Configure mock LLM to return JSON-serializable dicts (not MagicMock objects)
        self.cm.llm.recommend_customizations.return_value = {'recommended_experiences': []}
        self.cm.llm.analyze_job_description.return_value  = {'title': 'SE', 'company': 'Acme'}

    def test_re_run_customizations_returns_ok(self):
        result = self.cm.re_run_phase('customizations')
        self.assertTrue(result.get('ok'))

    def test_re_run_customizations_preserves_prior_output(self):
        old_customizations = {'recommended_experiences': ['exp_001']}
        self.cm.state['customizations'] = old_customizations
        result = self.cm.re_run_phase('customizations')
        self.assertIn('prior_output', result)
        self.assertEqual(result['prior_output'].get('customizations'), old_customizations)

    def test_re_run_unsupported_phase_returns_error(self):
        result = self.cm.re_run_phase('generation')
        self.assertFalse(result.get('ok'))
        self.assertIn('error', result)

    def test_re_run_analysis_without_job_text_returns_error(self):
        self.cm.state['job_description'] = None
        result = self.cm.re_run_phase('analysis')
        self.assertFalse(result.get('ok'))

    def test_iterating_flag_set_after_re_run(self):
        self.cm.re_run_phase('customizations')
        self.assertTrue(self.cm.state.get('iterating'))


if __name__ == '__main__':
    unittest.main()
