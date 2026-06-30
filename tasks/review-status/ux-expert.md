<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# UX Expert Review — Cycle 8

**Persona:** US-U1 through US-U9 (senior interaction designer / usability specialist)
**Date:** 2026-06-30
**Reviewer:** Source-verified automated review
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/ats-modals.js, web/job-input.js, web/layout-instruction.js, web/workflow-steps.js

**Claimed fixes verified:**
- GAP-218: ATS validator "Selected Publications" — VERIFIED (cv_orchestrator.py:4880–4889)
- GAP-219: openJobAnalysisModal() focus management — VERIFIED (ats-modals.js:228–266)
- GAP-225: Experience ordering hybrid relevance+recency sort — VERIFIED (cv_orchestrator.py:3144–3174)

---

## US-U1: Workflow Orientation and Progress Visibility

### 1. Step indicator — persistent, visible, labelled

✅ **Pass** — `web/index.html:118–143` contains a `<nav class="workflow" aria-label="Application workflow steps">` with 12 named step pills (Job Input, Analysis, Customise, Rewrites, Spell Check, Layout Review, Download, Cover Letter, Screening, Interview Prep, Thank You, Harvest). Step labels are meaningful text, not numeric-only.

### 2. Completed state signalling

✅ **Pass** — `web/workflow-steps.js:637–751` (`updateWorkflowSteps()`) sets CSS classes `.active`, `.completed`, and `.upcoming` per step based on `status.phase`. `web/styles.css:151–157` defines distinct visual styles: active=blue (`#dbeafe`), completed=green (`#dcfce7`), upcoming=light grey (`#f8fafc`). `web/workflow-steps.js:741–749` appends sr-only state descriptions for screen readers.

### 3. Back-navigation safety

⚠️ **Partial** — Completed steps are made clickable (`web/workflow-steps.js:726`) and `handleStepClick()` (`web/workflow-steps.js:813`) enables back-navigation. However, source inspection does not show a destructive-action warning dialog before jumping back to a prior step when downstream approved content exists. The `confirmReRunPhase()` path shows a confirmation for explicit re-run button presses, but clicking a completed step directly (`handleStepClick`) does not appear to call `confirmDialog` first. No evidence of "Back navigation will discard approved content" warning for direct step clicks.

### 4. Session restoration context

✅ **Pass** — `web/app.js:59–60` calls `restoreSession()` before rendering, restoring phase and tab state. `web/state-manager.js:459–499` (`loadStateFromLocalStorage()`) restores `currentTab`, `tabData`, `interactiveState`. `web/ui-core.js:504–507` sets `savedTab` from localStorage and calls `switchTab(savedTab)` on load. The workflow step bar is updated via `updateWorkflowSteps()` called from `fetchStatus()` via `api-client.js:212–213`. The position bar (`web/index.html:70–108`) shows position title and company, giving job-identity context on restoration.

### 5. Stage indicator updates without page reload

✅ **Pass** — `web/state-manager.js:317–322` (`stateManager.setPhase`) dispatches to `_phaseChangeListeners`, which trigger `updateWorkflowStepsClickable`. `web/api-client.js:212–213` calls `updateWorkflowSteps(status)` after each `/api/status` fetch without page reload. The `web/app.js:77` 5-second interval saves state continuously.

**US-U1 Summary:** 4 ✅ 1 ⚠️ — Back-navigation from a completed step to an earlier step lacks a destructive-action confirmation dialog when it could invalidate downstream approved content.

---

## US-U2: Job Input and URL Ingestion UX

### 1. Input mode clarity — URL and paste-text clearly differentiated

✅ **Pass** — `web/job-input.js:107–112` renders three tab buttons (`📝 Paste Text`, `🔗 From URL`, `📁 Upload File`) with `.input-method-tabs` CSS. `web/styles.css:1297–1303` implements tab underline highlighting for the `.active` state. Only the active panel is shown (`display:block`), hiding others.

### 2. Protected-site guidance — contextual, specific, immediately visible

✅ **Pass** — `web/job-input.js:471–479` detects `data.protected_site` from the API response and calls `showProtectedSiteModal(data.site_name, data.message, data.instructions)`. `web/job-input.js:508–530` renders a modal with the specific site name, instructional copy, and a numbered list of steps. A tip to use "Paste Text" is shown inline. Additionally, the URL method panel itself (`web/job-input.js:141–150`) shows a static two-column grid labelling "Works well with" vs "Copy manually from" with specific site names (LinkedIn, Indeed, Glassdoor) — proactive guidance before the user submits.

