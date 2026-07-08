<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Cycle 107 (Committee Sign-Off Verification)

**Generated:** 2026-07-07
**Cycle:** 107 (targeted re-verification of cycle 106's 6 fixes for GAP-390 through GAP-395, with an explicit sign-off verdict requested from each reviewer)
**Branch:** `main`
**Sources:** 5 persona sub-agents, one per gap's originating persona — trust-compliance (GAP-390), hiring-manager (GAP-391), returning-user (GAP-392), applicant (GAP-393, GAP-395), master-cv-curator (GAP-394). Each read current source directly (source-first — none read `tasks/gaps.md` or this file as evidence) and was explicitly instructed not to trust the cycle-106 fix summary, and to state an explicit RESOLVED/PARTIAL/STILL BROKEN verdict with a sign-off yes/no.

---

## Why This Cycle Ran

Cycle 105's committee review found 6 gaps (GAP-390–395) in cycle 104's own fixes. Cycle 106 fixed all 6. Rather than accept that as final, this cycle asked the exact personas who originally raised each gap to independently re-verify the fix and explicitly sign off — the same escalating-verification pattern used at cycles 103→104 (which caught 2 introduced regressions) and 105→106 (which caught cycle 104's incomplete GAP-388 fix). This pattern has now caught a real, unfixed issue on all three occasions it's been applied.

**Verdict:** 5 of 6 gaps signed off as RESOLVED with no reservations. GAP-395 was found only PARTIAL — a sibling instance of the identical bug existed in an untouched CLI tool (`scripts/cv-preview.py`). Two personas also surfaced minor, non-blocking follow-up recommendations (a dead CSS rule, two test-coverage gaps). All findings from this cycle were fixed in this same cycle.

---

## Per-Persona Sign-Off

| Gap | Persona | Verdict | Sign-off | Notes |
|---|---|---|---|---|
| GAP-390 | trust-compliance | RESOLVED | **YES** | Confirmed zero remaining "confirm this skill" implications anywhere, including the built bundle; confirmed the 3-format exclusion logic is consistent; ran the regression test directly. |
| GAP-391 | hiring-manager | RESOLVED | **YES** | Confirmed all 3 output paths clean; confirmed the in-app editor warning was correctly left intact (not over-removed); ran both existing regression tests directly. Surfaced 2 follow-ups (fixed this cycle). |
| GAP-392 | returning-user | RESOLVED | **YES** | Traced the full client/server chain — confirmed the client's "Owned by another tab" label is true exactly when the server's `_validate_owner` would 403, not just plausibly related. |
| GAP-393 | applicant | RESOLVED | **YES** | Verified phase-string resolution consistency between `re_run_phase()` and `record_rerun_diff()`; verified repeated re-runs of the same phase attach correctly via the reverse-scan-for-first-undiffed-entry logic; noted one theoretical unreachable race (not a blocker). |
| GAP-394 | master-cv-curator | RESOLVED | **YES** | Confirmed both notes render correctly and traced that they re-render on every tab visit (judged correct UX, not a defect); confirmed GAP-384/GAP-389 have not regressed. Surfaced 1 follow-up (fixed this cycle). |
| GAP-395 | applicant | **PARTIAL → RESOLVED this cycle** | conditional → now yes | Found `scripts/cv-preview.py:518` had the identical unfixed bug — same field, same file, written into the same `metadata.json` shape, still a `session.json` file path instead of a directory. Fixed and tested in cycle 107. |

---

## Fixed This Cycle

| Item | Source | Summary |
|---|---|---|
| GAP-395 sibling bug | applicant | `scripts/cv-preview.py:518` now writes `str(session_file.parent)`, matching the web app's already-fixed format. New test: `tests/test_cv_preview_cli.py` asserts the metadata field is a directory. |
| Dead CSS rule | hiring-manager | Removed the now-unreferenced `.pub-venue-warning` rule from `templates/cv-template.html`. |
| HTML/PDF venue-warning test | hiring-manager | Added `tests/test_cv_template.py::test_venue_warning_does_not_leak_into_rendered_html` — previously only the 2 DOCX paths had coverage for GAP-391. |
| review-table-base.js note test | master-cv-curator | Added `tests/js/review-table-base.test.js::populateReviewTab`, using the pre-existing global-stub pattern already established in that file (the "orchestration-heavy, not unit tested" framing in the cycle-106 fix summary was independently confirmed accurate, not an excuse, but a one-line assertion turned out to be cheap to add anyway). |

---

## Full Persona Reviews

Rewritten in place this cycle (not appended to) — reflect this cycle's independent re-verification, replacing the cycle-105 content for these 5 personas:

| Persona | Status file |
|---|---|
| trust-compliance | `tasks/review-status/trust-compliance.md` |
| hiring-manager | `tasks/review-status/hiring-manager.md` |
| returning-user | `tasks/review-status/returning-user.md` |
| applicant | `tasks/review-status/applicant.md` |
| master-cv-curator | `tasks/review-status/master-cv-curator.md` |

The other 9 persona files (ux-expert, resume-expert, accessibility-specialist, first-time-user, power-user, recruiter-ops, hr-ats, persuasion-expert, graphical-designer) were not in scope for this targeted pass and retain their most recent content from cycles 103/105.

---

## Cumulative Status: Cycles 103–107

- Cycle 103: full 15-persona review found GAP-376–389 (14 gaps).
- Cycle 104: fixed 13/14 (GAP-387 investigated and found to be a false positive).
- Cycle 105: independent re-verification of cycle 104 found 2 fixes needed more work (GAP-388 partial, GAP-384 undermined by 4 adjacent bugs) and filed 6 new gaps (GAP-390–395); all fixed same-cycle.
- Cycle 106: fixed all 6 of GAP-390–395.
- Cycle 107 (this cycle): independent re-verification of cycle 106 signed off 5/6 immediately, found 1 partial (GAP-395's CLI sibling) and 2 minor follow-ups; all fixed same-cycle.

As of this cycle, every gap from GAP-376 through GAP-395 is either RESOLVED (with at least one round of independent, source-first persona re-verification — several with an explicit sign-off statement) or FALSE POSITIVE (GAP-387, itself independently re-confirmed twice). None remain OPEN.

---

*Reviewed against: web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus gap-specific files: web/skills-review.js, scripts/utils/cv_orchestrator.py, templates/cv-template.html, web/publications-review.js, web/session-switcher-ui.js, web/session-manager.js, scripts/routes/session_routes.py, scripts/routes/job_routes.py, scripts/routes/master_data_routes.py, web/workflow-steps.js, web/cover-letter.js, scripts/cv-preview.py, web/review-table-base.js, web/rewrite-review.js, web/master-cv.js, web/harvest.js.*
