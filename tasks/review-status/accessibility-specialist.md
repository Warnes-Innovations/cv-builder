<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review — CV-Builder Application

**Persona:** Accessibility Specialist
**Stories evaluated:** US-X1, US-X2, US-X3
**Cycle:** 5
**Source files read (cycle 5):** web/index.html, web/app.js, web/ui-core.js, web/ui-helpers.js,
web/state-manager.js, web/styles.css, web/review-table-base.js, web/workflow-steps.js,
web/master-cv.js, web/session-switcher-ui.js, web/ats-modals.js, web/skills-review.js
**Review date:** 2026-06-20

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Pass — criterion met, evidence cited |
| ⚠️ | Partial — partially met, gap identified |
| ❌ | Fail — criterion not met |
| 🔲 | Not Implemented |
| — | N/A |

---

## Cycle-5 Summary: What Changed Since Cycle 4

Cycle 5 re-reads all source files to verify whether cycle-4 findings have been addressed.
The following cycle-4 findings are now fixed:

| Cycle-4 Finding | Cycle-5 Status |
|---|---|
| No HTML landmark elements (`<main>`, `<nav>`, `<header>`) | ✅ FIXED |
| Tabpanel missing `aria-labelledby` | ✅ FIXED |
| `toggleChat` bundle collision (wrong function at runtime) | ✅ FIXED |
| Master CV modal: no focus entry, trap, or restore | ✅ FIXED |
| `showConfirmModal` has no focus trap | ✅ FIXED |
| `openAtsReportModal` has no focus trap | ✅ FIXED (confirmed cycle 4 fix still present) |
| `#settings-status-msg` lacks `aria-live` | ✅ FIXED |
| `#onboarding-modal-status` lacks `aria-live` | ✅ FIXED |
| `#model-auth-key-status` lacks live region | ✅ FIXED (now `role="alert"`) |
| `#session-conflict-banner` lacks live region | ✅ FIXED (now `role="alert"`) |

Remaining open items carried forward from cycle 4 (still unresolved):

- Workflow step pills #2–12 not keyboard-reachable (only `step-job` has `role="button" tabindex="0"`)
- `#message-input` has no accessible label (GAP-35)
- `#layout-freshness-chip` aria-label is now non-empty but semantically weak
- Category reorder buttons in skills-review.js still lack `aria-label`
- `openSessionsModal` still missing `setInitialFocus`
- Step states conveyed by colour only; no `.sr-only` text
- No `:focus-visible` CSS for `.tab`, `.action-btn`, `.step`

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

**Story:** Workflow-step bar and stage tabs are fully operable by keyboard and understandable
to assistive technologies.

#### Criterion 1: Workflow-step elements are reachable and operable by keyboard.

**⚠️ Partial — minor improvement: step-job now has role/tabindex; steps 2–12 still missing**

`web/index.html` lines 117–143: The workflow container is now a proper `<nav>` element with
`aria-label="Application workflow steps"`. This is a meaningful improvement for landmark
navigation.

`step-job` (index.html:119) now has `role="button"` and `tabindex="0"`. This is the first and
most commonly interacted step and is now keyboard-reachable.

Steps 2–12 (index.html:121–141) remain plain `<div>` elements with `onclick` handlers and no
`role`, `tabindex`, or `keydown` listener. `workflow-steps.js` adds/removes the CSS class
`clickable` on steps (line 701) but never adds `tabindex` or `role`.

**Fix required:** The function that adds `class="clickable"` to completed/active steps
(`workflow-steps.js` around line 688–714) should also add `tabindex="0"` and ensure the
element carries `role="button"` (or convert step divs to `<button>` elements in the HTML).
A keydown handler for Enter/Space is needed for all clickable steps.

#### Criterion 2: Stage tabs expose correct tab semantics, selected state, and panel association.

**✅ Pass — confirmed from cycle 4; tabpanel `aria-labelledby` now also fixed**

