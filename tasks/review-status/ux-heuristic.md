<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# UX Heuristic Evaluation

**Date:** 2026-06-18
**Evaluator perspective:** Senior UX and interaction designer
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js,
web/styles.css, web/rewrite-review.js, web/download-tab.js,
scripts/web_app.py, scripts/utils/conversation_manager.py

---

## Recent Improvements (noted before evaluation)

The following improvements have been implemented and are reflected in this evaluation:

1. **Persuasion gate hard-blocks submit.** `updateRewriteTally()` in `rewrite-review.js:373-381`
   disables the "Submit All Decisions" button when `!persuasionWarningsAcknowledged` and sets a
   tooltip explaining the block. A fallback confirm dialog (`rewrite-review.js:385-391`) is still
   shown if the gate is somehow bypassed.

2. **Overlap warnings surfaced at download.** `download-tab.js:330-339` renders a prominent amber
   callout listing all `date_overlap_warnings` with per-entry detail before the download grid, so
   users see employment timeline conflicts before submitting their application.

3. **Cover letter and screening in download tab.** `download-tab.js:51-58` recognises
   `CoverLetter_` and `Screening_Responses_` prefixes in the file list and renders them with
   appropriate descriptions inside the "File Review" tab, consolidating deliverables in one place.

---

## Nielsen's 10 Heuristics

| # | Heuristic | Rating | Evidence summary |
| --- | --------- | ------ | --------------- |
| H1 | Visibility of system status | 🟡 Minor | See detail below |
| H2 | Match between system and the real world | 🟠 Major | See detail below |
| H3 | User control and freedom | 🟡 Minor | See detail below |
| H4 | Consistency and standards | 🟠 Major | See detail below |
| H5 | Error prevention | 🟡 Minor | See detail below |
| H6 | Recognition rather than recall | 🟠 Major | See detail below |
| H7 | Flexibility and efficiency of use | 🟡 Minor | See detail below |
| H8 | Aesthetic and minimalist design | 🟠 Major | See detail below |
| H9 | Help users recognise, diagnose, and recover from errors | 🟡 Minor | See detail below |
| H10 | Help and documentation | 🔴 Critical | See detail below |

---

### H1 — Visibility of System Status 🟡 Minor

**Strengths:**
- LLM busy overlay (`index.html:152-159`, `styles.css:517-566`) shows a spinner, elapsed timer,
  a step label ("Reasoning…"), and a "Stop" button. It covers the chat panel during in-flight
  calls and degrades to a slow-state badge ("Taking longer than usual") at a configurable
  threshold.
- A secondary `#llm-status-bar` (`index.html:167-170`) with a thinking dot and elapsed counter
  exists inside the chat area — dual-layer but not harmful.
- The LLM status pill in the header (`index.html:54-60`) shows connectivity state (Not ready /
  Connected / Auth required / Rate limited) with colour-coded CSS classes (`styles.css:36-61`).
- The ATS score badge updates after key checkpoints (`stateManager.scheduleAtsRefresh`) and
  displays colour-graded scores (high/medium/low, `styles.css:102-104`).
- The layout freshness chip (`state-manager.js:120-178`) shows "Layout current", "Layout
  outdated", or "Files outdated" with a pulsing animation on stale state.
- Token count is shown in the conversation header (`index.html:163`).

**Weaknesses:**
- On initial page load, the workflow steps bar (`index.html:117-143`) renders all 13 steps
  unstyled. The JS phase-to-step mapping fires only after `fetchStatus()` resolves; on slow
  connections users see a blank, untimed workflow rail with no active step highlighted.
- The distinction between the two LLM busy mechanisms is invisible to the user but means
  implementation bugs could leave one showing and the other hidden — no single truth.
- Phase transitions between steps are not announced to screen readers; `aria-live="polite"` is
  on the document content area (`index.html:231`) but not on the workflow steps bar.
- Within a complex phase like "Customise" (10 sub-tabs), there is no count of how many
  decisions have been made vs. remain — the only progress indicator is the tally bar in the
  Rewrite phase (`rewrite-review.js:130-138`), not replicated in Experiences/Skills/Achievements.

---

### H2 — Match Between System and the Real World 🟠 Major

**Strengths:**
- Onboarding modal uses a 3-phase narrative (Build → Target → Harvest) that maps loosely to a
  real job-application mental model.
