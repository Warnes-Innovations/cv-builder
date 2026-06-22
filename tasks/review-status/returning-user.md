<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# UI Review — Returning User Persona

**Persona:** Returning user — resuming a saved session after interruption or prior incomplete run
**Story IDs:** US-S1, US-S2, US-S3
**Review Date:** 2026-06-20
**Cycle:** 5 (fresh source-first read)

Source files evaluated:

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/session-manager.js`
- `web/workflow-steps.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`

---

## Application Evaluation

---

### US-S1: Resume With Context

Requirement: Restored session identifies job/application context, indicates current stage, and keeps prior work visible/discoverable.

---

#### US-S1.1 — Job identity is surfaced on resume

Status: ✅ Pass

On restore, `restoreBackendState()` (`session-manager.js:537`) calls `/api/status` and then `updatePositionTitle(statusData)` (`session-manager.js:619`). The position bar renders the job label into `#position-title` (`index.html:75`) and company into `#position-company` (`index.html:80`). `document.title` is updated to `"${label} — AI CV Customizer"`. The session switcher header pill (`index.html:47`) is built by `buildSessionSwitcherLabel(status)` (`session-manager.js:71–78`) combining `positionName · phase`, so the returning user sees the role name immediately on reload without any navigation.

Session load confirmation message (`session-manager.js:747`) names the position explicitly: `"✅ Session restored: {position_name} ({phase_label})"`.

---

#### US-S1.2 — Current workflow stage is visible on resume

Status: ✅ Pass

`_resolveRestoredPhase(statusData)` (`session-manager.js:373–394`) resolves a safe phase, with two defensive guards (see US-S3.3). `stateManager.setPhase(restoredPhase)` fires all `onPhaseChange` listeners (`state-manager.js:316–322`), which triggers `updateWorkflowStepsClickable(phase)` (`ui-core.js:1879`). `updateWorkflowSteps(status)` (`workflow-steps.js:612–735`) sets `active`, `completed`, and `clickable` CSS classes on all 12 step pills in real time. `_restoreTabForPhase(sessionPhase)` (`session-manager.js:352–371`) and `loadSessionFile` (`session-manager.js:705–718`) both map each backend phase to the correct viewer tab via `phaseTabMap`, calling `switchTab()`.

The primary action button set is restored via `updateActionButtons(activeStep)` called inside `updateWorkflowSteps` (`workflow-steps.js:731`), so the correct "next step" button is immediately visible.

---

#### US-S1.3 — Previously completed work remains visible/discoverable

Status: ⚠️ Partial

`_hydrateStatusTabState(statusData)` (`session-manager.js:520–534`) restores `analysis`, `customizations`, and `cv` tab data into `stateManager`. The `#ats-report-btn` and `#job-analysis-btn` (`index.html:102–105`) are revealed after analysis completes. Completed steps receive `class="completed clickable"` (`workflow-steps.js:699–700`), so all prior results are reachable via step-click.

Conversation history is replayed from `/api/history` (`session-manager.js:424–451`), giving a narrative log of prior work.

Gap: No human-readable summary of restored decisions is surfaced in the UI immediately on return. A returning user must navigate to each review tab (exp-review, skills-review, rewrite, etc.) to verify that prior decisions are intact. `_hydrateStatusDerivedState()` (`session-manager.js:474–518`) does assemble `window._savedDecisions` with experience, skill, achievement, publication decisions, `extra_skills`, and `summary_focus_override` — the data is present but not made visible to the user with any count summary or "welcome back" banner.

Failure modes:

- "Returning user sees a generic blank or default view" — Not reproduced. `ensureSessionContext()` (`session-manager.js:400–409`) only shows the sessions landing panel when no `?session=` URL param is present; restoration is automatic when the session exists.
- "Prior decisions existing in state but not surfaced clearly" — Partially addressed. Decisions are in state; no summary is surfaced to provide confidence on return.

---

### US-S2: Safe Re-entry and Backtracking

Requirement: Back-navigation explicit about downstream consequences; re-entry preserves prior context; re-run visually distinguishable from simple navigation.

---

#### US-S2.1 — Back-navigation warns about downstream consequences

Status: ⚠️ Partial

Two distinct navigation mechanisms exist:

1. **Step-click (view navigation):** `handleStepClick(step)` (`workflow-steps.js:774–823`) calls `switchTab()` without changing backend phase and without any warning modal. Bootstrap tooltips via `_getStepTooltip()` (`workflow-steps.js:199`) show `"Click to view"` on completed non-active steps and `"Click ↻ to rerun from here"` when viewing a completed step. A browsing-away ring (amber pulse on the active step) provides a visual cue that step-click is view-only. However, these signals are hover-dependent — keyboard-only and touch users receive no persistent explanation.

2. **↻ Re-run (LLM recomputation):** `confirmReRunPhase(step)` (`workflow-steps.js:190–192`) calls `_showReRunConfirmModal(step, 'rerun', onConfirm)` (`workflow-steps.js:138–188`), which lists all downstream completed stages by name and states "All existing approvals and rewrites are preserved as context." The modal has a focus trap and Escape-key close. This path is correctly guarded with an explicit confirm modal.

The confirmation modal fires only for the ↻ path. Step-click view navigation has no modal, which is correct (no data changes), but the distinction is hover-dependent and not keyboard-accessible.

---

#### US-S2.2 — Re-entry into earlier phases preserves prior context

Status: ✅ Pass

`backToPhase(step, feedback)` (`workflow-steps.js:98–128`) calls `/api/back-to-phase` and appends: "↻ Navigating back to {step}. Prior decisions and approvals are preserved." to the conversation panel. The backend `back_to_phase()` (`conversation_manager.py:1435–1468`) explicitly does NOT clear `approved_rewrites`, `experience_decisions`, `skill_decisions`, `customizations`, or any downstream work. It sets `state['iterating'] = True` and `state['stale_steps']` to signal which downstream results are potentially outdated without destroying them.

`_build_downstream_context()` (`conversation_manager.py:1392–1433`) builds a structured summary of prior approved rewrites, omitted/emphasised experiences and skills, and accepted spell-check corrections for injection into the re-run LLM prompt, so re-runs improve on prior decisions rather than starting blind.

`reRunPhase(step)` (`workflow-steps.js:276–320`) also clears per-phase caches (`_spellCheckCache`, `_rewritePanelCache`) to force fresh fetch, and highlights changed items via `_highlightChangedItems(step, prior, new)` (`workflow-steps.js:332–388`) using `data-changed` attributes and animation.

---

#### US-S2.3 — Re-run is visually distinguishable from simple navigation

Status: ⚠️ Partial

Three mechanisms distinguish re-run from navigation:

1. **Step bar ↻ button:** Completed steps in `RE_RUN_STEPS = {'analysis', 'customizations', 'rewrite', 'spell'}` render a `↻` span with `opacity:0` by default (`workflow-steps.js:703–708`), revealed via CSS `:hover` (`workflow-steps.js:723`). The element has no `tabindex` or ARIA label — keyboard-only and touch users cannot discover it.

2. **Confirmation dialog titles:** `_showReRunConfirmModal` uses distinct title text: "↻ Re-run {stepLabel}?" for re-run vs. "← Navigate back to {stepLabel}?" for back-nav (`workflow-steps.js:147–149`).

3. **Iterating badge:** When `status.iterating && reentryStep === activeStep`, the active step pill shows `<span class="step-inline-badge">↻ Refining</span>` (`workflow-steps.js:694–696`).

Failure modes:

- "Users unintentionally overwriting downstream work" — Not reproduced. Step-click does not mutate phase; ↻ requires explicit confirmation listing affected stages.
- "Re-run visually indistinguishable from navigation" — Partially addressed: tooltip and modal title exist but ↻ button is hover/mouse-only.

---

### US-S3: Trustworthy Session Continuity

Requirement: Accepted rewrites, customisations, and review decisions remain intact after interruption; current vs earlier outputs are distinguishable.

---

#### US-S3.1 — Saved decisions can be re-observed when their stage is revisited

Status: ⚠️ Partial

`_hydrateStatusDerivedState()` (`session-manager.js:474–518`) restores the full decision payload to `window._savedDecisions` (experience, skill, achievement, publication decisions; `extra_skills`; `summary_focus_override`; achievement edits; intake; post-analysis Q&A). This data is present and rehydrated.

