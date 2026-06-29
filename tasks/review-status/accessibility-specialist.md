<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-06-29 14:30 ET

**Persona:** Accessibility Specialist
**Stories evaluated:** US-X1, US-X2, US-X3
**Cycle:** 8

**Executive Summary:** Cycle 8 is a source-first verification of the current branch
(`feature/multi-user-deployment`) against all three user stories. The cycle-7 P1 open finding
(GAP-35: `#message-input` no accessible label) is now **resolved** — the element now carries
`aria-label="Chat message"` at `index.html:177`. All four cycle-6 fixes confirmed in cycle 7
(GAP-176, GAP-178, GAP-179, GAP-180) remain intact in the current bundle. No new
accessibility failures were discovered. Five P3 items and one P2 item remain as acknowledged
open findings from prior cycles.

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

## Cycle-8 Summary: What Changed Since Cycle 7

| Cycle-7 Finding | Cycle-8 Status |
| --- | --- |
| GAP-35 (P1): `#message-input` no accessible label | ✅ FIXED — `index.html:177` now has `aria-label="Chat message"` |
| GAP-NEW-2 (P2): Human DOCX heading bold runs, not Word Heading styles | ⚠️ Still open — no generated-materials source change observed |
| P3 — `outline:none` without High Contrast fallback (4 inputs) | ⚠️ Still open — `styles.css:510, 579, 755, 1436` unchanged |
| P3 — Single `_currentFocusTrapListener` slot | ⚠️ Still open — architecture unchanged |
| P3 — Emoji in tabs/steps not `aria-hidden` | ⚠️ Still open — no change |
| P3 — `confirmDialog` missing dedicated heading | ⚠️ Still open — `bundle.js:1590` unchanged |
| P3 — Achievements editor icon-btns title-only | ⚠️ Still open — no change |

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

**Story:** Workflow-step bar and stage tabs are fully operable by keyboard and understandable
to assistive technologies.

#### Criterion 1: Workflow-step elements are reachable and operable by keyboard

Status: ✅ Pass

`web/index.html` lines 117–143: The workflow container is a `<nav>` element with
`aria-label="Application workflow steps"`. `step-job` (index.html:119) carries
`role="button" tabindex="0"` in the static HTML source.

Steps 2–12 (index.html:121–141) are plain `<div>` elements at load time, but
`updateWorkflowStepsClickable2` (bundle.js:2831) is called on every status update. Its inner
helper `_makeStepClickable` (bundle.js:2865–2879):

- Sets `el.setAttribute('role', 'button')` and `el.setAttribute('tabindex', '0')`.
- Attaches a `keydown` handler (bundle.js:2871–2876) for Enter and Space that calls
  `el.click()`.

`_makeStepInert` (bundle.js:2881–2890) removes the role, sets `tabindex="-1"`, and removes
the key handler when steps are not yet unlocked.

The step-rerun button within each completed step carries `aria-label="Re-run ${rerunLabel}"`
(bundle.js:4567) and `opacity:0.35` at rest (bundle.js:4568), making it visible and labelled.

Focus-visible ring: `.step:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }`
at `styles.css:144`. ✅

#### Criterion 2: Stage tabs expose correct tab semantics, selected state, and panel association

Status: ✅ Pass

Tab bar (index.html:199): `role="tablist"` and `aria-label="Application workflow tabs"`.

Each tab (index.html:200–225): `role="tab"`, `aria-selected` (true on active, false on rest),
`aria-controls="document-content"`, roving `tabindex` (0 for active, -1 for rest).

Arrow/Enter/Space navigation is wired in `ui-core.js:527–553` (bundle.js:1687–1720):
ArrowLeft/Right/Home/End navigate between visible tabs and call `.click()` on the next element.
Enter and Space activate directly.

`switchTab2` (bundle.js:3443–3466) updates `aria-selected` on all tabs on every switch
(bundle.js:3457–3463) and updates `aria-labelledby` on the tabpanel (bundle.js:3465–3466).

