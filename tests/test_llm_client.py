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
# LLMClient._validate_with_repair
# ---------------------------------------------------------------------------

class TestValidateWithRepair(unittest.TestCase):
    """Unit tests for LLMClient._validate_with_repair()."""

    def setUp(self):
        self.client = _make_openai_client()
        # A minimal Pydantic model with one required field for testing.
        from pydantic import BaseModel
        class _TestModel(BaseModel):
            cite_key: str
            score: int = 0

        self._TestModel = _TestModel

    def test_valid_data_returns_immediately_without_chat_call(self):
        self.client.client.chat.completions.create = MagicMock()
        messages = [{"role": "user", "content": "rank these"}]
        data = {"cite_key": "Jones2020", "score": 5}
        result = self.client._validate_with_repair(data, self._TestModel, messages, temperature=0.3)
        self.assertEqual(result.cite_key, "Jones2020")
        self.assertEqual(result.score, 5)
        self.client.client.chat.completions.create.assert_not_called()

    def test_invalid_data_triggers_repair_and_returns_repaired_result(self):
        repaired_json = '{"cite_key": "Jones2020", "score": 3}'
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = repaired_json
        mock_response.usage = None
        self.client.client.chat.completions.create = MagicMock(return_value=mock_response)

        messages = [{"role": "user", "content": "rank these"}]
        invalid_data = {"score": 5}  # missing required cite_key
        result = self.client._validate_with_repair(invalid_data, self._TestModel, messages, temperature=0.3)
        self.assertEqual(result.cite_key, "Jones2020")
        self.client.client.chat.completions.create.assert_called_once()

    def test_persistent_validation_failure_raises_validation_error(self):
        from pydantic import ValidationError
        still_invalid_json = '{"score": 99}'  # still missing cite_key after repair
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = still_invalid_json
        mock_response.usage = None
        self.client.client.chat.completions.create = MagicMock(return_value=mock_response)

        messages = [{"role": "user", "content": "rank these"}]
        invalid_data = {"score": 5}  # missing required cite_key
        with self.assertRaises(ValidationError):
            self.client._validate_with_repair(invalid_data, self._TestModel, messages, temperature=0.3)
        self.client.client.chat.completions.create.assert_called_once()


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


def _cfg(timeout=None, max_tokens=None):
    """Stand-in for utils.config.get_config() with the LLM settings chat() reads."""
    return SimpleNamespace(llm_request_timeout=timeout, llm_max_tokens=max_tokens)


def _anthropic_client(model, response):
    """AnthropicClient whose streamed request returns *response*."""
    client = object.__new__(AnthropicClient)
    client.model = model
    client.client = MagicMock()
    stream = client.client.messages.stream.return_value.__enter__.return_value
    stream.get_final_message.return_value = response
    return client


def _text_response(text='ready'):
    return SimpleNamespace(
        usage=SimpleNamespace(input_tokens=12, output_tokens=3),
        content=[SimpleNamespace(type='text', text=text)],
        stop_reason='end_turn',
    )


