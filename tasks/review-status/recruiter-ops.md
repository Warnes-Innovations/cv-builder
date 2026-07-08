<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter-Ops Review Status

**Last Updated:** 2026-07-07 20:16 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### Finalise-Tab-Reachability Trace (central finding for this cycle)

The gap-102/103 fix correctly removed the structural blockers that made the Finalise tab unreachable (`STAGE_TABS.finalise`, the `display:none` on `#tab-finalise`, the `#step-finalise` pill, and the `workflow-steps.js` wiring). However, tracing the actual runtime behaviour surfaces two real regressions/bugs and one confirmed-working path.

**1. Top workflow-step pill (`#step-finalise`) → Finalise tab: WORKS, but with a spurious warning dialog.**
- `STAGE_TABS.finalise = ['finalise']` — `web/ui-core.js:370`
- `#step-finalise` pill exists, `onclick="handleStepClick('finalise')"` — `web/index.html:151`
- `#tab-finalise` no longer carries `display:none` — `web/index.html:235` (confirmed: no inline style attribute present)
- `_STEP_ORDER` includes `'finalise'` — `web/workflow-steps.js:35`; `_STEP_DISPLAY.finalise = 'Finalise'` — `:49`; `_STEP_FWD_PHASE_MIN.finalise = 7` — `:926`; `STEP_LABELS.finalise = '✅ Finalise'` — `:955`; `done.finalise = postLayout` — `:976`; `stepToTab.finalise = 'finalise'` in both `_doStepNavigate` (`:1133`) and `handleStepClick` (`:1200`).
- `populateFinaliseTab()` (`web/finalise.js:53`) is invoked via `review-table-base.js:423-424` (`case 'finalise': await populateFinaliseTab();`) and renders correctly — it does **not** depend on the buggy `download-tab.js` code path (see finding #2), so the tab itself renders its readiness checklist, status dropdown, notes textarea, and Finalise & Archive button without error.
- **Bug found:** `done.finalise` and `done.harvest` both resolve to the same `postLayout` boolean (`web/workflow-steps.js:976-977`), so the moment a CV reaches `final_generation`/`refinement` phase, **both** `step-finalise` and `step-harvest` are marked `.completed` simultaneously, even though the user has visited neither. `handleStepClick()` (`web/workflow-steps.js:1213-1223`) treats any click on a `.completed` non-active step that has a downstream `.completed` step as **back-navigation**, and shows `_showReRunConfirmModal(step, 'back-nav', ...)` with the text *"You are navigating back past the following completed stages: Update Master CV"* (`web/workflow-steps.js:150-157`). Because `step-harvest` is downstream of `step-finalise` in `_STEP_ORDER` (`web/workflow-steps.js:33-36`) and is always simultaneously "completed," a first-time forward click on the Finalise pill incorrectly claims the user is navigating *backward past* an already-completed "Update Master CV" step they have never visited. This is a pre-existing pattern affecting the whole post-layout step cluster (any of download/cover_letter/screening/interview_prep/thank_you/finalise will trigger it against any other "completed" sibling), but the fix newly exposes it on the Finalise entry point specifically — the step this cycle was meant to make trustworthy as a "readiness checkpoint" (US-O1) now greets first-time visitors with an incorrect and confusing warning.

**2. "Skip to Finalise" button on the File Review tab: DOES NOT WORK — dead code, unreachable in the normal flow.**
- The button is added at `web/download-tab.js:521-524`, at the very end of `populateDownloadTab()`, after all other HTML has been assembled in a local `html` string.
- `populateDownloadTab()` calls `_renderDownloadGrid(files, checks, summary, generatedAt, generationRun)` at `web/download-tab.js:509`, **before** the button HTML is built.
- `_renderDownloadGrid()` (`web/download-tab.js:190-263`) references an **undeclared variable `blockingFails`** at line 259: `if (blockingFails.length > 0 && files.length) { ... }`. This identifier is never declared anywhere in that function or at module scope (confirmed via `grep -n "blockingFails" web/download-tab.js` — only 4 hits, all inside a *different* function, `_renderValidationSummary`, where it is correctly declared at line 110). Referencing it throws `ReferenceError: blockingFails is not defined` in strict-mode ES module code.
- This line is only bypassed when `files.length === 0` (an early `return` exists for that case at line 212-216). In the realistic recruiter-ops scenario this review is meant to verify — a CV has already been through final generation and the File Review tab is showing generated PDF/DOCX/HTML — `files.length` is always > 0, so the `ReferenceError` **always fires**.
- Reproduced the exact scoping bug in isolation (Node, ES module semantics): `ReferenceError: blockingFails is not defined` when `files.length > 0`.
- **Confirmed this bug is also present in the built `web/bundle.js`** (not just uncompiled source) — `web/bundle.js:16951` contains the identical `if (blockingFails.length > 0 && files.length)` with no declaration anywhere in the surrounding minified function, so this is live in the deployed app, not a stale-source artifact.
- Because `loadTabContent()` (`web/review-table-base.js:328-454`) wraps the entire tab-switch dispatch in a single `try { switch(tab) {...} } catch (error) { ... content.appendChild(errorMessage) ... }`, the thrown error is caught, logged, and rendered as a red error paragraph appended to whatever was already in `#document-content`. Since `populateDownloadTab()` only reassigns `content.innerHTML` with the *real* content at line 517 (after the crash point at line 509), the tab is left showing its early placeholder — `"Running ATS validation…"` (set at line 387) — plus an appended `Error loading content: blockingFails is not defined` message.
- **Consequence:** the readiness chip, ATS report, generated-files grid, persuasion check, rewrite audit log, refinement panel, and — critically for this review — the newly-added **"✅ Skip to Finalise" and "📩 Proceed to Cover Letter →" buttons never reach the DOM**, because they are constructed after the crash point in the same synchronous function body. The File-Review-tab reachability path for Finalise described in the task brief does not function as claimed; it is unreachable in the one scenario that matters (post-generation, files present).
- This is also a severe, independent finding against **US-O1** and **US-O3**: the File Review tab — the app's primary "is my package ready and are the file names sane" screen — is currently broken for any session that has generated output files, which is the normal case.

**3. `finalise-action-btn` ("📦 Archive Application") visibility: technically correct but structurally inert as an entry point.**
- `_STAGE_BUTTON_MAP.finalise = 'finalise-action-btn'` (`web/ui-helpers.js:156`) and `updateActionButtons(stage)` (`web/ui-helpers.js:163-170`) correctly shows only the button matching the active stage and hides the rest — so the button never appears while viewing an unrelated tab.
- However, `activeStep`/`stage` is derived from the **backend phase**, not the currently-viewed tab, in the two places that drive this on a timer/event basis: `workflow-steps.js:986-997` (`phaseToStep` map, used by `updateWorkflowSteps()` on every `/api/status` fetch) and `state-manager.js:35-48` (`PHASE_TO_STEP`, backing `getWorkflowStepForPhase`). **Neither map has an entry for `'finalise'`** — there is no backend `Phase.FINALISE`; `final_generation`/`refinement` both map to `'download'`. Confirmed in the `PHASES` mirror in `state-manager.js:23-33` and in `generation_routes.py:2221` (`conversation.state['phase'] = Phase.REFINEMENT` after `/api/finalise` succeeds — never a distinct finalise phase).
- Practical effect: `finalise-action-btn` only becomes visible via the **tab-driven** path (`switchTab()` → `getStageForTab(tab)` → `updateActionButtons('finalise')`, `web/review-table-base.js:222-229`) — i.e., only *after* the user is already on the Finalise tab. It can never serve as the forward-progression call-to-action that gets a user *to* the tab in the first place (unlike every other stage button, e.g. `final-generate-proceed-btn` = "Continue to File Review →"). Additionally, any subsequent `fetchStatus()` call while the user is sitting on the Finalise tab (e.g., triggered by an unrelated chat action) re-runs `updateWorkflowSteps()`, which recomputes `activeStep` from phase (→ `'download'`) and calls `updateActionButtons('download')` and `updateTabBarForStage('download')` — this **hides `finalise-action-btn` again and reverts the second-tier tab bar to the File-Review sub-tabs**, while the main content pane still shows Finalise content. This is a moderate-severity state-desync, not a hard reachability blocker (the step pill remains a working path), but it means the primary action-button/CTA row is not a reliable way to discover or stay oriented in the Finalise stage.

**Summary of the five explicit trace questions:**
1. Pill → tab navigation and rendering: **Works**, but triggers a spurious/incorrect "navigating back past Update Master CV" confirmation dialog on first use (finding #1).
2. `finalise-action-btn` scoping to the tab: **Correct while active**, but the button can only ever be reached circularly (must already be on the tab) and desyncs on the next status poll (finding #3).
3. `done.finalise = postLayout` gating consistency: **Consistent** with the other post-layout steps (identical boolean, same unlock point) — this specific criterion passes cleanly.
4. "Skip to Finalise" button on File Review tab: **Broken — never renders** due to an unrelated `ReferenceError` in `_renderDownloadGrid()` that crashes the whole File Review tab whenever generated files exist (finding #2).
5. Other unreachability scenarios: the File Review tab crash (finding #2) is the most severe remaining gap — it breaks the tab's own core purpose (readiness chip, ATS report, downloads), independent of the Finalise fix.

---

### US-O1: Submission Readiness Clarity

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-------------------|
| 1 | Final outputs are clearly visible and distinguishable | ⚠️ Partial | The Finalise tab's own readiness checklist (`web/finalise.js:164-216`, `_renderReadinessChecklist`) clearly lists CV PDF/DOCX/HTML, cover letter, screening Q&A, ATS validation, and layout freshness with ✅/⚠/❌ icons — strong implementation. But the File Review tab (`populateDownloadTab`, the other place outputs are shown) currently crashes before rendering its file grid whenever files exist (see trace finding #2), so this criterion fails on that surface. |
| 2 | UI makes clear which files are available and current | ⚠️ Partial | `finalise.js:76-91` lists generated files with the output directory; `download-tab.js:190-263` (`_renderDownloadGrid`) shows per-file "Generated {date}" timestamps and run numbers when reachable — but is currently non-functional (trace finding #2). |
| 3 | Finalise/archive actions clearly separated from earlier preview steps | ⚠️ Partial | Visually and structurally separated (own tab, own pill, own action button) — but the first-time navigation experience via the pill shows an incorrect "back-navigation" warning (trace finding #1), undermining the intended "trustworthy checkpoint" framing. |

**Acceptance criteria:** "final-stage UI supports confident readiness determination" — ⚠️ Partial (readiness checklist itself is solid; but is only reachable via the pill, with a spurious warning, and the File Review tab's own readiness chip is broken). "User can identify current deliverables before finalising" — ⚠️ Partial, same caveats.

---

### US-O2: Application Metadata and Tracking

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-------------------|
| 1 | Status values are understandable and actionable | ✅ Pass | 8-value enum (`queued, draft, ready, sent, interview, rejected, accepted, parked`) with plain-English labels — `web/finalise.js:103-111`. Backend validates the identical enum — `scripts/routes/generation_routes.py:2146`. Same enum reused consistently in the Sessions modal — `web/session-switcher-ui.js:376-378, 691-693`. |
| 2 | Notes captured at point of finalisation | ✅ Pass | `#finalise-notes` textarea with a 2000-char counter — `web/finalise.js:114-122`; submitted via `POST /api/finalise` — `web/finalise.js:296-300`; persisted to `metadata.json` — `scripts/routes/generation_routes.py:2159`. |
| 3 | Archive behaviour preserves context for later follow-up | ✅ Pass | `metadata.json` is written with `application_status`, `notes`, `finalised_at`, clarification answers, spell audit, layout instructions, validation results, and ATS score (`generation_routes.py:2158-2167`); a git commit is created for the output directory (`generation_routes.py:2196-2219`); status/notes remain editable after archiving via an update endpoint in `session_routes.py:722-749`, and are surfaced with inline edit controls in the Sessions modal (`web/session-switcher-ui.js:405-424, ~703, ~749`). |

**Acceptance criteria:** Both criteria are well-supported by the backend and UI. One caveat: `GET /api/finalise-meta` (`generation_routes.py:2074-2095`) and `POST /api/finalise` (`:2097` on) both default `application_status` to `'ready'` rather than a neutral "unset" sentinel — a session that has never been finalised will show "Ready to send" pre-selected in the dropdown (`finalise.js:106`, `selected` attribute on the `ready` option), which could cause a user to archive without deliberately choosing a status. Minor, but worth flagging under Additional Issues below.

---

### US-O3: File Naming and Package Hygiene

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-------------------|
| 1 | Generated files use job-relevant naming | ✅ Pass | `f'CV_{compact_company}_{compact_role}_{timestamp}.pdf'` / `.docx` / `.html`, `f'CV_{ats_company}_{ats_role}_{timestamp}_ATS.docx'` — `scripts/cv-preview.py:381-391`; `f'CoverLetter_{company}_{date_str}.docx'` — `scripts/cv-preview.py:348`; role/company slugging also present in `scripts/utils/cv_orchestrator.py:2085, 2332`. |
| 2 | File Review surfaces present outputs manageably | ❌ Fail | Currently crashes before rendering (trace finding #2) whenever files exist — the manageable grid layout, icons, and descriptions in `download-tab.js:22-78, 190-263` never reach the DOM. |
| 3 | Multiple generation passes do not obscure which output is current | ⚠️ Partial | `_renderDownloadGrid` design intent supports this via `generationRun`/`generatedAt` labels ("Run #2 — ..." at `download-tab.js:205`) — but again unreachable due to the crash. The Finalise tab's own file listing (`finalise.js:76-91`) has no run/generation-number indicator at all, so if a user regenerates and returns to Finalise, they cannot tell from that screen whether the listed files are from the latest run. |

---

## Generated Materials Evaluation

Not applicable in depth for this cycle — this review focused on the application's Finalise/File-Review reachability per the task brief. File naming conventions were spot-checked above (US-O3 criterion 1, Pass) directly against the generation source, not a generated output sample.

---

## Additional Story Gaps / Proposed Story Items

- **Default-selected status risk (US-O2):** The `#finalise-status` dropdown defaults/pre-selects "Ready to send" (`web/finalise.js:106`, and the backend default in `generation_routes.py:2083, 2086, 2091, 2143`). A recruiter-ops user who clicks "Finalise & Archive" without consciously picking a status will silently record "ready" — recommend defaulting to a neutral state (e.g. `draft`) or requiring an explicit selection before enabling the archive button.
- **No status-based filtering in the Sessions modal (US-O2 adjacent):** `web/session-switcher-ui.js` supports free-text search and column sorting (`_sortSessionRows`, `_SM_STORAGE_KEY`) but has no "filter by status" (e.g., show only `sent` or `interview`) control, despite surfacing `application_status` per row. For an operations-tracking persona managing many concurrent applications, a status filter/chip-group would be a natural, low-cost addition. Proposing this as a new acceptance criterion under US-O2 or a new US-O4 ("Cross-Session Status Filtering").
- **No generation-run indicator on the Finalise tab's own file list** (see US-O3 #3 above) — the Finalise tab shows `generated.files` (`finalise.js:76-91`) with no timestamp/run number, unlike the File Review tab's design intent. Recommend surfacing `generation_run`/`generation_date` here too so the readiness checklist and the archive action always reflect an explicitly-dated snapshot.
- **Terminology observation:** The raw HTML source labels the chat-panel CTA "📦 Package Application Files" (`web/index.html:205`), but `app.js:159` immediately rewrites it client-side to "📦 Archive Application" on every page load. A reviewer reading only `index.html` (as static markup, or via view-source) would see stale/incorrect copy; recommend updating the source string directly rather than relying on a JS rewrite, to avoid divergence and to keep grep/search of the HTML meaningful.
- **Terminology observation:** "Finalise" (used throughout the UI, tab, and pill) vs. "Archive" (used in the button labels "Finalise & Archive", "Archive Application") vs. "Package" (original unused label) are used interchangeably for the same action across different surfaces. This is not incorrect, but a recruiter-ops user skimming quickly could reasonably wonder whether "Finalise," "Archive," and "Package" are three different steps. Suggest standardizing on one primary verb (e.g., "Archive") with "Finalise" only as a supporting/secondary descriptor, or vice versa, consistently across the tab label, pill label, and both buttons.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus web/finalise.js, web/workflow-steps.js, web/download-tab.js, scripts/routes/session_routes.py, scripts/routes/generation_routes.py, web/session-switcher-ui.js, web/review-table-base.js, web/ui-helpers.js, web/bundle.js

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-O1 | 0 | 3 | 0 | 0 | 0 |
| US-O2 | 3 | 0 | 0 | 0 | 0 |
| US-O3 | 1 | 1 | 1 | 0 | 0 |

**Key evidence references:**
- Central bug (File Review tab crash / dead "Skip to Finalise" button): `web/download-tab.js:259` (`blockingFails` undeclared) → `web/download-tab.js:509` (call site inside `populateDownloadTab`) → `web/review-table-base.js:445-453` (catch handler that masks the crash as an appended error line) → also present in built output at `web/bundle.js:16951`.
- Spurious back-navigation warning on first Finalise-pill click: `web/workflow-steps.js:976-977` (`done.finalise`/`done.harvest` both = `postLayout`) → `web/workflow-steps.js:1213-1223` (`handleStepClick` back-nav detection) → `web/workflow-steps.js:139-189` (`_showReRunConfirmModal` copy).
- `finalise-action-btn` circular-reachability / desync-on-poll: `web/ui-helpers.js:147-157` (`_STAGE_BUTTON_MAP`), `web/workflow-steps.js:986-997` (`phaseToStep`, no `'finalise'` key), `web/state-manager.js:35-48` (`PHASE_TO_STEP`, no `'finalise'` key), `web/api-client.js:211-226` (`fetchStatus` triggers `updateWorkflowSteps` on every call).
- Reachability structural fix verified correct: `web/ui-core.js:358-372` (`STAGE_TABS.finalise`), `web/index.html:151, 235` (pill + tab, no `display:none`), `web/workflow-steps.js:33-36,49,926,955,1133,1200` (full `_STEP_ORDER`/`_STEP_DISPLAY`/`_STEP_FWD_PHASE_MIN`/`STEP_LABELS`/`stepToTab` wiring).
- Status/notes tracking backend: `scripts/routes/generation_routes.py:2074-2249` (`/api/finalise-meta`, `/api/finalise`), `scripts/routes/session_routes.py:156-213, 722-749` (`/api/sessions`, status/notes patch endpoint).
- File naming convention: `scripts/cv-preview.py:381-391`, `scripts/utils/cv_orchestrator.py:2085,2332`.

**Evidence standard:**
- Every conclusion above is supported by a specific file path and line number, and the two central bugs (`blockingFails` ReferenceError, and the `postLayout`-driven simultaneous-completion false back-nav warning) were additionally reproduced/traced end-to-end (isolated Node repro for the ReferenceError; full call-chain trace for the back-nav warning) rather than inferred from comments or prior review artifacts.
- Citations use repository-relative paths plus line numbers throughout.
