<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter-Ops Review Status

**Last Updated:** 2026-04-20 17:30 ET
**Executive Summary:** The application delivers solid single-document package preparation: job-relevant file naming, clear ATS/format distinction in the File Review tab, and practical finalisation with status/notes/git archiving. The primary gaps are package incompleteness — the cover letter DOCX and screening responses DOCX are saved to disk but excluded from the File Review and Finalise file lists — and the absence of a cross-component submission readiness checklist, leaving the recruiter-ops user to verify completeness mentally.

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

#### EC-O1.1 — Final outputs are clearly visible and distinguishable
**✅ Pass** — The File Review tab renders each file with an icon, filename, and plain-English format description (`web/download-tab.js:30–52`):
- 🤖 ATS-optimised PDF: "machine-readable for automated screening"
- 📄 Human PDF: "for human reviewers and printing"
- 📝 DOCX variants: "ATS-optimised" vs "editable format"
- 🌐 HTML: "with embedded JSON-LD structured data"
- 📋 `job_description.txt`: "Original job description reference"

ATS validation result shown in a collapsible `<details>` block (`web/download-tab.js:73–110`) with pass/warn/fail per format and page-count check.

#### EC-O1.2 — The UI makes clear which files are available and current
**⚠️ Partial** — The File Review tab shows available files and the layout freshness chip (`web/state-manager.js:getLayoutFreshnessFromState`) emits "Files outdated" / "Layout outdated" / "Layout current" labels via `GENERATION_STATE_EVENT`. However:
- The freshness chip is wired into the workflow step indicator/layout stage header, not surfaced within the File Review or Finalise tabs themselves (`web/state-manager.js:96–138`).
- Neither the File Review tab nor the Finalise tab shows a "generated at [timestamp]" label on the file list (`web/finalise.js:84–96`, `web/download-tab.js:_collectDownloadableFiles`).
- Cover letter DOCX (`scripts/routes/master_data_routes.py:1574+`) and screening responses DOCX (`scripts/routes/master_data_routes.py:1793+`) are not in `generated_files` and are invisible in the File Review tab. (See GAP-1.)

#### EC-O1.3 — Finalise/archive actions are clearly separated from earlier preview steps
**✅ Pass** — "Finalise" is workflow step 8 in the top bar, distinct from "Generate" (step 6) and "Layout" (step 7) (`tasks/current-implemented-workflow.md` stage-to-tab table). The "✅ Finalise & Archive" button appears only in the Finalise tab (`web/finalise.js:132`). The workflow `finalise-action-btn` in `web/app.js` only switches to the finalise stage.

#### AC-O1.A — Final-stage UI supports confident determination of package readiness
**⚠️ Partial** — The two-tab design (File Review → Finalise) provides most readiness signals:
- ATS validation per format with fail blocking (`web/download-tab.js:106–131`)
- Persuasion check (`web/download-tab.js:205–255`)
- Cross-document consistency report in Finalise tab (`web/cover-letter.js:310–420`, checks company, job title, ATS keywords across CV and cover letter)
- Iterative refinement shortcuts (`web/download-tab.js:190–205`)

No single readiness summary combines: CV generated + cover letter saved + screening responses saved + ATS passing. User must visit two tabs and check mentally. (See GAP-2.)

#### AC-O1.B — User can identify current set of deliverables before finalising
**⚠️ Partial** — The Finalise tab shows a "📂 Generated Files" box listing CV files and output directory (`web/finalise.js:84–96`). Cover letter DOCX and screening responses DOCX, both saved to disk by backend routes, are absent from this list, giving an incomplete package view before the user clicks "Finalise & Archive."

---

### US-O2: Application Metadata and Tracking

#### EC-O2.1 — Status values are understandable and actionable
**✅ Pass** — Status select offers three options with inline clarification:
- `draft` → "Draft — not yet sent"
- `ready` → "Ready to send" (pre-selected)
- `sent` → "Sent"

`web/finalise.js:95–99`. The default "Ready to send" is contextually correct at the finalise step.

