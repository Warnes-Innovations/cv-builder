<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter-Ops Persona Review

**Persona:** Recruiter / Application Operations Reviewer
**Review date:** 2026-06-18
**Source files examined (canonical — not bundle.js):**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/download-tab.js`
- `web/final-generate.js`
- `web/finalise.js`
- `web/cover-letter.js`
- `web/screening-questions.js`
- `web/review-table-base.js`
- `scripts/routes/generation_routes.py`
- `scripts/routes/master_data_routes.py`
- `scripts/utils/cv_orchestrator.py`

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

**Story:** As a recruiter or application-operations reviewer, I want to know when the application package is complete and ready to send, so that the finalisation step represents a trustworthy readiness checkpoint.

**Criterion 1: Final outputs are clearly visible and distinguishable.**

PASS (with caveat) — The Download ("File Review") tab is rendered by `populateDownloadTab` (`web/download-tab.js:295`). It calls `/api/ats-validate` to run ATS checks, then renders each file via `_renderDownloadGrid` (`download-tab.js:159`). Every file card shows an icon, the raw filename, and a descriptive string (e.g., "ATS-optimised Word document — keyword-optimised for job applications", "Cover letter — Word document for the application", "Screening question responses — Word document"). File type detection is done by filename suffix and prefix in `_collectDownloadableFiles` (`download-tab.js:21`), which explicitly handles `CoverLetter_*` and `Screening_Responses_*` prefixes.

The Generated Files tab (`populateFinalGenerateTab`, `web/final-generate.js:72`) similarly renders a card per file with a human-readable label from `_fileLabel` / `_fileDescription` (e.g., "ATS PDF", "Human Word"). These labels appear inside download cards and are clear.

Caveat: The two tabs (`tab-final_generate` = "Generated Files" and `tab-download` = "File Review") are shown together in the download stage (`STAGE_TABS.download = ['final_generate', 'download']`, `ui-core.js:357`). The distinction between a post-layout "initial file set" (final_generate tab) and the "reviewed file set" (download tab) is implicit. A first-time user may not understand that the download tab includes the ATS validation report while the final_generate tab does not. There is no unified "package complete" banner across both tabs.

**Criterion 2: The UI makes clear which files are available and current.**

PARTIAL — The layout freshness chip (`#layout-freshness-chip`, `index.html:95`) is shown in the position bar and communicates stale/current state based on `stateManager`'s generation state model (`state-manager.js`). When `isCritical` is true (content revised after final files were produced), the chip updates visually.

However:

- The download tab does not repeat the staleness signal inline alongside the file list. A user navigating directly to the File Review tab sees files without any "these may be outdated" warning integrated into the file cards.
- The download tab collects files from `cvData.files`, `cvData.final_html`, `cvData.final_pdf`, `cvData.ats_docx`, etc. (`download-tab.js:25-32`), which reflects the last generation run tracked in session state. If generate-final has been run twice, old preview artifacts (`preview_*.html/pdf`) may also exist on disk but are not separately shown in the UI. The Finalise tab's file list (`finalise.js:65`, `generated.files`) is the same array, so it is consistent with the Download tab — but neither marks files with a "generated at [timestamp]" label.

**Criterion 3: Finalise/archive actions are clearly separated from earlier preview steps.**

PASS — The `finalise-action-btn` button (`index.html:190`) is wired in `app.js:137` to switch to the `finalise` tab, and is only shown after `final-generate-proceed-btn` fires `finalGenerationComplete()` (`final-generate.js:159`). The Finalise tab (`populateFinaliseTab`, `finalise.js:42`) renders a distinct section titled "Finalise Application" with a green "Finalise & Archive" button (`finalise.js:104`), clearly separated from the layout and download steps. The `tab-finalise` element is `display:none` in HTML (`index.html:219`) and is not listed in `STAGE_TABS` (`ui-core.js:350-363`), so it does not appear in normal tab bar navigation — it is only reachable by the `finalise-action-btn` or `switchTab('finalise')`. This separation is clear.

**Acceptance Criteria:**

- "The final-stage UI supports a confident determination of package readiness" — PARTIAL. ATS validation blocks failing formats in the download grid (`download-tab.js:161-164`), and the freshness chip flags stale content. But there is no unified "all-clear" or "not ready" package-readiness gate before the Finalise button becomes available.
- "The user can identify the current set of deliverables before finalising" — PARTIAL. The Finalise tab shows a file list (`finalise.js:65-79`), but does not label files with a currency timestamp, and does not visually distinguish the current run from an earlier one.

---

### US-O2: Application Metadata and Tracking

**Story:** As a recruiter or application-operations reviewer, I want to capture status and notes in a structured way, so that submission tracking remains organized after files are generated.

