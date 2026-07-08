<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time-User Review Status

**Last Updated:** 2026-07-07 20:14 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### US-F1: First-Run Orientation

| # | Criterion (abbreviated) | Status | Notes / File:Line refs |
|---|--------------------------|--------|------------------------|
| 1 | Entry screen explains the first required action clearly | ✅ Pass | Onboarding modal (`web/index.html:342-424`) is shown on every startup until dismissed (`maybeShowWelcomeModal()`, `web/session-manager.js:176-210`). When `Master_CV_Data.json` is missing it shows "⚠️ Start here (Step 1): your master profile was not found at: …" (`index.html:395-405`); when present it shows "✅ Your master profile is ready. Next: switch to the Job tab, provide a job description, and click Analyse Job." (`index.html:381-385`). |
| 2 | Key workflow concepts understandable without domain-specific prior knowledge | ⚠️ Partial | The header/AI-Model and step-pill renames (cycles 102–103) are clean and well done (see Terminology section below), **but** the onboarding modal's own "How it works" step 3 still reads "**Harvest improvements**" (`index.html:368`) — the exact jargon term the workflow step pill was renamed away from ("Update Master CV", `index.html:153,241`). A first-time user reads "Harvest improvements" in the modal, then never sees that word again in the top nav, then — if they click through to the actual tab — sees it reappear as "🌾 Harvest Improvements" (`web/harvest.js:284,309,366,380,386,418`). This is an incomplete rename, not a design intent; see Terminology section for full evidence. |
| 3 | First stage makes clear what data is needed and why | ✅ Pass | Onboarding step 1 explains `Master_CV_Data.json` purpose (`index.html:358-359`); Job tab empty state: "Job description and analysis results will appear here" (`index.html:264`); chat input placeholder "Type a message (e.g., 'analyse job')" (`index.html:192`). |

**Failure Modes Present**

| Failure mode | Present? |
|--------------|----------|
| Users dropped into a complex screen with no clear primary action | ⚠️ Partially mitigated — the onboarding modal blocks the full-complexity screen on first load and gives one clear CTA ("Get Started" / "Create empty profile"), but once dismissed the user immediately sees a 15-pill workflow nav (`index.html:129-154`) with 13 arrows, a position bar with 3 metric widgets, and a 20+-item tab bar (`index.html:216-241`, only a subset shown per stage via `updateTabBarForStage()`, `web/ui-core.js:564-583`). Most pills are inert (locked) until reached, but clicking a locked pill produces **no feedback at all** — `handleStepClick()` silently returns (`web/workflow-steps.js:1174-1175`: `if (!el.classList.contains('completed') && !el.classList.contains('active')) return;`). A first-time user who clicks "Cover Letter" or "Finalise" out of curiosity gets no toast, no message, nothing — only a native `title` tooltip they may never hover to see. |
| Terms like rewrites, customisations, layout review, or harvest appearing without context | ⚠️ Present for "harvest" — see Terminology section. "Rewrites", "Customise", and "Layout Review" step pills each have an explanatory tooltip via `_STEP_DESCRIPTIONS` (`web/workflow-steps.js:197-210`), so those are adequately contextualized. |

### US-F2: Progressive Disclosure Through the Workflow

| # | Criterion (abbreviated) | Status | Notes / File:Line refs |
|---|--------------------------|--------|------------------------|
| 1 | UI reveals next set of decisions in a staged way | ✅ Pass | `STAGE_TABS` map (`web/ui-core.js:358-372`) + `updateTabBarForStage()` (`web/ui-core.js:564-583`) hide all tabs outside the current stage. `handleStepClick()` gates navigation to completed/active/forward-skip steps only (`web/workflow-steps.js:1146-1175`). |
| 2 | Each stage communicates its purpose before demanding action | ✅ Pass | Every step pill has a purpose tooltip via `_STEP_DESCRIPTIONS` (`web/workflow-steps.js:197-210`, e.g. `job: 'Paste a job description to start tailoring your CV.'`); primary action buttons carry explicit staged titles: "Step 1 of 3: Generate an HTML preview…", "Step 2 of 3: Review and adjust layout settings…", "Step 3 of 3: Confirm layout and produce final…" (`index.html:201-204`). |
| 3 | Transition from one stage to the next feels predictable | ✅ Pass | `#tab-stage-label` shows "Now viewing: {step}" (`web/ui-core.js:578-582`); `#workflow-stage-announcer` is an `aria-live` region for screen readers (`index.html:156-158`); re-run/back-nav is gated behind a confirmation modal listing affected downstream stages (`_showReRunConfirmModal`, `web/workflow-steps.js:139-189`). |

