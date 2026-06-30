<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review

**Last Updated:** 2026-06-29 23:00 ET
**Reviewer:** Accessibility Specialist persona
**Branch:** feature/multi-user-deployment
**Scope:** Application UI accessibility (WCAG 2.1 AA) — not generated document content

---

## Executive Summary

The application has a strong accessibility foundation — focus trapping, roving tabindex, ARIA roles, and screen-reader live regions are implemented thoughtfully across most of the codebase. Several specific gaps remain that prevent full WCAG 2.1 AA compliance: inactive workflow step elements remain keyboard-reachable before they are unlocked (onclick without role/tabindex correction on initial load), the `document-content` tabpanel simultaneously carries `aria-live="polite"` causing potential double-announcement noise, the onboarding/welcome modal has no focus trap and no Escape handler, `showAlertModal` does not save prior focus before opening (so `restoreFocus()` restores nothing), and `aria-current` is missing on the active workflow step pill. No `prefers-reduced-motion` or `prefers-contrast` media queries are present. These are fixable gaps in an otherwise well-structured implementation.

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

#### Criterion 1: Workflow-step elements are reachable and operable by keyboard where interaction is supported.

⚠️ Partial — The first workflow step (`step-job`) has `role="button"` and `tabindex="0"` in the static HTML (`index.html:120`). All inactive steps (`step-analysis`, `step-customizations`, etc.) have **no `role` and no `tabindex`** in the initial HTML (`index.html:122–140`), so they are not keyboard reachable at page load — which is correct behavior (they unlock as the user progresses). The dynamic `updateWorkflowStepsClickable()` function in `ui-core.js:1929–1954` adds `role="button"`, `tabindex="0"`, and a keydown handler (Enter/Space) when unlocking a step, and removes them when locking. This is a correct progressive-disclosure pattern. However, inactive locked steps that have no `role` still have `onclick` handlers in the static HTML (`index.html:122`) — if a screen reader user navigates by element rather than by tab, those clickable divs are discoverable but unlabeled as interactive.

#### Criterion 2: Stage tabs expose correct tab semantics, selected state, and panel association.

✅ Pass — Tab elements use `role="tab"`, `aria-selected="true/false"`, and `tabindex="0/-1"` (roving tabindex) in the static HTML (`index.html:204–230`). The tablist container has `role="tablist"` and `aria-label="Application workflow tabs"` (`index.html:203`). `switchTab()` in `review-table-base.js:122–133` correctly updates `aria-selected` and `tabindex` on all tabs and updates `aria-labelledby` on the tabpanel. Arrow key navigation (Left/Right/Home/End) is wired in `ui-core.js:536–553`.

#### Criterion 3: Active and completed states are conveyed by more than colour alone.

⚠️ Partial — Workflow step state classes (`active`, `completed`, `upcoming`, `stale`, `stale-critical`) are defined in `styles.css:151–157`. The active step gets `background:#dbeafe; color:#1d4ed8` (blue) and the completed step gets `background:#dcfce7; color:#166534` (green). These are colour-differentiated but no text label or icon distinguishes "active" from "upcoming" for screen readers beyond what the announcer provides. Step status (active vs. completed vs. upcoming) is conveyed only by CSS class colour, with no `aria-current` attribute or text supplement added to the step `div` to encode the status programmatically. Note: the LLM wizard progress bar does correctly use `aria-current="step"` (`ui-core.js:1362`), making this inconsistency visible.

#### Criterion 4: Changes in active stage or tab are announced.

✅ Pass — A visually-hidden `aria-live="polite" aria-atomic="true"` region exists at `index.html:146–147`. `switchTab()` in `review-table-base.js:138–141` populates it with `"Now viewing: {tab label}"` on each tab switch. The 50ms `setTimeout` re-trigger pattern correctly forces screen reader re-announcement even when switching to the same tab.

---

### US-X2: Modal and Dialog Accessibility

#### Criterion 1: Opening a modal moves focus into it.

