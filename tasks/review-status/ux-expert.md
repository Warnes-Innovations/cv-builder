<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# UX Expert Review Status

**Last Updated:** 2026-04-20 17:30 ET
**Executive Summary:** The application has strong structural foundations — a persistent 8-step progress bar, word-level inline diffs, contextual protected-site guidance, and thorough modal focus management — but four high-severity usability gaps prevent full story compliance: keyboard-only navigation is blocked by non-interactive `<div>` tabs, extracted job metadata fields are not inline-editable, layout-review Undo controls are non-functional stubs, and there is no sequential review flow for rewrite cards.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

**Criterion 1 — Step indicator**
✅ A persistent 8-step workflow bar renders in `web/index.html:104–120` with named steps: Job Input, Analysis, Customise, Rewrites, Spell Check, Generate, Layout Review, Finalise. Step pills are text-labelled and icon-prefixed; stage is not numeric-only.

**Criterion 2 — Completed state signalling**
✅ `web/styles.css:148–154` defines visually distinct CSS classes: `.step.active` (blue/`#dbeafe`), `.step.completed` (green/`#dcfce7`), `.step.upcoming` (ghost grey/`#f8fafc`), `.step.stale` (amber), `.step.stale-critical` (red). A blue ring (`.step.viewing`) and amber pulsing ring (`.step.browsing-away`) provide an additional view-cursor layer via `web/workflow-steps.js:199–248`.

**Criterion 3 — Back-navigation safety**
✅ `web/workflow-steps.js:131–183` implements `_showReRunConfirmModal()` which fires before any back-nav or rerun. The modal lists downstream completed stages and shows the note: "All existing approvals and rewrites are preserved as context." `backToPhase()` calls `POST /api/back-to-phase`.

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
⚠️ No evidence of "Select All / Deselect All" controls was found in the reviewed source files.

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
| US-U1 | 3       | 1         | 0      | 0          | 0     |
| US-U2 | 3       | 0         | 1      | 0          | 0     |
| US-U3 | 2       | 3         | 0      | 0          | 0     |
| US-U4 | 0       | 3         | 0      | 0          | 2     |
| US-U5 | 4       | 0         | 1      | 0          | 0     |
| US-U6 | 0       | 2         | 0      | 0          | 3     |
| US-U7 | 3       | 2         | 1      | 0          | 0     |
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

**Evidence standard:** Every conclusion is supported by cited source file and line number. Criteria marked — (N/A) indicate source files were not in the review set for this pass; they are not asserted as failing.
