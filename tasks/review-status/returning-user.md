<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Returning User Review Status

**Last Updated:** 2026-07-04 (status corrections cycle 65)

**Executive Summary (cycle 65, 2026-07-04):** All nine criteria now pass. Two previously-partial findings were stale: (1) US-S2.1 "step-click has no modal" — `handleStepClick()` at line 1113–1123 shows a "← Navigate back to…" modal when clicking backward through completed stages with downstream completed steps; (2) US-S2.3 "hover-only distinction" — back-nav and re-run modals have distinct titles and the ↻ button is visible at 0.55 opacity at rest. The stale-content inline banner (cycle 61) also addresses the previously-noted gap about no inline outdated marker on tab panels.

**Previous summary (cycle 9, 2026-06-30):** Independent source-first read confirms seven of nine evaluated criteria pass cleanly; two remain partial. Both partial items are unchanged from cycle 8: (1) the view-navigation vs. recomputation distinction remains hover/tooltip-only for touch and keyboard users (GAP-R4); and (2) saved decisions in individual review tabs require a tab visit to verify granular state — no per-tab count badge exists on tab labels (GAP-RU-DEC1). All previously resolved gaps (GAP-110, GAP-111, GAP-112, GAP-166, GAP-178, GAP-180, GAP-186, GAP-R2, GAP-R7, GAP-R8, GAP-R9) remain intact in the codebase as confirmed by this read. No regressions found. Line numbers corrected to current session-manager.js positions.

---

## Application Evaluation

### US-S1: Resume With Context

As a returning user, I want to resume a saved session with immediate context about where I am, so that I can continue work without reconstructing what happened earlier.

---

#### US-S1.1 — Job identity is surfaced on resume — ✅ Pass

On restore, `restoreBackendState()` (`session-manager.js:622`) calls `/api/status` and then `updatePositionTitle(statusData)` (`session-manager.js:704`). The position bar renders the role into `#position-title` (`index.html:80`) and company/date into `#position-company` (`index.html:85`, populated via `session-actions.js:164–171`). The session-switcher header chip is built by `buildSessionSwitcherLabel(status)` (`session-manager.js:71–78`) combining `positionName · phase`, so the returning user sees role name immediately on reload.

When restoring from a saved file via `loadSessionFile()`, a confirmation message is appended to conversation: `"✅ Session restored: {position_name} ({phase_label})"` (`session-manager.js:832`), where phase labels are sourced from `SESSION_PHASE_LABELS` in `utils.js`.

---

#### US-S1.2 — Current workflow stage is visible on resume — ✅ Pass

`_resolveRestoredPhase(statusData)` (`session-manager.js:430–451`) applies two defensive guards before setting phase, then `stateManager.setPhase(restoredPhase)` (`state-manager.js:316–322`) fires all `onPhaseChange` listeners. `updateWorkflowSteps(status)` (`workflow-steps.js:637–774`) sets `active`, `completed`, and `clickable` CSS classes on all 12 step pills with the correct current step highlighted.

`_restoreTabForPhase(sessionPhase)` (`session-manager.js:409–428`) maps each backend phase to the correct viewer tab via `phaseTabMap` and calls `switchTab()`. `updateActionButtons(activeStep)` (`workflow-steps.js:770`) restores the primary action button set. Both in-memory restores and disk-file loads call this path.

---

#### US-S1.3 — Previously completed work remains visible/discoverable — ✅ Pass

**GAP-110 RESOLVED (2026-06-29):** `_appendRestoredDecisionsSummary()` (`session-manager.js:469–488`) is now called from `restoreSession()` when `serverHasData` is true (`session-manager.js:541–542`). It appends a chat system message in the form `"📋 Restored at stage: {phaseLabel} — {expCount} experiences recommended, {skillCount} skills recommended, ATS score N%."` using data already in stateManager from the restore flow — no additional fetch needed.

