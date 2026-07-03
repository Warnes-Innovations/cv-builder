#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Convenience launcher for comprehensive CV rendering.

This wrapper delegates to scripts/cv-preview.py with --comprehensive enabled
so users can generate a recruiter-ready full-data package with one short
command.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate a comprehensive recruiter-ready CV package in one "
            "command."
        ),
    )
    source_group = parser.add_mutually_exclusive_group(required=False)
    source_group.add_argument(
        "--path",
        default="~/CV",
        help=(
            "Source directory containing Master_CV_Data.json and "
            "publications.bib, or a session directory/file."
        ),
    )
    source_group.add_argument(
        "--example",
        choices=("simple", "medium", "complex"),
        help="Render from a repository-owned example profile.",
    )
    parser.add_argument(
        "--output-dir",
        default="~/CV/files/Comprehensive_CV",
        help="Destination directory for generated artifacts.",
    )
    parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="Overwrite existing files in destination.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON output.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Run the comprehensive CV generation pipeline.

    Return codes
    ------------
    0  — subprocess completed successfully.
    2  — ``cvgen`` Python environment could not be located; print instructions.
    N  — any other value returned by the delegated ``cv-preview.py`` subprocess.
    """
    args = parse_args(argv)
    script_path = Path(__file__).with_name("cv-preview.py")

    # Prefer the cvgen interpreter so required runtime deps (e.g., python-docx)
    # are available even when this wrapper is launched from base/system Python.
    # The fallback hard-coded path is macOS/Homebrew-specific; it is silently
    # skipped on other systems and falls through to the conda-run fallback.
    conda_env_name = os.getenv("CONDA_DEFAULT_ENV", "")
    cvgen_python = Path(sys.prefix) / "bin" / "python"
    fallback_cvgen_python = Path(
        "/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python"
    )

    if conda_env_name == "cvgen":
        runner = [sys.executable]
    elif cvgen_python.exists() and "envs/cvgen" in str(cvgen_python):
        runner = [str(cvgen_python)]
    elif fallback_cvgen_python.exists():
        runner = [str(fallback_cvgen_python)]
    elif shutil.which("conda"):
        runner = ["conda", "run", "-n", "cvgen", "python"]
    else:
        print(
            "Error: could not locate the 'cvgen' Python environment. "
            "Run: conda activate cvgen",
            file=sys.stderr,
        )
        return 2

    cmd = [
        *runner,
        str(script_path),
        "--comprehensive",
        "--skills-experience", "never",  # suppress inline skills-in-experience rendering
        "--output-dir",
        args.output_dir,
    ]

    if args.path:
        cmd.extend(["--path", args.path])
    if args.example:
        cmd.extend(["--example", args.example])
    if args.force:
        cmd.append("--force")
    if args.json:
        cmd.append("--json")

    completed = subprocess.run(cmd, check=False)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
