<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# UX Heuristic Evaluation — Cycle 3

**Date:** 2026-06-18
**Evaluator:** Claude Code (source-code reading pass; no live session)
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js,
web/styles.css, web/review-table-base.js, web/layout-instruction.js,
scripts/web_app.py, scripts/utils/conversation_manager.py

---

## Cycle 3 Focus Areas

The following specific changes were assessed this cycle:

| Change | Assessment outcome |
| ------ | ------------------ |
| H5/H7 — tab keyboard access: tabindex + Enter/Space + roving tabindex in `switchTab` | Confirmed implemented — **full roving tabindex pattern** in `review-table-base.js:121-132`; ArrowLeft/Right/Home/End in `ui-core.js:524-540`. H7 upgrades from Minor to Good. |
| H4 — `confirmDialog` now has `role="dialog"`, aria, focus management | Confirmed — `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape cancels, backdrop dismiss all present. H4 modal consistency improves. |
| H2 — layout scope label now explicitly says "layout change only" | Confirmed — `layout-instruction.js:293` renders: "Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." |
| H10 — no persistent help path | Still absent — no help page, no documentation link, no contextual help panel found in any source file. |

---

## Nielsen's 10 Heuristics

| # | Heuristic | Rating | Key finding |
| - | --------- | ------ | ----------- |
| H1 | Visibility of system status | 🟡 Minor | Good busy overlay with spinner + elapsed timer + "Taking longer than usual" badge; LLM status pill in header with 8 distinct states. Gap: workflow step pills have no visual distinction between "locked/future" and "upcoming — clickable in theory." Only the `job` step has `class="clickable"` in HTML; other steps have `onclick` handlers but no visual affordance that they are interactive. |
| H2 | Match between system and the real world | 🟡 Minor | Layout scope label is now explicit and well-worded. Remaining issue: developer-facing terminology leaks through — "ATS DOCX", "copilot multiplier", "session", "phase", "generation state", "harvest". None of these match job-seeker mental models. The Settings modal exposes LLM temperature (0–2 scale) to end-users with no plain-language explanation. |
| H3 | User control and freedom | 🟠 Major | No undo/redo for any decision (experience include/exclude, skill selection, rewrite accept/reject). Once a rewrite decision is submitted, there is no "go back and change" path visible in the UI — users must know to re-click the workflow step. The chat collapse toggle (`◀`) has no discoverable affordance except hover; new users may collapse it accidentally and not know how to restore it. Escape closes all modals, which is correct. |
| H4 | Consistency and standards | 🟡 Minor | `confirmDialog` in `ui-core.js` is now fully accessible with role, aria, focus trap. However, there are two separate confirm-modal patterns in the codebase: the static `#confirm-modal-overlay` in HTML (used for some flows) and the dynamically-created `#confirm-dialog-overlay` (used for destructive actions). They have different visual styles and slightly different keyboard behavior. Tab-bar items use `<div role="tab">` correctly, but the top workflow step bar uses plain `<div class="step">` with inline `onclick` — no role, no keyboard access, inconsistent with the WCAG tablist pattern used below. |
| H5 | Error prevention | 🟡 Minor | Persuasion gate hard-blocks submit when warnings unacknowledged. Destructive actions (delete session, takeover) use `confirmDialog`. The ownership-conflict dialog is shown when a session is already open in another tab. Gap: the layout-freshness chip can show "Files outdated" without a clear path to regenerate — clicking it opens the Layout Review tab but no inline instruction explains what to do next to resolve the staleness. |
| H6 | Recognition rather than recall | 🟠 Major | 20 tabs exist in the tab bar but are contextually filtered to the active workflow stage — this is the right approach. However, the tab labels rely heavily on recall of what each stage contains ("Goals", "Questions", "Experiences", "Experience Bullets", "Achievements", "Tagline", "Summary", "Publications" are all shown simultaneously during Customise). No empty-state instructional content guides users on which tab to visit first within a stage. The main action button area shows one primary button at a time (good) but secondary options like "ATS Report" and "Job Analysis" are small unlabeled bar buttons that appear only after analysis — users who don't notice them lose access to reference information. |
| H7 | Flexibility and efficiency of use | 🟢 Good | Full keyboard tab navigation now implemented: Arrow keys, Home/End, Enter/Space all work correctly via `ui-core.js:515-541` with roving tabindex in `review-table-base.js:121-132`. Enter to send chat message works. LLM model "quick list" surfaces recently-used models. Session switcher has a recents strip. Power users can type commands directly into the chat input. |
| H8 | Aesthetic and minimalist design | 🟠 Major | The workflow step bar lists 13 steps in a horizontal row with `gap: 32px` and no overflow handling — on a 1280px screen this almost certainly overflows or wraps awkwardly. No `overflow-x: auto` or scroll arrows are present on the workflow bar (unlike the tab bar which has scroll buttons). The header packs: logo + title + session name + Sessions button + New Session button + LLM status pill + Settings button — 6+ elements competing for attention. The position bar row has further competing elements: position title, rename button, ATS badge, keyword counts, layout-freshness chip, divider, 3 action buttons. |
| H9 | Help users recognise, diagnose, and recover from errors | 🟡 Minor | API errors surface in the conversation panel as system messages (italic, gray). LLM connection failures show a "Connection failed" label with tooltip. The amber session-conflict banner is sticky and explains the problem. Gap: when the LLM request fails mid-workflow (e.g., timeout), the busy overlay disappears but the action button that triggered the request may not be re-enabled in all code paths, potentially leaving the user unable to retry without a page refresh. |
| H10 | Help and documentation | 🔴 Critical | No help link, no documentation URL, no contextual help panel, no keyboard-shortcut reference, and no tooltips on workflow steps (beyond `title` attributes which are inaccessible on touch devices). The welcome/onboarding modal appears every startup (until dismissed) and provides a 3-step overview, but disappears permanently once the user checks "Don't show this again" with no way to re-open it. There is no `?` or help button anywhere in the persistent UI. |