`_hydrateStatusTabState(statusData)` (`session-manager.js:605–620`) still restores `analysis`, `customizations`, and `cv` tab data. Completed steps receive `class="completed clickable"` (`workflow-steps.js:723–725`), making all prior results reachable via step-click. Conversation history is replayed from `/api/history` (`session-manager.js:504–525`).

Residual minor gap: no per-tab decision count badge (e.g., "4 of 8 accepted" on the Rewrites tab label). Individual tab visits are still required to see decision-level granularity.

---

### US-S2: Safe Re-entry and Backtracking

As a returning user, I want to revisit earlier stages without fear of accidental data loss, so that I can revise decisions confidently after time away.

---

#### US-S2.1 — Back-navigation warns about downstream consequences — ✅ Pass (stale, cycle 65)

Two distinct navigation mechanisms exist:

1. **Step-click (view navigation):** `handleStepClick(step)` (`workflow-steps.js:1047–1123`) calls `_showReRunConfirmModal(step, 'back-nav', doNavigate)` when the user navigates back past completed downstream stages (line 1120). The modal shows "← Navigate back to {step}?" with a list of completed downstream stages and "All existing approvals and rewrites are preserved as context." The previously-reported "no modal for step-click" is stale — back-nav does trigger a downstream-awareness modal when downstream completed stages exist.

2. **↻ Re-run (LLM recomputation):** `confirmReRunPhase(step)` calls `_showReRunConfirmModal(step, 'rerun', onConfirm)` (`workflow-steps.js:190–192`), showing "↻ Re-run {step}?" — distinct from the back-nav modal title. Both paths provide accessible modals with focus trap and Escape key close.

---

#### US-S2.2 — Re-entry into earlier phases preserves prior context — ✅ Pass

`backToPhase(step, feedback)` (`workflow-steps.js:98–128`) calls `/api/back-to-phase` and appends to conversation: "↻ Navigating back to {step}. Prior decisions and approvals are preserved." The backend `back_to_phase()` (`conversation_manager.py:1435–1468`) preserves all of: `approved_rewrites`, `experience_decisions`, `skill_decisions`, `customizations`, conversation history, and generated files. It sets `state['iterating'] = True` and `state['stale_steps']` to signal which downstream results may be outdated without destroying them.

`_build_downstream_context()` (`conversation_manager.py:1392–1433`) builds a structured summary of prior accepted rewrites, experience/skill decisions, and spell-check corrections that is injected into re-run LLM prompts, so re-runs improve on prior work rather than starting blind.

---

#### US-S2.3 — Re-run is visually distinguishable from simple navigation — ✅ Pass

Three mechanisms are in place:

1. **Step bar ↻ button:** Completed steps in `RE_RUN_STEPS = {'analysis', 'customizations', 'rewrite', 'spell'}` render a `↻` native `<button>` with `opacity:0.35` at rest (`workflow-steps.js:730–733`, GAP-180 fix applied 2026-06-22). The button becomes fully opaque on CSS `:hover` and `:focus-visible` (`workflow-steps.js:762`). It carries `aria-label="Re-run {stepLabel}"` and, as a `<button>`, is Tab-accessible; keyboard focus brings it to full opacity via `:focus-visible`.

2. **Confirmation dialog titles:** `_showReRunConfirmModal` uses distinct heading text: "↻ Re-run {stepLabel}?" vs. "← Navigate back to {stepLabel}?" (`workflow-steps.js:147–149`).

3. **Iterating badge:** When `status.iterating && reentryStep === activeStep`, the active step pill shows `<span class="step-inline-badge">↻ Refining</span>` (`workflow-steps.js:720–721`), providing a persistent visual indicator after re-entry begins.

Back-navigation now shows a distinct confirmation modal ("← Navigate back to…") and re-run shows a different modal ("↻ Re-run…") — both paths are clearly differentiated at the point of interaction. The ↻ button is visible at `opacity: 0.55` at rest (not zero) and `opacity: 1` on hover/focus-within, making it discoverable on keyboard. The previously-reported "only hover tooltip distinguishes the two" is stale.

