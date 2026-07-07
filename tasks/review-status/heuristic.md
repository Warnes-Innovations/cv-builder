<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Heuristic Review Status

**Last Updated:** 2026-07-06 12:30 ET

**Executive Summary:** CV Builder is a technically capable, domain-rich application with a well-structured workflow. The most impactful usability issues cluster around three themes: a cluttered chrome layer (header + position bar + workflow nav + tab bar consume roughly 210 px before any content appears), a duplicated loading-state system that creates contradictory signals, and a mixed-pattern codebase where inline styles, inconsistent modal-open mechanisms, and a still-native `window.confirm()` gate undermine the otherwise strong design-token system. Addressing these three themes would substantially reduce friction for first-time and returning users.

---

## Nielsen's 10 Heuristics

### H1 — Visibility of System Status

**Rating:** 🟡 Minor

The app invests heavily in status communication: the LLM status pill cycles through eight named states (`connected`, `connecting`, `unconfigured`, `auth-required`, `rate-limited`, `unavailable`, `error`, `configured`) with distinct colors and icons (ui-core.js:771–803). The layout freshness chip signals `fresh / stale / critical` states with color and a one-shot pulse animation (styles.css:234–241). The ATS score badge updates in real-time in the position bar (index.html:91–99). Workflow steps render `active / completed / stale / stale-critical / forward-skip` classes (styles.css:266–273).

**Issues:**

1. **Dual loading overlay** — `#llm-busy-overlay` (index.html:160–167) and `#llm-status-bar` (index.html:175–177) are two independent loading systems both wired to LLM requests. The overlay covers the entire chat panel; the status bar sits just below the conversation header. They can render simultaneously, and each has its own elapsed timer and Stop button. Users receive redundant or conflicting signals about the same operation.

2. **Ambiguous initial LLM state** — The pill initially reads "Not ready" (index.html:57) with a warning icon. The label is undefined without context: not-ready to do what? The tooltip text (visible only on hover) is "No provider/model is configured yet" — that guidance is invisible at a glance (ui-core.js:783).

3. **No auto-save indicator** — `setInterval(saveTabData, 5000)` at app.js:77 auto-saves every 5 seconds with no toast or visual signal. Users cannot confirm that changes were persisted.

---

### H2 — Match Between System and the Real World

**Rating:** 🟡 Minor

The 12-step workflow top-bar (Job → Analysis → Customise → Rewrites → Spell Check → Layout Review → File Review → Cover Letter → Screening → Interview Prep → Thank You → Harvest) aligns naturally with the real-world job-application process. Action button labels use plain verbs ("Analyse Job", "Review Rewrites", "Confirm Layout").

**Issues:**

1. **"Harvest" metaphor** — index.html:146 labels the final step "🌾 Harvest". The action (saving refined bullets and skills back to the master profile) is logical once explained, but the label is not self-evident on first encounter. The tooltip helps but is not proactively shown.

2. **Technical filenames in user-facing text** — The onboarding modal at index.html:337 says "Populate `Master_CV_Data.json` once…" The schema filename is referenced throughout onboarding (index.html:374–383) as if it were a first-class UI concept. A friendly name like "your master profile" is used in some places (index.html:337, 361) but the file path intrudes when the file is missing.

3. **Internal flag names shown to users in the model selector** — The provider selector in the LLM wizard renders `(list_models)` or `(fallback)` captions directly inside the label chip (ui-core.js:1217). These are internal capability flag names, not user language.

4. **"Non-confidential" badge uses double-negative jargon** — index.html:59 shows `⚠ Non-confidential`. The double-negative framing and term are harder to parse than "⚠ Data may leave your device" or similar plain language.

---

### H3 — User Control and Freedom

**Rating:** 🟡 Minor

Sessions can be created, renamed, switched, deleted, and restored from trash (Sessions modal). The LLM "■ Stop" abort button is present in both the busy overlay and the status bar. The chat panel can be collapsed. Bulk-action undo for review tables was added in a recent cycle.

**Issues:**

1. **`window.confirm()` at the critical workflow gate** — app.js:138 uses the native browser `confirm()` dialog to gate "proceed with unreviewed items" before rewrite review. The custom `confirmDialog()` in ui-core.js:375 was specifically built to replace native dialogs (the code comment at ui-core.js:368–373 explains this). If the user has clicked "Prevent this page from creating additional dialogs," the native confirm returns `true` without display, silently bypassing the gate and proceeding without user intent.