Confirmed gap: When loading a session from disk via `loadSessionFile()` at `REWRITE_REVIEW` phase (`session-manager.js:732–744`), the code resets `rewriteDecisions = {}` before calling `renderRewritePanel`. Prior accept/reject decisions (stored in `status.approved_rewrites` / `status.rewrite_audit`) are not used to pre-populate the panel. A returning user who had partially accepted rewrites before interruption sees all rewrites as un-decided on return and must repeat every decision.

Evidence — `session-manager.js:740–742`:

```js
rewriteDecisions = {};
renderRewritePanel(rewrites, warnings);
```

The empty `rewriteDecisions = {}` discards any prior state inferrable from `approved_rewrites`.

---

#### US-S3.2 — Generated/previewed outputs remain logically connected to current session state

Status: ✅ Pass

The layout freshness system is fully operational. `getLayoutFreshnessFromState(generationState)` (`state-manager.js:120–178`) computes `isStale` and `isCritical` by comparing `contentRevision` against `lastPreviewContentRevision` and `lastFinalContentRevision`. Labels: "Layout current" (green), "Layout outdated" (amber), "Files outdated" (red).

On resume, `restoreBackendState()` (`session-manager.js:563–611`) fetches `/api/cv/generation-state` and restores all generation state fields including `contentRevision`, `lastPreviewContentRevision`, `lastFinalContentRevision`, `finalGeneratedAt`, and `previewGeneratedAt`. The freshness chip (`index.html:95`) therefore reflects the correct state immediately on page reload without requiring any user navigation.

`applyLayoutFreshnessNavigationState()` (`workflow-steps.js:60–93`) also injects "Outdated" badges onto the Layout Review step pill and the Download Files tab label when the final files are stale and critical — making the mismatch impossible to miss.

---

#### US-S3.3 — Session restoration does not mislead about what version is current

Status: ✅ Pass

`_resolveRestoredPhase(statusData)` (`session-manager.js:373–394`) applies two guards before restoring phase:

1. If `!statusData.job_analysis`, forces `PHASES.INIT` regardless of persisted phase — prevents claiming analysis is complete when it is not.
2. If `phase` is `CUSTOMIZATION` or `REWRITE_REVIEW` but `!statusData.customizations`, falls back to `PHASES.JOB_ANALYSIS` — prevents claiming customisations were completed when only analysis ran (e.g. after a mid-workflow server restart).

`status.stale_steps` from `back_to_phase()` (`conversation_manager.py:1452–1455`) is rendered as amber `.stale` pills on the step bar (`workflow-steps.js:682, 711`), so the user can see at a glance which downstream results may not reflect recent edits.

The conversation history is always restored from the server (`session-manager.js:424–451`) rather than from localStorage, so the narrative is authoritative and cannot drift.

---

## Generated Materials Evaluation

The returning-user persona does not directly evaluate generated CV file quality. The relevant questions are whether a returning user can find previous outputs and whether those outputs are clearly marked as current or outdated.

Status: ✅ Pass — The layout freshness system (US-S3.2) and the Download Files "Outdated" tab badge (`workflow-steps.js:82–92`) address both concerns. No additional generated-materials gaps specific to this persona were identified.

---

## Terminology and Clarity Assessment

| Term used | Location | Assessment |
| --- | --- | --- |
| `"{positionName} · {phase}"` session switcher label | `session-manager.js:71` | ✅ Clear when positionName is present |
| `"Session · {phase}"` fallback label | `session-manager.js:77` | ⚠️ Generic; uninformative when positionName is absent (unnamed/new sessions) |
| `"refinement"` short label (may map to "Done") | utils.js | ⚠️ "Done" implies completion; a refinement session may still need work |
| `"↻ Refining"` step badge | `workflow-steps.js:695` | ✅ Clear — signals in-progress re-run without ambiguity |
| `"Layout outdated"` / `"Files outdated"` freshness chip | `state-manager.js:163, 149` | ✅ Clear — direct, action-oriented |
| `"↻"` re-run icon on step pill | `workflow-steps.js:704` | ⚠️ Hidden by default (opacity:0); hover-only; no ARIA label; not keyboard-accessible |
| "Prior decisions and approvals are preserved." | `workflow-steps.js:111` | ✅ Clear and reassuring for returning users |
| "← Navigate back to {stepLabel}?" / "↻ Re-run {stepLabel}?" confirm dialog | `workflow-steps.js:147–149` | ✅ Clearly differentiates view-navigation from recomputation in the modal |
| "All existing approvals and rewrites are preserved as context." | `workflow-steps.js:153` | ✅ Provides explicit continuity guarantee in the confirmation dialog |

