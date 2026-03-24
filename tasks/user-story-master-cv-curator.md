<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# User Story: Master CV Curator Perspective
**Persona:** A user maintaining the long-lived master CV data and wanting a clear boundary between per-application edits and durable source-of-truth updates
**Scope:** Session-only customization, harvest/apply behavior, master-data boundaries, and user control over durable changes
**Format:** Evaluation criteria presented as acceptance tests, with failure modes to guard against

---

## US-M1: Session-Only Customization Boundary

**As a** master CV curator,
**I want to** verify that application-specific edits stay in session scope unless I explicitly promote them,
**So that** my master CV data is not silently altered during customization.

**Evaluation Criteria:**
1. The workflow distinguishes session editing from master-data maintenance.
2. The UI does not imply that temporary application edits have already updated the master record.
3. Durable write-back occurs only through an explicit user action.

**Acceptance Criteria:**
- Customization stages behave as session-scoped editing surfaces.
- Write-back to master data is explicit, staged, and user-controlled.

---

## US-M2: Harvest Review Quality

**As a** master CV curator,
**I want to** review candidate updates before they are applied to the master CV,
**So that** I can preserve long-term data quality.

**Evaluation Criteria:**
1. Harvest candidates are presented in a reviewable form.
2. Each candidate indicates what would be added or changed.
3. Applying harvested changes is optional and selective.

**Acceptance Criteria:**
- The workflow supports selective acceptance of durable updates.
- The user can understand what is being promoted back into the master record.

---

## US-M3: Boundary Clarity Across Final Stages

**As a** master CV curator,
**I want to** understand the difference between file finalisation, archive completion, and master-data update,
**So that** I do not confuse application completion with long-term data maintenance.

**Acceptance Criteria:**
- Finalise/archive and harvest/apply appear as distinct steps with distinct consequences.