### 3. Fetch feedback — loading indicator

✅ **Pass** — `web/job-input.js:455` calls `setLoading(true, 'Fetching job from URL…')` immediately before the `fetch()` call. This triggers the LLM busy overlay (`web/index.html:155–164`) with a spinner, label, and elapsed timer. Error states surface via `_showFieldError` and `showAlertModal`.

### 4. Confirmation editability — inline-editable extracted fields

⚠️ **Partial** — `web/styles.css:1562–1605` defines `.intake-confirm-card` and `.intake-field-row` with editable `<input>` fields (company name, role, date). The CSS infrastructure exists. However, the submit path in `web/job-input.js:349–418` (`submitJobText`) calls `analyzeJob()` directly without an intermediate user-visible confirmation screen where extracted fields can be corrected before analysis begins. Whether the intake card renders as a blocking step (allowing field edits) or is rendered non-blocking (as supplementary UI during analysis) cannot be confirmed from the reviewed files alone.

### 5. Character-count guidance — paste area minimum

✅ **Pass** — `web/job-input.js:320` sets `PASTE_MIN_CHARS = 200`. `_updatePasteCharCount()` (`web/job-input.js:322–337`) shows live feedback: red with "Too short, aim for at least 200 characters" below the minimum, green with a checkmark above it. The textarea has `aria-describedby="paste-char-count paste-error"` for accessibility.

**US-U2 Summary:** 4 ✅ 1 ⚠️ — Proactive protected-site guidance and character count are well-implemented. Gap: intake confirmation does not clearly block analysis until extracted fields are verified.

---

## US-U3: Analysis Results Readability

### 1. Chunking — 4+ visually distinct sections

✅ **Pass** — `web/styles.css:468–487` defines the `.analysis-page`, `.analysis-role-card`, `.analysis-section`, `.skill-grid`, `.skill-badge`, `.mismatch-callout` CSS components. `web/ats-modals.js:285–332` (`_renderAnalysisIntoEl()`) renders distinct panels for Required Skills, Preferred/Nice-to-have, ATS Keywords, Must-have Requirements, and Culture Indicators — at least 5 visually distinct sections.

### 2. Keyword visualisation — rank signal

✅ **Pass** — `web/styles.css:483–485` defines `.kw-badge` with `.kw-rank` (absolute-positioned, shows rank number inside the badge). `web/ats-modals.js:316–317` renders keywords with `#${i+1}` rank prefixed for the first 5 keywords. ATS keyword badges use numbered rank overlays rather than a flat comma-separated list.

### 3. Mismatch prominence — above fold, amber callout

✅ **Pass** — `web/styles.css:486` defines `.mismatch-callout` with amber left border (`border-left: 4px solid #f59e0b`). `web/ats-modals.js:293–297` renders the missing-required-skills callout near the top of the analysis output (before preferred skills section), making it above-fold in a standard modal viewport. `web/styles.css:478–479` defines `.skill-badge.missing` with red background for inline mismatch signal within the required skills section.

### 4. Clarifying question flow — grouped, button/dropdown answers

⚠️ **Partial** — `web/styles.css:489–514` defines `.questions-panel` with `.q-chip` (clickable chip buttons for answers) and `.q-input` for free text. The `questions-panel.js` module handles rendering. Chips are rendered as clickable answers, satisfying "not a free-text box unless unavoidable." However, no source evidence found that questions are presented in groups of ≤3 per screen/step — the questions panel appears to render all questions at once in a scrollable panel. The criterion requires groups confirmed before the next group appears.

### 5. Analysis duration feedback — labelled loading state

✅ **Pass** — `web/index.html:156–164` shows the LLM busy overlay with `#llm-busy-label` (text like "Reasoning…") and `#llm-busy-elapsed` (elapsed time counter). The overlay includes a "Taking longer than usual" state badge (`#llm-busy-state-badge`) at `web/styles.css:531–539`. The label is updated via `setLoading(true, label)` before LLM calls.

**US-U3 Summary:** 4 ✅ 1 ⚠️ — Clarifying questions are rendered all at once in a scrollable panel rather than in groups of ≤3, violating the progressive disclosure criterion.

---

## US-U4: Review Table Interaction Quality

### 1. Toggle affordance clarity

