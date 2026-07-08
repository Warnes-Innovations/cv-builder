<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Ux-Expert Review Status

**Last Updated:** 2026-07-07 20:16 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### US-U1: Workflow Orientation and Progress Visibility

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Persistent, meaningful (non-numeric) stage indicator | ✅ Pass | `web/index.html:127-155` — `<nav class="workflow">` with 13 named steps (Job Input, Analysis, Customise, Rewrites, Spell Check, Layout Review, File Review, Cover Letter, Screening, Interview Prep, Thank You, Finalise, Update Master CV). |
| 2 | Completed vs active vs upcoming visually distinct | ⚠ Partial | `web/workflow-steps.js:1016-1027` toggles `.active`/`.completed`/`.upcoming` classes; `web/styles.css:301-306` differentiates them **only by background/text colour** (`--cv-info-bg-md` vs `--cv-success-bg-md` vs `--cv-bg-light`). No shape/icon change for the common case (icons in `STEP_LABELS`, `web/workflow-steps.js:943-957`, are identical regardless of state). This satisfies US-U1's own bar ("greyed-out labels... acceptable") but is colour-only, which will also fail the stricter US-U7 §5 colour-independence criterion — see US-U7 below. |
| 3 | Back-navigation preserves work; destructive action needs confirmation | ✅ Pass | `web/workflow-steps.js:139-180` `_showReRunConfirmModal()` lists every downstream completed stage that will be affected and requires explicit "Proceed"/"Cancel"; `_ALLOWED_TRANSITIONS` table in `scripts/utils/conversation_manager.py:64-75` plus `backToPhase()` (`web/workflow-steps.js:99-129`) explicitly states "Prior decisions and approvals are preserved." |
| 4 | Session restoration shows job/stage/last-active-time | ✅ Pass | `web/session-manager.js:523-588` `restoreSession()` restores phase (`stateManager.setPhase`), conversation history, and decisions; `web/session-actions.js:220-228` renders `#position-session-age` from `session_last_modified`. |
| 5 (failure mode) | Stage indicator updates without page reload | ✅ Pass | `stateManager.onPhaseChange()` listener wired in `web/ui-core.js:1921-1926` calls `updateWorkflowStepsClickable()` on every phase change — no reload. |

### US-U2: Job Input and URL Ingestion UX

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | URL vs paste as clear, equal-weight tabs | ✅ Pass | `web/job-input.js:143-147` — three equal `.input-tab` buttons (Paste/URL/File), one active panel at a time (`switchInputMethod`, line 228). |
| 2 | Protected-site guidance is contextual & specific | ✅ Pass | Static hint in the URL panel names LinkedIn/Indeed/Glassdoor specifically (`web/job-input.js:181-184`); on actual fetch failure, `showProtectedSiteModal(data.site_name, data.message, data.instructions)` (`web/job-input.js:511-519`) surfaces a dedicated modal with the specific site name and numbered recovery steps — not a generic error. |
| 3 | Fetch shows loading feedback within 300 ms | ✅ Pass | `fetchJobFromURL()` calls `setLoading(true, 'Fetching job from URL…')` synchronously (`web/job-input.js:495`) before the `fetch()` call; `setLoading()` (`web/fetch-utils.js:205-232`) immediately creates a progress bar / busy overlay — no async gap. |
| 4 | Extracted fields (company, role, date) inline-editable at confirmation | ⚠ Partial | `web/job-input.js:71-84` intake-confirm card only exposes a single **Position Title** input (`#intake-position-name`); there is no separate company-name or date field to correct — if the LLM-inferred "Title at Company" string is malformed, the user can only edit the combined title text, not company/date independently. Editing does not restart the workflow (`_analyzeJobWithConfirm()`, line 105), which is good. |
| 5 | Paste area shows minimum-length guidance | ✅ Pass | `PASTE_MIN_CHARS = 200` with live character counter and colour-coded feedback, shown immediately on render (`web/job-input.js:220-221, 360-377`). |

