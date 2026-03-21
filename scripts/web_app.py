#!/usr/bin/env python3
"""
Minimal Web UI for LLM-Driven CV Generator

Serves a single-page web app with endpoints to:
- Submit a job description
- Send chat messages to the assistant
- View current state
- Save session

Run:
    python scripts/web_app.py

Then open http://localhost:5001
"""

import argparse
import copy
import dataclasses
import json
import os
import subprocess
import sys
import threading
import traceback
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

from flask import Flask, jsonify, redirect, request, send_file, send_from_directory, url_for
import requests
from urllib.parse import urlparse
import re
from bs4 import BeautifulSoup

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Ensure scripts are importable
sys.path.insert(0, str(Path(__file__).parent))

from utils.config import get_config, validate_config, ConfigurationError
from utils.llm_client import get_llm_provider, PROVIDER_MODELS, PROVIDER_BILLING, MODEL_INFO
from utils.cv_orchestrator import CVOrchestrator, validate_ats_report
from utils.conversation_manager import ConversationManager, Phase
from utils.llm_client import LLMError, LLMAuthError, LLMRateLimitError, LLMContextLengthError
from utils.copilot_auth import CopilotAuthManager
from utils.pricing_cache import (
    get_cached_pricing, get_pricing_updated_at, get_pricing_source,
    refresh_pricing_cache, maybe_refresh_in_background, lookup_runtime_pricing_bulk, STATIC_PRICING,
)
from utils.spell_checker import SpellChecker
from utils.master_data_validator import validate_master_data_file
from utils.session_registry import (
    SessionRegistry, SessionNotFoundError, SessionOwnedError
)


# ---------------------------------------------------------------------------
# API response DTOs — typed dataclasses for the most critical endpoints.
#
# Using dataclasses ensures:
#   • All fields are always present in the JSON response (no silent omissions).
#   • Shape changes (field additions / renames) surface as TypeError at the call site.
#   • The expected response contract is documented in one place.
#
# JS mirror validators live in web/app.js (parseStatusResponse, etc.).
# Update both sides together when adding/removing fields.
# ---------------------------------------------------------------------------

@dataclass
class StatusResponse:
    """Response shape for GET /api/status."""
    position_name: Optional[str]
    phase: Optional[str]
    llm_provider: str
    llm_model: Optional[str]
    job_description: bool
    job_description_text: Optional[str]
    job_analysis: Optional[Dict[str, Any]]
    post_analysis_questions: List[Any]
    post_analysis_answers: Dict[str, Any]
    customizations: Optional[Dict[str, Any]]
    generated_files: Optional[Dict[str, Any]]
    generation_progress: List[Any]
    persuasion_warnings: List[Any]
    all_experience_ids: List[str]
    all_experiences: List[Dict[str, Any]]
    all_skills: List[Any]
    all_achievements: List[Any]
    professional_summaries: Dict[str, Any]
    copilot_auth: Dict[str, Any]
    iterating: bool
    reentry_phase: Optional[str]
    experience_decisions: Dict[str, Any]
    skill_decisions: Dict[str, Any]
    achievement_decisions: Dict[str, Any]
    publication_decisions: Dict[str, Any]
    summary_focus_override: Optional[str]
    extra_skills: List[Any]
    extra_skill_matches: Dict[str, List[str]]
    session_file: str
    max_skills: int
    achievement_edits: Dict[str, Any]
    intake: Dict[str, Any]


@dataclass
class SessionItem:
    """One entry in the SessionListResponse."""
    path: str
    position_name: str
    timestamp: str
    phase: str
    has_job: bool
    has_analysis: bool
    has_customizations: bool


@dataclass
class SessionListResponse:
    """Response shape for GET /api/sessions."""
    sessions: List[SessionItem]

    def to_dict(self) -> Dict[str, Any]:
        return {"sessions": [dataclasses.asdict(s) for s in self.sessions]}


@dataclass
class RewritesResponse:
    """Response shape for GET /api/rewrites."""
    ok: bool
    rewrites: List[Any]
    persuasion_warnings: List[Any]
    phase: str


@dataclass
class MessageResponse:
    """Response shape for POST /api/message."""
    ok: bool
    response: Any
    phase: Optional[str]


@dataclass
class ActionResponse:
    """Response shape for POST /api/action."""
    ok: bool
    result: Any
    phase: Optional[str]


