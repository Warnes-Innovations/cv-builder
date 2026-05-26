# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Agent bridge — passthrough LLM client for agent-as-LLM workflows.

When an external LLM agent drives cv-builder via MCP or CLI, it fulfills the
LLM calls itself rather than delegating to a backend provider.  This module
implements the "passthrough" mechanism:

1.  :class:`PassthroughLLMClient` subclasses :class:`LLMClient` and overrides
    ``chat()`` to raise :class:`PromptBundleReady` instead of calling any API.
2.  All existing high-level LLM methods (``analyze_job_description``,
    ``recommend_customizations``, …) call ``self.chat()`` internally, so they
    transparently become passthrough-capable with zero changes to
    ``llm_client.py``.
3.  The caller (MCP tool or CLI command) obtains the :class:`PromptBundle`,
    serialises it as JSON, returns it to the agent, receives the agent's
    response, then calls ``HeadlessSession.inject_llm_result`` to validate
    and store the result.
    Use :meth:`PassthroughLLMClient.capture` to avoid bare exception handling::

        with client.capture() as cap:
            client.analyze_job_description(job_text, master_data)
        bundle = cap.bundle   # always set after the with-block

JSON compliance rule
--------------------
All agent-provided JSON **must** be validated before it enters session state.
Use :func:`validate_agent_json` at every MCP/CLI boundary.  Ill-formed JSON
from a probabilistic model causes silent state corruption deep in the workflow
— catching it at the boundary produces a recoverable, diagnosable error.
"""

from __future__ import annotations

import contextlib
import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Generator, List, Optional, Union

from .llm_client import LLMClient

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Operation types
# ---------------------------------------------------------------------------

class OperationType(str, Enum):
    """Identifies which LLM workflow step a :class:`PromptBundle` belongs to."""

    JOB_ANALYSIS            = "job_analysis"
    RECOMMENDATIONS         = "recommendations"
    SUMMARY                 = "summary"
    REWRITE                 = "rewrite"
    SPELL_CHECK             = "spell_check"
    PERSUASION_CHECK        = "persuasion_check"
    CHAT                    = "chat"
    INTERVIEW_PREP          = "interview_prep"
    COVER_LETTER            = "cover_letter"
    POST_ANALYSIS_QUESTIONS = "post_analysis_questions"


# ---------------------------------------------------------------------------
# JSON schemas for each operation's expected response
# ---------------------------------------------------------------------------

_SCHEMAS: Dict[OperationType, Dict[str, Any]] = {
    OperationType.JOB_ANALYSIS: {
        "type": "object",
        "properties": {
            "title":                     {"type": "string"},
            "company":                   {"type": "string"},
            "domain":                    {"type": "string"},
            "role_level":                {"type": "string"},
            "required_skills":           {"type": "array", "items": {"type": "string"}},
            "preferred_skills":          {"type": "array", "items": {"type": "string"}},
            "must_have_requirements":    {"type": "array", "items": {"type": "string"}},
            "nice_to_have_requirements": {"type": "array", "items": {"type": "string"}},
            "culture_indicators":        {"type": "array", "items": {"type": "string"}},
            "ats_keywords":              {"type": "array", "items": {"type": "string"}},
        },
    },
    OperationType.RECOMMENDATIONS: {
        "type": "object",
        "properties": {
            "experience_recommendations":  {"type": "array"},
            "skill_recommendations":       {"type": "array"},
            "achievement_recommendations": {"type": "array"},
            "summary_focus":               {"type": "string"},
            "applicant_tagline":           {"type": "string"},
            "reasoning":                   {"type": "string"},
        },
    },
    OperationType.SUMMARY: {
        "type": "object",
        "required": ["summary"],
        "properties": {
            "summary": {"type": "string"},
        },
    },
    OperationType.REWRITE: {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "id":                  {"type": "string"},
                "type":                {"type": "string"},
                "location":            {"type": "string"},
                "original":            {"type": "string"},
                "proposed":            {"type": "string"},
                "keywords_introduced": {"type": "array"},
                "rationale":           {"type": "string"},
            },
        },
    },
    OperationType.SPELL_CHECK: {
        "type": "object",
        "properties": {
            "corrections": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "original":  {"type": "string"},
                        "corrected": {"type": "string"},
                        "context":   {"type": "string"},
                    },
                },
            },
        },
    },
    OperationType.PERSUASION_CHECK: {
        "type": "object",
        "properties": {
            "warnings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type":       {"type": "string"},
                        "text":       {"type": "string"},
                        "suggestion": {"type": "string"},
                    },
                },
            },
        },
    },
    OperationType.CHAT: {
        "type": "object",
        "required": ["response"],
        "properties": {
            "response": {"type": "string"},
        },
    },
    OperationType.INTERVIEW_PREP: {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question":  {"type": "string"},
                        "rationale": {"type": "string"},
                        "hint":      {"type": "string"},
                    },
                },
            },
        },
    },
    OperationType.COVER_LETTER: {
        "type": "object",
        "required": ["cover_letter"],
        "properties": {
            "cover_letter": {"type": "string"},
        },
    },
    OperationType.POST_ANALYSIS_QUESTIONS: {
        "type": "object",
        "properties": {
            "intro":     {"type": "string"},
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type":     {"type": "string"},
                        "question": {"type": "string"},
                        "choices":  {"type": "array", "items": {"type": "string"}},
                    },
                },
            },
        },
    },
}

_INSTRUCTIONS: Dict[OperationType, str] = {
    OperationType.JOB_ANALYSIS: (
        "Analyze the job description provided in the messages and return a JSON object "
        "matching output_schema.  Extract title, company, domain, role_level, "
        "required_skills, preferred_skills, must_have_requirements, "
        "nice_to_have_requirements, culture_indicators, and ats_keywords.  "
        "Return ONLY raw JSON — no markdown fences, no prose."
    ),
    OperationType.RECOMMENDATIONS: (
        "Recommend CV customizations for the job and return a JSON object matching "
        "output_schema.  Provide experience_recommendations (with recommendation, "
        "confidence, and reasoning per item), skill_recommendations, "
        "achievement_recommendations, summary_focus, and applicant_tagline.  "
        "Return ONLY raw JSON."
    ),
    OperationType.SUMMARY: (
        "Generate a professional summary tailored to the job.  Return a JSON object "
        "with a single 'summary' key containing the 3-5 sentence plain-text summary.  "
        "No markdown, no labels, no preamble.  Return ONLY raw JSON."
    ),
    OperationType.REWRITE: (
        "Propose CV text rewrites that align terminology with job keywords.  "
        "Return a JSON array matching output_schema.  Each item must include id, type, "
        "location, original, proposed, keywords_introduced, and rationale.  "
        "Return ONLY raw JSON."
    ),
    OperationType.SPELL_CHECK: (
        "Review the CV text for spelling and grammar errors.  Return a JSON object "
        "with a 'corrections' array listing each issue.  Return ONLY raw JSON."
    ),
    OperationType.PERSUASION_CHECK: (
        "Check the CV text for weak language, filler phrases, and persuasion issues.  "
        "Return a JSON object with a 'warnings' array listing each finding.  "
        "Return ONLY raw JSON."
    ),
    OperationType.CHAT: (
        "Respond helpfully to the user message in the context of CV creation.  "
        "Return a JSON object with a 'response' key.  Return ONLY raw JSON."
    ),
    OperationType.INTERVIEW_PREP: (
        "Generate 10 interview preparation questions based on the job and candidate "
        "profile.  Return a JSON object with a 'questions' array.  Return ONLY raw JSON."
    ),
    OperationType.COVER_LETTER: (
        "Write a professional cover letter for this job application.  Return a JSON "
        "object with a 'cover_letter' key containing the full letter text.  "
        "Return ONLY raw JSON."
    ),
    OperationType.POST_ANALYSIS_QUESTIONS: (
        "Generate 3-4 targeted clarifying questions to help customize the CV for this "
        "specific job.  Return a JSON object with 'intro' (one sentence ≤120 chars) "
        "and 'questions' (array of {type, question, choices}).  Return ONLY raw JSON."
    ),
}


# ---------------------------------------------------------------------------
# PromptBundle
# ---------------------------------------------------------------------------

@dataclass
class PromptBundle:
    """All information an external LLM agent needs to fulfill one cv-builder step.

    Attributes
    ----------
    operation:      Which workflow step this bundle belongs to.
    messages:       Conversation messages in OpenAI role/content format.
    output_schema:  JSON Schema the agent's response MUST conform to.
    instructions:   Human-readable instructions for fulfilling this bundle.
    context_hint:   One-line description of what the agent should produce.
    """

    operation:     OperationType
    messages:      List[Dict[str, str]]
    output_schema: Dict[str, Any]        = field(default_factory=dict)
    instructions:  str                   = ""
    context_hint:  str                   = ""

    def to_dict(self) -> Dict[str, Any]:
        """Serialise to a plain dict suitable for JSON output."""
        return {
            "operation":     self.operation.value,
            "messages":      self.messages,
            "output_schema": self.output_schema,
            "instructions":  self.instructions,
            "context_hint":  self.context_hint,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PromptBundle":
        """Deserialise from a plain dict."""
        return cls(
            operation=OperationType(data["operation"]),
            messages=data["messages"],
            output_schema=data.get("output_schema", {}),
            instructions=data.get("instructions", ""),
            context_hint=data.get("context_hint", ""),
        )

    def to_json(self, indent: int = 2) -> str:
        """Serialise to JSON string."""
        return json.dumps(self.to_dict(), indent=indent)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class PromptBundleReady(Exception):
    """Raised by :class:`PassthroughLLMClient` when a prompt bundle is ready.

    The caller catches this, serialises ``bundle`` as JSON, sends it to the
    agent, receives the result, then calls ``HeadlessSession.inject_llm_result``.
    """

    def __init__(self, bundle: PromptBundle) -> None:
        super().__init__(f"PromptBundle ready for {bundle.operation.value}")
        self.bundle = bundle


class InvalidResultError(ValueError):
    """Raised when an agent-provided JSON result fails validation."""


# ---------------------------------------------------------------------------
# JSON validation helper
# ---------------------------------------------------------------------------

def validate_agent_json(
    raw: Union[str, dict, list],
    schema: Optional[Dict[str, Any]] = None,
) -> Any:
    """Parse and optionally schema-validate agent-provided JSON.

    **Always use this at CLI/MCP input boundaries.**  LLM output is
    probabilistic; even schema-prompted models produce ill-formed JSON.
    Catching it at the boundary produces a recoverable, diagnosable error
    instead of silent state corruption deep in the workflow.

    Parameters
    ----------
    raw:
        Raw string or already-decoded object from the agent.
    schema:
        Optional JSON Schema dict.  Requires ``jsonschema`` to be installed;
        silently skipped if not available.

    Returns
    -------
    The parsed/validated value (dict or list).

    Raises
    ------
    InvalidResultError
        If *raw* is not valid JSON, or if schema validation fails.
    """
    # Parse if string
    if isinstance(raw, str):
        raw = raw.strip()
        # Strip markdown code fences if present.
        # Handles ```json language hints and partial blocks (no closing fence).
        # Uses first-newline / last-fence extraction to avoid corrupting JSON
        # string values that happen to contain backtick sequences.
        if raw.startswith("```"):
            first_newline = raw.find("\n")
            if first_newline == -1:
                # Degenerate single-line fence — strip all backtick fences.
                raw = raw.replace("```", "").strip()
            else:
                content_start = first_newline + 1
                # Find last closing fence at start of a line.
                last_fence = raw.rfind("\n```")
                if last_fence != -1 and last_fence >= content_start:
                    content = raw[content_start:last_fence].strip()
                else:
                    # No closing fence — use everything after the opening line.
                    content = raw[content_start:].strip()
                if content.startswith("```"):
                    logger.warning(
                        "validate_agent_json: multiple code fence blocks detected "
                        "in agent output; parsed JSON may be incomplete"
                    )
                raw = content
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise InvalidResultError(
                f"Agent result is not valid JSON: {exc}"
            ) from exc
    else:
        parsed = raw

    # Optional schema validation
    if schema:
        try:
            import jsonschema
            jsonschema.validate(instance=parsed, schema=schema)
        except ImportError:
            logger.debug("jsonschema not installed; skipping schema validation")
        except jsonschema.ValidationError as exc:
            raise InvalidResultError(
                f"Agent result does not match expected schema: {exc.message}"
            ) from exc

    return parsed


# ---------------------------------------------------------------------------
# Bundle capture helper
# ---------------------------------------------------------------------------

@dataclass
class _BundleCapture:
    """Mutable container yielded by :meth:`PassthroughLLMClient.capture`."""
    bundle: Optional[PromptBundle] = None


# ---------------------------------------------------------------------------
# PassthroughLLMClient
# ---------------------------------------------------------------------------

class PassthroughLLMClient(LLMClient):
    """LLMClient that raises :class:`PromptBundleReady` instead of calling any API.

    All existing high-level methods on :class:`LLMClient`
    (``analyze_job_description``, ``recommend_customizations``, …) call
    ``self.chat()`` internally, so they transparently become
    passthrough-capable via this subclass.

    Preferred usage — :meth:`capture` context manager::

        client = PassthroughLLMClient()
        client.set_context(
            OperationType.JOB_ANALYSIS,
            context_hint="Analyze senior data scientist role",
        )
        with client.capture() as cap:
            client.analyze_job_description(job_text, master_data)
        bundle = cap.bundle   # always set; serialize and return to the calling agent

    Legacy exception-based usage (still supported)::

        try:
            client.analyze_job_description(job_text, master_data)
        except PromptBundleReady as exc:
            bundle = exc.bundle
    """

    model      = "passthrough"
    last_usage = None

    def __init__(self) -> None:
        self._current_operation: OperationType = OperationType.CHAT
        self._context_hint: str = ""
        self._pending_bundle: Optional[PromptBundle] = None

    def set_context(
        self,
        operation: OperationType,
        context_hint: str = "",
    ) -> None:
        """Set the operation type and context hint before triggering a call."""
        self._current_operation = operation
        self._context_hint = context_hint

    @contextlib.contextmanager
    def capture(self) -> Generator["_BundleCapture", None, None]:
        """Context manager that captures the :class:`PromptBundle` without propagating the exception.

        Yields a :class:`_BundleCapture` whose ``bundle`` attribute is set to
        the captured :class:`PromptBundle` after the managed block exits.

        Raises
        ------
        RuntimeError
            If the managed block exits without producing a bundle (i.e. the
            triggered method did not call ``chat()``).

        Example::

            with client.capture() as cap:
                client.analyze_job_description(job_text, master_data)
            bundle = cap.bundle
        """
        cap = _BundleCapture()
        try:
            yield cap
        except PromptBundleReady as exc:
            cap.bundle = exc.bundle
        if cap.bundle is None:
            raise RuntimeError(
                "capture() exited without a PromptBundle — "
                "the triggered method did not call chat()"
            )

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
    ) -> str:
        """Raise :class:`PromptBundleReady` — never calls any LLM API."""
        bundle = PromptBundle(
            operation=self._current_operation,
            messages=messages,
            output_schema=_SCHEMAS.get(self._current_operation, {}),
            instructions=_INSTRUCTIONS.get(self._current_operation, ""),
            context_hint=self._context_hint,
        )
        self._pending_bundle = bundle
        raise PromptBundleReady(bundle)

    def propose_rewrites(
        self,
        content: Dict,
        job_analysis: Dict,
        conversation_history: Optional[List[Dict]] = None,
        user_preferences: Optional[Dict] = None,
    ) -> List[Dict]:
        """Raise :class:`PromptBundleReady` using shared rewrite prompt logic.

        Delegates to :meth:`LLMClient._propose_rewrites_via_chat` so that the
        prompt construction matches the real provider implementations.
        :meth:`chat` is overridden to raise :class:`PromptBundleReady`, so the
        shared helper triggers the passthrough mechanism automatically.
        """
        self._current_operation = OperationType.REWRITE
        if not self._context_hint:
            self._context_hint = "Propose targeted CV text rewrites"
        return self._propose_rewrites_via_chat(
            content, job_analysis, conversation_history, user_preferences
        )
