<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# UX Expert Review Status

**Last Updated:** 2026-07-07 22:02 ET

**Executive Summary:** GAP-388 (terminology fragmentation for the finalise action — nav pill said "Finalise", header button's raw HTML said "Package Application Files" patched via JS to "Archive Application", tooltip said "mark ready to send") is **RESOLVED**. `web/index.html:205` now sources `<span aria-hidden="true">✅</span> Finalise Application` directly as static markup — no runtime patch remains. `web/app.js:156-158` confirms the JS side now only does `finaliseBtn.addEventListener('click', () => switchTab('finalise'))`, nothing that rewrites `textContent`/`innerHTML`. A repo-wide grep for "Archive Application" / "Package Application" / "archiveBtn" / "packageBtn" returns zero hits anywhere in `web/*.js` or `web/*.html`. One residual, non-conflicting variance: the step-bar tooltip at `web/index.html:151` still reads "Finalise — mark the application ready to send and record its status" while the action button's tooltip (`index.html:205`) reads "Run the completeness checklist and finalise this application package" — both now use "Finalise" as the primary verb (the original three-way-name conflict is gone); the differing *supporting* clause is ordinary tooltip variation, not a recurrence of GAP-388.

GAP-389 (Finalise tab embedding a full duplicate "Update Master CV Data" candidates table with its own checkboxes/Apply button) is **RESOLVED**, and on inspection the "count + link out" replacement is a genuine UX improvement, not a compromise. `web/finalise.js`'s `showHarvestSection()` (lines 356-415) now renders only a candidate count and a single `🌾 Review & Update Master CV →` button that calls `switchTab('harvest')` — it no longer fetches-and-renders its own checkbox table (confirmed: no `data-harvest-id` checkboxes, no local `applyHarvestSelections` duplicate remain in `finalise.js`; a comment block at lines 417-423 documents that the old duplicate `applyHarvestSelections()` was dead code because `window`-scoped `onclick` resolution meant `harvest.js`'s version always won anyway). Critically, "Update Master CV" is not a random destination — it is the **literal next step** in the app's own linear workflow stepper (`web/index.html:151-153`: step-finalise → step-harvest, consecutive with no steps between them). So the fix doesn't send the user sideways or make them "start over" to update their master data; it sends them forward exactly where the stepper was already pointing. The dedicated tab (`web/harvest.js`, populateHarvestTab/applyHarvestSelections/refreshHarvestAnalysis) is strictly more capable than what a duplicated inline table could stay in sync with — AI recommendation/confidence-tier grouping, per-type descriptions, re-analyse, provenance badges — so nothing is lost by not re-rendering it a second time inside Finalise. My honest read: this is a net usability win, not a regression in convenience. The only cost is one extra click, and that click is clearly labelled, always the same click regardless of entry point, and eliminates the "two implementations of one feature" risk this codebase has been bitten by before (GAP-146/48/43, explicitly called out in `CLAUDE.md`).

Beyond the two target gaps, the broader US-U1–U9 sweep found a well-instrumented application: labelled bulk-action toolbars with undo, inline `<del>/<ins>` diff rendering with collocated Accept/Edit/Reject, confidence badges pairing colour with text, clarifying-question grouping capped at 3, rank-numbered ATS keyword badges, an above-the-fold mismatch callout, a real focus-trap/restore-focus system for modals, and consistent `:focus-visible` styling with no un-replaced `outline:none` found anywhere in `styles.css`. The residual gaps are minor and unrelated to GAP-388/389: no explicit multi-version list/"current" label when a user regenerates CV output files more than once in a session, and no visible "last active" timestamp on session restore (the data exists internally but is only used for a 24h expiry check, not shown to the user).

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility
- ✅ Persistent step indicator with named, non-numeric stages — `web/index.html:106-153` (Job → Analysis → … → Finalise → Update Master CV).
- ✅ Completed-state distinction — `.step.completed` styling (`web/styles.css:304-305`).
- ✅ Stage-change announced in place, no reload — `web/ui-core.js:578-582` updates `#tab-stage-label` directly; live region at `web/index.html:157-158`.
- ⚠️ Session restoration — job identity is restored via the persistent `#position-title` bar (`web/session-actions.js:159-189`) and `loadStateFromLocalStorage()` restores `currentTab`/tab data (`web/state-manager.js:410-429`), covering "which job" and "which stage." "When it was last active" is captured (`data.timestamp`) but only used internally for a 24h expiry check (`web/state-manager.js:417-422`) — not surfaced to the user as a visible "last active" readout.
- ✅ Back-navigation — Enter/Space/Arrow/Home/End keyboard nav on tabs (`web/ui-core.js:472-498`) plus click-based switching; no destructive-discard path found in the reviewed tab-switch code.