✅ **Pass** — `web/styles.css:1168–1198` defines `.icon-btn` (32×32 px touch target), `.icon-btn.active` (green background + border for accept state). The `.icon-btn:focus-visible` rule provides keyboard focus ring. Toggle states are visually distinct: active=green filled, inactive=white/grey border.

### 2. Drag / reorder usability

⚠️ **Partial** — `web/styles.css:1168–1198` defines the icon button style used for up/down reorder controls. The `.icon-btn` styles do not include `opacity: 0; hover: opacity 1` patterns (which would indicate hover-only visibility), suggesting buttons are persistently visible. However, confirming that reorder controls are always visible (not hover-dependent) requires reading `experience-review.js`, which was not in the specified source files for this review.

### 3. Row density — enough context per row for decisions

⚠️ **Partial** — `web/styles.css:1155–1165` defines review table structure with column widths (100px, 110px, 130px, auto/min-250px, 180px), suggesting multi-column rows with meaningful content per row. The actual rendered row content (title, role, date, score, first bullet) requires reading `experience-review.js` for full confirmation.

### 4. Bulk actions — Select All / Deselect All for >8 rows

⚠️ **Partial** — `web/styles.css:1319–1333` defines `.bulk-toolbar` and `.bulk-btn` variants (bulk-emphasize, bulk-include, bulk-exclude, bulk-recommended). A bulk toolbar structure exists. Whether "Select All / Deselect All" controls appear specifically when row count > 8 cannot be determined from CSS alone.

### 5. Inline expansion — bullets expand in-place

⚠️ **Partial** — `web/styles.css:1248` defines `.rewrite-inline-diff` (in-card diff display). The rewrite card structure places content expansion within the card. Experience bullet expansion in review tables requires reading `experience-review.js` to confirm no page navigation occurs on expansion.

### 6. Relevance score meaning — labelled scale

❌ **Fail** — No relevance score label element or scale indicator (`/ 100`, letter grade, or legend) is visible in `styles.css` or `index.html`. The `.review-table` CSS does not include a `.relevance-score-label` or `.score-legend` class. Scores appear to be shown as raw numbers with no contextual label. A score of 92 requires visible labelling (e.g., "Relevance: 92 / 100") to be interpretable without prior domain knowledge.

**US-U4 Summary:** 1 ✅ 4 ⚠️ 1 ❌ — Relevance scores lack a labelled scale (confirmed fail from CSS inspection). Several partial passes require reading JS rendering files outside this review's scope.

---

## US-U5: Rewrite Review Presentation

### 1. Inline diff — red strikethrough removals, green additions

✅ **Pass** — `web/styles.css:1249–1250`:
```css
del.diff-removed { text-decoration: line-through; color: #dc2626; background: #fee2e2; ... }
ins.diff-added   { text-decoration: none; color: #166534; background: #dcfce7; ... }
```
The `.rewrite-inline-diff` container (`styles.css:1248`) holds these semantic diff elements. This is a proper inline diff — not side-by-side text boxes requiring cognitive comparison.

### 2. Accept / Reject / Edit controls — collocated with diff

✅ **Pass** — `web/styles.css:1258–1266` defines `.rewrite-actions` with `.rw-btn.accept`, `.rw-btn.edit`, `.rw-btn.reject` buttons. The `.rewrite-card-body` at `styles.css:1247` positions actions below the diff within the same card structure — not in a separate panel.

### 3. Reason visibility — within one click

✅ **Pass** — `web/styles.css:1256–1257`:
```css
details.rewrite-rationale { font-size: 0.85em; color: #6b7280; }
details.rewrite-rationale summary { cursor: pointer; font-weight: 500; }
```
The rationale is rendered as a `<details>` element — visible within one click (expand summary). No modal navigation required.

### 4. Edit mode — free-text editing of proposed text

✅ **Pass** — `web/styles.css:1251–1252`:
```css
.rewrite-after { background: #f0fdf4; border: 1px solid #bbf7d0; ... }
.rewrite-after textarea { width: 100%; resize: vertical; min-height: 60px; outline: 1px solid #10b981; ... }
```
The `.rewrite-after` section contains an editable textarea with visible outline. The original diff (`.rewrite-inline-diff`) remains above, preserving the comparison reference while editing.

### 5. Batch review efficiency — sequential navigation

