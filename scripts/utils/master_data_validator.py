# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Validation helpers for Master_CV_Data.json.

This module is designed for reuse by both the web app and command-line tools.
It performs lightweight structural validation and optional JSON Schema
validation when the `jsonschema` package is available.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import importlib
import json
from pathlib import Path
from typing import Any, Optional


@dataclass
class ValidationResult:
    """Container for validation outcomes."""

    valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    checked_path: Optional[str] = None
    schema_path: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-serializable representation of the result."""
        return {
            "valid": self.valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "checked_path": self.checked_path,
            "schema_path": self.schema_path,
        }


def _default_schema_path() -> Path:
    """Return repository-default schema path."""
    return (
        Path(__file__).resolve().parents[2]
        / "schemas"
        / "master_cv_data.schema.json"
    )


def _validate_top_level_structure(master: Any) -> list[str]:
    """Validate top-level structure used throughout cv-builder."""
    errors: list[str] = []

    if not isinstance(master, dict):
        return ["master data must be a JSON object"]

    if "personal_info" in master and not isinstance(
        master.get("personal_info"),
        dict,
    ):
        errors.append("personal_info must be an object")

    for key in ("experience", "education", "awards", "certifications", "selected_achievements"):
        if key in master and not isinstance(master.get(key), list):
            errors.append(f"{key} must be a list")

    if "experiences" in master and not isinstance(
        master.get("experiences"),
        list,
    ):
        errors.append("experiences must be a list when present")

    if "skills" in master and not isinstance(
        master.get("skills"),
        (list, dict),
    ):
        errors.append("skills must be a list or object")

    if "professional_summaries" in master and not isinstance(
        master.get("professional_summaries"),
        (dict, list),
    ):
        errors.append("professional_summaries must be an object or list")

    return errors


def _validate_against_schema(
    master: Any,
    *,
    schema_path: Path,
    warnings: list[str],
) -> list[str]:
    """Validate against JSON Schema when runtime dependencies are present."""
    errors: list[str] = []

    if not schema_path.exists():
        warnings.append(f"schema file not found: {schema_path}")
        return errors

    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"failed to read schema file: {exc}")
        return errors

    try:
        jsonschema_mod = importlib.import_module("jsonschema")
        draft_validator = getattr(jsonschema_mod, "Draft202012Validator")
    except (ModuleNotFoundError, AttributeError):
        warnings.append(
            "jsonschema package is not installed; skipped schema validation"
        )
        return errors

    validator = draft_validator(schema)
    schema_errors = sorted(
        validator.iter_errors(master),
        key=lambda err: list(err.path),
    )
    for err in schema_errors:
        path_text = "/".join(str(p) for p in err.path) or "<root>"
        errors.append(f"schema error at {path_text}: {err.message}")

    return errors


def validate_master_data(
    master: Any,
    *,
    use_schema: bool = True,
    schema_path: Optional[str] = None,
) -> ValidationResult:
    """Validate an in-memory master data object.

    Args:
        master: Parsed JSON object.
        use_schema: If True, perform schema validation when possible.
        schema_path: Optional path override for JSON Schema file.
    """
    warnings: list[str] = []
    errors = _validate_top_level_structure(master)

    resolved_schema_path = (
        Path(schema_path).expanduser()
        if schema_path
        else _default_schema_path()
    )
    if use_schema:
        errors.extend(
            _validate_against_schema(
                master,
                schema_path=resolved_schema_path,
                warnings=warnings,
            )
        )

    return ValidationResult(
        valid=not errors,
        errors=errors,
        warnings=warnings,
        schema_path=str(resolved_schema_path),
    )


def validate_master_data_file(
    master_data_path: str,
    *,
    use_schema: bool = True,
    schema_path: Optional[str] = None,
) -> ValidationResult:
    """Validate a master data JSON file on disk."""
    path = Path(master_data_path).expanduser()
    resolved_schema_path = (
        Path(schema_path).expanduser()
        if schema_path
        else _default_schema_path()
    )

    if not path.exists():
        return ValidationResult(
            valid=False,
            errors=[f"master data file not found: {path}"],
            checked_path=str(path),
            schema_path=str(resolved_schema_path),
        )

    try:
        master = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return ValidationResult(
            valid=False,
            errors=[f"invalid JSON in master data file: {exc}"],
            checked_path=str(path),
            schema_path=str(resolved_schema_path),
        )
    except OSError as exc:
        return ValidationResult(
            valid=False,
            errors=[f"failed to read master data file: {exc}"],
            checked_path=str(path),
            schema_path=str(resolved_schema_path),
        )

    result = validate_master_data(
        master,
        use_schema=use_schema,
        schema_path=schema_path,
    )
    result.checked_path = str(path)
    return result
