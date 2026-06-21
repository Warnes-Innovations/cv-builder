<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
-->

# UX Expert Review Status — Cycle 4

**Last Updated:** 2026-06-18 ~19:00 ET
**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/layout-instruction.js, web/job-input.js, web/rewrite-review.js, web/review-table-base.js, web/workflow-steps.js, web/message-dispatch.js, web/download-tab.js, web/final-generate.js, web/job-analysis.js, web/questions-panel.js, web/experience-review.js, web/skills-review.js

**Executive Summary (Cycle 4):** One cycle-3 gap is now partially resolved: the intake confirmation card (`message-dispatch.js:420–463`) renders editable `<input>` fields for role, company, and date immediately after analysis, satisfying the spirit of AC 2.4 (extracted fields editable before workflow continues), though the editing surface is a chat-panel card rather than an inline header edit. All other cycle-3 gaps remain open: clarifying questions still display all-at-once, the layout proceed button label is still "Generate Final Files", the layout-freshness-chip `aria-label` is now a static "Layout freshness" (not dynamic), `outline: none` on `.message-input:focus` is correctly scoped inside the `:focus` rule (regression fixed), and no sequential rewrite keyboard navigation exists. One new observation: two tabs share the 📊 icon and two share the ✏️ icon. Net status is 29 Pass / 11 Partial / 4 Fail / 1 Not Implemented.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

| AC | Status | Evidence |
|----|--------|---------|
| 1.1 Stage indicator present and accurate on every step | ✅ Pass | `index.html:117–143` — 13-pill workflow bar; `workflow-steps.js:683–714` (`updateWorkflowSteps`) applies `.active`/`.completed`/`.stale` on every status poll. |
| 1.2 Completed steps visually distinct from active/upcoming | ✅ Pass | `styles.css:149–159` — active=blue, completed=green, upcoming=ghost, stale=amber, stale-critical=red. All states clearly differentiated. |
| 1.3 Back-navigation preserves approved content; destructive actions require confirmation | ⚠️ Partial | `workflow-steps.js:138–187`: `_showReRunConfirmModal()` fires for LLM re-run actions; `ui-core.js:372–443` provides `confirmDialog()`. However, clicking any completed step that is NOT a re-run target (e.g. Analysis from Rewrites via `handleStepClick()`) silently navigates back without a confirmation prompt. |
| 1.4 Session restore lands on last active step with data intact | ⚠️ Partial | `session-manager.js:401–460`: restores phase, restores conversation history, switches to correct tab. Position bar shows job title and company. However, there is no consolidated orientation card summarising "Job: [Title] at [Company] — Step: Rewrites — Last active: 2h ago." Orientation is fragmented across the position bar and chat history replay. |
| Stage indicator updates without reload | ✅ Pass | `ui-core.js` line ~1958: `stateManager.onPhaseChange()` listener calls `updateWorkflowStepsClickable(phase)` on each transition. |

**Failure modes present:** Silent back-navigation from non-re-run completed steps. Absent unified session-restore orientation message.

---

### US-U2: Job Input and URL Ingestion UX

| AC | Status | Evidence |
|----|--------|---------|
| 2.1 URL and paste-text modes clearly delineated | ✅ Pass | `job-input.js:107–111` — three equal-weight tab buttons (📝 Paste Text, 🔗 From URL, 📁 Upload File) with `.active` class styling. Each controls a separate `.input-method` panel via `switchInputMethod()`. |
| 2.2 Protected-site detection triggers inline, contextual instruction | ✅ Pass | `job-input.js:471–479`: `data.protected_site` triggers `showProtectedSiteModal(site_name, message, instructions)` with numbered steps and a tip to use the Paste Text tab. Lines 140–149 also render a proactive advisory grid naming LinkedIn, Indeed, and Glassdoor with reasons. |
| 2.3 Fetch loading state appears within 300 ms of submission | ✅ Pass | `job-input.js:455`: `setLoading(true, 'Fetching job from URL…')` called synchronously before `fetch()`. `#llm-busy-overlay` (`index.html:153–162`) shows spinner + label immediately. |
| 2.4 Extracted fields editable in-place; editing does not restart workflow | ⚠️ Partial — **Cycle-4 improvement** | `message-dispatch.js:420–463`: `_showIntakeConfirmCard()` now renders a card in the chat panel with editable `<input>` fields for Role, Company, and Date Applied immediately after job submission and before analysis proceeds. Fields are pre-filled with LLM-extracted values and are submitted via `_submitIntakeCard()`. This satisfies the "fields editable before workflow continues" goal. However, the static job-tab `<h1>` still renders the extracted title with no in-place edit controls (`job-input.js:49–84`). Users who miss the intake card cannot correct the title later without re-submitting. |
| 2.5 Paste area shows minimum character guidance hint | ✅ Pass | `job-input.js:320–336`: `PASTE_MIN_CHARS = 200`. Live counter updates with red (below) / green (above) colour feedback. `aria-describedby="paste-char-count paste-error"` links the counter (`job-input.js:116`). |

