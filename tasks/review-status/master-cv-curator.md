<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# UI Review: Master CV Curator Persona

**Reviewed:** 2026-06-30 ET
**Story file:** `tasks/user-story-master-cv-curator.md`

Source files evaluated:

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`

Additional files read to follow implementation:

- `scripts/routes/master_data_routes.py`
- `web/master-cv.js`
- `web/harvest.js`

---

## Executive Summary

The master-cv-curator persona is **substantially well served** by the implementation.
The session-isolation boundary is architecturally sound and explicitly communicated in the
Master CV tab's governance banner. The harvest flow implements LLM-scored, opt-in,
before/after comparison with a confirmation gate. The publications bibliography offers
full CRUD, raw BibTeX editing, import, and LLM-assisted citation conversion.

Primary gaps: (1) the phase-lock that blocks mid-workflow edits to master data is enforced
only server-side — the UI does not indicate locked state before the user attempts a write;
(2) the backup-restore API is fully implemented but has **no frontend surface**; (3) BibTeX
import error reporting is aggregate-only with no per-entry or per-key detail; and (4) the
boundary between session "archive completion" and "master-data harvest" is not explained in
the UI.

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

#### EC 1.1 — The workflow distinguishes session editing from master-data maintenance

✅ Pass — `state-manager.js` lines 23–45 defines `PHASES` (INIT, JOB_ANALYSIS,
CUSTOMIZATION, REWRITE_REVIEW, SPELL_CHECK, GENERATION, LAYOUT_REVIEW,
FINAL_GENERATION, REFINEMENT). None of these mid-workflow phases write to
`Master_CV_Data.json`. The Master CV tab (`web/master-cv.js`, rendered from
`openMasterCvModal()` linked to the `📚 Master CV` button in `index.html:104`) displays a
governance banner explicitly stating: "Edits on this tab write directly to
`Master_CV_Data.json` and are not scoped to any session. Job-specific customisations …
are stored exclusively in the active session and never written here automatically."

#### EC 1.2 — The UI does not imply that temporary application edits have already updated the master record

✅ Pass — Session-scoped edits (experience decisions, skill additions, summary focus, rewrite
approvals) are stored in `conversation.state` (`conversation_manager.py:88–130`). No route
in `master_data_routes.py` is called during `customization`, `rewrite_review`,
`spell_check`, `generation`, or `layout_review` phases. The `StatusResponse` dataclass
(`web_app.py:103–153`) does not return master-data write confirmation fields. There is no
UI indicator that would mislead the user into believing session customizations have been
promoted to the master record.

#### EC 1.3 — Durable write-back occurs only through an explicit user action

⚠️ Partial — Server-side, `_require_master_data_write_phase()` (`master_data_routes.py:164–177`)
enforces that all master-data writes are permitted only in `init` or `refinement` phases,
returning HTTP 409 with `conflict_type: "phase_enforcement"` otherwise. The harvest apply
endpoint additionally enforces `refinement` phase only. The architecture is correct.

However, the frontend does not check the current phase before rendering edit controls on
the Master CV tab. A user in `job_analysis` phase will open an edit modal, fill in data,
click Save, and receive only a generic error response surfaced as "❌ Error" in a toast
or alert. There is no proactive indicator that the Master CV tab is locked, no explanation
of why the save failed, and no guidance on how to unlock editing.

Acceptance criteria:

- Customization stages behave as session-scoped editing surfaces: ✅ Pass
- Write-back to master data is explicit, staged, and user-controlled: ⚠️ Partial
  (server gate correct; UI lacks phase-lock visibility)

---

### US-M2: Harvest Review Quality

#### EC 2.1 — Harvest candidates are presented in a reviewable form

✅ Pass — `web/harvest.js` renders a collapsible three-tier hierarchy: type-group →
recommendation-group → confidence-tier → candidate rows. `renderCandidateRow()`
(`harvest.js:137–187`) shows "Before" content (grey background, grey left border) and
"After" content (green background, green left border) with distinct visual labeling. Type
labels ("Experience Bullets", "Skills", "Professional Summary") appear in a secondary line
above each item.

#### EC 2.2 — Each candidate indicates what would be added or changed

✅ Pass — Each row shows: type label and icon, a contextual label (`c.label`), source
badges ("🆕 Added" vs "✅ Confirmed" for skills), recommendation badge ("⬆️ Promote" /
"⏭️ Skip" / "❓ Unanalyzed"), confidence badge (High/Medium/Low with color coding), and a
💬 toggle that expands the LLM reasoning text (`harvest.js:147–152`). The `HARVEST_TYPE_DESCRIPTIONS`
map (`harvest.js:33–37`) explains in plain English what each type means when promoted.

#### EC 2.3 — Applying harvested changes is optional and selective

✅ Pass — `shouldPreCheck()` (`harvest.js:104–106`) unconditionally returns `false`;
all checkboxes start unchecked. The "✅ Apply Selected to Master CV" button
(`harvest.js:316–319`) is only enabled when the user explicitly checks items.
`applyHarvestSelections()` (`harvest.js:487–554`) calls `showConfirmModal()` before any
write, noting that "a backup will be created first." After apply, checked rows are dimmed
and their checkboxes disabled to prevent re-application.

Acceptance criteria:

- Workflow supports selective acceptance of durable updates: ✅ Pass
- User can understand what is being promoted: ✅ Pass — before/after text, source badges,
  LLM reasoning, post-apply result panel with `written_count`, backup path, and git commit

---

### US-M3: Boundary Clarity Across Final Stages

#### AC — Finalise/archive and harvest/apply appear as distinct steps with distinct consequences

⚠️ Partial — The workflow nav (`index.html:146`) includes a "🌾 Harvest" step after
Download/Cover Letter/Screening. The harvest tab header reads "Review LLM-scored
candidates for promotion to your master CV" (`harvest.js:311`), which describes the action
accurately. However:

1. No UI text explains that application files are already finalized before Harvest is
   reached. The relationship between the Download step (where files are packaged) and
   the Harvest step (where master data is optionally updated) is implicit.
2. There is no "Skip / I'm done" affordance that signals harvest is optional and that
   skipping it does not leave the session in an incomplete state.
3. The phase gate (`refinement` required to apply harvest) is not visible in the UI,
   so a user who accidentally navigates away from `refinement` phase and returns may not
   understand why the Apply button still works (or why edits in other tabs are locked).
4. No completion message is shown after the Harvest step to confirm the session is done.

---

### US-M4: Maintain the Master Publications Bibliography

#### AC 4.1 — Master CV tab shows bibliography in a reviewable list with ordering/grouping controls

✅ Pass — `master-cv.js:1111–1133` renders Sort (year-desc, year-asc, type-asc, type-desc)
and Group (none, by-year, by-type) select controls. `setPublicationSortMode()` and
`setPublicationGroupMode()` reload the list. Toggling "✏️ Raw BibTeX" (`master-cv.js:997–1005`)
switches to a monospace textarea with Validate, Reload, and Save controls.

#### AC 4.2 — Curator can add, edit, and delete publication entries

✅ Pass — `showAddPublicationModal()`, `editMasterPublication()`, and `deleteMasterPublication()`
are all implemented. The modal covers cite key, entry type, author(s)/editor(s), title, year,
journal/booktitle, DOI, and arbitrary extra fields via a `key=value` textarea. The editor
correctly distinguishes `author` vs. `editor` fields and preserves the correct field on
round-trip.

#### AC 4.3 — Curator can import raw BibTeX entries and review validation errors before or during save

⚠️ Partial — `showImportPublicationsModal()` provides a paste-and-import workflow. The
import flow calls `/api/master-data/publications/import`, which returns aggregate counts
(added/updated/skipped). However:

- Validation errors surface as a single-string message ("BibTeX parse error in submitted
  content.") with no per-entry detail (`master_data_routes.py:1408–1411`).
- Skipped keys (due to duplicate cite key conflict) are counted but not identified.
  `master_data_routes.py:1418–1424` iterates entries but returns only numeric counts.
- A curator importing 20 entries cannot determine which 3 were skipped without manual
  inspection of the existing bibliography.

#### AC 4.4 — Curator can paste citation text in non-BibTeX form, review the generated BibTeX, and decide whether to import

✅ Pass — `showConvertPublicationsModal()` (`master-cv.js:1329`) implements a two-panel
workflow: plain-text citation input at top, editable BibTeX preview below. "Generate
BibTeX" and "Import Preview" are separate actions. The generated BibTeX is placed in an
editable textarea so the curator can correct it before committing. The backend uses
`orchestrator.llm.convert_text_to_bibtex()` (`master_data_routes.py:1464`), and this
endpoint does not write to disk — it is correctly not phase-gated.

#### AC 4.5 — Workflow flags missing key fields instead of silently accepting incomplete entries

✅ Pass — Client-side validation checks for title, year, and author/editor before submitting
(checking for missing fields and showing alert modals). Server-side,
`master_data_routes.py:1367–1372` independently validates `fields.title`, `fields.year`,
and `fields.author` or `fields.editor`, returning HTTP 400 with descriptive messages
("fields.title is required", etc.).

#### AC 4.6 — Writes to publications.bib occur only from the explicit master-data write windows

✅ Pass — All three write paths call `_require_master_data_write_phase()`:

- `PUT /api/master-data/publications` (raw BibTeX overwrite) — `master_data_routes.py:1253`
- `POST /api/master-data/publication` (individual CRUD) — `master_data_routes.py:1332`
- `POST /api/master-data/publications/import` (BibTeX merge) — `master_data_routes.py:1394`

The `/api/master-data/publications/convert` endpoint reads only and has no phase gate,
which is correct. The `/api/master-data/publications/validate` endpoint similarly does not
write and is correctly ungated (`master_data_routes.py:1299–1326`).

#### AC 4.7 — Round-trip editing through the UI preserves existing BibTeX information rather than dropping unrelated fields

⚠️ Partial — The structured CRUD modal stores unknown fields in an "Extra fields"
`key=value` textarea. On save, these are parsed line by line with `=` split. This handles
simple scalar extras. However:

- `@string` macro definitions and `@comment` blocks are not preserved by the parsed-dict
  round-trip through `serialize_publications_to_bibtex()`.
- Any original BibTeX field ordering, formatting, or macro references in the raw file
  will be replaced with re-serialized output.
- The Raw BibTeX editor (`master-pub-textarea`) preserves content literally and is
  the safest path for complex BibTeX. However, switching back to the CRUD structured view
  after using the raw editor re-serializes from the parsed structure, losing macro/comment
  context.

This is a latent risk rather than an immediate data-loss path, because the raw editor is
prominently available and the CRUD edit modal displays all non-standard fields in the Extra
fields area. Still, curators with complex `.bib` files should be warned.

---

### Backup and Recovery

Backup creation: ✅ Pass — Timestamped backups are created in `master_path.parent / "backups"`
before all master-data writes (`master_data_routes.py:43–55`). The raw BibTeX save also
creates a backup (`master_data_routes.py:1274–1280`). The harvest apply similarly creates
a backup before writing (`web_app.py` `_save_master` lines 1218–1223).

Backup restore API: ✅ Pass — `GET /api/master-data/history` and
`POST /api/master-data/restore` are fully implemented (`master_data_routes.py:1032–1100`).
The restore endpoint validates the filename format, creates a safety backup of the current
state before overwriting, then reloads the in-memory orchestrator.

Backup restore UI: ❌ Fail — No frontend surface exposes backup history or restore.
There are no references to `/api/master-data/history` or `/api/master-data/restore` in any
JS source files. The Export JSON button provides a one-time download of the current state
but does not surface past snapshots. A curator who makes an accidental bulk deletion or
bad import has no recovery path through the UI.

---

## Generated Materials Evaluation

The master-cv-curator persona focuses on data integrity of `Master_CV_Data.json` and
`publications.bib`, not on generated CV output rendering. Evaluation of generated PDF/DOCX
quality, ATS scoring, or visual layout is not in scope for this persona.

---

## Additional Gaps

### GAP-MCC-01 (HIGH): No proactive phase-lock indicator on Master CV tab

The Master CV tab renders all edit buttons and modals regardless of the current session
phase. During mid-workflow phases (`job_analysis`, `customization`, `rewrite_review`,
`spell_check`, `generation`, `layout_review`, `final_generation`), every write returns
HTTP 409. The UI surfaces this only as a generic error alert. There is no banner, disabled
state, or tooltip to inform the curator that the tab is read-only during active workflow
phases, why it is locked, or how to resume editing.

Suggested fix: On Master CV tab load, call `/api/status` and check `phase`. If not `init`
or `refinement`, show an inline banner: "Master CV editing is locked while a job workflow
is active (current phase: *X*). You can edit after completing the workflow or before
starting a new job." Disable all save/add/delete buttons.

### GAP-MCC-02 (HIGH): No backup history or restore UI

The `/api/master-data/history` and `/api/master-data/restore` API routes are implemented
and phase-gated, but no frontend surface exposes them. A curator who accidentally deletes
an experience entry or imports bad BibTeX cannot recover through the UI.

Suggested fix: Add a "🕐 History & Restore" collapsible section at the bottom of the
Master CV tab. List snapshots from `/api/master-data/history` with filename, size, and
timestamp. Each row has a Restore button that calls `/api/master-data/restore` after
confirmation.

### GAP-MCC-03 (MEDIUM): BibTeX import error detail is aggregate-only

The import endpoint returns only counts (added/updated/skipped) and a single-string error.
Skipped keys are not identified, preventing the curator from taking targeted corrective
action when some entries are rejected.

Suggested fix: Return `skipped_keys: [...]` and `parse_errors: [...]` from
`/api/master-data/publications/import`. Render these in the import result panel.

### GAP-MCC-04 (MEDIUM): No Harvest-step completion or skip framing

The Harvest tab describes what promotion does but provides no context that: (a) the
application files are already archived before Harvest, (b) harvest is fully optional, and
(c) skipping harvest does not leave the session incomplete.

Suggested fix: Add a brief "About this step" callout at the top of the Harvest tab and a
"✓ Done — Skip Harvest" secondary button alongside "Apply Selected."

### GAP-MCC-05 (LOW): BibTeX round-trip loses @string macros and @comment blocks

The CRUD path serializes from a parsed dict, which cannot preserve `@string` macro
definitions, `@comment` blocks, or unusual BibTeX formatting present in the original file.
Curators who maintain complex `.bib` files with shared macros should be warned before
using the structured CRUD editor.

Suggested fix: Add a callout near the Raw BibTeX editor: "Note: switching from Raw BibTeX
back to Structured View re-serializes from parsed data. `@string` macros and `@comment`
blocks will not be preserved."

### GAP-MCC-06 (LOW): No reordering controls for experience or education lists

The experience and education lists in the Master CV tab render in their JSON array order
with no UI controls to reorder entries. Curators who want to control the ordering (which
can influence AI selection during recommendation) must edit the JSON file directly.

---

## Summary Table

| Story | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| US-M1 | Customization is session-scoped | ✅ Pass | `state-manager.js:23–45`; governance banner `master-cv.js:87–93` |
| US-M1 | No UI implication that edits already updated master | ✅ Pass | No mid-workflow route writes to master; `conversation.state` only |
| US-M1 | Write-back explicit and user-controlled | ⚠️ Partial | Server gate `master_data_routes.py:164–177` correct; UI lacks phase-lock visibility (GAP-MCC-01) |
| US-M2 | Candidates reviewable | ✅ Pass | `harvest.js:137–187` before/after diff rendering |
| US-M2 | Candidates indicate what changes | ✅ Pass | Source badges, LLM reasoning toggle, type descriptions `harvest.js:33–37` |
| US-M2 | Applying changes is optional and selective | ✅ Pass | `shouldPreCheck()` always false; confirmation modal `harvest.js:498–505` |
| US-M3 | Finalise vs. harvest as distinct steps | ⚠️ Partial | Harvest step in nav; no explanatory framing (GAP-MCC-04) |
| US-M4 | Bibliography list with ordering/grouping controls | ✅ Pass | Sort + Group controls `master-cv.js:1114–1133`; raw BibTeX toggle |
| US-M4 | Add, edit, and delete publications | ✅ Pass | Full CRUD modal with required-field validation |
| US-M4 | Import BibTeX with error review | ⚠️ Partial | Aggregate counts only; no per-key error detail (GAP-MCC-03) |
| US-M4 | Convert citation text with review step | ✅ Pass | Two-panel convert modal with editable BibTeX preview |
| US-M4 | Flag missing key fields (title, author, year) | ✅ Pass | Client + server validation `master_data_routes.py:1367–1372` |
| US-M4 | publications.bib writes gated to init/refinement | ✅ Pass | All three write endpoints call `_require_master_data_write_phase()` |
| US-M4 | Round-trip preserves BibTeX fields | ⚠️ Partial | Simple extras round-trip; macros/comments at risk (GAP-MCC-05) |
| — | Backup creation on writes | ✅ Pass | `master_data_routes.py:43–55` |
| — | Backup restore API | ✅ Pass | `master_data_routes.py:1032–1100` |
| — | Backup restore UI | ❌ Fail | No frontend references to history/restore endpoints (GAP-MCC-02) |

Result: 9 Pass / 4 Partial / 1 Fail / 6 Additional Gaps
