# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Unit tests for scripts/benchmark_cv_render.py."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch


MODULE_PATH = (
    Path(__file__).resolve().parents[1] / 'scripts' / 'benchmark_cv_render.py'
)
spec = importlib.util.spec_from_file_location(
    'benchmark_cv_render',
    MODULE_PATH,
)
assert spec is not None
assert spec.loader is not None
benchmark_cv_render = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark_cv_render)


class _FailingOrchestrator:
    def render_html_preview(self, **_kwargs):
        return '<div class="page">preview</div>'

    def generate_final_from_confirmed_html(self, **_kwargs):
        raise RuntimeError('weasyprint crashed')


class _UnusedOrchestrator:
    def render_html_preview(self, **_kwargs):
        raise AssertionError('render_html_preview should not be called')

    def generate_final_from_confirmed_html(self, **_kwargs):
        raise AssertionError(
            'generate_final_from_confirmed_html should not be called'
        )


class TestBenchmarkCvRender(unittest.TestCase):
    def test_run_once_records_structured_failure_row(self):
        fixture_root = Path(tempfile.mkdtemp(prefix='bench-fixture-test-'))

        try:
            with patch.object(
                benchmark_cv_render,
                '_make_orchestrator',
                return_value=(_FailingOrchestrator(), fixture_root),
            ):
                result = benchmark_cv_render._run_once(
                    'complex',
                    keep=True,
                    renderer='weasyprint',
                )
        finally:
            if fixture_root.exists():
                for path in sorted(fixture_root.rglob('*'), reverse=True):
                    if path.is_file():
                        path.unlink()
                    elif path.is_dir():
                        path.rmdir()
                fixture_root.rmdir()

        self.assertEqual(result['status'], 'error')
        self.assertEqual(result['requested_renderer'], 'weasyprint')
        self.assertEqual(result['error_type'], 'RuntimeError')
        self.assertIn('weasyprint crashed', result['error_message'])
        self.assertIsNotNone(result['html_seconds'])
        self.assertIsNotNone(result['pdf_seconds'])
        self.assertEqual(result['html_pages_hint'], 1)
        self.assertIn('paths', result)
        self.assertTrue(result['paths']['html'].endswith('benchmark_cv.html'))

    def test_benchmark_profile_summarizes_only_successes(self):
        fake_results = [
            {
                'status': 'ok',
                'requested_renderer': 'auto',
                'html_seconds': 1.0,
                'pdf_seconds': 2.0,
                'total_seconds': 3.0,
                'html_bytes': 10,
                'pdf_bytes': 20,
                'html_pages_hint': 1,
                'pdf_renderer': 'chrome',
                'pdf_renderer_detail': 'chrome-bin',
                'error_type': None,
                'error_message': None,
            },
            {
                'status': 'error',
                'requested_renderer': 'auto',
                'html_seconds': 0.5,
                'pdf_seconds': 0.25,
                'total_seconds': 0.75,
                'html_bytes': 10,
                'pdf_bytes': None,
                'html_pages_hint': 1,
                'pdf_renderer': None,
                'pdf_renderer_detail': None,
                'error_type': 'RuntimeError',
                'error_message': 'boom',
            },
        ]

        with patch.object(
            benchmark_cv_render,
            '_run_once',
            side_effect=fake_results,
        ):
            output = benchmark_cv_render._benchmark_profile(
                'complex',
                iterations=2,
                renderer='auto',
            )

        self.assertEqual(output['successful_runs'], 1)
        self.assertEqual(output['failed_runs'], 1)
        self.assertEqual(output['html_seconds']['mean'], 1.0)
        self.assertEqual(output['pdf_seconds']['mean'], 2.0)
        self.assertEqual(output['last_run_artifacts']['status'], 'error')
        self.assertEqual(
            output['last_run_artifacts']['error_type'],
            'RuntimeError',
        )

    def test_summarize_returns_none_when_no_successful_values(self):
        output = benchmark_cv_render._summarize(
            [
                {
                    'status': 'error',
                    'html_seconds': None,
                }
            ],
            'html_seconds',
        )

        self.assertIsNone(output)

    def test_render_pdf_from_html_supports_external_weasyprint(self):
        html_path = Path(tempfile.mkdtemp(prefix='bench-html-')) / 'input.html'
        pdf_path = html_path.parent / 'output.pdf'
        html_path.write_text(
            '<html><body>hello</body></html>',
            encoding='utf-8',
        )

        def _fake_run(command, **_kwargs):
            Path(command[4]).write_bytes(b'%PDF-1.4\n%%EOF\n')
            return MagicMock(returncode=0, stderr=b'')

        with patch.object(
            benchmark_cv_render.subprocess,
            'run',
            side_effect=_fake_run,
        ) as mock_run:
            result = benchmark_cv_render._render_pdf_from_html(
                html_path,
                pdf_path,
                renderer='weasyprint-external',
                external_weasyprint_python='/tmp/weasyprint-venv/bin/python',
            )

        self.assertEqual(result['renderer'], 'weasyprint-external')
        self.assertEqual(
            result['renderer_detail'],
            '/tmp/weasyprint-venv/bin/python',
        )
        self.assertTrue(pdf_path.exists())
        mock_run.assert_called_once()

    def test_run_once_can_benchmark_existing_html_input(self):
        temp_dir = Path(tempfile.mkdtemp(prefix='bench-html-input-'))
        html_path = temp_dir / 'input.html'
        html_path.write_text('<div class="page">saved</div>', encoding='utf-8')

        def _fake_run(command, **_kwargs):
            pdf_target = next(
                arg.split('=', 1)[1]
                for arg in command
                if arg.startswith('--print-to-pdf=')
            )
            Path(pdf_target).write_bytes(b'%PDF-1.4\n%%EOF\n')
            return MagicMock(returncode=0)

        try:
            with patch.object(
                benchmark_cv_render,
                '_make_orchestrator',
                return_value=(_UnusedOrchestrator(), temp_dir),
            ):
                with patch.object(
                    benchmark_cv_render.subprocess,
                    'run',
                    side_effect=_fake_run,
                ):
                    result = benchmark_cv_render._run_once(
                        None,
                        keep=True,
                        renderer='chrome',
                        html_input=str(html_path),
                    )
        finally:
            for path in sorted(temp_dir.rglob('*'), reverse=True):
                if path.is_file():
                    path.unlink()
                elif path.is_dir():
                    path.rmdir()
            temp_dir.rmdir()

        self.assertEqual(result['status'], 'ok')
        self.assertEqual(result['requested_renderer'], 'chrome')
        self.assertEqual(result['html_seconds'], 0.0)
        self.assertEqual(result['html_pages_hint'], 1)
        self.assertEqual(result['pdf_renderer'], 'chrome')

    def test_run_once_html_input_without_keep_cleans_render_dir(
        self,
    ):
        temp_dir = Path(tempfile.mkdtemp(prefix='bench-html-input-nokeep-'))
        html_path = temp_dir / 'input.html'
        html_path.write_text('<div class="page">saved</div>', encoding='utf-8')

        def _fake_run(command, **_kwargs):
            pdf_target = next(
                arg.split('=', 1)[1]
                for arg in command
                if arg.startswith('--print-to-pdf=')
            )
            Path(pdf_target).write_bytes(b'%PDF-1.4\n%%EOF\n')
            return MagicMock(returncode=0)

        try:
            with patch.object(
                benchmark_cv_render.subprocess,
                'run',
                side_effect=_fake_run,
            ):
                result = benchmark_cv_render._run_once(
                    None,
                    keep=False,
                    renderer='chrome',
                    html_input=str(html_path),
                )
        finally:
            for path in sorted(temp_dir.rglob('*'), reverse=True):
                if path.is_file():
                    path.unlink()
                elif path.is_dir():
                    path.rmdir()
            temp_dir.rmdir()

        self.assertEqual(result['status'], 'ok')
        self.assertEqual(result['html_seconds'], 0.0)


if __name__ == '__main__':
    unittest.main()
