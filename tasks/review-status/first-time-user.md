<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review — US-F* Acceptance Criteria

**Persona:** A capable professional using CV Builder for the first time with no prior knowledge of its workflow or terminology.
**Review date:** 2026-06-20 (Cycle 5)
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py
**Cycle delta since cycle 4:**

- GAP-156 RESOLVED — empty-profile modal CTA changed from "Get Started" to "Open Master CV"; button navigates directly to Master CV modal (`session-manager.js:139–141`, commit `1c05811`)
- GAP-72 RESOLVED — `updateWorkflowStepsClickable()` now adds `role="button"`, `tabindex="0"`, and Enter/Space keydown handler when a step becomes clickable; removes them when inert (`ui-core.js:1917–1942`, commit `6ad34fa`)
- GAP-165 RESOLVED — `content_warnings` toast processing added to `applyLayoutSettings()` response path so content warnings fire on re-apply (`layout-instruction.js`, commit `6ad34fa`)
- GAP-155 RESOLVED — warning toasts now visually distinct via `.toast.toast-warning` amber border (`styles.css`, commit `1c05811`)
- GAP-159 RESOLVED — semantic HTML landmarks added: `<header>`, `<nav aria-label="Application workflow steps">`, `<main>` (`index.html`, commit `1c05811`)
- GAP-158 RESOLVED — `switchTab()` sets `aria-labelledby` on `#document-content` tabpanel (`index.html`, commit `1c05811`)

---

## Application Evaluation

### US-F1: First-Run Orientation

**Story:** A first-time user should understand what the application does and how to begin without prior training.

---

#### AC-F1.1 — A new user can identify the first step and expected input without external help

**Rating:** ⚠️ Partial

**Evidence:**

The onboarding modal (`index.html:315–386`, rendered by `maybeShowWelcomeModal()` in `session-manager.js:169–192`) fires on every startup unless the user has stored `cv-builder-welcome-dismissed` in localStorage. It presents a clear 3-phase "How it works" summary and branches on master CV state.

**Cycle 5 improvement — GAP-156 resolved:** `_setWelcomeSection()` (`session-manager.js:124–147`) now changes the CTA button label to `"Open Master CV"` when `section === 'empty'` (line 140) and wires `onclick` to `closeWelcomeModal(); openMasterCvModal()` (line 141). This closes the cycle 4 gap where skim readers could click "Get Started" and bypass the empty-profile warning.

**Positive pattern confirmed:**

- Welcome modal section `#welcome-section-empty` (`index.html:350–354`) displays amber warning with actionable body text.
- Welcome modal section `#welcome-section-present` (`index.html:343–347`) shows green "profile ready" banner with clear next step.
- Welcome modal section `#welcome-section-missing` (`index.html:357–367`) provides two action paths: "Create empty profile" or "Place an existing file."

**Remaining issues:**

1. The "Don't show this again" checkbox (`index.html:375`) is present only on the `welcome-footer-present` footer, which is also reused for the `empty` section (`session-manager.js:134`). A user who dismisses the modal with this checkbox checked while in the empty state will never see the onboarding modal again — even before they have populated a master profile. The suppression is permanent and immediate.

2. After any modal dismissal, the header shows `"LLM:"` + `"Loading…"` + a ⚠ `"Not ready"` badge (`index.html:53–58`). For a non-technical professional this reads as a system error before any context is established. The badge uses `class="auth-badge unauthenticated"` which renders in red (`styles.css:40`), reinforcing an alarm reading. (GAP-76, still open.)

3. The Job tab shows a generic empty-state: `"Select a tab to view content / Job description and analysis results will appear here"` (`index.html:232–236`). No inline instruction says "paste a job description here."

4. The welcome modal body references `Master_CV_Data.json` using a `<code>` element (`index.html:329`). The technical filename is jarring for non-technical users; the Master CV tab itself is labeled "📚 Master CV Profile" without the filename.

---

#### AC-F1.2 — Stage names and action labels are understandable in context

**Rating:** ⚠️ Partial

**Evidence:**

The top workflow bar exposes all 13 stage labels simultaneously at page load, regardless of the user's current position:

```text
📥 Job Input → 🔍 Analysis → ⚙️ Customise → ✏️ Rewrites → 🔤 Spell Check →
🎨 Layout Review → ⬇️ Download → 📩 Cover Letter → 📋 Screening →
🎤 Interview Prep → 🙏 Thank You → 🌾 Harvest
```

(`index.html:119–142`)

