<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# First-Time User Review Status

**Last Updated:** 2026-04-20 17:30 ET
**Persona:** A capable professional using CV Builder for the first time with no prior knowledge of its workflow or terminology.

**Executive Summary:** The job-application workflow (US-F1 through US-F3) is functionally correct for a returning user but presents a steep orientation problem for first-time users: there is no welcome screen, no explanation of what the app does, the LLM must be configured before anything works but is not prominently surfaced, and the "Master CV" prerequisite is never explained. US-F4 (onboarding for a missing master CV) is entirely unimplemented — the backend raises a raw `FileNotFoundError` with a developer message, and no creation wizard, import path, or guidance exists in the UI.

---

## Application Evaluation

### US-F1 — First-Run Orientation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. Entry screen explains first required action clearly | ⚠️ Partial | `job-input.js:showLoadJobPanel()` renders "📥 Add Job Description" with paste/URL/file tabs — the immediate action is findable, but the screen title "CV Customizer" (`index.html:32`) and the app itself are never explained. No introductory copy tells a first-time user what the application does or why they need a job description. |
| 2. Key workflow concepts understandable without prior knowledge | ❌ Fail | Tab bar exposes "📚 Master CV," "📊 ATS Score," "✏️ Rewrites," "🏆 Achievements," and "🔤 Spell Check" from session start (`index.html:117–144`). "Master CV," "ATS," and "Harvest" (in Finalise) are undefined terms not glossed anywhere in the UI. |
| 3. First stage makes clear what data is needed and why | ⚠️ Partial | The job input panel says "Paste the job description here…" (`job-input.js:112`), which tells you *what* to paste but not *why*. The prerequisite that `Master_CV_Data.json` must already exist is never stated. |

**Acceptance criterion: new user can identify first step without external help** — ⚠️ Partial. First step is discoverable; application purpose is not.

**Acceptance criterion: stage names and action labels are understandable** — ❌ Fail. "Customise," "Rewrites," "ATS Score," "Harvest" have no first-time-user context.

**Failure mode — users dropped into complex screen with no clear primary action** — ⚠️ Partially triggered. On first visit with no session URL parameter, `ensureSessionContext()` (`session-manager.js:271–279`) renders a landing panel headlined "Select a Session" with subtext "Each browser tab now works against its own URL-scoped session" — technical architecture copy, not user orientation.

**Failure mode — terms like "rewrites," "customisations," "harvest" without context** — ❌ Confirmed. All appear in the persistent tab bar without definition.

---

### US-F2 — Progressive Disclosure Through the Workflow

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. UI reveals next decisions in a staged way | ✅ Pass | `STAGE_TABS` in `ui-core.js:343–354` maps each workflow step to a restricted set of second-level tabs; `updateTabBarForStage()` hides off-stage tabs dynamically. Only stage-appropriate tabs are visible at any time. |
| 2. Each stage communicates its purpose before demanding action | ⚠️ Partial | Workflow bar shows step names with `title` tooltip attributes (e.g., `title="Job analysis"` — `index.html:79`). No stage-entry explanation panel, banner, or instructional copy is rendered when the user enters a new stage for the first time. |
| 3. Transition from one stage to the next feels predictable | ⚠️ Partial | The Spell Check → Generate transition is automatic and invisible: after `submitSpellCheckDecisions()` completes, the frontend calls `generate_cv` directly (see `current-implemented-workflow.md` §5). User receives no "now generating" message before the tab switches. The Generate → Layout transition is explicit via "🎨 Open Layout Review →" button (`index.html:151`). |

**Acceptance criterion: workflow can be followed without guessing** — ✅ Pass. Top progress bar and primary action buttons (`_STAGE_BUTTON_MAP` in `ui-helpers.js:143–151`) enforce one primary action per stage.

**Acceptance criterion: stage transitions include enough feedback** — ⚠️ Partial. Conversation panel messages help, but the Spell Check auto-advance to Generate is undisclosed.

---

### US-F3 — Confidence Before Finalisation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. System communicates whether key review steps are complete | ⚠️ Partial | Completed steps gain a `completed` CSS class in the top bar and become click-navigable (`workflow-steps.js:_STEP_ORDER`). There is no explicit checklist or "all required steps done" confirmation banner. |
| 2. Relationship between generation, layout review, and finalisation is understandable | ❌ Fail | The layout-freshness chip (`state-manager.js:getLayoutFreshnessFromState()`) tracks file staleness, but the conceptual pipeline (preview → confirm → final PDF) is not explained anywhere in the UI. Four separate tabs — "📄 Generated CV," "🎨 Layout Review," "⬇️ File Review," "✅ Finalise" — appear with no bridging explanation. |
| 3. Final stage distinguishes optional from required clearly | ❌ Fail | The Finalise stage exposes five tabs: File Review, Finalise, Master CV, Cover Letter, Screening (`ui-core.js:STAGE_TABS.finalise`). None is labeled optional or required. "Harvest" candidates appear after finalisation with no indication they are optional. The Cover Letter and Screening tabs alongside "✅ Finalise" imply additional required work. |

