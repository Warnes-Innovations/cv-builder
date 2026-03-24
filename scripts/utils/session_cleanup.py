# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Utilities for scanning and cleaning session directories safely."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import json
from pathlib import Path
import shutil
import time
from typing import Any, Iterable, Optional


CATEGORY_ORDER = ["duplicate", "empty", "test", "corrupted", "trashed"]
VALID_ACTIONS = {"delete", "trash", "leave"}

_MEANINGFUL_STATE_KEYS = (
    "position_name",
    "job_description",
    "job_analysis",
    "post_analysis_questions",
    "post_analysis_answers",
    "customizations",
    "generated_files",
    "pending_rewrites",
    "persuasion_warnings",
    "generation_progress",
    "approved_rewrites",
    "rewrite_audit",
    "layout_instructions",
    "cover_letter_text",
    "cover_letter_params",
    "cover_letter_reused_from",
    "screening_responses",
    "experience_decisions",
    "skill_decisions",
    "achievement_decisions",
    "publication_decisions",
    "summary_focus_override",
    "extra_skills",
    "achievement_overrides",
    "removed_achievement_ids",
    "skill_group_overrides",
    "achievement_rewrite_log",
    "generation_state",
    "intake",
)

_TEST_MARKERS = (
    "Acme Corp",
    "Remote - XYZ Corp",
    "Senior Data Science Manager",
    (
        "We are seeking a Senior Data Science Manager "
        "to lead our data science team."
    ),
)


@dataclass(frozen=True)
class SessionCandidate:
    """A session selected for one cleanup category."""

    category: str
    session_file: Path
    session_dir: Path
    relative_path: str
    timestamp: Optional[str]
    phase: Optional[str]
    position_name: Optional[str]
    reasons: tuple[str, ...]
    duplicate_of: Optional[str] = None


@dataclass(frozen=True)
class ScanResult:
    """Grouped cleanup candidates."""

    root_dir: Path
    categories: dict[str, list[SessionCandidate]]
    total_session_files: int


@dataclass(frozen=True)
class OperationResult:
    """Filesystem action outcome for one session directory."""

    category: str
    action: str
    source: Path
    destination: Optional[Path]
    status: str
    detail: str


def scan_sessions(root_dir: Path) -> ScanResult:
    """Scan a session tree and group cleanup candidates."""
    root_dir = root_dir.expanduser().resolve()
    categories: dict[str, list[SessionCandidate]] = {}
    for name in CATEGORY_ORDER:
        categories[name] = []
    session_files = sorted(root_dir.rglob("session.json"))
    duplicate_pool: list[tuple[SessionCandidate, dict[str, Any]]] = []

    for session_file in session_files:
        if not session_file.is_file():
            continue

        relative_path = str(session_file.relative_to(root_dir))
        session_dir = session_file.parent
        if _is_trashed(root_dir, session_file):
            categories["trashed"].append(
                SessionCandidate(
                    category="trashed",
                    session_file=session_file,
                    session_dir=session_dir,
                    relative_path=relative_path,
                    timestamp=None,
                    phase=None,
                    position_name=None,
                    reasons=("Session directory is already inside .trash.",),
                )
            )
            continue

        payload, error = _load_payload(session_file)
        if error is not None:
            categories["corrupted"].append(
                SessionCandidate(
                    category="corrupted",
                    session_file=session_file,
                    session_dir=session_dir,
                    relative_path=relative_path,
                    timestamp=None,
                    phase=None,
                    position_name=None,
                    reasons=(error,),
                )
            )
            continue
        if payload is None:
            continue

        state = payload["state"]
        conversation_history = payload["conversation_history"]
        timestamp = payload.get("timestamp")
        phase = state.get("phase")
        position_name = state.get("position_name")

        test_reasons = _find_test_markers(session_dir.name, payload)
        if test_reasons:
            categories["test"].append(
                SessionCandidate(
                    category="test",
                    session_file=session_file,
                    session_dir=session_dir,
                    relative_path=relative_path,
                    timestamp=timestamp,
                    phase=phase,
                    position_name=position_name,
                    reasons=tuple(test_reasons),
                )
            )
            continue

        if _is_empty_session(state, conversation_history):
            categories["empty"].append(
                SessionCandidate(
                    category="empty",
                    session_file=session_file,
                    session_dir=session_dir,
                    relative_path=relative_path,
                    timestamp=timestamp,
                    phase=phase,
                    position_name=position_name,
                    reasons=("Session has no meaningful saved content.",),
                )
            )
            continue

        duplicate_pool.append(
            (
                SessionCandidate(
                    category="duplicate",
                    session_file=session_file,
                    session_dir=session_dir,
                    relative_path=relative_path,
                    timestamp=timestamp,
                    phase=phase,
                    position_name=position_name,
                    reasons=(),
                ),
                payload,
            )
        )

    duplicate_groups: dict[
        str,
        list[tuple[SessionCandidate, dict[str, Any]]],
    ] = {}
    for candidate, payload in duplicate_pool:
        duplicate_groups.setdefault(
            _duplicate_key(payload),
            [],
        ).append((candidate, payload))

    for group in duplicate_groups.values():
        if len(group) < 2:
            continue

        ranked = sorted(group, key=lambda item: _sort_key(item[0]))
        keep = ranked[0][0]
        for duplicate, _payload in ranked[1:]:
            categories["duplicate"].append(
                SessionCandidate(
                    category="duplicate",
                    session_file=duplicate.session_file,
                    session_dir=duplicate.session_dir,
                    relative_path=duplicate.relative_path,
                    timestamp=duplicate.timestamp,
                    phase=duplicate.phase,
                    position_name=duplicate.position_name,
                    reasons=(
                        "Normalized session payload matches another live "
                        "session.",
                    ),
                    duplicate_of=keep.relative_path,
                )
            )

    return ScanResult(
        root_dir=root_dir,
        categories=categories,
        total_session_files=len(session_files),
    )


