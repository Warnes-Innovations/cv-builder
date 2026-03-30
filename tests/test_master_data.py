# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for Phase 13: Master CV Data Management endpoints.

Covers:
  - GET /api/master-data/overview: returns name, headline, email, and counts
  - GET /api/master-data/overview: handles missing sections gracefully
  - GET /api/master-data/overview: skills as dict are counted correctly
  - POST /api/master-data/update-achievement: updates an existing achievement
  - POST /api/master-data/update-achievement: adds a new achievement
  - POST /api/master-data/update-achievement: missing id returns 400
  - POST /api/master-data/update-summary: updates an existing summary key
  - POST /api/master-data/update-summary: adds a new summary key
  - POST /api/master-data/update-summary: missing key or text returns 400
  - POST /api/master-data/update-summary: list summaries are migrated to dict
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

from scripts.web_app import create_app, _load_master, _save_master
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


def _make_app(validate_master_data_file_mock=None):
    mock_llm          = MagicMock()
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data      = {'experience': [], 'skills': []}
    mock_orchestrator.master_data_path = '/tmp/fake_master.json'

    mock_conversation = MagicMock()
    mock_conversation.state = {'phase': 'refinement'}

    if validate_master_data_file_mock is None:
        validate_master_data_file_mock = MagicMock(return_value=ValidationResult(valid=True))

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.CVOrchestrator', return_value=mock_orchestrator))
    stack.enter_context(patch('scripts.web_app.ConversationManager', return_value=mock_conversation))
    # Skip file-existence check in _load_master so tests can use mock_open freely
    stack.enter_context(patch(
        'scripts.web_app.validate_master_data_file',
        new=validate_master_data_file_mock,
    ))

    app = create_app(_make_args())
    app.config['TESTING'] = True

    with app.test_client() as tmp_client:
        sid = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, mock_orchestrator, sid, stack


# ---------------------------------------------------------------------------
# GET /api/master-data/overview
# ---------------------------------------------------------------------------

