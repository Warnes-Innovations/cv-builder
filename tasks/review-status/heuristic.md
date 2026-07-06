<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# UX Heuristic Evaluation

**Last Updated:** 2026-07-06 11:30 ET

**Methodology:** Nielsen's 10 Usability Heuristics + additional UX dimensions. Independent source-verified review. Code read directly from web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/rewrite-review.js, web/workflow-steps.js.

---

## Nielsen's 10 Heuristics

### H1: Visibility of System Status

**Rating:** 🟡 Minor

**Finding:** Status visibility is mostly good but has inconsistencies. The LLM busy overlay (index.html:160–168) shows a spinner, elapsed time counter, and a "Stop" button while LLM calls are in flight — strong feedback. The position bar shows ATS score, layout freshness chip, and page-count warnings. An `aria-live` region announces stage changes for screen readers (index.html:149–151).

However, two status indicators are redundant: there are *two* LLM status displays — `#llm-status-bar` (index.html:175–178) and `#llm-busy-overlay` (index.html:159–168) — covering the same "LLM is working" state. The status bar's `display:none` default means only the overlay ever fires, making the `#llm-status-bar` a dead UI region. Additionally, `#llm-token-count` (index.html:171) provides raw token numbers that most users will not understand without additional context (what the limit is, what it means to be near it).

The `#llm-busy-state-badge` with text "Taking longer than usual" is always present in the DOM (index.html:165) but only becomes visible via the `.slow` CSS class — it fires with no explicit user-facing time threshold documented in the code, making its appearance feel unpredictable.

**Evidence:**

- index.html:159–168 (busy overlay), index.html:175–178 (status bar), styles.css:638–687 (LLM busy CSS)
- index.html:171 (token count, no limit label)
- index.html:165 (state badge present always, shown only on .slow class)

---

### H2: Match Between System and the Real World

**Rating:** 🟡 Minor

**Finding:** The vocabulary mostly maps to familiar job-application concepts (CV, Cover Letter, Screening, Interview Prep). However, several terms require domain knowledge users may not have:

- "ATS" (Applicant Tracking System) appears in headers, badges, and buttons without a first-use definition in the main UI — only in the position-bar tooltip text (index.html:92: `title="Applicant Tracking System (ATS) match score…"`). Users who encounter "ATS" as a tab label or button label without hovering will not know what it means.
- "Harvest" (index.html:146) is a creative but opaque metaphor for "save improvements back to master CV." The tooltip is accurate, but the label alone gives no hint.
- "Master CV" (index.html:104) — clear if you read the onboarding modal, but "Master CV" vs the session-specific tailored CV is a conceptual distinction never labeled in-context on the main view.
- The wizard label "Authentication" (index.html:445) for step 2 of LLM configuration conflates API key entry with OAuth device flow — these are different concepts with the same label.
- Phase names in `conversation_manager.py` (e.g., `Phase.REFINEMENT`) surface to users via the session list as raw strings if the display mapping is absent.

**Evidence:**

- index.html:92 (ATS tooltip only, no in-context label)
- index.html:146 (Harvest step)
- index.html:443–445 (wizard step 2 "API Key / Auth")
- conversation_manager.py:39–49 (Phase enum)

---

### H3: User Control and Freedom

**Rating:** 🟡 Minor

**Finding:** Good: the workflow steps bar allows backward navigation after unlocking (ui-core.js:1831–1929). The "Stop" button is prominently placed during LLM calls (index.html:166). Rewrite decisions are persisted to localStorage and restored with a toast (rewrite-review.js:66–74), preventing accidental loss.

However, the `window.confirm()` native dialog is still used in at least one place (app.js:139 for the un-reviewed items gate), which can be blocked by browsers and provides no undo path once confirmed. The custom `confirmDialog()` in ui-core.js:375–447 exists but has not fully replaced all `window.confirm()` calls.

There is no "undo" or "revert to previous decisions" mechanism beyond the localStorage restore for rewrites. Experience/skill decisions submitted via the review tabs are permanent for the session.

The ownership conflict dialog (index.html:405–419) offers three options — "Load Different," "New Session," and "Take Over" — but no explanation of what happens to unsaved work in the current tab if the user clicks "Take Over." The destructive path has no warning.

**Evidence:**

- app.js:139 (`window.confirm()`)
- ui-core.js:375 (custom `confirmDialog` defined but not universally applied)
- index.html:413–416 (ownership conflict dialog, no data-loss warning)
- rewrite-review.js:59–74 (localStorage restore)

---

### H4: Consistency and Standards

**Rating:** 🟡 Minor

