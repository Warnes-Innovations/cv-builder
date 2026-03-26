<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

**Last Updated:** 2026-03-24 21:55 EDT

**Executive Summary:** This task list converts the approved issue #59 implementation plan into an execution-ready sequence of work items. It is optimized for a manual-first first release, using the complex example profile, a repository-owned engineering job fixture, persona-specific fixture-review outputs, and one timestamped rollup per review run.

## Contents
- [Scope](#scope)
- [Execution Order](#execution-order)
- [Phase 1 Tasks](#phase-1-tasks)
- [Phase 2 Tasks](#phase-2-tasks)
- [Phase 3 Tasks](#phase-3-tasks)
- [Phase 4 Tasks](#phase-4-tasks)
- [Review Gates](#review-gates)

## Scope

This document covers implementation work for issue #59 only.

In scope:

1. Fixture-backed artifact generation for review.
2. Canonical engineering-role review input under `tests/fixtures/`.
3. Normalized review bundle outputs for appearance, layout, and structure review.
4. Persona-specific fixture-review files plus a timestamped rollup.
5. Manual-first developer workflow with room for later CI adoption.

Out of scope:

1. Runtime product features for in-app persona review.
2. Content-quality critique or semantic CV feedback.
3. Master CV write-back behavior.

## Execution Order

The recommended execution order is:

1. Establish deterministic fixture inputs.
2. Build the generation helper and artifact manifest.
3. Add normalized review-bundle exports.
4. Define review constraints and output formats.
5. Run the first manual review cycle.
6. Evaluate whether automation is justified.

## Phase 1 Tasks

### T1. Add canonical engineering-role fixture

- [ ] Create `tests/fixtures/fixture_job_engineering.json`.
- [ ] Populate it with one stable engineering-role job-analysis input suitable for deterministic review runs.
- [ ] Keep its schema aligned with the fields currently consumed by CV generation.

Dependencies:

- None.

Success criteria:

- The fixture is repository-owned and does not depend on user-local files.
- It is descriptive enough to drive a representative engineering CV generation pass.

### T2. Define fixture-generation manifest contract

- [ ] Define the output manifest shape for a review run.
- [ ] Include profile tier, job fixture path, generated artifact paths, and summary metadata.
- [ ] Decide where the manifest should be written inside the output bundle.

Dependencies:

- T1.

Success criteria:

- A developer can inspect one manifest file and know exactly what was generated and reviewed.

### T3. Implement reusable fixture-generation helper

- [ ] Reuse `tests/helpers/example_profiles.py` to materialize the `complex` profile into a temporary or supplied output root.
- [ ] Reuse existing `CVOrchestrator` generation paths to produce the raw artifact set.
- [ ] Wire the helper to use `tests/fixtures/fixture_job_engineering.json` as the canonical first-pass job input.
- [ ] Emit the agreed manifest file.

Dependencies:

- T1
- T2

Success criteria:

- A developer can run the helper repeatedly and get a deterministic artifact bundle from repository-owned inputs.

### T4. Add regression coverage for fixture generation

- [ ] Add a focused automated validation path for the helper.
- [ ] Verify generation succeeds from repository-owned inputs only.
- [ ] Validate the manifest content at a basic contract level.

Dependencies:

- T3

Success criteria:

- Regressions in fixture-backed generation are caught before review workflow work depends on them.

## Phase 2 Tasks

### T5. Define the minimum normalized review bundle

- [ ] Confirm the exact normalized outputs for version one.
- [ ] Include raw artifacts plus the minimum screenshot/structural/text exports needed for layout review.
- [ ] Keep the version-one bundle small enough for manual-first usage.

Dependencies:

- T3

Success criteria:

- Reviewers have a consistent and sufficient surface for appearance/layout/structure review.

### T6. Implement normalized export helpers

- [ ] Add the export logic that creates the agreed normalized outputs.
- [ ] Ensure the normalized bundle is linked back to the manifest.
- [ ] Preserve deterministic naming inside the output bundle.

Dependencies:

- T5

Success criteria:

- The review bundle can be handed to personas without requiring ad hoc local inspection steps.

### T7. Validate reproducibility of the review bundle

- [ ] Confirm the manual-first workflow runs cleanly in the worktree and from repository-owned inputs.
- [ ] Confirm the normalized exports do not rely on hidden user-local state.
- [ ] Document any environment dependencies required for the bundle.

Dependencies:

- T6

Success criteria:

- Another developer can reproduce the same workflow with the documented setup.

## Phase 3 Tasks

### T8. Write layout-review constraints document

- [ ] Create a constraints doc that explicitly limits persona review to appearance, layout, and structure.
- [ ] Explicitly exclude content-quality critique.
- [ ] Define what findings should be rejected as out of scope.

Dependencies:

- T6

Success criteria:

- The review boundary is enforceable and documented.

### T9. Create persona-specific fixture-review templates

- [ ] Create or define the format for persona-specific fixture-review outputs.
- [ ] Target the approved pilot set:
  - applicant
  - hiring-manager
  - HR/ATS
  - graphical-designer
  - UX
- [ ] Keep these files distinct from the broader application-review files.

Dependencies:

- T8

Success criteria:

- Each pilot persona has a predictable place and structure for its fixture-review findings.

### T10. Create timestamped rollup convention

- [ ] Implement the rollup path convention under `tasks/fixture-layout-review-rollups/`.
- [ ] Keep filenames timestamp-only.
- [ ] Ensure each rollup summarizes one review run, with tier information stored inside the document rather than the filename.

Dependencies:

- T9

Success criteria:

- Review runs preserve history without growing one cumulative file.

### T11. Run the first manual review cycle

- [ ] Generate the first full review bundle using the `complex` profile and engineering job fixture.
- [ ] Produce persona-specific outputs for the pilot set.
- [ ] Produce one timestamped shared rollup for the run.

Dependencies:

- T10

Success criteria:

- The full manual-first workflow completes end to end.
- The resulting artifacts are reviewable, traceable, and scoped correctly.

## Phase 4 Tasks

### T12. Evaluate automation readiness

- [ ] Review whether the manual-first workflow is stable enough for a task or CI entry point.
- [ ] Identify the smallest automation surface that would not distort the design.
- [ ] Record the future expansion path from one `complex`-tier run to all three tiers.

Dependencies:

- T11

Success criteria:

- There is a clear go/no-go decision for post-pilot automation.

## Review Gates

### Gate A: After Phase 1

- [ ] Confirm deterministic generation works from repository-owned inputs.
- [ ] Confirm the manifest is sufficient to describe one review run.

### Gate B: After Phase 2

- [ ] Confirm the normalized review bundle is actually usable for layout review.
- [ ] Confirm environment/tooling requirements are documented and acceptable.

### Gate C: After Phase 3

- [ ] Confirm persona outputs stayed within the approved review scope.
- [ ] Confirm the timestamped rollup is useful and not redundant.
- [ ] Confirm the pilot persona set gives enough signal for the workflow.

### Gate D: Post-pilot decision

- [ ] Decide whether to keep the workflow manual-only for now.
- [ ] Decide whether to add a task or CI entry point next.