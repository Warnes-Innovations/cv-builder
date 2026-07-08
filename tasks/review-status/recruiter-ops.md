<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter Ops Review Status

**Last Updated:** 2026-07-07 22:02 ET

**Executive Summary:** Follow-up cycle review. **GAP-378** (re-run confirm modal wired to real recompute endpoint) remains fixed — no regression. **GAP-386** (active-session notes editing) is **RESOLVED end-to-end** — verified backend endpoint, request wiring, and frontend round-trip, not just presence of a function name. **GAP-388** (Finalise/Archive/Package terminology) is **PARTIAL** — the four specifically-named entry-point surfaces (workflow-step pill, tab label, header CTA button, and their tooltips) are now consistently "Finalise" with the stale "📦 Package Application Files" HTML and the app.js runtime text-patch both gone — but "Archive" still appears as a co-equal, unremoved verb *inside* the Finalise tab's own action button ("Finalise & Archive"), descriptive copy ("Archive this application to your CV history…"), and success messaging ("Application archived!" / "✅ Archived"), plus contextual copy on two other tabs. A recruiter-ops user who actually runs the flow (not just looks at entry points) still sees both verbs. Two additional bugs found in the *previous* review cycle (a `ReferenceError` crashing the File Review tab, and a spurious "navigating back" warning on first Finalise-pill click) have both been fixed since, meaningfully improving US-O1/US-O3 scores this cycle.

---

## Application Evaluation

### GAP-378 re-verification: Re-run confirmation → real recompute endpoint

**Status: RESOLVED, no regression.**

- `confirmReRunPhase(step)` (`web/workflow-steps.js:191-199`) calls `_showReRunConfirmModal(step, 'rerun', () => reRunPhase(step))` — the callback is `reRunPhase`, not `backToPhase`/plain navigation.
- `reRunPhase()` → `_executeReRunPhase()` (`web/workflow-steps.js:409-422`) issues `POST /api/re-run-phase` with `{phase: step}` — the real recompute endpoint.
- Confirmed live wiring to this function from all expected call sites: the pill's "↻ Re-run" button (`web/workflow-steps.js:1041`, `onclick="...confirmReRunPhase('${step}')"`), the `Ctrl+Shift+R` keyboard shortcut (`web/keyboard-shortcuts.js:273-275`), `web/layout-instruction.js:697`, and `web/review-table-base.js:321`.
- The in-code comment at `workflow-steps.js:192-197` explicitly documents the original bug (calling `backToPhase`, navigation-only) and why `reRunPhase` is correct — consistent with the modal copy's promise ("will see updated inputs and may show changed recommendations").

### GAP-386 re-verification: Active-session notes editing

**Status: RESOLVED, verified end-to-end (not just endpoint existence).**

Backend:
- `PATCH /api/sessions/active/notes` (`scripts/routes/session_routes.py:760-793`, handler `sessions_patch_active_notes`) resolves the session via `_get_session()`, validates ownership via `_validate_owner(entry)`, requires `notes` in the JSON body, writes into `metadata.json` under the session's `session_dir`, and returns `{ok: true, notes}`.
- `_get_session()` (`scripts/web_app.py:710-745`) reads `session_id` from the JSON body for non-GET requests (confirmed it works for PATCH, not just POST/PUT/DELETE as its docstring lists — the actual check is `request.is_json`, method-agnostic).
- `GET /api/sessions/active` (`scripts/routes/session_routes.py:795-833`) now includes a `notes` field per active session, read from the same `metadata.json` sidecar via helper `_active_notes()` (`:801-813`) — this is what makes existing notes visible in the Sessions modal for in-progress sessions in the first place.

Frontend:
- `web/session-switcher-ui.js:409` builds `notesKey = row.type === 'active' ? 'active-${sessionId}' : 'saved-${idx}'`, and renders a notes preview + inline edit widget (textarea, save/cancel buttons) for **both** active and saved rows (`:410-422`), with an "Edit notes" icon button always present regardless of row type (`:429`, unlike the status-edit button which is saved-only at `:425-427`).
- Click dispatch (`_handleSessionModalClick`, `:546-548`) wires `edit-notes`/`submit-notes`/`cancel-notes` actions to `startSessionNotesEdit`/`submitSessionNotesEdit`/`cancelSessionNotesEdit`.
- `submitSessionNotesEdit()` (`:746-778`) branches on `rowType === 'active'`: active rows PATCH `/api/sessions/active/notes` with `{session_id, notes, owner_token}` in the body; saved rows PATCH `/api/sessions/metadata` with `{path, notes}`. This matches the backend's expectation of `session_id` in the JSON body exactly.
- On success, the preview span updates in place and the edit widget collapses; on failure, a toast is shown via `showToast`.

