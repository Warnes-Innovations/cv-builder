<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# CV-Builder UI Review — Cycle 5

**Generated:** 2026-06-22 | **Review date:** 2026-06-20
**Cycle:** 5 (full 14-persona + heuristic parallel source-first review)
**Branch:** `feature/multi-user-deployment`

---

## Executive Summary

Cycle 5 ran all 14 persona sub-agents and the heuristic sub-agent concurrently. All 15 agents
completed successfully. Sources were read fresh from the working directory; review docs were
not used as evidence.

### Summary Counts (UX Expert — full criterion set)

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
|---------|---------|-----------|--------|------------|
| UX Expert (US-U1–U9) | 28 | 13 | 4 | 1 |

The four persistent UX Fails:
1. **US-U3 AC4** — Clarifying questions not paged (rendered all-at-once)
2. **US-U4 AC6** — Numeric relevance score with scale label absent from experience review
3. **US-U5 AC5** — No keyboard "Approve & Next" navigation in rewrite review
4. **US-U8 AC2** — Review tables not responsive at ≤1400 px

### Cycle 5 Progress vs. Cycle 4

**Fixes confirmed still present from cycles 1–4:**
- HTML semantic landmarks (`<main>`, `<nav>`, `<header>`) ✅
- Tabpanel `aria-labelledby` wired dynamically ✅
- `toggleChat` bundle collision resolved ✅
- Master CV modal focus management ✅
- `showConfirmModal` + `openAtsReportModal` focus trap ✅
- Status message `aria-live` regions ✅
- Session-conflict banner `role="alert"` ✅
- Rename widget inline (no `window.prompt()`) ✅
- `session-switcher-ui.js` `alert()` → `showToast()` ✅
- `updateWorkflowStepsClickable()` adds role/tabindex/keydown to clickable step pills ✅
- Welcome modal CTA navigates to Master CV on empty skeleton ✅
- `content_warnings` toast on both `generatePreview` and `applyLayoutSettings` paths ✅

**New gaps discovered this cycle:** 10 (GAP-166 through GAP-175)
**Gaps confirmed resolved this cycle:** 1 (GAP-39)

---

## Resolved This Cycle

### GAP-39: Cover Letter and Screening DOCX Now in Download/Finalise

**Status → RESOLVED 2026-06-20**

Recruiter-ops persona confirmed cover letter and screening DOCX files are surfaced in the
Download tab file listing. `web/download-tab.js` now renders all three CV formats, the cover
letter, and the screening DOCX in the file grid.

---

## Top 5 UX Issues by Impact

| Priority | Issue | Severity | Source |
|----------|-------|----------|--------|
| 1 | `rewriteDecisions = {}` reset on session restore — in-progress decisions wiped | HIGH | `session-manager.js:740` |
| 2 | ↻ re-run `<span>` inside step pills keyboard-inaccessible (bare `onclick`, `opacity:0`) | HIGH | `workflow-steps.js:704–706` |
| 3 | Cover letter has no mechanism to inject company-specific initiative/product references | HIGH | `master_data_routes.py:1559–1580` |
| 4 | Category reorder ↑↓ buttons missing `aria-label` — WCAG 2.1 Level A failure | HIGH | `skills-review.js:423–424` |
| 5 | `openSessionsModal` calls `trapFocus` but not `setInitialFocus` — focus not moved into modal | MED | `session-switcher-ui.js:457` |

---

## Heuristic Evaluation (Nielsen's 10)

| Heuristic | Rating | Key Finding |
|-----------|--------|-------------|
| H1: System status visibility | 🟡 Minor | Workflow step bar excellent; `#llm-busy-label` has no `aria-live` for AT users |
| H2: Real-world match | 🟡 Minor | Phase labels improved; "Done — Generate CV →" CTA misleading (generates preview) |
| H3: User control/freedom | 🟠 Major | No paged clarifying questions (US-U3); no Approve-&-Next in rewrites (US-U5) |
| H4: Consistency/standards | 🟠 Major | Bootstrap 5 in Layout tab vs `.action-btn` system in all other tabs (GAP-80) |
| H5: Error prevention | 🟡 Minor | `rewriteDecisions = {}` reset is a data-loss error with no prevention mechanism |
| H6: Recognition over recall | 🟢 Good | Workflow step bar + position bar keep context visible; diff cards show before/after |
| H7: Flexibility/efficiency | 🟠 Major | No keyboard shortcuts; no bulk accept/reject for rewrites; no stage skip |
| H8: Aesthetic/minimalist | 🟡 Minor | Two divergent CV templates (GAP-132); Layout tab visual language mismatch |
| H9: Error diagnosis/recovery | 🟡 Minor | Phase-enforcement 409 still shows "session conflict" banner (GAP-93) |
| H10: Help/documentation | 🔴 Critical | No in-app help system; jargon terms undefined; no keyboard shortcut reference |

---

## New Gaps — Cycle 5