class TestMasterDataOverview(unittest.TestCase):

    _MASTER = {
        'personal_info': {
            'name':    'Dr. Test User',
            'headline': 'Senior Engineer',
            'contact': {'email': 'test@example.com'},
        },
        'experience':             [{'id': 'e1'}, {'id': 'e2'}],
        'skills':                 ['Python', 'R', 'SQL'],
        'selected_achievements':  [{'id': 'sa1'}, {'id': 'sa2'}],
        'professional_summaries': {'ml': 'Summary A', 'leadership': 'Summary B'},
        'education':              [{'degree': 'PhD'}],
        'publications':           [{'key': 'pub1'}, {'key': 'pub2'}, {'key': 'pub3'}],
    }

    def test_overview_returns_counts_and_profile(self):
        """Overview endpoint returns name, headline, email, and section counts."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps(self._MASTER)

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)):
            res  = client.get('/api/master-data/overview', query_string={'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['name'],              'Dr. Test User')
        self.assertEqual(data['headline'],          'Senior Engineer')
        self.assertEqual(data['email'],             'test@example.com')
        self.assertEqual(data['experience_count'],  2)
        self.assertEqual(data['skill_count'],       3)
        self.assertEqual(data['achievement_count'], 2)
        self.assertEqual(data['summary_count'],     2)
        self.assertEqual(data['education_count'],   1)
        self.assertEqual(data['publication_count'], 3)

    def test_overview_skills_dict_counts_all_values(self):
        """Skills as a category dict are summed across all categories."""
        app, _, sid, stack = _make_app()
        master = dict(self._MASTER)
        master['skills'] = {'ML': ['scikit-learn', 'PyTorch'], 'Languages': ['Python', 'R', 'Go']}
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(master))):
            data = client.get('/api/master-data/overview', query_string={'session_id': sid}).get_json()

        self.assertEqual(data['skill_count'], 5)

    def test_overview_missing_sections_return_zeros(self):
        """Minimal master data (empty doc) yields zero counts and empty strings."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps({}))):
            data = client.get('/api/master-data/overview', query_string={'session_id': sid}).get_json()

        self.assertTrue(data['ok'])
        self.assertEqual(data['name'],             '')
        self.assertEqual(data['experience_count'], 0)
        self.assertEqual(data['skill_count'],      0)

    def test_overview_io_error_returns_500(self):
        """File read failure returns 500 with ok=False."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', side_effect=IOError('disk error')):
            res  = client.get('/api/master-data/overview', query_string={'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 500)
        self.assertFalse(data['ok'])

    def test_overview_returns_generic_500_when_preload_validation_fails(self):
        """Pre-load validation failures should not leak internal details."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps({}))) as mock_file, \
             patch(
                 'scripts.web_app.validate_master_data_file',
                 return_value=ValidationResult(
                     valid=False,
                     errors=['experience must be a list'],
                 ),
             ):
            res = client.get('/api/master-data/overview', query_string={'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 500)
        self.assertFalse(data['ok'])
        self.assertEqual(data['error'], 'Failed to load master data overview.')
        mock_file.assert_not_called()


# ---------------------------------------------------------------------------
# POST /api/master-data/update-achievement
# ---------------------------------------------------------------------------

class TestMasterDataUpdateAchievement(unittest.TestCase):

    _EXISTING_MASTER = {
        'selected_achievements': [
            {'id': 'sa_001', 'title': 'Old title', 'importance': 8},
        ],
    }

    def test_update_existing_achievement(self):
        """POSTing an existing id patches only the supplied fields."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps(self._EXISTING_MASTER)

        written = {}

        def fake_open(path, mode='r', **kw):
            if 'w' in mode:
                m = mock_open()()
                return m
            return mock_open(read_data=master_json)()

        with stack, app.test_client() as client, \
             patch('builtins.open', side_effect=fake_open), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/update-achievement',
                               json={'id': 'sa_001', 'title': 'New Title', 'importance': 9,
                                     'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'updated')
        dumped_master = mock_dump.call_args[0][0]
        updated_ach = next(a for a in dumped_master['selected_achievements'] if a['id'] == 'sa_001')
        self.assertEqual(updated_ach['title'],      'New Title')
        self.assertEqual(updated_ach['importance'], 9)

    def test_add_new_achievement(self):
        """POSTing a new id appends the achievement."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps({'selected_achievements': []})

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/update-achievement',
                               json={'id': 'sa_new', 'title': 'Brand new achievement',
                                     'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'added')
        dumped_master = mock_dump.call_args[0][0]
        self.assertEqual(len(dumped_master['selected_achievements']), 1)
        self.assertEqual(dumped_master['selected_achievements'][0]['title'], 'Brand new achievement')

    def test_missing_id_returns_400(self):
        """Missing or empty id field returns 400."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post('/api/master-data/update-achievement',
                              json={'title': 'No id here', 'session_id': sid})
        self.assertEqual(res.status_code, 400)
        self.assertIn('id', res.get_json()['error'])


# ---------------------------------------------------------------------------
# POST /api/master-data/update-summary
# ---------------------------------------------------------------------------

class TestMasterDataUpdateSummary(unittest.TestCase):

    def test_update_existing_summary_key(self):
        """POSTing an existing key replaces its text."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps({'professional_summaries': {'ml': 'Old text'}})

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/update-summary',
                               json={'key': 'ml', 'text': 'New text!', 'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'updated')
        dumped = mock_dump.call_args[0][0]
        self.assertEqual(dumped['professional_summaries']['ml'], 'New text!')

    def test_add_new_summary_key(self):
        """POSTing a new key adds the summary variant."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps({'professional_summaries': {}})

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/update-summary',
                               json={'key': 'leadership', 'text': 'Led large teams.',
                                     'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'added')
        dumped = mock_dump.call_args[0][0]
        self.assertIn('leadership', dumped['professional_summaries'])

    def test_missing_key_or_text_returns_400(self):
        """Missing key or text field returns 400."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res_no_key  = client.post('/api/master-data/update-summary',
                                     json={'text': 'hi', 'session_id': sid})
            res_no_text = client.post('/api/master-data/update-summary',
                                     json={'key': 'k', 'session_id': sid})

        self.assertEqual(res_no_key.status_code,  400)
        self.assertEqual(res_no_text.status_code, 400)

    def test_list_summaries_migrated_to_dict(self):
        """If professional_summaries is stored as a list, it is migrated to a dict."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps({'professional_summaries': ['Old summary']})

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/update-summary',
                               json={'key': 'new_key', 'text': 'New summary text',
                                     'session_id': sid})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        dumped = mock_dump.call_args[0][0]
        self.assertIsInstance(dumped['professional_summaries'], dict)
        self.assertIn('new_key', dumped['professional_summaries'])


# ---------------------------------------------------------------------------
# Field-level validation on master-data endpoints
# ---------------------------------------------------------------------------

class TestMasterDataFieldValidation(unittest.TestCase):

    def test_master_data_write_routes_reject_customization_phase(self):
        app, _, sid, stack = _make_app()
        app.session_registry.get(sid).manager.state['phase'] = 'customization'

        routes = [
            ('/api/master-data/update-summary', {'key': 'targeted', 'text': 'New summary'}),
            ('/api/master-data/personal-info', {'email': 'person@example.com'}),
            (
                '/api/master-data/experience',
                {
                    'action': 'add',
                    'experience': {
                        'title': 'Engineer',
                        'company': 'Acme',
                    },
                },
            ),
        ]

        with stack, app.test_client() as client, patch('builtins.open') as mock_open_file:
            for url, payload in routes:
                with self.subTest(url=url):
                    res = client.post(url, json={**payload, 'session_id': sid})
                    data = res.get_json()
                    self.assertEqual(res.status_code, 409)
                    self.assertIn('Master data can only be modified', data['error'])
                    self.assertEqual(data['phase'], 'customization')

        mock_open_file.assert_not_called()

    def test_master_data_write_routes_allow_init_phase(self):
        app, _, sid, stack = _make_app()
        app.session_registry.get(sid).manager.state['phase'] = 'init'

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps({'professional_summaries': {}}))), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):
            res = client.post(
                '/api/master-data/update-summary',
                json={'key': 'targeted', 'text': 'New summary', 'session_id': sid},
            )
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'added')
        dumped = mock_dump.call_args[0][0]
        self.assertEqual(dumped['professional_summaries']['targeted'], 'New summary')

    def test_personal_info_invalid_email_returns_400(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post(
                '/api/master-data/personal-info',
                json={'email': 'not-an-email', 'session_id': sid},
            )
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.get_json()['error'])

    def test_experience_invalid_employment_type_returns_400(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post(
                '/api/master-data/experience',
                json={
                    'action': 'add',
                    'experience': {
                        'title': 'Engineer',
                        'company': 'Acme',
                        'employment_type': 'gig_worker',
                    },
                    'session_id': sid,
                },
            )
        self.assertEqual(res.status_code, 400)
        self.assertIn('employment_type', res.get_json()['error'])

    def test_education_start_year_after_end_year_returns_400(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post(
                '/api/master-data/education',
                json={
                    'action': 'add',
                    'degree': 'MS',
                    'institution': 'Test University',
                    'start_year': 2024,
                    'end_year': 2020,
                    'session_id': sid,
                },
            )
        self.assertEqual(res.status_code, 400)
        self.assertIn('start_year', res.get_json()['error'])

    def test_award_year_out_of_range_returns_400(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post(
                '/api/master-data/award',
                json={
                    'action': 'add',
                    'title': 'Some Award',
                    'year': 1800,
                    'session_id': sid,
                },
            )
        self.assertEqual(res.status_code, 400)
        self.assertIn('year', res.get_json()['error'])

    def test_skill_duplicate_case_insensitive_returns_409(self):
        app, _, sid, stack = _make_app()
        master_json = json.dumps({'skills': ['Python']})

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump'), \
             patch('subprocess.run'):
            res = client.post(
                '/api/master-data/skill',
                json={'action': 'add', 'skill': 'python', 'session_id': sid},
            )

        self.assertEqual(res.status_code, 409)
        self.assertIn('already exists', res.get_json()['error'])

    def test_skill_add_category_invalid_key_returns_400(self):
        app, _, sid, stack = _make_app()
        master_json = json.dumps({'skills': {}})

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump'), \
             patch('subprocess.run'):
            res = client.post(
                '/api/master-data/skill',
                json={
                    'action': 'add_category',
                    'category_key': 'bad key!',
                    'category_name': 'Bad Key',
                    'session_id': sid,
                },
            )

        self.assertEqual(res.status_code, 400)
        self.assertIn('category_key', res.get_json()['error'])

    def test_skill_category_non_list_structure_returns_400(self):
        app, _, sid, stack = _make_app()
        master_json = json.dumps({'skills': {'ml': {'category': 'ML', 'skills': 'python'}}})

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump'), \
             patch('subprocess.run'):
            res = client.post(
                '/api/master-data/skill',
                json={
                    'action': 'add',
                    'category': 'ml',
                    'skill': 'TensorFlow',
                    'session_id': sid,
                },
            )

        self.assertEqual(res.status_code, 400)
        self.assertIn('must be a list', res.get_json()['error'])


# ---------------------------------------------------------------------------
# POST /api/master-data/skill
# ---------------------------------------------------------------------------

class TestMasterDataUpdateSkill(unittest.TestCase):

    def test_update_skill_adds_associated_experience_ids(self):
        """Updating an existing skill can persist optional associated experiences."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps({
            'experience': [{'id': 'exp_1'}, {'id': 'exp_2'}],
            'skills': ['Python'],
        })

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res = client.post(
                '/api/master-data/skill',
                json={
                    'action': 'update',
                    'skill': 'Python',
                    'skill_new': 'Python',
                    'experiences': ['exp_1', 'exp_2'],
                    'session_id': sid,
                },
            )
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'updated')
        dumped = mock_dump.call_args[0][0]
        self.assertEqual(dumped['skills'][0], {'name': 'Python', 'experiences': ['exp_1', 'exp_2']})

    def test_update_skill_filters_unknown_experience_ids(self):
        """Unknown experience IDs are ignored when saving skill associations."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps({
            'experience': [{'id': 'exp_1'}],
            'skills': ['R'],
        })

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res = client.post(
                '/api/master-data/skill',
                json={
                    'action': 'update',
                    'skill': 'R',
                    'skill_new': 'R',
                    'experiences': ['exp_1', 'exp_missing'],
                    'session_id': sid,
                },
            )
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        dumped = mock_dump.call_args[0][0]
        self.assertEqual(dumped['skills'][0], {'name': 'R', 'experiences': ['exp_1']})

    def test_update_skill_preserves_existing_experiences_when_omitted(self):
        """Omitting experiences on update should keep existing associations."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps({
            'experience': [{'id': 'exp_1'}],
            'skills': [{'name': 'Python', 'experiences': ['exp_1']}],
        })

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res = client.post(
                '/api/master-data/skill',
                json={
                    'action': 'update',
                    'skill': 'Python',
                    'skill_new': 'Python',
                    'session_id': sid,
                },
            )
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        dumped = mock_dump.call_args[0][0]
        self.assertEqual(dumped['skills'][0], {'name': 'Python', 'experiences': ['exp_1']})

    def test_update_skill_persists_group_field(self):
        """Setting a group key on update stores it in the skill dict."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps({'skills': ['Python']})

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res = client.post(
                '/api/master-data/skill',
                json={
                    'action': 'update',
                    'skill': 'Python',
                    'group': 'scripting',
                    'session_id': sid,
                },
            )
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        dumped = mock_dump.call_args[0][0]
        self.assertEqual(dumped['skills'][0], {'name': 'Python', 'group': 'scripting'})

    def test_update_skill_clears_group_when_empty(self):
        """Passing group='' removes the group field from the skill."""
        app, _, sid, stack = _make_app()
        master_json = json.dumps({'skills': [{'name': 'Python', 'group': 'scripting'}]})

        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res = client.post(
                '/api/master-data/skill',
                json={
                    'action': 'update',
                    'skill': 'Python',
                    'group': '',
                    'session_id': sid,
                },
            )

        self.assertEqual(res.status_code, 200)
        dumped = mock_dump.call_args[0][0]
        # group is empty → skill collapses to plain string (no experience_ids either)
        self.assertEqual(dumped['skills'][0], 'Python')


# ---------------------------------------------------------------------------
# _save_master helper
# ---------------------------------------------------------------------------

class TestSaveMasterHelper(unittest.TestCase):

    def test_save_master_creates_backup_before_overwrite(self):
        """Existing master file is backed up before writing new content."""
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            old_data = {'personal_info': {'name': 'Old Name'}}
            new_data = {'personal_info': {'name': 'New Name'}}
            master_path.write_text(json.dumps(old_data), encoding='utf-8')

            with patch('scripts.web_app.subprocess.run'):
                _save_master(new_data, master_path)

            # New content is written
            saved = json.loads(master_path.read_text(encoding='utf-8'))
            self.assertEqual(saved['personal_info']['name'], 'New Name')

            # One timestamped backup exists with old content
            backup_dir = Path(td) / 'backups'
            backups = list(backup_dir.glob('Master_CV_Data.*.bak.json'))
            self.assertEqual(len(backups), 1)
            backup_data = json.loads(backups[0].read_text(encoding='utf-8'))
            self.assertEqual(backup_data['personal_info']['name'], 'Old Name')

    def test_save_master_without_existing_file_skips_backup(self):
        """No backup is created when the file does not yet exist."""
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            new_data = {'personal_info': {'name': 'First Write'}}

            with patch('scripts.web_app.subprocess.run'):
                _save_master(new_data, master_path)

            self.assertTrue(master_path.exists())
            backup_dir = Path(td) / 'backups'
            self.assertFalse(backup_dir.exists())

    def test_save_master_rejects_invalid_master_shape(self):
        """Invalid top-level structure is rejected before any write."""
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            old_data = {'personal_info': {'name': 'Old Name'}, 'skills': []}
            master_path.write_text(json.dumps(old_data), encoding='utf-8')

            invalid = {'personal_info': {'name': 'Broken'}, 'skills': 'not-a-list-or-dict'}

            with patch('scripts.web_app.subprocess.run'):
                with self.assertRaises(ValueError):
                    _save_master(invalid, master_path)

            # Original content remains unchanged.
            saved = json.loads(master_path.read_text(encoding='utf-8'))
            self.assertEqual(saved['personal_info']['name'], 'Old Name')

            # No backup should be created for invalid payloads.
            backup_dir = Path(td) / 'backups'
            self.assertFalse(backup_dir.exists())

    def test_save_master_validation_failure_restores_backup(self):
        """If post-write validation fails, original file content is restored."""
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            old_data = {'personal_info': {'name': 'Old Name'}, 'skills': []}
            new_data = {'personal_info': {'name': 'New Name'}, 'skills': []}
            master_path.write_text(json.dumps(old_data), encoding='utf-8')

            with patch('scripts.web_app.subprocess.run'), \
                 patch(
                     'scripts.web_app.validate_master_data_file',
                     return_value=ValidationResult(
                         valid=False,
                         errors=['schema error at skills: wrong type'],
                     ),
                 ):
                with self.assertRaises(ValueError):
                    _save_master(new_data, master_path)

            saved = json.loads(master_path.read_text(encoding='utf-8'))
            self.assertEqual(saved['personal_info']['name'], 'Old Name')


class TestLoadMasterHelper(unittest.TestCase):

    def test_load_master_validates_before_read(self):
        """Loading master data validates file path before reading JSON."""
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            data = {'personal_info': {'name': 'Valid'}}
            master_path.write_text(json.dumps(data), encoding='utf-8')

            with patch(
                'scripts.web_app.validate_master_data_file',
                return_value=ValidationResult(valid=True),
            ) as mock_validate:
                loaded, loaded_path = _load_master(str(master_path))

            self.assertEqual(loaded['personal_info']['name'], 'Valid')
            self.assertEqual(loaded_path, master_path)
            mock_validate.assert_called_once_with(str(master_path), use_schema=True)

    def test_load_master_fails_when_validation_fails(self):
        """Loading master data raises when pre-load validation fails."""
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text(json.dumps({'skills': []}), encoding='utf-8')

            with patch(
                'scripts.web_app.validate_master_data_file',
                return_value=ValidationResult(
                    valid=False,
                    errors=['experience must be a list'],
                ),
            ):
                with self.assertRaises(ValueError):
                    _load_master(str(master_path))


# ---------------------------------------------------------------------------
# POST /api/master-data/preview-diff
# ---------------------------------------------------------------------------

class TestMasterDataPreviewDiff(unittest.TestCase):
    """Tests for the read-only before/after diff preview endpoint."""

    _MASTER_PERSONAL = {
        'personal_info': {
            'name':  'Dr. Test User',
            'title': 'Senior Engineer',
            'contact': {
                'email':    'test@example.com',
                'phone':    '555-1234',
                'linkedin': 'linkedin.com/in/test',
                'website':  '',
                'address':  {'city': 'Boston', 'state': 'MA'},
            },
        },
        'skills': ['Python', 'R', 'SQL'],
    }

    def _post(self, client, sid, body):
        return client.post(
            '/api/master-data/preview-diff',
            json=body,
            query_string={'session_id': sid},
        )

    # ── section validation ──────────────────────────────────────────────────

    def test_missing_section_returns_400(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            res = self._post(client, sid, {'section': 'bad'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('section', res.get_json()['error'])

    # ── personal_info diffs ────────────────────────────────────────────────

    def test_personal_info_changed_name_detected(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            res  = self._post(client, sid, {'section': 'personal_info', 'name': 'New Name'})
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertTrue(data['changed'])
        self.assertEqual(len(data['changes']), 1)
        self.assertEqual(data['changes'][0]['field'], 'name')
        self.assertEqual(data['changes'][0]['old'], 'Dr. Test User')
        self.assertEqual(data['changes'][0]['new'], 'New Name')

    def test_personal_info_unchanged_value_omitted(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            # Send same name — should produce no changes
            res  = self._post(client, sid, {'section': 'personal_info', 'name': 'Dr. Test User'})
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertFalse(data['changed'])
        self.assertEqual(data['changes'], [])

    def test_personal_info_multiple_fields_changed(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            res  = self._post(client, sid, {
                'section': 'personal_info',
                'name': 'New Name',
                'city': 'New York',
            })
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertEqual(len(data['changes']), 2)
        fields_changed = {c['field'] for c in data['changes']}
        self.assertIn('name', fields_changed)
        self.assertIn('city', fields_changed)

    def test_personal_info_no_fields_in_request_produces_no_diff(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            res  = self._post(client, sid, {'section': 'personal_info'})
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertFalse(data['changed'])

    # ── skill diffs — list ──────────────────────────────────────────────────

    def test_skill_add_new_skill_listed(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            res  = self._post(client, sid, {'section': 'skill', 'action': 'add', 'skill': 'Go'})
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertTrue(data['changed'])
        self.assertEqual(data['changes'][0]['new'], 'Go')

    def test_skill_add_duplicate_produces_no_change(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            res  = self._post(client, sid, {'section': 'skill', 'action': 'add', 'skill': 'python'})
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertFalse(data['changed'])   # already in list (case-insensitive)

    def test_skill_delete_existing_skill(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            res  = self._post(client, sid, {'section': 'skill', 'action': 'delete', 'skill': 'SQL'})
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertTrue(data['changed'])

    def test_skill_delete_nonexistent_produces_no_change(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            res  = self._post(client, sid, {'section': 'skill', 'action': 'delete', 'skill': 'Rust'})
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertFalse(data['changed'])

    def test_skill_invalid_action_returns_400(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            res = self._post(client, sid, {'section': 'skill', 'action': 'rename', 'skill': 'X'})
        self.assertEqual(res.status_code, 400)

    def test_skill_missing_skill_name_returns_400(self):
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER_PERSONAL))):
            res = self._post(client, sid, {'section': 'skill', 'action': 'add'})
        self.assertEqual(res.status_code, 400)

    # ── skill diffs — categorized dict ─────────────────────────────────────

    def test_skill_add_to_category_dict(self):
        master = dict(self._MASTER_PERSONAL)
        master['skills'] = {'Languages': ['Python', 'R'], 'Tools': ['Git']}
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(master))):
            res  = self._post(client, sid, {
                'section': 'skill', 'action': 'add', 'skill': 'Go', 'category': 'Languages',
            })
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertTrue(data['changed'])
        self.assertEqual(data['changes'][0]['field'], 'skills.Languages')

    def test_skill_add_category_dict_missing_category_returns_400(self):
        master = dict(self._MASTER_PERSONAL)
        master['skills'] = {'Languages': ['Python']}
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(master))):
            res = self._post(client, sid, {'section': 'skill', 'action': 'add', 'skill': 'Go'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('category', res.get_json()['error'])

    def test_skill_add_new_category(self):
        master = dict(self._MASTER_PERSONAL)
        master['skills'] = {'Languages': ['Python']}
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(master))):
            res  = self._post(client, sid, {
                'section': 'skill', 'action': 'add_category', 'category_key': 'Tools',
            })
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertTrue(data['changed'])

    def test_skill_add_existing_category_produces_no_change(self):
        master = dict(self._MASTER_PERSONAL)
        master['skills'] = {'Languages': ['Python']}
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(master))):
            res  = self._post(client, sid, {
                'section': 'skill', 'action': 'add_category', 'category_key': 'Languages',
            })
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertFalse(data['changed'])

    def test_skill_delete_category(self):
        master = dict(self._MASTER_PERSONAL)
        master['skills'] = {'Languages': ['Python'], 'Tools': ['Git']}
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(master))):
            res  = self._post(client, sid, {
                'section': 'skill', 'action': 'delete_category', 'category_key': 'Tools',
            })
            data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertTrue(data['changed'])

    def test_skill_category_missing_category_key_returns_400(self):
        master = dict(self._MASTER_PERSONAL)
        master['skills'] = {'Languages': ['Python']}
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(master))):
            res = self._post(client, sid, {'section': 'skill', 'action': 'add_category'})
        self.assertEqual(res.status_code, 400)


# ---------------------------------------------------------------------------
# GET /api/master-data/validate
# ---------------------------------------------------------------------------

class TestMasterDataValidateEndpoint(unittest.TestCase):
    """Tests for the GET /api/master-data/validate endpoint."""

    _MASTER = {
        'personal_info': {'name': 'Dr. Test'},
        'experience': [],
        'skills': ['Python'],
    }

    def test_valid_data_returns_ok_true(self):
        mock_v = MagicMock(return_value=ValidationResult(valid=True, errors=[], warnings=[]))
        app, _, sid, stack = _make_app(validate_master_data_file_mock=mock_v)
        with stack, app.test_client() as client:
            res  = client.get('/api/master-data/validate', query_string={'session_id': sid})
            data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['errors'], [])

    def test_invalid_data_returns_ok_false(self):
        mock_v = MagicMock(
            return_value=ValidationResult(valid=False, errors=['experience must be a list'])
        )
        app, _, sid, stack = _make_app(validate_master_data_file_mock=mock_v)
        with stack, app.test_client() as client:
            res  = client.get('/api/master-data/validate', query_string={'session_id': sid})
            data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertFalse(data['ok'])
        self.assertIn('experience must be a list', data['errors'])

    def test_use_schema_false_passes_through(self):
        mock_v = MagicMock(return_value=ValidationResult(valid=True, errors=[], warnings=[]))
        app, _, sid, stack = _make_app(validate_master_data_file_mock=mock_v)
        with stack, app.test_client() as client:
            client.get('/api/master-data/validate',
                       query_string={'session_id': sid, 'use_schema': 'false'})
        mock_v.assert_called_once()
        _, kwargs = mock_v.call_args
        self.assertFalse(kwargs.get('use_schema', True))


# ---------------------------------------------------------------------------
# scripts/utils/master_data_validator — validate_master_data
# ---------------------------------------------------------------------------

class TestValidateMasterData(unittest.TestCase):
    """Unit tests for the standalone master-data validator module."""

    def setUp(self):
        from scripts.utils.master_data_validator import validate_master_data, validate_master_data_file
        self.validate = validate_master_data
        self.validate_file = validate_master_data_file

    def test_minimal_valid_object_passes(self):
        result = self.validate({}, use_schema=False)
        self.assertTrue(result.valid)
        self.assertEqual(result.errors, [])

    def test_personal_info_must_be_dict(self):
        result = self.validate({'personal_info': 'bad'}, use_schema=False)
        self.assertFalse(result.valid)
        self.assertTrue(any('personal_info' in e for e in result.errors))

    def test_experience_must_be_list(self):
        result = self.validate({'experience': 'bad'}, use_schema=False)
        self.assertFalse(result.valid)
        self.assertTrue(any('experience' in e for e in result.errors))

    def test_skills_list_is_valid(self):
        result = self.validate({'skills': ['Python', 'R']}, use_schema=False)
        self.assertTrue(result.valid)

    def test_skills_dict_is_valid(self):
        result = self.validate({'skills': {'ML': ['scikit-learn']}}, use_schema=False)
        self.assertTrue(result.valid)

    def test_skills_string_fails(self):
        result = self.validate({'skills': 'Python'}, use_schema=False)
        self.assertFalse(result.valid)

    def test_non_dict_top_level_fails(self):
        result = self.validate([], use_schema=False)
        self.assertFalse(result.valid)
        self.assertTrue(any('JSON object' in e for e in result.errors))

    def test_to_dict_contains_expected_keys(self):
        result = self.validate({}, use_schema=False)
        d = result.to_dict()
        for key in ('valid', 'errors', 'warnings', 'checked_path', 'schema_path'):
            self.assertIn(key, d)

    def test_validate_file_missing_path_fails(self):
        result = self.validate_file('/nonexistent/path/master.json', use_schema=False)
        self.assertFalse(result.valid)
        self.assertTrue(any('not found' in e for e in result.errors))

    def test_validate_file_invalid_json_fails(self):
        import tempfile, os
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('{ not valid json ]')
            fname = f.name
        try:
            result = self.validate_file(fname, use_schema=False)
            self.assertFalse(result.valid)
            self.assertTrue(any('invalid JSON' in e for e in result.errors))
        finally:
            os.unlink(fname)

    def test_validate_file_valid_json_passes(self):
        import tempfile, os
        data = json.dumps({'personal_info': {'name': 'Test'}})
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write(data)
            fname = f.name
        try:
            result = self.validate_file(fname, use_schema=False)
            self.assertTrue(result.valid)
            self.assertEqual(result.checked_path, fname)
        finally:
            os.unlink(fname)

    def test_schema_warning_when_schema_file_absent(self):
        result = self.validate({}, use_schema=True, schema_path='/nonexistent/schema.json')
        # Missing schema should add a warning, not an error
        self.assertTrue(result.valid)
        self.assertTrue(any('not found' in w for w in result.warnings))


# ---------------------------------------------------------------------------
# POST /api/master-data/certification
# ---------------------------------------------------------------------------

class TestMasterDataCertification(unittest.TestCase):

    _BASE_MASTER = {'certifications': [
        {'name': 'AWS CSA', 'issuer': 'Amazon', 'year': 2022},
    ]}

    def test_add_certification(self):
        """Adding a new certification appends it to the list."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps({'certifications': []}))), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/certification', json={
                'action': 'add', 'name': 'GCP PE', 'issuer': 'Google', 'year': 2023,
                'session_id': sid,
            })
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'added')
        dumped = mock_dump.call_args[0][0]
        self.assertEqual(len(dumped['certifications']), 1)
        self.assertEqual(dumped['certifications'][0]['name'],   'GCP PE')
        self.assertEqual(dumped['certifications'][0]['issuer'], 'Google')
        self.assertEqual(dumped['certifications'][0]['year'],   2023)

    def test_add_certification_missing_name_returns_400(self):
        """Name is required for add; missing name returns 400."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps({'certifications': []}))):
            res = client.post('/api/master-data/certification', json={
                'action': 'add', 'issuer': 'Google', 'session_id': sid,
            })
        self.assertEqual(res.status_code, 400)
        self.assertIn('name', res.get_json()['error'])

    def test_update_certification(self):
        """Updating an existing certification patches only supplied fields."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._BASE_MASTER))), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/certification', json={
                'action': 'update', 'idx': 0, 'name': 'AWS CSA Pro', 'year': 2024,
                'session_id': sid,
            })
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'updated')
        dumped = mock_dump.call_args[0][0]
        cert = dumped['certifications'][0]
        self.assertEqual(cert['name'],   'AWS CSA Pro')
        self.assertEqual(cert['year'],   2024)
        self.assertEqual(cert['issuer'], 'Amazon')  # unchanged

    def test_delete_certification(self):
        """Deleting a certification removes it by index."""
        app, _, sid, stack = _make_app()
        master = {'certifications': [
            {'name': 'A', 'issuer': 'X'},
            {'name': 'B', 'issuer': 'Y'},
        ]}
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(master))), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/certification', json={
                'action': 'delete', 'idx': 0, 'session_id': sid,
            })
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        dumped = mock_dump.call_args[0][0]
        self.assertEqual(len(dumped['certifications']), 1)
        self.assertEqual(dumped['certifications'][0]['name'], 'B')

    def test_delete_out_of_range_returns_404(self):
        """Deleting an out-of-range index returns 404."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps({'certifications': []}))):
            res = client.post('/api/master-data/certification', json={
                'action': 'delete', 'idx': 99, 'session_id': sid,
            })
        self.assertEqual(res.status_code, 404)

    def test_year_out_of_range_returns_400(self):
        """Year outside 1900–2100 returns 400."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post('/api/master-data/certification', json={
                'action': 'add', 'name': 'Cert', 'year': 1800, 'session_id': sid,
            })
        self.assertEqual(res.status_code, 400)
        self.assertIn('year', res.get_json()['error'])

    def test_invalid_action_returns_400(self):
        """Unknown action returns 400."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post('/api/master-data/certification', json={
                'action': 'upsert', 'name': 'Cert', 'session_id': sid,
            })
        self.assertEqual(res.status_code, 400)

    def test_phase_guard_blocks_customization(self):
        """Route rejects writes during the customization phase."""
        app, _, sid, stack = _make_app()
        app.session_registry.get(sid).manager.state['phase'] = 'customization'
        with stack, app.test_client() as client:
            res = client.post('/api/master-data/certification', json={
                'action': 'add', 'name': 'Cert', 'session_id': sid,
            })
        self.assertEqual(res.status_code, 409)
        self.assertIn('Master data can only be modified', res.get_json()['error'])

    def test_certification_internal_error_returns_generic_message(self):
        """Server errors are logged but not exposed to the client."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', side_effect=IOError('disk exploded')):
            res = client.post('/api/master-data/certification', json={
                'action': 'add', 'name': 'Cert', 'session_id': sid,
            })

        self.assertEqual(res.status_code, 500)
        self.assertEqual(
            res.get_json()['error'],
            'Failed to update certifications.',
        )