**Criterion 1: Status values are understandable and actionable.**

PASS — The Finalise tab renders a `<select id="finalise-status">` with three human-readable options: "Draft — not yet sent", "Ready to send", "Sent" (`finalise.js:89-93`). The backend validates against the enum `('draft', 'ready', 'sent')` (`generation_routes.py:1911`). Labels are operationally clear for a recruiter tracking application state.

**Criterion 2: Notes are captured at the point of finalisation.**

PASS — A `<textarea id="finalise-notes">` is rendered on the Finalise tab with placeholder text: "Recruiter name, salary info, follow-up date, interview notes…" (`finalise.js:97-101`). Notes are submitted in `POST /api/finalise` as `notes` and written to `metadata.json` (`generation_routes.py:1908-1924`).

**Criterion 3: Archive behavior preserves the context needed for later follow-up.**

PASS — `POST /api/finalise` (`generation_routes.py:1862`) writes to `metadata.json` in the output directory:

- `application_status` and `notes` (user-supplied, line 1923-1924)
- `finalised_at` ISO timestamp (line 1925)
- `clarification_answers` from post-analysis Q&A (line 1926)
- `spell_audit`, `layout_instructions`, `validation_results` (lines 1927-1929)
- `ats_score` from generation state (lines 1930-1932)

Screening responses are upserted to `response_library.json` at finalisation (lines 1934-1948). A git commit is created with message `feat: Add {Company}_{Role}_{date} application` (line 1956), providing version-controlled history.

The success confirmation card in the UI shows status, approved rewrite count, ATS score, and git commit hash (`finalise.js:178-189`). This is a comprehensive archive.

Caveat: The success card does not display the output directory path, so a recruiter cannot confirm the file location from the UI without checking the Download tab's "Output Directory" line (`download-tab.js:343`). The ATS score in the success card is conditional on `summary.ats_score` being non-null (`finalise.js:175`, `generation_routes.py:1998`); if ATS scoring was not run in the session, the score field is absent.

**Acceptance Criteria:**

- "The finalise flow supports storing practical application-tracking metadata" — PASS.
- "The workflow makes clear when that metadata becomes part of the archived session" — PARTIAL. The git commit hash confirms archival, but output path is omitted from the success card; ATS score display is conditional.

---

### US-O3: File Naming and Package Hygiene

**Story:** As a recruiter or application-operations reviewer, I want to verify that output artifacts are clearly named and grouped, so that files can be managed outside the application without confusion.

**Criterion 1: Generated files use job-relevant naming.**

PASS — File naming is consistently job-relevant across all artifact types:

- CV finals: `CV_{company}_{role}_{date}.html/.pdf` (`generation_routes.py:1750`, `cv_orchestrator.py:4354`)
- ATS DOCX: `CV_{company}_{role}_{date}_ATS.docx` (`cv_orchestrator.py:3826`)
- Human DOCX: `CV_{company}_{role}_{date}.docx` (`cv_orchestrator.py:4354`)
- Cover letter: `CoverLetter_{company}_{date}.docx` (`master_data_routes.py:1638`)
- Screening responses: `Screening_Responses_{date}.docx` (`master_data_routes.py:1869`)
- Git commit: `feat: Add {Company}_{Role}_{date} application` (`generation_routes.py:1956`)

Company and role tokens are derived from `job_analysis.get('company')` and `job_analysis.get('title')` with spaces stripped and role truncated to 20 chars. The naming is externally legible when files are managed outside the application.

Caveat: The cover letter and screening filenames include only date (not company+role), so if a user generates these for multiple jobs on the same day, the filenames would collide. The CV filenames are more fully qualified.

**Criterion 2: File review surfaces present outputs in a manageable way.**

PASS — The Download tab's `_renderDownloadGrid` (`download-tab.js:159`) renders each file as a card with icon, filename, description, and a Download button/link. ATS-blocked files are greyed out with a "Blocked" label and "⛔ Blocked — output file could not be generated" message (`download-tab.js:181`). The ATS validation summary table (pass/warn/fail counts per check) is shown above the grid (`download-tab.js:108-141`). Cover letter and screening DOCX files are registered into `generated_files.files` after saving (`master_data_routes.py:1662-1666` for cover letter, `1910-1915` for screening), so they appear in the Download tab automatically without the user having to know to look elsewhere.

**Criterion 3: Multiple generation passes do not obscure which output is current.**

PARTIAL — The layout freshness chip in `state-manager.js` tracks content revision and whether outputs are stale. The download tab collects files from the session state object (`cvData.files`, `cvData.final_html`, etc., `download-tab.js:25-32`), so it reflects the current generation run's file list rather than raw directory contents.

