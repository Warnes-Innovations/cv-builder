<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Master CV Curator Review Status

**Last Updated:** 2026-07-06 ET

**Executive Summary:** Source-verified master CV curator persona review against US-M1 through US-M4. Three of four story groups pass fully. US-M3 is partial: the Finalise tab conflates archiving with harvest/write-back, blurring the "finalise vs. master-data update" boundary. Six additional story gaps proposed beyond the current story set.

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Workflow distinguishes session editing from master-data maintenance | ✅ Pass | `master-cv.js:110–115` — governance banner explicitly states "edits on this tab write directly to `Master_CV_Data.json` and are not scoped to any session." Session customization tabs are separate. |
| UI does not imply temporary edits have already updated master record | ✅ Pass | `master-cv.js:104` — intro paragraph says "Changes here update Master_CV_Data.json directly." Session-scoped tabs (Skills Review, Experience Review) never reference the master record. |
| Durable write-back occurs only through explicit user action | ✅ Pass | All write paths call POST APIs (e.g., `/api/master-data/experience`, `/api/master-data/skill`). Harvest apply requires checkbox selection plus a confirm modal (`harvest.js:501–508`). No silent auto-write paths found. |

**Verdict:** ✅ US-M1 fully passes.

---

### US-M2: Harvest Review Quality

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Harvest candidates are presented in a reviewable form | ✅ Pass | `harvest.js:140–190` — each candidate renders "Before" / "After" panels with LLM recommendation badge (Promote/Skip), confidence tier (High/Medium/Low), and toggleable reasoning block. |
| Each candidate indicates what would be added or changed | ✅ Pass | `harvest.js:170–178` — Before (strikethrough style) and After panels rendered per candidate. Type labels (Experience Bullets, Skills, Professional Summary, Skill Classification) make the target clear. |
| Applying harvested changes is optional and selective | ✅ Pass | `harvest.js:107` — `shouldPreCheck()` always returns `false`: all items start unchecked. Apply requires checkbox selection + confirm modal (`harvest.js:501–508`). |
| Curator can understand what is being promoted | ✅ Pass | `harvest.js:34–39` — `HARVEST_TYPE_DESCRIPTIONS` provides plain-English explanations per type in the UI section headers. |

**Verdict:** ✅ US-M2 fully passes.

---

### US-M3: Boundary Clarity Across Final Stages

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Finalise/archive and harvest/apply appear as distinct steps with distinct consequences | ⚠️ Partial | `finalise.js:339–341` — `finaliseApplication()` calls `showHarvestSection()` immediately on success, embedding harvest write-back inside the Finalise tab. Both actions appear in the same UI panel under "✅ Finalise Application". The Harvest step is also a dedicated separate tab (`harvest.js`), creating two harvest surfaces with different UX (the Finalise-embedded version lacks LLM analysis and confidence tiers). |

**Gap details:**
- The Finalise tab titles itself "✅ Finalise Application" (`finalise.js:78`) and the primary button reads "✅ Finalise & Archive" (`finalise.js:127`). After clicking, a "📥 Update Master CV Data" section appears in the same panel (`finalise.js:397`). Users see both actions as one combined operation.
- The standalone Harvest tab (`harvest.js`) renders a richer, LLM-scored view with confidence badges and reasoning toggles. The Finalise-embedded harvest view (`finalise.js:388–455`) renders a simplified table without those elements — so the two surfaces are not equivalent.
- Neither surface contains a clear "archive ≠ master-data update" explanation.

**Verdict:** ⚠️ US-M3 partially passes. The conceptual distinction exists but is not surfaced clearly in the UI.

---

