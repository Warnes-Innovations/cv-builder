<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review — US-F* Acceptance Criteria

**Persona:** A capable professional using CV Builder for the first time with no prior knowledge of its workflow or terminology.
**Review date:** 2026-06-18
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/session-manager.js, web/final-generate.js, web/finalise.js

---

## Application Evaluation

### US-F1: First-Run Orientation

**Story:** A first-time user should understand what the application does and how to begin without prior training.

---

#### AC-F1.1 — A new user can identify the first step and expected input without external help

**Rating:** ⚠️ Partial

**Evidence:**

The welcome/onboarding modal (`index.html` lines 315–378, rendered by `maybeShowWelcomeModal()` in `web/session-manager.js:155`) does fire on every startup unless explicitly dismissed. It shows a clear 3-phase "How it works" summary with numbered steps, and when the master profile exists, it provides an explicit next-action callout: "switch to the **Job** tab, provide a job description, and click **Analyze Job**" (`index.html:345`).

However, three gaps undercut the first-impression clarity:

1. **The modal "Don't show again" checkbox is in the present-CV variant only** (`index.html:367–370`). A user who dismisses it once will never see it again on any future session, even though its guidance is still useful for a new job application.

2. **After modal dismissal, the entry screen is dense.** The page header contains: an LLM status pill (showing "Not ready" or a warning icon by default, `index.html:54–59`), a model selector dropdown showing "Loading…" (`index.html:53`), a Settings gear, and a Sessions button — before the user has any context for what these controls mean. A first-time user who dismisses the modal lands in a screen where the most prominent affordance after the conversation chat is **"🔍 Analyze Job"** (`index.html:182`), which is useful, but the surrounding LLM status warning may cause confusion or alarm ("Not ready" / ⚠ icon).

3. **No inline prompt or placeholder in the Job tab viewer** hints at what to paste or type there when it is empty. The viewer shows a generic "Select a tab to view content / Job description and analysis results will appear here" (`index.html:233–236`). The Job tab is the active default, but the tab's empty-state message does not tell the user to paste a job description.

---

#### AC-F1.2 — Stage names and action labels are understandable in context

**Rating:** ⚠️ Partial

**Evidence:**

The top workflow bar exposes all 13 stage labels simultaneously regardless of the user's current position:

```text
📥 Job Input → 🔍 Analysis → ⚙️ Customise → ✏️ Rewrites → 🔤 Spell Check →
🎨 Layout Review → ⬇️ Download → 📩 Cover Letter → 📋 Screening →
🎤 Interview Prep → 🙏 Thank You → 🌾 Harvest
```

(`index.html` lines 119–142)

Several labels are opaque to a first-time user:

- **"Customise"** — without prior context, a user does not know this means reviewing AI-recommended skills and experience selections, not free-text editing.
- **"Rewrites"** — unclear whether the system rewrites the user's prose, or whether the user rewrites something.
- **"Harvest"** — the term is domain-specific jargon with no in-context explanation. It does not appear in the onboarding modal's three-phase summary step 3 header is "Harvest improvements" (`index.html:339`) but the workflow bar label omits "improvements", leaving it as bare "🌾 Harvest".
- **"Layout Review"** — marginally clearer but still not obviously distinct from "Download" to a new user.
- **"Spell Check"** — reasonable but positional confusion: it appears between Rewrites and Layout Review, implying a specific placement a user may not expect.

Steps that haven't been reached are not visually disabled at page load for first-time users (no greyed-out state is applied until `updateWorkflowStepsClickable()` is called by `stateManager.onPhaseChange`, `ui-core.js:1921`). On the very first load, `updateWorkflowStepsClickable('job')` is called (`ui-core.js:1917`), which marks only "step-job" as `.clickable`. But visually, all 13 step labels render with identical styling at page load before the JS phase listener updates them, so a user who scans the bar before JS runs sees an undifferentiated list.

---

#### AC-F1.3 — The first stage makes clear what data is needed and why

**Rating:** ⚠️ Partial

**Evidence:**

