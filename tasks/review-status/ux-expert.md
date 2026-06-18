# UX Expert Review Status

**Last Updated:** 2026-06-18 14:30 ET

**Executive Summary:** The application demonstrates strong UX fundamentals across many criteria: the workflow step bar is clearly labelled and updates without page reload; the job input panel provides excellent tab-based URL/paste/file separation with protected-site detection and character count guidance; the rewrite review renders inline diffs with collocated controls; and the layout review panel has an instruction history with per-entry undo. Significant gaps remain in five areas: (1) the workflow step bar shows named stages but no visual distinction for completed vs. upcoming steps during a session (CSS classes exist but step styling relies solely on JS-driven class updates that are not always applied); (2) clarifying questions during analysis are not grouped — all questions appear at once as a wall form; (3) the generation progress in the `sendAction('generate_cv')` path is text-only in the chat panel rather than step-labelled with checkmarks in the viewer; (4) the layout instruction scope label does not communicate the content-safety guarantee (it says "a layout or text change" rather than "approved text is never changed"); (5) no skeleton/minimum-height placeholders exist for most async-loaded content areas, creating cumulative layout shift.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

**Criterion 1 — Step indicator**
⚠️ Partial — A persistent horizontal step bar is present (`index.html` lines 117–143) showing 13 named stages (Job Input → Analysis → Customise → Rewrites → Spell Check → Layout Review → Download → Cover Letter → Screening → Interview Prep → Thank You → Harvest). Stage labels are emoji + text (meaningful, not numeric-only). However, the step bar is a flat list of `<div class="step">` elements; distinguishing state (active/completed/upcoming) depends entirely on JavaScript adding `.active`, `.completed`, or `.upcoming` CSS classes (`styles.css` lines 150–154). The `updateWorkflowStepsClickable()` function in `ui-core.js` (lines 1841–1898) gates clickability by phase, but no source evidence shows `.completed` class being systematically applied to steps that have been passed. The step bar only shows the current step highlighted (active); earlier steps do not consistently render as "completed" vs. upcoming.

**Criterion 2 — Completed state signalling**
⚠️ Partial — CSS defines `.step.completed { background: #dcfce7; color: #166534 }` (`styles.css` line 152) and `.step.upcoming { background: #f8fafc; color: #cbd5e1 }` (line 154), showing the design intent is correct. But source evidence does not confirm that `workflow-steps.js` or `api-client.js` systematically applies `.completed` after each phase transition. The `PHASE_TO_STEP` mapping in `state-manager.js` (lines 35–45) maps one phase to one step name, but no code found adds `.completed` to all steps before the current one. Steps appear as either active or default grey.

**Criterion 3 — Back-navigation safety**
✅ Pass — `updateWorkflowStepsClickable()` (`ui-core.js` lines 1841–1898) marks earlier sequential steps as `.clickable` (not just the current one), enabling back navigation. `confirmDialog()` (`ui-core.js` lines 372–419) provides a custom modal dialog used throughout for destructive actions. Session state is persisted to backend and localStorage; returning to a prior step re-reads from the server's authoritative session state. `workflow-steps.js` re-run logic gates destructive resets on explicit confirmation.

**Criterion 4 — Session restoration context**
✅ Pass — `restoreSession()` (`session-manager.js` lines 397–457) restores conversation history, phase (`stateManager.setPhase(historyData.phase)`), and backend state. On load, `init()` (`app.js` lines 41–103) calls `restoreSession()`, then `fetchStatus()`, then switches to the last-known tab. The position bar (`index.html` lines 69–107) shows job title and company once loaded. `header-session-name` (`index.html` line 41) shows session name in header.

**Criterion 4b — Stage indicator updates without reload**
✅ Pass — `stateManager.onPhaseChange()` (`state-manager.js` line 322; `ui-core.js` lines 1919–1924) triggers `updateWorkflowStepsClickable(phase)` on each phase change event without page reload.

**Failure Modes Assessment:**

- "Linear next/back with no state labels" — Mitigated by named steps bar.
- "Back navigation silently discards approved content" — Mitigated by confirmDialog usage.
- "Blank state on session return" — Mitigated by restoreSession().
- "Progress only updates after reload" — Mitigated by onPhaseChange listener.

---

### US-U2: Job Input and URL Ingestion UX

**Criterion 1 — Input mode clarity**
✅ Pass — `showLoadJobPanel()` (`job-input.js` lines 91–184) renders three clearly-labelled tab buttons: "📝 Paste Text", "🔗 From URL", "📁 Upload File". Each is an `.input-tab` with `.active` class styling (`styles.css` lines 1288–1292). Panels are `.input-method` with only the active one shown (`display: block`). Equal-weight, clearly differentiated — not nested or hidden.

**Criterion 2 — Protected-site guidance**
✅ Pass — `fetchJobFromURL()` (`job-input.js` lines 436–506) checks `data.protected_site` and calls `showProtectedSiteModal(data.site_name, data.message, data.instructions)`. The modal (`job-input.js` lines 508–530) shows site-specific instructions and a numbered step list. The URL tab also proactively shows a two-column guidance panel naming LinkedIn, Indeed, and Glassdoor with specific "copy manually" instructions (`job-input.js` lines 140–149) — visible immediately without waiting for a failed fetch.

**Criterion 3 — Fetch feedback**
✅ Pass — `fetchJobFromURL()` calls `setLoading(true, 'Fetching job from URL…')` (`job-input.js` line 455) immediately before the fetch call. `setLoading()` in `fetch-utils.js` shows a progress bar and overlay. Network errors show via `_showFieldError` and `appendRetryMessage`.

**Criterion 4 — Confirmation editability**
⚠️ Partial — The intake confirmation flow (GAP-23, referenced in `job-input.js` line 23 comment) routes through `analyzeJob()` post-submission. The `intake-confirm-card` component (`styles.css` lines 1543–1587) with `.intake-field-row input` shows editable fields exist. However, the inline extraction of company name, role title, and date into editable fields within a confirmation step is handled via the analysis flow, not the job input step itself. The confirmed fields are editable only after analysis completes — not at the job text confirmation step. Partial pass: fields exist and are editable, but the confirmation UI lives in the post-analysis phase rather than at submission time.

**Criterion 5 — Character-count guidance**
✅ Pass — `PASTE_MIN_CHARS = 200` (`job-input.js` line 320). `_updatePasteCharCount()` (lines 322–337) shows `"N / 200 minimum — Too short…"` in red when below threshold, and `"N / 200 minimum ✓"` in green when passing. The count element has `aria-live="polite"` and is coloured appropriately.

---

### US-U3: Analysis Results Readability

**Criterion 1 — Chunking**
✅ Pass — `styles.css` lines 468–486 define `.analysis-role-card`, `.analysis-section`, `.skill-grid`, `.skill-badge`, `.preferred-list`, `.kw-badges`, `.kw-badge`, and `.mismatch-callout` — distinct visual components for each analysis section. The `job-analysis.js` module uses these to render required qualifications, preferred qualifications, keywords, and role/domain sections as distinct cards.

**Criterion 2 — Keyword visualisation**
✅ Pass — `.kw-badge` (`styles.css` line 483) renders keywords with `.kw-rank` — a positioned rank number inside each badge (`position: absolute; left: 7px`). Keywords are rendered as individual styled badges with rank numbers visible, not a flat comma-separated list.

**Criterion 3 — Mismatch prominence**
✅ Pass — `.mismatch-callout` (`styles.css` line 485) renders with `background: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e` — a visible amber callout. The class `.skill-badge.missing` (`styles.css` line 478) shows missing skills in `background: #fee2e2; color: #dc2626` (red).

**Criterion 4 — Clarifying question flow**
❌ Fail — `questions-panel.js` renders all post-analysis questions simultaneously. The `.questions-panel` CSS (`styles.css` lines 489–512) shows all `.question-item` blocks in one scrollable list. No evidence of grouping into batches of ≤3 questions; no sequential reveal or "confirm before next group" flow. Questions use chip-style answer buttons (`.q-chip`) which is good, but the all-at-once presentation violates the criterion.

**Criterion 5 — Analysis duration feedback**
⚠️ Partial — `setLoading()` in `fetch-utils.js` shows a top-of-page progress bar and the `#llm-busy-overlay` appears with a spinner, elapsed time, and label. The `#llm-busy-label` (`index.html` line 155) is set to `"Reasoning…"` — this is present but does not show analysis-specific text ("Analysing job description against your CV…") or an estimated duration. The loading label is generic rather than informative about the specific operation.

---

### US-U4: Review Table Interaction Quality

**Criterion 1 — Toggle affordance clarity**
✅ Pass — `.icon-btn` (`styles.css` lines 1164–1191) renders 32×32px icon buttons with clear visual state: `.icon-btn.active { background: #10b981; color: #fff; border-color: #059669 }`. Accept (green) and reject (eye-slash icon) states are visually distinct and large enough to be legible at distance. All accept/reject buttons in publications, experiences, and skills tables use this component.