**Finding:** Most patterns are consistent: action buttons use `.action-btn` + `.primary`/`.secondary` classes; modals share a common `.modal-overlay` / `.modal` structure with `role="dialog"` and `aria-modal="true"`; close buttons have consistent `&times;` glyphs and `aria-label="Close …"`.

Inconsistencies observed:

- Some action buttons in the position bar use inline `style` attributes (index.html:104–110) rather than reusable CSS classes, creating visual inconsistency with `.action-btn` elements elsewhere.
- Modal close buttons are implemented two ways: some use `class="modal-close-btn"` (index.html:279, 424) while others use an inline-style `&times;` button (index.html:258, 703, 719). The styled and unstyled close buttons look different.
- Tab labels use mixed naming conventions: some are hyphenated slugs (`exp-review`, `ach-editor`, `cover-letter`) while others use underscores (`final_generate`) or neither (`rewrite`, `spell`).
- The workflow nav bar uses UK English ("Analyse," "Customise") while the action button reads "⚙️ Recommend Customizations" (index.html:191, US English plural). The mismatch within one workflow stage is jarring.

**Evidence:**

- index.html:104–110 (inline-styled bar buttons)
- index.html:258 vs index.html:279 (two modal close button patterns)
- index.html:208–233 (mixed tab slug naming)
- index.html:128 vs index.html:191 ("Customise" step vs "Recommend Customizations" button)

---

### H5: Error Prevention

**Rating:** 🟠 Major

**Finding:** Several error-prevention gaps:

1. **Unreview gate uses native confirm():** The gate that warns users before generating rewrites without reviewing all items (app.js:128–142) uses `window.confirm()`. Some browsers silently suppress repeated `confirm()` calls, meaning the gate can disappear entirely.

2. **No confirmation before closing LLM Config Wizard mid-flight:** The model wizard closes immediately on background click or Escape (ui-core.js:507–519), even when an API key save or model test is in progress. The `_showModelWizardBusy` overlay exists but clicking outside still dismisses (index.html:422 `onclick="if(event.target===this)closeModelModal()"`).

3. **Ownership conflict "Take Over" is irreversible without warning:** The "Take Over" button in the ownership conflict dialog (index.html:416) takes ownership from another tab with no warning about unsaved work in that tab.

4. **Auth step not validated before advancing to model selection:** `nextWizardStep()` in ui-core.js:1383–1388 proceeds from auth (Step 2) to model selection (Step 3) without confirming authentication succeeded — the "Test connection" in Step 3 is optional.

**Evidence:**

- app.js:139 (`window.confirm()`)
- index.html:422 (model modal overlay click-to-close during busy state)
- index.html:416 (Take Over — no loss warning)
- ui-core.js:1383–1388 (auth step not validated before advancing)

---

### H6: Recognition Rather Than Recall

**Rating:** 🟡 Minor

**Finding:** The tab bar shows all tabs for the current stage, strongly supporting recognition. Workflow step indicators show `completed` and `active` CSS states. The LLM status pill in the header shows the current provider and model name so users do not need to remember configuration.

However, action buttons at the bottom of the chat panel (index.html:189–199) show/hide depending on workflow stage with no visible inactive placeholder — buttons simply disappear. A returning user may not know what action is available until they spot which button is currently visible.

The settings modal requires provider and model names as free-text strings (index.html:599–603) with no dropdown or autocomplete — relying on recall of keys like "anthropic" or "copilot-sdk."

**Evidence:**

- index.html:189–199 (action buttons show/hide with no inactive placeholder)
- index.html:599–603 (free-text provider/model fields in Settings)
- index.html:377–383 (Master CV path shown in onboarding — appropriate for technical tool)

---

### H7: Flexibility and Efficiency of Use

**Rating:** 🟢 Good

**Finding:** Keyboard shortcuts are initialized in app.js:157 (`initKeyboardShortcuts`); tab keyboard navigation is implemented in ui-core.js:465–490 with Arrow/Home/End keys per WCAG 2.1 tablist pattern; the workflow steps bar allows non-linear navigation once steps are unlocked; a compact rewrite review toggle exists (`toggleRewriteCompactMode` in rewrite-review.js:35). "Accept All" / "Reject All" bulk actions exist for rewrites (rewrite-review.js:34–35). The chat panel collapse state is persisted to localStorage (ui-core.js:649). ATS score is always visible in the position bar without navigating away.

Minor gap: tab scroll arrows are click-only (index.html:205–235); Arrow-key navigation within the tablist activates tabs directly rather than scrolling the overflow tab bar.

**Evidence:**

- app.js:157 (keyboard shortcuts init)
- ui-core.js:465–490 (tab keyboard navigation)
- ui-core.js:633–654 (chat collapse with localStorage persistence)
- index.html:205–206 (tab scroll buttons — click-only)