The tab bar (`index.html:199`) carries `role="tablist"` and `aria-label`. Each tab carries
`role="tab"`, `aria-selected`, `aria-controls`, and a roving `tabindex`. Arrow/Enter/Space
keyboard navigation is wired in `ui-core.js:516–540`.

`#document-content` (index.html:231) now has static `aria-labelledby="tab-job"` AND
`switchTab()` (review-table-base.js:133) dynamically updates it on every switch:
`tabpanel.setAttribute('aria-labelledby', 'tab-${tab}')`. This fully resolves the cycle-4
NEW-1 finding.

**Remaining quality note:** No `:focus-visible` CSS for `.tab` elements. Browser default
focus ring applies; invisible in Windows High Contrast mode (P3).

**Remaining quality note:** All tabs share `aria-controls="document-content"`. Technically
valid for the single-panel design.

#### Criterion 3: Active and completed states conveyed by more than colour alone.

**❌ Fail — no change**

Workflow step states (`active`, `completed`, `upcoming`, `stale`, `stale-critical`) are
conveyed exclusively through background/text colour (`styles.css:150–156`). The `<nav>` wrapper
now correctly identifies this as a navigation region, but the individual step state labels
provide no non-colour signal. No `.sr-only` text announces state.

#### Criterion 4: Changes in active stage or tab are programmatically determinable.

**⚠️ Partial — improved from cycle 4 (tabpanel aria-labelledby now wired)**

`document-content` has `aria-live="polite"` (`index.html:231`) and the tabpanel's
`aria-labelledby` is now dynamically updated on every tab switch. This means screen readers
can now determine the label of the current tabpanel. `aria-selected` changes are updated by JS
on every switch.

No dedicated live region announces workflow step changes, but the tab pattern now satisfies
the programmatic determinability requirement for the tab portion.

**US-X1 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| Keyboard-only users can move through workflow controls in logical order | ⚠️ step-job: ✅ fixed. Steps 2–12: ❌ still unreachable |
| Tabs expose selected/unselected state programmatically | ✅ Confirmed pass |
| Active workflow position perceivable without colour vision | ❌ Colour-only; no change |

---

### US-X2: Modal and Dialog Accessibility

**Story:** Modal dialogs manage focus correctly and remain usable with screen readers.

#### Criterion 1: Opening a modal moves focus into it.

**⚠️ Partial — significant improvement from cycle 4**

Fixed in this cycle:
- `openMasterCvModal()` (`master-cv.js:2475–2484`): now saves `_focusedElementBeforeModal`,
  calls `setInitialFocus('master-cv-modal-overlay')`, and calls `trapFocus('master-cv-modal-overlay')`. ✅

Confirmed passing (unchanged from cycle 4):
- `confirmDialog`: `okBtn.focus()` immediately on open (`ui-core.js:409`). ✅
- `openAtsReportModal`: focuses Close button (`ats-modals.js:124–125`). ✅
- `showConfirmModal`: focuses OK button (`ui-helpers.js:49`). ✅
- `openSettingsModal`: calls `setInitialFocus` (`ui-core.js:244`). ✅
- `openModelModal`: calls `setInitialFocus` (`ui-core.js:1509`). ✅

Remaining gaps:
- `openSessionsModal` (`session-switcher-ui.js:445–458`): saves
  `window._focusedElementBeforeModal = document.activeElement` (line 454) and calls
  `trapFocus('sessions-modal-overlay')` (line 457) but does NOT call `setInitialFocus`.
  Focus stays wherever it was before the modal opened. The user can Tab into the modal,
  but focus does not move there automatically. (P2)

#### Criterion 2: Focus is trapped inside the modal while it is open.

**✅ Pass — fully resolved in this cycle**

`trapFocus` is now wired for: Settings, Model, Sessions, Master CV, ATS Report, and static
Confirm modals. `confirmDialog` has its own inline two-button trap (`ui-core.js:412–422`).
`showAlertModal` calls `trapFocus('alert-modal-overlay')` (`ui-helpers.js:27`).
`showConfirmModal` now calls `trapFocus('confirm-modal-overlay')` (`ui-helpers.js:50`). ✅