✅ Pass (mostly) — `openSettingsModal()` (`ui-core.js:239–247`), `openModelModal()` (`ui-core.js:1499–1523`), `openMasterCvModal()` (`master-cv.js:2475–2485`), `openSessionsModal()` (`session-switcher-ui.js:481–494`), `openOwnershipConflictDialog()` (`session-switcher-ui.js:185–187`), and publication/achievement/summary sub-modals in `master-cv.js` all call `setInitialFocus()`. `setInitialFocus()` targets `[data-focus-target="true"]`, then `input[type="text"]`, then `button` (`ui-core.js:279–286`). The `showAlertModal()` function in `ui-helpers.js:31–37` calls `setInitialFocus('alert-modal-overlay')` but does **not** first save `_focusedElementBeforeModal = document.activeElement` before the call, so the subsequent `restoreFocus()` call will restore nothing. `showConfirmModal()` at `ui-helpers.js:51–60` correctly saves `_confirmPreviousFocus` before focusing the OK button.

#### Criterion 2: Focus is trapped inside the modal while it is open.

⚠️ Partial — `trapFocus()` in `ui-core.js:294–331` wraps Tab/Shift+Tab to cycle between first and last focusable elements. It is called from every primary modal open function. The `confirmDialog()` utility (`ui-core.js:372–444`) has its own inline Tab trap. The **onboarding/welcome modal** (`onboarding-modal-overlay`) opened by `maybeShowWelcomeModal()` in `session-manager.js:172–195` and `showOnboardingModal()` at line 157 do **not** call `trapFocus()` or `setInitialFocus()` — focus is not trapped inside this modal and keyboard users can tab to background content.

#### Criterion 3: Closing a modal restores focus to the triggering control.

⚠️ Partial — `closeSettingsModal()`, `closeModelModal()`, `closeMasterCvModal()`, `closeSessionsModal()`, `closeOwnershipConflictDialog()`, and sub-modal closers in `master-cv.js` all call `restoreFocus()`. `showConfirmModal()` saves `_confirmPreviousFocus` and `closeConfirmModal()` restores it (`ui-helpers.js:63–71`). The `closeAlertModal()` calls `restoreFocus()` but since `showAlertModal()` never saved `_focusedElementBeforeModal`, the shared variable holds stale state from the last modal that did save it — alert modal close may return focus to the wrong element. The welcome modal `closeWelcomeModal()` (`session-manager.js:201–208`) does not call `restoreFocus()` at all.

#### Criterion 4: Dialog title and purpose are programmatically exposed.

✅ Pass — All modals in `index.html` have `role="dialog" aria-modal="true"` and `aria-labelledby` pointing to an `h2` heading element (sessions: line 249, master-cv: 271, alert: 287, confirm: 302, onboarding: 319, ownership: 401, model: 418, settings: 578, ats-report: 689, job-analysis: 705). The `confirmDialog()` utility also sets `role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-msg"` (`ui-core.js:385–386`).

---

### US-X3: Forms, Errors, and Review Controls

#### Criterion 1: Inputs with validation errors expose those errors via accessible associations.

✅ Pass — In `job-input.js`, the paste textarea uses `aria-describedby="paste-char-count paste-error"` (line 116), and `<span id="paste-error" class="field-error" aria-live="polite">` (line 121) announces inline. The URL input uses `aria-describedby="url-error"` (line 132) with `<span id="url-error" class="field-error" aria-live="polite">` (line 135). The file upload uses `aria-describedby="file-upload-error"` (line 165). `aria-invalid="true"` is set programmatically on error (`job-input.js:556`) and cleared on fix (line 566). CSS rule `input[aria-invalid="true"]:focus` adds a red ring (`styles.css:1542–1546`). The `.field-error` class is hidden by default and made visible via `.visible` toggle (`styles.css:1316–1318`).

#### Criterion 2: Icon-only controls have descriptive labels.