Several labels remain opaque to a first-time user:

- **"Customise"** — Cannot tell from the label that this means reviewing AI-recommended skills and experience selections.
- **"Rewrites"** — Ambiguous: does the user rewrite, or does the AI?
- **"Harvest"** — Domain jargon; the step `title` tooltip says `"Harvest improvements"` (hover only). No definition is visible otherwise. The welcome modal body does define the concept (step 3, `index.html:337–340`) but uses the same vocabulary.
- **"LLM:"** in the header — Technical acronym, never spelled out in the UI.

**Cycle 5 improvement — GAP-72 resolved:** `updateWorkflowStepsClickable()` (`ui-core.js:1879`) now correctly adds `role="button"` and `tabindex="0"` when a step becomes clickable and removes them when inert. Steps that are not yet reachable are not focusable. This improves keyboard-only accessibility but does not affect the visual disclosure issue (all 13 steps are still rendered as visible UI elements regardless of user progress).

**Unchanged:** Steps that are not yet reachable are not visually hidden — only their clickability and keyboard role are gated by phase. (GAP-78 still open.)

---

#### AC-F1.3 — The first stage makes clear what data is needed and why

**Rating:** ⚠️ Partial

**Evidence:**

The Job tab shows a generic empty-state (`index.html:232–236`) when no job description is present. No heading, instruction, or placeholder text within the viewer panel says "paste a job description to begin."

The load-job panel (`job-input.js`) renders the correct UI with a textarea placeholder `"Paste the job description here…"` and tabbed methods (paste / URL / file). `showLoadJobPanel()` is called when `data.job_description_text` is falsy on status fetch, so the paste panel does appear on first load. The empty-state string at `index.html:232` is the fallback visible in the brief moment before the tab content hydrates.

The `🔍 Analyze Job` button in the action row (`index.html:182`) is visible before any job description is provided; clicking it with an empty state produces an error with no adjacent proactive guidance.

---

### US-F2: Progressive Disclosure Through the Workflow

**Story:** The UI should reveal decisions at the moment they become relevant, not all at once.

---

#### AC-F2.1 — The UI reveals the next set of decisions in a staged way rather than all at once

**Rating:** ⚠️ Partial

**Evidence:**

**Positive:** The secondary tab bar applies progressive disclosure correctly. `updateTabBarForStage()` (`ui-core.js:607–616`) hides all tabs except those in `STAGE_TABS[stage]`. At startup, only the `job` tab is shown. The primary action button row in the chat panel shows only one action at a time via `display:none` toggling (`index.html:183–190`).

**Negative:** The top workflow bar does not apply progressive disclosure — all 13 workflow steps are always rendered and visible (`index.html:119–142`). At DOMContentLoaded, `updateWorkflowStepsClickable('job')` is called (`ui-core.js:1982`), leaving only `step-job` with interactive role/tabindex. However, all 13 step pills are fully visible as static indicators. A first-time user sees the entire pipeline — Harvest, Thank You, Screening, Interview Prep, Cover Letter, Download — before completing the first step. (GAP-78 still open.)

The Customise stage (`STAGE_TABS.customizations`, `ui-core.js:353`) exposes 10 secondary tabs simultaneously (goals, questions, exp-review, ach-editor, skills-review, achievements-review, tagline-review, summary-review, publications-review, ats-score) with no visible ordering guide or intro text.

---

#### AC-F2.2 — Each stage communicates its purpose before demanding action

**Rating:** ⚠️ Partial

**Evidence:**

- **Job stage:** The load-job panel renders adequately once triggered (textarea, tabs, submit buttons), but the viewer empty-state shown before that loads does not explain the purpose.
- **Analysis stage:** `populateAnalysisTab()` renders a structured breakdown after the fact; no preamble explains what to expect before clicking Analyze.
- **Customise stage:** 10 tabs appear simultaneously with no ordering hint or introductory copy.
- **Layout Review stage:** The scope label (`layout-instruction.js:293`) explicitly states `"💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here."` This is a strong positive: the stage communicates what is and is not permitted, preventing the user from attempting text edits in the wrong place.
- **Finalise stage:** `populateFinaliseTab()` (`finalise.js:68`) opens with `"Archive this application to your CV history, update the response library, and optionally write any improvements back to Master CV Data."` This is a reasonable one-line preamble.

---

#### AC-F2.3 — Stage transitions include enough feedback to keep a new user oriented

**Rating:** ✅ Pass

**Evidence:**