def format_scan_report(scan_result: ScanResult) -> str:
    """Render a human-readable grouped report."""
    return format_scan_report_with_mode(scan_result, detailed=False)


def format_scan_report_with_mode(
    scan_result: ScanResult,
    *,
    detailed: bool,
) -> str:
    """Render a grouped report in detailed or compact mode."""
    lines = [
        f"Session root: {scan_result.root_dir}",
        f"Session files scanned: {scan_result.total_session_files}",
    ]
    for category in CATEGORY_ORDER:
        items = scan_result.categories[category]
        lines.append("")
        lines.append(f"[{category}] {len(items)} candidate(s)")
        if not items:
            lines.append("  - none")
            continue
        if detailed:
            lines.extend(_format_detailed_items(items))
            continue
        lines.extend(_format_compact_table(items))
    return "\n".join(lines)


def format_category_details(
    category: str,
    items: list[SessionCandidate],
) -> str:
    """Render one category using the detailed per-session layout."""
    lines = [f"[{category}] {len(items)} candidate(s)"]
    if not items:
        lines.append("  - none")
        return "\n".join(lines)
    lines.extend(_format_detailed_items(items))
    return "\n".join(lines)


def format_category_report(
    category: str,
    items: list[SessionCandidate],
    *,
    detailed: bool,
) -> str:
    """Render one category in the requested output mode."""
    if detailed:
        return format_category_details(category, items)

    lines = [f"[{category}] {len(items)} candidate(s)"]
    if not items:
        lines.append("  - none")
        return "\n".join(lines)
    lines.extend(_format_compact_table(items))
    return "\n".join(lines)


def _format_detailed_items(items: list[SessionCandidate]) -> list[str]:
    """Render the original detailed line-by-line report."""
    lines: list[str] = []
    for item in items:
        summary = item.position_name or item.session_dir.name
        phase = item.phase or "unknown"
        timestamp = item.timestamp or "unknown"
        lines.append(f"  - {item.relative_path}")
        lines.append(f"    title: {summary}")
        lines.append(f"    phase: {phase}")
        lines.append(f"    timestamp: {timestamp}")
        if item.duplicate_of:
            lines.append(f"    duplicate_of: {item.duplicate_of}")
        for reason in item.reasons:
            lines.append(f"    reason: {reason}")
    return lines


def _format_compact_table(items: list[SessionCandidate]) -> list[str]:
    """Render a compact fixed-width table for frequent CLI use."""
    headers = ["file", "title", "phase", "timestamp", "notes"]
    rows = [
        [
            item.relative_path,
            item.position_name or item.session_dir.name,
            item.phase or "unknown",
            item.timestamp or "unknown",
            _compact_note(item),
        ]
        for item in items
    ]
    widths = [len(header) for header in headers]
    for row in rows:
        for index, cell in enumerate(row):
            widths[index] = max(widths[index], len(cell))

    header_line = "  " + " | ".join(
        header.ljust(widths[index])
        for index, header in enumerate(headers)
    )
    separator_line = "  " + "-+-".join(
        "-" * widths[index]
        for index, _header in enumerate(headers)
    )
    body_lines = [
        "  " + " | ".join(
            cell.ljust(widths[index])
            for index, cell in enumerate(row)
        )
        for row in rows
    ]
    return [header_line, separator_line, *body_lines]


def _compact_note(item: SessionCandidate) -> str:
    """Return a short note column value for compact output."""
    notes: list[str] = []
    if item.duplicate_of:
        notes.append(f"dup of {item.duplicate_of}")
    if item.reasons:
        notes.append(item.reasons[0])
    return "; ".join(notes) if notes else "-"