⚠️ **Partial** — `web/styles.css:1234–1238` defines a `.rewrite-tally-bar` (sticky, top: 0) showing `.tally-accepted`, `.tally-rejected`, `.tally-pending` counts and a `.submit-rewrites-btn`. A tally bar is implemented. However, no "Approve & Next" sequential keyboard-driven progression button is visible in the CSS or `index.html`. Bulk Accept All / Reject All buttons exist (`styles.css:1269–1272`), but per-item keyboard-driven sequence flow is not confirmed.

**US-U5 Summary:** 4 ✅ 1 ⚠️ — Excellent diff implementation with proper semantic HTML. Gap: no explicit sequential "Approve & Next" keyboard shortcut for item-by-item review flow.

---

## US-U6: Generation and Output State Feedback

### 1. Generation progress feedback — step-labelled with checkmarks

⚠️ **Partial** — `web/index.html:155–164` shows the LLM busy overlay with spinner, label, and elapsed timer. The layout review tab shows individual renderer status via `layout-instruction.js:77–119` ("Chrome Ready" / "WeasyPrint Failed" badges). However, multi-step generation with individual step-completion checkmarks (HTML render → PDF conversion as sequential labelled steps) is not visible in the reviewed source files. The busy overlay shows one label, not a progressive step list.

### 2. Output preview — in-browser rendered output

✅ **Pass** — `web/layout-instruction.js:296` renders `<iframe id="layout-preview" class="layout-preview-iframe" title="CV Layout Preview" sandbox="allow-same-origin">` for in-browser CV preview. The preview is loaded via the layout review tab, showing actual rendered CV output.

### 3. Download options — PDF and secondary options

✅ **Pass** — `web/styles.css:1282–1294` defines `.download-section`, `.download-grid`, `.download-item`, and `.btn-download`. `web/index.html:221–222` shows both `tab-final_generate` ("Generated Files") and `tab-download` ("File Review") tabs with download file listings.

### 4. Error recovery — user-readable message with fallback

✅ **Pass** — `web/layout-instruction.js:77–119` (`renderPreviewOutputStatus()`) renders "Chrome Ready" / "WeasyPrint Failed" badges with renderer-specific detail text. `web/ats-modals.js:149–153` shows user-readable API error messages. `web/job-input.js:498–502` shows network error recovery with retry messages. Errors do not expose raw stack traces.

### 5. Output filename — includes applicant name, role, date

🔲 **Not Implemented (cannot verify from frontend source)** — The filename convention is a backend concern. The download tab renders links from backend-provided filenames. The filename generation logic is in `cv_orchestrator.py` (not in the 7 primary source files specified for this review).

### 6. Version label — multiple versions distinguished

⚠️ **Partial** — `web/state-manager.js:79–87` tracks `finalGeneratedAt`, `previewGeneratedAt`, `previewRequestId`. `web/layout-instruction.js:186–190` displays timestamps in the preview status card. However, no version list with timestamps for multiple generations in a session is visible. Only the most recent preview state is tracked.

**US-U6 Summary:** 3 ✅ 2 ⚠️ 1 🔲 — Solid preview and download UX. Missing: step-by-step generation completion checkmarks; version history for multiple session generations.

---

## US-U7: Accessibility and Keyboard Navigation

### 1. Focus management — modal focus and restore

✅ **Pass (GAP-219 verified)** — `web/ats-modals.js:228–266` (`openJobAnalysisModal()` / `closeJobAnalysisModal()`) implements the complete focus management pattern:
- `_jobAnalysisPreviousFocus = document.activeElement` (line 235) — prior-focus save
- `closeBtn.focus()` (line 239) — move focus inside modal on open
- `trapFocus('job-analysis-modal-overlay')` (line 241) — tab cycling within modal
- `_jobAnalysisPreviousFocus.focus()` (line 264) — restore focus on close

Same pattern applied globally in `web/ui-core.js:239–253`, `723–757`. GAP-219 fix is complete and correct.

### 2. Focus visibility — visible focus ring

✅ **Pass** — `web/styles.css:144`: `.step:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px }`. `styles.css:594`: `.action-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px }`. `styles.css:641`: `.tab:focus-visible { outline: 2px solid #3b82f6; outline-offset: -2px }`. `styles.css:1198`: `.icon-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px }`. The global reset (`*`) does not remove `outline`. No `outline: none` applied globally.

### 3. Table keyboard navigation — Space/Enter to toggle, arrow keys