#### EC-O2.2 — Notes are captured at the point of finalisation
**✅ Pass** — Notes textarea with placeholder "Recruiter name, salary info, follow-up date, interview notes…" is present at the finalise step (`web/finalise.js:100–108`). Notes are submitted via `POST /api/finalise` body (`web/finalise.js:125–135`) and stored in `metadata.json` in the output directory.

#### EC-O2.3 — Archive behavior preserves context needed for later follow-up
**⚠️ Partial** — The `/api/finalise` backend writes:
- Status + notes to `metadata.json` in the output directory (`scripts/routes/generation_routes.py:1721+`)
- ATS score, approved rewrites count, session state snapshot
- Git commit of the output directory with message using company, role, and date

However, the session switcher (`web/session-switcher-ui.js:55–72`) shows session rows with phase label and timestamps but NOT the application status set during finalisation. To identify which sessions are "sent" vs "ready", the user must open each one individually. No status filter or pipeline view exists.

#### AC-O2.A — Finalise flow supports storing practical application-tracking metadata
**✅ Pass** — status, notes, ATS score, approved rewrites count, and git commit hash are all stored (`scripts/routes/generation_routes.py:1721+`). Post-finalise confirmation shows "Status: [value]", score, and commit hash (`web/finalise.js:165–183`).

#### AC-O2.B — Workflow makes clear when metadata becomes part of the archived session
**⚠️ Partial** — The post-finalise success message shows "✅ Application archived!" and git commit hash, which clearly signals archiving (`web/finalise.js:165–183`). However, the session switcher still shows "Refinement" phase rather than any "Archived" or status indicator after finalisation, so the change in status is not reflected in the session list.

---

### US-O3: File Naming and Package Hygiene

#### EC-O3.1 — Generated files use job-relevant naming
**✅ Pass** — The orchestrator constructs `filename_base = f"CV_{company}_{role}_{timestamp}"` (`scripts/utils/cv_orchestrator.py:1155`). The output directory is likewise named from company, role slug, and timestamp (`scripts/utils/cv_orchestrator.py:1753–1763`). Filenames surfaced in File Review tab make job context unambiguous from outside the app.

#### EC-O3.2 — File review surfaces present outputs in a manageable way
**✅ Pass** — The File Review tab renders a download grid with icon/name/description/button for each file, with a collapsible ATS report above, persuasion check below, and output directory path at the bottom (`web/download-tab.js:280–310`). Deduplication using a `Set` prevents duplicate entries (`web/download-tab.js:25–26`). Blocked formats are visually greyed with a "Blocked" badge (`web/download-tab.js:118–140`).

#### EC-O3.3 — Multiple generation passes do not obscure which output is current
**⚠️ Partial** — Content revision tracking (`web/state-manager.js:markContentChanged`, `markFinalGenerated`, `getLayoutFreshnessFromState`) correctly identifies stale vs current outputs and emits UI signals. But:
- The "Files outdated" label appears in the layout-step chip, not inside the File Review or Finalise tabs
- The File Review tab shows no "generated at" timestamp alongside each file
- Cover letter and screening DOCX are not in the file list, so their freshness is wholly invisible in the recruiter-ops view

#### AC-O3.A — Output presentation and naming support practical handling outside the UI
**✅ Pass** — The output directory path is shown in both File Review (`web/download-tab.js:305`) and Finalise tabs (`web/finalise.js:94`). Job-relevant naming (`CV_{company}_{role}_{timestamp}`) makes external file management practical.

---

## Generated Materials Evaluation

### Package Completeness

