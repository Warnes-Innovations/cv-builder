<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# User Story: Power User Perspective
**Persona:** A frequent user processing multiple applications who values speed, low-friction review, and keyboard-efficient interaction
**Scope:** Throughput, bulk actions, session switching, efficient review loops, and minimizing repetitive effort
**Format:** Evaluation criteria presented as acceptance tests, with failure modes to guard against

---

## US-W1: High-Throughput Workflow Efficiency

**As a** power user,
**I want to** move through common review tasks quickly,
**So that** repeated use across many jobs does not become tedious.

**Evaluation Criteria:**
1. Frequent actions are available without excessive pointer travel.
2. Repetitive review work supports efficient sequential progression.
3. Multi-item review screens avoid unnecessary navigation churn.

**Failure Modes to Guard Against:**
- Requiring repeated clicks across distant controls for standard approve/reject flows.
- No efficient path through large review sets.

**Acceptance Criteria:**
- Power users can move through review-heavy stages quickly using the available controls.
- The workflow does not force unnecessary re-orientation between adjacent review tasks.

---

## US-W2: Session Switching and Multi-Application Management

**As a** power user,
**I want to** move between multiple sessions safely and efficiently,
**So that** I can manage several applications in parallel.

**Evaluation Criteria:**
1. Sessions are easy to distinguish in the session-switching UI.
2. Creating, opening, or renaming sessions does not create ambiguity about which one is active.
3. The active session context remains visible while working.

**Acceptance Criteria:**
- Session-switching surfaces support rapid context switching without losing orientation.
- The currently active session remains identifiable throughout the workflow.

---

## US-W3: Efficient Iteration

**As a** power user,
**I want to** revisit and rerun stages with minimal friction,
**So that** refinement loops remain practical instead of costly.

**Evaluation Criteria:**
1. Re-run affordances are discoverable for supported stages.
2. Re-entry into earlier stages preserves useful downstream context.
3. The app minimizes redundant work during iteration.

**Acceptance Criteria:**
- Iterative improvement of an application package is a supported, efficient path.
- The UI does not make reruns feel equivalent to starting over.
