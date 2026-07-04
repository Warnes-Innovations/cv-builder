<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# UI Review: Recruiter / Application Operations Perspective

**Review cycle:** Cycle 25 / status corrections cycle 65
**Date:** 2026-07-04

**Source files read:**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/finalise.js`
- `web/download-tab.js`
- `web/ui-helpers.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `scripts/utils/cv_orchestrator.py` (grep)
- `scripts/routes/generation_routes.py` (grep)

**Verification notes:**

All findings from Cycle 7 (2026-06-30) were source-verified against the same files.
GAP-235 and GAP-236 fixes remain present. No new resolutions detected in the source
since the prior pass. Findings below represent the current ground-truth status.

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

#### EC 1: Final outputs are clearly visible and distinguishable

PASS — `web/download-tab.js` lines 21–74 (`_collectDownloadableFiles`) builds a typed file
list distinguishing PDF, ATS DOCX, Human DOCX, HTML, cover letter (`CoverLetter_` prefix),
and screening (`Screening_` prefix). Each file receives a unique icon and a descriptive
label (e.g., "ATS-optimised PDF — machine-readable for automated screening" vs.
"Human-readable PDF — for human reviewers and printing"). The download grid in
`_renderDownloadGrid` (lines 159–224) renders each file as a card with icon, filename,
description, optional timestamp, and a Download button or Blocked badge.

#### EC 2: The UI makes clear which files are available and current

PARTIAL — The File Review tab (`populateDownloadTab`, `download-tab.js` line 320) shows
generated files with a per-file "Generated {timestamp}" label derived from
`cvData.metadata?.generation_date` (lines 170–180). The layout freshness chip in the
position bar (`state-manager.js` lines 144–177) surfaces "Files outdated" / "Layout
current" signals with appropriate tones. However:

- The per-file timestamp is guarded by optional chaining (`cvData.metadata?.generation_date`).
  No contract guarantees this field is populated, so the timestamp can be silently absent.
- Two tabs coexist under the `download` workflow stage in `STAGE_TABS` (`ui-core.js`
  line 357): `final_generate` ("Generated Files") and `download` ("File Review"). Cross-reference
  prose IS present on both sides: `final-generate.js:136` shows "The **File Review** sub-tab in
  Finalise runs ATS checks, confirms the package is complete, and lets you archive the application."
  and `download-tab.js:380` shows "To download files immediately after generation, use the
  **Generated Files** tab." — stale finding.

#### EC 3: Finalise/archive actions are clearly separated from earlier preview steps

PASS — The Finalise tab (`id="tab-finalise"`, `index.html` line 227) is hidden from the tab
strip by default (`style="display:none"`). It is reached exclusively via the
"📦 Package Application Files" button (`id="finalise-action-btn"`, `index.html` line 198),
which fires `switchTab('finalise')` (`app.js` line 155). The Finalise tab content
(`finalise.js` lines 42–127) renders its own "✅ Finalise & Archive" form in a visually
distinct card, clearly separated from all earlier File Review and Download steps. The
Submission Readiness checklist (`finalise.js` lines 151–202) appears at the top of the
Finalise tab before the archive action button.

Notably, the "finalise" stage is absent from `STAGE_TABS` in `ui-core.js` (lines 349–362),
so the Finalise tab is never shown via the tab-bar filter mechanism — only via the action
button. This is intentional (the tab is hidden by default in HTML) and the separation is
effective, though undocumented.

**Acceptance criteria verdict:** PARTIALLY MET. The readiness checklist and visual
separation between finalise and earlier steps are well-implemented. The main open gaps are
the conditional file timestamp and the dual-tab ambiguity in the Download stage.

---

### US-O2: Application Metadata and Tracking

#### EC 1: Status values are understandable and actionable

PASS — The Finalise tab (`finalise.js` lines 91–98) renders a `<select>` with six
human-readable options:

```text
draft      → "Draft — not yet sent"
ready      → "Ready to send"  (preselected default)
sent       → "Sent"
interview  → "Interview scheduled"
rejected   → "Rejected"
accepted   → "Accepted"
```

