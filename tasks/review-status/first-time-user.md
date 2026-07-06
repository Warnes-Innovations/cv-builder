<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review Status

**Last Updated:** 2026-07-06 16:30 ET

**Executive Summary:** Source-verified first-time user persona review. The onboarding modal is well-structured and adapts correctly to Master CV state. The Job Input step is clear and provides multiple entry paths. However, several workflow stage names are opaque to a first-time user ("Harvest," "Customise," "Rewrites"), the Customise stage exposes 9 tabs simultaneously without orientation, and the relationship between preview generation, layout review, and finalisation is confusing under three redundant action buttons. ATS terminology appears without definition outside of tooltips.

---

## Application Evaluation

### US-F1: First-Run Orientation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Entry screen explains first required action | ✅ Pass | Welcome modal shows a 3-phase "How it works" flow; adapts to master CV presence/absence (`bundle.js:8163–8190`). If master CV is missing, a prominent "Start here (Step 1)" callout appears (`index.html:375`). |
| Key workflow concepts understandable without domain knowledge | ⚠️ Partial | Steps are named: Job Input, Analysis, Customise, Rewrites, Spell Check, Layout Review, File Review, Cover Letter, Screening, Interview Prep, Thank You, Harvest (`index.html:124–146`). "Customise," "Rewrites," and "Harvest" have no definition at first encounter; tooltips exist but require hover (`bundle.js:4416–4428`). |
| First stage makes clear what data is needed and why | ✅ Pass | Job tab shows "Add Job Description" with three clearly labelled input methods (Paste Text, From URL, Upload File) plus a warning panel for sites that block scraping (`bundle.js:11115–11198`). |
| New user can identify first step without external help | ✅ Pass | Onboarding modal (shown on every startup until dismissed) immediately tells a user with a populated profile: "switch to the Job tab, provide a job description, and click Analyse Job" (`index.html:361–364`). Analyse Job button is highlighted with a blue outline when a job description is loaded but not yet analysed (`app.js:96–99`). |
| Stage names understandable in context | ⚠️ Partial | "Harvest" is an agricultural metaphor with no visual hint; "Customise" is vague — 9 sub-tabs (Goals, Questions, Experiences, Experience Bullets, Skills, Achievements, Tagline, Summary, Publications) are all unlocked simultaneously (`ui-core.js:353–366`). "Rewrites" implies editing but actually means approving AI-proposed rewrites. |

**Failure modes observed:**
- "Harvest" step (step-harvest, `index.html:146`) carries no self-defining label; its tooltip is only visible on hover.
- "Customise" stage opens to "Goals" by default but the goals tab (`bundle.js:7646`) is about document length constraints — a sophisticated concept for a first-time user who has not yet seen any output.
- Terms "ATS," "ATS DOCX," "DOCX" appear throughout the UI without definition (except an 80-character tooltip on the ATS badge: `index.html:92`).

---

### US-F2: Progressive Disclosure Through the Workflow

| Criterion | Status | Evidence |
|-----------|--------|----------|
| UI reveals decisions in staged way | ⚠️ Partial | Workflow steps unlock sequentially (`ui-core.js:1830–1914`); tabs shown per-stage (`ui-core.js:353–366`). However, Customise stage unlocks 9 tabs simultaneously: `STAGE_TABS.customizations = ['goals','questions','exp-review','ach-editor','skills-review','achievements-review','tagline-review','summary-review','publications-review','ats-score']`. A first-time user arrives at 9 tabs with no indication of which to visit first or whether all are required. |
| Each stage communicates its purpose before demanding action | ⚠️ Partial | The Goals tab (`bundle.js:7650–7656`) provides a description: "Set optional length constraints." The Experiences tab, however, renders content immediately without an explanatory header visible to a new user. The message posted to chat on recommendations ("✅ Customizations generated! Please review each section in the Customizations tab") provides some orientation (`bundle.js:3773`), but only in the chat panel. |
| Transition from one stage to the next feels predictable | ⚠️ Partial | Action buttons are shown in the chat area (`index.html:188–199`), not adjacent to the viewer. A first-time user looking at the Experiences tab may not look back to the chat panel to find the "Review Rewrites" button. The rewrite-tab also has a separate inline "Submit All Decisions" / "Continue to Spell Check" button (`bundle.js:15529–15540`), creating dual submission points. |
| Workflow follows sequentially without guessing which surface is primary | ⚠️ Partial | Two simultaneous navigation surfaces: the top workflow bar (steps) and the tab bar below it. A new user may not realise these are synchronised. During the Customise phase, clicking a step in the top bar (step-customizations) routes to "goals" by default (`bundle.js:5229–5246`), not to where the user left off in the 9-tab sub-flow. |
| Stage transitions include enough feedback | ✅ Pass | After analysis completes, assistant posts a message, the Analysis step becomes active, and the tab bar updates to the analysis tab. Progress indicators exist (toast messages, step state changes). |