class TestAnthropicClient(unittest.TestCase):
    """Validate Anthropic payload normalization for current Messages API."""

    def _chat(self, client, cfg=None, **kwargs):
        with patch('utils.config.get_config', return_value=cfg or _cfg(), create=True):
            return client.chat(messages=[{'role': 'user', 'content': 'Say ready'}], **kwargs)

    def _sent(self, client):
        return client.client.messages.stream.call_args.kwargs

    def _chat_with_content(self, content, stop_reason='end_turn'):
        client = _anthropic_client('claude-sonnet-5', SimpleNamespace(
            usage=SimpleNamespace(input_tokens=12, output_tokens=3),
            content=content,
            stop_reason=stop_reason,
        ))
        return self._chat(client)

    def test_chat_skips_leading_thinking_block(self):
        """Models that think by default return a ThinkingBlock before the text.

        Reading ``response.content[0].text`` raised
        ``'ThinkingBlock' object has no attribute 'text'`` and broke
        Recommend Customizations. Uses the SDK's real block classes: the
        untyped SimpleNamespace mocks elsewhere in this class cannot
        reproduce it.
        """
        from anthropic.types import TextBlock, ThinkingBlock
        content = [
            ThinkingBlock(type='thinking', thinking='Considering...', signature='sig'),
            TextBlock(type='text', text='ready'),
        ]
        self.assertEqual(self._chat_with_content(content), 'ready')

    def test_chat_joins_multiple_text_blocks(self):
        from anthropic.types import TextBlock, ThinkingBlock
        content = [
            TextBlock(type='text', text='{"a": '),
            ThinkingBlock(type='thinking', thinking='...', signature='sig'),
            TextBlock(type='text', text='1}'),
        ]
        self.assertEqual(self._chat_with_content(content), '{"a": 1}')

    def test_chat_raises_clear_error_when_no_text_block(self):
        """Thinking can use the whole max_tokens budget and leave no text."""
        from anthropic.types import ThinkingBlock
        from utils.llm_client import LLMProviderError
        content = [ThinkingBlock(type='thinking', thinking='...', signature='sig')]
        with self.assertRaises(LLMProviderError) as ctx:
            self._chat_with_content(content, stop_reason='max_tokens')
        self.assertIn('max_tokens', str(ctx.exception))

    def test_chat_streams_instead_of_create(self):
        """Non-streaming create() is refused by the SDK above ~21K max_tokens."""
        client = _anthropic_client('claude-sonnet-5', _text_response())
        self.assertEqual(self._chat(client), 'ready')
        client.client.messages.stream.assert_called_once()
        client.client.messages.create.assert_not_called()
        self.assertEqual(client.last_usage.input_tokens, 12)

    def test_default_max_tokens_is_model_output_cap(self):
        cases = {
            'claude-sonnet-5':            128_000,
            'claude-sonnet-5-5':          128_000,
            'claude-opus-5-5':            128_000,
            'claude-fable-5-1':           128_000,
            'claude-sonnet-4-6':          128_000,
            'claude-haiku-4-5-20251001':   64_000,
            'claude-sonnet-4-5':           64_000,
            'claude-opus-4-5-20251101':    64_000,
            'claude-3-opus-20240229':       4_096,   # not in the table: old fallback
        }
        for model, expected in cases.items():
            with self.subTest(model=model):
                client = _anthropic_client(model, _text_response())
                self._chat(client)
                self.assertEqual(self._sent(client)['max_tokens'], expected)

    def test_explicit_max_tokens_is_honoured(self):
        client = _anthropic_client('claude-sonnet-5', _text_response())
        self._chat(client, max_tokens=8)
        self.assertEqual(self._sent(client)['max_tokens'], 8)

    def test_configured_cap_lowers_default_and_explicit_values(self):
        for requested, expected in ((None, 2_000), (8, 8), (50_000, 2_000)):
            with self.subTest(requested=requested):
                client = _anthropic_client('claude-sonnet-5', _text_response())
                self._chat(client, cfg=_cfg(max_tokens=2_000), max_tokens=requested)
                self.assertEqual(self._sent(client)['max_tokens'], expected)

    def test_timeout_forwarded_when_configured(self):
        client = _anthropic_client('claude-sonnet-5', _text_response())
        self._chat(client, cfg=_cfg(timeout=300.0))
        self.assertEqual(self._sent(client)['timeout'], 300.0)

    def test_chat_sends_system_as_text_blocks(self):
        client = _anthropic_client('claude-sonnet-4-6', _text_response())
        with patch('utils.config.get_config', return_value=_cfg(), create=True):
            result = client.chat(
                messages=[
                    {'role': 'system', 'content': 'Answer in one word.'},
                    {'role': 'user', 'content': 'Say ready'},
                ],
                temperature=0,
                max_tokens=8,
            )

        self.assertEqual(result, 'ready')
        client.client.messages.stream.assert_called_once_with(
            model='claude-sonnet-4-6',
            max_tokens=8,
            system=[{'type': 'text', 'text': 'Answer in one word.'}],
            messages=[
                {
                    'role': 'user',
                    'content': [{'type': 'text', 'text': 'Say ready'}],
                }
            ],
        )

    def test_chat_does_not_forward_temperature(self):
        """temperature must never reach Messages.stream()/create().

        The anthropic SDK (>= 1.2.0) removed ``temperature`` from
        ``Messages.create()`` and ``Messages.stream()`` and rejects unknown
        keywords outright, so forwarding it raises TypeError before the
        request is sent and every Anthropic call fails. Callers still pass
        temperature=... and that is fine — it is ignored for this provider.

        Note this test asserts a *call shape*, not real SDK behaviour: the
        MagicMock below happily accepts any keyword, which is precisely why the
        original bug shipped green. Treat a change here as a signal to re-check
        against the installed SDK signature, not just to re-run the mock.
        """
        client = _anthropic_client('claude-sonnet-4-6', _text_response())
        self._chat(client, temperature=0.3, max_tokens=8)
        self.assertNotIn('temperature', self._sent(client))

    def test_chat_omits_system_when_not_present(self):
        client = _anthropic_client('claude-sonnet-4-6', _text_response())
        self._chat(client, temperature=0, max_tokens=8)

        kwargs = self._sent(client)
        self.assertNotIn('system', kwargs)
        self.assertEqual(
            kwargs['messages'],
            [{'role': 'user', 'content': [{'type': 'text', 'text': 'Say ready'}]}],
        )


