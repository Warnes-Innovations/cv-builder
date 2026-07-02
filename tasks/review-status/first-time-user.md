<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# UI Review — First-Time User Persona
**Reviewer:** First-Time User persona
**Date:** 2026-07-01
**Source files reviewed:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/session-manager.js, web/workflow-steps.js, web/download-tab.js, web/finalise.js, web/harvest.js, scripts/web_app.py, scripts/utils/conversation_manager.py

---

## Application Evaluation

### US-F1: First-Run Orientation

#### Criterion 1 — Entry screen explains the first required action clearly
**PASS with gap**

The onboarding modal (`#onboarding-modal-overlay`, `session-manager.js:175`) fires on every startup unless dismissed. It presents a clear 3-step overview ("Build your master profile → Target a specific job → Harvest improvements") with numbered badges and plain-language descriptions. Three conditional sections handle distinct initial states:

- **Missing master CV** (section `welcome-section-missing`): directs user to `Master_CV_Data.json` and offers "Create empty profile" or "Place an existing file." The path to the missing file is shown in a monospace block. This is the correct first-run path.
- **Empty skeleton** (section `welcome-section-empty`): tells the user to open the Master CV editor before starting a job application.
- **Profile ready** (section `welcome-section-present`): says "switch to the Job tab, provide a job description, and click Analyse Job."

Each variant has a clear primary call-to-action button. The modal is reopenable via the **? Help** button in the header at all times.

**Gap (minor):** The "Build your master profile" step mentions populating `Master_CV_Data.json` "once" — a new user in the missing-profile path must understand that "Create empty profile" creates exactly that file. The connection between clicking the button and the file being created is not explained in the modal body text. A user who misses the "Create empty profile" button label may not know what the button does.

#### Criterion 2 — Key workflow concepts understandable without domain knowledge
**PARTIAL**

The onboarding modal avoids most jargon in its main body. However, the persistent workflow nav bar across the top of the page (12 steps: Job Input → Analysis → Customise → Rewrites → Spell Check → Layout Review → File Review → Cover Letter → Screening → Interview Prep → Thank You → Harvest) is fully visible immediately after the modal is dismissed. Several step names are unexplained on first encounter:

- **Rewrites** — no tooltip explains this means "AI-proposed edits to your experience bullet points." The step tooltip reads "Rewrite review," still circular.
- **Harvest** — hover tooltip says "Harvest improvements — save refined bullets, new skills, and summary variants back to your Master CV for future applications." This is adequate but only visible on hover.
- **Customise** — tooltip is "Content customisation," which is circular. The concept of selecting which experiences and skills appear is not explained until the user reaches that stage.

The workflow step bar's locked (non-clickable) steps have no tooltip or text explaining they unlock as the user progresses. A new user may think the application is partially broken.

**Failure mode found:** The story warns against "Terms like rewrites, customisations, layout review, or harvest appearing without context." All four terms appear in the nav bar on first load without context.

#### Criterion 3 — First stage makes clear what data is needed and why
**PASS**

Once inside the app and on the Job tab (the default), the chat input placeholder reads "Type a message (e.g., 'analyse job')" and the primary action button is labeled "🔍 Analyse Job." The modal's "profile ready" section specifies "provide a job description" before clicking Analyse Job.

The `app.js` init also detects when a job description is loaded but not yet analyzed, highlights the Analyse Job button with a blue outline, and appends a system message: "Job description detected — click **Analyse Job** when ready to begin." This contextual nudge is a strong first-run affordance.

---

### US-F2: Progressive Disclosure Through the Workflow

#### Criterion 1 — UI reveals decisions in a staged way
**PASS with gap**

The `updateTabBarForStage()` function (`ui-core.js:552`) restricts the visible tab set to only those relevant to the current workflow stage. For example, the "customizations" stage shows Goals, Questions, Experience Bullets, Skills, Achievements, Tagline, Summary, Publications, ATS Score — phase-appropriate.

**Gap (notable):** During the Customise stage, 10 tabs are shown simultaneously with no indication of which to visit first, whether all are required, or what distinguishes "Experiences" from "Experience Bullets." The tab names are not self-explanatory to someone without CV-builder domain knowledge.

