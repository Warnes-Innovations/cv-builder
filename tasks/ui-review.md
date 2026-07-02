<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Cycle 29

**Date:** 2026-07-01
**Branch:** `feature/multi-user-deployment`
**Commit baseline:** `5aedf24` (code-review fixes — empty-string guard + template path constant)
**Personas reviewed:** 14 persona sub-agents + 1 heuristic sub-agent (15 total)
**New gaps added this cycle:** GAP-271 through GAP-295 (25 new entries)

---

## Executive Summary

### Cycle 27–28 Fixes Confirmed Working

| Fix | GAP | Confirmed by |
| --- | --- | --- |
| Repeated-verb detection added to `check_persuasion()` | GAP-17 (PARTIAL advance) | Persuasion Expert |
| Intake confirmation card source-verified as implemented | GAP-23 RESOLVED | Applicant |
| Fallback HTML uses Jinja2 template matching primary path | GAP-132 RESOLVED | Resume Expert, Graphical Designer |
| `:root {}` CSS design tokens block (8 tokens) | GAP-133 (PARTIAL) | Graphical Designer |
| Template path extracted to class constants `_CV_TEMPLATE_FILE` | code-review fix | Resume Expert |
| Empty-string guard `if not html_content:` | code-review fix | Resume Expert |

### Overall Cycle 29 Verdict

The core end-to-end workflow is solid and well-tested (1427 Python tests passing, 1 skipped). The primary remaining friction points are:

1. **Five overlapping navigation layers** (header pills, position bar, 12-step nav, tab bar, action buttons) causing cognitive overload on first load
2. **Dual nav systems** (workflow step pills vs. tab bar) with no visible relationship explained to users
3. **WCAG accessibility violations** (focus outline removed at `styles.css:1651`, missing `aria-label` on spell-check buttons, focus stack bug in ATS modals)
4. **Terminology inconsistency** (British/American English mixed; developer-centric labels: "LLM", "Temperature", "ATS DOCX", "list_models", "fallback_static")
5. **Post-archive notes not wired** to sessions modal (PATCH endpoint exists in backend but no frontend field)

---

## Status Summary by Persona

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | Key Findings |
| --- | --- | --- | --- | --- | --- |
| Applicant (US-A1–A12) | ~18 | ~8 | 7 | 0 | "queued" status missing; prior-session clarifications not pre-populated; skill inter-category move absent; re-run keyboard shortcut missing |
| UX Expert (US-U1–U9) | 21 | 16 | 1 | 3 | Back-nav warning absent on step click; questions all-at-once; responsive overflow; focus outline removed |
| Resume Expert (US-R*) | ~14 | 4 | 0 | 2 | Publication ranked shortlist absent; summary line-count not validated; pub journal names not spell-seeded |
| Hiring Manager (US-M*) | 20 | 9 | 0 | 4 | Min-bullet-count NI; bullet line-length NI; CDN font dependency partial; venue-less pubs silent |
| Persuasion Expert (US-P*) | ~10 | 4 | 0 | ~2 | No narrative-thread counter; pub omission rationale absent; cover letter word count overshoot |
| HR/ATS (US-H*) | 15 | 5 | 5 | 0 | US Letter/font-embed not checked; download not blocked on fail; skill_type not harvested back |
| Accessibility (US-X*) | 11 | 3 | 1 | 0 | Focus outline removed (WCAG AA); spell-check aria-label missing; ATS modal focus stack bug |
| First-Time User (US-F*) | 3 | 3 | 0 | 0 | Unexplained terms on first load; 10-tab Customise overload; optional/required post-gen distinction |
| Returning User (US-S*) | 7 | 2 | 0 | 0 | rerun affordance hover-only; no inline "Outdated" watermark in Rewrites/SpellCheck tabs |
| Power User (US-W*) | 8 | 1 | 0 | 0 | No session text-search; changed-item count absent from re-run message; no bulk-decision undo |
| Recruiter Ops (US-O*) | 7 | 2 | 1 | 0 | Post-archive notes not editable in sessions modal |
| Master CV Curator (US-MC*) | 4 | 1 | 0 | 0 | Stale "Finalise tab" label; 409 error text mismatches UI terminology |
| Trust/Compliance (US-C*) | 6 | 3 | 0 | 0 | Cold-restore silent; rewrite_audit invisible post-stage; customization soft gate only |
| Graphical Designer (US-G*) | 6 | 6 | 0 | 0 | Token coverage still partial; duplicate @keyframes; no responsive breakpoint; CV header alignment |
| **Heuristic** | H7🟢 | H1🟡H3🟡H5🟡H9🟡H10🟡 | H2🟠H4🟠H6🟠H8🟠 | — | Top critical: 5-layer nav overload; dual nav; button/content spatial mismatch |

