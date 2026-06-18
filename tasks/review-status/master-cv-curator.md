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
**Reviewer:** source-first automated review (Claude Sonnet 4.6)

**Source files read:**
- `web/index.html` (712 lines)
- `web/app.js` (140 lines)
- `web/ui-core.js` (1950 lines)
- `web/master-cv.js` (2464+ lines)
- `web/harvest.js` (555 lines)
- `web/finalise.js` (395 lines)
- `web/styles.css` (1601 lines)
- `scripts/web_app.py` (1341 lines)
- `scripts/routes/master_data_routes.py` (1923 lines)
- `scripts/utils/conversation_manager.py` (2469 lines)
- `scripts/utils/bibtex_parser.py`

---

## Executive Summary

The session-boundary contract is strongly enforced end-to-end: `_require_master_data_write_phase` blocks all master-data writes outside `init`/`refinement` phases, and the Master CV tab is accessible at all workflow stages via the persistent "📚 Master CV" button in the position bar. The publications bibliography management is richly implemented — four ingestion paths, sort/group controls, and phase-gated writes. The harvest workflow presents LLM-scored candidates with before/after diffs and requires explicit confirmation before writing.

**Top findings requiring action:**

1. ❌ The overview stat card reads `publication_count` from `Master_CV_Data.json`, not from `publications.bib` — showing 0 on any BibTeX-only setup while the section itself shows real entries.
2. ⚠️ `editor`-only BibTeX entries are silently converted to `author` after a round-trip through the structured CRUD modal.
3. ⚠️ Bulk BibTeX import does not validate required fields per entry — entries missing title/year/author are silently accepted.
4. ⚠️ Phase-enforcement 409 response incorrectly triggers the "session already open in another tab" amber banner.
5. ⚠️ The Finalise/Archive and Harvest steps appear inline on the same page without a formal step divider signalling that harvest is optional.

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

**As a** master CV curator, I want to verify that application-specific edits stay in session scope unless I explicitly promote them, so that my master CV data is not silently altered during customization.

#### Acceptance Criteria

**Customization stages behave as session-scoped editing surfaces.**

✅ **Pass** — All per-application editing surfaces (Experiences, Skills, Achievements, Summary, Publications review tabs) write only to session state stored in the active `session.json`. None of these tabs call any `/api/master-data/*` write endpoint. The `STAGE_TABS` map in `web/ui-core.js:353–362` controls which tabs are visible per stage; the `master` tab is only shown in the `harvest` stage group alongside the finalise workflow. A persistent "📚 Master CV" button in the position bar (`web/index.html:99–101`) opens the Master CV modal — but this button reaches the same `master-cv.js` surface that carries the governance banner, not a session-edit surface.

**Write-back to master data is explicit, staged, and user-controlled.**

✅ **Pass** — The backend function `_require_master_data_write_phase` (`scripts/routes/master_data_routes.py:143–155`) rejects all `/api/master-data/*` writes that are not in `init` or `refinement` phase with HTTP 409 and an explanatory error message. This guard is applied to every write endpoint: personal-info, experience, skill, education, award, certification, achievement, summary, raw publications save, publication CRUD, and publications import (verified: 14 call sites in `master_data_routes.py`). Harvest write-back via `POST /api/harvest/apply` is additionally gated by `_require_harvest_apply_phase` (referenced in `web/finalise.js:339`) which only permits `refinement`. The harvest section only appears after `finaliseApplication()` succeeds (`web/finalise.js:161`), and the confirm dialog explicitly warns: "This will permanently write changes to your Master_CV_Data.json" (`web/harvest.js:500–502`).

**Failure modes:**

| # | Failure Mode | Status | Evidence |
|---|--------------|--------|----------|
| F1 | Phase-enforcement 409 triggers the session-conflict amber banner | ⚠️ Partial | The fetch interceptor in `web/ui-core.js` shows `showSessionConflictBanner()` for all 409 responses except `/api/sessions/claim` and `/api/sessions/takeover`. A phase-enforcement 409 from a master-data endpoint shows "This session is already open in another tab" — semantically wrong. In normal use the editing controls are hidden mid-workflow, but a URL-bypass attempt would see confusing messaging. |
| F2 | No phase indicator on the master CV modal | ⚠️ Minor | The governance banner at `web/master-cv.js:87–92` says edits are "not scoped to any session" but does not show the current phase or explain that edits are blocked when a job is active. A user who opens the modal mid-workflow sees all CRUD buttons, then gets an unexplained 409 at save time. |

