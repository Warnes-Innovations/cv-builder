<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-07-06 14:30 ET

**Executive Summary:** Source-verified accessibility specialist persona review. The application has a solid accessibility foundation — focus management, focus traps, keyboard navigation, ARIA landmark roles, live regions, and reduced-motion/high-contrast media queries are all implemented. The primary remaining gaps are: (1) locked workflow step elements lack `role="button"` and `tabindex` at initial page load before JS enrichment, (2) review sub-tab controls use `<button>` elements without `role="tab"` or `aria-selected` state, (3) the `confirmDialog()` function uses `aria-labelledby` pointing to a `<p>` rather than a heading, and (4) the model-table rows are mouse-only (click/hover) with no keyboard interaction. The generated CV HTML output is semantically structured but Font Awesome icons in section headings lack `aria-hidden="true"`, and the ATS DOCX template HTML (`cv_orchestrator.py:1199`) emits `<html>` without a `lang` attribute.

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Workflow-step elements reachable/operable by keyboard where supported | ⚠️ Partial | `step-job` has `role="button" tabindex="0"` at parse time (`index.html:124`). Remaining steps start as plain `<div>` with no `role` or `tabindex` (`index.html:126–146`); `_makeStepClickable()` adds `role="button"` and `tabindex="0"` dynamically (`ui-core.js:1872–1882`). Gap: if JS is slow or the user interacts before `updateWorkflowStepsClickable()` fires, locked steps are unreachable divs with `onclick` but no keyboard affordance. |
| Stage tabs expose correct tab semantics, selected state, and panel association | ✅ Pass | Tab elements carry `role="tab"`, `aria-selected`, `aria-controls="document-content"`, and roving `tabindex`. `switchTab()` correctly updates `aria-selected` and `tabindex` on all tabs (`review-table-base.js:137–148`). `document-content` carries `role="tabpanel"` and `aria-labelledby` is dynamically updated on tab switch (`index.html:239`, `review-table-base.js:148`). |
| Tab bar supports Arrow/Home/End keyboard navigation (WCAG tablist pattern) | ✅ Pass | `ArrowLeft/Right/Home/End` implemented in `setupEventListeners()` (`ui-core.js:473–489`). Enter/Space activate (`ui-core.js:467–470`). |
| Active and completed step states conveyed beyond colour alone | ⚠️ Partial | `aria-current="step"` set on the active workflow step (`ui-core.js:1927`). Step label text ("Job Input", "Analysis", etc.) is visible inside each step `<div>`. However, `completed` vs `active` vs `stale` distinction is colour-and-background only (`.step.completed` = green, `.step.stale` = amber — `styles.css:267–270`). No textual or icon supplement differentiates "completed" from "active" in a colour-blind scenario without the `aria-current` hint. |
| Stage/tab changes announced to screen readers | ✅ Pass | `workflow-stage-announcer` live region with `aria-live="polite" aria-atomic="true"` (`index.html:150–151`). `switchTab()` populates it with "Now viewing: [tab label]" (`review-table-base.js:159–163`). |
| Tab scroll arrow buttons accessible | ✅ Pass | `aria-label="Scroll tabs left"` and `aria-label="Scroll tabs right"` (`index.html:206, 235`). |

