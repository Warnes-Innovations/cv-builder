#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Copy CV source assets into a target directory for debugging workflows.

Examples:
    conda run -n cvgen python scripts/copy_cv_assets.py \
        --example medium

    conda run -n cvgen python scripts/copy_cv_assets.py \
        --example complex --output-dir ~/CV/debug-profile

    conda run -n cvgen python scripts/copy_cv_assets.py \
        --path ~/CV
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tests.helpers.example_profiles import (  # noqa: E402
    resolve_example_profile,
)


ASSET_FILENAMES = (
    'Master_CV_Data.json',
    'publications.bib',
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse CLI arguments for asset-copy workflow."""
    parser = argparse.ArgumentParser(
        description='Copy CV master-data and bibliography assets.',
    )
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument(
        '--example',
        choices=('simple', 'medium', 'complex'),
        help='Copy one of the repository-owned example profile tiers.',
    )
    source_group.add_argument(
        '--path',
        help='Copy assets from an existing directory containing the files.',
    )
    parser.add_argument(
        '--output-dir',
        default='.',
        help='Destination directory. Defaults to the current directory.',
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Emit machine-readable JSON output.',
    )
    return parser.parse_args(argv)


def _resolve_source_dir(args: argparse.Namespace) -> Path:
    if args.example:
        return resolve_example_profile(args.example)
    return Path(args.path).expanduser().resolve()


def _resolve_output_dir(args: argparse.Namespace) -> Path:
    return Path(args.output_dir).expanduser().resolve()


def _validate_source_dir(source_dir: Path) -> None:
    if not source_dir.exists() or not source_dir.is_dir():
        raise FileNotFoundError(
            f'Source directory does not exist: {source_dir}'
        )

    missing = [
        filename
        for filename in ASSET_FILENAMES
        if not (source_dir / filename).exists()
    ]
    if missing:
        raise FileNotFoundError(
            'Source directory is missing required assets: '
            + ', '.join(missing)
        )


def _ensure_destination_is_safe(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    collisions = [
        filename
        for filename in ASSET_FILENAMES
        if (output_dir / filename).exists()
    ]
    if collisions:
        raise FileExistsError(
            'Destination already contains: ' + ', '.join(collisions)
        )


def copy_assets(source_dir: Path, output_dir: Path) -> dict[str, str]:
    """Copy CV assets from source directory into destination directory."""
    _validate_source_dir(source_dir)
    _ensure_destination_is_safe(output_dir)

    copied: dict[str, str] = {}
    for filename in ASSET_FILENAMES:
        source_path = source_dir / filename
        destination_path = output_dir / filename
        shutil.copy2(source_path, destination_path)
        copied[filename] = str(destination_path)
    return copied


def _format_result(
    source_dir: Path,
    output_dir: Path,
    copied: dict[str, str],
) -> dict[str, object]:
    return {
        'source_dir': str(source_dir),
        'output_dir': str(output_dir),
        'copied': copied,
    }


def main(argv: list[str] | None = None) -> int:
    """Run the CLI and return process exit code."""
    args = parse_args(argv)
    try:
        source_dir = _resolve_source_dir(args)
        output_dir = _resolve_output_dir(args)
        copied = copy_assets(source_dir, output_dir)
    except (FileExistsError, FileNotFoundError) as exc:
        print(f'Error: {exc}')
        return 1

    result = _format_result(source_dir, output_dir, copied)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f'Source:      {result["source_dir"]}')
        print(f'Destination: {result["output_dir"]}')
        print('Copied:')
        for filename, destination in copied.items():
            print(f'  - {filename} -> {destination}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
