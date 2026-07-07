<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review Status

**Last Updated:** 2026-07-06 (cycle 92 source-first re-read)

**Executive Summary:** Source-verified first-time user persona review. The onboarding modal is well-structured and adapts correctly to Master CV state (missing / empty skeleton / ready). The job input flow correctly shows extracted position details and the full job text before analysis is triggered. However, four recurring friction areas affect the first-time experience: (1) all 12 workflow steps are visible from startup, exposing jargon-heavy labels before context exists; (2) the Customise stage unlocks 9 sub-tabs simultaneously with no ordering or required/optional guidance; (3) the generation pipeline "Step N of 3" distinction is conveyed only through button tooltip text, not button labels; (4) "LLM" appears prominently in the header without any plain-language label — the "⚙ LLM button" reference in the onboarding modal does not match the actual header label.

---

## Application Evaluation

### US-F1: First-Run Orientation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Entry screen explains first required action | ✅ Pass | Welcome modal (`session-manager.js:175–209`) shows on every startup for users at `init` phase who have not dismissed it. Three adaptive sections: **present** — green box "Your master profile is ready. Next: switch to the Job tab, provide a job description, and click Analyse Job" (`index.html:361–364`); **empty** — amber warning directing user to Master CV tab (`session-manager.js:139–141`); **missing** — "Start here (Step 1)" with file path and two action buttons (`index.html:374–383`). "Get Started" CTA closes modal and switches to the job tab (`session-manager.js:144–147`). A permanent "? Help" button (`index.html:63–66`) reopens the modal unconditionally mid-session. |
| Key workflow concepts understandable without domain knowledge | ⚠️ Partial | Welcome modal explains the 3-phase workflow (Build → Target → Harvest) in plain English (`index.html:332–348`). All 12 workflow step labels are visible from startup in the header bar (`index.html:122–148`): Job Input, Analysis, Customise, Rewrites, Spell Check, Layout Review, File Review, Cover Letter, Screening, Interview Prep, Thank You, Harvest. Each locked step has a hover tooltip with a plain-English description (`_STEP_DESCRIPTIONS`, `workflow-steps.js:196–208`), but tooltips are hover-only and unavailable on touch devices or keyboard-only navigation. "Harvest" is an agricultural metaphor; "Customise" understates 9 distinct sub-tabs; "Rewrites" implies user editing rather than AI-proposed rewrite approval. |
| First stage makes clear what data is needed and why | ✅ Pass | Job Input tab renders textarea ("Paste the job description here…"), URL input, and file upload with three clearly labeled tabs (`job-input.js:107–113`). The primary "🔍 Analyse Job" button is the single visible action button on load. `app.js:93–99` injects a system message "📋 Job description detected — click Analyse Job when ready to begin" with a blue focus ring on the button when a job is loaded but not yet analyzed. |
| Job input flow shows position details before triggering analysis | ✅ Pass | `populateJobTab()` (`job-input.js:49–85`) is called after every job submission method (paste, URL, file). It fetches `/api/status` and renders the full job text plus an "Analyse Job" button **before** analysis is triggered. All three post-submission chat messages confirm the pattern: "Review the extracted details below, then click '🔍 Analyse Job' to continue" (`job-input.js:306, 406, 496`). |
| Guard: users not dropped into a complex screen with no primary action | ⚠️ Partial | On page load `updateTabBarForStage('job')` (ui-core.js:1972) shows only the Job tab — clean tab-bar progressive disclosure. Only the "🔍 Analyse Job" button is visible in the actions area. However, all 12 workflow steps are visible in the top nav bar from startup, including post-generation steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest). These are inert (`workflow-steps.js` skips non-active, non-completed steps) but their labels are fully visible and unexplained. |
| Guard: terms without context do not appear | ⚠️ Partial | "Harvest" (`index.html:146`), "Rewrites" (`index.html:130`), "Customise" (`index.html:128`) appear in the workflow bar immediately. "LLM:" label is prominently in the header with an "⚠ Not ready" status badge (`index.html:51–62`) — a first-time user who has never encountered AI tooling will not know what "LLM" means. Welcome modal prerequisites say "use the **⚙ LLM** button in the header" (`index.html:355`) but the actual header button label is "LLM: [provider] ⚠ Not ready" — the icon and label do not match. Step tooltips explain every term on hover; hover-only disclosure is insufficient for discovery. |