`.tab:focus-visible { outline: 2px solid #3b82f6; outline-offset: -2px; }` at
`styles.css:640`. ✅

#### Criterion 3: Active and completed states conveyed by more than colour alone

Status: ✅ Pass

`updateWorkflowSteps` (bundle.js:4489+) at line 4578 computes `srState` and appends a
`<span class="sr-only">` with one of:

- `(current step)` for the active step
- `(completed)` for completed steps
- `(stale — results may be outdated)` for stale steps
- `(critical — review required)` for stale-critical steps

`.sr-only` is defined at `styles.css:24–33` (visually hidden, readable by screen readers). ✅

The view-cursor ring (`.step.viewing { box-shadow: 0 0 0 2px #3b82f6; }`, styles.css:160) and
browsing-away amber pulse (styles.css:163–169) are purely visual; the `.sr-only` text covers
the non-colour equivalent.

`aria-current="step"` is set on the active step via `_updateModelWizardProgressBar`
(bundle.js:2348) for the wizard's internal progress steps. The main workflow steps use `.sr-only`
text as the non-visual signal rather than `aria-current` — this is a workable alternative.

#### Criterion 4: Changes in active stage or tab are programmatically determinable

Status: ✅ Pass

`#document-content` carries `aria-live="polite"` (index.html:231) and `aria-labelledby`
updated on every tab switch (bundle.js:3466).

`aria-selected` is updated on every `switchTab2` call (bundle.js:3457–3463).

`#llm-busy-label` has `aria-live="polite" role="status"` (index.html:155), so LLM processing
state changes are announced.

**US-X1 Acceptance criteria summary:**

| Criterion | Result |
| --- | --- |
| Keyboard-only users can move through workflow controls in logical order | ✅ All steps keyboard-reachable; Enter/Space/Arrow keys wired |
| Tabs expose selected/unselected state programmatically | ✅ `aria-selected` maintained on every `switchTab` call |
| Active workflow position perceivable without colour vision | ✅ `.sr-only` text injected for all step states |

---

### US-X2: Modal and Dialog Accessibility

**Story:** Modal dialogs manage focus correctly and remain usable with screen readers.

#### Criterion 1: Opening a modal moves focus into it

Status: ✅ Pass

All major modals call `setInitialFocus2` or a direct `.focus()` call on open:

- `openSettingsModal`: `setInitialFocus2('settings-modal-overlay')` (bundle.js:1502) ✅
- `openModelModal`: `setInitialFocus2('model-modal-overlay')` (bundle.js:2498) ✅
- `openSessionsModal2`: `setInitialFocus('sessions-modal-overlay')` (bundle.js:19650–19652) ✅
- `openMasterCvModal2`: `setInitialFocus('master-cv-modal-overlay')` (bundle.js:17709) ✅
- Alert modal: `setInitialFocus('alert-modal-overlay')` (bundle.js:5920) ✅
- Confirm modal: `trapFocus('confirm-modal-overlay')` (bundle.js:5937) ✅
- `confirmDialog` (inline): `okBtn.focus()` (bundle.js:1609) ✅
- Bullet-reorder modal: `setInitialFocus('bullet-reorder-modal')` (bundle.js:4372) ✅

#### Criterion 2: Focus is trapped inside the modal while it is open

Status: ✅ Pass

`trapFocus2` (bundle.js:1530–1557) uses `getFocusableElements` and a `keydown` listener for
Tab/Shift+Tab wrapping. It is wired for: Settings, Model, Sessions, Master CV, Alert, Confirm,
and Bullet-reorder modals.

The `confirmDialog` function (bundle.js:1602–1623) has its own inline two-button Tab trap.

Global Escape handler at bundle.js:1724–1726 calls `closeAllModals()` for all `role="dialog"`
elements.

