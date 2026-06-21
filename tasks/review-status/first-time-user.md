<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review — US-F* Acceptance Criteria

**Persona:** A capable professional using CV Builder for the first time with no prior knowledge of its workflow or terminology.
**Review date:** 2026-06-18 19:00 ET (Cycle 4)
**Sources read:** web/index.html, web/app.js, web/session-manager.js, web/ui-core.js, web/state-manager.js, web/workflow-steps.js, web/job-input.js, web/layout-instruction.js, web/finalise.js, web/download-tab.js, scripts/utils/conversation_manager.py, scripts/routes/session_routes.py
**Cycle delta since cycle 3:**
- GAP-147 RESOLVED — `/api/setup/master-cv-status` returns `is_empty:true`; welcome modal shows distinct empty-skeleton warning (commit 0effd30)
- GAP-149 RESOLVED — content_warnings toast for generic-summary fallback
- GAP-113 RESOLVED — `window.prompt` replaced with inline rename widget
- GAP-75, GAP-123, GAP-148, GAP-152, GAP-153, GAP-154 marked resolved (commit c38e620 + c9bd18c)

---

## Application Evaluation

### US-F1: First-Run Orientation

**Story:** A first-time user should understand what the application does and how to begin without prior training.

---

#### AC-F1.1 — A new user can identify the first step and expected input without external help

**Rating:** ⚠️ Partial

**Evidence:**

The onboarding modal (`index.html:315–386`, rendered by `maybeShowWelcomeModal()` in `session-manager.js:158–181`) fires on every startup unless the user has stored `cv-builder-welcome-dismissed` in localStorage. It presents a clear 3-phase "How it works" summary and now correctly branches on the master CV state.

**Cycle 4 improvement — GAP-147 resolved:** `maybeShowWelcomeModal()` (`session-manager.js:158`) fetches `/api/setup/master-cv-status`. The endpoint (`session_routes.py:496–521`) returns `{"exists": true, "is_empty": true}` when `Master_CV_Data.json` exists but has no name, experience, skills, or education. The JS branches at `session-manager.js:171` (`else if (data.is_empty)`), calling `_setWelcomeSection('empty')`, which shows `#welcome-section-empty` (`index.html:350–354`) — a distinct amber warning: "⚠️ A blank master profile was created, but it has no content yet. Before starting a job application, go to the Master CV tab and fill in your work history, skills, and education."

This directly fixes the cycle 3 top issue: the empty skeleton is no longer presented as "ready."

**Remaining issues:**

1. The empty-skeleton footer reuses the "present" footer (`session-manager.js:134`: `section === 'present' || section === 'empty'`), which provides a "Get Started" button and a "Don't show this again" checkbox. There is no dedicated "Go to Master CV" CTA button in the footer for the empty case. The guidance to visit the Master CV tab is in the body text only — a user who skims and clicks "Get Started" may miss the instruction and proceed to the Job tab anyway.

2. The empty-skeleton warning body text has a double-nested `<strong>` tag (`index.html:352`): `<strong>Before starting a job application, go to the <strong>Master CV</strong> tab…</strong>` — the inner `<strong>` is redundant. This is cosmetic but worth noting.

3. After any modal dismissal the entry screen is dense. The header shows "LLM:" + "Loading…" + a ⚠ "Not ready" badge (`index.html:53–58`) before the user has any context for these controls. For a non-technical professional this reads as a system error, not a configuration option. (GAP-76, still open.)

4. The Job tab viewer shows a generic empty-state: "Select a tab to view content / Job description and analysis results will appear here" (`index.html:232–236`). No inline instruction says "paste a job description here."

---

#### AC-F1.2 — Stage names and action labels are understandable in context

**Rating:** ⚠️ Partial

**Evidence:**

The top workflow bar exposes all 13 stage labels simultaneously at page load, regardless of the user's current position:

```
📥 Job Input → 🔍 Analysis → ⚙️ Customise → ✏️ Rewrites → 🔤 Spell Check →
🎨 Layout Review → ⬇️ Download → 📩 Cover Letter → 📋 Screening →
🎤 Interview Prep → 🙏 Thank You → 🌾 Harvest
```

(`index.html:119–142`)

Several labels remain opaque to a first-time user:

- **"Customise"** — Cannot tell from the label that this means reviewing AI-recommended skills and experience selections.
- **"Rewrites"** — Ambiguous: does the user rewrite, or does the AI?
- **"Harvest"** — Domain jargon; the step `title` tooltip says "Harvest improvements" (hover only). No definition is visible otherwise.
- **"LLM:"** in the header — Technical acronym, never spelled out. ⚠ "Not ready" badge paired with "LLM:" reads as "the system is broken" to a non-technical user.

Steps that are not yet reachable are not visually hidden — only interactivity (`.clickable` class) is gated by phase. A first-time user sees the full pipeline from first load. (GAP-78 still open.)

---

#### AC-F1.3 — The first stage makes clear what data is needed and why

**Rating:** ⚠️ Partial

**Evidence:**

The Job tab shows a generic empty-state ("Select a tab to view content / Job description and analysis results will appear here", `index.html:232–236`) when no job description is present. No heading, instruction, or placeholder text within the viewer panel says "paste a job description to begin."

The load-job panel (`job-input.js:91–184`) renders the correct UI with a textarea placeholder "Paste the job description here…" and tabbed methods (paste / URL / file). However, `showLoadJobPanel()` is only called if `data.job_description_text` is falsy on status fetch (`job-input.js:78`). On first load in a fresh session, this triggers correctly, so the paste panel does appear. The empty-state string at `index.html:232` is the fallback for the split second before the tab content loads — but it is what a user sees if tab switching is rapid.

The "🔍 Analyze Job" button in the action row (`index.html:182`) is visible before any job description is provided; clicking it produces an error with no proactive tip adjacent to the button.

---

### US-F2: Progressive Disclosure Through the Workflow

**Story:** The UI should reveal decisions at the moment they become relevant, not all at once.

---

#### AC-F2.1 — The UI reveals the next set of decisions in a staged way rather than all at once

**Rating:** ⚠️ Partial

**Evidence:**

**Positive:** The secondary tab bar applies progressive disclosure correctly. `updateTabBarForStage()` (`ui-core.js:607–616`) hides all tabs except those in `STAGE_TABS[stage]`. At startup, only the `job` tab is shown. The primary action button row in the chat panel shows only one action at a time via `display:none` toggling (`index.html:183–190`).

**Negative:** The top workflow bar does not apply progressive disclosure — all 13 workflow steps are always rendered and visible (`index.html:119–142`). At DOMContentLoaded only `step-job` gets the `.clickable` class (`workflow-steps.js`), but the remaining 12 steps are still fully visible as static indicators. A first-time user sees the entire pipeline — Harvest, Thank You, Screening, Interview Prep, Cover Letter, Download — before completing the first step.

The Customise stage (`STAGE_TABS.customizations`, `ui-core.js:353`) still exposes 10 secondary tabs simultaneously (goals, questions, exp-review, ach-editor, skills-review, achievements-review, tagline-review, summary-review, publications-review, ats-score) with no visible ordering guide or intro text.

---

#### AC-F2.2 — Each stage communicates its purpose before demanding action

**Rating:** ⚠️ Partial

**Evidence:**

- **Job stage:** The load-job panel renders adequately once triggered (textarea, tabs, submit buttons), but the viewer empty-state shown before that loads does not explain the purpose.
- **Analysis stage:** `populateAnalysisTab()` renders a structured breakdown after the fact; no preamble explains what to expect before clicking Analyze.
- **Customise stage:** 10 tabs appear simultaneously with no ordering hint or introductory copy.
- **Layout Review stage:** The scope label (`layout-instruction.js:293`) explicitly states "Describe a layout change… Text content is finalised — content edits are not applied here." This is a strong positive: the stage communicates what is and is not permitted, preventing the user from attempting text edits in the wrong place. (GAP-125, resolved cycle 2.)
- **Finalise stage:** Reached with no recap of what was reviewed earlier in the pipeline. "Master CV Data" reappears without re-introduction.

---

#### AC-F2.3 — Stage transitions include enough feedback to keep a new user oriented

**Rating:** ✅ Pass

**Evidence:**

- The LLM busy overlay (`index.html:152–160`) shows a spinner, elapsed timer, and "Taking longer than usual" state badge during in-flight LLM calls.
- The conversation panel logs system messages at transitions: "Auto-analyzing loaded job description…" (`app.js:92`), "✅ Connection successful." (`app.js:72`).
- Phase changes trigger `stateManager.onPhaseChange()` → `updateWorkflowStepsClickable()`, unlocking the next step in the top bar.
- The `workflow-steps.js` step tooltip system provides contextual hints: "Current step", "Click to view", "Results may be outdated" depending on state.

