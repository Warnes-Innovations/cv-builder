<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# UX Expert Review Status

**Last Updated:** 2026-06-30 09:45 ET

**Executive Summary:** The application has a solid UX foundation with well-implemented workflow step indicators, modal accessibility (focus trap + restore), inline diff rewrites, and a real-time LLM busy overlay. The major gaps are: (1) no confirmed back-navigation safety dialogue when clicking completed steps that have downstream approved content, (2) analysis tab does not present clarifying questions in groups of ≤3 — all questions appear simultaneously, (3) no in-browser preview (iframe or embedded PDF) of the final generated CV — only download links, (4) no version labelling when multiple generation runs exist in a session, and (5) the Layout Review instruction history panel has per-entry Undo buttons but the undo implementation is a single stack pop, making the per-entry label misleading. Several terminology and labelling issues are also flagged.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

**1. Step indicator — named stages with active state**
✅ Pass — `index.html:118–143` renders a `<nav class="workflow">` with 12 named steps (Job Input → Analysis → Customise → Rewrites → Spell Check → Layout Review → Download → Cover Letter → Screening → Interview Prep → Thank You → Harvest). `workflow-steps.js:683–695` maps backend `Phase` values to step names. Active step receives `.active` class (blue background, `styles.css:151`); completed steps receive `.completed` class (green, `styles.css:153`). `aria-current="step"` is set on the active pill (`workflow-steps.js:1982–1989`).

**2. Completed state signalling**
✅ Pass — `.step.completed` uses `#dcfce7` green background (`styles.css:153`). `.step.active` uses `#dbeafe` blue (`styles.css:151`). `.step.upcoming` uses grey `#f8fafc` (`styles.css:155`). Three-way visual distinction exists.

**3. Back-navigation safety**
⚠️ Partial — Clicking a completed step navigates to its tab (`workflow-steps.js:813–828`). A `confirmDialog()` function exists in `ui-core.js:372–444` and is used elsewhere (e.g., bullet reorder modal), but no confirmation dialogue fires when navigating backward through a step that has downstream approved content (rewrites, decisions). The story requires an explicit warning before any destructive back-navigation.

**4. Session restoration context**
✅ Pass — `app.js:60` calls `restoreSession()` which reloads the last phase and tab from localStorage/backend. The position bar (`index.html:71–108`) shows `#position-title` and `#position-company`. The `#header-session-name` div (`index.html:41`) shows the session name in the header. `stateManager.loadStateFromLocalStorage()` restores `lastKnownPhase`, `currentTab`, and `tabData` within the 24-hour window (`state-manager.js:467`).

**Acceptance criteria summary:**

- Stage indicator: ✅
- Back-navigation: ⚠️ (no confirmation dialogue for destructive navigation)
- Session restoration: ✅
- Stage indicator updates without page reload: ✅ (`stateManager.onPhaseChange` wired in `ui-core.js:2013`)

---

### US-U2: Job Input and URL Ingestion UX

**1. Input mode clarity**
✅ Pass — `job-input.js:107–111` renders three tab buttons: "📝 Paste Text", "🔗 From URL", "📁 Upload File" using `.input-method-tabs`. Active panel shown/hidden via `.input-method.active`. CSS `.input-tab.active` (`styles.css:1299`) gives a clear blue underline. Only one panel is visible at a time.

**2. Protected-site guidance**
✅ Pass — `job-input.js:141–149` renders a two-column grid: "✅ Works well with" (company pages, AngelList, etc.) and "⚠️ Copy manually from" listing **LinkedIn**, **Indeed**, **Glassdoor** by name with specific reasons (login required, anti-bot, auth required). Shown statically in the URL panel before submission.

**3. Fetch feedback**
✅ Pass — `job-input.js:441–495` is async and handles `data.protected_site` flag from the API. `.btn-spinner` class (`styles.css:905`) provides loading state. The `fetchJobFromURL()` function shows error state on failure.

