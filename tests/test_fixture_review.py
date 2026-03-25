# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

from __future__ import annotations

import json
from pathlib import Path

from tests.helpers.fixture_review import (
    DEFAULT_JOB_FIXTURE,
    DEFAULT_PROFILE_NAME,
    MANIFEST_FILENAME,
    MANIFEST_VERSION,
    generate_fixture_review_bundle,
    load_fixture_job_analysis,
    resolve_fixture_job,
)


def test_default_fixture_job_is_repository_owned() -> None:
    fixture_path = resolve_fixture_job()
    job_analysis = load_fixture_job_analysis()

    assert fixture_path == DEFAULT_JOB_FIXTURE.resolve()
    assert fixture_path.is_file()
    assert job_analysis["title"] == "Senior Platform Engineer"
    assert job_analysis["company"] == "Northstar Systems"
    assert len(job_analysis["required_skills"]) >= 5
    assert len(job_analysis["ats_keywords"]) >= 8


def test_generate_fixture_review_bundle_creates_manifest_and_raw_artifacts(
    tmp_path: Path,
) -> None:
    bundle_root = tmp_path / "fixture-review"

    manifest = generate_fixture_review_bundle(bundle_root)

    manifest_path = bundle_root / MANIFEST_FILENAME
    persisted_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert manifest == persisted_manifest
    assert manifest["manifest_version"] == MANIFEST_VERSION
    assert manifest["profile"]["name"] == DEFAULT_PROFILE_NAME
    assert manifest["profile"]["source_fixture"] == (
        "tests/fixtures/example_profiles/complex"
    )
    assert manifest["job_fixture"]["path"] == (
        "tests/fixtures/fixture_job_engineering.json"
    )
    assert manifest["job_fixture"]["title"] == "Senior Platform Engineer"
    assert manifest["job_fixture"]["company"] == "Northstar Systems"
    assert manifest["bundle"]["manifest_path"] == MANIFEST_FILENAME
    assert manifest["bundle"]["raw_output_dir"] == "raw"

    artifacts = manifest["artifacts"]
    required_artifacts = (
        "ats_docx",
        "human_html",
        "human_pdf",
        "human_docx",
        "metadata_json",
        "job_description_txt",
    )
    for artifact_name in required_artifacts:
        artifact_path = artifacts[artifact_name]
        assert artifact_path is not None
        assert (bundle_root / artifact_path).exists()

    summary = manifest["summary"]
    assert summary["artifacts_generated"] >= 5
    assert summary["selected_content_summary"]["experiences_count"] >= 12
    assert summary["selected_content_summary"]["skills_count"] >= 5
    assert summary["selected_content_summary"]["achievements_count"] >= 5
