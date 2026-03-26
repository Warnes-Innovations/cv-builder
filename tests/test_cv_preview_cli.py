# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

from __future__ import annotations

import importlib.util
import subprocess
import tempfile
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = (
    REPO_ROOT
    / 'scripts'
    / 'cv-preview.py'
)
WRAPPER_PATH = REPO_ROOT / 'cv-preview.sh'
SPEC = importlib.util.spec_from_file_location(
    'cv_preview',
    MODULE_PATH,
)
assert SPEC is not None
assert SPEC.loader is not None
cv_preview = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cv_preview)


class _FakeOrchestrator:
    def __init__(self):
        self.generate_calls = 0
        self.master_data = {
            'personal_info': {'name': 'Ada Lovelace'},
            'skills': ['Python', 'SQL', 'Leadership'],
            'professional_summaries': {
                'general': 'Experienced engineer and technical leader.'
            },
        }

    def generate_cv(self, job_analysis, customizations, output_dir, **_kwargs):
        del job_analysis, customizations
        self.generate_calls += 1
        output_dir = Path(output_dir)
        generated = [
            'Resume_ATS.docx',
            'Resume.html',
            'Resume.pdf',
            'Resume.docx',
            'metadata.json',
        ]
        for filename in generated:
            (output_dir / filename).write_text(filename, encoding='utf-8')
        return {
            'output_dir': str(output_dir),
            'files': generated,
            'generation_progress': [],
        }


class _FakeConversationManager:
    def __init__(self, orchestrator, llm_client):
        del llm_client
        self.orchestrator = orchestrator
        self.state = {}
        self.session_file: str | None = None

    @staticmethod
    def normalize_skills_data(skills_data):
        return [str(item) for item in skills_data]

    def load_session(self, session_file):
        self.state = {
            'job_analysis': {
                'company': 'SessionCo',
                'title': 'Principal Engineer',
            },
            'cover_letter_text': 'Saved session cover letter.',
        }
        self.session_file = session_file

    def generate_cv_from_session_state(
        self,
        output_dir,
        allow_llm_recommendations,
    ):
        assert allow_llm_recommendations is False
        return self.orchestrator.generate_cv({}, {}, output_dir)


class _FallbackCoverLetterConversationManager(_FakeConversationManager):
    def load_session(self, session_file):
        self.state = {
            'job_analysis': {
                'company': 'SessionCo',
                'title': 'Principal Engineer',
            },
        }
        self.session_file = session_file


def _write_source_assets(source_dir: Path) -> None:
    source_dir.mkdir(parents=True, exist_ok=True)
    (source_dir / 'Master_CV_Data.json').write_text(
        '{"personal_info": {"name": "Ada Lovelace"}}',
        encoding='utf-8',
    )
    (source_dir / 'publications.bib').write_text(
        '@article{demo,title={Demo}}',
        encoding='utf-8',
    )


def test_parse_args_defaults_output_dir_to_current_directory():
    args = cv_preview.parse_args(['--example', 'medium'])

    assert args.example == 'medium'
    assert args.output_dir == '.'
    assert args.force is False


def test_parse_args_accepts_force_flag():
    args = cv_preview.parse_args(['--example', 'medium', '--force'])

    assert args.force is True


