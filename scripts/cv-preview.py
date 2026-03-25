#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Render CV artifacts from an example profile, asset directory, or session.

Examples:
    conda run -n cvgen python scripts/cv-preview.py \
        --example medium

    conda run -n cvgen python scripts/cv-preview.py \
        --example complex --output-dir ~/CV/debug-render

    conda run -n cvgen python scripts/cv-preview.py \
        --path ~/CV

    conda run -n cvgen python scripts/cv-preview.py \
        --path ~/CV/files/Acme_StaffEngineer_2026-03-25
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any

from docx import Document
from docx.shared import Pt


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / 'scripts') not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / 'scripts'))

from tests.helpers.example_profiles import (  # noqa: E402
    resolve_example_profile,
)
from utils.config import get_config  # noqa: E402
from utils.conversation_manager import ConversationManager  # noqa: E402
from utils.cv_orchestrator import CVOrchestrator  # noqa: E402


ASSET_FILENAMES = (
    'Master_CV_Data.json',
    'publications.bib',
)
DEFAULT_JOB_ANALYSIS = {
    'company': 'Debug',
    'title': 'Debug Resume Render',
    'job_title': 'Debug Resume Render',
    'summary': 'Deterministic local render for layout and content debugging.',
    'ats_keywords': [],
    'required_skills': [],
    'preferred_skills': [],
    'must_have_requirements': [],
    'nice_to_have_requirements': [],
    'key_requirements': [],
    'nice_to_have': [],
    'domain': 'general',
}


class NullLLM:
    """Deterministic stand-in for local rendering workflows."""

    @staticmethod
    def semantic_match(text: str, requirements: list[str]) -> float:
        del text, requirements
        return 0.0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            'Render CV artifacts from example assets or a source path.'
        ),
    )
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument(
        '--example',
        choices=('simple', 'medium', 'complex'),
        help='Render from one of the repository-owned example profiles.',
    )
    source_group.add_argument(
        '--path',
        help='Render from a directory, or directly from a session.json file.',
    )
    parser.add_argument(
        '--output-dir',
        default='.',
        help=(
            'Destination directory for rendered artifacts. '
            'Defaults to the current directory.'
        ),
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Emit machine-readable JSON output.',
    )
    parser.add_argument(
        '-f',
        '--force',
        action='store_true',
        help='Overwrite existing rendered files in the destination.',
    )
    return parser.parse_args(argv)


def _resolve_source_path(args: argparse.Namespace) -> Path:
    if args.example:
        return resolve_example_profile(args.example).resolve()
    return Path(args.path).expanduser().resolve()


def _resolve_output_dir(args: argparse.Namespace) -> Path:
    return Path(args.output_dir).expanduser().resolve()


def _resolve_session_file(source_path: Path) -> Path | None:
    if source_path.is_file() and source_path.name == 'session.json':
        return source_path
    if source_path.is_dir():
        candidate = source_path / 'session.json'
        if candidate.is_file():
            return candidate
    return None


def _resolve_source_dir(source_path: Path, session_file: Path | None) -> Path:
    if session_file is not None:
        return session_file.parent
    return source_path if source_path.is_dir() else source_path.parent


def _resolve_asset_paths(
    source_dir: Path,
) -> tuple[Path, Path, dict[str, str]]:
    config = get_config()
    notes: dict[str, str] = {}

    master_data_path = source_dir / 'Master_CV_Data.json'
    if master_data_path.exists():
        master_data_resolved = master_data_path.resolve()
        notes['master_data'] = 'source'
    else:
        master_data_resolved = Path(
            config.master_cv_path,
        ).expanduser().resolve()
        notes['master_data'] = 'config'

    publications_path = source_dir / 'publications.bib'
    if publications_path.exists():
        publications_resolved = publications_path.resolve()
        notes['publications'] = 'source'
    else:
        publications_resolved = Path(
            config.publications_path,
        ).expanduser().resolve()
        notes['publications'] = 'config'

    missing = []
    if not master_data_resolved.exists():
        missing.append(str(master_data_resolved))
    if not publications_resolved.exists():
        missing.append(str(publications_resolved))
    if missing:
        raise FileNotFoundError(
            'Required render assets not found: ' + ', '.join(missing)
        )

    return master_data_resolved, publications_resolved, notes


def _build_orchestrator(
    master_data_path: Path,
    publications_path: Path,
) -> CVOrchestrator:
    return CVOrchestrator(
        master_data_path=str(master_data_path),
        publications_path=str(publications_path),
        output_dir=str(Path(tempfile.gettempdir()) / 'cv-builder-render'),
        llm_client=NullLLM(),
    )


def _load_optional_job_analysis(source_dir: Path) -> dict[str, Any]:
    job_analysis_path = source_dir / 'job_analysis.json'
    if not job_analysis_path.exists():
        return dict(DEFAULT_JOB_ANALYSIS)

    with job_analysis_path.open(encoding='utf-8') as handle:
        payload = json.load(handle)

    merged = dict(DEFAULT_JOB_ANALYSIS)
    if isinstance(payload, dict):
        merged.update(payload)
    return merged


