# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Integration tests for key API workflows.

Tests full request/response cycles for primary use cases:
  - Status and initialization
  - Master data overview
  - Model selection and testing
  - Job submission flows

These tests verify that Flask routes, business logic, and data persistence
work together correctly end-to-end.
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
# Test Fixtures
# ---------------------------------------------------------------------------

SAMPLE_MASTER_DATA = {
    'personal_info': {
        'name': 'Jane Doe',
        'title': 'Senior Data Scientist',
        'contact': {
            'email': 'jane@example.com',
            'phone': '555-123-4567',
            'linkedin': 'linkedin.com/in/janedoe',
            'github': 'github.com/janedoe',
            'address': {'city': 'Boston', 'state': 'MA'},
        },
    },
    'experiences': [
        {
            'id': 'exp_001',
            'title': 'Senior Data Scientist',
            'company': 'TechCorp',
            'location': 'Boston, MA',
            'start_date': '2020-01',
            'end_date': None,
            'current': True,
            'achievements': [
                'Built ML pipeline processing 1M+ records/day',
                'Reduced inference latency by 60%',
                'Led team of 3 data engineers',
            ],
        },
    ],
    'education': [
        {
            'id': 'edu_001',
            'degree': 'PhD',
            'field': 'Statistics',
            'institution': 'MIT',
            'year': 2017,
        },
    ],
    'skills': [
        {'name': 'Python', 'category': 'Programming', 'years': 8},
        {'name': 'R', 'category': 'Programming', 'years': 5},
        {'name': 'TensorFlow', 'category': 'ML Frameworks', 'years': 4},
    ],
    'awards': [],
    'publications': [],
    'summaries': [
        {
            'id': 'summary_default',
            'summary': 'Senior data scientist with expertise in machine learning.',
            'audience': ['general'],
        },
    ],
}


def _make_app_and_client(tmp_dir: Path):
    """Create a test Flask app and client with isolated file system.

    Returns (app, session_id, stack) where the ExitStack keeps the LLM
    and pricing patches active until stack.close() is called.
    """
    master_path = tmp_dir / 'Master_CV_Data.json'
    master_path.write_text(json.dumps(SAMPLE_MASTER_DATA), encoding='utf-8')

    pubs_path = tmp_dir / 'publications.bib'
    pubs_path.touch()

    args = argparse.Namespace(
        llm_provider='local',
        model=None,
        master_data=str(master_path),
        publications=str(pubs_path),
        output_dir=str(tmp_dir / 'output'),
        job_file=None,
    )

    mock_llm = MagicMock()
    mock_llm.chat.return_value = {
        'response': 'Analysis complete',
        'stop_reason': 'end_turn',
        'usage': {'prompt_tokens': 100, 'completion_tokens': 50},
    }
    mock_llm.model = 'local-model'

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.get_cached_pricing', return_value={}))
    stack.enter_context(patch('scripts.web_app.get_pricing_updated_at', return_value='2024-01-01'))
    stack.enter_context(patch('scripts.web_app.get_pricing_source', return_value='static'))

    app = create_app(args)
    app.config['TESTING'] = True
    app.mock_llm = mock_llm

    with app.test_client() as tmp_client:
        session_id = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, session_id, stack


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

