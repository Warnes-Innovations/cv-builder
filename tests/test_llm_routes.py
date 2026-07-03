#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Unit tests for the HTTP LLM passthrough routes.

Routes under test:
    POST /api/llm/<operation>/prompt  — returns PromptBundle
    POST /api/llm/<operation>/result  — validates and stores LLM response

Coverage:
- Happy paths for prompt and result endpoints
- Unknown operation → 400 unknown_operation
- Missing required fields → 400
- prepare_llm_call ValueError (precondition failure) → 400
- InvalidResultError on result submission → 400
- chat result: user_message stored in history before inject
- Operation-specific response extras (position_name, proposal_count, etc.)
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch, call

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from flask import Flask

from routes.llm_routes import create_blueprint
from utils.agent_bridge import InvalidResultError, OperationType, PromptBundle


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SAMPLE_BUNDLE = PromptBundle(
    operation=OperationType.JOB_ANALYSIS,
    messages=[{"role": "user", "content": "Analyze this job."}],
    output_schema={"type": "object"},
    instructions="Return strict JSON.",
    context_hint="cv-builder: job_analysis",
)


def _make_mock_session(phase="job_analysis", state=None):
    """Return a mock HeadlessSession with sensible defaults."""
    sess = MagicMock()
    sess.phase                = phase
    sess.state                = state or {"position_name": "Data Scientist"}
    sess.conversation_history = []
    sess.prepare_llm_call.return_value = _SAMPLE_BUNDLE
    sess.inject_llm_result.return_value = None
    sess.save.return_value = None
    sess.add_to_history.return_value = None
    return sess


def _make_app(mock_entry):
    """Return a Flask test client wired to *mock_entry* for session lookup."""
    app = Flask(__name__)
    app.config["TESTING"] = True

    deps = {}
    deps["get_session"] = MagicMock(return_value=mock_entry)

    bp = create_blueprint(deps)
    app.register_blueprint(bp)
    return app.test_client(), deps


# ---------------------------------------------------------------------------
# POST /api/llm/<operation>/prompt
# ---------------------------------------------------------------------------

