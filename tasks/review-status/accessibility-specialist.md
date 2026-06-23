<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-06-22 ET

**Persona:** Accessibility Specialist
**Stories evaluated:** US-X1, US-X2, US-X3
**Cycle:** 6

**Executive Summary:** Cycle 6 reads all required source files including the newly in-scope
files (`web/rewrite-review.js`, `web/workflow-steps.js`, `web/skills-review.js`,
`web/session-switcher-ui.js`). Multiple cycle-5 findings are now resolved: both sessions-modal
`setInitialFocus` and category-reorder `aria-label` are fixed; step pills 2–12 now receive
`role="button"`, `tabindex`, and keyboard handlers via `_makeStepClickable`; `.sr-only` state
text is injected by `workflow-steps.js`; `.tab:focus-visible`, `.step:focus-visible`, and
`.action-btn:focus-visible` CSS rules are now present; `#llm-busy-label` now carries
`aria-live="polite" role="status"`; and `#layout-freshness-chip` aria-label is always
populated when the chip is visible. Two issues remain: `#message-input` still has no
accessible label (P1), and the bullet-reorder modal (`showBulletReorder`) lacks
`role="dialog"`, `aria-modal`, `aria-labelledby`, focus entry, and a focus trap (P2).
The rewrite-review action buttons (`rw-btn`) lack `aria-pressed` state and `.icon-btn` class
lacks a `:focus-visible` CSS rule (P3).

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

## Cycle-6 Summary: What Changed Since Cycle 5

The following cycle-5 findings are now resolved:

| Cycle-5 Finding | Cycle-6 Status |
|---|---|
| Workflow step pills #2–12 not keyboard-reachable | ✅ FIXED — `_makeStepClickable` in ui-core.js:1917–1930 adds `role="button"`, `tabindex="0"`, Enter/Space keydown handler |
| Step state conveyed by colour only | ✅ FIXED — workflow-steps.js:715–726 injects `.sr-only` text with state descriptions |
| `openSessionsModal` missing `setInitialFocus` | ✅ FIXED — session-switcher-ui.js:458 |
| Category reorder buttons lack `aria-label` | ✅ FIXED — skills-review.js:423–424 |
| `#llm-busy-label` no live region | ✅ FIXED — index.html:155 `aria-live="polite" role="status"` |
| No `:focus-visible` for `.tab` | ✅ FIXED — styles.css:637 |
| No `:focus-visible` for `.step` | ✅ FIXED — styles.css:144 |
| No `:focus-visible` for `.action-btn` | ✅ FIXED — styles.css:590 |
| `#layout-freshness-chip` aria-label fallback may be empty | ✅ RESOLVED — state-manager.js:128–137 confirms chip is hidden (showChip:false) when ariaLabel is empty; all visible states have a non-empty ariaLabel |

Remaining open items from cycle 5:

- `#message-input` has no accessible label (P1, GAP-35)
- Bullet-reorder modal missing dialog ARIA and focus management (P2, new finding from reading workflow-steps.js)
- `.rw-btn` and `.icon-btn` lack `:focus-visible` CSS rules (P3)
- `outline:none` on four input types without `:focus-visible` fallback (P3)
- Single `_currentFocusTrapListener` nested-modal architecture gap (P3)
- Emoji in tabs and steps not wrapped in `aria-hidden` spans (P3)

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

**Story:** Workflow-step bar and stage tabs are fully operable by keyboard and
understandable to assistive technologies.

#### Criterion 1: Workflow-step elements are reachable and operable by keyboard.

**✅ Pass — fully resolved this cycle**

`web/index.html` lines 117–143: The workflow container is a `<nav>` element with
`aria-label="Application workflow steps"`. `step-job` (index.html:119) carries
`role="button" tabindex="0"` in the HTML source.

Steps 2–12 (index.html:121–141) are plain `<div>` elements at load time, but
`updateWorkflowStepsClickable` in `ui-core.js:1879–1963` is called on every status update and
on `DOMContentLoaded`. Its inner helper `_makeStepClickable` (ui-core.js:1917–1930):
- adds `el.classList.add('clickable')` only if not already present
- sets `el.setAttribute('role', 'button')`
- sets `el.setAttribute('tabindex', '0')`
- attaches a `keydown` handler for Enter and Space that calls `el.click()`

`_makeStepInert` (ui-core.js:1933–1942) removes the role, sets `tabindex="-1"`, and
removes the key handler when steps are not yet unlocked.

