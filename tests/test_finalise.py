# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for Phase 11: Finalise & Archive + Master Data Harvest.

Covers:
  - POST /api/finalise: normal path (metadata written, phase advanced)
  - POST /api/finalise: missing generated_files returns 400
  - POST /api/finalise: invalid status value returns 400
  - GET /api/harvest/candidates: improved_bullet candidate from approved_rewrites
  - GET /api/harvest/candidates: new_skill candidate from customizations
  - GET /api/harvest/candidates: summary_variant candidate from approved_rewrites
  - GET /api/harvest/candidates: skill_gap_confirmed candidate from post_analysis_answers
  - GET /api/harvest/candidates: empty session returns empty list
  - POST /api/harvest/apply: no selected_ids returns 0 written
  - POST /api/harvest/apply: applies bullet + skill candidates
  - _harvest_apply_bullet: string bullet found and replaced
  - _harvest_apply_bullet: dict bullet found and replaced
  - _harvest_apply_bullet: bullet not found returns False
  - _harvest_add_skill: list — adds new skill
  - _harvest_add_skill: list — duplicate not re-added
  - _harvest_add_skill: dict with 'Other' key — adds to it
  - _harvest_add_skill: dict with no 'other' key — creates 'Other'
  - _harvest_add_skill: missing skills field — creates list
  - _harvest_add_summary_variant: creates new list
  - _harvest_add_summary_variant: appends to existing list
  - _harvest_add_summary_variant: duplicate not re-added
