<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Evaluation
**Persona:** Accessibility Specialist
**Date:** 2026-07-01
**Branch:** feature/multi-user-deployment
**Source files reviewed:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

#### Summary
The workflow nav bar and the tab bar have been substantially hardened for keyboard and screen-reader access. Several gaps remain.

#### Criterion 1 — Keyboard reachability of workflow step elements
**PASS with minor gap.**

- The `job` step is given `role="button"` and `tabindex="0"` in static HTML (`index.html` line 124). The other 11 steps start without those attributes and are deliberately inert until `updateWorkflowStepsClickable()` is called.
- `ui-core.js:1865–1878` contains `_makeStepClickable()`, which adds `role="button"`, `tabindex="0"`, and a keydown listener for Enter/Space before attaching `handleStepClick`. Steps removed from the interaction path are correctly reverted by `_makeStepInert()`.
- **Gap (minor):** The static HTML markup shows steps 2–12 without `role` or `tabindex`. Until `fetchStatus()` completes and `updateWorkflowStepsClickable` fires, those steps are unreachable by keyboard. This window is short in practice but is technically a transient failure.

#### Criterion 2 — Stage tabs expose correct tab semantics, selected state, and panel association
**PASS.**

- The tab bar container carries `role="tablist"` and `aria-label="Application workflow tabs"` (`index.html` line 207).
- Each tab `div` has `role="tab"`, `aria-selected` (true/false), `tabindex` (0/-1), and `aria-controls="document-content"` (lines 208–233).
- `switchTab()` in `review-table-base.js:135–148` updates `aria-selected` and `tabindex` on all tabs using the roving tabindex pattern and updates `aria-labelledby` on the single `role="tabpanel"` element.
- Keyboard navigation (ArrowLeft, ArrowRight, Home, End, Enter, Space) is wired in `ui-core.js:461–486` following the WCAG 2.1 tablist pattern.
- **Limitation:** All tabs share a single tabpanel (`document-content`), so `aria-controls` from every tab points to the same element. This is structurally valid for a single-panel rotor, but assistive technologies may not infer the one-to-one logical mapping as clearly as separate panel elements would.

#### Criterion 3 — Active and completed states conveyed beyond colour alone
**PASS.**

- `workflow-steps.js:891–903` injects a hidden `<span class="sr-only">` suffix describing each step's state: "(current step)", "(completed)", "(stale — results may be outdated)", "(critical — review required)", or "(previously completed — click to jump ahead)".
- `styles.css:37–48` defines a correct `.sr-only` rule (1 px collapsed box, `clip`, `overflow:hidden`, `white-space:nowrap`).
- `.tab.active` adds a 3 px blue underline border and a color shift; `.tab--visited` adds a small green dot. Neither relies solely on colour — active tabs also gain `aria-selected="true"`.

#### Criterion 4 — Changes in active stage or tab announced programmatically
**PASS.**

- `index.html:149–151` inserts a hidden `aria-live="polite"` `aria-atomic="true"` region (`#workflow-stage-announcer`).
- `review-table-base.js:157–162` clears the region and writes "Now viewing: [tab label]" after a 50 ms timeout on every `switchTab()` call.

#### Failure Modes Check
- Clickable elements not keyboard reachable: **mitigated** (transient gap during startup as noted).
- Tabs styled visually but missing `role`/selection state: **not present**.
- Status indicated only by colour: **not present** — `.sr-only` text supplements colour classes.

---

### US-X2: Modal and Dialog Accessibility

#### Summary
The application has a centralized focus management system that covers most modals well. Coverage is consistent but one path is missing focus-stack save.

#### Criterion 1 — Opening a modal moves focus into it
**PASS.**

- `ui-core.js:284–297` — `setInitialFocus()` targets a `[data-focus-target="true"]` element, falls back to the first text input, then the first button, and applies focus with a 50 ms delay.
- All major modal open functions call this: `openSettingsModal` (ui-core.js:254), `openModelModal` (ui-core.js:1454), `openSessionsModal` (session-switcher-ui.js:537), `openMasterCvModal` (master-cv.js:2618), `openAtsReportModal` (ats-modals.js:163), `openJobAnalysisModal` (ats-modals.js:285), `showWelcomeModal` (session-manager.js:205).
- The `confirmDialog()` function (ui-core.js:371–442) focuses the OK button immediately on opening and traps focus between OK and Cancel.

