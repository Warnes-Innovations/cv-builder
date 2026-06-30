<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter Ops Review Status

**Last Updated:** 2026-06-29 23:00 ET
**Persona:** Recruiter / Application Operations
**Story File:** `tasks/user-story-recruiter-ops.md`
**Reviewed Against:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, `web/finalise.js`, `web/session-switcher-ui.js`, `web/download-tab.js`, `scripts/routes/generation_routes.py`, `scripts/routes/session_routes.py`, `scripts/utils/cv_orchestrator.py`

---

## Executive Summary

The recruiter-ops core workflow is well-covered: the Finalise tab provides a clear submission readiness checklist, a status selector, a notes textarea, and an archive action backed by a solid `POST /api/finalise` endpoint. The recently added `PATCH /api/sessions/metadata` endpoint is fully wired: the session-switcher modal exposes a tag-icon button per saved session row that opens an inline `<select>` widget to update status post-archive, and the `submitSessionStatusEdit` function calls the PATCH route. File naming is job-relevant (`CV_{Company}_{Role}_{YYYY-MM-DD}`). Critical gap: the `POST /api/finalise` endpoint only accepts `draft|ready|sent` as status values, while the PATCH endpoint and UI expose a wider set (`draft|ready|sent|interview|rejected|accepted`), creating a status vocabulary mismatch on the most important submission step.

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

**Criterion 1 — Final outputs are clearly visible and distinguishable.**
✅ Pass — `web/finalise.js:65–77` renders a "Generated Files" panel listing each output file with `<code>` formatting and the output directory path. `web/download-tab.js:21–73` provides a File Review tab with per-file icons distinguishing ATS DOCX, human PDF, cover letter, and HTML.

**Criterion 2 — The UI makes clear which files are available and current.**
✅ Pass — `web/finalise.js:125–175` renders a "Submission Readiness" checklist with per-file type checks (PDF, DOCX, HTML, cover letter, screening Q&A, ATS validation, layout freshness). Each check uses ✅/⚠/❌ with descriptive labels. Layout freshness is evaluated from `statusData.layout_freshness` (`finalise.js:140`).

**Criterion 3 — Finalise/archive actions are clearly separated from earlier preview steps.**
✅ Pass — The Finalise action button (`index.html:194`) is `style="display:none"` and becomes available only at the Download stage. Clicking it switches to the `finalise` tab (`app.js:137`), which is itself hidden (`index.html:223: style="display:none"`), keeping it out of normal tab navigation until the workflow reaches that stage. The "✅ Finalise & Archive" button (`finalise.js:106–109`) is visually distinct (green, bold) and placed after the readiness checklist.

**Acceptance Criteria verdict:**

- ✅ Final-stage UI supports a confident determination of package readiness.
- ✅ User can identify the current set of deliverables before finalising.

---

### US-O2: Application Metadata and Tracking

**Criterion 1 — Status values are understandable and actionable.**
⚠️ Partial — Two status vocabularies coexist:

- **Finalise tab** (`finalise.js:91–95`): only `draft | ready | sent`. Backend validation at `generation_routes.py:1929` enforces this same restriction: `"status must be 'draft', 'ready', or 'sent'"`.
- **Post-archive PATCH widget** (`session-switcher-ui.js:360–384, 598–633`): exposes `draft | ready | sent | interview | rejected | accepted`, accepted by `session_routes.py:630` (`_VALID_STATUSES`).

The narrower set on the Finalise tab means recruiters cannot mark a session `interview`, `rejected`, or `accepted` at the moment of archiving — they must re-open the Sessions modal and use the tag icon. This is a functional gap at the most important checkpoint.

**Criterion 2 — Notes are captured at the point of finalisation.**
✅ Pass — `finalise.js:98–104` renders a `<textarea id="finalise-notes">` with placeholder text `"Recruiter name, salary info, follow-up date, interview notes…"` and sends the value via `finalise.js:259: JSON.stringify({ status, notes })`. Backend persists it at `generation_routes.py:1942`.

**Criterion 3 — Archive behavior preserves the context needed for later follow-up.**
✅ Pass — `generation_routes.py:1940–1950` persists `application_status`, `notes`, `finalised_at`, `clarification_answers`, `spell_audit`, `layout_instructions`, `validation_results`, and `ats_score` to `metadata.json`. The PATCH endpoint (`session_routes.py:616–654`) allows post-archive updates to status and notes with a `metadata_updated` timestamp.

**Acceptance Criteria verdict:**

- ⚠️ Partial — finalise flow only stores `draft|ready|sent`; post-archive PATCH supports 6 values. The restricted status set at archive time prevents capturing the most actionable pipeline statuses (interview, rejected, accepted) at first contact.
- ✅ Workflow makes clear when metadata becomes part of the archived session (result panel shows status summary after archive).

---

