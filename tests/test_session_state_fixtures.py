# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Tests for reusable saved-session fixture factories."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock

from scripts.utils.conversation_manager import ConversationManager
from scripts.utils.cv_orchestrator import CVOrchestrator
from scripts.utils.llm_client import LLMClient
from scripts.utils.config import get_config
from tests.helpers.session_state_fixtures import (
    build_session_state,
    materialize_canonical_session,
)


MINIMAL_MASTER_DATA = {
    "personal_info": {
        "name": "Fixture User",
        "title": "Engineer",
        "contact": {
            "email": "fixture@example.com",
            "phone": "5555551234",
            "linkedin": "",
            "github": "",
            "address": {"city": "Boston", "state": "MA"},
        },
    },
    "experiences": [
        {
            "company": "Acme",
            "title": "Engineer",
            "start": "2020-01",
            "end": "2023-12",
            "bullets": ["Did things"],
        },
    ],
    "education": [{"degree": "BS", "institution": "MIT", "year": "2015"}],
    "skills": [{"name": "Python", "category": "Programming"}],
    "achievements": [],
    "awards": [],
    "publications": [],
    "summaries": [{"summary": "Experienced engineer.", "audience": []}],
}


class TestSessionStateFixtures(unittest.TestCase):
    def setUp(self):
        self.config = get_config()
        self.mock_llm = MagicMock(spec=LLMClient)
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)

        master_path = self.tmp_path / "Master_CV_Data.json"
        master_path.write_text(
            json.dumps(MINIMAL_MASTER_DATA),
            encoding="utf-8",
        )
        pubs_path = self.tmp_path / "publications.bib"
        pubs_path.touch()

        self.orchestrator = CVOrchestrator(
            master_data_path=str(master_path),
            publications_path=str(pubs_path),
            output_dir=str(self.tmp_path),
            llm_client=self.mock_llm,
        )
        self.manager = ConversationManager(
            orchestrator=self.orchestrator,
            llm_client=self.mock_llm,
            config=self.config,
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_materialize_init_idle_session_loads(self):
        session_file = materialize_canonical_session(
            self.tmp_path,
            "init_idle",
        )
        self.manager.load_session(str(session_file))

        self.assertEqual(self.manager.state["phase"], "init")
        self.assertEqual(self.manager.state["generation_state"], {})
        self.assertIsNone(self.manager.state["job_description"])

    def test_materialize_layout_review_confirmed_session_loads(self):
        session_file = materialize_canonical_session(
            self.tmp_path,
            "layout_review_confirmed",
        )
        self.manager.load_session(str(session_file))

        generation_state = self.manager.state["generation_state"]
        self.assertEqual(self.manager.state["phase"], "layout_review")
        self.assertEqual(generation_state["phase"], "confirmed")
        self.assertTrue(generation_state["layout_confirmed"])
        self.assertIn("preview_html", generation_state)
        self.assertIsNotNone(self.manager.state["generated_files"])

    def test_materialize_refinement_final_complete_session_loads(self):
        session_file = materialize_canonical_session(
            self.tmp_path,
            "refinement_final_complete",
        )
        self.manager.load_session(str(session_file))

        generation_state = self.manager.state["generation_state"]
        generated_files = self.manager.state["generated_files"]

        self.assertEqual(self.manager.state["phase"], "refinement")
        self.assertEqual(generation_state["phase"], "final_complete")
        self.assertIn("final_output_paths", generation_state)
        self.assertEqual(
            generated_files["final_html"],
            generation_state["final_output_paths"]["html"],
        )
        self.assertEqual(
            generated_files["final_pdf"],
            generation_state["final_output_paths"]["pdf"],
        )

    def test_invalid_confirmed_requires_explicit_override(self):
        with self.assertRaises(ValueError):
            build_session_state("customization", "confirmed")


if __name__ == "__main__":
    unittest.main()
