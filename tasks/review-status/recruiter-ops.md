<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# UI Review: Recruiter / Application Operations Perspective

**Review cycle:** Cycle 7
**Date:** 2026-06-30

**Source files read:**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/download-tab.js`
- `web/finalise.js`
- `web/session-switcher-ui.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `scripts/routes/session_routes.py`
- `scripts/utils/cv_orchestrator.py` (grep)

---

## US-O1: Submission Readiness Clarity

### EC 1: Final outputs are clearly visible and distinguishable

**✅ Pass** — `web/download-tab.js` lines 21–74 (`_collectDownloadableFiles`) builds a typed list distinguishing PDF, DOCX, HTML, cover letter (`CoverLetter_` prefix), and screening (`Screening_` prefix). Each file gets a unique icon and descriptive label (e.g., "ATS-optimised PDF — machine-readable for automated screening" vs. "Human-readable PDF — for human reviewers and printing"). The download grid renders each file card in `_renderDownloadGrid` (lines 159–224).

### EC 2: The UI makes clear which files are available and current

**⚠️ Partial** — The File Review tab (`web/download-tab.js` line 310, `populateDownloadTab`) shows the generated files list with a "Generated `{timestamp}`" label per file when `cvData.metadata?.generation_date` is set (line 356). The layout freshness chip in the position bar (`state-manager.js` lines 120–178, `getLayoutFreshnessFromState`) surfaces "Files outdated" and "Layout current" signals. However:

- The "Generated" timestamp on each file card is only shown when `cvData.metadata?.generation_date` is non-null. The `StatusResponse` dataclass (`web_app.py` lines 103–153) lists `generated_files` as `Optional[Dict[str, Any]]` without an explicit `generation_date` sub-field contract, so the timestamp may be silently omitted.
- The File Review tab (`tab-download`) and the "Generated Files" tab (`tab-final_generate`) both live under the `download` workflow stage (STAGE_TABS in `ui-core.js` line 357). A user who has only visited one tab may not realise the other also contains downloadable links; there is no cross-reference between them.

### EC 3: Finalise/archive actions are clearly separated from earlier preview steps

**✅ Pass** — The Finalise tab (`id="tab-finalise"`, `index.html` line 223) is hidden from the tab strip by default (`style="display:none"`). Finalise is reached exclusively via the "📦 Package Application Files" action button (`id="finalise-action-btn"`, `index.html` line 194), which fires `switchTab('finalise')` (`app.js` line 137). The Finalise tab page (`finalise.js` lines 42–124) renders its own "Finalise & Archive" form, visually separate from the earlier File Review/download steps.

**Acceptance criteria verdict:** ⚠️ Partially met. The submission readiness checklist at `finalise.js` lines 128–179 does clearly distinguish required (❌) from optional (⚠) items. The main gaps are the conditional file timestamp and the dual-tab arrangement in the Download stage.

---

## US-O2: Application Metadata and Tracking

### EC 1: Status values are understandable and actionable

**✅ Pass** — The Finalise tab (`finalise.js` lines 91–98) renders a `<select>` with six human-readable options:

```text
draft      → "Draft — not yet sent"
ready      → "Ready to send"    (default selected)
sent       → "Sent"
interview  → "Interview scheduled"
rejected   → "Rejected"
accepted   → "Accepted"
```