### US-X2: Modal and Dialog Accessibility

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Opening a modal moves focus into it | ✅ Pass | `_focusStack.push(document.activeElement); setInitialFocus(modalId); trapFocus(modalId)` pattern used consistently for Settings (`ui-core.js:252–255`), Model (`ui-core.js:1456–1459`), Sessions, confirmDialog (`ui-core.js:411–412`), Alert/Confirm (`ui-helpers.js:38–40, 64–66`). |
| Focus trap inside open modal | ✅ Pass | `trapFocus()` adds a `keydown` listener cycling Tab/Shift+Tab within focusable elements (`ui-core.js:304–335`). `confirmDialog()` has its own inline trap (`ui-core.js:415–425`). |
| Closing modal restores focus to triggering element | ✅ Pass | `restoreFocus()` pops `_focusStack` and calls `.focus()` on the stored element (`ui-core.js:340–345`). Alert modal uses `_alertPreviousFocus` pattern (`ui-helpers.js:32–48`). |
| Dialog title exposed programmatically | ✅ Pass | All modal overlays carry `aria-labelledby` pointing to a heading element (e.g., `sessions-modal-title`, `alert-modal-title`, `model-modal-title` — `index.html:253, 291, 422`). |
| `confirmDialog()` heading semantics | ⚠️ Partial | The dynamically-created `confirmDialog` uses `aria-labelledby="confirm-dialog-msg"` where `#confirm-dialog-msg` is a `<p>` element (`ui-core.js:388–391`). ARIA spec recommends the labelledby target be a heading or the dialog's own label — a `<p>` works but is non-ideal for AT that announces dialog headings distinctly. |
| Escape closes modals | ✅ Pass | Global `keydown` listener closes all modals on Escape (`ui-core.js:507–510`). `confirmDialog()` also handles Escape (`ui-core.js:440`). |
| Multiple dialogs do not clobber each other | ⚠️ Partial | Stack-based `_focusStack`/`_focusTrapStack` supports nested modals in theory. However, `closeAlertModal()` does not call `restoreFocus()` — it uses its own `_alertPreviousFocus` variable (`ui-helpers.js:43–48`). This means if an alert opens while another modal is already focus-trapped, the focus trap from the first modal is not removed. The `_focusTrapStack` and `_focusStack` can diverge when `showAlertModal()` is used (it calls `setInitialFocus`/`trapFocus` but not `_focusStack.push`). |

### US-X3: Forms, Errors, and Review Controls

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Inputs with validation errors expose errors via accessible associations | ⚠️ Partial | CSS rule for `input[aria-invalid="true"]` exists (`styles.css:1756–1760`). `model-auth-key-status` uses `role="alert"` (`index.html:493`). However, input fields that fail validation (e.g., Master CV publication fields) use `showAlertModal()` rather than associating error text with the specific input via `aria-describedby` (`master-cv.js:1542–1549`). No `aria-invalid="true"` is observed being set programmatically in the source. |
| Icon-only controls have descriptive labels | ✅ Pass | Experience review icon buttons have `aria-label` with the experience title (e.g., `aria-label="Emphasize ${titleEsc}"` — `experience-review.js:248–254`). Action icon buttons in session table and modals carry `aria-label` attributes. |
| Inline edit/review action controls have visible focus states | ✅ Pass | `.icon-btn:focus-visible`, `.rw-btn:focus-visible`, `.action-btn:focus-visible`, `.tab:focus-visible`, `.step:focus-visible`, `.sm-btn:focus-visible` all defined with 2px outline (`styles.css:258, 415, 712, 759, 1352, 1436, 1496`). |
| Review cards keyboard-navigable (rewrite/spell-check tabs) | ✅ Pass | `keyboard-shortcuts.js` implements `ArrowUp/Down` to navigate between `.rewrite-card` and `.spell-card` elements, `A` to accept, `R` to reject (`keyboard-shortcuts.js:216–235`). Focused card highlighted with `kb-focused` CSS class with visible outline (`styles.css:1408`). |
| Review sub-tabs (customizations stage) expose tab semantics | ❌ Fail | `review-subtab` elements are `<button>` elements with a `.active` CSS class toggle but no `role="tab"`, `aria-selected`, or `aria-controls` attributes (`review-table-base.js:672–676`, `styles.css:810–824`). Screen readers cannot determine which sub-tab is selected or which panel it controls. |
| Error and status messages exposed via live region | ✅ Pass | `toast-container` has `aria-live="polite" aria-atomic="true"` (`index.html:288`). `settings-status-msg` has `aria-live="polite"` (`index.html:589`). `llm-busy-label` has `aria-live="polite" role="status"` (`index.html:163`). |
| Model selection table rows keyboard-accessible | ❌ Fail | Model table rows in the LLM wizard are click-only. `tbody.onclick` delegation is used (`ui-core.js:1603`), but no `tabindex`, `role`, or `keydown` handler is added to `<tr>` elements. Keyboard users cannot select a model from the full catalog table. |
| Model wizard progress bar step states announced | ✅ Pass | Progress steps use `aria-current="step"` for the active step and `aria-current="false"` for others (`ui-core.js:1295–1304`). Wrapper has `role="status" aria-live="polite"` (`index.html:436`). |
| `aria-pressed` on toggle action buttons | ✅ Pass | Experience review icon action buttons use `aria-pressed` to convey toggle state (`experience-review.js:248–251`). Toggle-group switch buttons update `aria-pressed` programmatically (`review-table-base.js:821–930`). |
| Keyboard shortcut help panel has dialog role | ✅ Pass | `keyboard-shortcuts.js:138–141` sets `role="dialog" aria-modal="true" aria-label="Keyboard shortcuts"`. Close button has `aria-label="Close keyboard shortcuts"`. |