This is a genuine, complete round trip: read (GET /api/sessions/active includes notes) → edit (inline widget, keyed correctly per row type) → write (correct endpoint/payload per row type) → persist (metadata.json) → re-render (preview updates). No broken links found in the chain.

### GAP-388 re-verification: "Finalise" terminology

**Status: PARTIAL.** The four surfaces the gap explicitly named are fixed; other in-flow surfaces still say "Archive."

**Fixed (entry points):**
- Workflow-step pill: `<div class="step" id="step-finalise" title="Finalise — mark the application ready to send and record its status" ...>✅ Finalise</div>` — `web/index.html:151`. No "Archive"/"Package" wording.
- Tab label: `<div class="tab" id="tab-finalise" data-tab="finalise" ...>✅ Finalise</div>` — `web/index.html:235`.
- Header/action button: `<button ... id="finalise-action-btn" ... title="Run the completeness checklist and finalise this application package">✅ Finalise Application</button>` — `web/index.html:205`. The stale "📦 Package Application Files" source text is gone; confirmed via `grep -i "package application"` across `web/index.html`, `web/app.js`, `web/finalise.js`, `web/ui-core.js`, `web/ui-helpers.js`, `web/workflow-steps.js` — zero hits, and zero `📦` hits.
- Runtime JS patch removed: `web/app.js:156-159` now only does `finaliseBtn.addEventListener('click', () => switchTab('finalise'))` — no `.textContent =` rewrite of the button label remains (previously it rewrote the button text client-side to paper over the stale HTML). Confirmed absent from both source and the rebuilt `web/bundle.js` (`bundle.js:23883-23885` matches source exactly; `git log -1` shows `bundle.js` and `app.js` committed at the identical timestamp, so the bundle is not stale).

**Not fixed (still "Archive" as a competing verb, inside the flow itself):**
- Finalise-tab submit button: `✅ Finalise &amp; Archive` — `web/finalise.js:127` (also the interim/loading state at `:291,310,350`).
- Finalise-tab description copy: "Archive this application to your CV history, update the response library…" — `web/finalise.js:81`.
- Finalise-tab success banner: `✅ Application archived!` and the button relabels itself `✅ Archived` on success — `web/finalise.js:328,339`.
- Contextual helper copy on two other tabs pointing at the same action: "...you can archive the application" — `web/download-tab.js:431`; "...lets you archive the application" — `web/final-generate.js:143`.

**Verdict on the explicit charge ("is 'Finalise' now truly the ONLY verb used for this action anywhere in the UI?"):** No. The navigational entry points (what a user sees *before* acting) are now unambiguous, but the moment the user actually opens the Finalise tab and works through it, "Archive" reappears repeatedly as a synonym for the same action, including in the primary CTA button's own label. This is a narrower, but real, residual instance of the exact ambiguity GAP-388 was opened to close (a recruiter-ops user skimming the actual working screen, not just the tab bar, can still reasonably wonder if "Finalise" and "Archive" are the same step).

### Carried-over findings from prior cycle (independently re-checked this cycle)

