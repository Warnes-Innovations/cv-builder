<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Heuristic UX Review

**Last Updated:** 2026-04-22 10:00 ET

**Reviewer:** Senior UX / Interaction Design Expert

**Executive Summary:** The cv-builder UI delivers a rich, well-engineered workflow for a technically sophisticated single-user tool, with thoughtful feedback loops (LLM busy overlay, ATS score updates, layout freshness chip) and solid error-prevention mechanisms (downstream-aware back-navigation, persuasion warnings, disabled-until-ready submit buttons). However, the application suffers from three architectural UX debts that compound one another: a triple-layer navigation system where workflow-step pills, 16+ viewer tabs, and phase-gated chat action buttons compete without a clear mental model; a viewer area crowded by a static 40% chat panel even during dense review work; and inconsistent terminology that surfaces technical internal state to end-users. The top-priority fix is establishing a clear, single navigation hierarchy so users always know where they are and what to do next.

---

## Nielsen's 10 Heuristics

---

### H1: Visibility of System Status
**Rating:** 🟡 Minor

**Finding:** System status is communicated well during LLM calls and layout operations, but degrades at edges. The LLM busy overlay (with elapsed timer, "Taking longer than usual" badge, and a ■ Stop button) provides excellent real-time feedback during inference. The ATS score badge refreshes automatically, and the layout freshness chip changes tone (fresh/stale/critical) with pulsing animation. However, the "Not ready" LLM auth badge carries no contextual guidance; the token count (`llm-token-count`) is a developer metric exposed in the chat header with no explanation; and when LLM is running, only the chat panel is overlaid — the viewer tabs remain clickable with no indication that their content is stale.

**Evidence:**
- `web/index.html:127–139` — LLM busy overlay with elapsed (`#llm-busy-elapsed`) and state badge (`#llm-busy-state-badge`)
- `web/index.html:49–56` — `#llm-status-pill` using `.auth-badge.unauthenticated` shows "⚠ Not ready" with no action path
- `web/index.html:142` — `#llm-token-count` shown in conversation header without label or explanation
- `web/styles.css:.layout-freshness-chip.stale` — `animation: stale-chip-pulse` provides pulse feedback on stale state
- `web/workflow-steps.js:_getStepTooltip()` — tooltip logic differentiates stale/critical/browsing-away states, but this relies on hover which is not accessible on touch

---

### H2: Match Between System and the Real World
**Rating:** 🟡 Minor

**Finding:** Most tab and button labels use natural-language terminology, but several surface internal or domain-jargon terms without explanation. The British spelling "Finalise" appears in both the workflow step and the tab label. "Customise" (step) vs "Customizations" (tab) uses different forms of the same concept. The session switcher formats phase labels from internal names (`init`, `job_analysis`, etc.) via `formatSessionPhaseLabel` — when these short-form labels appear in session rows, users see abbreviated machine states rather than user-facing progress descriptions. "Harvest improvements" (the post-finalise feedback loop) uses an agricultural metaphor absent from CV-building vocabulary. "ATS" is unexplained in all UI surfaces. "Master CV" varies as "master profile," "Master CV Data," and "master data" in close proximity.

**Evidence:**
- `web/index.html:119` — step label "✅ Finalise" (British) vs US English context throughout
- `web/index.html:109` — step label "⚙️ Customise" vs tab label "customizations" (`data-tab`)
- `web/session-manager.js:formatSessionPhaseLabel()` — maps `Phase` enum values like `job_analysis` to short labels surfaced in session rows
- `web/finalise.js:showHarvestSection()` — "Harvest" metaphor for applying improvements back to master
- `web/index.html:75` — `#ats-score-badge` shown without tooltip or inline explanation of "ATS"
- `web/session-manager.js:SESSION_PHASE_LABELS_SHORT` — abbreviated labels ("init", "analysis", etc.) visible to users in the sessions modal

---

### H3: User Control and Freedom
**Rating:** 🟢 Good

**Finding:** Back-navigation is robustly designed. `_showReRunConfirmModal()` lists all downstream stages that will be affected before committing to a re-run or back-navigation, and all existing approvals are preserved as context. The LLM abort button (`#llm-busy-stop`) is prominently placed with a ■ Stop affordance. Session deletion moves to a Trash rather than hard-deleting, and the ownership conflict dialog offers three recovery options (Load Different, New Session, Take Over). The cover letter and screening tabs are accessible out-of-order, allowing non-linear work. Users can rename sessions and override the AI's default decisions at every review step.