**Remaining quality note:** Single `_currentFocusTrapListener` cannot handle nested modals;
opening a sub-modal from within a modal removes the outer trap. Sub-modals in master-cv.js
use `setInitialFocus` + `trapFocus` for each, so the pattern is understood but the single
listener slot remains an architectural gap (P3).

#### Criterion 3: Closing a modal restores focus to the triggering control.

**✅ Pass — fully resolved in this cycle**

All major modal close paths now restore focus:
- `closeMasterCvModal()` calls `restoreFocus()` (`master-cv.js:2492`). ✅
- `closeSettingsModal()` calls `restoreFocus()` (`ui-core.js:252`). ✅
- `closeSessionsModal()` calls `restoreFocus()` (`session-switcher-ui.js:465`). ✅
- `closeAtsReportModal()` calls `restoreFocus()` + falls back to `_atsModalPreviousFocus.focus()` (`ats-modals.js:159–163`). ✅
- `closeConfirmModal()` calls `restoreFocus()` + falls back to `_confirmPreviousFocus.focus()` (`ui-helpers.js:56–61`). ✅
- `closeAlertModal()` calls `restoreFocus()` (`ui-helpers.js:32`). ✅
- `confirmDialog` restores `previousFocus` in `finish()` (`ui-core.js:430–431`). ✅

#### Criterion 4: Dialog title and purpose are programmatically exposed.

**✅ Pass — no change from cycle 4**

All `role="dialog"` overlays carry `aria-modal="true"` and `aria-labelledby` pointing to a
heading element. The dynamically-created `confirmDialog` carries `role="dialog"`, `aria-modal`,
and `aria-labelledby`. This criterion fully passes.

**US-X2 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| All major dialogs support correct focus entry | ⚠️ Sessions modal still missing `setInitialFocus` |
| Focus trapped inside modal | ✅ All major modals now trapped |
| Focus restored to trigger on close | ✅ All major modals now restore focus |
| Dialog purpose exposed via ARIA labels | ✅ All dialogs labelled |

---

### US-X3: Forms, Errors, and Review Controls

**Story:** Form validation, review controls, and inline editing affordances are accessible.

#### Criterion 1: Inputs with validation errors expose errors via accessible associations.

**⚠️ Partial — improved from cycle 4 for live regions; JS error linkage still absent**

Improvements in cycle 5:
- `#settings-status-msg` now has `aria-live="polite"` (`index.html:572`). ✅
- `#onboarding-modal-status` now has `aria-live="polite"` (`index.html:369`). ✅
- `#model-auth-key-status` now has `role="alert"` (`index.html:476`). ✅
- `#session-conflict-banner` now has `role="alert"` (`index.html:110`). ✅

Remaining gaps:
- CSS exists for `input[aria-invalid="true"]` (`styles.css:1524–1528`). No JS in the
  surveyed source files sets `aria-invalid="true"` on inputs.
- No `aria-errormessage` or `aria-describedby` links any error element to its input.
- `#llm-busy-label` (`index.html:155`) has no `aria-live` or `role`. The LLM busy overlay
  announces state changes ("Reasoning…") that are not programmatically exposed to AT.

#### Criterion 2: Icon-only controls have descriptive labels.

**⚠️ Partial — improved from cycle 4; one P2 issue and one P3 issue remain**

Confirmed passing (unchanged or fixed):
- `#rename-session-btn`: `aria-label="Rename this session"` (`index.html:77`). ✅
- `#toggle-chat`: `aria-label="Collapse chat panel"` and `aria-expanded="true"` set as initial
  values (`index.html:149`). The bundle collision is resolved — `toggleChat` is exported only
  from `ui-core.js` (line 2004); `ui-helpers.js` no longer exports it. `toggleChat()` in
  `ui-core.js:696–697` correctly updates `aria-label` and `aria-expanded` on every call. ✅
- All 6 modal close `×` buttons: `aria-label` attributes present. ✅

