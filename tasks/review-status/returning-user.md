<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Returning User Review Status

**Last Updated:** 2026-06-18 (cycle 3)
**Reviewer:** Source-first UI review against `tasks/user-story-returning-user.md` (US-S1–S3)

**Executive Summary:** Session restoration is functionally sound — job context, phase, and decisions are recovered automatically on return. The workflow bar correctly shows completed vs active vs upcoming steps, and the layout freshness staleness system reliably flags outdated outputs. **GAP-R8 is now resolved:** `final_generation` is present in both `SESSION_PHASE_LABELS` (`'Final Generation'`) and `SESSION_PHASE_LABELS_SHORT` (`'Final Gen'`) in `web/utils.js:271,286`. Three medium-priority gaps remain open from prior reviews: no restored-decisions summary on return (GAP-R1), the re-run icon (↻) is keyboard-inaccessible (GAP-R3), and abbreviated phase labels are opaque to occasional users (GAP-R5). Two low-priority gaps persist: GAP-R2b ("Move to Trash" without confirmation) and GAP-R7 (header rename uses browser `prompt()`).

---

## Application Evaluation

### US-S1: Resume With Context

#### S1.1 — Restored session identifies job/application context clearly

✅ **Pass** — On restore, `updatePositionTitle(statusData)` (`web/session-actions.js:132`) derives the job label from `status.position_name`, then `status.job_analysis` (parsing `job_title`/`title`/`position_name` fields), then falls back to `extractTitleAndCompanyFromJobText(status.job_description_text)`. The resolved label is written to `#position-title` (`web/index.html:75`) and `document.title` is updated to `"${label} — AI CV Customizer"`. A company + date-applied subtitle is shown in `#position-company` (`web/index.html:80`). The session-switcher header pill is updated to `"{positionName} · {phase}"` by `buildSessionSwitcherLabel()` (`web/session-manager.js:71`). Conversation history is replayed from `/api/history` (`web/session-manager.js:409–435`), providing narrative context. These updates fire during `restoreBackendState()` (`web/session-manager.js:603–604`).

#### S1.2 — UI indicates current stage and available next actions

✅ **Pass** — `updateWorkflowSteps(status)` (`web/workflow-steps.js:612`) marks the active step with `.active` (blue) and all completed steps with `.completed` (green) using the `done` map derived from `status.phase` and presence of `job_description`, `job_analysis`, `customizations`. `_restoreTabForPhase(sessionPhase)` (`web/session-manager.js:337`) switches the viewer to the correct tab for the restored phase. `updateActionButtons(activeStep)` is called inside `updateWorkflowSteps` to show the right primary action button. Session is restored automatically when a `?session=` URL param is present via `ensureSessionContext()` (`web/session-manager.js:385`).

#### S1.3 — Previously completed work visible or discoverable without hunting

⚠️ **Partial** — `_hydrateStatusDerivedState()` (`web/session-manager.js:459–503`) rehydrates `window._savedDecisions` with experience, skill, achievement, and publication decisions from `/api/status`. `_hydrateStatusTabState()` (`web/session-manager.js:505–519`) restores analysis, customizations, and generated-file references into `stateManager.setTabData(...)`. However, **no summary of restored decisions is surfaced in the UI on return**. A returning user must navigate to each tab (exp-review, skills-review, rewrite, etc.) to confirm prior decisions are intact. There is no "welcome back" banner or decision-count overview anywhere in the restore path.

**Failure mode guarded against:**

- "Generic blank or default view" — mitigated: `ensureSessionContext()` only shows the landing panel when no `?session=` param exists; otherwise restoration is automatic.
- "Prior decisions not surfaced clearly" — only partially addressed.

**Acceptance criteria:**

- "Resumed session communicates stage and context immediately" — ✅ position title + workflow bar + tab switch.
- "User can tell what is completed vs. what remains" — ⚠️ The workflow bar shows completed/active/upcoming states, but abbreviated step labels in the session switcher (see Terminology section) may not be self-explanatory to occasional users.

