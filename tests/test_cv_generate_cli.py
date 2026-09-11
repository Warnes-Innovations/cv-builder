# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
"""Unit tests for scripts/cv_generate_cli.py."""

from __future__ import annotations

import importlib.util
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = REPO_ROOT / "scripts" / "cv_generate_cli.py"

_spec = importlib.util.spec_from_file_location("cv_generate_cli", MODULE_PATH)
assert _spec is not None and _spec.loader is not None, f"Could not load {MODULE_PATH}"
cv_cli = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cv_cli)  # type: ignore[union-attr]


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------

# Stable symbolic IDs used by fixture and assertions — update here if schema changes.
_EXP1_ID  = "exp_001"
_ACH1A_ID = "ach_001_a"
_ACH1B_ID = "ach_001_b"
_EXP2_ID  = "exp_002"
_ACH2A_ID = "ach_002_a"


def _achievement(ach_id: str, importance: int) -> dict:
    """Build a minimal achievement dict."""
    return {"id": ach_id, "importance": importance}


def _experience(exp_id: str, achievements: list) -> dict:
    """Build a minimal experience dict."""
    return {"id": exp_id, "achievements": achievements}


class MasterDataBuilder:
    """Factory for building valid-but-flexible master CV test data."""

    def __init__(self) -> None:
        self._experiences: list = []
        self._skills: object = []
        # run_generation validates the requested summary variant against these,
        # so the fixture must carry at least one real key.
        self._summaries: object = {
            "default": "Default summary text.",
            "scientific_advisor": "Scientific advisor summary text.",
        }

    def with_experiences(self, *experiences: dict) -> "MasterDataBuilder":
        self._experiences.extend(experiences)
        return self

    def with_skills(self, skills: object) -> "MasterDataBuilder":
        self._skills = skills
        return self

    def with_summaries(self, summaries: object) -> "MasterDataBuilder":
        self._summaries = summaries
        return self

    def build(self) -> dict:
        return {
            "skills": self._skills,
            "experience": self._experiences,
            "professional_summaries": self._summaries,
        }


def _master(skills_format: str = "list") -> dict:
    """Minimal master CV dict that exercises both skills formats."""
    if skills_format == "list":
        skills: object = [{"name": "Python"}, {"name": "R"}, "SQL"]
    else:
        skills = {
            "programming": {"category": "Programming", "skills": [{"name": "Python"}, {"name": "R"}]},
            "databases": [{"name": "SQL"}, "NoSQL"],
        }
    return (
        MasterDataBuilder()
        .with_experiences(
            _experience(_EXP1_ID, [
                _achievement(_ACH1A_ID, importance=9),
                _achievement(_ACH1B_ID, importance=7),
            ]),
            _experience(_EXP2_ID, [
                _achievement(_ACH2A_ID, importance=8),
            ]),
        )
        .with_skills(skills)
        .build()
    )


def _write_master(data: dict) -> tempfile.NamedTemporaryFile:
    f = tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False, encoding="utf-8")
    json.dump(data, f)
    f.close()
    return f


# ---------------------------------------------------------------------------
# _all_achievement_ids
# ---------------------------------------------------------------------------

class TestAllAchievementIds(unittest.TestCase):

    def test_extracts_all_ids(self):
        ids = cv_cli._all_achievement_ids(_master())
        self.assertEqual(ids, [_ACH1A_ID, _ACH1B_ID, _ACH2A_ID])

    def test_empty_experience(self):
        self.assertEqual(cv_cli._all_achievement_ids({"experience": []}), [])

    def test_missing_experience_key(self):
        self.assertEqual(cv_cli._all_achievement_ids({}), [])

    def test_achievement_without_id_is_skipped(self):
        master = {
            "experience": [
                _experience(_EXP1_ID, [
                    {"importance": 8},          # no id — skip
                    _achievement(_ACH1A_ID, 5), # has id — keep
                ])
            ]
        }
        self.assertEqual(cv_cli._all_achievement_ids(master), [_ACH1A_ID])


