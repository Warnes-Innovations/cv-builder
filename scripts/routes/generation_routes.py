"""CV generation, download, finalise, and harvest routes."""
import json
import re
import subprocess
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from flask import Blueprint, jsonify, request, send_file

# Live blueprint module registered by `scripts.web_app.create_app()`.

from utils.session_data_view import SessionDataView


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


def _compile_harvest_candidates(conversation) -> List[Dict[str, Any]]:
    """Return candidate write-back items for the current session."""
    candidates: List[Dict[str, Any]] = []

    approved_rewrites = conversation.state.get('approved_rewrites') or []
    customizations    = conversation.state.get('customizations') or {}
    post_answers      = conversation.state.get('post_analysis_answers') or {}

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

    for skill in customizations.get('new_skills_added') or []:
        if not skill:
            continue
        candidates.append({
            'id':        f"skill_{skill.replace(' ', '_')}",
            'type':      'new_skill',
            'label':     f"New skill — {skill}",
            'original':  '(not in master data)',
            'proposed':  skill,
            'rationale': 'Skill was added during the skills review step.',
        })

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

    for key, val in post_answers.items():
        if not isinstance(val, str):
            continue
        if key.startswith('skill_gap_') and val.lower() in ('yes', 'true', '1'):
            skill_name = key[len('skill_gap_'):]
            cand_id    = f'skill_gap_{skill_name}'
            if not any(c['id'] == cand_id for c in candidates):
                candidates.append({
                    'id':        cand_id,
                    'type':      'skill_gap_confirmed',
                    'label':     f"Confirmed skill — {skill_name}",
                    'original':  '(not in master data)',
                    'proposed':  skill_name,
                    'rationale': 'You confirmed this skill in response to a clarifying question.',
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


def _harvest_add_skill(master: Dict, skill_name: str) -> bool:
    """Add ``skill_name`` to master skills data; returns True if actually added."""
    skills = master.get('skills')
    if isinstance(skills, list):
        if skill_name not in skills:
            skills.append(skill_name)
            return True
        return False
    elif isinstance(skills, dict):
        for cat_key, cat_val in skills.items():
            cat_list: List[str] = []
            if isinstance(cat_val, list):
                cat_list = cat_val
            elif isinstance(cat_val, dict) and isinstance(cat_val.get('skills'), list):
                cat_list = cat_val['skills']
            if cat_key.lower() in ('other', 'general', 'additional'):
                if skill_name not in cat_list:
                    cat_list.append(skill_name)
                    return True
                return False
        skills['Other'] = [skill_name]
        return True
    master['skills'] = [skill_name]
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

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

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
            "page_length_warning":       gen.get("page_length_warning", False),
            "layout_instructions_count": len(gen.get("layout_instructions", [])),
            "ats_score":                 gen.get("ats_score"),
            "final_generated_at":        gen.get("final_generated_at"),
        })

    @bp.post("/api/cv/generate-preview")
    def generate_cv_preview():
        """Generate an HTML preview of the CV and store it in generation_state."""
        import uuid as _u
        entry = get_session()
        conv  = entry.manager
        if not conv.state.get("job_analysis"):
            return jsonify({"error": "Run job analysis first."}), 400

        html_str = None

        customizations = conv.state.get("customizations")
        if customizations:
            try:
                approved_rewrites = conv.state.get("approved_rewrites") or []
                spell_audit       = _get_spell_audit_from_state(conv.state)
                html_str = conv.orchestrator.render_html_preview(
                    job_analysis=conv.state["job_analysis"],
                    customizations=customizations,
                    approved_rewrites=approved_rewrites,
                    spell_audit=spell_audit,
                )
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
        gen = conv.state.setdefault("generation_state", {})
        gen.update({
            "phase":                "layout_review",
            "preview_html":         html_str,
            "preview_request_id":   prev_id,
            "preview_generated_at": now,
            "layout_confirmed":     False,
        })
        if "layout_instructions" not in gen:
            gen["layout_instructions"] = []
        conv._save_session()
        return jsonify({
            "ok":                  True,
            "html":                html_str,
            "preview_request_id":  prev_id,
            "page_count_estimate": gen.get("page_count_estimate"),
            "page_length_warning": gen.get("page_length_warning", False),
        })

    @bp.post("/api/cv/layout-refine")
    def refine_cv_layout():
        """Apply a layout instruction to the stored preview and return updated HTML."""
        import uuid as _u
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
            return jsonify({
                "ok":           False,
                "error":        result["error"],
                "question":     result.get("question"),
                "details":      result.get("details"),
                "raw_response": result.get("raw_response"),
            })

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

        gen = conv.state.setdefault("generation_state", {})
        gen["preview_html"]        = updated_html
        gen["preview_request_id"]  = prev_id
        gen["preview_generated_at"] = now
        gen["phase"]               = "layout_review"
        gen["layout_confirmed"]    = False
        gen.setdefault("layout_instructions", []).append(instruction_record)
        conv._save_session()

        return jsonify({
            "ok":                 True,
            "html":               updated_html,
            "summary":            result.get("summary", ""),
            "confidence":         result.get("confidence"),
            "preview_request_id": prev_id,
        })

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
        customizations = dict(conv.state.get("customizations") or {})
        body  = request.get_json(silent=True) or {}
        basis = body.get("basis", "review_checkpoint")

        skill_decisions = conv.state.get("skill_decisions") or {}
        extra_skills    = conv.state.get("extra_skills") or []
        kept_skills = [k for k, v in skill_decisions.items() if v != "exclude"]
        kept_skills += [s for s in extra_skills if s not in kept_skills]
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
        if achievement_edits and not customizations.get("approved_rewrites"):
            bullet_rewrites = []
            for bullets in achievement_edits.values():
                if isinstance(bullets, list):
                    bullet_rewrites.extend(
                        {"rewritten": b, "section": "experience"}
                        for b in bullets if isinstance(b, str) and b.strip()
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
        customizations = summary_view.materialize_summary_selection()
        if customizations.get("selected_summary"):
            # duckflow: {
            #   "id": "summary_api_ats_materialize_live",
            #   "kind": "api",
            #   "status": "live",
            #   "handles": ["POST /api/cv/ats-score"],
            #   "reads": ["state:session_summaries.ai_generated", "state:summary_focus_override"],
            #   "writes": ["customizations:selected_summary"],
            #   "notes": "Live ATS scoring route materializes the selected summary into generation customizations."
            # }
            pass

        score = _compute_ats_score(job_analysis, customizations, basis=basis)
        gen = conv.state.setdefault("generation_state", {})
        gen["ats_score"] = score
        conv._save_session()
        return jsonify({"ok": True, "ats_score": score})

    @bp.post("/api/cv/generate-final")
    def generate_cv_final():
        """Regenerate human-readable HTML+PDF from the confirmed preview; mark final_complete."""
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
        except Exception as exc:
            import flask
            flask.current_app.logger.error("generate_final_from_confirmed_html failed: %s", exc)
            return jsonify({"error": f"Final generation failed: {exc}"}), 500

        now = datetime.now().isoformat()
        gen = conv.state.setdefault("generation_state", {})
        gen.update({
            "phase": "final_complete",
            "final_generated_at": now,
            "final_output_paths": final_paths,
        })
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
        return jsonify({"ok": True, "generated_at": now, "outputs": outputs})

    # ------------------------------------------------------------------
    # Finalise
    # ------------------------------------------------------------------

    @bp.post("/api/finalise")
    def finalise_application():
        """Finalise the application: update metadata, upsert response library, git commit."""
        from utils.conversation_manager import Phase
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
                        git_error = result.stderr.strip() or result.stdout.strip()
                except Exception as git_exc:
                    git_error = str(git_exc)

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
            except Exception as e:
                traceback.print_exc()
                return jsonify({'error': str(e)}), 500

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
        except Exception as e:
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

    @bp.post("/api/harvest/apply")
    def harvest_apply():
        """Write selected harvest candidates back to Master_CV_Data.json and git commit."""
        entry = get_session()
        validate_owner(entry)
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
                        skill_name = cand['proposed']
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
                        git_error = result.stderr.strip() or result.stdout.strip()
                except Exception as git_exc:
                    git_error = str(git_exc)

                written_count = sum(1 for d in diff_summary if d.get('applied'))
                session_registry.touch(sid)
                return jsonify({
                    'ok':           True,
                    'written_count': written_count,
                    'diff_summary': diff_summary,
                    'commit_hash':  commit_hash,
                    'git_error':    git_error,
                })
            except Exception as e:
                traceback.print_exc()
                return jsonify({'error': str(e)}), 500

    return bp
