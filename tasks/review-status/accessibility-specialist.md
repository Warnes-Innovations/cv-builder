<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-07-06 (cycle 92 source-first refresh)

**Executive Summary:** The cv-builder application has strong accessibility fundamentals. Modal focus management is correct and consistent — `aria-hidden` is toggled on all major dialog open/close paths, `pushFocusStack()`/`restoreFocus()` is uniformly applied, and `trapFocus()` is called in every modal open path. Main-tab semantics are fully compliant with WCAG 2.1 AA tablist patterns including Arrow-key navigation. Icon-only review action buttons carry `aria-label` with item-specific text and `aria-pressed` state. Comprehensive `:focus-visible` styles cover all interactive surfaces; reduced-motion and high-contrast media queries are implemented. The three actionable gaps are: (1) no skip navigation link (WCAG 2.4.1, Level A); (2) review sub-tabs lack Arrow-key navigation and roving tabindex; and (3) the generated CV template skips heading levels.

---

## Application Evaluation

### US-X1: Workflow Navigation Accessibility

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Workflow steps reachable and operable by keyboard when unlocked | ✅ Pass | `updateWorkflowStepsClickable()` (ui-core.js:1894–1953) dynamically adds `role="button"`, `tabindex="0"`, and Enter/Space keydown handlers to each unlocked step; inert steps get `tabindex="-1"` and have `role` removed. Only `step-job` is pre-wired in HTML; all others are activated at runtime. |
| Stage tabs expose correct tablist semantics | ✅ Pass | `#tab-bar role="tablist" aria-label="Application workflow tabs"` (index.html:207); each tab carries `role="tab"`, `aria-selected`, `aria-controls="document-content"`, and roving `tabindex` (0 for active, -1 for others). `#document-content role="tabpanel"` with `aria-labelledby` updated on every tab switch. |
| Arrow/Home/End keyboard navigation on main tab bar | ✅ Pass | Full WCAG 2.1 AA tablist pattern: ArrowLeft/ArrowRight/Home/End navigate and activate tabs; Enter/Space activate the focused tab. Implemented in `setupEventListeners()` (ui-core.js:471–497). |
| Active workflow position perceivable without colour | ✅ Pass | `aria-current="step"` is applied to the active step element (ui-core.js:1952) and removed from all others (ui-core.js:1943–1946). |
| Completed / stale step states perceivable without colour | ⚠️ Partial | `.step.completed`, `.step.stale`, `.step.stale-critical`, and `.step.forward-skip` (styles.css:268–273) are colour-class-only changes — background and text colour convey state visually but there is no sr-only label, `aria-description`, or programmatic marker. A screen reader cannot distinguish a completed step from an upcoming or stale one. |
| Tab changes announced to assistive technology | ✅ Pass | `#workflow-stage-announcer aria-live="polite" aria-atomic="true"` (index.html:150–151) is cleared then populated with the active tab's text content on every tab switch (review-table-base.js:159–162). |
| No skip navigation link | ❌ Fail | No "Skip to main content" link (or equivalent bypass mechanism) appears anywhere in index.html. With a fixed header, position/ATS bar, and 13-step workflow nav preceding the main content, keyboard users must Tab through all repeated navigation on every page load. **WCAG 2.4.1 (Bypass Blocks, Level A).** |
| Review sub-tabs expose correct tablist semantics | ⚠️ Partial | `role="tablist"` is set lazily on the sub-tab container only on the first call to `switchReviewSubtab()` (review-table-base.js:675); `role="tab"`, `aria-selected`, `aria-controls` are set dynamically on each button. However, no Arrow-key navigation is implemented for the sub-tab list (unlike the main tabs), and roving tabindex is not managed — all sub-tabs remain native Tab targets. WCAG tablist pattern requires Arrow-key navigation inside the tablist. |

**US-X1 Net:** 5 pass, 2 partial, 1 fail.

---

