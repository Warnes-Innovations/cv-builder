<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# User Story: Recruiter / Application Operations Perspective
**Persona:** A recruiter-facing or application-operations reviewer focused on both the application workflow that prepares deliverables and the readiness of the generated package itself
**Scope:** Two linked evaluations: (1) whether the application supports reliable package preparation and tracking, and (2) final package review, export confidence, naming, completeness signals, and application-tracking information in the generated materials
**Format:** Evaluation criteria presented as acceptance tests, with failure modes to guard against, while keeping application-review findings separate from output-review findings

---

## US-O1: Submission Readiness Clarity

**As a** recruiter or application-operations reviewer,
**I want to** know when the application package is complete and ready to send,
**So that** the finalisation step represents a trustworthy readiness checkpoint.

**Evaluation Criteria:**
1. Final outputs are clearly visible and distinguishable.
2. The UI makes clear which files are available and current.
3. Finalise/archive actions are clearly separated from earlier preview steps.

**Acceptance Criteria:**
- The final-stage UI supports a confident determination of package readiness.
- The user can identify the current set of deliverables before finalising.

---

## US-O2: Application Metadata and Tracking

**As a** recruiter or application-operations reviewer,
**I want to** capture status and notes in a structured way,
**So that** submission tracking remains organized after files are generated.

**Evaluation Criteria:**
1. Status values are understandable and actionable.
2. Notes are captured at the point of finalisation.
3. Archive behavior preserves the context needed for later follow-up.

**Acceptance Criteria:**
- The finalise flow supports storing practical application-tracking metadata.
- The workflow makes clear when that metadata becomes part of the archived session.

---

## US-O3: File Naming and Package Hygiene

**As a** recruiter or application-operations reviewer,
**I want to** verify that output artifacts are clearly named and grouped,
**So that** files can be managed outside the application without confusion.

**Evaluation Criteria:**
1. Generated files use job-relevant naming.
2. File review surfaces present outputs in a manageable way.
3. Multiple generation passes do not obscure which output is current.

**Acceptance Criteria:**
- Output presentation and naming support practical handling outside the UI.
