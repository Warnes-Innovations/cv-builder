<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# UX Expert Review

**Date:** 2026-07-04 (status corrections cycle 64; GAP-UX-09 partial fix cycle 66)
**Reviewer:** ux-expert persona
**Source files examined:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, web/job-input.js, web/rewrite-review.js, web/keyboard-shortcuts.js, web/layout-instruction.js, web/workflow-steps.js

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

**Criterion 1 — Step indicator**
✅ Pass — A persistent horizontal `<nav class="workflow">` bar (index.html:122–148) displays 12 named stages with emoji labels: Job Input → Analysis → Customise → Rewrites → Spell Check → Layout Review → File Review → Cover Letter → Screening → Interview Prep → Thank You → Harvest. Labels are meaningful and not numeric-only.

**Criterion 2 — Completed state signalling**
✅ Pass — `workflow-steps.js:854–906` applies `.active` (blue), `.completed` (green/`#dcfce7`), `.upcoming` (muted grey), `.stale` (amber), and `.forward-skip` (dashed blue) classes. CSS at `styles.css:165–173` gives each distinct visual treatment with explicit background and text colour differences. Screen-reader text is appended as `.sr-only` spans with state descriptions.

**Criterion 3 — Back-navigation safety**
⚠️ Partial — Completed steps are clickable (`ui-core.js:1827–1924`). Re-running a phase uses `confirmReRunPhase()` which triggers a modal confirmation before discarding downstream state. However, clicking a completed step in the workflow nav does not explicitly warn about downstream effects; the warning only appears for the ↻ re-run button. A user could jump backwards by clicking a completed step without realising it might invalidate later-stage content.

**Criterion 4 — Session restoration context**
✅ Pass — `session-manager.js:498` (`restoreSession`) restores the session; the position bar (index.html:78–87) shows the job title and company name via `#position-title` / `#position-company`. `#header-session-name` (index.html:41) shows the session identifier. `updateWorkflowSteps()` in `workflow-steps.js` is called after status fetch to restore step state.

**Stage indicator update without reload**
✅ Pass — `stateManager.onPhaseChange()` listener (`ui-core.js:1947–1950`) calls `updateWorkflowStepsClickable()` on phase change. `fetchStatus()` in `api-client.js:218–219` calls `updateWorkflowSteps(status)` on each poll.

**Notable gap:** No visible "last active" timestamp is displayed when a user returns to a session. The session switcher modal shows timestamps per session, but once a session is loaded the header only shows position name, not "last edited 2 hours ago."

---

### US-U2: Job Input and URL Ingestion UX

**Criterion 1 — Input mode clarity**
✅ Pass — `job-input.js:107–111` renders three mutually exclusive tabs: "Paste Text", "From URL", "Upload File" with `.input-tab.active` styling. CSS at `styles.css:1346–1352` clearly differentiates the active tab with a bottom border and colour change.

**Criterion 2 — Protected-site guidance**
✅ Pass — `job-input.js:140–149` renders a two-column grid: a green box listing "Works well with" (company career pages, AngelList, etc.) and an amber box listing "Copy manually from: LinkedIn / Indeed / Glassdoor" — specific site names are named, the copy is contextual, and the guidance appears inline without requiring a fetch failure first.

**Criterion 3 — Fetch feedback**
⚠️ Partial — `fetchJobFromURL()` calls `setLoading(true)` and disables the fetch button, but the fetch loading indicator is not guaranteed to appear within 300ms. The LLM busy overlay shows label and elapsed time for LLM calls, but URL fetch uses the simpler button-disabled pattern without a dedicated spinner visible near the fetch button.

**Criterion 4 — Confirmation editability**
⚠️ Partial — After URL fetch or paste, job text is stored and displayed with a "Load Different Job" option (job-input.js:75). Extracted fields (company name, role title) are editable via the Intake confirmation step, but this path is not immediately surfaced inline after text submission — a separate re-analysis step would be needed to correct an extracted field. No immediate inline-editable field set for company/role on the confirmation step was found in job-input.js.

**Criterion 5 — Character-count guidance**
✅ Pass — `job-input.js:322` defines `PASTE_MIN_CHARS = 200`. `_updatePasteCharCount()` at lines 331–337 renders "minimum 200 characters" hint while below threshold and "✓" when met. `job-input.js:344–345` additionally shows a field error when submitting short text. Minimum-length guidance is present and ARIA-live.

---

### US-U3: Analysis Results Readability