2. **No explicit backward navigation affordance** — Once a phase is passed, workflow steps are locked until the user has progressed through them. A user who wants to revise their job description after completing analysis can click the "Job Input" step — this works — but no visual cue communicates that backward navigation is available.

3. **No per-item undo for LLM-accepted content** — After accepting a rewrite or spell-check decision, there is no per-item undo. Bulk undo covers bulk-table operations but not individual LLM response acceptance.

---

### H4 — Consistency and Standards

**Rating:** 🟠 Major

The CSS design-token system is a genuine strength: 90 named custom properties in `:root` (styles.css:18–127) provide a coherent visual language. Modal accessibility patterns (focus trapping, `aria-modal`, `role="dialog"`) are implemented consistently across major dialogs.

**Issues:**

1. **Inline styles on position-bar action buttons** — The "📚 Master CV", "ATS Report", and "Job Analysis" buttons (index.html:104–110) use long verbatim `style="..."` attributes with hex color literals that duplicate values already in the design-token system. These deviate from the `.action-btn`, `.header-pill-btn`, and `.sm-btn` class patterns used everywhere else.

2. **Duplicate tab icons** — The "Experiences" tab (id=`tab-exp-review`) and "ATS Score" tab (id=`tab-ats-score`) both use 📊 (index.html:212, 219). The "Experience Bullets" tab (id=`tab-ach-editor`) and "Rewrites" tab (id=`tab-rewrite`) both use ✏️ (index.html:213, 220). Icon meaning degrades when the same glyph labels different destinations.

3. **Mixed modal-open mechanisms** — `openSettingsModal()` opens its overlay with `overlay.style.display = 'flex'` (ui-core.js:252); `openModal()` uses `.classList.add('visible')` (ui-core.js:666). These two patterns coexist across the same codebase with no stated reason for the split, creating maintenance inconsistency.

4. **Inline `onclick` vs. event listener split** — Header buttons (index.html:45–69) use inline `onclick="..."` handlers. The rest of the application wires events via `addEventListener` in `setupEventListeners()`. The inconsistency makes behavior harder to trace and test.

5. **Overloaded "Step N of M" numbering** — The model wizard footer reads "Step N of 4" (ui-core.js:1326), while layout-flow action-button `title` attributes read "Step 1 of 3", "Step 2 of 3", "Step 3 of 3" (index.html:194–196). Both sequences are potentially visible during the same user session, causing conceptual confusion.

6. **Inconsistent close-button affordances** — Some modal close buttons use `&times;` (index.html:257, 703, 719); others use a raw ✕ character (index.html:117). One set is styled with `.modal-close-btn` (index.html:279); others use inline background:none styles.

---

### H5 — Error Prevention

**Rating:** 🟡 Minor

The 4-step LLM wizard validates the connection before allowing the user to finalize their choice (ui-core.js:1742–1802). The "unreviewed items" soft gate at app.js:128–148 prevents blind submission. The ownership conflict dialog prevents two tabs from writing the same session simultaneously.

**Issues:**

1. **`window.confirm()` gate can be silently bypassed** — As noted in H3, app.js:138 uses native `confirm()`. If the browser has suppressed dialogs, the gate falls through with `ok = true` and the user proceeds without awareness.

2. **Retry policy form has no cross-field validation** — The Settings modal allows independent `Base Delay (ms)` and `Maximum Delay (ms)` inputs (index.html:664–669). No validation prevents setting a base delay larger than the cap. `_collectRetryPolicyFromForm()` at ui-core.js:146 applies only per-field minimums, not cross-field logic.

3. **No warning before closing with an LLM request in flight** — `beforeunload` at app.js:80 saves state but does not detect whether an active `_currentAbortController` request is running. A user closing the tab during generation loses the response with no warning.

---

### H6 — Recognition Rather than Recall

**Rating:** 🟡 Minor

The input placeholder "Type a message (e.g., 'analyse job')" (index.html:185) prompts recall. Context-sensitive action buttons surface the next action at each phase. Tooltips on workflow steps explain their purpose.

**Issues:**

1. **Full chat command set is invisible** — The application supports many chat commands, but only the placeholder example and contextual action buttons hint at them. Users who prefer free text must know the command vocabulary without in-app reference.

