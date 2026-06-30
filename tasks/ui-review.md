<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Cycle 13

**Date:** 2026-06-30
**Branch:** `feature/multi-user-deployment`
**Commit baseline:** `2990e3a` (cycle 12 fixes)
**Personas reviewed:** 14 persona sub-agents + 1 heuristic sub-agent (15 total)
**New gaps added this cycle:** GAP-234 through GAP-257 (24 new entries)

---

## Executive Summary

### Cycle 12 Fixes Confirmed Working

All 3 cycle-12 fixes were independently verified by multiple sub-agents reading source files:

| Fix | GAP | Confirmed by |
| --- | --- | --- |
| ATS validator accepts "Selected Publications" — `cv_orchestrator.py:4880` | GAP-218 | Hiring Manager, HR/ATS, UX Expert |
| `openJobAnalysisModal()` full focus management — `ats-modals.js:228–266` | GAP-219 | Accessibility, Heuristic, UX Expert |
| Hybrid relevance+recency experience sort — `cv_orchestrator.py:3163` | GAP-225 | Resume Expert, UX Expert |

Additionally confirmed: `user-story-hr-ats.md:77` spec table is now **stale** — it still lists "Selected Publications" as rejected. The spec should be updated to match the fix.

---

## Status Summary by Persona

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| --- | --- | --- | --- | --- |
| Applicant (US-A1–A12) | 79 | 15 | 2 | 4 |
| UX Expert (US-U1–U9) | 28 | 13 | 1 | 3 |
| Resume Expert (US-R*) | ~15 | ~10 | 0 | 0 |
| Hiring Manager (US-M*) | 30 | 12 | 0 | 0 |
| Persuasion Expert (US-P*) | 13 | 5 | 2 | 3 |
| HR/ATS (US-H*) | 1 | 7 | 0 | 0 |
| Accessibility (US-X*) | ~14 | ~2 | 0 | 0 |
| First-Time User (US-F*) | 4 | 9 | 2 | 0 |
| Returning User (US-S*) | 7 | 2 | 0 | 0 |
| Power User (US-W*) | 7 | 2 | 0 | 0 |
| Recruiter Ops (US-O*) | 6 | 3 | 3 | 0 |
| Master CV Curator (US-M*) | 8 | 4 | 1 | 0 |
| Trust/Compliance (US-C*) | ~8 | ~3 | 1 | 0 |
| Graphical Designer (US-G*) | 6 | 6 | 0 | 0 |
| **Heuristic** | H5🟢 | H1🟡H3🟡H6🟡H7🟡H9🟡 | H2🟠H4🟠H8🟠 | H10🔴 |

---

## Top Acceptance-Criteria Gaps

### Critical/High Priority

1. **GAP-247 (HIGH NEW):** No way to reopen the welcome/help modal after dismissal — `index.html:317–399`. Once dismissed, users have no in-app help path. H10 Critical.

2. **GAP-252 (HIGH NEW):** Intake confirmation UI not connected — `GET /api/intake-metadata` and `POST /api/confirm-intake` exist in `web_app.py` but no frontend step presents extracted company/role/date for user confirmation before analysis proceeds.

3. **GAP-234 (HIGH NEW):** Relevance score in review tables has no "/100" label or grade legend — `ats-modals.js:50–58`. Raw numbers (e.g., "73") are uninterpretable without domain knowledge.

4. **GAP-235 (HIGH NEW):** Finalise tab notes not pre-populated on re-open — `finalise.js:42–52`. Re-opening the Finalise tab shows default values ("Ready to send", empty textarea) rather than previously saved content. No fetch of `metadata.json` on tab load.

5. **GAP-206 (HIGH existing):** No phase-lock indicator on Master CV tab — edit buttons visible and clickable during mid-workflow phases but all writes return 409. Users only see a generic error toast.

6. **GAP-213 (HIGH existing):** Publications section absent from ATS DOCX — only certifications/awards in `_add_ats_additional_sections`. Publication keywords excluded from ATS scanning.

7. **GAP-215 (HIGH existing):** Skill type UI override absent — `skills-review.js:667–671` shows display-only badge with no write path back to Master_CV_Data.

8. **GAP-231 (MED existing):** Cover letter PDF not generated — `POST /api/cover-letter/save` writes DOCX only.

### Confirmed Still Open from Prior Cycles

- **GAP-14:** Workflow progress indicator — no phase visualization
- **GAP-91:** Backup/restore UI absent — API exists, no frontend
- **GAP-201:** Clarifying questions shown all at once — story requires ≤3 per screen
- **GAP-210:** Notes not editable post-archive in session switcher
- **GAP-228:** No in-browser preview of final generated CV

---

## Heuristic Evaluation Summary

### Nielsen's 10 Heuristics