**Criterion 1 — Chunking**
✅ Pass — `styles.css:485–503` defines `.analysis-role-card`, `.analysis-section`, `.skill-badge`, `.kw-badge`, `.mismatch-callout` as clearly separate visual chunks. The analysis tab renders role identity, required qualifications, preferred list, keyword badges, and mismatch callouts as distinct card/panel sections.

**Criterion 2 — Keyword visualisation**
✅ Pass — `styles.css:500–501` defines `.kw-badge` with an absolutely-positioned `.kw-rank` number. Keywords display as ranked badges with a numeric rank indicator, not as a flat comma-separated list.

**Criterion 3 — Mismatch prominence**
✅ Pass — `.mismatch-callout` (`styles.css:502`) uses amber/warning styling (`#fffbeb`, amber border-left) and appears within the analysis section structure. `.skill-badge.missing` (`styles.css:495`) uses red background for missing skills.

**Criterion 4 — Clarifying question flow**
✅ Pass — `questions-panel.js:326` defines `GROUP_SIZE = 3`. `renderQuestionsPanel()` paginates questions into groups of 3, advancing to the next group after all chips in a group are answered. The `q-progress` element shows "Group N of M" progress. Questions are presented in batches, not all at once.

**Criterion 5 — Analysis duration feedback**
✅ Pass — The LLM busy overlay (`#llm-busy-overlay`, `#llm-busy-label`, `#llm-busy-elapsed`) shows a labelled spinner with elapsed time counter and a "Taking longer than usual" badge for slow calls (index.html:160–167). The label is `aria-live="polite"` with `role="status"`.

---

### US-U4: Review Table Interaction Quality

**Criterion 1 — Toggle affordance clarity**
✅ Pass — Review tables use 32×32px `.icon-btn` buttons (`styles.css:1199–1226`) with explicit `.active` state (green background, colour change). The `aria-pressed` attribute is set on rewrite accept/reject buttons (`rewrite-review.js:426–428`). Sufficient size at standard viewing distances.

**Criterion 2 — Drag / reorder usability**
⚠️ Partial — Up/down reorder buttons are present in review tables and are always rendered (not hover-only). However, no drag-and-drop is implemented; only up/down arrow buttons. Keyboard accessibility for reorder (arrow keys triggering reorder) is not confirmed from source — only Enter/Space on the button itself would work.

**Criterion 3 — Row density**
✅ Pass — Review tables show role, date, relevance score, and first bullet content at a glance via the `.review-table` structure. Row density is moderate.

**Criterion 4 — Bulk actions**
✅ Pass — A `.bulk-toolbar` (`styles.css:1368–1382`) with bulk accept/reject and selection actions is implemented for review tables. Rewrite review has "Accept All / Reject All" in the `.rewrite-tally-bar` (`rewrite-review.js:274–275`).

**Criterion 5 — Inline expansion**
✅ Pass — Rewrite cards expand inline within the same `#document-content` panel without page navigation. The `applyRewriteAction()` function shows the edit textarea below the diff card without navigating away (`rewrite-review.js:451`).

**Criterion 6 — Relevance score meaning**
⚠️ Partial — Relevance scores are shown as `.confidence-badge` elements (High/Medium/Low text labels). However, no numeric scale (e.g. "Relevance: 92 / 100") is displayed — only qualitative labels. The scale is implied by badge colour and label but not explicitly explained with a visible legend.

---

### US-U5: Rewrite Review Presentation

**Criterion 1 — Inline diff**
✅ Pass — `rewrite-review.js:370–371` renders `<del class="diff-removed">` (red strikethrough, `#fee2e2` background) and `<ins class="diff-added">` (green, `#dcfce7` background) within `.rewrite-inline-diff`. CSS at `styles.css:1283–1284` confirms red/strikethrough for removals and green for additions.

**Criterion 2 — Accept / Reject / Edit controls**
✅ Pass — `rewrite-review.js:426–428` renders Accept, Edit, Reject buttons within `.rewrite-actions` inside the same card as the diff. Controls are collocated with their diff.

**Criterion 3 — Reason visibility**
✅ Pass — `rewrite-review.js:414–417` renders `<details class="rewrite-rationale">` with a `<summary>` — the rationale is one click away inline, within the card. `styles.css:1290–1291` styles it as a collapsible detail element.

**Criterion 4 — Edit path**
✅ Pass — `rewrite-review.js:451` notes "Keep the inline diff visible as a reference; show the editable textarea below it." Editing preserves the original diff view for comparison. The diff is re-shown after edit is cancelled (`rewrite-review.js:527`).

**Criterion 5 — Batch review efficiency**
✅ Pass — `keyboard-shortcuts.js` implements: A key to accept focused card, R key to reject, Up/Down to navigate between cards, Ctrl+Enter for the primary action, and `?` for the shortcut help panel. A compact mode toggle (`rw-compact-toggle`) enables rapid single-line card review.