# ---------------------------------------------------------------------------
# GET /api/master-data/history
# ---------------------------------------------------------------------------

class TestMasterDataHistory(unittest.TestCase):

    def test_history_returns_snapshots_newest_first(self):
        """Existing backup files are listed sorted newest-first."""
        import os
        app, mock_orch, sid, stack = _make_app()
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text('{}', encoding='utf-8')
            backup_dir = Path(td) / 'backups'
            backup_dir.mkdir()
            # Create two backups in web_app format
            b1 = backup_dir / 'Master_CV_Data.20260101_120000_000000.bak.json'
            b2 = backup_dir / 'Master_CV_Data.20260301_090000_000000.bak.json'
            b1.write_text('{}', encoding='utf-8')
            b2.write_text('{}', encoding='utf-8')
            mock_orch.master_data_path = str(master_path)

            with stack, app.test_client() as client:
                res  = client.get('/api/master-data/history', query_string={'session_id': sid})
                data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(len(data['snapshots']), 2)
        # Sorted descending: March backup first
        self.assertEqual(data['snapshots'][0]['filename'],
                         'Master_CV_Data.20260301_090000_000000.bak.json')
        self.assertEqual(data['snapshots'][1]['filename'],
                         'Master_CV_Data.20260101_120000_000000.bak.json')

    def test_history_empty_when_backup_dir_absent(self):
        """No backup directory → empty snapshots list."""
        app, mock_orch, sid, stack = _make_app()
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text('{}', encoding='utf-8')
            mock_orch.master_data_path = str(master_path)

            with stack, app.test_client() as client:
                res  = client.get('/api/master-data/history', query_string={'session_id': sid})
                data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertEqual(data['snapshots'], [])

    def test_history_snapshot_has_required_fields(self):
        """Each snapshot entry contains filename, size, and mtime."""
        app, mock_orch, sid, stack = _make_app()
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text('{}', encoding='utf-8')
            backup_dir = Path(td) / 'backups'
            backup_dir.mkdir()
            b = backup_dir / 'Master_CV_Data.20260327_200000_000000.bak.json'
            b.write_text('{"test": 1}', encoding='utf-8')
            mock_orch.master_data_path = str(master_path)

            with stack, app.test_client() as client:
                res  = client.get('/api/master-data/history', query_string={'session_id': sid})
                snap = res.get_json()['snapshots'][0]

        self.assertIn('filename', snap)
        self.assertIn('size',     snap)
        self.assertIn('mtime',    snap)
        self.assertGreater(snap['size'], 0)


