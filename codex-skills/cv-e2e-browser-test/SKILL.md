---
name: cv-e2e-browser-test
description: Run or guide an end-to-end browser test of the cv-builder UI using the Claude browser-test workflow as a checklist. Use when asked for the old Claude e2e-browser-test command or a full cv-builder UI smoke test.
---

# CV E2E Browser Test

Adapted from `.claude/commands/e2e-browser-test.md`.

## Purpose

Exercise the cv-builder web UI from job input through generation and persistence, recording pass/fail evidence by phase.

## Phases

1. App load
2. Job input
3. Analysis display
4. Clarifying questions
5. Customization review
6. Rewrite review
7. Spell check
8. CV generation
9. ATS validation
10. Session persistence
11. Error handling

## Codex adaptation

- If browser automation tooling is available, use it.
- If not, use the phase list as a manual or semi-manual test checklist.
- Save the resulting report under `tasks/e2e-test-report-<YYYYMMDD>.md`.

## Inputs

- running server
- sample job description
- clean session state

## Original reference

- `.claude/commands/e2e-browser-test.md`
