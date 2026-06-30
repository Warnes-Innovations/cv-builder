<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Cycle 14

**Date:** 2026-06-30
**Branch:** `feature/multi-user-deployment`
**Commit baseline:** `b5d1e8b` (cycle 14 docs + gaps update)
**Personas reviewed:** 14 persona sub-agents + 1 heuristic sub-agent (15 total)
**New gaps added this cycle:** GAP-258 through GAP-270 (13 new entries)

---

## Executive Summary

### Cycle 14 Fixes Confirmed Working (All 6)

All 6 cycle-14 fixes were independently verified by multiple sub-agents reading source files:

| Fix | GAP | Confirmed by |
| --- | --- | --- |
| "? Help" header button calls `showWelcomeModal()` unconditionally — `index.html:63–66`, `session-manager.js:219` | GAP-247 | First-Time User, Accessibility, Heuristic |
| "CV Builder" brand name in `<h1>`, `<title>`, onboarding modal | GAP-251 | First-Time User, UX Expert, Heuristic |
| Finalise notes pre-populated via `GET /api/finalise-meta` + `_restoreFinaliseMeta()` | GAP-235 | Recruiter Ops, Applicant |
| `maxlength="2000"` + live character counter on `#finalise-notes` | GAP-236 | Recruiter Ops, Accessibility |
| ATS score grade legend (≥75% Strong · 50–74% Partial · <50% Low) in `_renderAtsReport()` | GAP-234 | Applicant, UX Expert, Heuristic |
| Layout auto-confirm when no instructions added in `generateFinalOutputs()` | GAP-249 | UX Expert, Heuristic |

Additionally: HR/ATS spec table (US-H2) upgraded from Partial → Pass after cycle-14 spec fix.

---

## Status Summary by Persona

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| --- | --- | --- | --- | --- |
| Applicant (US-A1–A12) | 88 | 24 | 0 | 0 |
| UX Expert (US-U1–U9) | 35 | 10 | 0 | 3 |
| Resume Expert (US-R*) | ~15 | ~10 | 0 | 0 |
| Hiring Manager (US-M*) | 18 | 11 | 0 | 7 |
| Persuasion Expert (US-P*) | 12 | 8 | 0 | 4 |
| HR/ATS (US-H*) | 4 | 7 | 0 | 0 |
| Accessibility (US-X*) | ~14 | ~3 | 0 | 0 |
| First-Time User (US-F*) | 4 | 9 | 2 | 0 |
| Returning User (US-S*) | 7 | 2 | 0 | 0 |
| Power User (US-W*) | 7 | 2 | 0 | 0 |
| Recruiter Ops (US-O*) | 8 | 3 | 1 | 0 |
| Master CV Curator (US-M*) | ~8 | ~4 | 0 | 0 |
| Trust/Compliance (US-C*) | ~8 | ~4 | 1 | 0 |
| Graphical Designer (US-G*) | 6 | 6 | 0 | 0 |
| **Heuristic** | H5🟢 | H1🟡H3🟡H4🟡H6🟡H7🟡H10🟡 | H2🟠H8🟠H9🟠 | — |

---

## Heuristic Evaluation Summary

### Nielsen's 10 Heuristics

| # | Heuristic | Rating | Key Finding |
| --- | --- | --- | --- |
| H1 | Visibility of system status | 🟡 Minor | LLM busy overlay excellent; "⚠ Not ready" pill has no inline CTA; raw token-count metric in chat header |
| H2 | Match between real world | 🟠 Major | "Harvest" jargon, "Layout Review" vs "File Review" naming split; filesystem paths in onboarding |
| H3 | User control and freedom | 🟡 Minor | Back-nav via pills works; "Don't show again" label contradicts "? Help" button; two dead-end placeholder steps |
| H4 | Consistency and standards | 🟡 Minor | Brand unified (GAP-251); dual `setupEventListeners` without guard; "Download" vs "File Review" naming split; US/UK spelling mixed |
| H5 | Error prevention | 🟢 Good | Wizard gates, phase enforcement, layout auto-confirm (GAP-249), `confirmDialog`, session conflict detection all present |
| H6 | Recognition rather than recall | 🟡 Minor | Contextual tab bar good; 10 Customise sub-tabs have no completion indicators; Master CV tab disappears after Job stage |
| H7 | Flexibility and efficiency | 🟡 Minor | No keyboard shortcuts for primary actions; no Shift+Enter for multi-line chat; cover letter locked behind full workflow |
| H8 | Aesthetic and minimalist | 🟠 Major | Triple navigation (12 workflow pills + 10 sub-tabs + 8 action buttons simultaneously); fixed 40% chat column |
| H9 | Error recognition/recovery | 🟠 Major | 9+ error paths in `layout-instruction.js` dump raw `error.message` to chat with no recovery action |
| H10 | Help and documentation | 🟡 Minor | GAP-247 "? Help" button adequate for re-access; no contextual help mid-workflow; no command reference |