# ---------------------------------------------------------------------------
# POST /api/master-data/restore
# ---------------------------------------------------------------------------

class TestMasterDataRestore(unittest.TestCase):

    _BACKUP_CONTENT = {'personal_info': {'name': 'Restored Name'}, 'skills': []}

    def test_restore_from_web_app_format_backup(self):
        """Restoring a web_app-format backup replaces master and reloads orchestrator."""
        app, mock_orch, sid, stack = _make_app()
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text(json.dumps({'personal_info': {'name': 'Old'}}),
                                   encoding='utf-8')
            backup_dir = Path(td) / 'backups'
            backup_dir.mkdir()
            backup_name = 'Master_CV_Data.20260101_120000_000000.bak.json'
            (backup_dir / backup_name).write_text(
                json.dumps(self._BACKUP_CONTENT), encoding='utf-8'
            )
            mock_orch.master_data_path = str(master_path)

            with stack, app.test_client() as client, \
                 patch('subprocess.run'), \
                 patch('scripts.web_app.validate_master_data_file',
                       return_value=ValidationResult(valid=True)):
                res  = client.post('/api/master-data/restore', json={
                    'filename': backup_name, 'session_id': sid,
                })
                data = res.get_json()

            # Filesystem assertions must be inside the tmpdir context
            self.assertEqual(res.status_code, 200)
            self.assertTrue(data['ok'])
            self.assertEqual(data['restored_from'], backup_name)
            self.assertIn('safety_backup', data)
            # Orchestrator in-memory data was updated
            self.assertEqual(mock_orch.master_data['personal_info']['name'], 'Restored Name')
            # Master file on disk was replaced
            on_disk = json.loads(master_path.read_text(encoding='utf-8'))
            self.assertEqual(on_disk['personal_info']['name'], 'Restored Name')

    def test_restore_from_routes_format_backup(self):
        """Restoring a routes-format backup (Master_CV_{ts}Z.json) is also accepted."""
        app, mock_orch, sid, stack = _make_app()
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text('{}', encoding='utf-8')
            backup_dir = Path(td) / 'backups'
            backup_dir.mkdir()
            backup_name = 'Master_CV_20260327T200000Z.json'
            (backup_dir / backup_name).write_text(
                json.dumps(self._BACKUP_CONTENT), encoding='utf-8'
            )
            mock_orch.master_data_path = str(master_path)

            with stack, app.test_client() as client, \
                 patch('subprocess.run'), \
                 patch('scripts.web_app.validate_master_data_file',
                       return_value=ValidationResult(valid=True)):
                res  = client.post('/api/master-data/restore', json={
                    'filename': backup_name, 'session_id': sid,
                })
                data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])

    def test_restore_missing_backup_returns_404(self):
        """Non-existent backup filename returns 404."""
        app, mock_orch, sid, stack = _make_app()
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text('{}', encoding='utf-8')
            (Path(td) / 'backups').mkdir()
            mock_orch.master_data_path = str(master_path)

            with stack, app.test_client() as client:
                res = client.post('/api/master-data/restore', json={
                    'filename': 'Master_CV_Data.20260101_120000_000000.bak.json',
                    'session_id': sid,
                })
        self.assertEqual(res.status_code, 404)

    def test_restore_invalid_filename_returns_400(self):
        """Filename that does not match either backup pattern is rejected."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            for bad in ['../evil.json', 'arbitrary.json', 'Master_CV_Data.json']:
                with self.subTest(filename=bad):
                    res = client.post('/api/master-data/restore', json={
                        'filename': bad, 'session_id': sid,
                    })
                    self.assertEqual(res.status_code, 400)
                    self.assertIn('Invalid backup filename', res.get_json()['error'])

    def test_restore_missing_filename_returns_400(self):
        """Empty or absent filename returns 400."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post('/api/master-data/restore', json={'session_id': sid})
        self.assertEqual(res.status_code, 400)
        self.assertIn('filename', res.get_json()['error'])

    def test_restore_phase_guard_blocks_customization(self):
        """Restore is blocked during the customization phase."""
        app, _, sid, stack = _make_app()
        app.session_registry.get(sid).manager.state['phase'] = 'customization'
        with stack, app.test_client() as client:
            res = client.post('/api/master-data/restore', json={
                'filename': 'Master_CV_Data.20260101_120000_000000.bak.json',
                'session_id': sid,
            })
        self.assertEqual(res.status_code, 409)
        self.assertIn('Master data can only be modified', res.get_json()['error'])

    def test_restore_creates_safety_backup_before_overwrite(self):
        """A safety backup of the current master is created before restoring."""
        app, mock_orch, sid, stack = _make_app()
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            original = {'personal_info': {'name': 'Before Restore'}}
            master_path.write_text(json.dumps(original), encoding='utf-8')
            backup_dir = Path(td) / 'backups'
            backup_dir.mkdir()
            backup_name = 'Master_CV_Data.20260101_120000_000000.bak.json'
            (backup_dir / backup_name).write_text(
                json.dumps(self._BACKUP_CONTENT), encoding='utf-8'
            )
            mock_orch.master_data_path = str(master_path)

            with stack, app.test_client() as client, \
                 patch('subprocess.run'), \
                 patch('scripts.web_app.validate_master_data_file',
                       return_value=ValidationResult(valid=True)):
                res  = client.post('/api/master-data/restore', json={
                    'filename': backup_name, 'session_id': sid,
                })
                safety_name = res.get_json()['safety_backup']

            # Filesystem assertions must be inside the tmpdir context
            safety_path = backup_dir / safety_name
            self.assertTrue(safety_path.exists())
            safety_data = json.loads(safety_path.read_text(encoding='utf-8'))
            self.assertEqual(safety_data['personal_info']['name'], 'Before Restore')

    def test_restore_failure_returns_generic_message(self):
        """Restore errors do not leak internal exception details."""
        app, mock_orch, sid, stack = _make_app()
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'Master_CV_Data.json'
            master_path.write_text('{}', encoding='utf-8')
            backup_dir = Path(td) / 'backups'
            backup_dir.mkdir()
            backup_name = 'Master_CV_Data.20260101_120000_000000.bak.json'
            (backup_dir / backup_name).write_text(
                json.dumps(self._BACKUP_CONTENT), encoding='utf-8'
            )
            mock_orch.master_data_path = str(master_path)

            with stack, app.test_client() as client, \
                 patch('shutil.copy2', side_effect=OSError('copy failed')):
                res = client.post('/api/master-data/restore', json={
                    'filename': backup_name,
                    'session_id': sid,
                })

        self.assertEqual(res.status_code, 500)
        self.assertEqual(
            res.get_json()['error'],
            'Failed to restore the selected backup.',
        )