2. **"Show Full Catalog" is hidden by default** — In model wizard Step 3, the full model catalog table is hidden behind a toggle (ui-core.js:921–924). Users looking for a specific model may not discover this without exploration.

3. **Tabs hidden by stage filter** — Tabs like Cover Letter, Screening, Interview Prep, Thank You, and Harvest are only shown during their respective stages (STAGE_TABS, ui-core.js:353–366). First-time users cannot see the full workflow scope from the tab bar alone.

---

### H7 — Flexibility and Efficiency of Use

**Rating:** 🟡 Minor

Keyboard shortcuts are wired via `initKeyboardShortcuts()` (app.js:163). Tab bar navigation uses WCAG 2.1 AA keyboard patterns: arrow keys, Home, End (ui-core.js:465–491). The layout freshness chip provides a shortcut to the layout review step.

**Issues:**

1. **Keyboard shortcuts are undiscoverable** — There is no visible legend or shortcut reference. The help modal (index.html:323–403) describes the workflow but not key bindings.

2. **No parallel workflow paths** — All LLM operations are synchronous in the chat panel. A user who wants to edit the Master CV profile while reviewing analysis results must navigate to a separate modal context rather than a split view.

3. **Linear workflow gating limits expert navigation** — Pre-layout steps are strictly sequential (ui-core.js:1846–1930), preventing an expert user from skipping directly to rewrite review without completing earlier phases.

---

### H8 — Aesthetic and Minimalist Design

**Rating:** 🟠 Major

The design-token system (90 CSS variables, styles.css:18–127) maintains visual coherence. Cards, badges, and interactive states follow a consistent visual language.

**Issues:**

1. **Chrome height is disproportionate** — `main-container` subtracts 210 px from viewport height (`calc(100vh - 210px)`, styles.css:450). On a 768 px screen this leaves 558 px for the split chat+viewer area; on a 600 px screen only 390 px. Four stacked chrome layers create a heavy overhead ratio before any content is visible.

2. **Position bar carries too many elements** — A single row contains: job title (24 px font), rename pencil button, company subtitle, ATS score badge, ATS summary line, layout freshness chip, a visual divider, and three action buttons (Master CV, ATS Report, Job Analysis) — at least 9–10 distinct elements (index.html:88–111).

3. **Workflow nav has 12 steps and 11 arrows** — index.html:122–148 renders 23 items in a single scrollable flex row. This is dense even on large screens, and the thin scrollbar (styles.css:264) means steps may require scrolling before they are discovered.

4. **Dual loading overlay creates visual noise** — `#llm-busy-overlay` uses `backdrop-filter: blur(2px)` covering the entire chat panel (styles.css:643–649), while `#llm-status-bar` sits below the conversation header with a separate spinner. Both activate during LLM calls.

---

### H9 — Help Users Recognise, Diagnose, and Recover from Errors

**Rating:** 🟡 Minor

Semantic color states (red = error, amber = warning, green = success) are applied consistently. The model test failure path shows the error message inline (ui-core.js:1772–1784). The session conflict banner includes a retry button (index.html:117).

**Issues:**

1. **"Unknown tab." error gives no recovery path** — If `loadTabContent()` reaches the default case (ui-core.js:619), it renders `<p>Unknown tab.</p>` with no suggestion of what the user should do or how this state arose.

2. **Ownership conflict "Take Over" button consequences are undisclosed** — The three options "Load Different", "New Session", "Take Over" (index.html:413–417) do not describe what happens to the current session's unsaved data or the other browser tab. "Take Over" is styled as the primary button (blue), pushing users toward the most consequential action without explanation.

3. **Connection test failure highlights no specific correctable field** — When `testCurrentModel()` fails (ui-core.js:1781), the wizard reverts to Step 2 but no input is focused or highlighted to guide recovery. The error appears in the footer status area, which may not be in the user's visual focus after the step transition.

---

### H10 — Help and Documentation

**Rating:** 🟡 Minor

The welcome/onboarding modal (index.html:321–403) explains the 3-phase workflow with numbered steps and a prerequisite checklist. A "? Help" button (index.html:63–66) allows the modal to be reopened. Tooltips appear on all interactive elements with technical content.

**Issues:**

1. **No contextual help at each workflow step** — Help is front-loaded in the onboarding modal. Once dismissed, there is no step-level guidance explaining what "Analysis" produces, what decisions are made during "Customise", or what "Spell Check" examines.

