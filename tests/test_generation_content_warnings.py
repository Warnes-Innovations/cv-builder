# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for the content warning that reports approved rewrites which
generation will skip (scripts/routes/generation_routes.py).

An approved rewrite that fails LLMClient.apply_rewrite_constraints is skipped
by CVOrchestrator.apply_approved_rewrites with only a log line; the person
must be told, or "approved" and "applied" silently differ.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from routes.generation_routes import _approved_rewrite_skip_warnings


class TestApprovedRewriteSkipWarnings(unittest.TestCase):

    def test_rewrite_that_drops_a_name_is_reported(self):
        approved = [{
            'id': 'bullet_exp001_0',
            'type': 'bullet',
            'location': 'exp_001.achievements[0]',
            'original': 'Built dashboards for Pfizer clinical teams.',
            'proposed': 'Built dashboards for clinical teams.',
        }]
        warnings = _approved_rewrite_skip_warnings(approved)
        self.assertEqual(len(warnings), 1)
        self.assertEqual(warnings[0]['code'], 'approved_rewrite_skipped')
        self.assertEqual(warnings[0]['severity'], 'warning')
        self.assertIn('exp_001.achievements[0]', warnings[0]['message'])

    def test_valid_rewrite_is_not_reported(self):
        approved = [{
            'id': 'bullet_exp001_0',
            'type': 'bullet',
            'location': 'exp_001.achievements[0]',
            'original': 'Translated requirements into features.',
            'proposed': 'Converted requirements into features.',
        }]
        self.assertEqual(_approved_rewrite_skip_warnings(approved), [])

    def test_skipped_skill_rename_is_reported(self):
        approved = [{'id': 'skill_1', 'type': 'skill_rename',
                     'original': 'Tableau', 'proposed': 'Power BI'}]
        self.assertEqual(len(_approved_rewrite_skip_warnings(approved)), 1)

    def test_warnings_match_orchestrator_skips(self):
        """The warning and the orchestrator's skip use the same predicate."""
        from utils.cv_orchestrator import CVOrchestrator
        approved = [
            {'id': 'keep', 'type': 'summary', 'location': 'summary',
             'original': 'Statistician with 20 years at Pfizer.',
             'proposed': 'Data scientist with 20 years at Pfizer.'},
            {'id': 'drop', 'type': 'summary', 'location': 'summary-drop',
             'original': 'Statistician with 20 years at Pfizer.',
             'proposed': 'Statistician with 20 years.'},
            {'id': 'skill', 'type': 'skill_rename', 'location': 'skills-tableau',
             'original': 'Tableau', 'proposed': 'Power BI'},
        ]
        orchestrator = CVOrchestrator.__new__(CVOrchestrator)
        content = {'summary': approved[0]['original'], 'skills': [{'name': 'Tableau'}]}
        applied = []
        for item in approved:
            result = orchestrator.apply_approved_rewrites(content, [item])
            if (result['summary'] == item['proposed']
                    or result['skills'][0]['name'] == item['proposed']):
                applied.append(item['id'])
        warned = [w['message'] for w in _approved_rewrite_skip_warnings(approved)]
        self.assertEqual(applied, ['keep'])
        self.assertEqual(len(warned), 2)
        self.assertIn('summary-drop', warned[0])
        self.assertIn('skills-tableau', warned[1])

    def test_empty_and_malformed_input(self):
        self.assertEqual(_approved_rewrite_skip_warnings([]), [])
        self.assertEqual(_approved_rewrite_skip_warnings(None), [])
        self.assertEqual(_approved_rewrite_skip_warnings(['not a dict']), [])


if __name__ == '__main__':
    unittest.main()
