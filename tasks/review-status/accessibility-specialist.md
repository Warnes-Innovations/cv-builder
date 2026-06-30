<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-06-30 (cycle 12 source-first re-review)

**Executive Summary:** The application has a strong, deliberately built accessibility
foundation. Focus trapping, roving tabindex on tabs, ARIA roles/labels/live-regions,
reduced-motion accommodation, and `aria-current` on the active workflow step are all
correctly implemented. The four recent changes (GAP-219 resolved, help button, ATS grade
legend, finalise notes `maxlength`) are confirmed present in the source. The ATS grade
legend colored-dot text lacks `aria-hidden` on the decorative dots, but the text labels
alongside them are sufficient for screen readers. Six carry-over gaps from prior cycles
(GAP-A3 through GAP-A8) remain unchanged.

---

## Recent Changes Verification (Cycle 12)

### GAP-219: openJobAnalysisModal() focus management

Status: CONFIRMED RESOLVED

All required elements present in `web/ats-modals.js:228–266`:

| Required element | Source evidence |
| --- | --- |
| Prior-focus save to `_jobAnalysisPreviousFocus` | `ats-modals.js:233` |
| Escape handler attach | `ats-modals.js:238` |
| Close-button focus (`closeBtn.focus()`) | `ats-modals.js:244–245` |
| `trapFocus('job-analysis-modal-overlay')` | `ats-modals.js:246` |
| Focus restore in `closeJobAnalysisModal()` | `ats-modals.js:263–270` |

The ATS Report modal (`openAtsReportModal()`, lines 118–163) uses the same correct
pattern: prior-focus save at line 108 (`_atsModalPreviousFocus`), escape handler at
line 122, close-button focus at line 125, `trapFocus` at line 126, restore at
lines 159–163.

### Help button (index.html near line 63)

Status: CONFIRMED PRESENT

`index.html:63–66` contains:

```html
<button id="help-btn" onclick="showWelcomeModal()"
  class="header-pill-btn"
  title="Reopen the getting-started guide"
  aria-label="Help — reopen getting started guide">? Help</button>
```

The `aria-label` is present and descriptive. The button is in the header alongside
other pill buttons that expose their purpose. The `aria-label` overrides the "? Help"
text content for screen readers, providing a clearer description.

### ATS score report grade legend in `_renderAtsReport()`

Status: CONFIRMED PRESENT — minor accessibility note

`ats-modals.js:204–207` adds an inline legend below the score breakdown:

```html
<div style="font-size:0.75em;color:#94a3b8;margin-top:4px;" title="Score thresholds">
  <span style="color:#10b981;">●</span> ≥75% Strong match &nbsp;
  <span style="color:#f59e0b;">●</span> 50–74% Partial match &nbsp;
  <span style="color:#ef4444;">●</span> &lt;50% Low match
</div>
```

The text labels ("≥75% Strong match", "50–74% Partial match", "<50% Low match") are
present alongside the colored dots, so screen reader users receive the threshold text
even without color perception. However the decorative colored `●` dots are not wrapped
in `aria-hidden="true"`, so a screen reader will announce "bullet ≥75% Strong match"
rather than just "≥75% Strong match". This is a minor cosmetic annoyance, not a
blocking failure — the information is unambiguous. The outer `div` carries a `title`
attribute (tooltip) rather than `aria-label`, which is informational only.

### Finalise notes textarea `maxlength="2000"`

Status: CONFIRMED PRESENT

`web/finalise.js:103–108` contains:

```html
<textarea id="finalise-notes" rows="4" maxlength="2000"
  oninput="document.getElementById('finalise-notes-counter').textContent=...">
```

A visible character counter `#finalise-notes-counter` (line 108) updates on input
and changes color at 1600 and 1800 characters. The counter is a `div` without
`aria-live`, so screen readers will not hear the changing count unless they navigate
to it. This is a minor gap: the `maxlength` attribute will prevent over-entry at the
browser level; screen readers will be informed of the hard limit via the native
`maxlength` attribute announcement. The label `for="finalise-notes"` is present
(`finalise.js:102`).

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