def _extract_summary(master_data: dict[str, Any]) -> str:
    summaries = master_data.get('professional_summaries')
    if isinstance(summaries, dict):
        for value in summaries.values():
            if isinstance(value, str) and value.strip():
                return value.strip()
            if isinstance(value, dict):
                text = value.get('text') or value.get('summary')
                if isinstance(text, str) and text.strip():
                    return text.strip()
    elif isinstance(summaries, list):
        for value in summaries:
            if isinstance(value, str) and value.strip():
                return value.strip()
            if isinstance(value, dict):
                text = value.get('text') or value.get('summary')
                if isinstance(text, str) and text.strip():
                    return text.strip()

    summary = master_data.get('summary')
    if isinstance(summary, str) and summary.strip():
        return summary.strip()
    return 'I am writing to express interest in this opportunity.'


def _extract_skill_labels(skills_data: Any) -> list[str]:
    """Return displayable skill labels from mixed master-data schemas."""
    normalized_skills = ConversationManager.normalize_skills_data(skills_data)
    labels: list[str] = []

    for skill in normalized_skills:
        if isinstance(skill, str):
            label = skill.strip()
        elif isinstance(skill, dict):
            label = str(
                skill.get('name')
                or skill.get('skill')
                or skill.get('label')
                or ''
            ).strip()
        else:
            label = str(skill).strip()

        if label:
            labels.append(label)

    return labels


def _build_default_cover_letter(
    master_data: dict[str, Any],
    job_analysis: dict[str, Any],
    params: dict[str, Any] | None = None,
) -> str:
    params = params or {}
    personal_info = master_data.get('personal_info') or {}
    name = personal_info.get('name') or 'The candidate'
    company = job_analysis.get('company') or 'your organization'
    role = (
        job_analysis.get('title')
        or job_analysis.get('job_title')
        or 'the role'
    )
    hiring_manager = params.get('hiring_manager') or 'Hiring Manager'
    date_str = datetime.now().strftime('%B %d, %Y')

    skills_raw = master_data.get('skills', [])
    top_skills = _extract_skill_labels(skills_raw)[:6]
    top_skills_text = (
        ', '.join(top_skills)
        if top_skills else 'relevant skills and experience'
    )
    summary = _extract_summary(master_data)

    paragraphs = [
        date_str,
        '',
        f'Dear {hiring_manager},',
        '',
        (
            f'I am writing to express interest in the {role} opportunity at '
            f'{company}. This locally rendered cover letter is intended for '
            'layout and content-debugging workflows, while still drawing '
            'from '
            f'the current CV source data.'
        ),
        '',
        (
            f'My background is summarized as follows: {summary} '
            f'Key strengths represented in the attached materials include '
            f'{top_skills_text}.'
        ),
        '',
        (
            f'Please treat this draft as a deterministic rendering artifact '
            f'for {name}. It can be replaced by a session-saved or '
            'LLM-generated '
            f'letter whenever a finalized version is available.'
        ),
        '',
        'Thank you for your consideration.',
        '',
        'Sincerely,',
        name,
    ]
    return '\n'.join(paragraphs)


def _write_cover_letter_docx(
    text: str,
    output_dir: Path,
    job_analysis: dict[str, Any],
    reused_from: str | None = None,
) -> Path:
    company = (job_analysis.get('company') or 'Company').replace(' ', '_')
    date_str = datetime.now().strftime('%Y-%m-%d')
    filename = f'CoverLetter_{company}_{date_str}.docx'
    docx_path = output_dir / filename

    doc = Document()
    for paragraph_text in text.split('\n'):
        paragraph = doc.add_paragraph(paragraph_text)
        for run in paragraph.runs:
            run.font.size = Pt(11)
            run.font.name = 'Calibri'
    doc.save(str(docx_path))

    metadata_path = output_dir / 'metadata.json'
    if metadata_path.exists():
        try:
            with metadata_path.open(encoding='utf-8') as handle:
                metadata = json.load(handle)
        except (json.JSONDecodeError, OSError):
            metadata = {}
    else:
        metadata = {}
    metadata['cover_letter_text'] = text
    metadata['cover_letter_reused_from'] = reused_from
    with metadata_path.open('w', encoding='utf-8') as handle:
        json.dump(metadata, handle, indent=2)

    return docx_path


def _predict_render_output_names(job_analysis: dict[str, Any]) -> list[str]:
    company = str(job_analysis.get('company') or 'Company')
    role = str(job_analysis.get('title') or 'Role')
    timestamp = datetime.now().strftime('%Y-%m-%d')

    compact_company = company.replace(' ', '')
    compact_role = role.replace(' ', '')[:20]
    ats_company = compact_company.replace('/', '-')[:15]
    ats_role = compact_role.replace('/', '-')[:20]
    cover_letter_company = company.replace(' ', '_')

    predicted = [
        f'CV_{ats_company}_{ats_role}_{timestamp}_ATS.docx',
        f'CV_{compact_company}_{compact_role}_{timestamp}.html',
        f'CV_{compact_company}_{compact_role}_{timestamp}.pdf',
        f'CV_{compact_company}_{compact_role}_{timestamp}.docx',
        'metadata.json',
        f'CoverLetter_{cover_letter_company}_{timestamp}.docx',
    ]

    if job_analysis.get('original_text'):
        predicted.append('job_description.txt')

    return predicted


