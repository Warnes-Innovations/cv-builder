<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# CV Builder — UI Review Summary: 15-Persona + Heuristic Review (2026-06-18, Cycle 2)

**Last updated:** 2026-06-18  
**Branch:** feature/multi-user-deployment  
**Method:** 15 persona sub-agents + 1 UX heuristic agent run in parallel; each reads source files directly.

---

## Summary Counts

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | Stories |
|---------|---------|-----------|--------|------------|---------|
| Applicant | 89 | 12 | 4 | 1 | US-A1–A12 |
| UX Expert | 69 | 41 | 14 | 4 | US-U1–U9 |
| Resume Expert | 14 | 9 | 4 | 0 | US-R1–R7 |
| Hiring Manager | 12 | 11 | 1 | 0 | US-M1–M7 |
| Persuasion Expert | 9 | 9 | 2 | 4 | US-P1–P6 |
| HR/ATS | 13 | 10 | 0 | 2 | US-H1–H8 |
| Accessibility | 1 | 8 | 2 | 0 | US-X1–X3 |
| First-Time User | 1 | 7 | 1 | 0 | US-F1–F3 |
| Returning User | 5 | 4 | 0 | 0 | US-S1–S3 |
| Power User | (see status file) | — | — | — | US-W1–W3 |
| Recruiter Ops | (see status file) | — | — | — | US-O1–O3 |
| Master CV Curator | (see status file) | — | — | — | US-M1–M4 |
| Trust/Compliance | 7 | 7 | 0 | 2 | US-C1–C6 |
| Graphical Designer | (see status file) | — | — | — | US-G1–G3 |
| UX Heuristic | (see status file) | — | — | — | H1–H10 |

---

## Recent Fixes Confirmed This Cycle

| Fix | Evidence |
|-----|----------|
| `_strip_intro_phrase()` prevents label-prefix false positives in persuasion checks | `scripts/utils/llm_client.py:1064`, called at lines 1097, 1176 |
| Persuasion warning panel defaults open; submit button hard-gated on acknowledgement | `web/rewrite-review.js:107` (`display:block`), lines 375–380 |
| Employment date overlap detection in `_detect_date_overlaps()` | `scripts/utils/cv_orchestrator.py:4612–4680`, called in `generate_cv()` |
| Overlap warnings rendered in File Review download tab | `web/download-tab.js:330–339` |
| Non-blocking ATS advisory checks (`_NON_BLOCKING_CHECKS` set of 9 names) | `web/download-tab.js:147–157` |
| ATS score persisted to `metadata.json` | GAP-32 resolved |
| Cover letter and screening DOCX registered in `generated_files.files` | `scripts/routes/master_data_routes.py:1662–1666, 1911–1915` |
| Blank `Master_CV_Data.json` created on first run (GAP-36) | `scripts/utils/auth.py:181–193` |

---

## Top Acceptance Criteria Gaps (Cross-Persona)

### Critical / High

| ID | Description | Persona(s) | Evidence |
|----|-------------|-----------|----------|
| GAP-120 | Workflow tabs not keyboard-reachable (WCAG Level A) | Accessibility, Power User | `web/workflow-steps.js` — no `tabindex`, no Enter handler |
| GAP-127 | `candidate_to_confirm` skills appear in all generated output unmarked | Resume Expert | `web/skills-review.js` — no strip-on-generate |
| GAP-128 | Rejected rewrites not reliably appended to `rewrite_audit` | Resume Expert | `scripts/utils/cv_orchestrator.py` — audit list empty when all rejected |
| GAP-132 | Two divergent CV templates (cv-template.html vs cv-style.css) | Graphical Designer | Color, font, layout diverge between HTML preview and DOCX |
| GAP-34 | `confirmDialog()` missing ARIA role, focus trap, focus restore | Accessibility | `web/ui-core.js:372–419` — no role="dialog", no trapFocus |
| GAP-143 | `showConfirmModal` missing focus management (separate from GAP-34) | Accessibility | `web/ui-helpers.js:41–53` — no setInitialFocus, no trapFocus |
| GAP-144 | Harvest pre-selects high/medium confidence items (opt-in violation) | Applicant | `web/harvest.js:101–103` |
| GAP-131 | No Customise-stage blocking gate before Generate | Trust/Compliance | No gate in `generate_cv` route requiring ≥1 customisation decision |
| GAP-125 | Layout instruction scope label invites text changes | UX Expert | `web/layout-instruction.js:293` — "a layout or text change" |

### Medium