This mechanism is adequate for users who read the chat panel. It relies on scanning conversation history to understand transitions, which is a mild drawback for first-time users, but the feedback is present and meaningful.

---

### US-F3: Confidence Before Finalisation

**Story:** A first-time user should know when application materials are ready, distinguish preview from final, and understand what is optional versus required.

---

#### AC-F3.1 — The system communicates whether key review steps are complete

**Rating:** ⚠️ Partial

**Evidence:**

- The `layout-freshness-chip` (`index.html:95`) displays "Layout current", "Layout outdated", or "Files outdated" based on `getLayoutFreshness()` from `state-manager.js`. It only appears after a preview has been generated (chip is `display:none` at load). Before any preview exists, the chip is invisible with no placeholder.
- The ATS score badge (`index.html:86–93`) is hidden until analysis completes.
- There is no visual checklist, progress indicator, or "N of M steps complete" summary visible at any time. GAP-14 (Workflow Progress Indicator) remains unimplemented.
- The workflow step bar does not visually distinguish "completed" from "locked/future" states with colour or iconography — the CSS classes `completed` and `active` exist (`workflow-steps.js:699–700`) but first-time users have no legend explaining their meaning.

---

#### AC-F3.2 — The relationship between generation, layout review, and finalisation is understandable

**Rating:** ❌ Fail

**Evidence:**

The multi-step generation pipeline (preview → confirm layout → final generate) is technically well-structured (`GENERATION_PHASES` in `state-manager.js:57–62`) but is not communicated to the user at any point in the visible UI:

1. The button label **"Done — Generate CV →"** (`index.html:186`) implies a single decisive action, but it triggers only a preview generation (layout-review HTML), not the final downloadable output.
2. **"✅ Confirm Layout"** (`layout-instruction.js:360`) appears without explanation of what changes after confirmation. A first-time user cannot tell what "confirming" does differently from the earlier generation step.
3. **"Generate Final Files"** (`layout-instruction.js:379`) is the button that triggers the actual downloadable output — but "final" is not explained anywhere in the UI prior to this button appearing.
4. The Generated Files tab heading reads "📄 Generated Files" and the body says "Your final CV files have been generated." (`final-generate.js`) but these are post-confirm files, not the layout-review preview the user just left. The word "final" appears without distinguishing it from the earlier preview state.
5. The Finalise tab (`finalise.js:68–116`) is reached with no recap of the review chain. "Master CV Data" reappears without re-introduction.

A first-time user cannot tell from the current UI that "Done — Generate CV →" produces a preview only, and that two more steps (Confirm Layout, Generate Final Files) are required before the CV is ready to send. (GAP-79, still open.)

---

#### AC-F3.3 — The final stage distinguishes clearly between archive/finalise actions and optional follow-on work

**Rating:** ⚠️ Partial

**Evidence:**

The Finalise tab contains:

- A status dropdown (Draft / Ready to send / Sent) — primary metadata for archiving.
- A notes textarea labeled "Notes"; first-time users have no indication this is optional.
- A "✅ Finalise & Archive" button — clear primary action.
- A `#harvest-section` div that becomes visible post-submit (`finalise.js:194`). The harvest section includes a "Skip" button (`finalise.js:301–304`), signaling the action is optional, but the section header just says "📥 Update Master CV Data" with no framing word like "optional" or "bonus step."

The Finalise tab entry (`tab-finalise`) is hidden at page load (`style="display:none"`, `index.html:219`). The workflow step bar has no "Finalise" step — the bar jumps from "⬇️ Download" to "📩 Cover Letter" (`index.html:131–133`). A user navigating by the step bar misses the Finalise/Archive step entirely.

Post-download steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) are presented in the step bar as sequential pipeline steps with no visual separator or "optional" label. A first-time user has no indication these are supplementary extras, not required parts of CV delivery.

---

## Generated Materials Evaluation

No generated CV, cover letter, DOCX, or PDF files were inspected in this cycle. This evaluation is limited to the application UI and workflow source code.

---

## Terminology Audit for First-Time Users

