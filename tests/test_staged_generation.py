# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Tests for Phase 1 staged generation contract (GAP-20).

Tests:
- generation_state initialization in ConversationManager
- generation_state backward-compat in load_session
- GET /api/cv/generation-state — idle state and populated state
- POST /api/cv/generate-preview — guards, happy path, fallback
- POST /api/cv/layout-refine — phase guard, happy path, error path
- POST /api/cv/confirm-layout — no-preview guard, happy path, already-confirmed guard
- POST /api/cv/generate-final — not-confirmed guard, happy path
- generation_state persisted across session save/load
"""

import argparse
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from contextlib import ExitStack

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.web_app import create_app
from utils.conversation_manager import ConversationManager
from utils.cv_orchestrator import CVOrchestrator
from utils.llm_client import LLMClient
from utils.config import get_config


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

MINIMAL_MASTER_DATA = {
    'personal_info': {
        'name': 'Test User',
        'title': 'Engineer',
        'contact': {
            'email': 'test@example.com',
            'phone': '5555551234',
            'linkedin': '',
            'github': '',
            'address': {'city': 'Boston', 'state': 'MA'},
        },
    },
    'experiences': [
        {
            'company': 'Acme', 'title': 'Engineer',
            'start': '2020-01', 'end': '2023-12', 'bullets': ['Did things'],
        },
    ],
    'education': [{'degree': 'BS', 'institution': 'MIT', 'year': '2015'}],
    'skills': [{'name': 'Python', 'category': 'Programming'}],
    'achievements': [],
    'awards': [],
    'publications': [],
    'summaries': [{'summary': 'Experienced engineer.', 'audience': []}],
}

MINIMAL_JOB_ANALYSIS = {
    'job_title':   'Software Engineer',
    'company':     'Acme',
    'key_requirements': ['Python'],
    'nice_to_have': [],
    'keywords': ['Python'],
    'summary': 'Build things.',
}

MINIMAL_CUSTOMIZATIONS = {
    'experiences':    [],
    'skills':         [{'name': 'Python', 'action': 'Emphasize', 'confidence': 'High', 'reasoning': 'req'}],
    'achievements':   [],
    'publications':   [],
    'summary_focus':  None,
}


def _make_app_and_client(tmp_dir: Path):
    """Return (app, session_id, stack) with LLM and pricing patched."""
    master_path = tmp_dir / 'Master_CV_Data.json'
    master_path.write_text(json.dumps(MINIMAL_MASTER_DATA), encoding='utf-8')

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
    mock_llm.model = 'local-model'

    stack = ExitStack()
    stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=mock_llm))
    stack.enter_context(patch('scripts.web_app.get_cached_pricing', return_value={}))
    stack.enter_context(patch('scripts.web_app.get_pricing_updated_at', return_value='2024-01-01'))
    stack.enter_context(patch('scripts.web_app.get_pricing_source', return_value='static'))

    app = create_app(args)
    app.config['TESTING'] = True

    with app.test_client() as tmp_client:
        session_id = tmp_client.post('/api/sessions/new').get_json()['session_id']

    return app, session_id, stack


def _seed_session_with_analysis(client, session_id: str):
    """Seed session state with job_analysis and customizations via internal state."""
    # Use the action endpoint to submit a job description and run analysis
    # For unit-level speed we patch the state directly via /api/status side-effects
    # by injecting state through the session registry.
    pass  # Used only for Flask-level tests that accept mock state injection.


# ---------------------------------------------------------------------------
# Unit tests — ConversationManager state initialization
# ---------------------------------------------------------------------------

class TestGenerationStateInit(unittest.TestCase):
    """generation_state is present in a freshly created ConversationManager."""

    def setUp(self):
        self.config = get_config()
        self.mock_llm = MagicMock(spec=LLMClient)
        self.tmp = tempfile.TemporaryDirectory()
        tmp = Path(self.tmp.name)

        master_path = tmp / 'Master_CV_Data.json'
        master_path.write_text(json.dumps(MINIMAL_MASTER_DATA))
        pubs_path = tmp / 'publications.bib'
        pubs_path.touch()

        self.orchestrator = CVOrchestrator(
            master_data_path=str(master_path),
            publications_path=str(pubs_path),
            output_dir=str(tmp),
            llm_client=self.mock_llm,
        )
        self.manager = ConversationManager(
            orchestrator=self.orchestrator,
            llm_client=self.mock_llm,
            config=self.config,
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_generation_state_key_present(self):
        """generation_state key exists in fresh state dict."""
        self.assertIn('generation_state', self.manager.state)

    def test_generation_state_initially_empty_dict(self):
        """generation_state is an empty dict on init."""
        self.assertEqual(self.manager.state['generation_state'], {})


class TestGenerationStateLoadBackwardCompat(unittest.TestCase):
    """load_session adds generation_state when it is absent from old session files."""

    def setUp(self):
        self.config = get_config()
        self.mock_llm = MagicMock(spec=LLMClient)
        self.tmp = tempfile.TemporaryDirectory()
        tmp = Path(self.tmp.name)

        master_path = tmp / 'Master_CV_Data.json'
        master_path.write_text(json.dumps(MINIMAL_MASTER_DATA))
        pubs_path = tmp / 'publications.bib'
        pubs_path.touch()

        self.orchestrator = CVOrchestrator(
            master_data_path=str(master_path),
            publications_path=str(pubs_path),
            output_dir=str(tmp),
            llm_client=self.mock_llm,
        )
        self.manager = ConversationManager(
            orchestrator=self.orchestrator,
            llm_client=self.mock_llm,
            config=self.config,
        )
        self.sess_dir = tmp / 'session'
        self.sess_dir.mkdir()
        self.manager.session_dir = self.sess_dir
        self.manager.session_id = 'test_session'

    def tearDown(self):
        self.tmp.cleanup()

    def _write_old_session(self, extra_state: dict | None = None):
        """Write a session.json without generation_state (simulates old format)."""
        state = {
            'phase': 'init',
            'position_name': None,
            'job_description': None,
            'job_analysis': None,
            'post_analysis_questions': [],
            'post_analysis_answers': {},
            'customizations': None,
            'generated_files': None,
            'pending_rewrites': None,
            'persuasion_warnings': [],
            'generation_progress': [],
            'approved_rewrites': [],
            'rewrite_audit': [],
            'approved_rewrites': [],
            'rewrite_audit': [],
            'achievement_rewrite_log': [],
        }
        if extra_state:
            state.update(extra_state)
        session_data = {
            'session_id': 'test_session',
            'timestamp': '2025-01-01T00:00:00',
            'state': state,
            'conversation_history': [],
        }
        (self.sess_dir / 'session.json').write_text(json.dumps(session_data))

    def test_load_session_adds_generation_state_when_absent(self):
        """load_session backfills generation_state={} when the key is missing."""
        self._write_old_session()
        self.manager.load_session(str(self.sess_dir / 'session.json'))
        self.assertIn('generation_state', self.manager.state)
        self.assertEqual(self.manager.state['generation_state'], {})

    def test_load_session_preserves_existing_generation_state(self):
        """load_session does not overwrite a generation_state that is already set."""
        existing_gen = {'phase': 'confirmed', 'layout_confirmed': True}
        self._write_old_session({'generation_state': existing_gen})
        self.manager.load_session(str(self.sess_dir / 'session.json'))
        self.assertEqual(self.manager.state['generation_state'], existing_gen)


class TestGenerationStatePersistence(unittest.TestCase):
    """generation_state survives a save/load round-trip."""

    def setUp(self):
        self.config = get_config()
        self.mock_llm = MagicMock(spec=LLMClient)
        self.tmp = tempfile.TemporaryDirectory()
        tmp = Path(self.tmp.name)

        master_path = tmp / 'Master_CV_Data.json'
        master_path.write_text(json.dumps(MINIMAL_MASTER_DATA))
        pubs_path = tmp / 'publications.bib'
        pubs_path.touch()

        self.orchestrator = CVOrchestrator(
            master_data_path=str(master_path),
            publications_path=str(pubs_path),
            output_dir=str(tmp),
            llm_client=self.mock_llm,
        )
        self.manager = ConversationManager(
            orchestrator=self.orchestrator,
            llm_client=self.mock_llm,
            config=self.config,
        )
        self.sess_dir = tmp / 'session'
        self.sess_dir.mkdir()
        self.manager.session_dir = self.sess_dir
        self.manager.session_id = 'persist_test'

    def tearDown(self):
        self.tmp.cleanup()

    def test_generation_state_round_trips(self):
        """generation_state is preserved identically after save then load."""
        self.manager.state['generation_state'] = {
            'phase':            'confirmed',
            'layout_confirmed': True,
            'confirmed_at':     '2025-01-01T12:00:00',
            'preview_html':     '<html>test</html>',
        }
        self.manager._save_session()
        self.manager.state['generation_state'] = {}  # reset in-memory
        self.manager.load_session(str(self.sess_dir / 'session.json'))
        gen = self.manager.state['generation_state']
        self.assertEqual(gen['phase'], 'confirmed')
        self.assertTrue(gen['layout_confirmed'])
        self.assertEqual(gen['preview_html'], '<html>test</html>')


# ---------------------------------------------------------------------------
# Flask-level tests — /api/cv/* endpoints
# ---------------------------------------------------------------------------

class TestGenerationStateEndpoint(unittest.TestCase):
    """GET /api/cv/generation-state returns expected shape."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.app, self.session_id, self._stack = _make_app_and_client(Path(self.tmp.name))
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def test_returns_200(self):
        resp = self.client.get(
            '/api/cv/generation-state',
            query_string={'session_id': self.session_id},
        )
        self.assertEqual(resp.status_code, 200)

    def test_idle_phase_initially(self):
        data = self.client.get(
            '/api/cv/generation-state',
            query_string={'session_id': self.session_id},
        ).get_json()
        self.assertEqual(data['phase'], 'idle')
        self.assertFalse(data['preview_available'])
        self.assertFalse(data['layout_confirmed'])

    def test_required_keys_present(self):
        data = self.client.get(
            '/api/cv/generation-state',
            query_string={'session_id': self.session_id},
        ).get_json()
        for key in ('ok', 'phase', 'preview_available', 'layout_confirmed',
                    'page_count_estimate', 'page_length_warning', 'ats_score',
                    'layout_instructions_count', 'final_generated_at'):
            self.assertIn(key, data, f"Missing key: {key}")

    def test_returns_cached_ats_score_when_present(self):
        entry = self.app.session_registry.get(self.session_id)
        entry.manager.state['generation_state'] = {
            'phase': 'layout_review',
            'ats_score': {'overall': 81, 'basis': 'review_checkpoint'},
        }

        data = self.client.get(
            '/api/cv/generation-state',
            query_string={'session_id': self.session_id},
        ).get_json()

        self.assertEqual(data['ats_score'], {'overall': 81, 'basis': 'review_checkpoint'})


