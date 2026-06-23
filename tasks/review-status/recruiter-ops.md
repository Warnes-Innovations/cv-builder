<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter Ops Review Status

**Last Updated:** 2026-06-22 14:30 ET

**Persona:** Recruiter / Application Operations Reviewer
**Cycle:** 6
**Source files examined:**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/finalise.js`
- `web/download-tab.js`
- `web/final-generate.js`
- `web/cover-letter.js`
- `web/session-switcher-ui.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `scripts/routes/generation_routes.py`
- `scripts/routes/master_data_routes.py`
- `scripts/routes/session_routes.py`
- `scripts/utils/cv_orchestrator.py`

---

**Executive Summary:** The three recruiter-ops stories are substantially satisfied. Submission readiness signals are strong at the format level (ATS validation in the Download tab, per-format block logic, freshness chip). The finalise flow provides well-defined status values (draft/ready/sent via `web/finalise.js:89–93`, validated at `generation_routes.py:1929`), a free-text notes field with a practical placeholder, and a full metadata archive to `metadata.json` including `application_status`, `notes`, `finalised_at`, `ats_score`, and `clarification_answers` (`generation_routes.py:1941–1950`) followed by a git commit. File naming follows a deterministic job-relevant convention (`CV_{Company}_{Role}_{date}.*`). A cross-document consistency check fires in the Finalise tab on load. Three gaps remain open and unresolved: no package readiness gate before archiving (GAP-OPS-C), no application pipeline status column in the Sessions modal (GAP-OPS-D — confirmed: `session_routes.py:133–141` reads `session.json` only, not `metadata.json`), and no per-file generation timestamp in the file cards (GAP-OPS-E). An additional unaddressed concern: when ATS scoring has not been run the position bar badge is hidden and the Finalise success card silently shows nothing for ATS (`ats-refinement.js:160–162`).

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

**Story:** As a recruiter or application-operations reviewer, I want to know when the application package is complete and ready to send, so that the finalisation step represents a trustworthy readiness checkpoint.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Final outputs clearly visible and distinguishable | ✅ Pass | `web/download-tab.js:21–73` — `_collectDownloadableFiles()` deduplicates across `cvData.files`, `cvData.final_html`, `cvData.final_pdf`, `cvData.html`, `cvData.pdf`, `cvData.docx`, `cvData.ats_docx`. Format-specific icons and descriptions assigned (ATS PDF: "machine-readable for automated screening"; human PDF: "for human reviewers and printing"; cover letter DOCX: `startsWith('CoverLetter_')` at line 51; screening DOCX: `startsWith('Screening_')` at line 53). Blocked formats rendered with greyed "Blocked" button via `_renderDownloadGrid` (line 159). `web/finalise.js:65–79` renders the same `generated.files` array as a `<ul>` with output_dir shown. |
| 2 | UI makes clear which files are available and current | ⚠️ Partial | The layout freshness chip (`#layout-freshness-chip`, `web/index.html:95`; CSS at `web/styles.css:105–121`) signals "Files outdated" (critical/red), "Layout outdated" (stale/amber), or "Layout current" (fresh/green) in the page header. No per-file "generated at [datetime]" timestamp appears in the download grid cards (`_renderDownloadGrid`, `web/download-tab.js:159–209`) or in the Finalise file list (`web/finalise.js:76–78`). A user sees filenames but no inline currency date per file. |
| 3 | Finalise/archive actions separated from earlier preview steps | ✅ Pass | `#tab-finalise` is `style="display:none"` in `web/index.html:219`. It has no entry in `STAGE_TABS` (`web/ui-core.js:350–363`). It is reachable only when `#finalise-action-btn` fires (`web/app.js:137`), which is itself only shown after `#final-generate-proceed-btn` has been clicked (`web/app.js:136`). The "Finalise & Archive" CTA in `web/finalise.js:104–108` is visually distinct from layout and download actions. |

**Acceptance Criteria:**

