<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# UI Review: Recruiter / Application Operations Perspective

**Review cycle:** Cycle 7 (updated)
**Date:** 2026-06-30

**Source files read:**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/finalise.js`
- `web/download-tab.js`
- `web/final-generate.js`
- `web/cover-letter.js` (consistency report section)
- `web/review-table-base.js` (switchTab / loadTabContent)
- `web/ui-helpers.js` (action button map)
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `scripts/routes/generation_routes.py`
- `scripts/utils/cv_orchestrator.py` (grep)

**GAP fixes verified in this pass:**

- GAP-235: `GET /api/finalise-meta` returns `application_status` and `notes` from `metadata.json`; `_restoreFinaliseMeta()` in `web/finalise.js` pre-populates `#finalise-status` and `#finalise-notes` on tab load.
- GAP-236: `#finalise-notes` has `maxlength="2000"`; `#finalise-notes-counter` updates live on `oninput` and is refreshed after `_restoreFinaliseMeta()` restores saved notes.

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

#### EC 1: Final outputs are clearly visible and distinguishable

✅ Pass — `web/download-tab.js` lines 21–74 (`_collectDownloadableFiles`) builds a typed list distinguishing PDF, ATS DOCX, Human DOCX, HTML, cover letter (`CoverLetter_` prefix), and screening (`Screening_` prefix). Each file gets a unique icon and descriptive label (e.g., "ATS-optimised PDF — machine-readable for automated screening" vs. "Human-readable PDF — for human reviewers and printing"). The download grid renders each file card in `_renderDownloadGrid` (lines 159–224) with icon, filename, description, optional timestamp, and a Download button or Blocked badge.

#### EC 2: The UI makes clear which files are available and current

⚠️ Partial — The File Review tab (`web/download-tab.js` line 310, `populateDownloadTab`) shows the generated files list with a "Generated `{timestamp}`" label per file when `cvData.metadata?.generation_date` is set (line 356). The layout freshness chip in the position bar (`state-manager.js`) surfaces "Files outdated" and "Layout current" signals. However:

- The per-file "Generated" timestamp is shown only when `cvData.metadata?.generation_date` is non-null. No explicit contract guarantees this field is always populated by the backend, so the timestamp may be silently omitted.
- The File Review tab (`tab-download`) and the "Generated Files" tab (`tab-final_generate`) both live under the `download` workflow stage (STAGE_TABS in `ui-core.js` line 357). A user who visits only one of these tabs may not realise the other also contains downloadable links; there is no cross-reference between them.

#### EC 3: Finalise/archive actions are clearly separated from earlier preview steps

✅ Pass — The Finalise tab (`id="tab-finalise"`, `index.html` line 227) is hidden from the tab strip by default (`style="display:none"`). It is reached exclusively via the "📦 Package Application Files" action button (`id="finalise-action-btn"`, `index.html` line 198), which fires `switchTab('finalise')` (`app.js` line 137). The Finalise tab page (`finalise.js` lines 42–127) renders its own "Finalise & Archive" form in a visually distinct card, separate from all earlier File Review and Download steps. The Submission Readiness checklist (`finalise.js` lines 151–202) appears at the top of the Finalise tab, making readiness clearly visible before the archive action.

**Acceptance criteria verdict:** ⚠️ Partially met. The submission readiness checklist clearly distinguishes required (❌) from optional (⚠) items. The main remaining gaps are the conditional file timestamp and the dual-tab arrangement in the Download stage.

---

### US-O2: Application Metadata and Tracking

#### EC 1: Status values are understandable and actionable

✅ Pass — The Finalise tab (`finalise.js` lines 91–98) renders a `<select>` with six human-readable options:

```text
draft      → "Draft — not yet sent"
ready      → "Ready to send"    (default selected)
sent       → "Sent"
interview  → "Interview scheduled"
rejected   → "Rejected"
accepted   → "Accepted"
```

These match the backend validation in `generation_routes.py` line 1952. The sessions modal also renders inline coloured status badges for saved sessions, enabling at-a-glance tracking across multiple applications.

#### EC 2: Notes are captured at the point of finalisation

✅ Pass — The Finalise tab renders a freeform notes textarea (`id="finalise-notes"`, `finalise.js` lines 102–108) with the contextual placeholder: "Recruiter name, salary info, follow-up date, interview notes…". This placeholder directly signals recruiter-tracking use cases. The textarea appears in the same "Application Status" card immediately before the "Finalise & Archive" button (`finalise.js` lines 109–115), at the natural action point in the workflow.

**GAP-236 verified:** `maxlength="2000"` is present on the `<textarea>` (`finalise.js` line 103). A live character counter (`id="finalise-notes-counter"`) initialises at "0 / 2000" and updates on every `oninput` event (`finalise.js` line 104), with colour changes at 1600 (amber) and 1800 (red) characters. This eliminates the silent truncation risk identified in the previous cycle.