---

## Summary Table

| Story | Criterion | Status | Key Evidence |
| --- | --- | --- | --- |
| US-S1.1 | Job context on resume | ✅ Pass | `session-manager.js:619`, `session-manager.js:71` |
| US-S1.2 | Current stage visible on resume | ✅ Pass | `session-manager.js:352`, `workflow-steps.js:612`, `ui-core.js:1879` |
| US-S1.3 | Prior work visible/discoverable | ⚠️ Partial | Data hydrated (`session-manager.js:520`); no decision-count summary shown |
| US-S2.1 | Back-nav warns of downstream consequences | ⚠️ Partial | `workflow-steps.js:138–188` for ↻ path; step-click has no modal |
| US-S2.2 | Re-entry preserves prior context | ✅ Pass | `conversation_manager.py:1435–1468`, `workflow-steps.js:98–128` |
| US-S2.3 | Re-run distinguishable from navigation | ⚠️ Partial | Modal title differs; ↻ button hover-only; no keyboard access |
| US-S3.1 | Decisions re-observable on return | ⚠️ Partial | Most decisions restored; rewrite accept/reject reset at `session-manager.js:740` |
| US-S3.2 | Outputs connected to session state | ✅ Pass | `state-manager.js:120`, `workflow-steps.js:60`, `session-manager.js:563` |
| US-S3.3 | Restoration does not mislead about version | ✅ Pass | `session-manager.js:373` two phase guards, `workflow-steps.js:711` stale pills |

Tally: 5 Pass · 4 Partial · 0 Fail · 0 Not Implemented · 0 N/A

---

## Gaps Identified (Cycle 5)

### GAP-R1 (MEDIUM) — No restored-decisions summary on return

After session restore, no human-readable summary of recovered state is surfaced (e.g. "4 experiences selected, 12 skills, 7 rewrites approved"). The returning user must navigate to each review tab individually to verify prior work is intact.

`_hydrateStatusDerivedState()` (`session-manager.js:474–518`) assembles the data in `window._savedDecisions`; it is not surfaced anywhere in the UI.

> Proposed story: "As a returning user, I want a brief summary of my restored session decisions so that I can quickly verify my prior work is intact before continuing."

---

### GAP-R2b (LOW) — "Move to Trash" executes without confirmation

In the sessions modal, the move-to-trash action fires the API directly without a confirmation dialog, unlike Delete Forever and Empty Trash which both call `confirmDialog()` before proceeding.

Evidence: the delete path in the sessions switcher lacks a pre-flight confirm, which is inconsistent with the rest of the destructive-action pattern in the codebase.

> Proposed fix: Add `await confirmDialog('Move this session to Trash? You can restore it from the Trash view.')` before the API call in the trash action handler.

---

### GAP-R3 (MEDIUM) — ↻ re-run icon invisible until hover; not keyboard-accessible

The ↻ re-run button is `opacity:0` by default (`workflow-steps.js:704–706`) and visible only via CSS `:hover` (`workflow-steps.js:723`). The element has no `tabindex` or ARIA label. Keyboard-only and touch users cannot discover or activate the re-run path.

> Proposed story: "As a returning user, I want re-run actions on completed steps to be persistently visible or keyboard-discoverable so I can re-run a stage without needing to hover."

---

### GAP-R4 (MEDIUM) — Step-click vs. ↻ distinction is hover/tooltip-only

`handleStepClick()` (`workflow-steps.js:774`) switches view without a modal. Bootstrap tooltips via `_getStepTooltip()` (`workflow-steps.js:199`) distinguish `"Click to view"` from `"Click ↻ to rerun from here"`, but only on hover. No persistent on-screen text differentiates view navigation from LLM recomputation for keyboard and touch users.

---

### GAP-RU-NEW1 (MEDIUM) — Rewrite accept/reject state not restored on session resume

When loading a session from disk at `REWRITE_REVIEW` phase, `rewriteDecisions = {}` is reset before `renderRewritePanel` is called (`session-manager.js:740–742`). Prior accept/reject decisions are available in `status.approved_rewrites` and `status.rewrite_audit` but are not used to pre-populate the panel. A returning user who interrupted mid-review must repeat all accept/reject decisions from scratch.

