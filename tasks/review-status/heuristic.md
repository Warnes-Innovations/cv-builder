<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# UX Heuristic Review — CV Builder

**Reviewer:** Senior UX and Interaction Designer (independent evaluation)
**Date:** 2026-07-06 14:30 ET
**Scope:** Full application — all source files reviewed independently; gaps.md and persona stories NOT consulted.
**Files Reviewed:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, `web/job-input.js`, `web/cover-letter.js`, `web/download-tab.js`

---

## Severity Legend

| Symbol | Level | Meaning |
| ------ | ----- | ------- |
| 🟢 | Good | Positive finding — exemplary or well-handled |
| 🟡 | Minor | Inconvenient; workaround exists; low abandonment risk |
| 🟠 | Major | Significantly impairs usability; causes confusion or errors |
| 🔴 | Critical | Prevents task completion or causes abandonment |

---

## H1 — Visibility of System Status

**Score: 🟢 Strong with 🟡 minor gaps**

### Positive Findings
- **LLM busy overlay** covers the chat panel with spinner, elapsed time counter (`#llm-busy-elapsed`), a label that changes per step ("Reasoning…"), and a "Taking longer than usual" amber badge that auto-shows on slow requests. Source: `index.html:160–167`, `styles.css:643–693`.
- **LLM status pill** in the header supports 8 semantic states: unconfigured / configured / connecting / connected / auth-required / rate-limited / unavailable / error — each with distinct colour, icon, and tooltip text. Source: `ui-core.js:770–811`.
- **Workflow step states** use well-differentiated colours: active (blue), completed (green), stale (amber), stale-critical (red), browsing-away (pulsing amber ring). Source: `styles.css:266–286`.
- **Layout freshness chip** signals current / stale / critical states with animation on stale. Source: `state-manager.js:120–178`.
- **Tab stale badges** surface upstream content changes inline on the affected tab. Source: `styles.css:767–779`.
- **ATS score badge** in the position bar provides a persistent score with colour thresholds (green / amber / red). Source: `index.html:91–98`.
- **Screen-reader live region** `#workflow-stage-announcer` announces stage transitions to assistive technology. Source: `index.html:149–151`.

### Issues
- 🟡 **H1-1 — LLM status pill is nested inside the model selector button.** The `#llm-status-pill` is a child of `#model-selector-btn` (`index.html:55–62`). Users must parse a compound button (LLM label + status icon + model label + confidentiality badge + test badge + chevron) to get status. A standalone status indicator outside the button would make the connection/error state immediately scannable.
- 🟡 **H1-2 — Token count display is monospace 11px and underemphasised.** `#llm-token-count` (`styles.css:641`) is rendered in a tiny monospace font in the conversation header — below the scan threshold for most users. Users will not notice when approaching context limits.
- 🟡 **H1-3 — No explicit step-count during multi-step generation.** The LLM busy overlay shows a spinner and elapsed time but no "Step X of N" indicator. Large generation operations feel indeterminate.

---

## H2 — Match Between System and the Real World

**Score: 🟡 Moderate gaps**

### Positive Findings
- Icon + label pairing on all workflow steps and most buttons.
- Cover letter tone options use real-world industry labels ("Startup / Tech", "Pharma / Biotech", etc.). Source: `cover-letter.js:19–25`.
- URL fetch panel distinguishes sites that work automatically from those requiring manual copy, using recognisable brand names. Source: `job-input.js:140–149`.

### Issues
- 🟡 **H2-1 — "Harvest" is a non-standard metaphor for a professional tool.** A job-seeker sees the workflow end at "🌾 Harvest" (`index.html:146`) and must infer that this means saving improvements back to their master profile. A label like "Update Profile" or "Save Improvements" would be self-describing.
- 🟡 **H2-2 — "ATS" is used without expansion in critical labels.** "ATS" appears as a score badge label, button label ("ATS Report"), tab label ("ATS Score"), and throughout warning text without being expanded to "Applicant Tracking System" in the first instance. Users unfamiliar with HR tech will be confused.
- 🟡 **H2-3 — "Master CV" distinction is not immediately clear.** New users see both a "Master CV" tab and a regular workflow aimed at generating a targeted CV but receive no inline explanation of the relationship until the welcome modal.
- 🟡 **H2-4 — Backend file-path terminology leaks into user-facing onboarding.** The welcome modal references `Master_CV_Data.json` as a raw file system path (`index.html:378`), which is developer-centric rather than user-facing.

