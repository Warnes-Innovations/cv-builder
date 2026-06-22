<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter-Ops Persona Review

**Persona:** Recruiter / Application Operations Reviewer
**Review date:** 2026-06-20
**Cycle:** 5
**Review time:** ~10:00 ET
**Source files examined (canonical — not bundle.js):**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/finalise.js`
- `web/download-tab.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `scripts/routes/generation_routes.py`
- `scripts/routes/master_data_routes.py`
- `scripts/routes/session_routes.py`
- `web/session-switcher-ui.js`

---

## Changes Since Cycle 4

### Bugs Fixed: GAP-OPS-A and GAP-OPS-B Resolved

**Cycle 4 top gaps #1 and #2 resolved.**

- **GAP-OPS-A (Screening DOCX not in Download/Finalise tab):** `master_data_routes.py:1924–1929` — `POST /api/screening/save` now registers `filename` into `generated_files.files` via `gen.setdefault('files', [])` / `files_list.append(filename)`. The screening DOCX now appears in the Download and Finalise tab file lists.

- **GAP-OPS-B (Cover letter DOCX not in Download/Finalise tab):** `master_data_routes.py:1672–1677` — `POST /api/cover-letter/save` now registers `filename` into `generated_files.files` with the same pattern. The cover letter DOCX now appears in the Download and Finalise tab file lists.

Both fixes follow the same code pattern: `gen = conversation.state.setdefault('generated_files', {}); files_list = gen.setdefault('files', []); if filename not in files_list: files_list.append(filename)`.

### No other structural changes affecting recruiter-ops scope

The finalise tab, archive flow, application status fields, session modal, success card content, and per-file timestamp display are unchanged from cycle 4.

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

**Story:** As a recruiter or application-operations reviewer, I want to know when the application package is complete and ready to send, so that the finalisation step represents a trustworthy readiness checkpoint.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Final outputs clearly visible and distinguishable | ✅ Pass | `download-tab.js:43–73` — `_collectDownloadableFiles` builds file cards with format-specific icon, filename, and description. Cover letter: `startsWith('CoverLetter_')` at line 51. Screening: `startsWith('Screening_')` at line 53. Both artifact types now registered in `generated_files.files` (GAP-OPS-A/B fixed). ATS-blocked formats greyed with "Blocked" label via `_renderDownloadGrid`. `finalise.js:65` renders the same `generated.files` array as a `<ul>` with output_dir shown at line 79. |
| 2 | UI makes clear which files are available and current | ⚠️ Partial | The layout freshness chip (`#layout-freshness-chip`, `index.html:95`; styles `styles.css:105–121`) signals "Files outdated" (critical/red), "Layout outdated" (stale/amber), or "Layout current" (fresh/green) at page-header level. No per-file "generated at [datetime]" timestamp appears in the download grid cards (`_renderDownloadGrid`, `download-tab.js:159–209`) or in the Finalise file list (`finalise.js:76–78`). A user navigating to the Finalise tab sees filenames but no inline currency date per file. |
| 3 | Finalise/archive actions separated from earlier preview steps | ✅ Pass | `tab-finalise` is `style="display:none"` in `index.html:219`. It has no entry in `STAGE_TABS` (`ui-core.js:350–363`). It is reachable only when `finalise-action-btn` fires (`app.js:137`), which is itself only shown after `final-generate-proceed-btn` has been clicked (`app.js:136`). The Finalise tab's "Finalise & Archive" CTA (`finalise.js:104–108`) is visually distinct from layout and download actions. |

**Acceptance Criteria:**

- "The final-stage UI supports a confident determination of package readiness" — ⚠️ **Partial.** ATS validation blocks critical failures in the download grid; the freshness chip signals stale content. Cover letter and screening DOCX files are now visible in the Finalise file list if generated from their respective tabs (GAP-OPS-A/B fixed). However, no unified all-clear or readiness gate exists before "Finalise & Archive" becomes active. A user can finalise even when cover letter or screening responses are absent.
- "The user can identify the current set of deliverables before finalising" — ⚠️ **Partial.** The Finalise tab shows a file list (`finalise.js:65–79`) derived from `generated_files.files`, which now reflects all generated artifact types (CV, cover letter, screening). Output directory is shown inline (`finalise.js:79`). Per-file timestamps remain absent.

