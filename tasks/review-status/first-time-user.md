<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review Status

**Last Updated:** 2026-07-06 14:45 ET

**Executive Summary:** Source-verified first-time user persona review (cycle 88, 2026-07-06). The onboarding modal is well-structured, adapts correctly to Master CV state (missing / empty skeleton / ready), and is reinforced by a permanent "? Help" button. The Job Input step is clear. However, the full 12-step workflow bar is visible from startup (steps are inert but not hidden), "Harvest", "Customise", and "Rewrites" carry no inline definition, the Customise stage exposes 9 tabs simultaneously without ordering guidance, and the three-step generation pipeline ("Step N of 3") is conveyed only through button tooltip text — button labels alone do not communicate the preview-vs-final distinction.

---

## Application Evaluation

### US-F1: First-Run Orientation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Entry screen explains first required action | ✅ Pass | Welcome modal (`session-manager.js:175–209`) shows on every startup for users at the `init` phase who have not dismissed it. Three adaptive content sections: **present** — green box "Your master profile is ready. Next: switch to the Job tab, provide a job description, and click Analyse Job" (`index.html:361–364`); **empty** — amber warning directing user to Master CV tab (`session-manager.js:139–141`); **missing** — "Start here (Step 1)" with file path and two action buttons (`index.html:374–383`). "Get Started" CTA closes modal and switches to the job tab (`session-manager.js:144–147`). A permanent "? Help" button (`index.html:63–66`) reopens the modal unconditionally mid-session. |
| Key workflow concepts understandable without domain knowledge | ⚠️ Partial | Welcome modal explains the 3-phase workflow (Build → Target → Harvest) in plain English. All 12 workflow step labels are visible from startup in the header bar (`index.html:122–148`): Job Input, Analysis, Customise, Rewrites, Spell Check, Layout Review, File Review, Cover Letter, Screening, Interview Prep, Thank You, Harvest. Each locked step has a hover tooltip with a plain-English description (`_STEP_DESCRIPTIONS`, workflow-steps.js:196–208, e.g. "Harvest: Save refined bullets, new skills, and summary variants back to your Master CV"), but tooltips are hover-only and unavailable on touch devices. "Harvest" is an agricultural metaphor; "Customise" understates 9 distinct sub-tabs; "Rewrites" implies user editing rather than AI-proposed rewrite approval. |
| First stage makes clear what data is needed and why | ✅ Pass | Job Input tab: textarea with placeholder "Paste the job description here…" (`job-input.js:114`), URL input field, and "🔍 Analyse Job" primary button. `app.js:93–99` injects a system message "📋 Job description detected — click Analyse Job when ready to begin." with a blue outline on the button when a job is loaded but not yet analysed. Welcome modal "present" state CTA navigates to the Job tab on dismiss. |
| Guard: users not dropped into a complex screen with no primary action | ⚠️ Partial | On page load `updateTabBarForStage('job')` (ui-core.js:1962) hides all tabs except Job — clean. Only the "🔍 Analyse Job" button is visible in the actions area. However, all 12 workflow steps are visible in the top nav bar from startup, including post-generation steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest). These are inert (workflow-steps.js:1170 returns without action for non-active, non-completed steps) but their labels are fully visible and unexplained. |
| Guard: terms without context do not appear | ⚠️ Partial | "Harvest" (index.html:146), "Rewrites" (index.html:130), "Customise" (index.html:128) appear in the workflow bar immediately. "ATS" appears in the position bar badge tooltip (`index.html:92`: "Applicant Tracking System (ATS) match score…") but the badge is hidden until after analysis. Step tooltips explain every term on hover; hover-only disclosure is insufficient for discovery. Welcome modal prerequisites note says "use the **⚙ LLM** button in the header" but the actual header button is labelled "LLM: [provider] ⚠ Not ready" (`index.html:51–62`) — label mismatch. |