**Criterion 2 — Drag/reorder usability**
⚠️ Partial — The skills review table uses up/down arrow icon buttons for reordering (via `review-table-base.js`). Buttons are always visible (not hover-only based on CSS review). However, no evidence of keyboard-accessible arrow key shortcuts for reordering; the controls are click-only buttons without documented keyboard alternatives beyond Tab + Enter.

**Criterion 3 — Row density**
✅ Pass — Experience review shows title, role, date range, reasoning, and action buttons per row (`experience-review.js` line 181). Skills table shows skill name, category, and action buttons. Row height is sufficient without being overwhelming per `.review-table td { padding: 8px 12px }` (`styles.css` line 1151).

**Criterion 4 — Bulk actions**
✅ Pass — `experience-review.js` lines 242–248 show a `.bulk-toolbar` with "✨ Accept All Recommended", "➕ Emphasize All", "✓ Include All", and exclude-all buttons. Bulk action infrastructure from `review-table-base.js`. Visible above the table regardless of row count.

**Criterion 5 — Inline expansion**
✅ Pass — The rewrite review and experience bullet expansion uses in-place rendering (`rewrite-card` structure in `styles.css` lines 1232–1270). No evidence of page navigation on expansion. The rewrite cards expand inline with `.rewrite-card-body` content.

**Criterion 6 — Relevance score meaning**
⚠️ Partial — Publications table shows scores as `<strong>${score}</strong>/10` (`publications-review.js` line 153) — the `/10` scale label is present. Experience relevance reasoning is shown as inline text but without a numeric score with scale label. Skills are listed as "sorted by relevance" (`review-table-base.js` line 474) but no per-row numeric score with scale label is shown. Inconsistent across tables.

---

### US-U5: Rewrite Review Presentation

**Criterion 1 — Inline diff**
✅ Pass — `rewrite-review.js` lines 223–224 generate `<del class="diff-removed">` and `<ins class="diff-added">` tokens. CSS (`styles.css` lines 1241–1242): `del.diff-removed { text-decoration: line-through; color: #dc2626; background: #fee2e2 }` and `ins.diff-added { color: #166534; background: #dcfce7 }`. True inline diff with red strikethrough and green addition — not side-by-side boxes.

**Criterion 2 — Accept/Reject/Edit controls collocated**
✅ Pass — `.rewrite-actions` (`styles.css` line 1250) is inside `.rewrite-card-body` which is inside `.rewrite-card`. `.rw-btn.accept`, `.rw-btn.edit`, `.rw-btn.reject` are all within the same card as the diff content (`rewrite-review.js` lines 261+). Controls are not in a separate panel.

**Criterion 3 — Reason visibility**
✅ Pass — `rewrite-review.js` lines 261–264 render `<details class="rewrite-rationale"><summary>…</summary><p>${r.rationale}</p></details>`. The rationale is accessible via one click/tap on the `<summary>` element, without a separate panel navigation. CSS: `details.rewrite-rationale { font-size: 0.85em; color: #6b7280 }` (`styles.css` line 1248).

**Criterion 4 — Edit path**
✅ Pass — `.rw-btn.edit` and `.rewrite-after textarea` (`styles.css` lines 1243–1244) show an edit textarea within the card, and `rewrite-review.js` provides `.rw-save-edit-btn`. The inline diff and the after-text area coexist in the same card, preserving the original for comparison.

**Criterion 5 — Batch review efficiency**
⚠️ Partial — A `.rewrite-tally-bar` (`styles.css` line 1226) is sticky at the top showing accepted/rejected/pending counts and a submit button. Bulk "Accept All"/"Reject All" buttons (`.rw-bulk-btn`) are present. However, no "Approve & Next" sequential keyboard shortcut or step-by-step navigation between cards is implemented. Users must scroll through all cards. The single-page review table with compact toggle controls is present, but keyboard-driven sequential navigation is absent.

---

### US-U6: Generation and Output State Feedback

**Criterion 1 — Generation progress feedback**
⚠️ Partial — The `sendAction('generate_cv')` path (in `session-actions.js` lines 65–85) polls `generation_progress` and renders step labels in the chat area as `"✓ step_name (Xms) • ⏳ next_step"` text. The layout/preview path uses the `#llm-busy-overlay` with a spinner and label. Neither implements the story criterion of step-labelled progress in the viewer with checkmarks before the next step begins. Progress is shown in the chat conversation area as text, not as a structured step-by-step visual in the document viewer.

**Criterion 2 — Output preview**
✅ Pass — The layout review tab renders an `<iframe id="layout-preview" class="layout-preview-iframe">` (`layout-instruction.js` line 287) showing the actual rendered CV HTML. The generated CV is previewable in-browser before downloading.

**Criterion 3 — Download options**
✅ Pass — `download-tab.js` renders `.download-item` entries for each generated file. Generation produces ATS DOCX, Human PDF, and Human DOCX (settings configured in the Settings modal). Multiple download formats are offered.

**Criterion 4 — Error recovery**
⚠️ Partial — `fetchJobFromURL()` and `uploadJobFile()` show user-readable error messages. For generation failures, `sendAction()` catches errors and calls `appendMessage`. However, no evidence of generation-specific error recovery UI (e.g., "Download HTML instead" fallback when WeasyPrint fails) was found in `final-generate.js` or `download-tab.js`.

**Criterion 5 — Output filename convention**
⚠️ Partial — `download-tab.js` line 188 uses `file.filename` from the server response. The filename format depends on the backend. The story criterion calls for `CV_{Company}_{Role}_{Date}` convention but source evidence from the frontend alone does not confirm the backend-generated filename format.

**Criterion 6 — Version label**
🔲 Not Implemented — No evidence of version listing with timestamps and a "current" label for multiple generated versions within a session. The download tab shows the most recently generated files; prior versions are not listed with distinction.

---

### US-U7: Accessibility and Keyboard Navigation

**Criterion 1 — Focus management**
✅ Pass — `setInitialFocus(modalId)` (`ui-core.js` lines 274–287) focuses the first interactive element within 50ms of modal open. `_focusedElementBeforeModal = document.activeElement` saves focus before opening. `restoreFocus()` (lines 336–347) restores it on close. Implemented for Settings, Model, and other modals. `openSettingsModal()` (lines 239–247) and `openModelModal()` (lines 1449–1473) both call `setInitialFocus()` and `trapFocus()`.

**Criterion 2 — Focus visibility**
⚠️ Partial — Several focus styles use `outline: none` with a styled box-shadow replacement: `.message-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px ... }` (`styles.css` line 578), `.form-input:focus { outline: none; border-color: ... }` (line 750), `.intake-field-row input:focus { outline: none; }` (line 1584). The box-shadow replacement is an acceptable UX pattern but `outline: none` on line 577 removes the default outline even without focus on `.message-input`. Coverage is inconsistent: `.sm-th:focus-visible { outline: 2px solid #3b82f6 }` (line 261) and `.preview-output-badge-link:focus-visible` (line 1390) use `focus-visible` correctly in some contexts, but icon buttons in review tables lack explicit focus ring CSS.

**Criterion 3 — Table keyboard navigation**
⚠️ Partial — Tab bar has full arrow-key navigation (`ui-core.js` lines 491–510: ArrowLeft, ArrowRight, Home, End). Text input fields respond to Enter key. The `icon-btn` accept/reject buttons are standard `<button>` elements navigable by Tab and activatable by Space/Enter. However, reorder up/down controls in experience/skills tables do not have documented keyboard shortcuts beyond Tab + Enter to activate the button — no arrow-key shortcut to move a row up/down.

**Criterion 4 — ARIA labels**
✅ Pass — Tab scroll buttons: `aria-label="Scroll tabs left/right"` (`index.html` lines 198, 227). Tab elements: `role="tab" aria-selected="true/false"` (lines 200–225). Modal overlays: `role="dialog" aria-modal="true" aria-labelledby="..."` on all modals (lines 245, 267, 283, 298+). ATS score badge: `aria-label="ATS match score"` (line 87). Publication action buttons: `aria-label="Include/Exclude publication…"` (`publications-review.js`). API key visibility toggle: `aria-label="Show or hide API key"` (`index.html` line 461). Paste field: `aria-describedby="paste-char-count paste-error"` (`job-input.js` line 116).

**Criterion 5 — Colour-independence**
✅ Pass — Accept/reject states use both colour AND icon: accept uses green background + "✓" glyph, reject uses red + eye-slash icon (`review-icons.js`). Status indicators in the LLM badge use colour class AND text label ("Not ready", "Connected"). Analysis section missing skills use red badge with text content. `.auth-badge` states use colour + text label.

**Criterion 6 — Error messages**
✅ Pass — `_showFieldError()` (`job-input.js` lines 550–558) sets `aria-invalid="true"` on the input and shows the error `<span>` with `aria-live="polite"`. `aria-describedby` links input to error span (`job-input.js` line 116). CSS `input[aria-invalid="true"]:focus` (`styles.css` line 1524) provides additional visual feedback.

---

### US-U9: HTML Layout Review Interaction Quality

