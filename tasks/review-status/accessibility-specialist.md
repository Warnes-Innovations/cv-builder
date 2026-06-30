<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-06-30 00:30 ET

**Executive Summary:** The application has a strong, deliberately built accessibility foundation. Focus trapping, roving tabindex on tabs, ARIA roles/labels/live-regions, reduced-motion accommodation, and `aria-current` on the active workflow step are all correctly implemented. Three specific gaps were confirmed by source-first reading: (1) `openJobAnalysisModal()` and `closeJobAnalysisModal()` have no focus save/restore at all, so the Job Analysis modal is the only named modal missing this behavior; (2) `showAlertModal()` calls `setInitialFocus()` without first saving `_focusedElementBeforeModal`, so `closeAlertModal()` restores focus to whatever the last properly-behaved modal had saved; and (3) when the post-layout phase is active all sequential workflow steps lose their `aria-current` mark (a narrow edge case in `updateWorkflowStepsClickable`). These are targeted, fixable gaps in an otherwise complete implementation.

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

#### Criterion 1: Keyboard reach for workflow steps

⚠️ Partial — `step-job` is the only step with static `role="button" tabindex="0"` in `index.html:120`. All other steps are inert `div` elements with `onclick` but no `role` or `tabindex` in the initial HTML (`index.html:122–142`). This is intentionally gated: `updateWorkflowStepsClickable()` in `ui-core.js:1929–1990` dynamically adds `role="button"`, `tabindex="0"`, and an Enter/Space keydown handler (`_makeStepClickable`) as phases unlock, and removes them when re-locking (`_makeStepInert`). The progressive-disclosure pattern is correct. However, locked steps that are not yet clickable still expose `onclick` attributes in the DOM, which means they are discoverable via accessibility-tree browsing without any role to signal intent.

#### Criterion 2: Stage tabs expose correct tab semantics

✅ Pass — `index.html:203` declares `role="tablist" aria-label="Application workflow tabs"` on `#tab-bar`. Every tab `div` carries `role="tab"`, `aria-selected="true/false"`, `aria-controls="document-content"`, and roving `tabindex` (`index.html:204–229`). The single tabpanel `#document-content` has `role="tabpanel" aria-labelledby="tab-job"` (`index.html:235`; the `aria-labelledby` pointer is updated by `switchTab()`). Arrow Left/Right/Home/End navigation is implemented in `ui-core.js:536–553`. Keyboard Enter/Space activates the focused tab (`ui-core.js:530–533`).

#### Criterion 3: Active and completed states conveyed beyond colour

⚠️ Partial — `updateWorkflowStepsClickable()` in `ui-core.js:1979–1988` sets `aria-current="step"` on the active sequential step and removes it from all others. This is correct for the pre-layout phases. However, when `postLayoutUnlocked` is true (phases `final_generation` or `refinement`), the active step variable resolves to `null` (`ui-core.js:1985`) and no `aria-current` is applied to any step — the active workflow position is undetectable non-visually during the post-layout phase. The `.active`, `.completed`, `.upcoming`, `.stale`, `.stale-critical` CSS classes (`styles.css:151–157`) convey state by colour only; no text label, icon text node, or `aria-label` supplements the visual state.

#### Criterion 4: Changes in active stage or tab are announced

✅ Pass — `index.html:146–147` declares a visually-hidden `aria-live="polite" aria-atomic="true"` region (`#workflow-stage-announcer`). In `bundle.js:3482–3486`, `switchTab()` populates this region with `"Now viewing: {tab label}"` on every switch using a `textContent = ""; setTimeout(() => ..., 50)` pattern that forces screen-reader re-announcement even when the same tab is re-selected.

---

### US-X2: Modal and Dialog Accessibility

#### Criterion 1: Opening a modal moves focus into it

⚠️ Partial — `openSettingsModal()` (`ui-core.js:239–247`), `openModelModal()` (`ui-core.js:1499–1523`), `openMasterCvModal()` (`bundle.js:17974–17984`), `openSessionsModal()` (`bundle.js:20071–20086`), `openOwnershipConflictDialog()` (`bundle.js:19835`), and the ATS report modal (`bundle.js:6598–6606`) all call `setInitialFocus()`. The bullet-reorder modal calls `setInitialFocus('bullet-reorder-modal')` (`workflow-steps.js:510`). `showAlertModal()` calls `setInitialFocus('alert-modal-overlay')` (verified in `bundle.js:5996`) but does NOT first execute `_focusedElementBeforeModal = document.activeElement`, leaving that variable stale. `openJobAnalysisModal()` (`bundle.js:6686–6700`) neither saves prior focus nor calls `setInitialFocus()` or `trapFocus()` — it only shows the overlay.

