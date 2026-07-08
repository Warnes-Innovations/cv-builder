<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Returning User Review Status

**Last Updated:** 2026-07-07 09:15 ET

**Executive Summary:** Both flagged regressions are RESOLVED, verified end-to-end against current source (not against prior audit summaries). GAP-378 (re-run confirmation wiring) remains correctly wired: `confirmReRunPhase()` → `reRunPhase()` → `POST /api/re-run-phase` → `ConversationManager.re_run_phase()`, which is architecturally distinct from `backToPhase()` → `POST /api/back-to-phase` → `ConversationManager.back_to_phase()` (pure navigation, no LLM call). GAP-386 (active-session notes) is RESOLVED and holds up under the specific edge cases requested: the frontend UI is reachable for both saved and active rows via a session-id-scoped DOM key (`notesKey`), the new `PATCH /api/sessions/active/notes` endpoint correctly resolves the target session from the request body's `session_id` (not from "whatever session the caller happens to be in"), and it defers to the existing `_validate_owner()` helper — an unclaimed active session accepts the edit from anyone, a claimed session rejects a mismatched `owner_token` with a clear 403 that surfaces as a toast, not a raw JSON-parse error (a global `HTTPException` → JSON error handler in `scripts/web_app.py:1139` prevents that failure mode). One real (non-blocking) UX gap found in this pass: the "Edit notes" icon is rendered on every active row regardless of ownership, so a user can open the notes editor for a session owned by another tab before being told, at submit time, that they don't own it.

## Application Evaluation

### US-S1: Resume With Context

1. ✅ The restored session identifies the job/application context clearly. `web/session-manager.js:494-521` (`_appendRestoredDecisionsSummary`) appends `📋 Restored{for X} at stage: {phase} — {N} experiences recommended, {N} rewrites approved, ATS score {N}%.` after a successful restore, and `updatePositionTitle(statusData)` (`web/session-manager.js:736`) keeps the header title in sync.
2. ✅ The UI indicates current stage and available next actions. `restoreBackendState()` resolves the phase via `_resolveRestoredPhase()` (guards against inconsistent phase/data combinations, `web/session-manager.js:439-460`) and calls `_restoreTabForPhase()` / `switchTab()` (`web/session-manager.js:731-733`) so the visible tab matches the true stage. Step pills reflect `active`/`completed`/`stale` state with descriptive tooltips (`_getStepTooltip`, `web/workflow-steps.js:222-231`).
3. ✅ Previously completed work remains visible/discoverable. `_hydrateStatusTabState()` (`web/session-manager.js:637-652`) repopulates `analysis`/`customizations`/`cv` tab data from `/api/status`, and completed step pills are marked `.completed` + `.clickable` with a `↻` re-run affordance (`web/workflow-steps.js:1032-1043`).
4. ✅ Single-active-session auto-resume (GAP-323) with an explicit explanation, not a silent jump: `ensureSessionContext()` (`web/session-manager.js:466-492`) posts `ℹ️ Only one active session found — auto-resumed. Open Sessions to switch or start a new one.`

No failure modes from the story ("generic blank view", "decisions not surfaced") were reproduced in source.

### US-S2: Safe Re-entry and Backtracking

1. ✅ Back-navigation is explicit about downstream consequences. `handleStepClick()` (`web/workflow-steps.js:1234-1246`) detects when a completed step has downstream completed steps and routes through `_showReRunConfirmModal(step, 'back-nav', doNavigate)` before navigating; `doNavigate` itself is pure `switchTab()` (`web/workflow-steps.js:1212-1215`), so no recompute happens on back-nav even after confirmation.
2. ✅ Re-entry preserves prior context. Backend `back_to_phase()` (`scripts/utils/conversation_manager.py:1725-1758`) explicitly does not clear any decision/rewrite/customization state — it only marks downstream steps `stale` and sets `iterating`/`reentry_phase`.
3. ✅ Re-run vs. back-navigation are visually and behaviorally distinct — this is GAP-378's fix, reverified:
   - The step pill click itself (`handleStepClick`, `web/workflow-steps.js:1152`) only ever calls `switchTab()`.
   - The dedicated `↻` button on completed steps (`web/workflow-steps.js:1041`, `onclick="confirmReRunPhase('${step}')"`) is the only path into `reRunPhase()`.
   - `confirmReRunPhase()` (`web/workflow-steps.js:191-199`) carries an explicit code comment recording the original bug and confirms it now calls `reRunPhase(step)`, not `backToPhase(step)`.
   - `reRunPhase()` → `_executeReRunPhase()` (`web/workflow-steps.js:409-476`) POSTs to `/api/re-run-phase` (`scripts/routes/job_routes.py:830-850`) → `ConversationManager.re_run_phase()` (`scripts/utils/conversation_manager.py:1760+`), which actually re-invokes the LLM (`self.llm.analyze_job_description(...)` / `recommend_customizations(...)` etc.) and returns `{prior_output, new_output}` for diffing — a materially different code path from `back_to_phase()`.
   - Reachability confirmed from 4 independent call sites: the step-pill `↻` button, `Ctrl+Shift+R` (`web/keyboard-shortcuts.js:273-275`), `web/layout-instruction.js:697`, and `web/review-table-base.js:321`.
   - Verdict: **GAP-378 is RESOLVED and has not regressed.**