---

### US-S2: Safe Re-entry and Backtracking

#### S2.1 — Back-navigation behavior is explicit about downstream consequences

⚠️ **Partial** — Two distinct mechanisms exist:

1. **Step-click (view navigation):** `handleStepClick(step)` (`web/workflow-steps.js:774`) calls `switchTab()` without changing backend phase and without showing any warning. This is technically safe (no state mutation). Bootstrap tooltips via `_getStepTooltip()` (`web/workflow-steps.js:199`) and `_updateViewingIndicator()` (`web/workflow-steps.js:214`) show `'Click to view'` on completed non-active steps and `'Active step — click to return'` on browsing-away steps. However, these tooltips are hover-only — keyboard-only and touch users receive no explanation.

2. **↻ Re-run (LLM recomputation):** `confirmReRunPhase(step)` (`web/workflow-steps.js:190`) calls `_showReRunConfirmModal(step, 'rerun', ...)` (`web/workflow-steps.js:138`), which lists all downstream completed stages and states "All existing approvals and rewrites are preserved as context." This path is correctly guarded.

The confirmation modal fires only for the ↻ button path, not for step-click back-navigation. Users clicking a completed step receive only a hover tooltip, not a persistent explanation that this is view-only navigation.

#### S2.2 — Re-entry into earlier phases preserves prior context where intended

✅ **Pass** — `backToPhase()` (`web/workflow-steps.js:98`) appends the message "↻ Navigating back to {step}. Prior decisions and approvals are preserved." The re-run confirm modal note (`web/workflow-steps.js:153`) states "All existing approvals and rewrites are preserved as context." Backend endpoints `/api/back-to-phase` and `/api/re-run-phase` implement the preservation guarantee server-side.

#### S2.3 — UI distinguishes between navigating back and rerunning/recomputing

⚠️ **Partial** — The ↻ re-run button is rendered with `style="…opacity:0…"` inline (`web/workflow-steps.js:704–706`) and revealed only via `.step.completed:hover .step-rerun { opacity: 1 !important; }` (`web/workflow-steps.js:723`). Keyboard-only and touch users cannot discover it. The element carries a standard HTML `title` attribute but no Bootstrap tooltip.

`_getStepTooltip()` (`web/workflow-steps.js:199`) returns `'Click ↻ to rerun from here'` when a returning user is currently viewing a completed step, and `'Click to view'` on other completed steps. This is an improvement but remains hover-dependent. No persistent on-screen label differentiates the two actions.

**Failure modes:**

- "Users unintentionally overwriting downstream work" — ✅ mitigated: step-click does not mutate phase; re-run requires ↻ + confirmation dialog listing affected stages.
- "Re-run behavior visually indistinguishable from navigation" — ⚠️ partially addressed: Bootstrap tooltip on step pill distinguishes the two actions, but only on hover.

**Acceptance criteria:**

- "Returning users receive sufficient warning before downstream state changes" — ✅ for re-run path.
- "Distinction between re-entry and recomputation is understandable in the UI" — ⚠️ implicit only; requires hover discovery.

---

### US-S3: Trustworthy Session Continuity

#### S3.1 — Saved decisions can be re-observed when their stage is revisited

⚠️ **Partial** — State restoration is real: `_hydrateStatusDerivedState()` (`web/session-manager.js:459`) reloads all decision maps (`experience_decisions`, `skill_decisions`, `achievement_decisions`, `publication_decisions`, `extra_skills`, `summary_focus_override`) into `window._savedDecisions`. `_hydrateStatusTabState()` (`web/session-manager.js:505`) populates `stateManager.setTabData('customizations', ...)`, which review-table renderers read. However, whether each tab correctly re-renders prior checkbox/selection states on revisit depends on per-tab rendering code. The session-manager restore confirms data is present, but legibility within each review tab is not fully verifiable from these source files alone.

