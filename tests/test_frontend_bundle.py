# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Regression tests for backend-managed frontend bundle freshness checks."""

import argparse
import json
import tempfile
import unittest
from contextlib import ExitStack
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.web_app import (
    _ensure_frontend_bundle_current,
    _frontend_bundle_built_at,
    _frontend_bundle_is_outdated,
    create_app,
    main,
)


SAMPLE_MASTER_DATA = {
    'personal_info': {
        'name': 'Jane Doe',
        'title': 'Engineer',
        'contact': {
            'email': 'jane@example.com',
            'phone': '555-123-4567',
            'address': {'city': 'Boston', 'state': 'MA'},
        },
    },
    'experiences': [],
    'education': [],
    'skills': [],
    'awards': [],
    'publications': [],
    'summaries': [],
}


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


def _touch(path: Path, mtime: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text('', encoding='utf-8')
    path.touch()
    path.chmod(0o644)
    import os
    os.utime(path, (mtime, mtime))


class TestFrontendBundleHelpers(unittest.TestCase):
    """Tests for stale-bundle detection and conditional rebuild behavior."""

    def test_bundle_missing_is_outdated(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _write_text(root / 'scripts' / 'build.mjs', 'console.log("build")\n')
            _write_text(root / 'web' / 'src' / 'main.js', 'console.log("src")\n')

            self.assertTrue(_frontend_bundle_is_outdated(root))

    def test_bundle_newer_than_inputs_is_not_outdated(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _touch(root / 'scripts' / 'build.mjs', 100)
            _touch(root / 'web' / 'src' / 'main.js', 100)
            _touch(root / 'web' / 'session-manager.js', 100)
            _touch(root / 'web' / 'bundle.js', 200)

            self.assertFalse(_frontend_bundle_is_outdated(root))

    def test_imported_module_newer_than_bundle_marks_outdated(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _touch(root / 'scripts' / 'build.mjs', 100)
            _write_text(
                root / 'web' / 'src' / 'main.js',
                "import '../session-manager.js';\n",
            )
            _touch(root / 'web' / 'src' / 'main.js', 100)
            _touch(root / 'web' / 'bundle.js', 150)
            _touch(root / 'web' / 'session-manager.js', 200)

            self.assertTrue(_frontend_bundle_is_outdated(root))

    def test_non_bundled_web_module_newer_than_bundle_does_not_mark_outdated(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _touch(root / 'scripts' / 'build.mjs', 100)
            _write_text(root / 'web' / 'src' / 'main.js', "console.log('main')\n")
            _touch(root / 'web' / 'src' / 'main.js', 100)
            _touch(root / 'web' / 'bundle.js', 150)
            _touch(root / 'web' / 'app.js', 200)

            self.assertFalse(_frontend_bundle_is_outdated(root))

    def test_ensure_bundle_current_rebuilds_only_when_stale(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _touch(root / 'scripts' / 'build.mjs', 100)
            _touch(root / 'web' / 'src' / 'main.js', 100)
            _touch(root / 'web' / 'bundle.js', 50)

            with patch('scripts.web_app.shutil.which', return_value='/usr/bin/node') as mock_which, \
                 patch('scripts.web_app.subprocess.run') as mock_run:
                mock_run.return_value.returncode = 0
                rebuilt = _ensure_frontend_bundle_current(root)

            self.assertTrue(rebuilt)
            mock_which.assert_called_once_with('node')
            mock_run.assert_called_once()
            self.assertEqual(mock_run.call_args.kwargs['cwd'], root)

    def test_ensure_bundle_current_skips_build_when_fresh(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _touch(root / 'scripts' / 'build.mjs', 100)
            _touch(root / 'web' / 'src' / 'main.js', 100)
            _touch(root / 'web' / 'bundle.js', 200)

            with patch('scripts.web_app.subprocess.run') as mock_run:
                rebuilt = _ensure_frontend_bundle_current(root)

            self.assertFalse(rebuilt)
            mock_run.assert_not_called()

    def test_bundle_built_at_uses_bundle_mtime(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _touch(root / 'web' / 'bundle.js', 1_700_000_000)
            expected = datetime.fromtimestamp(
                1_700_000_000,
                tz=timezone.utc,
            ).astimezone().isoformat(timespec='seconds')

            self.assertEqual(
                _frontend_bundle_built_at(root),
                expected,
            )


class TestCreateAppBundleIntegration(unittest.TestCase):
    """create_app should trigger the bundle freshness check during startup."""

    def _make_args(self, root: Path) -> argparse.Namespace:
        master_path = root / 'Master_CV_Data.json'
        master_path.write_text(json.dumps(SAMPLE_MASTER_DATA), encoding='utf-8')
        publications_path = root / 'publications.bib'
        publications_path.touch()

        return argparse.Namespace(
            llm_provider='local',
            model=None,
            master_data=str(master_path),
            publications=str(publications_path),
            output_dir=str(root / 'output'),
            job_file=None,
        )

    def _patch_app_dependencies(self, mock_llm: MagicMock) -> ExitStack:
        stack = ExitStack()
        stack.enter_context(
            patch('scripts.web_app.get_llm_provider', return_value=mock_llm)
        )
        stack.enter_context(
            patch('scripts.web_app.get_cached_pricing', return_value={})
        )
        stack.enter_context(
            patch(
                'scripts.web_app.get_pricing_updated_at',
                return_value='2024-01-01',
            )
        )
        stack.enter_context(
            patch('scripts.web_app.get_pricing_source', return_value='static')
        )
        self.addCleanup(stack.close)
        return stack

    def test_create_app_logs_bundle_rebuilt_status(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            args = self._make_args(root)

            mock_llm = MagicMock()
            mock_llm.model = 'local-model'

            self._patch_app_dependencies(mock_llm)

            with patch(
                'scripts.web_app._ensure_frontend_bundle_current',
                return_value=True,
            ) as ensure_bundle, patch(
                'scripts.web_app._frontend_bundle_built_at',
                return_value='2026-03-23T10:15:00-04:00',
            ) as bundle_built_at, patch(
                'scripts.web_app.logger.info',
            ) as log_info:
                app = create_app(args)

            self.assertIsNotNone(app)
            ensure_bundle.assert_called_once_with()
            bundle_built_at.assert_called_once_with()
            self.assertEqual(app.config['FRONTEND_BUNDLE_STATUS'], 'rebuilt')
            self.assertEqual(
                app.config['FRONTEND_BUNDLE_BUILT_AT'],
                '2026-03-23T10:15:00-04:00',
            )
            log_info.assert_any_call('Frontend bundle status: %s', 'rebuilt')
            log_info.assert_any_call(
                'Frontend bundle built at: %s',
                '2026-03-23T10:15:00-04:00',
            )

    def test_create_app_logs_bundle_already_current_status(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            args = self._make_args(root)

            mock_llm = MagicMock()
            mock_llm.model = 'local-model'

            self._patch_app_dependencies(mock_llm)

            with patch(
                'scripts.web_app._ensure_frontend_bundle_current',
                return_value=False,
            ) as ensure_bundle, patch(
                'scripts.web_app._frontend_bundle_built_at',
                return_value='2026-03-22T18:45:00-04:00',
            ) as bundle_built_at, patch(
                'scripts.web_app.logger.info',
            ) as log_info:
                app = create_app(args)

            self.assertIsNotNone(app)
            ensure_bundle.assert_called_once_with()
            bundle_built_at.assert_called_once_with()
            self.assertEqual(
                app.config['FRONTEND_BUNDLE_STATUS'],
                'already current',
            )
            self.assertEqual(
                app.config['FRONTEND_BUNDLE_BUILT_AT'],
                '2026-03-22T18:45:00-04:00',
            )
            log_info.assert_any_call(
                'Frontend bundle status: %s',
                'already current',
            )
            log_info.assert_any_call(
                'Frontend bundle built at: %s',
                '2026-03-22T18:45:00-04:00',
            )


class TestMainStartupBanner(unittest.TestCase):
    """main should print bundle startup metadata in startup output."""

    def test_main_banner_includes_bundle_status_and_build_date(self):
        args = argparse.Namespace(
            llm_provider='local',
            model='local-model',
            port=5050,
            master_data='/tmp/Master_CV_Data.json',
            output_dir='/tmp/output',
            publications='/tmp/publications.bib',
            job_file=None,
            debug=False,
        )
        config = argparse.Namespace(
            llm_provider='local',
            llm_model='local-model',
            web_host='127.0.0.1',
            debug=False,
        )
        app = MagicMock()
        app.config = {
            'FRONTEND_BUNDLE_STATUS': 'rebuilt',
            'FRONTEND_BUNDLE_BUILT_AT': '2026-03-23T10:15:00-04:00',
        }

        with patch('scripts.web_app.parse_args', return_value=args), patch(
            'scripts.web_app.get_config', return_value=config,
        ), patch('scripts.web_app.setup_logging'), patch(
            'scripts.web_app.create_app', return_value=app,
        ) as create_app_mock, patch(
            'builtins.print',
        ) as mock_print:
            main()

        create_app_mock.assert_called_once_with(args)
        app.run.assert_called_once_with(
            host='127.0.0.1',
            port=5050,
            debug=False,
        )
        banner_text = mock_print.call_args.args[0]
        self.assertIn('│ bundle   │ rebuilt', banner_text)
        self.assertIn('│ built at │ 2026-03-23T10:15:00-04:00', banner_text)