---

## H3 — User Control and Freedom

**Score: 🟢 Good with 🟡 minor gaps**

### Positive Findings
- **Abort button** for LLM requests (■ Stop) visible in both the LLM busy overlay and the status bar. Source: `index.html:167–168`.
- **Clickable workflow steps** unlock progressively; completed steps can be navigated back to. Source: `ui-core.js:1856–1953`.
- **Iterative refinement panel** in the Download tab provides "Refine Customisations", "Refine Rewrites", "Re-analyse Job" shortcuts. Source: `download-tab.js:264–283`.
- **Bulk undo** for review tables exists.
- **Session management** includes trash/restore. Source: `index.html:263–269`.
- **Escape key** closes all modals. Source: `ui-core.js:513–517`.

### Issues
- 🟡 **H3-1 — The chat panel collapse button (◀) is positioned absolutely and lacks a visible label.** Its absolute top-right positioning means the relationship between the button and the panel it controls is not visually apparent. Source: `index.html:157`.
- 🟡 **H3-2 — No undo for cover letter edits.** Clicking "🔄 Regenerate" immediately overwrites the textarea (`cover-letter.js:285–289`) without a confirmation step. A user who has manually edited the letter loses their work silently.
- 🟡 **H3-3 — No "Start over" affordance on the current session.** Users who want to change the job description must find the "Load Different Job" button inside the Job tab — not advertised from other stages.

---

## H4 — Consistency and Standards

**Score: 🟠 Major gaps**

### Positive Findings
- Comprehensive design token system (90+ CSS custom properties in `:root`). Source: `styles.css:18–127`.
- Consistent button hierarchy: `.action-btn`, `.action-btn.primary`, `.action-btn.secondary`, danger variant.
- Modal pattern consistent (header / body / footer with close-×, ESC, and background-click).

### Issues
- 🟠 **H4-1 — Dual navigation systems with overlapping semantics.** The application presents two simultaneous navigation surfaces: (a) the 12-step workflow step bar (top, always visible) and (b) the 22-tab tab bar (right panel). The step bar represents workflow progress; the tab bar shows content views within a stage. Their relationship is not explained, they are not visually coordinated, and users must maintain a mental model of both. Example: "Analysis" appears in the step bar AND as a tab, but "Goals", "Questions", "Experiences" tabs are only reachable via the tab bar, not via the step bar. Source: `index.html:122–148` (step bar), `index.html:206–234` (tab bar), `ui-core.js:357–370` (STAGE_TABS mapping).
- 🟠 **H4-2 — Two separate "advance workflow" interaction patterns.** The primary action buttons (Analyse Job, Recommend Customizations, etc.) live at the bottom of the chat panel (left side). The "Proceed →" navigation buttons ("📋 Proceed to Screening →") live at the bottom of document viewer content (right side). Users must look in two different locations to advance the workflow. Source: `index.html:189–200`, `cover-letter.js:163–165`, `download-tab.js:519–523`.
- 🟡 **H4-3 — Inconsistent modal activation mechanism.** Most modals use `style.display = 'flex'` directly (e.g., `ui-core.js:252`, `ui-core.js:1462`). The `openModal()` helper uses `classList.add('visible')` (`ui-core.js:666`). Two techniques coexist for the same pattern.
- 🟡 **H4-4 — "File Review" and "Generated Files" tabs cover overlapping perceived content.** Both live in the `download` stage (`ui-core.js:364`). The distinction — "Generated Files" for immediate post-generation downloads, "File Review" for ATS validation and completeness — is not obvious from the labels alone.
- 🟡 **H4-5 — Inconsistent navigation label forms.** The step bar uses title-cased noun phrases ("Job Input", "Analysis"); the tab bar uses emoji-prefixed noun phrases; action buttons use imperative verbs with emoji ("🔍 Analyse Job", "✏️ Review Rewrites"). No single naming convention exists across the three surfaces.

---

## H5 — Error Prevention

**Score: 🟢 Strong with 🟡 minor gaps**

