<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Master CV Curator — Source-First UI Review

**Persona:** master-cv-curator
**Stories reviewed:** US-M1, US-M2, US-M3, US-M4
**Review date:** 2026-06-18
**Cycle:** 3
**Reviewer:** source-first automated review (Claude Sonnet 4.6)

**Source files read:**

- `web/index.html` (712 lines)
- `web/app.js` (140 lines)
- `web/ui-core.js` (1988 lines)
- `web/master-cv.js` (2561 lines)
- `web/state-manager.js` (580 lines)
- `web/styles.css` (1601 lines)
- `scripts/web_app.py`
- `scripts/routes/master_data_routes.py`
- `scripts/utils/conversation_manager.py`

---

## Cycle 3 Change Summary

**Commit `967dc56`** (fix(data): resolve GAP-141 — BibTeX editor field preserved on modal save) is the primary change reviewed in this cycle.

### GAP-141 Verification: editor→author Conversion Bug — FIXED

All five required implementation points verified against `web/master-cv.js`:

| Check | Line(s) | Result |
| ----- | ------- | ------ |
| `_pubModalUsesEditorField` flag declared | `master-cv.js:995` | ✅ `let _pubModalUsesEditorField = false;` |
| `editMasterPublication()` sets flag when entry has `editor` but no `author` | `master-cv.js:1457` | ✅ `_pubModalUsesEditorField = !fields.author && !!fields.editor;` |
| `editMasterPublication()` updates label text | `master-cv.js:1462–1463` | ✅ `authorLabel.textContent = _pubModalUsesEditorField ? 'Editor(s)' : 'Author(s)';` |
| Label element has `id="pub-modal-author-label"` | `master-cv.js:317` | ✅ `<label id="pub-modal-author-label" for="pub-modal-author" ...>` |
| `saveMasterPublication()` uses `fields.editor` when flag is true | `master-cv.js:1501` | ✅ `const fields = _pubModalUsesEditorField ? { editor: author, title, year } : { author, title, year };` |
| `showAddPublicationModal()` resets the flag | `master-cv.js:1435` | ✅ `_pubModalUsesEditorField = false;` |
| `showAddPublicationModal()` resets label to "Author(s)" | `master-cv.js:1439–1440` | ✅ `if (authorLabel) authorLabel.textContent = 'Author(s)';` |

**GAP-141 is fully resolved.** The US-M4 round-trip criterion that was previously ⚠️ Partial for the CRUD modal now passes.

Additional bonus: `editMasterPublication()` now populates extra fields in the textarea (`master-cv.js:1469–1474`) — filtering out known fields (`author`, `editor`, `title`, `year`, `journal`, `booktitle`, `doi`) and serializing remaining fields as `key=value` lines. The Cycle 2 concern about extra-fields pre-population not being confirmed is now resolved.

### GAP-142 Verification: Bulk BibTeX Import Validation — Still Open

`POST /api/master-data/publications/import` (`master_data_routes.py:1359–1416`) still does not validate required fields per entry. After parsing (`bibtex_text_to_publications`), entries are merged directly into `pubs` without checking for missing title, year, or author/editor fields. The structured CRUD endpoint (`POST /api/master-data/publication`, lines 1337–1342) does enforce these checks but the bulk import path does not.

**GAP-142 status: open.**

---

## Executive Summary

The session-boundary contract is strongly enforced end-to-end. The GAP-141 editor→author conversion bug is fixed in Cycle 3, promoting the US-M4 round-trip criterion to a full pass. The GAP-142 bulk import validation gap remains open. All other findings from Cycle 2 are unchanged.

**Open findings after Cycle 3:**

1. ❌ The overview stat card reads `publication_count` from `Master_CV_Data.json` (`master_data_routes.py:214`), not from `publications.bib` — shows 0 on any BibTeX-only setup while the Publications section below shows real entries.
2. ⚠️ Bulk BibTeX import does not validate required fields per entry — entries missing title/year/author/editor are silently accepted (GAP-142).
3. ⚠️ Phase-enforcement 409 response incorrectly triggers the "session already open in another tab" amber banner.
4. ⚠️ The Finalise/Archive and Harvest steps appear inline on the same page without a formal step divider signalling that harvest is optional.
5. ⚠️ Two harvest surfaces with different capabilities (full LLM-scored in `harvest.js`; simplified table in `finalise.js`).

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

**As a** master CV curator, I want to verify that application-specific edits stay in session scope unless I explicitly promote them, so that my master CV data is not silently altered during customization.

#### Acceptance Criteria

**Customization stages behave as session-scoped editing surfaces.**

✅ **Pass** — All per-application editing surfaces (Experiences, Skills, Achievements, Summary, Publications review tabs) write only to session state stored in the active `session.json`. None of these tabs call any `/api/master-data/*` write endpoint. The `STAGE_TABS` map in `web/ui-core.js` controls which tabs are visible per stage. A persistent "📚 Master CV" button in the position bar (`web/index.html:99–101`) opens the Master CV modal — this surface carries the governance banner, not a session-edit surface.

**Write-back to master data is explicit, staged, and user-controlled.**

✅ **Pass** — The backend function `_require_master_data_write_phase` (`scripts/routes/master_data_routes.py:143–155`) rejects all `/api/master-data/*` writes that are not in `init` or `refinement` phase with HTTP 409. This guard is applied to every write endpoint (14 call sites verified). Harvest write-back via `POST /api/harvest/apply` is additionally gated to `refinement` only. The harvest confirm dialog explicitly warns: "This will permanently write changes to your Master_CV_Data.json."

**Failure modes:**

| # | Failure Mode | Status | Evidence |
| --- | -------------- | ------ | -------- |
| F1 | Phase-enforcement 409 triggers the session-conflict amber banner | ⚠️ Partial | The fetch interceptor in `web/ui-core.js:449–466` shows `showSessionConflictBanner()` for all 409 responses except `/api/sessions/claim` and `/api/sessions/takeover`. A phase-enforcement 409 from a master-data endpoint shows "This session is already open in another tab" — semantically wrong. |
| F2 | No phase indicator on the master CV modal | ⚠️ Minor | The governance banner at `web/master-cv.js:87–92` says edits are "not scoped to any session" but does not show the current phase or explain that edits are blocked when a job is active. A user who opens the modal mid-workflow sees all CRUD buttons, then gets an unexplained 409 at save time. |

---

### US-M2: Harvest Review Quality

**As a** master CV curator, I want to review candidate updates before they are applied to the master CV, so that I can preserve long-term data quality.

#### Acceptance Criteria

**The workflow supports selective acceptance of durable updates.**

✅ **Pass** — `web/harvest.js` provides a fully interactive harvest tab with per-candidate checkboxes, LLM-scored grouping by type/recommendation/confidence tier, "Apply Selected" button posting only checked IDs, confirmation dialog before write, and backup-path display in success feedback.

**The user can understand what is being promoted back into the master record.**

✅ **Pass** — Each candidate row shows: type label, before text (muted block), after text (green-accented block), recommendation badge, confidence badge, and an optional reasoning toggle. The `HARVEST_TYPE_DESCRIPTIONS` constant provides plain-English descriptions.

**Failure modes:**

| # | Failure Mode | Status | Evidence |
| --- | -------------- | ------ | -------- |
| F1 | Two harvest surfaces with different capabilities | ⚠️ | `web/harvest.js` has LLM scoring, confidence tiers, reasoning toggles, re-analyze button. `web/finalise.js` harvest section is a simpler table without LLM analysis. Both exist in the UI with no explanation of which path to use. |
| F2 | Fixed bullet rationale | ⚠️ | All `improved_bullet` candidates receive the same rationale string from `_compile_harvest_candidates` regardless of the actual improvement content. The "rationale" column is a placeholder rather than a decision aid. |

---

### US-M3: Boundary Clarity Across Final Stages

**As a** master CV curator, I want to understand the difference between file finalisation, archive completion, and master-data update, so that I do not confuse application completion with long-term data maintenance.

#### Acceptance Criteria

**Finalise/archive and harvest/apply appear as distinct steps with distinct consequences.**

⚠️ **Partial** — Two surfaces exist:

1. **Finalise tab** (`web/finalise.js`): Archives the application, then reveals the harvest section inline after success (`finalise.js:161 showHarvestSection()`). The harvest section has a "Skip" button but no formal "Optional Step 2" label. The heading "📥 Update Master CV Data" appears right below the archive success banner with no visual separator or step-number.

2. **Harvest tab** (`web/harvest.js`): A dedicated top-level tab providing the full LLM-scored harvest experience. Its relationship to the Finalise tab harvest section is not explained in the UI.

**Failure modes:**

| # | Failure Mode | Status | Evidence |
| --- | -------------- | ------ | -------- |
| F1 | Harvest embedded in Finalise is not labelled optional | ⚠️ | `finalise.js:301–305` provides a "Skip" button, but there is no introductory text marking harvest as "Optional step — skip if you don't need to update your master CV." |
| F2 | Two harvest surfaces with different capabilities | ⚠️ | See US-M2 F1 above. |
| F3 | Summary variant harvest writes a list, CRUD edits a dict | ⚠️ | `_harvest_add_summary_variant` appends to a list. `master_data_update_summary` (`master_data_routes.py:265–300`) converts existing lists to dicts with numeric keys on next CRUD edit. The data format silently changes depending on which editing path the curator uses. |

---

### US-M4: Maintain the Master Publications Bibliography

**As a** master CV curator, I want to add, edit, import, validate, and reorganize entries in `publications.bib` from the Master CV tab, so that my long-lived bibliography stays accurate without manual BibTeX file editing outside the application.

#### Evaluation Criteria

**1. Publication editing is clearly presented as master-data maintenance, not per-application customization.**

✅ **Pass** — The Publications section is rendered inside `populateMasterTab()` in `web/master-cv.js`, reachable only from the Master CV modal or tab. The governance banner at `master-cv.js:87–92` explicitly states the persistence model.

**2. Supports structured BibTeX editing and easier ingestion paths (paste/import and citation-text conversion).**

✅ **Pass** — Four ingestion paths implemented: structured CRUD modal, Import BibTeX, Convert Citation Text, Raw BibTeX editor.

**3. Saving through the UI preserves bibliography data rather than stripping fields during round-trip editing.**

✅ **Pass** (Cycle 3 upgrade from ⚠️ Partial) — Both paths now pass:

- **Raw BibTeX editor path**: Full-text round-trip, lossless. Unchanged from Cycle 2.
- **Structured CRUD modal path**: GAP-141 is fixed. `editMasterPublication()` now sets `_pubModalUsesEditorField = !fields.author && !!fields.editor` at `master-cv.js:1457`; `saveMasterPublication()` uses `{ editor: author, title, year }` when the flag is true at `master-cv.js:1501`. Extra fields are now pre-populated in the textarea (`master-cv.js:1469–1474`) — filtering known fields and serializing remaining ones as `key=value` lines.

#### Acceptance Criteria

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Master CV tab shows bibliography in reviewable list with ordering/grouping controls | ✅ Pass | `_renderPublicationsCrudList` (`master-cv.js:1109–1184`) renders a table with sort (year newest/oldest, type A–Z/Z–A) and group (none, by year, by type) controls. |
| Curator can add, edit, and delete publication entries from the Master CV management surface | ✅ Pass | All three CRUD operations present: `showAddPublicationModal()` / `editMasterPublication()` / `deleteMasterPublication()` in `master-cv.js`; backed by `POST /api/master-data/publication`. |
| Curator can import raw BibTeX entries and review validation errors before or during save | ✅ Pass | Import modal with status feedback. `POST /api/master-data/publications/validate` is a non-destructive parse. The raw editor "🔍 Validate" button calls this before save. |
| Curator can paste citation text in non-BibTeX form, review the generated BibTeX, and decide whether to import | ✅ Pass | Convert Text modal shows input and read-only preview side by side. "Generate BibTeX" and "Import Preview" are separate explicit steps. |
| Workflow flags missing key publication fields rather than silently accepting incomplete entries | ✅ Pass (structured) / ⚠️ Partial (bulk import) | `POST /api/master-data/publication` enforces title, year, and author/editor (`master_data_routes.py:1337–1342`). `POST /api/master-data/publications/import` does NOT validate required fields per entry — entries missing title/year/author/editor pass through silently if the BibTeX parses (`master_data_routes.py:1375–1415`). |
| Writes to `publications.bib` occur only from init and refinement phase windows | ✅ Pass | `PUT /api/master-data/publications` (line 1220), `POST /api/master-data/publication` (line 1300), and `POST /api/master-data/publications/import` (line 1362) all call `_require_master_data_write_phase`. The convert endpoint correctly omits the phase check as it performs no write. |
| Round-trip editing through the UI preserves existing BibTeX fields | ✅ Pass | Raw editor path: lossless. Structured CRUD modal: GAP-141 fixed — editor entries preserved; extra fields pre-populated in textarea on edit. |

**Additional finding — overview stat card incorrect (open from Cycle 2):**

❌ **Fail** — The stat card at `master-cv.js:107` shows `overview.publication_count`. This count comes from `GET /api/master-data/overview` (`master_data_routes.py:214`) which reads `len(data.get('publications', []))` — i.e., the `publications` key inside `Master_CV_Data.json`. Publications live in `publications.bib` and are accessed via `orchestrator.publications`. For any BibTeX-only setup (standard configuration), `data.get('publications', [])` returns `[]` and the stat card shows `0` while the Publications CRUD section correctly shows real entries. The stat card and the section are inconsistent.

---

## Generated Materials Evaluation

The Master CV Curator persona is concerned with source-of-truth data governance and durable write-back, not with judging generated CV document content. No acceptance criteria in US-M1 through US-M4 target generated document content.

Two generated-materials concerns from the harvest workflow (unchanged from Cycle 2):

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| Harvest promotes bullets approved in Rewrites step — match uses exact proposed text as key | ⚠️ | If the user further edited the proposed text in the Rewrites tab before approving, the harvest key (original proposed text) may not match the final approved version. The mismatch results in `applied: false` in `diff_summary` with no UI explanation. |
| Summary variants harvested as a list; CRUD promotes them to a dict | ⚠️ | `_harvest_add_summary_variant` appends to a list. `master_data_update_summary` (`master_data_routes.py:265–300`) converts any existing list to a numeric-keyed dict on the next CRUD edit. Data is not lost, but the named-variant model is corrupted until manually corrected. |

---

## Phase Enforcement Audit

All master-data write endpoints verified against `_require_master_data_write_phase` (unchanged from Cycle 2, all passing):

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
| `GET /api/master-data/full` | — | Read-only |
| `GET /api/master-data/overview` | — | Read-only |
| `GET /api/master-data/publications` | — | Read-only |
| `POST /api/master-data/publications/validate` | — | Non-destructive parse |
| `POST /api/master-data/publications/convert` | — | LLM only, no file write |

Phase enforcement is complete and consistent across all write endpoints.

---

## Open Gaps (Cycle 3 Status)

### Gap 1 — Overview Stat Card Shows Wrong Publication Count (HIGH) — OPEN

`GET /api/master-data/overview` (`master_data_routes.py:214`) reads `len(data.get('publications', []))` from the master JSON, but publications live in `publications.bib`. Standard setups show `0` in the stat card while the Publications section shows the real count.

**Fix:** Change `master_data_overview` to return `len(orchestrator.publications or {})` instead of `len(data.get('publications', []))`.

### Gap 2 — Bulk BibTeX Import Accepts Entries Missing Required Fields (MEDIUM) — OPEN (GAP-142)

`POST /api/master-data/publications/import` validates that the submitted text parses, but does not validate required fields (title, year, author/editor) per entry before saving. The structured add/edit modal enforces these fields, creating an inconsistent data-quality story.

**Fix:** After parsing in `master_data_import_publications`, iterate over imported entries and collect entries missing title, year, or author/editor; return them in the response as warnings before or instead of saving.

### Gap 3 — Phase-Enforcement 409 Triggers Session-Conflict Banner (LOW) — OPEN

The fetch interceptor in `web/ui-core.js:461` shows the session-conflict amber banner for all 409 responses except session claim/takeover endpoints. A phase-enforcement 409 from any master-data endpoint displays "This session is already open in another tab" — a false message.

**Fix:** Inspect the JSON response body before showing the conflict banner; show a "Editing not available while a job is active" inline error for master-data 409s.

### Gap 4 — Harvest/Archive Boundary Not Formally Labelled on Finalise Tab (LOW) — OPEN

The harvest section in `finalise.js` appends inline after the archive success banner with only a heading change. The optional nature of harvest is not explicitly stated in the UI.

**Fix:** Add a visible "Optional: Update Master CV" subheading with a one-sentence explanation that this step can be skipped, above the harvest table in `showHarvestSection()`.

### Gap 5 — Backup History and Restore Has No UI Surface (LOW) — OPEN

`GET /api/master-data/history` and `POST /api/master-data/restore` are fully implemented. Every master-data write creates a timestamped backup. There is no UI surface in the Master CV tab to list or restore backups. A curator who accidentally deletes data has no self-service recovery path without CLI access.

**Proposed story:** As a master CV curator, I want to view the backup history and restore a previous snapshot from the Master CV tab, so that I can recover from accidental data loss without leaving the application.

### Gap 6 — Summary Variant Format Inconsistency (LOW) — OPEN

`_harvest_add_summary_variant` appends to a list. `master_data_update_summary` converts any existing list to a numeric-keyed dict on the next CRUD edit. The mismatch is silent and data is not lost, but the named-variant model is corrupted until manually corrected.

---

## Scorecard

| Story | Criterion | Status |
| ----- | --------- | ------ |
| US-M1 | Customization stages are session-scoped | ✅ Pass |
| US-M1 | UI does not imply silent master writes | ✅ Pass |
| US-M1 | Write-back is explicit and user-controlled | ✅ Pass |
| US-M1 | Phase-enforcement 409 shows wrong error message | ⚠️ Partial |
| US-M2 | Harvest candidates presented in reviewable form | ✅ Pass |
| US-M2 | Each candidate shows what changes | ✅ Pass |
| US-M2 | Applying is optional and selective | ✅ Pass |
| US-M2 | Two harvest surfaces with different capabilities | ⚠️ Partial |
| US-M3 | Archive and harvest are distinct steps with distinct consequences | ⚠️ Partial |
| US-M3 | Harvest labelled as optional | ⚠️ Partial |
| US-M3 | Summary variant format inconsistency | ⚠️ Partial |
| US-M4 | Publication editing presented as master-data maintenance | ✅ Pass |
| US-M4 | Multiple ingestion paths (CRUD, Import, Convert, Raw) | ✅ Pass |
| US-M4 | List with ordering and grouping controls | ✅ Pass |
| US-M4 | Add/edit/delete entries via CRUD modal | ✅ Pass |
| US-M4 | Import with parse validation before save | ✅ Pass |
| US-M4 | Citation-text conversion with reviewable preview | ✅ Pass |
| US-M4 | Required-field flagging on structured add/edit | ✅ Pass |
| US-M4 | Required-field flagging on bulk import | ⚠️ Partial |
| US-M4 | Writes only in allowed phase windows | ✅ Pass |
| US-M4 | Round-trip preserves all BibTeX fields (raw editor + CRUD modal) | ✅ Pass |
| US-M4 | Overview stat card publication count | ❌ Fail |

**Summary counts (Cycle 3):**

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | Change from Cycle 2 |
| ----- | ------- | --------- | ------ | ------------------- |
| US-M1 | 3 | 1 | 0 | — |
| US-M2 | 3 | 1 | 0 | — |
| US-M3 | 0 | 3 | 0 | — |
| US-M4 | 9 → **10** | 3 → **2** | 1 | +1 Pass (GAP-141 fixed) |

---

**Key evidence references:**
- GAP-141 fix — `_pubModalUsesEditorField` flag: `web/master-cv.js:995`
- GAP-141 fix — flag set in edit: `web/master-cv.js:1457`
- GAP-141 fix — label updated in edit: `web/master-cv.js:1462–1463`
- GAP-141 fix — label `id` in HTML: `web/master-cv.js:317`
- GAP-141 fix — save uses `editor` field: `web/master-cv.js:1501`
- GAP-141 fix — flag reset in add: `web/master-cv.js:1435`
- GAP-141 fix — extra fields pre-populated: `web/master-cv.js:1469–1474`
- GAP-142 open — bulk import no per-entry validation: `scripts/routes/master_data_routes.py:1375–1415`
- Publication stat card count bug: `scripts/routes/master_data_routes.py:214` vs `master-cv.js:107`
- Phase-enforcement 409 / conflict banner: `web/ui-core.js:449–466`
- `_require_master_data_write_phase`: `scripts/routes/master_data_routes.py:143`
- Governance banner: `web/master-cv.js:87–92`
- Sort/group controls: `web/master-cv.js:1073–1184`
- Harvest confirmation dialog: `web/harvest.js:497–503`
- Harvest dual-surface: `web/harvest.js:486` and `web/finalise.js:322`
- Backup/restore endpoints: `scripts/routes/master_data_routes.py:1005–1073`
