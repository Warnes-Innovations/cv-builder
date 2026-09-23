# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
"""Division/department in generated CVs: a user option, off by default.

These render REAL output — the HTML template and both DOCX files — and inspect
what is actually printed, rather than grepping source for a string. The
properties that matter:

  1. OFF is the default, and OFF output is unchanged: the employer line is the
     company alone, exactly as before the fields existed.
  2. ON prints the SAME "Company — Division, Department" text in every format.
     Four live render sites share one formatter; if they drift, a CV reads one
     way as a PDF and another as a DOCX.
  3. The option cannot be switched on by a string "false" (bool("false") is
     True), and the text is escaped where it reaches HTML.
  4. BOTH DOCX call sites stamp the flag — miss one and DOCX files built
     through that path silently ignore the option.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

from utils.cv_orchestrator import CVOrchestrator  # noqa: E402
from utils.template_renderer import (  # noqa: E402
    company_line,
    load_template,
    org_unit_text,
    render_template,
)

TEMPLATE = REPO / "templates" / "cv-template.html"
DIVISION = "Global Research and Development"
DEPARTMENT = "Non-Clinical Statistics"
EXPECTED = f"Pfizer — {DIVISION}, {DEPARTMENT}"


# ── fixtures ────────────────────────────────────────────────────────────────

def _content(division: str | None = DIVISION, department: str | None = DEPARTMENT):
    exp = {
        "title": "Principal Research Scientist",
        "company": "Pfizer",
        "location": {"city": "Groton", "state": "CT"},
        "start_date": "2000-01",
        "end_date": "2008-12",
        "achievements": [{"text": "Led biostatistics support for 50+ trials"}],
    }
    if division is not None:
        exp["division"] = division
    if department is not None:
        exp["department"] = department
    return {
        "personal_info": {"name": "Test Person", "contact": {"email": "t@example.com"}},
        "summary": "A summary.",
        "experiences": [exp],
        "skills": [{"name": "R", "category": "Programming", "years": 20}],
        "education": [], "certifications": [], "awards": [],
        "achievements": [], "publications": [],
    }


JOB = {"company": "TargetCo", "title": "Statistician", "domain": "biotech",
       "required_skills": [], "ats_keywords": []}


@pytest.fixture
def orchestrator(tmp_path):
    master = tmp_path / "Master_CV_Data.json"
    master.write_text(json.dumps({"personal_info": {"name": "Test Person"},
                                  "professional_summaries": {"default": "x"},
                                  "education": [], "awards": [],
                                  "certifications": []}), encoding="utf-8")
    return CVOrchestrator(master_data_path=str(master),
                          publications_path=str(tmp_path / "p.bib"),
                          output_dir=str(tmp_path / "out"), llm_client=None)


def _html(orch, content, customizations):
    """Render the real template the way the real generation path does.

    Mirrors the production sequence: _prepare_cv_data_for_template, then the
    keys the orchestrator adds before rendering — in particular json_ld_str,
    which the template serialises. Uses the REAL _build_json_ld rather than a
    stub, so this exercises the same pipeline a user's CV goes through.
    """
    cv_data = orch._prepare_cv_data_for_template(
        content, JOB, customizations=customizations)
    cv_data["achievements"] = content.get("achievements", [])
    cv_data["json_ld_str"] = orch._build_json_ld(cv_data, JOB)
    return render_template(load_template(str(TEMPLATE)), cv_data)


def _docx_text(path):
    from docx import Document  # type: ignore
    return "\n".join(p.text for p in Document(str(path)).paragraphs)


def _ats(orch, content, show, tmp_path):
    out = tmp_path / f"ats_{show}"
    out.mkdir(parents=True, exist_ok=True)  # the generator does not create it
    content = dict(content, show_org_unit=show)
    path, _ = orch._generate_ats_docx(content, JOB, out)
    return _docx_text(path)


def _human(orch, content, show, tmp_path):
    out = tmp_path / f"human_{show}"
    out.mkdir(parents=True, exist_ok=True)
    content = dict(content, show_org_unit=show)
    return _docx_text(orch._generate_human_docx(content, JOB, out))


# ── the formatter ───────────────────────────────────────────────────────────

class TestFormatter:
    def test_both(self):
        assert org_unit_text({"division": "D", "department": "P"}) == "D, P"

    def test_only_one(self):
        assert org_unit_text({"division": "D"}) == "D"
        assert org_unit_text({"department": "P"}) == "P"

    def test_neither_blank_or_non_string(self):
        for exp in ({}, {"division": "  ", "department": ""},
                    {"division": None}, {"division": 123}, "not a dict"):
            assert org_unit_text(exp) == ""

    def test_company_line_off_is_company_alone(self):
        exp = {"company": "Pfizer", "division": "D", "department": "P"}
        assert company_line(exp, False) == "Pfizer"

    def test_company_line_on(self):
        exp = {"company": "Pfizer", "division": "D", "department": "P"}
        assert company_line(exp, True) == "Pfizer — D, P"

    def test_company_line_on_but_no_fields_is_company_alone(self):
        assert company_line({"company": "Pfizer"}, True) == "Pfizer"

    def test_company_line_requires_real_true(self):
        """A truthy non-bool must not switch it on — e.g. a Jinja Undefined
        or a stray string reaching the filter."""
        exp = {"company": "Pfizer", "division": "D"}
        for truthy in ("true", "false", 1, object()):
            assert company_line(exp, truthy) == "Pfizer"


# ── the gate ────────────────────────────────────────────────────────────────

class TestGate:
    gate = staticmethod(CVOrchestrator._should_show_org_unit)

    def test_default_is_off(self):
        assert self.gate(None) is False
        assert self.gate({}) is False

    def test_string_false_does_not_switch_it_on(self):
        """The trap the gate exists to avoid: bool("false") is True."""
        for off in ("false", "False", "0", "no", "off", "", "maybe"):
            assert self.gate({"include_division_department": off}) is False

    def test_on(self):
        for on in (True, "true", "1", "yes", "on", " TRUE "):
            assert self.gate({"include_division_department": on}) is True

    def test_explicit_false(self):
        assert self.gate({"include_division_department": False}) is False


# ── real rendered output ────────────────────────────────────────────────────

class TestRenderedOutput:
    def test_html_off_by_default(self, orchestrator):
        html = _html(orchestrator, _content(), customizations={})
        # Control first: an absence check passes vacuously on a page that
        # failed to render the role at all, so prove the role is there.
        assert "Principal Research Scientist" in html and "Pfizer" in html
        assert DIVISION not in html and DEPARTMENT not in html

    def test_html_on(self, orchestrator):
        """Pins EACH of the template's two employer sites individually.

        `EXPECTED in html` alone was not enough: the template prints the
        employer twice (the visual job header and a plain-text WORK EXPERIENCE
        block), so either site still satisfied it when the other regressed.
        Mutation-testing showed both reverting undetected.
        """
        html = _html(orchestrator, _content(),
                     customizations={"include_division_department": True})
        assert f'<div class="job-company">{EXPECTED}</div>' in html, \
            "visual job-header site is not printing division/department"
        assert f"{EXPECTED} | Groton" in html, \
            "plain-text WORK EXPERIENCE site is not printing division/department"

    def test_html_string_false_stays_off(self, orchestrator):
        html = _html(orchestrator, _content(),
                     customizations={"include_division_department": "false"})
        assert "Pfizer" in html  # control: the role rendered
        assert DIVISION not in html

    def test_html_escapes_user_text(self, orchestrator):
        payload = "<img src=x onerror=alert(1)>"
        html = _html(orchestrator, _content(division=payload),
                     customizations={"include_division_department": True})
        assert payload not in html
        assert "&lt;img" in html

    def test_ats_docx_off_and_on(self, orchestrator, tmp_path):
        off = _ats(orchestrator, _content(), False, tmp_path)
        assert "Pfizer" in off  # control: the role rendered
        assert DIVISION not in off
        assert EXPECTED in _ats(orchestrator, _content(), True, tmp_path)

    def test_human_docx_off_and_on(self, orchestrator, tmp_path):
        off = _human(orchestrator, _content(), False, tmp_path)
        assert "Pfizer" in off  # control: the role rendered
        assert DIVISION not in off
        assert EXPECTED in _human(orchestrator, _content(), True, tmp_path)

    def test_every_format_prints_identical_text(self, orchestrator, tmp_path):
        """The drift guard: one formatter, so one string, in every format."""
        c = _content()
        outputs = {
            "html": _html(orchestrator, c, {"include_division_department": True}),
            "ats_docx": _ats(orchestrator, c, True, tmp_path),
            "human_docx": _human(orchestrator, c, True, tmp_path),
        }
        missing = [fmt for fmt, text in outputs.items() if EXPECTED not in text]
        assert not missing, f"formats not printing {EXPECTED!r}: {missing}"

    def test_role_without_the_fields_is_unaffected_when_on(self, orchestrator, tmp_path):
        """Turning the option on must not add a dangling separator to roles
        that have no division or department."""
        c = _content(division=None, department=None)
        html = _html(orchestrator, c, {"include_division_department": True})
        assert "Pfizer" in html  # control: the role rendered
        assert "Pfizer —" not in html
        assert "Pfizer —" not in _ats(orchestrator, c, True, tmp_path)


# ── the route that stores the option ─────────────────────────────────────────

class TestLayoutSettingsRoute:
    """POST /api/layout-settings is where the checkbox's value first lands.

    It converts the value itself before storing, so it gets its own guard
    against the string trap, independent of the orchestrator gate.
    """

    def _post(self, value):
        from tests.test_master_data import _make_app
        app, _, sid, stack = _make_app()
        with stack, app.test_client() as client:
            res = client.post("/api/layout-settings", json={
                "include_division_department": value, "session_id": sid})
            state = app.session_registry.get(sid).manager.state
        assert res.status_code == 200, res.get_json()
        return state["customizations"]["include_division_department"]

    def test_stores_a_real_true(self):
        assert self._post(True) is True

    def test_stores_a_real_false(self):
        assert self._post(False) is False

    def test_string_false_is_stored_as_false(self):
        """The trap: bool("false") is True."""
        assert self._post("false") is False

    def test_string_true_is_stored_as_true(self):
        assert self._post("true") is True

    def test_value_is_always_a_real_bool(self):
        for v in (True, False, "true", "false", "1", "0", 1, None):
            assert type(self._post(v)) is bool, f"{v!r} stored as non-bool"


# ── plumbing ────────────────────────────────────────────────────────────────

class TestPlumbing:
    def test_every_docx_call_site_stamps_the_flag(self):
        """Mirrors the citizenship guard: each call site stamps its own flags
        onto selected_content, so a site that forgets builds DOCX files that
        silently ignore the option."""
        sites = [REPO / "scripts" / "utils" / "cv_orchestrator.py",
                 REPO / "scripts" / "routes" / "generation_routes.py"]
        for f in sites:
            src = f.read_text(encoding="utf-8")
            assert "_generate_ats_docx(" in src, f"{f.name}: premise changed"
            assert "selected_content['show_org_unit']" in src, (
                f"{f.name} calls _generate_ats_docx without stamping show_org_unit")

    def test_estimate_unchanged_when_off(self):
        exps = [dict(_content()["experiences"][0])]
        base = CVOrchestrator._estimate_cv_body_chars("s", exps, [], [])
        assert CVOrchestrator._estimate_cv_body_chars(
            "s", exps, [], [], show_org_unit=False) == base

    def test_estimate_counts_exactly_the_printed_text_when_on(self):
        exps = [dict(_content()["experiences"][0])]
        off = CVOrchestrator._estimate_cv_body_chars("s", exps, [], [])
        on = CVOrchestrator._estimate_cv_body_chars("s", exps, [], [], show_org_unit=True)
        assert on - off == len(f" — {DIVISION}, {DEPARTMENT}")