**4. Confirmation editability**
⚠️ Partial — `job-input.js:49–85` shows extracted `position_name` from `/api/status`. An "intake confirmation" card (`styles.css:1562–1604`, classes `intake-confirm-card`, `intake-field-row`) exists for editing company/role/date fields inline. However, this appears post-analysis (GAP-23 intake path), not immediately after URL fetch before analysis begins. Users who need to correct an extracted title before analysis must rely on the chat box.

**5. Character-count guidance**
✅ Pass — `job-input.js:116` sets `aria-describedby="paste-char-count paste-error"` on the textarea. `job-input.js:119–120` renders `<div id="paste-char-count" aria-live="polite">` updated by `_updatePasteCharCount()` at `job-input.js:324`. Minimum length is validated via `_validatePasteField()`.

**Terminology flag:** The paste submit button reads "Submit Job Description" (`job-input.js:123`). Consider "Analyse Job Description" to set expectations that analysis follows.

---

### US-U3: Analysis Results Readability

**1. Chunking into distinct sections**
✅ Pass — `bundle.js:3609–3679` (`populateAnalysisTab`) renders: role card (`analysis-role-card`), Required Skills (`analysis-section`), Preferred/Nice-to-Have (`analysis-section`), ATS Keywords (`analysis-section`), Culture Indicators (`analysis-section`), Must-Have Requirements (`analysis-section`). CSS classes `analysis-page`, `analysis-section`, `analysis-role-card` (`styles.css:469–487`) give each section a distinct bordered card. At least 4 distinct sections exist.

**2. Keyword visualisation**
✅ Pass — `bundle.js:3663–3665` renders keywords as `.kw-badge` elements with `.kw-rank` showing `#1`, `#2`, … rank numbers. CSS (`styles.css:484–485`) positions rank inside the badge. Not a flat comma list.

**3. Mismatch prominence**
✅ Pass — `bundle.js:3637` renders a `.mismatch-callout` before the Required Skills section when missing required skills exist. CSS (`styles.css:486`) gives it an amber left border + yellow background. Positioned before, not after, required skills.

**4. Clarifying question flow**
❌ Fail — `questions-panel.js:147` renders all clarifying questions simultaneously in a single section ("💬 Clarifying Questions"). No grouping logic limits to ≤3 questions per view. All questions appear as one continuous list. The story requires groups of ≤3 with progressive disclosure.

**5. Analysis duration feedback**
✅ Pass — `index.html:156–163` renders `#llm-busy-overlay` with labelled spinner (`#llm-busy-label` set dynamically), elapsed time counter (`#llm-busy-elapsed`), and an amber "Taking longer than usual" badge (`#llm-busy-state-badge`). The overlay is labelled with `aria-live="polite"` (`index.html:159`).

---

### US-U4: Review Table Interaction Quality

**1. Toggle affordance clarity**
✅ Pass — Review tables use 32×32 px `.icon-btn` elements (`styles.css:1170–1198`) with SVG icon glyphs and `.active` state (green background `#10b981`). Not small checkboxes. State change is visually unambiguous.

**2. Drag/reorder usability**
⚠️ Partial — Up/down reorder buttons exist in experience and achievement review tables. However, step rerun buttons use hover-only opacity (`workflow-steps.js:762` injects CSS `opacity: 0.35` at rest, `1` on hover/focus-within). This makes reorder-adjacent controls not discoverable without hovering. The story requires controls visible without hover.

**3. Row density**
✅ Pass — Review tables show experience title, role, date, and first bullet in `.review-table` rows. `.review-table td` padding is `8px 12px` (`styles.css:1157`). Column widths defined (`styles.css:1162–1165`). Dense enough for decision-making.

