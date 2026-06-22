<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Master CV Curator — Source-First UI Review

**Persona:** master-cv-curator
**Stories reviewed:** US-M1, US-M2, US-M3, US-M4
**Review date:** 2026-06-20
**Cycle:** 5
**Reviewer:** source-first automated review (Claude Sonnet 4.6)

**Source files read:**

- `web/index.html` (720 lines)
- `web/app.js` (140 lines)
- `web/ui-core.js` (2015 lines)
- `web/master-cv.js` (2565 lines)
- `web/harvest.js` (556 lines)
- `web/finalise.js` (395 lines)
- `web/state-manager.js` (580 lines)
- `web/styles.css` (1601 lines)
- `scripts/web_app.py`
- `scripts/routes/master_data_routes.py`
- `scripts/routes/generation_routes.py`
- `scripts/utils/conversation_manager.py`

---

## Cycle 5 Change Summary

Commits since Cycle 4 baseline (`b250dce`) relevant to this persona:

| Commit | Change |
| ------ | ------ |
| `1c05811` | fix(a11y/ux): cycle 4 accessibility and UX fixes (GAP-155–162, D6) |
| `6ad34fa` | fix(persuasion/a11y/ux): summary prompt, content_warnings, step keyboard nav (GAP-163/165/72) |
| `7e9cebd` | fix(tests): resolve 4 pre-existing test failures |
| `4dcb7b9` | test(quality): remove arbitrary, duplicate, and unnecessary tests |
| `a098460` | chore(repo): remove stale command stubs; ignore specstory statistics |

**Change with direct persona impact:** Commit `1c05811` added focus-trap and focus-restore support to the Master CV modal (`openMasterCvModal` / `closeMasterCvModal` in `web/master-cv.js:2475–2492`). Three lines were added:

- `_focusedElementBeforeModal = document.activeElement;` before opening
- `setInitialFocus('master-cv-modal-overlay');` after display
- `trapFocus('master-cv-modal-overlay');` after display
- `restoreFocus();` in close handler

This resolves the keyboard accessibility gap for the Master CV modal. No changes were made to `master_data_routes.py`, `harvest.js`, or `finalise.js`. The five open gaps from Cycle 4 are re-evaluated below; one is now partially resolved.

---

## Executive Summary

Session-boundary enforcement remains correct and unchanged. The Master CV modal now has proper focus management (focus trap + restore). All other open gaps from Cycle 4 carry forward.

**Open findings after Cycle 5:**

1. ❌ Overview stat card shows wrong publication count — reads from `Master_CV_Data.json['publications']` rather than `orchestrator.publications` (BibTeX).
2. ⚠️ Bulk BibTeX import does not validate required fields per entry (GAP-142 open).
3. ⚠️ Phase-enforcement 409 response incorrectly triggers the "session already open in another tab" amber banner.
4. ⚠️ Harvest/archive boundary not formally labelled as optional on the Finalise tab.
5. ⚠️ Two harvest surfaces with different capabilities (`harvest.js` full LLM-scored vs `finalise.js` simplified table).
6. ⚠️ Summary variant harvest writes a list; CRUD promotes them to a dict.

**New in Cycle 5:**
 Master CV modal now has focus trap + restore (keyboard accessibility improvement, `master-cv.js:2475–2492`). This is a partial resolution of the previously noted accessibility minor finding from US-M1 F2.

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

**As a** master CV curator, I want to verify that application-specific edits stay in session scope unless I explicitly promote them, so that my master CV data is not silently altered during customization.

#### US-M1 Acceptance Criteria

**Customization stages behave as session-scoped editing surfaces.**

✅ **Pass** — All per-application editing surfaces (Experiences, Skills, Achievements, Summary, Publications review tabs) write only to session state stored in the active `session.json`. None of these tabs call any `/api/master-data/*` write endpoint. The persistent "📚 Master CV" button in the position bar (`web/index.html:99–101`) opens the Master CV modal which carries a governance banner (`web/master-cv.js:87–92`), not a session-edit surface. The `STAGE_TABS` map in `ui-core.js:351–363` does not include the `master` tab in any session-workflow stage.

**Write-back to master data is explicit, staged, and user-controlled.**

