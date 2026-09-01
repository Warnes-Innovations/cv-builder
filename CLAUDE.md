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

## Every `/api/download/<filename>` (and similar session-scoped) URL Must Include `session_id`

Every route registered via `get_session()` requires `session_id` and 400s without it. The frontend has three independent call sites that build these URLs (`web/download-tab.js`, `web/review-table-base.js`, `web/final-generate.js`) instead of one shared helper, so this has already been missed once (`web/final-generate.js`'s HTML preview iframe and Download link both omitted it, breaking the in-browser preview with `{"error":"session_id is required"}`).

- ✅ CORRECT (the exact pattern already used in `download-tab.js`/`review-table-base.js`):
  ```js
  const sid = typeof getSessionIdFromURL === 'function' ? getSessionIdFromURL() : null;
  const sp  = sid ? `?session_id=${encodeURIComponent(sid)}` : '';
  const url = `/api/download/${encodeURIComponent(base)}${sp}`;
  ```
- ❌ INCORRECT: `const url = /api/download/${encodeURIComponent(base)};` with no session param — works only by accident, when a session cookie/header happens to cover it; 400s otherwise.
- Why: three separate call sites hand-build the same URL shape instead of sharing one function: exactly the kind of duplication `## Avoid Duplicate Helper/Function Definitions Across Files` above already warns about, just not caught for this pattern. When adding any new `/api/...` fetch/link that depends on the current session, grep the other three sites first and match their pattern — or better, extract a shared `buildSessionScopedUrl(path)` helper so this can't be missed a fourth time.

## Backend Functions Returning Tuples Must Be Explicitly Unpacked at Every Call Site

Several `cv_orchestrator.py` methods return a tuple where the second element is easy to forget (`_generate_ats_docx()` returns `(filepath, ats_score)`; `_generate_human_pdf()` returns `(html_path, pdf_path)`). One call site (`generation_routes.py`'s `generate_cv_final()`) assigned the whole tuple to a single `ats_file` variable, then did `str(ats_file)` on it — which stringifies the *tuple*, not the path, producing corrupted output like `"(PosixPath('/.../CV_..._ATS.docx'), 78)"` that leaked into the UI's file list and the HTML preview iframe's filename.

- ✅ CORRECT: `ats_file, ats_score = conv.orchestrator._generate_ats_docx(...)` — name both return values explicitly, even if one is unused (`_ats_score` is fine).
- ❌ INCORRECT: `ats_file = conv.orchestrator._generate_ats_docx(...)` then `str(ats_file)` — silently stringifies the tuple; no exception is raised, so this ships clean in every test that only checks the response has an `ats_docx` key, not what it *contains*.
- Why: Python doesn't warn when a tuple gets assigned to a single name and later treated as a scalar — the bug is invisible until someone inspects the actual string value. When touching a call to any function whose docstring says "Returns (x, y)", grep for other call sites of the same function and confirm they all unpack the same way.

## Filename Comparisons Must Be Basename-Normalized, Never Raw String Equality

`generated_files['files']` (and similar file lists persisted to session state) can be produced as either full absolute paths or bare basenames depending on which code path wrote them — `generate_cv_final()` currently always writes full paths (`str(ats_file)`, `str(human_docx)`), while every frontend caller requests `/api/download/<filename>` with just the basename. A raw `if file_name == filename:` equality check between a stored full path and a requested basename never matches, so `/api/download/<filename>` 404'd with `"File not found on disk"` even when the file existed right where `output_dir` pointed.

- ✅ CORRECT: `if Path(file_name).name == filename:` — works whether `file_name` is a full path or already a bare basename.
- ❌ INCORRECT: `if file_name == filename:` when one side may be a full path and the other a basename — matches only by coincidence.
- Why: this exact bug had one test (`tests/test_web_ui_workflow.py`) that "covered" it, but that test builds its download request directly from `generated_files["files"]` (full paths) instead of reducing to basename first like a real browser does — so it exercised full-path-vs-full-path and never caught the mismatch a real request hits. When writing a test for filename matching/lookup logic, always construct the request the same way the actual frontend does (basename via `.split('/').pop()`), not by copying the backend's own internal representation.

## New Frontend Modules Need a Test File Before Their First Bug, Not After

`web/final-generate.js` had zero test coverage (no `tests/js/final-generate.test.js` existed) until the session-id and tuple bugs above were reported by manual testing rather than caught by CI. Coverage gaps like this are easy to check: `npm run test:js:cover` reports per-file statement/branch coverage, and any `web/*.js` file showing `0` across the board has no test file exercising it at all (as of writing: `goals.js`, `interview-prep.js`, `llm-log.js`, `thank-you.js`, `provider-info.js` are in this state — check `npm run test:js:cover`'s current output before assuming this list is still accurate).

- ✅ CORRECT: When creating a new `web/*.js` module (or discovering one with no matching `tests/js/*.test.js`), add at least a minimal test file covering its exported functions' main paths before or alongside the feature work, following the pattern in `tests/js/download-tab.test.js`'s header comment for what "minimal but real" coverage looks like.
- ❌ INCORRECT: Ship a new module and defer tests to "later" — later is usually "after a user finds the bug in production."
- Why: modules with zero coverage are exactly where bugs hide longest, since nothing in CI exercises them at all — not even accidentally. A shallow test that just imports the module and calls its exported functions once with realistic arguments catches an entire class of "this throws/silently breaks" bugs for very little effort.
