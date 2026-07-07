<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter-Ops Review Status

**Persona:** Recruiter / Application Operations Reviewer
**Story file:** `tasks/user-story-recruiter-ops.md`
**Review date:** 2026-07-06
**Reviewer cycle:** Source-first (no gaps.md consulted)
**Verdict:** PARTIAL — tracking infrastructure and readiness chip are solid; Finalise/archive tab is unreachable via normal workflow

---

## Summary Verdict Per Story Criterion

| Story | Criterion | Status |
| ----- | --------- | ------ |
| US-O1 | Final outputs clearly visible and distinguishable | PASS |
| US-O1 | UI makes clear which files are available and current | PARTIAL |
| US-O1 | Finalise/archive clearly separated from earlier preview | FAIL — archive tab unreachable |
| US-O2 | Status values understandable and actionable | PARTIAL |
| US-O2 | Notes captured at point of finalisation | PASS |
| US-O2 | Archive behavior preserves tracking context | PASS |
| US-O3 | Generated files use job-relevant naming | PASS |
| US-O3 | File review surfaces outputs in a manageable way | PASS |
| US-O3 | Multiple passes do not obscure which output is current | PASS |

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

#### Readiness chip in File Review — IMPLEMENTED (GAP-334 resolved)

`web/download-tab.js` lines 408–424 compute a readiness chip from the generated file list and ATS results. The chip counts required file types (CV PDF, CV DOCX, CV HTML) and appends an ATS pass/fail indicator, then renders inline in the page heading: `"Required files: N/3 ✅ · ATS ✅"`. Color coding (green/amber/red) matches the semantic severity pattern used elsewhere in the app. This chip is the only persistent, always-visible signal of package completeness on the File Review tab and directly addresses US-O1 acceptance criterion 1.

#### Finalise tab is unreachable in normal workflow — CRITICAL GAP

The Finalise tab has a complete and correct implementation in `web/finalise.js` (status dropdown, notes textarea, seven-item readiness checklist, archive button, rewrite audit log) but it is structurally hidden and unreachable for four independent reasons:

1. **Tab bar**: `web/index.html` line 227 declares `id="tab-finalise"` with hardcoded `style="display:none"`. The `updateTabBarForStage()` function (`web/ui-core.js` lines 562–571) shows only tabs listed in the `STAGE_TABS` map (lines 357–370). `'finalise'` is absent from that map. The tab is never revealed.

2. **Action button**: `web/index.html` line 198 declares `id="finalise-action-btn"` with hardcoded `style="display:none"`. `updateActionButtons()` in `web/ui-helpers.js` line 156 shows a button only when called with its mapped stage; `'finalise'` → `'finalise-action-btn'` (line 149). That call never happens: `PHASE_TO_STEP` in `web/state-manager.js` lines 35–44 maps every backend phase (`init`, `job_analysis`, `customization`, `rewrite_review`, `spell_check`, `generation`, `layout_review`, `final_generation`, `refinement`) to `download` or earlier — never to `'finalise'`. `workflow-steps.js` line 1076 calls `updateActionButtons(activeStep)` where `activeStep` comes from `PHASE_TO_STEP` exclusively.

3. **Workflow nav bar**: The top navigation (Job → Analysis → Customise → Rewrites → Spell Check → Layout Review → File Review → Cover Letter → … → Harvest) has no Finalise step. The step ID list in `web/workflow-steps.js` line 1001–1003 explicitly enumerates every navigable step and does not include `'finalise'`. `handleStepClick()` (line 1141) likewise omits `'finalise'` from its `stepToTab` map.

4. **Cross-tab navigation**: The File Review tab (`web/download-tab.js` lines 518–523) provides a single end-of-page navigation button: "📩 Proceed to Cover Letter →". There is no Archive, Finalise, or Manage link. `finalGenerationComplete()` (`web/final-generate.js` line 238) appends a chat message "You can now finalise your application" but provides no corresponding UI element.

**Impact**: A recruiter-ops user who has completed the generation pipeline and wants to archive the application, record submission notes, or set a tracking status has no discoverable path to do so. The Finalise feature exists in the code and works correctly; it simply cannot be reached.

#### Readiness checklist content is well-designed — correct design, inaccessible