# ---------------------------------------------------------------------------
# _all_skill_names
# ---------------------------------------------------------------------------

class TestAllSkillNames(unittest.TestCase):

    def test_list_format_mixed(self):
        names = cv_cli._all_skill_names(_master("list"))
        self.assertEqual(names, ["Python", "R", "SQL"])

    def test_dict_format(self):
        names = cv_cli._all_skill_names(_master("dict"))
        self.assertIn("Python", names)
        self.assertIn("R", names)
        self.assertIn("SQL", names)
        self.assertIn("NoSQL", names)

    def test_empty_skills_list(self):
        self.assertEqual(cv_cli._all_skill_names({"skills": []}), [])

    def test_missing_skills_key(self):
        self.assertEqual(cv_cli._all_skill_names({}), [])


# ---------------------------------------------------------------------------
# _build_achievement_decisions
# ---------------------------------------------------------------------------

class TestBuildAchievementDecisions(unittest.TestCase):

    def test_comprehensive_includes_all_achievements(self):
        decisions = cv_cli._build_achievement_decisions(_master(), "comprehensive")
        self.assertIn(_ACH1A_ID, decisions)
        self.assertIn(_ACH1B_ID, decisions)
        self.assertIn(_ACH2A_ID, decisions)
        self.assertNotIn("exclude", decisions.values())

    def test_comprehensive_emphasizes_importance_9(self):
        decisions = cv_cli._build_achievement_decisions(_master(), "comprehensive")
        self.assertEqual(decisions[_ACH1A_ID], "emphasize")  # importance=9
        self.assertEqual(decisions[_ACH1B_ID], "include")    # importance=7
        self.assertEqual(decisions[_ACH2A_ID], "include")    # importance=8

    def test_focused_excludes_achievements_from_excluded_experiences(self):
        # exp_001 is "exclude" in focused mode
        decisions = cv_cli._build_achievement_decisions(_master(), "focused")
        self.assertEqual(decisions[_ACH1A_ID], "exclude")
        self.assertEqual(decisions[_ACH1B_ID], "exclude")

    def test_focused_keeps_achievements_from_non_excluded_experiences(self):
        # exp_002 is "emphasize" in focused mode
        decisions = cv_cli._build_achievement_decisions(_master(), "focused")
        self.assertNotEqual(decisions[_ACH2A_ID], "exclude")

    def test_no_achievements_returns_empty_dict(self):
        master = {"experience": [_experience(_EXP1_ID, [])]}
        self.assertEqual(cv_cli._build_achievement_decisions(master, "comprehensive"), {})


# ---------------------------------------------------------------------------
# _build_skill_decisions
# ---------------------------------------------------------------------------

class TestBuildSkillDecisions(unittest.TestCase):

    def test_all_skills_marked_include(self):
        decisions = cv_cli._build_skill_decisions(_master())
        for v in decisions.values():
            self.assertEqual(v, "include")

    def test_all_skill_names_present_as_keys(self):
        decisions = cv_cli._build_skill_decisions(_master())
        self.assertIn("Python", decisions)
        self.assertIn("R", decisions)
        self.assertIn("SQL", decisions)

    def test_empty_master_returns_empty_dict(self):
        self.assertEqual(cv_cli._build_skill_decisions({}), {})


# ---------------------------------------------------------------------------
# _load_master_data
# ---------------------------------------------------------------------------

class TestLoadMasterData(unittest.TestCase):

    def test_loads_valid_json(self):
        f = _write_master({"skills": ["Python"]})
        try:
            data = cv_cli._load_master_data(f.name)
            self.assertEqual(data["skills"], ["Python"])
        finally:
            Path(f.name).unlink(missing_ok=True)

    def test_raises_for_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            cv_cli._load_master_data("/nonexistent/path/master_cv.json")


# ---------------------------------------------------------------------------
# _parse_args
# ---------------------------------------------------------------------------

