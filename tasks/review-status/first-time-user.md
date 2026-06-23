<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review Status

**Last Updated:** 2026-06-22 21:00 ET

**Executive Summary:** Cycle 6 incorporates five accessibility and label fixes from commits `3057ea8` (GAP-167–173) and `f2f5a0b` (GAP-166). The most significant first-time-user improvement is GAP-169: the primary spell-check CTA in the chat panel was renamed from "Done — Generate CV →" to "Generate Preview →", partially resolving the AC-F3.2 preview/final confusion. However, the two inline submit buttons inside the spell-check viewer panel (`spell-check.js:148,271`) were not updated and still read "Done — Generate CV →", leaving the misleading label visible to users who proceed through the spell-check tab itself. The three highest-priority first-time-user gaps — GAP-79 (preview vs. final invisible), GAP-78 (all 13 workflow steps visible at first load), and GAP-14 (no progress indicator) — remain open.

---

## Application Evaluation

### US-F1: First-Run Orientation

**Story:** A first-time user should understand what the application does and how to begin without prior training.

---

#### AC-F1.1 — A new user can identify the first step and expected input without external help

**Rating:** ⚠️ Partial

**Evidence:**

The onboarding modal (`index.html:315–386`, rendered by `maybeShowWelcomeModal()` in `session-manager.js:169–192`) fires on every startup unless `cv-builder-welcome-dismissed` is set in localStorage. It presents a clear 3-phase "How it works" summary and branches on master CV state:

- `#welcome-section-present` (`index.html:343–347`): green "profile ready" banner + "switch to the Job tab" instruction — ✅ clear
- `#welcome-section-empty` (`index.html:350–354`): amber warning with CTA "Open Master CV" → `openMasterCvModal()` (`session-manager.js:139–141`) — ✅ clear (GAP-156, resolved cycle 5)
- `#welcome-section-missing` (`index.html:357–367`): amber warning with two action paths — ✅ clear

**Cycle 6 changes (no impact on this criterion):** GAP-167–173 fixes are accessibility improvements; they do not change the onboarding flow.

**Remaining issues (unchanged from cycle 5):**

1. The "Don't show this again" checkbox (`index.html:375`) is present on the `welcome-footer-present` footer which is also shown for the `empty` section (`session-manager.js:134`). A user who checks the box while in the empty state will permanently suppress the welcome modal before completing onboarding. No guard prevents this.

2. After any modal dismissal, the header shows `"LLM:"` + `"Loading…"` + a ⚠ `"Not ready"` badge (`index.html:53–58`) with `class="auth-badge unauthenticated"` rendering in red (`styles.css:40`). For a non-technical professional this reads as a system error, not a configuration option. (GAP-76, open.)

3. The welcome modal body references `Master_CV_Data.json` using a `<code>` element (`index.html:329`). The technical filename is jarring for non-technical users; the Master CV tab itself is labeled "📚 Master CV Profile."

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

Opaque labels for first-time users (unchanged):

- **"Customise"** — Cannot tell from the label that this means reviewing AI-recommended skills and experience selections.
- **"Rewrites"** — Ambiguous: does the user rewrite, or does the AI?
- **"Harvest"** — Domain jargon; tooltip "Harvest improvements" is hover-only. The welcome modal defines the concept (`index.html:337–340`) but uses the same opaque vocabulary.
- **"LLM:"** in the header — Technical acronym, never spelled out in the UI.

**Cycle 6 improvements:**

- GAP-172: `updateWorkflowSteps()` now appends `<span class="sr-only">` per step pill announcing state — "(current step)", "(completed)", "(stale…)", "(critical…)" (`workflow-steps.js`). This improves screen-reader orientation but does not help sighted first-time users understand step meaning.
- GAP-173: `:focus-visible` rules added to `.action-btn`, `.tab`, and `.step` in `styles.css`. Improves keyboard navigation visibility without affecting label clarity.

