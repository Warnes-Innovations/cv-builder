<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review Status

**Last Updated:** 2026-06-29 23:00 ET

**Executive Summary:** Cycle 9 source review. Since the Cycle 8 review (2026-06-29 17:30 ET), twelve commits landed that affect the first-time user path. The highest-impact changes are: GAP-76/77 (welcome modal now explicitly lists LLM provider setup as a prerequisite), GAP-194 (three advance buttons relabeled to eliminate ✅-icon collision and clarify destinations), and GAP-115 (persistent non-confidential LLM badge for non-private providers). The LLM prerequisite disclosure resolves the most critical first-time-user alarm issue partially. Net change: AC-F1.1 upgrades from ⚠️ Partial to ✅ Pass; AC-F3.2 upgrades from ⚠️ Partial to ⚠️ Partial (improved — one sub-issue resolved, pipeline visibility gap persists). All other ratings are unchanged. Summary: 2 Pass / 7 Partial (same totals as cycle 8 — one new Pass from AC-F1.1, cycle-8 pass AC-F2.3 unchanged).

---

## Application Evaluation

### US-F1: First-Run Orientation

**Story:** A first-time user should understand what the application does and how to begin without prior training.

---

#### AC-F1.1 — A new user can identify the first step and expected input without external help

**Rating:** ✅ Pass

**Evidence:**

The onboarding modal (`index.html:315–397`) fires on every startup until `cv-builder-welcome-dismissed` is set in localStorage (via `maybeShowWelcomeModal()` in `session-manager.js:172–195`). It presents a numbered 3-phase "How it works" summary and branches on master CV state:

- `#welcome-section-present` (`index.html:355–360`): green banner "Your master profile is ready. Next: switch to the Job tab, provide a job description, and click Analyze Job." — clear next action.
- `#welcome-section-empty` (`index.html:362–367`): amber warning directing user to the Master CV tab — clear directive.
- `#welcome-section-missing` (`index.html:369–380`): amber warning with two action paths (create empty profile / place existing file) — clear options.

**New in this cycle (GAP-76/77, commit `defc451`):** A "Prerequisites" section is now always rendered in the modal body (`index.html:346–353`):

```html
<strong style="color: #1e293b;">Prerequisites:</strong>
<ul>
  <li>A <code>Master_CV_Data.json</code> profile (the app will help you create one)</li>
  <li>An LLM provider configured — use the <strong>⚙ LLM</strong> button in the header before your first session</li>
</ul>
```

This explicitly names LLM provider setup as a prerequisite and tells the user which button to use. The prior complaint that the welcome modal made no mention of LLM setup is now resolved.

**Remaining minor issue:** The "Don't show again" checkbox (`index.html:387`) is still on `welcome-footer-present`, which is also shown for the `welcome-section-empty` branch (`session-manager.js:133–135`). A user in the empty-profile state can check this box before completing onboarding. This risk is reduced because the Prerequisites note now always appears above the state-specific section, giving minimum guidance even if the user dismisses early.

**Remaining minor issue:** The welcome modal body references `Master_CV_Data.json` in `<code>` elements three times (`index.html:332, 349, 377`). The tab is labeled "📚 Master CV Profile" — the filename creates a mild vocabulary mismatch for non-technical users. Unchanged from prior cycles.

---

#### AC-F1.2 — Stage names and action labels are understandable in context

**Rating:** ⚠️ Partial

**Evidence:**

The top workflow bar still exposes all 13 stage labels simultaneously at page load (`index.html:119–142`):

```text
📥 Job Input → 🔍 Analysis → ⚙️ Customise → ✏️ Rewrites → 🔤 Spell Check →
🎨 Layout Review → ⬇️ Download → 📩 Cover Letter → 📋 Screening →
🎤 Interview Prep → 🙏 Thank You → 🌾 Harvest
```

Labels that remain opaque to first-time users:

- **"Customise"** (`index.html:124`): Cannot tell from the label that this means reviewing AI-recommended skills and experience selections.
- **"Rewrites"** (`index.html:126`): Ambiguous — does the user rewrite, or does the AI rewrite for the user?
- **"Harvest"** (`index.html:142`): Domain jargon. Tooltip text "Harvest improvements" is hover-only. Welcome modal step 3 defines it but uses the same vocabulary.
- **"LLM:"** in the header (`index.html:53`): Technical acronym still never spelled out in the UI; the Prerequisites note in the welcome modal says "LLM provider" without definition. Partially mitigated by the new prerequisite note directing users to the ⚙ LLM button.

**New in this cycle (GAP-194, commit `fb22d6f3`):** Two previously confusing advance buttons were relabeled:

- `#final-generate-proceed-btn`: "✅ Proceed to Finalise →" → **"📥 Continue to File Review →"** (`index.html:189`)
- `#finalise-action-btn`: "✅ Finalise" → **"📦 Package Application Files"** (`index.html:190`)

These labels are clearer for first-time users. "Package Application Files" sets more accurate expectations than "Finalise" (which was ambiguous about what it produces). The earlier duplicate ✅ icon conflict between "Confirm Layout" and the former "Proceed to Finalise →" is also resolved.

No changes to workflow step terminology (Harvest, Customise, Rewrites, LLM acronym).

---

#### AC-F1.3 — The first stage makes clear what data is needed and why

**Rating:** ⚠️ Partial

**Evidence:**

- When the session has no job description, `showLoadJobPanel()` (`job-input.js:91–183`) renders a textarea with placeholder "Paste the job description here…" and three input method tabs (Paste Text / From URL / Upload File). Adequate once shown.
- The generic empty-state fallback (`index.html:232–236`) reads "Select a tab to view content / Job description and analysis results will appear here" and appears before the job panel loads. It contains no call to action and no explanation of what job description format is expected.
- The `🔍 Analyze Job` button (`index.html:186`) is rendered and enabled before any job description is pasted; clicking it with an empty input produces an error with no adjacent proactive guidance.

No changes to this area in this cycle.

---

### US-F2: Progressive Disclosure Through the Workflow

**Story:** The UI should reveal decisions at the moment they become relevant, not all at once.

---

#### AC-F2.1 — The UI reveals the next set of decisions in a staged way rather than all at once

**Rating:** ⚠️ Partial

**Evidence:**

**Positive:** The secondary tab bar implements progressive disclosure correctly. `updateTabBarForStage()` (`ui-core.js:619–628`) hides all tabs except those listed in `STAGE_TABS[stage]` (`ui-core.js:350–363`). At startup, only the `job` tab is shown. The chat-panel action button row exposes only one primary action at a time via `display:none` toggling (`index.html:183–190`).

**Negative:** The top workflow bar does not apply progressive disclosure — all 13 workflow steps are always rendered visible (`index.html:119–142`). They are gated by interactivity (the `onclick`/`tabindex` attributes are conditionally set by `updateWorkflowStepsClickable()` in `ui-core.js:1891–1975`), but they are fully visible as static indicators from the first page load. A first-time user completing Step 1 sees Harvest, Thank You, Screening, Interview Prep, Cover Letter, and Download already laid out in front of them. (GAP-78, open.)

The Customise stage (`STAGE_TABS.customizations`, `ui-core.js:353`) exposes 10 secondary tabs simultaneously with no ordering guide, intro text, or sequencing hint.

No changes to this area in this cycle.

---

#### AC-F2.2 — Each stage communicates its purpose before demanding action

**Rating:** ⚠️ Partial

**Evidence:**

