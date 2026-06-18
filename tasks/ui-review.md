<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# CV Builder — UI Review Summary: 15-Persona + Heuristic Review (2026-06-18, Cycle 3)

**Last updated:** 2026-06-18  
**Branch:** feature/multi-user-deployment  
**Method:** 15 persona sub-agents + 1 UX heuristic agent run in parallel; each reads source files directly.

---

## Cycle 3 Overview

This cycle verified all targeted fixes from the cycle 2 implementation session, discovered new gaps, and produced updated per-persona status files. 10 prior gaps were confirmed resolved or false positives; 1 new regression was found and immediately fixed; 9 new gaps were added (GAP-146 through GAP-154, with GAP-146 resolved same-cycle).

### Confirmed Resolved in Cycle 3

| Gap | Description | Key evidence |
|-----|-------------|-------------|
| GAP-120 | Tab keyboard accessibility — WCAG Level A tablist pattern | `web/index.html:200–225`, `web/review-table-base.js:121–131`, `web/ui-core.js:515–541` |
| GAP-124 | `final_generation` missing from `SESSION_PHASE_LABELS` | `web/utils.js:262–285` |
| GAP-125 | Layout scope label invited text changes | `web/layout-instruction.js:293` |
| GAP-129 | ATS Report modal missing focus management | `web/ats-modals.js:108–161` |
| GAP-34 | `confirmDialog()` missing ARIA role, focus trap, and restore | `web/ui-core.js:385–437` |
| GAP-143 | `showConfirmModal` missing focus management | `web/ui-helpers.js:43–58` |
| GAP-144 | Harvest pre-selects high/medium confidence items (opt-in violation) | `web/harvest.js:104–106` |
| GAP-141 | BibTeX CRUD modal converts `editor` to `author` on save | `web/master-cv.js` |
| GAP-128 | Rejected rewrites absent from `rewrite_audit` | FALSE POSITIVE — `submit_rewrite_decisions()` correctly appends all outcomes |
| GAP-130 | Persuasion panel collapsed by default, bypass possible | ALREADY RESOLVED — panel defaults to `display:block` at `rewrite-review.js:107` |

### New Regression Found and Fixed (Same Session)

| Gap | Description | Fix |
|-----|-------------|-----|
| GAP-146 | `toggleChat` in `ui-helpers.js` was exported to `globalThis` after `ui-core.js`, overwriting the ARIA-aware version. After first toggle click, `aria-label` and `aria-expanded` were not updated. | Removed duplicate `toggleChat` function and export from `web/ui-helpers.js`; rebuilt bundle. `web/ui-core.js` version now exclusively controls the toggle. |

### Hiring Manager Status Upgrades (Cycle 3)

| Criterion | Story | Status change | Evidence |
|-----------|-------|--------------|----------|
| Weak-verb UI visible in Download tab | US-M2f | Partial → Pass | Persuasion panel in Download tab now shows weak-verb/no-verb findings with severity badges |
| Sidebar background balanced across pages | US-M4b | Partial → Pass | `box-decoration-break: clone` fix paints sidebar background on every print page |
| Sidebar background on pages 2+ | US-M5b | Partial → Pass | Same faux-column fix confirmed in `cv-style.css` |

---

## Summary Counts (Cycle 3)

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | Stories |
|---------|---------|-----------|--------|------------|---------|
| Applicant | 95 | 12 | 3 | 1 | US-A1–A12 |
| UX Expert | 28 | 12 | 5 | 1 | US-U1–U9 (criteria reviewed) |
| Resume Expert | see status file | — | — | — | US-R1–R7 |
| Hiring Manager | see status file | — | — | — | US-M1–M7 |
| Persuasion Expert | see status file | — | — | — | US-P1–P6 |
| HR/ATS | 23 | 10 | 0 | 2 | US-H1–H8 |
| Accessibility | see status file | — | — | — | US-X1–X3 |
| First-Time User | see status file | — | — | — | US-F1–F3 |
| Returning User | see status file | — | — | — | US-S1–S3 |
| Power User | see status file | — | — | — | US-W1–W3 |
| Recruiter Ops | see status file | — | — | — | US-O1–O3 |
| Master CV Curator | see status file | — | — | — | US-M1–M4 |
| Trust/Compliance | see status file | — | — | — | US-C1–C6 |
| Graphical Designer | 5 | 7 | 0 | 0 | US-G1–G3 |
| UX Heuristic | see status file | — | — | — | H1–H10 |

---

## New Gaps Discovered in Cycle 3

