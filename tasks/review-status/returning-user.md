<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Returning-User Review Status

**Last Updated:** 2026-07-07 20:23 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### US-S1: Resume With Context

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|-------------------------|
| 1 | Restored session identifies job/application context clearly | ✅ Pass | `updatePositionTitle()` sets `#position-title` and `#position-company` (name · date) from `status.position_name`/`job_analysis`/intake — `web/session-actions.js:159-199`. Called on full restore in `restoreBackendState()` — `web/session-manager.js:736`. |
| 2 | UI indicates current stage and available next actions | ✅ Pass | Workflow step bar marks `active`/`completed`/`forward-skip` classes and swaps visible action buttons per phase (`updateActionButtons`, referenced `web/workflow-steps.js`); phase→tab mapping in `web/state-manager.js:35-49` (`PHASE_TO_STEP`) and `web/session-manager.js:418-437` (`_restoreTabForPhase`). |
| 3 | Previously completed work remains visible/discoverable without hunting | ✅ Pass | Completed steps stay clickable (`handleStepClick`, `web/workflow-steps.js:1146-1226`); experience/skill/rewrite decisions are re-hydrated from `window._savedDecisions` populated in `_hydrateStatusDerivedState()` (`web/session-manager.js:590-635`) and consumed by `web/experience-review.js:164`, `web/skills-review.js:581`, and `web/rewrite-review.js:61-102` (`_restoreDecisions`, with a cold-restore fallback from `rewrite_audit` and a "previous decisions restored" toast). |

**Failure Modes:**

| Failure mode | Present? |
|--------------|----------|
| Generic blank/default view on return | ✅ Not present — position bar and step bar populate from `/api/status` on load (`web/app.js:41-74`, `web/session-manager.js:654-758`). Minor edge case: the internal fallback branch of `loadSessionFile()` that runs when `redirectOnMismatch:false` and no redirect occurs (`web/session-manager.js:765-814`) calls `fetchStatus()` but never `updatePositionTitle()`; this path is only reachable from `restoreBackendState()`'s own same-session recovery call (line 753) and from `ensureSessionContext()` (line 476), both of which run before/inside the outer restore flow that does call `updatePositionTitle`, so no user-visible blank state was found in the normal flow. |
| Prior decisions existing in state but not surfaced | ✅ Not present — see US-S1 criterion 3 evidence. |

---

### US-S2: Safe Re-entry and Backtracking

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|-------------------------|
| 1 | Back-navigation behavior explicit about downstream consequences | ✅ Pass | `_showReRunConfirmModal(step, mode, onConfirm)` lists every downstream *completed* stage and states "All existing approvals and rewrites are preserved as context" before either back-nav or re-run proceeds — `web/workflow-steps.js:139-189`. Triggered from `handleStepClick()` whenever back-navigating to a completed step that has completed downstream steps — `web/workflow-steps.js:1211-1223`. |
| 2 | Re-entry preserves prior context where intended | ✅ Pass | Server-side `back_to_phase()` explicitly preserves all decisions/rewrites/customisations and only marks downstream `stale_steps` — `scripts/utils/conversation_manager.py:1725-1758` ("without clearing downstream state"). |
| 3 | UI distinguishes re-entry (navigation) from rerunning/recomputing | ❌ Fail | The step-pill "↻ Re-run" affordance (`confirmReRunPhase()`, `web/workflow-steps.js:191-193`) shows a modal titled "↻ Re-run {step}?" but on confirmation calls `backToPhase(step)` (line 192), i.e. `POST /api/back-to-phase` → `conversation.back_to_phase()` — which does **not** invoke the LLM, it only moves the phase pointer and marks downstream steps stale (`scripts/utils/conversation_manager.py:1725-1758`). The function that actually re-invokes the LLM and diffs prior vs. new output, `reRunPhase()` → `POST /api/re-run-phase` → `conversation.re_run_phase()` (`web/workflow-steps.js:403-472`, `scripts/utils/conversation_manager.py:1760-1830+`), has **zero UI call sites** — confirmed with `grep -F "reRunPhase(" web/*.js` (excluding `bundle.js`), which returns only the function's own definition and its internal retry-callback references. So the labeled "re-run" control performs the same backend action as plain back-navigation, and the real recompute path is currently unreachable from the UI. |

**Failure Modes:**

| Failure mode | Present? |
|--------------|----------|
| Users unintentionally overwriting downstream work by revisiting a stage | ✅ Not present — `back_to_phase()` never deletes state, only flags `stale_steps` (`scripts/utils/conversation_manager.py:1747`). |
| Re-run visually indistinguishable from simple navigation | ⚠️ Partially present in a different form — visually *distinguishable* (separate ↻ icon, separate modal title/copy) but functionally *identical* to back-navigation because of the wiring bug above. This is arguably worse than the literal failure mode described (a mislabeled control rather than an ambiguous one) and should be added as an explicit new failure mode for future story revisions. |