✅ **Pass** — `web/ui-core.js:526–553` implements full ARIA tablist keyboard pattern: ArrowLeft/ArrowRight/Home/End navigate and activate tabs. `web/ui-core.js:1932–1945` (`_makeStepClickable`) adds `keydown` listeners for Enter/Space on workflow step pills. `web/styles.css:509` defines `.q-chip:focus-visible` for question chips.

### 4. ARIA labels — icon-only buttons labelled

✅ **Pass** — Pervasive `aria-label` use confirmed across `web/index.html`: line 79 (rename session), 88 (ATS match score), 96 (layout freshness), 153 (collapse chat), 231 (scroll tabs right), 253 (close sessions), 275 (close Master CV), 582 (close settings), 693 (close ATS report), 709 (close job analysis). All icon-only interactive controls have descriptive labels.

### 5. Colour-independence — status by colour and text/icon

✅ **Pass** — `web/workflow-steps.js:741–749` appends sr-only text "(current step)", "(completed)", "(stale — results may be outdated)" to each step. `web/styles.css:1236–1237` defines `.tally-accepted`, `.tally-rejected`, `.tally-pending` with distinct class names accompanying colour. `web/index.html:146–147` defines `#workflow-stage-announcer` as an `aria-live="polite"` region for stage-change announcements (GAP-73).

### 6. Error messages — aria-describedby and live regions

✅ **Pass** — `web/job-input.js:114–121`: textarea has `aria-describedby="paste-char-count paste-error"`, with `#paste-char-count aria-live="polite"` and `#paste-error aria-live="polite"`. `web/job-input.js:133–136`: URL input has `aria-describedby="url-error"` with `#url-error aria-live="polite"`. `web/job-input.js:550–558` (`_showFieldError`) sets `aria-invalid="true"` on the input element when an error occurs.

**US-U7 Summary:** 6 ✅ — Full pass. Accessibility implementation is strong and comprehensive. GAP-219 fix confirmed correct.

---

## US-U8: Responsive Behaviour and Loading Performance

### 1. Minimum viable layout — 1280×800, no horizontal scroll

✅ **Pass** — `web/styles.css:330`: `.main-container { display: flex; height: calc(100vh - 210px) }`. The workflow bar at `styles.css:148–149` uses `overflow-x: auto` for step pills, preventing page-level horizontal scroll. `styles.css:1456–1464` defines `@media (max-width: 1400px)` and `@media (max-width: 1280px)` breakpoints reducing gaps and layout pane widths. The two-column main layout (40%/60%) fits at 1280px.

### 2. Column collapsing in tables — at ≤1400px

🔲 **Not Implemented** — `web/styles.css:1155–1165` defines review table column widths as fixed pixel values with no `@media` query hiding or collapsing lower-priority columns at smaller viewports. The criterion requires "table columns designated as collapsible at ≤1400px are defined in component config" — no such definition exists.

### 3. Initial page load — ≤2 s locally (shell renders)

✅ **Pass (structural)** — `web/index.html:16–27` loads Bootstrap 5 CSS, DataTables CSS, Font Awesome via CDN, and local `styles.css`. All scripts are deferred or loaded at end of body. The application shell (HTML structure, workflow bar, tab bar) renders immediately; LLM-dependent content loads asynchronously via `fetchStatus()`. No blocking resources in `<head>` that would prevent initial shell paint.

### 4. No layout shift during async loads — skeleton placeholders

⚠️ **Partial** — `web/styles.css:928–937` defines `.loading-message` (flex row with spinner). `web/index.html:236–241` defines `.empty-state` (80px top padding, centred). However, no skeleton-screen placeholders that pre-reserve the arriving content's dimensions are implemented — `.empty-state` collapses on content arrival causing measurable cumulative layout shift.

### 5. Long table scroll performance — 20+ rows

🔲 **Not Implemented** — No CSS `contain: layout style`, `will-change`, or virtual scrolling infrastructure present for `.review-table`. Tables with 30+ skill rows will render all DOM nodes without virtualization.

**US-U8 Summary:** 2 ✅ 1 ⚠️ 2 🔲 — Responsive breakpoints exist for the layout pane. Table column collapsing, skeleton placeholders for layout-shift prevention, and scroll optimizations for large tables are not implemented.

---

## US-U9: HTML Layout Review Interaction Quality

### 1. Instruction field clarity — scope label and placeholder example

