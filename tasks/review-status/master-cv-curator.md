<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Master CV Curator Review Status

**Last Updated:** 2026-06-22 ET

**Executive Summary:** Session-boundary enforcement is correct and comprehensive — all 14 write endpoints are phase-gated to `init`/`refinement` only. The Master CV tab provides full CRUD for all data sections including a rich, multi-path publications workflow. Harvest supports fully opt-in, LLM-scored, selective promotion. Five gaps carried from prior cycles remain open: a wrong publication count in the overview stat card (❌), a missing field-validation pass in bulk BibTeX import (⚠️), a confusing 409 error message for phase violations (⚠️), the harvest section not being explicitly labelled optional in the Finalise tab (⚠️), and a summary variant data-format inconsistency between the harvest and CRUD paths (⚠️). No regressions introduced in the Cycle 5/6 commits. One prior gap (Master CV modal focus management) was resolved in Cycle 5.

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

**As a** master CV curator, I want to verify that application-specific edits stay in session scope unless I explicitly promote them, so that my master CV data is not silently altered during customization.

**Criterion 1: The workflow distinguishes session editing from master-data maintenance.**

✅ Pass — The Master CV tab and modal are strictly separate from the per-job customization workflow. The "📚 Master CV" button in the position bar (`web/index.html:99–101`) always launches the Master CV modal, regardless of workflow stage. The governance banner at `web/master-cv.js:87–92` states: "Edits on this tab write directly to `Master_CV_Data.json` and are not scoped to any session. Job-specific customisations (skills, experience picks, summaries) are stored exclusively in the active session and never written here automatically." The `STAGE_TABS` map in `web/ui-core.js:351–363` does not include `master` in any job-workflow stage.

**Criterion 2: The UI does not imply that temporary application edits have already updated the master record.**

✅ Pass — The onboarding modal (`web/index.html:313–385`) explains the three-phase workflow (build master → target job → harvest). The customization tabs (Skills, Experiences, Summary) write only to `conversation.state` in session JSON. No per-job editing surface calls a `/api/master-data/*` write endpoint.

**Criterion 3: Durable write-back occurs only through an explicit user action.**

✅ Pass — `_require_master_data_write_phase` in `scripts/routes/master_data_routes.py:143–155` rejects all write calls outside `init` or `refinement` phase with HTTP 409. This guard is applied at all 14 write call sites (see Phase Enforcement Audit below). The harvest write-back (`POST /api/harvest/apply`) additionally requires `refinement` phase. The harvest confirmation dialog warns: "This will permanently write changes to your Master_CV_Data.json. A backup will be created first." (`web/harvest.js:501`). Harvest checkboxes start unchecked (`web/harvest.js:104–106`, `shouldPreCheck` always returns `false`).

**Acceptance Criteria Outcome:**

- Customization stages behave as session-scoped editing surfaces: ✅ Pass
- Write-back to master data is explicit, staged, and user-controlled: ✅ Pass

**Failure modes:**

| # | Failure mode | Status | Evidence |
|---|-------------|--------|---------|
| F1 | Phase-enforcement 409 triggers the session-conflict amber banner | ⚠️ Partial | The fetch interceptor in `web/ui-core.js:449–466` shows `showSessionConflictBanner()` for all 409 responses except `/api/sessions/claim` and `/api/sessions/takeover`. A phase-enforcement 409 from any master-data endpoint shows "This session is already open in another tab" — semantically wrong and confusing. Open from Cycle 4. |
| F2 | Master CV modal shows CRUD buttons mid-workflow with no indication edits are blocked | ⚠️ Minor | The governance banner (`master-cv.js:87–92`) explains persistence but does not show current phase or explain edits are blocked when a job is active. A mid-workflow user sees all buttons, then receives an unexplained 409 (mis-labelled as a session conflict per F1). Focus trap + restore were added in Cycle 5 (`master-cv.js:2475–2492`), resolving the keyboard accessibility aspect. Phase indication gap remains open. |

---

### US-M2: Harvest Review Quality

**As a** master CV curator, I want to review candidate updates before they are applied to the master CV, so that I can preserve long-term data quality.

**Criterion 1: Harvest candidates are presented in a reviewable form.**