### Top 5 UX Issues by Impact

1. **Triple navigation orientation confusion** — 12 workflow pills + 10 Customise sub-tabs + 8 position-bar action buttons simultaneously visible with no clear hierarchy (`ui-core.js:350–363`).

2. **Two unimplemented placeholder workflow steps** — Steps visible in the pill bar that are dead ends (no content or action when clicked); users reach them after generation and find nothing actionable.

3. **Error messages without recovery guidance** — 9+ error paths in `layout-instruction.js` catch blocks and `_handleApiError` append raw `error.message` strings to the chat without a recovery suggestion or retry button.

4. **LLM configuration entry point invisible to new users** — The LLM status pill and model selector are in the header but the "⚠ Not ready" state has no inline CTA, no tooltip explaining what "Not ready" means, and no link to Settings.

5. **10 Customise sub-tabs with no completion visibility** — Users cannot tell which of the 10 tabs they have reviewed. No completion indicator, progress badge, or "all done" signal exists on any sub-tab (`ui-core.js:350–363`).

---

## Newly Confirmed Issues (Cycle 14)

### Accessibility

- **GAP-A9 (new → GAP-258):** Decorative `●` dots in ATS grade legend (`ats-modals.js:204–207`) lack `aria-hidden="true"` — screen readers announce them as bullet characters.
- **GAP-A10 (new → GAP-259):** `#finalise-notes-counter` div has no `aria-live="polite"` — character count changes are not announced to screen readers.

### UX Consistency

- **GAP-260 (new):** "Download" workflow step pill and "File Review" tab inside Finalise stage refer to the same step with different names — dual naming causes disorientation.
- **GAP-261 (new):** US/UK spelling inconsistency throughout UI — "Analyze"/"Analyse" and "Customize"/"Customise" used interchangeably across pill labels, tab names, and button text.
- **GAP-268 (new):** "Don't show again" checkbox in the welcome modal contradicts the "? Help" button — once checked, the checkbox label becomes misleading.

### Error Recovery

- **GAP-262 (new):** Error catch blocks in `layout-instruction.js` (~9+ locations) append raw `error.message` to chat with no recovery action or retry button.

### Workflow Completeness

- **GAP-263 (new):** Two placeholder workflow steps (visible in pill bar, discoverable by users) have no content or action on click — dead ends.
- **GAP-269 (new):** 10 Customise sub-tabs have no completion indicators — users cannot see which tabs they have reviewed.

### Trust/Compliance

- **GAP-264 (new):** CSS confidence badge classes only cover `confidence-high`, `confidence-medium`, `confidence-low` but LLM outputs a 5-point scale including "Very High" and "Very Low" — those labels render unstyled.
- **GAP-265 (new):** `rewrite_audit` is persisted in `session.json` and used for cold-restore but is never surfaced as an inspectable log in the UI.

### Generated Materials Quality

- **GAP-266 (new):** No minimum 2-bullets-per-job-entry enforcement — a job entry can appear in the CV with only 1 bullet (or 0 if all are deselected).
- **GAP-267 (new):** No bullet line-length check (≤2 lines target) — excessively long bullets are not flagged.
- **GAP-270 (new):** CDN font dependency — generated DOCX/PDF uses fonts loaded from Google Fonts CDN at WeasyPrint render time; no bundled local fallback for offline or container-isolated deployments.

---

## Persona Reviews

### Applicant (US-A1–A12)

#### 88 Pass / 24 Partial / 0 Fail / 0 Not Implemented

- ✅ All 6 cycle-14 fixes confirmed
- ✅ Core workflow (job input, analysis, customise, rewrite, generation, download) substantially passes
- ⚠️ US-A1: Intake confirmation (company/role/date) has full API support but no UI step before analysis begins → GAP-252
- ⚠️ US-A2: Prior clarification answers not pre-populated in questions tab → GAP-253
- ⚠️ US-A7: Cover letter saves DOCX only; no PDF path found → GAP-231
- ⚠️ US-A8: Screening word-count guidance not confirmed as visible UI labels; format/experience choices not persisted between tab interactions
- ⚠️ US-A12: Re-run button dimmed at rest; no keyboard shortcut beyond Tab-accessible focus