However:

- The Finalise tab's file list iterates `generated.files` from the `/api/status` response (`finalise.js:65`), which is the same session-tracked array — consistent, but not labelled with a timestamp.
- Neither the Download nor Finalise tab attaches a "generated at [datetime]" label to the file list, so a user who ran generate-final on different days cannot confirm at a glance which run produced the displayed files.
- Preview artifacts (`preview_{request_id}.*`) accumulate in the same output directory as final artifacts but are not shown in the Download or Finalise file lists (filtered out by the session state collection logic). This is correct behaviour, but not visually confirmed in the UI.

**Acceptance Criteria:**

- "Output presentation and naming support practical handling outside the UI" — PASS for naming; PARTIAL for multi-run disambiguation (no per-file timestamp in file lists).

---

## Extended Evaluation: Package Completeness Signals

The cover letter and screening DOCX files are surfaced in the Download tab once saved (via their respective save buttons in the Cover Letter and Screening tabs). The download tab's `_collectDownloadableFiles` function checks `CoverLetter_` and `Screening_Responses_` prefixes for descriptions (`download-tab.js:51-59`). These are correctly labelled.

However:

- There is no completeness checklist in the Download or Finalise tab that verifies "CV + cover letter + screening responses" are all present before the user proceeds to finalise. A recruiter reviewing the package for send-readiness must visually scan the file grid themselves.
- The consistency report (`_renderConsistencyReport` in `cover-letter.js:336`) runs on the Finalise tab when status data is available, checking company name, job title, ATS keywords, and date formats across CV and cover letter. This is a meaningful cross-document check, but it only fires from the Finalise tab and only if a cover letter textarea value is present.

---

## Summary of Findings

| Criterion | Status | Key Evidence |
| --- | --- | --- |
| US-O1.1 Final outputs visible and distinguishable | PASS (caveat) | File cards have icons + descriptions; two download-stage tabs cause minor confusion |
| US-O1.2 Which files are available and current | PARTIAL | Freshness chip exists; not shown inline in download tab; no per-file timestamp |
| US-O1.3 Finalise separated from preview steps | PASS | `finalise-action-btn` gated behind final-generate; tab hidden in nav bar |
| US-O2.1 Status values understandable | PASS | Three-value select: draft / ready / sent; backend validates enum |
| US-O2.2 Notes captured at finalisation | PASS | `finalise-notes` textarea; placeholder prompts recruiter name, follow-up date |
| US-O2.3 Archive preserves follow-up context | PASS | metadata.json captures status, notes, ATS, audit, git commit |
| US-O2 archive confirmation clear | PARTIAL | Success card shows hash; output path omitted; ATS score conditional |
| US-O3.1 Job-relevant file naming | PASS | `CV_{company}_{role}_{date}.*` convention; cover letter and screening DOCX named |
| US-O3.2 File review surface | PASS | Download grid with ATS blocking; cover/screening DOCX auto-appear after save |
| US-O3.3 Multi-run file disambiguation | PARTIAL | Freshness chip tracks staleness; no per-file timestamp in file list |
| Package completeness checklist | NOT IMPLEMENTED | No automated gate confirming CV + cover letter + screening are all present |
| Cross-session pipeline visibility | NOT IMPLEMENTED | Sessions modal does not surface `application_status` from finalised metadata |

### Top Gaps to Address

1. **No cross-session pipeline status view** (US-O2 extended): The Sessions modal lists sessions by position name, timestamp, and phase, but does not surface `application_status` ("draft" / "ready" / "sent") from `metadata.json`. A recruiter managing multiple active applications has no at-a-glance view of which are ready to send.

2. **No package completeness gate before Finalise** (US-O1.1): There is no automated check on the Finalise tab (or before reaching it) that confirms CV, cover letter, and screening responses are all present and non-stale. A user could finalise with only the CV generated and no cover letter attached.

3. **No per-file currency timestamp in file lists** (US-O1.2 / US-O3.3): Neither the Download tab nor the Finalise tab labels file cards with "generated at [datetime]". Adding a timestamp to the output directory label or each file card would confirm currency without user inference.

4. **Cover letter and screening filenames omit role token** (US-O3.1 minor): `CoverLetter_{company}_{date}.docx` and `Screening_Responses_{date}.docx` do not include the role name. For a user applying to multiple roles at the same company on the same day, filenames would collide. Aligning these to the `CV_{company}_{role}_{date}` convention would remove this ambiguity.

5. **Finalise success card omits output path** (US-O2.3 minor): The archive confirmation shows the git commit hash but not the output directory path. Adding the path (already surfaced in the Download tab) would confirm to the recruiter where the archived files are stored.
