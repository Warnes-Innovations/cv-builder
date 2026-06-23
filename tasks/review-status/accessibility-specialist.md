<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-06-22 09:45 ET

**Persona:** Accessibility Specialist
**Stories evaluated:** US-X1, US-X2, US-X3
**Cycle:** 7

**Executive Summary:** Cycle 7 verifies all four cycle-6 open fixes (GAP-176, GAP-178,
GAP-179, GAP-180) against the current source. All four are confirmed resolved. The
bullet-reorder modal (`showBulletReorder`) now has `role="dialog"`, `aria-modal="true"`,
`aria-labelledby`, `trapFocus`, `setInitialFocus`, Escape key handler, and `restoreFocus`
on all close paths. Rewrite-review accept/edit/reject buttons now carry `aria-pressed="false"`
at render time and toggle to `"true"` on activation. `.icon-btn`, `.rw-btn`, and `.sm-btn`
now have `:focus-visible` CSS rules. The step-rerun button now has `opacity:0.35` at rest
rather than 0.

Two legacy findings remain open: `#message-input` still lacks an accessible label (P1,
GAP-35), and `outline:none` on four input types lacks a `:focus-visible` fallback that
survives Windows High Contrast mode (P3). No new accessibility issues were discovered this
cycle.

---

## Legend

| Symbol | Meaning |
| --- | --- |
| ✅ | Pass — criterion met, evidence cited |
| ⚠️ | Partial — partially met, gap identified |
| ❌ | Fail — criterion not met |
| 🔲 | Not Implemented |
| — | N/A |

---

## Cycle-7 Summary: What Changed Since Cycle 6

The following cycle-6 findings are now resolved:

| Cycle-6 Finding | Cycle-7 Status |
| --- | --- |
| GAP-176: Bullet-reorder modal invisible to AT (no dialog ARIA, no focus management) | ✅ FIXED — workflow-steps.js:462–521 |
| GAP-178: rw-btn (accept/edit/reject) lack aria-pressed | ✅ FIXED — rewrite-review.js:306–308, 325, 342, 360, 392–396 |
| GAP-179: `.icon-btn`, `.rw-btn`, `.sm-btn` lack `:focus-visible` CSS | ✅ FIXED — styles.css:1195, 1263, 296 |
| GAP-180: step-rerun button had opacity:0 (invisible) at rest | ✅ FIXED — workflow-steps.js:733 `opacity:0.35` |

Remaining open items from prior cycles:

- `#message-input` has no accessible label (P1, GAP-35)
- `outline:none` on four input types without `:focus-visible` fallback for High Contrast mode (P3)
- Single `_currentFocusTrapListener` slot cannot handle nested modals (P3)
- Emoji in tabs and steps not wrapped in `aria-hidden` spans (P3)
- Human DOCX lacks semantic heading styles (P2, GAP-NEW-2)
- `confirmDialog` uses message text as dialog label rather than a dedicated heading (P3)

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

**Story:** Workflow-step bar and stage tabs are fully operable by keyboard and understandable
to assistive technologies.

#### Criterion 1: Workflow-step elements are reachable and operable by keyboard

Status: ✅ Pass — unchanged from cycle 6

`web/index.html` lines 117–143: The workflow container is a `<nav>` element with
`aria-label="Application workflow steps"`. `step-job` (index.html:119) carries
`role="button" tabindex="0"` in the HTML source.

Steps 2–12 (index.html:121–141) are plain `<div>` elements at load time, but
`updateWorkflowStepsClickable` in `ui-core.js:1879–1963` is called on every status update
and on `DOMContentLoaded`. Its inner helper `_makeStepClickable` (ui-core.js:1917–1930):

- sets `el.setAttribute('role', 'button')`
- sets `el.setAttribute('tabindex', '0')`
- attaches a `keydown` handler for Enter and Space that calls `el.click()`

`_makeStepInert` (ui-core.js:1933–1942) removes the role, sets `tabindex="-1"`, and removes
the key handler when steps are not yet unlocked.

The step-rerun button within each completed step also now has `opacity:0.35` at rest
(GAP-180, workflow-steps.js:733) and `aria-label="Re-run ${rerunLabel}"` (workflow-steps.js:730),
making it both visible and labelled for keyboard users.

