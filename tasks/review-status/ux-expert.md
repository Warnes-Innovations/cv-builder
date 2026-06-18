<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
-->

# UX Expert Review Status — Cycle 3

**Last Updated:** 2026-06-18
**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/layout-instruction.js, web/job-input.js, web/rewrite-review.js, web/review-table-base.js, web/workflow-steps.js

**Executive Summary (Cycle 3):** Three cycle-2 regressions are now fixed: tab keyboard navigation (tabindex attributes are present), Enter/Space activation (wired in `ui-core.js:518`), and the layout scope label now correctly scopes layout-only changes. Cycle-3 finds the application has reached a high baseline for workflow orientation, job input UX, rewrite review, accessibility modal handling, and layout review infrastructure. Seven gaps remain actionable: (1) extracted job metadata (company, role title) is still not inline-editable after URL fetch; (2) clarifying questions display all-at-once rather than in groups of ≤3; (3) the layout proceed button label is "Generate Final Files" rather than "Proceed to Final Generation"; (4) the layout-freshness-chip retains an empty `aria-label=""`; (5) `.message-input` has `outline: none` set unconditionally (not just on `:focus`), which removes the native focus ring at all times without a guaranteed styled replacement; (6) no sequential keyboard shortcut for rewrite batch navigation; (7) no per-file version timestamp in the download tab.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

**AC 1.1 — Stage indicator present and accurate on every step view; active stage is unambiguous.**
✅ Pass — `index.html:117–143` defines a 13-pill horizontal step bar (Job Input → Analysis → Customise → Rewrites → Spell Check → Layout Review → Download → Cover Letter → Screening → Interview Prep → Thank You → Harvest). `workflow-steps.js:683–714` (`updateWorkflowSteps`) applies `.active`, `.completed`, `.stale`, `.stale-critical` CSS classes from `styles.css:150–159` on every status poll without page reload.

