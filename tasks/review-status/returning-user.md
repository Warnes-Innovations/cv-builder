<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Returning User Review Status

**Last Updated:** 2026-06-22 ET

**Executive Summary:** The returning-user experience is strong for session identity, stage visibility, and phase continuity. Five of nine criteria pass cleanly. Four criteria are partial. The main weaknesses are: (1) no on-return decision-count summary to help users quickly verify their prior work is intact; (2) rewrite accept/reject decisions survive same-browser-tab navigations via localStorage but are not seeded from backend `approved_rewrites` on a cold reload (different device, cleared storage), so a returning user who cleared their browser or switched devices must repeat all rewrite decisions; (3) the ↻ re-run button is hover-only with no keyboard path; and (4) the distinction between view-navigation and LLM recomputation is not persistently visible for keyboard and touch users. No regressions from cycle 5 were found; one prior gap (GAP-RU-NEW1) is partially addressed by the GAP-166 localStorage restore.

---

## Application Evaluation

### US-S1: Resume With Context

As a returning user, I want to resume a saved session with immediate context about where I am, so that I can continue work without reconstructing what happened earlier.

---

#### US-S1.1 — Job identity is surfaced on resume — ✅ Pass

On restore, `restoreBackendState()` (`session-manager.js:537`) calls `/api/status` and then `updatePositionTitle(statusData)` (`session-manager.js:619`). The position bar renders the job label into `#position-title` (`index.html:75`) and company into `#position-company` (`index.html:80`). The session switcher header pill (`index.html:47`) is built by `buildSessionSwitcherLabel(status)` (`session-manager.js:71–78`) combining `positionName · phase`, so the returning user sees the role name immediately on reload.

`loadSessionFile()` (`session-manager.js:747`) appends a named confirmation: `"✅ Session restored: {position_name} ({phase_label})"` to the conversation panel.

---

#### US-S1.2 — Current workflow stage is visible on resume — ✅ Pass

`_resolveRestoredPhase(statusData)` (`session-manager.js:373–394`) applies defensive guards before setting phase. `stateManager.setPhase(restoredPhase)` fires all `onPhaseChange` listeners (`state-manager.js:316–322`), which triggers `updateWorkflowStepsClickable(phase)` (`ui-core.js:1879`). `updateWorkflowSteps(status)` (`workflow-steps.js:612–735`) sets `active`, `completed`, and `clickable` CSS classes on all 12 step pills in real time.

`_restoreTabForPhase(sessionPhase)` (`session-manager.js:352–371`) and `loadSessionFile()` (`session-manager.js:705–718`) both map each backend phase to the correct viewer tab via `phaseTabMap`, calling `switchTab()`. The primary action button set is restored via `updateActionButtons(activeStep)` (`workflow-steps.js:731`), so the correct "next step" button is immediately visible.

---

#### US-S1.3 — Previously completed work remains visible/discoverable — ⚠️ Partial

`_hydrateStatusTabState(statusData)` (`session-manager.js:520–534`) restores `analysis`, `customizations`, and `cv` tab data into `stateManager`. `#ats-report-btn` and `#job-analysis-btn` (`index.html:102–105`) are revealed after analysis completes. Completed steps receive `class="completed clickable"` (`workflow-steps.js:699–700`), so all prior results are reachable via step-click. Conversation history is replayed from `/api/history` (`session-manager.js:424–451`).

Gap: No human-readable summary of restored decisions is surfaced on return. A returning user must navigate to each review tab (exp-review, skills-review, rewrite, etc.) individually to verify that prior decisions are intact. `_hydrateStatusDerivedState()` (`session-manager.js:474–518`) assembles `window._savedDecisions` with the complete decision map — the data is present but no count summary or "welcome back" status banner is shown.

---

### US-S2: Safe Re-entry and Backtracking

As a returning user, I want to revisit earlier stages without fear of accidental data loss, so that I can revise decisions confidently after time away.

---

#### US-S2.1 — Back-navigation warns about downstream consequences — ⚠️ Partial

Two distinct navigation mechanisms exist:

1. **Step-click (view navigation):** `handleStepClick(step)` (`workflow-steps.js:788–837`) calls `switchTab()` without changing backend phase and without any warning modal. Tooltips via `_getStepTooltip()` (`workflow-steps.js:199`) distinguish "Click to view" from "Click ↻ to rerun from here", but only on hover. No persistent text differentiates view navigation from recomputation for keyboard and touch users.

