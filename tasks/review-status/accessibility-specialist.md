<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility-Specialist Review Status

**Last Updated:** 2026-07-07 20:17 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Workflow-step elements reachable/operable by keyboard | ⚠️ Partial (one step FAILS) | `web/ui-core.js:1802-1900` `updateWorkflowStepsClickable()` dynamically adds `role="button"`, `tabindex="0"`, and an Enter/Space keydown handler to workflow-step pills — but only for the ids listed in its `sequentialSteps` (line 1804-1811) and `postLayoutSteps` (line 1813-1820) arrays. **`step-finalise` is absent from both arrays.** `web/index.html:151` gives `#step-finalise` no `tabindex`/`role` in markup either (only `#step-job` gets static `role="button" tabindex="0"` at `index.html:129`). Meanwhile `web/workflow-steps.js:976` (`updateWorkflowSteps()`) marks `finalise` as `done`/`.completed`/`.clickable` (cursor:pointer, hover styling) once `postLayout` is true — i.e. it looks and behaves like every other clickable pill to a mouse user, but a keyboard-only user can never Tab to it or activate it with Enter/Space. This is the exact "clickable element not keyboard reachable" failure mode called out in the story, and it is specific to the newly-added Finalise pill — its 12 siblings (`job` through `harvest`) are all correctly wired. |
| 2 | Stage tabs expose correct tab semantics, selected state, panel association | ✅ Pass | `web/index.html:215-241` — `role="tablist"` on `#tab-bar`, each `.tab` has `role="tab"`, `aria-selected`, `aria-controls="document-content"`. `web/review-table-base.js:239-252` (`switchTab()`) implements the full WCAG roving-tabindex pattern: clears `aria-selected`/`tabindex` on all tabs, sets `aria-selected="true"`/`tabindex="0"` on the active tab, and updates `#document-content`'s `aria-labelledby` to the active tab's id every switch. `web/ui-core.js:472-498` wires Arrow/Home/End keyboard navigation across visible tabs. |
| 3 | Active/completed states conveyed by more than colour alone | ✅ Pass (tabs/steps) | Tabs: `.tab.active` (`web/styles.css:817`) changes background + border + text colour (not hue-only) and is exposed via `aria-selected`. Workflow steps: `web/workflow-steps.js:1048-1060` appends an `sr-only` textual state suffix ("(current step)", "(completed)", "(stale — results may be outdated)", etc.) to every step's label, and step state is additionally reinforced by left-to-right sequence position. Model-wizard progress steps use `aria-current="step"`/`aria-current="false"` (`web/ui-core.js:1247,1251,1255`) as a further non-colour cue. |
| 4 | Stage/tab changes announced or programmatically determinable | ✅ Pass | `web/index.html:157-158` `#workflow-stage-announcer` (`aria-live="polite" aria-atomic="true"`, visually hidden via clip-rect). `web/review-table-base.js:265-272` writes to it on every `switchTab()` call ("Now viewing: {stage} — {tab}"), clearing then re-setting with a 50 ms delay so repeated identical announcements still fire. `web/ui-core.js:1887-1899` also sets `aria-current="step"` on the active workflow step (except Finalise, see #1). |

**Failure Modes Guarded Against:**

| Failure mode | Present? |
|---|---|
| Clickable workflow elements not keyboard reachable | ❌ **Present** — `step-finalise` (see criterion 1) |
| Tabs styled visually but missing role/selection/panel linkage | ✅ Not present — full tablist pattern implemented |
| Status indicated only by colour or position | ✅ Not present — sr-only text + aria-current supplement colour/position |

---

### US-X2: Modal and Dialog Accessibility

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Opening a modal moves focus into it | ✅ Pass | `web/ui-core.js:289-302` `setInitialFocus()` focuses `[data-focus-target="true"]`, else first text input, else first button, called by every modal-open function (e.g. `openSettingsModal():256`, `openModelModal():1411`, `master-cv.js` add/edit modals). |
| 2 | Focus is trapped inside the modal while open | ✅ Pass (mechanism) / ⚠️ risk noted | `web/ui-core.js:309-340` `trapFocus()` correctly cycles Tab/Shift+Tab between first/last focusable elements and is called consistently before every modal is shown. **Caveat:** because `trapFocus()` computes the focusable-element snapshot once at open time and attaches a `document`-level `keydown` listener that is never deactivated until its matching `restoreFocus()` pop, **nested modals** (e.g. opening "Add Publication" from inside the already-open Master CV modal, `web/master-cv.js:1565` inside `web/master-cv.js:3045-3051`) leave two independent trap listeners active on `document` simultaneously — the outer modal's trap still fires (checking against its own stale first/last element snapshot) while the inner modal's trap also fires, which can produce surprising Tab-order jumps while a nested dialog is open. |
| 3 | Closing a modal restores focus to the triggering control | ❌ **Fail (systemic, ~20 dialogs)** | See detailed finding below. |
| 4 | Dialog title/purpose programmatically exposed | ✅ Pass (with the GAP-cycle fix verified) | All `role="dialog"` overlays in `index.html` declare `aria-modal="true"` + `aria-labelledby` pointing at a real `<h2>`/`<h3>` id (e.g. `sessions-modal-title`, `settings-modal-title`, `model-modal-title`). **Publication modal ID fix verified correct:** `web/master-cv.js:354-359` — the modal overlay's `aria-labelledby="pub-modal-title-heading"` now matches a heading `<h2 id="pub-modal-title-heading">`, which is a *different* id from the Title text-input field lower in the same modal (`<input id="pub-modal-title">`, line 389). The previous collision (heading and input sharing `pub-modal-title`) is resolved, and the fix is threaded through correctly — `showAddPublicationModal()` (line 1564) and `editMasterPublication()` (line 1598) both write to `#pub-modal-title-heading` (not the input) to swap the heading text between "Add Publication"/"Edit Publication". |

**Systemic focus-restore bug (US-X2 criterion 3 — FAIL):**

`restoreFocus()` (`web/ui-core.js:345-351`) does `_focusStack.pop()` to get the element to refocus. That module-private `_focusStack` array is only ever *pushed to* in four places: `web/ui-core.js:255` (`openSettingsModal`), `:626` (`openModal`), `:1410` (`openModelModal`), and via the exported `pushFocusStack()` helper (`:353-355`), which in turn is correctly called from `web/ats-modals.js:158,282`, `web/ui-helpers.js:33,43`, and `web/session-switcher-ui.js:189,577`.

However, **`web/master-cv.js` never calls `pushFocusStack()` or pushes onto `_focusStack`** — its ~19 modal-open functions (`showAddPublicationModal:1566`, `editMasterPublication:1600`, `showImportPublicationsModal:1372`, `showConvertPublicationsModal:1444`, `showAddAchievementModal:1856`, `editMasterAchievement:1870`, `showAddSummaryModal:1919`, `editMasterSummary:1929`, `showEditPersonalInfoModal:1984`, `showAddExperienceModal:2043`, `editMasterExperience:2140`, `showAddSkillModal:2243`, `editMasterSkill:2280`, `showAddEducationModal:2379`, `editMasterEducation:2395`, `showAddAwardModal:2478`, `editMasterAward:2492`, `showAddCertificationModal:2570`, `editMasterCertification:2582`, and even the top-level `openMasterCvModal():3045`) each instead assign `_focusedElementBeforeModal = document.activeElement;` — an **undeclared variable that is never read back by anything** (confirmed via `grep`: it is only ever assigned, in `master-cv.js` and once in `web/workflow-steps.js:180,356`, and never used to restore focus). `web/workflow-steps.js`'s ad-hoc dialogs (`rerun-confirm-overlay:180`, `clar-amend-overlay:356`, `bullet-reorder-modal`) have the identical pattern.

Every one of these dialogs still calls `trapFocus()` (which unconditionally pushes its keydown-listener reference onto the *separate* `_focusTrapStack`, so the Tab-trap itself is cleaned up correctly) and, on close, calls the shared `restoreFocus()` (`master-cv.js:1379,1451,1607,1877,1936,1993,2147,2288,2402,2499,2589,3059`; `workflow-steps.js:184,362,787,899`), which pops `_focusStack` regardless.

**Net effect:** because roughly 20+ dialogs pop `_focusStack` on close without ever having pushed to it, `_focusStack` becomes permanently under-populated/misaligned relative to `_focusTrapStack` for the whole session. Concretely:
- Closing "Add Publication", "Edit Achievement", the top-level Master CV modal, the rerun-confirmation dialog, etc. will **not** return focus to the button that opened them — `_focusStack.pop()` either returns `undefined` (no-op, focus is simply left wherever the browser puts it, typically `<body>`) or, worse, pops an entry that was pushed for a **different, unrelated modal** opened earlier in the session (e.g. Settings, Sessions, or the AI Model wizard), silently corrupting that other modal's eventual focus restoration too.
- This directly reproduces the story's named failure mode: "Escape or close actions leaving focus lost," and it affects effectively the entire Master CV editing experience (one of the app's primary workflows) plus several workflow-bar confirmation dialogs.

