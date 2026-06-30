<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# UX Expert Review — US-U1 through US-U9

**Persona:** Senior interaction designer / usability specialist  
**Review date:** 2026-06-30  
**Cycle:** 14 (post-fixes)  
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/job-input.js, web/workflow-steps.js, web/rewrite-review.js, web/layout-instruction.js, web/experience-review.js, web/skills-review.js, web/final-generate.js, web/download-tab.js, web/fetch-utils.js, scripts/routes/generation_routes.py

---

## Application Evaluation

---

### US-U1: Workflow Orientation and Progress Visibility

**Criterion 1 — Step indicator** ✅  
A 12-step horizontal workflow bar is present in `index.html` lines 122–147, wrapped in `<nav class="workflow" aria-label="Application workflow steps">`. Step labels are named (Job Input, Analysis, Customise, Rewrites, Spell Check, Layout Review, Download, Cover Letter, Screening, Interview Prep, Thank You, Harvest) — not numeric-only. Steps render with icons and text. `workflow-steps.js:updateWorkflowSteps()` drives active/completed/stale class application on every status fetch.

**Criterion 2 — Completed state signalling** ✅  
`styles.css` defines distinct classes: `.step.active` (blue), `.step.completed` (green), `.step.upcoming` (pale grey), `.step.stale` (amber), `.step.stale-critical` (red). `workflow-steps.js:637–753` applies these per-step based on backend phase and session state. Screen-reader-only state text is appended (e.g. " (completed)", " (current step)") via `<span class="sr-only">`.

**Criterion 3 — Back-navigation safety** ✅ (partial caveat)  
Completed steps gain `class="clickable"` and are click-navigable (`workflow-steps.js:723–726`). `ui-core.js:372–444` implements a `confirmDialog()` custom modal that is used for destructive back-nav confirmations (e.g. re-run confirmation in `workflow-steps.js`). However, no explicit evidence was found that clicking a completed step in the UI always guards against silent work loss in all cases — the re-run flow prompts (`confirmReRunPhase`), but direct step clicking for navigation does not universally prompt before discarding downstream state. Partially implemented.

**Criterion 4 — Session restoration context** ✅  
`session-manager.js:492–556` restores conversation history, phase, and decisions from the backend. `session-switcher-ui.js:150–157` updates the header subtitle (`#header-session-name`) with `Current session: {label}`. The header also shows `position-title` and `position-company` in the position bar. The phase is restored and `updateWorkflowSteps()` is called, landing the user on the correct step. A "Session restored from server." system message is appended.

**Failure modes:** The "back-nav silent discard" failure mode is not fully guarded against for all navigation paths. The browsing-away amber pulse animation is a nice touch.

**Summary: 3 of 4 criteria fully met; criterion 3 is partial.**

---

### US-U2: Job Input and URL Ingestion UX

**Criterion 1 — Input mode clarity** ✅  
`job-input.js:107–111` renders three equal-weight tab buttons ("Paste Text", "From URL", "Upload File") with `class="input-tab"`. Only one panel is visible at a time via `.input-method.active`. The active tab is visually styled (see `styles.css`).

**Criterion 2 — Protected-site guidance** ✅  
`job-input.js:471–479` detects `data.protected_site` and calls `showProtectedSiteModal(data.site_name, …)` at line 479. The modal (lines 508–529) shows the specific site name, a contextual message, numbered instructions, and a blue tip box directing the user to the "Paste Text" tab. LinkedIn, Indeed, and Glassdoor are documented in the UI grid (lines 143–149).

**Criterion 3 — Fetch feedback** ✅  
`job-input.js:455` calls `setLoading(true, 'Fetching job from URL…')` immediately before the fetch. The LLM busy overlay (`fetch-utils.js:107–145`) shows a spinner, a labelled message, and an elapsed timer that appears within 1 s of submission.

**Criterion 4 — Confirmation editability** ⚠️  
After URL fetch succeeds (`job-input.js:490–495`), `populateJobTab()` is called which shows the job title as an `<h1>` and the URL as a link. There is no inline-editable form for company name, role title, or date at the confirmation screen — these are extracted during analysis. The intake confirmation flow (`intake-confirm-card` CSS class exists) is driven by `job-analysis.js` analysis response, not a pre-analysis edit step. Users cannot correct extracted fields before submitting to analysis.