# ---------------------------------------------------------------------------
# Model-catalog helpers (module-level for testability)
# ---------------------------------------------------------------------------

_CATALOG_LIST_MODELS_CAPABLE: set[str] = {"openai", "anthropic", "gemini", "groq"}
_CATALOG_STATIC_ONLY: set[str] = {"copilot-oauth", "copilot", "github", "local"}


def _catalog_provider_api_key(provider: str) -> Optional[str]:
    if provider == "openai":
        return os.getenv("OPENAI_API_KEY")
    if provider == "anthropic":
        return os.getenv("ANTHROPIC_API_KEY")
    if provider == "gemini":
        return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if provider == "groq":
        return os.getenv("GROQ_API_KEY")
    return None


def _catalog_provider_api_base(provider: str) -> Optional[str]:
    if provider == "openai":
        return os.getenv("OPENAI_BASE_URL")
    if provider == "anthropic":
        return os.getenv("ANTHROPIC_BASE_URL")
    if provider == "gemini":
        return os.getenv("GOOGLE_GEMINI_BASE_URL")
    if provider == "groq":
        return os.getenv("GROQ_BASE_URL")
    return None


def _catalog_normalize_model_id(model_id: str) -> str:
    """Normalize Gemini-style 'models/gemini-2.5-flash' IDs to bare model names."""
    if model_id.startswith("models/"):
        return model_id.split("/", 1)[1]
    return model_id


def _catalog_discover_provider_models(provider: str) -> Optional[List[str]]:
    """Return runtime model list for providers that support list_models, or None."""
    if provider not in _CATALOG_LIST_MODELS_CAPABLE or provider in _CATALOG_STATIC_ONLY:
        return None

    api_key = _catalog_provider_api_key(provider)
    if not api_key:
        return None

    try:
        from any_llm import list_models as anyllm_list_models
    except Exception:
        return None

    try:
        kwargs: Dict[str, Any] = {
            "provider": provider,
            "api_key":  api_key,
        }
        api_base = _catalog_provider_api_base(provider)
        if api_base:
            kwargs["api_base"] = api_base

        models = anyllm_list_models(**kwargs)
        names: List[str] = []
        for item in models:
            model_id = getattr(item, "id", None)
            if model_id is None:
                model_id = str(item)
            model_id = _catalog_normalize_model_id(str(model_id))
            if model_id:
                names.append(model_id)

        # Keep order stable and deduplicate.
        unique: List[str] = []
        seen: set[str] = set()
        for name in names:
            if name in seen:
                continue
            unique.append(name)
            seen.add(name)
        return unique
    except Exception:
        return None


# ── Dynamic model catalog cache ───────────────────────────────────────────────
# Populated at startup (background) and on demand; keyed by provider name.
# Allows /api/model and /api/model-catalog to return the full live model list
# without a blocking API call on every request.

_dynamic_model_cache: Dict[str, List[str]] = {}
_dynamic_model_cache_lock = threading.Lock()
 

def _get_available_models(provider: str, current_model: Optional[str] = None) -> List[str]:
    """Return the best-available model list for a provider.

    Preference order: cached live list > static PROVIDER_MODELS fallback.
    If *current_model* is provided and not already in the list it is prepended
    so the active model is always visible in the selector.
    """
    cached = _dynamic_model_cache.get(provider)
    models: List[str] = list(cached) if cached is not None else list(PROVIDER_MODELS.get(provider, []))
    if current_model and current_model not in models:
        models = [current_model] + models
    return models


def _refresh_dynamic_model_cache(provider: str) -> None:
    """Fetch the live model list for *provider* and store it in the cache (blocking)."""
    discovered = _catalog_discover_provider_models(provider)
    if discovered:
        with _dynamic_model_cache_lock:
            _dynamic_model_cache[provider] = discovered


def _maybe_refresh_dynamic_cache_in_background(provider: str) -> None:
    """Kick off a background refresh for *provider* if not already cached."""
    if provider not in _CATALOG_LIST_MODELS_CAPABLE:
        return
    if provider in _dynamic_model_cache:
        return
    t = threading.Thread(
        target=_refresh_dynamic_model_cache,
        args=(provider,),
        daemon=True,
        name=f"model-catalog-{provider}",
    )
    t.start()


