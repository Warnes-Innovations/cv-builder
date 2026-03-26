# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Reusable saved-session fixture factories for workflow-state testing.

These helpers build coherent session state payloads for the current workflow,
including canonical combinations of top-level workflow phase and staged
generation sub-phase. They intentionally support two use cases:

1. Canonical combinations derived from current code paths
2. Explicitly inconsistent combinations for corruption/normalization tests
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any


WORKFLOW_PHASES = (
    "init",
    "job_analysis",
    "customization",
    "rewrite_review",
    "spell_check",
    "generation",
    "layout_review",
    "refinement",
)

STAGED_GENERATION_PHASES = (
    "idle",
    "layout_review",
    "confirmed",
    "final_complete",
)

PHASE_RANK = {phase: index for index, phase in enumerate(WORKFLOW_PHASES)}

DEFAULT_TIMESTAMP = "2026-03-24T00:47:00-04:00"
DEFAULT_SESSION_ID = "fixture-session"
DEFAULT_POSITION_NAME = "Senior Engineer at Acme"
DEFAULT_OUTPUT_DIR = "/tmp/cv-builder-fixture-output"

DEFAULT_JOB_DESCRIPTION = (
    "Senior Engineer\n"
    "Acme\n"
    "Build reliable workflow tooling."
)
DEFAULT_JOB_ANALYSIS = {
    "title": "Senior Engineer",
    "company": "Acme",
    "required_skills": ["Python", "Testing"],
    "must_have_requirements": ["Workflow automation"],
}
DEFAULT_CUSTOMIZATIONS = {
    "recommended_experiences": ["exp_001"],
    "recommended_skills": ["Python"],
    "recommended_achievements": ["ach_001"],
    "summary_focus": "ai_recommended",
}
DEFAULT_PENDING_REWRITES = [
    {
        "id": "rewrite-001",
        "section": "summary",
        "original": "Original summary bullet.",
        "proposed": "Sharper summary bullet.",
        "reason": "Align to ATS keywords.",
    }
]
DEFAULT_APPROVED_REWRITES = [
    {
        "id": "rewrite-001",
        "section": "summary",
        "original": "Original summary bullet.",
        "proposed": "Sharper summary bullet.",
        "reason": "Align to ATS keywords.",
    }
]
DEFAULT_REWRITE_AUDIT = [
    {
        **DEFAULT_PENDING_REWRITES[0],
        "outcome": "accept",
        "final": None,
    }
]
DEFAULT_SPELL_AUDIT = [
    {
        "context_type": "summary",
        "location": "summary[0]",
        "original": "realiable",
        "suggestion": "reliable",
        "rule": "spelling",
        "outcome": "accept",
        "final": "reliable",
    }
]
DEFAULT_LAYOUT_INSTRUCTIONS = [
    {
        "id": "layout-001",
        "text": "Tighten margins slightly.",
        "submitted_at": DEFAULT_TIMESTAMP,
        "applied": True,
        "summary": "Adjusted margins.",
        "confidence": 0.95,
    }
]
DEFAULT_GENERATED_FILES = {
    "output_dir": DEFAULT_OUTPUT_DIR,
    "files": [
        f"{DEFAULT_OUTPUT_DIR}/CV.html",
        f"{DEFAULT_OUTPUT_DIR}/CV.pdf",
    ],
}
DEFAULT_GENERATION_PROGRESS = [
    {"step": "render_html", "status": "completed"},
    {"step": "render_pdf", "status": "completed"},
]


@dataclass(frozen=True)
class CanonicalSessionCombination:
    """Definition of a canonical workflow/staged-generation combination."""

    name: str
    workflow_phase: str
    generation_phase: str | None
    fresh_reachable: bool
    restore_supported: bool
    notes: str