| # | Heuristic | Rating | Key Finding |
| --- | --- | --- | --- |
| H1 | Visibility of system status | 🟡 Minor | LLM busy overlay good; dormant `#llm-status-bar` duplicates the overlay (`index.html:171–174`) |
| H2 | Match between real world | 🟠 Major | 12 steps visible simultaneously; "Harvest", "LLM:" label are domain jargon without definition |
| H3 | User control and freedom | 🟡 Minor | `closeAllModals()` may dismiss stacked dialogs; no undo for session delete; `dismissDisabled` guard opaque |
| H4 | Consistency and standards | 🟠 Major | Three divergent modal focus-management patterns co-exist (`ui-core.js:31`, `ats-modals.js:108`, `ats-modals.js:228`) |
| H5 | Error prevention | 🟡 Minor | Confirm dialogs good; silent auto-analyze fires without user confirmation (`app.js:88–95`) |
| H6 | Recognition rather than recall | 🟡 Minor | Action buttons hidden with no placeholder explaining prerequisites; chat placeholder is only command hint |
| H7 | Flexibility and efficiency | 🟡 Minor | Keyboard tab nav implemented; no shortcut for primary action buttons |
| H8 | Aesthetic and minimalist | 🟠 Major | Three simultaneous nav layers (step bar + tab bar + position bar); 23 tab DOM elements always present |
| H9 | Error recognition/recovery | 🟡 Minor | `appendRetryMessage` good; ATS report and tab-content errors offer no recovery action |
| H10 | Help and documentation | 🔴 Critical | No in-app help system; welcome modal cannot be reopened after dismiss; no command reference |

### Top 5 UX Issues by Impact

1. **Triple navigation layer disorientation** — 12-step pill bar + 23-tab bar + position-bar action buttons are three simultaneous navigation layers. Same content reachable via two paths with no visible hierarchy (`ui-core.js:350–363`).

2. **No persistent help or command reference** — Once the welcome modal is dismissed there is no way to access help (`index.html:317–399`). Chat placeholder is the only command hint. Users stuck mid-workflow have no recovery path.

3. **Three divergent modal focus patterns** — `restoreFocus()` (`ui-core.js:336–347`) only restores the global `_focusedElementBeforeModal`. The ATS Report and Job Analysis modals use their own per-modal variables; `restoreFocus()` will restore the wrong element if those modals are opened.

4. **12-step nav with jargon labels overwhelms** — "Harvest", "Interview Prep", "Thank You" are post-generation phases with no current affordance, yet visible from first load. "Harvest" has no in-UI definition at the point of encounter.

5. **Silent auto-analyze** — On page load, if a job description exists but no analysis, `analyzeJob()` fires automatically (`app.js:88–95`) without user interaction. Returning users who intentionally left a description unanalyzed are surprised.

### Additional UX Dimensions

| Dimension | Rating | Key Finding |
| --- | --- | --- |
| Cognitive load | 🟠 High | 12 pills + 23-tab bar + position bar + chat simultaneously |
| Visual hierarchy | 🟡 Minor | Status pill inline styles; "LLM:" label competes with session controls |
| Information architecture | 🟠 Major | Step→tab hierarchy unlabeled; same stage reachable via two paths |
| Workflow momentum | 🟢 Good | Progressive action buttons; LLM busy overlay with timer |
| Feedback loops | 🟢 Good | LLM busy overlay; toast container; session conflict detection |
| Error recovery | 🟡 Minor | ATS/tab-content errors offer no recovery action |
| Affordance clarity | 🟡 Minor | Locked steps have no lock icon or tooltip explaining why |
| Terminology clarity | 🟠 Major | "Harvest", "ATS", "LLM:", "Customise", "Package Application Files" all jargon-heavy |

---

## Persona Reviews

### Applicant (US-A1–A12)

#### 79 Pass / 15 Partial / 2 Fail / 4 Not Implemented

- ✅ Core workflow solid: job input, analysis, rewrite review, download all substantially pass
- ❌ Cover letter PDF not generated — `POST /api/cover-letter/save` writes DOCX only → GAP-231
- ❌ Re-run keyboard shortcut missing — ↻ buttons keyboard-focusable but no shortcut → GAP (carry-over)
- ⚠️ Intake confirmation UI not connected → GAP-252
- ⚠️ Prior clarification answers not pre-populated → GAP-253
- **Terminology:** "CV Customizer" (header) vs "CV Builder" (onboarding) → GAP-251; "Download" vs "File Review" for same step; "Package Application Files" opaque; "🌾 Harvest" unclear

### UX Expert (US-U1–U9)

#### 28 Pass / 13 Partial / 1 Fail / 3 Not Implemented