| Gap | Severity | Description | Persona |
|-----|----------|-------------|---------|
| GAP-146 | HIGH | `toggleChat` duplicate in `ui-helpers.js` overwrote ARIA-aware version in bundle | Accessibility — **RESOLVED same session** |
| GAP-147 | HIGH | `ensure_master_cv_exists()` shows "Your master profile is ready" for empty skeleton | First-Time User |
| GAP-148 | MEDIUM | Workflow step pills missing `cursor:pointer` — only `step-job` has `class="clickable"` | UX Heuristic |
| GAP-149 | HIGH | Generic fallback summary `"Experienced professional applying for {position}"` reaches generated PDF without UI warning | Hiring Manager |
| GAP-150 | MEDIUM | Cover letter LLM only receives achievement titles, not bullet body text — generic citations result | Hiring Manager |
| GAP-151 | LOW | ATS `STANDARD` frozenset includes rejected heading labels `'career history'` and `'selected publications'` | HR/ATS |
| GAP-152 | HIGH | `showConfirmModal` and `openAtsReportModal` focus button on open but neither calls `trapFocus()` — Tab leaks | Accessibility |
| GAP-153 | HIGH | Status elements (`#settings-status-msg`, `#onboarding-modal-status`, `#model-auth-key-status`) lack `aria-live` | Accessibility |
| GAP-154 | HIGH | `.message-input { outline: none }` unconditional in `web/styles.css` — focus indicator stripped (WCAG 2.4.7) | UX Expert |

---

## Top Critical Open Gaps (Post-Cycle 3)

### Critical

| Gap | Description |
|-----|-------------|
| GAP-36 | First-run: no onboarding wizard when `Master_CV_Data.json` absent |
| GAP-41 | No pre-job Master CV editing entry point in UI |
| GAP-20 | Staged preview/layout/final generation terminology confusing |
| GAP-22 | ATS DOCX structure and skill-type semantics incomplete |

### High

| Gap | Description |
|-----|-------------|
| GAP-72 | Workflow step pills not keyboard-reachable (no `tabindex`, no `keydown` handler) |
| GAP-73 | No `aria-live` on workflow container — stage changes not announced |
| GAP-75 | `#session-conflict-banner` has no `role="alert"` or `aria-live` |
| GAP-123 | `#layout-freshness-chip` has `aria-label=""` — WCAG Level A failure |
| GAP-126 | Cover letter word count hardcoded 250–300w for all role types |
| GAP-131 | No Customise stage blocking gate before Generate |
| GAP-132 | Two divergent CV output templates with different visual identities |
| GAP-147 | First-time "profile ready" shown for completely empty skeleton |
| GAP-149 | Generic summary fallback reaches generated PDF without warning |
| GAP-152 | Focus trap missing in `showConfirmModal` and `openAtsReportModal` |
| GAP-153 | Status message elements lack `aria-live` |
| GAP-154 | `message-input` outline stripped unconditionally (WCAG 2.4.7) |

---

## Heuristic Evaluation — Cycle 3 Changes

- **H7 (Flexibility & efficiency):** Upgraded Minor → Good. Keyboard shortcuts for rewrite Accept/Reject confirmed in `web/rewrite-review.js`.
- **Workflow step pill affordance:** Only `step-job` has `cursor:pointer` (via `class="clickable"`). Other navigable pills have `onclick` but look static → GAP-148.
- **Focus management:** GAP-34, GAP-129, GAP-143 resolved; GAP-152 (modals missing full `trapFocus`) and GAP-146 (bundle toggle override) found; GAP-146 fixed same session.
- **Persistent terminology issues (no fix applied):** "Done — Generate CV →" generates an HTML preview not final files; "🌾 Harvest" is developer-metaphorical; "LLM:" is developer-centric.

---

## Per-Persona Status Files

All files in `tasks/review-status/` updated 2026-06-18 ET:

- [applicant.md](review-status/applicant.md)
- [ux-expert.md](review-status/ux-expert.md)
- [resume-expert.md](review-status/resume-expert.md)
- [hiring-manager.md](review-status/hiring-manager.md)
- [persuasion-expert.md](review-status/persuasion-expert.md)
- [hr-ats.md](review-status/hr-ats.md)
- [accessibility-specialist.md](review-status/accessibility-specialist.md)
- [first-time-user.md](review-status/first-time-user.md)
- [returning-user.md](review-status/returning-user.md)
- [power-user.md](review-status/power-user.md)
- [recruiter-ops.md](review-status/recruiter-ops.md)
- [master-cv-curator.md](review-status/master-cv-curator.md)
- [trust-compliance.md](review-status/trust-compliance.md)
- [graphical-designer.md](review-status/graphical-designer.md)