CANONICAL_VALID_COMBINATIONS = (
    CanonicalSessionCombination(
        name="init_idle",
        workflow_phase="init",
        generation_phase=None,
        fresh_reachable=True,
        restore_supported=True,
        notes="Fresh session default.",
    ),
    CanonicalSessionCombination(
        name="job_analysis_idle",
        workflow_phase="job_analysis",
        generation_phase=None,
        fresh_reachable=True,
        restore_supported=True,
        notes="Job description captured; analysis not yet completed.",
    ),
    CanonicalSessionCombination(
        name="customization_idle",
        workflow_phase="customization",
        generation_phase=None,
        fresh_reachable=True,
        restore_supported=True,
        notes="Analysis complete; customization workspace active.",
    ),
    CanonicalSessionCombination(
        name="rewrite_review_idle",
        workflow_phase="rewrite_review",
        generation_phase=None,
        fresh_reachable=True,
        restore_supported=True,
        notes="Rewrite review is active before spell check.",
    ),
    CanonicalSessionCombination(
        name="spell_check_idle",
        workflow_phase="spell_check",
        generation_phase=None,
        fresh_reachable=True,
        restore_supported=True,
        notes="Spell check is active before generation.",
    ),
    CanonicalSessionCombination(
        name="generation_idle",
        workflow_phase="generation",
        generation_phase=None,
        fresh_reachable=True,
        restore_supported=True,
        notes="Main generation phase before staged preview exists.",
    ),
    CanonicalSessionCombination(
        name="layout_review_idle",
        workflow_phase="layout_review",
        generation_phase=None,
        fresh_reachable=True,
        restore_supported=True,
        notes="Top-level layout review reached before preview generation.",
    ),
    CanonicalSessionCombination(
        name="layout_review_active",
        workflow_phase="layout_review",
        generation_phase="layout_review",
        fresh_reachable=True,
        restore_supported=True,
        notes="Preview HTML exists and layout refinement is active.",
    ),
    CanonicalSessionCombination(
        name="layout_review_confirmed",
        workflow_phase="layout_review",
        generation_phase="confirmed",
        fresh_reachable=True,
        restore_supported=True,
        notes="Layout confirmed, awaiting final generation.",
    ),
    CanonicalSessionCombination(
        name="refinement_final_complete",
        workflow_phase="refinement",
        generation_phase="final_complete",
        fresh_reachable=True,
        restore_supported=True,
        notes="Final outputs generated and workflow advanced to refinement.",
    ),
    CanonicalSessionCombination(
        name="refinement_legacy_idle",
        workflow_phase="refinement",
        generation_phase=None,
        fresh_reachable=False,
        restore_supported=True,
        notes="Legacy-compatible refinement state without staged artifacts.",
    ),
)

CANONICAL_COMBINATIONS_BY_NAME = {
    combo.name: combo for combo in CANONICAL_VALID_COMBINATIONS
}


def base_session_state() -> dict[str, Any]:
    """Return a deep-copyable baseline session state payload."""
    return {
        "phase": "init",
        "position_name": None,
        "job_description": None,
        "job_analysis": None,
        "post_analysis_questions": [],
        "post_analysis_answers": {},
        "customizations": None,
        "generated_files": None,
        "pending_rewrites": None,
        "persuasion_warnings": [],
        "generation_progress": [],
        "approved_rewrites": [],
        "rewrite_audit": [],
        "layout_instructions": [],
        "cover_letter_text": None,
        "cover_letter_params": None,
        "cover_letter_reused_from": None,
        "screening_responses": [],
        "experience_decisions": {},
        "skill_decisions": {},
        "achievement_decisions": {},
        "publication_decisions": {},
        "summary_focus_override": None,
        "extra_skills": [],
        "achievement_rewrite_log": [],
        "generation_state": {},
        "intake": {},
        "spell_audit": [],
        "session_summaries": {},
        "iterating": False,
        "reentry_phase": None,
    }


def _phase_at_least(current_phase: str, minimum_phase: str) -> bool:
    return PHASE_RANK[current_phase] >= PHASE_RANK[minimum_phase]