- File descriptions in the download tab use natural language: "ATS-optimised PDF — machine-
  readable for automated screening" (`download-tab.js:45`).

**Weaknesses:**
- **"Harvest"** (`index.html:141`, `tab:225`) is an agricultural metaphor. The concept — saving
  AI improvements back to the master profile — has no common term in job-seeking vocabulary.
  It is explained only in the welcome modal, which can be permanently dismissed.
- **"ATS"** appears in: the header badge, the position bar, the workflow steps, tabs, modals,
  and the download tab — never expanded on first use in the main UI. A first-time user sees
  "ATS 72" with no definition.
- **"LLM"** appears in the header pill ("LLM: Loading…", `index.html:53`) and throughout
  Settings ("LLM Defaults", "LLM Retry Policy", `index.html:568,630`). Job seekers do not
  think in terms of LLMs.
- **Settings parameters** — Temperature, Base Delay (ms), Maximum Delay (ms), Auto Retry
  Attempts (`index.html:583-653`) — are ML and networking engineering concepts. They appear
  in a user-facing Settings modal with no tooltip, help text, or plain-language explanation.
- **Tab labels** mix informal and technical: "Experience Bullets" (`index.html:205`) uses
  resume-builder jargon. "Tagline" (`index.html:208`) is ambiguous (it means professional
  headline). "Screening" (`index.html:222`) is ambiguous without the word "Questions".
- **Phase name "GENERATION"** in `state-manager.js:28` maps to the Layout Review step —
  confusing because the word "generation" implies output, not review.
- The action button label "Done — Generate CV →" (`index.html:186`) appears at the Spell Check
  step, not the step that actually generates the CV; the CV is generated at the layout step.

---

### H3 — User Control and Freedom 🟡 Minor

**Strengths:**
- ESC closes all open modals (`ui-core.js:525-529`).
- Background-click dismisses most modals (`ui-core.js:532-539`).
- "■ Stop" button aborts in-flight LLM calls (`index.html:159,169`).
- Session switcher is always accessible from the header.
- Iterative refinement panel in the download tab (`download-tab.js:211-230`) provides explicit
  back-navigation to Customisations, Rewrite, or Analysis with `backToPhase()`.
- "↩ Reconsider inclusion" link in each rewrite card (`rewrite-review.js:272`) lets users
  return to the customise step without losing their other decisions.

**Weaknesses:**
- No undo for submitted rewrite decisions. Once `submitRewriteDecisions()` (`rewrite-review.js:383`)
  is called, there is no "go back and change" path within the current session state; users must
  use `backToPhase('rewrite')` which re-enters the entire phase.
- Phase transitions in `conversation_manager.py:65-76` are gated with `_ALLOWED_TRANSITIONS`.
  The user-facing consequence of this constraint — being unable to jump from Download back to
  Analysis in a single click — is not communicated.
- Several workflow step pills lack `onclick` handlers or are not styled with `.clickable`
  (`styles.css:142`). Steps like "🔍 Analysis" and "⚙️ Customise" have onclick in the HTML
  (`index.html:122,124`) but only "📥 Job Input" has the `clickable` class — all others rely
  on `handleStepClick()` being wired to the element, but keyboard users cannot discover which
  pills are interactive without trying them.
- The chat input (`index.html:177`) is always enabled regardless of phase, allowing free-text
  messages at any time. While this is flexible, the consequence of sending arbitrary text
  mid-workflow is unpredictable and there is no "are you sure?" guard.

---

### H4 — Consistency and Standards 🟠 Major

**Strengths:**
- The pill button style is used consistently across the header (`styles.css:64-66`).
- Action buttons use a consistent `.action-btn` / `.action-btn.primary` pattern
  (`styles.css:583-589`).
- Modal structure (header / body / footer) is consistent across most modals.

**Weaknesses:**
- **Dual navigation with inconsistent naming.** The workflow steps bar uses one set of names
  ("⬇️ Download") while the tab bar has "📄 Generated Files" and "⬇️ File Review" for the
  same stage (`index.html:217-218`). The step "✏️ Rewrites" (`index.html:125`) maps to the
  tab "✏️ Rewrites" — same name — but "⚙️ Customise" (`index.html:123`) maps to 10
  differently-named tabs. No consistent visual grammar links step names to tab names.