- The LLM busy overlay (`index.html:152–160`) shows a spinner, elapsed timer, and "Taking longer than usual" state badge during in-flight LLM calls.
- The conversation panel logs system messages at transitions: `"Auto-analyzing loaded job description…"` (`app.js:92`), `"✅ Connection successful."` (`app.js:72`).
- Phase changes trigger `stateManager.onPhaseChange()` → `updateWorkflowStepsClickable()`, unlocking the next step's keyboard role in the top bar (`ui-core.js:1986–1988`).
- The `workflow-steps.js` step status system applies `active`, `completed`, `stale`, and `stale-critical` classes, all of which have distinct visual styling in `styles.css:149–156`.

This mechanism is adequate for users who read the chat panel and observe the workflow bar. It relies on scanning conversation history to understand transitions, which is a mild drawback for first-time users, but the feedback is present and meaningful.

---

### US-F3: Confidence Before Finalisation

**Story:** A first-time user should know when application materials are ready, distinguish preview from final, and understand what is optional versus required.

---

#### AC-F3.1 — The system communicates whether key review steps are complete

**Rating:** ⚠️ Partial

**Evidence:**

- The `layout-freshness-chip` (`index.html:95`) displays `"Layout current"`, `"Layout outdated"`, or `"Files outdated"` based on `getLayoutFreshnessFromState()` from `state-manager.js:120–178`. It only appears after a preview has been generated (`showChip` is `false` when `previewAvailable` is false, `state-manager.js:127–136`). Before any preview exists, the chip is invisible with no placeholder.
- The ATS score badge (`index.html:86–93`) is hidden until analysis completes.
- There is no visual checklist, progress indicator, or "N of M steps complete" summary visible at any time. GAP-14 (Workflow Progress Indicator) remains unimplemented.
- The workflow step bar applies `active`, `completed`, and `upcoming` CSS classes (`styles.css:149–154`) but there is no legend in the UI explaining what these states mean. A first-time user encountering a green pill vs. a grey pill has no system-provided key.

---

#### AC-F3.2 — The relationship between generation, layout review, and finalisation is understandable

**Rating:** ❌ Fail

**Evidence:**

The multi-step generation pipeline (preview → confirm layout → final generate) is technically well-structured (`GENERATION_PHASES` in `state-manager.js:57–62`) but is not communicated to the user at any point in the visible UI:

1. The spell-check stage action button label is **`"Done — Generate CV →"`** (`spell-check.js:148,271`). The label implies a single decisive action, but clicking it triggers only an HTML preview generation (layout-review preview), not the final downloadable output.

2. The primary action button in the layout stage (`index.html:188`) is rendered by `refreshLayoutStatusUI()` (`ui-helpers.js:97–104`). It changes label dynamically:
   - `"↻ Regenerate Preview"` when `freshness.isStale`
   - `"⬇️ Generate Final Files"` when `generationState.layoutConfirmed`
   - `"✅ Confirm Layout"` otherwise

   The label transition from `"✅ Confirm Layout"` to `"⬇️ Generate Final Files"` after confirmation is the only signal to the user that their action unlocked a new step. There is no explanatory text adjacent to the button about what "confirming" does.

3. Inside the Layout Review panel, two separate buttons exist in sequence: `"Confirm Layout"` (`layout-instruction.js:360–362`) hidden until a preview is available, then `"Generate Final Files"` (`layout-instruction.js:379–381`). Both appear in the left input pane with no framing text explaining the transition between them.

4. The Generated Files tab heading (`final-generate.js:97`) reads `"📄 Generated Files"` with body text `"Your final CV files have been generated. Download them below, then proceed to the Finalise step."` The word "final" is used without contrasting it from the earlier preview state.

5. `GENERATION_PHASES` (`state-manager.js:57–62`) defines four phases — `idle`, `layout_review`, `confirmed`, `final_complete` — and these are well-tracked in code, but no phase label or pipeline diagram is shown to the user.

A first-time user cannot tell from the current UI that `"Done — Generate CV →"` produces a preview only, and that two more steps (Confirm Layout, Generate Final Files) are required before the CV is ready to send. (GAP-79, still open.)

---

#### AC-F3.3 — The final stage distinguishes clearly between archive/finalise actions and optional follow-on work

**Rating:** ⚠️ Partial

**Evidence:**

The Finalise tab (`finalise.js:67–116`) contains:

- A preamble paragraph: `"Archive this application to your CV history, update the response library, and optionally write any improvements back to Master CV Data."` The word "optionally" is present, but refers to the harvest step rather than flagging any element of the main form.
- A status dropdown (Draft / Ready to send / Sent) — primary metadata for archiving.
- A notes textarea labeled `"Notes"` with placeholder text (`"Recruiter name, salary info, follow-up date, interview notes…"`, `finalise.js:101`). This placeholder helps signal optionality.
- A `"✅ Finalise & Archive"` button — clear primary action.
- A `#harvest-section` div that becomes visible post-submit (`finalise.js:193–194`). The harvest section includes a `"Skip"` button (`finalise.js:301–305`), signaling the action is optional. The section header reads `"📥 Update Master CV Data"` with no framing word like "optional" or "bonus step" adjacent to the heading.

**Unchanged structural issue:** The Finalise tab entry (`tab-finalise`) is hidden at page load (`style="display:none"`, `index.html:219`). The workflow step bar has no "Finalise" step — the bar jumps from `"⬇️ Download"` to `"📩 Cover Letter"` (`index.html:131–133`). A user navigating by the step bar will not see the Finalise/Archive step in the workflow pipeline visualization at all.

Post-download steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) are presented in the step bar as sequential pipeline steps with no visual separator or "optional" label. A first-time user has no indication these are supplementary extras, not required parts of CV delivery.

---

## Generated Materials Evaluation

No generated CV, cover letter, DOCX, or PDF files were inspected in this cycle. This evaluation is limited to the application UI and workflow source code.

---

## Terminology Audit for First-Time Users

| Term in UI | First-time-user clarity | Issue |
| --- | --- | --- |
| Harvest | ❌ Opaque | No definition in context; step bar shows bare "🌾 Harvest"; tooltip "Harvest improvements" is hover-only; term defined in welcome modal step 3 but using the same opaque vocabulary |
| Customise | ⚠️ Partial | Could mean free-text edit; actually means reviewing AI recommendations |
| Rewrites | ⚠️ Partial | Ambiguous: does the user rewrite, or does the AI? |
| Layout Review | ⚠️ Partial | Scope label correctly constrains to layout-only; the difference from the Download tab is not obvious |
| ATS | ⚠️ Partial | Acronym; expanded only as "ATS-optimised" in onboarding modal body — not defined inline |
| LLM | ❌ Opaque | Technical acronym in header ("LLM:") with no definition; ⚠ "Not ready" badge renders in red, alarming non-technical users (GAP-76 open) |
| Master CV Profile | ⚠️ Partial | Explained in onboarding; but referenced as `Master_CV_Data.json` filename in same modal — jarring technical switch |
| Finalise & Archive | ✅ Clear | Verb pair is actionable and understandable |
| Analyze Job | ✅ Clear | Imperative verb; primary entry action |
| Done — Generate CV → | ❌ Misleading | Actually generates a layout preview only; final downloadable output requires two more steps (GAP-79 open) |
| Open Master CV | ✅ Clear | New in cycle 5 (GAP-156); replaces "Get Started" for empty-skeleton; direct and actionable |
| Generate Final Files | ⚠️ Partial | "Final" has no defined contrast with the prior preview — pipeline distinction unexplained (GAP-79 open) |

---

## Cycle 5 Delta: What Changed

| Item | Cycle 4 finding | Cycle 5 status |
| --- | --- | --- |
| GAP-156: Empty-skeleton footer CTA "Get Started" misdirects users | ⚠️ Gap — cycle 4 identified | ✅ RESOLVED — `_setWelcomeSection('empty')` now sets CTA to `"Open Master CV"` which calls `openMasterCvModal()` (`session-manager.js:139–141`) |
| GAP-72: Workflow step bar keyboard nav absent | ⚠️ Partial in cycle 4 | ✅ RESOLVED — `_makeStepClickable()` adds `role="button"`, `tabindex="0"`, keydown handler; `_makeStepInert()` removes them (`ui-core.js:1917–1942`) |
| GAP-165: content_warnings on re-apply layout settings | Open | ✅ RESOLVED — `applyLayoutSettings()` now processes `content_warnings` from response (`layout-instruction.js`) |
| GAP-155: Warning toast visual distinction | Open | ✅ RESOLVED — `.toast.toast-warning` amber border added (`styles.css`) |
| AC-F3.2 Preview vs. final generation explained | ❌ Fail | Unchanged — ❌ Fail (GAP-79 open) |
| AC-F2.1 Workflow step bar progressive disclosure | ⚠️ Partial | Unchanged — all 13 steps visible at page load (GAP-78 open) |
| AC-F1.3 Job tab empty-state inline instruction | ⚠️ Partial | Unchanged |
| GAP-14 Workflow progress indicator | Absent | Still absent |
| GAP-76 LLM provider prerequisite / alarm badge | Open | Still open |
| GAP-77 "Get Started" navigates to Job tab | Partially superseded — now navigates to Master CV for empty state; for "present" state button still just closes modal without navigating | ⚠️ Partial |
| GAP-78 CV jargon terms defined on first encounter | Open | Still open |
| AC-F3.3 Post-download optional steps labeled | ⚠️ Partial | Unchanged |
| "Don't show again" suppressible in empty state before profile populated | Not noted | New finding — ⚠️ risk |