**Criterion 1 — Instruction field clarity**
⚠️ Partial — The textarea has a multi-line placeholder (`layout-instruction.js` line 353): `"e.g., Move Publications section after Skills\nor: Shorten the second bullet under Genentech…\nor: Keep the Genentech entry on one page"` — an excellent concrete placeholder. However, the scope label (`layout-instruction.js` line 293) reads: `"💡 Describe a layout or text change — the AI will determine the right approach."` This explicitly mentions text changes and does not communicate the content-safety guarantee that approved rewrite text is never altered by layout instructions. The story requires: "Affects layout only — approved text is never changed."

**Criterion 2 — Processing feedback**
✅ Pass — A `.processing-indicator` with a spinner appears while instructions are applied (`styles.css` line 1430). The `#preview-loading-overlay` shows on the iframe while rendering (`layout-instruction.js` lines 281–289). The preview updates on completion.

**Criterion 3 — Change attribution**
✅ Pass — After applying an instruction, `addInstructionToHistory()` (`layout-instruction.js` lines 987+) adds an entry showing the instruction text and AI summary. `appendMessage('assistant', '✅ Layout instruction applied. Preview updated.')` provides a confirmation message.

**Criterion 4 — Clarification handling**
✅ Pass — `layout-instruction.js` line 661: `if (response.error === 'clarify')` triggers `showClarifyDialog()` (lines 1101+), which uses `confirmDialog()` to ask the clarifying question inline before proceeding. Not a silent guess or error.

**Criterion 5 — Instruction history with Undo**
✅ Pass — `#instruction-history` div (`layout-instruction.js` line 376) renders `.instruction-history-entry` items. Each entry includes an `undoInstruction(${index})` button (line 1014). `undoInstruction()` (line 1119+) pops the undo stack and restores the previous state. A collapsible history section with per-entry undo is implemented.

**Criterion 6 — Single proceed action**
⚠️ Partial — The proceed button (`layout-instruction.js` lines 379–381) is labelled "Generate Final Files" — not the story's required "Proceed to Final Generation". The button is initially `display:none` and becomes visible only after preview generation; users who make no layout changes may find the path to proceed less obvious. When visible, it is a single button.

**Criterion 7 — Content safety assurance**
❌ Fail — No UI label, notice, or tooltip communicates that layout instructions cannot alter approved rewrite text. The scope label reads "a layout or text change" — the opposite of the required assurance. Users may reasonably fear that instructions could accidentally overwrite their approved rewrites.

---

### US-U8: Responsive Behaviour and Loading Performance

**Criterion 1 — Minimum viable layout 1280×800**
✅ Pass — The main layout uses flex with `width: 40%` (interaction area) and `width: 60%` (viewer area) (`styles.css` lines 329–371). The workflow step bar uses `justify-content: center; gap: 32px` (line 148). The tab bar uses `overflow-x: auto` (line 615) with scroll buttons, preventing horizontal page scroll. No fixed pixel widths larger than the viewport are applied to the page container.

**Criterion 2 — Column collapsing in tables**
⚠️ Partial — The `.sm-thead` at ≤700px is `display: none` (`styles.css` line 321). `@media (max-width: 1100px)` collapses the layout instruction panel (line 1448). `@media (max-width: 900px)` adjusts the ATS score header (line 127). However, the `review-table` does not have explicit column-collapse breakpoints; `min-width: 250px` on column 5 (line 1159) could cause horizontal table overflow on narrow viewports.

**Criterion 3 — Initial page load ≤2s locally**
✅ Pass — External resources use CDN links (Bootstrap, Font Awesome, jQuery, DataTables, marked). All are deferred or loaded after the HTML shell. The app shell renders without blocking LLM calls. `bundle.js` is a locally-served compiled bundle with no evidence of synchronous blocking server calls before first render.

**Criterion 4 — No layout shift during async loads**
⚠️ Partial — `summary-review.js` line 67 shows a skeleton placeholder ("Generating a tailored summary…") with `min-height: 40px` for the AI summary area. The `#preview-loading-overlay` reserves space in the iframe container. However, most async-loaded tab content (analysis, experience review, skills) replaces the entire `#document-content` with new HTML without skeleton placeholders — a spinner with no minimum height exists, which can cause layout shift when content arrives.

**Criterion 5 — Long table scroll performance**
— N/A — Cannot evaluate scroll performance from static source review alone. DataTables is used for the model catalog table but not the skills/experience review tables. No virtual scrolling was found; CSS containment is not explicitly applied to review tables.

---

## Generated Materials Evaluation

The stories in this file scope evaluation to the web application's workflow and interface. Generated materials (PDF layout, DOCX formatting, cover letter) require reviewing CV template files and generated output samples not included in the source file list for this review. Therefore this section cannot be fully evaluated from source evidence.

For the subset of generated-material concerns visible in the UI:

- **Download filename convention** (US-U6 Criterion 5): ⚠️ Partial — Frontend uses server-provided filename via `file.filename` (`download-tab.js` line 188); convention cannot be confirmed from frontend source alone.
- **Version labelling** (US-U6 Criterion 6): 🔲 Not Implemented — No multi-version listing UI found.
- **Rewrite diff accuracy** (US-U5): ✅ Pass — Diff algorithm in `rewrite-review.js` produces word-level `<del>`/`<ins>` tokens.

---

## Additional Story Gaps / Proposed Story Items

1. **Workflow step completed-state styling** — CSS classes `.completed` and `.upcoming` exist but no consistent code path was found that systematically applies `.completed` to all steps before the current phase. A story should require explicit JS to add `.completed` progressively as phases advance.

2. **Analysis questions grouping** — US-U3 criterion 4 is failed. A story is needed: "Clarifying questions appear in groups of ≤3, each confirmed before the next group is shown." Currently all questions display at once.

3. **Layout scope label content-safety wording** — US-U9 criterion 7 is failed. The scope label needs updating to explicitly state "Affects layout only — approved text is never changed."

4. **Generation output version history** — US-U6 criterion 6 is not implemented. A story is needed for listing generated file versions within a session with timestamps and a "current" indicator.

5. **Keyboard shortcut for rewrite batch navigation** — US-U5 criterion 5 is partially met. "Approve & Next" keyboard shortcut (e.g., `]` or `Alt+Enter`) is not implemented.

6. **Skeleton placeholders for all async content** — US-U8 criterion 4 is partially met. Only the summary tab has a skeleton; analysis, experience, and skills tabs replace content wholesale with no CLS mitigation.

7. **Generation step-progress viewer panel** — US-U6 criterion 1 is partially met. Progress is shown in the chat area as text; a structured step-labelled display in the viewer (with checkmarks as each step completes) would fulfill the criterion.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py (plus supplementary: web/job-input.js, web/rewrite-review.js, web/layout-instruction.js, web/experience-review.js, web/publications-review.js, web/session-manager.js, web/review-table-base.js)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-U1 | 2 | 2 | 0 | 0 | 0 |
| US-U2 | 4 | 1 | 0 | 0 | 0 |
| US-U3 | 3 | 1 | 1 | 0 | 0 |
| US-U4 | 3 | 2 | 0 | 0 | 0 |
| US-U5 | 3 | 1 | 0 | 0 | 0 |
| US-U6 | 2 | 2 | 0 | 1 | 0 |
| US-U7 | 4 | 2 | 0 | 0 | 0 |
| US-U9 | 3 | 2 | 1 | 0 | 0 |
| US-U8 | 2 | 2 | 0 | 0 | 1 |
| **Total** | **26** | **15** | **2** | **1** | **1** |

<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
-->

# UX Expert Review Status
**Last Updated:** 2026-06-18 14:30 ET
**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/job-input.js, web/job-analysis.js, web/review-table-base.js, web/experience-review.js, web/rewrite-review.js, web/layout-instruction.js, web/download-tab.js, web/workflow-steps.js, web/session-manager.js, web/message-queue.js

**Executive Summary:** The application is substantially built and the core workflow is functional. Several US-U1–US-U6 criteria pass with strong source evidence. Key gaps cluster in: (1) US-U1 session-restoration orientation — the user is dropped on a tab but not explicitly shown job identity + stage + timestamp together; (2) US-U3 analysis readability — keywords lack visual rank differentiation in the chat-panel fallback path and mismatch callouts are only conditional on `window._masterSkills` being populated; (3) US-U5 rewrite UX — inline diff is implemented but there is no keyboard-driven "Approve & Next" shortcut; (4) US-U7 accessibility — multiple `outline: none` declarations without adequate styled replacements; and (5) US-U9 layout review — the scope label actively contradicts the story requirement by inviting text changes rather than asserting that approved text is protected. Terminology is generally good but several button labels are inconsistent or developer-centric.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

**AC 1.1 — Stage indicator present and accurate on every step view; active stage is unambiguous.**
✅ **Pass** — `web/index.html:117–143` defines a 12-pill horizontal workflow bar. `workflow-steps.js:692–713` (`updateWorkflowSteps`) applies `.active` (blue), `.completed` (green), `.stale` (amber) CSS classes from `web/styles.css:150–155` on every status poll. Active step is unambiguous at a glance.