#### Criterion 1: Keyboard reach for workflow steps

⚠️ Partial — `step-job` is the only step with static `role="button" tabindex="0"` in
`index.html:124`. All other workflow step `div` elements (`index.html:126–146`) carry
`onclick` but no `role` or `tabindex` in the initial HTML. This is intentionally gated:
`updateWorkflowStepsClickable()` in `ui-core.js:1929–1990` dynamically adds
`role="button"`, `tabindex="0"`, and an Enter/Space keydown handler via `_makeStepClickable`
as phases unlock, and removes them via `_makeStepInert` when re-locking. The
progressive-disclosure pattern is architecturally correct. However, locked steps that are
not yet clickable still expose `onclick` attributes in the static DOM, which means
accessibility-tree browsing (not Tab key) will surface them as unidentified clickable
`div` elements without a role to signal intent.

#### Criterion 2: Stage tabs expose correct tab semantics

✅ Pass — `index.html:207` declares `role="tablist" aria-label="Application workflow tabs"`
on `#tab-bar`. Every tab `div` carries `role="tab"`, `aria-selected="true/false"`,
`aria-controls="document-content"`, and roving `tabindex` (`index.html:208–233`). The
single tabpanel `#document-content` has `role="tabpanel" aria-labelledby="tab-job"`
(`index.html:239`; the `aria-labelledby` pointer is updated to `tab-{tab}` by
`switchTab()` — confirmed at `review-table-base.js:133`). Arrow Left/Right/Home/End
navigation is implemented in `ui-core.js:536–553`. Enter/Space activates the focused
tab (`ui-core.js:530–533`).

#### Criterion 3: Active and completed states conveyed beyond colour

⚠️ Partial — `updateWorkflowStepsClickable()` in `ui-core.js:1979–1988` sets
`aria-current="step"` on the active sequential step and removes it from all others.
This is correct for pre-layout phases. However, when `postLayoutUnlocked` is true
(phases `final_generation` or `refinement`), `activeStepId` resolves to `null`
(`ui-core.js:1985`) and no `aria-current` is applied to any step — the active workflow
position is undetectable non-visually during the post-layout phase. The `.active`,
`.completed`, `.upcoming`, `.stale`, `.stale-critical` CSS classes (`styles.css:151–157`)
convey state by colour only; supplementary `sr-only` state descriptions ("(completed)",
"(current step)", "(stale — results may be outdated)", "(critical — review required)")
are added via `workflow-steps.js:745–750`, which partially addresses the colour-only
concern for workflow step elements rendered by that function, but the issue in
`updateWorkflowStepsClickable` for post-layout phases remains.

#### Criterion 4: Changes in active stage or tab are announced

✅ Pass — `index.html:150–151` declares a visually-hidden `aria-live="polite"
aria-atomic="true"` region (`#workflow-stage-announcer`). In `review-table-base.js:138–141`,
`switchTab()` populates this region with `"Now viewing: {tab label}"` on every switch
using the `textContent = ""; setTimeout(() => ..., 50)` double-write pattern that forces
screen-reader re-announcement even when the same tab is re-selected.

---

### US-X2: Modal and Dialog Accessibility

#### Criterion 1: Opening a modal moves focus into it

✅ Pass — All major dialogs correctly save prior focus and move focus on open:

- Settings: `ui-core.js:239–247` (saves `_focusedElementBeforeModal`, calls `setInitialFocus`)
- Model config wizard: `ui-core.js:1499–1523`
- ATS Report: `ats-modals.js:119, 122–126`
- Job Analysis: `ats-modals.js:233, 238–246` **(GAP-219 confirmed resolved)**
- Bullet-reorder: `workflow-steps.js:457–510` (saves `_focusedElementBeforeModal`, calls
  `trapFocus`, `setInitialFocus`)
- Confirm dialog (`confirmDialog()`): `ui-core.js:374, 409` (saves `previousFocus`, focuses OK btn)
- Sessions, Master CV, Onboarding, Ownership conflict, Alert, Rerun confirm: confirmed in
  prior cycle review; no changes to those code paths observed.

