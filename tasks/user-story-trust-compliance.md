<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# User Story: Trust and Compliance Perspective
**Persona:** A reviewer focused on approval integrity, content provenance, weak-evidence suggestions, and the user's ability to trust both the workflow and the resulting materials
**Scope:** Two linked evaluations: (1) transparency of AI suggestions, approval boundaries, provenance cues, warnings, and audit-friendly behavior in the UI, and (2) whether the generated materials preserve those trust boundaries visibly and accurately
**Format:** Evaluation criteria presented as acceptance tests, with failure modes to guard against, while keeping application-review findings separate from output-review findings

---

## US-C1: Transparent AI Suggestions

**As a** trust/compliance reviewer,
**I want to** verify that AI-generated suggestions are clearly distinguished from source CV content,
**So that** users understand what was inferred, proposed, or altered by the system.

**Evaluation Criteria:**
1. Proposed rewrites and additions are visibly presented as suggestions.
2. Weak-evidence or confirm-first cases are clearly flagged.
3. The UI does not blur the line between approved output and proposed changes.

**Acceptance Criteria:**
- AI-proposed content is reviewable before acceptance.
- Higher-risk suggestions receive stronger visual signalling.

---

## US-C2: User Approval Integrity

**As a** trust/compliance reviewer,
**I want to** verify that no substantive text enters the final package without an explicit user decision where review is promised,
**So that** the workflow preserves accountable approval boundaries.

**Evaluation Criteria:**
1. Review-required stages block progression until required decisions are made, where specified.
2. Acceptance, rejection, and edit paths remain distinguishable.
3. The UI does not silently auto-accept review items that are expected to be user-controlled.

**Acceptance Criteria:**
- Approval-dependent workflow stages enforce explicit decision-making where the product promises it.

---

## US-C3: Provenance and Audit Cues

**As a** trust/compliance reviewer,
**I want to** verify that the workflow preserves visible cues about what changed and why,
**So that** a user can later understand the basis of the final output.

**Evaluation Criteria:**
1. Diff-like review is available where text is being changed.
2. The UI retains or exposes rationale where the workflow promises rationale.
3. Finalisation and harvest flows remain traceable to reviewed session changes.

**Acceptance Criteria:**
- Users can inspect key changes and their justification before finalisation.