class TestParseArgs(unittest.TestCase):

    def _parse(self, argv: list[str]) -> object:
        old = sys.argv[:]
        try:
            sys.argv = ["cv_generate_cli.py"] + argv
            return cv_cli._parse_args()
        finally:
            sys.argv = old

    def test_mode_comprehensive(self):
        args = self._parse(["--mode", "comprehensive", "--summary-variant", "scientific_advisor"])
        self.assertEqual(args.mode, "comprehensive")

    def test_mode_focused(self):
        args = self._parse(["--mode", "focused", "--summary-variant", "scientific_advisor"])
        self.assertEqual(args.mode, "focused")

    def test_default_base_url(self):
        args = self._parse(["--mode", "comprehensive", "--summary-variant", "scientific_advisor"])
        self.assertEqual(args.base_url, "http://127.0.0.1:5001")

    def test_custom_base_url(self):
        args = self._parse(["--mode", "comprehensive", "--summary-variant", "scientific_advisor",
                            "--base-url", "http://localhost:9000"])
        self.assertEqual(args.base_url, "http://localhost:9000")

    def test_dry_run_flag(self):
        args = self._parse(["--mode", "comprehensive", "--summary-variant", "scientific_advisor",
                            "--dry-run"])
        self.assertTrue(args.dry_run)

    def test_dry_run_default_false(self):
        args = self._parse(["--mode", "comprehensive", "--summary-variant", "scientific_advisor"])
        self.assertFalse(args.dry_run)

    def test_mode_required_exits_with_code_2(self):
        old = sys.argv[:]
        try:
            sys.argv = ["cv_generate_cli.py"]
            with self.assertRaises(SystemExit) as cm:
                cv_cli._parse_args()
            self.assertEqual(cm.exception.code, 2)
        finally:
            sys.argv = old

    def test_summary_variant_parsed(self):
        args = self._parse(["--mode", "comprehensive",
                            "--summary-variant", "federal_advisor"])
        self.assertEqual(args.summary_variant, "federal_advisor")

    def test_summary_variant_required_exits_with_code_2(self):
        """--summary-variant has no default on purpose.

        The summary is the most role-specific text on the CV, so a silent
        default produces a plausible document aimed at the wrong audience.
        """
        old = sys.argv[:]
        try:
            sys.argv = ["cv_generate_cli.py", "--mode", "comprehensive"]
            with self.assertRaises(SystemExit) as cm:
                cv_cli._parse_args()
            self.assertEqual(cm.exception.code, 2)
        finally:
            sys.argv = old

    def test_invalid_mode_rejected(self):
        old = sys.argv[:]
        try:
            sys.argv = ["cv_generate_cli.py", "--mode", "extreme",
                        "--summary-variant", "scientific_advisor"]
            with self.assertRaises(SystemExit) as cm:
                cv_cli._parse_args()
            self.assertEqual(cm.exception.code, 2)
        finally:
            sys.argv = old


# ---------------------------------------------------------------------------
# _require_cv_builder
# ---------------------------------------------------------------------------

