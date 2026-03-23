<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Review Status Index

**Last Updated:** 2026-03-22 23:05 EDT

**Executive Summary:** This directory holds the source-verified persona review snapshots used by the `cvUiReview` workflow. Each persona writes to its own file so parallel subagents can refresh review state without mutating the story specifications.

## Contents

- [Purpose](#purpose)
- [Persona Files](#persona-files)
- [Update Rules](#update-rules)

## Purpose

The files in this directory are the working review-status outputs for the persona-based UI review workflow. The corresponding files under `tasks/user-story-*.md` remain the stable requirement specifications and should not receive appended status blocks.

## Persona Files

- [applicant.md](./applicant.md): Applicant persona review snapshot
- [resume-expert.md](./resume-expert.md): Resume expert review snapshot
- [ux-expert.md](./ux-expert.md): UX expert review snapshot
- [hiring-manager.md](./hiring-manager.md): Hiring manager review snapshot
- [persuasion-expert.md](./persuasion-expert.md): Persuasion expert review snapshot
- [hr-ats.md](./hr-ats.md): HR and ATS review snapshot
- [accessibility-specialist.md](./accessibility-specialist.md): Accessibility specialist review snapshot
- [first-time-user.md](./first-time-user.md): First-time user review snapshot
- [returning-user.md](./returning-user.md): Returning user review snapshot
- [power-user.md](./power-user.md): Power user review snapshot
- [recruiter-ops.md](./recruiter-ops.md): Recruiter / application-operations review snapshot
- [master-cv-curator.md](./master-cv-curator.md): Master CV curator review snapshot
- [trust-compliance.md](./trust-compliance.md): Trust and compliance review snapshot
- [graphical-designer.md](./graphical-designer.md): Graphical designer review snapshot

## Update Rules

- Refresh the persona-specific file instead of editing the matching story file.
- Preserve the story specifications in `tasks/user-story-*.md` as the source of truth for requirements.
- Keep review evidence and summary content scoped to the relevant persona file so parallel subagents do not collide.
- For expert personas, organize findings into `Application Evaluation` and `Generated Materials Evaluation`, and add `Additional Story Gaps / Proposed Story Items` when needed.
- Include evidence sufficient to verify each conclusion, citing repository-relative source paths with line numbers, the relevant story criteria, and any other repository references needed to support the finding.