### Positive Findings
- **Paste text minimum character gate** (200 chars) with inline feedback before submit. Source: `job-input.js:324–384`.
- **URL protocol validation** before fetch attempt. Source: `job-input.js:428–437`.
- **File type and size validation** client-side before upload. Source: `job-input.js:221–258`.
- **Soft gate** when proceeding to Rewrite Review with unreviewed items — confirm dialog explains what will be skipped. Source: `app.js:128–143`.
- **Protected site detection** for LinkedIn/Indeed with explicit instructions rather than a generic error. Source: `job-input.js:512–534`.
- **Confirm dialog** replaces browser `confirm()` to avoid silent suppression. Source: `ui-core.js:379–453`.

### Issues
- 🟡 **H5-1 — Cover letter regeneration has no confirmation step.** Clicking "🔄 Regenerate" immediately overwrites the textarea without a warning that manual edits will be lost. Source: `cover-letter.js:285–289`.
- 🟡 **H5-2 — The LLM wizard does not prevent proceeding from Step 2 without a saved key.** A user can click "Next" without entering or saving an API key, proceed to Step 3, and encounter a test failure with a less helpful error message. Source: `ui-core.js:1383–1394`.
- 🟡 **H5-3 — No warning before navigating away from a partially completed review table.** Partial experience or skills decisions are not warned about if the user changes stage or tab.

---

## H6 — Recognition Rather Than Recall

**Score: 🟡 Moderate gaps**

### Positive Findings
- Contextual action buttons shown only for the current workflow stage prevent recall-load about which button to use.
- Prior cover letters displayed for re-use selection. Source: `cover-letter.js:70–91`.
- Session switcher shows recent sessions prominently with job title and stage.
- Analysis auto-suggests cover letter tone from job domain. Source: `cover-letter.js:186–193`.

### Issues
- 🟠 **H6-1 — Chat input requires recall of natural-language commands.** The message input placeholder reads "Type a message (e.g., 'analyse job')" (`index.html:185`). The app is conversation-driven; users must remember or guess valid commands rather than recognising them from the UI. This is a significant barrier for returning users who are not power users.
- 🟡 **H6-2 — 22-tab tab bar with scrolling hides tabs beyond the visible area.** Users cannot see all available content at once; off-screen tabs are not discoverable without horizontal scrolling. The scroll arrows only appear when overflow exists (`ui-core.js:553–556`), so users may not know to look. Source: `index.html:207–234`.
- 🟡 **H6-3 — The model catalog table exposes raw pricing data without context.** $/1M input/output tokens and Copilot multipliers are shown without practical cost examples. Non-technical users have no frame of reference. Source: `index.html:537–541`.
- 🟡 **H6-4 — Workflow step tooltips only repeat the label.** A step labeled "Customise" with tooltip "Content customisation" adds no new information. Tooltips should describe what the user will do at that stage.

---

## H7 — Flexibility and Efficiency of Use

**Score: 🟡 Moderate gaps**

### Positive Findings
- Keyboard shortcuts initialised on app load. Source: `app.js:164`.
- Arrow-key tab navigation per WCAG tablist pattern. Source: `ui-core.js:479–496`.
- Three job input methods: paste, URL, file upload with drag-and-drop. Source: `job-input.js:107–112`.
- Quick model list in wizard based on recent selections. Source: `ui-core.js:870–896`.

### Issues
- 🟡 **H7-1 — No visible keyboard shortcut legend.** Power users have no way to discover available shortcuts without reading documentation.
- 🟡 **H7-2 — No fast lane for returning users.** A user applying to a second job must traverse all 12 steps again. There is no way to start from a specific stage with pre-populated content.
- 🟡 **H7-3 — No bulk-approve or "use all AI recommendations" path visible.** Experienced users who trust the AI recommendations are forced through per-item review. Bulk undo exists but bulk-accept is not surfaced.

---

## H8 — Aesthetic and Minimalist Design

**Score: 🟠 Major gaps**

### Positive Findings
- Clean design token system produces visual consistency.
- Collapsible chat panel allows full-width document viewing.
- Tab visibility scoped to workflow stage reduces tab bar clutter.
- Accordion-style ATS report (`<details open>`) reduces visual noise when no issues exist. Source: `download-tab.js:127–158`.

### Issues
- 🟠 **H8-1 — Header area is over-dense.** The header and position bar rows together present 15+ distinct interactive elements simultaneously:
  - Header: logo, title, session-name, Sessions button, New Session button, LLM button (model label + status pill + confidentiality badge + test badge + chevron), Help button, Settings button
  - Position bar: job title, rename icon, company subtitle, ATS score badge, keyword summary, layout freshness chip, divider, Master CV button, ATS Report button, Job Analysis button

  This persistent chrome is present on every screen. Source: `index.html:34–112`.

