<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter-Ops Persona Review

**Persona:** Recruiter / Application Operations Reviewer
**Review date:** 2026-06-18
**Cycle:** 3
**Source files examined (canonical — not bundle.js):**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/finalise.js`
- `web/session-switcher-ui.js`
- `web/download-tab.js`
- `scripts/routes/master_data_routes.py`
- `scripts/routes/generation_routes.py`

---

## Changes Since Cycle 2

### GAP-145 Fix Verified

**Cover letter filename** (`master_data_routes.py:1639`):

```python
filename = f'CoverLetter_{company}_{role}_{date_str}.docx'
```

Result: now includes role token. Example: `CoverLetter_Acme_Software_Engineer_2026-06-18.docx`. Previously `CoverLetter_{company}_{date}.docx`.

**Screening filename** (`master_data_routes.py:1873`):

```python
filename = f'Screening_{company_s}_{role_s}_{date_str}.docx'
```

Result: now includes company and role tokens. Example: `Screening_Acme_Software_Engineer_2026-06-18.docx`. Previously `Screening_Responses_{date}.docx`.

**New bug introduced by GAP-145 fix** (`web/download-tab.js:53`):

The download-tab's `_collectDownloadableFiles` function still checks for the old prefix `'Screening_Responses_'`:

```js
} else if (filename.startsWith('Screening_Responses_')) {
  description = 'Screening question responses — Word document';
```

The new filename pattern starts with `'Screening_'` (followed by company), not `'Screening_Responses_'`. As a result, screening DOCX files generated after the GAP-145 fix will not match this branch and will fall through to the generic DOCX description (`'ATS-optimised Word document — keyword-optimised for job applications'` or `'Human-readable Word document — editable format'`). The file will still appear in the Download tab, but with a misleading generic description rather than "Screening question responses — Word document". The fix is to change the prefix check to `'Screening_'` (or use a regex that matches both patterns).

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

**Story:** As a recruiter or application-operations reviewer, I want to know when the application package is complete and ready to send, so that the finalisation step represents a trustworthy readiness checkpoint.

**Criterion 1: Final outputs are clearly visible and distinguishable.**

PASS (with caveat) — The Download ("File Review") tab renders each file via `_renderDownloadGrid` (`download-tab.js`). File cards show an icon, raw filename, and a descriptive string. File-type detection is done by filename suffix and prefix in `_collectDownloadableFiles`.

Caveat: The `Screening_` prefix mismatch (see Changes Since Cycle 2) means screening DOCX cards display a generic description rather than the specific "Screening question responses — Word document" label. This is a regression from the GAP-145 fix and reduces distinguishability for screening deliverables.

The two tabs (`tab-final_generate` = "Generated Files" and `tab-download` = "File Review") are shown together in the download stage (`STAGE_TABS.download = ['final_generate', 'download']`, `ui-core.js:357`). There is no unified "package complete" banner across both tabs.

**Criterion 2: The UI makes clear which files are available and current.**

PARTIAL — The layout freshness chip (`#layout-freshness-chip`) communicates stale/current state based on `stateManager`'s generation state model (`state-manager.js`). When `isCritical` is true (content revised after final files were produced), the chip updates visually. The three states are: `'Files outdated'` (critical, red), `'Layout outdated'` (stale, amber), `'Layout current'` (fresh, green).

However:

- The download tab does not repeat the staleness signal inline alongside the file list. A user navigating directly to the File Review tab sees files without any integrated "these may be outdated" warning in the file cards themselves.
- Neither the Download nor Finalise tab attaches a "generated at [datetime]" label to individual file cards. If generate-final has been run multiple times, there is no per-file timestamp to confirm currency.

**Criterion 3: Finalise/archive actions are clearly separated from earlier preview steps.**

PASS — The `finalise-action-btn` button (`index.html:190`) is only shown after `final-generate-proceed-btn` fires. The Finalise tab (`populateFinaliseTab`, `finalise.js:42`) renders a distinct section titled "Finalise Application" with a green "Finalise & Archive" button, clearly separated from the layout and download steps. `tab-finalise` is `display:none` in HTML (`index.html:219`) and is not listed in `STAGE_TABS`, so it does not appear in normal tab bar navigation — only reachable by `finalise-action-btn` or `switchTab('finalise')`. This separation is clear.

**Acceptance Criteria:**

- "The final-stage UI supports a confident determination of package readiness" — PARTIAL. ATS validation blocks failing formats in the download grid, and the freshness chip flags stale content. But there is no unified "all-clear" or "not ready" package-readiness gate before the Finalise button becomes available.
- "The user can identify the current set of deliverables before finalising" — PARTIAL. The Finalise tab shows a file list (`finalise.js:65-79`), but does not label files with a currency timestamp, and does not visually distinguish the current run from an earlier one.

---

### US-O2: Application Metadata and Tracking

**Story:** As a recruiter or application-operations reviewer, I want to capture status and notes in a structured way, so that submission tracking remains organized after files are generated.

**Criterion 1: Status values are understandable and actionable.**

PASS — The Finalise tab renders a `<select id="finalise-status">` with three human-readable options: "Draft — not yet sent", "Ready to send", "Sent" (`finalise.js:89-93`). The backend validates against the enum `('draft', 'ready', 'sent')` (`generation_routes.py:1908`). Labels are operationally clear for a recruiter tracking application state.

**Criterion 2: Notes are captured at the point of finalisation.**

PASS — A `<textarea id="finalise-notes">` is rendered on the Finalise tab with placeholder text: "Recruiter name, salary info, follow-up date, interview notes…" (`finalise.js:97-101`). Notes are submitted in `POST /api/finalise` as `notes` and written to `metadata.json` (`generation_routes.py:1908-1924`).

**Criterion 3: Archive behavior preserves the context needed for later follow-up.**

PASS — `POST /api/finalise` (`generation_routes.py:1882`) writes to `metadata.json` in the output directory:

- `application_status` and `notes` (user-supplied, line 1923-1924)
- `finalised_at` ISO timestamp (line 1925)
- `clarification_answers` from post-analysis Q&A
- `spell_audit`, `layout_instructions`, `validation_results`
- `ats_score` from generation state

Screening responses are upserted to `response_library.json` at finalisation. A git commit is created with message `feat: Add {Company}_{Role}_{date} application`, providing version-controlled history.

The success confirmation card in the UI shows status, approved rewrite count, ATS score, and git commit hash (`finalise.js:178-189`). This is a comprehensive archive.

Caveat: The success card does not display the output directory path, so a recruiter cannot confirm the file location from the UI without checking the Download tab's "Output Directory" line. The ATS score in the success card is conditional on `summary.ats_score` being non-null; if ATS scoring was not run in the session, the score field is absent.

**Acceptance Criteria:**

- "The finalise flow supports storing practical application-tracking metadata" — PASS.
- "The workflow makes clear when that metadata becomes part of the archived session" — PARTIAL. The git commit hash confirms archival, but output path is omitted from the success card; ATS score display is conditional.

---

### US-O3: File Naming and Package Hygiene

**Story:** As a recruiter or application-operations reviewer, I want to verify that output artifacts are clearly named and grouped, so that files can be managed outside the application without confusion.

**Criterion 1: Generated files use job-relevant naming.**

PASS (improved from cycle 2) — File naming is now consistently job-relevant across all artifact types, including cover letter and screening:

- CV finals: `CV_{company}_{role}_{date}.html/.pdf`
- ATS DOCX: `CV_{company}_{role}_{date}_ATS.docx`
- Human DOCX: `CV_{company}_{role}_{date}.docx`
- Cover letter: `CoverLetter_{company}_{role}_{date}.docx` (GAP-145 fix — role token added)
- Screening: `Screening_{company}_{role}_{date}.docx` (GAP-145 fix — company + role tokens added)
- Git commit: `feat: Add {Company}_{Role}_{date} application`

The cycle 2 caveat about cover letter and screening filenames colliding for same-company-same-day applications is resolved.

**Criterion 2: File review surfaces present outputs in a manageable way.**

PARTIAL (regression from cycle 2) — The Download tab renders each file as a card with icon, filename, description, and a Download button. ATS-blocked files are greyed out with a "Blocked" label.

Regression: `download-tab.js:53` still checks for `'Screening_Responses_'` prefix, but the new filename format starts with `'Screening_'` (e.g. `Screening_Acme_Software_Engineer_2026-06-18.docx`). Screening DOCX files will match the generic DOCX branch instead, showing a generic description label. The file appears in the download grid correctly (since registration into `generated_files.files` at `master_data_routes.py:1910-1915` is correct), but its description is wrong.

**Criterion 3: Multiple generation passes do not obscure which output is current.**

PARTIAL — Same finding as cycle 2. The layout freshness chip tracks content revision and whether outputs are stale. The download tab collects files from session state (`cvData.files`, etc.), so it reflects the current generation run's file list. However, neither the Download nor Finalise tab attaches a per-file "generated at [datetime]" label. Preview artifacts are correctly filtered out of the file list.

**Acceptance Criteria:**

- "Output presentation and naming support practical handling outside the UI" — PASS for naming (improved); PARTIAL for multi-run disambiguation (no per-file timestamp) and partial regression on screening description label.

---

## Extended Evaluation: Package Completeness Signals

The cover letter and screening DOCX files are registered into the session's `generated_files.files` array after saving and appear in the Download tab automatically. The description regression for screening files (see US-O3.2) does not prevent them from appearing — only the label is wrong.

There is still no completeness checklist in the Download or Finalise tab that verifies "CV + cover letter + screening responses" are all present before the user proceeds to finalise.

The Sessions modal's "Status" column (`session-switcher-ui.js:327-329`) shows session ownership status (Current / other active / Saved), not `application_status` from `metadata.json`. A recruiter managing multiple applications has no at-a-glance view of which sessions are "Ready to send" or "Sent". The `_normalizeSessionsForTable` function (`session-switcher-ui.js:235`) does not read `application_status` from the session data; the API response from `/api/sessions` would need to expose this field.

---

## Summary of Findings

| Criterion | Status | Key Evidence |
| --- | --- | --- |
| US-O1.1 Final outputs visible and distinguishable | PASS (caveat) | File cards have icons + descriptions; screening description regression introduced by GAP-145 fix |
| US-O1.2 Which files are available and current | PARTIAL | Freshness chip exists; not shown inline in download tab; no per-file timestamp |
| US-O1.3 Finalise separated from preview steps | PASS | `finalise-action-btn` gated behind final-generate; tab hidden in nav bar |
| US-O2.1 Status values understandable | PASS | Three-value select: draft / ready / sent; backend validates enum |
| US-O2.2 Notes captured at finalisation | PASS | `finalise-notes` textarea; placeholder prompts recruiter name, follow-up date |
| US-O2.3 Archive preserves follow-up context | PASS | metadata.json captures status, notes, ATS, audit, git commit |
| US-O2 archive confirmation clear | PARTIAL | Success card shows hash; output path omitted; ATS score conditional |
| US-O3.1 Job-relevant file naming | PASS (improved) | GAP-145 fix: all filenames now include company + role + date |
| US-O3.2 File review surface | PARTIAL (regression) | Screening DOCX description wrong: `download-tab.js:53` checks old `'Screening_Responses_'` prefix; new format starts with `'Screening_'` |
| US-O3.3 Multi-run file disambiguation | PARTIAL | Freshness chip tracks staleness; no per-file timestamp in file list |
| Package completeness checklist | NOT IMPLEMENTED | No automated gate confirming CV + cover letter + screening are all present |
| Cross-session pipeline visibility | NOT IMPLEMENTED | Sessions modal shows ownership status, not `application_status` from metadata |

### Top Gaps to Address

1. **Screening prefix mismatch (BUG — regression from GAP-145)**: `download-tab.js:53` must change `'Screening_Responses_'` to `'Screening_'` to match the new `Screening_{company}_{role}_{date}.docx` filename format. Without this fix, the screening DOCX description displays as a generic "Human-readable Word document" instead of "Screening question responses — Word document".

2. **No cross-session pipeline status view** (US-O2 extended): The Sessions modal lists sessions by position name, timestamp, and phase, but does not surface `application_status` ("draft" / "ready" / "sent") from `metadata.json`. A recruiter managing multiple active applications has no at-a-glance view of which are ready to send. The `/api/sessions` API response would need to expose this field, and `_normalizeSessionsForTable` would need to pass it into `_renderSessionTableRow`.

3. **No package completeness gate before Finalise** (US-O1.1): There is no automated check on the Finalise tab (or before reaching it) that confirms CV, cover letter, and screening responses are all present and non-stale.

4. **No per-file currency timestamp in file lists** (US-O1.2 / US-O3.3): Neither the Download tab nor the Finalise tab labels file cards with "generated at [datetime]". Adding a timestamp to each file card would confirm currency without user inference.

5. **Finalise success card omits output path** (US-O2.3 minor): The archive confirmation shows the git commit hash but not the output directory path. Adding the path (already surfaced in the Download tab) would confirm to the recruiter where the archived files are stored.