#### Criterion 2 — Focus is trapped inside the modal while open
**PASS.**

- `trapFocus()` (ui-core.js:304–335) uses a keydown listener that wraps Tab/Shift+Tab between the first and last focusable elements within the modal container.
- A `_focusTrapStack` array allows nested traps, so opening a sub-modal while another is open does not leave the outer trap orphaned.
- The `confirmDialog()` function has its own in-place focus trap that also handles Escape.

#### Criterion 3 — Closing a modal restores focus to the triggering control
**PASS (with one inconsistency).**

- `restoreFocus()` (ui-core.js:340–346) pops `_focusStack` and calls `.focus()` on the stored element; it also removes the corresponding trap listener from `_focusTrapStack`.
- This is called in all close paths checked: `closeSettingsModal`, `closeSessionsModal`, `closeMasterCvModal`, `closeAtsReportModal`, `closeJobAnalysisModal`, `closeModal()` (generic), `closeAllModals()`.
- **Gap:** `openAtsReportModal` (ats-modals.js:155–197) and `openJobAnalysisModal` (ats-modals.js:278–304) call `trapFocus` but do **not** push to `_focusStack` before calling it. `restoreFocus()` on close pops whatever the previous stack entry was, which may return focus to the wrong element if these modals are opened first.

#### Criterion 4 — Dialog title and purpose programmatically exposed
**PASS.**

- All `role="dialog"` elements in the HTML carry `aria-modal="true"` and `aria-labelledby` pointing to an `h2` inside the dialog.
- Alert and confirm modals additionally carry `aria-describedby` linking to the message paragraph (`index.html` lines 291–318).
- The dynamically created `confirmDialog` box (ui-core.js:383–388) sets `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="confirm-dialog-msg"`.

#### Failure Modes Check
- Focus remaining behind open modal: **not present** for primary modals.
- Escape or close leaving focus lost: **not present** — `restoreFocus()` is called.
- Multiple dialogs lacking accessible labels: **not present** — all inspected dialogs have labeled headings.

---

### US-X3: Forms, Errors, and Review Controls

#### Summary
Form validation and review controls are generally well-labelled. Icon-only buttons consistently carry `aria-label` in review panels. Validation errors are exposed through live regions in the job input area. Spell-check action buttons and some settings form inputs have coverage gaps.

#### Criterion 1 — Inputs with validation errors expose errors via accessible associations
**PASS (job input); PARTIAL elsewhere.**

- `job-input.js:116–135` uses `aria-describedby` on the paste textarea and the URL input, pointing to error `<span>` elements that carry `aria-live="polite"`. `aria-invalid="true"` is set programmatically when validation fires (job-input.js:556/566).
- CSS `input[aria-invalid="true"]:focus` (styles.css:1591–1595) provides a red focus ring, reinforcing the state visually.
- **Gap:** The settings modal inputs, the clarification modal inputs, and the master-CV editor form inputs do not appear to use `aria-describedby` or `aria-invalid`. Validation in those forms relies on in-place error text rather than programmatic association.

#### Criterion 2 — Icon-only controls have descriptive labels
**PASS (review tables and master CV); PARTIAL (spell check).**

- Achievements review (achievements-review.js:275–282): icon buttons carry compound `aria-label` including item name, e.g. `"Emphasize [title]"`, `"Move [title] earlier"`.
- Skills review (skills-review.js:849–854): same pattern with `aria-pressed` toggling state.
- Publications review (publications-review.js:171–173, 265–266): `aria-label` includes cite key.
- Master CV edit/delete buttons (master-cv.js:891–894): `aria-label="Edit experience: [title]"` / `"Delete experience: [title]"`.
- **Gap (spell check):** Spell-check action buttons in spell-check.js:249–255 ("Apply", "Ignore", "Add to Dictionary") use only `title` attributes. Title attributes are not reliably announced by all screen readers. These need `aria-label` matching the button text or action.

#### Criterion 3 — Inline edit/review actions have clear focus targets and visible focus states
**PASS.**

- `styles.css:1227` — `.icon-btn:focus-visible { outline: 2px solid var(--cv-accent); outline-offset: 2px; }`.
- `.action-btn:focus-visible`, `.rw-btn:focus-visible`, `.tab:focus-visible`, `.step:focus-visible`, `.sm-btn:focus-visible` — all carry the same 2 px blue focus ring (styles.css lines 610, 1300, 657, 158, 312).
- The `prefers-contrast: more` media query (styles.css:1681–1688) increases borders to 2 px solid black for interactive elements.
- `prefers-reduced-motion: reduce` (styles.css:1670–1679) suppresses animations throughout.
- Rewrite review cards gain a `.kb-focused` class with an additional 4 px shadow ring when keyboard-navigated (styles.css:1272).

