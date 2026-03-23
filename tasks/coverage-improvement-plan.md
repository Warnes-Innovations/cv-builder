<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Coverage Improvement Plan

**Last Updated:** 2026-03-22 22:16 EDT

**Executive Summary:** Based on the current app-only Python coverage report and the latest Vitest coverage run, the next coverage push should focus on the workflow-control layer first, then the main frontend coordination layer. The five files below give the best mix of low coverage, centrality, and regression-prevention value.

## Contents

- [Priority Order](#priority-order)
- [Execution Order](#execution-order)
- [Deferred Targets](#deferred-targets)

## Priority Order

| Rank | File | Current Coverage | Why It Should Be Next | First Test Slice to Add |
| --- | --- | --- | --- | --- |
| 1 | `scripts/web_app.py` | 50% | Largest request boundary in the app; route, session, and ownership regressions show up here first. | Add focused Flask-client tests for `session_id` enforcement, unclaimed vs claimed ownership, back-to-phase, layout/finalise unhappy paths, and harvest/apply guards. |
| 2 | `scripts/utils/conversation_manager.py` | 41% | Main workflow state machine; a bug here can silently invalidate several stages at once. | Cover phase transitions, rewrite fast-paths, spell-check fast-paths, persistence of accepted decisions, and generation handoff state. |
| 3 | `web/workflow-steps.js` | 31.26% statements | Frontend coordinator for step progression, rerun, back-navigation, and changed-item highlighting. | Add jsdom tests for step-state rendering, rerun confirmation modal behavior, back-navigation prompts, and changed-item highlighting logic. |
| 4 | `scripts/utils/cv_orchestrator.py` | 49% | Core generation pipeline with large branch surface and direct output impact. | Add tests for template payload construction, rewrite/spell application, publication inclusion, output manifest generation, and layout metadata propagation. |
| 5 | `web/job-input.js` | 27.72% statements | Highest-traffic UI entry point; intake regressions block the entire workflow. | Add jsdom tests for paste/file/url intake branches, preview rendering, protected-site fallback UX, and submission gating/validation. |

## Execution Order

1. Start with `scripts/web_app.py` and `scripts/utils/conversation_manager.py` as one backend slice.
   Reason: this gives the fastest regression protection around the API contract and phase state machine.
2. Move to `web/workflow-steps.js` and `web/job-input.js` as one frontend slice.
   Reason: these two files control the most user-visible workflow transitions and entry paths.
3. Finish the pass with `scripts/utils/cv_orchestrator.py`.
   Reason: generation coverage is more mock-heavy, so it is easier to tackle after the boundary tests are already in place.

## Deferred Targets

These are strong follow-on candidates immediately after the top five:

- `web/session-manager.js` at 16.7% statements: lower coverage than `web/job-input.js`, but slightly narrower leverage unless we are actively changing session claim/takeover behavior.
- `web/ats-modals.js` at 0% statements: good compact sixth target, but isolated enough that it should follow the higher-leverage workflow files above.