---

## Additional UX Dimensions

### Cognitive Load — 🟠 Major

The Customise stage exposes 10 sub-tabs simultaneously (Goals, Questions, Experiences, Experience Bullets, Skills, Achievements, Tagline, Summary, Publications, ATS Score). A first-time user has no ordering signal: all tabs appear equal, no sequence numbers, no "start here" affordance. The same issue appears in the main workflow: 13 steps but only "Job Input" is marked `class="clickable"` visually. This forces users to learn the ordering through trial and error or by reading the onboarding modal they may have dismissed.

### Visual Hierarchy — 🟡 Minor

Primary call-to-action buttons (one at a time in the chat panel) are styled correctly in blue. The workflow step bar and the tab bar serve different hierarchical levels but share similar visual weight (rounded pills, text labels, same color scheme). Users may not understand that the top bar is a macro-navigation and the lower bar is a micro-navigation within the active stage.

### Information Architecture — 🟠 Major

There are three navigation layers operating simultaneously:

1. The workflow step bar (13 macro stages, top)
2. The tab bar (up to 10 tabs per stage, middle)
3. Chat action buttons (one primary action per phase, left panel)

These three layers drive the same underlying state machine but are not visually linked. Clicking a workflow step changes the tab bar contents; clicking a tab bar item may not update the workflow step highlight. Users may not understand which layer is authoritative or what order to follow. The pattern of the tab bar updating to show stage-specific tabs (via `updateTabBarForStage`) is correct architecturally but invisible to users — the tab bar simply changes contents with no animation or explanation.

### Workflow Momentum — 🟡 Minor

The action buttons in the chat panel provide clear forward momentum (one primary button per phase: "Analyze Job" → "Recommend Customizations" → "Review Rewrites" → etc.). The auto-analyze behavior on startup is helpful for returning users. Gap: after completing spell check, the next button reads "Done — Generate CV →" which implies CV generation happens immediately; in fact, it triggers layout review first. The label mismatch may cause confusion when users see a layout review screen instead of a download.

### Feedback Loops — 🟢 Good

The LLM busy overlay provides a spinner, elapsed time counter, and a "Taking longer than usual" warning badge after a threshold. The ATS score badge in the position bar provides persistent score visibility. The layout-freshness chip pulses with CSS animation when stale. Toast notifications confirm saves. The session-conflict banner is sticky and immediately visible. These feedback mechanisms are well-implemented.

### Error Recovery — 🟡 Minor

The session trash/restore mechanism exists (visible in sessions modal). Rewrite decisions are not individually undoable but the whole rewrite phase can be re-entered by clicking the workflow step. Ownership-conflict resolution has three clear options (Load Different, New Session, Take Over). Gap: there is no "reset this phase" option exposed in the UI; users who want to restart spell check or layout review must know to click the step in the top workflow bar — no in-context recovery button exists.

### Affordance Clarity — 🟠 Major

Workflow step pills: only `step-job` has `class="clickable"` with visible pointer cursor and hover shadow. All other step pills have `onclick="handleStepClick(...)"` in HTML but no CSS affordance (no cursor: pointer, no hover effect) — they look unclickable but may behave as navigable depending on application state. This is inconsistent and will cause users to under-use the step navigation.