**Acceptance criterion: first-time user can tell when previewing, refining, finalising** — ⚠️ Partial. Stage names exist; preview-vs-final-PDF distinction is invisible.

**Acceptance criterion: final stage distinguishes archive/finalise from optional follow-on** — ❌ Fail. No labeling, icon differentiation, or instructional copy distinguishes them.

---

### US-F4 — Onboarding: Creating the Master CV Before First Use

This story is almost entirely unimplemented.

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. App detects missing master CV and explains what it is before job-application UI | ❌ Fail | `cv_orchestrator.py:130–133` raises `FileNotFoundError("Master data file not found: ... Please create Master_CV_Data.json first.")` when `master_data_path` is absent. This propagates to the session factory (`web_app.py:_build_objects_for_registry`) and would surface as a 500 error. No UI intercepts it; no onboarding redirect exists. |
| 2. Creation paths (LinkedIn, resume, manual) clearly labelled | 🔲 Not Impl. | `master-cv.js:populateMasterTab()` renders the Master CV editor for an *existing* profile. The only import available is "⬆️ Import BibTeX" for publications. No LinkedIn-export importer, resume-to-JSON converter, or "build from scratch" wizard exists. |
| 3. Partial import + manual additions explicitly supported | 🔲 Not Impl. | No partial-import workflow exists anywhere in the codebase. |
| 4. Import and review feel like a guided setup wizard | 🔲 Not Impl. | A raw "⬇️ Export JSON" button and a governance warning ("Edits on this tab write directly to `Master_CV_Data.json`") at `master-cv.js:72` presuppose a file that already exists. No wizard flow is implemented. |

**Acceptance criterion: first-time user with no `Master_CV_Data.json` is shown onboarding, not an error** — ❌ Fail. Raw `FileNotFoundError` would propagate.

**Acceptance criterion: at least three distinct creation paths available and described** — ❌ Fail. Zero creation paths are implemented.

**Acceptance criterion: user reaches job-application start screen without touching file system** — ❌ Fail. Requires manual creation of `Master_CV_Data.json`.

---

## Onboarding and Discoverability

### Initial orientation

- No welcome screen, splash screen, or app-description copy exists anywhere in `index.html` or the JS modules. The page title is "CV Generator — Professional Web UI" (`index.html:14`) but only visible in the browser tab.
- First visible content for a no-session visit is the Sessions modal auto-opened over a panel reading "Select a Session" (`session-manager.js:204–219`). No "what is this app?" framing is present.

### LLM configuration discoverability

- The LLM status pill shows "⚠️ Not ready" on load (`index.html:50–57`). A first-time user may not recognize that clicking "LLM: Loading… ⚠ Not ready" opens the LLM Configuration Wizard — the affordance is a header pill with a chevron, not a prominent "Get Started" or "Configure now" CTA.
- Clicking Analyze Job with an unconfigured LLM produces a silent failure. The wizard (`index.html:263–400`) is well-structured once found, but is not surfaced proactively.

### Help text and empty states

- The document area shows a generic empty state ("Select a tab to view content") before a session exists (`index.html:202–207`). No guidance for new users.
- The Questions tab has a clear empty-state: "Run 'Analyze Job' first to generate clarifying questions" (`questions-panel.js:populateQuestionsTab()`). This is a positive example to replicate in other tabs.
- The Master CV tab shows a governance warning but no "how to get started" for users who have no data yet.

### Error recovery

- Session claim conflicts show a well-designed three-button dialog (Load Different / New Session / Take Over) (`session-switcher-ui.js`). Good recovery UX.
- Backend errors from a missing master CV file would appear as unhandled 500 responses with Python developer-facing text.

---

## Terminology Clarity

