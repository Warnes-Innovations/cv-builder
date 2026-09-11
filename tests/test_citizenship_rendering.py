# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
"""personal_info.citizenship is rendered only where it is an asset.

The field states citizenship and clearance eligibility. On a federal-contract
application it is a qualification whose absence reads as ineligibility; on an
application to a private employer it is information they are in many
jurisdictions restricted from asking for.

So the interesting assertions here are the NEGATIVE ones. A test suite that only
checked "it renders for federal_advisor" would pass just as happily against an
unconditional renderer — which is the failure mode with actual consequences,
because the ATS DOCX is machine-parsed into third-party tracking systems where
the line would persist outside the application it was written for.
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

from utils.cv_orchestrator import CVOrchestrator  # noqa: E402


class TestCitizenshipGate(unittest.TestCase):
    """The predicate, tested directly. `_should_show_citizenship` is a
    classmethod so it needs no orchestrator instance and no config."""

    gate = CVOrchestrator._should_show_citizenship

    # -- the default is silence ------------------------------------------

    def test_off_when_no_customizations(self):
        self.assertFalse(self.gate(None))
        self.assertFalse(self.gate({}))

    def test_off_for_a_non_federal_variant(self):
        for variant in ("default", "ml_engineering", "biostatistics_ic",
                        "data_science_leadership", "scientific_advisor"):
            with self.subTest(variant=variant):
                self.assertFalse(self.gate({"selected_summary_key": variant}))

    def test_off_for_an_unrecognised_variant(self):
        """Fails toward silence: an unknown variant discloses nothing."""
        self.assertFalse(self.gate({"selected_summary_key": "some_future_variant"}))

    def test_off_when_customizations_is_not_a_dict(self):
        for junk in ("federal_advisor", ["federal_advisor"], 1, object()):
            with self.subTest(junk=type(junk).__name__):
                self.assertFalse(self.gate(junk))

    # -- on where it is an asset -----------------------------------------

    def test_on_for_a_federal_variant_by_default(self):
        self.assertTrue(self.gate({"selected_summary_key": "federal_advisor"}))

    def test_reads_either_key_the_session_uses(self):
        """The variant reaches customizations under two names depending on the
        path taken; both must gate identically or the CV differs by route."""
        self.assertTrue(self.gate({"summary_focus_override": "federal_advisor"}))

    def test_tolerates_surrounding_whitespace(self):
        self.assertTrue(self.gate({"selected_summary_key": " federal_advisor "}))

    # -- an explicit choice wins in BOTH directions ----------------------

    def test_explicit_request_overrides_a_non_federal_variant(self):
        self.assertTrue(self.gate({"selected_summary_key": "default",
                                   "include_citizenship": True}))

    def test_explicit_refusal_overrides_a_federal_variant(self):
        """The half that is easy to omit. Opting out must work even where the
        default is on, or the flag is only an accelerator and never a brake."""
        self.assertFalse(self.gate({"selected_summary_key": "federal_advisor",
                                    "include_citizenship": False}))

    def test_explicit_false_is_distinguished_from_absent(self):
        absent = self.gate({"selected_summary_key": "federal_advisor"})
        explicit_false = self.gate({"selected_summary_key": "federal_advisor",
                                    "include_citizenship": False})
        self.assertTrue(absent)
        self.assertFalse(explicit_false)


class TestCitizenshipReachesTheRenderers(unittest.TestCase):
    """The gate is only worth anything if every renderer consults it.

    Checked against the artifacts rather than by re-implementing the logic: a
    test that asserted the same mapping the code implements would pass against a
    renderer that ignored the flag entirely.
    """

    def test_html_template_gates_on_the_flag_not_the_field(self):
        tpl = (REPO / "templates" / "cv-template.html").read_text(encoding="utf-8")
        self.assertIn("personal_info.citizenship", tpl,
                      "the HTML template never renders the field at all")
        self.assertIn("show_citizenship and personal_info.citizenship", tpl,
                      "the template renders citizenship without consulting the gate")

    def test_ats_docx_gates_on_the_flag_not_the_field(self):
        src = (REPO / "scripts" / "utils" / "cv_orchestrator.py").read_text(encoding="utf-8")
        self.assertIn("content.get('show_citizenship') and personal.get('citizenship')", src,
                      "the ATS DOCX renders citizenship without consulting the gate")

    def test_every_ats_docx_call_site_stamps_the_flag(self):
        """selected_content is what _generate_ats_docx reads, and each call site
        stamps its own flags onto it. A call site that forgets produces a DOCX
        that silently omits the line on a federal application."""
        sites = {
            REPO / "scripts" / "utils" / "cv_orchestrator.py",
            REPO / "scripts" / "routes" / "generation_routes.py",
        }
        for f in sites:
            src = f.read_text(encoding="utf-8")
            if "_generate_ats_docx(" not in src:
                continue
            with self.subTest(file=f.name):
                self.assertIn("show_citizenship", src,
                              f"{f.name} calls _generate_ats_docx without stamping the flag")


if __name__ == "__main__":
    unittest.main()
