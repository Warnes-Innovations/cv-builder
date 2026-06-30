<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# UX Expert Review Status

**Last Updated:** 2026-06-29 23:00 ET

**Executive Summary:** The application has a well-architected foundation with genuine UX investment in several areas: the workflow step bar, inline diff rewrite review, layout instruction history with per-entry Undo, focus-trapped modals, and keyboard-navigable tab bars are all implemented at or above spec. The critical gaps centre on (1) step-indicator visual completeness — active vs. completed vs. upcoming state exists in CSS but the function that drives completed-state rendering lives only in the bundle, making source-code verification uncertain, (2) session-restoration orientation is weak — the user returns to a session but receives no explicit "last active at X on step Y" banner, (3) clarifying questions are presented as a wall of free-text inputs with no grouping limit, (4) relevance scores in review tables are rendered as raw integers with no scale label, (5) the layout scope notice uses developer language ("Text content is finalised") rather than the specified safety assurance phrasing, and (6) the "Proceed to Final Generation" button is labelled "Generate Final Files" — a partial match to the acceptance criterion. Generated materials are solid: filename convention and download grid fully implemented; the only gap is in-browser preview after final generation and multiple-version listing.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

**1. Step indicator — persistent and named stages**
✅ Pass — `web/index.html` lines 118–143 render a `<nav class="workflow">` with 12 named steps (Job Input → Analysis → Customise → Rewrites → Spell Check → Layout Review → Download → Cover Letter → Screening → Interview Prep → Thank You → Harvest). Labels are meaningful text, not numeric only. The step bar is in the persistent layout shell outside `<main>`, so it is visible on every step view.

**2. Completed state signalling — visual distinction**
⚠️ Partial — CSS at `web/styles.css` lines 151–157 defines `.step.active` (blue), `.step.completed` (green), `.step.upcoming` (light grey), `.step.stale` (amber), `.step.stale-critical` (red). `updateWorkflowStepsClickable()` in `web/ui-core.js` lines 1891–1975 manages clickability based on phase; `updateWorkflowSteps()` (referenced at `web/api-client.js` line 212 but only exported via `bundle.js`) drives active/completed/upcoming class assignment. A `step.viewing` (solid blue ring) and `step.browsing-away` (pulsing amber ring) layer on top of progress states — this dual-ring system may confuse users who cannot distinguish "I am viewing this step" from "this step is active in the workflow". Additionally, the browsing-away pulse is always-on animation which draws attention away from the actual active step.

**3. Back-navigation safety**
✅ Pass — `_renderRefinementPanel()` in `web/download-tab.js` lines 226–244 offers "↻ Refine Customisations / Rewrites / Re-analyse Job" with preserved state. `confirmDialog()` in `web/ui-core.js` lines 372–443 provides a keyboard-accessible confirmation dialog (focus trap + Escape). No evidence of silently discarding approved content was found.

**4. Session restoration context**
⚠️ Partial — `loadStateFromLocalStorage()` in `web/state-manager.js` lines 459–529 restores `lastKnownPhase`, `currentTab`, `tabData`, `generationState`, and ATS score within 24 hours. The position bar shows job title and company (`#position-title`, `#position-company`). However, there is **no explicit orientation banner** telling the user which step they are on and when they last worked. The step bar visually highlights the current step, but no timestamp or "You were last here" message is surfaced. Failure mode: a returning user sees a job title and step bar but has no human-readable context about time elapsed or what to do next.

---

### US-U2: Job Input and URL Ingestion UX

**1. Input mode clarity — clearly delineated tabs**
✅ Pass — `web/job-input.js` lines 107–111 render three equal-weight tab buttons ("📝 Paste Text", "🔗 From URL", "📁 Upload File") with `.input-method-tabs` styling (`styles.css` lines 1297–1303). Active mode has blue underline (`border-bottom: 2px solid #3b82f6`). Only one method panel is visible at a time.