| Term | Where it appears | First-impression problem |
|------|-----------------|--------------------------|
| **Master CV** | Tab label, governance notice, error messages | Central concept never defined; sounds like a special file format |
| **ATS** / **ATS Score** | Tab label `index.html:128`, position bar badge | Acronym undefined; "Applicant Tracking System" is HR jargon |
| **Harvest** | Post-finalisation workflow | Appears only after finalisation with no prior mention; sounds like a data-extraction operation |
| **Customise** | Workflow step name `index.html:82` | Vague: customise *what*? compared to what? |
| **Rewrites** | Workflow step name `index.html:83` | Ambiguous: whose rewrites? what is being rewritten? |
| **Refinement** | Backend phase name leaking into session-switcher labels | Internal implementation term, not user language |
| **Session** | Landing panel headline `session-manager.js:207` | "Each browser tab works against its own URL-scoped session" is architecture copy, not user benefit |

---

## Additional Story Gaps / Proposed Story Items

### GAP-FU-1 (High): No welcome screen or application purpose statement

There is no entry point that tells a new user what CV Builder does, what a "Master CV" is, or what the workflow produces.

**Proposed story:** *As a first-time user, I want to see a brief explanation of what CV Builder does and what I need to get started, so that I can decide if I'm in the right place and know what to prepare.*

### GAP-FU-2 (Critical): No master CV onboarding flow

`FileNotFoundError` is raised when `Master_CV_Data.json` is absent. No UI intercepts this. This is a hard block for any new user.

**Proposed story:** *As a first-time user without a Master_CV_Data.json, I want to be guided through creating one from my existing materials (LinkedIn export, resume file, or manual entry), so that I can start using CV Builder without touching the file system.*

### GAP-FU-3 (Medium): LLM setup not proactively surfaced

The "⚠️ Not ready" status pill is passive. A first-time user will click Analyze Job and receive a failure before realizing LLM configuration is required.

**Proposed story:** *As a first-time user, if the LLM is not yet configured, I want to see a prominent "Set up your AI model" CTA before workflow actions, so that I can configure it before hitting a silent failure.*

### GAP-FU-4 (Medium): Stage-entry orientation messaging absent

No instructional copy appears when the user enters a new workflow stage for the first time.

**Proposed story:** *As a first-time user, I want each workflow stage to show a one-sentence explanation of what I'm doing and why, so that I understand the purpose before taking action.*

### GAP-FU-5 (Low): Domain terminology undefined throughout UI

Terms like "ATS," "harvest," and "Master CV" appear without definition or tooltip.

**Proposed story:** *As a first-time user, I want undefined domain terms to have a tooltip or brief inline explanation, so that I don't need external knowledge to interpret the UI.*

### GAP-FU-6 (Low): Spell Check → Generate silent auto-advance

The transition from Spell Check to Generate happens programmatically with no user-visible announcement, disorienting new users.

**Proposed story:** *As a first-time user completing Spell Check, I want to see a "Generation starting…" message before the tab changes, so that I know my decisions were applied and CV generation is beginning.*

---

## Generated Materials Evaluation

— N/A. This persona does not reach the generation stage in the implemented workflow because the master CV prerequisite (US-F4) is unimplemented. Once US-F4 is addressed, a generated-materials review for this persona would be appropriate.

---

## Summary Table

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-F1 First-Run Orientation | — | C1, C3 | C2 | — | — |
| US-F2 Progressive Disclosure | C1 | C2, C3 | — | — | — |
| US-F3 Confidence Before Finalisation | — | C1 | C2, C3 | — | — |
| US-F4 Master CV Onboarding | — | — | C1 | C2, C3, C4 | — |

**Story tally:** 1 criterion pass · 7 partial · 4 fail · 3 not implemented

---

## Top 5 Gaps by Severity

| # | Gap | Severity | Story |
|---|-----|----------|-------|
| 1 | No master CV onboarding; `FileNotFoundError` exposed to first-time users | **Critical** | US-F4 |
| 2 | No welcome screen or app-purpose explanation at first visit | **High** | US-F1 |
| 3 | LLM setup not proactively surfaced; silent failure before first Analyze | **Medium** | GAP-FU-3 |
| 4 | Optional vs. required actions in Finalise stage not distinguished | **Medium** | US-F3 |
| 5 | Domain terminology (ATS, Harvest, Master CV) undefined throughout UI | **Medium** | US-F1, US-F2 |

---

**Reviewed against:**
- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/session-manager.js`
- `web/session-switcher-ui.js`
- `web/job-input.js`
- `web/workflow-steps.js`
- `web/questions-panel.js`
- `web/master-cv.js`
- `scripts/web_app.py`
- `scripts/utils/cv_orchestrator.py`
- `tasks/user-story-first-time-user.md`
- `tasks/current-implemented-workflow.md`

**Evidence standard:** Every conclusion supported by source file and line number citation.