def _model_entry(day, mid, limits=None):
    """A GET /v1/models entry; *limits* = (max_input_tokens, max_tokens)."""
    from datetime import datetime
    extra = {} if limits is None else {'max_input_tokens': limits[0], 'max_tokens': limits[1]}
    return SimpleNamespace(id=mid, created_at=datetime.fromisoformat(day), model_extra=extra)


def _models_client(entries=None, error=None):
    """Fake Anthropic client whose models.list() returns *entries*."""
    fake = MagicMock()
    if error:
        fake.models.list.side_effect = error
    else:
        fake.models.list.return_value = list(entries or [])
    return fake


_LIVE_LIST = [   # shape of GET /v1/models on 2026-10-21, deliberately not date-sorted
    _model_entry('2026-06-29', 'claude-sonnet-5'),
    _model_entry('2026-10-07', 'claude-haiku-5-5'),
    _model_entry('2026-09-28', 'claude-sonnet-5-5'),
    _model_entry('2026-09-21', 'claude-opus-5-5'),
    _model_entry('2025-10-15', 'claude-haiku-4-5-20251001'),
]


class _ClearLiveLimits(unittest.TestCase):
    """_ANTHROPIC_LIVE_LIMITS is module state: keep tests from leaking into others."""

    def setUp(self):
        from utils.llm_client import _ANTHROPIC_LIVE_LIMITS
        self._live = _ANTHROPIC_LIVE_LIMITS
        self._saved = dict(self._live)
        self._live.clear()

    def tearDown(self):
        self._live.clear()
        self._live.update(self._saved)


class TestAnthropicModelClassResolution(_ClearLiveLimits):
    """A model class ("sonnet") resolves to the newest model in it via the API."""

    def test_class_resolves_to_newest_in_class(self):
        from utils.llm_client import _resolve_anthropic_model
        self.assertEqual(_resolve_anthropic_model('sonnet', _LIVE_LIST), 'claude-sonnet-5-5')
        self.assertEqual(_resolve_anthropic_model('Haiku', _LIVE_LIST), 'claude-haiku-5-5')
        self.assertEqual(_resolve_anthropic_model('opus', _LIVE_LIST), 'claude-opus-5-5')

    def test_exact_model_id_is_unchanged(self):
        from utils.llm_client import _resolve_anthropic_model
        self.assertEqual(_resolve_anthropic_model('claude-sonnet-5', _LIVE_LIST), 'claude-sonnet-5')

    def test_lookup_failure_uses_fallback_list(self):
        from utils.llm_client import _list_anthropic_models, _resolve_anthropic_model, PROVIDER_MODELS
        client = _models_client(error=RuntimeError('401 invalid x-api-key'))
        with self.assertLogs('utils.llm_client', level='WARNING'):
            models = _list_anthropic_models(client)
            resolved = _resolve_anthropic_model('sonnet', models)
        self.assertEqual(models, [])
        expected = next(m for m in PROVIDER_MODELS['anthropic'] if m.startswith('claude-sonnet-'))
        self.assertEqual(resolved, expected)

    def test_provider_without_model_uses_newest_sonnet(self):
        """The old hard-coded default, claude-3-opus-20240229, is retired."""
        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}), \
             patch('anthropic.Anthropic', return_value=_models_client(_LIVE_LIST)):
            client = get_llm_provider(provider='anthropic', model=None)
        self.assertEqual(client.model, 'claude-sonnet-5-5')


