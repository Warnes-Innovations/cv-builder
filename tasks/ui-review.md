<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
-->

# UI Review — Cycle 88

**Last updated:** 2026-07-06
**Cycle:** 88 — Full 15-persona + heuristic review against current source (post-cycles 83–87)
**Branch:** feature/multi-user-deployment

---

## Summary Counts

| Category | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
|----------|---------|-----------|--------|------------|
| Applicant (US-A*) | 8 | 3 | 1 | 0 |
| UX Expert (US-U*) | 28 | 17 | 1 | 2 |
| Resume Expert (US-R*) | 18 | 4 | 0 | 1 |
| Hiring Manager (US-M*) | 24 | 4 | 0 | 0 |
| Persuasion Expert (US-P*) | 11 | 5 | 0 | 3 |
| HR/ATS (US-H*) | 20 | 2 | 0 | 1 |
| Accessibility (US-X*) | 12 | 3 | 0 | 1 |
| First-Time User (US-F*) | 9 | 3 | 0 | 0 |
| Returning User (US-S*) | 9 | 0 | 0 | 0 |
| Power User (US-W*) | 14 | 2 | 0 | 0 |
| Recruiter Ops (US-O*) | 14 | 3 | 0 | 0 |
| Master CV Curator (US-M*) | 10 | 2 | 0 | 1 |
| Trust & Compliance (US-C*) | 13 | 3 | 0 | 0 |
| Graphical Designer (US-G*) | 6 | 6 | 0 | 0 |

**Resolved in Cycle 88:** GAP-326, GAP-328, GAP-332, GAP-338, GAP-340
**New gaps discovered:** GAP-326 through GAP-340 (15 new entries)
**False positives cleared:** GAP-DESIGN-08 (`--cv-card-bg` IS defined at `styles.css:29`); GAP-322/GAP-313/GAP-318/GAP-319 all confirmed RESOLVED by source

---

## Top Acceptance-Criteria Gaps (Prioritised)

### CRITICAL / HIGH

| GAP | Summary | Status |
|-----|---------|--------|
| GAP-326 | ATS DOCX included `candidate_to_confirm` skills, bypassing the PDF/HTML guard | **RESOLVED** cycle 88 |
| GAP-327 | `aria-hidden` not toggled on modals opened outside `openModal()` — background content readable by screen readers | OPEN |
| GAP-330 | No extracted-field confirmation before job analysis — misparsed fields propagate uncorrected | OPEN |
| GAP-01 | Master CV natural-language update flow (worktree agent — separate branch) | OPEN |

### MEDIUM

| GAP | Summary | Status |
|-----|---------|--------|
| GAP-328 | `window.confirm()` at rewrite gate suppressible by browser — replaced with `confirmDialog()` | **RESOLVED** cycle 88 |
| GAP-329 | Finalise ATS readiness always "not yet run" — `ats_checks` not in StatusResponse | OPEN |
| GAP-331 | Sessions modal focus-restore uses disconnected stacks (WCAG 2.1 AA violation) | OPEN |
| GAP-332 | Publications tab had no A/R keyboard navigation | **RESOLVED** cycle 88 |
| GAP-337 | Publications CRUD and BibTeX import lack pre-write backup | OPEN |
| GAP-338 | Cover letter exec/academic word count ranges diverged from story spec | **RESOLVED** cycle 88 |
| GAP-339 | Persuasion checks never run on generated summary or cover letter body | OPEN |
| GAP-309 | Duplicate `id` on publication modal heading — JS title updates silently fail (master-cv.js OFF-LIMITS until GAP-01) | OPEN |

### LOW / PARTIAL

| GAP | Summary | Status |
|-----|---------|--------|
| GAP-340 | ATS Score modal showed raw enum strings ("review_checkpoint") | **RESOLVED** cycle 88 |
| GAP-333 | Session notes field not rendered in sessions modal UI | OPEN |
| GAP-334 | No pre-archive readiness signal outside Finalise tab | OPEN |
| GAP-335 | LLM disclosure flag never resets on provider switch | OPEN |
| GAP-336 | Harvest bullet provenance (AI-accepted vs. user-edited) not shown | OPEN |
| GAP-325 | Finalise tab not in workflow nav (partially mitigated by button relabel; index.html OFF-LIMITS) | PARTIAL |
| GAP-16 | Structural UX (broad scope) | PARTIAL |

---

## Heuristic Findings

### Nielsen's 10 Heuristics