def _find_destination_collisions(
    destination_dir: Path,
    filenames: list[str],
) -> list[str]:
    if not destination_dir.exists():
        return []

    return sorted(
        filename
        for filename in filenames
        if (destination_dir / filename).exists()
    )


def _copy_files_to_destination(
    files: list[Path],
    destination_dir: Path,
    force: bool = False,
) -> list[str]:
    destination_dir.mkdir(parents=True, exist_ok=True)

    if not force:
        targets = [destination_dir / file_path.name for file_path in files]
        collisions = [
            target.name
            for target in targets
            if target.exists()
        ]
    else:
        collisions = []

    if collisions:
        raise FileExistsError(
            'Destination already contains: ' + ', '.join(sorted(collisions))
        )

    copied: list[str] = []
    for file_path in files:
        target_path = destination_dir / file_path.name
        shutil.copy2(file_path, target_path)
        copied.append(str(target_path))
    return copied


def render_generated_assets(
    source_path: Path,
    output_dir: Path,
    force: bool = False,
) -> dict[str, Any]:
    source_path = source_path.expanduser().resolve()
    output_dir = output_dir.expanduser().resolve()
    session_file = _resolve_session_file(source_path)
    source_dir = _resolve_source_dir(source_path, session_file)
    master_data_path, publications_path, asset_notes = _resolve_asset_paths(
        source_dir,
    )
    orchestrator = _build_orchestrator(master_data_path, publications_path)

    with tempfile.TemporaryDirectory(
        prefix='render-generated-assets-',
    ) as tmp_dir:
        temp_output_dir = Path(tmp_dir)

        if session_file is not None:
            manager = ConversationManager(
                orchestrator=orchestrator,
                llm_client=NullLLM(),
            )
            manager.load_session(str(session_file))
            job_analysis = manager.state.get('job_analysis') or dict(
                DEFAULT_JOB_ANALYSIS,
            )
            preflight_collisions = _find_destination_collisions(
                output_dir,
                _predict_render_output_names(job_analysis),
            )
            if preflight_collisions and not force:
                raise FileExistsError(
                    'Destination already contains: '
                    + ', '.join(preflight_collisions)
                )
            render_result = manager.generate_cv_from_session_state(
                output_dir=temp_output_dir,
                allow_llm_recommendations=False,
            )
            cover_letter_text = (
                manager.state.get('cover_letter_text')
                or _build_default_cover_letter(
                    orchestrator.master_data,
                    job_analysis,
                    manager.state.get('cover_letter_params') or {},
                )
            )
            cover_letter_source = (
                'session'
                if manager.state.get('cover_letter_text')
                else 'deterministic-fallback'
            )
            reused_from = str(session_file)
        else:
            job_analysis = _load_optional_job_analysis(source_dir)
            preflight_collisions = _find_destination_collisions(
                output_dir,
                _predict_render_output_names(job_analysis),
            )
            if preflight_collisions and not force:
                raise FileExistsError(
                    'Destination already contains: '
                    + ', '.join(preflight_collisions)
                )
            render_result = orchestrator.generate_cv(
                job_analysis,
                {},
                output_dir=temp_output_dir,
            )
            cover_letter_text = _build_default_cover_letter(
                orchestrator.master_data,
                job_analysis,
            )
            cover_letter_source = 'deterministic-fallback'
            reused_from = None

        cover_letter_path = _write_cover_letter_docx(
            cover_letter_text,
            temp_output_dir,
            job_analysis,
            reused_from=reused_from,
        )

        generated_paths = [
            temp_output_dir / filename
            for filename in render_result.get('files', [])
        ]
        generated_paths.append(cover_letter_path)
        copied_files = _copy_files_to_destination(
            generated_paths,
            output_dir,
            force=force,
        )

    return {
        'source_path': str(source_path),
        'source_dir': str(source_dir),
        'session_file': (
            str(session_file) if session_file is not None else None
        ),
        'used_session': session_file is not None,
        'asset_sources': asset_notes,
        'output_dir': str(output_dir),
        'files': copied_files,
        'cover_letter_source': cover_letter_source,
    }


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    source_path = _resolve_source_path(args)
    output_dir = _resolve_output_dir(args)

    try:
        result = render_generated_assets(
            source_path,
            output_dir,
            force=args.force,
        )
    except (FileExistsError, FileNotFoundError, ValueError) as exc:
        print(f'Error: {exc}')
        return 1

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f'Source:      {result["source_path"]}')
        print(f'Destination: {result["output_dir"]}')
        if result['session_file']:
            print(f'Session:     {result["session_file"]}')
        print(f'Cover letter source: {result["cover_letter_source"]}')
        print('Rendered files:')
        for file_path in result['files']:
            print(f'  - {file_path}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