### UX Expert (US-U1–U9)

#### 35 Pass / 10 Partial / 0 Fail / 3 Not Implemented

- ✅ All 6 cycle-14 fixes confirmed
- ✅ US-U7 accessibility — strong pass, best story
- ⚠️ US-U2: Extracted fields (company, role, date) not inline-editable before analysis
- ⚠️ US-U3: Clarifying questions all-at-once (not ≤3 per screen) → GAP-201
- ⚠️ US-U4: Bullet expansion navigates to separate tab rather than expanding in-place
- ⚠️ US-U6: Final generation has no step-labelled progress checklist; no in-browser preview; no version list
- 🔲 US-U8: No collapsible column configuration for review tables; no skeleton screens

### Resume Expert (US-R*)

No new findings beyond cycle 13. Prior status confirmed accurate and complete.

- ✅ GAP-225 (hybrid sort) confirmed at `cv_orchestrator.py:3163`
- ✅ Custom spell-check dictionary seeded from master data
- ⚠️ No post-generation summary validation
- ⚠️ Severity sorting absent from spell results

### Hiring Manager (US-M*)

#### 18 Pass / 11 Partial / 0 Fail / 7 Not Implemented

- ✅ GAP-218 confirmed: `_allowed = {'Publications', 'Selected Publications'}` at `cv_orchestrator.py:4880`
- ✅ Page-break-inside on job entries, skills grouping/deduplication, relevance-ordered bullets, action-verb warnings, publication heading logic
- ⚠️ Summary role-specificity: no post-generation gate
- ⚠️ CDN font dependency → GAP-270
- 🔲 Min 2 bullets per job → GAP-266
- 🔲 Bullet line-length check → GAP-267
- 🔲 Automated PDF visual QC; page-1 whitespace balance; skills section size cap

### Persuasion Expert (US-P*)

#### 12 Pass / 8 Partial / 0 Fail / 4 Not Implemented

- ✅ `apply_rewrite_constraints()` numeric-metric guard, 7 persuasion quality checks, role-differentiated CL word count, assertive CTA
- ⚠️ "Opens with I" check warns but does not block saving
- ⚠️ Institution placement uses hardcoded brand list, not candidate's actual employers
- 🔲 Narrative thread detection; positive-sum framing enforcement; screening vs CV terminology harmonisation; proactive CAR construction

### HR/ATS Specialist (US-H*)

#### US-H2 upgraded to Pass (spec + implementation aligned)

- ✅ GAP-218 fully closed — spec table and validator now both accept "Selected Publications"
- ⚠️ No skill_type UI write path → GAP-215
- ⚠️ Keyword label vocabulary mismatch (Exact/Partial vs Matched/Bonus) → GAP-H7
- ⚠️ Hyphen/slash keyword variant normalization absent

### Accessibility Specialist (US-X*)

#### ~14 Pass / ~3 Partial / 0 Fail

- ✅ GAP-219 confirmed: `ats-modals.js:233–270` full 4-call focus management verified
- ✅ "? Help" button confirmed at `index.html:63–66` with aria-label
- ✅ ATS grade legend confirmed at `ats-modals.js:204–207`
- ⚠️ New: decorative `●` dots in grade legend lack `aria-hidden="true"` → GAP-258
- ⚠️ New: `#finalise-notes-counter` has no `aria-live="polite"` → GAP-259

### First-Time User (US-F*)

#### 4 Pass / 9 Partial / 2 Fail

- ✅ GAP-247 confirmed: `showWelcomeModal()` at `session-manager.js:219` bypasses "don't show again" flag
- ✅ GAP-251 confirmed: "CV Builder" in `<title>:13`, `<h1>:40`, onboarding modal `h2:322`
- ❌ Generation pipeline transitions (Generate→Layout→Confirm→Files) have no inline explanatory text
- ❌ Preview iframe gives no visual indication it is a draft/intermediate artifact

### Returning User (US-S*)

#### 7 Pass / 2 Partial / 0 Fail — No regressions

- ✅ Session restore, decision persistence, downstream context, freshness chip all working
- ⚠️ ↻ re-run vs step-click distinction hover-only (invisible on touch/keyboard)

### Power User (US-W*)

#### 7 Pass / 2 Partial / 0 Fail (Power User) — No regressions

