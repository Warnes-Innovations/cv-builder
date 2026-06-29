<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review Status

**Last Updated:** 2026-06-29 17:30 ET

**Executive Summary:** Cycle 8 source review (3 post-cycle-7 commits: GAP-106, GAP-93, GAP-102/GAP-177). No changes were made to any file in the first-time-user critical path (session-manager.js, job-input.js, spell-check.js, workflow-steps.js, finalise.js, or the onboarding sections of index.html). The only first-time-user-adjacent change is GAP-106 (generation timestamp now shown on each download card in `download-tab.js:194–196`), which provides a marginal improvement to AC-F3.1 (the user can see when files were generated) but does not change its ⚠️ Partial rating because the broader pipeline completion signal issues remain. All 9 AC ratings carry over from cycle 7 unchanged: 2 Pass / 7 Partial. All 5 open priority items (GAP-78, GAP-79, GAP-14, GAP-76, AC-F3.3 structural gap) remain unaddressed.

---

## Application Evaluation

### US-F1: First-Run Orientation

**Story:** A first-time user should understand what the application does and how to begin without prior training.

---

#### AC-F1.1 — A new user can identify the first step and expected input without external help

**Rating:** ⚠️ Partial

**Evidence:**

The onboarding modal (`index.html:315–386`) fires on every startup until `cv-builder-welcome-dismissed` is set in localStorage (via `maybeShowWelcomeModal()` in `session-manager.js:169–192`). It presents a numbered 3-phase "How it works" summary and branches on master CV state:

- `#welcome-section-present` (`index.html:343–347`): green banner "Your master profile is ready. Next: switch to the Job tab, provide a job description, and click Analyze Job." — ✅ Clear next action.
- `#welcome-section-empty` (`index.html:350–354`): amber warning directing user to the Master CV tab to fill in content before starting — ✅ Clear directive.
- `#welcome-section-missing` (`index.html:357–367`): amber warning with two action paths (create empty profile / place existing file) — ✅ Clear options.

**Remaining issues (unchanged from cycle 7):**

1. **"Don't show again" checkbox suppressible in empty state** (`index.html:375`): The checkbox is on `welcome-footer-present`, which is also shown for the `welcome-section-empty` branch (`session-manager.js:133–135`). A user in the empty-profile state can check this box before completing onboarding, permanently suppressing the welcome guidance.

2. **LLM "Not ready" badge** (`index.html:53–58`): After modal dismissal, the header shows `"LLM: Loading…"` followed by a ⚠ `"Not ready"` badge with `class="auth-badge unauthenticated"` styled in `color: #fca5a5` (red, `styles.css:40`). A non-technical professional sees this as a system error. The badge tooltip ("No provider/model is configured yet.", set by `_updateLlmStatusPill('unconfigured', ...)` in `ui-core.js:827–867`) is hover-only. The welcome modal makes no mention of LLM provider setup as a prerequisite. (GAP-76, open.)

3. **Technical filename reference in welcome modal** (`index.html:329`): The body references `Master_CV_Data.json` in a `<code>` element within a sentence targeting non-technical users. The tab itself is labeled "📚 Master CV Profile" — the filename creates a jarring vocabulary shift.

---

#### AC-F1.2 — Stage names and action labels are understandable in context

**Rating:** ⚠️ Partial

**Evidence:**

The top workflow bar exposes all 13 stage labels simultaneously at page load, regardless of the user's current position (`index.html:119–142`):

```text
📥 Job Input → 🔍 Analysis → ⚙️ Customise → ✏️ Rewrites → 🔤 Spell Check →
🎨 Layout Review → ⬇️ Download → 📩 Cover Letter → 📋 Screening →
🎤 Interview Prep → 🙏 Thank You → 🌾 Harvest
```

Labels that remain opaque to first-time users:

- **"Customise"** (`index.html:123`): Cannot tell from the label that this means reviewing AI-recommended skills and experience selections, not free-text editing.
- **"Rewrites"** (`index.html:125`): Ambiguous — does the user rewrite, or does the AI rewrite for the user?
- **"Harvest"** (`index.html:141`): Domain jargon. Tooltip text "Harvest improvements" (via `title` attribute) is hover-only. The welcome modal step 3 defines it (`index.html:337–340`) but uses the same opaque vocabulary.
- **"LLM:"** in the header (`index.html:53`): Technical acronym never spelled out anywhere in the UI.

