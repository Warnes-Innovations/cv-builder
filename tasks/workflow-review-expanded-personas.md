<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

**Last Updated:** 2026-03-22 23:05 EDT

**Executive Summary:** This document defines the expanded persona set for workflow review and outlines how to run the review with parallel subagents and sequential OBO presentation. Expert personas now perform two distinct evaluations: the software application itself and the generated resume/application materials.

## Contents
- [Expanded Persona Set](#expanded-persona-set)
- [Story Files](#story-files)
- [Evaluation Model](#evaluation-model)
- [Story Coverage Rule](#story-coverage-rule)
- [Review Status Outputs](#review-status-outputs)
- [Subagent Plan](#subagent-plan)
- [OBO Plan](#obo-plan)

## Expanded Persona Set

The expanded workflow-review persona set is:

1. Applicant
2. UX expert
3. Resume expert
4. Hiring manager
5. Persuasion expert
6. HR / ATS reviewer
7. Accessibility specialist
8. First-time user
9. Returning user
10. Power user
11. Recruiter / application-operations reviewer
12. Master CV curator
13. Trust and compliance reviewer
14. Graphical designer

## Story Files

Existing story/spec files:

- `tasks/user-story-applicant.md`
- `tasks/user-story-ux-expert.md`
- `tasks/user-story-resume-expert.md`
- `tasks/user-story-hiring-manager.md`
- `tasks/user-story-persuasion-expert.md`
- `tasks/user-story-hr-ats.md`

New story/spec files:

- `tasks/user-story-accessibility-specialist.md`
- `tasks/user-story-first-time-user.md`
- `tasks/user-story-returning-user.md`
- `tasks/user-story-power-user.md`
- `tasks/user-story-recruiter-ops.md`
- `tasks/user-story-master-cv-curator.md`
- `tasks/user-story-trust-compliance.md`
- `tasks/user-story-graphical-designer.md`

## Evaluation Model

Expert personas should produce two separate evaluations:

1. **Application evaluation**
   - Evaluate the software application itself.
   - Focus on workflow quality, decision support, review surfaces, interaction design, safety, and whether the UI guides the user toward good outcomes.

2. **Generated materials evaluation**
   - Evaluate the generated resume, cover letter, and other application artifacts.
   - Focus on quality of the outputs themselves: readability, credibility, persuasiveness, ATS safety, presentation quality, and submission readiness.

These two evaluations should be reported separately even when the same persona performs both.

## Story Coverage Rule

The current story files are the starting framework for each persona review, not the outer limit of what the persona may evaluate.

Each persona agent should:

1. Evaluate the implemented workflow and generated materials against the assigned story/spec file.
2. Identify additional issues that are relevant to that persona even if they are not explicitly captured in the current story list.
3. Call out omissions, contradictions, or weak spots in the existing stories themselves when those gaps affect the quality of the review.
4. Propose additional story items when the persona exposes recurring needs, missing acceptance criteria, or missing review dimensions.

This prevents the review from becoming a checklist-only exercise and keeps the persona agents free to surface source-backed findings beyond the currently documented stories.

## Review Status Outputs

Recommended persona-specific review-status files for the expanded set:

- `tasks/review-status/applicant.md`
- `tasks/review-status/ux-expert.md`
- `tasks/review-status/resume-expert.md`
- `tasks/review-status/hiring-manager.md`
- `tasks/review-status/persuasion-expert.md`
- `tasks/review-status/hr-ats.md`
- `tasks/review-status/accessibility-specialist.md`
- `tasks/review-status/first-time-user.md`
- `tasks/review-status/returning-user.md`
- `tasks/review-status/power-user.md`
- `tasks/review-status/recruiter-ops.md`
- `tasks/review-status/master-cv-curator.md`
- `tasks/review-status/trust-compliance.md`
- `tasks/review-status/graphical-designer.md`

## Subagent Plan

Run the review in three parallel waves to keep prompts focused while still using parallelism effectively.

### Wave 1: Existing baseline personas

1. Applicant
2. UX expert
3. Resume expert
4. Hiring manager
5. Persuasion expert
6. HR / ATS reviewer

### Wave 2: Workflow and continuity personas

1. Accessibility specialist
2. First-time user
3. Returning user
4. Power user
5. Recruiter / application-operations reviewer

### Wave 3: Governance and look-and-feel personas

1. Master CV curator
2. Trust and compliance reviewer
3. Graphical designer

Each subagent should:

1. Read the implementation source first.
2. Read the currently implemented workflow description in `tasks/current-implemented-workflow.md` as the factual process baseline.
3. Read only its assigned persona story/spec file.
4. Produce two sections in its review: `Application Evaluation` and `Generated Materials Evaluation`.
5. Add a short `Additional Story Gaps / Proposed Story Items` section whenever the persona identifies important issues not covered well by the existing stories.
6. Support every conclusion with enough evidence for another reviewer to verify it independently, including repository-relative source paths with line numbers, story criteria, and other repository references when needed.
7. Write its results to a persona-specific file under `tasks/review-status/`.
8. Return a concise summary of findings with severity and evidence, grouped by those sections.

## OBO Plan

After all subagent reports are complete:

1. Collect the unique findings across all persona reviews.
2. Merge duplicates where different personas report the same underlying workflow issue.
3. Keep application findings and generated-material findings distinguishable during deduplication.
4. Prioritize findings using OBO scoring fields:
   - urgency
   - importance
   - effort
   - dependencies
5. Create or resume the OBO session in `.github/obo_sessions/`.
6. Present one finding at a time.

Recommended OBO grouping order:

1. Workflow-break or data-safety issues
2. Approval-integrity and trust issues
3. Accessibility blockers
4. Navigation/orientation issues
5. Efficiency and repeat-use issues
6. Visual-design and polish issues

This ordering keeps the first presented items focused on correctness, safety, and task completion before moving to usability and aesthetic concerns.