- **Three different modal close patterns.** Some modals use `onclick="closeXyzModal()"`,
  some use `class="modal-close-btn"`, and some use bare `onclick="closeModal(id)"`. The
  settings modal close button lacks a class entirely (`index.html:562`).
- **Inline styles vs. CSS classes.** The Master CV modal overlay has 7 inline style
  attributes (`index.html:268`). Hundreds of `style=""` attributes throughout the HTML
  override or duplicate CSS rules, making visual updates brittle.
- **Action button placement shifts per phase.** The eight action buttons in the chat panel
  (`index.html:182-190`) appear and disappear as the workflow advances. No button has a fixed
  position — the visible one shifts horizontally in the flex row depending on which siblings
  are hidden. Users lose spatial memory of where to look.
- **British vs. American English.** "Finalise" (`index.html:190,219`), "Customise"
  (`index.html:123,353`) coexist with "Analyze" (`index.html:120`).
- **Emoji inconsistency.** Step bar and tab bar use different emojis for the same content:
  step "🔍 Analysis" → tab "🔍 Analysis" (consistent), but step "⚙️ Customise" →
  tabs include "📊 Experiences", "✏️ Experience Bullets", "🛠️ Skills", "🏆 Achievements",
  "🏷️ Tagline", "📝 Summary", "📄 Publications", "📊 ATS Score" — no unifying icon.

---

### H5 — Error Prevention 🟡 Minor

**Strengths:**
- The persuasion gate now **hard-blocks** the "Submit All Decisions" button until warnings are
  acknowledged (`rewrite-review.js:373-381`) — a deliberate improvement over a soft warning.
- A custom confirm dialog (`ui-core.js:372-418`) replaces `window.confirm()` for destructive
  actions, preventing accidental browser-level suppression.
- Session conflict detection fires on any 409 response (`ui-core.js:424-441`), preventing
  silent data overwrite across tabs.
- Date overlap warnings appear prominently before the download grid (`download-tab.js:330-339`)
  so users see timeline conflicts before submitting an application.

**Weaknesses:**
- The settings form (`index.html:570-656`) applies no input validation before `saveSettingsModal()`
  sends the payload. A non-numeric Temperature or an empty Provider field is silently
  transmitted to the backend.
- Auto-analysis fires on load when a prior session's job description is found
  (`app.js:89-95`), with no confirmation. A user opening a saved session to review it is
  surprised by an LLM call starting automatically.
- The free-text message input (`index.html:177`) has no phase-aware guard. At the Spell Check
  phase, typing "analyze job" and pressing Enter would send a user message to the backend that
  may trigger an out-of-sequence action. There is no visual indication of what the chat input
  will do at any given phase.
- The onboarding modal's "Create empty profile" button (`index.html:374`) triggers immediately
  on click with no summary of what will be created or where.

---

### H6 — Recognition Rather Than Recall 🟠 Major

**Strengths:**
- The workflow steps bar gives a persistent breadcrumb of all phases.
- Rewrite cards display inline word-level diffs (`rewrite-review.js:183-227`) so users
  can see exactly what changed without having to remember the original text.
- The ATS score badge is persistent in the position bar after analysis runs.
- The tally bar in the Rewrite panel counts accepted / rejected / pending decisions in
  real-time (`rewrite-review.js:354-380`).

**Weaknesses:**
- The tab bar shows up to ~20 tabs (`index.html:200-226`), many hidden at any given phase.
  Users cannot see or discover the full tab inventory; `updateTabBarForStage()` silently
  hides tabs with `display:none`. No disclosure pattern (e.g., a "more" indicator) is used.
- The `STAGE_TABS` mapping (`ui-core.js:350-363`) shows "customizations" owns 10 tabs.
  Nothing in the UI summarises this: a user clicking "⚙️ Customise" in the steps bar has
  no indication that 10 sub-tabs await, which ones are required, or how many they have visited.
- Action button labels are phase-specific but give no count or completion state. "Continue to
  Spell Check →" (`index.html:185`) appears without context about whether all customisation
  decisions have been made.
