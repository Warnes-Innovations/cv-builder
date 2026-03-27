"""CV generation, download, finalise, and harvest routes."""
import copy
import json
import re
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from flask import Blueprint, current_app, jsonify, request, send_file

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


def _git_commit_error(message: str, detail: Optional[str] = None) -> str:
    if detail:
        current_app.logger.error('%s %s', message, detail)
    else:
        current_app.logger.error(message)
    return message


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

    for raw_skill in materialized.get('extra_skills') or []:
        _add_skill_candidate(raw_skill, 'new_skill', 'Skill was added during the skills review step.')

    for raw_skill in customizations.get('new_skills_added') or []:
        _add_skill_candidate(raw_skill, 'new_skill', 'Skill was added during the skills review step.')

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


def _generate_preview_outputs(
    conversation,
    preview_html: str,
    preview_request_id: str,
) -> Dict[str, Any]:
    preview_dir = _resolve_preview_artifact_dir(conversation)
    return conversation.orchestrator.generate_pdf_variants_from_html(
        confirmed_html=preview_html,
        output_dir=preview_dir,
        filename_base=f'preview_{preview_request_id}',
    )


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


def _page_warning(page_count: Optional[float]) -> bool:
    if page_count is None:
        return False
    return float(page_count) < 2.0 or float(page_count) > 3.0


