<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Returning User Review Status

**Last Updated:** 2026-06-29 14:30 ET

**Executive Summary:** The returning-user experience is strong for session identity, stage visibility, and phase continuity. Five of nine criteria pass cleanly; four are partial. Since the previous review (2026-06-22), two fixes landed: GAP-180 raised the ↻ re-run button from opacity:0 to opacity:0.35 at rest, making it visible to mouse users without hover; and GAP-178 added `aria-pressed` state to rewrite review buttons. The ↻ button remains a native `<button>` element and is keyboard-reachable via Tab (CSS `:focus-visible` brings it to full opacity), so GAP-R3 is now resolved. GAP-RU-NEW1 (cold-restore of rewrite decisions from backend `approved_rewrites`) and the step-click vs. re-run tooltip-only distinction (GAP-R4) remain open. The core decision data (`window._savedDecisions`, `stale_steps`, `generationState` freshness chip) is fully restored on every page load; no decision summary banner exists yet (GAP-R1).

---

## Application Evaluation

### US-S1: Resume With Context

As a returning user, I want to resume a saved session with immediate context about where I am, so that I can continue work without reconstructing what happened earlier.

---

#### US-S1.1 — Job identity is surfaced on resume — ✅ Pass

On restore, `restoreBackendState()` (`session-manager.js:537`) calls `/api/status` and then `updatePositionTitle(statusData)` (`session-manager.js:619`). The position bar renders the role into `#position-title` (`index.html:75`) and company/date into `#position-company` (`index.html:80`, populated via `session-actions.js`). The session-switcher header chip is built by `buildSessionSwitcherLabel(status)` (`session-manager.js:71–78`) combining `positionName · phase`, so the returning user sees role name immediately on reload.

When restoring from a saved file via `loadSessionFile()`, a confirmation message is appended to conversation: `"✅ Session restored: {position_name} ({phase_label})"` (`session-manager.js:747`), where phase labels are sourced from `SESSION_PHASE_LABELS` in `utils.js`.

---

#### US-S1.2 — Current workflow stage is visible on resume — ✅ Pass

`_resolveRestoredPhase(statusData)` (`session-manager.js:373–394`) applies two defensive guards before setting phase, then `stateManager.setPhase(restoredPhase)` (`state-manager.js:316–322`) fires all `onPhaseChange` listeners including `updateWorkflowStepsClickable(phase)` (`ui-core.js:1891`). `updateWorkflowSteps(status)` (`workflow-steps.js:612–774`) sets `active`, `completed`, and `clickable` CSS classes on all 12 step pills, and reveals the step-bar with the correct current step highlighted.

`_restoreTabForPhase(sessionPhase)` (`session-manager.js:352–371`) maps each backend phase to the correct viewer tab via `phaseTabMap` and calls `switchTab()`. `updateActionButtons(activeStep)` (`workflow-steps.js:770`) restores the primary action button set. Both in-memory restores and disk-file loads call this path.

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

1. **Step-click (view navigation):** `handleStepClick(step)` (`workflow-steps.js:813–862`) calls `switchTab()` without changing backend phase and without any warning modal. Tooltips via `_getStepTooltip()` (`workflow-steps.js:199–207`) show "Click to view" vs. "Click ↻ to rerun from here", but only on hover — not persistently visible for keyboard or touch users.

2. **↻ Re-run (LLM recomputation):** `confirmReRunPhase(step)` (`workflow-steps.js:190–192`) calls `_showReRunConfirmModal(step, 'rerun', onConfirm)` (`workflow-steps.js:138–188`), which renders a modal listing all downstream completed stages by name and states "All existing approvals and rewrites are preserved as context." The modal has a focus trap (`trapFocus('rerun-confirm-overlay')`, line 180) and Escape-key close.

The confirmation modal fires only for the ↻ recomputation path. Step-click view navigation has no modal (appropriate — no data changes occur), but the distinction between the two remains hover-dependent for non-mouse users.

---

#### US-S2.2 — Re-entry into earlier phases preserves prior context — ✅ Pass

