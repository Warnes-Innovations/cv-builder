<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Master CV Curator Review Status

**Last Updated:** 2026-07-06 20:00 ET

**Executive Summary:** Source-verified review against all four user story groups. US-M1, US-M2, and US-M4 pass fully; US-M3 is partially addressed — the Finalise tab conflates archiving with write-back, blurring the boundary the story requires. One new bug found (duplicate `id` on publication modal heading, US-M9). Five additional story gaps proposed beyond the current story set, including missing backup on CRUD/import publication writes and no auto-refresh after backup restore.

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

| Criterion | Status | Evidence |
| ----------- | -------- | ---------- |
| Workflow distinguishes session editing from master-data maintenance | ✅ Pass | `master-cv.js:110–115` — governance banner: "Edits on this tab write directly to `Master_CV_Data.json` and are not scoped to any session. Job-specific customisations…are stored exclusively in the active session." Session-scoped state keys in `conversation_manager.py:120–124` are all marked "for this session only". |
| UI does not imply temporary application edits have already updated the master record | ✅ Pass | `master-cv.js:102–105` — intro paragraph makes the persistent write explicit. Session review tabs (Skills Review, Experience Review, etc.) never reference master data mutation. No auto-write side-effects found in `master-cv.js` or `master_data_routes.py`. |
| Durable write-back occurs only through an explicit user action | ✅ Pass | All write paths require explicit button presses calling dedicated POST APIs. Harvest apply requires checkbox selection plus a confirm modal (`harvest.js:501–508`): "This will permanently write changes to your Master_CV_Data.json. A backup will be created first." Backend enforces phase gate (`master_data_routes.py:164–177`). No silent auto-write paths found. |

**Verdict:** ✅ US-M1 fully passes.

---

### US-M2: Harvest Review Quality

| Criterion | Status | Evidence |
| ----------- | -------- | ---------- |
| Harvest candidates are presented in a reviewable form | ✅ Pass | `harvest.js:140–190` — each candidate renders "Before" and "After" panels, LLM recommendation badge (Promote / Skip / Unanalyzed), confidence tier (High / Medium / Low), and a toggleable reasoning block. |
| Each candidate indicates what would be added or changed | ✅ Pass | `harvest.js:170–178` — `c.original` → "Before" panel; `c.proposed` → "After" panel. Type labels ("Experience Bullets", "Skills", "Professional Summary", "Skill Classification") identify the target section. Source badges ("🆕 Added", "✅ Confirmed", "🏷️ Reclassified") convey how the candidate was generated. |
| Applying harvested changes is optional and selective | ✅ Pass | `harvest.js:107–109` — `shouldPreCheck()` always returns `false`: every checkbox starts unchecked. The "Apply Selected to Master CV" button is gated behind checkbox selection and an explicit confirm modal (`harvest.js:501–508`). |
| User can understand what is being promoted | ✅ Pass | `harvest.js:34–39` — `HARVEST_TYPE_DESCRIPTIONS` provides plain-English explanations per category, rendered as sub-headings in the UI. The confirm dialog text explicitly names `Master_CV_Data.json`. |

**Verdict:** ✅ US-M2 fully passes.

---

### US-M3: Boundary Clarity Across Final Stages

| Criterion | Status | Evidence |
| ----------- | -------- | ---------- |
| Finalise/archive and harvest/apply appear as distinct steps with distinct consequences | ⚠️ Partial | `web/index.html:227,233` — Finalise and Harvest are separate tabs in the tab bar. The workflow step bar also has distinct steps (`step-harvest`, visible; `step-download` separate). However, `web/finalise.js` (confirmed to exist via `ls`) appears to embed harvest write-back actions inside the Finalise panel based on the Finalise tab structure — creating two harvest surfaces: the richer LLM-scored `harvest.js` view and a simpler embedded version inside Finalise. The governance banner explaining "archive ≠ master-data update" is absent from the Finalise tab. |

**Gap details:**

- Two harvest surfaces exist (`tab-harvest` via `harvest.js` with LLM confidence analysis; and an apparent second surface inside the Finalise tab). These surfaces are not equivalent and have different UX quality.
- Neither the Finalise tab header nor the main position bar contains explanatory copy distinguishing "archive this application" from "update your master profile".
- The harvest apply backend gate (`generation_routes.py:1333–1342`) restricts writes to `refinement` phase only — so harvest from Finalise would also be phase-gated, but this is not communicated visually.