✅ **Pass** — The backend function `_require_master_data_write_phase` (`scripts/routes/master_data_routes.py:143–155`) rejects all `/api/master-data/*` writes that are not in `init` or `refinement` phase with HTTP 409. This guard is applied to all 14 write call sites verified (see Phase Enforcement Audit below). Harvest write-back via `POST /api/harvest/apply` is additionally gated to `refinement` only (`generation_routes.py:1139–1148`). The harvest confirm dialog warns: "This will permanently write changes to your Master_CV_Data.json. A backup will be created first." (`harvest.js:501`).

#### US-M1 Failure Modes

| # | Failure Mode | Status | Evidence |
| --- | ------------- | ------ | -------- |
| F1 | Phase-enforcement 409 triggers the session-conflict amber banner | ⚠️ Partial | The fetch interceptor in `web/ui-core.js:449–466` shows `showSessionConflictBanner()` for all 409 responses except `/api/sessions/claim` and `/api/sessions/takeover`. A phase-enforcement 409 from a master-data endpoint shows "This session is already open in another tab" — semantically wrong and confusing. Unchanged from Cycle 4. |
| F2 | No phase indicator on the master CV modal | ⚠️ Minor — partially improved | The governance banner at `web/master-cv.js:87–92` says edits are "not scoped to any session" but does not show the current phase or explain that edits are blocked when a job is active. **New in Cycle 5:** The Master CV modal now has `trapFocus` and `restoreFocus` (`master-cv.js:2475–2492`), resolving the keyboard accessibility aspect. The phase-indication gap remains: a user who opens the modal mid-workflow sees all CRUD buttons, then gets an unexplained 409 at save time. |

---

### US-M2: Harvest Review Quality

**As a** master CV curator, I want to review candidate updates before they are applied to the master CV, so that I can preserve long-term data quality.

#### US-M2 Acceptance Criteria

**The workflow supports selective acceptance of durable updates.**

✅ **Pass** — `web/harvest.js` provides a fully interactive harvest tab with per-candidate checkboxes (line 157), LLM-scored grouping by type/recommendation/confidence tier, "Apply Selected" button posting only checked IDs (`harvest.js:488–553`), confirmation dialog before write (`harvest.js:498–505`), and backup-path display in success feedback (`harvest.js:525`). Pre-check is explicitly disabled for all candidates (`harvest.js:104–106`, `shouldPreCheck` always returns `false`).

**The user can understand what is being promoted back into the master record.**

✅ **Pass** — Each candidate row shows: type label, before text (muted block), after text (green-accented block), recommendation badge, confidence badge, and an optional reasoning toggle (`harvest.js:137–186`). The `HARVEST_TYPE_DESCRIPTIONS` constant provides plain-English descriptions per type (`harvest.js:33–37`).

#### US-M2 Failure Modes

| # | Failure Mode | Status | Evidence |
| --- | ------------- | ------ | -------- |
| F1 | Two harvest surfaces with different capabilities | ⚠️ | `web/harvest.js` has LLM scoring, confidence tiers, reasoning toggles, re-analyze button. `web/finalise.js:208–318` is a simpler table without LLM analysis, confidence scores, or reasoning toggles. Both exist in the UI with no explanation of which path to prefer. Unchanged from Cycle 4. |
| F2 | Fixed bullet rationale | ⚠️ | All `improved_bullet` candidates receive the same rationale string from `_compile_harvest_candidates` (`generation_routes.py:960`) regardless of the actual improvement content. The "rationale" column in the Finalise tab harvest table is a boilerplate placeholder rather than a real decision aid. Unchanged from Cycle 4. |

---

### US-M3: Boundary Clarity Across Final Stages

**As a** master CV curator, I want to understand the difference between file finalisation, archive completion, and master-data update, so that I do not confuse application completion with long-term data maintenance.

#### US-M3 Acceptance Criteria

**Finalise/archive and harvest/apply appear as distinct steps with distinct consequences.**

⚠️ **Partial** — Two surfaces remain:

1. **Finalise tab** (`web/finalise.js`): Archives the application, then reveals the harvest section inline after success (`finalise.js:194`). The harvest section heading "📥 Update Master CV Data" appears immediately after the archive success banner with no visual separator, step number, or "Optional" label. Only a "Skip" button (`finalise.js:301–305`) hints that the action is optional, but no explanatory text marks it as such.