class TestStatusAPI(unittest.TestCase):
    """Test /api/status endpoint."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        self.app, self.session_id, self._stack = _make_app_and_client(self.tmp_path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def test_status_endpoint_accessible(self):
        """GET /api/status returns HTTP 200."""
        response = self.client.get('/api/status', query_string={'session_id': self.session_id})
        self.assertEqual(response.status_code, 200)

    def test_status_returns_json(self):
        """GET /api/status returns valid JSON."""
        response = self.client.get('/api/status', query_string={'session_id': self.session_id})
        data = response.get_json()
        self.assertIsNotNone(data)

    def test_status_includes_required_fields(self):
        """Status response includes phase and LLM provider."""
        response = self.client.get('/api/status', query_string={'session_id': self.session_id})
        data = response.get_json()
        self.assertIn('phase', data)
        self.assertIn('llm_provider', data)

    def test_status_phase_initially_init(self):
        """Initial status phase should be 'init' or similar."""
        response = self.client.get('/api/status', query_string={'session_id': self.session_id})
        data = response.get_json()
        phase = data.get('phase', '')
        self.assertIn(phase, ['init', 'job_analysis', 'customization', 'generation'])


class TestMasterDataAPI(unittest.TestCase):
    """Test /api/master-data/* endpoints."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        self.app, self.session_id, self._stack = _make_app_and_client(self.tmp_path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def test_master_data_overview_accessible(self):
        """GET /api/master-data/overview returns HTTP 200."""
        response = self.client.get(
            '/api/master-data/overview',
            query_string={'session_id': self.session_id},
        )
        self.assertEqual(response.status_code, 200)

    def test_master_data_overview_returns_structure(self):
        """Master data overview includes counts and personal info."""
        response = self.client.get(
            '/api/master-data/overview',
            query_string={'session_id': self.session_id},
        )
        data = response.get_json()
        self.assertIn('ok', data)
        self.assertIn('name', data)
        self.assertIn('email', data)
        self.assertIn('experience_count', data)
        self.assertIn('skill_count', data)
        self.assertIn('education_count', data)

    def test_master_fields_endpoint_accessible(self):
        """GET /api/master-fields returns field definitions."""
        response = self.client.get(
            '/api/master-fields',
            query_string={'session_id': self.session_id},
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data, (dict, list))


class TestModelAPI(unittest.TestCase):
    """Test /api/model* endpoints."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        self.app, _sid, self._stack = _make_app_and_client(self.tmp_path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def test_get_model_endpoint_accessible(self):
        """GET /api/model returns current model."""
        response = self.client.get('/api/model')
        self.assertEqual(response.status_code, 200)

    def test_get_model_returns_model_info(self):
        """Model endpoint returns model information."""
        response = self.client.get('/api/model')
        data = response.get_json()
        
        # Should include model identifier
        self.assertIsNotNone(data)

    def test_get_model_ignores_stale_optional_session(self):
        """GET /api/model still works when the URL has a stale session_id."""
        response = self.client.get('/api/model?session_id=deadbeef&owner_token=test-token')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsNotNone(data)
        self.assertIn('provider', data)

    def test_model_catalog_endpoint_accessible(self):
        """GET /api/model-catalog returns available models."""
        response = self.client.get('/api/model-catalog')
        # May return 200 or 502 depending on catalog availability
        self.assertIn(response.status_code, [200, 502, 503])

    def test_model_catalog_valid_response(self):
        """Model catalog returns structured response."""
        response = self.client.get('/api/model-catalog')
        if response.status_code == 200:
            data = response.get_json()
            # Should be a list or dict of models
            self.assertIsNotNone(data)

    def test_model_switch_error_uses_selected_provider_label(self):
        """GitHub model probe failures should not surface the OpenAI gateway label."""
        fake_client = MagicMock()
        fake_client.chat.side_effect = RuntimeError(
            'Authentication failed with OpenAI. Check that your API key is valid and has not expired.'
        )

        with patch('scripts.web_app.get_llm_provider', return_value=fake_client):
            response = self.client.post('/api/model', json={
                'provider': 'github',
                'model': 'claude-3-haiku',
            })

        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn('GitHub Models', data['error'])
        self.assertNotIn('with OpenAI', data['error'])

    def test_model_switch_auth_failure_not_reported_as_model_unavailable(self):
        """Auth probe failures should be reported as authentication errors."""
        fake_client = MagicMock()
        fake_client.chat.side_effect = RuntimeError(
            'Authentication failed with OpenAI. Check that your API key is valid and has not expired.'
        )

        with patch('routes.auth_routes.get_llm_provider', return_value=fake_client):
            response = self.client.post('/api/model', json={
                'provider': 'github',
                'model': 'gpt-4o',
            })

        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn('Authentication failed for provider', data['error'])
        self.assertNotIn('not currently available', data['error'])


class TestErrorHandlingAPI(unittest.TestCase):
    """Test error handling across API layer."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        self.app, _sid, self._stack = _make_app_and_client(self.tmp_path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def test_nonexistent_endpoint_returns_404(self):
        """GET /api/nonexistent returns 404."""
        response = self.client.get('/api/nonexistent')
        self.assertEqual(response.status_code, 404)

    def test_invalid_json_body_handling(self):
        """API handles malformed JSON gracefully."""
        # This tests API robustness
        response = self.client.post(
            '/api/status',
            data='invalid',
            content_type='application/json',
        )
        # Should not crash
        self.assertIsNotNone(response)


class TestMultipleEndpointsIntegration(unittest.TestCase):
    """Test integration between multiple API endpoints."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        self.app, self.session_id, self._stack = _make_app_and_client(self.tmp_path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def test_status_and_master_data_consistency(self):
        """Status and master-data endpoints report consistent state."""
        status_response = self.client.get(
            '/api/status', query_string={'session_id': self.session_id}
        )
        self.assertEqual(status_response.status_code, 200)

        overview_response = self.client.get(
            '/api/master-data/overview', query_string={'session_id': self.session_id}
        )
        self.assertEqual(overview_response.status_code, 200)

        overview_data = overview_response.get_json()
        self.assertIn('ok', overview_data)
        self.assertIn('name', overview_data)

    def test_api_resilience_with_multiple_requests(self):
        """API handles multiple sequential requests without state corruption."""
        for i in range(5):
            response = self.client.get(
                '/api/status', query_string={'session_id': self.session_id}
            )
            self.assertEqual(response.status_code, 200)
            data = response.get_json()
            self.assertIn('phase', data)

        final_response = self.client.get(
            '/api/status', query_string={'session_id': self.session_id}
        )
        final_data = final_response.get_json()
        self.assertIsNotNone(final_data.get('phase'))


class TestStartupSessionRedirect(unittest.TestCase):
    """Test startup behavior when the server preloads a job file."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)

        master_path = self.tmp_path / 'Master_CV_Data.json'
        master_path.write_text(json.dumps(SAMPLE_MASTER_DATA), encoding='utf-8')

        pubs_path = self.tmp_path / 'publications.bib'
        pubs_path.touch()

        job_path = self.tmp_path / 'target_role_2026-03-18.txt'
        job_path.write_text(
            'Target Role\nExample Co\nBuild ML systems.',
            encoding='utf-8',
        )

        args = argparse.Namespace(
            llm_provider='local',
            model=None,
            master_data=str(master_path),
            publications=str(pubs_path),
            output_dir=str(self.tmp_path / 'output'),
            job_file=str(job_path),
        )

        mock_llm = MagicMock()
        mock_llm.model = 'local-model'

        self._stack = ExitStack()
        self._stack.enter_context(
            patch('scripts.web_app.get_llm_provider', return_value=mock_llm)
        )
        self._stack.enter_context(
            patch('scripts.web_app.get_cached_pricing', return_value={})
        )
        self._stack.enter_context(
            patch('scripts.web_app.get_pricing_updated_at', return_value='2024-01-01')
        )
        self._stack.enter_context(
            patch('scripts.web_app.get_pricing_source', return_value='static')
        )

        self.app = create_app(args)
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def test_root_redirects_to_preloaded_session(self):
        response = self.client.get('/', follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        location = response.headers.get('Location', '')
        self.assertTrue(location.startswith('/?session='))


if __name__ == '__main__':
    unittest.main()
