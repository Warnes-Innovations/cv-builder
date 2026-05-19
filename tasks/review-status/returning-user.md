<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Returning User Review Status

**Last Updated:** 2026-04-22 16:30 ET

**Executive Summary:** Session restoration is functionally sound — job context, phase, and decisions are recovered automatically on return. Since the previous review (2026-04-20), one previously-flagged terminology defect has been corrected ("Delete" → "Move to Trash") and Bootstrap tooltips have been added to workflow step pills to partially explain navigation versus re-computation. Four medium-priority gaps remain open: no restored-decisions summary on return, the ↻ re-run icon is keyboard-inaccessible by default, abbreviated phase labels are opaque, and the header rename still uses the browser's native `prompt()`. A new low-severity finding has been added: the "Move to Trash" action in the sessions modal executes without a confirmation dialog.

---

## Application Evaluation

### US-S1: Resume With Context

#### S1.1 — Restored session identifies job/application context clearly

✅ **Pass** — On restore, `updatePositionTitle(statusData)` (`web/session-actions.js:106`) derives the job label from `status.position_name`, `status.job_analysis`, or raw `job_description_text` and writes it to `#position-title` (`web/index.html:70`) and `document.title`. The session-switcher button label is set to `{positionName} · {phase}` by `buildSessionSwitcherLabel()` (`web/session-manager.js:70`). The `#header-session-name` sub-header reads "Current session: {label}" (`web/session-switcher-ui.js:126-129`). The conversation history is replayed from `/api/history` (`web/session-manager.js:301-316`), providing narrative context.

#### S1.2 — UI indicates current stage and available next actions

✅ **Pass** — `updateWorkflowSteps(status)` (`web/workflow-steps.js:595`) marks the active step with `active` and completed steps with `completed`. `_restoreTabForPhase()` (`web/session-manager.js:210-223`) switches to the correct viewer tab based on the restored phase. `updateActionButtons` is called from `updateWorkflowSteps` to show the right primary action button for the current step.

#### S1.3 — Previously completed work is visible or discoverable without hunting

⚠️ **Partial** — `_hydrateStatusDerivedState()` (`web/session-manager.js:351-395`) rehydrates `window._savedDecisions` with experience, skill, achievement, and publication decisions from `/api/status`. For `rewrite_review` phase, rewrites are pre-fetched and cached in the panel (`web/session-manager.js:646-659`). Tab data for analysis, customizations, and CV is restored from `stateManager.setTabData()` calls in `_hydrateStatusTabState()`. However, **no summary of restored decisions is surfaced in the UI**. A returning user must navigate to each tab (exp-review, skills-review, rewrite, etc.) individually to confirm their prior decisions are intact. There is no "welcome back" screen or restored-decisions overview.

**Failure mode guarded against:** "Generic blank or default view" — mitigated: `ensureSessionContext()` shows the Sessions landing panel only when no `?session=` param is in the URL; otherwise restoration proceeds automatically. "Prior decisions not surfaced clearly" — this failure mode is only partially addressed.

**Acceptance criteria:**
- "Resumed session communicates stage and context immediately" — ✅ position title + workflow bar + tab switch.
- "User can tell what is completed vs. what remains" — ⚠️ The workflow bar shows `completed` vs `active` vs unlabelled future steps, but the abbreviated phase labels (`SESSION_PHASE_LABELS_SHORT` e.g. "Custom", "Spell") may not be self-explanatory to occasional users (`web/utils.js:274-285`).

---

### US-S2: Safe Re-entry and Backtracking

#### S2.1 — Back-navigation behavior is explicit about downstream consequences

⚠️ **Partial** — Two distinct mechanisms exist:

1. **Step-click (view navigation):** `handleStepClick(step)` (`web/workflow-steps.js:712`) simply calls `switchTab()` without changing backend phase and without showing any warning. This is technically safe (no state change). Bootstrap tooltips via `_getStepTooltip()` and `_updateViewingIndicator()` (`web/workflow-steps.js:195-253`) now show `'Click to view'` (on completed non-active steps) and `'Active step — click to return'` (on browsing-away steps). However, the tooltip is hover-only and provides no persistent on-screen label; keyboard-only and touch users receive no explanation.
2. **↻ Re-run (LLM recomputation):** `confirmReRunPhase(step)` (`web/workflow-steps.js:182`) calls `_showReRunConfirmModal(step, 'rerun', ...)` which lists downstream stages that have been completed and states "All existing approvals and rewrites are preserved as context." This path is correctly guarded.