**Fix direction:** every `master-cv.js`/`workflow-steps.js` modal-open function should call `pushFocusStack(document.activeElement)` (already exported from `ui-core.js:1933`) instead of assigning the dead `_focusedElementBeforeModal` variable, mirroring the pattern already used correctly in `ats-modals.js`, `ui-helpers.js`, and `session-switcher-ui.js`.

**Failure Modes Guarded Against:**

| Failure mode | Present? |
|---|---|
| Modal opens visually while focus stays behind it | ✅ Not present — `setInitialFocus()` runs on every open |
| Escape/close leaving focus lost | ❌ **Present** — systemic `_focusStack` bug above |
| Multiple dialogs lacking accessible labels | ✅ Not present — all overlays have `aria-labelledby`; publication-modal duplicate-id regression is fixed |

---

### US-X3: Forms, Errors, and Review Controls

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Validation errors exposed via accessible associations | ✅ Pass | `web/job-input.js:152,157,168,171,201` — inputs use `aria-describedby` pointing to `<span class="field-error" aria-live="polite">` elements; `job-input.js:596,606` toggles `aria-invalid` on the paste-URL field. `web/styles.css:1863` has an `aria-invalid` focus style hook. |
| 2 | Icon-only controls have descriptive labels | ⚠️ Partial | The overwhelming majority of icon-only controls are correctly labelled: all reorder (`↑`/`↓`) buttons across `achievements-review.js:282-283,327-328,638-639`, `experience-review.js:253-254`, `master-cv.js:2068,2070`, `publications-review.js:181,183,272-273`, `skills-review.js:430-431,859-860`, and `workflow-steps.js:804,808` carry `aria-label`; every modal `&times;`/`✕` close button in `master-cv.js` (12 modals) and `workflow-steps.js:762` has `aria-label`. **One gap found:** the "clear selected file" `✕` button in `web/job-input.js:206` (`<button onclick="clearSelectedFile()" ...>✕</button>`) has **no `aria-label` and no `title`** — a screen reader will announce it only as an unlabelled button/glyph. |
| 3 | Inline edit/review actions have clear, visible focus targets | ✅ Pass | Broad `:focus-visible` coverage confirmed across custom components: `.step` (`styles.css:295`), `.tab` (`:816`), `.icon-btn` (`:1430`), `.action-btn` (`:763`), `.rw-btn` (`:1516`), `.btn-primary/.btn-secondary/.btn-warning` (`:1576`), `.sm-btn`/`.sm-th` (session switcher, `:417,452`), `.q-group-dot`/`.q-chip` (`:660,679`), plus `:focus` box-shadow rings on form inputs (`:681,749,976,1725,1925`). No instances of `outline:none`/`outline:0` were found anywhere in `styles.css` — the "focus outline removed without replacement" failure mode is not present. |
| 4 | Error/status messages exposed to assistive tech | ✅ Pass | `#toast-container` (`index.html:309`) is `aria-live="polite" aria-atomic="true"`; `#session-conflict-banner` (`:120`) is `role="alert"`; `#llm-busy-label` (`:170`) is `role="status" aria-live="polite"`; per-field errors use `aria-live="polite"` spans (see criterion 1); `master-cv.js:2934` uses `role="alert"` for the master-CV-import error panel. |

