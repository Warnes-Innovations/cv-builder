# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Configuration loader for CV Builder.

Loads configuration from multiple sources in priority order:
1. Environment variables (highest priority)
2. .env file (if present)
3. config.yaml (default settings)
4. Hardcoded defaults (fallback)
"""

import logging
import os
import yaml
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Default position-style presets (issue #126).
# Override or extend via position_styles: in config.yaml.
_DEFAULT_POSITION_STYLES: Dict[str, Any] = {
    'industry': {
        'label': 'Industry / Corporate',
        'page_warn_below': 2.0,
        'page_warn_above': 3.0,
        'include_publications': False,
        'include_teaching': False,
        'domain_terms': [],
    },
    'academic': {
        'label': 'Academic / Research',
        'page_warn_below': 2.0,
        'page_warn_above': None,  # no upper limit
        'include_publications': True,
        'include_teaching': True,
        'domain_terms': [
            'research', 'academic', 'science', 'scientist', 'statistics',
            'biostat', 'genomic', 'clinical', 'epidemiol', 'faculty',
            'bioinformat', 'computational biology', 'drug discovery',
        ],
    },
    'government': {
        'label': 'Government / Federal',
        'page_warn_below': 2.0,
        'page_warn_above': None,
        'include_publications': False,
        'include_teaching': False,
        'domain_terms': [
            'federal', 'government', 'agency', 'defense', 'military', 'public service',
        ],
    },
}


class Config:
    """Configuration manager for CV Builder."""
    
    def __init__(self, config_file: Optional[str] = None, load_env: bool = True):
        """
        Initialize configuration.
        
        Args:
            config_file: Path to config.yaml (default: ./config.yaml)
            load_env: Whether to load .env file (default: True)
        """
        self._config: Dict[str, Any] = {}
        
        # Load .env file if requested
        env_loaded = False
        if load_env:
            env_file = Path.cwd() / ".env"
            if env_file.exists():
                load_dotenv(env_file)
                env_loaded = True
        
        # Load config.yaml
        config_loaded = False
        if config_file is None:
            config_file = Path.cwd() / "config.yaml"
        else:
            config_file = Path(config_file)
        
        if config_file.exists():
            with open(config_file, 'r') as f:
                self._config = yaml.safe_load(f) or {}
                config_loaded = True
        
        logger.debug(
            "Config loaded: .env=%s, config.yaml=%s (path=%s)",
            env_loaded, config_loaded, config_file
        )
        
        # Expand home directory paths
        self._expand_paths()
    
    def _expand_paths(self):
        """Expand ~ in paths to absolute paths."""
        expansions = []
        
        if 'data' in self._config:
            for key in ['master_cv', 'publications', 'output_dir']:
                if key in self._config['data']:
                    path = self._config['data'][key]
                    if isinstance(path, str) and path.startswith('~'):
                        expanded = str(Path(path).expanduser())
                        self._config['data'][key] = expanded
                        expansions.append(f"data.{key}: {path} -> {expanded}")
        
        if 'session' in self._config:
            for key in ['session_dir', 'history_file']:
                if key in self._config['session']:
                    path = self._config['session'][key]
                    if isinstance(path, str) and path.startswith('~'):
                        self._config['session'][key] = str(Path(path).expanduser())
        
        if 'google_drive' in self._config:
            for key in ['credentials_path', 'token_path']:
                if key in self._config['google_drive']:
                    path = self._config['google_drive'][key]
                    if isinstance(path, str) and path.startswith('~'):
                        self._config['google_drive'][key] = str(Path(path).expanduser())
        
        if 'logging' in self._config:
            for key in ['log_dir']:
                if key in self._config['logging']:
                    path = self._config['logging'][key]
                    if isinstance(path, str) and path.startswith('~'):
                        expanded = str(Path(path).expanduser())
                        self._config['logging'][key] = expanded
                        expansions.append(f"logging.{key}: {path} -> {expanded}")
        
        if expansions:
            logger.debug("Path expansions: %s", "; ".join(expansions))
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value with dot notation support."""
        keys = key.split('.')
        value = self._config
        
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
                if value is None:
                    return default
            else:
                return default
        
        return value
    
    # Data paths
    @property
    def data_root(self) -> str:
        """Base directory for all CV Builder data files.

        Set CV_DATA_ROOT to relocate all data paths at once (e.g. to /data in
        Docker).  Individual paths can still be overridden by their own env vars
        or config.yaml entries.
        """
        root = os.getenv('CV_DATA_ROOT') or self.get('data.root', '~/CV')
        return str(Path(root).expanduser())

    @property
    def master_cv_path(self) -> str:
        """Path to Master_CV_Data.json."""
        if env := os.getenv('CV_MASTER_DATA_PATH'):
            return env
        configured = self.get('data.master_cv')
        if configured:
            return str(Path(configured).expanduser())
        return str(Path(self.data_root) / 'Master_CV_Data.json')

    @property
    def publications_path(self) -> str:
        """Path to publications.bib."""
        if env := os.getenv('CV_PUBLICATIONS_PATH'):
            return env
        configured = self.get('data.publications')
        if configured:
            return str(Path(configured).expanduser())
        return str(Path(self.data_root) / 'publications.bib')

    @property
    def output_dir(self) -> str:
        """Output directory for generated CVs."""
        if env := os.getenv('CV_OUTPUT_DIR'):
            return env
        configured = self.get('data.output_dir')
        if configured:
            return str(Path(configured).expanduser())
        return str(Path(self.data_root) / 'cv-builder')
    
    # LLM settings
    @property
    def llm_provider(self) -> Optional[str]:
        """Default LLM provider. Returns None if not configured."""
        return os.getenv('CV_LLM_PROVIDER') or self.get('llm.default_provider') or None
    
    @property
    def llm_model(self) -> Optional[str]:
        """Default LLM model (None uses provider default)."""
        return os.getenv('CV_LLM_MODEL') or self.get('llm.default_model')
    
    @property
    def llm_temperature(self) -> float:
        """LLM temperature setting."""
        temp = os.getenv('CV_LLM_TEMPERATURE')
        if temp:
            return float(temp)
        return self.get('llm.temperature', 0.7)
    
    @property
    def llm_max_tokens(self) -> Optional[int]:
        """LLM max tokens."""
        tokens = os.getenv('CV_LLM_MAX_TOKENS')
        if tokens:
            return int(tokens)
        return self.get('llm.max_tokens')

    @property
    def llm_request_timeout(self) -> Optional[float]:
        """Max seconds to wait for a single LLM reply. None means no limit."""
        raw = os.getenv('CV_LLM_REQUEST_TIMEOUT')
        if raw:
            return float(raw)
        val = self.get('llm.request_timeout_seconds')
        return float(val) if val is not None else None

    # API Keys
    # Precedence: env var > .env entry > config.yaml api_keys.* > None
    @property
    def github_token(self) -> Optional[str]:
        """GitHub Models API token (used by: github, copilot providers)."""
        return (
            os.getenv('GITHUB_MODELS_TOKEN')
            or os.getenv('GITHUB_TOKEN')
            or self.get('api_keys.github_token') or None
        )

    @property
    def openai_api_key(self) -> Optional[str]:
        """OpenAI API key."""
        return os.getenv('OPENAI_API_KEY') or self.get('api_keys.openai_api_key') or None

    @property
    def anthropic_api_key(self) -> Optional[str]:
        """Anthropic API key."""
        return os.getenv('ANTHROPIC_API_KEY') or self.get('api_keys.anthropic_api_key') or None

    @property
    def gemini_api_key(self) -> Optional[str]:
        """Google Gemini API key."""
        def _file_fallback(name: str) -> Optional[str]:
            v = os.getenv(name)
            if v:
                return v
            fp = os.getenv(f'{name}_FILE')
            if fp:
                try:
                    return Path(fp).read_text().strip() or None
                except OSError:
                    pass
            return None
        return (
            _file_fallback('GEMINI_API_KEY')
            or _file_fallback('GOOGLE_API_KEY')
            or self.get('api_keys.gemini_api_key') or None
        )

    @property
    def groq_api_key(self) -> Optional[str]:
        """Groq API key."""
        return os.getenv('GROQ_API_KEY') or self.get('api_keys.groq_api_key') or None
    
    # Generation defaults
    @property
    def max_skills(self) -> int:
        """Maximum skills."""
        return self.get('generation.max_skills', 20)
    
    @property
    def max_achievements(self) -> int:
        """Maximum achievements."""
        return self.get('generation.max_achievements', 5)
    
    @property
    def max_publications(self) -> int:
        """Maximum publications."""
        return self.get('generation.max_publications', 10)
    
    @property
    def output_formats(self) -> Dict[str, bool]:
        """Output formats to generate."""
        return self.get('generation.formats', {
            'ats_docx': True,
            'human_pdf': True,
            'human_docx': True
        })

    @property
    def ai_attribution_default(self) -> bool:
        """Global default for AI-assistance disclosure across sessions (GAP-321)."""
        return bool(self.get('generation.ai_attribution_default', False))

    # Position style presets (issue #126)
    @property
    def position_styles(self) -> Dict[str, Any]:
        """Position-style preset dict, merging config.yaml overrides with defaults."""
        cfg_styles = self.get('position_styles') or {}
        if not cfg_styles:
            return _DEFAULT_POSITION_STYLES
        merged = dict(_DEFAULT_POSITION_STYLES)
        for key, overrides in cfg_styles.items():
            if key in merged:
                merged[key] = {**merged[key], **overrides}
            else:
                merged[key] = overrides
        return merged

    def get_position_style_for_domain(self, domain: str) -> Tuple[str, Dict[str, Any]]:
        """Return (style_key, style_dict) for the best-matching position style.

        Iterates non-default presets first and returns the first whose
        domain_terms list contains any substring of *domain*.  Falls back
        to 'industry' when nothing matches.
        """
        domain_lower = (domain or '').lower()
        styles = self.position_styles
        for key, style in styles.items():
            if key == 'industry':
                continue
            terms = style.get('domain_terms') or []
            if domain_lower and any(t in domain_lower for t in terms):
                return key, style
        industry = styles.get('industry', _DEFAULT_POSITION_STYLES['industry'])
        return 'industry', industry

    # Session settings
    @property
    def session_auto_save(self) -> bool:
        """Auto-save sessions."""
        return self.get('session.auto_save', True)
    
    @property
    def session_dir(self) -> str:
        """Session directory."""
        if env := os.getenv('CV_SESSION_DIR'):
            return env
        configured = self.get('session.session_dir')
        if configured:
            return str(Path(configured).expanduser())
        return str(Path(self.output_dir) / 'sessions')
    
    @property
    def history_file(self) -> str:
        """Input history file."""
        return self.get('session.history_file', 'files/.input_history')

    @property
    def idle_timeout_minutes(self) -> int:
        """Idle session eviction timeout in minutes."""
        return int(self.get('session.idle_timeout_minutes', 120))
    
    # Google Drive
    @property
    def google_drive_enabled(self) -> bool:
        """Google Drive integration enabled."""
        return self.get('google_drive.enabled', False)
    
    @property
    def google_credentials_path(self) -> str:
        """Google Drive credentials path."""
        return self.get('google_drive.credentials_path', '~/.credentials/google_drive_credentials.json')
    
    @property
    def google_token_path(self) -> str:
        """Google Drive token path."""
        return self.get('google_drive.token_path', '~/.credentials/google_drive_token.pickle')
    
    # Web UI
    @property
    def web_host(self) -> str:
        """Web UI host."""
        return os.getenv('CV_WEB_HOST') or self.get('web.host', '127.0.0.1')
    
    @property
    def web_port(self) -> int:
        """Web UI port."""
        port = os.getenv('CV_WEB_PORT')
        if port:
            return int(port)
        return self.get('web.port', 5000)
    
    @property
    def web_debug(self) -> bool:
        """Web UI debug mode."""
        debug = os.getenv('CV_WEB_DEBUG')
        if debug:
            return debug.lower() in ('true', '1', 'yes')
        return self.get('web.debug', False)
    
    # Logging
    @property
    def log_level(self) -> str:
        """Logging level."""
        return os.getenv('CV_LOG_LEVEL') or self.get('logging.level', 'INFO')
    
    @property
    def log_file(self) -> Optional[str]:
        """Log file path (None for console only)."""
        return os.getenv('CV_LOG_FILE') or self.get('logging.file')
    
    @property
    def log_dir(self) -> str:
        """Log directory path."""
        if env := os.getenv('CV_LOG_DIR'):
            return env
        configured = self.get('logging.log_dir')
        if configured:
            return str(Path(configured).expanduser())
        return str(Path(self.output_dir) / 'logs')