**AC 1.2 — Completed steps must be visually distinct from active and upcoming steps.**
✅ **Pass** — `styles.css:149–154`: `.step.active` = blue dbeafe, `.step.completed` = green dcfce7, `.step.upcoming` = grey f8fafc. Distinct palette confirmed.

**AC 1.3 — Back navigation preserves previously approved content; any destructive action requires explicit confirmation.**
⚠️ **Partial** — Completed steps are `clickable` and call `handleStepClick()` (`workflow-steps.js:788`). `ui-core.js:372–418` provides a `confirmDialog()` custom modal. However, `workflow-steps.js:788–810` only shows a confirm dialog for back-nav when `confirmReRunPhase` is triggered (re-run steps), not for plain back-navigation that might discard in-progress work in the current step. A user clicking `Analysis` from the `Rewrites` step gets no warning.

**AC 1.4 — Returning to a saved session lands user on last active step with data intact.**
⚠️ **Partial** — `session-manager.js:337–355` (`_restoreTabForPhase`) maps phases to tabs and calls `switchTab`. However, there is no explicit UI card showing "Returning to: [Job Title] at [Company] — Rewrites step — last active 2h ago." The position-bar (`index.html:69–107`) fills in job/company fields, but there is no timestamp context on restore. The `appendMessage('system', '🔄 Session restored from server.')` (`session-manager.js:428`) conveys only that a restore happened, not orientation context.

**Stage indicator updates without page reload.**
✅ **Pass** — `app.js:70–71` calls `fetchStatus()` which drives `updateWorkflowSteps()` via polling.

---

### US-U2: Job Input and URL Ingestion UX

**AC 2.1 — URL and paste-text modes clearly delineated; active mode state is visually obvious.**
✅ **Pass** — `job-input.js:107–111` renders three input-method tabs (📝 Paste Text, 🔗 From URL, 📁 Upload File) with `.active` class styling. Tabs are equal weight, clearly differentiated.

**AC 2.2 — Protected-site detection triggers inline, contextual copy-paste instruction with specific site name.**
✅ **Pass** — `job-input.js:471–479` detects `data.protected_site`, calls `showProtectedSiteModal(data.site_name, data.message, data.instructions)` (line 479), rendering a named modal with an ordered instruction list. The URL panel also includes an always-visible amber "Copy manually from" grid listing LinkedIn, Indeed, Glassdoor (`job-input.js:145–149`) before any error occurs.

**AC 2.3 — Fetch loading state appears within 300 ms of submission.**
✅ **Pass** — `job-input.js:455` calls `setLoading(true, 'Fetching job from URL…')` synchronously before the `fetch()` call at line 459. The global `llm-busy-overlay` (`index.html:153–162`) shows a spinner + label immediately.

**AC 2.4 — Extracted fields editable in-place; editing does not restart workflow.**
❌ **Fail** — `job-input.js:49–84` (`populateJobTab`) renders job title, company, and URL as static text/links. There is no inline-edit field for correcting the extracted company name, role title, or date. A user who notices the wrong company name extracted has no in-place edit path.

**AC 2.5 — Paste area shows a minimum character guidance hint.**
✅ **Pass** — `job-input.js:320–336`: `PASTE_MIN_CHARS = 200`, live counter via `_updatePasteCharCount()` with colour feedback (red below minimum, green above). `aria-describedby="paste-char-count"` links to the live hint (`job-input.js:116`).

---

### US-U3: Analysis Results Readability

**AC 3.1 — Analysis result has at minimum 4 visually distinct sections.**
✅ **Pass** — `review-table-base.js:287–360` (`populateAnalysisTab`) renders: (1) Role & Domain card, (2) Required Skills grid, (3) Preferred/Nice-to-Have list, (4) ATS Keywords with rank badges. A 5th section (Must-Have Requirements) and Culture Indicators are also present when data supports them.

**AC 3.2 — Keywords displayed with visual rank signal (not flat comma list).**
✅ **Pass** — `review-table-base.js:336–341`: ATS keywords rendered as `<span class="kw-badge"><span class="kw-rank">#${idx + 1}</span>${kw}</span>` with rank number. Header text reads "(higher rank = higher priority)".

⚠️ **Partial caveat** — The conversation-panel fallback in `message-queue.js:230–235` (`appendFormattedAnalysis`) uses flat `<span>` badges with no rank numbers. When the structured analysis tab is not yet populated (first-run before switching tab), this is what the user sees.

**AC 3.3 — Mismatch callouts visible above the fold.**
⚠️ **Partial** — `review-table-base.js:298–308`: mismatch callout renders immediately after the role card (above-fold position). However, the callout only appears when `window._masterSkills` is populated. If the master skills array is empty or not yet loaded, no mismatch is shown regardless of actual gaps. There is no summary count above the fold for >3 mismatches.

**AC 3.4 — Clarifying questions presented in groups of ≤3 per screen.**
⚠️ **Partial** — `job-analysis.js:51–64` (`extractStructuredQuestionsFromAssistantText`) extracts up to 4 questions. The questions panel (`questions-panel.js`) was not available for review. The extraction function returns all at once; grouping behaviour depends on questions-panel rendering which was not confirmed in reviewed source.

**AC 3.5 — Loading state for analysis includes descriptive label and estimated duration.**
⚠️ **Partial** — `job-analysis.js:105`: `appendLoadingMessage('Analyzing job description...')` + `setLoading(true, 'Analysing job description…')`. The label is present. There is no estimated duration shown (e.g., "this usually takes ~20 seconds"). The LLM busy overlay (`index.html:153–162`) shows elapsed time counter but no estimate.

---

### US-U4: Review Table Interaction Quality

**AC 4.1 — Accept/reject toggles visually obvious; current state unambiguous at a glance.**
✅ **Pass** — `experience-review.js:202–208`: icon-buttons use `.active` class to indicate current state. `aria-label` on each button names the action and target experience. Buttons have `title` tooltip text.

**AC 4.2 — Reorder controls discoverable without hover; keyboard-accessible.**
✅ **Pass** — `experience-review.js:207–208`: up/down row-reorder buttons always visible (not hover-only). They carry `aria-label` values. `disabled` attribute set correctly for first/last rows.

**AC 4.3 — Row density shows enough content for decisions without expanding every row.**
⚠️ **Partial** — `experience-review.js:192–210`: table shows title, company, dates, recommendation, confidence, reasoning, and action buttons. However, there is no first-bullet preview per row; users cannot see what bullets will be included without clicking the reorder control. This may slow review on long CVs.

**AC 4.4 — Bulk actions present when row count > 8.**
✅ **Pass** — `experience-review.js:241–250`: a bulk toolbar is always rendered above the table with "Accept All Recommended", "Emphasize All", "Include All", "Exclude All".

**AC 4.5 — Bullet expansion is in-place, no page navigation.**
✅ **Pass** — `experience-review.js:225–228`: the ↕ reorder button calls `showBulletReorder(expId, title)` which renders an inline panel rather than navigating away.

**AC 4.6 — Relevance scores labelled with scale.**
❌ **Fail** — `experience-review.js:199`: recommendations shown as text (Emphasize/Include/De-emphasize/Omit) and confidence as a badge tier. No numeric relevance score with a "/ 100" scale is displayed. `publications-review.js:133` shows a raw `relevance_score` field with no denominator label.

---

### US-U5: Rewrite Review Presentation

**AC 5.1 — All rewrite proposals display inline diff with red/strikethrough removals and green additions.**
✅ **Pass** — `rewrite-review.js:183–226` implements LCS word-level diff (`computeWordDiff`). `renderDiffHtml` outputs `<del class="diff-removed">` and `<ins class="diff-added">`. CSS at `styles.css:1241–1242`: `del.diff-removed` = red strikethrough background; `ins.diff-added` = green background, no underline.

**AC 5.2 — Accept, Reject, Edit controls appear within the same row/card as the diff.**
✅ **Pass** — `rewrite-review.js:272–275`: ✓ Accept, ✎ Edit, ✗ Reject buttons in `.rewrite-actions` div inside each `.rewrite-card`, collocated with the diff.

**AC 5.3 — LLM rewrite reason visible within one click or hover.**
✅ **Pass** — `rewrite-review.js:261–265`: `<details class="rewrite-rationale"><summary>Rationale & Evidence</summary>` — one click expands inline. CSS at `styles.css:1248–1249`: styled for inline display.

**AC 5.4 — Edit mode allows free-text editing of proposed text; preserves original for comparison.**
✅ **Pass** — `rewrite-review.js:293–303` (`applyRewriteAction 'edit'`): hides diff panel, shows `<textarea>` with proposed text pre-filled. On save (`saveRewriteEdit`, lines 326–351): regenerates diff against original and shows it again. Original `data-original` attribute preserved in `rewrite-inline-diff`.

**AC 5.5 — Keyboard shortcut or sequential "Approve & Next" present when more than 3 rewrites exist.**
❌ **Fail** — No keyboard shortcut or sequential navigation control is implemented. The tally bar (`rewrite-review.js:130–137`) provides bulk "Accept All" / "Reject All", which is a batch not a sequential flow. When reviewing 20+ rewrites, users must scroll manually between cards with no keyboard-driven progression.