### US-O3: File Naming and Package Hygiene

**Criterion 1 — Generated files use job-relevant naming.**
✅ Pass — `cv_orchestrator.py:1429–1432`: `filename_base = f"CV_{company}_{role}_{timestamp}"` where company and role come from job analysis, and timestamp is `YYYY-MM-DD`. Output directory is `{company}_{role_slug}_{timestamp}` (`cv_orchestrator.py:2050–2057`). Cover letters use `CoverLetter_` prefix; screening DOCX uses `Screening_` prefix (`download-tab.js:51–56`).

**Criterion 2 — File review surfaces present outputs in a manageable way.**
✅ Pass — `download-tab.js:21–73` collects downloadable files deduplicating across multiple file reference fields (`files`, `final_html`, `final_pdf`, `html`, `pdf`, `docx`, `ats_docx`) and annotates each with a descriptive label and icon. The Finalise tab independently lists all files in a green-highlighted card.

**Criterion 3 — Multiple generation passes do not obscure which output is current.**
⚠️ Partial — The layout freshness chip in the position bar (`index.html:96`, `state-manager.js:120–177`) warns when files are outdated relative to content changes and indicates "Files outdated" vs "Layout current". However, the File Review tab and Finalise tab show all files by filename without a timestamp or "generated at" label visible to the user, making it difficult to distinguish which files come from which generation pass if multiple passes were made. The generation state tracks `finalGeneratedAt` (`state-manager.js:79`) but this is not surfaced in the file listing UI.

**Acceptance Criteria verdict:**

- ✅ Output presentation and naming support practical handling outside the UI.

---

## Generated Materials Evaluation

### Package Completeness Signals

✅ Pass — The readiness checklist (`finalise.js:125–175`) checks for CV PDF, CV DOCX, CV HTML (required; ❌ blocks unless present), plus cover letter, screening Q&A, ATS validation pass, and layout freshness (optional warnings, ⚠). The distinction between required and optional items is documented: `"⚠ items are optional — they warn but do not block archiving. ❌ items must be resolved before submitting."` (`finalise.js:171–174`).

### ATS Score in Generated Materials Context

✅ Pass — ATS score is archived in `metadata.json` at finalise time (`generation_routes.py:1948–1950`) and surfaced in the archive summary panel (`finalise.js:280–293`) with hard/soft breakdown via `formatAtsScoreSummary`.

### Rewrite Audit Trail

✅ Pass — `finalise.js:180–221` renders a collapsible rewrite audit log showing original text, final text, and decision outcome (accepted/edited/rejected) for all rewrite decisions. This provides recruiters with provenance for every bullet change.

### Post-Archive Status Tracking (PATCH endpoint evaluation)

✅ Pass (endpoint) — `PATCH /api/sessions/metadata` (`session_routes.py:616–654`) is implemented, validates status against `_VALID_STATUSES`, persists `application_status`, `notes`, and `metadata_updated` to `metadata.json`.

✅ Pass (UI — tag icon) — `session-switcher-ui.js:387–389` adds a tag icon button (`fa-solid fa-tag`, `aria-label="Update application status"`) to each saved session row. The `data-sm-action="edit-status"` attribute routes to `startSessionStatusEdit`.

✅ Pass (UI — inline select) — `session-switcher-ui.js:374–385` renders a hidden inline `<select id="sm-status-sel-{idx}">` with all six status options. `startSessionStatusEdit` (`session-switcher-ui.js:582–589`) shows it; `cancelSessionStatusEdit` hides it. `submitSessionStatusEdit` (`session-switcher-ui.js:598–633`) calls `PATCH /api/sessions/metadata` and updates the badge in place.

✅ Pass (status badge rendering) — `session-switcher-ui.js:360–371` renders per-row colored status badges for all six statuses with distinct colors (draft=gray, ready=blue, sent=green, interview=purple, rejected=red, accepted=emerald).

⚠️ Partial (notes not editable post-archive) — The PATCH endpoint accepts `notes` as an updatable field, but the session-switcher UI only exposes the status-edit widget; there is no inline notes edit in the session list. Post-archive notes updates require re-finalising or cannot be done from the UI at all.

---

## Additional Recruiter-Ops Gaps

**GAP-ROPS-01 (HIGH): Finalise status vocabulary is narrower than post-archive status vocabulary.**
The Finalise tab (`finalise.js:91–95`) only offers `draft|ready|sent`. The backend at `generation_routes.py:1929` enforces this restriction. Recruiters who reach the archive step knowing the outcome (e.g., already sent and received an interview request) cannot record that status at archive time. They must re-open the Sessions modal and use the tag icon. Both vocabularies should match: the Finalise tab select should offer all six values (`draft|ready|sent|interview|rejected|accepted`), and `POST /api/finalise` should accept them all.