#### Criterion 2: Focus is trapped inside the modal while it is open

⚠️ Partial — `trapFocus()` (`ui-core.js:294–331`) is called by: `openSettingsModal`, `openModelModal`, `openMasterCvModal`, `openSessionsModal`, `openOwnershipConflictDialog`, the ATS report modal open, and the bullet-reorder modal (`workflow-steps.js:509`). The onboarding/welcome modal uses `_openOnboardingFocusTrap()` (`bundle.js:7611–7620`), which calls `globalThis.trapFocus('onboarding-modal-overlay')` and installs an Escape handler. The `confirmDialog()` utility has its own inline Tab trap (`ui-core.js:412–423`). `openJobAnalysisModal()` never calls `trapFocus()` — the Job Analysis modal has no focus trap.

#### Criterion 3: Closing a modal restores focus to the triggering control

⚠️ Partial — `closeSettingsModal()`, `closeModelModal()`, `closeMasterCvModal()`, `closeSessionsModal()`, `closeAtsReportModal()`, and the bullet-reorder close path all call `restoreFocus()`. The onboarding `closeWelcomeModal()` (`bundle.js:7621–7638`) calls `globalThis.restoreFocus()`. `closeConfirmModal()` restores from `_confirmPreviousFocus`. `closeAlertModal()` calls `restoreFocus()` but, because `showAlertModal()` never saved `_focusedElementBeforeModal`, it restores stale focus from the last modal that properly saved it (or nothing if none). `closeJobAnalysisModal()` (`bundle.js:6700`) only hides the overlay — it calls neither `restoreFocus()` nor any custom focus-restore path.

#### Criterion 4: Dialog title and purpose are programmatically exposed

✅ Pass — All modals in `index.html` have `role="dialog" aria-modal="true" aria-labelledby` pointing to an `h2` child: sessions (line 249), master-cv (line 271), alert (line 287), confirm (line 302), onboarding (line 319), ownership-conflict (line 401), model-config (line 418), settings (line 578), ats-report (line 689), job-analysis (line 705). The `confirmDialog()` utility sets `role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-msg"` (`ui-core.js:385–386`). The bullet-reorder modal sets `role="dialog" aria-modal="true" aria-labelledby="bullet-reorder-title"` (`workflow-steps.js:464–466`).

---

### US-X3: Forms, Errors, and Review Controls

#### Criterion 1: Inputs with validation errors expose those errors via accessible associations

✅ Pass — In the Job Input tab: the paste textarea has `aria-describedby="paste-char-count paste-error"` and `<span id="paste-error" class="field-error" aria-live="polite">` (`bundle.js:10508,10513`); the URL input has `aria-describedby="url-error"` and `<span id="url-error" class="field-error" aria-live="polite">` (`bundle.js:10524,10527`); the file upload has `aria-describedby="file-upload-error"` (`bundle.js:10557`). `aria-invalid="true"` is programmatically set on validation failure (`bundle.js:10868`) and cleared on fix (`bundle.js:10880`). `styles.css:1542–1546` adds a red focus ring for `input[aria-invalid="true"]:focus`. The `.field-error` element is hidden by default and made visible via `.visible` class (`styles.css:1316–1318`).

#### Criterion 2: Icon-only controls have descriptive labels

⚠️ Partial — Rewrite action buttons carry `aria-pressed="false/true"` and visible text labels ("✓ Accept", "✎ Edit", "✗ Reject") (`bundle.js:14562–14564`). Session table icon buttons have `aria-label` (`bundle.js:19999` and surrounding session render code). Master CV section edit/delete `icon-btn` elements for experiences, education, publications, awards, certifications, achievements, and summaries carry `aria-label="Edit experience: ..."` and `aria-label="Delete experience: ..."` (confirmed in bundle.js master-cv render sections). Bullet-reorder Up/Down buttons carry `aria-label="Move bullet up"` and `aria-label="Move bullet down"` (`workflow-steps.js:533,537`). However, the `skill-chip-del` (remove-skill) buttons inside dynamically-generated skill chips in the Master CV skills editor and skills review panel were not confirmed in the source-first file review to carry `aria-label` attributes — this is a potential gap requiring targeted audit.