#### Criterion 2: Focus is trapped inside the modal while it is open

✅ Pass — `trapFocus()` (`ui-core.js:294–331`) implements the Tab/Shift+Tab wrap using
`getFocusableElements()` and a `_currentFocusTrapListener`. Called by: settings, model
wizard, ATS report, job analysis **(GAP-219 resolved)**, bullet-reorder, sessions, master CV,
and ownership conflict modals. The onboarding modal uses `_openOnboardingFocusTrap()` which
calls `globalThis.trapFocus()`. The `confirmDialog()` utility has its own inline Tab trap
(`ui-core.js:412–423`).

#### Criterion 3: Closing a modal restores focus to the triggering control

✅ Pass — All modal close paths restore focus:

- Settings/model/sessions/ownership-conflict: call `restoreFocus()` from `ui-core.js:334–347`
- ATS Report: `ats-modals.js:156–163` calls `restoreFocus()` then falls back to
  `_atsModalPreviousFocus.focus()`
- Job Analysis: `ats-modals.js:263–270` calls `restoreFocus()` then falls back to
  `_jobAnalysisPreviousFocus.focus()` **(GAP-219 resolved)**
- Bullet-reorder close button: `workflow-steps.js:491–493` (calls `restoreFocus()`)
- Bullet-reorder Escape handler: `workflow-steps.js:513–519` (calls `restoreFocus()`)
- Confirm dialog: `ui-core.js:430–431` restores `previousFocus`
- Onboarding and alert: confirmed in prior cycle; unchanged.

#### Criterion 4: Dialog title and purpose are programmatically exposed

✅ Pass — All modals in `index.html` carry `role="dialog" aria-modal="true"
aria-labelledby` pointing to an `h2` child: sessions (`index.html:253`), master-cv
(`index.html:275`), alert (`index.html:291`), confirm (`index.html:306`), onboarding
(`index.html:323`), ownership-conflict (`index.html:405`), model-config (`index.html:422`),
settings (`index.html:582`), ats-report (`index.html:693`), job-analysis (`index.html:709`).
The `confirmDialog()` utility sets `role="dialog" aria-modal="true"
aria-labelledby="confirm-dialog-msg"` (`ui-core.js:385–386`). The bullet-reorder modal
sets `role="dialog" aria-modal="true" aria-labelledby="bullet-reorder-title"`
(`workflow-steps.js:463–466`).

---

### US-X3: Forms, Errors, and Review Controls

#### Criterion 1: Inputs with validation errors expose those errors via accessible associations

✅ Pass — Job Input paste textarea (`job-input.js:115–121`): `aria-required="true"`,
`aria-describedby="paste-char-count paste-error"`, and `<span id="paste-error"
aria-live="polite">` (line 121). URL input (lines 131–135): `aria-required="true"`,
`aria-describedby="url-error"`, `<span id="url-error" aria-live="polite">` (line 135).
File upload (line 165): `aria-describedby="file-upload-error"`. `_showFieldError()`
(`job-input.js:550–558`) sets `aria-invalid="true"` programmatically; `_clearFieldError()`
(`job-input.js:560–567`) clears it. `styles.css:1542–1546` adds a red focus ring for
`input[aria-invalid="true"]:focus`. The `.field-error` span is visible only when text
is set.

#### Criterion 2: Icon-only controls have descriptive labels

⚠️ Partial — Rewrite action buttons carry `aria-pressed="false/true"` and visible text
labels ("✓ Accept", "✎ Edit", "✗ Reject") with `aria-pressed` lifecycle managed in
`rewrite-review.js:328–418`. Experience/skill/achievement icon buttons carry contextual
`aria-label` values (e.g. `"Emphasize {title}"`, `"Move {title} earlier"`, `"Reorder bullets
for {title}"`) in `skills-review.js:768–773` and `experience-review.js:206`. Bullet-reorder
Up/Down buttons have `aria-label="Move bullet up/down"` (`workflow-steps.js:533, 537`).
Provider info `ⓘ` button has `aria-label="Provider info"` (`ui-core.js:1286`). The dismiss
button on the session conflict banner has `aria-label="Dismiss notification"` (`index.html:118`).