---

### US-M2: Harvest Review Quality

**As a** master CV curator, I want to review candidate updates before they are applied to the master CV, so that I can preserve long-term data quality.

#### Acceptance Criteria

**The workflow supports selective acceptance of durable updates.**

✅ **Pass** — `web/harvest.js` provides a fully interactive harvest tab with:
- Per-candidate checkboxes (`harvest.js:155`) defaulting to checked for high/medium-confidence promote candidates (`shouldPreCheck` at `harvest.js:101–104`)
- LLM-scored grouping by type → recommendation → confidence tier (`harvest.js:77–97`)
- "✅ Apply Selected to Master CV" button (`harvest.js:315`) that posts only checked IDs
- Confirmation dialog before any write (`harvest.js:497–503`)
- Backup-path and commit hash displayed in success feedback (`harvest.js:523–524`)
- Individual items faded after application (`harvest.js:541–546`) — cannot be re-applied

**The user can understand what is being promoted back into the master record.**

✅ **Pass** — Each candidate row shows: type label (`harvest.js:162`), before text in a muted block (`harvest.js:165–170`), after text in a green-accented block (`harvest.js:171–175`), recommendation badge (`harvest.js:178`), confidence badge (`harvest.js:179`), and an optional reasoning toggle (`harvest.js:144–150`). The HARVEST_TYPE_DESCRIPTIONS constant (`harvest.js:33–37`) provides a plain-English description of what "Promoting" each type means.

**Failure modes:**

| # | Failure Mode | Status | Evidence |
|---|--------------|--------|----------|
| F1 | Duplicate harvest surface — two implementations of `applyHarvestSelections` | ⚠️ | Both `web/harvest.js:486` and `web/finalise.js:322` export `applyHarvestSelections`. `bundle.js:18142` and `18507` expose both as `applyHarvestSelections` and `applyHarvestSelections2` globals. The `harvest.js` version (standalone Harvest tab) and the `finalise.js` version (inline Finalise tab section) both exist in the UI. The finalise.js version lacks the LLM analysis scoring, showing a simpler table. Risk of curator confusion about which surface to use. |
| F2 | Fixed bullet rationale | ⚠️ | All `improved_bullet` candidates receive the same rationale string from `_compile_harvest_candidates` regardless of the actual improvement content. This makes the "rationale" column in `harvest.js:288` a placeholder rather than a decision aid. |

---

### US-M3: Boundary Clarity Across Final Stages

**As a** master CV curator, I want to understand the difference between file finalisation, archive completion, and master-data update, so that I do not confuse application completion with long-term data maintenance.

#### Acceptance Criteria

**Finalise/archive and harvest/apply appear as distinct steps with distinct consequences.**

⚠️ **Partial** — Two surfaces exist:

1. **Finalise tab** (`web/finalise.js`): Archives the application, records status/notes, then reveals the harvest section inline after success (`finalise.js:161 showHarvestSection()`). The harvest section has a "Skip" button but no formal "Optional Step 2" label. The heading "📥 Update Master CV Data" appears right below the archive success banner with no visual separator or step-number.

2. **Harvest tab** (`web/harvest.js`): A dedicated top-level tab in the tab bar (`web/index.html:225`) that provides the full LLM-scored harvest experience. This tab is the more capable surface and clearly labelled, but its relationship to the Finalise tab harvest section is not explained anywhere in the UI.

The existence of both surfaces — one inside Finalise and one as a standalone tab — creates ambiguity about which path a curator should use and whether they serve the same purpose.

**Failure modes:**

