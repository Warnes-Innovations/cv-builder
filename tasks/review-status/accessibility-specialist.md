<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-06-30 (cycle 8 source-verified re-review, includes GAP-219 fix confirmation)

**Executive Summary:** The application has a strong, deliberately built accessibility
foundation. Focus trapping, roving tabindex on tabs, ARIA roles/labels/live-regions,
reduced-motion accommodation, and `aria-current` on the active workflow step are all
correctly implemented. The GAP-219 fix is **confirmed present** in
`web/ats-modals.js:228–266`: `openJobAnalysisModal()` now saves prior focus to
`_jobAnalysisPreviousFocus`, attaches `_jobAnalysisEscapeHandler`, focuses the Close
button, and calls `trapFocus('job-analysis-modal-overlay')`; `closeJobAnalysisModal()`
restores focus. The previous alert-modal prior-focus gap (GAP-A2) is **still present**:
`showAlertModal()` calls `setInitialFocus()` without saving `_focusedElementBeforeModal`
first. Six other gap items (GAP-A3 through GAP-A8) carry over from the prior cycle
unchanged.

---

## GAP-219 Fix Verification (Critical)

Status: CONFIRMED FIXED

All four elements required for GAP-219 are present in `web/ats-modals.js`:

| Required element | Source evidence |
| --- | --- |
| Prior-focus save to `_jobAnalysisPreviousFocus` | `ats-modals.js:228, 235` |
| `document.addEventListener('keydown', _jobAnalysisEscapeHandler)` | `ats-modals.js:238` |
| Close-button focus (`closeBtn.focus()`) | `ats-modals.js:239–240` |
| `trapFocus('job-analysis-modal-overlay')` | `ats-modals.js:241` |
| Focus restore in `closeJobAnalysisModal()` | `ats-modals.js:258–265` |

The ATS Report modal (`openAtsReportModal()`) at `ats-modals.js:118–154` uses the same
correct pattern (prior-focus save at line 119, escape handler at line 122, close-button
focus at line 125, `trapFocus` at line 126, restore at lines 159–163).

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

#### Criterion 1: Keyboard reach for workflow steps

⚠️ Partial — `step-job` is the only step with static `role="button" tabindex="0"` in
`index.html:120`. All other workflow step `div` elements (`index.html:122–142`) carry
`onclick` but no `role` or `tabindex` in the initial HTML. This is intentionally gated:
`updateWorkflowStepsClickable()` in `ui-core.js:1929–1990` dynamically adds
`role="button"`, `tabindex="0"`, and an Enter/Space keydown handler (`_makeStepClickable`)
as phases unlock, and removes them via `_makeStepInert` when re-locking. The
progressive-disclosure pattern is architecturally correct. However, locked steps that are
not yet clickable still expose `onclick` attributes in the DOM, which means
accessibility-tree browsing (not Tab key) will surface them as unidentified clickable
`div` elements without a role to signal intent.

#### Criterion 2: Stage tabs expose correct tab semantics

✅ Pass — `index.html:203` declares `role="tablist" aria-label="Application workflow tabs"`
on `#tab-bar`. Every tab `div` carries `role="tab"`, `aria-selected="true/false"`,
`aria-controls="document-content"`, and roving `tabindex` (`index.html:204–229`). The
single tabpanel `#document-content` has `role="tabpanel" aria-labelledby="tab-job"`
(`index.html:235`; the `aria-labelledby` pointer is updated to `tab-{tab}` by
`switchTab()` — confirmed at `review-table-base.js:133` and `bundle.js:3476`). Arrow
Left/Right/Home/End navigation is implemented in `ui-core.js:536–553`. Enter/Space
activates the focused tab (`ui-core.js:530–533`).

#### Criterion 3: Active and completed states conveyed beyond colour

⚠️ Partial — `updateWorkflowStepsClickable()` in `ui-core.js:1979–1988` sets
`aria-current="step"` on the active sequential step and removes it from all others. This
is correct for pre-layout phases. However, when `postLayoutUnlocked` is true (phases
`final_generation` or `refinement`), the active step variable resolves to `null`
(`ui-core.js:1985`) and no `aria-current` is applied to any step — the active workflow
position is undetectable non-visually during the post-layout phase. The `.active`,
`.completed`, `.upcoming`, `.stale`, `.stale-critical` CSS classes (`styles.css:151–157`)
convey state by colour only; no supplementary text label, icon text node, or `aria-label`
conveys meaning without colour.

#### Criterion 4: Changes in active stage or tab are announced

✅ Pass — `index.html:146–147` declares a visually-hidden `aria-live="polite"
aria-atomic="true"` region (`#workflow-stage-announcer`). In `bundle.js:3482–3486`,
`switchTab()` populates this region with `"Now viewing: {tab label}"` on every switch
using the `textContent = ""; setTimeout(() => ..., 50)` double-write pattern that forces
screen-reader re-announcement even when the same tab is re-selected.

