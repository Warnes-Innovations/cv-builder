<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review — US-F* Acceptance Criteria

**Persona:** A capable professional using CV Builder for the first time with no prior knowledge of its workflow or terminology.
**Review date:** 2026-06-18 (Cycle 3)
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/session-manager.js
**Cycle delta:** GAP-36 (`ensure_master_cv_exists`, commit 27871ec), GAP-34 (ARIA focus trap for `confirmDialog`, commit 72fc003), GAP-120 (keyboard tab navigation, commit 59ee58f), GAP-140 (aria-labels on icon-only controls, commit 5efc6b3) — all landed since cycle 2.

---

## Application Evaluation

### US-F1: First-Run Orientation

**Story:** A first-time user should understand what the application does and how to begin without prior training.

---

#### AC-F1.1 — A new user can identify the first step and expected input without external help

**Rating:** ⚠️ Partial

**Evidence:**

The onboarding modal (`index.html:315–378`, rendered by `maybeShowWelcomeModal()` in `session-manager.js:155`) fires on every startup unless the user has previously checked "Don't show again" and stored the `cv-builder-welcome-dismissed` key in localStorage. It presents a clear 3-phase "How it works" summary and, when a master CV exists, shows an explicit next-action callout: "switch to the **Job** tab, provide a job description, and click **Analyze Job**" (`index.html:345`).

**New in cycle 3:** `ensure_master_cv_exists()` (`scripts/utils/auth.py:181–193`) now creates a blank skeleton at startup in single-user mode (commit 27871ec). This means a true first-time user who has never created a profile will no longer see the "master CV missing" branch (`welcome-section-missing`, `index.html:350–360`) — the skeleton is silently created before the session is established, so `maybeShowWelcomeModal()` calls `/api/setup/master-cv-status`, receives `{"exists": true}`, and shows the "present" branch even though the profile is actually empty.

This creates a **new first-time-user gap**: the welcome modal's "present" branch (`index.html:343–347`) gives the instruction "Your master profile is ready. Next: switch to the Job tab…" — which is correct for returning users, but misleads a first-time user whose skeleton profile is completely empty (no name, no experience, no skills). The user follows the instruction, provides a job description, analyzes it, and only discovers at generation time that the resulting CV is hollow.

**Remaining issues from prior cycles (unchanged):**

- After modal dismissal the entry screen is dense. The header shows "LLM:" + "Loading…" + a ⚠ "Not ready" badge (`index.html:53–58`) before the user has any context for these controls.
- The Job tab viewer shows a generic empty-state: "Select a tab to view content / Job description and analysis results will appear here" (`index.html:232–236`). No inline instruction says "paste a job description here."

---

#### AC-F1.2 — Stage names and action labels are understandable in context

**Rating:** ⚠️ Partial

**Evidence:**

The top workflow bar exposes all 13 stage labels simultaneously at page load, regardless of the user's current position:

```text
📥 Job Input → 🔍 Analysis → ⚙️ Customise → ✏️ Rewrites → 🔤 Spell Check →
🎨 Layout Review → ⬇️ Download → 📩 Cover Letter → 📋 Screening →
🎤 Interview Prep → 🙏 Thank You → 🌾 Harvest
```

(`index.html:119–142`)

Several labels remain opaque to a first-time user:

- **"Customise"** — a user cannot tell from the label that this means reviewing AI-recommended skills and experience selections.
- **"Rewrites"** — ambiguous: does the user rewrite, or does the AI?
- **"Harvest"** — domain jargon; the workflow bar uses bare "🌾 Harvest" while the onboarding modal says "Harvest improvements" (`index.html:339`). The step's `title` tooltip ("Harvest improvements") is only visible on hover.
- **"LLM:"** in the header — technical acronym, never spelled out. For a non-technical professional the ⚠ "Not ready" badge paired with "LLM:" reads as "the system is broken."

Steps that are not yet reachable are not visually hidden — only the `.clickable` class is toggled (`updateWorkflowStepsClickable()`, `ui-core.js:1879–1935`). At DOMContentLoaded the call is `updateWorkflowStepsClickable('job')` (`ui-core.js:1955`), which marks only `step-job` as clickable; all 13 step divs are rendered and visible simultaneously.

---

#### AC-F1.3 — The first stage makes clear what data is needed and why

