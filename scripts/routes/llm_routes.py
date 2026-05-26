# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
LLM passthrough routes — fetch the prompt for an operation, then submit the
LLM response.

Exposes two HTTP endpoints for every ``OperationType``:

    POST /api/llm/<operation>/prompt
        Returns the PromptBundle (messages, output_schema, instructions, …)
        so the caller can drive its own LLM call.

    POST /api/llm/<operation>/result
        Accepts the LLM-produced JSON, validates it, stores it in the session,
        and returns operation-specific metadata.

These are the HTTP equivalents of the MCP ``*_prepare`` / ``*_submit`` tool
pairs in ``mcp_server.py``.  Both endpoints resolve the session from the JSON
body (``session_id`` field) and delegate to the same session methods so
no logic is duplicated.

Valid ``<operation>`` values (see ``utils.agent_bridge.OperationType``):

    job_analysis, recommendations, summary, rewrite, spell_check,
    persuasion_check, chat, interview_prep, cover_letter,
    post_analysis_questions
"""

import logging
from typing import Any, Dict

from flask import Blueprint, jsonify, request

from utils.agent_bridge import InvalidResultError, OperationType
from utils.headless_session import HeadlessSession

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Operation-specific response extras for the /result endpoint
#
# Each entry is a callable ``(session) -> dict`` that produces the additional
# fields merged into ``{"ok": True, "phase": session.phase, ...}``.
# ---------------------------------------------------------------------------
_SUBMIT_EXTRA: Dict[str, Any] = {
    OperationType.JOB_ANALYSIS:            lambda s: {"position_name": s.state.get("position_name")},
    OperationType.RECOMMENDATIONS:         lambda s: {},
    OperationType.SUMMARY:                 lambda s: {},
    OperationType.REWRITE:                 lambda s: {"proposal_count": len(s.state.get("pending_rewrites") or [])},
    OperationType.POST_ANALYSIS_QUESTIONS: lambda s: {"question_count": len(s.state.get("post_analysis_questions") or [])},
    OperationType.CHAT:                    lambda s: {"response": (s.conversation_history[-1:] or [{}])[0].get("content", "")},
    OperationType.INTERVIEW_PREP:          lambda s: {"question_count": len(s.state.get("interview_prep") or [])},
    OperationType.COVER_LETTER:            lambda s: {},
    OperationType.SPELL_CHECK:             lambda s: {"correction_count": len(s.state.get("spell_check_results") or [])},
    OperationType.PERSUASION_CHECK:        lambda s: {"warning_count": len(s.state.get("persuasion_warnings") or [])},
}

_VALID_OPERATIONS = frozenset(op.value for op in OperationType)


def create_blueprint(deps):
    bp = Blueprint("llm", __name__)

    _get_session   = deps["get_session"]

    # ------------------------------------------------------------------
    # POST /api/llm/<operation>/prompt
    # ------------------------------------------------------------------

    @bp.post("/api/llm/<operation>/prompt")
    def llm_prompt(operation: str):
        """Return a PromptBundle for the requested operation.

        Body (JSON):
            session_id  (str, required)
            + any operation-specific kwargs forwarded to prepare_llm_call:
              • job_analysis        — no extra fields
              • recommendations     — user_preferences (dict|null)
              • summary             — refinement_prompt (str), previous_summary (str)
              • rewrite             — no extra fields
              • post_analysis_questions — no extra fields
              • chat                — message (str, required)
              • interview_prep      — no extra fields
              • cover_letter        — tone (str), hiring_manager (str)
              • spell_check         — text (str)
              • persuasion_check    — text (str)

        Response 200:
            {"ok": true, "operation": "...", "messages": [...],
             "output_schema": {...}, "instructions": "...", "context_hint": "..."}

        Response 400:
            {"ok": false, "error": "...", "error_code": "..."}
        """
        if operation not in _VALID_OPERATIONS:
            return jsonify({
                "ok":         False,
                "error":      f"Unknown operation {operation!r}. Valid: {sorted(_VALID_OPERATIONS)}",
                "error_code": "unknown_operation",
            }), 400

        body = request.get_json(silent=True) or {}
        # Strip session_id; pass everything else as kwargs to prepare_llm_call
        kwargs = {k: v for k, v in body.items() if k != "session_id"}

        try:
            op      = OperationType(operation)
            entry   = _get_session()
            session = HeadlessSession.from_conversation_manager(
                entry.manager, entry.orchestrator
            )

            bundle  = session.prepare_llm_call(op, **kwargs)
            return jsonify({"ok": True, **bundle.to_dict()})

        except TypeError as exc:
            # Unknown kwarg for the operation
            return jsonify({
                "ok":         False,
                "error":      str(exc),
                "error_code": "invalid_params",
            }), 400
        except ValueError as exc:
            return jsonify({
                "ok":         False,
                "error":      str(exc),
                "error_code": "precondition_failed",
            }), 400
        except Exception as exc:                     # noqa: BLE001
            logger.exception("llm_prompt %s failed", operation)
            return jsonify({
                "ok":         False,
                "error":      str(exc),
                "error_code": "internal_error",
            }), 500

    # ------------------------------------------------------------------
    # POST /api/llm/<operation>/result
    # ------------------------------------------------------------------

    @bp.post("/api/llm/<operation>/result")
    def llm_result(operation: str):
        """Submit a pre-computed LLM response for the requested operation.

        Body (JSON):
            session_id   (str, required)
            result       (str|dict, required)  — LLM JSON string or decoded dict
            user_message (str, chat only)      — user turn appended to history

        Response 200:
            {"ok": true, "phase": "...", ...operation-specific fields}

        Response 400:
            {"ok": false, "error": "...", "error_code": "invalid_result"|"unknown_operation"|...}
        """
        if operation not in _VALID_OPERATIONS:
            return jsonify({
                "ok":         False,
                "error":      f"Unknown operation {operation!r}. Valid: {sorted(_VALID_OPERATIONS)}",
                "error_code": "unknown_operation",
            }), 400

        body = request.get_json(silent=True) or {}

        if "result" not in body:
            return jsonify({
                "ok":         False,
                "error":      "Missing required field: result",
                "error_code": "missing_field",
            }), 400

        result = body["result"]

        try:
            op      = OperationType(operation)
            entry   = _get_session()
            session = HeadlessSession.from_conversation_manager(
                entry.manager, entry.orchestrator
            )

            # chat: store user message in history before injecting response
            if op is OperationType.CHAT:
                user_message = body.get("user_message", "")
                if user_message:
                    session.add_to_history("user", user_message)

            session.inject_llm_result(op, result)
            session.save()

            extra = _SUBMIT_EXTRA.get(op, lambda _: {})(session)
            return jsonify({"ok": True, "phase": session.phase, **extra})

        except InvalidResultError as exc:
            return jsonify({
                "ok":         False,
                "error":      f"Invalid result: {exc}",
                "error_code": "invalid_result",
            }), 400
        except ValueError as exc:
            return jsonify({
                "ok":         False,
                "error":      str(exc),
                "error_code": "precondition_failed",
            }), 400
        except Exception as exc:                     # noqa: BLE001
            logger.exception("llm_result %s failed", operation)
            return jsonify({
                "ok":         False,
                "error":      str(exc),
                "error_code": "internal_error",
            }), 500

    return bp
