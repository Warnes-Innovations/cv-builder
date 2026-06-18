<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review — CV-Builder Application

**Persona:** Accessibility Specialist
**Stories evaluated:** US-X1, US-X2, US-X3
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/review-table-base.js, web/master-cv.js, web/session-switcher-ui.js, web/ats-modals.js, web/styles.css
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

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

**Story:** Workflow-step bar and stage tabs are fully operable by keyboard and understandable to assistive technologies.

#### Criterion 1: Workflow-step elements are reachable and operable by keyboard where interaction is supported.

**❌ Fail**

The 12 workflow-step pills (`<div class="step">`, `index.html:119–141`) are plain `<div>` elements with `onclick` handlers. They carry no `role`, no `tabindex`, and no `aria-*` attributes. A keyboard-only user cannot reach them via Tab, and there is no keyboard alternative. The only `class="clickable"` applied is `step-job`; the others receive `onclick` without even that class, yet still fire `handleStepClick`. The CSS provides only hover/cursor styles (`styles.css:142–143`); there is no `:focus` or `:focus-visible` rule for `.step` elements at all.

Missing: `tabindex="0"`, `role="button"` (or conversion to `<button>`), `keydown` handler for Enter/Space, and a visible focus ring on `.step`.

#### Criterion 2: Stage tabs expose correct tab semantics, selected state, and panel association.

**⚠️ Partial**

The tab bar (`index.html:199`) carries `role="tablist"` and `aria-label="Application workflow tabs"`. Each individual tab (`index.html:200–225`) carries `role="tab"`, `aria-selected` (initially correct), and `aria-controls="document-content"`. The panel carries `role="tabpanel"` (`index.html:231`).

`aria-selected` is correctly updated on tab switch (`review-table-base.js:122–130`). Arrow-key navigation (Left/Right/Home/End) is wired in `ui-core.js:491–509`.

**Gaps:**

1. Tabs are `<div>` elements, not `<button>` or elements with `tabindex`. A `<div role="tab">` without `tabindex` is not natively focusable. The WCAG tab-widget pattern requires the active tab to have `tabindex="0"` and inactive tabs `tabindex="-1"` so that only one tab is in the natural Tab order at a time. Neither is set in the HTML or set dynamically by JS.
2. All tabs share the same `aria-controls="document-content"` ID. While not technically invalid, the single panel pattern means screen readers cannot infer which panel a tab owns without additional description.
3. `.tab` has no `:focus-visible` CSS rule (`styles.css:624–636`). The only visual change on focus would come from browser defaults (where `outline: none` is set on inputs system-wide); for `<div>` elements the browser may or may not draw a ring.

#### Criterion 3: Active and completed states are conveyed by more than colour alone.

**❌ Fail**

Workflow-step states (`active`, `completed`, `upcoming`, `stale`, `stale-critical`) are conveyed exclusively through background and text colour (`styles.css:150–156`). There is no text label, icon aria description, or non-colour shape/border change distinguishing these states. For example, `completed` uses a green background (`#dcfce7`) with no "completed" text visible to a screen reader. The `step.viewing` and `step.browsing-away` states are conveyed via animated box-shadow only (`styles.css:159–168`).

Tab active state (`tab.active`) is conveyed by colour (`#3b82f6`) and a bottom border only (`styles.css:636`). There is no non-colour difference from non-active tabs.

#### Criterion 4: Changes in active stage or tab are announced or otherwise programmatically determinable.

**⚠️ Partial**

The `document-content` panel has `aria-live="polite"` (`index.html:231`), meaning content changes inside it will be announced by screen readers. However, switching tabs clears and refills `innerHTML` of this element — depending on content, announcements may be noisy or meaningless.

The model-wizard progress indicator has `role="status" aria-live="polite"` (`index.html:412`), which is correct for that component.

No `aria-live` region announces which workflow step or tab became active. The tab's `aria-selected="true"` change is programmatically determinable only if the screen reader has focus on the tab element — which it cannot reach due to missing `tabindex`.

---

**US-X1 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| Keyboard-only users can move through workflow controls in logical order | ❌ Workflow steps unreachable; tabs lack tabindex |
| Tabs expose selected/unselected state programmatically | ⚠️ Attributes set but tabs not focusable |
| Active workflow position perceivable without colour vision | ❌ State conveyed by colour only |

---

### US-X2: Modal and Dialog Accessibility

**Story:** Modal dialogs manage focus correctly and remain usable with screen readers.

#### Criterion 1: Opening a modal moves focus into it.

**⚠️ Partial**

