# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Prompt-injection safety helpers backed by the llm-sanitizer library.

Public API
----------
scan_text_for_injection(text, min_risk)   → bool
sanitize_instruction_text(text)           → (str, list[dict])
scan_for_safety_alert(text, sensitivity)  → dict | None
"""

from __future__ import annotations

import logging
import re
from typing import Any


from llm_sanitizer.models import RiskLevel, ScanResult
from llm_sanitizer.redactor import redact
from llm_sanitizer.scanner import Scanner

logger = logging.getLogger(__name__)

_scanner: Scanner | None = None

# Supplementary injection phrases for plain-text DOM fragment checks.
#
# The llm-sanitizer library's rules are optimised for *structured* content
# (full HTML, raw source files with surrounding syntax).  When cv-builder
# extracts text from individual comment nodes or hidden elements, the
# surrounding HTML markers are absent, so structural rules such as
# ``comment_directive`` and ``system_prompt`` do not fire.  This list fills
# that gap for the specific substrings cv-builder cares about.
_INJECTION_SUBSTRINGS: tuple[str, ...] = (
    'system prompt',
    'developer prompt',
    'developer instruction',
    'assistant instruction',
    'agent instruction',
    'llm instruction',
    'copilot instruction',
    'you are chatgpt',
    'you are github copilot',
    'ignore previous instructions',
)

# Pre-compiled regex for use in sanitize_instruction_text (word-boundary aware)
_INSTRUCTION_PATTERNS = tuple(
    re.compile(
        rf'(?i)(?:^|\b){re.escape(p)}(?:\b|$)(?:\s*(?:and|then)\s*)?',
    )
    for p in _INJECTION_SUBSTRINGS
)


def _get_scanner() -> Scanner:
    """Return the module-level Scanner singleton, creating it on first call."""
    global _scanner
    if _scanner is None:
        _scanner = Scanner()
    return _scanner


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def scan_text_for_injection(
    text: str,
    min_risk: RiskLevel = RiskLevel.high,
) -> bool:
    """Return True if *text* contains injection indicators at or above *min_risk*.

    Detection is a union of two passes:

    1. **Substring pass** — checks for cv-builder-specific injection phrases.
       Fast; catches plain-text fragments extracted from DOM comment nodes and
       hidden elements where surrounding HTML syntax is absent.
    2. **Rule pass** — runs the full llm-sanitizer rule set (catches zero-width
       characters, base64 payloads, homoglyphs, data-exfil patterns, etc.).

    Scans at ``"high"`` sensitivity so all risk levels are evaluated.
    """
    if not text:
        return False
    lowered = text.lower()
    if any(pattern in lowered for pattern in _INJECTION_SUBSTRINGS):
        return True
    result: ScanResult = _get_scanner().scan(text, sensitivity="high")
    return any(f.risk >= min_risk for f in result.findings)


def sanitize_instruction_text(text: str) -> tuple[str, list[dict[str, Any]]]:
    """Strip injection content from *text* and return ``(cleaned_text, findings)``.

    Detection uses both llm-sanitizer rules and the supplementary substring
    list.  The returned findings list uses the legacy cv-builder format: each
    entry is a dict with keys ``issue``, ``detail``, and optionally ``fragment``.
    """
    if not text:
        return text, []

    sanitized = text
    findings: list[dict[str, Any]] = []

    # Pass 1: llm-sanitizer rule scan + redact
    result: ScanResult = _get_scanner().scan(text, sensitivity="high")
    if result.findings:
        sanitized = redact(sanitized, result, mode="strip")
        findings.extend(
            {
                "issue": "unsafe_instruction_text",
                "detail": f.explanation,
                "fragment": f.matched[:500],
            }
            for f in result.findings
        )

    # Pass 2: supplementary substring stripping
    for pattern in _INSTRUCTION_PATTERNS:
        updated, count = pattern.subn(' ', sanitized)
        if count:
            lowered_match = pattern.pattern  # for display
            findings.append({
                "issue": "unsafe_instruction_text",
                "detail": f"Removed prompt-like directive matching: {lowered_match}",
                "fragment": sanitized[:200],
            })
            sanitized = updated

    return sanitized, findings


def scan_for_safety_alert(
    text: str,
    sensitivity: str = "medium",
) -> dict[str, Any] | None:
    """Scan *text* for injection indicators and return an alert dict, or *None*.

    Returns *None* when no findings meet the sensitivity threshold, so callers
    can use the ``if alert:`` idiom.  Intended for job-description ingestion
    paths where content is logged and surfaced to the caller but **not blocked**.

    Returns a dict with keys ``flagged``, ``max_risk``, and ``findings`` when
    indicators are detected.
    """
    if not text:
        return None
    result: ScanResult = _get_scanner().scan(text, sensitivity=sensitivity)
    if not result.findings:
        return None
    return {
        "flagged": True,
        "max_risk": result.summary.max_risk.name if result.summary.max_risk else "unknown",
        "findings": [
            {
                "issue": f.rule,
                "detail": f.explanation,
                "fragment": f.matched[:500],
            }
            for f in result.findings
        ],
    }