✅ Pass — `web/harvest.js` renders candidates in a grouped, collapsible table with per-candidate checkboxes, recommendation badges (Promote/Skip), confidence tiers (High/Medium/Low), LLM reasoning toggles, and before/after text comparison (`harvest.js:137–186`). Sections expand automatically for high/medium Promote candidates (`harvest.js:110–123`).

**Criterion 2: Each candidate indicates what would be added or changed.**

✅ Pass — Each row shows the type label, source badge (Added vs Confirmed), before text in a muted block, after text in a green-accented block, and a reasoning toggle for LLM analysis (`harvest.js:146–186`). `HARVEST_TYPE_DESCRIPTIONS` provides plain-English descriptions per type at `harvest.js:33–37`.

**Criterion 3: Applying harvested changes is optional and selective.**

✅ Pass — All checkboxes start unchecked (`harvest.js:104–106`). The "Apply Selected" button posts only checked IDs (`harvest.js:488–553`). A confirmation dialog blocks accidental application. A "Skip" path exists in the Finalise tab harvest surface (`finalise.js:301–305`).

**Acceptance Criteria Outcome:**

- The workflow supports selective acceptance of durable updates: ✅ Pass
- The user can understand what is being promoted back into the master record: ✅ Pass

**Failure modes:**

| # | Failure mode | Status | Evidence |
|---|-------------|--------|---------|
| F1 | Two harvest surfaces with different capabilities | ⚠️ Partial | `web/harvest.js` provides full LLM-scored harvest with confidence tiers, reasoning toggles, and re-analyze. `web/finalise.js:208–318` provides a simpler inline table without LLM analysis, confidence scores, or reasoning. Both surfaces exist; there is no UI explanation of which to prefer or how they relate. Open from Cycle 4. |
| F2 | Approved-bullet match key may miss post-review edits | ⚠️ Minor | If the user further edited a proposed bullet after approving it in Rewrites, the harvest key (original proposed text from `approved_rewrites`) may not match the final approved text, resulting in `applied: false` in `diff_summary` with no explanation in the UI (`scripts/routes/generation_routes.py:983–1000`). |

---

### US-M3: Boundary Clarity Across Final Stages

**As a** master CV curator, I want to understand the difference between file finalisation, archive completion, and master-data update, so that I do not confuse application completion with long-term data maintenance.

**Acceptance Criterion: Finalise/archive and harvest/apply appear as distinct steps with distinct consequences.**

⚠️ Partial — The Finalise tab (`web/finalise.js`) archives the application, then reveals the harvest section inline after the archive success banner with only a heading change (`finalise.js:194`). No visual separator, step number, or "Optional" label distinguishes archive completion from master-data promotion. The only signal that harvest is optional is the "Skip" button at `finalise.js:301`. The dedicated Harvest tab (`web/harvest.js`) provides the full LLM-scored experience, but its relationship to the Finalise tab harvest section is not communicated in the UI. No changes to either file in Cycle 5/6.

**Failure modes:**

| # | Failure mode | Status | Evidence |
|---|-------------|--------|---------|
| F1 | Harvest embedded in Finalise tab is not labelled optional | ⚠️ Partial | The intro paragraph at `finalise.js:250–255` says "Select improvements … No items are pre-selected" but does not explicitly label the section as optional or skippable without consequence. Open from Cycle 4. |
| F2 | Two harvest surfaces with different capabilities | ⚠️ Partial | See US-M2 F1. Open from Cycle 4. |
| F3 | Summary variant format inconsistency across harvest vs CRUD paths | ⚠️ Partial | `_harvest_add_summary_variant` appends to a list (`scripts/routes/generation_routes.py:1118–1127`). `master_data_update_summary` converts any existing list to a numeric-keyed dict on the next CRUD edit (`scripts/routes/master_data_routes.py:285–287`). Data is not lost, but the named-variant model is silently corrupted until manually corrected. Open from Cycle 4. |

---

### US-M4: Maintain the Master Publications Bibliography

**As a** master CV curator, I want to add, edit, import, validate, and reorganize entries in `publications.bib` from the Master CV tab, so that my long-lived bibliography stays accurate without manual BibTeX file editing outside the application.

**Criterion 1: Publication editing is clearly presented as master-data maintenance, not per-application customization.**

✅ Pass — The Publications section renders inside `populateMasterTab()` (`web/master-cv.js:161–224`), accessible only from the Master CV modal or tab. The governance banner at `master-cv.js:87–92` applies to the entire Master CV surface including publications.

