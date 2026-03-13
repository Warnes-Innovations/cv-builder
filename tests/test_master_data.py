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
import unittest
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


def _make_app():
    mock_llm          = MagicMock()
    mock_orchestrator = MagicMock()
    mock_orchestrator.master_data      = {'experience': [], 'skills': []}
    mock_orchestrator.master_data_path = '/tmp/fake_master.json'

    mock_conversation = MagicMock()
    mock_conversation.state = {'phase': 'refinement'}

    with patch('scripts.web_app.get_llm_provider', return_value=mock_llm), \
         patch('scripts.web_app.CVOrchestrator', return_value=mock_orchestrator), \
         patch('scripts.web_app.ConversationManager', return_value=mock_conversation):
        app = create_app(_make_args())

    app.config['TESTING'] = True
    return app, mock_orchestrator


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
        app, _ = _make_app()
        master_json = json.dumps(self._MASTER)

        with app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)):
            res  = client.get('/api/master-data/overview')
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
        app, _ = _make_app()
        master = dict(self._MASTER)
        master['skills'] = {'ML': ['scikit-learn', 'PyTorch'], 'Languages': ['Python', 'R', 'Go']}
        with app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps(master))):
            data = client.get('/api/master-data/overview').get_json()

        self.assertEqual(data['skill_count'], 5)

    def test_overview_missing_sections_return_zeros(self):
        """Minimal master data (empty doc) yields zero counts and empty strings."""
        app, _ = _make_app()
        with app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=json.dumps({}))):
            data = client.get('/api/master-data/overview').get_json()

        self.assertTrue(data['ok'])
        self.assertEqual(data['name'],             '')
        self.assertEqual(data['experience_count'], 0)
        self.assertEqual(data['skill_count'],      0)

    def test_overview_io_error_returns_500(self):
        """File read failure returns 500 with ok=False."""
        app, _ = _make_app()
        with app.test_client() as client, \
             patch('builtins.open', side_effect=IOError('disk error')):
            res  = client.get('/api/master-data/overview')
            data = res.get_json()

        self.assertEqual(res.status_code, 500)
        self.assertFalse(data['ok'])


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
        app, _ = _make_app()
        master_json = json.dumps(self._EXISTING_MASTER)

        written = {}

        def fake_open(path, mode='r', **kw):
            if 'w' in mode:
                m = mock_open()()
                # capture what json.dump would write
                return m
            return mock_open(read_data=master_json)()

        with app.test_client() as client, \
             patch('builtins.open', side_effect=fake_open), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/update-achievement',
                               json={'id': 'sa_001', 'title': 'New Title', 'importance': 9})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'updated')
        # Verify json.dump was called with the updated achievement
        dumped_master = mock_dump.call_args[0][0]
        updated_ach = next(a for a in dumped_master['selected_achievements'] if a['id'] == 'sa_001')
        self.assertEqual(updated_ach['title'],      'New Title')
        self.assertEqual(updated_ach['importance'], 9)

    def test_add_new_achievement(self):
        """POSTing a new id appends the achievement."""
        app, _ = _make_app()
        master_json = json.dumps({'selected_achievements': []})

        with app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/update-achievement',
                               json={'id': 'sa_new', 'title': 'Brand new achievement'})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'added')
        dumped_master = mock_dump.call_args[0][0]
        self.assertEqual(len(dumped_master['selected_achievements']), 1)
        self.assertEqual(dumped_master['selected_achievements'][0]['title'], 'Brand new achievement')

    def test_missing_id_returns_400(self):
        """Missing or empty id field returns 400."""
        app, _ = _make_app()
        with app.test_client() as client:
            res = client.post('/api/master-data/update-achievement',
                              json={'title': 'No id here'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('id', res.get_json()['error'])


# ---------------------------------------------------------------------------
# POST /api/master-data/update-summary
# ---------------------------------------------------------------------------

class TestMasterDataUpdateSummary(unittest.TestCase):

    def test_update_existing_summary_key(self):
        """POSTing an existing key replaces its text."""
        app, _ = _make_app()
        master_json = json.dumps({'professional_summaries': {'ml': 'Old text'}})

        with app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/update-summary',
                               json={'key': 'ml', 'text': 'New text!'})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'updated')
        dumped = mock_dump.call_args[0][0]
        self.assertEqual(dumped['professional_summaries']['ml'], 'New text!')

    def test_add_new_summary_key(self):
        """POSTing a new key adds the summary variant."""
        app, _ = _make_app()
        master_json = json.dumps({'professional_summaries': {}})

        with app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/update-summary',
                               json={'key': 'leadership', 'text': 'Led large teams.'})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        self.assertTrue(data['ok'])
        self.assertEqual(data['action'], 'added')
        dumped = mock_dump.call_args[0][0]
        self.assertIn('leadership', dumped['professional_summaries'])

    def test_missing_key_or_text_returns_400(self):
        """Missing key or text field returns 400."""
        app, _ = _make_app()
        with app.test_client() as client:
            res_no_key  = client.post('/api/master-data/update-summary', json={'text': 'hi'})
            res_no_text = client.post('/api/master-data/update-summary', json={'key': 'k'})

        self.assertEqual(res_no_key.status_code,  400)
        self.assertEqual(res_no_text.status_code, 400)

    def test_list_summaries_migrated_to_dict(self):
        """If professional_summaries is stored as a list, it is migrated to a dict."""
        app, _ = _make_app()
        master_json = json.dumps({'professional_summaries': ['Old summary']})

        with app.test_client() as client, \
             patch('builtins.open', mock_open(read_data=master_json)), \
             patch('json.dump') as mock_dump, \
             patch('subprocess.run'):

            res  = client.post('/api/master-data/update-summary',
                               json={'key': 'new_key', 'text': 'New summary text'})
            data = res.get_json()

        self.assertEqual(res.status_code, 200)
        dumped = mock_dump.call_args[0][0]
        self.assertIsInstance(dumped['professional_summaries'], dict)
        self.assertIn('new_key', dumped['professional_summaries'])


if __name__ == '__main__':
    unittest.main()