### US-M4: Maintain the Master Publications Bibliography

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Publication editing presented as master-data maintenance, not per-application customization | ✅ Pass | Publications section lives entirely inside the Master CV tab (`master-cv.js:185–247`). Governance banner at line 110 covers all sections. |
| Supports structured BibTeX editing and easier ingestion paths | ✅ Pass | Three ingestion paths: (1) structured CRUD via "+ Add Publication" modal (`master-cv.js:484–502`), (2) "⬆️ Import BibTeX" paste modal (`master-cv.js:377–411`), (3) "🪄 Convert Text" free-form to AI-generated BibTeX flow (`master-cv.js:413–463`). Raw BibTeX editor toggle also available (`master-cv.js:197–246`). |
| Saving preserves BibTeX data rather than stripping fields | ✅ Pass | `master-cv.js:1518–1523` — edit modal serializes all fields not in the `known` set (`author, editor, title, year, journal, booktitle, doi`) into "Extra fields" textarea and round-trips them back on save. Server-side uses `serialize_publications_to_bibtex` plus `parse_bibtex_file` (`master_data_routes.py:1378–1383`). |
| Master CV tab shows bibliography in reviewable list view with ordering/grouping controls | ✅ Pass | `master-cv.js:1147–1169` — sort dropdown (year newest/oldest, type A–Z/Z–A) and group dropdown (none/by year/by type) rendered above the CRUD table. |
| Curator can add, edit, and delete publication entries | ✅ Pass | Add: `showAddPublicationModal()` at `master-cv.js:1484`. Edit: `editMasterPublication()` at `master-cv.js:1504`. Delete: `deleteMasterPublication()` at `master-cv.js:1587` with confirm modal. |
| Curator can import raw BibTeX entries and review validation errors | ✅ Pass | Import modal (`master-cv.js:1301–1370`): on success, shows counts of added/updated/skipped/rejected with named keys. Server rejects entries missing title, year, author/editor (`master_data_routes.py:1424–1442`). Inline Validate button available in raw view (`master-cv.js:226–228`). |
| Curator can paste citation text, review generated BibTeX, decide to import | ✅ Pass | Convert modal (`master-cv.js:1372–1480`): two-pane layout with input (citation text) and output (generated BibTeX), requiring explicit "Import Preview" click. |
| Workflow flags missing key publication fields | ✅ Pass | Server: title, year, author/editor required on import and CRUD save (`master_data_routes.py:1367–1372`, `1424–1434`). UI: validation modal shown before save (`master-cv.js:1542–1549`). |
| Writes to publications.bib occur only from explicit master-data write windows | ✅ Pass | All write endpoints (`PUT /api/master-data/publications`, `POST /api/master-data/publication`, `POST /api/master-data/publications/import`) call `_require_master_data_write_phase()` (`master_data_routes.py:1253`, `1332`, `1394`) which allows writes only in `init` or `refinement` phases. The Convert endpoint is read-only and has no write gate (correct). |
| Round-trip editing preserves existing BibTeX information | ✅ Pass | `master-cv.js:1518–1523` — extra fields read back from `pub.fields`, filtered to only non-standard keys, serialized as key=value textarea content, then re-parsed on save. |

**Verdict:** ✅ US-M4 fully passes.

---

## Generated Materials Evaluation

The master CV data feeds into generated CVs through the orchestrator pipeline. Key observations:

1. **Publications count shown in header overview** — `master-cv.js:130` correctly shows `publication_count` from the overview API. The overview API derives this from `orchestrator.publications` when available (`master_data_routes.py:237–240`), so it reflects the live `.bib` state.

2. **Experience bullet count is display-only** — The Work Experience table shows a "Bullets" column (`master-cv.js:904`) counting `exp.achievements.length`, but individual bullets are NOT editable from the Master CV tab. Users who want to edit or add experience bullets must either edit `Master_CV_Data.json` directly or use the Harvest flow. This is a gap for curators who need durable bullet edits outside the Harvest path.

3. **Backup/restore does not auto-refresh tab** — `master-cv.js:2529` shows "Reload the tab to see the updated data" after restore. The tab does not auto-refresh; the user must manually switch tabs or reload the modal. This is unnecessary friction after a restore operation.

4. **Convert endpoint phase gating not communicated** — The `/api/master-data/publications/convert` endpoint does NOT call `_require_master_data_write_phase()` (`master_data_routes.py:1481–1505`). This is correct (it is read-only), but the subsequent "Import Preview" action that writes DOES have the phase gate (`master_data_routes.py:1394`). Users in a locked phase will see Convert succeed, then Import silently fail with a 409. The UI gives no upfront indication of this.

5. **Summary key format is developer-centric** — `master-cv.js:809–810` shows the hint "Use lowercase_underscore — this is the key used internally and shown in the Summary Focus step." The raw key leaks into the Summary Focus step where users see identifiers like `ml_engineering`. Functional but developer-facing.

---

## Terminology Audit

| Term | Location | Issue | Recommendation |
|------|----------|--------|----------------|
| "Cite Key" | `master-cv.js:323` | BibTeX jargon; unclear to non-academic users | "Reference ID" with placeholder "e.g. smith2024ml" |
| "Entry Type" | `master-cv.js:328` | BibTeX jargon | "Publication type" |
| "Extra fields (key=value, one per line)" | `master-cv.js:365` | Developer-centric; no example context | Add inline help: "Advanced BibTeX fields not listed above" |
| "Importance (1–10)" | `master-cv.js:569, 784` | Numeric scale with no guidance on what the numbers mean in context | Add tooltip: "Higher = more likely to appear in tailored CVs" |
| "Relevant for (comma-separated)" | `master-cv.js:709, 778` | "Relevant for" without a noun is grammatically ambiguous | "Target roles or domains" |
| Summary "Key/name" | `master-cv.js:807` | "Key/name" conflates two concepts; instruction says "Use lowercase_underscore" | Label as "Variant name" with note "Used internally; also shown in the Summary Focus step" |
| "📥 Update Master CV Data" | `finalise.js:397` | Heading appears inside the Finalise tab after archiving, conflating archive and write-back | "Optionally promote improvements to Master CV" with clear separation |
| "Reload the tab to see the updated data" | `master-cv.js:2529` | Manual instruction after backup restore | Auto-refresh or add "Reload now" button |
| "The current stage is **refinement**" | `master-cv.js:88` | Technical Phase enum value exposed to users | Map to human label: "Final Review stage" |

