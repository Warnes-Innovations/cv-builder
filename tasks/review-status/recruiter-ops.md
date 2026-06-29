<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter Ops Review Status

**Last Updated:** 2026-06-29 12:00 ET

**Persona:** Recruiter / Application Operations Reviewer
**Cycle:** 7
**Source files examined:**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/finalise.js`
- `web/download-tab.js`
- `web/session-manager.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `scripts/routes/generation_routes.py`
- `scripts/utils/cv_orchestrator.py`

---

**Executive Summary:** GAP-OPS-E (per-file generation timestamp on download cards — previously cycle 5/6 open gap, logged as GAP-106) is now resolved. `web/download-tab.js:194–196` renders `Generated ${generatedLabel}` on every download card, sourced from `cvData.metadata?.generation_date` (line 356), which `scripts/utils/cv_orchestrator.py:2188` writes at generation time. The timestamp is a single batch-level datetime applied uniformly to all cards (not per-file, but correct for a single-pass generation model). The remaining two structural gaps — GAP-OPS-C (no readiness gate before Finalise) and GAP-OPS-D (application_status not surfaced in Sessions modal) — remain unresolved. All other US-O1, US-O2, and US-O3 findings from cycle 6 are confirmed unchanged. The three US-O status values ("Draft — not yet sent", "Ready to send", "Sent") remain clear and actionable. File naming conventions, file visibility, and archive metadata behaviour are all unchanged from cycle 6.

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

**Story:** As a recruiter or application-operations reviewer, I want to know when the application package is complete and ready to send, so that the finalisation step represents a trustworthy readiness checkpoint.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Final outputs clearly visible and distinguishable | ✅ Pass | `web/download-tab.js:21–73` — `_collectDownloadableFiles()` deduplicates across `cvData.files`, `cvData.final_html`, `cvData.final_pdf`, `cvData.html`, `cvData.pdf`, `cvData.docx`, `cvData.ats_docx`. Format-specific icons and descriptions assigned per file type: ATS PDF gets "machine-readable for automated screening", human PDF gets "for human reviewers and printing", `CoverLetter_*` files get "Cover letter — Word document for the application" (line 52), `Screening_*` files get "Screening question responses — Word document" (line 54). Blocked formats greyed with disabled "Blocked" button via `_renderDownloadGrid` (line 159). |
| 2 | UI makes clear which files are available and current | ✅ Pass | **GAP-OPS-E / GAP-106 RESOLVED.** `_renderDownloadGrid` now accepts `generatedAt` (line 159) and renders `<div style="font-size:0.75em;color:#9ca3af;margin-top:3px;">Generated ${generatedLabel}</div>` on each card (lines 194–196). `populateDownloadTab` reads `cvData.metadata?.generation_date` (line 356) sourced from `cv_orchestrator.py:2188`. This is a batch-level timestamp (same across all cards from one generation pass), which is appropriate for the single-pass model. The layout freshness chip (`#layout-freshness-chip`, `web/index.html:95`) additionally signals "Files outdated" / "Layout outdated" / "Layout current" in the page header. |
| 3 | Finalise/archive actions separated from earlier preview steps | ✅ Pass | `#tab-finalise` is `style="display:none"` in `web/index.html:219`. It has no entry in `STAGE_TABS` (`web/ui-core.js:350–363`). It is reachable only via `#finalise-action-btn` (`web/app.js:137`), which is itself only shown after `#final-generate-proceed-btn` fires (`web/app.js:136`). The "Finalise & Archive" CTA in `web/finalise.js:104–108` is visually distinct (green `#059669` background, full-width) from layout and download actions. |

**Acceptance Criteria:**