The Job tab viewer is empty on first load (the empty-state generic text `index.html:233`). There is no form label, no placeholder text in the viewer panel, and no visible instruction to paste a job description. The input placeholder in the chat area says `"Type a message (e.g., 'analyze job')"` (`index.html:177`), which implies a chat-command workflow — a first-time user may not realize they should also paste content into a tab.

The action button **"🔍 Analyze Job"** is visible and prominent (`index.html:182`), which is a positive signal. However, clicking it before pasting a job description would result in an error or no-op, and there is no proactive "paste your job description first" tip adjacent to the button.

The `populateJobTab()` function (referenced in `app.js:73`, `ui-core.js:601`) fills the job tab with the job description if one already exists in the session, but on a brand new session there is nothing to show.

---

### US-F2: Progressive Disclosure Through the Workflow

**Story:** UI should reveal decisions at the moment they become relevant, not all at once.

---

#### AC-F2.1 — The UI reveals the next set of decisions in a staged way rather than all at once

**Rating:** ⚠️ Partial

**Evidence:**

**Positive:** The secondary tab bar does progressively filter to only the tabs relevant to the current stage. `updateTabBarForStage()` (`ui-core.js:575–583`) hides all tabs except those in `STAGE_TABS[stage]`. At startup, only the `job` tab is shown (`ui-core.js:1916`). The action button row in the chat panel shows only one primary action at a time via `display:none` toggling (`index.html:183–190`).

**Negative:** The top workflow bar does NOT apply progressive disclosure — all 13 workflow steps are rendered in the DOM and visible simultaneously (`index.html:119–142`). The `clickable` class controls interactivity but not visibility. A first-time user therefore sees the full pipeline (Harvest, Thank You, Screening, Interview Prep, Cover Letter, Download) before they have completed, or even started, the first step.

This is the largest first-time-user failure mode identified in the story: "Too many tabs, controls, or special cases exposed before the user understands the current step."

---

#### AC-F2.2 — Each stage communicates its purpose before demanding action

**Rating:** ⚠️ Partial

**Evidence:**

- **Job stage:** The conversation area shows an auto-populated message or waits for user input. There is no in-panel heading or stage introduction text explaining what to do. The generic empty-state reads "Select a tab to view content" (`index.html:233`), not "Paste the job description you want to target."
- **Analysis stage:** `populateAnalysisTab()` renders a structured breakdown of the job. This is informative after the fact, but there is no preamble text telling the user what to expect before they click Analyze.
- **Customise stage:** The `STAGE_TABS.customizations` array (`ui-core.js:353`) reveals 10 tabs simultaneously (goals, questions, exp-review, ach-editor, skills-review, achievements-review, tagline-review, summary-review, publications-review, ats-score). A new user landing here faces 10 tabs with no visible order or guide.
- **Layout Review / finalise stages:** The `layout-instruction.js` does render a "Proceed to Finalise" button conditionally (`layout-instruction.js:241, 473`), indicating the stage communicates a forward action.

---

#### AC-F2.3 — Stage transitions include enough feedback to keep a new user oriented

**Rating:** ✅ Pass

**Evidence:**

- The LLM busy overlay (`index.html:152–160`) shows a spinner, elapsed timer ("0:00"), and a "Taking longer than usual" state badge during long operations. The `llm-busy-label` is updated by the backend phase.
- The conversation panel (`index.html:172`) logs system messages at each transition, e.g., "Auto-analyzing loaded job description..." (`app.js:92`), "✅ Connection successful." (`app.js:71`), and "✅ Files generated. You can now finalise your application." (`final-generate.js:167`).
- Phase changes trigger `stateManager.onPhaseChange()` → `updateWorkflowStepsClickable()` → the active step in the top bar gains the `.clickable` class indicating forward progress (`ui-core.js:1879–1897`).

The feedback mechanism exists and provides meaningful signals during transitions, though it relies heavily on reading the chat panel.

---

### US-F3: Confidence Before Finalisation

**Story:** A first-time user should know when their application materials are actually ready, distinguish preview from final, and understand what is optional versus required.

---

#### AC-F3.1 — The system communicates whether key review steps are complete

**Rating:** ⚠️ Partial

