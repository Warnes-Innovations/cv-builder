<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# UX Expert Review Status

**Last Updated:** 2026-07-06 (Cycle 92 source-first update)

**Executive Summary:** The application has a solid structural foundation — the workflow step bar with three-way visual state, inline word-level rewrite diffs, comprehensive focus-trap management, and job-input panel with named protected-site guidance are all well-executed. However, several interaction-quality gaps remain: session restoration lacks an orientation card (job/stage/last-active timestamp), clarifying questions are presented as a single wall rather than paginated groups, the inline preview before download is HTML-only (no PDF), and the layout-review proceed flow uses two sequential button labels ("Confirm Layout" then "Generate Final Files") rather than a single unambiguous action.

**Top 3 Findings (Source-First, Cycle 92):**

1. **US-U9 single-proceed action (HIGH):** The layout phase exposes four sequentially-labeled primary buttons ("Generate Preview →", "🎨 Open Layout Review →", "✅ Confirm Layout", "📥 Continue to File Review →") with no sub-step indicator in the workflow nav — all map to "Layout Review." Source: `app.js:194–197`, `index.html:134`.
2. **US-U2 extracted-field confirmation (HIGH):** All three job-input paths submit directly to `analyzeJob()` with no confirmation step. If the LLM misparses company, role, or date, the only recovery is restarting the full job analysis. Source: `job-input.js:307, 385, 495`.
3. **Terminology: "LLM" header is implementation-centric (MEDIUM):** The header pill reads "LLM: [provider]·[model]" and the status badge uses states "unconfigured", "rate-limited", "auth-required" — vocabulary that suits AI practitioners, not typical job-seekers. The "⚠ Non-confidential" badge is also ambiguous. Source: `index.html:53–60`, `ui-core.js:776–810`.

---

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Step indicator — named stages, active unambiguous | ✅ Pass | `web/index.html:122-148` — 12-step `<nav class="workflow">` with emoji + text labels (Job Input, Analysis, Customise, Rewrites, Spell Check, Layout Review, File Review, Cover Letter, Screening, Interview Prep, Thank You, Harvest). CSS `.step.active` = blue, `.step.completed` = green, `.step.upcoming` = slate-grey (styles.css:266-270). `.step.stale` / `.step.stale-critical` amber/red for downstream staleness (styles.css:271-272). `.step.viewing` ring and `.step.browsing-away` pulse distinguish current-view from app-position (styles.css:277-286). |
| Completed state visually distinct from active and upcoming | ✅ Pass | Three-way CSS distinction: `.step.active` (blue bg + text), `.step.completed` (green bg + text), `.step.upcoming` (light bg + muted text). `workflow-steps.js:930` drives class assignment from `updateWorkflowSteps(status)`, called on every `fetchStatus()` response. |
| Back-navigation safety — no silent content discard | ⚠️ Partial | `backToPhase()` (`workflow-steps.js:98`) POSTs to backend and shows a confirmation dialog when downstream completed steps exist (workflow-steps.js:1169-1206). However, navigating directly to an earlier tab via the workflow bar without triggering `backToPhase()` does not always surface a destructive-action guard — `handleStepClick` forwards to `switchTab` without a guard for all paths. |
| Session restoration context — job, stage, last-active timestamp | ⚠️ Partial | `restoreSession()` (`session-manager.js:518`) restores conversation history, phase, and position bar (title + company). A system message "🔄 Session restored from server." is appended to the conversation. However: (a) the position bar shows no last-active timestamp; (b) there is no dedicated above-fold orientation card showing "Job X · Stage Y · last saved Z". Users returning after a long break must scroll conversation history to reconstruct context. |
| Stage indicator updates without page reload | ✅ Pass | `api-client.js:217-219` — `updateWorkflowSteps(status)` is called inside every `fetchStatus()` response which runs on a timer and after every action. ARIA live region `#workflow-stage-announcer` announces stage changes to screen readers (index.html:150-151). |

**US-U1 Summary:** ✅ 3 · ⚠️ 2 · ❌ 0 · 🔲 0

---

