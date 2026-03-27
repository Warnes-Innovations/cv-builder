# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Regression tests for script-style imports used by start.sh."""

import importlib
import sys
import unittest
from pathlib import Path


class TestScriptStyleRouteImports(unittest.TestCase):

    def test_review_routes_imports_with_scripts_dir_only(self):
        repo_root = Path(__file__).resolve().parent.parent
        scripts_dir = str(repo_root / 'scripts')
        original_path = list(sys.path)
        module_names = (
            'routes.review_routes',
            'routes.generation_routes',
            'scripts.routes.review_routes',
            'scripts.routes.generation_routes',
        )
        saved_modules = {
            name: sys.modules.get(name)
            for name in module_names
            if name in sys.modules
        }

        try:
            sys.path[:] = [
                entry for entry in original_path
                if Path(entry or '.').resolve() != repo_root
            ]
            if scripts_dir in sys.path:
                sys.path.remove(scripts_dir)
            sys.path.insert(0, scripts_dir)

            for name in module_names:
                sys.modules.pop(name, None)

            review_routes = importlib.import_module('routes.review_routes')

            self.assertTrue(hasattr(review_routes, 'create_blueprint'))
        finally:
            for name in module_names:
                sys.modules.pop(name, None)
            sys.modules.update(saved_modules)
            sys.path[:] = original_path


if __name__ == '__main__':
    unittest.main()
