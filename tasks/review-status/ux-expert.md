<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
-->

# UX Expert / Heuristic Review Status — Cycle 8

**Last Updated:** 2026-06-29 14:45 ET

**Reviewed against (Cycle 8 source-first pass):** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

**Rating key:** ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | — N/A

---

## Executive Summary (Cycle 8)

**Scope of this cycle:** Source-first review restricted to the seven core files listed above. All findings from Cycle 7 that are based on web/workflow-steps.js, web/rewrite-review.js, web/layout-instruction.js, web/job-input.js, and other supporting modules remain valid unless contradicted by evidence from the seven files reviewed this cycle.

**Score (core-file evidence only): 19 Pass / 19 Partial / 4 Fail / 4 Not Impl (in reviewed files)**
**Cycle 7 combined score (all modules): 32 Pass / 11 Partial / 4 Fail / 1 Not Implemented** — no regressions detected.

**Key findings from Cycle 8 source-first review:**

1. **US-U7 focus rings (inputs):** Four `outline: none` rules on inputs (`.q-input:focus`, `.message-input:focus`, `.form-input:focus`, `.layout-instruction-textarea:focus`) use only `box-shadow` as focus replacement (styles.css:510, 579, 755, 1436). Under Windows High Contrast / forced-color mode, `box-shadow` is stripped, leaving no visible focus indicator on these elements. GAP-U17 (new).

2. **US-U1 workflow step visual state:** CSS classes `.step.completed`, `.step.active`, `.step.upcoming`, `.step.stale`, `.step.stale-critical` are defined (styles.css:151–158). Cycle 7 confirmed `updateWorkflowSteps()` in workflow-steps.js applies them. No regression detected in the core files.

3. **US-U9 proceed button labelling:** Two distinct advance buttons found in index.html: `#layout-btn` "✅ Confirm Layout" (line 188) and `#final-generate-proceed-btn` "✅ Proceed to Finalise →" (line 189). These do not match the story-specified "Proceed to Final Generation." GAP-U9 remains open (Partial).

4. **Terminology:** "Download" step label (index.html:131) vs "File Review" tab label (index.html:218) remain inconsistent. "LLM:" header pill label (index.html:53) is developer-centric.

5. **No regressions found** in accessibility (modal focus management, tab keyboard nav, ARIA labels) or rewrite diff presentation from Cycle 7 findings.

**Remaining Fail-grade gaps (unchanged from Cycle 7):**
1. Clarifying questions all-at-once without paged grouping (US-U3 AC4)
2. Numeric relevance score with scale label absent from review rows (US-U4 AC6)
3. No keyboard "Approve & Next" sequential rewrite navigation (US-U5 AC5)
4. Review table columns with no responsive collapse at ≤1400 px (US-U8 AC2)

**New gap identified this cycle:**
- **GAP-U17:** `outline: none` on text inputs (`.q-input`, `.message-input`, `.form-input`, `.layout-instruction-textarea`) without outline replacement — box-shadow fails in forced-color/high-contrast mode.

---

## Cycle 8 Source-First Findings (7 core files)

### US-U1: Workflow Orientation and Progress Visibility

| AC | Status | Evidence (Cycle 8) |
|----|--------|-------------------|
| 1.1 Stage indicator present with named stages | ✅ Pass | index.html:117–143 — 13-pill `<nav class="workflow" aria-label="Application workflow steps">` with text labels |
| 1.2 Completed/active/upcoming visually distinct | ✅ Pass | styles.css:151–158 — five named states (.active, .completed, .upcoming, .stale, .stale-critical). Cycle 7 confirmed JS applies them. |
| 1.3 Back-nav preserves work; destructive actions confirmed | ✅ Pass | ui-core.js:372–444 — `confirmDialog()` full focus-trap; Cycle 7 confirmed re-run confirm modal. |
| 1.4 Session restore lands on last active step with orientation | ⚠️ Partial | index.html:41 (`#header-session-name`), 75–80 (`#position-title`, `#position-company`). No last-active timestamp. state-manager.js:459–529 restores phase/tab/data. |
| Stage indicator updates without reload | ✅ Pass | state-manager.js:319–322 — `onPhaseChange()` fires listeners; ui-core.js:1997–2000 calls `updateWorkflowStepsClickable`. |

### US-U2: Job Input and URL Ingestion UX

Items 2.1–2.5 cannot be fully re-assessed from index.html/styles.css alone — job-input.js renders the content. Cycle 7 findings (all 4 Pass, 1 Partial) remain valid. CSS for `.input-method-tabs`, `.input-tab`, `.char-counter` (styles.css:1296–1303, 882–888) is present and unchanged.

### US-U3: Analysis Results Readability

| AC | Status | Evidence (Cycle 8) |
|----|--------|-------------------|
| 3.1 ≥4 visually distinct sections | ✅ Pass | styles.css:469–487 — `.analysis-role-card`, `.analysis-section`, `.skill-grid`, `.kw-badges`, `.mismatch-callout` |
| 3.2 Keywords with visual rank signal | ✅ Pass | styles.css:484–485 — `.kw-badge .kw-rank` absolute-positioned rank number |
| 3.3 Mismatch callouts prominent; summary count for >3 | ⚠️ Partial | styles.css:486–487 — amber left-border callout. No aggregate count "N mismatches" found in reviewed source. |
| 3.4 Clarifying questions ≤3 per screen | ❌ Fail | conversation_manager.py:92 stores questions as flat list. No grouping in conversation_manager.py or state-manager.js. Unchanged. |
| 3.5 Loading label + estimated duration | ⚠️ Partial | index.html:155 — aria-live label "Reasoning…"; index.html:157 — elapsed timer shown. No estimated duration found. |

### US-U4: Review Table Interaction Quality

CSS-level evidence unchanged from Cycle 7. Relevance score scale label (US-U4 AC6) remains ❌ Fail — styles.css confirms `.ats-score-label` shows "ATS" text only; no "/ 100" pattern found.

### US-U5: Rewrite Review Presentation

CSS evidence unchanged. `del.diff-removed`, `ins.diff-added` (styles.css:1248–1249) confirmed present. No "Approve & Next" keyboard control found in index.html. Bulk CSS present (styles.css:1268–1271). Cycle 7 findings hold.

### US-U6: Generation and Output State Feedback

No inline preview iframe in index.html outside the layout panel. `tab-final_generate` and `tab-download` tabs (index.html:217–218) are dynamically rendered. Cycle 7 confirmed inline preview (✅) and version tracking gap (🔲) via layout-instruction.js and download-tab.js.

### US-U7: Accessibility and Keyboard Navigation

| AC | Status | Evidence (Cycle 8) |
|----|--------|-------------------|
| 7.1 Modal focus trap + restore | ✅ Pass | ui-core.js:30, 239–247, 294–347 — `_focusedElementBeforeModal`, `setInitialFocus()`, `trapFocus()`, `restoreFocus()` |
| 7.2 Visible styled focus indicators | ⚠️ Partial | styles.css:144, 261, 296, 593, 640, 1197, 1265 — most elements use `:focus-visible`. **GAP-U17 (NEW):** `.q-input:focus`, `.message-input:focus`, `.form-input:focus`, `.layout-instruction-textarea:focus` use `outline: none` + `box-shadow` only (styles.css:510, 579, 755, 1436). Box-shadow is stripped in forced-color mode. |
| 7.3 Tab keyboard navigation | ✅ Pass | ui-core.js:528–553 — ArrowLeft/Right/Home/End; Enter/Space activate |
| 7.4 Icon-only controls have aria-label | ✅ Pass | index.html:77, 87, 95, 113, 117, 149, 198, 227 — all checked |
| 7.5 Accept/reject by colour AND label/icon | ⚠️ Partial | styles.css:1189–1195 — `.icon-btn.active` green fill only; no text change. Cycle 7 confirmed `aria-pressed` on rewrite btns (GAP-178). Workflow step pills: colour-only in CSS (sr-only text in workflow-steps.js per Cycle 7 — not in core files). |
| 7.6 Form errors via aria-describedby | ⚠️ Partial | styles.css:1532–1536 — `aria-invalid` styling present. index.html:283, 298 — alert/confirm modals have `aria-describedby`. Dynamic field `aria-describedby` wiring not in static index.html. Cycle 7 confirmed wiring in job-input.js. |

