<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Returning User Review Status

**Last Updated:** 2026-06-18 19:00 ET (cycle 4)
**Reviewer:** Source-first UI review against `tasks/user-story-returning-user.md` (US-S1–S3)

**Executive Summary:** Session restoration remains functionally sound. The big change since cycle 3 is that **GAP-R7 is now resolved**: `promptRenameCurrentSession()` (`web/session-manager.js:748–805`) has been rewritten to build an inline `<input>` widget in the position-title area with ✓/✕ buttons — no `window.prompt()` is called. Error feedback now routes to `showToast()` rather than `alert()`. However, **a new defect class is confirmed**: eight `alert()` calls remain in `web/session-switcher-ui.js` (lines 540, 542, 557, 559, 677, 678, 694, 695, 708, 709) covering saved-session rename errors, Move-to-Trash errors, Restore-from-Trash errors, Delete-Forever errors, and Empty-Trash errors. These are blocking-dialog `alert()` calls that should be replaced with `showToast()` or `showAlertModal()`. The three medium-priority gaps from cycle 3 (GAP-R1, GAP-R3, GAP-R4/R5) remain open and unchanged.

---

## Application Evaluation

### US-S1: Resume With Context

#### S1.1 — Restored session identifies job/application context clearly

✅ **Pass** — On restore, `updatePositionTitle(statusData)` (`web/session-actions.js:132`) derives the job label from `status.position_name`, then `status.job_analysis` (parsing `job_title`/`title`/`position_name` fields), then falls back to `extractTitleAndCompanyFromJobText(status.job_description_text)`. The resolved label is written to `#position-title` (`web/index.html:75`) and `document.title` is updated to `"${label} — AI CV Customizer"`. A company + date-applied subtitle appears in `#position-company` (`web/index.html:80`). The session-switcher header pill is updated to `"{positionName} · {phase}"` via `buildSessionSwitcherLabel()` (`web/session-manager.js:71`) and `_updateSessionSwitcherHeader()` (`web/session-switcher-ui.js:146`). Conversation history is replayed from `/api/history` (`web/session-manager.js:409–435`). These updates fire during `restoreBackendState()` at `web/session-manager.js:603–604`.

#### S1.2 — UI indicates current stage and available next actions

✅ **Pass** — `updateWorkflowSteps(status)` (`web/workflow-steps.js:612`) marks the active step with `.active` and all completed steps with `.completed` using the `done` map derived from `status.phase` and the presence of `job_description`, `job_analysis`, and `customizations`. `_restoreTabForPhase(sessionPhase)` (`web/session-manager.js:341`) switches the viewer to the correct tab for the restored phase. `updateActionButtons(activeStep)` is called inside `updateWorkflowSteps` to show the right primary action button. `ensureSessionContext()` (`web/session-manager.js:389`) claims the URL-scoped session automatically when a `?session=` param is present.

#### S1.3 — Previously completed work visible or discoverable without hunting

⚠️ **Partial** — `_hydrateStatusDerivedState()` (`web/session-manager.js:463–507`) rehydrates `window._savedDecisions` with all decision maps (experience, skill, achievement, publication decisions; `extra_skills`; `summary_focus_override`). `_hydrateStatusTabState()` (`web/session-manager.js:509–524`) populates `stateManager.setTabData(...)` with analysis, customizations, and generated-file references. However, **no summary of restored decisions is surfaced in the UI on return**. A returning user must navigate to each review tab (exp-review, skills-review, rewrite, etc.) to verify prior decisions are intact. No "welcome back" banner or decision-count summary exists anywhere in the restore path.

**Failure modes guarded against:**

- "Generic blank or default view" — mitigated: `ensureSessionContext()` only shows the landing panel when no `?session=` param exists; restoration is otherwise automatic.
- "Prior decisions not surfaced clearly" — only partially addressed.

**Acceptance criteria:**

- "Resumed session communicates stage and context immediately" — ✅ position title + workflow bar + tab switch.
- "User can tell what is completed vs. what remains" — ⚠️ Workflow bar shows completed/active states; no decision-count summary bridges the gap for a returning user who wants quick confidence their prior work is intact.

---

### US-S2: Safe Re-entry and Backtracking

#### S2.1 — Back-navigation behavior is explicit about downstream consequences

⚠️ **Partial** — Two distinct mechanisms exist:

1. **Step-click (view navigation):** `handleStepClick(step)` (`web/workflow-steps.js:774`) calls `switchTab()` without changing backend phase and without any warning modal. Bootstrap tooltips set via `_getStepTooltip()` (`web/workflow-steps.js:199`) and `_updateViewingIndicator()` show `'Click to view'` on completed non-active steps. The browsing-away ring (amber pulse on the active step when the user is viewing a different tab) provides a visual cue that step-click is view-only. However, these signals are hover-dependent — keyboard-only and touch users receive no persistent explanation.

2. **↻ Re-run (LLM recomputation):** `confirmReRunPhase(step)` (`web/workflow-steps.js:190`) calls `_showReRunConfirmModal(step, 'rerun', ...)` (`web/workflow-steps.js:138`), which lists all downstream completed stages and states "All existing approvals and rewrites are preserved as context." This path is correctly guarded with an explicit confirm modal.

The confirmation modal fires only for the ↻ button path, not for step-click view navigation.

#### S2.2 — Re-entry into earlier phases preserves prior context where intended

✅ **Pass** — `backToPhase()` (`web/workflow-steps.js:98`) appends the message "↻ Navigating back to {step}. Prior decisions and approvals are preserved." The re-run confirm modal note (`web/workflow-steps.js:153`) states "All existing approvals and rewrites are preserved as context." Backend endpoints `/api/back-to-phase` and `/api/re-run-phase` implement the preservation guarantee server-side.

#### S2.3 — UI distinguishes between navigating back and rerunning/recomputing

⚠️ **Partial** — The ↻ re-run button is rendered with `style="…opacity:0…"` inline (`web/workflow-steps.js:704–706`) and revealed only via `.step.completed:hover .step-rerun { opacity: 1 !important; }` (`web/workflow-steps.js:723`). The element has no `tabindex` or ARIA label; keyboard-only and touch users cannot discover it.

`_getStepTooltip()` returns `'Click ↻ to rerun from here'` when a returning user is viewing a completed step, and `'Click to view'` on other completed steps — but these tooltips are hover-only. No persistent on-screen label differentiates view navigation from recomputation.

**Failure modes:**

- "Users unintentionally overwriting downstream work" — ✅ mitigated: step-click does not mutate phase; re-run requires ↻ + confirmation listing affected stages.
- "Re-run visually indistinguishable from navigation" — ⚠️ partially addressed: tooltip exists on hover only.

**Acceptance criteria:**

- "Returning users receive sufficient warning before downstream state changes" — ✅ for re-run path.
- "Distinction between re-entry and recomputation understandable in UI" — ⚠️ implicit; requires hover discovery.

---

### US-S3: Trustworthy Session Continuity

#### S3.1 — Saved decisions can be re-observed when their stage is revisited

⚠️ **Partial** — State restoration is real: `_hydrateStatusDerivedState()` (`web/session-manager.js:463`) reloads all decision maps into `window._savedDecisions` and loads intake, post-analysis Q&A, achievement edits, and skill additions. `_hydrateStatusTabState()` (`web/session-manager.js:509`) populates `stateManager.setTabData(...)`. Whether each review tab correctly re-renders prior checkbox/selection states on revisit depends on per-tab rendering code not fully audited in these files. The data is present; legibility on each individual tab is partially verified only.

#### S3.2 — Generated/previewed outputs remain logically connected to current state

✅ **Pass** — The layout freshness system is fully implemented. `getLayoutFreshnessFromState()` (`web/state-manager.js` — called by `stateManager.getLayoutFreshness()`) computes `isStale` and `isCritical` by comparing `contentRevision` against `lastPreviewContentRevision` and `lastFinalContentRevision`. `applyLayoutFreshnessNavigationState()` (`web/workflow-steps.js:60`) injects "Outdated" badges on the Layout step pill and downstream Download tab. CSS styles `.step.stale` (amber) and `.step.stale-critical` (red) distinctively. The `layout-freshness-chip` button in the position bar (`web/index.html:95`) provides an additional status signal.

#### S3.3 — Session restoration does not mislead about which version is current

✅ **Pass** — `_resolveRestoredPhase()` (`web/session-manager.js:362`) has two defensive guards:

- If `job_analysis` is absent, forces `PHASES.INIT` regardless of stored phase.
- If phase is `CUSTOMIZATION` or `REWRITE_REVIEW` but customizations are missing (e.g. server restarted mid-workflow), falls back to `PHASES.JOB_ANALYSIS`.