class ConfigurationError(Exception):
    """Raised when the configuration is invalid or missing required values."""


# Global config instance
_config: Optional[Config] = None


def get_config(reload: bool = False) -> Config:
    """
    Get global configuration instance.

    Args:
        reload: Force reload configuration

    Returns:
        Config instance
    """
    global _config
    if _config is None or reload:
        _config = Config()
    return _config


def validate_config(provider: Optional[str] = None) -> None:
    """Validate that required configuration values are present.

    Call at application startup (before first request).  Pass the resolved
    provider string (from CLI arg or env override) so that explicit CLI
    values are accepted even when config.yaml is sparse.

    Raises:
        ConfigurationError: if no LLM provider is configured from any source,
                            or if no data path has been explicitly configured.
    """
    cfg = get_config()

    # ── LLM provider ─────────────────────────────────────────────────────────
    effective_provider = provider or cfg.llm_provider
    if not effective_provider or not str(effective_provider).strip():
        raise ConfigurationError(
            "No LLM provider configured. "
            "Set `llm.default_provider` in config.yaml or pass `--llm-provider` "
            "on the command line. "
            "Valid values: copilot-oauth, copilot, github, openai, anthropic, gemini, groq, local, copilot-sdk."
        )

    # ── Data root / master CV path ────────────────────────────────────────────
    # Require at least one explicit source (env var or config.yaml).
    # Falling back to the built-in ~/CV default without any configuration is
    # almost always a misconfiguration, especially in Docker.
    data_explicitly_configured = bool(
        os.getenv('CV_DATA_ROOT')
        or os.getenv('CV_MASTER_DATA_PATH')
        or cfg.get('data.root')
        or cfg.get('data.master_cv')
    )
    if not data_explicitly_configured:
        raise ConfigurationError(
            "No data path configured. "
            "Set CV_DATA_ROOT (e.g. CV_DATA_ROOT=~/CV) or add "
            "'data.root' / 'data.master_cv' to config.yaml."
        )


