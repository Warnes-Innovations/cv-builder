# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

# pyright: reportMissingTypeStubs=false

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate a fixture review bundle for issue #59."
    )
    parser.add_argument(
        "--output-dir",
        default="test_output/fixture-review-bundle",
        help="Directory where the review bundle will be written.",
    )
    parser.add_argument(
        "--profile",
        default="complex",
        help="Example profile tier to materialize.",
    )
    parser.add_argument(
        "--job-fixture",
        default=None,
        help="Optional repository-relative or absolute job fixture path.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    from tests.helpers.fixture_review import (  # type: ignore[import-untyped]
        generate_fixture_review_bundle,
    )

    manifest = generate_fixture_review_bundle(
        bundle_root=Path(args.output_dir),
        profile_name=args.profile,
        job_fixture_path=args.job_fixture,
    )
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
