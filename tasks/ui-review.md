<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Cycle 105 (Targeted 9-Persona Re-Verification)

**Generated:** 2026-07-07
**Cycle:** 105 (independent re-verification of cycle 104's fixes for GAP-376 through GAP-389, not a fresh full-app sweep)
**Branch:** `main`
**Sources:** 9 persona sub-agents, filtered to those whose cycle-103 findings cycle 104 claimed to fix — applicant, accessibility-specialist, trust-compliance, returning-user, ux-expert, master-cv-curator, hiring-manager, recruiter-ops, resume-expert. Each read current source directly (source-first — none read `tasks/gaps.md` or this file as evidence) and was explicitly instructed not to trust the cycle-104 fix summary, only what they could independently verify.
**New gaps discovered:** GAP-390 through GAP-395 (6 new entries, all left open — see below)

---

## Why This Cycle Ran

Cycle 103's full 15-persona committee pass found 14 gaps (GAP-376–389). Cycle 104 fixed 13 of them (1, GAP-387, was a claimed false positive). Rather than accept that self-report, this cycle re-ran the 9 relevant personas specifically to independently verify each fix against current source and flag anything the fix cycle missed or introduced. This is the second time this pattern has run this session (cycle 102→103 found regressions in cycle 102's own work; this cycle found the same class of issue in cycle 104's work) — confirming that independent re-verification catches real problems a fix cycle's own self-assessment does not.

**Verdict:** 7 of 9 targeted gaps were confirmed fully RESOLVED on first independent check with no issues. 1 (GAP-388) was found only partially fixed by two independent reviewers converging on the same gap (nav chrome fixed, the actual working screen's own copy — button text, intro paragraph, success banner — still said "Archive"). 1 (GAP-384) was found technically correct on its own narrow claim but undermined by three *adjacent* pre-existing bugs the fix cycle hadn't touched (a duplicate-push bug in `showAlertModal()` used ~100+ times app-wide, and three modals never wired to the shared focus stack at all). All findings from this cycle were fixed in the same cycle rather than deferred — see `tasks/gaps.md`'s Cycle 105 notes for full detail.

---

## Per-Persona Verdicts

| Persona | Gaps re-verified | Verdict | New issues found (fixed same cycle unless noted) |
|---|---|---|---|
| applicant | GAP-381, GAP-382 | ✅ Both RESOLVED | 3 new low-priority findings — filed as GAP-393, GAP-395, plus a story/impl key-name mismatch (not filed, pre-existing) |
| accessibility-specialist | GAP-384, GAP-385 | ⚠️ GAP-384 PARTIAL (see below), GAP-385 RESOLVED with caveat | `showAlertModal()` double-push; 3 master-cv.js modals + onboarding modal missing `pushFocusStack()`; keyboard-shortcuts panel had zero focus management despite its own text claiming Escape works — **all 4 fixed this cycle** |
| trust-compliance | GAP-383 | ✅ RESOLVED (verified via live execution, not just source reading) | ATS DOCX filter missing `isinstance` guard (fixed, defense-in-depth); "confirm this skill" UI implies an action that doesn't exist anywhere (filed as GAP-390, HIGH) |
| returning-user | GAP-378, GAP-386 | ✅ Both RESOLVED | "Edit notes" shown regardless of active-row ownership (filed as GAP-392) |
| ux-expert | GAP-388, GAP-389 | ⚠️ GAP-388 PARTIAL (independently converging with recruiter-ops), GAP-389 RESOLVED | Assessed GAP-389's "link to dedicated tab" simplification as a genuine UX improvement, not a convenience regression |
| master-cv-curator | GAP-384, GAP-389 | ✅ Both RESOLVED, no dead code left behind | Re-confirmed US-M1's missing session-scope reminder (filed as GAP-394) |
| hiring-manager | GAP-383, GAP-388 | ✅ GAP-383 RESOLVED, ⚠️ GAP-388 PARTIAL | Publication venue-warning glyph baked into final delivered output (filed as GAP-391, MEDIUM) |
| recruiter-ops | GAP-378, GAP-386, GAP-388 | ✅ GAP-378/386 RESOLVED, ⚠️ GAP-388 PARTIAL | Independently re-confirmed GAP-377/GAP-379 (prior cycle's fixes) still hold |
| resume-expert | GAP-387 | ✅ CONFIRMED FALSE POSITIVE (independently re-traced all 3 claims) | `cover-letter.js` persuasion-label key mismatch (`generic_phrases` vs actual `generic_summary`) — fixed |

---

## Fixed This Cycle

| Item | Severity | Summary |
|---|---|---|
| GAP-388 (completion) | LOW | "Archive"/"archived" removed from `finalise.js`'s button/intro/success-banner copy and from `download-tab.js`/`final-generate.js` — cycle 104 only fixed nav chrome |
| `showAlertModal()` double-push | Undermined GAP-384 | Removed a duplicate `pushFocusStack()` call (merge artifact) that leaked a stale stack entry on every one of this ~100+-call-site function's invocations |
| 4 modals missing `pushFocusStack()` | Undermined GAP-384 | Backup History, Full Data Preview, Import Review (all `master-cv.js`), and the onboarding/welcome modal (`session-manager.js`) now correctly push before `trapFocus()` |
| keyboard-shortcuts panel focus management | Adjacent to GAP-385 | Added push/trap/initial-focus on open and a real Escape handler; the panel's own displayed "Esc: Close" text now actually works |
| `cover-letter.js` label key mismatch | Adjacent to GAP-387 | `generic_phrases` → `generic_summary` so the friendly label renders instead of the raw backend string |
| ATS DOCX `isinstance` guard | Adjacent to GAP-383 | Matched the guard already present on the two sibling filters, for consistency (currently unreachable in production) |

## New Gaps Filed, Left Open

| Gap | Priority | Summary |
|---|---|---|
| GAP-390 | HIGH | Skills Review's "Include" affordance for weak-evidence skills implies a confirm action that doesn't exist anywhere — generation excludes the skill unconditionally regardless |
| GAP-391 | MEDIUM | Publication venue-warning glyph (`⚠ [venue unavailable]`) is baked directly into final HTML/PDF/DOCX output instead of staying an editor-only warning |
| GAP-392 | LOW | Active-session "Edit notes" button shown regardless of ownership — rejection only surfaces after clicking Save |
| GAP-393 | LOW | Re-run audit trail records only phase/timestamp, not the diff data already computed client-side |
| GAP-394 | LOW | No in-context reminder that Customisation/Rewrite-Review edits are session-only, not yet saved to Master Data |
| GAP-395 | LOW | `cover_letter_reused_from`/`reused_from_session` use different session-identifier semantics (file path vs. directory) |

---

## Full Persona Reviews

Refreshed this cycle (9 of the 14 persona files; the other 5 — first-time-user, power-user, hr-ats, persuasion-expert, graphical-designer — were not in scope for this targeted pass and retain their cycle-103 content):

| Persona | Status file |
|---|---|
| applicant | `tasks/review-status/applicant.md` |
| accessibility-specialist | `tasks/review-status/accessibility-specialist.md` |
| trust-compliance | `tasks/review-status/trust-compliance.md` |
| returning-user | `tasks/review-status/returning-user.md` |
| ux-expert | `tasks/review-status/ux-expert.md` |
| master-cv-curator | `tasks/review-status/master-cv-curator.md` |
| hiring-manager | `tasks/review-status/hiring-manager.md` |
| recruiter-ops | `tasks/review-status/recruiter-ops.md` |
| resume-expert | `tasks/review-status/resume-expert.md` |

---

*Reviewed against: web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus persona-specific and gap-specific files (web/cover-letter.js, web/screening-questions.js, web/master-cv.js, web/workflow-steps.js, web/achievements-review.js, web/keyboard-shortcuts.js, web/session-manager.js, web/ui-helpers.js, web/session-switcher-ui.js, web/finalise.js, web/harvest.js, web/download-tab.js, web/final-generate.js, scripts/utils/cv_orchestrator.py, scripts/utils/llm_client.py, scripts/routes/master_data_routes.py, scripts/routes/session_routes.py).*
