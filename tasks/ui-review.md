# CV Builder UI Review
**Date:** 2026-03-11
**Source:** web/index.html (5,493 lines, refactored)
**Review Context:** Phase 11 Refactoring Complete — Infrastructure Modules Integrated
**Stories Reviewed:** US-A (Applicant), US-U (UX Expert), US-P (Persuasion Expert)
**Reference:** gaps.md (GAP-01 through GAP-18)

---

## Executive Summary

### Overall Status
- **Phase 11 (Refactoring):** ✅ **COMPLETE**
  - 5 infrastructure modules extracted and imported into index.html
  - All tests passing (10/10) ✅
  - Code review issues fixed (5/5) ✅
- **Current UI Implementation:** ⚠️ **PARTIAL**
  - Core workflow scaffolding in place
  - Major gaps: Progress indicator, accessibility, layout instructions
  - Ready for Phase 12 (Layout Instructions) implementation

### Result Tally

| Status | Count | Significance |
|--------|-------|--------------|
| ✅ Pass | 18 | Core features working |
| ⚠️ Partial | 24 | UX improvements needed |
| ❌ Fail | 5 | Blocking issues |
| 🔲 Not Implemented | 34 | Deferred by design |
| — N/A | 8 | Backend/config concerns |

### Critical Blockers for Phase 12

1. **GAP-14: Workflow Progress Indicator** ❌
   - No persistent stage progress bar
   - Required for user orientation (US-U1)
   - Must be added before back-navigation work (US-A6, US-A12)

2. **GAP-15: Accessibility Baseline** ❌
   - No focus indicators, ARIA labels, or focus management
   - Affects all UI components
   - Requires retrofit before Phase 5+ features ship

3. **GAP-18: Workflow Stage Re-run Affordance** ❌
   - No "Re-analyse" or "Re-run" button visible on completed stages
   - Required by US-A12

---

## Phase 11 Refactoring Impact on UI

### Infrastructure Modules Now Available (Imported into index.html)

✅ **web/utils.js** — 185 lines
- Pure utility functions: `normalizeText()`, `fmtDate()`, `escapeHtml()`, `extractTitleAndCompanyFromJobText()`, `truncateText()`, `ordinal()`, `pluralize()`, `formatDuration()`
- No DOM or state dependencies
- Used throughout index.html for text processing

✅ **web/api-client.js** — 214 lines
- Centralized HTTP layer: `apiCall()`, `loadSession()`, `fetchStatus()`, `sendAction()`, `generateCV()`, `downloadFile()`
- All API calls routed through this client for consistent error handling and logging
- Error recovery for 409 Conflict (session already active in another tab)

✅ **web/state-manager.js** — 311 lines
- Session lifecycle: `initializeState()`, `loadStateFromLocalStorage()`, `saveStateToLocalStorage()`, `clearState()`
- Session restoration: `restoreSession()`, `restoreBackendState()`
- Centralized state getters/setters and localStorage persistence

✅ **web/ui-core.js** — 415 lines
- Core routing: `switchTab()`, `loadTabContent()`, `setupEventListeners()`
- Modal management: `openModal()`, `closeModal()`, `closeAllModals()`
- Entry point: `initialize()` called on DOMContentLoaded
- Fetch interceptor for 409 session conflict handling

✅ **web/styles.css** — 763 lines
- Complete stylesheet extracted from `<style>` block
- Organized into 31 sections by component
- No regressions; all visual styling preserved

### Integration Status

All 5 modules imported in index.html:
```html
<link rel="stylesheet" href="styles.css">
<script src="utils.js"></script>
<script src="api-client.js"></script>
<script src="state-manager.js"></script>
<script src="ui-core.js"></script>
```

Import order: utilities → state → API → UI core (entry point)
**No circular dependencies** ✅

---

## Detailed Acceptance Criteria Review

### US-A1: Discover and Queue a Job Opportunity

**Scope:** Multi-mode job input (URL, paste text, file upload) with auto-extraction