**Rating:** ⚠️ Partial

**Evidence:**

The Job tab viewer shows the generic empty-state when no job description has been provided (`index.html:232–236`). There is no inline label, placeholder, or instruction to paste a job description into the viewer panel. The chat input placeholder reads `"Type a message (e.g., 'analyze job')"` (`index.html:177`), which hints at chat commands but does not make clear that content should be pasted first.

The "🔍 Analyze Job" button is visible and prominent (`index.html:182`). Clicking it before providing a job description produces an error or no-op; there is no proactive tip adjacent to the button.

---

### US-F2: Progressive Disclosure Through the Workflow

**Story:** UI should reveal decisions at the moment they become relevant, not all at once.

---

#### AC-F2.1 — The UI reveals the next set of decisions in a staged way rather than all at once

**Rating:** ⚠️ Partial

**Evidence:**

**Positive:** The secondary tab bar applies progressive disclosure. `updateTabBarForStage()` (`ui-core.js:607–616`) hides all tabs except those in `STAGE_TABS[stage]`. At startup, only the `job` tab is shown (`ui-core.js:1954`). The primary action button row in the chat panel also shows only one action at a time via `display:none` toggling (`index.html:183–190`).

**Negative:** The top workflow bar does not apply progressive disclosure — all 13 workflow steps are always rendered and visible (`index.html:119–142`). Interactivity (the `.clickable` class) is gated by phase but visibility is not. A first-time user sees the full pipeline — Harvest, Thank You, Screening, Interview Prep, Cover Letter, Download — before they have completed the first step.

This is the largest first-time-user failure mode listed in the story: "Too many tabs, controls, or special cases exposed before the user understands the current step."

The Customise stage (`STAGE_TABS.customizations`, `ui-core.js:353`) still exposes 10 secondary tabs simultaneously (goals, questions, exp-review, ach-editor, skills-review, achievements-review, tagline-review, summary-review, publications-review, ats-score) with no visible ordering or guide.

---

#### AC-F2.2 — Each stage communicates its purpose before demanding action

**Rating:** ⚠️ Partial

**Evidence:**

- **Job stage:** No in-panel heading or instruction text. The generic empty-state does not tell the user what to paste.
- **Analysis stage:** `populateAnalysisTab()` renders a structured breakdown after the fact; no preamble explains what to expect before clicking Analyze.
- **Customise stage:** 10 tabs appear simultaneously; no ordering hint or intro copy.
- **Layout Review stage:** The scope label now explicitly states that text content is finalised and only layout changes apply (GAP-125, commit 72fc003). This is a **positive change** from cycle 2 — the stage communicates what is and is not permitted, reducing the risk of the user attempting text edits in the wrong place.
- **Finalise stage:** Still has no summary of what was reviewed or confirmed earlier in the pipeline.

---

#### AC-F2.3 — Stage transitions include enough feedback to keep a new user oriented

**Rating:** ✅ Pass

**Evidence:**

- The LLM busy overlay (`index.html:152–160`) shows a spinner, elapsed timer, and "Taking longer than usual" state badge.
- The conversation panel (`index.html:172`) logs system messages at transitions: "Auto-analyzing loaded job description..." (`app.js:92`), "✅ Connection successful." (`app.js:72`), "✅ Files generated." etc.
- Phase changes trigger `stateManager.onPhaseChange()` → `updateWorkflowStepsClickable()` (`ui-core.js:1957–1961`), unlocking the next step in the top bar.

This mechanism remains adequate for oriented users. Its reliance on reading the chat panel is a mild drawback for first-time users, but the feedback is present and meaningful.

---

### US-F3: Confidence Before Finalisation

**Story:** A first-time user should know when their application materials are actually ready, distinguish preview from final, and understand what is optional versus required.

---

#### AC-F3.1 — The system communicates whether key review steps are complete

**Rating:** ⚠️ Partial

**Evidence:**

- The `layout-freshness-chip` (`index.html:95`) displays "Layout current", "Layout outdated", or "Files outdated" based on `getLayoutFreshnessFromState()` (`state-manager.js:120–177`). It only appears after a preview has been generated (`state-manager.js:128`). Before any preview exists, the chip is hidden with no placeholder.
- The ATS score badge (`index.html:86–93`) is hidden until analysis completes (`style="display:none"`).
- There is no visual checklist, progress indicator, or "N of M steps complete" summary visible at any time. GAP-14 (Workflow Progress Indicator) covers this; it remains unimplemented.
- Workflow step bar step elements do not change to a "completed" visual state — there is no visual distinction between "completed," "current," and "not yet reached" states on the step bar itself.