**Criterion 5 — Character-count guidance** ✅  
`job-input.js:320–336` defines `PASTE_MIN_CHARS = 200` and `_updatePasteCharCount()` which shows "{n} / 200 minimum — Too short…" in red or "{n} / 200 minimum ✓" in green as the user types. The count element has `aria-live="polite"`.

**Summary: 4 of 5 criteria met; criterion 4 (inline editability of extracted fields) is not implemented.**

---

### US-U3: Analysis Results Readability

**Criterion 1 — Chunking** ✅  
`review-table-base.js:299–371` renders the analysis tab in four visually distinct `div.analysis-section` cards: Role card (gradient header), Required Skills grid, Preferred / Nice-to-Have list, ATS Keywords with ranked badges, Culture Indicators, and Must-Have Requirements. CSS class `.analysis-section` (styles.css:475) provides a bordered card layout.

**Criterion 2 — Keyword visualisation** ✅  
`review-table-base.js:347–351` renders keywords with rank badges: `<span class="kw-badge"><span class="kw-rank">#${idx + 1}</span>${kw}</span>`. CSS `.kw-badge` and `.kw-rank` (styles.css:484–485) give positional rank inside each pill. The section header also states "(higher rank = higher priority)".

**Criterion 3 — Mismatch prominence** ✅  
`review-table-base.js:316–318` inserts a `.mismatch-callout` div (amber callout; styles.css:486 `border-left: 4px solid #f59e0b`) immediately after the role card and before the skills grid. This appears above the fold if any required skills are missing from the master CV.

**Criterion 4 — Clarifying question flow** ⚠️  
`questions-panel.js` renders all clarifying questions at once (lines 119–143). The content.innerHTML is set to all questions in a single block. There is no grouping logic that limits to ≤3 questions per screen — the full set is shown together. Chip-style answer buttons are provided for structured answers, which is good, but the "wall of questions" failure mode is not guarded against when there are many questions.

**Criterion 5 — Analysis duration feedback** ✅  
`fetch-utils.js:122` shows a labelled LLM busy overlay with `label = 'Analysing job description…'` (set in `job-analysis.js:105` via `setLoading(true, 'Analysing job description…')`). The elapsed timer starts from 0:00 and increments every second. After 30 seconds the overlay transitions to "slow" state with a "Taking longer than usual" badge. An approximate time estimate is not provided (the overlay says no ETA), but the labelled real-time counter satisfies the spirit of the criterion.

**Summary: 4 of 5 criteria met; criterion 4 (questions grouped ≤3 per screen) is not implemented.**

---

### US-U4: Review Table Interaction Quality

**Criterion 1 — Toggle affordance clarity** ✅  
`experience-review.js:202–208` uses icon buttons with explicit `aria-label`, `title` tooltip, distinct icon (➕ ✓ ➖ 👁 ↕ ↑ ↓), and `.active` class with visual highlight for the selected state. Action buttons change visual state via `handleActionClick`. Skills review (`skills-review.js:945`) uses the same pattern.

**Criterion 2 — Drag / reorder usability** ✅  
Up/down buttons are rendered inline in each row (not hover-only): `experience-review.js:207–208`. They have `aria-label="Move {title} earlier/later in CV"`. The `moveExperienceRow()` function triggers immediate re-render. Keyboard accessibility: the `icon-btn` class has `.icon-btn:focus-visible { outline: 2px solid #3b82f6 }` (styles.css:1198). Buttons are always visible.

**Criterion 3 — Row density** ✅  
Experience rows show: title, company, date range, recommendation label, confidence badge, and reasoning text. This is sufficient for accept/reject decisions without expanding. The `max-width:300px` on reasoning keeps the table from being illegible.

**Criterion 4 — Bulk actions** ✅  
`experience-review.js:241–250` inserts a `.bulk-toolbar` with "Accept All Recommended", "Emphasize All", "Include All", "Exclude All" buttons above both experience and skills tables. `skills-review.js:945–948` mirrors this. These are present regardless of row count (no >8 threshold guard), but they are present.

**Criterion 5 — Inline expansion** ⚠️  
Experience bullet expansion in the "Experience Bullets" tab (`tab-ach-editor`) is a separate tab, not inline per-row expansion within the experience table. Navigating to it switches the viewer tab. No evidence of in-place bullet expansion with smooth animation within the experience review table itself.