class TestGeneratePreviewEndpoint(unittest.TestCase):
    """POST /api/cv/generate-preview guards and happy path."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.app, self.session_id, self._stack = _make_app_and_client(Path(self.tmp.name))
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def _seed_job_analysis(self):
        """Inject job_analysis into the session via the session registry."""
        entry = self.app.session_registry.get(self.session_id)
        entry.manager.state['job_analysis']   = MINIMAL_JOB_ANALYSIS
        entry.manager.state['customizations'] = MINIMAL_CUSTOMIZATIONS

    def test_returns_400_without_job_analysis(self):
        resp = self.client.post(
            '/api/cv/generate-preview',
            json={'session_id': self.session_id},
        )
        self.assertEqual(resp.status_code, 400)

    def test_returns_html_after_mock_render(self):
        self._seed_job_analysis()
        with patch(
            'utils.cv_orchestrator.CVOrchestrator.render_html_preview',
            return_value='<html><body>Preview</body></html>',
        ):
            resp = self.client.post(
                '/api/cv/generate-preview',
                json={'session_id': self.session_id},
            )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data['ok'])
        self.assertIn('<html>', data['html'])
        self.assertIn('preview_request_id', data)

    def test_generation_state_updated_after_preview(self):
        self._seed_job_analysis()
        with patch(
            'utils.cv_orchestrator.CVOrchestrator.render_html_preview',
            return_value='<html><body>Preview</body></html>',
        ):
            self.client.post('/api/cv/generate-preview', json={'session_id': self.session_id})
        data = self.client.get(
            '/api/cv/generation-state',
            query_string={'session_id': self.session_id},
        ).get_json()
        self.assertEqual(data['phase'], 'layout_review')
        self.assertTrue(data['preview_available'])

    def test_preview_uses_canonical_spell_audit_before_legacy_key(self):
        self._seed_job_analysis()
        entry = self.app.session_registry.get(self.session_id)
        entry.manager.state['spell_audit'] = [{'original': 'teh', 'final': 'the', 'outcome': 'accept'}]
        entry.manager.state['spell_check'] = {'audit': [{'original': 'teh', 'final': 'teh', 'outcome': 'ignore'}]}

        with patch(
            'utils.cv_orchestrator.CVOrchestrator.render_html_preview',
            return_value='<html><body>Preview</body></html>',
        ) as render_preview:
            resp = self.client.post(
                '/api/cv/generate-preview',
                json={'session_id': self.session_id},
            )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            render_preview.call_args.kwargs['spell_audit'],
            [{'original': 'teh', 'final': 'the', 'outcome': 'accept'}],
        )

    def test_render_failure_falls_back_to_404_when_no_file(self):
        """When render_html_preview raises and no HTML file exists, return 404."""
        self._seed_job_analysis()
        with patch(
            'utils.cv_orchestrator.CVOrchestrator.render_html_preview',
            side_effect=RuntimeError('template error'),
        ):
            resp = self.client.post(
                '/api/cv/generate-preview',
                json={'session_id': self.session_id},
            )
        self.assertEqual(resp.status_code, 404)


class TestLayoutRefineEndpoint(unittest.TestCase):
    """POST /api/cv/layout-refine phase guard and happy path."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.app, self.session_id, self._stack = _make_app_and_client(Path(self.tmp.name))
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def _seed_preview(self):
        """Put the session into layout_review phase with preview HTML."""
        entry = self.app.session_registry.get(self.session_id)
        entry.manager.state['generation_state'] = {
            'phase':        'layout_review',
            'preview_html': '<html><body>Draft CV</body></html>',
            'layout_confirmed': False,
            'layout_instructions': [],
        }

    def test_returns_400_if_not_in_preview_phase(self):
        resp = self.client.post(
            '/api/cv/layout-refine',
            json={'session_id': self.session_id, 'instruction': 'Move skills up'},
        )
        self.assertEqual(resp.status_code, 400)

    def test_returns_400_if_instruction_empty(self):
        self._seed_preview()
        resp = self.client.post(
            '/api/cv/layout-refine',
            json={'session_id': self.session_id, 'instruction': '   '},
        )
        self.assertEqual(resp.status_code, 400)

    def test_happy_path_returns_updated_html(self):
        self._seed_preview()
        with patch(
            'utils.cv_orchestrator.CVOrchestrator.apply_layout_instruction',
            return_value={
                'html':       '<html><body>Updated CV</body></html>',
                'summary':    'Moved skills section',
                'confidence': 0.9,
            },
        ):
            resp = self.client.post(
                '/api/cv/layout-refine',
                json={'session_id': self.session_id, 'instruction': 'Move skills up'},
            )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data['ok'])
        self.assertIn('Updated CV', data['html'])
        self.assertEqual(data['summary'], 'Moved skills section')

    def test_instruction_appended_to_history(self):
        self._seed_preview()
        with patch(
            'utils.cv_orchestrator.CVOrchestrator.apply_layout_instruction',
            return_value={'html': '<html>X</html>', 'summary': 'done', 'confidence': 1.0},
        ):
            self.client.post(
                '/api/cv/layout-refine',
                json={'session_id': self.session_id, 'instruction': 'Remove skills'},
            )
        gen_data = self.client.get(
            '/api/cv/generation-state',
            query_string={'session_id': self.session_id},
        ).get_json()
        self.assertEqual(gen_data['layout_instructions_count'], 1)

    def test_orchestrator_error_returns_ok_false(self):
        self._seed_preview()
        with patch(
            'utils.cv_orchestrator.CVOrchestrator.apply_layout_instruction',
            return_value={'error': 'ambiguous instruction', 'question': 'Which section?'},
        ):
            resp = self.client.post(
                '/api/cv/layout-refine',
                json={'session_id': self.session_id, 'instruction': 'move stuff'},
            )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertFalse(data['ok'])
        self.assertIn('error', data)