**Failure modes present:** Post-intake job title/company locked in position bar with no correction path short of re-submitting. Intake card placement in chat may be missed if user is not watching the conversation panel.

---

### US-U3: Analysis Results Readability

| AC | Status | Evidence |
|----|--------|---------|
| 3.1 Analysis result has ≥4 visually distinct sections | ✅ Pass | `review-table-base.js:289–362`: (1) Role & Domain card, (2) Mismatch callout, (3) Required Skills grid (`.skill-grid`/`.skill-badge`), (4) Preferred/Nice-to-Have list, (5) ATS Keywords with rank badges. Five named sections. |
| 3.2 Keywords displayed with visual rank signal | ✅ Pass | `review-table-base.js:336–342`: `<span class="kw-badge"><span class="kw-rank">#${idx+1}</span>${kw}</span>`. Section header reads "(higher rank = higher priority)". |
| 3.3 Mismatch callouts visible above the fold; summary count for >3 mismatches | ⚠️ Partial | `review-table-base.js:300–309`: mismatch renders after the role card, correctly placed above the fold. BUT: the callout is gated on `window._masterSkills` being populated — if master skills are not yet loaded, no callout appears regardless of actual skill gap. No summary count for >3 mismatches with expandable detail; all mismatches are always listed inline. |
| 3.4 Clarifying questions in groups of ≤3 per screen | ❌ Fail | `questions-panel.js` renders all post-analysis questions as a single flat list in the Questions tab. No sequential grouping with "confirm before next group" flow. Criterion unimplemented since cycle 1. |
| 3.5 Analysis loading includes descriptive label and estimated duration | ⚠️ Partial | `index.html:153–162`: LLM busy overlay shows elapsed time counter. `job-analysis.js:105`: label is "Analysing job description…". No estimated duration hint (e.g. "usually ~20 seconds") is provided. Elapsed counter is present but is not a forward-looking estimate. |

**Failure modes present:** All questions rendered simultaneously — wall-of-questions pattern. Estimated duration absent from analysis loading state.

---

### US-U4: Review Table Interaction Quality

| AC | Status | Evidence |
|----|--------|---------|
| 4.1 Accept/reject toggles visually obvious; current state unambiguous | ✅ Pass | `experience-review.js:202–208`: 32×32 px icon buttons with `.icon-btn.active { background: #10b981; color: #fff }` (`styles.css:1184–1190`). Always visible, not hover-only. `aria-label` names action and target. |
| 4.2 Reorder controls discoverable without hover; keyboard-accessible | ✅ Pass | Up/down row-reorder buttons always rendered; `disabled` attribute set for first/last row. `<button>` elements natively keyboard-operable. |
| 4.3 Row density sufficient for decisions without expanding every row | ⚠️ Partial | Experience rows show title, company, dates, recommendation tier, confidence badge, reasoning excerpt, and action buttons. No first-bullet preview inline; users cannot pre-scan bullet content without additional interaction (clicking bullet reorder). |
| 4.4 Bulk actions present when row count > 8 | ✅ Pass | `experience-review.js:241–248`: bulk toolbar always rendered ("Accept All Recommended", "Emphasize All", "Include All", "Exclude All"). `skills-review.js:942–948`: same pattern for skills. |
| 4.5 Bullet expansion in-place; no page navigation | ✅ Pass | `showBulletReorder()` renders inline within the tab without navigating away or resetting scroll. |
| 4.6 Relevance scores labelled with scale (e.g., "Relevance: 92 / 100") | ❌ Fail | Experience review uses tier labels (Emphasize / Include / De-emphasize / Omit) with a confidence badge (high/medium/low). No numeric relevance score with denominator or letter grade with legend. Publications-review uses raw scores but the denominator is not confirmed labelled as "/10" or "/100". Criterion requires explicit scale label. |

**Failure modes present:** No inline first-bullet preview. Relevance/priority scores shown without labeled scale.

---

### US-U5: Rewrite Review Presentation

