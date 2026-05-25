#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""MCP server for cv-builder.

Exposes the full cv-builder workflow as MCP tools so an LLM agent can create
and manage customised CVs without a running web server.

Workflow modes
--------------
**Agent-as-LLM (passthrough)** — the calling agent fulfills every LLM step:

    1. ``session_new`` → get *session_id*
    2. ``job_submit_text`` (or ``job_submit_file``)
    3. ``analysis_prepare`` → returns PromptBundle JSON for the agent to fulfill
    4. Agent calls the LLM itself; ``analysis_submit`` with the result
    5. ``recommendations_prepare`` / ``recommendations_submit``
    6. ``decisions_submit`` with user include/exclude decisions
    7. ``rewrites_prepare`` / ``rewrites_submit`` / ``rewrites_approve``
    8. ``generate_cv`` → returns output file paths

**Internal-LLM** — if the server is started with ``--provider``:

    Use ``run_*`` shortcut tools that drive the LLM internally.

Running the server
------------------
Via MCP configuration::

    conda run -n cvgen python scripts/mcp_server.py

Or after ``pip install -e .``::

    conda run -n cvgen cv-mcp
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure the scripts/ directory is importable
sys.path.insert(0, str(Path(__file__).parent))

from mcp.server.fastmcp import FastMCP

