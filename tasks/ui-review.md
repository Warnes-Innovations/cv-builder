<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Cycle 8

**Date:** 2026-06-29
**Branch:** feature/multi-user-deployment
**Personas:** 14 parallel source-first persona reviews + 1 UX heuristic evaluation
**Commits reviewed (since cycle 7):**
- `162dedc` — GAP-93: phase-enforcement 409 suppresses session conflict banner
- `b7fb7c5` — GAP-102/GAP-177: sessions modal application status badge + human DOCX heading styles
- `f2a0bbf` — GAP-106: generation timestamp on download cards

---

## Executive Summary

| Category | Count |
|----------|-------|
| Confirmed resolved this cycle | 7 (GAP-93, GAP-102, GAP-106, GAP-35, GAP-178, GAP-180, GAP-182) |
| New gaps discovered | 8 (GAP-183 through GAP-190) |
| Existing gaps upgraded severity | 1 (GAP-U9: Partial → Fail) |
| Existing gaps with new evidence | 4 (GAP-127, GAP-29, GAP-95, GAP-175) |

**Most critical unresolved gaps:** GAP-36 (first-run onboarding), GAP-41 (pre-job Master CV editor), GAP-14 (no workflow progress indicator), GAP-H1/H2/H3 (skill_type persistence/UI), GAP-183 (forced-colors outline failure), GAP-127 (candidate_to_confirm skills reach generated output).

---

## Resolved Since Cycle 7

| Gap | Description | Evidence |
|-----|-------------|---------|
| GAP-93 | Phase-enforcement 409 suppresses session conflict banner | `ui-core.js:465–470` peeks at `conflict_type`; confirmed by master-cv-curator |
| GAP-102 | Application status badge in sessions modal | `session-switcher-ui.js` renders Draft/Ready/Sent badge; confirmed by recruiter-ops |
| GAP-106 | Generation timestamp on download cards | `download-tab.js:194–196` `generatedAt` label; confirmed by recruiter-ops, power-user |
| GAP-35 | `#message-input` missing `aria-label` | `aria-label="Chat message"` present; confirmed by accessibility-specialist |
| GAP-178 | Rewrite buttons missing `aria-pressed` | `rewrite-review.js:306–308`; confirmed by accessibility-specialist, returning-user |
| GAP-180 | Step-rerun button `opacity:0` at rest | `opacity:0.35` in `workflow-steps.js:733`; confirmed by returning-user |
| GAP-182 | `.action-btn.secondary` no CSS definition | `styles.css:590–591`; confirmed by graphical-designer |

---

## New Gaps (Cycle 8)

### GAP-183 — HIGH: Input Focus States Fail Windows High Contrast / forced-colors Mode
Four inputs use `outline: none` with only `box-shadow` as the focus indicator. `box-shadow` is suppressed by the browser under `forced-colors: active` (Windows High Contrast). Affected: `.q-input:focus` (styles.css:510), `.message-input:focus` (styles.css:579), `.form-input:focus` (styles.css:755), `.layout-instruction-textarea:focus` (styles.css:1436). Fix: add `outline: 2px solid #3b82f6; outline-offset: 2px` alongside each existing `box-shadow` rule.
*Found by: ux-expert, accessibility-specialist*

### GAP-184 — HIGH: Cover Letter Body May Start With "I" — No Rejection Gate
`_validateCoverLetter` (`cover-letter.js:492–509`) checks only for generic salutations; it does not detect or reject a body that starts with "I". Persuasion best practice requires the opening word to establish context or value before the first-person pronoun. Fix: add a one-regex check in `_validateCoverLetter`.
*Found by: persuasion-expert*

### GAP-185 — MEDIUM: Cover Letter PDF Not Generated — Only DOCX Produced
`master_data_routes.py:1619–1697` generates only a DOCX for the cover letter; no PDF generation code exists in this route. The download grid will show a `.docx` but no matching `.pdf`. The applicant story (US-A7) expects a PDF output.
*Found by: applicant*

