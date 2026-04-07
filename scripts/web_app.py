#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

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
import logging
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

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

from utils.config import get_config, validate_config, ConfigurationError, setup_logging
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
from utils.bibtex_parser import (
    parse_bibtex_file,
    format_publication,
    serialize_publications_to_bibtex,
    bibtex_text_to_publications,
)
from utils.session_registry import (
    SessionRegistry, SessionNotFoundError, SessionOwnedError
)
from routes.generation_routes import (
    _compile_harvest_candidates,
    _harvest_add_skill,
    _harvest_add_summary_variant,
    _harvest_apply_bullet,
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
    # duckflow:
    #   id: session_status.scripts_web_app.L132
    #   kind: api
    #   timestamp: '2026-03-27T01:23:28Z'
    #   status: live
    #   returns:
    #   - response:GET /api/status.skills_section_title
    #   notes: Documents the skills-section-title field surfaced by the status response schema.
    skills_section_title: str
    achievement_edits: Dict[str, Any]
    intake: Dict[str, Any]
    stale_steps: List[str]
    job_url: Optional[str]


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

_CATALOG_LIST_MODELS_CAPABLE: set[str] = {"openai", "anthropic", "gemini", "groq", "copilot-sdk"}
_CATALOG_STATIC_ONLY: set[str] = {"copilot-oauth", "copilot", "github", "local"}


def _catalog_anyllm_provider(provider: str) -> str:
    """Map cv-builder provider keys to any-llm provider keys."""
    aliases = {
        "copilot-sdk": "copilotsdk",
    }
    return aliases.get(provider, provider)


def _frontend_project_root() -> Path:
    """Return the repository root for frontend bundle checks."""
    return Path(__file__).resolve().parent.parent


_FRONTEND_IMPORT_RE = re.compile(
    r'["\'](?P<spec>[^"\']+)["\']',
)


def _iter_frontend_import_specs(source: str) -> List[str]:
    """Extract relative import specs from single-line import/export statements."""
    specs: List[str] = []
    for line in source.splitlines():
        stripped = line.strip()
        if not stripped.startswith(('import ', 'export ')):
            continue
        if stripped.startswith('export ') and ' from ' not in stripped:
            continue

        match = _FRONTEND_IMPORT_RE.search(stripped)
        if match:
            specs.append(match.group('spec'))

    return specs


def _resolve_frontend_bundle_import(importer: Path, spec: str) -> Optional[Path]:
    """Resolve a relative JS import used by the bundle entrypoint graph."""
    if not spec.startswith('.'):
        return None

    candidate = (importer.parent / spec).resolve()
    if candidate.is_file():
        return candidate

    if candidate.suffix:
        return None

    for resolved in (candidate.with_suffix('.js'), candidate / 'index.js'):
        if resolved.is_file():
            return resolved

    return None


def _frontend_bundle_inputs(project_root: Path) -> List[Path]:
    """Return source files whose mtimes determine whether the bundle is stale."""
    resolved_project_root = project_root.resolve()
    build_script = project_root / 'scripts' / 'build.mjs'
    entrypoint = project_root / 'web' / 'src' / 'main.js'
    inputs: List[Path] = []

    if build_script.exists():
        inputs.append(build_script)

    if not entrypoint.exists():
        return inputs

    pending = [entrypoint]
    visited: set[Path] = set()

    while pending:
        path = pending.pop()
        if path in visited or not path.exists():
            continue

        visited.add(path)
        inputs.append(path)

        try:
            source = path.read_text(encoding='utf-8')
        except OSError:
            continue

        for spec in _iter_frontend_import_specs(source):
            resolved = _resolve_frontend_bundle_import(path, spec)
            if not resolved:
                continue
            try:
                resolved.relative_to(resolved_project_root)
            except ValueError:
                continue
            pending.append(resolved)

    return inputs


def _frontend_bundle_is_outdated(project_root: Optional[Path] = None) -> bool:
    """Return True when web/bundle.js is missing or older than its inputs."""
    root = project_root or _frontend_project_root()
    bundle_path = root / 'web' / 'bundle.js'
    if not bundle_path.exists():
        return True

    inputs = _frontend_bundle_inputs(root)
    if not inputs:
        return False

    latest_input_mtime = max(path.stat().st_mtime for path in inputs)
    return latest_input_mtime > bundle_path.stat().st_mtime


def _ensure_frontend_bundle_current(project_root: Optional[Path] = None) -> bool:
    """Rebuild web/bundle.js when frontend sources are newer than the bundle.

    In CI environments (CI=true) the bundle is always committed current and
    git-checkout timestamps are unreliable, so the rebuild is skipped.
    The rebuild is also skipped when node_modules is absent (no npm install
    has been run), which would cause the build to fail anyway.
    """
    root = project_root or _frontend_project_root()
    if not _frontend_bundle_is_outdated(root):
        return False

    # Skip rebuild in CI: git checkout does not preserve file timestamps, so
    # the mtime-based staleness check is unreliable.  The bundle is always
    # committed as current per project policy.
    if os.environ.get('CI'):
        logger.info(
            'CI environment detected; skipping frontend bundle auto-rebuild '
            '(committed bundle.js is used as-is).'
        )
        return False

    node_bin = shutil.which('node')
    if not node_bin:
        raise RuntimeError(
            'Frontend bundle is outdated, but Node.js is not available to rebuild web/bundle.js.'
        )

    # Skip rebuild when node_modules is absent — the build would fail anyway
    # and crashing the server over a missing npm install is too aggressive.
    node_modules = root / 'node_modules'
    if not node_modules.exists():
        logger.warning(
            'Frontend bundle may be stale but node_modules is not installed; '
            'skipping rebuild. Run `npm install && npm run build` to update.'
        )
        return False

    logger.info('Frontend bundle is stale; rebuilding web/bundle.js')
    result = subprocess.run(
        [node_bin, 'scripts/build.mjs'],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        details = (result.stderr or result.stdout or '').strip()
        raise RuntimeError(
            'Failed to rebuild frontend bundle: '
            f'{details or "node scripts/build.mjs exited non-zero"}'
        )

    return True


def _frontend_bundle_built_at(
    project_root: Optional[Path] = None,
) -> Optional[str]:
    """Return the bundle build timestamp derived from web/bundle.js mtime."""
    root = project_root or _frontend_project_root()
    bundle_path = root / 'web' / 'bundle.js'
    if not bundle_path.exists():
        return None

    built_at = datetime.fromtimestamp(
        bundle_path.stat().st_mtime,
        tz=timezone.utc,
    ).astimezone()
    return built_at.isoformat(timespec='seconds')


def _catalog_provider_api_key(provider: str) -> Optional[str]:
    if provider == "openai":
        return os.getenv("OPENAI_API_KEY")
    if provider == "anthropic":
        return os.getenv("ANTHROPIC_API_KEY")
    if provider == "gemini":
        return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if provider == "groq":
        return os.getenv("GROQ_API_KEY")
    if provider == "copilot-sdk":
        return (
            os.getenv("COPILOT_GITHUB_TOKEN")
            or os.getenv("GITHUB_TOKEN")
            or os.getenv("GH_TOKEN")
        )
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
    if provider == "copilot-sdk":
        return os.getenv("COPILOT_CLI_URL")
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
    if provider != "copilot-sdk" and not api_key:
        return None

    try:
        from any_llm import list_models as anyllm_list_models
    except Exception:
        return None

    try:
        kwargs: Dict[str, Any] = {
            "provider": _catalog_anyllm_provider(provider),
        }
        if api_key:
            kwargs["api_key"] = api_key
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


def create_app(args) -> Flask:
    app = Flask(__name__, static_folder=None)

    # Validate configuration before initializing dependencies.
    # Raises ConfigurationError with a clear message if no LLM provider is set.
    validate_config(provider=args.llm_provider)

    # Ensure the served frontend bundle matches the current web sources.
    bundle_rebuilt = _ensure_frontend_bundle_current()
    bundle_status = 'rebuilt' if bundle_rebuilt else 'already current'
    bundle_built_at = _frontend_bundle_built_at() or 'unknown'
    app.config['FRONTEND_BUNDLE_STATUS'] = bundle_status
    app.config['FRONTEND_BUNDLE_BUILT_AT'] = bundle_built_at
    logger.info(
        'Frontend bundle status: %s',
        bundle_status,
    )
    logger.info(
        'Frontend bundle built at: %s',
        bundle_built_at,
    )

    # Kick off a background pricing-cache refresh if the cache is stale
    maybe_refresh_in_background()

    # Kick off a background dynamic model catalog refresh for the active provider
    _maybe_refresh_dynamic_cache_in_background(args.llm_provider)

    # Copilot OAuth auth manager (shared across all requests)
    auth_manager = CopilotAuthManager()
    _auth_poll: dict = {"polling": False, "error": None, "device_code": None, "interval": 5}

    # ── Provider / model state ───────────────────────────────────────────────
    _provider_name: str = args.llm_provider
    _current_model: Optional[str] = args.model  # short form; updated by set_model()
    static_only_providers = {"copilot-oauth", "copilot", "github", "local"}
    provider_models = PROVIDER_MODELS.get(_provider_name, [])
    if (
        _provider_name in static_only_providers
        and _current_model
        and provider_models
        and _current_model not in provider_models
    ):
        fallback_model = provider_models[0]
        logger.warning(
            "Model '%s' is not valid for provider '%s'; using '%s' instead.",
            _current_model,
            _provider_name,
            fallback_model,
        )
        _current_model = fallback_model

    # One shared LLM client used by model-catalog / test endpoints.
    # Per-session LLM clients are created inside each SessionEntry.
    llm_client = get_llm_provider(
        provider=_provider_name, model=_current_model, auth_manager=auth_manager
    )
    provider_name_ref = {"value": _provider_name}
    current_model_ref = {"value": _current_model}
    llm_client_ref = {"value": llm_client}

    # ── Session registry ─────────────────────────────────────────────────────
    # Replaces the single global conversation + orchestrator pair.
    # Each browser tab gets its own session identified by a short UUID.
    _app_config = get_config()

    def _build_objects_for_registry(_config_ignored):
        """Factory passed to SessionRegistry; uses the current provider/model refs."""
        session_provider = provider_name_ref["value"]
        session_model = current_model_ref["value"]
        session_llm_client = get_llm_provider(
            provider=session_provider,
            model=session_model,
            auth_manager=auth_manager,
        )
        orchestrator = CVOrchestrator(
            master_data_path=args.master_data,
            publications_path=args.publications,
            output_dir=args.output_dir,
            llm_client=session_llm_client,
        )
        conversation = ConversationManager(
            orchestrator=orchestrator,
            llm_client=session_llm_client,
        )
        return conversation, orchestrator

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

    def _get_session(required: bool = True, allow_missing: bool = False):
        """Extract session_id from the request and return the SessionEntry.

        For GET requests reads from query string.
        For POST/PUT/DELETE reads from query string OR JSON body.
        Returns None (does not raise) when required=False and session_id absent.
        Returns None when allow_missing=True and the supplied session_id is stale.
        Aborts 400 when required=True and session_id absent.
        Aborts 404 when session_id present but not in registry.
        """
        from flask import abort as _abort
        sid = request.args.get('session_id')
        if not sid and request.is_json:
            sid = (request.get_json(silent=True) or {}).get('session_id')
        
        source = "query" if request.args.get('session_id') else ("json_body" if sid else "none")
        logger.debug(
            "_get_session: session_id=%s (source=%s, method=%s, path=%s)",
            sid or "<missing>", source, request.method, request.path
        )
        
        if not sid:
            if required:
                _abort(400, description='session_id is required')
            return None
        try:
            return session_registry.get_or_404(sid)
        except SessionNotFoundError:
            if allow_missing and not required:
                logger.debug(
                    "_get_session: optional stale session_id=%s ignored for %s",
                    sid,
                    request.path,
                )
                return None
            _abort(404, description=f'Session not found: {sid}')

    def _validate_owner(entry) -> None:
        """Validate that the request's owner_token matches the session's owner.

        Reads owner_token from the JSON body or query string (GET requests).
        Aborts 403 if the token does not match.
        Skips validation if the session has no owner set yet (unclaimed).
        """
        from flask import abort as _abort
        if entry.owner_token is None:
            logger.debug(
                "_validate_owner: session %s is unclaimed (skipping validation)",
                entry.session_id
            )
            return  # unclaimed — allow any caller
        token = (request.get_json(silent=True) or {}).get('owner_token')
        if token is None:
            token = request.args.get('owner_token')
        token_match = (token == entry.owner_token)
        logger.debug(
            "_validate_owner: session %s (claimed=%s, token_match=%s)",
            entry.session_id, entry.owner_token is not None, token_match
        )
        if not token_match:
            _abort(403, description='Not the session owner')

    def _clean_page_title(raw: str) -> Optional[str]:
        """Strip site-name suffixes from an HTML page <title> or og:title.

        Common patterns: 'Senior Scientist | BMS Careers'
                         'Data Manager - Bristol Myers Squibb'
                         'Software Engineer – Acme Corp Jobs'
        """
        cleaned = re.sub(r'\s*[\|\-\u2013\u2014]\s*.{3,}$', '', raw).strip()
        return cleaned if len(cleaned) > 5 and not cleaned.isupper() else None

    def _is_nav_noise(line: str) -> bool:
        """Return True when a line looks like UI chrome rather than job content."""
        if len(line) < 6:
            return True
        # All-caps short strings are usually menu labels or badges
        if line.isupper() and len(line) < 35:
            return True
        # Lines that are just punctuation, digits, or a single word < 4 chars
        if re.fullmatch(r'[\W\d]+', line):
            return True
        return False

    def _infer_position_name(
        job_text: str,
        page_title: Optional[str] = None,
    ) -> Optional[str]:
        """Infer a concise position label from job text and/or page metadata.

        Priority order:
        1. page_title (HTML <title>, og:title, or JSON-LD title) — most reliable
        2. First substantive non-nav line of the extracted text body
        """
        # 1. Use structured page title when available
        if page_title:
            cleaned = _clean_page_title(page_title)
            if cleaned:
                return cleaned[:120]

        if not job_text:
            return None

        lines = [line.strip() for line in job_text.splitlines() if line.strip()]
        if not lines:
            return None

        # 2. Skip navigation-noise lines and bare markdown section headers;
        #    take the first content line as the title.
        _GENERIC_LABELS = frozenset({
            'description', 'qualifications', 'responsibilities', 'skills',
            'requirements', 'overview', 'about', 'summary', 'details',
            'job description', 'position', 'role', 'duties',
            'experience requirements', 'education requirements',
        })
        def _is_section_header(line: str) -> bool:
            stripped = line.lstrip('#').strip().lower()
            return line.lstrip('#') != line and stripped in _GENERIC_LABELS
        content_lines = [
            l for l in lines if not _is_nav_noise(l) and not _is_section_header(l)
        ]
        if not content_lines:
            content_lines = lines

        title = content_lines[0].lstrip('#').strip()
        company = ""
        for candidate in content_lines[1:4]:
            # Company names are typically a short single line
            if len(candidate) < 80:
                company = candidate
                break

        if " at " in title.lower() and not company:
            parts = title.split(" at ", 1)
            if len(parts) == 2:
                title, company = parts[0].strip(), parts[1].strip()

        label = f"{title} at {company}" if title and company else title or company
        return label[:120] if label else None

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

    def _fallback_post_analysis_questions(analysis: Dict[str, Any]) -> List[Dict[str, str]]:
        """Deterministic fallback if LLM question generation fails."""
        questions: List[Dict] = []

        role_level = analysis.get("role_level")
        if role_level:
            questions.append({
                "type": "experience_level",
                "question": f"This role appears to be at {role_level} level. Should I emphasize your most senior experiences or include a broader range to show career progression?",
                "choices": ["Emphasize most senior", "Broader career progression", "Let you decide based on analysis"],
            })

        required_skills = analysis.get("required_skills") or []
        if isinstance(required_skills, list):
            skill_text = " ".join(str(s).lower() for s in required_skills)
            if any(token in skill_text for token in ("leadership", "management", "team")):
                questions.append({
                    "type": "leadership_focus",
                    "question": "This role has leadership components. Would you prefer me to emphasize your management experience or focus more on your technical contributions?",
                    "choices": ["Emphasize management", "Focus on technical", "Balance both equally"],
                })

        domain = analysis.get("domain")
        if domain:
            questions.append({
                "type": "domain_expertise",
                "question": f"The role is in {domain}. Do you have particular projects or achievements in this domain that you'd like me to highlight?",
                "choices": ["Highlight domain-specific achievements", "Use all available experience", "Prioritize most recent work"],
            })

        company = analysis.get("company")
        if company:
            questions.append({
                "type": "company_culture",
                "question": f"For {company}, would you like me to tailor emphasis toward their culture and values? If so, what should I prioritize?",
                "choices": ["Research-driven / academic", "Industry / commercial impact", "Innovation / startup", "Use cultural indicators from job description"],
            })

        return questions[:4]

    def _generate_post_analysis_questions(
        analysis: Dict[str, Any],
        job_text: Optional[str],
        prior_qa: Optional[Dict[str, Any]] = None,
    ) -> List[Dict]:
        """Generate clarifying questions from the LLM in JSON format.

        ``prior_qa`` is a dict mapping previous question keys to the candidate's
        answers; when supplied the LLM is instructed to avoid redundant questions
        and focus only on gaps not yet covered.
        """
        prior_section = ""
        if prior_qa:
            lines = "\n".join(f"- {k}: {v}" for k, v in prior_qa.items())
            prior_section = f"""
Previously answered questions (do NOT repeat these topics):
{lines}

"""
        prompt = f"""You are helping tailor a CV to a specific job.

Create 2-4 concise, high-value clarifying questions for the candidate before generating customization recommendations.

Requirements:
- Questions must be specific to this role, company, and analysis.
- Focus on tradeoffs that affect selection/emphasis of experiences and skills.
- Avoid generic or repetitive questions.
- Keep each question under 220 characters.
- For each question, provide 2-4 button-answer choices covering the most likely responses.
- Return ONLY valid JSON as an array of objects.
{prior_section}
Schema:
[
  {{"type": "short_snake_case", "question": "...", "choices": ["Option A", "Option B", "Option C"]}}
]

Job Analysis:
{json.dumps(analysis, indent=2)}

Job Description (excerpt):
{(job_text or '')[:2500]}
"""

        response = llm_client_ref["value"].chat(
            messages=[
                {"role": "system", "content": "You generate targeted CV-optimization clarification questions and respond with strict JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )

        payload = _extract_json_payload(response)
        if isinstance(payload, dict) and isinstance(payload.get("questions"), list):
            payload = payload.get("questions")

        if not isinstance(payload, list):
            return []

        cleaned: List[Dict] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            question = str(item.get("question", "")).strip()
            qtype = str(item.get("type", "clarification")).strip().lower().replace(" ", "_")
            choices = item.get("choices")
            if not isinstance(choices, list):
                choices = []
            choices = [str(c).strip() for c in choices if str(c).strip()][:4]
            if not question:
                continue
            entry: Dict = {
                "type": qtype[:40] or "clarification",
                "question": question[:220],
            }
            if choices:
                entry["choices"] = choices
            cleaned.append(entry)

        return cleaned[:4]

    # Preload job description if provided — create a session for it
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

    from routes.auth_routes import create_blueprint as create_auth_blueprint
    from routes.generation_routes import create_blueprint as create_generation_blueprint
    from routes.job_routes import create_blueprint as create_job_blueprint
    from routes.master_data_routes import create_blueprint as create_master_data_blueprint
    from routes.review_routes import create_blueprint as create_review_blueprint
    from routes.session_routes import create_blueprint as create_session_blueprint
    from routes.static_routes import create_blueprint as create_static_blueprint
    from routes.status_routes import create_blueprint as create_status_blueprint

    deps = {
        "get_session": _get_session,
        "validate_owner": _validate_owner,
        "session_registry": session_registry,
        "app_config": _app_config,
        "auth_manager": auth_manager,
        "provider_name_ref": provider_name_ref,
        "current_model_ref": current_model_ref,
        "llm_client_ref": llm_client_ref,
        "dynamic_model_cache": _dynamic_model_cache,
        "dynamic_model_cache_lock": _dynamic_model_cache_lock,
        "catalog_list_models_capable": _CATALOG_LIST_MODELS_CAPABLE,
        "catalog_discover_provider_models": _catalog_discover_provider_models,
        "get_available_models": _get_available_models,
        "infer_position_name": _infer_position_name,
        "coerce_to_dict": _coerce_to_dict,
        "extract_json_payload": _extract_json_payload,
        "fallback_post_analysis_questions": _fallback_post_analysis_questions,
        "generate_post_analysis_questions": _generate_post_analysis_questions,
        "load_master": _load_master,
        "save_master": _save_master,
        "validate_master_data_file": validate_master_data_file,
        "validate_ats_report": lambda output_dir, job_analysis: validate_ats_report(output_dir, job_analysis),
        "StatusResponse": StatusResponse,
        "SessionItem": SessionItem,
        "SessionListResponse": SessionListResponse,
        "RewritesResponse": RewritesResponse,
        "MessageResponse": MessageResponse,
        "ActionResponse": ActionResponse,
        "Phase": Phase,
        "preload_session_id": _preload_session_id,
        "output_dir": args.output_dir,
    }

    app.register_blueprint(create_session_blueprint(deps))
    app.register_blueprint(create_status_blueprint(deps))
    app.register_blueprint(create_job_blueprint(deps))
    app.register_blueprint(create_review_blueprint(deps))
    app.register_blueprint(create_generation_blueprint(deps))
    app.register_blueprint(create_auth_blueprint(deps))
    app.register_blueprint(create_master_data_blueprint(deps))
    app.register_blueprint(create_static_blueprint(deps))

    # Return JSON (not HTML) for all HTTP errors on /api/ routes.
    # Without this, flask.abort(400/403/404) sends an HTML error page, which
    # causes the frontend's res.json() to throw a SyntaxError.
    from flask import jsonify as _jsonify
    from werkzeug.exceptions import HTTPException

    @app.errorhandler(HTTPException)
    def _api_error_handler(exc: HTTPException):  # type: ignore[misc]
        if request.path.startswith('/api/'):
            return _jsonify(error=exc.description, status=exc.code), exc.code
        return exc

    return app

# ---------------------------------------------------------------------------
# Master CV IO helpers (module-level for testability)
# ---------------------------------------------------------------------------

def _load_master(master_data_path: str) -> "tuple[dict, Path]":
    """Read master CV JSON from disk and return (data, path)."""
    p = Path(master_data_path).expanduser()

    validation = validate_master_data_file(str(p), use_schema=True)
    if not validation.valid:
        msg = "; ".join(validation.errors) or "master data validation failed"
        raise ValueError(f"Master data validation failed before load: {msg}")

    with open(p, 'r', encoding='utf-8') as f:
        return json.load(f), p


def _extract_year(value: Any) -> Optional[int]:
    """Extract a 4-digit year from a free-form date string."""
    raw = str(value or '').strip()
    if not raw:
        return None
    m = re.search(r'\b(19|20)\d{2}\b', raw)
    if not m:
        return None
    return int(m.group(0))


def _validate_master_for_persistence(master: Dict[str, Any]) -> None:
    """Validate top-level master CV structure before writing to disk."""
    if not isinstance(master, dict):
        raise ValueError("master data must be a JSON object")

    errors: List[str] = []

    if 'personal_info' in master and not isinstance(master.get('personal_info'), dict):
        errors.append("personal_info must be an object")

    for key in ('experience', 'education', 'awards', 'selected_achievements'):
        if key in master and not isinstance(master.get(key), list):
            errors.append(f"{key} must be a list")

    if 'skills' in master and not isinstance(master.get('skills'), (list, dict)):
        errors.append("skills must be a list or object")

    if 'professional_summaries' in master and not isinstance(master.get('professional_summaries'), (dict, list)):
        errors.append("professional_summaries must be an object or list")

    if errors:
        raise ValueError("Invalid master data: " + "; ".join(errors))


def _save_master(master: Dict[str, Any], master_path: Path) -> None:
    """Write master CV data to disk and stage the file in git.

    Creates a timestamped backup before overwrite when the target file exists.
    """
    _validate_master_for_persistence(master)

    backup_path: Optional[Path] = None
    if master_path.exists():
        backup_dir = master_path.parent / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        backup_path = backup_dir / f"{master_path.stem}.{ts}.bak{master_path.suffix}"
        shutil.copy2(master_path, backup_path)

    with open(master_path, 'w', encoding='utf-8') as f:
        json.dump(master, f, indent=2)

    validation = validate_master_data_file(str(master_path), use_schema=True)
    if not validation.valid:
        if backup_path is not None and backup_path.exists():
            shutil.copy2(backup_path, master_path)
        msg = "; ".join(validation.errors) or "master data validation failed"
        raise ValueError(f"Master data validation failed after write: {msg}")

    subprocess.run(
        ['git', '-C', str(master_path.parent), 'add', master_path.name],
        capture_output=True, check=False,
    )


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
    
    # Set up logging before anything else
    setup_logging(config)

    app = create_app(args)
    bundle_status = app.config.get('FRONTEND_BUNDLE_STATUS', 'unknown')
    bundle_built_at = app.config.get('FRONTEND_BUNDLE_BUILT_AT', 'unknown')

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
        f"  │ bundle   │ {bundle_status}\n"
        f"  │ built at │ {bundle_built_at}\n"
        f"  └──────────┴──────────────────────────────────────────┘\n",
        flush=True,
    )

    _evict_port(args.port)
    app.run(host=config.web_host, port=args.port, debug=args.debug)


def _evict_port(port: int) -> None:
    """Kill any process already listening on *port* so Flask can bind cleanly."""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f"tcp:{port}"],
            capture_output=True, text=True
        )
        pids = result.stdout.split()
        for pid_str in pids:
            try:
                pid = int(pid_str)
                os.kill(pid, signal.SIGTERM)
                print(f"Stopped process on port {port} (PID {pid})", flush=True)
            except (ValueError, ProcessLookupError):
                pass
        if pids:
            time.sleep(1)
    except FileNotFoundError:
        pass  # lsof not available; skip eviction


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