| Term in UI | First-time-user clarity | Issue |
| --- | --- | --- |
| Harvest | ❌ Opaque | No definition in context; step bar shows bare "Harvest"; tooltip "Harvest improvements" is hover-only |
| Customise | ⚠️ Partial | Could mean free-text edit; actually means reviewing AI recommendations |
| Rewrites | ⚠️ Partial | Ambiguous: does the user rewrite, or does the AI? |
| Layout Review | ⚠️ Partial | Scope label correctly constrains to layout-only (GAP-125 resolved); still not obviously distinct from Download |
| ATS | ⚠️ Partial | Acronym; expanded only as "ATS-optimised" in onboarding modal body — not defined inline |
| LLM | ❌ Opaque | Technical acronym in header ("LLM:") with no definition; ⚠ "Not ready" badge may alarm non-technical users (GAP-76 open) |
| Master CV Profile | ⚠️ Partial | Explained in onboarding; absent at Finalise tab where it reappears |
| Finalise & Archive | ✅ Clear | Verb pair is actionable and understandable |
| Analyze Job | ✅ Clear | Imperative verb; primary entry action |
| Generate Final Files | ⚠️ Partial | "Final" has no defined contrast with the prior "preview" — pipeline distinction unexplained (GAP-79 open) |

---

## Cycle 4 Delta: What Changed

| Item | Cycle 3 finding | Cycle 4 status |
| --- | --- | --- |
| GAP-147: Empty-skeleton shows "profile ready" | ❌ Fail — top issue | ✅ RESOLVED — `is_empty` flag returned; `welcome-section-empty` warning shown |
| `maybeShowWelcomeModal` branches on `is_empty` | Not present | ✅ Confirmed in `session-manager.js:171` |
| `welcome-section-empty` div exists | Not present | ✅ Confirmed in `index.html:350–354` |
| Empty-skeleton footer has "Go to Master CV" CTA | N/A | ⚠️ Gap: footer reuses "present" footer with generic "Get Started"; no dedicated CTA |
| GAP-149: Generic summary reaches PDF without warning | Open | ✅ RESOLVED — content_warnings toast in layout tab |
| GAP-113: window.prompt for rename | Open | ✅ RESOLVED — inline rename widget in header |
| AC-F3.2 Preview vs. final generation explained | ❌ Fail | Unchanged — ❌ Fail (GAP-79 open) |
| AC-F2.1 Workflow step bar progressive disclosure | ⚠️ Partial | Unchanged — all 13 steps visible at page load |
| AC-F1.3 Job tab empty-state inline instruction | ⚠️ Partial | Unchanged |
| GAP-14 Workflow progress indicator | Absent | Still absent |
| GAP-76 LLM provider prerequisite in welcome modal | Open | Still open |
| GAP-77 "Get Started" button navigates to Job tab | Open | Still open |
| GAP-78 CV jargon terms defined on first encounter | Open | Still open |

---

## Summary Table

| Story | Criterion | Rating | Key Finding |
| --- | --- | --- | --- |
| US-F1 | AC-F1.1 First step identification | ⚠️ Partial | GAP-147 resolved: empty-skeleton now shows warning not "ready" banner. Remaining: "Get Started" footer CTA has no "Go to Master CV" link; LLM ⚠ badge alarming at first load |
| US-F1 | AC-F1.2 Stage names understandable | ⚠️ Partial | "Harvest", "Customise", "Rewrites", "LLM:" remain opaque; all 13 steps visible at page load (GAP-78 open) |
| US-F1 | AC-F1.3 First stage data input clear | ⚠️ Partial | Load-job panel renders correctly; generic empty-state shown before tab content hydrates |
| US-F2 | AC-F2.1 Staged disclosure | ⚠️ Partial | Secondary tab bar staged correctly; top workflow bar still shows all 13 steps from first load |
| US-F2 | AC-F2.2 Stage purpose before action | ⚠️ Partial | Layout Review scope label improved (GAP-125); most stages still lack purpose preamble; Customise exposes 10 tabs at once |
| US-F2 | AC-F2.3 Transition feedback | ✅ Pass | LLM busy overlay, chat messages, and phase-based step unlocking provide adequate feedback |
| US-F3 | AC-F3.1 Review completion signaled | ⚠️ Partial | Freshness chip and ATS badge present but late to appear; no overall progress indicator (GAP-14) |
| US-F3 | AC-F3.2 Preview vs. final generation clear | ❌ Fail | "Done — Generate CV" implies single action; three-step preview/confirm/final pipeline invisible to user (GAP-79) |
| US-F3 | AC-F3.3 Optional vs. required at Finalise | ⚠️ Partial | Primary archive action clear; harvest framed as optional ("Skip" button present); post-download steps unlabeled as optional; Finalise absent from workflow step bar |

