#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

repo_root = Path('/Users/warnes/src/cv-builder/worktrees/issue61-layout')
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))
if str(repo_root / 'scripts') not in sys.path:
    sys.path.insert(0, str(repo_root / 'scripts'))

from scripts.utils.cv_orchestrator import CVOrchestrator  # type: ignore
from tests.helpers.example_profiles import materialize_example_profile  # type: ignore

JOB_ANALYSIS = {
    'job_title': 'Senior Software Engineer',
    'title': 'Senior Software Engineer',
    'company': 'Acme Corp',
    'summary': 'Build and lead production software systems.',
    'ats_keywords': ['Python', 'Architecture', 'Leadership', 'AWS', 'Docker'],
    'must_have_requirements': ['Python', 'System design', 'Cloud'],
    'nice_to_have_requirements': ['Machine learning', 'Bioinformatics'],
    'key_requirements': ['Python', 'System design', 'Cloud'],
    'nice_to_have': ['Machine learning', 'Bioinformatics'],
    'domain': 'software engineering',
}
CUSTOMIZATIONS = {}
CHROME_CANDIDATES = [
    'google-chrome',
    'chromium',
    'chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
]
WEASY_PYTHON_CANDIDATES = [
    sys.executable,
    '/tmp/weasyprint-venv/bin/python3',
    '/tmp/weasyprint-venv/bin/python',
]

class NullLLM:
    @staticmethod
    def semantic_match(text: str, requirements: list[str]) -> float:
        del text, requirements
        return 0.0


def _pick_weasy_python() -> str:
    for candidate in WEASY_PYTHON_CANDIDATES:
        if shutil.which(candidate) or Path(candidate).exists():
            return candidate
    raise FileNotFoundError('No usable WeasyPrint Python interpreter found')


def _render_weasy(html_path: Path, weasy_path: Path) -> str:
    wp_code = (
        'import sys, weasyprint; '
        'weasyprint.HTML(filename=sys.argv[1]).write_pdf(sys.argv[2])'
    )
    last_error = None
    for python_bin in WEASY_PYTHON_CANDIDATES:
        if not (shutil.which(python_bin) or Path(python_bin).exists()):
            continue
        try:
            subprocess.run(
                [python_bin, '-c', wp_code, str(html_path), str(weasy_path)],
                check=True,
                capture_output=True,
                timeout=120,
            )
            return python_bin
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            last_error = f'{python_bin}: {exc}'
            continue
    raise RuntimeError(last_error or 'WeasyPrint rendering failed')


render_root = Path(tempfile.mkdtemp(prefix='issue61_dual_render_'))
fixture_root = None
try:
    fixture_root = Path(tempfile.mkdtemp(prefix='issue61_dual_fixture_'))
    master_path, publications_path, output_dir = materialize_example_profile(
        fixture_root,
        'complex',
    )
    orchestrator = CVOrchestrator(
        master_data_path=str(master_path),
        publications_path=str(publications_path),
        output_dir=str(output_dir),
        llm_client=NullLLM(),
    )
    html = orchestrator.render_html_preview(
        job_analysis=JOB_ANALYSIS,
        customizations=CUSTOMIZATIONS,
        approved_rewrites=[],
        spell_audit=[],
    )
    html_path = render_root / 'benchmark_cv.html'
    html_path.write_text(html, encoding='utf-8')

    chrome_path = render_root / 'benchmark_cv_chrome.pdf'
    weasy_path = render_root / 'benchmark_cv_weasyprint.pdf'

    chrome_bin = None
    for candidate in CHROME_CANDIDATES:
        if shutil.which(candidate) or Path(candidate).exists():
            chrome_bin = candidate
            break
    if chrome_bin is None:
        raise FileNotFoundError('Chrome/Chromium not found')

    subprocess.run(
        [
            chrome_bin,
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            f'--print-to-pdf={chrome_path}',
            '--print-to-pdf-no-header',
            '--no-pdf-header-footer',
            html_path.as_uri(),
        ],
        check=True,
        capture_output=True,
        timeout=120,
    )

    weasy_python = _render_weasy(html_path, weasy_path)

    latest_html = Path('/tmp/issue61_benchmark_cv_latest.html')
    latest_chrome = Path('/tmp/issue61_benchmark_cv_chrome_latest.pdf')
    latest_weasy = Path('/tmp/issue61_benchmark_cv_weasy_latest.pdf')
    shutil.copy2(html_path, latest_html)
    shutil.copy2(chrome_path, latest_chrome)
    shutil.copy2(weasy_path, latest_weasy)

    print(json.dumps({
        'render_root': str(render_root),
        'html_path': str(html_path),
        'chrome_pdf_path': str(chrome_path),
        'weasy_pdf_path': str(weasy_path),
        'latest_html_path': str(latest_html),
        'latest_chrome_pdf_path': str(latest_chrome),
        'latest_weasy_pdf_path': str(latest_weasy),
        'chrome_bin': chrome_bin,
        'weasy_python': weasy_python,
    }, indent=2))
finally:
    if fixture_root is not None:
        shutil.rmtree(fixture_root, ignore_errors=True)