Focus infrastructure exists in `ui-core.js:274–287` (`setInitialFocus`). It is called from:
- `openSettingsModal` (`ui-core.js:239–247`) ✅
- `openModal` generic function (`ui-core.js:673–687`) ✅
- `openModelModal` (`ui-core.js:1470–1472`) ✅
- `openSessionsModal` (`session-switcher-ui.js:454–457`) — saves `_focusedElementBeforeModal` and calls `trapFocus`, but does **not** call `setInitialFocus`. Focus is not moved into the modal on open.
- `openMasterCvModal` (`master-cv.js:2464–2471`) — calls neither `setInitialFocus` nor `trapFocus`. Focus is not moved, and the modal is not trapped.
- `openAtsReportModal` (`ats-modals.js:112–141`) — directly sets `style.display = 'flex'` with no focus management at all.

#### Criterion 2: Focus is trapped inside the modal while it is open.

**⚠️ Partial**

`trapFocus` (`ui-core.js:294–331`) is a correct implementation: it intercepts Tab and Shift+Tab to wrap at the first/last focusable element. It is wired for: Settings, Model, and Sessions modals.

Not wired: Master CV modal, ATS Report modal, Job Analysis modal. Users can Tab out of these modals to background content.

Additionally, `_currentFocusTrapListener` is a single shared variable. Opening a second modal while the first is still open (e.g., a confirm dialog opened from within the sessions modal) will discard the first modal's trap listener and leave it untrapped when the second modal closes. There is no trap stack.

#### Criterion 3: Closing a modal restores focus to the triggering control.

**⚠️ Partial**

`restoreFocus` (`ui-core.js:336–347`) correctly returns focus to `_focusedElementBeforeModal`. It is called from `closeModal` and `closeSettingsModal`.

Not called: `closeMasterCvModal` (`master-cv.js:2473–2478`) and `closeAtsReportModal` (`ats-modals.js:143–145`) discard `style.display` but never call `restoreFocus`. After closing these modals, focus is lost (returned to `<body>`).

#### Criterion 4: Dialog title and purpose are programmatically exposed.

**✅ Pass**

All `role="dialog"` overlays carry `aria-modal="true"` and `aria-labelledby` referencing a heading:
- Sessions: `aria-labelledby="sessions-modal-title"` (`index.html:245`)
- Master CV: `aria-labelledby="master-cv-modal-title"` (`index.html:267`)
- Alert: `aria-labelledby="alert-modal-title" aria-describedby="alert-modal-message"` (`index.html:283`)
- Confirm: `aria-labelledby="confirm-modal-title" aria-describedby="confirm-modal-message"` (`index.html:298`)
- Onboarding: `aria-labelledby="onboarding-modal-title"` (`index.html:315`)
- Ownership conflict: `aria-labelledby="ownership-conflict-title" aria-describedby="ownership-conflict-message"` (`index.html:381`)
- Model wizard: `aria-labelledby="model-modal-title"` (`index.html:398`)
- Settings: `aria-labelledby="settings-modal-title"` (`index.html:558`)
- ATS Report: `aria-labelledby="ats-report-modal-title"` (`index.html:669`)

**One gap:** The onboarding modal lacks `aria-describedby` despite having a substantial body (`index.html:315–379`). This is minor.

**US-X2 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| All major dialogs support correct focus entry | ⚠️ 3 of ~9 modals lack focus-on-open |
| Focus trap — prevent tabbing to background | ⚠️ 3 of ~9 modals untrapped |
| Focus restored to trigger on close | ⚠️ 2 modals do not restore focus |
| Dialog purpose exposed via ARIA labels | ✅ All dialogs labelled |

---

### US-X3: Forms, Errors, and Review Controls

**Story:** Form validation, review controls, and inline editing affordances are accessible.

#### Criterion 1: Inputs with validation errors expose those errors via accessible associations.

**⚠️ Partial**

CSS exists for `input[aria-invalid="true"]` (`styles.css:1524–1528`) — border turns red and a focus-state shadow is added. This indicates the validation intent is present and that JS is expected to set `aria-invalid="true"` on error inputs. However, there is no `aria-errormessage` or `aria-describedby` wiring in the HTML or JS that associates an error message element to the input. The CSS covers the visual indicator but not the screen-reader-audible description of _what_ the error is.

Inline onboarding-status messages (`index.html:362`, `id="onboarding-modal-status"`) and settings-status messages (`id="settings-status-msg"`) update via JS (`ui-core.js:103–121`) but are plain `<p>` elements with no `role="alert"` or `aria-live`, meaning screen readers are not notified when these messages appear or change.

#### Criterion 2: Icon-only controls have descriptive labels.

**❌ Fail (several instances)**

The following controls rely on emoji or Unicode glyphs alone with no accessible alternative:

| Element | Content | Missing label |
|---|---|---|
| `#toggle-chat` button (`index.html:149`) | `◀` | No `aria-label` |
| `#rename-session-btn` button (`index.html:76–79`) | `✏️` | No `aria-label` |
| `#conflict-retry-btn` (`index.html:112`) | `↺ Retry Now` | Has visible text ✅ |
| Sessions close-X button (`index.html:249`) | `×` | Has `title="Close"` but no `aria-label`; `title` is not reliably read |
| Master CV close-btn (`index.html:271`) | `×` | `title="Close"`, no `aria-label` |
| Model wizard close-btn (`index.html:402`) | `×` | `title="Close"`, no `aria-label` |
| `#layout-freshness-chip` button (`index.html:95`) | Empty `aria-label=""` | Label is empty; content set dynamically by JS |
| `#llm-status-icon` span (`index.html:56`) | `⚠` (Unicode) | No text alternative; decorative? |
| LLM busy "■ Stop" button (`index.html:158`) | `■ Stop` | Has visible text ✅ |

Key issue: `aria-label=""` on `#layout-freshness-chip` (`index.html:95`) is explicitly empty. Even if JS updates the chip's text content, screen readers will see an empty label for this interactive button.

#### Criterion 3: Inline edit/review actions have clear focus targets and visible focus states.

**⚠️ Partial**

Several input elements suppress the native focus outline with `outline: none`:
- `.message-input` (`styles.css:577`): `outline: none` with no `:focus-visible` fallback
- `.form-input` (`styles.css:750`): same pattern
- `.question-item .q-input` (`styles.css:509`): same pattern
- `.intake-field-row input` (`styles.css:1582–1585`): same pattern
- `.layout-instruction-textarea` (`styles.css:1428`): same pattern

These all substitute a `box-shadow` ring and border colour change for the outline — this provides a visible indicator but only in sighted contexts. The substitute is reasonable for visual users but the global suppression of `outline` means keyboard users relying on high-contrast mode or custom focus styles (e.g., Windows High Contrast) lose the indicator.

One element uses `:focus-visible` correctly: `.sm-th:focus-visible` (`styles.css:261`) and `.preview-output-badge-link:focus-visible` (`styles.css:1390`). No other interactive elements (tabs, action buttons, step pills) have `:focus-visible` rules.

#### Criterion 4: Error and status messages are exposed in a way that assistive tech can detect.

**⚠️ Partial**

**Good:**
- `#toast-container` has `aria-live="polite" aria-atomic="true"` (`index.html:280`) — toast notifications will be announced. ✅
- `#document-content` has `aria-live="polite"` (`index.html:231`) — panel content changes announced.
- Model wizard progress has `role="status" aria-live="polite"` (`index.html:412`). ✅

**Missing:**
- `#settings-status-msg` (`index.html:565`, `ui-core.js:103`): plain element, no `aria-live`. Settings save/error messages not announced.
- `#onboarding-modal-status` (`index.html:362`): plain `<p>`, no `aria-live`. Onboarding errors not announced.
- `#model-auth-key-status` (`index.html:469`): plain element, no `aria-live`. API key save result not announced.
- `#llm-busy-label` and `#llm-busy-elapsed` (`index.html:155–156`): LLM progress not in a live region; screen reader users cannot track elapsed time or status changes.
- `#session-conflict-banner` (`index.html:110`): conflict warning appears via `style.display = 'block'` but carries no `role="alert"` or `aria-live` — it is not announced when it appears.

**US-X3 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| Validation and status feedback accessible to non-visual users | ⚠️ aria-invalid styled but no aria-errormessage wired; several status elements lack live regions |
| Review controls understandable and operable without pointer | ⚠️ Most controls are `<button>` elements ✅; icon-only buttons lack labels; outline suppressed without `:focus-visible` guard |

---

## Generated Materials Evaluation

The accessibility specialist scope for generated materials covers readability, structure, and contrast of CV output. The generated CV is produced by Python scripts into PDF/DOCX format. The application does not expose generated CV content in the web UI for screen-reader consumption (the preview is an `<iframe>` or rendered HTML) and no direct evaluation of generated file accessibility (PDF tagging, DOCX heading structure) is possible from the source code alone. The following observations apply to the structural intent visible in the generation pipeline:

- The CV templates generate semantic HTML for the human PDF path, with `<h1>` for name, `<h2>` for sections, and `<ul>/<li>` for bullets — structural semantics are present in the HTML-to-PDF pipeline.
- No evidence of PDF/UA tagging or DOCX accessibility properties (alt-text on images, reading order metadata) in the source files reviewed.
- Generated content is assessed for ATS machine-readability (ATS score) but not for WCAG contrast or accessibility of the final file format.

