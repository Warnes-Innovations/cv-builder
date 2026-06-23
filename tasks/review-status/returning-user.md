<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Returning User Review Status

**Last Updated:** 2026-06-22 09:45 ET

**Executive Summary:** The returning-user experience is strong for session identity, stage visibility, and phase continuity. Five of nine criteria pass cleanly; four are partial. The GAP-166 fix is confirmed implemented: `_persistDecisions()`, `_restoreDecisions()`, and `_clearPersistedDecisions()` are all present in `web/rewrite-review.js` and wired correctly — `_restoreDecisions()` is called at line 186 inside `renderRewritePanel()` after the DOM is built, `_persistDecisions()` is called in both `applyRewriteAction()` (line 356) and `saveRewriteEdit()` (line 385), and `_clearPersistedDecisions()` is called in `submitRewriteDecisions()` (line 481) before `scheduleAtsRefresh`. The localStorage key is `rw_decisions_{sessionId}` scoped to the URL session parameter. Remaining weaknesses: (1) rewrite decisions are not seeded from backend `approved_rewrites` on cold reload (different device, cleared storage, private window); (2) no on-return decision-count summary helps users quickly verify prior work is intact; (3) the ↻ re-run icon is hover-only and not keyboard-accessible; (4) step-click vs. re-run distinction is tooltip-only for touch/keyboard users.

---

## Application Evaluation

### US-S1: Resume With Context

As a returning user, I want to resume a saved session with immediate context about where I am, so that I can continue work without reconstructing what happened earlier.

---

#### US-S1.1 — Job identity is surfaced on resume — ✅ Pass

On restore, `restoreBackendState()` (`session-manager.js:537`) calls `/api/status` and then `updatePositionTitle(statusData)` (`session-manager.js:619`). The position bar renders the role into `#position-title` (`index.html:75`) and company/date into `#position-company` (`index.html:80`, populated via `session-actions.js:132–178`). The session-switcher header chip is built by `buildSessionSwitcherLabel(status)` (`session-manager.js:71–78`) combining `positionName · phase`, so the returning user sees role name immediately on reload.

When restoring from a saved file via `loadSessionFile()`, a confirmation message is appended to conversation: `"✅ Session restored: {position_name} ({phase_label})"` (`session-manager.js:747`), where phase labels are sourced from `SESSION_PHASE_LABELS` in `utils.js:262–272`.

---

#### US-S1.2 — Current workflow stage is visible on resume — ✅ Pass

`_resolveRestoredPhase(statusData)` (`session-manager.js:373–394`) applies two defensive guards before setting phase, then `stateManager.setPhase(restoredPhase)` (`state-manager.js:316–322`) fires all `onPhaseChange` listeners including `updateWorkflowStepsClickable(phase)` (`ui-core.js:1879`). `updateWorkflowSteps(status)` (`workflow-steps.js:612–774`) sets `active`, `completed`, and `clickable` CSS classes on all 12 step pills, and reveals the step-bar with the correct current step highlighted.

`_restoreTabForPhase(sessionPhase)` (`session-manager.js:352–371`) maps each backend phase to the correct viewer tab via `phaseTabMap` and calls `switchTab()`. `updateActionButtons(activeStep)` (`workflow-steps.js:770`) restores the primary action button set. Both in-memory restores and disk-file loads (via `loadSessionFile()`, `session-manager.js:705–718`) call this path.

---

#### US-S1.3 — Previously completed work remains visible/discoverable — ⚠️ Partial

`_hydrateStatusTabState(statusData)` (`session-manager.js:520–534`) restores `analysis`, `customizations`, and `cv` tab data into `stateManager`. Completed steps receive `class="completed clickable"` (`workflow-steps.js:723`), making all prior results reachable via step-click. Conversation history is replayed from `/api/history` (`session-manager.js:424–451`).

Gap: No human-readable summary of restored decisions is surfaced on return. A returning user must navigate to each review tab (exp-review, skills-review, rewrite, etc.) individually to verify prior decisions are intact. `_hydrateStatusDerivedState()` (`session-manager.js:474–518`) assembles `window._savedDecisions` with the complete decision map (experience, skill, achievement, publication decisions; `extra_skills`; `summary_focus_override`; intake; post-analysis Q&A) — the data is available but no count summary or "welcome back" status banner is rendered.

---

### US-S2: Safe Re-entry and Backtracking

As a returning user, I want to revisit earlier stages without fear of accidental data loss, so that I can revise decisions confidently after time away.

---

