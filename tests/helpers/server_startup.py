# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Shared startup timeout for tests that launch their own web_app server.

Every fixture that starts a server and waits for it should use
SERVER_STARTUP_TIMEOUT rather than its own number: three fixtures once used
20s, 30s and 15s, and whole test modules skipped on a busy machine.
"""

from __future__ import annotations

import os

# Seconds to wait for a test-launched server to answer. Startup measured
# 22-30s on an idle machine and up to ~70s under heavy load (2026-10-21).
# The waits poll, so a generous limit costs nothing when the server is quick.
# Override with CV_SERVER_STARTUP_TIMEOUT.
SERVER_STARTUP_TIMEOUT = int(os.environ.get("CV_SERVER_STARTUP_TIMEOUT") or "180")
