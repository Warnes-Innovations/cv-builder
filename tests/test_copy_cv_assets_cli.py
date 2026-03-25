# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Unit tests for scripts/copy_cv_assets.py."""

from __future__ import annotations

import io
import json
import runpy
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = ROOT / 'scripts' / 'copy_cv_assets.py'


class TestCopyCvAssetsCli(unittest.TestCase):

    def _run_script(self, argv: list[str]) -> tuple[int, str]:
        old_argv = sys.argv[:]
        try:
            sys.argv = ['copy_cv_assets.py', *argv]
            out = io.StringIO()
            err = io.StringIO()
            with redirect_stdout(out), redirect_stderr(err):
                with self.assertRaises(SystemExit) as cm:
                    runpy.run_path(str(SCRIPT_PATH), run_name='__main__')
            exit_code = cm.exception.code
            if not isinstance(exit_code, int):
                raise AssertionError(f'unexpected exit code: {exit_code!r}')
            return exit_code, out.getvalue() + err.getvalue()
        finally:
            sys.argv = old_argv

    def test_parse_args_defaults_output_dir_to_current_directory(self):
        script_module = runpy.run_path(str(SCRIPT_PATH))
        parse_args = script_module['parse_args']

        args = parse_args(['--example', 'medium'])

        self.assertEqual(args.example, 'medium')
        self.assertEqual(args.output_dir, '.')

    def test_cli_copies_example_profile_to_requested_output_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir) / 'copied'

            code, output = self._run_script([
                '--example', 'simple',
                '--output-dir', str(output_dir),
                '--json',
            ])

            self.assertEqual(code, 0)
            payload = json.loads(output)
            self.assertEqual(Path(payload['output_dir']), output_dir.resolve())
            self.assertTrue((output_dir / 'Master_CV_Data.json').exists())
            self.assertTrue((output_dir / 'publications.bib').exists())

    def test_cli_copies_from_existing_source_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            source_dir = Path(tmpdir) / 'source'
            output_dir = Path(tmpdir) / 'output'
            source_dir.mkdir()
            (source_dir / 'Master_CV_Data.json').write_text(
                '{"skills": ["Python"]}',
                encoding='utf-8',
            )
            (source_dir / 'publications.bib').write_text(
                '@article{demo,title={Demo}}',
                encoding='utf-8',
            )

            code, output = self._run_script([
                '--path', str(source_dir),
                '--output-dir', str(output_dir),
                '--json',
            ])

            self.assertEqual(code, 0)
            payload = json.loads(output)
            self.assertEqual(Path(payload['source_dir']), source_dir.resolve())
            self.assertEqual(
                (output_dir / 'Master_CV_Data.json').read_text(
                    encoding='utf-8'
                ),
                '{"skills": ["Python"]}',
            )

    def test_cli_refuses_to_overwrite_existing_assets(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            (output_dir / 'Master_CV_Data.json').write_text(
                '{"existing": true}',
                encoding='utf-8',
            )

            code, output = self._run_script([
                '--example', 'medium',
                '--output-dir', str(output_dir),
            ])

            self.assertNotEqual(code, 0)
            self.assertIn('Destination already contains', output)


if __name__ == '__main__':
    unittest.main()