---

#### AC-F3.2 — The relationship between generation, layout review, and finalisation is understandable

**Rating:** ❌ Fail

**Evidence:**

The multi-step generation pipeline (preview → confirm layout → final generate) is technically well-structured (`GENERATION_PHASES` in `state-manager.js:57–62`) but is not communicated to the user at any point in the visible UI:

1. The button label **"Done — Generate CV →"** (`index.html:186`) implies a single decisive action, but it triggers a preview generation only — not the final downloadable output.
2. **"✅ Confirm Layout"** (`index.html:188`) is not explained. A first-time user cannot tell what "confirming layout" does differently from the earlier generation step.
3. The Generated Files tab heading says "📄 Generated Files" and the body reads "Your final CV files have been generated." (`final-generate.js:97–98`), but these are the post-confirm files, not the preview. The word "final" appears here without distinguishing it from the preview state the user just left in Layout Review.
4. The Finalise tab (`finalise.js:68–116`) is reached with no recap of the review chain. "Master CV Data" reappears there without re-introduction.

A first-time user cannot tell from the current UI that "Generate CV" produces a preview, and that a second generation step produces the actual deliverable.

---

#### AC-F3.3 — The final stage distinguishes clearly between archive/finalise actions and optional follow-on work

**Rating:** ⚠️ Partial

**Evidence:**

The Finalise tab contains:

- A status dropdown (Draft / Ready to send / Sent) — primary metadata for archiving.
- A notes textarea — labeled only "Notes"; first-time users may not know this is optional.
- A "✅ Finalise & Archive" button — clear primary action.
- A `#harvest-section` div that becomes visible post-submit (`finalise.js:112`).

The Finalise tab entry (`tab-finalise`) is hidden at page load (`style="display:none"`, `index.html:219`). The workflow step bar has no "Finalise" step — the bar jumps from "⬇️ Download" directly to "📩 Cover Letter" (`index.html:131–133`). A user navigating via the step bar would expect Cover Letter to follow Download, missing the Finalise/Archive step entirely.

Post-download steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) are presented in the step bar as sequential pipeline steps with no visual separator or "optional" label. A first-time user has no indication that these are supplementary extras, not required parts of the CV delivery workflow.

---

## Generated Materials Evaluation

No generated CV, cover letter, DOCX, or PDF files were inspected. This evaluation is limited to the application UI and workflow source code.

---

## Terminology Audit for First-Time Users

| Term in UI | First-time-user clarity | Issue |
| --- | --- | --- |
| Harvest | ❌ Opaque | No definition given in context; step bar shows bare "Harvest"; tooltip says "Harvest improvements" (hover only) |
| Customise | ⚠️ Partial | Could mean free-text edit; actually means reviewing AI recommendations |
| Rewrites | ⚠️ Partial | Ambiguous — does the user rewrite, or does the AI? |
| Layout Review | ⚠️ Partial | Now correctly scoped to layout-only (GAP-125 fix); still not obviously distinct from Download to new users |
| ATS | ⚠️ Partial | Acronym; expanded only as "ATS-optimised" in onboarding modal body |
| LLM | ❌ Opaque | Technical acronym in header ("LLM:") with no definition; ⚠ "Not ready" badge may alarm non-technical users |
| Master CV Profile | ⚠️ Partial | Explained in onboarding; absent at the Finalise tab where it reappears |
| Finalise & Archive | ✅ Clear | Verb pair is actionable and understandable |
| Analyze Job | ✅ Clear | Imperative verb; primary entry action |

---

## Cycle 3 Delta: What Changed

