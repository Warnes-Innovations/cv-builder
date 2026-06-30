<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review Status

**Last Updated:** 2026-06-30 ET (source-first review)

**Executive Summary:** The onboarding modal (US-F1) is well implemented and covers the three main setup states. Progressive disclosure through the workflow (US-F2) is structurally sound — the tab bar and action buttons reveal in step with backend phase — but the workflow nav exposes all 12 steps simultaneously at all times, which is cognitively overloading for a new user who has not yet analyzed a job. The finalisation / confidence stage (US-F3) has the most significant gaps: the distinction between preview, confirmed layout, and final files is clear to developers reading the code but is not communicated plainly to users, and the post-generation steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) are presented with no indication of which are optional.

---

## Application Evaluation

### US-F1: First-Run Orientation

**Criterion 1 — Entry screen explains first required action clearly.**
✅ Pass — `session-manager.js:175–200` (`maybeShowWelcomeModal`) fires on every startup and presents a three-state modal: (a) master profile present → green callout "Switch to the Job tab, provide a job description, and click Analyze Job"; (b) empty skeleton → amber callout directing user to Master CV tab; (c) file missing → amber callout with file path and two recovery options. The modal shows immediately before any workflow content loads (`app.js:57`). The "Get Started" CTA (`index.html:390`) switches to the Job tab on dismissal.

**Criterion 2 — Key workflow concepts are understandable without domain-specific prior knowledge.**
⚠️ Partial — The onboarding modal body (`index.html:329–344`) describes the three phases in plain language (Build profile / Target a job / Harvest improvements). However several terms in the workflow nav (`index.html:118–143`) appear without explanation: "Rewrites", "Spell Check", "Layout Review", "Harvest". "Rewrites" and "Harvest" in particular carry non-obvious meaning in this context. The position-bar area exposes "ATS" as a label (`index.html:88–91`) without defining it — though the tooltip says "ATS match score", "ATS" itself is never explained to first-time users.

**Criterion 3 — First stage makes clear what data is needed and why.**
✅ Pass — When no job is loaded, `populateJobTab()` (`job-input.js:78`) immediately renders the "Add Job Description" panel with three clearly labelled input methods (Paste Text / From URL / Upload File). A character-count hint and Submit button give clear affordance. The LLM status pill in the header (`index.html:54–61`) warns when no provider is configured.

**Failure mode guard — "Terms appearing without context":**
⚠️ Partial — "Rewrites", "Layout Review", and "Harvest" appear in the workflow nav as standalone labels from the first page load, before the user has any frame of reference. The onboarding modal does explain "Harvest" in step 3, and "Layout Review" is self-explanatory, but "Rewrites" is not explained anywhere a new user encounters it before reaching that stage.

**Failure mode guard — "Complex screen with no clear primary action":**
✅ Pass — On first load the tab bar is restricted to the Job tab (`ui-core.js:2008`), and only the "Analyze Job" primary button is visible (`index.html:186`). The onboarding modal further guides the user before this is reached.

---

### US-F2: Progressive Disclosure Through the Workflow

**Criterion 1 — UI reveals next decisions in a staged way.**
⚠️ Partial — The **tab bar** is correctly staged: `updateTabBarForStage(stage)` (`ui-core.js:619–628`) shows only the tabs for the current backend phase. The **action buttons** in the chat panel are individually shown/hidden per phase (all start hidden except "Analyze Job"). However, the **workflow nav** (`index.html:118–143`) shows all 12 steps (Job Input → Analysis → Customise → Rewrites → Spell Check → Layout Review → Download → Cover Letter → Screening → Interview Prep → Thank You → Harvest) simultaneously with no visual suppression of future steps — only `upcoming` CSS styling and click-blocking after the current phase. A first-time user sees twelve steps on page load, which contradicts the goal of staged revelation.

**Criterion 2 — Each stage communicates its purpose before demanding action.**
⚠️ Partial — The chat panel provides conversational context from the LLM before each primary button becomes active, which is effective. However the viewer area's empty-state fallback (`index.html:236–240`) reads "Select a tab to view content / Job description and analysis results will appear here" — this is generic and does not tell a new user what to do or why. At the Analysis stage the tab content renders structured data (role card, sections), which is helpful. At the Customise stage, the Questions tab is labeled "Questions" (`index.html:208`) but its purpose (answering the AI's clarifying questions before recommending customisations) is not communicated visually without reading the conversation.

**Criterion 3 — Transition from one stage to the next feels predictable.**
✅ Pass — Each stage has exactly one primary action button that advances the workflow, and the button label describes the transition (e.g. "Continue to Spell Check →", "Generate Preview →", "Open Layout Review →", `index.html:189–193`). The workflow nav step highlighting updates automatically via `stateManager.onPhaseChange` → `updateWorkflowStepsClickable` (`ui-core.js:2012–2015`). The screen-reader live region (`index.html:146–147`) announces stage changes accessibly.