def _text_similarity(query: str, target: str) -> float:
    """Simple word-overlap similarity score (0–1) for response library search."""
    _STOP = {
        'a', 'an', 'the', 'and', 'or', 'for', 'in', 'of', 'to', 'is',
        'are', 'was', 'were', 'i', 'my', 'your', 'we', 'our', 'this',
        'that', 'it', 'with', 'as', 'by', 'at', 'on', 'be', 'have',
        'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can',
        'could', 'should', 'may', 'might', 'from', 'into', 'about',
    }
    def _tok(s: str) -> set:
        return {w.lower() for w in re.findall(r'\w+', s) if w.lower() not in _STOP and len(w) > 2}
    q_tok = _tok(query)
    t_tok = _tok(target)
    if not q_tok or not t_tok:
        return 0.0
    return len(q_tok & t_tok) / max(len(q_tok), len(t_tok))


_SCREENING_FORMAT_GUIDANCE: dict = {
    'direct':    ('Direct/Concise',    '150–200 words',
                  'Be clear and direct. State the answer, give one concrete example, close concisely.'),
    'star':      ('STAR',              '250–350 words',
                  'Use the STAR framework: Situation, Task, Action, Result. 1–2 sentences each.'),
    'technical': ('Technical Detail', '400–500 words',
                  'Provide full technical depth: context, methodology, tools/technologies, outcomes with metrics.'),
}


def _web_app_build_objects(args, auth_manager):
    """
    Instantiate LLMClient, CVOrchestrator, and ConversationManager from CLI args.

    Defined at module level so tests can patch ``CVOrchestrator`` and
    ``ConversationManager`` in ``scripts.web_app`` and have the patches
    take effect when ``session_registry.create()`` calls this factory.
    """
    llm_client = get_llm_provider(
        provider=args.llm_provider,
        model=args.model,
        auth_manager=auth_manager,
    )
    orchestrator = CVOrchestrator(
        master_data_path=args.master_data,
        publications_path=args.publications,
        output_dir=args.output_dir,
        llm_client=llm_client,
    )
    conversation = ConversationManager(orchestrator=orchestrator, llm_client=llm_client)
    return conversation, orchestrator


def _coerce_to_dict(value: Any) -> Dict[str, Any]:
    """Return value as a dict, parsing from JSON string if necessary.

    Defensive helper for session state fields that older sessions may have
    persisted as a JSON string rather than a nested object.
    """
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
    return {}


def _extract_json_payload(text: str) -> Any:
    """Best-effort extraction of JSON array/object from model output.

    Uses bracket-depth counting to locate the outermost JSON container
    rather than greedy regexes, so it handles multiple code blocks,
    backticks inside strings, and JSON embedded in prose correctly.
    """
    if not text:
        return None

    # Fast path: already clean JSON.
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find the first JSON container character.
    start = -1
    open_char = ''
    for i, ch in enumerate(text):
        if ch in ('{', '['):
            start = i
            open_char = ch
            break
    if start == -1:
        return None

    close_char = '}' if open_char == '{' else ']'
    depth = 0
    in_string = False
    escape_next = False
    for j in range(start, len(text)):
        ch = text[j]
        if escape_next:
            escape_next = False
            continue
        if ch == '\\' and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == open_char:
            depth += 1
        elif ch == close_char:
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:j + 1])
                except json.JSONDecodeError:
                    return None
    return None


# ---------------------------------------------------------------------------
# Master CV IO helpers (module-level for testability)
# ---------------------------------------------------------------------------

def _load_master(master_data_path: str) -> "tuple[dict, Path]":
    """Read master CV JSON from disk and return (data, path).

    Validates the file before reading so malformed data fails fast.
    """
    p = Path(master_data_path)
    validation = validate_master_data_file(str(p), use_schema=True)
    if not validation.valid:
        message = '; '.join(validation.errors) or 'unknown validation error'
        raise ValueError(f"validation failed: {message}")
    with open(p, 'r', encoding='utf-8') as f:
        return json.load(f), p