**2. Protected-site guidance — contextual, specific**
✅ Pass — `web/job-input.js` lines 471–479 detect `data.protected_site` and call `showProtectedSiteModal(data.site_name, data.message, data.instructions)`. The modal (lines 508–530) names the specific site, shows the message, lists numbered instructions, and tips "After copying the job description, click the 'Paste Text' tab". The URL method panel also shows a pre-emptive two-column guidance card (lines 140–150) naming LinkedIn, Indeed, and Glassdoor — visible before any fetch attempt.

**3. Fetch feedback — loading indicator**
⚠️ Partial — `fetchJobFromURL()` (`job-input.js` line 455) calls `setLoading(true, 'Fetching job from URL…')`. This shows the `#llm-busy-overlay` with spinner, label, elapsed timer, and Stop button. However, the overlay **covers the entire chat panel**, not the URL input field. A user looking at the URL input sees no inline spinner at the submission point. The 300ms criterion for collocated feedback is not met.

**4. Confirmation editability — inline editable extracted fields**
✅ Pass — `styles.css` lines 1562–1605 define `.intake-confirm-card` with editable `.intake-field-row input` fields. The intake confirmation card is used across all job sources (paste, URL, file). Editing extracted fields does not restart the workflow.

**5. Character-count guidance for paste**
✅ Pass — `web/job-input.js` lines 320–337: `PASTE_MIN_CHARS = 200`, `_updatePasteCharCount()` shows live count in `#paste-char-count` (aria-live="polite") with three states: empty (blank), below minimum (red + explanation), or met (green + checkmark). Attached to `oninput` on the textarea.

---

### US-U3: Analysis Results Readability

**1. Chunking — 4+ visually distinct sections**
✅ Pass — `web/review-table-base.js` lines 298–371 render:
- `.analysis-role-card` (Role header with domain, level, summary chips)
- `.mismatch-callout` (amber, above skill sections)
- `.analysis-section` × 4+: Required Skills, Preferred/Nice-to-Have, ATS Keywords, Culture Indicators, Must-Have Requirements
Each section is a separate bordered card with a header icon.

**2. Keyword visualisation — rank signal**
✅ Pass — ATS Keywords section (`review-table-base.js` lines 346–352) uses `.kw-badge` with `.kw-rank` span showing `#1`, `#2`… The section label reads "(higher rank = higher priority)".

**3. Mismatch prominence — amber callout above fold**
⚠️ Partial — The `.mismatch-callout` (`review-table-base.js` line 317) is rendered after the role card and before the skills grid — near the top. However, when >3 mismatches exist, the implementation shows all of them as a comma-separated list in a single callout; there is no "count badge above the fold / expandable detail below" structure that the spec requires for >3 mismatches.

**4. Clarifying question flow — grouped ≤3 per screen**
❌ Fail — `web/questions-panel.js` line 147 renders all clarifying questions at once in a single `.analysis-page` section. There is no group-of-≤3 display and no "confirm and see next group" flow. Questions do use `.q-chip` styled buttons for structured answers (`styles.css` lines 506–509), but all questions appear simultaneously in a scrolling list.

**5. Analysis duration feedback — labelled loading state**
⚠️ Partial — The `#llm-busy-overlay` shows a spinner, `#llm-busy-label` (aria-live, default "Reasoning…"), `#llm-busy-elapsed` elapsed timer, and `#llm-busy-state-badge` ("Taking longer than usual" when slow). The elapsed timer provides time-feedback, but the spec requires an approximate wait time estimate — not just elapsed time. No "approximately X seconds" label is present.

---

### US-U4: Review Table Interaction Quality

**1. Toggle affordance clarity**
✅ Pass — Review tables use `.icon-btn` controls (32×32 px, `styles.css` lines 1170–1210). Active state: green background + border + scale + box-shadow. Focus state: visible ring on `:focus-visible`. These are full-size button elements, not small checkboxes.

**2. Drag / reorder usability**
⚠️ Partial — The bullet-reorder modal uses Up/Down buttons with keyboard support (GAP-180 fix). However, for the main Experiences and Skills review tables, **no reorder controls are present** — users can only accept/reject/emphasize/de-emphasize. The spec refers to reorder controls in review tables. The bullet reorder covers individual bullet ordering within an experience, not experience-level reordering.

