<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# UI Review: Master CV Curator Persona
**Review Date:** 2026-07-01
**Reviewer:** master-cv-curator persona
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/routes/master_data_routes.py, scripts/routes/generation_routes.py, web/harvest.js, web/master-cv.js, web/publications-review.js

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

**PASS — with one advisory**

**Criterion 1 — Workflow distinguishes session editing from master-data maintenance.**
PASS. The workflow is architected as two distinct modes: per-application customisation (skills-review, exp-review, rewrite, etc.) and master-data maintenance (Master CV tab, harvest). The `state-manager.js` PHASES enum maps the conversation to clearly bounded stages (`init`, `customization`, `refinement`). The Master CV tab renders a prominent "Persistent storage" governance banner:

> "Edits on this tab write directly to Master_CV_Data.json and are not scoped to any session. Job-specific customisations (skills, experience picks, summaries) are stored exclusively in the active session and never written here automatically."

**Criterion 2 — The UI does not imply that temporary application edits have already updated the master record.**
PASS. Customisation-stage tabs (Skills, Experiences, etc.) operate on session-local state in `conversation.state`, not on `Master_CV_Data.json`. No UI element implies otherwise.

**Criterion 3 — Durable write-back occurs only through explicit user action.**
PASS. The backend enforces `_require_harvest_apply_phase` (must be in `refinement` phase) before any `POST /api/harvest/apply` is accepted. Master-data CRUD routes use `_require_master_data_write_phase` (must be `init` or `refinement`). The frontend shows a phase-lock banner when the Master CV tab is loaded in a non-editable stage.

**Advisory:** The phase-lock banner correctly blocks editing and shows the current stage name, but the wording says "Save or complete the current stage to re-enable editing." A curator may not know what "Save or complete the current stage" means in concrete terms. Clarifying (e.g., "Complete the current application workflow through to Refinement/Harvest to re-enable editing") would reduce confusion.

---

### US-M2: Harvest Review Quality

**PASS**

**Criterion 1 — Harvest candidates are presented in a reviewable form.**
PASS. `harvest.js` renders a grouped three-level hierarchy: category (Experience Bullets / Skills / Professional Summary) → recommendation (Promote / Skip / Unanalyzed) → confidence (High / Medium / Low). Each candidate shows its Before/After text. LLM reasoning is available via a toggleable button per candidate.

**Criterion 2 — Each candidate indicates what would be added or changed.**
PASS. Candidates include `original` (Before) and `proposed` (After) text, a type label, a source badge ("Added" or "Confirmed"), and a recommendation badge. The harvest page header states: "Review LLM-scored candidates for promotion to your master CV."

**Criterion 3 — Applying harvested changes is optional and selective.**
PASS. All checkboxes start unchecked (`shouldPreCheck` always returns false — commented "master CV updates are opt-in only (US-A11)"). The Apply button requires an explicit confirmation dialog before writing: "This will permanently write changes to your Master_CV_Data.json. A backup will be created first." Items can be selected individually.

**Minor finding:** When a user clicks Apply at the wrong workflow phase, the backend returns a 409 with the message "Harvest write-back is only available from the post-job finalise workflow." The Harvest tab does not pre-warn the user that Apply will be blocked until the Refinement phase. A curator who reaches the Harvest tab before completing the application steps will see this only after clicking Apply.

---

### US-M3: Boundary Clarity Across Final Stages

**PARTIAL PASS**

**Acceptance Criteria — Finalise/archive and harvest/apply appear as distinct steps with distinct consequences.**

The workflow bar clearly separates steps: "File Review → Cover Letter → Screening → Interview Prep → Thank You → Harvest." These are visually distinct workflow positions. The Harvest tab title reads "Harvest Improvements" and the Master CV tab reads "Master CV Profile," making the purpose of each clear.

However, the terms "Finalise" and "Refinement" are used inconsistently:
- The workflow nav step and tab are labelled "Harvest."
- The backend phase is called `refinement`.
- A former "Finalise" tab exists in the HTML (`tab-finalise`) but is hidden (`style="display:none"`).
- The achievement section in `master-cv.js` still says "The Harvest feature (Finalise tab) can add new ones from your current session" — referencing the old "Finalise" label when the tab is now "Harvest."
- The `_require_harvest_apply_phase` docstring says "Allow harvest write-back only from the post-job finalise window" using the now-unused "finalise" terminology.

The mismatch between "Harvest" (UI), "Finalise" (stale internal references), and "Refinement" (backend phase name, never shown in UI) creates mild but real terminology confusion for a curator trying to understand when durable writes are permitted.

**GAP candidate (minor):** The stale reference "Finalise tab" in `master-cv.js` (~line 285) should read "Harvest tab."

---

### US-M4: Maintain the Master Publications Bibliography

**PASS — with two advisories**

**Criterion 1 — Publication editing is clearly presented as master-data maintenance, not per-application customization.**
PASS. Publications management lives exclusively on the Master CV tab (accessible via the "📚 Master CV" header button and the Master tab in the viewer). The tab carries the governance banner. The workflow's "Publications" tab (tab-publications-review, shown only during Customise stage) controls per-session include/exclude decisions — not master-data writes — and is labeled "Selected Publications" not "Manage Publications."

**Criterion 2 — The workflow supports structured BibTeX editing and easier ingestion paths.**
PASS. The Master CV tab Publications section provides four paths:
- Structured CRUD view (default): Add, Edit, Delete
- Raw BibTeX textarea editor: toggle "Raw BibTeX"
- Import BibTeX modal: paste bulk BibTeX, merge or overwrite
- Convert Text modal: paste free-form citation text → LLM generates BibTeX → review in textarea → import