**Unchanged:** Steps that are not yet reachable are not visually hidden — all 13 pills remain fully visible at page load. (GAP-78 still open.)

---

#### AC-F1.3 — The first stage makes clear what data is needed and why

**Rating:** ⚠️ Partial

**Evidence:**

The `showLoadJobPanel()` function in `job-input.js:91–183` renders a clear interface with a textarea placeholder "Paste the job description here…" and three input method tabs (Paste Text / From URL / Upload File). This panel is shown when `data.job_description_text` is falsy on status fetch, so the paste panel does appear on first load.

The generic empty-state fallback at `index.html:232–236` ("Select a tab to view content / Job description and analysis results will appear here") remains visible in the brief window before tab content hydrates. No inline instruction in that state says "paste a job description here."

The `🔍 Analyze Job` button in the action row (`index.html:182`) remains visible before any job description is provided; clicking it with an empty state produces an error with no adjacent proactive guidance.

No cycle 6 changes to this area.

---

### US-F2: Progressive Disclosure Through the Workflow

**Story:** The UI should reveal decisions at the moment they become relevant, not all at once.

---

#### AC-F2.1 — The UI reveals the next set of decisions in a staged way rather than all at once

**Rating:** ⚠️ Partial

**Evidence:**

**Positive:** The secondary tab bar applies progressive disclosure correctly. `updateTabBarForStage()` (`ui-core.js:607–616`) hides all tabs except those in `STAGE_TABS[stage]`. At startup, only the `job` tab is shown. The primary action button row in the chat panel shows only one action at a time via `display:none` toggling (`index.html:183–190`).

**Negative:** The top workflow bar does not apply progressive disclosure — all 13 workflow steps are always rendered and visible (`index.html:119–142`). At DOMContentLoaded, only `step-job` has interactive role/tabindex, but all 13 step pills are fully visible as static indicators. A first-time user sees the entire pipeline — Harvest, Thank You, Screening, Interview Prep, Cover Letter, Download — before completing the first step. (GAP-78 still open.)

The Customise stage (`STAGE_TABS.customizations`, `ui-core.js:353`) exposes 10 secondary tabs simultaneously (goals, questions, exp-review, ach-editor, skills-review, achievements-review, tagline-review, summary-review, publications-review, ats-score) with no visible ordering guide or intro text.

No cycle 6 changes to this area.

---

#### AC-F2.2 — Each stage communicates its purpose before demanding action

**Rating:** ⚠️ Partial

**Evidence:**

- **Job stage:** The load-job panel renders adequately once triggered (textarea, tabs, submit buttons), but the viewer empty-state shown before that loads does not explain the purpose.
- **Analysis stage:** `populateAnalysisTab()` renders a structured breakdown after the fact; no preamble explains what to expect before clicking Analyze.
- **Customise stage:** 10 tabs appear simultaneously with no ordering hint or introductory copy.
- **Layout Review stage:** The scope label (`layout-instruction.js:293`) explicitly states "💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." This is a strong positive.
- **Finalise stage:** `populateFinaliseTab()` (`finalise.js:68`) opens with "Archive this application to your CV history, update the response library, and optionally write any improvements back to Master CV Data." Reasonable one-line preamble.
- **Spell Check stage:** The "no issues found" path at `spell-check.js:147` now reads: "Continue when you are ready to generate your CV." Clearer than the action button label (see AC-F3.2).

No new stage-purpose changes in cycle 6 beyond the spell-btn label fix (see AC-F3.2).

---

#### AC-F2.3 — Stage transitions include enough feedback to keep a new user oriented

**Rating:** ✅ Pass

**Evidence:**

