<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# UX Heuristic Evaluation

**Last Updated:** 2026-06-18 14:00 ET
**Evaluator:** Independent expert review (source-code only; no prior tasks/gaps.md read)
**Scope:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

---

## Nielsen's 10 Heuristics

| # | Heuristic | Rating | Evidence |
|---|-----------|--------|----------|
| H1 | Visibility of system status | 🟡 Minor | LLM busy overlay with spinner + elapsed timer exists (styles.css:517-566). Token count shown (index.html:163). However, the workflow progress bar (index.html:117-143) has no "current step" indicator on initial load — steps start unstyled until JS hydrates. Two competing status mechanisms exist: `#llm-status-bar` (index.html:167-170) AND `#llm-busy-overlay` (index.html:152-159), creating redundancy. Phase names in state-manager.js:23-33 (`job_analysis`, `customization`, `rewrite_review`, `spell_check`, `generation`, `layout_review`, `final_generation`, `refinement`) are developer identifiers never shown to users — the UI maps them to step names but the mapping is only applied after fetchStatus(), so on slow connections users see a blank workflow bar. |
| H2 | Match between system and the real world | 🟠 Major | Multiple mismatches: (a) "Harvest" (index.html:141, tab:225) is agricultural metaphor unexplained outside the welcome modal — users won't guess it means "save improvements back to master profile". (b) "ATS" acronym appears without expansion throughout (index.html:86-103) — users unfamiliar with recruiting tools get no tooltip or explanation. (c) Tab label "Experience Bullets" (index.html:205) uses internal jargon ("bullets" = resume bullet points); "Tagline" (index.html:208) is ambiguous (it means professional headline). (d) Settings expose raw developer concepts: "Temperature", "Base Delay (ms)", "Cap Ms", "Auto Retry Attempts" (index.html:583-653) — these are engineering parameters, not user-facing controls. (e) Phase name `reentry_phase` leaks into the API StatusResponse (web_app.py:127). |
| H3 | User control and freedom | 🟡 Minor | Emergency exit exists: ESC closes modals (ui-core.js:525-529), background-click dismisses most overlays (ui-core.js:532-539). Abort button present during LLM calls (index.html:159,169). Session switching is accessible via header button. However: (a) No "undo" for rewrite decisions once submitted — `submitRewriteDecisions` in app.js:132 sends decisions to backend with no rollback UI. (b) Workflow step clicks are clickable but only where the JS adds `handleStepClick` (index.html:119-141); several steps lack onclick or are not marked `.clickable` in CSS (styles.css:142-143), making it unclear which ones are navigable. (c) Phase transitions in conversation_manager.py:65-76 are gated — a user who skips questions cannot easily re-enter the customization phase without a developer-level re-run. |
| H4 | Consistency and standards | 🟠 Major | Multiple inconsistencies: (a) Two parallel navigation structures — workflow steps bar (index.html:117-143) and tab bar (index.html:196-228) — use different naming for the same stages: the step bar says "⬇️ Download" but the tab bar has "📄 Generated Files" AND "⬇️ File Review" as separate tabs (index.html:217-218). (b) Modal close buttons are implemented three different ways: `onclick="closeSessionsModal()"`, `class="modal-close-btn"`, and bare `onclick="closeSettingsModal()"` — no uniform pattern. (c) Step bar emojis are inconsistent with tab bar emojis for the same content (e.g., step "⚙️ Customise" maps to tabs including "📊 Experiences", "✏️ Experience Bullets", "🛠️ Skills", "🏆 Achievements", "🏷️ Tagline", "📝 Summary", "📄 Publications" — no visual connection). (d) Action buttons in the chat panel shift (show/hide) per phase with no consistent placement (index.html:182-190) — different buttons appear in the same location as the workflow advances, violating spatial consistency. (e) "Finalise" (British spelling, index.html:190,219) vs general American English elsewhere. |
| H5 | Error prevention | 🟡 Minor | Confirm dialog exists (ui-core.js:372-418) and is used for destructive actions. Session conflict banner (index.html:110-114) prevents data loss from concurrent tabs. However: (a) The free-text message input (index.html:177) has placeholder text `"Type a message (e.g., 'analyze job')"` — user can type anything at any phase, potentially sending nonsensical messages mid-workflow. (b) Settings form (index.html:580-656) has no validation feedback before save — a non-numeric temperature value or empty provider field is silently sent to the backend. (c) Auto-analysis fires on load if a job is detected (app.js:90-95), with no confirmation prompt — users who loaded a prior session to review it get surprised by automatic LLM calls. |
| H6 | Recognition rather than recall | 🟠 Major | (a) The tab bar shows up to ~20 tabs simultaneously (index.html:200-226), many hidden at any given phase, with no visual indication of which are available at the current step — users must recall which tabs apply. (b) `STAGE_TABS` mapping (ui-core.js:350-363) filters tabs by stage but the user cannot see or discover the full tab list; hidden tabs (style=display:none) are completely invisible with no disclosure. (c) The workflow steps bar provides breadcrumb-like navigation but offers no tooltip content, hover descriptions, or completion counts for steps like "Customise" (which contains 10 sub-tabs). (d) Action buttons in the chat area are labeled with phase-specific text like "Continue to Spell Check →" or "✅ Confirm Layout" (index.html:185-189) — these require users to recognize what each phase entails to know whether they are ready to proceed. (e) Chat input placeholder (index.html:177) is the only discoverability hint for what can be typed, and it shows a single example rather than context-sensitive suggestions. |
| H7 | Flexibility and efficiency of use | 🟡 Minor | Power users have: tab keyboard navigation (ui-core.js:491-509), Enter to send (ui-core.js:513-523), session switcher for multi-job management. However: (a) No keyboard shortcuts for triggering workflow actions (Analyze, Recommend, Generate) — these require mouse clicks only. (b) No way to batch-accept or batch-reject rewrite suggestions — each must be reviewed individually with no "Accept All"/"Reject All" shortcut. (c) No direct URL linkage to a specific session or tab — deep-linking is not supported; users must navigate from the home state each time. |
| H8 | Aesthetic and minimalist design | 🟠 Major | The interface has accumulated significant complexity: (a) The position bar row (index.html:69-107) contains: a job title, company, rename button, ATS score badge, ATS summary, layout freshness chip, divider, Master CV button, ATS Report button, and Job Analysis button — 9 distinct elements on a single toolbar row. (b) The header (index.html:34-66) contains: logo, app title, session name, Sessions button, New Session button, LLM model selector with status pill, and Settings button — 7 elements crammed into a 48px bar. (c) Inline styles dominate throughout the HTML (hundreds of style="..." attributes on index.html:267-699), making the visual design inconsistent with the structured CSS — e.g., the Master CV modal overlay has 7 inline style attributes (index.html:268). (d) The settings modal exposes 12 technical parameters with "Source: ..." annotations (index.html:570-656) that are only useful to developers, not end users configuring their first CV run. |
| H9 | Help users recognize, diagnose, and recover from errors | 🟡 Minor | Error messages exist in the conversation as system messages (app.js:50-52). LLM error types (LLMAuthError, LLMRateLimitError, LLMContextLengthError) are caught in web_app.py:66 and presumably surface as messages. However: (a) Generic init error: `"⚠️ Failed to initialize: ${error.message}"` (ui-core.js:475) gives no recovery action. (b) Tab load error (ui-core.js:641): `"Error loading content: ${error.message}"` appears inline in red with no retry button. (c) The `#llm-busy-state-badge` ("Taking longer than usual", index.html:157) appears after a delay but provides no diagnosis of why it's slow or what the user can do besides "Stop". (d) Session conflict recovery (index.html:381-395) gives three options ("Load Different", "New Session", "Take Over") with no explanation of consequences. |
| H10 | Help and documentation | 🔴 Critical | (a) There is no persistent help link, tooltip system, or documentation link anywhere in the UI — the only onboarding is the welcome modal (index.html:313-379), which is shown once and can be permanently dismissed. (b) After dismissal, users have no way to re-open the onboarding guide — there is no "?" or "Help" button in the header or anywhere in the main UI. (c) The 12-step workflow (13 workflow steps in index.html:119-142 counting Download through Thank You and Harvest) gives no per-step guidance on what each step expects or produces. (d) Technical settings like "Temperature" and "Base Delay (ms)" have no explanation or tooltip. (e) The welcome modal contains `<code>Master_CV_Data.json</code>` — a raw filesystem path — as the first setup instruction, requiring technical comfort to proceed. |

