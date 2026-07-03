# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
"""Unit tests for scripts/cli.py — Click-based cv-builder CLI."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

from click.testing import CliRunner

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from cli import cli  # noqa: E402  (must follow sys.path setup)


class TestJobSubmitTextTextFileNotFound(unittest.TestCase):
    """CR-35: click.Path(exists=True) on --text-file must reject non-existent paths."""

    def _invoke(self, args: list[str]) -> "click.testing.Result":
        runner = CliRunner()
        return runner.invoke(cli, args)

    def test_nonexistent_text_file_exits_with_code_2(self):
        """--text-file with a missing path should exit 2 (Click UsageError)."""
        result = self._invoke(["job", "submit-text", "--text-file", "/nonexistent/path/job.txt"])
        self.assertEqual(result.exit_code, 2)

    def test_nonexistent_text_file_error_message_mentions_path(self):
        """The error output should name the invalid path so the user knows what to fix."""
        result = self._invoke(["job", "submit-text", "--text-file", "/nonexistent/path/job.txt"])
        self.assertIn("/nonexistent/path/job.txt", result.output)

    def test_nonexistent_text_file_error_message_says_does_not_exist(self):
        """The error message should say 'does not exist' — Click's standard phrasing."""
        result = self._invoke(["job", "submit-text", "--text-file", "/nonexistent/path/job.txt"])
        self.assertIn("does not exist", result.output)

    def test_valid_text_file_is_accepted(self):
        """A real file should not be rejected by the path validation."""
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False) as f:
            f.write("Sample job description")
            tmp_path = f.name
        try:
            # Invoke without a valid session; we just want to confirm the path
            # validation passes (exit != 2).  A missing session will produce a
            # different, non-path-validation error (exit 1).
            result = self._invoke(["job", "submit-text", "--text-file", tmp_path])
            self.assertNotEqual(result.exit_code, 2,
                                f"Expected path validation to pass; got: {result.output}")
        finally:
            Path(tmp_path).unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