**Evidence:**
- `web/workflow-steps.js:_showReRunConfirmModal()` — downstream-aware confirmation with preserved-approvals note
- `web/index.html:131` — `#llm-busy-stop` ■ Stop always visible during inference
- `web/session-switcher-ui.js:showOwnershipConflictDialog()` — three-option conflict resolution
- `web/index.html:181` — Cover Letter tab (`#tab-cover-letter`) not gated by linear step completion
- `web/session-switcher-ui.js:_renderSavedSessionRows()` — "Move to Trash" rather than permanent delete

---

### H4: Consistency and Standards
**Rating:** 🟠 Major

**Finding:** Three overlapping navigation systems operate simultaneously without a consistent role hierarchy: (1) the 8 horizontal workflow step pills that track progress, (2) the 16+ scrollable viewer tabs for content, and (3) the phase-gated chat action buttons (Analyze Job, Recommend Customizations, etc.) that are shown/hidden by `display:none`. Users encounter the same conceptual action in different places — e.g., switching to the Skills tab directly versus clicking the "⚙️ Customise" step pill, versus the "⚙️ Recommend Customizations" chat button — with no clear mental model for which mechanism is canonical. Spelling varies between British ("Finalise," "Customise") and American ("Analyze") across sibling UI elements. Inline `onclick=` attributes are used alongside `addEventListener` registrations for logically equivalent actions.

**Evidence:**
- `web/index.html:103–120` — 8 workflow step pills with `handleStepClick()`
- `web/index.html:155–183` — 16+ viewer tabs, many without corresponding step pills (Cover Letter, Screening, Master CV, ATS Score, Experience Bullets, Publications)
- `web/index.html:145–159` — chat action buttons with `style="display:none"` toggled by phase
- `web/index.html:113` — "🔍 Analyze Job" in action buttons, "📥 Job Input" in step — different labels for same stage
- `web/index.html:119` — "Finalise" (British) vs `web/index.html:148` — "🔍 Analyze Job" (American)
- `web/app.js:setupEventListeners()` — `addEventListener` used for most buttons, but `onclick=` used inline for many modal triggers in `index.html`

---

### H5: Error Prevention
**Rating:** 🟢 Good

**Finding:** The codebase demonstrates systematic error-prevention at multiple layers. The Submit Rewrites button starts disabled and only enables when all decisions are made (`updateRewriteTally()`). Persuasion warning flags (`persuasion_warnings`) are shown before users can proceed from the Rewrites tab. Job URL input validates with `_validateURLField()` with an aria-live error span. File upload includes size warnings and accepted-type filtering. The `DOMPurify` sanitizer strips injected styles from job description HTML. Layout instruction input is sanitized server-side and a safety-alert callout is shown if scrubbing occurred. The re-run confirmation modal explicitly enumerates downstream stages that will be re-evaluated.

**Evidence:**
- `web/rewrite-review.js:renderRewritePanel()` — `#submit-rewrites-btn` starts `disabled`, enabled only after all decisions
- `web/rewrite-review.js:renderRewritePanel()` — persuasion warning section with acknowledged gate
- `web/job-input.js:_validateURLField()` — client-side URL validation with `#url-error` aria-live
- `web/job-input.js:_renderJobText()` — `DOMPurify.sanitize(raw, { FORBID_ATTR: ['style'] })` prevents style injection
- `web/layout-instruction.js:appendLayoutSafetyAlert()` — in-chat safety notification when sanitizer modifies layout instructions
- `web/workflow-steps.js:_showReRunConfirmModal()` — downstream-stage enumeration before destructive navigation

---

### H6: Recognition Rather Than Recall
**Rating:** 🟠 Major

**Finding:** The 16+ viewer tabs require users to recall which tab holds which content, as there is no persistent visual indicator of tab population state (filled vs. empty), no mapping from steps to tabs is presented anywhere in the UI, and the tab bar overflows horizontally — scroll arrow buttons appear only when needed, making tabs beyond the visible fold invisible. The default empty state message ("Select a tab to view content") provides no orientation cue. Phase-gated action buttons disappear without trace when the phase advances, so users who want to re-trigger an action must recall that chat commands (`analyze job`, `recommend`, etc.) are available.

