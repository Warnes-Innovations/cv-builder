---
name: cv-e2e-browser-test
description: Run or guide an end-to-end browser test of the cv-builder UI using the Claude browser-test workflow as a checklist. Use when asked for the old Claude e2e-browser-test command or a full cv-builder UI smoke test.
---

# CV E2E Browser Test

Adapted from `.claude/commands/e2e-browser-test.md`.

## Purpose

Exercise the cv-builder web UI from job input through generation and persistence, recording pass/fail evidence by phase.

## Phases

**Do not use a hardcoded phase list here.** Always read the current authoritative checklist at
`.claude/commands/e2e-browser-test.md` before executing any phase. That file is the single
source of truth and is updated as the workflow evolves. A stale copy here would produce incorrect
test steps and missed coverage.

The current authoritative checklist covers **28 phases (0–27)** across Part 1 (primary applicant
journey) plus **5 persona passes (P1–P5)** in Part 2. For a quick phase-number reference, see
`.claude/commands/e2ePhaseTest.md`.

## Codex adaptation

- Read `.claude/commands/e2e-browser-test.md` first, then run the requested phase(s).
- If browser automation tooling is available, use it.
- If not, use the phase steps as a manual or semi-manual test checklist.
- Save the resulting report under `tasks/e2e-test-report-<YYYYMMDD>.md`.

## Inputs

- Running server at `http://127.0.0.1:5001`
- Sample job description
- Clean session state

## Original reference

- `.claude/commands/e2e-browser-test.md` (authoritative — always read this file, not this adapter)