### Additional Application Accessibility Findings

**Motor Accessibility — Keyboard Shortcuts**
The `A` and `R` single-key shortcuts for accept/reject review cards (`keyboard-shortcuts.js:225–231`) fire on `keydown` without modifier key. While suppressed inside text inputs, any inadvertent focus change could trigger an unintended accept/reject without confirmation. Power users will appreciate this, but it carries a risk for users with tremor or motor impairment who may brush keys.

**Focus outline — `toggle-chat` button**
The `.toggle-chat` button has no `:focus-visible` CSS rule. It uses `background: var(--cv-accent)` but no explicit focus ring. Native browser focus indicator may be visible, but the consistent 2px outline pattern used elsewhere is absent for this control (`styles.css:468–487`).

**Keyboard shortcut discovery**
The `?` shortcut reveals the help panel, which is a good practice. However, no static affordance (hint text, `aria-keyshortcuts` attribute) on any primary action button tells first-time keyboard users that shortcuts exist.

**`aria-hidden` on spinner in wizard busy overlay**
`loading-spinner` in `model-wizard-busy-overlay` has `aria-hidden="true"` correctly (`index.html:431`). The text in `model-wizard-busy-message` is readable by AT.

**`role="alert"` on conflict banner**
Session conflict banner has `role="alert"` (`index.html:115`), which will announce immediately. This is correct for a time-sensitive conflict notification.

**Onboarding modal `aria-labelledby` without `aria-describedby`**
`onboarding-modal-overlay` has `aria-labelledby="onboarding-modal-title"` but no `aria-describedby`. The body content is substantial — adding `aria-describedby` pointing to the first substantive paragraph would improve AT comprehension of the modal purpose.

