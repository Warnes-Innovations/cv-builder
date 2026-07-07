<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-07-06 14:15 ET

**Executive Summary:** The cv-builder application demonstrates strong accessibility fundamentals — comprehensive focus-visible styles, full ARIA tablist/tab semantics, focus-trap and focus-restore for all major dialogs, live regions for status feedback, and a `prefers-reduced-motion` accommodation. Two meaningful gaps remain: (1) modals opened via inline `style.display` never toggle `aria-hidden`, leaving background content accessible to AT while a dialog is open; and (2) workflow step states beyond "active" (completed, stale, critical) are communicated by colour alone with no text alternative. Review table action buttons are fully labelled via `aria-label` and `aria-pressed`.

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Workflow-step elements reachable and operable by keyboard | ✅ Pass | `updateWorkflowStepsClickable()` (ui-core.js:1884–1909) applies `role="button"`, `tabindex="0"`, and Enter/Space keydown handlers to each unlocked step; inert steps get `tabindex="-1"` and have `role` removed. |
| Stage tabs expose correct tab semantics, selected state, panel association | ✅ Pass | `#tab-bar role="tablist"` (index.html:207); each tab has `role="tab"`, `aria-selected`, `aria-controls="document-content"` (index.html:208–233); `#document-content role="tabpanel"` with `aria-labelledby` updated on every tab switch (bundle.js:3604). |
| Arrow/Home/End keyboard navigation on tab bar | ✅ Pass | Full WCAG 2.1 AA tablist pattern: ArrowLeft/ArrowRight/Home/End implemented in `setupEventListeners()` (ui-core.js:473–490). |
| Active stage position is perceivable without colour vision | ⚠️ Partial | `aria-current="step"` is set on the currently active workflow step (ui-core.js:1941) — active state is non-visual. However, `.step.completed`, `.step.stale`, and `.step.stale-critical` states are conveyed by colour class only (styles.css:268–272). No `aria-current`, sr-only label, or other programmatic marker distinguishes a completed step from an active or upcoming one. |
| Tab changes announced to assistive technology | ✅ Pass | `#workflow-stage-announcer aria-live="polite" aria-atomic="true"` (index.html:150–151) populated with the active tab's text content on every switch (bundle.js:3611–3615). |

**US-X1 Net:** 4 pass, 1 partial. The completed/stale state gap is the only outstanding issue.

---

### US-X2: Modal and Dialog Accessibility

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Opening a modal moves focus into it | ✅ Pass | `setInitialFocus()` called in `openSettingsModal()` (ui-core.js:254), `openModelModal()` (ui-core.js:1458), and `openSessionsModal2` (bundle.js:21794). `confirmDialog()` explicitly focuses the OK button (ui-core.js:411). |
| Focus is trapped inside the modal while open | ✅ Pass | `trapFocus()` (ui-core.js:304–335) wraps Tab/Shift+Tab inside the focusable element list. Called for settings, model, sessions modals. `confirmDialog()` implements its own inline trap (ui-core.js:415–426). |
| Closing a modal restores focus to the triggering control | ⚠️ Partial | `restoreFocus()` pops from `_focusStack` (ui-core.js:340–346). `openSettingsModal` and `openModelModal` both push to `_focusStack` before opening, so restore works. However, `openSessionsModal2` (bundle.js:21790) stores focus in `window._focusedElementBeforeModal` — a different variable — then calls `restoreFocus()` on close. Because nothing was pushed to `_focusStack`, the pop retrieves a stale entry, breaking focus restoration for the sessions modal. |
| `aria-hidden` toggled to hide background content from AT | ❌ Fail | Modals opened via `overlay.style.display = 'flex'` directly (sessions, settings, model, ATS report, job analysis, onboarding, ownership-conflict) never set `aria-hidden="false"/"true"`. Only the `openModal()`/`closeModal()` helpers manage `aria-hidden` (ui-core.js:667–694), and those helpers are not used by any of the primary modals. Background content remains available to screen readers while a dialog is open. |
| Dialog title and purpose programmatically exposed | ✅ Pass | All modals carry `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to their `<h2>` title element (index.html:253, 275, 291, 306, 323, 405, 422, 582, 699, 715). Alert and Confirm modals additionally carry `aria-describedby` for the message body. |
| Escape key closes modals | ✅ Pass | Document-level keydown listener calls `closeAllModals()` on Escape (ui-core.js:507–510). |
| Custom confirm dialog fully accessible | ✅ Pass | `confirmDialog()` (ui-core.js:375–447) creates `role="dialog" aria-modal="true" aria-labelledby`, traps focus between two buttons, handles Escape to cancel, restores `previousFocus` on close. |

**US-X2 Net:** 4 pass, 1 partial, 1 fail. The `aria-hidden` failure is the highest-priority gap — NVDA and JAWS users can tab into background content while any modal is open.

---

### US-X3: Forms, Errors, and Review Controls

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Inputs with validation errors expose those errors accessibly | ✅ Pass | `#settings-status-msg aria-live="polite"` (index.html:589); `#model-auth-key-status role="alert"` (index.html:493); `#onboarding-modal-status aria-live="polite"` (index.html:386). Error messages are surfaced into these live regions rather than only placed near inputs. |
| Icon-only review controls have descriptive labels | ✅ Pass | All dynamically generated `.icon-btn` elements in the experience, skills, and achievements review tables include `aria-label` with the item's title and `aria-pressed` state (bundle.js:12553–12559, 13363–13368, 13882–13886). Examples: `aria-label="Emphasize [title]"`, `aria-label="Move [title] earlier in CV"`. |
| Inline edit/review actions have visible focus states | ✅ Pass | `.icon-btn:focus-visible { outline: 2px solid var(--cv-accent); outline-offset: 2px; }` (styles.css:1357). Also defined for `.action-btn`, `.tab`, `.step`, `.q-chip`, `.sm-th`, `.sm-btn`, `.rw-btn`, `message-input`, `form-input`, `q-input`. No global `outline: 0` or `outline: none` reset found. |
| Error/status messages accessible to assistive tech | ✅ Pass | In addition to the modal-scoped live regions above: `#toast-container aria-live="polite" aria-atomic="true"` (index.html:288); `#llm-busy-label aria-live="polite" role="status"` (index.html:163); `#session-conflict-banner role="alert"` (index.html:115); `.model-wizard-progress role="status" aria-live="polite"` (index.html:436). Coverage is thorough. |
| `window.confirm()` fallback replaced by accessible dialog | ⚠️ Partial | One legacy `window.confirm()` call remains in app.js:138 (the "not individually reviewed" gate before generating rewrites). `confirmDialog()` is the accessible replacement and is used elsewhere; this instance should be migrated. |
| Non-confidential LLM warning accessible to keyboard users | ⚠️ Partial | `#llm-non-confidential-badge` is a non-focusable `<span>` whose warning description is only in a `title` attribute (index.html:59). Keyboard-only users cannot trigger the tooltip. |