| Artifact                       | Saved to disk | Listed in File Review | Listed in Finalise files | Downloadable via UI |
|-------------------------------|:-------------:|:---------------------:|:------------------------:|:-------------------:|
| CV — ATS DOCX                  | ✅            | ✅                   | ✅                       | ✅                  |
| CV — Human PDF                 | ✅            | ✅                   | ✅                       | ✅                  |
| CV — Human DOCX                | ✅            | ✅                   | ✅                       | ✅                  |
| CV — HTML (JSON-LD)            | ✅            | ✅                   | ✅                       | ✅                  |
| Job description reference      | ✅            | ✅                   | ✅                       | ✅                  |
| Cover letter DOCX              | ✅            | ❌                   | ❌                       | ❌                  |
| Screening responses DOCX       | ✅            | ❌                   | ❌                       | ❌                  |

Evidence: `scripts/routes/master_data_routes.py:1574–1640` (`cover_letter_save` generates DOCX); `scripts/routes/master_data_routes.py:1793–1860` (`screening_save` generates DOCX). Neither route adds to `generated_files` in session state. `web/download-tab.js:_collectDownloadableFiles` reads only from `cvData.files`, `cvData.final_html`, `cvData.html`, `cvData.pdf`, `cvData.docx`, `cvData.ats_docx` — no cover letter or screening paths present.

### File Naming

- CV files named `CV_{company}_{role}_{timestamp}` — ✅ unambiguous externally (`scripts/utils/cv_orchestrator.py:1155`)
- Cover letter DOCX and screening DOCX: filenames generated by backend but not surfaced in UI; consistency with CV naming convention is unverified from this review

### ATS Blocking

- ATS keyword failure blocks ALL download formats (`web/download-tab.js:113–114`)
- No bypass option for human-reviewer use case where keyword optimisation is irrelevant
- Error copy: "ATS keyword failure blocks all downloads — re-run customisations to improve keyword coverage" (`web/download-tab.js:128–130`)

---

## Additional Story Gaps / Proposed Story Items

### GAP-1 (HIGH): Cover letter and screening DOCX excluded from File Review and Finalise package view
- **Evidence:** `web/download-tab.js:_collectDownloadableFiles` reads only CV-format keys; `web/finalise.js:populateFinaliseTab` shows only `generated.files` from status endpoint; cover letter DOCX saved by `scripts/routes/master_data_routes.py:1590` is not added to `generated_files` session state.
- **Proposed story:** "As a recruiter-ops reviewer, I want the File Review and Finalise tabs to list and allow download of cover letter and screening response DOCX files alongside CV files, so I can confirm the complete application package before archiving."

### GAP-2 (HIGH): No submission readiness checklist
- **Evidence:** No UI element cross-checks: CV generated + cover letter saved + screening responses saved + ATS passing. The user must visit File Review and Finalise tabs separately and verify mentally.
- **Proposed story:** "As a recruiter-ops reviewer, I want a readiness checklist visible before finalising that confirms which components (CV, cover letter, screening responses) are generated and whether ATS validation passed, so I have a single-glance confirmation before archiving."

### GAP-3 (MEDIUM): Application status not shown in session list
- **Evidence:** `web/session-switcher-ui.js:55–72` renders rows with phase label, timestamps, and position name — but not the status field set during finalisation. The status is stored in `metadata.json` on disk but not exposed back to the session switcher.
- **Proposed story:** "As a recruiter-ops reviewer, I want the session list to display the archived application status (draft / ready / sent) so I can track my active pipeline without opening individual sessions."

### GAP-4 (MEDIUM): Cover letter and screening DOCX naming not surfaced
- **Evidence:** `scripts/routes/master_data_routes.py:1574–1640` generates a DOCX from the cover letter but the filename is not displayed to the user and is not confirmed to use the `CV_{company}_{role}_{timestamp}` pattern.
- **Proposed story:** "As a recruiter-ops reviewer, I want cover letter and screening DOCX files to use consistent job-relevant naming so files are identifiable outside the application."

### GAP-5 (LOW): ATS keyword failure blocks all formats with no bypass
- **Evidence:** `web/download-tab.js:113–114`. No override option for deliberately targeting human reviewers.
- **Proposed story:** "As a recruiter-ops reviewer, I want to override ATS keyword blocking for specific format downloads when submitting to a human reviewer who does not use automated screening."