**Colour contrast — low-priority concern**
CSS custom properties map to Tailwind palette values. `--cv-text-secondary` (#64748b) on `--cv-bg-light` (#f8fafc) yields approximately 4.0:1 — below WCAG AA 4.5:1 for normal-size text. This affects secondary labels throughout the UI (`styles.css:22,24`). The `@media (prefers-contrast: more)` rule applies `color: var(--cv-black)` and `background: var(--cv-white)` to `body` which resolves the issue for forced-contrast users (`styles.css:1847–1854`).

**Reduced-motion accommodation**
`@media (prefers-reduced-motion: reduce)` globally disables animations and transitions (`styles.css:1837–1845`). This is correct WCAG 2.3.3 conformance.

---

## Generated Materials Evaluation

### HTML CV Output (e.g., `CV_Genentech_SeniorRPackageDevelo_2026-03-26.html`)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `lang` attribute on `<html>` | ✅ Pass | Generated CV HTML has `<html lang="en">` (`CV_Genentech...html:3`). |
| Semantic headings (H1, H2) | ✅ Pass | `<h1 class="name">`, `<h2 class="section-title">` used for candidate name and section titles. `<main>`, `<header>`, `<section>` landmarks used correctly (`CV_Genentech...html:765–847`). |
| Font Awesome icons in headings have `aria-hidden` | ❌ Fail | Section heading icons (`<i class="fas fa-user-circle">`, `<i class="fas fa-trophy">`, etc.) lack `aria-hidden="true"`. Screen readers will read aloud the Font Awesome Unicode characters or class names depending on the AT and browser. `cv_orchestrator.py` templates generate these icons without suppression (`CV_Genentech...html:772, 779, 794, 847`). |
| Contact icons have `aria-hidden` or `aria-label` | ❌ Fail | Sidebar contact icons (`<i class="fas fa-envelope">`, `<i class="fab fa-linkedin">` — `CV_Genentech...html:702–714`) are standalone decorative icons adjacent to text. Missing `aria-hidden="true"` means AT reads both the icon glyph description and the contact value. |
| ATS DOCX HTML template has `lang` attribute | ❌ Fail | `cv_orchestrator.py:1199` generates `'<html><head>'` without `lang="en"`. This affects screen reader language detection for the ATS-format HTML output. |
| DOCX output uses semantic heading styles | ✅ Pass | `cv_orchestrator.py` uses `style='Heading 1'` and `style='Heading 2'` for section and sub-section headings (`cv_orchestrator.py:3892, 3911, 3921, 3956, 4008–4020`). This produces structurally accessible DOCX navigation. |
| Body text font size in DOCX | ✅ Pass | Normal style set to `Pt(11)` (`cv_orchestrator.py:4030`). 11pt body text meets typical readability guidelines. |
| Cover letter DOCX structure | ⚠️ Partial | `_write_cover_letter_docx()` in `cv-preview.py:351–357` uses `doc.add_paragraph()` only — no headings, no structured styles beyond normal paragraph. Acceptable for a letter format but no explicit `Normal` style is applied, relying on python-docx defaults. |
| ATS-friendly plaintext section | ✅ Pass | Generated HTML CV includes `<section id="plaintext" aria-hidden="true">` containing a plain-text version (`CV_Genentech...html:1001`). This is hidden from AT but available for ATS parsing — reasonable design choice. |
| Skill alias tooltips | ✅ Pass | `<span class="skill-alias" title="Also known as: CI/CD"> (CI/CD)</span>` provides contextual tooltip (`CV_Genentech...html:820`). The parenthetical text is also visible, so the information is not tooltip-only. |

---

## Terminology Clarity Review

| Term | Finding |
|------|---------|
| "ATS" | ❌ Overloaded jargon — used for both "ATS Score" badge and "ATS DOCX" format. First-time users may not know Applicant Tracking System. `ats-report-btn` title provides full expansion (`index.html:107`), ATS badge has informative `title` tooltip (`index.html:92`). Acceptable but not self-explanatory. |
| "Harvest" (step label) | ⚠️ Domain-specific metaphor. The tooltip provides a clear explanation (`index.html:146`), but the one-word label alone may not be clear to new users. |
| "Customise" (step label) | ✅ Clear in context. |
| "Generate Preview →" (spell-btn) | ⚠️ "Generate Preview" is the third tooltip description but the step title says "Spell Check". The button title notes it is "Step 1 of 3" (`index.html:194`), which helps but adds cognitive load with a 3-step sub-workflow inside a single step pill. |
| "Continue to Spell Check →" (rewrite-btn) | ✅ Clear directional label. |
| "Package Application Files" (finalise-btn) | ✅ Reasonable. |
| "LLM" (header selector button) | ❌ Developer-centric acronym. "LLM: …" in the header model-selector pill (`index.html:53`) is not user-friendly. Consider "AI Model:" or simply the provider name. |
| "⚠ Non-confidential" badge | ⚠️ Meaningful warning but "Non-confidential" is a double-negative. "Data may be shared" or "Not private" would be more immediately understood. |
| "Parked" (session status) | ⚠️ Informal jargon. Users may not understand "parked" vs. "saved". |
| "Reorder bullets for [experience]" (icon label) | ✅ Clear aria-label with context. |

---

## Additional Story Gaps / Proposed Story Items

**US-X4 (New): Review Sub-Tab ARIA Semantics**
The customisation stage uses `.review-subtab` `<button>` elements (Experiences, Skills, Achievements, Summary, Publications) that toggle pane visibility but do not carry `role="tab"`, `aria-selected`, or `aria-controls` attributes. Screen readers cannot determine the active sub-tab or navigate using AT tab-list patterns. Proposed acceptance criteria: each sub-tab button has `role="tab"`, `aria-selected="true/false"`, and `aria-controls` pointing to its panel; the container has `role="tablist"`.

**US-X5 (New): Model Catalog Table Keyboard Access**
The model selection table in the LLM wizard (`#model-table`) is clickable via mouse delegation only. Keyboard users cannot Tab into rows or use Enter/Space to select a model. Proposed acceptance criteria: table rows have `tabindex="0"` and `keydown` handlers for Enter/Space to select; or the quick-model button list provides keyboard access to all available models.

**US-X6 (New): Icon-only Elements in Generated CV**
Font Awesome icons embedded in generated HTML CV section headings and contact icons lack `aria-hidden="true"`. Proposed acceptance criteria: all `<i class="fa*">` elements in generated HTML templates have `aria-hidden="true"` added to prevent AT from reading icon glyph names or Unicode. This applies to the Jinja2 templates in `cv_orchestrator.py`.

**US-X7 (New): `lang` Attribute on ATS HTML Template**
The ATS DOCX intermediate HTML (`cv_orchestrator.py:1199`) lacks `lang="en"` on the root `<html>` element. Proposed acceptance criteria: all generated HTML documents (human PDF template, ATS HTML, cover letter HTML) carry `<html lang="en">` or the appropriate BCP47 language tag.

**US-X8 (New): Alert Modal Focus Stack Isolation**
`showAlertModal()` calls `trapFocus()` and `setInitialFocus()` but pushes to the `_focusTrapStack` without a matching entry in `_focusStack`. When the alert is closed, the underlying modal's trap listener from `_focusTrapStack` may be consumed by `restoreFocus()` rather than the alert's trap. Proposed acceptance criteria: `showAlertModal()`/`closeAlertModal()` use the same `_focusStack`/`_focusTrapStack` coordination as `openSettingsModal()`, or a separate audit confirms no stack divergence path exists.

**US-X9 (New): `toggle-chat` Focus Ring**
The `.toggle-chat` button lacks a `:focus-visible` CSS rule, relying on browser default. Other interactive elements use a consistent 2px blue outline. Proposed acceptance criteria: add `.toggle-chat:focus-visible { outline: 2px solid var(--cv-accent); outline-offset: 2px; }` to `styles.css`.

---

**Reviewed against:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `web/review-table-base.js`, `web/ui-helpers.js`, `web/keyboard-shortcuts.js`, `web/experience-review.js`, `scripts/utils/cv_orchestrator.py`, generated `CV_Genentech_SeniorRPackageDevelo_2026-03-26.html`

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-X1 | 3 | 2 | 0 | 0 | 0 |
| US-X2 | 4 | 2 | 0 | 0 | 0 |
| US-X3 | 5 | 2 | 2 | 0 | 0 |
| Generated Materials | 4 | 1 | 3 | 0 | 0 |
| **Totals** | **16** | **7** | **5** | **0** | **0** |

**Key evidence references:**

- US-X1 workflow step keyboard enrichment: `ui-core.js:1869–1894` `_makeStepClickable()` / `_makeStepInert()`
- US-X1 `aria-current="step"` on active step: `ui-core.js:1924–1928`
- US-X1 tab ARIA pattern: `review-table-base.js:136–148`
- US-X1 tab keyboard nav (Arrow/Home/End): `ui-core.js:465–490`
- US-X1 stage announcer live region: `index.html:150–151`, `review-table-base.js:159–163`
- US-X2 focus stack/trap: `ui-core.js:29–35`, `ui-core.js:300–345`
- US-X2 confirmDialog focus trap: `ui-core.js:375–447`
- US-X2 alert modal focus isolation gap: `ui-helpers.js:34–49` (no `_focusStack.push`)
- US-X3 review sub-tab ❌: `review-table-base.js:672–676`, `styles.css:810–824`
- US-X3 model table keyboard ❌: `ui-core.js:1570–1626` (no `tabindex` or `keydown` on `<tr>`)
- US-X3 `aria-invalid` CSS hook: `styles.css:1756–1760` (hook exists; JS never sets the attribute)
- Generated CV icons ❌: `CV_Genentech...html:702–714, 772–847`
- ATS HTML missing `lang` ❌: `cv_orchestrator.py:1199`
- DOCX Heading styles ✅: `cv_orchestrator.py:3892, 3911, 3921, 3956, 4008–4020`
- Reduced-motion ✅: `styles.css:1837–1845`
- High-contrast ✅: `styles.css:1847–1854`
- Keyboard shortcuts: `keyboard-shortcuts.js:1–246`

**Evidence standard:** Every conclusion supported by file:line evidence from source files read in this session.