- 🟠 **H8-2 — File Review tab is information-overloaded.** The tab renders up to 14 distinct sections in vertical sequence before and after the download buttons: readiness chip, advisory note, ATS validation table, summary quality warnings, publication warnings, long bullet warnings, sparse experience warnings, year-only date warnings, rewrite audit mismatches, employment date overlaps, download grid, persuasion check, rewrite audit log, refinement panel, navigation button. Critical blocking failures can be visually lost among advisory warnings. Source: `download-tab.js:375–524`.

- 🟡 **H8-3 — 12-step workflow bar overflows horizontally on smaller screens.** The 12 steps + 11 arrows require ~1400px+ to display without overflow. Below that, the bar requires horizontal scroll, making workflow navigation cumbersome. Source: `index.html:122–148`, `styles.css:264`.

- 🟡 **H8-4 — Inline styles mixed extensively throughout the HTML.** Over 150 `style="..."` attributes appear in `index.html` alongside CSS classes, creating visual and maintenance inconsistency.

---

## H9 — Help Users Recognise, Diagnose, and Recover from Errors

**Score: 🟢 Good with 🟡 minor gaps**

### Positive Findings
- Inline field error messages with ARIA `aria-invalid`, `aria-describedby`, and `aria-live`. Source: `job-input.js:554–572`.
- Retry button in conversation panel. Referenced in `job-input.js:401,418,505`.
- Protected site detection returns site-specific instructions. Source: `job-input.js:512–534`.
- ATS validation errors include specific check name, format badge, and detail text. Source: `download-tab.js:131–157`.
- LLM connection failure shows status in both the header pill and the chat panel.

### Issues
- 🟡 **H9-1 — Session establishment failure does not link to remediation.** "Could not establish a session" (`app.js:50–51`) provides no button or link to the Sessions modal. Users must find the Sessions button themselves.
- 🟡 **H9-2 — LLM model test failure navigates back to Step 2 silently.** `setFail()` calls `_setModelWizardStep(2)` without explaining why the step changed or what the user should fix. Source: `ui-core.js:1791–1793`.
- 🟡 **H9-3 — URL fetch failure triggers both inline field error AND alert modal.** Both `_showFieldError()` and `showAlertModal()` fire for the same error (`job-input.js:488–490`). This double-feedback is redundant.
- 🟡 **H9-4 — Cover letter generation failure shows a generic alert without recovery guidance.** The user is not told whether to retry, check their model, or take another action. Source: `cover-letter.js:291`.

---

## H10 — Help and Documentation

**Score: 🟡 Moderate gaps**

### Positive Findings
- **Help button** in header reopens the welcome modal. Source: `index.html:63–66`.
- **Welcome modal** explains the 3-phase workflow clearly with context-sensitive state (profile ready / empty / missing). Source: `index.html:321–402`.
- **URL fetch panel** contains inline guidance about which sites support automatic extraction. Source: `job-input.js:140–149`.
- **LLM wizard** is a guided 4-step process with inline authentication instructions. Source: `ui-core.js:937–1060`.

### Issues
- 🟡 **H10-1 — No contextual help within workflow stages.** Once inside a stage (Rewrite Review, Spell Check, Harvest, etc.), there is no "?" contextual help explaining what the user should do or how to interpret AI recommendations. The global Help button only reopens the welcome modal.
- 🟡 **H10-2 — The LLM wizard authentication step is technically demanding.** Step 2 references environment variables, .env files, and API key sources without guidance for non-technical users. Source: `ui-core.js:983–1019`.
- 🟡 **H10-3 — "Harvest" step has no inline explanation of purpose.** First-time users will not know what the harvest operation does or whether it is optional.
- 🟡 **H10-4 — ATS validation check names lack tooltips or a glossary.** "docx_standard_headings", "html_jsonld_valid_person" etc. appear in the validation table without explanations. Source: `download-tab.js:131–157`.

---

## Additional UX Dimensions

### Cognitive Load — 🟠 Major Concern
The application simultaneously presents: (1) a 12-step workflow bar with state-differentiated styling, (2) a 22-tab tab bar that changes its visible set per stage, (3) a persistent header with 8 interactive controls, (4) a position bar with 10+ elements, (5) a chat conversation history, and (6) a document viewer with stage-specific content. The dual navigation system is the single largest cognitive load driver: users must maintain a mental model of both "what stage am I in" (step bar) and "what content am I viewing" (tab bar) simultaneously, with no visual bridge between the two.