2. **↻ Re-run (LLM recomputation):** `confirmReRunPhase(step)` (`workflow-steps.js:190–192`) calls `_showReRunConfirmModal(step, 'rerun', onConfirm)` (`workflow-steps.js:138–188`), which lists all downstream completed stages by name and states "All existing approvals and rewrites are preserved as context." The modal has a focus trap and Escape-key close.

The confirmation modal fires only for the ↻ path. Step-click view navigation has no modal (correct — no data changes), but the distinction is hover-dependent.

---

#### US-S2.2 — Re-entry into earlier phases preserves prior context — ✅ Pass

`backToPhase(step, feedback)` (`workflow-steps.js:98–128`) calls `/api/back-to-phase` and appends to the conversation: "↻ Navigating back to {step}. Prior decisions and approvals are preserved." The backend `back_to_phase()` (`conversation_manager.py:1435–1468`) does not clear `approved_rewrites`, `experience_decisions`, `skill_decisions`, `customizations`, or any downstream work. It sets `state['iterating'] = True` and `state['stale_steps']` to signal which downstream results may be outdated without destroying them.

`_build_downstream_context()` (`conversation_manager.py:1392–1433`) builds a structured summary of prior approved rewrites, omitted/emphasised experiences and skills, and accepted spell-check corrections, injected into the re-run LLM prompt so re-runs improve on prior decisions rather than starting blind.

---

#### US-S2.3 — Re-run is visually distinguishable from simple navigation — ⚠️ Partial

Three mechanisms distinguish re-run from navigation:

1. **Step bar ↻ button:** Completed steps in `RE_RUN_STEPS = {'analysis', 'customizations', 'rewrite', 'spell'}` render a `↻` span with `opacity:0` by default (`workflow-steps.js:703–708`), revealed only via CSS `:hover` (`workflow-steps.js:723`). The element has no `tabindex` or ARIA label — keyboard-only and touch users cannot discover it.

2. **Confirmation dialog titles:** `_showReRunConfirmModal` uses distinct title text — "↻ Re-run {stepLabel}?" vs. "← Navigate back to {stepLabel}?" (`workflow-steps.js:147–149`).

3. **Iterating badge:** When `status.iterating && reentryStep === activeStep`, the active step pill shows `<span class="step-inline-badge">↻ Refining</span>` (`workflow-steps.js:694–696`).

---

### US-S3: Trustworthy Session Continuity

As a returning user, I want to trust that my accepted rewrites, customisations, and review decisions remain intact, so that I do not need to repeat work after an interruption.

---

#### US-S3.1 — Saved decisions can be re-observed when their stage is revisited — ⚠️ Partial

`_hydrateStatusDerivedState()` (`session-manager.js:474–518`) restores the full decision payload to `window._savedDecisions` (experience, skill, achievement, publication decisions; `extra_skills`; `summary_focus_override`; achievement edits; intake; post-analysis Q&A).

Rewrite decisions (improved but still partial): When loading a session at `REWRITE_REVIEW` phase, `session-manager.js:740` resets `rewriteDecisions = {}` before calling `renderRewritePanel()`. However, inside `renderRewritePanel()` (after HTML is built), `_restoreDecisions()` is called (`rewrite-review.js:186`, implementing GAP-166), which reads `rw_decisions_{sessionId}` from localStorage and re-applies any persisted card decisions. This means decisions survive same-browser tab navigations and most single-device page reloads.

Residual gap: `_restoreDecisions()` reads only from `localStorage`. If the user clears browser storage, uses a different device, uses a private/incognito window, or the 24-hour localStorage expiry passes, the key will not exist and decisions will not be restored from the backend `approved_rewrites` / `rewrite_audit` fields. In those cases, `rewriteDecisions` remains empty and the returning user must repeat all accept/reject decisions from scratch. The backend stores the final submitted decisions (`status.approved_rewrites`), but these are not used to seed the panel on cold restore.

---

#### US-S3.2 — Generated/previewed outputs remain logically connected to current session state — ✅ Pass