The modal is **not** triggered for step-click back-navigation, only for the ↻ button. The gap is that users clicking a completed step to "go back" receive only a transient hover tooltip, not a persistent explanation that this is view-only.

#### S2.2 — Re-entry into earlier phases preserves prior context where intended

✅ **Pass** — `backToPhase()` (`web/workflow-steps.js:88`) appends the message "↻ Navigating back to {step}. Prior decisions and approvals are preserved." The `_showReRunConfirmModal` note says the same ("All existing approvals and rewrites are preserved as context"). Backend `/api/back-to-phase` and `/api/re-run-phase` endpoints implement the preservation guarantee.

#### S2.3 — UI distinguishes between navigating back and rerunning/recomputing

⚠️ **Partial (improved)** — The ↻ icon is `opacity:0` by default, injected via `style="…opacity:0…"` inline on the element (`web/workflow-steps.js:668`) with the CSS `.step.completed:hover .step-rerun { opacity: 1 !important; }` applied at runtime (`web/workflow-steps.js:687`). Only on hover does ↻ appear. Keyboard-only and touch users cannot discover it. The element carries `title="Re-run ${step} with updated inputs"` (standard HTML title, not a Bootstrap tooltip).

Since the previous review, Bootstrap tooltips via `_getStepTooltip()` + `_updateViewingIndicator()` (`web/workflow-steps.js:195-253`) now show `'Click ↻ to rerun from here'` when the user is *currently viewing* a completed step, and `'Click to view'` on other completed steps. This is an improvement but still hover-dependent.

**Failure modes:**
- "Users unintentionally overwriting downstream work" — ✅ mitigated: step-click does not change phase; re-run requires ↻ + confirmation dialog.
- "Re-run behavior visually indistinguishable from navigation" — ⚠️ partially addressed: Bootstrap tooltip on the step pill now distinguishes 'Click to view' from 'Click ↻ to rerun from here', but this distinction remains hover-only and invisible to keyboard/touch users.

**Acceptance criteria:**
- "Returning users receive sufficient warning before downstream state changes" — ✅ for re-run path.
- "Distinction between re-entry and recomputation is understandable" — ⚠️ implicit only; requires hover discovery.

---

### US-S3: Trustworthy Session Continuity

#### S3.1 — Saved decisions can be re-observed when their stage is revisited

⚠️ **Partial** — State restoration is real: `_hydrateStatusDerivedState()` (session-manager.js:351) reloads all decision maps. For `rewrite_review` phase, the rewrite panel is pre-populated from `/api/rewrites` (session-manager.js:646-659). For customization tabs, `_hydrateStatusTabState()` sets `stateManager.setTabData('customizations', ...)` which is read by review table rendering. However, whether each tab correctly re-renders prior selections (e.g. checked/unchecked states in the experience table) on revisit depends on tab-specific rendering code outside the files reviewed here. The session-manager restore confirms data is present, but legibility within each tab is unverified from this set of source files alone.

#### S3.2 — Generated/previewed outputs remain logically connected to current state

✅ **Pass** — The layout freshness system is fully implemented. `getLayoutFreshnessFromState()` (`web/state-manager.js:100-144`) computes `isStale` and `isCritical` from `contentRevision` vs. `lastPreviewContentRevision`/`lastFinalContentRevision`. `applyLayoutFreshnessNavigationState()` (`web/workflow-steps.js:50-84`) shows "Outdated" badges on the Layout step and downstream download/finalise tabs. CSS in `web/styles.css:118-119,153-154,487-489` styles the stale/critical states distinctively.

#### S3.3 — Session restoration does not mislead about which version is current

✅ **Pass** — `_resolveRestoredPhase()` (`web/session-manager.js:225-249`) has two defensive guards:
- If `job_analysis` is absent, forces `PHASES.INIT` regardless of stored phase.
- If phase is `CUSTOMIZATION` or `REWRITE_REVIEW` but customizations are missing (e.g. server restarted mid-workflow), falls back to `PHASES.JOB_ANALYSIS`.
Restore messages include the session name and phase: "✅ Session restored: {positionName} ({phase})" (`web/session-manager.js:666`).

**Acceptance criteria:**
- "Previously saved work is recoverable and legible on return" — ⚠️ Recoverable: yes. Legible: depends on per-tab rendering (partially verified).
- "Current vs. earlier outputs distinguishable when multiple passes occurred" — ✅ stale/critical badge system covers this.

---

## Generated Materials Evaluation

