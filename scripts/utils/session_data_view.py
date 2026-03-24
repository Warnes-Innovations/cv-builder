# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Read-only view that overlays session state onto master CV data."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Mapping, Optional


def _coerce_summary_variants(raw: Any) -> Dict[str, Any]:
    """Return professional summary variants as a stable dict."""
    if isinstance(raw, dict):
        return dict(raw)
    if isinstance(raw, list):
        return {
            str(index): value
            for index, value in enumerate(raw)
            if isinstance(value, str) and value.strip()
        }
    return {}


@dataclass(frozen=True)
class SessionDataView:
    """Resolve effective CV data from master data plus session overlays."""

    master_data: Mapping[str, Any]
    session_state: Optional[Mapping[str, Any]] = None
    customizations: Optional[Mapping[str, Any]] = None

    def professional_summaries(self) -> Dict[str, Any]:
        """Return master summary variants overlaid with session variants."""
        merged = _coerce_summary_variants(
            self.master_data.get("professional_summaries")
        )

        session_variants = _coerce_summary_variants(
            (self.session_state or {}).get("session_summaries")
        )
        customization_variants = _coerce_summary_variants(
            (self.customizations or {}).get("session_summaries")
        )

        merged.update(session_variants)
        merged.update(customization_variants)
        return merged

    def summary_focus(self, default: str = "default") -> str:
        """Return the effective summary selection key."""
        raw_focus = (self.customizations or {}).get("summary_focus")
        if isinstance(raw_focus, str) and raw_focus.strip():
            return raw_focus.strip()

        raw_override = (self.session_state or {}).get("summary_focus_override")
        if isinstance(raw_override, str) and raw_override.strip():
            return raw_override.strip()

        return default

    def selected_summary(self, default: str = "default") -> str:
        """Return the effective summary text for scoring/rendering."""
        explicit = (self.customizations or {}).get("selected_summary")
        if isinstance(explicit, str) and explicit.strip():
            return explicit.strip()

        variants = self.professional_summaries()
        focus = self.summary_focus(default=default)

        for key in (focus, default):
            value = variants.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        for value in variants.values():
            if isinstance(value, str) and value.strip():
                return value.strip()

        return ""

    def materialize_summary_selection(self) -> Dict[str, Any]:
        """Return a customization dict with summary resolution applied."""
        updated = dict(self.customizations or {})

        focus = self.summary_focus()
        if focus and not updated.get("summary_focus"):
            updated["summary_focus"] = focus

        selected = self.selected_summary()
        if selected and not updated.get("selected_summary"):
            updated["selected_summary"] = selected

        if not updated.get("session_summaries"):
            session_variants = _coerce_summary_variants(
                (self.session_state or {}).get("session_summaries")
            )
            if session_variants:
                updated["session_summaries"] = session_variants

        return updated