# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Unit tests for model catalog helper discovery behavior."""

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from scripts.web_app import (
    _CATALOG_LIST_MODELS_CAPABLE,
    _catalog_anyllm_provider,
    _catalog_discover_provider_models,
)


class TestModelCatalogHelpers(unittest.TestCase):
    """Validate runtime model discovery helper behavior."""

    def test_catalog_marks_copilot_sdk_as_list_models_capable(self):
        """copilot-sdk should be eligible for runtime list_models discovery."""
        self.assertIn('copilot-sdk', _CATALOG_LIST_MODELS_CAPABLE)

    def test_catalog_maps_copilot_sdk_provider_name(self):
        """cv-builder provider key should map to any-llm provider slug."""
        self.assertEqual(_catalog_anyllm_provider('copilot-sdk'), 'copilotsdk')
        self.assertEqual(_catalog_anyllm_provider('openai'), 'openai')

    def test_copilot_sdk_discovery_does_not_require_api_key(self):
        """copilot-sdk list_models should run without token when CLI auth exists."""
        mock_list_models = MagicMock(
            return_value=[
                SimpleNamespace(id='gpt-4o'),
                SimpleNamespace(id='claude-3-7-sonnet'),
                SimpleNamespace(id='gpt-4o'),
            ]
        )

        with patch('scripts.web_app.os.getenv', return_value=None):
            with patch.dict('sys.modules', {'any_llm': SimpleNamespace(list_models=mock_list_models)}):
                models = _catalog_discover_provider_models('copilot-sdk')

        self.assertEqual(models, ['gpt-4o', 'claude-3-7-sonnet'])
        mock_list_models.assert_called_once_with(provider='copilotsdk')


if __name__ == '__main__':
    unittest.main(verbosity=2)