#### S3.2 — Generated/previewed outputs remain logically connected to current state

✅ **Pass** — The layout freshness system is fully implemented. `getLayoutFreshnessFromState()` (`web/state-manager.js:120`) computes `isStale` and `isCritical` by comparing `contentRevision` against `lastPreviewContentRevision` and `lastFinalContentRevision`. `applyLayoutFreshnessNavigationState()` (`web/workflow-steps.js:60`) injects "Outdated" badges on the Layout step pill and downstream Download tab (`web/workflow-steps.js:79–92`). CSS in `web/styles.css:155–156` styles `.step.stale` (amber) and `.step.stale-critical` (red) distinctively. The `layout-freshness-chip` button in the position bar (`web/index.html:95`) provides an additional status signal with `ariaLabel` set from `getLayoutFreshnessFromState()` (`web/state-manager.js:152,164,175`).

#### S3.3 — Session restoration does not mislead about which version is current

✅ **Pass** — `_resolveRestoredPhase()` (`web/session-manager.js:358`) has two defensive guards:

- If `job_analysis` is absent, forces `PHASES.INIT` regardless of stored phase.
- If phase is `CUSTOMIZATION` or `REWRITE_REVIEW` but customizations are missing (e.g. server restarted mid-workflow), falls back to `PHASES.JOB_ANALYSIS`.

These guards prevent a returning user from seeing a restored phase that is inconsistent with actual backend state. The restore message "🔄 Session restored from server." is appended by `restoreSession()` (`web/session-manager.js:428`).

**Acceptance criteria:**

- "Previously saved work is recoverable and legible on return" — ⚠️ Recoverable: yes (all decision maps rehydrated). Legible within each review tab: partially verified; depends on per-tab rendering.
- "Current vs. earlier outputs distinguishable when multiple passes have occurred" — ✅ stale/critical badge system and freshness chip cover this.

---

## Generated Materials Evaluation

The returning-user persona does not directly evaluate generated CV files. The relevant questions are: can a returning user find previous outputs, and are those outputs marked as current or outdated?

The layout freshness system (US-S3.2) addresses both. `getLayoutFreshnessFromState()` (`web/state-manager.js:120`) correctly labels files as "Layout current", "Layout outdated", or "Files outdated" based on whether content has changed since the last preview or final generation. The Download Files tab badge (`web/workflow-steps.js:82–92`) propagates the critical staleness state visually. No additional generated-materials gaps specific to this persona were identified.

---

## Terminology Clarity

| Term | Location | Assessment |
| ---- | -------- | ---------- |
| "Move to Trash" button (sessions modal) | `web/session-switcher-ui.js:95,343` | ✅ Correct — label reads "Move to Trash"; `title` attr says "Move session to Trash". Reversible soft-delete behavior is accurately communicated. |
| "refinement" → "Done" (short phase label) | `web/utils.js:284` | ⚠️ Misleading — a session in `refinement` phase is actively being refined, not necessarily complete. A returning user seeing "Done" in the session switcher may incorrectly believe no more work is needed. |
| "customization" → "Custom" (short phase label) | `web/utils.js:279` | ⚠️ Ambiguous abbreviation — non-obvious to occasional returning users; full label "Customisation" (`web/utils.js:265`) is available for full-width contexts but unused in the switcher. |
| `final_generation` phase — label maps | `web/utils.js:271,286` | ✅ **Fixed (GAP-R8 / GAP-124)** — `SESSION_PHASE_LABELS` now has `final_generation: 'Final Generation'` (line 271) and `SESSION_PHASE_LABELS_SHORT` has `final_generation: 'Final Gen'` (line 286). The fallback raw-string rendering no longer occurs. |
| "↻" re-run icon | `web/workflow-steps.js:704` | ⚠️ Hidden by default — `opacity:0`, revealed on hover only; not keyboard accessible; no ARIA label. |
| "Takeover" (session conflict dialog) | `web/session-switcher-ui.js` | ✅ Clear — ownership conflict dialog explains the action before proceeding. |
| "Current tab" / "Owned by another tab" / "Unclaimed" | `web/session-manager.js:91–99` | ✅ Clear ownership terminology in session modal. |
| `promptRenameCurrentSession()` uses `prompt()` | `web/session-manager.js:746` | ⚠️ Browser `prompt()` can be silently blocked by "Prevent this page from creating additional dialogs". The sessions modal inline rename uses proper UI, but the header ✏️ button (`web/index.html:78`) calls this `prompt()`-based path. |
| "Move to Trash" executes without confirmation | `web/session-switcher-ui.js:545` | ⚠️ `_deleteSessionFromModal()` calls `/api/delete-session` directly with no `confirmDialog()`. Compare: "Delete Forever" (`web/session-switcher-ui.js:682`) and "Empty Trash" (`web/session-switcher-ui.js:699`) both use `confirmDialog()`. The action is reversible via Trash view, but no in-app prompt fires before the session disappears. |