### US-U3: Analysis Results Readability

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | ≥4 distinct visual chunks | ✅ Pass | `web/review-table-base.js:514+` `populateAnalysisTab()` builds `.analysis-role-card`, Required Skills (`.analysis-section`), Preferred/Nice-to-Have list, Keywords, Domain/Role chips — 5+ distinct `.analysis-section` cards (`web/styles.css:628-647`). |
| 2 | Keyword rank shown visually, not flat comma list | ✅ Pass | `.kw-badge` + `.kw-rank` numbered badges (`web/styles.css:643-645`), not a comma-separated string. |
| 3 | Mismatch callout above the fold; >3 mismatches get summary + expandable detail | ⚠ Partial | Callout is placed immediately after the role card, above Required Skills (`web/review-table-base.js:553-563`) — genuinely above the fold. However it always renders **all** missing-skill names inline (`missing.join(', ')`); there is no "N mismatches — show details" collapse/summary behaviour for large mismatch counts as the acceptance criterion specifies. |
| 4 | Clarifying questions in groups of ≤3 | ✅ Pass | `const GROUP_SIZE = 3;` (`web/questions-panel.js:381`), paginated via `_currentGroup`, one group visible/answerable before the next (lines 168-173, 405-422). Answer controls are button chips (`.q-chip`) — not free-text unless the LLM provides no fixed choices. |
| 5 | Analysis loading state has a label + approximate duration | ⚠ Partial | Loading label exists (`setLoading(true, 'Analysing job description…')`, `web/job-analysis.js:111`) and the busy overlay shows a live elapsed counter plus a "Taking longer than usual" badge after a threshold (`#llm-busy-elapsed`, `#llm-busy-state-badge`, `web/index.html:168-173`), but there is no **upfront estimated duration** (e.g., "~20s") — only a live count-up and a late "slow" warning. |

### US-U4: Review Table Interaction Quality

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Toggle affordance obvious, unambiguous state | ✅ Pass | Icon buttons with `.active` class + `aria-pressed` + colour + distinct icon per action (`web/experience-review.js:248-251`: ➕ Emphasize / ✓ Include / ➖ De-emphasize / eye-slash Exclude) — not a bare checkbox. |
| 2 | Reorder controls discoverable without hover, keyboard accessible | ✅ Pass | Up/down `<button>` icons always rendered inline (`aria-label="Move X earlier/later in CV"`, `web/experience-review.js:253-254`; achievements: `web/achievements-review.js:282-283,327-328,638-639`) — real `<button>` elements are natively keyboard-focusable, no hover-reveal CSS found. |
| 3 | Row density (title, role/company, date, relevance, first bullet) | ✅ Pass | Experience table columns: Experience/Company, Dates, Recommendation, Confidence, Reasoning excerpt, actions (`web/experience-review.js:194-256`). |
| 4 | Bulk Select-All/Deselect-All when >8 rows | ✅ Pass | `.bulk-toolbar` with "Accept All Recommended / Emphasize All / Include All / Exclude All / Undo" rendered unconditionally for experiences (`web/experience-review.js:286-297`), skills (`web/skills-review.js:1053-1054`) and achievements (`web/achievements-review.js:340-341`) — present regardless of row count, so the >8-row case is always covered. |
| 5 | Inline expansion, no navigation-away | ✅ Pass | Bullet reorder opens as an in-page modal (`showBulletReorder`, referenced `web/experience-review.js:271-274`), not a route change; rewrite "Edit" mode expands in place (see US-U5). |
| 6 | Relevance score labelled & interpretable without hidden legend | ✅ Pass (categorical alternative) | The app does **not** use a numeric 0-100/letter-grade score; instead it shows categorical **Recommendation** (Emphasize/Include/De-emphasize/Omit) + a 5-point **Confidence** badge with an inline `ⓘ` tooltip legend on the column header itself (`CONFIDENCE_COLUMN_LEGEND`, `web/experience-review.js:201,223`) — meets the spirit (labelled, in-place legend) though it's a different visual encoding than the "92/100" example in the story. |