1. **File Review tab crash — FIXED.** The previously-reported `ReferenceError: blockingFails is not defined` in `_renderDownloadGrid()` (`web/download-tab.js`, formerly line ~259) is resolved: the block now correctly references the function's own `blockDocx`/`blockHtml`/`blockPdf` flags (`web/download-tab.js:263`), with an explanatory comment (`:258-262`) noting the prior scoping bug. The "✅ Skip to Finalise →" button (`download-tab.js:527`) is therefore reachable again since the tab no longer crashes before rendering it.
2. **Spurious "navigating back" warning on first Finalise-pill click — FIXED.** `handleStepClick()` (`web/workflow-steps.js:1217-1246`) now explicitly excludes the mutually-simultaneous post-layout "sibling" steps (`download, cover_letter, screening, interview_prep, thank_you, finalise, harvest` — the `_POST_LAYOUT_SIBLING_STEPS` set, `:1231-1233`) from counting each other as "downstream completed," with an in-code explanation of why (`:1220-1230`). First-time forward navigation to Finalise via the pill no longer triggers the incorrect back-navigation confirmation dialog.
3. **`finalise-action-btn` circular reachability / poll-desync — STILL OPEN, not addressed this cycle.** `PHASE_TO_STEP` (`web/state-manager.js:35-45`) and `phaseToStep` (`web/workflow-steps.js:992-1002`) both still have no `'finalise'` entry — `final_generation`/`refinement` map to `'download'`. This means `finalise-action-btn` only becomes visible via the tab-driven path (already on the Finalise tab), and any subsequent `/api/status` poll while sitting on that tab still reverts `activeStep`/action buttons to `'download'`. Not one of the three gaps this cycle asked to re-verify, but still a real US-O1 concern (the button can't act as the forward call-to-action that gets a user *to* the tab) — carried forward, unresolved.
4. **Default-selected "Ready to send" status — STILL OPEN.** `<option value="ready" selected>` — `web/finalise.js:105`. A user could archive without deliberately choosing a status. Carried forward as a minor US-O2 observation.

---

### US-O1: Submission Readiness Clarity

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-------------------|
| 1 | Final outputs clearly visible and distinguishable | ✅ Pass | Readiness checklist (`web/finalise.js:164-216` area, `_renderReadinessChecklist`) and the File Review grid (`download-tab.js:190-263`) both render now that the `blockingFails` crash is fixed. |
| 2 | UI makes clear which files are available and current | ✅ Pass | `download-tab.js` shows per-file "Generated {date}" / run-number labels (`:205` area) once reachable; `finalise.js:76-91` lists generated files with output dir. |
| 3 | Finalise/archive actions clearly separated from earlier preview steps | ⚠️ Partial | Structural separation and navigation are now clean (spurious back-nav warning fixed — see above). But the "Finalise" vs. "Archive" verb-blending inside the tab itself (GAP-388 partial, see above) undercuts the "trustworthy checkpoint" framing this criterion is meant to protect. |

**Acceptance criteria:** "Final-stage UI supports confident readiness determination" — ✅ Pass (both prior blockers fixed). "User can identify current deliverables before finalising" — ✅ Pass.

---

### US-O2: Application Metadata and Tracking

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-------------------|
| 1 | Status values understandable and actionable | ✅ Pass | 8-value enum (`queued, draft, ready, sent, interview, rejected, accepted, parked`) — `web/finalise.js:103-111`; identical enum validated server-side — `scripts/routes/session_routes.py:734`; reused in Sessions modal — `web/session-switcher-ui.js:376-378`. |
| 2 | Notes captured at point of finalisation | ✅ Pass | `#finalise-notes` textarea, 2000-char counter (`finalise.js:114-122`), submitted via `POST /api/finalise`. **Enhanced this cycle (GAP-386):** notes can now also be captured *before* finalisation, for an active in-progress session, via the Sessions modal's inline notes editor → `PATCH /api/sessions/active/notes` (see GAP-386 section above) — directly strengthens this criterion's intent ("notes captured... so tracking stays organized"). |
| 3 | Archive behavior preserves context for later follow-up | ✅ Pass | `metadata.json` persists status/notes/timestamps (`session_routes.py:743-758`); both remain editable post-archive via `/api/sessions/metadata` and pre-archive via `/api/sessions/active/notes`, surfaced with inline edit controls in the Sessions modal for both row types (`session-switcher-ui.js:405-429`). |

**Acceptance criteria:** Both well-supported; GAP-386 closes a real prior gap (notes for active sessions). Minor open item: default-selected "ready" status (see carried-over finding #4).

---

### US-O3: File Naming and Package Hygiene

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-------------------|
| 1 | Generated files use job-relevant naming | ✅ Pass | `f'CV_{compact_company}_{compact_role}_{timestamp}.pdf/.docx/.html'`, `f'CV_{ats_company}_{ats_role}_{timestamp}_ATS.docx'` — `scripts/cv-preview.py:388-391`. Unchanged and re-confirmed this cycle. |
| 2 | File Review surfaces present outputs manageably | ✅ Pass | Was ❌ Fail last cycle due to the `blockingFails` crash; now fixed (see carried-over finding #1) — the grid, icons, and descriptions render normally. |
| 3 | Multiple generation passes do not obscure which output is current | ⚠️ Partial | `download-tab.js` shows run/date labels once reachable (now it is). But the Finalise tab's own file listing (`finalise.js:76-91`) still has no run/generation-number indicator, so a user re-generating and returning to Finalise specifically cannot tell from that screen alone whether the listed files are current. Carried over from prior review, unresolved this cycle. |

---

## Generated Materials Evaluation

Not applicable in depth for this cycle — this review, per the task brief, focused on re-verifying GAP-378/386/388 and the application workflow surfaces. File naming conventions were spot-checked directly against generation source code (US-O3 criterion 1), not a generated output sample.

---

## Additional Story Gaps / Proposed Story Items

- **GAP-388 residual scope (recommend a follow-up ticket):** Standardize "Finalise" as the *only* verb inside `web/finalise.js` itself (button label, description copy, success messaging) and in the cross-referencing helper text in `web/download-tab.js:431` and `web/final-generate.js:143`. Current state is a real, but narrower, instance of the original terminology-consistency problem — the fix addressed the navigational chrome but not the working screen's own copy.
- **`finalise-action-btn` reachability (carried over):** Add a `'finalise'` entry to both `PHASE_TO_STEP` (`web/state-manager.js:35-45`) and `phaseToStep` (`web/workflow-steps.js:992-1002`) — ideally backed by a real backend phase — so the action button can serve as a forward call-to-action and doesn't desync on the next status poll while the user is on the tab.
- **Default status pre-selection (carried over, US-O2):** `web/finalise.js:105` defaults to "Ready to send." Recommend a neutral default (e.g., `draft`) or requiring explicit selection, so status isn't recorded by omission.
- **No run/generation indicator on the Finalise tab's own file list (carried over, US-O3 #3):** Recommend surfacing `generation_run`/`generation_date` in `finalise.js:76-91` to match `download-tab.js`'s design intent.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/session-switcher-ui.js, scripts/routes/session_routes.py, web/workflow-steps.js, plus web/finalise.js, web/download-tab.js, web/final-generate.js, web/keyboard-shortcuts.js, web/layout-instruction.js, web/review-table-base.js, web/ui-helpers.js, web/bundle.js, scripts/cv-preview.py

| Story | ✅ | ⚠️ | ❌ | 🔲 | — |
|---|---|---|---|---|---|
| US-O1 | 2 | 1 | 0 | 0 | 0 |
| US-O2 | 3 | 0 | 0 | 0 | 0 |
| US-O3 | 2 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- GAP-378 (re-run modal → real endpoint): `web/workflow-steps.js:191-199` (`confirmReRunPhase`) → `:409-422` (`reRunPhase`/`_executeReRunPhase`, `POST /api/re-run-phase`) → call sites `:1041`, `web/keyboard-shortcuts.js:273-275`, `web/layout-instruction.js:697`, `web/review-table-base.js:321`.
- GAP-386 (active-session notes): `scripts/routes/session_routes.py:760-793` (`PATCH /api/sessions/active/notes`), `:795-833` (`GET /api/sessions/active` includes `notes`), `scripts/web_app.py:710-745` (`_get_session` reads JSON body); `web/session-switcher-ui.js:405-429` (notesKey/edit widget for active + saved rows), `:546-548` (dispatch), `:746-778` (`submitSessionNotesEdit`, correct endpoint/payload per row type).
- GAP-388 (Finalise terminology): fixed — `web/index.html:151,205,235` (pill/button/tab all "Finalise", no "Package"/"Archive"); `web/app.js:156-159` (runtime patch removed); `web/bundle.js:23883-23885` (rebuilt, matches source). Not fixed — `web/finalise.js:81,127,291,310,328,339,350` ("Archive" as competing verb inside the tab); `web/download-tab.js:431`, `web/final-generate.js:143` (cross-tab "archive" copy).
- Carried-over fixes verified: `web/download-tab.js:258-265` (`blockingFails` ReferenceError fixed); `web/workflow-steps.js:1217-1246` (`_POST_LAYOUT_SIBLING_STEPS` exclusion fixes spurious back-nav warning).
- Carried-over open items: `web/state-manager.js:35-45`, `web/workflow-steps.js:992-1002` (no `'finalise'` phase mapping); `web/finalise.js:105` (default status); `web/finalise.js:76-91` (no run indicator).

**Evidence standard:** Every conclusion above is supported by a specific file path and line number read directly from current source (not from `tasks/gaps.md` or `tasks/ui-review.md`). The GAP-378 and GAP-386 request/response chains were traced call-site to call-site rather than inferred from function names or comments alone.