---

### US-X2: Modal and Dialog Accessibility

#### Criterion 1: Opening a modal moves focus into it

⚠️ Partial — The following modals correctly save prior focus and call `setInitialFocus()`
or focus a specific control on open:

- Settings: `ui-core.js:239–247`
- Model config wizard: `ui-core.js:1499–1523`
- Master CV: `bundle.js:17990–17999`
- Sessions: `bundle.js:20087–20100`
- Ownership conflict: `bundle.js:19829–19855`
- Alert: `bundle.js:5991–5997`
- Confirm: `bundle.js:6008–6016` (focuses OK button directly)
- Onboarding/welcome: `bundle.js:7627–7629`
- ATS Report: `ats-modals.js:119, 122–126`
- Job Analysis: `ats-modals.js:235, 238–241` **(GAP-219 fixed)**
- Bullet-reorder: `bundle.js:4391–4392`
- Rerun confirm: `bundle.js:4118–4119`

Remaining gap: `showAlertModal()` (`bundle.js:5991`) calls `setInitialFocus()` at line
5996 without first executing `_alertPreviousFocus = document.activeElement` — that save
happens at line 5992, but the shared variable used by `restoreFocus()` in `ui-core.js`
(`_focusedElementBeforeModal`) is not updated. The alert close path uses its own
`_alertPreviousFocus` variable (`bundle.js:5990, 6001–6004`), which is correctly saved —
so alert modal focus restore is actually correct via its own path. Re-evaluated: the alert
modal manages focus correctly through its own private `_alertPreviousFocus` variable.

Revised status for this criterion: ✅ Pass — all named modals now save prior focus and
move focus on open.

#### Criterion 2: Focus is trapped inside the modal while it is open

✅ Pass — `trapFocus()` (`ui-core.js:294–331`) is called by: settings, model wizard,
master CV, sessions, ownership conflict, ATS report, job analysis **(GAP-219 fixed)**,
bullet-reorder, and rerun-confirm modals. The onboarding/welcome modal uses
`_openOnboardingFocusTrap()` which calls `globalThis.trapFocus()`. The `confirmDialog()`
utility has its own inline Tab trap (`ui-core.js:412–423`). All named modals have focus
trapping.

#### Criterion 3: Closing a modal restores focus to the triggering control

✅ Pass — All modal close paths restore focus:

- Settings/model/master-CV/sessions/ownership-conflict/ATS-report: call `restoreFocus()`
  from `ui-core.js:334–347`
- Job Analysis: `ats-modals.js:262–265` uses its own `_jobAnalysisPreviousFocus` variable
  **(GAP-219 fixed)**
- Alert: `bundle.js:6001–6004` uses `_alertPreviousFocus` private variable (correct)
- Confirm: `bundle.js:6023` calls `restoreFocus()`
- Bullet-reorder: calls `restoreFocus()` from close button onclick and Escape handler
- Onboarding: `bundle.js:7637–7646` calls `globalThis.restoreFocus()`

#### Criterion 4: Dialog title and purpose are programmatically exposed

✅ Pass — All modals in `index.html` carry `role="dialog" aria-modal="true"
aria-labelledby` pointing to an `h2` child: sessions (line 249), master-cv (line 271),
alert (line 287), confirm (line 302), onboarding (line 319), ownership-conflict (line
401), model-config (line 418), settings (line 578), ats-report (line 689), job-analysis
(line 705). The `confirmDialog()` utility sets `role="dialog" aria-modal="true"
aria-labelledby="confirm-dialog-msg"` (`ui-core.js:385–386`). The bullet-reorder modal
sets `role="dialog" aria-modal="true" aria-labelledby="bullet-reorder-title"`
(`bundle.js:4352–4354`).

---

### US-X3: Forms, Errors, and Review Controls

#### Criterion 1: Inputs with validation errors expose those errors via accessible associations

✅ Pass — Job Input paste textarea: `aria-describedby="paste-char-count paste-error"` and
`<span id="paste-error" aria-live="polite">` (`bundle.js:10508, 10513`). URL input:
`aria-describedby="url-error"` and `<span id="url-error" aria-live="polite">`
(`bundle.js:10524, 10527`). File upload: `aria-describedby="file-upload-error"`
(`bundle.js:10557`). `aria-invalid="true"` is set programmatically on validation failure
(`bundle.js:10868`) and cleared on fix (`bundle.js:10880`). `styles.css:1542–1546` adds
a red focus ring for `input[aria-invalid="true"]:focus`. The `.field-error` element is
hidden by default and made visible via `.visible` class.

#### Criterion 2: Icon-only controls have descriptive labels