These guards prevent a returning user from seeing a restored phase inconsistent with actual backend state. The restore message "🔄 Session restored from server." is appended by `restoreSession()` (`web/session-manager.js:432`).

**Acceptance criteria:**

- "Previously saved work is recoverable and legible on return" — ⚠️ Recoverable: yes. Legible within each review tab: partially verified.
- "Current vs. earlier outputs distinguishable" — ✅ stale/critical badge system and freshness chip.

---

## Specific Check: Header Rename Button (GAP-R7)

**Status: RESOLVED** — `promptRenameCurrentSession()` (`web/session-manager.js:748–805`) now builds an inline `<input>` widget in the position-title area. No `window.prompt()` is called.

**Implementation details verified:**

- `web/session-manager.js:753`: Comment reads `// Build inline input widget so we never call window.prompt()`
- `web/session-manager.js:755–769`: Creates `<span>` wrapper, `<input type="text">`, ✓ `<button>` (green, save), ✕ `<button>` (grey, cancel)
- `web/session-manager.js:771`: Hides `#position-title` element and `#rename-session-btn` during edit
- `web/session-manager.js:773`: Inserts wrapper before `titleEl`; focuses and selects input text
- `web/session-manager.js:800–804`: Keyboard: Enter commits rename, Escape cancels
- `web/session-manager.js:788`: On commit, calls `showToast()` for errors (no `alert()`)
- `web/index.html:77–78`: `#rename-session-btn` calls `onclick="promptRenameCurrentSession()"` — correctly routes to new implementation

**Remaining concern:** The rename button in the header (`web/index.html:77`) is hidden (`style="display:none"`) by default and shown only when a position label is resolved (`web/session-actions.js:174–175`: `renameBtn.style.display = label ? '' : 'none'`). This is correct behavior. The inline widget path is clean.

---

## Remaining window.prompt() and alert() Audit

**window.prompt():** No remaining calls found in any source `.js` file under `web/` (excluding `bundle.js`). GAP-R7 is fully closed.

**alert() calls remaining in source files:**

| File | Lines | Context |
| ---- | ----- | ------- |
| `web/session-switcher-ui.js` | 540 | Saved-session rename error: `alert(\`Rename failed: ${data.error}\`)` |
| `web/session-switcher-ui.js` | 542 | Saved-session rename catch: `alert(\`Rename error: ${e.message}\`)` |
| `web/session-switcher-ui.js` | 557 | Move-to-Trash error: `alert(\`Failed to move session to Trash: ...\`)` |
| `web/session-switcher-ui.js` | 559 | Move-to-Trash catch: `alert(\`Error: ${e.message}\`)` |
| `web/session-switcher-ui.js` | 677 | Restore-from-Trash error: `alert(\`Restore failed: ...\`)` |
| `web/session-switcher-ui.js` | 678 | Restore-from-Trash catch: `alert(\`Error: ${e.message}\`)` |
| `web/session-switcher-ui.js` | 694 | Delete-Forever error: `alert(\`Delete failed: ...\`)` |
| `web/session-switcher-ui.js` | 695 | Delete-Forever catch: `alert(\`Error: ${e.message}\`)` |
| `web/session-switcher-ui.js` | 708 | Empty-Trash error: `alert(\`Failed to empty trash: ...\`)` |
| `web/session-switcher-ui.js` | 709 | Empty-Trash catch: `alert(\`Error: ${e.message}\`)` |

All 10 remaining `alert()` calls are in `web/session-switcher-ui.js`. They are error feedback paths (not confirmation gates), so they are lower severity than a blocking `prompt()`, but they degrade UX — browser alert dialogs can be suppressed by the "Prevent this page from creating additional dialogs" setting, and they do not match the app's design language. The `showToast()` (`web/ui-helpers.js:68`) and `showAlertModal()` (`web/ui-helpers.js:22`) functions are available as drop-in replacements.

---

## Generated Materials Evaluation

The returning-user persona does not directly evaluate generated CV files. The relevant questions are whether a returning user can find previous outputs and whether those outputs are marked as current or outdated.

The layout freshness system (US-S3.2) addresses both concerns. `getLayoutFreshnessFromState()` correctly labels files as "Layout current", "Layout outdated", or "Files outdated" based on whether content has changed since the last preview or final generation. The Download Files tab badge (`web/workflow-steps.js:82–92`) propagates the critical staleness state visually. No additional generated-materials gaps specific to this persona were identified.

