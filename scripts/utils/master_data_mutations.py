# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Apply a single ``MasterDataChange`` proposal to an in-memory master data dict.

Used by the AI-update confirm-write path (GAP-01, ``scripts/routes/master_data_routes.py``).

Note on scope: ``_harvest_add_skill``/``_harvest_add_summary_variant`` remain
defined in ``scripts.routes.generation_routes`` rather than being relocated
here. They sit inside a ~12-function skill normalize/merge/render cluster
shared with harvest-candidate generation (not just harvest-apply); moving
that whole cluster is a legitimate follow-up refactor in its own right, not
something to bundle into this feature change. Importing the two entry points
we actually need keeps this module correctly layered (routes depend on
utils, not the reverse) without that larger, separately-reviewable refactor.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from routes.generation_routes import _harvest_add_skill, _harvest_add_summary_variant
from utils.session_data_view import _skill_name

# Sections a MasterDataChange may target.
ALLOWED_SECTIONS = frozenset({
    'personal_info', 'experience', 'skills', 'education', 'awards',
    'certifications', 'selected_achievements', 'professional_summaries',
})

# Ops supported in v1. `delete` is intentionally excluded — deletions go
# through the existing structured editors, not the AI-update path.
ALLOWED_OPS = frozenset({'add', 'update'})