### US-U2: Job Input and URL Ingestion UX

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Input mode clarity — URL vs paste clearly separated | ✅ Pass | `job-input.js:107-111` — three `.input-tab` buttons (📝 Paste Text, 🔗 From URL, 📁 Upload File) with `.active` class toggle; only one panel visible at a time. |
| Protected-site guidance — contextual, specific, named | ✅ Pass | `job-input.js:141-149` — two-panel grid: "✅ Works well with" (public career pages) and "⚠️ Copy manually from" listing LinkedIn, Indeed, Glassdoor by name with per-site reason. Shown inline in the URL input panel before any error. `data.protected_site` fetch response also triggers a named-site inline error (job-input.js:473-486). |
| Fetch feedback — spinner within 300 ms | ⚠️ Partial | `fetchJobFromURL()` (`job-input.js:427-502`) calls `_showURLLoading()` before the `fetch()` call — setting the button label to "Fetching…" and disabling it. However, no distinct spinner element is inserted into the URL panel before the request; the button text change is the only immediate indicator. This may not satisfy the "spinner or progress bar within 300 ms" criterion on slow connections. |
| Confirmation editability — extracted fields editable before analysis | ❌ Fail | All three input paths (paste, URL, file) call `analyzeJob()` directly without an intermediate confirmation/edit step (`job-input.js:307, 385, 495`). Extracted fields (company, role, date) cannot be corrected before analysis runs. If the LLM misparses company or role, the user cannot fix it without restarting the full job analysis step. |
| Character-count guidance for paste | ✅ Pass | `job-input.js:322-338` — `_updatePasteCharCount()` fires on every `oninput` event, shows `n / 200 minimum` with colour coding: grey at 0, red below, green above. Explicit guidance text included. |

**US-U2 Summary:** ✅ 3 · ⚠️ 1 · ❌ 1 · 🔲 0

---

### US-U3: Analysis Results Readability

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Chunking — ≥4 distinct sections | ✅ Pass | `review-table-base.js:388-495` — `populateAnalysisTab()` renders: role card (company, role, meta chips), Required Skills, Preferred/Nice-to-Have, ATS Keywords, Culture Indicators, Must-Have Requirements — six distinct `.analysis-section` panels (styles.css:599-610). |
| Keyword visualisation — visual rank signal | ✅ Pass | `review-table-base.js:466-476` — keywords rendered as `.kw-badge` elements with an absolute-positioned `.kw-rank` label showing the rank number (styles.css:608-609). Not a flat comma list. |
| Mismatch prominence — above fold, amber/red callout | ✅ Pass | `review-table-base.js:435` — `.mismatch-callout` rendered *before* the Required Skills section, placing it first in the layout. Amber border-left, amber background (styles.css:610-611). |
| Clarifying question flow — groups of ≤3, button/dropdown answers | ⚠️ Partial | `questions-panel.js:148` renders all questions in a single scrolling list; no pagination or ≤3-per-screen grouping. Answer options use chip buttons (`.q-chip`) — meeting the button affordance — but the single-list presentation can produce a wall of questions. A `q-progress` "X of Y" counter exists but does not gate display. |
| Analysis duration feedback — informative label, not just spinner | ✅ Pass | LLM busy overlay (index.html:160-168) shows: animated spinner, `#llm-busy-label` (aria-live, e.g. "Reasoning…"), `#llm-busy-elapsed` elapsed-time counter, and a "Taking longer than usual" badge after a threshold. Labels update at key LLM steps. |

**US-U3 Summary:** ✅ 4 · ⚠️ 1 · ❌ 0 · 🔲 0

---