---

## Additional UX Dimensions

### Cognitive Load
**Rating: 🟠 Major**

The UI imposes high cognitive load through three simultaneous navigation layers: (1) the workflow steps bar with 13 steps (index.html:119-141), (2) the tab bar with up to ~20 tabs (index.html:200-226), and (3) the chat/action area with phase-shifting primary buttons (index.html:182-190). Users must track their position across all three simultaneously. The `STAGE_TABS` mapping (ui-core.js:350-363) shows that the "customizations" stage alone owns 10 sub-tabs, but this complexity is never summarized for the user. The conversation panel accumulates messages indefinitely with no grouping or summary, requiring users to scroll to recall prior decisions.

### Visual Hierarchy
**Rating: 🟡 Minor**

The dark header (#1e293b, styles.css:20) creates a clear top anchor. The position bar (styles.css:83-141) provides job context. The workflow bar uses consistent pill styling. However: the two most important actions at any given moment (the phase action button in the chat area, e.g., "🔍 Analyze Job") live below the fold of the chat conversation when messages accumulate. The primary action buttons (styles.css:583-589) are visually equal to secondary buttons — only `primary` class adds blue fill, but all action buttons have the same height and font size.

### Information Architecture
**Rating: 🟠 Major**

Two navigation systems exist with partially overlapping semantics: the workflow steps bar (stages) and the tab bar (sub-views within stages). The mapping between them is implicit — clicking "⚙️ Customise" in the steps bar does not automatically select a default sub-tab. There is no clear indication of how many tabs live under each step. The "Master CV" tab (index.html:220) is placed at the end of the tab list after Spell Check and Layout Review tabs, but the Master CV is logically a prerequisite to the entire workflow (per the welcome modal). The `cover_letter`, `screening`, `interview_prep`, `thank_you`, and `harvest` steps (index.html:133-141) appear after "Download" in the steps bar, implying a post-download workflow, but there is no visual separator or grouping to show this is a distinct post-generation phase.

### Workflow Momentum
**Rating: 🟠 Major**

The workflow relies on the user knowing when to proceed to the next phase. Action buttons like "Continue to Spell Check →" (index.html:185) or "Done — Generate CV →" (index.html:186) appear only when the current phase is complete, but there is no progress indicator within a phase (e.g., "You have reviewed 3 of 8 experiences"). The auto-analysis on load (app.js:89-95) is the only autonomous momentum — all other transitions require user-initiated clicks. When an LLM call is aborted mid-phase (via the stop button), there is no UI guidance on how to resume or retry just that phase.

### Feedback Loops
**Rating: 🟡 Minor**

Immediate feedback exists for LLM calls (spinner, elapsed timer, step label). Toast notifications exist (index.html:280). ATS score badge updates dynamically. However: after submitting rewrite decisions (app.js:132), the button label is `"Continue to Spell Check →"` with no count of how many were accepted/rejected before transition. After saving settings (ui-core.js:215-237), success/error is shown in a status div but only within the modal — the main UI does not reflect any change.

### Error Recovery
**Rating: 🟡 Minor**

The `conflictRetryNow()` button (index.html:112) allows manual retry on session conflicts. The welcome modal Reload button (index.html:375) allows recovery from missing master profile. However: there is no recovery path from a mid-workflow LLM failure that partially completed a phase. If `analyzeJob()` (app.js:95) partially runs and fails, the phase state may be inconsistent with no user-visible recovery option.

### Affordance Clarity
**Rating: 🟡 Minor**

The toggle-chat button (index.html:149, styles.css:347-367) uses "◀" which is a reasonable collapse indicator. Pill buttons in the header have chevrons (index.html:47,61) indicating they open menus. However: the workflow step pills (index.html:119-142) are visually identical whether clickable or not — only some have `class="clickable"` which adds cursor:pointer (styles.css:142), but "clickable" is not added consistently. The "✏️" rename button (index.html:78) is `display:none` until JS shows it, so users may not discover it exists. The `◀` toggle button is positioned absolutely at top-right of the chat panel (styles.css:348-362) — it visually overlaps the conversation header.

### Terminology Clarity
**Rating: 🟠 Major**

Several labels use developer-centric or ambiguous terms:

| Label | Location | Issue |
|-------|----------|-------|
| "Harvest" | index.html:141, 225 | Agricultural metaphor; not self-describing |
| "ATS" | index.html:86-103 | Acronym; not expanded on first use |
| "Tagline" | index.html:208 | Ambiguous; means professional headline |
| "Experience Bullets" | index.html:205 | Jargon; "bullets" is internal CV-builder speak |
| "LLM" | index.html:53 | Developer acronym in header pill button |
| "Temperature" | index.html:586-588 | ML hyperparameter, not user vocabulary |
| "Base Delay (ms)" | index.html:634 | Engineering parameter in user-facing settings |
| "Cap Ms" → "Maximum Delay (ms)" | index.html:638-639 | Partially translated but still technical |
| "reentry_phase" | web_app.py:127 | Backend field name may surface in error states |
| "GENERATION" phase | state-manager.js:28 | Internal phase name; maps to "Layout Review" step — confusing because "generation" sounds like the output phase |
| "Finalise" | index.html:190 | British spelling inconsistent with rest of UI |
| "Screening" | index.html:135, 222 | Ambiguous — HR screening? ATS screening? Application screening questions? |

---

## Top 5 UX Issues (by Impact)

### 1. No Help System After Onboarding Dismissal (H10 — Critical)
Once the welcome modal is closed and "Don't show this again" is checked, users have no access to help documentation, no re-openable guide, no contextual tooltips, and no explanation of terminology. New users confronting "Harvest", "ATS", "Tagline", or "Temperature" after the first session have no recourse. **Evidence:** index.html:313-379 (only onboarding path); no help/? button exists anywhere in the main UI across all source files reviewed.

### 2. Dual Navigation Structure Creates Cognitive Overload (H4/H8/Cognitive Load — Major)
The 13-step workflow bar and the ~20-tab tab bar are two parallel navigation systems with inconsistent naming. The step "⬇️ Download" in the steps bar (index.html:131) maps to two tabs — "📄 Generated Files" and "⬇️ File Review" (index.html:217-218) — with different names and icons. The "customizations" step owns 10 tabs (ui-core.js:353) with no summary visible. Users must maintain a mental model of both systems simultaneously. **Evidence:** STAGE_TABS (ui-core.js:350-363), index.html:117-228.

### 3. Ambiguous and Developer-Centric Terminology (H2 — Major)
"Harvest", "ATS", "LLM", "Temperature", "Base Delay (ms)", "Experience Bullets", and "Tagline" appear in the primary UI without definition. The settings panel exposes 12 engineering parameters to end-users. This mismatches the mental model of a job-seeker using the tool (who is not a CV-builder developer). **Evidence:** index.html:53,141,205,208,586,634; settings panel (index.html:557-665).

### 4. Phase Action Buttons Shift Unpredictably; No Within-Phase Progress (H6/Workflow Momentum — Major)
The primary action buttons in the chat input area (index.html:182-190) change per phase, with no permanent visual anchor or count of completion. A user in the Customise phase reviewing 10 sub-tabs has no indication of which are required vs. optional, how many they have completed, or what the prerequisite for "Continue to Spell Check →" actually is. The button appears (or doesn't) based on backend phase state with no explanation. **Evidence:** index.html:182-190 (8 action buttons, at most one visible at a time); STAGE_TABS showing 10 tabs under "customizations" (ui-core.js:353).

### 5. Position Bar Overloaded; Header Bar Overloaded (H8 — Major)
The header bar contains 7 interactive elements in a 48px band. The position bar row below it contains up to 9 distinct elements (title, company, rename pencil, ATS badge, ATS summary, freshness chip, divider, Master CV button, ATS Report button, Job Analysis button). Before any analysis runs, most of these are either hidden or empty — on first use the interface appears broken (empty position title, no ATS badge). On a loaded session, all appear simultaneously at the top, consuming ~120px of vertical real estate before the actual workflow begins. **Evidence:** index.html:34-66 (header), index.html:69-107 (position bar); styles.css:83-141 (position bar layout).

---

**Key evidence references:**
- Workflow steps navigation: `web/index.html:117-143`
- Tab bar (20 tabs): `web/index.html:199-228`
- STAGE_TABS mapping (10 tabs under customizations): `web/ui-core.js:350-363`
- Phase-shifting action buttons: `web/index.html:182-190`
- LLM busy overlay: `web/index.html:151-159`, `web/styles.css:517-566`
- Settings panel (engineering params): `web/index.html:557-665`
- Header / position bar overload: `web/index.html:34-107`
- Welcome modal (only onboarding): `web/index.html:313-379`
- Phase names (developer-centric): `web/state-manager.js:23-33`, `scripts/utils/conversation_manager.py:40-49`
- Auto-analysis on load: `web/app.js:89-95`
- Error recovery paths: `web/ui-core.js:472-476`, `web/ui-core.js:638-646`