def _save_master(master: Dict[str, Any], master_path: Path) -> None:
    """Write master CV data to disk and stage the file in git.

    Safety semantics:
    - Reject invalid top-level shape before writing.
    - Create a timestamped backup only when overwriting an existing file.
    - Validate the written file and restore backup on validation failure.
    """
    skills = master.get('skills')
    if skills is not None and not isinstance(skills, (list, dict)):
        raise ValueError("skills must be a list or dict")

    backup_path: Optional[Path] = None
    if master_path.exists():
        backup_dir = master_path.parent / 'backups'
        backup_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        backup_path = backup_dir / f"Master_CV_Data.{stamp}.bak.json"
        backup_path.write_text(master_path.read_text(encoding='utf-8'), encoding='utf-8')

    try:
        with open(master_path, 'w', encoding='utf-8') as f:
            json.dump(master, f, indent=2)

        validation = validate_master_data_file(str(master_path), use_schema=True)
        if not validation.valid:
            if backup_path and backup_path.exists():
                master_path.write_text(backup_path.read_text(encoding='utf-8'), encoding='utf-8')
            message = '; '.join(validation.errors) or 'unknown validation error'
            raise ValueError(f"validation failed: {message}")

        subprocess.run(
            ['git', '-C', str(master_path.parent), 'add', master_path.name],
            capture_output=True, check=False,
        )
    except Exception:
        if backup_path and backup_path.exists() and master_path.exists():
            master_path.write_text(backup_path.read_text(encoding='utf-8'), encoding='utf-8')
        raise


