# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Shared git-commit/push error-handling helpers.

Relocated from ``scripts/routes/generation_routes.py`` so that both that
module and ``scripts/routes/master_data_routes.py`` can depend on a single
canonical implementation instead of one route module reaching into another.
"""

from __future__ import annotations

import subprocess
from typing import Optional

from flask import current_app


def git_commit_error(message: str, detail: Optional[str] = None) -> str:
    if detail:
        current_app.logger.error('%s %s', message, detail)
    else:
        current_app.logger.error(message)
    return message


def git_push_if_remote(git_dir: str) -> Optional[str]:
    """Push the current branch if the repo has any configured remotes.

    Returns None on success (or when there is no remote), or an error
    string if the push fails.  Never raises.
    """
    try:
        remote_check = subprocess.run(
            ['git', '-C', git_dir, 'remote'],
            capture_output=True, text=True,
        )
        if not remote_check.stdout.strip():
            return None  # no remotes configured

        push_result = subprocess.run(
            ['git', '-C', git_dir, 'push'],
            capture_output=True, text=True,
        )
        if push_result.returncode != 0:
            detail = push_result.stderr.strip() or push_result.stdout.strip()
            current_app.logger.error('Git push failed. %s', detail)
            return 'Git push failed. See server logs for details.'
        return None
    except Exception as exc:
        current_app.logger.error('Git push failed. %s', exc)
        return 'Git push failed. See server logs for details.'