"""
import argparse
import json
import sys
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch, mock_open

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.web_app import (
    create_app,
    _harvest_apply_bullet,
    _harvest_add_skill,
    _harvest_add_summary_variant,
)
from scripts.utils.master_data_validator import ValidationResult


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
    """Create Flask test app with fully mocked conversation + orchestrator.

    Returns (app, mock_conversation, mock_orchestrator, session_id, stack).
    The ExitStack keeps patches active until stack.close() is called.
    """
    mock_llm          = MagicMock()
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data      = {'experience': [], 'skills': []}
    mock_orchestrator.master_data_path = '/tmp/fake_master.json'

    state = {
        'phase':                'refinement',
        'job_analysis':         {'ats_keywords': ['Python', 'MLOps']},
        'generated_files':      {'output_dir': '/tmp/cv_output', 'files': ['cv.pdf', 'cv.docx']},
        'approved_rewrites':    [],
        'rewrite_audit':        [],
        'customizations':       {},
        'post_analysis_answers': {},
        'spell_audit':          [],
        'layout_instructions':  [],
    }
    if state_overrides:
        state.update(state_overrides)

    mock_conversation = MagicMock()
    mock_conversation.state = state
    mock_conversation.run_persuasion_checks.return_value = []

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

    return app, mock_conversation, mock_orchestrator, sid, stack


# ---------------------------------------------------------------------------
# POST /api/finalise
# ---------------------------------------------------------------------------

class TestFinaliseEndpoint(unittest.TestCase):

    def test_finalise_normal_path(self):
        """Finalise archives metadata and advances phase to 'refinement'."""
        app, conv, orch, sid, stack = _make_app(state_overrides={'phase': 'generation'})
        metadata_content = json.dumps({'company': 'Acme', 'role': 'Engineer'})

        with stack, app.test_client() as client, \
             patch('pathlib.Path.exists', return_value=True), \
             patch('builtins.open', mock_open(read_data=metadata_content)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run') as mock_sub:

            mock_sub.return_value = MagicMock(returncode=0, stdout='[main abc1234]', stderr='')

            res  = client.post('/api/finalise',
                               json={'status': 'ready', 'notes': 'Great company', 'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(conv.state['phase'], 'refinement')
        self.assertIn('files', data['summary'])

    def test_finalise_no_generated_files_returns_400(self):
        """Finalise without a generated CV returns 400."""
        app, conv, _, sid, stack = _make_app(state_overrides={'generated_files': None})
        with stack, app.test_client() as client:
            res = client.post('/api/finalise', json={'status': 'ready', 'session_id': sid})
        self.assertEqual(res.status_code, 400)
        self.assertIn('error', res.get_json())

    def test_finalise_invalid_status_returns_400(self):
        """Finalise with unknown status value returns 400."""
        app, _, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('pathlib.Path.exists', return_value=False):
            res = client.post('/api/finalise', json={'status': 'unknown', 'session_id': sid})
        self.assertEqual(res.status_code, 400)
        self.assertIn('status', res.get_json()['error'])

    def test_finalise_valid_statuses(self):
        """draft, ready, and sent are all accepted."""
        for status in ('draft', 'ready', 'sent'):
            app, _, _, sid, stack = _make_app()
            metadata_content = json.dumps({'company': 'ACME', 'role': 'Dev'})
            with stack, app.test_client() as client, \
                 patch('pathlib.Path.exists', return_value=True), \
                 patch('builtins.open', mock_open(read_data=metadata_content)), \
                 patch('json.dump'), \
                 patch('subprocess.run', return_value=MagicMock(returncode=1, stdout='', stderr='nothing')):
                res = client.post('/api/finalise', json={'status': status, 'session_id': sid})
            self.assertIn(res.status_code, (200,), msg=f"status={status} should return 200")

    def test_finalise_upserts_screening_into_response_library(self):
        """Finalise with screening_responses writes them to response_library.json keyed by topic_tag."""
        from pathlib import Path as _Path
        screening = [{'topic_tag': 'leadership', 'answer': 'I led a team of 5 engineers.'}]
        metadata_content = json.dumps({
            'company': 'Acme', 'role': 'Engineer',
            'screening_responses': screening,
        })

        app, _, _, sid, stack = _make_app()
        dumped_calls = []

        def conditional_exists(self_path):
            return 'response_library' not in str(self_path)

        with stack, app.test_client() as client, \
             patch.object(_Path, 'exists', conditional_exists), \
             patch('pathlib.Path.mkdir'), \
             patch('builtins.open', mock_open(read_data=metadata_content)), \
             patch('json.dump', side_effect=lambda obj, f, **kw: dumped_calls.append(obj)), \
             patch('subprocess.run', return_value=MagicMock(returncode=0, stdout='abc1234', stderr='')):
            res = client.post('/api/finalise', json={'status': 'ready', 'session_id': sid})

        self.assertEqual(res.status_code, 200)
        self.assertTrue(len(dumped_calls) >= 1)
        library_dump = dumped_calls[0]
        self.assertIn('leadership', library_dump)
        self.assertEqual(library_dump['leadership']['answer'], 'I led a team of 5 engineers.')

    def test_finalise_screening_uses_question_fallback_key(self):
        """When topic_tag is absent, question[:40] is used as the response library key."""
        from pathlib import Path as _Path
        long_question = 'Tell me about yourself, what are your greatest strengths and weaknesses?'
        screening = [{'question': long_question, 'answer': 'I am highly motivated...'}]
        metadata_content = json.dumps({
            'company': 'Acme', 'role': 'Engineer',
            'screening_responses': screening,
        })

        app, _, _, sid, stack = _make_app()
        dumped_calls = []

        def conditional_exists(self_path):
            return 'response_library' not in str(self_path)

        with stack, app.test_client() as client, \
             patch.object(_Path, 'exists', conditional_exists), \
             patch('pathlib.Path.mkdir'), \
             patch('builtins.open', mock_open(read_data=metadata_content)), \
             patch('json.dump', side_effect=lambda obj, f, **kw: dumped_calls.append(obj)), \
             patch('subprocess.run', return_value=MagicMock(returncode=0, stdout='abc1234', stderr='')):
            res = client.post('/api/finalise', json={'status': 'ready', 'session_id': sid})

        self.assertEqual(res.status_code, 200)
        self.assertTrue(len(dumped_calls) >= 1)
        library_dump = dumped_calls[0]
        expected_key = long_question[:40]
        self.assertIn(expected_key, library_dump)
        self.assertEqual(library_dump[expected_key]['answer'], 'I am highly motivated...')


# ---------------------------------------------------------------------------
# GET /api/harvest/candidates
# ---------------------------------------------------------------------------

class TestHarvestCandidates(unittest.TestCase):

    def test_empty_session_returns_empty_candidates(self):
        """No approved rewrites or new skills → empty candidates list."""
        app, _, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res  = client.get('/api/harvest/candidates', query_string={'session_id': sid})
            data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['candidates'], [])

    def test_improved_bullet_candidate(self):
        """Approved rewrite with different original/proposed is returned."""
        rewrite = {
            'id':       'rw1',
            'section':  'experience',
            'original': 'Wrote scripts.',
            'proposed': 'Developed Python automation pipelines reducing errors by 40%.',
            'context':  'exp_001',
            'rationale': 'Adds metric.',
        }
        app, _, _, sid, stack = _make_app(state_overrides={'approved_rewrites': [rewrite]})
        with stack, app.test_client() as client:
            data = client.get('/api/harvest/candidates', query_string={'session_id': sid}).get_json()
        candidates = data['candidates']
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]['type'], 'improved_bullet')
        self.assertEqual(candidates[0]['proposed'], rewrite['proposed'])

    def test_unchanged_rewrite_not_included(self):
        """Approved rewrite with identical original/proposed is NOT a candidate."""
        rewrite = {
            'id': 'rw2', 'section': 'experience',
            'original': 'Same text.', 'proposed': 'Same text.',
        }
        app, _, _, sid, stack = _make_app(state_overrides={'approved_rewrites': [rewrite]})
        with stack, app.test_client() as client:
            data = client.get('/api/harvest/candidates', query_string={'session_id': sid}).get_json()
        self.assertEqual(data['candidates'], [])

    def test_new_skill_candidate(self):
        """A skill in customizations.new_skills_added appears as new_skill candidate."""
        app, _, _, sid, stack = _make_app(state_overrides={
            'customizations': {'new_skills_added': ['Kubernetes']},
        })
        with stack, app.test_client() as client:
            data = client.get('/api/harvest/candidates', query_string={'session_id': sid}).get_json()
        types = [c['type'] for c in data['candidates']]
        self.assertIn('new_skill', types)
        skill_cand = next(c for c in data['candidates'] if c['type'] == 'new_skill')
        self.assertEqual(skill_cand['proposed'], 'Kubernetes')

    def test_summary_variant_candidate(self):
        """Approved rewrite with section='summary' produces a summary_variant candidate only."""
        rewrite = {
            'id': 'sw1', 'section': 'summary',
            'original': 'Experienced engineer.',
            'proposed': 'Senior ML engineer with 15 years of production experience.',
        }
        app, _, _, sid, stack = _make_app(state_overrides={'approved_rewrites': [rewrite]})
        with stack, app.test_client() as client:
            data = client.get('/api/harvest/candidates', query_string={'session_id': sid}).get_json()
        types = [c['type'] for c in data['candidates']]
        self.assertIn('summary_variant', types)
        self.assertNotIn('improved_bullet', types)

    def test_skill_gap_confirmed_candidate(self):
        """skill_gap_* key with truthy answer produces skill_gap_confirmed candidate."""
        app, _, _, sid, stack = _make_app(state_overrides={
            'post_analysis_answers': {'skill_gap_Docker': 'yes'},
        })
        with stack, app.test_client() as client:
            data = client.get('/api/harvest/candidates', query_string={'session_id': sid}).get_json()
        types = [c['type'] for c in data['candidates']]
        self.assertIn('skill_gap_confirmed', types)
        cand = next(c for c in data['candidates'] if c['type'] == 'skill_gap_confirmed')
        self.assertEqual(cand['proposed'], 'Docker')

    def test_skill_gap_no_answer_excluded(self):
        """skill_gap_* with 'no' answer is not included."""
        app, _, _, sid, stack = _make_app(state_overrides={
            'post_analysis_answers': {'skill_gap_Terraform': 'no'},
        })
        with stack, app.test_client() as client:
            data = client.get('/api/harvest/candidates', query_string={'session_id': sid}).get_json()
        self.assertEqual(data['candidates'], [])


# ---------------------------------------------------------------------------
# POST /api/harvest/apply
# ---------------------------------------------------------------------------

class TestHarvestApply(unittest.TestCase):

    def test_no_selected_ids_returns_zero_written(self):
        """Empty selected_ids returns ok with written_count=0."""
        app, _, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res  = client.post('/api/harvest/apply', json={'selected_ids': [], 'session_id': sid})
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertEqual(data['written_count'], 0)

    def test_apply_skill_candidate(self):
        """Applying a new_skill candidate adds it to master data."""
        app, conv, orch, sid, stack = _make_app(state_overrides={
            'customizations': {'new_skills_added': ['FastAPI']},
        })
        orch.master_data = {'skills': ['Python']}

        master_json = json.dumps({'skills': ['Python']})
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run', return_value=MagicMock(returncode=0, stdout='abc')):
            res  = client.post('/api/harvest/apply',
                               json={'selected_ids': ['skill_FastAPI'], 'session_id': sid})
            data = res.get_json()

        self.assertTrue(data['ok'])
        self.assertGreaterEqual(data['written_count'], 1)

    def test_apply_unknown_id_silently_skipped(self):
        """An unknown id in selected_ids is silently skipped."""
        app, _, _, sid, stack = _make_app()
        master_json = json.dumps({'skills': []})
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump'), \
             patch('subprocess.run', return_value=MagicMock(returncode=0, stdout='')):
            res  = client.post('/api/harvest/apply',
                               json={'selected_ids': ['does_not_exist'], 'session_id': sid})
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertEqual(data['written_count'], 0)


# ---------------------------------------------------------------------------
# _harvest_apply_bullet unit tests
# ---------------------------------------------------------------------------

class TestHarvestApplyBullet(unittest.TestCase):

    def test_string_bullet_replaced(self):
        master = {'experience': [{'achievements': ['Old bullet text.', 'Other bullet.']}]}
        result = _harvest_apply_bullet(master, 'Old bullet text.', 'New improved text.')
        self.assertTrue(result)
        self.assertEqual(master['experience'][0]['achievements'][0], 'New improved text.')

    def test_dict_bullet_replaced(self):
        master = {'experience': [{'achievements': [{'text': 'Old bullet text.'}, {'text': 'Other.'}]}]}
        result = _harvest_apply_bullet(master, 'Old bullet text.', 'Improved text.')
        self.assertTrue(result)
        self.assertEqual(master['experience'][0]['achievements'][0]['text'], 'Improved text.')

    def test_bullet_whitespace_normalised(self):
        """Leading/trailing whitespace in original is ignored during matching."""
        master = {'experience': [{'achievements': ['  Padded bullet.  ']}]}
        result = _harvest_apply_bullet(master, 'Padded bullet.', 'New text.')
        self.assertTrue(result)

    def test_bullet_not_found_returns_false(self):
        master = {'experience': [{'achievements': ['Something else.']}]}
        result = _harvest_apply_bullet(master, 'Non-existent bullet.', 'New text.')
        self.assertFalse(result)

    def test_empty_experience_returns_false(self):
        master = {'experience': []}
        result = _harvest_apply_bullet(master, 'Anything.', 'New.')
        self.assertFalse(result)

    def test_uses_bullets_key_alias(self):
        """'bullets' key is an accepted alias for 'achievements'."""
        master = {'experience': [{'bullets': ['Bullet A.']}]}
        result = _harvest_apply_bullet(master, 'Bullet A.', 'Better A.')
        self.assertTrue(result)
        self.assertEqual(master['experience'][0]['bullets'][0], 'Better A.')


# ---------------------------------------------------------------------------
# _harvest_add_skill unit tests
# ---------------------------------------------------------------------------

class TestHarvestAddSkill(unittest.TestCase):

    def test_list_adds_new_skill(self):
        master = {'skills': ['Python', 'SQL']}
        result = _harvest_add_skill(master, 'Docker')
        self.assertTrue(result)
        self.assertIn('Docker', master['skills'])

    def test_list_duplicate_not_added(self):
        master = {'skills': ['Python', 'SQL']}
        result = _harvest_add_skill(master, 'Python')
        self.assertFalse(result)
        self.assertEqual(master['skills'].count('Python'), 1)

    def test_dict_with_other_category(self):
        master = {'skills': {'Backend': ['Python'], 'Other': ['Redis']}}
        result = _harvest_add_skill(master, 'Kubernetes')
        self.assertTrue(result)
        self.assertIn('Kubernetes', master['skills']['Other'])

    def test_dict_creates_other_category(self):
        master = {'skills': {'Backend': ['Python'], 'Frontend': ['React']}}
        result = _harvest_add_skill(master, 'Docker')
        self.assertTrue(result)
        # Docker should end up somewhere in the skills dict
        all_skills = [s for lst in master['skills'].values() for s in lst]
        self.assertIn('Docker', all_skills)

    def test_missing_skills_creates_list(self):
        master = {}
        result = _harvest_add_skill(master, 'FastAPI')
        self.assertTrue(result)
        self.assertEqual(master['skills'], ['FastAPI'])


# ---------------------------------------------------------------------------
# _harvest_add_summary_variant unit tests
# ---------------------------------------------------------------------------

class TestHarvestAddSummaryVariant(unittest.TestCase):

    def test_creates_new_list(self):
        master = {}
        result = _harvest_add_summary_variant(master, 'New summary text.')
        self.assertTrue(result)
        self.assertEqual(master['professional_summaries'], ['New summary text.'])

    def test_appends_to_existing_list(self):
        master = {'professional_summaries': ['Original summary.']}
        result = _harvest_add_summary_variant(master, 'New variant.')
        self.assertTrue(result)
        self.assertEqual(len(master['professional_summaries']), 2)
        self.assertIn('New variant.', master['professional_summaries'])

    def test_duplicate_not_appended(self):
        master = {'professional_summaries': ['Existing summary.']}
        result = _harvest_add_summary_variant(master, 'Existing summary.')
        self.assertFalse(result)
        self.assertEqual(len(master['professional_summaries']), 1)


# ---------------------------------------------------------------------------
# GET /api/master-fields
# ---------------------------------------------------------------------------

class TestMasterFieldsEndpoint(unittest.TestCase):

    def test_returns_selected_achievements_and_summaries(self):
        """Normal path: reads master file and returns both fields."""
        master_data = {
            'selected_achievements': [
                {'id': 'sa_001', 'title': 'Led team of 10', 'importance': 8},
            ],
            'professional_summaries': {
                'default': 'Experienced data scientist...',
            },
        }
        app, _, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(master_data))):
            res  = client.get('/api/master-fields', query_string={'session_id': sid})
            data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(len(data['selected_achievements']), 1)
        self.assertEqual(data['selected_achievements'][0]['id'], 'sa_001')
        self.assertIn('default', data['professional_summaries'])

    def test_returns_empty_lists_when_fields_absent(self):
        """If master data lacks the fields, returns empty defaults without error."""
        app, _, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps({}))):
            res  = client.get('/api/master-fields', query_string={'session_id': sid})
            data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['selected_achievements'], [])
        self.assertEqual(data['professional_summaries'], {})

    def test_returns_500_on_read_error(self):
        """If the master file cannot be read, returns 500 with ok=False."""
        app, _, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', side_effect=OSError('file not found')):
            res  = client.get('/api/master-fields', query_string={'session_id': sid})
            data = res.get_json()
        self.assertEqual(res.status_code, 500)
        self.assertFalse(data['ok'])
        self.assertIn('file not found', data['error'])


if __name__ == '__main__':
    unittest.main()