class TestRequireCvBuilder(unittest.TestCase):
    """The preflight probe decides where this CLI sends data, so it is tested
    as a gate rather than as a formatter.

    Exit codes are part of the contract, because a scripted caller cannot read
    stderr: 3 means retryable (nothing there yet, or wedged), 4 means fatal
    (something is there and it is the wrong thing).

    Three defects are pinned here by regression tests, each of which was
    demonstrated against the real code before being written:
      - a 404 counted as success (the original bug);
      - a host answering only {"alive": true} was accepted (an impostor drove
        the whole CLI to exit 0);
      - a redirect let host B satisfy a probe aimed at host A.
    """

    # -- the happy path -----------------------------------------------------

    def test_live_cv_builder_returns_payload(self):
        resp = _mock_response(200, {"alive": True, "ok": True, "phase": None})
        with patch("requests.get", return_value=resp):
            data = cv_cli._require_cv_builder("http://127.0.0.1:5001")
        self.assertTrue(data["alive"])

    def test_probes_api_status(self):
        resp = _mock_response(200, {"alive": True})
        with patch("requests.get", return_value=resp) as mock_get:
            cv_cli._require_cv_builder("http://127.0.0.1:5001")
        url = mock_get.call_args[0][0]
        self.assertTrue(url.endswith("/api/status"), url)

    def test_probe_does_not_follow_redirects(self):
        """allow_redirects=False is the control, not a detail.

        With it on, the host that ANSWERS the probe need not be the host that
        RECEIVES the data — demonstrated with a 302 to a second host, after
        which every workflow POST went to the unvalidated first host.
        """
        resp = _mock_response(200, {"alive": True})
        with patch("requests.get", return_value=resp) as mock_get:
            cv_cli._require_cv_builder("http://127.0.0.1:5001")
        self.assertIs(mock_get.call_args.kwargs.get("allow_redirects"), False)

    # -- retryable: nothing usable there yet (exit 3) -----------------------

    def test_connection_error_is_retryable_exit_3(self):
        with patch("requests.get", side_effect=requests.ConnectionError("refused")):
            with self.assertRaises(SystemExit) as cm:
                cv_cli._require_cv_builder("http://127.0.0.1:5001")
        self.assertEqual(cm.exception.code, 3)

    def test_timeout_is_distinguished_from_unreachable(self):
        """A wedged or still-booting server is reachable; saying otherwise sends
        the operator to the wrong remedy."""
        with patch("requests.get", side_effect=requests.Timeout("slow")):
            with self.assertRaises(SystemExit) as cm:
                cv_cli._require_cv_builder("http://127.0.0.1:5001")
        self.assertEqual(cm.exception.code, 3)

    def test_5xx_is_retryable_not_wrong_host(self):
        """A 500 from /api/status is overwhelmingly cv-builder erroring, not a
        different service — so it must not claim 'not a cv-builder app'."""
        resp = _mock_response(500, {"error": "boom"})
        with patch("requests.get", return_value=resp):
            with self.assertRaises(SystemExit) as cm:
                cv_cli._require_cv_builder("http://127.0.0.1:5001")
        self.assertEqual(cm.exception.code, 3)

    # -- fatal: something is there, and it is the wrong thing (exit 4) ------

    def test_404_is_rejected_not_treated_as_success(self):
        """The original defect, pinned.

        The fixture satisfies every OTHER guard — it carries alive:true — so
        only the status-code branch can reject it. An earlier version of this
        test used {"error": "not found"}, which also tripped the payload guard;
        the status guard could then be deleted with the suite still green.
        """
        resp = _mock_response(404, {"alive": True})
        with patch("requests.get", return_value=resp):
            with self.assertRaises(SystemExit) as cm:
                cv_cli._require_cv_builder("http://127.0.0.1:5001")
        self.assertEqual(cm.exception.code, 4)

    def test_redirect_is_refused(self):
        resp = _mock_response(302, {})
        resp.headers = {"Location": "http://elsewhere.example/api/status"}
        with patch("requests.get", return_value=resp):
            with self.assertRaises(SystemExit) as cm:
                cv_cli._require_cv_builder("http://127.0.0.1:5001")
        self.assertEqual(cm.exception.code, 4)

    def test_non_json_body_is_rejected(self):
        resp = MagicMock()
        resp.status_code = 200
        resp.json.side_effect = ValueError("not json")
        with patch("requests.get", return_value=resp):
            with self.assertRaises(SystemExit) as cm:
                cv_cli._require_cv_builder("http://127.0.0.1:5001")
        self.assertEqual(cm.exception.code, 4)

    def test_json_without_alive_field_is_rejected(self):
        resp = _mock_response(200, {"status": "fine", "service": "something-else"})
        with patch("requests.get", return_value=resp):
            with self.assertRaises(SystemExit) as cm:
                cv_cli._require_cv_builder("http://127.0.0.1:5001")
        self.assertEqual(cm.exception.code, 4)

    def test_alive_false_is_rejected(self):
        """Regression: the predicate tests the CLAIM, not the key's presence.

        A membership test accepted alive:false, null, 0 and {} — a host saying
        'I am not alive' passed a check named for liveness.
        """
        for payload in ({"alive": False}, {"alive": None}, {"alive": 0},
                        {"alive": {}}, {"alive": "yes"}):
            with self.subTest(payload=payload):
                resp = _mock_response(200, payload)
                with patch("requests.get", return_value=resp):
                    with self.assertRaises(SystemExit) as cm:
                        cv_cli._require_cv_builder("http://127.0.0.1:5001")
                self.assertEqual(cm.exception.code, 4)

    # -- the host bound, which is the control that actually holds -----------

    def test_non_loopback_host_is_refused_before_any_request(self):
        """The payload check cannot authenticate an app that has no auth, so the
        host bound is the real control. Refused BEFORE the network call, so a
        mistyped or hostile --base-url never even receives a probe."""
        with patch("requests.get") as mock_get:
            with self.assertRaises(SystemExit) as cm:
                cv_cli._require_cv_builder("http://example.com:5001")
        self.assertEqual(cm.exception.code, 4)
        mock_get.assert_not_called()

    def test_allow_remote_permits_a_non_loopback_host(self):
        resp = _mock_response(200, {"alive": True})
        with patch("requests.get", return_value=resp):
            data = cv_cli._require_cv_builder("http://example.com:5001",
                                              allow_remote=True)
        self.assertTrue(data["alive"])

    def test_impostor_on_loopback_still_passes_and_that_is_documented(self):
        """Stated rather than hidden: on loopback, a host answering alive:true
        IS accepted. cv-builder has no authentication, so no probe can do
        better; the loopback bound is what keeps that acceptable."""
        resp = _mock_response(200, {"alive": True})
        with patch("requests.get", return_value=resp):
            data = cv_cli._require_cv_builder("http://127.0.0.1:9999")
        self.assertTrue(data["alive"])