Architecture note (P3, unchanged): The shared `_currentFocusTrapListener2` slot (bundle.js:1311)
cannot stack traps. Opening a nested modal replaces the outer trap. Risk is low in the current
interaction model.

#### Criterion 3: Closing a modal restores focus to the triggering control

Status: ✅ Pass

All major modal close paths call `restoreFocus2()` (bundle.js:1509, 2510, 19655, 17714,
5925, 5944, 1866, 4103, 4376, 4483).

`_focusedElementBeforeModal2` is captured before opening each modal (bundle.js:1501, 2497,
1836; sessions: `window._focusedElementBeforeModal` at bundle.js:19648; master-cv:
`_focusedElementBeforeModal` at bundle.js:17703).

#### Criterion 4: Dialog title and purpose are programmatically exposed

Status: ✅ Pass

All static `role="dialog"` overlays in `index.html` carry `aria-modal="true"` and
`aria-labelledby` pointing to a heading element:

- `#sessions-modal-overlay` → `#sessions-modal-title` (index.html:245)
- `#master-cv-modal-overlay` → `#master-cv-modal-title` (index.html:267)
- `#alert-modal-overlay` → `#alert-modal-title` + `aria-describedby="alert-modal-message"` (index.html:283)
- `#confirm-modal-overlay` → `#confirm-modal-title` + `aria-describedby="confirm-modal-message"` (index.html:298)
- `#onboarding-modal-overlay` → `#onboarding-modal-title` (index.html:315)
- `#ownership-conflict-overlay` → `#ownership-conflict-title` + `aria-describedby` (index.html:388)
- `#model-modal-overlay` → `#model-modal-title` (index.html:405)
- `#settings-modal-overlay` → `#settings-modal-title` (index.html:565)
- `#ats-report-modal-overlay` → `#ats-report-modal-title` (index.html:676)
- `#job-analysis-modal-overlay` → `#job-analysis-modal-title` (index.html:692)

Dynamically-created dialogs:

- Bullet-reorder: `aria-labelledby="bullet-reorder-title"` set at bundle.js:4334 ✅
- Re-run confirm: `aria-labelledby="rerun-confirm-title"` (bundle.js:4084) ✅
- `confirmDialog`: `aria-labelledby="confirm-dialog-msg"` (bundle.js:1590) — uses message
  text as label rather than a dedicated heading (P3 concern, unchanged).

**US-X2 Acceptance criteria summary:**

| Criterion | Result |
| --- | --- |
| All major dialogs support correct focus entry | ✅ All modals pass |
| Focus trapped inside modal while open | ✅ All modals pass; P3 architecture note on nested modals |
| Focus restored to trigger on close | ✅ All modals pass |
| Dialog purpose exposed via ARIA labels | ✅ All modals pass |

---

### US-X3: Forms, Errors, and Review Controls

**Story:** Form validation, review controls, and inline editing affordances are accessible.

#### Criterion 1: Inputs with validation errors expose errors via accessible associations

Status: ⚠️ Partial — unchanged from cycle 7

Job-input fields use `_showFieldError`/`_clearFieldError` (bundle.js:10736, 10748) which set
`aria-invalid="true"/"false"` on the input element. The inputs carry `aria-required="true"`
and `aria-describedby` (bundle.js:10376, 10392, 10425) pointing to `paste-error`, `url-error`,
and `file-upload-error` respectively. `aria-live="polite"` live regions on those error spans
are present (bundle.js:10381, 10395). CSS at `styles.css:1532–1534` styles
`input[aria-invalid="true"]:focus` with a red border.

Remaining gaps (unchanged): Settings modal inputs (e.g., `#settings-llm-default-provider`,
`#settings-gen-max-skills`), master-cv form fields, and skill add inputs do not have
`aria-describedby` or `aria-invalid` wiring. Visual error messages in those areas are not
programmatically linked to their inputs.

All surveyed live regions pass:

- `#toast-container`: `aria-live="polite" aria-atomic="true"` (index.html:280) ✅
- `#document-content`: `aria-live="polite"` (index.html:231) ✅
- `#session-conflict-banner`: `role="alert"` (index.html:110) ✅
- `#onboarding-modal-status`: `aria-live="polite"` (index.html:369) ✅
- `#settings-status-msg`: `aria-live="polite"` (index.html:572) ✅
- `#model-auth-key-status`: `role="alert"` (index.html:476) ✅
- `#model-wizard-progress`: `role="status" aria-live="polite"` (index.html:419) ✅
- `#llm-busy-label`: `aria-live="polite" role="status"` (index.html:155) ✅

#### Criterion 2: Icon-only controls have descriptive labels

Status: ✅ Pass (upgraded from ⚠️ — GAP-35 resolved)

**GAP-35 resolved this cycle:** `#message-input` now carries `aria-label="Chat message"` at
`index.html:177`. The placeholder is no longer the only accessible name. ✅ FIXED

All icon-only controls confirmed labelled:

- Experience review icon-btns (emphasize/include/de-emphasize/exclude/reorder/move):
  `aria-label` with context (bundle.js:11686–11692) ✅
- Achievements review icon-btns: `aria-label` with context (bundle.js:12892, 12933) ✅
- `#rename-session-btn`: `aria-label="Rename this session"` (index.html:77) ✅
- `#toggle-chat`: `aria-label` (`"Collapse chat panel"` / `"Expand chat panel"`) and
  `aria-expanded` maintained dynamically (bundle.js:1824) ✅
- All 10 modal close × buttons: `aria-label` present (index.html:249, 271, 409, 569,
  680, 696; bundle.js:4353, 15607, 15673, et al.) ✅
- Session-table icon buttons (Load/Rename/Delete): use `title` attribute only, no `aria-label`
  (bundle.js:19567). `title` is AT-accessible but non-persistent on hover. Noted as P3.

#### Criterion 3: Inline edit/review actions have clear focus targets and visible focus states

Status: ✅ Pass

All primary interactive element classes have `:focus-visible` rules:

- `.icon-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` (styles.css:1197) ✅
- `.rw-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` (styles.css:1265) ✅
- `.sm-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` (styles.css:296) ✅
- `.tab:focus-visible` (styles.css:640) ✅
- `.step:focus-visible` (styles.css:144) ✅
- `.action-btn:focus-visible` (styles.css:593) ✅
- `.sm-th:focus-visible` (styles.css:261) ✅
- `.preview-output-badge-link:focus-visible` (styles.css:1398) ✅

Rewrite-review buttons carry `aria-pressed="false"` at render time (bundle.js:14290–14292)
and toggle to `"true"` on activation (bundle.js:14319, 14333, 14363). ✅

Remaining gap (P3, unchanged): `outline:none` on four input types:
`.q-input:focus` (styles.css:510), `.message-input:focus` (styles.css:579),
`.form-input:focus` (styles.css:755), and `.layout-instruction-textarea:focus`
(styles.css:1436) all suppress the outline and substitute a `box-shadow` focus indicator.
`box-shadow` is invisible in Windows High Contrast mode. No `:focus-visible` fallback present.

Additional gap noted this cycle: `.q-chip` (styles.css:506–508) has no `:focus-visible` rule.
`q-chip` elements are rendered as `<button>` elements (bundle.js:11327), so they receive
native browser focus outlines in most browsers. However, the global `*` reset (`* { margin:0;
padding:0; }` at styles.css:16) combined with no explicit `.q-chip:focus-visible` rule means
the focus style relies entirely on UA defaults, which vary and may be suppressed. P3 concern.

#### Criterion 4: Error and status messages exposed in live regions

Status: ✅ Pass

All eight identified dynamic regions carry either `aria-live` or `role="alert"/"status"`.
See Criterion 1 above for the complete list.

**US-X3 Acceptance criteria summary:**