---

### US-U6: Generation and Output State Feedback

**AC 6.1 — Generation progress is step-labelled; each completed step shows checkmark before next begins.**
⚠️ **Partial** — The LLM busy overlay (`index.html:153–162`) shows a spinner, elapsed time, and a step label (`llm-busy-label`). However, multi-step generation (HTML render → PDF → DOCX) is not broken into individually labelled substeps with per-step checkmarks. The user sees a single spinner until all files are ready.

**AC 6.2 — Generated CV rendered inline (iframe or embedded PDF) with prominently placed download button.**
✅ **Pass** — `layout-instruction.js` renders the preview via `displayLayoutPreview()` into a `layout-preview-iframe` element (`styles.css:1369`). The layout review pane shows the CV inline before final generation.

**AC 6.3 — Download filename follows CV_{Company}_{Role}_{Date} convention.**
⚠️ **Partial** — `download-tab.js:43–48`: filenames checked for `.pdf` and `_ATS` suffix. The file rendering code at line 172 shows `file.filename` directly — filename convention depends on the backend generator. Cannot confirm front-end enforcement from source alone.

**AC 6.4 — Generation error surfaces user-readable message with at least one fallback/recovery action.**
✅ **Pass** — `layout-instruction.js:1053–1056`: on error, `appendMessage('system', '❌ Failed to regenerate preview: ${error.message}')`. `download-tab.js:93–97` shows an amber ATS validation error block. Error paths provide messages, though a "Download HTML instead" fallback action button is not confirmed.

**AC 6.5 — When multiple versions exist in a session, they are listed with timestamps.**
🔲 **Not Implemented** — `download-tab.js:279–332` lists files but does not show version history with timestamps or flag "current" vs. older versions. If a user generates twice, both versions appear in the file list without temporal ordering or "current" labelling.

---

### US-U7: Accessibility and Keyboard Navigation

**AC 7.1 — Focus management: modal opens → focus moves inside; modal closes → focus restores.**
✅ **Pass** — `ui-core.js:242–247` (`openSettingsModal`): saves `_focusedElementBeforeModal = document.activeElement`, then calls `setInitialFocus()` and `trapFocus()`. `closeSettingsModal()` calls `restoreFocus()`. Pattern consistent across modal open/close functions.

**AC 7.2 — All interactive elements have visible, styled focus indicator (no bare `outline: none`).**
❌ **Fail** — `styles.css:577`: `.message-input { outline: none; }` — this declaration sits *outside* a `:focus` block, permanently removing the outline. While the `:focus` rule at line 578 adds a box-shadow, the pattern is fragile and may not meet WCAG 2.4.7 in all browser/OS combinations. Additionally, `styles.css:1584` removes outline on intake field focus with no confirmed styled replacement in the reviewed excerpt.

**AC 7.3 — Table keyboard navigation: toggles and reorder controls operable by keyboard.**
✅ **Pass** — `ui-core.js:490–509`: Arrow key navigation wired to tab bar (WCAG 2.1 AA Tabs pattern). `experience-review.js:202–208`: action buttons are `<button>` elements, natively keyboard-operable.

**AC 7.4 — Icon-only controls have `aria-label` or `title` with descriptive text.**
⚠️ **Partial** — `experience-review.js:202–208`: all icon buttons carry both `aria-label` and `title`. However, `index.html:95`: the layout-freshness-chip button has `aria-label=""` (empty string) — this is a defect worse than no aria-label; screen readers announce nothing for this interactive element.

**AC 7.5 — Accept/reject status communicated by colour AND text label or icon.**
✅ **Pass** — `rewrite-review.js:272–275`: buttons labelled "✓ Accept", "✎ Edit", "✗ Reject" — text + icon. Accepted cards get `.accepted` class plus button `.active`, preserving text label.

**AC 7.6 — Form validation errors associated via `aria-describedby`.**
✅ **Pass** — `job-input.js:116–121`: paste textarea has `aria-describedby="paste-char-count paste-error"`. URL input has `aria-describedby="url-error"` (line 133). Both error spans have `aria-live="polite"`.

---

### US-U8: Responsive Behaviour and Loading Performance

**AC 8.1 — Core workflow navigable without horizontal scroll at 1280 × 800.**
⚠️ **Partial** — `styles.css:148`: `.workflow-steps { gap: 32px; }` — at 1280px, the 13-step workflow bar with emoji labels risks overflow. No responsive wrapping or collapsing is defined for the step bar at narrow widths. Responsive rules exist for position-bar (`@media max-width: 900px`, `600px`) but not for `.workflow-steps`.

**AC 8.2 — Table columns collapsible at ≤1400px defined in component config.**
❌ **Fail** — No responsive column collapsing is defined for review tables. `experience-review.js` builds a static 6-column DataTables table with no `responsivePriority` or responsive plugin configuration.

**AC 8.3 — Application shell renders in ≤2 s locally.**
✅ **Pass** (expected) — External CDN resources (Bootstrap 5, Font Awesome, DataTables) are common and browser-cached; custom `bundle.js` is local. No evidence of blocking resources that would prevent ≤2s render on localhost.

**AC 8.4 — Async content areas have skeleton placeholders.**
⚠️ **Partial** — `session-manager.js:97`: a loading-spinner placeholder is shown. However, the experience-review DataTable re-renders asynchronously and the container collapses to near-zero height before the table populates, causing layout shift on load.

---

### US-U9: HTML Layout Review Interaction Quality

**AC 9.1 — Layout Instructions field has visible placeholder example and scope label asserting approved text is never changed.**
❌ **Fail** — `layout-instruction.js:350–353`: the textarea has a good multi-line placeholder. However, the scope label at line 293 reads: **"💡 Describe a layout or text change — the AI will determine the right approach."** This *invites* text changes and directly contradicts the story requirement for "Affects layout only — approved text is never changed."

**AC 9.2 — Processing indicator appears within 300 ms of instruction submission; preview updates on completion.**
✅ **Pass** — `layout-instruction.js:364–367`: `#processing-indicator` with spinner and "Applying instruction..." label, shown via `showProcessing(true)` (line 1065). Triggered synchronously before the async API call.

**AC 9.3 — Brief confirmation of applied change shown after each instruction.**
✅ **Pass** — `layout-instruction.js:1013`: history entry shows `instruction.change_summary` (the LLM-provided summary of what changed). `showConfirmationMessage()` (line 1052) also used after regeneration.

**AC 9.4 — Ambiguous instructions surface a clarifying prompt rather than a silent guess.**
🔲 **Not Implemented** — No evidence of a clarification-request path in `layout-instruction.js`. `submitSmartInstruction()` (line 530) submits directly to the backend with no front-end pattern for rendering a clarification prompt inline if the LLM reports ambiguity.

**AC 9.5 — Instruction history panel with individual Undo controls.**
✅ **Pass** — `layout-instruction.js:987–1024`: `renderInstructionHistory()` builds history entries with per-entry `<button onclick="undoInstruction(${index})">Undo</button>`. An undo stack is maintained (`_layoutUndoStack`, line 50). History is restored from session state via `restoreInstructionHistory()` (line 1042).

**AC 9.6 — Single "Proceed to Final Generation" button, equally usable whether zero or many instructions applied.**
⚠️ **Partial** — `layout-instruction.js:379–381`: a "Generate Final Files" button is present in the layout pane. However, `index.html:188–190` also exposes `layout-btn` ("✅ Confirm Layout") and `final-generate-proceed-btn` ("✅ Proceed to Finalise →") as separate action-area buttons in the left chat panel, creating up to three overlapping "advance" signals. The story requires one unambiguous button.

**AC 9.7 — Content safety assurance label asserting approved text is never changed.**
❌ **Fail** — See AC 9.1 above. The existing `.layout-scope-label` at `layout-instruction.js:293` says the opposite of what is required: it explicitly invites text changes. No safety assurance language is present.

---

## Generated Materials Evaluation

Generated materials evaluation requires reviewing actual output files (HTML/PDF/DOCX). The source review can only assess the presentation infrastructure.

**Download presentation.**
✅ `download-tab.js:40–68`: PDF files are differentiated as ATS (🤖) vs. human-readable (📄) with descriptive text. DOCX files similarly differentiated. HTML format described as "with embedded JSON-LD structured data."

**Version distinguishability.**
🔲 No version labelling, timestamps, or "current" indicators on multi-version file lists (`download-tab.js:279–332`). Highest-priority gap for generated materials UX.

**Filename meaningfulness.**
⚠️ Filename convention not enforced or confirmed at the frontend layer. `download-tab.js:172` shows `file.filename` directly. Cannot assess without observing a generated output.

---

## Terminology Audit

