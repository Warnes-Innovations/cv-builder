# CV Builder UI Review
**Date:** 2026-03-13
**Source:** web/index.html, web/app.js, templates/cv-template.html
**Stories reviewed:** US-A1–A12, US-U1–U9, US-R1–R7, US-H1–H7, US-P1–P6, US-T1–T6

---

## Summary

### Acceptance Criteria Results

| Status | Count |
|--------|-------|
| ✅ Pass | 55 |
| ⚠️ Partial | 90 |
| ❌ Fail | 18 |
| 🔲 Not Implemented | 60 |
| — N/A | 67 |
| **Total evaluated** | **290** |

### Top Acceptance Criteria Gaps

**🔴 Critical — Fail / Not Implemented across multiple stories:**

- **Rewrite diff view** (US-U5, US-R3, US-R6) — Rewrite tab shell exists but no card structure, no inline red/green diff, no accept/reject/edit controls. GAP-06.
- **ATS validation report** (US-T6) — 16 programmatic checks not implemented; no validation UI; downloads not gated. GAP-04.
- **Phase back-navigation / re-run** (US-A12, US-U1) — Workflow bar is static; no re-run buttons, no confirmation dialog, no downstream-state preservation. GAP-18.
- **Spell-check panel** (US-A4b, US-R7) — Tab exists; LanguageTool integration not connected; no flag/suggestion UI. GAP-08.
- **Bulk accept/reject controls** (US-U4) — No Select All / Deselect All on tables with >8 rows. GAP-07.
- **Bullet reordering** (US-R2, US-U4) — No up/down or drag controls in review tables. GAP-07.
- **Page-count estimation warning** (US-R2) — No length check or warning UI. GAP-05.
- **Candidate-to-confirm skill marking** (US-R5) — No visual indicator for weak-evidence skills in review UI. GAP-12.
- **Cover letter validation** (US-P5) — No checks for opening pattern, company specificity, word count, or call-to-action.
- **Cross-document consistency checks** (US-P6) — No harmonisation between CV, cover letter, and screening responses.
- **Clarifying questions rendering** (US-A2) — Tab exists; no content structure for questions rendering.
- **Post-generation keyword check UI** (US-T4) — Keyword validation not implemented; required keywords could be absent from ATS DOCX with no warning. GAP-04.

---

## UI/UX Heuristic Evaluation

### Nielsen's 10 Heuristics