**Failure modes observed:**
- All 12 steps including post-generation steps (Cover Letter → Harvest) are visible in the workflow bar from page load, though locked.
- "Harvest," "Screening," "Rewrites" visible before context exists.
- "LLM" appears as the primary header label without plain-language explanation.
- "Position title not yet extracted…" placeholder shown in the Job tab title area after submission but before analysis (`job-input.js:61`), because `position_name` is only populated during analysis (`conversation_manager.py:2115–2128`). This italicised placeholder may cause first-time users to think something went wrong; the guidance to click "Analyse Job" appears only in the chat panel, not adjacent to the placeholder.
- After submission, two "Analyse Job" buttons exist simultaneously: one in the chat action panel (`#analyze-btn`, `index.html:190`) and one injected into the document viewer by `populateJobTab()` (`job-input.js:72–74`). Both trigger `analyzeJob()`. Not a bug (doubles discoverability), but may be momentarily confusing.

---

### US-F2: Progressive Disclosure Through the Workflow

| Criterion | Status | Evidence |
|-----------|--------|----------|
| UI reveals decisions in a staged way | ⚠️ Partial | Tab bar: `updateTabBarForStage()` (ui-core.js:562–565) correctly shows only tabs relevant to the current stage. Workflow step bar: all 12 steps are always visible; inert steps are inert but not hidden. Customise stage: `STAGE_TABS.customizations = ['goals','questions','exp-review','ach-editor','skills-review','achievements-review','tagline-review','summary-review','publications-review','ats-score']` (ui-core.js) — 9 tabs unlock simultaneously with no ordering guidance, required/optional distinction, or visit-tracking progress indicator. |
| Each stage communicates its purpose before demanding action | ⚠️ Partial | Step tooltip descriptions (`_STEP_DESCRIPTIONS`, `workflow-steps.js:196–208`) provide plain-language stage explanations on hover. Primary action buttons carry "Step N of 3" information in their `title` attributes (e.g., `spell-btn` title: "Step 1 of 3: Generate an HTML preview to review the layout before final DOCX/PDF files are produced", `index.html:194`). These are tooltip-only; button labels alone ("Generate Preview →", "Open Layout Review →", "Confirm Layout") do not convey the intermediate-vs-final distinction to a first-time reader. |
| Transition from one stage to the next feels predictable | ✅ Pass | Stage transitions are driven by backend phase and surfaced via step bar highlighting, chat messages, and toast notifications. `stateManager.onPhaseChange` fires `updateWorkflowStepsClickable` on every transition (ui-core.js:1978). The generation sub-pipeline shows a live step checklist: "Rendering HTML → Generating PDF → Building DOCX files" with active/pending/complete states (`layout-instruction.js:1187–1210`). The `workflow-stage-announcer` aria-live region (`index.html:149–151`) announces stage changes to screen readers. |
| Workflow can be followed sequentially without guessing which surface is primary | ⚠️ Partial | Two navigation surfaces co-exist: the top workflow bar (step pills) and the second-row tab bar. A first-time user at Customise who has been working in the Skills tab, then clicks the "Customise" step pill, is routed to "goals" (default) — not their last-visited sub-tab. Dual action surfaces also exist at the Rewrite stage: a chat-area "Continue to Spell Check →" button and a separate inline button within the rewrite tab. |
| Post-layout steps unlock with no sequence guidance | ⚠️ Partial | After layout confirmation, six steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) unlock simultaneously (`ui-core.js:1857–1864`, `1921–1929`). No ordering guidance, no optional/required distinction. Only File Review (download step) is mandatory; the remaining five are optional but rendered with identical visual weight. |
| Stage transitions include sufficient feedback | ✅ Pass | Chat messages, step state changes (active → completed), and toast notifications are posted at every phase boundary. Generation step checklist provides granular in-progress feedback. |

---

