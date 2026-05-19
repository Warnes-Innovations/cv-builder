<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review Status

**Last Updated:** 2026-04-22 10:00 ET
**Persona:** A capable professional using CV Builder for the first time with no prior knowledge of its workflow or terminology.

**Executive Summary:** Since the previous review (2026-04-20) a welcome/onboarding modal has been implemented (`session-manager.js:155–179`, `index.html:258–325`) that correctly branches on master-CV presence, provides a 3-step workflow summary, and includes a missing-master-CV path with "Create empty profile." This substantially addresses the critical GAP-FU-2 from the prior review. However, the modal's "Get Started" button closes without navigating to the Job tab, no "start here" message appears in the conversation panel after dismissal, LLM setup is still not mentioned in the welcome flow, and the generate → layout → finalise pipeline remains unexplained — a user cannot tell the difference between a preview and final output anywhere in the source. The previous review's assessment that "FileNotFoundError is raised with no UI intercept" is no longer accurate; `showOnboardingModal()` is now wired to the session-creation path.

---

## Application Evaluation

### US-F1 — First-Run Orientation

#### Criterion 1 — Entry screen explains the first required action clearly

**⚠️ Partial**

`maybeShowWelcomeModal()` runs on every startup until dismissed (`session-manager.js:155–179`). For users whose master CV is present, the modal shows: "**Next:** switch to the **Job** tab, provide a job description, and click **Analyze Job**." (`index.html:295–297`) — explicit and accurate.

However:
- The "Get Started" button (`index.html:307`) calls only `closeWelcomeModal()` (`session-manager.js:183–189`); it does not navigate to the Job tab.
- After modal dismissal the conversation area shows only "🔄 Connecting to CV Builder…" and "✅ Connection successful." (`app.js:62–68`). Neither message provides a "start here" prompt.
- The LLM status pill shows "⚠️ Not ready" (`index.html:52–56`) when no provider is configured, but the welcome modal never mentions that LLM setup is required before any AI action.

**What's missing:** Post-close navigation to the Job tab; a conversation-level orientation prompt; mention of LLM provider setup in the welcome flow.

---

#### Criterion 2 — Key workflow concepts are understandable without domain-specific prior knowledge

**⚠️ Partial**

- The 8-step workflow bar labels — Job Input, Analysis, Customise, Rewrites, Spell Check, Generate, Layout Review, Finalise (`index.html:115–130`, `workflow-steps.js:606–614`) — are broadly self-explanatory.
- **"Harvest improvements"** (welcome modal step 3, `index.html:286–289`) is unexplained jargon. No tooltip or definition exists.
- **"Master_CV_Data.json"** appears as a raw filename in the modal (`index.html:278`, `index.html:301–303`). A file extension is not meaningful to non-technical users.
- **"ATS"** appears as a header badge (`index.html:91`), a dedicated tab (`index.html:194`), and in position-bar widgets with no first-run definition.
- **"Session"** — the header shows "📂 Sessions" and "+ New Session" (`index.html:42–46`) with no explanation of what a session is or why multiple sessions exist.

---

#### Criterion 3 — The first stage makes clear what data is needed and why

**⚠️ Partial**

`showLoadJobPanel()` renders "📥 Add Job Description" with three input methods (paste, URL, file) (`job-input.js:100–155`). The *what* is clear. However:
- No explanatory text in the job input panel explains *why* a job description is needed or how it will be used.
- The welcome modal step 2 provides this context ("Provide a job description → AI analysis → review and refine…", `index.html:282–285`) but only while the modal is open; nothing persists in the Job tab after dismissal.
- The URL method helpfully lists which sites work vs. require manual copy (`job-input.js:135–148`) — a good contextual touch to replicate elsewhere.

---

### US-F2 — Progressive Disclosure Through the Workflow

#### Criterion 1 — UI reveals decisions in a staged way rather than all at once

**⚠️ Partial**

`STAGE_TABS` (`ui-core.js:350–360`) maps each workflow stage to a filtered set of second-bar tabs, enforced by `updateTabBarForStage()` (`ui-core.js:571–583`):

| Stage | Tabs shown |
|---|---|
| `job` | job, master |
| `analysis` | analysis, questions |
| `customizations` | exp-review, ach-editor, skills-review, achievements-review, summary-review, publications-review, ats-score |
| `rewrite` | rewrite |
| `spell` | spell |
| `generate` | generate |
| `layout` | layout |
| `finalise` | download, finalise, master, cover-letter, screening |

Tab-bar disclosure is well-staged. **However:**
- The **entire 8-step workflow bar** is rendered and visible from first load (`index.html:115–130`). No steps are hidden or locked.
- The `customizations` stage exposes **7 tabs simultaneously** with no stage-intro explaining what those 7 sub-tasks involve.
- The `finalise` stage exposes 5 tabs with no orientation for a first-time user.