### GAP-186 — MEDIUM: Rewrite Decisions Not Cold-Restored from Backend `approved_rewrites`
`_persistDecisions()` / `_restoreDecisions()` (`rewrite-review.js:43–65`) correctly round-trip rewrite card state via localStorage for same-device / same-browser returns. However, on cold load (different device, incognito, localStorage cleared, or >24h), the backend `state['approved_rewrites']` is not used to seed the rewrite panel UI. Users lose their rewrite decision history after any storage reset.
*Found by: returning-user*

### GAP-187 — MEDIUM: Cover Letter Word Count Has No Role-Differentiated Targets
`cover-letter.js:534` hard-codes a single 250–400 word range for all roles. The hiring-manager story requires role-specific targets: 300–400w standard, 400–500w executive, 500–600w academic/research. Role information is available from `job_analysis.domain` / `role_level`.
*Found by: hiring-manager*
*Note: Related to existing GAP-95 (threshold too permissive); GAP-187 requires role differentiation on top.*

### GAP-188 — MEDIUM: `approved_rewrites` Not Injected Into Cover Letter LLM Prompt
The cover letter generation prompt at `headless_session.py:427–430` does not include `approved_rewrites` or tailored achievements from the session. The LLM therefore cannot reference named accomplishments from the candidate's customised CV in the cover letter body.
*Found by: hiring-manager*

### GAP-189 — MEDIUM: Action-Verb Warnings in Experience Bullets Are Log-Only
`_enhance_achievement_for_ats()` (`cv_orchestrator.py:3966–3970`) calls `logger.warning()` when a weak action verb is detected but never surfaces this as a user-visible warning in the "Experience Bullets" review tab. The story requires a visible flag so users can correct bullets before generation.
*Found by: hiring-manager*

### GAP-190 — LOW: Session Re-Run Events Not Logged With Timestamp
`re_run_phase()` (`conversation_manager.py:1570–1576`) saves session state and returns result but writes no timestamped entry to a `rerun_log` in session state. Users and audit trails cannot reconstruct when re-runs occurred or which phase was re-entered.
*Found by: applicant*

---

## Existing Gaps With New Evidence

### GAP-127 — `candidate_to_confirm` Skills Reach Generated Output (Still Partial/Open)
The cycle 8 resume-expert review confirmed that `cv-template.html` (lines 629, 777) renders all skills in `skills_by_category` without filtering on `candidate_to_confirm`. The UI badge added in cycle 3 helps users identify these skills, but they still appear in generated PDF/DOCX/HTML if not explicitly removed before generation. The output exclusion design decision remains open.
*Evidence: `scripts/utils/cv_orchestrator.py:1779`; `templates/cv-template.html:629,777`*

### GAP-29 — Venue-Missing Publications Not Flagged (New Evidence)
The cycle 8 hr-ats review found `venue_warning` is computed at `cv_orchestrator.py:896` but never rendered in the Publications Review tab UI. The `.pub-venue-warn` CSS class exists but is not applied.
*Evidence: `cv_orchestrator.py:896`; `styles.css` `.pub-venue-warn`*

### GAP-95 — Cover Letter Word Count Threshold Too Permissive (Re-Confirmed)
Cycle 8 persuasion-expert confirmed: `cover-letter.js:534` still accepts up to 400 words (warning at 400, fail at 450). Backend prompt targets 250–300 words. The threshold is misaligned.

### GAP-175 — Summary Specificity Validator Absent on Baseline Summaries (New Evidence)
The cycle 8 resume-expert found that `check_summary_generic_phrases` is run only on rewrite proposals (`conversation_manager.py:1324–1325`), not on the baseline selected summary. Generic stored summaries reach generated output without any specificity check. The fallback summary at `cv_orchestrator.py:197` is explicitly generic.

### GAP-U9 Upgraded — Two Overlapping Advance Buttons (Partial → Fail)
The ux-expert upgraded this from Partial to Fail this cycle. `#layout-btn` ("✅ Confirm Layout", `index.html:188`) and `#final-generate-proceed-btn` ("✅ Proceed to Finalise →", `index.html:189`) have inconsistent labels and no single "Proceed to Final Generation" label as the story requires.