---

## Summary Table

| Story | Criterion | Rating | Key Finding |
| --- | --- | --- | --- |
| US-F1 | AC-F1.1 First step identification | ⚠️ Partial | GAP-156 resolved: empty-skeleton CTA now "Open Master CV" → opens editor. Remaining: LLM ⚠ badge alarms on first load; "Don't show again" suppresses modal permanently even in empty state |
| US-F1 | AC-F1.2 Stage names understandable | ⚠️ Partial | "Harvest", "Customise", "Rewrites", "LLM:" remain opaque; all 13 steps visible at page load (GAP-78 open); GAP-72 resolved keyboard nav |
| US-F1 | AC-F1.3 First stage data input clear | ⚠️ Partial | Load-job panel renders correctly on first load; generic empty-state shown before tab content hydrates |
| US-F2 | AC-F2.1 Staged disclosure | ⚠️ Partial | Secondary tab bar staged correctly; top workflow bar still shows all 13 steps from first load (GAP-78 open) |
| US-F2 | AC-F2.2 Stage purpose before action | ⚠️ Partial | Layout Review scope label strong; Finalise has preamble; most other stages still lack purpose text; Customise exposes 10 tabs at once |
| US-F2 | AC-F2.3 Transition feedback | ✅ Pass | LLM busy overlay, chat messages, phase-based step unlocking with keyboard access provide adequate feedback |
| US-F3 | AC-F3.1 Review completion signaled | ⚠️ Partial | Freshness chip and ATS badge present but late to appear; no overall progress indicator (GAP-14) |
| US-F3 | AC-F3.2 Preview vs. final generation clear | ❌ Fail | "Done — Generate CV →" implies single action; three-step preview/confirm/final pipeline invisible to user (GAP-79) |
| US-F3 | AC-F3.3 Optional vs. required at Finalise | ⚠️ Partial | Primary archive action clear; harvest has "Skip" button; Finalise absent from workflow step bar; post-download steps unlabeled as optional |

---

## Top Issues by Priority

1. **[US-F3 / AC-F3.2 — ❌ Fail — GAP-79 open]** The preview-vs-final generation pipeline is invisible to a first-time user. `"Done — Generate CV →"` (`spell-check.js:148`) produces a layout-review HTML preview, not a deliverable file. Two more actions — `"Confirm Layout"` then `"Generate Final Files"` (`layout-instruction.js:360–381`) — are required before the CV is downloadable. Nothing in the visible UI communicates this pipeline before the user clicks the first button.

2. **[US-F1 / AC-F1.2 + US-F2 / AC-F2.1 — ⚠️ Partial — GAP-78 open]** All 13 workflow steps are visible from first page load. Interactivity is correctly gated by phase (GAP-72 resolved), but visibility is not. This is the primary progressive disclosure failure for the first-time user.

3. **[US-F3 / AC-F3.1 — ⚠️ Partial — GAP-14 open]** No workflow progress indicator. The step bar uses `active` (blue) and `completed` (green) CSS classes (`styles.css:150–152`) but there is no legend in the UI and no "N of M complete" summary. A first-time user has no at-a-glance view of how many steps remain.

4. **[Terminology — ❌ Opaque — GAP-76 open]** `"LLM:"` in the header with a ⚠ `"Not ready"` badge renders with `class="auth-badge unauthenticated"` in red (`styles.css:40`). This is among the first things a first-time user sees after dismissing the modal. For a non-technical professional, this reads as a system error, not a configuration option.

5. **[US-F3 / AC-F3.3 — ⚠️ Partial]** The Finalise step is absent from the workflow step bar (bar jumps from ⬇️ Download → 📩 Cover Letter, `index.html:131–133`). Post-download steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) are presented as sequential pipeline steps with no "optional" label, suggesting to a first-time user they are all required.

