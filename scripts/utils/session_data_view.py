# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Read-only view that overlays session state onto master CV data."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Mapping, Optional


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


def _coerce_dict_mapping(raw: Any) -> Dict[str, Dict[str, Any]]:
    """Return a shallow dict-of-dicts keyed by stable string identifiers."""
    if not isinstance(raw, dict):
        return {}

    cleaned: Dict[str, Dict[str, Any]] = {}
    for key, value in raw.items():
        if not isinstance(key, str):
            continue
        key = key.strip()
        if not key or not isinstance(value, dict):
            continue
        cleaned[key] = dict(value)
    return cleaned


def _coerce_string_list(raw: Any) -> List[str]:
    """Return a stable list of unique non-empty strings preserving order."""
    if raw is None:
        return []
    if isinstance(raw, str):
        raw = [raw]
    if not isinstance(raw, (list, tuple, set)):
        return []

    cleaned: List[str] = []
    seen = set()
    for value in raw:
        if not isinstance(value, str):
            continue
        item = value.strip()
        if not item or item in seen:
            continue
        cleaned.append(item)
        seen.add(item)
    return cleaned


def _coerce_skill_group_overrides(raw: Any) -> Dict[str, Optional[str]]:
    """Return a stable mapping of skill name to optional session-only group."""
    if not isinstance(raw, dict):
        return {}

    cleaned: Dict[str, Optional[str]] = {}
    for key, value in raw.items():
        if not isinstance(key, str):
            continue
        skill_name = key.strip()
        if not skill_name:
            continue
        if value is None:
            cleaned[skill_name] = None
            continue
        if not isinstance(value, str):
            continue
        group_name = value.strip()
        cleaned[skill_name] = group_name or None
    return cleaned


def _flatten_skills(raw: Any) -> List[Any]:
    """Return a flat skill list while preserving dict payloads when present."""
    if not raw:
        return []
    if isinstance(raw, list):
        return list(raw)
    if not isinstance(raw, dict):
        return []

    flattened: List[Any] = []
    for category_data in raw.values():
        if isinstance(category_data, dict) and isinstance(category_data.get("skills"), list):
            flattened.extend(category_data.get("skills") or [])
        elif isinstance(category_data, list):
            flattened.extend(category_data)
    return flattened


def _skill_name(item: Any) -> str:
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, dict):
        return str(item.get("name") or "").strip()
    return ""


def _skill_experiences(item: Any) -> List[str]:
    if not isinstance(item, dict):
        return []
    return _coerce_string_list(item.get("experiences"))


def _skill_group(item: Any) -> Optional[str]:
    if not isinstance(item, dict):
        return None
    raw_group = item.get("group")
    if raw_group is None:
        return None
    group = str(raw_group).strip()
    return group or None


def _skill_payload(name: str, experiences: List[str], group: Optional[str]) -> Any:
    if experiences or group:
        payload: Dict[str, Any] = {"name": name}
        if experiences:
            payload["experiences"] = experiences
        if group:
            payload["group"] = group
        return payload
    return name


@dataclass(frozen=True)
class SessionDataView:
    """Resolve effective CV data from master data plus session overlays."""

    master_data: Mapping[str, Any]
    session_state: Optional[Mapping[str, Any]] = None
    customizations: Optional[Mapping[str, Any]] = None

    def _achievement_overrides(self) -> Dict[str, Dict[str, Any]]:
        merged = _coerce_dict_mapping((self.session_state or {}).get("achievement_overrides"))
        merged.update(
            _coerce_dict_mapping((self.customizations or {}).get("achievement_overrides"))
        )
        return merged

    def _removed_achievement_ids(self) -> List[str]:
        removed = _coerce_string_list((self.session_state or {}).get("removed_achievement_ids"))
        for ach_id in _coerce_string_list((self.customizations or {}).get("removed_achievement_ids")):
            if ach_id not in removed:
                removed.append(ach_id)
        return removed

    def _skill_group_overrides(self) -> Dict[str, Optional[str]]:
        merged = _coerce_skill_group_overrides((self.session_state or {}).get("skill_group_overrides"))
        merged.update(
            _coerce_skill_group_overrides((self.customizations or {}).get("skill_group_overrides"))
        )
        return merged

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

    def selected_achievements(self) -> List[Dict[str, Any]]:
        """Return master achievements overlaid with session-only edits/deletions."""
        achievements: List[Dict[str, Any]] = []
        positions: Dict[str, int] = {}

        for item in self.master_data.get("selected_achievements", []) or []:
            if isinstance(item, dict):
                normalized = dict(item)
            else:
                normalized = {"id": str(item or "").strip(), "title": str(item or "").strip()}

            ach_id = str(normalized.get("id") or "").strip()
            if not ach_id:
                continue
            positions[ach_id] = len(achievements)
            achievements.append(normalized)

        for ach_id, override in self._achievement_overrides().items():
            if ach_id in positions:
                achievements[positions[ach_id]].update(override)
            else:
                normalized = {"id": ach_id}
                normalized.update(override)
                positions[ach_id] = len(achievements)
                achievements.append(normalized)

        removed_ids = set(self._removed_achievement_ids())
        return [ach for ach in achievements if str(ach.get("id") or "").strip() not in removed_ids]

    def normalized_skills(self) -> List[Any]:
        """Return flat skills with session-only group overrides applied."""
        flattened = _flatten_skills(self.master_data.get("skills"))
        overrides = self._skill_group_overrides()
        normalized: List[Any] = []

        for item in flattened:
            name = _skill_name(item)
            if not name:
                continue
            experiences = _skill_experiences(item)
            group = overrides[name] if name in overrides else _skill_group(item)
            normalized.append(_skill_payload(name, experiences, group))

        return normalized

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

    def materialize_customizations(self) -> Dict[str, Any]:
        """Return a customization dict with session overlays resolved."""
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

        achievement_overrides = self._achievement_overrides()
        if achievement_overrides and not updated.get("achievement_overrides"):
            updated["achievement_overrides"] = achievement_overrides

        removed_ids = self._removed_achievement_ids()
        if removed_ids and not updated.get("removed_achievement_ids"):
            updated["removed_achievement_ids"] = removed_ids

        skill_group_overrides = self._skill_group_overrides()
        if skill_group_overrides and not updated.get("skill_group_overrides"):
            updated["skill_group_overrides"] = skill_group_overrides

        return updated

    def materialize_summary_selection(self) -> Dict[str, Any]:
        """Backward-compatible wrapper for summary/session customization materialization."""
        return self.materialize_customizations()