- The LLM busy overlay (`index.html:152–160`) shows a spinner, elapsed timer, and "Taking longer than usual" state badge during in-flight LLM calls.
- **Cycle 6 improvement (GAP-170):** `#llm-busy-label` now has `aria-live="polite" role="status"` (`index.html:155`), so screen readers announce LLM operation status changes. Sighted users were already served; this extends the behavior to assistive technology users.
- The conversation panel logs system messages at transitions: "Auto-analyzing loaded job description…" (`app.js:92`), "✅ Connection successful." (`app.js:72`).
- Phase changes trigger `stateManager.onPhaseChange()` → `updateWorkflowStepsClickable()`, unlocking the next step.
- **Cycle 6 improvement (GAP-172):** `updateWorkflowSteps()` now appends `<span class="sr-only">` per step pill with state labels, improving transition feedback for screen-reader users (`workflow-steps.js`).
- The `workflow-steps.js` step status system applies `active`, `completed`, `stale`, and `stale-critical` classes, all with distinct visual styling (`styles.css:149–156`).

The overall feedback mechanism is adequate. The additions in cycle 6 improve it for assistive technology users.

---

### US-F3: Confidence Before Finalisation

**Story:** A first-time user should know when application materials are ready, distinguish preview from final, and understand what is optional versus required.

---

#### AC-F3.1 — The system communicates whether key review steps are complete

**Rating:** ⚠️ Partial

**Evidence:**

- The `layout-freshness-chip` (`index.html:95`) displays "Layout current", "Layout outdated", or "Files outdated" based on `getLayoutFreshnessFromState()` (`state-manager.js:120–178`). It only appears after a preview has been generated (`showChip` is `false` when `previewAvailable` is false, `state-manager.js:127–136`). Before any preview exists, the chip is invisible with no placeholder.
- The ATS score badge (`index.html:86–93`) is hidden until analysis completes.
- There is no visual checklist, progress indicator, or "N of M steps complete" summary. GAP-14 (Workflow Progress Indicator) remains unimplemented.
- The workflow step bar applies `active`, `completed`, and `upcoming` CSS classes (`styles.css:149–154`) but there is no legend in the UI explaining what these visual states mean. GAP-172's `sr-only` span labels now announce state to screen readers, but sighted users who don't recognize green vs. blue vs. grey pills still have no key.

No cycle 6 changes to the overall completion signaling.

---

#### AC-F3.2 — The relationship between generation, layout review, and finalisation is understandable

**Rating:** ⚠️ Partial (improved from ❌ Fail in cycle 5)

**Evidence:**

**Cycle 6 improvement (GAP-169 — partial fix):** The primary chat-panel spell-btn CTA at `index.html:186` was renamed from `"Done — Generate CV →"` to `"Generate Preview →"`. This is the button most users will click to advance past spell check, and the new label correctly signals that the next step produces a preview, not a final deliverable.

**Remaining gap — spell-check.js not updated:** The two submit buttons rendered inside the spell-check viewer panel still read `"Done — Generate CV →"`:

- `spell-check.js:148` — "no issues found" path, rendered by `_renderSpellCheckNoIssues()`
- `spell-check.js:271` — "issues found" path, rendered at end of `renderSpellCheckResults()`

These buttons are shown directly in the viewer panel when the spell-check tab is active, and they are the buttons a user is most likely to click after reviewing their corrections. The label mismatch between the chat-panel button ("Generate Preview →") and the viewer-panel buttons ("Done — Generate CV →") creates inconsistency. A user who reads the viewer-panel button will still believe they are generating a final CV.

**Other unchanged issues:**

1. The three-step generation pipeline (spell check → preview → confirm → final files) is technically well-structured (`GENERATION_PHASES` in `state-manager.js:57–62`) but is not communicated at any point in the visible UI before the user begins.

2. The transition from `"✅ Confirm Layout"` to `"⬇️ Generate Final Files"` after layout confirmation (`layout-instruction.js:360–381`) is the only signal that confirming layout unlocked a new step. There is no explanatory text adjacent to these buttons.