**3. Row density**
✅ Pass — Experience review uses DataTables with columns sufficient for decision-making (title, role, date, relevance, first bullet). Users can make accept/reject decisions without expanding every row.

**4. Bulk actions for large tables**
⚠️ Partial — `.bulk-toolbar` exists with `.bulk-btn` controls for Emphasize All, Include All, Exclude All, Recommended (`bulkAction()` at `review-table-base.js` lines 717–753). Functionally equivalent to "Select All / Deselect All" but labelled differently. The spec says "Select All / Deselect All"; the implementation says "Emphasize All / Include All / Exclude All" — users may not immediately recognise these as the "select all" equivalent.

**5. Inline expansion — in-place**
✅ Pass — Tab switching via `switchTab()` does not navigate away from the page; `.review-subtabs` for Experiences, Bullets, Skills, Achievements, Publications stay within the viewer area. The bullet reorder modal is an overlay, not page navigation.

**6. Relevance score meaning — labelled scale**
❌ Fail — Relevance scores appear as integers in the experience and skills review tables. No "/ 100" denominator, letter grade, or inline legend is rendered per row. The `.confidence-badge` CSS class (high/medium/low) is used in rewrite cards but not in the review table relevance column. Users cannot interpret score magnitude without domain knowledge.

---

### US-U5: Rewrite Review Presentation

**1. Inline diff — red strikethrough removals, green additions**
✅ Pass — `styles.css` lines 1248–1251: `del.diff-removed` (red text, pink background, `text-decoration: line-through`), `ins.diff-added` (green text, green background). `.rewrite-inline-diff` wraps these per card.

**2. Accept / Reject / Edit controls collocated with diff**
✅ Pass — `.rewrite-card-body` contains `.rewrite-inline-diff`, `.rewrite-keywords`, `.rewrite-rationale`, and `.rewrite-actions` — all in the same card. Controls are not in a separate panel.

**3. Reason visibility — within one click or hover**
✅ Pass — `details.rewrite-rationale` (`styles.css` lines 1256–1257) is a `<details>` element with `<summary>` — one click expands inline without modal navigation.

**4. Edit path — free text editing preserving original**
✅ Pass — `.rewrite-after textarea` is revealed in edit mode. The `.rewrite-inline-diff` (showing original with diff) remains visible above the edit textarea. The `.rw-save-edit-btn` commits the edit.

**5. Batch review / sequential navigation**
⚠️ Partial — `.rw-bulk-btn` controls (Accept All, Reject All) exist in the tally bar. However, there is **no "Approve & Next" keyboard shortcut** or sequential navigation control. The tally bar is sticky, but users must scroll manually through cards. The spec requires "keyboard shortcut or sequential navigation control (e.g., 'Approve & Next')" when >3 rewrites exist — this is absent.

---

### US-U6: Generation and Output State Feedback

**1. Generation progress feedback — step-labelled**
⚠️ Partial — The layout review pane shows `#preview-loading-overlay` with spinner, "Rendering preview…" label, and `#preview-loading-log` (`layout-instruction.js` lines 291–296). The final generation output cards show `.preview-output-badge.is-ready / is-failed` per format. However, the spec requires step-by-step labelled progress ("HTML render → PDF conversion") with each step showing a checkmark before the next begins. The current implementation shows a single spinner + log text without individual step indicators with completion checkmarks.

**2. Output preview — in-browser rendering**
✅ Pass — `<iframe id="layout-preview">` (`layout-instruction.js` line 296) loads the generated HTML preview in-browser during Layout Review. This is a real rendered preview.

**3. Download options — PDF + secondary formats**
✅ Pass — `download-tab.js` `_collectDownloadableFiles()` collects PDF (human and ATS), DOCX (human and ATS), and HTML files. This exceeds the minimum (PDF only).

**4. Error recovery — user-readable with fallback**
✅ Pass — `_renderValidationSummary()` (lines 76–142) renders an amber error box for ATS validation errors. `_renderDownloadGrid()` blocks individual formats selectively with "⛔ Blocked" labels. The refinement panel offers a back path. Error messages are plain English, not raw stack traces.