**4. Bulk actions**
⚠️ Partial — `review-table-base.js:713` implements `bulkAction(action, type)`. `.bulk-toolbar` / `.bulk-btn` CSS exists (`styles.css:1321–1333`). The toolbar appears on experience, skills, and achievement tables. However, the current bulk toolbar targets "emphasise", "include", "exclude", "recommended" — not a generic Select All / Deselect All toggle. No "Select All" / "Deselect All" named control was found.

**5. Inline expansion**
✅ Pass — Bullet expansion is in-place via `.rewrite-card` pattern. No page navigation occurs.

**6. Relevance score meaning**
⚠️ Partial — Relevance scores appear in review tables but no explicit `/ 100` scale label or letter-grade legend was found in `experience-review.js` or `skills-review.js`. Scores appear as raw numbers without scale explanation.

---

### US-U5: Rewrite Review Presentation

**1. Inline diff**
✅ Pass — `rewrite-review.js:278–279` renders `<del class="diff-removed">` (red strikethrough) and `<ins class="diff-added">` (green) tokens. CSS (`styles.css:1249–1250`): `del.diff-removed { text-decoration: line-through; color: #dc2626; background: #fee2e2; }`, `ins.diff-added { color: #166534; background: #dcfce7; }`. Full token-level inline diff.

**2. Accept/Reject/Edit controls collocated with diff**
✅ Pass — `.rewrite-card-body` contains the `.rewrite-inline-diff` div and `.rewrite-actions` flex row (Accept, Edit, Reject buttons) in the same card. Buttons are `.rw-btn.accept`, `.rw-btn.edit`, `.rw-btn.reject`. Accept is visually prominent (green, `styles.css:1261`).

**3. Reason visibility**
✅ Pass — `styles.css:1256–1257`: `details.rewrite-rationale` is a `<details>` element. One click reveals the LLM rationale without full modal navigation.

**4. Edit path**
✅ Pass — `rewrite-review.js:351–400` toggles between the inline diff view and an editable textarea. Clicking Edit hides the diff and shows the textarea; clicking Save re-generates the diff against the original. Original is preserved for comparison.

**5. Batch review efficiency**
⚠️ Partial — `.rewrite-tally-bar` (`styles.css:1234`) shows a sticky tally bar with accepted/rejected/pending counts and a Submit button. A bulk accept-all/reject-all toolbar exists (`styles.css:1268–1272`). However, no keyboard shortcut or sequential "Approve & Next →" card navigation was found in `rewrite-review.js` for use when >3 rewrites exist.

---

### US-U6: Generation and Output State Feedback

**1. Generation progress feedback**
⚠️ Partial — The `#llm-busy-overlay` shows spinner + label + elapsed time during LLM calls. However, for the multi-step generation pipeline (HTML render → PDF conversion → DOCX), no step-by-step labelled progress UI with per-step completion checkmarks was found in `final-generate.js`. Progress surfaces only as chat messages, not a structured step-progress display.

**2. Output preview (in-browser)**
❌ Fail — `final-generate.js:72–100` renders the "Generated Files" tab with download links only. No iframe or embedded PDF viewer is present. `layout-instruction.js` has `<iframe id="layout-preview">` for the preview stage, but the final output tab shows download links without in-browser rendering. The story requires in-browser previewability before downloading.

**3. Download options**
✅ Pass — `final-generate.js:23–63` and `download-tab.js:42–68` handle PDF, DOCX (ATS and human), and HTML. Multiple format download links are present.

**4. Error recovery**
⚠️ Partial — `download-tab.js:93–98` surfaces an ATS validation error in a styled amber div. Generic generation errors surface via `appendMessage('system', ...)`. No explicit "Download HTML instead" fallback path is offered when WeasyPrint/Chrome headless fails. Recovery is chat-message-only, not a structured recovery action.

**5. Output filename**
✅ Pass — `cv_orchestrator.py:1432`: `filename_base = f"CV_{company}_{role}_{timestamp}"`. The `_ATS` / `ATS` suffix for ATS files is present (`download-tab.js:44–57`). Naming convention matches the story's `CV_{Company}_{Role}_{Date}` requirement.