3. `GENERATION_PHASES` defines four phases — `idle`, `layout_review`, `confirmed`, `final_complete` — and these are well-tracked in code, but no phase label or pipeline diagram is shown to the user at any time.

A first-time user who uses the viewer-panel submit buttons (the natural path) still cannot tell that "Done — Generate CV →" produces a preview only. (GAP-79, partially mitigated but not resolved.)

---

#### AC-F3.3 — The final stage distinguishes clearly between archive/finalise actions and optional follow-on work

**Rating:** ⚠️ Partial

**Evidence:**

The Finalise tab (`finalise.js:67–116`) contains:

- Preamble: "Archive this application to your CV history, update the response library, and optionally write any improvements back to Master CV Data." The word "optionally" is present, but refers to the harvest step rather than any form element.
- A status dropdown (Draft / Ready to send / Sent) — primary metadata.
- A notes textarea with a helpful placeholder.
- A `"✅ Finalise & Archive"` button — clear primary action.
- A `#harvest-section` div that becomes visible post-submit (`finalise.js:193–194`). The harvest section header reads `"📥 Update Master CV Data"` with a `"Skip"` button, which signals optionality. No "optional" or "bonus step" label is adjacent to the heading.

**Unchanged structural issue:** The Finalise tab (`#tab-finalise`) is hidden at page load (`style="display:none"`, `index.html:219`). The workflow step bar jumps from `"⬇️ Download"` to `"📩 Cover Letter"` (`index.html:131–133`). There is no "Finalise" step in the visual pipeline — a user navigating by the step bar will not discover the Archive step.

Post-download steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) are presented in the step bar as sequential pipeline steps with no visual separator or "optional" label. A first-time user has no indication these are supplementary extras, not required parts of CV delivery.

No cycle 6 changes to this area.

---

## Generated Materials Evaluation

No generated CV, cover letter, DOCX, or PDF files were inspected in this cycle. This evaluation is limited to the application UI and workflow source code.

---

## Terminology Audit for First-Time Users

| Term in UI | First-time-user clarity | Status |
| --- | --- | --- |
| Harvest | ❌ Opaque | No definition in context; step bar shows bare "🌾 Harvest"; tooltip "Harvest improvements" is hover-only; term defined in welcome modal step 3 but using the same opaque vocabulary (GAP-78 open) |
| Customise | ⚠️ Partial | Could mean free-text edit; actually means reviewing AI recommendations |
| Rewrites | ⚠️ Partial | Ambiguous: does the user rewrite, or does the AI? |
| Layout Review | ⚠️ Partial | Scope label correctly constrains to layout-only; the difference from the Download tab is not obvious |
| ATS | ⚠️ Partial | Acronym; expanded only as "ATS-optimised" in onboarding modal body — not defined inline |
| LLM | ❌ Opaque | Technical acronym in header ("LLM:") with no definition; ⚠ "Not ready" badge renders in red, alarming non-technical users (GAP-76 open) |
| Master CV Profile | ⚠️ Partial | Explained in onboarding; but referenced as `Master_CV_Data.json` filename in same modal — jarring technical switch |
| Finalise & Archive | ✅ Clear | Verb pair is actionable and understandable |
| Analyze Job | ✅ Clear | Imperative verb; primary entry action |
| Generate Preview → | ✅ Clear (new) | Chat-panel spell-btn CTA updated in cycle 6 (GAP-169); accurately describes the next step |
| Done — Generate CV → | ❌ Misleading | Unchanged in spell-check.js viewer panel (lines 148, 271); implies final delivery but produces only a layout preview (GAP-79 partially mitigated) |
| Open Master CV | ✅ Clear | Resolves cycle 5 GAP-156; direct and actionable |
| Generate Final Files | ⚠️ Partial | "Final" has no defined contrast with the prior preview — pipeline distinction still unexplained (GAP-79 open) |

---

## Cycle 6 Delta: What Changed Since Cycle 5