**Failure Modes Guarded Against:**

| Failure mode | Present? |
|---|---|
| Validation errors shown only visually | ✅ Not present |
| Reorder/close buttons without labels | ⚠️ **One instance present** — `job-input.js:206` clear-file button |
| Focus outline removed without replacement | ✅ Not present |

## Generated Materials Evaluation

**N/A for this pass.** The seven files specified as required reading (`web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`) cover only the web application shell and its conversation/session state machine. Confirmed by direct inspection: `scripts/web_app.py` contains no HTML/template rendering (it is a pure JSON API — grep for `render_template`/inline `<style>`/`color:` returned zero hits; its one error handler at `web_app.py:1139-1143` explicitly returns JSON, not HTML, for `/api/` routes) and `scripts/utils/conversation_manager.py` delegates actual document rendering to `self.orchestrator.generate_preview_html_only(...)` (`conversation_manager.py:2685`), i.e. `scripts/utils/cv_orchestrator.py` (~274K, not in scope here). A follow-up pass should specifically read `cv_orchestrator.py` and whatever DOCX/PDF/HTML templates it drives to evaluate generated-document heading structure, colour contrast, and reading order.

## Additional Story Gaps / Proposed Story Items

- **US-X1 acceptance criteria should explicitly require dynamic-affordance parity checks.** The Finalise-pill gap slipped through precisely because a *new* step was added to the visual/CSS layer (`workflow-steps.js`'s `updateWorkflowSteps()`) without also being added to the separate JS layer that grants keyboard affordances (`ui-core.js`'s `updateWorkflowStepsClickable()`). Recommend adding an explicit acceptance criterion: "Every workflow-step id that receives `.clickable`/`.completed` styling from the step-rendering function must also appear in the keyboard-affordance function's id list," and/or refactor so a single source of truth drives both.
- **US-X2 should add an explicit criterion about a single canonical focus-stack.** The current criteria describe correct *behaviour* but not the implementation hazard that produced the regression found here: multiple modal-owning modules independently re-implementing "remember pre-modal focus" (one via the shared `pushFocusStack()`, others via a dead local variable). Recommend: "All dialog-opening code paths in the codebase must use the single shared focus-stack helper; no module may implement its own parallel pre-focus-tracking variable."
- **Consider a dedicated "Generated Materials Accessibility" story** (separate US-X4) that names the specific files in scope (`scripts/utils/cv_orchestrator.py`, template/HTML-preview generation) — the current story references this evaluation dimension but no required-reading file actually exercises it, so it is silently skipped every cycle.
- **Terminology observation:** the workflow step is labelled "Finalise" in the UI (`index.html:151`, `_STEP_DISPLAY.finalise`, `workflow-steps.js:49`) but the action button inside it is dynamically relabelled "📦 Archive Application" (`web/app.js:159`), while its `title` attribute says "Run the completeness checklist and archive this application package" (`app.js:160`) and the tab is titled "✅ Finalise — mark the application ready to send and record its status" (`index.html:151`). Three different verbs (finalise / archive / mark ready) describe what appears to be one action across three surfaces a user encounters in sequence; a single consistent verb (recommend standardising on "Finalise" or "Archive," not both) would reduce ambiguity for users relying on labels/tooltips rather than visual scanning, which is especially relevant for screen-reader users who hear these strings read aloud without the surrounding visual context that helps sighted users disambiguate.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus web/workflow-steps.js, web/master-cv.js, web/publications-review.js, web/job-input.js, web/review-table-base.js, web/ats-modals.js, web/ui-helpers.js, web/session-switcher-ui.js, web/session-manager.js, web/achievements-review.js, web/experience-review.js, web/skills-review.js, web/keyboard-shortcuts.js as needed.

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-X1 | 3 | 1 | 0 | 0 | 0 |
| US-X2 | 2 | 1 | 1 | 0 | 0 |
| US-X3 | 3 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- US-X1 #1: `step-finalise` missing keyboard affordances → `web/ui-core.js:1804-1820` (arrays omit `step-finalise`); visually clickable via `web/workflow-steps.js:976`.
- US-X2 #3: systemic focus-restore bug → `web/master-cv.js` (19 modal-open functions using dead `_focusedElementBeforeModal` instead of `pushFocusStack()`), `web/workflow-steps.js:180,356`; correct pattern for comparison at `web/ats-modals.js:158,282`, `web/ui-helpers.js:33,43`, `web/session-switcher-ui.js:189,577`.
- US-X2 #4: publication-modal duplicate-ID fix verified complete → `web/master-cv.js:354-359,1564,1598`.
- Skip link: implemented and off-canvas-until-focus (`web/styles.css:168-183`), but target `#document-content` lacks `tabindex="-1"` (`web/index.html:260`; confirmed no JS sets it — searched all non-bundle `web/*.js`), so programmatic focus does not land on it even though it is a valid, sensibly-scoped skip target.
- US-X3 #2: unlabelled close button → `web/job-input.js:206`.

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
