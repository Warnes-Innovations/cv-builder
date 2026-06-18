<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter-Ops Persona Review

**Persona:** Recruiter / Application Operations Reviewer
**Review date:** 2026-06-18
**Source files examined:**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `web/bundle.js` (compiled output — referenced for rendering logic)
- `scripts/routes/generation_routes.py` (finalise, download, naming logic)

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

**Story:** As a recruiter or application-operations reviewer, I want to know when the application package is complete and ready to send, so that the finalisation step represents a trustworthy readiness checkpoint.

**Criterion 1: Final outputs are clearly visible and distinguishable.**

⚠️ **Partial** — The Download tab (`populateDownloadTab2`, `bundle.js:14816`) renders each file with a distinctive icon and description (ATS-optimised PDF shows a robot icon, human PDF shows a document icon, DOCX shows a memo icon). Files are displayed in a card grid with per-format descriptions. However:

- The "File Review" tab (`tab-download`, `index.html:218`) and the "Generated Files" tab (`tab-final_generate`, `index.html:217`) co-exist in the same download stage. The distinction between a _preview_ artifact and a _final_ artifact is not self-explanatory from the tab labels alone.
- The `_fileLabel` function in `bundle.js` (line ~14887) maps file suffixes to human labels (ATS PDF, Human PDF, ATS Word, Human Word), but those labels appear inside download cards, not in a summary header that says "your complete package is ready."
- There is no single "readiness banner" that confirms all expected file types are present and current before the user reaches finalise.

**Criterion 2: The UI makes clear which files are available and current.**

⚠️ **Partial** — The layout freshness chip (`layout-freshness-chip`, `index.html:95`) communicates "Layout current / outdated / Files outdated" via a colour-coded chip (`state-manager.js:getLayoutFreshnessFromState`). The "Files outdated" critical tone fires when `isCritical` is true (stale content + final outputs exist). This is a meaningful signal. However:

- The chip is positioned in the position-bar-actions row and is small; it is easy to miss.
- The download tab does not repeat the staleness signal inline. A user who navigates directly to the Download tab sees files without any "these may be outdated" warning integrated into the file list.
- Multiple generation passes can leave old preview artifacts alongside final ones; the download tab renders `generated_files.files` (all filenames in the output dir) without a "current" marker distinguishing the latest final from earlier preview files.

**Criterion 3: Finalise/archive actions are clearly separated from earlier preview steps.**

✅ **Pass** — The Finalise button (`finalise-action-btn`, `index.html:190`) appears only after `final-generate-proceed-btn` is clicked (app.js:136-137). The finalise tab is hidden until that step and renders a distinct section titled "Finalise Application" (`populateFinaliseTab2`, `bundle.js:18161`). The "Proceed to Finalise →" button is visually distinct from earlier "Continue to Spell Check" and layout action buttons.

**Acceptance Criteria Summary:**

- "The final-stage UI supports a confident determination of package readiness" — ⚠️ Partial. The layout freshness chip gives staleness, and ATS validation blocks download of failing formats (`_renderDownloadGrid`, `bundle.js:14776`). But there is no unified "all-clear" or "not ready" package-readiness gate before the Finalise button becomes available.
- "The user can identify the current set of deliverables before finalising" — ⚠️ Partial. The Finalise tab shows a file list from `generated_files.files` (`bundle.js:18200`), but there is no explicit "current as of [timestamp]" label distinguishing it from a stale run.

---

### US-O2: Application Metadata and Tracking

**Story:** As a recruiter or application-operations reviewer, I want to capture status and notes in a structured way, so that submission tracking remains organized after files are generated.

**Criterion 1: Status values are understandable and actionable.**

✅ **Pass** — The Finalise tab renders a `<select id="finalise-status">` with three values: "Draft — not yet sent", "Ready to send", and "Sent" (`bundle.js:18204-18210`). These map to the backend enum `('draft', 'ready', 'sent')` validated in `generation_routes.py:1911`. Labels are human-readable and operationally meaningful.

**Criterion 2: Notes are captured at the point of finalisation.**

✅ **Pass** — A `<textarea id="finalise-notes">` is rendered on the Finalise tab with placeholder text: "Recruiter name, salary info, follow-up date, interview notes…" (`bundle.js:18213-18219`). Notes are submitted in the `POST /api/finalise` body as `notes` and written to `metadata.json` (`generation_routes.py:1909, 1923`).