| Item | Cycle 5 finding | Cycle 6 status |
| --- | --- | --- |
| GAP-169: spell-btn CTA "Done — Generate CV →" misleading | ❌ Fail (cycle 5) | ⚠️ Partial — `index.html:186` fixed to "Generate Preview →"; `spell-check.js:148,271` still read "Done — Generate CV →" |
| GAP-170: LLM busy label not announced to screen readers | Open | ✅ RESOLVED — `#llm-busy-label` has `aria-live="polite" role="status"` (`index.html:155`) |
| GAP-172: Step bar state not announced to screen readers | Open | ✅ RESOLVED — `sr-only` spans added per step pill via `updateWorkflowSteps()` |
| GAP-173: :focus-visible rules missing | Open | ✅ RESOLVED — `:focus-visible` rules added to `.action-btn`, `.tab`, `.step` in `styles.css` |
| GAP-167: Step re-run not keyboard accessible | Open | ✅ RESOLVED — `.step-rerun` converted from `<span>` to `<button>` with `aria-label` |
| GAP-168: Sessions modal focus not set on open | Open | ✅ RESOLVED — `openSessionsModal()` calls `setInitialFocus()` after `trapFocus()` |
| GAP-166: Rewrite decisions lost on page reload | Open | ✅ RESOLVED — decisions persisted to localStorage per session (`rewrite-review.js`) |
| AC-F3.2 Preview vs. final generation explained | ❌ Fail (cycle 5) | ⚠️ Partial (cycle 6) — chat-panel button fixed; viewer-panel buttons not updated |
| AC-F2.1 Workflow step bar progressive disclosure | ⚠️ Partial | Unchanged — all 13 steps visible at page load (GAP-78 open) |
| AC-F1.3 Job tab empty-state inline instruction | ⚠️ Partial | Unchanged |
| GAP-14 Workflow progress indicator | Absent | Still absent |
| GAP-76 LLM provider prerequisite / alarm badge | Open | Still open |
| GAP-78 CV jargon terms defined on first encounter | Open | Still open |
| GAP-79 Preview vs. final pipeline invisible | Open | Partially mitigated (chat-panel label only); viewer-panel not fixed |
| AC-F3.3 Post-download optional steps labeled | ⚠️ Partial | Unchanged |
| "Don't show again" suppressible in empty state | New finding cycle 5 | Still unaddressed |

---

## Top Issues by Priority

1. **[US-F3 / AC-F3.2 — ⚠️ Partial — GAP-79 open]** The preview-vs-final generation pipeline remains unclear to first-time users. The chat-panel spell-btn was fixed to "Generate Preview →" (`index.html:186`), but the two submit buttons inside the spell-check viewer panel (`spell-check.js:148,271`) still read "Done — Generate CV →". Users who interact with the viewer panel — the natural path during active spell-checking — will still see the misleading label. Additionally, the three-step preview/confirm/final pipeline is never explained anywhere in the UI, and the label transitions between pipeline stages carry no explanatory text.

2. **[US-F1 / AC-F1.2 + US-F2 / AC-F2.1 — ⚠️ Partial — GAP-78 open]** All 13 workflow steps are visible from first page load. Interactivity is correctly gated by phase (GAP-72 resolved cycle 5), and screen-reader state announcements were added (GAP-172 resolved cycle 6), but visual disclosure is not staged. A first-time user sees Harvest, Thank You, Screening, Interview Prep, Cover Letter, and Download before completing Step 1.

3. **[US-F3 / AC-F3.1 — ⚠️ Partial — GAP-14 open]** No workflow progress indicator. The step bar applies `active` (blue) and `completed` (green) CSS classes (`styles.css:150–152`) and now has screen-reader state labels (GAP-172), but sighted users have no legend and no "N of M complete" summary.

4. **[Terminology — ❌ Opaque — GAP-76 open]** `"LLM:"` in the header with a ⚠ `"Not ready"` badge renders with `class="auth-badge unauthenticated"` in red (`styles.css:40`). For a non-technical professional, this is among the first things seen after dismissing the modal and reads as a system error.