---

## Heuristic Evaluation Summary

### Nielsen's 10 Heuristics

| # | Heuristic | Rating | Key Evidence |
|---|-----------|--------|-------------|
| H1 | Visibility of System Status | 🟡 Minor | `#llm-status-pill` 8-state system is good; defaults to `⚠ Not ready` with no CTA to fix it |
| H2 | Match Between System and Real World | 🟠 Major | "Harvest", "Temperature", "ATS DOCX", "LLM", "list_models", "fallback_static" are developer-centric; British/American English mixed |
| H3 | User Control and Freedom | 🟡 Minor | Stop button + session conflict options work; `window.confirm` fallback coexists with `confirmDialog` |
| H4 | Consistency and Standards | 🟠 Major | British/American English mixing pervasive; two confirm-dialog implementations; CTA buttons inconsistently use arrows |
| H5 | Error Prevention | 🟡 Minor | Pre-rewrite gate exists; LLM busy overlay prevents double-submit; empty profile doesn't block session start |
| H6 | Recognition Rather Than Recall | 🟠 Major | 23 tabs visible simultaneously before filtering; tab labels ("Ach-editor", "Goals") don't convey action or state |
| H7 | Flexibility and Efficiency | 🟢 Good | Keyboard shortcuts (Ctrl+Enter, A/R/arrows); recent models list; session recents strip; auto-save |
| H8 | Aesthetic and Minimalist Design | 🟠 Major | 5 header pill buttons, 6 position-bar controls, 12 step pills, 23 tabs — all visible simultaneously |
| H9 | Help Users Recognize / Recover from Errors | 🟡 Minor | Raw `❌ Model switch failed: ${msg}` messages lack next-step guidance |
| H10 | Help and Documentation | 🟡 Minor | Help modal is context-free — same welcome modal regardless of where user is stuck |

### Top 5 UX Issues

| Rank | Severity | Issue | Evidence |
|------|----------|-------|----------|
| 1 | 🔴 Critical | **Five simultaneous navigation layers** cause cognitive overload on first load | index.html:44–70 (header), 75–111 (position bar), 122–148 (workflow nav), 206–234 (tabs), 183–199 (action buttons) |
| 2 | 🔴 Critical | **Dual navigation systems** (12-step workflow bar vs. tab bar) have no visible relationship; `STAGE_TABS` mapping is internal-only | ui-core.js:349–362 vs index.html:122–148 and 206–234 |
| 3 | 🟠 Major | **Generation pipeline requires 4 sequential clicks in different UI locations** with no connecting explanation | index.html:194–198; app.js:152–155 |
| 4 | 🟠 Major | **Action buttons in left chat panel; content in right viewer panel** — when chat collapses, CTAs disappear with no fallback | index.html:157, 183–199 |
| 5 | 🟠 Major | **LLM status defaults to `⚠ Not ready`** with no affordance to configure | index.html:56–58; ui-core.js:760–800 |

### Terminology Labeling: Critical Issues

| Label | Location | Issue |
|-------|----------|-------|
| `"Harvest"` | index.html:146 | Agricultural metaphor; users won't know this writes back to Master CV |
| `"Temperature"` | index.html:610 | LLM parameter, not a user concept; should be in Advanced section |
| `"LLM"` / `"LLM Configuration Wizard"` | index.html:53, 425 | Technical acronym; should be "AI Model" / "AI Provider Setup" |
| `"ATS DOCX"` / `"Human PDF"` | index.html:642–645 | Format-system distinction invisible to users; needs plain-language labels |
| `"list_models"` / `"fallback_static"` | ui-core.js:1554–1558 | Internal API source labels exposed in model table |
| `"Customise"` (British) vs. `"Customizations"` (American) | index.html:128, STAGE_TABS | Mixed English standards throughout |
| `"Experiences"` vs. `"Experience Bullets"` (two sibling tabs) | index.html:212–213 | Nearly identical names; distinction invisible |
| `"Goals"` tab | index.html:210 | Refers to generation targets, not user career goals |
| `"Package Application Files"` | index.html:198 | Ambiguous — "Finalise" used elsewhere for same action |