| # | Heuristic | Rating | Key Evidence |
|---|-----------|--------|-------------|
| H1 | Visibility of system status | 🟡 Minor | Dual loading indicators (`#llm-busy-overlay` + `#llm-status-bar`) fire simultaneously with independent timers. Generation step checklist solid. |
| H2 | Match between system and the real world | 🟡 Minor | "Goals" tab contains document config, not goal-setting. Raw `basis` strings in ATS modal (fixed cycle 88). |
| H3 | User control and freedom | 🟠 Major | Layout review requires two sequential proceed buttons. No multi-level undo. |
| H4 | Consistency and standards | 🟡 Minor | Position-bar buttons use inline hex styles bypassing token system (GAP-133 partial). |
| H5 | Error prevention | 🟠 Major | No extracted-field confirmation before job analysis (GAP-330). `window.confirm()` replaced (cycle 88). |
| H6 | Recognition rather than recall | 🟡 Minor | `#llm-non-confidential-badge` tooltip hover-only on non-focusable span — keyboard users cannot access it. |
| H7 | Flexibility and efficiency of use | 🟠 Major | Publications tab keyboard shortcuts added (cycle 88). Sessions always require full modal. |
| H8 | Aesthetic and minimalist design | 🟠 Major | Four persistent chrome layers consume ~210 px. 12 workflow steps + 11 arrows visible from page load. |
| H9 | Error recovery | 🟡 Minor | Publications CRUD/import lack pre-write backup. Finalise ATS readiness always shows "not yet run" (GAP-329). |
| H10 | Help and documentation | 🟢 Good | Welcome modal solid. Keyboard shortcuts panel (?). Confidence badge tooltips. Step hover tooltips. |

### Additional UX Dimensions

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Cognitive load | 🟠 Major | Customise tab exposes 9 sub-tabs simultaneously with no "start here" orientation. Post-layout steps all unlock at equal visual weight. |
| Visual hierarchy | 🟡 Minor | CSS token system complete for rules; ~86 inline styles in index.html bypass tokens (deferred pending GAP-01). No dark mode. |
| Information architecture | 🟡 Minor | "Generated Files" vs "File Review" two-tab split unexplained. Finalise tab hidden from workflow nav. |
| Workflow momentum | 🟠 Major | Two-step layout proceed (Confirm Layout + Generate Final). Session notes not visible in modal. |
| Feedback loops | 🟢 Good | LLM step checklist. ATS score badge with history. Generation progress polling. Position bar freshness chip. |
| Error recovery | 🟡 Minor | Publications CRUD/import no backup. Finalise readiness never populated from ATS run. |
| Affordance clarity | 🟡 Minor | Re-run affordance on completed steps has no visible "Re-run" label (US-A12). "Take Over" dialog is primary-styled with no disclosure text. |
| Terminology clarity | 🟡 Minor | "LLM:", "Non-confidential" badge, Temperature/Timeout — developer-centric for job applicants. "Goals" tab label mismatches content. |

### Top 5 UX Issues by Impact

1. **No extracted-field confirmation before job analysis (GAP-330)** — A LLM misparse of company name or role title propagates silently. `job-input.js:307, 385, 495`

2. **`aria-hidden` not toggled on most modals (GAP-327)** — Background content visible to screen readers when settings/sessions/publication modals are open. High impact for AT users.

3. **Customise tab 9 sub-tabs with no orientation** — First-time users see all sub-tabs simultaneously; "Goals" label mismatches content; no required/optional distinction. `ui-core.js:354–356`

4. **Dual loading indicators (H1)** — Both `#llm-busy-overlay` and `#llm-status-bar` fire simultaneously with independent timers and Stop buttons. `index.html:160–177`

5. **Sessions modal focus-restore bug (GAP-331)** — `openSessionsModal2` uses `window._focusedElementBeforeModal`; `closeSessionsModal` calls `restoreFocus()` popping `_focusStack`. Stacks disconnected; focus never returns to triggering element. WCAG 2.1 AA violation.

---

## Persona Reviews — Executive Summaries

### Applicant

One FAIL: no automatic `status: "queued"` set after intake (US-A1). Harvest not auto-prompted after Finalise (US-A11). Re-run affordance has no visible label (US-A12). Developer-centric labels in header need applicant-friendly alternatives. Strong areas: session management, state restoration, spell-check workflow.

### UX Expert

