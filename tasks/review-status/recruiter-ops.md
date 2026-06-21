<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter-Ops Persona Review

**Persona:** Recruiter / Application Operations Reviewer
**Review date:** 2026-06-18
**Cycle:** 4
**Review time:** ~19:00 ET
**Source files examined (canonical — not bundle.js):**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/finalise.js`
- `web/download-tab.js`
- `web/final-generate.js`
- `web/cover-letter.js`
- `web/screening-questions.js`
- `web/review-table-base.js`
- `web/ui-helpers.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `scripts/routes/generation_routes.py`
- `scripts/routes/master_data_routes.py`
- `scripts/cv-preview.py`
- `scripts/utils/cv_orchestrator.py`

---

## Changes Since Cycle 3

### Bug Fixed: Screening DOCX description prefix

**Cycle 3 top gap #1 resolved.** `download-tab.js:53` now correctly checks `filename.startsWith('Screening_')` (previously `'Screening_Responses_'`). Screening DOCX files generated with the current `Screening_{company}_{role}_{date}.docx` pattern now receive the correct description "Screening question responses — Word document" in the Download tab file cards.

### No other structural changes detected for recruiter-ops scope

The finalise tab, archive flow, application status fields, session modal, and package completeness gating are unchanged from cycle 3.

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

**Story:** As a recruiter or application-operations reviewer, I want to know when the application package is complete and ready to send, so that the finalisation step represents a trustworthy readiness checkpoint.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Final outputs clearly visible and distinguishable | ✅ Pass | `download-tab.js:43–68` — file cards show format-specific icon, filename, and description. Cover letter: `CoverLetter_` prefix check at line 51. Screening: `Screening_` prefix check at line 53 (cycle 3 bug now fixed). ATS-blocked formats visually greyed with "Blocked" label via `_renderDownloadGrid`. |
| 2 | UI makes clear which files are available and current | ⚠️ Partial | Layout freshness chip (`#layout-freshness-chip`, `index.html:95`) signals stale/current at page-header level. But the Download and Finalise tab file lists carry no per-file "generated at [datetime]" timestamp, and the chip's staleness signal is not echoed inline within either file list. A user who navigates directly to the File Review tab sees files with no inline currency marker. |
| 3 | Finalise/archive actions separated from earlier preview steps | ✅ Pass | `tab-finalise` is `style="display:none"` in HTML (`index.html:219`) and has no entry in `STAGE_TABS` (`ui-core.js:350–363`), so it never appears in the second-bar nav. It is only reachable when `finalise-action-btn` fires (`app.js:137`), which is itself hidden until `final-generate-proceed-btn` has been clicked. The Finalise tab's "Finalise & Archive" CTA is visually distinct from layout and download actions. |

**Acceptance Criteria:**

- "The final-stage UI supports a confident determination of package readiness" — ⚠️ **Partial.** ATS validation blocks critical failures in the download grid, and the freshness chip signals stale content. No unified all-clear or readiness gate exists before the Finalise button becomes active. A user can finalise even when cover letter or screening responses are absent.
- "The user can identify the current set of deliverables before finalising" — ⚠️ **Partial.** The Finalise tab shows a file list (`finalise.js:65–79`) derived from `generated_files.files`, which reflects the current generation run. But no per-file timestamp is shown, and cover letter / screening DOCX files are only in the list if they were generated and registered in that same session's `generated_files.files` array — there is no cross-check or completeness report.

**Failure modes still present:**
- No package-readiness gate before "Finalise & Archive" (no checklist confirming CV + cover letter + screening).
- No per-file currency timestamp in file cards.

---

### US-O2: Application Metadata and Tracking

**Story:** As a recruiter or application-operations reviewer, I want to capture status and notes in a structured way, so that submission tracking remains organized after files are generated.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Status values are understandable and actionable | ✅ Pass | `<select id="finalise-status">` renders three options: "Draft — not yet sent", "Ready to send", "Sent" (`finalise.js:89–93`). Backend validates against enum `('draft', 'ready', 'sent')` at `generation_routes.py:1929`. Labels are operationally precise. |
| 2 | Notes captured at the point of finalisation | ✅ Pass | `<textarea id="finalise-notes">` on the Finalise tab; placeholder: "Recruiter name, salary info, follow-up date, interview notes…" (`finalise.js:97–101`). Submitted via `POST /api/finalise`; written to `metadata.json` (`generation_routes.py:1942`). |
| 3 | Archive behavior preserves context needed for later follow-up | ✅ Pass | `POST /api/finalise` (`generation_routes.py:1880`) writes to `metadata.json`: `application_status`, `notes`, `finalised_at` ISO timestamp, `clarification_answers`, `spell_audit`, `layout_instructions`, `validation_results`, `ats_score`. Screening responses are upserted to `response_library.json`. Git commit created with `feat: Add {Company}_{Role}_{date} application`. Archive is comprehensive. |

**Acceptance Criteria:**