#### Criterion 2 — Each stage communicates its purpose before demanding action
**PARTIAL**

The conversation panel receives system messages at each phase transition that describe what just happened and what comes next. The action button changes label at each stage, e.g. "⚙️ Recommend Customizations" → "✏️ Review Rewrites" → "Continue to Spell Check →". This chain is sequential and clear.

However, tab content in the viewer area often has no introductory text. The `analysis` empty state reads only "No analysis data yet. Submit a job description to begin." The File Review tab description is technical ("this is the completeness check step — ATS validation runs here") and assumes knowledge of ATS validation.

**Failure mode found:** The story warns against "Major stage transitions happening with insufficient explanation." The transition from Spell Check to the three-step layout pipeline (Generate Preview → Open Layout Review → Confirm Layout) uses tooltip-only labeling with step numbers ("Step 1 of 3: Generate an HTML preview to review the layout before final DOCX/PDF files are produced"). The tooltip is informative but only discoverable by hovering — the button label "Generate Preview →" does not convey that this is the first of three required button presses.

#### Criterion 3 — Transition between stages feels predictable
**PASS with gap**

The sequence of primary action buttons drives the workflow linearly and each reveals only after the previous stage completes. The workflow nav bar marks completed steps green and the active step blue. This is a sound progressive pattern.

**Gap (minor):** There is no visible "step N of 12" indicator in the chat panel. The nav bar is at the top and may be mentally disconnected from the action button currently in view.

---

### US-F3: Confidence Before Finalisation

#### Criterion 1 — System communicates whether key review steps are complete
**PASS with gap**

The workflow step bar shows green "completed" styling for finished steps. The layout freshness chip ("Layout current" / "Layout outdated" / "Files outdated") in the position bar communicates synchronization state. The File Review tab includes ATS validation with pass/warn/fail icons and blocks download buttons for formats with critical failures — a strong readiness signal.

**Gap (minor):** "Archive" is used in the File Review tab description without definition ("you can archive the application"). It is unclear whether archiving is required for the files to be valid or is purely optional bookkeeping.

#### Criterion 2 — Relationship between generation, layout review, and finalisation is understandable
**PARTIAL**

The three-step sub-pipeline within the generation phase is labeled via tooltips:
- "Step 1 of 3: Generate an HTML preview..." (tooltip on "Generate Preview →")
- "Step 2 of 3: Review and adjust layout settings..." (tooltip on "🎨 Open Layout Review →")
- "Step 3 of 3: Confirm layout and produce final..." (tooltip on "✅ Confirm Layout")

The step numbers are helpful for users who discover the tooltips. However, they are **tooltip-only** and not surfaced as visible body text.

The distinction between the "Generated Files" tab and the "File Review" tab is also confusing. Both appear in the download stage but serve different purposes: "Generated Files" gives immediate download access; "File Review" runs ATS validation and is the "completeness check." The tab labels do not communicate this distinction.

#### Criterion 3 — Final stage distinguishes optional from required actions
**PARTIAL**

After File Review, the workflow continues to optional post-generation steps: Cover Letter, Screening, Interview Prep, Thank You, Harvest. The File Review tab has a "Proceed to Cover Letter →" button, framing the next step as a natural continuation. There is no label marking these steps as optional.

The Harvest step (last in the nav bar) appears in a linear sequence with no visual or textual signal that it is optional rather than required.

The Finalise tab (`finalise.js`) renders an "✅ Finalise Application" heading with the description "Archive this application to your CV history, update the response library, and **optionally** write any improvements back to Master CV Data." This text correctly labels optionality. However, this tab is hidden by default (HTML `style="display:none"`) and is only reached via "📦 Package Application Files" — a button that appears only after final generation. A first-time user who has not reached this tab will not have seen the "optional" framing for the post-generation steps.

---

### Terminology Clarity Evaluation