**Failure modes observed:**
- All 12 steps including post-generation steps (Cover Letter → Harvest) are visible in the workflow bar from page load, though locked.
- "Customise" stage opens to "Goals" by default; the Goals tab content is document-length configuration — an advanced concept for a first-time user who has not seen any output yet.
- "ATS," "ATS DOCX," "DOCX" appear in settings (`index.html:642–645`) without inline definitions.
- Welcome modal prerequisites reference "⚙ LLM button" which does not match actual button text.

---

### US-F2: Progressive Disclosure Through the Workflow

| Criterion | Status | Evidence |
|-----------|--------|----------|
| UI reveals decisions in a staged way | ⚠️ Partial | Tab bar: `updateTabBarForStage()` (ui-core.js:556–565) correctly hides tabs to show only those relevant to the current stage — clean progressive disclosure at the tab level. Workflow step bar: all 12 steps are always visible, inert steps are inert but not hidden. Customise stage: `STAGE_TABS.customizations = ['goals','questions','exp-review','ach-editor','skills-review','achievements-review','tagline-review','summary-review','publications-review','ats-score']` (ui-core.js:354–356) — 9 tabs unlock simultaneously with no ordering guidance, required/optional distinction, or visit-tracking progress indicator. |
| Each stage communicates its purpose before demanding action | ⚠️ Partial | Step tooltip descriptions (`_STEP_DESCRIPTIONS`, workflow-steps.js:196–208) provide plain-language stage explanations on hover. Primary action buttons carry "Step N of 3" information in their `title` attributes (e.g., `spell-btn` title: "Step 1 of 3: Generate an HTML preview to review the layout before final DOCX/PDF files are produced", `index.html:194`). These are tooltip-only; button labels alone ("Generate Preview →", "Open Layout Review →", "Confirm Layout") do not convey the intermediate-vs-final distinction to a first-time reader. No persistent visible banner introduces any stage before demanding action. |
| Transition from one stage to the next feels predictable | ✅ Pass | Stage transitions are driven by backend phase and surfaced through step bar highlighting, chat messages, and toast notifications. `stateManager.onPhaseChange` fires `updateWorkflowStepsClickable` on every transition (ui-core.js:1966–1969). The generation sub-pipeline shows a live step checklist: "Rendering HTML → Generating PDF → Building DOCX files" with active/pending/complete states (`layout-instruction.js:1187–1210`). The `workflow-stage-announcer` aria-live region (`index.html:149–151`) announces stage changes to screen readers. |
| Workflow can be followed sequentially without guessing which surface is primary | ⚠️ Partial | Two navigation surfaces co-exist: the top workflow bar (step pills) and the second-row tab bar. A first-time user at Customise who has been working in the Skills tab, then clicks the "Customise" step pill, is routed to "goals" (workflow-steps.js:1186) — not their last-visited sub-tab. Dual action surfaces also exist at the Rewrite stage: a chat-area "Continue to Spell Check →" button and a separate inline button within the rewrite tab. |
| Post-layout steps unlock with no sequence guidance | ⚠️ Partial | After layout confirmation, six steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) unlock simultaneously (`ui-core.js:1857–1864`, `1921–1929`). No ordering guidance, no optional/required distinction. Only File Review (download step) is mandatory; the remaining five are optional but rendered with identical visual weight. |
| Stage transitions include sufficient feedback | ✅ Pass | Chat messages, step state changes (active → completed), and toast notifications are posted at every phase boundary. Generation step checklist provides granular in-progress feedback. |

---