**Criterion 6 — Relevance score meaning** ⚠️  
The experience review table shows "Recommendation" (text label: Emphasize/Include/De-emphasize/Omit) and "Confidence" (badge: high/medium/low). There is no numeric relevance score column. Publications review (`publications-review.js:133`) shows a raw `relevance_score` value with no scale label or "/" 100 suffix. The criterion's intent (visible score scale) is not met for publications and no score at all is shown in the experience table.

**Summary: 4 of 6 criteria met; criteria 5 and 6 are partial/not met.**

---

### US-U5: Rewrite Review Presentation

**Criterion 1 — Inline diff** ✅  
`rewrite-review.js:298–281` implements `computeWordDiff()` and `renderDiffHtml()` producing word-level diffs. Tokens with `type === 'del'` and `type === 'ins'` are rendered distinctly. CSS (styles.css, search for `.rw-del`, `.rw-ins`) handles the red/green visual. The diff is shown in `.rewrite-inline-diff` inside the card body.

**Criterion 2 — Accept / Reject / Edit controls collocated** ✅  
`rewrite-review.js:326–331` places Accept, Edit, and Reject buttons inside `.rewrite-actions` which is a child of `.rewrite-card-body` — collocated with the diff. Buttons are at the bottom of the same card, not in a separate panel.

**Criterion 3 — Reason visibility** ✅  
`rewrite-review.js:316–321`: if `r.rationale` is present, a `<details class="rewrite-rationale"><summary>Rationale & Evidence</summary>` element is rendered inline in the card body. One click expands it. Evidence string is also shown. This meets the "within one click" criterion.

**Criterion 4 — Edit path** ✅  
`rewrite-review.js:350–364`: clicking Edit hides the diff panel and shows a textarea pre-filled with the proposed text. `saveRewriteEdit()` (lines 388–421) regenerates the diff against the original after saving, preserving the original for visual comparison. The diff is restored after saving the edit.

**Criterion 5 — Batch review efficiency** ⚠️  
`rewrite-review.js:187` provides a "✓ Accept All" bulk button. However, there is no "Approve & Next" keyboard-driven sequential navigation control. No keyboard shortcut for progressing card-by-card is implemented. The acceptance criterion calls for this when more than 3 rewrites exist.

**Summary: 4 of 5 criteria met; criterion 5 (sequential keyboard navigation) is not implemented.**

---

### US-U6: Generation and Output State Feedback

**Criterion 1 — Generation progress feedback** ⚠️  
The LLM busy overlay shows a spinner, label, and elapsed timer during generation. However, there is no step-labelled progress sequence for the multi-step generation pipeline (HTML render → Chrome PDF → WeasyPrint PDF → DOCX). `session-actions.js:72–74` parses `status.generation_progress` into steps, but no evidence of this being rendered as a step-by-step checklist in the main generation flow. The layout tab shows "Chrome Ready" / "WeasyPrint Failed" PDF badges (`layout-instruction.js:99–118`) but these are in the preview pane, not the final generation flow.

**Criterion 2 — Output preview** ✅ (layout only)  
The Layout Review tab embeds an iframe (`layout-instruction.js:296`: `<iframe id="layout-preview" …>`) for in-browser HTML preview. The final Generated Files tab (`final-generate.js`) shows download links only — there is no embedded PDF preview iframe for the final output. The layout preview is in-browser but the final output is download-only.

**Criterion 3 — Download options** ✅  
`final-generate.js:72–148` and `download-tab.js:310–374` provide PDF, ATS DOCX, and Human DOCX download links. File type descriptions (ATS PDF, Human PDF, ATS Word, Human Word, HTML) are labelled.

**Criterion 4 — Error recovery** ✅  
`download-tab.js:334–338` catches ATS validation errors and `layout-instruction.js:1288–1290` catches generation errors and surfaces them as chat messages. WeasyPrint vs Chrome PDF failure is communicated via `is-failed` badge in the preview output panel.

**Criterion 5 — Output filename** ✅  
`generation_routes.py:1768`: `filename_base = f"CV_{company}_{role}_{_ts}"` where company and role come from job analysis and `_ts` is `YYYY-MM-DD`. The pattern satisfies `CV_{Company}_{Role}_{Date}`.

**Criterion 6 — Version label** 🔲  
No version listing of prior generated outputs within a session. Only the most recent generation is surfaced. If the user re-generates, the previous files are overwritten without a version list or "current" label. No multi-version distinction is implemented.