Remaining issues:
- **`#layout-freshness-chip`** (`index.html:95`): The static `aria-label` attribute is now
  `"Layout freshness"` (no longer empty). However, this static value does not reflect the
  actual freshness state ("Layout is fresh", "Layout is stale — regenerate before download",
  etc.). `refreshLayoutStatusUI()` in `ui-helpers.js:91` does call
  `layoutChip.setAttribute('aria-label', freshness.ariaLabel || '')` on every state change,
  so the accessible name updates dynamically. If `freshness.ariaLabel` is always populated
  by the state manager, this is effectively fixed. If `freshness.ariaLabel` can be empty or
  undefined, the fallback `''` produces an empty label. **Status: ⚠️ Conditional pass** —
  depends on whether `stateManager.getLayoutFreshness()` always returns a non-empty
  `ariaLabel`. Source evidence in `ui-helpers.js:91` shows the attribute is set dynamically;
  `|| ''` fallback remains a risk if the state is not populated. (P2)
- **Category reorder buttons** (`skills-review.js:423–424`): The `↑`/`↓` buttons carry
  `title` attributes ("Move category up/down") but no `aria-label`. WCAG SC 4.1.2 requires
  an accessible name; `title` is advisory only and unreliable with screen readers. (P2)
- **`#message-input`** (`index.html:177`): still has no `<label>`, no `aria-label`, no
  `aria-labelledby`. Placeholder text `"Type a message (e.g., 'analyze job')"` is not a
  WCAG-compliant label. (P1, GAP-35 — not fixed)

#### Criterion 3: Inline edit/review actions have clear focus targets and visible focus states.

**⚠️ Partial — no change from cycle 4**

Five element types use `outline: none` with box-shadow substitute:
`.message-input` (styles.css:577), `.form-input` (styles.css:749), `.q-input` (styles.css:508),
and `.layout-instruction-textarea` (if present). The box-shadow substitute is invisible in
Windows High Contrast mode.

Only two elements in the entire stylesheet have `:focus-visible` rules:
- `.sm-th:focus-visible` (`styles.css:260`)
- `.preview-output-badge-link:focus-visible` (`styles.css:1390`)

No `:focus-visible` rule exists for `.tab`, `.step`, `.action-btn`, `.toggle-chat`, or other
interactive elements.

#### Criterion 4: Error and status messages exposed in live regions.

**⚠️ Partial — significantly improved from cycle 4**

Passing in cycle 5:
- `#toast-container`: `aria-live="polite" aria-atomic="true"` (`index.html:280`). ✅
- `#document-content`: `aria-live="polite"` (`index.html:231`). ✅
- `#session-conflict-banner`: `role="alert"` (`index.html:110`). ✅
- `#onboarding-modal-status`: `aria-live="polite"` (`index.html:369`). ✅
- `#settings-status-msg`: `aria-live="polite"` (`index.html:572`). ✅
- `#model-auth-key-status`: `role="alert"` (`index.html:476`). ✅
- `#model-wizard-progress`: `role="status" aria-live="polite"` (`index.html:419`). ✅

Remaining gap:
- `#llm-busy-label` (`index.html:155`): announces LLM thinking state ("Reasoning…",
  "Taking longer than usual") but carries neither `aria-live` nor `role="status"`.
  Screen reader users receive no notification when the LLM busy overlay appears or its
  message changes.

**US-X3 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| Validation and status feedback accessible to non-visual users | ⚠️ Live regions improved; `aria-invalid`/`aria-errormessage` JS wiring still absent; `#llm-busy-label` still not live |
| Review controls understandable/operable without pointer | ⚠️ toggle-chat aria now correct; message-input still unlabelled; category reorder buttons lack aria-label |

---

## Generated Materials Evaluation

N/A — no change from cycle 2. Generated output (PDF/DOCX) cannot be evaluated from source
code alone. The HTML-to-PDF pipeline uses semantic heading structure. No PDF/UA tagging or
DOCX accessibility properties found.

---