#### US-S2.1 — Back-navigation warns about downstream consequences — ⚠️ Partial

Two distinct navigation mechanisms exist:

1. **Step-click (view navigation):** `handleStepClick(step)` (`workflow-steps.js:788–837`) calls `switchTab()` without changing backend phase and without any warning modal. Tooltips via `_getStepTooltip()` (`workflow-steps.js:199–207`) show "Click to view" vs. "Click ↻ to rerun from here", but only on hover — not persistently visible for keyboard or touch users.

2. **↻ Re-run (LLM recomputation):** `confirmReRunPhase(step)` (`workflow-steps.js:190–192`) calls `_showReRunConfirmModal(step, 'rerun', onConfirm)` (`workflow-steps.js:138–188`), which renders a modal listing all downstream completed stages by name and states "All existing approvals and rewrites are preserved as context." The modal has a focus trap (`trapFocus('rerun-confirm-overlay')`, line 180) and Escape-key close.

The confirmation modal fires only for the ↻ recomputation path. Step-click view navigation has no modal (appropriate — no data changes occur), but the distinction is hover-dependent.

---

#### US-S2.2 — Re-entry into earlier phases preserves prior context — ✅ Pass

`backToPhase(step, feedback)` (`workflow-steps.js:98–128`) calls `/api/back-to-phase` and appends to conversation: "↻ Navigating back to {step}. Prior decisions and approvals are preserved." The backend `back_to_phase()` (`conversation_manager.py:1435–1468`) preserves all of: `approved_rewrites`, `experience_decisions`, `skill_decisions`, `customizations`, conversation history, and generated files. It sets `state['iterating'] = True` and `state['stale_steps']` to signal which downstream results may be outdated without destroying them.

`_build_downstream_context()` (`conversation_manager.py:1392–1433`) builds a structured summary of prior accepted rewrites, experience/skill decisions, and spell-check corrections that is injected into re-run LLM prompts, so re-runs improve on prior work rather than starting blind.

---

#### US-S2.3 — Re-run is visually distinguishable from simple navigation — ⚠️ Partial

Three mechanisms are in place:

1. **Step bar ↻ button:** Completed steps in `RE_RUN_STEPS = {'analysis', 'customizations', 'rewrite', 'spell'}` render a `↻` button with `opacity:0.35` by default (`workflow-steps.js:703–706`), revealed only on CSS `:hover` or `:focus-visible` (`workflow-steps.js:723`). The button does have `aria-label="Re-run {stepLabel}"` — so screen readers can find it — but it carries no `tabindex` or role that would make it naturally reachable via Tab key independent of the hover-reveal mechanic.

2. **Confirmation dialog titles:** `_showReRunConfirmModal` uses distinct heading text: "↻ Re-run {stepLabel}?" vs. "← Navigate back to {stepLabel}?" (`workflow-steps.js:147–149`).

3. **Iterating badge:** When `status.iterating && reentryStep === activeStep`, the active step pill shows `<span class="step-inline-badge">↻ Refining</span>` (`workflow-steps.js:720–721`), providing a persistent visual indicator after re-entry begins.

---

### US-S3: Trustworthy Session Continuity

As a returning user, I want to trust that my accepted rewrites, customisations, and review decisions remain intact, so that I do not need to repeat work after an interruption.

---

#### US-S3.1 — Saved decisions can be re-observed when their stage is revisited — ⚠️ Partial

`_hydrateStatusDerivedState()` (`session-manager.js:474–518`) restores the full decision payload to `window._savedDecisions` (all experience, skill, achievement, publication decisions; `extra_skills`; `summary_focus_override`; achievement edits; intake; post-analysis Q&A). These are applied correctly when revisiting their respective review tabs.

**GAP-166 verification — CONFIRMED IMPLEMENTED:**

- `_persistDecisions()` (`rewrite-review.js:43–47`): writes `rewriteDecisions` to `localStorage` under key `rw_decisions_{sessionId}` (where `sessionId` is read from `?session=` URL param via `_decisionsKey()`, line 36–41). Called at `applyRewriteAction()` line 356 (for accept/reject outcomes) and `saveRewriteEdit()` line 385 (for edit-save outcomes).
- `_restoreDecisions()` (`rewrite-review.js:49–59`): reads from `localStorage` and merges into `rewriteDecisions` via `Object.assign`. Called at `renderRewritePanel()` line 186, after the card HTML is injected, then re-applies decisions (lines 188–205) by calling `applyRewriteAction()` for each restored card, including re-entering edit mode and injecting saved text for `outcome === 'edit'` entries.
- `_clearPersistedDecisions()` (`rewrite-review.js:61–65`): removes the key from `localStorage`. Called at `submitRewriteDecisions()` line 481, immediately before `scheduleAtsRefresh('review_checkpoint')` and `switchTab('spell')`.