⚠️ Partial — Rewrite review action buttons have `aria-pressed` and visible text labels ("✓ Accept", "✎ Edit", "✗ Reject") (`rewrite-review.js:328–330`). Skills review icon buttons have explicit `aria-label` attributes (`skills-review.js:423–424`, `768–773`). Session table icon buttons have `aria-label` (`session-switcher-ui.js:342–344`, `389`). Master CV section `icon-btn` elements for edit/delete on experiences, education, publications, awards, certifications, achievements, and summaries have `aria-label="Edit experience: ..."` and `aria-label="Delete experience: ..."` attributes (`master-cv.js:855–858`). The `skill-chip-del` / `remove-skill` buttons within dynamically-generated skill chips in the Master CV skills editor were not confirmed in the reviewed source to always include an `aria-label` — this requires verification.

#### Criterion 3: Inline edit/review actions have clear focus targets and visible focus states.

✅ Pass — `icon-btn:focus-visible`, `rw-btn:focus-visible`, `action-btn:focus-visible`, `tab:focus-visible`, `step:focus-visible`, `q-chip:focus-visible`, `sm-btn:focus-visible`, `btn-primary:focus-visible`, `.message-input:focus`, `.form-input:focus`, `.layout-instruction-textarea:focus`, `.question-item .q-input:focus` — all have explicit `outline: 2px solid #3b82f6` with `outline-offset` (`styles.css:144, 261, 296, 509, 511, 580, 594, 641, 756, 1198, 1266, 1312`).

#### Criterion 4: Error and status messages are exposed to assistive tech.

✅ Pass — Field-level errors use `aria-live="polite"` spans. The toast container uses `aria-live="polite" aria-atomic="true"` (`index.html:284`). The LLM busy label uses `aria-live="polite" role="status"` (`index.html:159`). The settings status uses `aria-live="polite"` (`index.html:585`). The onboarding status uses `aria-live="polite"` (`index.html:382`). The model auth key status uses `role="alert"` (`index.html:489`). The session conflict banner uses `role="alert"` (`index.html:111`).

---

## Generated Materials Evaluation

This persona's scope covers accessibility-relevant qualities of generated CV output materials (readability, structure, contrast) as well as the UI workflow used to review and customise them.

— N/A (mostly) — The generated DOCX and PDF outputs are binary formats produced server-side by Python scripts. The source files reviewed do not contain accessible PDF/DOCX generation logic (no tagged PDF, no DOCX heading styles in scope). The in-browser preview tab (`tab-layout`) displays an iframe of generated HTML.

One findable gap: the Layout Review tab iframe is created dynamically by `layout-instruction.js`. The static `index.html` does not declare an iframe element with a `title` attribute for the layout preview — WCAG 2.4.1 requires frames to have descriptive titles. This should be `title="CV layout preview"` in the rendered iframe element.

---

## Additional Accessibility Gaps Not in Story File

### GAP-A1: `document-content` tabpanel carries `aria-live="polite"` — double announcement risk
`index.html:235` declares `role="tabpanel" aria-live="polite"` on the same element. A tabpanel should not also be a live region; content replacement inside a live region causes everything injected by `loadTabContent()` to be announced verbatim by screen readers, which for large dynamic sections (e.g., the experience review table) produces extremely verbose and disorienting output. Recommendation: remove `aria-live="polite"` from `#document-content` and rely solely on the `workflow-stage-announcer` live region for navigation context.

### GAP-A2: Onboarding/welcome modal has no focus trap and no Escape handler
`maybeShowWelcomeModal()` shows `#onboarding-modal-overlay` but calls neither `trapFocus()` nor `setInitialFocus()` nor installs an Escape handler (`session-manager.js:172–195`). Keyboard users can tab behind the modal to the main page content while it is open.

### GAP-A3: `showAlertModal` does not save prior focus before opening
`ui-helpers.js:31–37` opens the alert modal without executing `_focusedElementBeforeModal = document.activeElement`. The single shared variable in `ui-core.js:30` will contain either `null` or stale focus from the last modal that properly saved it. `closeAlertModal()` consequently restores focus to the wrong element or to nothing.

