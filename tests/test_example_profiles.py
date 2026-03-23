# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

from __future__ import annotations

import json
from pathlib import Path

from scripts.utils.master_data_validator import validate_master_data_file
from tests.helpers.example_profiles import materialize_example_profile

FIXTURES_ROOT = (
    Path(__file__).resolve().parent / "fixtures" / "example_profiles"
)
SIMPLE_MASTER_PATH = FIXTURES_ROOT / "simple" / "Master_CV_Data.json"
COMPLEX_MASTER_PATH = FIXTURES_ROOT / "complex" / "Master_CV_Data.json"
MEDIUM_MASTER_PATH = FIXTURES_ROOT / "medium" / "Master_CV_Data.json"
SIMPLE_BIB_PATH = FIXTURES_ROOT / "simple" / "publications.bib"
COMPLEX_BIB_PATH = FIXTURES_ROOT / "complex" / "publications.bib"
MEDIUM_BIB_PATH = FIXTURES_ROOT / "medium" / "publications.bib"


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _bib_entry_count(path: Path) -> int:
    return sum(
        1
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.lstrip().startswith("@")
    )


def test_example_profiles_follow_a_clear_complexity_gradient() -> None:
    simple_profile = _load_json(SIMPLE_MASTER_PATH)
    complex_profile = _load_json(COMPLEX_MASTER_PATH)
    medium_profile = _load_json(MEDIUM_MASTER_PATH)

    assert len(simple_profile["experience"]) >= 3
    assert len(medium_profile["experience"]) >= 5
    assert len(complex_profile["experience"]) >= 12
    assert (
        len(simple_profile["experience"])
        < len(medium_profile["experience"])
        < len(complex_profile["experience"])
    )

    assert len(simple_profile["skills"]) >= 5
    assert len(medium_profile["skills"]) >= 7
    assert len(medium_profile["professional_summaries"]) >= 3
    assert isinstance(complex_profile["professional_summaries"], dict)
    assert len(complex_profile["professional_summaries"]) >= 4
    assert isinstance(complex_profile["skills"], dict)
    assert len(complex_profile["skills"]) >= 5

    assert len(simple_profile["selected_achievements"]) >= 2
    assert len(medium_profile["selected_achievements"]) >= 3
    assert len(complex_profile["selected_achievements"]) >= 5
    assert len(simple_profile["education"]) >= 2
    assert len(medium_profile["education"]) >= 2
    assert len(complex_profile["education"]) >= 4
    assert len(simple_profile["publications"]) >= 3
    assert len(medium_profile["publications"]) >= 5
    assert len(complex_profile["publications"]) >= 10
    assert complex_profile.get("publications_file") == "publications.bib"


def test_example_profile_bibliographies_follow_a_clear_gradient() -> None:
    assert _bib_entry_count(SIMPLE_BIB_PATH) >= 3
    assert _bib_entry_count(MEDIUM_BIB_PATH) >= 12
    assert _bib_entry_count(COMPLEX_BIB_PATH) >= 40
    assert (
        _bib_entry_count(SIMPLE_BIB_PATH)
        < _bib_entry_count(MEDIUM_BIB_PATH)
        < _bib_entry_count(COMPLEX_BIB_PATH)
    )


def test_example_profiles_pass_master_data_validation() -> None:
    for path in (
        SIMPLE_MASTER_PATH,
        MEDIUM_MASTER_PATH,
        COMPLEX_MASTER_PATH,
    ):
        result = validate_master_data_file(
            str(path),
            use_schema=False,
        )
        assert result.valid, result.errors


def test_medium_example_profile_provides_more_context_than_simple() -> None:
    simple_profile = _load_json(SIMPLE_MASTER_PATH)
    medium_profile = _load_json(MEDIUM_MASTER_PATH)

    simple_bullets = sum(
        len(entry.get("achievements", []))
        for entry in simple_profile["experience"]
    )
    medium_bullets = sum(
        len(entry.get("achievements", []))
        for entry in medium_profile["experience"]
    )
    medium_tagged_roles = sum(
        1
        for entry in medium_profile["experience"]
        if entry.get("tags") and entry.get("domain_relevance")
    )

    assert medium_bullets >= 2 * len(simple_profile["experience"])
    assert medium_bullets > simple_bullets
    assert medium_tagged_roles >= 5


def test_materialized_example_profiles_match_source_fixtures(
    tmp_path: Path,
) -> None:
    for profile_name in ("simple", "medium", "complex"):
        profile_root = tmp_path / profile_name
        master_data_path, publications_path, output_dir = (
            materialize_example_profile(
                profile_root,
                profile_name=profile_name,
            )
        )

        source_root = FIXTURES_ROOT / profile_name

        assert master_data_path.exists()
        assert publications_path.exists()
        assert output_dir.is_dir()
        assert master_data_path.read_text(encoding="utf-8") == (
            source_root / "Master_CV_Data.json"
        ).read_text(encoding="utf-8")
        assert publications_path.read_text(encoding="utf-8") == (
            source_root / "publications.bib"
        ).read_text(encoding="utf-8")

        result = validate_master_data_file(
            str(master_data_path),
            use_schema=False,
        )
        assert result.valid, result.errors