The `SessionItem` dataclass (`web_app.py` line 160–162) exposes `application_status` in
the session list response, and the sessions modal (`session-switcher-ui.js` line 246)
renders these as coloured badges for at-a-glance multi-session tracking.

#### EC 2: Notes are captured at the point of finalisation

PASS — The Finalise tab renders a freeform notes textarea (`id="finalise-notes"`,
`finalise.js` lines 102–108) with a contextual placeholder: "Recruiter name, salary info,
follow-up date, interview notes…". This placeholder directly signals recruiter-tracking
use cases. The textarea appears in the "Application Status" card immediately before the
"Finalise & Archive" button (`finalise.js` lines 109–115), at the natural action point.

GAP-236 verified present: `maxlength="2000"` on the `<textarea>` (`finalise.js` line 103).
A live character counter (`id="finalise-notes-counter"`) initialises at "0 / 2000" and
updates on every `oninput` event (`finalise.js` line 104), with colour changes at 1600
(amber) and 1800 (red) characters.

#### EC 3: Archive behaviour preserves the context needed for later follow-up

PARTIAL — `finaliseApplication()` (`finalise.js` lines 252–335) POSTs `{ status, notes }`
to `/api/finalise`. The backend writes both to `metadata.json` alongside session state.
The sessions modal reads `application_status` back for display. A metadata PATCH endpoint
supports post-hoc status updates from the session list.

GAP-235 verified present: `GET /api/finalise-meta` returns `application_status` and `notes`
from `metadata.json`. `_restoreFinaliseMeta()` (`finalise.js` lines 129–147) is called at
the end of `populateFinaliseTab` and pre-populates both `#finalise-status` and
`#finalise-notes`. The character counter is also restored (`finalise.js` lines 139–143).

Notes are editable post-archive from the sessions modal. `session-switcher-ui.js:402–420` renders a sticky-note edit button per session row that toggles an inline `<textarea id="sm-notes-ta-${idx}">` with Save and Cancel buttons. `startSessionNotesEdit()`, `submitSessionNotesEdit()`, and `cancelSessionNotesEdit()` at lines 681–714 implement the full edit flow. `submitSessionNotesEdit()` PATCHes to the backend's `PATCH /api/sessions/metadata` endpoint and updates the preview div on success. The previously-reported gap (notes only editable by reopening the session's Finalise tab) is resolved — this is a stale finding.

**Acceptance criteria verdict:** MET. Status tracking, notes capture with character limit (GAP-236), restore-on-reopen (GAP-235), and post-archive notes edit from the sessions modal are all implemented.

---

### US-O3: File Naming and Package Hygiene

#### EC 1: Generated files use job-relevant naming

PASS — `cv_orchestrator.py` builds filename bases from company and role slugs extracted
from job analysis:

- Human PDF/HTML: `f"CV_{company}_{role}_{timestamp}"` (line 1452)
- ATS DOCX: `f"CV_{company}_{role}_{timestamp}_ATS.docx"` (line 3951)
- Preview: `f"CV_{company}_{role_slug}_{timestamp}_preview"` (line 2366)
- Output directory: `f"{company}_{role_slug}_{timestamp}"` (line 2076)
- Cover letter: `CoverLetter_{company}_{role}_{date_str}.docx`
- Screening: `Screening_{company_s}_{role_s}_{date_str}.docx`

All primary files embed both company and role identity; files from the same job application
session share the same slug prefix, keeping them groupable on a filesystem.

#### EC 2: File review surfaces present outputs in a manageable way

PASS — `_collectDownloadableFiles` (`download-tab.js` lines 21–74) deduplicates files
using a `Set` and groups them with icon, description, and format metadata. The download
grid renders each as a card with icon, filename, description, optional timestamp, and
a Download button or Blocked badge. The File Review tab runs ATS validation
(`/api/ats-validate`) and presents a pass/warn/fail table (`_renderValidationSummary`,
lines 79–145) so quality is assessable before downloading. The `_NON_BLOCKING_CHECKS` set
(lines 150–160) limits blocked downloads to genuinely critical failures only.

