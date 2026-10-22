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

    def test_empty_and_malformed_input(self):
        self.assertEqual(_approved_rewrite_skip_warnings([]), [])
        self.assertEqual(_approved_rewrite_skip_warnings(None), [])
        self.assertEqual(_approved_rewrite_skip_warnings(['not a dict']), [])


if __name__ == '__main__':
    unittest.main()
