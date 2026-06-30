<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter Ops Review Status

**Last Updated:** 2026-06-30 09:45 ET
**Persona:** Recruiter / Application Operations
**Story File:** `tasks/user-story-recruiter-ops.md`
**Reviewed Against:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, `web/finalise.js`, `web/session-switcher-ui.js`, `web/download-tab.js`, `scripts/routes/generation_routes.py`, `scripts/routes/session_routes.py`, `scripts/utils/cv_orchestrator.py`

---

## Executive Summary

The recruiter-ops core workflow is well-implemented. The Finalise tab provides a clear submission readiness checklist, a full six-value status selector, a notes textarea, and an archive action backed by `POST /api/finalise`. The backend (`generation_routes.py:1929`) accepts all six status values (`draft|ready|sent|interview|rejected|accepted`), matching both the Finalise tab UI (`finalise.js:91–97`) and the post-archive PATCH widget (`session-switcher-ui.js:360–385`). The previously identified status vocabulary mismatch (GAP-ROPS-01) is now resolved. File naming is job-relevant (`CV_{Company}_{Role}_{YYYY-MM-DD}`). Three lower-priority gaps remain: post-archive notes are not editable via the session list UI, individual file listings show no "generated at" timestamp to distinguish passes, and the archive confirmation panel does not surface the output directory path prominently.

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

**Criterion 1 — Final outputs are clearly visible and distinguishable.**
✅ Pass — `web/finalise.js:65–77` renders a "Generated Files" panel listing each output file with `<code>` formatting and the output directory path. `web/download-tab.js:21–73` provides a File Review tab with per-file icons distinguishing ATS DOCX, human PDF, cover letter, and HTML.

**Criterion 2 — The UI makes clear which files are available and current.**
✅ Pass — `web/finalise.js:125–175` renders a "Submission Readiness" checklist with per-file-type checks (PDF, DOCX, HTML, cover letter, screening Q&A, ATS validation, layout freshness). Each check uses ✅/⚠/❌ with descriptive labels. Layout freshness is evaluated from `statusData.layout_freshness` (`finalise.js:140`). The distinction between blocking and advisory items is documented inline: `"⚠ items are optional — they warn but do not block archiving. ❌ items must be resolved before submitting."` (`finalise.js:171–174`).

**Criterion 3 — Finalise/archive actions are clearly separated from earlier preview steps.**
✅ Pass — The "Package Application Files" action button (`index.html:194`) is `style="display:none"` and only appears at the Download stage. Clicking it routes to the `finalise` tab (`app.js:137`), which is itself hidden by default (`index.html:223: style="display:none"`), keeping it out of normal tab navigation until the workflow reaches that stage. The "✅ Finalise & Archive" button (`finalise.js:109–113`) is visually distinct (green, bold) and placed after the readiness checklist and metadata form.

**Acceptance Criteria verdict:**

- ✅ Final-stage UI supports a confident determination of package readiness.
- ✅ User can identify the current set of deliverables before finalising.

---

### US-O2: Application Metadata and Tracking

**Criterion 1 — Status values are understandable and actionable.**
✅ Pass — The Finalise tab select (`finalise.js:91–97`) offers all six statuses with descriptive labels: `Draft — not yet sent`, `Ready to send`, `Sent`, `Interview scheduled`, `Rejected`, `Accepted`. The backend (`generation_routes.py:1929`) validates against the same set. The post-archive PATCH widget in the session list (`session-switcher-ui.js:374–385`) offers the same six options and is backed by `session_routes.py:630` (`_VALID_STATUSES`). The vocabularies are now consistent across all entry points.

**Criterion 2 — Notes are captured at the point of finalisation.**
✅ Pass — `finalise.js:98–106` renders a `<textarea id="finalise-notes">` with placeholder text `"Recruiter name, salary info, follow-up date, interview notes…"` and sends the value via `finalise.js:259: JSON.stringify({ status, notes })`. Backend persists it at `generation_routes.py:1942`.