**Criterion 3: Archive behavior preserves the context needed for later follow-up.**

✅ **Pass** — `POST /api/finalise` (`generation_routes.py:1862-1964`) writes to `metadata.json`:

- `application_status` and `notes` (user-supplied)
- `finalised_at` (ISO timestamp)
- `clarification_answers` (from post-analysis Q&A)
- `spell_audit`, `layout_instructions`, `validation_results`
- `ats_score` (if available)

A git commit is also created (`generation_routes.py:1961-1964`) with message `feat: Add {Company}_{Role}_{date} application`. Screening responses are upserted into `response_library.json` for future reuse. This is a comprehensive archive.

**Acceptance Criteria Summary:**

- "The finalise flow supports storing practical application-tracking metadata" — ✅ Pass.
- "The workflow makes clear when that metadata becomes part of the archived session" — ⚠️ Partial. After a successful finalise call, the UI displays a summary card ("`✅ Application archived!`" with status, approved rewrites, ATS score, git commit hash — `bundle.js:18270-18283`). However, there is no confirmation that shows _which file path_ the archive was written to, and the ATS score in the success card depends on `summary.ats_score` being returned by the backend, which is not guaranteed for all sessions.

---

### US-O3: File Naming and Package Hygiene

**Story:** As a recruiter or application-operations reviewer, I want to verify that output artifacts are clearly named and grouped, so that files can be managed outside the application without confusion.

**Criterion 1: Generated files use job-relevant naming.**

✅ **Pass** — Final artifacts are named `CV_{company}_{role}_{date}.*` (`generation_routes.py:1750`: `filename_base = f"CV_{company}_{role}_{_ts}"`). Company and role are derived from `job_analysis.get('company')` and `job_analysis.get('title')`, with spaces stripped. Cover letters follow `CoverLetter_*` convention (inferred from `_collectDownloadableFiles` description check `bundle.js:14636`). The naming is externally legible. The git commit message also embeds `{Company}_{Role}_{date}` (`generation_routes.py:1956`).

**Criterion 2: File review surfaces present outputs in a manageable way.**

✅ **Pass** — The Download tab's `_renderDownloadGrid` (`bundle.js:14776`) renders each file as a card with icon, filename, description, and a download link. ATS-blocked files are greyed out and labelled "Blocked." The ATS report table (`_renderValidationSummary`, `bundle.js:14685`) collects pass/warn/fail counts. The Finalise tab separately lists files in a styled `<ul>` block before the status/notes form. Both views are manageable.

**Criterion 3: Multiple generation passes do not obscure which output is current.**

⚠️ **Partial** — The layout freshness chip (`state-manager.js:120-178`) tracks whether preview or final outputs are stale relative to the content revision counter. When `isCritical` is true the chip shows "Files outdated." However:

- Preview artifacts (`preview_{id}.*`) and final artifacts (`CV_*`) accumulate in the same output directory. The file list in the Finalise tab iterates `generated_files.files` which is the full directory listing. If a user runs generate-final twice, both sets of final files may appear.
- The Download tab collects from `cvData.files`, `cvData.final_html`, `cvData.final_pdf`, etc. (`bundle.js:14619`) — this is the state-tracked current run, so the Download tab is less ambiguous. But the Finalise tab's file list does not mirror this filtered view; it uses the raw `generated.files` array from the API status response.
- There is no "generated on [date/time]" label attached to any file in either the Download or Finalise views to confirm currency at a glance.

**Acceptance Criteria Summary:**

- "Output presentation and naming support practical handling outside the UI" — ✅ Pass for naming; ⚠️ Partial for disambiguation of multi-run artifacts in the Finalise view.

---

## Batch Operations, Throughput, and Multi-Job Workflow Support

This section evaluates features beyond the three US-O stories, as specified in the review instructions.

**Batch operations (multiple selections at once):**
⚠️ **Partial** — Bulk action buttons exist in the Customise phase for experiences, skills, and achievements (`bundle.js:11551-11554`, `12407-12410`, `12769-12771`): "Accept All Recommended," "Emphasize All," "Include All," "Exclude All." These are meaningful throughput helpers for the customisation step. There are no batch operations at the download or finalise stage (e.g., no "download all as zip" or "batch finalise").