### US-U5: Rewrite Review Presentation

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Inline diff (red strikethrough / green additions), not two boxes | ✅ Pass | `computeWordDiff()` (LCS word-diff) + `renderDiffHtml()` render `<del class="diff-removed">`/`<ins class="diff-added">` inline in one string (`web/rewrite-review.js:345-396`); CSS `line-through` red / underline-none green (`web/styles.css:1499-1500`). |
| 2 | Accept/Reject/Edit collocated with diff; Accept visually primary | ✅ Pass | All three buttons live inside `.rewrite-actions` in the same `.rewrite-card` as the diff (`web/rewrite-review.js:447-452`). Accept is listed first but CSS-wise all three `.rw-btn` share styling with colour-only differentiation (accept=green via `.accepted`, reject=red via `.rejected`) — Accept is not visually more prominent (same size/weight as Reject/Edit) — minor deviation from "Accept should be the primary (visually prominent) action." |
| 3 | Reason visible within one click/hover | ✅ Pass | `<details><summary>Rationale & Evidence</summary>...` (`web/rewrite-review.js:436-441`) — one click to expand, no separate panel/modal. |
| 4 | Edit path keeps diff visible, doesn't force accepting LLM text first | ✅ Pass | `applyRewriteAction(id,'edit')` keeps the diff visible at reduced opacity as a reference while showing an editable textarea beneath it (`web/rewrite-review.js:473-489`); `saveRewriteEdit()` regenerates the diff against the edited text. |
| 5 | Keyboard-driven sequential review for >3 rewrites | ✅ Pass | Global `↑`/`↓` navigate cards, `A`/`R` accept/reject the keyboard-focused card (`web/keyboard-shortcuts.js:301-316`, documented in the `?` shortcuts panel); `_scrollToNextPendingRewrite()` auto-scrolls to the next undecided card after each decision (`web/rewrite-review.js:520,524-536`). No literal "Approve & Next" button exists, but the keyboard shortcut + auto-scroll combination satisfies the underlying intent. |

### US-U6: Generation and Output State Feedback

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Step-by-step generation progress with completion state | ✅ Pass | `sendAction('generate_cv')` polls `/api/status` and renders `✓`/`⏳` per step with elapsed ms (`web/session-actions.js:66-91`); layout-instruction flow shows an explicit 3-step `<ol>` (Rendering HTML / Generating PDF / Building DOCX) (`web/layout-instruction.js:405-409`). |
| 2 | In-browser preview before download | ✅ Pass | `#final-cv-preview` sandboxed iframe rendering the actual generated HTML CV (`web/final-generate.js:75-98`), toggle "Show/Hide preview" on the Generated Files tab — collapsed by default but genuinely available pre-download. |
| 3 | PDF (min) + HTML + copy-to-clipboard secondary options | ⚠ Partial | PDF/DOCX/HTML downloads present (`web/download-tab.js:22-78`, `web/final-generate.js:113-130`); no copy-to-clipboard-of-plain-text option was found in either file. |
| 4 | Generation failure gives interpretable message + fallback | ✅ Pass | Chrome/WeasyPrint renderer status shown per-renderer with a fallback link ("View HTML preview... as a fallback") when a renderer fails (`web/layout-instruction.js:100-110`). |
| 5 | Filename includes applicant/role/date, not generic | ✅ Pass | `scripts/utils/cv_orchestrator.py:1467,2381,4489,5243` — `f"CV_{company}_{role}_{timestamp}[_ATS].docx"` pattern confirmed in source. |
| 6 | Multiple versions distinguished (timestamp/"current" label) | ✅ Pass | `Run #${generationRun} — ${dateStr}` label shown per download item when `generationRun > 1` (`web/download-tab.js:196-209`); "Generated: {timestamp}" also shown on the Generated Files tab (`web/final-generate.js:134-139`). |

### US-U7: Accessibility and Keyboard Navigation

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Focus moves into modal on open, restores on close | ✅ Pass | `openModal()`/`closeModal()` push/pop a `_focusStack`, call `setInitialFocus()` and `trapFocus()` (`web/ui-core.js:353-356, 622-656`); same pattern reused by `confirmDialog()` (lines 381-455) and every custom overlay (settings, model wizard, sessions). |
| 2 | Visible focus ring everywhere, no `outline:none` without replacement | ✅ Pass | `grep -n "outline:\s*none"` over `web/styles.css` returned **zero** matches; explicit `:focus-visible { outline: 2px solid var(--cv-accent); }` rules exist for tabs, buttons, inputs, steps, DataTable headers (`web/styles.css:295,417,452,660,679,749,763,816` and more). |
| 3 | Review-table toggles/reorder operable by keyboard | ✅ Pass | Icon `<button>`s are natively tab/Enter/Space-operable; global shortcuts `A`/`R`/`↑`/`↓` additionally drive review rows (`web/keyboard-shortcuts.js:70-190`). |
| 4 | Icon-only buttons have `aria-label`/`title` | ✅ Pass | Broad spot-check across `master-cv.js`, `achievements-review.js`, `experience-review.js`, `workflow-steps.js`, `index.html` shows consistent `aria-label` on close/edit/remove/reorder icon buttons. |
| 5 | No colour-only status; text/icon also present | ⚠ Partial | Accept/Reject decision badges use text ("✓ Accepted"/"✗ Rejected") **and** colour (`web/rewrite-review.js:511-517`) — good. But the **workflow step bar's** completed/active/upcoming distinction (see US-U1 #2) is colour-only for the common case — a real colour-independence gap in the one place most visible throughout the whole session. |
| 6 | Form errors tied via `aria-describedby`, announced | ✅ Pass | `aria-describedby="paste-char-count paste-error"` / `"url-error"` with `aria-live="polite"` error spans (`web/job-input.js:152,155-157,168,171`). |