- ✅ All 3 cycle-12 fixes confirmed
- ✅ US-U7 accessibility — full pass (strongest story)
- ❌ US-U4.6: Relevance score unlabelled → GAP-234
- ⚠️ US-U3.4: Questions all at once → GAP-201
- ⚠️ US-U9.6: Two-step layout confirm flow redundant → GAP-249
- 🔲 US-U8.2/8.5: No table column collapsing; no scroll optimization

### Resume Expert (US-R*)

#### ~15 Pass / ~10 Partial / 0 Fail

- ✅ GAP-225 (hybrid sort) CONFIRMED: `cv_orchestrator.py:3163` uses `(-score, -date_ordinal)`
- ✅ `candidate_to_confirm` gate, `rewrite_audit`, `apply_rewrite_constraints` all solid
- ✅ Publication ranking LLM-based with per-item scores (`llm_client.py:1599–1704`)
- ⚠️ Summary post-generation validation absent; length target mismatch → GAP-242
- ⚠️ Achievement selection no diversity constraint → GAP-243
- ⚠️ No proactive page-length warning during customisation → GAP-245
- ⚠️ ATS keyword list not deduplicated before display → GAP-246

### Hiring Manager (US-M*)

#### 30 Pass / 12 Partial / 0 Fail

- ✅ GAP-218 CONFIRMED RESOLVED: `_allowed = {'Publications', 'Selected Publications'}` at `cv_orchestrator.py:4880`
- ✅ Typography, page-break, sidebar clone all pass; cover letter CTA and word count pass
- ⚠️ No min-bullets-per-job check; no max bullet length enforcement
- ⚠️ CDN fonts with no bundled local fallback

### Persuasion Expert (US-P*)

#### 13 Pass / 5 Partial / 2 Fail / 3 Not Implemented

- ✅ All 4 bullet rhetorical checks operational; `apply_rewrite_constraints()` solid
- ❌ Cover letter has no post-generation validation code (only prompt instructions) — GAP-222/GAP-223/GAP-224 still open
- ❌ Positive-sum metric framing absent — no `check_metric_framing()` function
- 🔲 Cross-document consistency architecturally absent → GAP-256

### HR/ATS Specialist (US-H*)

#### 1 Pass / 7 Partial / 0 Fail

- ✅ GAP-218 CONFIRMED RESOLVED
- ⚠️ `user-story-hr-ats.md:77` spec table is stale — still lists "Selected Publications" as rejected
- ⚠️ Hyphen/slash keyword variant normalization absent (`scoring.py:450`)
- ⚠️ GAP-215 confirmed open: skill_type override write path absent
- ⚠️ ATS keyword label vocabulary mismatch vs. spec (`ats-modals.js:50–58`)

### Accessibility Specialist (US-X*)

#### ~14 Pass / ~2 Partial / 0 Fail

- ✅ GAP-219 FULLY CONFIRMED: all 4 elements present in `ats-modals.js:228–266`
- ✅ US-X2 upgraded to 4P/0⚠️ (was 1P/3⚠️ before cycle 12)
- ⚠️ GAP-A6 NEW: experience/skill `icon-btn` active state not reflected via `aria-pressed` → GAP-240
- ⚠️ GAP-A7 NEW: no `@media (prefers-contrast: more)` adaptation → GAP-241
- (GAP-200 = shared `_focusedElementBeforeModal` clobbered by nested modals — confirmed still open)

### First-Time User (US-F*)

#### 4 Pass / 9 Partial / 2 Fail

- ✅ Welcome modal adapts to 3 states; job empty state immediately actionable
- ❌ Layout Review iframe gives no indication it is a draft — users treat it as final output
- ❌ Generation pipeline transitions unexplained — no inline text at any step
- ⚠️ 12 workflow steps visible from first load; 10 tabs in Customise with no "start here"

### Returning User (US-S*)

#### 7 Pass / 2 Partial / 0 Fail

- ✅ No regressions; session restoration, downstream context, freshness chip all working
- ⚠️ ↻ re-run vs step-click distinction hover-only — invisible on touch/keyboard

### Power User (US-W*)

#### 7 Pass / 2 Partial / 0 Fail (Power User)

- ✅ Reduced-motion, bulk operations, session switching all pass
- ⚠️ No keyboard shortcut for primary action buttons
- ⚠️ No changed-item count in post-rerun message

### Recruiter Ops (US-O*)

#### 6 Pass / 3 Partial / 3 Fail

- ✅ File type distinction, status vocabulary, file naming all pass
- ❌ Notes not pre-populated on Finalise re-open → GAP-235
- ❌ Silent notes truncation at 2000 chars (`session_routes.py:647`) → GAP-236
- ❌ Notes not editable post-archive → GAP-210
- ⚠️ Preview HTML indistinguishable from final deliverables → GAP-237
- ⚠️ Dual-tab ambiguity: "Generated Files" vs "File Review" visible simultaneously → GAP-238

### Master CV Curator (US-M*)