**Failure modes still present:**

- No package-readiness gate before "Finalise & Archive" (no checklist confirming CV + cover letter + screening present).
- No per-file currency timestamp in file cards (Download tab) or Finalise file list.

---

### US-O2: Application Metadata and Tracking

**Story:** As a recruiter or application-operations reviewer, I want to capture status and notes in a structured way, so that submission tracking remains organized after files are generated.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Status values are understandable and actionable | ✅ Pass | `<select id="finalise-status">` renders three options: "Draft — not yet sent", "Ready to send", "Sent" (`finalise.js:89–93`). Backend validates against enum at `generation_routes.py:1941` (`metadata['application_status'] = app_status`). Labels are operationally precise and map cleanly to application pipeline states. |
| 2 | Notes captured at the point of finalisation | ✅ Pass | `<textarea id="finalise-notes">` with placeholder "Recruiter name, salary info, follow-up date, interview notes…" (`finalise.js:97–101`). Submitted via `POST /api/finalise`; written to `metadata.json` (`generation_routes.py:1941–1943`). |
| 3 | Archive behavior preserves context needed for later follow-up | ✅ Pass | `POST /api/finalise` (`generation_routes.py:1880`) writes to `metadata.json`: `application_status`, `notes`, `finalised_at` ISO timestamp. Git commit created with `feat: Add {Company}_{Role}_{date} application` (`generation_routes.py` ~line 1985). Archive is comprehensive. Cover letter and screening DOCX are now registered in `generated_files.files` (GAP-OPS-A/B fixed), so the archive includes the complete package. |

**Acceptance Criteria:**

- "The finalise flow supports storing practical application-tracking metadata" — ✅ **Pass.** All required fields written on finalise.
- "The workflow makes clear when that metadata becomes part of the archived session" — ⚠️ **Partial.** The pre-submit view shows the file list and output directory (`finalise.js:74–80`). The success card shows approved rewrite count, ATS score (when available), and git commit hash (`finalise.js:179–189`). However: (a) the output directory path is not repeated in the success card — only in the pre-submit file list; (b) ATS score display is conditional on `summary.ats_score` being non-null — if ATS scoring was not run, the score item is absent without any indication (the `|| null` fallback at line 176 renders nothing via `_renderFinaliseAtsItems`).

**Failure modes still present:**

- Success card omits output directory path — shown before submit but not after.
- ATS score display silently absent when `ats_score` is null rather than surfacing "not scored".
- `application_status` from `metadata.json` is not shown in the Sessions modal — no at-a-glance pipeline view across sessions.

---

### US-O3: File Naming and Package Hygiene