No changes to workflow step terminology in this cycle.

---

#### AC-F1.3 — The first stage makes clear what data is needed and why

**Rating:** ⚠️ Partial

**Evidence:**

- When the session has no job description, `showLoadJobPanel()` (`job-input.js:91–183`) renders a textarea with placeholder "Paste the job description here…" and three input method tabs (Paste Text / From URL / Upload File). This is adequate once shown.
- The generic empty-state fallback (`index.html:232–236`) reads "Select a tab to view content / Job description and analysis results will appear here" and appears before the job panel loads. It contains no call to action.
- The `🔍 Analyze Job` button (`index.html:182`) is rendered and enabled before any job description is pasted; clicking it with an empty input produces an error with no adjacent proactive guidance.

No changes to this area in this cycle.

---

### US-F2: Progressive Disclosure Through the Workflow

**Story:** The UI should reveal decisions at the moment they become relevant, not all at once.

---

#### AC-F2.1 — The UI reveals the next set of decisions in a staged way rather than all at once

**Rating:** ⚠️ Partial

**Evidence:**

**Positive:** The secondary tab bar implements progressive disclosure correctly. `updateTabBarForStage()` (`ui-core.js:619–628`) hides all tabs except those listed in `STAGE_TABS[stage]` (`ui-core.js:350–363`). At startup, only the `job` tab is shown. The chat-panel action button row exposes only one primary action at a time via `display:none` toggling (`index.html:183–190`).

**Negative:** The top workflow bar does not apply progressive disclosure — all 13 workflow steps are always rendered visible (`index.html:119–142`). They are gated by interactivity (the `onclick`/`tabindex` attributes are conditionally set by `updateWorkflowStepsClickable()` in `workflow-steps.js`), but they are fully visible as static indicators from the first page load. A first-time user completing Step 1 sees Harvest, Thank You, Screening, Interview Prep, Cover Letter, and Download already laid out in front of them. (GAP-78, open.)

The Customise stage (`STAGE_TABS.customizations`, `ui-core.js:353`) exposes 10 secondary tabs simultaneously with no ordering guide, intro text, or sequencing hint. The number of tabs (goals, questions, exp-review, ach-editor, skills-review, achievements-review, tagline-review, summary-review, publications-review, ats-score) could overwhelm a first-time user.

No changes to this area in this cycle.

---

#### AC-F2.2 — Each stage communicates its purpose before demanding action

**Rating:** ⚠️ Partial

**Evidence:**

- **Job stage:** The load-job panel (`job-input.js:91–183`) is adequate once rendered, but the empty-state seen before it loads (`index.html:232–236`) has no explanatory text.
- **Analysis stage:** `populateAnalysisTab()` renders a structured breakdown after completion; no preamble sets expectations before the user clicks Analyze.
- **Customise stage:** 10 tabs appear simultaneously with no ordering hint or introductory paragraph.
- **Layout Review stage:** A scope label explicitly states "💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." (`layout-instruction.js:293`) — ✅ Strong positive.
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
- `updateWorkflowSteps()` in `workflow-steps.js` appends `<span class="sr-only">` per step pill with state labels (current step / completed / stale / critical), improving transition feedback for assistive technology users.
- The step bar applies `active` (blue, `styles.css:151`), `completed` (green, `styles.css:153`), `stale` (amber, `styles.css:156`), and `stale-critical` (red, `styles.css:157`) CSS classes — all visually distinct.

The overall transition feedback mechanism is adequate. Unchanged from cycle 7.

---

### US-F3: Confidence Before Finalisation

**Story:** A first-time user should know when application materials are ready, distinguish preview from final, and understand what is optional versus required.

---

#### AC-F3.1 — The system communicates whether key review steps are complete

**Rating:** ⚠️ Partial

**Evidence:**

**Marginal improvement (GAP-106):** Each download card in the File Review tab now shows a generation timestamp (e.g., "Generated Jun 29, 2026, 5:30 PM") via `download-tab.js:194–196`:

```js
const timestampLine = generatedLabel
  ? `<div style="font-size:0.75em;color:#9ca3af;margin-top:3px;">Generated ${generatedLabel}</div>`
  : '';
```