---

## Heuristic Evaluation Summary (Cycle 8)

| # | Heuristic | Rating | Top Finding |
|---|-----------|--------|-------------|
| H1 | Visibility of system status | 🟡 Minor | Duplicate LLM busy indicators; no step completion count |
| H2 | Match: real world | 🟡 Minor | "Harvest" agricultural metaphor; British spellings; ATS/LLM jargon |
| H3 | User control & freedom | 🟠 Major | 11 of 13 workflow steps have no keyboard access (no tabindex, no role) |
| H4 | Consistency & standards | 🟡 Minor | Three button label patterns; three tab-underline implementations |
| H5 | Error prevention | 🟡 Minor | Auto-analyze fires without confirmation; LLM errors caught per-call not globally |
| H6 | Recognition vs. recall | 🟠 Major | Tab bar hides full IA; 13-step bar overflows on 1280px laptops |
| H7 | Flexibility & efficiency | 🟡 Minor | No keyboard shortcuts; no bulk-approve for rewrites |
| H8 | Aesthetic & minimalism | 🟠 Major | 4 chrome bars consume 210px; 218 inline style="" in index.html |
| H9 | Error recovery | 🟡 Minor | LLM errors as italic chat messages with no Try Again button |
| H10 | Help & documentation | 🟡 Minor | Welcome modal is only onboarding surface; title attributes as only contextual help |

**Top 5 UX Issues by Friction/Abandonment Risk:**
1. Workflow steps 2–13 have `onclick` but no `tabindex`/`role` — keyboard-only users cannot navigate the workflow bar
2. 4 chrome bars (header + position bar + 13-step nav + tab bar) consume 210px — ~237px wide chat on 1280×800 laptop
3. Tab bar hides all but current-stage tabs — no breadcrumb or full-architecture map available
4. Duplicate LLM busy indicators (`#llm-busy-overlay` + `#llm-status-bar`) both show Stop button
5. No inline error recovery for LLM failures — errors are italic grey chat messages with no actionable path

---

## Persona Score Summaries

| Persona | Stories | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | Notes |
|---------|---------|---------|-----------|--------|------------|-------|
| Applicant | US-A1–A12 | 91 | 3 | 2 | 2 | GAP-185 (no CL PDF); audit log fails |
| UX Expert | US-U1–U9 | 30 | 12 | 6 | 1 | GAP-U9 upgraded to Fail; GAP-U17 new |
| Resume Expert | US-R1–R7 | 15 | 9 | 3 | 5 | GAP-127 output exclusion confirmed partial |
| Hiring Manager | US-M1–M7 | 35 | 11 | 2 | 1 | 2 Fails: word count role-diff; tone not auto-inferred |
| Persuasion Expert | US-P1–P6 | 11 | 9 | 2 | 8 | GAP-PE-01 (I-first-word); GAP-96 re-confirmed |
| HR/ATS | US-H1–H8 | 31 | 7 | 2 | 2 | GAP-H1/H2/H3 HIGH remain; GAP-H8 font.name |
| Accessibility | US-X1–X3 | 11 | 1 | 0 | 0 | GAP-35 resolved; GAP-183 new forced-colors |
| First-Time User | US-F1–F3 | 1 | 8 | 0 | 0 | Unchanged from cycle 7; GAP-14/78/79/76 all open |
| Returning User | US-S1–S3 | 5 | 4 | 0 | 0 | GAP-RU-NEW1 (GAP-186); GAP-178/180 resolved |
| Power User | US-W1–W3 | 6 | 2 | 0 | 0 | GAP-93/102/106 confirmed resolved |
| Recruiter Ops | US-O1–O3 | 8 | 0 | 0 | 0 | GAP-106 resolved; US-O1.2 and US-O3.3 upgraded to Pass |
| Master CV Curator | US-MC1–MC4 | 8 | 3 | 0 | 0 | GAP-93 confirmed; extra-field round-trip risk persists |
| Trust & Compliance | US-C1–C3 | 8 | 3 | 0 | 1 | CL data transmission disclosure proposed (US-C4) |
| Graphical Designer | US-G1–G3 | 5 | 7 | 0 | 0 | D1 (no CSS tokens) and D5 (divergent templates) persist |