def setup_logging(config: Optional[Config] = None) -> None:
    """Configure Python logging from config settings.

    Sets up the root logger with a consistent format, optional file handler,
    and level from config (or ``CV_LOG_LEVEL`` env var).  Safe to call more
    than once — subsequent calls are no-ops unless *config* differs.

    Args:
        config: Config instance to read logging settings from.  Defaults to
                the global config returned by ``get_config()``.
    """
    cfg = config or get_config()
    level_name = cfg.log_level.upper()
    level = getattr(logging, level_name, logging.INFO)

    class _RequestContextFilter(logging.Filter):
        """Inject flask.g.user_id into every log record (falls back to '-')."""
        def filter(self, record):
            try:
                from flask import g  # noqa: PLC0415
                record.user_id = g.get('user_id') or '-'
            except RuntimeError:
                record.user_id = '-'
            return True

    fmt = logging.Formatter(
        fmt="%(asctime)s  %(levelname)-8s  [%(user_id)s]  %(name)s — %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    root = logging.getLogger()
    # Avoid duplicate handlers on repeated calls (e.g. in tests).
    if root.handlers:
        return

    root.setLevel(level)

    # Always add a console handler.
    ch = logging.StreamHandler()
    ch.setLevel(level)
    ch.setFormatter(fmt)
    ch.addFilter(_RequestContextFilter())
    root.addHandler(ch)

    # Optionally add a rotating file handler.
    log_file = cfg.log_file
    if not log_file:
        log_dir = cfg.log_dir
        if log_dir:
            Path(log_dir).mkdir(parents=True, exist_ok=True)
            log_file = str(Path(log_dir) / "cv_builder.log")
    elif not Path(log_file).is_absolute():
        # Bare filename or relative path — resolve against log_dir so the
        # file lands in the configured directory rather than cwd.
        log_dir = cfg.log_dir
        if log_dir:
            Path(log_dir).mkdir(parents=True, exist_ok=True)
            log_file = str(Path(log_dir) / log_file)
        else:
            log_file = str(Path(log_file).expanduser())

    if log_file:
        try:
            from logging.handlers import RotatingFileHandler
            Path(log_file).parent.mkdir(parents=True, exist_ok=True)
            fh = RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=3)
            fh.setLevel(level)
            fh.setFormatter(fmt)
            fh.addFilter(_RequestContextFilter())
            root.addHandler(fh)
        except OSError as exc:
            root.warning("Could not open log file %s: %s", log_file, exc)