This evaluation is **N/A / Partial** — insufficient source-level evidence to make definitive pass/fail judgements on generated file accessibility.

---

## Terminology and ARIA Consistency Observations

1. **Screen-reader label consistency:** The workflow top bar uses emoji labels ("📥 Job Input", "🔍 Analysis") without `aria-hidden` on the emoji. Screen readers will announce these emoji names ("inbox tray Job Input", etc.), which may be confusing. The tab bar has the same pattern.

2. **Duplicate `aria-controls` values:** All 18+ tabs point to `aria-controls="document-content"`. The ARIA tab pattern expects each tab to point to its own panel. Using a single shared panel ID is unusual but technically permissible with a single-panel design — however it weakens the association semantics.

3. **`aria-label=""` on live button:** `#layout-freshness-chip` (`index.html:95`) has `aria-label=""` as a static attribute. When JS later sets the chip's text content (e.g., "Layout is fresh"), the button's accessible name remains the empty `aria-label`, overriding the visible text content. This is a direct screen-reader failure for this button.

4. **`×` close buttons:** Three modal close buttons display `×` (multiplication sign) with only a `title` attribute. `title` is not reliably announced by screen readers (especially on focus). These should have `aria-label="Close"`.

---

## Summary Table

| Story | Criterion | Result |
|-------|-----------|--------|
| US-X1 | Workflow steps keyboard reachable | ❌ |
| US-X1 | Tab semantics and selected state | ⚠️ |
| US-X1 | State conveyed beyond colour | ❌ |
| US-X1 | Stage changes programmatically determinable | ⚠️ |
| US-X2 | Focus moved into modal on open | ⚠️ |
| US-X2 | Focus trapped inside modal | ⚠️ |
| US-X2 | Focus restored on close | ⚠️ |
| US-X2 | Dialog title/purpose exposed | ✅ |
| US-X3 | Validation errors accessible | ⚠️ |
| US-X3 | Icon-only controls labelled | ❌ |
| US-X3 | Focus states visible and reliable | ⚠️ |
| US-X3 | Status messages in live regions | ⚠️ |

---

## Prioritised Findings

### P1 — Critical (blocks keyboard-only and screen-reader access)

1. **Workflow step pills are not keyboard-reachable** (`index.html:119–141`). All 12 `<div class="step">` elements lack `tabindex` and `role`. Convert to `<button>` or add `tabindex="0" role="button"` plus `keydown` handler for Enter/Space. Add `:focus-visible` ring in CSS.

2. **Tab `<div>` elements lack `tabindex`** (`index.html:200–225`). ARIA tab pattern requires `tabindex="0"` on the selected tab and `tabindex="-1"` on others, updated on selection. Without this, arrow-key navigation in `ui-core.js:491–509` cannot reach tabs if focus was never placed there initially.

3. **`aria-label=""` on `#layout-freshness-chip`** (`index.html:95`). The empty static `aria-label` overrides visible button text. Either remove the attribute (let content be the name) or update it dynamically in the same JS that sets the chip's text content.

### P2 — High (incomplete WCAG 2.1 AA compliance)

4. **Master CV and ATS Report modals lack focus management** (`master-cv.js:2464`, `ats-modals.js:112`). Both modals need `setInitialFocus`, `trapFocus` on open, and `restoreFocus` on close.

5. **Status message elements lack `aria-live` or `role="alert"`**: `#settings-status-msg`, `#onboarding-modal-status`, `#model-auth-key-status`, `#session-conflict-banner`. Users on screen readers receive no notification when these messages appear.

6. **Icon-only close buttons (`×`) rely on `title` attribute** (`index.html:249, 271, 402`). Add `aria-label="Close"` to each.

7. **`#toggle-chat` and `#rename-session-btn` lack `aria-label`** (`index.html:149, 76`). Add descriptive labels ("Toggle conversation panel", "Rename this session").

### P3 — Medium (quality of life / WCAG AA coverage)

8. **Workflow step state conveyed by colour only**. Add a text indicator (e.g., `.sr-only` "Completed", "Active", "Upcoming") inside each step pill, updated by JS when state changes.

9. **`outline: none` without `:focus-visible` fallback** on five element types. Replace with `:focus-visible { outline: 2px solid #3b82f6; ... }` pattern to preserve focus rings in high-contrast environments.

10. **Single `_currentFocusTrapListener` variable** cannot handle nested modals. Refactor `trapFocus`/`restoreFocus` to use a stack so that closing an inner modal restores the outer modal's trap.

11. **Emoji in interactive labels without `aria-hidden`** on decorative glyphs. Add `aria-hidden="true"` to emoji spans inside buttons/tabs so screen readers do not read out emoji names.
