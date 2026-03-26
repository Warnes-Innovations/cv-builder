<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Workflow Transition Test Plan

**Last Updated:** 2026-03-24 00:47 EDT

**Executive Summary:** This document defines the canonical valid-combination matrix for the current workflow based on actual backend and browser code paths. It also converts the approved testing strategy into a concrete implementation breakdown with named test cases, target files, sequencing, and the first implementation step: reusable saved-session fixture factories.

## Contents

- [Purpose](#purpose)
- [Source Of Truth](#source-of-truth)
- [Canonical Matrix Rules](#canonical-matrix-rules)
- [Canonical Valid-Combination Matrix](#canonical-valid-combination-matrix)
- [Non-Canonical And Invalid Combinations](#non-canonical-and-invalid-combinations)
- [Concrete Task Breakdown](#concrete-task-breakdown)
- [Implementation Order](#implementation-order)
- [Review Notes](#review-notes)

## Purpose

This document is the approved working plan for the workflow-transition test effort.

It answers four specific questions before test expansion begins:

1. Which top-level workflow states are canonical today?
2. Which staged-generation substates are canonical today?
3. Which combinations are valid in fresh flow versus session restore?
4. Which files and named test cases should be added in the approved implementation order?

## Source Of Truth

The current workflow and restore behavior are derived from these implementation files:

1. `scripts/utils/conversation_manager.py`
2. `scripts/routes/generation_routes.py`
3. `scripts/routes/review_routes.py`
4. `scripts/routes/session_routes.py`
5. `web/state-manager.js`
6. `web/session-manager.js`
7. `web/layout-instruction.js`

Existing regression anchors that already cover parts of the contract:

1. `tests/test_conversation_manager.py`
2. `tests/test_intake_rerun.py`
3. `tests/test_staged_generation.py`
4. `tests/test_concurrent_sessions.py`
5. `tests/ui/test_ui_generation.py`
6. `tests/ui/test_ui_session.py`

## Canonical Matrix Rules

The matrix below uses these rules:

1. `state['phase']` is the top-level workflow source of truth.
2. `state['generation_state']` is optional in persisted sessions.
3. When `generation_state` is absent or empty, the API normalizes the visible staged phase to `idle`.
4. A combination is marked canonical only when it is directly supported by current code paths, not merely tolerated by the absence of validation.
5. A combination may be canonical for session restore even if it is not the normal fresh-flow path.

## Canonical Valid-Combination Matrix

### Top-Level Workflow Phases

1. `init`
2. `job_analysis`
3. `customization`
4. `rewrite_review`
5. `spell_check`
6. `generation`
7. `layout_review`
8. `refinement`

### Canonical Staged-Generation Phases

1. `idle` via absent or empty `generation_state`
2. `layout_review`
3. `confirmed`
4. `final_complete`

### Canonical Combinations

| Combination Name | Top-Level Phase | Staged Phase | Fresh Flow | Session Restore | Canonical Rationale |
| --- | --- | --- | --- | --- | --- |
| `init_idle` | `init` | `idle` | Yes | Yes | Fresh session default with no job loaded yet. |
| `job_analysis_idle` | `job_analysis` | `idle` | Yes | Yes | Job text is present and analysis has not yet been completed. |
| `customization_idle` | `customization` | `idle` | Yes | Yes | `analyze_job` moves to customization before rewrite review or staged generation starts. |
| `rewrite_review_idle` | `rewrite_review` | `idle` | Yes | Yes | Rewrite review happens before spell check and before staged generation exists. |
| `spell_check_idle` | `spell_check` | `idle` | Yes | Yes | Spell check happens before generation and before preview state exists. |
| `generation_idle` | `generation` | `idle` | Yes | Yes | The workflow can be in generation before preview generation has been requested. |
| `layout_review_idle` | `layout_review` | `idle` | Yes | Yes | `generate_cv` advances to top-level layout review before `/api/cv/generate-preview` populates staged state. |
| `layout_review_active` | `layout_review` | `layout_review` | Yes | Yes | Preview HTML has been generated and layout refinement is available. |
| `layout_review_confirmed` | `layout_review` | `confirmed` | Yes | Yes | `/api/cv/confirm-layout` updates staged state only; top-level phase remains layout review until layout completion advances the main workflow. |
| `refinement_final_complete` | `refinement` | `final_complete` | Yes | Yes | Current staged path confirms layout, generates final outputs, then records layout completion and moves the main workflow to refinement. |
| `refinement_legacy_idle` | `refinement` | `idle` | No | Yes | Supported legacy-compatible restore shape when `/api/layout-complete` has advanced the main workflow without persisted staged-generation artifacts. |

### Notes On Canonical Semantics

1. The frontend declares a staged phase named `preview`, but current backend routes do not persist that value. The effective canonical active-preview state is `layout_review`.
2. `layout_review_confirmed` is canonical because `confirm-layout` changes only `generation_state`, while `layout-complete` changes the top-level workflow phase.
3. `refinement_legacy_idle` is restore-supported rather than fresh-flow-preferred. It remains canonical because current review routes and historical compatibility paths still allow it.

## Non-Canonical And Invalid Combinations

These combinations should be treated as invalid or corruption-oriented fixtures, not canonical matrix nodes:

1. Any pre-layout top-level phase paired with staged `layout_review`, `confirmed`, or `final_complete`
2. Staged `confirmed` without `preview_html`
3. Staged `final_complete` without final output paths and corresponding generated-file entries
4. `layout_confirmed = true` while staged phase is absent or effectively `idle`
5. Any saved session that relies on frontend-only `preview` as the persisted staged phase

These invalid combinations should still be tested later as load-tolerance or normalization cases.

## Concrete Task Breakdown

### Task Group 1: Reusable Saved-Session Fixture Factories

Target files:

1. `tests/helpers/session_state_fixtures.py`
2. `tests/test_session_state_fixtures.py`

Named test cases:

1. `test_materialize_init_idle_session_loads`
2. `test_materialize_layout_review_confirmed_session_loads`
3. `test_materialize_refinement_final_complete_session_loads`
4. `test_invalid_confirmed_requires_explicit_override`

Deliverables:

1. Canonical combination definitions in code
2. In-memory state builders
3. On-disk `session.json` materializers
4. Support for both canonical and intentionally inconsistent fixtures

### Task Group 2: Backend Canonical Matrix Coverage

Target files:

1. `tests/test_conversation_manager.py`
2. `tests/test_staged_generation.py`
3. `tests/test_concurrent_sessions.py`
4. `tests/test_intake_rerun.py`

Named test cases to add:

1. `test_back_to_phase_preserves_state_across_canonical_layout_nodes`
2. `test_re_run_phase_from_generation_idle_preserves_prior_outputs`
3. `test_generation_state_route_normalizes_absent_state_to_idle`
4. `test_load_session_restores_layout_review_idle_combination`
5. `test_load_session_restores_layout_review_active_combination`
6. `test_load_session_restores_layout_review_confirmed_combination`
7. `test_load_session_restores_refinement_final_complete_combination`
8. `test_load_session_restores_refinement_legacy_idle_combination`
9. `test_invalid_prelayout_confirmed_load_is_detected_or_left_explicitly_inconsistent`
10. `test_round_trip_preserves_canonical_generation_state_artifacts`

### Task Group 3: Browser Restore And Resume Coverage

Target files:

1. `tests/ui/test_ui_session.py`
2. `tests/ui/test_ui_generation.py`
3. `tests/ui/conftest.py`
4. `tests/ui/fixtures/mock_responses.py`

Named test cases to add:

1. `test_restore_job_analysis_idle_opens_analysis_tab`
2. `test_restore_customization_idle_opens_customization_workspace`
3. `test_restore_rewrite_review_idle_opens_rewrite_tab`
4. `test_restore_spell_check_idle_opens_spell_tab`
5. `test_restore_generation_idle_opens_generate_tab`
6. `test_restore_layout_review_idle_opens_layout_tab_without_preview_controls_enabled`
7. `test_restore_layout_review_active_shows_preview_state`
8. `test_restore_layout_review_confirmed_enables_final_generation_path`
9. `test_restore_refinement_final_complete_opens_finalise_with_download_artifacts`
10. `test_restore_refinement_legacy_idle_keeps_finalise_access_without_staged_artifacts`

### Task Group 4: Invalid-State Coverage

Target files:

1. `tests/test_staged_generation.py`
2. `tests/test_concurrent_sessions.py`
3. `tests/ui/test_ui_session.py`

Named test cases to add:

1. `test_restore_invalid_prelayout_confirmed_combination`
2. `test_restore_final_complete_without_final_paths`
3. `test_restore_confirmed_without_preview_html`
4. `test_ui_restore_handles_inconsistent_generation_state_gracefully`

## Implementation Order

1. Write and validate reusable saved-session fixture factories.
2. Use those factories to parameterize backend load and transition tests.
3. Extend browser fixtures so the same canonical combinations can drive UI restore tests.
4. Add invalid-state cases only after canonical combinations are green.
5. Run targeted suites first, then broader regression runs.

## Review Notes

Review status after generation:

1. The matrix reflects current code paths rather than intended future cleanup.
2. The document explicitly separates fresh-flow canonical nodes from restore-only legacy-compatible nodes.
3. The main residual risk is that future normalization code may intentionally collapse some legacy-compatible combinations.
