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


class TestExplicitChoiceIsParsedNotCoerced(unittest.TestCase):
    """The explicit choice now comes from a UI checkbox, so it can be a string.

    The gate used to call bool() on it, and bool("false") is True — so a user
    who switched citizenship OFF on a federal application would have had it
    printed anyway. Unrecognised values are "no explicit choice", not "off".
    """

    gate = CVOrchestrator._should_show_citizenship

    def test_string_false_switches_it_off_even_for_a_federal_variant(self):
        for off in ("false", "False", " FALSE ", "0", "no", "off"):
            with self.subTest(value=off):
                self.assertFalse(self.gate({"selected_summary_key": "federal_advisor",
                                            "include_citizenship": off}))

    def test_string_true_switches_it_on_for_a_non_federal_variant(self):
        for on in ("true", "1", "yes", "on"):
            with self.subTest(value=on):
                self.assertTrue(self.gate({"selected_summary_key": "default",
                                           "include_citizenship": on}))

    def test_unrecognised_values_fall_through_to_the_variant_default(self):
        for junk in ("", "maybe", None, 7, [True]):
            with self.subTest(value=junk):
                self.assertTrue(self.gate({"selected_summary_key": "federal_advisor",
                                           "include_citizenship": junk}))
                self.assertFalse(self.gate({"selected_summary_key": "default",
                                            "include_citizenship": junk}))


class TestStatusReportsTheEffectiveValue(unittest.TestCase):
    """/api/status serves the gate's RESULT so the checkbox shows what the CV
    will do, without a second copy of the federal rule in JavaScript."""

    def _status(self, customizations):
        from tests.test_master_data import _make_app
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            app.session_registry.get(sid).manager.state["customizations"] = customizations
            res = client.get("/api/status", query_string={"session_id": sid})
        self.assertEqual(res.status_code, 200, res.get_json())
        return res.get_json()["show_citizenship"]

    def test_federal_without_a_choice_reports_on(self):
        self.assertIs(self._status({"selected_summary_key": "federal_advisor"}), True)

    def test_non_federal_without_a_choice_reports_off(self):
        self.assertIs(self._status({"selected_summary_key": "default"}), False)

    def test_explicit_off_on_a_federal_variant_reports_off(self):
        self.assertIs(self._status({"selected_summary_key": "federal_advisor",
                                    "include_citizenship": False}), False)

    def test_no_customizations_reports_off(self):
        self.assertIs(self._status(None), False)

    def test_value_is_a_real_bool_even_with_a_mocked_orchestrator(self):
        """_make_app's orchestrator is a MagicMock. Calling the gate THROUGH
        it returned a mock and broke JSON serialisation — the reason the route
        calls it on the class instead."""
        self.assertIsInstance(self._status({"selected_summary_key": "default"}), bool)


class TestLayoutRouteStoresOnlyWhatItIsSent(unittest.TestCase):
    """The client sends include_citizenship ONLY when the user changed the box.
    Absent must stay absent, or the federal default would be frozen."""

    def _post(self, body):
        from tests.test_master_data import _make_app
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post("/api/layout-settings", json=dict(body, session_id=sid))
            custom = app.session_registry.get(sid).manager.state.get("customizations") or {}
        self.assertEqual(res.status_code, 200, res.get_json())
        return custom

    def test_absent_is_not_stored(self):
        custom = self._post({"base_font_size": "10"})
        self.assertNotIn("include_citizenship", custom)

    def test_real_bools_are_stored(self):
        self.assertIs(self._post({"include_citizenship": True})["include_citizenship"], True)
        self.assertIs(self._post({"include_citizenship": False})["include_citizenship"], False)

    def test_string_false_is_stored_as_false(self):
        self.assertIs(self._post({"include_citizenship": "false"})["include_citizenship"], False)


class TestCitizenshipInRealRenderedOutput(unittest.TestCase):
    """End to end: customizations -> the real gate -> the real template."""

    CITIZENSHIP = "U.S. Citizen"

    def setUp(self):
        import json
        import tempfile
        self._tmp = tempfile.TemporaryDirectory()
        tmp = Path(self._tmp.name)
        master = tmp / "Master_CV_Data.json"
        master.write_text(json.dumps({"personal_info": {"name": "T"},
                                      "professional_summaries": {"default": "x"},
                                      "education": [], "awards": [],
                                      "certifications": []}), encoding="utf-8")
        self.orch = CVOrchestrator(master_data_path=str(master),
                                   publications_path=str(tmp / "p.bib"),
                                   output_dir=str(tmp / "out"), llm_client=None)

    def tearDown(self):
        self._tmp.cleanup()

    def _html(self, customizations):
        from utils.template_renderer import load_template, render_template
        job = {"company": "X", "title": "Y", "domain": "", "required_skills": [],
               "ats_keywords": []}
        content = {"personal_info": {"name": "Test Person",
                                     "citizenship": self.CITIZENSHIP,
                                     "contact": {"email": "t@example.com"}},
                   "summary": "s", "experiences": [], "skills": [],
                   "education": [], "certifications": [], "awards": [],
                   "achievements": [], "publications": []}
        cv_data = self.orch._prepare_cv_data_for_template(
            content, job, customizations=customizations)
        cv_data["achievements"] = []
        cv_data["json_ld_str"] = self.orch._build_json_ld(cv_data, job)
        return render_template(
            load_template(str(REPO / "templates" / "cv-template.html")), cv_data)

    def _assert_rendered(self, html):
        # Control: an absence check passes vacuously on a page that failed to
        # render, so prove the header rendered before checking citizenship.
        self.assertIn("Test Person", html)

    def test_federal_without_a_choice_prints_it(self):
        html = self._html({"selected_summary_key": "federal_advisor"})
        self._assert_rendered(html)
        self.assertIn(self.CITIZENSHIP, html)

    def test_non_federal_without_a_choice_omits_it(self):
        html = self._html({"selected_summary_key": "default"})
        self._assert_rendered(html)
        self.assertNotIn(self.CITIZENSHIP, html)

    def test_federal_with_string_false_omits_it(self):
        """The regression that motivated parsing: before, this printed it."""
        html = self._html({"selected_summary_key": "federal_advisor",
                           "include_citizenship": "false"})
        self._assert_rendered(html)
        self.assertNotIn(self.CITIZENSHIP, html)

    def test_non_federal_ticked_prints_it(self):
        html = self._html({"selected_summary_key": "default",
                           "include_citizenship": True})
        self._assert_rendered(html)
        self.assertIn(self.CITIZENSHIP, html)


if __name__ == "__main__":
    unittest.main()