#### Criterion 4 — Error and status messages exposed in a way assistive tech can detect
**PASS.**

- Toast container (`#toast-container`): `aria-live="polite"` and `aria-atomic="true"` (`index.html` line 288).
- Session-conflict banner (`#session-conflict-banner`): `role="alert"` (`index.html` line 115).
- LLM busy label: `aria-live="polite"` and `role="status"` (`index.html` line 163).
- Onboarding modal status paragraph: `aria-live="polite"` (`index.html` line 386).
- Settings modal status: `aria-live="polite"` in `settings-status-msg` (`index.html` line 589).
- Model wizard progress bar: `role="status"` and `aria-live="polite"` (`index.html` line 436).

#### Failure Modes Check
- Validation errors shown only visually: **partially present** — job input is correct; other form areas lack `aria-describedby` wiring.
- Reorder or close buttons without labels: **not present** for review tables; **present** for spell-check action buttons (`title` only).
- Focus outline removed without accessible replacement: **not present** — `:focus-visible` outlines are present throughout.

---

### Terminology Clarity Assessment

| Term | Clarity | Notes |
|------|---------|-------|
| ATS | Good | Expanded inline in `title` and `aria-label` at point of use; onboarding modal explains it |
| Harvest | Good | Tooltip on workflow step explains the metaphor in plain English |
| LLM | Poor | Used in header buttons and wizard title without expansion; non-expert users may not know the abbreviation |
| Spell Check step CTA | Confusing | Step is named "Spell Check" but the primary action button reads "Generate Preview" — the tooltip explains this but the label alone is misleading |
| Compact toggle (rewrite) | Acceptable | Label "Compact" is brief; a `title` tooltip supplements it; acceptable for this context |
| Customise | Clear | Plain English; no issue |

---

## Generated Materials Evaluation

Generated DOCX/PDF rendering is handled by backend Python scripts not included in the required source set. The following observations are inferred from the UI pipeline and available settings.

### Structure and Reading Order
- The application generates ATS DOCX (machine-readable), Human DOCX, and Human PDF formats (settings modal). There is no evidence of tagged PDF/UA export, which is expected for a resume tool; PDF/UA is rarely required for job-application documents.
- Section ordering is user-controlled through Skills, Achievements, and Experience review panels. The generated document's reading order reflects intentional user decisions made during the review workflow.

### Content Readability
- Review panels for Summary, Tagline, and Experience Bullets give users full edit control before generation. AI rewrites are offered but not forced, preserving the user's own voice and terminology.
- The weak-bullet advisory badge system (`.weak-badge`, styles.css:1277) and AI rewrite offers encourage plain-language, action-verb-led bullet points, which improves readability for both human readers and any AT parsing plain-text extracted from the documents.

### Terminology Clarity in Generated Materials
- The frontend pipeline does not directly expose system prompts or LLM instructions, so the quality of generated CV language cannot be evaluated from source alone. A live session output review would be needed to assess generated-text readability.

---

## Prioritized Gaps

| # | Severity | Location | Description |
|---|----------|----------|-------------|
| 1 | MEDIUM | spell-check.js:249–255 | Spell-check action buttons ("Apply", "Ignore", "Add to Dictionary") use `title` only; add `aria-label` matching each action |
| 2 | MEDIUM | ats-modals.js:155–197, 278–304 | `openAtsReportModal` and `openJobAnalysisModal` call `trapFocus` without first pushing to `_focusStack`; add `_focusStack.push(document.activeElement)` in each opener |
| 3 | LOW | Settings modal, master-CV editor forms | Form inputs lack `aria-describedby` linking to error message spans and `aria-invalid` toggling; add these to meet WCAG 1.3.1 / 4.1.3 |
| 4 | LOW | Header model-selector button, LLM wizard title | "LLM" acronym not expanded; add `title="AI Language Model"` or spell out in visible text (WCAG 3.1.4) |
| 5 | INFO | index.html steps 2–12 | Steps start with no `role`/`tabindex` until `fetchStatus` completes; adding `tabindex="-1"` in static HTML would clarify inertness and remove the transient unreachable state |