> Proposed fix: Seed `rewriteDecisions` from `status.approved_rewrites` (keyed by rewrite id with `outcome: 'accept'`) before calling `renderRewritePanel` in the session load path.

---

### GAP-R5 (LOW) — Abbreviated phase labels opaque for occasional returning users

`SESSION_PHASE_LABELS_SHORT` maps `refinement` → `"Done"` (misleading if work is still in progress) and `customization` → `"Custom"` (non-obvious). These appear in the session-switcher header chip and sessions modal.

> Proposed story: "As a returning user, I want session phase labels in the session switcher to be human-readable so I can immediately understand where a prior session was left off."

---

### GAP-R9 (MEDIUM) — Remaining alert() calls in session-switcher-ui.js degrade UX

Multiple `alert()` calls remain in the sessions modal for error cases (saved-session rename errors, Move-to-Trash errors, Restore-from-Trash errors, Delete-Forever errors, Empty-Trash errors). Browser `alert()` can be suppressed by the user's browser settings ("Prevent this page from creating additional dialogs"), leaving operations silently failing for affected users. `showToast()` and `showAlertModal()` are available as drop-in replacements.

> Proposed fix: Replace remaining `alert(...)` calls in the sessions switcher UI with `showToast(message, 'error')` or `showAlertModal(title, message)` as appropriate.

---

## Previously Resolved Gaps (for continuity reference)

- **GAP-R2 (RESOLVED)** — "Delete" button relabelled to "Move to Trash"; full Trash/Restore/Delete-Forever flow implemented.
- **GAP-R7 (RESOLVED)** — `promptRenameCurrentSession()` (`session-manager.js:759–819`) rewrote header rename to inline `<input>` widget with ✓/✕ buttons; `window.prompt()` removed; errors route to `showToast()`.
- **GAP-R8 (RESOLVED)** — `final_generation` phase added to both `SESSION_PHASE_LABELS` and `SESSION_PHASE_LABELS_SHORT` in utils.js.

---

## Key Evidence References

- `session-manager.js:71` — `buildSessionSwitcherLabel()` — session switcher context chip
- `session-manager.js:352` — `_restoreTabForPhase()` — tab switch to correct phase on restore
- `session-manager.js:373–394` — `_resolveRestoredPhase()` — defensive phase guards
- `session-manager.js:400–409` — `ensureSessionContext()` — URL-scoped session claim
- `session-manager.js:412–472` — `restoreSession()` — conversation history replay
- `session-manager.js:474–518` — `_hydrateStatusDerivedState()` — decision map rehydration
- `session-manager.js:520–534` — `_hydrateStatusTabState()` — tab data restore
- `session-manager.js:537–646` — `restoreBackendState()` — phase/tab/freshness restore
- `session-manager.js:619` — `updatePositionTitle()` called after restore
- `session-manager.js:740–742` — `rewriteDecisions = {}` reset (GAP-RU-NEW1)
- `state-manager.js:120–178` — `getLayoutFreshnessFromState()` — freshness computation
- `state-manager.js:316–322` — `stateManager.setPhase()` fires onPhaseChange listeners
- `workflow-steps.js:60–93` — `applyLayoutFreshnessNavigationState()` — stale/critical badges
- `workflow-steps.js:98–128` — `backToPhase()` — back-nav with preserved-context message
- `workflow-steps.js:138–188` — `_showReRunConfirmModal()` — downstream-aware confirm modal
- `workflow-steps.js:190–192` — `confirmReRunPhase()` — ↻ path with confirmation
- `workflow-steps.js:612–735` — `updateWorkflowSteps()` — step bar active/completed/stale state
- `workflow-steps.js:694–696` — "↻ Refining" badge on active step when iterating
- `workflow-steps.js:703–708` — ↻ button with opacity:0 default (hover-only)
- `workflow-steps.js:774–823` — `handleStepClick()` — view navigation, no modal
- `conversation_manager.py:1392–1433` — `_build_downstream_context()` — prior-decision injection for re-runs
- `conversation_manager.py:1435–1468` — `back_to_phase()` — preserves all state, sets stale_steps
- `ui-core.js:1879` — `updateWorkflowStepsClickable()` — called on phase change