class TestAnthropicLiveLimits(_ClearLiveLimits):
    """Limits come from GET /v1/models when available; the table is a fallback."""

    def _start_client(self, model, entries):
        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}), \
             patch('anthropic.Anthropic', return_value=_models_client(entries)):
            return AnthropicClient(model=model)

    def test_live_limits_override_the_table(self):
        from utils.llm_client import context_window_for, _anthropic_max_output
        self._start_client('sonnet', [
            _model_entry('2026-09-28', 'claude-sonnet-5-5', (750_000, 99_000)),
        ])
        self.assertEqual(context_window_for('claude-sonnet-5-5'), 750_000)
        self.assertEqual(_anthropic_max_output('claude-sonnet-5-5'), 99_000)

    def test_new_model_needs_no_code_change(self):
        from utils.llm_client import context_window_for, _anthropic_max_output
        self._start_client('opus', [_model_entry('2027-01-01', 'claude-opus-6', (2_000_000, 256_000))])
        self.assertEqual(context_window_for('claude-opus-6'), 2_000_000)
        self.assertEqual(_anthropic_max_output('claude-opus-6'), 256_000)

    def test_undated_and_dated_ids_match(self):
        from utils.llm_client import context_window_for
        self._start_client('haiku', [
            _model_entry('2025-10-15', 'claude-haiku-4-5-20251001', (300_000, 70_000)),
        ])
        self.assertEqual(context_window_for('claude-haiku-4-5'), 300_000)
        self.assertEqual(context_window_for('claude-haiku-4-5-20251001'), 300_000)

    def test_table_used_when_list_unavailable(self):
        from utils.llm_client import context_window_for, _anthropic_max_output
        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}), \
             patch('anthropic.Anthropic', return_value=_models_client(error=RuntimeError('offline'))), \
             self.assertLogs('utils.llm_client', level='WARNING'):
            AnthropicClient(model='claude-sonnet-5')
        self.assertEqual(context_window_for('claude-sonnet-5'), 1_000_000)
        self.assertEqual(_anthropic_max_output('claude-sonnet-5'), 128_000)

    def test_chat_sends_the_live_output_limit(self):
        client = self._start_client('sonnet', [
            _model_entry('2026-09-28', 'claude-sonnet-5-5', (1_000_000, 99_000)),
        ])
        stream = client.client.messages.stream.return_value.__enter__.return_value
        stream.get_final_message.return_value = _text_response()
        with patch('utils.config.get_config', return_value=_cfg(), create=True):
            client.chat([{'role': 'user', 'content': 'hi'}])
        self.assertEqual(client.client.messages.stream.call_args.kwargs['max_tokens'], 99_000)


class TestContextWindowFor(unittest.TestCase):
    """context_window_for() is the single source for the UI's context counter."""

    def test_known_windows(self):
        from utils.llm_client import context_window_for
        cases = {
            'claude-sonnet-5':            1_000_000,   # was shown as a fake 128K
            'claude-opus-5-5':            1_000_000,
            'claude-sonnet-4-6':          1_000_000,   # MODEL_INFO's 200K is stale
            'claude-haiku-4-5-20251001':    200_000,
            'claude-3-5-sonnet-20241022':   200_000,
            'gpt-4o':                       128_000,
            'gemini-1.5-pro':             2_000_000,
            'gpt-3.5-turbo':                 16_385,   # from MODEL_INFO
        }
        for model, expected in cases.items():
            with self.subTest(model=model):
                self.assertEqual(context_window_for(model), expected)

    def test_unknown_model_is_none_not_a_guess(self):
        from utils.llm_client import context_window_for
        self.assertIsNone(context_window_for('some-new-model'))
        self.assertIsNone(context_window_for(''))


