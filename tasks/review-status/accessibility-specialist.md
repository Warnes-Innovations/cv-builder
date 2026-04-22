<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-04-20 17:30 ET

**Executive Summary:** The modal and dialog layer is well-structured with focus management, ARIA roles, and Escape-key handling, but the workflow step bar and second-level tab bar are built from non-interactive `<div>` elements with no `tabindex`, making the primary navigation unreachable by keyboard. Several compounding gaps — a labelless message input, an ARIA-free confirm dialog, and missing programmatic state announcements on workflow steps — place US-X1 at a critical fail level.

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

#### Criterion 1 — Workflow-step elements reachable and operable by keyboard

❌ **Fail** — `web/index.html:105–119`

All 8 workflow step pills are `<div>` elements with `onclick` handlers and no `tabindex` attribute.

```html
<div class="step clickable" id="step-job" onclick="handleStepClick('job')">📥 Job Input</div>
<div class="step" id="step-analysis" onclick="handleStepClick('analysis')">🔍 Analysis</div>
<!-- × 8 steps -->
```

`updateWorkflowSteps()` (`web/workflow-steps.js:660–668`) adds class `clickable` to completed steps but never sets `tabindex="0"` or `role="button"`. The ↻ re-run spans injected into completed steps (`workflow-steps.js:673`) are also plain `<span>` elements with `onclick` only — no `tabindex`, no `role="button"`.

**Impact:** Keyboard-only users cannot reach or activate any workflow step pill or re-run button.

#### Criterion 2 — Stage tabs expose correct tab semantics, selected state, and panel association

⚠️ **Partial** — `web/index.html:176–196`

The tab container has `role="tablist"` and `aria-label="Application workflow tabs"`. Every tab `<div>` carries `role="tab"`, `aria-selected`, and `aria-controls="document-content"`. `aria-selected` is toggled correctly in `switchTab()` (`web/review-table-base.js:80–87`).

However, the tab `<div>` elements carry no `tabindex` attribute, making them non-focusable. The arrow-key handler in `ui-core.js:490–504` calls `nextTab.focus()` but a `<div>` without `tabindex` cannot receive programmatic focus — arrow-key navigation silently fails. The `aria-controls` value is `"document-content"` for all tabs (not unique panel IDs), which is a technical workaround rather than the recommended per-tab panel pattern.

**What passes:** ARIA roles, `aria-selected` toggling, and `aria-controls` linkage are present.
**What fails:** Tabs are not keyboard-operable (missing `tabindex="0"`); arrow-key focus calls do not work.

#### Criterion 3 — Active and completed states conveyed beyond colour alone

⚠️ **Partial** — `web/styles.css:147–157`

Step states are differentiated by background and text colour (upcoming: gray, active: blue, completed: green, stale: amber). The `.viewing` class adds a visible blue box-shadow ring, providing a non-colour indicator of current view position. The `.browsing-away` class adds a pulsing amber ring. These provide some non-colour signal.

However, no `aria-current`, `aria-label`, or additional screen-reader text distinguishes active from completed from upcoming for screen reader users. The pill text label is identical regardless of state (`📥 Job Input` stays `📥 Job Input`). A screen reader user receives no programmatic signal of workflow position.

#### Criterion 4 — Changes in active stage announced

❌ **Fail** — `web/index.html:100–121`

The `.workflow` div has no `aria-live` attribute. `updateWorkflowSteps()` mutates step classes and innerHTML but nothing announces advancement to assistive technology. (The `#document-content` panel does have `aria-live="polite"` so tab content changes are announced, but that is a separate region.)

---

### US-X2: Modal and Dialog Accessibility

#### Criterion 1 — Opening a modal moves focus into it

✅ **Pass** — `web/ui-core.js:239–245`, `1493–1497`

`openSettingsModal()`, `openModelModal()`, and `openSessionsModal()` all call `setInitialFocus(modalId)` immediately after showing the modal, focusing the first text input or button within a 50 ms delay. `_focusedElementBeforeModal = document.activeElement` is captured before each open.

#### Criterion 2 — Focus is trapped inside the modal while open

✅ **Pass** — `web/ui-core.js:294–330`

`trapFocus(modalId)` installs a keydown listener that cycles Tab/Shift+Tab within the focusable elements of the modal and is cleaned up on close. The `_showReRunConfirmModal` helper in `workflow-steps.js:171` also calls `trapFocus`.

⚠️ **Gap:** The `confirmDialog()` function (`ui-core.js:355–405`) creates a dynamic overlay div but never calls `trapFocus()`. Tab can escape to the page behind.

#### Criterion 3 — Closing a modal restores focus to the triggering control

✅ **Pass** — `web/ui-core.js:336–344`

`restoreFocus()` is called by all major close paths: `closeSettingsModal`, `closeModelModal`, `closeSessionsModal`, `closeModal`, `_showReRunConfirmModal` close handler.