**Criterion 2: The workflow supports both structured BibTeX editing and easier ingestion paths.**

✅ Pass — Four ingestion paths are present and fully wired:
1. Structured CRUD modal (add/edit/delete individual entries): `showAddPublicationModal()`, `editMasterPublication()`, `deleteMasterPublication()` at `master-cv.js:1434–1560`.
2. Import BibTeX paste: `showImportPublicationsModal()` → `POST /api/master-data/publications/import` (`master-cv.js:1265–1327`).
3. Convert citation text to BibTeX: `showConvertPublicationsModal()` with reviewable before-import preview (`master-cv.js:1329–1430`).
4. Raw BibTeX editor with validate/reload/save: `master-cv.js:196–222`.

**Criterion 3: Saving through the UI preserves bibliography data rather than stripping fields during round-trip editing.**

✅ Pass — Raw editor path is lossless (full text round-trip). Structured CRUD modal preserves `editor` entries via `_pubModalUsesEditorField` flag (`master-cv.js:1457, 1501`). Extra BibTeX fields are surfaced in the "Extra fields" textarea and parsed back on save (`master-cv.js:1508–1517`).

**Acceptance Criteria Detail:**

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Master CV tab shows bibliography in reviewable list with ordering/grouping controls | ✅ Pass | `_renderPublicationsCrudList()` at `master-cv.js:1111–1186` renders a sortable/groupable table with Sort and Group dropdowns. |
| Curator can add, edit, and delete publication entries | ✅ Pass | Full CRUD present; backed by `POST /api/master-data/publication` enforcing required fields. |
| Curator can import raw BibTeX and review validation errors before or during save | ✅ Pass | Import modal with status feedback. `POST /api/master-data/publications/validate` is non-destructive parse. Raw editor "🔍 Validate" button calls this before save. |
| Curator can paste citation text, review generated BibTeX, and decide whether to import | ✅ Pass | Convert Text modal shows input and read-only preview side by side; import is a separate button. |
| Workflow flags missing key fields rather than silently accepting incomplete entries | ✅ (structured) / ⚠️ (bulk import) | Structured add/edit enforces title, year, author/editor (`master_data_routes.py:1337–1342`). Bulk import (`master_data_routes.py:1375–1415`) validates that submitted text parses as BibTeX but does NOT validate required fields per entry — entries missing title/year/author/editor pass through silently. |
| Writes to `publications.bib` occur only from allowed phase windows | ✅ Pass | `PUT /api/master-data/publications` (line 1223), `POST /api/master-data/publication` (line 1302), and `POST /api/master-data/publications/import` (line 1364) all call `_require_master_data_write_phase`. The convert endpoint (`master_data_routes.py:1418–1442`) is LLM-only and writes nothing; no phase gate needed. |
| Round-trip editing preserves existing BibTeX information | ✅ Pass | See Criterion 3 above. |

**Additional finding — overview stat card incorrect publication count:**

❌ Fail — The stat card at `master-cv.js:107` displays `overview.publication_count`. This value comes from `GET /api/master-data/overview` (`master_data_routes.py:214`): `"publication_count": len(data.get('publications', []))`, which reads a `publications` array from `Master_CV_Data.json`. Publications are stored in `publications.bib` and accessed via `orchestrator.publications` (a dict). For any standard BibTeX-only configuration, `data.get('publications', [])` returns `[]` and the stat card shows `0` while the Publications CRUD section correctly shows real entries. The count in the profile card is inconsistent with the actual bibliography. Open from Cycle 2.

---

## Generated Materials Evaluation

The Master CV Curator persona is concerned with source-of-truth data governance and durable write-back, not with generated CV document content. No acceptance criteria in US-M1 through US-M4 target generated document output.

Two generated-materials concerns from the harvest workflow remain open from prior cycles:

| Finding | Status | Evidence |
|---------|--------|---------|
| Harvest may fail to match edited bullets | ⚠️ | If a user edited a proposed bullet after approving it in Rewrites, the harvest key may not match, resulting in silent `applied: false` (`generation_routes.py:983–1000`). |
| Summary variants harvested as a list; CRUD promotes them to a dict | ⚠️ | `_harvest_add_summary_variant` appends to a list (`generation_routes.py:1118–1127`). `master_data_update_summary` converts any list to a numeric-keyed dict on next CRUD edit (`master_data_routes.py:285–287`). Data is not lost but named-variant model is corrupted until manually corrected. |