def apply_action(
    root_dir: Path,
    candidates: Iterable[SessionCandidate],
    action: str,
) -> list[OperationResult]:
    """Apply one category action to the provided candidates."""
    if action not in VALID_ACTIONS:
        raise ValueError(f"Unsupported action: {action}")

    root_dir = root_dir.expanduser().resolve()
    if action == "leave":
        return [
            OperationResult(
                category=candidate.category,
                action=action,
                source=candidate.session_dir,
                destination=None,
                status="left",
                detail="Left unchanged.",
            )
            for candidate in candidates
        ]

    results: list[OperationResult] = []
    trash_dir = root_dir / ".trash"
    trash_dir.mkdir(parents=True, exist_ok=True)

    for candidate in candidates:
        source = candidate.session_dir.resolve()
        _ensure_within_root(root_dir, source)
        if action == "trash":
            if source == trash_dir or trash_dir in source.parents:
                results.append(
                    OperationResult(
                        category=candidate.category,
                        action=action,
                        source=source,
                        destination=source,
                        status="skipped",
                        detail="Session is already in .trash.",
                    )
                )
                continue
            destination = trash_dir / source.name
            if destination.exists():
                destination = trash_dir / f"{source.name}_{int(time.time())}"
            shutil.move(str(source), str(destination))
            results.append(
                OperationResult(
                    category=candidate.category,
                    action=action,
                    source=source,
                    destination=destination,
                    status="trashed",
                    detail="Moved session directory into .trash.",
                )
            )
            continue

        shutil.rmtree(source)
        results.append(
            OperationResult(
                category=candidate.category,
                action=action,
                source=source,
                destination=None,
                status="deleted",
                detail="Deleted session directory permanently.",
            )
        )

    return results


def _load_payload(
    session_file: Path,
) -> tuple[Optional[dict[str, Any]], Optional[str]]:
    try:
        payload = json.loads(session_file.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        return None, f"Unreadable JSON: {exc}"

    if not isinstance(payload, dict):
        return None, "Session payload is not a JSON object."
    state = payload.get("state")
    if not isinstance(state, dict):
        return None, "Session payload is missing a valid state object."
    history = payload.get("conversation_history", [])
    if history is None:
        history = []
    if not isinstance(history, list):
        return None, (
            "Session payload has a non-list conversation_history field."
        )
    payload["conversation_history"] = history
    return payload, None


def _find_test_markers(dir_name: str, payload: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    state = payload.get("state", {})
    position_name = str(state.get("position_name") or "")
    job_description = str(state.get("job_description") or "")
    job_analysis = state.get("job_analysis") or {}
    job_title = str(
        job_analysis.get("job_title") or job_analysis.get("title") or ""
    )
    company = str(job_analysis.get("company") or "")

    haystacks = [dir_name, position_name, job_description, job_title, company]
    if dir_name.startswith("AcmeCorp_Role_"):
        reasons.append(
            "Directory name matches the AcmeCorp test-session pattern."
        )

    for marker in _TEST_MARKERS:
        if any(marker in haystack for haystack in haystacks):
            reasons.append(f"Matched known test marker: {marker}")

    if "test" in dir_name.lower() and position_name.lower().startswith("test"):
        reasons.append(
            "Directory and position name both indicate a test session."
        )

    deduped: list[str] = []
    for reason in reasons:
        if reason not in deduped:
            deduped.append(reason)
    return deduped


def _is_empty_session(
    state: dict[str, Any],
    conversation_history: list[Any],
) -> bool:
    if conversation_history:
        return False
    for key in _MEANINGFUL_STATE_KEYS:
        if _has_meaningful_value(state.get(key)):
            return False
    return True


def _has_meaningful_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, set, dict)):
        return bool(value)
    return True


def _duplicate_key(payload: dict[str, Any]) -> str:
    normalized = json.loads(json.dumps(payload))
    normalized.pop("timestamp", None)
    normalized.pop("session_id", None)
    return json.dumps(normalized, sort_keys=True, separators=(",", ":"))


def _sort_key(candidate: SessionCandidate) -> tuple[float, str]:
    timestamp = _parse_timestamp(candidate.timestamp)
    return (-timestamp, candidate.relative_path)


def _parse_timestamp(timestamp: Optional[str]) -> float:
    if not timestamp:
        return 0.0
    try:
        return datetime.fromisoformat(timestamp).timestamp()
    except ValueError:
        return 0.0


def _is_trashed(root_dir: Path, session_file: Path) -> bool:
    trash_dir = root_dir / ".trash"
    resolved_file = session_file.resolve()
    return trash_dir.resolve() in resolved_file.parents


def _ensure_within_root(root_dir: Path, target: Path) -> None:
    resolved_root = root_dir.resolve()
    resolved_target = target.resolve()
    if resolved_target == resolved_root:
        raise ValueError("Refusing to operate on the session root itself.")
    if not resolved_target.is_relative_to(resolved_root):
        raise ValueError(
            f"Path is outside the session root: {resolved_target}"
        )
