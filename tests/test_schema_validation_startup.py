# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
"""Refuse to start when master-data schema validation cannot run.

The defect this guards: validate_master_data() does not FAIL when schema
validation cannot run — it appends a warning and reports valid=True. No
application caller reads the warnings, so without the jsonschema package the
post-write rollback in _save_master became a no-op and invalid data was written
and kept, silently. The startup check refuses to run in that state.

The most important test here is the AGREEMENT one. The startup check and the
validator must mean the same thing by "schema validation can run". If they
drift, the check can pass while the validator still skips, which rebuilds the
original false assurance one layer up. So for every condition the startup
check is asserted against what the validator ACTUALLY does with a known-bad
value — not against a restatement of the check's own logic.
"""
from __future__ import annotations

import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

from utils import master_data_validator as mdv  # noqa: E402

# A value the schema must reject: employment_type is typed string.
KNOWN_BAD = {"experience": [{"id": "e", "title": "T", "company": "C",
                             "employment_type": 12345}]}

_real_import_module = mdv.importlib.import_module


def _jsonschema(behaviour):
    """Patch the ONE import both functions make, to simulate an environment."""
    def fake(name, *a, **k):
        if name != "jsonschema":
            return _real_import_module(name, *a, **k)
        if behaviour == "missing":
            raise ModuleNotFoundError("No module named 'jsonschema'")
        if behaviour == "broken":
            # A broken install: its own dependency is missing. Plain
            # ImportError, NOT ModuleNotFoundError.
            raise ImportError("cannot import name 'x' from partially initialized module")
        if behaviour == "too_old":
            return types.ModuleType("jsonschema")  # no Draft202012Validator
        raise AssertionError(behaviour)
    return patch.object(mdv.importlib, "import_module", side_effect=fake)


def _validator_silently_passes(schema_path=None):
    """True if the validator reports KNOWN_BAD as valid — the defect.

    Raising, or returning invalid, both count as NOT silently passing: either
    way the bad write would be refused rather than kept.
    """
    try:
        result = mdv.validate_master_data(KNOWN_BAD, schema_path=schema_path)
    except Exception:
        return False
    return result.valid


class TestNormalEnvironment(unittest.TestCase):

    def test_control_the_validator_really_validates_here(self):
        """If this fails, every agreement test below is meaningless."""
        self.assertFalse(_validator_silently_passes(),
                         "schema validation is not running in the test environment")

    def test_startup_check_passes(self):
        self.assertIsNone(mdv.schema_validation_unavailable_reason())
        mdv.require_schema_validation()  # must not raise


class TestStartupCheckAgreesWithValidator(unittest.TestCase):
    """For each condition: startup refuses  <=>  validator cannot validate."""

    def _assert_agree(self, schema_path=None):
        reason = mdv.schema_validation_unavailable_reason(schema_path)
        silent = _validator_silently_passes(schema_path)
        validates = not silent and reason is None
        # The only acceptable states: both say "fine" AND the validator
        # genuinely rejects bad data; or the startup check refuses.
        if reason is None:
            self.assertFalse(
                silent,
                "DRIFT: the startup check passed, but the validator silently "
                "accepted a known-bad value — the defect this exists to prevent",
            )
        with self.assertRaises(mdv.SchemaValidationUnavailable) if reason else _nullctx():
            mdv.require_schema_validation(schema_path)
        return reason, validates

    def test_jsonschema_missing(self):
        with _jsonschema("missing"):
            self.assertTrue(_validator_silently_passes(),
                            "precondition: this is the fail-open case being guarded")
            reason, _ = self._assert_agree()
        self.assertIn("jsonschema", reason or "")

    def test_jsonschema_too_old(self):
        with _jsonschema("too_old"):
            self.assertTrue(_validator_silently_passes(),
                            "precondition: an old jsonschema also fails open")
            reason, _ = self._assert_agree()
        self.assertIn("Draft202012Validator", reason or "")

    def test_jsonschema_broken_install(self):
        """Validator raises here rather than skipping; startup must still refuse."""
        with _jsonschema("broken"):
            reason, _ = self._assert_agree()
        self.assertIsNotNone(reason)

    def test_schema_file_missing(self):
        missing = str(REPO / "schemas" / "does-not-exist.schema.json")
        self.assertTrue(_validator_silently_passes(missing),
                        "precondition: a missing schema also fails open")
        reason, _ = self._assert_agree(missing)
        self.assertIn("not found", reason or "")

    def test_schema_file_corrupt(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            f.write("{ not json ]")
        try:
            reason, _ = self._assert_agree(f.name)
            self.assertIn("not valid JSON", reason or "")
        finally:
            Path(f.name).unlink()

    def test_tilde_path_resolves_the_same_as_the_validator(self):
        """Drift found while writing this: the validator expanduser()s the
        schema path and the check originally did not, so a "~/..." path read
        as missing to one and present to the other."""
        real = (REPO / "schemas" / "master_cv_data.schema.json").resolve()
        home = Path.home().resolve()
        try:
            rel = real.relative_to(home)
        except ValueError:
            self.skipTest("repo is not under $HOME, so no ~ path can name it")
        tilde = "~/" + str(rel)
        self.assertIsNone(mdv.schema_validation_unavailable_reason(tilde))
        self.assertFalse(_validator_silently_passes(tilde))


class _nullctx:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class TestTheSaveRollbackIsProtected(unittest.TestCase):
    """End to end: the concrete harm, demonstrated then prevented."""

    def test_without_jsonschema_the_save_rollback_is_inert(self):
        """Documents WHY startup must refuse — the harm is real, not theoretical.

        Runs the real _save_master writing invalid data over a valid file.
        With validation unavailable, it neither raises nor rolls back.
        """
        from routes.master_data_routes import _save_master
        valid = {"experience": [{"id": "e", "title": "T", "company": "C",
                                 "employment_type": "full_time"}]}
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "Master_CV_Data.json"
            path.write_text(json.dumps(valid), encoding="utf-8")
            with _jsonschema("missing"), patch("subprocess.run"):
                _save_master(KNOWN_BAD, path)  # no exception: that IS the defect
            kept = json.loads(path.read_text())["experience"][0]["employment_type"]
        self.assertEqual(kept, 12345,
                         "if this now rolls back, the validator itself was fixed "
                         "and this test's premise should be revisited")

    def test_and_startup_refuses_in_exactly_that_environment(self):
        with _jsonschema("missing"):
            with self.assertRaises(mdv.SchemaValidationUnavailable):
                mdv.require_schema_validation()


if __name__ == "__main__":
    unittest.main()