#### Criterion 3: Inline edit/review actions have clear focus targets and visible focus states

✅ Pass — `focus-visible` outlines (`outline: 2px solid #3b82f6`) are defined for: `.step` (`styles.css:144`), `.sm-th` (`styles.css:261`), `.sm-btn` (`styles.css:296`), `.q-chip` (`styles.css:509`), `.message-input` (`styles.css:580`), `.action-btn` (`styles.css:594`), `.tab` (`styles.css:641`), `.icon-btn` (`styles.css:1198`), `.rw-btn` (`styles.css:1266`), `.btn-primary/.btn-secondary/.btn-warning` (`styles.css:1312`), and `.preview-output-badge-link` (`styles.css:1401`). Form inputs use `outline: 2px solid #3b82f6` on `:focus` (`styles.css:511, 580, 756, 1441`). CSS `outline: none` is not used without a replacement anywhere in styles.css.

#### Criterion 4: Error and status messages are exposed to assistive technology

✅ Pass — Multiple `aria-live` regions and `role="alert"` elements exist: toast container `aria-live="polite" aria-atomic="true"` (`index.html:284`); LLM busy label `aria-live="polite" role="status"` (`index.html:159`); settings status `aria-live="polite"` (`index.html:585`); onboarding status `aria-live="polite"` (`index.html:382`); model wizard progress `role="status" aria-live="polite"` (`index.html:432`); model auth key status `role="alert"` (`index.html:489`); session conflict banner `role="alert"` (`index.html:111`); job-input field error spans `aria-live="polite"` (`bundle.js:10513,10527`).

---

## Generated Materials Evaluation

— N/A (partially) — Generated DOCX and PDF outputs are binary formats produced server-side; the reviewed source files do not contain tagged-PDF or DOCX heading-style logic. One gap is visible in the UI: the Layout Review iframe is rendered dynamically by `layout-instruction.js`. The iframe element should carry `title="CV layout preview"` per WCAG 2.4.1 (frames must have descriptive titles). This was not confirmed present in the dynamic render code.

---

## Additional Story Gaps / Proposed Story Items

### GAP-A1: Job Analysis modal missing all focus management

`openJobAnalysisModal()` (`bundle.js:6686`) only sets `display="flex"` on the overlay. It does not save prior focus, call `setInitialFocus()`, or call `trapFocus()`. `closeJobAnalysisModal()` (`bundle.js:6700`) only hides the overlay without `restoreFocus()`. The Job Analysis modal is the only named modal in the application with zero focus management.

### GAP-A2: `showAlertModal` does not save prior focus before calling `setInitialFocus`

`showAlertModal()` calls `setInitialFocus('alert-modal-overlay')` (`bundle.js:5996`) without first saving `_focusedElementBeforeModal = document.activeElement`. `closeAlertModal()` calls `restoreFocus()`, which reads the shared `_focusedElementBeforeModal` variable — this variable will contain stale state from the last properly-behaved modal (or null). Alert modal close may return focus to the wrong element.

### GAP-A3: `aria-current` not set during post-layout phases

`updateWorkflowStepsClickable()` (`ui-core.js:1985`) resolves `activeStepId` to `null` when `postLayoutUnlocked` is true, so no step receives `aria-current="step"` during `final_generation` or `refinement` phases. The active workflow position is not programmatically determinable during the post-layout download/finalise/cover-letter/screening flow.

### GAP-A4: Locked workflow step `div` elements have `onclick` but no accessible role

Steps `step-analysis` through `step-harvest` in `index.html:122–142` carry `onclick` handlers in the static HTML but no `role` or `tabindex` until unlocked. Accessibility-tree browsing (not Tab key) will surface these as unidentified clickable `div` elements.

### GAP-A5: Layout Review iframe lacks accessible title

The layout preview rendered by `layout-instruction.js` is an `<iframe>`. WCAG 2.4.1 requires frames to have descriptive titles. The iframe should carry `title="CV layout preview"` (or equivalent) when generated.