### US-X2: Modal and Dialog Accessibility

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Opening a modal moves focus into it | ✅ Pass | `setInitialFocus()` called on open for: settings (ui-core.js:255), ownership conflict (session-switcher-ui.js:189), sessions modal (session-switcher-ui.js:580). ATS report and job analysis modals explicitly focus the Close button in the modal footer on open (ats-modals.js:165, 282). `confirmDialog()` explicitly focuses the OK button (ui-core.js:417). |
| Focus is trapped inside the modal while open | ✅ Pass | `trapFocus()` (ui-core.js:308–338) wraps Tab/Shift+Tab within the focusable element list. Called for settings, model wizard, sessions, ownership-conflict, ATS report, and job analysis modals. `confirmDialog()` implements its own inline Tab trap (ui-core.js:420–429). |
| Closing a modal restores focus to the trigger | ✅ Pass | `pushFocusStack()` is called before opening in all modal paths — sessions (session-switcher-ui.js:576), ownership conflict (session-switcher-ui.js:188), ATS report (ats-modals.js:158), job analysis (ats-modals.js:277), settings (ui-core.js:254). `restoreFocus()` pops from `_focusStack` and removes the matching trap listener (ui-core.js:344–350). `confirmDialog()` uses a separate `previousFocus` local variable for symmetry (ui-core.js:381, 439). |
| `aria-hidden` toggled to hide background from AT while modal is open | ✅ Pass | All primary modal open/close pairs toggle `aria-hidden` on the overlay: sessions (session-switcher-ui.js:574, 588), ownership conflict (session-switcher-ui.js:186, 200), ATS report (ats-modals.js:161, 200), job analysis (ats-modals.js:279, 303), settings (ui-core.js:252, 265), alert/confirm (index.html: static attribute toggled via `openModal()`). `aria-modal="true"` is also present on all modals so modern AT respects the modal boundary. |
| Dialog titles and purpose programmatically exposed | ✅ Pass | All modals carry `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to a visible `<h2>` heading (index.html:253, 275, 291, 306, 323, 405, 422, 582, 699, 715). Alert and confirm modals additionally carry `aria-describedby` for the message body (index.html:291, 306). |
| Escape key closes modals | ✅ Pass | Document-level Escape handler in `setupEventListeners()` calls `closeAllModals()` (ui-core.js:513–515). ATS report and job analysis also attach dedicated Escape handlers on open and remove them on close. |
| Wizard progress step transitions announced | ⚠️ Partial | The model wizard progress bar container has `role="status" aria-live="polite"` (index.html:436) but its inner content is static badge numbers that do not change as text. The `#model-wizard-step-label` span in the footer updates (e.g., "Step 2 of 4: API Key / Auth") but carries no `aria-live` attribute. Screen readers may not reliably announce wizard step transitions. |

**US-X2 Net:** 5 pass, 1 partial. All focus-management failures noted in the previous review cycle have been resolved.

---