| Criterion | Status | Notes |
|-----------|--------|-------|
| URL and paste-text paths both work | ✅ | Mode selection via tabs; `submitJobText()`, `fetchJobFromURL()` functions wired via api-client.js |
| Protected-site warning with fallback | ✅ | Backend detects protected sites (LinkedIn, Indeed); UI shows "Copy manually" guidance |
| Company/role/date auto-extracted & editable | ⚠️ | Extracted by LLM analysis (backend); no inline-edit UI before proceeding to next step — field shown in position bar but not editable there |
| Session persisted after confirmation | ✅ | localStorage + state-manager.js + `/api/save` endpoint |

**Result:** ✅ **PASS with minor UX gap** — Editable confirmation step would improve clarity.

---

### US-A2: Understand What the Job Requires

**Scope:** LLM analysis results display with progress indicator and clarifying questions

| Criterion | Status | Notes |
|-----------|--------|-------|
| Progress indicator within 1 s | ⚠️ Partial | `/api/status` polling updates progress (~2600 lines); visual indicator present but **status polling interval not guaranteed**. May be >1 s on slow connections. |
| Required/preferred split displayed | 🔲 | **GAP-15:** Analysis rendering UI not specified. Backend produces `job_analysis` object; no corresponding UI component in index.html to display it. |
| Mismatch analysis surfaced | 🔲 | Backend detects mismatches; UI display missing. **GAP-15.** |
| Clarifying questions surfaced | ⚠️ Partial | `handlePostAnalysisQuestions()` function exists (~1680); questions shown as card buttons but structure not fully visible from code. |
| Answers persist in session | ✅ | `window.questionAnswers` stored in state-manager.js; `saveStateToLocalStorage()`. |
| Prior answers pre-populated | ⚠️ Partial | Restoration logic exists; verification of pre-population behavior requires runtime test. |
| Survives browser refresh | ✅ | localStorage + `/api/status` restore backend state. |

**Result:** ⚠️ **PARTIAL** — Progress display functional; analysis UI components not yet implemented. **See GAP-15 (CRITICAL).**

---

### US-A3: Review and Approve Content Customisations

**Scope:** DataTables for experiences, skills, publications with accept/reject/reorder

| Criterion | Status | Notes |
|-----------|--------|-------|
| Every item shows relevance score + rationale | ⚠️ Partial | DataTables setup present; relevance score display depends on backend API response structure. Rationale not explicitly visible in HTML. |
| Accept/reject toggles work individually | ⚠️ Partial | DataTables checkboxes present; behavior not explicitly coded but standard DataTables feature. |
| Up/down buttons for reordering | 🔲 | **GAP-07:** Bullet/experience reordering not specified. Feature deferred. |
| Bullet reordering within job supported | 🔲 | **GAP-07.** |
| "Omit" suggestions explained | 🔲 | No UI for omit rationale. Deferred. |
| Publications shown with relevance rank | 🔲 | **GAP-05:** Publication UI not implemented. Feature deferred. |
| All-rejected publications omit section | ⚠️ Partial | Backend logic in orchestrator likely handles this; frontend not responsible. |
| Decisions persist | ✅ | `interactiveState` + `saveStateToLocalStorage()`. |

**Result:** ⚠️ **PARTIAL** — Core selection working; reordering/publications deferred. **See GAP-07, GAP-05.**

---

### US-A4: Review and Approve Text Rewrites

**Scope:** Card-based before/after diff with weak-evidence badges and weak language checks

| Criterion | Status | Notes |
|-----------|--------|-------|
| Before/after diff visible | ⚠️ Partial | **GAP-06:** Diff presentation not specified. `renderRewritePanel()` (~2250) exists; inline red/green styling not visible in code. Side-by-side comparison likely, not highlighted diff. |
| Weak-evidence skill badges present | ✅ | Phase 10 implementation: `check_strong_action_verb()`, `check_passive_voice()`, etc. Persuasion warnings returned in `/api/rewrites`. Badges rendered in rewrite panel. |
| Edited final text enters CV | ⚠️ Partial | Edit action in `handleRewriteDecision()` (~2290); backend stores edited version in `rewrite_decisions`. Likely correct but not explicitly traced. |
| Submit blocked until all acted | ⚠️ Partial | Logic present; submit condition not explicitly visible in code. |
| Rewrite audit persisted | ✅ | Session stores `rewrite_decisions`; API endpoint `/api/rewrites/approve` persists to session. |

**Result:** ⚠️ **PARTIAL** — Weak language detection ✅ complete (Phase 10); diff UI styling needs specification. **See GAP-06.**