---

## Persona Findings (Detail)

### Applicant (US-A1–A12)

**Pass highlights:** URL fetch with protected-site warnings; clarification questions with button choices; rewrite card diff + submit gate; HTML preview + JSON-LD; cover letter DOCX+PDF; Harvest opt-in; change badges on re-run.

**Confirmed gaps:**
- "queued" application status not in lifecycle — US-A1 ❌
- Prior-session clarification answers not pre-populated — US-A2 🔲
- Skill inter-category move absent in skills review UI — US-A3 🔲
- Layout-refine has no clarification loop for ambiguous instructions — US-A5b 🔲
- Total session time absent from finalise confirmation summary — US-A9 ❌
- Natural-language / document ingestion paths for master CV updates — US-A10 🔲
- Keyboard shortcut for re-run not in keyboard-shortcuts.js — US-A12 ❌

---

### UX Expert (US-U1–U9)

**Pass highlights:** Workflow step diff (active/completed/stale/forward-skip) with sr-only text; session restoration context; analysis result chunking with ranked keyword badges; rewrite diff + rationale; keyboard shortcuts for review cards; undo stack in layout review.

**Confirmed gaps:**
- Completed step click navigates silently without downstream-aware warning — US-U1 ⚠️ (only ↻ button triggers confirm; direct click does not)
- All post-analysis questions rendered simultaneously — US-U3 ❌ (story calls for ≤3 at a time)
- Relevance/confidence scores lack explicit scale — US-U4 ⚠️
- `styles.css:1651` removes `outline` on `.intake-field-row input:focus` with no replacement — US-U7 ❌ (WCAG 2.1 AA violation)
- 12-step workflow nav overflows horizontally at narrow widths (no media query) — US-U8 ⚠️
- Color-only rewrite card state — no text label "Accepted"/"Rejected" — US-U7 ⚠️

---

### Resume Expert (US-R*)

**Pass highlights:** Metric-preservation gate via `apply_rewrite_constraints()`; 10-check persuasion pipeline; relevance-primary bullet sort; synonym deduplication; full rewrite audit trail.

**Confirmed gaps:**
- Publication ranked shortlist with per-item relevance scores not shown before accept/reject — US-R2 ⚠️
- Summary line-count (4–6 lines) not validated; only word count (40–250) checked — US-R4 ⚠️
- Opening summary sentence structure (role type + years + differentiator) not validated — US-R4 ⚠️
- Publication author/journal names not seeded into custom spell dictionary — US-R7 minor

---

### Hiring Manager (US-M*)

**Score: 20 Pass / 9 Partial / 0 Fail / 4 Not Implemented**

**Pass highlights:** Bullet sort by keyword overlap; page-break-inside:avoid on job entries; page-count hard gate; skills deduplication + role-aware category order; cover letter tone differentiation.

**Not implemented:**
- Minimum 2 bullets per job entry enforcement (GAP-266 existing)
- Individual bullet rendered-line-count check (GAP-267 existing)
- Skills section rendered column-height enforcement
- PDF visual regression against reference screenshot
- Column-balance whitespace measurement

**Key partials:** Font Awesome + Google Fonts CDN-dependent (offline/headless risk); sidebar content-empty on pages 2+; venue-less publications silent in generated PDF/DOCX.

---

### Persuasion Expert (US-P*)

**Pass highlights:** Hard metric-preservation gate; 10 persuasion checks including new repeated_verb (cycle 27); publication ranking by LLM relevance; cover letter CTA enforcement; batch terminology consistency check.