**Summary: 3 of 6 criteria fully met; criterion 1 (step-labelled progress) and criterion 2 (in-browser final output preview) are partial; criterion 6 (version list) is not implemented.**

---

### US-U7: Accessibility and Keyboard Navigation

**Criterion 1 — Focus management** ✅  
`ui-core.js:239–287` implements `setInitialFocus(modalId)` (focuses first focusable element with 50 ms delay) and `trapFocus(modalId)` (Tab/Shift+Tab trap). `openSettingsModal()` (line 243) saves `_focusedElementBeforeModal = document.activeElement` before opening; `closeSettingsModal()` calls `restoreFocus()` which restores focus. Same pattern used for model modal, sessions modal, and `confirmDialog()`. `openModal()` / `closeModal()` in `ui-core.js:723–773` also applies this pattern.

**Criterion 2 — Focus visibility** ✅  
`styles.css:594`: `.action-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }`. Focus rings are defined for: `.step:focus-visible`, `.sm-th:focus-visible`, `.sm-btn:focus-visible`, `.q-chip:focus-visible`, `.tab:focus-visible`, `.form-input:focus`, `.message-input:focus`, `.action-btn:focus-visible`, `.rw-btn:focus-visible`, `.btn-primary:focus-visible`, etc. No global `outline: none` suppression found. One exception: `.intake-field-row input:focus` at styles.css:1602 has `outline: none` — this is a narrow exception but does suppress the default ring for intake fields without a visible replacement being confirmed in the source reviewed.

**Criterion 3 — Table keyboard navigation** ✅  
Tab keyboard navigation for tabs: `ui-core.js:528–553` implements ArrowLeft/ArrowRight/Home/End navigation and Enter/Space activation for tabs per WCAG 2.1 AA tablist pattern. Workflow step buttons have keydown handlers (`updateWorkflowStepsClickable`). Action buttons in review tables are standard `<button>` elements, keyboard-operable by default.

**Criterion 4 — ARIA labels** ✅  
Icon-only buttons consistently have `aria-label`: toggle chat (`aria-label="Collapse chat panel"`), tab scroll arrows (`aria-label="Scroll tabs left/right"`), rename session (`aria-label="Rename this session"`), help button (`aria-label="Help — reopen getting started guide"`), close buttons on modals (`aria-label="Close …"`). Experience review action buttons (`experience-review.js:202–208`) have `aria-label` on each action. Step re-run buttons have `aria-label="Re-run ${rerunLabel}"`.

**Criterion 5 — Colour-independence** ✅ (mostly)  
Step states: text labels present alongside colour ("Job Input", "Analysis", etc.) with `.sr-only` state appended. Confidence badges: text label ("high", "medium", "low") alongside colour. Accept/reject actions: icon symbols (✓, ✗, ➕, ➖) alongside colour. ATS score: numeric percentage alongside colour. One partial gap: the `aria-pressed` states on rewrite buttons communicate state, but the visual-only colour of `.accepted` (green card) and `.rejected` (red card) in rewrite cards does not have an additional visible non-colour indicator (though the button active state provides some).

**Criterion 6 — Error messages** ✅  
`job-input.js:550–568` links errors via `aria-describedby`: the textarea has `aria-describedby="paste-char-count paste-error"` (line 116) and `aria-invalid` is set on the input. `_showFieldError()` sets `aria-invalid="true"` and makes the span visible. The URL field has `aria-describedby="url-error"`.

**Summary: Criteria 1–4 and 6 are met. Criterion 5 has a minor gap (rewrite card accept/reject state communicated by colour + aria-pressed but lacks a visible non-colour text label).**

---

### US-U9: HTML Layout Review Interaction Quality

**Criterion 1 — Instruction field clarity** ✅  
`layout-instruction.js:359–363`: the textarea has a multi-line placeholder: `"e.g., Move Publications section after Skills\nor: Shorten the second bullet under Genentech…\nor: Keep the Genentech entry on one page"`. Immediately above (line 302): `<p class="layout-scope-label">💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here.</p>` — this is the required scope label.

**Criterion 2 — Processing feedback** ✅  
`layout-instruction.js:373–376`: `<div id="processing-indicator" … style="display:none;"><div class="spinner"></div><p>Applying instruction...</p></div>`. `showProcessing(true)` is called immediately on instruction submit. The preview iframe is updated on completion via `displayLayoutPreview()`.