# ---------------------------------------------------------------------------
# GET /api/master-data/export
# ---------------------------------------------------------------------------

class TestMasterDataExport(unittest.TestCase):

    _MASTER = {'personal_info': {'name': 'Export Test'}, 'skills': ['Python']}

    def test_export_returns_json_attachment(self):
        """Export endpoint returns JSON with Content-Disposition attachment header."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER))):
            res = client.get('/api/master-data/export', query_string={'session_id': sid})

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.content_type, 'application/json')
        cd = res.headers.get('Content-Disposition', '')
        self.assertIn('attachment', cd)
        self.assertIn('Master_CV_Data.json', cd)

    def test_export_body_is_valid_json_of_master(self):
        """Response body is the full master data as valid JSON."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(self._MASTER))):
            res = client.get('/api/master-data/export', query_string={'session_id': sid})

        body = json.loads(res.data)
        self.assertEqual(body['personal_info']['name'], 'Export Test')
        self.assertEqual(body['skills'], ['Python'])

    def test_export_io_error_returns_500(self):
        """File read failure returns 500."""
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client, \
             patch('builtins.open', side_effect=IOError('disk error')):
            res = client.get('/api/master-data/export', query_string={'session_id': sid})

        self.assertEqual(res.status_code, 500)
        self.assertFalse(res.get_json()['ok'])
        self.assertEqual(
            res.get_json()['error'],
            'Failed to export master data.',
        )


if __name__ == '__main__':
    unittest.main()
