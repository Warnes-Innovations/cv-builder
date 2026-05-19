<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter-Ops Review Status

**Last Updated:** 2026-04-22 10:00 ET

**Executive Summary:** The application provides a functional archive step (status, notes, git commit) and a file-review tab with ATS validation and per-format downloads, satisfying the core submission-readiness and file-review criteria. However, no multi-application overview or cross-session summary exists: the session switcher is the only way to navigate between applications, there is no package-readiness checklist before archiving, and the archive confirmation surface does not surface ATS score or file completeness in a persistent way. Output file naming is job-relevant, but the archive metadata summary is not retrievable after the finalise flow closes — there is no read-back UI for an archived application's status, notes, or ATS score without reloading the session.

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

**Criterion 1 — Final outputs are clearly visible and distinguishable**

⚠️ **Partial** — The File Review tab (`web/download-tab.js:276`, `populateDownloadTab`) lists every generated file with format-specific icons (🤖 for ATS PDF, 📄 for human PDF, 📝 for DOCX, 🌐 for HTML), ATS validation status per format, and download buttons that are greyed-out when ATS checks fail. File descriptions distinguish ATS-optimised from human-readable variants. However, all files — CV PDF, ATS PDF, DOCX, HTML, cover letter DOCX, screening-responses DOCX, job_description.txt — appear in a single flat grid with no grouping headers separating core CV deliverables from supplementary materials (`web/download-tab.js:56–64`). There is also no "total package completeness" indicator — no badge or check that confirms "3 of 4 required files present." The finalise tab shows a flat `<ul>` of bare file paths with no file-type icons or visual distinction (`web/finalise.js:85–87`).

*Evidence:*
- `web/download-tab.js:21–70` — `_collectDownloadableFiles()` aggregates all file types; no grouping logic
- `web/download-tab.js:156–200` — `_renderDownloadGrid()` flat grid, blocked/unblocked per format
- `web/finalise.js:75–91` — File list rendered as bare `<code>` elements inside `<li>` items

**Criterion 2 — UI makes clear which files are available and current**

⚠️ **Partial** — The File Review tab runs ATS validation on load and greys out downloads for failing formats, providing currency signals indirectly. The layout-freshness system adds an "Outdated" badge to the generate/download/finalise tab labels when the layout snapshot is stale (`web/workflow-steps.js:66–83`). However, no explicit "last generated at" timestamp is shown alongside the file list, and multiple generation passes are not disambiguated — the file list always reflects the most recent generation state without stating when it was produced or whether it matches the current review decisions.

*Evidence:*
- `web/workflow-steps.js:66–83` — `applyLayoutFreshnessNavigationState()` adds `tab-stale` CSS class to tab labels only
- `web/download-tab.js:276–325` — No generation timestamp rendered in file list
- `web/finalise.js:46–55` — Fetches `/api/status` for `generated_files` but does not display a generation timestamp

**Criterion 3 — Finalise/archive actions clearly separated from earlier preview steps**

✅ **Pass** — The workflow step bar has a dedicated "✅ Finalise" step (`web/index.html:119`) that is only reachable after the layout/generation phase. The finalise-stage tabs (`web/ui-core.js:358`: `['download', 'finalise', 'master', 'cover-letter', 'screening']`) are only shown in the `finalise` stage. The archive button inside the Finalise tab sits behind a status-select and notes textarea, visually separated from the File Review/download flow. The `POST /api/finalise` endpoint guards against calling it before CV generation (`scripts/routes/generation_routes.py:1793–1796`).

*Evidence:*
- `web/index.html:119` — Step bar "✅ Finalise" element, `id="step-finalise"`
- `web/ui-core.js:358` — `STAGE_TABS.finalise` restricts tab set to post-generation tabs
- `web/finalise.js:105–116` — Status select and notes textarea precede archive button
- `scripts/routes/generation_routes.py:1793–1796` — `400` guard if no `generated_files`

**Acceptance criteria verdict:**

- *"Final-stage UI supports a confident determination of package readiness"* — ⚠️ Partial. There is no pre-archive readiness checklist (see `tasks/gaps.md:362`, GAP-48). The user must manually inspect the file list and ATS report to judge readiness.
- *"User can identify the current set of deliverables before finalising"* — ⚠️ Partial. File list is shown in both the File Review tab and the Finalise tab, but no completeness count or generation timestamp is surfaced.

---

### US-O2: Application Metadata and Tracking

