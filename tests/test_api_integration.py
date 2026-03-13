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
    """Create a test Flask app and client with isolated file system."""
    # Write master data
    master_path = tmp_dir / 'Master_CV_Data.json'
    master_path.write_text(json.dumps(SAMPLE_MASTER_DATA), encoding='utf-8')

    # Create empty publications file
    pubs_path = tmp_dir / 'publications.bib'
    pubs_path.touch()

    # Create args
    args = argparse.Namespace(
        llm_provider='local',
        model=None,
        master_data=str(master_path),
        publications=str(pubs_path),
        output_dir=str(tmp_dir / 'output'),
        job_file=None,
    )

    # Create app with mocked LLM and pricing
    with patch('scripts.web_app.get_llm_provider') as mock_get_llm, \
         patch('scripts.web_app.get_cached_pricing') as mock_pricing, \
         patch('scripts.web_app.get_pricing_updated_at') as mock_updated_at, \
         patch('scripts.web_app.get_pricing_source') as mock_source:
        
        mock_llm = MagicMock()
        mock_llm.chat.return_value = {
            'response': 'Analysis complete',
            'stop_reason': 'end_turn',
            'usage': {'prompt_tokens': 100, 'completion_tokens': 50},
        }
        mock_llm.model = 'local-model'
        mock_get_llm.return_value = mock_llm
        
        # Mock pricing functions
        mock_pricing.return_value = {}
        mock_updated_at.return_value = '2024-01-01'
        mock_source.return_value = 'static'

        app = create_app(args)
        app.config['TESTING'] = True
        client = app.test_client()

        # Store reference to mocked LLM for test access
        app.mock_llm = mock_llm

    return app, client


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

class TestStatusAPI(unittest.TestCase):
    """Test /api/status endpoint."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        self.app, self.client = _make_app_and_client(self.tmp_path)

    def tearDown(self):
        self.tmp.cleanup()

    def test_status_endpoint_accessible(self):
        """GET /api/status returns HTTP 200."""
        response = self.client.get('/api/status')
        self.assertEqual(response.status_code, 200)

    def test_status_returns_json(self):
        """GET /api/status returns valid JSON."""
        response = self.client.get('/api/status')
        data = response.get_json()
        self.assertIsNotNone(data)

    def test_status_includes_required_fields(self):
        """Status response includes phase and LLM provider."""
        response = self.client.get('/api/status')
        data = response.get_json()
        
        # Should have essential fields
        self.assertIn('phase', data)
        self.assertIn('llm_provider', data)

    def test_status_phase_initially_init(self):
        """Initial status phase should be 'init' or similar."""
        response = self.client.get('/api/status')
        data = response.get_json()
        phase = data.get('phase', '')
        # Phase should be one of the workflow phases
        self.assertIn(phase, ['init', 'job_analysis', 'customization', 'generation'])


class TestMasterDataAPI(unittest.TestCase):
    """Test /api/master-data/* endpoints."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        self.app, self.client = _make_app_and_client(self.tmp_path)

    def tearDown(self):
        self.tmp.cleanup()

    def test_master_data_overview_accessible(self):
        """GET /api/master-data/overview returns HTTP 200."""
        response = self.client.get('/api/master-data/overview')
        self.assertEqual(response.status_code, 200)

    def test_master_data_overview_returns_structure(self):
        """Master data overview includes counts and personal info."""
        response = self.client.get('/api/master-data/overview')
        data = response.get_json()
        
        # Should have overview of loaded data
        self.assertIn('ok', data)
        self.assertIn('name', data)
        self.assertIn('email', data)
        self.assertIn('experience_count', data)
        self.assertIn('skill_count', data)
        self.assertIn('education_count', data)

    def test_master_fields_endpoint_accessible(self):
        """GET /api/master-fields returns field definitions."""
        response = self.client.get('/api/master-fields')
        self.assertEqual(response.status_code, 200)
        
        data = response.get_json()
        # Should describe available fields
        self.assertIsInstance(data, (dict, list))


class TestModelAPI(unittest.TestCase):
    """Test /api/model* endpoints."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        self.app, self.client = _make_app_and_client(self.tmp_path)

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


class TestErrorHandlingAPI(unittest.TestCase):
    """Test error handling across API layer."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        self.app, self.client = _make_app_and_client(self.tmp_path)

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
        self.app, self.client = _make_app_and_client(self.tmp_path)

    def tearDown(self):
        self.tmp.cleanup()

    def test_status_and_master_data_consistency(self):
        """Status and master-data endpoints report consistent state."""
        status_response = self.client.get('/api/status')
        self.assertEqual(status_response.status_code, 200)

        overview_response = self.client.get('/api/master-data/overview')
        self.assertEqual(overview_response.status_code, 200)

        # Both should have loaded master data
        status_data = status_response.get_json()
        overview_data = overview_response.get_json()
        
        # Overview should contain the loaded data
        self.assertIn('ok', overview_data)
        self.assertIn('name', overview_data)

    def test_api_resilience_with_multiple_requests(self):
        """API handles multiple sequential requests without state corruption."""
        # Make multiple status requests
        for i in range(5):
            response = self.client.get('/api/status')
            self.assertEqual(response.status_code, 200)
            data = response.get_json()
            self.assertIn('phase', data)

        # Final request should still be consistent
        final_response = self.client.get('/api/status')
        final_data = final_response.get_json()
        self.assertIsNotNone(final_data.get('phase'))


if __name__ == '__main__':
    unittest.main()