Remaining gap: The `icon-btn` active state (conveyed by the `.active` CSS class in
`styles.css:1190–1196`) is not accompanied by `aria-pressed` on experience/skill icon
buttons. When a user selects "emphasize" via `handleActionClick()` in
`review-table-base.js:690–710`, the `.active` class is toggled but `aria-pressed` is
not set. Screen readers cannot detect which action is currently selected for each
experience or skill row. This is inconsistent with the rewrite-review buttons which
correctly manage `aria-pressed`. (GAP-A6 — unchanged from prior cycle.)

#### Criterion 3: Inline edit/review actions have clear focus targets and visible focus states

✅ Pass — `focus-visible` outlines (`outline: 2px solid #3b82f6`) are defined for:
`.step` (`styles.css:144`), `.sm-th` (`styles.css:261`), `.sm-btn` (`styles.css:296`),
`.q-chip` (`styles.css:509`), `.message-input` (`styles.css:580`), `.action-btn`
(`styles.css:594`), `.tab` (`styles.css:641`), `.icon-btn` (`styles.css:1198`),
`.rw-btn` (`styles.css:1266`), `.btn-primary/.btn-secondary/.btn-warning`
(`styles.css:1312`), and `.preview-output-badge-link` (`styles.css:1401`). Form inputs
use `outline: 2px solid #3b82f6` on `:focus`. The one `outline: none` in the codebase
(`styles.css:1602`, `.intake-field-row input:focus`) is compensated by
`box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2)` on the same rule, providing a visible
focus indicator. The step rerun button's `focus-visible` outline is injected dynamically
by `workflow-steps.js:762`.

#### Criterion 4: Error and status messages are exposed to assistive technology

✅ Pass — `aria-live` regions and `role="alert"` elements exist: toast container
`aria-live="polite" aria-atomic="true"` (`index.html:288`); LLM busy label
`aria-live="polite" role="status"` (`index.html:163`); settings status `aria-live="polite"`
(`index.html:589`); onboarding status `aria-live="polite"` (`index.html:386`); model wizard
progress `role="status" aria-live="polite"` (`index.html:436`); model auth key status
`role="alert"` (`index.html:493`); session conflict banner `role="alert"`
(`index.html:115`); job-input field error spans `aria-live="polite"` (`job-input.js:121, 135`).

---

## Additional Accessibility Properties (not in user stories)

### Reduced-motion support

✅ Pass — `styles.css:1621–1630` contains `@media (prefers-reduced-motion: reduce)` that
suppresses all animations and transitions globally via `animation-duration: 0.01ms !important`,
`animation-iteration-count: 1 !important`, and `transition-duration: 0.01ms !important`.
Covers the stale-chip-pulse, browsing-pulse, changed-item-pulse, and loading-spinner
animations.

### Screen reader compatibility

✅ Pass — Emoji icons in workflow steps and tab labels use `<span aria-hidden="true">…</span>`
wrappers throughout (`index.html:124–146`, `index.html:208–233`). The `.sr-only` utility
class is defined in `styles.css:23–34`. LLM busy overlay spinner has `aria-hidden="true"`
(`index.html:427` — the model wizard spinner at line 432 also uses `aria-hidden="true"`).
Model wizard progress step connectors have `aria-hidden="true"` (`index.html:440, 445, 450`).
Eye-slash SVG icons carry `aria-hidden="true" focusable="false"` (`review-icons.js:9`).

### Step re-run buttons at rest

✅ Pass — `workflow-steps.js:730–733` renders step re-run buttons with
`style="opacity:0.35"` at rest. `workflow-steps.js:762` injects a CSS rule that sets
`opacity: 1` on `:hover` on the parent `.completed` step and also on
`.step-rerun:focus-visible`, ensuring keyboard-focused rerun buttons become fully visible.
The button carries `aria-label="Re-run {step label}"` and `focus-visible` outline.