---

### H8: Aesthetic and Minimalist Design

**Rating:** 🟡 Minor

**Finding:** The design system is coherent: 90 CSS custom properties in `:root` (styles.css:18–126) establish a consistent palette. Components follow a clean card/modal pattern with rounded corners and subtle shadows.

Density concerns:

- The header (index.html:34–71) packs 5 pill buttons into a single row. No responsive fallback is defined for narrower viewports.
- The position bar row (index.html:75–112) adds 5–6 elements in a second chrome row (title, ATS badge, keyword counts, layout freshness chip, divider, action buttons).
- The workflow steps nav (index.html:122–148) has 12 steps linked by arrows with `gap: 32px`, requiring horizontal scrolling at typical laptop widths — the `overflow-x: auto` is silent with `scrollbar-width: thin` (styles.css:263), providing a faint but not obvious scroll hint.
- The customization stage exposes 10 simultaneous tabs (ui-core.js:354–366).

**Evidence:**

- index.html:44–70 (header — 5 controls)
- index.html:75–112 (position bar — 5–6 elements)
- ui-core.js:354–366 (STAGE_TABS — customizations: 10 tabs)
- styles.css:263 (workflow-steps `gap: 32px; overflow-x: auto`)

---

### H9: Help Users Recognise, Diagnose, and Recover from Errors

**Rating:** 🟡 Minor

**Finding:** LLM errors surface in the conversation with `❌` prefixes (ui-core.js:1719–1722). The LLM status pill updates to "error" state (ui-core.js:1765) with a tooltip containing the error string. `setFail()` in `testCurrentModel()` (ui-core.js:1757–1768) shows a dotted-underline "Connection failed" message that reveals the error on hover — effective for technical users.

Gaps:

- On connection failure, the wizard reverts to Step 2 (ui-core.js:1766–1768) without a message explaining *what* failed (auth, rate-limit, model unavailable, network error).
- The ownership conflict banner (index.html:114–119) tells the user a conflict exists and offers a retry, but gives no explanation of the cause or how long to wait.
- The `#settings-status-msg` element (index.html:589) is positioned above the settings fields — if the user has scrolled down in the modal to adjust retry policy fields, the save error message may be above the visible area.

**Evidence:**

- ui-core.js:1757–1768 (connection failure — reverts to auth step, no diagnostic message)
- index.html:114–119 (conflict banner — no cause explanation)
- index.html:589 (settings status — above scrollable content)

---

### H10: Help and Documentation

**Rating:** 🟡 Minor

**Finding:** The "? Help" button (index.html:63–66) reopens the onboarding/welcome modal with a clear 3-phase workflow overview — accessible from the header at all times. Provider info popovers (ui-core.js:1219–1242) use Bootstrap 5 Popover to show clickable external links inline.

Gaps:

- The help modal is static and stage-unaware. A user stuck mid-rewrite gets the same generic onboarding content as a first-time user.
- No inline contextual help on the tab panels themselves (no "?" tooltips on the Experiences, Skills, or Achievements review tabs explaining what decisions to make).
- The model table in Step 3 of the LLM wizard (index.html:530–545) exposes pricing columns ($/1M in, $/1M out, Copilot multiplier) with no "What is this?" link or tooltip beyond the column `title` attribute — invisible without hover.
- The "Harvest" step explanation (index.html:146) is 32 words in a tooltip — only accessible on hover.

**Evidence:**

- index.html:63–66 (help button → welcome modal)
- index.html:330–349 (welcome modal content — static)
- index.html:530–545 (model table — pricing columns, no inline help)
- index.html:146 (Harvest tooltip — hover only)

---

## Additional UX Dimensions

### Cognitive Load

**Rating:** 🟠 Major

**Finding:** The customization stage is the highest cognitive-load point in the workflow. A user may simultaneously need to: review up to 10 tabs (Goals, Questions, Experiences, Experience Bullets, Skills, Achievements, Tagline, Summary, Publications, ATS Score); make binary keep/remove/edit decisions per item; answer post-analysis questions; and watch the ATS score change. This creates a very wide "working set" for a single workflow stage.

The tab bar filter by stage (ui-core.js:354–366, `STAGE_TABS.customizations` has 10 entries) reduces the overall tab count but 10 simultaneous active tabs is still a high-overhead interaction model. The split-panel layout (40% chat / 60% viewer) forces users to context-switch between conversation feedback and structured review panels in different visual regions.

**Evidence:**