**Failure mode guard — "Too many tabs, controls, or special cases at once":**
⚠️ Partial — As noted above, the workflow nav displays all 12 steps at all times. While the tab bar itself is correctly staged, the sticky top-level nav gives the visual impression of a 12-stage pipeline before the user has taken any action. At the Customise stage specifically, the tab bar reveals 10 tabs simultaneously (Goals, Questions, Experiences, Experience Bullets, Skills, Achievements, Tagline, Summary, Publications, ATS Score — `ui-core.js:353`), all of which are immediately visible. A first-time user has no signal about which to look at first or which are optional.

**Failure mode guard — "Major stage transitions with insufficient explanation":**
⚠️ Partial — Transitions driven by the primary action button are predictable. However the transition from Spell Check → Layout Review involves clicking "Generate Preview →" (`index.html:190`) which triggers a background generation process. The LLM busy overlay appears (`index.html:155–164`), which is good. But once generation completes and the user is shown "Open Layout Review →" (`index.html:191`), there is no explanatory text telling a first-time user what layout review means or what decisions they will face there.

---

### US-F3: Confidence Before Finalisation

**Criterion 1 — System communicates whether key review steps are complete.**
⚠️ Partial — The layout freshness chip (`index.html:96`) communicates "Layout current / Layout outdated / Files outdated" states clearly once a preview has been generated. The ATS score badge (`index.html:87–95`) gives an objective measure after analysis. However there is no aggregate checklist or readiness indicator showing which of the review stages (Rewrites, Spell Check, Layout) have been completed and which remain. A first-time user must infer completion from the conversation history or the action button availability.

**Criterion 2 — Relationship between generation, layout review, and finalisation is understandable.**
❌ Fail — The generation pipeline has three distinct stages (preview → confirm layout → final generation) but the labels used in the UI conflate them for a new user:

- "Generate Preview →" (`index.html:190`; spell-btn action) — correct label for what it does
- "Open Layout Review →" (`index.html:191`) — shown after preview, purpose not explained inline
- "Confirm Layout" (`index.html:192`) — confirms the layout, which then triggers final generation; a new user does not know that clicking this triggers another generation pass
- "Continue to File Review →" (`index.html:193`) — appears after final generation; "File Review" is not defined
- "Package Application Files" (`index.html:194`) — the purpose of this action is opaque; it appears to be a finalisation/archive step but the label does not communicate what happens or whether this is required

There is no explanatory tooltip, inline help text, or modal at any of these four transitions to explain what each step does or what the user is committing to.

**Criterion 3 — Final stage distinguishes clearly between optional versus required actions.**
⚠️ Partial — The workflow nav shows Download as a separate step from Cover Letter, Screening, Interview Prep, Thank You, and Harvest. However nothing in the UI marks these post-download steps as optional. They all appear as equivalent steps in the linear nav. The onboarding modal mentions "generate a tailored cover letter" in the "Target a job" step description (`index.html:338`), implying it is part of the core flow, but Cover Letter and the remaining steps (Screening, Interview Prep, Thank You, Harvest) are never identified as optional extensions. A first-time user who has downloaded their CV files may not know they can stop at the Download step.

**Failure mode guard — "Mistaking preview generation for final completion":**
❌ Fail — There is a real risk here. After "Generate Preview →" is clicked, the user arrives at Layout Review with an iframe preview of their CV. The action button becomes "Confirm Layout". There is no inline text at this point saying "This is a draft preview — your final downloadable files are generated after you confirm the layout." The layout freshness chip provides a signal, but only once the user has confirmed and returned to a stale state. On first encounter, the preview looks like a finished document.

**Failure mode guard — "Optional post-generation actions looking mandatory":**
⚠️ Partial — The post-layout steps (Cover Letter through Harvest) look mandatory because they are presented in a sequential linear nav without any visual or textual distinction between required and optional. The Harvest step in particular ("🌾 Harvest") is shown with the same visual weight as the Download step.

---

## Generated Materials Evaluation

The user story does not include criteria for evaluating generated CV/cover letter content quality; the story scope is limited to the application UI experience. No generated materials were evaluated in this review.

---

## Additional Story Gaps / Proposed Story Items

**G1 — Workflow nav cognitive load at first load**
All 12 steps are visible before the user has taken any action. Consider collapsing the post-layout steps behind a disclosure or only revealing the immediately next step. Alternatively, visually group the nav into: "Core workflow" (steps 1–7) and "Optional follow-on" (steps 8–12).

**G2 — Customise stage tab count**
At the Customise phase, 10 tabs appear simultaneously. A first-time user needs signposting about which tab is the primary action surface and which are supplementary. The Questions tab should be highlighted as the first step, not presented as one of ten equal choices.

**G3 — Inline contextual help at generation transitions**
The four action buttons in the generation pipeline (Generate Preview / Open Layout Review / Confirm Layout / Continue to File Review / Package Application Files) each represent a distinct commitment, but none carry tooltip or inline explanatory text. A single sentence of inline help at each transition would significantly reduce first-time confusion.