---

### US-S3: Trustworthy Session Continuity

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|-------------------------|
| 1 | Saved decisions can be re-observed when their stage is revisited | ✅ Pass | See US-S1 #3 evidence (experience/skill/rewrite decisions). Rewrite decisions additionally persist per-session in `localStorage` (`web/rewrite-review.js:45-56`, keyed by session id) with a cold-restore fallback from backend `rewrite_audit` for a different device/incognito (`web/rewrite-review.js:80-101`) and a toast confirming restoration. |
| 2 | Generated/previewed outputs remain logically connected to current session state | ✅ Pass | `generationState.contentRevision` / `lastPreviewContentRevision` / `lastFinalContentRevision` tracked client-side (`web/state-manager.js:66-178`) and rehydrated server-side via `GET /api/cv/generation-state` on restore (`web/session-manager.js:679-727`). |
| 3 | Session restoration does not mislead about what version is current | ✅ Pass | Layout-freshness chip renders "Files outdated" / "Layout outdated" / "Layout current" based on comparing `contentRevision` to last-rendered revision (`web/state-manager.js:120-178`, `getLayoutFreshnessFromState`). Download tab labels regenerated files "Run #N — {timestamp}" and tags preview-format files "Working file — not for submission" (`web/download-tab.js:197-234`). |

**Failure Modes:** none of the story's explicit failure modes were found present; see Additional Issues below for problems outside the story's stated criteria.

---

### Additional Issues — Session Notes Indicator (Cycles 102–103 / GAP-352 re-verification)

The task specifically asked for end-to-end verification of the new session-notes indicator. Findings:

1. **Show/hide correctness — ✅ Pass.** `GET /api/status` reads `notes` from the session's `metadata.json` sidecar (`scripts/routes/status_routes.py:679-691, 788`). `updatePositionTitle()` sets `#position-notes-text` and toggles `#position-notes-indicator` display based on truthiness of `status.notes` — `web/session-actions.js:204-214`.
2. **Full text on visual truncation — ✅ Pass (with an accessibility caveat).** The indicator uses `white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:420px` (`web/index.html:87`) and the full note is set as the element's `title` attribute (`web/session-actions.js:212`), giving a native hover tooltip. This is hover-only — not reliably discoverable via touch or keyboard-only navigation. Also, `web/index.html:87` uses `role="note"`, which is **not a standard ARIA role** (no such role exists in the WAI-ARIA spec); assistive technology will not announce it as intended.
3. **Updates when switching sessions — ✅ Pass, but not for the reason the task description implies.** `updatePositionTitle()` is **not** called on every `fetchStatus()` refresh — `fetchStatus()` itself (`web/api-client.js:211-229`) only updates the auth badge and workflow-step bar. Grepping every non-bundle call site of `fetchStatus(` (app.js:70, message-dispatch.js:334, session-actions.js:108, workflow-steps.js:114/437, spell-check.js, ui-core.js:210, session-switcher-ui.js:663) shows none of them re-run `updatePositionTitle()`. The indicator only actually refreshes via two paths: (a) `restoreBackendState()` after a full page load (`web/session-manager.js:736`), and (b) after job analysis completes (`web/job-analysis.js:174-176`). Switching to a **different** saved session from the Sessions modal (`loadSessionAndCloseModal` → `loadSessionFile`, `web/session-switcher-ui.js:618-625`) works correctly only because `/api/load-session` returns a `redirect_url` whenever the target session id differs from the current URL's session id (`scripts/routes/session_routes.py` load-session handler, `redirect_url: f"/?session={sid}"`), which forces a full browser navigation (`window.location.assign`, `web/session-manager.js:792`) — re-running `init()` → `restoreSession()` → `restoreBackendState()` and correctly re-populating the indicator. So the *practical* switch-session flow works, but the claim that the indicator "populates whenever status refreshes" is not accurate — it is a page-reload-driven refresh, not a live one.
4. **Editing a note for the *currently active* session — ❌ Fail (real functional gap).** The Sessions modal's row builder, `_normalizeSessionsForTable()`, populates `notes: s.notes || ''` for saved-session rows only (`web/session-switcher-ui.js:269`); the loop for `type: 'active'` rows never copies `s.notes` (lines 243-259), even though the backend's `GET /api/sessions/active` now returns a `notes` field per active session (`scripts/routes/session_routes.py:766-794`, added alongside this feature). Additionally, the notes-preview/edit UI is rendered only `if (row.type === 'saved')` (`web/session-switcher-ui.js:405-424`), and the "edit notes" action button is likewise gated on `row.type === 'saved'` (lines 420-424). **Net effect: a user cannot view or edit notes for their own open/active session anywhere in the Sessions modal.** The only in-workspace way to set a note on the active session is the `#finalise-notes` textarea (`web/finalise.js:116-121, 288`) submitted via `POST /api/finalise` (`scripts/routes/generation_routes.py:2144, 2159`) — which is gated behind having already generated CV files (`generated['output_dir']` must exist, `scripts/routes/generation_routes.py:2138-2139`). A user in Job/Analysis/Customize/Rewrite/Spell/Layout stages has **no way at all** to attach a note to their own active session — they would have to evict/close the session (turning it into a "saved" row with a notes-edit affordance) and then reopen it, defeating the purpose of "leaving myself a note without losing my place."