### US-U2: Job Input and URL Ingestion UX
- ✅ URL/paste/file clearly delineated, equal-weight tabs — `web/job-input.js:143-147`.
- ✅ Protected-site guidance is proactive and specific — an always-visible "⚠️ Copy manually from: LinkedIn / Indeed / Glassdoor" panel (`web/job-input.js:181-184`) plus a dedicated modal naming the site and giving numbered instructions on actual detection (`web/job-input.js:511-519`, `showProtectedSiteModal`).
- ✅ Fetch feedback — `setLoading(true, 'Fetching job from URL…')` fires synchronously before the request (`web/job-input.js:495`); network errors get a retry action (`appendRetryMessage`, line 541).
- ✅ Confirmation editability — intake confirm card lets the user correct the extracted position title inline before analysis, without restarting (`web/job-input.js:71-91, 105-121`, GAP-365).
- ✅ Character-count guidance — `_updatePasteCharCount()` runs on initial render and on input (`web/job-input.js:221`).

### US-U3: Analysis Results Readability
- ✅ Chunking — role/domain card, mismatch callout, required-skills grid, preferred/nice-to-have, ATS keywords, culture indicators, must-have requirements: 6+ distinct sections (`web/review-table-base.js:532-616`).
- ✅ Keyword visualisation — rank-numbered badges ("#1", "#2"…) with a "(higher rank = higher priority)" hint and synonym annotations, not a flat comma list (`web/review-table-base.js:592-597`).
- ✅ Mismatch prominence — the mismatch callout renders directly after the role card, before the skills grid — genuinely above the fold (`web/review-table-base.js:553-563`).
- ✅ Clarifying-question grouping — `GROUP_SIZE = 3` (`web/questions-panel.js:381`), paged one group at a time via `_currentGroup`/`advanceQGroup`/`renderQGroupNav`.
- ✅ Loading feedback — `setLoading(true, 'Analysing job description…')` plus an "Analyzing job description..." chat message (`web/job-analysis.js:110-111`).

### US-U4: Review Table Interaction Quality
- ✅ Toggle affordance — semantic action buttons (Emphasize/Include/Omit etc.), not bare checkboxes; bulk toolbar mirrors per-row state.
- ✅ Reorder controls — always-rendered ↑/↓ icon `<button>`s with descriptive `aria-label`s, not hover-only (`web/experience-review.js:252-254`, `web/achievements-review.js:282-283`, `web/publications-review.js:181-183`).
- ✅ Bulk actions — richer than plain Select-All: "✨ Accept All Recommended / ➕ Emphasize All / ✓ Include All / ⛔ Exclude All / ↩ Undo" toolbars, rendered unconditionally on Experience, Achievements, and Skills tables (`web/experience-review.js:288-296`, `web/achievements-review.js:340-348`, `web/skills-review.js:1053-1061`).
- ✅ Relevance-score meaning — shown as labelled Confidence tiers (Very High/High/Medium/Low/Very Low) with an explicit legend string (`CONFIDENCE_COLUMN_LEGEND`, `web/recommendation-helpers.js:43-53`), not a raw float.
- 🔲 Inline expansion / scroll-position-on-navigate-back — not directly traced end-to-end this pass.

### US-U5: Rewrite Review Presentation
- ✅ Inline diff — `<del class="diff-removed">`/`<ins class="diff-added">` tokens rendered inline (`web/rewrite-review.js:392-393`), not side-by-side boxes.
- ✅ Accept/Edit/Reject collocated per card — `web/rewrite-review.js:449-451` (`rw-accept`/`rw-edit`/`rw-reject`, `aria-pressed` state tracked).
- ✅ Reason visibility — `<details class="rewrite-rationale">` inline in the card (`web/rewrite-review.js:436-439`), one click, no separate panel.
- ✅ Edit path — `saveRewriteEdit()` preserves the original/diff context for comparison while editing (`web/rewrite-review.js:538+`).
- ✅ Batch efficiency — `_scrollToNextPendingRewrite(id)` auto-advances after each decision (`web/rewrite-review.js:520-524`), plus "Accept All"/"Reject All" bulk buttons (lines 295-296).