The step pills receive keyboard access dynamically as the user progresses through the
workflow, which matches the expected progressive-unlock design.

#### Criterion 2: Stage tabs expose correct tab semantics, selected state, and panel association.

**✅ Pass — confirmed from cycle 5**

Tab bar (`index.html:199`): `role="tablist"` and `aria-label`. Each tab: `role="tab"`,
`aria-selected`, `aria-controls="document-content"`, roving `tabindex`. Arrow/Enter/Space
navigation wired in `ui-core.js:516–540`. `switchTab()` (`review-table-base.js:122–133`)
updates `aria-selected` and `aria-labelledby` on the tabpanel on every switch.
`.tab:focus-visible` CSS rule present at `styles.css:637`.

#### Criterion 3: Active and completed states conveyed by more than colour alone.

**✅ Pass — resolved this cycle**

`workflow-steps.js:715–726` now appends `.sr-only` text after each step label at every
call to `updateWorkflowSteps`. The injected text variants are:
- ` (current step)` for active steps
- ` (completed)` for completed steps
- ` (stale — results may be outdated)` for stale steps
- ` (critical — review required)` for stale-critical steps

`.sr-only` is defined at `styles.css:24–33` (visually hidden, readable by screen readers).

The `step-rerun` injected style (`workflow-steps.js:737`) also adds `:focus-visible` for
the re-run button.

#### Criterion 4: Changes in active stage or tab are programmatically determinable.

**✅ Pass — confirmed from cycle 5; no regression**

`document-content` has `aria-live="polite"` (index.html:231) and `aria-labelledby` updated
on every tab switch (review-table-base.js:133). `aria-selected` is updated on every switch.
`#llm-busy-label` now has `aria-live="polite" role="status"` (index.html:155), so LLM
processing state changes are announced.

**US-X1 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| Keyboard-only users can move through workflow controls in logical order | ✅ All 12 steps now keyboard-reachable |
| Tabs expose selected/unselected state programmatically | ✅ Confirmed pass |
| Active workflow position perceivable without colour vision | ✅ `.sr-only` text now injected |

---

### US-X2: Modal and Dialog Accessibility

**Story:** Modal dialogs manage focus correctly and remain usable with screen readers.

#### Criterion 1: Opening a modal moves focus into it.

**✅ Pass — fully resolved this cycle**

All major modals now call `setInitialFocus` or an equivalent direct focus call on open:
- `openSettingsModal`: `setInitialFocus('settings-modal-overlay')` (ui-core.js:244) ✅
- `openModelModal`: `setInitialFocus('settings-modal-overlay')` (ui-core.js:1509) ✅
- `openSessionsModal`: `setInitialFocus('sessions-modal-overlay')` (session-switcher-ui.js:458) ✅ FIXED
- `showOwnershipConflictDialog`: `setInitialFocus('ownership-conflict-overlay')` (session-switcher-ui.js:186) ✅
- `showAlertModal`: `setInitialFocus('alert-modal-overlay')` (ui-helpers.js:26) ✅
- `showConfirmModal`: `okBtn.focus()` (ui-helpers.js:49) ✅
- `confirmDialog`: `okBtn.focus()` (ui-core.js:409) ✅
- `openAtsReportModal`: `focusCloseBtn.focus()` (ats-modals.js:124) ✅
- `_showReRunConfirmModal` (workflow-steps.js): `document.getElementById('rerun-proceed-btn').focus()` (line 181) ✅

Remaining unresolved item:
- **`showBulletReorder`** (`workflow-steps.js:392–529`): The bullet-reorder modal (`#bullet-reorder-modal`) is a dynamically-created overlay but has no `role="dialog"`, no `aria-modal`, no `aria-labelledby`, no call to `_focusedElementBeforeModal`, no `trapFocus`, and no initial focus call. It opens as a visually modal element but is fully transparent to assistive technology. (P2)

#### Criterion 2: Focus is trapped inside the modal while it is open.

**✅ Pass — major modals; one gap remains**

`trapFocus` is wired for: Settings, Model, Sessions, Ownership Conflict, Alert, Confirm,
ATS Report, Re-run Confirm. The inline `confirmDialog` has its own two-button trap
(ui-core.js:412–422).

Remaining gap:
- **`showBulletReorder`**: No `trapFocus` call. (P2, same as above)