| Term | Location | Clarity | Notes |
|------|----------|---------|-------|
| Rewrites | Nav bar, action button | Poor | No context on first appearance; "Rewrite review" tooltip is circular |
| Harvest | Nav bar | Acceptable | Hover tooltip explains the concept; but tooltip-only |
| Customise | Nav bar, action button | Poor | "Content customisation" is circular; concept not explained until the stage is reached |
| Layout Review | Nav bar, action button | Acceptable | Three-step tooltip chain explains it for users who hover |
| ATS | Badge, report button, File Review | Acceptable | Expanded as "Applicant Tracking System" in aria-title and button tooltip |
| Master CV | Modal, header button | Good | Modal explains it as "your complete work history" in plain language |
| Generated Files vs File Review | Two adjacent tabs | Poor | Both appear to relate to download; distinction not stated in tab labels |
| Archive | File Review tab description | Poor | Used without definition; unclear whether required or optional |
| Package Application Files | Action button | Acceptable | Self-descriptive; purpose is clear but audience context is not stated |

---

## Generated Materials Evaluation

This review is scoped to UI/application evaluation only; no live session with generated outputs was available for direct inspection. Based on source code of File Review, Generated Files, and Finalise tabs:

- Download tab presents files in a grid with format labels (DOCX, PDF, HTML) — clear for a professional audience.
- ATS validation results are shown in a table with pass/warn/fail icons. Some internal check names leak into the UI (e.g., "docx_standard_headings," "html_jsonld_valid_person") — technical for a first-time user.
- Advisory quality notices (long bullets, sparse experience entries, year-only dates) use plain language with actionable suggestions.
- The distinction between ATS DOCX (for applicant tracking systems) and Human PDF (for human readers) is reflected in settings labels but is not explained at the download surface itself. A first-time user may not know which format to submit.

---

## Summary of Gaps Found

| ID | Criterion | Severity | Description |
|----|-----------|----------|-------------|
| FTU-1 | US-F1.2 | Moderate | Four workflow terms appear in the nav bar on first load without contextual explanation: "Rewrites," "Customise," "Layout Review," "Harvest." |
| FTU-2 | US-F1.1 | Minor | Onboarding modal "Create empty profile" button purpose is not explained in body text; relies on button label alone. |
| FTU-3 | US-F2.1 | Moderate | During the Customise stage, 10 tabs appear with no indication of recommended visit order, whether all are required, or what distinguishes "Experiences" from "Experience Bullets." |
| FTU-4 | US-F2.2 | Minor | The three-step generation sub-pipeline (Preview → Layout Review → Confirm) is labeled via tooltips only; not visible without hovering. |
| FTU-5 | US-F3.2 | Moderate | "Generated Files" and "File Review" are two adjacent tabs that both appear to relate to download; the difference is not obvious from tab labels. |
| FTU-6 | US-F3.3 | Moderate | Post-generation steps (Cover Letter through Harvest) appear as a linear extension of the required workflow with no visual or textual signal that they are optional. |
| FTU-7 | US-F3.1 | Minor | "Archive" is used in File Review description without definition; unclear whether required or optional. |
| FTU-8 | US-F2.1 | Minor | Locked workflow steps (pre-analysis) have no tooltip or label explaining they unlock as the user progresses. |
| FTU-9 | Materials | Minor | ATS DOCX vs Human PDF distinction is not explained at the download surface; first-time users may not know which format to submit to employers. |

---

## Acceptance Criteria Verdict

| Criterion | Status |
|-----------|--------|
| US-F1: New user can identify first step and expected input without help | **PASS** — Onboarding modal plus "Analyse Job" button make this clear |
| US-F1: Stage names and action labels understandable in context | **PARTIAL** — Action buttons are clear; nav bar step names are not (FTU-1) |
| US-F2: Workflow can be followed sequentially without guessing primary surface | **PASS** — Primary action buttons drive linear progress effectively |
| US-F2: Stage transitions include enough feedback | **PARTIAL** — Chat system messages are good; multi-step generation sub-pipeline relies on tooltips (FTU-4) |
| US-F3: User can tell when previewing, refining, finalising | **PARTIAL** — Layout freshness chip helps; generated-files vs file-review confusion hurts (FTU-5) |
| US-F3: Final stage distinguishes archive/finalise from optional follow-on | **PARTIAL** — Finalise tab has the right language but is hidden; post-generation steps lack "optional" labels (FTU-6, FTU-7) |