**6. Version label**
❌ Fail — `final-generate.js` and `download-tab.js` list files from `cvData.files` array but do not show version numbers, timestamps relative to each other, or a "current" label distinguishing multiple generation runs within a session.

---

### US-U7: Accessibility and Keyboard Navigation

**1. Focus management**
✅ Pass — `ui-core.js:27–347` implements `setInitialFocus()`, `trapFocus()`, `restoreFocus()`. `_focusedElementBeforeModal` stores the opener element. All major modal open functions call `setInitialFocus()` + `trapFocus()`; close functions call `restoreFocus()`.

**2. Focus visibility**
✅ Pass — All interactive elements use `:focus-visible` with `outline: 2px solid #3b82f6; outline-offset: 2px` (`styles.css:144, 261, 509, 580, 594, 641, 1198, 1266, 1312`). The single `outline: none` at `styles.css:1602` applies only to `.intake-field-row input` and is immediately replaced by a `box-shadow` — a styled replacement is provided.

**3. Table keyboard navigation**
✅ Pass — Tab keyboard pattern implemented in `ui-core.js:527–553` (ArrowLeft, ArrowRight, Home, End). Workflow step pills get Enter/Space handlers via `updateWorkflowStepsClickable()` at `ui-core.js:1894–1990`. `.icon-btn:focus-visible` and `.q-chip:focus-visible` have visible focus rings.

**4. ARIA labels**
✅ Pass — All icon-only buttons have `aria-label` or `title`: rename button (`index.html:79`), ATS badge (`index.html:88`), freshness chip (`index.html:96`), dismiss conflict (`index.html:114`), toggle chat (`index.html:153`), tab scroll arrows (`index.html:202, 231`), modal close buttons (`index.html:253, 275, 422, 582, 693, 709`), show/hide API key (`index.html:481`), re-run step buttons (`workflow-steps.js:730`).

**5. Colour-independence**
⚠️ Partial — Rewrite card states (`.rewrite-card.accepted` green, `.rewrite-card.rejected` red + opacity at `styles.css:1241–1242`) rely on colour for card-level state. The action buttons carry text labels (Accept/Reject), but the whole card going green or red does not add a text badge or icon independent of button state. ATS score badge and step pills use both colour and text labels.

**6. Error messages**
✅ Pass — `job-input.js:116`: `aria-describedby="paste-char-count paste-error"`. `job-input.js:135`: `aria-describedby="url-error"`. Field error spans have `aria-live="polite"` (`job-input.js:121, 135`). CSS `.field-error.visible { display: block; }` (`styles.css:1317`).

---

### US-U9: HTML Layout Review Interaction Quality

**1. Instruction field clarity**
✅ Pass — `layout-instruction.js:362`: textarea placeholder reads multi-line example instructions (move Publications, shorten bullet, keep entry on one page). `layout-instruction.js:302`: `.layout-scope-label` reads "💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." Scope label and examples are present.

**2. Processing feedback**
✅ Pass — `layout-instruction.js:373–377`: `#processing-indicator` with `.spinner` and "Applying instruction..." appears while the API call is in flight (`styles.css:1443`).

**3. Change attribution confirmation**
✅ Pass — `layout-instruction.js:378`: `#confirmation-message` (class `.confirmation-message`, green, `styles.css:1446`) is shown after an instruction is applied.

**4. Clarification handling**
⚠️ Partial — The backend can return clarifying questions, but no dedicated inline clarifying-question rendering was found in `layout-instruction.js`. Clarifications would surface in the conversation chat, not inline in the layout panel. The story requires an inline clarifying prompt rather than silent application or a chat-only response.