| # | Failure Mode | Status | Evidence |
|---|--------------|--------|----------|
| F1 | Harvest embedded in Finalise is not labelled optional | ⚠️ | `finalise.js:301–305` provides a "Skip" button, but there is no introductory text marking harvest as "Optional step — skip if you don't need to update your master CV." |
| F2 | Two harvest surfaces with different capabilities | ⚠️ | `harvest.js` has LLM scoring, confidence tiers, reasoning toggles, re-analyze button. `finalise.js` harvest section is a simpler table without LLM analysis. A curator using the Finalise path gets less information to make promotion decisions. |
| F3 | Summary variant harvest writes a list, CRUD edits a dict | ⚠️ | `_harvest_add_summary_variant` (referenced by `web/finalise.js:339`) appends to a list. `master_data_update_summary` (`master_data_routes.py:265–300`) converts existing lists to dicts with numeric keys on next CRUD edit. The data format silently changes depending on which editing path the curator uses. |

---

### US-M4: Maintain the Master Publications Bibliography

**As a** master CV curator, I want to add, edit, import, validate, and reorganize entries in `publications.bib` from the Master CV tab, so that my long-lived bibliography stays accurate without manual BibTeX file editing outside the application.

#### Evaluation Criteria

**1. Publication editing is clearly presented as master-data maintenance, not per-application customization.**

✅ **Pass** — The Publications section is rendered inside `populateMasterTab()` in `web/master-cv.js:159–223`, which is only reachable from the Master CV modal or tab. The governance banner at `master-cv.js:87–92` explicitly states: "Edits on this tab write directly to `Master_CV_Data.json` and are not scoped to any session." The raw BibTeX editor additionally states: "Changes are saved to `publications.bib` and a timestamped backup is created automatically" (`master-cv.js:197–199`).

**2. Supports structured BibTeX editing and easier ingestion paths (paste/import and citation-text conversion).**

✅ **Pass** — Four ingestion paths are implemented and accessible from the Publications section header:
- **Structured CRUD modal** (`+ Add Publication` / ✏️ edit / 🗑️ delete): `master-cv.js:163–185`, backed by `POST /api/master-data/publication` (`master_data_routes.py:1297–1357`)
- **Import BibTeX** (`⬆️ Import BibTeX`): paste textarea with overwrite checkbox, backed by `POST /api/master-data/publications/import` (`master_data_routes.py:1359–1416`)
- **Convert Citation Text** (`🪄 Convert Text`): free-form text → LLM-generated BibTeX preview → import, backed by `POST /api/master-data/publications/convert` (`master_data_routes.py:1418–1442`)
- **Raw BibTeX editor** (`✏️ Raw BibTeX` toggle): full-text textarea with Validate / Reload / Save actions, backed by `PUT /api/master-data/publications` (`master_data_routes.py:1218–1266`)

**3. Saving through the UI preserves bibliography data rather than stripping fields during round-trip editing.**

⚠️ **Partial** — Two cases:

- **Raw BibTeX editor path**: Full-text round-trip. The textarea loads the raw `.bib` file content and writes it back verbatim (validated but not reformatted until serialized). `serialize_bibtex_entry` in `scripts/utils/bibtex_parser.py:480–516` preserves all fields in `pub['fields']` — standard fields in canonical order, then any remaining custom fields alphabetically. Round-trip through the raw editor is lossless.

- **Structured CRUD modal path**: The edit modal (`editMasterPublication` at `master-cv.js:1443–1468`) pre-fills known form fields (key, type, author, title, year, journal/DOI). Extra fields are collected into a freeform `extra fields` textarea as `key=value` lines (`master-cv.js:342–345`). On save, `saveMasterPublication` parses them back (`master-cv.js:1530–1537`). **Gap 1:** `editor`-only BibTeX entries (e.g., book collections with `editor` but no `author`) load the `editor` field into `pub-modal-author` (`master-cv.js:1448`) and on save write it back as `fields.author` (`master-cv.js:1498`). An editor-only entry becomes an author entry after one CRUD edit — the `editor` field is silently converted. **Gap 2:** The implementation of the extra-fields pre-population was not directly verified; non-standard fields may not be pre-populated in the textarea on edit, creating a silent-drop risk on round-trip save.

#### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Master CV tab shows bibliography in reviewable list with ordering/grouping controls | ✅ Pass | `_renderPublicationsCrudList` (`master-cv.js:1109–1184`) renders a table with sort controls (year newest/oldest, type A–Z/Z–A) via `_comparePublications` (`master-cv.js:1073–1096`) and group controls (none, by year, by type) via `_groupPublicationLabel` (`master-cv.js:1099–1107`). |
| Curator can add, edit, and delete publication entries from the Master CV management surface | ✅ Pass | All three CRUD operations present: `showAddPublicationModal()` / `editMasterPublication()` / `deleteMasterPublication()` in `master-cv.js`; backed by `POST /api/master-data/publication` with action=add/update/delete. |
| Curator can import raw BibTeX entries and review validation errors before or during save | ✅ Pass | Import modal with status feedback div (`master-cv.js:378`). `POST /api/master-data/publications/validate` (`master_data_routes.py:1268–1295`) is a non-destructive parse that returns entry count and keys. The raw editor "🔍 Validate" button calls this before save (`master-cv.js:1188–1218`). |
| Curator can paste citation text in non-BibTeX form, review the generated BibTeX, and decide whether to import | ✅ Pass | Convert Text modal (`master-cv.js:390–438`) shows input and a read-only preview textarea side by side. "Generate BibTeX" and "Import Preview" are separate buttons — two explicit steps required. |
| Workflow flags missing key publication fields rather than silently accepting incomplete entries | ✅ Pass (structured only) / ⚠️ Partial (bulk import) | `POST /api/master-data/publication` enforces title, year, and author/editor (`master_data_routes.py:1337–1342`). `POST /api/master-data/publications/import` does NOT validate required fields per entry — entries missing title/year/author pass through silently if the BibTeX parses (`master_data_routes.py:1375–1415`). |
| Writes to `publications.bib` occur only from init and refinement phase windows | ✅ Pass | `PUT /api/master-data/publications` (`master_data_routes.py:1220–1223`), `POST /api/master-data/publication` (`1300–1303`), and `POST /api/master-data/publications/import` (`1362–1365`) all call `_require_master_data_write_phase`. The convert endpoint (`1418–1442`) correctly omits the phase check as it performs no write. |
| Round-trip editing through the UI preserves existing BibTeX fields | ⚠️ Partial | Raw editor path: lossless. Structured CRUD modal: `editor`→`author` conversion bug; extra fields pre-population not confirmed. |

**Additional finding — overview stat card incorrect:**

❌ **Fail** — The stat card rendered in `populateMasterTab` (`master-cv.js:107`) shows `overview.publication_count`. This count comes from `GET /api/master-data/overview` (`master_data_routes.py:188–221`) which reads `len(data.get('publications', []))` — i.e., the `publications` key inside `Master_CV_Data.json`. Publications are stored in `publications.bib` and accessed via `orchestrator.publications`, not embedded in the master JSON. For any BibTeX-only setup (which is the standard configuration), `data.get('publications', [])` returns `[]` and the stat card shows `0` while the Publications CRUD section below it correctly shows the real entries from `orchestrator.publications`. The stat card and the section are inconsistent.

---

## Generated Materials Evaluation

The Master CV Curator persona is concerned with source-of-truth data governance and durable write-back, not with judging the content quality of generated CV documents. The generated CV is an output artifact read by `download` / `final_generate` tabs; no acceptance criteria in US-M1 through US-M4 target generated document content.

That said, two generated-materials concerns emerge from the harvest workflow:

| Finding | Status | Evidence |
|---------|--------|----------|
| Harvest promotes bullets approved in Rewrites step — match uses exact proposed text as key | ⚠️ | If the user further edited the proposed text in the Rewrites tab before approving, the harvest key (original proposed text) may not match the final approved version. The mismatch results in `applied: false` in `diff_summary` with no UI explanation. |
| Summary variants harvested as a list; CRUD promotes them to a dict | ⚠️ | `_harvest_add_summary_variant` appends to a list. `master_data_update_summary` (`master_data_routes.py:265–300`) converts any existing list to a numeric-keyed dict on the next CRUD edit. The mismatch is silent and data is not lost, but the named-variant model is corrupted until manually corrected. |

---

## Phase Enforcement Audit

All master-data write endpoints verified against `_require_master_data_write_phase`:

| Endpoint | Phase guard | Allowed phases |
|----------|-------------|----------------|
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

## Gaps and Proposed Stories

### Gap 1 — Overview Stat Card Shows Wrong Publication Count (HIGH)

`GET /api/master-data/overview` (`master_data_routes.py:217`) reads `len(data.get('publications', []))` from the master JSON, but publications live in `publications.bib`. Standard setups show `0` in the stat card while the Publications section shows the real count.