---

## Generated Materials Evaluation

Not the primary focus of this persona (session/state continuity), but one relevant finding: generated output files are versioned and distinguishable across multiple workflow passes — Download tab labels regenerated files `Run #N — {timestamp}` and separately tags preview-format files "Working file — not for submission" (`web/download-tab.js:197-234`), which directly supports US-S3 criterion 3.

## Additional Story Gaps / Proposed Story Items

- **Propose a new acceptance criterion under US-S2:** "A control labeled 're-run' or displaying a recompute icon (↻) must actually trigger recomputation of that phase's output, not merely navigate to it." The current story only asks that re-run be *visually* distinguishable from navigation; it doesn't test that the control's *behavior* matches its label, which is exactly the bug found above.
- **Propose a new story item (or criterion under US-S1/US-S3): "Session notes remain attachable and editable throughout the session's active life."** Currently notes can only be set once a session is archived/saved (via the Sessions modal) or once CV files have already been generated (via Finalise) — never during the early-to-mid workflow while the session is open, even though the header indicator implies notes are a general-purpose sticky-note feature that "follows the user into the active workspace."
- **Consider adding a story item for concurrent-tab / ownership-conflict re-entry** — `#ownership-conflict-overlay` in `web/index.html:426-440` ("Session already open in another browser tab", with Load Different / New Session / Take Over actions) is a returning-user scenario (reopening a stale tab, or opening the same session in two tabs) not covered by any of the three existing US-S* stories, despite being a real corner of "returning after interruption."
- **Terminology note:** `role="note"` on the notes indicator (`web/index.html:87`) is not a valid ARIA role — should be removed or replaced with a supported role/pattern (e.g., a plain `<div>` with `aria-label`, or `role="status"` if live-announcement is desired).

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus web/session-manager.js, web/session-actions.js, web/session-switcher-ui.js, web/workflow-steps.js, web/rewrite-review.js, web/experience-review.js, web/skills-review.js, web/finalise.js, web/download-tab.js, web/job-analysis.js, scripts/routes/status_routes.py, scripts/routes/session_routes.py, scripts/routes/job_routes.py, scripts/routes/generation_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-S1 | 3 | 0 | 0 | 0 | 0 |
| US-S2 | 2 | 0 | 1 | 0 | 0 |
| US-S3 | 3 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- US-S1: `updatePositionTitle()` → `web/session-actions.js:159-232`; phase→step/tab mapping → `web/state-manager.js:35-49`, `web/session-manager.js:418-437`
- US-S1: decision re-hydration → `web/session-manager.js:590-635` (`_hydrateStatusDerivedState`), `web/experience-review.js:164`, `web/skills-review.js:581`, `web/rewrite-review.js:61-102`
- US-S2: downstream-aware confirm modal → `web/workflow-steps.js:139-189`
- US-S2: back_to_phase preserves state → `scripts/utils/conversation_manager.py:1725-1758`
- US-S2 (fail): mislabeled re-run control → `web/workflow-steps.js:191-193` (calls `backToPhase`, not `reRunPhase`); real recompute unreachable → `web/workflow-steps.js:403-472` (no call sites outside itself)
- US-S3: generation-state/content-revision restore → `web/state-manager.js:66-178`, `web/session-manager.js:679-727`
- US-S3: layout freshness / run labeling → `web/state-manager.js:120-178`, `web/download-tab.js:197-234`
- Notes indicator (GAP-352): backend field → `scripts/routes/status_routes.py:679-691,788`; frontend render → `web/session-actions.js:204-214`
- Notes indicator gap: active-session notes dropped in modal → `web/session-switcher-ui.js:243-259` (missing `notes` field) vs. `web/session-switcher-ui.js:269` (saved rows have it); backend already returns it → `scripts/routes/session_routes.py:766-794`
- Notes editing for active session limited to Finalise tab, gated on generated files → `web/finalise.js:116-121,288`, `scripts/routes/generation_routes.py:2138-2139,2144,2159`

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