`_renderReadinessChecklist()` at `web/finalise.js` lines 163–213 renders a seven-item checklist: CV PDF present (❌ required), CV DOCX present (❌ required), CV HTML present (❌ required), cover letter generated (⚠ optional), screening Q&A generated (⚠ optional), ATS validation passed (⚠ optional), layout current (⚠ optional). The legend note ("⚠ items are optional — they warn but do not block archiving. ❌ items must be resolved before submitting.") correctly communicates what blocks submission vs. what is advisory. This is the right UX for US-O1. It is inaccessible.

---

### US-O2: Application Metadata and Tracking

#### Application status values — PARTIALLY ADEQUATE

The Finalise tab (`web/finalise.js` lines 101–111) presents eight status values: queued, draft, ready, sent, interview, rejected, accepted, parked. The sessions modal (`web/session-switcher-ui.js` lines 374–386) uses the same eight values with color-coded inline badges (grey/blue/green/yellow/purple/red/green/orange). The badges are visually distinct and machine-scannable at a glance.

The default in the Finalise tab is `queued` ("Queued — will apply soon"). At the point of archiving a completed package, "queued" describes a pre-submission state. A recruiter archiving a job they are about to submit would naturally expect "ready" or no default. The "queued" default signals the wrong moment.

The values "parked" (informal) and "queued" (pipeline jargon) are not universally standard in recruiting vocabulary. "On Hold" and "Ready to Send" would be more intuitive to an ops-focused recruiter without losing meaning.

#### Notes captured at finalisation — PASS

`web/finalise.js` lines 113–120 render a textarea with a 2000-character limit, live character counter (`finalise-notes-counter`), `aria-live="polite"` counter, and a recruiter-oriented placeholder: "Recruiter name, salary info, follow-up date, interview notes…". Notes persist via `POST /api/finalise` and are pre-populated on re-visit via `_restoreFinaliseMeta()` (lines 141–158). This correctly implements US-O2 criterion 2.

#### Session notes editable in sessions modal — PASS

`web/session-switcher-ui.js` lines 407–417 render an inline notes-edit widget for saved sessions: a resizable textarea with 2000-char limit, save and cancel buttons, and a truncated preview line. The widget fires `PATCH /api/sessions/metadata`. The preview truncates with `text-overflow:ellipsis` and exposes the full text as a `title` tooltip. This correctly supports post-archive follow-up (US-O2 criterion 3).

#### Application status editable in sessions modal — PASS

`web/session-switcher-ui.js` lines 391–401 render an inline status-edit dropdown for saved sessions. Submit fires `PATCH /api/sessions/metadata` and updates the in-row badge without page reload. This is the right pattern for rapid status updates across multiple sessions.

#### Status and notes only editable for saved sessions — MINOR GAP

The status-edit and notes-edit widgets (lines 389–417) are conditional on `row.type === 'saved'`. Active in-memory sessions show no status badge, no status-edit widget, and no notes widget. A user with an active session who wants to tag it before saving has no path to do so. For recruiter-ops workflows where status is set during the session (e.g., "Interview scheduled while CV was open"), this is a real but minor gap.

#### Archive behavior preserves context — PASS

The archive confirmation panel (`web/finalise.js` lines 324–334) echoes status, approved rewrites, ATS score summary, session duration, and the git commit hash. `_renderFinaliseAtsItems()` (lines 30–47) extracts overall, hard-requirement, and soft-requirement ATS scores into the confirmation. This gives the recruiter a meaningful audit trail at the moment of archival.

---

### US-O3: File Naming and Package Hygiene

#### Generated file naming — PASS

Files use the pattern `CV_{Company}_{Role}_{YYYY-MM-DD}.{ext}` for the main CV and `CoverLetter_...`, `Screening_...` for supplementary documents. `_collectDownloadableFiles()` (`web/download-tab.js` lines 22–78) deduplicates files across multiple field sources (`.files[]`, `.final_html`, `.final_pdf`, `.html`, `.pdf`, `.docx`, `.ats_docx`) and enriches each with an icon, human-readable description, and format tag. ATS-optimised variants are explicitly labeled ("ATS-optimised PDF — machine-readable for automated screening") versus human-readable variants, which supports external file management.

#### Multiple generation passes — PASS

`_renderDownloadGrid()` (`web/download-tab.js` lines 190–261) embeds a `"Run #N — {date}"` timestamp on each file row when `generation_run > 1`, making the generation sequence visible. The layout freshness chip in the position bar independently signals when a layout rebuild is needed.