Residual gap: `_restoreDecisions()` reads only from localStorage. When the user clears browser storage, uses a different device, opens a private/incognito window, or if more than 24 hours have elapsed, the key is absent and decisions are not restored. The backend stores final submitted decisions in `state['approved_rewrites']` and `state['rewrite_audit']`, but these are not used to seed the rewrite panel on cold restore. In that case, `rewriteDecisions` remains empty and the returning user must repeat all accept/reject decisions.

---

#### US-S3.2 — Generated/previewed outputs remain logically connected to current session state — ✅ Pass

`getLayoutFreshnessFromState(generationState)` (`state-manager.js:120–178`) computes `isStale` and `isCritical` by comparing `contentRevision` against `lastPreviewContentRevision` and `lastFinalContentRevision`. It produces human-readable labels: "Layout current" (fresh), "Layout outdated" (amber), "Files outdated" (critical/red).

On resume, `restoreBackendState()` (`session-manager.js:563–611`) fetches `/api/cv/generation-state` and restores all generation state fields including revision counters, timestamps, and phase. The freshness chip (`index.html:95`) reflects the correct state immediately on page reload. `applyLayoutFreshnessNavigationState()` (`workflow-steps.js:60–93`) injects "Outdated" badges onto the Layout Review step pill and the Download tab label when final files are stale and critical.

---

#### US-S3.3 — Session restoration does not mislead about what version is current — ✅ Pass

`_resolveRestoredPhase(statusData)` (`session-manager.js:373–394`) applies two guards: (1) if `!statusData.job_analysis`, forces `PHASES.INIT` regardless of persisted phase; (2) if `phase` is `CUSTOMIZATION` or `REWRITE_REVIEW` but `!statusData.customizations`, falls back to `PHASES.JOB_ANALYSIS`. These prevent the UI from falsely representing that work completed by the backend is still available.

`status.stale_steps` from `back_to_phase()` (`conversation_manager.py:1452–1455`) is rendered as amber `.stale` pills on the step bar (`workflow-steps.js:707, 738`), with screen-reader text "(stale — results may be outdated)" (`workflow-steps.js:745–749`). Conversation history is always restored from the server (`session-manager.js:424–451`), not from localStorage, so the narrative is authoritative.

---

## Additional Story Gaps / Proposed Story Items

### GAP-R1 (MEDIUM) — No restored-decisions summary on return

After session restore, no human-readable summary of recovered state is surfaced (e.g. "4 experiences selected, 12 skills, 7 rewrites approved"). The returning user must navigate to each review tab individually to verify prior work is intact. `_hydrateStatusDerivedState()` (`session-manager.js:474–518`) assembles the data in `window._savedDecisions`; it is not surfaced in the UI.

> Proposed story: "As a returning user, I want a brief summary of my restored session decisions so that I can quickly verify my prior work is intact before continuing."

---

### GAP-RU-NEW1 (MEDIUM) — Rewrite decisions not restored on cold reload (cross-device / cleared storage)

The GAP-166 fix addresses same-device page reloads. On cold restore (cleared storage, different device, private/incognito window, or >24h elapsed), `rewriteDecisions` is reset to `{}` at `session-manager.js:740` before `renderRewritePanel()` is called, and `_restoreDecisions()` finds no localStorage key. The backend `state['approved_rewrites']` and `state['rewrite_audit']` fields carry the authoritative record of submitted decisions but are not used to seed the panel.

> Proposed fix: In the `loadSessionFile()` path (after `renderRewritePanel()` is called and before `_restoreDecisions()` runs), seed `rewriteDecisions` from `statusData.approved_rewrites` mapped to `{id: ..., outcome: 'accept', final_text: ...}`. The localStorage path (GAP-166) would still win on same-device by overwriting the backend seed.

---

### GAP-R3 (MEDIUM) — ↻ re-run icon not keyboard-accessible

The ↻ re-run button is rendered inside completed step pills with `opacity:0.35` by default, revealed only on CSS `:hover` or `:focus-visible` (`workflow-steps.js:723`). Although it has `aria-label`, it has no independent `tabindex` and its low default opacity means keyboard users stepping through the step bar cannot discover it without prior knowledge.

