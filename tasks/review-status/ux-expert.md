<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# UX Expert Review Status

**Last Updated:** 2026-07-06 12:45 ET

**Executive Summary:** Source-verified UX expert persona review against all US-U1 through US-U9 criteria. The application has strong foundations in workflow orientation, job input, rewrite review, and layout instruction. Key gaps remain in analysis result chunking/keyword visualisation, session-restoration context messaging, accessibility labelling for some icon-only buttons, skeleton loading patterns, and the "Proceed to Final Generation" button labelling ambiguity.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Step indicator — named stages, persistent | ✅ Pass | `index.html:122–148` — 12-step `<nav class="workflow">` with emoji + text labels (Job Input → Harvest) |
| Completed/active/upcoming visual distinction | ✅ Pass | `styles.css:265–272` — `.step.active` (blue bg), `.step.completed` (green bg), `.step.upcoming` (light/grey), `.step.stale` (amber) — all distinct |
| Back-navigation safety with warning | ✅ Pass | `workflow-steps.js:138–` — `_showReRunConfirmModal` shows downstream-aware confirmation before any back-nav or re-run |
| Session restoration context | ⚠️ Partial | `session-manager.js:498` — `restoreSession()` restores phase + tab data; `app.js:63–73` shows "🔄 Connecting…" then "✅ Connection successful." BUT no explicit "You left off at X step for job Y" message is surfaced. Position bar shows job title (`index.html:81`) after restore, providing partial orientation only. |
| Stage indicator updates without reload | ✅ Pass | `workflow-steps.js:930` — `updateWorkflowSteps(status)` runs after every `fetchStatus()` call; uses DOM classList manipulation without page reload |

**Gap note:** When returning to a saved session, no human-readable "Returning to: [stage name] — [job title]" banner is shown. The user must read the position bar and step highlight to self-orient.

---

### US-U2: Job Input and URL Ingestion UX

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Input mode clarity — URL vs paste separate | ✅ Pass | `job-input.js:107–180` — three clearly-labelled tabs: "📝 Paste Text", "🔗 From URL", "📁 Upload File"; tab-based switching |
| Protected-site guidance — specific, contextual | ✅ Pass | `job-input.js:510–532` — `showProtectedSiteModal()` shows site name, specific instructions, and tip to switch to Paste tab |
| Fetch loading indicator | ✅ Pass | `job-input.js:456` — `setLoading(true, 'Fetching job from URL…')` triggers overlay before fetch |
| Extracted-field inline editability | ⚠️ Partial | Intake confirmation card exists (referenced in `message-dispatch.js` via `_showIntakeConfirmCard`) but whether company name, role title, and date are individually inline-editable (not just re-triggering analysis) could not be confirmed from reviewed sources. |
| Character-count guidance on paste | ✅ Pass | `job-input.js:322–338` — `PASTE_MIN_CHARS = 200`; live colour-coded counter shown immediately on render and each keystroke |

---

### US-U3: Analysis Results Readability

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Chunking — distinct visual sections | ⚠️ Partial | `message-queue.js:199–248` — `appendFormattedAnalysis()` renders required skills, preferred skills, nice-to-have, and ATS keywords as separate `<h4>` sections. However the result appears inside the **chat conversation panel** as a scrolling message block, not as structured cards in the viewer pane. The Analysis viewer tab (`ui-core.js:587`) exists but delegates to `populateAnalysisTab()` whose implementation is not defined in reviewed sources — unclear if a separate structured rendering exists. |
| Keyword visualisation — ranked/weighted | ⚠️ Partial | `message-queue.js:230–236` — ATS keywords rendered as equal-weight blue badge-spans; no rank order, size, or tier signal |
| Mismatch prominence — above fold, callout | 🔲 Not Implemented | No mismatch or gap-highlight section found in `message-queue.js`, `job-analysis.js`, or any analysis renderer reviewed. No `mismatches` field in rendered output. |
| Clarifying question flow — groups of ≤3 | ⚠️ Partial | `job-analysis.js:36–89` normalises and merges post-analysis questions. `questions-panel.js` (not fully reviewed) handles display. Group size limit of ≤3 per screen could not be confirmed from reviewed sources. |
| Analysis duration — labelled loading state | ✅ Pass | `job-analysis.js:104–105` — `appendLoadingMessage('Analyzing job description...')` + `setLoading(true, 'Analysing job description…')`; `fetch-utils.js:139–145` — elapsed timer + "Taking longer than usual" badge after 30 s |

---