from utils.agent_bridge import (
    InvalidResultError,
    OperationType,
    PromptBundle,
    validate_agent_json,
)
from utils.config import get_config
from utils.headless_session import HeadlessSession

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=os.environ.get("CV_MCP_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("cv_mcp")

# ---------------------------------------------------------------------------
# FastMCP application
# ---------------------------------------------------------------------------

mcp = FastMCP("cv-builder")

# In-process session cache (session_id → HeadlessSession)
_sessions: Dict[str, HeadlessSession] = {}

# Optional provider/model overrides set via CLI args on server startup
_DEFAULT_PROVIDER: Optional[str] = None
_DEFAULT_MODEL:    Optional[str] = None


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------

def _locate_session_file(session_id: str) -> Optional[Path]:
    """Search the output directory for session.json matching *session_id*."""
    config  = get_config()
    base    = Path(config.output_dir).expanduser()
    if not base.exists():
        return None
    for sf in base.rglob("session.json"):
        try:
            with open(sf, encoding="utf-8") as f:
                data = json.load(f)
            if data.get("session_id") == session_id:
                return sf
        except Exception:
            continue
    return None


def _get_session(session_id: str) -> HeadlessSession:
    """Return cached or freshly-loaded HeadlessSession for *session_id*.

    Raises
    ------
    ValueError
        If the session cannot be found on disk.
    """
    if session_id not in _sessions:
        sf = _locate_session_file(session_id)
        if sf is None:
            raise ValueError(
                f"Session '{session_id}' not found.  "
                "Use session_new to create one or session_list to see available sessions."
            )
        _sessions[session_id] = HeadlessSession(
            session_file=str(sf),
            provider=_DEFAULT_PROVIDER,
            model=_DEFAULT_MODEL,
        )
    return _sessions[session_id]


def _bundle_to_dict(bundle: PromptBundle) -> Dict[str, Any]:
    return bundle.to_dict()


def _error(msg: str) -> Dict[str, Any]:
    return {"ok": False, "error": msg}


# ---------------------------------------------------------------------------
# Session management tools
# ---------------------------------------------------------------------------

@mcp.tool()
def session_new() -> Dict[str, Any]:
    """Create a new cv-builder session.

    Returns
    -------
    dict
        ``{"session_id": str, "phase": "init", "session_file": str|null}``
    """
    session = HeadlessSession(provider=_DEFAULT_PROVIDER, model=_DEFAULT_MODEL)
    sf = session.save()
    if session.session_id:
        _sessions[session.session_id] = session
    return {
        "ok":           True,
        "session_id":   session.session_id,
        "phase":        session.phase,
        "session_file": sf,
    }


@mcp.tool()
def session_list() -> List[Dict[str, Any]]:
    """List all saved cv-builder sessions.

    Returns
    -------
    list of dict
        Each item has ``session_id``, ``phase``, ``position_name``,
        ``session_file``, and ``last_modified`` (UNIX timestamp).
    """
    return HeadlessSession.list_sessions()


@mcp.tool()
def session_load(session_file: str) -> Dict[str, Any]:
    """Load a session from a specific file path.

    Parameters
    ----------
    session_file:
        Absolute path to a ``session.json`` file.

    Returns
    -------
    dict
        ``{"ok": bool, "session_id": str, "phase": str, "position_name": str|null}``
    """
    try:
        session = HeadlessSession(
            session_file=session_file,
            provider=_DEFAULT_PROVIDER,
            model=_DEFAULT_MODEL,
        )
        if session.session_id:
            _sessions[session.session_id] = session
        return {
            "ok":            True,
            "session_id":    session.session_id,
            "phase":         session.phase,
            "position_name": session.state.get("position_name"),
        }
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def session_status(session_id: str) -> Dict[str, Any]:
    """Get the current phase and key state flags for a session.

    Parameters
    ----------
    session_id:
        Session identifier returned by ``session_new``.

    Returns
    -------
    dict with fields:
        ``session_id``, ``phase``, ``position_name``,
        ``has_job_text``, ``has_job_analysis``, ``has_customizations``,
        ``has_pending_rewrites``, ``has_generated_files``.
    """
    try:
        session = _get_session(session_id)
        state   = session.state
        return {
            "ok":                   True,
            "session_id":           session_id,
            "phase":                session.phase,
            "position_name":        state.get("position_name"),
            "has_job_text":         bool(state.get("job_description")),
            "has_job_analysis":     bool(state.get("job_analysis")),
            "has_customizations":   bool(state.get("customizations")),
            "has_pending_rewrites": bool(state.get("pending_rewrites")),
            "has_generated_files":  bool(state.get("generated_files")),
        }
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def session_evict(session_id: str) -> Dict[str, Any]:
    """Remove a session from the in-process cache (does not delete disk files).

    Parameters
    ----------
    session_id:
        Session to evict from memory.
    """
    removed = _sessions.pop(session_id, None)
    return {"ok": True, "evicted": removed is not None}


@mcp.tool()
def session_save(session_id: str) -> Dict[str, Any]:
    """Explicitly save a session to disk.

    Parameters
    ----------
    session_id:
        Session to save.

    Returns
    -------
    dict
        ``{"ok": bool, "session_file": str}``
    """
    try:
        session = _get_session(session_id)
        sf = session.save()
        return {"ok": True, "session_file": sf}
    except Exception as exc:
        return _error(str(exc))


# ---------------------------------------------------------------------------
# Job intake tools
# ---------------------------------------------------------------------------

@mcp.tool()
def job_submit_text(session_id: str, job_text: str) -> Dict[str, Any]:
    """Submit a job description as plain text.

    Parameters
    ----------
    session_id:
        Session identifier.
    job_text:
        Full job description text.

    Returns
    -------
    dict
        ``{"ok": bool, "phase": str}``
    """
    try:
        session = _get_session(session_id)
        session.set_job_text(job_text)
        session.save()
        return {"ok": True, "phase": session.phase}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def job_submit_file(session_id: str, file_path: str) -> Dict[str, Any]:
    """Read a job description from a text file and submit it.

    Parameters
    ----------
    session_id:
        Session identifier.
    file_path:
        Absolute path to a ``.txt`` file containing the job description.

    Returns
    -------
    dict
        ``{"ok": bool, "phase": str, "char_count": int}``
    """
    try:
        path = Path(file_path).expanduser()
        job_text = path.read_text(encoding="utf-8")
        session = _get_session(session_id)
        session.set_job_text(job_text)
        session.save()
        return {"ok": True, "phase": session.phase, "char_count": len(job_text)}
    except Exception as exc:
        return _error(str(exc))


# ---------------------------------------------------------------------------
# Agent-as-LLM: *_prepare / *_submit pairs
# ---------------------------------------------------------------------------
#
# Each *_prepare tool returns a PromptBundle dict.  The calling agent should:
#   1. Read ``messages`` and call its LLM with the instructions from ``instructions``
#      and ``output_schema``.
#   2. Call the matching *_submit tool with the raw JSON string returned by the LLM.
#
# JSON compliance is validated in *_submit before any state is mutated.

@mcp.tool()
def analysis_prepare(session_id: str) -> Dict[str, Any]:
    """Prepare a PromptBundle for job analysis.

    The calling agent must:

    1. Pass ``messages`` to its LLM with ``instructions`` as guidance.
    2. Return the LLM's JSON response to ``analysis_submit``.

    Parameters
    ----------
    session_id:
        Session with a job description already submitted.

    Returns
    -------
    dict
        PromptBundle with ``operation``, ``messages``, ``output_schema``,
        ``instructions``, ``context_hint``.  Also includes ``"ok": true``.
    """
    try:
        session = _get_session(session_id)
        bundle  = session.prepare_llm_call(OperationType.JOB_ANALYSIS)
        return {"ok": True, **_bundle_to_dict(bundle)}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def analysis_submit(session_id: str, result: str) -> Dict[str, Any]:
    """Submit fulfilled job analysis JSON.  Validates compliance and advances phase.

    Parameters
    ----------
    session_id:
        Session identifier.
    result:
        Raw JSON string matching the ``output_schema`` from ``analysis_prepare``.

    Returns
    -------
    dict
        ``{"ok": bool, "phase": str, "position_name": str|null}``
    """
    try:
        session = _get_session(session_id)
        session.inject_llm_result(OperationType.JOB_ANALYSIS, result)
        session.save()
        return {
            "ok":            True,
            "phase":         session.phase,
            "position_name": session.state.get("position_name"),
        }
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def recommendations_prepare(
    session_id: str,
    user_preferences: Optional[str] = None,
) -> Dict[str, Any]:
    """Prepare a PromptBundle for CV customization recommendations.

    Parameters
    ----------
    session_id:
        Session with completed job analysis.
    user_preferences:
        Optional JSON string of user preferences to include in the prompt
        (e.g. ``{"tone": "technical", "emphasis": "leadership"}``).

    Returns
    -------
    dict
        PromptBundle.
    """
    try:
        session = _get_session(session_id)
        prefs: Any = None
        if user_preferences:
            try:
                prefs = validate_agent_json(user_preferences)
            except InvalidResultError:
                return _error("user_preferences is not valid JSON")
        bundle = session.prepare_llm_call(
            OperationType.RECOMMENDATIONS,
            user_preferences=prefs,
        )
        return {"ok": True, **_bundle_to_dict(bundle)}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def recommendations_submit(session_id: str, result: str) -> Dict[str, Any]:
    """Submit fulfilled recommendations JSON.  Validates and stores customizations.

    Parameters
    ----------
    session_id:
        Session identifier.
    result:
        Raw JSON matching ``recommendations_prepare``'s ``output_schema``.

    Returns
    -------
    dict
        ``{"ok": bool, "phase": str}``
    """
    try:
        session = _get_session(session_id)
        session.inject_llm_result(OperationType.RECOMMENDATIONS, result)
        session.save()
        return {"ok": True, "phase": session.phase}
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def summary_prepare(
    session_id: str,
    refinement_prompt: Optional[str] = None,
    previous_summary: Optional[str] = None,
) -> Dict[str, Any]:
    """Prepare a PromptBundle for professional summary generation.

    Parameters
    ----------
    session_id:
        Session with completed job analysis.
    refinement_prompt:
        Optional user instruction for refining an existing summary.
    previous_summary:
        Existing summary text to refine (used with *refinement_prompt*).

    Returns
    -------
    dict
        PromptBundle.
    """
    try:
        session = _get_session(session_id)
        bundle  = session.prepare_llm_call(
            OperationType.SUMMARY,
            refinement_prompt=refinement_prompt,
            previous_summary=previous_summary,
        )
        return {"ok": True, **_bundle_to_dict(bundle)}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def summary_submit(session_id: str, result: str) -> Dict[str, Any]:
    """Submit a generated professional summary.

    Parameters
    ----------
    session_id:
        Session identifier.
    result:
        JSON string: ``{"summary": "..."}``.

    Returns
    -------
    dict
        ``{"ok": bool}``
    """
    try:
        session = _get_session(session_id)
        session.inject_llm_result(OperationType.SUMMARY, result)
        session.save()
        return {"ok": True}
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def questions_prepare(session_id: str) -> Dict[str, Any]:
    """Prepare a PromptBundle for post-analysis clarifying questions.

    Parameters
    ----------
    session_id:
        Session with completed job analysis.

    Returns
    -------
    dict
        PromptBundle.
    """
    try:
        session = _get_session(session_id)
        bundle  = session.prepare_llm_call(OperationType.POST_ANALYSIS_QUESTIONS)
        return {"ok": True, **_bundle_to_dict(bundle)}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def questions_submit(session_id: str, result: str) -> Dict[str, Any]:
    """Submit post-analysis questions from the agent.

    Parameters
    ----------
    session_id:
        Session identifier.
    result:
        JSON string: ``{"intro": "...", "questions": [...]}``.

    Returns
    -------
    dict
        ``{"ok": bool, "question_count": int}``
    """
    try:
        session = _get_session(session_id)
        session.inject_llm_result(OperationType.POST_ANALYSIS_QUESTIONS, result)
        session.save()
        q_count = len(session.state.get("post_analysis_questions") or [])
        return {"ok": True, "question_count": q_count}
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def rewrites_prepare(session_id: str) -> Dict[str, Any]:
    """Prepare a PromptBundle for CV text rewrite proposals.

    Parameters
    ----------
    session_id:
        Session with completed recommendations.

    Returns
    -------
    dict
        PromptBundle.
    """
    try:
        session = _get_session(session_id)
        bundle  = session.prepare_llm_call(OperationType.REWRITE)
        return {"ok": True, **_bundle_to_dict(bundle)}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def rewrites_submit(session_id: str, result: str) -> Dict[str, Any]:
    """Submit rewrite proposals from the agent.

    Parameters
    ----------
    session_id:
        Session identifier.
    result:
        JSON array of rewrite proposal objects.

    Returns
    -------
    dict
        ``{"ok": bool, "proposal_count": int, "phase": str}``
    """
    try:
        session = _get_session(session_id)
        session.inject_llm_result(OperationType.REWRITE, result)
        session.save()
        proposals = session.state.get("pending_rewrites") or []
        return {
            "ok":             True,
            "proposal_count": len(proposals),
            "phase":          session.phase,
        }
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def rewrites_approve(session_id: str, approved_ids: str) -> Dict[str, Any]:
    """Approve a subset of pending rewrite proposals.

    Parameters
    ----------
    session_id:
        Session identifier.
    approved_ids:
        JSON array of rewrite ``id`` strings to approve.  Rewrites not
        listed are rejected.

    Returns
    -------
    dict
        ``{"ok": bool, "approved": int, "rejected": int}``
    """
    try:
        ids = validate_agent_json(approved_ids)
        if not isinstance(ids, list):
            return _error("approved_ids must be a JSON array of id strings")
        session = _get_session(session_id)
        counts  = session.approve_rewrites(ids)
        session.save()
        return {"ok": True, **counts}
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def spell_check_prepare(session_id: str, text: Optional[str] = None) -> Dict[str, Any]:
    """Prepare a PromptBundle for spell-checking CV text.

    Parameters
    ----------
    session_id:
        Session identifier.
    text:
        Optional plain text to check.  Defaults to the session customizations.

    Returns
    -------
    dict
        PromptBundle.
    """
    try:
        session = _get_session(session_id)
        bundle  = session.prepare_llm_call(OperationType.SPELL_CHECK, text=text)
        return {"ok": True, **_bundle_to_dict(bundle)}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def spell_check_submit(session_id: str, result: str) -> Dict[str, Any]:
    """Submit spell-check corrections.

    Parameters
    ----------
    session_id:
        Session identifier.
    result:
        JSON string: ``{"corrections": [...]}``.

    Returns
    -------
    dict
        ``{"ok": bool, "correction_count": int}``
    """
    try:
        session = _get_session(session_id)
        session.inject_llm_result(OperationType.SPELL_CHECK, result)
        session.save()
        corrections = session.state.get("spell_check_results") or []
        return {"ok": True, "correction_count": len(corrections)}
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def persuasion_check_prepare(
    session_id: str,
    text: Optional[str] = None,
) -> Dict[str, Any]:
    """Prepare a PromptBundle for persuasion quality analysis.

    Parameters
    ----------
    session_id:
        Session identifier.
    text:
        Optional plain text to evaluate.  Defaults to session customizations.

    Returns
    -------
    dict
        PromptBundle.
    """
    try:
        session = _get_session(session_id)
        bundle  = session.prepare_llm_call(OperationType.PERSUASION_CHECK, text=text)
        return {"ok": True, **_bundle_to_dict(bundle)}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def persuasion_check_submit(session_id: str, result: str) -> Dict[str, Any]:
    """Submit persuasion-quality warnings.

    Parameters
    ----------
    session_id:
        Session identifier.
    result:
        JSON string: ``{"warnings": [...]}``.

    Returns
    -------
    dict
        ``{"ok": bool, "warning_count": int}``
    """
    try:
        session = _get_session(session_id)
        session.inject_llm_result(OperationType.PERSUASION_CHECK, result)
        session.save()
        warnings = session.state.get("persuasion_warnings") or []
        return {"ok": True, "warning_count": len(warnings)}
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def interview_prep_prepare(session_id: str) -> Dict[str, Any]:
    """Prepare a PromptBundle for interview preparation questions.

    Parameters
    ----------
    session_id:
        Session with completed job analysis.

    Returns
    -------
    dict
        PromptBundle.
    """
    try:
        session = _get_session(session_id)
        bundle  = session.prepare_llm_call(OperationType.INTERVIEW_PREP)
        return {"ok": True, **_bundle_to_dict(bundle)}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def interview_prep_submit(session_id: str, result: str) -> Dict[str, Any]:
    """Submit interview preparation questions.

    Parameters
    ----------
    session_id:
        Session identifier.
    result:
        JSON string: ``{"questions": [...]}``.

    Returns
    -------
    dict
        ``{"ok": bool, "question_count": int}``
    """
    try:
        session = _get_session(session_id)
        session.inject_llm_result(OperationType.INTERVIEW_PREP, result)
        session.save()
        questions = session.state.get("interview_prep") or []
        return {"ok": True, "question_count": len(questions)}
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def cover_letter_prepare(
    session_id: str,
    tone: str = "professional",
    hiring_manager: str = "Hiring Manager",
) -> Dict[str, Any]:
    """Prepare a PromptBundle for cover letter generation.

    Parameters
    ----------
    session_id:
        Session with completed job analysis.
    tone:
        Tone style — e.g. ``"professional"``, ``"enthusiastic"``.
    hiring_manager:
        Name or title to address the letter to.

    Returns
    -------
    dict
        PromptBundle.
    """
    try:
        session = _get_session(session_id)
        bundle  = session.prepare_llm_call(
            OperationType.COVER_LETTER,
            tone=tone,
            hiring_manager=hiring_manager,
        )
        return {"ok": True, **_bundle_to_dict(bundle)}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def cover_letter_submit(session_id: str, result: str) -> Dict[str, Any]:
    """Submit a generated cover letter.

    Parameters
    ----------
    session_id:
        Session identifier.
    result:
        JSON string: ``{"cover_letter": "..."}``.

    Returns
    -------
    dict
        ``{"ok": bool}``
    """
    try:
        session = _get_session(session_id)
        session.inject_llm_result(OperationType.COVER_LETTER, result)
        session.save()
        return {"ok": True}
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def chat_prepare(session_id: str, message: str) -> Dict[str, Any]:
    """Prepare a PromptBundle for a free-form chat turn.

    Parameters
    ----------
    session_id:
        Session identifier.
    message:
        User message text.

    Returns
    -------
    dict
        PromptBundle.
    """
    try:
        session = _get_session(session_id)
        bundle  = session.prepare_llm_call(OperationType.CHAT, message=message)
        return {"ok": True, **_bundle_to_dict(bundle)}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def chat_submit(session_id: str, user_message: str, result: str) -> Dict[str, Any]:
    """Store a chat exchange (user message + agent response).

    Parameters
    ----------
    session_id:
        Session identifier.
    user_message:
        The user's message (appended to conversation history).
    result:
        JSON string: ``{"response": "..."}``.

    Returns
    -------
    dict
        ``{"ok": bool, "response": str}``
    """
    try:
        session = _get_session(session_id)
        session.state  # ensure session loaded

        # Store user message
        session.conversation_history.append(
            {"role": "user", "content": user_message}
        )

        # Validate and store assistant response
        session.inject_llm_result(OperationType.CHAT, result)
        session.save()

        last = session.conversation_history[-1]
        return {"ok": True, "response": last.get("content", "")}
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    except Exception as exc:
        return _error(str(exc))


# ---------------------------------------------------------------------------
# Direct LLM shortcut tools (require --provider at server startup)
# ---------------------------------------------------------------------------

@mcp.tool()
def run_analysis(session_id: str) -> Dict[str, Any]:
    """Run job analysis using the server's configured LLM provider.

    Requires the server to have been started with ``--provider``.

    Parameters
    ----------
    session_id:
        Session with submitted job text.

    Returns
    -------
    dict
        ``{"ok": bool, "phase": str, "position_name": str|null, "job_analysis": dict}``
    """
    try:
        session  = _get_session(session_id)
        analysis = session.run_with_llm(OperationType.JOB_ANALYSIS)
        session.save()
        return {
            "ok":            True,
            "phase":         session.phase,
            "position_name": session.state.get("position_name"),
            "job_analysis":  analysis,
        }
    except RuntimeError as exc:
        return _error(str(exc))
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def run_recommendations(
    session_id: str,
    user_preferences: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate CV recommendations using the server's configured LLM provider.

    Requires the server to have been started with ``--provider``.

    Parameters
    ----------
    session_id:
        Session with completed job analysis.
    user_preferences:
        Optional JSON string of user preferences.

    Returns
    -------
    dict
        ``{"ok": bool, "phase": str, "customizations": dict}``
    """
    try:
        prefs: Any = None
        if user_preferences:
            try:
                prefs = validate_agent_json(user_preferences)
            except InvalidResultError:
                return _error("user_preferences is not valid JSON")
        session = _get_session(session_id)
        recs    = session.run_with_llm(OperationType.RECOMMENDATIONS, user_preferences=prefs)
        session.save()
        return {"ok": True, "phase": session.phase, "customizations": recs}
    except RuntimeError as exc:
        return _error(str(exc))
    except Exception as exc:
        return _error(str(exc))


# ---------------------------------------------------------------------------
# User decisions
# ---------------------------------------------------------------------------

@mcp.tool()
def decisions_submit(
    session_id: str,
    experience_decisions: Optional[str] = None,
    skill_decisions: Optional[str] = None,
    achievement_decisions: Optional[str] = None,
    publication_decisions: Optional[str] = None,
    extra_skills: Optional[str] = None,
    summary_focus_override: Optional[str] = None,
) -> Dict[str, Any]:
    """Submit user include/exclude decisions for CV content.

    All parameters are optional JSON strings — pass only what has changed.

    Parameters
    ----------
    session_id:
        Session identifier.
    experience_decisions:
        JSON object mapping experience id → decision dict.
    skill_decisions:
        JSON object mapping skill name → decision dict.
    achievement_decisions:
        JSON object mapping achievement id → decision dict.
    publication_decisions:
        JSON object mapping cite_key → decision dict.
    extra_skills:
        JSON array of extra skill strings to add.
    summary_focus_override:
        Key of the desired professional summary variant, or ``null``.

    Returns
    -------
    dict
        ``{"ok": bool}``
    """
    try:
        session = _get_session(session_id)

        def _parse_opt(raw: Optional[str]) -> Optional[Any]:
            if raw is None:
                return None
            return validate_agent_json(raw)

        try:
            exp_d   = _parse_opt(experience_decisions)
            skill_d = _parse_opt(skill_decisions)
            ach_d   = _parse_opt(achievement_decisions)
            pub_d   = _parse_opt(publication_decisions)
            ex_sk   = _parse_opt(extra_skills)
        except InvalidResultError as exc:
            return _error(f"Invalid JSON in decisions: {exc}")

        session.apply_decisions(
            experience_decisions=exp_d,
            skill_decisions=skill_d,
            achievement_decisions=ach_d,
            publication_decisions=pub_d,
            extra_skills=ex_sk,
            summary_focus_override=summary_focus_override,
        )
        session.save()
        return {"ok": True}
    except Exception as exc:
        return _error(str(exc))


# ---------------------------------------------------------------------------
# CV generation
# ---------------------------------------------------------------------------

@mcp.tool()
def generate_cv(
    session_id: str,
    html_preview_only: bool = False,
) -> Dict[str, Any]:
    """Generate CV documents from the current session state.

    Parameters
    ----------
    session_id:
        Session identifier (should have completed analysis + customizations).
    html_preview_only:
        When ``True``, generate only the HTML preview (no PDF/DOCX).

    Returns
    -------
    dict
        ``{"ok": bool, "generated_files": dict}`` — output paths.
    """
    try:
        session = _get_session(session_id)
        result  = session.generate_cv(html_preview_only=html_preview_only)
        session.save()
        return {"ok": True, "generated_files": result}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def get_generated_files(session_id: str) -> Dict[str, Any]:
    """Return paths of previously generated CV files for a session.

    Parameters
    ----------
    session_id:
        Session identifier.

    Returns
    -------
    dict
        ``{"ok": bool, "generated_files": dict|null}``
    """
    try:
        session = _get_session(session_id)
        return {"ok": True, "generated_files": session.state.get("generated_files")}
    except Exception as exc:
        return _error(str(exc))


# ---------------------------------------------------------------------------
# Master data access
# ---------------------------------------------------------------------------

@mcp.tool()
def master_data_read(section: Optional[str] = None) -> Dict[str, Any]:
    """Read master CV data.

    Parameters
    ----------
    section:
        Optional top-level section to return (e.g. ``"contact"``,
        ``"experience"``, ``"skills"``).  When ``None``, returns the full dict.

    Returns
    -------
    dict
        ``{"ok": bool, "data": dict|any}``
    """
    try:
        # Master data is session-independent — read directly from disk
        config = get_config()
        import json as _json
        path = Path(config.master_cv_path).expanduser()
        with open(path, encoding="utf-8") as f:
            master = _json.load(f)
        data = master.get(section, master) if section else master
        return {"ok": True, "data": data}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def master_data_update_section(
    session_id: str,
    section: str,
    data: str,
) -> Dict[str, Any]:
    """Update a top-level section of the master CV data.

    **Phase guard**: Only permitted during ``init`` or ``refinement`` phase.

    Parameters
    ----------
    session_id:
        Session identifier.
    section:
        Top-level key in ``Master_CV_Data.json``.
    data:
        JSON string for the new section value.

    Returns
    -------
    dict
        ``{"ok": bool}``
    """
    try:
        parsed = validate_agent_json(data)
    except InvalidResultError as exc:
        return _error(f"Invalid JSON: {exc}")
    try:
        session = _get_session(session_id)
        session.update_master_section(section, parsed)
        return {"ok": True}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def publications_read() -> Dict[str, Any]:
    """Read the publications BibTeX file.

    Returns
    -------
    dict
        ``{"ok": bool, "bibtex": str}``
    """
    try:
        # Session-independent — read from config path
        config = get_config()
        path   = Path(config.publications_path).expanduser()
        bibtex = path.read_text(encoding="utf-8") if path.exists() else ""
        return {"ok": True, "bibtex": bibtex}
    except Exception as exc:
        return _error(str(exc))


# ---------------------------------------------------------------------------
# State inspection helpers
# ---------------------------------------------------------------------------

@mcp.tool()
def get_job_analysis(session_id: str) -> Dict[str, Any]:
    """Return the stored job analysis for a session.

    Parameters
    ----------
    session_id:
        Session identifier.

    Returns
    -------
    dict
        ``{"ok": bool, "job_analysis": dict|null}``
    """
    try:
        session = _get_session(session_id)
        return {"ok": True, "job_analysis": session.state.get("job_analysis")}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def get_customizations(session_id: str) -> Dict[str, Any]:
    """Return the stored customization recommendations for a session.

    Parameters
    ----------
    session_id:
        Session identifier.

    Returns
    -------
    dict
        ``{"ok": bool, "customizations": dict|null}``
    """
    try:
        session = _get_session(session_id)
        return {"ok": True, "customizations": session.state.get("customizations")}
    except Exception as exc:
        return _error(str(exc))


@mcp.tool()
def get_pending_rewrites(session_id: str) -> Dict[str, Any]:
    """Return pending rewrite proposals for a session.

    Parameters
    ----------
    session_id:
        Session identifier.

    Returns
    -------
    dict
        ``{"ok": bool, "pending_rewrites": list|null}``
    """
    try:
        session = _get_session(session_id)
        return {
            "ok":              True,
            "pending_rewrites": session.state.get("pending_rewrites"),
        }
    except Exception as exc:
        return _error(str(exc))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """Start the MCP server (stdio transport)."""
    import argparse

    parser = argparse.ArgumentParser(
        description="cv-builder MCP server",
        prog="cv-mcp",
    )
    parser.add_argument(
        "--provider",
        default=None,
        help="LLM provider to use for run_* shortcut tools (default: passthrough mode)",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="LLM model name for the configured provider",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Log level (default: INFO)",
    )
    args = parser.parse_args()

    logging.getLogger().setLevel(args.log_level)

    global _DEFAULT_PROVIDER, _DEFAULT_MODEL
    _DEFAULT_PROVIDER = args.provider
    _DEFAULT_MODEL    = args.model

    if _DEFAULT_PROVIDER:
        logger.info("cv-mcp starting with provider=%s model=%s", _DEFAULT_PROVIDER, _DEFAULT_MODEL)
    else:
        logger.info("cv-mcp starting in passthrough (agent-as-LLM) mode")

    mcp.run()


if __name__ == "__main__":
    main()
