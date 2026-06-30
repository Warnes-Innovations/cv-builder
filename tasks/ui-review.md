<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Cycle 11

**Date:** 2026-06-30
**Branch:** `feature/multi-user-deployment`
**Commit baseline:** `94ec2ae` (cycle 10 fixes)
**Personas reviewed:** 14 persona sub-agents + 1 heuristic sub-agent (15 total)
**New gaps added this cycle:** GAP-218 through GAP-233 (16 new entries)

---

## Executive Summary

### Cycle 10 Fixes Confirmed Working

All 5 cycle-10 fixes were independently verified by sub-agents reading source files:

| Fix | GAP | Status |
| --- | --- | --- |
| `@media (prefers-reduced-motion: reduce)` in `styles.css:1621–1630` | GAP-199 | ✅ Confirmed by accessibility-specialist and power-user |
| Calibri `font.name` in `_setup_ats_styles()` lines 3847/3857/3867/3875 | GAP-212 | ✅ Confirmed by file grep |
| ATS score formula `(2 * hard + soft) / 3` at `scoring.py:534` | GAP-216 | ✅ Confirmed by file grep |
| `_alertPreviousFocus` in `ui-helpers.js` | GAP-197 | ✅ Confirmed by source review |
| Cover letter closing prompt strengthened at `master_data_routes.py:1630` | GAP-204 | ✅ Confirmed by hiring-manager and persuasion-expert |

Also confirmed: GAP-127 (`candidate_to_confirm` filter at `cv-template.html:628,777`) — resume-expert cycle 11 review confirmed both template paths correctly filter unconfirmed skills.

---

## Status Summary by Persona

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| --- | --- | --- | --- | --- |
| Applicant (US-A1–A12) | ~28 | ~8 | 2 | 2 |
| UX Expert (US-U1–U9) | 28 | 16 | 3 | 1 |
| Resume Expert (US-R*) | 18 | 9 | 6 | 1 |
| Hiring Manager (US-M*) | 42 | 11 | 0 | 1 |
| Persuasion Expert (US-P*) | 10 | 9 | 2 | 7 |
| HR/ATS (US-H*) | ~10 | ~6 | 2 | 0 |
| Accessibility (US-X*) | ~14 | ~4 | 0 | 0 |
| First-Time User (US-F*) | 4 | 9 | 2 | 0 |
| Returning User (US-S*) | 7 | 2 | 0 | 0 |
| Power User (US-W*) | 9 | 1 | 0 | 0 |
| Recruiter Ops (US-O*) | 8 | 1 | 0 | 0 |
| Master CV Curator (US-M*) | 8 | 4 | 1 | 0 |
| Trust/Compliance (US-C*) | ~8 | ~3 | 1 | 0 |
| Graphical Designer (US-G*) | 6 | 6 | 0 | 0 |
| **Heuristic** | H5🟢 | H1🟡H2🟡H3🟡H7🟡 | H4🟠H8🟠H10🟠 | — |

---

## Top Acceptance-Criteria Gaps

### Critical/High Priority Failures

1. **GAP-218 (HIGH BUG):** ATS validator at `cv_orchestrator.py:4882–4889` rejects "Selected Publications" as a fail, even though the template correctly generates it as the heading when a subset is shown. False failure fires on every curated CV.

2. **GAP-206 (HIGH):** No phase-lock indicator on Master CV tab — edit buttons visible and clickable in mid-workflow phases but all writes return 409. User gets only a generic error toast.

3. **GAP-213 (HIGH):** Publications section absent from ATS DOCX — only certifications/awards are in `_add_ats_additional_sections`. Publications keywords are therefore excluded from ATS scanning of the DOCX.

4. **GAP-215 (HIGH):** Skill type UI override not supported — `skills-review.js:667–671` shows a display-only badge with no toggle. No backend route accepts `skill_type` override.

5. **GAP-222 (HIGH):** Cover letter "I"-as-first-word gate not implemented — `cover-letter.js:515` result category is `warn` not `fail`. Story requires rejection (GAP-184 from cycle 8, confirmed still open).