| AC | Status | Evidence |
|----|--------|---------|
| 5.1 Inline diff with red/strikethrough removals and green additions | ✅ Pass | `rewrite-review.js:183–226`: LCS word-level diff (`computeWordDiff` / `renderDiffHtml`). Uses `<del class="diff-removed">` (red, `styles.css:1241`) and `<ins class="diff-added">` (green, `styles.css:1242`). |
| 5.2 Accept / Reject / Edit controls collocated with diff | ✅ Pass | `rewrite-review.js:272–275`: ✓ Accept, ✎ Edit, ✗ Reject in `.rewrite-actions` inside each `.rewrite-card-body`. |
| 5.3 LLM reason visible within one click or hover | ✅ Pass | `rewrite-review.js:261–265`: `<details class="rewrite-rationale"><summary>Rationale & Evidence</summary>` — one-click expand, no separate panel navigation. |
| 5.4 Edit mode allows free-text editing; preserves original for comparison | ✅ Pass | `rewrite-review.js:293–351`: edit mode shows `<textarea>` pre-filled with proposed text. `saveRewriteEdit()` regenerates the word-level diff against `data-original` using the edited text. Original preserved. |
| 5.5 Keyboard shortcut or "Approve & Next" for >3 rewrites | ❌ Fail | No sequential keyboard navigation implemented. Bulk Accept All / Reject All are present (`rewrite-review.js:453–462`) but no "Approve & Next →" card-by-card shortcut or focus-advancement exists. Unresolved since cycle 1. |

**Failure modes present:** Manual scrolling required through all rewrite cards. No keyboard-driven per-card progression.

---

### US-U6: Generation and Output State Feedback

| AC | Status | Evidence |
|----|--------|---------|
| 6.1 Generation progress step-labelled; completed steps show checkmark before next | ⚠️ Partial | LLM busy overlay (`index.html:153–162`) shows spinner, elapsed time, and one step label. Multi-step file generation (HTML → PDF → DOCX) is not decomposed into individually labelled substeps with per-step completion checkmarks. |
| 6.2 Generated CV renderable inline with prominent download | ✅ Pass | `layout-instruction.js:287`: `<iframe id="layout-preview" class="layout-preview-iframe">` renders CV HTML inline in the layout review pane before any download. |
| 6.3 Download filename follows CV_{Company}_{Role}_{Date} convention | ✅ Pass | `cv_orchestrator.py` generates `CV_{company}_{role}_{timestamp}.pdf`, `CV_{company}_{role}_{timestamp}_ATS.docx`, etc. (`scripts/utils/cv_orchestrator.py:1432`, `generation_routes.py:1768`). Frontend exposes the filenames server provides. |
| 6.4 Generation error surfaces user-readable message with fallback action | ⚠️ Partial | Errors are shown via `appendMessage('system', '❌ Failed: ...')`. No confirmed "Download HTML instead" fallback action button in the WeasyPrint/Chrome-headless failure path. |
| 6.5 Multiple versions listed with timestamps and "current" label | 🔲 Not Implemented | `download-tab.js` lists only the most recently generated files. Multiple generation runs in a session are not distinguished; no version history, timestamps, or "current" badge. |

**Failure modes present:** Single spinner for multi-file generation. No version history in download tab.

---

### US-U7: Accessibility and Keyboard Navigation