---

### US-F3: Confidence Before Finalisation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| System communicates whether key review steps are complete | ⚠️ Partial | Workflow steps show completed/active/stale visual state (`bundle.js:4283–4334`). However, within the Customise stage the 9 sub-tabs have no checklist or progress counter; a user cannot tell if they have visited all required tabs. |
| Relationship between generation, layout review, and finalisation is understandable | ❌ Fail | Three distinct action buttons appear in sequence: "Generate Preview →" (spell-btn), "🎨 Open Layout Review →" (generate-proceed-btn), "✅ Confirm Layout" (layout-btn), then "📥 Continue to File Review →" (final-generate-proceed-btn) (`index.html:193–198`). Their titles (Spell Check step 1 of 3, step 2 of 3, step 3 of 3) are only visible as tooltips; the button labels alone do not communicate the pipeline. A user clicking "Generate Preview →" after spell-check does not know this produces an intermediate artifact rather than a final downloadable CV. |
| Final stage distinguishes preview, refining, and finalising | ⚠️ Partial | The Layout Review tab renders an HTML preview with layout sliders and a "Confirm Layout" button (`bundle.js:5479–5549`). The "Confirm Layout" label is clear, but the consequence (triggering final DOCX/PDF generation) is not stated on the button or nearby. "Files outdated" / "Layout outdated" chips on the step bar (`state-manager.js:144–176`) are informative but their meaning requires interpretation. |
| Final stage distinguishes optional vs. required | ⚠️ Partial | Post-layout steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) unlock simultaneously after layout confirmation (`ui-core.js:1841–1914`) with no indication which are optional. The workflow bar treats them identically to mandatory earlier steps. |

---

## Generated Materials Evaluation

**Note:** Generated CV content is not directly inspectable from static source; evaluation is based on output-related UI elements visible to a first-time user.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Output format names are clear | ⚠️ Partial | Settings exposes "ATS DOCX," "Human PDF," "Human DOCX" (`index.html:642`). "ATS DOCX" is unexplained for a first-time user; no inline definition beyond a tooltip on the ATS badge. "Human PDF" is somewhat clearer but not standard terminology. |
| Download tab explains what the user is downloading | ✅ Pass | "Generated Files" and "File Review" tabs exist; the layout review step description reads "Adjust margins, fonts, and column balance, then generate your final CV files" (`bundle.js:4422`). |
| Harvest purpose is explained before use | ✅ Pass | Harvest step tooltip and `_STEP_DESCRIPTIONS` entry is present: "Save refined bullets, new skills, and summary variants back to your Master CV for future applications" (`bundle.js:4428`). Harvest tab header is "🌾 Harvest Improvements." The term "candidates" (internal to `populateHarvestTab2`) is not exposed to users. |

---

## Terminology Analysis

The following terms appear in the UI and may cause first-time-user hesitation:

| Term | Location | Issue |
|------|----------|-------|
| "Harvest" | Workflow step bar (`index.html:146`), tab bar (`index.html:233`) | Agricultural metaphor with no definition at first encounter; tooltip only on hover |
| "ATS" | Position bar badge (`index.html:92`), tab (`index.html:219`), settings (`index.html:642`) | Abbreviation expanded only in tooltip; no inline definition for users unfamiliar with Applicant Tracking Systems |
| "ATS DOCX" | Settings modal (`index.html:642`) | Both ATS and DOCX are unexplained; a new user does not know why this differs from "Human DOCX" |
| "Customise" | Workflow step (`index.html:128`) | Covers 9 sub-tabs; scope far broader than the label implies |
| "Rewrites" | Workflow step (`index.html:130`), tab (`index.html:220`) | Implies user editing; actually means reviewing and approving AI-proposed rewrites |
| "Non-confidential" badge | Header (`index.html:59`) | Small warning badge adjacent to model name; significance not explained inline |
| "Goals" | Tab within Customise stage (`bundle.js:7651`) | Tab name suggests application strategy; content is actually document length configuration — label/content mismatch |
| "Experience Bullets" | Tab (`index.html:213`) | Reasonably clear but labelled differently than the parent step "Rewrites" |
| "Screening" | Workflow step (`index.html:140`), tab (`index.html:230`) | Context-free abbreviation; "Screening Questions" is the full intent |
| "Layout outdated" / "Files outdated" | State chips (`state-manager.js:144–176`) | Reasonably clear, but "outdated" does not indicate the required user action |

---

## Additional Story Gaps / Proposed Story Items

**US-F4 (proposed): Customise Stage Orientation**
A first-time user reaching the Customise stage is presented with 9 tabs simultaneously with no onboarding callout, no required-vs-optional indication, and no visit-tracking progress indicator. A guided sequence or callout at the top of the Customise stage is absent.

**US-F5 (proposed): Prerequisite Terminology — Inline Definitions**
Terms "ATS," "ATS DOCX," "Human PDF/DOCX," and "Harvest" are used without inline definitions for users who lack prior knowledge. A minimal glossary, expanded labels, or first-encounter contextual popups would reduce cognitive friction.

**US-F6 (proposed): Generation Pipeline Clarity**
The three-step generation pipeline (Preview → Layout Review → Confirm Layout → File Review) is not explained as a pipeline. Button tooltip labels ("Step 1 of 3") are tooltip-only. A user cannot tell from visible UI text that "Generate Preview →" produces an intermediate artifact rather than the final CV.

**US-F7 (proposed): Post-Layout Optional Steps Labelling**
After layout confirmation, six post-layout steps unlock simultaneously with no visual distinction between the required download step and optional follow-on steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest). A first-time user may feel obligated to complete all six before the application is done.

**US-F8 (proposed): Goals Tab Naming Mismatch**
The "Goals" tab under Customise is named to suggest application strategy goals but contains only document length constraints (PDF page count, ATS page length). The mismatch between label expectation and actual content is a first-time user confusion point.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/bundle.js (primary dynamic surface), scripts/web_app.py, scripts/utils/conversation_manager.py, tasks/user-story-first-time-user.md

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-F1 | 2 | 3 | 0 | 0 | 0 |
| US-F2 | 1 | 4 | 0 | 0 | 0 |
| US-F3 | 0 | 3 | 1 | 0 | 0 |

**Key evidence references:**
- US-F1 (onboarding modal, master CV state): `bundle.js:8163–8190`; `index.html:323–403`
- US-F1 (analyse button highlight): `app.js:93–99`
- US-F1 (stage names, tooltip descriptions): `bundle.js:4416–4428`; `index.html:124–146`
- US-F2 (customise 9-tab simultaneous unlock): `ui-core.js:353–366`; `bundle.js:1724`
- US-F2 (dual submission buttons in rewrite): `bundle.js:15529–15540`
- US-F2 (step routing on click): `bundle.js:5192–5260`
- US-F3 (generation pipeline buttons, tooltip-only step labels): `index.html:193–198`
- US-F3 (post-layout step unlock): `ui-core.js:1841–1914`; `bundle.js:5040–5073`
- Terminology (Goals tab label/content mismatch): `bundle.js:7646–7656`
- Terminology (ATS abbreviation, no inline definition): `index.html:92, 107, 219, 642`

**Evidence standard:** Every conclusion supported by file:line evidence. Dynamic UI content verified from web/bundle.js (compiled bundle); static HTML from web/index.html; init/event logic from web/app.js and web/ui-core.js.