6. **GAP-219 (HIGH):** `openJobAnalysisModal()` has zero focus management — no prior-focus save, no `setInitialFocus`, no `trapFocus`, no `restoreFocus` on close.

7. **GAP-225 (HIGH):** Experience relevance ordering overridden by reverse-chronological sort at `cv_orchestrator.py:3168`. Relevance-ranked order from LLM is discarded.

8. **GAP-226 (HIGH):** Domain inference missing confidence field — no ambiguity-triggered clarifying question when job analysis has low confidence.

9. **GAP-228 (HIGH):** No in-browser preview of final generated CV — `final-generate.js:72–100` shows download links only. Layout Review has iframe preview but final output does not.

10. **GAP-201 (MED, existing):** Clarifying questions shown all at once (`questions-panel.js:147`) — story requires groups of ≤3 with progressive disclosure.

### Confirmed Still Open from Prior Cycles

- **GAP-14:** Workflow progress indicator — no phase visualization in UI (HIGH)
- **GAP-91:** Backup/restore UI absent — API exists but no frontend
- **GAP-200:** Single `_focusedElementBeforeModal` clobbered by nested modal opens
- **GAP-185/GAP-231:** Cover letter PDF format not generated
- **GAP-232:** Publications review has no reorder controls
- **GAP-210:** Notes not editable post-archive in session switcher

---

## Heuristic Evaluation Summary

### Nielsen's 10 Heuristics

| # | Heuristic | Rating | Key Finding |
| --- | --- | --- | --- |
| H1 | Visibility of system status | 🟡 Minor | Token count label has no tooltip; two parallel navs can diverge |
| H2 | Match between real world | 🟡 Minor | Internal phase names in tooltips; rename button invisible at rest |
| H3 | User control and freedom | 🟡 Minor | ↻ re-run at opacity 0.35 hover-only; Escape on ownership-conflict undefined |
| H4 | Consistency and standards | 🟠 Major | Two parallel navigation systems with different vocabularies and no labeled relationship |
| H5 | Error prevention | 🟢 Good | Re-run confirm modal, session ownership conflict dialog, LLM-not-ready gate |
| H6 | Recognition rather than recall | 🟡 Minor | No breadcrumb for 12-step flow; tab bar has no "start here" signal |
| H7 | Flexibility and efficiency | 🟡 Minor | Full keyboard nav on tabs; no keyboard shortcut for primary CTAs |
| H8 | Aesthetic and minimalist | 🟠 Major | 21 tabs (10 visible in Customise), 10 elements in position bar, 80+ inline styles |
| H9 | Error recognition/recovery | 🟡 Minor | `appendRetryMessage` good; no persistent error log |
| H10 | Help and documentation | 🟠 Major | Welcome modal is only help; "Don't show again" permanently suppresses it |

### Top 5 UX Issues by Impact

1. **Dual navigation confusion** — 12-step pill bar + 21-tab bar are two parallel navigations with no visible hierarchy (`ui-core.js:350–363` `STAGE_TABS` map invisible to users).

2. **Re-run button invisible at rest** — opacity 0.35, hover-only (`workflow-steps.js:762`). On touch devices permanently invisible.

3. **Post-analysis gate not surfaced** — Questions tab prerequisite before recommendations (`workflow-steps.js:830–839`) not shown until the user clicks.

4. **Tab-bar density in Customise stage** — 10 tabs simultaneously, no grouping or mandatory-vs-optional distinction.

5. **Empty-state lacks embedded CTA** — no action button in empty states; user must locate button in separate 40%-width chat panel.

### Additional UX Dimensions

| Dimension | Rating | Key Finding |
| --- | --- | --- |
| Cognitive load | 🟠 High | 12 pills + 10 tabs + 10-element position bar + chat history simultaneously |
| Visual hierarchy | 🟡 Minor | Step pills and tab bar blur together (adjacent rows, similar colors) |
| Information architecture | 🟠 Major | Master CV reachable via 3 paths; step→tab hierarchy unlabeled |
| Workflow momentum | 🟡 Minor | Questions gate fires only at click time |
| Feedback loops | 🟢 Good | LLM busy overlay with elapsed timer; layout freshness chip |
| Error recovery | 🟡 Minor | `appendRetryMessage` good; errors scroll away |
| Affordance clarity | 🟡 Minor | `.step.upcoming` pale color, no lock icon; collapse toggle inside panel |
| Terminology clarity | 🟠 Major | "Harvest", "ATS", "Customise" vs "Customizations", "LLM:", "Package Application Files" |