This addresses the narrow question of when files were produced. It does not address the broader completion-signal issues.

**Remaining issues (unchanged):**

- The `layout-freshness-chip` (`index.html:95`) shows "Layout current", "Layout outdated", or "Files outdated" based on `getLayoutFreshnessFromState()` (`state-manager.js:120–178`). The chip is invisible until a preview has been generated (`showChip: false` when `previewAvailable` is `false`, `state-manager.js:127–136`). Before any preview exists, the chip is invisible with no placeholder, so new users have no completion signal during the critical early stages.
- The ATS score badge (`index.html:86–93`) is hidden until analysis completes — reasonable, but leaves the row empty with no placeholder.
- There is no visual checklist, progress indicator, or "N of M steps complete" summary anywhere in the UI. (GAP-14, open.)
- The workflow step bar applies `active`, `completed`, and `upcoming` CSS classes (`styles.css:149–154`) but no legend exists in the UI to explain what blue vs. green vs. grey means. `sr-only` spans announce state to screen readers, but sighted first-time users have no key.

---

#### AC-F3.2 — The relationship between generation, layout review, and finalisation is understandable

**Rating:** ⚠️ Partial

**Evidence:**

**From cycle 7 (confirmed unchanged):** Both viewer-panel spell-check submit buttons read "Generate Preview →" (`spell-check.js:148` and `spell-check.js:271`), matching the chat-panel button at `index.html:186`. Label consistency is ✅ for this sub-issue (GAP-181 resolved cycle 7).

**Remaining issues (unchanged from cycle 7):**

1. The three-step generation pipeline (spell check → preview/layout review → confirm → final files) is never communicated in the visible UI before the user begins. There is no "Step 1 of 3: Preview" indicator on the Layout Review screen, and no explanatory sentence at the entry to Layout Review explaining that this produces a reviewable preview, not a final file.

2. The transition from "✅ Confirm Layout" to the generation of final files is signaled only by the button label. No explanatory text adjacent to the buttons explains that confirming layout triggers a separate final-generation step (`layout-instruction.js:360–381`).

3. `GENERATION_PHASES` defines four phases (`idle`, `layout_review`, `confirmed`, `final_complete`), all tracked correctly in code (`state-manager.js:57–62`), but no pipeline summary, phase label, or step count is ever displayed to the user.

4. The `layout-freshness-chip` chip states ("Layout current", "Layout outdated", "Files outdated") communicate staleness without ever defining the pipeline they represent. A user who has not read documentation does not know what "Layout current" confirms.

(GAP-79, open.)

---

#### AC-F3.3 — The final stage distinguishes clearly between archive/finalise actions and optional follow-on work

**Rating:** ⚠️ Partial

**Evidence:**

The Finalise tab (`finalise.js:67–116`) contains:

- Clear preamble: "Archive this application to your CV history, update the response library, and optionally write any improvements back to Master CV Data." The word "optionally" is present but refers to the harvest section, not to the post-download steps as a whole.
- A status dropdown (Draft / Ready to send / Sent) with "Ready to send" pre-selected — a sensible default.
- A notes textarea with a helpful placeholder listing use cases.
- A `"✅ Finalise & Archive"` primary action button — clear and actionable.
- A `#harvest-section` div revealed post-submit with a "Skip" button — the "Skip" label does signal optionality.

**Structural issue (unchanged):** The Finalise tab (`#tab-finalise`) is hidden at page load (`style="display:none"`, `index.html:219`). The workflow step bar transitions directly from "⬇️ Download" to "📩 Cover Letter" (`index.html:131–133`) — "Finalise" does not appear as a step. A user navigating by the step bar will not discover the Archive step.

**Post-download optional steps (unchanged):** Cover Letter, Screening, Interview Prep, Thank You, and Harvest are presented in the step bar as a linear continuation of the required pipeline with no visual separator, section label, or "Optional" annotation. A first-time user cannot distinguish mandatory CV-delivery steps from supplementary extras. The workflow step bar counts 12 items total, all appearing as peers.

---

## Generated Materials Evaluation

No generated CV, cover letter, DOCX, or PDF files were inspected in this review cycle. Evaluation is limited to application UI and workflow source code.

---

## Terminology Audit for First-Time Users