---

## Top Issues by Priority

1. **[US-F3 / AC-F3.2 — ❌ Fail — GAP-79 open]** The preview-vs-final generation pipeline is invisible. "Done — Generate CV →" produces a layout-review HTML preview, not the deliverable. Two more steps (Confirm Layout, Generate Final Files) are required, but nothing in the visible UI communicates this to a first-time user before they click the first button.

2. **[US-F1 / AC-F1.1 — ⚠️ Partial — New in cycle 4]** GAP-147 is resolved, but the empty-skeleton footer reuses the "present" footer. A user who skims the modal body and clicks "Get Started" without reading the warning will proceed directly to the Job tab with an empty profile. A dedicated "Open Master CV Editor" CTA button in the footer for the `empty` section would close this gap.

3. **[US-F1 / AC-F1.2 + US-F2 / AC-F2.1 — ⚠️ Partial — GAP-78 open]** All 13 workflow steps are visible from first page load. Interactivity is gated by phase but visibility is not. This is the primary progressive disclosure failure.

4. **[US-F3 / AC-F3.1 — ⚠️ Partial — GAP-14 open]** No workflow progress indicator. The step bar uses CSS classes (`completed`, `active`) that have no visual legend and no clear distinction from "not yet reached." A first-time user cannot see at a glance how many steps remain.

5. **[Terminology — ❌ Opaque — GAP-76 open]** "LLM:" in the header with a ⚠ "Not ready" badge is one of the first things a first-time user sees after dismissing the modal. For a non-technical professional this reads as a system error. The welcome modal does not mention LLM provider setup as a prerequisite.

6. **[US-F3 / AC-F3.3 — ⚠️ Partial]** The Finalise step is absent from the workflow step bar (bar jumps from Download → Cover Letter). Post-download optional steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) are presented as sequential pipeline steps with no "optional" labeling, suggesting to a first-time user they are all mandatory.

---

## Additional Story Gaps / Proposed Story Items

**Proposed US-F4 — Empty-Skeleton Onboarding CTA (new):** When `is_empty` is true, the welcome modal footer should include a dedicated "Open Master CV Editor" button that closes the modal and opens the Master CV modal (or navigates to the `master` tab). The current body-text-only instruction is insufficient for skim readers.

**Proposed US-F5 — LLM Provider Prerequisite Disclosed at Onboarding (maps to GAP-76):** The welcome modal should list the LLM provider configuration as a prerequisite alongside the Master CV requirement, with a link or button to the LLM Configuration Wizard.

---

## Evidence Summary

| File | Lines / Function | Finding |
| --- | --- | --- |
| `web/session-manager.js` | 158–181 `maybeShowWelcomeModal()` | Correctly fetches `/api/setup/master-cv-status`; branches on `data.is_empty` at line 171 ✅ |
| `web/session-manager.js` | 124–136 `_setWelcomeSection()` | Empty section shown with `welcome-section-empty`; footer reuses `welcome-footer-present` (no dedicated CTA) ⚠️ |
| `web/session-manager.js` | 187–194 `closeWelcomeModal()` | Closes overlay; no navigation to Job tab or Master CV editor — GAP-77 open ❌ |
| `web/index.html` | 350–354 `#welcome-section-empty` | Exists and contains appropriate amber warning ✅ |
| `web/index.html` | 343–347 `#welcome-section-present` | Shows only when `data.is_empty` is false ✅ |
| `scripts/routes/session_routes.py` | 496–521 | `is_empty` computed correctly from `personal_info.name`, `experience`, `skills`, `education` ✅ |
| `web/index.html` | 119–142 | All 13 workflow steps visible at page load — progressive disclosure gap ❌ |
| `web/ui-core.js` | 350–363 `STAGE_TABS` | Master CV tab absent from `job` stage tabs; accessible only via header modal button ⚠️ |
| `web/index.html` | 99–101 `#master-cv-bar-btn` | Always-visible "📚 Master CV" button in position bar — partially addresses GAP-41 ✅ |
| `web/finalise.js` | 68–116 `populateFinaliseTab()` | No recap of review chain; harvest shown with "Skip" button post-submit ⚠️ |
| `web/state-manager.js` | 57–62 `GENERATION_PHASES` | Three-phase pipeline well-structured in code but never exposed to user ❌ |
