# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
"""Unit tests for scripts/cv-comprehensive.py."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

REPO_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = REPO_ROOT / "scripts" / "cv-comprehensive.py"

_spec = importlib.util.spec_from_file_location("cv_comprehensive", MODULE_PATH)
assert _spec is not None and _spec.loader is not None, f"Could not load {MODULE_PATH}"
cv_comp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cv_comp)  # type: ignore[union-attr]


# ---------------------------------------------------------------------------
# parse_args
# ---------------------------------------------------------------------------

class TestParseArgs(unittest.TestCase):

    def test_defaults(self):
        args = cv_comp.parse_args([])
        self.assertEqual(args.path, "~/CV")
        self.assertEqual(args.output_dir, "~/CV/files/Comprehensive_CV")
        self.assertFalse(args.force)
        self.assertFalse(args.json)
        self.assertIsNone(args.example)

    def test_path_argument(self):
        args = cv_comp.parse_args(["--path", "/custom/cv"])
        self.assertEqual(args.path, "/custom/cv")

    def test_output_dir(self):
        args = cv_comp.parse_args(["--output-dir", "/tmp/out"])
        self.assertEqual(args.output_dir, "/tmp/out")

    def test_force_flag(self):
        args = cv_comp.parse_args(["--force"])
        self.assertTrue(args.force)

    def test_force_short_flag(self):
        args = cv_comp.parse_args(["-f"])
        self.assertTrue(args.force)

    def test_json_flag(self):
        args = cv_comp.parse_args(["--json"])
        self.assertTrue(args.json)

    def test_example_simple(self):
        args = cv_comp.parse_args(["--example", "simple"])
        self.assertEqual(args.example, "simple")

    def test_example_medium(self):
        args = cv_comp.parse_args(["--example", "medium"])
        self.assertEqual(args.example, "medium")

    def test_example_complex(self):
        args = cv_comp.parse_args(["--example", "complex"])
        self.assertEqual(args.example, "complex")

    def test_invalid_example_rejected(self):
        with self.assertRaises(SystemExit) as cm:
            cv_comp.parse_args(["--example", "invalid"])
        self.assertEqual(cm.exception.code, 2)

    def test_path_and_example_are_mutually_exclusive(self):
        with self.assertRaises(SystemExit) as cm:
            cv_comp.parse_args(["--path", "/x", "--example", "simple"])
        self.assertEqual(cm.exception.code, 2)


# ---------------------------------------------------------------------------
# main — delegates to cv-preview.py
# ---------------------------------------------------------------------------

class TestMain(unittest.TestCase):

    def _run(self, argv: list[str], in_cvgen: bool = True) -> tuple[int, list, dict]:
        """Run main() with subprocess.run mocked; return (exit_code, cmd_list, call_kwargs)."""
        env = {"CONDA_DEFAULT_ENV": "cvgen"} if in_cvgen else {"CONDA_DEFAULT_ENV": "base"}
        mock_completed = MagicMock(returncode=0)
        with patch("subprocess.run", return_value=mock_completed) as mock_run, \
                patch.dict("os.environ", env, clear=False):
            code = cv_comp.main(argv)
        cmd = mock_run.call_args[0][0] if mock_run.called else []
        kwargs = dict(mock_run.call_args.kwargs) if mock_run.called else {}
        return code, cmd, kwargs

    def test_delegates_to_cv_preview_py(self):
        _, cmd, _ = self._run([])
        script_parts = [str(c) for c in cmd if "cv-preview" in str(c)]
        self.assertTrue(len(script_parts) >= 1, f"cv-preview.py not in cmd: {cmd}")

    def test_includes_comprehensive_flag(self):
        _, cmd, _ = self._run([])
        self.assertIn("--comprehensive", cmd)

    def test_includes_skills_experience_never(self):
        _, cmd, _ = self._run([])
        self.assertIn("--skills-experience", cmd)
        idx = cmd.index("--skills-experience")
        self.assertEqual(cmd[idx + 1], "never")

    def test_passes_force_flag(self):
        _, cmd, _ = self._run(["--force"])
        self.assertIn("--force", cmd)

    def test_force_short_flag_passed(self):
        _, cmd, _ = self._run(["-f"])
        self.assertIn("--force", cmd)

    def test_passes_json_flag(self):
        _, cmd, _ = self._run(["--json"])
        self.assertIn("--json", cmd)

    def test_passes_custom_output_dir(self):
        _, cmd, _ = self._run(["--output-dir", "/tmp/cv-out"])
        self.assertIn("--output-dir", cmd)
        idx = cmd.index("--output-dir")
        self.assertEqual(cmd[idx + 1], "/tmp/cv-out")

    def test_passes_example_flag(self):
        _, cmd, _ = self._run(["--example", "medium"])
        self.assertIn("--example", cmd)
        idx = cmd.index("--example")
        self.assertEqual(cmd[idx + 1], "medium")

    def test_passes_path_flag(self):
        _, cmd, _ = self._run(["--path", "/custom/cv"])
        self.assertIn("--path", cmd)
        idx = cmd.index("--path")
        self.assertEqual(cmd[idx + 1], "/custom/cv")

    def test_returns_subprocess_returncode(self):
        mock_completed = MagicMock(returncode=3)
        with patch("subprocess.run", return_value=mock_completed), \
                patch.dict("os.environ", {"CONDA_DEFAULT_ENV": "cvgen"}):
            result = cv_comp.main([])
        self.assertEqual(result, 3)

    def test_uses_sys_executable_when_in_cvgen_env(self):
        """When CONDA_DEFAULT_ENV==cvgen the runner should be sys.executable."""
        import sys as _sys
        _, cmd, _ = self._run([])
        self.assertEqual(cmd[0], _sys.executable)

    def test_returns_2_when_no_cvgen_env_found(self):
        """Returns 2 if no cvgen Python can be found anywhere."""
        import pathlib
        with patch.dict("os.environ", {"CONDA_DEFAULT_ENV": "base"}, clear=False), \
                patch.object(pathlib.Path, "exists", return_value=False), \
                patch("shutil.which", return_value=None):
            result = cv_comp.main([])
        self.assertEqual(result, 2)

    def test_subprocess_run_uses_check_false_and_no_explicit_env(self):
        """subprocess.run should be called with check=False and no explicit env kwarg."""
        _, _, kwargs = self._run([])
        self.assertIs(kwargs.get("check"), False,
                      f"Expected check=False in subprocess.run kwargs; got {kwargs}")
        self.assertNotIn("env", kwargs,
                         "subprocess.run must not pass explicit env= so the subprocess "
                         "inherits the full process environment")


# ---------------------------------------------------------------------------
# Return-code contract (CR-36)
# ---------------------------------------------------------------------------

class TestMainReturnCodeContract(unittest.TestCase):
    """Document and verify the return code contract for main().

    Return codes
    ============
    0  — subprocess succeeded.
    2  — cvgen environment could not be found.
    N  — subprocess returned a non-zero code (N is whatever cv-preview.py emits).
    """

    def _run_with_returncode(self, returncode: int) -> int:
        """Invoke main() with subprocess.run mocked to return *returncode*."""
        mock_completed = MagicMock(returncode=returncode)
        with patch("subprocess.run", return_value=mock_completed), \
                patch.dict("os.environ", {"CONDA_DEFAULT_ENV": "cvgen"}, clear=False):
            return cv_comp.main([])

    def test_returns_0_on_subprocess_success(self):
        """Return code 0 means the downstream script ran successfully."""
        self.assertEqual(self._run_with_returncode(0), 0)

    def test_returns_1_on_subprocess_failure(self):
        """Return code 1 propagates when cv-preview.py exits with a runtime error."""
        self.assertEqual(self._run_with_returncode(1), 1)

    def test_returns_2_when_cvgen_env_not_found(self):
        """Return code 2 is emitted when the cvgen environment cannot be located."""
        import pathlib
        with patch.dict("os.environ", {"CONDA_DEFAULT_ENV": "base"}, clear=False), \
                patch.object(pathlib.Path, "exists", return_value=False), \
                patch("shutil.which", return_value=None):
            result = cv_comp.main([])
        self.assertEqual(result, 2)

    def test_propagates_arbitrary_subprocess_return_code(self):
        """Non-standard exit codes (e.g. 5) are forwarded unchanged."""
        self.assertEqual(self._run_with_returncode(5), 5)


if __name__ == "__main__":
    unittest.main()
