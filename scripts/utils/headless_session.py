# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""HeadlessSession — cv-builder session management without Flask.

Used by the MCP server and CLI to drive the full cv-builder workflow from
Python without a running web server.  Sessions are persisted to disk using
the same ``session.json`` format as the web app.

Typical usage
-------------
Agent-as-LLM (passthrough) workflow::

    session = HeadlessSession()
    session.set_job_text(job_text)

    bundle = session.prepare_llm_call(OperationType.JOB_ANALYSIS)
    # → serialize bundle as JSON, send to agent, receive result
    session.inject_llm_result(OperationType.JOB_ANALYSIS, agent_result)

    bundle = session.prepare_llm_call(OperationType.RECOMMENDATIONS)
    session.inject_llm_result(OperationType.RECOMMENDATIONS, agent_result)

    # Apply user decisions and generate the CV
    session.apply_decisions(experience_decisions={...}, skill_decisions={...})
    output = session.generate_cv()

Internal-LLM workflow (when a provider is configured)::

    session = HeadlessSession(provider="github", model="gpt-4o")
    session.set_job_text(job_text)
    session.run_with_llm(OperationType.JOB_ANALYSIS)
    session.run_with_llm(OperationType.RECOMMENDATIONS)
    output = session.generate_cv()
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from .agent_bridge import (
    InvalidResultError,
    OperationType,
    PassthroughLLMClient,
    PromptBundle,
    PromptBundleReady,
    validate_agent_json,
)
from .config import get_config
from .conversation_manager import ConversationManager
from .cv_orchestrator import CVOrchestrator
from .llm_client import get_llm_provider

logger = logging.getLogger(__name__)

# Import Phase lazily to avoid circular imports at module level
def _get_phase():
    from .conversation_manager import Phase
    return Phase