#### EC 3: Archive behaviour preserves the context needed for later follow-up

⚠️ Partial — `finaliseApplication()` (`finalise.js` lines 252–335) POSTs `{ status, notes }` to `/api/finalise`. The backend (`generation_routes.py` lines 1964–1966) writes these to `metadata.json` alongside session state. The sessions modal reads `application_status` back for display in the session table. The metadata PATCH endpoint supports post-hoc status updates from the session list.

**GAP-235 verified:** `GET /api/finalise-meta` (`generation_routes.py` lines 1880–1901) returns `application_status` and `notes` from `metadata.json`. `_restoreFinaliseMeta()` (`finalise.js` lines 129–147) is called at the end of `populateFinaliseTab` and pre-populates both `#finalise-status` and `#finalise-notes`. The character counter is also updated after restore (`finalise.js` lines 139–143). This resolves the P2 (notes not pre-populated on re-open) and P3 (silent truncation) findings from the previous cycle.

Remaining gap — Notes not editable post-archive: The sessions modal inline-edit widget exposes a status dropdown per saved session row but does not expose a notes input field. After archival, notes can only be changed by re-opening the session and going through the Finalise tab again (which will now correctly pre-populate). A standalone "edit notes" path from the sessions list does not exist.

**Acceptance criteria verdict:** ⚠️ Partially met. Status tracking is well-implemented end-to-end. Notes capture at finalise time is in place, with character limit enforcement (GAP-236) and restore-on-reopen (GAP-235) now working. The remaining gap is the absence of a post-archive notes edit path in the sessions modal.

---

### US-O3: File Naming and Package Hygiene

#### EC 1: Generated files use job-relevant naming

✅ Pass — `cv_orchestrator.py` builds filename bases from company and role slugs extracted from the job description:

- Line 1432: `filename_base = f"CV_{company}_{role}_{timestamp}"` (human PDF/HTML)
- Line 2056: `output_name = f"{company}_{role_slug}_{timestamp}"` (alternate pass)
- ATS DOCX: `filename = f"CV_{company}_{role}_{timestamp}_ATS.docx"` (`generation_routes.py` grep match)
- Preview pass: `filename_base = f"CV_{company}_{role_slug}_{timestamp}_preview"` (line 2298)
- Cover letter: `filename = f"CoverLetter_{company}_{role}_{date_str}.docx"` (`master_data_routes.py` line 1700)
- Screening: `filename = f"Screening_{company_s}_{role_s}_{date_str}.docx"` (`master_data_routes.py` line 1971)

Session directories adopt the `{CompanySlug}_{RoleSlug}_{date}` pattern via `_rename_session_dir` (`conversation_manager.py`), called after job analysis.

#### EC 2: File review surfaces present outputs in a manageable way

✅ Pass — `_collectDownloadableFiles` (`download-tab.js` lines 21–74) deduplicates files and groups them with icon, description, and format metadata. `_renderDownloadGrid` (lines 159–224) renders each as a card with icon, filename, description, optional timestamp, and a Download button or Blocked badge. The File Review tab also runs ATS validation (`/api/ats-validate`) and presents a pass/warn/fail table so the user can assess output quality before downloading. The "Blocked" state greys out format-specific download buttons when corresponding ATS checks fail.

#### EC 3: Multiple generation passes do not obscure which output is current

⚠️ Partial — The layout freshness chip (`state-manager.js`) shows "Files outdated" when `contentRevision > lastFinalContentRevision`. However:

- When the user runs multiple generation passes, old files remain on disk. The distinction between preview-only HTML (suffix `_preview`) and final delivery files is communicated only through the filename suffix; this naming convention is not annotated in the download card UI.
- The "Generated Files" tab (`tab-final_generate`) and the "File Review" tab (`tab-download`) coexist in the `download` workflow stage (STAGE_TABS `ui-core.js` line 357). After final generation, both tabs are visible simultaneously. Neither tab explains its relationship to the other or which is the authoritative delivery checkpoint.

**Acceptance criteria verdict:** ⚠️ Partially met. File naming is job-relevant and the filesystem hygiene is good. The distinction between preview and final files is not surfaced in the UI, and the dual-tab Download stage layout creates ambiguity about which tab is the delivery checkpoint.

---

## Generated Materials Evaluation

Generated files use structured, job-relevant naming (`CV_{Company}_{Role}_{date}.pdf`, `CoverLetter_{Company}_{Role}_{date}.docx`, etc.). Files are presented in the File Review tab with descriptive labels distinguishing ATS and human-readable formats. ATS validation results in the File Review tab give the reviewer a quality signal before downloading. No evaluation of rendered document content was conducted in this pass (source-only review).