### US-U4: Review Table Interaction Quality

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Toggle affordance clarity — visually obvious, unambiguous state | ✅ Pass | Accept/reject state is communicated at the card level: `.rewrite-card.accepted` (green border/bg) and `.rewrite-card.rejected` (red border/bg, 0.7 opacity) (styles.css:1411-1412). Confidence badges use text labels ("High", "Medium", "Low") plus colour class. Bulk action buttons use emphatic colours (`.bulk-emphasize`, `.bulk-include`, `.bulk-exclude`) (styles.css:1516-1521). |
| Drag/reorder usability — discoverable without hover, keyboard-accessible | ⚠️ Partial | Bullet reorder is modal-based (`showBulletReorder()`); experience row reorder uses a modal with up/down controls. Controls are keyboard-accessible inside the modal via `trapFocus()`. Drag-and-drop is not present. Discoverability of the reorder modal entry point from the table row requires user awareness of the trigger button. |
| Row density — enough content without illegibility | ✅ Pass | Experience review shows role title, company, date range, confidence badge with tooltip, and bullet preview in DataTables rows. Skills review shows category, skill name, and confidence. |
| Bulk actions — available when row count > 8 | ✅ Pass | `.bulk-btn` row with include/exclude/recommend/undo actions rendered in table headers (styles.css:1512-1525). Accept-all and reject-all in rewrite panel (`rw-bulk-btn`). Single-level bulk undo implemented (cycle 81). |
| Inline expansion — no navigation away, scroll position preserved | ⚠️ Partial | Bullet editing opens the "Experience Bullets" tab (`tab-ach-editor`) — a tab switch, not in-place expansion. Switching tabs resets scroll position on the Experiences tab. Returning to the Experiences tab reloads its state. This partially contradicts the "no page navigation" acceptance criterion. |
| Relevance score meaning — labelled with scale | ⚠️ Partial | Confidence badges have tooltip `title` attributes with descriptive text (experience-review.js:223). `CONFIDENCE_COLUMN_LEGEND` import (experience-review.js:27) provides a column-header legend for the experience table. However, publications relevance scores (`pub.relevance_score`) display as raw values with no scale label (publications-review.js:149). |

**US-U4 Summary:** ✅ 3 · ⚠️ 3 · ❌ 0 · 🔲 0

---

### US-U5: Rewrite Review Presentation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Inline diff — red strikethrough removals, green additions | ✅ Pass | `del.diff-removed` = red text, line-through, red bg (styles.css:1424). `ins.diff-added` = green text, green bg (styles.css:1425). Applied inside `.rewrite-inline-diff` in `renderRewriteCard()` (rewrite-review.js:427). Word-level diff computed server-side; rendered as inline `<del>`/`<ins>` elements. |
| Accept/Reject/Edit controls collocated with diff | ✅ Pass | `renderRewriteCard()` (rewrite-review.js:395) — action buttons rendered inside `.rewrite-card-body` directly after the diff view. No separate panel required. |
| Reason visibility — within one click/hover | ✅ Pass | `details.rewrite-rationale` — expandable `<details>` element per card showing LLM rationale. One click to open; visible in normal mode, hidden in compact mode (styles.css:1466). |
| Edit path — free-text editing, original preserved | ✅ Pass | `.rewrite-after textarea` (styles.css:1427) — edit mode shows a textarea with the proposed text; the original diff view remains above it. Edit does not destroy the diff view. |
| Batch review efficiency — "Approve & Next" or sequential keyboard navigation | ⚠️ Partial | Bulk accept/reject buttons exist (`.rw-bulk-btn`). Compact mode (`toggleRewriteCompactMode`) collapses cards for faster overview. Keyboard shortcut infrastructure exists (`keyboard-shortcuts.js:246`), and cards receive `.kb-focused` class (styles.css:1413). However, no explicit "Approve & Next" sequential flow that advances to the next undecided card after accepting is found. Users must scroll manually or use bulk accept. |

**US-U5 Summary:** ✅ 4 · ⚠️ 1 · ❌ 0 · 🔲 0

---

### US-U6: Generation and Output State Feedback

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Generation progress — step-labelled checklist, each step shows completion | ✅ Pass | `layout-instruction.js:387-392` — `<ol class="cv-gen-step-list">` with three steps (Rendering HTML → Generating PDF → Building DOCX files). `_showGenStepProgress(activeIdx)` applies `.is-complete` / `.is-active` / `.is-pending` classes (layout-instruction.js:1191-1210). |
| Output preview — previewable in-browser before download | ⚠️ Partial | HTML preview rendered in an `<iframe>` (`final-generate.js:88-96`). This is an **HTML surrogate only** — the PDF is not previewable in-browser; it must be downloaded. The acceptance criterion requires the generated CV rendered inline. The HTML surrogate does not confirm PDF rendering accuracy (WeasyPrint/headless Chrome differences are meaningful for layout). |
| Download options — PDF, HTML, copy-to-clipboard | ✅ Pass | `final-generate.js` and `download-tab.js` list all generated files: Human PDF, ATS PDF, Human DOCX, ATS DOCX, HTML — each with icon, description, and download link. |
| Error recovery — user-readable message + fallback action | ⚠️ Partial | `layout-instruction.js:1417` — on generation failure: "❌ Could not generate final files. Try clicking Generate again. If layout confirmation is needed first, click Confirm Layout, then try again." Actionable but generic — no explicit "Download HTML instead" fallback for a PDF-specific failure mode. |
| Output filename — applicant + role + date convention | ✅ Pass | `cv_orchestrator.py:1452` — `f"CV_{company}_{role}_{timestamp}"`. ATS DOCX suffix `_ATS.docx` (cv_orchestrator.py:3998). Matches `CV_{Company}_{Role}_{Date}` acceptance criterion. |
| Version label — current version unambiguous when multiple exist | ⚠️ Partial | Files are listed by filename which includes a timestamp, so the most recent is distinguishable by filename. However, there is no UI-level "Current" badge or "most recent" indicator in the download or final-generate tab. Users must parse the timestamp in the filename. |