---

## Additional Story Gaps / Proposed Story Items

**US-M5 (NEW): Edit Experience Bullets from Master CV Tab**
The Work Experience table shows a "Bullets" count column (`master-cv.js:904`) counting `exp.achievements.length`, but no way to view, add, edit, or reorder the individual achievement bullets under each experience. Curators must edit `Master_CV_Data.json` directly or use the Harvest flow. Proposed: an expandable bullet management panel per experience row in the Master CV tab.

**US-M6 (NEW): Auto-Refresh After Backup Restore**
After restoring a backup, `master-cv.js:2529` tells the user to "Reload the tab to see the updated data" rather than automatically calling `populateMasterTab()`. This risks the user continuing to edit stale data. Proposed: auto-refresh the master CV tab content after a successful restore.

**US-M7 (NEW): Unify Finalise vs. Harvest Boundary**
The Finalise tab merges "archive application" and "write to master CV" into one flow without explanation (`finalise.js:339–341`). The embedded harvest view also lacks LLM confidence scores and reasoning toggles available in the standalone Harvest tab. Proposed: (a) add a clear separator and explanatory copy distinguishing the two consequences; (b) unify the harvest UI between Finalise-embedded and standalone views.

**US-M8 (NEW): Phase Lock Uses Technical Phase Names**
The phase-lock banner (`master-cv.js:88`) says "The current stage is **refinement**". "refinement" is the internal `Phase` enum value (`conversation_manager.py:48`). Proposed: maintain a client-side display name map in `state-manager.js` (e.g., `refinement` → "Final Review") and use it in the lock banner.

**US-M9 (NEW — Bug): Duplicate id Attribute on Publication Modal Heading**
`master-cv.js:316` sets two `id` attributes on the same `<h2>` element: `id="master-pub-modal-title-heading" id="pub-modal-title-heading"`. HTML parsers retain only the first. JavaScript at `master-cv.js:1497` and `1526` references `pub-modal-title-heading`, which may silently fail (element not found) in conformant parsers. The title heading will not update between "Add Publication" and "Edit Publication". Also note: the modal's ARIA `aria-labelledby="master-pub-modal-title"` points to a non-existent id — it should be `master-pub-modal-title-heading`.

**US-M10 (NEW): Convert Text Button Active During Phase Lock**
The "🪄 Convert Text" button is not disabled during locked phases (the convert action is read-only, so this is correct). However, within the Convert modal, "Import Preview" will fail with a server 409 when the phase is locked, with no upfront warning. Proposed: when the phase is locked, show a tooltip on "Import Preview" explaining that importing requires being in the pre-analysis or Final Review stage.

---

**Reviewed against:** web/index.html, web/master-cv.js, web/harvest.js, web/finalise.js, web/app.js, scripts/routes/master_data_routes.py, scripts/utils/conversation_manager.py, tasks/user-story-master-cv-curator.md

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-M1 | 3       | 0         | 0      | 0          | 0     |
| US-M2 | 4       | 0         | 0      | 0          | 0     |
| US-M3 | 0       | 1         | 0      | 0          | 0     |
| US-M4 | 9       | 0         | 0      | 0          | 0     |

**Key evidence references:**
- US-M1 session boundary: governance banner → `master-cv.js:110–115`
- US-M1 phase lock (client): `EDITABLE_PHASES` set → `master-cv.js:77`; button disable loop → `master-cv.js:826–836`
- US-M1 phase lock (server): `_require_master_data_write_phase()` → `master_data_routes.py:164–177`
- US-M2 harvest unchecked default: `harvest.js:107` — `shouldPreCheck()` always returns `false`
- US-M2 before/after panels: `harvest.js:170–178`
- US-M2 confirm on apply: `harvest.js:501–508`
- US-M3 finalise merges harvest: `finalise.js:339–341`
- US-M4 phase gate on publications write: `master_data_routes.py:1253,1332,1394`
- US-M4 round-trip extra fields: `master-cv.js:1518–1523`
- US-M4 import validation server-side: `master_data_routes.py:1424–1442`
- US-M4 import validation UI: `master-cv.js:1542–1549`
- US-M5 gap (experience bullets): `master-cv.js:872,904`
- US-M9 bug (duplicate id): `master-cv.js:316`; JS reference: `master-cv.js:1497,1526`

**Evidence standard:** Every conclusion supported by file:line evidence from source code. No gaps.md or ui-review.md consulted.