`backToPhase(step, feedback)` (`workflow-steps.js:98–128`) calls `/api/back-to-phase` and appends to conversation: "↻ Navigating back to {step}. Prior decisions and approvals are preserved." The backend `back_to_phase()` (`conversation_manager.py:1435–1468`) preserves all of: `approved_rewrites`, `experience_decisions`, `skill_decisions`, `customizations`, conversation history, and generated files. It sets `state['iterating'] = True` and `state['stale_steps']` to signal which downstream results may be outdated without destroying them.

`_build_downstream_context()` (`conversation_manager.py:1392–1433`) builds a structured summary of prior accepted rewrites, experience/skill decisions, and spell-check corrections that is injected into re-run LLM prompts, so re-runs improve on prior work rather than starting blind.

---

#### US-S2.3 — Re-run is visually distinguishable from simple navigation — ⚠️ Partial

Three mechanisms are in place:

1. **Step bar ↻ button:** Completed steps in `RE_RUN_STEPS = {'analysis', 'customizations', 'rewrite', 'spell'}` render a `↻` native `<button>` with `opacity:0.35` at rest (`workflow-steps.js:730–733`, GAP-180 fix applied 2026-06-22). The button becomes fully opaque on CSS `:hover` and `:focus-visible` (`workflow-steps.js:762`). It carries `aria-label="Re-run {stepLabel}"` and, as a `<button>`, is Tab-accessible; keyboard focus brings it to full opacity via `:focus-visible`. Previously opacity was 0 (completely invisible); current 0.35 is a meaningful improvement but the ↻ icon at that opacity remains subtle on the step pill.

2. **Confirmation dialog titles:** `_showReRunConfirmModal` uses distinct heading text: "↻ Re-run {stepLabel}?" vs. "← Navigate back to {stepLabel}?" (`workflow-steps.js:147–149`).

3. **Iterating badge:** When `status.iterating && reentryStep === activeStep`, the active step pill shows `<span class="step-inline-badge">↻ Refining</span>` (`workflow-steps.js:720–721`), providing a persistent visual indicator after re-entry begins.

Remaining gap: No persistent on-screen text (outside hover tooltip) distinguishes "click to view" from "click ↻ to re-run" for touch and keyboard users before interaction.

---

### US-S3: Trustworthy Session Continuity

As a returning user, I want to trust that my accepted rewrites, customisations, and review decisions remain intact, so that I do not need to repeat work after an interruption.

---

#### US-S3.1 — Saved decisions can be re-observed when their stage is revisited — ⚠️ Partial

`_hydrateStatusDerivedState()` (`session-manager.js:474–518`) restores the full decision payload to `window._savedDecisions` (all experience, skill, achievement, publication decisions; `extra_skills`; `summary_focus_override`; achievement edits; intake; post-analysis Q&A). These are applied correctly when revisiting their respective review tabs.

**GAP-166 — CONFIRMED IMPLEMENTED (same-device page reload):**

- `_persistDecisions()` (`rewrite-review.js:43–47`): writes `rewriteDecisions` to `localStorage` under key `rw_decisions_{sessionId}`. Called at `applyRewriteAction()` (line 356) and `saveRewriteEdit()` (line 386).
- `_restoreDecisions()` (`rewrite-review.js:49–59`): reads from `localStorage` and merges into `rewriteDecisions`. Called at `renderRewritePanel()` line 186, after the card HTML is injected.
- `_clearPersistedDecisions()` (`rewrite-review.js:61–65`): removes the key from `localStorage`. Called at `submitRewriteDecisions()` line 481 before proceeding to spell check.

**GAP-178 — CONFIRMED IMPLEMENTED:** `aria-pressed` state is now set on accept/edit/reject buttons in the rewrite panel at render time (`false`) and updated to `true` on the active button in `applyRewriteAction()` and `saveRewriteEdit()`.

Residual gap (GAP-RU-NEW1): `_restoreDecisions()` reads only from localStorage. On cold restore (cleared storage, different device, private/incognito window, or >24h elapsed), `rewriteDecisions` remains empty and the returning user must repeat all accept/reject decisions. The backend stores final submitted decisions in `state['approved_rewrites']` and `state['rewrite_audit']` but these are not used to seed the rewrite panel.

---

#### US-S3.2 — Generated/previewed outputs remain logically connected to current session state — ✅ Pass

