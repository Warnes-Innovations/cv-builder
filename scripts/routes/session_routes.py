# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Session management routes — list, load, save, delete, rename, trash, new/claim/takeover/evict.
"""
import json
from datetime import datetime
from pathlib import Path

from flask import Blueprint, jsonify, request

# Live blueprint module registered by `scripts.web_app.create_app()`.

from utils.config import get_config
from utils.session_registry import SessionNotFoundError, SessionOwnedError


def create_blueprint(deps):
    bp = Blueprint('session', __name__)

    _get_session = deps['get_session']
    _validate_owner = deps['validate_owner']
    session_registry = deps['session_registry']
    _app_config = deps['app_config']
    output_dir = deps.get('output_dir')
    SessionItem = deps['SessionItem']
    SessionListResponse = deps['SessionListResponse']

    def _output_base() -> Path:
        if output_dir:
            return Path(output_dir).expanduser()
        cfg = get_config()
        return Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()

    @bp.post("/api/save")
    def save():
        entry = _get_session()
        conversation = entry.manager
        try:
            with entry.lock:
                conversation._save_session()
            session_file = str(conversation.session_dir / "session.json") if conversation.session_dir else None
            return jsonify({"ok": True, "session_file": session_file})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.get("/api/sessions")
    def list_sessions():
        """List saved sessions, most recent first."""
        try:
            output_base = _output_base()
            trash_dir   = output_base / '.trash'
            sessions = []
            if output_base.exists():
                for session_file in sorted(output_base.rglob("session.json"), reverse=True):
                    if trash_dir in session_file.parents:
                        continue
                    try:
                        with open(session_file) as f:
                            data = json.load(f)
                        state = data.get('state', {})
                        sessions.append(SessionItem(
                            path=str(session_file),
                            position_name=state.get('position_name') or session_file.parent.name,
                            timestamp=data.get('timestamp', ''),
                            phase=state.get('phase', ''),
                            has_job=bool(state.get('job_description')),
                            has_analysis=bool(state.get('job_analysis')),
                            has_customizations=bool(state.get('customizations')),
                        ))
                    except Exception:
                        pass
            return jsonify(SessionListResponse(sessions=sessions[:20]).to_dict())
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.get("/api/load-items")
    def load_items():
        """Merged list of saved sessions and server-side job files for the Load Job panel."""
        items = []

        try:
            output_base = _output_base()
            trash_dir   = output_base / '.trash'
            if output_base.exists():
                for session_file in sorted(output_base.rglob("session.json"), reverse=True):
                    if trash_dir in session_file.parents:
                        continue
                    try:
                        with open(session_file) as f:
                            data = json.load(f)
                        state = data.get('state', {})
                        items.append({
                            "kind":         "session",
                            "path":         str(session_file),
                            "label":        state.get('position_name') or session_file.parent.name,
                            "timestamp":    data.get('timestamp', ''),
                            "phase":        state.get('phase', ''),
                            "has_job":      bool(state.get('job_description')),
                            "has_analysis": bool(state.get('job_analysis')),
                            "has_cv":       bool(state.get('generated_files')),
                        })
                    except Exception:
                        pass
        except Exception:
            pass

        items = items[:20]

        try:
            sample_jobs_dir = Path(__file__).parent.parent.parent / "sample_jobs"
            if sample_jobs_dir.exists():
                for f in sorted(sample_jobs_dir.iterdir()):
                    if f.suffix.lower() in {'.txt', '.md', '.html', '.pdf', '.docx', '.rtf'}:
                        label = f.stem.replace('_', ' ').replace('-', ' ').title()
                        items.append({
                            "kind":      "file",
                            "path":      str(f),
                            "filename":  f.name,
                            "label":     label,
                            "timestamp": "",
                            "phase":     "",
                        })
        except Exception:
            pass

        return jsonify({"items": items})

    @bp.post("/api/load-session")
    def load_session_endpoint():
        """Load a saved session file and register it in the session registry."""
        data = request.get_json(silent=True) or {}
        path = data.get("path")
        if not path:
            return jsonify({"error": "Missing path"}), 400
        session_file = Path(path)
        if not session_file.exists():
            return jsonify({"error": f"Session file not found: {path}"}), 404
        try:
            sid, entry = session_registry.load_from_file(str(session_file), _app_config)
            conversation = entry.manager
            return jsonify({
                "ok":            True,
                "session_id":    sid,
                "redirect_url":  f"/?session={sid}",
                "session_file":  str(session_file),
                "position_name": conversation.state.get("position_name"),
                "phase":         conversation.state.get("phase"),
                "has_job":       bool(conversation.state.get("job_description")),
                "has_analysis":  bool(conversation.state.get("job_analysis")),
                "history_count": len(conversation.conversation_history),
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.post("/api/delete-session")
    def delete_session_endpoint():
        """Move a session directory to the .trash folder (recoverable)."""
        data = request.get_json(silent=True) or {}
        path_param  = data.get("path") or data.get("session_id")
        if not path_param:
            return jsonify({"error": "Missing path or session_id"}), 400

        try:
            output_base = _output_base()
            trash_dir   = output_base / '.trash'

            def _move_to_trash(job_dir: Path):
                trash_dir.mkdir(parents=True, exist_ok=True)
                dest = trash_dir / job_dir.name
                if dest.exists():
                    dest = trash_dir / f"{job_dir.name}_{int(datetime.now().timestamp())}"
                import shutil as _shutil
                _shutil.move(str(job_dir), str(dest))
                print(f"Trashed: {job_dir} → {dest}")

            candidate = Path(path_param)
            if candidate.exists() and candidate.name == 'session.json':
                job_dir = candidate.parent
                if job_dir.resolve().is_relative_to(output_base.resolve()):
                    _move_to_trash(job_dir)
                    return jsonify({"success": True, "message": "Session moved to Trash"})
                else:
                    return jsonify({"error": "Path is outside the output directory"}), 400

            deleted = False
            for session_file in output_base.rglob('session.json'):
                if trash_dir in session_file.parents:
                    continue
                job_dir = session_file.parent
                if path_param in job_dir.name or job_dir.name == path_param:
                    _move_to_trash(job_dir)
                    deleted = True
                    break

            if deleted:
                return jsonify({"success": True, "message": "Session moved to Trash"})
            return jsonify({"error": f"Session not found: {path_param}"}), 404

        except Exception as e:
            print(f"ERROR in delete_session: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @bp.get("/api/trash")
    def list_trash():
        """List sessions in the .trash folder."""
        try:
            output_base = _output_base()
            trash_dir   = output_base / '.trash'
            items = []
            if trash_dir.exists():
                for session_file in sorted(trash_dir.rglob("session.json"), reverse=True):
                    try:
                        with open(session_file) as f:
                            data = json.load(f)
                        state = data.get('state', {})
                        items.append({
                            "path":          str(session_file),
                            "position_name": state.get('position_name') or session_file.parent.name,
                            "timestamp":     data.get('timestamp', ''),
                            "phase":         state.get('phase', ''),
                        })
                    except Exception:
                        pass
            return jsonify({"items": items, "count": len(items)})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.post("/api/trash/restore")
    def trash_restore():
        """Restore a trashed session back to the output directory."""
        data = request.get_json(silent=True) or {}
        path_param = data.get("path")
        if not path_param:
            return jsonify({"error": "Missing path"}), 400
        try:
            output_base = _output_base()
            trash_dir   = output_base / '.trash'
            candidate   = Path(path_param)
            if not candidate.exists() or candidate.name != 'session.json':
                return jsonify({"error": "Session file not found"}), 404
            job_dir = candidate.parent
            if not job_dir.resolve().is_relative_to(trash_dir.resolve()):
                return jsonify({"error": "Path is not inside trash"}), 400
            dest = output_base / job_dir.name
            if dest.exists():
                dest = output_base / f"{job_dir.name}_restored_{int(datetime.now().timestamp())}"
            import shutil as _shutil
            _shutil.move(str(job_dir), str(dest))
            print(f"Restored: {job_dir} → {dest}")
            return jsonify({"success": True, "message": "Session restored"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.post("/api/trash/delete")
    def trash_delete_one():
        """Permanently delete a single item from trash."""
        data = request.get_json(silent=True) or {}
        path_param = data.get("path")
        if not path_param:
            return jsonify({"error": "Missing path"}), 400
        try:
            output_base = _output_base()
            trash_dir   = output_base / '.trash'
            candidate   = Path(path_param)
            if not candidate.exists() or candidate.name != 'session.json':
                return jsonify({"error": "Session file not found"}), 404
            job_dir = candidate.parent
            if not job_dir.resolve().is_relative_to(trash_dir.resolve()):
                return jsonify({"error": "Path is not inside trash"}), 400
            import shutil as _shutil
            _shutil.rmtree(job_dir)
            print(f"Permanently deleted: {job_dir}")
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.post("/api/trash/empty")
    def trash_empty():
        """Permanently delete everything in the .trash folder."""
        try:
            output_base = _output_base()
            trash_dir   = output_base / '.trash'
            if trash_dir.exists():
                import shutil as _shutil
                _shutil.rmtree(trash_dir)
                trash_dir.mkdir()
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.post("/api/rename-current-session")
    def rename_current_session():
        """Rename the currently active session (no path needed)."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        new_name = (data.get("new_name") or "").strip()[:200]
        if not new_name:
            return jsonify({"error": "Missing new_name"}), 400
        with entry.lock:
            conversation.state["position_name"] = new_name
            conversation._save_session()
        session_registry.touch(sid)
        return jsonify({"ok": True, "new_name": new_name})

    @bp.post("/api/rename-session")
    def rename_session():
        """Rename a session's position_name in its session.json file."""
        data = request.get_json(silent=True) or {}
        path     = data.get("path")
        new_name = (data.get("new_name") or "").strip()[:200]
        if not path:
            return jsonify({"error": "Missing path"}), 400
        if not new_name:
            return jsonify({"error": "Missing new_name"}), 400
        session_file = Path(path)
        if not session_file.exists():
            return jsonify({"error": f"Session not found: {path}"}), 404
        try:
            output_base = _output_base()
            if not session_file.resolve().is_relative_to(output_base.resolve()):
                return jsonify({"error": "Path is outside the output directory"}), 400
        except Exception:
            pass
        try:
            with open(session_file, "r", encoding="utf-8") as f:
                session_data = json.load(f)
            session_data.setdefault("state", {})["position_name"] = new_name
            with open(session_file, "w", encoding="utf-8") as f:
                json.dump(session_data, f, indent=2, default=str)
            for _entry in session_registry.all_active():
                _active = getattr(_entry.manager, "session_file", None)
                if _active and str(Path(_active).resolve()) == str(session_file.resolve()):
                    _entry.manager.state["position_name"] = new_name
                    _entry.manager._save_session()
            return jsonify({"ok": True, "new_name": new_name})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.get("/api/positions")
    def positions():
        entry = _get_session()
        conversation = entry.manager
        try:
            names = conversation._list_positions()
            return jsonify({"positions": names})
        except Exception as e:
            return jsonify({"error": str(e), "positions": []}), 500

    @bp.post("/api/position")
    def set_position():
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        open_latest = bool(data.get("open_latest"))
        if not name:
            return jsonify({"error": "Missing name"}), 400
        with entry.lock:
            conversation.state["position_name"] = name
            loaded = False
            if open_latest:
                loaded = conversation._load_latest_session_for_position(name)
        session_registry.touch(sid)
        return jsonify({"ok": True, "loaded": loaded, "position_name": name})

    @bp.get("/api/history")
    def history():
        entry = _get_session()
        conversation = entry.manager
        return jsonify({
            "history": conversation.conversation_history,
            "phase": conversation.state.get("phase"),
        })

    # ── Multi-tab session management ─────────────────────────────────────────

    @bp.post("/api/sessions/new")
    def sessions_new():
        """Create a new session and return its ID."""
        sid, _entry = session_registry.create(_app_config)
        return jsonify({"ok": True, "session_id": sid, "redirect_url": f"/?session={sid}"})

    @bp.post("/api/sessions/claim")
    def sessions_claim():
        """Claim ownership of a session with a tab token."""
        body = request.get_json(silent=True) or {}
        sid = body.get("session_id")
        token = body.get("owner_token")
        if not sid or not token:
            return jsonify({"error": "session_id and owner_token required"}), 400
        try:
            session_registry.claim(sid, token)
            return jsonify({"ok": True})
        except SessionNotFoundError as e:
            return jsonify({
                "ok": False,
                "error": "session_not_found",
                "message": str(e),
            })
        except SessionOwnedError as e:
            return jsonify({"error": "session_owned", "message": str(e)}), 409

    @bp.post("/api/sessions/takeover")
    def sessions_takeover():
        """Forcibly take over a session (e.g. after page reload)."""
        body = request.get_json(silent=True) or {}
        sid = body.get("session_id")
        token = body.get("owner_token")
        if not sid or not token:
            return jsonify({"error": "session_id and owner_token required"}), 400
        try:
            session_registry.takeover(sid, token)
            return jsonify({"ok": True})
        except SessionNotFoundError as e:
            return jsonify({"error": str(e)}), 404

    @bp.get("/api/sessions/active")
    def sessions_active():
        """Return a list of all active in-memory sessions."""
        entries = session_registry.all_active()
        requester_token = request.args.get("owner_token")
        return jsonify({
            "sessions": [
                {
                    "session_id":          e.session_id,
                    "position_name":       (e.manager.state or {}).get("position_name"),
                    "phase":               (e.manager.state or {}).get("phase"),
                    "created":             e.created.isoformat(),
                    "last_modified":       e.last_modified.isoformat(),
                    "claimed":             e.owner_token is not None,
                    "owned_by_requester":  bool(
                        requester_token
                        and e.owner_token
                        and requester_token == e.owner_token
                    ),
                }
                for e in entries
            ]
        })

    @bp.delete("/api/sessions/<session_id>/evict")
    def sessions_evict(session_id):
        """Save and remove a specific session from the registry."""
        entry = session_registry.get(session_id)
        if entry is None:
            return jsonify({"error": f"Session not found: {session_id}"}), 404
        _validate_owner(entry)
        try:
            entry.manager._save_session()
        except Exception:
            pass
        session_registry.remove(session_id)
        return jsonify({"ok": True})

    return bp