---

## Persona Reviews

### Applicant (US-A1–A12)

#### ~28 Pass / ~8 Partial / 2 Fail / 2 Not Implemented

- ✅ US-A1–A3, A4/A4b, A5a–c, A6, A8, A11 — substantially pass
- ❌ US-A12: audit log logs phase + timestamp but not prior clarification answers or downstream item count (`conversation_manager.py:1571`)
- ❌ US-A12: no keyboard shortcut for ↻ re-run
- ⚠️ Publications reorder absent — `publications-review.js` has no up/down handlers → GAP-232
- ⚠️ Cover letter PDF missing — `master_data_routes.py:1619–1697` saves DOCX only → GAP-231
- 🔲 US-A10: NL-to-JSON-diff update path absent; no document ingestion (paste old CV/LinkedIn)
- ⚠️ US-A9: `finalise.js:174–189` shows ATS score and commit hash but not total session elapsed time
- **Terminology:** "LLM:" developer jargon; "Package Application Files" implementation-centric; "Customise" step vs "Customizations" action button

### UX Expert (US-U1–U9)

#### 28 Pass / 16 Partial / 3 Fail / 1 Not Implemented

- ❌ US-U3.4: Questions all at once (`questions-panel.js:147`) → GAP-201
- ❌ US-U6.2: No in-browser final CV preview (`final-generate.js:72–100`) → GAP-228
- ❌ US-U6.6: No version labelling for multiple generation runs → GAP-229
- ⚠️ US-U9.5: Layout undo stack-based but per-entry buttons imply independent undo → GAP-227
- ⚠️ US-U7.5: Rewrite card accepted/rejected state colour-only → GAP-230
- ⚠️ US-U4.4: Bulk toolbar has domain-specific actions but no Select All / Deselect All
- ⚠️ US-U3.2: Confirmation editability post-URL-fetch before analysis not immediate
- 🔲 US-U8.5: No virtual scrolling or CSS containment on review tables
- **Terminology (8 issues):** "Submit Job Description" → "Analyse Job Description"; "Generate Preview →" ambiguous; "Package Application Files"; "LLM:"; "File Review" tab; "Master CV" vs "Master Profile"

### Resume Expert (US-R*)

#### 18 Pass / 9 Partial / 6 Fail / 1 Not Implemented

Key upgrades vs prior cycle:

- ✅ `candidate_to_confirm` filter confirmed at `cv-template.html:628,777`
- ✅ `rank_publications_for_job` performs proper LLM-based ranking with 1–10 scores

Key downgrades vs prior cycle:

- ❌ Domain inference confidence — no `confidence` field in `JobAnalysisResponse` → GAP-226
- ❌ Recency sort at `cv_orchestrator.py:3168` overwrites relevance order → GAP-225
- ❌ Terminology consistency and acronym expansion — no batch check → GAP-233
- ❌ Proper noun seeding — company names and candidate name not auto-seeded to spell checker
- ❌ Severity calibration — no severity field on suggestions; no sorted output

### Hiring Manager (US-M*)

#### 42 Pass / 11 Partial / 0 Fail / 1 Not Implemented

- ✅ US-M5 fully passes (all 11 visual identity criteria: typography, color, sidebar, print)
- ✅ Cover letter now closes with direct interview request (GAP-204 resolved)
- 🐛 **NEW BUG GAP-218:** ATS validator at `cv_orchestrator.py:4882–4889` rejects "Selected Publications" as fail
- ⚠️ Action-verb enforcement logs server-side only (`_enhance_achievement_for_ats`), not UI-visible
- ⚠️ No minimum 2-bullet count per experience entry enforced in pipeline

### Persuasion Expert (US-P*)

#### 10 Pass / 9 Partial / 2 Fail / 7 Not Implemented