# ---------------------------------------------------------------------------
# the probe path must name a route the app actually serves
# ---------------------------------------------------------------------------

class TestProbePathExists(unittest.TestCase):
    """Offline guard against the defect class that caused the original bug.

    Every other test here mocks requests, so the suite asserts only that a
    particular STRING is requested — it cannot tell a real endpoint from an
    invented one. Substituting a nonexistent path into both module and tests
    left all tests passing while the CLI aborted against the live app.
    """

    def test_probe_path_is_a_real_route(self):
        import importlib.util
        import sys as _sys
        from pathlib import Path as _Path

        repo = _Path(__file__).resolve().parent.parent
        routes_dir = repo / "scripts" / "routes"
        if not routes_dir.is_dir():
            self.skipTest("scripts/routes not present")

        # Read the route table from source rather than importing the whole app:
        # importing web_app pulls in config, an LLM client and a live provider
        # registry, which a unit test should not need.
        declared = set()
        for f in routes_dir.glob("*.py"):
            for m in re.finditer(r"""@bp\.(?:get|post|put|delete|route)\(\s*["']([^"']+)["']""",
                                 f.read_text(encoding="utf-8")):
                declared.add(m.group(1))
        self.assertTrue(declared, "no routes parsed — the guard would pass vacuously")
        self.assertIn("/api/status", declared,
                      "the preflight probes /api/status; no route declares it")


# ---------------------------------------------------------------------------
# _resolve_summary_variant
# ---------------------------------------------------------------------------