**Criterion 1 — Status values are understandable and actionable**

⚠️ **Partial** — The status dropdown offers three clearly labelled values: `Draft — not yet sent`, `Ready to send`, `Sent` (`web/finalise.js:109–114`). These cover the core pre-submission states. However, there is no `Rejected`, `Interview`, `Offer`, or `Closed` status, limiting post-submission tracking to a single state. More critically, the status is stored in `metadata.json:application_status` (`scripts/routes/generation_routes.py:1808`) but is never surfaced again in the session list, session switcher, or any other UI — it cannot be read back, edited, or used to filter applications.

*Evidence:*
- `web/finalise.js:108–114` — Three-option `<select id="finalise-status">`
- `scripts/routes/generation_routes.py:1800, 1808` — Validates and writes `metadata.application_status`
- `scripts/routes/session_routes.py:106–122` — `list_sessions` does not read `metadata.application_status`
- `web/session-switcher-ui.js:_renderSavedSessionRows` — Displays `position_name`, `phase`, timestamps only

**Criterion 2 — Notes are captured at the point of finalisation**

✅ **Pass** — A `<textarea id="finalise-notes">` with the placeholder text "Recruiter name, salary info, follow-up date, interview notes…" is rendered in the Finalise tab (`web/finalise.js:116–124`). The value is submitted with `POST /api/finalise` and written to `metadata.json:notes` (`scripts/routes/generation_routes.py:1809`). The success confirmation banner shows "Status: `<value>`" and includes approved rewrites and ATS score, confirming the archive succeeded.

*Evidence:*
- `web/finalise.js:116–124` — Textarea with recruiter-relevant placeholder
- `scripts/routes/generation_routes.py:1802, 1809` — `notes = body.get('notes', '')` → `metadata['notes'] = notes`

**Criterion 3 — Archive behavior preserves context needed for later follow-up**

⚠️ **Partial** — The archive writes a comprehensive set of fields to `metadata.json`: `application_status`, `notes`, `finalised_at`, `clarification_answers`, `spell_audit`, `layout_instructions`, `validation_results`, `ats_score`, plus a git commit (`scripts/routes/generation_routes.py:1807–1833`). The technical context is preserved. However, follow-up context (interview dates, outcome, recruiter contacts) cannot be added after archiving — there is no update-metadata route or UI for an already-archived application.

*Evidence:*
- `scripts/routes/generation_routes.py:1807–1829` — Full metadata write set
- No `PUT /api/finalise` or metadata-update route exists in `scripts/routes/`

**Acceptance criteria verdict:**

- *"Finalise flow supports storing practical application-tracking metadata"* — ✅ at point of finalise; ⚠️ for post-archive updates.
- *"Workflow makes clear when metadata becomes part of the archived session"* — ✅ The success banner (`web/finalise.js:171–188`) shows status, ATS score, approved rewrites, and git commit hash, making the archive moment explicit.

---

### US-O3: File Naming and Package Hygiene

**Criterion 1 — Generated files use job-relevant naming**

✅ **Pass** — The CV orchestrator constructs filenames as `CV_{Company}_{RoleTruncated}_{YYYY-MM-DD}` (`scripts/utils/cv_orchestrator.py:1145–1148`). Session directories are renamed to `{Company}_{RoleSlug}_{date}` when intake is confirmed (`scripts/utils/conversation_manager.py:1671–1682`). Filenames are derived from LLM-extracted `company` and `title` from the job analysis, making them job-specific.

*Evidence:*
- `scripts/utils/cv_orchestrator.py:1145–1148` — `filename_base = f"CV_{company}_{role}_{timestamp}"`
- `scripts/utils/conversation_manager.py:1671–1682` — `apply_confirmed_intake()` renames session dir

**Criterion 2 — File review surfaces present outputs in a manageable way**

⚠️ **Partial** — The File Review tab renders a grid of files with format-specific icons, ATS pass/fail per format, and individual Download buttons (`web/download-tab.js:156–200`). Per-file blocking for ATS failures is clear. However, all file types (CV PDF, ATS PDF, DOCX, HTML, cover letter, screening responses, job_description.txt) appear in a single flat grid with no grouping headers. For a full application package, this grid can contain 6–7 items of mixed importance.

*Evidence:*
- `web/download-tab.js:156–200` — Single flat `download-grid` div, no section headers
- `web/download-tab.js:21–70` — All file types processed in a single pass; no grouping logic