**Medium gaps (new):**
- No runtime narrative-thread counter — "warns if >2 equally-weighted threads" unimplemented — US-P1
- Publication omission rationale not surfaced — low-ranked items disappear silently — US-P2
- Cover letter word count 300–400w standard (story specifies ≤300w) — US-P3
- No cross-document register consistency check across CV / cover letter / screening — US-P6

---

### HR/ATS (US-H1–H8)

**Pass highlights:** ATS DOCX no tables/shapes/headers; standard Heading 1 section labels; contact block format; weighted keyword scoring (2:1 hard/soft); 17-check post-gen validation; live score badge; hard/soft DOCX split.

**Confirmed fails:**
- PDF US Letter page size not verified programmatically — US-H1 ❌
- PDF font embedding not verified — US-H1 ❌
- Candidate name casing not validated (all-caps, lowercase) — US-H3 ❌
- ATS validation fail does NOT block download — US-H6 ❌
- `skill_type` classification not written back to `Master_CV_Data.json` via harvest — US-H8 ❌

**Partials:** LinkedIn URL may be shortened form (no https:// enforcement); year-only date only warns post-generation; bonus keywords show Matched badge per-row instead of distinct ★; `hasOccupation` uses `Role` not `Occupation` type.

---

### Accessibility Specialist (US-X*)

**Pass highlights:** Full WCAG 2.1 tab keyboard pattern; `_focusStack`/`trapFocus`/`restoreFocus` on all primary modals; `role="dialog" aria-modal="true" aria-labelledby`; `aria-pressed` on review buttons; `#workflow-stage-announcer` aria-live; `prefers-contrast: more` outlines; `prefers-reduced-motion` suppression.

**Confirmed gaps:**
- `styles.css:1651` removes `outline` on `.intake-field-row input:focus` with no visual replacement — WCAG 2.1 AA Level violation ❌
- Spell-check action buttons ("Apply", "Ignore", "Add to Dictionary") use `title` only — no `aria-label` ⚠️
- `openAtsReportModal()` and `openJobAnalysisModal()` call `trapFocus` without pushing to `_focusStack` — focus restored to wrong element on close ⚠️
- Settings modal + master-CV editor form inputs lack `aria-describedby` and `aria-invalid` ⚠️

---

### First-Time User (US-F*)

**Pass highlights:** Onboarding modal adapts to 3 states (missing profile / empty / ready); "? Help" button always accessible; Analyse Job button highlights when description loaded but unanalyzed.

**Confirmed gaps:**
- "Rewrites", "Customise", "Layout Review", "Harvest" appear on first load with no explanation — US-F1 ⚠️
- Customise stage exposes 10 tabs simultaneously with no recommended visit order or required/optional labels — US-F2 ⚠️
- "Generated Files" vs "File Review" tab distinction not communicated — US-F3 ⚠️
- Post-generation steps (Cover Letter through Harvest) have no "optional" label — US-F3 ⚠️
- ATS DOCX vs Human PDF distinction unexplained at download surface — US-F3 ⚠️

---

### Returning User (US-S*)

**Pass highlights:** `restoreBackendState()` comprehensive; downstream-awareness dialogs have distinct text for back-nav vs re-run; stale-step detection + `contentRevision` freshness model.

**Confirmed gaps:**
- ↻ rerun affordance on completed step pills is hover/focus-only — not persistently discoverable — ⚠️
- No inline "Outdated" watermark in Rewrites/SpellCheck content panels when step is stale; only the step pill turns amber — ⚠️

---

### Power User (US-W*)

**Pass highlights:** Keyboard shortcuts fully implemented (`keyboard-shortcuts.js`); session switcher with sortable table + status badges; 3 persistent session-identity signals; re-run clarification amend modal; change badges after re-run.

**Remaining gaps:**
- No text-search filter in sessions modal (scroll to find by company/role) — W2
- Changed-item count absent from assistant re-run message (per-item badges exist, no aggregate total) — W3
- No undo for bulk review-table actions (Exclude All) — W1

---

### Recruiter Ops (US-O*)

**Pass highlights:** `_collectDownloadableFiles()` builds typed deduplicated file list; 6 human-readable application status options; freeform notes textarea with character counter; file naming uses `{Company}_{Role}_{timestamp}` convention.

**Confirmed gaps:**
- Post-archive notes NOT editable from sessions modal — `PATCH /api/sessions/metadata` accepts `notes` but `session-switcher-ui.js` has no notes field — ❌
- Dual-tab ambiguity in Download stage — "Generated Files" and "File Review" roles unexplained to each other — ⚠️
- `cvData.metadata?.generation_date` can be absent, leaving download cards silent — ⚠️

---

### Master CV Curator (US-MC*)

**Pass highlights:** Phase-gated write access at both backend and UI; Harvest opt-in only; Import BibTeX modal with per-entry validation; Convert Text → BibTeX → review → import pipeline.

**Confirmed gaps:**
- Stale label: `web/master-cv.js:~285` says "The Harvest feature (Finalise tab)…" — should be "Harvest tab"
- 409 error message says "post-job finalise workflow" — mismatches visible UI term "Harvest step" / `refinement` phase
- Phase-lock banner not repeated within Publications section; curators scrolled down may miss it

---

### Trust / Compliance (US-C*)

**Pass highlights:** Word-level `<del>`/`<ins>` diff on all rewrite cards; explicit accept/edit/reject with `aria-pressed`; submit gate requires all cards decided AND persuasion warnings acknowledged; Harvest is fully opt-in; download tab cross-checks rewrite audit mismatches.

**Confirmed gaps:**
- `rewrite_audit` not surfaced post-stage — audit log disappears once user advances past Rewrites (GAP-265 existing)
- Rationale section silently absent when orchestrator doesn't populate `r.rationale`
- Customization stage has soft gate only (browser `confirm`); unreviewed AI recommendations apply silently
- Cold-restore of prior rewrite decisions fires without user notification
- "Non-confidential" badge only fires when `confidential: false`; undefined means no badge for most providers

---

### Graphical Designer (US-G*)

**Score: 6 Pass / 6 Partial (unchanged from cycle 28)**

GAP-133 advance: `:root {}` block with 8 tokens is a real improvement but status/semantic colors (`#10b981`, `#ef4444`, etc.) remain hardcoded; GAP-133 remains PARTIAL.

GAP-DESIGN-06 resolved: `cv-style.css` now uses `'Inter'` font and `#2980b9` brand color matching `cv-template.html`.

**Still-open gaps:**
- Emoji-dominant icon language; Font Awesome underused (GAP-DESIGN-01)
- Inline-style proliferation in JS-rendered HTML (GAP-DESIGN-02)
- Missing `--cv-success`, `--cv-danger`, `--cv-warning` tokens (GAP-133 PARTIAL)
- Duplicate `@keyframes spin` at `styles.css:930` and `1494`; redundant `@keyframes llm-spin` at line 574 (new)
- No responsive breakpoint below 900px for two-panel layout (GAP-DESIGN-05)
- CV header `text-align: center` inconsistent with left-aligned body grid (GAP-DESIGN-07)

---

## New Gaps — Cycle 29

| GAP | Severity | Persona(s) | Description |
|-----|----------|------------|-------------|
| GAP-271 | High | Accessibility, UX Expert | `styles.css:1651` removes `outline` on `.intake-field-row input:focus` with no visual replacement — WCAG 2.1 AA violation |
| GAP-272 | High | Accessibility | Spell-check action buttons ("Apply", "Ignore", "Add to Dictionary") use `title` only, no `aria-label` — screen-reader inaccessible |
| GAP-273 | High | Accessibility | `openAtsReportModal()` and `openJobAnalysisModal()` call `trapFocus` without pushing to `_focusStack`; `restoreFocus()` returns focus to wrong element |
| GAP-274 | High | UX Expert, Applicant | Clicking a completed workflow step navigates silently — no destructive-action confirmation fired (only the ↻ button shows a confirm dialog) |
| GAP-275 | Medium | UX Expert, Accessibility | Accepted/rejected rewrite cards communicate state via color and border only — no persistent text label "Accepted" / "Rejected" for color-blind users |
| GAP-276 | High | Recruiter Ops | Post-archive notes not editable in sessions modal — `PATCH /api/sessions/metadata` accepts `notes` but `session-switcher-ui.js` has no notes input field |
| GAP-277 | High | HR/ATS | ATS validation failures do not block file download — story US-H6 requires any fail blocks download; enforcement absent in finalise flow |
| GAP-278 | Medium | HR/ATS | `skill_type` (hard/soft) classification not written back to `Master_CV_Data.json` via harvest — classification is ephemeral (recomputed each run) |
| GAP-279 | Medium | Trust/Compliance | Cold-restore of prior rewrite decisions fires without any user notification — session restores prior accept/reject without informing the user |
| GAP-280 | Low | Graphical Designer | Duplicate `@keyframes spin` at `styles.css:930` and `:1494`; redundant `@keyframes llm-spin` at line 574 — dead CSS waste |
| GAP-281 | Medium | Persuasion Expert | No runtime narrative-thread counter — story US-P1 requires a warning when >2 equally-weighted narrative threads exist; no such check implemented |
| GAP-282 | Medium | Persuasion Expert, Resume Expert | Publication omission rationale not surfaced to user — low-ranked publications disappear silently with no per-item score or reason |
| GAP-283 | Medium | Persuasion Expert | Cover letter word count 300–400w standard; story US-P3 specifies ≤300w — 33% overshoot in production target |
| GAP-284 | Low | Applicant | "queued" application status not in the lifecycle — six status options exist (draft/ready/sent/interview/rejected/accepted) but "queued" is absent |
| GAP-285 | Low | Master CV Curator | Stale label: `web/master-cv.js:~285` refers to "Finalise tab" — should be "Harvest tab" |
| GAP-286 | Medium | Trust/Compliance | "Non-confidential" badge only fires when provider has `confidential: false`; undefined leaves provider data-handling opaque for most providers |
| GAP-287 | Low | Graphical Designer | `cv-template.html` CV header uses `text-align: center` but the body uses a left-aligned grid — visual inconsistency in generated output |
| GAP-288 | Low | UX Expert, First-Time User | Paste-text input shows character count but no minimum-length hint (e.g. "minimum ~200 characters") — count exists, guidance does not |
| GAP-289 | Medium | UX Expert | LLM busy overlay shows elapsed time but not named generation steps ("Step 1 of 3: Generating HTML…") — users cannot tell which phase is running |
| GAP-290 | Low | UX Expert | No skeleton placeholders or dimensioned containers for async content — CLS (Cumulative Layout Shift) occurs when LLM responses arrive |
| GAP-291 | Low | UX Expert, First-Time User | Two-button "Confirm Layout" → "Generate Final Files" proceed path has no inline explanation; new users cannot determine when/why to press each |
| GAP-292 | Low | HR/ATS | Candidate name casing not validated — all-uppercase or all-lowercase names pass through to ATS DOCX without warning |
| GAP-293 | Low | Applicant | Total session processing time absent from finalise confirmation summary — US-A9 requires this for applicant audit trail |
| GAP-294 | Medium | Applicant, Power User | Keyboard shortcut for workflow re-run not implemented in `keyboard-shortcuts.js` — re-run requires mouse click on ↻ button |
| GAP-295 | Medium | Applicant | Layout-refine has no clarification loop for ambiguous instructions — ambiguous instructions flow as backend chat responses with no structured follow-up |

---

## Resolved This Cycle

| GAP | Status | Evidence |
|-----|--------|----------|
| GAP-23 | RESOLVED | Intake confirmation card fully implemented — Applicant persona source-verified |
| GAP-132 | RESOLVED | Fallback HTML now uses Jinja2 template matching primary path |
| GAP-DESIGN-06 | RESOLVED | `cv-style.css` now uses Inter font + `#2980b9` brand color |

---

## Priority Queue for Next Batch

### High Priority (accessibility / blocking)
1. GAP-271 — Focus outline removed (WCAG violation)
2. GAP-272 — Spell-check aria-label missing
3. GAP-273 — ATS modal focus stack bug
4. GAP-274 — Silent back-navigation on completed steps
5. GAP-276 — Post-archive notes not wired to sessions modal

### Medium Priority (user trust / quality)
6. GAP-277 — ATS fail doesn't block download
7. GAP-279 — Cold-restore silent
8. GAP-286 — Non-confidential badge absent for implicit providers
9. GAP-281 — No narrative-thread counter
10. GAP-289 — No named generation step progress

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/utils/llm_client.py