- "The finalise flow supports storing practical application-tracking metadata" — ✅ **Pass.** All required fields written on finalise.
- "The workflow makes clear when that metadata becomes part of the archived session" — ⚠️ **Partial.** Success card shows approved rewrite count, ATS score (when available), and git commit hash (`finalise.js:180–189`). However: (a) the output directory path is not shown in the success card, so the user must look at the Download tab to confirm file location; (b) ATS score display is conditional on `summary.ats_score` being non-null — if ATS scoring was not run in session, the score item is absent without indication of why.

**Failure modes still present:**
- Success card omits output directory path.
- ATS score display silently absent when ats_score is null rather than surfacing "not scored".
- `application_status` from `metadata.json` is not surfaced in the Sessions modal — no at-a-glance pipeline view across sessions.

---

### US-O3: File Naming and Package Hygiene

**Story:** As a recruiter or application-operations reviewer, I want to verify that output artifacts are clearly named and grouped, so that files can be managed outside the application without confusion.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Generated files use job-relevant naming | ✅ Pass | All artifact types use job-relevant tokens: CV finals `CV_{company}_{role}_{date}.html/.pdf` (`cv_orchestrator.py:1432`); ATS DOCX `CV_{company}_{role}_{date}_ATS.docx` (line 3826); human DOCX `CV_{company}_{role}_{date}.docx` (line 4354); cover letter `CoverLetter_{company}_{role}_{date}.docx` (`cv-preview.py:393`); screening `Screening_{company}_{role}_{date}.docx` (`master_data_routes.py:1883`); git commit `feat: Add {Company}_{Role}_{date} application` (`generation_routes.py:1974`). |
| 2 | File review surfaces present outputs in a manageable way | ✅ Pass | Download tab renders each file as a card (`_renderDownloadGrid`, `download-tab.js:159–209`). Description labels are now correct for all types including screening (cycle 3 bug fixed at line 53). ATS-blocked formats are greyed with "Blocked" label. Persuasion check panel appended beneath the grid. Iterative refinement shortcuts available. |
| 3 | Multiple generation passes do not obscure which output is current | ⚠️ Partial | The layout freshness chip (`state-manager.js`) tracks whether content was revised after file generation and flips between "Files outdated" (red), "Layout outdated" (amber), and "Layout current" (green) at header level. `_collectDownloadableFiles` (`download-tab.js:22–73`) de-duplicates using a `Set` and sources from session state (the current generation run). Preview artifacts are filtered (`final-generate.js:93`). However, no per-file timestamp label exists in the download grid or the Finalise file list. If a user re-runs generation, there is no visible distinction between files in the list from run 1 vs run 2. |

**Acceptance Criteria:**

- "Output presentation and naming support practical handling outside the UI" — ✅ **Pass for naming.** ⚠️ **Partial for multi-run disambiguation** (no per-file timestamp).

---

## Generated Materials Evaluation

### Package Completeness: Are Cover Letter and Screening in the Download/Finalise Tab?

**Cover Letter:**

- Cover letter DOCX is generated by `_write_cover_letter_docx` in `cv-preview.py` when the final generation pipeline runs. The path is appended to `generated_paths` (`cv-preview.py:564`) and therefore included in `generated_files.files` in session state.
- The Download ("File Review") tab collects files from `cvData.files` in `_collectDownloadableFiles` (`download-tab.js:24–33`). If the cover letter has been generated and saved before the final generation step, its path is included.
- The Finalise tab renders `generated.files` directly (`finalise.js:65–79`). It shows whatever is in the `generated_files.files` array.
- **Gap:** Cover letter is only in `generated_files.files` if it was generated as part of the main CV generation pipeline. If the user generates the cover letter from the Cover Letter tab separately (via `POST /api/cover-letter/save`, which writes the DOCX to the output directory and records it in `metadata.json` but does NOT push it into `generated_files.files`), it will appear in the output directory but NOT be listed in the Download or Finalise tab file lists. The user would need to navigate to the Cover Letter tab to see it and download it. The Download tab has no cross-reference to `metadata.json` to pick up artifacts saved outside `generated_files.files`.

**Screening Responses:**

- Screening DOCX is generated by `POST /api/screening/save` (`master_data_routes.py:1833`), which saves `Screening_{company}_{role}_{date}.docx` to the output directory. This endpoint does NOT push the path into `generated_files.files`. It records it in `metadata.json` under `screening_responses` (the responses array, not the filename).
- Therefore, a screening DOCX saved from the Screening tab will NOT appear in the Download tab's file grid or the Finalise tab's file list. Only the Screening tab itself shows the saved response state. The user has no download link for the screening DOCX from the Download or Finalise tabs.
- **This is a significant gap** for the recruiter-ops persona: the screening DOCX is an application deliverable, but it is invisible in the final package review and finalisation screens.

**Summary of package completeness signal:**

| Artifact | Visible in Download tab | Visible in Finalise tab | Notes |
|----------|------------------------|-------------------------|-------|
| CV HTML/PDF | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| ATS DOCX | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| Human DOCX | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| Cover letter DOCX (pipeline-generated) | ✅ Yes | ✅ Yes | Added to `generated_paths` in `cv-preview.py:564` |
| Cover letter DOCX (tab-generated via `/api/cover-letter/save`) | ❌ No | ❌ No | Not in `generated_files.files`; only in output dir + metadata |
| Screening DOCX (via `/api/screening/save`) | ❌ No | ❌ No | Not in `generated_files.files`; only in output dir |