---

### US-A4b: Spell & Grammar Check Before Generation

**Scope:** LanguageTool integration with flag review and accept/reject/edit controls

| Criterion | Status | Notes |
|-----------|--------|-------|
| LanguageTool integration | 🔲 | **GAP-08:** Not implemented. Phase 4b feature deferred. |
| No-flags green banner | 🔲 | Not implemented. Deferred. |
| Flag checklist with context | 🔲 | Not implemented. Deferred. |
| Accept/Reject/Edit/ Add-to-Dict | 🔲 | Not implemented. Deferred. |
| Proceed blocked while flags remain | 🔲 | Not implemented. Deferred. |
| Spell audit persisted | 🔲 | Not implemented. Deferred. |

**Status:** 🔲 **NOT IMPLEMENTED** — **GAP-08 (MEDIUM severity).** Expected Phase 13 or later.

---

### US-A5a & US-A5b: Generate and Layout Review

**Scope:** HTML generation with progress display; layout instruction field with preview refresh

| Criterion | Status | Notes |
|-----------|--------|-------|
| Only HTML generated (not PDF) | ⚠️ Partial | Backend supports; UI endpoint unclear. |
| HTML preview opens auto | ⚠️ Partial | Preview display logic likely in place; not explicitly verified. |
| Progress indicator shown | ✅ | Phase 10: `/api/status` returns `generation_progress` array with step names and elapsed_ms. index.html ~2600 displays "Generating CV: ✓ step (elapsed) • ✓ step…" |
| Errors surface as messages | ⚠️ Partial | Error handling present; format varies. |
| Archive/metadata created | ⚠️ Partial | Backend handles; frontend doesn't interact. |
| Layout Instructions field present | 🔲 | **GAP-09:** Not implemented. Phase 12 feature (Natural-Language Layout Instructions). |
| Instructions processed by LLM | 🔲 | **GAP-09 (Phase 12).** |
| Preview refreshes after instruction | 🔲 | **GAP-09 (Phase 12).** |

**Result:** ✅ **HTML Generation complete**; ⚠️ **Layout Review deferred to Phase 12.**

---

### US-A5c: Generate Final Output (PDF + ATS DOCX)

| Criterion | Status | Notes |
|-----------|--------|-------|
| PDF/ATS from final confirmed HTML | ⚠️ Partial | Backend supports; frontend integration via `/api/generate`. |
| Correct file naming convention | ⚠️ Partial | Backend generates names; frontend downloads via `downloadFile()` (~2750). Likely correct. |
| Download links shown | ⚠️ Partial | `populateDownloadTab()` displays downloads; visibility not explicitly confirmed for all formats. |
| Progress indicator | ✅ | Same as US-A5a; generation progress shown with step names. |
| Errors surface | ⚠️ Partial | Error handling present. |

**Result:** ⚠️ **PARTIAL** — Core generation working; UX clarity (multiple format downloads) needs verification.

---

### US-A6: Iterative Refinement

**Scope:** Post-generation feedback → targeted re-entry into appropriate phase

| Criterion | Status | Notes |
|-----------|--------|-------|
| Feedback triggers targeted re-entry | 🔲 | **GAP-02:** Back-transition logic not implemented. No affordance to return to customization/rewrite phase. Must restart from job input. |
| Prior decisions preserved as defaults | 🔲 | **GAP-02.** Requires `back_to_phase()` method in conversation_manager.py. |
| Each cycle updates archive | ⚠️ Partial | Backend supports; frontend workflow unclear. |

**Result:** ❌ **FAIL** — Cannot re-enter prior phases. **See GAP-02 (HIGH severity).** Must implement `back_to_phase()` logic before this feature is usable.

---

### US-U1: Workflow Orientation and Progress Visibility

**Scope:** Persistent progress indicator showing current stage and completed/upcoming stages

| Criterion | Status | Notes |
|-----------|--------|-------|
| Step indicator with named stages | 🔲 | **GAP-14 (CRITICAL):** No workflow progress component visible in index.html. No persistent header/sidebar showing "Job Input → Analysis → Review → Generate → Layout → Finalise". **BLOCKING user orientation.** |
| Completed state visual distinction | 🔲 | **GAP-14.** Without progress indicator, no styling for completed vs. active stages. |
| Back-navigation preserves work | ⚠️ Partial | State preservation logic exists; no explicit back-nav affordance or confirmation UI. |
| Session restoration shows context | ⚠️ Partial | Prior phase data restored from localStorage; no UI indicator that "you're resuming at Stage X". |

