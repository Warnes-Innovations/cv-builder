<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# User Story: Returning User Perspective
**Persona:** A user returning to an existing session after interruption, context-switching, or a prior incomplete run
**Scope:** Session restoration, resumption clarity, state continuity, and confidence in what has already been completed
**Format:** Evaluation criteria presented as acceptance tests, with failure modes to guard against

---

## US-S1: Resume With Context

**As a** returning user,
**I want to** resume a saved session with immediate context about where I am,
**So that** I can continue work without reconstructing what happened earlier.

**Evaluation Criteria:**
1. The restored session identifies the job or application context clearly.
2. The UI indicates the current stage and available next actions.
3. Previously completed work remains visible or discoverable without hunting through unrelated screens.

**Failure Modes to Guard Against:**
- Returning users seeing a generic blank or default view.
- Prior decisions existing in state but not being surfaced clearly.

**Acceptance Criteria:**
- A resumed session communicates current stage and application context immediately.
- The user can tell what has already been completed versus what remains.

---

## US-S2: Safe Re-entry and Backtracking

**As a** returning user,
**I want to** revisit earlier stages without fear of accidental data loss,
**So that** I can revise decisions confidently after time away.

**Evaluation Criteria:**
1. Back-navigation behavior is explicit about downstream consequences.
2. Re-entry into earlier phases preserves prior context where intended.
3. The UI distinguishes between navigating back and rerunning/recomputing outputs.

**Failure Modes to Guard Against:**
- Users unintentionally overwriting downstream work by revisiting a stage.
- Re-run behavior being visually indistinguishable from simple navigation.

**Acceptance Criteria:**
- Returning users receive sufficient warning before downstream state changes.
- The distinction between re-entry and recomputation is understandable in the UI.

---

## US-S3: Trustworthy Session Continuity

**As a** returning user,
**I want to** trust that my accepted rewrites, customisations, and review decisions remain intact,
**So that** I do not need to repeat work after an interruption.

**Evaluation Criteria:**
1. Saved decisions can be re-observed when their stage is revisited.
2. Generated or previewed outputs remain logically connected to the current session state.
3. Session restoration does not mislead the user about what version is current.

**Acceptance Criteria:**
- Previously saved work is recoverable and legible on return.
- Current-versus-earlier outputs are distinguishable when multiple workflow passes have occurred.