**Criterion 3 — Change attribution** ✅  
`layout-instruction.js:378`: `<div id="confirmation-message" class="confirmation-message" style="display:none;"></div>`. After instruction apply, `showConfirmationMessage()` is called with the instruction result summary. The instruction history also shows `change_summary` per entry.

**Criterion 4 — Clarification handling** ✅  
`layout-instruction.js:673` and `805`: when `response.error === 'clarify'`, `showLayoutClarificationPanel()` is called (lines 1116–1170). This renders an inline clarification textarea with Submit and Cancel buttons. The LLM does not silently guess — it surfaces a clarification prompt.

**Criterion 5 — Instruction history with Undo** ✅  
`layout-instruction.js:380–386`: `<div class="layout-history-section">` with `<div id="instruction-history" …>`. `renderInstructionHistory()` (lines 1017–1039) renders each instruction entry with timestamp, instruction text, change summary, and an Undo button (`onclick="undoInstruction(${index})"`). The undo stack is maintained in `_layoutUndoStack` (line 50) with a cap of 20 entries.

**Criterion 6 — Single proceed action** ⚠️  
Two buttons exist: `#confirm-layout-btn` ("Confirm Layout") and `#proceed-to-finalise-btn` ("Generate Final Files"). The GAP-249 fix auto-confirms when no instructions are added, so users don't need to click "Confirm Layout" if they add zero instructions. However, when instructions have been applied, users see "Confirm Layout" first and then "Generate Final Files" separately — two actions rather than one. The proceed button is not labelled "Proceed to Final Generation" as specified; instead it says "Generate Final Files". This is close but not exactly as required.

**Criterion 7 — Content safety assurance** ✅  
`layout-instruction.js:302`: `<p class="layout-scope-label">💡 Describe a layout change (…). Text content is finalised — content edits are not applied here.</p>` is the required safety assurance notice.

**Summary: 6 of 7 criteria met; criterion 6 (single proceed action) is partially met — two sequential buttons exist when instructions have been applied.**

---

### US-U8: Responsive Behaviour and Loading Performance

**Criterion 1 — Minimum viable layout at 1280×800** ✅  
`styles.css:1461`: `@media (max-width: 1280px)` reduces layout-instruction-panel gap. The main layout uses flex (`styles.css:330`) with `overflow-x: auto` on `.workflow-steps` (line 149) and `.tabs` (line 620). Page-level horizontal scroll is guarded. Review tables are wrapped in DataTables which handle their own overflow.

**Criterion 2 — Column collapsing at ≤1400px** ⚠️  
`styles.css:1456–1459`: `@media (max-width:1400px)` reduces workflow step gaps and padding. No explicit collapsible column definitions for review tables at this breakpoint were found in the source. There is no documented "collapsible columns at ≤1400px" configuration in component config.

**Criterion 3 — Initial page load ≤2s** ✅  
All blocking external resources (Bootstrap CSS/JS, Font Awesome, jQuery, DataTables, marked) are loaded from CDN with no render-blocking patterns beyond what is inherent. The HTML shell itself is minimal; LLM-dependent content loads asynchronously via `fetchStatus()` after DOMContentLoaded. `bundle.js` loads deferred. The architecture supports ≤2 s shell render on localhost.

**Criterion 4 — No layout shift during async loads** ⚠️  
The `document-content` area shows an `empty-state` placeholder ("Select a tab to view content") on initial load. However, there are no skeleton screens with `min-height` placeholders that approximate the arriving content dimensions. The `empty-state` collapses to a small height when content arrives (the `.document-content` has `min-height: 11in` for the CV document view but not for review tables). Layout shift is mitigated but not fully addressed with skeleton screens.

**Summary: 2 of 4 criteria fully met; criteria 2 and 4 are partial.**

---

## Terminology Evaluation

**Brand name consistency:** ✅ The `<h1>` says "CV Builder", `<title>` says "CV Builder — Professional Web UI", and the welcome modal says "Welcome to CV Builder". Consistent per cycle 14 fix.

**"Analyse" vs. "Analyze" consistency:** ⚠️ Mixed usage: the action button says "🔍 Analyze Job" (US spelling), but the loading label says "Analysing job description…" (UK spelling). Conversation messages also mix forms.