**Criterion 3 — Archive behavior preserves the context needed for later follow-up.**
✅ Pass — `generation_routes.py:1940–1950` persists `application_status`, `notes`, `finalised_at`, `clarification_answers`, `spell_audit`, `layout_instructions`, `validation_results`, and `ats_score` to `metadata.json`. The PATCH endpoint (`session_routes.py:616–654`) allows post-archive updates to status and notes with a `metadata_updated` timestamp.

**Acceptance Criteria verdict:**

- ✅ Finalise flow stores practical application-tracking metadata with full status vocabulary.
- ✅ Workflow makes clear when metadata becomes part of the archived session (result panel confirms status after archive, `finalise.js:287–297`).

---

### US-O3: File Naming and Package Hygiene

**Criterion 1 — Generated files use job-relevant naming.**
✅ Pass — `cv_orchestrator.py:1432`: `filename_base = f"CV_{company}_{role}_{timestamp}"` where company and role derive from job analysis and timestamp is `YYYY-MM-DD`. Output directory follows `{company}_{role_slug}_{timestamp}` (`cv_orchestrator.py:2056–2057`). Cover letters use the `CoverLetter_` prefix; screening DOCX uses `Screening_`; ATS DOCX uses `_ATS` suffix (`cv_orchestrator.py:3826`, `download-tab.js:51–56`).

**Criterion 2 — File review surfaces present outputs in a manageable way.**
✅ Pass — `download-tab.js:21–73` collects downloadable files, deduplicating across multiple file reference fields (`files`, `final_html`, `final_pdf`, `html`, `pdf`, `docx`, `ats_docx`), and annotates each with a descriptive label and icon. The Finalise tab independently lists all files in a green-highlighted card above the metadata form.

**Criterion 3 — Multiple generation passes do not obscure which output is current.**
⚠️ Partial — The layout freshness chip in the position bar (`index.html:96`, `state-manager.js:120–177`) provides an aggregate warning ("Files outdated" / "Layout current") when content has changed since the last generation. However, the File Review tab and Finalise tab file listings show filenames with no "generated at" timestamp, making it impossible to identify which files come from which generation pass when multiple passes have been made. The generation state tracks `finalGeneratedAt` (`state-manager.js:79`) and `previewGeneratedAt` but neither is surfaced in the per-file UI (GAP-ROPS-03).

**Acceptance Criteria verdict:**

- ✅ Output presentation and naming support practical handling outside the UI.

---

## Generated Materials Evaluation

### Package Completeness Signals

✅ Pass — The readiness checklist (`finalise.js:125–175`) checks for CV PDF, CV DOCX, CV HTML (required; ❌ blocks unless present), plus cover letter, screening Q&A, ATS validation pass, and layout freshness (optional warnings, ⚠).

### ATS Score in Generated Materials Context

✅ Pass — ATS score is archived in `metadata.json` at finalise time (`generation_routes.py:1948–1950`) and surfaced in the archive summary panel (`finalise.js:280–293`) with hard/soft breakdown via `formatAtsScoreSummary`.

### Rewrite Audit Trail

✅ Pass — `finalise.js:180–221` renders a collapsible rewrite audit log showing original text, final text, and decision outcome (accepted/edited/rejected) for all rewrite decisions, providing provenance for every bullet change.

### Post-Archive Status Tracking (PATCH endpoint evaluation)

✅ Pass (endpoint) — `PATCH /api/sessions/metadata` (`session_routes.py:616–654`) is implemented, validates status against `_VALID_STATUSES` (six values), persists `application_status`, `notes`, and `metadata_updated` to `metadata.json`.

✅ Pass (UI — tag icon) — `session-switcher-ui.js:387–389` adds a tag icon button (`fa-solid fa-tag`, `aria-label="Update application status"`) to each saved session row.

✅ Pass (UI — inline select) — `session-switcher-ui.js:374–385` renders a hidden inline `<select id="sm-status-sel-{idx}">` with all six status options. `startSessionStatusEdit` shows it; `submitSessionStatusEdit` calls `PATCH /api/sessions/metadata` and updates the badge in place.