2. **Technical settings lack guidance on appropriate values** — The Settings modal (index.html:581–696) exposes Temperature, Request Timeout, Base Delay, Maximum Delay, and Retry Attempts. No in-form explanation describes what values are appropriate or the effect of changing them.

3. **Onboarding prerequisites may overwhelm new users** — The welcome modal combines workflow explanation with prerequisites (Master_CV_Data.json path, LLM provider setup) in a single view, presenting both "here's how the app works" and "here's what you need before starting" simultaneously.

---

## Additional UX Dimensions

### Cognitive Load

The four-layer chrome stack (header → position bar → workflow nav → tab bar) requires users to process system state across multiple independent status systems simultaneously: the LLM pill (connection), workflow steps (phase progress), ATS badge (content quality), freshness chip (generation currency), and tab bar (content focus). This is 5 distinct status dimensions before any content is rendered.

The STAGE_TABS mapping (ui-core.js:353–366) shows up to 10 tabs for the "customizations" stage (`goals`, `questions`, `exp-review`, `ach-editor`, `skills-review`, `achievements-review`, `tagline-review`, `summary-review`, `publications-review`, `ats-score`). Ten visible tabs simultaneously imposes a substantial selection burden at the phase where users make the most consequential decisions about CV content.

### Visual Hierarchy

The 24 px `position-title` font (styles.css:200) correctly establishes the job title as the primary heading. However, the ATS score badge at 18 px with a high-contrast colored number (styles.css:211) visually competes with the title, and the freshness chip adds a third high-contrast element in the same row. The position bar lacks a clear primary → secondary → tertiary reading order.

### Information Architecture

The same content is represented in two parallel navigation systems: workflow steps (top nav, index.html:122–148) and the tab bar (second nav, index.html:207–234). Steps represent phases; tabs represent content views within a phase — but the visual treatment (both horizontal bars of labeled items) makes this distinction non-obvious without prior knowledge.

The Master CV is accessible via three independent paths: the "📚 Master CV" button in the position bar (index.html:104), the "📚 Master CV" tab in the tab bar (index.html:228), and `openMasterCvModal()`. Three access points for the same resource are redundant and make users uncertain which path is authoritative.

### Workflow Momentum

The explicit phase-action button system is effective: a single prominent button advances each stage. However, the "unreviewed items" gate at app.js:128–148 interrupts momentum with a native dialog that quantifies unreviewed items but does not navigate to them. A user who wants to review rather than skip must close the dialog and manually locate the items — the gate informs without enabling recovery.

### Feedback Loops

The conversation panel serves as the primary feedback channel for LLM operations, which is appropriate. The 5-second auto-save loop (app.js:77) provides persistence without feedback, leaving users uncertain whether their state is safe. The freshness chip pulses once on state change (styles.css:235 `animation: stale-chip-pulse 1.2s ease-out 1`) — a well-designed momentary attention cue.

### Error Recovery

The custom `confirmDialog()` function (ui-core.js:375–447) is well-engineered: it captures focus, traps Tab/Shift+Tab, restores focus on close, and cancels on Escape. However, it is not yet used at the most critical gating point (app.js:138 still uses native confirm).

Session recovery on ownership conflict is explicitly modeled (index.html:405–419) with three options, but consequence labeling is absent (see H9, issue 2 above).

### Affordance Clarity

Workflow step badges in the top nav are visually styled as status pills (rounded, colored) but are also interactive buttons when `clickable`. Non-clickable steps (class `upcoming`, styles.css:270) have no disabled visual indicator — `cursor: default` is applied via class removal but no grayed-out appearance distinguishes them from informational labels. The `.step.clickable:hover` rule at styles.css:258 only activates on hover, so users who do not hover never learn a step is clickable.

The tab-scroll arrows (`tab-scroll-left`, `tab-scroll-right`, index.html:206, 235) are hidden by default and appear only when the tab bar overflows. Users with narrow viewports who see a scrolled-right tab bar may not know additional tabs exist.

### Terminology Clarity

| Term | Clarity | Notes |
| --- | --- | --- |
| ATS | Requires domain knowledge | Tooltip explains; not proactively surfaced |
| Harvest | Metaphor | Tooltip at index.html:146 helps |
| Customise / customizations | Inconsistent form | Workflow nav uses "Customise"; API/state uses "customizations" |
| Screening | Ambiguous | Could mean screening the applicant or answering screening questions |
| Non-confidential | Double-negative jargon | index.html:59 |
| list\_models / fallback | Internal flag names shown to users | ui-core.js:1217 |
| Layout Review | Clear | Appears consistently in step, tab, and action button |