---

## Additional Story Gaps / Proposed Story Items

**GAP-R1 (HIGH) — No restored-decisions summary on return**
After session restore, there is no human-readable summary of what was recovered (e.g. "4 experiences selected, 12 skills, 7 rewrites approved"). The user must navigate to each review tab individually to verify prior work is intact. `_hydrateStatusDerivedState()` (`web/session-manager.js:459`) assembles the data; it just is not surfaced.
> Proposed story: "As a returning user, I want a brief summary of my restored session decisions so that I can quickly verify my prior work is intact before continuing."

**GAP-R2 (RESOLVED ✅) — "Delete" label corrected to "Move to Trash"**
Previously flagged as HIGH. Button at `web/session-switcher-ui.js:95,343` was relabelled. The Trash view with Restore and Delete Forever actions provides full recovery. Closed.

**GAP-R2b (LOW) — "Move to Trash" executes without confirmation**
`_deleteSessionFromModal()` (`web/session-switcher-ui.js:545`) calls the API directly with no `confirmDialog()`. Compare "Delete Forever" (`web/session-switcher-ui.js:682`) and "Empty Trash" (`web/session-switcher-ui.js:699`), which both prompt first.
> Proposed fix: Add `await confirmDialog('Move this session to Trash? You can restore it from the Trash view.')` before the `fetch` call in `_deleteSessionFromModal()`.

**GAP-R3 (MEDIUM) — ↻ re-run icon invisible until hover; not keyboard-accessible**
The ↻ re-run button is `opacity:0` by default (`web/workflow-steps.js:704`) and reveals only on CSS `:hover` (`web/workflow-steps.js:723`). The element has no `tabindex` or ARIA label. Keyboard and touch users cannot discover it. No keyboard-accessible alternative exists for re-running a completed phase.
> Proposed story: "As a returning user, I want re-run actions on completed steps to be persistently visible or keyboard-discoverable so that I can re-run a stage without needing to hover first."

**GAP-R4 (MEDIUM, partially addressed) — Step-click vs. ↻ distinction is hover-only**
`handleStepClick()` (`web/workflow-steps.js:774`) switches view without a modal. Bootstrap tooltips via `_getStepTooltip()` (`web/workflow-steps.js:199`) now distinguish 'Click to view' from 'Click ↻ to rerun from here', but this distinction is hover-only. Keyboard and touch users still have no persistent indicator.
> Remaining gap: "As a returning user on keyboard or touch, I want the distinction between view-navigation and re-run to be persistently visible so I can find re-run without prior knowledge of hover interactions."

**GAP-R5 (MEDIUM) — Abbreviated phase labels opaque to occasional returning users**
`SESSION_PHASE_LABELS_SHORT` (`web/utils.js:277`) maps `refinement` → "Done" (misleading if work is ongoing) and `customization` → "Custom" (non-obvious). These appear in the session-switcher header chip.
> Proposed story: "As a returning user, I want session phase labels in the session switcher to be human-readable so that I can immediately understand where a prior session was left off."

