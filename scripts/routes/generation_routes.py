"""CV generation, download, finalise, and harvest routes."""
import copy
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from flask import Blueprint, current_app, has_app_context, jsonify, request, send_file

# Live blueprint module registered by `scripts.web_app.create_app()`.

from utils.layout_digest import (
    TEMPLATE_VERSION as LAYOUT_TEMPLATE_VERSION,
    UPDATE_NOTE as LAYOUT_TEMPLATE_UPDATE_NOTE,
    blend_layout_prediction,
    build_layout_digest,
    compare_layout_digests,
)
from utils.layout_estimator_model import predict_layout_pages
from utils.session_data_view import SessionDataView


_CURRENT_MODULE = sys.modules[__name__]
sys.modules.setdefault('routes.generation_routes', _CURRENT_MODULE)
sys.modules.setdefault('scripts.routes.generation_routes', _CURRENT_MODULE)

_PREVIEW_ARTIFACT_REQUEST_RETENTION = 6
_RENDER_SNAPSHOT_DEBOUNCE_SECONDS = 1.5
_RENDER_SNAPSHOT_LOCKS: Dict[str, threading.Lock] = {}
_RENDER_SNAPSHOT_LOCKS_GUARD = threading.Lock()

_LAYOUT_ESTIMATE_OVERRIDE_KEYS = (
    'experience_decisions',
    'skill_decisions',
    'achievement_decisions',
    'publication_decisions',
    'summary_focus_override',
    'selected_summary_key',
    'approved_rewrites',
    'achievement_edits',
    'extra_skills',
    'base_font_size',
)


# ---------------------------------------------------------------------------
# Module-level helpers (harvest)
# ---------------------------------------------------------------------------

