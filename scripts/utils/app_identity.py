# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Who this running app is: its version, and whether it is a test server.

Both answers are surfaced on ``GET /api/status`` so a caller can tell one
cv-builder process from another *before* talking to it. That matters because
the test harness reuses an already-running server when one answers, and until
this existed ``/api/status`` returned nothing that distinguished a disposable
test server from Dr. Greg's live app.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

# Returned when the version genuinely cannot be read. Deliberately not a
# plausible-looking number: a wrong version silently reported as fact is worse
# than an obvious "I don't know", because callers pin behaviour to versions.
UNKNOWN_VERSION = "unknown"

_TESTING_ENV_VALUES = {"test", "testing"}
_TRUTHY = {"1", "true", "yes", "on"}


@lru_cache(maxsize=1)
def get_app_version() -> str:
    """Return the application version string, or ``UNKNOWN_VERSION``.

    package.json is the single source of truth. It is read rather than mirrored
    into a Python constant on purpose: a second copy is a second thing to
    forget, and the two would drift silently because nothing compares them.

    Cached, so the file is read once per process. Tests that manipulate
    package.json must call ``get_app_version.cache_clear()``.
    """
    package_json = Path(__file__).resolve().parents[2] / "package.json"
    try:
        data = json.loads(package_json.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        # Missing, unreadable, or not valid JSON. A deployment that ships only
        # the Python side is a legitimate case, not an error worth raising
        # from a status endpoint.
        return UNKNOWN_VERSION

    if not isinstance(data, dict):
        return UNKNOWN_VERSION
    version = data.get("version")
    if isinstance(version, str) and version.strip():
        return version.strip()
    return UNKNOWN_VERSION


def is_testing_server() -> bool:
    """True only when this process was started as a test server.

    THE FAILURE DIRECTION MATTERS, so do not "simplify" this into something
    that guesses true. A caller uses this to decide whether a server is safe to
    reuse and write test data into. A false *true* hands a test run Dr. Greg's
    live app — the exact outcome the marker exists to prevent — while a false
    *false* only costs the harness a spawn it could have skipped. So every
    unknown or unreadable case must return False.

    Recognised signals, in order:
      - FLASK_ENV=testing (or =test), which the pytest fixtures set when they
        spawn a server;
      - CV_BUILDER_TESTING set to a truthy value, for callers that cannot set
        FLASK_ENV;
      - Flask's own app.config['TESTING'], set by in-process test clients.
    """
    env = (os.environ.get("FLASK_ENV") or "").strip().lower()
    if env in _TESTING_ENV_VALUES:
        return True

    explicit = (os.environ.get("CV_BUILDER_TESTING") or "").strip().lower()
    if explicit in _TRUTHY:
        return True

    try:
        from flask import current_app  # noqa: PLC0415

        return bool(current_app.config.get("TESTING"))
    except Exception:
        # No application context (CLI, worker thread, import time), or Flask
        # unavailable. Unknown means not-a-test-server; see the docstring.
        return False