2. **Harvest tab** (`web/harvest.js`): A dedicated top-level tab providing the full LLM-scored harvest experience. Its relationship to the Finalise tab harvest section is not explained in the UI.

No changes to either `finalise.js` or `harvest.js` in Cycle 5. Status unchanged.

#### US-M3 Failure Modes

| # | Failure Mode | Status | Evidence |
| --- | ------------- | ------ | -------- |
| F1 | Harvest embedded in Finalise is not labelled optional | ⚠️ | `finalise.js:250–255` intro paragraph says "Select improvements … to write back … No items are pre-selected" but does not explicitly say "This step is optional — skip if you don't need to update your master CV." Unchanged from Cycle 4. |
| F2 | Two harvest surfaces with different capabilities | ⚠️ | See US-M2 F1 above. |
| F3 | Summary variant harvest writes a list, CRUD edits a dict | ⚠️ | `_harvest_add_summary_variant` (`generation_routes.py:1118–1127`) appends to a list or creates a list. `master_data_update_summary` (`master_data_routes.py:285–287`) converts existing lists to dicts with numeric keys on the next CRUD edit. The data format silently changes depending on which editing path the curator uses. Unchanged from Cycle 4. |

---

### US-M4: Maintain the Master Publications Bibliography

**As a** master CV curator, I want to add, edit, import, validate, and reorganize entries in `publications.bib` from the Master CV tab, so that my long-lived bibliography stays accurate without manual BibTeX file editing outside the application.

#### Evaluation Criteria

**1. Publication editing is clearly presented as master-data maintenance.**

✅ **Pass** — Publications section renders inside `populateMasterTab()` (`web/master-cv.js:161–224`), accessible only from the Master CV modal or tab. Governance banner at `master-cv.js:87–92` explicitly states the persistence model.

**2. Supports structured BibTeX editing and easier ingestion paths.**

✅ **Pass** — Four ingestion paths present: structured CRUD modal, Import BibTeX (`showImportPublicationsModal()`), Convert Citation Text (`showConvertPublicationsModal()`), Raw BibTeX editor. All four are rendered in `master-cv.js:162–224`.

**3. Round-trip editing preserves bibliography data.**

✅ **Pass** — Both paths pass (unchanged from Cycle 4):

- Raw BibTeX editor path: full-text round-trip, lossless.
- Structured CRUD modal path: GAP-141 fixed in Cycle 3. `_pubModalUsesEditorField` flag preserves editor entries; extra fields pre-populated on edit (`master-cv.js:1469–1474`).

**4. Certifications field verified in GET /api/master-data/full endpoint.**

✅ **Pass** — `scripts/routes/master_data_routes.py:318` explicitly includes `"certifications": master.get('certifications', [])`. `web/master-cv.js:70` reads `const certifications = fullData.certifications || []`. `master-cv.js:248` renders the list via `_renderCertificationsList(certifications)`. The Certifications section is fully functional and backed by the correct endpoint field. Unchanged from Cycle 4.

#### US-M4 Acceptance Criteria

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Master CV tab shows bibliography in reviewable list with ordering/grouping controls | ✅ Pass | `_renderPublicationsCrudList` renders a table with sort and group controls. |
| Curator can add, edit, and delete publication entries from the Master CV management surface | ✅ Pass | All three CRUD operations present: `showAddPublicationModal()` / `editMasterPublication()` / `deleteMasterPublication()` in `master-cv.js`; backed by `POST /api/master-data/publication`. |
| Curator can import raw BibTeX entries and review validation errors before or during save | ✅ Pass | Import modal with status feedback. `POST /api/master-data/publications/validate` is a non-destructive parse. The raw editor "🔍 Validate" button calls this before save. |
| Curator can paste citation text in non-BibTeX form, review the generated BibTeX, and decide whether to import | ✅ Pass | Convert Text modal shows input and read-only preview side by side (`master-cv.js:390–440`). |
| Workflow flags missing key publication fields rather than silently accepting incomplete entries | ✅ Pass (structured) / ⚠️ Partial (bulk import) | `POST /api/master-data/publication` enforces title, year, and author/editor (`master_data_routes.py:1337–1342`). `POST /api/master-data/publications/import` does NOT validate required fields per entry — entries missing title/year/author/editor pass through silently if the BibTeX parses (`master_data_routes.py:1375–1415`). |
| Writes to `publications.bib` occur only from allowed phase windows | ✅ Pass | `PUT /api/master-data/publications` (line 1223), `POST /api/master-data/publication` (line 1302), and `POST /api/master-data/publications/import` (line 1364) all call `_require_master_data_write_phase`. |
| Round-trip editing through the UI preserves existing BibTeX fields | ✅ Pass | Raw editor path: lossless. Structured CRUD modal: editor entries and extra fields preserved since GAP-141 fix in Cycle 3. |
| Certifications included in GET /api/master-data/full response | ✅ Pass | `master_data_routes.py:318`: `"certifications": master.get('certifications', [])`. Read correctly in `master-cv.js:70`. |

