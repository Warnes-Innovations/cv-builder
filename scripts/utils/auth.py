# Copyright (C) 2024-2025 Gregory R. Warnes
# SPDX-License-Identifier: MIT
"""Keycloak OIDC authentication for multi-user deployments.

Disabled automatically when KEYCLOAK_URL is not set, so single-user
local operation requires no configuration changes.

Environment variables (all required when auth is enabled):
    KEYCLOAK_URL            Base URL of the Keycloak server
                            e.g. https://auth.cvbuilder.cc
    KEYCLOAK_REALM          Realm name, e.g. cvbuilder
    KEYCLOAK_CLIENT_ID      OIDC client ID, e.g. cv-builder-app
    KEYCLOAK_CLIENT_SECRET  OIDC client secret (from Keycloak admin)
    CV_SECRET_KEY           Flask session signing key (random 32-byte hex)
"""
import functools
import logging
import os
from pathlib import Path
from typing import Optional

from flask import Flask, g, redirect, request, session, url_for

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# Module-level state (initialised by init_auth)
# --------------------------------------------------------------------------

_oauth = None           # authlib OAuth instance
_auth_enabled = False   # True when KEYCLOAK_URL is configured


def _read_secret(name: str) -> str:
    """Read a secret from env var *name* or the file at *name*_FILE.

    Docker Swarm mounts secrets as files; the stack passes their paths via
    ``{VAR}_FILE`` env vars.  Direct ``{VAR}`` env vars take precedence so
    local dev still works without Docker.
    """
    value = os.getenv(name, '')
    if value:
        return value
    file_path = os.getenv(f'{name}_FILE', '')
    if file_path:
        try:
            return Path(file_path).read_text().strip()
        except OSError as exc:
            logger.warning('Could not read secret file %s: %s', file_path, exc)
    return ''


def is_enabled() -> bool:
    """Return True when Keycloak auth is active."""
    return _auth_enabled


def init_auth(app: Flask) -> bool:
    """Configure Keycloak OIDC on *app*.  Returns True if auth is enabled."""
    global _oauth, _auth_enabled

    keycloak_url = os.getenv('KEYCLOAK_URL', '').rstrip('/')
    realm = os.getenv('KEYCLOAK_REALM', '')
    client_id = os.getenv('KEYCLOAK_CLIENT_ID', '')
    client_secret = _read_secret('KEYCLOAK_CLIENT_SECRET')

    if not keycloak_url:
        logger.info(
            'KEYCLOAK_URL not set — running in single-user mode (no auth)'
        )
        _auth_enabled = False
        return False

    if not all([realm, client_id, client_secret]):
        raise RuntimeError(
            'KEYCLOAK_URL is set but KEYCLOAK_REALM / KEYCLOAK_CLIENT_ID '
            '/ KEYCLOAK_CLIENT_SECRET are missing.'
        )

    secret_key = _read_secret('CV_SECRET_KEY')
    if not secret_key:
        raise RuntimeError(
            'CV_SECRET_KEY must be set when Keycloak auth is enabled. '
            'Generate one with: python -c "import secrets; '
            'print(secrets.token_hex(32))"'
        )

    app.secret_key = secret_key

    # Lazy import so authlib is only required when auth is actually used.
    from authlib.integrations.flask_client import OAuth  # noqa: PLC0415

    _oauth = OAuth(app)
    metadata_url = (
        f'{keycloak_url}/realms/{realm}'
        '/.well-known/openid-configuration'
    )
    _oauth.register(
        name='keycloak',
        server_metadata_url=metadata_url,
        client_id=client_id,
        client_secret=client_secret,
        client_kwargs={'scope': 'openid profile email'},
    )

    _auth_enabled = True
    logger.info(
        'Keycloak OIDC auth enabled: realm=%s client=%s', realm, client_id
    )
    return True


# --------------------------------------------------------------------------
# Request helpers
# --------------------------------------------------------------------------

def load_user_from_session() -> None:
    """Populate ``flask.g`` with user info from the signed session cookie.

    Called from a ``before_request`` hook registered by the app.
    """
    g.user_id = session.get('user_id')
    g.user_email = session.get('user_email')
    g.user_name = session.get('user_name')


def get_current_user_id() -> Optional[str]:
    """Return the authenticated user's Keycloak ``sub``, or None."""
    try:
        return getattr(g, 'user_id', None)
    except RuntimeError:
        return None


# --------------------------------------------------------------------------
# Decorator
# --------------------------------------------------------------------------

# Routes exempt from the login requirement even when auth is enabled.
_AUTH_EXEMPT_PREFIXES = ('/login', '/auth/', '/favicon.ico', '/logo')
_AUTH_EXEMPT_STATIC_EXTS = ('.js', '.css', '.png', '.ico', '.map', '.woff2')


def is_exempt(path: str) -> bool:
    """Return True when *path* should bypass the login check."""
    if any(path.startswith(p) for p in _AUTH_EXEMPT_PREFIXES):
        return True
    if any(path.endswith(ext) for ext in _AUTH_EXEMPT_STATIC_EXTS):
        return True
    return False


def login_required(f):
    """Redirect to /login when auth is enabled and user is absent."""
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        if _auth_enabled and not g.get('user_id'):
            return redirect(url_for('auth.login', next=request.url))
        return f(*args, **kwargs)
    return wrapper


# --------------------------------------------------------------------------
# User-scoped paths
# --------------------------------------------------------------------------

def user_data_paths(user_id: str, data_root: str) -> dict:
    """Return per-user filesystem paths derived from *data_root*.

    Docker deployment sets CV_DATA_ROOT=/data; user files land under
    /data/users/{user_id}/.
    """
    base = Path(data_root) / 'users' / user_id
    return {
        'master_data': str(base / 'Master_CV_Data.json'),
        'publications': str(base / 'publications.bib'),
        'output_dir':   str(base / 'cv-builder'),
    }


def ensure_master_cv_exists(master_data_path: str) -> None:
    """Create a blank Master_CV_Data.json skeleton at *master_data_path* if absent.

    Safe to call on every startup — it is a no-op when the file already exists.
    """
    p = Path(master_data_path).expanduser()
    if not p.exists():
        p.parent.mkdir(parents=True, exist_ok=True)
        _write_blank_master_cv(p)


def ensure_user_dirs(paths: dict) -> None:
    """Create per-user directories if they don't exist."""
    Path(paths['output_dir']).mkdir(parents=True, exist_ok=True)
    ensure_master_cv_exists(paths['master_data'])


def _write_blank_master_cv(dest: Path) -> None:
    """Write a minimal valid Master_CV_Data.json skeleton."""
    import json  # noqa: PLC0415
    skeleton = {
        "personal_info": {
            "name": "",
            "email": "",
            "phone": "",
            "location": "",
            "linkedin": "",
            "github": "",
            "website": ""
        },
        "summary_variants": [],
        "work_experience": [],
        "education": [],
        "skills": {},
        "publications": [],
        "certifications": [],
        "awards": []
    }
    dest.write_text(json.dumps(skeleton, indent=2))
    logger.info('Created blank Master_CV_Data.json at %s', dest)