⚠️ **Gap:** `confirmDialog()` does not call `restoreFocus()` on dismiss. Focus position is lost.

#### Criterion 4 — Dialog title and purpose exposed programmatically

✅ **Pass** (static modals) / ❌ **Fail** (`confirmDialog`)

All static modals carry `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`:
- Sessions: `aria-labelledby="sessions-modal-title"` (`index.html:217`)
- Alert: `aria-labelledby="alert-modal-title"`, `aria-describedby="alert-modal-message"` (line 242)
- Ownership conflict: `aria-labelledby="ownership-conflict-title"` (line 256)
- LLM wizard: `aria-labelledby="model-modal-title"` (line 273)
- Settings: `aria-labelledby="settings-modal-title"` (line 433)
- Re-run confirm: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="rerun-confirm-title"` (`workflow-steps.js:155`)

`confirmDialog()` (`ui-core.js:355`) creates a plain div with no `role`, `aria-modal`, or `aria-labelledby`. Its text content is not associated as a dialog description.

**Additional gap — session conflict banner** (`index.html:96`): rendered as a plain `<div>`, no `role="alert"` or `aria-live="assertive"`. Screen readers will not announce the conflict warning when it appears.

**Additional gap — modal close `×` buttons**: multiple `&times;` buttons (sessions, settings, ATS report, job analysis) use only `title="Close"` without `aria-label`. `title` exposure as accessible name is inconsistent across assistive technologies.

---

### US-X3: Forms, Errors, and Review Controls

#### Criterion 1 — Inputs with validation errors expose errors via accessible associations

⚠️ **Partial** — `web/styles.css:1336–1345`

CSS defines visual feedback for `input[aria-invalid="true"]` (red border + box-shadow on focus). The `.sr-only` utility class is defined (`styles.css:24`) and used for screen-reader-only text (e.g., `review-table-base.js:262` — missing-skill sr-only span). `#toast-container` carries `aria-live="polite"` and `aria-atomic="true"` (`index.html:238`).

However, there is no evidence in the JavaScript source that `aria-invalid="true"` is ever dynamically set on input elements. The CSS rule is inert without programmatic attribute assignment.

#### Criterion 2 — Icon-only controls have descriptive labels

⚠️ **Partial**

- `#layout-freshness-chip` (`index.html:87`): `aria-label=""` — empty at initialization. Set dynamically, but starts as a button with no accessible name.
- ↻ re-run `<span>` buttons (`workflow-steps.js:673`): `title` only, no `role="button"`, no `tabindex`. Not keyboard accessible at all.
- Wizard close button (`modal-close-btn`): `title="Close"` only, no `aria-label`.
- `#model-auth-key-toggle`: `aria-label="Show or hide API key"` ✅ — correctly labeled.
- Tab scroll buttons: `aria-label="Scroll tabs left/right"` ✅.
- ATS score badge: `aria-label="ATS match score"` ✅.

#### Criterion 3 — Inline edit/review actions have clear focus targets and visible focus states

⚠️ **Partial** — `web/styles.css:427–428`, `474–486`, `435–439`

Positive: `.action-btn` is a `<button>` element; Bootstrap 5 supplies a `box-shadow` focus ring for native buttons via its own CSS. `.message-input:focus` has a box-shadow replacement for the outline.

Gaps:
- `.message-input` has `outline: none` as a **base** style (`styles.css:427`), not just on focus. If box-shadow is clipped by an ancestor with `overflow: hidden`, no focus indicator remains.
- `.tab` and `.step` elements have no `:focus` or `:focus-visible` CSS rule at all (`styles.css:474–486`, `147–157`). Because these are `<div>` elements without `tabindex`, they cannot currently receive focus — but adding `tabindex` later without also adding focus styles would leave keyboard users without a visible indicator.
- `.action-btn` has no explicit `:focus-visible` rule in `styles.css:435–439` — it relies entirely on the Bootstrap `button:focus-visible` rule.

#### Criterion 4 — Error and status messages accessible to assistive tech

✅ **Pass** (live regions in place) — `web/index.html:200, 238, 283`

- `#document-content` (`role="tabpanel"`, `aria-live="polite"`) announces main panel content changes.
- `#toast-container` (`aria-live="polite"`, `aria-atomic="true"`) announces toast notifications.
- LLM wizard progress has `role="status"` and `aria-live="polite"`.

❌ **Gap** — `#session-conflict-banner` (`index.html:96`): no `role="alert"` or `aria-live`. This warning appears during active 409 conflicts and is critical user feedback that will be missed by screen reader users.

---

## Generated Materials Evaluation

No user stories cover the accessibility or readability of the generated CV artifacts (HTML/PDF output). The source includes no accessibility metadata enforcement in generated HTML: there is no `<html lang>` attribute explicitly managed in templates, no heading-hierarchy enforcement in generation code, no alt text on any potential images, and no color-contrast guarantees for generated output. The `.sr-only` class exists in `styles.css` but applies to the web UI only, not generated CV HTML.