| AC | Status | Evidence |
|----|--------|---------|
| 7.1 Focus management: modal open → focus inside; close → focus restores | ✅ Pass | `ui-core.js:239–247`, `294–347`: `openSettingsModal` saves `_focusedElementBeforeModal`, calls `setInitialFocus()` + `trapFocus()`. `closeSettingsModal()` calls `restoreFocus()`. `trapFocus()` correctly handles Tab/Shift+Tab cycling. Pattern applied consistently across all modals. |
| 7.2 All interactive elements have visible, styled focus indicator | ⚠️ Partial — regression confirmed fixed, residual defect remains | `styles.css:577–578`: `.message-input { flex: 1; padding: ... }` (line 577, no `outline` rule) / `.message-input:focus { outline: none; border-color: #3b82f6; box-shadow: ... }` (line 578). The `outline: none` is now correctly scoped inside `:focus` — **this cycle-3 regression is resolved**. Residual: `styles.css:1584` — `.intake-field-row input:focus { outline: none; }` with no confirmed styled replacement visible in source. Tab elements (`.tab`) have no CSS `:focus-visible` rule; browser default outline applies. |
| 7.3 Tab keyboard navigation: Enter/Space activate, arrow keys navigate | ✅ Pass | `index.html:200–225`: all tabs carry `role="tab"`, `tabindex="0"`/`"-1"`, `aria-selected`. `ui-core.js:509–541`: Enter/Space activate; ArrowLeft/Right/Home/End navigate. Confirmed fix from cycle 3. |
| 7.4 Icon-only controls have `aria-label` or `title` | ⚠️ Partial | Most icon buttons have `aria-label` and `title` (`experience-review.js:202–208`). **Exception:** `index.html:95` — `<button id="layout-freshness-chip" ... aria-label="Layout freshness">`. The aria-label is now a static string "Layout freshness" rather than empty string as found in cycle 2/3, which is an improvement; however it is still a static generic description rather than a dynamic state-reflecting label ("Layout is fresh" / "Layout is stale — click to regenerate preview"). A screen reader user cannot determine the current freshness state from the aria-label alone. |
| 7.5 Accept/reject status communicated by colour AND text label | ✅ Pass | Rewrite card action buttons labelled "✓ Accept", "✎ Edit", "✗ Reject" with text + glyph. LLM status badge uses colour class AND text label ("Not ready", "Connected", etc.). |
| 7.6 Form validation errors associated via `aria-describedby` | ✅ Pass | `job-input.js:116`: paste textarea has `aria-describedby="paste-char-count paste-error"`. URL input has `aria-describedby="url-error"` (line 133). Error spans use `aria-live="polite"`. `input[aria-invalid="true"]:focus` (`styles.css:1524`) provides additional visual feedback. |

**Failure modes present:** `.intake-field-row input:focus { outline: none }` (line 1584) lacks a confirmed styled replacement. Tab elements have no `:focus-visible` ring. Layout-freshness-chip aria-label is static, not state-reflecting.

---

### US-U8: Responsive Behaviour and Loading Performance

| AC | Status | Evidence |
|----|--------|---------|
| 8.1 Core workflow navigable without horizontal scroll at 1280 × 800 | ⚠️ Partial | `styles.css:148`: `.workflow-steps { display: flex; gap: 32px; justify-content: center; }` — no `flex-wrap: wrap` or `overflow-x: auto`. With 13 step pills + 12 arrow separators at 32px gap, the workflow bar will overflow at 1280px. Tab bar has `overflow-x: auto` with scroll buttons, which is good; main step bar has no responsive handling. |
| 8.2 Table columns collapsible at ≤1400 px | ❌ Fail | No `@media`-based column collapsing defined for experience/skills/achievements/publications review tables. Session-manager table hides at ≤700px (`styles.css:321`), but review tables have no equivalent. |
| 8.3 Application shell renders in ≤2 s locally | ✅ Pass | All external resources are CDN-hosted and commonly cached. `bundle.js` is locally served. No synchronous blocking server calls before first render. |
| 8.4 Async content areas have skeleton placeholders | ⚠️ Partial | Loading-spinner placeholder shown during initial session load. Experience-review and skills-review tabs replace `#document-content` wholesale with no minimum-height placeholder, causing cumulative layout shift on content arrival. |
| 8.5 Long table scroll performance | — N/A | Cannot evaluate from static source review. No virtual scrolling or CSS containment applied to review tables. |

**Failure modes present:** Workflow step bar overflows at 1280px — no wrap or scroll. Review table columns have no responsive collapse rules.

---

### US-U9: HTML Layout Review Interaction Quality

| AC | Status | Evidence |
|----|--------|---------|
| 9.1 Instruction field has visible placeholder and scope label | ✅ Pass | `layout-instruction.js:293`: "💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." Placeholder at line 353–354 provides concrete examples. |
| 9.2 Processing indicator within 300 ms; preview updates on completion | ✅ Pass | `layout-instruction.js:364–367`: `#processing-indicator` shown synchronously before async API call. |
| 9.3 Confirmation of applied change shown after each instruction | ✅ Pass | `layout-instruction.js:1013`: history entry renders `instruction.change_summary`. `showConfirmationMessage()` and chat `appendMessage('assistant', '✅ Layout instruction applied. Preview updated.')` confirm the change. |
| 9.4 Ambiguous instructions surface a clarifying prompt | ✅ Pass | `layout-instruction.js` handles `response.error === 'clarify'` by calling `showClarifyDialog()` which uses `confirmDialog()` inline. Not a silent guess or raw error. |
| 9.5 Instruction history panel with individual Undo controls | ✅ Pass | `layout-instruction.js:1003–1024`: `renderInstructionHistory()` builds history entries with `<button class="action-btn-sm" onclick="undoInstruction(${index})">Undo</button>` per entry. `undoInstruction()` (lines 1122–1134) pops `_layoutUndoStack` and restores prior snapshot. Functional implementation. |
| 9.6 Single "Proceed to Final Generation" button, unambiguously labelled | ⚠️ Partial | `layout-instruction.js:379–381` renders the button as "Generate Final Files". The story acceptance criterion specifies the label "Proceed to Final Generation". Additionally, two separate advance signals exist: `layout-btn` ("✅ Confirm Layout") and `final-generate-proceed-btn` ("✅ Proceed to Finalise →") in the chat toolbar (`index.html:188–189`) create overlapping controls. Users may be confused about which button to use and in which order. |

