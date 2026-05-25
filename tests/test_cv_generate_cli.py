# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
"""Unit tests for scripts/cv_generate_cli.py."""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

REPO_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = REPO_ROOT / "scripts" / "cv_generate_cli.py"

_spec = importlib.util.spec_from_file_location("cv_generate_cli", MODULE_PATH)
assert _spec is not None and _spec.loader is not None, f"Could not load {MODULE_PATH}"
cv_cli = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cv_cli)  # type: ignore[union-attr]


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------

def _master(skills_format: str = "list") -> dict:
    """Minimal master CV dict that exercises both skills formats."""
    if skills_format == "list":
        skills: object = [{"name": "Python"}, {"name": "R"}, "SQL"]
    else:
        skills = {
            "programming": {"category": "Programming", "skills": [{"name": "Python"}, {"name": "R"}]},
            "databases": [{"name": "SQL"}, "NoSQL"],
        }
    return {
        "skills": skills,
        "experience": [
            {
                "id": "exp_001",
                "achievements": [
                    {"id": "ach_001_a", "importance": 9},
                    {"id": "ach_001_b", "importance": 7},
                ],
            },
            {
                "id": "exp_002",
                "achievements": [
                    {"id": "ach_002_a", "importance": 8},
                ],
            },
        ],
    }


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
        self.assertEqual(ids, ["ach_001_a", "ach_001_b", "ach_002_a"])

    def test_empty_experience(self):
        self.assertEqual(cv_cli._all_achievement_ids({"experience": []}), [])

    def test_missing_experience_key(self):
        self.assertEqual(cv_cli._all_achievement_ids({}), [])

    def test_achievement_without_id_is_skipped(self):
        master = {
            "experience": [
                {
                    "id": "exp_001",
                    "achievements": [
                        {"importance": 8},            # no id — skip
                        {"id": "ach_001_a"},           # has id — keep
                    ],
                }
            ]
        }
        self.assertEqual(cv_cli._all_achievement_ids(master), ["ach_001_a"])


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
        self.assertIn("ach_001_a", decisions)
        self.assertIn("ach_001_b", decisions)
        self.assertIn("ach_002_a", decisions)
        self.assertNotIn("exclude", decisions.values())

    def test_comprehensive_emphasizes_importance_9(self):
        decisions = cv_cli._build_achievement_decisions(_master(), "comprehensive")
        self.assertEqual(decisions["ach_001_a"], "emphasize")  # importance=9
        self.assertEqual(decisions["ach_001_b"], "include")    # importance=7
        self.assertEqual(decisions["ach_002_a"], "include")    # importance=8

    def test_focused_excludes_achievements_from_excluded_experiences(self):
        # exp_001 is "exclude" in focused mode
        decisions = cv_cli._build_achievement_decisions(_master(), "focused")
        self.assertEqual(decisions["ach_001_a"], "exclude")
        self.assertEqual(decisions["ach_001_b"], "exclude")

    def test_focused_keeps_achievements_from_non_excluded_experiences(self):
        # exp_002 is "emphasize" in focused mode
        decisions = cv_cli._build_achievement_decisions(_master(), "focused")
        self.assertNotEqual(decisions["ach_002_a"], "exclude")

    def test_no_achievements_returns_empty_dict(self):
        master = {"experience": [{"id": "exp_001", "achievements": []}]}
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
        args = self._parse(["--mode", "comprehensive"])
        self.assertEqual(args.mode, "comprehensive")

    def test_mode_focused(self):
        args = self._parse(["--mode", "focused"])
        self.assertEqual(args.mode, "focused")

    def test_default_base_url(self):
        args = self._parse(["--mode", "comprehensive"])
        self.assertEqual(args.base_url, "http://127.0.0.1:5001")

    def test_custom_base_url(self):
        args = self._parse(["--mode", "comprehensive", "--base-url", "http://localhost:9000"])
        self.assertEqual(args.base_url, "http://localhost:9000")

    def test_dry_run_flag(self):
        args = self._parse(["--mode", "comprehensive", "--dry-run"])
        self.assertTrue(args.dry_run)

    def test_dry_run_default_false(self):
        args = self._parse(["--mode", "comprehensive"])
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

    def test_invalid_mode_rejected(self):
        old = sys.argv[:]
        try:
            sys.argv = ["cv_generate_cli.py", "--mode", "extreme"]
            with self.assertRaises(SystemExit) as cm:
                cv_cli._parse_args()
            self.assertEqual(cm.exception.code, 2)
        finally:
            sys.argv = old


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
            result = cv_cli._get("http://localhost:5001", "/api/models")
        self.assertEqual(result, {"status": "ok"})

    def test_get_raises_api_error_on_5xx(self):
        with patch("requests.get", return_value=_mock_response(500, {})):
            with self.assertRaises(cv_cli.APIError):
                cv_cli._get("http://localhost:5001", "/api/models")

    def test_get_raises_api_error_on_connection_error(self):
        import requests as _req
        with patch("requests.get", side_effect=_req.RequestException("timeout")):
            with self.assertRaises(cv_cli.APIError):
                cv_cli._get("http://localhost:5001", "/api/models")


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

    def _post_side_effect(self, url: str, json: dict = None, timeout: int = None) -> MagicMock:  # type: ignore[assignment]
        resp = MagicMock()
        resp.status_code = 200
        if url.endswith("/api/sessions/new"):
            resp.json.return_value = {"session_id": "test-sid-001"}
        elif url.endswith("/api/cv/generate-preview"):
            resp.json.return_value = {"page_count_exact": 2}
        elif url.endswith("/api/cv/generate-final"):
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
                dry_run=False,
            )
        self.assertEqual(result["session_id"], "test-sid-001")
        self.assertIn("outputs", result)

    def test_creates_session_as_first_api_call(self):
        calls: list[str] = []

        def _side(url: str, json: dict = None, timeout: int = None) -> MagicMock:  # type: ignore[assignment]
            calls.append(url)
            return self._post_side_effect(url, json=json, timeout=timeout)

        with patch("requests.post", side_effect=_side):
            cv_cli.run_generation(
                base_url="http://localhost:5001",
                mode="comprehensive",
                job_text="Some job",
                master_cv_path=self._f.name,
                publications_path="/nonexistent/publications.bib",
                dry_run=False,
            )
        self.assertTrue(calls[0].endswith("/api/sessions/new"), f"First call was {calls[0]}")

    def test_calls_generate_final_as_last_api_call(self):
        calls: list[str] = []

        def _side(url: str, json: dict = None, timeout: int = None) -> MagicMock:  # type: ignore[assignment]
            calls.append(url)
            return self._post_side_effect(url, json=json, timeout=timeout)

        with patch("requests.post", side_effect=_side):
            cv_cli.run_generation(
                base_url="http://localhost:5001",
                mode="comprehensive",
                job_text="Some job",
                master_cv_path=self._f.name,
                publications_path="/nonexistent/publications.bib",
                dry_run=False,
            )
        self.assertTrue(calls[-1].endswith("/api/cv/generate-final"), f"Last call was {calls[-1]}")


if __name__ == "__main__":
    unittest.main()
