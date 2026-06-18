<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review — CV-Builder Application

**Persona:** Accessibility Specialist
**Stories evaluated:** US-X1, US-X2, US-X3
**Cycle:** 3
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/ui-helpers.js,
web/review-table-base.js, web/ats-modals.js, web/bundle.js, web/styles.css,
web/workflow-steps.js
**Review date:** 2026-06-18

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

## Cycle-3 Focus: Recent a11y Fixes (GAP-120, GAP-34, GAP-143, GAP-129, GAP-140, GAP-35)

### GAP-120 — Tab Keyboard Access

**Status: ✅ FIXED (HTML + JS both correct)**

Evidence:

- `web/index.html` lines 200–225: ALL tab `<div>` elements carry `tabindex` attributes.
  Active tab: `tabindex="0"` (`tab-job`, line 200). All others: `tabindex="-1"` (lines 201–225).

- `web/ui-core.js` lines 516–521: Enter/Space keydown handler present alongside Arrow key handler:
  ```js
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.target.click();
    return;
  }
  ```
  Arrow/Home/End navigation wired at lines 524–540.

- `web/review-table-base.js:switchTab()` lines 122–131: sets `tabindex="-1"` on all tabs, then
  `tabindex="0"` on the newly active tab on every switch. Also sets `aria-selected` accordingly.

