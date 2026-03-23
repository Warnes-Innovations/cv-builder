#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
CV Builder Testing Framework - Main Test Runner

Comprehensive testing suite that runs all test categories:
- Unit tests (individual components)
- Integration tests (API endpoints)
- End-to-end tests (complete workflows)
- Performance tests (PDF/DOCX generation)
"""

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

# Add scripts to Python path
sys.path.insert(0, str(Path(__file__).parent / 'scripts'))


class TestRunner:
    """Orchestrates all CV Builder tests with proper setup and teardown."""

    def __init__(
        self,
        verbose: bool = False,
        llm_provider: Optional[str] = None,
        llm_model: Optional[str] = None,
    ):
        self.verbose = verbose
        self.llm_provider = llm_provider
        self.llm_model = llm_model
        self.results: Dict[str, Dict[str, bool]] = {}
        self.start_time = time.time()

    def ensure_conda_env(self):
        """Ensure we're in the correct conda environment."""
        current_env = os.environ.get('CONDA_DEFAULT_ENV', '')
        if current_env != 'cvgen':
            print("⚠️  Warning: Not in 'cvgen' conda environment")
            print("   Please run: conda activate cvgen")
            return False
        return True

    def run_unit_tests(self) -> Dict[str, bool]:
        """Run unit tests (components that don't need web server)."""
        print("\n🧪 Running Unit Tests")
        print("=" * 50)

        unit_tests = [
            'tests/test_copilot_auth.py',
            'tests/test_url_fetch.py',
            'tests/test_scoring.py',
            'tests/test_template_renderer.py',
            'tests/test_cv_orchestrator.py',
        ]

        results = {}
        for test_file in unit_tests:
            if Path(test_file).exists():
                success = self._run_test_file(test_file)
                results[test_file] = success
            else:
                print(f"⚠️  {test_file} not found")
                results[test_file] = False

        return results

    def run_component_tests(self) -> Dict[str, bool]:
        """Run component tests (PDF generation, ATS, etc.)."""
        print("\n📄 Running Component Tests")
        print("=" * 50)

        component_tests = [
            'tests/test_ats_generation.py',
        ]

        results = {}
        for test_file in component_tests:
            if Path(test_file).exists():
                success = self._run_test_file(test_file)
                results[test_file] = success
            else:
                print(f"⚠️  {test_file} not found")
                results[test_file] = False

        return results

    def run_integration_tests(self) -> Dict[str, bool]:
        """Run integration tests with pytest-managed server fixtures."""
        print("\n🌐 Running Integration Tests")
        print("=" * 50)

        integration_tests = [
            'tests/test_enhanced_job_input.py',
            'tests/test_linkedin_url_handling.py',
            'tests/test_user_linkedin_url.py',
            'tests/test_web_ui_workflow.py',
        ]

        results = {}
        for test_file in integration_tests:
            if Path(test_file).exists():
                success = self._run_pytest_file(test_file)
                results[test_file] = success
            else:
                print(f"⚠️  {test_file} not found")
                results[test_file] = False

        return results

    def run_non_ui_tests(self) -> Dict[str, bool]:
        """Run the full non-UI pytest suite."""
        print("\n🧪 Running Full Non-UI Suite")
        print("=" * 50)

        success = self._run_pytest_args(
            ['tests', '--ignore=tests/ui', '-q', '--tb=short', '-ra'],
            label='tests (non-ui)',
            timeout=600,
        )
        return {'tests (non-ui)': success}

    def run_ui_tests(self) -> Dict[str, bool]:
        """Run Playwright UI tests (browser automation)."""
        print("\n🎭 Running UI Tests (Playwright)")
        print("=" * 50)

        ui_test_dir = Path('tests/ui')
        if not ui_test_dir.exists():
            print("⚠️  tests/ui/ directory not found")
            return {}

        try:
            result = subprocess.run(
                [
                    sys.executable,
                    '-m',
                    'pytest',
                    'tests/ui/',
                    '-q',
                    '--tb=short',
                    '-ra',
                ],
                check=False,
                capture_output=not self.verbose,
                text=True,
                timeout=600,
            )
            success = result.returncode == 0
            if success:
                print("✅ UI tests passed")
            else:
                print("❌ UI tests failed")
                if not self.verbose and result.stdout:
                    print(result.stdout[-3000:])  # last 3k chars
                if not self.verbose and result.stderr:
                    print(result.stderr[-1000:])
            return {'tests/ui/': success}
        except subprocess.TimeoutExpired:
            print("⏰ UI tests timed out")
            return {'tests/ui/': False}
        except OSError as error:
            print(f"💥 UI tests crashed: {error}")
            return {'tests/ui/': False}

    def _run_test_file(self, test_file: str) -> bool:
        """Run a specific test file and return success status."""
        print(f"\n🔍 Running {test_file}...")

        try:
            result = subprocess.run(
                [sys.executable, test_file],
                check=False,
                capture_output=True,
                text=True,
                timeout=120,
            )

            if result.returncode == 0:
                print(f"✅ {test_file} passed")
                if self.verbose:
                    print("STDOUT:", result.stdout)
                return True
            else:
                print(f"❌ {test_file} failed")
                print("STDERR:", result.stderr)
                if result.stdout:
                    print("STDOUT:", result.stdout)
                return False

        except subprocess.TimeoutExpired:
            print(f"⏰ {test_file} timed out")
            return False
        except OSError as error:
            print(f"💥 {test_file} crashed: {error}")
            return False

    def _run_pytest_file(self, test_file: str) -> bool:
        """Run a pytest-based test file and return success status."""
        return self._run_pytest_args(
            [test_file, '-q', '--tb=short', '-ra'],
            label=test_file,
            timeout=300,
        )

    def _run_pytest_args(
        self,
        pytest_args: List[str],
        label: str,
        timeout: int,
    ) -> bool:
        """Run pytest with custom arguments and return success status."""
        print(f"\n🔍 Running {label} with pytest...")

        try:
            result = subprocess.run(
                [sys.executable, '-m', 'pytest', *pytest_args],
                check=False,
                capture_output=not self.verbose,
                text=True,
                timeout=timeout,
            )

            if result.returncode == 0:
                print(f"✅ {label} passed")
                if self.verbose and result.stdout:
                    print("STDOUT:", result.stdout)
                return True

            print(f"❌ {label} failed")
            if result.stdout:
                print(result.stdout[-3000:])
            if result.stderr:
                print(result.stderr[-1000:])
            return False

        except subprocess.TimeoutExpired:
            print(f"⏰ {label} timed out")
            return False
        except OSError as error:
            print(f"💥 {label} crashed: {error}")
            return False

    def run_all_tests(self, categories: Optional[List[str]] = None):
        """Run all test categories."""
        if not self.ensure_conda_env():
            print("❌ Please activate the 'cvgen' conda environment first")
            return False

        print("🧪 CV Builder Test Suite")
        print("=" * 60)
        print(f"Started at: {time.strftime('%Y-%m-%d %H:%M:%S')}")

        # Default to the full pytest baseline if no categories are specified.
        if not categories:
            categories = ['non-ui', 'ui']

        if 'non-ui' in categories:
            self.results['non_ui'] = self.run_non_ui_tests()

        # Run unit tests (no server needed)
        if 'unit' in categories:
            self.results['unit'] = self.run_unit_tests()

        # Run component tests (no server needed)
        if 'component' in categories:
            self.results['component'] = self.run_component_tests()

        # Run integration tests; pytest fixtures manage any required server.
        if 'integration' in categories:
            self.results['integration'] = self.run_integration_tests()

        # Run UI tests; Playwright server lifecycle is handled in conftest.py.
        if 'ui' in categories:
            self.results['ui'] = self.run_ui_tests()

        self.print_summary()
        return self._overall_success()

    def print_summary(self):
        """Print test results summary."""
        print("\n📊 Test Results Summary")
        print("=" * 60)

        total_tests = 0
        passed_tests = 0

        for category, tests in self.results.items():
            print(f"\n{category.upper()} TESTS:")
            for test_name, success in tests.items():
                status = "✅ PASS" if success else "❌ FAIL"
                print(f"  {test_name}: {status}")
                total_tests += 1
                if success:
                    passed_tests += 1

        elapsed = time.time() - self.start_time
        print(f"\n⏱️  Total time: {elapsed:.2f}s")
        print(f"📈 Results: {passed_tests}/{total_tests} tests passed")

        if passed_tests == total_tests:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {total_tests - passed_tests} test(s) failed")

    def _overall_success(self) -> bool:
        """Return True if all tests passed."""
        for tests in self.results.values():
            for success in tests.values():
                if not success:
                    return False
        return True


def main():
    """Main entry point with command-line argument parsing."""
    parser = argparse.ArgumentParser(description='CV Builder Test Runner')
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='Verbose output',
    )
    parser.add_argument(
        '--categories',
        '-c',
        nargs='+',
        choices=['non-ui', 'unit', 'component', 'integration', 'ui'],
        help='Test categories to run (default: full non-ui + ui suites)',
    )
    parser.add_argument(
        '--list',
        '-l',
        action='store_true',
        help='List available test files',
    )
    parser.add_argument(
        '--llm-provider',
        choices=[
            'copilot-oauth',
            'copilot',
            'github',
            'openai',
            'anthropic',
            'gemini',
            'groq',
            'local',
            'copilot-sdk',
        ],
        help='Retained for CLI compatibility; test fixtures manage providers.',
    )
    parser.add_argument(
        '--llm-model',
        help='Retained for CLI compatibility.',
    )

    args = parser.parse_args()

    if args.list:
        print("Available test files:")
        for test_file in sorted(Path('tests').glob('test_*.py')):
            print(f"  {test_file}")
        return

    runner = TestRunner(
        verbose=args.verbose,
        llm_provider=args.llm_provider,
        llm_model=args.llm_model,
    )
    success = runner.run_all_tests(args.categories)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()