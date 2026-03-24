#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


ENTRY_RE = re.compile(r"@\w+\s*\{")


def summarize_master(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    summary: dict[str, Any] = {
        "top_level_keys": list(data.keys()),
        "top_level_count": len(data),
    }

    for key in (
        "professional_summaries",
        "experience",
        "skills",
        "selected_achievements",
        "education",
        "certifications",
        "awards",
        "publications",
        "projects",
        "patents",
        "open_source",
        "volunteer_experience",
        "professional_affiliations",
        "presentations",
        "media_coverage",
    ):
        value = data.get(key)
        if isinstance(value, list):
            summary[key] = {"type": "list", "count": len(value)}
        elif isinstance(value, dict):
            summary[key] = {
                "type": "dict",
                "count": len(value),
                "keys": list(value.keys())[:20],
            }
        else:
            summary[key] = (
                None
                if value is None
                else {"type": type(value).__name__}
            )

    return summary


def summarize_bib(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    years = re.findall(r"year\s*=\s*\{?(\d{4})\}?", text, flags=re.IGNORECASE)
    return {
        "entries": len(ENTRY_RE.findall(text)),
        "chars": len(text),
        "year_min": min(years) if years else None,
        "year_max": max(years) if years else None,
    }


def report_path(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"path": str(path), "missing": True}

    if path.suffix == ".json":
        payload = summarize_master(path)
    else:
        payload = summarize_bib(path)

    payload["path"] = str(path)
    return payload


def build_default_paths(repo_root: Path) -> list[Path]:
    fixtures_root = repo_root / "tests" / "fixtures" / "example_profiles"
    return [
        fixtures_root / "simple" / "Master_CV_Data.json",
        fixtures_root / "simple" / "publications.bib",
        fixtures_root / "medium" / "Master_CV_Data.json",
        fixtures_root / "medium" / "publications.bib",
        fixtures_root / "complex" / "Master_CV_Data.json",
        fixtures_root / "complex" / "publications.bib",
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Summarize fixture and bibliography complexity counts.",
    )
    parser.add_argument(
        "paths",
        nargs="*",
        help=(
            "Optional file paths to summarize. Defaults to the "
            "three example profile tiers."
        ),
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    raw_paths = [Path(p).expanduser() for p in args.paths]
    if not raw_paths:
        raw_paths = build_default_paths(repo_root)
    report = [report_path(path) for path in raw_paths]
    if args.pretty:
        print(json.dumps(report, indent=2))
    else:
        print(json.dumps(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