`getLayoutFreshnessFromState(generationState)` (`state-manager.js:120–178`) computes `isStale` and `isCritical` by comparing `contentRevision` against `lastPreviewContentRevision` and `lastFinalContentRevision`. Labels: "Layout current" (green), "Layout outdated" (amber), "Files outdated" (red).

On resume, `restoreBackendState()` (`session-manager.js:563–611`) fetches `/api/cv/generation-state` and restores all generation state fields including `contentRevision`, `lastPreviewContentRevision`, `lastFinalContentRevision`, `finalGeneratedAt`, and `previewGeneratedAt`. The freshness chip (`index.html:95`) reflects the correct state immediately on page reload.

`applyLayoutFreshnessNavigationState()` (`workflow-steps.js:60–93`) injects "Outdated" badges onto the Layout Review step pill and the Download Files tab label when final files are stale and critical.

---

#### US-S3.3 — Session restoration does not mislead about what version is current — ✅ Pass

`_resolveRestoredPhase(statusData)` (`session-manager.js:373–394`) applies two guards:

1. If `!statusData.job_analysis`, forces `PHASES.INIT` regardless of persisted phase.
2. If `phase` is `CUSTOMIZATION` or `REWRITE_REVIEW` but `!statusData.customizations`, falls back to `PHASES.JOB_ANALYSIS`.

`status.stale_steps` from `back_to_phase()` (`conversation_manager.py:1452–1455`) is rendered as amber `.stale` pills on the step bar (`workflow-steps.js:682, 711`). Conversation history is always restored from the server (`session-manager.js:424–451`), not from localStorage, so the narrative is authoritative.

---

## Generated Materials Evaluation

The returning-user persona does not directly evaluate generated CV file quality. The relevant questions are whether a returning user can find previous outputs and whether those outputs are clearly marked as current or outdated.

Result: ✅ Pass — The layout freshness system (US-S3.2) and the Download Files "Outdated" tab badge (`workflow-steps.js:82–92`) address both concerns. No additional generated-materials gaps specific to this persona were identified.

---

## Additional Story Gaps / Proposed Story Items

### GAP-R1 (MEDIUM) — No restored-decisions summary on return

After session restore, no human-readable summary of recovered state is surfaced (e.g. "4 experiences selected, 12 skills, 7 rewrites approved"). The returning user must navigate to each review tab individually to verify prior work is intact. `_hydrateStatusDerivedState()` (`session-manager.js:474–518`) assembles the data in `window._savedDecisions`; it is not surfaced anywhere in the UI.

> Proposed story: "As a returning user, I want a brief summary of my restored session decisions so that I can quickly verify my prior work is intact before continuing."

---

### GAP-RU-NEW1 (MEDIUM) — Rewrite accept/reject state not restored on cold-reload

The GAP-166 fix (localStorage restore via `_restoreDecisions()` at `rewrite-review.js:186`) addresses same-browser-tab page reloads. However, `rewriteDecisions = {}` is still reset at `session-manager.js:740` before `renderRewritePanel` is called, and `_restoreDecisions()` reads only from localStorage. On cold reload (cleared storage, different device, private window, or >24h elapsed), no decisions are restored from the backend `approved_rewrites` / `rewrite_audit` fields. A user who interrupted mid-review and returns from a different device must repeat all accept/reject decisions.

> Proposed fix: After `renderRewritePanel()` returns in the `loadSessionFile()` path, seed `rewriteDecisions` from `status.approved_rewrites` (keyed by rewrite id with `outcome: 'accept'`) before calling `_restoreDecisions()`, so the localStorage path wins on same-device and the backend-seeded path covers cold restores.

---

### GAP-R3 (MEDIUM) — ↻ re-run icon invisible until hover; not keyboard-accessible

The ↻ re-run button is `opacity:0` by default (`workflow-steps.js:703–706`) and visible only via CSS `:hover` (`workflow-steps.js:723`). The element has no `tabindex` or ARIA label. Keyboard-only and touch users cannot discover or activate the re-run path.

> Proposed story: "As a returning user, I want re-run actions on completed steps to be persistently visible or keyboard-discoverable so I can re-run a stage without needing to hover."

---

### GAP-R4 (MEDIUM) — Step-click vs. ↻ distinction is hover/tooltip-only

`handleStepClick()` (`workflow-steps.js:788`) switches view without a modal. Tooltips via `_getStepTooltip()` (`workflow-steps.js:199`) distinguish "Click to view" from "Click ↻ to rerun from here", but only on hover. No persistent on-screen text differentiates view navigation from LLM recomputation for keyboard and touch users.