def create_app(args) -> Flask:
    app = Flask(__name__, static_folder=None)

    # Validate configuration before initializing dependencies.
    # Raises ConfigurationError with a clear message if no LLM provider is set.
    validate_config(provider=args.llm_provider)

    # Kick off a background pricing-cache refresh if the cache is stale
    maybe_refresh_in_background()

    # Kick off a background dynamic model catalog refresh for the active provider
    from routes.auth_routes import _maybe_refresh_dynamic_cache_in_background as _arc_refresh
    _arc_refresh(args.llm_provider)

    # Copilot OAuth auth manager (shared across all requests)
    auth_manager = CopilotAuthManager()
    _auth_poll: dict = {"polling": False, "error": None, "device_code": None, "interval": 5}

    # ── Provider / model state ───────────────────────────────────────────────
    _provider_name: str = args.llm_provider
    _current_model: Optional[str] = args.model  # short form; updated by set_model()

    # One shared LLM client used by model-catalog / test endpoints.
    # Per-session LLM clients are created inside each SessionEntry.
    llm_client = get_llm_provider(
        provider=_provider_name, model=args.model, auth_manager=auth_manager
    )

    # ── Session registry ─────────────────────────────────────────────────────
    # Replaces the single global conversation + orchestrator pair.
    # Each browser tab gets its own session identified by a short UUID.
    _app_config = get_config()

    def _build_objects_for_registry(_config_ignored):
        """Factory passed to SessionRegistry; uses the app's CLI args."""
        return _web_app_build_objects(args, auth_manager)

    session_registry = SessionRegistry(
        idle_timeout_minutes=_app_config.idle_timeout_minutes,
        build_objects=_build_objects_for_registry,
    )
    app.session_registry = session_registry  # exposed for test access

    @app.before_request
    def _evict_idle_sessions():
        """Lazily evict stale sessions on every request."""
        session_registry.evict_idle()

    # ── Session helpers ──────────────────────────────────────────────────────

    def _get_session(required: bool = True):
        """Extract session_id from the request and return the SessionEntry.

        For GET requests reads from query string.
        For POST/PUT/DELETE reads from query string OR JSON body.
        Returns None (does not raise) when required=False and session_id absent.
        Aborts 400 when required=True and session_id absent.
        Aborts 404 when session_id present but not in registry.
        """
        from flask import abort as _abort
        sid = request.args.get('session_id')
        if not sid and request.is_json:
            sid = (request.get_json(silent=True) or {}).get('session_id')
        if not sid:
            if required:
                _abort(400, description='session_id is required')
            return None
        try:
            return session_registry.get_or_404(sid)
        except SessionNotFoundError:
            _abort(404, description=f'Session not found: {sid}')

    def _validate_owner(entry) -> None:
        """Validate that the request's owner_token matches the session's owner.

        Reads owner_token from the JSON body or query string (GET requests).
        Aborts 403 if the token does not match.
        Skips validation if the session has no owner set yet (unclaimed).
        """
        from flask import abort as _abort
        if entry.owner_token is None:
            return  # unclaimed — allow any caller
        token = (request.get_json(silent=True) or {}).get('owner_token')
        if token is None:
            token = request.args.get('owner_token')
        if token != entry.owner_token:
            _abort(403, description='Not the session owner')

    # ── Mutable provider/model callables (for blueprint deps) ────────────────

    def _set_provider_model(provider: str, model: str, client) -> None:
        nonlocal _provider_name, _current_model, llm_client
        _provider_name = provider
        _current_model = model
        llm_client = client

    # ── Preload job description if provided — create a session for it ─────────
    _preload_session_id: Optional[str] = None
    if args.job_file:
        job_file_path = Path(args.job_file)
        if job_file_path.exists():
            job_text = job_file_path.read_text(encoding="utf-8")
            _preload_sid, _preload_entry = session_registry.create(_app_config)
            _preload_session_id = _preload_sid
            _preload_conv = _preload_entry.manager
            _preload_conv.add_job_description(job_text)
            # Extract position name from filename (remove date suffix and extension)
            position_name = job_file_path.stem
            position_name = re.sub(r'_\d{4}-\d{2}-\d{2}$', '', position_name)
            _preload_conv.state["position_name"] = position_name
            print(f"✓ Position name set to: {position_name}")
            print(f"✓ Pre-loaded session ID: {_preload_sid}")

            # Try to load the most recent session for this position
            try:
                loaded = _preload_conv._load_latest_session_for_position(position_name)
                if loaded:
                    print(f"✓ Restored previous session for: {position_name}")
                else:
                    _preload_conv.conversation_history.append({
                        "role": "system",
                        "content": (
                            f"Job description loaded: {job_text.split(chr(10))[0]} at "
                            + (job_text.split(chr(10))[1] if len(job_text.split(chr(10))) > 1 else 'Company')
                        ),
                    })
            except Exception as e:
                print(f"⚠ Could not load previous session: {e}")
                _preload_conv.conversation_history.append({
                    "role": "system",
                    "content": (
                        f"Job description loaded: {job_text.split(chr(10))[0]} at "
                        + (job_text.split(chr(10))[1] if len(job_text.split(chr(10))) > 1 else 'Company')
                    ),
                })
            session_registry.touch(_preload_sid)

    # ── Blueprint deps dict ──────────────────────────────────────────────────
    deps = {
        # Session helpers
        'get_session':       _get_session,
        'validate_owner':    _validate_owner,
        'session_registry':  session_registry,
        'app_config':        _app_config,
        # Provider/model state (callable refs so blueprints always get current value)
        'provider_name':     lambda: _provider_name,
        'current_model':     lambda: _current_model,
        'llm_client_ref':    lambda: llm_client,
        'set_provider_model': _set_provider_model,
        # Auth
        'auth_manager':      auth_manager,
        'auth_poll':         _auth_poll,
        # Preload
        'preload_session_id': lambda: _preload_session_id,
        # Shared helpers
        'extract_json_payload': _extract_json_payload,
        'coerce_to_dict':       _coerce_to_dict,
        'load_master':          _load_master,
        'save_master':          _save_master,
        'validate_master_data_file': lambda *a, **k: validate_master_data_file(*a, **k),
        # Response dataclasses
        'StatusResponse':    StatusResponse,
        'SessionItem':       SessionItem,
        'SessionListResponse': SessionListResponse,
        'RewritesResponse':  RewritesResponse,
        'MessageResponse':   MessageResponse,
        'ActionResponse':    ActionResponse,
    }

    # ── Register blueprints ──────────────────────────────────────────────────
    from routes.static_routes      import create_blueprint as _static_bp
    from routes.session_routes     import create_blueprint as _session_bp
    from routes.status_routes      import create_blueprint as _status_bp
    from routes.job_routes         import create_blueprint as _job_bp
    from routes.review_routes      import create_blueprint as _review_bp
    from routes.generation_routes  import create_blueprint as _generation_bp
    from routes.auth_routes        import create_blueprint as _auth_bp
    from routes.master_data_routes import create_blueprint as _master_data_bp

    app.register_blueprint(_static_bp(deps))
    app.register_blueprint(_session_bp(deps))
    app.register_blueprint(_status_bp(deps))
    app.register_blueprint(_job_bp(deps))
    app.register_blueprint(_review_bp(deps))
    app.register_blueprint(_generation_bp(deps))
    app.register_blueprint(_auth_bp(deps))
    app.register_blueprint(_master_data_bp(deps))

    return app


# ---------------------------------------------------------------------------
# Phase 11 harvest helpers (module-level for testability)
# ---------------------------------------------------------------------------