The chat collapse button (`◀`, top-right of chat panel) is blue and small — it does not look like a toggle, it looks like a navigation arrow. After collapse, the viewer panel expands but there is no visible indicator that the chat can be restored; the collapsed state shows a 50px strip with no label.

### Terminology Clarity — 🟠 Major

The application uses several terms that require domain knowledge:

- "ATS" (not expanded anywhere in the persistent UI — only in the welcome modal body)
- "Harvest" (the final workflow step — unusual metaphor with no explanation)
- "Tagline" vs "Professional Summary" (two separate tabs with overlapping concepts)
- "Experience Bullets" vs "Experiences" (two tabs whose distinction is non-obvious)
- "copilot multiplier" (in the model catalog table header)
- "Generation state" and "layout_confirmed" (internal state exposed in debug paths)
- Settings modal labels: "Base Delay (ms)", "Maximum Delay (ms)", "Auto Retry Attempts" — technical LLM retry policy exposed to end-users without plain-language description of what these control

---

## Top 5 UX Friction Points Most Likely to Cause Abandonment

1. **Opacity of the Customise stage's 10 sub-tabs (🔴 Abandonment risk)**
   New users entering the Customise stage see 10 unlabeled peer tabs with no ordering, no "start here" signal, and no explanation of what decisions are required vs optional. The most important work (experience selection, skills) is buried among tagline, publications, and ATS tabs. Users who are uncertain about what they are doing here will either skip tabs entirely (producing a suboptimal CV) or give up.

2. **No help path after onboarding dismissal (🔴 H10)**
   The only explanation of how the application works is in the welcome modal, which disappears permanently when dismissed. There is no help button, no documentation link, and no way to re-open the onboarding content. A user who forgets what "Harvest" means or why their files say "outdated" has nowhere to go for guidance except the chat input (which requires knowing what to type).

3. **Workflow step pills are not visually clickable (🟠 H5/Affordance)**
   The top workflow bar is intended as a navigation shortcut for returning users, but only the Job Input step shows visual click affordance. All other steps look static. Users who want to jump back to a previous step (e.g., to change a skills selection) will not discover that the step pills are clickable, and may think they need to start over.

4. **No undo for decisions within a phase (🟠 H3)**
   The experience, skills, achievements, and rewrite review flows all collect binary decisions (include/exclude, accept/reject). Once submitted, there is no visible undo. The path to change a decision requires clicking the workflow step, which triggers a full reload of that phase — not obvious. Power users will manage, but first-time users who submit incorrect decisions are likely to abandon rather than work out how to retry.

5. **Dual busy-state indicators that conflict (🟡 H1/H8)**
   The application has two overlapping loading indicators: the `#llm-busy-overlay` (full-panel overlay with spinner) and the `#llm-status-bar` (small banner with thinking dot and elapsed time). Both can be active simultaneously. The overlay is positioned over only the chat panel (left side), while the status bar sits above the chat. Users may find the dual indicators confusing and not know if the application is still processing or has completed a step.

---

## Verified Improvements (Changes Assessed This Cycle)

| Area | Status |
| ---- | ------ |
| Roving tabindex in tab bar (WCAG tablist) | CONFIRMED — fully implemented |
| Enter/Space to activate tab from keyboard | CONFIRMED — `ui-core.js:517-522` |
| Arrow key navigation in tab bar | CONFIRMED — `ui-core.js:523-540` |
| `confirmDialog` role + aria + focus trap | CONFIRMED — `ui-core.js:385-444` |
| Layout scope label "layout change only" | CONFIRMED — `layout-instruction.js:293` |
| No persistent help path | CONFIRMED ABSENT — critical gap remains |

---

## Summary Ratings Table

| Dimension | Rating |
| --------- | ------ |
| H1 Visibility of system status | 🟡 Minor |
| H2 Match system/real world | 🟡 Minor |
| H3 User control/freedom | 🟠 Major |
| H4 Consistency/standards | 🟡 Minor |
| H5 Error prevention | 🟡 Minor |
| H6 Recognition not recall | 🟠 Major |
| H7 Flexibility/efficiency | 🟢 Good |
| H8 Aesthetic/minimalist | 🟠 Major |
| H9 Error recovery | 🟡 Minor |
| H10 Help/documentation | 🔴 Critical |
| Cognitive load | 🟠 Major |
| Visual hierarchy | 🟡 Minor |
| Information architecture | 🟠 Major |
| Workflow momentum | 🟡 Minor |
| Feedback loops | 🟢 Good |
| Error recovery | 🟡 Minor |
| Affordance clarity | 🟠 Major |
| Terminology clarity | 🟠 Major |