- ✅ Reduced-motion, bulk operations, session switching all pass
- ⚠️ No keyboard shortcut for primary action buttons (W1.1)
- ⚠️ No changed-item count after re-run (W3.3)

### Recruiter Ops (US-O*)

#### 8 Pass / 3 Partial / 1 Fail

- ✅ GAP-235 confirmed: `_restoreFinaliseMeta()` at `finalise.js:129–147` pre-populates status + notes
- ✅ GAP-236 confirmed: `maxlength="2000"` at `finalise.js:103`; counter with amber/red thresholds
- ❌ Notes not editable post-archive (no notes textarea in sessions modal) → GAP-210
- ⚠️ Preview files not annotated as such in file list → GAP-237
- ⚠️ "Download" pill vs "File Review" tab naming split → GAP-260

### Master CV Curator (US-M*)

#### ~8 Pass / ~4 Partial / 0 Fail — Lint cleanup only, no new findings

### Trust/Compliance (US-C*)

#### ~8 Pass / ~4 Partial / 1 Fail

- ✅ Word-level LCS diff, `candidate_to_confirm` gate, `rewrite_audit` cold-restore all solid
- ❌ `rewrite_audit` never surfaced as an inspectable in-UI log → GAP-265
- ⚠️ CSS confidence badge only covers 3 levels; LLM uses 5-point scale → GAP-264
- ⚠️ Customisation stage items without explicit decisions use AI defaults silently

### Graphical Designer (US-G*)

#### 6 Pass / 6 Partial / 0 Fail

- ✅ Brand name unified across all surfaces (cycle-14 fix confirmed)
- ✅ ATS grade legend adds colour-coded context
- ⚠️ Zero CSS custom properties (97 hardcoded hex values)
- ⚠️ No responsive breakpoint on main two-panel layout

---

## New Gaps Added This Cycle (GAP-258 through GAP-270)

| GAP | Priority | Description |
| --- | --- | --- |
| GAP-258 | LOW | Decorative `●` dots in ATS grade legend lack `aria-hidden="true"` |
| GAP-259 | LOW | `#finalise-notes-counter` has no `aria-live="polite"` |
| GAP-260 | MED | "Download" step pill and "File Review" tab refer to same step — dual naming |
| GAP-261 | LOW | US/UK spelling mixed — "Analyze"/"Analyse" and "Customize"/"Customise" inconsistent |
| GAP-262 | MED | 9+ error catch blocks in `layout-instruction.js` dump raw `error.message` to chat with no recovery action |
| GAP-263 | MED | Two placeholder workflow steps visible in pill bar are dead ends with no content |
| GAP-264 | LOW | CSS confidence badges only cover 3 levels; LLM emits 5-point scale (no "Very High"/"Very Low" styling) |
| GAP-265 | MED | `rewrite_audit` persisted in session.json but never surfaced as inspectable in-UI log |
| GAP-266 | MED | No minimum 2-bullets-per-job enforcement — job entries can appear with 0–1 bullets |
| GAP-267 | LOW | No bullet line-length check (≤2 lines target) — excessively long bullets not flagged |
| GAP-268 | LOW | "Don't show again" checkbox label contradicts the "? Help" button once checked |
| GAP-269 | MED | 10 Customise sub-tabs have no completion indicators — users cannot see what they have reviewed |
| GAP-270 | MED | CDN font dependency — DOCX/PDF uses Google Fonts CDN at render time; no bundled local fallback |

---

## Recommended Priority Order for Cycle 15

1. **GAP-258 + GAP-259** — Fix `aria-hidden` on grade legend dots and add `aria-live` to counter (2-line fixes, immediate)
2. **GAP-262** — Add recovery actions to error paths in `layout-instruction.js` (H9 Major)
3. **GAP-252** — Wire intake confirmation UI step (existing HIGH, most impactful unconnected feature)
4. **GAP-263** — Address placeholder workflow steps (dead ends that waste H10 capital)
5. **GAP-269** — Add completion indicators to Customise sub-tabs
6. **GAP-260 + GAP-261** — Fix "Download"/"File Review" naming and standardise US/UK spelling
7. **GAP-206** — Phase-lock indicator on Master CV tab (existing HIGH)
8. **GAP-213** — Publications absent from ATS DOCX (existing HIGH)
9. **GAP-265** — Surface rewrite_audit as in-UI audit log
10. **GAP-266** — Enforce minimum 2 bullets per job entry