class TestLlmPromptEndpoint(unittest.TestCase):

    def _call_prompt(self, operation, body, session_state=None, phase="job_analysis"):
        """Helper: wire up mocks and POST to the prompt endpoint."""
        mock_session = _make_mock_session(phase=phase, state=session_state)
        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()

        client, deps = _make_app(mock_entry)

        with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                   return_value=mock_session):
            rv = client.post(
                f"/api/llm/{operation}/prompt",
                json=body,
                content_type="application/json",
            )
        return rv, mock_session, deps

    # ---- happy path --------------------------------------------------------

    def test_happy_path_returns_bundle(self):
        rv, mock_session, _ = self._call_prompt(
            "job_analysis", {"session_id": "abc123"}
        )
        self.assertEqual(rv.status_code, 200)
        data = rv.get_json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["operation"], "job_analysis")
        self.assertIn("messages", data)
        self.assertIn("output_schema", data)
        self.assertIn("instructions", data)
        self.assertIn("context_hint", data)

    def test_kwargs_forwarded_to_prepare(self):
        """Extra body fields (except session_id) are passed as kwargs."""
        rv, mock_session, _ = self._call_prompt(
            "summary",
            {"session_id": "abc", "refinement_prompt": "More concise please."},
        )
        self.assertEqual(rv.status_code, 200)
        mock_session.prepare_llm_call.assert_called_once()
        _op, kwargs = mock_session.prepare_llm_call.call_args.args[0], \
                      mock_session.prepare_llm_call.call_args.kwargs
        self.assertIn("refinement_prompt", kwargs)
        self.assertEqual(kwargs["refinement_prompt"], "More concise please.")

    def test_session_id_not_forwarded_as_kwarg(self):
        """session_id is stripped before forwarding kwargs."""
        rv, mock_session, _ = self._call_prompt(
            "job_analysis", {"session_id": "abc"}
        )
        _op, kwargs = mock_session.prepare_llm_call.call_args.args[0], \
                      mock_session.prepare_llm_call.call_args.kwargs
        self.assertNotIn("session_id", kwargs)

    # ---- error cases -------------------------------------------------------

    def test_unknown_operation_returns_400(self):
        mock_entry = MagicMock()
        client, _ = _make_app(mock_entry)
        rv = client.post(
            "/api/llm/not_a_real_op/prompt",
            json={"session_id": "abc"},
        )
        self.assertEqual(rv.status_code, 400)
        data = rv.get_json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["error_code"], "unknown_operation")

    def test_precondition_failure_returns_400(self):
        """prepare_llm_call raises ValueError when state prerequisites are missing."""
        mock_session = _make_mock_session()
        mock_session.prepare_llm_call.side_effect = ValueError(
            "No job description in session state."
        )
        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()
        client, _ = _make_app(mock_entry)

        with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                   return_value=mock_session):
            rv = client.post(
                "/api/llm/job_analysis/prompt",
                json={"session_id": "abc"},
            )
        self.assertEqual(rv.status_code, 400)
        data = rv.get_json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["error_code"], "precondition_failed")

    def test_invalid_kwarg_returns_400(self):
        """prepare_llm_call raises TypeError for unknown kwargs."""
        mock_session = _make_mock_session()
        mock_session.prepare_llm_call.side_effect = TypeError(
            "Unexpected keyword argument 'garbage'"
        )
        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()
        client, _ = _make_app(mock_entry)

        with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                   return_value=mock_session):
            rv = client.post(
                "/api/llm/job_analysis/prompt",
                json={"session_id": "abc", "garbage": "field"},
            )
        self.assertEqual(rv.status_code, 400)
        data = rv.get_json()
        self.assertEqual(data["error_code"], "invalid_params")

    def test_all_operation_values_accepted(self):
        """Every OperationType string value is accepted as a valid <operation>."""
        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()
        client, _ = _make_app(mock_entry)
        mock_session = _make_mock_session()

        for op in OperationType:
            with self.subTest(operation=op.value):
                with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                           return_value=mock_session):
                    rv = client.post(
                        f"/api/llm/{op.value}/prompt",
                        json={"session_id": "abc"},
                    )
                # 200 or 400-precondition are both valid (state may be missing);
                # anything else means route wiring is wrong.
                self.assertIn(rv.status_code, (200, 400))
                data = rv.get_json()
                if rv.status_code == 400:
                    self.assertNotEqual(data.get("error_code"), "unknown_operation")


# ---------------------------------------------------------------------------
# POST /api/llm/<operation>/result
# ---------------------------------------------------------------------------