| Term in UI | First-time-user clarity | Status |
| --- | --- | --- |
| Harvest | ❌ Opaque | No definition in context; step bar shows bare "🌾 Harvest"; tooltip "Harvest improvements" (via `title`) is hover-only; term defined in welcome modal step 3 but using the same vocabulary (GAP-78 open) |
| Customise | ⚠️ Partial | Could mean free-text edit; actually means reviewing AI recommendations |
| Rewrites | ⚠️ Partial | Ambiguous: does the user rewrite, or does the AI? |
| Layout Review | ⚠️ Partial | Scope label correctly constrains to layout-only; difference from Download tab not obvious |
| ATS | ⚠️ Partial | Acronym; expanded as "ATS-optimised" in onboarding modal body — not defined inline at point of use |
| LLM | ❌ Opaque | Technical acronym in header ("LLM:") with no definition; ⚠ "Not ready" badge renders in red, alarming non-technical users (GAP-76 open) |
| Master CV Profile | ⚠️ Partial | Explained in onboarding; but referenced as `Master_CV_Data.json` in same modal — jarring technical vocabulary switch |
| Finalise & Archive | ✅ Clear | Verb pair is actionable and understandable |
| Analyze Job | ✅ Clear | Imperative verb; primary entry action |
| Generate Preview → | ✅ Clear | Chat-panel spell-btn + both viewer-panel spell-btn buttons consistent (GAP-181 resolved cycle 7) |
| Open Master CV | ✅ Clear | Direct and actionable |
| Generate Final Files | ⚠️ Partial | "Final" has no defined contrast with the prior preview step — pipeline distinction unexplained (GAP-79 open) |

---

## Cycle 8 Delta: What Changed Since Cycle 7

| Item | Cycle 7 finding | Cycle 8 status |
| --- | --- | --- |
| GAP-106: generation timestamp on download cards | Absent | ✅ RESOLVED — `download-tab.js:194–196` shows "Generated [date/time]" on each card |
| GAP-93: phase-enforcement 409 triggers session conflict banner | Bug open | ✅ RESOLVED — `ui-core.js:456–470` skips banner for `conflict_type !== 'session_ownership'` |
| GAP-102: sessions modal application status badge | Absent | ✅ RESOLVED — session-switcher-ui.js now renders Draft/Ready/Sent badge (no first-time-user impact) |
| GAP-77: DOCX semantic heading styles | Open | ✅ RESOLVED — cv_orchestrator.py now uses doc.add_paragraph(style='Heading 1') (no UI impact) |
| AC-F1.1 / AC-F1.2 / AC-F1.3 | All ⚠️ Partial | Unchanged |
| AC-F2.1 / AC-F2.2 | Both ⚠️ Partial | Unchanged |
| AC-F2.3 | ✅ Pass | Unchanged |
| AC-F3.1 | ⚠️ Partial | ⚠️ Partial — marginal improvement via GAP-106 timestamp, core gap persists |
| AC-F3.2 | ⚠️ Partial | Unchanged |
| AC-F3.3 | ⚠️ Partial | Unchanged |
| GAP-14 Workflow progress indicator | Absent | Still absent |
| GAP-76 LLM provider prerequisite / alarm badge | Open | Still open |
| GAP-78 Workflow step bar progressive disclosure | Open | Still open |
| GAP-79 Preview vs. final pipeline invisible | Open | Still open |
| "Don't show again" suppressible in empty state | Open | Still unaddressed |

---

## Top Issues by Priority

1. **[US-F2 / AC-F2.1 + US-F1 / AC-F1.2 — ⚠️ Partial — GAP-78 open]** All 13 workflow step pills are visible from first page load (`index.html:119–142`). Interactivity is correctly gated by phase, and screen-reader state announcements exist, but visual disclosure is not staged. A first-time user completing Step 1 sees Harvest, Thank You, Screening, Interview Prep, Cover Letter, and Download before they have submitted a job description.

2. **[US-F3 / AC-F3.2 — ⚠️ Partial — GAP-79 open]** The preview-vs-final generation pipeline is not communicated anywhere in the visible UI. All three spell-check button labels correctly read "Generate Preview →", but the three-step pipeline (preview → confirm layout → generate final files) is never explained. The `GENERATION_PHASES` state machine (`state-manager.js:57–62`) tracks it in code; no pipeline diagram, step count, or explanatory text surfaces it to the user.