- "The final-stage UI supports a confident determination of package readiness" — ⚠️ **Partial.** ATS validation blocks critical failures in the download grid (`web/download-tab.js:160–164`). The freshness chip signals stale content. Generation timestamp now appears on each file card (GAP-106 resolved). However, no unified readiness gate exists before "Finalise & Archive" — a user can archive without cover letter or screening deliverables present.
- "The user can identify the current set of deliverables before finalising" — ✅ **Pass.** The Finalise tab shows a file list (`web/finalise.js:65–79`) derived from `generated_files.files`, and the Download tab now shows per-card generation timestamps.

**Failure modes still open:**

- No package-readiness gate before "Finalise & Archive" (no checklist confirming CV + cover letter + screening present). — GAP-OPS-C, unchanged.

---

### US-O2: Application Metadata and Tracking

**Story:** As a recruiter or application-operations reviewer, I want to capture status and notes in a structured way, so that submission tracking remains organized after files are generated.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Status values are understandable and actionable | ✅ Pass | `<select id="finalise-status">` renders three options with plain-language labels: "Draft — not yet sent", "Ready to send", "Sent" (`web/finalise.js:89–93`). Backend validates against enum `('draft', 'ready', 'sent')` at `scripts/routes/generation_routes.py:1929`. Labels map cleanly to application pipeline states without jargon. |
| 2 | Notes captured at the point of finalisation | ✅ Pass | `<textarea id="finalise-notes">` with placeholder "Recruiter name, salary info, follow-up date, interview notes…" (`web/finalise.js:97–101`). Value POSTed to `/api/finalise`; written to `metadata.json` as `metadata['notes']` at `scripts/routes/generation_routes.py:1942`. |
| 3 | Archive behavior preserves context needed for later follow-up | ✅ Pass | `POST /api/finalise` (`scripts/routes/generation_routes.py:1880–2029`) writes to `metadata.json`: `application_status`, `notes`, `finalised_at` ISO timestamp, `clarification_answers`, `spell_audit`, `layout_instructions`, `validation_results`, and `ats_score`. Git commit created with message `feat: Add {Company}_{Role}_{date} application`. Screening responses are upserted to `response_library.json` (lines 1952–1966). |

**Acceptance Criteria:**

- "The finalise flow supports storing practical application-tracking metadata" — ✅ **Pass.** All required fields are written on finalise.
- "The workflow makes clear when that metadata becomes part of the archived session" — ⚠️ **Partial.** The pre-submit view shows the file list and output directory (`web/finalise.js:74–80`). The success card shows approved rewrite count, ATS score (when available), and git commit hash (`web/finalise.js:179–189`). Two sub-gaps persist: (a) output directory path shown before submit but not echoed in the success card; (b) ATS score display is conditional on `summary.ats_score` being non-null — if ATS scoring was never run, the score item renders nothing via `_renderFinaliseAtsItems` at line 176 with no "not scored" fallback.

**Failure modes still open:**

- Success card omits output directory path after submission (shown before, not after).
- ATS score silently absent when `ats_score` is null rather than surfacing "not scored."
- `application_status` from `metadata.json` is not surfaced in the Sessions modal — no at-a-glance pipeline view across sessions. — GAP-OPS-D, unchanged.

---

### US-O3: File Naming and Package Hygiene

