<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# UI Review: Master CV Curator Persona

**Last Updated:** 2026-06-30 09:50 ET
**Reviewed against:** `user-story-master-cv-curator.md`
**Source files evaluated:**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/master-cv.js`
- `web/harvest.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `scripts/routes/master_data_routes.py`
- `scripts/routes/generation_routes.py`

---

## Executive Summary

The master-cv-curator persona is **substantially well served** by the current implementation. The session-isolation boundary, explicit harvest flow, and bibliographic CRUD surface are all present and architecturally sound. Key risks are: (1) the phase-lock gating is enforced server-side only — the UI does not proactively warn users they are in a phase where edits will be refused; (2) the backup history and restore UI exists at the API level but is **not surfaced** anywhere in the frontend; (3) BibTeX import reports only aggregate error messages with no per-entry detail; and (4) no ordering controls exist for the experience or education lists to support curation-style reordering.

**Overall by story:**

- US-M1 (session boundary): ✅ Pass with a ⚠️ UX gap on proactive phase-state messaging
- US-M2 (harvest review quality): ✅ Pass — LLM analysis, confidence, before/after diffs, opt-in checkboxes
- US-M3 (boundary clarity): ⚠️ Partial — harvest and finalise steps exist but the UI does not clearly explain the distinction between application completion (archive) and master-data update (harvest)
- US-M4 (publications bibliography): ⚠️ Partial — CRUD, import, convert, and raw BibTeX editing all present; import error detail is aggregate only; round-trip BibTeX fidelity is at latent risk for edge-case syntax

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

**AC 1.1 — Customization stages behave as session-scoped editing surfaces**
✅ Pass — `state-manager.js` lines 23–45 defines the session `PHASES` enum (INIT through REFINEMENT). None of the mid-workflow phases (`customization`, `rewrite_review`, `spell_check`, `generation`, `layout_review`, `final_generation`) write to `Master_CV_Data.json`. The governance banner in `master-cv.js:87–93` states explicitly: "Edits on this tab write directly to `Master_CV_Data.json` and are not scoped to any session. Job-specific customisations … are stored exclusively in the active session and never written here automatically."

**AC 1.2 — Write-back to master data is explicit, staged, and user-controlled**
⚠️ Partial — `_require_master_data_write_phase()` (`master_data_routes.py:164–177`) enforces that direct master-data writes are only permitted in `init` and `refinement` phases. The harvest apply route (`generation_routes.py:1139–1148`) further restricts apply to `refinement` only. The architecture is correct. However, the frontend edit forms in the Master CV tab do not check the current phase before showing Edit buttons or opening modals. A user in `job_analysis` phase will open an edit modal, enter data, submit, and receive a 409 server error surfaced only as a generic "❌ Error" alert (e.g., `master-cv.js:2283`). There is no proactive indicator in the Master CV tab that edits are locked during the active workflow.

Failure mode: user opens experience edit modal, fills in changes, clicks Save, gets "Save failed" with no explanation of why or how to unlock editing.

---

### US-M2: Harvest Review Quality

**EC 2.1 — Harvest candidates are presented in a reviewable form**
✅ Pass — `harvest.js` renders a collapsible three-tier hierarchy (type → recommendation → confidence) with before/after text. `renderCandidateRow()` (`harvest.js:137–187`) labels the "Before" and "After" content with distinct visual styling (grey background vs. green background with left border).

**EC 2.2 — Each candidate indicates what would be added or changed**
✅ Pass — Before/after labeled sections, source badges ("🆕 Added" vs. "✅ Confirmed" for skills), recommendation badges ("⬆️ Promote" / "⏭️ Skip"), confidence badges (High/Medium/Low), and an LLM reasoning toggle are all implemented (`harvest.js:137–187`).

**EC 2.3 — Applying harvested changes is optional and selective**
✅ Pass — All checkboxes start unchecked (`shouldPreCheck()` at `harvest.js:104–106` always returns `false`). The "Apply Selected to Master CV" button collects only explicitly checked items. A confirmation modal (`harvest.js:498–505`) is shown before any writes, including a note that "a backup will be created first."