### US-U6: Generation and Output State Feedback
- ✅ Step-labelled generation progress — `cv-gen-step-list`: "Rendering HTML / Generating PDF / Building DOCX files" with `is-pending`/`is-complete` states (`web/layout-instruction.js:405-408, 1191-1216`).
- ✅ In-browser preview — `<iframe id="final-cv-preview">` (`web/final-generate.js:89`) and `<iframe id="layout-preview">` (`web/layout-instruction.js:319`).
- ✅ Filename convention — `CV_{Company}_{Role}_{timestamp}.{html,pdf,docx}` with a distinct `_ATS` suffix on the ATS DOCX (`scripts/cv-preview.py:388-391`).
- ✅ Error fallback — "View HTML preview... open the HTML source in your browser as a fallback" shown alongside WeasyPrint/Chrome renderer failure messaging (`web/layout-instruction.js:97-109`).
- ⚠️ Version label — only a single "Generated: {timestamp}" label is shown for the latest generation (`web/final-generate.js:134-139`, GAP-313); no list of prior versions with a "current" marker was found for a session with multiple regenerations.

### US-U7: Accessibility and Keyboard Navigation
- ✅ Focus management — `_focusStack`/`trapFocus`/`restoreFocus` implemented for modals (`web/ui-core.js:255-351, 622-656`); the custom `confirmDialog()` (lines 381-455) traps Tab/Shift+Tab and restores focus on close.
- ✅ Focus visibility — dozens of `:focus-visible` rules across tabs, buttons, inputs, icon buttons (`web/styles.css`, e.g. lines 295, 452, 763, 816, 1430, 1516, 1576); zero un-replaced `outline: none` found in `styles.css`.
- ✅ Table/tab keyboard nav — Enter/Space/Arrow/Home/End handling on the tab list (`web/ui-core.js:472-498`); reorder controls are real `<button>`s, natively keyboard-operable.
- ✅ ARIA labels — icon-only reorder/move buttons consistently carry `aria-label` (`web/achievements-review.js:282-283, 638-639`, `web/experience-review.js:252-254`, `web/publications-review.js:181-183`).
- ✅ Colour-independence — confidence/relevance badges pair colour with an explicit text label (`web/recommendation-helpers.js:43-53`); rewrite outcome badges pair icon + text (e.g. `web/finalise.js:231`, "✅"/"✏️"/"❌" plus the word).
- 🔲 `aria-describedby` on validation errors — confirmed present for job-input fields (`web/job-input.js:152,168,171`) but not traced across every form in the app this pass.

### US-U9: HTML Layout Review Interaction Quality
- ✅ Instruction field scope + placeholder — "Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." plus a concrete multi-example placeholder (`web/layout-instruction.js:326, 387`).
- ✅ Processing feedback — a `processing-indicator` spinner with an embedded step list appears on submit (`web/layout-instruction.js:402-409`).
- ✅ Clarification handling — `response.error === 'clarify'` opens an inline `#layout-clarification-panel` with its own textarea/submit, not a silent guess (`web/layout-instruction.js:778, 1253-1292`).
- ✅ Instruction history + Undo — `#instruction-history` list (`web/layout-instruction.js:414-419, 669`) backed by an undo stack (`_layoutUndoStack`, line 51); the sequential-undo constraint is explicitly communicated via a disabled button + tooltip ("Undo is sequential — undo the most recent change first," ~line 1133) rather than failing silently.
- ⚠️ Single proceed action — implemented as `#confirm-layout-btn` labelled **"Confirm Layout"** (`web/layout-instruction.js:394-396`; also `web/index.html:203`, "✅ Confirm Layout"), a single, unconditional button regardless of whether instructions were applied — satisfies the acceptance criterion's intent (no "Skip" vs "Confirm" branching), but the literal label differs from the story's suggested "Proceed to Final Generation" wording. Cosmetic mismatch, not a functional gap.
- ✅ Content safety assurance — same scope label as above states plainly that content edits are not applied via this field.

