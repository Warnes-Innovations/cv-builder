# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Regression tests for the top-level run_tests.py harness."""

import unittest
from unittest.mock import patch

import run_tests


class TestRunTestsIntegrationHarness(unittest.TestCase):
    """Ensure integration tests run via pytest-aware paths."""

    def test_run_integration_tests_uses_pytest_runner(self):
        runner = run_tests.TestRunner()

        with patch.object(
            run_tests.Path, 'exists', return_value=True
        ), patch.object(
            runner, '_run_pytest_file', return_value=True
        ) as mock_pytest, patch.object(
            runner, '_run_test_file', return_value=True
        ) as mock_raw:
            results = runner.run_integration_tests()

        self.assertEqual(mock_pytest.call_count, 4)
        mock_raw.assert_not_called()
        self.assertTrue(all(results.values()))

    def test_run_all_tests_does_not_gate_integration_on_server_start(self):
        runner = run_tests.TestRunner()

        with patch.object(
            runner, 'ensure_conda_env', return_value=True
        ), patch.object(
            runner,
            'run_integration_tests',
            return_value={'integration': True},
        ), patch.object(
            runner, 'print_summary'
        ), patch.object(
            runner, '_overall_success', return_value=True
        ):
            success = runner.run_all_tests(['integration'])

        self.assertTrue(success)

    def test_run_all_tests_defaults_to_full_non_ui_and_ui_suites(self):
        runner = run_tests.TestRunner()

        with patch.object(
            runner, 'ensure_conda_env', return_value=True
        ), patch.object(
            runner, 'run_non_ui_tests', return_value={'tests (non-ui)': True}
        ) as mock_non_ui, patch.object(
            runner, 'run_ui_tests', return_value={'tests/ui/': True}
        ) as mock_ui, patch.object(
            runner, 'run_unit_tests'
        ) as mock_unit, patch.object(
            runner, 'run_component_tests'
        ) as mock_component, patch.object(
            runner, 'run_integration_tests'
        ) as mock_integration, patch.object(
            runner, 'print_summary'
        ), patch.object(
            runner, '_overall_success', return_value=True
        ):
            success = runner.run_all_tests()

        self.assertTrue(success)
        mock_non_ui.assert_called_once_with()
        mock_ui.assert_called_once_with()
        mock_unit.assert_not_called()
        mock_component.assert_not_called()
        mock_integration.assert_not_called()


if __name__ == '__main__':
    unittest.main()