---

## Terminology Clarity

| Term | Location | Assessment |
| ---- | -------- | ---------- |
| "Move to Trash" button (sessions modal) | `web/session-switcher-ui.js:95,343` | ✅ Correct — reversible soft-delete accurately communicated |
| "refinement" → "Done" (short phase label) | `web/utils.js` | ⚠️ Misleading — a session in `refinement` may still need work; "Done" implies completion |
| "customization" → "Custom" (short phase label) | `web/utils.js` | ⚠️ Ambiguous abbreviation for occasional users |
| `final_generation` phase labels | `web/utils.js:271,286` | ✅ Fixed (GAP-R8) — both `SESSION_PHASE_LABELS` and `SESSION_PHASE_LABELS_SHORT` now have entries |
| "↻" re-run icon | `web/workflow-steps.js:704` | ⚠️ Hidden by default; hover-only; no ARIA label; not keyboard-accessible |
| Ownership conflict dialog labels | `web/session-switcher-ui.js:162–193` | ✅ Clear — "Take Over" / "Load Different" / "New Session" with explanatory message |
| Header rename (inline input) | `web/session-manager.js:748–805` | ✅ Fixed — inline `<input>` with ✓/✕ buttons; no `window.prompt()` |

---

## Additional Story Gaps / Proposed Story Items

**GAP-R1 (HIGH) — No restored-decisions summary on return**
After session restore, there is no human-readable summary of what was recovered (e.g. "4 experiences selected, 12 skills, 7 rewrites approved"). The user must navigate to each review tab individually to verify prior work is intact. `_hydrateStatusDerivedState()` (`web/session-manager.js:463`) assembles the data; it is not surfaced.
> Proposed story: "As a returning user, I want a brief summary of my restored session decisions so that I can quickly verify my prior work is intact before continuing."

**GAP-R2 (RESOLVED ✅) — "Delete" label corrected to "Move to Trash"**
Button at `web/session-switcher-ui.js:95,343` was relabelled. Trash view with Restore and Delete Forever provides full recovery. Closed.

**GAP-R2b (LOW) — "Move to Trash" executes without confirmation**
`_deleteSessionFromModal()` (`web/session-switcher-ui.js:545`) calls the API directly with no `confirmDialog()`. Compare Delete Forever (`web/session-switcher-ui.js:682`) and Empty Trash (`web/session-switcher-ui.js:699`), which both prompt first.
> Proposed fix: Add `await confirmDialog('Move this session to Trash? You can restore it from the Trash view.')` before the `fetch` call in `_deleteSessionFromModal()`.

**GAP-R3 (MEDIUM) — ↻ re-run icon invisible until hover; not keyboard-accessible**
The ↻ re-run button is `opacity:0` by default (`web/workflow-steps.js:704–706`) and reveals only on CSS `:hover` (`web/workflow-steps.js:723`). The element has no `tabindex` or ARIA label. Keyboard and touch users cannot discover or activate it.
> Proposed story: "As a returning user, I want re-run actions on completed steps to be persistently visible or keyboard-discoverable so I can re-run a stage without needing to hover."

**GAP-R4 (MEDIUM, partially addressed) — Step-click vs. ↻ distinction is hover-only**
`handleStepClick()` (`web/workflow-steps.js:774`) switches view without a modal. Bootstrap tooltips via `_getStepTooltip()` (`web/workflow-steps.js:199`) distinguish 'Click to view' from 'Click ↻ to rerun from here', but only on hover. Keyboard and touch users have no persistent indicator.

**GAP-R5 (MEDIUM) — Abbreviated phase labels opaque to occasional returning users**
`SESSION_PHASE_LABELS_SHORT` maps `refinement` → "Done" (misleading if work is ongoing) and `customization` → "Custom" (non-obvious). These appear in the session-switcher header chip.
> Proposed story: "As a returning user, I want session phase labels in the session switcher to be human-readable so I can immediately understand where a prior session was left off."

**GAP-R7 (RESOLVED ✅) — Session rename via header button used browser `window.prompt()`**
`promptRenameCurrentSession()` has been rewritten to use an inline `<input>` element with ✓/✕ buttons directly in the header position-title area (`web/session-manager.js:748–805`). Error feedback now routes to `showToast()`. No `window.prompt()` or `alert()` calls remain in this function. Closed.

