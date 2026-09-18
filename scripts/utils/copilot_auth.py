# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
GitHub Copilot OAuth Authentication via Device Flow.

Flow:
  1. POST /login/device/code  → get device_code + user_code
  2. User visits verification_uri and enters user_code in browser
  3. Poll /login/oauth/access_token until approved → GitHub OAuth token
  4. Exchange GitHub token for short-lived Copilot API token
     (GET https://api.github.com/copilot_internal/v2/token)
  5. Use Copilot token as Bearer for https://api.githubcopilot.com

The Copilot token expires in ~30 minutes; this module auto-refreshes it.
The GitHub OAuth token is persisted to disk so re-auth is only needed
when it expires or is revoked.

The client_id below is the public Device Flow client used by the official
VS Code extension and documented in multiple open-source Copilot clients.
"""

import json
import logging
import os
import tempfile
import time
from pathlib import Path
import requests

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

CLIENT_ID          = "Iv1.b507a08c87ecfe98"   # GitHub Copilot Device Flow app
DEVICE_CODE_URL    = "https://github.com/login/device/code"
TOKEN_URL          = "https://github.com/login/oauth/access_token"
COPILOT_TOKEN_URL  = "https://api.github.com/copilot_internal/v2/token"
SCOPE              = "read:user"

TOKEN_CACHE_PATH   = Path.home() / ".config" / "cv-builder" / "copilot_oauth.json"


# ── Disk cache helpers ────────────────────────────────────────────────────────

def _load_cache() -> dict:
    try:
        if TOKEN_CACHE_PATH.exists():
            return json.loads(TOKEN_CACHE_PATH.read_text())
    except Exception:
        logger.debug("Token cache unreadable — starting fresh", exc_info=True)
    return {}


def _save_cache(data: dict) -> None:
    """Persist the token cache so that only its owner can read it.

    The cache holds the GitHub OAuth token, so the file must be 0600 and its
    directory 0700.

    Do NOT simplify this back to ``TOKEN_CACHE_PATH.write_text(...)``. That
    creates the file under the process umask — 0644 with the usual 022, and
    0666 with a permissive one — so every other account on the machine can
    read the token, or even replace it.

    Do NOT "fix" that by adding a chmod after the write, either. The token then
    sits on disk world-readable for the interval between the two calls.

    Instead the file is born 0600, because ``tempfile.mkstemp`` creates it that
    way, and is then moved into place with ``os.replace``. The move is atomic,
    so a reader sees either the old cache or the complete new one. It also
    REPLACES an existing world-readable file rather than inheriting its mode,
    which is how a cache written by the old code gets corrected.
    """
    cache_dir = TOKEN_CACHE_PATH.parent
    cache_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    try:
        # mkdir ignores ``mode`` when the directory already exists, and
        # existing caches were created 0755. The file's own 0600 is what
        # protects the token; this is the second layer, so a failure here is
        # logged rather than allowed to abort the save.
        os.chmod(cache_dir, 0o700)
    except OSError:
        logger.warning("Could not restrict %s to 0700", cache_dir, exc_info=True)

    fd, tmp_name = tempfile.mkstemp(dir=cache_dir, prefix=".copilot_oauth.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_name, TOKEN_CACHE_PATH)
    except BaseException:
        # The temp file holds the token as well: never leave it behind.
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass
        raise


def clear_cache() -> None:
    """Remove cached tokens (force re-authentication)."""
    if TOKEN_CACHE_PATH.exists():
        TOKEN_CACHE_PATH.unlink()


# ── Device flow ───────────────────────────────────────────────────────────────

def start_device_flow() -> dict:
    """
    Start the GitHub Device Flow.

    Returns dict with:
      device_code, user_code, verification_uri, expires_in, interval
    """
    resp = requests.post(
        DEVICE_CODE_URL,
        data={"client_id": CLIENT_ID, "scope": SCOPE},
        headers={"Accept": "application/json"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"Device flow error: {data['error_description']}")
    return data


def poll_for_github_token(device_code: str, interval: int = 5, timeout: int = 300) -> str:
    """
    Poll until the user approves the device flow or timeout expires.

    Returns the GitHub OAuth access token string.
    Raises TimeoutError or RuntimeError on failure.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(interval)
        resp = requests.post(
            TOKEN_URL,
            data={
                "client_id":   CLIENT_ID,
                "device_code": device_code,
                "grant_type":  "urn:ietf:params:oauth:grant-type:device_code",
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        error = data.get("error")
        if error == "authorization_pending":
            continue
        elif error == "slow_down":
            interval += 5
            continue
        elif error == "expired_token":
            raise RuntimeError("Device flow expired. Please start over.")
        elif error == "access_denied":
            raise RuntimeError("User denied access.")
        elif error:
            raise RuntimeError(f"OAuth error: {data.get('error_description', error)}")
        elif "access_token" in data:
            return data["access_token"]

    raise TimeoutError("Timed out waiting for user to approve device flow.")


# ── Copilot token exchange ────────────────────────────────────────────────────

def exchange_for_copilot_token(github_oauth_token: str) -> dict:
    """
    Exchange a GitHub OAuth token for a short-lived Copilot API token.

    Returns dict with 'token' and 'expires_at' (unix timestamp).
    """
    resp = requests.get(
        COPILOT_TOKEN_URL,
        headers={
            "Authorization": f"token {github_oauth_token}",
            "Accept":        "application/json",
        },
        timeout=10,
    )
    if resp.status_code == 401:
        raise RuntimeError(
            "GitHub token rejected by Copilot API. "
            "Ensure your GitHub account has an active Copilot subscription."
        )
    resp.raise_for_status()
    data = resp.json()
    if "token" not in data:
        raise RuntimeError(f"Unexpected Copilot token response: {data}")
    return data   # {'token': '...', 'expires_at': <unix_ts>}


# ── High-level manager ────────────────────────────────────────────────────────

class CopilotAuthManager:
    """
    Manages GitHub OAuth + Copilot token lifecycle.

    Usage:
        mgr = CopilotAuthManager()
        if not mgr.is_authenticated():
            flow = mgr.start_device_flow()
            # show flow['user_code'] and flow['verification_uri'] to user
            mgr.complete_device_flow(flow['device_code'], flow['interval'])
        token = mgr.get_copilot_token()
    """

    def __init__(self):
        self._cache = _load_cache()

    def is_authenticated(self) -> bool:
        """True if we have a cached GitHub OAuth token."""
        return bool(self._cache.get("github_oauth_token"))

    def start_device_flow(self) -> dict:
        """Kick off device flow; returns the full response for the frontend."""
        return start_device_flow()

    def complete_device_flow(self, device_code: str, interval: int = 5) -> None:
        """
        Block until the user approves, then persist the GitHub OAuth token.
        Call this on a background thread so the server stays responsive.
        """
        token = poll_for_github_token(device_code, interval=interval)
        self._cache["github_oauth_token"] = token
        self._cache.pop("copilot_token", None)
        self._cache.pop("copilot_expires_at", None)
        _save_cache(self._cache)

    def get_copilot_token(self) -> str:
        """
        Return a valid Copilot API token, refreshing if it has expired.
        Raises RuntimeError if not authenticated yet.
        """
        if not self.is_authenticated():
            raise RuntimeError(
                "Not authenticated. Call start_device_flow() and complete_device_flow() first."
            )

        # Refresh Copilot token if missing or expiring within 60 seconds
        expires_at = self._cache.get("copilot_expires_at", 0)
        if not self._cache.get("copilot_token") or time.time() > expires_at - 60:
            data = exchange_for_copilot_token(self._cache["github_oauth_token"])
            self._cache["copilot_token"]      = data["token"]
            self._cache["copilot_expires_at"] = data.get("expires_at", time.time() + 1680)
            _save_cache(self._cache)

        return self._cache["copilot_token"]

    def logout(self) -> None:
        """Remove all cached credentials."""
        self._cache = {}
        clear_cache()

    @property
    def status(self) -> dict:
        """Return auth status summary (safe to expose to API)."""
        has_oauth  = bool(self._cache.get("github_oauth_token"))
        has_copilot = bool(self._cache.get("copilot_token"))
        expires_at  = self._cache.get("copilot_expires_at", 0)
        return {
            "authenticated":       has_oauth,
            "copilot_token_ready": has_copilot,
            "copilot_expires_in":  max(0, int(expires_at - time.time())) if has_copilot else 0,
        }