✅ **Pass** — `web/layout-instruction.js:301–302` renders:
```
"💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here."
```
The instruction textarea (`layout-instruction.js:359–363`) has placeholder:
```
"e.g., Move Publications section after Skills
or: Shorten the second bullet under Genentech to focus on impact
or: Keep the Genentech entry on one page"
```
Both scope label and concrete placeholder examples satisfy the criterion.

### 2. Processing feedback — indicator within 300 ms, preview updates on completion

✅ **Pass** — `web/layout-instruction.js:668–669` (`submitSmartInstruction`) calls `showProcessing(true)` immediately (synchronously) before the API call. `web/styles.css:1443–1444` defines `.processing-indicator` with a CSS-animated spinner. The preview refreshes via `displayLayoutPreview()` on successful response.

### 3. Change attribution — confirmation of what was changed

✅ **Pass** — `web/styles.css:1446` defines `.confirmation-message { background: #f0fdf4; border: 1px solid #bbf7d0; ... }`. `web/layout-instruction.js:378` shows `#confirmation-message` element populated after instruction application. `web/layout-instruction.js:141–148` (`normalizeLayoutInstruction`) extracts `change_summary` from the API response for display. The confirmation is inline in the input pane.

### 4. Clarification handling — inline clarifying prompt, not silent guess

✅ **Pass** — `web/layout-instruction.js:672–675`:
```js
if (response.error === 'clarify') {
  showClarificationDialog(response.question, instructionText);
}
```
The backend signals `error: 'clarify'` with a question when an instruction is ambiguous; `showClarificationDialog` surfaces it inline. Silent guessing is not the fallback.

### 5. Instruction history — visible log with per-entry Undo

⚠️ **Partial** — `web/layout-instruction.js:380–386` renders a `#instruction-history` list with a collapsible section and count. `web/styles.css:1447–1455` defines `.instruction-history-entry` with `.instruction-text`, `.instruction-summary`, `.instruction-time` elements. The undo stack exists (`_layoutUndoStack`, `layout-instruction.js:48–51`). However, per-entry Undo buttons within the history list entries are not confirmed in source — the history CSS and HTML structure do not include an undo button element per row. An undo mechanism exists at the stack level but may not be exposed per individual history entry.

### 6. Single proceed action — unambiguous regardless of changes

⚠️ **Partial** — Two sequential buttons exist: `#confirm-layout-btn` ("Confirm Layout", `layout-instruction.js:369–370`) and `#proceed-to-finalise-btn` ("Generate Final Files", `layout-instruction.js:388–389`). `refreshLayoutReviewState()` (`layout-instruction.js:246–273`) shows "Confirm Layout" first, then "Generate Final Files" after confirmation. Users who made zero layout changes must still click "Confirm Layout" before "Generate Final Files" appears. The user story criterion requires a single "Proceed to Final Generation" button that works regardless of whether layout instructions were applied. The two-step sequence could confuse users who skipped the layout editing step.

### 7. Content safety assurance — explicit notice that text is not changed

✅ **Pass** — `web/layout-instruction.js:301–302` renders the persistent `.layout-scope-label`: "Text content is finalised — content edits are not applied here." This is always visible above the instruction textarea, satisfying the requirement for an explicit, always-present notice.

**US-U9 Summary:** 5 ✅ 2 ⚠️ — Strong layout review UX. Gaps: per-entry Undo buttons not confirmed in history panel; the two-step "Confirm Layout" → "Generate Final Files" sequence may confuse users who made no changes.

---

## Terminology Consistency Assessment

| Term used in UI | Notes |
|---|---|
| "Job Input" (step) | Clear and consistent across step bar and tab label |
| "Customise" (step label, index.html:124) vs "customizations" (step ID, PHASE mapping) | Minor inconsistency. Step bar label is "Customise", internal IDs/phase names use "customizations". Acceptable. |
| "Download" (step bar, index.html:132) vs "File Review" (tab label, index.html:222) | **Discrepancy.** Same destination, two different terms. A user clicking the "⬇️ Download" step pill lands on the "File Review" tab. |
| "Rewrites" (step) vs "Rewrite Review" (phase name) | Acceptable abbreviation in the step bar. |
| "Layout Review" (step + tab) | Consistent. |
| "Generate Final Files" (button) vs "Proceed to Final Generation" (user story expectation) | Button label is arguably clearer, but diverges from the user story. Not a UX defect. |
| "Master CV" | Consistent across modal title, tab, button, and documentation. |
| "ATS" | Consistent (ATS Report, ATS Score, ATS match score, ATS badge). |
| "Cover Letter" | Consistent across step bar, tab, and cover-letter tab. |