**Evidence:**
- `web/index.html:155–183` — 16+ tabs, 7+ without step-pill counterparts, no population-state indicator
- `web/styles.css:.tabs` — `overflow-x: auto; scrollbar-width: none` hides overflow tabs with no persistent indicator
- `web/index.html:145–159` — action buttons use `style="display:none"` with no trace/history of previous available actions
- `web/index.html` (document-content empty state) — "Select a tab to view content / Job description and analysis results will appear here" — too generic
- `web/ui-core.js` — no mapping table rendered to help users understand which tabs correspond to which workflow stage

---

### H7: Flexibility and Efficiency of Use
**Rating:** 🟡 Minor

**Finding:** The app provides several efficiency shortcuts: three job-input methods (paste/URL/file upload with drag-and-drop), AI-drafted answers for clarifying questions (`✨ Draft` button), chip-based quick answers, bulk actions in the skills/achievements tables, and auto-analysis when a job is loaded but not yet analyzed. The chat input accepts natural-language commands. However, keyboard navigation beyond the message input `Enter` key is minimal; there is no way for an expert user to skip phases they don't need (e.g., spell check on a polished document); and there are no saved filter presets or templates across sessions.

**Evidence:**
- `web/job-input.js:showLoadJobPanel()` — three input method tabs (paste, URL, file)
- `web/questions-panel.js:renderQuestionsPanel()` — `✨ Draft` button and chip-based quick answers
- `web/app.js:init()` — auto-analyze trigger: `if (!status._error && status.job_description && !status.job_analysis)`
- `web/skills-review.js` — bulk action functions referenced in dependency list
- `web/app.js:setupEventListeners()` — only `Enter` key registered for keyboard shortcut

---

### H8: Aesthetic and Minimalist Design
**Rating:** 🟠 Major

**Finding:** Several UI surfaces carry more information than necessary for the current task. The position bar row contains up to 7 distinct elements simultaneously (position title, rename pencil, ATS score badge, ATS score summary lines, layout freshness chip, ATS Report button, Job Analysis button). The header contains 5 controls (Sessions, New Session, LLM selector with embedded auth badge, Settings). The static 40/60 chat-to-viewer split means 40% of the screen is always the chat pane, even when the user is working in a review table where the conversation is irrelevant. The `document-content` has `min-height: 11in` which creates excessive blank space on review-oriented tabs. The tab bar, when fully populated, can contain 17+ tabs requiring horizontal scrolling. The LLM token count is a developer-facing metric permanently occupying the conversation header.

**Evidence:**
- `web/index.html:63–80` — position bar row with 7 element types
- `web/styles.css:.interaction-area` — `width: 40%; flex-shrink: 0` — fixed 40% width for chat
- `web/styles.css:.document-content` — `min-height: 11in` creates large blank area on non-document tabs
- `web/index.html:142` — `#llm-token-count` always visible in conversation header
- `web/index.html:155–183` — 17 tab elements (including the hidden `#tab-editor`) always in DOM
- `web/styles.css:.position-bar-actions` — `display:flex; align-items:center; gap:6px; flex-wrap:wrap` — wraps to second row on smaller viewports

---

### H9: Help Users Recognise, Diagnose, and Recover from Errors
**Rating:** 🟡 Minor

**Finding:** The retry system is well-implemented: `appendRetryMessage()` shows specific error text, a countdown timer, and auto-retries with exponential backoff and jitter. Rate-limit errors display a disabled countdown button. The session conflict banner shows a live countdown with "↺ Retry Now." Network errors are caught and displayed with specific messages. However, when the LLM authentication fails, the "Not ready" badge in the header does not provide an in-context recovery action (e.g., a "Configure" button) — users must independently discover the LLM selector pill. Error messages in the chat area do not deep-link to the relevant settings panel.

**Evidence:**
- `web/message-dispatch.js:_scheduleRetry()` — exponential backoff with jitter, rate-limit awareness, auto-retry countdown
- `web/session-switcher-ui.js:conflictRetryNow()` / session conflict banner — live countdown with immediate retry
- `web/index.html:49–56` — `#llm-status-pill` badge shows "Not ready" with no inline CTA to the LLM wizard
- `web/app.js:init()` — `'⚠️ Could not establish a session. Create or load a session to continue.'` — error message with no action button
- `web/message-dispatch.js:_parseApiJsonResponse()` — good: distinguishes HTML-redirect errors (`server returned HTML instead of JSON`) from JSON errors