**Failure modes present:** Proceed button label still "Generate Final Files" instead of "Proceed to Final Generation". Dual overlapping advance-signal buttons in chat toolbar vs. layout pane.

---

## Generated Materials Evaluation

This section evaluates the usability implications of the generated output visible to the user.

**Filename convention:** ✅ Pass — `cv_orchestrator.py` generates `CV_{Company}_{Role}_{Timestamp}.pdf` and `CV_{Company}_{Role}_{Timestamp}_ATS.docx`. The download tab exposes these filenames directly from the server response. Filenames are self-describing.

**Inline preview:** ✅ Pass — The layout review tab renders the HTML preview in an iframe before download. Users can inspect the output before committing to final generation.

**ATS validation report:** ✅ Pass — `download-tab.js:76–141` renders an expandable ATS report table with pass/warn/fail per check, coloured rows, and page-count advisory. Critical failures block the download button with an explanatory message.

**Output labelling:** ⚠️ Partial — The `final-generate.js` tab labels files as "ATS PDF", "Human PDF", "ATS Word", "Human Word", "HTML" — clear and distinct. The `download-tab.js` "File Review" tab uses file description text but labels them by filename only in the download-name div, without the "ATS PDF" / "Human PDF" shorthand. Users must parse the filename to understand format intent.

**Version tracking:** ❌ Missing — No version timestamp or "current" label is shown when multiple generation runs have been completed in a session. Users have no way to confirm they are downloading the latest output.

---

## Key Changes from Cycle 3 — Verified Fixes and Regressions

| Item | Cycle-3 Status | Cycle-4 Status | Evidence |
|------|---------------|----------------|---------|
| GAP-A: Extracted metadata inline editable | ❌ Fail (static `<h1>`) | ⚠️ Partial — intake card in chat | `message-dispatch.js:420–463`: `_showIntakeConfirmCard()` with editable fields for Role, Company, Date. Static job-tab header unchanged. |
| GAP-F: `outline: none` on `.message-input` unconditional | ⚠️ Partial | ✅ Resolved | `styles.css:577–578`: `outline: none` now correctly inside `:focus` block only. |
| GAP-E: Layout-freshness-chip `aria-label` empty | ❌ `aria-label=""` | ⚠️ Partial — now static "Layout freshness" | `index.html:95`: no longer empty; still not dynamic/state-reflecting. |
| GAP-D: Layout proceed button label | ⚠️ Partial | ⚠️ Partial — unchanged | `layout-instruction.js:379`: still "Generate Final Files". |
| GAP-B: Clarifying questions grouping | ❌ Fail | ❌ Fail — unchanged | `questions-panel.js`: all questions rendered flat. |
| GAP-C: Rewrite sequential keyboard navigation | ❌ Fail | ❌ Fail — unchanged | No "Approve & Next →" shortcut. |
| GAP-G: Version history in download tab | 🔲 Not Impl | 🔲 Not Impl — unchanged | `download-tab.js`: no version history. |

---

## Additional Story Gaps / Proposed Story Items

**NEW-A: Intake card discoverability risk (US-U2 extension)**
The intake confirm card appears in the conversation panel which may be scrolled past or not immediately visible. If a user submits a job description and immediately focuses the viewer panel, the intake card appears without visual focus movement to it. Proposed: shift focus to the intake card on render (add `data-focus-target="true"` to the role input), or add a toast notification prompting the user to confirm.

**NEW-B: Static layout-freshness-chip aria-label (US-U7 extension)**
`index.html:95`: `aria-label="Layout freshness"` is static. When the chip state changes (fresh / stale / critical), the aria-label does not update to reflect the state. Screen readers cannot determine freshness status. Proposed: update via `updateAtsBadge()`-style DOM mutation whenever freshness state changes.

