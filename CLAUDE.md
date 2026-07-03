# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

> **Full project reference is in `.github/copilot-instructions.md`** — read that first.
> It contains: commands, architecture, configuration schema, API routes, output formats,
> patterns, gotchas, slash commands, and /obo session management.

## Master Data Contract Maintenance

When app changes modify the `Master_CV_Data.json` structure, update these files in the same change:

- `MASTER_CV_DATA_SPECIFICATION.md`
- `scripts/utils/master_data_validator.py`
- `schemas/master_cv_data.schema.json`

## Copyright Header Requirement

Always add and preserve the project-approved copyright and SPDX header in maintained source/docs files.

- ✅ CORRECT: Add headers where comment syntax is supported; keep shebang on line 1 and insert the header immediately after.
- ❌ INCORRECT: Add headers to generated/vendor artifacts (for example: `web/bundle.js`, `htmlcov/`, `test_output/`, caches).

## Permission Scope: Shared vs. Personal Settings

`.claude/settings.json` is tracked in git and shared by every contributor; `.claude/settings.local.json` is gitignored and personal to one machine/user.

- ✅ CORRECT: Before adding a new permission entry, consider whether the rule is genuinely team-wide (a command/domain every contributor would want pre-approved, using portable/relative paths — no `/Users/<name>/...` or other machine-specific absolute paths) vs. a one-off or personal convenience. When it's ambiguous, ask the user which file it belongs in rather than guessing.
- ❌ INCORRECT: Add team-wide rules to `settings.local.json` (they won't reach other contributors) or personal/machine-specific rules with hardcoded absolute paths to `settings.json` (they'll silently never match for anyone else, and break entirely on non-macOS deployment hosts).

## Avoid Duplicate Helper/Function Definitions Across Files

This codebase has repeatedly split the same helper across two modules during refactors (e.g. `web/ui-core.js` vs `web/ui-helpers.js`, or `scripts/master_data_routes.py` vs `scripts/web_app.py`). Whichever module loads/imports last silently wins when two same-named functions/exports exist, quietly reverting any fix that landed in the other copy — often without failing tests.

- ✅ CORRECT: Before adding a new function or export, grep for an existing definition of the same name across the relevant surface (`web/*.js`, `scripts/**/*.py`). If one exists, fix/extend that single canonical definition and have other modules reference it.
- ❌ INCORRECT: Add a second same-named function/export in another file instead of consolidating — this caused real regressions (GAP-146 `toggleChat`, GAP-48 `showAlertModal`/`closeAlertModal`, GAP-43 `_save_master`, the last of which is still open and needs consolidation).