---

### H10: Help and Documentation
**Rating:** 🟡 Minor

**Finding:** The onboarding/welcome modal explains the 3-phase workflow clearly with numbered steps and Next actions. Button `title` attributes provide tooltip text on most controls. The questions panel gives context for why questions are being asked. However, there is no persistent help documentation accessible from within the workflow; "ATS" is used throughout without explanation; "Harvest improvements" has no tooltip or explainer; workflow step tooltips depend on hover and are not surfaced on touch; and the onboarding modal can be dismissed with "Don't show again" but there is no way to re-open it later from the UI.

**Evidence:**
- `web/index.html:240–290` — onboarding modal with 3-step numbered workflow explanation
- `web/index.html:56` — `#settings-btn` has `title="Configure provider and generation defaults"` — good
- `web/index.html:75` — `#ats-score-badge` — no `title` or `aria-describedby` explaining ATS
- `web/workflow-steps.js:_getStepTooltip()` — tooltip logic exists but is hover-only, not surfaced otherwise
- `web/session-manager.js:closeWelcomeModal()` — "Don't show again" stored in localStorage, no way to re-open welcome from header or help menu
- `web/finalise.js:showHarvestSection()` — "Harvest improvements" rendered without explanatory copy

---

## Additional UX Dimensions

---

### Cognitive Load
**Assessment:** High across key stages. Users must simultaneously track three navigation systems (step pills, viewer tabs, chat action buttons), manage a visible conversation stream, and interpret per-tab content that is formatted differently on each tab. The review stages (Skills, Achievements, Rewrites) present dense tables while the conversation pane remains visible, competing for attention. The position bar's 7-element density adds ambient reading cost.

**Evidence:**
- `web/index.html:103–183` — 8 step pills, 16+ tabs, and 8 phase-gated action buttons all co-present
- `web/index.html:63–80` — position bar: 7 elements simultaneously visible at full screen

---

### Visual Hierarchy
**Assessment:** Within individual panels the hierarchy is clear and well-executed: headers use `#1e293b` dark slate, body copy uses `#475569`, muted metadata uses `#64748b`, and primary actions use `#3b82f6` blue. Between panels the competition is a concern — the workflow step bar, the position bar, and the tab bar share similar visual weight, creating three bands of equal prominence at the top of the page. The active tab uses `color: #3b82f6; border-bottom-color: #3b82f6` which is discernible but low-contrast on the `#f8fafc` background.

**Evidence:**
- `web/styles.css:` — color system is consistent: `#1e293b`, `#475569`, `#64748b`, `#3b82f6`
- `web/styles.css:.workflow` and `.position-bar-row` and `.tab-bar-wrapper` — three equally-weighted visual bands stacked above main content
- `web/styles.css:.tab.active` — `border-bottom-color: #3b82f6` with `background: #fff` provides weak differentiation on `#f8fafc` tab bar

---

### Information Architecture
**Assessment:** The 8-step workflow model and the 16+ tab model are incoherent. Six tabs (Cover Letter, Screening, Master CV, ATS Score, Experience Bullets, Publications) have no counterpart in the workflow steps — users cannot predict where to find them or when they become relevant. The reverse mapping (from step to tab) is handled programmatically in `PHASE_TO_STEP` but is never surfaced to users visually. "Active Sessions" vs "Saved Sessions" in the session modal is a meaningful distinction, but "Active" means in-memory, which is a technical concept, not a user mental model.

**Evidence:**
- `web/state-manager.js:PHASE_TO_STEP` — internal step→phase mapping not surfaced to users
- `web/index.html:176–183` — Cover Letter, Screening, Master CV tabs present in viewer but absent from step bar
- `web/session-switcher-ui.js:_renderSessionSwitcherSections()` — "Active Sessions" vs "Saved Sessions" uses technical memory/disk distinction

---

### Workflow Momentum
**Assessment:** The auto-analyze trigger (`app.js:init()`) and the auto-advance after questions (`askPostAnalysisQuestions`) maintain forward momentum in the common case. The re-run confirmation modal preserves approved work and reassures users before back-navigation. However, the Questions panel requires all questions to be answered before the "Submit Answers" button enables, creating a hard gate that could feel punishing if a user doesn't have information for one question. The spell-check stage requires an explicit confirmation step even when no issues are found, adding a low-value click.