28 Pass / 17 Partial / 1 Fail / 2 Not Implemented. FAIL: no extracted-field confirmation before job analysis (GAP-330). NOT IMPLEMENTED: layout review clarification prompts; session restoration orientation card. PARTIAL: two sequential proceed buttons in layout; HTML-only inline preview.

### Resume Expert

ATS DOCX now filters `candidate_to_confirm` skills (cycle 88). Publication shortlist proactively presented, first-author scoring at +10 points (both confirmed resolved). Remaining: ATS keyword deduplication is display-only; custom spell-check dictionary not seeded from publication citations.

### Hiring Manager

Cover letter standard range matches spec. Exec/academic ranges now aligned (cycle 88). Zero-bullet guard confirmed. Para-1 check confirmed. Remaining: auto-tone suggestion from job domain; page-1 sparseness check; summary role/years validation.

### Persuasion Expert

Persuasion checks on rewrite candidates fully implemented. New gap: checks never run on generated summary or cover letter (GAP-339). Third-party validation language ("cited by", "selected by") not protected in rewrites. Narrative thread advisory fires too late (post-lock).

### HR/ATS

ATS DOCX structure solid. Finalise readiness never populated from ATS run (GAP-329). ATS Score modal raw basis strings fixed (cycle 88). Hard/soft skill classification end-to-end confirmed.

### Accessibility Specialist

Strong ARIA implementation. Two new HIGH findings: `aria-hidden` bypass (GAP-327) and sessions modal focus-restore mismatch (GAP-331). Workflow step states are color-only. LLM badge tooltip hover-only on non-focusable span.

### First-Time User

Onboarding modal solid. Main gap: 9-tab Customise stage with no orientation. All 12 workflow steps visible from load. "Goals" tab label mismatches content.

### Returning User

All 9 acceptance criteria across US-S1, US-S2, US-S3 pass. Single-session auto-resume working (GAP-323 confirmed). File timestamps confirmed rendered (GAP-313 confirmed).

### Power User

GAP-324 confirmed resolved. Publications tab keyboard nav added (cycle 88, GAP-332). Single-level bulk undo remains. Sessions always require full 980px modal.

### Recruiter Ops

File naming strong and job-relevant. Finalise tab still hidden from workflow nav. Two-tab split unexplained. Session notes not rendered in modal (GAP-333). No pre-archive readiness signal (GAP-334).

### Master CV Curator

US-M1, M2, M4 pass. Publication modal duplicate ID (GAP-309, master-cv.js OFF-LIMITS). Publications CRUD/import lack backup (GAP-337). Phase-lock shows raw "refinement" enum (GAP-312, OFF-LIMITS).

### Trust & Compliance

"Weak evidence" label confirmed at `rewrite-review.js:398` (GAP-322 source-verified resolved). `check_new_numeric_claims()` confirmed implemented. Remaining: LLM disclosure not reset on provider switch (GAP-335); harvest provenance not shown (GAP-336).

### Graphical Designer

CSS token system complete. ~86 inline styles in `index.html` defer to GAP-01. No dark mode. Font sizes/spacing hard-coded. GAP-DESIGN-08 confirmed false positive (`--cv-card-bg` at `styles.css:29`).

---

## Changes Made This Cycle

| File | Change | GAP |
|------|--------|-----|
| `scripts/utils/cv_orchestrator.py` | Filter `candidate_to_confirm` skills before ATS DOCX | GAP-326 |
| `web/app.js` | Replace `window.confirm()` with `await confirmDialog()` | GAP-328 |
| `web/keyboard-shortcuts.js` | Add publications pane to `_getCards()`, `_acceptFocusedCard()`, `_rejectFocusedCard()` | GAP-332 |
| `scripts/routes/master_data_routes.py` | Exec 350–450 → 400–500w; academic 400–500 → 500–600w | GAP-338 |
| `web/cover-letter.js` | Frontend word count targets aligned to story spec | GAP-338 |
| `web/ats-modals.js` | Map raw basis strings to human-readable labels | GAP-340 |

---

## Deferred / Blocked

| GAP | Blocker |
|-----|---------|
| GAP-309, GAP-310, GAP-311, GAP-312 | `master-cv.js` OFF-LIMITS until GAP-01 worktree agent completes |
| GAP-133 (inline styles in index.html) | `index.html` OFF-LIMITS until GAP-01 |
| GAP-325 (Finalise tab nav) | `index.html` OFF-LIMITS until GAP-01 |
| GAP-01 | In progress by separate worktree agent |
| GAP-16 | Large structural UX scope — no single implementable fix |