### US-U4: Review Table Interaction Quality

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Toggle affordance — obvious, unambiguous state | ✅ Pass | `experience-review.js:248–254` — icon-btn buttons with `aria-pressed`, active class, colored icons (green/amber/red/eye-slash); `styles.css:1352` — `.icon-btn:focus-visible` focus ring |
| Drag / reorder — discoverable, keyboard-accessible | ✅ Pass | `experience-review.js:252–254` — ↑/↓ up/down buttons with `aria-label`, always visible; bullet reorder via `showBulletReorder` modal |
| Row density — enough info without expanding | ⚠️ Partial | Experience table rows include title, confidence badge, and LLM recommendation action. Whether the first bullet is shown inline without expanding could not be confirmed from reviewed sources; users may need to expand to decide. |
| Bulk actions present for >8 rows | ✅ Pass | `experience-review.js:292–295` — "✨ Accept All Recommended", "Emphasize All", "Include All", "Exclude All" always visible above table; `skills-review.js:1055–1058` — same pattern for skills |
| Inline expansion — no page navigation | ✅ Pass | `experience-review.js` — bullet expansion via DataTables child rows / bullet reorder modal; no page navigation |
| Relevance score labelled with scale | ⚠️ Partial | `experience-review.js:211,223` — confidence badge ("High"/"Medium"/"Low") with title tooltip. No numeric relevance score (0–100) with scale label found. |

---

### US-U5: Rewrite Review Presentation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Inline diff — red strikethrough / green additions | ✅ Pass | `rewrite-review.js:349–393` — LCS word-level diff; `renderDiffHtml()` uses `<del class="diff-removed">` and `<ins class="diff-added">` |
| Accept / Reject / Edit collocated with diff | ✅ Pass | `rewrite-review.js:444–451` — Accept, Edit, Reject buttons rendered inside `.rewrite-actions` within the same card as the diff |
| Reason visibility — within one click/hover | ✅ Pass | `rewrite-review.js:432–439` — `<details class="rewrite-rationale"><summary>Rationale & Evidence</summary>` — one click to expand |
| Edit path — free-text without destroying diff | ✅ Pass | `rewrite-review.js:470–486` — edit mode: diff dimmed to 55% opacity and kept visible as reference; textarea injected below; `saveRewriteEdit()` records edited text |
| Batch review efficiency — keyboard navigation | ✅ Pass | `keyboard-shortcuts.js:12–16` — ↑/↓ card navigation, A=accept, R=reject; "Accept All"/"Reject All" bulk buttons; compact mode toggle |

---

### US-U6: Generation and Output State Feedback

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Generation progress — step-labelled | ✅ Pass | `layout-instruction.js:1191–1205` — `_showGenStepProgress()` renders step checklist (Rendering HTML / Generating PDF / Building DOCX files) with pending/active/complete CSS classes |
| Output preview — in-browser before download | ✅ Pass | `final-generate.js:75–97` — `<iframe id="final-cv-preview">` with show/hide toggle; HTML preview immediately accessible |
| Download options — PDF + alternatives | ✅ Pass | `download-tab.js:44–77` — PDF, DOCX (human + ATS), HTML all listed; ATS vs human labelled with icons |
| Error recovery — readable message + fallback | ✅ Pass | `layout-instruction.js:107–119` — preview renderer failure shows "View HTML preview" fallback link |
| Output filename convention | ✅ Pass | `cv-preview.py:387–393` — `CV_{company}_{role}_{timestamp}.pdf`; `_ATS` suffix for ATS DOCX |
| Version label — when multiple versions exist | ⚠️ Partial | `download-tab.js:178–179` — shows "Run #N — date" only when `generation_run > 1`. No persistent list of prior versions; cannot download an earlier version. |
| Performance (locally ≤2 s) | — N/A | Cannot measure from source alone |

---

### US-U7: Accessibility and Keyboard Navigation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Focus management — modal open/close | ✅ Pass | `ui-core.js:252–346` — `_focusStack`, `setInitialFocus()`, `trapFocus()`, `restoreFocus()` implemented and wired in `openSettingsModal()`, `openModal()` etc. |
| Focus visibility — styled focus ring, no global removal | ✅ Pass | `styles.css:258,712,759,1436,1496` — `focus-visible` rules on `.step`, `.action-btn`, `.tab`, `.rw-btn`, `.btn-primary`; no `outline: none` found in stylesheet |
| Tab keyboard navigation — review tables | ✅ Pass | `ui-core.js:464–490` — Arrow/Home/End keys navigate tabs; `keyboard-shortcuts.js` provides A/R/↑/↓ for review cards |
| ARIA labels — icon-only buttons | ⚠️ Partial | `experience-review.js:248–254` — action buttons have `aria-label`. BUT `rewrite-review.js:295` — compact toggle button "⊞ Compact" has `title` but no `aria-label`. `layout-instruction.js:404–407` — "Generate Final Files" button no `aria-label`. Coverage is partial across inline-rendered JS HTML. |
| Colour-independence — status by colour + text | ✅ Pass | Confidence badges show text level; action buttons have icon + title + aria-label; `styles.css:1847–1853` — high-contrast media query adds 2px borders to interactive elements |
| Form errors — `aria-describedby` + announced | ✅ Pass | `job-input.js:113–122` — `aria-describedby="paste-char-count paste-error"` on textarea; `_showFieldError()` sets `aria-invalid="true"`; error spans have `aria-live="polite"` |