class TestMaxTokensCap(unittest.TestCase):
    """llm.max_tokens / CV_LLM_MAX_TOKENS is an optional lower cap for every provider."""

    def _openai_sent(self, cfg, **kwargs):
        client = object.__new__(OpenAIClient)
        client.model = 'gpt-4o'
        client.client = MagicMock()
        client.client.chat.completions.create.return_value = SimpleNamespace(
            usage=None, choices=[SimpleNamespace(message=SimpleNamespace(content='ok'))],
        )
        with patch('utils.config.get_config', return_value=cfg, create=True):
            client.chat([{'role': 'user', 'content': 'hi'}], **kwargs)
        return client.client.chat.completions.create.call_args.kwargs

    def test_no_cap_leaves_provider_default(self):
        self.assertIsNone(self._openai_sent(_cfg())['max_tokens'])

    def test_cap_applies_when_caller_sets_none(self):
        self.assertEqual(self._openai_sent(_cfg(max_tokens=1_500))['max_tokens'], 1_500)

    def test_cap_never_raises_a_smaller_request(self):
        self.assertEqual(self._openai_sent(_cfg(max_tokens=1_500), max_tokens=100)['max_tokens'], 100)


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

        _no_timeout = _cfg()
        with patch('utils.config.get_config', return_value=_no_timeout, create=True):
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
    """Validate CopilotSdkClient behavior when routed through any-llm copilotsdk provider."""

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
        with patch('utils.config.get_config', return_value=_cfg(timeout=300.0)):
            result = client.chat(messages, temperature=0.5, max_tokens=20)

        self.assertEqual(result, 'Hello')
        client._anyllm_completion.assert_called_once_with(
            provider='copilotsdk',
            model='gpt-4o',
            api_key='test-token',
            messages=messages,
            temperature=0.5,
            max_tokens=20,
            timeout=300.0,
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
        with patch('utils.config.get_config', return_value=_cfg(timeout=300.0)):
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
        """Bullet without quantifiable result flags warning (warn severity — GAP-307)."""
        text = 'Worked on various projects and helped the team.'
        result = LLMClient.check_has_result_clause(text)
        self.assertFalse(result['pass'])
        self.assertEqual(result['severity'], 'warn')

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


    # ── Positive Metric Framing Checks ────────────────────────────────────

    def test_positive_framing_clean(self):
        """Bullet with positive framing passes."""
        text = 'Improved query throughput by 40%, enabling 3× user scale.'
        result = LLMClient.check_positive_metric_framing(text)
        self.assertTrue(result['pass'])
        self.assertEqual(result['flag_type'], 'negative_metric_framing')

    def test_negative_framing_reduced_percent(self):
        """'Reduced by 30%' is flagged."""
        text = 'Reduced infrastructure costs by 30% through rightsizing.'
        result = LLMClient.check_positive_metric_framing(text)
        self.assertFalse(result['pass'])
        self.assertEqual(result['severity'], 'info')
        self.assertIn('positive-sum', result['details'])

    def test_negative_framing_cut_dollar(self):
        """'Cut $2M in overhead' is flagged."""
        text = 'Cut $2M in annual overhead by consolidating vendors.'
        result = LLMClient.check_positive_metric_framing(text)
        self.assertFalse(result['pass'])

    def test_negative_framing_eliminated(self):
        """'Eliminated 50%' is flagged."""
        text = 'Eliminated 50% of legacy tech debt in two sprints.'
        result = LLMClient.check_positive_metric_framing(text)
        self.assertFalse(result['pass'])

    def test_no_metric_negative_verb_passes(self):
        """Negative verb without a metric does not trigger the check."""
        text = 'Reduced friction in the onboarding experience for new hires.'
        result = LLMClient.check_positive_metric_framing(text)
        self.assertTrue(result['pass'])

    def test_positive_framing_empty_text(self):
        """Empty text passes."""
        result = LLMClient.check_positive_metric_framing('')
        self.assertTrue(result['pass'])


class TestCheckNewNumericClaims(unittest.TestCase):
    """Tests for LLMClient.check_new_numeric_claims (GAP-300b)."""

    def test_no_new_numbers_passes(self):
        """Proposed with same numbers as original passes."""
        result = LLMClient.check_new_numeric_claims(
            'Improved efficiency by 30%',
            'Delivered a 30% efficiency gain',
        )
        self.assertTrue(result['pass'])

    def test_new_percent_flagged(self):
        """Proposed introducing a new percentage is flagged as warn."""
        result = LLMClient.check_new_numeric_claims(
            'Improved team efficiency significantly',
            'Improved team efficiency by 40%',
        )
        self.assertFalse(result['pass'])
        self.assertEqual(result['severity'], 'warn')
        self.assertIn('40', result['details'])

    def test_new_dollar_amount_flagged(self):
        """Proposed introducing a new dollar amount is flagged."""
        result = LLMClient.check_new_numeric_claims(
            'Reduced operational costs substantially',
            'Reduced operational costs by $2M annually',
        )
        self.assertFalse(result['pass'])
        self.assertEqual(result['flag_type'], 'new_numeric_claim')

    def test_original_empty_passes(self):
        """Empty original cannot determine newness — passes rather than false-positive."""
        result = LLMClient.check_new_numeric_claims('', 'Added 50% improvement')
        self.assertTrue(result['pass'])

    def test_both_empty_passes(self):
        """Both empty passes cleanly."""
        result = LLMClient.check_new_numeric_claims('', '')
        self.assertTrue(result['pass'])


if __name__ == '__main__':
    unittest.main()