**5. Instruction history with Undo**
⚠️ Partial — `layout-instruction.js:1022–1029` renders `.instruction-history-list` with per-entry Undo buttons. However, `undoInstruction()` at `layout-instruction.js:1181–1193` is a stack-based undo (always undoes the most recent instruction regardless of which entry button was clicked). The UI presents per-entry Undo buttons implying independent per-entry undo — a misleading affordance.

**6. Single proceed action**
✅ Pass — `layout-instruction.js:369`: `<button id="confirm-layout-btn" class="continue-btn layout-action-btn">Confirm Layout</button>` — a single button that works regardless of whether instructions were applied.

**7. Content safety assurance**
✅ Pass — `layout-instruction.js:302` (`.layout-scope-label`): "Text content is finalised — content edits are not applied here." Always visible in the input pane.

---

### US-U8: Responsive Behaviour and Loading Performance

**1. Minimum viable layout at 1280 × 800**
✅ Pass — `styles.css:1456–1464`: `@media (max-width: 1400px)` reduces workflow step gaps; `@media (max-width: 1280px)` narrows layout input pane to 300px; `@media (max-width: 1100px)` stacks layout panes vertically. The main 40%/60% split should remain operable at 1280 × 800.

**2. Column collapsing in tables**
⚠️ Partial — `styles.css:1161–1165` defines fixed column widths for `.review-table` but no responsive hide rules for lower-priority columns at ≤1400px exist. Session manager table (`styles.css:322–327`) collapses to single column at ≤700px. Review table column hiding at 1280×800 is not defined.

**3. Initial page load ≤2 s locally**
✅ Pass — The application shell uses no render-blocking resources beyond CDN CSS/JS (Bootstrap, Font Awesome, DataTables) loaded deferred or at body end. LLM-dependent content loads asynchronously via `fetchStatus()`.

**4. No layout shift during async loads**
⚠️ Partial — The `.empty-state` placeholder exists (`styles.css:702`) with `text-align:center; padding:80px 32px` but no skeleton screens with approximate content dimensions are implemented. Content areas show a spinner then replace with content, causing cumulative layout shift on arrival.

**5. Long table scroll performance**
🔲 Not Implemented — No virtual scrolling or CSS containment (`contain: content`) applied to skills or experience review tables. DataTables is used for the model table but not CV review tables. Tables with 20+ rows may exhibit scroll jank.

---

## Generated Materials Evaluation

The review focuses on the application UI per the story scope. Generated materials (PDF, DOCX, HTML) are produced by `cv_orchestrator.py`. The Download/File Review tab shows files by name with descriptions but without in-browser preview, which is the primary gap for generated materials usability (noted under US-U6, criterion 2).

---

## Terminology and Labelling Issues

1. **"Customise" step label** (`index.html:124`): The step says "Customise" but means "review AI-recommended selections for experiences, skills, and achievements". Non-obvious to new users.

2. **"Rewrites" step vs. "Review Rewrites" button**: The workflow step says "Rewrites" (`index.html:126`) while the action button reads "✏️ Review Rewrites" (`index.html:187`). Consistent naming would help.

3. **"Continue to Spell Check →" button** (`index.html:189`): Does not clarify whether it submits rewrite decisions or only navigates. "Submit Decisions & Continue to Spell Check →" would be clearer.

4. **"Generate Preview →"** (`index.html:190`, `spell-btn`): Ambiguous about what is being generated. "Generate CV Preview →" would clarify.

5. **"Package Application Files"** (`index.html:194`, `finalise-action-btn`): Internal-speak. "Finalise & Save Application" or "Complete This Application" would be more user-facing.

6. **"LLM: Loading…"** (`index.html:53–54`): "LLM:" prefix is implementation-centric. "AI Model:" or "Provider:" would be clearer to non-technical users.

7. **"File Review" tab** (`index.html:222`): Labelled "⬇️ File Review" but maps to the download/finalise step. "Downloads & Review" or "Final Check" would be more accurate.