**NEW-C: Tab icon collision reduces scannability**
Two tabs share the 📊 icon (`tab-exp-review` "📊 Experiences" and `tab-ats-score` "📊 ATS Score") and two tabs share the ✏️ icon (`tab-ach-editor` "✏️ Experience Bullets" and `tab-rewrite` "✏️ Rewrites"). Icon + label scanning becomes ambiguous when the tab bar is scrolled. Propose unique icons per tab.

**NEW-D: `.intake-field-row input:focus { outline: none }` without styled replacement**
`styles.css:1584`: the intake card's focused inputs suppress the browser outline with no confirmed box-shadow or border-change replacement in the adjacent CSS. This is a potential WCAG 2.4.7 failure for the intake card specifically.

**NEW-E: "Done — Generate CV →" button label ambiguity**
`index.html:186`: the action button for leaving spell check reads "Done — Generate CV →". "Done" is ambiguous — done with what? This implies the previous step is complete, but the user may not know which step "Done" refers to. Proposed: "Finish Spell Check → Generate Preview" to be explicit about what was completed and what comes next.

---

## Terminology Audit

| Location | Current label | Assessment |
|----------|--------------|------------|
| `index.html:183` | `⚙️ Recommend Customizations` | ⚠️ Developer-centric verb. User mental model: "What should I include?" |
| `index.html:185` | `Continue to Spell Check →` | ✅ Clear |
| `index.html:186` | `Done — Generate CV →` | ⚠️ "Done" is ambiguous. See NEW-E. |
| `index.html:189` | `✅ Proceed to Finalise →` | ⚠️ British spelling; inconsistent with "Spell Check", "Download" |
| `layout-instruction.js:379` | `Generate Final Files` | ⚠️ Differs from story spec "Proceed to Final Generation" |
| Workflow step bar | `⚙️ Customise` | ⚠️ British spelling; inconsistent with other step labels |
| Tab bar | `📊 Experiences` / `📊 ATS Score` | ❌ Same icon for two different tabs — icon collision |
| Tab bar | `✏️ Experience Bullets` / `✏️ Rewrites` | ❌ Same icon for two different tabs — icon collision |
| `index.html:95` | `aria-label="Layout freshness"` on freshness chip | ⚠️ Static; does not reflect current state |

---

## Evidence Summary

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
|-------|--------|-----------|--------|------------|
| US-U1: Workflow Orientation | 3 | 2 | 0 | 0 |
| US-U2: Job Input UX | 4 | 1 | 0 | 0 |
| US-U3: Analysis Readability | 2 | 2 | 1 | 0 |
| US-U4: Review Table Interaction | 4 | 1 | 1 | 0 |
| US-U5: Rewrite Review | 4 | 0 | 1 | 0 |
| US-U6: Generation Feedback | 2 | 2 | 0 | 1 |
| US-U7: Accessibility | 4 | 2 | 0 | 0 |
| US-U8: Responsive / Performance | 1 | 2 | 1 | 0 |
| US-U9: Layout Review UX | 4 | 1 | 0 | 0 |
| **Total** | **28** | **13** | **4** | **1** |

**Key source file references:**

- Workflow bar state classes: `web/styles.css:149–159`
- `updateWorkflowSteps()`: `web/workflow-steps.js:683–714`
- Job input tab switching: `web/job-input.js:107–111, 190–196`
- Protected-site modal: `web/job-input.js:471–529`
- Intake confirm card: `web/message-dispatch.js:420–463`
- Paste char count: `web/job-input.js:320–336`
- Analysis tab rendering: `web/review-table-base.js:271–368`
- Mismatch callout: `web/review-table-base.js:300–310`
- Keyword rank badges: `web/review-table-base.js:336–342`
- Experience bulk toolbar: `web/experience-review.js:241–248`
- Word-level diff: `web/rewrite-review.js:183–226`
- Rewrite card controls: `web/rewrite-review.js:272–275`
- Modal focus management: `web/ui-core.js:239–347`
- Tab ARIA keyboard nav: `web/ui-core.js:509–541`
- Layout scope label: `web/layout-instruction.js:293`
- Layout undo stack: `web/layout-instruction.js:50, 1119–1134`
- Layout proceed button: `web/layout-instruction.js:379–381`
- Output filename convention: `scripts/utils/cv_orchestrator.py:1432`
- Freshness chip aria-label: `web/index.html:95`
- `outline: none` scoping: `web/styles.css:577–578` (resolved), `1584` (residual)