---

## Top 5 UX Issues

1. **Dual loading indicator systems create contradictory status signals** — `#llm-busy-overlay` (index.html:160–167) and `#llm-status-bar` (index.html:175–177) are two independent systems both active during LLM calls. The overlay covers the entire chat panel with a blurred frosted card showing a spinner, elapsed time, step label, and Stop button; the status bar appears below the conversation header with its own spinner, step label, and Stop button. These can appear simultaneously and display independently updated state. Users receive redundant or potentially different elapsed times and two clickable Stop buttons. **Impact:** users may click Stop twice, become confused about which indicator is authoritative, or miss state transitions when one system updates before the other.

2. **Native `window.confirm()` used at the highest-stakes workflow gate** — app.js:138 invokes `window.confirm()` before allowing the user to proceed past the customization review. The custom `confirmDialog()` in ui-core.js:375 exists precisely to replace native dialogs (the code comment at ui-core.js:368–373 explains why). If a user has previously clicked "Prevent this page from creating additional dialogs," the native confirm returns `true` without display, silently bypassing the gate and proceeding with potentially unreviewed content. **Impact:** silent data-quality degradation at the most consequential decision point in the CV generation workflow.

3. **Four-layer chrome consumes a disproportionate viewport share** — Header + position bar + workflow nav + tab bar = approximately 210 px fixed before any content (styles.css:450 `calc(100vh - 210px)`). On a 768 px display this leaves 558 px for the split chat+viewer area. The position bar alone contains 9–10 distinct elements (index.html:88–111). The workflow nav renders 23 items (12 steps, 11 arrows, index.html:122–148). **Impact:** on sub-900 px screens content is severely compressed; users spend more effort scrolling within panels and may miss status signals rendered outside their scroll viewport.

4. **Inline styles on position-bar buttons break design consistency and maintainability** — The three action buttons in the position bar (index.html:104–110) use verbatim inline `style` attributes with hex color literals that duplicate values in the CSS token system but are disconnected from it. When token values change, these buttons are not updated. They also fail to pick up theme or accessibility overrides that the class-based system would apply. **Impact:** visual inconsistency (the buttons appear lighter and less interactive than comparable `.action-btn` elements) and a maintenance liability as the design system evolves.

5. **Ownership conflict dialog lacks consequence disclosure for "Take Over"** — The dialog at index.html:405–419 offers "Load Different", "New Session", and "Take Over" with no explanation of what happens to the session currently open in another tab. "Take Over" is the most dangerous option (it claims exclusive write access), but it is styled as the primary (blue) button — index.html:416. A user who clicks it may not understand that the other tab loses its write capability and unsaved changes may be discarded. **Impact:** potential data loss for users managing multiple sessions across tabs; the primary visual weight pushes users toward the most consequential choice without informed consent.

---

**Key evidence references:**

| Finding | File | Line(s) |
| --- | --- | --- |
| Dual loading systems | index.html | 159–177 |
| Dual loading styles | styles.css | 640–692 |
| Native window.confirm() gate | app.js | 128–148 |
| Custom confirmDialog (unused here) | ui-core.js | 375–447 |
| Chrome height calc | styles.css | 450 |
| Position bar dense elements | index.html | 88–111 |
| Workflow nav 12 steps + 11 arrows | index.html | 122–148 |
| Inline styles on position buttons | index.html | 104–110 |
| Ownership conflict dialog | index.html | 405–419 |
| Duplicate tab icons | index.html | 212–213, 219–220 |
| Mixed modal-open mechanisms | ui-core.js | 252, 660–675 |
| LLM status pill states | ui-core.js | 771–803 |
| STAGE\_TABS (10 tabs, customizations) | ui-core.js | 353–366 |
| Tab scroll arrow visibility logic | ui-core.js | 543–550 |
| Error recovery: Unknown tab | ui-core.js | 619 |
| Test failure resets wizard step | ui-core.js | 1781 |
| Phase transition model | conversation\_manager.py | 64–75 |
| LLM status pill initial state | index.html | 55–58 |
| Auto-save interval | app.js | 77 |
| Settings retry form | index.html | 661–685 |
