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
import logging
import os
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

from flask import Blueprint, jsonify, request
import yaml

# Live blueprint module registered by `scripts.web_app.create_app()`.

from utils.config import get_config
from utils.conversation_manager import Phase
from utils.llm_client import PROVIDER_MODELS
from utils.provider_registry import PROVIDER_REGISTRY
from utils.session_data_view import SessionDataView


_SETTINGS_WRITE_LOCK = threading.Lock()

_SETTINGS_ENV_MAP: Dict[str, List[str]] = {
    'llm.default_provider': ['CV_LLM_PROVIDER', 'CV_LLM_DEFAULT_PROVIDER'],
    'llm.default_model': ['CV_LLM_MODEL', 'CV_LLM_DEFAULT_MODEL'],
    'llm.request_timeout_seconds': ['CV_LLM_REQUEST_TIMEOUT', 'CV_LLM_REQUEST_TIMEOUT_SECONDS'],
    'llm.temperature': ['CV_LLM_TEMPERATURE'],
    'generation.max_skills': ['CV_GEN_MAX_SKILLS'],
    'generation.max_achievements': ['CV_GEN_MAX_ACHIEVEMENTS'],
    'generation.max_publications': ['CV_GEN_MAX_PUBLICATIONS'],
    'generation.formats.ats_docx': ['CV_GEN_FORMAT_ATS_DOCX'],
    'generation.formats.human_pdf': ['CV_GEN_FORMAT_HUMAN_PDF'],
    'generation.formats.human_docx': ['CV_GEN_FORMAT_HUMAN_DOCX'],
    'generation.skills_section_title': ['CV_GEN_SKILLS_SECTION_TITLE'],
}

_SETTINGS_DEFAULTS: Dict[str, Any] = {
    'llm.default_provider': None,
    'llm.default_model': None,
    'llm.request_timeout_seconds': 120,
    'llm.temperature': 0.7,
    'generation.max_skills': 20,
    'generation.max_achievements': 5,
    'generation.max_publications': 10,
    'generation.formats.ats_docx': True,
    'generation.formats.human_pdf': True,
    'generation.formats.human_docx': True,
    'generation.skills_section_title': 'Skills',
}


def _resolve_config_yaml_path() -> Path:
    explicit = (os.getenv('CV_BUILDER_CONFIG_FILE') or '').strip()
    if explicit:
        return Path(explicit).expanduser()
    return Path.cwd() / 'config.yaml'