### GAP-A4: Workflow step status communicated only by colour; no `aria-current` or text supplement
`styles.css:151–157` defines `active`, `completed`, `upcoming`, `stale`, `stale-critical` classes for workflow step pills. No `aria-current="step"` is set on the active workflow pill (unlike the LLM wizard progress steps which correctly use `aria-current="step"` at `ui-core.js:1362`). Screen readers cannot distinguish the application's current workflow phase from other phases without colour perception.

### GAP-A5: Inactive step `div` elements have `onclick` but no `role` or `tabindex`
Steps like `step-analysis` to `step-harvest` in `index.html:122–142` have `onclick="handleStepClick(...)"` in the static HTML but no `role="button"` and no `tabindex`. They are not keyboard-reachable (correct while locked), but users exploring the page structure via accessibility tree will encounter anonymous clickable `div` elements without any role to indicate their purpose.

### GAP-A6: No `prefers-reduced-motion` media query
`styles.css` contains several animations: `browsing-pulse`, `stale-chip-pulse`, `changed-item-pulse`, `step-pulse`, `llm-spin`, `llm-busy-spinner spin`, `dots`. None are wrapped in `@media (prefers-reduced-motion: reduce)` guards. Users with vestibular disorders or motion sensitivity receive no accommodation.

### GAP-A7: Review sub-tabs (`review-subtabs`) ARIA semantics unconfirmed
The `review-subtabs` scrollable tab strip used in experience/skills/achievements review panels (`styles.css:657–683`) is dynamically generated. If these sub-tabs lack `role="tablist"` / `role="tab"` / `aria-selected` semantics and are only `button` elements with a visual active class, they are not announced as a tab widget. The sub-tab HTML generation source was not fully reviewed and should be audited.

### GAP-A8: Layout Review iframe has no accessible title
The Layout Review content is rendered in an `<iframe>`. WCAG 2.4.1 requires frames to have descriptive titles. The iframe should include `title="CV layout preview"` or equivalent when rendered by `layout-instruction.js`.

### GAP-A9: Single `_focusedElementBeforeModal` variable can be clobbered by nested modal opens
`ui-core.js:30` declares one shared `_focusedElementBeforeModal` variable. If a sub-modal opens from within a primary modal (e.g., a publication editor opened from within the Master CV modal), the outer modal's saved focus reference is overwritten. On close of the inner modal, focus returns to the outer modal's first input (not the triggering button within the outer modal), and the outer modal's saved reference is now gone.

### GAP-A10: No `prefers-contrast` media query
The application uses a number of low-contrast small text instances (e.g., `.ats-score-label` at `color:#64748b` on white `#f8fafc` — approximately 4.5:1 at 11px which may fail WCAG 1.4.3 for small text). No `@media (prefers-contrast: more)` adaptation is present.

---

## Reviewed Against

- `/Users/warnes/src/cv-builder/tasks/user-story-accessibility-specialist.md`
- `/Users/warnes/src/cv-builder/web/index.html`
- `/Users/warnes/src/cv-builder/web/app.js`
- `/Users/warnes/src/cv-builder/web/ui-core.js`
- `/Users/warnes/src/cv-builder/web/state-manager.js`
- `/Users/warnes/src/cv-builder/web/styles.css`
- `/Users/warnes/src/cv-builder/scripts/web_app.py` (landmark scan only)
- `/Users/warnes/src/cv-builder/scripts/utils/conversation_manager.py` (landmark scan only)
- Supporting: `review-table-base.js`, `session-switcher-ui.js`, `session-manager.js`, `master-cv.js`, `ui-helpers.js`, `rewrite-review.js`, `skills-review.js`, `job-input.js`

---

## Summary Table