---

### US-U6: Generation and Output State Feedback

**Criterion 1 — Generation progress feedback**
⚠️ Partial — The `#llm-busy-overlay` shows a spinner with elapsed time and a label, but does not show named step-by-step progress (e.g. "Step 1 of 3: Generating HTML… Step 2: Converting to PDF…"). Generation progress is logged in the conversation panel via messages, but no dedicated step-labelled progress bar with checkmarks is visible.

**Criterion 2 — Output preview**
✅ Pass — Layout review (`layout-instruction.js:296`) renders an `<iframe id="layout-preview">` that shows the CV HTML inline. The download tab provides file links with in-browser access.

**Criterion 3 — Download options**
✅ Pass — `download-tab.js` renders a grid of files including PDF, DOCX (ATS and human), HTML preview, and cover letter files. Multiple download options are surfaced.

**Criterion 4 — Error recovery**
✅ Pass — `layout-instruction.js` (cycle 59) now adds a "View HTML preview" link below the renderer failure error detail, opening `/api/cv/preview-output/html` in a new tab. The HTML fallback is surfaced inline alongside the PDF failure.

**Criterion 5 — Output filename**
✅ Pass — `cv_orchestrator.py:1452` constructs `filename_base = f"CV_{company}_{role}_{timestamp}"` and lines 3951/4556 produce `CV_{company}_{role}_{timestamp}_ATS.docx` and `CV_{company}_{role}_{timestamp}.docx`. The naming convention matches the acceptance criteria.

**Criterion 6 — Version label**
⚠️ Partial — The layout preview status card shows a generated timestamp. However, if a user generates multiple times in a session, there is no numbered version list with a "current" label — the download grid silently reflects only the most recent generation.

---

### US-U7: Accessibility and Keyboard Navigation

**Criterion 1 — Focus management**
✅ Pass — `ui-core.js:249–346` implements `_focusStack`, `setInitialFocus()`, `trapFocus()`, and `restoreFocus()` for modal focus management. `confirmDialog()` (`ui-core.js:371–443`) also implements its own focus trap with Escape key support and focus restoration.

**Criterion 2 — Focus visibility**
✅ Pass — `:focus-visible` selectors throughout `styles.css` apply `outline: 2px solid var(--cv-accent)`. `.intake-field-row input:focus` at `styles.css:1791–1796` sets `border-color: var(--cv-accent); outline: 2px solid var(--cv-accent); outline-offset: 2px; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);` — the `outline: none` without replacement cited in the earlier review has been corrected; the current code provides a proper WCAG-compliant focus indicator.

**Criterion 3 — Table keyboard navigation**
✅ Pass — Tab ARIA pattern (`ui-core.js:461–487`) implements ArrowLeft/ArrowRight/Home/End for tab navigation. `keyboard-shortcuts.js:84–124` provides Up/Down arrow for review card navigation. Enter/Space activate focused tabs and buttons.

**Criterion 4 — ARIA labels**
✅ Pass — Icon-only buttons have `aria-label` attributes throughout (index.html:66, 82, 100, 118, 157, 206, 235). Workflow steps have `aria-current="step"` set on the active step (`ui-core.js:1922–1924`). A `#workflow-stage-announcer` aria-live region exists (index.html:150–151). Modals have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.

**Criterion 5 — Colour-independence**
✅ Pass — `rewrite-review.js:424` renders `#rw-decision-badge-${cardId}` (initially hidden). `applyRewriteAction()` at line 508–512 shows a persistent "✓ Accepted" or "✗ Rejected" text badge with background colour on the card after each decision — state is communicated by both text and colour. ATS score uses colour-coded badges; the text label ("High"/"Medium"/"Low") also communicates the score level independent of colour.

**Criterion 6 — Error messages**
✅ Pass — Field validation errors use `aria-describedby` (`job-input.js:116`) and `.field-error` elements with `aria-live="polite"` (`styles.css:1364–1366`). The settings status message uses `aria-live="polite"` (index.html:589).

---

### US-U9: HTML Layout Review Interaction Quality

**Criterion 1 — Instruction field clarity**
✅ Pass — `layout-instruction.js:302` renders a `.layout-scope-label` reading "Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." The textarea placeholder (layout-instruction.js:363) has concrete examples.

**Criterion 2 — Processing feedback**
✅ Pass — `#processing-indicator` (`layout-instruction.js:374–377`) with a spinner and "Applying instruction..." text appears during submission. `#confirmation-message` (`layout-instruction.js:379`) appears after completion.

