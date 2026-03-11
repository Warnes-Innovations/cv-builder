"""
Configuration loader for CV Builder.

Loads configuration from multiple sources in priority order:
1. Environment variables (highest priority)
2. .env file (if present)
3. config.yaml (default settings)
4. Hardcoded defaults (fallback)
"""

import os
import yaml
from pathlib import Path
from typing import Any, Dict, Optional
from dotenv import load_dotenv


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
        if load_env:
            env_file = Path.cwd() / ".env"
            if env_file.exists():
                load_dotenv(env_file)
        
        # Load config.yaml
        if config_file is None:
            config_file = Path.cwd() / "config.yaml"
        else:
            config_file = Path(config_file)
        
        if config_file.exists():
            with open(config_file, 'r') as f:
                self._config = yaml.safe_load(f) or {}
        
        # Expand home directory paths
        self._expand_paths()
    
    def _expand_paths(self):
        """Expand ~ in paths to absolute paths."""
        if 'data' in self._config:
            for key in ['master_cv', 'publications', 'output_dir']:
                if key in self._config['data']:
                    path = self._config['data'][key]
                    if isinstance(path, str) and path.startswith('~'):
                        self._config['data'][key] = str(Path(path).expanduser())
        
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
                        self._config['logging'][key] = str(Path(path).expanduser())
    
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
    def master_cv_path(self) -> str:
        """Path to Master_CV_Data.json."""
        return os.getenv('CV_MASTER_DATA_PATH') or self.get('data.master_cv', 'Master_CV_Data.json')
    
    @property
    def publications_path(self) -> str:
        """Path to publications.bib."""
        return os.getenv('CV_PUBLICATIONS_PATH') or self.get('data.publications', 'publications.bib')
    
    @property
    def output_dir(self) -> str:
        """Output directory for generated CVs."""
        return os.getenv('CV_OUTPUT_DIR') or self.get('data.output_dir', 'files')
    
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
    
    # API Keys
    @property
    def github_token(self) -> Optional[str]:
        """GitHub Models API token."""
        return os.getenv('GITHUB_MODELS_TOKEN')
    
    @property
    def openai_api_key(self) -> Optional[str]:
        """OpenAI API key."""
        return os.getenv('OPENAI_API_KEY')
    
    @property
    def anthropic_api_key(self) -> Optional[str]:
        """Anthropic API key."""
        return os.getenv('ANTHROPIC_API_KEY')
    
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
    
    # Session settings
    @property
    def session_auto_save(self) -> bool:
        """Auto-save sessions."""
        return self.get('session.auto_save', True)
    
    @property
    def session_dir(self) -> str:
        """Session directory."""
        return self.get('session.session_dir', 'files/sessions')
    
    @property
    def history_file(self) -> str:
        """Input history file."""
        return self.get('session.history_file', 'files/.input_history')
    
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
        return os.getenv('CV_LOG_DIR') or self.get('logging.log_dir', './logs')


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
        ConfigurationError: if no LLM provider is configured from any source.
    """
    effective_provider = provider or get_config().llm_provider
    if not effective_provider or not str(effective_provider).strip():
        raise ConfigurationError(
            "No LLM provider configured. "
            "Set `llm.default_provider` in config.yaml or pass `--llm-provider` "
            "on the command line. "
            "Valid values: copilot-oauth, copilot, github, openai, anthropic, gemini, groq, local."
        )