- **Job stage:** The load-job panel (`job-input.js:91–183`) is adequate once rendered, but the empty-state seen before it loads (`index.html:232–236`) has no explanatory text.
- **Analysis stage:** `populateAnalysisTab()` renders a structured breakdown after completion; no preamble sets expectations before the user clicks Analyze.
- **Customise stage:** 10 tabs appear simultaneously with no ordering hint or introductory paragraph.
- **Layout Review stage:** A scope label states "💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." Strong positive; unchanged.
- **Spell Check stage:** The "no issues found" zero-state (`spell-check.js:135–151`) reads "Continue when you are ready to generate your CV." Adequate contextual guidance.
- **Finalise stage:** `populateFinaliseTab()` (`finalise.js:68–71`) opens with: "Archive this application to your CV history, update the response library, and optionally write any improvements back to Master CV Data." Reasonable one-line preamble.

No new stage-purpose changes in this cycle.

---

#### AC-F2.3 — Stage transitions include enough feedback to keep a new user oriented

**Rating:** ✅ Pass

**Evidence:**

- The LLM busy overlay (`index.html:152–160`) shows a spinner, elapsed time counter, "Taking longer than usual" state badge, and a Stop button during in-flight LLM calls.
- `#llm-busy-label` has `aria-live="polite" role="status"` (`index.html:155`), so screen readers announce operation status changes.
- The conversation panel logs system messages at transitions: "Auto-analyzing loaded job description…" (`app.js:92`), "✅ Connection successful." (`app.js:72`).
- Phase changes trigger `stateManager.onPhaseChange()` → `updateWorkflowStepsClickable()`, unlocking the next workflow step pill.
- `updateWorkflowSteps()` (`workflow-steps.js`) appends `<span class="sr-only">` per step pill with state labels, improving transition feedback for assistive technology users.
- The step bar applies `active` (blue, `styles.css:151`), `completed` (green, `styles.css:153`), `stale` (amber, `styles.css:156`), and `stale-critical` (red, `styles.css:157`) CSS classes.

Unchanged from prior cycles.

---

### US-F3: Confidence Before Finalisation

**Story:** A first-time user should know when application materials are ready, distinguish preview from final, and understand what is optional versus required.

---

#### AC-F3.1 — The system communicates whether key review steps are complete

**Rating:** ⚠️ Partial

**Evidence:**

The Finalise tab now includes a `_renderReadinessChecklist()` (`finalise.js:125–176`) that renders a "📋 Submission Readiness" panel with per-item ✅ / ⚠ / ❌ indicators for: CV PDF, CV DOCX, CV HTML, Cover Letter, Screening Q&A, ATS validation, and Layout freshness. The legend at the bottom explicitly distinguishes required from optional: "⚠ items are optional — they warn but do not block archiving. ❌ items must be resolved before submitting." (`finalise.js:172–174`) This is a meaningful improvement for completion confidence at the final stage.

**Remaining issues (unchanged):**

- The `layout-freshness-chip` (`index.html:96`) is invisible until a preview has been generated (`showChip: false` when `previewAvailable` is `false`, `state-manager.js:127–136`). Before any preview exists, there is no completion signal during the critical early stages.
- There is no visual checklist, progress indicator, or "N of M steps complete" summary anywhere in the UI before the Finalise tab is reached. (GAP-14, open.)
- The workflow step bar applies `active`, `completed`, and `upcoming` CSS classes (`styles.css:149–154`) but no legend exists to explain what blue vs. green vs. grey means.

---

#### AC-F3.2 — The relationship between generation, layout review, and finalisation is understandable

**Rating:** ⚠️ Partial

**Evidence:**

**Improved in this cycle (GAP-194):** The three post-layout advance buttons now carry distinct, descriptive labels that better communicate their destinations:

- `"🎨 Open Layout Review →"` (`index.html:187`): clear destination.
- `"✅ Confirm Layout"` (`index.html:188`): confirms layout; unchanged.
- `"📥 Continue to File Review →"` (`index.html:189`): was "✅ Proceed to Finalise →", now explicitly references "File Review" as the destination.
- `"📦 Package Application Files"` (`index.html:190`): was "✅ Finalise", now describes what the action produces.

The prior ✅-icon ambiguity (Confirm Layout vs. Proceed to Finalise both showed ✅) is resolved.