- ✅ `apply_rewrite_constraints` robust gate for numeric/date/proper-noun removal
- ✅ 8 persuasion checks (`check_strong_action_verb`, `check_passive_voice`, `check_word_count`, `check_has_result_clause`, `check_hedging_language`, `check_car_structure`, `check_named_institution_position`, `check_summary_generic_phrases`)
- ❌ "I"-first-word gate missing → GAP-222
- ❌ CAR structure check reactive only; no proactive proposal from master data
- ⚠️ Passive CTA shows warn not fail → GAP-224
- ⚠️ Word count threshold mismatch (frontend green zone 300–400 for standard; story requires ≤300) → GAP-223
- 🔲 No narrative fragmentation warning; no forward-looking post-check; no positive-sum framing; no screening-to-CV keyword harmonisation

### HR/ATS Specialist (US-H*)

#### ~10 Pass / ~6 Partial / 2 Fail

- ✅ ATS DOCX: single-column, contact in body, text selectable, plain-text URLs, JSON-LD
- ✅ 6 section headings with accepted labels in `Heading 1` style
- ✅ 16-check programmatic validation; results in ATS Report modal (advisory, non-blocking by design)
- ✅ ATS score displayed in position bar; persisted to `metadata.json`
- ✅ GAP-212 (font name) confirmed RESOLVED; GAP-216 (score weighting) confirmed RESOLVED
- ❌ Skill type UI override absent → GAP-215
- ❌ `skill_type` not persisted to Master CV → related GAP-89
- ⚠️ Publications absent from ATS DOCX → GAP-213
- ⚠️ Synonym expansion not in `compute_ats_score` → GAP-214

### Accessibility Specialist (US-X*)

#### ~14 Pass / ~4 Partial / 0 Fail

Confirmed resolved (cycle 9/10):

- ✅ `@media (prefers-reduced-motion: reduce)` at `styles.css:1621–1630`
- ✅ `aria-current="step"` on active workflow step
- ✅ Onboarding modal focus trap and Escape handler
- ✅ Alert modal prior-focus saved to `_alertPreviousFocus`
- ✅ All primary modals have focus trap + restore

New gaps found:

- 🐛 **GAP-219:** `openJobAnalysisModal()` zero focus management (HIGH)
- **GAP-220:** `aria-current` absent during post-layout phases (LOW)
- **GAP-221:** Layout Review iframe missing `title` attribute (LOW)

### First-Time User (US-F*)

#### 4 Pass / 9 Partial / 2 Fail

- ✅ Onboarding modal detects 3 states; clear next-action guidance
- ✅ Job tab empty state immediately shows input panel
- ❌ Generation pipeline transitions not explained — user cannot tell Layout Review is a draft
- ❌ Post-download steps (Cover Letter through Harvest) shown with same visual weight as required Download; no "optional" labelling
- ⚠️ 12 workflow steps visible from first load; 10 tabs in Customise with no "start here"
- **Terminology:** "Harvest", "ATS" unexplained; "Rewrites" without definition; UK/US spelling inconsistency

### Returning User (US-S*)

#### 7 Pass / 2 Partial / 0 Fail

- ✅ Session restoration: position bar, `lastKnownPhase`, `tabData` hydrated correctly
- ✅ `back_to_phase()` preserves approvals; `_build_downstream_context()` injects prior context
- ⚠️ Step-click vs ↻ re-run distinction hover-only; invisible on touch/keyboard
- ⚠️ No per-tab decision count badges to verify granular decision state

### Power User (US-W*)

#### 9 Pass / 1 Partial / 0 Fail

Cycle 10 confirmed working:

- ✅ `aria-current="step"` keyboard orientation
- ✅ Reduced-motion: chip colour/border preserves state without animation

Carry-over open gaps:

- No keyboard shortcut for primary CTA buttons
- No text-search filter in sessions modal
- Re-run success message omits changed-item count
- No undo for bulk review-table decisions

### Recruiter Ops (US-O*)

#### 8 Pass / 1 Partial / 0 Fail

- ✅ GAP-ROPS-01 (Finalise status vocabulary) confirmed RESOLVED — 6-value vocabulary consistent
- ✅ 8 fields persisted to `metadata.json` including ATS score, spell audit, layout instructions
- ⚠️ Notes field not editable in session-switcher UI post-archive → GAP-210
- No per-file generation timestamp in download tab listings → GAP-229