- "The final-stage UI supports a confident determination of package readiness" — ⚠️ **Partial.** ATS validation blocks critical failures in the download grid (`web/download-tab.js:160–164`). The freshness chip signals stale content. Cover letter and screening DOCX files are visible in the Finalise file list when generated from their respective tabs (`scripts/routes/master_data_routes.py:1672–1677` and `1924–1929`). However, no unified all-clear or readiness gate exists before "Finalise & Archive" becomes active. A user can finalise with cover letter or screening absent.
- "The user can identify the current set of deliverables before finalising" — ⚠️ **Partial.** The Finalise tab shows a file list (`web/finalise.js:65–79`) derived from `generated_files.files`, which reflects all generated artifact types. Output directory is shown inline (`web/finalise.js:79`). Per-file timestamps remain absent.

**Failure modes still open:**
- No package-readiness gate before "Finalise & Archive" (no checklist confirming CV + cover letter + screening present).
- No per-file currency timestamp in file cards or Finalise file list.

---

### US-O2: Application Metadata and Tracking

**Story:** As a recruiter or application-operations reviewer, I want to capture status and notes in a structured way, so that submission tracking remains organized after files are generated.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Status values are understandable and actionable | ✅ Pass | `<select id="finalise-status">` renders three options with plain-language labels: "Draft — not yet sent", "Ready to send", "Sent" (`web/finalise.js:89–93`). Backend validates against enum `('draft', 'ready', 'sent')` at `scripts/routes/generation_routes.py:1929`. Labels map cleanly to application pipeline states. |
| 2 | Notes captured at the point of finalisation | ✅ Pass | `<textarea id="finalise-notes">` with explicit placeholder "Recruiter name, salary info, follow-up date, interview notes…" (`web/finalise.js:97–101`). Value submitted via `POST /api/finalise`; written to `metadata.json` as `metadata['notes']` at `scripts/routes/generation_routes.py:1942`. |
| 3 | Archive behavior preserves context needed for later follow-up | ✅ Pass | `POST /api/finalise` (`scripts/routes/generation_routes.py:1880–2029`) writes to `metadata.json`: `application_status`, `notes`, `finalised_at` ISO timestamp, `clarification_answers`, `spell_audit`, `layout_instructions`, `validation_results`, and `ats_score`. Git commit created with message `feat: Add {Company}_{Role}_{date} application`. Screening responses are upserted to `response_library.json` (lines 1952–1966). Cover letter and screening DOCX files are registered in `generated_files.files` via their save routes. |

**Acceptance Criteria:**

- "The finalise flow supports storing practical application-tracking metadata" — ✅ **Pass.** All required fields are written on finalise.
- "The workflow makes clear when that metadata becomes part of the archived session" — ⚠️ **Partial.** The pre-submit view shows the file list and output directory (`web/finalise.js:74–80`). The success card shows approved rewrite count, ATS score (when available), and git commit hash (`web/finalise.js:179–189`). However: (a) the output directory path is shown before submit but not in the success card; (b) ATS score display is conditional on `summary.ats_score` being non-null — if ATS scoring was not run, the score item renders nothing via `_renderFinaliseAtsItems` at line 176 with no "not scored" fallback.

**Failure modes still open:**
- Success card omits output directory path — shown before submit but not after.
- ATS score silently absent when `ats_score` is null rather than surfacing "not scored."
- `application_status` from `metadata.json` is not surfaced in the Sessions modal — no at-a-glance pipeline view across sessions.

---

### US-O3: File Naming and Package Hygiene