---

#### Criterion 2 — Each stage communicates its purpose before demanding action

**⚠️ Partial**

- **Analysis stage:** LLM analysis text is appended to the conversation via `appendMessage('assistant', analysisText)` (`job-analysis.js:135`). Content is contextual but AI-generated, not a structured "here's what you got; here's what to do next."
- **Job stage:** `showLoadJobPanel()` shows a panel heading with no purpose statement.
- **All other stages:** No fixed stage-introduction message is injected when entering customizations, rewrite, spell, generate, layout, or finalise. Users must infer purpose from tab content and action button label alone.
- Action buttons label the next action per stage (e.g., "⚙️ Recommend Customizations", "✏️ Review Rewrites") via `_STAGE_BUTTON_MAP` (`ui-helpers.js:138–148`) — helpful but terse.

---

#### Criterion 3 — Transitions from one stage to the next feel predictable

**✅ Pass (with caveat)**

- Workflow step bar updates on every `fetchStatus()` call via `updateWorkflowSteps()` (`workflow-steps.js:595`); active step is blue, completed steps are green (`styles.css:148–151`). ✅
- Back-navigation from completed steps works via `handleStepClick()` (`workflow-steps.js:715+`). ✅
- "↻ Refining" badge on active step when iterating (`workflow-steps.js:663`). ✅
- **Caveat:** No "You've completed X. Next up: Y" message is injected at stage transitions. The user must read the action button to discover the next step.

---

### US-F3 — Confidence Before Finalisation

#### Criterion 1 — System communicates whether key review steps are complete

**⚠️ Partial**

- Workflow step bar clearly shows completed (green) vs. active (blue) vs. pending (`styles.css:148–151`). ✅
- Layout freshness chip displays "Layout current", "Layout outdated", "Files outdated" (`state-manager.js:120–145`). ✅
- **Gap:** No pre-finalise checklist or "all required steps done" summary card exists. A first-time user cannot verify whether they have completed all recommended steps before clicking "✅ Finalise & Archive".

---

#### Criterion 2 — The relationship between generation, layout review, and finalisation is understandable

**❌ Fail**

This is the most critical gap for first-time users.

- The **Generate step produces a preview**, not final output — but no label, tooltip, or inline text anywhere in the source says this. The "📄 Generated CV" tab label gives no indication.
- The layout-confirm button cycles through: "✅ Confirm Layout" → "⬇️ Generate Final Files" → "↻ Regenerate Preview" (`ui-helpers.js:108–126`). The word "Preview" only appears when the layout is stale; there is no persistent "this is a preview" label.
- `STAGE_TABS` separates `generate` from `layout` (`ui-core.js:353–358`), implying a sequence, but no text associates "generate" with "preview" and "layout confirm" with "final file production".
- A first-time user who sees "📄 Generated CV" after clicking Generate may reasonably conclude they are done and skip directly to Finalise, missing the layout-confirm step entirely.

---

#### Criterion 3 — The final stage distinguishes optional from required actions

**⚠️ Partial**

- Finalise tab intro: "Archive this application to your CV history, update the response library, and **optionally** write any improvements back to Master CV Data." (`finalise.js:70–73`). The word "optionally" is present but buried in prose alongside actions that are not optional.
- The Harvest section appears only **after** clicking "✅ Finalise & Archive" (`finalise.js:175` — `showHarvestSection()`), correctly framing it as post-finalise. ✅
- **Gap:** The "Status" dropdown (Draft/Ready/Sent) and "Notes" textarea (`finalise.js:90–108`) render before the action button without indication of whether they are required or optional.
- **Gap:** The path to download files (the "⬇️ File Review" tab) is not referenced from the Finalise tab. A user who wants the DOCX/PDF must discover the File Review tab independently.

---

## Generated Materials Evaluation

**⚠️ Partial**

- After generation the "📄 Generated CV" tab and "⬇️ File Review" tab provide output access.
- Neither tab labels the output as a **preview** until the layout freshness chip changes or the layout-confirm button text changes to "⬇️ Generate Final Files" — both require the user to already understand the distinction.
- A first-time user who generates output and downloads from "⬇️ File Review" may not realize they are downloading a preview that has not yet gone through layout confirmation. No warning distinguishes preview files from final files in the download UI.

---

## Additional Story Gaps / Proposed Story Items

### GAP-FT-1 (Medium): LLM Provider Setup Is a Silent Prerequisite

The welcome modal does not mention that an LLM provider must be configured before any AI action. The "⚠️ Not ready" pill (`index.html:52–56`) is passive and unexplained. A user following the welcome modal instruction ("click Analyze Job") with an unconfigured LLM will receive an authentication error with no contextual guidance.