| Criterion | Result |
| --- | --- |
| Validation and status feedback accessible to non-visual users | ⚠️ Job-input form wired; settings/master-cv fields lack `aria-invalid`; all live regions active |
| Review controls understandable/operable without pointer | ✅ Icon buttons labelled; `aria-pressed` maintained; `#message-input` now labelled |

---

## Generated Materials Evaluation

No changes to generated-materials analysis this cycle. Prior findings unchanged:

- Primary/heading text `#2c3e50` on white: ~11.5:1 contrast — passes WCAG AA ✅
- Body text `#333` on white: ~12:1 — passes ✅
- Muted text `#666` on white: ~5.7:1 — passes AA ✅
- Accent colour `#2980b9` on white: ~3.9:1 — marginally fails AA for small normal text (P3) ⚠️
- ATS DOCX: black text, Heading 1/2 paragraph styles — maximum contrast, semantic structure ✅
- Human DOCX: bold runs for headings rather than Word Heading paragraph styles — no semantic
  heading navigation for screen readers (P2, GAP-NEW-2) ⚠️

---

## Additional Story Gaps / Proposed Story Items

The following gaps remain open:

1. **GAP-NEW-2 (P2):** Human DOCX output uses bold runs for section headings rather than
   Word paragraph Heading styles. Screen reader navigation of DOCX depends on semantic
   heading structure. Proposed story: "As a hiring manager using assistive technology, I
   want section headings in the human-readable DOCX to use Word's Heading styles."

2. **P3 — `outline:none` without High Contrast fallback:** Four input types
   (`.q-input` styles.css:510, `.message-input` styles.css:579, `.form-input` styles.css:755,
   `.layout-instruction-textarea` styles.css:1436) remove the outline and substitute
   `box-shadow`, which is invisible in Windows High Contrast mode.

3. **P3 — `.q-chip` no `:focus-visible` rule:** `q-chip` buttons rely on UA default focus
   outline. Adding `.q-chip:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }`
   would provide consistent cross-browser behaviour.

4. **P3 — Single `_currentFocusTrapListener` slot:** Opening a nested modal replaces the
   outer focus trap. The shared slot in `ui-core.js` (`bundle.js:1311`) cannot stack traps.

5. **P3 — Emoji in tabs and steps not `aria-hidden`:** Tab and step labels contain emoji
   (e.g., 📋 Job, 🔍 Analysis) that are read aloud by screen readers. Wrapping them in
   `<span aria-hidden="true">` would improve announcements.

6. **P3 — `confirmDialog` missing explicit heading:** The inline confirm dialog uses
   `aria-labelledby="confirm-dialog-msg"` pointing to the `<p>` containing the message.
   A dedicated heading element would be better practice.

7. **P3 — Session-table icon buttons `title`-only:** Load/Rename/Delete buttons
   (bundle.js:19567) use `title` without `aria-label`. `title` is accessible but
   non-persistent on hover for AT users.

8. **P3 — Settings and Master CV form fields no `aria-invalid`:** Inputs in the Settings
   modal and Master CV editor do not use `aria-invalid` or `aria-describedby` for error
   messages. Visual errors only.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js,
web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/bundle.js

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-X1 | 4 | 0 | 0 | 0 | 0 |
| US-X2 | 4 | 0 | 0 | 0 | 0 |
| US-X3 | 3 | 1 | 0 | 0 | 0 |

**Key evidence references:**

GAP-35 resolution (`#message-input` label):

- `web/index.html:177` — `aria-label="Chat message"` now present ✅ FIXED

Remaining open findings:

- P2: GAP-NEW-2 — human DOCX heading structure
- P3: `outline:none` — `web/styles.css:510, 579, 755, 1436`
- P3: `.q-chip` missing `:focus-visible` — `web/styles.css` (no rule present)
- P3: Session icon buttons title-only — `web/bundle.js:19567`
- P3: Settings/MasterCV no `aria-invalid` — `web/index.html:579–633`
