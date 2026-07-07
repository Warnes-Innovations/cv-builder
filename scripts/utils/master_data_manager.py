# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
"""Master CV data file read abstraction for CLI command handlers."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


class MasterDataManager:
    """Encapsulates read operations on the master CV data file.

    Provides a single testable/mockable seam with audit logging for
    CLI handlers that need to access master data without an active
    session (e.g. ``master get``).
    """

    def __init__(self, config: Any = None) -> None:
        from utils.config import get_config
        cfg = config or get_config()
        self._path: Path = Path(cfg.master_cv_path).expanduser()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def path(self) -> Path:
        """Resolved path to the master CV data file."""
        return self._path

    def read(self, section: Optional[str] = None) -> Any:
        """Load the master CV data and return it (or a single section).

        Parameters
        ----------
        section :
            If given, return ``data[section]``; raises ``KeyError`` when
            the key is absent.  Pass ``None`` to return the full document.

        Raises
        ------
        FileNotFoundError
            If the master CV file does not exist at the configured path.
        json.JSONDecodeError
            If the file exists but contains invalid JSON.
        KeyError
            If *section* is given and is not a top-level key.
        """
        logger.info("master-data read  path=%s  section=%s", self._path, section)
        with open(self._path, encoding="utf-8") as fh:
            data: dict[str, Any] = json.load(fh)
        if section is not None:
            if section not in data:
                raise KeyError(f"Section {section!r} not found in master CV data.")
            return data[section]
        return data