| # | Heuristic | Rating | Key Evidence |
|---|-----------|--------|--------------|
| H1 | Visibility of system status | 🟡 Minor | LLM status bar (index.html:108–112) shows "Reasoning…" with pulsing dot. Workflow steps (lines 79–95) show active/completed/upcoming states via colour. Missing: real-time progress % for long ops, estimated time remaining for LLM calls. |
| H2 | Match between system and the real world | 🟢 Good | Language is natural ("CV Customizer", "Analyze Job", "Generate CV"). Input methods match real-world workflows (paste, URL, file upload). Tab naming aligns with workflow phases. |
| H3 | User control and freedom | 🟠 Major | Session conflict banner (lines 72–75) warns but provides no recovery action. Workflow is effectively forward-only—no confirm dialog before phase advancement that would discard downstream state. No "undo" after accepting rewrites. GAP-02, GAP-18. |
| H4 | Consistency and standards | 🟡 Minor | Button styles are consistent (primary = #3b82f6, danger = #dc2626). However, emoji icons for tabs (📋, 🔍) sit alongside Unicode symbols (✕, ✅); modal close buttons use × (Unicode) while tabs use emoji. |
| H5 | Error prevention | 🟠 Major | Session deletion requires confirmation (good). URL input contextual help distinguishes supported/unsupported sites (excellent). Missing: client-side file-size validation, confirmation dialogs before advancing workflow stages, field-level `aria-describedby` on form inputs. |
| H6 | Recognition rather than recall | 🟢 Good | All tabs visible in nav bar (lines 140–155); workflow steps show stage names. Conversation history visible on left. Model selector shows current model in header. No hidden menus or command syntax to memorise. |
| H7 | Flexibility and efficiency of use | 🟡 Minor | Enter to send message (ui-core.js:144–151), Escape to close modals (ui-core.js:161–165). No shortcuts for frequent actions (Analyze, Generate). 15-tab bar requires horizontal scrolling. No bulk accept/reject in review tables. |
| H8 | Aesthetic and minimalist design | 🟢 Good | Clean layout using a restrained colour palette (#f8fafc, #1e293b, #3b82f6). Generous whitespace. Clear typographic hierarchy. The 15-tab bar is visually heavy; auxiliary tabs (Master CV, Cover Letter, Screening) clutter the primary workflow view. |
| H9 | Help users recognise, diagnose, and recover from errors | 🔴 Critical | Server errors appear in chat as "❌ Network error" (app.js:1097), not next to the form that failed. File upload failures show no retry button. Session 409 conflict provides no retry link, countdown, or recovery path. No structured error recovery across the app. |
| H10 | Help and documentation | 🟡 Minor | In-context help on URL input (app.js:1022–1030); hover titles on workflow steps (lines 80–94). No dedicated help section, no tooltips on confidence scoring or weak-evidence badges. |

### Additional UX Dimensions

| Dimension | Rating | Observations |
|-----------|--------|--------------|
| Cognitive load | 🟠 Major | 15 tabs in the nav bar (index.html:140–155) are shown simultaneously regardless of current stage. Two-level navigation (workflow step bar + tab bar) is not visually cohesive. Users cannot tell which tabs are relevant now vs. later. |
| Visual hierarchy | 🟡 Minor | Workflow steps use colour well (active = #dbeafe, completed = #dcfce7) but text contrast on those backgrounds is low. Header actions (auth badge, model selector, sessions button) all have similar styling—hard to distinguish primary vs. secondary actions. |
| Information architecture | 🟡 Minor | Tab-to-stage mapping (ui-core.js:10–19 STAGE_TABS) is implicit; users don't see "you are in Analysis stage." Finalise stage groups unrelated tasks (download, archive, master data, cover letter, screening) that don't share a mental model. |
| Workflow momentum | 🔴 Critical | Forward-only progression: once a phase is completed, re-running an earlier phase requires starting over with no "preserve downstream state" pathway. Session conflict banner (lines 72–75) blocks all work with no auto-recovery. GAP-02, GAP-18. |
| Feedback loops | 🟠 Major | LLM status bar (lines 108–112) is good. Missing: inline validation feedback while typing, "parsing document… 40%" progress on file upload, confirmation toasts after successful actions, estimated time remaining for LLM calls. |
| Error recovery | 🔴 Critical | Session conflict: no retry button or countdown. File upload failure: no retry affordance. Network timeouts: no retry mechanism. Phase reversal: no rollback path. Users must manually refresh or restart the workflow. |
| Affordance clarity | 🟡 Minor | Buttons are visually distinct. Icon-only action buttons (✏️ Edit, ✅ Accept, ✕ Reject) rely on icon + colour alone with no fallback text for low-vision users. Tab bar scrollability is not signalled. Session modal rows lack hover state. |

### Top 5 UX Issues by Impact

#### UX-1: Forward-Only Workflow Breaks Iterative Refinement — 🔴 Critical
**Problem:** Once a workflow phase is completed, users cannot re-run an earlier phase (e.g., re-analyse with amended clarification answers, re-select experiences after seeing a rewrite) without abandoning current work. No "preserve downstream decisions" pathway exists. This directly blocks US-A6 and US-A12.
**Affected area:** Workflow step bar (index.html:79–95), ui-core.js STAGE_TABS (lines 10–19), conversation_manager.py backend phase transitions. GAP-02 and GAP-18.
**Remediation:** Implement phase back-navigation with an explicit confirmation dialog listing affected stages. Preserve all downstream approvals in session state so users can see diffs of what changed when re-running.

#### UX-2: Error Recovery Is Absent — No Retry or Rollback Paths — 🔴 Critical
**Problem:** Operation failures (file parse error, network timeout, session 409 conflict) surface error text in chat or a generic div but provide no recovery action. Users must manually refresh the page or restart the workflow after 10+ minutes of setup.
**Affected area:** Session conflict banner (index.html:72–75), file upload error div (app.js:1053), network error handler (app.js:1096–1097). No retry UI patterns anywhere.
**Remediation:** Add inline "Retry" buttons with error messages. For 409 conflicts, show a countdown timer and "Take control" option. For file upload, show progress with cancel option and re-upload affordance on failure.

#### UX-3: 15-Tab Navigation Causes Cognitive Overload — 🟠 Major
**Problem:** All 15 tabs are visible simultaneously regardless of which workflow stage is active. Users on first use face all phases at once with no sense of which tabs are relevant now. Horizontal scrolling on the tab bar (styles.css:219–227) is not discoverable.
**Affected area:** Tab bar (index.html:140–155), STAGE_TABS mapping (ui-core.js:10–19).
**Remediation:** Show only tabs relevant to the current workflow stage. Collapse auxiliary tabs (Master CV, Cover Letter, Screening) into an "Advanced" dropdown. Add visible scroll affordance (arrow indicators) when the tab list overflows.

#### UX-4: No Field-Level Validation or Error Association — 🟠 Major
**Problem:** Form submission failures (invalid URL, malformed file, too-short paste) produce errors in chat or a generic div, not next to the field that failed. No `aria-describedby` linking error messages to inputs. Violates WCAG 2.1 Level A.
**Affected area:** Job input form (app.js:1003–1058), file upload (app.js:1150–1199), URL fetch (app.js:1014–1031).
**Remediation:** Add client-side validation (file size, URL format, minimum text length) with inline error messages. Use `aria-describedby` to associate errors with fields. Highlight invalid fields with a red border on blur.

#### UX-5: Session Conflict Blocks Work With No Recovery Affordance — 🟠 Major
**Problem:** The session conflict amber banner (index.html:72–75) says "close the other tab or wait" but does not identify which tab, how long to wait, or provide any recovery action. Dismissing the banner removes it but leaves the user still blocked.
**Affected area:** Session conflict banner (index.html:72–75), fetch interceptor (ui-core.js:84–91).
**Remediation:** Show a countdown timer ("Auto-retrying in 30s…") with a manual retry button. Provide a "Take control of this session" option with a 5-second confirmation to prevent accidental work loss.

---

## Persona Reviews

---

### US-A* — Applicant

#### US-A1: Discover and Queue a Job Opportunity

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | URL and paste-text paths both work | 🔲 | No job input form visible in HTML |
| 2 | Protected-site warning with fallback | 🔲 | No job input UI panel in viewer area |
| 3 | Company/role/date auto-extracted and editable | 🔲 | No form fields visible |
| 4 | Session persisted immediately | — | Backend concern |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Protected-site warning missing | ✅ Not present (form field not yet rendered) |
| Extracted fields non-editable | ✅ Not present (form field not yet rendered) |

---

#### US-A2: Understand What the Job Requires

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Required/preferred split displayed | 🔲 | tab-analysis exists (line 142) but content area is an empty placeholder |
| 2 | Mismatch analysis surfaced as clarifying questions | 🔲 | No analysis UI rendering |
| 3 | At least one clarifying question surfaced | 🔲 | tab-questions exists (line 143) but empty |
| 4–7 | Answers persist/pass downstream/survive refresh | — | Backend concerns |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Analysis results not displayed | ❌ Present — no rendering logic |
| Clarifying questions missing | ❌ Present — tab exists; no content |

---

#### US-A3: Review and Approve Content Customisations

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Relevance score and rationale per recommended item | ⚠️ | tab-customizations (line 144); DataTables loaded (lines 264–265); no table HTML in static markup |
| 2 | Include/exclude toggles per item | ⚠️ | No table structure or toggle controls |
| 3 | Up/down buttons for reordering | ⚠️ | No reorder controls; GAP-07 |
| 4 | Bullet reordering within entry | ⚠️ | No controls; GAP-07 |
| 5 | Omit suggestions explained | ⚠️ | No rendering visible |
| 6 | Publications pre-ranked with relevance | ⚠️ | No publications section in customizations tab |
| 7 | Empty publications section omitted | — | Backend concern |
| 8 | Decisions persist in session | — | Backend concern |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| No table/grid for experiences, achievements, skills | ❌ Present — tab-customizations has no content rendering |
| Relevance scores not displayed | ❌ Present — no score rendering structure |

---

#### US-A4: Review and Approve Text Rewrites

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Card-based before/after diff per proposal | ⚠️ | tab-rewrite exists (line 145); no card structure in static HTML; GAP-06 |
| 2 | Keyword pills in rewrite cards | ⚠️ | No pill badge HTML |
| 3 | Collapsible rationale + evidence citation | ⚠️ | No details/summary structure |
| 4 | Accept / Edit / Reject per card | ⚠️ | No button group visible |
| 5 | Weak-evidence additions badged with ⚠ | ⚠️ | No badge structure |
| 6 | Edited text enters CV (not proposal) | — | Backend concern |
| 7 | Submit All blocked until all cards actioned | ⚠️ | No submit-all button visible |
| 8 | Rewrite audit persisted | — | Backend concern |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Side-by-side card layout missing | ❌ Present — no card HTML |
| Weak-evidence badge missing | ❌ Present — no badge HTML |

---

#### US-A4b: Spell & Grammar Check Before Generation

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | tab-spell renders spell-check results | ⚠️ | tab-spell exists (line 146); no content; GAP-08 |
| 2–4 | Flag display, controls, blocking logic | ⚠️ | No UI for any of these |
| 5–8 | Dictionary, persistence, editing | — | Backend concerns |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Spell-check UI missing | ❌ Present — GAP-08; no LanguageTool integration |

---

#### US-A5a: Generate HTML for Layout Review

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 2 | HTML preview opens in inline pane | ⚠️ | document-viewer (line 157) exists; document-content (line 158) is a generic div, not iframe |
| 4 | Progress indicator within 1 s | ⚠️ | llm-status-bar (line 108) generic; no step labels |
| 1, 3, 5, 6 | Format selection, layout, errors, archive | — | Backend/template concerns |

---

#### US-A5b: Review and Refine HTML Layout

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Preview pane opens automatically | ⚠️ | tab-layout exists (line 149); no auto-open logic |
| 2 | Layout Instructions text field | ⚠️ | No textarea visible |
| 5 | Preview refreshes after each instruction | ⚠️ | No refresh mechanism |
| 6 | Confirm Layout button present | ⚠️ | No button visible |
| 3, 4, 7, 8 | Instruction types, structure-only edits, metadata, clarification | — | Backend concerns |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Layout instructions textarea missing | ❌ Present — no textarea |
| Confirm Layout button missing | ❌ Present — no button |

---

#### US-A5c: Generate Final Output

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 3 | Three formats available as download links | ⚠️ | tab-download exists (line 150); no link rendering |
| 4 | Progress indicator shown within 1 s | ⚠️ | llm-status-bar generic |
| 1, 2, 5, 6 | Generation, naming, errors, metadata | — | Backend concerns |

---

#### US-A6: Review and Iteratively Refine

All criteria are backend concerns (GAP-02). No re-entry UI visible in any tab.

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| No feedback entry point visible | ❌ Present — no form or text area for post-generation feedback |
| Back-navigation UI missing | ❌ Present — no re-run or back affordances |

---

#### US-A7: Generate Cover Letter

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Cover letter generation triggered | ⚠️ | tab-cover-letter exists (line 153); no generation form |
| 3 | Tone selector from preset options | ⚠️ | No selector visible |
| 7 | Editable before saving | ⚠️ | No textarea |
| 2, 4, 5, 6, 8 | Prior tone reuse, salutation, content, saves | — | Backend concerns |

---

#### US-A8: Handle Application Screening Questions

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Paste screening questions | ⚠️ | tab-screening exists (line 154); no textarea |
| 4 | Response format selection | ⚠️ | No format selector |
| 6 | Response editable inline | ⚠️ | No textarea |
| 2, 3, 5, 7–9 | Prior responses, experiences, generation, saves | — | Backend concerns |

---

#### US-A9: Finalise, Archive, and Submit

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Archive folder contents shown | ⚠️ | tab-finalise exists (line 151); no file list |
| 2 | Application status selector | ⚠️ | No status selector |
| 3 | Notes field | ⚠️ | No textarea |
| 5 | Confirmation summary shown | ⚠️ | No summary display |
| 4 | Finalise button triggers metadata/Git/library | — | Backend concern; GAP-03 |

---

#### US-A10: Update Master CV Data

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Natural-language update input | ⚠️ | tab-master exists (line 152); no textarea |
| 2 | Document ingestion | ⚠️ | No file upload area |
| 3 | Proposed JSON diff shown | ⚠️ | No diff viewer |
| 4 | Explicit confirmation required | ⚠️ | No confirmation dialog |
| 5 | Git commit on confirmed update | — | Backend concern; GAP-01 |

---

#### US-A11: Session Master Data Harvest

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Harvest prompt after Finalise | ⚠️ | No harvest modal |
| 2 | Candidate write-back items displayed | ⚠️ | No item list |
| 3 | Before/after diff with rationale | ⚠️ | No diff display |
| 4 | Checkboxes for opt-in selection | ⚠️ | No checkboxes |
| 5 | Consolidated JSON diff before write | ⚠️ | No diff viewer |
| 6 | Explicit confirmation required | ⚠️ | No confirmation |
| 8 | Harvest skippable | ⚠️ | No skip button |
| 7 | Git commit on confirmed harvest | — | Backend concern |

---

#### US-A12: Re-enter and Re-run Earlier Workflow Stages

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Re-run affordance on completed stages | ❌ | .workflow-steps (lines 79–95) are static divs; no re-run buttons; GAP-18 |
| 2 | Confirmation dialog for re-run scope | ❌ | No modal for re-run confirmation |
| 4 | Changed/new items highlighted for re-review | ❌ | No diff-highlighting mechanism in any tab |
| 6 | Clarification answers amendable at re-run time | ❌ | No form for clarification answer editing |
| 8 | Re-run accessible via keyboard shortcut | ❌ | No keyboard handler |
| 3, 5, 7 | Original job text, unchanged state, audit log | — | Backend concerns |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Re-run buttons missing from progress indicator | ❌ Present — .workflow-steps divs are static text |
| Confirmation dialog missing | ❌ Present — no modal |
| Changed-item highlighting missing | ❌ Present — no visual diff |

---

### US-U* — UX Expert

#### US-U1: Workflow Orientation and Progress Visibility

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Step indicator with named stages | ✅ | Workflow steps at index.html:78–96 with 8 named stages (📥 Job Input, 🔍 Analysis, ⚙️ Customise, ✏️ Rewrites, 🔤 Spell Check, 📄 Generate, 🎨 Layout, ✅ Finalise) |
| 2 | Completed steps visually distinct | ✅ | styles.css: active (#dbeafe), completed (#dcfce7), upcoming (#f8fafc) — three clear states |
| 3 | Back-navigation without losing work; destructive actions require confirmation | ⚠️ | Back-nav to completed steps supported (app.js:5905–5938); no confirmation dialog for potentially destructive navigation; GAP-18 |
| 4 | Session restoration context | ⚠️ | Session list shows phase (app.js:395) but full restoration of last active stage with all data is only partial via restoreTabData() (app.js:121–150) |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Linear next/back with no state labels | ✅ Not present |
| Back navigation silently discards approved content | ⚠️ Partially present — no confirmation dialog |
| Returning to session shows blank state | ⚠️ Partially present — partial restoration only |
| Progress indicator only updates on reload | ✅ Not present |

---

#### US-U2: Job Input and URL Ingestion UX

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | URL and paste-text modes clearly differentiated | ✅ | Tabs: "🔗 URL" and "📝 Paste Text" (app.js:997–1003) |
| 2 | Protected-site guidance contextual and specific | ⚠️ | Detection for LinkedIn/Indeed/Glassdoor (app.js:1106–1170); fallback shown in modal, not inline; GAP-02 |
| 3 | Fetch feedback with loading indicator ≤300 ms | ⚠️ | Loading state shown (app.js:1180–1185); no explicit 300 ms guarantee |
| 4 | Extracted fields inline-editable | ✅ | Confirmation UI shows editable input fields (app.js:1190–1200) |
| 5 | Character-count guidance on paste path | ❌ | No minimum character hint on paste textarea; GAP-16 |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| URL and text area presented simultaneously | ✅ Not present |
| Protected-site error as raw status code | ⚠️ Present — modal-based, not inline |
| Correcting extracted field requires restart | ✅ Not present |

---

#### US-U3: Analysis Results Readability

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | ≥4 visually distinct sections | ⚠️ | Analysis rendered as single HTML block (app.js:2164–2240); no explicit card separation; GAP-04 |
| 2 | Keyword rank signal | ⚠️ | Keywords shown with colour badges (app.js:5295–5298); no rank numbering in analysis view |
| 3 | Mismatch prominence above the fold | ⚠️ | .mismatch-callout present (app.js:2193) but inline; no above-fold summary count |
| 4 | Clarifying questions one group at a time | ⚠️ | Questions tab (app.js:2010–2069); grouping not explicit; free-text in some cases |
| 5 | Analysis duration feedback with label | ⚠️ | Step label shown (app.js:5305–5312); no >3 s threshold logic |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Full analysis as undifferentiated text block | ⚠️ Present — single HTML block without chunking |
| Mismatch callouts below fold with no summary | ⚠️ Present — inline only, no above-fold count |

---

#### US-U4: Review Table Interaction Quality

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Accept/reject toggles visually obvious | ✅ | Button-based Accept/Reject (app.js:3206–3215), not small checkboxes |
| 2 | Reorder controls discoverable without hover | ⚠️ | Not implemented; GAP-07 |
| 3 | Row density sufficient for decisions | ⚠️ | Title + role + date + score visible; bullets not shown until expanded |
| 4 | Bulk actions for tables >8 rows | ❌ | No bulk accept/reject; GAP-07 |
| 5 | Inline row expansion (no page nav) | ✅ | .expand-details inline expansion (app.js:3224–3240) |
| 6 | Relevance score labelled with scale | ⚠️ | Score displayed (app.js:3206) without consistent "/ 100" or scale context |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Small checkboxes as accept/reject | ✅ Not present |
| No bulk accept/reject for large tables | ❌ Present |

---

#### US-U5: Rewrite Review Presentation

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Inline diff (red strikethrough / green additions) | ❌ | Before/after side-by-side (app.js:4342–4380), not inline diff; GAP-06 |
| 2 | Accept/Reject/Edit collocated with diff | ⚠️ | Controls in same card (app.js:4356–4374) but in a separate row |
| 3 | Reason visible within one click | ⚠️ | .rewrite-rationale collapsible (app.js:4334); accessible but not inline |
| 4 | Edit path preserves diff view | ❌ | Edit mode (app.js:4368–4374) clears the diff highlight |
| 5 | Sequential navigation for >3 rewrites | ⚠️ | No "Approve & Next" button; cards visible but no keyboard flow |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Side-by-side requiring cognitive comparison | ⚠️ Present — before/after as separate blocks |
| No way to edit proposed text | ✅ Not present |

---

#### US-U6: Generation and Output State Feedback

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Step-labelled generation progress | ⚠️ | Progress bar exists (app.js:5345–5355); step labels not fully visible; GAP-16 |
| 2 | Generated CV previewable in-browser | ⚠️ | Download tab shows file links (app.js:3914–4050); no inline iframe preview |
| 3 | Download options: PDF + HTML/text | ✅ | PDF, ATS DOCX, HTML download buttons (app.js:3971–4010) |
| 4 | Error recovery with user-readable message | ✅ | Generation errors caught and displayed (app.js:5134–5140) |
| 5 | Output filename includes name/role/date | ✅ | Filename includes context; app.js:3971 shows formatted filenames |
| 6 | Version label for multiple generations | ⚠️ | No version timestamp or "current" label; GAP-16 |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Generated output only via file path, no preview | ⚠️ Present — download links, no in-browser render |
| Multiple versions not distinguished | ⚠️ Present — no version labels |

---

#### US-U7: Accessibility and Keyboard Navigation

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Focus management in modals | ⚠️ | Some modals move focus (app.js:425); no full focus trap cycle for all modals; GAP-15 |
| 2 | Visible focus ring on all interactive elements | ✅ | Focus styles in styles.css:167, 205, 344, 650 with blue box-shadow |
| 3 | Table keyboard navigation (Space/Enter, arrows) | ⚠️ | Tab nav works; table toggle/reorder keyboard shortcuts not implemented; GAP-15 |
| 4 | ARIA labels on icon-only buttons | ✅ | Icon buttons have title/aria-label (index.html:30, 66, 74, 80; app.js:5996) |
| 5 | Colour-independence for status indicators | ⚠️ | Buttons have text labels; some badges rely on colour only; GAP-15 |
| 6 | Error messages via aria-describedby | ⚠️ | Alert modal has aria-describedby (index.html:194); form fields lack it; GAP-15 |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| outline:none globally applied | ✅ Not present |
| Modal opened without moving focus | ⚠️ Partially present |
| Icon-only buttons with no label | ✅ Not present |

---

#### US-U8: Responsive Behaviour and Loading Performance

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Fully operable at 1280×800 | ⚠️ | Flexbox layout (styles.css:64–78); no explicit 1280×800 viewport test |
| 2 | Column collapsing in tables at smaller widths | ⚠️ | Media query at styles.css:691 (≤640 px); no explicit ≤1280 px strategy; GAP-16 |
| 3 | Page load ≤2 s locally | ⚠️ | Assets loaded (index.html:8–12, 258–269); no load-time benchmark |
| 4 | No layout shift during async loads | ⚠️ | Skeleton placeholders in some areas (app.js:5950); not consistently applied; GAP-16 |
| 5 | Long table scroll performance (20+ rows) | ⚠️ | DataTables (index.html:264–265) provides some optimisation; no virtual scrolling |

---

#### US-U9: HTML Layout Review Interaction Quality

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Instruction field labelled with scope; placeholder example | ✅ | Placeholder (layout-instruction.js:37); scope label: "💡 Layout changes only — approved text is never modified" (line 32) |
| 2 | Processing indicator ≤300 ms; preview refreshes | ✅ | #processing-indicator HTML (layout-instruction.js:44–47) |
| 3 | Change attribution after instruction | ⚠️ | #confirmation-message element present (layout-instruction.js:49); "what changed" summary detail incomplete |
| 4 | Clarification handling if LLM ambiguous | ⚠️ | Clarification structure exists (layout-instruction.js:200+); ask vs. guess logic not fully hardened |
| 5 | Instruction history with per-entry Undo | ✅ | #instruction-history with history list and undo controls (layout-instruction.js:51–57) |
| 6 | Single "Proceed to Final Generation" button | ✅ | #proceed-to-finalise-btn consistent label (layout-instruction.js:59–61) |
| 7 | Content safety label | ✅ | "Affects layout only — approved text is never changed" (layout-instruction.js:32) |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| No feedback after instruction | ✅ Not present |
| No instruction history | ✅ Not present |
| Proceed button label varies | ✅ Not present |

---

### US-R* — Resume Expert

#### US-R1: Job Description Analysis Quality

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Required and preferred qualifications in distinct sections | ✅ | app.js:2198–2218 — "Required Skills" (grid) vs. "Preferred / Nice-to-Have" (list) with distinct styling |
| 2 | Synonyms and acronym pairs grouped | 🔲 | Backend logic (GAP-10); UI shows ranked keywords but no synonym grouping |
| 3 | Domain inference with confidence level | ⚠️ | Domain/role_level meta-chips (app.js:2180–2182); no confidence level indicator |
| 4 | Keyword frequency weighting | 🔲 | Backend concern; rank badges present (app.js:2224–2225) |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Required/preferred not separated | ✅ Not present |

---

#### US-R2: Content Selection Strategy

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Relevance score semantic + keyword (not recency) | 🔲 | Backend logic; no UI visibility |
| 2 | Bullet reordering proposed and applied within entries | ❌ | No bullet reordering controls; GAP-07 |
| 3 | Conditional section decisions with rationale | ⚠️ | Publications pane (app.js:2972–2978) shows "ranked by relevance"; no per-decision rationale |
| 4 | Ranked publication shortlist with per-item scores | ⚠️ | Publications pane exists (app.js:2935); no per-item relevance scores |
| 5 | System warns if CV length exceeds 3 pages | ❌ | No page-count estimation or warning; GAP-05 |
| 6 | 4–6 achievements with diverse impact types | ⚠️ | Achievements pane exists; no impact-type diversity scoring |

---

#### US-R3: Rewrite Quality and Constraint Adherence

All 4 criteria are backend logic concerns. Rewrite review UI not implemented (GAP-06) — no frontend surface for these constraints.

---

#### US-R4: Professional Summary Effectiveness

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Proposed summary role-specific | ⚠️ | Summary pane (app.js:2967) shows "AI recommendation pre-selected"; no comparison to stored variants |
| 2 | Opening sentence contains role + years + differentiator | ⚠️ | No validation UI; user must read text manually |
| 3 | No filler phrases injected | 🔲 | Backend validation (check_summary_generic_phrases); no UI indicator |

---

#### US-R5: Skills Section Optimisation

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Only approved skills appear | 🔲 | Skills review pane exists (app.js:2949); no approval history |
| 2 | Skills ordered by relevance within categories | ⚠️ | "Sorted by relevance" note (app.js:2949); no visible category grouping |
| 3 | Approved additions written back to master data | 🔲 | Backend write-back (GAP-13); no UI |
| 4 | Candidate-to-confirm items flagged visually | ❌ | No visual indicator for weak-evidence skills; GAP-12 |

---

#### US-R6: Rewrite Audit Traceability

All 3 criteria are backend data structure concerns. Rewrite review tab (index.html:145) defined but no handler in app.js — no audit trail UI exists. GAP-06.

---

#### US-R7: Spell & Grammar Check Quality

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 4 | Accepted corrections change only the flagged span | ⚠️ | Spell check UI exists (app.js:4843–4869); correction span isolation not confirmed |
| 6 | Spell audit in metadata.json non-empty when flags exist | ⚠️ | spellAudit initialised (app.js:4822); posted to backend (app.js:4876) |
| 1, 2, 3, 5 | Dictionary suppression, verb checks, context filtering, dedup | 🔲 | Backend logic; no UI validation |

---

### US-H* — Hiring Manager

*Note: Hiring manager stories primarily concern the generated CV output (cv-template.html) rather than the web app UI. Criteria marked — are backend/template concerns.*

#### US-H1: First Impression — Page 1 Layout

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Page 1 contains name, contact, summary, achievements, education without scrolling | ✅ | cv-template.html:443–533 — #page-one with overflow:hidden; sidebar (contact, education, awards) and main (header, summary, achievements) |
| 2 | Summary is role-specific with title, years, differentiator | ⚠️ | Template renders {{ professional_summary }} (line 520); no content quality validation |
| 3 | Page 1 no overflow | ✅ | height: 279.4mm; overflow: hidden (lines 64–66) |
| 4 | Balanced whitespace in both columns | ⚠️ | Visual balance depends on content length; no template-level fill guarantee |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Page 1 overflow forces content to page 2 | ✅ Not present — overflow:hidden prevents bleed |
| Font below 10pt | ✅ Not present — body 0.95rem; all > 10pt equiv. |

---

#### US-H2: Work Experience — Credibility and Relevance

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 4 | Job entries not split across pages | ✅ | .job-entry has page-break-inside: avoid (cv-template.html:281) |
| 3 | Bullets ≤2 lines | ⚠️ | No max-width constraint on .job-details (lines 309–313); relies on backend curation |
| 1, 2, 5, 6 | Action verbs, ≥2 bullets, relevance order, system warning | — | Backend/LLM generation concerns |

---

#### US-H3: Skills Section Readability

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Skills grouped into named categories | ✅ | .skills-grid with .skill-group iterating skills_by_category (cv-template.html:541–550) |
| 4 | Skills section ≤1.5 sidebar columns | ✅ | Sidebar 32% width split across pages 2–3 (lines 92, 106) |
| 2 | Categories ordered by relevance | — | Backend/orchestrator ordering |
| 3 | No duplicate skills | — | Backend deduplication (GAP-11) |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Flat alphabetical skill list | ✅ Not present — categories displayed |
| Skills crowding Experience | ✅ Not present — sidebar/main columns clearly separated |

---

#### US-H4: Multi-Page Flow and Readability

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | page-break-inside: avoid on every job entry | ✅ | .job-entry line 281; all entries use this class (lines 561, 606) |
| 2 | Sidebar balanced across pages | ✅ | Page 1: contact/education/awards; Page 2: first 5 skill categories; Page 3: remaining skills |
| 5 | Publications headed "Selected Publications" if subset | ✅ | Conditional heading (lines 634–638) |
| 3 | Page count 2–3; warns outside range | — | Backend; GAP-05 |
| 4 | Publications only if role-relevant | — | Backend customisation phase |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Job title split from bullets across pages | ✅ Not present — page-break-inside:avoid |
| Page 3 sidebar empty | ✅ Not present — skills [5:] fill page 3 sidebar |

---

#### US-H5: Visual Identity and Professionalism

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Consistent colour scheme (navy, accent blue, grey) | ✅ | CSS variables (lines 17–25): --primary-color: #2c3e50, --accent-color: #2980b9 |
| 2 | Serif for name, sans-serif for body | ✅ | .name: Merriweather serif (line 225); body: Inter sans-serif (line 34) |
| 3 | Section titles uppercase with horizontal rule | ✅ | .section-title: text-transform uppercase (line 251), border-bottom (line 252) |
| 4 | Icon-prefixed contact fields | ✅ | Font Awesome classes on all contact items (lines 448–464) |
| 5 | Custom bullet points with accent colour | ✅ | .achievement-list li::before with --accent-color (lines 331–339) |
| 6 | No visible pagination artefacts | ✅ | Fixed page heights and page-break-after on all pages (line 358) |

---

#### US-H6: Cover Letter Tone and Relevance

All criteria are backend/generation concerns for a separate file. All marked —.

---

#### US-H7: Selected Publications

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Section heading "Selected Publications" when present | ✅ | Conditional heading (cv-template.html:634–638) |
| 2 | Each entry: authors, title, venue, year | ✅ | {{ pub.formatted_citation }} (line 643); backend formats correctly |
| 4 | Count notation "(N of M)" shown | ⚠️ | Removed per D7.4 design amendment; only heading text differentiates subset vs. full |
| 5 | Publications as final section | ✅ | Publications page (lines 628–652) rendered last |
| 6 | No entry without venue | ⚠️ | Template renders pub.formatted_citation without venue validation |
| 3 | Count matches user confirmation | — | Backend orchestrator |

---

### US-P* — Persuasion Expert

#### US-P1: Narrative Arc and Identity Alignment

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Summary opens with value-identity statement | 🔲 | No UI guidance or validation |
| 2 | At least one forward-looking statement | 🔲 | No forward-looking framing check |
| 3 | Warn if >2 equally-weighted narrative threads | 🔲 | No narrative analysis implemented |
| 4 | Zero hedging language in proposed rewrites | ⚠️ | check_hedging_language (llm_client.py:441) detects hedging; warnings surface in rewrite review (app.js:4085–4230); not applied to summary rewrites |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Hedging language detected in bullets | ✅ Present — flagged by check_hedging_language; warning shown in rewrite tab |

---

#### US-P2: Social Proof and Authority Signals

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Named organisations within first 15 words | ⚠️ | check_named_institution_position (llm_client.py:484) warns; shown in rewrite tab only |
| 2 | Publication/award omission decisions with rationale | 🔲 | No publication/award omission rationale UI |
| 5 | Flags metric loss between original and rewrite | 🔲 | No metric-loss detection |
| 6 | Quantified metrics preserved | ⚠️ | check_has_result_clause encourages metrics; no explicit preservation check |
| 3, 4 | Publication ranking and authority signals | — | Backend rank_publications_for_job exists; no UI to surface it |

---

#### US-P3: Loss-Aversion and Urgency Framing

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | CAR structure identified and proposed | ⚠️ | check_car_structure (llm_client.py:541) flags absence; informational only; no proactive CAR restructuring |
| 2 | Rewrites prefer positive-sum framing | 🔲 | No positive-sum framing check |
| 3 | Summary checked for generic filler phrases | ✅ | check_summary_generic_phrases (llm_client.py:586); threshold 1 phrase max (line 614) |

---

#### US-P4: Rhetorical Quality of Bullet Points

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Bullets begin with strong action verb | ✅ | check_strong_action_verb (llm_client.py:296) against _STRONG_ACTION_VERBS; surfaced in rewrite tab |
| 2 | Bullets >30 words flagged | ✅ | check_word_count (llm_client.py:374) flags >30 words with 'warn' severity |
| 3 | Passive voice flagged | ✅ | check_passive_voice (llm_client.py:333); surfaced in rewrite tab |
| 4 | Missing result clause flagged | ✅ | check_has_result_clause (llm_client.py:404) with 'info' severity |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Over-long bullets | ✅ Not present — check_word_count catches >30 words |
| Passive voice | ✅ Not present — check_passive_voice detects all patterns |

---

#### US-P5: Cover Letter Persuasion Architecture

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Reject draft where first word is "I" | 🔲 | No opening-pattern validation in cover letter UI (app.js:6388) |
| 2 | Company name + specific role requirement referenced | 🔲 | No validation after generation |
| 3 | Word count check; >300 words triggers flag | 🔲 | No word count validation in cover letter UI (app.js:6273–6443) |
| 4 | Closing sentence includes specific next step | 🔲 | No closing sentence validation |

---

#### US-P6: Consistency of Persuasive Register

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Clarification-answer context applied consistently across session | 🔲 | No cross-document consistency check; persuasion warnings apply only to rewrite tab |
| 2 | Cover letter vs. summary framing cross-checked | 🔲 | No cross-document validation |
| 3 | Screening answer terminology compared against CV keywords | 🔲 | Screening tab (app.js:6452–6637) generates independently; no harmonisation check |

##### Failure Modes Present

| Failure mode | Present? |
|--------------|----------|
| Summary assertive; bullets hedged | ⚠️ Partially present — hedging detected in bullets but no cross-check against summary tone |
| CV and screening answer terminology diverge | 🔲 Not present (no consistency check) |

---

### US-T* — HR / ATS

*Note: Nearly all HR/ATS acceptance criteria are backend/generation concerns (DOCX structure, font choices, heading styles). UI-relevant criteria noted below.*

#### US-T1 through US-T3: File Ingestion, Section Recognition, Contact Parsing

All criteria for these three stories are backend template and DOCX generation concerns. All marked —.

---

#### US-T4: Keyword Matching and Scoring

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Post-generation keyword check run | 🔲 | Not implemented; no keyword validation report UI; GAP-04 |
| 2 | Results displayed: keyword / section / match type | 🔲 | No validation UI |
| 3 | Warning when required keyword absent | 🔲 | No validation warning UI |
| 5 | `knowsAbout` JSON-LD verified | 🔲 | No validation UI |
| 4 | Keyword variant normalisation | — | Backend/orchestrator concern |

---

#### US-T5: Date and Employment History Parsing

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 4 | No overlapping date ranges (system validates) | 🔲 | No date validation UI |
| 1, 2, 3, 5 | Date separator, month+year, one-line header, "Present" | — | Backend template concerns |

---

#### US-T6: ATS Output Validation Report

##### Acceptance Criteria

| # | Criterion (abbreviated) | Status | Notes / Line refs |
|---|--------------------------|--------|-------------------|
| 1 | Programmatic ATS validation checks run post-generation | 🔲 | Not implemented; GAP-04 |
| 2 | Results displayed with pass/warn/fail per check | 🔲 | No validation report tab or modal |
| 3 | Fails block download | 🔲 | Download tab (index.html:150) has no validation gate |
| 4 | Warns allow download but show issue | 🔲 | No warning UI |
| 5 | Validation results in metadata.json | 🔲 | Not written by backend |

**All 16 sub-checks** (DOCX text selectability, zero tables, zero text boxes, contact in body, standard section headings, Heading 1 Word style, date format consistency, keyword presence, keyword density, JSON-LD block valid, `knowsAbout` populated, required JSON-LD fields, HTML renders correctly, PDF US Letter size, fonts embedded, no margin clipping) are **🔲 Not Implemented**. GAP-04.