def _experience_list(master: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Return the master's experience list, preferring the singular key."""
    existing = master.get('experience')
    if isinstance(existing, list):
        return existing
    existing = master.get('experiences')
    if isinstance(existing, list):
        return existing
    master['experience'] = []
    return master['experience']


def _find_experience(master: Dict[str, Any], parent_id: str) -> Optional[Dict[str, Any]]:
    for exp in _experience_list(master):
        if isinstance(exp, dict) and str(exp.get('id', '')) == str(parent_id):
            return exp
    return None


def _set_dotted(target: Dict[str, Any], dotted_field: str, value: Any) -> None:
    """Set ``target[a][b]... = value`` for a dotted field path, creating dicts as needed."""
    parts = dotted_field.split('.')
    node = target
    for part in parts[:-1]:
        nxt = node.get(part)
        if not isinstance(nxt, dict):
            nxt = {}
            node[part] = nxt
        node = nxt
    node[parts[-1]] = value


def _find_stored_skill(master: Dict[str, Any], name: str) -> Optional[Dict[str, Any]]:
    """Return the actual stored skill entry matching `name`, if it's a dict.

    `_harvest_add_skill` normalizes its input into a *new* dict before
    appending/merging — the caller's original `proposed` dict is never the
    object actually stored, so provenance must be attached by looking the
    real entry back up post-write, not by mutating the input.
    """
    target = name.strip().casefold()
    if not target:
        return None
    skills = master.get('skills')
    if isinstance(skills, list):
        for s in skills:
            if isinstance(s, dict) and _skill_name(s).casefold() == target:
                return s
    elif isinstance(skills, dict):
        for cat_val in skills.values():
            items = cat_val.get('skills', []) if isinstance(cat_val, dict) else (cat_val if isinstance(cat_val, list) else [])
            for s in items:
                if isinstance(s, dict) and _skill_name(s).casefold() == target:
                    return s
    return None


def _skill_already_present(master: Dict[str, Any], skill_value: Any) -> bool:
    """True if a skill with the same (case-insensitive) name already exists.

    Mirrors the name-comparison `_harvest_add_skill` uses internally, kept
    local here rather than imported to avoid pulling in more of the
    skill-normalize/merge cluster than this existence check needs.
    """
    target = _skill_name(skill_value).casefold()
    if not target:
        return False
    skills = master.get('skills')
    if isinstance(skills, list):
        return any(_skill_name(s).casefold() == target for s in skills)
    if isinstance(skills, dict):
        for cat_val in skills.values():
            items = cat_val.get('skills', []) if isinstance(cat_val, dict) else (cat_val if isinstance(cat_val, list) else [])
            if any(_skill_name(s).casefold() == target for s in items):
                return True
    return False


def _attach_provenance(entry: Any, provenance: Optional[Dict[str, Any]]) -> None:
    """Attach an additive `_ai_provenance` object to a written structured entry.

    Only applies to dict entries (a plain-string skill/achievement entry has
    nowhere to attach a sibling marker); silently a no-op otherwise, which is
    an accepted, documented tradeoff (see plan Design section).
    """
    if not provenance or not isinstance(entry, dict):
        return
    stamped = dict(provenance)
    stamped.setdefault('written_at', datetime.now(timezone.utc).isoformat())
    entry['_ai_provenance'] = stamped


def _apply_master_data_change(
    master: Dict[str, Any],
    change: Dict[str, Any],
    *,
    provenance: Optional[Dict[str, Any]] = None,
) -> bool:
    """Apply one MasterDataChange to `master` in place.

    Args:
        master: in-memory master data dict, mutated in place.
        change: a MasterDataChange dict — see the GAP-01 plan's Design section
            for the full shape (`section`, `op`, `parent_id`, `field`, `proposed`, ...).
        provenance: if given and the op is `add`, attached as `_ai_provenance`
            on the newly-written structured entry (dict entries only).

    Returns:
        True if the change was applied, False if it could not be (e.g. an
        unresolvable `parent_id`, an unsupported section/op, or a malformed
        `proposed` value). Never raises for a bad `change` payload — callers
        (the confirm-update route, and the propose-time dry-run validator)
        both rely on a boolean result rather than exception handling.
    """
    try:
        section = str(change.get('section') or '')
        op = str(change.get('op') or '')
        if section not in ALLOWED_SECTIONS or op not in ALLOWED_OPS:
            return False

        parent_id = change.get('parent_id')
        field = change.get('field')
        proposed = change.get('proposed')

        if section == 'experience':
            if op == 'add' and parent_id:
                exp = _find_experience(master, parent_id)
                if exp is None:
                    return False
                achievements = exp.get('achievements')
                if not isinstance(achievements, list):
                    achievements = exp.get('bullets')
                if not isinstance(achievements, list):
                    achievements = []
                    exp['achievements'] = achievements
                if not isinstance(proposed, (dict, str)):
                    return False
                if isinstance(proposed, dict):
                    proposed = dict(proposed)
                    proposed.setdefault('id', f"ach_{uuid.uuid4().hex[:8]}")
                achievements.append(proposed)
                _attach_provenance(proposed, provenance)
                return True

            if op == 'add' and not parent_id:
                if not isinstance(proposed, dict):
                    return False
                new_exp = dict(proposed)
                new_exp.setdefault('id', f"exp_{uuid.uuid4().hex[:8]}")
                existing_ids = {
                    str(e.get('id', '')) for e in _experience_list(master) if isinstance(e, dict)
                }
                if str(new_exp['id']) in existing_ids:
                    new_exp['id'] = f"exp_{uuid.uuid4().hex[:8]}"
                _experience_list(master).append(new_exp)
                _attach_provenance(new_exp, provenance)
                return True

            if op == 'update' and parent_id and field:
                exp = _find_experience(master, parent_id)
                if exp is None:
                    return False
                exp[str(field)] = proposed
                return True

            return False

        if section == 'skills':
            if op != 'add':
                return False
            skill_value = proposed if isinstance(proposed, (dict, str)) else None
            if skill_value is None:
                return False
            already_present = _skill_already_present(master, skill_value)
            applied = _harvest_add_skill(master, skill_value)
            if applied:
                # `_harvest_add_skill` normalizes its input into a *new* dict
                # before storing it — attach provenance to the actual stored
                # entry (found by name), not the (discarded) input dict.
                stored = _find_stored_skill(master, _skill_name(skill_value))
                _attach_provenance(stored, provenance)
            # `_harvest_add_skill` returns False both for "already present, no-op
            # merge" and for malformed input — but malformed input was already
            # ruled out above (skill_value is a valid dict/str), so a False here
            # with a pre-existing match means "nothing to do," not "couldn't
            # apply." Treat that as success so confirm-time staleness handling
            # doesn't misreport an idempotent no-op as "target no longer exists."
            return applied or already_present

        if section in ('education', 'awards', 'certifications'):
            if op != 'add' or not isinstance(proposed, dict):
                return False
            entries = master.get(section)
            if not isinstance(entries, list):
                entries = []
                master[section] = entries
            new_entry = dict(proposed)
            entries.append(new_entry)
            _attach_provenance(new_entry, provenance)
            return True

        if section == 'selected_achievements':
            if op != 'add' or not isinstance(proposed, dict):
                return False
            entries = master.get('selected_achievements')
            if not isinstance(entries, list):
                entries = []
                master['selected_achievements'] = entries
            new_entry = dict(proposed)
            entries.append(new_entry)
            _attach_provenance(new_entry, provenance)
            return True

        if section == 'professional_summaries':
            if op != 'add' or not isinstance(proposed, str) or not proposed.strip():
                return False
            variants = master.get('professional_summaries')
            already_present = (
                proposed in variants.values() if isinstance(variants, dict)
                else proposed in variants if isinstance(variants, list)
                else False
            )
            # _harvest_add_summary_variant preserves the existing dict-vs-list
            # format (GAP-94) — no dict-entry to attach provenance to here,
            # since a summary variant's value is a plain string either way.
            # As with skills above: False from an exact-duplicate variant means
            # "already there," not "couldn't apply" — treat as success.
            return _harvest_add_summary_variant(master, proposed) or already_present

        if section == 'personal_info':
            if op != 'update' or not field:
                return False
            pi = master.get('personal_info')
            if not isinstance(pi, dict):
                pi = {}
                master['personal_info'] = pi
            _set_dotted(pi, str(field), proposed)
            return True

        return False
    except Exception:
        return False