**Additional finding — overview stat card incorrect (open from Cycle 2):**

❌ **Fail** — The stat card at `master-cv.js:107` shows `overview.publication_count`. This comes from `GET /api/master-data/overview` (`master_data_routes.py:214`): `"publication_count": len(data.get('publications', []))` — reading a `publications` array inside `Master_CV_Data.json`. Publications live in `publications.bib` and are accessed via `orchestrator.publications`. For any standard BibTeX-only setup, `data.get('publications', [])` returns `[]` and the stat card shows `0` while the Publications CRUD section correctly shows real entries. The stat card and the section are inconsistent. Unchanged from Cycle 4.

---

## Generated Materials Evaluation

The Master CV Curator persona is concerned with source-of-truth data governance and durable write-back, not with judging generated CV document content. No acceptance criteria in US-M1 through US-M4 target generated document content directly.

Two generated-materials concerns from the harvest workflow (unchanged from Cycle 4):

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| Harvest promotes bullets using exact proposed text as match key | ⚠️ | If the user further edited the proposed text after approving in the Rewrites tab, the harvest key (original proposed text from `approved_rewrites`) may not match the final approved version. The mismatch results in `applied: false` in `diff_summary` with no UI explanation (`generation_routes.py:983–1000`). |
| Summary variants harvested as a list; CRUD promotes them to a dict | ⚠️ | `_harvest_add_summary_variant` appends to a list (`generation_routes.py:1118–1127`). `master_data_update_summary` converts any existing list to a numeric-keyed dict on the next CRUD edit (`master_data_routes.py:285–287`). Data is not lost, but the named-variant model is silently corrupted until manually corrected. |

---

## Phase Enforcement Audit

All master-data write endpoints verified against `_require_master_data_write_phase` (unchanged from Cycle 4, all passing):

| Endpoint | Phase guard | Allowed phases |
| -------- | ----------- | -------------- |
| `POST /api/master-data/personal-info` | ✅ | init, refinement |
| `POST /api/master-data/experience` | ✅ | init, refinement |
| `POST /api/master-data/skill` | ✅ | init, refinement |
| `POST /api/master-data/education` | ✅ | init, refinement |
| `POST /api/master-data/award` | ✅ | init, refinement |
| `POST /api/master-data/certification` | ✅ | init, refinement |
| `POST /api/master-data/update-achievement` | ✅ | init, refinement |
| `POST /api/master-data/update-summary` | ✅ | init, refinement |
| `PUT /api/master-data/publications` | ✅ | init, refinement |
| `POST /api/master-data/publication` | ✅ | init, refinement |
| `POST /api/master-data/publications/import` | ✅ | init, refinement |
| `POST /api/master-data/restore` | ✅ | init, refinement |
| `POST /api/harvest/apply` | ✅ | refinement only |
| `GET /api/master-data/full` | — | Read-only (no phase gate needed) |
| `GET /api/master-data/overview` | — | Read-only |
| `GET /api/master-data/publications` | — | Read-only |
| `POST /api/master-data/publications/validate` | — | Non-destructive parse |
| `POST /api/master-data/publications/convert` | — | LLM only, no file write |

Phase enforcement is complete and consistent across all write endpoints.

---

## Open Gaps (Cycle 5 Status)

### Gap 1 — Overview Stat Card Shows Wrong Publication Count (HIGH) — OPEN

`GET /api/master-data/overview` (`master_data_routes.py:214`) reads `len(data.get('publications', []))` from the master JSON, but publications live in `publications.bib`. Standard setups show `0` in the stat card while the Publications section shows the real count.