| Item | Cycle 2 finding | Cycle 3 status |
| --- | --- | --- |
| `ensure_master_cv_exists()` (GAP-36) | Not present — FileNotFoundError blocked new users | Fixed: blank skeleton created on first run. **But** modal now shows "present" even for an empty profile (new gap) |
| `confirmDialog()` ARIA (GAP-34) | Focus trap absent | Fixed: role, aria-modal, focus trap, Escape cancel, focus restore all present |
| Tab keyboard navigation (GAP-120) | Keyboard tabs inaccessible | Fixed: roving tabindex + Enter/Space/Arrow keys in tab bar |
| aria-labels on icon-only controls (GAP-140) | Missing on toggle-chat, rename btn, modal close ×s | Fixed: all six close buttons + toggle-chat + rename-session-btn labeled |
| Layout Review scope label (GAP-125) | Phrasing allowed out-of-scope text edits | Fixed: label now explicitly states text is finalised |
| Preview vs. final generation (AC-F3.2) | ❌ Fail | Unchanged — ❌ Fail |
| Workflow step bar progressive disclosure | ⚠️ Partial | Unchanged — all 13 steps still visible at page load |
| Job tab empty-state | ⚠️ Partial | Unchanged — no "paste job description here" inline instruction |
| GAP-14 (Workflow Progress Indicator) | Absent | Still absent |

---

## Summary Table

| Story | Criterion | Rating | Key Finding |
| --- | --- | --- | --- |
| US-F1 | AC-F1.1 First step identification | ⚠️ Partial | Welcome modal helpful but empty-profile-skeleton now shown as "ready" — may mislead first-time user into proceeding with a hollow profile |
| US-F1 | AC-F1.2 Stage names understandable | ⚠️ Partial | "Harvest", "Customise", "Rewrites", "LLM:" remain opaque; all 13 steps visible at page load |
| US-F1 | AC-F1.3 First stage data input clear | ⚠️ Partial | No inline instruction in Job tab viewer; empty-state is generic |
| US-F2 | AC-F2.1 Staged disclosure | ⚠️ Partial | Secondary tab bar is staged; top workflow bar is not — shows all 13 steps from first load |
| US-F2 | AC-F2.2 Stage purpose before action | ⚠️ Partial | Layout Review scope label improved; most other stages still lack purpose preamble; Customise stage exposes 10 tabs at once |
| US-F2 | AC-F2.3 Transition feedback | ✅ Pass | LLM busy overlay, chat messages, and phase-based step unlocking provide adequate feedback |
| US-F3 | AC-F3.1 Review completion signaled | ⚠️ Partial | Freshness chip and ATS badge present but late to appear; no overall progress indicator (GAP-14) |
| US-F3 | AC-F3.2 Preview vs. final generation clear | ❌ Fail | "Done — Generate CV" button label implies a single step; three-step preview/confirm/final pipeline invisible to user |
| US-F3 | AC-F3.3 Optional vs. required at Finalise | ⚠️ Partial | Primary archive action clear; Harvest and post-download steps not labeled optional; Finalise step absent from workflow step bar |

---

## Top Issues by Priority

1. **[US-F3 / AC-F3.2 — ❌ Fail]** The preview-vs-final generation pipeline is invisible. "Done — Generate CV →" produces a layout-review preview, not the deliverable; a second confirmation and generation step are required. Nothing in the visible UI communicates this distinction to a first-time user.

2. **[US-F1 / AC-F1.1 — ⚠️ Partial — NEW in cycle 3]** `ensure_master_cv_exists()` now silently creates a blank skeleton on first launch, so the welcome modal immediately shows the "present" variant and instructs the user to proceed to the Job tab. A brand-new user who has not filled in their profile will follow this instruction and complete the workflow only to generate a CV with empty personal info, no experience, and no skills. The onboarding modal has no warning that the skeleton is empty and must be populated before generating a meaningful CV.

3. **[US-F1 / AC-F1.2 + US-F2 / AC-F2.1 — ⚠️ Partial]** All 13 workflow steps are visible in the top bar from the first page load. Interactivity is gated by phase but visibility is not. This directly contradicts the progressive disclosure goal.

4. **[US-F1 / AC-F1.3 — ⚠️ Partial]** The Job tab has no inline instruction when empty. "Paste a job description" does not appear in the viewer panel — only in the chat input placeholder as an example command.

5. **[US-F3 / AC-F3.1 — ⚠️ Partial]** No workflow progress indicator (GAP-14). Steps never visually distinguish "completed" from "current" from "locked" in the top step bar.

6. **[Terminology — ❌ Opaque]** "LLM:" in the header with a ⚠ "Not ready" badge is the first thing a first-time user sees after dismissing the modal. For a non-technical professional this reads as a system error, not a configuration option.