**Proposed story:** A first-time user who has not configured an LLM provider should receive an inline prompt or be directed to the LLM Configuration Wizard before the first AI action attempt.

---

### GAP-FT-2 (Low): "Don't Show Again" Is in the First Modal a New User Sees

The "Don't show again" checkbox (`index.html:305`) appears in the welcome modal footer. A scanning user may check it before fully reading the modal, permanently disabling the only onboarding experience. There is no way to re-open it short of clearing localStorage.

**Proposed story:** The "Don't show again" dismissal should require affirmative intent (default unchecked, positioned away from "Get Started"), or the onboarding modal should be re-accessible from the Settings or Help area.

---

### GAP-FT-3 (Medium): No Persistent Help Entry Point After Modal Dismissal

Once the welcome modal is dismissed there is no "?" button or Help link in the UI. A first-time user who gets confused mid-workflow has no way to revisit the workflow explanation.

**Proposed story:** A first-time user should be able to access a brief workflow overview from the header at any time, not only during the initial welcome modal.

---

### GAP-FT-4 (High): "Preview vs Final" Is Not Explained in the Generate or Layout Tab

The generate → layout confirm → final files pipeline requires understanding that "Generate" produces a preview. No label, tooltip, or description communicates this. See US-F3 Criterion 2.

**Proposed story:** The Generated CV tab and the Layout Review tab should each include a brief contextual label indicating where the user is in the preview-to-final pipeline.

---

### GAP-FT-5 (Low): Session Concept Is Not Introduced

The header displays "📂 Sessions" and "+ New Session" from first load (`index.html:42–46`). The welcome modal does not explain what a session is, why multiple sessions exist, or that one session = one job application.

**Proposed story:** A first-time user should understand from the onboarding flow that one session equals one job application and that sessions persist work for later review.

---

### GAP-FT-6 (Low): Terminology — "ATS", "Harvest", and "CV" Undefined

- **ATS** — shown in header badge, dedicated tab, and workflow summary; "Applicant Tracking System" is never written out.
- **Harvest** — used in welcome modal step 3 and Finalise tab without explanation.
- **CV** — app title and all labels use "CV"; US/Canadian users may expect "resume".

**Proposed story:** First-run users should encounter tooltips or inline definitions for "ATS", "Harvest", and "CV" the first time these terms appear.

---

## Summary Table

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-F1.1 Entry screen first action | | ⚠️ | | | |
| US-F1.2 Concepts understandable | | ⚠️ | | | |
| US-F1.3 First stage explains data needed | | ⚠️ | | | |
| US-F2.1 Staged revelation of decisions | | ⚠️ | | | |
| US-F2.2 Stage purpose before action | | ⚠️ | | | |
| US-F2.3 Predictable transitions | ✅ | | | | |
| US-F3.1 Review completeness communicated | | ⚠️ | | | |
| US-F3.2 Generation→layout→finalise pipeline | | | ❌ | | |
| US-F3.3 Optional vs required in finalise | | ⚠️ | | | |

**Story tally:** 1 criterion pass · 7 partial · 1 fail

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/workflow-steps.js, web/session-manager.js, web/job-input.js, web/job-analysis.js, web/message-dispatch.js, web/finalise.js, web/ui-helpers.js, scripts/web_app.py, scripts/utils/conversation_manager.py

**Key evidence references:**
- US-F1.1 welcome modal instruction → `index.html:295–297`; modal close without navigation → `session-manager.js:183–189`; post-init conversation messages → `app.js:62–68`
- US-F1.2 "Harvest" unexplained → `index.html:286–289`; "ATS" unlabeled → `index.html:91,194`; "Master_CV_Data.json" jargon → `index.html:278,301–303`
- US-F1.3 job input panel (no "why") → `job-input.js:100–105`
- US-F2.1 STAGE_TABS → `ui-core.js:350–360`; full 8-step bar from load → `index.html:115–130`
- US-F2.2 no stage-intro messages → `job-analysis.js:135`; action button as sole stage signal → `ui-helpers.js:138–148`
- US-F2.3 step completion styling → `styles.css:148–151`; updateWorkflowSteps → `workflow-steps.js:595`
- US-F3.1 layout freshness chip → `state-manager.js:120–145`; no pre-finalise checklist → `finalise.js:42–84`
- US-F3.2 "preview" concept absent from tab UI → `ui-core.js:350–360`; layout button labels → `ui-helpers.js:108–126`
- US-F3.3 "optionally" in prose → `finalise.js:70–73`; harvest post-finalise → `finalise.js:175`
- GAP-FT-1 LLM pill → `index.html:52–56`; welcome modal has no LLM mention → `index.html:258–325`
- Welcome modal now implemented (supersedes prior GAP-FU-2 critical) → `session-manager.js:140–229`, `index.html:258–325`
