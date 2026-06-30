<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Cycle 9

**Date:** 2026-06-29
**Branch:** feature/multi-user-deployment
**Personas reviewed:** 14 of 15 complete (HR/ATS specialist pending)
**Source:** 15 sub-agents launched in parallel; status files written under `tasks/review-status/`

---

## Summary Counts (14 personas)

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|---------|---------|-----------|--------|------------|-------|
| Applicant | ~9 | ~3 | 0 | 0 | 0 |
| UX Expert | 23 | 17 | 2 | 3 | 2 |
| Resume Expert | 17 | 6 | 5 | 0 | 0 |
| Hiring Manager | 11 | 18 | 0 | 4 | 1 |
| Persuasion Expert | 11 | 10 | 2 | 8 | 0 |
| HR/ATS Specialist | 20 | 6 | 5 | 2 | 0 |
| Accessibility Specialist | 6 | 6 | 0 | 0 | 1 |
| First-Time User | 2 | 7 | 0 | 0 | 0 |
| Returning User | 7 | 2 | 0 | 0 | 0 |
| Power User | ~16 | 2 | 0 | 0 | 0 |
| Recruiter-Ops | ~8 | ~4 | 1 | 0 | 0 |
| Master CV Curator | 8 | 4 | 1 | 0 | 0 |
| Trust-Compliance | 6 | 3 | 0 | 2 | 0 |
| Graphical Designer | 5 | 7 | 0 | 0 | 0 |

---

## Top Acceptance-Criteria Gaps (Cycle 9)

### Critical Fails

| # | Gap | Persona | Evidence |
|---|-----|---------|----------|
| 1 | `candidate_to_confirm` skills appear in generated output (GAP-127) | Resume Expert | `templates/cv-template.html:629,777` — no `{% if not skill.candidate_to_confirm %}` filter |
| 2 | Clarifying questions shown all at once — no ≤3-group flow (GAP-201) | UX Expert | `questions-panel.js:147` — all questions rendered as single scrollable list |
| 3 | Relevance scores are bare integers with no scale label (GAP-202) | UX Expert | Review table renders relevance column as raw number; no "/100" or grade |
| 4 | Finalise tab status vocabulary restricted to draft/ready/sent; PATCH endpoint accepts 6 (GAP-209) | Recruiter-Ops | `web/finalise.js:91–95`, `scripts/routes/generation_routes.py:1929` |
| 5 | Backup history/restore API has no frontend UI surface (GAP-207) | Master CV Curator | Zero frontend references to `/api/master-data/history` or `/api/master-data/restore` |

### High-Priority Partials

| # | Gap | Persona | Evidence |
|---|-----|---------|----------|
| 1 | Phase-lock indicator absent from Master CV tab (GAP-206) | Master CV Curator | Edit buttons visible in all phases; 409 surfaces as generic error |
| 2 | Publications always included with no role-type gate (GAP-203) | Hiring Manager | `cv_orchestrator.py:3444` — `_select_publications` runs whenever `publications.bib` is non-empty |
| 3 | Cover letter closing underspecified — "call to action" not "direct interview request" (GAP-204) | Hiring Manager | `master_data_routes.py:1630` |
| 4 | aria-live="polite" on `#document-content` tabpanel causes full content read on tab switch (GAP-195) | Accessibility | `web/index.html:235` — `role="tabpanel" aria-live="polite"` |
| 5 | Welcome/onboarding modal has no focus trap or Escape handler (GAP-196) | Accessibility | `session-manager.js:172–195` — `maybeShowWelcomeModal()` calls neither `trapFocus()` nor `setInitialFocus()` |

---

## Heuristic Findings

### Nielsen's 10 Heuristics

| # | Heuristic | Rating | Key Finding |
|---|-----------|--------|-------------|
| H1 | Visibility of system status | 🟡 Minor | LLM busy overlay shows elapsed time but no estimated wait duration |
| H2 | Match between system and real world | 🟡 Minor | "Include All" should be "Select All"; developer-language scope notice |
| H3 | User control and freedom | 🟠 Major | No "Approve & Next" sequential rewrite navigation; session restoration shows no orientation banner |
| H4 | Consistency and standards | 🟠 Major | 5 parallel button class families; dual-ring step state confuses viewing vs. active |
| H5 | Error prevention | 🟡 Minor | No minimum 2-bullet floor; action-verb warnings are informational only |
| H6 | Recognition rather than recall | 🟠 Major | Bare relevance score integers require users to know the scale |
| H7 | Flexibility and efficiency of use | 🟡 Minor | Bulk accept/reject present; no keyboard shortcut for sequential rewrite review |
| H8 | Aesthetic and minimalist design | 🟡 Minor | 223 inline style="" attributes; no CSS token layer |
| H9 | Help diagnose/recover from errors | 🟢 Good | Error cards, refinement back-navigation, format-specific blocking all present |
| H10 | Help and documentation | 🟡 Minor | Harvest step lacks framing; no orientation on session restore |

