---
name: cv-ui-review
description: Review the cv-builder UI against user stories and UX heuristics using source-first evidence, then assemble tasks/ui-review.md and tasks/gaps.md. Use when asked for a cv-builder UI review or user-story compliance review.
---

# CV UI Review

Adapted from `~/src/vscode-config/prompts/cvUiReview.prompt.md`.

## Core rule

Evaluate the actual source code first. Do not trust existing `tasks/ui-review.md` or `tasks/gaps.md` as inputs.

## Required source files

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`

Additional files when relevant:

- `scripts/utils/llm_client.py` for persuasion checks
- `scripts/utils/cv_orchestrator.py` for generation and ATS behavior

## Review outputs

1. Write or refresh separate persona review-status files under `tasks/review-status/` instead of editing the story files.
2. Assemble `tasks/ui-review.md`.
3. Reconcile `tasks/gaps.md` to current source-verified findings.

## Status meanings

- `✅` Pass
- `⚠️` Partial
- `❌` Fail
- `🔲` Not implemented
- `—` N/A

## Review coverage

- Applicant stories
- UX stories
- Resume expert stories
- Hiring manager stories
- Persuasion stories
- HR / ATS stories
- Heuristic UX review

## Practical Codex adaptation

- Use parallel helpers or subagents only when available and clearly useful.
- If not, do the same persona-by-persona review locally.
- Normalize uneven source artifacts in the final assembled report instead of forcing false precision.