**Criterion 3 — Multiple generation passes do not obscure which output is current**

❌ **Fail** — `populateDownloadTab` takes `cvData` from `stateManager.getTabData('cv')`, which reflects the most recent generation result in memory. However, if CV generation is re-run (via back-to-phase then regenerate), the file list always shows the current in-memory state without any timestamp, run-count, or "replaced previous output" notification. There is no `generatedAt` label displayed in the download grid. The layout-staleness tab badge (`web/workflow-steps.js:66–83`) addresses layout freshness but not the question of whether on-disk files match the current review state.

*Evidence:*
- `web/download-tab.js:276–325` — `populateDownloadTab()` renders no generation timestamp
- `web/download-tab.js:21–24` — `cvData.files` array contains only filenames, no date metadata
- `web/workflow-steps.js:66–83` — Stale badge in tab labels only; not inside the file list

**Acceptance criteria verdict:**

- *"Output presentation and naming support practical handling outside the UI"* — ✅ for naming; ⚠️ for presentation (no grouping); ❌ for multi-pass disambiguation.

---

## Generated Materials Evaluation

### Output Directory Organization

✅ **Pass** — Session directories are named `{Company}_{RoleSlug}_{date}` on disk, making the folder structure identifiable outside the UI. CV files follow `CV_{Company}_{Role}_{date}.*` naming. Cover letter and screening-response files use distinct filename prefixes (`CoverLetter_`, `Screening_Responses_`). All artifacts are co-located in the same session output directory.

*Evidence:*
- `scripts/utils/cv_orchestrator.py:1145–1148` — CV file naming pattern
- `scripts/utils/conversation_manager.py:1671–1682` — Session directory naming

### Output Completeness Signals

⚠️ **Partial** — The download-tab ATS validation run (`web/download-tab.js:292–302`) surfaces format-level pass/fail and blocks downloads for failing formats. However, there is no "all required formats generated" checklist — the user must visually count files. ATS score is shown in the finalise success banner (`web/finalise.js:168–183`) but only once, in an ephemeral result `<div>` that is not persisted or re-surfaced later. Cover letter and screening-response files are listed alongside CV files with no "optional/required" classification.

*Evidence:*
- `web/download-tab.js:276–325` — No completeness summary; only per-file ATS pass/fail
- `web/finalise.js:168–183` — ATS score in success banner, ephemeral `<div id="finalise-result">`
- `tasks/gaps.md:362` — GAP-48: missing pre-archive checklist

### Post-Archive Retrievability

🔲 **Not Implemented** — After archiving, there is no route to return to a read-only "archived application summary" view within the UI. The archived `metadata.json` contains status, notes, ATS score, and file list, but no UI endpoint reads and displays it. To review an archived application's status or notes, the user must either reload the session (placing it back in the active workflow) or inspect the filesystem directly.

*Evidence:*
- No `GET /api/archived-application/<id>` or `GET /api/metadata` route in `scripts/routes/`
- `scripts/routes/session_routes.py:106–122` — `list_sessions` reads only `state.phase`, `state.position_name`, `has_job`, `has_analysis`, `has_customizations` — not `metadata.application_status` or `metadata.notes`

---

## Additional Story Gaps / Proposed Story Items

### GAP-RO1: Application Status Not Visible in Session List
The session switcher (`web/session-switcher-ui.js:_renderSavedSessionRows`) shows position name, phase label, created date, and last-modified date — but not `application_status` from `metadata.json`. A recruiter scanning multiple applications cannot see which packages are `sent`, `ready`, or `draft` from the session list.

**Proposed story:** *As a recruiter-ops user, I want to see each application's submission status (draft/ready/sent) in the session list so I can quickly identify which packages need action.*

### GAP-RO2: No Post-Archive Metadata Update
After archiving, `application_status` and `notes` are frozen in `metadata.json`. There is no mechanism to update status from `sent` to `interview`, add follow-up notes, or mark an application as closed without re-entering the finalise flow (which advances phase to `refinement` and re-triggers the harvest section).

**Proposed story:** *As a recruiter-ops user, I want to update the application status and add follow-up notes after archiving without re-running the full finalise workflow.*

### GAP-RO3: "Done" Phase Label Does Not Reflect Archive State
The session switcher shows `Done` for the `refinement` phase (`web/utils.js:282`). This does not indicate whether the application was archived and sent, or only generated. A recruiter-ops user cannot distinguish an archived application from one that reached the finalise step but was never submitted.