### US-U9: HTML Layout Review Interaction Quality

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Instruction field labelled with scope + placeholder example | ✅ Pass | Placeholder gives 3 concrete examples; scope note directly above the field: "Text content is finalised — content edits are not applied here" (`web/layout-instruction.js:326,384-388`). |
| 2 | Processing indicator within 300 ms, preview refresh on completion, no full reload | ✅ Pass | `showProcessing(true)` called synchronously before the API call in `submitSmartInstruction()` (`web/layout-instruction.js:774-775`); preview updates via `renderHtmlIntoIframe()`/`displayLayoutPreview()` — no reload. |
| 3 | Brief confirmation of what changed | ✅ Pass | `instruction.change_summary` captured per instruction and shown both as an inline message and in the history entry (`web/layout-instruction.js:150,1138`). |
| 4 | Ambiguous instruction → clarifying question, not silent guess | ✅ Pass | `if (response.error === 'clarify') showClarificationDialog(response.question, instructionText);` (`web/layout-instruction.js:778-779`). |
| 5 | Instruction history with per-entry Undo | ⚠ Partial | History list shows every instruction with timestamp + change summary (`renderInstructionHistory()`, `web/layout-instruction.js:1120-1146`), but **only the most recent entry's Undo button is enabled** — all earlier entries render a disabled Undo with tooltip "Undo is sequential — undo the most recent instruction first" (lines 1131-1134). This is a reasonable technical design (single undo stack) but does not literally satisfy "each entry in the log has an Undo action." |
| 6 | Single "Proceed to Final Generation" button regardless of instruction count | ⚠ Partial | The flow is actually **three sequential buttons** — "Apply" (per instruction) → "Confirm Layout" (`#confirm-layout-btn`) → "Generate Final Files" (`#proceed-to-finalise-btn`) — gated by a `layout-substep-indicator` showing "Step 1/2/3 of 3" (`web/layout-instruction.js:251-296,390-424`). Behaviour is at least **consistent** regardless of whether 0 or many instructions were applied (no "Skip" vs "Confirm" branching), so the failure mode named in the story (label changes depending on whether changes were made) is avoided — but the criterion's literal "single button" design is not what's implemented, and the button text is "Generate Final Files," not "Proceed to Final Generation." |
| 7 | Content-safety assurance clearly communicated | ✅ Pass | Same scope label as #1 plus repeated safety-sanitizer alerts (`appendLayoutSafetyAlert()`, `web/layout-instruction.js:126-144`) whenever the backend strips unsafe content from an instruction. |