**AC — Workflow supports selective acceptance of durable updates**
✅ Pass — `applyHarvestSelections()` (`harvest.js:487–554`) posts only `selected_ids` to `/api/harvest/apply`. The backend applies only the selected items and writes a timestamped backup before modifying `Master_CV_Data.json` (`generation_routes.py:2154–2163`). Post-apply, selected checkboxes are disabled and rows are dimmed to prevent re-application.

**AC — User can understand what is being promoted**
✅ Pass — Type group labels, before/after text, source badges, LLM reasoning descriptions (`harvest.js:33–37` HARVEST_TYPE_DESCRIPTIONS), and a post-apply result panel showing `written_count`, backup path, and git commit hash are all present.

---

### US-M3: Boundary Clarity Across Final Stages

**AC — Finalise/archive and harvest/apply appear as distinct steps with distinct consequences**
⚠️ Partial — The workflow nav (`index.html:142`) includes a "🌾 Harvest" step positioned after Download/Cover Letter/Screening. The harvest tab header reads: "Review LLM-scored candidates for promotion to your master CV. Check the items you want to apply" (`harvest.js:311–313`). This describes the action accurately. However:

- There is no UI text explaining that the application files are already finalized (archived) by the time the Harvest step is reached — the progression is implicit.
- No "skip" affordance or completion message tells the user "You're done — harvest is optional" if they don't want to promote anything.
- The relationship between the harvest phase gate (`refinement` required in `generation_routes.py:1143`) and the workflow position is never exposed to the user.
- A first-time user may not understand whether skipping Harvest means their session is incomplete or unarchived.

---

### US-M4: Maintain the Master Publications Bibliography

**AC 4.1 — Master CV tab shows bibliography in a reviewable list with ordering/grouping controls**
✅ Pass — `_renderPublicationsCrudList()` (`master-cv.js:1111–1187`) renders Sort (year-desc, year-asc, type-asc, type-desc) and Group (none, by-year, by-type) select controls. `setPublicationSortMode()` and `setPublicationGroupMode()` (`master-cv.js:1064–1072`) reload the list. The raw BibTeX toggle (`master-cv.js:997–1005`) switches to a monospace textarea for direct BibTeX editing.

**AC 4.2 — Curator can add, edit, and delete publication entries**
✅ Pass — `showAddPublicationModal()`, `editMasterPublication()`, and `deleteMasterPublication()` are all implemented (`master-cv.js:1434–1560`). The add/edit modal covers cite key, entry type, author(s)/editor(s), title, year, journal/booktitle, DOI, and extra fields as `key=value` lines. `editMasterPublication()` tracks whether the entry uses `editor` instead of `author` and preserves the correct field on save (`master-cv.js:1457`, `1501`).

**AC 4.3 — Curator can import raw BibTeX entries and review validation errors before or during save**
⚠️ Partial — `showImportPublicationsModal()` (`master-cv.js:1265`) provides a paste-and-import flow. The import result shows counts (added/updated/skipped) and a status message. However:

- Validation errors are reported as a single string ("BibTeX parse error in submitted content.") with no per-entry detail.
- The count of skipped entries is reported but no list of which cite keys were skipped (e.g., due to duplicate key conflict) is returned by the backend (`master_data_routes.py:1440–1446` returns only aggregate counts).
- A curator importing 20 entries cannot determine which 3 were skipped without manual inspection.

**AC 4.4 — Curator can paste citation text in non-BibTeX form, review generated BibTeX, and decide whether to import**
✅ Pass — `showConvertPublicationsModal()` (`master-cv.js:1329`) implements a two-panel workflow: input citation text at top, generated BibTeX preview in a second editable textarea below. The curator can review and manually edit the generated BibTeX before importing it. "Generate BibTeX" and "Import Preview" are separate actions (`master-cv.js:434–439`).

**AC 4.5 — Workflow flags missing key fields (title, authors, year) instead of silently accepting incomplete entries**
✅ Pass — Client-side validation in `saveMasterPublication()` (`master-cv.js:1496–1499`) checks for title, year, and author/editor before submitting, showing alert modals for each. Server-side (`master_data_routes.py:1367–1372`) independently validates the same fields and returns 400 on missing required data.