**Throughput — running multiple jobs concurrently:**
✅ **Pass (architecture)** — The session registry (`web_app.py:705-708`) supports multiple simultaneous sessions. The session switcher (`index.html:47`) and "＋ New Session" button (`index.html:50`) allow switching between jobs in the same browser. Each session maintains independent state. A recruiter managing multiple candidates or a job seeker pursuing multiple roles can work in parallel browser tabs. Session conflict handling (409 + amber banner, `ui-core.js:424-441`) prevents accidental cross-tab corruption.

**Multi-job workflow support (pipeline visibility across sessions):**
❌ **Not Implemented** — There is no dashboard view showing all sessions with their status (draft/ready/sent), phase, and generated files in one place. The Sessions modal (`index.html:244`) displays a list of sessions with position name, timestamp, and phase badge (from `SessionItem.phase`, `web_app.py:162`), but does not surface `application_status` from the finalised metadata. A recruiter-ops reviewer cannot see at a glance which applications are "Ready to send" versus "Draft" without opening each session.

**Export of tracking data:**
🔲 **Not Implemented** — There is no CSV/JSON export of application status across sessions, no reporting endpoint, and no summary view aggregating ATS scores, statuses, or notes across all finalised applications.

---

## Summary of Findings

| Story/Criterion | Status | Key Evidence |
| --- | --- | --- |
| US-O1.1 Final outputs visible & distinguishable | ⚠️ Partial | Download grid has icons+descriptions; no unified package-readiness gate |
| US-O1.2 Which files are available and current | ⚠️ Partial | Freshness chip exists; not repeated in download tab; no per-file currency timestamp |
| US-O1.3 Finalise separated from preview steps | ✅ Pass | `finalise-action-btn` gated behind `final-generate-proceed-btn`; distinct tab |
| US-O2.1 Status values understandable | ✅ Pass | Three-value select: draft / ready / sent |
| US-O2.2 Notes captured at finalisation | ✅ Pass | `finalise-notes` textarea with helpful placeholder; written to `metadata.json` |
| US-O2.3 Archive preserves follow-up context | ✅ Pass | metadata.json captures status, notes, ATS score, spell audit, git commit |
| US-O2 — archive confirmation is clear | ⚠️ Partial | Success card shows status + hash but not output path; ATS score conditional |
| US-O3.1 Job-relevant file naming | ✅ Pass | `CV_{company}_{role}_{date}.*` convention enforced in `generation_routes.py:1750` |
| US-O3.2 File review surface | ✅ Pass | Download grid with ATS blocking; Finalise file list |
| US-O3.3 Multi-run file disambiguation | ⚠️ Partial | Freshness chip tracks staleness; no per-file timestamp in Finalise tab |
| Batch ops within a session | ⚠️ Partial | Bulk actions in Customise phase; none at Download/Finalise |
| Multi-session throughput | ✅ Pass | Session registry + switcher + tab-per-session architecture |
| Cross-session pipeline visibility | ❌ Not Implemented | Sessions modal does not surface `application_status` |
| Cross-session export / reporting | 🔲 Not Implemented | No aggregate tracking or export feature |

### Top Gaps to Address

1. **No cross-session status dashboard** (❌ US-O2/O3 extended): The Sessions modal lists sessions but does not show which are "ready" vs "sent." A recruiter managing 10 open applications has no at-a-glance pipeline view.

2. **No package-readiness gate before Finalise** (⚠️ US-O1.1): The staleness chip is the only signal, and it is easy to miss. A confirmatory step (or inline warning on the Finalise tab) that checks "layout is current + all expected file types present" would add confidence.

3. **Finalise tab file list lacks currency markers** (⚠️ US-O1.2 / US-O3.3): When generate-final has been run more than once, the Finalise tab's `generated_files.files` array may contain stale artifacts alongside current ones. Adding a "generated at [timestamp]" label, or filtering to show only the most recent generation run's files, would remove ambiguity.

4. **Finalise success card omits output path** (⚠️ US-O2.3): After archiving, the recruiter cannot confirm where the files are stored from the UI alone. Adding the output directory path to the success card (or linking to it) would complete the readiness picture.