⚠️ Partial — Rewrite action buttons carry `aria-pressed="false/true"` state and visible
text labels (`bundle.js:14578–14580`, `14594, 14607, 14621`). Experience/skill/achievement
icon buttons carry contextual `aria-label` values (e.g. `"Emphasize {title}"`,
`"Move {title} earlier in CV"`, `"Reorder bullets for {title}"`)
(`bundle.js:11834–11840, 12285–12286, 12573–12578, 13033–13040`). Bullet-reorder Up/Down
buttons have `aria-label` (`bundle.js:4373`). Provider info `ⓘ` button has
`aria-label="Provider info"` (`ui-core.js:1286`). Session table action buttons have
`aria-label` values in the sessions render code.

Remaining gap: The `icon-btn` active state (conveyed by the `.active` CSS class
`styles.css:1190–1196`) is not accompanied by `aria-pressed` on these toggle buttons.
When a user sets an experience to "emphasize" via `handleActionClick2()`, the `.active`
class is toggled (`bundle.js:3901–3903`) but `aria-pressed` is not updated. Screen
readers cannot detect which action is currently selected for each experience or skill row.
This differs from the rewrite-review buttons (which correctly manage `aria-pressed`).

#### Criterion 3: Inline edit/review actions have clear focus targets and visible focus states

✅ Pass — `focus-visible` outlines (`outline: 2px solid #3b82f6`) are defined for:
`.step` (`styles.css:144`), `.sm-th` (`styles.css:261`), `.sm-btn` (`styles.css:296`),
`.q-chip` (`styles.css:509`), `.message-input` (`styles.css:580`), `.action-btn`
(`styles.css:594`), `.tab` (`styles.css:641`), `.icon-btn` (`styles.css:1198`),
`.rw-btn` (`styles.css:1266`), `.btn-primary/.btn-secondary/.btn-warning`
(`styles.css:1312`), and `.preview-output-badge-link` (`styles.css:1401`). Form inputs
have `outline: 2px solid #3b82f6` on `:focus`. `outline: none` is not used without a
replacement anywhere in styles.css.

#### Criterion 4: Error and status messages are exposed to assistive technology

✅ Pass — `aria-live` regions and `role="alert"` elements exist: toast container
`aria-live="polite" aria-atomic="true"` (`index.html:284`); LLM busy label
`aria-live="polite" role="status"` (`index.html:159`); settings status
`aria-live="polite"` (`index.html:585`); onboarding status `aria-live="polite"`
(`index.html:382`); model wizard progress `role="status" aria-live="polite"`
(`index.html:432`); model auth key status `role="alert"` (`index.html:489`); session
conflict banner `role="alert"` (`index.html:111`); job-input field error spans
`aria-live="polite"` (`bundle.js:10513, 10527`).

---

## Additional Accessibility Properties (not in user stories)

### Reduced-motion support

✅ Pass — `styles.css:1621–1630` contains `@media (prefers-reduced-motion: reduce)` that
suppresses all animations and transitions globally via `animation-duration: 0.01ms !important`,
`animation-iteration-count: 1 !important`, and `transition-duration: 0.01ms !important`.
Covers the stale-chip-pulse, browsing-pulse, changed-item-pulse, and loading-spinner
animations.

### Screen reader compatibility

✅ Pass — Emoji icons in workflow steps and tab labels use `<span
aria-hidden="true">…</span>` wrappers throughout (`index.html:120–142`,
`index.html:204–229`, `index.html:192–194`). The `.sr-only` utility class is defined in
`styles.css:23–34`. LLM busy overlay spinner has `aria-hidden="true"` (`index.html:427`).
Model wizard progress step connectors have `aria-hidden="true"` (`index.html:436, 441,
446`). The `#llm-non-confidential-badge` tooltip content is available via the `title`
attribute.

---

## Generated Materials Evaluation

— N/A (partially) — Generated DOCX and PDF outputs are binary formats produced
server-side; the reviewed source files do not contain tagged-PDF or DOCX
heading-style logic. The Layout Review iframe is rendered dynamically by
`layout-instruction.js`. The iframe element should carry `title="CV layout preview"` per
WCAG 2.4.1. This was not confirmed present in the source-first file review (GAP-A5).

---

## Remaining Gap Items

### GAP-A3: `aria-current` not set during post-layout phases

`updateWorkflowStepsClickable()` (`ui-core.js:1985`) resolves `activeStepId` to `null`
when `postLayoutUnlocked` is true, so no step receives `aria-current="step"` during
`final_generation` or `refinement` phases. The active workflow position is not
programmatically determinable during the post-layout download/finalise/cover-letter/
screening flow.

### GAP-A4: Locked workflow step `div` elements have `onclick` but no accessible role