**US-X3 Net:** 3 pass, 2 partial.

---

## Additional Positive Findings (Not in Story Criteria)

- **Reduced-motion:** `@media (prefers-reduced-motion: reduce)` at styles.css:1842 sets `animation-duration: 0.01ms` globally — all spinning loaders, pulse animations, and transitions honour the user's OS preference.
- **High-contrast mode:** `@media (prefers-contrast: more)` at styles.css:1852 forces 2px black borders on all interactive elements and overrides link colour to `darkblue`.
- **Decorative emojis hidden:** `aria-hidden="true"` applied consistently to emoji spans in workflow steps and tabs (index.html:124–146, 208–233).
- **Chat panel toggle:** `aria-expanded` and `aria-label` stay in sync with collapsed state via `toggleChat()` (ui-core.js:644–646).
- **ATS badge label:** JS updates `aria-label` to include the current score value on each refresh (bundle.js:3217).
- **Bullet reorder dialog:** Has `role="dialog"`, `aria-labelledby`, close button `aria-label="Close reorder dialog"`, and per-row move buttons with `aria-label="Move bullet up/down"` (bundle.js:4879, 4898, 4936, 4940).

---

## Generated Materials Evaluation

The application generates DOCX and PDF files; their internal accessibility (document tags, reading order, alt text for any embedded elements) is outside the scope of the web UI source files reviewed. That review would require inspection of the generated files directly.

---

## Additional Story Gaps / Proposed Story Items

| Proposed Gap | Priority | Notes |
| ------------ | -------- | ----- |
| GAP-NEW-A-01: `aria-hidden` not toggled on primary modals | High | All modals opened via `style.display` bypass `openModal()` which is the only code path that sets `aria-hidden`. Background landmark content is reachable by AT while a dialog is open. Fix: call `openModal()`/`closeModal()` helpers, or add `aria-hidden` toggling directly in each open/close pair. |
| GAP-NEW-A-02: Sessions modal focus-restore bug | Medium | `openSessionsModal2` saves focus to `window._focusedElementBeforeModal` but `closeSessionsModal` calls `restoreFocus()` which pops from `_focusStack`. Focus is not restored to the trigger button. Fix: push to `_focusStack` in `openSessionsModal2`. |
| GAP-NEW-A-03: Workflow step completed/stale state text alternative | Medium | `.step.completed`, `.step.stale`, `.step.stale-critical` rely on colour alone. Add sr-only text or use `aria-description` to communicate the status. |
| GAP-NEW-A-04: Migrate remaining `window.confirm()` to `confirmDialog()` | Low | One call remains at app.js:138. |
| GAP-NEW-A-05: `#llm-non-confidential-badge` keyboard inaccessibility | Low | Tooltip in `title` attribute is hover-only. Convert to a focusable button or add visible caption text. |

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-X1: Workflow Navigation Accessibility | 4 | 1 | 0 | 0 | 0 |
| US-X2: Modal and Dialog Accessibility | 4 | 1 | 1 | 0 | 0 |
| US-X3: Forms, Errors, and Review Controls | 3 | 2 | 0 | 0 | 0 |
| Generated Materials | — | — | — | — | N/A |

**Key evidence references:**

- `aria-hidden` gap: ui-core.js:660–694 (`openModal` manages it) vs ui-core.js:249–257 (`openSettingsModal` bypasses it)
- Sessions focus-restore bug: bundle.js:21790 (`window._focusedElementBeforeModal`) vs ui-core.js:340 (`_focusStack.pop()`)
- Workflow step colour-only state: styles.css:268–272 (`.step.completed`, `.step.stale`, `.step.stale-critical`)
- Review table icon labels: bundle.js:12553–12559 (experience), 13363–13368 (skills), 13882–13886 (achievements)
- Reduced-motion: styles.css:1842–1850
- High-contrast mode: styles.css:1852–1859
- Tab semantics: index.html:207–239 + bundle.js:3595–3615
- Focus trap / restore infrastructure: ui-core.js:270–346