def _read_dotenv_values(path: Path) -> Dict[str, str]:
    values: Dict[str, str] = {}
    if not path.exists():
        return values
    try:
        for line in path.read_text(encoding='utf-8').splitlines():
            raw = line.strip()
            if not raw or raw.startswith('#') or '=' not in raw:
                continue
            key, value = raw.split('=', 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    except OSError:
        return {}
    return values


_MISSING: Any = object()


def _deep_get(container: Dict[str, Any], dotted_key: str, default: Any = _MISSING) -> Any:
    current: Any = container
    for token in dotted_key.split('.'):
        if not isinstance(current, dict) or token not in current:
            return default
        current = current[token]
    return current


def _deep_set(container: Dict[str, Any], dotted_key: str, value: Any) -> None:
    parts = dotted_key.split('.')
    current = container
    for token in parts[:-1]:
        node = current.get(token)
        if not isinstance(node, dict):
            node = {}
            current[token] = node
        current = node
    current[parts[-1]] = value


def _normalize_settings_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    normalized: Dict[str, Any] = {}

    llm = payload.get('llm') or {}
    if isinstance(llm, dict):
        if 'default_provider' in llm:
            normalized['llm.default_provider'] = llm.get('default_provider')
        if 'default_model' in llm:
            normalized['llm.default_model'] = llm.get('default_model')
        if 'request_timeout_seconds' in llm:
            normalized['llm.request_timeout_seconds'] = llm.get('request_timeout_seconds')
        if 'temperature' in llm:
            normalized['llm.temperature'] = llm.get('temperature')

    generation = payload.get('generation') or {}
    if isinstance(generation, dict):
        if 'max_skills' in generation:
            normalized['generation.max_skills'] = generation.get('max_skills')
        if 'max_achievements' in generation:
            normalized['generation.max_achievements'] = generation.get('max_achievements')
        if 'max_publications' in generation:
            normalized['generation.max_publications'] = generation.get('max_publications')
        if 'skills_section_title' in generation:
            normalized['generation.skills_section_title'] = generation.get('skills_section_title')
        formats = generation.get('formats') or {}
        if isinstance(formats, dict):
            if 'ats_docx' in formats:
                normalized['generation.formats.ats_docx'] = formats.get('ats_docx')
            if 'human_pdf' in formats:
                normalized['generation.formats.human_pdf'] = formats.get('human_pdf')
            if 'human_docx' in formats:
                normalized['generation.formats.human_docx'] = formats.get('human_docx')

    return normalized


def _validate_settings_update(update_map: Dict[str, Any]) -> Dict[str, Any]:
    clean: Dict[str, Any] = {}
    allowed_providers = set(PROVIDER_MODELS.keys())

    for key, value in update_map.items():
        if key not in _SETTINGS_DEFAULTS:
            raise ValueError(f'Unsupported setting: {key}')

        if key == 'llm.default_provider':
            raw = (value or '').strip() if value is not None else None
            if raw is None:
                clean[key] = None
            elif raw not in allowed_providers:
                allowed = ', '.join(sorted(allowed_providers))
                raise ValueError(f'llm.default_provider must be one of: {allowed}')
            else:
                clean[key] = raw
            continue

        if key == 'llm.default_model':
            if value in (None, ''):
                clean[key] = None
            else:
                clean[key] = str(value).strip()
            continue

        if key == 'llm.request_timeout_seconds':
            intval = int(value)
            if intval < 5 or intval > 600:
                raise ValueError('llm.request_timeout_seconds must be between 5 and 600')
            clean[key] = intval
            continue

        if key == 'llm.temperature':
            floatval = float(value)
            if floatval < 0.0 or floatval > 2.0:
                raise ValueError('llm.temperature must be between 0.0 and 2.0')
            clean[key] = round(floatval, 3)
            continue

        if key in ('generation.max_skills', 'generation.max_achievements', 'generation.max_publications'):
            intval = int(value)
            if intval < 1 or intval > 100:
                raise ValueError(f'{key} must be between 1 and 100')
            clean[key] = intval
            continue

        if key.startswith('generation.formats.'):
            if not isinstance(value, bool):
                raise ValueError(f'{key} must be a boolean')
            clean[key] = value
            continue

        if key == 'generation.skills_section_title':
            text = str(value or '').strip()
            if not text:
                raise ValueError('generation.skills_section_title must not be empty')
            clean[key] = text[:120]
            continue

    return clean


def _setting_source(
    dotted_key: str,
    config_doc: Dict[str, Any],
    dotenv_values: Dict[str, str],
) -> Dict[str, Optional[str]]:
    env_keys = _SETTINGS_ENV_MAP.get(dotted_key, [])
    env_match = next((key for key in env_keys if key in os.environ), None)
    dotenv_match = next((key for key in env_keys if key in dotenv_values), None)

    if env_match:
        return {'source': 'env', 'env_key': env_match}
    if dotenv_match:
        return {'source': 'dotenv', 'env_key': dotenv_match}
    if _deep_get(config_doc, dotted_key) is not _MISSING:
        return {'source': 'config', 'env_key': None}
    return {'source': 'default', 'env_key': None}


def _coerce_setting_value(dotted_key: str, raw_value: Any) -> Any:
    if raw_value is None:
        return None

    if dotted_key in (
        'generation.formats.ats_docx',
        'generation.formats.human_pdf',
        'generation.formats.human_docx',
    ):
        if isinstance(raw_value, bool):
            return raw_value
        return str(raw_value).strip().lower() in ('1', 'true', 'yes', 'on')

    if dotted_key in (
        'llm.request_timeout_seconds',
        'generation.max_skills',
        'generation.max_achievements',
        'generation.max_publications',
    ):
        return int(raw_value)

    if dotted_key == 'llm.temperature':
        return float(raw_value)

    if dotted_key in ('llm.default_provider', 'llm.default_model'):
        text = str(raw_value).strip()
        return text or None

    if dotted_key == 'generation.skills_section_title':
        return str(raw_value).strip() or 'Skills'

    return raw_value


def _effective_setting_value(
    dotted_key: str,
    config_doc: Dict[str, Any],
    dotenv_values: Dict[str, str],
) -> Any:
    env_keys = _SETTINGS_ENV_MAP.get(dotted_key, [])

    for env_key in env_keys:
        if env_key in os.environ:
            return _coerce_setting_value(dotted_key, os.environ.get(env_key))

    for env_key in env_keys:
        if env_key in dotenv_values:
            return _coerce_setting_value(dotted_key, dotenv_values.get(env_key))

    config_value = _deep_get(config_doc, dotted_key)
    if config_value is not None:
        return _coerce_setting_value(dotted_key, config_value)

    return _SETTINGS_DEFAULTS[dotted_key]


# ── Credential / API key helpers ─────────────────────────────────────────────

# Provider credential metadata is now centralised in utils/provider_registry.py.
# Import the unified registry and expose it here under its legacy local alias so
# that the helper functions below do not need to be updated.
_PROVIDER_CREDENTIAL_MAP = PROVIDER_REGISTRY


def _credential_source(
    provider: str,
    config_doc: Dict[str, Any],
    dotenv_values: Dict[str, str],
) -> Dict[str, Any]:
    """Return credential source info for a provider.

    Returns a dict with:
      is_set  (bool)  — True when a non-empty credential exists
      source  (str)   — 'env' | 'dotenv' | 'config' | 'unset'
      env_var (str|None) — the specific env-var name when source is env/dotenv

    device_flow / cli / none providers always return is_set=False / source='unset'
    so the wizard renders auth-type guidance rather than a key-is-set badge.
    """
    meta = _PROVIDER_CREDENTIAL_MAP.get(provider)
    if not meta or meta["auth_type"] in ("device_flow", "cli", "none"):
        return {"is_set": False, "source": "unset", "env_var": None}

    env_var = meta["env_var"]
    if env_var and os.environ.get(env_var, "").strip():
        return {"is_set": True, "source": "env", "env_var": env_var}

    if env_var and dotenv_values.get(env_var, "").strip():
        return {"is_set": True, "source": "dotenv", "env_var": env_var}

    config_key = meta["config_key"]
    if config_key:
        stored = _deep_get(config_doc, config_key, "")
        if isinstance(stored, str) and stored.strip():
            return {"is_set": True, "source": "config", "env_var": None}

    return {"is_set": False, "source": "unset", "env_var": None}


# Keep a thin wrapper for callers that only need the boolean.
def _credential_is_set(provider: str, config_doc: Dict[str, Any]) -> bool:
    return _credential_source(provider, config_doc, {})["is_set"]


def _write_api_key_to_config(config_path: Path, config_key: str, value: str, env_var: str) -> None:
    """Atomically write an API key into config.yaml api_keys.* and os.environ.

    Preserves all other top-level keys and sections.  Uses the same temp-file
    swap strategy as the settings update route to avoid partial writes.
    """
    with _SETTINGS_WRITE_LOCK:
        config_doc: Dict[str, Any] = {}
        if config_path.exists():
            config_doc = yaml.safe_load(config_path.read_text(encoding='utf-8')) or {}

        _deep_set(config_doc, config_key, value)

        tmp_path    = config_path.with_suffix('.yaml.tmp')
        backup_path = config_path.with_suffix('.yaml.bak')
        try:
            tmp_path.write_text(
                yaml.safe_dump(config_doc, sort_keys=False, default_flow_style=False),
                encoding='utf-8',
            )
            if config_path.exists():
                config_path.replace(backup_path)
            tmp_path.replace(config_path)
        except Exception:
            tmp_path.unlink(missing_ok=True)
            if backup_path.exists() and not config_path.exists():
                backup_path.replace(config_path)
            raise

    # Apply immediately to the running process so the key is usable without a
    # server restart (e.g. for the Step 3 "Test connection" in the wizard).
    #
    # LIMITATION — process-local only:
    #   os.environ changes are visible only in the current OS process.  In a
    #   single-worker deployment (the only supported mode for this local app)
    #   this is always correct.  If the server is ever run with multiple
    #   workers (e.g. gunicorn -w 4), each worker would need its own restart
    #   to pick up the new value; the config.yaml write above is the durable
    #   record and will be read correctly on any restart.  Do not move to a
    #   multi-worker deployment without revisiting this behaviour.
    if env_var:
        os.environ[env_var] = value


def _build_settings_response(config_doc: Dict[str, Any], config_path: Path) -> Dict[str, Any]:
    dotenv_values = _read_dotenv_values(config_path.parent / '.env')

    sources: Dict[str, str] = {}
    env_keys: Dict[str, Optional[str]] = {}
    locked: Dict[str, bool] = {}
    for key in _SETTINGS_DEFAULTS:
        source_info = _setting_source(key, config_doc, dotenv_values)
        sources[key] = source_info['source'] or 'default'
        env_keys[key] = source_info['env_key']
        locked[key] = sources[key] in ('env', 'dotenv')

    return {
        'settings': {
            'llm': {
                'default_provider': _effective_setting_value('llm.default_provider', config_doc, dotenv_values),
                'default_model': _effective_setting_value('llm.default_model', config_doc, dotenv_values),
                'request_timeout_seconds': int(_effective_setting_value('llm.request_timeout_seconds', config_doc, dotenv_values)),
                'temperature': float(_effective_setting_value('llm.temperature', config_doc, dotenv_values)),
            },
            'generation': {
                'max_skills': int(_effective_setting_value('generation.max_skills', config_doc, dotenv_values)),
                'max_achievements': int(_effective_setting_value('generation.max_achievements', config_doc, dotenv_values)),
                'max_publications': int(_effective_setting_value('generation.max_publications', config_doc, dotenv_values)),
                'skills_section_title': str(_effective_setting_value('generation.skills_section_title', config_doc, dotenv_values) or 'Skills'),
                'formats': {
                    'ats_docx': bool(_effective_setting_value('generation.formats.ats_docx', config_doc, dotenv_values)),
                    'human_pdf': bool(_effective_setting_value('generation.formats.human_pdf', config_doc, dotenv_values)),
                    'human_docx': bool(_effective_setting_value('generation.formats.human_docx', config_doc, dotenv_values)),
                },
            },
        },
        'runtime': {
            'llm': {
                'provider': None,
                'model': None,
            },
        },
        'meta': {
            'sources': sources,
            'env_keys': env_keys,
            'locked': locked,
            'config_path': str(config_path),
        },
    }


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

    @bp.get('/api/settings')
    def get_settings():
        """Return effective app settings and per-field precedence metadata."""
        config_path = _resolve_config_yaml_path()
        config_doc: Dict[str, Any] = {}
        if config_path.exists():
            try:
                config_doc = yaml.safe_load(config_path.read_text(encoding='utf-8')) or {}
            except Exception:
                config_doc = {}

        response = _build_settings_response(config_doc, config_path)
        response['runtime']['llm']['provider'] = _provider_name_ref.get('value')
        response['runtime']['llm']['model'] = _current_model_ref.get('value')
        response['ok'] = True
        return jsonify(response)

    @bp.put('/api/settings')
    def update_settings():
        """Update persisted config.yaml settings with validation and source-awareness."""
        body = request.get_json(silent=True) or {}
        raw_updates = body.get('settings') if isinstance(body.get('settings'), dict) else body
        if not isinstance(raw_updates, dict):
            return jsonify({'ok': False, 'error': 'settings payload must be an object'}), 400

        normalized_updates = _normalize_settings_payload(raw_updates)
        if not normalized_updates:
            return jsonify({'ok': False, 'error': 'No supported settings were provided'}), 400

        try:
            validated_updates = _validate_settings_update(normalized_updates)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Settings validation failed")
            return jsonify({'ok': False, 'error': 'Settings validation failed'}), 400

        config_path = _resolve_config_yaml_path()
        config_path.parent.mkdir(parents=True, exist_ok=True)

        with _SETTINGS_WRITE_LOCK:
            original_doc: Dict[str, Any] = {}
            if config_path.exists():
                try:
                    original_doc = yaml.safe_load(config_path.read_text(encoding='utf-8')) or {}
                except Exception:
                    logger.exception("Failed to parse config.yaml")
                    return jsonify({'ok': False, 'error': 'Failed to read configuration — please check file format and try again'}), 500

            updated_doc = dict(original_doc)
            for dotted_key, value in validated_updates.items():
                _deep_set(updated_doc, dotted_key, value)

            tmp_path = config_path.with_suffix('.yaml.tmp')
            backup_path = config_path.with_suffix('.yaml.bak')
            try:
                tmp_path.write_text(
                    yaml.safe_dump(updated_doc, sort_keys=False, default_flow_style=False),
                    encoding='utf-8',
                )
                if config_path.exists():
                    config_path.replace(backup_path)
                tmp_path.replace(config_path)
            except Exception:
                if tmp_path.exists():
                    tmp_path.unlink(missing_ok=True)
                if backup_path.exists() and not config_path.exists():
                    backup_path.replace(config_path)
                logger.exception("Failed to persist settings to config.yaml")
                return jsonify({'ok': False, 'error': 'Failed to save settings — please try again'}), 500

        response = _build_settings_response(updated_doc, config_path)
        response['runtime']['llm']['provider'] = _provider_name_ref.get('value')
        response['runtime']['llm']['model'] = _current_model_ref.get('value')
        response['ok'] = True
        response['updated_keys'] = sorted(validated_updates.keys())
        return jsonify(response)

    # ── Provider metadata (session-free) ─────────────────────────────────────

    @bp.get('/api/providers')
    def get_providers():
        """Return display metadata for all known providers (no credentials, no session).

        Response shape:
          {
            "ok": true,
            "providers": {
              "<provider>": {
                "free_tier":    true | false,
                "confidential": true | false,
                "note":         "One-sentence description.",
                "homepage":     "https://..." | null,
                "pricing_url":  "https://..." | null,
                "privacy_url":  "https://..." | null
              },
              ...
            }
          }
        """
        from utils.provider_registry import DISPLAY_FIELDS
        providers = {
            name: {k: entry[k] for k in DISPLAY_FIELDS}
            for name, entry in PROVIDER_REGISTRY.items()
        }
        return jsonify({"ok": True, "providers": providers})

    # ── Credential / API key routes ───────────────────────────────────────────

    @bp.get('/api/settings/credentials/status')
    def get_credentials_status():
        """Return which providers have a credential set (never returns key values).

        Response shape:
          {
            "ok": true,
            "providers": {
              "github": {
                "auth_type": "api_key",
                "is_set":    true,
                "source":    "env",       // 'env' | 'dotenv' | 'config' | 'unset'
                "env_var":   "GITHUB_MODELS_TOKEN",  // set when source is env/dotenv
                "locked":    true,        // true when controlled by env var or .env
                "label":     "...",
                "get_key_url": "...",
                "help_text": "..."
              },
              ...
            }
          }
        """
        config_path = _resolve_config_yaml_path()
        config_doc: Dict[str, Any] = {}
        if config_path.exists():
            try:
                config_doc = yaml.safe_load(config_path.read_text(encoding='utf-8')) or {}
            except Exception:
                logger.warning("Could not parse config.yaml for credential status check")

        dotenv_values = _read_dotenv_values(config_path.parent / '.env')

        providers: Dict[str, Any] = {}
        for provider, meta in _PROVIDER_CREDENTIAL_MAP.items():
            cred = _credential_source(provider, config_doc, dotenv_values)
            providers[provider] = {
                "auth_type":   meta["auth_type"],
                "is_set":      cred["is_set"],
                "source":      cred["source"],
                "env_var":     cred["env_var"],
                "locked":      cred["source"] in ("env", "dotenv"),
                "label":       meta["label"],
                "get_key_url": meta["get_key_url"],
                "help_text":   meta["help_text"],
            }
        return jsonify({"ok": True, "providers": providers})

    @bp.post('/api/settings/credentials')
    def save_credential():
        """Write an API key for a provider into config.yaml api_keys.* and os.environ.

        Request body: {"provider": "<name>", "key_value": "<secret>"}

        The key value is never echoed back in the response — only a presence flag.
        """
        body = request.get_json(silent=True) or {}
        provider  = (body.get('provider') or '').strip()
        key_value = (body.get('key_value') or '').strip()

        if not provider:
            return jsonify({'ok': False, 'error': 'provider is required'}), 400

        meta = _PROVIDER_CREDENTIAL_MAP.get(provider)
        if meta is None:
            return jsonify({'ok': False, 'error': f'Unknown provider: {provider}'}), 400

        if meta['auth_type'] in ('device_flow', 'cli', 'none'):
            return jsonify({
                'ok':    False,
                'error': f"Provider '{provider}' does not use an API key — "
                         f"use the '{meta['auth_type']}' method instead.",
            }), 400

        if not key_value:
            return jsonify({'ok': False, 'error': 'key_value must not be empty'}), 400

        config_path = _resolve_config_yaml_path()
        config_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            _write_api_key_to_config(
                config_path,
                config_key=meta['config_key'],
                value=key_value,
                env_var=meta['env_var'],
            )
        except Exception:
            logger.exception("Failed to save credential for provider '%s'", provider)
            return jsonify({'ok': False, 'error': 'Failed to save credential — please try again'}), 500

        return jsonify({
            'ok':      True,
            'provider': provider,
            'is_set':  True,
        })

    # ── Internal helpers ──────────────────────────────────────────────────────

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
        # duckflow:
        #   id: session_status.scripts_routes_status_routes.L50
        #   kind: api
        #   timestamp: "2026-03-27T02:07:47Z"
        #   status: live
        #   handles:
        #     - "GET /api/status"
        #   reads:
        #     - "state:max_skills"
        #     - "state:skills_section_title"
        #   returns:
        #     - "response:GET /api/status.max_skills"
        #     - "response:GET /api/status.skills_section_title"
        #   notes: "Returns the current generation-settings values in the session status payload."
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
            all_achievements = []
            # duckflow:
            #   id: summary_api_status_live
            #   kind: api
            #   timestamp: "2026-03-27T01:23:28Z"
            #   status: live
            #   handles:
            #     - "GET /api/status"
            #   reads:
            #     - "state:session_summaries.ai_generated"
            #     - "state:summary_focus_override"
            #   writes:
            #     - "response:GET /api/status.professional_summaries"
            #   returns:
            #     - "response:GET /api/status.professional_summaries"
            #     - "response:GET /api/status.summary_focus_override"
            #   notes: "Live status route merges master summaries with session summary overrides."
            summary_view = SessionDataView(orchestrator.master_data, conversation.state)
            professional_summaries = summary_view.professional_summaries()
            all_achievements = summary_view.selected_achievements()
            all_skills = summary_view.normalized_skills()
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
            skills_section_title=conversation.state.get("skills_section_title") or "Skills",
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
        except Exception:
            logger.exception("Failed to get context stats")
            return jsonify({"ok": False, "error": "Failed to retrieve context stats."}), 500

    @bp.post("/api/generation-settings")
    def update_generation_settings():
        # duckflow:
        #   id: generation_settings.scripts_routes_status_routes.L205
        #   kind: api
        #   timestamp: "2026-03-27T02:07:47Z"
        #   status: live
        #   handles:
        #     - "POST /api/generation-settings"
        #   reads:
        #     - "request:POST /api/generation-settings.max_skills"
        #     - "request:POST /api/generation-settings.skills_section_title"
        #   writes:
        #     - "state:max_skills"
        #     - "state:skills_section_title"
        #     - "customizations:max_skills"
        #     - "customizations:skills_section_title"
        #   returns:
        #     - "response:POST /api/generation-settings.max_skills"
        #     - "response:POST /api/generation-settings.skills_section_title"
        #   notes: "Persists per-session generation settings into both top-level session state and the generation customizations payload."
        """Update per-session generation settings (max_skills, skills_section_title, etc.)."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        with entry.lock:
            customizations = conversation.state.get("customizations")
            if customizations is None:
                customizations = {}
                conversation.state["customizations"] = customizations

            if "max_skills" in data:
                v = data["max_skills"]
                if not isinstance(v, int) or not (1 <= v <= 100):
                    return jsonify({"error": "max_skills must be an integer between 1 and 100"}), 400
                conversation.state["max_skills"] = v
                customizations["max_skills"] = v
            if "skills_section_title" in data:
                raw = str(data["skills_section_title"]).strip()
                if not raw:
                    return jsonify({"error": "skills_section_title must not be empty"}), 400
                conversation.state["skills_section_title"] = raw
                customizations["skills_section_title"] = raw
            conversation._save_session()
        session_registry.touch(sid)
        cfg_default = get_config().get("generation.max_skills", 20)
        return jsonify({
            "ok": True,
            "max_skills": int(conversation.state.get("max_skills") or cfg_default),
            "skills_section_title": conversation.state.get("skills_section_title") or "Skills",
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
        except Exception:
            logger.warning("LLM question generation failed; using fallback questions")

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
            except Exception as exc:
                exc_str = str(exc)
                if '429' in exc_str or 'RESOURCE_EXHAUSTED' in exc_str or 'quota' in exc_str.lower() or 'rate' in exc_str.lower():
                    return jsonify({'ok': False, 'error': 'Rate limit reached — please wait a moment and try again.', 'rate_limited': True}), 429
                logger.exception("LLM draft generation failed")
                return jsonify({'ok': False, 'error': 'Failed to generate draft response.'}), 500

            return jsonify({'ok': True, 'text': draft.strip()})
        except Exception:
            logger.exception("Unexpected error in post_analysis_draft_response")
            return jsonify({'ok': False, 'error': 'Failed to generate draft response.'}), 500

    @bp.get("/api/intake-metadata")
    def intake_metadata():
        """Return extracted or confirmed intake metadata for the current session.

        Preference order for unconfirmed sessions:
          1. LLM ``job_analysis`` fields (``job_title`` / ``company_name``) — most
             accurate because the LLM already parsed the full posting.
          2. Heuristic ``extract_intake_metadata()`` — first/second text lines,
             used only when no analysis is available yet.
        """
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

        # Prefer LLM-extracted values when job_analysis is already available
        job_analysis = conversation.state.get('job_analysis')
        if job_analysis and isinstance(job_analysis, dict):
            llm_role    = (job_analysis.get('job_title') or job_analysis.get('title') or '').strip() or None
            llm_company = (job_analysis.get('company_name') or job_analysis.get('company') or '').strip() or None
        else:
            llm_role    = None
            llm_company = None

        extracted = conversation.extract_intake_metadata()
        return jsonify({
            'role':         llm_role    or extracted.get('role'),
            'company':      llm_company or extracted.get('company'),
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
        except Exception:
            logger.exception("Error searching for prior clarifications")
            return jsonify({'found': False, 'matches': []})

    return bp
