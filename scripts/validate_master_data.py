#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""CLI wrapper for validating Master_CV_Data.json.

Exit codes:
- 0: validation passed
- 1: validation failed
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path


def _load_validate_master_data_file():
    """Load validator function without importing the full utils package."""
    module_path = Path(__file__).parent / "utils" / "master_data_validator.py"
    spec = importlib.util.spec_from_file_location(
        "master_data_validator",
        module_path,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(
            f"failed to load validator module from {module_path}"
        )

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module.validate_master_data_file


def _default_master_path() -> str:
    """Resolve default master data path for CLI usage."""
    return os.getenv("CV_MASTER_DATA_PATH", "~/CV/Master_CV_Data.json")


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Validate Master_CV_Data.json",
    )
    parser.add_argument(
        "--master-data",
        default=_default_master_path(),
        help="Path to Master_CV_Data.json",
    )
    parser.add_argument(
        "--schema",
        default=str(
            Path(__file__).resolve().parents[1]
            / "schemas"
            / "master_cv_data.schema.json"
        ),
        help="Path to JSON Schema file",
    )
    parser.add_argument(
        "--no-schema",
        action="store_true",
        help="Skip JSON Schema validation and only run structural checks",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON output",
    )
    return parser.parse_args()


def main() -> int:
    """Run validation and return process exit code."""
    args = parse_args()
    validate_master_data_file = _load_validate_master_data_file()
    result = validate_master_data_file(
        args.master_data,
        use_schema=not args.no_schema,
        schema_path=args.schema,
    )

    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        status = "VALID" if result.valid else "INVALID"
        print(f"Master data validation: {status}")
        print(f"  File:   {result.checked_path}")
        print(f"  Schema: {result.schema_path}")

        if result.errors:
            print("Errors:")
            for err in result.errors:
                print(f"  - {err}")

        if result.warnings:
            print("Warnings:")
            for warning in result.warnings:
                print(f"  - {warning}")

    return 0 if result.valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