class TestResolveSummaryVariant(unittest.TestCase):

    def test_known_variant_returned_unchanged(self):
        master = _master()
        self.assertEqual(
            cv_cli._resolve_summary_variant(master, "scientific_advisor"),
            "scientific_advisor",
        )

    def test_unknown_variant_aborts_and_lists_available(self):
        master = _master()
        with self.assertRaises(SystemExit) as cm:
            cv_cli._resolve_summary_variant(master, "no_such_variant")
        msg = str(cm.exception)
        self.assertIn("no_such_variant", msg)
        self.assertIn("scientific_advisor", msg)

    def test_unknown_variant_is_not_silently_defaulted(self):
        """Regression guard: the API accepts any string for summary_focus.

        If this ever falls back to a default instead of raising, an
        unrecognised variant posts successfully and the CV is generated with
        the wrong summary - a wrong document that looks like a right one.
        """
        master = _master()
        with self.assertRaises(SystemExit):
            cv_cli._resolve_summary_variant(master, "typo_advisor")

    def test_missing_summaries_aborts(self):
        master = MasterDataBuilder().with_summaries({}).build()
        with self.assertRaises(SystemExit) as cm:
            cv_cli._resolve_summary_variant(master, "scientific_advisor")
        self.assertIn("professional_summaries", str(cm.exception))

    def test_list_form_summaries_aborts(self):
        """Legacy list-form summaries have no keys to select by."""
        master = MasterDataBuilder().with_summaries(["just a string"]).build()
        with self.assertRaises(SystemExit):
            cv_cli._resolve_summary_variant(master, "scientific_advisor")

    def test_available_variants_preserves_declaration_order(self):
        master = MasterDataBuilder().with_summaries(
            {"b_second": "x", "a_first": "y"}
        ).build()
        self.assertEqual(
            cv_cli._available_summary_variants(master),
            ["b_second", "a_first"],
        )


# ---------------------------------------------------------------------------
# _post / _get
# ---------------------------------------------------------------------------

def _mock_response(status_code: int, data: dict) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = data
    return resp


class TestPostHelper(unittest.TestCase):

    def test_post_returns_json_on_200(self):
        with patch("requests.post", return_value=_mock_response(200, {"session_id": "abc"})):
            result = cv_cli._post("http://localhost:5001", "/api/sessions/new", {})
        self.assertEqual(result, {"session_id": "abc"})

    def test_post_raises_api_error_on_4xx(self):
        with patch("requests.post", return_value=_mock_response(400, {"error": "bad"})):
            with self.assertRaises(cv_cli.APIError):
                cv_cli._post("http://localhost:5001", "/api/sessions/new", {})

    def test_post_raises_api_error_on_5xx(self):
        with patch("requests.post", return_value=_mock_response(500, {})):
            with self.assertRaises(cv_cli.APIError):
                cv_cli._post("http://localhost:5001", "/api/sessions/new", {})

    def test_post_raises_api_error_on_connection_error(self):
        import requests as _req
        with patch("requests.post", side_effect=_req.RequestException("refused")):
            with self.assertRaises(cv_cli.APIError):
                cv_cli._post("http://localhost:5001", "/api/sessions/new", {})


class TestGetHelper(unittest.TestCase):

    def test_get_returns_json_on_200(self):
        with patch("requests.get", return_value=_mock_response(200, {"status": "ok"})):
            result = cv_cli._get("http://localhost:5001", "/api/status")
        self.assertEqual(result, {"status": "ok"})

    def test_get_raises_api_error_on_5xx(self):
        with patch("requests.get", return_value=_mock_response(500, {})):
            with self.assertRaises(cv_cli.APIError):
                cv_cli._get("http://localhost:5001", "/api/status")

    def test_get_raises_api_error_on_connection_error(self):
        import requests as _req
        with patch("requests.get", side_effect=_req.RequestException("timeout")):
            with self.assertRaises(cv_cli.APIError):
                cv_cli._get("http://localhost:5001", "/api/status")


# ---------------------------------------------------------------------------
# run_generation (dry_run)
# ---------------------------------------------------------------------------