## Terminology and ARIA Consistency Observations

1. **`#layout-freshness-chip` dynamic aria-label** (`ui-helpers.js:91`): The attribute is
   set to `freshness.ariaLabel || ''`. If `freshness.ariaLabel` is an empty string or
   undefined (which can occur before state is loaded), the button has no accessible name.
   Recommend adding a safe non-empty fallback: `freshness.ariaLabel || 'Layout status'`.

2. **Emoji in interactive labels without `aria-hidden`**: All 12 workflow steps
   (`index.html:119–141`) and 24 visible tabs (`index.html:200–225`) include emoji directly
   in text content. Screen readers announce these as full descriptions (e.g., "inbox tray
   Job Input", "bar chart Experiences"). Adding `aria-hidden="true"` to emoji spans would
   reduce noise.

3. **Step 1 partial keyboard fix**: Only `step-job` has `role="button" tabindex="0"`.
   Steps 2–12 do not. If users can reach `step-job` by keyboard but then cannot Tab
   to subsequent steps, it creates a misleading and incomplete navigation model.

4. **`confirmDialog` aria-labelledby points to message text**: The dynamically-created
   `confirmDialog` (`ui-core.js:386`) labels the dialog with `aria-labelledby="confirm-dialog-msg"`,
   which announces the full message text as the dialog name. The static confirm modal
   (`#confirm-modal-overlay`) correctly uses a dedicated `<h2 id="confirm-modal-title">` as its
   label. This inconsistency between the two confirm patterns is a minor semantic issue (P3).

5. **Session conflict banner is now a proper live region** (`role="alert"`). The button labels
   within it ("↺ Retry Now" for `#conflict-retry-btn` and "✕" for dismiss) are adequate
   (`title="Retry now"` and `aria-label="Dismiss notification"` respectively). ✅

---

## Summary Table

| Story | Criterion | Cycle 4 | Cycle 5 | Change |
|-------|-----------|---------|---------|--------|
| US-X1 | Workflow steps keyboard reachable | ❌ | ⚠️ | step-job fixed; steps 2–12 still unreachable |
| US-X1 | Tab semantics and selected state | ✅ | ✅ | Confirmed pass |
| US-X1 | State conveyed beyond colour | ❌ | ❌ | No change |
| US-X1 | Stage changes programmatically determinable | ⚠️ | ⚠️ | Tabpanel aria-labelledby now fixed; partial improvement |
| US-X2 | Focus moved into modal on open | ⚠️ | ⚠️ | Master CV fixed; Sessions modal still missing setInitialFocus |
| US-X2 | Focus trapped inside modal | ⚠️ | ✅ | **All major modals now trapped** |
| US-X2 | Focus restored on close | ⚠️ | ✅ | **All major modals now restore focus** |
| US-X2 | Dialog title/purpose exposed | ✅ | ✅ | Confirmed pass |
| US-X3 | Validation errors accessible | ⚠️ | ⚠️ | Live regions improved; aria-invalid JS wiring still absent |
| US-X3 | Icon-only controls labelled | ⚠️ | ⚠️ | toggleChat fixed; message-input and category reorder still missing |
| US-X3 | Focus states visible and reliable | ⚠️ | ⚠️ | No change |
| US-X3 | Status messages in live regions | ⚠️ | ⚠️ | Significantly improved; llm-busy-label still missing |

---

## Prioritised Findings (Cycle 5)

### P1 — Critical (active screen-reader failures)

1. **`#message-input` has no accessible label** (GAP-35, `index.html:177`): No `<label>`,
   no `aria-label`, no `aria-labelledby`. Placeholder text is not a WCAG 1.3.1 / 3.3.2
   compliant label. Screen readers may announce the placeholder inconsistently.
   **Fix:** Add `aria-label="Send a message to the CV assistant"` or a visually-hidden
   `<label for="message-input">` before the input.

2. **Workflow step pills #2–12 not keyboard-reachable** (`index.html:121–141`):
   11 of 12 step `<div>` elements have `onclick` handlers but no `role`, `tabindex`, or
   `keydown` listener. Only `step-job` is fixed. When `updateWorkflowStepsClickable` adds
   `class="clickable"` to completed steps (`workflow-steps.js:701`), it should also
   set `tabindex="0"` and ensure `role="button"` is present.
   **Fix:** In `workflow-steps.js`, when setting `el.classList.add('clickable')`, also add
   `el.setAttribute('tabindex', '0')` and `el.setAttribute('role', 'button')`. On removal
   of `clickable`, set `tabindex="-1"`. Add a one-time `keydown` handler for Enter/Space.

### P2 — High (WCAG 2.1 AA incomplete)

3. **`openSessionsModal` missing `setInitialFocus`** (`session-switcher-ui.js:445–458`):
   `trapFocus` is called but focus does not move into the modal. Users must Tab to enter.
   **Fix:** Add `setInitialFocus('sessions-modal-overlay')` after `trapFocus` on line 457.

4. **Category reorder buttons lack `aria-label`** (`skills-review.js:423–424`):
   The `↑`/`↓` buttons carry `title` only. WCAG SC 4.1.2 requires an accessible name.
   **Fix:** Change `title="Move category up"` to `aria-label="Move ${category} category up"`
   (matching the pattern used for skill-row buttons at lines 772–773).

5. **`#llm-busy-label` has no live region** (`index.html:155`): LLM state changes
   ("Reasoning…", "Taking longer than usual") are visually prominent but not announced.
   **Fix:** Add `aria-live="polite"` (or `role="status"`) to `#llm-busy-label`.

6. **`#layout-freshness-chip` aria-label fallback may be empty** (`ui-helpers.js:91`):
   The `|| ''` fallback creates an empty accessible name if `freshness.ariaLabel` is not
   populated. **Fix:** Change the fallback to `|| 'Layout status'` as a minimum safe label.

### P3 — Medium (quality / WCAG AA coverage)

7. **No `:focus-visible` rule for `.tab` elements** (`styles.css`): Browser default focus
   ring applies; invisible in Windows High Contrast mode. Add an explicit rule matching
   `.tab:focus-visible { outline: 2px solid #3b82f6; outline-offset: -2px; }`.

8. **Workflow step state conveyed by colour only** (`styles.css:150–156`): Add `.sr-only`
   text inside each step for its state (e.g., "completed", "active"), updated by JS when
   state changes.

9. **`outline: none` without `:focus-visible` fallback** on four input types
   (`.message-input` styles.css:577, `.form-input` styles.css:749, `.q-input` styles.css:508).
   Replace with `:focus-visible` pattern.

10. **Single `_currentFocusTrapListener` cannot handle nested modals**: Refactor to a stack
    to prevent the inner modal's `trapFocus` call from removing the outer trap.

11. **Emoji in tabs and steps without `aria-hidden`** on emoji spans: Add
    `aria-hidden="true"` to emoji spans to reduce screen reader noise.

12. **`confirmDialog` aria-labelledby points to message text** (`ui-core.js:386`): Minor
    semantic issue — the dynamic confirm uses the message text as the dialog name rather
    than a dedicated heading. The static confirm modal (index.html:299–304) uses a proper
    `<h2 id="confirm-modal-title">` and serves as the correct pattern to follow.

---

## Cycle Progression Summary

| Cycle | Major Work Done |
|-------|----------------|
| 1–2 | Baseline; identified full set of WCAG failures |
| 3 | Tab keyboard access (GAP-120); confirmDialog ARIA (GAP-34); icon labels partial (GAP-140) |
| 4 | New: landmark structure, tabpanel labelling, master CV modal, sessions modal trap, category reorder finding |
| 5 | **FIXED:** Landmark elements, tabpanel aria-labelledby, toggleChat collision, master CV focus full lifecycle, showConfirmModal trap, four live region elements. Remaining: message-input label, steps 2–12 keyboard, sessions setInitialFocus, category reorder aria-label, llm-busy-label live region |