**AC 4.6 — Writes to `publications.bib` occur only from explicit master-data write windows**
✅ Pass — All three publication write paths call `_require_master_data_write_phase()`:

- `PUT /api/master-data/publications` (raw BibTeX save) — `master_data_routes.py:1253`
- `POST /api/master-data/publications/import` — `master_data_routes.py:1394`
- `POST /api/master-data/publication` (individual CRUD) — `master_data_routes.py:1332`

The convert endpoint (`POST /api/master-data/publications/convert`) does not write to disk and is correctly not gated.

**AC 4.7 — Round-trip editing through the UI preserves existing BibTeX information**
⚠️ Partial — The edit modal places unknown fields beyond the known set (author/editor, title, year, journal/booktitle, doi) into an "Extra fields" textarea as `key=value` lines (`master-cv.js:1469–1474`). On save, these are parsed back (`master-cv.js:1509–1516`) with a line-by-line `=` split. This approach handles simple scalar extras. However:

- `@string` macro definitions, `@comment` blocks, and BibTeX syntax with nested braces or special characters will not survive the CRUD round-trip.
- When writing via `serialize_publications_to_bibtex()`, the output is re-serialized from the parsed dict, which means any original formatting, field ordering, or macro references in the raw `.bib` are replaced.
- The raw BibTeX editor preserves content literally and is the recommended path for complex BibTeX, but switching back to the CRUD path after a raw edit serializes from the parsed structure.

---

### Backup and Restore

**Backup creation on writes:** ✅ Pass — Timestamped backups are created in `master_path.parent / "backups"` before all master-data writes (`master_data_routes.py:40–55`) and before harvest apply (`generation_routes.py:2154–2163`). The raw BibTeX save also creates a backup (`master_data_routes.py:1274–1280`).

**Backup restore API:** ✅ Pass — `GET /api/master-data/history` and `POST /api/master-data/restore` are implemented (`master_data_routes.py:1032–1100`). The restore endpoint creates a safety backup of the current state before overwriting and reloads the in-memory orchestrator.

**Backup restore UI:** ❌ Fail — No frontend UI exposes the backup history or restore capability. There are zero references to `/api/master-data/history` or `/api/master-data/restore` in any source `.js` file (outside the generated `bundle.js`). The "Export JSON" button provides a one-time download but does not surface past snapshots. A curator who makes a bad bulk edit or accidental deletion cannot recover without command-line access.

---

## Generated Materials Evaluation

— N/A — The master-cv-curator persona focuses on source data integrity, not CV output rendering. Generated PDF/DOCX quality is not in scope for this persona.

---

## Additional Story Gaps

**GAP-MCC-01 (HIGH): No proactive phase-lock indicator on Master CV tab**
The Master CV tab shows edit buttons regardless of the current session phase. During mid-workflow phases (job_analysis, customization, rewrite_review, spell_check, generation, layout_review, final_generation), all edit controls are visible but every write will return HTTP 409. The UI surfaces these only as generic "❌ Error" alerts with the server's error message. The fix: detect phase from `/api/status` and show an inline banner ("Editing is locked while a job workflow is active. Return to this tab after completing or before starting a job.") with edit buttons disabled during locked phases.

**GAP-MCC-02 (HIGH): No backup history / restore UI**
The API routes for history (`/api/master-data/history`) and restore (`/api/master-data/restore`) are implemented and phase-gated, but no frontend surface exposes them. A curator who accidentally deletes an experience entry or bulk-imports bad BibTeX has no recovery path through the UI. The Master CV tab should include a "🕐 History & Restore" section listing timestamped snapshots with a restore button.

**GAP-MCC-03 (MEDIUM): Import error detail is aggregate only**
BibTeX import reports counts (added/updated/skipped) and a single error string, but does not identify which cite keys were skipped or which entries had parse errors. The backend should return a `skipped_keys` list and `error_entries` list in the import response, and the UI should display them so the curator can take targeted corrective action.