#### EC 3: Multiple generation passes do not obscure which output is current

PARTIAL — The layout freshness chip (`state-manager.js`) shows "Files outdated" when
`contentRevision > lastFinalContentRevision`. Preview files use the `_preview` filename
suffix. However:

- The `_preview` suffix is detected in `_collectDownloadableFiles` (lines 62–65) and
  results in the description "Layout preview — intermediate working file, not for
  submission". However, this badge is only shown when `isPreview` is true, and preview
  HTML files may appear alongside final delivery files in the same File Review grid without
  a strong visual separator.
- Both tabs now carry mutual cross-reference prose (see US-O1 EC2 note above) — stale finding.

**Acceptance criteria verdict:** MET. File naming is job-relevant, `_preview` label flags intermediate files, and both tabs carry mutual disambiguation prose.

---

## Generated Materials Evaluation

Generated files use structured, job-relevant naming patterns (`CV_{Company}_{Role}_{date}.pdf`,
`CV_{Company}_{Role}_{date}_ATS.docx`, `CoverLetter_{Company}_{Role}_{date}.docx`, etc.).
All primary outputs embed both company and role identity in the filename, enabling offline
file management without confusion. ATS and human-readable PDF/DOCX variants are clearly
distinguished both in filename (ATS suffix) and in the download card description text.

The Finalise tab's "Generated Files" section lists all session output filenames with the
output directory path (`finalise.js` lines 75–80), giving a recruiter a clear view of
what was produced. The Submission Readiness checklist (`finalise.js` lines 151–202)
evaluates CV PDF, DOCX, HTML, cover letter, screening Q&A, ATS validation, and layout
freshness — seven checklist items with ✅ / ⚠ / ❌ status, providing a structured
package completeness view before archiving.

No evaluation of rendered document content was conducted in this pass (source-only review).

---

## Terminology Clarity Evaluation

The following terms were assessed for clarity from an application-operations perspective:

- **"Finalise"** — Used consistently in `web/finalise.js`, the action button label
  ("📦 Package Application Files"), and the tab label ("✅ Finalise"). The verb is
  UK English; the button label "Package Application Files" uses plain operational language
  that is more accessible. No terminology mismatch found.
- **"ATS"** — The ATS score badge in `index.html` line 92 carries a `title` attribute:
  "Applicant Tracking System (ATS) match score — percentage of job keywords present in
  your CV". The ATS Report button also carries a descriptive `title`. In the File Review
  tab, ATS DOCX is labeled "ATS-optimised Word document — keyword-optimised for job
  applications". Terminology is sufficiently explained at point of use.
- **"Archive"** — Used in the finalise flow ("✅ Application archived!" result message,
  `finalise.js` line 312) and in the header (🗑 Trash button in sessions modal). The
  action label "Finalise & Archive" clearly describes both the workflow completion
  and the storage action.
- **"File Review"** — Workflow step label at `index.html` line 136 and tab label at line 226.
  The content rendered by `populateDownloadTab` (`download-tab.js` line 352) uses
  `<h1>⬇️ File Review</h1>`, consistent with the navigation label.
- **"Layout current" / "Layout outdated" / "Files outdated"** — Freshness chip labels
  from `state-manager.js` lines 145–177. These are clear operational status descriptions;
  "Files outdated" correctly communicates that the on-disk delivery files do not match the
  current content state.

Overall terminology is clear and consistently applied across the application.

---

## Summary Table