6. **[US-F1 / AC-F1.1 — ⚠️ New risk]** The `"Don't show this again"` checkbox (`index.html:375`) is present on the `welcome-footer-present` footer which is also shown for the `empty` state. A user who checks the box and clicks `"Open Master CV"` while in the empty state will permanently suppress the onboarding modal before they have completed onboarding. No warning or conditional suppression guards this case.

---

## Additional Story Gaps / Proposed Story Items

**Proposed US-F4 — LLM Provider Prerequisite Disclosed at Onboarding (maps to GAP-76):** The welcome modal should list the LLM provider configuration as a prerequisite alongside the Master CV requirement, with a link or button to the LLM Configuration Wizard. The current red ⚠ `"Not ready"` badge appears before the user has any context for the LLM provider concept.

**Proposed US-F5 — Preview vs. Final Pipeline Explained (maps to GAP-79):** At the moment `"Done — Generate CV →"` is clicked, a brief interstitial or inline note should explain: `"This generates a preview for layout review. You'll have a chance to adjust the layout and then generate your final downloadable files."` Alternatively, the button label itself should read `"Generate Preview →"` to set accurate expectations.

**Proposed US-F6 — Optional Post-Download Steps Labeled:** The workflow step bar should visually distinguish the post-CV-delivery steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) from the required CV generation pipeline, either with a divider, a separate section, or "Optional" labels. A first-time user cannot currently distinguish mandatory from supplementary workflow sections.

---

## Evidence Summary

| File | Lines / Function | Finding |
| --- | --- | --- |
| `web/session-manager.js` | 124–147 `_setWelcomeSection()` | Empty section: CTA now "Open Master CV" → `openMasterCvModal()` ✅ (GAP-156 resolved) |
| `web/session-manager.js` | 169–192 `maybeShowWelcomeModal()` | Correctly fetches `/api/setup/master-cv-status`; branches on `data.is_empty` at line 182 ✅ |
| `web/session-manager.js` | 198–205 `closeWelcomeModal()` | "Don't show again" checkbox suppresses modal permanently regardless of state ⚠️ |
| `web/index.html` | 350–354 `#welcome-section-empty` | Exists and contains appropriate amber warning ✅ |
| `web/index.html` | 53–61 `#model-selector-btn` | `"LLM:"` + `"Not ready"` badge in red on first load — alarming to non-technical users ❌ (GAP-76 open) |
| `web/index.html` | 119–142 `nav.workflow` | All 13 workflow steps visible at page load — progressive disclosure gap ❌ (GAP-78 open) |
| `web/index.html` | 182–191 `.actions` | One action button visible per stage via `display:none` toggling — correctly staged ✅ |
| `web/ui-core.js` | 350–363 `STAGE_TABS` | Secondary tab bar staged correctly per phase ✅ |
| `web/ui-core.js` | 1879–1962 `updateWorkflowStepsClickable()` | Adds/removes `role="button"`, `tabindex`, keydown handler per phase (GAP-72 resolved) ✅ |
| `web/ui-core.js` | 607–616 `updateTabBarForStage()` | Hides/shows secondary tabs per stage ✅ |
| `web/ui-helpers.js` | 82–105 `refreshLayoutStatusUI()` | Layout button label changes dynamically (Confirm → Generate Final Files) but no explanatory text ⚠️ |
| `web/layout-instruction.js` | 293 scope label | Layout-only constraint explicitly stated ✅ |
| `web/layout-instruction.js` | 360–381 | Two sequential buttons in layout pane: "Confirm Layout" then "Generate Final Files" — no pipeline framing ❌ (GAP-79) |
| `web/spell-check.js` | 148, 271 | `"Done — Generate CV →"` label implies single action; produces preview only ❌ (GAP-79) |
| `web/state-manager.js` | 57–62 `GENERATION_PHASES` | Four-phase pipeline well-structured in code but never exposed to user ❌ (GAP-79) |
| `web/finalise.js` | 67–116 `populateFinaliseTab()` | Preamble present; harvest has "Skip" button; no "optional" label on section heading ⚠️ |
| `web/index.html` | 219 `#tab-finalise` | `style="display:none"` — Finalise tab absent from workflow step bar navigation ⚠️ |
| `web/styles.css` | 149–156 | `active`/`completed`/`upcoming` step classes styled but no in-page legend ⚠️ (GAP-14) |
