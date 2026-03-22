# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Unit tests for scripts/validate_master_data.py CLI wrapper."""

import io
import json
import runpy
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = ROOT / 'scripts' / 'validate_master_data.py'


class TestValidateMasterDataCli(unittest.TestCase):

    def _run_script(self, argv):
        old_argv = sys.argv[:]
        try:
            sys.argv = ['validate_master_data.py', *argv]
            out = io.StringIO()
            with redirect_stdout(out):
                with self.assertRaises(SystemExit) as cm:
                    runpy.run_path(str(SCRIPT_PATH), run_name='__main__')
            return cm.exception.code, out.getvalue()
        finally:
            sys.argv = old_argv

    def test_cli_json_success_output_and_exit_zero(self):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            f.write(json.dumps({'skills': ['Python']}))
            master_path = f.name

        code, output = self._run_script([
            '--master-data', master_path,
            '--no-schema',
            '--json',
        ])

        self.assertEqual(code, 0)
        payload = json.loads(output)
        self.assertTrue(payload['valid'])
        self.assertEqual(payload['errors'], [])

    def test_cli_invalid_json_exit_one(self):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            f.write('{ not-json ]')
            master_path = f.name

        code, output = self._run_script([
            '--master-data', master_path,
            '--json',
        ])

        self.assertEqual(code, 1)
        payload = json.loads(output)
        self.assertFalse(payload['valid'])
        self.assertTrue(payload['errors'])

    def test_cli_plain_text_output(self):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            f.write(json.dumps({'skills': ['Python']}))
            master_path = f.name

        code, output = self._run_script([
            '--master-data', master_path,
            '--no-schema',
        ])

        self.assertEqual(code, 0)
        self.assertIn('Master data validation: VALID', output)
        self.assertIn('File:', output)

    def test_cli_no_schema_flag_is_forwarded(self):
        script_module = runpy.run_path(str(SCRIPT_PATH))
        main = script_module['main']

        fake_result = type(
            'FakeResult',
            (),
            {
                'valid': True,
                'errors': [],
                'warnings': [],
                'checked_path': '/tmp/master.json',
                'schema_path': '/tmp/schema.json',
                'to_dict': lambda self: {
                    'valid': True,
                    'errors': [],
                    'warnings': [],
                    'checked_path': '/tmp/master.json',
                    'schema_path': '/tmp/schema.json',
                },
            },
        )()

        with patch.object(sys, 'argv', ['validate_master_data.py', '--no-schema']), \
             patch.dict(main.__globals__, {'_load_validate_master_data_file': lambda: lambda *a, **k: fake_result}), \
             patch('builtins.print'):
            rc = main()

        self.assertEqual(rc, 0)


if __name__ == '__main__':
    unittest.main()