#### Criterion 2: Stage tabs expose correct tab semantics, selected state, and panel association

Status: ✅ Pass — unchanged from cycle 6

Tab bar (index.html:199): `role="tablist"` and `aria-label`. Each tab: `role="tab"`,
`aria-selected`, `aria-controls="document-content"`, roving `tabindex`. Arrow/Enter/Space
navigation wired in `ui-core.js:516–540`. `switchTab()` (review-table-base.js:122–133)
updates `aria-selected` on all tabs and `aria-labelledby` on the tabpanel on every switch.
`.tab:focus-visible` CSS rule present at `styles.css:638`.

#### Criterion 3: Active and completed states conveyed by more than colour alone

Status: ✅ Pass — unchanged from cycle 6

`workflow-steps.js:740–750` appends `.sr-only` text after each step label at every call to
`updateWorkflowSteps`. The injected text variants are:

- ` (current step)` for active steps
- ` (completed)` for completed steps
- ` (stale — results may be outdated)` for stale steps
- ` (critical — review required)` for stale-critical steps

`.sr-only` is defined at `styles.css:24–33` (visually hidden, readable by screen readers).

The view-cursor ring (`.step.viewing { box-shadow: 0 0 0 2px #3b82f6; }`, styles.css:160)
and the browsing-away amber pulse (styles.css:163–169) are purely visual indicators; the
`.sr-only` text covers the non-colour equivalent.

#### Criterion 4: Changes in active stage or tab are programmatically determinable

Status: ✅ Pass — unchanged from cycle 6

`document-content` has `aria-live="polite"` (index.html:231) and `aria-labelledby` updated
on every tab switch (review-table-base.js:133). `aria-selected` is updated on every switch.
`#llm-busy-label` has `aria-live="polite" role="status"` (index.html:155), so LLM
processing state changes are announced.

**US-X1 Acceptance criteria summary:**

| Criterion | Result |
| --- | --- |
| Keyboard-only users can move through workflow controls in logical order | ✅ All 12 steps keyboard-reachable; rerun button now visible (opacity:0.35) |
| Tabs expose selected/unselected state programmatically | ✅ aria-selected maintained on every switchTab call |
| Active workflow position perceivable without colour vision | ✅ `.sr-only` text injected for all step states |

---

### US-X2: Modal and Dialog Accessibility

**Story:** Modal dialogs manage focus correctly and remain usable with screen readers.

#### Criterion 1: Opening a modal moves focus into it

Status: ✅ Pass — GAP-176 resolved; all major modals now compliant

All major modals call `setInitialFocus` or an equivalent direct focus call on open:

- `openSettingsModal`: `setInitialFocus('settings-modal-overlay')` (ui-core.js:244) ✅
- `openModelModal`: `setInitialFocus('model-modal-overlay')` (ui-core.js:1509) ✅
- `openSessionsModal`: `setInitialFocus('sessions-modal-overlay')` (session-switcher-ui.js:458) ✅
- `openMasterCvModal`: `setInitialFocus('master-cv-modal-overlay')` (master-cv.js:2483) ✅
- `showAlertModal`: `setInitialFocus('alert-modal-overlay')` ✅
- `showConfirmModal`: `okBtn.focus()` ✅
- `confirmDialog`: `okBtn.focus()` (ui-core.js:409) ✅
- `_showReRunConfirmModal`: `document.getElementById('rerun-proceed-btn').focus()` (workflow-steps.js:181) ✅
- `showBulletReorder`: `setInitialFocus('bullet-reorder-modal')` (workflow-steps.js:510) ✅ FIXED (GAP-176)

#### Criterion 2: Focus is trapped inside the modal while it is open

Status: ✅ Pass — GAP-176 resolved; all major modals now compliant

`trapFocus` is wired for: Settings, Model, Sessions, Master CV, Ownership Conflict, Alert,
Confirm, ATS Report, Re-run Confirm, and now Bullet Reorder.

- `showBulletReorder`: `trapFocus('bullet-reorder-modal')` (workflow-steps.js:509) ✅ FIXED (GAP-176)

