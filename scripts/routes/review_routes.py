# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Review routes — review decisions, achievement edits, rewrites, publications,
reorder, synonyms, spell check, layout review, ATS, persuasion.
"""
import dataclasses
import re
import traceback
from pathlib import Path
from typing import Any, Dict, List

from flask import Blueprint, jsonify, request

# Live blueprint module registered by `scripts.web_app.create_app()`.

from utils.session_data_view import SessionDataView
from utils.spell_checker import SpellChecker


def create_blueprint(deps):
    bp = Blueprint('review', __name__)

    _get_session = deps['get_session']
    _validate_owner = deps['validate_owner']
    session_registry = deps['session_registry']
    _load_master = deps['load_master']
    _coerce_to_dict = deps['coerce_to_dict']
    validate_ats_report = deps['validate_ats_report']
    RewritesResponse = deps['RewritesResponse']
    Phase = deps['Phase']

    # Lazy singleton — the LanguageTool JVM starts on first call.
    _spell_checker: SpellChecker = SpellChecker()

    def _prepopulate_spell_dict(orchestrator_inst) -> None:
        """Load domain terms and proper nouns from master data into the custom dictionary."""
        try:
            master = orchestrator_inst.master_data or {}
            skills = master.get('skills', {})
            all_names: list = []

            def _collect_names(values) -> None:
                for value in values or []:
                    if isinstance(value, dict):
                        name = (
                            value.get('name', '')
                            or value.get('title', '')
                            or value.get('degree', '')
                            or value.get('institution', '')
                            or value.get('company', '')
                            or value.get('issuer', '')
                            or value.get('language', '')
                            or value.get('proficiency', '')
                        )
                        if name:
                            all_names.append(str(name))
                    elif value:
                        all_names.append(str(value))

            if isinstance(skills, dict):
                for cat_skills in skills.values():
                    if isinstance(cat_skills, list):
                        _collect_names(cat_skills)
            elif isinstance(skills, list):
                _collect_names(skills)

            pinfo = master.get('personal_info', {})
            all_names.extend(filter(None, [
                pinfo.get('name', ''),
                pinfo.get('title', ''),
            ]))

            for exp in master.get('experience', []) or []:
                if isinstance(exp, dict):
                    all_names.extend(filter(None, [
                        exp.get('company', ''),
                        exp.get('title', ''),
                    ]))

            for edu in master.get('education', []) or []:
                if isinstance(edu, dict):
                    all_names.extend(filter(None, [
                        edu.get('institution', ''),
                        edu.get('degree', ''),
                        edu.get('field', ''),
                    ]))

            for award in master.get('awards', []) or []:
                if isinstance(award, dict):
                    all_names.extend(filter(None, [
                        award.get('degree', ''),
                        award.get('title', ''),
                    ]))

            for cert in master.get('certifications', []) or []:
                if isinstance(cert, dict):
                    all_names.extend(filter(None, [
                        cert.get('name', ''),
                        cert.get('issuer', ''),
                    ]))

            for lang in pinfo.get('languages', []) or []:
                if isinstance(lang, dict):
                    all_names.extend(filter(None, [
                        lang.get('language', ''),
                        lang.get('proficiency', ''),
                    ]))
                else:
                    all_names.append(str(lang))

            _spell_checker.prepopulate_from_skills(all_names)
        except Exception:
            pass

    def _normalize_subskills(raw_subskills: Any) -> List[str]:
        if isinstance(raw_subskills, str):
            raw_subskills = [item.strip() for item in raw_subskills.split(',')]

        normalized: List[str] = []
        seen: set[str] = set()
        if isinstance(raw_subskills, list):
            for item in raw_subskills:
                if not isinstance(item, str):
                    continue
                label = item.strip()
                if not label or label in seen:
                    continue
                normalized.append(label)
                seen.add(label)
        return normalized

    def _normalize_extra_skill_entry(raw_skill: Any) -> Any:
        if isinstance(raw_skill, str):
            label = raw_skill.strip()
            return label or None

        if not isinstance(raw_skill, dict):
            return None

        name = str(raw_skill.get('name') or '').strip()
        if not name:
            return None

        normalized: Dict[str, Any] = {'name': name}
        for field in ('category', 'group', 'proficiency', 'parenthetical'):
            value = str(raw_skill.get(field) or '').strip()
            if value:
                normalized[field] = value

        subskills = _normalize_subskills(
            raw_skill.get('subskills', raw_skill.get('sub_skills')),
        )
        if subskills:
            normalized['subskills'] = subskills

        if raw_skill.get('user_created') or raw_skill.get('_isUserCreated'):
            normalized['user_created'] = True

        return normalized

    def _normalize_extra_skills(raw_extra_skills: Any) -> List[Any]:
        normalized: List[Any] = []
        seen: set[str] = set()
        for raw_skill in raw_extra_skills or []:
            normalized_skill = _normalize_extra_skill_entry(raw_skill)
            if not normalized_skill:
                continue
            skill_name = (
                normalized_skill
                if isinstance(normalized_skill, str)
                else str(normalized_skill.get('name') or '').strip()
            )
            if not skill_name or skill_name in seen:
                continue
            normalized.append(normalized_skill)
            seen.add(skill_name)
        return normalized

    # ── Review decisions ─────────────────────────────────────────────────────

    @bp.route('/api/review-decisions', methods=['POST'])
    def save_review_decisions():
        """Save user's review decisions for experiences/skills."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.json

        if not data:
            return jsonify({"error": "No data provided"}), 400

        decision_type = data.get('type')
        decisions = data.get('decisions', {})

        if not decision_type or not decisions:
            return jsonify({"error": "Missing type or decisions"}), 400

        try:
            if decision_type == 'experiences':
                conversation.state['experience_decisions'] = decisions
                message = f"Saved decisions for {len(decisions)} experiences"
            elif decision_type == 'skills':
                conversation.state['skill_decisions'] = decisions
                extra_skills = _normalize_extra_skills(data.get('extra_skills', []))
                conversation.state['extra_skills'] = extra_skills

                raw_matches = data.get('extra_skill_matches') or {}
                sanitized_matches: Dict[str, List[str]] = {}
                valid_ids = {
                    (exp.get('id') or '').strip()
                    for exp in (conversation.orchestrator.master_data.get('experience') or [])
                    if isinstance(exp, dict) and (exp.get('id') or '').strip()
                }
                if isinstance(raw_matches, dict):
                    for skill_name, exp_ids in raw_matches.items():
                        if not isinstance(skill_name, str) or not skill_name.strip():
                            continue
                        if isinstance(exp_ids, str):
                            exp_ids = [x.strip() for x in exp_ids.split(',') if x.strip()]
                        if not isinstance(exp_ids, list):
                            continue
                        cleaned = []
                        seen = set()
                        for exp_id in exp_ids:
                            if not isinstance(exp_id, str):
                                continue
                            exp_id = exp_id.strip()
                            if not exp_id or exp_id not in valid_ids or exp_id in seen:
                                continue
                            cleaned.append(exp_id)
                            seen.add(exp_id)
                        if cleaned:
                            sanitized_matches[skill_name.strip()] = cleaned
                conversation.state['extra_skill_matches'] = sanitized_matches

                customizations = dict(conversation.state.get('customizations') or {})
                customizations['extra_skills'] = conversation.state.get('extra_skills') or []
                customizations['extra_skill_matches'] = sanitized_matches
                conversation.state['customizations'] = customizations
                message = f"Saved decisions for {len(decisions)} skills"
            elif decision_type == 'achievements':
                conversation.state['achievement_decisions'] = decisions
                accepted_suggestions = data.get('accepted_suggestions', [])
                if accepted_suggestions:
                    conversation.state['accepted_suggested_achievements'] = accepted_suggestions
                message = f"Saved decisions for {len(decisions)} achievements" + (
                    f" (+{len(accepted_suggestions)} AI suggestions accepted)" if accepted_suggestions else ""
                )
            elif decision_type == 'publications':
                conversation.state['publication_decisions'] = decisions
                message = f"Saved decisions for {len(decisions)} publications"
            elif decision_type == 'summary_focus':
                # duckflow: {
                #   "id": "summary_api_review_decision_live",
                #   "kind": "api",
                #   "status": "live",
                #   "handles": ["POST /api/review-decisions"],
                #   "reads": ["request:POST /api/review-decisions.summary_focus"],
                #   "writes": ["state:summary_focus_override"],
                #   "notes": "Live review-decisions route persists the selected summary key in session state."
                # }
                conversation.state['summary_focus_override'] = decisions
                message = "Saved summary focus preference"
            else:
                return jsonify({"error": f"Invalid type: {decision_type}"}), 400

            conversation._save_session()
            print(f"Saved {decision_type} decisions: {decisions}")
            session_registry.touch(sid)
            return jsonify({"success": True, "message": message})

        except Exception as e:
            print(f"ERROR in save_review_decisions: {e}")
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @bp.route('/api/save-achievement-edits', methods=['POST'])
    def save_achievement_edits():
        """Save per-experience achievement edits from the achievements editor tab."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.json or {}
        edits = data.get('edits', {})
        if not edits:
            return jsonify({"error": "No edits provided"}), 400
        normalized = {int(k): v for k, v in edits.items() if str(k).lstrip("-").isdigit()}
        with entry.lock:
            conversation.state['achievement_edits'] = normalized
            conversation._save_session()
        session_registry.touch(sid)
        total = sum(len(v) for v in normalized.values())
        return jsonify({"success": True, "message": f"Saved edits for {len(normalized)} experiences ({total} achievements)"})

    @bp.post('/api/review-achievement')
    def save_review_achievement_override():
        """Persist a top-level achievement edit/delete in session state only."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}

        ach_id = str(data.get('id') or '').strip()
        action = str(data.get('action') or 'update').strip().lower()
        field = str(data.get('field') or '').strip()
        value = data.get('value')

        if not ach_id:
            return jsonify({'error': 'id is required'}), 400

        allowed_fields = {'title', 'description', 'relevant_for', 'importance'}
        if action == 'delete':
            with entry.lock:
                overrides = dict(conversation.state.get('achievement_overrides') or {})
                overrides.pop(ach_id, None)

                removed_ids = [
                    item for item in (conversation.state.get('removed_achievement_ids') or [])
                    if isinstance(item, str) and item.strip()
                ]
                if ach_id not in removed_ids:
                    removed_ids.append(ach_id)

                decisions = dict(conversation.state.get('achievement_decisions') or {})
                decisions[ach_id] = 'exclude'

                customizations = dict(conversation.state.get('customizations') or {})
                customizations['achievement_overrides'] = overrides
                customizations['removed_achievement_ids'] = removed_ids

                conversation.state['achievement_overrides'] = overrides
                conversation.state['removed_achievement_ids'] = removed_ids
                conversation.state['achievement_decisions'] = decisions
                conversation.state['customizations'] = customizations
                conversation._save_session()

            session_registry.touch(sid)
            return jsonify({'ok': True, 'action': 'deleted', 'id': ach_id})

        if field not in allowed_fields:
            return jsonify({'error': 'field must be one of title, description, relevant_for, importance'}), 400

        with entry.lock:
            overrides = dict(conversation.state.get('achievement_overrides') or {})
            existing = dict(overrides.get(ach_id) or {})
            existing[field] = value
            overrides[ach_id] = existing

            removed_ids = [
                item for item in (conversation.state.get('removed_achievement_ids') or [])
                if isinstance(item, str) and item.strip() and item != ach_id
            ]

            customizations = dict(conversation.state.get('customizations') or {})
            customizations['achievement_overrides'] = overrides
            if removed_ids:
                customizations['removed_achievement_ids'] = removed_ids
            else:
                customizations.pop('removed_achievement_ids', None)

            conversation.state['achievement_overrides'] = overrides
            conversation.state['removed_achievement_ids'] = removed_ids
            conversation.state['customizations'] = customizations
            conversation._save_session()

        session_registry.touch(sid)
        return jsonify({'ok': True, 'action': 'updated', 'id': ach_id, 'field': field})

    @bp.post('/api/review-skill-group')
    def save_review_skill_group_override():
        """Persist a review-time skill group override in session state only."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}

        skill_name = str(data.get('skill') or '').strip()
        if not skill_name:
            return jsonify({'error': 'skill is required'}), 400

        raw_group = data.get('group')
        group_name = None if raw_group is None else str(raw_group).strip() or None

        with entry.lock:
            overrides = dict(conversation.state.get('skill_group_overrides') or {})
            overrides[skill_name] = group_name

            customizations = dict(conversation.state.get('customizations') or {})
            customizations['skill_group_overrides'] = overrides

            conversation.state['skill_group_overrides'] = overrides
            conversation.state['customizations'] = customizations
            conversation._save_session()

        session_registry.touch(sid)
        return jsonify({'ok': True, 'action': 'updated', 'skill': skill_name, 'group': group_name})

    @bp.post('/api/review-skill-category')
    def save_review_skill_category_override():
        """Persist a review-time skill category override in session state only."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}

        skill_name = str(data.get('skill') or '').strip()
        if not skill_name:
            return jsonify({'error': 'skill is required'}), 400

        raw_category = data.get('category')
        category_name = None if raw_category is None else str(raw_category).strip() or None

        with entry.lock:
            overrides = dict(conversation.state.get('skill_category_overrides') or {})
            if category_name is None:
                overrides.pop(skill_name, None)
            else:
                overrides[skill_name] = category_name

            customizations = dict(conversation.state.get('customizations') or {})
            if overrides:
                customizations['skill_category_overrides'] = overrides
            else:
                customizations.pop('skill_category_overrides', None)

            conversation.state['skill_category_overrides'] = overrides
            conversation.state['customizations'] = customizations
            conversation._save_session()

        session_registry.touch(sid)
        return jsonify({'ok': True, 'action': 'updated', 'skill': skill_name, 'category': category_name})

    @bp.post('/api/review-skill-categories')
    def save_review_skill_categories():
        """Persist review-time skill category rename/order changes in session state only."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        action = str(data.get('action') or '').strip().lower()

        if action not in {'rename', 'reorder'}:
            return jsonify({'error': "action must be 'rename' or 'reorder'"}), 400

        with entry.lock:
            customizations = dict(conversation.state.get('customizations') or {})

            if action == 'rename':
                old_category = str(data.get('old_category') or '').strip()
                new_category = str(data.get('new_category') or '').strip()
                if not old_category:
                    return jsonify({'error': 'old_category is required'}), 400
                if not new_category:
                    return jsonify({'error': 'new_category is required'}), 400

                summary_view = SessionDataView(
                    conversation.orchestrator.master_data,
                    conversation.state,
                    customizations,
                )
                matching_skills = [
                    str(skill.get('name') or '').strip()
                    for skill in summary_view.normalized_skills()
                    if isinstance(skill, dict)
                    and str(skill.get('category') or 'General').strip() == old_category
                ]
                if not matching_skills:
                    return jsonify({'error': 'old_category not found'}), 404

                overrides = dict(conversation.state.get('skill_category_overrides') or {})
                for skill_name in matching_skills:
                    overrides[skill_name] = new_category

                existing_order = [
                    str(category).strip()
                    for category in (conversation.state.get('skill_category_order') or [])
                    if str(category).strip()
                ]
                if existing_order:
                    remapped_order = []
                    for category in existing_order:
                        category = new_category if category == old_category else category
                        if category not in remapped_order:
                            remapped_order.append(category)
                    conversation.state['skill_category_order'] = remapped_order
                    customizations['skill_category_order'] = remapped_order

                conversation.state['skill_category_overrides'] = overrides
                customizations['skill_category_overrides'] = overrides
                conversation.state['customizations'] = customizations
                conversation._save_session()
                session_registry.touch(sid)
                return jsonify({
                    'ok': True,
                    'action': 'rename',
                    'old_category': old_category,
                    'new_category': new_category,
                    'updated_skills': matching_skills,
                })

            ordered_categories = data.get('ordered_categories')
            if not isinstance(ordered_categories, list):
                return jsonify({'error': 'ordered_categories must be a list'}), 400

            cleaned_order = []
            seen = set()
            for category in ordered_categories:
                if not isinstance(category, str):
                    continue
                label = category.strip()
                if not label or label in seen:
                    continue
                cleaned_order.append(label)
                seen.add(label)

            if cleaned_order:
                conversation.state['skill_category_order'] = cleaned_order
                customizations['skill_category_order'] = cleaned_order
            else:
                conversation.state.pop('skill_category_order', None)
                customizations.pop('skill_category_order', None)

            conversation.state['customizations'] = customizations
            conversation._save_session()

        session_registry.touch(sid)
        return jsonify({'ok': True, 'action': 'reorder', 'ordered_categories': cleaned_order})

    @bp.post('/api/review-skill-qualifiers')
    def save_review_skill_qualifier_overrides():
        """Persist review-time skill qualifier overrides in session state only."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}

        skill_name = str(data.get('skill') or '').strip()
        if not skill_name:
            return jsonify({'error': 'skill is required'}), 400

        proficiency = str(data.get('proficiency') or '').strip() or None
        parenthetical = str(data.get('parenthetical') or '').strip() or None
        raw_subskills = data.get('subskills')
        if isinstance(raw_subskills, str):
            raw_subskills = [item.strip() for item in raw_subskills.split(',')]
        subskills = []
        seen_subskills = set()
        if isinstance(raw_subskills, list):
            for item in raw_subskills:
                if not isinstance(item, str):
                    continue
                label = item.strip()
                if not label or label in seen_subskills:
                    continue
                subskills.append(label)
                seen_subskills.add(label)

        with entry.lock:
            overrides = dict(conversation.state.get('skill_qualifier_overrides') or {})
            current = dict(overrides.get(skill_name) or {})

            if proficiency:
                current['proficiency'] = proficiency
            else:
                current.pop('proficiency', None)

            if subskills:
                current['subskills'] = subskills
            else:
                current.pop('subskills', None)

            if parenthetical:
                current['parenthetical'] = parenthetical
            else:
                current.pop('parenthetical', None)

            if current:
                overrides[skill_name] = current
            else:
                overrides.pop(skill_name, None)

            customizations = dict(conversation.state.get('customizations') or {})
            if overrides:
                customizations['skill_qualifier_overrides'] = overrides
            else:
                customizations.pop('skill_qualifier_overrides', None)

            conversation.state['skill_qualifier_overrides'] = overrides
            conversation.state['customizations'] = customizations
            conversation._save_session()

        session_registry.touch(sid)
        return jsonify({
            'ok': True,
            'action': 'updated',
            'skill': skill_name,
            'qualifiers': overrides.get(skill_name, {}),
        })

    @bp.post('/api/review-skill-add')
    def add_review_skill():
        """Persist a new session-only skill entry for the current review flow."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}

        normalized_skill = _normalize_extra_skill_entry({
            'name': data.get('name'),
            'category': data.get('category'),
            'group': data.get('group'),
            'proficiency': data.get('proficiency'),
            'subskills': data.get('subskills'),
            'parenthetical': data.get('parenthetical'),
            'user_created': True,
        })
        if not isinstance(normalized_skill, dict):
            return jsonify({'error': 'name is required'}), 400

        skill_name = normalized_skill['name']

        with entry.lock:
            summary_view = SessionDataView(
                conversation.orchestrator.master_data,
                conversation.state,
                conversation.state.get('customizations'),
            )
            existing_names = {
                str(skill.get('name') or '').strip()
                for skill in summary_view.normalized_skills()
                if isinstance(skill, dict)
            }
            existing_extra = {
                item if isinstance(item, str) else str(item.get('name') or '').strip()
                for item in _normalize_extra_skills(conversation.state.get('extra_skills', []))
            }
            if skill_name in existing_names or skill_name in existing_extra:
                return jsonify({'error': 'skill already exists in this session'}), 409

            extra_skills = _normalize_extra_skills(conversation.state.get('extra_skills', []))
            extra_skills.append(normalized_skill)

            skill_decisions = dict(conversation.state.get('skill_decisions') or {})
            skill_decisions[skill_name] = 'include'

            customizations = dict(conversation.state.get('customizations') or {})
            customizations['extra_skills'] = extra_skills

            conversation.state['extra_skills'] = extra_skills
            conversation.state['skill_decisions'] = skill_decisions
            conversation.state['customizations'] = customizations
            conversation._save_session()

        session_registry.touch(sid)
        return jsonify({'ok': True, 'skill': normalized_skill})

    @bp.route('/api/rewrite-achievement', methods=['POST'])
    def rewrite_achievement():
        """Ask the LLM to rewrite a single achievement bullet."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        orchestrator = entry.orchestrator
        llm_client = deps['llm_client_ref']['value']
        data = request.json or {}
        achievement_text = data.get('achievement_text', '').strip()
        experience_index = data.get('experience_index')
        user_instructions    = data.get('user_instructions', '').strip()
        previous_suggestions = data.get('previous_suggestions') or []
        if not isinstance(previous_suggestions, list):
            previous_suggestions = []

        if not achievement_text:
            return jsonify({"error": "achievement_text is required"}), 400

        experience_context = ''
        exp_idx = None
        if experience_index is not None:
            try:
                exp_idx = int(experience_index)
                _master, _ = _load_master(orchestrator.master_data_path)
                experiences = _master.get('experience', [])
                if 0 <= exp_idx < len(experiences):
                    exp = experiences[exp_idx]
                    title   = exp.get('title', exp.get('position', ''))
                    company = exp.get('company', exp.get('organization', ''))
                    experience_context = f"{title} at {company}".strip(' at')
            except (ValueError, TypeError, OSError):
                pass

        achievement_index = data.get('achievement_index')
        ach_idx = None
        if achievement_index is not None:
            try:
                ach_idx = int(achievement_index)
            except (ValueError, TypeError):
                ach_idx = None

        job_description = conversation.state.get('job_description') or ''

        try:
            rewritten = llm_client.rewrite_achievement(
                achievement_text=achievement_text,
                experience_context=experience_context,
                job_description=job_description,
                user_instructions=user_instructions,
                previous_suggestions=previous_suggestions,
            )
            log_id = conversation.log_achievement_rewrite(
                original_text=achievement_text,
                experience_context=experience_context,
                user_instructions=user_instructions,
                previous_suggestions=previous_suggestions,
                suggested_text=rewritten,
                experience_index=exp_idx,
                achievement_index=ach_idx,
            )
            return jsonify({"rewritten": rewritten, "log_id": log_id})
        except Exception as e:
            print(f"ERROR rewriting achievement: {e}")
            return jsonify({"error": str(e)}), 500

    @bp.route('/api/rewrite-achievement-outcome', methods=['POST'])
    def rewrite_achievement_outcome():
        """Record the user's accept/reject decision for an AI rewrite suggestion."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        data = request.json or {}
        log_id = data.get('log_id', '').strip()
        outcome = data.get('outcome', '').strip()
        accepted_text = data.get('accepted_text') or None

        if not log_id:
            return jsonify({"error": "log_id is required"}), 400
        if outcome not in ('accepted', 'rejected'):
            return jsonify({"error": "outcome must be 'accepted' or 'rejected'"}), 400

        found = conversation.update_achievement_rewrite_outcome(
            log_id=log_id,
            outcome=outcome,
            accepted_text=accepted_text,
        )
        if not found:
            return jsonify({"error": "log_id not found"}), 404
        return jsonify({"ok": True})

    @bp.route('/api/cv-data', methods=['GET'])
    def get_cv_data():
        """Get current CV data for editing."""
        entry = _get_session()
        conversation = entry.manager
        orchestrator = entry.orchestrator
        try:
            cv_data = {
                'personal_info': {},
                'summary': '',
                'experiences': [],
                'skills': []
            }

            if orchestrator and orchestrator.master_data:
                master_data = orchestrator.master_data

                personal_info = master_data.get('personal_info', {})
                cv_data['personal_info'] = {
                    'name': personal_info.get('name', ''),
                    'email': personal_info.get('email', ''),
                    'phone': personal_info.get('phone', ''),
                    'location': personal_info.get('location', '')
                }

                cv_data['summary'] = master_data.get('summary', '')

                experiences = master_data.get('experience', [])
                cv_data['experiences'] = []
                for exp in experiences:
                    exp_data = {
                        'title': exp.get('title', ''),
                        'company': exp.get('company', ''),
                        'start_date': exp.get('start_date', ''),
                        'end_date': exp.get('end_date', ''),
                        'current': exp.get('current', False),
                        'location': exp.get('location', ''),
                        'achievements': exp.get('achievements', [])
                    }
                    cv_data['experiences'].append(exp_data)

                skills_data = master_data.get('skills', [])
                all_skills = conversation.normalize_skills_data(skills_data)
                cv_data['skills'] = all_skills

            return jsonify(cv_data)

        except Exception as e:
            print(f"ERROR in get_cv_data: {e}")
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @bp.route('/api/cv-data', methods=['POST'])
    def save_cv_data():
        """Save edited CV data."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400

            with entry.lock:
                conversation.state['edited_cv_data'] = data
                conversation._save_session()
            session_registry.touch(sid)

            print(f"CV data updated:")
            if 'personal_info' in data:
                print(f"  - Personal info: {data['personal_info']}")
            if 'summary' in data:
                print(f"  - Summary: {len(data.get('summary', ''))} chars")
            if 'experiences' in data:
                print(f"  - Experiences: {len(data['experiences'])} items")
            if 'skills' in data:
                print(f"  - Skills: {len(data['skills'])} items")

            return jsonify({"success": True, "message": "CV data saved successfully"})

        except Exception as e:
            print(f"ERROR in save_cv_data: {e}")
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @bp.get("/api/rewrites")
    def get_rewrites():
        """Propose LLM text rewrites aligned with the target job description."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        orchestrator = entry.orchestrator
        sid = entry.session_id
        try:
            stored_rewrites = conversation.state.get('pending_rewrites')
            if stored_rewrites:
                return jsonify(dataclasses.asdict(RewritesResponse(
                    ok=True,
                    rewrites=stored_rewrites,
                    persuasion_warnings=conversation.state.get('persuasion_warnings', []),
                    phase=Phase.REWRITE_REVIEW,
                )))

            job_analysis = conversation.state.get('job_analysis')
            if not job_analysis:
                return jsonify({"error": "Job analysis not available. Analyse the job first."}), 400

            if not orchestrator.master_data:
                return jsonify({"error": "CV master data not loaded."}), 400

            state = conversation.state
            customizations = SessionDataView(
                orchestrator.master_data,
                state,
                state.get("customizations"),
            ).materialize_generation_customizations()
            content = orchestrator.build_render_ready_content(
                job_analysis,
                customizations,
                approved_rewrites=state.get("approved_rewrites") or [],
                spell_audit=state.get("spell_audit") or [],
                max_skills=state.get("max_skills"),
                use_semantic_match=False,
            )

            rewrites = orchestrator.propose_rewrites(
                content,
                job_analysis,
                conversation_history=conversation.conversation_history,
                user_preferences=conversation.state.get('post_analysis_answers'),
            )
            conversation.state['pending_rewrites'] = rewrites

            if rewrites:
                persuasion_warnings = conversation.run_persuasion_checks(
                    rewrites,
                    job_analysis,
                    orchestrator.master_data
                )
                conversation.state['persuasion_warnings'] = persuasion_warnings
            else:
                conversation.state['persuasion_warnings'] = []

            if rewrites:
                conversation.state['phase'] = Phase.REWRITE_REVIEW
                phase = Phase.REWRITE_REVIEW
            else:
                phase = Phase.GENERATION

            conversation._save_session()
            session_registry.touch(sid)
            return jsonify(dataclasses.asdict(RewritesResponse(
                ok=True,
                rewrites=rewrites,
                persuasion_warnings=conversation.state.get('persuasion_warnings', []),
                phase=phase,
            )))

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @bp.post("/api/rewrites/approve")
    def approve_rewrites():
        """Submit accept / edit / reject decisions for pending rewrite proposals."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        decisions = data.get('decisions')
        if decisions is None:
            return jsonify({"error": "Missing decisions"}), 400
        if not isinstance(decisions, list):
            return jsonify({"error": "decisions must be a list"}), 400

        try:
            with entry.lock:
                summary = conversation.submit_rewrite_decisions(decisions)
            session_registry.touch(sid)
            return jsonify({
                "ok":             True,
                "approved_count": summary['approved_count'],
                "rejected_count": summary['rejected_count'],
                "phase":          summary['phase'],
            })

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @bp.get("/api/publication-recommendations")
    def publication_recommendations():
        """Return LLM-ranked publication recommendations for the current job."""
        entry = _get_session()
        conversation = entry.manager
        orchestrator = entry.orchestrator
        sid = entry.session_id
        llm_client = deps['llm_client_ref']['value']
        try:
            cached = conversation.state.get('publication_recommendations')
            if cached is not None:
                return jsonify({"ok": True, "recommendations": cached, "source": "cache",
                                "total_count": len(cached)})

            job_analysis = conversation.state.get('job_analysis')
            if not job_analysis:
                return jsonify({"ok": True, "recommendations": [], "source": "no_analysis"})

            if not orchestrator.publications:
                return jsonify({"ok": True, "recommendations": [], "source": "no_publications"})

            candidate_name = ''
            if orchestrator.master_data:
                candidate_name = orchestrator.master_data.get('personal_info', {}).get('name', '')

            pubs_list = list(orchestrator.publications.values())

            try:
                recommendations = llm_client.rank_publications_for_job(
                    publications=pubs_list,
                    job_analysis=job_analysis,
                    candidate_name=candidate_name,
                    max_results=15,
                )
                if not recommendations:
                    raise RuntimeError("LLM returned no publication recommendations")
                source = "llm"
            except Exception as rank_err:
                print(f"Publication ranking failed, using score-based fallback: {rank_err}")
                selected = orchestrator._select_publications(job_analysis, max_count=15)
                recommendations = []
                for pub in selected:
                    recommendations.append({
                        'cite_key':          pub.get('key', ''),
                        'title':             pub.get('title', ''),
                        'venue':             pub.get('journal') or pub.get('booktitle') or '',
                        'year':              pub.get('year', ''),
                        'is_first_author':   False,
                        'relevance_score':   pub.get('relevance_score', 5),
                        'confidence':        'Medium',
                        'rationale':         '',
                        'authority_signals': [],
                        'venue_warning':     '' if (pub.get('journal') or pub.get('booktitle')) else 'No venue found',
                        'formatted_citation': pub.get('formatted', ''),
                    })
                source = "fallback"

            recommended_keys = {r['cite_key'] for r in recommendations}
            for r in recommendations:
                r['is_recommended'] = True

            if orchestrator.publications:
                try:
                    from utils.bibtex_parser import format_publication as _fmt_pub
                except ImportError:
                    _fmt_pub = None
                not_recommended = []
                for key, pub in orchestrator.publications.items():
                    if key in recommended_keys:
                        continue
                    if _fmt_pub:
                        try:
                            formatted = _fmt_pub(pub, style='apa')
                        except Exception:
                            formatted = ''
                    else:
                        formatted = ''
                    if not formatted:
                        formatted = f"{pub.get('authors', '')} ({pub.get('year', '')}). {pub.get('title', '')}".strip('. ')
                    not_recommended.append({
                        'cite_key':          key,
                        'title':             pub.get('title', ''),
                        'venue':             pub.get('journal') or pub.get('booktitle') or '',
                        'year':              pub.get('year', ''),
                        'is_first_author':   False,
                        'relevance_score':   0,
                        'confidence':        '',
                        'rationale':         '',
                        'authority_signals': [],
                        'venue_warning':     '' if (pub.get('journal') or pub.get('booktitle')) else 'No venue found',
                        'formatted_citation': formatted,
                        'is_recommended':    False,
                    })
                not_recommended.sort(key=lambda p: -int(str(p['year']).strip() or '0'))
                recommendations.extend(not_recommended)

            conversation.state['publication_recommendations'] = recommendations
            conversation._save_session()
            session_registry.touch(sid)

            total_count = len(recommendations)
            return jsonify({"ok": True, "recommendations": recommendations, "source": source, "total_count": total_count})

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @bp.post("/api/reorder-bullets")
    def reorder_bullets():
        """Persist a user-defined bullet ordering for one experience."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        exp_id = data.get("experience_id")
        order  = data.get("order")
        if not exp_id:
            return jsonify({"error": "Missing experience_id"}), 400
        if order is None:
            return jsonify({"error": "Missing order list"}), 400
        if not isinstance(order, list):
            return jsonify({"error": "order must be a list of integers"}), 400
        try:
            with entry.lock:
                achievement_orders = conversation.state.setdefault("achievement_orders", {})
                if order:
                    achievement_orders[exp_id] = [int(i) for i in order]
                else:
                    achievement_orders.pop(exp_id, None)
                conversation._save_session()
            session_registry.touch(sid)
            return jsonify({"ok": True, "experience_id": exp_id, "order": order})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.get("/api/proposed-bullet-order")
    def proposed_bullet_order():
        """Return relevance-ranked bullet order for one experience based on job keywords."""
        entry = _get_session()
        conversation = entry.manager
        exp_id = request.args.get("experience_id")
        if not exp_id:
            return jsonify({"error": "Missing experience_id"}), 400
        try:
            master_data = conversation.orchestrator.master_data
            experiences_list = master_data.get("experiences") or master_data.get("experience", [])
            experience = next((e for e in experiences_list if e.get("id") == exp_id), None)
            if not experience:
                return jsonify({"error": f"Experience {exp_id} not found"}), 404

            achievements = list(experience.get("achievements") or [])
            if not achievements:
                return jsonify({"proposed_order": [], "has_job_analysis": False})

            job_analysis = conversation.state.get("job_analysis") or {}
            job_keywords = {kw.lower() for kw in job_analysis.get("ats_keywords", [])}

            if not job_keywords:
                return jsonify({
                    "proposed_order": list(range(len(achievements))),
                    "has_job_analysis": False,
                })

            def ach_score(ach):
                text = (ach.get("text", "") if isinstance(ach, dict) else str(ach)).lower()
                tokens = set(re.findall(r'\b\w+\b', text))
                return len(tokens & job_keywords)

            proposed = sorted(range(len(achievements)), key=lambda i: ach_score(achievements[i]), reverse=True)
            return jsonify({"proposed_order": proposed, "has_job_analysis": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.post("/api/reorder-rows")
    def reorder_rows():
        """Persist a user-defined row ordering for experiences or skills."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        row_type   = data.get("type")
        ordered_ids = data.get("ordered_ids")
        if row_type not in ("experience", "skill"):
            return jsonify({"error": "type must be 'experience' or 'skill'"}), 400
        if ordered_ids is None:
            return jsonify({"error": "Missing ordered_ids"}), 400
        if not isinstance(ordered_ids, list):
            return jsonify({"error": "ordered_ids must be a list"}), 400
        state_key = "experience_row_order" if row_type == "experience" else "skill_row_order"
        try:
            with entry.lock:
                if ordered_ids:
                    conversation.state[state_key] = [str(i) for i in ordered_ids]
                else:
                    conversation.state.pop(state_key, None)
                conversation._save_session()
            session_registry.touch(sid)
            return jsonify({"ok": True, "type": row_type, "ordered_ids": ordered_ids})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.get("/api/synonym-lookup")
    def synonym_lookup():
        """Look up the canonical form of a skill or keyword via the synonym map."""
        entry = _get_session()
        conversation = entry.manager
        term = request.args.get("term", "").strip()
        if not term:
            return jsonify({"error": "Missing term query parameter"}), 400
        canonical = conversation.orchestrator.canonical_skill_name(term)
        return jsonify({"term": term, "canonical": canonical, "found": canonical != term})

    @bp.get("/api/synonym-map")
    def synonym_map():
        """Return the full synonym map as ``{alias: canonical}``."""
        entry = _get_session()
        conversation = entry.manager
        return jsonify(conversation.orchestrator._synonym_map)

    @bp.post("/api/experience-details")
    def get_experience_details():
        entry = _get_session()
        conversation = entry.manager
        data = request.get_json(silent=True) or {}
        experience_id = data.get("experience_id")
        if not experience_id:
            return jsonify({"error": "Missing experience_id"}), 400

        try:
            master_data = conversation.orchestrator.master_data
            experience = None

            experiences_list = master_data.get("experiences") or master_data.get("experience", [])
            if experiences_list:
                for exp in experiences_list:
                    if exp.get("id") == experience_id:
                        experience = exp
                        break

            if experience:
                return jsonify({"experience": experience})
            else:
                available_ids = [exp.get("id") for exp in experiences_list] if experiences_list else []
                print(f"DEBUG: Experience '{experience_id}' not found")
                print(f"DEBUG: Available IDs: {available_ids[:10]}")
                return jsonify({"experience": None, "message": f"Experience {experience_id} not found"})

        except Exception as e:
            print(f"ERROR in get_experience_details: {e}")
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    # ── Spell check ──────────────────────────────────────────────────────────

    @bp.get("/api/spell-check-sections")
    def spell_check_sections():
        """Return the text sections that need spell checking for the current session."""
        entry = _get_session()
        conversation = entry.manager
        orchestrator = entry.orchestrator
        sections = []

        def _append_section(section_id: str, label: str, text: str, context: str = 'skill') -> None:
            text = (text or '').strip()
            if not text:
                return
            sections.append({
                'id':      section_id,
                'label':   label,
                'text':    text,
                'context': context,
            })
        try:
            state             = conversation.state
            job_analysis      = state.get('job_analysis') or {}
            customizations = SessionDataView(
                orchestrator.master_data,
                state,
                state.get('customizations'),
            ).materialize_generation_customizations()
            approved_rewrites = state.get('approved_rewrites') or []
            spell_audit       = state.get('spell_audit') or []

            _prepopulate_spell_dict(orchestrator)
            selected_content = orchestrator.build_render_ready_content(
                job_analysis,
                customizations,
                approved_rewrites=approved_rewrites,
                spell_audit=spell_audit,
                max_skills=state.get('max_skills'),
                use_semantic_match=False,
            )

            cv_data = orchestrator._prepare_cv_data_for_template(selected_content, job_analysis)

            _append_section('summary', 'Professional Summary', cv_data.get('professional_summary', ''), 'summary')

            for i, ach in enumerate(selected_content.get('achievements', []) or []):
                text = ach.get('text', '') if isinstance(ach, dict) else str(ach)
                _append_section(f'selected_ach_{i}', f'Selected Achievement {i + 1}', text, 'bullet')

            for idx, skill in enumerate(selected_content.get('skills', []) or []):
                if isinstance(skill, dict):
                    rendered_skill = skill.get('name', '')
                    if skill.get('years'):
                        rendered_skill += f" ({skill['years']} yrs)"
                else:
                    rendered_skill = str(skill)
                _append_section(f'skill_{idx}', f'Skill {idx + 1}', rendered_skill, 'skill')

            for idx, edu in enumerate(selected_content.get('education', []) or []):
                if not isinstance(edu, dict):
                    continue
                _append_section(f'edu_{idx}_degree', f'Education {idx + 1} — Degree', edu.get('degree', ''), 'skill')
                _append_section(f'edu_{idx}_field', f'Education {idx + 1} — Field', edu.get('field', ''), 'skill')
                _append_section(f'edu_{idx}_institution', f'Education {idx + 1} — Institution', edu.get('institution', ''), 'skill')

            for idx, award in enumerate(selected_content.get('awards', []) or []):
                if not isinstance(award, dict):
                    continue
                _append_section(
                    f'award_{idx}_title',
                    f'Award {idx + 1}',
                    award.get('degree', '') or award.get('title', ''),
                    'skill',
                )

            for idx, cert in enumerate(selected_content.get('certifications', []) or []):
                if not isinstance(cert, dict):
                    continue
                _append_section(f'cert_{idx}_name', f'Certification {idx + 1} — Name', cert.get('name', ''), 'skill')
                _append_section(f'cert_{idx}_issuer', f'Certification {idx + 1} — Issuer', cert.get('issuer', ''), 'skill')

            for idx, lang in enumerate(selected_content.get('personal_info', {}).get('languages', []) or []):
                if isinstance(lang, dict):
                    _append_section(f'lang_{idx}_language', f'Language {idx + 1}', lang.get('language', ''), 'skill')
                    _append_section(f'lang_{idx}_proficiency', f'Language {idx + 1} — Proficiency', lang.get('proficiency', ''), 'skill')
                else:
                    _append_section(f'lang_{idx}', f'Language {idx + 1}', str(lang), 'skill')

            for idx, pub in enumerate(selected_content.get('publications', []) or []):
                if not isinstance(pub, dict):
                    continue
                if pub.get('formatted'):
                    _append_section(f'pub_{idx}_formatted', f'Publication {idx + 1}', pub.get('formatted', ''), 'skill')
                else:
                    _append_section(f'pub_{idx}_title', f'Publication {idx + 1} — Title', pub.get('title', ''), 'skill')
                    _append_section(f'pub_{idx}_authors', f'Publication {idx + 1} — Authors', pub.get('authors', ''), 'skill')
                    _append_section(f'pub_{idx}_journal', f'Publication {idx + 1} — Venue', pub.get('journal', '') or pub.get('booktitle', ''), 'skill')

            for exp in cv_data.get('experiences', []) or []:
                exp_id  = exp.get('id', '')
                company = exp.get('company', 'Experience')
                role    = exp.get('title', '')
                label   = f"{company} \u2014 {role}" if role else company

                ach_list = exp.get('ordered_achievements') or exp.get('achievements') or []
                for i, ach in enumerate(ach_list):
                    text = ach.get('text', '') if isinstance(ach, dict) else str(ach)
                    _append_section(f"exp_{exp_id}_ach_{i}", f"{label} (bullet {i + 1})", text, 'bullet')

        except Exception as e:
            return jsonify({'error': str(e)}), 500

        aggregate_stats = _spell_checker.aggregate_stats([s['text'] for s in sections])
        return jsonify({
            'ok':               True,
            'sections':         sections,
            'aggregate_stats':  aggregate_stats,
            'custom_dict_size': len(_spell_checker.get_custom_dict()),
        })

    @bp.post("/api/spell-check")
    def spell_check_text():
        """Check a single text fragment."""
        entry = _get_session()
        orchestrator = entry.orchestrator
        try:
            body    = request.get_json(force=True) or {}
            text    = body.get('text', '')
            context = body.get('context', 'bullet')
            if context not in ('bullet', 'summary', 'skill'):
                context = 'bullet'

            _prepopulate_spell_dict(orchestrator)
            result = _spell_checker.check(text, context=context)
            custom_dict_size = len(_spell_checker.get_custom_dict())
            return jsonify({
                'ok':              True,
                'suggestions':     result['suggestions'],
                'stats':           result['stats'],
                'custom_dict_size': custom_dict_size,
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @bp.get("/api/custom-dictionary")
    def custom_dictionary_get():
        """Return the current custom dictionary word list."""
        try:
            words = _spell_checker.get_custom_dict()
            return jsonify({'ok': True, 'words': words})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @bp.post("/api/custom-dictionary")
    def custom_dictionary_add():
        """Add a word to the custom dictionary."""
        try:
            body  = request.get_json(force=True) or {}
            word  = body.get('word', '').strip()
            if not word:
                return jsonify({'error': 'word is required'}), 400
            added = _spell_checker.add_word(word)
            return jsonify({'ok': True, 'added': added})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @bp.post("/api/spell-check-complete")
    def spell_check_complete():
        """Record spell-check audit and advance phase to generation."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        try:
            body        = request.get_json(force=True) or {}
            spell_audit = body.get('spell_audit', [])
            with entry.lock:
                result = conversation.complete_spell_check(spell_audit)
            session_registry.touch(sid)
            return jsonify({'ok': True, **result})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ── Layout review ────────────────────────────────────────────────────────

    @bp.get("/api/layout-html")
    def get_layout_html():
        """Return the HTML content of the most recently generated CV."""
        entry = _get_session()
        conversation = entry.manager
        try:
            generated = conversation.state.get('generated_files')
            if not generated or not isinstance(generated, dict):
                return jsonify({'error': 'No generated CV found — generate your CV first.'}), 404
            output_dir = Path(generated.get('output_dir', ''))
            if not output_dir.is_dir():
                return jsonify({'error': f'Output directory not found: {output_dir}'}), 404

            html_files = sorted(output_dir.glob('*.html'))
            if not html_files:
                return jsonify({'error': 'No HTML file found in output directory.'}), 404
            html_content = html_files[0].read_text(encoding='utf-8', errors='replace')
            return jsonify({'ok': True, 'html': html_content})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @bp.post("/api/layout-instruction")
    def apply_layout_instruction():
        """Apply a natural-language layout instruction to the current HTML."""
        entry = _get_session()
        conversation = entry.manager
        try:
            body = request.get_json(force=True) or {}
            instruction_text = body.get('instruction', '').strip()
            current_html = body.get('current_html', '')
            prior_instructions = body.get('prior_instructions', [])

            if not instruction_text:
                return jsonify({'error': 'Missing instruction text'}), 400
            if not current_html:
                return jsonify({'error': 'Missing current HTML'}), 400

            result = conversation.orchestrator.apply_layout_instruction(
                instruction_text=instruction_text,
                current_html=current_html,
                prior_instructions=prior_instructions
            )

            if result.get('error'):
                return jsonify({
                    'ok':           False,
                    'error':        result['error'],
                    'question':     result.get('question'),
                    'details':      result.get('details'),
                    'confidence':   result.get('confidence'),
                    'raw_response': result.get('raw_response'),
                })

            return jsonify({
                'ok': True,
                'html': result['html'],
                'summary': result['summary'],
                'confidence': result['confidence']
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @bp.get("/api/layout-history")
    def get_layout_history():
        """Return the current session's applied layout instruction history."""
        entry = _get_session()
        conversation = entry.manager
        try:
            instructions = conversation.state.get('layout_instructions')
            if not instructions:
                instructions = (
                    conversation.state.get('generation_state', {}).get('layout_instructions', [])
                )
            return jsonify({
                'instructions': instructions,
                'count': len(instructions)
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @bp.post("/api/layout-complete")
    def complete_layout_review():
        """Record layout instruction outcomes and advance phase to refinement."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        try:
            body = request.get_json(force=True) or {}
            layout_instructions = body.get('layout_instructions', [])
            if not layout_instructions:
                layout_instructions = (
                    conversation.state.get('layout_instructions')
                    or conversation.state.get('generation_state', {}).get('layout_instructions', [])
                )
            with entry.lock:
                result = conversation.complete_layout_review(layout_instructions)
            session_registry.touch(sid)
            return jsonify({'ok': True, **result})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @bp.post("/api/layout-settings")
    def update_layout_settings():
        """Persist layout display settings to session state."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid          = entry.session_id
        try:
            body = request.get_json(force=True) or {}
            with entry.lock:
                if 'base_font_size' in body:
                    raw = str(body['base_font_size']).strip()
                    if not raw.endswith('px'):
                        raw = raw + 'px'
                    conversation.state['base_font_size'] = raw
                    if 'customizations' in conversation.state:
                        conversation.state['customizations']['base_font_size'] = raw
                conversation._save_session()
            session_registry.touch(sid)
            return jsonify({'ok': True})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ── ATS validation + persuasion ──────────────────────────────────────────

    @bp.get("/api/ats-validate")
    def ats_validate():
        """Run 16-check ATS validation on the latest generated CV files."""
        from datetime import datetime as _dt
        entry = _get_session()
        conversation = entry.manager
        sid = entry.session_id
        try:
            generated = conversation.state.get('generated_files')
            if not generated or not isinstance(generated, dict):
                return jsonify({'ok': False, 'error': 'No CV files generated yet'}), 400

            output_dir  = Path(generated.get('output_dir', ''))
            if not output_dir.is_dir():
                return jsonify({'ok': False, 'error': f'Output directory not found: {output_dir}'}), 404

            job_analysis = _coerce_to_dict(conversation.state.get('job_analysis'))

            checks, page_count = validate_ats_report(output_dir, job_analysis)

            if page_count is not None:
                conversation.state['page_count'] = page_count

            summary = {
                'pass': sum(1 for c in checks if c['status'] == 'pass'),
                'warn': sum(1 for c in checks if c['status'] == 'warn'),
                'fail': sum(1 for c in checks if c['status'] == 'fail'),
            }

            conversation.state['validation_results'] = {
                'page_count': page_count,
                'checks': checks,
                'summary': summary,
                'validation_date': _dt.now().isoformat(),
            }
            session_registry.touch(sid)

            return jsonify({
                'ok':         True,
                'checks':     checks,
                'page_count': page_count,
                'summary':    summary,
            })
        except Exception as e:
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

    @bp.get("/api/persuasion-check")
    def persuasion_check():
        """Run rule-based persuasion checks on selected experience bullets."""
        entry = _get_session()
        conversation = entry.manager
        try:
            experiences = None

            generated = conversation.state.get('generated_files')
            if generated:
                job_analysis   = _coerce_to_dict(conversation.state.get('job_analysis'))
                customizations = conversation.state.get('customizations') or {}
                try:
                    selected = conversation.orchestrator._select_content_hybrid(
                        job_analysis, customizations
                    )
                    experiences = selected.get('experiences', [])
                except Exception:
                    experiences = None

            if experiences is None:
                experiences = (
                    conversation.orchestrator.master_data.get('experience')
                    or conversation.orchestrator.master_data.get('experiences')
                    or []
                )

            result = conversation.orchestrator.check_persuasion(experiences)
            return jsonify({'ok': True, **result})
        except Exception as e:
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

    return bp