| Criterion | Status | Key Finding |
|---|---|---|
| US-X1.1 Keyboard reach for workflow steps | ⚠️ Partial | Inactive steps have `onclick` but no keyboard semantics until unlocked; `updateWorkflowStepsClickable` adds them dynamically |
| US-X1.2 Tab semantics (role, selected, panel) | ✅ Pass | `role="tab"`, `aria-selected`, roving tabindex, `role="tablist"` all present |
| US-X1.3 State conveyed beyond colour | ⚠️ Partial | Workflow step status (active/completed/upcoming) colour-only; no `aria-current` on active step |
| US-X1.4 Stage/tab changes announced | ✅ Pass | `workflow-stage-announcer` live region updated on every `switchTab()` call |
| US-X2.1 Focus moves into modal on open | ✅ Pass | `setInitialFocus()` called from all primary modal openers; alert modal missing prior-focus save |
| US-X2.2 Focus trapped inside open modal | ⚠️ Partial | `trapFocus()` present for all primary modals; welcome/onboarding modal has no trap |
| US-X2.3 Focus restored to trigger on close | ⚠️ Partial | `restoreFocus()` present for named modals; alert modal restores wrong/null; welcome modal skips entirely |
| US-X2.4 Dialog title/purpose exposed | ✅ Pass | All modals: `role="dialog" aria-modal="true" aria-labelledby` pointing to `h2` |
| US-X3.1 Validation errors accessible | ✅ Pass | `aria-describedby` + `aria-live` spans + `aria-invalid` pattern in job-input |
| US-X3.2 Icon-only controls labelled | ⚠️ Partial | Review and session icon buttons have `aria-label`; skill chip delete buttons unconfirmed |
| US-X3.3 Focus targets and visible focus states | ✅ Pass | `focus-visible` outline on all interactive classes |
| US-X3.4 Status/error messages announced | ✅ Pass | Multiple `aria-live` regions and `role="alert"` in use |
| Generated materials a11y | — N/A | Binary output formats; iframe title gap identified |

---

## Key Evidence References

| File | Line(s) | Finding |
|---|---|---|
| `index.html` | 120 | Only `step-job` has static `role="button" tabindex="0"` |
| `index.html` | 122–142 | Inactive steps have `onclick` but no `role`/`tabindex` |
| `index.html` | 146–147 | `workflow-stage-announcer` aria-live region |
| `index.html` | 203–230 | Tablist with `role="tablist"`, tabs with `role="tab"` |
| `index.html` | 235 | `role="tabpanel" aria-live="polite"` — problematic combination |
| `index.html` | 249–715 | All modals have `role="dialog" aria-modal="true" aria-labelledby` |
| `ui-core.js` | 294–331 | `trapFocus()` implementation |
| `ui-core.js` | 274–287 | `setInitialFocus()` implementation |
| `ui-core.js` | 334–347 | `restoreFocus()` implementation |
| `ui-core.js` | 1929–1954 | Dynamic `_makeStepClickable()` / `_makeStepInert()` |
| `ui-core.js` | 1358–1366 | Wizard progress uses `aria-current="step"` correctly |
| `ui-core.js` | 536–553 | Arrow/Home/End key navigation for tabs |
| `review-table-base.js` | 122–141 | `switchTab()` sets `aria-selected`, updates announcer |
| `ui-helpers.js` | 31–37 | `showAlertModal` — no prior-focus save before `setInitialFocus` |
| `ui-helpers.js` | 51–60 | `showConfirmModal` — correctly saves `_confirmPreviousFocus` |
| `session-manager.js` | 172–195 | `maybeShowWelcomeModal` — no `trapFocus` or `setInitialFocus` |
| `session-manager.js` | 201–208 | `closeWelcomeModal` — no `restoreFocus` |
| `styles.css` | 23–34 | `.sr-only` utility class present |
| `styles.css` | 144, 641, 594, 1198, 1266 | `focus-visible` outlines on key interactive classes |
| `styles.css` | 1542–1546 | `input[aria-invalid="true"]:focus` red ring |
| `job-input.js` | 116, 121, 132, 135 | `aria-describedby` + `aria-live` error spans |
| `rewrite-review.js` | 328–330, 364, 382 | `aria-pressed` on accept/edit/reject buttons |
| `skills-review.js` | 768–773 | `aria-label` on all icon-btn skill actions |