### US-U8: Responsive Behaviour and Loading Performance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Fully operable at 1280×800, no page-level horizontal scroll | ✅ Pass (by design, not measured in-browser) | Two-panel layout uses `%`/`flex` widths, not fixed px (`.interaction-area{width:40%}`, `.viewer-area{width:60%}`, `web/styles.css:489-531`); stacks to single column only below 900px (`@media (max-width:900px)`, lines 1775-1785), so 1280px stays in the safe two-column range. Not verified with an actual browser/DevTools resize in this review. |
| 2 | Review tables scroll within their own container; low-priority columns collapse at smaller widths | ⚠ Partial | Tables have `overflow-x: auto` containers (`web/styles.css:1385` `.review-table` wrapper) so page-level scroll is avoided — good. But no column-collapse rule (e.g. hiding an ID/raw-score column at ≤1400px) was found; fixed `nth-child` widths exist (lines 1394-1398) but nothing is conditionally hidden. |
| 3 | App shell renders ≤2 s locally | 🔲 Not evaluated | Requires runtime measurement (network/perf trace), out of scope for static source review. `index.html` loads 4 external CDN resources render-blocking-ish (Bootstrap CSS, DataTables CSS, Font Awesome CSS, then defer-loaded Bootstrap JS) which could add latency on a cold/offline cache — worth a follow-up timing check. |
| 4 | Skeleton/min-height placeholders prevent CLS during async loads | ⚠ Partial | Only one genuine reserved-space instance found: `#ai-summary-loading` with `min-height:40px` (`web/summary-review.js:75`). No systematic skeleton-screen pattern across analysis, rewrites, or layout-preview loading states; most loading states are a bare spinner/empty-state swap that can shift layout when real content arrives. |
| 5 | No scroll jank on 20+ row tables | 🔲 Not evaluated | DataTables is used with `paging:false` for the model table and review tables (`web/ui-core.js:1601-1607`, `web/skills-review.js`), meaning all rows render in the DOM at once — plausible perf concern for a 30+ row skills table, but requires runtime profiling to confirm/deny, not verifiable from source alone. |

## Generated Materials Evaluation

This persona's story set (US-U1–U9) is scoped entirely to the **application's UI**, not the generated CV/cover-letter/DOCX output content itself (that is covered by the resume-expert / graphical-designer personas). No generated-materials-specific criteria were evaluated here; no findings to report in this section.

## Additional Story Gaps / Proposed Story Items