### US-F3: Confidence Before Finalisation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| System communicates whether key review steps are complete | ⚠️ Partial | Workflow step pills show completed/active/stale/stale-critical states (`workflow-steps.js:1007–1058`). Within the Customise stage the 9 sub-tabs have no visit-tracking counter or required/optional indicator. The Finalise tab's Submission Readiness Checklist (`finalise.js:163–213`) shows ✅/⚠️/❌ per item with legend: "⚠ items are optional — they warn but do not block archiving. ❌ items must be resolved before submitting." This is clear once reached, but only visible at the end of the workflow. |
| Relationship between generation, layout review, and finalisation is understandable | ⚠️ Partial | The three-step generation pipeline uses "Step N of 3" in button `title` attributes (`index.html:194–196`), but button labels alone do not indicate that step 1 produces a preview and step 3 produces final submission-ready files. Preview HTML files are badged "Working file — not for submission" in the File Review tab (`download-tab.js:232–234`), which is clear once the file list is visible. |
| Guard: preview generation confused with final completion | ✅ Pass | Preview files are clearly badged "Working file — not for submission" (`download-tab.js:232–234`). Preview file items use a dashed border (`download-tab.js:237`). The "Generate Preview →" button title confirms this is "Step 1 of 3: Generate an HTML preview…" (`index.html:194`). |
| Guard: optional post-generation actions looking mandatory | ⚠️ Partial | Post-layout steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) unlock simultaneously with identical visual styling to mandatory steps. No badge, label, or tooltip specifically marks these as optional. The welcome modal describes Cover Letter as part of the standard workflow without flagging it as optional. |
| Guard: "Finalise & Archive" confused with actual job application submission | ⚠️ Partial | The Finalise tab description reads "Archive this application to your CV history, update the response library, and optionally write any improvements back to Master CV Data" (`finalise.js:79–80`) — the archival/local nature is stated. However, the button label "✅ Finalise & Archive" carries no adjacent disclaimer that this does not submit the application to an employer. The description paragraph appears above the generated files list where it may be skimmed. |

---

## Generated Materials Evaluation

Generated CV content is not directly inspectable from static source. Evaluation is based on output-related UI visible to a first-time user.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Output format names are clear | ⚠️ Partial | Settings modal exposes "ATS DOCX," "Human PDF," "Human DOCX" (`index.html:642–645`). "ATS DOCX" is unexplained; no inline definition. The ATS badge tooltip at `index.html:92` fully expands the abbreviation ("Applicant Tracking System (ATS) match score — percentage of job keywords present in your CV") but is hidden until after analysis. |
| Download and File Review tabs explain what the user is downloading | ✅ Pass | Preview files are badged "Working file — not for submission." The layout review step tooltip sets expectation: "Adjust margins, fonts, and column balance, then generate your final CV files." |
| Harvest purpose is explained before use | ✅ Pass | Harvest step tooltip: "Save refined bullets, new skills, and summary variants back to your Master CV for future applications" (`workflow-steps.js:208`). Welcome modal step 3 also describes harvesting in plain language (`index.html:344–348`). |

---

## Terminology Analysis

| Term | Location | Issue |
|------|----------|-------|
| "LLM" | Header (`index.html:51–62`), LLM Configuration Wizard title | Technical acronym (Large Language Model); unexplained at first contact; "⚠ Not ready" badge visible before user has done anything |
| "Harvest" | Workflow bar (`index.html:146`), tab bar (`index.html:233`) | Agricultural metaphor; tooltip-only definition; no inline label at first view |
| "ATS" | Position bar badge (`index.html:92`), ATS Score tab (`index.html:219`), Settings (`index.html:642`) | Expanded in tooltip/title attribute only; no inline first-use definition |
| "ATS DOCX" | Settings modal (`index.html:642`) | Both "ATS" and "DOCX" unexplained; purpose distinction from "Human DOCX" is opaque |
| "Customise" | Workflow step (`index.html:128`) | Covers 9 sub-tabs; label significantly understates scope |
| "Rewrites" | Workflow step (`index.html:130`), tab (`index.html:220`) | Implies user editing; actually an AI-proposed rewrite approval UI |
| "Non-confidential" badge | Header (`index.html:59`) | Amber warning badge; significance not explained inline |
| "Goals" tab | Under Customise stage | Tab name implies application strategy; content is configuration-heavy — label/content mismatch |
| "Screening" | Workflow step (`index.html:140`), tab (`index.html:230`) | Abbreviation of "Screening Questions"; context-free on first view |
| "Position title not yet extracted…" | Job tab heading, post-submission (`job-input.js:61`) | Shown after job submission but before analysis; first-time users may interpret as an error |