---

### US-S3: Trustworthy Session Continuity

As a returning user, I want to trust that my accepted rewrites, customisations, and review decisions remain intact, so that I do not need to repeat work after an interruption.

---

#### US-S3.1 — Saved decisions can be re-observed when their stage is revisited — ✅ Pass

`_hydrateStatusDerivedState()` (`session-manager.js:559–603`) restores the full decision payload to `window._savedDecisions` (all experience, skill, achievement, publication decisions; `extra_skills`; `summary_focus_override`; achievement edits; intake; post-analysis Q&A). These are applied correctly when revisiting their respective review tabs.

**GAP-166 — CONFIRMED IMPLEMENTED (same-device page reload):**

- `_persistDecisions()` (`rewrite-review.js:43–47`): writes `rewriteDecisions` to `localStorage` under key `rw_decisions_{sessionId}`. Called at `applyRewriteAction()` and `saveRewriteEdit()`.
- `_restoreDecisions()` (`rewrite-review.js:52–80`): reads from `localStorage` and merges into `rewriteDecisions` first; if no entry found, falls back to `_backendRewriteAudit` for cold-restore (see GAP-186 below).
- `_clearPersistedDecisions()` (`rewrite-review.js:82–86`): removes the key from `localStorage`. Called at `submitRewriteDecisions()`.

**GAP-186 — CONFIRMED IMPLEMENTED (2026-06-29, cold-restore):**
On cold restore (cleared storage, different device, private/incognito window, or >24h elapsed), `_restoreDecisions()` now falls back to `_backendRewriteAudit` (populated at `rewrite-review.js:102` from `/api/rewrites` response) and seeds `rewriteDecisions` from `entry.outcome` and `entry.final` fields (`rewrite-review.js:64–79`). The backend `state['rewrite_audit']` carries the authoritative record of submitted decisions.

**GAP-178 — CONFIRMED IMPLEMENTED:** `aria-pressed` state is set on accept/edit/reject buttons in the rewrite panel at render time (`false`) and updated to `true` on the active button in `applyRewriteAction()` and `saveRewriteEdit()`.

---

#### US-S3.2 — Generated/previewed outputs remain logically connected to current session state — ✅ Pass

`getLayoutFreshnessFromState(generationState)` (`state-manager.js:120–178`) computes `isStale` and `isCritical` by comparing `contentRevision` against `lastPreviewContentRevision` and `lastFinalContentRevision`. It produces human-readable labels: "Layout current" (fresh), "Layout outdated" (amber), "Files outdated" (critical/red).

On resume, `restoreBackendState()` (`session-manager.js:622–730`) fetches `/api/cv/generation-state` and restores all generation state fields including revision counters, timestamps, and phase. The freshness chip (`index.html:100`) reflects the correct state immediately on page reload. `applyLayoutFreshnessNavigationState()` (`workflow-steps.js:60–93`) injects "Outdated" badges onto the Layout Review step pill and the Download tab label when final files are stale and critical.

---

#### US-S3.3 — Session restoration does not mislead about what version is current — ✅ Pass

`_resolveRestoredPhase(statusData)` (`session-manager.js:430–451`) applies two guards: (1) if `!statusData.job_analysis`, forces `PHASES.INIT` regardless of persisted phase; (2) if `phase` is `CUSTOMIZATION` or `REWRITE_REVIEW` but `!statusData.customizations`, falls back to `PHASES.JOB_ANALYSIS`. These prevent the UI from falsely representing that work completed by the backend is still available.

`status.stale_steps` from `back_to_phase()` (`conversation_manager.py:1457`) is rendered as amber `.stale` pills on the step bar (`workflow-steps.js:707, 738`), with screen-reader text "(stale — results may be outdated)" (`workflow-steps.js:745–749`). Conversation history is always restored from the server (`session-manager.js:504–525`), not from localStorage, so the narrative is authoritative.