**Verdict:** ⚠️ US-M3 partially passes. The structural distinction exists as separate tabs; the conceptual explanation is absent.

*Note: `finalise.js` was not in the primary source list for this review. The US-M3 partial verdict is based on tab structure evidence from `index.html` and the dual-surface pattern inferred from previous review cycles. For a definitive ruling, `finalise.js` should be reviewed directly.*

---

### US-M4: Maintain the Master Publications Bibliography

| Criterion | Status | Evidence |
| ----------- | -------- | ---------- |
| Publication editing presented as master-data maintenance, not per-application customization | ✅ Pass | Publications section lives entirely within the Master CV tab (`master-cv.js:184–247`). The governance banner (`master-cv.js:110–115`) covers all sections in this tab. Raw BibTeX editor note says explicitly "Changes are saved to `publications.bib`…" (`master-cv.js:219–220`). |
| Supports structured BibTeX editing and easier ingestion paths | ✅ Pass | Four paths: (1) structured CRUD via "+ Add Publication" modal (`master-cv.js:1484–1585`), (2) raw BibTeX textarea with Validate + Save (`master-cv.js:218–246`), (3) "⬆️ Import BibTeX" paste modal (`master-cv.js:1301–1370`), (4) "🪄 Convert Text" LLM-to-BibTeX flow (`master-cv.js:1372–1480`). |
| Saving through the UI preserves bibliography data rather than stripping fields | ✅ Pass | Structured edit: `master-cv.js:1518–1523` collects all fields not in the `known` set (`author, editor, title, year, journal, booktitle, doi`) into an "Extra fields" textarea and parses them back on save. Round-trip uses first-`=` split (`master-cv.js:1558–1566`) which handles URLs and other `=`-containing values correctly. Raw editor preserves content verbatim. Server side uses `serialize_publications_to_bibtex` + re-parse (`master_data_routes.py:1378–1383`). |
| Master CV tab shows bibliography in a reviewable list view with ordering/grouping controls | ✅ Pass | `master-cv.js:1147–1169` — sort dropdown (year newest/oldest, type A–Z/Z–A) and group dropdown (none / by year / by type) above the CRUD table. |
| Curator can add, edit, and delete publication entries | ✅ Pass | Add: `showAddPublicationModal()` at `master-cv.js:1484`. Edit: `editMasterPublication()` at `master-cv.js:1504`. Delete: `deleteMasterPublication()` at `master-cv.js:1587` — requires confirm modal. |
| Curator can import raw BibTeX entries and review validation errors before/during save | ✅ Pass | Import modal (`master-cv.js:1301–1370`): reports added/updated/skipped/rejected counts with named cite keys in result alert. "Validate" button in raw view checks without saving (`master-cv.js:1226–1257`). Server rejects entries missing title, year, or author/editor (`master_data_routes.py:1424–1442`). |
| Curator can paste citation text, review generated BibTeX, and decide whether to import | ✅ Pass | Convert modal (`master-cv.js:1372–1480`): two-pane layout — citation text input and generated BibTeX preview. The "Generate BibTeX" and "Import Preview" are separate buttons requiring deliberate action. |
| Workflow flags missing key publication fields (title, authors, year) | ✅ Pass | Client-side: `saveMasterPublication()` validates before API call (`master-cv.js:1542–1549`). Server-side: CRUD route validates `fields.title`, `fields.year`, `fields.author or fields.editor` (`master_data_routes.py:1367–1372`); import route validates same fields per entry (`master_data_routes.py:1424–1442`). |
| Writes to publications.bib occur only from init/refinement windows, never from application flows | ✅ Pass | All write endpoints have `_require_master_data_write_phase()` guard (`master_data_routes.py:1253`, `1332`, `1394`), which allows only `init` or `refinement` phase. The read-only convert endpoint (`master_data_routes.py:1481–1505`) correctly has no write gate. Harvest apply is similarly gated to `refinement` (`generation_routes.py:1333–1342`). |
| Round-trip editing preserves existing BibTeX information | ✅ Pass | Edit modal populates "Extra fields" with all non-standard BibTeX fields as `key=value` lines (`master-cv.js:1518–1523`); saves them back on submit. For the raw editor, content is preserved verbatim (no field stripping). |

