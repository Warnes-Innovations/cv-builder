# app.js Modular Split — Work Tracking & Design Decisions

## Overview

Split `web/app.js` (10,451 lines, 342 functions) into 28 focused ES modules
bundled by esbuild. All exports are assigned to `globalThis` via `web/src/main.js`
so `onclick="..."` HTML inline handlers continue working unchanged.

**Branch**: `devel`
**Started**: 2026-03-20
**Completed**: —

---

## Design Decisions

### D1 — Module format
Each split file is an ES module (`export { ... }` at the bottom).
`web/src/main.js` imports all of them with `import * as X from '...'` and calls
`Object.assign(globalThis, X)` so every exported name is available globally.
**Why**: Preserves all `onclick="fn()"` inline handlers with zero HTML changes.

### D2 — Inline event handlers
`index.html` and HTML strings generated inside app.js both use bare `onclick="fn()"`.
Because every export lands on `window`, no handler needs updating.
Any function NOT exported (prefixed `_` and internal-only) can stay unexported.

### D3 — Shared mutable state
Module-level `let` / `const` that is read/written by multiple modules (e.g.
`userSelections`, `pendingRecommendations`, `rewriteDecisions`) stays in the
owning module and is exported as a plain object reference. Other modules
reference the global via `window.userSelections` (already the existing pattern).