All four paths are accessible from the Publications section header in the Master CV tab.

**Criterion 3 — Saving through the UI preserves bibliography data rather than stripping fields.**
PASS. The raw-BibTeX save path (`PUT /api/master-data/publications`) validates, backs up, then writes the full content verbatim. The structured CRUD path (`POST /api/master-data/publication`) stores the entire `fields` dict as provided and re-serializes via `serialize_publications_to_bibtex` without filtering. Round-trip preservation is maintained by the pass-through `fields` dict architecture.

**Acceptance Criteria — status table:**

| Criterion | Status | Notes |
|-----------|--------|-------|
| Master CV tab shows bibliography in reviewable list view | PASS | Structured CRUD with formatted APA citations |
| Can add, edit, delete entries | PASS | Buttons present in structured view |
| Can import raw BibTeX and review validation errors before save | PASS | Import modal reports added/updated/skipped/rejected with per-key detail; missing title/year/author entries are listed as "rejected" |
| Can paste citation text, review generated BibTeX, decide whether to import | PASS | Convert Text modal: input → Generate BibTeX → review textarea → Import |
| Flags missing key fields (title, author, year) | PASS | Import path validates per-entry; save path rejects entries missing title+year+author; add/update routes enforce these fields server-side |
| Writes to publications.bib only in init/refinement windows | PASS | PUT/POST/import routes all call `_require_master_data_write_phase`. The convert route does NOT (it is a preview-only LLM call that does not write to disk — the subsequent import applies the gate) |
| Round-trip editing preserves existing BibTeX information | PASS | Raw content written verbatim; structured CRUD stores fields dict intact |

**Advisory 1 — Convert route phase hint missing:** `POST /api/master-data/publications/convert` (LLM text-to-BibTeX preview) does not apply the phase gate — correctly, since it does not write to disk. However, a curator who converts text during the Customise phase will see no error until they click "Import" in the modal, at which point they receive a 409 from the import route. Adding a brief note in the Convert modal — "Preview is always available; importing requires the Init or Harvest/Refinement phase" — would set correct expectations.

**Advisory 2 — Phase lock not surfaced at the Publications section level:** The phase-lock banner appears at the top of the Master CV tab. A curator scrolled down to the Publications section may not notice it. Disabling the Save/Import/Add buttons or adding a compact inline lock notice within the Publications section header when the phase is non-writable would make the boundary more visible.

---

## Generated Materials Evaluation

This persona's scope focuses on master-data boundary enforcement, harvest review quality, and bibliography management rather than generated PDF/DOCX content. No generated-materials evaluation criteria appear in the story file.

From a curator's perspective: the `POST /api/harvest/apply` route creates a timestamped backup before writing (`Master_CV_Data_{backup_ts}.json`), then performs a git commit with a message recording the session's company and role. The backup path is surfaced in the UI confirmation message. This behavior correctly provides the curator with an audit trail and undo path for durable master-data updates.

---

## Terminology Clarity Evaluation

| Term | Where used | Clarity | Notes |
|------|-----------|---------|-------|
| "Master CV" | UI header button, tab label, governance banner | Clear | Consistent |
| "Harvest" | Workflow step, tab label, `/api/harvest/*` | Clear | Consistent in the UI |
| "Refinement" | Backend phase name only | Opaque to users | Never surfaced in UI; curators see "Harvest" in the workflow step |
| "Finalise" | Stale reference in master-cv.js achievement section; old tab still in HTML | Confusing | Old label no longer shown; stale text says "Finalise tab" |
| "Promote" | Harvest candidate action label | Acceptable | Clear for a power user; "Add to Master CV" might be clearer for first-time curators |
| "Post-job finalise window" | API 409 error message text | Confusing if seen | Maps to "Refinement" phase internally; maps to "Harvest" step in UI; message uses neither term correctly |
| "Session-scoped" | Governance banner paraphrase | Clear | Explains the boundary well |

---

## Summary of Findings

| Story | Status | Key Finding |
|-------|--------|-------------|
| US-M1: Session-Only Customization Boundary | PASS | Phase gates enforced at backend and UI; advisory on phase-lock banner wording |
| US-M2: Harvest Review Quality | PASS | Opt-in checkboxes, Before/After diff, LLM reasoning, confirmation dialog; minor: no pre-warning that Apply is phase-gated |
| US-M3: Boundary Clarity Across Final Stages | PARTIAL PASS | Stale "Finalise tab" reference in master-cv.js; "refinement" phase not mapped to any visible UI term |
| US-M4: Maintain the Master Publications Bibliography | PASS | All four ingestion paths implemented and phase-gated; two minor advisories on convert hint and per-section lock banner |

### Open Gaps

1. **(Minor, stale label)** `web/master-cv.js` ~line 285: "The Harvest feature (Finalise tab) can add new ones" should read "Harvest tab."
2. **(Advisory)** Phase-lock banner granularity: consider propagating the lock indicator to the Publications section header so curators deep in the page see the constraint without scrolling.
3. **(Advisory)** Convert-then-import phase feedback: the Convert Text modal should note that importing will be blocked in non-writable phases, rather than letting the user generate BibTeX and fail with a 409 at import time.
4. **(Terminology)** The 409 error message from phase-gate enforcement references "post-job finalise workflow" — a term that no longer appears in the UI. Aligning this to "Harvest step" or "Refinement phase" would reduce curator confusion if the error surfaces.
