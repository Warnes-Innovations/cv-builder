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
