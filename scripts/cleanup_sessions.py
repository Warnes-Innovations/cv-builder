#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""Interactive session cleanup utility for local CV-builder session trees."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
from typing import Sequence

from utils.session_cleanup import (
    CATEGORY_ORDER,
    apply_action,
    format_category_report,
    format_scan_report_with_mode,
    scan_sessions,
)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description=(
            "Identify duplicate, empty, test, corrupted, "
            "and trashed sessions."
        ),
    )
    parser.add_argument(
        "--root",
        default="~/CV/cv-builder",
        help="Root directory containing session folders and .trash.",
    )
    parser.add_argument(
        "--report-only",
        "--read-only",
        dest="report_only",
        action="store_true",
        help="Only print the grouped report; do not prompt for actions.",
    )
    parser.add_argument(
        "--detailed",
        action="store_true",
        help="Show the verbose per-session detail instead of compact tables.",
    )
    return parser.parse_args(argv)


def main() -> int:
    """Run the cleanup workflow."""
    args = parse_args()
    root_dir = Path(args.root).expanduser()
    if not root_dir.exists():
        print(f"Session root does not exist: {root_dir}")
        return 1

    scan_result = scan_sessions(root_dir)
    if args.report_only:
        print(
            format_scan_report_with_mode(
                scan_result,
                detailed=args.detailed,
            )
        )
        return 0
    if not sys.stdin.isatty():
        print(
            "Interactive prompts require a TTY. Re-run with --report-only "
            "or from a terminal."
        )
        return 2

    print(f"Session root: {scan_result.root_dir}")
    print(f"Session files scanned: {scan_result.total_session_files}")

    for category in CATEGORY_ORDER:
        candidates = scan_result.categories[category]
        if not candidates:
            continue
        print()
        print(
            format_category_report(
                category,
                candidates,
                detailed=args.detailed,
            )
        )
        detail_text = None
        if not args.detailed:
            detail_text = format_category_report(
                category,
                candidates,
                detailed=True,
            )
        action = _prompt_action(
            category,
            len(candidates),
            detail_text=detail_text,
        )
        if action == "cancel":
            print(
                "Cancelled session cleanup; "
                "no further categories processed."
            )
            return 0
        if action == "leave":
            print(
                f"Leaving {len(candidates)} {category} session(s) "
                "unchanged."
            )
            continue
        if not _confirm_action(action, category, len(candidates)):
            print(f"Skipped {category}; nothing changed.")
            continue
        results = apply_action(root_dir, candidates, action)
        for result in results:
            destination = (
                f" -> {result.destination}"
                if result.destination else ""
            )
            print(f"[{result.status}] {result.source}{destination}")

    print("Session cleanup complete.")
    return 0


def _prompt_action(
    category: str,
    count: int,
    *,
    detail_text: str | None = None,
) -> str:
    prompt = f"Action for {category} ({count} session(s)) "
    if detail_text:
        prompt += (
            "[d]elete permanently / [t]rash / [l]eave / "
            "[v]iew details / [c]ancel: "
        )
    else:
        prompt += "[d]elete permanently / [t]rash / [l]eave / [c]ancel: "
    while True:
        answer = input(prompt).strip().lower()
        if detail_text and answer in {"v", "view", "detail", "details"}:
            print()
            print(detail_text)
            print()
            continue
        mapping = {
            "d": "delete",
            "delete": "delete",
            "t": "trash",
            "trash": "trash",
            "l": "leave",
            "leave": "leave",
            "c": "cancel",
            "cancel": "cancel",
        }
        action = mapping.get(answer)
        if action:
            return action
        if detail_text:
            print("Enter d, t, l, v, or c.")
        else:
            print("Enter d, t, l, or c.")


def _confirm_action(action: str, category: str, count: int) -> bool:
    if action == "delete":
        answer = input(
            f"Type DELETE to permanently remove {count} "
            f"{category} session(s): "
        ).strip()
        return answer == "DELETE"
    answer = input(
        f"Type TRASH to move {count} {category} session(s) into .trash: "
    ).strip()
    return answer == "TRASH"


if __name__ == "__main__":
    raise SystemExit(main())