`getLayoutFreshnessFromState(generationState)` (`state-manager.js:120–178`) computes `isStale` and `isCritical` by comparing `contentRevision` against `lastPreviewContentRevision` and `lastFinalContentRevision`. It produces human-readable labels: "Layout current" (fresh), "Layout outdated" (amber), "Files outdated" (critical/red).

On resume, `restoreBackendState()` (`session-manager.js:563–611`) fetches `/api/cv/generation-state` and restores all generation state fields including revision counters, timestamps, and phase. The freshness chip (`index.html:95`) reflects the correct state immediately on page reload. `applyLayoutFreshnessNavigationState()` (`workflow-steps.js:60–93`) injects "Outdated" badges onto the Layout Review step pill and the Download tab label when final files are stale and critical.

---

#### US-S3.3 — Session restoration does not mislead about what version is current — ✅ Pass

`_resolveRestoredPhase(statusData)` (`session-manager.js:373–394`) applies two guards: (1) if `!statusData.job_analysis`, forces `PHASES.INIT` regardless of persisted phase; (2) if `phase` is `CUSTOMIZATION` or `REWRITE_REVIEW` but `!statusData.customizations`, falls back to `PHASES.JOB_ANALYSIS`. These prevent the UI from falsely representing that work completed by the backend is still available.

`status.stale_steps` from `back_to_phase()` (`conversation_manager.py`) is rendered as amber `.stale` pills on the step bar (`workflow-steps.js:707, 738`), with screen-reader text "(stale — results may be outdated)" (`workflow-steps.js:745–749`). Conversation history is always restored from the server (`session-manager.js:424–451`), not from localStorage, so the narrative is authoritative.

---

## Generated Materials Evaluation

No generated material artifacts (CV PDFs, DOCX files) are evaluated in this persona review. The persona scope is application session continuity, not output quality. Freshness state of generated files is addressed under US-S3.2.

---

## Additional Story Gaps / Proposed Story Items

### GAP-R1 (MEDIUM) — No restored-decisions summary on return

After session restore, no human-readable summary of recovered state is surfaced (e.g. "4 experiences selected, 12 skills, 7 rewrites approved"). The returning user must navigate to each review tab individually to verify prior work is intact. `_hydrateStatusDerivedState()` (`session-manager.js:474–518`) assembles the data in `window._savedDecisions`; it is not surfaced in the UI.

> Proposed story: "As a returning user, I want a brief summary of my restored session decisions so that I can quickly verify my prior work is intact before continuing."

---

### GAP-RU-NEW1 (MEDIUM) — Rewrite decisions not restored on cold reload (cross-device / cleared storage)

The GAP-166 fix addresses same-device page reloads. On cold restore (cleared storage, different device, private/incognito window, or >24h elapsed), `rewriteDecisions` is reset to `{}` at `session-manager.js:740` before `renderRewritePanel()` is called, and `_restoreDecisions()` finds no localStorage key. The backend `state['approved_rewrites']` and `state['rewrite_audit']` fields carry the authoritative record of submitted decisions but are not used to seed the panel.

> Proposed fix: In the `loadSessionFile()` path, seed `rewriteDecisions` from `statusData.approved_rewrites` mapped to `{id: ..., outcome: 'accept', final_text: ...}`. The localStorage path (GAP-166) would still win on same-device by overwriting the backend seed.

---

### GAP-R4 (MEDIUM) — Step-click vs. ↻ distinction is tooltip-only for touch/keyboard users

`handleStepClick()` (`workflow-steps.js:813`) switches view without a modal (correct — no data changes). Tooltips via `_getStepTooltip()` (`workflow-steps.js:199`) distinguish "Click to view" from "Click ↻ to rerun from here", but only on hover. No persistent on-screen text differentiates view navigation from LLM recomputation.

> Proposed story: "As a returning user accessing the app on a tablet or by keyboard, I want re-run actions to be permanently discoverable so I can trigger a re-run without first hovering over a step."

---

### GAP-R2b (LOW) — "Move to Trash" executes without confirmation