---

### US-U8: Responsive Behaviour and Loading Performance

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1280×800 — no horizontal page scroll | ⚠️ Partial | `styles.css:263` — workflow step bar scrolls horizontally within its own container (acceptable). Main layout uses flex/percent widths. No 1280px breakpoint confirmed; cannot verify without runtime test. |
| Column collapsing at ≤1400 px | ⚠️ Partial | `styles.css:1307` — `.table-container { overflow-x: auto }` — tables scroll horizontally rather than hiding low-priority columns at narrow widths. No responsive column-hide breakpoints found. |
| Initial page load ≤2 s locally | — N/A | Bootstrap, DataTables, Font Awesome loaded from CDN in `index.html:17–23`. Cannot measure latency from source. |
| No layout shift — skeleton placeholders | ⚠️ Partial | No skeleton or shimmer CSS patterns found. Empty-state divs (`index.html:240–245`) reserve space before data but fixed min-heights for async content areas are absent. |
| Long table scroll performance | — N/A | DataTables pagination in use; virtual scrolling not required. Cannot confirm at runtime. |

---

### US-U9: HTML Layout Review Interaction Quality

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Instruction field — labelled scope | ✅ Pass | `layout-instruction.js:308` — `<p class="layout-scope-label">💡 Describe a layout change … Text content is finalised — content edits are not applied here.</p>` rendered above textarea |
| Placeholder examples | ✅ Pass | `layout-instruction.js:366–370` — `placeholder="e.g., Move Publications section after Skills\nor: Shorten the second bullet…"` — multi-line examples |
| Processing feedback after instruction | ✅ Pass | `layout-instruction.js:1170–1183` — `showProcessing(true, label)` shows `#processing-indicator` with spinner; preview updates on completion |
| Change attribution after apply | ✅ Pass | `layout-instruction.js:816` — `showConfirmationMessage('✅ ' + response.summary)` inline; summary also appended to instruction history |
| Clarification for ambiguous instructions | ✅ Pass | `layout-instruction.js:759–770,1240–1295` — backend returns `error: 'clarify'`; `showClarificationDialog()` renders inline accessible form |
| Instruction history with per-entry Undo | ✅ Pass | `layout-instruction.js:1091–1130` — `renderInstructionHistory()` renders each entry with timestamp, text, summary, and sequential Undo button (older entries disabled with tooltip) |
| Single proceed action — unambiguous | ⚠️ Partial | Two separate buttons exist: `confirm-layout-btn` ("Confirm Layout") and `proceed-to-finalise-btn` ("Generate Final Files") — both conditionally visible via state machine. Users who applied no instructions skip auto-confirm, but those who did must click two buttons. The chat-panel action button label also changes (`index.html:196`). Two-step model lacks an orientation notice explaining the confirm-then-generate flow. |
| Content-safety assurance | ✅ Pass | `layout-instruction.js:308` — inline scope label communicates content immutability; `appendLayoutSafetyAlert()` flags sanitisation events |

---

## Generated Materials Evaluation

| Aspect | Status | Evidence |
|--------|--------|----------|
| Filename convention — Company, Role, Date | ✅ Pass | `cv-preview.py:387–393` — `CV_{company}_{role}_{timestamp}` with `_ATS` suffix |
| ATS vs Human output distinction | ✅ Pass | `download-tab.js:44–68` — labelled "ATS-optimised" vs "Human-readable" with 🤖/📄 icons |
| In-browser HTML preview available | ✅ Pass | `final-generate.js:75–97` — iframe preview with show/hide toggle |
| Persuasion quality report | ✅ Pass | `download-tab.js:258–346` — persuasiveness panel with severity, score, per-bullet findings, narrative-thread and arc advisories |
| Rewrite audit log — decisions traceable | ✅ Pass | `rewrite-review.js:180–217` — collapsible audit log with outcome icons and final text |
| Multiple generation run labelling | ⚠️ Partial | `download-tab.js:178–179` — Run #N label only after first run; no prior-version list |

---

## Additional Story Gaps / Proposed Story Items

1. **US-U10 (Proposed): Analysis Tab Structured Panel** — Analysis output renders as a conversation bubble in `#conversation` (`message-queue.js:199–248`). No structured card/panel layout in the viewer pane. Needed: required quals card, preferred quals card, ranked keyword grid, mismatch callout — all in the `#document-content` viewer pane.

