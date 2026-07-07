#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Fail when the same top-level function/export name is defined in more than
one file, unless explicitly allowlisted.

Why this exists: web/src/main.js imports every web/*.js module as a namespace
and flattens them with `Object.assign(globalThis, ...)`. If two modules
export the same name, whichever is assigned last silently wins at runtime —
the other implementation (and any bugfix in it) becomes dead code. The same
risk exists on the backend where route/helper modules under scripts/ can
define same-named top-level functions that are easy to call by mistake
instead of the intended one. GAP-146 (toggleChat), GAP-48 (showAlertModal/
closeAlertModal), and GAP-43 (_save_master) were all real regressions caused
by exactly this pattern. See AGENTS.md / CLAUDE.md / .github/copilot-
instructions.md, "Avoid Duplicate Helper/Function Definitions Across Files".

Usage:
    python3 scripts/lint_duplicate_definitions.py

Exit code is non-zero if any non-allowlisted duplicate is found.
"""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"
SCRIPTS_DIR = ROOT / "scripts"

# Names known to be intentionally defined in more than one file. Keep this
# list short and reviewed — it should only ever contain deliberate,
# documented overrides (e.g. a placeholder stub replaced by a fuller
# implementation later in module-assignment order), not "we'll clean it up
# later" duplicates.
ALLOWLIST = {
    # web/src/main.js: "fully-featured implementations override any
    # placeholder stubs" — session-switcher-ui's version deliberately
    # replaces ui-core's stub in the globalThis assignment order.
    "js:showSessionConflictBanner": {
        "web/ui-core.js",
        "web/session-switcher-ui.js",
    },

    # Python: CLI (scripts/cli.py) and MCP server (scripts/mcp_server.py)
    # are intentional mirrors of each other — both expose the same workflow
    # commands through different transport layers. Consolidating them into a
    # shared module is a future refactor (tracked separately).
    "python:decisions_submit":        {"scripts/cli.py", "scripts/mcp_server.py"},
    "python:job_submit_text":         {"scripts/cli.py", "scripts/mcp_server.py"},
    "python:persuasion_check_submit": {"scripts/cli.py", "scripts/mcp_server.py"},
    "python:rewrites_approve":        {"scripts/cli.py", "scripts/mcp_server.py"},
    "python:rewrites_submit":         {"scripts/cli.py", "scripts/mcp_server.py"},
    "python:session_list":            {"scripts/cli.py", "scripts/mcp_server.py"},
    "python:session_new":             {"scripts/cli.py", "scripts/mcp_server.py"},
    "python:session_save":            {"scripts/cli.py", "scripts/mcp_server.py"},
    "python:session_status":          {"scripts/cli.py", "scripts/mcp_server.py"},
    "python:spell_check_submit":      {"scripts/cli.py", "scripts/mcp_server.py"},

    # Python: probe/benchmark scripts are independent standalone tools that
    # happen to define local helpers with common names.  They are never
    # imported by each other or by the main application.
    "python:classify_error": {
        "scripts/anyllm_probe_bare_current_models.py",
        "scripts/anyllm_probe_current_models.py",
        "scripts/anyllm_probe_dual_model_styles.py",
        "scripts/anyllm_probe_openai_family_matrix.py",
    },
    "python:_make_orchestrator": {
        "scripts/benchmark_cv_render.py",
        "scripts/train_layout_estimator.py",
    },
    "python:_read_pdf_page_count": {
        "scripts/routes/generation_routes.py",
        "scripts/train_layout_estimator.py",
    },
    "python:_resolve_output_dir": {
        "scripts/copy_cv_assets.py",
        "scripts/cv-preview.py",
    },
    "python:_resolve_source_dir": {
        "scripts/copy_cv_assets.py",
        "scripts/cv-preview.py",
    },

    # Python: _load_master and _save_master exist in both master_data_routes.py
    # (simpler versions for route-level use) and web_app.py (with validation).
    # TODO: consolidate to a single shared helper; tracked as a future refactor.
    "python:_load_master": {
        "scripts/routes/master_data_routes.py",
        "scripts/web_app.py",
    },
    "python:_save_master": {
        "scripts/routes/master_data_routes.py",
        "scripts/web_app.py",
    },
}

# Top-level Python names that are *expected* to recur across independent
# modules by established convention in this repo, not a shadowing risk:
# every standalone CLI script has its own `main`/`parse_args`, and every
# Flask blueprint module under scripts/routes/ has its own
# `create_blueprint` factory. Everything else (including CLI/MCP parity
# wrappers like `session_new`, and leading-underscore "private" helpers)
# is checked, since those are exactly the shape of the real GAP-43/GAP-146
# incidents.
PYTHON_NAME_IGNORELIST = {"main", "parse_args", "create_blueprint"}

_FUNC_NAME = r"([A-Za-z_$][\w$]*)"
EXPORT_FUNC_RE = re.compile(r"^export\s+(?:async\s+)?function\s+" + _FUNC_NAME)
EXPORT_CONST_RE = re.compile(r"^export\s+(?:const|let|var)\s+" + _FUNC_NAME)
EXPORT_CLASS_RE = re.compile(r"^export\s+class\s+([A-Za-z_$][\w$]*)")
EXPORT_BLOCK_START_RE = re.compile(r"^export\s*\{")


def _js_export_names(text: str) -> set[str]:
    """Return the set of top-level global names a module contributes once
    flattened via `Object.assign(globalThis, NamespaceObject)`."""
    names: set[str] = set()
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        for pattern in (EXPORT_FUNC_RE, EXPORT_CONST_RE, EXPORT_CLASS_RE):
            m = pattern.match(line)
            if m:
                names.add(m.group(1))
        if EXPORT_BLOCK_START_RE.match(line):
            block = line
            while "}" not in block and i + 1 < len(lines):
                i += 1
                block += "\n" + lines[i].strip()
            start = block.index("{") + 1
            end = block.rindex("}")
            inner = block[start:end]
            for entry in inner.split(","):
                entry = entry.strip()
                if not entry:
                    continue
                # "name" or "name as alias" -> the alias (or name) is what
                # ends up as the globalThis key.
                parts = entry.split(" as ")
                names.add(parts[-1].strip())
        i += 1
    return names


def find_js_duplicates() -> dict[str, list[str]]:
    by_name: dict[str, list[str]] = {}
    for path in sorted(WEB_DIR.glob("*.js")):
        if path.name == "bundle.js":
            continue
        rel = str(path.relative_to(ROOT))
        for name in _js_export_names(path.read_text(encoding="utf-8")):
            by_name.setdefault(name, []).append(rel)
    return {name: files for name, files in by_name.items() if len(files) > 1}


def find_python_duplicates() -> dict[str, list[str]]:
    """Flags top-level function names defined in more than one module,
    excluding PYTHON_NAME_IGNORELIST conventions."""
    by_name: dict[str, list[str]] = {}
    for path in sorted(SCRIPTS_DIR.rglob("*.py")):
        if "__pycache__" in path.parts or ".mypy_cache" in path.parts:
            continue
        rel = str(path.relative_to(ROOT))
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=rel)
        except SyntaxError as exc:
            print(f"warning: could not parse {rel}: {exc}", file=sys.stderr)
            continue
        for node in tree.body:
            is_def = isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            if is_def and node.name not in PYTHON_NAME_IGNORELIST:
                by_name.setdefault(node.name, []).append(rel)
    return {name: files for name, files in by_name.items() if len(files) > 1}


def _report(language: str, duplicates: dict[str, list[str]]) -> bool:
    """Print duplicates not covered by the allowlist. Returns True if any
    non-allowlisted duplicate was found."""
    failed = False
    for name, files in sorted(duplicates.items()):
        key = f"{language}:{name}"
        if key in ALLOWLIST and set(files) <= ALLOWLIST[key]:
            continue
        failed = True
        print(f"DUPLICATE {language} definition: `{name}` in:")
        for f in files:
            print(f"    - {f}")
    return failed


def main() -> int:
    js_dupes = find_js_duplicates()
    py_dupes = find_python_duplicates()

    js_failed = _report("js", js_dupes)
    py_failed = _report("python", py_dupes)

    if js_failed or py_failed:
        print(
            "\nSame name defined/exported in multiple files. The later-loaded "
            "copy silently wins (JS: Object.assign(globalThis, ...) in "
            "web/src/main.js) or the wrong copy can be called by mistake "
            "(Python). Consolidate into a single canonical definition, or add "
            "a reviewed entry to ALLOWLIST in this script if the duplication "
            "is deliberate and documented.",
            file=sys.stderr,
        )
        return 1

    print("No unexpected duplicate definitions found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