**Story:** As a recruiter or application-operations reviewer, I want to verify that output artifacts are clearly named and grouped, so that files can be managed outside the application without confusion.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Generated files use job-relevant naming | ✅ Pass | All artifact types use job-relevant tokens: CV artifacts `CV_{company}_{role}_{date}.html/.pdf` (`cv_orchestrator.py`); ATS DOCX `CV_{company}_{role}_{date}_ATS.docx`; human DOCX `CV_{company}_{role}_{date}.docx`; cover letter `CoverLetter_{company}_{role}_{date}.docx` (`master_data_routes.py:1649`); screening `Screening_{company_s}_{role_s}_{date}.docx` (`master_data_routes.py:1883`); git commit `feat: Add {Company}_{Role}_{date} application`. All artifact types follow the same `{role}_{company}_{date}` structure. |
| 2 | File review surfaces present outputs in a manageable way | ✅ Pass | Download tab renders each file as a card (`_renderDownloadGrid`, `download-tab.js:159–209`). Description labels are correct for all types: cover letter `startsWith('CoverLetter_')` → "Cover letter — Word document for the application"; screening `startsWith('Screening_')` → "Screening question responses — Word document". ATS-blocked formats greyed. Persuasion check panel appended. Refinement shortcuts available. Cover letter and screening DOCX files now registered in `generated_files.files` (GAP-OPS-A/B fixed) so they appear in the grid. |
| 3 | Multiple generation passes do not obscure which output is current | ⚠️ Partial | The layout freshness chip (`state-manager.js:120–178`) tracks content revision vs last-rendered revision and surfaces "Files outdated" (critical), "Layout outdated" (stale), or "Layout current" (fresh) at header level via CSS classes in `styles.css:119–121`. `_collectDownloadableFiles` (`download-tab.js:22–73`) de-duplicates using a `Set` and sources from session state. However, no per-file timestamp label exists in the download grid or the Finalise file list. On a re-generation, the freshness chip signals staleness but individual file cards carry no "generated at" metadata. |

**Acceptance Criteria:**

- "Output presentation and naming support practical handling outside the UI" — ✅ **Pass for naming; ✅ Pass for completeness (GAP-OPS-A/B fixed).** ⚠️ **Partial for multi-run disambiguation** (no per-file timestamp).

---

## Generated Materials Evaluation

### Package Completeness: Are Cover Letter and Screening in the Download/Finalise Tab?

**Cover Letter (tab-generated via `POST /api/cover-letter/save`):**

**FIXED in cycle 5.** `master_data_routes.py:1672–1677` registers the filename into `generated_files.files`. The cover letter DOCX is now visible in the Download tab (`_collectDownloadableFiles` includes it via `rawFiles`) and in the Finalise file list (`finalise.js:65–79`).

**Screening DOCX (via `POST /api/screening/save`):**

**FIXED in cycle 5.** `master_data_routes.py:1924–1929` registers the filename into `generated_files.files` with the same pattern. The screening DOCX is now visible in the Download and Finalise tab file lists.

**Updated Package Completeness Table:**

| Artifact | Visible in Download tab | Visible in Finalise tab | Notes |
|----------|------------------------|-------------------------|-------|
| CV HTML/PDF | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| ATS DOCX | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| Human DOCX | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| Cover letter DOCX (pipeline-generated) | ✅ Yes | ✅ Yes | Added to `generated_paths` in `cv-preview.py` |
| Cover letter DOCX (tab-generated via `/api/cover-letter/save`) | ✅ Yes | ✅ Yes | Now registered in `generated_files.files` (`master_data_routes.py:1672–1677`) |
| Screening DOCX (via `/api/screening/save`) | ✅ Yes | ✅ Yes | Now registered in `generated_files.files` (`master_data_routes.py:1924–1929`) |

---

## Remaining Story Gaps

### GAP-OPS-C: No package readiness gate before Finalise

**Priority: MEDIUM.** The Finalise tab is reachable once `finalise-action-btn` is clicked (`app.js:137`), with no automated check that CV, cover letter, and screening responses are all present and non-stale. A recruiter can archive a package that is missing application deliverables.

**Evidence:** `finalise.js:42–116` — `populateFinaliseTab()` renders the file list and submit button without any completeness check. No pre-flight checklist exists.

**Proposed resolution:** Before rendering "Finalise & Archive", the UI should show a readiness checklist: CV generated (PASS/FAIL), cover letter present (PASS/FAIL/WARN), screening saved (PASS/FAIL/WARN). Only CV being present should block archiving; cover letter and screening should warn but not block.

### GAP-OPS-D: application_status not shown in Sessions modal

**Priority: MEDIUM.** The Sessions modal (listing all sessions) shows position name, workflow phase, ownership status, and last-modified date — but not `application_status` from `metadata.json`. A recruiter with multiple active applications cannot determine at a glance which ones are "draft", "ready to send", or "sent" from the sessions list.