### Visual Hierarchy — 🟡 Minor Concerns
The header's dark background effectively anchors the top. Within the chat area, the action buttons row shares equal visual weight with the chat input field — primary workflow-advance buttons do not stand out sufficiently. The tab bar has uniform visual weight across tabs regardless of which is active; the active tab's blue underline is subtle.

### Information Architecture — 🟠 Major Concern
The STAGE_TABS mapping (`ui-core.js:357–370`) maps 12 workflow stages to tab groups, but this relationship is not communicated to users. The "customizations" stage alone exposes 10 tabs. The "Generated Files" and "File Review" tabs in the same stage have overlapping perceived purposes. The Master CV is accessible from 3 different entry points (position bar button, tab in tab bar, modal from header) — good reachability, but multiple paths can confuse users about the canonical location.

### Workflow Momentum — 🟢 Generally Good
The primary action button changes per stage, giving a clear "what next" signal. Stage navigation buttons ("Proceed →") at the bottom of content maintain momentum within stages. The main gap is the dual primary-action locations (chat panel bottom vs. document viewer bottom) which interrupts momentum.

### Feedback Loops — 🟢 Generally Strong
Live debounced validation on cover letter (600ms), ATS badge updates, layout freshness chip, and generation step indicators are strong. Toast notifications and the chat conversation log confirm actions.

### Affordance Clarity — 🟡 Minor Concerns
- The ◀ chat toggle button (`index.html:157`) is a small square with a chevron; not obviously a panel toggle.
- Workflow step pills look like status badges but are also buttons; no hover cursor (`.clickable:hover`) is defined in CSS for all states.
- Tab scroll arrows appear/disappear dynamically; their first appearance may surprise users.

### Terminology Clarity — 🟡 Minor Concerns
- "ATS" unexpanded throughout (see H2-2)
- "Harvest" non-standard (see H2-1)
- "Tagline" vs "Summary" as sibling tabs — distinction not self-explaining
- "Rewrites" step refers to experience bullet rewrites — not self-describing
- "Persuasion check" — "persuasiveness check" or "impact language check" would be clearer
- "Layout Review" and "File Review" have overlapping scope in users' minds

---

## Top 5 UX Issues Most Likely to Cause Friction or Abandonment

### 🟠 Issue 1 — Dual Navigation Systems Create Disorientation
**Severity: Major | Heuristics: H4-1, Cognitive Load, IA**

The 12-step workflow bar and the 22-tab tab bar are two separate navigation surfaces with different semantics and no visual bridge between them. The step bar represents workflow progress; the tab bar represents content views within a stage. Neither surface explains its purpose or relationship to the other.

**Evidence:**
- `index.html:122–148` — 12-step bar with 12 steps + 11 arrows
- `index.html:207–234` — 22-tab tab bar
- `ui-core.js:357–370` — STAGE_TABS mapping (hidden from users)
- The "customizations" stage maps to 10 tab-bar tabs but a single step-bar pill

**Impact:** First-time users won't know which navigation surface to use to advance vs. explore. Returning users may click the step bar expecting content that lives in the tab bar. The browsing-away animation mitigates this but adds a third navigation concept to track.

---

### 🟠 Issue 2 — Primary Action Buttons Split Across Left and Right Panels
**Severity: Major | Heuristics: H4-2, Workflow Momentum**

Workflow primary actions (Analyse Job, Recommend Customizations, Generate Preview, etc.) live at the bottom of the chat panel (left). Stage-navigation buttons ("Proceed to Screening →") live at the bottom of document viewer content (right). Users must look in two different locations to advance the workflow.

**Evidence:**
- `index.html:189–200` — `.actions` div inside `.interaction-area` (left panel)
- `cover-letter.js:163–165` — "Proceed to Screening →" at bottom of document content (right panel)
- `download-tab.js:519–523` — "Proceed to Cover Letter →" at bottom of document content

**Impact:** Users watching the document viewer for generation results must shift attention to the chat panel to trigger the next action. This creates a cross-panel attention zigzag that slows task completion and may cause users to miss action buttons — especially with the chat panel collapsed.

---

### 🟠 Issue 3 — Header and Position Bar Are Overloaded
**Severity: Major | Heuristics: H8-1, Cognitive Load**