**AC 1.2 — Completed steps visually distinct from active and upcoming.**
✅ Pass — `styles.css:150–154`: `.step.active` = blue (#dbeafe), `.step.completed` = green (#dcfce7), `.step.upcoming` = ghost grey (#f8fafc), `.step.stale` = amber, `.step.stale-critical` = red. Distinct palette; all three states differentiated at a glance.

**AC 1.3 — Back-navigation preserves approved content; destructive actions require explicit confirmation.**
⚠️ Partial — `workflow-steps.js:138–187` implements `_showReRunConfirmModal()` which fires for re-run actions. `ui-core.js:372–443` provides `confirmDialog()`. However, clicking a completed step that is not a re-run target (e.g. clicking Analysis from Rewrites) calls `handleStepClick()` → `backToPhase()` without any confirmation dialog. Users can navigate back past in-progress work silently.

**AC 1.4 — Returning to a session lands user on last active step with data intact.**
⚠️ Partial — `session-manager.js` restores phase and calls `switchTab()` to the appropriate tab. The position-bar populates job title and company. However there is no explicit orientation card on restore showing "job: [Title] at [Company] — currently at Rewrites — last active 2h ago." The session-restore message in the chat panel conveys only that a restore occurred. Orientation context is fragmented across the position bar and the chat history rather than surfaced as a unified summary.

**Stage indicator updates without reload.**
✅ Pass — `ui-core.js:1958–1961`: `stateManager.onPhaseChange()` listener fires `updateWorkflowStepsClickable(phase)` on each phase transition.

---

### US-U2: Job Input and URL Ingestion UX

**AC 2.1 — URL and paste-text modes clearly delineated; active mode state is visually obvious.**
✅ Pass — `job-input.js:107–111`: three equal-weight input-method tab buttons (📝 Paste Text, 🔗 From URL, 📁 Upload File) with `.active` class styling. Each tab controls a separate `.input-method` panel shown/hidden via `switchInputMethod()`. Modes are clearly delineated; active state is obvious.

**AC 2.2 — Protected-site detection triggers inline, contextual copy-paste instruction with specific site name.**
✅ Pass — `job-input.js:471–479`: on `data.protected_site`, calls `showProtectedSiteModal(data.site_name, data.message, data.instructions)` with numbered steps. Additionally, `job-input.js:140–149` renders a proactive two-column advisory grid naming LinkedIn, Indeed, and Glassdoor with "copy manually" reasons — visible immediately without waiting for a failed fetch.

**AC 2.3 — Fetch loading state appears within 300 ms of submission.**
✅ Pass — `job-input.js:455`: `setLoading(true, 'Fetching job from URL…')` called synchronously before the `fetch()` call. Global `#llm-busy-overlay` (`index.html:153–162`) shows spinner + label immediately.

**AC 2.4 — Extracted fields editable in-place; editing does not restart workflow.**
❌ Fail — `job-input.js:49–84` (`populateJobTab`): the extracted company name, role title, and URL are rendered as a static `<h1>` and `<p class="company">` with no inline-edit controls. A user who notices a wrong company name has no in-place correction path and must re-submit the job description or use the chat panel. This is an unaddressed gap since cycle 1.

**AC 2.5 — Paste area shows a minimum character guidance hint.**
✅ Pass — `job-input.js:320–336`: `PASTE_MIN_CHARS = 200`. `_updatePasteCharCount()` updates a live counter with red/green colour feedback. `aria-describedby="paste-char-count paste-error"` links the counter to the textarea (`job-input.js:116`).

---

### US-U3: Analysis Results Readability

**AC 3.1 — Analysis result has at minimum 4 visually distinct sections.**
✅ Pass — `review-table-base.js:289–362` (`populateAnalysisTab`) renders: (1) Role & Domain card, (2) Mismatch callout, (3) Required Skills grid (`.skill-grid` with `.skill-badge`), (4) Preferred / Nice-to-Have list, (5) ATS Keywords with rank badges (`.kw-badges`). Five or more named sections are produced.

**AC 3.2 — Keywords displayed with visual rank signal (not flat comma list).**
✅ Pass — `review-table-base.js:336–342`: ATS keywords rendered as `<span class="kw-badge"><span class="kw-rank">#${idx + 1}</span>${kw}</span>`. Section header reads "(higher rank = higher priority)". Not a flat list.

**AC 3.3 — Mismatch callouts visible above the fold.**
⚠️ Partial — `review-table-base.js:300–309`: mismatch callout renders immediately after the role card, placing it above the fold. However, the callout is conditional on `window._masterSkills` being populated; if the master skills array is empty or not yet loaded, no mismatch is shown regardless of actual gaps. No above-fold summary count for more than 3 mismatches.

**AC 3.4 — Clarifying questions presented in groups of ≤3 per screen.**
❌ Fail — `questions-panel.js` renders all post-analysis questions as a single flat list in the Questions tab. No evidence of sequential grouping into batches of ≤3 with a "confirm before next group" flow. This criterion remains unimplemented since cycle 1.

**AC 3.5 — Loading state for analysis includes descriptive label and estimated duration.**
⚠️ Partial — `index.html:153–162`: LLM busy overlay shows elapsed time counter and a generic label. `job-analysis.js` provides "Analysing job description…" as a step label, but no estimated duration (e.g. "this usually takes ~20 seconds") is shown. Elapsed counter is present but not an estimate.

---

### US-U4: Review Table Interaction Quality

**AC 4.1 — Accept/reject toggles visually obvious; current state unambiguous.**
✅ Pass — Icon buttons use `.icon-btn.active { background: #10b981; color: #fff }` (`styles.css:1169–1175`) to show included state. Buttons are 32×32px; state is visible without hover. `aria-label` names the action and target entry.

**AC 4.2 — Reorder controls discoverable without hover; keyboard-accessible.**
✅ Pass — `experience-review.js`: up/down reorder buttons are always rendered (not hover-only). `disabled` attribute set for first/last rows. Buttons are `<button>` elements natively keyboard-operable via Tab + Space/Enter. No arrow-key shortcut for row movement (minor gap, not a story failure).

**AC 4.3 — Row density shows enough content for decisions without expanding every row.**
⚠️ Partial — Experience review shows title, company, dates, recommendation tier, reasoning excerpt, and action buttons per row. However, no first-bullet preview is shown inline; users cannot preview included bullets without additional interaction.

**AC 4.4 — Bulk actions present when row count > 8.**
✅ Pass — `experience-review.js:241–250`: bulk toolbar always rendered above the table ("Accept All Recommended", "Emphasize All", "Include All", "Exclude All").

**AC 4.5 — Bullet expansion is in-place, no page navigation.**
✅ Pass — Experience bullet reorder (`showBulletReorder()`) renders an inline panel within the tab; it does not navigate away or reset scroll position.

**AC 4.6 — Relevance scores labelled with scale.**
❌ Fail — Experience recommendations are rendered as tier text (Emphasize / Include / De-emphasize / Omit) with no numeric relevance score with a denominator. `publications-review.js` shows a raw score with no "/ 10" denominator label confirmed in the source. Inconsistent across tables; criterion requires "Relevance: 92 / 100" or letter grade with legend.

---

### US-U5: Rewrite Review Presentation

**AC 5.1 — All rewrite proposals display inline diff with red/strikethrough removals and green additions.**
✅ Pass — `rewrite-review.js:183–226` implements LCS word-level diff (`computeWordDiff` / `renderDiffHtml`). Output uses `<del class="diff-removed">` (red strikethrough, `styles.css:1241`) and `<ins class="diff-added">` (green background, `styles.css:1242`). True inline diff confirmed.

**AC 5.2 — Accept, Reject, Edit controls within the same card as the diff.**
✅ Pass — `rewrite-review.js:272–275`: ✓ Accept, ✎ Edit, ✗ Reject buttons in `.rewrite-actions` inside each `.rewrite-card-body`, collocated with the diff view.

**AC 5.3 — LLM rewrite reason visible within one click or hover.**
✅ Pass — `rewrite-review.js:261–265`: `<details class="rewrite-rationale"><summary>Rationale & Evidence</summary>` expands inline on one click without separate panel navigation.

**AC 5.4 — Edit mode allows free-text editing; preserves original for comparison.**
✅ Pass — `rewrite-review.js:293–351`: edit mode shows a `<textarea>` pre-filled with proposed text. `saveRewriteEdit()` regenerates the word-level inline diff against `data-original` using the user-edited text. Original preserved throughout.

**AC 5.5 — Keyboard shortcut or sequential "Approve & Next" present when more than 3 rewrites exist.**
❌ Fail — No sequential keyboard navigation is implemented. Users must scroll manually through all cards. The tally bar provides bulk accept/reject, but no "Approve & Next →" shortcut or sequential card progression exists.

---

### US-U6: Generation and Output State Feedback

**AC 6.1 — Generation progress is step-labelled; each completed step shows a checkmark before next begins.**
⚠️ Partial — The LLM busy overlay (`index.html:153–162`) shows a spinner, elapsed time, and a single step label. Multi-step file generation (HTML render → PDF → DOCX) is not decomposed into individually labelled substeps with per-step completion checkmarks. Users see a single spinner until all outputs are available.

**AC 6.2 — Generated CV rendered inline (iframe or embedded PDF) with prominent download button.**
✅ Pass — `layout-instruction.js:287`: `<iframe id="layout-preview" class="layout-preview-iframe">` renders the CV HTML inline in the layout review pane. Preview is shown before any download is initiated.

**AC 6.3 — Download filename follows CV_{Company}_{Role}_{Date} convention.**
⚠️ Partial — `download-tab.js` uses `file.filename` from the server response directly. Frontend does not enforce or validate the filename convention. Cannot be confirmed from source alone.

**AC 6.4 — Generation error surfaces user-readable message with at least one fallback/recovery action.**
⚠️ Partial — Errors are shown via `appendMessage('system', '❌ Failed: ${error.message}')`. No "Download HTML instead" fallback action button is confirmed in the generation error path for WeasyPrint or Chrome headless failures.

**AC 6.5 — Multiple versions listed with timestamps and "current" label.**
🔲 Not Implemented — `download-tab.js` lists the most recently generated files without version history, timestamps, or "current" labels. Multiple generation runs in a session are not distinguished.

---

### US-U7: Accessibility and Keyboard Navigation

**AC 7.1 — Focus management: modal opens → focus moves inside; closes → focus restores.**
✅ Pass — `ui-core.js:239–247` (`openSettingsModal`): saves `_focusedElementBeforeModal = document.activeElement`, calls `setInitialFocus()` + `trapFocus()`. `closeSettingsModal()` calls `restoreFocus()`. Pattern consistent for all modals reviewed. `trapFocus()` (`ui-core.js:294–331`) properly handles Tab/Shift+Tab cycling within modal boundaries.

**AC 7.2 — All interactive elements have a visible, styled focus indicator.**
⚠️ Partial — Several `outline: none` declarations suppress the default focus ring:

- `styles.css:577`: `.message-input { outline: none; }` — set unconditionally (not inside `:focus`), permanently removing the browser's default focus outline before any `:focus` rule fires. Line 578 adds a box-shadow replacement on `:focus`, but the baseline declaration is structurally fragile across browser/OS combinations.
- `styles.css:1584`: `.intake-field-row input:focus { outline: none; }` — no confirmed styled replacement in the visible excerpt.
- `styles.css:509`: `.question-item .q-input:focus { outline: none; }` — replaced by border-color + box-shadow, an acceptable pattern but reliant on the replacement rule.

Tab elements (`.tab`) have no CSS `:focus` or `:focus-visible` rule, relying solely on browser default outline, which may be invisible in some themes.

**AC 7.3 — Tab keyboard navigation: Enter/Space activate, arrow keys navigate.**
✅ Pass — **Cycle-3 fix confirmed.** All tab `<div>` elements now carry `role="tab"`, `tabindex="0"` (active) or `tabindex="-1"` (inactive) per `index.html:200–225`. `ui-core.js:509–541` attaches `keydown` listeners: Enter/Space activate the focused tab (`ui-core.js:518`); ArrowLeft/ArrowRight/Home/End navigate between visible tabs without page reload. `switchTab()` (`review-table-base.js:104–143`) correctly updates `aria-selected` and `tabindex` on every tab switch.

**AC 7.4 — Icon-only controls have `aria-label` or `title`.**
⚠️ Partial — Most icon buttons have `aria-label` and `title`. However: `index.html:95` — `<button id="layout-freshness-chip" ... aria-label="">` has an explicitly empty aria-label. An empty string on a focusable button causes screen readers to announce nothing for this interactive element. This is a defect carried from cycle 2 and must be corrected to a dynamic label (e.g. "Layout is fresh" / "Layout is stale — click to review").

**AC 7.5 — Accept/reject status communicated by colour AND text label or icon.**
✅ Pass — Rewrite card buttons labelled "✓ Accept", "✎ Edit", "✗ Reject" carry text + glyph. Accepted cards receive `.accepted` class plus the accept button carries `.active`. LLM status badge uses colour class AND text label ("Not ready", "Connected", etc.).

**AC 7.6 — Form validation errors associated via `aria-describedby`.**
✅ Pass — `job-input.js:116`: paste textarea has `aria-describedby="paste-char-count paste-error"`. URL input has `aria-describedby="url-error"` (line 133). Both error spans use `aria-live="polite"`. CSS `input[aria-invalid="true"]:focus` (`styles.css:1524`) provides additional focus-state visual feedback.

**toggleChat aria-expanded — Cycle-3 fix confirmed.**
✅ — `ui-core.js:696–697`: `toggleChat()` calls `toggleBtn.setAttribute('aria-expanded', String(!isCollapsed))` and updates `aria-label` to "Expand chat panel" / "Collapse chat panel" in sync with collapsed state. Previous cycle gap is resolved.

---

### US-U8: Responsive Behaviour and Loading Performance

**AC 8.1 — Core workflow navigable without horizontal scroll at 1280 × 800.**
⚠️ Partial — `styles.css:148`: `.workflow-steps { display: flex; gap: 32px; justify-content: center; }` — no `flex-wrap: wrap` or `overflow-x: auto`. With 13 step pills plus 12 arrow separators at 32px gap, the workflow bar will overflow the viewport at 1280px. The tab bar has `overflow-x: auto` with scroll buttons, which is good, but the main workflow step bar has no responsive handling.

**AC 8.2 — Table columns collapsible at ≤1400 px.**
❌ Fail — No `responsivePriority` or `@media`-based column collapsing is defined for the experience/skills/achievements/publications review tables. Session manager table (`.sm-thead`) hides at ≤700px (`styles.css:321`), but review tables have no equivalent.

**AC 8.3 — Application shell renders in ≤2 s locally.**
✅ Pass (structural) — All external resources (Bootstrap, Font Awesome, DataTables) are CDN-hosted and commonly cached. `bundle.js` is locally served. No synchronous blocking server calls before first render. App shell renders without awaiting LLM calls.

**AC 8.4 — Async content areas have skeleton placeholders.**
⚠️ Partial — `session-manager.js` shows a loading-spinner placeholder during initial load. Experience-review and skills-review tabs replace `#document-content` wholesale with no minimum-height placeholder, causing cumulative layout shift on content arrival.

**AC 8.5 — Long table scroll performance.**
— N/A — Cannot evaluate from static source review. No virtual scrolling or CSS containment (`contain: strict`) applied to review tables.

---

### US-U9: HTML Layout Review Interaction Quality

**AC 9.1 — Layout Instructions field has visible placeholder example and scope label asserting approved text is never changed.**
✅ Pass — **Cycle-3 fix confirmed.** `layout-instruction.js:293` now reads: `"💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here."` This is a direct fix of the cycle-2 failure. The new wording correctly scopes the field to layout only and uses "Text content is finalised — content edits are not applied here" to communicate the content-safety guarantee. The placeholder at lines 353–354 provides concrete examples: "Move Publications section after Skills", "Shorten the second bullet…", "Keep the Genentech entry on one page".

**AC 9.2 — Processing indicator appears within 300 ms of instruction submission; preview updates on completion.**
✅ Pass — `layout-instruction.js:364–367`: `#processing-indicator` with spinner and "Applying instruction..." label shown by `showProcessing(true)` called synchronously before the async API call.

**AC 9.3 — Brief confirmation of applied change shown after each instruction.**
✅ Pass — `layout-instruction.js:1013`: instruction history entry renders `instruction.change_summary`. `showConfirmationMessage()` also used after regeneration. `appendMessage('assistant', '✅ Layout instruction applied. Preview updated.')` adds a chat confirmation.

**AC 9.4 — Ambiguous instructions surface a clarifying prompt rather than a silent guess.**
✅ Pass — `layout-instruction.js` line 661 (from cycle-2 review): `if (response.error === 'clarify')` triggers `showClarifyDialog()` which uses `confirmDialog()` to ask the clarifying question inline before proceeding. Not a silent guess or a raw error.

**AC 9.5 — Instruction history panel with individual Undo controls.**
✅ Pass — `layout-instruction.js:1003–1024`: `renderInstructionHistory()` builds history entries with `<button class="action-btn-sm" onclick="undoInstruction(${index})">Undo</button>` per entry. `undoInstruction()` (lines 1119–1131) pops `_layoutUndoStack` and restores the previous snapshot. Undo is implemented and functional (not a stub as found in cycle 1).

**AC 9.6 — Single "Proceed to Final Generation" button, equally usable whether zero or many instructions applied.**
⚠️ Partial — `layout-instruction.js:379–381` renders a "Generate Final Files" button. The story acceptance criterion specifies the label "Proceed to Final Generation" and confirms usability whether or not layout changes were made. The current label is "Generate Final Files" which differs from the story spec. Additionally, `index.html:188–189` shows `layout-btn` ("✅ Confirm Layout") and `final-generate-proceed-btn` ("✅ Proceed to Finalise →") as separate action-area buttons in the chat panel, creating potentially overlapping advance signals rather than one unambiguous control.

---

## Key Changes from Cycle 2 — Verified Fixes

| Item | Cycle-2 Status | Cycle-3 Status | Evidence |
| ---- | -------------- | -------------- | -------- |
| US-U9 layout scope label | ❌ Fail — said "layout or text change" | ✅ Pass — says "layout change … Text content is finalised" | `layout-instruction.js:293` |
| Tab keyboard nav (tabindex) | ❌ Fail — no tabindex attributes | ✅ Pass — all tabs have role/tabindex/aria-selected | `index.html:200–225` |
| Enter/Space tab activation | ❌ Fail — click handlers only | ✅ Pass — keydown handler in `ui-core.js:518` | `ui-core.js:516–541` |
| toggleChat aria-expanded | ❌ Fail — not updated | ✅ Pass — `ui-core.js:696` updates attr on toggle | `ui-core.js:684–705` |
| Layout Undo stub | ❌ Fail — stub text only | ✅ Pass — functional undo stack implemented | `layout-instruction.js:1119–1131` |

---

## Terminology Audit

| Location | Current label | Assessment |
| -------- | ------------- | ---------- |
| `index.html:183` | `⚙️ Recommend Customizations` | ⚠️ Developer-centric verb. User mental model: "What should I include?" |
| `index.html:185` | `Continue to Spell Check →` | ✅ Clear |
| `index.html:186` | `Done — Generate CV →` | ⚠️ "Done" is ambiguous — done with what? Suggest: "Finish Spell Check → Generate CV" |
| `index.html:189` | `✅ Proceed to Finalise →` | ⚠️ British spelling; inconsistent with "Download" step label |
| `layout-instruction.js:379` | `Generate Final Files` | ⚠️ Differs from story spec "Proceed to Final Generation" |
| Workflow step bar | `⚙️ Customise` | ⚠️ British spelling (inconsistent with "Spell Check", "Download") |
| Tab bar | `📊 Experiences` / `📊 ATS Score` | ❌ Same icon (📊) for two different tabs — icon collision |
| Tab bar | `✏️ Experience Bullets` / `✏️ Rewrites` | ❌ Same icon (✏️) for two different tabs — icon collision |
| `index.html:95` | `aria-label=""` on layout-freshness-chip | ❌ Empty aria-label on interactive element — screen reader silent |

---

## Remaining Gaps (Cycle 3)

**GAP-A: Extracted job metadata not inline-editable (US-U2 AC 4 — Fail, unresolved since cycle 1)**
`job-input.js:49–84`: company name and role title render as static HTML. No inline edit path after URL fetch or paste submission. Proposed fix: render extracted fields as `contenteditable` or `<input>` elements in the job tab header, saving on blur/Enter.

**GAP-B: Clarifying questions all-at-once (US-U3 AC 4 — Fail, unresolved since cycle 1)**
`questions-panel.js` renders all questions simultaneously. Proposed fix: group into batches of ≤3, show one group, confirm before revealing the next.

**GAP-C: Rewrite sequential navigation (US-U5 AC 5 — Fail)**
No "Approve & Next →" keyboard shortcut. Proposed fix: keyboard shortcuts `]` = accept & scroll to next, `[` = reject & scroll to next.

**GAP-D: Layout proceed button label mismatch (US-U9 AC 6 — Partial)**
`layout-instruction.js:379`: label is "Generate Final Files" but story requires "Proceed to Final Generation". Additionally, overlapping `layout-btn` and `final-generate-proceed-btn` in the chat toolbar create dual advance signals. Propose a single consistently-labelled button always visible in the layout pane.

**GAP-E: Empty aria-label on layout-freshness-chip (US-U7 AC 4 — Defect)**
`index.html:95`: `aria-label=""` on a focusable button causes screen readers to announce nothing. Must be set dynamically: "Layout is fresh" / "Layout preview is stale — click to review" based on chip state.

**GAP-F: message-input outline:none unconditional (US-U7 AC 2 — Partial)**
`styles.css:577`: `.message-input { outline: none; }` permanently removes browser focus outline before any `:focus` rule. While the `:focus` rule on line 578 adds a box-shadow, the baseline `outline: none` is not scoped to `:focus` and may cause WCAG 2.4.7 failures in certain environments. Propose: move `outline: none` inside the `:focus` block alongside the styled replacement.

**GAP-G: Version history for generated files (US-U6 AC 5 — Not Implemented)**
Download tab shows the most recently generated files without timestamps or "current" labels. Multiple generation runs in a session are indistinguishable.

---

## Summary Table

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| ----- | ------- | ---------- | ------ | ----------- |
| US-U1: Workflow Orientation | 3 | 2 | 0 | 0 |
| US-U2: Job Input UX | 4 | 0 | 1 | 0 |
| US-U3: Analysis Readability | 2 | 2 | 1 | 0 |
| US-U4: Review Table Interaction | 4 | 1 | 1 | 0 |
| US-U5: Rewrite Review | 4 | 0 | 1 | 0 |
| US-U6: Generation Feedback | 2 | 2 | 0 | 1 |
| US-U7: Accessibility | 4 | 2 | 0 | 0 |
| US-U8: Responsive / Performance | 1 | 2 | 1 | 0 |
| US-U9: Layout Review UX | 4 | 1 | 0 | 0 |
| **Total** | **28** | **12** | **5** | **1** |

**Key evidence references:**

- Workflow bar state classes: `web/styles.css:149–159`
- `updateWorkflowSteps()`: `web/workflow-steps.js:683–714`
- `populateAnalysisTab()`: `web/review-table-base.js:271–367`
- Inline diff engine: `web/rewrite-review.js:183–226`
- Focus management: `web/ui-core.js:260–347`
- Tab keyboard navigation fix: `web/ui-core.js:509–541`, `web/index.html:200–225`
- toggleChat aria-expanded fix: `web/ui-core.js:684–705`
- Layout scope label fix: `web/layout-instruction.js:293`
- Layout Undo implementation: `web/layout-instruction.js:1119–1131`
- Protected-site handler: `web/job-input.js:471–479`
- Experience review bulk toolbar: `web/experience-review.js:241–250`
- Paste char count: `web/job-input.js:320–336`
- Empty aria-label defect: `web/index.html:95`
- outline:none defect: `web/styles.css:577`
- Workflow bar no flex-wrap: `web/styles.css:148`