def _build_generation_state(generation_phase: str | None) -> dict[str, Any]:
    if generation_phase in (None, "idle"):
        return {}
    if generation_phase == "layout_review":
        return {
            "phase": "layout_review",
            "preview_html": "<html><body><h1>Preview</h1></body></html>",
            "preview_request_id": "preview-001",
            "preview_generated_at": DEFAULT_TIMESTAMP,
            "layout_confirmed": False,
            "layout_instructions": deepcopy(DEFAULT_LAYOUT_INSTRUCTIONS),
        }
    if generation_phase == "confirmed":
        return {
            "phase": "confirmed",
            "preview_html": (
                "<html><body><h1>Confirmed Preview</h1></body></html>"
            ),
            "preview_request_id": "preview-002",
            "preview_generated_at": DEFAULT_TIMESTAMP,
            "layout_confirmed": True,
            "confirmed_at": DEFAULT_TIMESTAMP,
            "confirmed_preview_hash": "abc123def4567890",
            "layout_instructions": deepcopy(DEFAULT_LAYOUT_INSTRUCTIONS),
        }
    if generation_phase == "final_complete":
        return {
            "phase": "final_complete",
            "preview_html": "<html><body><h1>Final Preview</h1></body></html>",
            "preview_request_id": "preview-003",
            "preview_generated_at": DEFAULT_TIMESTAMP,
            "layout_confirmed": True,
            "confirmed_at": DEFAULT_TIMESTAMP,
            "confirmed_preview_hash": "abc123def4567890",
            "final_generated_at": DEFAULT_TIMESTAMP,
            "final_output_paths": {
                "html": f"{DEFAULT_OUTPUT_DIR}/CV_final.html",
                "pdf": f"{DEFAULT_OUTPUT_DIR}/CV_final.pdf",
            },
            "layout_instructions": deepcopy(DEFAULT_LAYOUT_INSTRUCTIONS),
        }
    raise ValueError(
        f"Unsupported staged generation phase: {generation_phase!r}"
    )