def _compile_harvest_candidates(conversation) -> List[Dict[str, Any]]:
    """Return candidate write-back items for the current session.

    Extracted from the harvest_candidates view so harvest_apply can call it
    directly without round-tripping through the Flask response layer.
    """
    candidates: List[Dict[str, Any]] = []

    approved_rewrites = conversation.state.get('approved_rewrites') or []
    customizations    = conversation.state.get('customizations') or {}
    post_answers      = conversation.state.get('post_analysis_answers') or {}

    # 1. Improved bullets — approved rewrites where content differs from master
    for rw in approved_rewrites:
        if rw.get('section') == 'summary':  # handled separately as summary_variant
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

    # 2. New / renamed skills added during the session
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

    # 3. Summary variant — if summary was rewritten and approved
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

    # 4. Clarification-answer-revealed skills (user confirmed yes to a skill gap)
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
        # Category dict — add to a named 'other'/'general'/'additional' bucket;
        # never auto-add to an arbitrary category.
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
        # No suitable category — add a new 'Other' category
        skills['Other'] = [skill_name]
        return True
    # skills field is missing — create as list
    master['skills'] = [skill_name]
    return True


def _harvest_add_summary_variant(master: Dict, new_summary: str) -> bool:
    """Store ``new_summary`` as a named variant in master data.

    If ``professional_summaries`` already exists as a list, appends.
    Otherwise creates it.
    """
    variants = master.get('professional_summaries')
    if isinstance(variants, list):
        if new_summary not in variants:
            variants.append(new_summary)
            return True
        return False
    master['professional_summaries'] = [new_summary]
    return True


def parse_args():
    config = get_config()
    
    parser = argparse.ArgumentParser(description="Minimal Web UI for CV Generator")
    parser.add_argument("--job-file", help="Path to job description text file")
    parser.add_argument("--master-data", default=config.master_cv_path,
                       help=f"Path to Master_CV_Data.json")
    parser.add_argument("--publications", default=config.publications_path,
                       help=f"Path to publications.bib")
    parser.add_argument("--output-dir", default=config.output_dir,
                       help=f"Output directory")
    parser.add_argument("--llm-provider", choices=["copilot-oauth", "copilot", "github", "openai", "anthropic", "gemini", "groq", "local", "copilot-sdk", "stub"],
                       default=config.llm_provider,
                       help=f"LLM provider (default: {config.llm_provider})")
    parser.add_argument("--model", default=config.llm_model, help="Specific model to use")
    parser.add_argument("--port", type=int, default=config.web_port,
                       help=f"Port to run on (default: {config.web_port})")
    parser.add_argument("--debug", action="store_true", help="Run Flask in debug mode")
    return parser.parse_args()


def main():
    args = parse_args()
    config = get_config()

    # ── Startup banner ────────────────────────────────────────────────────────
    model_source = (
        "env var"      if os.getenv("CV_LLM_MODEL")
        else ".env"    if (Path(__file__).parent.parent / ".env").exists()
                          and _env_file_has_value("CV_LLM_MODEL")
        else "config.yaml"
    )
    provider_source = (
        "env var"      if os.getenv("CV_LLM_PROVIDER")
        else "CLI arg" if args.llm_provider != config.llm_provider
        else ".env"    if (Path(__file__).parent.parent / ".env").exists()
                          and _env_file_has_value("CV_LLM_PROVIDER")
        else "config.yaml"
    )
    print(
        f"\n"
        f"  ┌─────────────────────────────────────────────────────┐\n"
        f"  │                    CV Builder                       │\n"
        f"  ├──────────┬──────────────────────────────────────────┤\n"
        f"  │ provider │ {args.llm_provider:<24}  [{provider_source}]\n"
        f"  │ model    │ {args.model or '(provider default)':<24}  [{model_source}]\n"
        f"  │ port     │ {args.port}\n"
        f"  │ data     │ {args.master_data}\n"
        f"  │ output   │ {args.output_dir}\n"
        f"  └──────────┴──────────────────────────────────────────┘\n",
        flush=True,
    )

    app = create_app(args)
    app.run(host=config.web_host, port=args.port, debug=args.debug)


def _env_file_has_value(key: str) -> bool:
    """Return True if *key* is set (uncommented) in the project .env file."""
    env_path = Path(__file__).parent.parent / ".env"
    try:
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            if line.split("=", 1)[0].strip() == key:
                return True
    except OSError:
        pass
    return False


if __name__ == "__main__":
    main()