**Remaining issues (unchanged):**

1. The three-step generation pipeline (spell check → preview/layout review → confirm → final files) is never communicated as a numbered sequence anywhere in the visible UI before the user encounters it. There is no "Step 1 of 2: Preview" indicator on the Layout Review screen.

2. `GENERATION_PHASES` defines four phases (`idle`, `layout_review`, `confirmed`, `final_complete`), all tracked in code (`state-manager.js:57–62`), but no pipeline summary, phase label, or step count is ever displayed to the user.

3. The `layout-freshness-chip` chip states ("Layout current", "Layout outdated", "Files outdated") communicate staleness without defining the pipeline they represent. A user who has not read documentation does not know what "Layout current" confirms.

(GAP-79, open.)

---

#### AC-F3.3 — The final stage distinguishes clearly between archive/finalise actions and optional follow-on work

**Rating:** ⚠️ Partial

**Evidence:**

The Finalise tab (`finalise.js:67–116`) contains a clear preamble, a readiness checklist with optional vs. required distinction, a status dropdown, notes textarea, and `"✅ Finalise & Archive"` primary action button. The checklist legend (`finalise.js:172–174`) now makes optional vs. required items explicit with ⚠ / ❌ icons and explanatory text.

**Structural issue (unchanged):** The Finalise tab (`#tab-finalise`) is hidden at page load (`style="display:none"`, `index.html:223`). The workflow step bar transitions directly from "⬇️ Download" to "📩 Cover Letter" (`index.html:132–134`) — "Finalise" does not appear as a step. A user navigating by the step bar will not discover the Archive step.

**Post-download optional steps (unchanged):** Cover Letter, Screening, Interview Prep, Thank You, and Harvest are presented in the step bar as a linear continuation of the required pipeline with no visual separator, section label, or "Optional" annotation. A first-time user cannot distinguish mandatory CV-delivery steps from supplementary extras. The relabeling of `#finalise-action-btn` to "📦 Package Application Files" is an improvement in isolation but does not address the workflow bar's structural presentation of these steps as mandatory sequence items.

---

## Generated Materials Evaluation

No generated CV, cover letter, DOCX, or PDF files were inspected in this review cycle. Evaluation is limited to application UI and workflow source code.

---

## Terminology Audit for First-Time Users

| Term in UI | First-time-user clarity | Status |
| --- | --- | --- |
| Harvest | ❌ Opaque | No definition in context; step bar shows bare "🌾 Harvest"; tooltip "Harvest improvements" (via `title`) is hover-only; welcome modal step 3 defines it but uses the same vocabulary (GAP-78 open) |
| Customise | ⚠️ Partial | Could mean free-text edit; actually means reviewing AI recommendations |
| Rewrites | ⚠️ Partial | Ambiguous: does the user rewrite, or does the AI? |
| Layout Review | ⚠️ Partial | Scope label correctly constrains to layout-only; difference from Download tab not obvious |
| ATS | ⚠️ Partial | Acronym; expanded as "ATS-optimised" in onboarding modal body — not defined inline at point of use |
| LLM | ⚠️ Partial | Technical acronym in header ("LLM:"); the welcome modal now names it as a prerequisite and directs users to the ⚙ LLM button (GAP-76 partially resolved); acronym still not spelled out |
| Master CV Profile | ⚠️ Partial | Explained in onboarding; but referenced as `Master_CV_Data.json` in same modal — jarring technical vocabulary switch |
| Finalise & Archive | ✅ Clear | Verb pair is actionable and understandable |
| Package Application Files | ✅ Clear | New label (GAP-194); describes what the action produces |
| Analyze Job | ✅ Clear | Imperative verb; primary entry action |
| Generate Preview → | ✅ Clear | Chat-panel spell-btn and viewer-panel buttons consistent (GAP-181 resolved cycle 7) |
| Open Master CV | ✅ Clear | Direct and actionable |
| Continue to File Review → | ✅ Clear | New label (GAP-194); clearly names the destination tab |
| Generate Final Files | ⚠️ Partial | "Final" has no defined contrast with the prior preview step — pipeline distinction unexplained (GAP-79 open) |