| GAP | Severity | Description | File:Line |
|-----|----------|-------------|-----------|
| GAP-166 | HIGH | `rewriteDecisions = {}` reset on session restore wipes in-progress decisions | `session-manager.js:740` |
| GAP-167 | HIGH | ↻ re-run `<span>` inside step pills has no `role`, `tabindex`, or keydown handler | `workflow-steps.js:704–706` |
| GAP-168 | MED | `openSessionsModal` traps focus but doesn't call `setInitialFocus` | `session-switcher-ui.js:457` |
| GAP-169 | LOW | "Done — Generate CV →" CTA label misleading — generates preview, not final | `index.html:186` |
| GAP-170 | MED | `#llm-busy-label` div has no `aria-live` — "Reasoning…" updates not announced to AT | `index.html:155` |
| GAP-171 | HIGH | Category reorder ↑↓ buttons have `title` only, missing `aria-label` — WCAG 2.1 Level A | `skills-review.js:423–424` |
| GAP-172 | MED | Workflow step states (active/completed/stale) conveyed by colour only; no `.sr-only` text | `styles.css:149–159` |
| GAP-173 | MED | No `:focus-visible` CSS for `.tab`, `.action-btn`, `.step` — invisible focus in HC mode | `styles.css` |
| GAP-174 | HIGH | Cover letter has no mechanism to extract/inject company-specific initiatives or products | `master_data_routes.py:1559–1580` |
| GAP-175 | MED | Summary specificity: generic-phrase detection exists but no check enforces role-specific content | `conversation_manager.py:1325` |

---

## Persona Findings

### Applicant (US-A1–A12)

Key findings:
- US-A1–A3 (job intake, analysis, customization): Core workflow functional. Intake confirmation
  card appears in chat panel but may be missed if user's attention is on the job tab.
- US-A4 (rewrite review): Core review UI functional; rewrite decision reset bug (GAP-166) is
  a data loss risk for partial sessions.
- US-A10 (NL master CV update): Still not implemented — GAP-01 open.
- US-A11 (harvest persistence): Harvest opt-in now correct (GAP-144 resolved). Skill type
  not persisted to master data (GAP-89 open).
- "Done — Generate CV →" CTA on spell-check completion misleads users (GAP-169).

### UX Expert (US-U1–U9)

**28 Pass / 13 Partial / 4 Fail / 1 Not Implemented**

Persistent fails:
- US-U3 AC4: All clarifying questions rendered at once — no paging.
- US-U4 AC6: Experience relevance shown as badge, not a numeric scale.
- US-U5 AC5: No keyboard-driven "Approve & Next" sequential rewrite navigation.
- US-U8 AC2: Review tables not responsive at ≤1400 px.

Strong areas: Workflow step bar, position identity persistence, back-nav confirm modal,
stale-state signaling, session restore phase detection.

### Resume Expert (US-R1–R7)

Strong on: ATS keyword matching, synonym deduplication, spell-check flow, publication
rendering, relevance-sorted bullets. Gaps:
- Experience table default sort still recency-biased (GAP-108 open).
- Synonym grouping absent from analysis display (GAP-107 open).
- `candidate_to_confirm` badge visible in skills UI; output exclusion design decision pending.

### Hiring Manager (US-M1–M7)

All structural criteria pass. Key partials and fails:
- US-M1: Generic-phrase detection active; no check enforces job-title or quantified claims in
  summary (GAP-175 new).
- US-M2: No minimum bullet count gate (GAP-81); persuasion warnings server-log only (GAP-09).
- US-M6: **❌ Fail** — cover letter has no mechanism for company-specific initiative injection
  (GAP-174 new). Backend prompt targets ~250–300 words vs story minimum 300w (GAP-126).
- US-M7: Venue-warning rendering confirmed working. First-author star confirmed. ✅

### Persuasion Expert (US-P1–P6)

Summary prompt now uses value-identity opener (GAP-163 resolved in cycle 4). Remaining:
- Post-generation cover letter word-count enforcement absent (GAP-136).
- CTA check accepts passive closings (GAP-137, GAP-96).
- `post_analysis_answers` not passed to summary generator (GAP-139).
- No positive-sum metric framing guidance (GAP-97).

### HR / ATS (US-H1–H8)

ATS scoring and keyword display improvements confirmed. Remaining open:
- Hard/soft skill classification rule-based (GAP-22).
- `skill_type` not persisted via harvest (GAP-89).
- Synonym grouping absent from ATS report (GAP-90).
- Font compliance validation absent (GAP-87).
- Year-only dates not flagged (GAP-88).

### Accessibility Specialist (US-X1–X3)

Significant cycle 3–4 improvements confirmed. Cycle 5 remaining gaps:
- Category reorder ↑↓ buttons missing `aria-label` — WCAG 2.1 Level A (GAP-171 new).
- `#llm-busy-label` has no `aria-live` (GAP-170 new).
- `openSessionsModal` traps but doesn't move focus in (GAP-168 new).
- `#message-input` still missing accessible label (GAP-35 open).
- `.workflow` container has no `aria-live` for stage-change announcements (GAP-73 open).
- Step states colour-only — no `.sr-only` text (GAP-172 new).
- No `:focus-visible` on `.tab`, `.action-btn`, `.step` (GAP-173 new).