---

## Generated Materials Evaluation

— Not assessed — Generated DOCX and PDF outputs are binary formats produced server-side.
The reviewed source files do not contain tagged-PDF or DOCX heading-style logic accessible
for evaluation in this source-first review.

Gap noted from prior cycle: the Layout Review iframe (rendered by `layout-instruction.js`,
not in the reviewed source files) should carry `title="CV layout preview"` per WCAG 2.4.1.
Not confirmed present in this cycle's reviewed files (GAP-A5 — unchanged).

---

## Remaining Gap Items

### GAP-A3: `aria-current` not set during post-layout phases

`updateWorkflowStepsClickable()` (`ui-core.js:1985`) resolves `activeStepId` to `null`
when `postLayoutUnlocked` is true, so no step receives `aria-current="step"` during
`final_generation` or `refinement` phases. The active workflow position is not
programmatically determinable during the post-layout download/finalise/cover-letter/
screening flow.

### GAP-A4: Locked workflow step `div` elements have `onclick` but no accessible role

Steps `step-analysis` through `step-harvest` in `index.html:126–146` carry `onclick`
handlers in the static HTML but no `role` or `tabindex` until unlocked by
`updateWorkflowStepsClickable()`. Accessibility-tree browsing will surface these as
unidentified clickable `div` elements.

### GAP-A5: Layout Review iframe lacks confirmed accessible title

The layout preview `<iframe>` generated by `layout-instruction.js` should carry
`title="CV layout preview"` per WCAG 2.4.1. Confirmed absent from this cycle's reviewed
source files; `layout-instruction.js` was not in scope.

### GAP-A6: Experience/skill `icon-btn` active state not reflected via `aria-pressed`

When `handleActionClick()` (`review-table-base.js:690–710`) toggles the `.active` class
on experience/skill icon buttons, `aria-pressed` is not updated. Screen readers cannot
determine which action (emphasize/include/de-emphasize/exclude) is currently selected.
The rewrite-review `.rw-btn` buttons correctly manage `aria-pressed` (`rewrite-review.js:328–418`)
— this gap is inconsistent with that established pattern.

### GAP-A7: `prefers-contrast` media query absent

No `@media (prefers-contrast: more)` adaptation is present. Small muted text instances
(e.g. `.ats-score-label` at `color:#64748b` / 11px, `.ats-score-summary-line` at 12px,
ATS grade legend dots at `color:#94a3b8` / 0.75em) may fail WCAG 1.4.3 for users who
need enhanced contrast and request it via OS settings.

### GAP-A8: Single `_focusedElementBeforeModal` variable can be clobbered by nested modal opens

`ui-core.js:30` declares one shared `_focusedElementBeforeModal`. If a sub-modal opens
from within a primary modal (e.g. a confirm dialog triggered from the Master CV modal),
the outer modal's saved focus is overwritten. On inner-modal close, focus returns to a
stale reference and the outer modal's focus origin is lost. The ATS report and job
analysis modals use their own private variables to avoid this; the pattern should be
applied consistently throughout.

### GAP-A9 (new): ATS grade legend colored-dot spans lack `aria-hidden`

`ats-modals.js:205–207`: the three `●` colored-dot `<span>` elements are decorative
(the adjacent text carries the meaning) but are not wrapped with `aria-hidden="true"`.
Screen readers will announce "bullet ≥75% Strong match" instead of "≥75% Strong match".
Low severity — information is not obscured — but the unnecessary glyph announcement is
avoidable.

### GAP-A10 (new): Finalise notes character counter `#finalise-notes-counter` not announced

`finalise.js:108`: the character counter `div` (`id="finalise-notes-counter"`) updates
dynamically via `oninput` but carries no `aria-live` attribute. Screen reader users typing
in the `#finalise-notes` textarea will not hear the count change as they approach the 2000
character limit. A `role="status"` or `aria-live="polite"` on the counter would announce
updates without interrupting typing.

---