**US-U6 Summary:** ✅ 3 · ⚠️ 3 · ❌ 0 · 🔲 0

---

### US-U7: Accessibility and Keyboard Navigation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Focus management — modal open → first element; close → opener | ✅ Pass | `ui-core.js:28-346` — `_focusStack[]`, `setInitialFocus()`, `trapFocus()`, `restoreFocus()` fully implemented. `openModal()` pushes `document.activeElement` to stack, calls `setInitialFocus()` and `trapFocus()` (ui-core.js:660-675). `closeModal()` calls `restoreFocus()` (ui-core.js:681-694). `confirmDialog()` has its own inner focus-trap (ui-core.js:414-426). |
| Focus visibility — visible focus ring, no bare `outline: none` | ✅ Pass | No global `outline: none` found. Focus styles defined for: `.step:focus-visible`, `.tab:focus-visible`, `.action-btn:focus-visible`, `.toggle-chat:focus-visible`, `.sm-btn:focus-visible`, `.q-chip:focus-visible`, `.rw-btn:focus-visible`, `.message-input:focus`, `.q-input:focus`, `.layout-instruction-textarea:focus` — all use `outline: 2px solid var(--cv-accent)`. High-contrast media query strengthens to `outline: 3px solid var(--cv-black)` (styles.css:1855). |
| Table keyboard navigation — toggles operable by keyboard | ✅ Pass | `ui-core.js:462-490` — tab elements: Enter/Space activate, ArrowLeft/Right/Home/End navigate and activate (WCAG 2.1 tablist pattern). Workflow steps: Enter/Space via `_makeStepClickable()` keydown handler (ui-core.js:1890-1897). Review table action buttons are standard `<button>` elements, keyboard-operable by default. |
| ARIA labels — icon-only buttons labelled | ⚠️ Partial | Many buttons have `aria-label`: `#toggle-chat` (index.html:157), all modal close buttons, `#rename-session-btn`, `#ats-score-badge`, `#layout-freshness-chip`, tab scroll buttons. However, some inline action buttons within dynamically-rendered review table rows (e.g., up/down reorder arrows, eye-slash hide toggles from `eyeSlashIcon` in experience-review.js:25) may not consistently carry `aria-label` across all rendered states. Full coverage cannot be confirmed via static analysis alone. |
| Colour-independence — status by text + colour, not colour alone | ⚠️ Partial | Confidence badges combine text label ("High", "Medium", "Low") + colour class — pass. Rewrite card accepted/rejected state combines colour + the action button state — pass. However, `.ats-score-badge.score-high/medium/low` changes the numeric value colour only; no secondary text tier label (e.g., "✓ Strong / ⚠ Moderate / ✗ Low") is added (styles.css:217-219). Colour-blind users cannot distinguish ATS tier from the badge alone. |
| Error messages — `aria-describedby` association | ⚠️ Partial | Job input fields: `#job-text-input aria-describedby="paste-char-count paste-error"` (job-input.js:116) and `#job-url-input aria-describedby="url-error"` (job-input.js:132) — correct. Settings modal inputs do not use `aria-describedby` for validation feedback. LLM auth status uses `role="alert"` (index.html:493). Toast container uses `aria-live="polite"` (index.html:288). Inconsistent coverage across the full form surface. |

**US-U7 Summary:** ✅ 3 · ⚠️ 3 · ❌ 0 · 🔲 0

---

