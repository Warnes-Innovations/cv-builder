# AGENTS.md

Cross-agent instructions for this repository.

## Supported Agents

- Claude Code
- Copilot
- Codex
- Cline

## Master Data Contract Maintenance

When app changes modify the Master_CV_Data.json structure, update these files in the same workstream:

- MASTER_CV_DATA_SPECIFICATION.md
- scripts/utils/master_data_validator.py
- schemas/master_cv_data.schema.json

## Copyright Header Requirement

Always add and preserve the project-approved copyright and SPDX header in source code files, documentation files, and other appropriate text-based project artifacts.

- ✅ CORRECT: Add headers to new source/docs files where comment syntax is supported; keep shebang on line 1 and insert the header immediately after.
- ❌ INCORRECT: Omit headers on new files, add headers to generated/vendor artifacts, or use invalid comment syntax for the file type.

Why: Consistent headers keep licensing obligations explicit and reduce legal ambiguity for all downstream users.

## Avoid Duplicate Helper/Function Definitions Across Files

This codebase has repeatedly split the same helper across two modules during refactors (e.g. `web/ui-core.js` vs `web/ui-helpers.js`, or `scripts/master_data_routes.py` vs `scripts/web_app.py`). When two same-named functions/exports exist, whichever module loads/imports last silently wins, quietly reverting any fix that landed in the other copy — often without failing tests.

- ✅ CORRECT: Before adding a new function or export, grep for an existing definition of the same name across the relevant surface (`web/*.js`, `scripts/**/*.py`). If one exists, fix/extend that single canonical definition and have other modules reference it.
- ❌ INCORRECT: Add a second same-named function/export in another file instead of consolidating — this caused real regressions (GAP-146 `toggleChat`, GAP-48 `showAlertModal`/`closeAlertModal`, GAP-43 `_save_master`, the last of which is still open and needs consolidation).

Why: duplicate definitions are a silent-shadowing risk — the app can look correct in one code path while an old, unfixed copy still runs elsewhere.

Run `npm run lint:duplication` before committing changes that add/move helpers — it chains four checks: exact-name duplicates across JS/Python (`lint:duplicates`), near-identical JS function bodies (`lint:duplicate-functions`, eslint-plugin-sonarjs), copy-pasted blocks across JS+Python regardless of naming (`lint:duplicate-code`, jscpd), and Python-side copy-paste (`lint:duplicate-code:py`, pylint `duplicate-code`/R0801).

## Duckflow Annotations

Use `duckflow` comments for local data-flow facts only.

- Keep annotations adjacent to the code they describe.
- Use exact tokens for route calls, state keys, response fields, and output artifacts.
- Require a UTC `timestamp` field in `YYYY-MM-DDTHH:MM:SSZ` format and refresh it whenever the annotated code changes.
- When a flow exists in both live inline handlers and extracted route modules, annotate both.
- Mark live code with `status: live` and extracted-but-unwired route mirrors with `status: planned`.
- Regenerate stitched graphs with the standalone duckflow toolkit from `https://github.com/Warnes-Innovations/duckflow`, for example `duckflow-extract --repo-root .` and `duckflow-mermaid --repo-root . --match <flow>`, after changing annotations.