The returning user persona does not directly evaluate generated CV files; the relevant questions are whether a returning user can find their previous outputs and whether those outputs are marked as current or outdated. The layout freshness system (US-S3.2 above) addresses this. No additional generated-materials gaps identified that are specific to this persona.

---

## Terminology Clarity

| Term | Location | Assessment |
|------|----------|------------|
| "Move to Trash" button in sessions modal | `web/session-switcher-ui.js:85` | ✅ Fixed (updated from "Delete" since prior review) — label now reads "Move to Trash"; `title` attribute also says "Move session to Trash". The reversible soft-delete behavior is now accurately communicated. |
| "Done" as phase label | `web/utils.js:283` (`SESSION_PHASE_LABELS_SHORT`) | ⚠️ Misleading — `refinement` maps to "Done" in the compact session switcher, but a session in `refinement` phase is actively being refined, not necessarily complete. |
| "Custom" as phase label | `web/utils.js:277` | ⚠️ Ambiguous abbreviation — "Custom" for `customization` phase is compact but non-obvious to returning users. |
| "↻" re-run icon | `web/workflow-steps.js:672-676` | ⚠️ Hidden by default — discoverable only via hover; not labelled. |
| "Takeover" | `web/session-switcher-ui.js:180-183` | ✅ Clear — ownership conflict dialog explains the action. |
| "Current tab" / "Owned by another tab" / "Unclaimed" | `web/session-manager.js:82-97` | ✅ Clear ownership terminology. |
| `promptRenameCurrentSession()` uses `prompt()` | `web/session-manager.js:737` | ⚠️ Browser `prompt()` can be silently suppressed by "Prevent this page from creating additional dialogs" — inconsistent with the custom `confirmDialog()` used elsewhere. |
| "Move to Trash" in sessions modal has no confirmation | `web/session-switcher-ui.js:317-332` | ⚠️ `_deleteSessionFromModal()` calls `fetch('/api/delete-session', …)` directly with no `confirmDialog()`. The action is reversible via Trash, but users receive no in-app confirmation before the session disappears from the list. |

---

## Additional Story Gaps / Proposed Story Items

**GAP-R1 (HIGH) — No restored-decisions summary on return**
After session restore, there is no human-readable summary of what was recovered (e.g. "4 experiences selected, 12 skills, 7 rewrites approved"). The user must navigate to each tab individually to verify their prior work.
> Proposed story: "As a returning user, I want a brief summary of my restored session decisions so that I can quickly verify my prior work is intact before continuing."

**GAP-R2 (RESOLVED ✅) — "Delete" label corrected to "Move to Trash"**
Previously flagged as HIGH. The button at `web/session-switcher-ui.js:85` was relabelled from "Delete" to "Move to Trash" since the 2026-04-20 review. The `title` attribute also reads "Move session to Trash". The Trash view with Restore and Delete Forever actions provides the full recovery path. No further action needed on this specific gap.

**GAP-R2b (LOW) — "Move to Trash" executes without confirmation**
The `_deleteSessionFromModal()` function (`web/session-switcher-ui.js:317`) calls the API directly with no `confirmDialog()`. While the action is reversible (session goes to Trash), a click on the red "Move to Trash" button immediately removes the session from the list with no "Are you sure?" step. Compare: "Delete Forever" (`web/session-switcher-ui.js:454`) and "Empty Trash" (`web/session-switcher-ui.js:471`) both use `confirmDialog()` before proceeding.
> Proposed fix: Add a `confirmDialog('Move this session to Trash? You can restore it from the Trash view.')` before the API call in `_deleteSessionFromModal()`.

**GAP-R3 (MEDIUM) — ↻ re-run icon is invisible until hover; not keyboard-accessible**
The ↻ re-run button is `opacity:0` by default and reveals only on hover (`web/workflow-steps.js:686-691`). Keyboard and touch users cannot discover it. Returning users who want to re-run a stage cannot find the action without prior knowledge.
> Proposed story: "As a returning user, I want re-run actions on completed steps to be persistently visible (or discoverable via keyboard) so that I can re-run a stage without needing to know to hover."

**GAP-R4 (MEDIUM, partially addressed) — Step-click vs. ↻ distinction now conveyed via hover tooltip only**
`handleStepClick` (`web/workflow-steps.js:712`) switches the view tab without showing any modal or banner. Since the 2026-04-20 review, Bootstrap tooltips via `_getStepTooltip()` / `_updateViewingIndicator()` now show `'Click to view'` and `'Click ↻ to rerun from here'` on completed step pills. This is an improvement, but the tooltip is hover-only — keyboard and touch users still receive no explanation, and there is no persistent on-screen label differentiating the two actions.
> Remaining gap: "As a returning user who uses a keyboard or touch device, I want the distinction between view-navigation and re-run to be discoverable without hover so that I can find the re-run action without prior knowledge."

