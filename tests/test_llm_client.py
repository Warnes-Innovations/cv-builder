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
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.llm_client import LLMClient, OpenAIClient


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

        result = self.client.propose_rewrites(SAMPLE_CONTENT, SAMPLE_JOB_ANALYSIS)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['id'], 'bullet_exp002_0')


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


if __name__ == '__main__':
    unittest.main()