**Fix:** Change `master_data_overview` to return `len(orchestrator.publications or {})` instead of `len(data.get('publications', []))`.

### Gap 2 — editor→author Conversion in CRUD Modal (MEDIUM)

`editMasterPublication` pre-fills the "Author / Editor" input from `pub.fields.author` falling back to `pub.fields.editor` (`master-cv.js:1448`). `saveMasterPublication` always writes the value as `fields.author` (`master-cv.js:1498`). An editor-only BibTeX entry (book with `editor` and no `author`) is silently converted to an author entry after one CRUD edit.

**Fix:** Use separate "Author" and "Editor" inputs in the CRUD modal, or write back to `fields.editor` when the field was originally an editor field.

### Gap 3 — Bulk BibTeX Import Accepts Entries Missing Required Fields (MEDIUM)

`POST /api/master-data/publications/import` validates that the submitted text parses, but does not validate required fields (title, year, author/editor) per entry before saving. Entries missing these fields are imported silently. The structured add/edit modal enforces these fields, creating an inconsistent data-quality story.

**Fix:** After parsing in `master_data_import_publications`, iterate over imported entries and collect entries missing title, year, or author/editor; return them in the response as warnings before or instead of saving.

### Gap 4 — Phase-Enforcement 409 Triggers Session-Conflict Banner (LOW)

The fetch interceptor in `web/ui-core.js` shows the session-conflict amber banner for all 409 responses except session claim/takeover endpoints. A phase-enforcement 409 from any master-data endpoint displays "This session is already open in another tab" — a false message.

**Fix:** Inspect the JSON response body before showing the conflict banner; show a "Editing not available while a job is active" inline error instead for master-data 409s.

### Gap 5 — Harvest/Archive Boundary Not Formally Labelled on Finalise Tab (LOW)

The harvest section in `finalise.js` appends inline after the archive success banner with only a heading change. The optional nature of harvest is not explicitly stated in the UI. A user may apply all candidates by habit without realising this is a separate, optional step.

**Fix:** Add a visible "Optional: Update Master CV" subheading with a one-sentence explanation that this step can be skipped, above the harvest table in `showHarvestSection()`.

### Gap 6 — Backup History and Restore Has No UI Surface (LOW)

`GET /api/master-data/history` and `POST /api/master-data/restore` (`master_data_routes.py:1005–1073`) are fully implemented. Every master-data write creates a timestamped backup. There is no UI surface in the Master CV tab to list or restore backups. A curator who accidentally deletes data has no self-service recovery path without CLI access.

**Proposed story:** As a master CV curator, I want to view the backup history and restore a previous snapshot from the Master CV tab, so that I can recover from accidental data loss without leaving the application.

---

## Scorecard

| Story | Criterion | Status |
|-------|-----------|--------|
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
| US-M4 | Round-trip preserves extra BibTeX fields (raw editor) | ✅ Pass |
| US-M4 | Round-trip: editor→author conversion bug (CRUD modal) | ⚠️ Partial |
| US-M4 | Overview stat card publication count | ❌ Fail |

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
|-------|---------|-----------|--------|------------|
| US-M1 | 3 | 1 | 0 | 0 |
| US-M2 | 3 | 1 | 0 | 0 |
| US-M3 | 0 | 3 | 0 | 0 |
| US-M4 | 9 | 3 | 1 | 0 |

---

**Key evidence references:**
- `_require_master_data_write_phase`: `scripts/routes/master_data_routes.py:143`
- Governance banner: `web/master-cv.js:87–92`
- Publication stat card count bug: `scripts/routes/master_data_routes.py:217` vs `master-cv.js:107`
- editor→author bug: `web/master-cv.js:1448` (load) and `1498` (save)
- Bulk import missing-field gap: `scripts/routes/master_data_routes.py:1375–1415`
- Phase-enforcement 409 / conflict banner: `web/ui-core.js` fetch interceptor
- Harvest dual-surface: `web/harvest.js:486` and `web/finalise.js:322`
- Sort/group controls: `web/master-cv.js:1109–1184`
- Harvest confirmation dialog: `web/harvest.js:497–503`
- Backup/restore endpoints: `scripts/routes/master_data_routes.py:1005–1073`