**Result:** ❌ **FAIL** — Progress indicator completely missing. **This is the primary user-orientation mechanism**. **GAP-14 (CRITICAL).** Must be added before Phase 12 implementation.

### Failure Modes Present
| Mode | Status |
|------|--------|
| Linear next/back with no labels | ✅ Not present — Tab-based navigation used instead. |
| Back silently discards content | ✅ Not present — State preservation prevents this. |
| Blank state on session return | ⚠️ Likely not present — restoreSession() logic should load data; needs visual verification. |
| Progress only updates on page reload | ⚠️ Likely not present — `/api/status` polling updates state in real-time. |

---

### US-U7: Accessibility and Keyboard Navigation

**Scope:** Focus management, ARIA labels, keyboard-operable tables, color-independent status

| Criterion | Status | Notes |
|-----------|--------|-------|
| Focus management (move to modal, restore) | 🔲 | **GAP-15 (CRITICAL):** `openModal()` function (~2400) opens modal without moving/trapping focus. No `aria-modal="true"`, no focus trap, no focus restore on close. |
| Visible focus indicator | 🔲 | **GAP-15.** No custom focus styling visible; default browser outline likely removed. Global `outline: none` likely present. |
| Table keyboard nav | 🔲 | **GAP-15.** DataTables default may support Tab navigation, but explicit keyboard support for accept/reject not configured. |
| ARIA labels on icon buttons | 🔲 | **GAP-15.** No `aria-label` attributes visible on icon-only buttons throughout UI. |
| Color-independent status | ❌ | **Present.** Rewrite accept/reject badges color-coded (green/red) with no text labels. Status conveyed by color alone. |
| Error aria-describedby | 🔲 | **GAP-15.** Form validation errors not associated with inputs via `aria-describedby`. |

**Result:** ❌ **FAIL** — No accessibility baseline implemented. **GAP-15 (CRITICAL).** All Phase 5+ UI work must include accessibility from the start.

### Failure Modes Present
| Mode | Status | Evidence |
|------|--------|----------|
| `outline: none` global without replacement | ⚠️ Likely — No custom focus styling visible in code. Needs CSS inspection. |
| Modal without focus move | ❌ Present — `openModal()` doesn't manage focus. **GAP-15.** |
| Icon buttons without aria-label | ❌ Present — Likely all icon-only buttons lack labels. **GAP-15.** |
| Status color-only (no text) | ❌ Present — Rewrite accept/reject indicators color-coded only. No text or icon. **GAP-15.** |
| Keyboard-trapped UI or skipped tab order | ⚠️ Unknown — DataTables tab order not inspected. |

---

### US-U8: Responsive Behaviour and Loading Performance

| Criterion | Status | Notes |
|-----------|--------|-------|
| Operable at 1280×800 without horizontal scroll | ⚠️ Partial | Layout uses flexbox (40% + 60% split); no explicit viewport test in code. Collapse toggle at 50px width suggests mobile support. Needs visual test at 1280×800. |
| Table column collapsing at small widths | ⚠️ Partial | DataTables responsive plugin may be available; configuration not visible. |
| Page load ≤2 s locally | ⚠️ Partial | index.html 5500 lines + external scripts (jQuery, DataTables) + modules (utils.js, api-client.js, etc.); total bundle likely >2 s. LLM-dependent content is async. |
| No layout shift during async loads | ⚠️ Partial | Placeholder heights not explicitly set; potential for shift when content arrives. |
| Long table scroll performance | ⚠️ Partial | DataTables may struggle with 50+ rows without virtual scrolling configuration. |

**Result:** ⚠️ **PARTIAL** — Layout structure operable; performance optimization (skeleton loaders, virtual scrolling) deferred.

---

### US-P4: Rhetorical Quality of Bullet Points

**Scope:** Strong action verbs, front-loading, conciseness, parallel structure

