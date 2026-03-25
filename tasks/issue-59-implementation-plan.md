<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

**Last Updated:** 2026-03-24 21:48 EDT

**Executive Summary:** This document defines a development-only implementation plan for issue #59: generating deterministic CV artifacts from example profile fixtures and running persona reviews limited to appearance, layout, and structure. The current recommendation is to build a fixture-driven helper plus a documented review workflow that reuses existing example-profile, generation, and persona-review infrastructure without adding any runtime product feature.

Execution companion: see `tasks/issue-59-implementation-task-list.md` for the concrete work breakdown derived from this plan.

## Contents
- [Goal](#goal)
- [Current State](#current-state)
- [Recommended Approach](#recommended-approach)
- [Reviewed Decisions](#reviewed-decisions)
- [Design Decisions](#design-decisions)
- [Phased Plan](#phased-plan)
- [Risks](#risks)
- [Open Questions](#open-questions)

## Goal

Implement a repeatable development and QA workflow that:

1. Generates CV output artifacts from repository-owned example `Master_CV_Data.json` and `publications.bib` fixtures.
2. Packages those artifacts into a reviewable bundle for persona-based evaluation.
3. Constrains persona review to appearance, layout, and structure rather than content quality.
4. Persists the review output in repository-visible artifacts that can be inspected and diffed over time.

## Current State

The repository already contains the main building blocks needed for this workflow.

### Existing strengths

- Example profile fixtures already exist under `tests/fixtures/example_profiles/` with simple, medium, and complex tiers.
- Fixture materialization helper logic already exists in `tests/helpers/example_profiles.py`.
- CV generation already supports non-`~/CV` paths via `CVOrchestrator` constructor arguments and output-dir parameters.
- Staged generation and final-output flows already exist, including HTML preview and final HTML/PDF generation.
- Persona review conventions already separate `Application Evaluation` from `Generated Materials Evaluation` under `tasks/review-status/`.
- Story coverage already includes layout and presentation concerns, especially for the graphical-designer, UX, hiring-manager, and HR/ATS personas.

### Main gap

The missing layer is a dedicated developer workflow that combines fixture-based generation, export normalization, and generated-material persona review into one repeatable process.

## Recommended Approach

Use a development-only workflow centered on a reusable fixture-generation helper plus documented persona review steps.

### Core implementation shape

1. Add a helper module that materializes an example profile into a temporary workspace and generates the artifact set.
2. Generate a canonical artifact manifest containing profile name, job-analysis input, output file paths, and summary metadata.
3. Export a normalized review bundle so personas can review layout and structure consistently.
4. Create a dedicated layout-review constraints document that explicitly excludes content critique.
5. Write persona findings to separate fixture-review markdown outputs under `tasks/review-status/`.

### Why this approach

- It preserves the boundary between development tooling and runtime application behavior.
- It reuses tested fixture and generation code instead of inventing a parallel path.
- It keeps review outputs in git-visible markdown files rather than hidden session state.
- It can start as a manual or script-driven workflow and later grow into CI if it proves useful.

## Reviewed Decisions

The following decisions were reviewed with the user in an OBO-style sequence and should be treated as current planning direction.

1. Review bundle format
   - Decision: prioritize a normalized review bundle.
   - Meaning: the first implementation should produce raw generated files plus normalized exports such as screenshots and structural/text views for persona review.

2. Initial pilot persona scope
   - Decision: use a broader set rather than a narrow designer-only pilot.
   - Emphasis: applicant, hiring manager, and HR/ATS should be treated as the key customer personas for the first pass.
   - Confirmed pilot set: applicant, hiring-manager, HR/ATS, graphical-designer, and UX.
   - Implication: the plan should not optimize only for aesthetic critique; it must also support document usability, submission readiness, ATS-facing structure, and broader presentation clarity.

3. Delivery mode for version one
   - Decision: manual-first.
   - Meaning: the first version should be easy for a developer to run on demand, while keeping the structure clean enough that CI can be added later without major redesign.

4. Review-output organization
   - Decision: use dedicated persona-specific fixture-review files plus a central rollup.
   - Meaning: version one should keep one markdown file per persona for detailed findings and also maintain a summary document that consolidates the fixture-review run.

5. Canonical initial job-analysis input
   - Decision: start with a single canonical engineering role.
   - Meaning: version one should target one stable repository-owned engineering or technical job-analysis input rather than multiple role families.

6. Canonical first-pass fixture tier
   - Decision: use the complex example profile for the first implementation.
   - Meaning: version one should bias toward surfacing pagination, density, and layout stress issues early.
   - Planned follow-on: expand coverage to all three fixture tiers later.

7. Job-analysis fixture location
   - Decision: keep the canonical engineering-role input under `tests/fixtures/`.
   - Meaning: the review workflow should treat the job-analysis input as repository-owned test data rather than as a top-level sample or ad hoc file.
   - Canonical filename: `tests/fixtures/fixture_job_engineering.json`.
   - Naming pattern: future position-type variants should follow `fixture_job_{position_type}.json`.

8. Central rollup lifecycle
   - Decision: create timestamped rollups per run.
   - Meaning: each review run should preserve its own summary artifact rather than overwriting one latest file or appending into a single cumulative history document.

9. Rollup filename shape
   - Decision: keep rollup filenames timestamp-only.
   - Meaning: profile tier should live in document metadata or body content rather than in the filename itself.

10. Future multi-tier rollup strategy
   - Decision: use one shared rollup for a multi-tier run.
   - Meaning: when the workflow expands beyond the `complex` tier, one timestamped rollup should summarize all tiers covered in that run.

## Design Decisions

### Decision 1: Reviewable artifact format

Reviewed direction: review a normalized bundle, not only raw files.

Preferred bundle contents:

1. Raw generated files: HTML, PDF, ATS DOCX, and any metadata manifest.
2. Screenshot or image exports for visual review.
3. Extracted text or structural summary views for ATS and hierarchy review.

Reasoning:

- Personas reviewing layout need a consistent rendering surface.
- Raw PDF and DOCX alone make automated or repeatable review harder.
- A normalized bundle reduces tool assumptions and makes review prompts more deterministic.

### Decision 2: Review persistence location

Reviewed direction: keep fixture-review outputs in separate markdown files under `tasks/review-status/` rather than merging them into the existing application-review files, and add a central rollup for each fixture-review run.

Suggested naming pattern:

- `tasks/review-status/graphical-designer-fixture-review.md`
- `tasks/review-status/ux-expert-fixture-review.md`
- `tasks/review-status/hr-ats-fixture-review.md`
- `tasks/fixture-layout-review-rollups/YYYY-MM-DD-HHMM.md`

Reasoning:

- It avoids mixing runtime application review with fixture-generated artifact review.
- It keeps merge conflict risk low by maintaining one file per persona.
- It aligns with the repository’s current persona-review storage pattern.
- The rollup provides one place to summarize cross-persona findings and review outcomes for a given run.
- Timestamped rollups preserve historical comparisons without turning one file into an append-only log.
- Keeping filenames timestamp-only avoids overloading the path with run metadata that can be captured inside the document itself.
- A single shared rollup keeps future multi-tier review runs easier to browse and compare as one event.

### Decision 3: Workflow form

Reviewed direction: start with a manual-first script-plus-doc workflow, not a runtime feature and not a large browser-first test harness.

Suggested initial pieces:

1. A reusable generation helper in `tests/helpers/` or a dedicated development script in `scripts/`.
2. A workflow doc explaining how to generate, package, and review artifacts.
3. A focused validation path to ensure the helper remains reliable.

Reasoning:

- The workflow is primarily integration and documentation, not product behavior.
- A script/helper is easier to run in local dev and CI than a UI-driven flow.
- It keeps the first implementation small and testable.

## Phased Plan

### Phase 1: Fixture artifact generation

Deliverables:

1. Reusable helper that materializes a named example profile into a temporary or supplied output root.
2. Deterministic generation of the initial artifact set.
3. Manifest file describing the generated bundle.

Tasks:

1. Use the `complex` example profile as the canonical first-pass fixture.
2. Reuse `tests/helpers/example_profiles.py` for fixture staging.
3. Reuse `CVOrchestrator` generation paths with non-user-owned inputs and output directories.
4. Add one repository-owned canonical engineering-role job-analysis input under `tests/fixtures/` for deterministic first-pass review runs.
5. Add a focused regression test for fixture-to-artifact generation.
6. Record future expansion from the `complex` tier to all three fixture tiers.

### Phase 2: Normalized review bundle

Deliverables:

1. Export step that creates screenshots or equivalent rendered views.
2. Extracted text or structure summaries for ATS or hierarchy review.
3. Manifest fields that identify exactly what was reviewed.

Tasks:

1. Decide the minimum normalized artifact set.
2. Implement export helpers around the generated output bundle.
3. Validate that the bundle can be reproduced locally and in CI-like environments.

### Phase 3: Persona review constraints and output format

Deliverables:

1. Layout-review constraints document.
2. Persona-specific fixture-review output template or convention.
3. Timestamped central fixture-review rollup document.
4. Initial run with the broader pilot persona set.

Tasks:

1. Define in-scope versus out-of-scope review criteria.
2. Pilot with applicant, hiring-manager, HR/ATS, graphical-designer, and UX.
3. Store findings in dedicated `tasks/review-status/*-fixture-review.md` files.
4. Publish a timestamped central rollup summarizing cross-persona findings for the run.

### Phase 4: Optional automation

Deliverables:

1. Optional task or CI entry point.
2. Optional metrics or trend summaries.

Tasks:

1. Decide whether the workflow should stay manual, become release-gated, or run in CI.
2. Add a repeatable entry point once the bundle shape and persona scope are stable.

## Risks

1. Persona scope drift
   - Risk: reviewers critique content instead of layout.
   - Mitigation: explicit constraints document and review prompts that reject content commentary.

2. Fixture mismatch
   - Risk: fixture tiers do not expose meaningful layout failures.
   - Mitigation: start with medium or complex profile and later add stress fixtures if needed.

3. Tooling friction
   - Risk: screenshot or export tooling is not available in all environments.
   - Mitigation: keep the first normalized bundle minimal and document dependencies clearly.

4. Review-output sprawl
   - Risk: fixture review results become mixed with the broader application review corpus.
   - Mitigation: maintain separate fixture-review files and naming conventions.

## Open Questions

The implementation plan is now fully directionally specified. Any remaining questions are implementation details discovered during execution rather than planning blockers.