**Evidence:**

- The `layout-freshness-chip` (`index.html:95`) displays "Layout current", "Layout outdated", or "Files outdated" based on `getLayoutFreshnessFromState()` in `state-manager.js:120–177`. This chip is a meaningful completeness signal — but only appears after layout review has started (`state-manager.js:128`: `if (!previewAvailable) return { showChip: false, ... }`). Before any preview exists, the chip is hidden and nothing fills its place.
- The ATS score badge (`index.html:86–93`) is hidden until analysis is complete (`style="display:none"`). When it appears, it signals a key review artifact exists.
- There is no visual checklist, progress indicator, or "N of M steps complete" summary visible to the user at any time. GAP-14 (Workflow Progress Indicator) covers this gap.
- The "Spell Check" step produces no persistent visible badge or completion state in the workflow bar — the step bar steps do not change style to "completed" vs "current" vs "upcoming".

---

#### AC-F3.2 — The relationship between generation, layout review, and finalisation is understandable

**Rating:** ❌ Fail

**Evidence:**

The pipeline from user perspective is: Spell Check → "Done — Generate CV →" button → Layout Review → "✅ Confirm Layout" → Generated Files tab → "✅ Proceed to Download Review →" → File Review tab → "✅ Proceed to Finalise →" → Finalise tab.

This 3-phase generation flow (preview → confirm layout → final generate) is technically well-structured (`state-manager.js:57–62`, `GENERATION_PHASES` enum), but is not communicated to the user:

1. The button label **"Done — Generate CV →"** (`index.html:186`) suggests generating the CV is one action, but this actually triggers a preview generation, not a final output.
2. The "✅ Confirm Layout" button (`index.html:188`) is labeled with no explanation of what confirming layout does differently from the earlier generation step.
3. The Generated Files tab heading says "📄 Generated Files" and the body reads "Your final CV files have been generated. Download them below, then proceed to the Finalise step." (`final-generate.js:97–98`). The word "final" appears here, but there is no explanation that these are different from the preview files seen in Layout Review.
4. The Finalise tab (`finalise.js:68–116`) reaches the user without any summary of what was reviewed or confirmed earlier. It shows "Archive this application to your CV history, update the response library, and optionally write any improvements back to Master CV Data" (`finalise.js:70–72`) — this is the first time "Master CV Data" reappears since the onboarding modal, and the relationship to Harvest is mentioned parenthetically.

A first-time user cannot tell from the current UI that "Generate CV" produces a preview-for-layout-review, not a deliverable, and that a second generation step produces the actual downloadable files.

---

#### AC-F3.3 — The final stage distinguishes clearly between archive/finalise actions and optional follow-on work

**Rating:** ⚠️ Partial

**Evidence:**

The Finalise tab (`finalise.js:42–116`) contains:

- A status dropdown (Draft / Ready to send / Sent) — clearly required for archiving.
- A notes textarea — labeled only as "Notes" with a placeholder; a first-time user may not know this is optional.
- A "✅ Finalise & Archive" button — clear primary action.
- A hidden `#harvest-section` div that becomes visible after archiving (`finalise.js:112`, shown post-submit in `finaliseApplication()`).

**What is missing:** The Finalise tab does not explicitly label the Harvest section or the Cover Letter / Screening / Interview Prep / Thank You steps as optional follow-on work. The workflow bar presents them as sequential steps after Download, implying they are part of the main flow. There is no visual separator, optional badge, or "You're done — these are optional extras" banner.

The Finalise tab label in the tab bar is `style="display:none"` (`index.html:219`), meaning the `✅ Finalise` tab only appears when explicitly navigated to, not from the workflow step bar. The step bar has no "Finalise" entry — the bar goes directly from "⬇️ Download" to "📩 Cover Letter". This naming gap means a new user pressing through the workflow bar would expect to land on "Cover Letter" after Download, not on a Finalise/Archive step.

---

## Generated Materials Evaluation

No generated CV, cover letter, DOCX, or PDF files were inspected as part of this review. This evaluation is limited to the application UI and workflow source code as instructed.

---

## Terminology Audit for First-Time Users

