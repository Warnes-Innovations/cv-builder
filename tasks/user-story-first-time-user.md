<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# User Story: First-Time User Perspective
**Persona:** A capable professional using CV Builder for the first time with no prior knowledge of its workflow or terminology
**Scope:** Onboarding, terminology clarity, first-run guidance, confidence at each stage, and ease of understanding what to do next
**Format:** Evaluation criteria presented as acceptance tests, with failure modes to guard against

---

## US-F1: First-Run Orientation

**As a** first-time user,
**I want to** understand what this application does and how to begin without prior training,
**So that** I can start the workflow confidently on first use.

**Evaluation Criteria:**
1. The entry screen explains the first required action clearly.
2. Key workflow concepts are understandable without domain-specific prior knowledge.
3. The first stage makes clear what data is needed and why.

**Failure Modes to Guard Against:**
- Users being dropped into a complex screen with no clear primary action.
- Terms like rewrites, customisations, layout review, or harvest appearing without context.

**Acceptance Criteria:**
- A new user can identify the first step and expected input without external help.
- Stage names and action labels are understandable in context.

---

## US-F2: Progressive Disclosure Through the Workflow

**As a** first-time user,
**I want to** encounter decisions at the moment they become relevant,
**So that** I am not overloaded by too many concepts or controls at once.

**Evaluation Criteria:**
1. The UI reveals the next set of decisions in a staged way rather than all at once.
2. Each stage communicates its purpose before demanding action.
3. The transition from one stage to the next feels predictable.

**Failure Modes to Guard Against:**
- Too many tabs, controls, or special cases exposed before the user understands the current step.
- Major stage transitions happening with insufficient explanation.

**Acceptance Criteria:**
- The workflow can be followed sequentially without guessing which surface is primary.
- Stage transitions include enough feedback to keep a new user oriented.

---

## US-F3: Confidence Before Finalisation

**As a** first-time user,
**I want to** know when my application materials are actually ready,
**So that** I do not finalise too early or miss required review steps.

**Evaluation Criteria:**
1. The system communicates whether key review steps are complete.
2. The relationship between generation, layout review, and finalisation is understandable.
3. The final stage makes clear what is optional versus required.

**Failure Modes to Guard Against:**
- Users mistaking preview generation for final completion.
- Optional post-generation actions looking mandatory, or vice versa.

**Acceptance Criteria:**
- A first-time user can tell when they are previewing, refining, and finalising.
- The final stage distinguishes clearly between archive/finalise actions and optional follow-on work.

---

## US-F4: Onboarding — Creating the Master CV Before First Use

**As a** first-time user arriving at CV Builder without an existing `Master_CV_Data.json`,  
**I want to** be guided clearly through creating my master CV from the materials I already have,  
**So that** I can complete the prerequisite before starting a job application without feeling confused or blocked.

**Evaluation Criteria:**
1. The app detects the missing master CV and immediately explains what it is and why it is needed — before showing any job-application UI.
2. The available creation paths (import from LinkedIn, upload resume, import publications, link GitHub profile, or manual entry) are clearly labelled with what each path requires and what it produces.
3. The user is not required to have all source materials at once; a partial import followed by manual additions is an explicitly supported path.
4. The import and review steps feel like a guided setup wizard, not a raw file-management operation.

**Failure Modes to Guard Against:**
- Showing a broken job-application UI when master CV is absent, with no explanation or route to fix it.
- Requiring the user to understand JSON, file paths, or git before they can start.
- Providing only the "upload JSON" path, which presupposes an existing `Master_CV_Data.json`.

**Acceptance Criteria:**
- A first-time user with no `Master_CV_Data.json` is shown the onboarding path selection screen on first launch, not an error.
- At least three distinct creation paths are available and described plainly (e.g., "I have a LinkedIn export," "I have a resume file," "I'll enter my information manually").
- The user completes initial master CV creation and reaches the job-application start screen without needing to touch the file system or configuration files directly.
- See `tasks/user-story-master-cv-onboarding.md` for detailed acceptance criteria by source type.