- The chat input placeholder (`index.html:177`) shows a single static example ("Type a message
  (e.g., 'analyze job')") regardless of phase. At the Layout Review phase, there is no hint
  that the user can type natural-language layout instructions.
- Workflow steps not yet reachable look identical to completed steps before CSS classes are
  applied (`upcoming` / `completed` / `active`, `styles.css:150-156`). On initial load
  all steps render in the default unstyled state.
- The LLM Configuration Wizard's step 3 shows a "quick list" of models and a hidden full
  catalog (`index.html:496-522`). Users see only filtered quick-list models by default; the
  existence of the full catalog requires clicking "Show Full Catalog" — this is a disclosure
  that is easy to miss.

---

### H7 — Flexibility and Efficiency of Use 🟡 Minor

**Strengths:**
- Tab bar supports keyboard navigation with Arrow Left/Right/Home/End (`ui-core.js:491-509`).
- Enter key sends the message input (`ui-core.js:513-523`).
- The rewrite panel has "✓ Accept All" and "✗ Reject All" bulk buttons
  (`rewrite-review.js:134-135`, `acceptAllRewrites` / `rejectAllRewrites`), giving power
  users a fast path through the rewrite phase.
- Session switcher allows multi-job management without reloading the page.
- The model selector wizard remembers recent models (`ui-core.js:768-774`).

**Weaknesses:**
- No keyboard shortcuts for triggering workflow actions (Analyze, Recommend, Generate) — these
  require mouse clicks on the action buttons below the chat input.
- No direct URL linkage to a specific session or tab — deep-linking is not supported; every
  session starts at the root URL and state is restored from localStorage.
- The "Show Full Catalog" model table is the only way to see all available models, but it
  requires a two-step interaction (click "Show Full Catalog", then use the search box).
  There is no typeahead or quick-filter on the initial quick-list.
- Power users who have already set up the LLM cannot skip the 4-step wizard — "Close Wizard"
  only appears at step 4 (`index.html:530`); intermediate steps force sequential progression.
- There is no way to save and reuse a custom layout instruction set across sessions.

---

### H8 — Aesthetic and Minimalist Design 🟠 Major

**Strengths:**
- The colour palette is consistent: slate blues for the header, white content areas, and
  semantic colours for status states (green/amber/red, `styles.css:36-61,102-121`).
- The workflow steps bar uses a clean pill pattern with minimal decoration.
- The LLM busy overlay is unobtrusive — a frosted-glass card over the chat panel.

**Weaknesses:**
- **Header bar is overloaded.** Seven interactive elements in ~48px: logo, app title, session
  name subtext, Sessions pill, New Session pill, LLM model/status pill (which itself contains
  the model name, an auth badge, a test badge, and a chevron), and Settings. This is dense
  enough to cause visual parsing failures on first encounter.
- **Position bar row is overloaded.** Contains: job title (large, 24px bold), company
  subtitle, rename pencil button, ATS score badge, ATS summary line, layout freshness chip,
  divider, Master CV button, ATS Report button, and Job Analysis button — 10 distinct
  elements on a single row (`index.html:69-107`, `styles.css:83-141`). Before analysis, most
  are hidden, making the empty bar look broken.
- **Settings exposes engineering internals.** The modal renders 12 technical parameters
  ("Temperature", "Base Delay (ms)", "Maximum Delay (ms)", "Auto Retry Attempts", "Source:
  environment variable", etc.) to end users. Each field shows a "Source: …" annotation
  useful only to developers (`index.html:570-665`).
- **Inline style proliferation.** Hundreds of `style=""` attributes throughout index.html
  (e.g., the Master CV modal has 7 inline styles on its overlay div, `index.html:268`).
  This creates visual inconsistency as inline styles override the structured CSS.
- **Tab bar visual weight.** With up to 20 tabs (most hidden), the visible tabs are often
  3–5 items with long emoji-prefixed labels that consume significant horizontal space. When
  the "customizations" stage is active, 10 tabs appear simultaneously — too many choices
  for a single visual row.
- **Download tab mixes concerns.** The download page renders: page count badge, ATS report
  table, overlap warnings, file download grid, persuasiveness check, refinement shortcuts,
  and a "Proceed to Cover Letter" button — 7 distinct concerns on one screen
  (`download-tab.js:295-358`).

---

### H9 — Help Users Recognise, Diagnose, and Recover from Errors 🟡 Minor

**Strengths:**
- LLM error types (auth, rate-limit, context-length) are caught in `web_app.py:66` and
  presumably return structured error responses the frontend surfaces as conversation messages.
- The `appendRetryMessage()` function (used in `rewrite-review.js:45,71`) adds a retry button
  inline in the conversation, giving users a direct recovery action after network failures.
- The session conflict dialog (`index.html:381-395`) provides three explicit options: "Load
  Different", "New Session", "Take Over".
- The download tab ATS error renders a clear callout: "Fix required: Some checks failed.
  Blocked formats are greyed out below." (`download-tab.js:133-139`).

**Weaknesses:**
- The initialisation error (`ui-core.js:475`) renders only the message: `"⚠️ Failed to
  initialize: ${error.message}"` with no recovery action button. Users are left with a blank
  application and no path forward.
- Tab load errors (`ui-core.js:641-645`) render inline red text (`"Error loading content:
  ${error.message}"`) with no retry affordance.
- The `#llm-busy-state-badge` shows "Taking longer than usual" after a delay threshold
  (`styles.css:536-537`) but provides no diagnosis (rate-limit? network? model overloaded?)
  or action beyond "Stop".
- Session conflict dialog gives three options ("Load Different", "New Session", "Take Over")
  with no explanation of consequences — "Take Over" especially sounds alarming without
  context. (`index.html:388-393`)
- ATS keyword failure message in the download tab (`download-tab.js:135-138`) says
  "re-run customisations to improve keyword coverage" but provides no button to do so;
  the refinement panel below is separate and not visually linked.

---

### H10 — Help and Documentation 🔴 Critical

**Weaknesses (only):**
- **No persistent help path exists.** The only onboarding is the welcome modal
  (`index.html:313-379`). Once dismissed with "Don't show this again", there is no "?" button,
  help link, glossary, or re-openable guide anywhere in the main UI. Searched all source files:
  no help-trigger element found.
- **Technical onboarding barrier.** The missing-profile variant of the welcome modal instructs
  users to "place your `Master_CV_Data.json` to the path shown above" — a raw filesystem path
  in a `<p>` tag (`index.html:354`). This requires technical comfort and is the first thing a
  new user sees.
- **No per-step guidance.** The 13-step workflow gives no indication, per step, of what inputs
  are required, what will be produced, how long the LLM call might take, or what decisions are
  expected. A user clicking "✏️ Rewrites" for the first time has no preview of what the rewrite
  review entails.
- **Technical settings have no tooltips.** "Temperature", "Base Delay (ms)", and "Auto Retry
  Attempts" (`index.html:583-653`) have no `title`, `aria-describedby`, or explanatory text.
- **Ambiguous terms are never explained in context.** "ATS", "LLM", "Harvest", "Tagline",
  and "Experience Bullets" appear throughout the main workflow with no inline definition,
  tooltip, or first-use expansion.
- **The welcome modal contains no quick-start checklist.** It explains the 3-phase model
  but gives no ordered task list ("Step 1: Fill in your work history. Step 2: …").

---

## Additional UX Dimensions

### Cognitive Load
**Rating: 🟠 Major**

Three simultaneous navigation layers: (1) the workflow steps bar with 13 steps
(`index.html:119-141`), (2) the tab bar with up to 20 tabs (`index.html:200-226`), and
(3) the chat/action area with phase-shifting primary buttons (`index.html:182-190`). Users
must track position across all three. The "customizations" stage alone owns 10 sub-tabs
(`ui-core.js:353`) with no summary. The conversation panel accumulates all messages
indefinitely with no grouping, pagination, or summary, requiring scroll to recover prior
decisions. The download tab renders 7 distinct content blocks on a single screen.

### Visual Hierarchy
**Rating: 🟡 Minor**

Dark header creates a strong top anchor. Semantic colour for status states is consistent.
However, the primary action button for the current workflow phase (e.g., "🔍 Analyze Job")
lives at the bottom of the chat panel, below the conversation history, and is pushed off-
screen as messages accumulate — the user's most important next action is least visible.
Primary and secondary action buttons are visually near-identical; only `.primary` adds blue
fill (`styles.css:587-588`), but size and weight are the same.

### Information Architecture
**Rating: 🟠 Major**

Two navigation systems exist with partially overlapping semantics. Clicking a workflow step
pill and clicking a tab both navigate to content, but they operate independently — clicking
"⚙️ Customise" in the step bar updates the active step highlight but the tab bar shows the
sub-tabs for customise; no default sub-tab is auto-selected. The "Master CV" tab
(`index.html:220`) is placed after Spell Check and Layout Review in the tab bar, despite being
a prerequisite to the whole workflow. The post-generation steps (Cover Letter → Screening →
Interview Prep → Thank You → Harvest) appear after Download in the steps bar with no visual
separator indicating they form a distinct, optional post-generation phase.

### Workflow Momentum
**Rating: 🟠 Major**

Auto-analysis on load (`app.js:89-95`) is the only autonomous forward momentum. All other
phase transitions require explicit user action with no progress indicator within the phase.
There is no indication of what "done" means for the Customise phase — which of the 10 sub-
tabs must be visited, which are optional, and what threshold triggers the appearance of
"Continue to Spell Check →". If an LLM call is aborted mid-phase, there is no UI guidance
on how to resume or retry just that phase.

### Feedback Loops
**Rating: 🟡 Minor**

Immediate feedback for LLM calls (spinner, elapsed timer, step label) is well-implemented.
The rewrite tally bar (`rewrite-review.js:130-138`) gives real-time accepted/rejected/pending
counts. ATS score updates dynamically after key checkpoints. However: after rewrite
submission, the user is auto-switched to the spell-check tab with a message "Rewrite
decisions recorded: N accepted, M rejected" (`rewrite-review.js:434`) — no summary of what
was changed. After saving settings, success feedback appears only within the modal, with no
change reflected in the main UI.

### Error Recovery
**Rating: 🟡 Minor**

`conflictRetryNow()` button (`index.html:112`) allows manual retry on session conflicts.
Welcome modal Reload button (`index.html:375`) handles missing master profile. The iterative
refinement panel in the download tab (`download-tab.js:211-230`) gives explicit back-
navigation buttons. However: there is no recovery path from a mid-workflow LLM failure that
partially completed a phase. If `analyzeJob()` partially runs and fails, the phase state may
be inconsistent with no user-visible path to retry or reset just that step. The initialisation
failure path (`ui-core.js:472-476`) leaves users with a broken UI and no action.

### Affordance Clarity
**Rating: 🟡 Minor**

Toggle-chat "◀" button uses a reasonable collapse icon. Header pill buttons have chevrons
indicating expandability. The rewrite card buttons (✓ Accept / ✎ Edit / ✗ Reject) are
clearly labelled. However: workflow step pills are visually identical whether or not they
are clickable — only some receive the `.clickable` class (`styles.css:142`). The rename
pencil (`index.html:78`) is `display:none` by default and appears only after JS reveals it;
users may not discover it. The toggle-chat button is positioned absolutely, overlapping the
conversation header at small widths.

### Terminology Clarity
**Rating: 🟠 Major**

| Label | Location | Issue |
| ----- | -------- | ----- |
| "Harvest" | index.html:141, 225 | Agricultural metaphor; not self-describing |
| "ATS" | index.html:86-103, tab:211 | Acronym; never expanded in main UI |
| "LLM" | index.html:53, settings modal | Developer term in user-facing UI |
| "Temperature" | index.html:586-588 | ML hyperparameter |
| "Base Delay (ms)" | index.html:634 | Engineering networking parameter |
| "Maximum Delay (ms)" | index.html:638-639 | Engineering networking parameter |
| "Experience Bullets" | index.html:205 | CV-builder internal jargon |
| "Tagline" | index.html:208 | Ambiguous; means professional headline |
| "Screening" | index.html:135, 222 | Ambiguous without "Questions" |
| "GENERATION" phase | state-manager.js:28 | Maps to Layout Review — confusing naming |
| "Finalise" | index.html:190 | British spelling, inconsistent with "Analyze" |
| "Done — Generate CV →" | index.html:186 | Appears at Spell Check, not at CV generation |

---

## Top 5 UX Issues (by Friction / Abandonment Risk)

### 1. No Help System After Onboarding Dismissal (H10 — Critical)

Once the welcome modal is closed with "Don't show this again", there is no re-openable
guide, help link, glossary, or contextual tooltip anywhere in the main UI. Users encountering
"Harvest", "ATS", "Tagline", "Temperature", or the 10-tab Customise phase mid-workflow have
no recourse. This is the single highest abandonment risk: a confused user with no recovery
path will leave.

**Evidence:** `index.html:313-379` is the only onboarding entry point; no help trigger
exists in any reviewed source file.

---

### 2. Dual Navigation Creates Orientation Failure (H4 / H8 / Cognitive Load — Major)

Thirteen workflow step pills and up to 20 tab-bar tabs operate in parallel, with inconsistent
naming (step "⬇️ Download" → tabs "📄 Generated Files" + "⬇️ File Review"), and no visual
grammar linking them. Clicking "⚙️ Customise" reveals 10 sub-tabs with no summary. Users
cannot map their location in the workflow to the content they are viewing.

**Evidence:** `STAGE_TABS` (`ui-core.js:350-363`); `index.html:117-228`;
`updateTabBarForStage()` (`ui-core.js:575-584`).

---

### 3. Primary Action Buttons Shift Unpredictably; No Within-Phase Completion Indicator (H6 / Workflow Momentum — Major)

The chat panel's primary action buttons appear and disappear per phase (`index.html:182-190`),
with no fixed spatial anchor. At the Customise phase — the most complex, with 10 sub-tabs
covering Experiences, Skills, Achievements, Tagline, Summary, Publications, and ATS Score —
there is no within-phase progress indicator, no list of required decisions, and no explanation
of what triggers the appearance of the next action button.

**Evidence:** `index.html:182-190`; `ui-core.js:353`; no completion counter found in
customisation tab handlers.

---

### 4. Developer-Centric Terminology Exposed Throughout the User Interface (H2 / Terminology — Major)

"LLM", "ATS", "Temperature", "Base Delay (ms)", "Harvest", "Experience Bullets", and
"Tagline" appear in primary UI surfaces without definition. The Settings modal renders 12
engineering parameters (including "Source: environment variable") as user-facing controls.
The onboarding modal's missing-profile path requires the user to locate and copy a JSON file
at a raw filesystem path. This mismatches the mental model of the target user: a job seeker
managing applications, not a developer configuring an AI pipeline.

**Evidence:** `index.html:53,141,205,208,583-653`; `styles.css:568-665`.

---

### 5. Download Tab Overloaded; Post-Download Flow Has No Visual Separation (H8 / IA — Major)

The "⬇️ File Review" tab renders: page count badge, full ATS validation table, overlap
warnings, file download grid (with per-format block reasons), bullet persuasiveness panel,
iterative refinement shortcuts, and "Proceed to Cover Letter" — 7 distinct concerns on one
screen (`download-tab.js:295-358`). Immediately after, the workflow steps bar continues with
Cover Letter → Screening → Interview Prep → Thank You → Harvest, with no visual grouping
or separator to indicate these are a post-generation phase rather than prerequisites.

**Evidence:** `download-tab.js:295-358`; `index.html:131-141`; `STAGE_TABS` in
`ui-core.js:356-362`.

---

## Key Evidence References

| Finding | Location |
| ------- | -------- |
| Workflow steps bar (13 steps) | `web/index.html:117-143` |
| Tab bar (up to 20 tabs) | `web/index.html:199-228` |
| STAGE_TABS (10 tabs under customizations) | `web/ui-core.js:350-363` |
| Phase-shifting action buttons | `web/index.html:182-190` |
| LLM busy overlay | `web/index.html:151-159`, `web/styles.css:517-566` |
| Settings panel (engineering params) | `web/index.html:557-665` |
| Header / position bar overload | `web/index.html:34-107` |
| Welcome modal (only onboarding) | `web/index.html:313-379` |
| Phase names (developer-centric) | `web/state-manager.js:23-33`, `scripts/utils/conversation_manager.py:40-49` |
| Auto-analysis on load | `web/app.js:89-95` |
| Persuasion gate hard-block (recent improvement) | `web/rewrite-review.js:373-381` |
| Overlap warnings at download (recent improvement) | `web/download-tab.js:330-339` |
| Cover letter / screening in download (recent improvement) | `web/download-tab.js:51-58` |
| Rewrite tally bar | `web/rewrite-review.js:130-138` |
| Iterative refinement panel | `web/download-tab.js:211-230` |
| Error recovery paths | `web/ui-core.js:472-476`, `web/ui-core.js:638-646` |
| Download tab 7-concern layout | `web/download-tab.js:295-358` |