**Evidence:**
- `web/app.js:init()` — auto-analyze: `if (!status._error && status.job_description && !status.job_analysis)`
- `web/questions-panel.js:renderQuestionsPanel()` — `#q-submit-btn` disabled until all questions answered; no skip/skip-this option
- `web/spell-check.js:renderSpellCheckZeroState()` — "Continue to Generate CV" button even when zero issues found (`submitEmptySpellCheck()`)

---

### Feedback Loops
**Assessment:** Feedback during async operations is excellent: the LLM busy overlay shows elapsed time, transitions to a "Taking longer than usual" warning state after a threshold, and exposes an abort button at all times. ATS score refreshes are scheduled (`scheduleAtsRefresh`) at key checkpoints. Layout freshness state is communicated via chip tone and step-pill badge. The rewrite tally bar (Accepted/Rejected/Pending counts) gives real-time progress during the review stage. The only gap is that background LLM calls (e.g., ATS refresh, spell check per-section loop) do not show per-operation progress — the spell check iterates over sections sequentially with only a spinner visible.

**Evidence:**
- `web/index.html:127–139` — LLM busy overlay with `#llm-busy-state-badge` for slow-call state
- `web/rewrite-review.js:updateRewriteTally()` — live tally of accepted/rejected/pending
- `web/layout-instruction.js:renderLayoutPreviewStatus()` — detailed preview status card
- `web/spell-check.js:populateSpellCheckTab()` — sections checked in a `for...of` loop with only top-level spinner, no per-section progress

---

### Error Recovery
**Assessment:** Strong. The exponential-backoff retry system with auto-retry and manual override is well-implemented. Session conflicts surface a banner with countdown and immediate retry. The back-to-phase mechanism lets users undo workflow decisions without losing data. The LLM configuration gap (not surfacing a "Configure" CTA from the auth error state) is the main recovery weakness identified.

**Evidence:**
- `web/message-dispatch.js:_scheduleRetry()` — jittered exponential backoff, rate-limit awareness, max-attempts cap
- `web/workflow-steps.js:backToPhase()` — back navigation with feedback preservation
- `web/index.html:49–56` — `#llm-status-pill` "Not ready" badge lacks a direct configure button

---

### Affordance Clarity
**Assessment:** Primary action buttons (`.action-btn.primary`) and the send button are clearly styled with blue fill. Tab click targets are wide and have hover states. The re-run (↻) buttons embedded in step pills are small (likely 16–18px) and may be missed by users on dense displays. The "browsing-away" amber pulse animation on step pills communicates a state, but its meaning is not labelled — users must hover to see a tooltip, and the concept of "browsing-away" (viewing a different tab than the active workflow step) has no vocabulary in the UI. Drag-and-drop in the file upload zone has clear affordance (dashed border, icon, instructional text).

**Evidence:**
- `web/styles.css:.action-btn.primary` — blue fill, visible CTA
- `web/styles.css:.step.browsing-away` — `animation: browsing-pulse 2s ease-in-out infinite` with amber — no label
- `web/workflow-steps.js` — `.step-rerun` button referenced but only in innerHTML injection; size not styled independently
- `web/job-input.js:showLoadJobPanel()` — `#file-drop-zone` with dashed border, emoji, and instructions

---

### Terminology Clarity
**Assessment:** Multiple terms are ambiguous, inconsistent, or unexplained. See the Terminology Clarity Audit below for itemized findings.

**Evidence:** See audit table.

---

## Top 5 UX Issues — Friction / Abandonment Risk