**GAP-ROPS-02 (MED): Notes are not editable post-archive via the session list UI.**
`PATCH /api/sessions/metadata` accepts `notes` as an updatable field, but `session-switcher-ui.js` has no notes-edit widget alongside the status-edit widget. Updating notes requires the raw PATCH API call. An inline notes textarea (similar to the rename pattern) would complete the post-archive tracking flow.

**GAP-ROPS-03 (MED): No "generated at" timestamp shown on individual files in File Review / Finalise tabs.**
`state-manager.js:79` tracks `finalGeneratedAt` but this value is not surfaced in `download-tab.js` or `finalise.js` file listings. When a user regenerates files (e.g., after layout adjustment), there is no per-file freshness signal — only the position-bar freshness chip, which is aggregate. A "Generated: {date}" label per file or a session-level generation timestamp in the Finalise "Generated Files" panel would improve confidence.

**GAP-ROPS-04 (LOW): No pipeline overview / dashboard across sessions.**
The Sessions modal shows `phase` and `application_status` per saved session but does not offer a summary pipeline view (e.g., how many in each status bucket, overdue follow-ups). This is outside single-session scope but relevant for recruiter operations tracking multiple applications.

**GAP-ROPS-05 (LOW): Archive confirmation does not show the output path prominently.**
After a successful archive (`finalise.js:283–294`), the confirmation panel shows file list, ATS score, approved rewrites, and git commit hash — but not the output directory path where files are stored. The output path is shown only in the "Generated Files" card above it, which may scroll out of view after the confirm result appears.

---

## Summary Table

| Criterion | Status | Key Evidence |
| --- | --- | --- |
| US-O1.1: Final outputs visible | ✅ Pass | `finalise.js:65–77`, `download-tab.js:21–73` |
| US-O1.2: Files available and current | ✅ Pass | `finalise.js:125–175` readiness checklist |
| US-O1.3: Finalise separated from preview | ✅ Pass | `index.html:194,223`; `app.js:137` |
| US-O1 AC: Confident readiness determination | ✅ Pass | Checklist with ✅/⚠/❌ per artifact type |
| US-O1 AC: Identify deliverables before finalising | ✅ Pass | Green files card above the finalise form |
| US-O2.1: Status values understandable | ⚠️ Partial | Only draft/ready/sent at archive; 6 values post-archive |
| US-O2.2: Notes captured at finalisation | ✅ Pass | `finalise.js:98–104`; `generation_routes.py:1942` |
| US-O2.3: Archive preserves follow-up context | ✅ Pass | `generation_routes.py:1940–1950`; 8 fields in metadata.json |
| US-O2 AC: Finalise flow stores tracking metadata | ⚠️ Partial | Status range gap (GAP-ROPS-01) |
| US-O2 AC: Metadata becomes part of archive | ✅ Pass | Archive summary confirms status |
| US-O3.1: Job-relevant file naming | ✅ Pass | `cv_orchestrator.py:1432`: `CV_{company}_{role}_{date}` |
| US-O3.2: File review manageable | ✅ Pass | `download-tab.js` deduplication + icons |
| US-O3.3: Multiple passes don't obscure current | ⚠️ Partial | Freshness chip exists; no per-file timestamp (GAP-ROPS-03) |
| US-O3 AC: Output naming supports external handling | ✅ Pass | Directory + filename both job-scoped |
| PATCH endpoint implemented | ✅ Pass | `session_routes.py:616–654` |
| Tag icon in session list | ✅ Pass | `session-switcher-ui.js:387–389` |
| Inline status select widget | ✅ Pass | `session-switcher-ui.js:374–385, 582–633` |
| Notes editable post-archive via UI | ⚠️ Partial | PATCH supports it; no UI widget (GAP-ROPS-02) |

---

## Key Evidence References

- `web/finalise.js:40–175` — `populateFinaliseTab`, files card, readiness checklist
- `web/finalise.js:91–95` — Status select: only draft/ready/sent
- `web/finalise.js:226–309` — `finaliseApplication()` function
- `web/session-switcher-ui.js:360–399` — `_renderSessionTableRow` with status badge and tag-icon action
- `web/session-switcher-ui.js:374–385` — Inline status-edit select widget
- `web/session-switcher-ui.js:582–633` — `startSessionStatusEdit`, `cancelSessionStatusEdit`, `submitSessionStatusEdit`
- `scripts/routes/session_routes.py:616–654` — `PATCH /api/sessions/metadata`
- `scripts/routes/session_routes.py:630` — `_VALID_STATUSES` (6 values)
- `scripts/routes/generation_routes.py:1880–2029` — `POST /api/finalise`
- `scripts/routes/generation_routes.py:1929` — Finalise status validation (3 values only)
- `scripts/utils/cv_orchestrator.py:1429–1432` — File naming pattern
- `web/state-manager.js:120–177` — Layout freshness computation