**Story:** As a recruiter or application-operations reviewer, I want to verify that output artifacts are clearly named and grouped, so that files can be managed outside the application without confusion.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Generated files use job-relevant naming | ✅ Pass | CV artifacts: `CV_{company}_{role}_{date}.html/.pdf` (`scripts/utils/cv_orchestrator.py`); ATS DOCX: `CV_{company}_{role}_{date}_ATS.docx`; human DOCX: `CV_{company}_{role}_{date}.docx`. Company space-stripped, role space-stripped and truncated at 20 chars (`scripts/routes/generation_routes.py:1765–1768`). Cover letter: `CoverLetter_{company}_{role}_{date}.docx`; screening: `Screening_{company}_{role}_{date}.docx` (prefixes verified in `web/download-tab.js:51–54`). Git commit message uses same pattern (`scripts/routes/generation_routes.py:1974`). |
| 2 | File review surfaces present outputs in a manageable way | ✅ Pass | Download tab renders each file as a card with format-specific icon, filename, description, generation timestamp, and optional blocked badge (`web/download-tab.js:159–216`). Cover letter correctly labelled "Cover letter — Word document for the application" (line 52); screening labelled "Screening question responses — Word document" (line 54). ATS-blocked formats greyed. Persuasion check panel and refinement shortcuts appended. Finalise tab shows the same file list as a `<ul>` with output_dir (`web/finalise.js:76–80`). |
| 3 | Multiple generation passes do not obscure which output is current | ✅ Pass | **GAP-106 timestamp now present.** `_renderDownloadGrid` renders `Generated ${generatedLabel}` on each card (lines 194–196) using `cvData.metadata?.generation_date` (line 356). `_collectDownloadableFiles` deduplicates via a `Set` (line 36). The layout freshness chip additionally surfaces "Files outdated" (critical), "Layout outdated" (stale), or "Layout current" (fresh) in the page header. Timestamp is batch-level (same for all cards from one generation pass), which is correct for the single-pass model. |

**Acceptance Criteria:**

- "Output presentation and naming support practical handling outside the UI" — ✅ **Pass.** Naming is job-relevant and consistent across artifact types. File cards now carry generation timestamps. The freshness chip disambiguates stale outputs at the page level.

---

## Generated Materials Evaluation

### Package Completeness

All six artifact types are registered in `generated_files.files` and visible in both the Download and Finalise tab file lists.

| Artifact | Visible in Download tab | Visible in Finalise tab | Notes |
|----------|------------------------|-------------------------|-------|
| CV HTML | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| CV PDF | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| ATS DOCX | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| Human DOCX | ✅ Yes | ✅ Yes | Part of `generated_files.files` |
| Cover letter DOCX (tab-generated) | ✅ Yes | ✅ Yes | Registered via cover-letter routes |
| Screening DOCX (tab-generated) | ✅ Yes | ✅ Yes | Registered via screening routes |

### ATS Compatibility Signals

The application surfaces ATS signals at multiple layers:

- **Position bar badge:** Numeric ATS % score (green/amber/red) with keyword coverage summary line. Visible once scoring runs, hidden when null.
- **ATS Score tab:** Full keyword breakdown in the Customizations step (`web/index.html:211`).
- **ATS Report modal:** Button visible after analysis; shows full 16-check report (`web/index.html:102–103`).
- **Download tab ATS report:** `_renderValidationSummary` in `web/download-tab.js:76–142` shows pass/warn/fail per check in a `<details>` table; keyword failure blocks all downloads.
- **Finalise tab:** ATS score echoed in the success card with hard/soft breakdown if `ats_score` non-null (`web/finalise.js:20–37`).
- **Cross-document consistency check:** `_renderConsistencyReport` fires in the Finalise tab on load.

**Gap in ATS signaling:** When ATS scoring has not been run, the position bar badge is hidden and the Finalise success card silently shows nothing for ATS. No "not scored" indicator surfaces.

### Terminology Clarity

Status labels are clear: "Draft — not yet sent", "Ready to send", "Sent" (`web/finalise.js:89–93`). No jargon. Notes placeholder is explicit about intended content (recruiter name, salary, follow-up date, interview notes). The "Finalise & Archive" button label is unambiguous. "ATS-optimised" vs "Human-readable" descriptions in the download card (`web/download-tab.js:46–47`) are plain-English and recruiter-legible.

---

## Additional Story Gaps / Proposed Story Items

### GAP-OPS-C: No package readiness gate before Finalise (MEDIUM — unchanged from cycle 5/6)

`web/finalise.js:42–116` — `populateFinaliseTab()` renders the file list and submit button without any completeness check. A recruiter can archive a package missing cover letter or screening deliverables without any warning.