**GAP-R8 (RESOLVED ✅) — `final_generation` phase missing from both label maps**
Fixed by GAP-124. `SESSION_PHASE_LABELS` now has `final_generation: 'Final Generation'` and `SESSION_PHASE_LABELS_SHORT` has `final_generation: 'Final Gen'`. Closed.

**GAP-R9 (NEW — MEDIUM) — Remaining alert() calls in session-switcher-ui.js degrade UX**
Ten `alert()` calls remain in `web/session-switcher-ui.js` (lines 540, 542, 557, 559, 677, 678, 694, 695, 708, 709). These are error-path dialogs in saved-session rename, Move-to-Trash, Restore-from-Trash, Delete-Forever, and Empty-Trash operations. Browser `alert()` can be suppressed by the user's browser settings ("Prevent this page from creating additional dialogs"), leaving operations with silent failures for affected users. The `showToast()` (`web/ui-helpers.js:68`) and `showAlertModal()` (`web/ui-helpers.js:22`) functions are available as drop-in replacements.
> Proposed fix: Replace all `alert(...)` calls in `web/session-switcher-ui.js` with `showToast(message, 'error')` or `showAlertModal(title, message)` as appropriate. In catch blocks where a concise single-line error is sufficient, `showToast()` is the right choice.

**GAP-R6 (LOW) — No session duplicate/copy action**
Sessions modal offers Load, Rename, and Move to Trash but no Duplicate. A returning user who wants to try an alternative customization approach cannot create a copy without risk to prior decisions.

---

## Score Summary

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
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

Scores are unchanged from cycle 3. The rename fix (GAP-R7) resolves a UX defect but does not affect any story criterion score. The newly confirmed `alert()` pattern (GAP-R9) is a UX quality issue, not a functional regression.

---

## Source Files Reviewed

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/session-manager.js`
- `web/session-switcher-ui.js`
- `web/session-actions.js`
- `web/workflow-steps.js`
- `web/ui-helpers.js`
- `scripts/utils/conversation_manager.py`
- `tasks/user-story-returning-user.md`

---

## Key Evidence References

- `web/session-actions.js:132` — `updatePositionTitle()` — derives and renders job context on restore
- `web/session-manager.js:71` — `buildSessionSwitcherLabel()` — session switcher context chip
- `web/session-manager.js:341` — `_restoreTabForPhase()` — tab switch to correct phase on restore
- `web/session-manager.js:362` — `_resolveRestoredPhase()` — defensive phase guards
- `web/session-manager.js:409–435` — `restoreSession()` — conversation history replay
- `web/session-manager.js:463–507` — `_hydrateStatusDerivedState()` — decision map rehydration
- `web/session-manager.js:509–524` — `_hydrateStatusTabState()` — tab data restore
- `web/session-manager.js:603–604` — `restoreBackendState()` — calls `updatePositionTitle`
- `web/session-manager.js:748–805` — `promptRenameCurrentSession()` — FIXED: inline input widget, no window.prompt()
- `web/session-switcher-ui.js:540,542,557,559,677,678,694,695,708,709` — remaining alert() calls (GAP-R9)
- `web/session-switcher-ui.js:545` — `_deleteSessionFromModal()` — no confirmDialog before API call (GAP-R2b)
- `web/session-switcher-ui.js:682,699` — Delete Forever / Empty Trash both use confirmDialog (correct)
- `web/workflow-steps.js:60–94` — `applyLayoutFreshnessNavigationState()` — stale/critical badges
- `web/workflow-steps.js:138–188` — `_showReRunConfirmModal()` — downstream-aware confirm modal
- `web/workflow-steps.js:190` — `confirmReRunPhase()` — ↻ path with confirmation
- `web/workflow-steps.js:199` — `_getStepTooltip()` — hover tooltip text distinguishing view vs. rerun
- `web/workflow-steps.js:704–706` — ↻ button opacity:0 by default; hover-only reveal
- `web/workflow-steps.js:723` — CSS rule: `.step.completed:hover .step-rerun { opacity: 1 !important; }`
- `web/workflow-steps.js:774` — `handleStepClick()` — view navigation, no modal
- `web/ui-helpers.js:22` — `showAlertModal()` — available as alert() replacement
- `web/ui-helpers.js:68` — `showToast()` — available as alert() replacement in catch blocks

**Evidence standard:** Every conclusion is supported by a specific file path and line number from source files read directly during this review.