> Proposed fix: Add `tabindex="0"` to the `↻` button element so it is reachable via Tab, and add a persistent (non-hover) affordance — e.g., a permanently visible but subtle icon at reduced opacity that gains full opacity on focus.

---

### GAP-R4 (MEDIUM) — Step-click vs. ↻ distinction is tooltip-only for touch/keyboard users

`handleStepClick()` (`workflow-steps.js:788`) switches view without a modal (correct — no data changes). Tooltips via `_getStepTooltip()` (`workflow-steps.js:199`) distinguish "Click to view" from "Click ↻ to rerun from here", but only on hover. No persistent on-screen text differentiates view navigation from LLM recomputation.

> Proposed story: "As a returning user accessing the app on a tablet or by keyboard, I want re-run actions to be permanently discoverable so I can trigger a re-run without first hovering over a step."

---

### GAP-R2b (LOW) — "Move to Trash" executes without confirmation

In the sessions modal, the move-to-trash action fires the API directly without a confirmation dialog, unlike Delete Forever and Empty Trash which call `confirmDialog()` first. This is inconsistent with the destructive-action pattern used elsewhere.

---

### GAP-R5 (LOW) — Abbreviated phase labels potentially opaque for occasional returning users

`SESSION_PHASE_LABELS_SHORT` maps `refinement` → `"Done"` (misleading if further work is intended) and `customization` → `"Custom"` (non-obvious). These appear in the session-switcher header chip and sessions modal (`utils.js:277–287`).

---

### GAP-R9 (LOW) — Remaining alert() calls in sessions modal

Multiple `alert()` calls remain in the sessions modal for error cases. Browser `alert()` can be suppressed by the "Prevent this page from creating additional dialogs" setting, leaving operations silently failing. `showToast()` and `showAlertModal()` are available as drop-in replacements.

---

## Previously Resolved Gaps (for continuity reference)

- **GAP-R2 (RESOLVED)** — "Delete" button relabelled to "Move to Trash"; full Trash/Restore/Delete-Forever flow implemented.
- **GAP-R7 (RESOLVED)** — `promptRenameCurrentSession()` (`session-manager.js:759–819`) rewrote header rename to inline `<input>` widget with ✓/✕ buttons; `window.prompt()` removed; errors route to `showToast()`.
- **GAP-R8 (RESOLVED)** — `final_generation` phase added to both `SESSION_PHASE_LABELS` and `SESSION_PHASE_LABELS_SHORT` in `utils.js`.
- **GAP-166 (PARTIALLY RESOLVED)** — `_persistDecisions()`, `_restoreDecisions()`, and `_clearPersistedDecisions()` are confirmed implemented and correctly wired in `web/rewrite-review.js` (lines 43–65, 186, 356, 385, 481). Same-device page-reload restore works. Cross-device / cold-reload restore from backend `approved_rewrites` is not yet implemented (see GAP-RU-NEW1 above).

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/rewrite-review.js

| Story   | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | ------- | ---------- | ------- | ----------- | ----- |
| US-S1   | 2       | 1          | 0       | 0           | 0     |
| US-S2   | 1       | 2          | 0       | 0           | 0     |
| US-S3   | 2       | 1          | 0       | 0           | 0     |
| **Total** | **5** | **4**      | **0**   | **0**       | **0** |

**Key evidence references:**

- US-S1.1: job identity on restore — `session-manager.js:619`, `session-manager.js:71–78`, `session-actions.js:132–178`
- US-S1.2: stage visible on restore — `session-manager.js:352–371`, `workflow-steps.js:612–774`, `ui-core.js:1879`
- US-S1.3: prior work discoverable (partial) — `session-manager.js:520–534`; no summary surfaced
- US-S2.1: back-nav warnings (partial) — `workflow-steps.js:138–188` (↻ modal); `workflow-steps.js:788` (step-click, no modal, hover-only distinction)
- US-S2.2: context preserved on re-entry — `conversation_manager.py:1435–1468`, `workflow-steps.js:98–128`
- US-S2.3: re-run vs nav distinction (partial) — `workflow-steps.js:147–149`, `workflow-steps.js:703–706`, `workflow-steps.js:720–721`
- US-S3.1: decisions re-observable (partial) — GAP-166 confirmed at `rewrite-review.js:43–65, 186, 356, 385, 481`; cold-restore gap remains
- US-S3.2: outputs connected to state — `state-manager.js:120–178`, `workflow-steps.js:60–93`, `session-manager.js:563–611`
- US-S3.3: restore does not mislead — `session-manager.js:373–394`, `workflow-steps.js:707, 738`