#### Download grid and output directory visible — PASS

The output directory path is displayed both in the File Review tab footer and in the Finalise tab header (`web/finalise.js` line 89). Individual file rows include format-specific descriptions and a "Working file — not for submission" badge on preview HTML files (line 233). These collectively support external file management (US-O3 acceptance criterion).

---

## Generated Materials Evaluation

### Package Completeness Signal

The readiness chip ("Required files: N/3 ✅") appears at the top of the File Review tab immediately upon tab load without scrolling. The ATS inline summary ("· ATS ✅" or "· ATS ⚠ N issues") provides a go/no-go signal in one line. The wording "Required files" is slightly technical; "Package complete" or "3/3 submission files ready" would be more accessible for a non-technical recruiter-ops audience.

### Metadata in Archived Package

The archive confirmation panel (`web/finalise.js` lines 324–334) echoes status, approved rewrites, ATS score, and session duration. It does not enumerate which files were committed. A recruiter looking at the confirmation panel after archiving does not see a file list confirming what was saved to disk.

### ATS Score Traceability Across Sessions

ATS scores are persisted to `metadata.json` at archival and surfaced as color-coded percentage badges in the sessions table (`web/session-switcher-ui.js` lines 426–432). Green ≥75%, amber ≥50%, red <50%. A recruiter managing multiple applications can see at a glance which packages had the strongest keyword match. This is a genuine recruiter-ops strength.

---

## Gaps Identified

| ID | Severity | Description |
| -- | -------- | ----------- |
| GAP-NEW-RO-01 | HIGH | Finalise/archive tab and "Archive Application" button are unreachable in the normal workflow. `STAGE_TABS` (`web/ui-core.js:357`) has no `finalise` key; `PHASE_TO_STEP` (`web/state-manager.js:35`) never maps to `finalise`; `tab-finalise` is permanently `display:none` (`web/index.html:227`); `finalise-action-btn` is never surfaced by `updateActionButtons`. The File Review tab should surface an "Archive Application" link or button, or the workflow nav should add a Finalise step. |
| GAP-NEW-RO-02 | MEDIUM | Default status in the Finalise dropdown is "queued — will apply soon" (`web/finalise.js:102`). At the archival moment this implies a pre-submission state. Default should be "ready" or unset. |
| GAP-NEW-RO-03 | LOW | Readiness chip text "Required files: N/3" is internally phrased. "Package complete — 3/3 files" or "Submission-ready" would be clearer to a non-developer recruiter. |
| GAP-NEW-RO-04 | LOW | Application status and notes are only editable in the sessions modal for `type === 'saved'` sessions (`web/session-switcher-ui.js:389,406`). Active in-memory sessions cannot be tagged. |
| GAP-NEW-RO-05 | LOW | Archive confirmation panel (`web/finalise.js:324`) does not list which files were committed. File list from `summary.files` (or `generated.files`) should appear so the recruiter can verify the archive contents. |

---

## Positive Findings

- Readiness chip (GAP-334) is implemented, visually integrated, and immediately scannable at the top of the File Review heading.
- Sessions table is a strong multi-application hub: sortable, searchable, with inline rename, status-edit, notes-edit, duplicate, and trash operations.
- ATS score badges per session in the table enable cross-application comparison at a glance.
- The archive-then-harvest flow (Finalise → Harvest) is logically sequenced: safe the record, then optionally propagate improvements.
- Notes placeholder text ("Recruiter name, salary info, follow-up date, interview notes…") is directly recruiter-ops vocabulary.
- Trash/restore pattern provides a safety net before permanent session deletion.
- Advisory-only ATS checks (`_NON_BLOCKING_CHECKS` in `web/download-tab.js:178`) correctly distinguish minor formatting guidance from actual failures, preventing false alarms that would stall a recruiter pipeline.

---

**Sources reviewed:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `web/finalise.js`, `web/download-tab.js`, `web/final-generate.js`, `web/session-switcher-ui.js`, `web/ui-helpers.js`, `web/workflow-steps.js`, `web/review-table-base.js`, `web/keyboard-shortcuts.js`, `web/layout-instruction.js`

**Evidence standard:** Every conclusion above is supported by a specific file:line reference.