**Story:** As a recruiter or application-operations reviewer, I want to verify that output artifacts are clearly named and grouped, so that files can be managed outside the application without confusion.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Generated files use job-relevant naming | ✅ Pass | All artifact types use job-relevant tokens. CV artifacts: `CV_{company}_{role}_{date}.html/.pdf` (`scripts/utils/cv_orchestrator.py:1432`, `2056`); ATS DOCX: `CV_{company}_{role}_{date}_ATS.docx` (line 3826); human DOCX: `CV_{company}_{role}_{date}.docx` (line 4354). Company and role tokens are space-stripped (`.replace(' ', '')`) and role truncated at 20 chars (line 2050). Cover letter: `CoverLetter_{company}_{role}_{date}.docx` (`scripts/routes/master_data_routes.py:1649`); screening: `Screening_{company}_{role}_{date}.docx` (line 1883). Git commit message uses same pattern (`scripts/routes/generation_routes.py:1974`). |
| 2 | File review surfaces present outputs in a manageable way | ✅ Pass | Download tab renders each file as a card with format-specific icon, filename, description, and optional blocked badge (`web/download-tab.js:159–209`). Cover letter correctly labelled "Cover letter — Word document for the application" (line 52); screening labelled "Screening question responses — Word document" (line 54). ATS-blocked formats greyed. Persuasion check panel and refinement shortcuts appended. Finalise tab shows the same file list as a `<ul>` with output_dir. |
| 3 | Multiple generation passes do not obscure which output is current | ⚠️ Partial | The layout freshness chip (`web/state-manager.js`) tracks content revision vs last-rendered revision and surfaces "Files outdated" (critical), "Layout outdated" (stale), or "Layout current" (fresh) at header level. `_collectDownloadableFiles` (`web/download-tab.js:22–73`) deduplicates using a `Set`. However, no per-file timestamp label exists in the download grid or the Finalise file list. On re-generation, individual file cards carry no "generated at" metadata — the header chip is the only signal. |

**Acceptance Criteria:**

- "Output presentation and naming support practical handling outside the UI" — ✅ **Pass for naming and file-type clarity.** ⚠️ **Partial for multi-run disambiguation** (no per-file timestamp).

---

## Generated Materials Evaluation

### Package Completeness

All six artifact types are now registered in `generated_files.files` and visible in both the Download and Finalise tab file lists.

| Artifact | Visible in Download tab | Visible in Finalise tab | Notes |
|----------|------------------------|-------------------------|-------|
| CV HTML | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| CV PDF | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| ATS DOCX | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| Human DOCX | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| Cover letter DOCX (tab-generated) | ✅ Yes | ✅ Yes | Registered via `scripts/routes/master_data_routes.py:1672–1677` |
| Screening DOCX (tab-generated) | ✅ Yes | ✅ Yes | Registered via `scripts/routes/master_data_routes.py:1924–1929` |

### ATS Compatibility Signals

The application surfaces ATS signals at multiple layers:

- **Position bar badge:** Numeric ATS % score (green/amber/red) with keyword coverage summary line (`web/ats-refinement.js:150–181`; styled at `web/styles.css:95–104`). Visible once scoring runs, hidden when null.
- **ATS Score tab:** Full keyword breakdown in the Customizations step (`web/index.html:211`).
- **ATS Report modal:** Button visible after analysis; shows full 16-check report (`web/index.html:102–103`).
- **Download tab ATS report:** `_renderValidationSummary` in `web/download-tab.js:76–142` shows pass/warn/fail per check with a `<details>` table; keyword failure blocks all downloads.
- **Finalise tab:** ATS score echoed in the success card with hard/soft breakdown if `ats_score` non-null (`web/finalise.js:20–37`).
- **Cross-document consistency check:** `_renderConsistencyReport` in `web/cover-letter.js:336–458` checks company name, job title, top-8 ATS keywords, and date format consistency across CV and cover letter — rendered in the Finalise tab.

**Gap in ATS signaling:** When ATS scoring has not been run (e.g., user skipped the ATS Score tab), the position bar badge is hidden and the Finalise success card shows nothing for ATS — no "not scored" indicator. The user has no warning that the package was never ATS-evaluated.

### Output Format Options

Three format variants are configurable via Settings (`web/styles.css`; `web/ui-core.js:137–139`): ATS DOCX, Human PDF, Human DOCX. Each has its own checkbox, source label, and runtime value. The format selection is applied at generation time by `scripts/utils/cv_orchestrator.py`.

---

## Additional Story Gaps / Proposed Story Items

### GAP-OPS-C: No package readiness gate before Finalise (MEDIUM — unchanged from cycle 5)

`web/finalise.js:42–116` — `populateFinaliseTab()` renders the file list and submit button without any completeness check. No pre-flight checklist exists. A recruiter can archive a package missing cover letter or screening deliverables.