Remaining architecture note: The single `_currentFocusTrapListener` slot means opening a
nested modal replaces the outer trap. This is a P3 concern; no regression this cycle and no
change in risk.

The `confirmDialog` function (ui-core.js:412–422) has its own inline two-button Tab trap,
unaffected by the shared listener.

#### Criterion 3: Closing a modal restores focus to the triggering control

Status: ✅ Pass — GAP-176 resolved; all major modals now compliant

`showBulletReorder` close path: The X close button now calls
`restoreFocus();document.getElementById('bullet-reorder-modal').remove()` (workflow-steps.js:492).
Save Order button calls `saveBulletOrder('${expId}');restoreFocus()` (workflow-steps.js:505).
Escape key handler calls `restoreFocus()` then `modal.remove()` (workflow-steps.js:514–519).
✅ FIXED (GAP-176)

Focus origin is captured at workflow-steps.js:457–459:

```js
if (typeof _focusedElementBeforeModal !== 'undefined') {
  _focusedElementBeforeModal = document.activeElement;
}
```

The Reset button at workflow-steps.js:504 calls `restoreFocus()` inside `resetBulletOrder`
(workflow-steps.js:628), so it also restores focus on the async success path. ✅

#### Criterion 4: Dialog title and purpose are programmatically exposed

Status: ✅ Pass — GAP-176 resolved; all major modals now compliant

`showBulletReorder`: The outer modal element at workflow-steps.js:462–469 carries
`role="dialog"`, `aria-modal="true"`, `aria-labelledby="bullet-reorder-title"`.
The inner `<h3 id="bullet-reorder-title">↕ Reorder Bullets</h3>` (workflow-steps.js:488)
provides the label text. ✅ FIXED (GAP-176)

All static `role="dialog"` overlays carry `aria-modal="true"` and `aria-labelledby`.

**US-X2 Acceptance criteria summary:**

| Criterion | Result |
| --- | --- |
| All major dialogs support correct focus entry | ✅ All modals including bullet-reorder now pass |
| Focus trapped inside modal while open | ✅ All modals including bullet-reorder now pass |
| Focus restored to trigger on close | ✅ All modals including bullet-reorder now pass |
| Dialog purpose exposed via ARIA labels | ✅ All modals including bullet-reorder now pass |

---

### US-X3: Forms, Errors, and Review Controls

**Story:** Form validation, review controls, and inline editing affordances are accessible.

#### Criterion 1: Inputs with validation errors expose errors via accessible associations

Status: ⚠️ Partial — unchanged from cycle 6

Job-input fields (`job-input.js`) use `_showFieldError`/`_clearFieldError` (lines 555–566)
which set `aria-invalid="true"/"false"` on the input element. The inputs carry
`aria-describedby` at `job-input.js:116, 132, 165`, pointing to `paste-error`, `url-error`,
and `file-upload-error` respectively. CSS at `styles.css:1530–1534` styles
`input[aria-invalid="true"]:focus` with a red outline for the primary job-input form.

Remaining gaps (unchanged from cycle 6): Settings modal inputs, master-cv form fields, and
skill inputs do not have `aria-describedby` or `aria-invalid` wiring. Visual error messages
in those areas are not programmatically linked.

All surveyed live regions pass (unchanged):

- `#toast-container`: `aria-live="polite" aria-atomic="true"` (index.html:280) ✅
- `#document-content`: `aria-live="polite"` (index.html:231) ✅
- `#session-conflict-banner`: `role="alert"` (index.html:110) ✅
- `#onboarding-modal-status`: `aria-live="polite"` (index.html:369) ✅
- `#settings-status-msg`: `aria-live="polite"` (index.html:572) ✅
- `#model-auth-key-status`: `role="alert"` (index.html:476) ✅
- `#model-wizard-progress`: `role="status" aria-live="polite"` (index.html:419) ✅
- `#llm-busy-label`: `aria-live="polite" role="status"` (index.html:155) ✅

#### Criterion 2: Icon-only controls have descriptive labels

Status: ⚠️ Partial — GAP-178 resolved; `#message-input` label still absent (GAP-35)