### D4 — `app.js` becomes the orchestrator
The new `app.js` (≤300 lines) contains only `init()` and top-level event-wiring.
All domain logic moves to domain modules. `init()` remains the
DOMContentLoaded entry point (called from `ui-core.js`'s handler).

### D5 — Build output
Output file stays `web/bundle.js` (renamed in Phase 2). No additional rename needed.

### D6 — Test placement
New unit tests go in `tests/js/<module-name>.test.js`.
Tests use Vitest + jsdom (matching existing suite).
Each test file imports directly from the source `.js`, not from the bundle.

### D7 — jQuery / DataTables dependency
Review modules call `$.fn.DataTable` etc. Tests that touch DataTables-dependent
code mock `$` via `vi.stubGlobal`. Modules that have no jQuery dependency do not
stub it.

### D8 — Circular-dependency avoidance rule
If module A needs a function from module B AND B needs something from A,
extract the shared piece to a lower-level module (validators or ui-helpers).

### D9 — Function name collisions
A small number of function names appear more than once in app.js (e.g. an
earlier `formatSessionPhaseLabel` stub vs the real one in utils.js). The version
in utils.js is canonical; the app.js duplicate is deleted when the module is split.

---

## Dependency Order (bottom → top)

```
Tier 0 (no deps):  validators · recommendation-helpers · ui-helpers (app-side)
Tier 1:            fetch-utils · message-queue
Tier 2:            auth-provider · ats-refinement · session-actions · job-analysis
Tier 3:            session-manager · job-input · message-dispatch · questions-panel
Tier 4:            review-table-base
Tier 5:            experience-review · skills-review · achievements-review
                   summary-review · publications-review
Tier 6:            rewrite-review · spell-check · workflow-steps · master-cv
                   cover-letter · screening-questions · finalise
Tier 7:            session-switcher-ui
Tier 8:            app.js (orchestrator)
```

---

## Module Checklist

Status key: `[ ]` pending · `[~]` in progress · `[x]` done

### Tier 0

- [x] **M01 — `web/validators.js`** (~70 lines)
  - Functions: `parseStatusResponse`, `parseSessionListResponse`,
    `parseRewritesResponse`, `parseMessageResponse`
  - Tests: `tests/js/validators.test.js`
  - Notes: pure functions, no DOM, no fetch

- [x] **M02 — `web/recommendation-helpers.js`** (~300 lines)
  - Functions: `_findExpRec`, `getExperienceRecommendation`, `getConfidenceLevel`,
    `getExperienceReasoning`, `_findSkillRec`, `getSkillRecommendation`,
    `getSkillConfidence`, `getSkillReasoning`, `getAchievementRecommendation`,
    `getAchievementConfidence`, `getAchievementReasoning`, `_parseConfidence`,
    `buildFallbackPostAnalysisQuestions`
  - Tests: `tests/js/recommendation-helpers.test.js`
  - Notes: pure functions, no DOM, no fetch

- [x] **M03 — `web/ui-helpers.js`** (~400 lines)
  - Functions: `showToast`, `showAlertModal`, `closeAlertModal`, `showConfirmModal`,
    `closeConfirmModal`, `toggleChat`, `updateActionButtons`, `normalizeText`
  - Constants: `_confirmResolve`, `_STAGE_BUTTONS`, `_STAGE_BUTTON_MAP`
  - Tests: `tests/js/ui-helpers.test.js`
  - Notes: DOM-only, no fetch; `normalizeText` already in utils.js — delete dup

### Tier 1

- [x] **M04 — `web/fetch-utils.js`** (~200 lines)
  - Functions: `llmFetch`, `abortCurrentRequest`, `_updateLLMStatusBar`,
    `_refreshContextStats`, `_shouldHandleBusyConflict`
  - Constants: `SESSION_PHASE_LABELS`, `_conflictRetryQueue`, `_llmStartTime`
  - Tests: `tests/js/fetch-utils.test.js`
  - Notes: wraps `apiCall`; abort controller; conflict retry queue

- [x] **M05 — `web/message-queue.js`** (~250 lines)
  - Functions: `appendMessage`, `appendMessageHtml`, `appendRawHtml`,
    `appendLoadingMessage`, `removeLoadingMessage`, `appendRetryMessage`,
    `appendFormattedAnalysis`, `appendFormattedResponse`, `setLoading`,
    `_flushMessageQueue`
  - Constants: `_messageQueue`
  - Tests: `tests/js/message-queue.test.js`
  - Notes: DOM only; `setLoading` also used by api-client.js (keep export)

### Tier 2

- [x] **M06 — `web/auth-provider.js`** (~150 lines)
  - Functions: `openCopilotAuthModal`, `closeCopilotAuthModal`, `openAuthGitHub`,
    `updateAuthBadge`, `formatProviderLabel`
  - Constants: `_authPollTimer`
  - Tests: `tests/js/auth-provider.test.js`

- [x] **M07 — `web/ats-refinement.js`** (~100 lines)
  - Functions: `updateAtsBadge`, `refreshAtsScore`, `scheduleAtsRefresh`
  - Constants: `_atsRefreshTimer`
  - Tests: `tests/js/ats-refinement.test.js`

- [x] **M08 — `web/session-actions.js`** (~200 lines)
  - Functions: `sendAction`, `saveSession`, `resetSession`, `updatePositionTitle`, `_ACTION_LABELS`
  - Tests: `tests/js/session-actions.test.js`

- [x] **M09 — `web/job-analysis.js`** (~150 lines)
  - Functions: `analyzeJob`, `normalizePostAnalysisQuestions`,
    `extractStructuredQuestionsFromAssistantText`, `mergePostAnalysisQuestions`
  - Tests: `tests/js/job-analysis.test.js`
  - Notes: calls `extractTitleAndCompanyFromJobText` from utils.js

### Tier 3

- [x] **M10 — `web/session-manager.js`** (~1200 lines)
  - Functions: `createNewSessionAndNavigate`, `createNewSessionInNewTab`,
    `ensureSessionContext`, `restoreSession`, `restoreBackendState`,
    `loadSessionFile`, `_claimCurrentSession`, `openSavedSessionFromLanding`,
    `openActiveSessionFromLanding`, `showSessionsLandingPanel`,
    `promptRenameCurrentSession`, `saveTabData`, `restoreTabData`,
    `_getCurrentSessionIdValue`, `_getCurrentOwnerTokenValue`,
    `buildSessionSwitcherLabel`, `getActiveSessionOwnershipMeta`
  - Tests: `tests/js/session-manager.test.js`

- [x] **M11 — `web/job-input.js`** (~900 lines)
  - Functions: `populateJobTab`, `showLoadJobPanel`, `switchInputMethod`,
    `showJobInput`, `handleFileDrop`, `handleFileSelected`, `uploadJobFile`,
    `clearSelectedFile`, `_loadServerJobFile`, `loadItemFromRow`, `submitJobText`,
    `_updatePasteCharCount`, `_validatePasteField`, `fetchJobFromURL`,
    `_validateURLField`, `showProtectedSiteModal`, `clearJobInput`, `clearURLInput`,
    `_showFieldError`, `_clearFieldError`
  - Constants: `PASTE_MIN_CHARS`, `_pendingUploadFile`
  - Tests: `tests/js/job-input.test.js`

- [x] **M12 — `web/message-dispatch.js`** (~400 lines)
  - Functions: `sendMessage`, `_handleLLMMessage`, `_showIntakeConfirmCard`,
    `_submitIntakeCard`, `_skipIntakeCard`, `_proceedAfterIntake`,
    `_offerPriorClarifications`, `_dismissPriorClarifications`,
    `_loadPriorClarifications`
  - Constants: `_messageHandlers`
  - Tests: `tests/js/message-dispatch.test.js`

- [x] **M13 — `web/questions-panel.js`** (~500 lines)
  - Functions: `populateQuestionsTab`, `buildClarifyingQuestionsPanel`,
    `renderClarifyingQuestionsPanel`, `toggleQuestionAnswer`,
    `updateQuestionProgress`, `handleQuestionResponse`, `draftQuestionAnswer`,
    `selectChipAnswer`, `submitQuestionAnswers`, `_showQuestionError`,
    `_clearQuestionError`, `showQuestionHintModal`, `closeQuestionHintModal`
  - Tests: `tests/js/questions-panel.test.js`

### Tier 4

- [x] **M14 — `web/review-table-base.js`** (~800 lines)
  - Functions: `switchTab`, `loadTabContent`, `populateAnalysisTab`,
    `handleCustomizationResponse`, `showTableBasedReview`, `populateReviewTab`,
    `populateCustomizationsTabWithReview`, `switchReviewSubtab`, `_loadReviewPane`,
    `updateInclusionCounts`, `_updatePageEstimate`
  - State: `userSelections` (module-level); `_activeReviewPane`,
    `_reviewPaneLoaded`, `_experiencesOrdered`, `_savedDecisions`,
    `pendingRecommendations` all remain on `window`
  - Tests: `tests/js/review-table-base.test.js` — 44 tests

### Tier 5

- [x] **M15 — `web/experience-review.js`** (~600 lines)
  - Functions: `getExperienceDetails`, `buildExperienceReviewTable`,
    `_renderExperienceTable`, `moveExperienceRow`,
    `handleExperienceResponse`, `submitExperienceDecisions`
  - Note: `handleActionClick`, `bulkAction`, `_resolvedExpAction`,
    `_resolvedSkillAction` added to M14 (shared by exp + skills)
  - Tests: `tests/js/experience-review.test.js` — 20 tests

- [x] **M16 — `web/skills-review.js`** (~500 lines)
  - Functions: `buildSkillsReviewTable`, `_renderSkillsTable`,
    `submitSkillDecisions`, `handleSkillsResponse`, `moveSkillRow`
  - Tests: `tests/js/skills-review.test.js` — 20 tests

- [x] **M17 — `web/achievements-review.js`** (~800 lines)
  - Functions: `fetchJsonWithTimeout`, `buildAchievementsReviewTable`,
    `_renderAchievementsReviewTable`, `bulkAchievementAction`,
    `handleAchievementAction`, `submitAchievementDecisions`,
    `moveAchievementRow`, `buildAchievementsEditor`,
    `renderAchievementEditorRows`, `updateAchievementText`,
    `moveAchievement`, `deleteAchievement`, `addAchievementRow`,
    `rewriteAchievementWithLLM`, `aiRewriteTopLevelAchievement`,
    `_openRewriteModal`, `_updateRewriteAcceptBtn`, `_recordRewriteOutcome`,
    `_runRewrite`, `saveTopLevelAchievementField`, `deleteTopLevelAchievement`,
    `saveSuggestedAchievementField`, `aiRewriteSuggestedAchievement`,
    `moveSuggestedAchievementRow`, `deleteSuggestedAchievement`,
    `saveAchievementEditsAndContinue`
  - State: `_rewriteSuggestionHistory`, `_lastRewriteLogId`, `_rewriteCallbacks` (module-level)
  - Tests: `tests/js/achievements-review.test.js` — 37 tests
  - Note: `suggested-achievements.test.js` (uses eval/require) can now be rewritten
    since `saveSuggestedAchievementField`, `moveSuggestedAchievementRow`,
    `deleteSuggestedAchievement` are in this module

- [ ] **M18 — `web/summary-review.js`** (~300 lines)
  - Functions: `buildSummaryFocusSection`, `renderSummaryFocusSection`,
    `updateSummarySelection`
  - Tests: `tests/js/summary-review.test.js`

- [ ] **M19 — `web/publications-review.js`** (~250 lines)
  - Functions: `buildPublicationsReviewTable`, `renderPublicationsTable`,
    `updatePublicationDecision`, `submitPublicationDecisions`
  - Tests: `tests/js/publications-review.test.js`

### Tier 6

- [ ] **M20 — `web/rewrite-review.js`** (~1200 lines)
  - Functions: `fetchAndReviewRewrites`, `_renderRewriteReviewPanel`,
    `_renderRewriteCard`, `_renderCardHeader`, `_renderCardContent`,
    `acceptRewrite`, `rejectRewrite`, `editRewrite`, `openEditModal`,
    `submitRewriteEdit`, `showRewriteEditModal`, `closeRewriteEditModal`,
    `_validateRewriteText`, `showPersuasionWarnings`,
    `acknowledgePersuasionWarnings`, `harvestDecisions`,
    `_formatHarvestedDecisions`
  - State: `rewriteDecisions`, `_rewritePanelCache`, `_rewriteCallbacks`
  - Tests: `tests/js/rewrite-review.test.js`

- [ ] **M21 — `web/spell-check.js`** (~330 lines)
  - Functions: `populateSpellCheckTab`, `_renderSpellCheckPanel`,
    `submitSpellCheckDecisions`, `handleSpellingSuggestion`,
    `acceptSpellingSuggestion`, `rejectSpellingSuggestion`
  - State: `spellAudit`
  - Tests: `tests/js/spell-check.test.js`

- [ ] **M22 — `web/workflow-steps.js`** (~400 lines)
  - Functions: `updateWorkflowSteps`, `handleStepClick`, `backToPhaseWithFeedback`,
    `backToPhase`, `confirmReRunPhase`, `reRunPhase`, `_showReRunConfirmModal`,
    `_highlightChangedItems`, `_markChanged`, `showBulletReorder`, `moveBullet`,
    `_updateBulletArrows`, `_applyBulletOrder`, `saveBulletOrder`, `resetBulletOrder`
  - Constants: `_STEP_ORDER`, `_STEP_DISPLAY`, `_ACTION_LABELS`
  - Tests: `tests/js/workflow-steps.test.js`

- [ ] **M23 — `web/master-cv.js`** (~1400 lines)
  - Functions: `populateMasterTab`, and all `_render*`, `show*Modal`, `close*Modal`,
    `save*`, `delete*`, `edit*` functions for personal-info, experience, skills,
    education, awards, achievements, summaries
  - Tests: `tests/js/master-cv.test.js`

- [ ] **M24 — `web/cover-letter.js`** (~250 lines)
  - Functions: `populateCoverLetterTab`, `generateCoverLetter`, `saveCoverLetter`,
    `_renderConsistencyReport`, `_validateCoverLetter`, `_debouncedValidateCL`,
    `_getCompanyNameForCL`
  - State: `_coverLetterPriorSessions`, `_clValidateTimer`
  - Constants: `COVER_LETTER_TONES`
  - Tests: `tests/js/cover-letter.test.js`

- [ ] **M25 — `web/screening-questions.js`** (~300 lines)
  - Functions: `populateScreeningTab`, `parseScreeningQuestions`,
    `renderQuestionBlock`, `selectFormat`, `_getSelectedFormat`, `togglePriorUse`,
    `updateExpSelection`, `searchForQuestion`, `_fmtLabel`,
    `generateScreeningResponse`, `saveScreeningResponses`
  - State: `_screeningState`
  - Tests: `tests/js/screening-questions.test.js`

- [ ] **M26 — `web/finalise.js`** (~150 lines)
  - Functions: `populateGenerateTab`, `downloadCV` (and any remaining
    generation-tab helpers)
  - Tests: `tests/js/finalise.test.js`
  - Notes: generation tab + download; `completeLayoutReview` is in
    layout-instruction.js (already bundled)

### Tier 7

- [ ] **M27 — `web/session-switcher-ui.js`** (~500 lines)
  - Functions: `openSessionsModal`, `closeSessionsModal`, `_renderSessionsModalBody`,
    `loadSessionAndCloseModal`, `newSessionFromModal`, `startSessionModalRename`,
    `cancelSessionModalRename`, `submitSessionModalRename`,
    `_deleteSessionFromModal`, `_refreshTrashBadge`, `openTrashView`,
    `closeTrashView`, `_renderTrashView`, `restoreFromTrash`, `deleteForever`,
    `emptyTrash`, `_renderActiveSessionRows`, `_renderSavedSessionRows`,
    `_renderSessionSwitcherSections`, `_updateSessionSwitcherHeader`,
    `showOwnershipConflictDialog`, `closeOwnershipConflictDialog`,
    `showSessionConflictBanner`, `conflictRetryNow`, `conflictDismiss`
  - Tests: `tests/js/session-switcher-ui.test.js`

### Tier 8

- [ ] **M28 — `web/app.js`** (new orchestrator, ~300 lines)
  - Contains: `init()`, global state declarations, `setupEventListeners` wiring
  - Imports: all 27 modules above
  - Tests: `tests/js/app-init.test.js`
  - Notes: replaces the current 10,451-line monolith

---

## Progress Log

| Date | Modules completed | Notes |
|------|------------------|-------|
| 2026-03-20 | — | Plan created, Phase 2 bundle complete |
| 2026-03-20 | M01 M02 M03 | Tier 0 complete: validators, recommendation-helpers, ui-helpers (76 tests) |
| 2026-03-20 | M04 M05 | Tier 1 complete: fetch-utils, message-queue (51 tests). Note: fetch interceptor IIFE captures window.fetch at import time — tests must hold reference to mock before vi.resetModules()+import. |
| 2026-03-20 | M06–M09 | Tier 2 complete: auth-provider, ats-refinement, session-actions, job-analysis (59 tests). |
| 2026-03-20 | layout-instruction.js | **Not an app.js split module** (already bundled in Phase 2). Rewrote test as ES module after main-merge dropped eval-based version. Added helper exports: showProcessing, showConfirmationMessage, renderInstructionHistory, addToInstructionHistory, undoInstruction (18 tests). |
| 2026-03-20 | — | main-merge note: tests/js/suggested-achievements.test.js uses require('../../web/app.js') — must be rewritten when saveSuggestedAchievementField / moveSuggestedAchievementRow / deleteSuggestedAchievement move to achievements-review.js (M17). |

---

## Interruption Recovery

If work is interrupted, resume by:
1. Check which modules are `[x]` in the checklist above
2. Run `npx vitest run tests/js` — all tests for completed modules must pass
3. Run `npm run build` — bundle must build cleanly
4. Resume with the first `[ ]` item in dependency order
