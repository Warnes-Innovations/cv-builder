# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Shared Master CV data backup-pruning helper.

Both `_save_master` implementations (`scripts/web_app.py` and
`scripts/routes/master_data_routes.py`) create their own timestamped backup
before every write, using two different filename conventions. Rather than
reimplementing retention/pruning rules twice, both call `prune_backups` here
after creating their backup.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)


def prune_backups(backup_dir: Path, retention_days: int, max_count: int) -> List[Path]:
    """Delete Master CV data backup snapshots older than `retention_days` and/or
    beyond the newest `max_count`.

    Uses the same `Master_CV_*.json` glob as the `/api/master-data/history`
    listing route, so pruning only ever removes files that route would show.
    Either rule is disabled independently when its argument is <= 0.

    Returns the list of deleted paths (used by tests and for logging).
    """
    if not backup_dir.exists():
        return []

    snapshots = sorted(
        backup_dir.glob("Master_CV_*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    to_delete: set = set()

    if retention_days > 0:
        cutoff = time.time() - (retention_days * 86400)
        to_delete.update(p for p in snapshots if p.stat().st_mtime < cutoff)

    if max_count > 0 and len(snapshots) > max_count:
        to_delete.update(snapshots[max_count:])

    deleted = []
    for p in sorted(to_delete):
        try:
            p.unlink()
            deleted.append(p)
        except OSError:
            logger.warning("Failed to prune backup %s", p, exc_info=True)

    return deleted