4. ⚠️ Minor: the confirmation modal's copy for `back-nav` mode ("You are navigating back past the following completed stages... All existing approvals and rewrites are preserved as context.") is accurate but the phrase "preserved as context" is slightly ambiguous — a first-time reader could interpret "context" as "informational only, not literally kept," when in fact the underlying data is fully retained. Consider "will not be lost" or "remain saved" for clarity. Not a functional gap.

### US-S3: Trustworthy Session Continuity

1. ✅ Saved decisions are re-observable when a stage is revisited. `_hydrateStatusDerivedState()` (`web/session-manager.js:590-635`) rehydrates `window._savedDecisions` (experience/skill/achievement/publication decisions, summary override, extra skills) from `/api/status` on every restore/load.
2. ✅ Generated/previewed outputs stay logically connected to current session state via `contentRevision` / `lastPreviewContentRevision` / `lastFinalContentRevision` tracked in `web/state-manager.js:83-101` and surfaced as "Layout current" / "Layout outdated" / "Files outdated" chips (`getLayoutFreshnessFromState`, `web/state-manager.js:120-178`).
3. ✅ Current-vs-earlier outputs are distinguishable across passes: `re_run_phase()` returns `prior_output`/`new_output`, and `_executeReRunPhase()` diffs them with `_countChangedItems`/`_highlightChangedItems` and reports "(N of M items changed)" (`web/workflow-steps.js:436-469`), plus marks downstream steps `stale` in the step pills.

### GAP-386 deep-dive (session notes for active sessions)

**Frontend reachability** (`web/session-switcher-ui.js`):

- `_normalizeSessionsForTable()` (line 239) now includes `notes: s.notes || ''` for active rows (line 251), sourced from the backend's `/api/sessions/active` response, which itself now returns `notes` per session via `_active_notes(entry)` (`scripts/routes/session_routes.py:801-813`, reading `metadata.json` off `entry.manager.session_dir`).
- Per-row `notesKey` (`web/session-switcher-ui.js:409`) is `active-${sessionId}` for active rows and `saved-${idx}` for saved rows — this correctly disambiguates DOM ids since active rows have no numeric `idx`.
- The "Edit notes" icon button is appended unconditionally for both row types (line 429, outside the `row.type === 'saved'` gate that guards the separate status-edit button), so it is genuinely reachable for active rows, not just saved ones.
- `submitSessionNotesEdit()` (line 746) branches on `rowType === 'active'` to hit `/api/sessions/active/notes` with `{session_id, notes, owner_token}` instead of `/api/sessions/metadata` with `{path, notes}` — matches the backend contract.

**Backend correctness** (`scripts/routes/session_routes.py:760-793`, `sessions_patch_active_notes`):

- Resolves the target session via `entry = _get_session()` (line 769). Traced `_get_session` to `scripts/web_app.py:710-745`: it reads `session_id` from the query string OR the JSON body (line 721-723) — i.e., it **does** honor the `session_id` the frontend explicitly puts in the PATCH body, not an ambient/"current tab" session. This matters because the sessions modal lists every active session, and a user could be editing notes for a row that is not the tab's own current session.
- `_validate_owner(entry)` (line 770 → `scripts/web_app.py:747-770`): skips validation entirely when `entry.owner_token is None` (unclaimed — anyone may edit), otherwise requires the request's `owner_token` to match; mismatch → `abort(403, "Not the session owner")`.
- Ownership-conflict handling verified end-to-end: a 403 on an `/api/` path is caught by the global `@app.errorhandler(HTTPException)` (`scripts/web_app.py:1139-1143`), which returns `{error, status}` as JSON — so `res.json()` in `submitSessionNotesEdit` does not throw, and the `else` branch correctly shows `showToast('Notes update failed: Not the session owner', 'error')` rather than a confusing JS parse-error message.
- Edge case: a brand-new active session with no `session_dir` yet (never reached job intake) returns `400 {"error": "Session has no storage directory yet."}` — handled gracefully as a toast, though the message is somewhat technical for an end user.
- **Verdict: GAP-386 is RESOLVED end-to-end** — frontend reachability, backend session resolution by `session_id` (not path), and the claimed/unclaimed/cross-tab ownership matrix all behave correctly.

