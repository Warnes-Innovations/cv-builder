<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# User Story: Graphical Designer Perspective
**Persona:** A visual designer evaluating both the software application's visual system and the visual quality of the generated resume and related materials
**Scope:** Two linked evaluations: (1) visual hierarchy, styling consistency, layout rhythm, affordance clarity, color/theme choices, familiar design language, preview presentation, branding coherence, and perceived product quality in the UI, and (2) the visual credibility and market-facing polish of generated resume materials
**Format:** Evaluation criteria presented as acceptance tests, with failure modes to guard against, while keeping application-review findings separate from output-review findings

---

## US-G1: Visual Hierarchy and Readability

**As a** graphical designer,
**I want to** verify that each workflow stage has clear visual hierarchy,
**So that** important actions, state changes, and review content are easy to scan.

**Evaluation Criteria:**
1. Headings, body text, helper text, and controls are visually distinct.
2. Primary actions are consistently prominent.
3. Dense review surfaces remain readable rather than visually flat.
4. Color and theme choices support both usability and visual attractiveness.

**Acceptance Criteria:**
- Users can visually identify primary actions and current context without effort.
- Large content screens maintain readable structure through typography and spacing.

---

## US-G2: Cross-Stage Visual Consistency

**As a** graphical designer,
**I want to** verify that the application feels like one cohesive product across all stages,
**So that** switching between analysis, review, layout, and finalisation does not feel visually disjointed.

**Evaluation Criteria:**
1. Repeated control types share consistent styling.
2. Status surfaces use a coherent visual language across stages.
3. Tabs, workflow bar, cards, and modals feel part of the same design system.
4. The interface uses familiar, standard interaction patterns unless there is a clear reason to diverge.

**Acceptance Criteria:**
- The application uses a coherent visual language across stages and interaction types.

---

## US-G3: Preview and Output Presentation Quality

**As a** graphical designer,
**I want to** evaluate the layout review and file-review surfaces for visual credibility,
**So that** the application feels polished and trustworthy when presenting generated outputs.

**Evaluation Criteria:**
1. The layout-preview area frames content clearly.
2. Supporting controls do not visually compete with the preview.
3. Final file-review surfaces present outputs and actions cleanly.
4. Generated materials reinforce a credible professional brand without relying on novelty or decorative excess.

**Acceptance Criteria:**
- Preview and final-review screens convey polish, clarity, and confidence.
