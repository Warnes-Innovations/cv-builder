# UI Session Artifact Next Steps Prompt

<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

**Last Updated:** 2026-03-25 18:15 EDT

**Executive Summary:** This prompt is a handoff package for the next agent continuing the UI-input to session/artifact audit in `cv-builder`. The audit document and OBO session already exist, the duckflow artifacts were regenerated in the `cvgen` environment, and the remaining work is to implement or further validate the two verified findings rather than to repeat the exploratory analysis.

## Contents
- Goal
- Current State
- Verified Findings
- Important Files
- Issue Already Filed
- Prompt For The Next Agent

## Goal

Continue the source-backed work on UI input preservation and downstream artifact inclusion in `cv-builder` without redoing the completed audit. Use the existing audit and OBO session as the starting point, then decide whether to implement fixes now or extend the evidence if Dr. Greg narrows scope further.

## Current State

- Audit document created at [tasks/ui-session-artifact-analysis.md](/Users/warnes/src/cv-builder/tasks/ui-session-artifact-analysis.md).
- OBO findings session created at [.github/obo_sessions/session_20260325_180556.json](/Users/warnes/src/cv-builder/.github/obo_sessions/session_20260325_180556.json).
- Duckflow artifacts regenerated from the main source tree only:
  - [.github/duckflow/ui-session-artifact-flow.stitched.json](/Users/warnes/src/cv-builder/.github/duckflow/ui-session-artifact-flow.stitched.json)
  - [.github/duckflow/ui-session-artifact-flow.mmd](/Users/warnes/src/cv-builder/.github/duckflow/ui-session-artifact-flow.mmd)
- `oboe-mcp` issue filed for the tool-schema mismatch encountered during OBO session creation.

## Verified Findings

### 1. Achievement edits are session-preserved but not on the shared preview/final generation path

What is already verified:

- `POST /api/save-achievement-edits` persists `state['achievement_edits']`.
- `SessionDataView.materialize_generation_customizations()` does not materialize `achievement_edits` into the shared generation customizations.
- `POST /api/cv/generate-preview` uses shared materialized customizations plus `approved_rewrites` and `spell_audit`, but not `achievement_edits` directly.
- `POST /api/cv/ats-score` contains the only verified fallback that converts `achievement_edits` into temporary rewrite-like entries, and only when `approved_rewrites` is empty.

Implication:

- The session file can preserve the user’s bullet edits while preview/final outputs still render the pre-edit content.

### 2. Layout instruction archive metadata depends on promotion out of `generation_state`

What is already verified:

- During layout review, instructions accumulate in `generation_state.layout_instructions`.
- `POST /api/layout-complete` promotes that history to top-level `state['layout_instructions']` via `conversation.complete_layout_review(...)`.
- `POST /api/finalise` writes metadata from top-level `state['layout_instructions']`, not directly from `generation_state.layout_instructions`.

Implication:

- The normal browser flow is probably correct, but archive metadata depends on a separate promotion step rather than reading the staged-generation source of truth directly.

## Important Files

Primary audit and handoff files:

- [tasks/ui-session-artifact-analysis.md](/Users/warnes/src/cv-builder/tasks/ui-session-artifact-analysis.md)
- [.github/obo_sessions/session_20260325_180556.json](/Users/warnes/src/cv-builder/.github/obo_sessions/session_20260325_180556.json)
- [tasks/ui-session-artifact-next-steps.prompt.md](/Users/warnes/src/cv-builder/tasks/ui-session-artifact-next-steps.prompt.md)

Primary source files already inspected:

- [scripts/routes/status_routes.py](/Users/warnes/src/cv-builder/scripts/routes/status_routes.py)
- [scripts/routes/review_routes.py](/Users/warnes/src/cv-builder/scripts/routes/review_routes.py)
- [scripts/routes/generation_routes.py](/Users/warnes/src/cv-builder/scripts/routes/generation_routes.py)
- [scripts/routes/master_data_routes.py](/Users/warnes/src/cv-builder/scripts/routes/master_data_routes.py)
- [scripts/utils/session_data_view.py](/Users/warnes/src/cv-builder/scripts/utils/session_data_view.py)
- [scripts/utils/conversation_manager.py](/Users/warnes/src/cv-builder/scripts/utils/conversation_manager.py)
- [web/layout-instruction.js](/Users/warnes/src/cv-builder/web/layout-instruction.js)

## Issue Already Filed

- `Warnes-Innovations/oboe-mcp#3`: `fix: published MCP schema for obo_create omits required items argument`
- URL: https://github.com/Warnes-Innovations/oboe-mcp/issues/3

The issue exists because the client-facing MCP schema presented to the agent omitted `items` for `obo_create`, even though the `oboe-mcp` server implementation and tests clearly require it.

## Prompt For The Next Agent

Use this prompt as the starting instruction for the next agent:

> We are continuing the `cv-builder` UI-input/session/artifact audit work in `/Users/warnes/src/cv-builder`.
>
> Read and follow:
> - `.github/copilot-instructions.md`
> - `~/src/vscode-config/copilot-instructions.md`
> - relevant skills, especially `copilot-preflight`, `cv-builder-patterns`, `duckflow`, `workflow-orchestration`, `markdown-formatting`, and `code-review`
>
> Current completed artifacts:
> - audit doc: `tasks/ui-session-artifact-analysis.md`
> - OBO session: `.github/obo_sessions/session_20260325_180556.json`
> - regenerated duckflow artifacts:
>   - `.github/duckflow/ui-session-artifact-flow.stitched.json`
>   - `.github/duckflow/ui-session-artifact-flow.mmd`
>
> Already-verified findings:
> 1. `achievement_edits` are persisted in session state but do not flow through the shared preview/final generation path; only ATS scoring has a fallback that converts them into temporary rewrite-like data.
> 2. layout instruction archive metadata depends on `POST /api/layout-complete` promoting `generation_state.layout_instructions` to top-level `state['layout_instructions']` before finalise writes metadata.
>
> Your task:
> 1. Confirm whether Dr. Greg wants implementation fixes now or only further documentation/review sequencing.
> 2. If implementation is requested, fix the first finding at the root by routing `achievement_edits` through the same shared generation/customization path used by preview/final generation.
> 3. Then decide whether to harden the second finding by making finalise read the authoritative staged-generation source of truth or by centralizing the promotion logic.
> 4. Preserve the rule that customization-stage edits stay in session state only and never write to `Master_CV_Data.json`.
> 5. Use the `cvgen` environment for Python commands.
> 6. Run targeted validation after changes and update the audit doc if behavior changes.
>
> Suggested starting files:
> - `scripts/routes/review_routes.py`
> - `scripts/routes/generation_routes.py`
> - `scripts/utils/session_data_view.py`
> - `scripts/utils/cv_orchestrator.py`
> - `scripts/utils/conversation_manager.py`
>
> Do not redo the broad discovery pass unless new evidence contradicts the existing audit.