These exactly match the backend `_VALID_STATUSES` set (`session_routes.py` line 630). The sessions modal (`session-switcher-ui.js` lines 360–371) also renders inline coloured status badges (`draft`=#94a3b8, `ready`=#3b82f6, `sent`=#22c55e, `interview`=#a855f7, `rejected`=#ef4444, `accepted`=#059669) for saved sessions.

### EC 2: Notes are captured at the point of finalisation

**✅ Pass** — The Finalise tab renders a freeform notes textarea (`id="finalise-notes"`, `finalise.js` lines 102–107) with placeholder text: "Recruiter name, salary info, follow-up date, interview notes…". This contextual hint directly signals recruiter-tracking use. The textarea appears in the same "Application Status" card immediately before the "Finalise & Archive" button (`finalise.js` lines 109–113), at the natural action point in the workflow.

### EC 3: Archive behaviour preserves the context needed for later follow-up

**⚠️ Partial** — `finaliseApplication()` (`finalise.js` lines 229–252) POSTs `{ status, notes }` to `/api/finalise`. The backend writes these to `metadata.json` alongside session state. The sessions modal reads `application_status` back from metadata for display in the session table (`session_switcher-ui.js` line 260). The metadata PATCH endpoint (`session_routes.py` lines 616–654) also supports post-hoc status updates from the session list.

**Gap 1 — Notes not editable post-archive:** The sessions modal inline-edit widget (`session-switcher-ui.js` lines 373–389) exposes a status dropdown per saved session row but does **not** expose a notes input field. After archival, notes can only be changed via a direct `PATCH /api/sessions/metadata` API call. There is no UI path to update them.

**Gap 2 — Notes not pre-populated on re-open:** `populateFinaliseTab` (`finalise.js` lines 42–124) fetches status from `/api/status` but does not read `metadata.json` to pre-populate `#finalise-notes` or `#finalise-status`. If a session is finalised and then re-opened, the user sees defaults ("Ready to send", empty notes) rather than the previously saved values.

**Gap 3 — Silent notes truncation:** The backend truncates notes at 2000 characters (`session_routes.py` line 647: `meta["notes"] = str(new_notes)[:2000]`). There is no `maxlength` on the textarea and no client-side character counter, so a user filling extensive notes is silently truncated.

**Acceptance criteria verdict:** ⚠️ Partially met. Status tracking is well-implemented end-to-end. Notes capture at finalise time is in place. However, notes cannot be read back or updated from the UI after archival, and the silent truncation at 2000 chars is a data-loss risk.

---

## US-O3: File Naming and Package Hygiene

### EC 1: Generated files use job-relevant naming

**✅ Pass** — `cv_orchestrator.py` builds filename bases from company and role slugs extracted from the job description:

- Line 1432: `filename_base = f"CV_{company}_{role}_{timestamp}"`
- Line 2056: `output_name = f"{company}_{role_slug}_{timestamp}"`
- Line 3824 (ATS DOCX): `filename = f"CV_{company}_{role}_{timestamp}_ATS.docx"`
- Line 2298 (preview): `filename_base = f"CV_{company}_{role_slug}_{timestamp}_preview"`

Session directories adopt the `{CompanySlug}_{RoleSlug}_{date}` pattern via `_rename_session_dir` (`conversation_manager.py` lines 1953–2008), called after job analysis and intake confirmation.

### EC 2: File review surfaces present outputs in a manageable way

**✅ Pass** — `_collectDownloadableFiles` (`download-tab.js` lines 21–74) deduplicates files and groups them with icon, description, and format metadata. `_renderDownloadGrid` (lines 159–224) renders each as a card with icon, filename, description, optional timestamp, and a Download button or Blocked badge. The File Review tab also runs ATS validation (`/api/ats-validate`, line 329) and presents a pass/warn/fail table so the user can assess output quality before downloading.

### EC 3: Multiple generation passes do not obscure which output is current

**⚠️ Partial** — The layout freshness chip (`state-manager.js` lines 120–178, `getLayoutFreshnessFromState`) shows "Files outdated" when `contentRevision > lastFinalContentRevision`. However:

- When the user runs multiple generation passes, old files remain on disk. The File Review tab collects whatever files are present in `cvData.files` from the most recent API call. The distinction between preview-only HTML (suffix `_preview`) and final delivery files is only communicated through the filename itself; this naming convention is not explained anywhere in the UI.
- The "Generated Files" tab (`tab-final_generate`) and the "File Review" tab (`tab-download`) coexist in the `download` workflow stage (STAGE_TABS `ui-core.js` line 357). After final generation, both tabs are visible simultaneously. It is unclear to a user which tab holds the authoritative set of outputs.

**Acceptance criteria verdict:** ⚠️ Partially met. File naming is job-relevant and filesystem hygiene is good. However, the distinction between preview and final files is not surfaced in the UI, and the dual-tab Download stage layout creates ambiguity about which tab is the delivery checkpoint.

---

## Summary Table

| Story | Criterion | Status | Source evidence |
| --- | --- | --- | --- |
| US-O1 EC1 | Final outputs visible and distinguishable | ✅ Pass | `download-tab.js:21–74` — typed file list with icons and descriptions |
| US-O1 EC2 | UI shows which files are current | ⚠️ Partial | Timestamp conditional on `metadata.generation_date`; dual-tab ambiguity (`ui-core.js:357`) |
| US-O1 EC3 | Finalise clearly separated from preview | ✅ Pass | `index.html:194,223`; `app.js:137`; Finalise hidden by default |
| US-O2 EC1 | Status values understandable and actionable | ✅ Pass | `finalise.js:91–98`; `session_routes.py:630`; 6 clear labels with colour coding |
| US-O2 EC2 | Notes captured at finalisation | ✅ Pass | `finalise.js:102–107`; textarea with contextual placeholder |
| US-O2 EC3a | Archive preserves tracking context | ✅ Pass | `session_routes.py:616–654`; `metadata.json` write-through; PATCH endpoint exists |
| US-O2 EC3b | Notes editable after archival | ❌ Fail | `session-switcher-ui.js:373–389` exposes status-only inline edit; no notes input |
| US-O2 EC3c | Notes pre-populated on re-open | ❌ Fail | `finalise.js:42–52` fetches status only; no metadata read to prefill fields |
| US-O2 EC3d | Notes truncation communicated | ❌ Fail | `session_routes.py:647` silently truncates at 2000 chars; no client-side limit or counter |
| US-O3 EC1 | Job-relevant file naming | ✅ Pass | `cv_orchestrator.py:1432,2056,3824`; `{Company}_{Role}_{timestamp}` pattern |
| US-O3 EC2 | File review manageable | ✅ Pass | `download-tab.js:159–224`; deduplication, ATS validation, blocked-format badges |
| US-O3 EC3 | Multiple passes do not obscure current output | ⚠️ Partial | `_preview` suffix unexplained; dual-tab `final_generate`/`download` has no disambiguation prose |

---

## Priority Findings

### P1 — Notes not editable after archival (❌)

**Location:** `web/session-switcher-ui.js` lines 373–389 (inline status widget), `web/finalise.js` lines 229–263 (finalise submit).

**Impact:** A recruiter who needs to add or update follow-up information (interview outcome, salary negotiation details, next-step date) after the session is archived has no UI path to do so. The PATCH endpoint (`PATCH /api/sessions/metadata`) accepts a `notes` field but it is not exposed in the sessions modal. Only `application_status` can be updated from the UI post-archive.

**Fix:** Add a notes textarea to the inline-edit widget in `session-switcher-ui.js`, wiring it to the existing PATCH endpoint.

### P2 — Notes not pre-populated on Finalise re-open (❌)

**Location:** `web/finalise.js:populateFinaliseTab` (lines 42–52).

**Impact:** If a user opens the Finalise tab a second time (e.g. to update status), the notes textarea is blank and the status select shows "Ready to send" (default), not the previously saved values. The user cannot see or correct what was recorded.

**Fix:** Fetch `metadata.json` via API on Finalise tab load and pre-populate `#finalise-status` and `#finalise-notes` from the saved values.

### P3 — Silent notes truncation (❌)

**Location:** `scripts/routes/session_routes.py` line 647; `web/finalise.js` lines 103–107.

**Impact:** Notes are silently capped at 2000 characters server-side. A recruiter entering extensive notes loses content without warning.

**Fix:** Add `maxlength="2000"` to `#finalise-notes` and a character counter (`1500 / 2000`). Optionally raise the cap.

### P4 — Preview vs. final file distinction unexplained (⚠️)

**Location:** `web/download-tab.js:_collectDownloadableFiles` (lines 21–74); `web/final-generate.js`.

**Impact:** Preview files (`_preview.html`) and final delivery files (`.pdf`, `.docx`) may both appear in the File Review tab. The only differentiator is the filename suffix, which is not annotated in the download card description. A recruiter might download the preview HTML thinking it is the final deliverable.

**Fix:** Annotate files containing `_preview` in their description, or exclude preview files from the File Review tab once final files are present.

### P5 — Dual-tab ambiguity in Download stage (⚠️)

**Location:** `web/ui-core.js:STAGE_TABS` line 357 (`download: ['final_generate', 'download']`); `web/index.html` lines 221–222.

**Impact:** Once the user reaches the Download stage, both "Generated Files" and "File Review" tabs appear. Neither tab explains its relationship to the other. A recruiter may download from "Generated Files" without realizing the "File Review" tab contains ATS validation results that could block download.

**Fix:** Add a cross-reference note in each tab's header, or consolidate the two tabs into a single view with ATS validation above and download links below.

### P6 — File generation timestamp not guaranteed (⚠️)

**Location:** `web/download-tab.js` line 356 (`cvData.metadata?.generation_date`); `scripts/web_app.py:StatusResponse` (lines 103–153, `generated_files` is `Optional[Dict[str, Any]]` — no explicit `generation_date` contract).

**Impact:** When the backend omits `generation_date` from `generated_files`, each file card shows no timestamp and the user cannot determine when the output was produced.

**Fix:** Add `generation_date` to the `generated_files` sub-schema and ensure it is always populated by `cv_orchestrator.py`.