---

## Recruiter Ops: Full Pass on US-O (post GAP-106)

With GAP-106 resolved, the recruiter-ops persona now has 0 Partial in US-O1–O3. US-O1.2 ("UI makes clear which files are available and current") and US-O3.3 ("Multiple passes don't obscure currency") both upgraded from Partial to Pass.

---

## Top Priority Open Gaps (Post Cycle 8)

| Priority | Gap | Description |
|----------|-----|-------------|
| CRITICAL | GAP-36 | First-run onboarding — no guided setup path for new users |
| CRITICAL | GAP-41 | Pre-job Master CV editor — no editing path before job analysis begins |
| CRITICAL | GAP-14 | No workflow progress indicator or step completion count |
| HIGH | GAP-H1 | Skill hard/soft classification is rule-based heuristic, not LLM-driven |
| HIGH | GAP-H2 | `skill_type` not persisted back to `Master_CV_Data.json` |
| HIGH | GAP-H3 | No per-skill hard/soft override toggle in skills-review UI |
| HIGH | GAP-183 | Input focus states fail Windows High Contrast / forced-colors |
| HIGH | GAP-184 | Cover letter body may start with "I" — no rejection gate |
| HIGH | GAP-127 | `candidate_to_confirm` skills still reach generated output |
| HIGH | GAP-78 | All 13 workflow pills visible from page load — no staged disclosure |
| HIGH | GAP-79 | Preview→final generation pipeline never explained in UI |
| MEDIUM | GAP-185 | Cover letter PDF not generated (only DOCX) |
| MEDIUM | GAP-186 | Rewrite decisions not cold-restored from backend on fresh device |
| MEDIUM | GAP-187 | Cover letter word count not role-differentiated |
| MEDIUM | GAP-188 | `approved_rewrites` not injected into cover letter LLM prompt |
| MEDIUM | GAP-189 | Action-verb warnings log-only, not surfaced in UI |
| MEDIUM | GAP-95 | Cover letter word count threshold 400 (should be 300) |
| MEDIUM | GAP-96 | Passive CTA "I look forward to hearing from you" passes check |
| MEDIUM | GAP-132 | Divergent HTML vs DOCX CV templates |
| MEDIUM | GAP-175 | Summary specificity validator absent on baseline summaries |

---

## Full Persona Reviews

See individual status files in `tasks/review-status/`:
- [applicant.md](review-status/applicant.md) — Last updated 2026-06-29
- [ux-expert.md](review-status/ux-expert.md) — Last updated 2026-06-29
- [resume-expert.md](review-status/resume-expert.md) — Last updated 2026-06-29
- [hiring-manager.md](review-status/hiring-manager.md) — Last updated 2026-06-29
- [persuasion-expert.md](review-status/persuasion-expert.md) — Last updated 2026-06-29
- [hr-ats.md](review-status/hr-ats.md) — Last updated 2026-06-29
- [accessibility-specialist.md](review-status/accessibility-specialist.md) — Last updated 2026-06-29
- [first-time-user.md](review-status/first-time-user.md) — Last updated 2026-06-29
- [returning-user.md](review-status/returning-user.md) — Last updated 2026-06-29
- [power-user.md](review-status/power-user.md) — Last updated 2026-06-29
- [recruiter-ops.md](review-status/recruiter-ops.md) — Last updated 2026-06-29
- [master-cv-curator.md](review-status/master-cv-curator.md) — Last updated 2026-06-29
- [trust-compliance.md](review-status/trust-compliance.md) — Last updated 2026-06-29
- [graphical-designer.md](review-status/graphical-designer.md) — Last updated 2026-06-29