**5. Output filename — applicant name, role, date**
✅ Pass — `web_app.py` line 1768: `filename_base = f"CV_{company}_{role}_{_ts}"` matches the `CV_{Company}_{Role}_{Date}` acceptance criterion.

**6. Version label for multiple generated sessions**
🔲 Not Implemented — When a user generates the CV multiple times, `download-tab.js` shows a `generatedAt` timestamp per file but there is no list of prior versions, no "current" label on the most recent, and no version number differentiating runs. File timestamps in the filename provide machine-readable distinction but not a UI-visible version list.

---

### US-U7: Accessibility and Keyboard Navigation

**1. Focus management — modal focus move and restore**
✅ Pass — `web/ui-core.js` lines 27–347: `openSettingsModal()` calls `setInitialFocus()` then `trapFocus()`. `closeSettingsModal()` calls `restoreFocus()`. `_focusedElementBeforeModal` stores the triggering element. `confirmDialog()` (lines 372–443) has its own inline focus trap and Escape key handler.

**2. Focus visibility — no global outline removal**
✅ Pass — No global `outline: none` rule exists in `styles.css`. Visible focus rings are defined for `.action-btn`, `.tab`, `.icon-btn`, `.sm-th`, `.q-chip`, `.rw-btn`, `.preview-output-badge-link`, `.btn-primary` — all via `:focus-visible` with `outline: 2px solid #3b82f6`.

**3. Table keyboard navigation**
⚠️ Partial — `.icon-btn` controls are `<button>` elements and natively keyboard-operable (Tab + Enter/Space). The tab bar has full ARIA tablist keyboard navigation (ArrowLeft/Right/Home/End, `ui-core.js` lines 526–554). However, no keyboard shortcut documentation or implementation for reorder (up/down) in the main experience/skills tables was found.

**4. ARIA labels on icon-only buttons**
⚠️ Partial — Modal close buttons have `aria-label` attributes (e.g., `aria-label="Close sessions panel"` at `index.html` line 253). The conflict banner dismiss button has `aria-label="Dismiss notification"` (line 114). The rename button has `aria-label="Rename this session"`. However, `.icon-btn` controls in review tables (accept/reject/up/down icons) are generated by `review-icons.js` and their `aria-label` coverage was not directly verifiable from the reviewed source files. This requires direct inspection of `web/review-icons.js`.

**5. Colour independence — status by colour and text/icon**
✅ Pass — Missing skills in analysis use `.skill-badge.missing` with `title="Not in master CV"` AND `<span class="sr-only"> (not in master CV)</span>` (`review-table-base.js` line 328). Accept/reject state uses background colour AND class name change. Confidence badges use text labels (high/medium/low) alongside colour.

**6. Error messages — aria-describedby**
✅ Pass — `job-input.js` line 116: `aria-describedby="paste-char-count paste-error"`. Line 132: `aria-describedby="url-error"`. Line 165: `aria-describedby="file-upload-error"`. `_showFieldError()` sets `aria-invalid="true"`. `#paste-char-count` and error spans have `aria-live="polite"`.

---

### US-U8: Responsive Behaviour and Loading Performance

**1. Minimum viable layout — 1280×800**
⚠️ Partial — `styles.css` has media queries at 1400px, 1280px, 1100px, 900px, 720px, 640px, 600px. The layout-instruction-panel switches to column layout at 1100px. The `.workflow-steps` at 1400px reduces gap to 16px. At 1280px with 12 steps and arrows, the step bar uses `overflow-x: auto` which may require horizontal scrolling within the nav itself — not a full-page horizontal scroll, but a sub-component scroll.

**2. Column collapsing in tables**
🔲 Not Implemented — No `@media` rules or DataTables responsive extension configuration defines which review table columns collapse at ≤1400px. The acceptance criterion requiring a documented column-collapsing configuration is not met.

**3. Initial page load ≤2s locally**
— N/A — Cannot be evaluated from source code alone; requires runtime measurement. Multiple CDN resources (Bootstrap, DataTables, FontAwesome, jQuery, marked) are loaded synchronously.