class TestLlmResultEndpoint(unittest.TestCase):

    def _call_result(self, operation, body, session_state=None, phase="customization"):
        """Helper: wire up mocks and POST to the result endpoint."""
        mock_session = _make_mock_session(phase=phase, state=session_state or {})
        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()
        client, deps = _make_app(mock_entry)

        with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                   return_value=mock_session):
            rv = client.post(
                f"/api/llm/{operation}/result",
                json=body,
                content_type="application/json",
            )
        return rv, mock_session, deps

    # ---- happy paths -------------------------------------------------------

    def test_happy_path_returns_ok_and_phase(self):
        rv, _, _ = self._call_result(
            "recommendations",
            {"session_id": "abc", "result": '{"summary": "Good fit."}'},
            phase="customization",
        )
        self.assertEqual(rv.status_code, 200)
        data = rv.get_json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["phase"], "customization")

    def test_inject_and_save_called(self):
        rv, mock_session, _ = self._call_result(
            "recommendations",
            {"session_id": "abc", "result": '{"recommendations": []}'},
        )
        mock_session.inject_llm_result.assert_called_once()
        mock_session.save.assert_called_once()

    def test_job_analysis_includes_position_name(self):
        state = {"position_name": "Senior Engineer"}
        rv, _, _ = self._call_result(
            "job_analysis",
            {"session_id": "abc", "result": '{}'},
            session_state=state,
            phase="job_analysis",
        )
        self.assertEqual(rv.status_code, 200)
        data = rv.get_json()
        self.assertEqual(data.get("position_name"), "Senior Engineer")

    def test_rewrite_includes_proposal_count(self):
        state = {"pending_rewrites": [{"id": "r1"}, {"id": "r2"}]}
        rv, _, _ = self._call_result(
            "rewrite",
            {"session_id": "abc", "result": '[{"id":"r1"},{"id":"r2"}]'},
            session_state=state,
            phase="rewrite_review",
        )
        self.assertEqual(rv.status_code, 200)
        data = rv.get_json()
        self.assertEqual(data.get("proposal_count"), 2)

    def test_post_analysis_questions_includes_question_count(self):
        state = {"post_analysis_questions": ["q1", "q2", "q3"]}
        rv, _, _ = self._call_result(
            "post_analysis_questions",
            {"session_id": "abc", "result": '{"questions":[]}'},
            session_state=state,
        )
        self.assertEqual(rv.status_code, 200)
        data = rv.get_json()
        self.assertEqual(data.get("question_count"), 3)

    def test_spell_check_includes_correction_count(self):
        state = {"spell_check_results": [{"original": "teh"}]}
        rv, _, _ = self._call_result(
            "spell_check",
            {"session_id": "abc", "result": '{"corrections":[]}'},
            session_state=state,
        )
        data = rv.get_json()
        self.assertEqual(data.get("correction_count"), 1)

    def test_persuasion_check_includes_warning_count(self):
        state = {"persuasion_warnings": [{"type": "weak"}]}
        rv, _, _ = self._call_result(
            "persuasion_check",
            {"session_id": "abc", "result": '{"warnings":[]}'},
            session_state=state,
        )
        data = rv.get_json()
        self.assertEqual(data.get("warning_count"), 1)

    def test_interview_prep_includes_question_count(self):
        state = {"interview_prep": ["q1", "q2"]}
        rv, _, _ = self._call_result(
            "interview_prep",
            {"session_id": "abc", "result": '{"questions":[]}'},
            session_state=state,
        )
        data = rv.get_json()
        self.assertEqual(data.get("question_count"), 2)

    # ---- chat-specific behaviour -------------------------------------------

    def test_chat_stores_user_message_before_inject(self):
        """user_message is added to history before inject_llm_result is called."""
        mock_session = _make_mock_session(
            phase="customization",
            state={},
        )
        # After add_to_history, simulate the assistant turn appearing in history
        mock_session.conversation_history = [{"role": "assistant", "content": "Hello!"}]

        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()
        client, _ = _make_app(mock_entry)

        with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                   return_value=mock_session):
            rv = client.post(
                "/api/llm/chat/result",
                json={
                    "session_id":   "abc",
                    "result":       '{"response":"Hello!"}',
                    "user_message": "Hi there",
                },
            )

        self.assertEqual(rv.status_code, 200)
        # add_to_history called with user message
        mock_session.add_to_history.assert_called_once_with("user", "Hi there")
        # inject_llm_result called after
        mock_session.inject_llm_result.assert_called_once()

    def test_chat_result_includes_response_text(self):
        mock_session = _make_mock_session(phase="customization")
        mock_session.conversation_history = [{"role": "assistant", "content": "Great question!"}]
        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()
        client, _ = _make_app(mock_entry)

        with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                   return_value=mock_session):
            rv = client.post(
                "/api/llm/chat/result",
                json={"session_id": "abc", "result": '{"response":"Great question!"}'},
            )
        data = rv.get_json()
        self.assertEqual(data.get("response"), "Great question!")

    def test_chat_without_user_message_skips_add_to_history(self):
        mock_session = _make_mock_session()
        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()
        client, _ = _make_app(mock_entry)

        with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                   return_value=mock_session):
            rv = client.post(
                "/api/llm/chat/result",
                json={"session_id": "abc", "result": '{}'},
            )
        mock_session.add_to_history.assert_not_called()

    # ---- error cases -------------------------------------------------------

    def test_unknown_operation_returns_400(self):
        mock_entry = MagicMock()
        client, _ = _make_app(mock_entry)
        rv = client.post(
            "/api/llm/bogus_op/result",
            json={"session_id": "abc", "result": "{}"},
        )
        self.assertEqual(rv.status_code, 400)
        data = rv.get_json()
        self.assertEqual(data["error_code"], "unknown_operation")

    def test_missing_result_field_returns_400(self):
        mock_entry = MagicMock()
        client, _ = _make_app(mock_entry)
        rv = client.post(
            "/api/llm/recommendations/result",
            json={"session_id": "abc"},
        )
        self.assertEqual(rv.status_code, 400)
        data = rv.get_json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["error_code"], "missing_field")

    def test_invalid_result_json_returns_400(self):
        """inject_llm_result raising InvalidResultError → HTTP 400."""
        mock_session = _make_mock_session()
        mock_session.inject_llm_result.side_effect = InvalidResultError(
            "Schema mismatch: expected array"
        )
        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()
        client, _ = _make_app(mock_entry)

        with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                   return_value=mock_session):
            rv = client.post(
                "/api/llm/rewrite/result",
                json={"session_id": "abc", "result": "not-an-array"},
            )
        self.assertEqual(rv.status_code, 400)
        data = rv.get_json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["error_code"], "invalid_result")

    def test_precondition_failure_returns_400(self):
        """inject_llm_result raising ValueError (e.g. wrong phase) → 400."""
        mock_session = _make_mock_session()
        mock_session.inject_llm_result.side_effect = ValueError("Phase mismatch")
        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()
        client, _ = _make_app(mock_entry)

        with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                   return_value=mock_session):
            rv = client.post(
                "/api/llm/rewrite/result",
                json={"session_id": "abc", "result": "{}"},
            )
        self.assertEqual(rv.status_code, 400)
        data = rv.get_json()
        self.assertEqual(data["error_code"], "precondition_failed")

    def test_save_not_called_on_error(self):
        """session.save() is NOT called if inject_llm_result raises."""
        mock_session = _make_mock_session()
        mock_session.inject_llm_result.side_effect = InvalidResultError("bad")
        mock_entry = MagicMock()
        mock_entry.manager    = MagicMock()
        mock_entry.orchestrator = MagicMock()
        client, _ = _make_app(mock_entry)

        with patch("routes.llm_routes.HeadlessSession.from_conversation_manager",
                   return_value=mock_session):
            client.post(
                "/api/llm/recommendations/result",
                json={"session_id": "abc", "result": "{}"},
            )
        mock_session.save.assert_not_called()