**Evidence:** `session_routes.py:119–147` — `GET /api/sessions` builds `SessionItem` objects from `state` keys (`position_name`, `phase`, `has_job`, `has_analysis`, `has_customizations`). It does not read `metadata.json` for `application_status`. `session-switcher-ui.js:298–310` — the session table header has columns "Name", "Status" (ownership status), "Phase", "Modified" — no application pipeline status column.

**Fix:** Have `GET /api/sessions` read `metadata.json` from the session's output directory and include `application_status` in the response. Render it as a badge in the sessions table.

### GAP-OPS-E: Per-file currency timestamp missing from file list cards

**Priority: LOW.** Neither the Download tab nor the Finalise file list shows "generated at [datetime]" on file cards. After multiple generation passes, the user must infer from the freshness chip alone whether the listed files are from the latest run.

**Evidence:** `download-tab.js:159–209` (`_renderDownloadGrid`) — file cards render icon, filename, description, and optional blocked badge. No timestamp field. `finalise.js:76–79` — Finalise file list is a `<ul>` of filenames only (`<code>${escapeHtml(f)}</code>`). Generation timestamp is stored in `state-manager.js` (`finalGeneratedAt`), but is not passed to or rendered in either file list.

---

## Evidence Summary

| Story Criterion | Status | File:Line or Function |
| --------------- | ------ | --------------------- |
| US-O1.1 Final outputs visible and distinguishable | ✅ Pass | `download-tab.js:43–73` `_collectDownloadableFiles`; `_renderDownloadGrid`; `finalise.js:65–79` |
| US-O1.2 Which files are available and current | ⚠️ Partial | Freshness chip: `index.html:95`; `styles.css:119–121`; no per-file timestamp in `_renderDownloadGrid` or `finalise.js:76–78` |
| US-O1.3 Finalise separated from earlier steps | ✅ Pass | `index.html:219` (`display:none`); `STAGE_TABS` (`ui-core.js:350–363`) excludes finalise; `app.js:137` button gate |
| US-O2.1 Status values understandable | ✅ Pass | `finalise.js:89–93`; `generation_routes.py:1941` |
| US-O2.2 Notes captured at finalisation | ✅ Pass | `finalise.js:97–101`; `generation_routes.py:1943` |
| US-O2.3 Archive preserves follow-up context | ✅ Pass | `generation_routes.py:1941–1985`; cover letter + screening now in `generated_files.files` |
| US-O2 confirmation completeness | ⚠️ Partial | Output dir in pre-submit view (`finalise.js:79`) but absent from success card (`finalise.js:179–189`); ats_score conditional |
| US-O3.1 Job-relevant file naming | ✅ Pass | `master_data_routes.py:1649` (cover letter); `master_data_routes.py:1883` (screening) |
| US-O3.2 File review surface | ✅ Pass | `download-tab.js:51–54` prefix checks; correct description labels for all types |
| US-O3.3 Multi-run file disambiguation | ⚠️ Partial | Freshness chip: `state-manager.js:120–178`; no per-file timestamp |
| Cover letter DOCX (tab-generated) in Download/Finalise | ✅ Pass | `master_data_routes.py:1672–1677` — registers in `generated_files.files` (GAP-OPS-B fixed) |
| Screening DOCX in Download/Finalise | ✅ Pass | `master_data_routes.py:1924–1929` — registers in `generated_files.files` (GAP-OPS-A fixed) |
| Package readiness gate | 🔲 Not Implemented | No completeness check before "Finalise & Archive" (`finalise.js:104–108`) |
| Cross-session pipeline status | 🔲 Not Implemented | Sessions modal does not expose `application_status`: `session_routes.py:133–141`; `session-switcher-ui.js:298–310` |
| Per-file currency timestamp | 🔲 Not Implemented | `_renderDownloadGrid` (`download-tab.js:159–209`); `finalise.js:76–78` |
