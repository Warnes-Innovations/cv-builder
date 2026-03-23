# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

from __future__ import annotations

import shutil
from pathlib import Path

EXAMPLE_PROFILES_ROOT = (
    Path(__file__).resolve().parent.parent / "fixtures" / "example_profiles"
)


def resolve_example_profile(profile_name: str = "medium") -> Path:
    normalized = (profile_name or "medium").strip().lower()
    profile_dir = EXAMPLE_PROFILES_ROOT / normalized
    if not profile_dir.exists():
        available = ", ".join(
            sorted(p.name for p in EXAMPLE_PROFILES_ROOT.iterdir())
        )
        raise ValueError(
            f"Unknown example profile {profile_name!r}. Available: {available}"
        )
    return profile_dir


def materialize_example_profile(
    target_root: Path,
    profile_name: str = "medium",
) -> tuple[Path, Path, Path]:
    profile_dir = resolve_example_profile(profile_name)
    target_root.mkdir(parents=True, exist_ok=True)

    master_data_path = target_root / "Master_CV_Data.json"
    publications_path = target_root / "publications.bib"
    output_dir = target_root / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy2(profile_dir / "Master_CV_Data.json", master_data_path)
    shutil.copy2(profile_dir / "publications.bib", publications_path)

    return master_data_path, publications_path, output_dir