**G4 — Preview vs. final distinction**
No UI element at the Layout Review stage makes it explicit that the iframe is a draft preview and that clicking "Confirm Layout" triggers final file generation. This is the most likely point for a first-time user to feel uncertain about what they are committing to.

**G5 — Post-download steps optionality**
The Cover Letter, Screening, Interview Prep, Thank You, and Harvest steps are never labelled as optional. A simple "(optional)" parenthetical in the nav, or a visual grouping separator after Download, would remove ambiguity.

**G6 — "ATS" acronym unexplained**
"ATS" appears in the position bar badge, ATS Report button, and ATS Score tab without being spelled out or defined anywhere visible in the UI. A tooltip reading "Applicant Tracking System — how well your CV matches the job keywords" on the badge would serve new users without cluttering the interface.

**G7 — "Harvest" terminology**
"Harvest" is used in the onboarding modal body and the workflow nav but is not a standard job-search term. A subtitle or tooltip such as "Save improvements back to your master profile" would disambiguate without renaming the step.

---

---

## Recent Changes Verification

### GAP-247: "? Help" button in header reopens onboarding guide

**Claimed:** A "? Help" button now appears in the header that calls `showWelcomeModal()`, allowing the onboarding guide to be reopened even after dismissal.

✅ **Verified** — `web/index.html:63–66` contains:

```html
<button id="help-btn" onclick="showWelcomeModal()"
  class="header-pill-btn"
  title="Reopen the getting-started guide"
  aria-label="Help — reopen getting started guide">? Help</button>
```

The button is positioned after the LLM selector in the header (`index.html:44–70`), making it persistently accessible at all times. `showWelcomeModal()` is defined at `session-manager.js:219–242` — it re-fetches master CV status, shows the appropriate modal section, and opens the focus trap. It ignores the `_WELCOME_DISMISSED_KEY` localStorage flag (unlike `maybeShowWelcomeModal`), so it always opens regardless of prior dismissal. The function is exported at `session-manager.js:968–969` and aliased on `globalThis` via `bundle.js:7504`.

### GAP-251: Brand name consistently "CV Builder"

**Claimed:** Brand name is now consistently "CV Builder" in the h1 header, document.title, and onboarding modal.

✅ **Verified** — Three locations confirmed consistent:

- `web/index.html:13`: `<title>CV Builder — Professional Web UI</title>`
- `web/index.html:40`: `<h1 style="margin: 0;">CV Builder</h1>`
- `web/index.html:322`: `<h2 id="onboarding-modal-title">👋 Welcome to CV Builder</h2>`

The onboarding modal body text at `index.html:330` also reads "CV Builder uses AI to create tailored…", maintaining consistent branding throughout.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
| US-F1-C1 (entry screen clarity) | ✅ | | | | |
| US-F1-C2 (terminology clarity) | | ⚠️ | | | |
| US-F1-C3 (first stage data needs) | ✅ | | | | |
| US-F1 failure: complex entry | ✅ | | | | |
| US-F1 failure: terms without context | | ⚠️ | | | |
| US-F2-C1 (staged disclosure) | | ⚠️ | | | |
| US-F2-C2 (stage purpose before action) | | ⚠️ | | | |
| US-F2-C3 (predictable transitions) | ✅ | | | | |
| US-F2 failure: too many controls | | ⚠️ | | | |
| US-F2 failure: insufficient transition explanation | | ⚠️ | | | |
| US-F3-C1 (review steps complete signal) | | ⚠️ | | | |
| US-F3-C2 (generation/layout/finalise relationship) | | | ❌ | | |
| US-F3-C3 (optional vs required final actions) | | ⚠️ | | | |
| US-F3 failure: preview mistaken for final | | | ❌ | | |
| US-F3 failure: optional actions look mandatory | | ⚠️ | | | |

Pass: 4 | Partial: 9 | Fail: 2 | Not Implemented: 0 | N/A: 0

### Key evidence references

- Onboarding modal (three-state): `web/index.html:317–399`, `web/session-manager.js:175–262`
- Workflow nav (all 12 steps always visible): `web/index.html:118–143`
- Tab bar staged disclosure: `web/ui-core.js:350–363` (STAGE_TABS), `web/ui-core.js:619–628` (updateTabBarForStage)
- Phase-locked action buttons: `web/index.html:185–195` (7 action buttons, individually shown/hidden)
- Phase unlock logic: `web/ui-core.js:1894–1989` (updateWorkflowStepsClickable)
- Generation pipeline action labels: `web/index.html:190–194`
- Layout freshness chip: `web/index.html:96`, `web/state-manager.js:120–178`
- Empty state generic text: `web/index.html:236–240`
- Customise stage tab count (10 tabs): `web/ui-core.js:353`
- Harvest onboarding description: `web/index.html:341–344`
- LLM busy overlay during generation: `web/index.html:155–164`
- Screen-reader live region for stage announcements: `web/index.html:145–147`