#### 8 Pass / 4 Partial / 1 Fail

- ✅ Harvest diffs, LLM badges, Publications CRUD all solid
- ❌ Backup/restore API exists; no frontend UI → GAP-91
- ⚠️ No phase-lock indicator → GAP-206
- ⚠️ BibTeX import aggregate errors only → GAP-208

### Trust/Compliance (US-C*)

#### ~8 Pass / ~3 Partial / 1 Fail

- ✅ LCS diff, candidate_to_confirm gate, phase guards all solid
- ❌ `rewrite_audit` array never surfaced as in-UI audit log
- ⚠️ Cold-restore silently reapplies prior decisions
- ⚠️ Customization-stage items without decision silently use AI defaults

### Graphical Designer (US-G*)

#### 6 Pass / 6 Partial / 0 Fail

- ✅ Typography scale, status colour semantics, layout preview framing all pass
- ⚠️ Zero CSS custom properties (`var(--*)` count: 0); 97 hardcoded hex values → GAP-DESIGN-03
- ⚠️ Duplicate `@keyframes spin` at `styles.css:901` and `1445` → GAP-DESIGN-04
- ⚠️ Main two-panel layout has no responsive breakpoint → GAP-DESIGN-05
- ⚠️ Position-bar buttons use full inline styles instead of `.action-btn` → (carry-over)
- ⚠️ CV uses `"Segoe UI", Arial` — no typographic personality; header center vs body left-aligned

---

## New Gaps Added This Cycle (GAP-234 through GAP-257)

| GAP | Priority | Description |
| --- | --- | --- |
| GAP-234 | HIGH | Relevance score unlabelled — no "/100" or grade legend in review tables |
| GAP-235 | HIGH | Finalise notes not pre-populated on tab re-open |
| GAP-236 | MED | Notes silently truncated at 2000 chars — no maxlength or character counter |
| GAP-237 | MED | Preview HTML file indistinguishable from final deliverables in File Review |
| GAP-238 | MED | Dual-tab ambiguity — "Generated Files" and "File Review" visible simultaneously |
| GAP-239 | LOW | File generation timestamp absent when metadata.generation_date is null |
| GAP-240 | LOW | experience/skill `icon-btn` active state not reflected via `aria-pressed` |
| GAP-241 | LOW | No `@media (prefers-contrast: more)` adaptation |
| GAP-242 | MED | Summary post-generation validation absent; opening-line and length not checked |
| GAP-243 | MED | Achievement selection has no diversity-across-impact-types constraint |
| GAP-244 | LOW | Spell results not sorted by severity (spelling before stylistic) |
| GAP-245 | MED | No proactive page-length warning during customisation |
| GAP-246 | MED | ATS keyword list not deduplicated/synonym-grouped before display in Analysis tab |
| GAP-247 | HIGH | No help reopen trigger — welcome modal cannot be reopened after dismissal |
| GAP-248 | MED | Silent auto-analyze fires on page load without user confirmation |
| GAP-249 | MED | Two-step layout confirm flow redundant when no layout changes made |
| GAP-250 | LOW | Back-navigation to completed step triggers silently without confirmation dialog |
| GAP-251 | MED | Brand inconsistency — "CV Customizer" in header vs "CV Builder" in onboarding |
| GAP-252 | HIGH | Intake confirmation UI not connected — API exists but no step presents extracted data |
| GAP-253 | MED | Prior clarification answers not pre-populated — API exists but never called |
| GAP-254 | LOW | Analysis prompt lacks keyword-frequency/title-position weighting instruction |
| GAP-255 | LOW | No post-LLM check that introduced keywords appear mid-sentence vs appended |
| GAP-256 | MED | No cross-document terminology consistency (CV vs cover letter vs screening answers) |
| GAP-257 | LOW | No acronym-expansion-on-first-use enforcement across generated documents |

---

## Recommended Priority Order for Cycle 14

1. **GAP-247** — Add "Show Help" / "Reopen Onboarding" button (H10 Critical fix — 1 button + modal show)
2. **GAP-235** — Pre-populate Finalise notes on tab re-open (fetch metadata.json on load)
3. **GAP-234** — Label relevance scores with "/100" and add grade legend
4. **GAP-252** — Wire intake confirmation step to the existing API
5. **GAP-206** — Phase-lock indicator on Master CV tab (existing HIGH)
6. **GAP-213** — Add publications to ATS DOCX (existing HIGH)
7. **GAP-236** — Add textarea maxlength + character counter (prevents silent truncation)
8. **GAP-237/238** — Distinguish preview from final files; resolve dual-tab ambiguity
9. **GAP-251** — Fix "CV Customizer" vs "CV Builder" inconsistency (1-line change)
10. **GAP-249** — Allow proceeding directly from Layout Review without redundant confirm click