### US-U9: HTML Layout Review Interaction Quality

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Instruction field clarity — scope label + placeholder with example | ✅ Pass | `layout-instruction.js:308` — `<p class="layout-scope-label">💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here.</p>`. Textarea placeholder (layout-instruction.js:369) provides three example instructions. |
| Processing feedback — indicator within 300 ms, preview updates | ✅ Pass | `#processing-indicator` with spinner + label shown immediately on submit before fetch completes. `#confirmation-message` shown after instruction applied (layout-instruction.js:394). Preview iframe updated with response HTML. |
| Change attribution — confirmation of what was changed | ✅ Pass | `showConfirmationMessage()` called after each applied instruction. Layout confirm shows "✅ Layout confirmed. Generate final files when you are ready." (layout-instruction.js:1341). |
| Clarification handling — ambiguous instructions surface inline prompt | 🔲 Not Implemented | No code path found for the LLM returning a `clarification_needed` response type. The frontend handles `applied` and error states only (layout-instruction.js throughout). Ambiguous instructions are silently applied at best-guess or return a generic error. |
| Instruction history — visible log with individual Undo | ✅ Pass | `layout-instruction.js:1089-1125` — `#instruction-history` list with `<button onclick="undoInstruction(${index})">↩ Undo</button>` per entry. Undo is sequential (only most-recent enabled, with explanatory disabled-button title). |
| Single proceed action — unambiguous regardless of whether changes made | ⚠️ Partial | Two sequential buttons exist: "Confirm Layout" (`#layout-btn` in action row, index.html:196) then "Generate Final Files" (`#proceed-to-finalise-btn` in layout panel, layout-instruction.js:404). This two-step flow (confirm → then generate) adds friction for users who skip layout instructions. The acceptance criterion calls for a single "Proceed to Final Generation" label that works in both cases. |
| Content safety assurance — label that text cannot be changed | ✅ Pass | `layout-scope-label` text: "Text content is finalised — content edits are not applied here." Visible at top of the instruction panel (layout-instruction.js:308, styles.css:1594). |

**US-U9 Summary:** ✅ 5 · ⚠️ 1 · ❌ 0 · 🔲 1

---

### US-U8: Responsive Behaviour and Loading Performance

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Minimum viable layout — 1280 × 800 no horizontal page scroll | ⚠️ Partial | `.workflow-steps` uses `overflow-x: auto` (styles.css:264) so the 12-step bar scrolls horizontally within its container. `.main-container` uses `height: calc(100vh - 210px)` (styles.css:450). Position bar uses `flex-wrap: wrap` at `@media (max-width:900px)`. Tab bar uses scroll-arrow buttons for overflow. No codified 1280-wide breakpoint test; behaviour at exactly 1280 × 800 is not explicitly verified in the source. |
| Column collapsing in review tables at ≤1400 px | 🔲 Not Implemented | No CSS `@media` rules targeting review table column visibility at ≤1400 px breakpoints found. DataTables columns are not configured with responsive breakpoints in the reviewed JS files. |
| Initial page load ≤2 s locally | — N/A | Requires runtime measurement. Four external CDN scripts load (Bootstrap, DataTables, FontAwesome, marked) plus `styles.css` and `bundle.js`. CDN resources introduce latency risk on slow connections. |
| No layout shift during async loads | ⚠️ Partial | Loading spinners shown in content areas (`.empty-state` with spinner) before data loads. Spinner containers do not reserve minimum height matching expected content, so content arrival causes visible layout shift. No skeleton screens with dimension-preserving placeholders. |
| Long table scroll performance | — N/A | Cannot be determined from static analysis. DataTables virtual windowing not confirmed as configured. |

**US-U8 Summary:** ⚠️ 2 · 🔲 1 · — N/A 2

---

## Generated Materials Evaluation

| Aspect | Status | Evidence |
|--------|--------|----------|
| Filename convention (`CV_{Company}_{Role}_{Date}`) | ✅ Pass | `cv_orchestrator.py:1452, 3998, 4752` — consistent `CV_{company}_{role}_{timestamp}` with `_ATS` suffix for ATS files. |
| ATS score with interpretable scale label | ⚠️ Partial | ATS score badge shows numeric value + "ATS" label + tooltip (index.html:92). Colour-coded by class (score-high/medium/low, styles.css:217-219) but no secondary text tier label (e.g., "Strong / Moderate / Low") — colour-only for tier interpretation. |
| Rewrite inline diff clarity | ✅ Pass | Word-level `<del>` / `<ins>` diff rendered for all rewrite proposals. Red strikethrough and green highlight are semantically tagged, not just visual. |
| Content protection through layout instructions | ✅ Pass | Scope label explicitly states text is finalised. Layout step cannot alter approved rewrite text per implementation. |