**Criterion 3 — Change attribution**
✅ Pass — `#confirmation-message` shows a confirmation after each instruction is applied. The instruction history list (`#instruction-history`) is updated after each application (`layout-instruction.js:1037`).

**Criterion 4 — Clarification handling**
— Not Verified — The backend conversation manager handles ambiguous instructions; no frontend-level clarification prompt UI was found in layout-instruction.js. If the LLM cannot parse the instruction, response flows through the chat conversation rather than an inline clarifying prompt panel.

**Criterion 5 — Instruction history with Undo**
✅ Pass — `layout-instruction.js:49–51` implements `_layoutUndoStack` (capped at 20 entries). `renderInstructionHistory()` (`layout-instruction.js:1043+`) renders each history entry with individual Undo buttons (sequential — only the most recent can be undone at a time, noted in the `disabled` title at line 1056).

**Criterion 6 — Single proceed action**
⚠️ Partial — Two distinct proceed buttons exist: `#confirm-layout-btn` ("Confirm Layout") and `#proceed-to-finalise-btn` ("Generate Final Files"), with visibility controlled by layout state. The two-stage flow is logical but requires users to understand the distinction between confirming layout and triggering final generation. No inline explanation for new users is present.

**Criterion 7 — Content safety assurance**
✅ Pass — The `.layout-scope-label` states "Text content is finalised — content edits are not applied here." This notice is visible before the user types any instruction.

---

### US-U8: Responsive Behaviour and Loading Performance

**Criterion 1 — Minimum viable layout at 1280×800**
⚠️ Partial — The 12-step workflow nav scrolls horizontally. Cycle 66 added `justify-content: flex-start` at `max-width:1400px` (prevents left-items cut-off on scroll), reduced step pill padding/gap/font at `max-width:1280px`, and `scrollbar-width: thin` globally. The bar still requires horizontal scroll at 1280×800; full collapse or step-label abbreviation is not yet implemented.

**Criterion 2 — Column collapsing in tables**
⚠️ Partial — No `@media` query hides review table columns at narrow widths. The session manager table hides on mobile (`styles.css:338–343` at `max-width:700px`), but review tables lack this pattern.

**Criterion 3 — Initial page load ≤2s locally**
— Not Verified — Cannot assess runtime performance from static code review. CSS uses CDN-hosted Bootstrap, Font Awesome, DataTables, jQuery, and marked.js — all loaded synchronously or with `defer`. Bundle.js is a local build.

**Criterion 4 — No layout shift during async loads**
⚠️ Partial — The `#document-content` area shows an empty state and a loading spinner during `showLoadJobPanel()`. However, no skeleton screens or dimensioned placeholders are used for main content areas — height is undefined before content loads, which can cause cumulative layout shift when async content arrives.

**Criterion 5 — Long table scroll performance**
— Not Verified — No virtual scrolling or CSS containment was found for the skills review table. Performance depends on runtime rendering of 30+ row tables.

---

## Generated Materials Evaluation

**Output filename convention**
✅ Pass — Files are named `CV_{company}_{role}_{timestamp}.docx`, `CV_{company}_{role}_{timestamp}_ATS.docx`, `CV_{company}_{role}_{timestamp}_preview.html` (`cv_orchestrator.py:1452, 2366, 3951, 4556`). Convention is consistent and includes company, role, and date.

**ATS-optimised DOCX differentiation**
✅ Pass — ATS files have `_ATS` suffix and `download-tab.js:44–48` applies a robot icon and description "ATS-optimised DOCX (plain text, no formatting)" to distinguish them from human-readable PDFs.

**In-browser preview**
✅ Pass — Layout review shows an iframe preview of the HTML CV (`layout-instruction.js:296`). The download tab provides links to open HTML preview files in-browser.

**Rewrite audit trail**
✅ Pass — `_renderRewriteAuditLog()` (`rewrite-review.js:161–198`) produces an auditable history of accept/reject/edit decisions per bullet, with original and proposed text, displayed as a collapsible section after the rewrite panel.

**Relevance score in generated output**
⚠️ Partial — ATS score is surfaced in the position bar as a score badge and in the ATS Score tab. Review tables show confidence badges but without numeric scale labels or a visible legend.

---

## Additional Story Gaps / Proposed Story Items

**GAP-UX-01: Session age not shown on restoration**
When a user returns to a persisted session, the header shows the job title but not when the session was last active. A "Last edited 3h ago" line below the position title would immediately orient returning users (US-U1 Criterion 4 partial).