### Master CV Curator (US-M*)

#### 8 Pass / 4 Partial / 1 Fail

- ✅ Harvest: before/after diffs, LLM scoring, opt-in checkboxes, confirm modal
- ✅ Publications CRUD: import, LLM-convert, raw BibTeX, phase gating
- ❌ GAP-206: No phase-lock indicator — edit buttons appear but all mid-workflow writes return 409
- ⚠️ GAP-91: Backup/restore API implemented but zero frontend UI
- ⚠️ GAP-208: BibTeX import aggregate error counts only; skipped cite keys not identified

### Trust/Compliance (US-C*)

#### ~8 Pass / ~3 Partial / 1 Fail

- ✅ LCS word-level diff with `<del>`/`<ins>` per rewrite card
- ✅ `candidate_to_confirm` weak-evidence badge with acknowledgement gate blocks submission
- ✅ Phase gating blocks output until approvals complete
- ❌ `rewrite_audit` array never surfaced as inspectable log in UI
- ⚠️ Cold-restore silently re-applies prior decisions without user notification
- ⚠️ Customization items without decision silently use AI defaults — not disclosed

### Graphical Designer (US-G*)

#### 6 Pass / 6 Partial / 0 Fail

- ✅ Typography differentiation; amber/green/red semantic consistency; WCAG keyboard patterns; layout preview framing
- ⚠️ Position bar action buttons styled via inline styles; modal inline-style drift risk
- ⚠️ CV font stack `"Segoe UI", Arial` — utilitarian, not distinctive
- ⚠️ CV header center-aligned over left-biased body grid — inconsistency
- ⚠️ 900–1100px breakpoint can compress preview iframe to unreadable size

---

## New Gaps Added This Cycle (GAP-218 through GAP-233)

| GAP | Priority | Description |
| --- | --- | --- |
| GAP-218 | HIGH BUG | ATS validator falsely rejects "Selected Publications" heading |
| GAP-219 | HIGH | `openJobAnalysisModal()` has zero focus management |
| GAP-220 | LOW | `aria-current` not set during post-layout phases |
| GAP-221 | LOW | Layout Review iframe missing `title` attribute |
| GAP-222 | HIGH | Cover letter "I"-as-first-word gate not implemented |
| GAP-223 | MED | Cover letter word count threshold mismatch (frontend 400 vs story 300) |
| GAP-224 | MED | Passive CTA shows warn instead of fail |
| GAP-225 | HIGH | Experience relevance ordering overridden by reverse-chrono sort |
| GAP-226 | HIGH | Domain inference missing confidence field |
| GAP-227 | MED | Layout undo stack-based but UI shows per-entry buttons (misleading) |
| GAP-228 | HIGH | No in-browser preview of final generated CV |
| GAP-229 | MED | No version labelling for multiple generation runs |
| GAP-230 | LOW | Rewrite card accepted/rejected state is colour-only |
| GAP-231 | MED | Cover letter PDF format not generated (carry-over GAP-185) |
| GAP-232 | MED | Publications review has no reorder controls |
| GAP-233 | MED | No batch terminology consistency check across rewrites |

---

## Recommended Priority Order for Cycle 12

1. **GAP-218** — Fix ATS validator to accept "Selected Publications" (1-line change at `cv_orchestrator.py:4882`)
2. **GAP-219** — Add focus management to `openJobAnalysisModal()`
3. **GAP-222** — Implement "I"-first-word cover letter fail gate (`cover-letter.js:515`)
4. **GAP-225** — Hybrid relevance+recency experience ordering (`cv_orchestrator.py:3168`)
5. **GAP-228** — In-browser HTML preview on Download tab
6. **GAP-206** — Phase-lock indicator on Master CV tab (existing HIGH)
7. **GAP-213** — Publications in ATS DOCX (existing HIGH)
8. **GAP-224** — Passive CTA upgraded to fail
9. **GAP-201** — Clarifying questions grouped ≤3 (existing MED)
10. **GAP-227** — Fix layout undo affordance mismatch