2. **US-U11 (Proposed): Session Return Context Banner** — No "Welcome back — you left off at [Step] for [Job Title], last active [time ago]" message on session restore (`app.js:63–73`). The position bar and step highlight orient the user partially, but an explicit toast or conversation message with last-active timestamp would reduce disorientation.

3. **US-U12 (Proposed): Keyword Visual Ranking** — ATS keywords are flat equal-weight badges (`message-queue.js:232–236`). A rank tier or #N badge (as already exists on rewrite keyword pills in `rewrite-review.js:407`) would show which keywords are most critical.

4. **US-U13 (Proposed): Skeleton Loading Placeholders** — No CSS skeleton or shimmer pattern exists for async-loaded content areas. Empty-to-filled transitions produce visible layout shift. Min-height reservations + loading spinners inside content areas is the minimal fix.

5. **US-U14 (Proposed): Gap/Mismatch Visibility** — The analysis result has no above-fold mismatch section. This is the highest-value information for a job application tool and is completely absent from all reviewed sources.

6. **Terminology — "Customise" / "Customizations" inconsistency** — Step nav: "⚙️ Customise" (`workflow-steps.js:945`); tab label: "Customisations" (`ui-core.js:356`); action button: "⚙️ Recommend Customizations" (`index.html:191`). Three different forms for the same step.

7. **Terminology — "File Review" / "Download Files" / "download"** — Step nav: "⬇️ Download Files" (`workflow-steps.js:948`); chat step label: "⬇️ File Review" (`index.html:136`); continue button: "Continue to File Review →". Three different labels for the same step.

8. **Terminology — "Harvest"** — "🌾 Harvest" as a final step label may not be immediately intuitive. "Save Improvements" or "Update Master CV" would be clearer without training.

9. **Terminology — Layout two-step model unexplained** — "Confirm Layout" then "Generate Final Files" are two sequential buttons. The UI does not explain to the user that both steps are required or why. A single explanatory sentence near the Confirm button (or collapsing to one action when no instructions were applied) would help.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/job-input.js, web/job-analysis.js, web/rewrite-review.js, web/layout-instruction.js, web/workflow-steps.js, web/experience-review.js, web/final-generate.js, web/download-tab.js, web/keyboard-shortcuts.js, web/message-queue.js, web/session-switcher-ui.js, scripts/cv-preview.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-U1 | 4 | 1 | 0 | 0 | 0 |
| US-U2 | 4 | 1 | 0 | 0 | 0 |
| US-U3 | 1 | 3 | 0 | 1 | 0 |
| US-U4 | 4 | 2 | 0 | 0 | 0 |
| US-U5 | 5 | 0 | 0 | 0 | 0 |
| US-U6 | 5 | 1 | 0 | 0 | 1 |
| US-U7 | 5 | 1 | 0 | 0 | 0 |
| US-U8 | 0 | 2 | 0 | 0 | 3 |
| US-U9 | 7 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- US-U1 Step indicator → `index.html:122–148`
- US-U1 Step CSS states → `styles.css:265–272`
- US-U1 Back-nav confirm → `workflow-steps.js:138`
- US-U1 Session restore → `session-manager.js:498`, `app.js:63–73`
- US-U2 Input tabs → `job-input.js:107–180`
- US-U2 Protected site modal → `job-input.js:510–532`
- US-U2 Character count → `job-input.js:322–338`
- US-U3 Analysis render → `message-queue.js:199–248`
- US-U3 Keywords (flat) → `message-queue.js:230–236`
- US-U3 Mismatch → not found in reviewed sources
- US-U4 Bulk actions → `experience-review.js:292–295`
- US-U4 Icon-btn ARIA → `experience-review.js:248–254`
- US-U5 LCS diff → `rewrite-review.js:349–393`
- US-U5 Edit preserves diff → `rewrite-review.js:470–486`
- US-U5 Keyboard shortcuts → `keyboard-shortcuts.js:12–16`
- US-U6 Step progress → `layout-instruction.js:1191–1205`
- US-U6 Filename → `cv-preview.py:387–393`
- US-U6 Run label → `download-tab.js:178–179`
- US-U7 Focus management → `ui-core.js:252–346`
- US-U7 Focus-visible → `styles.css:258,712,759,1436,1496`
- US-U7 Form error ARIA → `job-input.js:113–122`
- US-U8 Horizontal scroll handling → `styles.css:263,1307`
- US-U9 Scope label → `layout-instruction.js:308`
- US-U9 Clarification dialog → `layout-instruction.js:1240–1295`
- US-U9 Instruction history → `layout-instruction.js:1091–1130`
- US-U9 Two-step proceed → `index.html:196`, `layout-instruction.js:376–404`

**Evidence standard:** Every conclusion supported by file:line evidence from source-read files only. No tasks/gaps.md or tasks/ui-review.md consulted.