| Term in UI | First-time-user clarity | Issue |
| --- | --- | --- |
| Harvest | ❌ Opaque | No definition given in context; the onboarding modal uses "Harvest improvements" but the step bar says only "Harvest" |
| Customise | ⚠️ Partial | Could mean free-text edit; actually means reviewing AI recommendations |
| Rewrites | ⚠️ Partial | Ambiguous — does the user rewrite, or does the AI rewrite? |
| Layout Review | ⚠️ Partial | Not clearly distinguished from "preview" vs "final generate" |
| ATS | ⚠️ Partial | Acronym never spelled out in any visible UI label (only in modal body: "ATS-optimised") |
| Finalise & Archive | ✅ Clear | Actionable verb pair; understandable |
| Analyze Job | ✅ Clear | Imperative verb; the primary entry action |
| LLM | ❌ Opaque | Technical acronym displayed in header ("LLM:") with no definition for a non-technical user |
| Master CV Profile | ⚠️ Partial | Described in onboarding but not explained at the point it reappears in workflow |

---

## Summary Table

| Story | Criterion | Rating | Key Finding |
| --- | --- | --- | --- |
| US-F1 | AC-F1.1 First step identification | ⚠️ Partial | Welcome modal is present and helpful; but post-dismissal entry screen shows LLM "Not ready" warning prominently and Job tab has no "paste job description here" prompt |
| US-F1 | AC-F1.2 Stage names understandable | ⚠️ Partial | "Harvest", "Customise", "Rewrites" are opaque without context; all 13 workflow steps visible simultaneously |
| US-F1 | AC-F1.3 First stage data input clear | ⚠️ Partial | No inline prompt in Job tab viewer; empty-state text is generic |
| US-F2 | AC-F2.1 Staged disclosure | ⚠️ Partial | Tab bar is staged; workflow step bar is not — shows all 13 steps on load |
| US-F2 | AC-F2.2 Stage purpose before action | ⚠️ Partial | Most stages lack an introductory heading or preamble; Customise stage reveals 10 tabs at once |
| US-F2 | AC-F2.3 Transition feedback | ✅ Pass | LLM busy overlay, chat panel messages, and phase-based step unlocking provide adequate feedback |
| US-F3 | AC-F3.1 Review completion signaled | ⚠️ Partial | Freshness chip and ATS badge exist but are hidden until late; no overall progress indicator (GAP-14) |
| US-F3 | AC-F3.2 Preview vs. final generation clear | ❌ Fail | "Done — Generate CV" is labeled as if it produces the deliverable; preview/confirm/final pipeline is invisible to the user |
| US-F3 | AC-F3.3 Optional vs. required at Finalise | ⚠️ Partial | Finalise tab has clear primary action; Harvest and post-download steps are not labeled optional; Finalise step is absent from the workflow step bar |

---

## Top Issues by Priority

1. **[US-F3 / AC-F3.2 — ❌ Fail]** The preview-vs-final generation pipeline is invisible. "Done — Generate CV →" does not produce the final output; a second generation is required after layout confirmation. No user-facing explanation distinguishes these two generation steps anywhere in the visible UI.

2. **[US-F1 / AC-F1.2 + US-F2 / AC-F2.1 — ⚠️ Partial]** All 13 workflow steps are visible in the top bar from the first page load, before the user has completed any step. This directly contradicts the progressive disclosure goal. Only interactivity (the `.clickable` class) is gated, not visibility.

3. **[US-F1 / AC-F1.3 — ⚠️ Partial]** The Job tab has no inline prompt or instruction when empty. The phrase "paste a job description" does not appear in the tab viewer, only in the chat input placeholder.

4. **[US-F3 / AC-F3.1 — ⚠️ Partial]** No workflow progress indicator exists (GAP-14). Steps never visually show "completed" vs "current" vs "locked" in a glanceable way.

5. **[Terminology — ❌ Opaque]** "LLM:" in the header and "Harvest" in the workflow bar are displayed without definition. For a non-technical professional using the tool for the first time, "LLM" in a header badge reads as system jargon that may signal the tool is "not working yet."