class TestConfirmLayoutEndpoint(unittest.TestCase):
    """POST /api/cv/confirm-layout guards and happy path."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.app, self.session_id, self._stack = _make_app_and_client(Path(self.tmp.name))
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def _seed_preview(self, already_confirmed: bool = False):
        entry = self.app.session_registry.get(self.session_id)
        entry.manager.state['generation_state'] = {
            'phase':        'confirmed' if already_confirmed else 'layout_review',
            'preview_html': '<html>CV draft</html>',
            'layout_confirmed': already_confirmed,
        }

    def test_returns_400_without_preview(self):
        resp = self.client.post(
            '/api/cv/confirm-layout',
            json={'session_id': self.session_id},
        )
        self.assertEqual(resp.status_code, 400)

    def test_returns_400_if_already_confirmed(self):
        self._seed_preview(already_confirmed=True)
        resp = self.client.post(
            '/api/cv/confirm-layout',
            json={'session_id': self.session_id},
        )
        self.assertEqual(resp.status_code, 400)

    def test_happy_path_sets_confirmed(self):
        self._seed_preview()
        resp = self.client.post(
            '/api/cv/confirm-layout',
            json={'session_id': self.session_id},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data['ok'])
        self.assertTrue(data['confirmed'])
        self.assertIn('confirmed_at', data)
        self.assertIn('hash', data)

    def test_confirm_updates_generation_state(self):
        self._seed_preview()
        self.client.post('/api/cv/confirm-layout', json={'session_id': self.session_id})
        gen_data = self.client.get(
            '/api/cv/generation-state',
            query_string={'session_id': self.session_id},
        ).get_json()
        self.assertEqual(gen_data['phase'], 'confirmed')
        self.assertTrue(gen_data['layout_confirmed'])


class TestGenerateFinalEndpoint(unittest.TestCase):
    """POST /api/cv/generate-final guards and happy path."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        self.app, self.session_id, self._stack = _make_app_and_client(self.tmp_path)
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

        # Make an output dir so the guard passes
        self.output_dir = self.tmp_path / 'output'
        self.output_dir.mkdir(exist_ok=True)

    def tearDown(self):
        self.tmp.cleanup()

    def _seed_confirmed_layout(self):
        entry = self.app.session_registry.get(self.session_id)
        entry.manager.state['generation_state'] = {
            'phase':            'confirmed',
            'preview_html':     '<html>Confirmed CV</html>',
            'layout_confirmed': True,
            'confirmed_at':     '2025-01-01T12:00:00',
        }
        entry.manager.state['generated_files'] = {
            'output_dir': str(self.output_dir),
        }

    def test_returns_400_when_layout_not_confirmed(self):
        resp = self.client.post(
            '/api/cv/generate-final',
            json={'session_id': self.session_id},
        )
        self.assertEqual(resp.status_code, 400)

    def test_returns_404_when_no_generated_files(self):
        entry = self.app.session_registry.get(self.session_id)
        entry.manager.state['generation_state'] = {
            'phase': 'confirmed', 'layout_confirmed': True,
            'preview_html': '<html>X</html>',
        }
        # generated_files is empty — no output_dir
        resp = self.client.post(
            '/api/cv/generate-final',
            json={'session_id': self.session_id},
        )
        self.assertEqual(resp.status_code, 404)

    def test_happy_path_calls_orchestrator_and_returns_outputs(self):
        self._seed_confirmed_layout()
        final_paths = {'html': str(self.output_dir / 'CV_final.html'), 'pdf': str(self.output_dir / 'CV_final.pdf')}
        with patch(
            'utils.cv_orchestrator.CVOrchestrator.generate_final_from_confirmed_html',
            return_value=final_paths,
        ):
            resp = self.client.post(
                '/api/cv/generate-final',
                json={'session_id': self.session_id},
            )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data['ok'])
        self.assertIn('generated_at', data)
        self.assertIn('outputs', data)

    def test_generation_state_phase_set_to_final_complete(self):
        self._seed_confirmed_layout()
        final_paths = {'html': str(self.output_dir / 'CV_final.html'), 'pdf': str(self.output_dir / 'CV_final.pdf')}
        with patch(
            'utils.cv_orchestrator.CVOrchestrator.generate_final_from_confirmed_html',
            return_value=final_paths,
        ):
            self.client.post('/api/cv/generate-final', json={'session_id': self.session_id})
        gen_data = self.client.get(
            '/api/cv/generation-state',
            query_string={'session_id': self.session_id},
        ).get_json()
        self.assertEqual(gen_data['phase'], 'final_complete')

        entry = self.app.session_registry.get(self.session_id)
        self.assertEqual(entry.manager.state['generated_files']['final_html'], final_paths['html'])
        self.assertEqual(entry.manager.state['generated_files']['final_pdf'], final_paths['pdf'])
        self.assertEqual(
            entry.manager.state['generated_files']['files'],
            [final_paths['html'], final_paths['pdf']],
        )

    def test_orchestrator_failure_returns_500(self):
        self._seed_confirmed_layout()
        with patch(
            'utils.cv_orchestrator.CVOrchestrator.generate_final_from_confirmed_html',
            side_effect=RuntimeError('PDF conversion failed'),
        ):
            resp = self.client.post(
                '/api/cv/generate-final',
                json={'session_id': self.session_id},
            )
        self.assertEqual(resp.status_code, 500)
        data = resp.get_json()
        self.assertIn('error', data)


