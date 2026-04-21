<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Returning User Review Status
**Last Updated:** 2026-04-20 17:30 ET
**Executive Summary:** Session restoration is functionally sound — context, phase, and decisions are recovered automatically — but gaps exist in surfacing a human-readable summary of what was restored and in communicating the distinction between view-navigation and LLM re-computation to users who return after an interruption.

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

1. **Step-click (view navigation):** `handleStepClick(step)` (`web/workflow-steps.js:712`) simply calls `switchTab()` without changing backend phase and without showing any warning. This is technically safe (no state change), but provides no explanation to the user.
2. **↻ Re-run (LLM recomputation):** `confirmReRunPhase(step)` (`web/workflow-steps.js:182`) calls `_showReRunConfirmModal(step, 'rerun', ...)` which lists downstream stages that have been completed and states "All existing approvals and rewrites are preserved as context." This path is correctly guarded.

The modal is **not** triggered for step-click back-navigation, only for the ↻ button. The gap is that users clicking a completed step to "go back" receive no explanation that this is view-only.

#### S2.2 — Re-entry into earlier phases preserves prior context where intended

✅ **Pass** — `backToPhase()` (`web/workflow-steps.js:88`) appends the message "↻ Navigating back to {step}. Prior decisions and approvals are preserved." The `_showReRunConfirmModal` note says the same ("All existing approvals and rewrites are preserved as context"). Backend `/api/back-to-phase` and `/api/re-run-phase` endpoints implement the preservation guarantee.

#### S2.3 — UI distinguishes between navigating back and rerunning/recomputing

⚠️ **Partial** — The ↻ icon is hidden by default (`web/styles.css`-injected rule: `.step.completed:hover .step-rerun { opacity: 1 !important; }`, `web/workflow-steps.js:686-691`), and is only revealed on hover. Keyboard-only and touch users cannot discover it. The tooltip on ↻ is `title="Re-run ${step} with updated inputs"` (visible on hover). No persistent inline label explains the distinction between step-click (view) and ↻ (recompute) for users who have returned after an absence.

**Failure modes:**
- "Users unintentionally overwriting downstream work" — ✅ mitigated: step-click does not change phase; re-run requires ↻ + confirmation dialog.
- "Re-run behavior visually indistinguishable from navigation" — ⚠️ partially fails: the ↻ button is present but invisible by default; the confirmation modal titles differ ("↻ Re-run X?" vs. "← Navigate back to X?"), but users must discover ↻ first.

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
| "Delete" button in sessions modal | `web/session-switcher-ui.js:85` | ❌ Misleading — performs `POST /api/delete-session` which moves to Trash, not permanent delete. Label should read "Move to Trash". |
| "Done" as phase label | `web/utils.js:283` (`SESSION_PHASE_LABELS_SHORT`) | ⚠️ Misleading — `refinement` maps to "Done" in the compact session switcher, but a session in `refinement` phase is actively being refined, not necessarily complete. |
| "Custom" as phase label | `web/utils.js:277` | ⚠️ Ambiguous abbreviation — "Custom" for `customization` phase is compact but non-obvious to returning users. |
| "↻" re-run icon | `web/workflow-steps.js:672-676` | ⚠️ Hidden by default — discoverable only via hover; not labelled. |
| "Takeover" | `web/session-switcher-ui.js:180-183` | ✅ Clear — ownership conflict dialog explains the action. |
| "Current tab" / "Owned by another tab" / "Unclaimed" | `web/session-manager.js:82-97` | ✅ Clear ownership terminology. |
| `promptRenameCurrentSession()` uses `prompt()` | `web/session-manager.js:657` | ⚠️ Browser `prompt()` can be silently suppressed by "Prevent this page from creating additional dialogs" — inconsistent with the custom `confirmDialog()` used elsewhere. |

---

## Additional Story Gaps / Proposed Story Items

**GAP-R1 (HIGH) — No restored-decisions summary on return**
After session restore, there is no human-readable summary of what was recovered (e.g. "4 experiences selected, 12 skills, 7 rewrites approved"). The user must navigate to each tab individually to verify their prior work.
> Proposed story: "As a returning user, I want a brief summary of my restored session decisions so that I can quickly verify my prior work is intact before continuing."

**GAP-R2 (HIGH) — "Delete" button label misrepresents Trash behavior**
The "Delete" action in the sessions modal is labelled "Delete" but performs a soft-delete to Trash (`web/session-switcher-ui.js:85`, `/api/delete-session`). A user who "deletes" a session may not realize it is recoverable from Trash.
> Proposed story: "As a returning user, I want the session delete action to clearly indicate whether deletion is permanent or reversible so that I do not accidentally lose work."