**Failure Modes Present**

| Failure mode | Present? |
|--------------|----------|
| Too many tabs, controls, or special cases exposed before the user understands the current step | ⚠️ Partially present — all 15 workflow-stage pills render simultaneously on first load (`index.html:129-154`), which is a lot of vocabulary ("Rewrites", "Spell Check", "Layout Review", "File Review", "Screening", "Interview Prep", "Thank You", "Finalise", "Update Master CV") to show a brand-new user before they've done anything. Mitigated by per-stage tab filtering but the top-level step bar itself is not progressively revealed — it's the full itinerary up front. |
| Major stage transitions happening with insufficient explanation | Not present — see criterion 3 evidence above. |

### US-F3: Confidence Before Finalisation

| # | Criterion (abbreviated) | Status | Notes / File:Line refs |
|---|--------------------------|--------|------------------------|
| 1 | System communicates whether key review steps are complete | ✅ Pass | `_renderReadinessChecklist()` in `web/finalise.js:164-216` renders a "📋 Submission Readiness" panel with ✅/⚠/❌ icons per item (CV PDF/DOCX/HTML generated, cover letter, screening Q&A, ATS validation, layout freshness) and an explicit legend: "⚠ items are optional — they warn but do not block archiving. ❌ items must be resolved before submitting." (`web/finalise.js:211-214`). |
| 2 | Relationship between generation, layout review, and finalisation is understandable | ✅ Pass | Explicit "Step 1 of 3 / Step 2 of 3 / Step 3 of 3" button titles (`index.html:201-204`); layout freshness chip labels "Layout current" / "Layout outdated" / "Files outdated" (`web/state-manager.js:145-177`) keep the user oriented about whether previewed content matches the latest edits. |
| 3 | The final stage distinguishes clearly between archive/finalise actions and optional follow-on work | ✅ Pass, with one design wrinkle | The Finalise tab's readiness checklist explicitly marks Cover Letter/Screening as optional (`web/finalise.js:186-187,211-214`), and the "Archive Application" button is clearly separated from the harvest/update-master-CV step that follows (`web/app.js:158-162`, GAP-325 rename). **Wrinkle:** the top-level step-pill order lists Cover Letter → Screening → Interview Prep → Thank You *before* Finalise (`index.html:141-153`), visually implying they are required prerequisites to reach Finalise, even though the readiness checklist says they're optional. A first-time user skimming only the top nav (not the checklist) could reasonably infer all four must be completed first. |

**Failure Modes Present**

| Failure mode | Present? |
|--------------|----------|
| Users mistaking preview generation for final completion | ✅ Not present — "Step X of 3" labelling and layout-freshness chip disambiguate preview vs. final state clearly. |
| Optional post-generation actions looking mandatory, or vice versa | ⚠️ Partially present — see the step-order wrinkle noted in criterion 3 above. |

---

## Terminology Findings (Central to This Persona)

### "AI Model" / "Working…" rename (cycles 102–103): largely successful