In the sessions modal, the move-to-trash action fires the API directly without a confirmation dialog, unlike Delete Forever and Empty Trash which call `confirmDialog()` first. This is inconsistent with the destructive-action pattern used elsewhere.

---

### GAP-R5 (LOW) — Abbreviated phase labels potentially opaque for occasional returning users

`SESSION_PHASE_LABELS_SHORT` maps `refinement` → `"Done"` (misleading if further work is intended) and `customization` → `"Custom"` (non-obvious). These appear in the session-switcher header chip and sessions modal (`utils.js`).

---

### GAP-R9 (LOW) — Remaining alert() calls in sessions modal

Multiple `alert()` calls remain in the sessions modal for error cases. Browser `alert()` can be suppressed by the "Prevent this page from creating additional dialogs" setting. `showToast()` and `showAlertModal()` are available as drop-in replacements.

---

## Previously Resolved Gaps (for continuity reference)

- **GAP-R2 (RESOLVED)** — "Delete" button relabelled to "Move to Trash"; full Trash/Restore/Delete-Forever flow implemented.
- **GAP-R3 (RESOLVED as of 2026-06-22, GAP-180)** — ↻ re-run button opacity changed from 0 (fully hidden) to 0.35 (visible at rest). Button is a native `<button>` element and is Tab-keyboard-reachable; `:focus-visible` CSS brings it to full opacity. Discoverable without hover for both mouse and keyboard users.
- **GAP-R7 (RESOLVED)** — `promptRenameCurrentSession()` rewrote header rename to inline `<input>` widget with ✓/✕ buttons; `window.prompt()` removed; errors route to `showToast()`.
- **GAP-R8 (RESOLVED)** — `final_generation` phase added to both `SESSION_PHASE_LABELS` and `SESSION_PHASE_LABELS_SHORT` in `utils.js`.
- **GAP-166 (PARTIALLY RESOLVED)** — `_persistDecisions()`, `_restoreDecisions()`, and `_clearPersistedDecisions()` are confirmed implemented and correctly wired in `web/rewrite-review.js` (lines 43–65, 186, 356, 386, 481). Same-device page-reload restore works. Cross-device / cold-reload restore from backend `approved_rewrites` is not yet implemented (see GAP-RU-NEW1 above).
- **GAP-178 (RESOLVED as of 2026-06-22)** — `aria-pressed` state added to accept/edit/reject buttons in rewrite review panel.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/session-manager.js, web/workflow-steps.js, web/rewrite-review.js

| Story   | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | ------- | ---------- | ------- | ----------- | ----- |
| US-S1   | 2       | 1          | 0       | 0           | 0     |
| US-S2   | 1       | 2          | 0       | 0           | 0     |
| US-S3   | 2       | 1          | 0       | 0           | 0     |
| **Total** | **5** | **4**      | **0**   | **0**       | **0** |

**Key evidence references:**

- US-S1.1: job identity on restore — `session-manager.js:619`, `session-manager.js:71–78`
- US-S1.2: stage visible on restore — `session-manager.js:352–371`, `workflow-steps.js:612–774`, `ui-core.js:1891`
- US-S1.3: prior work discoverable (partial) — `session-manager.js:520–534`; no summary surfaced
- US-S2.1: back-nav warnings (partial) — `workflow-steps.js:138–188` (↻ modal); `workflow-steps.js:813` (step-click, no modal, hover-only distinction)
- US-S2.2: context preserved on re-entry — `conversation_manager.py:1435–1468`, `workflow-steps.js:98–128`
- US-S2.3: re-run vs nav distinction (partial) — `workflow-steps.js:147–149` (modal titles); `workflow-steps.js:730–733` (opacity:0.35 at rest, GAP-180 resolved); `workflow-steps.js:720–721` (iterating badge)
- US-S3.1: decisions re-observable (partial) — GAP-166 confirmed at `rewrite-review.js:43–65, 186, 356, 386, 481`; GAP-178 aria-pressed confirmed; cold-restore gap remains (GAP-RU-NEW1)
- US-S3.2: outputs connected to state — `state-manager.js:120–178`, `workflow-steps.js:60–93`, `session-manager.js:563–611`
- US-S3.3: restore does not mislead — `session-manager.js:373–394`, `workflow-steps.js:707, 738`