### US-F3: Confidence Before Finalisation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| System communicates whether key review steps are complete | ⚠️ Partial | Workflow step pills show completed/active/stale/stale-critical states (workflow-steps.js:1007–1058). Within the Customise stage the 9 sub-tabs have no visit-tracking counter or required/optional indicator; a user cannot tell if they have reviewed all necessary sections. The Finalise tab's Submission Readiness Checklist (`finalise.js:163–213`) shows ✅/⚠️/❌ per item with a legend: "⚠ items are optional — they warn but do not block archiving. ❌ items must be resolved before submitting." This is clear once reached, but only at the very end of the workflow. |
| Relationship between generation, layout review, and finalisation is understandable | ⚠️ Partial | The three-step generation pipeline uses "Step N of 3" in button `title` attributes (`index.html:194–196`), but button labels alone do not indicate that step 1 produces a preview and step 3 produces final submission-ready files. Preview HTML files get a "Working file — not for submission" badge in the File Review tab (`download-tab.js:232–234`), which is clear once the file list is visible. The File Review tab also carries the note: "To download files immediately after generation, use the Generated Files tab" (`download-tab.js:408`). |
| Guard: preview generation confused with final completion | ✅ Pass | Preview files are clearly badged "Working file — not for submission" (`download-tab.js:232–234`). Preview file items use a dashed border (`download-tab.js:237`). The "Generate Preview →" button title confirms this is "Step 1 of 3: Generate an HTML preview…" (`index.html:194`). |
| Guard: optional post-generation actions look mandatory | ⚠️ Partial | Post-layout steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) unlock simultaneously with identical visual styling to mandatory steps. No badge, label, or tooltip specifically marks these as optional. The welcome modal describes Cover Letter as part of the standard workflow without flagging it as optional. |
| Guard: "Finalise & Archive" confused with application submission | ⚠️ Partial | The Finalise tab description reads "Archive this application to your CV history, update the response library, and optionally write any improvements back to Master CV Data" (`finalise.js:79–80`) — the archival/local nature is stated. However, the button label "✅ Finalise & Archive" carries no disclaimer that this does not send the application to an employer, and the description paragraph is above the generated files list where it may be skimmed. |

---

## Generated Materials Evaluation

Generated CV content is not directly inspectable from static source. Evaluation is based on output-related UI visible to a first-time user.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Output format names are clear | ⚠️ Partial | Settings modal exposes "ATS DOCX," "Human PDF," "Human DOCX" (`index.html:642–645`). "ATS DOCX" is unexplained; no inline definition. The ATS badge tooltip at `index.html:92` fully expands the abbreviation but is not shown until after analysis. |
| Download and File Review tabs explain what the user is downloading | ✅ Pass | Preview files are badged "Working file — not for submission." The layout review step tooltip correctly sets expectation ("Adjust margins, fonts, and column balance, then generate your final CV files," workflow-steps.js:202). |
| Harvest purpose is explained before use | ✅ Pass | Harvest step tooltip: "Save refined bullets, new skills, and summary variants back to your Master CV for future applications" (workflow-steps.js:208). Welcome modal step 3 also describes harvesting in plain language (`index.html:344–348`). |

---

## Terminology Analysis

| Term | Location | Issue |
|------|----------|-------|
| "Harvest" | Workflow bar (`index.html:146`), tab bar (`index.html:233`) | Agricultural metaphor; tooltip-only definition; no inline label at first view |
| "ATS" | Position bar badge (`index.html:92`), tab (`index.html:219`), settings (`index.html:642`) | Expanded in tooltip only; no inline first-use definition |
| "ATS DOCX" | Settings modal (`index.html:642`) | Both "ATS" and "DOCX" unexplained; purpose distinction from "Human DOCX" is opaque |
| "Customise" | Workflow step (`index.html:128`) | Covers 9 sub-tabs; label significantly understates scope |
| "Rewrites" | Workflow step (`index.html:130`), tab (`index.html:220`) | Implies user editing; actually an AI-proposed rewrite approval UI |
| "Non-confidential" badge | Header (`index.html:59`) | Amber warning badge; significance not explained inline |
| "Goals" tab | Under Customise stage | Tab name implies application strategy; content is document-length configuration — label/content mismatch |
| "Screening" | Workflow step (`index.html:140`), tab (`index.html:230`) | Abbreviation of "Screening Questions"; context-free on first view |
| "Layout outdated" / "Files outdated" | State chips (`state-manager.js:144–176`) | Informative but do not indicate what action to take |