*Evidence:* `web/utils.js:282` — `SESSION_PHASE_LABELS_SHORT.refinement = 'Done'`

### GAP-RO4: No Cross-Application Summary View
The session list is the only multi-application surface, capped at 20 entries, showing only position name, phase, and timestamps. There is no dashboard summarising company, role, submission status, ATS score, and date across all applications.

**Proposed story:** *As a recruiter-ops user managing multiple applications, I want a summary list showing each application's company, role, submission status, ATS score, and date so I can track my pipeline in one place.*

### GAP-RO5: No Generation Timestamp in File List
The File Review tab renders no "generated at" timestamp alongside file names. This means users cannot confirm files are current after a back-to-phase re-run, and cannot audit which generation pass produced the displayed files.

*Evidence:* `web/download-tab.js:276–325` — `populateDownloadTab()` renders no generation metadata

---

## Terminology Review

| Term | Context | Clarity Assessment |
|------|---------|-------------------|
| **Session** | "Select a Session", Sessions modal, session switcher | Ambiguous from an application-ops perspective. A recruiter expects "Application" or "Job Application." The mismatch is felt on every multi-application task. |
| **Application** | "Application archived!" in finalise success banner | Clear and correct in this context. |
| **Archive** | "✅ Finalise & Archive" button and success message | Reasonably clear — implies permanent record creation. Relationship to "save" not explained. |
| **Finalise** | Step bar label, tab label, button label | Accurately signals workflow end, but does not communicate "this creates the submission package." Difficult to distinguish from "Generate CV" for a new user. |
| **Ready to send / Sent / Draft** | Status dropdown, Finalise tab | Clear, recruiter-appropriate pre-submission labels. Post-submission states (Interview, Offer, Rejected) are absent. |
| **Done** | Compact session-switcher label for `refinement` phase | Ambiguous — does not distinguish archived/sent from merely reached-finalise. Should be "Archived" or show `application_status`. |
| **File Review** | Tab label `⬇️ File Review` | Unusual for a download tab — "Download Files" or "Deliverables" would be more intuitive. |

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/session-manager.js, web/session-switcher-ui.js, web/workflow-steps.js, web/finalise.js, web/download-tab.js, scripts/web_app.py, scripts/routes/generation_routes.py, scripts/routes/session_routes.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py

| Story  | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|--------|---------|-----------|--------|------------|-------|
| US-O1.1 (Final outputs visible/distinguishable) | | ⚠️ | | | |
| US-O1.2 (Which files are available/current) | | ⚠️ | | | |
| US-O1.3 (Finalise separated from preview) | ✅ | | | | |
| US-O2.1 (Status values understandable) | | ⚠️ | | | |
| US-O2.2 (Notes captured at finalisation) | ✅ | | | | |
| US-O2.3 (Archive preserves follow-up context) | | ⚠️ | | | |
| US-O3.1 (Job-relevant file naming) | ✅ | | | | |
| US-O3.2 (File review manageable) | | ⚠️ | | | |
| US-O3.3 (Multi-pass disambiguation) | | | ❌ | | |
| Post-archive retrievability | | | | 🔲 | |

**Key evidence references:**

- US-O1.1 (file distinction) → `web/download-tab.js:21–70`, `web/finalise.js:75–91`
- US-O1.2 (currency) → `web/workflow-steps.js:66–83`, `web/download-tab.js:276–325`
- US-O1.3 (finalise separation) → `web/index.html:119`, `web/ui-core.js:358`, `scripts/routes/generation_routes.py:1793–1796`
- US-O2.1 (status values) → `web/finalise.js:108–114`, `scripts/routes/generation_routes.py:1800, 1808`, `scripts/routes/session_routes.py:106–122`
- US-O2.2 (notes) → `web/finalise.js:116–124`, `scripts/routes/generation_routes.py:1802, 1809`
- US-O2.3 (archive context) → `scripts/routes/generation_routes.py:1807–1829`
- US-O3.1 (file naming) → `scripts/utils/cv_orchestrator.py:1145–1148`
- US-O3.2 (file review) → `web/download-tab.js:156–200`
- US-O3.3 (multi-pass) → `web/download-tab.js:276–325` (no generation timestamp)
- GAP-RO1 (status in session list) → `scripts/routes/session_routes.py:106–122`
- GAP-RO3 (phase label) → `web/utils.js:282`

**Evidence standard:** Every conclusion is supported by source evidence. No inferences drawn from documentation.

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