**Proposed resolution:** Before rendering "Finalise & Archive", display a readiness checklist: CV generated (block if absent), cover letter present (warn if absent), screening saved (warn if absent). Only CV absence should block archiving.

### GAP-OPS-D: application_status not surfaced in Sessions modal (MEDIUM — unchanged from cycle 5)

`scripts/routes/session_routes.py:133–141` — `GET /api/sessions` builds `SessionItem` with `position_name`, `phase`, `has_job`, `has_analysis`, `has_customizations`. It does not read `metadata.json` for `application_status`. `web/session-switcher-ui.js:298–310` — session table columns are Name, Status (ownership), Phase, Modified — no application pipeline status column.

**Proposed resolution:** Have `GET /api/sessions` read `metadata.json` from each session's output directory and expose `application_status`. Render a pipeline badge (Draft/Ready/Sent) in the sessions table.

### GAP-OPS-E: Per-file currency timestamp absent from file cards (LOW — unchanged from cycle 5)

`web/download-tab.js:159–209` (`_renderDownloadGrid`) — file cards render icon, filename, description, and optional blocked badge. No generation timestamp. `web/finalise.js:76–78` — Finalise file list is a `<ul>` of filenames only. `web/state-manager.js` tracks `finalGeneratedAt` but it is not passed to either file list renderer.

**Proposed resolution:** Surface `finalisedAt` or `generatedAt` metadata on each file card as a small secondary line (e.g., "Generated 2026-06-22 14:30").

### Proposed story item: ATS scoring absent from package readiness path

When a user navigates directly to Finalise without having visited the ATS Score tab, the ATS score is null, the position bar badge is hidden, and the Finalise success card carries no ATS line. No warning surfaces that the package was never ATS-evaluated.

**Proposed acceptance criterion:** The Finalise tab should show a warning (not a block) when `ats_score` is null: "ATS compatibility not checked — consider running the ATS Score step before submitting."

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/finalise.js, web/download-tab.js, web/final-generate.js, web/cover-letter.js, web/session-switcher-ui.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/routes/generation_routes.py, scripts/routes/master_data_routes.py, scripts/routes/session_routes.py, scripts/utils/cv_orchestrator.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-O1 | 2 | 1 | 0 | 0 | 0 |
| US-O2 | 2 | 1 | 0 | 0 | 0 |
| US-O3 | 2 | 1 | 0 | 0 | 0 |
| Cross-cutting | — | 1 (ATS badge) | 0 | 3 (GAP-OPS-C/D/E) | — |

**Key evidence references:**

- US-O1.1: download file cards → `web/download-tab.js:21–73`
- US-O1.2: freshness chip → `web/index.html:95`; no per-file timestamp → `web/download-tab.js:159–209`
- US-O1.3: finalise tab gating → `web/index.html:219`; `web/app.js:137`; `web/ui-core.js:350–363`
- US-O2.1: status select → `web/finalise.js:89–93`; validation → `scripts/routes/generation_routes.py:1929`
- US-O2.2: notes textarea → `web/finalise.js:97–101`; write → `scripts/routes/generation_routes.py:1942`
- US-O2.3: metadata write → `scripts/routes/generation_routes.py:1941–1966`
- US-O3.1: file naming → `scripts/utils/cv_orchestrator.py:2050–2056, 3826, 4354`; cover letter → `scripts/routes/master_data_routes.py:1649`; screening → line 1883
- US-O3.2: file card descriptions → `web/download-tab.js:51–54`
- US-O3.3: freshness chip signal → `web/state-manager.js`; no per-file timestamp
- GAP-OPS-C: no preflight → `web/finalise.js:42–116`
- GAP-OPS-D: sessions list omits pipeline status → `scripts/routes/session_routes.py:133–141`; `web/session-switcher-ui.js:298–310`
- GAP-OPS-E: no per-file timestamp → `web/download-tab.js:159–209`; `web/finalise.js:76–78`
- ATS absent warning: `web/ats-refinement.js:160–162` (badge hidden when null); `web/finalise.js:176` (`|| null` renders nothing)

**Evidence standard:** Every conclusion is independently verifiable from cited source evidence in the listed files.