**⚠️ New minor finding (not a regression of GAP-386, but adjacent to what this review was asked to check):** `_renderSessionTableRow()` renders the "Edit notes" button identically for every active row regardless of `row.ownership.isCurrent` / `owned_by_requester` / `claimed`. A user browsing the Sessions modal can click "Edit notes" on a session row explicitly labeled "Owned by another tab," type a note, click Save, and only then learn (via toast) that the edit was rejected. Suggest either disabling/hiding the notes-edit affordance for sessions not owned by the current tab (mirroring how the "Open" vs. "Current" action link already reflects ownership), or at least keeping the typed draft so the user isn't forced to retype after switching to "Take over."

## Generated Materials Evaluation

Not applicable to this pass in a way that differs from the application evaluation above — the "generated materials" (CV/cover letter files) are unaffected by GAP-378/GAP-386; both fixes are pre-generation workflow/session-management concerns. Re-run diffing (`_highlightChangedItems`) does affect materials review by marking which generated recommendations changed after a re-run, which was verified above under US-S3.

## Additional Story Gaps / Proposed Story Items

- **Notes-edit affordance ignores ownership state** (see finding above) — propose as a follow-up: gate/disable the per-row "Edit notes" icon button for active sessions where `ownership.isCurrent` is false and `ownership.className !== 'session-status-unclaimed'`, or show an inline "owned by another tab" hint instead of allowing the click through to a failed submit.
- **Application-status editing is saved-sessions-only**: `_normalizeSessionsForTable()` populates `applicationStatus` for active rows too (`web/session-switcher-ui.js:250`), but the "Update application status" button is only rendered `if (row.type === 'saved')` (line 424-427). This is consistent with the current PATCH `/api/sessions/metadata` being path-based only (no active-session equivalent exists, unlike notes), so it isn't a regression — but it's the same shape of gap GAP-386 just fixed for notes, and worth a matching follow-up if returning users want to mark an in-progress application's status before it's ever saved.
- **Notes copy terminology**: the back-nav modal's "preserved as context" phrasing (`_showReRunConfirmModal`, `web/workflow-steps.js:154`) could read as "kept only as background info" rather than "your work is safe" — recommend rewording for a returning user under time pressure who needs an unambiguous answer to "will I lose anything?"

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/session-switcher-ui.js, scripts/routes/session_routes.py, web/workflow-steps.js

| Story | ✅ | ⚠️ | ❌ | 🔲 | — |
| --- | --- | --- | --- | --- | --- |
| US-S1 | 4 | 0 | 0 | 0 | 0 |
| US-S2 | 3 | 1 | 0 | 0 | 0 |
| US-S3 | 3 | 0 | 0 | 0 | 0 |

**Key evidence references:**

- GAP-378 (re-run wiring): `confirmReRunPhase` → `web/workflow-steps.js:191-199` calls `reRunPhase(step)`, not `backToPhase(step)`; `reRunPhase`/`_executeReRunPhase` → `web/workflow-steps.js:409-476` POST `/api/re-run-phase`; backend split confirmed at `scripts/routes/job_routes.py:804-850` and `scripts/utils/conversation_manager.py:1725-1838` (`back_to_phase` vs `re_run_phase`).
- GAP-386 (active session notes): frontend `web/session-switcher-ui.js:239-282` (`_normalizeSessionsForTable`), `:405-422` (`notesKey`/widgets), `:746-779` (`submitSessionNotesEdit` endpoint branch); backend `scripts/routes/session_routes.py:760-793` (`sessions_patch_active_notes`), `:795-833` (`sessions_active` now returns `notes`); session resolution `scripts/web_app.py:710-745` (`_get_session` reads `session_id` from JSON body); ownership `scripts/web_app.py:747-770` (`_validate_owner`); JSON error handling `scripts/web_app.py:1139-1143`.
- US-S1: `web/session-manager.js:439-521` (phase resolution + restored-decisions summary), `:637-652` (`_hydrateStatusTabState`), `:466-492` (`ensureSessionContext` auto-resume).
- US-S2: `web/workflow-steps.js:1152-1249` (`handleStepClick` navigation vs re-run gating), `:139-198` (shared confirm modal for both modes).
- US-S3: `web/state-manager.js:120-178` (`getLayoutFreshnessFromState`), `web/workflow-steps.js:436-469` (change diffing on re-run).