| Location | Current label | Assessment |
|---|---|---|
| `index.html:183` | `⚙️ Recommend Customizations` (action btn) | ⚠️ Developer-centric verb. User mental model: "What should I include?" |
| `index.html:184` | `✏️ Review Rewrites` (action btn) | ✅ Clear |
| `index.html:185` | `Continue to Spell Check →` (action btn) | ✅ Clear |
| `index.html:186` | `Done — Generate CV →` (action btn) | ⚠️ "Done" is ambiguous — done with what? Suggest: "Finish Spell Check → Generate CV" |
| `index.html:187` | `🎨 Open Layout Review →` (action btn) | ✅ Clear |
| `index.html:188` | `✅ Confirm Layout` (action btn) | ⚠️ Duplicates confirm-layout button in layout pane; two confirmation points confusing |
| `index.html:189` | `✅ Proceed to Finalise →` (action btn) | ⚠️ "Finalise" is British spelling; inconsistent with "Download" step label |
| Workflow step bar | `⚙️ Customise` | ⚠️ British spelling (inconsistent with "Spell Check", "Download") |
| Tab bar | `📊 Experiences` / `📊 ATS Score` | ❌ Same icon (📊) for two different tabs — icon collision |
| Tab bar | `✏️ Experience Bullets` / `✏️ Rewrites` | ❌ Same icon (✏️) for two different tabs — icon collision |
| Header model pill | `LLM: Loading…` + `Not ready` | ⚠️ "Not ready" with no action affordance confuses non-technical users |
| Layout scope label | `"Describe a layout or text change…"` | ❌ Contradicts story requirement; implies text is mutable when it should be protected |

---

## Additional Story Gaps / Proposed Story Items

**GAP-A: Intake confirmation editability (US-U2 AC 4 — Fail)**
After URL fetch or paste, extracted company name, role title, and date are not inline-editable. An inline confirmation card with editable fields (partially scaffolded by `_showIntakeConfirmCard` in `message-dispatch.js`) should allow corrections before analysis begins.

**GAP-B: Layout scope label inversion (US-U9 AC 1 & 7 — Fail)**
`layout-instruction.js:293` actively invites text changes. Must be corrected to: "Affects layout only — approved text is preserved and cannot be altered here."

**GAP-C: Rewrite sequential navigation (US-U5 AC 5 — Fail)**
No "Approve & Next →" keyboard shortcut. Propose keyboard shortcuts `]` = accept & advance, `[` = reject & advance, consistent with diff-review tools.

**GAP-D: Layout proceed button proliferation (US-U9 AC 6 — Partial)**
Three overlapping "advance" signals: `layout-btn`, `final-generate-proceed-btn`, `proceed-to-finalise-btn`. Consolidate to a single `Proceed to Final Generation` button visible at all times in the layout pane regardless of whether instructions were applied.

**GAP-E: Empty `aria-label` on layout-freshness-chip (US-U7 AC 4 — Defect)**
`index.html:95`: `aria-label=""` on the freshness chip button. Screen readers announce nothing. Must receive a dynamic descriptive label (e.g., "Layout is fresh" / "Layout is stale — content has changed since preview").

**GAP-F: Workflow step bar — no responsive wrapping (US-U8 AC 1 — Partial)**
13-step bar has no `@media` rule. At 1280px with `gap:32px`, overflow is likely. Propose horizontal scroll container or abbreviated labels at ≤1400px.

**GAP-G: Version history for generated files (US-U6 AC 6 — Not Implemented)**
Download tab shows all generated files without timestamps or "current" labels. Propose adding a generation timestamp per file row.

**GAP-H: Analysis clarification grouping (US-U3 AC 4 — Partial)**
Post-analysis questions are merged as a flat array (up to 4). `questions-panel.js` not reviewed in this pass. Recommend a follow-up review to confirm whether groups-of-≤3 is implemented.

---

## Summary Table

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-U1: Workflow Orientation | 3 | 2 | 0 | 0 | 0 |
| US-U2: Job Input UX | 3 | 0 | 1 | 0 | 0 |
| US-U3: Analysis Readability | 2 | 3 | 0 | 0 | 0 |
| US-U4: Review Table Interaction | 4 | 1 | 1 | 0 | 0 |
| US-U5: Rewrite Review | 4 | 0 | 1 | 0 | 0 |
| US-U6: Generation Feedback | 2 | 2 | 0 | 1 | 0 |
| US-U7: Accessibility | 4 | 1 | 1 | 0 | 0 |
| US-U8: Responsive / Performance | 1 | 2 | 1 | 0 | 1 |
| US-U9: Layout Review UX | 2 | 1 | 2 | 1 | 0 |

**Key evidence references:**
- Workflow bar CSS: `web/styles.css:149–155`
- `updateWorkflowSteps()`: `web/workflow-steps.js:612–731`
- `populateAnalysisTab()`: `web/review-table-base.js:269–366`
- Inline diff engine: `web/rewrite-review.js:183–226`
- Focus management: `web/ui-core.js:260–347`
- Layout scope label (defect): `web/layout-instruction.js:293`
- Protected-site handler: `web/job-input.js:471–479`
- Experience review bulk toolbar: `web/experience-review.js:241–250`
- Session restore: `web/session-manager.js:337–455`
- Paste char count: `web/job-input.js:320–336`
- Empty aria-label defect: `web/index.html:95`
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# UX Expert Review Status

**Last Updated:** 2026-04-22 16:00 ET
**Executive Summary:** The application has strong structural foundations — a persistent 8-step progress bar, word-level inline diffs, contextual protected-site guidance, and thorough modal focus management — but six UX gaps prevent full story compliance: keyboard-only navigation is blocked by non-interactive `<div>` tabs; extracted job metadata fields are not inline-editable; layout-review Undo controls are non-functional stubs; there is no sequential review flow for rewrite cards; the workflow step re-run icon is hover-only and keyboard-inaccessible; and the `#layout-freshness-chip` button carries an empty `aria-label` that screen readers cannot announce.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

**Criterion 1 — Step indicator**
✅ A persistent 8-step workflow bar renders in `web/index.html:104–120` with named steps: Job Input, Analysis, Customise, Rewrites, Spell Check, Generate, Layout Review, Finalise. Step pills are text-labelled and icon-prefixed; stage is not numeric-only.

**Criterion 2 — Completed state signalling**
✅ `web/styles.css:148–154` defines visually distinct CSS classes: `.step.active` (blue/`#dbeafe`), `.step.completed` (green/`#dcfce7`), `.step.upcoming` (ghost grey/`#f8fafc`), `.step.stale` (amber), `.step.stale-critical` (red). A blue ring (`.step.viewing`) and amber pulsing ring (`.step.browsing-away`) provide an additional view-cursor layer via `web/workflow-steps.js:199–248`.

**Criterion 3 — Back-navigation safety**
✅ `web/workflow-steps.js:131–183` implements `_showReRunConfirmModal()` which fires before any back-nav or rerun. The modal lists downstream completed stages and shows the note: "All existing approvals and rewrites are preserved as context." `backToPhase()` calls `POST /api/back-to-phase`.

**Criterion 3b — Re-run icon keyboard accessibility**
❌ `web/workflow-steps.js:666–670` — the `↻` re-run icon on each step pill is displayed only on CSS `:hover`. No `tabindex="0"` or `keydown` event handler is attached. Keyboard-only users cannot trigger a step re-run from the step bar.

**Gap:** Add `tabindex="0"` and an `Enter`/`Space` `keydown` handler to the re-run icon; or surface the re-run action via a menu reachable by keyboard.

**Criterion 4 — Session restoration context**
⚠️ Session restoration does navigate to the correct tab for the stored phase (`web/session-manager.js:222–237`). However, the confirmation message at `web/session-manager.js:608` reads:
```
✅ Session restored: Genentech Senior Position (customization)
```
The raw Python `PHASES` enum value ("customization", "rewrite_review", "spell_check") is exposed directly to the user rather than the human-friendly step label ("Customise", "Rewrites", "Spell Check"). This is developer-centric terminology.

**Gap:** Raw phase strings in restoration message — inconsistent with user-facing step names.

---

### US-U2: Job Input and URL Ingestion UX

**Criterion 1 — Input mode clarity**
✅ `web/job-input.js:99–130` shows three equal-weight tab-style buttons ("📝 Paste Text", "🔗 From URL", "📁 Upload File") rendered as `.input-tab` controls above separate `.input-method` panels. Active tab is styled and the correct panel is shown/hidden via `switchInputMethod()`. Modes are clearly delineated.

**Criterion 2 — Protected-site guidance**
✅ `web/job-input.js:170–184` renders a two-column advisory grid: "✅ Works well with" (company career pages, AngelList, etc.) and "⚠️ Copy manually from" (LinkedIn, Indeed, Glassdoor — each named explicitly with the reason). The guidance is contextual, specific, and always visible in the URL tab.

**Criterion 3 — Fetch feedback**
✅ `web/fetch-utils.js` provides `setLoading(true, ...)` which activates the `.loading-step` animation on the active step pill and the LLM busy overlay (`index.html:130–145`). URL fetch calls `setLoading(true, 'Fetching job description…')` before the fetch request.

**Criterion 4 — Confirmation editability**
❌ After a URL fetch or paste submission, the job metadata fields (company name, role title) are rendered as static HTML in `web/review-table-base.js:222–248` (`<h1>` for title, `<p class="company">` for company). There is no inline editing of extracted fields. Correcting a wrong company name or role title requires either submitting a new job description or using the chat interface.