---

### GAP-R2b (LOW) — "Move to Trash" executes without confirmation

In the sessions modal, the move-to-trash action fires the API directly without a confirmation dialog, unlike Delete Forever and Empty Trash which call `confirmDialog()` before proceeding. This is inconsistent with the destructive-action pattern used elsewhere in the codebase.

> Proposed fix: Add `await confirmDialog('Move this session to Trash? You can restore it from the Trash view.')` before the API call in the trash action handler.

---

### GAP-R5 (LOW) — Abbreviated phase labels opaque for occasional returning users

`SESSION_PHASE_LABELS_SHORT` maps `refinement` → `"Done"` (misleading if work is in progress) and `customization` → `"Custom"` (non-obvious). These appear in the session-switcher header chip and sessions modal.

> Proposed story: "As a returning user, I want session phase labels in the session switcher to be human-readable so I can immediately understand where a prior session was left off."

---

### GAP-R9 (LOW) — Remaining alert() calls in session-switcher-ui.js degrade UX

Multiple `alert()` calls remain in the sessions modal for error cases (saved-session rename errors, Move-to-Trash errors, Restore-from-Trash errors, Delete-Forever errors, Empty-Trash errors). Browser `alert()` can be suppressed by "Prevent this page from creating additional dialogs", leaving operations silently failing. `showToast()` and `showAlertModal()` are available as drop-in replacements.

> Proposed fix: Replace remaining `alert(...)` calls in the sessions switcher UI with `showToast(message, 'error')` or `showAlertModal(title, message)`.

---

## Previously Resolved Gaps (for continuity reference)

- **GAP-R2 (RESOLVED)** — "Delete" button relabelled to "Move to Trash"; full Trash/Restore/Delete-Forever flow implemented.
- **GAP-R7 (RESOLVED)** — `promptRenameCurrentSession()` (`session-manager.js:759–819`) rewrote header rename to inline `<input>` widget with ✓/✕ buttons; `window.prompt()` removed; errors route to `showToast()`.
- **GAP-R8 (RESOLVED)** — `final_generation` phase added to both `SESSION_PHASE_LABELS` and `SESSION_PHASE_LABELS_SHORT` in utils.js.
- **GAP-166 (PARTIALLY RESOLVED)** — `_restoreDecisions()` added at `rewrite-review.js:186` restores rewrite card decisions from localStorage on same-device page reload. Cold-restore from backend `approved_rewrites` is not yet implemented (see GAP-RU-NEW1 above).

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/session-manager.js, web/rewrite-review.js

| Story   | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | ------- | ---------- | ------- | ----------- | ----- |
| US-S1   | 2       | 1          | 0       | 0           | 0     |
| US-S2   | 1       | 2          | 0       | 0           | 0     |
| US-S3   | 2       | 1          | 0       | 0           | 0     |
| **Total** | **5** | **4**      | **0**   | **0**       | **0** |

**Key evidence references:**

- US-S1.1: job identity on restore — `session-manager.js:619`, `session-manager.js:71–78`
- US-S1.2: stage visible on restore — `session-manager.js:352–371`, `workflow-steps.js:612–735`, `ui-core.js:1879`
- US-S1.3: prior work discoverable (partial) — `session-manager.js:520–534`; no summary surfaced
- US-S2.1: back-nav warnings (partial) — `workflow-steps.js:138–188` (↻ path); `workflow-steps.js:788` (step-click, no modal)
- US-S2.2: context preserved on re-entry — `conversation_manager.py:1435–1468`, `workflow-steps.js:98–128`
- US-S2.3: re-run vs nav distinction (partial) — `workflow-steps.js:147–149`, `workflow-steps.js:703–708`
- US-S3.1: decisions re-observable (partial) — `rewrite-review.js:186` (localStorage restore), `session-manager.js:740` (reset still present)
- US-S3.2: outputs connected to state — `state-manager.js:120–178`, `workflow-steps.js:60–93`, `session-manager.js:563–611`
- US-S3.3: restore does not mislead — `session-manager.js:373–394`, `workflow-steps.js:711`

**Evidence standard:** Every conclusion is independently verifiable from the cited source evidence in the files listed above.