---

## Additional Story Gaps / Proposed Story Items

### GAP-OPS-A: Screening DOCX not surfaced in Download or Finalise tab

**Priority: HIGH.** Screening responses saved from the Screening tab produce a DOCX in the output directory, but its path is never registered in `generated_files.files`. As a result, the screening DOCX is invisible to the recruiter in the Download and Finalise stages. The user has no download link from the file review screen.

**Fix options:**
1. Have `POST /api/screening/save` append the new DOCX path to `generated_files.files` in session state (alongside patching `metadata.json`).
2. Have the Download tab also scan `metadata.json` for artifact filenames not in `generated_files.files` (e.g., `cover_letter_docx_path`, `screening_docx_path`).

### GAP-OPS-B: Cover letter DOCX (tab-generated) not surfaced in Download or Finalise tab

**Priority: HIGH.** When a cover letter is generated or edited via the Cover Letter tab and saved with `POST /api/cover-letter/save`, the DOCX is written to the output directory and recorded in `metadata.json` — but its path is not appended to `generated_files.files`. The Download and Finalise tabs do not see it.

**Fix:** Have `POST /api/cover-letter/save` also push the new path into `generated_files.files` in session state.

### GAP-OPS-C: No package readiness gate before Finalise

**Priority: MEDIUM.** The Finalise tab is reachable once `finalise-action-btn` is clicked, with no automated check that CV, cover letter, and screening responses are all present and non-stale. A recruiter can archive a package that is missing application deliverables.

**Proposed story:** Before rendering "Finalise & Archive", the UI should show a readiness checklist: CV generated (PASS/FAIL), cover letter present (PASS/FAIL/WARN), screening saved (PASS/FAIL/WARN). Only CV being present should block archiving; cover letter and screening should warn but not block.

### GAP-OPS-D: application_status not shown in Sessions modal

**Priority: MEDIUM.** The Sessions modal (listing all sessions) shows position name, company, phase, and ownership status — but not `application_status` from `metadata.json`. A recruiter with multiple active applications cannot determine at a glance which ones are "draft", "ready to send", or "sent" from the sessions list.

**Fix:** Have `GET /api/sessions` include `application_status` from `metadata.json` in the session list item, and render it as a badge column in the session table.

### GAP-OPS-E: Per-file currency timestamp missing from file list cards

**Priority: LOW.** Neither the Download tab nor the Finalise file list shows "generated at [datetime]" on file cards. After multiple generation passes, the user must infer from the freshness chip alone whether the listed files are from the latest run.

---

## Evidence Summary

| Story Criterion | Status | File:Line or Function |
|-----------------|--------|-----------------------|
| US-O1.1 Final outputs visible and distinguishable | ✅ Pass | `download-tab.js:43–68` `_collectDownloadableFiles`; `_renderDownloadGrid` |
| US-O1.2 Which files are available and current | ⚠️ Partial | Freshness chip: `index.html:95`; no per-file timestamp in `_renderDownloadGrid` or `finalise.js:65–79` |
| US-O1.3 Finalise separated from earlier steps | ✅ Pass | `index.html:219` (`display:none`); `STAGE_TABS` (`ui-core.js:350–363`) excludes finalise; `app.js:137` button gate |
| US-O2.1 Status values understandable | ✅ Pass | `finalise.js:89–93`; `generation_routes.py:1929` enum validation |
| US-O2.2 Notes captured at finalisation | ✅ Pass | `finalise.js:97–101`; `generation_routes.py:1942` |
| US-O2.3 Archive preserves follow-up context | ✅ Pass | `generation_routes.py:1941–1969`; git commit 1974 |
| US-O2 confirmation completeness | ⚠️ Partial | Output dir omitted from success card (`finalise.js:180–189`); ats_score conditional |
| US-O3.1 Job-relevant file naming | ✅ Pass | `cv_orchestrator.py:1432`; `cv-preview.py:393`; `master_data_routes.py:1883` |
| US-O3.2 File review surface | ✅ Pass | `download-tab.js:53` `Screening_` prefix fixed (cycle 3 bug resolved) |
| US-O3.3 Multi-run file disambiguation | ⚠️ Partial | Freshness chip; no per-file timestamp |
| Screening DOCX in Download/Finalise | ❌ Not Implemented | `master_data_routes.py:1883` saves DOCX but does not push to `generated_files.files` |
| Cover letter DOCX (tab-generated) in Download/Finalise | ❌ Not Implemented | `master_data_routes.py:1606` `cover_letter_save` does not push to `generated_files.files` |
| Package readiness gate | 🔲 Not Implemented | No completeness check before "Finalise & Archive" |
| Cross-session pipeline status | 🔲 Not Implemented | Sessions modal does not expose `application_status` from `metadata.json` |