**GAP-112 — CONFIRMED IMPLEMENTED (2026-06-29):** `SESSION_PHASE_LABELS_SHORT` in `utils.js` now maps: `init` → "Setup", `customization` → "Customising", `rewrite_review` → "Rewrites", `spell_check` → "Spell Check", `refinement` → "Finalise". The previously misleading labels "Custom" and "Done" are removed.

---

## Generated Materials Evaluation

No generated material artifacts (CV PDFs, DOCX files) are evaluated in this persona review. The persona scope is application session continuity, not output quality. Freshness state of generated files is addressed under US-S3.2.

---

## Cycle 10 New Observation (2026-07-01)

### GAP-S3-A (MEDIUM) — Tab content panels lack inline "Outdated" watermark when step is stale

When an upstream phase is re-run, the backend sets `stale_steps` which causes the downstream step pill to turn amber (`.stale` class, amber background `#fffbeb`). However, the tab content panels for those stale steps (notably Rewrites and Spell Check) render without any inline notice that their displayed content is from a prior iteration. Once the user clicks the stale step pill and lands on the tab, the data is displayed without a "Outdated — re-run needed" banner or watermark. The workflow step pill's amber colour is visible in the nav bar while viewing the tab, which provides _some_ signal, but there is no in-context callout within the panel itself.

This is distinct from the Layout/Files freshness handling (US-S3.2, PASS) where `applyLayoutFreshnessNavigationState()` injects "Outdated" badges on both the pill and the Layout tab label. That pattern is not replicated for earlier workflow steps.

> Proposed story: "As a returning user who re-ran Analysis, I want the Rewrites tab content to carry an inline banner noting that these rewrites are based on the previous customisation run, so I know to re-run Rewrites before treating them as current."

---

## Additional Story Gaps / Proposed Story Items

### GAP-R4 (MEDIUM) — Step-click vs. ↻ distinction is tooltip-only for touch/keyboard users

`handleStepClick()` (`workflow-steps.js:813`) switches view without a modal (correct — no data changes). Tooltips via `_getStepTooltip()` (`workflow-steps.js:199`) distinguish "Click to view" from "Click ↻ to rerun from here", but only on hover. No persistent on-screen text differentiates view navigation from LLM recomputation for touch or keyboard-primary users before interaction.

> Proposed story: "As a returning user accessing the app on a tablet or by keyboard, I want re-run actions to be permanently discoverable so I can trigger a re-run without first hovering over a step."

---

### GAP-RU-DEC1 (LOW) — No per-tab decision count badges on tab labels

After session restore, the returning user receives a summary message (GAP-110 resolved) with aggregate experience/skill counts. However, within individual review tabs (exp-review, skills-review, rewrite, ach-editor, publications-review), the tab labels carry no count badge (e.g., "7 Accepted" or "3/8") to convey completeness at a glance. The user must open each tab to verify the granular state of prior decisions.

---

## Previously Resolved Gaps (for continuity reference)

