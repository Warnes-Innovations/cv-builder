<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

**Last Updated:** 2026-03-22 21:48 EDT

**Executive Summary:** This document describes the workflow that is currently implemented in the cv-builder web application, based on source inspection rather than user-story intent. It records the main user-visible stages, the backing phase state machine, and the staged-generation subflow for use in later workflow review.

## Contents
- [Purpose](#purpose)
- [Source of Truth](#source-of-truth)
- [User-Visible Workflow](#user-visible-workflow)
- [Implemented Stages](#implemented-stages)
- [Navigation and Iteration Behavior](#navigation-and-iteration-behavior)

## Purpose

This document records the workflow that the application currently implements, not the workflow the user stories may prefer.

It is intended to answer four questions:

1. What stages does the UI expose to the user?
2. What backend phases and transitions actually drive those stages?
3. What supporting tabs and side flows exist inside each stage?
4. How are workflow boundaries and transitions currently represented in the implementation?

## Source of Truth

The main workflow is implemented across these files:

- `scripts/utils/conversation_manager.py`
- `scripts/web_app.py`
- `web/index.html`
- `web/app.js`
- `web/state-manager.js`
- `web/ui-core.js`
- `web/session-actions.js`
- `web/workflow-steps.js`
- `web/job-input.js`
- `web/job-analysis.js`
- `web/rewrite-review.js`
- `web/spell-check.js`
- `web/layout-instruction.js`
- `web/finalise.js`

Two different state models matter:

1. The main conversation phase enum in `ConversationManager`:
   `init -> job_analysis -> customization -> rewrite_review -> spell_check -> generation -> layout_review -> refinement`
2. The staged-generation substate in session/client state, used for preview confirmation and final output regeneration.

## User-Visible Workflow

The top workflow bar currently shows this eight-step sequence:

1. Job Input
2. Analysis
3. Customise
4. Rewrites
5. Spell Check
6. Generate
7. Layout
8. Finalise

That sequence is rendered in `web/index.html` and updated dynamically by `web/workflow-steps.js`.

The second-level tab bar changes by stage. The user therefore experiences both:

1. A primary stage workflow bar
2. A stage-specific tab workspace underneath it

The stage-to-tab mapping is currently:

| Stage | Tabs shown in the second bar |
| --- | --- |
| Job | Job |
| Analysis | Analysis, Questions |
| Customise | Experiences, Experience Bullets, Skills, Achievements, Summary, Publications |
| Rewrites | Rewrites |
| Spell Check | Spell Check |
| Generate | Generated CV |
| Layout | Layout |
| Finalise | File Review, Finalise, Master CV, Cover Letter, Screening |

## Implemented Stages

### 1. Job Intake and Session Selection

The application starts on the Job tab.

From there the user can:

1. Resume a saved session
2. Open a saved server-side job file
3. Paste a job description
4. Fetch a job description from a URL
5. Upload a job-description file

This behavior is implemented primarily in `web/job-input.js` and backed by status/session endpoints in `scripts/web_app.py`.

Implementation notes:

1. The app supports resuming prior work from the start of the workflow.
2. URL ingestion includes special guidance for protected sites such as LinkedIn, Indeed, and Glassdoor.
3. A new job can exist in state before analysis has started.

### 2. Intake Confirmation and Job Analysis

Analysis includes both the analysis action itself and follow-up clarification handling.

The implemented flow is:

1. The user provides a job description.
2. The frontend checks whether intake metadata has been confirmed.
3. The user triggers `analyze_job`.
4. The backend stores structured job analysis in session state.
5. The UI renders the Analysis tab.
6. The UI then drives a separate Questions tab for post-analysis clarifications.

Implementation notes:

1. Analysis and clarification are one logical stage in the workflow bar, but they are split across two tabs.
2. ATS refresh is already wired into the analysis step.
3. Analysis is action-driven through `POST /api/action` with `action = analyze_job`.

### 3. Customization Workspace

After analysis, the user moves into a multi-tab customization workspace rather than a single review screen.

The implemented customization area includes:

1. Experience selection and ordering
2. Experience bullet editing and AI rewrites
3. Skill review and inclusion/exclusion
4. Achievement review
5. Summary review
6. Publication review

Implementation notes:

1. This stage spans multiple tabs.
2. The top workflow bar shows one step, but the actual workspace is several tabs wide.
3. User decisions are persisted in session state, not written back to the master CV.
4. The user leaves this area by requesting rewrite review, not by generating final files directly.
5. Although an ATS Score tab exists in the HTML, it is not currently exposed through the stage-to-tab mapping for the customization stage.

### 4. Rewrite Review

The rewrite step is implemented in `web/rewrite-review.js`.

The implemented flow is:

1. The app fetches pending rewrites from `GET /api/rewrites`.
2. If there are no rewrites, the frontend skips directly to `generate_cv`.
3. If rewrites exist, the UI renders rewrite cards with inline diff presentation.
4. The user must accept, edit, or reject every rewrite.
5. Submission sends decisions to the backend.
6. The backend stores `approved_rewrites` and `rewrite_audit`, then advances the phase to `spell_check`.

Implementation notes:

1. Persuasion warnings can be shown before rewrite submission.
2. This step is mandatory only when rewrites exist.
3. Edited rewrites remain part of the audit trail.

### 5. Spell and Grammar Check

Spell check is a distinct workflow stage between rewrites and generation.

The implemented flow is:

1. The Spell Check tab gathers generated text sections to inspect.
2. Each section is checked through spell/grammar endpoints.
3. The user can accept a replacement, apply a custom correction, ignore a flag, or add a word to the custom dictionary.
4. The user submits spell-check decisions.
5. The backend stores `spell_audit` and advances the main phase to `generation`.
6. The frontend immediately calls `generate_cv` after successful completion.

Implementation notes:

1. If there are no sections or no flags, the frontend uses a fast path and auto-continues.
2. The spell-check stage is visible in the workflow bar and has its own tab.
3. The user does not manually move from Spell Check into Generate; the UI triggers generation after spell-check completion.

### 6. Initial Generation

The Generate step is followed by layout review.

The implemented flow is:

1. The frontend calls `sendAction('generate_cv')`.
2. The backend calls `orchestrator.generate_cv(...)` using current job analysis, customizations, approved rewrites, and spell audit.
3. Generated files are written and progress is recorded.
4. The backend sets the main workflow phase to `layout_review`.
5. The frontend announces success and immediately switches the user to the Layout tab.

Implementation notes:

1. The Generate stage exists in the workflow bar, but successful generation does not leave the user parked on the Generate tab.
2. The app treats generation as the handoff into layout review, not as the end of the document workflow.
3. The Generated CV tab still exists and can be visited, but the default next screen is Layout.

### 7. Layout Review and Final Regeneration

Layout review is a separate stage implemented in `web/layout-instruction.js` and staged-generation routes in `scripts/web_app.py`.

The implemented flow is:

1. The Layout tab loads an HTML preview.
2. If needed, the app generates or refreshes preview HTML with `POST /api/cv/generate-preview`.
3. The user enters natural-language layout instructions.
4. The app applies instructions with `POST /api/cv/layout-refine` when session preview state is available, or a legacy layout endpoint otherwise.
5. The preview updates and instruction history is shown.
6. When the user completes layout review, the app tries to confirm layout, regenerate final HTML/PDF via `POST /api/cv/generate-final`, and then records layout completion via `POST /api/layout-complete`.
7. The frontend switches to the File Review tab and sets the main phase to refinement/finalise.

Implementation notes:

1. Layout review uses an iterative instruction loop.
2. The main phase and the staged-generation substate both change during this stage.
3. Final PDF regeneration happens here, after layout confirmation, not during the earlier `generate_cv` handoff alone.

### 8. Finalise, Archive, and Optional Harvest Apply

The final stage combines file review, archival actions, and optional write-back to the master CV.

The implemented flow is:

1. The user lands on File Review / Finalise after layout completion.
2. The Finalise tab shows generated files, consistency information, status, and notes.
3. The user finalises the application with `POST /api/finalise`.
4. After successful finalisation, the UI reveals harvest candidates.
5. The user can optionally apply selected candidates through `POST /api/harvest/apply`.

This stage also includes tabs for:

1. Master CV
2. Cover Letter
3. Screening

The full final-stage tab set currently exposed to the user is:

1. File Review
2. Finalise
3. Master CV
4. Cover Letter
5. Screening

Implementation notes:

1. Finalise includes archive actions and post-generation workspace tabs.
2. Harvest apply is the explicit end-of-workflow path that may write session-derived improvements back to the master CV.
3. This is the only stage in the main customization workflow where master-data write-back is intentionally allowed.

## Navigation and Iteration Behavior

### Session Restoration

The app is designed to restore and continue sessions, not only to run linear one-pass workflows.

Users can resume prior work from saved sessions and re-enter the flow in the phase already stored in session state.

### Back Navigation

Completed workflow steps in the top bar are clickable.

When the user navigates back:

1. The app shows a confirmation modal if downstream work exists.
2. Prior decisions are preserved.
3. The backend uses `POST /api/back-to-phase` to move the main phase backward without clearing downstream state.

### Re-run Behavior

Several steps support explicit re-run behavior.

These include:

1. Analysis
2. Customizations
3. Rewrite review
4. Spell check
5. Generate

The re-run path preserves downstream context so that the app can refine earlier outputs instead of forcing a full reset.