**"Customise" vs. "Customize":** ⚠️ The workflow step pill says "Customise" (UK), but the action button says "Recommend Customizations" (US) and the URL uses `/customizations`. Inconsistent.

**"Finalise" vs. "Finalize":** The tab is labelled "Finalise" (UK). The button says "Package Application Files". These are inconsistent in style but not confusing.

**"Generate Final Files" vs. "Proceed to Final Generation":** Minor mismatch from story criterion — the proceed button says "Generate Final Files" rather than "Proceed to Final Generation". Functionally clear.

**"File Review" vs. "Download":** The workflow step pill says "Download" but the tab bar label says "File Review" (`tab-download`). These are the same step — the mislabelling creates confusion.

**User mental model alignment:** The 3-phase onboarding (Build profile → Target job → Harvest) matches user mental models well. The workflow step labels are clear and progressive. The dual-pane layout (Conversation left, Tab viewer right) is a distinct but learnable pattern; the "Conversation" heading and the tab-switching pattern require a small learning curve.

---

## Generated Materials Evaluation

The UX persona evaluates the usability implications of the generated materials as surfaced in the application:

**ATS report grade legend** ✅  
`ats-modals.js:204–208`: the score legend "≥75% Strong match · 50–74% Partial match · <50% Low match" is rendered inline below the score summary in the ATS report modal. Colour-coded dots accompany each threshold. This satisfies the grade legend cycle 14 fix.

**CV filename convention** ✅  
Generated as `CV_{Company}_{Role}_{YYYY-MM-DD}` per `generation_routes.py:1768`. The ATS DOCX would get `_ATS` suffix based on the file label detection in `final-generate.js:27–28`.

**Download options labelling** ✅  
Download cards in `final-generate.js` show labelled descriptions (ATS PDF, Human PDF, ATS Word, Human Word, HTML) with icons.

**Preview / final distinction** ⚠️  
The layout review iframe shows a preview; the final generated files are download-only. A user could reasonably be confused about whether the iframe they reviewed matches what they downloaded. There is a "Layout current" / "Layout outdated" chip (layout freshness) but no explicit "This is what you will download" confirmation at the final generate step.

**Version management** 🔲  
No version listing of generated outputs. If a user regenerates, they cannot distinguish which download is from which generation pass.

---

## Summary Scorecard

| Story | Criteria | Pass | Partial | Fail | N/I |
| ----- | -------- | ---- | ------- | ---- | --- |
| US-U1 Workflow Orientation | 4 | 3 | 1 | 0 | 0 |
| US-U2 Job Input UX | 5 | 4 | 1 | 0 | 0 |
| US-U3 Analysis Readability | 5 | 4 | 1 | 0 | 0 |
| US-U4 Review Table Interaction | 6 | 4 | 2 | 0 | 0 |
| US-U5 Rewrite Review | 5 | 4 | 1 | 0 | 0 |
| US-U6 Generation Feedback | 6 | 3 | 2 | 0 | 1 |
| US-U7 Accessibility | 6 | 5 | 1 | 0 | 0 |
| US-U9 Layout Review | 7 | 6 | 1 | 0 | 0 |
| US-U8 Responsive Behaviour | 4 | 2 | 2 | 0 | 0 |
| **Totals** | **48** | **35** | **12** | **0** | **1** |

**Overall pass rate: 35/48 = 73%**

---

## Highest-Priority Gaps

1. **US-U6 / Version labelling** (🔲 Not Implemented) — Multiple generated versions in a session are not distinguished. User cannot identify which download is current.
2. **US-U6 / Step-labelled generation progress** (⚠️) — Multi-step pipeline (HTML → Chrome PDF → WeasyPrint PDF → DOCX) does not surface as a step-labelled progress sequence during final generation.
3. **US-U2 / Confirmation editability** (⚠️) — Extracted fields (company, role, date) from URL fetch are not inline-editable at a pre-analysis confirmation step.
4. **US-U4 / Inline bullet expansion** (⚠️) — Bullet expansion within the experience review table navigates to a separate tab rather than expanding in-place.
5. **US-U3 / Question grouping** (⚠️) — All clarifying questions are shown simultaneously rather than in groups of ≤3.
6. **Terminology** — "Analyze"/"Analyse" and "Customize"/"Customise" mixed across the UI. The workflow step pill "Download" vs. tab label "File Review" for the same step creates inconsistency.