## Scorecard

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-X1 Workflow nav | 2 | 2 | 0 | 0 | 0 |
| US-X2 Modals | 4 | 0 | 0 | 0 | 0 |
| US-X3 Forms/errors | 3 | 1 | 0 | 0 | 0 |

US-X2 remains 4 Pass / 0 Partial (GAP-219 fix confirmed in ats-modals.js).

---

## Key Evidence References

| File | Line(s) | Finding |
| --- | --- | --- |
| `ats-modals.js` | 228–270 | GAP-219 fix: `_jobAnalysisPreviousFocus`, escape handler, close-btn focus, `trapFocus`, focus restore — all confirmed |
| `ats-modals.js` | 108–163 | ATS Report modal: same full focus-management pattern |
| `ats-modals.js` | 204–207 | ATS grade legend: text labels present; colored-dot spans lack `aria-hidden` (GAP-A9) |
| `index.html` | 63–66 | `id="help-btn"` with `aria-label="Help — reopen getting started guide"` confirmed |
| `index.html` | 124 | Only `step-job` has static `role="button" tabindex="0"` |
| `index.html` | 126–146 | Inactive steps have `onclick` but no `role`/`tabindex` (GAP-A4) |
| `index.html` | 150–151 | `workflow-stage-announcer` `aria-live="polite" aria-atomic="true"` |
| `index.html` | 207–233 | `role="tablist"`, tabs with `role="tab"` `aria-selected` roving-tabindex |
| `index.html` | 239 | `role="tabpanel" aria-labelledby="tab-job"` |
| `index.html` | 253–715 | All modals: `role="dialog" aria-modal="true" aria-labelledby` |
| `ui-core.js` | 294–331 | `trapFocus()` implementation |
| `ui-core.js` | 274–287 | `setInitialFocus()` implementation |
| `ui-core.js` | 334–347 | `restoreFocus()` implementation |
| `ui-core.js` | 536–553 | Arrow/Home/End tab keyboard navigation |
| `ui-core.js` | 1929–1990 | `_makeStepClickable` / `_makeStepInert` / `aria-current` on active step |
| `ui-core.js` | 1985 | `activeStepId = null` when `postLayoutUnlocked` — no `aria-current` (GAP-A3) |
| `review-table-base.js` | 690–710 | `icon-btn` `.active` class toggled without `aria-pressed` update (GAP-A6) |
| `review-table-base.js` | 121–142 | `switchTab()`: `aria-selected`, `tabindex`, `aria-labelledby`, live region update |
| `rewrite-review.js` | 328–418 | Rewrite review `aria-pressed` lifecycle (correctly implemented) |
| `workflow-steps.js` | 457–521 | Bullet-reorder modal: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus save, `trapFocus`, `setInitialFocus`, Escape handler |
| `workflow-steps.js` | 730–762 | Step rerun button: `aria-label`, dim at rest (opacity:0.35), full visibility on `:hover`/`:focus-visible` |
| `job-input.js` | 115–135 | `aria-required`, `aria-describedby`, `aria-live` error spans |
| `job-input.js` | 550–567 | `_showFieldError` / `_clearFieldError`: `aria-invalid` set/cleared programmatically |
| `finalise.js` | 102–108 | `maxlength="2000"` on `#finalise-notes`; counter `div` lacks `aria-live` (GAP-A10) |
| `skills-review.js` | 768–773 | Icon-btn `aria-label` values for skill actions |
| `experience-review.js` | 206 | `aria-label="Reorder bullets for {title}"` on reorder button |
| `review-icons.js` | 9 | Eye-slash SVG: `aria-hidden="true" focusable="false"` |
| `styles.css` | 23–34 | `.sr-only` utility class |
| `styles.css` | 144, 261, 296, 509, 580, 594, 641, 1198, 1266, 1312 | `focus-visible` outlines |
| `styles.css` | 1542–1546 | `input[aria-invalid="true"]:focus` red ring |
| `styles.css` | 1600–1603 | `.intake-field-row input:focus`: `outline:none` compensated by `box-shadow` |
| `styles.css` | 1621–1630 | `@media (prefers-reduced-motion: reduce)` — all animations suppressed |