---

## Cycle 9 Delta: What Changed Since Cycle 8

| Item | Cycle 8 finding | Cycle 9 status |
| --- | --- | --- |
| GAP-76: LLM provider prerequisite invisible at onboarding | ❌ Open | ✅ RESOLVED — Prerequisites section in welcome modal (`index.html:346–353`) now explicitly lists "An LLM provider configured — use the ⚙ LLM button in the header before your first session" |
| GAP-77: Welcome modal improvements | Open | ✅ RESOLVED alongside GAP-76 |
| GAP-194: Advance buttons with ✅-icon collision | Open | ✅ RESOLVED — "Proceed to Finalise →" → "Continue to File Review →"; "Finalise" → "Package Application Files" (`index.html:189–190`) |
| GAP-115: Non-confidential LLM badge | Absent | ✅ RESOLVED — `#llm-non-confidential-badge` added (`index.html:59`); displayed when provider is not confidential; no first-time-user negative impact |
| GAP-110: Restored-decisions summary | Open | ✅ RESOLVED — session restore now summarizes what was loaded; reduces confusion on page reload for all users |
| AC-F1.1: first step identifiable without external help | ⚠️ Partial | ✅ Pass — LLM prerequisite now in welcome modal; residual minor issues remain |
| AC-F1.2: stage names understandable | ⚠️ Partial | ⚠️ Partial — unchanged for Harvest/Customise/Rewrites; "Package Application Files" and "Continue to File Review" are improvements |
| AC-F1.3: first stage data needs | ⚠️ Partial | ⚠️ Partial — unchanged |
| AC-F2.1: progressive disclosure | ⚠️ Partial | ⚠️ Partial — unchanged |
| AC-F2.2: stage purpose before action | ⚠️ Partial | ⚠️ Partial — unchanged |
| AC-F2.3: stage transition feedback | ✅ Pass | ✅ Pass — unchanged |
| AC-F3.1: review steps complete signal | ⚠️ Partial | ⚠️ Partial — readiness checklist in Finalise tab is positive; systemic absence of progress indicator before Finalise persists (GAP-14 open) |
| AC-F3.2: preview vs. final pipeline visible | ⚠️ Partial | ⚠️ Partial — button labels improved; pipeline sequencing still not surfaced to user (GAP-79 open) |
| AC-F3.3: optional vs. required final steps | ⚠️ Partial | ⚠️ Partial — readiness checklist improves Finalise tab; step bar structural issue unchanged |
| GAP-14: Workflow progress indicator | Absent | Still absent |
| GAP-78: Workflow step bar progressive disclosure | Open | Still open |
| GAP-79: Preview vs. final pipeline invisible | Open | Still open |
| "Don't show again" suppressible in empty state | Open | Still unaddressed (risk reduced by always-visible Prerequisites section) |

---

## Top Issues by Priority

1. **[US-F2 / AC-F2.1 + US-F1 / AC-F1.2 — ⚠️ Partial — GAP-78 open]** All 13 workflow step pills are visible from first page load (`index.html:119–142`). Interactivity is correctly gated by phase, but visual disclosure is not staged. A first-time user completing Step 1 sees Harvest, Thank You, Screening, Interview Prep, Cover Letter, and Download before they have submitted a job description.

2. **[US-F3 / AC-F3.2 — ⚠️ Partial — GAP-79 open]** The preview-vs-final generation pipeline is not communicated as a numbered sequence anywhere in the visible UI. Button labels improved (GAP-194), but the three-step pipeline (preview → confirm layout → generate final files) is never explained. The `GENERATION_PHASES` state machine (`state-manager.js:57–62`) tracks it in code; no pipeline diagram, step count, or explanatory text surfaces it to the user.