---

## Gap Items

**GAP-FTU-01: LLM button label mismatch in onboarding modal**
Prerequisites note says "use the **⚙ LLM** button" but actual header button is labelled "LLM: [provider] ⚠ Not ready." New user cannot locate it by the described label. Severity: Low. Evidence: `index.html:51–62`; `index.html:355`.

**GAP-FTU-02: All 12 workflow steps visible from startup**
Locked steps are inert but their labels (Harvest, Screening, Interview Prep) are exposed before context exists. Consider hiding post-generation steps (Cover Letter → Harvest) until layout is confirmed, or grouping them behind an expandable section. Severity: Medium. Evidence: `index.html:122–148`; `ui-core.js:1946–1972`.

**GAP-FTU-03: Customise stage — 9 tabs with no ordering guidance**
No "start here" callout, no required/optional distinction, no visit-tracking progress counter. A first-time user at Customise has no orientation. Proposed fix: introductory banner or ordered checklist on first arrival. Severity: High. Evidence: `ui-core.js` STAGE_TABS.customizations.

**GAP-FTU-04: Post-layout steps lack sequence and optionality guidance**
Cover Letter, Screening, Interview Prep, Thank You, Harvest unlock simultaneously with equal visual weight. No indication of recommended order or which are optional. Severity: Medium. Evidence: `ui-core.js:1857–1864`, `1921–1929`.

**GAP-FTU-05: "Finalise & Archive" risks confusion with actual submission**
No explicit disclaimer adjacent to the button that archiving is a local tracking action, not an application send. Propose one sentence adjacent to the button. Severity: Medium. Evidence: `finalise.js:123–128`.

**GAP-FTU-06: Generation pipeline "Step N of 3" labels are tooltip-only**
The preview-vs-intermediate-vs-final distinction is conveyed only through button `title` attributes. Button labels alone ("Generate Preview →", "Open Layout Review →", "Confirm Layout") do not communicate the pipeline. Severity: Medium. Evidence: `index.html:193–198`.

**GAP-FTU-07: "Position title not yet extracted…" placeholder after job submission**
After a user submits job text (paste/URL/file) but before clicking "Analyse Job," the Job tab title area shows italic placeholder text "Position title not yet extracted…" (`job-input.js:61`). `position_name` is only set during analysis (`conversation_manager.py:2115–2128`). Guidance to click Analyse Job appears in the chat panel but not adjacent to this placeholder. Severity: Low. Evidence: `job-input.js:58–65`; `conversation_manager.py:2115–2128`.

**GAP-FTU-08: "LLM" unexplained in header and wizard title**
The header permanently displays "LLM: [provider] ⚠ Not ready" and the configuration dialog is titled "LLM Configuration Wizard." A first-time user unfamiliar with the term "Large Language Model" has no affordance to understand what this controls. Plain-language alternatives: "AI Model," "AI Provider." Severity: Medium. Evidence: `index.html:51–62`; `index.html:421–427`.

---

## Source Coverage

**Files read for this review:**

- `web/index.html` (complete)
- `web/app.js` (complete)
- `web/ui-core.js` (sections: modal management, tab management, step management, init)
- `web/state-manager.js` (complete)
- `web/styles.css` (design tokens section)
- `web/job-input.js` (complete)
- `web/session-manager.js` (welcome modal logic, lines 114–299)
- `web/workflow-steps.js` (step descriptions, tooltip logic, updateWorkflowSteps)
- `web/finalise.js` (populateFinaliseTab, _renderReadinessChecklist)
- `scripts/web_app.py` (position_name field definition)
- `scripts/utils/conversation_manager.py` (_store_job_analysis position_name extraction)

---

## Score Summary

| Story    | Pass | Partial | Fail | Not Impl |
|----------|------|---------|------|----------|
| US-F1    | 3    | 3       | 0    | 0        |
| US-F2    | 2    | 4       | 0    | 0        |
| US-F3    | 1    | 4       | 0    | 0        |
| **Total**| **6**| **11**  | **0**| **0**    |

No failures. The six passing criteria are genuinely clean; the eleven partial criteria all have concrete, addressable root causes documented in the gap items above.