3. **[US-F3 / AC-F3.1 — ⚠️ Partial — GAP-14 open]** No workflow progress indicator. The step bar applies `active` (blue, `styles.css:151`) and `completed` (green, `styles.css:153`) CSS classes with no UI legend. There is no "N of M steps complete" counter or checklist. The new generation timestamp (GAP-106) helps at the download step but does not address the systemic absence.

4. **[Terminology — ❌ Opaque — GAP-76 open]** The `"LLM: Not ready"` badge (`index.html:53–58`, `styles.css:40`) is among the first things a new user sees after dismissing the welcome modal, and it renders in red as if a system error has occurred. The welcome modal makes no mention of LLM provider setup.

5. **[US-F3 / AC-F3.3 — ⚠️ Partial]** The Finalise step is absent from the workflow step bar (`index.html:219,131–133`). Post-download steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) appear as sequential required pipeline steps with no "optional" label or visual divider from the mandatory CV generation steps.

6. **[US-F1 / AC-F1.1 — ⚠️ risk]** The "Don't show again" checkbox (`index.html:375`) is visible in the empty-profile state. A user who checks it before completing onboarding will permanently suppress the welcome guidance.

---

## Additional Story Gaps / Proposed Story Items

**Proposed US-F4 — LLM Provider Prerequisite Disclosed at Onboarding (maps to GAP-76):** The welcome modal should list LLM provider configuration as a prerequisite alongside Master CV setup, with a button or link to the LLM Configuration Wizard. The current red ⚠ "Not ready" badge appears with no context for the LLM provider concept.

**Proposed US-F5 — Preview vs. Final Pipeline Explained (maps to GAP-79):** The Layout Review stage should open with a brief inline explanation: e.g., "Step 1 of 2: Review the preview layout. When satisfied, confirm to generate your final files." The `GENERATION_PHASES` state machine already tracks the pipeline; exposing it visually requires only a status label above the layout canvas.

**Proposed US-F6 — Optional Post-Download Steps Labeled:** The workflow step bar should visually separate the post-CV-delivery steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) from the required generation pipeline, using a divider, a separate section, or "Optional" labels. A first-time user cannot distinguish mandatory from supplementary workflow sections.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
| US-F1 (AC-F1.1, F1.2, F1.3) | 0 | 3 | 0 | 0 | 0 |
| US-F2 (AC-F2.1, F2.2, F2.3) | 1 | 2 | 0 | 0 | 0 |
| US-F3 (AC-F3.1, F3.2, F3.3) | 0 | 3 | 0 | 0 | 0 |
| **Totals** | **1** | **8** | **0** | **0** | **0** |

**Key evidence references:**

- US-F1 AC-F1.1: welcome modal branches → `web/index.html:315–386`; `web/session-manager.js:169–192`
- US-F1 AC-F1.1: LLM alarm badge → `web/index.html:53–58`, `web/styles.css:40`, `web/ui-core.js:827–867`
- US-F1 AC-F1.2: all 13 steps visible → `web/index.html:119–142`
- US-F1 AC-F1.3: empty-state fallback → `web/index.html:232–236`
- US-F2 AC-F2.1: stage tab progressive disclosure → `web/ui-core.js:350–363`, `619–628`
- US-F2 AC-F2.2: layout scope label → `web/layout-instruction.js:293`
- US-F2 AC-F2.3 (pass): LLM busy overlay → `web/index.html:152–160`
- US-F3 AC-F3.1: freshness chip → `web/index.html:95`, `web/state-manager.js:120–178`
- US-F3 AC-F3.1: generation timestamp (GAP-106 resolved) → `web/download-tab.js:194–196`
- US-F3 AC-F3.2: GAP-181 RESOLVED — spell-btn viewer-panel → `web/spell-check.js:148`, `web/spell-check.js:271`
- US-F3 AC-F3.2: spell-btn chat-panel → `web/index.html:186`
- US-F3 AC-F3.2: generation pipeline invisible → `web/state-manager.js:57–62`
- US-F3 AC-F3.3: Finalise tab hidden from step bar → `web/index.html:219`, `web/index.html:131–133`
- US-F3 AC-F3.3: harvest skip button → `web/finalise.js:193–194`

**Evidence standard:** Every conclusion is independently verifiable from the cited source evidence above.
