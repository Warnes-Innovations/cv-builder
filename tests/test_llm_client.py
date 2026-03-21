# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for scripts/utils/llm_client.py

Covers the propose_rewrites feature (Phase 1 of the rewrite feature):
  - LLMClient.apply_rewrite_constraints  (static helper)
  - LLMClient._parse_json_response        (concrete helper)
  - OpenAIClient.propose_rewrites         (tasks 1.2.4 a, b, c)
"""
import json
import sys
import unittest
import warnings
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.llm_client import LLMClient, OpenAIClient, AnthropicClient, CopilotClient, GitHubModelsClient, GeminiClient, CopilotSdkClient, get_llm_provider, _normalize_github_model_id


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_CONTENT = {
    'summary': (
        'Experienced data scientist with 8 years building predictive models '
        'for pharmaceutical clients including Pfizer and Novartis.'
    ),
    'experiences': [
        {
            'id': 'exp_001',
            'title': 'Senior Data Scientist',
            'company': 'Pfizer',
            'achievements': [
                {'text': 'Built a model to predict clinical trial outcomes'},
                {'text': 'Managed a team of 12 engineers at Pfizer in 2021'},
            ],
        },
        {
            'id': 'exp_002',
            'title': 'Data Scientist',
            'company': 'BioTech Corp',
            'achievements': [
                {'text': 'Improved accuracy from 85% to 96% using ensemble methods'},
            ],
        },
    ],
    'skills': ['Python', 'R', 'TensorFlow', 'Docker'],
}

SAMPLE_JOB_ANALYSIS = {
    'title': 'Machine Learning Engineer',
    'domain': 'ML Engineering',
    'ats_keywords': ['MLOps', 'machine learning pipeline', 'CI/CD', 'Kubernetes'],
    'required_skills': ['Python', 'MLOps', 'Docker', 'Kubernetes'],
}


def _make_openai_client() -> OpenAIClient:
    """Create an OpenAIClient without hitting the real API."""
    client = object.__new__(OpenAIClient)
    client.model = 'gpt-4o'
    client.client = MagicMock()
    return client


# ---------------------------------------------------------------------------
# apply_rewrite_constraints
# ---------------------------------------------------------------------------

class TestApplyRewriteConstraints(unittest.TestCase):
    """Unit tests for LLMClient.apply_rewrite_constraints (static method)."""

    def test_valid_rewrite_returns_true(self):
        """Rewrite that adds terminology while preserving all numbers and names."""
        original = 'Built a model to predict clinical trial outcomes'
        proposed  = 'Developed a machine learning pipeline to predict clinical outcomes'
        self.assertTrue(LLMClient.apply_rewrite_constraints(original, proposed))

    def test_number_removal_returns_false(self):
        """Rewrite that drops a numeric metric must be rejected."""
        original = 'Managed a team of 12 engineers across 3 sites'
        proposed  = 'Led an engineering team using Agile methodologies'
        self.assertFalse(LLMClient.apply_rewrite_constraints(original, proposed))

    def test_year_removal_returns_false(self):
        """Rewrite that drops a year must be rejected."""
        original = 'Delivered the platform in 2021 under budget'
        proposed  = 'Delivered the platform under budget'
        self.assertFalse(LLMClient.apply_rewrite_constraints(original, proposed))

    def test_percentage_preserved_returns_true(self):
        """Rewrite that preserves a percentage is valid."""
        original = 'Improved accuracy from 85% to 96% using ensemble methods'
        proposed  = 'Improved model accuracy from 85% to 96% using Random Forest and XGBoost'
        self.assertTrue(LLMClient.apply_rewrite_constraints(original, proposed))

    def test_percentage_removal_returns_false(self):
        """Rewrite that drops a percentage must be rejected."""
        original = 'Improved accuracy from 85% to 96%'
        proposed  = 'Improved model accuracy significantly'
        self.assertFalse(LLMClient.apply_rewrite_constraints(original, proposed))

    def test_proper_name_removal_returns_false(self):
        """Rewrite that drops a company proper name must be rejected."""
        original = 'Led ML initiatives at Pfizer to accelerate drug discovery'
        proposed  = 'Led ML initiatives to accelerate drug discovery'
        self.assertFalse(LLMClient.apply_rewrite_constraints(original, proposed))

    def test_empty_original_always_valid(self):
        """Empty original has no protected tokens; any proposed text is valid."""
        self.assertTrue(LLMClient.apply_rewrite_constraints('', 'Any text here'))

    def test_identical_texts_valid(self):
        """No-op rewrite (original == proposed) is trivially valid."""
        text = 'Led a team of 5 scientists at Novartis'
        self.assertTrue(LLMClient.apply_rewrite_constraints(text, text))


# ---------------------------------------------------------------------------
# _parse_json_response
# ---------------------------------------------------------------------------

class TestParseJsonResponse(unittest.TestCase):
    """Unit tests for LLMClient._parse_json_response (concrete helper)."""

    def setUp(self):
        self.client = _make_openai_client()

    def test_direct_json_array(self):
        raw = '[{"id": "summary", "type": "summary"}]'
        result = self.client._parse_json_response(raw)
        self.assertIsInstance(result, list)
        self.assertEqual(result[0]['id'], 'summary')

    def test_json_in_fenced_code_block(self):
        raw = '```json\n[{"id": "bullet_0", "type": "bullet"}]\n```'
        result = self.client._parse_json_response(raw)
        self.assertEqual(result[0]['type'], 'bullet')

    def test_json_in_bare_code_block(self):
        raw = '```\n{"key": "value"}\n```'
        result = self.client._parse_json_response(raw)
        self.assertEqual(result['key'], 'value')

    def test_invalid_raises_value_error(self):
        with self.assertRaises((ValueError, Exception)):
            self.client._parse_json_response('not json at all, plain prose')


# ---------------------------------------------------------------------------
# OpenAIClient.propose_rewrites  (task 1.2.4)
# ---------------------------------------------------------------------------

class TestProposeRewrites(unittest.TestCase):
    """
    Integration-style unit tests for propose_rewrites.

    The LLM chat() call is mocked so no API key is needed.
    """

    def setUp(self):
        self.client = _make_openai_client()

    def _mock_chat(self, proposals: list):
        """Patch self.client.chat to return *proposals* serialised as JSON."""
        self.client.chat = MagicMock(return_value=json.dumps(proposals))

    # ── (a) bullet rewrite with keyword substitution ─────────────────────

    def test_bullet_rewrite_keyword_substitution(self):
        """Accepted bullet rewrite that introduces job-relevant terminology."""
        proposals = [
            {
                'id':                  'bullet_exp001_0',
                'type':                'bullet',
                'location':            'exp_001.achievements[0]',
                'original':            'Built a model to predict clinical trial outcomes',
                'proposed':            (
                    'Developed a machine learning pipeline to predict clinical '
                    'trial outcomes using MLOps best practices'
                ),
                'keywords_introduced': ['machine learning pipeline', 'MLOps'],
                'evidence':            '',
                'evidence_strength':   '',
                'rationale':           'Introduces job-required MLOps terminology.',
            }
        ]
        self._mock_chat(proposals)

        result = self.client.propose_rewrites(SAMPLE_CONTENT, SAMPLE_JOB_ANALYSIS)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['id'],   'bullet_exp001_0')
        self.assertEqual(result[0]['type'], 'bullet')
        self.assertIn('MLOps', result[0]['keywords_introduced'])

    # ── (b) skill_add with evidence ──────────────────────────────────────

    def test_skill_add_with_evidence(self):
        """Accepted skill_add proposal with strong evidence linking to experiences."""
        proposals = [
            {
                'id':                  'skill_mlops',
                'type':                'skill_add',
                'location':            'skills.core[4]',
                'original':            '',
                'proposed':            'MLOps',
                'keywords_introduced': ['MLOps'],
                'evidence':            'exp_001, exp_002',
                'evidence_strength':   'strong',
                'rationale':           (
                    'Candidate deployed ML pipelines in production at exp_001 '
                    'and exp_002, satisfying the MLOps requirement.'
                ),
            }
        ]
        self._mock_chat(proposals)

        result = self.client.propose_rewrites(SAMPLE_CONTENT, SAMPLE_JOB_ANALYSIS)

        self.assertEqual(len(result), 1)
        item = result[0]
        self.assertEqual(item['type'],             'skill_add')
        self.assertEqual(item['evidence_strength'], 'strong')
        self.assertIn('exp_001', item['evidence'])

    # ── (c) constraint violation filtered out ────────────────────────────

    def test_constraint_violation_filtered(self):
        """A rewrite that removes numbers and a company name is filtered out."""
        violated_proposal = {
            'id':                  'bullet_exp001_1',
            'type':                'bullet',
            'location':            'exp_001.achievements[1]',
            # original has "12", "Pfizer", and "2021" — all removed in proposed
            'original':            'Managed a team of 12 engineers at Pfizer in 2021',
            'proposed':            'Led an engineering team using Agile methodologies',
            'keywords_introduced': ['Agile'],
            'evidence':            '',
            'evidence_strength':   '',
            'rationale':           'Introduces Agile methodology keyword.',
        }
        self._mock_chat([violated_proposal])

        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            result = self.client.propose_rewrites(SAMPLE_CONTENT, SAMPLE_JOB_ANALYSIS)

        self.assertEqual(result, [],
                         "Constraint-violating proposal should be filtered out")
        # A warning should have been emitted
        constraint_warnings = [
            w for w in caught if 'constraint violation' in str(w.message).lower()
        ]
        self.assertTrue(
            len(constraint_warnings) >= 1,
            "Expected a warning about the filtered constraint violation",
        )

    # ── edge cases ────────────────────────────────────────────────────────

    def test_empty_proposals_returned_as_empty_list(self):
        """LLM returning [] produces empty result without error."""
        self._mock_chat([])
        result = self.client.propose_rewrites(SAMPLE_CONTENT, SAMPLE_JOB_ANALYSIS)
        self.assertEqual(result, [])

    def test_api_failure_returns_empty_list(self):
        """Any exception from chat() returns [] and emits a warning."""
        self.client.chat = MagicMock(side_effect=RuntimeError('API timeout'))

        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            result = self.client.propose_rewrites(SAMPLE_CONTENT, SAMPLE_JOB_ANALYSIS)

        self.assertEqual(result, [])
        self.assertTrue(any('propose_rewrites' in str(w.message) for w in caught))

    def test_malformed_json_returns_empty_list(self):
        """Unparseable LLM response returns [] and emits a warning."""
        self.client.chat = MagicMock(return_value='Sorry, I cannot do that.')

        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            result = self.client.propose_rewrites(SAMPLE_CONTENT, SAMPLE_JOB_ANALYSIS)

        self.assertEqual(result, [])
        self.assertTrue(any('propose_rewrites' in str(w.message) for w in caught))

    def test_mixed_valid_and_invalid_proposals(self):
        """Only proposals passing the constraint check are returned."""
        valid_proposal = {
            'id':                  'bullet_exp002_0',
            'type':                'bullet',
            'location':            'exp_002.achievements[0]',
            'original':            'Improved accuracy from 85% to 96% using ensemble methods',
            'proposed':            (
                'Improved model accuracy from 85% to 96% using ensemble '
                'methods and MLOps-driven experimentation tracking'
            ),
            'keywords_introduced': ['MLOps'],
            'evidence':            '',
            'evidence_strength':   '',
            'rationale':           'Adds MLOps keyword while preserving all metrics.',
        }
        invalid_proposal = {
            'id':                  'bullet_exp001_1',
            'type':                'bullet',
            'location':            'exp_001.achievements[1]',
            'original':            'Managed a team of 12 engineers at Pfizer in 2021',
            'proposed':            'Led engineers using Agile methodologies',
            'keywords_introduced': ['Agile'],
            'evidence':            '',
            'evidence_strength':   '',
            'rationale':           'Introduces Agile keyword.',
        }
        self._mock_chat([valid_proposal, invalid_proposal])

        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            result = self.client.propose_rewrites(
                SAMPLE_CONTENT,
                SAMPLE_JOB_ANALYSIS,
            )

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['id'], 'bullet_exp002_0')
        self.assertTrue(
            any('constraint violation filtered' in str(w.message) for w in caught)
        )


# ---------------------------------------------------------------------------
# Stub implementations (task 1.5.1)
# ---------------------------------------------------------------------------

class TestStubImplementations(unittest.TestCase):
    """Verify that stub provider classes return [] from propose_rewrites."""

    def test_local_llm_client_stub(self):
        """LocalLLMClient.propose_rewrites returns [] without error."""
        from utils.llm_client import LocalLLMClient
        # Bypass __init__ to avoid loading transformers
        client = object.__new__(LocalLLMClient)
        result = client.propose_rewrites(SAMPLE_CONTENT, SAMPLE_JOB_ANALYSIS)
        self.assertEqual(result, [])


class TestAnthropicClient(unittest.TestCase):
    """Validate Anthropic payload normalization for current Messages API."""

    def test_chat_sends_system_as_text_blocks(self):
        client = object.__new__(AnthropicClient)
        client.model = 'claude-sonnet-4-6'
        client.client = MagicMock()
        client.client.messages.create.return_value = SimpleNamespace(
            usage=SimpleNamespace(input_tokens=12, output_tokens=3),
            content=[SimpleNamespace(text='ready')],
        )

        result = client.chat(
            messages=[
                {'role': 'system', 'content': 'Answer in one word.'},
                {'role': 'user', 'content': 'Say ready'},
            ],
            temperature=0,
            max_tokens=8,
        )

        self.assertEqual(result, 'ready')
        client.client.messages.create.assert_called_once_with(
            model='claude-sonnet-4-6',
            max_tokens=8,
            temperature=0,
            system=[{'type': 'text', 'text': 'Answer in one word.'}],
            messages=[
                {
                    'role': 'user',
                    'content': [{'type': 'text', 'text': 'Say ready'}],
                }
            ],
        )

    def test_chat_omits_system_when_not_present(self):
        client = object.__new__(AnthropicClient)
        client.model = 'claude-sonnet-4-6'
        client.client = MagicMock()
        client.client.messages.create.return_value = SimpleNamespace(
            usage=SimpleNamespace(input_tokens=8, output_tokens=2),
            content=[SimpleNamespace(text='ready')],
        )

        client.chat(
            messages=[{'role': 'user', 'content': 'Say ready'}],
            temperature=0,
            max_tokens=8,
        )

        kwargs = client.client.messages.create.call_args.kwargs
        self.assertNotIn('system', kwargs)
        self.assertEqual(
            kwargs['messages'],
            [{'role': 'user', 'content': [{'type': 'text', 'text': 'Say ready'}]}],
        )


class TestGitHubModelNormalization(unittest.TestCase):
    """Validate model-ID normalization for GitHub/Copilot compatibility."""

    def test_legacy_claude_sonnet_46_model_id_normalizes(self):
        """Legacy hyphenated Sonnet 4.6 model ID is normalized to dotted form."""
        self.assertEqual(
            _normalize_github_model_id('anthropic/claude-sonnet-4-6'),
            'anthropic/claude-sonnet-4.6',
        )

    def test_short_alias_maps_to_supported_dotted_model_id(self):
        """Short alias for Sonnet 4.6 maps to dotted publisher/model ID."""
        self.assertEqual(
            CopilotClient.MODEL_ALIASES['claude-sonnet-4-6'],
            'anthropic/claude-sonnet-4.6',
        )
        self.assertEqual(
            GitHubModelsClient.MODEL_ALIASES['claude-sonnet-4-6'],
            'anthropic/claude-sonnet-4.6',
        )


class TestGeminiClientAnyLLM(unittest.TestCase):
    """Validate Gemini client behavior when routed through any-llm."""

    def test_init_prefers_explicit_api_key(self):
        """Explicit api_key argument wins over environment variables."""
        mock_completion = MagicMock()
        with patch('utils.llm_client.os.getenv', return_value='env-key'):
            with patch.dict(sys.modules, {'any_llm': SimpleNamespace(completion=mock_completion)}):
                client = GeminiClient(model='gemini-2.5-flash', api_key='explicit-key')

        self.assertEqual(client.api_key, 'explicit-key')
        self.assertEqual(client.model, 'gemini-2.5-flash')

    def test_init_uses_gemini_api_key_env(self):
        """GEMINI_API_KEY is used when explicit api_key is not provided."""
        mock_completion = MagicMock()

        def _env(name, default=None):
            if name == 'GEMINI_API_KEY':
                return 'gemini-env-key'
            return default

        with patch('utils.llm_client.os.getenv', side_effect=_env):
            with patch.dict(sys.modules, {'any_llm': SimpleNamespace(completion=mock_completion)}):
                client = GeminiClient(model='gemini-2.5-flash')

        self.assertEqual(client.api_key, 'gemini-env-key')

    def test_init_falls_back_to_google_api_key_env(self):
        """GOOGLE_API_KEY fallback is used when GEMINI_API_KEY is unset."""
        mock_completion = MagicMock()

        def _env(name, default=None):
            if name == 'GEMINI_API_KEY':
                return None
            if name == 'GOOGLE_API_KEY':
                return 'google-env-key'
            return default

        with patch('utils.llm_client.os.getenv', side_effect=_env):
            with patch.dict(sys.modules, {'any_llm': SimpleNamespace(completion=mock_completion)}):
                client = GeminiClient(model='gemini-2.5-flash')

        self.assertEqual(client.api_key, 'google-env-key')

    def test_init_raises_when_no_api_key(self):
        """Missing both GEMINI_API_KEY and GOOGLE_API_KEY raises ValueError."""
        with patch('utils.llm_client.os.getenv', return_value=None):
            with self.assertRaises(ValueError) as ctx:
                GeminiClient(model='gemini-2.5-flash')

        message = str(ctx.exception)
        self.assertIn('GEMINI_API_KEY', message)
        self.assertIn('GOOGLE_API_KEY', message)

    def test_init_raises_when_any_llm_missing(self):
        """Missing any-llm dependency raises ImportError with install guidance."""
        import builtins

        original_import = builtins.__import__

        def _import(name, *args, **kwargs):
            if name == 'any_llm':
                raise ImportError('No module named any_llm')
            return original_import(name, *args, **kwargs)

        with patch('utils.llm_client.os.getenv', return_value='test-key'):
            with patch('builtins.__import__', side_effect=_import):
                with self.assertRaises(ImportError) as ctx:
                    GeminiClient(model='gemini-2.5-flash')

        self.assertIn('any-llm package not installed', str(ctx.exception))

    def test_chat_forwards_arguments_to_any_llm(self):
        """chat() passes provider, model, key, and generation args through unchanged."""
        client = object.__new__(GeminiClient)
        client.model = 'gemini-2.5-flash'
        client.api_key = 'unit-test-key'
        client._anyllm_completion = MagicMock(
            return_value=SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content='Ready'))]
            )
        )

        messages = [
            {'role': 'system', 'content': 'Answer in one word.'},
            {'role': 'user', 'content': 'Say ready'}
        ]

        result = client.chat(messages, temperature=0.1, max_tokens=12)

        self.assertEqual(result, 'Ready')
        client._anyllm_completion.assert_called_once_with(
            provider='gemini',
            model='gemini-2.5-flash',
            api_key='unit-test-key',
            messages=messages,
            temperature=0.1,
            max_tokens=12,
        )

    def test_chat_returns_string_content(self):
        """String response content is returned as-is."""
        client = object.__new__(GeminiClient)
        client._anyllm_completion = MagicMock(
            return_value=SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content='Direct text'))]
            )
        )
        client.model = 'gemini-2.5-flash'
        client.api_key = 'unit-test-key'

        result = client.chat([{'role': 'user', 'content': 'hi'}])
        self.assertEqual(result, 'Direct text')

    def test_chat_joins_list_content_parts(self):
        """List content is reduced by concatenating each dict text field."""
        client = object.__new__(GeminiClient)
        client._anyllm_completion = MagicMock(
            return_value=SimpleNamespace(
                choices=[
                    SimpleNamespace(
                        message=SimpleNamespace(
                            content=[
                                {'text': 'Ready'},
                                {'text': ' now'},
                                {'ignored': 'value'},
                            ]
                        )
                    )
                ]
            )
        )
        client.model = 'gemini-2.5-flash'
        client.api_key = 'unit-test-key'

        result = client.chat([{'role': 'user', 'content': 'hi'}])
        self.assertEqual(result, 'Ready now')

    def test_chat_stringifies_unexpected_content_types(self):
        """Non-string, non-list content is converted using str()."""
        client = object.__new__(GeminiClient)
        client._anyllm_completion = MagicMock(
            return_value=SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content=12345))]
            )
        )
        client.model = 'gemini-2.5-flash'
        client.api_key = 'unit-test-key'

        result = client.chat([{'role': 'user', 'content': 'hi'}])
        self.assertEqual(result, '12345')

    def test_chat_falls_back_to_output_text_when_choices_missing(self):
        """Gemini parsing supports responses without choices[] when output_text exists."""
        client = object.__new__(GeminiClient)
        client._anyllm_completion = MagicMock(
            return_value=SimpleNamespace(output_text='Ready from fallback')
        )
        client.model = 'gemini-2.5-flash'
        client.api_key = 'unit-test-key'

        result = client.chat([{'role': 'user', 'content': 'hi'}])
        self.assertEqual(result, 'Ready from fallback')

    def test_chat_raises_clear_error_when_no_content(self):
        """Gemini parsing returns empty string when no content fields are present."""
        client = object.__new__(GeminiClient)
        client._anyllm_completion = MagicMock(return_value=SimpleNamespace())
        client.model = 'gemini-2.5-flash'
        client.api_key = 'unit-test-key'

        result = client.chat([{'role': 'user', 'content': 'hi'}])
        self.assertEqual(result, '')

    def test_chat_reads_candidates_parts_envelope(self):
        """Gemini parsing supports candidate->content->parts text envelopes."""
        part = SimpleNamespace(text='Ready from candidates')
        cand_content = SimpleNamespace(parts=[part])
        candidate = SimpleNamespace(content=cand_content)

        client = object.__new__(GeminiClient)
        client._anyllm_completion = MagicMock(
            return_value=SimpleNamespace(candidates=[candidate])
        )
        client.model = 'gemini-2.5-flash'
        client.api_key = 'unit-test-key'

        result = client.chat([{'role': 'user', 'content': 'hi'}])
        self.assertEqual(result, 'Ready from candidates')


class TestCopilotSdkClient(unittest.TestCase):
    """Validate CopilotSdkClient behavior when routed through any-llm copilot_sdk provider."""

    def test_init_prefers_explicit_api_key(self):
        """Explicit api_key argument wins over environment variables."""
        mock_completion = MagicMock()
        with patch('utils.llm_client.os.getenv', return_value='env-key'):
            with patch.dict(sys.modules, {'any_llm': SimpleNamespace(completion=mock_completion)}):
                client = CopilotSdkClient(model='gpt-4o', api_key='explicit-key')

        self.assertEqual(client.api_key, 'explicit-key')
        self.assertEqual(client.model, 'gpt-4o')

    def test_init_uses_copilot_github_token_env(self):
        """COPILOT_GITHUB_TOKEN is used when no explicit api_key is given."""
        mock_completion = MagicMock()

        def _env(name, default=None):
            if name == 'COPILOT_GITHUB_TOKEN':
                return 'copilot-token'
            return default

        with patch('utils.llm_client.os.getenv', side_effect=_env):
            with patch.dict(sys.modules, {'any_llm': SimpleNamespace(completion=mock_completion)}):
                client = CopilotSdkClient(model='gpt-4o')

        self.assertEqual(client.api_key, 'copilot-token')

    def test_init_falls_back_to_github_token_env(self):
        """GITHUB_TOKEN is used when COPILOT_GITHUB_TOKEN is unset."""
        mock_completion = MagicMock()

        def _env(name, default=None):
            if name == 'GITHUB_TOKEN':
                return 'github-token'
            return default

        with patch('utils.llm_client.os.getenv', side_effect=_env):
            with patch.dict(sys.modules, {'any_llm': SimpleNamespace(completion=mock_completion)}):
                client = CopilotSdkClient(model='gpt-4o')

        self.assertEqual(client.api_key, 'github-token')

    def test_init_falls_back_to_gh_token_env(self):
        """GH_TOKEN is used as final env-var fallback."""
        mock_completion = MagicMock()

        def _env(name, default=None):
            if name == 'GH_TOKEN':
                return 'gh-token'
            return default

        with patch('utils.llm_client.os.getenv', side_effect=_env):
            with patch.dict(sys.modules, {'any_llm': SimpleNamespace(completion=mock_completion)}):
                client = CopilotSdkClient(model='gpt-4o')

        self.assertEqual(client.api_key, 'gh-token')

    def test_init_allows_no_token(self):
        """No API key is fine — logged-in CLI user mode requires no token."""
        mock_completion = MagicMock()
        with patch('utils.llm_client.os.getenv', return_value=None):
            with patch.dict(sys.modules, {'any_llm': SimpleNamespace(completion=mock_completion)}):
                client = CopilotSdkClient(model='gpt-4o')

        self.assertIsNone(client.api_key)

    def test_init_raises_when_any_llm_missing(self):
        """Missing any-llm dependency raises ImportError with install guidance."""
        import builtins

        original_import = builtins.__import__

        def _import(name, *args, **kwargs):
            if name == 'any_llm':
                raise ImportError('No module named any_llm')
            return original_import(name, *args, **kwargs)

        with patch('utils.llm_client.os.getenv', return_value=None):
            with patch('builtins.__import__', side_effect=_import):
                with self.assertRaises(ImportError) as ctx:
                    CopilotSdkClient(model='gpt-4o')

        self.assertIn('any-llm', str(ctx.exception))

    def test_chat_forwards_arguments_with_api_key(self):
        """chat() includes api_key in any-llm call when a token is set."""
        client = object.__new__(CopilotSdkClient)
        client.model = 'gpt-4o'
        client.api_key = 'test-token'
        client._anyllm_completion = MagicMock(
            return_value=SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content='Hello'))]
            )
        )

        messages = [{'role': 'user', 'content': 'Hi'}]
        result = client.chat(messages, temperature=0.5, max_tokens=20)

        self.assertEqual(result, 'Hello')
        client._anyllm_completion.assert_called_once_with(
            provider='copilot_sdk',
            model='gpt-4o',
            api_key='test-token',
            messages=messages,
            temperature=0.5,
            max_tokens=20,
        )

    def test_chat_omits_api_key_when_none(self):
        """chat() omits api_key from any-llm call when api_key is None (logged-in mode)."""
        client = object.__new__(CopilotSdkClient)
        client.model = 'gpt-4o'
        client.api_key = None
        client._anyllm_completion = MagicMock(
            return_value=SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content='Hello'))]
            )
        )

        messages = [{'role': 'user', 'content': 'Hi'}]
        result = client.chat(messages, temperature=0.7)

        self.assertEqual(result, 'Hello')
        call_kwargs = client._anyllm_completion.call_args.kwargs
        self.assertNotIn('api_key', call_kwargs)

    def test_chat_returns_empty_string_on_no_content(self):
        """chat() returns empty string when no content fields are present."""
        client = object.__new__(CopilotSdkClient)
        client.model = 'gpt-4o'
        client.api_key = None
        client._anyllm_completion = MagicMock(return_value=SimpleNamespace())

        result = client.chat([{'role': 'user', 'content': 'hi'}])
        self.assertEqual(result, '')

    def test_get_llm_provider_returns_copilot_sdk_client(self):
        """get_llm_provider('copilot-sdk') returns a CopilotSdkClient instance."""
        mock_completion = MagicMock()
        with patch('utils.llm_client.os.getenv', return_value=None):
            with patch.dict(sys.modules, {'any_llm': SimpleNamespace(completion=mock_completion)}):
                client = get_llm_provider(provider='copilot-sdk', model='gpt-4o')

        self.assertIsInstance(client, CopilotSdkClient)
        self.assertEqual(client.model, 'gpt-4o')


# ---------------------------------------------------------------------------
# Persuasion Checks (Phase 10)
# ---------------------------------------------------------------------------

class TestPersuasionChecks(unittest.TestCase):
    """Unit tests for persuasion quality check functions (Phase 10)."""

    # ── Strong Action Verb Checks ──────────────────────────────────────────

    def test_strong_action_verb_approved_verb(self):
        """Approved opening verb passes the check."""
        text = 'Developed a machine learning model for customer churn prediction.'
        result = LLMClient.check_strong_action_verb(text)
        self.assertTrue(result['pass'])
        self.assertEqual(result['flag_type'], 'strong_action_verb')

    def test_strong_action_verb_multiple_approved(self):
        """Multiple approved verbs all pass."""
        for verb in ['Led', 'Built', 'Designed', 'Deployed', 'Architected']:
            text = f'{verb} a framework for distributed computing.'
            result = LLMClient.check_strong_action_verb(text)
            self.assertTrue(result['pass'], f"Failed for verb: {verb}")

    def test_strong_action_verb_weak_verb(self):
        """Non-approved opening word fails the check."""
        text = 'Worked on a machine learning project with the team.'
        result = LLMClient.check_strong_action_verb(text)
        self.assertFalse(result['pass'])
        self.assertEqual(result['severity'], 'warn')

    def test_strong_action_verb_empty_text(self):
        """Empty text passes (no verb to check)."""
        result = LLMClient.check_strong_action_verb('')
        self.assertTrue(result['pass'])

    # ── Passive Voice Checks ──────────────────────────────────────────────

    def test_passive_voice_detected_was_verb(self):
        """'Was designed' triggers passive voice flag."""
        text = 'Was responsible for developing the API alongside the engineering team.'
        result = LLMClient.check_passive_voice(text)
        self.assertFalse(result['pass'])
        self.assertEqual(result['flag_type'], 'passive_voice')

    def test_passive_voice_detected_helped_to(self):
        """'Helped to' triggers hedging/passive flag."""
        text = 'Helped to improve the system performance by 30%.'
        result = LLMClient.check_passive_voice(text)
        self.assertFalse(result['pass'])

    def test_passive_voice_detected_was_involved(self):
        """'Was involved in' triggers flag."""
        text = 'Was involved in implementing the feature over three months.'
        result = LLMClient.check_passive_voice(text)
        self.assertFalse(result['pass'])

    def test_passive_voice_active_voice_passes(self):
        """Active voice passes the check."""
        text = 'Led the redesign of the data pipeline, improving query latency by 60%.'
        result = LLMClient.check_passive_voice(text)
        self.assertTrue(result['pass'])

    def test_passive_voice_empty_text(self):
        """Empty text passes."""
        result = LLMClient.check_passive_voice('')
        self.assertTrue(result['pass'])

    # ── Word Count Checks ─────────────────────────────────────────────────

    def test_word_count_within_limit(self):
        """Bullet under 30 words passes."""
        text = 'Developed a machine learning model for customer prediction.'
        # ~9 words
        result = LLMClient.check_word_count(text, max_words=30)
        self.assertTrue(result['pass'])

    def test_word_count_exactly_at_limit(self):
        """Exactly 30 words passes."""
        words = ['word'] * 30
        text = ' '.join(words)
        result = LLMClient.check_word_count(text, max_words=30)
        self.assertTrue(result['pass'])

    def test_word_count_exceeds_limit(self):
        """Bullet over 30 words fails."""
        words = ['word'] * 35
        text = ' '.join(words)
        result = LLMClient.check_word_count(text, max_words=30)
        self.assertFalse(result['pass'])
        self.assertEqual(result['severity'], 'warn')

    def test_word_count_empty_text(self):
        """Empty text passes."""
        result = LLMClient.check_word_count('')
        self.assertTrue(result['pass'])

    # ── Result Clause Checks ──────────────────────────────────────────────

    def test_has_result_with_metric(self):
        """Bullet with quantified metric passes."""
        text = 'Improved prediction accuracy from 72% to 89% using ensemble methods.'
        result = LLMClient.check_has_result_clause(text)
        self.assertTrue(result['pass'])

    def test_has_result_with_number(self):
        """Bullet with a number passes."""
        text = 'Led a team of 12 engineers in implementing the new system.'
        result = LLMClient.check_has_result_clause(text)
        self.assertTrue(result['pass'])

    def test_has_result_with_outcome_verb(self):
        """Bullet with outcome verb passes."""
        text = 'Designed the architecture which enabled the company to scale to 10M users.'
        result = LLMClient.check_has_result_clause(text)
        self.assertTrue(result['pass'])

    def test_has_no_result_clause(self):
        """Bullet without quantifiable result flags warning (info severity)."""
        text = 'Worked on various projects and helped the team.'
        result = LLMClient.check_has_result_clause(text)
        self.assertFalse(result['pass'])
        self.assertEqual(result['severity'], 'info')

    def test_has_result_empty_text(self):
        """Empty text passes."""
        result = LLMClient.check_has_result_clause('')
        self.assertTrue(result['pass'])

    # ── Hedging Language Checks ────────────────────────────────────────────

    def test_hedging_detected_helped_to(self):
        """'Helped to' is flagged as hedging."""
        text = 'Helped to improve system performance and reliability.'
        result = LLMClient.check_hedging_language(text)
        self.assertFalse(result['pass'])
        self.assertEqual(result['flag_type'], 'hedging')

    def test_hedging_detected_assisted(self):
        """'Assisted with' is flagged."""
        text = 'Assisted with the migration from legacy systems.'
        result = LLMClient.check_hedging_language(text)
        self.assertFalse(result['pass'])

    def test_hedging_detected_involved_in(self):
        """'Was involved in' is flagged."""
        text = 'Was involved in implementing the CI/CD pipeline.'
        result = LLMClient.check_hedging_language(text)
        self.assertFalse(result['pass'])

    def test_hedging_assertive_language_passes(self):
        """Strong, direct language passes."""
        text = 'Led the migration from legacy systems to microservices.'
        result = LLMClient.check_hedging_language(text)
        self.assertTrue(result['pass'])

    def test_hedging_empty_text(self):
        """Empty text passes."""
        result = LLMClient.check_hedging_language('')
        self.assertTrue(result['pass'])

    # ── Named Institution Position Checks ──────────────────────────────────

    def test_institution_in_first_words(self):
        """Brand appearing in first 15 words passes."""
        text = 'At Google, developed machine learning models for recommendation systems.'
        result = LLMClient.check_named_institution_position(text, max_position=15)
        self.assertTrue(result['pass'])

    def test_institution_beyond_first_words(self):
        """Brand appearing after word 15 fails."""
        words = ['word'] * 20 + ['Google']  # "Google" at word 21
        text = ' '.join(words)
        result = LLMClient.check_named_institution_position(text, max_position=15)
        self.assertFalse(result['pass'])

    def test_institution_no_brand_in_text(self):
        """Text without recognized brands passes."""
        text = 'Developed machine learning models for internal systems.'
        result = LLMClient.check_named_institution_position(text)
        self.assertTrue(result['pass'])

    def test_institution_multiple_brands(self):
        """Multiple brands, first one in position passes."""
        text = 'Led initiatives at Google and later Amazon.'
        result = LLMClient.check_named_institution_position(text)
        self.assertTrue(result['pass'])

    # ── CAR Structure Checks ──────────────────────────────────────────────

    def test_car_structure_present(self):
        """Challenge-Action-Result structure detected."""
        text = 'Faced scaling challenges with legacy monolith, architected microservices, resulting in 3x throughput increase.'
        result = LLMClient.check_car_structure(text)
        self.assertTrue(result['pass'])

    def test_car_structure_missing_challenge(self):
        """No challenge context is flagged (info severity) but result passes."""
        text = 'Improved system performance by 40%.'
        result = LLMClient.check_car_structure(text)
        # Has a result clause, so passes; no challenge detected but that's optional
        self.assertTrue(result['pass'])
        self.assertEqual(result['flag_type'], 'car_structure')

    def test_car_structure_with_result(self):
        """Action-Result without challenge still counts as having result."""
        text = 'Implemented new caching layer, reducing query latency by 70%.'
        result = LLMClient.check_car_structure(text)
        self.assertTrue(result['pass'])

    def test_car_structure_empty_text(self):
        """Empty text passes."""
        result = LLMClient.check_car_structure('')
        self.assertTrue(result['pass'])

    # ── Generic Summary Phrase Checks ──────────────────────────────────────

    def test_generic_summary_clean(self):
        """Summary without filler phrases passes."""
        text = 'Data scientist specializing in deep learning and NLP with 8 years at Pfizer and Genentech.'
        result = LLMClient.check_summary_generic_phrases(text)
        self.assertTrue(result['pass'])

    def test_generic_summary_one_filler(self):
        """Summary with one filler phrase is tolerated."""
        text = 'Highly motivated data scientist with expertise in statistical modeling.'
        result = LLMClient.check_summary_generic_phrases(text)
        self.assertTrue(result['pass'])

    def test_generic_summary_multiple_fillers(self):
        """Summary with multiple filler phrases fails."""
        text = 'Highly motivated and detail-oriented professional seeking a position in a dynamic team environment.'
        result = LLMClient.check_summary_generic_phrases(text)
        self.assertFalse(result['pass'])
        self.assertEqual(result['severity'], 'warn')

    def test_generic_summary_specific_claim(self):
        """Summary with specificity passes."""
        text = 'Genomics ML engineer. Built deep learning pipelines that reduced variant-calling time from 48h to 6h. Published in Nature.'
        result = LLMClient.check_summary_generic_phrases(text)
        self.assertTrue(result['pass'])

    def test_generic_summary_empty_text(self):
        """Empty text passes."""
        result = LLMClient.check_summary_generic_phrases('')
        self.assertTrue(result['pass'])


if __name__ == '__main__':
    unittest.main()