GAP-178 resolved: rewrite-review accept/edit/reject buttons now carry `aria-pressed="false"`
at render time (rewrite-review.js:306–308) and `aria-pressed="true"` when activated via
`applyRewriteAction` (rewrite-review.js:325, 342, 360) and `saveRewriteEdit`
(rewrite-review.js:392–396). Decision state is now programmatically determinable. ✅ FIXED

All surveyed icon-only controls carry descriptive labels (unchanged from cycle 6):

- Experience review icon-btns: `aria-label` with context (experience-review.js:202–208) ✅
- Achievements review icon-btns: `aria-label` with context (achievements-review.js:244–295) ✅
- `#rename-session-btn`: `aria-label="Rename this session"` (index.html:77) ✅
- `#toggle-chat`: `aria-label` and `aria-expanded` maintained (ui-core.js:696–697) ✅
- All 6 modal close × buttons: `aria-label` present ✅

Remaining gap: `#message-input` (index.html:177): Still has no `<label>`, no `aria-label`,
no `aria-labelledby`. Placeholder text only. (P1, GAP-35)

Note: Achievements editor icon-btns at `achievements-review.js:544–560` use `title`
attribute only without `aria-label`. `title` is accessible but non-persistent; these buttons
could be improved but are not new failures.

#### Criterion 3: Inline edit/review actions have clear focus targets and visible focus states

Status: ✅ Pass — GAP-179 resolved; all primary interactive element classes now have `:focus-visible`

GAP-179 resolved: the following CSS rules were added or confirmed present this cycle:

- `.icon-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` (styles.css:1195) ✅ FIXED
- `.rw-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` (styles.css:1263) ✅ FIXED
- `.sm-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` (styles.css:296) ✅ FIXED

Previously confirmed passing:

- `.tab:focus-visible` (styles.css:638) ✅
- `.step:focus-visible` (styles.css:144) ✅
- `.action-btn:focus-visible` (styles.css:591) ✅
- `.sm-th:focus-visible` (styles.css:261) ✅
- `.preview-output-badge-link:focus-visible` (styles.css:1396) ✅
- `.step-rerun:focus-visible` injected style (workflow-steps.js:762) ✅

Remaining gap (P3, unchanged): `outline:none` on four input types:
`.message-input:focus` (styles.css:579), `.form-input:focus` (styles.css:753),
`.q-input:focus` (styles.css:510), and `.layout-instruction-textarea:focus`
(styles.css:1434) all remove the outline and substitute a `box-shadow` focus indicator.
`box-shadow` is invisible in Windows High Contrast mode. These inputs have no
`:focus-visible` fallback that survives High Contrast. This is a P3 concern; no regression
this cycle.

#### Criterion 4: Error and status messages exposed in live regions

Status: ✅ Pass — unchanged from cycle 6

All eight identified dynamic regions carry either `aria-live` or `role="alert"/"status"`.
See Criterion 1 above for the complete list.

**US-X3 Acceptance criteria summary:**

| Criterion | Result |
| --- | --- |
| Validation and status feedback accessible to non-visual users | ⚠️ Job-input form wired; other form fields lack aria-invalid; all live regions active |
| Review controls understandable/operable without pointer | ⚠️ Icon buttons labelled and now have focus-visible; aria-pressed now maintained; message-input still unlabelled |

---

## Generated Materials Evaluation

No changes to generated-materials analysis this cycle. Prior findings unchanged:

- Primary/heading text `#2c3e50` on white: ~11.5:1 contrast — passes WCAG AA ✅
- Body text `#333` on white: ~12:1 — passes ✅
- Muted text `#666` on white: ~5.7:1 — passes AA ✅
- Accent colour `#2980b9` on white: ~3.9:1 — marginally fails AA for small normal text (P3) ⚠️
- ATS DOCX: black text, Heading 1/2 paragraph styles — maximum contrast, semantic structure ✅
- Human DOCX: bold runs for headings rather than Word Heading paragraph styles — no semantic heading navigation for screen readers (P2, GAP-NEW-2) ⚠️

---

## Additional Story Gaps / Proposed Story Items

The following gaps were identified across prior cycles and remain open:

1. **GAP-35 (P1):** `#message-input` (index.html:177) has no `<label>`, `aria-label`, or
   `aria-labelledby`. Placeholder is not a WCAG 1.3.1 / 3.3.2 compliant label.

2. **GAP-NEW-2 (P2):** Human DOCX output uses bold runs for section headings rather than
   Word paragraph Heading styles. Screen reader navigation of DOCX depends on semantic
   heading structure. Proposed story: "As a hiring manager using assistive technology, I
   want section headings in the human-readable DOCX to use Word's Heading styles."

3. **P3 — `outline:none` without High Contrast fallback:** Four input types
   (`.message-input`, `.form-input`, `.q-input`, `.layout-instruction-textarea`) remove the
   outline and substitute `box-shadow`, which is invisible in Windows High Contrast mode.

4. **P3 — Single `_currentFocusTrapListener`:** Opening a nested modal replaces the outer
   focus trap. The shared slot in `ui-core.js:33` cannot stack traps. Risk is low in the
   current interaction model but would become a bug if a dialog opens over a dialog.

5. **P3 — Emoji in tabs and steps not aria-hidden:** Tab and step labels contain emoji
   (e.g., 📋 Job, 🔍 Analysis) that are read aloud by screen readers. Wrapping them in
   `<span aria-hidden="true">` would improve the announcement. Not a WCAG failure but a
   quality improvement.

6. **P3 — `confirmDialog` missing explicit heading:** The inline confirm dialog
   (ui-core.js:385) uses `aria-labelledby="confirm-dialog-msg"` pointing to the `<p>`
   containing the message text. A dedicated heading element would be better practice.

7. **P3 — Achievements editor icon-btns title-only:** Buttons at
   `achievements-review.js:544–560` use only `title`, no `aria-label`. `title` is not
   persistent on hover for AT users. Low risk but improvable.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js,
web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py,
web/rewrite-review.js, web/workflow-steps.js

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-X1 | 4 | 0 | 0 | 0 | 0 |
| US-X2 | 4 | 0 | 0 | 0 | 0 |
| US-X3 | 2 | 2 | 0 | 0 | 0 |

**Key evidence references:**

GAP-176 resolution (bullet-reorder modal):

- `web/workflow-steps.js:462–469` — `role="dialog"`, `aria-modal="true"`, `aria-labelledby="bullet-reorder-title"`
- `web/workflow-steps.js:488` — `<h3 id="bullet-reorder-title">↕ Reorder Bullets</h3>`
- `web/workflow-steps.js:492` — X button: `restoreFocus();…modal.remove()`
- `web/workflow-steps.js:505` — Save Order button: `…;restoreFocus()`
- `web/workflow-steps.js:509–510` — `trapFocus('bullet-reorder-modal')`, `setInitialFocus('bullet-reorder-modal')`
- `web/workflow-steps.js:513–521` — Escape key handler calls `restoreFocus()` then `modal.remove()`
- `web/workflow-steps.js:628` — `resetBulletOrder` async success path: `restoreFocus()`

GAP-178 resolution (aria-pressed):

- `web/rewrite-review.js:306–308` — `aria-pressed="false"` at render time on all three buttons
- `web/rewrite-review.js:325` — `btn.setAttribute('aria-pressed', 'false')` on clear
- `web/rewrite-review.js:342` — edit activation: `editBtn.setAttribute('aria-pressed', 'true')`
- `web/rewrite-review.js:360` — accept/reject activation: `activeBtn.setAttribute('aria-pressed', 'true')`
- `web/rewrite-review.js:392–396` — saveRewriteEdit: accept/reject cleared to false, edit set to true

GAP-179 resolution (focus-visible):

- `web/styles.css:296` — `.sm-btn:focus-visible`
- `web/styles.css:1195` — `.icon-btn:focus-visible`
- `web/styles.css:1263` — `.rw-btn:focus-visible`

GAP-180 resolution (step-rerun opacity):

- `web/workflow-steps.js:733` — `style="…opacity:0.35;…"` (was 0)

Remaining open findings:

- P1: GAP-35 — `web/index.html:177` — `#message-input` no accessible label
- P2: GAP-NEW-2 — human DOCX heading structure
- P3: `outline:none` — `web/styles.css:510, 579, 753, 1434`