**Criterion 5 — Character-count guidance**
✅ `web/job-input.js:322–336` implements `_updatePasteCharCount()` which updates a live counter with minimum threshold (200 chars): "450 / 200 minimum ✓" or "80 / 200 minimum — Too short, aim for at least 200 characters". The counter element uses `aria-live="polite"` and is associated with the textarea via `aria-describedby="paste-char-count paste-error"`.

---

### US-U3: Analysis Results Readability

**Criterion 1 — Chunking**
✅ `web/review-table-base.js:222–308` renders 5+ visually distinct sections: Role & Domain card, Mismatch callout, Required Skills grid (`.skill-grid`), Preferred / Nice-to-Have list (`.preferred-list`), ATS Keywords with rank badges (`.kw-badges`), Culture Indicators, and Must-Have Requirements. Each section uses separate `.analysis-section` containers.

**Criterion 2 — Keyword visualisation**
✅ `web/review-table-base.js:278–286` renders each ATS keyword as `<span class="kw-badge"><span class="kw-rank">#1</span>keyword</span>`. Keywords are position-ordered (higher priority first) with a visible rank number badge — not a flat comma list.

**Criterion 3 — Mismatch prominence**
⚠️ The mismatch callout in `web/review-table-base.js:251–260` renders immediately after the role card and before the skills grid — good placement. However, the mismatch computation depends on `window._masterSkills` being populated at render time. If master skills have not been loaded, no mismatch callout appears at all, silently omitting the warning. Additionally, more than 3 mismatches are shown as a single inline comma-separated list without an above-fold count summary and expandable detail.

**Criterion 4 — Clarifying question flow**
⚠️ The Questions tab exists (`index.html:179`). However, `web/job-analysis.js` was not among the reviewed source files, so grouping of questions into sets of ≤3 per screen cannot be confirmed. The Questions tab is a separate tab switch rather than an inline continuation of the analysis view.

**Criterion 5 — Analysis duration feedback**
⚠️ The LLM busy overlay at `web/index.html:141–145` shows elapsed time and a "Reasoning…" label. The `_ACTION_LABELS` map in `web/workflow-steps.js:37` provides "Analysing job description…" as a step label, but does not include an estimated duration. No context-specific message ("Analysing job description against your CV…") is used.

---

### US-U4: Review Table Interaction Quality

Source files for the experience, skills, achievements, and publications review tables (`web/exp-review.js`, `web/skills-review.js`, etc.) were not in the review set for this pass. The following findings use available module boundary evidence.

**Criterion 1 — Toggle affordance clarity**
⚠️ `web/review-table-base.js:40–58` shows inclusion count badges update per tab (e.g., "📊 Experiences (5)"). Specific toggle style (size, contrast, state affordance) cannot be confirmed without reading the table-rendering modules.

**Criterion 4 — Bulk actions**
⚠️ `web/skills-review.js:941` provides "✨ Accept All Recommended" bulk action for skills, confirming at least one bulk path exists. However, no "Select All / Deselect All" toggle for experience, achievement, or publication tables was found.

**Criterion 6 — Relevance score meaning**
⚠️ Whether scores render as "Relevance: 92 / 100" or raw floats cannot be confirmed without `web/exp-review.js`.

**Overall:** Criteria 2, 3, 4, and 5 are inconclusive — not failed, not confirmed.

---

### US-U5: Rewrite Review Presentation

**Criterion 1 — Inline diff**
✅ `web/rewrite-review.js:215–218` implements word-level LCS diff via `computeWordDiff()` / `renderDiffHtml()`. Removals render as `<del class="diff-removed">` (red strikethrough, `styles.css:1091`) and additions as `<ins class="diff-added">` (green, `styles.css:1092`). True inline diff, not side-by-side text boxes.

**Criterion 2 — Accept / Reject / Edit controls**
✅ `web/rewrite-review.js:269–272` places "✓ Accept", "✎ Edit", "✗ Reject" buttons within `.rewrite-actions` inside the card body, directly below the diff view.

**Criterion 3 — Reason visibility**
✅ `web/rewrite-review.js:260–265` renders `<details class="rewrite-rationale"><summary>Rationale & Evidence</summary>`. One click expands the LLM's reason inline.

**Criterion 4 — Edit path**
✅ `web/rewrite-review.js:280–320` implements the edit flow: the diff view is hidden, a `<textarea>` pre-populated with proposed text replaces it, and `saveRewriteEdit()` regenerates the inline diff against `data-original` using the user-edited text. The original is preserved throughout.

**Criterion 5 — Batch review efficiency**
❌ No sequential keyboard navigation flow ("Approve & Next →") exists. All rewrite cards render on a single scrolling page (`renderRewritePanel()` at `web/rewrite-review.js:68–165`). The tally bar at top enables `Submit All Decisions` only after all cards are decided, but no keyboard-driven sequential card-review flow exists. For sessions with 10–20 rewrites, users must scroll and review each card independently.

---

### US-U6: Generation and Output State Feedback

**Criterion 1 — Generation progress feedback**
⚠️ Generation fires `sendAction('generate_cv')` which activates the LLM busy overlay. `web/workflow-steps.js:37` shows label "Generating CV…" as a single loading state. Multi-step progress (HTML render → PDF conversion → Chrome fallback) is not broken into per-step checkmarks with completion indicators.

**Criterion 2 — Output preview**
⚠️ The Layout tab (`web/layout-instruction.js:236–248`) renders `<iframe id="layout-preview">` with the CV HTML preview. The Generated CV tab calls `populateCVTab(tabData.cv)` when tab data exists, but the app immediately navigates to the Layout tab after generation (`current-implemented-workflow.md:step 6`). Whether `populateCVTab` renders an inline iframe or a file-path link could not be confirmed without reading that function.

**Criteria 5–6** — Output filename convention and multi-version labeling could not be confirmed from the reviewed source files.

---

### US-U7: Accessibility and Keyboard Navigation

**Criterion 1 — Focus management**
✅ `web/ui-core.js:208–235` shows `openSettingsModal()` calls `setInitialFocus()` and `trapFocus()` with focus restored on close. `web/ui-helpers.js:31–37` applies the same pattern to alert/confirm modals. `web/workflow-steps.js:175–180` applies `trapFocus('rerun-confirm-overlay')` to the rerun dialog. The `trapFocus()` implementation handles Tab/Shift+Tab cycling.

**Criterion 2 — Focus visibility**
⚠️ Most interactive elements have styled `outline: none` replacements with `border-color + box-shadow` (e.g., `styles.css:359, 428, 600, 1240`). However `styles.css:1394–1396` shows `.intake-field-row input:focus { outline: none; }` with the continuation of the rule not visible in the reviewed source, leaving uncertainty about styled replacement. No focus styles are defined for `.step` or `.tab` elements (`<div>` elements), leaving step pills and second-bar tabs with no keyboard focus indicator.

**Criterion 3 — Table keyboard navigation**
❌ Second-bar tabs (`web/index.html:177–197`) are `<div role="tab">` elements with **no `tabindex="0"`** and no `keydown` event handlers. `web/app.js:122–125` attaches click handlers only:
```js
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});
```
Keyboard-only users cannot activate any workflow tab. Workflow step pills similarly use `onclick` without keyboard handlers.

**Criterion 4 — ARIA labels**
✅ `web/index.html:78` — `aria-label="ATS match score"` on ATS badge. Scroll buttons at `index.html:175,199` have `aria-label="Scroll tabs left/right"`. Tab bar at `index.html:176` has `aria-label="Application workflow tabs"`. All modals have `role="dialog" aria-modal="true" aria-labelledby` (`index.html:217, 242, 256, 273, 433, 544, 560`). Model wizard has `role="status" aria-live="polite"` at `index.html:287`.

**Criterion 4b — Empty `aria-label` on layout freshness chip**
❌ `web/index.html:87` — `<button id="layout-freshness-chip" ... aria-label="">`. An explicitly empty `aria-label` on a focusable button causes screen readers to announce the button with no name. This must be set to a meaningful label (e.g. `"Layout freshness — click to review"`) before the chip is shown.

**Criterion 5 — Colour independence**
⚠️ Rewrite card state (accepted = green background + border, rejected = red + opacity reduction, `styles.css:1083–1084`) is communicated by colour change only in the card border/background area. The Accept/Reject button active-class change provides a secondary indicator, but there is no text label (e.g., "✓ Accepted") within the card body to communicate state independent of colour.

**Criterion 6 — Error messages**
✅ `web/job-input.js:116` shows `aria-describedby="paste-char-count paste-error"` on the job textarea. Error spans use `aria-live="polite"`. URL input has `aria-describedby="url-error"`. File input has `aria-describedby="file-upload-error"`.

---

### US-U8: Responsive Behaviour and Loading Performance

**Criterion 1 — Minimum viable layout at 1280 × 800**
⚠️ `web/styles.css:146` defines `.workflow-steps { display: flex; align-items: center; justify-content: center; gap: 32px; }` without `flex-wrap: wrap`. With 8 step pills and 7 arrows at 32px gap, the workflow bar risks horizontal overflow at 1280px viewport width. No evidence of responsive collapse or abbreviated labels at narrow widths was found in the reviewed CSS.