### GAP-A6: Skill chip remove-buttons in dynamic renders may lack `aria-label`

Skill chip delete buttons (class `skill-chip-del` / `remove-skill`) are generated dynamically in the Master CV skills editor and skills review panels. The source-first file review did not confirm that every dynamic render path attaches `aria-label="Remove skill: {name}"`. A targeted audit of the chip-render code is needed.

### GAP-A7: `prefers-contrast` media query absent

No `@media (prefers-contrast: more)` adaptation is present. Small muted text instances (e.g. `.ats-score-label` at `color:#64748b` / 11px, `.master-stat-label` at `opacity:0.8` on a blue gradient) may fail WCAG 1.4.3 for users who need enhanced contrast.

### GAP-A8: Single `_focusedElementBeforeModal` variable can be clobbered by nested modal opens

`ui-core.js:30` declares one shared `_focusedElementBeforeModal`. If a sub-modal opens from within a primary modal (e.g. a publication editor opened from the Master CV modal), the outer modal's saved focus is overwritten. On inner-modal close, focus returns to a stale reference, and the outer modal's focus origin is lost.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/workflow-steps.js (bullet-reorder section)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-X1 Workflow nav | 2 | 2 | 0 | 0 | 0 |
| US-X2 Modals | 1 | 3 | 0 | 0 | 0 |
| US-X3 Forms/errors | 2 | 1 | 0 | 0 | 1 |

**Key evidence references:**

| File | Line(s) | Finding |
| --- | --- | --- |
| `index.html` | 120 | Only `step-job` has static `role="button" tabindex="0"` |
| `index.html` | 122–142 | Inactive steps have `onclick` but no `role`/`tabindex` |
| `index.html` | 146–147 | `workflow-stage-announcer` `aria-live="polite" aria-atomic="true"` |
| `index.html` | 203–229 | `role="tablist"`, tabs with `role="tab"` `aria-selected` roving-tabindex |
| `index.html` | 235 | `role="tabpanel" aria-labelledby="tab-job"` — no `aria-live` (correct) |
| `index.html` | 249–715 | All modals: `role="dialog" aria-modal="true" aria-labelledby` |
| `ui-core.js` | 294–331 | `trapFocus()` implementation |
| `ui-core.js` | 274–287 | `setInitialFocus()` implementation |
| `ui-core.js` | 334–347 | `restoreFocus()` implementation |
| `ui-core.js` | 536–553 | Arrow/Home/End tab keyboard navigation |
| `ui-core.js` | 1929–1990 | `_makeStepClickable` / `_makeStepInert` / `aria-current` on active step |
| `ui-core.js` | 1985 | `activeStepId = null` when `postLayoutUnlocked` — no `aria-current` applied |
| `ui-core.js` | 1358–1366 | LLM wizard uses `aria-current="step"` correctly (contrast with steps bar) |
| `workflow-steps.js` | 456–521 | Bullet-reorder modal: `role="dialog"`, `aria-labelledby`, `trapFocus`, `setInitialFocus`, Escape handler |
| `bundle.js` | 6686–6700 | `openJobAnalysisModal` / `closeJobAnalysisModal` — no focus save, trap, or restore |
| `bundle.js` | 5996–5997 | `showAlertModal` calls `setInitialFocus` without saving prior focus |
| `bundle.js` | 7611–7638 | `_openOnboardingFocusTrap` + `closeWelcomeModal` — focus trap and Escape confirmed |
| `bundle.js` | 14562–14564, 14591, 14605 | Rewrite review `aria-pressed` lifecycle |
| `bundle.js` | 10508, 10513, 10524, 10527 | Job-input `aria-describedby` + `aria-live` error spans |
| `bundle.js` | 10868, 10880 | `aria-invalid` set/cleared programmatically |
| `styles.css` | 23–34 | `.sr-only` utility class |
| `styles.css` | 144, 261, 296, 509, 580, 594, 641, 1198, 1266, 1312 | `focus-visible` outlines |
| `styles.css` | 1542–1546 | `input[aria-invalid="true"]:focus` red ring |
| `styles.css` | 1621–1630 | `@media (prefers-reduced-motion: reduce)` — all animations suppressed |