### US-X3: Forms, Errors, and Review Controls

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Inputs with validation errors expose those errors accessibly | ✅ Pass | `#settings-status-msg aria-live="polite"` (index.html:589); `#model-auth-key-status role="alert"` (index.html:493); `#onboarding-modal-status aria-live="polite"` (index.html:386). Error and success messages are pushed into live regions, not only placed visually near inputs. |
| Icon-only review controls have descriptive labels | ✅ Pass | All dynamically generated `.icon-btn` elements in experience, skills, and achievements review tables include `aria-label` containing the item's title and a contextual action verb (e.g., `aria-label="Emphasize [role title]"`, `aria-label="Move [skill name] earlier"`), plus `aria-pressed` toggling. Font Awesome icons inside session-table action buttons carry `aria-hidden="true"` (session-switcher-ui.js:351–354). |
| Review action controls have visible focus states | ✅ Pass | `.icon-btn:focus-visible`, `.action-btn:focus-visible`, `.rw-btn:focus-visible` all have `outline: 2px solid var(--cv-accent); outline-offset: 2px;` (styles.css:1357, 717, 1441). No global `outline: 0` or `outline: none` reset was found. |
| Error and status messages exposed to assistive tech | ✅ Pass | `#toast-container aria-live="polite" aria-atomic="true"` (index.html:288); `#llm-busy-label aria-live="polite" role="status"` (index.html:163); `#session-conflict-banner role="alert"` (index.html:115); `#settings-status-msg aria-live="polite"` (index.html:589). Coverage is thorough across all major feedback surfaces. |
| Header pill buttons have visible focus indicator | ❌ Fail | `.header-pill-btn` has no `:focus-visible` rule in styles.css (confirmed by exhaustive search of all `:focus-visible` selectors). These buttons sit on a dark `#1e293b` header background. Browser-default focus rings are browser-dependent and may fail WCAG 1.4.11 Non-text Contrast (3:1 minimum). Every other interactive surface has an explicit `:focus-visible` rule — this is an isolated omission. **WCAG 1.4.11 (Non-text Contrast, Level AA).** |
| `window.confirm()` fully replaced by `confirmDialog()` | ⚠️ Partial | Two `window.confirm()` calls remain: `web/master-cv.js:2517` (backup restore) and `web/harvest.js:515` (bulk promote to master CV). These bypass the accessible `confirmDialog()` used elsewhere in the codebase. |
| Non-confidential LLM warning accessible to keyboard users | ⚠️ Partial | `#llm-non-confidential-badge` (index.html:59) is a non-focusable `<span>` whose warning description exists only in a `title` attribute. `title` tooltips are hover-only in most browsers; keyboard-only users and screen readers cannot reliably access this information. The badge does have the warning emoji (⚠) and the text "Non-confidential" as visible label text, but the expanded description (data may be reviewed by provider) is inaccessible without hover. |

**US-X3 Net:** 3 pass, 2 partial, 1 fail.

---

## Additional Positive Findings

- **Reduced-motion:** `@media (prefers-reduced-motion: reduce)` (styles.css:1842) sets `animation-duration: 0.01ms` and `animation-iteration-count: 1` globally — all spinners, pulsing chips, and transitions honour the user OS preference.
- **High-contrast mode:** `@media (prefers-contrast: more)` (styles.css:1852) forces 2px solid black borders on all interactive elements, enhances active/focus outlines, forces links to `darkblue`, and adds black borders to form controls.
- **Decorative emoji universally hidden:** All emoji in workflow steps (index.html:124–146), main tabs (index.html:208–233), and action buttons are wrapped in `<span aria-hidden="true">`.
- **Chat panel toggle:** `aria-expanded` and `aria-label` are kept in sync with the collapsed/expanded state in `toggleChat()` (ui-core.js:649–651).
- **ATS score badge:** JS updates the element's `aria-label` to include the numeric score on each refresh (dynamic — confirmed live-region coverage via `#ats-score-badge` update path).
- **Skill-badge missing-from-CV indicator:** `<span class="sr-only"> (not in master CV)</span>` added alongside visual styling for missing skills (review-table-base.js:446).
- **`.sr-only` utility class:** Properly defined in styles.css:138–148 using the standard clip-path pattern.

---

## Generated Materials Evaluation

### CV Template (`templates/cv-template.html`)

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Document language declared | ✅ Pass | `<html lang="en">` (cv-template.html:10). |
| Semantic document structure | ✅ Pass | `<main>`, `<header>`, `<section>` used throughout. Ordered `<ol>` for publications list. |
| Top-level heading hierarchy | ✅ Pass | `<h1 class="name">` (applicant name), `<h2 class="section-title">` for each major section (Summary, Achievements, Experience, Publications). |
| Skill section heading hierarchy | ❌ Fail | `<h2 class="section-title">` for the Technical Skills section, then `<h4>{{ cat.category }}</h4>` for skill group names (cv-template.html:623, 627). Level h3 is skipped entirely. **WCAG 1.3.1 (Info and Relationships, Level A).** |
| Experience entry job titles use headings | ❌ Fail | Individual job roles use `<div class="job-role">` (cv-template.html:672), not a heading element. The heading hierarchy jumps from `<h2>Experience</h2>` directly to unlabelled div content with no h3 for the job title. **WCAG 1.3.1 (Info and Relationships, Level A).** |
| Font Awesome icons hidden from AT | ✅ Pass | All `<i class="fas …">` elements carry `aria-hidden="true"` (cv-template.html:532, 538, 544, 555, 623, 649, 657, 668, 691). |
| Hidden plaintext ATS section | ✅ Pass | `<section id="plaintext" style="display:none;visibility:hidden;" aria-hidden="true">` (cv-template.html:730) — correct triple-layering of visual hide, AT hide, and CSS hide. |
| First-author star indicator accessible | ⚠️ Partial | `<span class="pub-first-author" title="First author">★</span>` (cv-template.html:710). The `title` attribute is hover-only and announced inconsistently by screen readers. The ★ character has no `aria-label`. Screen reader users cannot reliably determine which publications are first-authored. Fix: add `aria-label="First author"` to the span (or replace with `<abbr aria-label="First author">★</abbr>`). |