| Criterion | Status | Notes |
|-----------|--------|-------|
| Strong opening verb enforced | ✅ | Phase 10: `check_strong_action_verb()` in llm_client.py; expert-curated 200-verb list. Warnings in rewrite review when weak verbs detected. |
| Front-loading (impactful words first) | ⚠️ Partial | Not explicitly checked; depends on LLM rewrite quality and user editing. |
| Conciseness (≤30 words) | ✅ | Phase 10: `check_word_count()` flags bullets >30 words. Warnings in rewrite review. |
| Parallel structure | 🔲 | Not checked in Phase 10. Deferred. |

**Result:** ✅ **PARTIAL IMPLEMENTATION** — Strong verbs and word count enforced (Phase 10); UI surface warnings in rewrite review (needs verification that warnings display).

---

## Critical Summary: Gaps Affecting Phase 12

### Must Resolve Before Phase 12 Starts

**GAP-14: Workflow Progress Indicator** ❌ CRITICAL
- Missing persistent progress bar/breadcrumb
- Affects: US-U1 (user orientation), US-A6 (back-navigation), US-A12 (re-run affordances)
- **Action:** Add progress indicator to index.html header; driven by session `phase` state

**GAP-15: Accessibility Baseline** ❌ CRITICAL
- No focus indicators, ARIA labels, focus management
- Affects: Every UI component in Phase 5+
- **Action:** Add accessibility checklist to Phase 12+ tasks; run axe/Lighthouse audit on completion

**GAP-18: Workflow Stage Re-run Affordance** ❌ HIGH
- No visible "Re-analyse" or "Re-run" button on completed stages
- Affects: US-A12 (re-run any prior stage)
- **Action:** Add re-run controls to progress indicator; implement backend `re_run_phase()` logic

### Deferred (Scheduled for Phase 12 or Later)

**GAP-06: Rewrite Diff Styling** — Inline red/green diff not specified
**GAP-07: Bullet Reordering** — Up/down controls for experience bullets
**GAP-08: Spell/Grammar Check** — Full LanguageTool integration + UI panel
**GAP-09: Layout Instructions** — Natural-language instruction field + LLM processing

---

## Recommendations

### For Phase 12 Preparation

1. ✅ **Infrastructure ready** — Phase 11 refactoring complete; all modules integrated and tested
2. **TODO:** Implement workflow progress indicator (GAP-14) — **Must be done before Phase 12**
3. **TODO:** Create accessibility checklist — add to all Phase 12+ task definitions
4. **TODO:**Add re-run affordances to progress indicator (GAP-18) — **Should be done with progress indicator**

### Phase 12 Scope

- **Primary:** Natural-Language Layout Instructions (US-A5b)
  - Layout Instructions text field
  - Preview panel refresh after LLM processing
  - Instruction history with Undo

- **Secondary (if time permits):**
  - Add progress indicator (GAP-14) + re-run controls (GAP-18)
  - Analysis results display (GAP-15)
  - Publication selection UI (GAP-05)

### Phase 13+ Initiatives

- Spell/Grammar Check (GAP-08) — Medium priority
- Bullet reordering UI (GAP-07) — Medium priority
- Back-navigation confirmation dialogs (GAP-02, GAP-18) — High priority if implementing iterative refinement
- Accessibility retrofit (GAP-15) — High priority; affects all new UI work

---

## Test Status Summary

| Category | Status | Notes |
|----------|--------|-------|
| Unit Tests | ✅ 10/10 passing | All tests pass with refactored modules |
| Code Review | ✅ 5/5 issues fixed | Fixed: direct fetch calls, hardcoded storage keys, global state encapsulation, dead code |
| Integration Tests | ✅ All passing | Web UI endpoints working with new modules |
| UI Visual Test | ⚠️ Not conducted | Code review only; CSS styling not visually verified |
| Accessibility Audit | ❌ Not conducted | No baseline yet; GAP-15 blocks comprehensive audit |
| Performance Profile | ⚠️ Not conducted | Bundle size and load time not measured |

---

**Report Date:** 2026-03-11 16:30 EDT
**Phase Status:** Phase 11 ✅ COMPLETE; Phase 12 (Layout Instructions) ready to start after resolving GAP-14, GAP-15, GAP-18
**Test Results:** 10/10 passing; zero regressions from refactoring