class TestLegacyLayoutEndpoints(unittest.TestCase):
    """Legacy layout endpoints should preserve staged history on reload/finalize."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.app, self.session_id, self._stack = _make_app_and_client(Path(self.tmp.name))
        self.client = self.app.test_client()
        self.addCleanup(self._stack.close)

    def tearDown(self):
        self.tmp.cleanup()

    def test_layout_history_falls_back_to_generation_state(self):
        entry = self.app.session_registry.get(self.session_id)
        entry.manager.state['generation_state'] = {
            'layout_instructions': [
                {
                    'timestamp': '12:00',
                    'instruction_text': 'Move Publications',
                    'change_summary': 'Moved publications section',
                    'confirmation': True,
                }
            ]
        }

        resp = self.client.get(
            '/api/layout-history',
            query_string={'session_id': self.session_id},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['instructions'][0]['instruction_text'], 'Move Publications')

    def test_layout_complete_reuses_staged_history_when_request_empty(self):
        entry = self.app.session_registry.get(self.session_id)
        staged_history = [
            {
                'timestamp': '12:00',
                'instruction_text': 'Move Publications',
                'change_summary': 'Moved publications section',
                'confirmation': True,
            }
        ]
        entry.manager.state['generation_state'] = {
            'layout_instructions': staged_history,
        }

        resp = self.client.post(
            '/api/layout-complete',
            json={'session_id': self.session_id, 'layout_instructions': []},
        )

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.get_json()['ok'])
        self.assertEqual(entry.manager.state['layout_instructions'], staged_history)


if __name__ == '__main__':
    unittest.main()