def test_render_generated_assets_from_asset_directory(monkeypatch):
    fake_orchestrator = _FakeOrchestrator()
    monkeypatch.setattr(
        cv_preview,
        '_build_orchestrator',
        lambda master_data_path, publications_path: fake_orchestrator,
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        source_dir = Path(tmpdir) / 'source'
        output_dir = Path(tmpdir) / 'output'
        _write_source_assets(source_dir)

        result = cv_preview.render_generated_assets(
            source_dir,
            output_dir,
        )

        assert result['used_session'] is False
        assert result['cover_letter_source'] == 'deterministic-fallback'
        assert (output_dir / 'Resume_ATS.docx').exists()
        assert (output_dir / 'Resume.html').exists()
        assert (output_dir / 'Resume.pdf').exists()
        assert len(list(output_dir.glob('CoverLetter_*.docx'))) == 1
        assert len(result['files']) == 6


def test_render_generated_assets_uses_session_state_when_present(monkeypatch):
    fake_orchestrator = _FakeOrchestrator()
    monkeypatch.setattr(
        cv_preview,
        '_build_orchestrator',
        lambda master_data_path, publications_path: fake_orchestrator,
    )
    monkeypatch.setattr(
        cv_preview,
        'ConversationManager',
        _FakeConversationManager,
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        source_dir = Path(tmpdir) / 'session-source'
        output_dir = Path(tmpdir) / 'output'
        _write_source_assets(source_dir)
        (source_dir / 'session.json').write_text(
            '{"state": {}, "conversation_history": []}',
            encoding='utf-8',
        )

        result = cv_preview.render_generated_assets(
            source_dir,
            output_dir,
        )

        assert result['used_session'] is True
        assert result['session_file'] == str(
            (source_dir / 'session.json').resolve()
        )
        assert result['cover_letter_source'] == 'session'
        cover_letters = list(output_dir.glob('CoverLetter_*.docx'))
        assert len(cover_letters) == 1


def test_render_generated_assets_accepts_direct_session_file_path(monkeypatch):
    fake_orchestrator = _FakeOrchestrator()
    monkeypatch.setattr(
        cv_preview,
        '_build_orchestrator',
        lambda master_data_path, publications_path: fake_orchestrator,
    )
    monkeypatch.setattr(
        cv_preview,
        'ConversationManager',
        _FakeConversationManager,
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        source_dir = Path(tmpdir) / 'session-source'
        output_dir = Path(tmpdir) / 'output'
        _write_source_assets(source_dir)
        session_file = source_dir / 'session.json'
        session_file.write_text(
            '{"state": {}, "conversation_history": []}',
            encoding='utf-8',
        )

        result = cv_preview.render_generated_assets(
            session_file,
            output_dir,
        )

        assert result['used_session'] is True
        assert result['session_file'] == str(session_file.resolve())
        assert result['source_dir'] == str(source_dir.resolve())
        assert result['cover_letter_source'] == 'session'


def test_render_generated_assets_session_fallback_supports_dict_skills(
    monkeypatch,
):
    fake_orchestrator = _FakeOrchestrator()
    fake_orchestrator.master_data['skills'] = {
        'core_expertise': {
            'skills': [
                {'name': 'Data Science'},
                {'name': 'Biostatistics'},
                {'name': 'Statistical Modeling'},
            ]
        }
    }
    monkeypatch.setattr(
        cv_preview,
        '_build_orchestrator',
        lambda master_data_path, publications_path: fake_orchestrator,
    )
    monkeypatch.setattr(
        cv_preview,
        'ConversationManager',
        _FallbackCoverLetterConversationManager,
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        source_dir = Path(tmpdir) / 'session-source'
        output_dir = Path(tmpdir) / 'output'
        _write_source_assets(source_dir)
        session_file = source_dir / 'session.json'
        session_file.write_text(
            '{"state": {}, "conversation_history": []}',
            encoding='utf-8',
        )

        result = cv_preview.render_generated_assets(
            session_file,
            output_dir,
        )

        assert result['used_session'] is True
        assert result['cover_letter_source'] == 'deterministic-fallback'
        assert len(list(output_dir.glob('CoverLetter_*.docx'))) == 1


def test_render_generated_assets_refuses_destination_collisions(monkeypatch):
    fake_orchestrator = _FakeOrchestrator()
    monkeypatch.setattr(
        cv_preview,
        '_build_orchestrator',
        lambda master_data_path, publications_path: fake_orchestrator,
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        source_dir = Path(tmpdir) / 'source'
        output_dir = Path(tmpdir) / 'output'
        _write_source_assets(source_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / 'metadata.json').write_text(
            'existing',
            encoding='utf-8',
        )

        with pytest.raises(
            FileExistsError,
            match='Destination already contains',
        ):
            cv_preview.render_generated_assets(
                source_dir,
                output_dir,
            )

        assert fake_orchestrator.generate_calls == 0


def test_render_generated_assets_force_overwrites_existing_files(monkeypatch):
    fake_orchestrator = _FakeOrchestrator()
    monkeypatch.setattr(
        cv_preview,
        '_build_orchestrator',
        lambda master_data_path, publications_path: fake_orchestrator,
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        source_dir = Path(tmpdir) / 'source'
        output_dir = Path(tmpdir) / 'output'
        _write_source_assets(source_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / 'Resume_ATS.docx').write_text(
            'old ats content',
            encoding='utf-8',
        )
        (output_dir / 'metadata.json').write_text(
            'old metadata',
            encoding='utf-8',
        )

        result = cv_preview.render_generated_assets(
            source_dir,
            output_dir,
            force=True,
        )

        assert fake_orchestrator.generate_calls == 1
        assert result['used_session'] is False
        assert (output_dir / 'Resume_ATS.docx').read_text(
            encoding='utf-8'
        ) == 'Resume_ATS.docx'
        assert 'cover_letter_text' in (output_dir / 'metadata.json').read_text(
            encoding='utf-8'
        )


def test_cv_preview_wrapper_help_smoke():
    result = subprocess.run(
        ['bash', str(WRAPPER_PATH), '--help'],
        capture_output=True,
        text=True,
        check=False,
        cwd=str(REPO_ROOT),
        timeout=120,
    )

    assert result.returncode == 0
    assert 'usage:' in result.stdout.lower()
    assert 'cv-preview.py' in result.stdout