---

## Additional Story Gaps / Proposed Story Items

**GAP-FTU-01 (new): LLM button label mismatch in onboarding modal**
Prerequisites note says "use the **⚙ LLM** button" but actual header button is labelled "LLM: [provider] ⚠ Not ready". New user cannot locate it by the described label. Severity: Low. Evidence: `index.html:51–62`; `session-manager.js:351–357`.

**GAP-FTU-02 (new): All 12 workflow steps visible from startup**
Locked steps are inert but their labels (Harvest, Screening, Interview Prep) are exposed before context exists. Consider hiding post-generation steps (Cover Letter → Harvest) until layout is confirmed, or grouping them behind an expandable section. Severity: Medium. Evidence: `index.html:122–148`; `ui-core.js:1946–1972`.

**GAP-FTU-03 (new): Customise stage — 9 tabs with no ordering guidance**
No "start here" callout, no required/optional distinction, no visit-tracking progress counter. A first-time user at Customise has no orientation. Proposed fix: introductory banner or ordered checklist on first arrival at the stage. Severity: High. Evidence: `ui-core.js:354–356`.

**GAP-FTU-04 (new): Post-layout steps lack sequence and optionality guidance**
Cover Letter, Screening, Interview Prep, Thank You, Harvest all unlock simultaneously with equal visual weight. No indication of recommended order or which are optional. Severity: Medium. Evidence: `ui-core.js:1857–1864`, `1921–1929`.

**GAP-FTU-05 (new): "Finalise & Archive" risks confusion with actual submission**
No explicit disclaimer that archiving is a local tracking action and does not send the application to an employer. Propose one sentence adjacent to the button. Severity: Medium. Evidence: `finalise.js:123–128`.

**GAP-FTU-06 (new): Generation pipeline "Step N of 3" labels are tooltip-only**
The preview-vs-intermediate-vs-final distinction in the generation pipeline is conveyed only through button `title` attributes. Button labels alone ("Generate Preview →", "Open Layout Review →", "Confirm Layout") do not communicate the pipeline to a first-time reader scanning the UI. Severity: Medium. Evidence: `index.html:193–198`.

**GAP-FTU-07 (carried): Goals tab naming mismatch**
"Goals" tab name implies application strategy; content is document-length configuration. Label/content mismatch adds confusion at the entry to the most complex stage. Severity: Low. Evidence: Goals tab in Customise stage.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/session-manager.js, web/workflow-steps.js, web/finalise.js, web/download-tab.js, web/layout-instruction.js

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-F1 | 2 | 3 | 0 | 0 | 0 |
| US-F2 | 2 | 4 | 0 | 0 | 0 |
| US-F3 | 1 | 4 | 0 | 0 | 0 |
| **Overall** | **5** | **11** | **0** | **0** | — |

**Key evidence references:**
- Welcome modal (adaptive 3-state logic): `session-manager.js:114–299`; `index.html:322–403`
- Tab-bar progressive disclosure: `ui-core.js:352–367`, `556–565`
- Workflow step locking/tooltips: `ui-core.js:1845–1944`; `workflow-steps.js:196–224`
- Customise 9-tab simultaneous unlock: `ui-core.js:354–356`
- "Step N of 3" button titles: `index.html:193–198`
- Generation step checklist: `layout-instruction.js:387–389`, `1187–1210`
- Preview/final file distinction: `download-tab.js:64–68`, `232–234`
- Submission readiness checklist: `finalise.js:163–213`
- Post-layout step unlock: `ui-core.js:1857–1864`, `1921–1929`
- "? Help" button: `index.html:63–66`

**Evidence standard:** All conclusions cited against non-bundle source files (session-manager.js, ui-core.js, workflow-steps.js, layout-instruction.js, finalise.js, download-tab.js). No citations rely solely on bundle.js line numbers.