### GAP-6 (LOW): No package export / bundle download
- **Evidence:** No "Download Package" or "Export ZIP" feature in File Review or Finalise tab. Each file must be downloaded or located on disk individually.
- **Proposed story:** "As a recruiter-ops reviewer, I want to download the complete application package (CV files + cover letter + screening responses) as a single archive, so I can attach all materials in one operation."

---

**Reviewed against:**
- `web/finalise.js` (populateFinaliseTab, finaliseApplication, showHarvestSection, applyHarvestSelections)
- `web/download-tab.js` (populateDownloadTab, _collectDownloadableFiles, _renderDownloadGrid, _renderValidationSummary)
- `web/cover-letter.js` (populateCoverLetterTab, saveCoverLetter, _renderConsistencyReport)
- `web/screening-questions.js` (populateScreeningTab, saveScreeningResponses)
- `web/session-switcher-ui.js` (_renderActiveSessionRows, _renderSavedSessionRows)
- `web/session-actions.js` (sendAction, saveSession, updatePositionTitle)
- `web/app.js` (init, setupEventListeners)
- `web/state-manager.js` (PHASES, stateManager, getLayoutFreshnessFromState, generationState)
- `scripts/routes/generation_routes.py` (finalise_application ~L1721, download_file ~L1112)
- `scripts/routes/master_data_routes.py` (cover_letter_save ~L1574, screening_save ~L1793)
- `scripts/utils/cv_orchestrator.py` (filename_base construction ~L1155, job_output_dir ~L1753)
- `scripts/utils/conversation_manager.py` (state keys: position_name, generated_files ~L60)
- `tasks/user-story-recruiter-ops.md` (US-O1, US-O2, US-O3)
- `tasks/current-implemented-workflow.md` (stage-to-tab mapping, Finalise stage tabs)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-O1 EC 1 — outputs visible/distinguishable | ✅ | | | | |
| US-O1 EC 2 — files available and current | | ⚠️ | | | |
| US-O1 EC 3 — finalise separated from preview | ✅ | | | | |
| US-O1 AC A — confident readiness determination | | ⚠️ | | | |
| US-O1 AC B — deliverables visible before finalise | | ⚠️ | | | |
| US-O2 EC 1 — status values understandable | ✅ | | | | |
| US-O2 EC 2 — notes captured at finalisation | ✅ | | | | |
| US-O2 EC 3 — archive preserves follow-up context | | ⚠️ | | | |
| US-O2 AC A — practical metadata stored | ✅ | | | | |
| US-O2 AC B — archiving clearly signaled | | ⚠️ | | | |
| US-O3 EC 1 — job-relevant file naming | ✅ | | | | |
| US-O3 EC 2 — file review surfaces outputs | ✅ | | | | |
| US-O3 EC 3 — multiple passes don't obscure current | | ⚠️ | | | |
| US-O3 AC — naming supports external handling | ✅ | | | | |

**Key evidence references:**
- `web/download-tab.js:30–52` — format icons and descriptions
- `web/download-tab.js:113–131` — ATS keyword fail blocks all formats
- `web/finalise.js:84–116` — Generated Files box + consistency report in Finalise tab
- `web/finalise.js:91–99` — Status select options
- `web/finalise.js:165–183` — Post-finalise "Application archived!" confirmation
- `web/cover-letter.js:310–420` — Cross-document consistency report implementation
- `web/session-switcher-ui.js:55–72` — Session row rendering (phase shown, status not shown)
- `scripts/routes/master_data_routes.py:1574–1640` — cover_letter_save writes DOCX (not in generated_files)
- `scripts/routes/master_data_routes.py:1793–1860` — screening_save writes DOCX (not in generated_files)
- `scripts/utils/cv_orchestrator.py:1155` — `CV_{company}_{role}_{timestamp}` filename pattern
- `web/state-manager.js:96–138` — getLayoutFreshnessFromState, "Files outdated" chip

**Evidence standard:** Every conclusion supported by source evidence citing file and line range.