✅ Pass (status badge rendering) — `session-switcher-ui.js:360–371` renders per-row colored status badges with distinct colors: draft=gray, ready=blue, sent=green, interview=purple, rejected=red, accepted=emerald.

⚠️ Partial (notes not editable post-archive via session list) — The PATCH endpoint accepts `notes` as an updatable field, but the session-switcher UI only exposes the status-edit widget. There is no inline notes-edit field in the session list. Post-archive notes updates cannot be done from the UI without re-opening the session and re-finalising (GAP-ROPS-02).

---

## Additional Story Gaps / Proposed Story Items

**GAP-ROPS-02 (MED): Notes are not editable post-archive via the session list UI.**
`PATCH /api/sessions/metadata` accepts `notes` as an updatable field, but `session-switcher-ui.js` has no notes-edit widget alongside the status-edit widget. An inline notes textarea (similar to the rename pattern) would complete the post-archive tracking flow.

**GAP-ROPS-03 (MED): No "generated at" timestamp shown on individual files in File Review / Finalise tabs.**
`state-manager.js:79` tracks `finalGeneratedAt` and `previewGeneratedAt`, but these values are not surfaced in `download-tab.js` or `finalise.js` file listings. A session-level generation timestamp in the Finalise "Generated Files" panel would improve confidence when multiple passes have been made.

**GAP-ROPS-04 (LOW): No pipeline overview / dashboard across sessions.**
The Sessions modal shows `phase` and `application_status` per saved session but does not offer a summary pipeline view (e.g., count per status bucket, overdue follow-up flagging). This is outside single-session scope but is relevant for operators tracking multiple applications simultaneously.

**GAP-ROPS-05 (LOW): Archive confirmation does not show the output path prominently.**
After a successful archive (`finalise.js:287–294`), the confirmation panel shows file list, ATS score, approved rewrites, and git commit hash — but not the output directory path. The path is shown only in the "Generated Files" card above, which may scroll out of view after the confirm result appears.

**(Resolved) GAP-ROPS-01: Finalise status vocabulary matched post-archive vocabulary.**
As of the current source, `POST /api/finalise` (`generation_routes.py:1929`) and the Finalise tab select (`finalise.js:91–97`) both expose all six status values (`draft|ready|sent|interview|rejected|accepted`), consistent with the PATCH endpoint and session-switcher UI. This gap is closed.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story                          | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------------------------------ | ------- | ---------- | ------- | ----------- | ----- |
| US-O1: Submission Readiness    | 3       | 0          | 0       | 0           | 0     |
| US-O2: Metadata and Tracking   | 3       | 0          | 0       | 0           | 0     |
| US-O3: File Naming and Hygiene | 2       | 1          | 0       | 0           | 0     |
| **Total**                      | **8**   | **1**      | **0**   | **0**       | **0** |

**Key evidence references:**

- `web/finalise.js:40–175` — `populateFinaliseTab`, files card, readiness checklist
- `web/finalise.js:91–97` — Status select: all six values (draft/ready/sent/interview/rejected/accepted)
- `web/finalise.js:226–309` — `finaliseApplication()` function
- `web/session-switcher-ui.js:360–399` — `_renderSessionTableRow` with status badge and tag-icon action
- `web/session-switcher-ui.js:374–385` — Inline status-edit select widget (six values)
- `web/session-switcher-ui.js:582–633` — `startSessionStatusEdit`, `cancelSessionStatusEdit`, `submitSessionStatusEdit`
- `scripts/routes/session_routes.py:616–654` — `PATCH /api/sessions/metadata`
- `scripts/routes/session_routes.py:630` — `_VALID_STATUSES` (six values)
- `scripts/routes/generation_routes.py:1880–2029` — `POST /api/finalise`
- `scripts/routes/generation_routes.py:1929` — Finalise status validation (now six values)
- `scripts/utils/cv_orchestrator.py:1432` — File naming pattern `CV_{company}_{role}_{date}`
- `web/state-manager.js:120–177` — Layout freshness computation
- `web/download-tab.js:21–73` — File Review tab file collection and annotation