---

## Terminology and Copy Audit

Flagged user-facing copy issues found during source-first review. All items grounded in `index.html` and `ui-core.js` source.

| Location | Current label | Issue | Severity |
| --- | --- | --- | --- |
| Header pill | `LLM: [provider] · [model]` | Implementation-centric acronym. Typical job-seekers do not know what "LLM" means. Suggest "AI Model:" or "AI:". | Medium |
| Header pill | `⚠ Non-confidential` | Ambiguous — users cannot tell whether their CV data is stored, shared, or processed. Suggest "Cloud AI (data shared)" or "Data leaves device". Source: `index.html:59`. | Medium |
| LLM status badge states | `unconfigured`, `rate-limited`, `auth-required` | Mix of technical and user-friendly vocabulary. `rate-limited` → "Too many requests — wait". `auth-required` → "Sign in required". `unconfigured` → "Not set up". Source: `ui-core.js:787–790`. | Low |
| Action button | `📦 Archive Application` | "Archive" implies permanent storage or inactivation. Users may fear it deletes work. Renamed from "Package Application Files" (app.js:159) — the rename moved in the wrong direction. Suggest "Save & Archive" with descriptive tooltip. Source: `app.js:159–161`. | Low |
| Action button | `✅ Confirm Layout` | Sounds like confirming a preference, not triggering final file generation. Mismatches user expectation of "what happens next." Source: `index.html:196`. | Medium |
| Workflow step | "Spell Check" | Noun phrase; all other steps are verb phrases (Analyse, Customise, Rewrites) or gerunds. Also: the primary action button in this step reads "Generate Preview →" — entirely different from "Spell Check". The step label and the action are mismatched. Source: `index.html:132`, `app.js:194`. | Medium |
| Workflow step | "Customise" | British spelling while `analyzeJob()` and `analyze-btn` use American spelling. Choose one locale consistently. Source: `index.html:129`, `app.js:124`. | Low |
| Tab labels | "📄 Generated Files" + "⬇️ File Review" | Two adjacent tabs in the download stage with overlapping scope. Users cannot distinguish their purposes without clicking both. Source: `index.html:225–226`. | Medium |
| Step label | "Rewrites" | Plural noun; mismatches "Rewrite Review" phase name used in backend and conversation manager. Slight inconsistency in vocabulary across UI vs. system. | Low |
| Settings section | "LLM Retry Policy (Browser)" | Highly technical. Suggest "Auto-Retry Settings". Source: `index.html:661`. | Low |
| Onboarding | `Master_CV_Data.json` | A code filename in the onboarding wizard visible to all users. Non-technical users may be alarmed. The file path is shown verbatim in the wizard. Source: `index.html:337`. | Low |

---

## Additional Story Gaps / Proposed Story Items

1. **GAP-UX-NEW-01: Session orientation card on restore** — US-U1.4 requires "which job, which stage, and when it was last active." Currently `restoreSession()` appends a system message in the conversation. Proposed: add an above-fold session-context card at restore time showing job title, company, current phase display name, and last-saved timestamp. Evidence: `session-manager.js:518-583`, `index.html:41-42`.

2. **GAP-UX-NEW-02: Extracted-field confirmation before analysis** — US-U2.4 requires inline editability of company name, role title, and date before analysis runs. All submission paths route directly to `analyzeJob()` with no confirmation step (`job-input.js:307, 385, 495`). If the LLM misparses the company or role, there is no recovery short of restarting job analysis.

3. **GAP-UX-NEW-03: Clarifying questions pagination** — US-U3.4 requires ≤3 questions per screen/step. `questions-panel.js` renders all questions in a single list. At 5+ questions this creates a wall of form fields. Proposed: paginate into groups of ≤3 with per-group answer confirmation before advancing.