Note: GAP-72 (step pill keyboard nav) CONFIRMED RESOLVED — `updateWorkflowStepsClickable()`
in `ui-core.js:1917–1931` adds `role="button"`, `tabindex="0"`, and keydown handler.
Cycle 5 accessibility agent misread `workflow-steps.js` without reading `ui-core.js`;
direct code inspection confirms the fix is in place.

### First-Time User (US-F1–F4)

Welcome modal, empty-skeleton detection, and Master CV CTA all functioning. Remaining:
- LLM provider prerequisite still not mentioned in onboarding (GAP-76).
- "Get Started" CTA on normal-profile path closes modal but doesn't navigate to Job tab (GAP-77).
- Jargon terms undefined on first encounter (GAP-78).
- Preview vs. final generation pipeline unexplained (GAP-79).

### Returning User (US-S1–S3)

Session restore: phase resolution, tab switching, history replay, decisions in state — all pass.
**New critical finding:**
- **GAP-166**: `session-manager.js:740` — `rewriteDecisions = {}` reset during restore in
  `rewrite_review` phase wipes any in-progress decisions the user made before leaving.

### Power User (US-W1–W3)

Bulk accept/reject for experience, skills, achievements confirmed. Remaining:
- No keyboard shortcuts (GAP-98).
- No bulk accept for rewrites (GAP-99).
- No forward stage skip (GAP-101).
- No session duplicate/copy action (GAP-113).

### Recruiter Ops (US-O1–O4)

**Cover letter and screening DOCX now visible in Download tab** — GAP-39 RESOLVED.
Remaining open:
- `application_status` not shown in session list (GAP-102).
- No readiness checklist before archive (GAP-40).
- No per-file generated-at timestamp (GAP-106).
- "Done" label for refinement-phase sessions misleading (GAP-104).
- No applications pipeline dashboard (GAP-105).

### Master CV Curator (US-M1–M4, M7)

Backup-before-write and per-entry validation confirmed. Remaining:
- Publication count stat card reads from JSON not BibTeX (GAP-92).
- Phase-enforcement 409 shows wrong "session conflict" banner (GAP-93).
- Summary variant format inconsistency after harvest (GAP-94).
- Bulk BibTeX import skips per-entry validation (GAP-142).
- No backup history/restore UI (GAP-91).

### Trust & Compliance (US-C1–C3)

AI-proposal labeling confirmed: rewrite diff cards, "AI-Generated Summary" label, weak-evidence
badges in skills and rewrites. Remaining:
- Rewrite audit log not rendered in Finalise tab (GAP-118).
- No AI-attribution metadata in generated files (GAP-119).
- No persistent non-confidential provider warning (GAP-115).
- No per-item decision gate at customization stages (GAP-116, GAP-131).

### Graphical Designer (US-G1–G3)

- Two divergent CV templates still unresolved (GAP-132).
- No CSS design token layer (GAP-133).
- Layout tab uses Bootstrap 5 classes vs `.action-btn` throughout (GAP-80).
- No `:focus-visible` on `.tab` / `.step` / `.action-btn` (GAP-173).
- Duplicate `.step-stale-badge` CSS rule: confirmed removed. ✅

---

## Top Persistent Open Gaps (Cross-Persona Priority)

| GAP | Severity | Description |
|-----|----------|-------------|
| GAP-36 | CRITICAL | First-run onboarding: raw FileNotFoundError if skeleton creation fails |
| GAP-41 | CRITICAL | No pre-job Master CV editor entry point |
| GAP-20 | CRITICAL | Staged generation frontend contract incomplete |
| GAP-166 | HIGH | `rewriteDecisions = {}` reset on session restore — data loss |
| GAP-167 | HIGH | ↻ re-run span keyboard-inaccessible |
| GAP-174 | HIGH | Cover letter missing company-initiative injection |
| GAP-132 | HIGH | Two divergent CV templates |
| GAP-98 | HIGH | No keyboard shortcuts for workflow navigation |
| GAP-35 | HIGH | `#message-input` missing accessible label |
| GAP-73 | HIGH | `.workflow` no `aria-live` for stage announcements |
| GAP-171 | HIGH | Category reorder buttons missing `aria-label` |
| GAP-22 | HIGH | Hard/soft skill classification and ATS output |
| GAP-118 | MED | Rewrite audit log not rendered in Finalise tab |
| GAP-93 | MED | Phase-enforcement 409 → wrong session-conflict banner |
| GAP-92 | MED | Publication count stat card reads wrong field |

---

*See `tasks/gaps.md` for the canonical gap registry with status, severity, and resolution details.*
*See `tasks/review-status/` for per-persona source evidence files.*