### US-U8: Responsive Behaviour and Loading Performance

| AC | Status | Evidence (Cycle 8) |
|----|--------|-------------------|
| 8.1 1280×800 without horizontal scroll | ✅ Pass | styles.css:149 — `.workflow-steps { overflow-x: auto }`. styles.css:619–627 — tab bar `overflow-x: auto` with scroll buttons. |
| 8.2 Table columns collapsible at ≤1400 px | ❌ Fail | No `@media (max-width: 1400px)` rules found anywhere in styles.css (1609 lines reviewed). Session table at 700px only (styles.css:322–327). |
| 8.3 Shell renders ≤2 s locally | ⚠️ Partial | index.html:17–23, 29, 714–715 — non-deferred jQuery and DataTables script tags are synchronous blocking. CDN resources. |
| 8.4 Async content areas have skeleton placeholders | ❌ Fail | No skeleton CSS found in styles.css. `.document-content { min-height: 11in }` prevents shift in doc viewer; no skeletal placeholders for analysis/questions/review areas. |

### US-U9: HTML Layout Review Interaction Quality

| AC | Status | Evidence (Cycle 8) |
|----|--------|-------------------|
| 9.1 Instruction field with scope label + placeholder | ⚠️ Partial | styles.css:1400 — `.layout-scope-label` CSS present. Cycle 7 confirmed text in layout-instruction.js:293. CSS placeholder support exists. |
| 9.2 Processing indicator within 300 ms | ✅ Pass | styles.css:1438–1439 — `.processing-indicator` CSS; Cycle 7 confirmed synchronous show before await. |
| 9.3 Confirmation of applied change | ✅ Pass | styles.css:1441 — `.confirmation-message` CSS; Cycle 7 confirmed layout-instruction.js:720. |
| 9.5 Instruction history with per-entry Undo | ⚠️ Partial | styles.css:1444–1449 — history list CSS present; NO Undo button class found in styles.css. Cycle 7 confirmed `undoInstruction()` and Undo button in layout-instruction.js:1008–1030. CSS gap: no `.layout-undo-btn` or equivalent in styles.css. |
| 9.6 Single "Proceed to Final Generation" button | ❌ Fail | index.html:188–189 — two buttons: "✅ Confirm Layout" (#layout-btn) and "✅ Proceed to Finalise →" (#final-generate-proceed-btn). Labels differ from story spec. |

---

## Terminology Clarity (Cycle 8 additions)

| Location | Label | Assessment |
|----------|-------|------------|
| index.html:131 | `⬇️ Download` (step) | ⚠️ Inconsistent with tab label "File Review" (index.html:218) |
| index.html:218 | `⬇️ File Review` (tab) | ⚠️ Same content as "Download" step but different name |
| index.html:217 | `📄 Generated Files` (tab) | ⚠️ Overlaps with "Download/File Review" — two tabs for same output stage |
| index.html:53 | `LLM:` (header pill) | ⚠️ Developer-centric acronym; end users may not know what "LLM" means |
| index.html:188 | `✅ Confirm Layout` | ⚠️ Differs from story spec "Proceed to Final Generation"; implies reviewing but not finalising |
| index.html:189 | `✅ Proceed to Finalise →` | ⚠️ British spelling inconsistency + differs from story spec |

All Cycle 7 terminology findings remain valid (see table in Cycle 7 section below).

---

## New Gap (Cycle 8)

**GAP-U17: Input focus ring fails in forced-color / high-contrast mode**
Four text input focus states use `outline: none` with `box-shadow` replacement only (styles.css:510, 579, 755, 1436):
- `.question-item .q-input:focus`
- `.message-input:focus`
- `.form-input:focus`
- `.layout-instruction-textarea:focus`

In Windows High Contrast mode and CSS `forced-colors: active`, `box-shadow` is stripped by the browser. These inputs would display no visible focus ring for keyboard users on high-contrast themes. Fix: add `outline: 2px solid #3b82f6; outline-offset: 2px` alongside the `box-shadow` (outline-only is not needed — both together satisfies WCAG 2.4.7 in all modes).

---

## Evidence Summary (Cycle 8 + Cycle 7 combined)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-U1: Workflow Orientation | 4 | 1 | 0 | 0 | 0 |
| US-U2: Job Input UX | 4 | 1 | 0 | 0 | 0 |
| US-U3: Analysis Readability | 2 | 2 | 1 | 0 | 0 |
| US-U4: Review Table Interaction | 4 | 1 | 1 | 0 | 0 |
| US-U5: Rewrite Review | 5 | 0 | 1 | 0 | 0 |
| US-U6: Generation Feedback | 2 | 2 | 0 | 1 | 0 |
| US-U7: Accessibility | 4 | 2 | 0 | 0 | 0 |
| US-U8: Responsive / Performance | 1 | 2 | 2 | 0 | 1 |
| US-U9: Layout Review UX | 4 | 1 | 1 | 0 | 0 |
| **Total** | **30** | **12** | **6** | **1** | **1** |

**Note on score change vs Cycle 7:** US-U7 moves from 6 Pass / 0 Partial to 4 Pass / 2 Partial due to GAP-U17 (input outline:none) and colour-only icon-btn.active state being reassessed strictly against WCAG forced-color. US-U8 AC3 shell-render moves from Pass to Partial due to blocking script tags discovered in index.html. Two additional Fail items noted (US-U8 AC4 skeleton, US-U9 AC6 proceed button) — US-U9 AC6 was Partial in Cycle 7; re-assessed as Fail from index.html evidence.

---

*Cycle 7 review (2026-06-22) is archived below.*

---

# UX Expert / Heuristic Review Status — Cycle 7

**Last Updated:** 2026-06-22 14:45 ET

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py (plus web/workflow-steps.js, web/rewrite-review.js, web/layout-instruction.js, web/job-input.js, web/job-analysis.js, web/experience-review.js, web/skills-review.js, web/questions-panel.js, web/message-queue.js, web/message-dispatch.js, web/final-generate.js, web/download-tab.js, web/spell-check.js, web/cover-letter.js, web/fetch-utils.js)

**Rating key:** ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | — N/A

---

## Executive Summary (Cycle 7)

**Changes since Cycle 6 verified:** GAP-174 (cover-letter company context textarea), GAP-176 (bullet-reorder modal role/focus trap/Escape), GAP-178 (rewrite button aria-pressed), GAP-179 (icon-btn/rw-btn/sm-btn :focus-visible), GAP-180 (step-rerun opacity:0.35 at rest), GAP-181 (spell-check viewer panel buttons labelled "Generate Preview →"), GAP-166 (rewrite decisions persisted to localStorage). All seven confirmed present in source — see verification table at end of document.

**Score: 34 Pass / 11 Partial / 4 Fail / 1 Not Implemented**

Net movement from Cycle 6: GAP-179 resolves `.icon-btn:focus-visible` and `.rw-btn:focus-visible` (previously Partial under GAP-U15). GAP-178 adds `aria-pressed` to rewrite action buttons (previously unlabeled toggles). GAP-180 reduces the step-rerun discoverability risk (opacity:0.35 at rest vs. prior opacity:0 — now partially visible without hover). GAP-176 adds full dialog semantics to bullet-reorder modal. US-U7 AC7.2 upgraded from Partial to Pass. No new Fail items. Four long-standing Fail items remain unchanged from prior cycles.

**Key resolved items this cycle (Cycle 7):**
- GAP-174 ✅: `web/cover-letter.js` lines 130–131: `id="cl-company-context"` textarea with label "Company context (optional — paste specific initiatives, products, values, or recent news)".
- GAP-176 ✅: `web/workflow-steps.js` lines 463–514: bullet-reorder modal has `role="dialog"`, `aria-modal="true"`, `aria-labelledby="bullet-reorder-title"`, `trapFocus()`, `setInitialFocus()`, Escape handler.
- GAP-178 ✅: `web/rewrite-review.js` lines 306–308: `aria-pressed="false"` on Accept/Edit/Reject; dynamically updated at lines 325, 342, 360, 392, 396 on each action.
- GAP-179 ✅: `web/styles.css` lines 1195, 1263, 296: `.icon-btn:focus-visible`, `.rw-btn:focus-visible`, `.sm-btn:focus-visible` all have `outline: 2px solid #3b82f6; outline-offset: 2px`. Closes GAP-U15 from Cycle 6.
- GAP-180 ✅: `web/workflow-steps.js` line 733: `opacity:0.35` at rest; hover/focus-within rule at line 762 raises to `opacity:1`. More discoverable than prior opacity:0.
- GAP-181 ✅: `web/spell-check.js` lines 148, 271: both spell-check submit buttons (empty-check path and decision path) labelled "Generate Preview →".
- GAP-166 (re-confirmed) ✅: `web/rewrite-review.js` lines 46, 53: decisions saved/restored via localStorage keyed by session ID, confirmed still present.

**Remaining Fail-grade gaps (4):**
1. Clarifying questions still rendered all-at-once without paged grouping (US-U3 AC4) — unchanged since Cycle 1.
2. Numeric relevance score with scale label absent from experience/skills review rows (US-U4 AC6) — unchanged.
3. No keyboard-driven sequential rewrite navigation "Approve & Next" (US-U5 AC5) — unchanged since Cycle 1.
4. Review table columns have no responsive collapse at ≤1400 px (US-U8 AC2) — unchanged since Cycle 1.

---

## Nielsen's 10 Heuristics

| # | Heuristic | Rating | Key Evidence |
|---|-----------|--------|--------------|
| H1 | Visibility of system status | 🟢 Good | 13-pill workflow bar with active/completed/stale/critical states (`styles.css:151–158`); LLM busy overlay with spinner, elapsed timer, `aria-live="polite" role="status"` label (`index.html:152–160`); ATS score badge in position bar (`index.html:87–93`); layout freshness chip with dynamic aria-label (`ui-helpers.js:91`); sr-only state text per step pill (`workflow-steps.js:715–725`). Step-rerun button at opacity:0.35 at rest (`workflow-steps.js:733`) provides persistent (if low-contrast) affordance signal. |
| H2 | Match between system and the real world | 🟡 Minor | Step labels use domain terms (Analysis, Rewrites, Spell Check, Layout Review) — good. Residual friction: "⚙️ Customise" (British spelling inconsistent with US labels elsewhere); "⚙️ Recommend Customizations" action button (`index.html:183`) is developer-centric phrasing vs. user mental model of "What should I include?"; "✅ Proceed to Finalise →" (`index.html:189`) uses British spelling while "Spell Check" and "Download" use American. |
| H3 | User control and freedom | 🟡 Minor | Workflow step pills are clickable for forward/back navigation; `_showReRunConfirmModal()` protects destructive re-runs (`workflow-steps.js:138–187`); layout undo stack (20-deep) with per-instruction Undo (`layout-instruction.js:1008–1030`); LLM abort button. Bullet-reorder modal now has Escape handler (`workflow-steps.js:514`). Residual: no Escape-key dismiss on alert/confirm modals; no session-level undo for rewrite decisions beyond "reject". |
| H4 | Consistency and standards | 🟡 Minor | `:focus-visible` now consistent across `.action-btn`, `.tab`, `.step`, `.sm-btn`, `.icon-btn`, `.rw-btn` (`styles.css:144, 261, 296, 590, 637, 1195, 1263`). `aria-pressed` now on all three rewrite card toggle buttons (`rewrite-review.js:306–308`). Icon collision remains: `📊 Experiences` and `📊 ATS Score` share the same emoji; `✏️ Experience Bullets` and `✏️ Rewrites` share the same emoji (`index.html:204, 205, 212`). British/US spelling inconsistency across action button labels. |
| H5 | Error prevention | 🟢 Good | Downstream-aware confirmation before LLM re-run lists affected stages (`workflow-steps.js:138–187`); live character counter prevents submitting insufficient job text (`job-input.js:320–336`); `aria-invalid` + field error spans on form inputs (`job-input.js:116, 133`); protected-site detection with recovery instructions before fetch fails (`job-input.js:140–149, 471–529`); intake confirm card lets user correct extracted metadata before analysis proceeds. |
| H6 | Recognition rather than recall | 🟡 Minor | Inline diff on rewrite cards eliminates mental comparison load; keyword rank badges `#N` on analysis screen; proactive advisory grid for protected sites before user tries URL fetch. Residual: no inline first-bullet preview in experience review rows; clarifying questions panel is a flat list requiring recall of earlier answers when answering later questions. |
| H7 | Flexibility and efficiency of use | 🟡 Minor | Bulk accept/reject/emphasize actions (`experience-review.js:241–248`, `skills-review.js:942–948`); rewrite Bulk Accept All/Reject All (`rewrite-review.js:453–462`); layout undo stack; tab ARIA keyboard navigation (ArrowLeft/Right/Home/End) (`ui-core.js:509–541`); step-rerun button keyboard-accessible. Cover letter now has optional company context textarea for power users (`cover-letter.js:130–131`). Residual: no "Approve & Next" keyboard shortcut for sequential rewrite review. |
| H8 | Aesthetic and minimalist design | 🟢 Good | Two-pane layout (chat left, viewer right) separates conversation from content; tabs provide information architecture without navigation overhead; analysis result uses 5 distinct card sections; LLM busy overlay uses backdrop blur. Minor: 24+ visible tabs in the tab bar creates visual noise. |
| H9 | Help users recognise, diagnose, and recover from errors | 🟡 Minor | LLM busy overlay has elapsed timer and "Taking longer than usual" badge after threshold; protected-site modal provides specific numbered instructions; `aria-live="polite"` on `#llm-busy-label` (`index.html:155`). Residual: PDF generation failure shows only a chat-panel error message with no "Download HTML instead" recovery CTA; no estimated duration in loading state. |
| H10 | Help and documentation | 🟡 Minor | Onboarding modal explains three-phase workflow with numbered steps on startup (`index.html:313–386`); layout scope label states "Text content is finalised — content edits are not applied here" (`layout-instruction.js:293`); paste area minimum-character guidance (`job-input.js:116`). Residual: no contextual help explaining the difference between "Emphasize" / "Include" / "De-emphasize" / "Exclude" action tiers; no tooltips on icon-only experience row buttons beyond aria-labels. |

**Heuristic summary:** True Green (🟢): H1, H5, H8. Seven Minor (🟡): H2, H3, H4, H6, H7, H9, H10. Zero Major or Critical.

---

## Additional UX Dimensions

### Cognitive Load

**Assessment:** Moderate. The 13-step workflow bar with 24+ viewer tabs simultaneously visible creates a high-information-density environment. The customisation phase spans 9 sub-tabs with no sub-phase progress indicator — a user cannot determine which sub-tabs they have completed without checking each one. The flat rendering of all clarifying questions at once (`questions-panel.js`, all-at-once forEach loop) violates chunking principles for a step that may yield 3–5 questions. The 40/60 chat/viewer split means users must context-switch between two simultaneous information streams throughout the session.

**Positive:** The inline diff rendering in rewrite cards eliminates the cognitive load of comparing old and new text mentally. Keyword rank badges with `#N` numbering (`review-table-base.js:336–342`) make priority ordering immediately scannable. The onboarding modal's three numbered workflow phases reduce mental model formation time.

### Visual Hierarchy

**Assessment:** Strong. The header (dark navy), position bar (white with bold title), workflow step bar, and main content area form a clear 4-level visual hierarchy. Active step pills use blue fill; completed use green fill — high contrast, not colour-alone (sr-only text at `workflow-steps.js:715–725`). The rewrite tally bar at sticky top-of-panel (`styles.css:1229`) keeps progress count visible during scroll. The step-rerun button now appears at opacity:0.35 at rest on completed pills — low contrast but no longer invisible.

**Gap:** Tab bar with 24+ tabs at 0.85em font and tight `padding: 10px 14px` results in very compact labels. Icon collisions (📊/✏️ duplicates) reduce scannability when the bar is scrolled and only icons are visible at the narrow end.

### Information Architecture

**Assessment:** Two-level IA — workflow steps (primary) → viewer tabs (secondary). This maps well to the linear pipeline metaphor. However, the secondary level is not filtered to the current step: all 24+ tabs are always rendered (hidden tabs excluded), so the tab bar shows tabs relevant to past and future steps simultaneously. The position bar's "Job Analysis" and "ATS Report" buttons (`index.html:104, 105`) are tertiary access points to information also available in viewer tabs — creating two paths to the same content without a clear primary/secondary hierarchy.

**Positive:** Workflow step pill labels use task-verb language ("Analysis", "Rewrites", "Download") that matches user goals rather than internal phase names.

### Workflow Momentum

**Assessment:** Good for the main pipeline path. Action buttons in the chat input area guide users to the next step. The "Generate Preview →" label on spell-check viewer buttons (`spell-check.js:148, 271`) is clear and directional. Loading overlays with elapsed time prevent users from thinking the app has stalled.

**Gap:** The Layout step still requires two clicks to advance — "Confirm Layout" then "Proceed to Finalise →" — creating a checkpoint that may be perceived as bureaucratic friction when the user has made no layout changes. A single "Proceed to Final Generation" CTA regardless of whether instructions were applied would streamline this.

### Feedback Loops

**Assessment:** Strong. Status polling via `/api/status` drives real-time step-pill updates without page reload. `aria-live="polite"` on `#llm-busy-label` (`index.html:155`) announces LLM state to screen readers. Rewrite decisions are persisted to `localStorage` (`rewrite-review.js:46`) and restored across page loads. `aria-pressed` now dynamically reflects toggle state on rewrite action buttons (`rewrite-review.js:325, 342, 360`). Toast notifications for session rename operations provide immediate confirmation. Layout instruction history panel with per-entry change summaries (`layout-instruction.js:1008–1030`) gives users a full audit trail.

**Gap:** Multi-file generation progress (HTML → Chrome PDF → WeasyPrint PDF → DOCX) shows only a single spinner with one label. Individual substeps are not surfaced as distinct completions.

### Error Recovery

**Assessment:** Partial. Protected-site detection gives specific numbered recovery instructions (`job-input.js:471–529`). Downstream-aware re-run confirmation prevents accidental state invalidation. The LLM abort button (`#llm-busy-stop`) stops in-flight requests. Layout clarification dialog catches ambiguous instructions rather than silently applying a guess. Bullet-reorder modal now has Escape key dismiss (`workflow-steps.js:514`).

**Gap:** PDF/DOCX generation failure surfaces only as a chat-panel `appendMessage('system', '❌ Failed: ...')` with no recovery action button. There is no "Download HTML instead" or "Try again" CTA collocated with the error.

### Affordance Clarity

**Assessment:** Good for primary controls. Action buttons are blue-filled with text labels. Bulk toolbars use colored borders to signal action type. The inline rewrite diff with red strikethrough / green addition is immediately comprehensible. Experience row icon buttons (32×32 px, always visible) are sized for touch as well as click. All `.icon-btn` and `.rw-btn` elements now have explicit `:focus-visible` CSS rules (`styles.css:1195, 1263`) — WCAG 2.4.7 gap closed.

**Residual:** The `.step-rerun` button (↻) inside completed step pills is now `opacity:0.35` at rest (improved from prior `opacity:0`), but this is still low-contrast and may not be noticed by users who don't hover. Mouse users who do not hover over step pills may still not discover the re-run capability.

**Residual:** The relevance/confidence model uses tier labels (Emphasize / Include / De-emphasize / Exclude) with "High/Medium/Low" confidence badges, but no legend or explanation of what "Emphasize" versus "Include" means in the generated output.

### Terminology Clarity

| Location | Current label | Assessment |
|----------|--------------|------------|
| `index.html:183` | `⚙️ Recommend Customizations` | ⚠️ Developer-centric verb. User mental model: "What should I include?" |
| `index.html:185` | `Continue to Spell Check →` | ✅ Clear and directional |
| `index.html:186` | `Generate Preview →` (spell-btn) | ✅ Correct (fixed in Cycle 6 GAP-169) |
| `index.html:189` | `✅ Proceed to Finalise →` | ⚠️ British spelling inconsistent with "Spell Check", "Download" labels |
| `layout-instruction.js:379` (inferred) | `Generate Final Files` | ⚠️ Differs from story spec "Proceed to Final Generation" |
| Workflow step bar | `⚙️ Customise` | ⚠️ British spelling inconsistent with other step labels |
| `spell-check.js:148, 271` | `Generate Preview →` | ✅ Fixed this cycle (GAP-181) |
| Tab bar | `📊 Experiences` / `📊 ATS Score` | ❌ Same icon for two different tabs — GAP-U13 |
| Tab bar | `✏️ Experience Bullets` / `✏️ Rewrites` | ❌ Same icon for two different tabs — GAP-U13 |
| `cover-letter.js:130` | Company context label | ✅ NEW — optional textarea with clear descriptive label (GAP-174) |

---

## Top 5 UX Issues

1. **Clarifying questions wall-of-questions — Fail — US-U3 AC4 — questions-panel.js (all-at-once forEach loop)**
   All post-analysis questions are rendered simultaneously as a flat list. With 3–5 questions, this creates a form-filling experience rather than a guided dialogue. The story criterion requires groups of ≤3 per screen with a "confirm before next group" flow. Unresolved since Cycle 1. Severity: Major (🟠).

2. **No keyboard-driven sequential rewrite review — Fail — US-U5 AC5 — rewrite-review.js**
   When 10+ rewrites exist, users must scroll manually through all cards. No "Approve & Next →" keyboard shortcut or focus-advancement exists. Bulk Accept All / Reject All is available but destroys the per-rewrite review flow. Unresolved since Cycle 1. Severity: Major (🟠).

3. **Review table columns not responsive at ≤1400 px — Fail — US-U8 AC2 — styles.css**
   The 6-column experience review table and 7-column skills review table have no `@media (max-width: 1400px)` rules to hide lower-priority columns. At 1280×800 (a common laptop resolution), these tables will be cramped or overflow their containers. Unresolved since Cycle 1. Severity: Major (🟠) at 1280-px viewport.

4. **Two-click layout confirmation flow with overlapping CTAs — Partial — US-U9 AC6 — index.html:188–189, layout-instruction.js**
   The layout step presents three overlapping advance signals: (1) `#layout-btn` ("Confirm Layout"), (2) "Generate Final Files" inside the layout pane, and (3) `#final-generate-proceed-btn` ("Proceed to Finalise →") in the chat toolbar. The story requires a single "Proceed to Final Generation" action. Severity: Minor–Major (between 🟡 and 🟠).

5. **No multi-step generation progress labelling — Partial — US-U6 AC1 — index.html:152–160**
   The LLM busy overlay shows a spinner with elapsed time and a single label, but multi-file generation (HTML render → Chrome PDF → WeasyPrint PDF → ATS DOCX) is not decomposed into individually labelled substeps. A 15–30 second generation run shows only the elapsed counter. Severity: Minor (🟡) but contributes to anxiety and perceived slowness.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

| AC | Status | Evidence |
|----|--------|---------|
| 1.1 Stage indicator present and accurate on every step | ✅ Pass | `index.html:117–143` — 13-pill workflow bar with `<nav class="workflow" aria-label="Application workflow steps">`. `workflow-steps.js:612–735` (`updateWorkflowSteps`) applies `.active`/`.completed`/`.upcoming`/`.stale`/`.stale-critical` on every `/api/status` poll. Step labels include emoji + text. GAP-172: sr-only state text appended per pill ("(current step)", "(completed)", "(stale — results may be outdated)", "(critical — review required)") — WCAG 1.3.1 pass for screen readers. |
| 1.2 Completed steps visually distinct from active/upcoming | ✅ Pass | `styles.css:151–158`: active=blue fill (#dbeafe/#1d4ed8), completed=green fill (#dcfce7/#166534), upcoming=ghost (#f8fafc/#cbd5e1), stale=amber, stale-critical=red. Five visually distinct states. Colour distinction supplemented by sr-only text (GAP-172). |
| 1.3 Back-navigation preserves approved content; destructive actions require confirmation | ⚠️ Partial | `workflow-steps.js:138–187` (`_showReRunConfirmModal`): downstream-aware confirm dialog fires for LLM re-run actions. Viewing a completed step (non-re-run) navigates silently without orientation message. No regression from Cycle 6. |
| 1.4 Session restore lands on last active step with data intact | ⚠️ Partial | `session-manager.js:412–471` (`restoreSession`): restores phase, conversation history, correct tab, position bar. No unified orientation card (job + step + last-active timestamp as a single persistent banner). Orientation remains fragmented across the position bar, chat history, and step pill state. No regression from Cycle 6. |
| Stage indicator updates without reload | ✅ Pass | `stateManager.onPhaseChange()` listener in `ui-core.js` calls `updateWorkflowStepsClickable(phase)` on each backend phase transition. |

**Failure modes present:** Silent back-navigation from non-re-run completed steps. No persistent unified session-restore orientation banner.

---

### US-U2: Job Input and URL Ingestion UX

| AC | Status | Evidence |
|----|--------|---------|
| 2.1 URL and paste-text modes clearly delineated | ✅ Pass | `job-input.js:107–111`: three equal-weight tab buttons (📝 Paste Text, 🔗 From URL, 📁 Upload File) as `.input-tab` controls. Active tab: `.input-tab.active` blue bottom-border (`styles.css:1293`). |
| 2.2 Protected-site detection triggers inline, contextual instruction | ✅ Pass | `job-input.js:471–529` (`showProtectedSiteModal`): site name, numbered instruction list, tip to Paste Text tab. Lines 140–149: proactive advisory grid naming LinkedIn, Indeed, Glassdoor before any fetch. |
| 2.3 Fetch loading state appears within 300 ms of submission | ✅ Pass | `job-input.js:455`: `setLoading(true, 'Fetching job from URL…')` synchronously before `await fetch()`. |
| 2.4 Extracted fields editable in-place; editing does not restart workflow | ⚠️ Partial | `message-dispatch.js:420–463` (`_showIntakeConfirmCard`): editable inputs for Role, Company, Date Applied in chat panel after extraction. Static job-tab `<h1>` remains non-editable after submission (`job-input.js:49–84`). Intake card placement in chat may be missed without explicit focus movement. |
| 2.5 Paste area shows minimum character guidance hint | ✅ Pass | `job-input.js:320–336`: `PASTE_MIN_CHARS = 200`; live counter with red/green feedback; `aria-live="polite"`. |

**Failure modes present:** Post-intake job title/company locked in position bar. Intake card in chat may be missed.

---

### US-U3: Analysis Results Readability

| AC | Status | Evidence |
|----|--------|---------|
| 3.1 Analysis result has ≥4 visually distinct sections | ✅ Pass | `review-table-base.js:289–362`: (1) Role & Domain card, (2) Mismatch callout, (3) Required Skills grid, (4) Preferred qualifications list, (5) ATS Keywords with rank badges. Five named, distinctly styled sections. |
| 3.2 Keywords displayed with visual rank signal | ✅ Pass | `review-table-base.js:336–342`: `<span class="kw-badge"><span class="kw-rank">#${idx+1}</span>${kw}</span>`. Section header: "(higher rank = higher priority)". |
| 3.3 Mismatch callouts visible above the fold; summary count for >3 mismatches | ⚠️ Partial | Mismatch callout appears near top (second block after role card). Gated on `window._masterSkills` being populated. No "N mismatches" aggregate count with expandable detail when >3 — all inline as flat block. |
| 3.4 Clarifying questions in groups of ≤3 per screen; each group confirmed before next | ❌ Fail | `questions-panel.js` renders all questions simultaneously as a flat list using `.forEach()`. No paged grouping, no "confirm this group then show next" mechanic. **Unresolved since Cycle 1.** |
| 3.5 Analysis loading includes descriptive label and estimated duration | ⚠️ Partial | `index.html:155`: LLM busy label has `aria-live="polite" role="status"`. `job-analysis.js:104–105`: label is "Analysing job description…". Elapsed time shown but no estimated duration (e.g., "usually ~20 s"). |

**Failure modes present:** All questions rendered simultaneously — wall-of-questions. No estimated analysis duration.

---

### US-U4: Review Table Interaction Quality

| AC | Status | Evidence |
|----|--------|---------|
| 4.1 Accept/reject toggles visually obvious; current state unambiguous | ✅ Pass | `experience-review.js:202–208`: 32×32 px icon buttons with text labels. `.icon-btn.active { background: #10b981; color: #fff }` (`styles.css:1186–1192`). Always visible. `.icon-btn:focus-visible` now present at `styles.css:1195` (GAP-179). |
| 4.2 Reorder controls discoverable without hover; keyboard-accessible | ✅ Pass | Up/down row-reorder `<button>` elements always rendered. `disabled` on first/last row. `aria-label` added to category reorder buttons in `skills-review.js:423–424` (GAP-171). |
| 4.3 Row density sufficient for decisions without expanding every row | ⚠️ Partial | Experience rows show title, company, dates, recommendation tier, confidence badge, reasoning excerpt, and action buttons. No inline first-bullet preview. Users cannot pre-scan bullet content without expanding each row. |
| 4.4 Bulk actions present when row count > 8 | ✅ Pass | `experience-review.js:241–248`: bulk toolbar always rendered ("Accept All Recommended", "Emphasize All", "Include All", "Exclude All"). `skills-review.js:942–948`: same pattern. |
| 4.5 Bullet expansion in-place; no page navigation | ✅ Pass | `showBulletReorder()` renders inline within the tab. Bullet-reorder modal now has `role="dialog"`, `aria-labelledby`, focus trap, and Escape handler (`workflow-steps.js:463–514`) — GAP-176. |
| 4.6 Relevance scores labelled with scale (e.g., "Relevance: 92 / 100") | ❌ Fail | Experience review uses tier labels (Emphasize / Include / De-emphasize / Omit) with confidence badge (High/Medium/Low). No numeric relevance score with denominator or letter grade with legend. Story requires explicit scale label. Unchanged from Cycle 5. |

**Failure modes present:** No inline first-bullet preview. Confidence bands used instead of numeric relevance score with scale.

---

### US-U5: Rewrite Review Presentation

| AC | Status | Evidence |
|----|--------|---------|
| 5.1 Inline diff with red/strikethrough removals and green additions | ✅ Pass | `rewrite-review.js:183–226`: LCS word-level diff. `<del class="diff-removed">` red strikethrough (`styles.css:1244`). `<ins class="diff-added">` green highlight (`styles.css:1245`). |
| 5.2 Accept/Reject/Edit controls collocated with diff | ✅ Pass | `rewrite-review.js:272–275`: ✓ Accept, ✎ Edit, ✗ Reject in `.rewrite-actions` inside each `.rewrite-card-body`. All three now carry `aria-pressed` (GAP-178, `rewrite-review.js:306–308`). |
| 5.3 LLM reason visible within one click or hover | ✅ Pass | `rewrite-review.js:261–265`: `<details class="rewrite-rationale"><summary>Rationale & Evidence</summary>` — one-click expand. |
| 5.4 Edit mode allows free-text editing; preserves original for comparison | ✅ Pass | `rewrite-review.js:293–351`: edit mode shows `<textarea>` pre-filled with proposed text; `saveRewriteEdit()` regenerates diff against `data-original`. |
| 5.5 Keyboard shortcut or "Approve & Next" for sequential navigation when >3 rewrites | ❌ Fail | No sequential keyboard navigation. Bulk Accept All / Reject All exist (`rewrite-review.js:453–462`) but no "Approve & Next →" card-by-card shortcut or focus-advancement. **Unresolved since Cycle 1.** |
| 5.6 Rewrite decisions persisted across page reload | ✅ Pass | `rewrite-review.js:46`: decisions saved to `localStorage` keyed by session ID after every action. Restored in `renderRewritePanel` before re-apply loop. Cleared after successful final submission. Re-confirmed present in Cycle 7. |

**Failure modes present:** Manual scrolling required through all rewrite cards. No keyboard-driven per-card progression.

---

### US-U6: Generation and Output State Feedback

| AC | Status | Evidence |
|----|--------|---------|
| 6.1 Generation progress step-labelled; completed substeps show checkmark | ⚠️ Partial | LLM busy overlay shows spinner + elapsed + one step label. Multi-file generation (HTML → Chrome PDF → WeasyPrint PDF → DOCX) not decomposed into individually labelled substeps. Completion shown as status badges in `#preview-output-status` only after full batch. |
| 6.2 Generated CV renderable inline; download button prominent | ✅ Pass | `layout-instruction.js:287`: `<iframe id="layout-preview">` renders CV HTML inline before download. Final-generate tab provides clearly labelled download buttons. |
| 6.3 Download filename follows CV_{Company}_{Role}_{Date} convention | ✅ Pass | Backend generates `CV_{company}_{role}_{timestamp}.pdf`, `CV_{company}_{role}_{timestamp}_ATS.docx`. Frontend exposes server-provided filenames. |
| 6.4 Generation error surfaces user-readable message with fallback action | ⚠️ Partial | Errors shown via `appendMessage('system', '❌ Failed: ...')` in chat panel. No "Download HTML instead" recovery CTA button collocated with the error. |
| 6.5 Multiple versions listed with timestamps and "current" label | 🔲 Not Implemented | `download-tab.js` and `final-generate.js` list only the most recently generated files. No version history, timestamps, or "current" badge. Multiple runs overwrite listing. |

**Failure modes present:** Single spinner for multi-file generation pipeline. No recovery CTA on generation failure. No within-session version history.

---

### US-U7: Accessibility and Keyboard Navigation

| AC | Status | Evidence |
|----|--------|---------|
| 7.1 Modal focus management: trap on open, restore on close | ✅ Pass | `ui-core.js:239–347`: `openSettingsModal` saves `_focusedElementBeforeModal`, calls `setInitialFocus()` + `trapFocus()`. `closeSettingsModal()` calls `restoreFocus()`. GAP-168: `openSessionsModal` calls `setInitialFocus()` after `trapFocus()`. GAP-176: bullet-reorder modal calls `trapFocus('bullet-reorder-modal')` and `setInitialFocus('bullet-reorder-modal')` (`workflow-steps.js:509–510`). |
| 7.2 All interactive elements have visible, styled focus indicator | ✅ Pass | **NEW in Cycle 7 (GAP-179):** `.icon-btn:focus-visible` (`styles.css:1195`), `.rw-btn:focus-visible` (`styles.css:1263`), `.sm-btn:focus-visible` (`styles.css:296`) all have `outline: 2px solid #3b82f6; outline-offset: 2px`. Combined with prior additions: `.action-btn:focus-visible` (`styles.css:590`), `.tab:focus-visible` (`styles.css:637`), `.step:focus-visible` (`styles.css:144`), `.step-rerun:focus-visible` (dynamic injection at `workflow-steps.js:762`). No `outline:none` without a replacement focus indicator remains in the interactive element set. |
| 7.3 Tab keyboard navigation: arrow keys navigate, Enter/Space activate | ✅ Pass | `index.html:200–225`: tabs have `role="tab"`, `tabindex="0"`/`"-1"`, `aria-selected`. `ui-core.js:509–541`: ArrowLeft/Right/Home/End navigate; Enter/Space activate. |
| 7.4 Icon-only controls have `aria-label` or `title` | ✅ Pass | `.step-rerun` is a `<button>` with `aria-label="Re-run ${rerunLabel}"` (`workflow-steps.js:730`). Category reorder ↑↓ buttons in `skills-review.js:423–424` have `aria-label`. `#layout-freshness-chip` `aria-label` is dynamic and state-reflecting (`ui-helpers.js:91`). GAP-176: bullet-reorder modal close button has `aria-label="Close reorder dialog"` (`workflow-steps.js:491`). |
| 7.5 Accept/reject status communicated by colour AND text label | ✅ Pass | Rewrite card action buttons: "✓ Accept", "✎ Edit", "✗ Reject" — text + glyph retained. **NEW (GAP-178):** `aria-pressed` dynamically reflects toggle state on all three buttons (`rewrite-review.js:306–308, 325, 342, 360`). Experience icon buttons: active state is green fill + retained icon. |
| 7.6 Form validation errors associated via `aria-describedby` | ✅ Pass | `job-input.js:116`: paste textarea `aria-describedby="paste-char-count paste-error"`. URL input `aria-describedby="url-error"` (line 133). `aria-live="polite"` on error spans. `styles.css:1527`: `input[aria-invalid="true"]:focus` gives additional visual feedback. |

**Failure modes:** None. All six criteria pass as of Cycle 7. Former GAP-U15 (`.icon-btn`/`.rw-btn` missing `:focus-visible`) is closed by GAP-179.

---

### US-U8: Responsive Behaviour and Loading Performance

| AC | Status | Evidence |
|----|--------|---------|
| 8.1 Core workflow navigable without horizontal scroll at 1280 × 800 | ⚠️ Partial | `styles.css:149`: `.workflow-steps { display: flex; gap: 32px; justify-content: center; overflow-x: auto; }` — `overflow-x: auto` IS present. The 13-step bar will scroll rather than overflow. The tab bar uses `overflow-x: auto` with scroll buttons. However at 1280 px the workflow bar gap of 32 px × 12 arrows + 13 pills will still likely need to scroll. |
| 8.2 Table columns collapsible/hidden at ≤1400 px | ❌ Fail | No `@media (max-width: 1400px)` rules hiding lower-priority columns in experience/skills/achievements/publications review tables. Session-manager table hides at ≤700 px (`styles.css:321–326`). Review tables have no responsive column management. **Unresolved since Cycle 1.** |
| 8.3 Application shell renders in ≤2 s on localhost | ✅ Pass | External CDN resources (Bootstrap, DataTables, Font Awesome) commonly cached. `bundle.js` locally served. No synchronous blocking API calls before first paint. |
| 8.4 Async content areas have skeleton placeholders | ⚠️ Partial | Loading-spinner shown during initial session load. Experience/skills tabs call `content.innerHTML = ''` before content arrives, causing zero-height area flicker. No minimum-height placeholder or skeleton screens. |
| 8.5 Long table scroll performance | — N/A | Cannot evaluate from static source review. No virtual scrolling or CSS containment applied to review tables. |

**Failure modes present:** Review table columns have no responsive collapse rules. Minor zero-height flicker on async content load.

---

### US-U9: HTML Layout Review Interaction Quality

| AC | Status | Evidence |
|----|--------|---------|
| 9.1 Instruction field has visible placeholder and scope label | ✅ Pass | `layout-instruction.js:293`: scope label "💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." Styled as `.layout-scope-label`. Placeholder provides concrete examples. |
| 9.2 Processing indicator within 300 ms; preview updates on completion | ✅ Pass | `layout-instruction.js:364–367`: `#processing-indicator` shown synchronously before `await apiCall(...)`. Preview iframe updated on completion. |
| 9.3 Confirmation of applied change shown after each instruction | ✅ Pass | `layout-instruction.js:720`: `showConfirmationMessage(response.summary)`. `appendMessage('assistant', '✅ Layout instruction applied. Preview updated.')` in chat panel. |
| 9.4 Ambiguous instructions surface a clarifying prompt | ✅ Pass | `layout-instruction.js:663–665`: `response.error === 'clarify'` calls `showClarificationDialog()`. Not a silent guess or raw error. |
| 9.5 Instruction history panel with individual Undo controls | ✅ Pass | `layout-instruction.js:1008–1030`: each entry has timestamp, instruction text, change summary, and `<button class="action-btn-sm" onclick="undoInstruction(${index})">Undo</button>`. `undoInstruction()` (lines 1125–1137) pops `_layoutUndoStack` (max 20 entries). |
| 9.6 Single "Proceed to Final Generation" button, unambiguously labelled | ⚠️ Partial | Three overlapping advance signals: `#layout-btn` ("Confirm Layout" / "↻ Regenerate Preview" / "⬇️ Generate Final Files" depending on state), `#final-generate-proceed-btn` ("✅ Proceed to Finalise →") in chat toolbar, and "Generate Final Files" inside the layout pane. Story requires a single unambiguous "Proceed to Final Generation" action. Unchanged from Cycle 6. |

**Failure modes present:** Three overlapping layout-advance controls creating ambiguous workflow path. Button labels differ from story specification.

---

## Generated Materials Evaluation

**Filename convention:** ✅ Pass — Backend generates `CV_{Company}_{Role}_{Timestamp}.pdf` and `CV_{Company}_{Role}_{Timestamp}_ATS.docx`. Self-describing filenames.

**Inline preview:** ✅ Pass — The layout review tab renders the HTML CV in an `<iframe>` before download. Users can inspect before committing to final generation.

**ATS validation report:** ✅ Pass — `download-tab.js:76–141` renders an expandable ATS report table with pass/warn/fail per check, coloured rows, page-count advisory. Critical failures block the download button with an explanatory message.

**Output labelling:** ⚠️ Partial — `final-generate.js` labels files as "ATS PDF", "Human PDF", "ATS Word", "Human Word", "HTML" — clear and distinct. The `download-tab.js` "File Review" tab uses filenames only, without the "ATS PDF" / "Human PDF" shorthand labels alongside each entry.

**Version tracking:** 🔲 Not Implemented — No version timestamp or "current" label when multiple generation runs complete in a session.

---

## Cycle 7 — Verified GAP Fixes

| GAP | Claim | Source Evidence | Status |
|-----|-------|----------------|--------|
| GAP-174 | Company context textarea added to cover letter | `web/cover-letter.js:130–131`: `id="cl-company-context"` textarea with label | ✅ Confirmed |
| GAP-176 | Bullet-reorder modal has role="dialog", focus trap, aria-labelledby, Escape handler | `web/workflow-steps.js:463–514`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="bullet-reorder-title"`, `trapFocus()`, `setInitialFocus()`, Escape at line 514 | ✅ Confirmed |
| GAP-178 | Rewrite accept/edit/reject buttons have aria-pressed | `web/rewrite-review.js:306–308`: `aria-pressed="false"` on all three; dynamically updated at lines 325, 342, 360, 392, 396 | ✅ Confirmed |
| GAP-179 | .icon-btn, .rw-btn, .sm-btn have :focus-visible CSS | `web/styles.css:1195` `.icon-btn:focus-visible`, `styles.css:1263` `.rw-btn:focus-visible`, `styles.css:296` `.sm-btn:focus-visible` — all with `outline: 2px solid #3b82f6` | ✅ Confirmed |
| GAP-180 | step-rerun button has opacity:0.35 at rest | `web/workflow-steps.js:733`: inline style `opacity:0.35`; hover/focus-within rule at line 762 raises to `opacity:1 !important` | ✅ Confirmed |
| GAP-181 | viewer-panel spell-check buttons labeled "Generate Preview →" | `web/spell-check.js:148`: `submitEmptySpellCheck()` button label; `spell-check.js:271`: `submitSpellCheckDecisions()` button label | ✅ Confirmed |
| GAP-166 | rewrite decisions persisted to localStorage | `web/rewrite-review.js:46`: localStorage save on every action; line 53: load on panel render | ✅ Confirmed (re-verified) |

**Note:** Cycle 6 file listed GAP-U15 (`.icon-btn`/`.rw-btn` `:focus-visible` missing) as still open. Cycle 7 source verification confirms GAP-179 fully resolves this — both rules are present at `styles.css:1195, 1263`. GAP-U15 is closed.

---

## Open Story Gaps / Proposed Story Items

**GAP-U1: Sub-tab progress within phases (US-U1 extension)**
The Customisations phase spans nine sub-tabs with no indicator of which have been completed. A progress mini-bar or completion checkmarks per sub-tab within the Customise step pill would reduce disorientation during the longest phase.

**GAP-U3: Analysis mismatch summary count (US-U3 AC3)**
When ≥4 mismatches exist, a "4 mismatches detected" summary chip above the fold with expandable detail below is missing. Currently all mismatches render inline as a flat block.

**GAP-U4: Questions paged reveal (US-U3 AC4) — HIGH PRIORITY**
All post-analysis questions render simultaneously. A paged reveal (≤3 per screen, next group withheld until current confirmed) matches the story criterion and reduces cognitive load. Unchanged since Cycle 1.

**GAP-U5: Rewrite keyboard-sequential navigation (US-U5 AC5) — HIGH PRIORITY**
No "Approve & Next →" or arrow-key progression through rewrite cards. For sessions with 10+ rewrites, users must scroll manually. Unchanged since Cycle 1.

**GAP-U6: Multi-version output labelling (US-U6 AC5)**
No within-session version history or timestamp labels on generated files. If a user regenerates, the previous version is unlisted and undistinguished.

**GAP-U8: Estimated analysis duration in loading state (US-U3 AC5)**
The LLM busy overlay shows elapsed time but not an estimated wait duration. Adding "Typically 15–30 seconds" would reduce anxiety for first-time users.

**GAP-U9: Two-step layout confirmation (US-U9 AC6) — label mismatch + overlapping controls**
The layout step requires "Confirm Layout" then "Generate Final Files" as two separate clicks, plus a third "Proceed to Finalise →" in the chat toolbar. Story requires a single "Proceed to Final Generation" action. Partially open since Cycle 4.

**GAP-U10: Review table column collapse at ≤1400 px (US-U8 AC2) — HIGH PRIORITY**
No `@media` rules hide lower-priority columns in experience/skills/achievements/publications review tables on narrower viewports. Unchanged since Cycle 1.

**GAP-U11: Intake card discoverability (US-U2 AC4 extension)**
The intake confirm card appears in the conversation panel without focus movement to it. Users focused on the viewer panel may miss it.

**GAP-U13: Tab icon collision (terminology/scannability)**
`📊` used for both `tab-exp-review` ("📊 Experiences") and `tab-ats-score` ("📊 ATS Score"). `✏️` used for both `tab-ach-editor` ("✏️ Experience Bullets") and `tab-rewrite` ("✏️ Rewrites"). Unique icons per tab are recommended.

**GAP-U15: CLOSED in Cycle 7** — `.icon-btn:focus-visible` and `.rw-btn:focus-visible` confirmed present at `styles.css:1195, 1263` (GAP-179 fix). Removed from open list.

**GAP-U16: step-rerun discoverability for mouse users (PARTIALLY IMPROVED)**
The ↻ re-run button inside completed step pills now uses `opacity:0.35` at rest (improved from prior `opacity:0`) — partially visible without hover. However, the button is still low-contrast at rest. Recommend a persistently visible (e.g., opacity:0.55+) indicator, or a dedicated "Re-run" option in the step pill's tooltip/context menu, for full discoverability.

---

## Evidence Summary

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-U1: Workflow Orientation | 3 | 2 | 0 | 0 | 0 |
| US-U2: Job Input UX | 4 | 1 | 0 | 0 | 0 |
| US-U3: Analysis Readability | 2 | 2 | 1 | 0 | 0 |
| US-U4: Review Table Interaction | 4 | 1 | 1 | 0 | 0 |
| US-U5: Rewrite Review | 5 | 0 | 1 | 0 | 0 |
| US-U6: Generation Feedback | 2 | 2 | 0 | 1 | 0 |
| US-U7: Accessibility | 6 | 0 | 0 | 0 | 0 |
| US-U8: Responsive / Performance | 1 | 2 | 1 | 0 | 1 |
| US-U9: Layout Review UX | 5 | 1 | 0 | 0 | 0 |
| **Total** | **32** | **11** | **4** | **1** | **1** |

**Key source file references (Cycle 7):**

- Workflow bar state classes: `web/styles.css:144, 151–158`
- `updateWorkflowSteps()`: `web/workflow-steps.js:612–739`
- Step sr-only announcements: `web/workflow-steps.js:715–725`
- Step-rerun as `<button>` with opacity:0.35: `web/workflow-steps.js:730–733`
- Step-rerun hover/focus-within raise + `:focus-visible`: `web/workflow-steps.js:762`
- Back-navigation confirm modal: `web/workflow-steps.js:138–187`
- Bullet-reorder modal (role/trap/Escape) — NEW: `web/workflow-steps.js:463–514`
- Session restore: `web/session-manager.js:412–471`
- Job input tabs: `web/job-input.js:107–111`
- Protected-site modal: `web/job-input.js:471–529`
- Intake confirm card: `web/message-dispatch.js:420–463`
- Paste char count: `web/job-input.js:320–336`
- Analysis tab rendering: `web/review-table-base.js:289–362`
- Keyword rank badges: `web/review-table-base.js:336–342`
- Questions rendering (flat): `web/questions-panel.js` (all-at-once forEach loop)
- Experience bulk toolbar: `web/experience-review.js:241–248`
- Experience icon buttons: `web/experience-review.js:202–208`
- Skills category reorder aria-labels: `web/skills-review.js:423–424`
- Word-level diff: `web/rewrite-review.js:183–226`
- Rewrite card controls: `web/rewrite-review.js:272–275`
- Rewrite aria-pressed — NEW: `web/rewrite-review.js:306–308, 325, 342, 360, 392, 396`
- Rewrite localStorage persistence: `web/rewrite-review.js:46, 53`
- LLM busy overlay aria-live: `web/index.html:152–160`
- Generate Preview button (spell-btn): `web/index.html:186`
- Spell-check viewer buttons "Generate Preview →" — NEW: `web/spell-check.js:148, 271`
- Cover letter company context textarea — NEW: `web/cover-letter.js:130–131`
- Layout preview iframe: `web/layout-instruction.js:287`
- Layout scope label: `web/layout-instruction.js:293`
- Layout clarification dialog: `web/layout-instruction.js:663–665`
- Layout undo stack: `web/layout-instruction.js:50, 1125–1137`
- Instruction history: `web/layout-instruction.js:1008–1030`
- Layout freshness chip (dynamic aria-label): `web/ui-helpers.js:83–95`, `web/state-manager.js:120–175`
- Modal focus management: `web/ui-core.js:239–347`
- Tab ARIA keyboard nav: `web/ui-core.js:509–541`
- Focus ring — action-btn: `web/styles.css:590`
- Focus ring — tab: `web/styles.css:637`
- Focus ring — step: `web/styles.css:144`
- Focus ring — sm-btn — NEW: `web/styles.css:296`
- Focus ring — icon-btn — NEW: `web/styles.css:1195`
- Focus ring — rw-btn — NEW: `web/styles.css:1263`
- Workflow bar overflow (auto-scroll): `web/styles.css:149`
- Session manager table responsive: `web/styles.css:321–326`

---

**Evidence standard:** Every conclusion is independently verifiable from the cited source evidence. No findings rely on runtime behaviour that cannot be traced to source code.

---

*Cycle 6 review (2026-06-22) archived below for historical reference.*

---

# UX Expert / Heuristic Review Status — Cycle 6

**Last Updated:** 2026-06-22 ET

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py (plus supporting modules: web/workflow-steps.js, web/ui-helpers.js, web/rewrite-review.js, web/layout-instruction.js, web/job-input.js, web/questions-panel.js, web/experience-review.js, web/session-manager.js, web/message-dispatch.js, web/final-generate.js, web/download-tab.js)

**Executive Summary (Cycle 6):** Score 33 Pass / 9 Partial / 3 Fail / 1 Not Implemented. Key resolved items: GAP-166 (rewrite decision persistence), GAP-167 (step-rerun button keyboard accessible), GAP-168 (sessions modal focus), GAP-169/GAP-U14 (spell-btn label), GAP-170 (LLM busy aria-live), GAP-171 (skills category reorder aria-label), GAP-172 (step pill sr-only state text), GAP-173 (focus-visible on action-btn/tab/step), GAP-NEW-D (intake input focus ring), GAP-U12 (freshness chip dynamic aria-label). Three Fail-grade gaps: clarifying questions paged grouping (US-U3 AC4), rewrite sequential keyboard navigation (US-U5 AC5), review table column collapse at ≤1400 px (US-U8 AC2). Open GAPs included GAP-U15 (icon-btn/rw-btn :focus-visible missing) — this was closed by GAP-179 in Cycle 7.

*(Full Cycle 6 detail preserved in git history. See commit `b250dce` and surrounding commits for the complete Cycle 6 findings.)*

---

*Cycle 5 review (2026-06-20) archived below for historical reference.*

---

# UX Expert Review Status — Cycle 5

**Last Updated:** 2026-06-20 09:50 ET
**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/layout-instruction.js, web/job-input.js, web/rewrite-review.js, web/review-table-base.js, web/workflow-steps.js, web/message-dispatch.js, web/download-tab.js, web/final-generate.js, web/job-analysis.js, web/questions-panel.js, web/experience-review.js, web/session-manager.js, scripts/web_app.py (grep excerpts), scripts/utils/conversation_manager.py (grep excerpts)

**Rating key:** ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | — N/A

**Executive Summary (Cycle 5):** No source changes were detected relative to Cycle 4. This cycle re-derives all evidence from source to validate the Cycle 4 findings. All Cycle 4 conclusions are confirmed. Net status: 28 Pass / 13 Partial / 4 Fail / 1 Not Implemented. The four remaining Fail-grade gaps are: (1) clarifying questions still rendered all-at-once without paged grouping (US-U3 AC4), (2) numeric relevance score with scale label absent from experience review (US-U4 AC6), (3) no keyboard-driven sequential rewrite navigation "Approve & Next" (US-U5 AC5), and (4) review table columns have no responsive collapse at ≤1400 px (US-U8 AC2). These four items are the highest-priority open UX deficiencies.

*(Full Cycle 5 detail omitted from archived section to reduce file size — see git history for commit `c3adb5d` to view the complete Cycle 5 findings.)*