| ID | Description | Persona(s) | Evidence |
|----|-------------|-----------|----------|
| GAP-133 | No CSS design token layer (~50 hard-coded hex colours, 216 inline styles) | Graphical Designer | `web/styles.css`, `web/index.html` |
| GAP-124 | `final_generation` missing from `SESSION_PHASE_LABELS` maps | Returning User | `web/utils.js:262–285` |
| GAP-126 | Cover letter word count hardcoded 250–300 words for all role types | Hiring Manager | `scripts/routes/master_data_routes.py:1566` |
| GAP-91 | Master CV backup/restore has no UI surface | Master CV Curator | Backend exists; no UI restore button |
| GAP-116 | No per-item decision gate in Customise stage | Trust/Compliance | Phase allows generate without any explicit customisation decisions |
| GAP-92 | `publication_count` stat card reads JSON not BibTeX (always 0) | Master CV Curator | `master_data_routes.py` — reads JSON not orchestrator |
| GAP-141 | BibTeX CRUD modal converts `editor` to `author` on save | Master CV Curator | `web/master-cv.js:1448, 1498` |
| GAP-145 | Cover letter/screening DOCX filenames omit role token (collision risk) | Recruiter Ops | `scripts/routes/master_data_routes.py:1638, 1869` |

---

## Heuristic Evaluation Summary

**Source:** `tasks/review-status/ux-heuristic.md`

| # | Heuristic | Rating | Key finding |
|---|-----------|--------|-------------|
| H1 | Visibility of system status | 🟡 Minor | Generation progress is chat text only; no structured step-labelled panel |
| H2 | Match between system and real world | 🟠 Major | "LLM", "ATS", "Harvest", "Temperature", "Base Delay (ms)", "Tagline" undefined |
| H3 | User control and freedom | 🟡 Minor | Back-navigation and undo implemented; ↻ re-run icon hidden until hover |
| H4 | Consistency and standards | 🟠 Major | Dual navigation systems (13-step + 20-tab); 6 parallel button classes |
| H5 | Error prevention | 🟢 Good | Persuasion gate, overlap warnings, ATS advisory checks improved |
| H6 | Recognition rather than recall | 🟠 Major | 13 steps visible on load; most tabs hidden with no disclosure |
| H7 | Flexibility and efficiency of use | 🟡 Minor | Bulk toolbars exist; no keyboard shortcuts for workflow navigation |
| H8 | Aesthetic and minimalist design | 🟠 Major | File Review tab renders 7 unrelated concerns; header has 7 elements |
| H9 | Error recovery | 🟡 Minor | ATS failures now distinguishable from blocking failures |
| H10 | Help and documentation | 🔴 Critical | No help path after welcome modal dismissed |

**Top 5 UX friction points:**
1. No persistent help — H10 critical; users who dismiss the welcome modal have no recovery path
2. Dual navigation with inconsistent terminology — two systems, neither explains current position
3. Most tabs hidden per phase with no disclosure — creates phantom navigation
4. All 13 workflow steps shown on load — information overload for first-time users
5. File Review tab structural overload — 7 disparate concerns with no visual grouping

---

## New Gaps This Cycle (GAP-143 through GAP-145)

| ID | Priority | Description |
|----|----------|-------------|
| GAP-143 | HIGH | `showConfirmModal` missing focus management (separate confirm path from GAP-34) |
| GAP-144 | HIGH | Harvest pre-selects high/medium confidence items — violates opt-in story requirement |
| GAP-145 | LOW | Cover letter/screening DOCX filenames omit role token — collision risk for same-company multi-role applications |

---

## Per-Persona Status Files

| Persona | File | Last Updated |
|---------|------|--------------|
| Applicant | `tasks/review-status/applicant.md` | 2026-06-18 |
| UX Expert | `tasks/review-status/ux-expert.md` | 2026-06-18 |
| Resume Expert | `tasks/review-status/resume-expert.md` | 2026-06-18 |
| Hiring Manager | `tasks/review-status/hiring-manager.md` | 2026-06-18 |
| Persuasion Expert | `tasks/review-status/persuasion-expert.md` | 2026-06-18 |
| HR/ATS | `tasks/review-status/hr-ats.md` | 2026-06-18 |
| Accessibility Specialist | `tasks/review-status/accessibility-specialist.md` | 2026-06-18 |
| First-Time User | `tasks/review-status/first-time-user.md` | 2026-06-18 |
| Returning User | `tasks/review-status/returning-user.md` | 2026-06-18 |
| Power User | `tasks/review-status/power-user.md` | 2026-06-18 |
| Recruiter Ops | `tasks/review-status/recruiter-ops.md` | 2026-06-18 |
| Master CV Curator | `tasks/review-status/master-cv-curator.md` | 2026-06-18 |
| Trust/Compliance | `tasks/review-status/trust-compliance.md` | 2026-06-18 |
| Graphical Designer | `tasks/review-status/graphical-designer.md` | 2026-06-18 |
| UX Heuristic | `tasks/review-status/ux-heuristic.md` | 2026-06-18 |
