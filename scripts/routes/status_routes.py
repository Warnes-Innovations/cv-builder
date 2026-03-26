# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Status routes — /api/status, context-stats, generation-settings, post-analysis endpoints,
intake metadata, prior clarifications.
"""
import dataclasses
import json
from typing import Any, Dict, List, Optional

from flask import Blueprint, jsonify, request

# Live blueprint module registered by `scripts.web_app.create_app()`.

from utils.config import get_config
from utils.conversation_manager import Phase


def create_blueprint(deps):
    bp = Blueprint('status', __name__)

    _get_session = deps['get_session']
    _validate_owner = deps['validate_owner']
    session_registry = deps['session_registry']
    _provider_name_ref = deps['provider_name_ref']
    _current_model_ref = deps['current_model_ref']
    auth_manager = deps['auth_manager']
    _coerce_to_dict = deps['coerce_to_dict']
    _extract_json_payload = deps['extract_json_payload']
    _fallback_post_analysis_questions = deps['fallback_post_analysis_questions']
    _generate_post_analysis_questions = deps['generate_post_analysis_questions']
    StatusResponse = deps['StatusResponse']

    def _usage_prompt_tokens(usage):
        if usage is None:
            return None
        if isinstance(usage, dict):
            return usage.get("prompt_tokens") or usage.get("input_tokens")
        return (
            getattr(usage, "prompt_tokens", None)
            or getattr(usage, "input_tokens", None)
        )

    @bp.get("/api/status")
    def status():
        from pathlib import Path
        entry = _get_session(required=False)
        _provider_name = _provider_name_ref['value']
        _current_model = _current_model_ref['value']
        if entry is None:
            return jsonify({
                "ok": True,
                "alive": True,
                "phase": None,
                "llm_provider": _provider_name,
                "llm_model": _current_model,
            })
        conversation = entry.manager
        orchestrator = entry.orchestrator
        all_experience_ids = []
        all_experiences = []
        all_skills = []
        all_achievements = []
        professional_summaries = {}
        if orchestrator and orchestrator.master_data:
            experiences = orchestrator.master_data.get('experience', [])
            all_experience_ids = [exp.get('id') for exp in experiences if exp.get('id')]
            for exp in experiences:
                if not isinstance(exp, dict):
                    continue
                ach = exp.get('achievements') or []
                ach_text = []
                for item in ach:
                    if isinstance(item, dict):
                        txt = (item.get('text') or item.get('description') or '').strip()
                    else:
                        txt = str(item).strip()
                    if txt:
                        ach_text.append(txt)
                all_experiences.append({
                    'id': exp.get('id', ''),
                    'title': exp.get('title', ''),
                    'company': exp.get('company', ''),
                    'achievements': ach_text,
                })
            all_achievements = orchestrator.master_data.get('selected_achievements', [])
            professional_summaries = dict(orchestrator.master_data.get('professional_summaries', {}))
            session_summaries = conversation.state.get('session_summaries') or {}
            professional_summaries.update(session_summaries)
            skills_data = orchestrator.master_data.get('skills', [])
            all_skills = conversation.normalize_skills_data(skills_data)
        return jsonify(dataclasses.asdict(StatusResponse(
            position_name=conversation.state.get("position_name"),
            phase=conversation.state.get("phase"),
            llm_provider=_provider_name,
            llm_model=_current_model,
            job_description=bool(conversation.state.get("job_description")),
            job_description_text=conversation.state.get("job_description"),
            job_analysis=conversation.state.get("job_analysis"),
            post_analysis_questions=conversation.state.get("post_analysis_questions") or [],
            post_analysis_answers=conversation.state.get("post_analysis_answers") or {},
            customizations=conversation.state.get("customizations"),
            generated_files=conversation.state.get("generated_files"),
            generation_progress=conversation.state.get("generation_progress") or [],
            persuasion_warnings=conversation.state.get("persuasion_warnings") or [],
            all_experience_ids=all_experience_ids,
            all_experiences=all_experiences,
            all_skills=all_skills,
            all_achievements=all_achievements,
            professional_summaries=professional_summaries,
            copilot_auth=auth_manager.status,
            iterating=bool(conversation.state.get("iterating")),
            reentry_phase=conversation.state.get("reentry_phase"),
            experience_decisions=conversation.state.get("experience_decisions")   or {},
            skill_decisions=conversation.state.get("skill_decisions")         or {},
            achievement_decisions=conversation.state.get("achievement_decisions")   or {},
            publication_decisions=conversation.state.get("publication_decisions")   or {},
            summary_focus_override=conversation.state.get("summary_focus_override"),
            extra_skills=conversation.state.get("extra_skills")            or [],
            extra_skill_matches=conversation.state.get("extra_skill_matches") or {},
            session_file=str(getattr(conversation, "session_file", "") or ""),
            max_skills=int(conversation.state.get("max_skills") or get_config().get("generation.max_skills", 20)),
            achievement_edits=conversation.state.get("achievement_edits")       or {},
            intake=conversation.state.get("intake")                             or {},
        )))

    @bp.get("/api/context-stats")
    def context_stats():
        """Return a rough token-usage estimate for the current session."""
        entry = _get_session()
        conversation = entry.manager
        orchestrator = entry.orchestrator
        MODEL_CONTEXT_WINDOWS = {
            "gemini-2.5-pro":    2_000_000,
            "gemini-2.5-flash":  1_048_576,
            "gemini-2.0-flash":  1_048_576,
            "gemini-1.5-pro":    2_000_000,
            "gemini-1.5-flash":  1_048_576,
            "gpt-4o":              128_000,
            "gpt-4o-mini":         128_000,
            "gpt-4-turbo":         128_000,
            "o1":                  200_000,
            "o3-mini":             200_000,
            "claude-3-5-sonnet":   200_000,
            "claude-3-5-haiku":    200_000,
            "claude-3-opus":       200_000,
            "llama":               128_000,
        }
        try:
            model_name     = getattr(orchestrator.llm, "model", "") or ""
            context_window = 128_000
            for key, size in MODEL_CONTEXT_WINDOWS.items():
                if key.lower() in model_name.lower():
                    context_window = size
                    break

            real_tokens  = _usage_prompt_tokens(getattr(orchestrator.llm, "last_usage", None))
            if real_tokens is not None:
                token_count  = real_tokens
                token_source = "exact"
            else:
                state_chars   = len(json.dumps(conversation.state, default=str))
                history_chars = sum(len(str(m.get("content", ""))) for m in conversation.conversation_history)
                base_overhead = 4_000
                token_count   = (state_chars + history_chars + base_overhead) // 4
                token_source  = "estimated"

            return jsonify({
                "ok":               True,
                "estimated_tokens": token_count,
                "token_source":     token_source,
                "context_window":   context_window,
                "model":            model_name,
                "history_messages": len(conversation.conversation_history),
            })
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 500

    @bp.post("/api/generation-settings")
    def update_generation_settings():
        """Update per-session generation settings (max_skills, etc.)."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        if "max_skills" in data:
            v = data["max_skills"]
            if not isinstance(v, int) or not (1 <= v <= 100):
                return jsonify({"error": "max_skills must be an integer between 1 and 100"}), 400
            with entry.lock:
                conversation.state["max_skills"] = v
                conversation._save_session()
        else:
            with entry.lock:
                conversation._save_session()
        session_registry.touch(sid)
        cfg_default = get_config().get("generation.max_skills", 20)
        return jsonify({
            "ok": True,
            "max_skills": int(conversation.state.get("max_skills") or cfg_default),
        })

    @bp.post("/api/post-analysis-responses")
    def post_analysis_responses():
        """Persist generated post-analysis questions and user answers into session state."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        questions = data.get("questions") or []
        answers = data.get("answers") or {}

        if not isinstance(questions, list):
            return jsonify({"error": "questions must be a list"}), 400
        if not isinstance(answers, dict):
            return jsonify({"error": "answers must be an object"}), 400

        cleaned_questions = []
        for q in questions[:8]:
            if not isinstance(q, dict):
                continue
            question_text = str(q.get("question", "")).strip()
            qtype = str(q.get("type", "clarification")).strip().lower().replace(" ", "_")
            if question_text:
                cleaned_questions.append({
                    "type": qtype[:40] or "clarification",
                    "question": question_text[:2000],
                })

        cleaned_answers = {}
        for key, value in answers.items():
            clean_key = str(key).strip().lower().replace(" ", "_")[:40]
            if not clean_key:
                continue
            clean_value = str(value).strip()
            if clean_value:
                cleaned_answers[clean_key] = clean_value[:1000]

        with entry.lock:
            conversation.state["post_analysis_questions"] = cleaned_questions
            conversation.state["post_analysis_answers"] = cleaned_answers
            conversation._save_session()
        session_registry.touch(sid)

        return jsonify({
            "ok": True,
            "questions_count": len(cleaned_questions),
            "answers_count": len(cleaned_answers),
        })

    @bp.post("/api/post-analysis-questions")
    def post_analysis_questions():
        """Generate post-analysis clarifying questions, preferably via LLM."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}

        analysis = _coerce_to_dict(
            data.get("analysis") or conversation.state.get("job_analysis")
        )

        if not analysis:
            return jsonify({"ok": True, "questions": []})

        prior_qa = conversation.state.get("post_analysis_answers") or None

        questions: List[Dict[str, str]] = []
        source = "fallback"
        try:
            questions = _generate_post_analysis_questions(
                analysis=analysis,
                job_text=conversation.state.get("job_description"),
                prior_qa=prior_qa,
            )
            if questions:
                source = "llm"
        except Exception as e:
            print(f"Question generation failed, using fallback: {e}")

        if not questions:
            questions = _fallback_post_analysis_questions(analysis)

        with entry.lock:
            conversation.state["post_analysis_questions"] = questions
            conversation._save_session()
        session_registry.touch(sid)

        return jsonify({"ok": True, "questions": questions, "source": source})

    @bp.post("/api/post-analysis-draft-response")
    def post_analysis_draft_response():
        """Use the LLM to draft an answer for a single clarification question."""
        entry = _get_session()
        conversation = entry.manager
        llm_client = deps['llm_client_ref']['value']
        try:
            body          = request.get_json(force=True) or {}
            question      = (body.get('question') or '').strip()
            question_type = (body.get('question_type') or '').strip()
            analysis      = body.get('analysis') or {}

            if not question:
                return jsonify({'ok': False, 'error': 'question required'}), 400

            existing_answers = conversation.state.get('post_analysis_answers') or {}

            context_items: List[str] = []
            if isinstance(analysis, dict):
                for key, label in [('job_title', 'Job Title'), ('company_name', 'Company'),
                                   ('role_level', 'Role Level'), ('domain', 'Domain')]:
                    if analysis.get(key):
                        context_items.append(f"{label}: {analysis[key]}")
            context = '\n'.join(context_items) or 'Not available'

            prior_answers_block = (
                '\n'.join(f'- {k}: {v}' for k, v in list(existing_answers.items())[:6])
                if existing_answers else 'None yet.'
            )

            prompt = (
                'You are helping a job applicant answer a clarifying question about their CV preferences.\n'
                'The question was asked to better tailor their CV for a specific job.\n\n'
                f'Job context:\n{context}\n\n'
                f'Previously answered questions:\n{prior_answers_block}\n\n'
                f'Question to answer:\n"{question}"\n\n'
                'Write a concise, first-person DRAFT answer (1–3 sentences) the applicant could give.\n'
                'Base it on the most sensible choice for someone applying to this role.\n'
                'Write only the answer text. No preamble, no labels.'
            )

            try:
                draft = llm_client.chat(
                    messages=[
                        {'role': 'system', 'content': 'You write concise draft answers for job application clarifying questions.'},
                        {'role': 'user',   'content': prompt},
                    ],
                    temperature=0.7,
                )
            except Exception as e:
                err_str = str(e)
                if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_str.lower() or 'rate' in err_str.lower():
                    return jsonify({'ok': False, 'error': 'Rate limit reached — please wait a moment and try again.', 'rate_limited': True}), 429
                return jsonify({'ok': False, 'error': f'LLM error: {e}'}), 500

            return jsonify({'ok': True, 'text': draft.strip()})
        except Exception as e:
            return jsonify({'ok': False, 'error': str(e)}), 500

    @bp.get("/api/intake-metadata")
    def intake_metadata():
        """Return extracted or confirmed intake metadata for the current session."""
        entry = _get_session()
        conversation = entry.manager
        intake = conversation.state.get('intake') or {}
        if intake.get('confirmed'):
            return jsonify({
                'role':         intake.get('role'),
                'company':      intake.get('company'),
                'date_applied': intake.get('date_applied'),
                'confirmed':    True,
            })
        extracted = conversation.extract_intake_metadata()
        return jsonify({
            'role':         extracted.get('role'),
            'company':      extracted.get('company'),
            'date_applied': extracted.get('date_applied'),
            'confirmed':    False,
        })

    @bp.post("/api/confirm-intake")
    def confirm_intake():
        """Persist user-confirmed intake metadata and immediately save the session."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        intake = {
            'role':         (data.get('role') or '').strip() or None,
            'company':      (data.get('company') or '').strip() or None,
            'date_applied': (data.get('date_applied') or '').strip() or None,
            'confirmed':    True,
        }
        with entry.lock:
            conversation.apply_confirmed_intake(
                intake.get('role'),
                intake.get('company'),
                intake.get('date_applied'),
            )
        session_registry.touch(sid)
        return jsonify({'ok': True, 'intake': intake})

    @bp.get("/api/prior-clarifications")
    def prior_clarifications():
        """Return prior post-analysis answers from the most recent session with a similar role."""
        from pathlib import Path
        entry = _get_session()
        conversation = entry.manager
        current_intake = conversation.state.get('intake') or {}
        current_role   = (current_intake.get('role') or '').lower()

        limit = min(int(request.args.get('limit', 3)), 10)

        _STOP = {
            'a', 'an', 'the', 'of', 'in', 'at', 'for', 'to', 'and', 'or',
            'is', 'be', 'with', 'on', 'by', 'senior', 'junior', 'lead',
        }

        def _kw(role: str) -> set:
            return {w for w in role.split() if w not in _STOP and len(w) > 2}

        current_kw = _kw(current_role)

        try:
            from utils.config import get_config as _get_cfg
            cfg      = _get_cfg()
            out_base = Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()
            trash    = out_base / '.trash'
            matches  = []
            for sf in sorted(out_base.rglob('session.json'), reverse=True):
                if trash in sf.parents:
                    continue
                try:
                    with open(sf, 'r', encoding='utf-8') as fh:
                        sd = json.load(fh)
                    st      = sd.get('state', {})
                    answers = st.get('post_analysis_answers') or {}
                    if not answers:
                        continue
                    prior_intake = st.get('intake') or {}
                    prior_role   = (prior_intake.get('role') or st.get('position_name') or '').lower()
                    overlap      = current_kw & _kw(prior_role)
                    if not overlap:
                        continue
                    matches.append({
                        'position_name': st.get('position_name'),
                        'role':          prior_intake.get('role'),
                        'company':       prior_intake.get('company'),
                        'date':          prior_intake.get('date_applied') or sd.get('timestamp', '')[:10],
                        'answers':       answers,
                        'overlap':       sorted(overlap),
                    })
                    if len(matches) >= limit:
                        break
                except Exception:
                    pass
            return jsonify({'found': len(matches) > 0, 'matches': matches})
        except Exception as e:
            return jsonify({'found': False, 'matches': [], 'error': str(e)})

    return bp