- ui-core.js:354–366 (STAGE_TABS — customizations: 10 tabs)
- index.html:156–201 (chat panel) + index.html:204–247 (viewer panel) — split layout

---

### Visual Hierarchy

**Rating:** 🟡 Minor

**Finding:** Typography is consistent (system font stack, styles.css:130). Heading levels are systematic: `h2` in modals, `h3` for modal sections. Color coding for status states (success green, warning amber, error red) is systematic via CSS custom properties.

Three full-width chrome rows consume ~210px before main interactive content. On a 900px viewport, the workspace is only ~690px (`calc(100vh - 210px)`, styles.css:449).

Action buttons in the chat panel (index.html:189–199) are all styled `.action-btn.primary` (blue), giving them equal visual weight even though "Analyse Job" is the entry action and later buttons are continuation actions. No "primary of primaries" visual treatment distinguishes the most important next action.

**Evidence:**

- styles.css:449 (`calc(100vh - 210px)` main container)
- index.html:189–199 (all primary action buttons equal weight)

---

### Information Architecture

**Rating:** 🟡 Minor

**Finding:** The two-level navigation (workflow steps + tab bar) broadly maps to process position (step bar) and current view aspect (tab bar). This is a sound IA.

Potential confusion: "File Review" appears as both a workflow step label (step-download, index.html:136) and as a tab label (tab-download, index.html:226) in the same stage, while "Generated Files" (tab-final_generate, index.html:225) also lives in the same stage — three similar-sounding things in one place.

The Master CV is accessible from both the position bar button (index.html:104) and the "Master CV" tab (index.html:228) — two entry points for the same content may confuse users about whether edits in one surface are reflected in the other.

**Evidence:**

- index.html:136 (step-download = "File Review") vs index.html:225–226 (tab-final_generate = "Generated Files", tab-download = "File Review")
- index.html:104 (Master CV button in position bar) vs index.html:228 (tab-master in tab bar)

---

### Workflow Momentum

**Rating:** 🟡 Minor

**Finding:** The staged workflow is clear and sequential with explicit action buttons advancing each stage. The main momentum bottleneck is the customization stage: users can spend extended time across 10 tabs with no progress indicator of how many items have been reviewed. The `_explicitlyReviewed` counter in app.js:128 gates the rewrite button but is invisible to the user — they learn they missed items only when attempting to advance.

Cold-restoring a session after a long gap requires re-reading conversation history to re-orient to the current stage. Session list phase names are technical strings (e.g., "rewrite_review") not plain-English descriptions.

**Evidence:**

- app.js:128–142 (unreview gate — counter not surfaced to user)
- scripts/web_app.py:163 (session item `phase` field displayed as raw string)

---

### Feedback Loops

**Rating:** 🟢 Good

**Finding:** Async feedback is well implemented: LLM busy overlay with elapsed timer (index.html:160–168); toast notifications via `#toast-container` (index.html:288) with `aria-live="polite"`; ATS score refreshes after rewrites; layout freshness chip pulses when stale. The `#llm-busy-elapsed` counter (index.html:164) specifically prevents users from assuming the app is frozen during long LLM calls — a particularly good UX touch.

The connection success message appended to the conversation after `fetchStatus()` (app.js:71–72) provides reassurance on load. Rewrite decision restoration triggers a toast notification (rewrite-review.js:71–73) so users know prior work was recovered.

**Evidence:**

- index.html:160–168 (busy overlay with timer)
- index.html:288 (`aria-live="polite"` toast container)
- app.js:71–72 (connection success message)
- rewrite-review.js:71–73 (restore toast)

---

### Error Recovery

**Rating:** 🟡 Minor

**Finding:** Recovery paths exist for: LLM connection failures (retry via model wizard); session ownership conflicts (retry/takeover buttons); rewrite decision loss (localStorage restore with toast). These are solid foundations.

Gap: when an LLM call fails mid-workflow, the conversation panel shows an error message, but the primary action button (`#analyze-btn`) is disabled during the call. If the failure handler does not re-enable the button, the user is blocked with no obvious path to retry. There is no "Retry" button adjacent to the error message in the conversation — users must scroll down to find and click the appropriate workflow action button.

**Evidence:**

- app.js:41–106 (init — no explicit re-enable of `analyze-btn` on failure path after `fetchStatus()` fails)
- index.html:189–199 (action buttons — below conversation, not adjacent to error message)

---

### Affordance Clarity

**Rating:** 🟡 Minor

**Finding:** Primary action buttons are clearly styled blue (`.action-btn.primary`). Danger buttons use red (`.danger`). Focus rings are present on all interactive elements throughout styles.css (e.g., `outline: 2px solid var(--cv-accent)` on tabs, inputs, buttons).