**Fix:** Change `master_data_overview` to return `len(orchestrator.publications or {})` instead of `len(data.get('publications', []))`.

### Gap 2 — Bulk BibTeX Import Accepts Entries Missing Required Fields (MEDIUM) — OPEN (GAP-142)

`POST /api/master-data/publications/import` validates that the submitted text parses as BibTeX, but does not validate required fields (title, year, author/editor) per entry before saving. The structured add/edit modal enforces these fields, creating an inconsistent data-quality story.

**Fix:** After parsing in `master_data_import_publications`, iterate over imported entries and collect entries missing title, year, or author/editor; return them in the response as warnings (or reject outright) before or instead of saving.

### Gap 3 — Phase-Enforcement 409 Triggers Session-Conflict Banner (LOW) — OPEN

The fetch interceptor in `web/ui-core.js:449–466` shows the session-conflict amber banner for all 409 responses except session claim/takeover endpoints. A phase-enforcement 409 from any master-data endpoint displays "This session is already open in another tab" — a false and confusing message.

**Fix:** Inspect the JSON response body before showing the conflict banner; show a "Editing not available while a job is active" inline error for master-data 409s rather than the session-conflict banner.

### Gap 4 — Harvest/Archive Boundary Not Formally Labelled as Optional on Finalise Tab (LOW) — OPEN

The harvest section in `finalise.js:208–318` appends inline after the archive success banner with only a heading change. The optional nature of harvest is not explicitly stated in the UI. The "Skip" button at `finalise.js:301` provides escape but no framing.

**Fix:** Add a visible "Optional: Update Master CV" subheading with a one-sentence explanation that this step can be skipped, above the harvest table in `showHarvestSection()`. Consider also adding a visible step number (e.g., "Step 2 of 2 (optional)").

### Gap 5 — Backup History and Restore Has No UI Surface (LOW) — OPEN

`GET /api/master-data/history` (`master_data_routes.py:1005–1022`) and `POST /api/master-data/restore` (`master_data_routes.py:1023–1073`) are fully implemented. Every master-data write creates a timestamped backup. There is no UI surface in the Master CV tab to list or restore backups. A curator who accidentally deletes data has no self-service recovery path without CLI access.

**Proposed story:** As a master CV curator, I want to view the backup history and restore a previous snapshot from the Master CV tab, so that I can recover from accidental data loss without leaving the application.

### Gap 6 — Summary Variant Format Inconsistency (LOW) — OPEN

`_harvest_add_summary_variant` appends to a list (`generation_routes.py:1118–1127`). `master_data_update_summary` converts any existing list to a numeric-keyed dict on the next CRUD edit (`master_data_routes.py:285–287`). The mismatch is silent and data is not lost, but the named-variant model is corrupted until manually corrected.

**Fix:** Either (a) make `_harvest_add_summary_variant` write a dict entry using a generated key (e.g., `harvest_<timestamp>`), or (b) make `master_data_update_summary` preserve existing list items as dict entries when it encounters a list format.

---

## Additional Story Gaps / Proposed Story Items

No new story gaps identified in Cycle 5. The proposals from Cycle 3/4 remain:

- **Proposed story (Gap 5):** Master CV backup history and restore UI surface.
- **Proposed acceptance criterion addition to US-M4:** "The curator can view a list of recent backups and restore any prior snapshot from within the Master CV tab."

---

## Evidence Summary