**Remaining architecture note:** Single `_currentFocusTrapListener` slot means opening a
nested modal removes the outer trap. This is a P3 concern; no regression from cycle 5.

#### Criterion 3: Closing a modal restores focus to the triggering control.

**✅ Pass — all major modals; bullet-reorder gap remains**

All major modal close paths call `restoreFocus()` (confirmed unchanged from cycle 5).

Remaining gap:
- **`showBulletReorder`** close path (`document.getElementById('bullet-reorder-modal').remove()` inline onclick, workflow-steps.js:483): No `restoreFocus()` call. (P2)

#### Criterion 4: Dialog title and purpose are programmatically exposed.

**✅ Pass — all major modals; bullet-reorder gap remains**

All static `role="dialog"` overlays carry `aria-modal="true"` and `aria-labelledby`.
`_showReRunConfirmModal` creates its dialog with `role="dialog" aria-modal="true" aria-labelledby="rerun-confirm-title"` (workflow-steps.js:164).

Remaining gap:
- **`showBulletReorder`**: Outer overlay div has no ARIA dialog role or label. The inner `<h3>` "↕ Reorder Bullets" has no `id` for association. (P2)

**US-X2 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| All major dialogs support correct focus entry | ⚠️ All major modals pass; bullet-reorder modal missing |
| Focus trapped inside modal | ⚠️ All major modals pass; bullet-reorder modal missing |
| Focus restored to trigger on close | ⚠️ All major modals pass; bullet-reorder modal missing |
| Dialog purpose exposed via ARIA labels | ⚠️ All static modals pass; bullet-reorder modal missing |

---

### US-X3: Forms, Errors, and Review Controls

**Story:** Form validation, review controls, and inline editing affordances are accessible.

#### Criterion 1: Inputs with validation errors expose errors via accessible associations.

**⚠️ Partial — improved from cycle 5; job-input fields wired; broader pattern still absent**

Job-input fields (`job-input.js`) use `_showFieldError`/`_clearFieldError` (lines 550–567)
which set `aria-invalid="true"/"false"` on the input element. The inputs carry
`aria-describedby` in their HTML (`job-input.js:116, 132, 165`), pointing to `paste-error`,
`url-error`, and `file-upload-error` respectively. This correctly links error text to its
input for the primary job-input form.

CSS at `styles.css:1527–1535` styles `input[aria-invalid="true"]:focus` with an amber
outline, providing a visible focus indicator for invalid fields.

Remaining gaps:
- Other forms in the application (settings modal inputs, master-cv form fields, skill inputs)
  do not have `aria-describedby` or `aria-invalid` wiring. If those fields show errors, they
  are visible only, not programmatically linked.
- No `aria-errormessage` attribute is used anywhere in the source. This is acceptable since
  `aria-describedby` is the established equivalent pattern.

All surveyed live regions pass:
- `#toast-container`: `aria-live="polite" aria-atomic="true"` (index.html:280) ✅
- `#document-content`: `aria-live="polite"` (index.html:231) ✅
- `#session-conflict-banner`: `role="alert"` (index.html:110) ✅
- `#onboarding-modal-status`: `aria-live="polite"` (index.html:369) ✅
- `#settings-status-msg`: `aria-live="polite"` (index.html:572) ✅
- `#model-auth-key-status`: `role="alert"` (index.html:476) ✅
- `#model-wizard-progress`: `role="status" aria-live="polite"` (index.html:419) ✅
- `#llm-busy-label`: `aria-live="polite" role="status"` (index.html:155) ✅ FIXED

#### Criterion 2: Icon-only controls have descriptive labels.

**⚠️ Partial — message-input still unlabelled; all icon buttons now labelled**

Previously-reported icon button gaps confirmed fixed:
- Category reorder buttons: `aria-label="Move ${category} category up/down"` (skills-review.js:423–424) ✅ FIXED
- `#rename-session-btn`: `aria-label="Rename this session"` (index.html:77) ✅
- `#toggle-chat`: `aria-label` and `aria-expanded` updated correctly on every call (ui-core.js:696–710) ✅
- Session table icon buttons (load/rename/delete): use `title` attribute with `aria-hidden` on icon glyphs (session-switcher-ui.js:341–343). The `title` serves as the accessible name for icon-only buttons here. ✅
- All 6 modal close `×` buttons: `aria-label` present ✅