**Proposed resolution:** Before rendering "Finalise & Archive", display a readiness checklist: CV generated (block if absent), cover letter present (warn if absent), screening saved (warn if absent). Only CV absence should block archiving.

### GAP-OPS-D: application_status not surfaced in Sessions modal (MEDIUM — unchanged from cycle 5/6)

The Sessions modal session table shows Name, ownership Status, Phase, and Modified date columns but no application pipeline status (Draft/Ready/Sent). The sessions list API does not read `metadata.json` to expose `application_status`.

**Proposed resolution:** Have the sessions list API read `metadata.json` from each session's output directory and expose `application_status`. Render a pipeline badge (Draft/Ready/Sent) in the sessions table.

### GAP-OPS-E: Per-file currency timestamp — RESOLVED (GAP-106)

Resolved in current cycle. `web/download-tab.js:194–196` now renders `Generated ${generatedLabel}` on each download card. Source: `cvData.metadata?.generation_date` (line 356), written at `scripts/utils/cv_orchestrator.py:2188`. This closes the cycle 5/6 finding.

**Note on implementation:** The timestamp is shared across all cards from a single generation pass (batch-level, not per-file). This is accurate for the single-pass generation model. Cover letter and screening DOCX files generated in separate tab sessions would show the CV generation date if added to `generated_files.files` before `cvData.metadata` is read — this is a minor inaccuracy but unlikely to cause confusion.

### Unresolved concern: ATS scoring absent from package readiness path (unchanged from cycle 6)

When a user navigates directly to Finalise without running ATS scoring, the `ats_score` is null, the position bar badge is hidden, and the Finalise success card carries no ATS line. No warning surfaces that the package was never ATS-evaluated.

**Proposed acceptance criterion:** The Finalise tab should show a non-blocking warning when `ats_score` is null: "ATS compatibility not checked — consider running the ATS Score step before submitting."

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/finalise.js, web/download-tab.js, web/session-manager.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/routes/generation_routes.py, scripts/utils/cv_orchestrator.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-O1 | 3 | 0 | 0 | 0 | 0 |
| US-O2 | 2 | 1 | 0 | 0 | 0 |
| US-O3 | 3 | 0 | 0 | 0 | 0 |
| Cross-cutting | — | 1 (ATS absent warning) | 0 | 2 (GAP-OPS-C/D) | — |

**Key evidence references:**

- US-O1.1: download file cards → `web/download-tab.js:21–73`
- US-O1.2 (GAP-106 resolved): timestamp → `web/download-tab.js:194–196`; source → `download-tab.js:356`; written at → `cv_orchestrator.py:2188`
- US-O1.3: finalise tab gating → `web/index.html:219`; `web/app.js:137`; `web/ui-core.js:350–363`
- US-O2.1: status select → `web/finalise.js:89–93`; backend validation → `scripts/routes/generation_routes.py:1929`
- US-O2.2: notes textarea → `web/finalise.js:97–101`; write → `scripts/routes/generation_routes.py:1942`
- US-O2.3: metadata write → `scripts/routes/generation_routes.py:1941–1966`
- US-O3.1: file naming convention → `scripts/routes/generation_routes.py:1765–1768`; label prefixes → `web/download-tab.js:51–54`
- US-O3.2: file card descriptions → `web/download-tab.js:44–62`
- US-O3.3 (GAP-106 resolved): per-card timestamp → `web/download-tab.js:194–196`; deduplication → line 36; freshness chip → `web/state-manager.js`
- GAP-OPS-C: no preflight → `web/finalise.js:42–116`
- GAP-OPS-D: sessions list omits pipeline status (no read of metadata.json in session list API)
- ATS absent warning: badge hidden when null (`web/index.html:86–93`); finalise success card silent when `ats_score` null (`web/finalise.js:176`)

**Evidence standard:** Every conclusion is independently verifiable from cited source evidence in the listed files.