### Top 5 UX Issues (by impact)

1. **Clarifying questions wall** (Critical) — All questions rendered at once; no sequential group flow. First-time users see 10+ questions simultaneously. `questions-panel.js:147`
2. **No "Approve & Next" in Rewrite Review** (Major) — Bulk accept/reject exists but no sequential navigation for 15+ rewrites. `rewrite-review.js`
3. **Bare relevance scores** (Major) — Review table shows integer relevance scores with no scale label. `review-table-base.js` relevance column
4. **Welcome modal keyboard trap** (Major, WCAG) — `maybeShowWelcomeModal()` shows modal without focus trap or Escape handler. `session-manager.js:172–195`
5. **Full tabpanel content announced on tab switch** (Major, WCAG) — `#document-content aria-live="polite"` causes screen readers to announce entire tab content. `web/index.html:235`

---

## Persona-by-Persona Findings

### Applicant (US-A1–US-A12)

**Overall: Strong.** Post-analysis answer injection (GAP-139) now implemented. GAP-76/77 confirmed resolved. GAP-78/79 still open.

**New finding:** Screening LLM prompt may not inject `post_analysis_answers` clarification answers — needs verification at `scripts/routes/master_data_routes.py:1845–1917`.

**Status file:** `tasks/review-status/applicant.md`

---

### UX Expert (US-U1–US-U9)

**Score: 23 Pass / 17 Partial / 2 Fail / 3 Not Impl**

**Fail:** US-U3 AC4 (clarifying questions all-at-once, GAP-201); US-U4 AC6 (bare relevance scores, GAP-202).

**Not Implemented:** US-U6 AC6 (no multi-version listing); US-U8 AC2 (no table column collapsing at ≤1400px); US-U9 AC4 (ambiguous layout instructions not routed to clarification).

**Status file:** `tasks/review-status/ux-expert.md`

---

### Resume Expert (US-R*)

**Score: 17 Pass / 6 Partial / 5 Fail**

**Critical fail confirmed:** GAP-127 — `candidate_to_confirm` skills appear in all output formats. `templates/cv-template.html:629,777` has no filter guard.

**Status file:** `tasks/review-status/resume-expert.md`

---

### Hiring Manager (US-M*)

**Score: 11 Pass / 18 Partial / 4 Not Impl**

**Passes:** 2-column layout, page-break hygiene, publications heading logic, first-author marking, cover letter word count, cover letter tone, page count warnings, skills deduplication.

**New gaps:** GAP-203 (publications gate), GAP-204 (CL closing), GAP-205 (2-bullet floor), GAP-29 confirmed (venue_warning not rendered).

**Status file:** `tasks/review-status/hiring-manager.md`

---

### Persuasion Expert (US-P*)

**Score: 11 Pass / 10 Partial / 2 Fail / 8 Not Impl**

GAP-184 confirmed: Cover letter I-first gate in `cover-letter.js:511–516` is fragile. Word count threshold mismatch (UI 400 vs. story 300).

**Status file:** `tasks/review-status/persuasion-expert.md`

---

### Accessibility Specialist (US-X*)

**Score: 6 Pass / 6 Partial**

Strong foundation. Focus trapping, roving tabindex, ARIA roles, live regions implemented throughout.

**New gaps GAP-195 through GAP-200** — see full list in gaps.md cycle 9 section.

**Status file:** `tasks/review-status/accessibility-specialist.md`

---

### First-Time User (US-F*)

**Score: 2 Pass / 7 Partial**

GAP-76/77 resolved. GAP-78/79 and GAP-36 (first-run onboarding) still open.

**Status file:** `tasks/review-status/first-time-user.md`

---

### Returning User (US-S*)

**Score: 7 Pass / 2 Partial — Strong**

Step-click vs. re-run distinction is tooltip-only. GAP-103 (inline status editing) confirmed working.

**Status file:** `tasks/review-status/returning-user.md`

---

### Power User (US-W*)

**Score: ~16 Pass / 2 Partial — Strong**

GAP-103 confirmed working. No regressions noted.

**Status file:** `tasks/review-status/power-user.md`

---

### Recruiter-Ops (US-O*)

**Score: ~8 Pass / 4 Partial / 1 Fail**

**Fail:** GAP-209 — Finalise tab `<select>` restricted to 3 statuses; PATCH endpoint accepts 6.

**Additional gap:** GAP-210 — Notes not editable post-archive.