### US-U8: Responsive Behaviour and Loading Performance
- ✅ Responsive breakpoints defined — media queries at 1400px, 1280px, 1100px, 900px, 600px, 640px in `web/styles.css`, covering the story's 1280×800 minimum-viable target.
- ✅ Horizontal-scroll containment — tables wrapped in `overflow-x: auto` containers (`web/styles.css:1385` and others).
- 🔲 Skeleton screens / CLS prevention and 20+-row scroll performance — not directly verified this pass; would need a follow-up look at the skills-table renderer and any DataTables paging config specifically.

## Generated Materials Evaluation

Not separately re-verified this pass beyond what feeds directly into the review-surface findings above (filename convention, PDF/HTML/DOCX output set, ATS suffix). No new findings on the generated CV/cover-letter/screening documents themselves — this persona's story set (US-U1–U9) is scoped to the application UI, and the generated-materials content itself is covered by the resume-expert/graphical-designer personas.

## Additional Story Gaps / Proposed Story Items

1. **US-U6 — session version history.** Consider a lightweight "Generated N times this session" list with timestamps and a "current" tag once a user regenerates final files more than once, so an accidental re-download of a stale version can't happen. Currently only the single latest timestamp is shown (`web/final-generate.js:134-139`).
2. **US-U1 — visible "last active" readout.** `data.timestamp` already exists and is used for the 24h staleness check (`web/state-manager.js:417-422`); surfacing it as "Last worked on: {relative time}" next to the position-title bar would close the letter of US-U1's session-restoration criterion at near-zero cost, since the data is already being captured.
3. **US-U9 terminology.** If the product wants the acceptance criteria to match verbatim, either rename "Confirm Layout" to "Proceed to Final Generation" or update the story text to "Confirm Layout" — current mismatch is cosmetic only, not a functional gap.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/finalise.js, web/harvest.js, plus web/job-input.js, web/job-analysis.js, web/questions-panel.js, web/review-table-base.js, web/experience-review.js, web/achievements-review.js, web/publications-review.js, web/skills-review.js, web/recommendation-helpers.js, web/rewrite-review.js, web/final-generate.js, web/layout-instruction.js, web/session-actions.js, scripts/cv-preview.py

| Story | ✅ | ⚠️ | ❌ | 🔲 | — |
|---|---|---|---|---|---|
| US-U1 | 4 | 1 | 0 | 0 | 0 |
| US-U2 | 5 | 0 | 0 | 0 | 0 |
| US-U3 | 5 | 0 | 0 | 0 | 0 |
| US-U4 | 4 | 0 | 0 | 1 | 0 |
| US-U5 | 5 | 0 | 0 | 0 | 0 |
| US-U6 | 4 | 1 | 0 | 0 | 0 |
| US-U7 | 5 | 0 | 0 | 1 | 0 |
| US-U8 | 2 | 0 | 0 | 1 | 0 |
| US-U9 | 5 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- GAP-388 (resolved): source label → `web/index.html:205`; runtime patch removed → `web/app.js:156-158`; no "Archive Application"/"Package Application" strings anywhere in `web/*.js`/`web/*.html` (grep-confirmed, zero hits).
- GAP-389 (resolved, net UX improvement): count+link implementation → `web/finalise.js:356-415`; dead-duplicate removal note → `web/finalise.js:417-423`; canonical destination and its position as the literal next workflow step → `web/harvest.js` (full populate/apply/analyse implementation), `web/index.html:151-153`.
- US-U3: keyword rank badges → `web/review-table-base.js:592-597`; mismatch callout placement → `web/review-table-base.js:553-563`; question group size → `web/questions-panel.js:381` (`GROUP_SIZE = 3`).
- US-U5: inline diff markup → `web/rewrite-review.js:392-393`; collocated controls → `web/rewrite-review.js:449-451`.
- US-U7: focus trap/restore → `web/ui-core.js:255-351, 622-656`; focus-visible coverage → `web/styles.css` (multiple selectors, no un-replaced `outline: none`).
- US-U9: instruction history + undo → `web/layout-instruction.js:414-419, 51, 669, ~1133`.

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