---

## Summary Table

| Story | Criterion | Status | Source evidence |
| --- | --- | --- | --- |
| US-O1 EC1 | Final outputs visible and distinguishable | ✅ Pass | `download-tab.js:21–74` — typed file list with icons and descriptions |
| US-O1 EC2 | UI shows which files are current | ⚠️ Partial | Timestamp conditional on `metadata.generation_date`; dual-tab ambiguity (`ui-core.js:357`) |
| US-O1 EC3 | Finalise clearly separated from preview | ✅ Pass | `index.html:198,227`; `app.js:137`; Finalise tab hidden by default |
| US-O2 EC1 | Status values understandable and actionable | ✅ Pass | `finalise.js:91–98`; six clear labels with colour coding in sessions modal |
| US-O2 EC2 | Notes captured at finalisation | ✅ Pass | `finalise.js:102–108`; contextual placeholder; `maxlength="2000"`; live counter (GAP-236) |
| US-O2 EC3a | Archive preserves tracking context | ✅ Pass | `generation_routes.py:1964–1966`; `metadata.json` write-through |
| US-O2 EC3b | Notes and status pre-populated on re-open | ✅ Pass | `GET /api/finalise-meta` (`generation_routes.py:1880`); `_restoreFinaliseMeta()` (`finalise.js:129–147`) — GAP-235 resolved |
| US-O2 EC3c | Notes truncation communicated | ✅ Pass | `maxlength="2000"` on textarea + live `#finalise-notes-counter` — GAP-236 resolved |
| US-O2 EC3d | Notes editable after archival (sessions modal) | ❌ Fail | Sessions modal inline-edit exposes status only; no notes textarea for post-archive editing |
| US-O3 EC1 | Job-relevant file naming | ✅ Pass | `cv_orchestrator.py:1432`; `master_data_routes.py:1700,1971`; `{Company}_{Role}_{timestamp}` pattern |
| US-O3 EC2 | File review manageable | ✅ Pass | `download-tab.js:159–224`; deduplication, ATS validation, blocked-format badges |
| US-O3 EC3 | Multiple passes do not obscure current output | ⚠️ Partial | `_preview` suffix unexplained in UI; dual-tab `final_generate`/`download` has no disambiguation prose |

---

## Priority Findings

### P1 — Notes not editable after archival from sessions modal (❌)

**Location:** `web/session-switcher-ui.js` (inline status widget); `web/finalise.js` lines 252–335 (finalise submit).

**Impact:** A recruiter who needs to update follow-up information (interview outcome, salary negotiation details, next-step date) after the session is archived has no UI path in the sessions modal to edit notes. The existing PATCH endpoint accepts a `notes` field but it is not surfaced there. Re-opening the session and going to the Finalise tab will now correctly show saved notes (GAP-235), but this is a friction-heavy path for a quick annotation update.

**Fix:** Add a notes textarea to the inline-edit widget in `session-switcher-ui.js`, wiring it to the existing `PATCH /api/sessions/metadata` endpoint.

### P2 — Preview vs. final file distinction not annotated in UI (⚠️)

**Location:** `web/download-tab.js:_collectDownloadableFiles` (lines 21–74); `web/final-generate.js`.

**Impact:** Preview files (`_preview.html`) and final delivery files (`.pdf`, `.docx`) may both appear in the File Review tab. The only differentiator is the filename suffix, which is not annotated in the download card description. A recruiter might download the preview HTML thinking it is the final deliverable.

**Fix:** Detect the `_preview` substring in `_collectDownloadableFiles` and set `description` to "Preview — not for submission" for those files, or exclude preview files from the File Review tab once final files are present.

### P3 — Dual-tab ambiguity in Download stage (⚠️)

**Location:** `web/ui-core.js:STAGE_TABS` line 357 (`download: ['final_generate', 'download']`); `web/index.html` lines 225–226.

**Impact:** Once the user reaches the Download stage, both "Generated Files" and "File Review" tabs appear. Neither tab explains its relationship to the other. A recruiter may download from "Generated Files" without realising the "File Review" tab contains ATS validation results that could indicate output quality issues.

**Fix:** Add a short cross-reference note in each tab's header, or consolidate the two tabs into a single view with ATS validation above and download links below.

### P4 — File generation timestamp not guaranteed (⚠️)

**Location:** `web/download-tab.js` line 356 (`cvData.metadata?.generation_date`); `scripts/web_app.py:StatusResponse`.

**Impact:** When the backend omits `generation_date` from `generated_files`, each file card shows no timestamp and the user cannot determine when the output was produced.

**Fix:** Add `generation_date` to the `generated_files` sub-schema and ensure it is always populated by `cv_orchestrator.py` at generation time.