5. **[US-F3 / AC-F3.3 — ⚠️ Partial]** The Finalise step is absent from the workflow step bar (bar jumps from ⬇️ Download → 📩 Cover Letter, `index.html:131–133`). Post-download steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) appear as sequential required pipeline steps with no "optional" label or visual divider.

6. **[US-F1 / AC-F1.1 — ⚠️ risk]** The "Don't show this again" checkbox (`index.html:375`) is on the `welcome-footer-present` footer which is also shown for the `empty` state. A user who checks the box and clicks "Open Master CV" in the empty state permanently suppresses onboarding before completing it.

---

## Additional Story Gaps / Proposed Story Items

**Proposed US-F4 — LLM Provider Prerequisite Disclosed at Onboarding (maps to GAP-76):** The welcome modal should list LLM provider configuration as a prerequisite alongside the Master CV requirement, with a link or button to the LLM Configuration Wizard. The current red ⚠ "Not ready" badge appears before the user has any context for the LLM provider concept.

**Proposed US-F5 — Preview vs. Final Pipeline Explained (maps to GAP-79):** The two submit buttons in the spell-check viewer panel (`spell-check.js:148,271`) should be updated from "Done — Generate CV →" to "Generate Preview →" to match the chat-panel button. Additionally, the three-step pipeline (preview → confirm → final files) should be communicated at the entry to the Layout Review stage with a brief inline description or numbered steps.

**Proposed US-F6 — Optional Post-Download Steps Labeled:** The workflow step bar should visually distinguish the post-CV-delivery steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) from the required CV generation pipeline, either with a divider, a separate section, or "Optional" labels. A first-time user cannot currently distinguish mandatory from supplementary workflow sections.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-F1 (AC-F1.1, F1.2, F1.3) | 0 | 3 | 0 | 0 | 0 |
| US-F2 (AC-F2.1, F2.2, F2.3) | 1 | 2 | 0 | 0 | 0 |
| US-F3 (AC-F3.1, F3.2, F3.3) | 0 | 3 | 0 | 0 | 0 |
| **Totals** | **1** | **8** | **0** | **0** | **0** |

**Key evidence references:**

- US-F1 AC-F1.1: welcome modal branches → `web/session-manager.js:169–192`, `web/index.html:343–386`
- US-F1 AC-F1.1: LLM alarm badge → `web/index.html:53–58`, `web/styles.css:40`
- US-F1 AC-F1.2: all 13 steps visible → `web/index.html:119–142`
- US-F1 AC-F1.3: empty-state fallback → `web/index.html:232–236`
- US-F1 AC-F1.3: load-job panel → `web/job-input.js:91–183`
- US-F2 AC-F2.1: stage tab disclosure → `web/ui-core.js:350–363`, `607–616`
- US-F2 AC-F2.2: layout scope label → `web/layout-instruction.js:293`
- US-F2 AC-F2.3 (pass): LLM busy overlay → `web/index.html:152–160`; GAP-170 fix → `index.html:155`
- US-F3 AC-F3.1: freshness chip → `web/index.html:95`, `web/state-manager.js:120–178`
- US-F3 AC-F3.2: spell-btn chat-panel fixed → `web/index.html:186` ("Generate Preview →")
- US-F3 AC-F3.2: spell-btn viewer-panel not fixed → `web/spell-check.js:148,271` ("Done — Generate CV →")
- US-F3 AC-F3.2: generation pipeline invisible → `web/state-manager.js:57–62`
- US-F3 AC-F3.3: Finalise tab hidden from step bar → `web/index.html:219,131–133`
- US-F3 AC-F3.3: harvest "Skip" button → `web/finalise.js:193–194`

**Evidence standard:** Every conclusion is independently verifiable from the cited source evidence above.