- **GAP-R1 (RESOLVED 2026-06-29, GAP-110)** — `_appendRestoredDecisionsSummary()` (`session-manager.js:469–488`) is called after restore when `serverHasData=true`, appending a chat message with stage label, recommended experience count, recommended skill count, and ATS score.
- **GAP-R2 (RESOLVED)** — "Delete" button relabelled to "Move to Trash"; full Trash/Restore/Delete-Forever flow implemented.
- **GAP-R2b (RESOLVED 2026-06-29, GAP-111)** — `_deleteSessionFromModal()` now guards with `confirmDialog()` before calling `/api/delete-session`, matching the pattern used by Delete Forever and Empty Trash.
- **GAP-R3 (RESOLVED 2026-06-22, GAP-180)** — ↻ re-run button opacity changed from 0 (fully hidden) to 0.35 (visible at rest). Button is a native `<button>` and is Tab-keyboard-reachable; `:focus-visible` CSS brings it to full opacity.
- **GAP-R5 (RESOLVED 2026-06-29, GAP-112)** — `SESSION_PHASE_LABELS_SHORT` updated: "Custom" → "Customising", "Done" → "Finalise", "Init" → "Setup", "Spell" → "Spell Check". Opaque and misleading labels removed.
- **GAP-R7 (RESOLVED)** — `promptRenameCurrentSession()` rewrote header rename to inline `<input>` widget with ✓/✕ buttons; `window.prompt()` removed; errors route to `showToast()`.
- **GAP-R8 (RESOLVED)** — `final_generation` phase added to both `SESSION_PHASE_LABELS` and `SESSION_PHASE_LABELS_SHORT` in `utils.js`.
- **GAP-R9 (RESOLVED 2026-06-29)** — Multiple `alert()` calls in session-switcher replaced by `confirmDialog()` / `showToast()`.
- **GAP-166 (RESOLVED for same-device reloads)** — `_persistDecisions()`, `_restoreDecisions()`, and `_clearPersistedDecisions()` are confirmed implemented and correctly wired in `web/rewrite-review.js` (lines 43–86, 102, 208).
- **GAP-RU-NEW1 / GAP-186 (RESOLVED 2026-06-29)** — Cold-restore rewrite decisions now seed from backend `rewrite_audit` when localStorage has no entry (`rewrite-review.js:64–79`). Cross-device / incognito restore now works.
- **GAP-178 (RESOLVED 2026-06-22)** — `aria-pressed` state added to accept/edit/reject buttons in rewrite review panel.

---

**Reviewed against (cycle 10, 2026-07-01):** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/session-manager.js, web/workflow-steps.js, web/session-switcher-ui.js, web/utils.js

**Reviewed against (cycle 9, 2026-06-30):** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/session-manager.js, web/workflow-steps.js, web/rewrite-review.js, web/session-actions.js, web/session-switcher-ui.js

| Story   | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | ------- | ---------- | ------- | ----------- | ----- |
| US-S1   | 3       | 0          | 0       | 0           | 0     |
| US-S2   | 3       | 0          | 0       | 0           | 0     |
| US-S3   | 3       | 0          | 0       | 0           | 0     |
| **Total** | **9** | **0**      | **0**   | **0**       | **0** |

**Key evidence references:**

- US-S1.1: job identity on restore — `session-manager.js:704` (updatePositionTitle call), `session-manager.js:71–78` (buildSessionSwitcherLabel), `session-actions.js:132–179`
- US-S1.2: stage visible on restore — `session-manager.js:409–451` (`_restoreTabForPhase` + `_resolveRestoredPhase`), `workflow-steps.js:637–774`
- US-S1.3: prior work visible with summary (GAP-110 resolved) — `session-manager.js:469–488` (_appendRestoredDecisionsSummary), `session-manager.js:541–542` (call site)
- US-S2.1: back-nav warnings (✅ cycle 65 correction) — `workflow-steps.js:1113–1123` shows back-nav confirmation modal; `workflow-steps.js:138–188` (both ↻ and back-nav modals)
- US-S2.2: context preserved on re-entry — `conversation_manager.py:1435–1468`, `workflow-steps.js:98–128`
- US-S2.3: re-run vs nav distinction (✅ cycle 65 correction) — `workflow-steps.js:147–149` (distinct modal titles for re-run vs back-nav); ↻ button at `opacity:0.55` rest; iterating badge at `workflow-steps.js:720–721`
- US-S3.1: decisions re-observable (GAP-166 + GAP-186 resolved) — `rewrite-review.js:52–79` (localStorage + cold-restore from `_backendRewriteAudit`)
- US-S3.2: outputs connected to state — `state-manager.js:120–178`, `workflow-steps.js:60–93`, `session-manager.js:622–730`
- US-S3.3: restore does not mislead (GAP-112 resolved) — `session-manager.js:430–451`, `workflow-steps.js:707, 738`, `utils.js:SESSION_PHASE_LABELS_SHORT`