**GAP-UX-02: Back-navigation on completed steps lacks destructive-action warning**
Clicking a completed step in the workflow nav does not confirm before navigating back. Only the ↻ re-run icon triggers a confirmation. A user clicking "Customise" from "Spell Check" should receive a confirmation if navigating back would invalidate downstream work (US-U1 Criterion 3).

**GAP-UX-03: Paste text minimum-length hint** ~~absent~~ **— RESOLVED (stale)**
`job-input.js:322–345` implements `PASTE_MIN_CHARS = 200` with inline guidance in `_updatePasteCharCount()`. Minimum-length hint is present and live (US-U2 Criterion 5 ✅).

**GAP-UX-04: Questions presented all at once** **— RESOLVED (stale)**
`questions-panel.js:326` sets `GROUP_SIZE = 3` and pages questions in groups. US-U3 Criterion 4 ✅.

**GAP-UX-05: Relevance/confidence scores lack explicit scale labels**
Review tables show High/Medium/Low confidence badges but no explicit legend (e.g. "High = >80%", "Low = <40%") or numeric equivalents. Users must infer the scale (US-U4 Criterion 6).

**GAP-UX-06: HTML fallback alongside error** **— RESOLVED (stale, cycle 59)**
`layout-instruction.js` adds "View HTML preview" link beside PDF failure. Remaining gap: no named step-sequence progress (HTML render → PDF → Done) — still open (US-U6 Criterion 1 ⚠️).

**GAP-UX-07: Colour-only rewrite card state** **— RESOLVED (stale)**
`rewrite-review.js:508–512` shows persistent "✓ Accepted" / "✗ Rejected" text badge. US-U7 Criterion 5 ✅.

**GAP-UX-08: intake-field-row focus outline** **— RESOLVED (stale)**
`styles.css:1791–1796` applies `outline: 2px solid var(--cv-accent); outline-offset: 2px` on `.intake-field-row input:focus`. WCAG 2.1 AA compliant. US-U7 Criterion 2 ✅.

**GAP-UX-09: Workflow nav horizontal scroll at narrow widths — PARTIAL FIX (cycle 66)**
`styles.css` now: (1) switches `.workflow-steps` to `justify-content: flex-start` at `max-width:1400px` so scrollable content is not cut off on the left; (2) reduces step pill padding to `6px 10px`, gap to `10px`, and font to `0.9em` at `max-width:1280px`; (3) adds `scrollbar-width: thin` globally. The 12-step bar still requires horizontal scroll at 1280×800 but the scroll now starts from step 1 (not mid-bar) and pills are more compact. Full nav collapse/abbreviation at very narrow widths remains unimplemented (US-U8 Criterion 1).

**GAP-UX-10: Layout review two-button proceed path needs explanation**
The "Confirm Layout" → "Generate Final Files" two-step path is not explained to new users. A tooltip or inline note clarifying the two-stage intent would reduce confusion (US-U9 Criterion 6).

**GAP-UX-11: No skeleton placeholders for async content areas**
Content areas show no skeleton placeholders before LLM response arrives, causing cumulative layout shift when content populates (US-U8 Criterion 4).

---

## Evidence Summary

| Story | Result | Key Evidence |
| ------- | -------- | -------------- |
| US-U1 Workflow orientation | ✅ / ⚠️ | index.html:122–148; workflow-steps.js:778+; styles.css:165–173; gap: no session age on restore, back-nav warning absent |
| US-U2 Job input UX | ✅ | job-input.js:107–183; protected-site guidance present; min-length hint present (PASTE_MIN_CHARS=200) |
| US-U3 Analysis readability | ✅ | styles.css:484–503; kw-badge rank numbers present; questions paged by GROUP_SIZE=3 |
| US-U4 Review table interaction | ✅ / ⚠️ | styles.css:1199–1226; rewrite-review.js:274–275 (bulk); relevance badges lack numeric scale |
| US-U5 Rewrite review | ✅ Pass | rewrite-review.js:370–371 (diff); keyboard-shortcuts.js (A/R/Up/Down); rationale via `<details>` |
| US-U6 Generation feedback | ✅ / ⚠️ | CV filenames pass; HTML fallback alongside error fixed (cycle 59); no named step-sequence progress still open |
| US-U7 Accessibility | ✅ | Focus trap in ui-core.js:249–346; ARIA labels throughout; intake focus outline corrected at styles.css:1791 |
| US-U9 Layout review UX | ✅ / ⚠️ | Scope label present; undo stack implemented; two-button proceed path lacks new-user explanation |
| US-U8 Responsive/performance | ⚠️ Partial | 12-step nav overflows at narrow widths; no skeleton placeholders; CDN blocking not assessed |