Steps `step-analysis` through `step-harvest` in `index.html:122–142` carry `onclick`
handlers in the static HTML but no `role` or `tabindex` until unlocked. Accessibility-tree
browsing will surface these as unidentified clickable `div` elements.

### GAP-A5: Layout Review iframe lacks accessible title

The layout preview `<iframe>` generated by `layout-instruction.js` should carry
`title="CV layout preview"` per WCAG 2.4.1. Not confirmed present in the source.

### GAP-A6: Experience/skill `icon-btn` active state not reflected via `aria-pressed`

When `handleActionClick2()` toggles the `.active` class on experience/skill icon buttons
(`bundle.js:3901–3903`), `aria-pressed` is not updated. Screen readers cannot determine
which action (emphasize/include/de-emphasize/exclude) is currently selected. The
rewrite-review `.rw-btn` buttons correctly manage `aria-pressed` — this gap is
inconsistent with that established pattern.

### GAP-A7: `prefers-contrast` media query absent

No `@media (prefers-contrast: more)` adaptation is present. Small muted text instances
(e.g. `.ats-score-label` at `color:#64748b` / 11px, `.ats-score-summary-line` at 12px)
may fail WCAG 1.4.3 for users who need enhanced contrast and request it via OS settings.

### GAP-A8: Single `_focusedElementBeforeModal` variable can be clobbered by nested modal opens

`ui-core.js:30` declares one shared `_focusedElementBeforeModal`. If a sub-modal opens
from within a primary modal (e.g. a publication editor opened from the Master CV modal),
the outer modal's saved focus is overwritten. On inner-modal close, focus returns to a
stale reference and the outer modal's focus origin is lost. The ATS report and job
analysis modals use their own private variables to avoid this; the pattern should be
applied consistently.

---

## Scorecard

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-X1 Workflow nav | 2 | 2 | 0 | 0 | 0 |
| US-X2 Modals | 4 | 0 | 0 | 0 | 0 |
| US-X3 Forms/errors | 3 | 1 | 0 | 0 | 1 |

US-X2 upgraded to 4 Pass / 0 Partial after GAP-219 fix confirmed.

---

## Key Evidence References

| File | Line(s) | Finding |
| --- | --- | --- |
| `ats-modals.js` | 228–266 | GAP-219 fix: `_jobAnalysisPreviousFocus`, escape handler, close-btn focus, `trapFocus`, focus restore — all confirmed |
| `ats-modals.js` | 108–163 | ATS Report modal: same full pattern |
| `index.html` | 120 | Only `step-job` has static `role="button" tabindex="0"` |
| `index.html` | 122–142 | Inactive steps have `onclick` but no `role`/`tabindex` |
| `index.html` | 146–147 | `workflow-stage-announcer` `aria-live="polite" aria-atomic="true"` |
| `index.html` | 203–229 | `role="tablist"`, tabs with `role="tab"` `aria-selected` roving-tabindex |
| `index.html` | 235 | `role="tabpanel" aria-labelledby="tab-job"` |
| `index.html` | 249–715 | All modals: `role="dialog" aria-modal="true" aria-labelledby` |
| `ui-core.js` | 294–331 | `trapFocus()` implementation |
| `ui-core.js` | 274–287 | `setInitialFocus()` implementation |
| `ui-core.js` | 334–347 | `restoreFocus()` implementation |
| `ui-core.js` | 536–553 | Arrow/Home/End tab keyboard navigation |
| `ui-core.js` | 1929–1990 | `_makeStepClickable` / `_makeStepInert` / `aria-current` on active step |
| `ui-core.js` | 1985 | `activeStepId = null` when `postLayoutUnlocked` — no `aria-current` (GAP-A3) |
| `bundle.js` | 3901–3903 | `icon-btn` `.active` class toggled without `aria-pressed` update (GAP-A6) |
| `bundle.js` | 5990–6004 | Alert modal: `_alertPreviousFocus` private variable — focus save/restore correct |
| `bundle.js` | 7627–7646 | Onboarding: `_openOnboardingFocusTrap` + `closeWelcomeModal` — focus trap and restore confirmed |
| `bundle.js` | 14578–14580, 14594, 14607, 14621 | Rewrite review `aria-pressed` lifecycle (correctly implemented — contrast with GAP-A6) |
| `bundle.js` | 10508, 10513, 10524, 10527 | Job-input `aria-describedby` + `aria-live` error spans |
| `bundle.js` | 10868, 10880 | `aria-invalid` set/cleared programmatically |
| `styles.css` | 23–34 | `.sr-only` utility class |
| `styles.css` | 144, 261, 296, 509, 580, 594, 641, 1198, 1266, 1312 | `focus-visible` outlines |
| `styles.css` | 1542–1546 | `input[aria-invalid="true"]:focus` red ring |
| `styles.css` | 1621–1630 | `@media (prefers-reduced-motion: reduce)` — all animations suppressed |