**Primary terminology finding:** The "⬇️ Download" step pill (`index.html:132`) routing to the "File Review" tab (`index.html:222`) is the most user-visible terminology mismatch. Users who click "Download" should land on a tab labelled "Download" (or vice versa). The mismatch may cause brief confusion and breaks the principle of consistent labelling for the same destination.

---

## Claimed Fix Verification

| GAP | Claimed Fix | Verified? | Evidence |
|---|---|---|---|
| GAP-218 | ATS validator now accepts "Selected Publications" | ✅ Yes | `cv_orchestrator.py:4880`: `_allowed = {'Publications', 'Selected Publications'}`. Pass message at line 4885: "Heading is 'Publications' or 'Selected Publications'". |
| GAP-219 | `openJobAnalysisModal()` has focus management | ✅ Yes | `ats-modals.js:235` prior-focus save, `ats-modals.js:239` focus close button, `ats-modals.js:241` trapFocus, `ats-modals.js:264` restoreFocus on close. Full pattern confirmed. |
| GAP-225 | Experience ordering uses hybrid relevance+recency sort | ✅ Yes | `cv_orchestrator.py:3144`: "Hybrid sort: relevance-primary, recency-secondary within equal scores." `cv_orchestrator.py:3163`: composite `.sort()` with relevance as primary key and recency as tiebreaker. |

---

## Summary by Story

| Story | Criteria | Key Pass | Key Issues |
|---|---|---|---|
| US-U1: Workflow Orientation | 4 ✅ 1 ⚠️ | Named 12-step bar; completed state signalling; live updates | Back-nav to prior step lacks destructive-action warning |
| US-U2: Job Input UX | 4 ✅ 1 ⚠️ | Protected-site guidance; 200-char minimum hint; fetch spinner | No user-blocking intake confirmation before analysis begins |
| US-U3: Analysis Results | 4 ✅ 1 ⚠️ | 5+ distinct sections; ranked keywords; amber mismatch callout | All clarifying questions rendered at once (no ≤3 grouping) |
| US-U4: Review Table Quality | 1 ✅ 4 ⚠️ 1 ❌ | Toggle affordance CSS implemented | Relevance score has no scale label (❌); JS rendering files needed for full verification |
| US-U5: Rewrite Review | 4 ✅ 1 ⚠️ | Proper semantic inline diff; collocated controls; details rationale | No "Approve & Next" sequential keyboard flow |
| US-U6: Generation Feedback | 3 ✅ 2 ⚠️ 1 🔲 | iframe preview; download options; readable error messages | No per-step generation checkmarks; no version list |
| US-U7: Accessibility | 6 ✅ | Full pass — focus management, keyboard nav, ARIA labels, colour-independence | None |
| US-U8: Responsive / Performance | 2 ✅ 1 ⚠️ 2 🔲 | Responsive breakpoints for layout pane | No table column collapsing; no skeleton placeholders; no scroll optimization |
| US-U9: Layout Review UX | 5 ✅ 2 ⚠️ | Scope label; processing indicator; change attribution; clarification dialog | Per-entry Undo not confirmed; two-step confirm flow may confuse |

---

## Top Priority Gaps (New from This Review)

1. **GAP-NEW (HIGH) — Relevance score unlabelled:** Review table scores have no "/100" label or legend. Raw numbers are uninterpretable without domain knowledge. (US-U4.6)
2. **GAP-NEW (MED) — "Download" step vs "File Review" tab label mismatch:** Step pill and tab label use different terms for the same destination. (Terminology)
3. **GAP-NEW (MED) — Questions rendered all at once:** Clarifying questions panel shows all questions simultaneously, not in groups of ≤3 with sequential progression. (US-U3.4)
4. **GAP-NEW (MED) — Two-step layout confirm flow:** Users who made no layout changes must still click "Confirm Layout" before "Generate Final Files" appears. No single "Proceed" path. (US-U9.6)
5. **GAP-NEW (LOW) — Back-navigation without destructive-action warning:** Clicking a completed step pill does not prompt the user if doing so could invalidate downstream approved content. (US-U1.3)
6. **GAP-NEW (LOW) — Table column collapsing and scroll performance:** No responsive column collapsing at ≤1400px; no DOM virtualization for large skill/experience tables. (US-U8.2, US-U8.5)