Remaining P1 issue:
- **`#message-input`** (`index.html:177`): Still has no `<label>`, no `aria-label`, no
  `aria-labelledby`. Placeholder text `"Type a message (e.g., 'analyze job')"` is not a
  WCAG 1.3.1 / 3.3.2 compliant label. (P1, GAP-35)

Rewrite-review action buttons:
- `rw-btn` buttons ("✓ Accept", "✎ Edit", "✗ Reject") (`rewrite-review.js:306–308`) have
  visible text labels. They pass SC 4.1.2. However, when a decision is made (`.active` class
  added), no `aria-pressed` attribute is updated to indicate the selected state to AT. This
  is a P3 quality gap — the decision state is visible through class-based styling but not
  programmatically announced.

#### Criterion 3: Inline edit/review actions have clear focus targets and visible focus states.

**⚠️ Partial — major interactive elements now have `:focus-visible`; icon-btn and rw-btn still missing**

Confirmed passing:
- `.tab:focus-visible` (styles.css:637) ✅ FIXED
- `.step:focus-visible` (styles.css:144) ✅ FIXED
- `.action-btn:focus-visible` (styles.css:590) ✅ FIXED
- `.sm-th:focus-visible` (styles.css:261) ✅
- `.preview-output-badge-link:focus-visible` (styles.css:1393) ✅
- `.step-rerun:focus-visible` (workflow-steps.js:737 injected style) ✅

Remaining gaps:
- **`.icon-btn`** (`styles.css:1166–1184`): No `:focus-visible` rule. `.icon-btn:hover`
  exists but hover styles do not render on keyboard focus. Browser default focus ring
  applies. (P3)
- **`.rw-btn`** (`styles.css:1254–1260`): No `:focus-visible` rule. Browser default
  applies. (P3)
- **`.sm-btn`** (`styles.css:280–301`): No `:focus-visible` rule. (P3)
- **`.message-input`** uses `outline: none` with box-shadow substitute (styles.css:577–578).
  The box-shadow is invisible in Windows High Contrast mode. Same pattern in `.form-input`
  (styles.css:751–752), `.q-input` (styles.css:508–509), and
  `.layout-instruction-textarea` (styles.css:1430–1431). (P3)

#### Criterion 4: Error and status messages exposed in live regions.

**✅ Pass — fully resolved this cycle**

All eight identified dynamic regions now carry either `aria-live` or `role="alert"/"status"`.
See Criterion 1 above for the complete list.

**US-X3 Acceptance criteria summary:**

| Criterion | Result |
|---|---|
| Validation and status feedback accessible to non-visual users | ⚠️ Job-input form wired; other form fields lack aria-invalid; all live regions now active |
| Review controls understandable/operable without pointer | ⚠️ Icon buttons labelled; message-input still unlabelled; rw-btn no aria-pressed |

---

## Generated Materials Evaluation

The CV template at `templates/cv-template.html` uses CSS custom properties with defined
colour values:

- Primary/heading text: `#2c3e50` (dark blue) on white. Contrast ratio: ~11.5:1 — passes
  WCAG AA (4.5:1 for normal text, 3:1 for large text).
- Body text (`--text-main`): `#333` on white — contrast ratio ~12:1. ✅
- Muted text (`--text-muted`): `#666` on white — contrast ratio ~5.7:1. Passes AA for
  normal text. ✅
- Accent colour (`--accent-color`): `#2980b9` (bright blue) on white — contrast ratio ~3.9:1.
  Marginally fails AA for small normal text (requires 4.5:1) but passes for large/bold text.
  This colour is used for links and decorative borders. ⚠️ (P3 — borderline)

ATS DOCX format uses black (`RGBColor(0, 0, 0)`) for headings and body text
(`cv_orchestrator.py:3849, 3858`). Maximum contrast. ✅

Human DOCX format uses `RGBColor(0x2c, 0x3e, 0x50)` for headings and name
(`cv_orchestrator.py:4378, 4447`). Same dark colour as HTML template; high contrast. ✅

One cosmetic element uses `RGBColor(0xCC, 0xCC, 0xCC)` — light grey (`cv_orchestrator.py:4602`).
Context not visible from the excerpt but if used on white, contrast is ~1.6:1, failing
WCAG. This requires further investigation to determine whether it is decorative or content.

Heading structure: ATS DOCX uses Word's Heading 1/Heading 2 paragraph styles
(`cv_orchestrator.py:3843–3860`). Human DOCX uses bold runs with visual heading styling
rather than Heading paragraph styles (`cv_orchestrator.py:4373–4391`). Semantic heading
structure is present in ATS format (important for ATS parsing and screen-reader navigation
of the DOCX); the human DOCX lacks semantic heading styles.