1. **Skip-navigation link does not move keyboard focus (new finding, not in any US-U story).** `web/index.html:33` — `<a href="#document-content" class="skip-link">Skip to content</a>` is the first focusable element and does become visible on `:focus` (`web/styles.css:165-183`, `top:-100px` → `top:8px`). However its target, `#document-content` (`web/index.html:260`), has **no `tabindex` attribute**, and no JS was found (`grep -rn "skip-link\|document-content.*tabindex" web/*.js` → only one unrelated hit in `ats-modals.js`) that calls `.focus()` on it after activation. Per the HTML fragment-navigation spec, activating a link to a non-focusable target scrolls the viewport but does **not** move keyboard focus there — so a keyboard user who activates the skip link is still forced to Tab through the entire header, position bar, and 13-item workflow-step nav to reach real content, defeating the purpose of the link (WCAG 2.4.1 Bypass Blocks is not actually satisfied for keyboard-only users, only for screen-reader users who follow the visual scroll). **Fix:** add `tabindex="-1"` to `#document-content` (or have the skip-link's click handler call `document.getElementById('document-content').focus()`). Propose adding this as an explicit US-U7 acceptance criterion ("skip-link target must be programmatically focusable") since skip links are common enough to warrant a named test.
2. **Finalise step overlaps functionally with the Harvest step it precedes.** The task specifically asked whether Finalise fits sensibly between Thank You and Harvest. Sequence-wise it is defensible (archive happens after all downstream documents — cover letter, screening answers, interview prep, thank-you note — are produced, and Harvest/"Update Master CV" is the final reflective step). However, `web/finalise.js:78-83,132,341-379` shows the Finalise tab's own intro copy ("...update the response library, and optionally write any improvements back to Master CV Data") and its `showHarvestSection()` function **fetches `/api/harvest/candidates` and renders a second, separate "📥 Update Master CV Data" panel inline inside the Finalise tab**, duplicating the exact same data surface that the dedicated `harvest.js` `populateHarvestTab()` implements as its own top-level workflow step (`web/harvest.js:361+`). A user who clicks "✅ Finalise & Archive" is shown this embedded harvest panel immediately, then can separately navigate to the "🌾 Update Master CV" step later and see harvest candidates again via a different code path. This is the same class of duplicate-surface risk the project's own `CLAUDE.md` explicitly warns about for duplicate helper functions (GAP-146, GAP-48, GAP-43) — here at the UI-surface level rather than the function-name level — and creates IA ambiguity about which entry point is "the" way to update Master CV. **Recommend:** either remove the embedded harvest panel from Finalise and instead deep-link to the Harvest tab ("✓ Archived — Update your Master CV now →"), or make the Harvest *tab* itself the single canonical surface and have Finalise show only a summary/CTA.
3. **Finalise step tooltip undersells its actual lifecycle scope.** `web/index.html:151` labels the step "Finalise — mark the application ready to send and record its status," but `web/finalise.js:100-112` shows the status `<select>` includes post-submission states the user would set **weeks later** (Sent, Interview scheduled, Rejected, Accepted, Parked). The workflow-step bar visually presents Finalise as one discrete step in a left-to-right sequence (like all the others), giving no cue that it is meant to be revisited over the following weeks/months as the real-world outcome unfolds — unlike every other step, which is "done once." Consider a distinct visual treatment (e.g., a "Track status" label/icon) or documentation copy noting it's a living record.
4. **Propose new story item: "Above-the-fold summarisation threshold for mismatch/warning callouts."** US-U3 §3 asks for a count+expand pattern once mismatches exceed 3, but no component in the codebase implements progressive disclosure for a large flat list (mismatch callout, ATS keyword failures, etc.) — they all render every item inline. Worth a dedicated acceptance test since this pattern recurs across Analysis, ATS Report, and rewrite-audit-mismatch surfaces (`web/bundle.js:17139-17144`, `web/download-tab.js:485-490`).
5. **Story-set gap: no explicit criterion for a copy-to-clipboard action**, yet the failure-mode language in US-U6 implies it should exist ("HTML download and copy-to-clipboard of plain text should be offered as secondary options"). This is stated only as an "Evaluation Criteria" bullet, not restated in "Acceptance Criteria," creating an internal inconsistency in the story file itself — recommend aligning the two sections (either drop copy-to-clipboard from Evaluation Criteria or add it to Acceptance Criteria) so the pass/fail bar is unambiguous.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus web/workflow-steps.js, web/job-input.js, web/questions-panel.js, web/experience-review.js, web/achievements-review.js, web/skills-review.js, web/rewrite-review.js, web/keyboard-shortcuts.js, web/download-tab.js, web/final-generate.js, web/session-actions.js, web/session-manager.js, web/layout-instruction.js, web/finalise.js, web/harvest.js, web/master-cv.js, scripts/utils/cv_orchestrator.py (filename convention only)

| Story | ✅ Pass | ⚠ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-U1 | 4 | 1 | 0 | 0 | 0 |
| US-U2 | 4 | 1 | 0 | 0 | 0 |
| US-U3 | 3 | 2 | 0 | 0 | 0 |
| US-U4 | 6 | 0 | 0 | 0 | 0 |
| US-U5 | 4 | 1 | 0 | 0 | 0 |
| US-U6 | 5 | 1 | 0 | 0 | 0 |
| US-U7 | 5 | 1 | 0 | 0 | 0 |
| US-U9 | 4 | 3 | 0 | 0 | 0 |
| US-U8 | 1 | 2 | 0 | 2 | 0 |

**Key evidence references:**
- US-U1: Colour-only completed/active/upcoming step differentiation → web/styles.css:301-306, web/workflow-steps.js:943-1027
- US-U2: Intake confirmation exposes only Position Title, not separate company/date fields → web/job-input.js:71-84
- US-U3: Mismatch callout has no count+expand pattern for large lists → web/review-table-base.js:553-563
- US-U3: No upfront estimated duration in analysis loading state → web/index.html:168-173, web/job-analysis.js:111
- US-U5: Accept/Reject/Edit share equal visual weight (Accept not most-prominent) → web/rewrite-review.js:447-452
- US-U6: No copy-to-clipboard secondary download option → not found in web/download-tab.js or web/final-generate.js
- US-U7: Skip-link target lacks tabindex / focus() handling → web/index.html:33,260; not found in any web/*.js
- US-U9: Undo is sequential (only last history entry enabled) → web/layout-instruction.js:1131-1134
- US-U9: Three-button flow (Apply → Confirm Layout → Generate Final Files), not one "Proceed to Final Generation" button → web/layout-instruction.js:390-424,251-296
- US-U9/Finalise IA: Harvest-candidates UI duplicated inside Finalise tab → web/finalise.js:132,341-379 vs web/harvest.js:361+
- US-U8: No column-collapse rule for review tables at ≤1400px → web/styles.css:1385-1398
- US-U8: Only one min-height loading placeholder found (no systematic skeleton pattern) → web/summary-review.js:67-75

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
