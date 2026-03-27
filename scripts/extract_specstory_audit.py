#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Extract structured SpecStory session metadata for audit workflows.

Examples:
    conda run -n cvgen python scripts/extract_specstory_audit.py

    conda run -n cvgen python scripts/extract_specstory_audit.py \
        --output /tmp/specstory_audit_input.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_HISTORY_DIR = REPO_ROOT / '.specstory' / 'history'

USER_BLOCK_PATTERN = re.compile(
    r'_\*\*User \([^\)]*\)\*\*_\n\n'
    r'(.*?)(?:\n\n---|\n_\*\*Agent)',
    re.S,
)
SESSION_PATTERN = re.compile(r'<!-- .*? Session ([0-9a-f-]+) \(')
COMMIT_PATTERN = re.compile(
    r'(?<![0-9a-f-])[0-9a-f]{7,40}(?![0-9a-f-])',
)
PULL_REQUEST_PATTERN = re.compile(
    r'\bPR\s*#?(\d+)\b|pull request\s*#?(\d+)',
    re.I,
)
PRIMARY_REQUESTS_PATTERN = re.compile(
    r'1\. Primary Request and Intent:\n'
    r'(.*?)(?:\n\n2\. Key Technical Concepts:)',
    re.S,
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse CLI arguments for the SpecStory audit extractor."""
    parser = argparse.ArgumentParser(
        description=(
            'Extract structured session metadata from '
            'SpecStory history.'
        ),
    )
    parser.add_argument(
        '--history-dir',
        default=str(DEFAULT_HISTORY_DIR),
        help=(
            'Directory containing SpecStory markdown transcripts. '
            f'Default: {DEFAULT_HISTORY_DIR}'
        ),
    )
    parser.add_argument(
        '--output',
        help='Optional JSON output path. Defaults to stdout.',
    )
    parser.add_argument(
        '--compact',
        action='store_true',
        help='Emit compact JSON instead of pretty-printed JSON.',
    )
    return parser.parse_args(argv)


def _resolve_history_dir(history_dir: str | Path) -> Path:
    path = Path(history_dir).expanduser().resolve()
    if not path.exists() or not path.is_dir():
        raise FileNotFoundError(
            f'SpecStory history directory does not exist: {path}'
        )
    return path


def list_history_files(history_dir: Path) -> list[Path]:
    """Return all markdown transcripts under the history directory."""
    return sorted(history_dir.glob('*.md'))


def extract_first_user_block(text: str) -> str:
    """Return the first user-authored block from a transcript."""
    match = USER_BLOCK_PATTERN.search(text)
    if not match:
        return ''
    return match.group(1).strip()


def extract_primary_requests(first_user_block: str) -> list[str]:
    """Return continuation-summary primary requests when present."""
    if (
        'This session is being continued from a previous conversation'
        not in first_user_block
    ):
        return []

    primary_match = PRIMARY_REQUESTS_PATTERN.search(first_user_block)
    if not primary_match:
        return []

    requests: list[str] = []
    for line in primary_match.group(1).splitlines():
        stripped = line.strip()
        if stripped.startswith('-') or stripped.startswith('*'):
            requests.append(stripped)
    return requests


def summarize_history_file(path: Path) -> dict[str, Any]:
    """Extract audit metadata from a single SpecStory transcript."""
    text = path.read_text(encoding='utf-8', errors='replace')
    first_user_block = extract_first_user_block(text)
    first_user_line = ''
    if first_user_block:
        first_user_line = first_user_block.splitlines()[0].strip()

    session_match = SESSION_PATTERN.search(text)
    session_id = session_match.group(1) if session_match else ''

    commits = sorted({
        value
        for value in COMMIT_PATTERN.findall(text)
        if not re.fullmatch(r'[0-9]{7,40}', value)
    })
    pull_requests = sorted({
        left or right
        for left, right in PULL_REQUEST_PATTERN.findall(text)
        if left or right
    })

    return {
        'file': path.name,
        'session_id': session_id,
        'continued': (
            'This session is being continued from a previous conversation'
            in first_user_block
        ),
        'first_user_line': first_user_line[:240],
        'primary_requests': extract_primary_requests(first_user_block)[:12],
        'prs': pull_requests[:20],
        'commits': commits[:40],
    }


def build_report(history_dir: str | Path) -> dict[str, Any]:
    """Build the aggregate JSON payload for SpecStory audit tooling."""
    resolved_history_dir = _resolve_history_dir(history_dir)
    sessions = [
        summarize_history_file(path)
        for path in list_history_files(resolved_history_dir)
    ]
    return {
        'history_dir': str(resolved_history_dir),
        'session_count': len(sessions),
        'sessions': sessions,
    }


def main(argv: list[str] | None = None) -> int:
    """Run the CLI and return a process exit code."""
    args = parse_args(argv)

    try:
        report = build_report(args.history_dir)
    except FileNotFoundError as exc:
        print(f'Error: {exc}', file=sys.stderr)
        return 1

    json_text = json.dumps(
        report,
        indent=None if args.compact else 2,
    )

    if args.output:
        output_path = Path(args.output).expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(f'{json_text}\n', encoding='utf-8')
        print(
            f'Wrote {report["session_count"]} sessions to {output_path}',
            file=sys.stderr,
        )
        return 0

    print(json_text)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