- Header button: `AI Model:` label + `model-current-label` (`index.html:52-63`) — clean, no "LLM" visible.
- Modal titles: "AI Model Configuration Wizard" (`index.html:446`), "AI Model Defaults" (`index.html:613`), "AI Model Retry Policy (Browser)" (`index.html:681`) — clean.
- Busy indicators: `#llm-busy-label` → "Working…" (`index.html:170`), `#llm-thinking` → "Working…" (`index.html:183`) — clean; only element `id`s retain `llm-*`, which is invisible to users.
- Onboarding prerequisites: "An AI Model provider configured — use the **AI Model** button in the header before your first session" (`index.html:376`) — clean.
- HTML `<!-- LLM busy overlay -->` / `<!-- LLM Configuration Wizard -->` comments (`index.html:166,181,442`) still say "LLM" but these are source comments, never rendered to the user — **N/A**, not a persona-facing issue.

### "LLM" jargon still leaks into user-visible text elsewhere in the app — ⚠️ Not fully removed

The rename appears to have been scoped to `index.html` and header/modal chrome only. The word "LLM" is still shown to users in numerous tooltips, chat messages, and panel copy across the tab-rendering JS modules:

- Tooltips on bulk-action buttons: `title="Set all to the LLM recommendation"` — `web/achievements-review.js:344`, `web/experience-review.js:292`, `web/skills-review.js:1057`.
- System chat message shown before every job/cover-letter/screening/harvest submission: `` `ℹ️ Content you submit is sent to the configured LLM provider${label} for analysis...` `` — `web/job-analysis.js:106`, `web/cover-letter.js:233`, `web/screening-questions.js:237`, `web/harvest.js:333`.
- Error message: `"LLM did not return a cover letter."` — `web/cover-letter.js:307`.
- Harvest tab copy: `"⚠️ LLM analysis unavailable…"` and `"Review LLM-scored candidates for promotion to your master CV."` and `"...running LLM analysis…"` — `web/harvest.js:272,286,369`.
- Spell-check summary: `"⚠ No customisation sections reviewed — experience, skill, and achievement selections are all LLM defaults."` — `web/spell-check.js:399`.
- Debug/log panel label: `"LLM Interaction"` — `web/llm-log.js:101`.

A first-time user who has just been taught the app calls this "AI Model" in the header will, minutes later inside the actual workflow, see raw "LLM" in tooltips and system messages with zero definition — reintroducing exactly the confusion the rename was meant to eliminate.

### "Harvest" step rename (cycles 102–103): renamed in navigation chrome, NOT propagated to the destination content — ❌ Fail

The step pill (`index.html:153`) and tab label (`index.html:241`) were correctly renamed to "🌾 Update Master CV", and `workflow-steps.js`'s `_STEP_DISPLAY`/`_STEP_DESCRIPTIONS` maps were updated to match (`web/workflow-steps.js:50,209`). However, the actual page a user lands on when they click that pill still displays the old term:

- `web/harvest.js` — the module that renders the "Update Master CV" tab content (dispatched from `web/review-table-base.js:426-427` `case 'harvest': populateHarvestTab()`) — headings read **"🌾 Harvest Improvements"** in three places: `renderHarvestTabHtml()` (`harvest.js:284`), `renderEmptyStateHtml()` (`harvest.js:309`), and the loading/error states inside `populateHarvestTab()` (`harvest.js:366,380,386`).
- Onboarding modal step 3 still says **"Harvest improvements"** (`index.html:368`), not "Update your master profile" or similar.
- Thank-You placeholder tab's call-to-action button: **"Proceed to Harvest Improvements →"** (`web/thank-you.js:36`).
- Master CV modal copy (shown while editing the profile, i.e. very early in a first-time user's session): "These are cross-role highlights... The **Harvest feature (Harvest tab)** can add new ones from your current session." (`web/master-cv.js:328`) and "Use the **Harvest feature** to add achievements from a completed session…" (`web/master-cv.js:1783`).
- Skills review hint: "…available for write-back to master CV in the **Harvest tab**)" (`web/skills-review.js:1193`).

Notably, `web/finalise.js`'s own embedded post-archive section (a *different*, second surface that also offers to write improvements back to the master CV) **was** correctly renamed to "📥 Update Master CV Data" (`finalise.js:360,370,382,399,460`) — proving the team knows the target wording; it just wasn't applied to `harvest.js`, `thank-you.js`, `master-cv.js`, or the onboarding modal. This is a partial/inconsistent rename, and for a first-time user it is worse than not renaming at all: the same feature is called three different things in three different places within one session ("Update Master CV" in the top nav, "Harvest Improvements" when you actually open it, "Update Master CV Data" if you reach it via Finalise instead).

---

## Generated Materials Evaluation

Not applicable to this persona pass — the first-time-user story (US-F1–F3) concerns onboarding and in-app orientation, not the quality of generated CV/cover-letter documents. No generated-materials findings recorded here; see `resume-expert`/`hr-ats` review files for document-quality evaluation.

## Additional Story Gaps / Proposed Story Items

- **Locked-step click feedback**: no acceptance criterion currently covers what happens when a user clicks a step pill they haven't unlocked yet. Currently: nothing happens (`web/workflow-steps.js:1174-1175`). Propose a new criterion under US-F2: "Clicking a locked/future step gives some feedback (toast, shake, or tooltip auto-show) rather than silently doing nothing."
- **Terminology consistency across a rename**: US-F1's failure-mode list names specific jargon terms to avoid (rewrites, customisations, layout review, harvest) but the story set has no acceptance criterion requiring that a renamed term be applied *consistently everywhere it appears*, only that jargon not appear "without context." Propose adding: "When a workflow-stage term is renamed, the same new term is used in every surface a first-time user can reach for that stage (nav pill, tab heading, onboarding copy, and any related feature descriptions), not just the primary navigation chrome."
- **Step-order vs. optionality mismatch**: no current criterion covers the case where the linear step nav visually implies a required order that the actual business logic treats as optional (Cover Letter/Screening/Interview Prep/Thank You before Finalise). Propose adding to US-F3: "Steps that are optional are visually distinguishable from required steps in the primary workflow nav, not only in a secondary checklist."

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus web/session-manager.js, web/workflow-steps.js, web/harvest.js, web/finalise.js, web/thank-you.js, web/master-cv.js, web/skills-review.js, web/achievements-review.js, web/experience-review.js, web/cover-letter.js, web/job-analysis.js, web/screening-questions.js, web/spell-check.js, web/llm-log.js, web/review-table-base.js

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-F1 | 2 | 1 | 0 | 0 | 0 |
| US-F2 | 3 | 0 | 0 | 0 | 0 |
| US-F3 | 3 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- US-F1.1: Onboarding modal blocking first action → `web/index.html:342-424`, `web/session-manager.js:176-210`
- US-F1.2: Stale "Harvest improvements" text inside otherwise-renamed onboarding modal → `web/index.html:368`
- US-F2.1: Stage-scoped tab visibility → `web/ui-core.js:358-372,564-583`
- US-F3.1: Optional-vs-required legend in readiness checklist → `web/finalise.js:211-214`
- Terminology: "LLM" jargon still shown to users outside index.html chrome → `web/achievements-review.js:344`, `web/harvest.js:272,286,333,369`, `web/cover-letter.js:233,307`, `web/job-analysis.js:106`, `web/screening-questions.js:237`, `web/spell-check.js:399`, `web/llm-log.js:101`
- Terminology: "Harvest" jargon still shown to users despite step/tab rename → `web/harvest.js:284,309,366,380,386,418`, `web/thank-you.js:36`, `web/master-cv.js:328,1783`, `web/skills-review.js:1193`, `web/index.html:368`
- Terminology: same feature named three different ways in one session ("Update Master CV" nav pill vs. "Harvest Improvements" tab heading vs. "Update Master CV Data" finalise-embedded section) → `web/index.html:153,241` vs. `web/harvest.js:284` vs. `web/finalise.js:360`
- Locked-step click gives no feedback → `web/workflow-steps.js:1174-1175`

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