- `web/bundle.js` lines 3421–3428 and 1678–1699 confirm the same logic appears in the built
  artifact (today's build, Jun 18).

**Remaining concern:** `.tab` elements still have no `:focus-visible` CSS rule
(`web/styles.css` lines 624–636 cover only `:hover` and `.active`). Browser-default focus ring
applies to `<div tabindex>` elements; behaviour is inconsistent across browsers and invisible
in Windows High Contrast mode. Not a regression from cycle 2 — still open as a P3 item.

---

### GAP-34 — confirmDialog ARIA

**Status: ✅ FIXED**

Evidence from `web/ui-core.js` lines 385–437:

- `role="dialog"` on the dialog box div (line 385). ✅
- `aria-modal="true"` on the dialog box div (line 385). ✅
- `aria-labelledby="confirm-dialog-msg"` (line 386). ✅ (label derived from message text; no
  separate heading element is present, which is unusual but technically valid per ARIA spec.)
- `okBtn.focus()` called immediately after `overlay.style.display = 'flex'` (line 409). ✅
- Escape key handler: `overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(false); }, { once: true })` (line 437). ✅
- Previous focus saved as `previousFocus = document.activeElement` (line 374) and restored via
  `previousFocus.focus()` in `finish()` (lines 430–431). ✅

**Minor note:** `aria-labelledby` points to the `<p id="confirm-dialog-msg">` element (the
message text) rather than a separate heading. The dialog is technically labelled but screen
readers will announce the full message text as the dialog name. Adding a visually hidden
`<h2 id="confirm-dialog-title">Confirm</h2>` and changing `aria-labelledby` to that would
be cleaner semantics (P3 quality item).

---

### GAP-143 — showConfirmModal Focus Management

**Status: ✅ FIXED (focus entry and restore; focus trap still absent)**

Evidence from `web/ui-helpers.js` lines 39–60:

- `_confirmPreviousFocus = document.activeElement` saved before open (line 43). ✅
- `okBtn.focus()` called after making modal visible (line 49). ✅
- `_confirmPreviousFocus.focus()` called in `closeConfirmModal` (lines 56–58). ✅

**Remaining gap:** `showConfirmModal` does not call `trapFocus()`. A Tab press while the
confirm modal is open can move focus behind it to background content. The global ESC handler
(`ui-core.js:558–562`) will call `closeAllModals()` so Escape dismissal works. However
Tab-based focus escape remains unguarded. This is a P2 issue (incomplete focus trap for the
static confirm modal).

---

### GAP-129 — ATS Modal Focus Management

**Status: ✅ FIXED (focus entry, Escape, and restore; focus trap still absent)**

Evidence from `web/ats-modals.js` lines 108–161:

- `_atsModalPreviousFocus = document.activeElement` saved before open (line 119). ✅
- `closeBtn = overlay.querySelector('.modal-footer .action-btn')` focused on open (lines
  124–125). The Close button at `web/index.html:679` matches this selector. ✅
- `_atsEscapeHandler` (lines 114–115) wired via `document.addEventListener('keydown', ...)` at
  line 122. ✅
- `_atsModalPreviousFocus.focus()` called in `closeAtsReportModal` (lines 158–159). ✅

**Remaining gap:** `openAtsReportModal` does not call `trapFocus()`. Tab can escape the ATS
modal to background content. Same P2 issue as showConfirmModal.

---

### GAP-140 — aria-label on Icon Controls

**Status: ⚠️ PARTIAL — HTML correct; runtime behaviour broken by bundle collision**

**What is fixed in HTML:**

- `#rename-session-btn` (`index.html:77–78`): `aria-label="Rename this session"`. ✅
- `#toggle-chat` (`index.html:149`): `aria-label="Collapse chat panel"` and
  `aria-expanded="true"` set as initial values. ✅
- All 6 modal close `×` buttons carry `aria-label` attributes:
  - Sessions close-X (`index.html:249`): `aria-label="Close sessions panel"`. ✅
  - Master CV close-btn (`index.html:271`): `aria-label="Close Master CV editor"`. ✅
  - Model wizard close-btn (`index.html:402`): `aria-label="Close model selector"`. ✅
  - Settings close-btn (`index.html:562`): `aria-label="Close settings"`. ✅
  - ATS Report close-btn (`index.html:673`): `aria-label="Close ATS report"`. ✅
  - Job Analysis close-btn (`index.html:689`): `aria-label="Close job analysis"`. ✅

**What is broken at runtime — toggleChat aria update:**

`web/ui-core.js:toggleChat()` (lines 684–705) correctly updates `aria-label` and
`aria-expanded` on every invocation (lines 696–697). However, the bundle exposes TWO
definitions of `toggleChat`:

- `toggleChat` from `ui_core_exports` (bundle line 1802, 1304) — updates aria attributes. ✅
- `toggleChat2` from `ui_helpers_exports` (bundle lines 5897, 5841) — does NOT update
  aria attributes; only changes `textContent` of the button.

The `Object.assign(globalThis, ...)` call (bundle lines 19737–19783) lists
`ui_helpers_exports` AFTER `ui_core_exports` (line 19744 vs. 19748). Last writer wins:
**`globalThis.toggleChat` is `toggleChat2`**, the broken version.

Result: clicking the `◀/▶` button calls `toggleChat2`, which sets `textContent` only. After
the first toggle, `aria-expanded` remains `"true"` and `aria-label` remains
`"Collapse chat panel"` regardless of actual state. The initial HTML values are permanently
stale from that point.

**Fix required:** Either (a) remove `toggleChat` from `ui_helpers_exports` so that only the
`ui-core.js` version is exported, or (b) move the aria-attribute updates into the
`ui-helpers.js` version. The source-of-truth fix is (a): `ui-helpers.js` line 84–98 implements
a duplicate `toggleChat` that should be deleted or not exported.

---

### GAP-35 — Message Input Accessible Label

**Status: ❌ NOT FIXED**

`web/index.html` line 177:
```html
<input type="text" class="message-input" id="message-input"
  placeholder="Type a message (e.g., 'analyze job')" />
```

No `<label for="message-input">`, no `aria-label`, no `aria-labelledby`. The placeholder
text is not a valid substitute for an accessible label (WCAG 1.3.1, Success Criterion 3.3.2).
Screen readers may announce the placeholder, but this is inconsistent across AT and disappears
once the user types.

**Fix required:** Add either `<label for="message-input" class="sr-only">Message</label>`
before the input, or `aria-label="Send a message to the CV assistant"` on the input element.

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

**Story:** Workflow-step bar and stage tabs are fully operable by keyboard and understandable
to assistive technologies.

#### Criterion 1: Workflow-step elements are reachable and operable by keyboard.

**❌ Fail — no change from cycle 2**

The 12 workflow-step pills (`index.html:119–141`) are plain `<div>` elements with `onclick`
handlers. They carry no `role`, no `tabindex`, and no `aria-*` attributes. Only `step-job`
has class `clickable` (a visual-only class). No keydown handler exists.

`web/workflow-steps.js` does not add `tabindex` or `role` to step elements.

Missing: `tabindex="0"`, `role="button"` (or conversion to `<button>`), `keydown` handler for
Enter/Space, and a visible focus ring on `.step`.

#### Criterion 2: Stage tabs expose correct tab semantics, selected state, and panel association.

**✅ Pass (GAP-120 fixed)**

The tab bar (`index.html:199`) carries `role="tablist"` and `aria-label`. Each tab carries
`role="tab"`, `aria-selected`, `aria-controls`, and a roving `tabindex`. The panel carries
`role="tabpanel"`. `switchTab()` updates `aria-selected` and `tabindex` on each switch.
Arrow/Enter/Space keyboard navigation is wired.

**Remaining quality note:** All tabs share `aria-controls="document-content"`. Technically
valid for a single-panel design; semantically unusual. No change from cycle 2.

**Remaining quality note:** No `:focus-visible` CSS for `.tab` elements. Browser default focus
ring applies; invisible in Windows High Contrast mode.

#### Criterion 3: Active and completed states conveyed by more than colour alone.

**❌ Fail — no change from cycle 2**

Workflow-step states (`active`, `completed`, `upcoming`, `stale`, `stale-critical`) are
conveyed exclusively through background/text colour (`styles.css:150–156`). No `.sr-only`
text announces state. Tab `.active` state is colour + border only.

#### Criterion 4: Changes in active stage or tab are programmatically determinable.

**⚠️ Partial — no change from cycle 2**

`document-content` has `aria-live="polite"` (`index.html:231`). `aria-selected` changes are
updated by JS but only determinable if the screen reader has focus on the tab (now reachable
via keyboard since GAP-120 fix). No dedicated live region announces step/tab changes.

**US-X1 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| Keyboard-only users can move through workflow controls in logical order | ⚠️ Tabs: ✅ fixed. Steps: ❌ still unreachable |
| Tabs expose selected/unselected state programmatically | ✅ Fixed (GAP-120) |
| Active workflow position perceivable without colour vision | ❌ Colour-only; no change |

---

### US-X2: Modal and Dialog Accessibility

**Story:** Modal dialogs manage focus correctly and remain usable with screen readers.

#### Criterion 1: Opening a modal moves focus into it.

**⚠️ Partial — improved since cycle 2**

Improvements since cycle 2:
- `confirmDialog` now has `role="dialog"`, `aria-modal`, `aria-labelledby`, and `okBtn.focus()`
  (GAP-34). ✅
- `openAtsReportModal` now focuses the Close button (GAP-129). ✅
- `showConfirmModal` now focuses the OK button and saves/restores previous focus (GAP-143). ✅

Remaining gaps:
- `openMasterCvModal` (`master-cv.js`) — calls neither `setInitialFocus` nor `trapFocus`.
  Not reviewed this cycle (file not in scope), but noted as unresolved from cycle 2.
- `openSessionsModal` — saves focus but does not call `setInitialFocus`.

#### Criterion 2: Focus is trapped inside the modal while it is open.

**⚠️ Partial — no change for most modals**

`trapFocus` is wired for: Settings, Model, and Sessions modals. `confirmDialog` has its own
two-button trap (lines 411–420 of `ui-core.js`). ✅

`showConfirmModal` (static confirm overlay) does NOT call `trapFocus`. Tab can escape to
background content. (P2)

`openAtsReportModal` does NOT call `trapFocus`. Tab can escape to background content. (P2)

#### Criterion 3: Closing a modal restores focus to the triggering control.

**⚠️ Partial — improved since cycle 2**

`closeConfirmModal` now restores `_confirmPreviousFocus` (GAP-143). ✅
`closeAtsReportModal` now restores `_atsModalPreviousFocus` (GAP-129). ✅
`confirmDialog` restores `previousFocus` via `finish()` (GAP-34). ✅

Remaining gap: `closeMasterCvModal` does not restore focus (not reviewed this cycle; noted
from cycle 2).

#### Criterion 4: Dialog title and purpose are programmatically exposed.

**✅ Pass — no change from cycle 2**

All `role="dialog"` overlays carry `aria-modal="true"` and `aria-labelledby`. The
dynamically created `confirmDialog` overlay now also carries `role="dialog"`, `aria-modal`,
and `aria-labelledby` (GAP-34 fix). This criterion now fully passes.

**US-X2 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| All major dialogs support correct focus entry | ⚠️ Most fixed; Master CV modal still unresolved |
| Focus trapped inside modal | ⚠️ confirmDialog (static) and ATS modal still untrapped |
| Focus restored to trigger on close | ⚠️ Master CV modal still unresolved |
| Dialog purpose exposed via ARIA labels | ✅ All dialogs labelled |

---

### US-X3: Forms, Errors, and Review Controls

**Story:** Form validation, review controls, and inline editing affordances are accessible.

#### Criterion 1: Inputs with validation errors expose errors via accessible associations.

**⚠️ Partial — no change from cycle 2**

CSS exists for `input[aria-invalid="true"]` (`styles.css:1524–1528`). No `aria-errormessage`
or `aria-describedby` wiring in HTML or JS. Status message elements (`#settings-status-msg`,
`#onboarding-modal-status`, `#model-auth-key-status`) lack `aria-live` or `role="alert"`.

#### Criterion 2: Icon-only controls have descriptive labels.

**⚠️ Partial — improved since cycle 2 (GAP-140 partially fixed)**

Fixed:
- `#rename-session-btn`: `aria-label="Rename this session"` (`index.html:77`). ✅
- `#toggle-chat`: initial `aria-label="Collapse chat panel"` and `aria-expanded="true"`
  (`index.html:149`). ✅ (but see bundle collision note for GAP-140 — runtime update broken)
- All 6 modal close `×` buttons: `aria-label` attributes present. ✅

Remaining issues:
- `#toggle-chat` aria attributes become stale after first click due to bundle collision
  (GAP-140, `ui-helpers.js` `toggleChat` overrides `ui-core.js` version at runtime).
- `#layout-freshness-chip` (`index.html:95`): `aria-label=""` empty static attribute
  overrides JS-set text content. P1 screen-reader failure still open.
- `#message-input` (`index.html:177`): no accessible label (GAP-35). ❌ Not fixed.
- LLM status icon (`#llm-status-icon`, line 56): emoji `⚠` with no `aria-hidden`; screen
  reader reads "warning sign" in addition to the status label text.

#### Criterion 3: Inline edit/review actions have clear focus targets and visible focus states.

**⚠️ Partial — no change from cycle 2**

Five element types use `outline: none` with box-shadow substitute: `.message-input`,
`.form-input`, `.q-input`, `.intake-field-row input`, `.layout-instruction-textarea`. The
box-shadow substitute is invisible in Windows High Contrast mode.

`:focus-visible` rules exist only for `.sm-th` and `.preview-output-badge-link`. No
`:focus-visible` rule for `.tab`, `.step`, `.action-btn`, or other interactive elements.

#### Criterion 4: Error and status messages exposed in live regions.

**⚠️ Partial — no change from cycle 2**

Passing: `#toast-container` (`aria-live="polite" aria-atomic="true"`) and `#document-content`
(`aria-live="polite"`) are correctly marked.

Missing live regions: `#settings-status-msg`, `#onboarding-modal-status`,
`#model-auth-key-status`, `#session-conflict-banner`, `#llm-busy-label`.

**US-X3 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| Validation and status feedback accessible to non-visual users | ⚠️ aria-invalid styled; no aria-errormessage; several status elements lack live regions |
| Review controls understandable/operable without pointer | ⚠️ Improved; toggle-chat aria stale at runtime; message-input unlabelled; layout-chip empty label |

---

## Generated Materials Evaluation

N/A — no change from cycle 2. Generated output (PDF/DOCX) cannot be evaluated from source
code alone. The HTML-to-PDF pipeline uses semantic heading structure. No PDF/UA tagging or
DOCX accessibility properties found.

---

## Terminology and ARIA Consistency Observations

1. **Bundle collision on `toggleChat`** (NEW in cycle 3): `ui-helpers.js` exports a duplicate
   `toggleChat` that does not update aria attributes. Because `ui_helpers_exports` is spread
   into `globalThis` after `ui_core_exports`, the wrong function is called at runtime.
   `web/ui-helpers.js` line 84 and line 178 should remove `toggleChat` from its export list.

2. **`aria-label=""` on `#layout-freshness-chip`** (`index.html:95`): The empty static
   attribute overrides any visible text set by JS. This is an active screen-reader failure.
   Either remove the attribute, or update it in every code path that sets the chip's content.

3. **Screen reader emoji noise**: Workflow steps (`index.html:119–141`) and tabs
   (`index.html:200–225`) include emoji in their visible labels (e.g., "📥 Job Input"). Screen
   readers announce these as "inbox tray Job Input". Adding `aria-hidden="true"` to emoji
   spans would eliminate the noise.

4. **Duplicate `aria-controls` values**: All 18+ tabs point to `aria-controls="document-content"`.
   Unusual but technically valid for a single-panel design.

5. **Message input label absent**: `#message-input` has no `<label>`, no `aria-label`, no
   `aria-labelledby`. Placeholder text is not a WCAG-compliant label substitute.

---

## Summary Table

| Story | Criterion | Cycle 2 | Cycle 3 | Change |
|-------|-----------|---------|---------|--------|
| US-X1 | Workflow steps keyboard reachable | ❌ | ❌ | No change |
| US-X1 | Tab semantics and selected state | ⚠️ | ✅ | **Fixed (GAP-120)** |
| US-X1 | State conveyed beyond colour | ❌ | ❌ | No change |
| US-X1 | Stage changes programmatically determinable | ⚠️ | ⚠️ | No change |
| US-X2 | Focus moved into modal on open | ⚠️ | ⚠️ | Improved (GAP-34, 143, 129) |
| US-X2 | Focus trapped inside modal | ⚠️ | ⚠️ | Improved (GAP-34 trap fixed) |
| US-X2 | Focus restored on close | ⚠️ | ⚠️ | Improved (GAP-34, 143, 129) |
| US-X2 | Dialog title/purpose exposed | ✅ | ✅ | No change |
| US-X3 | Validation errors accessible | ⚠️ | ⚠️ | No change |
| US-X3 | Icon-only controls labelled | ❌ | ⚠️ | Improved (GAP-140 partial) |
| US-X3 | Focus states visible and reliable | ⚠️ | ⚠️ | No change |
| US-X3 | Status messages in live regions | ⚠️ | ⚠️ | No change |

---

## Prioritised Findings

### P1 — Critical (active screen-reader failures)

1. **`globalThis.toggleChat` is the wrong function** (`web/bundle.js:19744–19748`):
   `ui_helpers_exports` overwrites `ui_core_exports.toggleChat` in the `Object.assign` call.
   The surviving function (`toggleChat2`, `web/ui-helpers.js:84–98`) does not update
   `aria-label` or `aria-expanded`. After the first click, `#toggle-chat` announces incorrect
   state to screen readers.
   **Fix:** Delete `toggleChat` from `ui-helpers.js` export list (line 178) and the function
   body (lines 84–98) since `ui-core.js` provides the canonical implementation.

2. **`aria-label=""` on `#layout-freshness-chip`** (`index.html:95`): Empty static
   `aria-label` overrides all visible text content. The button has no accessible name.
   **Fix:** Remove the empty `aria-label` attribute from the HTML, or wire `aria-label` updates
   in every code path that sets the chip content (e.g., `refreshLayoutStatusUI`).

3. **`#message-input` has no accessible label** (GAP-35, `index.html:177`): No `<label>`,
   no `aria-label`, no `aria-labelledby`. Placeholder is not a compliant label.
   **Fix:** Add `aria-label="Message"` or a visually-hidden `<label for="message-input">`.

4. **Workflow step pills not keyboard-reachable** (`index.html:119–141`): 12 `<div class="step">`
   elements have `onclick` but no `tabindex`, no `role`, no keyboard handler.
   **Fix:** Convert to `<button>` elements or add `tabindex="0" role="button"` plus Enter/Space
   keydown handler. Add `:focus-visible` CSS ring.

### P2 — High (incomplete WCAG 2.1 AA compliance)

5. **`showConfirmModal` has no focus trap** (`web/ui-helpers.js:42–50`): OK button is focused
   but Tab can escape the modal to background content.
   **Fix:** Call `trapFocus('confirm-modal-overlay')` after setting focus.

6. **`openAtsReportModal` has no focus trap** (`web/ats-modals.js:118–153`): Close button is
   focused but Tab can escape. **Fix:** Call `trapFocus('ats-report-modal-overlay')` after
   setting focus.

7. **Status message elements lack `aria-live`**: `#settings-status-msg`, `#onboarding-modal-status`,
   `#model-auth-key-status`, `#session-conflict-banner`, `#llm-busy-label`. None has `aria-live`
   or `role="alert"`. Screen reader users receive no notification when these appear or change.

8. **`closeMasterCvModal` does not restore focus** (noted from cycle 2, unverified this cycle):
   Still requires verification and fix if still absent.

### P3 — Medium (quality / WCAG AA coverage)

9. **No `:focus-visible` CSS for `.tab` elements** (`styles.css:624–636`): Browser default
   focus ring applies; invisible in Windows High Contrast mode.

10. **Workflow step state conveyed by colour only** (`styles.css:150–156`): Add `.sr-only`
    text for each state, updated by JS when state changes.

11. **`outline: none` without `:focus-visible` fallback** on five element types
    (`.message-input`, `.form-input`, `.q-input`, `.intake-field-row input`,
    `.layout-instruction-textarea`). Replace with `:focus-visible` pattern.

12. **Single `_currentFocusTrapListener` cannot handle nested modals**: Refactor to a stack.

13. **Emoji in interactive labels without `aria-hidden`** on workflow steps and tabs:
    Add `aria-hidden="true"` to emoji spans.

14. **`confirmDialog` label is the message text** (`aria-labelledby="confirm-dialog-msg"`):
    Minor semantic issue — add a visually hidden heading as `aria-labelledby` target.