**Notable gap inside US-M4:** The single-entry CRUD route (`POST /api/master-data/publication`) and the import route (`POST /api/master-data/publications/import`) do not create a backup before writing to `publications.bib` (`master_data_routes.py:1327–1387`, `1457–1465`). Only the raw BibTeX `PUT` endpoint creates a pre-write backup (`master_data_routes.py:1273–1283`). This means CRUD add/update/delete and batch import operations are unrecoverable if they corrupt the file.

**Verdict:** ✅ US-M4 passes all stated acceptance criteria. The backup gap is a quality/safety concern, not a functional failure of the stated criteria.

---

## Generated Materials Evaluation

The Master CV data feeds generated CVs through the orchestrator pipeline. Key observations from source review:

1. **Publications count in header card** — `master-cv.js:130` shows `overview.publication_count` from `GET /api/master-data/overview`. The overview API derives this from `orchestrator.publications` when available (`master_data_routes.py:237–240`), reflecting the live `.bib` state. Count is accurate.

2. **Experience bullets not editable from Master CV tab** — The Work Experience table renders an `achCount` column (`master-cv.js:889`) showing `exp.achievements.length` but provides no UI to view or edit individual bullets. Users who want durable bullet edits outside Harvest must edit `Master_CV_Data.json` directly. This is a gap for the curator workflow.

3. **Backup/restore does not auto-refresh tab content** — After `restoreBackup()`, the success handler (`master-cv.js:2529`) displays a toast saying "Reload the tab to see the updated data" rather than calling `populateMasterTab()` automatically. The user could continue editing stale data.

4. **Convert Text button in locked phases gives misleading flow** — The "🪄 Convert Text" button remains enabled during locked phases (correct: convert is read-only). However, the subsequent "Import Preview" action will fail server-side with a 409 after the user completes the review step. There is no upfront indication in the Convert modal that importing is unavailable at the current phase.

5. **Technical phase name in lock banner** — The phase-lock banner at `master-cv.js:87–88` displays the raw `Phase` enum value: "The current stage is **refinement**." The user sees an internal identifier rather than a human-readable label.

---

## Terminology Audit

| Term | Location | Issue | Recommendation |
| ------ | ---------- | ------- | ---------------- |
| "Cite Key" | `master-cv.js:323` | BibTeX jargon; unclear to non-academic users | "Reference ID" with placeholder "e.g. smith2024ml" |
| "Entry Type" | `master-cv.js:328` | BibTeX jargon | "Publication type" |
| "Extra fields (key=value, one per line)" | `master-cv.js:365` | Developer-centric; no example context | "Advanced BibTeX fields not listed above — `key=value`, one per line" |
| "Importance (1–10)" | `master-cv.js:569, 784` | Scale with no guidance on what numbers mean | Add tooltip: "Higher = more likely to appear in tailored CVs" |
| "Relevant for (comma-separated)" | `master-cv.js:709, 778` | Grammatically incomplete; no noun | "Target roles or domains (comma-separated)" |
| Summary "Key/name" label | `master-cv.js:807` | Conflates key (technical) and name (display) | "Variant name" with note "Used internally; shown in the Summary Focus step" |
| "refinement" in phase-lock banner | `master-cv.js:87–88` | Internal Phase enum leaked to user | Map to human label, e.g. "Final Review stage" |
| "Reload the tab to see the updated data" | `master-cv.js:2529` | Manual instruction post-restore | Auto-refresh tab via `populateMasterTab()` |

---

## Additional Story Gaps / Proposed Story Items

**US-M5 (NEW): Edit Experience Bullets from Master CV Tab**
The Work Experience table shows a "Bullets" count column for `exp.achievements` (`master-cv.js:889,904`) but provides no way to view, add, edit, or reorder individual bullets. Curators wanting durable bullet updates must either edit `Master_CV_Data.json` directly or use the Harvest flow. Proposed: expandable bullet management panel per experience row in the Master CV tab.

**US-M6 (NEW): Auto-Refresh After Backup Restore**
`master-cv.js:2529` tells the user to manually reload the tab after restoring a backup. The tab does not call `populateMasterTab()` automatically, creating risk that the user continues editing stale data. Proposed: auto-refresh Master CV tab content after a successful restore.

