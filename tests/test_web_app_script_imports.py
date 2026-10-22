# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Regression tests for script-style imports used by start.sh.

`python scripts/web_app.py` puts scripts/ — not the repo root — on sys.path,
so app modules are importable as `utils.x` / `routes.x` and NOT as
`scripts.utils.x`. pytest adds the repo root, which hides the mistake: a
function-local `from scripts.utils... import` passes every in-process test
and then 500s in the running app (POST /api/cv/layout-estimate, 2026-10-21).
"""

import importlib
import os
import re
import subprocess
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / 'scripts'

# Modules the web app loads. Standalone CLI scripts directly under scripts/
# (benchmark_cv_render.py, train_layout_estimator.py, ...) set up their own
# sys.path and are deliberately not covered.
_APP_MODULE_GLOBS = ('web_app.py', 'routes/*.py', 'utils/*.py')
_SCRIPTS_PKG_IMPORT = re.compile(r'^\s*(from\s+scripts\.|import\s+scripts\.)', re.M)


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

    def test_function_local_imports_run_with_scripts_dir_only(self):
        """Call a function whose import runs only at call time, in a fresh
        interpreter launched from scripts/ with the repo root off sys.path."""
        probe = (
            'import sys\n'
            f'root = {str(REPO_ROOT)!r}\n'
            "assert not any(p.rstrip('/') == root for p in sys.path), sys.path\n"
            'from routes.generation_routes import _page_style_for_domain\n'
            "key, style = _page_style_for_domain('software engineering')\n"
            "print('ok', key)\n"
        )
        env = os.environ.copy()
        env.pop('PYTHONPATH', None)
        result = subprocess.run(
            [sys.executable, '-c', probe],
            cwd=SCRIPTS_DIR, env=env, capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(result.returncode, 0, result.stderr[-2000:])
        self.assertTrue(result.stdout.startswith('ok'), result.stdout)

    def test_no_app_module_imports_through_the_scripts_package(self):
        offenders = []
        for pattern in _APP_MODULE_GLOBS:
            for path in sorted(SCRIPTS_DIR.glob(pattern)):
                text = path.read_text(encoding='utf-8')
                for match in _SCRIPTS_PKG_IMPORT.finditer(text):
                    line_no = text.count('\n', 0, match.start()) + 1
                    offenders.append(f'{path.relative_to(REPO_ROOT)}:{line_no}')
        self.assertEqual(
            offenders, [],
            'App modules must import as `utils.x` / `routes.x`, not `scripts.x` '
            '(the running app has scripts/ on sys.path, not the repo root)',
        )


if __name__ == '__main__':
    unittest.main()