**Status file:** `tasks/review-status/recruiter-ops.md`

---

### Master CV Curator (US-M*)

**Score: 8 Pass / 4 Partial / 1 Fail**

**Fail:** GAP-207 — Backup restore has no UI.

**New high-priority gaps:** GAP-206 (phase-lock indicator), GAP-207 (backup UI), GAP-208 (BibTeX import per-key errors).

**Status file:** `tasks/review-status/master-cv-curator.md`

---

### Trust-Compliance (US-C*)

**Score: 6 Pass / 3 Partial / 2 Not Impl**

Non-confidential badge working. GAP-211 — badge lags after provider switch.

**Status file:** `tasks/review-status/trust-compliance.md`

---

### Graphical Designer (US-G*)

**Score: 5 Pass / 7 Partial**

**Resolved since cycle 8:** GAP-192 (emoji aria-hidden), GAP-80 (button geometry), GAP-183/193 (forced-colors).

**Still open:** CSS token layer (D1), template divergence (D5), preview zoom (GAP-G1).

**Status file:** `tasks/review-status/graphical-designer.md`

---

## Cycle 9 New Gaps Summary (GAP-195 through GAP-211)

| GAP | Priority | Description | Persona |
|-----|----------|-------------|---------|
| GAP-195 | HIGH | `aria-live="polite"` on `#document-content` tabpanel — full content announced on tab switch | Accessibility |
| GAP-196 | HIGH | Welcome modal: no `trapFocus()`, no `setInitialFocus()`, no Escape handler | Accessibility |
| GAP-197 | MED | `showAlertModal()` doesn't save `_focusedElementBeforeModal` before calling `setInitialFocus` | Accessibility |
| GAP-198 | MED | Workflow step active status colour-only; no `aria-current="step"` | Accessibility |
| GAP-199 | MED | No `@media (prefers-reduced-motion: reduce)` on CSS animations | Accessibility |
| GAP-200 | MED | `_focusedElementBeforeModal` clobbered by nested modal opens | Accessibility |
| GAP-201 | MED | Clarifying questions shown all at once; no ≤3-per-group flow | UX Expert |
| GAP-202 | MED | Relevance scores in review tables are bare integers with no scale label | UX Expert |
| GAP-203 | HIGH | Publications always included with no role-type gate | Hiring Manager |
| GAP-204 | HIGH | Cover letter closing prompt says "call to action" not "direct interview request" | Hiring Manager |
| GAP-205 | MED | No minimum 2-bullet floor enforced per job entry | Hiring Manager |
| GAP-206 | HIGH | Phase-lock indicator absent; Master CV edit buttons visible in all phases; 409 is generic error | Master CV Curator |
| GAP-207 | HIGH | Backup history/restore API (`/api/master-data/history`) has no frontend UI surface | Master CV Curator |
| GAP-208 | MED | BibTeX import returns aggregate error counts only; no per-key skipped/error detail | Master CV Curator |
| GAP-209 | HIGH | Finalise tab `<select>` only draft/ready/sent; PATCH endpoint accepts 6 statuses | Recruiter-Ops |
| GAP-210 | MED | Notes not editable post-archive; no notes widget in session-switcher UI | Recruiter-Ops |
| GAP-211 | MED | Non-confidential badge lags after provider change; `setModel()` doesn't call `updateAuthBadge` | Trust-Compliance |

---

## Recommended Fix Priority for Cycle 9

### Fix Immediately (HIGH, quick wins)

1. **GAP-195** — Remove `aria-live="polite"` from `#document-content` in `web/index.html:235`
2. **GAP-196** — Add `trapFocus()` + `setInitialFocus()` + Escape to `maybeShowWelcomeModal()` in `web/session-manager.js`
3. **GAP-209** — Expand Finalise tab `<select>` to 6 statuses; update backend validation
4. **GAP-211** — Add `updateAuthBadge()` call after `setModel()` POST success in `web/ui-core.js`
5. **GAP-198** — Add `aria-current="step"` to active workflow step in `updateWorkflowStepsClickable()`
6. **GAP-127** — Verify and add `{% if not skill.candidate_to_confirm %}` guard in `templates/cv-template.html`

### Fix This Cycle (HIGH, medium effort)

7. **GAP-206** — Add phase-lock indicator to Master CV tab
8. **GAP-204** — Strengthen cover letter closing prompt to "direct interview request"

### Backlog (MED/LOW)

- GAP-197, GAP-199, GAP-200, GAP-201, GAP-202, GAP-203, GAP-205, GAP-207, GAP-208, GAP-210

---

*HR/ATS specialist findings pending — update this file when received.*
*Next review: Cycle 10*