4. **GAP-UX-NEW-04: Inline PDF preview** — US-U6.2 requires the generated CV to be previewable in-browser before downloading. Only an HTML surrogate iframe is shown (`final-generate.js:75-98`). Embedding the PDF via PDF.js or `<object>` with fallback would close this gap, or surfacing a note clarifying that the HTML is a layout surrogate.

5. **GAP-UX-NEW-05: Layout review single-proceed-action** — US-U9.6 requires one unambiguous "Proceed to Final Generation" button regardless of whether layout changes were applied. Currently two sequential buttons: "Confirm Layout" (index.html:196) → "Generate Final Files" (layout-instruction.js:404). Users who skip layout changes still face two button presses. Proposed: merge into a single `Proceed to Final Generation` button that combines confirmation + generation.

6. **GAP-UX-NEW-06: Clarification prompt for ambiguous layout instructions** — US-U9.4 requires an inline clarifying question rather than silent best-guess application. No `clarification_needed` response type is handled in `layout-instruction.js`. Requires both backend and frontend changes.

7. **GAP-UX-NEW-07: Review table responsive column collapse** — US-U8.2 requires lower-priority columns to hide at ≤1400 px. No responsive DataTables column configuration or CSS `@media` column-hide rules are present. At 1280 px, tables risk horizontal overflow within their containers.

8. **GAP-UX-NEW-08: ATS score tier text label** — US-U7.5 colour-independence: `.ats-score-badge.score-high/medium/low` changes value colour only. Adding a text tier label ("Strong", "Moderate", "Low") alongside the numeric value removes colour-only dependency for ATS tier interpretation.

9. **GAP-UX-NEW-09: "Approve & Next" sequential rewrite navigation** — US-U5.5 requires keyboard-driven progression when >3 rewrites exist. The `.kb-focused` class infrastructure is present (`keyboard-shortcuts.js:246`) but no sequential "Approve & Next" shortcut is implemented.

10. **Terminology: "File Review" tab overlap** — The workflow step is labelled "File Review" (index.html:136) and there is also a "Generated Files" tab (`tab-final_generate`). Two download-adjacent tabs with overlapping purposes add cognitive overhead. Consider merging or renaming to clarify that "Generated Files" is an intermediate review and "File Review" is the final download/validation step.

---

**Reviewed against:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`
**Additional sources referenced:** `web/job-input.js`, `web/rewrite-review.js`, `web/layout-instruction.js`, `web/workflow-steps.js`, `web/final-generate.js`, `web/download-tab.js`, `web/experience-review.js`, `web/questions-panel.js`, `web/session-manager.js`, `scripts/utils/cv_orchestrator.py`

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-U1 | 3 | 2 | 0 | 0 | 0 |
| US-U2 | 3 | 1 | 1 | 0 | 0 |
| US-U3 | 4 | 1 | 0 | 0 | 0 |
| US-U4 | 3 | 3 | 0 | 0 | 0 |
| US-U5 | 4 | 1 | 0 | 0 | 0 |
| US-U6 | 3 | 3 | 0 | 0 | 0 |
| US-U7 | 3 | 3 | 0 | 0 | 0 |
| US-U9 | 5 | 1 | 0 | 1 | 0 |
| US-U8 | 0 | 2 | 0 | 1 | 2 |
| **Total** | **28** | **17** | **1** | **2** | **2** |

**Key evidence references:**
- Workflow step state management: `web/workflow-steps.js:930`, `web/ui-core.js:1846`
- Focus management: `web/ui-core.js:28-346` (`_focusStack`, `trapFocus`, `restoreFocus`)
- Inline rewrite diff: `web/styles.css:1424-1425` (`del.diff-removed`, `ins.diff-added`); `web/rewrite-review.js:395-427`
- Job input tabs + protected-site guidance: `web/job-input.js:107-149`
- Character count minimum (200): `web/job-input.js:322-338`
- Generation step checklist: `web/layout-instruction.js:387-392, 1191-1210`
- Layout scope label: `web/layout-instruction.js:308`
- Instruction history + undo: `web/layout-instruction.js:1089-1125`
- CV output filename: `scripts/utils/cv_orchestrator.py:1452, 3998, 4752`
- HTML preview iframe (not PDF): `web/final-generate.js:75-98`
- No extracted-field confirmation before analysis: `web/job-input.js:307, 385, 495`
- No clarification handling in layout review: `web/layout-instruction.js` — no `clarification_needed` handler found