| Rank | Issue | Severity | Evidence |
|------|-------|----------|----------|
| 1 | **Triple navigation without a mental model** — Three simultaneous navigation systems (8 step pills, 16+ viewer tabs, phase-gated chat action buttons) have no clear hierarchy or role distinction. Users don't know whether to click the step, the tab, or the action button to advance the workflow, leading to disorientation and premature abandonment. | 🔴 Critical | `web/index.html:103–183` (steps + tabs + action buttons co-present) |
| 2 | **Tab proliferation with no population state** — 16+ viewer tabs are always present, 6+ have no step-pill counterpart, and no tab shows a visual indicator of whether it contains data. Combined with hidden-scrollbar overflow, entire tabs become invisible without an indication they exist. Users cannot form a reliable mental model of where content lives. | 🔴 Critical | `web/index.html:155–183`; `web/styles.css:.tabs scrollbar-width:none` |
| 3 | **LLM "Not ready" blocks the entire workflow with no guided recovery** — A first-time user who launches the app without a configured LLM provider sees a persistent "⚠ Not ready" badge but no inline CTA to resolve it. The workflow cannot proceed. If the user doesn't discover the LLM pill button independently, they are stuck. | 🟠 Major | `web/index.html:49–56` (`#llm-status-pill .unauthenticated`); `web/app.js:init()` error path |
| 4 | **Fixed 40% chat panel compresses review work area** — The chat panel is always 40% of the viewport width, with no way to widen or hide it during dense review-table stages (Skills, Achievements, Rewrites, Spell Check). This cuts working space for the primary content panel in half for the longest stages of the workflow. | 🟠 Major | `web/styles.css:.interaction-area` (`width: 40%; flex-shrink: 0`); `web/styles.css:.viewer-area` (`width: 60%`) |
| 5 | **Opaque Questions gate blocks forward momentum** — The post-analysis Questions panel disables "Submit Answers" until every question has a non-empty answer. Users without information for one question cannot skip it, which stalls the workflow at the step immediately following Analysis. There is no "skip this question" affordance. | 🟡 Minor | `web/questions-panel.js:renderQuestionsPanel()` — `#q-submit-btn` disabled until all answered; no skip option |

---

## Terminology Clarity Audit

| Term | Location | Issue |
|------|----------|-------|
| **"ATS"** | `web/index.html:75` (`#ats-score-badge`), `web/index.html:80` (ATS Report button) | Unexplained abbreviation; "Applicant Tracking System" never spelled out in any UI surface |
| **"Finalise"** (British) vs **"Analyze"** (American) | `web/index.html:119` (step), `web/index.html:148` (action button) | Sibling UI elements use different English variants; jarring in the US context |
| **"Customise"** (step) vs **"Customizations"** (tab) | `web/index.html:109, 163` | Same workflow stage described with different nouns in adjacent UI elements |
| **"Harvest improvements"** | `web/finalise.js:showHarvestSection()` | Agricultural metaphor with no precedent in CV or job-application vocabulary; no tooltip or explanation in the UI |
| **"Master CV"** / "master profile" / "master data" | `web/index.html:182` (`#tab-master`), `web/session-manager.js`, `web/index.html` onboarding modal | Three different labels for the same concept in the same application |
| **"Active Sessions" vs "Saved Sessions"** | `web/session-switcher-ui.js:_renderSessionSwitcherSections()` | "Active" means in-memory (lost on server restart); "Saved" means on-disk; technical memory-model distinction not natural for users |
| **Phase labels in session rows** ("init", "job analysis", "customization") | `web/session-manager.js:formatSessionPhaseLabel()` via `SESSION_PHASE_LABELS_SHORT` | Internal phase enum names appear in session switcher metadata rows, surfacing backend state vocabulary |
| **"Experience Bullets"** vs **"Experiences"** | `web/index.html:163, 165` (`#tab-exp-review`, `#tab-ach-editor`) | Two adjacent tabs cover related content with overlapping names; "Experience Bullets" implies a subset of "Experiences" but is a separate tab |
| **"Screening"** | `web/index.html:183` (`#tab-screening`) | Ambiguous: could mean interview screening questions, application screening, ATS screening — undefined in the UI |
| **"Reconnecting"** | `web/app.js:stateManager.isReconnecting()` | Technical reconnection state used in chat messages without user-facing explanation |
| **"Content revision"** (count) | `web/state-manager.js:GENERATION_PHASES`, `layout-instruction.js` | Revision counter visible in layout preview status card; "content revision N" is a developer concept |
| **"LLM"** | `web/index.html:46` (LLM selector label `<span style="opacity:0.7;">LLM:</span>`) | "LLM" is not universally understood; alternative "AI Model" would be more accessible |

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/workflow-steps.js, web/session-manager.js, web/session-switcher-ui.js, web/message-dispatch.js, web/job-input.js, web/skills-review.js, web/achievements-review.js, web/rewrite-review.js, web/cover-letter.js, web/finalise.js, web/questions-panel.js, web/layout-instruction.js, web/spell-check.js, scripts/web_app.py, scripts/utils/conversation_manager.py