**GAP-MCC-04 (MEDIUM): No harvest-step completion / skip framing**
The Harvest tab describes what harvesting does but provides no framing that: (a) application files are already archived at this point, (b) harvest is fully optional, and (c) skipping harvest is a valid workflow completion. Adding a brief "About this step" callout or a "Skip Harvest / I'm done" button that marks the session complete would clarify the US-M3 boundary between file finalization and master-data maintenance.

**GAP-MCC-05 (LOW): BibTeX round-trip loses @string macros and @comment blocks**
The CRUD edit path serializes from a parsed dict via `serialize_publications_to_bibtex()`, which cannot preserve `@string` macro definitions, `@comment` blocks, or unusual BibTeX syntax present in the original file. Curators who maintain complex `.bib` files with shared macro definitions should be warned (e.g., a note near the Raw BibTeX editor) that the CRUD path may not preserve all BibTeX syntax.

**GAP-MCC-06 (LOW): No experience or education reordering controls**
The experience and education lists in the Master CV tab render in their JSON array order with no UI controls to reorder entries. A curator who wants to ensure specific ordering (e.g., most relevant experience first for AI selection) must edit the JSON file directly. Adding up/down or drag-to-reorder controls would complete the CRUD surface.

---

## Reviewed Against

- `web/master-cv.js` — Full file (2566 lines)
- `web/harvest.js` — Full file (557 lines)
- `web/index.html` — Lines 1–400 (relevant modals and nav)
- `web/app.js` — Full file
- `web/ui-core.js` — Lines 1–200
- `web/state-manager.js` — Lines 1–100
- `scripts/routes/master_data_routes.py` — Lines 40–1473
- `scripts/routes/generation_routes.py` — Lines 1135–2200

---

## Summary Table

| Criterion | Status | Evidence |
| --- | --- | --- |
| US-M1 AC: Session customization is session-scoped | ✅ Pass | `state-manager.js:23–45`; governance banner `master-cv.js:87–93` |
| US-M1 AC: Write-back explicit and user-controlled | ⚠️ Partial | Server gate `master_data_routes.py:164–177`; no proactive phase indicator in UI |
| US-M2 EC1: Candidates reviewable | ✅ Pass | `harvest.js:137–187` before/after diff rendering |
| US-M2 EC2: Candidates indicate what changes | ✅ Pass | Before/after labels, source badges, LLM reasoning toggle `harvest.js:148–185` |
| US-M2 EC3: Applying changes is optional/selective | ✅ Pass | `shouldPreCheck()` always false; confirmation modal `harvest.js:498–505` |
| US-M3 AC: Finalise vs. harvest as distinct steps | ⚠️ Partial | Harvest step in nav; no explanatory framing distinguishing archive from promote |
| US-M4 AC1: Bibliography list with ordering/grouping | ✅ Pass | Sort + Group controls `master-cv.js:1114–1133` |
| US-M4 AC2: Add, edit, delete publications | ✅ Pass | Full CRUD modal with required-field validation `master-cv.js:1434–1560` |
| US-M4 AC3: Import BibTeX with error review | ⚠️ Partial | Aggregate counts only; no per-entry or per-key error detail |
| US-M4 AC4: Convert citation text with review step | ✅ Pass | Two-panel convert modal with editable BibTeX preview `master-cv.js:1329–1430` |
| US-M4 AC5: Flag missing key fields | ✅ Pass | Client + server validation `master-cv.js:1496–1499`; `master_data_routes.py:1367–1372` |
| US-M4 AC6: publications.bib writes gated to init/refinement | ✅ Pass | All three write endpoints call `_require_master_data_write_phase()` |
| US-M4 AC7: Round-trip preserves BibTeX fields | ⚠️ Partial | Simple extra fields round-trip; macros/comments/complex syntax at risk |
| Backup creation on writes | ✅ Pass | `master_data_routes.py:43–55`; `generation_routes.py:2154–2163` |
| Backup restore UI | ❌ Fail | API implemented; zero frontend references to history/restore endpoints |

### Result: 8 Pass / 4 Partial / 1 Fail / 6 Additional Gaps
