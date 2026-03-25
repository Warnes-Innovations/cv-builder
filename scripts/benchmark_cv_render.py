# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Benchmark HTML preview and PDF render timings using example profiles.

This script uses the repository's fixture-backed example profiles so it does
not touch live user CV data. It measures:

- HTML preview generation via ``CVOrchestrator.render_html_preview``
- HTML-to-PDF generation via
    ``CVOrchestrator.generate_final_from_confirmed_html``

Example:
    /usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python \
        scripts/benchmark_cv_render.py --profile medium --iterations 5
    /usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python \
        scripts/benchmark_cv_render.py --compare \
        --output /tmp/render-bench.json
    /usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python \
        scripts/benchmark_cv_render.py --profile medium --keep
"""

from __future__ import annotations

import argparse
import json
import subprocess
import shutil
import statistics
import sys
import tempfile
import time
import traceback
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / 'scripts') not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / 'scripts'))

from scripts.utils.cv_orchestrator import CVOrchestrator  # noqa: E402
from tests.helpers.example_profiles import (  # noqa: E402
    materialize_example_profile,
)


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

CUSTOMIZATIONS = {
    'base_font_size': '10px',
}

DEFAULT_COMPARE_PROFILES = ['simple', 'medium', 'complex']
CHROME_CANDIDATES = [
    'google-chrome',
    'chromium',
    'chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
]


class NullLLM:
    """Deterministic stand-in that disables semantic match costs."""

    @staticmethod
    def semantic_match(text: str, requirements: list[str]) -> float:
        del text, requirements
        return 0.0


def _make_orchestrator(profile_name: str) -> tuple[CVOrchestrator, Path]:
    fixture_root = Path(tempfile.mkdtemp(prefix='cv_render_bench_'))
    master_path, publications_path, output_dir = materialize_example_profile(
        fixture_root,
        profile_name,
    )
    return (
        CVOrchestrator(
            master_data_path=str(master_path),
            publications_path=str(publications_path),
            output_dir=str(output_dir),
            llm_client=NullLLM(),
        ),
        fixture_root,
    )


def _render_pdf_from_html(
    html_path: Path,
    pdf_path: Path,
    *,
    renderer: str,
    external_weasyprint_python: str | None = None,
) -> dict[str, str]:
    renderer_mode = (renderer or 'auto').strip().lower()
    html_url = html_path.as_uri()

    if renderer_mode in {'auto', 'chrome'}:
        chrome_err = None
        for chrome_bin in CHROME_CANDIDATES:
            try:
                subprocess.run(
                    [
                        chrome_bin,
                        '--headless=new',
                        '--disable-gpu',
                        '--no-sandbox',
                        f'--print-to-pdf={pdf_path}',
                        '--print-to-pdf-no-header',
                        html_url,
                    ],
                    check=True,
                    capture_output=True,
                    timeout=60,
                )
                return {
                    'renderer': 'chrome',
                    'renderer_detail': str(chrome_bin),
                }
            except FileNotFoundError:
                continue
            except (
                subprocess.CalledProcessError,
                subprocess.TimeoutExpired,
            ) as exc:
                chrome_err = str(exc)
                break

        if renderer_mode == 'chrome':
            if chrome_err:
                raise RuntimeError(chrome_err)
            raise FileNotFoundError('Chrome/Chromium not found')

    if renderer_mode in {'weasyprint', 'weasyprint-external'}:
        python_bin = sys.executable
        if renderer_mode == 'weasyprint-external':
            if not external_weasyprint_python:
                raise ValueError(
                    '--weasyprint-python is required for '
                    'renderer=weasyprint-external'
                )
            python_bin = external_weasyprint_python

        wp_script = (
            'import sys, weasyprint; '
            'weasyprint.HTML(filename=sys.argv[1]).write_pdf(sys.argv[2])'
        )
        wp_result = subprocess.run(
            [python_bin, '-c', wp_script, str(html_path), str(pdf_path)],
            check=False,
            capture_output=True,
            timeout=120,
        )
        if wp_result.returncode == 0:
            return {
                'renderer': (
                    'weasyprint-external'
                    if renderer_mode == 'weasyprint-external'
                    else 'weasyprint'
                ),
                'renderer_detail': str(python_bin),
            }

        wp_error = (
            wp_result.stderr.decode(errors='replace').strip()
            or f'exit {wp_result.returncode}'
        )
        raise RuntimeError(wp_error)

    if renderer_mode == 'auto':
        return _render_pdf_from_html(
            html_path,
            pdf_path,
            renderer='weasyprint',
            external_weasyprint_python=external_weasyprint_python,
        )

    raise ValueError(
        'renderer must be one of: auto, chrome, weasyprint, '
        'weasyprint-external'
    )


def _run_once(
    profile_name: str | None,
    *,
    keep: bool = False,
    renderer: str = 'auto',
    html_input: str | None = None,
    external_weasyprint_python: str | None = None,
) -> dict[str, Any]:
    fixture_root: Path | None = None
    orchestrator: CVOrchestrator | None = None
    if html_input is None:
        if profile_name is None:
            raise ValueError(
                'profile_name is required when --html-input is not set'
            )
        orchestrator, fixture_root = _make_orchestrator(profile_name)
    render_dir = Path(tempfile.mkdtemp(prefix='cv_render_out_'))
    html_path = (
        Path(html_input)
        if html_input
        else render_dir / 'benchmark_cv.html'
    )
    pdf_path = render_dir / 'benchmark_cv.pdf'

    def _paths_payload() -> dict[str, str]:
        payload = {
            'render_dir': str(render_dir),
            'html': str(html_path),
            'pdf': str(pdf_path),
        }
        if fixture_root is not None:
            payload.update({
                'fixture_root': str(fixture_root),
                'master_data': str(fixture_root / 'Master_CV_Data.json'),
                'publications': str(fixture_root / 'publications.bib'),
                'fixture_output_dir': str(fixture_root / 'output'),
            })
        return payload

    try:
        start_total = time.perf_counter()
        if html_input is None:
            start_html = time.perf_counter()
            assert orchestrator is not None
            html = orchestrator.render_html_preview(
                job_analysis=JOB_ANALYSIS,
                customizations=CUSTOMIZATIONS,
                approved_rewrites=[],
                spell_audit=[],
            )
            html_seconds = time.perf_counter() - start_html
        else:
            html = html_path.read_text(encoding='utf-8')
            html_seconds = 0.0

        start_pdf = time.perf_counter()
        try:
            if renderer == 'weasyprint-external' or html_input is not None:
                if html_input is None:
                    html_path.write_text(html, encoding='utf-8')
                renderer_info = _render_pdf_from_html(
                    html_path,
                    pdf_path,
                    renderer=renderer,
                    external_weasyprint_python=external_weasyprint_python,
                )
                final_paths = {
                    'html': str(html_path),
                    'pdf': str(pdf_path),
                    'renderer': renderer_info['renderer'],
                    'renderer_detail': renderer_info['renderer_detail'],
                }
            else:
                assert orchestrator is not None
                final_paths = orchestrator.generate_final_from_confirmed_html(
                    confirmed_html=html,
                    output_dir=render_dir,
                    filename_base='benchmark_cv',
                    preferred_renderer=renderer,
                )
            pdf_seconds = time.perf_counter() - start_pdf

            html_path = Path(final_paths['html'])
            pdf_path = Path(final_paths['pdf'])

            result = {
                'status': 'ok',
                'requested_renderer': renderer,
                'html_seconds': html_seconds,
                'pdf_seconds': pdf_seconds,
                'total_seconds': time.perf_counter() - start_total,
                'html_bytes': html_path.stat().st_size,
                'pdf_bytes': pdf_path.stat().st_size,
                'html_pages_hint': html.count('class="page"'),
                'pdf_renderer': final_paths.get('renderer', 'unknown'),
                'pdf_renderer_detail': final_paths.get('renderer_detail', ''),
                'error_type': None,
                'error_message': None,
            }
            if keep:
                result['paths'] = _paths_payload()
            return result
        except (
            OSError,
            RuntimeError,
            ValueError,
            TypeError,
            UnicodeError,
            subprocess.SubprocessError,
        ) as exc:
            pdf_seconds = time.perf_counter() - start_pdf
            result = {
                'status': 'error',
                'requested_renderer': renderer,
                'html_seconds': html_seconds,
                'pdf_seconds': pdf_seconds,
                'total_seconds': time.perf_counter() - start_total,
                'html_bytes': (
                    html_path.stat().st_size if html_path.exists() else None
                ),
                'pdf_bytes': (
                    pdf_path.stat().st_size if pdf_path.exists() else None
                ),
                'html_pages_hint': html.count('class="page"'),
                'pdf_renderer': None,
                'pdf_renderer_detail': None,
                'error_type': type(exc).__name__,
                'error_message': str(exc),
                'error_traceback': ''.join(
                    traceback.format_exception_only(type(exc), exc)
                ).strip(),
            }
            if keep:
                result['paths'] = _paths_payload()
            return result
    except (
        OSError,
        RuntimeError,
        ValueError,
        TypeError,
        UnicodeError,
        subprocess.SubprocessError,
    ) as exc:
        result = {
            'status': 'error',
            'requested_renderer': renderer,
            'html_seconds': None,
            'pdf_seconds': None,
            'total_seconds': None,
            'html_bytes': None,
            'pdf_bytes': None,
            'html_pages_hint': None,
            'pdf_renderer': None,
            'pdf_renderer_detail': None,
            'error_type': type(exc).__name__,
            'error_message': str(exc),
            'error_traceback': ''.join(
                traceback.format_exception_only(type(exc), exc)
            ).strip(),
        }
        if keep:
            result['paths'] = _paths_payload()
        return result
    finally:
        if not keep:
            if fixture_root is not None:
                shutil.rmtree(fixture_root, ignore_errors=True)
            shutil.rmtree(render_dir, ignore_errors=True)


def _summarize(
    results: list[dict[str, Any]],
    key: str,
) -> dict[str, float] | None:
    values = [
        float(result[key])
        for result in results
        if result.get('status') == 'ok' and result.get(key) is not None
    ]
    if not values:
        return None
    return {
        'min': min(values),
        'max': max(values),
        'mean': statistics.mean(values),
        'median': statistics.median(values),
    }


def _benchmark_profile(
    profile_name: str | None,
    iterations: int,
    *,
    keep: bool = False,
    renderer: str = 'auto',
    html_input: str | None = None,
    external_weasyprint_python: str | None = None,
) -> dict[str, Any]:
    results = [
        _run_once(
            profile_name,
            keep=keep,
            renderer=renderer,
            html_input=html_input,
            external_weasyprint_python=external_weasyprint_python,
        )
        for _ in range(iterations)
    ]
    successful_runs = [
        result for result in results if result.get('status') == 'ok'
    ]
    failed_runs = [
        result for result in results if result.get('status') != 'ok'
    ]
    last_run = results[-1]
    return {
        'profile': profile_name,
        'html_input': html_input,
        'iterations': iterations,
        'renderer_preference': renderer,
        'successful_runs': len(successful_runs),
        'failed_runs': len(failed_runs),
        'html_seconds': _summarize(results, 'html_seconds'),
        'pdf_seconds': _summarize(results, 'pdf_seconds'),
        'total_seconds': _summarize(results, 'total_seconds'),
        'last_run_artifacts': {
            'status': last_run['status'],
            'html_bytes': last_run['html_bytes'],
            'pdf_bytes': last_run['pdf_bytes'],
            'html_pages_hint': last_run['html_pages_hint'],
            'pdf_renderer': last_run['pdf_renderer'],
            'pdf_renderer_detail': last_run['pdf_renderer_detail'],
            'error_type': last_run['error_type'],
            'error_message': last_run['error_message'],
        },
        'raw_runs': results,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            'Benchmark CV HTML preview and HTML-to-PDF render timings.'
        ),
    )
    parser.add_argument(
        '--profile',
        default='medium',
        help=(
            'Example profile name under '
            'tests/fixtures/example_profiles/ (default: medium).'
        ),
    )
    parser.add_argument(
        '--iterations',
        type=int,
        default=5,
        help='Number of benchmark runs to execute (default: 5).',
    )
    parser.add_argument(
        '--output',
        help='Optional path to save the JSON results to a file.',
    )
    parser.add_argument(
        '--compare',
        action='store_true',
        help='Benchmark the simple, medium, and complex example profiles.',
    )
    parser.add_argument(
        '--keep',
        action='store_true',
        help=(
            'Preserve temporary fixture and render directories and include '
            'their paths in the JSON output.'
        ),
    )
    parser.add_argument(
        '--renderer',
        choices=['auto', 'chrome', 'weasyprint', 'weasyprint-external'],
        default='auto',
        help=(
            'PDF renderer preference to use for the benchmark '
            '(default: auto).'
        ),
    )
    parser.add_argument(
        '--html-input',
        help=(
            'Optional path to a pre-rendered HTML file for '
            'PDF-only benchmarking.'
        ),
    )
    parser.add_argument(
        '--weasyprint-python',
        help=(
            'Python interpreter to use for renderer=weasyprint-external, '
            'for example /tmp/weasyprint-venv/bin/python.'
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.compare:
        output: dict[str, Any] = {
            'mode': 'compare',
            'iterations': args.iterations,
            'renderer_preference': args.renderer,
            'profiles': {
                profile_name: _benchmark_profile(
                    profile_name,
                    args.iterations,
                    keep=args.keep,
                    renderer=args.renderer,
                    html_input=args.html_input,
                    external_weasyprint_python=args.weasyprint_python,
                )
                for profile_name in DEFAULT_COMPARE_PROFILES
            },
        }
    else:
        output = _benchmark_profile(
            args.profile if args.html_input is None else None,
            args.iterations,
            keep=args.keep,
            renderer=args.renderer,
            html_input=args.html_input,
            external_weasyprint_python=args.weasyprint_python,
        )

    rendered = json.dumps(output, indent=2)
    if args.output:
        output_path = Path(args.output).expanduser()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered + '\n', encoding='utf-8')
    print(rendered)


if __name__ == '__main__':
    main()
