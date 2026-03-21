# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Tests for master-data validation hooks in app loaders."""

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.generate_cv import load_master_data
from scripts.utils.cv_orchestrator import CVOrchestrator
from scripts.utils.master_data_validator import ValidationResult


class TestGenerateCvLoaderValidation(unittest.TestCase):

    def test_load_master_data_calls_validator_before_read(self):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            f.write(json.dumps({'skills': ['Python']}))
            path = f.name

        with patch(
            'scripts.generate_cv.validate_master_data_file',
            return_value=ValidationResult(valid=True),
        ) as mock_validate:
            data = load_master_data(path)

        self.assertEqual(data['skills'], ['Python'])
        mock_validate.assert_called_once_with(path, use_schema=True)

    def test_load_master_data_raises_when_validation_fails(self):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            f.write(json.dumps({'skills': []}))
            path = f.name

        with patch(
            'scripts.generate_cv.validate_master_data_file',
            return_value=ValidationResult(
                valid=False,
                errors=['experience must be a list'],
            ),
        ):
            with self.assertRaises(ValueError):
                load_master_data(path)


class TestCvOrchestratorLoaderValidation(unittest.TestCase):

    def test_orchestrator_calls_validator_on_init(self):
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'master.json'
            pubs_path = Path(td) / 'pubs.bib'
            master_path.write_text(json.dumps({'skills': []}), encoding='utf-8')
            pubs_path.write_text('', encoding='utf-8')

            with patch(
                'scripts.utils.cv_orchestrator.validate_master_data_file',
                return_value=ValidationResult(valid=True),
            ) as mock_validate:
                CVOrchestrator(
                    str(master_path),
                    str(pubs_path),
                    td,
                    MagicMock(),
                )

            mock_validate.assert_called_once_with(str(master_path), use_schema=True)

    def test_orchestrator_init_raises_when_validation_fails(self):
        with tempfile.TemporaryDirectory() as td:
            master_path = Path(td) / 'master.json'
            pubs_path = Path(td) / 'pubs.bib'
            master_path.write_text(json.dumps({'skills': []}), encoding='utf-8')
            pubs_path.write_text('', encoding='utf-8')

            with patch(
                'scripts.utils.cv_orchestrator.validate_master_data_file',
                return_value=ValidationResult(
                    valid=False,
                    errors=['personal_info must be an object'],
                ),
            ):
                with self.assertRaises(ValueError):
                    CVOrchestrator(
                        str(master_path),
                        str(pubs_path),
                        td,
                        MagicMock(),
                    )


if __name__ == '__main__':
    unittest.main()