def _get_spell_audit_from_state(state: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Return canonical spell audit data with backward-compatible fallback."""
    spell_audit = state.get('spell_audit')
    if spell_audit is not None:
        return spell_audit or []

    legacy_spell = state.get('spell_check') or {}
    if isinstance(legacy_spell, dict):
        return legacy_spell.get('audit') or []

    return []


def _extra_skill_name(skill: Any) -> str:
    if isinstance(skill, dict):
        return str(skill.get('name') or '').strip()
    return str(skill or '').strip()


def _normalize_harvest_string_list(raw: Any) -> List[str]:
    if isinstance(raw, str):
        raw = [item.strip() for item in raw.split(',')]
    if not isinstance(raw, list):
        return []

    normalized: List[str] = []
    seen = set()
    for item in raw:
        label = str(item or '').strip()
        if not label or label in seen:
            continue
        normalized.append(label)
        seen.add(label)
    return normalized


def _normalize_harvest_skill(skill: Any) -> Optional[Dict[str, Any]]:
    name = _extra_skill_name(skill)
    if not name:
        return None

    if not isinstance(skill, dict):
        return {'name': name}

    normalized = dict(skill)
    normalized['name'] = name

    for field in ('category', 'group', 'proficiency', 'parenthetical'):
        if field in normalized:
            value = str(normalized.get(field) or '').strip()
            if value:
                normalized[field] = value
            else:
                normalized.pop(field, None)

    subskills = _normalize_harvest_string_list(
        normalized.get('subskills', normalized.get('sub_skills'))
    )
    if subskills:
        normalized['subskills'] = subskills
    else:
        normalized.pop('subskills', None)
        normalized.pop('sub_skills', None)

    aliases = _normalize_harvest_string_list(normalized.get('aliases'))
    if aliases:
        normalized['aliases'] = aliases
    else:
        normalized.pop('aliases', None)

    years = normalized.get('years')
    if years is None or years == '':
        normalized.pop('years', None)
    else:
        try:
            years_value = int(years)
        except (TypeError, ValueError):
            normalized.pop('years', None)
        else:
            if years_value > 0:
                normalized['years'] = years_value
            else:
                normalized.pop('years', None)

    for field in ('user_created', '_isUserCreated', 'display_name', 'group_names', 'group_display_names'):
        normalized.pop(field, None)

    return normalized


def _internal_server_error(message: str):
    current_app.logger.exception(message)
    return jsonify({'error': message}), 500


def _try_patch_metadata(conv: Any, updates: Dict) -> None:
    """Write *updates* into the session's metadata.json without raising.

    Silently skips when no output_dir is in session state or the file
    does not yet exist.
    """
    try:
        generated = conv.state.get('generated_files') or {}
        output_dir = generated.get('output_dir')
        if not output_dir:
            return
        metadata_path = Path(output_dir) / 'metadata.json'
        if not metadata_path.exists():
            return
        with open(metadata_path, encoding='utf-8') as f:
            metadata = json.load(f)
        metadata.update(updates)
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
    except Exception:
        if has_app_context():
            current_app.logger.warning('_try_patch_metadata failed silently', exc_info=True)


def _git_commit_error(message: str, detail: Optional[str] = None) -> str:
    if detail:
        current_app.logger.error('%s %s', message, detail)
    else:
        current_app.logger.error(message)
    return message


def _git_push_if_remote(git_dir: str) -> Optional[str]:
    """Push the current branch if the repo has any configured remotes.

    Returns None on success (or when there is no remote), or an error
    string if the push fails.  Never raises.
    """
    try:
        remote_check = subprocess.run(
            ['git', '-C', git_dir, 'remote'],
            capture_output=True, text=True,
        )
        if not remote_check.stdout.strip():
            return None  # no remotes configured

        push_result = subprocess.run(
            ['git', '-C', git_dir, 'push'],
            capture_output=True, text=True,
        )
        if push_result.returncode != 0:
            detail = push_result.stderr.strip() or push_result.stdout.strip()
            current_app.logger.error('Git push failed. %s', detail)
            return 'Git push failed. See server logs for details.'
        return None
    except Exception as exc:
        current_app.logger.error('Git push failed. %s', exc)
        return 'Git push failed. See server logs for details.'


def _record_layout_safety_audit(
    state: Dict[str, Any],
    payload: Dict[str, Any],
) -> None:
    """Persist one layout safety audit entry in session state."""
    audit = state.setdefault('layout_safety_audit', [])
    audit.append(payload)


def _build_layout_safety_alert(
    safety: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """Build a small UI-facing safety summary."""
    if not isinstance(safety, dict) or not safety.get('flagged'):
        return None
    findings = safety.get('findings') or []
    issues = []
    for finding in findings[:5]:
        detail = str(finding.get('detail') or '').strip()
        if detail:
            issues.append(detail)
    return {
        'flagged': True,
        'count': len(findings),
        'issues': issues,
        'message': (
            'Safety processing sanitized prompt-like or unsafe '
            'material before applying the layout change.'
        ),
    }


def _harvest_skill_key(skill: Any) -> str:
    name = _extra_skill_name(skill)
    return name.casefold()


def _render_harvest_skill(skill: Any) -> str:
    normalized = _normalize_harvest_skill(skill)
    if not normalized:
        return ''

    name = normalized['name']
    parenthetical = str(normalized.get('parenthetical') or '').strip()
    if parenthetical:
        body = f"{name} ({parenthetical})"
    else:
        qualifiers: List[str] = []
        proficiency = str(normalized.get('proficiency') or '').strip()
        if proficiency:
            qualifiers.append(proficiency[:1].upper() + proficiency[1:])
        qualifiers.extend(normalized.get('subskills') or [])
        if qualifiers:
            body = f"{name} ({', '.join(qualifiers)})"
        elif normalized.get('years'):
            body = f"{name} ({normalized['years']} yrs)"
        else:
            body = name

    category = str(normalized.get('category') or '').strip()
    if category:
        return f"{category}: {body}"
    return body


def _merge_harvest_skill(existing: Any, incoming: Any) -> Optional[Dict[str, Any]]:
    base = _normalize_harvest_skill(existing)
    update = _normalize_harvest_skill(incoming)
    if not base:
        return update
    if not update:
        return base

    merged = dict(base)
    merged['name'] = update['name']

    for field in ('category', 'group', 'proficiency', 'parenthetical', 'years'):
        value = update.get(field)
        if value not in (None, '', []):
            merged[field] = value

    for field in ('subskills', 'aliases'):
        combined: List[str] = []
        seen = set()
        for value in (merged.get(field) or []) + (update.get(field) or []):
            label = str(value or '').strip()
            if not label or label in seen:
                continue
            combined.append(label)
            seen.add(label)
        if combined:
            merged[field] = combined
        else:
            merged.pop(field, None)

    for key, value in update.items():
        if key in merged or key in {'name', 'category', 'group', 'proficiency', 'parenthetical', 'years', 'subskills', 'aliases'}:
            continue
        merged[key] = value

    return merged


def _collect_harvest_skill_candidates(conversation) -> List[Dict[str, Any]]:
    state = conversation.state or {}
    customizations = state.get('customizations') or {}
    materialized = {}

    try:
        materialized = SessionDataView(
            conversation.orchestrator.master_data,
            state,
            customizations,
        ).materialize_generation_customizations()
    except Exception:
        current_app.logger.warning("materialize_generation_customizations failed — using raw customizations", exc_info=True)
        materialized = dict(customizations)

    candidates_by_key: Dict[str, Dict[str, Any]] = {}

    def _add_skill_candidate(raw_skill: Any, candidate_type: str, rationale: str) -> None:
        normalized = _normalize_harvest_skill(raw_skill)
        if not normalized:
            return

        key = _harvest_skill_key(normalized)
        existing = candidates_by_key.get(key)
        merged_skill = _merge_harvest_skill(existing.get('proposed_skill') if existing else None, normalized)
        if not merged_skill:
            return

        if existing is None:
            skill_name = merged_skill['name']
            prefix = 'skill' if candidate_type == 'new_skill' else 'skill_gap'
            label_prefix = 'New skill' if candidate_type == 'new_skill' else 'Confirmed skill'
            candidates_by_key[key] = {
                'id':             f"{prefix}_{skill_name.replace(' ', '_')}",
                'type':           candidate_type,
                'label':          f"{label_prefix} — {skill_name}",
                'original':       '(not in master data)',
                'proposed':       _render_harvest_skill(merged_skill),
                'proposed_skill': merged_skill,
                'rationale':      rationale,
            }
            return

        existing['proposed_skill'] = merged_skill
        existing['proposed'] = _render_harvest_skill(merged_skill)
        if existing['type'] != 'new_skill' and candidate_type == 'new_skill':
            skill_name = merged_skill['name']
            existing['id'] = f"skill_{skill_name.replace(' ', '_')}"
            existing['type'] = 'new_skill'
            existing['label'] = f"New skill — {skill_name}"
            existing['rationale'] = rationale

    extra_skill_matches = state.get('extra_skill_matches') or {}
    # Build experience-id → title lookup for richer harvest rationale
    _exp_list  = conversation.orchestrator.master_data.get('experience') or []
    _exp_title = {str(e.get('id', '')): str(e.get('title', '')) for e in _exp_list if e.get('id')}

    def _skill_evidence_rationale(raw_skill: Any) -> str:
        sk_name = raw_skill if isinstance(raw_skill, str) else (
            raw_skill.get('name', '') if isinstance(raw_skill, dict) else ''
        )
        exp_ids = extra_skill_matches.get(sk_name) or []
        if exp_ids:
            titles = [_exp_title.get(str(eid), eid) for eid in exp_ids[:3]]
            return f'Skill added during skills review — evidenced in: {", ".join(t for t in titles if t)}.'
        return 'Skill was added during the skills review step.'

    for raw_skill in materialized.get('extra_skills') or []:
        _add_skill_candidate(raw_skill, 'new_skill', _skill_evidence_rationale(raw_skill))

    for raw_skill in customizations.get('new_skills_added') or []:
        _add_skill_candidate(raw_skill, 'new_skill', _skill_evidence_rationale(raw_skill))

    post_answers = state.get('post_analysis_answers') or {}
    for key, val in post_answers.items():
        if not isinstance(val, str):
            continue
        if key.startswith('skill_gap_') and val.lower() in ('yes', 'true', '1'):
            _add_skill_candidate(
                key[len('skill_gap_'):],
                'skill_gap_confirmed',
                'You confirmed this skill in response to a clarifying question.',
            )

    return list(candidates_by_key.values())


def _materialize_preview_html(
    conversation,
    state_override: Optional[Dict[str, Any]] = None,
    use_semantic_match: bool = True,
) -> Optional[str]:
    state = state_override or conversation.state
    if not state.get('job_analysis'):
        return None

    customizations = state.get('customizations')
    summary_view = SessionDataView(
        conversation.orchestrator.master_data,
        state,
        customizations,
    )
    materialized = summary_view.materialize_generation_customizations()
    if not materialized:
        return None

    return conversation.orchestrator.render_html_preview(
        job_analysis=state['job_analysis'],
        customizations=materialized,
        approved_rewrites=state.get('approved_rewrites') or [],
        spell_audit=_get_spell_audit_from_state(state),
        use_semantic_match=use_semantic_match,
    )


def _get_render_snapshot_lock(session_key: str) -> threading.Lock:
    with _RENDER_SNAPSHOT_LOCKS_GUARD:
        lock = _RENDER_SNAPSHOT_LOCKS.get(session_key)
        if lock is None:
            lock = threading.Lock()
            _RENDER_SNAPSHOT_LOCKS[session_key] = lock
        return lock


def _collect_render_snapshot_inputs(
    conversation,
    state_override: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    state = state_override or conversation.state
    job_analysis = state.get('job_analysis')
    if not job_analysis:
        return None

    customizations = state.get('customizations')
    summary_view = SessionDataView(
        conversation.orchestrator.master_data,
        state,
        customizations,
    )
    materialized = summary_view.materialize_generation_customizations()
    if not materialized:
        return None

    content_warnings = []
    if not summary_view.selected_summary():
        content_warnings.append({
            'code': 'generic_summary_fallback',
            'severity': 'warning',
            'message': (
                'No professional summary is set in your master profile or customizations. '
                'A generic placeholder will appear in the generated CV — '
                'please add a summary in the Master CV tab before downloading.'
            ),
        })

    raw_edits = state.get('achievement_edits') or {}
    if isinstance(raw_edits, dict):
        master_experiences = (
            conversation.orchestrator.master_data.get('experience') or []
        )
        for str_idx, items in raw_edits.items():
            try:
                exp_idx = int(str_idx)
            except (TypeError, ValueError):
                continue
            if not isinstance(items, list):
                items = [items]
            visible = [
                it for it in items
                if isinstance(it, dict)
                and not it.get('hidden')
                and str(it.get('text') or '').strip()
            ]
            if len(visible) < 2:
                exp = (
                    master_experiences[exp_idx]
                    if 0 <= exp_idx < len(master_experiences)
                    else {}
                )
                role = str(
                    exp.get('title')
                    or exp.get('position')
                    or f'Position {exp_idx + 1}'
                )
                company = str(exp.get('company') or '')
                label = f'"{role}" at {company}' if company else f'"{role}"'
                n = len(visible)
                content_warnings.append({
                    'code': 'sparse_experience_bullets',
                    'severity': 'warning',
                    'message': (
                        f'Experience {label} has {n} selected '
                        f'bullet{"" if n == 1 else "s"}. '
                        'At least 2 impact bullets per role are recommended. '
                        'Add more in the Ach Editor tab.'
                    ),
                })

    return {
        'job_analysis': job_analysis,
        'materialized_customizations': materialized,
        'approved_rewrites': state.get('approved_rewrites') or [],
        'spell_audit': _get_spell_audit_from_state(state),
        'max_skills': state.get('max_skills'),
        'content_warnings': content_warnings,
    }


def _render_snapshot_signature(snapshot_inputs: Dict[str, Any]) -> str:
    payload = {
        'job_analysis': snapshot_inputs['job_analysis'],
        'customizations': snapshot_inputs['materialized_customizations'],
        'approved_rewrites': snapshot_inputs['approved_rewrites'],
        'spell_audit': snapshot_inputs['spell_audit'],
        'max_skills': snapshot_inputs['max_skills'],
    }
    normalized = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def _persist_render_snapshot(
    conversation,
    snapshot_inputs: Dict[str, Any],
    *,
    source: str,
) -> Dict[str, Any]:
    html = conversation.orchestrator.render_html_preview(
        job_analysis=snapshot_inputs['job_analysis'],
        customizations=snapshot_inputs['materialized_customizations'],
        approved_rewrites=snapshot_inputs['approved_rewrites'],
        spell_audit=snapshot_inputs['spell_audit'],
        max_skills=snapshot_inputs['max_skills'],
        use_semantic_match=False,
    )

    content_warnings = snapshot_inputs.get('content_warnings') or []
    signature = _render_snapshot_signature(snapshot_inputs)
    now = datetime.now().isoformat()
    gen = conversation.state.setdefault('generation_state', {})
    gen.update({
        'render_snapshot_html': html,
        'render_snapshot_signature': signature,
        'render_snapshot_generated_at': now,
        'render_snapshot_source': source,
        'render_snapshot_stale': False,
        'render_snapshot_stale_reason': None,
        'render_snapshot_regenerating': False,
        'render_snapshot_content_warnings': content_warnings,
    })
    conversation._save_session()

    return {
        'html': html,
        'signature': signature,
        'generated_at': now,
        'source': source,
        'content_warnings': content_warnings,
    }


def _ensure_render_snapshot(
    conversation,
    *,
    source: str,
    force: bool = False,
    state_override: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    snapshot_inputs = _collect_render_snapshot_inputs(
        conversation,
        state_override=state_override,
    )
    if snapshot_inputs is None:
        return None

    gen = conversation.state.setdefault('generation_state', {})
    expected_signature = _render_snapshot_signature(snapshot_inputs)
    has_cached_snapshot = bool(gen.get('render_snapshot_html'))
    cached_signature = gen.get('render_snapshot_signature')
    is_stale = bool(gen.get('render_snapshot_stale'))

    if (
        not force
        and has_cached_snapshot
        and not is_stale
        and cached_signature == expected_signature
    ):
        return {
            'html': gen.get('render_snapshot_html'),
            'signature': cached_signature,
            'generated_at': gen.get('render_snapshot_generated_at'),
            'source': gen.get('render_snapshot_source') or 'cache',
            'content_warnings': gen.get('render_snapshot_content_warnings') or snapshot_inputs.get('content_warnings') or [],
            'reused': True,
        }

    persisted = _persist_render_snapshot(
        conversation,
        snapshot_inputs,
        source=source,
    )
    persisted['reused'] = False
    return persisted


def _has_layout_estimate_overrides(body: Dict[str, Any]) -> bool:
    for key in _LAYOUT_ESTIMATE_OVERRIDE_KEYS:
        if key not in body:
            continue
        value = body.get(key)
        if value is None:
            continue
        if isinstance(value, (list, dict)) and len(value) == 0:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return True
    return False


def schedule_render_snapshot_refresh(
    conversation,
    *,
    reason: str,
    debounce_seconds: float = _RENDER_SNAPSHOT_DEBOUNCE_SECONDS,
) -> Dict[str, Any]:
    """Mark render snapshot stale and schedule a throttled async refresh."""
    snapshot_inputs = _collect_render_snapshot_inputs(conversation)
    if snapshot_inputs is None:
        return {'scheduled': False, 'reason': 'missing_inputs'}

    gen = conversation.state.setdefault('generation_state', {})
    expected_signature = _render_snapshot_signature(snapshot_inputs)
    if (
        gen.get('render_snapshot_signature') == expected_signature
        and gen.get('render_snapshot_html')
        and not gen.get('render_snapshot_stale')
    ):
        return {'scheduled': False, 'reason': 'up_to_date'}

    now_ts = time.time()
    now_iso = datetime.now().isoformat()
    gen['render_snapshot_stale'] = True
    gen['render_snapshot_stale_reason'] = reason
    last_requested = float(gen.get('render_snapshot_last_requested_ts') or 0.0)
    if now_ts - last_requested < debounce_seconds:
        conversation._save_session()
        return {'scheduled': False, 'reason': 'debounced'}

    session_key = str(getattr(conversation, 'session_id', '') or id(conversation))
    lock = _get_render_snapshot_lock(session_key)
    if not lock.acquire(blocking=False):
        conversation._save_session()
        return {'scheduled': False, 'reason': 'in_progress'}

    gen['render_snapshot_regenerating'] = True
    gen['render_snapshot_last_requested_at'] = now_iso
    gen['render_snapshot_last_requested_ts'] = now_ts
    conversation._save_session()

    def _worker() -> None:
        try:
            _ensure_render_snapshot(
                conversation,
                source=f'async:{reason}',
                force=False,
            )
        except Exception as exc:  # pragma: no cover - best effort logging
            gen_local = conversation.state.setdefault('generation_state', {})
            gen_local['render_snapshot_regenerating'] = False
            if has_app_context():
                current_app.logger.warning(
                    'Render snapshot refresh failed (%s): %s',
                    reason,
                    exc,
                )
            conversation._save_session()
        finally:
            lock.release()

    worker = threading.Thread(
        target=_worker,
        name=f'render-snapshot-{session_key}',
        daemon=True,
    )
    worker.start()
    return {'scheduled': True, 'reason': 'started'}


def _resolve_preview_artifact_dir(conversation) -> Path:
    generated = conversation.state.get('generated_files') or {}
    output_dir_str = generated.get('output_dir')
    if output_dir_str:
        base_dir = Path(output_dir_str)
    else:
        if not conversation.session_dir:
            conversation._save_session()
        if conversation.session_dir:
            base_dir = Path(conversation.session_dir)
        else:
            session_id = getattr(conversation, 'session_id', 'session')
            base_dir = (
                Path(conversation.orchestrator.output_dir)
                / 'preview_artifacts'
                / session_id
            )

    preview_dir = base_dir / 'preview_artifacts'
    preview_dir.mkdir(parents=True, exist_ok=True)
    return preview_dir


def _preview_request_id_from_artifact(path: Path) -> Optional[str]:
    stem = path.stem
    if not stem.startswith('preview_'):
        return None

    suffix = stem[len('preview_'):]
    if path.suffix.lower() == '.pdf' and '_' in suffix:
        suffix = suffix.rsplit('_', 1)[0]

    return suffix or None


def _prune_preview_artifacts(
    preview_dir: Path,
    keep_latest_requests: int = _PREVIEW_ARTIFACT_REQUEST_RETENTION,
) -> None:
    if keep_latest_requests < 1:
        return

    request_files: Dict[str, List[Path]] = {}
    request_mtime: Dict[str, float] = {}

    for artifact in preview_dir.glob('preview_*'):
        if not artifact.is_file() or artifact.suffix.lower() not in {'.html', '.pdf'}:
            continue

        request_id = _preview_request_id_from_artifact(artifact)
        if not request_id:
            continue

        request_files.setdefault(request_id, []).append(artifact)
        mtime = artifact.stat().st_mtime
        request_mtime[request_id] = max(request_mtime.get(request_id, 0.0), mtime)

    if len(request_files) <= keep_latest_requests:
        return

    keep_ids = {
        request_id
        for request_id, _ in sorted(
            request_mtime.items(),
            key=lambda item: item[1],
            reverse=True,
        )[:keep_latest_requests]
    }

    for request_id, paths in request_files.items():
        if request_id in keep_ids:
            continue

        for path in paths:
            try:
                path.unlink(missing_ok=True)
            except OSError as exc:
                if has_app_context():
                    current_app.logger.warning(
                        'Could not remove stale preview artifact %s: %s', path, exc
                    )


def _generate_preview_outputs(
    conversation,
    preview_html: str,
    preview_request_id: str,
) -> Dict[str, Any]:
    preview_dir = _resolve_preview_artifact_dir(conversation)
    outputs = conversation.orchestrator.generate_pdf_variants_from_html(
        confirmed_html=preview_html,
        output_dir=preview_dir,
        filename_base=f'preview_{preview_request_id}',
    )
    _prune_preview_artifacts(preview_dir)
    return outputs


def _read_pdf_page_count(pdf_path: Path) -> Optional[int]:
    try:
        import pypdf
    except Exception:
        return None

    try:
        reader = pypdf.PdfReader(str(pdf_path))
    except Exception:
        return None
    return len(reader.pages)


def _compute_exact_page_count(conversation, preview_html: str) -> Dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix='layout-page-count-') as tmp_dir:
        render_dir = Path(tmp_dir)
        final_paths = conversation.orchestrator.generate_final_from_confirmed_html(
            confirmed_html=preview_html,
            output_dir=render_dir,
            filename_base='layout_exact',
        )
        pdf_path = Path(final_paths['pdf'])
        return {
            'page_count': _read_pdf_page_count(pdf_path),
            'renderer': final_paths.get('renderer'),
            'renderer_detail': final_paths.get('renderer_detail', ''),
        }


def _page_style_for_domain(domain: str, override: str = None) -> tuple:
    """Return (style_key, style_dict) for the given job-analysis domain string.

    If *override* is a recognised style key (e.g. from a per-session user choice),
    it takes precedence over domain-matching.
    """
    from scripts.utils.config import get_config
    cfg = get_config()
    if override and override in cfg.position_styles:
        return override, cfg.position_styles[override]
    return cfg.get_position_style_for_domain(domain)


def _page_warning(page_count: Optional[float], domain: str = '', override: str = None) -> bool:
    """Return True when the page count is outside the position-style target range.

    Thresholds are driven by the matching position_style preset in config.yaml
    (see Config.get_position_style_for_domain).  Academic/research roles have no
    upper limit; industry defaults to 2–3 pages.  Pass *override* to force a
    specific style instead of inferring from the domain.
    """
    if page_count is None:
        return False
    pages = float(page_count)
    _key, style = _page_style_for_domain(domain, override)
    warn_below = style.get('page_warn_below', 2.0)
    warn_above = style.get('page_warn_above', 3.0)
    if pages < warn_below:
        return True
    if warn_above is not None and pages > warn_above:
        return True
    return False


def _persist_layout_baseline(
    conversation,
    preview_html: str,
    *,
    source: str,
) -> Dict[str, Any]:
    digest = build_layout_digest(preview_html)
    exact = _compute_exact_page_count(conversation, preview_html)
    page_count = exact.get('page_count')
    _domain = ((conversation.state.get('job_analysis') or {}).get('domain', ''))
    _override = conversation.state.get('position_style_override')
    _style_key, _style = _page_style_for_domain(_domain, _override)

    gen = conversation.state.setdefault('generation_state', {})
    gen.update({
        'baseline_layout_digest': digest,
        'baseline_exact_page_count': page_count,
        'baseline_updated_at': datetime.now().isoformat(),
        'baseline_source': source,
        'layout_template_version': LAYOUT_TEMPLATE_VERSION,
        'layout_template_update_note': LAYOUT_TEMPLATE_UPDATE_NOTE,
        'page_count_estimate': page_count,
        'page_count_exact': page_count,
        'page_count_confidence': 1.0 if page_count is not None else None,
        'page_count_source': 'exact' if page_count is not None else 'unknown',
        'page_count_needs_exact_recheck': False,
        'page_length_warning': _page_warning(page_count, _domain, _override),
        'position_style': _style_key,
        'page_count_renderer': exact.get('renderer'),
        'page_count_renderer_detail': exact.get('renderer_detail', ''),
    })
    return {
        'digest': digest,
        'page_count': page_count,
        'renderer': exact.get('renderer'),
        'renderer_detail': exact.get('renderer_detail', ''),
    }


def _overlay_layout_estimate_state(
    state: Dict[str, Any],
    body: Dict[str, Any],
) -> Dict[str, Any]:
    overlay = copy.deepcopy(state)

    for key in (
        'experience_decisions',
        'skill_decisions',
        'achievement_decisions',
        'publication_decisions',
        'approved_rewrites',
        'achievement_edits',
        'extra_skills',
    ):
        if key in body and body[key] is not None:
            overlay[key] = body[key]

    if body.get('summary_focus_override') is not None:
        overlay['summary_focus_override'] = body.get('summary_focus_override')

    if body.get('selected_summary_key') is not None:
        overlay['selected_summary_key'] = body.get('selected_summary_key')

    if body.get('base_font_size'):
        overlay['base_font_size'] = body['base_font_size']
        customizations = dict(overlay.get('customizations') or {})
        customizations['base_font_size'] = body['base_font_size']
        overlay['customizations'] = customizations

    return overlay


def _apply_layout_estimate(conversation, body: Dict[str, Any]) -> Dict[str, Any]:
    current_html = None
    if not _has_layout_estimate_overrides(body):
        snapshot = _ensure_render_snapshot(
            conversation,
            source='layout_estimate',
            force=False,
        )
        if snapshot:
            current_html = snapshot.get('html')

    if not current_html:
        overlay_state = _overlay_layout_estimate_state(conversation.state, body)
        current_html = _materialize_preview_html(
            conversation,
            state_override=overlay_state,
            use_semantic_match=False,
        )
    if not current_html:
        raise RuntimeError('Unable to render preview HTML for layout estimate.')

    gen = conversation.state.setdefault('generation_state', {})
    baseline_digest = gen.get('baseline_layout_digest')
    baseline_exact_page_count = gen.get('baseline_exact_page_count')
    if not baseline_digest:
        baseline = _persist_layout_baseline(
            conversation,
            current_html,
            source='layout_estimate_seed',
        )
        baseline_digest = baseline['digest']
        baseline_exact_page_count = baseline['page_count']

    current_digest = build_layout_digest(current_html)
    estimate = compare_layout_digests(
        baseline_digest,
        baseline_exact_page_count,
        current_digest,
    )
    model_prediction = predict_layout_pages(current_digest)
    estimate = blend_layout_prediction(estimate, model_prediction)

    exact_page_count = None
    exact_renderer = None
    exact_renderer_detail = ''
    used_exact_recheck = False
    if estimate['needs_exact_recheck']:
        exact = _compute_exact_page_count(conversation, current_html)
        exact_page_count = exact.get('page_count')
        exact_renderer = exact.get('renderer')
        exact_renderer_detail = exact.get('renderer_detail', '')
        used_exact_recheck = exact_page_count is not None

    page_count_value = exact_page_count
    page_count_source = (
        'exact-recheck'
        if used_exact_recheck
        else estimate.get('source', 'delta-estimate')
    )
    if page_count_value is None:
        page_count_value = round(float(estimate['estimated_pages']), 1)

    _domain = ((conversation.state.get('job_analysis') or {}).get('domain', ''))
    _override = conversation.state.get('position_style_override')
    _style_key, _style = _page_style_for_domain(_domain, _override)
    gen.update({
        'layout_template_version': LAYOUT_TEMPLATE_VERSION,
        'layout_template_update_note': LAYOUT_TEMPLATE_UPDATE_NOTE,
        'page_count_estimate': page_count_value,
        'page_count_exact': exact_page_count,
        'page_count_confidence': estimate['confidence'],
        'page_count_source': page_count_source,
        'page_count_needs_exact_recheck': estimate['needs_exact_recheck'],
        'page_length_warning': _page_warning(page_count_value, _domain, _override),
        'position_style': _style_key,
        'page_count_renderer': exact_renderer,
        'page_count_renderer_detail': exact_renderer_detail,
    })
    conversation._save_session()

    return {
        'ok': True,
        'page_count_estimate': page_count_value,
        'page_count_exact': exact_page_count,
        'page_count_confidence': estimate['confidence'],
        'page_count_source': page_count_source,
        'page_count_needs_exact_recheck': estimate['needs_exact_recheck'],
        'page_length_warning': _page_warning(page_count_value, _domain, _override),
        'position_style': _style_key,
        'position_style_is_override': bool(_override),
        'baseline_exact_page_count': baseline_exact_page_count,
        'layout_template_version': LAYOUT_TEMPLATE_VERSION,
        'layout_template_update_note': LAYOUT_TEMPLATE_UPDATE_NOTE,
        'contributors': estimate['contributors'],
        'used_exact_recheck': used_exact_recheck,
    }


def _collect_harvest_skill_type_candidates(conversation) -> List[Dict[str, Any]]:
    """Return skill_type_update candidates for skills whose hard/soft type was overridden in session.

    Only surfaces a candidate when the session override differs from the value
    already stored in master data (or when master has no skill_type at all).
    """
    state          = conversation.state or {}
    qualifier_ovrs = state.get('skill_qualifier_overrides') or {}
    master         = getattr(conversation.orchestrator, 'master_data', None) or {}

    # Build a lookup of master skill name (lower) → skill dict
    master_skill_lookup: Dict[str, Any] = {}
    raw_skills = master.get('skills', [])
    if isinstance(raw_skills, list):
        for sk in raw_skills:
            if isinstance(sk, str):
                master_skill_lookup[sk.lower()] = {}
            elif isinstance(sk, dict):
                name = (sk.get('name') or '').strip().lower()
                if name:
                    master_skill_lookup[name] = sk
    elif isinstance(raw_skills, dict):
        for cat_val in raw_skills.values():
            for sk in (cat_val if isinstance(cat_val, list) else []):
                if isinstance(sk, str):
                    master_skill_lookup[sk.lower()] = {}
                elif isinstance(sk, dict):
                    name = (sk.get('name') or '').strip().lower()
                    if name:
                        master_skill_lookup[name] = sk

    candidates = []
    for skill_name, overrides in qualifier_ovrs.items():
        session_type = overrides.get('skill_type')
        if session_type not in ('hard', 'soft'):
            continue
        master_sk = master_skill_lookup.get(skill_name.lower()) or {}
        master_type = (master_sk.get('skill_type') or '').lower()
        if master_type == session_type:
            continue  # already matches — nothing to persist
        candidates.append({
            'id':        f"skill_type_{skill_name.replace(' ', '_')}",
            'type':      'skill_type_update',
            'label':     f'Classify "{skill_name}" as {session_type} skill',
            'original':  master_type or '(unset)',
            'proposed':  session_type,
            'skill_name': skill_name,
            'rationale': (
                f'You classified "{skill_name}" as a {session_type} skill during this session. '
                'Persisting this avoids re-classifying on every application.'
            ),
        })
    return candidates


def _harvest_update_skill_type(master: Dict, skill_name: str, skill_type: str) -> bool:
    """Write skill_type to the named skill in master data.  Returns True if changed."""
    def _try_update_list(skill_list: list) -> bool:
        for sk in skill_list:
            if not isinstance(sk, dict):
                continue
            if (sk.get('name') or '').strip().lower() == skill_name.lower():
                if sk.get('skill_type') == skill_type:
                    return False
                sk['skill_type'] = skill_type
                return True
        return False

    raw = master.get('skills', [])
    if isinstance(raw, list):
        return _try_update_list(raw)
    if isinstance(raw, dict):
        for cat_val in raw.values():
            if isinstance(cat_val, list) and _try_update_list(cat_val):
                return True
    return False


def _compile_harvest_candidates(conversation) -> List[Dict[str, Any]]:
    """Return candidate write-back items for the current session."""
    candidates: List[Dict[str, Any]] = []

    approved_rewrites = conversation.state.get('approved_rewrites') or []

    for rw in approved_rewrites:
        if rw.get('section') == 'summary':
            continue
        proposed = rw.get('proposed', '')
        original = rw.get('original', '')
        if not proposed or not original:
            continue
        if proposed.strip() == original.strip():
            continue
        candidates.append({
            'id':        f"rewrite_{rw.get('id', len(candidates))}",
            'type':      'improved_bullet',
            'label':     f"Improved bullet — {rw.get('context', rw.get('id', 'unknown'))}",
            'original':  original,
            'proposed':  proposed,
            'rationale': rw.get('rationale') or 'Approved rewrite improves ATS-keyword coverage or adds a quantified metric.',
        })

    candidates.extend(_collect_harvest_skill_candidates(conversation))
    candidates.extend(_collect_harvest_skill_type_candidates(conversation))

    summary_rewrite = next(
        (rw for rw in approved_rewrites if rw.get('section') == 'summary'), None
    )
    if summary_rewrite and summary_rewrite.get('proposed'):
        cand_id = 'summary_variant'
        if not any(c['id'] == cand_id for c in candidates):
            candidates.append({
                'id':        cand_id,
                'type':      'summary_variant',
                'label':     'Professional summary variant',
                'original':  summary_rewrite.get('original', ''),
                'proposed':  summary_rewrite.get('proposed', ''),
                'rationale': 'Rewritten summary could be stored as a named variant for future reuse.',
            })

    return candidates


def _harvest_apply_bullet(master: Dict, original: str, proposed: str) -> bool:
    """Replace ``original`` bullet text with ``proposed`` in master experience data."""
    experiences = (
        master.get('experience')
        or master.get('experiences')
        or []
    )
    for exp in experiences:
        achievements = exp.get('achievements') or exp.get('bullets') or []
        for i, bullet in enumerate(achievements):
            text = bullet if isinstance(bullet, str) else bullet.get('text', '')
            if text.strip() == original.strip():
                if isinstance(bullet, str):
                    achievements[i] = proposed
                else:
                    bullet['text'] = proposed
                return True
    return False


def _skill_entry_name(skill: Any) -> str:
    if isinstance(skill, dict):
        return str(skill.get('name') or '').strip()
    return str(skill or '').strip()


def _skill_entries_equal(left: Any, right: Any) -> bool:
    return _skill_entry_name(left).casefold() == _skill_entry_name(right).casefold()


def _skill_list_ref(category_value: Any) -> Optional[List[Any]]:
    if isinstance(category_value, list):
        return category_value
    if isinstance(category_value, dict) and isinstance(category_value.get('skills'), list):
        return category_value['skills']
    return None


def _dict_uses_skill_wrappers(skills: Dict[str, Any]) -> bool:
    return any(isinstance(value, dict) and isinstance(value.get('skills'), list) for value in skills.values())


def _choose_skill_category(skills: Dict[str, Any], skill: Dict[str, Any]) -> str:
    preferred = str(skill.get('category') or '').strip()
    if preferred:
        return preferred

    for key in skills:
        if str(key).strip().lower() in ('other', 'general', 'additional'):
            return key
    return 'Other'


def _ensure_skill_category(skills: Dict[str, Any], category_name: str) -> List[Any]:
    existing = _skill_list_ref(skills.get(category_name))
    if existing is not None:
        return existing

    if _dict_uses_skill_wrappers(skills):
        skills[category_name] = {
            'category': category_name,
            'skills': [],
        }
        return skills[category_name]['skills']

    skills[category_name] = []
    return skills[category_name]


def _skill_to_master_entry(skill: Dict[str, Any], *, keep_as_string: bool = False) -> Any:
    if keep_as_string and set(skill.keys()) == {'name'}:
        return skill['name']
    return dict(skill)


def _merge_master_skill(existing: Any, incoming: Dict[str, Any]) -> Any:
    merged = _merge_harvest_skill(existing, incoming)
    if not merged:
        return existing
    if isinstance(existing, str) and set(merged.keys()) == {'name'}:
        return merged['name']
    return merged


def _harvest_add_skill(master: Dict, skill_name: Any) -> bool:
    """Add or merge a harvested skill into master data."""
    normalized = _normalize_harvest_skill(skill_name)
    if not normalized:
        return False

    skills = master.get('skills')

    if isinstance(skills, list):
        for index, existing in enumerate(skills):
            if not _skill_entries_equal(existing, normalized):
                continue
            merged = _merge_master_skill(existing, normalized)
            if merged == existing:
                return False
            skills[index] = merged
            return True

        skills.append(_skill_to_master_entry(normalized, keep_as_string=True))
        return True

    if isinstance(skills, dict):
        target_category = _choose_skill_category(skills, normalized)

        for cat_key, cat_val in skills.items():
            cat_list = _skill_list_ref(cat_val)
            if cat_list is None:
                continue
            for index, existing in enumerate(cat_list):
                if not _skill_entries_equal(existing, normalized):
                    continue
                merged = _merge_master_skill(existing, normalized)
                desired_category = str(merged.get('category') or cat_key).strip() if isinstance(merged, dict) else cat_key
                if desired_category and desired_category != cat_key:
                    del cat_list[index]
                    target_list = _ensure_skill_category(skills, desired_category)
                    target_list.append(_skill_to_master_entry(merged, keep_as_string=True))
                    return True
                if merged == existing:
                    return False
                cat_list[index] = merged
                return True

        target_list = _ensure_skill_category(skills, target_category)
        target_list.append(_skill_to_master_entry(normalized, keep_as_string=True))
        return True

    master['skills'] = [_skill_to_master_entry(normalized, keep_as_string=True)]
    return True


def _harvest_add_summary_variant(master: Dict, new_summary: str) -> bool:
    """Store ``new_summary`` as a named variant in master data.

    Preserves the existing format: appends to a list if the field is a list;
    adds a new key to the dict if the field is a dict.  This prevents the
    format flip (dict→list) that caused GAP-94 rendering failures.
    """
    variants = master.get('professional_summaries')
    if isinstance(variants, dict):
        if new_summary in variants.values():
            return False
        next_key = f'variant_{len(variants) + 1}'
        while next_key in variants:
            next_key = f'variant_{len(variants) + len(next_key)}'
        variants[next_key] = new_summary
        return True
    if isinstance(variants, list):
        if new_summary not in variants:
            variants.append(new_summary)
            return True
        return False
    master['professional_summaries'] = [new_summary]
    return True


def create_blueprint(deps):
    bp = Blueprint('generation_routes', __name__)

    get_session = deps['get_session']
    validate_owner = deps['validate_owner']
    session_registry = deps['session_registry']
    load_master = deps.get('load_master')
    save_master = deps.get('save_master')

    def _require_harvest_apply_phase(entry):
        """Allow harvest write-back only from the Harvest (refinement) step."""
        raw_phase = (entry.manager.state or {}).get('phase')
        current_phase = str(getattr(raw_phase, 'value', raw_phase) or '').strip()
        if current_phase == 'refinement':
            return None
        return jsonify({
            'error': 'Harvest write-back is only available from the Harvest step.',
            'phase': current_phase or None,
        }), 409

    # ------------------------------------------------------------------
    # Download
    # ------------------------------------------------------------------

    @bp.get("/api/download/<filename>")
    def download_file(filename):
        """Download generated CV files."""
        entry = get_session()
        conversation = entry.manager
        try:
            generated_files = conversation.state.get('generated_files', {})

            file_path = None

            if isinstance(generated_files, dict) and 'files' in generated_files:
                output_dir = Path(generated_files['output_dir'])
                for file_name in generated_files['files']:
                    if file_name == filename:
                        file_path = output_dir / filename
                        break
            else:
                for file_type, file_data in generated_files.items():
                    if isinstance(file_data, dict):
                        check_filename = file_data.get('filename') if hasattr(file_data, 'get') else None
                        if check_filename == filename:
                            file_path = Path(file_data.get('path', file_data))
                            break
                    elif isinstance(file_data, (str, Path)):
                        if Path(file_data).name == filename:
                            file_path = Path(file_data)
                            break

            if not file_path or not file_path.exists():
                return jsonify({"error": "File not found on disk"}), 404

            mime_type = 'application/octet-stream'
            if filename.endswith('.pdf'):
                mime_type = 'application/pdf'
            elif filename.endswith('.docx'):
                mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            elif filename.endswith('.html'):
                mime_type = 'text/html'

            return send_file(
                str(file_path),
                as_attachment=True,
                download_name=filename,
                mimetype=mime_type
            )

        except Exception:
            return _internal_server_error('Failed to download generated file.')

    @bp.get("/api/cv/preview-output/<renderer>")
    def download_preview_output(renderer):
        """Open a renderer-specific preview PDF from the current staged preview."""
        entry = get_session()
        generation_state = entry.manager.state.get('generation_state') or {}
        preview_outputs = generation_state.get('preview_output_paths') or {}
        renderer_key = str(renderer).strip().lower()
        pdf_record = (preview_outputs.get('pdfs') or {}).get(renderer_key) or {}

        if not pdf_record.get('ok'):
            return jsonify({
                'error': f'No preview PDF is available for renderer: {renderer_key}',
            }), 404

        pdf_path = Path(str(pdf_record.get('pdf') or ''))
        if not pdf_path.is_file():
            return jsonify({
                'error': f'Preview PDF not found for renderer: {renderer_key}',
            }), 404

        return send_file(
            str(pdf_path),
            mimetype='application/pdf',
            as_attachment=False,
            download_name=pdf_path.name,
        )

    # ------------------------------------------------------------------
    # Staged generation (GAP-20)
    # ------------------------------------------------------------------

    @bp.get("/api/cv/generation-state")
    def get_generation_state():
        """Return staged generation phase and metadata (no raw HTML)."""
        entry = get_session()
        gen   = entry.manager.state.get("generation_state") or {}
        return jsonify({
            "ok":                        True,
            "phase":                     gen.get("phase", "idle"),
            "preview_available":         bool(gen.get("preview_html")),
            "layout_confirmed":          gen.get("layout_confirmed", False),
            "page_count_estimate":       gen.get("page_count_estimate"),
            "page_count_exact":          gen.get("page_count_exact"),
            "page_count_confidence":     gen.get("page_count_confidence"),
            "page_count_source":         gen.get("page_count_source"),
            "page_count_needs_exact_recheck": gen.get(
                "page_count_needs_exact_recheck",
                False,
            ),
            "page_length_warning":       gen.get("page_length_warning", False),
            "position_style":            gen.get("position_style", "industry"),
            "layout_instructions_count": len(gen.get("layout_instructions", [])),
            "ats_score":                 gen.get("ats_score"),
            "final_generated_at":        gen.get("final_generated_at"),
            "layout_template_version":   gen.get("layout_template_version"),
            "layout_template_update_note": gen.get(
                "layout_template_update_note"
            ),
            "preview_outputs":           gen.get("preview_output_paths"),
            "preview_generated_at":      gen.get("preview_generated_at"),
            "preview_request_id":        gen.get("preview_request_id"),
            "confirmed_at":              gen.get("confirmed_at"),
            "render_snapshot_generated_at": gen.get("render_snapshot_generated_at"),
            "render_snapshot_stale":     bool(gen.get("render_snapshot_stale", False)),
            "render_snapshot_regenerating": bool(gen.get("render_snapshot_regenerating", False)),
            # Optional revision metadata for client-side freshness tracking
            "content_revision": gen.get("content_revision"),
            "last_preview_content_revision": gen.get("last_preview_content_revision"),
            "last_final_content_revision": gen.get("last_final_content_revision"),
        })

    @bp.post("/api/cv/generate-preview")
    def generate_cv_preview():
        """Generate an HTML preview of the CV and store it in generation_state."""
        import uuid as _u
        # duckflow:
        #   id: generation_api_preview_live
        #   kind: api
        #   timestamp: "2026-03-31T23:48:00Z"
        #   status: live
        #   handles:
        #     - "POST /api/cv/generate-preview"
        #   calls:
        #     - "orchestrator:render_html_preview"
        #     - "state:generation_state.baseline_layout_digest"
        #   reads:
        #     - "state:job_analysis"
        #     - "state:customizations"
        #     - "state:approved_rewrites"
        #     - "state:spell_audit"
        #     - "state:generated_files.output_dir"
        #   writes:
        #     - "state:generation_state.preview_html"
        #     - "state:generation_state.preview_request_id"
        #     - "state:generation_state.preview_generated_at"
        #     - "state:generation_state.preview_output_paths"
        #     - "state:generation_state.layout_confirmed"
        #     - "state:generation_state.phase"
        #     - "state:generation_state.baseline_layout_digest"
        #   returns:
        #     - "response:POST /api/cv/generate-preview.html"
        #     - "response:POST /api/cv/generate-preview.preview_outputs"
        #     - "response:POST /api/cv/generate-preview.page_count_exact"
        #   notes: "Builds or reloads the preview HTML from current session-backed content, stores the staged preview artifacts in generation_state, and refreshes the baseline layout digest."
        entry = get_session()
        conv  = entry.manager
        if not conv.state.get("job_analysis"):
            return jsonify({"error": "Run job analysis first."}), 400

        html_str = None

        try:
            snapshot = _ensure_render_snapshot(
                conv,
                source='generate_preview',
                force=False,
            )
            if snapshot:
                html_str = snapshot.get('html')
        except Exception as _exc:
            if has_app_context():
                current_app.logger.warning(
                    'render snapshot generation failed: %s',
                    _exc,
                )

        if not html_str:
            try:
                html_str = _materialize_preview_html(
                    conv,
                    use_semantic_match=False,
                )
            except Exception as _exc:
                if has_app_context():
                    current_app.logger.warning(
                        'render_html_preview fallback failed: %s',
                        _exc,
                    )

        if not html_str:
            generated      = conv.state.get("generated_files") or {}
            output_dir_str = generated.get("output_dir", "")
            if output_dir_str:
                output_dir = Path(output_dir_str)
                if output_dir.is_dir():
                    for p in sorted(output_dir.glob("*.html")):
                        html_str = p.read_text(encoding="utf-8")

        if not html_str:
            return jsonify({"error": "No CV content available — complete customisation first."}), 404

        now     = datetime.now().isoformat()
        prev_id = str(_u.uuid4())
        preview_outputs = _generate_preview_outputs(conv, html_str, prev_id)

        # Optional client-provided revision to help the server track freshness
        body = request.get_json(silent=True) or {}
        client_rev = body.get('content_revision')
        try:
            client_rev_num = int(client_rev) if client_rev is not None else None
        except (TypeError, ValueError):
            client_rev_num = None

        gen = conv.state.setdefault("generation_state", {})
        gen.update({
            "phase":                "layout_review",
            "preview_html":         html_str,
            "preview_request_id":   prev_id,
            "preview_generated_at": now,
            "layout_confirmed":     False,
            "preview_output_paths": preview_outputs,
        })
        if client_rev_num is not None:
            gen["last_preview_content_revision"] = client_rev_num
        if "layout_instructions" not in gen:
            gen["layout_instructions"] = []

        baseline = _persist_layout_baseline(
            conv,
            html_str,
            source='generate_preview',
        )
        conv._save_session()
        return jsonify({
            "ok":                  True,
            "html":                html_str,
            "preview_outputs":     preview_outputs,
            "preview_request_id":  prev_id,
            "page_count_estimate": gen.get("page_count_estimate"),
            "page_count_exact":    baseline.get('page_count'),
            "page_count_source":   gen.get("page_count_source"),
            "page_count_confidence": gen.get("page_count_confidence"),
            "page_length_warning": gen.get("page_length_warning", False),
            "position_style":      gen.get("position_style", "industry"),
            "content_warnings":    gen.get("render_snapshot_content_warnings") or (snapshot.get('content_warnings') if snapshot else []) or [],
        })

    @bp.post("/api/cv/layout-estimate")
    def estimate_cv_layout():
        """Estimate layout impact from current review choices."""
        entry = get_session()
        conv = entry.manager
        body = request.get_json(force=True) or {}

        # duckflow:
        #   id: layout_estimate_live
        #   kind: api
        #   timestamp: "2026-03-31T23:48:00Z"
        #   status: live
        #   handles:
        #     - "POST /api/cv/layout-estimate"
        #   reads:
        #     - "state:experience_decisions"
        #     - "state:skill_decisions"
        #     - "state:generation_state.baseline_layout_digest"
        #   writes:
        #     - "state:generation_state.page_count_estimate"
        #     - "state:generation_state.page_count_confidence"
        #   returns:
        #     - "response:page_count_estimate"
        #     - "response:page_count_confidence"
        #     - "response:page_count_exact"
        #   notes: "Server-side layout estimate renders preview HTML, compares it to the stored digest baseline, and rerenders exactly when confidence is low or near a page boundary."
        try:
            return jsonify(_apply_layout_estimate(conv, body))
        except Exception:
            current_app.logger.exception('layout estimate failed')
            return jsonify({
                'ok': False,
                'error': 'Layout estimate failed.',
            }), 500

    @bp.post("/api/cv/layout-refine")
    def refine_cv_layout():
        """Apply a layout instruction to the stored preview and return updated HTML."""
        import uuid as _u
        # duckflow:
        #   id: generation_api_layout_refine_live
        #   kind: api
        #   timestamp: "2026-03-27T02:07:47Z"
        #   status: live
        #   handles:
        #     - "POST /api/cv/layout-refine"
        #   calls:
        #     - "orchestrator:apply_layout_instruction"
        #     - "state:generation_state.baseline_layout_digest"
        #   reads:
        #     - "request:POST /api/cv/layout-refine.instruction"
        #     - "state:generation_state.preview_html"
        #     - "state:generation_state.layout_instructions"
        #   writes:
        #     - "state:generation_state.preview_html"
        #     - "state:generation_state.preview_request_id"
        #     - "state:generation_state.preview_generated_at"
        #     - "state:generation_state.preview_output_paths"
        #     - "state:generation_state.layout_instructions"
        #     - "state:generation_state.layout_confirmed"
        #     - "state:generation_state.phase"
        #     - "state:generation_state.baseline_layout_digest"
        #     - "state:layout_safety_audit"
        #   returns:
        #     - "response:POST /api/cv/layout-refine.html"
        #     - "response:POST /api/cv/layout-refine.summary"
        #     - "response:POST /api/cv/layout-refine.preview_outputs"
        #     - "response:POST /api/cv/layout-refine.safety_alert"
        #   notes: "Applies a natural-language layout instruction against the staged preview, sanitizes prompt-like material in the baseline HTML, user instruction, and rewritten HTML, persists any safety audit records, and regenerates preview artifacts from the updated HTML."
        entry = get_session()
        conv  = entry.manager
        gen   = conv.state.get("generation_state") or {}

        phase = gen.get("phase", "idle")
        if phase not in ("preview", "layout_review"):
            return jsonify({
                "error": "Call /api/cv/generate-preview first before refining layout."
            }), 400

        body = request.get_json(force=True) or {}
        instruction_text = (body.get("instruction") or "").strip()
        if not instruction_text:
            return jsonify({"error": "Missing instruction text."}), 400

        current_html = gen.get("preview_html", "")
        if not current_html:
            return jsonify({"error": "No preview HTML in session — call generate-preview first."}), 400

        prior_instructions = gen.get("layout_instructions", [])

        result = conv.orchestrator.apply_layout_instruction(
            instruction_text=instruction_text,
            current_html=current_html,
            prior_instructions=prior_instructions,
        )

        if result.get("error"):
            response_payload = {
                "ok":           False,
                "error":        result["error"],
                "question":     result.get("question") or result.get("clarification_question"),
                "details":      result.get("details"),
                "raw_response": result.get("raw_response"),
            }
            safety_alert = _build_layout_safety_alert(result.get('safety') or {})
            if safety_alert:
                response_payload["safety_alert"] = safety_alert
            return jsonify(response_payload)

        updated_html = result["html"]
        now     = datetime.now().isoformat()
        prev_id = str(_u.uuid4())

        instruction_record = {
            "id":           prev_id,
            "text":         instruction_text,
            "submitted_at": now,
            "applied":      True,
            "summary":      result.get("summary", ""),
            "confidence":   result.get("confidence"),
        }

        preview_outputs = _generate_preview_outputs(conv, updated_html, prev_id)

        # Accept optional client-provided revision metadata
        body = request.get_json(silent=True) or {}
        client_rev = body.get('content_revision')
        try:
            client_rev_num = int(client_rev) if client_rev is not None else None
        except (TypeError, ValueError):
            client_rev_num = None

        gen = conv.state.setdefault("generation_state", {})
        gen["preview_html"]        = updated_html
        gen["preview_request_id"]  = prev_id
        gen["preview_generated_at"] = now
        gen["phase"]               = "layout_review"
        gen["layout_confirmed"]    = False
        gen["preview_output_paths"] = preview_outputs
        if client_rev_num is not None:
            gen["last_preview_content_revision"] = client_rev_num
        gen.setdefault("layout_instructions", []).append(instruction_record)

        safety = result.get('safety') or {}
        safety_alert = _build_layout_safety_alert(safety)
        if safety_alert:
            _record_layout_safety_audit(conv.state, {
                'timestamp': now,
                'instruction_id': prev_id,
                'instruction_text': safety.get('instruction_text', {}),
                'current_html': safety.get('current_html', {}),
                'rewritten_html': safety.get('rewritten_html', {}),
                'findings': safety.get('findings', []),
            })

        baseline = _persist_layout_baseline(
            conv,
            updated_html,
            source='layout_refine',
        )
        conv._save_session()

        response_payload = {
            "ok":                 True,
            "html":               updated_html,
            "summary":            result.get("summary", ""),
            "confidence":         result.get("confidence"),
            "preview_outputs":    preview_outputs,
            "preview_request_id": prev_id,
            "page_count_estimate": gen.get("page_count_estimate"),
            "page_count_exact":    baseline.get('page_count'),
            "page_count_source":   gen.get("page_count_source"),
            "page_count_confidence": gen.get("page_count_confidence"),
            "page_length_warning": gen.get("page_length_warning", False),
            "position_style":      gen.get("position_style", "industry"),
        }
        if safety_alert:
            response_payload["safety_alert"] = safety_alert
        return jsonify(response_payload)

    @bp.post("/api/cv/confirm-layout")
    def confirm_cv_layout():
        """Lock current preview; enables /api/cv/generate-final."""
        entry = get_session()
        conv  = entry.manager
        gen   = conv.state.get("generation_state") or {}
        if not gen.get("preview_html"):
            return jsonify({"error": "No preview — call /api/cv/generate-preview first."}), 400
        if gen.get("layout_confirmed"):
            return jsonify({"error": "Layout is already confirmed."}), 400
        body = request.get_json(silent=True) or {}
        client_rev = body.get('content_revision')
        try:
            client_rev_num = int(client_rev) if client_rev is not None else None
        except (TypeError, ValueError):
            client_rev_num = None

        now   = datetime.now().isoformat()
        chash = hashlib.sha256(gen["preview_html"].encode()).hexdigest()[:16]
        gen   = conv.state.setdefault("generation_state", {})
        gen.update({
            "phase": "confirmed", "layout_confirmed": True,
            "confirmed_at": now, "confirmed_preview_hash": chash,
        })
        if client_rev_num is not None:
            gen["last_final_content_revision"] = client_rev_num
        conv._save_session()
        return jsonify({"ok": True, "confirmed": True, "confirmed_at": now, "hash": chash})

    @bp.post("/api/cv/ats-score")
    def compute_cv_ats_score():
        """Return ATS match score for current session state (GAP-21)."""
        from utils.scoring import compute_ats_score as _compute_ats_score
        entry = get_session()
        conv  = entry.manager
        job_analysis   = conv.state.get("job_analysis") or {}
        customizations = dict(
            SessionDataView(
                conv.orchestrator.master_data,
                conv.state,
                conv.state.get("customizations"),
            ).materialize_generation_customizations()
        )
        body  = request.get_json(silent=True) or {}
        basis = body.get("basis", "review_checkpoint")

        skill_decisions = conv.state.get("skill_decisions") or {}
        extra_skills    = conv.state.get("extra_skills") or []
        kept_skills = [k for k, v in skill_decisions.items() if v != "exclude"]
        for skill in extra_skills:
            skill_name = _extra_skill_name(skill)
            if not skill_name or skill_decisions.get(skill_name) == 'exclude':
                continue
            if skill_name not in kept_skills:
                kept_skills.append(skill_name)
        if kept_skills:
            existing = [
                (s.get("name") if isinstance(s, dict) else s)
                for s in customizations.get("approved_skills", [])
            ]
            customizations["approved_skills"] = list(
                customizations.get("approved_skills", [])
            ) + [s for s in kept_skills if s not in existing]

        if not customizations.get("approved_rewrites"):
            state_rewrites = conv.state.get("approved_rewrites") or []
            if state_rewrites:
                customizations["approved_rewrites"] = state_rewrites

        achievement_edits = conv.state.get("achievement_edits") or {}
        if achievement_edits:
            customizations["achievement_edits"] = achievement_edits

        if achievement_edits and not customizations.get("approved_rewrites"):
            bullet_rewrites = []
            for bullets in achievement_edits.values():
                if isinstance(bullets, list):
                    bullet_rewrites.extend(
                        {
                            "rewritten": item.get("text", "") if isinstance(item, dict) else str(item or ""),
                            "section": "experience",
                        }
                        for item in bullets
                        if (
                            isinstance(item, dict)
                            and not item.get("hidden")
                            and isinstance(item.get("text"), str)
                            and item.get("text", "").strip()
                        ) or (
                            isinstance(item, str)
                            and item.strip()
                        )
                    )
            if bullet_rewrites:
                customizations.setdefault("approved_rewrites", [])
                customizations["approved_rewrites"] = (
                    customizations["approved_rewrites"] + bullet_rewrites
                )

        summary_view = SessionDataView(
            conv.orchestrator.master_data,
            conv.state,
            customizations,
        )
        customizations = summary_view.materialize_generation_customizations()
        if customizations.get("selected_summary"):
            # duckflow:
            #   id: summary_api_ats_materialize_live
            #   kind: api
            #   timestamp: "2026-03-27T01:23:28Z"
            #   status: live
            #   handles:
            #     - "POST /api/cv/ats-score"
            #   reads:
            #     - "state:session_summaries.ai_generated"
            #     - "state:summary_focus_override"
            #   writes:
            #     - "customizations:selected_summary"
            #   notes: "Live ATS scoring route materializes the selected summary into generation customizations."
            pass

        score = _compute_ats_score(
            job_analysis, customizations, basis=basis,
            synonym_map=getattr(conv.orchestrator, '_expansion_index', None),
        )
        gen = conv.state.setdefault("generation_state", {})
        gen["ats_score"] = score
        conv._save_session()

        # Persist to metadata.json so the score survives without a finalise call.
        _try_patch_metadata(conv, {"ats_score": score})

        return jsonify({"ok": True, "ats_score": score})

    @bp.post("/api/cv/generate-final")
    def generate_cv_final():
        """Regenerate human-readable HTML+PDF+DOCX from confirmed preview; advance to final_generation."""
        # duckflow:
        #   id: generation_api_final_live
        #   kind: api
        #   timestamp: "2026-05-30T00:00:00Z"
        #   status: live
        #   handles:
        #     - "POST /api/cv/generate-final"
        #   calls:
        #     - "orchestrator:generate_final_from_confirmed_html"
        #     - "orchestrator:build_render_ready_content"
        #     - "orchestrator:_generate_ats_docx"
        #     - "orchestrator:_generate_human_docx"
        #     - "state:generation_state.baseline_layout_digest"
        #   reads:
        #     - "state:generation_state.layout_confirmed"
        #     - "state:generation_state.preview_html"
        #     - "state:generated_files.output_dir"
        #     - "state:job_analysis"
        #     - "state:customizations"
        #   writes:
        #     - "state:generation_state.phase"
        #     - "state:generation_state.final_generated_at"
        #     - "state:generation_state.final_output_paths"
        #     - "state:generated_files.final_html"
        #     - "state:generated_files.final_pdf"
        #     - "state:generated_files.ats_docx"
        #     - "state:generated_files.human_docx"
        #     - "state:generated_files.files"
        #     - "state:phase"
        #     - "state:generation_state.baseline_layout_digest"
        #   returns:
        #     - "response:POST /api/cv/generate-final.outputs"
        #     - "response:POST /api/cv/generate-final.generated_at"
        #     - "response:POST /api/cv/generate-final.page_count_exact"
        #   notes: "Converts the confirmed preview HTML into final human-readable artifacts (HTML+PDF+ATS DOCX+human DOCX) named CV_{company}_{role}_{date}.*; updates generation_state and generated_files; advances main phase to FINAL_GENERATION."
        entry = get_session()
        conv  = entry.manager
        gen   = conv.state.get("generation_state") or {}
        if not gen.get("layout_confirmed"):
            return jsonify({"error": "Confirm layout first via /api/cv/confirm-layout."}), 400

        confirmed_html = gen.get("preview_html")
        if not confirmed_html:
            return jsonify({"error": "No confirmed preview HTML in session."}), 400

        generated = conv.state.get("generated_files") or {}
        if not generated.get("output_dir"):
            return jsonify({"error": "No generated files — complete workflow first."}), 404

        output_dir = Path(generated["output_dir"])

        # Build a meaningful filename (same convention as _generate_pdf) so
        # generate-final never creates anonymous CV_final.* artifacts.
        job_analysis   = conv.state.get('job_analysis') or {}
        company        = job_analysis.get('company', 'Company').replace(' ', '')
        role           = job_analysis.get('title', 'Role').replace(' ', '')[:20]
        _ts            = datetime.now().strftime("%Y-%m-%d")
        filename_base  = f"CV_{company}_{role}_{_ts}"

        try:
            final_paths = conv.orchestrator.generate_final_from_confirmed_html(
                confirmed_html=confirmed_html,
                output_dir=output_dir,
                filename_base=filename_base,
            )
        except Exception:
            return _internal_server_error('Final generation failed.')

        # Also generate ATS DOCX and human DOCX from session content.
        from utils.conversation_manager import Phase as _Phase
        customizations = conv.state.get('customizations') or {}
        ats_file    = None
        human_docx  = None
        try:
            selected_content = conv.orchestrator.build_render_ready_content(
                job_analysis,
                customizations,
                approved_rewrites=conv.state.get('approved_rewrites') or [],
                spell_audit=conv.state.get('spell_audit') or [],
                max_skills=conv.state.get('max_skills'),
                use_semantic_match=False,  # Skip LLM scoring — content already ranked upstream
            )
            selected_content['skills_section_title'] = customizations.get('skills_section_title', 'Skills')
            ats_file = conv.orchestrator._generate_ats_docx(
                selected_content, job_analysis, output_dir,
            )
            human_docx = conv.orchestrator._generate_human_docx(
                selected_content, job_analysis, output_dir,
                skills_heading=conv.orchestrator._resolve_human_skills_title(customizations),
            )
        except Exception:
            logger.exception('ATS DOCX / human DOCX generation failed in generate_cv_final')

        now = datetime.now().isoformat()
        gen = conv.state.setdefault("generation_state", {})
        gen.update({
            "phase": "final_complete",
            "final_generated_at": now,
            "final_output_paths": final_paths,
        })
        final_html_path = Path(final_paths['html'])
        if final_html_path.is_file():
            final_html = final_html_path.read_text(encoding='utf-8')
        else:
            final_html = confirmed_html
        baseline = _persist_layout_baseline(
            conv,
            final_html,
            source='generate_final',
        )
        files_list = [final_paths["html"], final_paths["pdf"]]
        if ats_file:
            files_list.append(str(ats_file))
        if human_docx:
            files_list.append(str(human_docx))
        generated.update({
            "final_html":  final_paths["html"],
            "final_pdf":   final_paths["pdf"],
            "ats_docx":    str(ats_file)   if ats_file   else generated.get("ats_docx"),
            "human_docx":  str(human_docx) if human_docx else generated.get("human_docx"),
            "files":       files_list,
        })

        # Advance main workflow phase to FINAL_GENERATION (step 8).
        conv.state['phase'] = _Phase.FINAL_GENERATION
        conv._save_session()

        outputs = dict(generated)
        return jsonify({
            "ok": True,
            "generated_at": now,
            "outputs": outputs,
            "page_count_exact": baseline.get('page_count'),
            "page_count_estimate": gen.get("page_count_estimate"),
        })

    # ------------------------------------------------------------------
    # Final generation complete (FINAL_GENERATION → REFINEMENT)
    # ------------------------------------------------------------------

    @bp.post("/api/final-generation-complete")
    def final_generation_complete():
        """Advance main phase from FINAL_GENERATION to REFINEMENT (finalise step).

        Called from the download tab when the user clicks 'Proceed to Finalise'.
        """
        # duckflow:
        #   id: generation_api_final_generation_complete_live
        #   kind: api
        #   timestamp: "2026-05-28T00:00:00Z"
        #   status: live
        #   handles:
        #     - "POST /api/final-generation-complete"
        #   calls:
        #     - "manager:complete_final_generation"
        #   writes:
        #     - "state:phase"
        #   returns:
        #     - "response:POST /api/final-generation-complete.phase"
        #   notes: "Advances main workflow phase from FINAL_GENERATION to REFINEMENT."
        entry = get_session()
        conv  = entry.manager
        result = conv.complete_final_generation()
        return jsonify({"ok": True, **result})

    # ------------------------------------------------------------------
    # Finalise
    # ------------------------------------------------------------------

    @bp.get("/api/finalise-meta")
    def finalise_meta():
        """Return saved application_status and notes from the current session's metadata.json."""
        entry = get_session()
        validate_owner(entry)
        conversation = entry.manager
        with entry.lock:
            generated = conversation.state.get('generated_files')
            if not generated or not generated.get('output_dir'):
                return jsonify({'application_status': 'ready', 'notes': ''})
            metadata_path = Path(generated['output_dir']) / 'metadata.json'
            if not metadata_path.exists():
                return jsonify({'application_status': 'ready', 'notes': ''})
            try:
                with open(metadata_path, encoding='utf-8') as f:
                    meta = json.load(f)
                return jsonify({
                    'application_status': meta.get('application_status', 'ready'),
                    'notes': meta.get('notes', ''),
                })
            except Exception:
                return jsonify({'application_status': 'ready', 'notes': ''})

    @bp.post("/api/finalise")
    def finalise_application():
        """Finalise the application: update metadata, upsert response library, git commit."""
        from utils.conversation_manager import Phase
        # duckflow:
        #   id: generation_api_finalise_live
        #   kind: api
        #   timestamp: "2026-03-27T02:07:47Z"
        #   status: live
        #   handles:
        #     - "POST /api/finalise"
        #   reads:
        #     - "request:POST /api/finalise.status"
        #     - "request:POST /api/finalise.notes"
        #     - "state:generated_files.output_dir"
        #     - "state:post_analysis_answers"
        #     - "state:spell_audit"
        #     - "state:layout_instructions"
        #     - "state:generation_state.ats_score"
        #   writes:
        #     - "file:metadata.application_status"
        #     - "file:metadata.notes"
        #     - "file:metadata.finalised_at"
        #     - "file:metadata.clarification_answers"
        #     - "file:metadata.spell_audit"
        #     - "file:metadata.layout_instructions"
        #     - "file:metadata.validation_results"
        #     - "file:metadata.ats_score"
        #     - "file:response_library.json"
        #     - "state:phase"
        #   returns:
        #     - "response:POST /api/finalise.summary"
        #     - "response:POST /api/finalise.commit_hash"
        #     - "response:POST /api/finalise.git_error"
        #   notes: "Finalises the application archive by writing metadata derived from session state, optionally updating the response library, and marking the workflow as refinement."
        entry = get_session()
        validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        with entry.lock:
            generated = conversation.state.get('generated_files')
            if not generated or not generated.get('output_dir'):
                return jsonify({'error': 'No generated CV to finalise. Please generate first.'}), 400

            try:
                body        = request.get_json(silent=True) or {}
                app_status  = body.get('status', 'ready')
                notes       = body.get('notes', '')

                if app_status not in ('draft', 'ready', 'sent', 'queued', 'interview', 'rejected', 'accepted', 'parked'):
                    return jsonify({'error': "status must be one of: draft, ready, sent, queued, interview, rejected, accepted, parked"}), 400

                output_dir   = Path(generated['output_dir'])
                metadata_path = output_dir / 'metadata.json'

                if metadata_path.exists():
                    with open(metadata_path, encoding='utf-8') as f:
                        metadata = json.load(f)
                else:
                    metadata = {}

                metadata['application_status'] = app_status
                metadata['notes']              = notes
                metadata['finalised_at']       = datetime.now().isoformat()
                metadata['clarification_answers'] = conversation.state.get('post_analysis_answers') or {}
                metadata['spell_audit']           = conversation.state.get('spell_audit') or []
                metadata['layout_instructions']   = conversation.state.get('layout_instructions') or []
                metadata['validation_results']    = conversation.state.get('validation_results') or {}
                ats_score = ((conversation.state.get('generation_state') or {}).get('ats_score'))
                if ats_score is not None:
                    metadata['ats_score'] = ats_score

                screening = metadata.get('screening_responses') or []
                if screening:
                    library_path = Path(conversation.orchestrator.master_data_path).parent / 'response_library.json'
                    if library_path.exists():
                        with open(library_path, encoding='utf-8') as f:
                            library = json.load(f)
                    else:
                        library = {}
                    for resp in screening:
                        tag = resp.get('topic_tag') or resp.get('question', '')[:40]
                        if tag:
                            library[tag] = resp
                    library_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(library_path, 'w', encoding='utf-8') as f:
                        json.dump(library, f, indent=2)

                with open(metadata_path, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2)

                company  = (metadata.get('company') or 'Unknown').replace(' ', '_')
                role     = (metadata.get('role') or 'Role').replace(' ', '_')
                date_str = datetime.now().strftime('%Y-%m-%d')
                commit_msg = f"feat: Add {company}_{role}_{date_str} application"

                commit_hash = None
                git_error   = None
                push_error  = None
                try:
                    subprocess.run(
                        ['git', '-C', str(output_dir.parent), 'add', output_dir.name],
                        check=True, capture_output=True
                    )
                    result = subprocess.run(
                        ['git', '-C', str(output_dir.parent), 'commit', '-m', commit_msg],
                        capture_output=True, text=True
                    )
                    if result.returncode == 0:
                        m = re.search(r'\b([0-9a-f]{7,40})\b', result.stdout)
                        commit_hash = m.group(1) if m else None
                        push_error = _git_push_if_remote(str(output_dir.parent))
                    else:
                        git_error = _git_commit_error(
                            'Git commit failed. See server logs for details.',
                            result.stderr.strip() or result.stdout.strip(),
                        )
                except Exception as git_exc:
                    current_app.logger.warning("Git commit raised unexpectedly: %s", git_exc)
                    git_error = _git_commit_error(
                        'Git commit failed. See server logs for details.',
                        str(git_exc),
                    )

                conversation.state['phase'] = Phase.REFINEMENT
                conversation.save_session()
                session_registry.touch(sid)

                job_analysis   = conversation.state.get('job_analysis') or {}
                ats_keywords   = job_analysis.get('ats_keywords') or []
                approved_count = len(conversation.state.get('approved_rewrites') or [])

                session_duration_secs = None
                if hasattr(entry, 'created') and entry.created:
                    session_duration_secs = int((datetime.now() - entry.created).total_seconds())

                summary = {
                    'files':          generated.get('files', []),
                    'output_dir':     str(output_dir),
                    'ats_keywords':   ats_keywords,
                    'ats_score':      ats_score,
                    'approved_rewrites': approved_count,
                    'application_status': app_status,
                    'session_duration_secs': session_duration_secs,
                }

                return jsonify({
                    'ok':          True,
                    'commit_hash': commit_hash,
                    'git_error':   git_error,
                    'push_error':  push_error,
                    'summary':     summary,
                })
            except Exception:
                return _internal_server_error('Failed to save finalisation metadata.')

    # ------------------------------------------------------------------
    # Harvest
    # ------------------------------------------------------------------

    @bp.get("/api/harvest/candidates")
    def harvest_candidates():
        """Compile candidate write-back items from the current session."""
        entry = get_session()
        conversation = entry.manager
        try:
            candidates = _compile_harvest_candidates(conversation)
            return jsonify({'ok': True, 'candidates': candidates})
        except Exception:
            return _internal_server_error('Failed to load harvest candidates.')

    @bp.post("/api/harvest/analyze")
    def harvest_analyze():
        """LLM evaluation of harvest candidates: recommendation, confidence, reasoning."""
        # duckflow:
        #   id: generation_api_harvest_analyze_live
        #   kind: api
        #   timestamp: "2026-05-21T00:00:00Z"
        #   status: live
        #   handles:
        #     - "POST /api/harvest/analyze"
        #   reads:
        #     - "state:harvest_analysis"
        #     - "state:approved_rewrites"
        #     - "state:customizations"
        #     - "state:job_analysis"
        #   writes:
        #     - "state:harvest_analysis"
        #   returns:
        #     - "response:POST /api/harvest/analyze.analyses"
        entry = get_session()
        conversation = entry.manager
        body = request.get_json(silent=True) or {}
        force_refresh = bool(body.get('force_refresh'))

        if not force_refresh:
            cached = conversation.state.get('harvest_analysis')
            if cached:
                return jsonify({'ok': True, 'analyses': cached, 'cached': True})

        try:
            candidates = _compile_harvest_candidates(conversation)
            if not candidates:
                return jsonify({'ok': True, 'analyses': [], 'cached': False})

            job_analysis = conversation.state.get('job_analysis') or {}
            result = conversation.orchestrator.analyze_harvest_candidates(candidates, job_analysis)
            if result.get('error'):
                return jsonify({'ok': False, 'error': result['error'], 'analyses': []}), 200

            analyses = result.get('analyses') or []
            conversation.state['harvest_analysis'] = analyses
            conversation.save_session()

            return jsonify({'ok': True, 'analyses': analyses, 'cached': False})
        except Exception:
            return _internal_server_error('Failed to analyze harvest candidates.')

    @bp.post("/api/harvest/apply")
    def harvest_apply():
        """Write selected harvest candidates back to Master_CV_Data.json and git commit."""
        entry = get_session()
        validate_owner(entry)
        phase_error = _require_harvest_apply_phase(entry)
        if phase_error is not None:
            return phase_error
        conversation = entry.manager
        sid = entry.session_id
        with entry.lock:
            try:
                body         = request.get_json(silent=True) or {}
                selected_ids = body.get('selected_ids') or []

                if not selected_ids:
                    return jsonify({'ok': True, 'written_count': 0, 'diff_summary': [], 'commit_hash': None})

                candidates_by_id = {c['id']: c for c in _compile_harvest_candidates(conversation)}
                selected = [candidates_by_id[s] for s in selected_ids if s in candidates_by_id]
                if not selected:
                    return jsonify({'ok': True, 'written_count': 0, 'diff_summary': [], 'commit_hash': None})

                master_path = Path(conversation.orchestrator.master_data_path)
                if callable(load_master):
                    master, loaded_path = load_master(str(master_path))
                    master_path = loaded_path
                else:
                    with open(master_path, encoding='utf-8') as f:
                        master = json.load(f)

                diff_summary: List[Dict[str, Any]] = []

                for cand in selected:
                    ctype = cand['type']
                    if ctype == 'improved_bullet':
                        applied = _harvest_apply_bullet(master, cand['original'], cand['proposed'])
                        diff_summary.append({
                            'id':      cand['id'],
                            'type':    ctype,
                            'applied': applied,
                            'label':   cand['label'],
                        })
                    elif ctype in ('new_skill', 'skill_gap_confirmed'):
                        skill_name = cand.get('proposed_skill', cand['proposed'])
                        applied    = _harvest_add_skill(master, skill_name)
                        diff_summary.append({
                            'id':      cand['id'],
                            'type':    ctype,
                            'applied': applied,
                            'label':   cand['label'],
                        })
                    elif ctype == 'skill_type_update':
                        applied = _harvest_update_skill_type(
                            master,
                            cand['skill_name'],
                            cand['proposed'],
                        )
                        diff_summary.append({
                            'id':      cand['id'],
                            'type':    ctype,
                            'applied': applied,
                            'label':   cand['label'],
                        })
                    elif ctype == 'summary_variant':
                        applied = _harvest_add_summary_variant(master, cand['proposed'])
                        diff_summary.append({
                            'id':      cand['id'],
                            'type':    ctype,
                            'applied': applied,
                            'label':   cand['label'],
                        })

                # Write a timestamped backup before modifying master (Phase B safety)
                backup_path = None
                try:
                    backup_dir = master_path.parent / 'backups'
                    backup_dir.mkdir(exist_ok=True)
                    backup_ts   = datetime.now().strftime('%Y%m%d_%H%M%S')
                    backup_path = backup_dir / f"Master_CV_Data_{backup_ts}.json"
                    shutil.copy2(master_path, backup_path)
                except Exception as backup_err:
                    current_app.logger.warning("Harvest backup failed: %s", backup_err)
                    backup_path = None

                if callable(save_master):
                    save_master(master, master_path)
                else:
                    with open(master_path, 'w', encoding='utf-8') as f:
                        json.dump(master, f, indent=2)

                conversation.orchestrator.master_data = master
                job_analysis = conversation.state.get('job_analysis') or {}
                company  = (job_analysis.get('company') or 'Unknown').replace(' ', '_')
                role     = (job_analysis.get('title') or 'Role').replace(' ', '_')
                date_str = datetime.now().strftime('%Y-%m-%d')
                commit_msg = f"chore: Update master CV data from {company}_{role}_{date_str} session"

                commit_hash = None
                git_error   = None
                push_error  = None
                try:
                    subprocess.run(
                        ['git', '-C', str(master_path.parent), 'add', master_path.name],
                        check=True, capture_output=True
                    )
                    result = subprocess.run(
                        ['git', '-C', str(master_path.parent), 'commit', '-m', commit_msg],
                        capture_output=True, text=True
                    )
                    if result.returncode == 0:
                        m = re.search(r'\b([0-9a-f]{7,40})\b', result.stdout)
                        commit_hash = m.group(1) if m else None
                        push_error = _git_push_if_remote(str(master_path.parent))
                    else:
                        git_error = _git_commit_error(
                            'Git commit failed. See server logs for details.',
                            result.stderr.strip() or result.stdout.strip(),
                        )
                except Exception as git_exc:
                    current_app.logger.warning("Git commit raised unexpectedly: %s", git_exc)
                    git_error = _git_commit_error(
                        'Git commit failed. See server logs for details.',
                        str(git_exc),
                    )

                written_count = sum(1 for d in diff_summary if d.get('applied'))
                session_registry.touch(sid)
                return jsonify({
                    'ok':            True,
                    'written_count':  written_count,
                    'diff_summary':  diff_summary,
                    'commit_hash':   commit_hash,
                    'git_error':     git_error,
                    'push_error':    push_error,
                    'backup_path':   str(backup_path) if backup_path else None,
                })
            except Exception:
                return _internal_server_error('Failed to apply harvested updates.')

    # ------------------------------------------------------------------
    # Content proposal (layout-phase text edits)
    # ------------------------------------------------------------------

    @bp.post("/api/cv/propose-content-change")
    def propose_cv_content_change():
        """Ask the LLM to propose targeted text changes for the current CV content."""
        # duckflow:
        #   id: generation_api_propose_content_change_live
        #   kind: api
        #   timestamp: "2026-07-14T00:00:00Z"
        #   status: live
        #   handles:
        #     - "POST /api/cv/propose-content-change"
        #   calls:
        #     - "orchestrator:propose_content_change"
        #   reads:
        #     - "request:POST /api/cv/propose-content-change.instruction"
        #     - "state:approved_rewrites"
        #     - "state:spell_audit"
        #     - "state:job_analysis"
        #     - "state:customizations"
        #   returns:
        #     - "response:POST /api/cv/propose-content-change.proposals"
        #   notes: "Builds render-ready content from session state, asks the LLM to propose minimal text edits matching the instruction, and returns the proposals without applying them."
        entry = get_session()
        validate_owner(entry)
        conv = entry.manager

        body = request.get_json(force=True) or {}
        instruction_text = (body.get("instruction") or "").strip()
        if not instruction_text:
            return jsonify({"error": "Missing instruction text."}), 400

        inputs = _collect_render_snapshot_inputs(conv)

        try:
            content = conv.orchestrator.build_render_ready_content(
                inputs['job_analysis'],
                inputs['materialized_customizations'],
                approved_rewrites=inputs['approved_rewrites'],
                spell_audit=inputs['spell_audit'],
                max_skills=inputs['max_skills'],
                use_semantic_match=False,
            )
        except Exception as exc:
            current_app.logger.exception("propose-content-change: failed to build content")
            return jsonify({"error": f"Failed to build CV content: {exc}"}), 500

        result = conv.orchestrator.propose_content_change(instruction_text, content)

        if result.get('error'):
            return jsonify({"ok": False, "error": result["error"], "proposals": []}), 200

        return jsonify({"ok": True, "proposals": result.get("proposals") or []})

    @bp.post("/api/cv/apply-content-changes")
    def apply_cv_content_changes():
        """Persist accepted content proposals to session state and mark affected phases dirty."""
        # duckflow:
        #   id: generation_api_apply_content_changes_live
        #   kind: api
        #   timestamp: "2026-07-14T00:00:00Z"
        #   status: live
        #   handles:
        #     - "POST /api/cv/apply-content-changes"
        #   reads:
        #     - "request:POST /api/cv/apply-content-changes.accepted"
        #   writes:
        #     - "state:approved_rewrites"
        #     - "state:layout_content_edits"
        #     - "state:generation_state.dirty_phases"
        #     - "state:generation_state.earliest_dirty_step"
        #   returns:
        #     - "response:POST /api/cv/apply-content-changes.ok"
        #     - "response:POST /api/cv/apply-content-changes.applied_count"
        #     - "response:POST /api/cv/apply-content-changes.dirty_phases"
        #     - "response:POST /api/cv/apply-content-changes.earliest_dirty_step"
        #   notes: "Appends accepted proposals to approved_rewrites and a separate layout_content_edits tracking list, then marks the generate and layout phases as dirty so the frontend can prompt the user to rerun from the correct stage."
        entry = get_session()
        validate_owner(entry)
        conv = entry.manager

        body = request.get_json(force=True) or {}
        accepted = body.get("accepted") or []
        if not isinstance(accepted, list):
            return jsonify({"error": "accepted must be a list."}), 400

        dirty_phases       = ["generate", "layout"]
        earliest_dirty_step = "generate"

        with entry.lock:
            state = conv.state

            # Append to approved_rewrites (so generate-preview and generate-final
            # will pick them up automatically via build_render_ready_content).
            existing_rewrites = state.setdefault("approved_rewrites", [])
            existing_rewrites.extend(accepted)

            # Also keep a separate audit list for layout-phase edits.
            layout_edits = state.setdefault("layout_content_edits", [])
            layout_edits.extend(accepted)

            # Mark generation state dirty so the frontend can warn the user.
            gen = state.setdefault("generation_state", {})
            gen["dirty_phases"]        = dirty_phases
            gen["earliest_dirty_step"] = earliest_dirty_step
            gen["layout_confirmed"]    = False

            conv._save_session()

        return jsonify({
            "ok":                  True,
            "applied_count":       len(accepted),
            "dirty_phases":        dirty_phases,
            "earliest_dirty_step": earliest_dirty_step,
        })

    @bp.post("/api/cv/smart-instruction")
    def smart_cv_instruction():
        """Classify a free-text CV instruction as layout or content, then delegate.

        The LLM determines whether the instruction targets structural presentation
        (layout) or text content (content), then routes to the appropriate handler.

        Body: ``{"instruction": "<text>"}``

        Returns layout response (same shape as /api/cv/layout-refine) with an
        extra ``"instruction_type": "layout"`` field, or content proposals (same
        shape as /api/cv/propose-content-change) with ``"instruction_type":
        "content"``.
        """
        # duckflow:
        #   id: generation_api_smart_instruction_live
        #   kind: api
        #   timestamp: "2026-05-18T20:00:00Z"
        #   status: live
        #   handles:
        #     - "POST /api/cv/smart-instruction"
        #   calls:
        #     - "orchestrator:classify_instruction"
        #     - "orchestrator:apply_layout_instruction"
        #     - "orchestrator:propose_content_change"
        #   reads:
        #     - "request:POST /api/cv/smart-instruction.instruction"
        #     - "state:generation_state.preview_html"
        #   returns:
        #     - "response:POST /api/cv/smart-instruction.instruction_type"
        #     - "response:POST /api/cv/smart-instruction.ok"
        #   notes: "Classifies the instruction via LLM, then delegates to the layout or content handler."
        entry = get_session()
        validate_owner(entry)
        conv = entry.manager

        body = request.get_json(force=True) or {}
        instruction_text = (body.get("instruction") or "").strip()
        if not instruction_text:
            return jsonify({"error": "Missing instruction text."}), 400

        instruction_type = conv.orchestrator.classify_instruction(instruction_text)

        if instruction_type == "content":
            inputs = _collect_render_snapshot_inputs(conv)
            try:
                content = conv.orchestrator.build_render_ready_content(
                    inputs['job_analysis'],
                    inputs['materialized_customizations'],
                    approved_rewrites=inputs['approved_rewrites'],
                    spell_audit=inputs['spell_audit'],
                    max_skills=inputs['max_skills'],
                )
            except Exception as exc:
                current_app.logger.exception("smart-instruction: failed to build content")
                return jsonify({"error": f"Failed to build CV content: {exc}"}), 500

            result = conv.orchestrator.propose_content_change(instruction_text, content)
            if result.get('error'):
                return jsonify({
                    "ok": False,
                    "instruction_type": "content",
                    "error": result["error"],
                    "proposals": [],
                }), 200
            return jsonify({
                "ok": True,
                "instruction_type": "content",
                "proposals": result.get("proposals") or [],
            })

        # --- layout branch (default) ---
        with entry.lock:
            gen_state = conv.state.get("generation_state", {})
            current_html = gen_state.get("preview_html") or ""
            prior_instructions = gen_state.get("layout_instructions") or []

        if not current_html:
            return jsonify({
                "ok": False,
                "instruction_type": "layout",
                "error": "No preview HTML available. Generate a preview first.",
            }), 400

        result = conv.orchestrator.apply_layout_instruction(
            instruction_text=instruction_text,
            current_html=current_html,
            prior_instructions=prior_instructions,
        )

        if result.get("error"):
            safety_alert = None
            if "safety" in result:
                s = result["safety"]
                findings = s.get("findings") or []
                safety_alert = {"flagged": bool(findings), "issues": findings, "message": ""}
            response_body = {
                "ok": False,
                "instruction_type": "layout",
                "error": result["error"],
                "details": result.get("details", ""),
            }
            if result.get("error") == "clarify":
                response_body["question"] = result.get("clarification_question", "")
            if "raw_response" in result:
                response_body["raw_response"] = result["raw_response"]
            if safety_alert:
                response_body["safety_alert"] = safety_alert
            return jsonify(response_body), 200

        new_html = result.get("html", "")
        safety = result.get("safety") or {}
        safety_findings = safety.get("findings") or []
        safety_alert = {"flagged": bool(safety_findings), "issues": safety_findings, "message": ""} if safety_findings else None

        with entry.lock:
            gen = conv.state.setdefault("generation_state", {})
            gen["preview_html"] = new_html
            instructions_list = gen.setdefault("layout_instructions", [])
            instructions_list.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "instruction_text": instruction_text,
                "change_summary": result.get("summary", ""),
                "confirmation": True,
            })
            conv._save_session()

        return jsonify({
            "ok": True,
            "instruction_type": "layout",
            "html": new_html,
            "summary": result.get("summary", "Layout updated"),
            "confidence": result.get("confidence", 1.0),
            "safety_alert": safety_alert,
        })

    return bp