class HeadlessSession:
    """Manages a single cv-builder session outside of Flask.

    Parameters
    ----------
    config:
        :class:`~utils.config.Config` instance.  Defaults to ``get_config()``.
    session_file:
        Path to an existing ``session.json`` to load.  If ``None``, a new
        empty session is created.
    provider:
        LLM provider to use for internal-LLM mode (e.g. ``"github"``).
        When ``None``, :class:`PassthroughLLMClient` is used and all LLM
        calls return :class:`~utils.agent_bridge.PromptBundle` objects.
    model:
        LLM model name.  Passed to ``get_llm_provider`` when *provider* is set.
    """

    @classmethod
    def from_conversation_manager(
        cls,
        manager: "ConversationManager",
        orchestrator: "CVOrchestrator",
    ) -> "HeadlessSession":
        """Create a :class:`HeadlessSession` facade over an existing manager pair.

        Used by the Flask HTTP LLM-passthrough routes to wrap a
        :class:`~utils.session_registry.SessionEntry`'s ``manager`` and
        ``orchestrator`` without constructing new underlying objects.

        Parameters
        ----------
        manager:
            An already-initialised :class:`ConversationManager`.
        orchestrator:
            An already-initialised :class:`CVOrchestrator`.

        Returns
        -------
        HeadlessSession
            A fully functional facade that shares state with *manager* and
            *orchestrator*; no new LLM client is created.
        """
        obj = object.__new__(cls)
        obj.config        = getattr(manager, "config", None)
        obj._provider     = None
        obj._model        = None
        obj._manager      = manager
        obj._orchestrator = orchestrator
        return obj

    def __init__(
        self,
        config=None,
        session_file: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.config   = config or get_config()
        self._provider = provider
        self._model    = model

        # Build LLM client
        if provider:
            llm_client = get_llm_provider(provider, model=model)
        else:
            llm_client = PassthroughLLMClient()

        # Build orchestrator and conversation manager
        self._orchestrator = CVOrchestrator(
            master_data_path=self.config.master_cv_path,
            publications_path=self.config.publications_path,
            output_dir=self.config.output_dir,
            llm_client=llm_client,
        )
        self._manager = ConversationManager(
            orchestrator=self._orchestrator,
            llm_client=llm_client,
            config=self.config,
        )

        if session_file:
            self._manager.load_session(session_file)

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def session_id(self) -> Optional[str]:
        """Short hex session identifier, or ``None`` before first save."""
        return self._manager.session_id

    @property
    def phase(self) -> str:
        """Current workflow phase as a string value."""
        phase = self._manager.state.get("phase")
        if phase is None:
            return "init"
        return phase.value if hasattr(phase, "value") else str(phase)

    @property
    def state(self) -> Dict[str, Any]:
        """Direct reference to the ConversationManager state dict."""
        return self._manager.state

    @property
    def session_dir(self) -> Optional[Path]:
        """Filesystem directory where ``session.json`` lives, or ``None``."""
        return self._manager.session_dir

    @property
    def conversation_history(self) -> list:
        """A read-only copy of the conversation turn list.

        Use :meth:`add_to_history` to append validated entries.
        """
        return self._manager.conversation_history

    def add_to_history(self, role: str, content: str) -> None:
        """Append a validated turn to the conversation history.

        Delegates to :meth:`ConversationManager.add_to_history`.
        """
        self._manager.add_to_history(role, content)

    # ── Persistence ───────────────────────────────────────────────────────────

    def save(self) -> Optional[str]:
        """Save the session to disk.

        Returns
        -------
        str or None
            Absolute path to the saved ``session.json``, or ``None`` if the
            session was empty and ``_save_session`` skipped it.
        """
        self._manager.save_session()
        if self._manager.session_dir:
            return str(self._manager.session_dir / "session.json")
        return None

    # ── Job submission ─────────────────────────────────────────────────────────

    def set_job_text(self, job_text: str) -> None:
        """Store job description text and advance phase to JOB_ANALYSIS.

        This does **not** trigger LLM analysis.  Call
        :meth:`prepare_llm_call(OperationType.JOB_ANALYSIS)` to obtain a
        :class:`~utils.agent_bridge.PromptBundle`, or
        :meth:`run_with_llm(OperationType.JOB_ANALYSIS)` for direct execution.
        """
        self._manager.add_job_description(job_text)

    # ── Passthrough LLM interface ──────────────────────────────────────────────

    def prepare_llm_call(
        self,
        operation: OperationType,
        **kwargs: Any,
    ) -> PromptBundle:
        """Return a :class:`~utils.agent_bridge.PromptBundle` for external fulfillment.

        Temporarily swaps the LLM client to :class:`PassthroughLLMClient`,
        triggers the appropriate high-level method, and returns the captured
        bundle via :meth:`~utils.agent_bridge.PassthroughLLMClient.capture`.
        The original LLM client is always restored.

        Parameters
        ----------
        operation:
            Which workflow step to prepare.
        **kwargs:
            Operation-specific keyword arguments:

            - ``JOB_ANALYSIS``: ``job_text`` (falls back to session state)
            - ``RECOMMENDATIONS``: ``user_preferences`` dict (merged with
              post-analysis answers from session state)
            - ``SUMMARY``: ``selected_experiences``, ``refinement_prompt``,
              ``previous_summary``
            - ``REWRITE``: ``user_preferences`` dict
            - ``CHAT``: ``message`` (required)
            - ``INTERVIEW_PREP``: no additional kwargs
            - ``COVER_LETTER``: ``tone``, ``hiring_manager``
            - ``POST_ANALYSIS_QUESTIONS``: no additional kwargs
            - ``SPELL_CHECK``: ``text`` (plain text to check)
            - ``PERSUASION_CHECK``: ``text`` (plain text to check)
            - ``context_hint``: overrides the bundle's ``context_hint``

        Raises
        ------
        ValueError
            If required state (e.g. job description, job analysis) is missing.
        RuntimeError
            If the triggered method does not call ``chat()`` — should never
            happen with valid inputs.
        """
        passthrough = PassthroughLLMClient()
        hint = kwargs.get("context_hint", f"cv-builder: {operation.value}")
        passthrough.set_context(operation, context_hint=hint)

        original_mgr_llm  = self._manager.llm
        original_orch_llm = self._orchestrator.llm

        self._manager.llm      = passthrough
        self._orchestrator.llm = passthrough

        try:
            with passthrough.capture() as cap:
                self._trigger_llm_operation(operation, passthrough, **kwargs)
        finally:
            self._manager.llm      = original_mgr_llm
            self._orchestrator.llm = original_orch_llm

        return cap.bundle

    def _trigger_llm_operation(
        self,
        operation: OperationType,
        passthrough: PassthroughLLMClient,
        **kwargs: Any,
    ) -> None:
        """Invoke the correct high-level LLM method for *operation*.

        This method always raises :class:`~utils.agent_bridge.PromptBundleReady`
        (from the passthrough client) or a plain :class:`Exception` on bad state.
        The :meth:`prepare_llm_call` caller captures the bundle via
        :meth:`~utils.agent_bridge.PassthroughLLMClient.capture`.
        """
        state = self._manager.state

        if operation == OperationType.JOB_ANALYSIS:
            job_text = kwargs.get("job_text") or state.get("job_description")
            if not job_text:
                raise ValueError(
                    "No job description in session state. "
                    "Call set_job_text() before prepare_llm_call(JOB_ANALYSIS)."
                )
            passthrough.set_context(
                operation,
                context_hint=f"Analyze job: {job_text[:80]!r}...",
            )
            passthrough.analyze_job_description(
                job_text, self._orchestrator.master_data
            )

        elif operation == OperationType.RECOMMENDATIONS:
            job_analysis = state.get("job_analysis")
            if not job_analysis:
                raise ValueError(
                    "No job analysis in session.  Complete JOB_ANALYSIS first."
                )
            user_prefs = dict(state.get("post_analysis_answers") or {})
            user_prefs.update(kwargs.get("user_preferences") or {})
            passthrough.set_context(operation, context_hint="Recommend CV customizations")
            passthrough.recommend_customizations(
                job_analysis,
                self._orchestrator.master_data,
                user_preferences=user_prefs or None,
                conversation_history=self._manager.conversation_history,
            )

        elif operation == OperationType.SUMMARY:
            job_analysis = state.get("job_analysis")
            if not job_analysis:
                raise ValueError(
                    "No job analysis in session.  Complete JOB_ANALYSIS first."
                )
            passthrough.set_context(operation, context_hint="Generate professional summary")
            passthrough.generate_professional_summary(
                job_analysis,
                self._orchestrator.master_data,
                selected_experiences=kwargs.get("selected_experiences"),
                refinement_prompt=kwargs.get("refinement_prompt"),
                previous_summary=kwargs.get("previous_summary"),
            )

        elif operation == OperationType.REWRITE:
            job_analysis = state.get("job_analysis")
            if not job_analysis:
                raise ValueError(
                    "No job analysis in session.  Complete JOB_ANALYSIS first."
                )
            customizations = state.get("customizations") or {}
            passthrough.set_context(operation, context_hint="Propose CV text rewrites")
            passthrough.propose_rewrites(
                content=customizations,
                job_analysis=job_analysis,
                conversation_history=self._manager.conversation_history,
                user_preferences=kwargs.get("user_preferences"),
            )

        elif operation == OperationType.POST_ANALYSIS_QUESTIONS:
            job_analysis = state.get("job_analysis")
            if not job_analysis:
                raise ValueError(
                    "No job analysis in session.  Complete JOB_ANALYSIS first."
                )
            passthrough.set_context(operation, context_hint="Generate clarifying questions")
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You generate targeted CV-optimisation questions "
                        "and respond with strict JSON only."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Generate 3-4 targeted clarifying questions for this job:\n"
                        f"{json.dumps(job_analysis, indent=2)}\n\n"
                        'Return JSON: {"intro": "...", "questions": '
                        '[{"type": "...", "question": "...", "choices": [...]}]}'
                    ),
                },
            ]
            passthrough.chat(messages)

        elif operation == OperationType.CHAT:
            message = kwargs.get("message", "")
            passthrough.set_context(operation, context_hint="Chat response")
            history_slice = self._manager.conversation_history[-10:]
            messages = history_slice + [{"role": "user", "content": message}]
            passthrough.chat(messages)

        elif operation == OperationType.INTERVIEW_PREP:
            job_analysis = state.get("job_analysis")
            if not job_analysis:
                raise ValueError(
                    "No job analysis in session.  Complete JOB_ANALYSIS first."
                )
            passthrough.set_context(operation, context_hint="Generate interview prep questions")
            messages = [
                {"role": "system", "content": "You are an expert interview coach."},
                {
                    "role": "user",
                    "content": (
                        "Generate 10 interview preparation questions for this role:\n"
                        f"{json.dumps(job_analysis, indent=2)}\n\n"
                        'Return JSON: {"questions": [{"question": "...", '
                        '"rationale": "...", "hint": "..."}]}'
                    ),
                },
            ]
            passthrough.chat(messages)

        elif operation == OperationType.COVER_LETTER:
            job_analysis = state.get("job_analysis")
            if not job_analysis:
                raise ValueError(
                    "No job analysis in session.  Complete JOB_ANALYSIS first."
                )
            tone = kwargs.get("tone", "professional")
            hiring_manager = kwargs.get("hiring_manager", "Hiring Manager")
            passthrough.set_context(operation, context_hint="Write cover letter")
            messages = [
                {"role": "system", "content": "You are an expert cover letter writer."},
                {
                    "role": "user",
                    "content": (
                        f"Write a {tone} cover letter addressed to {hiring_manager} "
                        "for this job application:\n"
                        f"{json.dumps(job_analysis, indent=2)}\n\n"
                        'Return JSON: {"cover_letter": "..."}'
                    ),
                },
            ]
            passthrough.chat(messages)

        elif operation == OperationType.SPELL_CHECK:
            text = kwargs.get("text") or json.dumps(
                state.get("customizations") or {}, indent=2
            )
            passthrough.set_context(operation, context_hint="Spell-check CV text")
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert copy-editor.  "
                    "Identify and correct spelling and grammar errors in CV text.",
                },
                {
                    "role": "user",
                    "content": (
                        "Find and correct spelling/grammar errors in this CV text:\n"
                        f"{text}\n\n"
                        'Return JSON: {"corrections": [{"original": "...", '
                        '"corrected": "...", "context": "..."}]}'
                    ),
                },
            ]
            passthrough.chat(messages)

        elif operation == OperationType.PERSUASION_CHECK:
            text = kwargs.get("text") or json.dumps(
                state.get("customizations") or {}, indent=2
            )
            passthrough.set_context(operation, context_hint="Persuasion quality check")
            messages = [
                {
                    "role": "system",
                    "content": "You evaluate professional CV writing quality.",
                },
                {
                    "role": "user",
                    "content": (
                        "Check this CV text for weak language, filler phrases, "
                        "and persuasion issues:\n"
                        f"{text}\n\n"
                        'Return JSON: {"warnings": [{"type": "...", '
                        '"text": "...", "suggestion": "..."}]}'
                    ),
                },
            ]
            passthrough.chat(messages)

        else:
            raise ValueError(f"Unsupported operation: {operation!r}")

    def inject_llm_result(
        self,
        operation: OperationType,
        result: Union[str, dict, list],
    ) -> None:
        """Validate and store an agent-supplied LLM result.

        **Always validates JSON compliance before storing.**  All agent-provided
        results — whether from a passthrough workflow or an external tool — must
        pass through this method.

        Parameters
        ----------
        operation:
            The :class:`~utils.agent_bridge.OperationType` this result
            corresponds to.
        result:
            Raw JSON string or already-decoded dict/list from the agent.

        Raises
        ------
        InvalidResultError
            If *result* is not valid JSON or fails schema type checks.
        ValueError
            If the current workflow phase is incompatible with this operation.
        """
        from .agent_bridge import _SCHEMAS

        # 1. JSON compliance check (always)
        parsed = validate_agent_json(result, schema=_SCHEMAS.get(operation))

        Phase = _get_phase()
        state = self._manager.state

        # 2. Store result and advance phase
        if operation == OperationType.JOB_ANALYSIS:
            self._manager._store_job_analysis(parsed)
            state["phase"] = Phase.JOB_ANALYSIS
            logger.info("inject_llm_result: JOB_ANALYSIS stored → phase=JOB_ANALYSIS")

        elif operation == OperationType.RECOMMENDATIONS:
            self._manager._normalize_recommendations(parsed)
            state["customizations"] = parsed
            state["phase"] = Phase.CUSTOMIZATION
            logger.info("inject_llm_result: RECOMMENDATIONS stored → phase=CUSTOMIZATION")

        elif operation == OperationType.SUMMARY:
            summary_text = (
                parsed.get("summary", parsed)
                if isinstance(parsed, dict)
                else str(parsed)
            )
            session_summaries = state.get("session_summaries") or {}
            session_summaries["ai_recommended"] = summary_text
            state["session_summaries"] = session_summaries
            if isinstance(state.get("customizations"), dict):
                state["customizations"]["summary_focus"] = "ai_recommended"
            logger.info("inject_llm_result: SUMMARY stored")

        elif operation == OperationType.REWRITE:
            if not isinstance(parsed, list):
                raise InvalidResultError(
                    "REWRITE result must be a JSON array of rewrite proposals"
                )
            state["pending_rewrites"] = parsed
            state["phase"] = Phase.REWRITE_REVIEW
            logger.info(
                "inject_llm_result: REWRITE stored (%d proposals) → phase=REWRITE_REVIEW",
                len(parsed),
            )

        elif operation == OperationType.SPELL_CHECK:
            state["spell_check_results"] = parsed.get("corrections", [])
            logger.info("inject_llm_result: SPELL_CHECK stored")

        elif operation == OperationType.PERSUASION_CHECK:
            state["persuasion_warnings"] = parsed.get("warnings", [])
            logger.info("inject_llm_result: PERSUASION_CHECK stored")

        elif operation == OperationType.POST_ANALYSIS_QUESTIONS:
            state["post_analysis_questions"] = parsed.get("questions", [])
            if "intro" in parsed:
                state["post_analysis_intro"] = parsed["intro"]
            logger.info("inject_llm_result: POST_ANALYSIS_QUESTIONS stored")

        elif operation == OperationType.CHAT:
            response_text = (
                parsed.get("response", "")
                if isinstance(parsed, dict)
                else str(parsed)
            )
            self._manager.add_to_history("assistant", response_text)
            logger.info("inject_llm_result: CHAT response stored")

        elif operation == OperationType.INTERVIEW_PREP:
            state["interview_prep"] = parsed.get("questions", [])
            logger.info("inject_llm_result: INTERVIEW_PREP stored")

        elif operation == OperationType.COVER_LETTER:
            state["cover_letter_text"] = parsed.get("cover_letter", "")
            logger.info("inject_llm_result: COVER_LETTER stored")

        else:
            raise ValueError(
                f"inject_llm_result: unhandled OperationType {operation!r}. "
                "Add a handler branch for this operation."
            )

    # ── Internal-LLM execution ─────────────────────────────────────────────────

    def run_with_llm(self, operation: OperationType, **kwargs: Any) -> Any:
        """Run an operation end-to-end using the configured LLM provider.

        Only available when *provider* was set at construction time.  Raises
        :class:`ValueError` if the session was created without a provider
        (passthrough mode).
        """
        if self._provider is None:
            raise ValueError(
                "run_with_llm requires a provider.  Create HeadlessSession with "
                "provider='github' (or similar), or use prepare_llm_call() + "
                "inject_llm_result() for agent-mode operation."
            )

        Phase = _get_phase()
        state = self._manager.state

        if operation == OperationType.JOB_ANALYSIS:
            job_text = kwargs.get("job_text") or state.get("job_description")
            if not job_text:
                raise ValueError("job_text required for JOB_ANALYSIS operation")
            analysis = self._manager.llm.analyze_job_description(
                job_text, self._orchestrator.master_data
            )
            self._manager._store_job_analysis(analysis)
            state["phase"] = Phase.JOB_ANALYSIS
            return analysis

        elif operation == OperationType.RECOMMENDATIONS:
            job_analysis = state.get("job_analysis")
            if not job_analysis:
                raise ValueError("Job analysis must be complete before getting recommendations")
            user_prefs = dict(state.get("post_analysis_answers") or {})
            user_prefs.update(kwargs.get("user_preferences") or {})
            recs = self._manager.llm.recommend_customizations(
                job_analysis,
                self._orchestrator.master_data,
                user_preferences=user_prefs or None,
                conversation_history=self._manager.conversation_history,
            )
            self._manager._normalize_recommendations(recs)
            state["customizations"] = recs
            state["phase"] = Phase.CUSTOMIZATION
            return recs

        elif operation == OperationType.SUMMARY:
            job_analysis = state.get("job_analysis")
            if not job_analysis:
                raise ValueError("Job analysis must be complete before generating summary")
            summary = self._manager.llm.generate_professional_summary(
                job_analysis,
                self._orchestrator.master_data,
                selected_experiences=kwargs.get("selected_experiences"),
                refinement_prompt=kwargs.get("refinement_prompt"),
                previous_summary=kwargs.get("previous_summary"),
            )
            session_summaries = state.get("session_summaries") or {}
            session_summaries["ai_recommended"] = summary
            state["session_summaries"] = session_summaries
            if isinstance(state.get("customizations"), dict):
                state["customizations"]["summary_focus"] = "ai_recommended"
            return summary

        else:
            raise ValueError(f"run_with_llm: unsupported operation {operation!r}")

    # ── Decision submission ───────────────────────────────────────────────────

    def apply_decisions(
        self,
        experience_decisions: Optional[Dict[str, Any]] = None,
        skill_decisions: Optional[Dict[str, Any]] = None,
        achievement_decisions: Optional[Dict[str, Any]] = None,
        publication_decisions: Optional[Dict[str, Any]] = None,
        extra_skills: Optional[List[str]] = None,
        summary_focus_override: Optional[str] = None,
    ) -> None:
        """Apply user decisions about which content to include in the CV.

        All parameters are optional — pass only the decision categories that
        have been updated.
        """
        state = self._manager.state
        if experience_decisions is not None:
            state["experience_decisions"] = experience_decisions
        if skill_decisions is not None:
            state["skill_decisions"] = skill_decisions
        if achievement_decisions is not None:
            state["achievement_decisions"] = achievement_decisions
        if publication_decisions is not None:
            state["publication_decisions"] = publication_decisions
        if extra_skills is not None:
            state["extra_skills"] = extra_skills
        if summary_focus_override is not None:
            state["summary_focus_override"] = summary_focus_override

    def approve_rewrites(self, rewrite_ids: List[str]) -> Dict[str, int]:
        """Mark a subset of pending rewrites as approved.

        Parameters
        ----------
        rewrite_ids:
            List of rewrite ``id`` values to approve.  Rewrites not in the
            list remain pending.

        Returns
        -------
        dict
            ``{"approved": <count>, "rejected": <count>}``

        Raises
        ------
        ValueError
            If any ID in *rewrite_ids* does not match a pending rewrite.
        """
        state = self._manager.state
        pending = state.get("pending_rewrites") or []
        id_set = set(rewrite_ids)
        known_ids = {rw.get("id") for rw in pending}
        unknown_ids = id_set - known_ids
        if unknown_ids:
            raise ValueError(
                f"approve_rewrites: unknown rewrite ID(s): {sorted(unknown_ids)}. "
                f"Known IDs: {sorted(known_ids)}"
            )
        approved, rejected = [], []
        for rw in pending:
            if rw.get("id") in id_set:
                approved.append(rw)
            else:
                rejected.append(rw)
        state["approved_rewrites"] = approved
        state["pending_rewrites"]  = rejected
        return {"approved": len(approved), "rejected": len(rejected)}

    # ── CV generation ─────────────────────────────────────────────────────────

    def generate_cv(
        self,
        html_preview_only: bool = False,
    ) -> Dict[str, Any]:
        """Generate CV documents from current session state.

        Returns
        -------
        dict
            ``generated_files`` dict from session state with output paths.
        """
        Phase = _get_phase()
        state = self._manager.state
        output_dir = self._orchestrator.output_dir
        if self._manager.session_dir:
            output_dir = self._manager.session_dir

        self._manager.generate_cv_from_session_state(
            output_dir=output_dir,
            html_preview_only=html_preview_only,
        )
        state["phase"] = Phase.GENERATION
        return state.get("generated_files") or {}

    # ── Master data access ────────────────────────────────────────────────────

    def get_master_data(self) -> Dict[str, Any]:
        """Return the master CV data dict."""
        return self._orchestrator.master_data or {}

    def update_master_section(
        self,
        section: str,
        data: Any,
    ) -> None:
        """Write a top-level section of the master CV data.

        **Phase guard**: Only permitted during ``init`` or ``refinement`` phase.

        Parameters
        ----------
        section:
            Top-level key in ``Master_CV_Data.json`` (e.g. ``"contact"``,
            ``"experience"``, ``"skills"``).
        data:
            New value for *section*.

        Raises
        ------
        ValueError
            If the current phase does not permit master data edits.
        """
        current_phase = self.phase
        Phase = _get_phase()
        permitted = {Phase.INIT.value, Phase.REFINEMENT.value}
        if current_phase not in permitted:
            raise ValueError(
                f"Master CV data may only be modified in 'init' or 'refinement' "
                f"phase (current: {current_phase!r})"
            )
        master = self._orchestrator.master_data or {}
        master[section] = data
        self._save_master_data()

    def _save_master_data(self) -> None:
        """Persist master CV data to disk (internal helper)."""
        import json as _json
        path = self._orchestrator.master_data_path
        master = self._orchestrator.master_data or {}
        with open(path, "w", encoding="utf-8") as f:
            _json.dump(master, f, indent=2, ensure_ascii=False)
        logger.info("Master CV data saved to %s", path)

    def get_publications(self) -> str:
        """Return raw BibTeX publications string, or empty string if not found."""
        try:
            with open(self._orchestrator.publications_path, encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return ""

    # ── Session discovery helpers ─────────────────────────────────────────────

    @staticmethod
    def list_sessions(output_dir: Optional[str] = None) -> List[Dict[str, Any]]:
        """Scan the output directory for saved sessions.

        Returns
        -------
        list of dict
            Each dict has ``session_id``, ``phase``, ``position_name``,
            ``session_file``, and ``last_modified`` keys.
        """
        config = get_config()
        base = Path(output_dir or config.output_dir).expanduser()
        sessions = []
        if not base.exists():
            return sessions
        for sf in sorted(base.rglob("session.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                with open(sf, encoding="utf-8") as f:
                    data = json.load(f)
                phase = data.get("state", {}).get("phase", "init")
                if hasattr(phase, "value"):
                    phase = phase.value
                sessions.append({
                    "session_id":    data.get("session_id", ""),
                    "phase":         str(phase),
                    "position_name": data.get("state", {}).get("position_name"),
                    "session_file":  str(sf),
                    "last_modified": sf.stat().st_mtime,
                })
            except Exception:
                logger.debug("Skipping unreadable session file %s", sf, exc_info=True)
        return sessions

    @staticmethod
    def load(session_file: str, provider: Optional[str] = None, model: Optional[str] = None) -> "HeadlessSession":
        """Convenience factory: load an existing session from disk."""
        return HeadlessSession(session_file=session_file, provider=provider, model=model)