| File | Key Reference | Finding |
| ---- | ------------- | ------- |
| `scripts/routes/master_data_routes.py:143–155` | `_require_master_data_write_phase` | Phase gate applies to all 12 write endpoints |
| `scripts/routes/master_data_routes.py:318` | `"certifications": master.get('certifications', [])` | Certifications IS included in /api/master-data/full |
| `web/master-cv.js:70` | `const certifications = fullData.certifications \|\| []` | Client reads certifications correctly |
| `web/master-cv.js:248` | `_renderCertificationsList(certifications)` | Certifications rendered to DOM |
| `scripts/routes/master_data_routes.py:214` | `"publication_count": len(data.get('publications', []))` | Stat card count bug — reads wrong field |
| `web/master-cv.js:107` | `overview.publication_count` | Stat card displays the wrong count |
| `scripts/routes/master_data_routes.py:1337–1342` | title/year/author/editor enforcement | Structured publication add/edit validates required fields |
| `scripts/routes/master_data_routes.py:1375–1415` | bulk import — no per-entry validation | GAP-142: bulk import skips required-field validation |
| `web/ui-core.js:449–466` | fetch interceptor showing conflict banner on 409 | Gap 3: all non-session 409s show wrong error |
| `scripts/routes/generation_routes.py:1118–1127` | `_harvest_add_summary_variant` writes list | Gap 6: format mismatch with CRUD dict |
| `scripts/routes/master_data_routes.py:285–287` | list-to-dict conversion in `master_data_update_summary` | Gap 6: CRUD path silently changes format |
| `web/harvest.js:33–48` | `HARVEST_TYPE_CONFIG`, `HARVEST_TYPE_DESCRIPTIONS` | Full LLM-scored harvest with confidence tiers |
| `web/harvest.js:104–106` | `shouldPreCheck` always returns `false` | Master CV updates are opt-in — no pre-selection |
| `web/finalise.js:208–318` | `showHarvestSection()` | Simplified harvest table, no LLM analysis |
| `web/finalise.js:301` | Skip button | Only signal that harvest is optional |
| `web/master-cv.js:87–92` | governance banner | Correct session vs master distinction communicated |
| `web/master-cv.js:2475–2492` | `openMasterCvModal` / `closeMasterCvModal` | **NEW Cycle 5:** Focus trap and restore added for Master CV modal |

---

## Scorecard

| Story | Criterion | Cycle 4 | Cycle 5 | Change |
| ----- | --------- | ------- | ------- | ------ |
| US-M1 | Customization stages are session-scoped | ✅ | ✅ | — |
| US-M1 | UI does not imply silent master writes | ✅ | ✅ | — |
| US-M1 | Write-back is explicit and user-controlled | ✅ | ✅ | — |
| US-M1 | Phase-enforcement 409 shows wrong error message | ⚠️ | ⚠️ | — |
| US-M1 | Master CV modal keyboard accessibility (focus trap) | ⚠️ | ✅ | **Fixed** (`master-cv.js:2475–2492`) |
| US-M2 | Harvest candidates presented in reviewable form | ✅ | ✅ | — |
| US-M2 | Each candidate shows what changes | ✅ | ✅ | — |
| US-M2 | Applying is optional and selective | ✅ | ✅ | — |
| US-M2 | Two harvest surfaces with different capabilities | ⚠️ | ⚠️ | — |
| US-M3 | Archive and harvest are distinct steps with distinct consequences | ⚠️ | ⚠️ | — |
| US-M3 | Harvest labelled as optional | ⚠️ | ⚠️ | — |
| US-M3 | Summary variant format inconsistency | ⚠️ | ⚠️ | — |
| US-M4 | Publication editing presented as master-data maintenance | ✅ | ✅ | — |
| US-M4 | Multiple ingestion paths (CRUD, Import, Convert, Raw) | ✅ | ✅ | — |
| US-M4 | List with ordering and grouping controls | ✅ | ✅ | — |
| US-M4 | Add/edit/delete entries via CRUD modal | ✅ | ✅ | — |
| US-M4 | Import with parse validation before save | ✅ | ✅ | — |
| US-M4 | Citation-text conversion with reviewable preview | ✅ | ✅ | — |
| US-M4 | Required-field flagging on structured add/edit | ✅ | ✅ | — |
| US-M4 | Required-field flagging on bulk import | ⚠️ | ⚠️ | — |
| US-M4 | Writes only in allowed phase windows | ✅ | ✅ | — |
| US-M4 | Round-trip preserves all BibTeX fields | ✅ | ✅ | — |
| US-M4 | Certifications included in /api/master-data/full | ✅ | ✅ | — |
| US-M4 | Overview stat card publication count | ❌ | ❌ | — |

**Summary counts (Cycle 5):**

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | Change from Cycle 4 |
| ----- | ------- | --------- | ------ | ------------------- |
| US-M1 | 4 | 1 | 0 | +1 pass (focus trap fixed) |
| US-M2 | 3 | 1 | 0 | — |
| US-M3 | 0 | 3 | 0 | — |
| US-M4 | 10 | 2 | 1 | — |

One new pass. No regressions. Five remaining open gaps, all carried from Cycle 4.