**GAP-R8 (RESOLVED ✅) — `final_generation` phase missing from both label maps**
Previously flagged LOW. Fixed by GAP-124: `SESSION_PHASE_LABELS` now has `final_generation: 'Final Generation'` (`web/utils.js:271`) and `SESSION_PHASE_LABELS_SHORT` has `final_generation: 'Final Gen'` (`web/utils.js:286`). The fallback `.replace(/_/g, ' ')` path no longer triggers for this phase. Closed.

**GAP-R6 (LOW) — No session duplicate/copy action**
Sessions modal offers Load, Rename, and Move to Trash but no Duplicate. A returning user who wants to try a different customization approach cannot create a copy of an existing session without risk to prior decisions.
> Proposed story: "As a returning user, I want to duplicate an existing session so I can explore an alternative approach without overwriting prior decisions."

**GAP-R7 (LOW) — Session rename via header button uses browser `prompt()`**
`promptRenameCurrentSession()` (`web/session-manager.js:744`) uses `window.prompt()` (line 746), which browsers can block silently. The sessions modal inline rename uses proper UI, but the header ✏️ button (`web/index.html:78`) calls this fragile path and also uses `alert()` for error feedback (line 755).
> Proposed fix: Replace `promptRenameCurrentSession()` with an in-app modal dialog, consistent with the `confirmDialog()` pattern used elsewhere.

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
- `web/utils.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `tasks/user-story-returning-user.md`

---

## Key Evidence References

- `web/session-actions.js:132` — `updatePositionTitle()` — derives and renders job context on restore
- `web/session-manager.js:71` — `buildSessionSwitcherLabel()` — session switcher context chip
- `web/session-manager.js:337` — `_restoreTabForPhase()` — tab switch to correct phase on restore
- `web/session-manager.js:358` — `_resolveRestoredPhase()` — defensive phase guards (two cases)
- `web/session-manager.js:409–435` — `restoreSession()` — conversation history replay
- `web/session-manager.js:459–503` — `_hydrateStatusDerivedState()` — decision map rehydration
- `web/session-manager.js:505–519` — `_hydrateStatusTabState()` — tab data restore
- `web/session-manager.js:603–604` — `restoreBackendState()` — calls `updatePositionTitle`
- `web/session-manager.js:744–757` — `promptRenameCurrentSession()` — uses `window.prompt()`
- `web/session-switcher-ui.js:545–560` — `_deleteSessionFromModal()` — no `confirmDialog` before API call
- `web/session-switcher-ui.js:682,699` — Delete Forever / Empty Trash both use `confirmDialog`
- `web/workflow-steps.js:60–94` — `applyLayoutFreshnessNavigationState()` — stale/critical badges
- `web/workflow-steps.js:138–188` — `_showReRunConfirmModal()` — downstream-aware confirm modal
- `web/workflow-steps.js:190` — `confirmReRunPhase()` — ↻ path with confirmation
- `web/workflow-steps.js:199` — `_getStepTooltip()` — hover tooltip text (distinguishes view vs. rerun)
- `web/workflow-steps.js:704–706` — ↻ button `opacity:0` by default
- `web/workflow-steps.js:723` — CSS rule making ↻ visible on hover only
- `web/workflow-steps.js:774` — `handleStepClick()` — view navigation, no modal
- `web/state-manager.js:120` — `getLayoutFreshnessFromState()` — staleness logic
- `web/styles.css:155–156` — `.step.stale` / `.step.stale-critical` visual states
- `web/utils.js:262–288` — `SESSION_PHASE_LABELS` / `SESSION_PHASE_LABELS_SHORT` — `final_generation` now present in both maps (GAP-R8 / GAP-124 resolved)

**Evidence standard:** Every conclusion is supported by a specific file path and line number from the source files listed above, read directly during this review.