**Generated Materials Net:** 4 pass, 1 partial, 2 fail.

---

## Open Gap Summary

| Gap ID | Story | WCAG | Severity | Description |
| ------ | ----- | ---- | -------- | ----------- |
| GAP-NEW-A-01 | US-X1 | 2.4.1 (Level A) | **High** | No skip navigation link — keyboard users must Tab through header, position bar, and 13-step workflow nav on every page load. |
| GAP-NEW-A-02 | US-X1 | 4.1.2 (Level AA) | **Medium** | Review sub-tabs: no Arrow-key navigation or roving tabindex; `role="tablist"` set lazily on container. |
| GAP-NEW-A-03 | US-X1 | 1.4.1 (Level A) | **Medium** | Workflow step completed/stale/critical states conveyed by colour only; no sr-only label or aria attribute. |
| GAP-NEW-A-04 | US-X3 | 1.4.11 (Level AA) | **Medium** | `.header-pill-btn` lacks `:focus-visible` style; buttons on dark header may fail non-text contrast for focus indicator. |
| GAP-NEW-A-05 | Generated | 1.3.1 (Level A) | **Medium** | Generated CV template: h2→h4 heading skip in Skills section; Experience job titles use `<div>` not `<h3>`. |
| GAP-NEW-A-06 | US-X2 | 4.1.2 (Level AA) | **Low** | Wizard progress step transitions not live-announced; `#model-wizard-step-label` has no `aria-live` attribute. |
| GAP-NEW-A-07 | US-X3 | — | **Low** | Two `window.confirm()` calls remain in master-cv.js:2517 and harvest.js:515; should use accessible `confirmDialog()`. |
| GAP-NEW-A-08 | US-X3 | — | **Low** | `#llm-non-confidential-badge` extended description only in `title` attribute; keyboard/screen reader inaccessible. |
| GAP-NEW-A-09 | Generated | 1.1.1 (Level A) | **Low** | First-author star `★` in publications has no accessible name; `title` attribute inconsistently announced by AT. |

---

**Reviewed against source files:**
`web/index.html`, `web/ui-core.js`, `web/styles.css`, `web/session-switcher-ui.js`, `web/ats-modals.js`, `web/review-table-base.js`, `web/experience-review.js`, `web/skills-review.js`, `templates/cv-template.html`

**Corrections from previous review cycle:**

- ❌→✅ `aria-hidden` toggling on modals: all modal open/close pairs DO toggle `aria-hidden` correctly in current source (sessions, settings, ATS report, job analysis, ownership conflict). The previous ❌ Fail was based on stale observations.
- ❌→✅ Sessions modal focus-restore: `openSessionsModal()` calls `pushFocusStack(document.activeElement)` before open; `closeSessionsModal()` calls `restoreFocus()`. No bug present in current source.
- ✅ Confirmed: `aria-current="step"` is applied to the active workflow step at ui-core.js:1952 and removed from all others.

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
| US-X1: Workflow Navigation | 5 | 2 | 1 | 0 | 0 |
| US-X2: Modal and Dialog | 5 | 1 | 0 | 0 | 0 |
| US-X3: Forms, Errors, Controls | 3 | 2 | 1 | 0 | 0 |
| Generated Materials | 4 | 1 | 2 | 0 | 0 |