---

## Phase Enforcement Audit

All master-data write endpoints verified against `_require_master_data_write_phase`. Evidence: `scripts/routes/master_data_routes.py:143–155` defines the gate (allows `init` and `refinement` phases only).

| Endpoint | Phase guard | Allowed phases |
|----------|-------------|---------------|
| `POST /api/master-data/personal-info` (line 454) | ✅ | init, refinement |
| `POST /api/master-data/experience` (line 496) | ✅ | init, refinement |
| `POST /api/master-data/skill` (line 601) | ✅ | init, refinement |
| `POST /api/master-data/education` (line 800) | ✅ | init, refinement |
| `POST /api/master-data/award` (line 879) | ✅ | init, refinement |
| `POST /api/master-data/certification` (line 944) | ✅ | init, refinement |
| `POST /api/master-data/update-achievement` (line 228) | ✅ | init, refinement |
| `POST /api/master-data/update-summary` (line 270) | ✅ | init, refinement |
| `PUT /api/master-data/publications` (line 1223) | ✅ | init, refinement |
| `POST /api/master-data/publication` (line 1302) | ✅ | init, refinement |
| `POST /api/master-data/publications/import` (line 1364) | ✅ | init, refinement |
| `POST /api/master-data/restore` (line 1028) | ✅ | init, refinement |
| `POST /api/harvest/apply` | ✅ | refinement only |
| `GET /api/master-data/full` | — | Read-only (no gate needed) |
| `GET /api/master-data/overview` | — | Read-only |
| `GET /api/master-data/publications` | — | Read-only |
| `POST /api/master-data/publications/validate` | — | Non-destructive parse |
| `POST /api/master-data/publications/convert` | — | LLM only, no file write |

Phase enforcement is complete and consistent across all write endpoints.

---

## Additional Story Gaps / Proposed Story Items

**Gap: Backup history and restore has no UI surface (LOW — open from Cycle 3)**

`GET /api/master-data/history` (`master_data_routes.py:1005–1022`) and `POST /api/master-data/restore` (`master_data_routes.py:1023–1073`) are fully implemented. Every master-data write creates a timestamped backup in a `backups/` subdirectory. There is no UI surface in the Master CV tab to list or restore backups. A curator who accidentally deletes data has no self-service recovery path without CLI access.

Proposed acceptance criterion addition to US-M4: "The curator can view a list of recent backups and restore any prior snapshot from within the Master CV tab."

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/master-cv.js, scripts/routes/master_data_routes.py, web/harvest.js, web/finalise.js

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-M1 | 4 | 1 | 0 | 0 | 0 |
| US-M2 | 3 | 1 | 0 | 0 | 0 |
| US-M3 | 0 | 3 | 0 | 0 | 0 |
| US-M4 | 10 | 2 | 1 | 0 | 0 |

**Key evidence references:**
- US-M1: session isolation → web/master-cv.js:87–92 (governance banner), web/ui-core.js:351–363 (STAGE_TABS excludes master)
- US-M1: write-back gating → scripts/routes/master_data_routes.py:143–155 (_require_master_data_write_phase)
- US-M1 F1: wrong 409 message → web/ui-core.js:449–466 (fetch interceptor, conflict banner on all 409s)
- US-M2: opt-in harvest → web/harvest.js:104–106 (shouldPreCheck always false)
- US-M2: candidate display → web/harvest.js:137–186 (before/after blocks, badges, reasoning)
- US-M2 F1: dual harvest surfaces → web/harvest.js (full LLM) vs web/finalise.js:208–318 (simplified)
- US-M3 F3: summary variant format → scripts/routes/generation_routes.py:1118–1127 (list write) vs scripts/routes/master_data_routes.py:285–287 (list-to-dict conversion)
- US-M4: four ingestion paths → web/master-cv.js:162–224 (Publications section HTML)
- US-M4: required-field enforcement → scripts/routes/master_data_routes.py:1337–1342 (structured) vs :1375–1415 (bulk import, no per-entry check)
- US-M4 ❌: publication count bug → scripts/routes/master_data_routes.py:214 (reads wrong field), web/master-cv.js:107 (displays wrong count)

**Evidence standard:** Every conclusion is independently verifiable from cited source evidence.