The header + position bar together present 15+ distinct interactive elements, labels, and status indicators simultaneously as persistent chrome on every screen.

**Evidence:**
- `index.html:34–112` — header (8 pill buttons/elements) + position bar (9 elements)
- The LLM model selector button alone nests 5 sub-elements: model label, status pill (icon + label), non-confidential badge, test badge, chevron
- The position bar can simultaneously show: job title, rename icon, company subtitle, ATS score badge, ATS keyword summary, layout freshness chip, divider, Master CV button, ATS Report button, Job Analysis button

**Impact:** Visual noise reduces scannability of critical status signals (LLM connection state, layout staleness). New users will not know which elements are actionable. The density tax increases cognitive load on every screen and every task.

---

### 🟠 Issue 4 — First-Run Onboarding Friction for Non-Technical Users
**Severity: Major | Heuristics: H2-5, H10-2**

Two prerequisites — a populated `Master_CV_Data.json` file and a configured LLM provider — are required before the application is useful. The new-user onboarding flow is developer-centric:

1. Welcome modal shows a raw filesystem path and "Create empty profile" / "Reload" buttons. Source: `index.html:374–401`.
2. Creating an empty profile opens the Master CV editor — a large structured form — with no guided entry sequence or minimum viable content indication.
3. The LLM wizard requires understanding of API keys, environment variables, or device-flow OAuth. Source: `ui-core.js:937–1060`.

**Impact:** A first-time non-technical user (the primary persona for a CV builder) faces two non-trivial technical setup hurdles before reaching the workflow. High probability of abandonment at this stage.

---

### 🟠 Issue 5 — File Review Tab Is Information-Overloaded at the Critical Submission Step
**Severity: Major | Heuristics: H8-2**

The File Review tab is the workflow culmination — where users assess quality and download files. It renders up to 14 sections in vertical sequence. When many warnings are present, download buttons are pushed far below the fold, and critical blocking failures (❌) can be visually lost among advisory warnings (⚠) that share similar amber styling.

**Evidence:**
- `download-tab.js:375–524` — full rendering sequence: readiness chip, advisory note, ATS table, 7 warning panels, download grid, persuasion check, rewrite audit log, refinement panel, navigation button
- `download-tab.js:178–188` — `_NON_BLOCKING_CHECKS` set (correctly identifies advisory vs. blocking) but this distinction is not visually prominent enough

**Impact:** Users may experience overwhelm, miss the download buttons, or submit files with blocking failures that were overlooked among advisory warnings. This is the last step before submission — errors here have the highest real-world consequence.

---

## Summary Table

| Issue | Heuristic | Severity | File / Line |
| ----- | --------- | -------- | ----------- |
| Dual navigation (step bar + tab bar) | H4, Cognitive Load | 🟠 Major | `index.html:122–234`, `ui-core.js:357–370` |
| Primary actions split left/right | H4-2, Workflow Momentum | 🟠 Major | `index.html:189–200`, `cover-letter.js:163` |
| Header/position bar overloaded | H8-1 | 🟠 Major | `index.html:34–112` |
| First-run onboarding friction | H2-5, H10-2 | 🟠 Major | `index.html:373–401`, `ui-core.js:937` |
| File Review tab information overload | H8-2 | 🟠 Major | `download-tab.js:375–524` |
| Chat input recall-based commands | H6-1 | 🟠 Major | `index.html:185` |
| "Harvest" non-standard label | H2-1 | 🟡 Minor | `index.html:146` |
| ATS acronym without expansion | H2-2 | 🟡 Minor | Throughout |
| No undo on cover letter regeneration | H3-2, H5-1 | 🟡 Minor | `cover-letter.js:285–289` |
| LLM status pill nested in button | H1-1 | 🟡 Minor | `index.html:55–62` |
| Tab bar with 22 hidden-overflow tabs | H6-2 | 🟡 Minor | `index.html:207–234` |
| Wizard step regression on test failure | H9-2 | 🟡 Minor | `ui-core.js:1791–1793` |
| URL fetch double error feedback | H9-3 | 🟡 Minor | `job-input.js:488–490` |
| No contextual help in workflow stages | H10-1 | 🟡 Minor | Global |
| Inconsistent modal activation | H4-3 | 🟡 Minor | `ui-core.js:252,1462,666` |
| Chat collapse button affordance | Affordance | 🟡 Minor | `index.html:157` |