Gaps:

- Workflow step pills: non-clickable (upcoming) steps have almost identical appearance to clickable ones — only slightly lighter text differentiates them. No "greyed out" disabled style (styles.css:269 `.step.upcoming` uses `color: var(--cv-slate-300)` — subtle). Users may click upcoming steps and see nothing happen.
- The toggle-chat button (`◀`, index.html:157) is small (34px min-width, styles.css:483), positioned at the top-right of the chat panel, and its function is not obvious from the glyph alone.
- Tab scroll arrows (index.html:205, 235) are hidden by default — users who have not seen scrollable tab bars may not know tabs continue beyond the visible area.

**Evidence:**

- styles.css:256–257 (`.step.clickable` — no strong visual distinction from `.step.upcoming`)
- styles.css:468–487 (toggle-chat button — small, positioned non-centrally)
- index.html:205 (tab scroll arrow hidden by default)

---

### Terminology Clarity

**Rating:** 🟡 Minor

**Finding:** Core domain terms are appropriate for a technical/professional tool. "Job Analysis," "Cover Letter," "Spell Check," and "Layout Review" are immediately clear. LLM configuration uses "Provider" and "Model" — standard AI terminology.

Unclear terms:

- "Customise" as a step label encompasses 10 distinct sub-tasks — the label severely undersells the complexity of the stage.
- "Harvest" is opaque without the tooltip.
- "ATS DOCX" as a settings checkbox label (index.html:642) — understandable only to users who know both terms.
- "Copilot multiplier" column in the model table (index.html:539) — explained only in a `title` attribute.
- "Refinement" as a backend phase name (conversation_manager.py:48) would be vague if surfaced to users.

**Evidence:**

- ui-core.js:356 (STAGE_TABS.customizations — 10 tabs under one "Customise" label)
- index.html:642 (ATS DOCX checkbox label)
- index.html:539 (Copilot multiplier — `title` only)
- index.html:146 (Harvest — tooltip only)

---

## Top 5 UX Issues by Impact

1. **Cognitive overload in the Customization stage** — 🟠 Major — The single "Customise" workflow step simultaneously exposes 10 tab panels, each requiring independent review decisions. No progress indicator exists within the stage. The gate counter (`_explicitlyReviewed` in app.js:128) is invisible to the user, so they learn of missed items only when trying to advance — via a `window.confirm()` dialog (app.js:139) that some browsers suppress. Impact: high abandonment risk at the most critical decision-making stage of the workflow. Evidence: app.js:128–142, ui-core.js:354–366.

2. **Chrome density — 210px of header rows reduce usable workspace** — 🟡 Minor/🟠 Major at laptop resolutions — Three stacked UI rows (app header: ~80px, position bar: ~70px, workflow nav: ~60px) consume approximately 210px before the main split-panel workspace begins (`calc(100vh - 210px)`, styles.css:449). On 768px-height displays the workspace is only ~558px. The workflow nav further requires horizontal scroll at typical laptop widths with no clear affordance. Impact: reduced visible workspace increases scroll burden and may hide action buttons below the fold. Evidence: index.html:34–148, styles.css:449, 263.

3. **Error prevention for destructive "Take Over" action** — 🟠 Major — The "Take Over" button in the ownership conflict dialog (index.html:413–416) performs an irreversible ownership claim with no warning about potential data loss in the competing tab. Users making a hasty click here may corrupt another tab's session work. Additionally, `window.confirm()` remains in use (app.js:139) rather than the custom `confirmDialog()` already implemented in ui-core.js:375, meaning the confirm could be silently suppressed by the browser. Evidence: index.html:405–419, app.js:139.

4. **Action buttons disappear with no inactive placeholder** — 🟡 Minor — The workflow action buttons in the chat panel (index.html:189–199) are shown/hidden via `style="display:none"` as stages advance. When a user returns to a session mid-workflow, there is no greyed-out placeholder to communicate "this was the last action taken." Users must infer their workflow state from the conversation history alone. This particularly affects session resumption after a break. Evidence: index.html:189–199, app.js:88–105 (session reconnection path).

5. **Dual LLM status displays with one dead region** — 🟡 Minor — Two elements exist for "LLM is working" status: `#llm-status-bar` (index.html:175–178, `display:none` default) and `#llm-busy-overlay` (index.html:159–168). The status bar is permanently hidden behind the overlay and appears to be unreachable in practice. Any code that updates the status bar produces invisible feedback, masking bugs and creating a maintenance trap. Impact: low immediate user impact but creates a reliability risk if the overlay path fails. Evidence: index.html:159–178.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/rewrite-review.js, web/workflow-steps.js