**GAP-R3 (MEDIUM) — ↻ re-run icon is invisible until hover; not keyboard-accessible**
The ↻ re-run button is `opacity:0` by default and reveals only on hover (`web/workflow-steps.js:686-691`). Keyboard and touch users cannot discover it. Returning users who want to re-run a stage cannot find the action without prior knowledge.
> Proposed story: "As a returning user, I want re-run actions on completed steps to be persistently visible (or discoverable via keyboard) so that I can re-run a stage without needing to know to hover."

**GAP-R4 (MEDIUM) — No explanation of step-click (view) vs. ↻ (re-run) distinction**
`handleStepClick` (`web/workflow-steps.js:712`) switches the view tab without showing any contextual explanation. A returning user who clicks a completed step expecting to "go back and change things" may be confused when changes require the ↻ action.
> Proposed story: "As a returning user, I want a tooltip or inline hint explaining that clicking a completed step shows the previous output (view-only navigation) while ↻ re-runs the LLM computation."

**GAP-R5 (MEDIUM) — Abbreviated phase labels may be opaque to returning users**
`SESSION_PHASE_LABELS_SHORT` (`web/utils.js:274-285`) maps `refinement` → "Done" (misleading if work is ongoing) and `customization` → "Custom" (non-obvious). These labels appear in the session switcher header and the sessions modal.
> Proposed story: "As a returning user, I want session phase labels in the session switcher to be human-readable so that I can immediately understand where a prior session was left off."

**GAP-R6 (LOW) — No session duplicate/copy action**
The sessions modal offers Load, Rename, and Delete, but no Duplicate. A returning user who wants to try a different approach cannot easily create a copy of an existing session.
> Proposed story: "As a returning user, I want to duplicate an existing session so that I can explore an alternative customization without risking my prior decisions."

**GAP-R7 (LOW) — Session rename uses browser `prompt()` rather than in-app modal**
`promptRenameCurrentSession()` (`web/session-manager.js:657`) uses `window.prompt()`, which browsers can block. The sessions modal already provides inline rename (`web/session-switcher-ui.js:294-315`), but the header rename button takes a different (fragile) path.
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
- `web/session-manager.js:657` — `promptRenameCurrentSession` uses `prompt()`
- `web/session-switcher-ui.js:85` — "Delete" label for soft-delete action
- `web/workflow-steps.js:129` — `_showReRunConfirmModal` (confirmation modal)
- `web/workflow-steps.js:182` — `confirmReRunPhase` (↻ path)
- `web/workflow-steps.js:686-691` — ↻ hidden until hover
- `web/workflow-steps.js:712` — `handleStepClick` (view nav, no modal)
- `web/utils.js:274-285` — `SESSION_PHASE_LABELS_SHORT` (abbreviated phase labels)
- `web/state-manager.js:100-144` — `getLayoutFreshnessFromState` (staleness logic)
- `web/styles.css:118-119,153-154` — stale/critical badge styling

**Evidence standard:** Every conclusion is supported by source file references with line numbers from the files listed above.
| US-S1 | 1 | 0 | 0 | 0 | 0 |
| US-S2 | 0 | 1 | 0 | 0 | 0 |
| US-S3 | 0 | 1 | 0 | 0 | 0 |

- US-S1: ✅ Pass. Returning users get immediate job/session context through the session switcher label, phase label, and the implemented resume/session-loading workflow documented in the current workflow description. Evidence: web/session-manager.js:36-70, tasks/current-implemented-workflow.md:69-87.
- US-S2: ⚠️ Partial. The app has explicit back-to-phase and re-run flows plus a downstream-effects confirmation modal, but the language still groups several different consequences under one confirmation pattern, which makes safe re-entry understandable but not especially crisp. Evidence: web/workflow-steps.js:17-117.
- US-S3: ⚠️ Partial. Session state retains rewrites, skill decisions, achievements, publications, summaries, and generation state in `conversation.state`, which is a strong continuity foundation, but the UI does not expose a visible rerun/version history when a user iterates after returning. Evidence: scripts/utils/conversation_manager.py:45-79, web/workflow-steps.js:141-182.

## Generated Materials Evaluation

⚠️ Partial. Returning users can regenerate and revisit output stages, but the current surfaces do not provide a clear before/after version trail for generated materials across reruns, so continuity depends on memory more than explicit artifact history. Evidence: web/workflow-steps.js:141-182, tasks/current-implemented-workflow.md:163-214.

## Additional Story Gaps / Proposed Story Items

- Differentiate simple back-navigation from full recomputation more explicitly in the confirmation copy. Evidence: web/workflow-steps.js:74-117.
- Add visible rerun timestamps or artifact-version labels for generated outputs after resumed sessions. Evidence: web/workflow-steps.js:141-182, web/finalise.js:25-56.
