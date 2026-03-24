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