**GAP-R5 (MEDIUM) — Abbreviated phase labels may be opaque to returning users**
`SESSION_PHASE_LABELS_SHORT` (`web/utils.js:274-285`) maps `refinement` → "Done" (misleading if work is ongoing) and `customization` → "Custom" (non-obvious). These labels appear in the session switcher header and the sessions modal.
> Proposed story: "As a returning user, I want session phase labels in the session switcher to be human-readable so that I can immediately understand where a prior session was left off."

**GAP-R6 (LOW) — No session duplicate/copy action**
The sessions modal offers Load, Rename, and Move to Trash, but no Duplicate. A returning user who wants to try a different approach cannot easily create a copy of an existing session.
> Proposed story: "As a returning user, I want to duplicate an existing session so that I can explore an alternative customization without risking my prior decisions."

**GAP-R7 (LOW) — Session rename uses browser `prompt()` rather than in-app modal**
`promptRenameCurrentSession()` (`web/session-manager.js:735`) uses `window.prompt()` (`web/session-manager.js:737`), which browsers can block. The sessions modal already provides inline rename (`web/session-switcher-ui.js:294-315`), but the header rename button ✏️ (visible next to the position title bar) takes a different (fragile) path.
> Proposed fix: Replace `promptRenameCurrentSession()` with an in-app modal consistent with `confirmDialog()`.

---

**Reviewed against:**
- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/session-manager.js`
- `web/session-switcher-ui.js`
- `web/session-actions.js`
- `web/workflow-steps.js`
- `web/job-input.js`
- `web/utils.js` (SESSION_PHASE_LABELS, SESSION_PHASE_LABELS_SHORT)
- `scripts/web_app.py` (endpoint contracts)
- `scripts/utils/conversation_manager.py` (Phase enum, state keys)
- `tasks/user-story-returning-user.md`
- `tasks/current-implemented-workflow.md`

---

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-S1.1 (job context on restore) | ✅ | | | | |
| US-S1.2 (current stage + next actions) | ✅ | | | | |
| US-S1.3 (completed work discoverable) | | ⚠️ | | | |
| US-S2.1 (back-nav explains consequences) | | ⚠️ | | | |
| US-S2.2 (re-entry preserves prior context) | ✅ | | | | |
| US-S2.3 (nav vs. recompute distinguishable) | | ⚠️ | | | |
| US-S3.1 (decisions re-observable) | | ⚠️ | | | |
| US-S3.2 (outputs connected to state) | ✅ | | | | |
| US-S3.3 (no misleading restoration) | ✅ | | | | |

**Tally:** 5 Pass · 4 Partial · 0 Fail · 0 Not Implemented · 0 N/A

---

**Key evidence references:**
- `web/session-manager.js:70` — `buildSessionSwitcherLabel` (context label)
- `web/session-manager.js:210-223` — `_restoreTabForPhase` (tab switch on restore)
- `web/session-manager.js:225-249` — `_resolveRestoredPhase` (phase guard)
- `web/session-manager.js:351-395` — `_hydrateStatusDerivedState` (decision rehydration)
- `web/session-manager.js:646-659` — rewrite panel pre-population
- `web/session-manager.js:735,737` — `promptRenameCurrentSession` uses `prompt()`
- `web/session-switcher-ui.js:85` — "Move to Trash" button label (fixed from prior "Delete")
- `web/session-switcher-ui.js:317-332` — `_deleteSessionFromModal` (no `confirmDialog` before API call)
- `web/workflow-steps.js:129` — `_showReRunConfirmModal` (confirmation modal)
- `web/workflow-steps.js:182` — `confirmReRunPhase` (↻ path)
- `web/workflow-steps.js:686-691` — ↻ hidden until hover
- `web/workflow-steps.js:712` — `handleStepClick` (view nav, no modal)
- `web/utils.js:274-285` — `SESSION_PHASE_LABELS_SHORT` (abbreviated phase labels)
- `web/state-manager.js:100-144` — `getLayoutFreshnessFromState` (staleness logic)
- `web/styles.css:118-119,153-154` — stale/critical badge styling

**Evidence standard:** Every conclusion is supported by source file references with line numbers from the files listed above.