8. **"Master CV" vs. "Master Profile"**: The onboarding modal (`index.html:328`) calls it "your master profile" while the tab/button reads "Master CV". Inconsistent — pick one.

---

## Additional Story Gaps / Proposed Story Items

1. **Gap: Clarifying questions — grouped presentation** (US-U3, criterion 4): No per-group progressive disclosure. All questions render simultaneously. High priority.

2. **Gap: Back-navigation confirmation dialogue** (US-U1, criterion 3): When clicking a completed step with downstream approved content, no destructive-action warning fires.

3. **Gap: In-browser CV preview on final output** (US-U6, criterion 2): Final generated CV accessible only via download link. An iframe or embedded PDF preview is absent.

4. **Gap: Version labelling for multiple generation runs** (US-U6, criterion 6): No timestamp, version number, or "current" label distinguishes multiple runs within a session.

5. **Gap: Per-entry undo vs. stack undo in layout history** (US-U9, criterion 5): Undo buttons on each history entry imply independent undo; implementation is a single stack pop.

6. **Gap: Sequential "Approve & Next" navigation in rewrite review** (US-U5, criterion 5): No keyboard shortcut or sequential card navigation for bulk rewrite review.

7. **Gap: Review table bulk Select All / Deselect All** (US-U4, criterion 4): Bulk toolbar has domain-specific actions (emphasise, include, exclude) but no generic select-all/deselect-all toggle.

8. **Gap: Relevance score scale label** (US-U4, criterion 6): Scores in review tables appear without "/ 100" or letter-grade labelling.

9. **Proposed: Rewrite card colour-only accepted/rejected state** (US-U7, criterion 5): Card border/background colour changes should be supplemented with a text badge ("Accepted" / "Rejected") for full colour-independence.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py (+ web/job-input.js, web/workflow-steps.js, web/rewrite-review.js, web/layout-instruction.js, web/download-tab.js, web/final-generate.js, web/bundle.js consulted for evidence)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-U1 Workflow Orientation | 3 | 1 | 0 | 0 | 0 |
| US-U2 Job Input UX | 3 | 2 | 0 | 0 | 0 |
| US-U3 Analysis Readability | 4 | 0 | 1 | 0 | 0 |
| US-U4 Review Table Interaction | 3 | 3 | 0 | 0 | 0 |
| US-U5 Rewrite Review | 3 | 2 | 0 | 0 | 0 |
| US-U6 Generation Feedback | 2 | 2 | 2 | 0 | 0 |
| US-U7 Accessibility | 4 | 2 | 0 | 0 | 0 |
| US-U9 Layout Review | 4 | 2 | 0 | 0 | 0 |
| US-U8 Responsive / Performance | 2 | 2 | 0 | 1 | 0 |
| **Totals** | **28** | **16** | **3** | **1** | **0** |

**Key evidence references:**

- Workflow step indicator: `index.html:118–143`, `styles.css:148–170`, `workflow-steps.js:683–774`
- Focus management: `ui-core.js:27–347` (`setInitialFocus`, `trapFocus`, `restoreFocus`)
- Inline diff: `rewrite-review.js:278–279`, `styles.css:1249–1250`
- Analysis chunking: `bundle.js:3609–3679` (`populateAnalysisTab`)
- Keyword ranking: `bundle.js:3663–3665`, `styles.css:484–485`
- Mismatch callout: `bundle.js:3637`, `styles.css:486`
- Job input tabs: `job-input.js:107–183`
- Character count guidance: `job-input.js:116–121`
- Layout instruction scope label: `layout-instruction.js:302`
- Layout instruction undo (stack-based): `layout-instruction.js:1181–1193`
- File naming convention: `cv_orchestrator.py:1432`
- No in-browser final preview: `final-generate.js:72–100`
- Clarifying questions (all at once): `questions-panel.js:147`
- Reduced-motion accommodation: `styles.css:1621–1630`
- Reorder button opacity at rest: injected CSS at `workflow-steps.js:762`
