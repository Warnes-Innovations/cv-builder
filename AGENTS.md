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

## Duckflow Annotations

Use `duckflow` comments for local data-flow facts only.

- Keep annotations adjacent to the code they describe.
- Use exact tokens for route calls, state keys, response fields, and output artifacts.
- Require a UTC `timestamp` field in `YYYY-MM-DDTHH:MM:SSZ` format and refresh it whenever the annotated code changes.
- When a flow exists in both live inline handlers and extracted route modules, annotate both.
- Mark live code with `status: live` and extracted-but-unwired route mirrors with `status: planned`.
- Regenerate stitched graphs with the standalone duckflow toolkit from `https://github.com/Warnes-Innovations/duckflow`, for example `duckflow-extract --repo-root .` and `duckflow-mermaid --repo-root . --match <flow>`, after changing annotations.