class TestRunGenerationDryRun(unittest.TestCase):

    def setUp(self):
        self._f = _write_master(_master())

    def tearDown(self):
        Path(self._f.name).unlink(missing_ok=True)

    def test_dry_run_returns_empty_dict(self):
        result = cv_cli.run_generation(
            base_url="http://localhost:5001",
            mode="comprehensive",
            job_text="Some job",
            master_cv_path=self._f.name,
            publications_path="/nonexistent/publications.bib",
            summary_variant="scientific_advisor",
            dry_run=True,
        )
        self.assertEqual(result, {})

    def test_dry_run_makes_no_http_calls(self):
        with patch("requests.post") as mock_post, patch("requests.get") as mock_get:
            cv_cli.run_generation(
                base_url="http://localhost:5001",
                mode="focused",
                job_text="Some job",
                master_cv_path=self._f.name,
                publications_path="/nonexistent/publications.bib",
                summary_variant="scientific_advisor",
                dry_run=True,
            )
        mock_post.assert_not_called()
        mock_get.assert_not_called()


# ---------------------------------------------------------------------------
# run_generation (mocked API)
# ---------------------------------------------------------------------------

class TestRunGenerationMockedAPI(unittest.TestCase):

    def setUp(self):
        self._f = _write_master(_master())

    def tearDown(self):
        Path(self._f.name).unlink(missing_ok=True)

    def _post_side_effect(self, url: str, json: dict = None, timeout: int = None,
                          allow_redirects: bool = True) -> MagicMock:  # type: ignore[assignment]
        resp = MagicMock()
        resp.status_code = 200
        payload: dict = json or {}
        if url.endswith("/api/sessions/new"):
            resp.json.return_value = {"session_id": "test-sid-001"}
        elif url.endswith("/api/job"):
            assert "session_id" in payload, f"/api/job missing session_id; got {list(payload)}"
            assert "job_text" in payload, f"/api/job missing job_text; got {list(payload)}"
            assert isinstance(payload["job_text"], str), "/api/job: job_text must be str"
            resp.json.return_value = {"ok": True}
        elif url.endswith("/api/action"):
            assert "session_id" in payload, f"/api/action missing session_id; got {list(payload)}"
            assert "action" in payload, f"/api/action missing action; got {list(payload)}"
            assert isinstance(payload["action"], str), "/api/action: action must be str"
            resp.json.return_value = {"phase": "review", "result": {"text": ""}}
        elif url.endswith("/api/review-decisions"):
            assert "session_id" in payload, f"/api/review-decisions missing session_id; got {list(payload)}"
            assert "type" in payload, f"/api/review-decisions missing type; got {list(payload)}"
            assert "decisions" in payload, f"/api/review-decisions missing decisions; got {list(payload)}"
            assert isinstance(payload["type"], str), "/api/review-decisions: type must be str"
            resp.json.return_value = {"ok": True}
        elif url.endswith("/api/cv/generate-preview"):
            assert "session_id" in payload, f"/api/cv/generate-preview missing session_id; got {list(payload)}"
            resp.json.return_value = {"page_count_exact": 2}
        elif url.endswith("/api/cv/confirm-layout"):
            assert "session_id" in payload, f"/api/cv/confirm-layout missing session_id; got {list(payload)}"
            resp.json.return_value = {"ok": True}
        elif url.endswith("/api/cv/generate-final"):
            assert "session_id" in payload, f"/api/cv/generate-final missing session_id; got {list(payload)}"
            resp.json.return_value = {
                "outputs": {"final_html": "/tmp/cv.html"},
                "page_count_exact": 2,
            }
        else:
            resp.json.return_value = {"phase": "review", "result": {"text": ""}}
        return resp

    def test_returns_session_id_and_outputs(self):
        with patch("requests.post", side_effect=self._post_side_effect):
            result = cv_cli.run_generation(
                base_url="http://localhost:5001",
                mode="comprehensive",
                job_text="Some job",
                master_cv_path=self._f.name,
                publications_path="/nonexistent/publications.bib",
                summary_variant="scientific_advisor",
                dry_run=False,
            )
        self.assertEqual(result["session_id"], "test-sid-001")
        self.assertIn("outputs", result)

    def test_creates_session_as_first_api_call(self):
        calls: list[str] = []

        def _side(url: str, json: dict = None, timeout: int = None,
                  allow_redirects: bool = True) -> MagicMock:  # type: ignore[assignment]
            calls.append(url)
            return self._post_side_effect(url, json=json, timeout=timeout)

        with patch("requests.post", side_effect=_side):
            cv_cli.run_generation(
                base_url="http://localhost:5001",
                mode="comprehensive",
                job_text="Some job",
                master_cv_path=self._f.name,
                publications_path="/nonexistent/publications.bib",
                summary_variant="scientific_advisor",
                dry_run=False,
            )
        self.assertTrue(calls[0].endswith("/api/sessions/new"), f"First call was {calls[0]}")

    def test_calls_generate_final_as_last_api_call(self):
        calls: list[str] = []

        def _side(url: str, json: dict = None, timeout: int = None,
                  allow_redirects: bool = True) -> MagicMock:  # type: ignore[assignment]
            calls.append(url)
            return self._post_side_effect(url, json=json, timeout=timeout)

        with patch("requests.post", side_effect=_side):
            cv_cli.run_generation(
                base_url="http://localhost:5001",
                mode="comprehensive",
                job_text="Some job",
                master_cv_path=self._f.name,
                publications_path="/nonexistent/publications.bib",
                summary_variant="scientific_advisor",
                dry_run=False,
            )
        self.assertTrue(calls[-1].endswith("/api/cv/generate-final"), f"Last call was {calls[-1]}")

    def test_run_generation_requires_provider_when_not_dry_run(self):
        """run_generation raises APIError when app is unreachable (e.g. not started with --llm-provider)."""
        with patch("requests.post", side_effect=requests.ConnectionError("Connection refused")):
            with self.assertRaises(cv_cli.APIError):
                cv_cli.run_generation(
                    base_url="http://localhost:5001",
                    mode="comprehensive",
                    job_text="Some job",
                    master_cv_path=self._f.name,
                    publications_path="/nonexistent/publications.bib",
                    summary_variant="scientific_advisor",
                    dry_run=False,
                )

    def test_api_returns_500(self):
        """run_generation raises APIError when the server returns HTTP 500."""
        def _side_500(url: str, json: dict = None, timeout: int = None,
                     allow_redirects: bool = True) -> MagicMock:  # type: ignore[assignment]
            resp = MagicMock()
            resp.status_code = 500
            resp.json.return_value = {"error": "Internal Server Error"}
            resp.text = "Internal Server Error"
            return resp

        with patch("requests.post", side_effect=_side_500):
            with self.assertRaises(cv_cli.APIError):
                cv_cli.run_generation(
                    base_url="http://localhost:5001",
                    mode="comprehensive",
                    job_text="Some job",
                    master_cv_path=self._f.name,
                    publications_path="/nonexistent/publications.bib",
                    summary_variant="scientific_advisor",
                    dry_run=False,
                )

    def test_api_returns_invalid_json(self):
        """run_generation raises APIError when the server returns non-JSON body."""
        def _side_bad_json(url: str, json: dict = None, timeout: int = None,
                          allow_redirects: bool = True) -> MagicMock:  # type: ignore[assignment]
            resp = MagicMock()
            resp.status_code = 200
            resp.json.side_effect = ValueError("No JSON object could be decoded")
            resp.text = "<html>Unexpected error</html>"
            return resp

        with patch("requests.post", side_effect=_side_bad_json):
            with self.assertRaises(cv_cli.APIError):
                cv_cli.run_generation(
                    base_url="http://localhost:5001",
                    mode="comprehensive",
                    job_text="Some job",
                    master_cv_path=self._f.name,
                    publications_path="/nonexistent/publications.bib",
                    summary_variant="scientific_advisor",
                    dry_run=False,
                )


if __name__ == "__main__":
    unittest.main()