3. **[US-F3 / AC-F3.1 — ⚠️ Partial — GAP-14 open]** No workflow progress indicator before reaching the Finalise tab. The step bar applies `active` (blue) and `completed` (green) CSS classes (`styles.css:151, 153`) with no UI legend. The Finalise tab's readiness checklist is a strong positive but only appears at the end of the workflow.

4. **[US-F3 / AC-F3.3 — ⚠️ Partial]** The Finalise step is absent from the workflow step bar (`index.html:223, 132–134`). Post-download steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) appear as sequential required pipeline steps with no "optional" label or visual divider from the mandatory CV generation steps.

5. **[US-F1 / AC-F1.2 — ⚠️ risk]** "Don't show again" checkbox (`index.html:387`) is still visible in the empty-profile state. Risk is reduced because the always-visible Prerequisites section gives minimum guidance before the user can dismiss, but the structural issue persists.

---

## Additional Story Gaps / Proposed Story Items

**Proposed US-F4 — Preview vs. Final Pipeline Explained (maps to GAP-79):** The Layout Review stage should open with a brief inline explanation: e.g., "Step 1 of 2: Review the preview layout. When satisfied, confirm to generate your final files." The `GENERATION_PHASES` state machine already tracks the pipeline; exposing it visually requires only a status label above the layout canvas.

**Proposed US-F5 — Optional Post-Download Steps Labeled:** The workflow step bar should visually separate the post-CV-delivery steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) from the required generation pipeline, using a divider, a separate section, or "Optional" labels.

**Proposed US-F6 — Workflow Progress Indicator (maps to GAP-14):** A persistent "N of M steps complete" counter or progress bar, visible from the first page load, would tell a first-time user where they are in the overall workflow. The step bar's color states exist but have no legend visible to sighted users.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
| US-F1 (AC-F1.1, F1.2, F1.3) | 1 | 2 | 0 | 0 | 0 |
| US-F2 (AC-F2.1, F2.2, F2.3) | 1 | 2 | 0 | 0 | 0 |
| US-F3 (AC-F3.1, F3.2, F3.3) | 0 | 3 | 0 | 0 | 0 |
| **Totals** | **2** | **7** | **0** | **0** | **0** |

**Key evidence references:**

- US-F1 AC-F1.1 (pass): welcome modal prerequisites → `web/index.html:346–353`; `web/session-manager.js:172–195`
- US-F1 AC-F1.1: "Don't show again" in empty state → `web/index.html:387`; `web/session-manager.js:133–135`
- US-F1 AC-F1.2: all 13 steps visible → `web/index.html:119–142`
- US-F1 AC-F1.2: button relabeling (GAP-194) → `web/index.html:189–190`
- US-F1 AC-F1.3: empty-state fallback → `web/index.html:232–236`
- US-F2 AC-F2.1: stage tab progressive disclosure → `web/ui-core.js:350–363`, `619–628`
- US-F2 AC-F2.1: all steps always visible → `web/index.html:119–142`
- US-F2 AC-F2.2: layout scope label → `web/layout-instruction.js:293`
- US-F2 AC-F2.3 (pass): LLM busy overlay → `web/index.html:152–160`
- US-F3 AC-F3.1: readiness checklist (Finalise) → `web/finalise.js:125–176`
- US-F3 AC-F3.1: layout freshness chip hidden before preview → `web/index.html:96`, `web/state-manager.js:127–136`
- US-F3 AC-F3.2: improved button labels (GAP-194) → `web/index.html:187–190`
- US-F3 AC-F3.2: generation pipeline invisible → `web/state-manager.js:57–62`
- US-F3 AC-F3.3: readiness checklist optional/required distinction → `web/finalise.js:172–174`
- US-F3 AC-F3.3: Finalise tab hidden from step bar → `web/index.html:223`, `web/index.html:132–134`

**Evidence standard:** Every conclusion is independently verifiable from the cited source evidence above.