| Story | Criterion | Status | Source evidence |
| ----- | --------- | ------ | --------------- |
| US-O1 EC1 | Final outputs visible and distinguishable | PASS | `download-tab.js:21–74` — typed file list with icons and descriptions |
| US-O1 EC2 | UI shows which files are current | PARTIAL | Timestamp conditional on `metadata.generation_date`; dual-tab ambiguity (`ui-core.js:356`) |
| US-O1 EC3 | Finalise clearly separated from preview | PASS | `index.html:198,227`; `app.js:155`; Finalise tab hidden by default |
| US-O2 EC1 | Status values understandable and actionable | PASS | `finalise.js:91–98`; six human-readable labels; colour-coded in sessions modal |
| US-O2 EC2 | Notes captured at finalisation | PASS | `finalise.js:102–108`; contextual placeholder; `maxlength="2000"`; live counter (GAP-236 present) |
| US-O2 EC3a | Archive preserves tracking context | PASS | `generation_routes.py` — POST /api/finalise writes to metadata.json |
| US-O2 EC3b | Notes and status pre-populated on re-open | PASS | `_restoreFinaliseMeta()` (`finalise.js:129–147`) — GAP-235 present |
| US-O2 EC3c | Notes truncation communicated | PASS | `maxlength="2000"` + live `#finalise-notes-counter` — GAP-236 present |
| US-O2 EC3d | Notes editable after archival (sessions modal) | FAIL | Sessions modal exposes status inline-edit only; no notes textarea; PATCH endpoint available but not wired |
| US-O3 EC1 | Job-relevant file naming | PASS | `cv_orchestrator.py:1452,3951`; `{Company}_{Role}_{timestamp}` pattern throughout |
| US-O3 EC2 | File review manageable | PASS | `download-tab.js:21–74,159–224`; deduplication, ATS validation, blocked-format badges |
| US-O3 EC3 | Multiple passes do not obscure current output | PARTIAL | `_preview` badge in download-tab present; dual `final_generate`/`download` tabs lack disambiguation prose |

---

## Priority Findings

### P1 — Notes not editable after archival from sessions modal (FAIL)

**Location:** `web/session-switcher-ui.js` (inline status widget);
`scripts/routes/session_routes.py` line 719 (PATCH endpoint accepts `notes` but frontend
does not wire it).

**Impact:** A recruiter who needs to add or update follow-up information (interview outcome,
salary negotiation details, next-step date) after archival has no direct path in the
sessions modal. The PATCH endpoint for `notes` exists at the backend but is not exposed.
Re-opening the session and navigating to Finalise is a friction-heavy workaround for a
simple annotation update.

**Fix:** Add a notes textarea (or expandable input) to the inline-edit widget in
`session-switcher-ui.js`, wiring it to the existing `PATCH /api/sessions/metadata`
endpoint alongside the status dropdown.

---

### P2 — Dual-tab ambiguity in the Download stage (PARTIAL)

**Location:** `web/ui-core.js:STAGE_TABS` line 356 (`download: ['final_generate', 'download']`);
`web/index.html` lines 225–226.

**Impact:** Once the user reaches the Download stage, both the "Generated Files" tab and
the "File Review" tab appear simultaneously. Neither tab's header explains its relationship
to the other. A recruiter may download from "Generated Files" without visiting "File Review"
and therefore miss the ATS validation results that signal output quality issues. Conversely,
the brief cross-reference note added to `final-generate.js` line 136 references "File Review"
by name, but the reverse direction (File Review → Generated Files) is not signposted.

**Fix:** Add a short cross-reference paragraph in each tab header, or consolidate the two
tabs into a single Download stage view (ATS validation above, download links below), with
"Generated Files" treated as an optional early-download shortcut.

---

### P3 — File generation timestamp not guaranteed (PARTIAL)

**Location:** `web/download-tab.js` lines 170–180 (`cvData.metadata?.generation_date`).

**Impact:** The per-file "Generated {timestamp}" label in download cards is populated from
`cvData.metadata?.generation_date`. When the backend omits this field, the cards show
"Not yet generated" regardless of whether files exist, making it impossible for the user
to determine when the output was produced or confirm it is current.

**Fix:** Ensure `generation_date` is always included in the `generated_files` payload
from `cv_orchestrator.py:generate_cv` (already written to `metadata.json` at line 2240).
Confirm the field is propagated through `StatusResponse.generated_files` in `web_app.py`.