**4. No layout shift during async loads**
⚠️ Partial — The `.empty-state` div provides initial content. The `#llm-busy-overlay` and `.preview-loading-overlay` prevent CLS in their areas. However, the main `#document-content` div is empty until tab content loads; no skeleton screens reserve space for arriving LLM content.

**5. Long table scroll performance**
— N/A — Cannot be evaluated from source code alone. DataTables does not implement virtual scrolling by default.

---

### US-U9: HTML Layout Review Interaction Quality

**1. Instruction field clarity — scope label and placeholder**
⚠️ Partial — `layout-instruction.js` line 302: scope label reads "💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." Textarea placeholder (line 362) gives three concrete examples. Gap: the label says "Text content is finalised" — the spec requires "approved text is never changed". The current phrasing is developer-language ("finalised") rather than user-language ("your approved text"). The label `<p>` is not associated with the textarea via `aria-describedby`.

**2. Processing feedback — within 300ms**
✅ Pass — `layout-instruction.js` lines 373–376 show `#processing-indicator` with spinner and "Applying instruction..." immediately on button click, inline in the right-side pane collocated with the instruction field.

**3. Change attribution — confirmation after each instruction**
✅ Pass — `layout-instruction.js` line 378: `#confirmation-message` is shown after instruction application with a summary. The `.confirmation-message` CSS class (`styles.css` line 1446) styles this as a green confirmation card.

**4. Clarification handling — inline clarifying prompt**
🔲 Not Implemented — No code in `layout-instruction.js` routes an ambiguous LLM response to an inline clarifying question. Instructions are applied or error; no "clarification request" middle path was identified.

**5. Instruction history with per-entry Undo**
✅ Pass — `layout-instruction.js` lines 1002–1030 define `addToInstructionHistory()` and `_renderInstructionHistoryList()`. The `_layoutUndoStack` (line 50) stores pre-instruction snapshots. The history list renders per-entry "Undo" buttons (line 1029). `undoInstruction()` (lines 1181–1193) pops the stack and restores the preview.

**6. Single "Proceed to Final Generation" button**
⚠️ Partial — `layout-instruction.js` line 388: `<button id="proceed-to-finalise-btn">Generate Final Files</button>`. This is a single button (no Skip/Confirm ambiguity — only one exists). However, the label "Generate Final Files" differs from the specified "Proceed to Final Generation". The button behaviour is correct (it advances unconditionally whether or not instructions were applied), but the label does not match the acceptance criterion.

**7. Content safety assurance**
⚠️ Partial — The scope label provides a notice but uses "Text content is finalised" rather than "approved text is never changed" (or similar user-facing phrasing that conveys safety). The notice is a plain `<p>` — not visually distinct enough to convey "your approved text is protected".

---

## Generated Materials Evaluation

**CV Filename Convention**
✅ Pass — `scripts/web_app.py` line 1768: `filename_base = f"CV_{company}_{role}_{_ts}"`. This matches the `CV_{Company}_{Role}_{Date}` acceptance criterion. ATS files include an ATS variant suffix per the download-tab descriptions.

**Download Presentation**
✅ Pass — `web/download-tab.js` renders each file with icon, human-readable description (distinguishing human-readable PDF vs. ATS PDF vs. DOCX), timestamp, and download button. Descriptions are in plain English.

**ATS Validation Report**
✅ Pass — `_renderValidationSummary()` in `download-tab.js` (lines 76–142) renders a collapsible ATS report with a pass/warn/fail count, per-check table with status icons, and a blocking error panel when critical checks fail. The report is accessible without opening a separate modal.

**In-browser Preview After Final Generation**
⚠️ Partial — The generated CV is previewable as an iframe in Layout Review. After final generation, the File Review / Download tab shows only a download grid without an embedded preview. Users who advance past the layout step cannot preview the final PDF in-browser from the download tab.

**Multiple-Version Listing**
🔲 Not Implemented — When a user regenerates the CV multiple times, there is no version list distinguishing runs. File timestamps in filenames provide machine-readable distinction; the UI does not surface this as a "current / previous" version list.

