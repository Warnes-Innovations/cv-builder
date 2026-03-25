# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

from __future__ import annotations

import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup
from scripts.utils.cv_orchestrator import CVOrchestrator
from tests.helpers.example_profiles import (
    EXAMPLE_PROFILES_ROOT,
    materialize_example_profile,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURES_ROOT = REPO_ROOT / "tests" / "fixtures"
DEFAULT_JOB_FIXTURE = FIXTURES_ROOT / "fixture_job_engineering.json"
DEFAULT_PROFILE_NAME = "complex"
RAW_OUTPUT_DIRNAME = "raw"
NORMALIZED_DIRNAME = "normalized"
MANIFEST_FILENAME = "fixture-review-manifest.json"
MANIFEST_VERSION = 2

DEFAULT_CUSTOMIZATIONS = {
    "recommended_experiences": [],
    "recommended_skills": [],
    "recommended_achievements": [],
    "omitted_experiences": [],
    "omitted_skills": [],
    "omitted_achievements": [],
    "experience_recommendations": [],
    "skill_recommendations": [],
    "accepted_publications": None,
    "rejected_publications": [],
    "summary_focus": "default",
}


def _repo_relative(path: Path) -> str:
    return str(path.resolve().relative_to(REPO_ROOT))


def resolve_fixture_job(job_fixture_path: str | Path | None = None) -> Path:
    fixture_path = (
        Path(job_fixture_path)
        if job_fixture_path else DEFAULT_JOB_FIXTURE
    )
    if not fixture_path.is_absolute():
        fixture_path = REPO_ROOT / fixture_path
    fixture_path = fixture_path.resolve()
    if not fixture_path.exists():
        raise FileNotFoundError(
            f"Fixture job analysis not found: {fixture_path}"
        )
    return fixture_path


def load_fixture_job_analysis(
    job_fixture_path: str | Path | None = None,
) -> dict[str, Any]:
    fixture_path = resolve_fixture_job(job_fixture_path)
    return json.loads(fixture_path.read_text(encoding="utf-8"))


def _write_normalized_exports(
    bundle_root: Path,
    html_path: Path,
    orchestrator: CVOrchestrator,
) -> tuple[dict[str, str | None], list[str]]:
    normalized_dir = bundle_root / NORMALIZED_DIRNAME
    normalized_dir.mkdir(parents=True, exist_ok=True)

    html_text = html_path.read_text(encoding="utf-8")
    outline_path = normalized_dir / "structure-outline.txt"
    outline_path.write_text(
        orchestrator._serialize_html_for_context(html_text),
        encoding="utf-8",
    )

    plain_text_path = normalized_dir / "plain-text.txt"
    plain_text = BeautifulSoup(html_text, "html.parser").get_text(
        "\n",
        strip=True,
    )
    plain_text_path.write_text(plain_text, encoding="utf-8")

    render_status_path = normalized_dir / "render-status.txt"
    render_png_path = normalized_dir / "render.png"
    warnings: list[str] = []
    render_png_relative: str | None = None

    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            page = browser.new_page(viewport={"width": 1440, "height": 2200})
            page.goto(html_path.resolve().as_uri(), wait_until="networkidle")
            page.screenshot(path=str(render_png_path), full_page=True)
            browser.close()
        render_status = (
            "Rendered normalized screenshot with Playwright Chromium."
        )
        render_png_relative = str(
            Path(NORMALIZED_DIRNAME) / render_png_path.name
        )
    except Exception as exc:
        render_status = (
            "Skipped normalized screenshot export. Install Chromium with "
            "`playwright install chromium` to enable render.png. "
            f"Reason: {exc}"
        )
        warnings.append(render_status)

    render_status_path.write_text(render_status, encoding="utf-8")

    normalized_exports = {
        "root": NORMALIZED_DIRNAME,
        "structure_outline_txt": str(
            Path(NORMALIZED_DIRNAME) / outline_path.name
        ),
        "plain_text_txt": str(Path(NORMALIZED_DIRNAME) / plain_text_path.name),
        "render_png": render_png_relative,
        "render_status_txt": str(
            Path(NORMALIZED_DIRNAME) / render_status_path.name
        ),
    }
    return normalized_exports, warnings


def generate_fixture_review_bundle(
    bundle_root: str | Path,
    profile_name: str = DEFAULT_PROFILE_NAME,
    job_fixture_path: str | Path | None = None,
) -> dict[str, Any]:
    bundle_root = Path(bundle_root).resolve()
    raw_output_dir = bundle_root / RAW_OUTPUT_DIRNAME
    manifest_path = bundle_root / MANIFEST_FILENAME
    bundle_root.mkdir(parents=True, exist_ok=True)
    raw_output_dir.mkdir(parents=True, exist_ok=True)

    job_fixture = resolve_fixture_job(job_fixture_path)
    job_analysis = load_fixture_job_analysis(job_fixture)

    with tempfile.TemporaryDirectory(
        prefix="cv_builder_fixture_review_"
    ) as temp_dir:
        materialized_root = Path(temp_dir)
        master_data_path, publications_path, _ = materialize_example_profile(
            materialized_root,
            profile_name=profile_name,
        )
        orchestrator = CVOrchestrator(
            master_data_path=str(master_data_path),
            publications_path=str(publications_path),
            output_dir=str(raw_output_dir),
            llm_client=None,
        )
        generation_result = orchestrator.generate_cv(
            job_analysis=job_analysis,
            customizations=dict(DEFAULT_CUSTOMIZATIONS),
            output_dir=raw_output_dir,
        )

    artifact_paths = {
        "ats_docx": None,
        "human_html": None,
        "human_pdf": None,
        "human_docx": None,
        "metadata_json": None,
        "job_description_txt": None,
    }

    for file_name in generation_result["files"]:
        bundle_relative_path = str(Path(RAW_OUTPUT_DIRNAME) / file_name)
        suffix = Path(file_name).suffix.lower()
        if file_name == "metadata.json":
            artifact_paths["metadata_json"] = bundle_relative_path
        elif file_name == "job_description.txt":
            artifact_paths["job_description_txt"] = bundle_relative_path
        elif suffix == ".html":
            artifact_paths["human_html"] = bundle_relative_path
        elif suffix == ".pdf":
            artifact_paths["human_pdf"] = bundle_relative_path
        elif suffix == ".docx" and "_ATS" in file_name:
            artifact_paths["ats_docx"] = bundle_relative_path
        elif suffix == ".docx":
            artifact_paths["human_docx"] = bundle_relative_path

    metadata = generation_result["metadata"]
    html_relative_path = artifact_paths["human_html"]
    if html_relative_path is None:
        raise ValueError(
            "Fixture review bundle generation did not produce HTML"
        )
    normalized_exports, warnings = _write_normalized_exports(
        bundle_root,
        bundle_root / html_relative_path,
        orchestrator,
    )

    manifest = {
        "manifest_version": MANIFEST_VERSION,
        "bundle_kind": "fixture_layout_review",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "profile": {
            "name": profile_name,
            "source_fixture": _repo_relative(
                EXAMPLE_PROFILES_ROOT / profile_name
            ),
        },
        "job_fixture": {
            "path": _repo_relative(job_fixture),
            "title": job_analysis.get("title", ""),
            "company": job_analysis.get("company", ""),
            "required_skills_count": len(
                job_analysis.get("required_skills", [])
            ),
            "ats_keywords_count": len(job_analysis.get("ats_keywords", [])),
        },
        "bundle": {
            "root": str(bundle_root),
            "manifest_path": MANIFEST_FILENAME,
            "raw_output_dir": RAW_OUTPUT_DIRNAME,
        },
        "artifacts": artifact_paths,
        "normalized_exports": normalized_exports,
        "summary": {
            "files_generated": list(generation_result["files"]),
            "artifacts_generated": len(generation_result["files"]),
            "selected_content_summary": dict(
                metadata.get("selected_content_summary", {})
            ),
        },
        "warnings": warnings,
    }

    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest
