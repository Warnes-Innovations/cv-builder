<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Master CV Curator Review Status

**Last Updated:** 2026-07-06

**Executive Summary:** Source-first review against the current `feature/multi-user-deployment` branch. The master CV curator story is substantially implemented: all four user stories have their core acceptance criteria met. Phase-locked master-data writes, explicit harvest confirmation, full publication CRUD with BibTeX import/convert, backup/restore, and governance banners are all present and correct. Three new gaps were found beyond the known GAP-309–312 set: (1) the publication edit modal silently drops standard BibTeX fields outside its hardcoded "known" set when a user saves an entry without preserving the extra-fields textarea — a round-trip fidelity risk; (2) the `domain_relevance` field for experience entries cannot be set or edited through the CRUD UI, leaving a useful AI-guidance field permanently invisible to curators; (3) professional summary variant keys use a code-style `lowercase_underscore` format as their only user-facing identifier, with no separate display-name field. Known tracked issues: GAP-309 (duplicate id on pub modal heading), GAP-310 (no experience bullet editor in Master CV tab), GAP-311 (no auto-refresh after backup restore), GAP-312 (raw "refinement" phase label in lock banner).

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Workflow distinguishes session editing from master-data maintenance | ✅ Pass | `master-cv.js:110–115` — governance banner on Master CV tab: "Job-specific customisations (skills, experience picks, summaries) are stored exclusively in the active session and never written here automatically." Backend `_require_master_data_write_phase()` (`master_data_routes.py:164–177`) enforces writes only during `init` or `refinement` phases. |
| UI does not imply temporary edits have already updated the master record | ✅ Pass | Customisation tabs (Skills, Experiences, Summary) write to session state in `conversation_manager.py`, never to `Master_CV_Data.json`. Master CV tab shown as a distinct section with its own tab (`index.html:228`) and a separate modal path. |
| Durable write-back occurs only through an explicit user action | ✅ Pass | `harvest.js:499–565` — `applyHarvestSelections()` requires explicit checkbox selection, a confirm dialog ("This will permanently write changes to your Master_CV_Data.json. A backup will be created first."), and `shouldPreCheck()` always returns `false` so no item is pre-checked. |
| Customisation stages behave as session-scoped editing surfaces | ✅ Pass | Phase lock banner (`master-cv.js:80–88`) disables all write controls outside `init`/`refinement`. Buttons are set to `disabled` + `opacity:0.45` with tooltip "Editing locked — complete the current stage to re-enable". |
| Write-back to master data is explicit, staged, and user-controlled | ✅ Pass | Three separate explicit paths: (a) Master CV tab CRUD buttons (phase-locked), (b) Harvest Apply (requires selection + confirm), (c) Backup Restore (requires confirm). No silent write-back path found. |

---

### US-M2: Harvest Review Quality

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Harvest candidates are presented in a reviewable form | ✅ Pass | `harvest.js:148–198` — `renderCandidateRow()` renders each candidate with type label, label text, "Before" and "After" blocks for `improved_bullet` and `summary_variant` types, recommendation badge, confidence badge, and optional collapsible reasoning block. |
| Each candidate indicates what would be added or changed | ✅ Pass | Improved bullets show side-by-side "Before" / "After" blocks. Skills show the proposed skill name with "🆕 Added" or "✅ Confirmed" source badges. Provenance badges ("✏️ User-edited", "🤖 AI accepted") implemented in `harvest.js:140–146`. |
| Applying harvested changes is optional and selective | ✅ Pass | `harvest.js:107–109` — `shouldPreCheck()` returns `false` for all candidates. User must actively check items and confirm before any write. Unchecked items are never written. |
| Selective acceptance of durable updates is supported | ✅ Pass | Each candidate has an individual checkbox (`harvest-chk-${id}`). Only checked IDs are sent to `/api/harvest/apply`. Applied rows are visually dimmed and their checkboxes disabled post-apply. |
| User can understand what is being promoted | ✅ Pass | Type sections with descriptions (`HARVEST_TYPE_DESCRIPTIONS`, `harvest.js:34–39`) explain the consequence of promoting each type. Confirmation dialog restates the write consequence before committing. |

---

### US-M3: Boundary Clarity Across Final Stages

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Finalise/archive and harvest/apply appear as distinct steps with distinct consequences | ✅ Pass | Workflow nav (`index.html:136–147`) shows "File Review → Cover Letter → Screening → Interview Prep → Thank You → Harvest" as separate steps. Master CV tab is always accessible as a separate tab. |
| Phase lock banner communicates the editing window clearly | ⚠️ Partial | `master-cv.js:80–88` — Banner says "during the Refinement stage. The current stage is **${currentPhase}**." Shows the raw internal phase code (e.g. `job_analysis`, `customization`) rather than a human-readable label. GAP-312 tracked. |
| Backend error message terminology consistent with UI labels | ⚠️ Partial | `master_data_routes.py:171–175` — Error says "from the **Harvest Step**" but the allowed write phase is `refinement` (post-application stage), not the Harvest tab. A curator hitting the 409 error would be directed to the wrong step. Related to GAP-312 but a distinct message-level issue. |

---

### US-M4: Maintain the Master Publications Bibliography

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Publication editing is presented as master-data maintenance | ✅ Pass | Publications section is within the Master CV tab, under the governance banner. Phase enforcement applies to all write endpoints. |
| Structured CRUD view with ordering/grouping controls | ✅ Pass | `master-cv.js:1147–1222` — `_renderPublicationsCrudList()` provides Sort (year desc/asc, type A-Z/Z-A) and Group (none, by year, by type) dropdowns. Publications listed in a table with cite key, formatted citation preview, edit and delete buttons. |
| Curator can add, edit, and delete publication entries | ✅ Pass | `showAddPublicationModal()`, `editMasterPublication()`, `deleteMasterPublication()` all implemented. Modal validates title, year, author/editor before save. Backend validates same fields at `master_data_routes.py:1375–1380`. |
| Curator can import raw BibTeX entries | ✅ Pass | "⬆️ Import BibTeX" button opens paste textarea with overwrite checkbox and import status. `/api/master-data/publications/import` merges entries with per-entry validation; returns `added`, `updated`, `skipped`, and `invalid_keys`. |
| Curator can paste citation text and review generated BibTeX | ✅ Pass | "🪄 Convert Text" button opens split input/output panes. LLM converts text; curator reviews preview before clicking "Import Preview". Convert endpoint is read-only; write phase guard only applies at import time. |
| Workflow flags missing key fields | ✅ Pass | Frontend: `saveMasterPublication()` (`master-cv.js:1542–1549`) rejects empty title, year, or author/editor. Backend validates same fields. Import rejects incomplete entries and lists `invalid_keys` in the response. |
| Writes to publications.bib only from explicit master-data write windows | ✅ Pass | PUT `/api/master-data/publications`, POST `/api/master-data/publication`, POST `/api/master-data/publications/import` all call `_require_master_data_write_phase()`. Convert endpoint is correctly exempt (no write). |
| Round-trip editing preserves existing BibTeX information | ⚠️ Partial | Fields beyond the hardcoded "known" set (`author`, `editor`, `title`, `year`, `journal`, `booktitle`, `doi`) are preserved via an "Extra fields (key=value)" textarea (`master-cv.js:1519`). Standard unlisted fields (`volume`, `pages`, `publisher`, `number`, `series`, `isbn`) go to this textarea. If a curator saves without preserving that content, those fields are silently dropped. **NEW GAP — see GAP-MCC-01.** |
| Raw BibTeX editor available with validate/reload/save | ✅ Pass | `togglePublicationsView()` switches between CRUD and raw views. Raw view has Validate, Reload, and Save buttons. Validate calls `/api/master-data/publications/validate` without writing. |

---

## Master CV Tab — General Usability

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Profile overview card with counts | ✅ Pass | `master-cv.js:120–131` — profile card shows name, headline, email, and stat badges for Experiences, Skills, Achievements, Summaries, Education, Publications. |
| Personal info CRUD | ✅ Pass | "✏️ Edit" button opens modal with name, title, email, phone, LinkedIn, website, city, state. Backend validates email format and URL scheme. |
| Work experience CRUD (role metadata) | ✅ Pass | Add/edit/delete with title, company, location, dates, employment type, importance, tags. Backend validates required fields and date ordering. |
| Experience bullet editing from Master CV tab | ❌ Not Implemented | Experiences table shows a "Bullets" count column but clicking Edit only opens the role-level metadata modal. No UI to edit individual achievement bullets on this tab. GAP-310 tracked. |
| Experience domain_relevance field editable | ❌ Not Implemented | Backend stores and updates `domain_relevance` (`master_data_routes.py:591,614`) but the add/edit experience modal (`master-cv.js:519–585`) exposes only title, company, city, state, dates, employment_type, importance, and tags. Curators cannot set domain relevance through the UI. **NEW GAP — see GAP-MCC-02.** |
| Skills CRUD (flat and categorised) | ✅ Pass | Edit/delete chips with experience-link support. Category add/delete buttons. Handles both flat list and categorised-dict schema. |
| Education CRUD | ✅ Pass | Add/edit/delete with degree, field, institution, location, years. |
| Awards and certifications CRUD | ✅ Pass | Separate sections with full add/edit/delete modals. |
| Achievements CRUD | ✅ Pass | Add/edit/delete with title, description, relevant_for, importance. Harvest note in section description. |
| Professional summaries CRUD | ⚠️ Partial | Add/edit/delete with key and text fields. Key serves as the only user-facing identifier (shown in Summary Focus step) with no separate display-name field. Curators must use `lowercase_underscore` codes as their label. **NEW GAP — see GAP-MCC-03.** |
| Backup history and restore | ✅ Pass | "🕐 Backups" button opens snapshot list with date, size, and Restore button. Safety backup created before restore. Both backup formats (routes-generated and web_app-generated) are accepted by the filename validator. |
| Auto-refresh after backup restore | ❌ Not Implemented | `restoreBackup()` (`master-cv.js:2529`) shows "Reload the tab to see the updated data." but does not call `populateMasterTab()`. Backend does update in-memory `orchestrator.master_data` correctly. GAP-311 tracked. |
| Export JSON | ✅ Pass | "⬇️ Export JSON" triggers file download of `Master_CV_Data.json`. Available in all phases (excluded from phase-lock button sweep). |
| Persistent storage warning | ✅ Pass | `master-cv.js:110–115` — Amber governance banner on every tab load communicates that edits write directly to `Master_CV_Data.json` and are not session-scoped. |

---

## Generated Materials Evaluation

Publications management is entirely within the Master CV tab and produces no generated document directly. The curator's impact on generated materials flows through the master data evaluated by other personas (hiring manager, recruiter, ATS). No direct generated-output evaluation applies to this persona beyond what is covered in application-workflow reviews.

---

## Known Tracked Issues (Not Re-Scored Here)

| Gap ID | Description |
|--------|-------------|
| GAP-309 | Duplicate `id` attribute on publication modal heading: `master-cv.js:316` has both `id="master-pub-modal-title-heading"` and `id="pub-modal-title-heading"` on the same element. |
| GAP-310 | No experience bullet (achievement) editor in the Master CV tab. The experience edit modal covers role metadata only; bullets shown in count column are not editable here. |
| GAP-311 | Backup restore success does not auto-refresh the Master CV tab. User instructed to "Reload the tab" manually even though the backend already updated in-memory state. |
| GAP-312 | Phase lock banner exposes raw internal phase code (e.g. `job_analysis`) rather than a human-readable stage name. |

---

## New Gaps Identified

### GAP-MCC-01: Publication edit modal silently drops non-hardcoded BibTeX fields on save (HIGH)

**Story:** US-M4 — "Round-trip editing through the UI preserves existing BibTeX information rather than dropping unrelated fields."

**Description:** The publication add/edit modal collects all BibTeX fields beyond a hardcoded "known" set (`author`, `editor`, `title`, `year`, `journal`, `booktitle`, `doi`) into an "Extra fields (key=value, one per line)" textarea (`master-cv.js:1519`). When a curator opens an existing publication to make a minor change, any standard unlisted fields (`volume`, `pages`, `publisher`, `number`, `series`, `isbn`, `issn`, `address`, `note`, `url`, `eprint`) are rendered as raw text in this textarea. If the curator saves without carefully preserving that content — or accidentally clears the textarea — those fields are silently dropped from `publications.bib`. There is no warning, no "content unchanged = safe" check, and no enumeration of which fields are present before editing.

**Failure mode:** Curator edits a publication year, saves, and unknowingly drops `volume`, `pages`, and `publisher` fields.

**Location:** `web/master-cv.js` lines 1519–1567 (`editMasterPublication`, `saveMasterPublication`).

**Suggested fix:** (a) Enumerate extra fields above the textarea in a read-only list before editing so the curator can verify what is at risk, with an `onchange` warning if textarea content changes, or (b) promote the most common standard fields (`volume`, `pages`, `publisher`, `number`) to named input fields in the modal.

---

### GAP-MCC-02: Experience domain_relevance field has no UI in the CRUD modal (MEDIUM)

**Description:** Experience entries support a `domain_relevance` array field used by the AI to score experience relevance for domain-specific roles (e.g. `["pharma", "clinical"]`). The backend correctly reads and persists this field (`master_data_routes.py:591, 614`), but the experience add/edit modal in `master-cv.js:519–585` exposes only title, company, city, state, start_date, end_date, employment_type, importance, and tags. The `domain_relevance` field has no UI input. A curator who wants to improve AI recommendations for domain-specific applications has no way to set or update this field through the interface; they must edit `Master_CV_Data.json` directly.

**Failure mode:** Curator adds a new pharma consulting role but cannot tag it with `["pharma", "biotech"]`; AI underweights this experience when recommending for life-sciences applications.

**Location:** `web/master-cv.js` lines 519–585 (experience modal HTML), 1976–2013 (`saveMasterExperience`).

**Suggested fix:** Add a "Domain Relevance (comma-separated)" text input to the experience modal, analogous to the existing Tags field. Parse comma-separated input into an array before sending to the backend.

---

### GAP-MCC-03: Professional summary variant key is the only user-facing label — no display-name field (LOW)

**Description:** Professional summary variants are stored as `{ key: text }` pairs. The `key` must follow `lowercase_underscore` convention (enforced only by a UI hint, not a validator) because it is also shown as the label in the Summary Focus step during customisation. There is no separate display-name field. A curator wanting readable variant names like "Machine Learning Focus" or "VP / Executive" must either compromise the key format (making it verbose and potentially mishandled downstream) or accept that the Summary Focus step always shows technical-looking codes.

**Failure mode:** Curator creates a summary with key `ml_engineering` and sees `ml_engineering` as the picker label during the application workflow rather than a human-readable description.

**Location:** `web/master-cv.js:807–811` (summary modal key input and hint).

**Suggested fix:** Add an optional `label` field per summary variant used as the display name in the Summary Focus step. The key remains the internal identifier; the label is what curators and the workflow surface to users. (Requires a schema change to `professional_summaries` and an orchestrator update to prefer `label` over `key` in the Summary Focus display.)