**This entire evaluation area is outside the current story set.** See proposed story items below.

---

## Additional Story Gaps / Proposed Story Items

### US-X4 (proposed): Keyboard Access to Workflow Step Bar

**Evidence:** `web/index.html:105–119` — 8 `<div>` step pills, no `tabindex`. `web/workflow-steps.js:673` — re-run spans, no `role` or `tabindex`.

**Proposed acceptance criteria:**
- All active and completed step pills are keyboard reachable via Tab or arrow keys.
- Enter/Space activate the same action as a click.
- Re-run (↻) buttons within completed steps are separately keyboard-focusable and labeled.
- Step state (active, completed, upcoming, stale) is exposed to screen readers via `aria-current` or `aria-label`.

### US-X5 (proposed): Generated CV Output Accessibility

**Evidence:** No story or code currently targets generated HTML/PDF accessibility.

**Proposed acceptance criteria:**
- Generated HTML files include `<html lang="en">` and a logical heading hierarchy (h1 → h2 → h3).
- Body text color contrast meets WCAG AA (4.5:1 minimum).
- Skills section uses a semantic list element.
- Generated tables (if any) include `<th scope="...">`.

### US-X6 (proposed): Dynamic `aria-invalid` and Inline Error Feedback

**Evidence:** `web/styles.css:1336–1345` — CSS rule for `aria-invalid="true"` exists but is never set in JavaScript.

**Proposed acceptance criteria:**
- Required inputs receive `aria-invalid="true"` on failed submission.
- An `aria-describedby` error message element is displayed and associated when a field is invalid.
- The error state is announced via the associated field, not only through visual styling.

---

**Reviewed against:**
- `web/index.html` (full file, 600 lines)
- `web/app.js` (full file, 136 lines)
- `web/ui-core.js` (lines 1–750, 1473–1520 — focus management, modal open/close, tab event listeners)
- `web/styles.css` (all accessibility-relevant rules: lines 24–31, 147–160, 427–439, 474–486, 1223, 1336–1352)
- `web/workflow-steps.js` (lines 1–300, 590–720 — step update, re-run spans, confirm modal)
- `web/review-table-base.js` (lines 1–400 — tab switching, ARIA state, inclusion counts)
- `web/session-switcher-ui.js` (lines 1–400 — modal focus management)
- `web/fetch-utils.js` (lines 1–200 — conflict banner)
- `tasks/user-story-accessibility-specialist.md`
- `tasks/current-implemented-workflow.md`

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-X1 Workflow Navigation | 0 | 2 (crit 2, 3) | 2 (crit 1, 4) | 0 | 0 |
| US-X2 Modal & Dialog | 3 (crit 1, 2, 3 — main modals) | 1 (crit 4 — gaps) | 1 (confirmDialog) | 0 | 0 |
| US-X3 Forms, Errors, Review | 1 (crit 4 — live regions) | 3 (crit 1, 2, 3) | 0 | 0 | 0 |
| US-X4 (proposed) | — | — | — | 🔲 | — |
| US-X5 (proposed) | — | — | — | 🔲 | — |
| US-X6 (proposed) | — | — | — | 🔲 | — |

**Key evidence references:**

| Finding | File:Line |
|---------|-----------|
| Workflow step `<div>` pills — no `tabindex` | `web/index.html:105–119` |
| Re-run `<span>` — no `role`, no `tabindex` | `web/workflow-steps.js:673` |
| `updateWorkflowSteps` — never sets `tabindex` | `web/workflow-steps.js:660–668` |
| Tab `<div>` — no `tabindex`, arrow-key focus silently fails | `web/index.html:177–196`, `web/ui-core.js:490–504` |
| Focus management infra (positive) | `web/ui-core.js:29–345` |
| `confirmDialog` — missing ARIA, no `trapFocus`, no `restoreFocus` | `web/ui-core.js:355–405` |
| All static modals — correct `role`, `aria-modal`, `aria-labelledby` | `web/index.html:217, 242, 256, 273, 433` |
| Empty `aria-label` on freshness chip | `web/index.html:87` |
| Session conflict banner — no `role="alert"`, no `aria-live` | `web/index.html:96` |
| `message-input` — no `<label>`, no `aria-label`, placeholder only | `web/index.html:149` |
| `outline: none` base style on `.message-input` | `web/styles.css:427` |
| `aria-invalid` CSS defined but never set programmatically | `web/styles.css:1336–1345` |
| `.sr-only` defined and used correctly | `web/styles.css:24–31`, `web/review-table-base.js:262` |
| Toast + panel live regions (positive) | `web/index.html:200, 238` |

**Evidence standard:** Every conclusion is supported by direct source inspection with file and line references.