---

## Additional Story Gaps / Proposed Story Items

**GAP-UX-A: Clarifying questions wall (US-U3 AC4)**
All clarifying questions are rendered simultaneously as a scrolling list. Spec requires groups of ≤3 with confirmation between groups. This is the clearest gap against the acceptance criteria.

**GAP-UX-B: Relevance score scale labels (US-U4 AC6)**
Experience and skills review tables show integer scores without "/ 100" denominator or letter grade + legend. Users cannot interpret score magnitude.

**GAP-UX-C: Sequential rewrite navigation (US-U5 AC5)**
When >3 rewrites exist, there is no keyboard shortcut or "Approve & Next" button. Only bulk Accept All / Reject All is present.

**GAP-UX-D: Session restoration orientation (US-U1 AC3)**
Returning to a persisted session does not surface a human-readable "Welcome back — you were on Rewrites, last active 2 days ago" message.

**GAP-UX-E: Layout instruction scope label phrasing (US-U9 AC1/AC7)**
"Text content is finalised" should read "approved text is never changed". The `<p>` is not associated with the textarea via `aria-describedby`.

**GAP-UX-F: Post-final-generation in-browser preview (US-U6 AC2)**
The final PDF/HTML is previewable in Layout Review but not in the File Review / Download tab after final generation.

**GAP-UX-G: Layout clarification handling (US-U9 AC4)**
No code routes an ambiguous layout instruction to an inline clarifying prompt — the LLM result is applied or errors, with no "ask for clarification" middle path.

**GAP-UX-H: Analysis loading estimated duration (US-U3 AC5)**
The LLM busy overlay shows elapsed time but no estimated wait time. The spec requires an approximate duration label alongside the spinner.

**GAP-UX-I: Review table column collapse definition (US-U8 AC2)**
No media-query column-collapsing rules or DataTables responsive configuration is defined for review tables at ≤1400px.

**GAP-UX-J: Multiple-generation version listing (US-U6 AC6)**
When a user generates final files multiple times, there is no version list distinguishing runs or a "current" label on the most recent.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/job-input.js, web/review-table-base.js, web/layout-instruction.js, web/download-tab.js

| Story  | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|--------|---------|-----------|--------|------------|-------|
| US-U1  | 2       | 2         | 0      | 0          | 0     |
| US-U2  | 3       | 2         | 0      | 0          | 0     |
| US-U3  | 2       | 2         | 1      | 0          | 0     |
| US-U4  | 3       | 2         | 1      | 0          | 0     |
| US-U5  | 4       | 1         | 0      | 0          | 0     |
| US-U6  | 3       | 1         | 0      | 1          | 0     |
| US-U7  | 4       | 2         | 0      | 0          | 0     |
| US-U8  | 0       | 2         | 0      | 1          | 2     |
| US-U9  | 2       | 3         | 0      | 1          | 0     |
| **Total** | **23** | **17** | **2** | **3** | **2** |

**Key evidence references:**
- Step bar HTML: `web/index.html` lines 118–143
- Step state CSS: `web/styles.css` lines 147–180
- Step clickability JS: `web/ui-core.js` lines 1891–1975
- Phase→step mapping: `web/state-manager.js` lines 35–49
- Job input tabs: `web/job-input.js` lines 107–111
- Protected site modal: `web/job-input.js` lines 508–530
- Paste char count: `web/job-input.js` lines 320–337
- Analysis rendering: `web/review-table-base.js` lines 280–377
- Mismatch callout: `web/review-table-base.js` line 317
- Bulk action: `web/review-table-base.js` lines 717–753
- Inline diff CSS: `web/styles.css` lines 1248–1267
- Modal focus trap: `web/ui-core.js` lines 258–347
- Layout scope label: `web/layout-instruction.js` line 302
- Layout undo stack: `web/layout-instruction.js` lines 48–51, 1177–1193
- Layout proceed button: `web/layout-instruction.js` line 388
- Filename convention: `scripts/web_app.py` line 1768
- Download grid: `web/download-tab.js` lines 159–224