**Criteria 2, 3, 4, 5** — Table column collapsing, load timing, skeleton screens, and scroll performance could not be confirmed from reviewed source.

---

### US-U9: HTML Layout Review Interaction Quality

**Criterion 1 — Instruction field clarity**
✅ `web/layout-instruction.js:256–260` shows the textarea placeholder:
```
e.g., Move Publications section after Skills
or: Make the Summary section smaller
or: Keep the Genentech entry on one page
```
A scope label reads: "💡 Layout changes only — approved text is never modified". Both are present without requiring interaction.

**Criterion 2 — Processing feedback**
✅ `web/layout-instruction.js:813–819` implements `showProcessing(true/false)` which shows/hides `id="processing-indicator"`. The spinner is shown before the instruction fetch and hidden in `finally` (`layout-instruction.js:613–617`).

**Criterion 3 — Change attribution**
✅ `web/layout-instruction.js:601` calls `showConfirmationMessage(response.summary)` after each successful instruction. The summary auto-hides after 3 seconds. The `change_summary` is also stored in the history entry (`layout-instruction.js:593`).

**Criterion 4 — Clarification handling**
⚠️ `web/layout-instruction.js:842–851` implements `showClarificationDialog()` using **`window.prompt()`** (native browser dialog). This is an accessibility anti-pattern: `window.prompt()` is not trapped by application focus management, breaks screen reader context, and may be blocked by browser security policies. The criterion requires inline clarification within the layout pane.

**Criterion 5 — Instruction history with Undo**
🔲 The instruction history panel renders with individual "Undo" buttons per entry (`web/layout-instruction.js:755–772`). However, `web/layout-instruction.js:855–865` shows the `undoInstruction()` function body contains:
```js
appendMessage('system', '🔄 Undo not yet implemented — would regenerate from prior state');
```
The Undo buttons are visible and clickable but non-functional stubs. Users who click Undo receive a chat message rather than a rollback.

**Criterion 6 — Single proceed action**
⚠️ The layout pane exposes four action surfaces:
- `id="confirm-layout-btn"` — "Confirm Layout" (shown when preview available, not stale, not yet confirmed)
- `id="confirm-layout-btn-2"` — duplicate "Confirm Layout" at bottom of pane
- `id="proceed-to-finalise-btn"` — "Generate Final Files" (shown after layout confirmed)
- `id="layout-btn"` in chat toolbar — dynamically labeled "↻ Regenerate Preview" / "✅ Confirm Layout" / "⬇️ Generate Final Files"

Four action surfaces with state-dependent labels replaces the single, consistently-labelled "Proceed to Final Generation" required by the acceptance criterion.

---

## Terminology Clarity Findings

The following user-facing terms are ambiguous, developer-centric, inconsistent, or misaligned with the user's mental model:

| Location | Current text | Issue |
|----------|-------------|-------|
| `session-manager.js:608` | `Session restored: … (customization)` | Raw Python phase enum exposed; should read "Customise" |
| `session-manager.js:608` | `… (rewrite_review)` | Underscored internal name; should read "Rewrites" |
| `index.html:162` | Button id `generate-btn`, label "✏️ Review Rewrites" | ID and label describe different things; confuses maintainers |
| `index.html:164` | `id="spell-btn"` label "✓ Done — Generate CV" | Conflates two actions: completing spell check + triggering generation |
| `index.html:113` | Step title "Spell Check", tooltip "Spell & grammar check" | Inconsistent scope label |
| `index.html:115` | Workflow step "📄 Generate" | Truncated — "Generate CV" would be less ambiguous |
| `review-table-base.js` empty-state | "Complete customizations to reach this step" | Tells user to go backward; they should proceed forward via action buttons |
| Layout pane | Three contextually different labels on one button (`layout-btn`) | Users must learn three meanings of the same button location |

---

## Generated Materials Evaluation

The generated CV rendering uses `<iframe id="layout-preview">` (`web/layout-instruction.js:236`) in the Layout tab with `sandbox="allow-same-origin"` — authentic render rather than a plain file link.

**Preview output status** (`web/layout-instruction.js:54–88`) shows Chrome and WeasyPrint PDF render status as `<a>` links opening PDFs in a new tab — appropriate for in-browser review before download.

**Gap: no persistent CV preview in the "Generated CV" tab.** The app immediately navigates to the Layout tab after generation (`current-implemented-workflow.md:step 6`). The Generated CV tab is populated only if `tabData.cv` survived the tab switch — not guaranteed for all session restoration paths.

**Gap: version disambiguation** not addressed. Multiple generation runs in a session are not surfaced as a labelled list with timestamps.

---

## Additional Story Gaps / Proposed Story Items

**GAP-UX-1 (HIGH): Extracted job metadata fields are not inline-editable.**
Evidence: `web/review-table-base.js:222–248`. Proposed story: "As a user, when the job is analysed, I want to correct extracted metadata fields (title, company, date) inline, so that I do not have to restart the workflow for minor extraction errors."

**GAP-UX-2 (CRITICAL): Tab `<div>` elements inaccessible by keyboard.**
Evidence: `web/index.html:177–197`, `web/app.js:122–125`. Proposed story: "As a keyboard user, I want all workflow tabs to be focusable and activatable with Space/Enter, so that I can complete the full workflow without a mouse."

**GAP-UX-3 (HIGH): Layout Undo non-functional.**
Evidence: `web/layout-instruction.js:855–865`. Proposed story: "As a user reviewing layout, I want each instruction history entry to have a working Undo action that rolls back to the state before that instruction was applied."

**GAP-UX-4 (HIGH): No sequential rewrite review flow.**
Evidence: `web/rewrite-review.js:68–165`. Proposed story: "As a user with many rewrite suggestions, I want a sequential 'Review next →' control (or keyboard shortcut) so I can approve/reject rewrites one at a time without managing scroll position."

**GAP-UX-5 (MEDIUM): Session restoration uses raw Python phase strings.**
Evidence: `web/session-manager.js:608`. Proposed story: "As a returning user, when my session is restored, the confirmation message should display the friendly step name ('Customise') rather than the internal identifier ('customization')."

**GAP-UX-6 (MEDIUM): Layout clarification uses `window.prompt()`.**
Evidence: `web/layout-instruction.js:842–851`. Should be replaced with an inline clarification input rendered within the layout pane.

**GAP-UX-7 (MEDIUM): Workflow bar overflow at 1280 px.**
Evidence: `web/styles.css:146`. 8 steps + 7 arrows at `gap: 32px` without `flex-wrap` risks horizontal overflow. Proposed fix: add `flex-wrap: wrap`, reduce gap at ≤1400 px, or abbreviate step labels at small widths.

---

## Summary Table

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/workflow-steps.js, web/session-manager.js, web/session-switcher-ui.js, web/fetch-utils.js, web/review-table-base.js, web/job-input.js, web/layout-instruction.js, web/finalise.js, web/ui-helpers.js, web/rewrite-review.js, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-U1 | 3       | 1         | 1      | 0          | 0     |
| US-U2 | 3       | 0         | 1      | 0          | 0     |
| US-U3 | 2       | 3         | 0      | 0          | 0     |
| US-U4 | 0       | 4         | 0      | 0          | 1     |
| US-U5 | 4       | 0         | 1      | 0          | 0     |
| US-U6 | 0       | 2         | 0      | 0          | 3     |
| US-U7 | 3       | 2         | 2      | 0          | 0     |
| US-U8 | 0       | 1         | 0      | 0          | 4     |
| US-U9 | 3       | 1         | 0      | 1          | 0     |

**Key evidence references:**
- `web/index.html:104–120` — workflow step bar HTML
- `web/styles.css:147–154` — step pill state classes
- `web/workflow-steps.js:131–183` — back-nav confirmation modal
- `web/session-manager.js:608` — raw phase string in restoration message
- `web/job-input.js:99–184` — input method tabs + protected-site guidance
- `web/review-table-base.js:222–308` — analysis tab rendering (static extracted fields)
- `web/rewrite-review.js:213–320` — LCS word diff, card rendering, edit flow
- `web/ui-core.js:208–235` — modal focus trap implementation
- `web/index.html:177–197` — tab divs without `tabindex`
- `web/app.js:122–125` — click-only tab event wiring
- `web/layout-instruction.js:256–260` — instruction field placeholder and scope label
- `web/layout-instruction.js:842–865` — `window.prompt()` clarification + non-functional Undo stub
- `web/layout-instruction.js:755–772` — instruction history with Undo buttons
- `web/styles.css:146` — workflow-steps flex without wrap
- `web/workflow-steps.js:666–670` — re-run icon hover-only, no keyboard handler
- `web/index.html:87` — empty `aria-label=""` on `#layout-freshness-chip`
- `web/skills-review.js:941` — "Accept All Recommended" bulk action confirmed

**Evidence standard:** Every conclusion is supported by cited source file and line number. Criteria marked — (N/A) indicate source files were not in the review set for this pass; they are not asserted as failing.