def build_session_state(
    workflow_phase: str,
    generation_phase: str | None = None,
    *,
    allow_inconsistent: bool = False,
    state_overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a session state payload for the requested combination."""
    if workflow_phase not in PHASE_RANK:
        raise ValueError(f"Unsupported workflow phase: {workflow_phase!r}")

    if generation_phase not in (None, *STAGED_GENERATION_PHASES):
        raise ValueError(
            f"Unsupported staged generation phase: {generation_phase!r}"
        )

    if (
        not allow_inconsistent
        and generation_phase in {
            "layout_review",
            "confirmed",
            "final_complete",
        }
    ):
        if workflow_phase not in {"layout_review", "refinement"}:
            raise ValueError(
                "Pre-layout workflow phases cannot use active "
                "staged generation "
                "states unless allow_inconsistent=True."
            )

    state = deepcopy(base_session_state())
    state["phase"] = workflow_phase

    if _phase_at_least(workflow_phase, "job_analysis"):
        state["job_description"] = DEFAULT_JOB_DESCRIPTION
        state["position_name"] = DEFAULT_POSITION_NAME
        state["intake"] = {
            "company": "Acme",
            "role": "Senior Engineer",
            "date_applied": "2026-03-24",
        }

    if _phase_at_least(workflow_phase, "customization"):
        state["job_analysis"] = deepcopy(DEFAULT_JOB_ANALYSIS)

    if _phase_at_least(workflow_phase, "rewrite_review"):
        state["customizations"] = deepcopy(DEFAULT_CUSTOMIZATIONS)
        state["session_summaries"] = {
            "ai_recommended": (
                "Experienced engineering leader focused on workflow quality."
            ),
        }

    if _phase_at_least(workflow_phase, "spell_check"):
        state["pending_rewrites"] = deepcopy(DEFAULT_PENDING_REWRITES)
        state["approved_rewrites"] = deepcopy(DEFAULT_APPROVED_REWRITES)
        state["rewrite_audit"] = deepcopy(DEFAULT_REWRITE_AUDIT)

    if _phase_at_least(workflow_phase, "generation"):
        state["spell_audit"] = deepcopy(DEFAULT_SPELL_AUDIT)

    if _phase_at_least(workflow_phase, "layout_review"):
        state["generated_files"] = deepcopy(DEFAULT_GENERATED_FILES)
        state["generation_progress"] = deepcopy(DEFAULT_GENERATION_PROGRESS)

    if _phase_at_least(workflow_phase, "refinement"):
        state["layout_instructions"] = deepcopy(DEFAULT_LAYOUT_INSTRUCTIONS)

    generation_state = _build_generation_state(generation_phase)
    if generation_state:
        state["generation_state"] = generation_state

    if generation_phase == "final_complete":
        state.setdefault("generated_files", deepcopy(DEFAULT_GENERATED_FILES))
        state["generated_files"].update({
            "final_html": f"{DEFAULT_OUTPUT_DIR}/CV_final.html",
            "final_pdf": f"{DEFAULT_OUTPUT_DIR}/CV_final.pdf",
            "files": [
                f"{DEFAULT_OUTPUT_DIR}/CV_final.html",
                f"{DEFAULT_OUTPUT_DIR}/CV_final.pdf",
            ],
        })

    if state_overrides:
        state.update(deepcopy(state_overrides))

    return state


def build_canonical_session_state(
    combination_name: str,
    *,
    state_overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a session state payload for a named canonical combination."""
    try:
        combination = CANONICAL_COMBINATIONS_BY_NAME[combination_name]
    except KeyError as exc:
        raise ValueError(
            f"Unknown canonical combination: {combination_name!r}"
        ) from exc

    return build_session_state(
        combination.workflow_phase,
        combination.generation_phase,
        state_overrides=state_overrides,
    )


def build_session_payload(
    *,
    workflow_phase: str,
    generation_phase: str | None = None,
    session_id: str = DEFAULT_SESSION_ID,
    conversation_history: list[dict[str, Any]] | None = None,
    timestamp: str = DEFAULT_TIMESTAMP,
    allow_inconsistent: bool = False,
    state_overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return a full persisted session payload."""
    return {
        "session_id": session_id,
        "timestamp": timestamp,
        "state": build_session_state(
            workflow_phase,
            generation_phase,
            allow_inconsistent=allow_inconsistent,
            state_overrides=state_overrides,
        ),
        "conversation_history": deepcopy(conversation_history or []),
    }


def materialize_session(
    root_dir: Path,
    *,
    workflow_phase: str,
    generation_phase: str | None = None,
    session_id: str = DEFAULT_SESSION_ID,
    conversation_history: list[dict[str, Any]] | None = None,
    timestamp: str = DEFAULT_TIMESTAMP,
    allow_inconsistent: bool = False,
    state_overrides: dict[str, Any] | None = None,
) -> Path:
    """Write a session.json fixture below ``root_dir`` and return its path."""
    payload = build_session_payload(
        workflow_phase=workflow_phase,
        generation_phase=generation_phase,
        session_id=session_id,
        conversation_history=conversation_history,
        timestamp=timestamp,
        allow_inconsistent=allow_inconsistent,
        state_overrides=state_overrides,
    )
    session_dir = Path(root_dir) / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    session_file = session_dir / "session.json"
    session_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return session_file


def materialize_canonical_session(
    root_dir: Path,
    combination_name: str,
    *,
    session_id: str | None = None,
    conversation_history: list[dict[str, Any]] | None = None,
    state_overrides: dict[str, Any] | None = None,
) -> Path:
    """Write a named canonical combination to disk and return the file path."""
    combination = CANONICAL_COMBINATIONS_BY_NAME[combination_name]
    return materialize_session(
        root_dir,
        workflow_phase=combination.workflow_phase,
        generation_phase=combination.generation_phase,
        session_id=session_id or combination_name,
        conversation_history=conversation_history,
        state_overrides=state_overrides,
    )