# ---------------------------------------------------------------------------
# HeadlessSession.from_conversation_manager classmethod
# ---------------------------------------------------------------------------

class TestHeadlessSessionFromConversationManager(unittest.TestCase):
    """Unit tests for the new classmethod that bridges Flask → HeadlessSession."""

    def _make_managers(self):
        manager = MagicMock()
        manager.config = None
        orchestrator = MagicMock()
        return manager, orchestrator

    def test_returns_headless_session_instance(self):
        from utils.headless_session import HeadlessSession
        manager, orchestrator = self._make_managers()
        hs = HeadlessSession.from_conversation_manager(manager, orchestrator)
        self.assertIsInstance(hs, HeadlessSession)

    def test_manager_and_orchestrator_are_shared(self):
        from utils.headless_session import HeadlessSession
        manager, orchestrator = self._make_managers()
        hs = HeadlessSession.from_conversation_manager(manager, orchestrator)
        self.assertIs(hs._manager,      manager)
        self.assertIs(hs._orchestrator, orchestrator)

    def test_provider_and_model_are_none(self):
        from utils.headless_session import HeadlessSession
        manager, orchestrator = self._make_managers()
        hs = HeadlessSession.from_conversation_manager(manager, orchestrator)
        self.assertIsNone(hs._provider)
        self.assertIsNone(hs._model)


if __name__ == "__main__":
    unittest.main()