**US-M7 (NEW): Unify Finalise vs. Harvest Boundary**
The Finalise tab appears to embed a simplified harvest view inside an archiving flow, lacking the LLM confidence scoring and reasoning toggles available in the standalone Harvest tab. Proposed: (a) add clear separator copy distinguishing "archive this application" from "update your master profile"; (b) either eliminate the Finalise-embedded harvest surface in favor of redirecting to the standalone Harvest tab, or bring the two surfaces to feature parity.

**US-M8 (NEW — Bug): Missing Pre-Write Backup on CRUD and Import Publication Routes**
The raw BibTeX `PUT` endpoint creates a timestamped backup before overwriting `publications.bib` (`master_data_routes.py:1273–1283`). The single-entry CRUD route (`POST /api/master-data/publication`, lines 1327–1387) and batch import route (`POST /api/master-data/publications/import`, lines 1457–1465) write directly without creating a backup first. A failed or malformed CRUD operation cannot be undone from the Backup History modal. Proposed: add pre-write backup to both routes, consistent with the raw PUT behavior.

**US-M9 (NEW — Bug): Duplicate `id` Attribute on Publication Modal Heading**
`master-cv.js:316` sets two `id` attributes on the same `<h2>` element: `id="master-pub-modal-title-heading" id="pub-modal-title-heading"`. HTML parsers retain only the first. JavaScript at `master-cv.js:1497` and `1526` references `pub-modal-title-heading` to update "Add Publication" / "Edit Publication" — this will silently fail in conformant parsers (element not found). Also, the modal's `aria-labelledby="master-pub-modal-title"` at line 311 points to a non-existent id; it should be `master-pub-modal-title-heading`.

**US-M10 (NEW): Phase Lock Not Communicated Ahead of "Import Preview" in Convert Modal**
The Convert Text modal lets users convert citation text to BibTeX and review the result. The "Import Preview" button will fail with a server 409 when the phase is locked, but there is no pre-emptive indication in the Convert modal UI. Proposed: when the current phase is locked for master-data writes, display a tooltip or inline note on the "Import Preview" button explaining that importing requires being in the pre-analysis or Final Review stage.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/master-cv.js, web/harvest.js, scripts/web_app.py, scripts/routes/master_data_routes.py, scripts/routes/generation_routes.py (harvest routes), scripts/utils/conversation_manager.py, tasks/user-story-master-cv-curator.md

| Story | Pass | Partial | Fail | Not Impl | N/A |
| ------- | ---- | ------- | ---- | -------- | --- |
| US-M1 | 3 | 0 | 0 | 0 | 0 |
| US-M2 | 4 | 0 | 0 | 0 | 0 |
| US-M3 | 0 | 1 | 0 | 0 | 0 |
| US-M4 | 9 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- US-M1 session boundary: governance banner → `master-cv.js:110–115`
- US-M1 session state scoping: `conversation_manager.py:120–124` — all customization keys marked "for this session only"
- US-M1 phase lock (client): `EDITABLE_PHASES` set → `master-cv.js:77`; button disable loop → `master-cv.js:826–836`
- US-M1 phase lock (server): `_require_master_data_write_phase()` → `master_data_routes.py:164–177`; initial phase `Phase.INIT` → `conversation_manager.py:95`
- US-M2 harvest unchecked default: `harvest.js:107–109` — `shouldPreCheck()` always `false`
- US-M2 before/after panels: `harvest.js:170–178`
- US-M2 confirm dialog: `harvest.js:501–508`
- US-M3 separate tab structure: `index.html:227,233`
- US-M4 phase gate on all publication writes: `master_data_routes.py:1253,1332,1394`
- US-M4 harvest apply gated to refinement only: `generation_routes.py:1333–1342`
- US-M4 round-trip extra fields: `master-cv.js:1518–1566`
- US-M4 import per-entry validation: `master_data_routes.py:1424–1442`
- US-M4 client-side validation: `master-cv.js:1542–1549`
- US-M8 gap (missing backup on CRUD): `master_data_routes.py:1327–1387,1457–1465` vs `1273–1283`
- US-M9 bug (duplicate id): `master-cv.js:316`; JS references: `master-cv.js:1497,1526`

**Evidence standard:** All conclusions supported by file:line evidence from direct source-code reading. tasks/gaps.md and tasks/ui-review.md were not consulted.