def _persist_layout_baseline(
    conversation,
    preview_html: str,
    *,
    source: str,
) -> Dict[str, Any]:
    digest = build_layout_digest(preview_html)
    exact = _compute_exact_page_count(conversation, preview_html)
    page_count = exact.get('page_count')

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
        'page_length_warning': _page_warning(page_count),
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

    gen.update({
        'layout_template_version': LAYOUT_TEMPLATE_VERSION,
        'layout_template_update_note': LAYOUT_TEMPLATE_UPDATE_NOTE,
        'page_count_estimate': page_count_value,
        'page_count_exact': exact_page_count,
        'page_count_confidence': estimate['confidence'],
        'page_count_source': page_count_source,
        'page_count_needs_exact_recheck': estimate['needs_exact_recheck'],
        'page_length_warning': _page_warning(page_count_value),
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
        'page_length_warning': _page_warning(page_count_value),
        'baseline_exact_page_count': baseline_exact_page_count,
        'layout_template_version': LAYOUT_TEMPLATE_VERSION,
        'layout_template_update_note': LAYOUT_TEMPLATE_UPDATE_NOTE,
        'contributors': estimate['contributors'],
        'used_exact_recheck': used_exact_recheck,
    }


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
    """Store ``new_summary`` as a named variant in master data."""
    variants = master.get('professional_summaries')
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
        """Allow harvest write-back only from the post-job finalise window."""
        raw_phase = (entry.manager.state or {}).get('phase')
        current_phase = str(getattr(raw_phase, 'value', raw_phase) or '').strip()
        if current_phase == 'refinement':
            return None
        return jsonify({
            'error': 'Harvest write-back is only available from the post-job finalise workflow.',
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
        })

    @bp.post("/api/cv/generate-preview")
    def generate_cv_preview():
        """Generate an HTML preview of the CV and store it in generation_state."""
        import uuid as _u
        # duckflow:
        #   id: generation_api_preview_live
        #   kind: api
        #   timestamp: "2026-03-27T02:07:47Z"
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
            html_str = _materialize_preview_html(conv)
        except Exception as _exc:
            import flask
            flask.current_app.logger.warning("render_html_preview failed: %s", _exc)

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
        gen = conv.state.setdefault("generation_state", {})
        gen.update({
            "phase":                "layout_review",
            "preview_html":         html_str,
            "preview_request_id":   prev_id,
            "preview_generated_at": now,
            "layout_confirmed":     False,
            "preview_output_paths": preview_outputs,
        })
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
        #   timestamp: "2026-03-27T02:07:47Z"
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
                "question":     result.get("question"),
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

        gen = conv.state.setdefault("generation_state", {})
        gen["preview_html"]        = updated_html
        gen["preview_request_id"]  = prev_id
        gen["preview_generated_at"] = now
        gen["phase"]               = "layout_review"
        gen["layout_confirmed"]    = False
        gen["preview_output_paths"] = preview_outputs
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
        import hashlib as _hl
        now   = datetime.now().isoformat()
        chash = _hl.sha256(gen["preview_html"].encode()).hexdigest()[:16]
        gen   = conv.state.setdefault("generation_state", {})
        gen.update({
            "phase": "confirmed", "layout_confirmed": True,
            "confirmed_at": now, "confirmed_preview_hash": chash,
        })
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

        score = _compute_ats_score(job_analysis, customizations, basis=basis)
        gen = conv.state.setdefault("generation_state", {})
        gen["ats_score"] = score
        conv._save_session()
        return jsonify({"ok": True, "ats_score": score})

    @bp.post("/api/cv/generate-final")
    def generate_cv_final():
        """Regenerate human-readable HTML+PDF from the confirmed preview; mark final_complete."""
        # duckflow:
        #   id: generation_api_final_live
        #   kind: api
        #   timestamp: "2026-03-27T02:07:47Z"
        #   status: live
        #   handles:
        #     - "POST /api/cv/generate-final"
        #   calls:
        #     - "orchestrator:generate_final_from_confirmed_html"
        #     - "state:generation_state.baseline_layout_digest"
        #   reads:
        #     - "state:generation_state.layout_confirmed"
        #     - "state:generation_state.preview_html"
        #     - "state:generated_files.output_dir"
        #   writes:
        #     - "state:generation_state.phase"
        #     - "state:generation_state.final_generated_at"
        #     - "state:generation_state.final_output_paths"
        #     - "state:generated_files.final_html"
        #     - "state:generated_files.final_pdf"
        #     - "state:generated_files.files"
        #     - "state:generation_state.baseline_layout_digest"
        #   returns:
        #     - "response:POST /api/cv/generate-final.outputs"
        #     - "response:POST /api/cv/generate-final.generated_at"
        #     - "response:POST /api/cv/generate-final.page_count_exact"
        #   notes: "Converts the confirmed preview HTML into final human-readable artifacts and updates both generation_state and generated_files with the final output paths."
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
        try:
            final_paths = conv.orchestrator.generate_final_from_confirmed_html(
                confirmed_html=confirmed_html,
                output_dir=output_dir,
                filename_base="CV_final",
            )
        except Exception:
            return _internal_server_error('Final generation failed.')

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
        generated.update({
            "final_html": final_paths["html"],
            "final_pdf": final_paths["pdf"],
            "files": [
                final_paths["html"],
                final_paths["pdf"],
            ],
        })
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
    # Finalise
    # ------------------------------------------------------------------

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

                if app_status not in ('draft', 'ready', 'sent'):
                    return jsonify({'error': "status must be 'draft', 'ready', or 'sent'"}), 400

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
                try:
                    repo_root = Path(__file__).parent.parent.parent
                    subprocess.run(
                        ['git', 'add', str(output_dir)],
                        cwd=str(repo_root), check=True, capture_output=True
                    )
                    result = subprocess.run(
                        ['git', 'commit', '-m', commit_msg],
                        cwd=str(repo_root), capture_output=True, text=True
                    )
                    if result.returncode == 0:
                        m = re.search(r'\b([0-9a-f]{7,40})\b', result.stdout)
                        commit_hash = m.group(1) if m else None
                    else:
                        git_error = _git_commit_error(
                            'Git commit failed. See server logs for details.',
                            result.stderr.strip() or result.stdout.strip(),
                        )
                except Exception as git_exc:
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

                summary = {
                    'files':          generated.get('files', []),
                    'output_dir':     str(output_dir),
                    'ats_keywords':   ats_keywords,
                    'ats_score':      ats_score,
                    'approved_rewrites': approved_count,
                    'application_status': app_status,
                }

                return jsonify({
                    'ok':          True,
                    'commit_hash': commit_hash,
                    'git_error':   git_error,
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
                    elif ctype == 'summary_variant':
                        applied = _harvest_add_summary_variant(master, cand['proposed'])
                        diff_summary.append({
                            'id':      cand['id'],
                            'type':    ctype,
                            'applied': applied,
                            'label':   cand['label'],
                        })

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
                try:
                    repo_root = Path(__file__).parent.parent.parent
                    subprocess.run(
                        ['git', 'add', str(master_path)],
                        cwd=str(repo_root), check=True, capture_output=True
                    )
                    result = subprocess.run(
                        ['git', 'commit', '-m', commit_msg],
                        cwd=str(repo_root), capture_output=True, text=True
                    )
                    if result.returncode == 0:
                        m = re.search(r'\b([0-9a-f]{7,40})\b', result.stdout)
                        commit_hash = m.group(1) if m else None
                    else:
                        git_error = _git_commit_error(
                            'Git commit failed. See server logs for details.',
                            result.stderr.strip() or result.stdout.strip(),
                        )
                except Exception as git_exc:
                    git_error = _git_commit_error(
                        'Git commit failed. See server logs for details.',
                        str(git_exc),
                    )

                written_count = sum(1 for d in diff_summary if d.get('applied'))
                session_registry.touch(sid)
                return jsonify({
                    'ok':           True,
                    'written_count': written_count,
                    'diff_summary': diff_summary,
                    'commit_hash':  commit_hash,
                    'git_error':    git_error,
                })
            except Exception:
                return _internal_server_error('Failed to apply harvested updates.')

    return bp