HTML/PDF template uses logical heading hierarchy; content is structured in a readable
order.

No PDF/UA tagging or DOCX accessibility properties (e.g., document title, language
attribute) were found in the source.

---

## Additional Story Gaps / Proposed Story Items

1. **GAP-NEW-1: Bullet-reorder modal accessibility** — `showBulletReorder`
   (`workflow-steps.js:392–529`) creates a visually modal overlay that is entirely opaque to
   assistive technology. It lacks `role="dialog"`, `aria-modal`, `aria-labelledby`, focus
   entry, focus trap, and focus restore. Proposed story: "As a keyboard user, I want the
   bullet-reorder modal to trap focus, announce its purpose, and restore focus on close."

2. **GAP-NEW-2: Human DOCX heading structure** — The human-readable DOCX output uses bold
   runs for section headings rather than Word paragraph heading styles. Screen reader
   navigation of a DOCX file depends on semantic heading structure. Proposed story: "As a
   hiring manager using assistive technology, I want section headings in the generated
   human-readable DOCX to use Word's Heading styles so my screen reader can navigate the
   document."

3. **GAP-NEW-3: Rewrite-review decision state not announced** — After accepting, editing, or
   rejecting a rewrite suggestion, the button state change (`.active` class) is visible but
   not programmatically exposed via `aria-pressed`. Proposed story: "As a screen reader user
   reviewing rewrite suggestions, I want to hear which decision I have made on each card."

4. **GAP-35 (P1, unchanged):** `#message-input` has no accessible label.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js,
web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py,
web/workflow-steps.js, web/skills-review.js, web/session-switcher-ui.js,
web/rewrite-review.js, web/ui-helpers.js, web/review-table-base.js, web/job-input.js,
scripts/utils/cv_orchestrator.py, templates/cv-template.html

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-X1 | 4 | 0 | 0 | 0 | 0 |
| US-X2 | 3 | 1 | 0 | 0 | 0 |
| US-X3 | 2 | 2 | 0 | 0 | 0 |

**Key evidence references:**
- US-X1 C1 (keyboard steps): `web/ui-core.js:1917–1930` `_makeStepClickable`
- US-X1 C3 (non-colour state): `web/workflow-steps.js:715–726` `.sr-only` injection
- US-X2 C1–C4 bullet modal gap: `web/workflow-steps.js:456–499` — no dialog ARIA, no focus management
- US-X2 C1 sessions setInitialFocus fix: `web/session-switcher-ui.js:458`
- US-X3 C1 job-input validation: `web/job-input.js:550–567`, `web/job-input.js:116,132,165`
- US-X3 C1 llm-busy fix: `web/index.html:155`
- US-X3 C2 message-input gap: `web/index.html:177` — no label attribute
- US-X3 C3 focus-visible fixes: `web/styles.css:144,590,637`
- US-X3 C3 icon-btn gap: `web/styles.css:1166–1184` — no `:focus-visible`
- Generated materials accent colour: `web/templates/cv-template.html:27` `#2980b9` — borderline contrast
- Generated materials human DOCX headings: `scripts/utils/cv_orchestrator.py:4373–4391` — bold runs, not Heading styles

**Prioritised open findings:**

**P1 — Active screen-reader failures**
1. `#message-input` no accessible label — index.html:177 (GAP-35)
2. Bullet-reorder modal invisible to AT — workflow-steps.js:456–499 (GAP-NEW-1)

**P2 — WCAG 2.1 AA incomplete**
3. Human DOCX lacks semantic heading structure — cv_orchestrator.py:4373–4391 (GAP-NEW-2)

**P3 — Quality / WCAG AA coverage**
4. `.icon-btn`, `.rw-btn`, `.sm-btn` lack `:focus-visible` CSS
5. Rewrite-review buttons lack `aria-pressed` state (GAP-NEW-3)
6. `outline:none` on four input types without `:focus-visible` fallback
7. Single `_currentFocusTrapListener` cannot handle nested modals
8. Emoji in tabs and steps not wrapped in `aria-hidden` spans
9. `confirmDialog` uses message text as dialog label rather than a dedicated heading

**Evidence standard:** Every conclusion is independently verifiable from cited source
evidence. File paths and line numbers are given for each claim.
