<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# User Story: Accessibility Specialist Perspective
**Persona:** An accessibility specialist evaluating both the software application's workflow accessibility and the accessibility/readability of generated materials
**Scope:** Two linked evaluations: (1) keyboard access, focus behavior, ARIA semantics, modal interaction, form errors, and screen-reader compatibility in the web UI, and (2) accessibility-relevant qualities of generated resume materials such as readability, contrast, and structure
**Format:** Evaluation criteria presented as acceptance tests, with failure modes to guard against, while keeping application-review findings separate from output-review findings

---

## US-X1: Workflow Navigation Accessibility

**As an** accessibility specialist,
**I want to** verify that the primary workflow bar and the stage tabs are fully operable by keyboard and understandable to assistive technologies,
**So that** users can navigate the workflow without relying on a mouse or visual inference.

**Evaluation Criteria:**
1. Workflow-step elements are reachable and operable by keyboard where interaction is supported.
2. Stage tabs expose correct tab semantics, selected state, and panel association.
3. Active and completed states are conveyed by more than colour alone.
4. Changes in active stage or tab are announced or otherwise programmatically determinable.

**Failure Modes to Guard Against:**
- Clickable workflow elements that are not keyboard reachable.
- Tabs styled visually but missing correct `role`, selection state, or panel linkage.
- Status indicated only by colour or position.

**Acceptance Criteria:**
- Keyboard-only users can move through workflow controls in logical order.
- Tabs expose selected/unselected state programmatically.
- Active workflow position is perceivable without colour vision assumptions.

---

## US-X2: Modal and Dialog Accessibility

**As an** accessibility specialist,
**I want to** verify that modal dialogs manage focus correctly and remain usable with screen readers,
**So that** interruptions such as confirmations, alerts, and session dialogs do not trap or disorient users.

**Evaluation Criteria:**
1. Opening a modal moves focus into it.
2. Focus is trapped inside the modal while it is open.
3. Closing a modal restores focus to the triggering control.
4. Dialog title and purpose are programmatically exposed.

**Failure Modes to Guard Against:**
- Modals opening visually while keyboard focus remains behind them.
- Escape or close actions leaving focus lost.
- Multiple dialogs lacking accessible labels.

**Acceptance Criteria:**
- All major dialogs support correct focus entry, trap, and restore behavior.
- Dialog purpose is exposed via labels/headings suitable for assistive tech.

---

## US-X3: Forms, Errors, and Review Controls

**As an** accessibility specialist,
**I want to** verify that form validation, review controls, and inline editing affordances are accessible,
**So that** users can complete the workflow with predictable feedback and without hidden interaction barriers.

**Evaluation Criteria:**
1. Inputs with validation errors expose those errors via accessible associations.
2. Icon-only controls have descriptive labels.
3. Inline edit/review actions have clear focus targets and visible focus states.
4. Error and status messages are exposed in a way that assistive tech can detect.

**Failure Modes to Guard Against:**
- Validation errors shown only visually near an input.
- Reorder or close buttons without labels.
- Focus outline removed without an accessible replacement.

**Acceptance Criteria:**
- Validation and status feedback is available to both visual and non-visual users.
- Review controls remain understandable and operable without pointer interaction.
