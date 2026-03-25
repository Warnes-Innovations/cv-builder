# UI Input to Session and Artifact Audit

<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

**Last Updated:** 2026-03-25 18:05 EDT

**Executive Summary:** This document maps the main UI-entered data in the `cv-builder` workflow to the session file, downstream consumers, and generated artifacts. It is based on source inspection plus refreshed `duckflow` annotations, not on intended UX alone. Most reviewed inputs are preserved correctly in session state and either flow into preview/final generation or into archive-only artifacts such as `metadata.json`, cover-letter DOCX, and screening-response DOCX. The highest-signal gap is that achievement-editor bullet edits are saved in session state but do not pass through the shared preview/final generation path; they only influence ATS scoring through a fallback path.

## Scope

- Audited refreshed `duckflow` annotations in the main source tree and regenerated [`.github/duckflow/ui-session-artifact-flow.stitched.json`](/Users/warnes/src/cv-builder/.github/duckflow/ui-session-artifact-flow.stitched.json) plus [`.github/duckflow/ui-session-artifact-flow.mmd`](/Users/warnes/src/cv-builder/.github/duckflow/ui-session-artifact-flow.mmd).
- Traced UI input surfaces in `web/` to Flask routes in `scripts/routes/`, session keys in `ConversationManager.state`, and generation/materialization helpers in `scripts/utils/`.
- Focused on session-backed customization and generation flow. The master-data editor is out of scope here because its source of truth is the master CV files rather than session state.

## Assessment Key

- `Preserved`: input is written into canonical session state.
- `Consumed`: downstream logic reads or materializes the session value.
- `Artifact`: value reaches a generated CV/preview, archive metadata, or side artifact.
- `Caveat`: deliberate save boundary or implementation dependency.

## Matrix

| UI surface | UI inputs | Session storage | Downstream consumers | Generated artifacts | Assessment |
| --- | --- | --- | --- | --- | --- |
| Job input | Job description text | `job_description`, `position_name` | Job analysis, recommendations, generation context | Reflected indirectly through job analysis and output metadata context | Preserved and consumed |
| Post-analysis questions | Clarification answers | `post_analysis_questions`, `post_analysis_answers` | Recommendation generation, screening generation prompt context, harvest candidate compilation, finalise metadata | `metadata.json` via `clarification_answers`; indirect effect on later outputs | Preserved and consumed |
| Experience review | Include/exclude decisions | `experience_decisions` | `SessionDataView.materialize_generation_customizations()`, summary generation, layout estimate | Preview/final CV content | Preserved and artifacted |
| Skills review | Skill decisions, extra skills, extra skill matches | `skill_decisions`, `extra_skills`, `extra_skill_matches`, mirrored `customizations.extra_skills`, `customizations.extra_skill_matches` | `SessionDataView.materialize_generation_customizations()`, ATS scoring, layout estimate | Preview/final CV content | Preserved and artifacted |
| Achievements review | Achievement decisions, accepted AI-suggested achievements | `achievement_decisions`, `accepted_suggested_achievements` | `SessionDataView.materialize_generation_customizations()` | Preview/final CV content | Preserved and artifacted |
| Achievement editor | Per-experience edited bullets | `achievement_edits` | Exposed in `/api/status`; ATS route converts edits into temporary rewrite payload only when no approved rewrites exist | No shared preview/final CV path; no direct archive metadata write | Preserved, partially consumed, artifact gap |
| Summary review | Selected summary key and generated AI summary | `summary_focus_override`, `session_summaries.ai_generated` | `SessionDataView.materialize_generation_customizations()`, ATS scoring, status payload | Preview/final CV content | Preserved and artifacted |
| Publications review | Publication include/exclude decisions | `publication_decisions` | `SessionDataView.materialize_generation_customizations()`, rewrite generation | Preview/final CV content | Preserved and artifacted |
| Rewrite review | Rewrite outcomes and edited rewrite text | `approved_rewrites`, `rewrite_audit` | Spell-check input assembly, preview generation, harvest candidates, finalise summary count | Preview/final CV content; metadata via later workflow | Preserved and artifacted |
| Spell check | Reviewed spell audit | `spell_audit`, `phase` | Preview generation, spell-check sections rebuild, finalise metadata | Preview/final CV content and `metadata.json` | Preserved and artifacted |
| Layout review | Layout instructions and confirmation | `generation_state.preview_html`, `generation_state.layout_instructions`, `generation_state.layout_confirmed`, later `layout_instructions` after `/api/layout-complete` | Layout refine/final routes, layout history, finalise metadata after promotion | Preview HTML, final HTML/PDF, metadata layout history after promotion | Preserved with promotion caveat |
| Cover letter | Generation prompt fields and final edited letter text | `cover_letter_text`, `cover_letter_params`, `cover_letter_reused_from` | Screening generation prompt context, status/restore, archive save route | Cover-letter DOCX and `metadata.json` (`cover_letter_text`, `cover_letter_reused_from`) | Preserved and artifacted; params remain session-only |
| Screening questions | Generated and edited screening responses, topic tags, formats | `screening_responses` after explicit save | Response-library upsert, final archive, status/restore | Screening DOCX and `metadata.json` | Preserved and artifacted after save |
| Finalise | Application status and notes | `phase`; metadata written from current session state | Archive completion and optional git commit | `metadata.json`, response library updates, finalise summary response | Archive-only, not CV content |

## Findings

### 1. Achievement editor bullets are not on the shared preview/final generation path

**Severity:** High

The achievement editor persists per-experience bullet edits into `state['achievement_edits']`, but `generate-preview` builds customizations through `SessionDataView.materialize_generation_customizations()` and reads only `approved_rewrites` plus `spell_audit` for textual overlays. `achievement_edits` are only folded into temporary rewrite payloads inside `/api/cv/ats-score`, and only when `approved_rewrites` is empty. That means edited bullets can be preserved in the session file without appearing in the preview HTML, final HTML/PDF, or other downstream generation artifacts.

**Evidence:**

- `save_achievement_edits()` writes only `state['achievement_edits']`.
- `generate_cv_preview()` reads `customizations`, `approved_rewrites`, and `spell_audit`, not `achievement_edits`.
- `compute_cv_ats_score()` contains the only verified fallback that turns `achievement_edits` into temporary rewrite-like entries.

**Implication:** The session file can accurately preserve the user edit while the generated CV still reflects the pre-edit bullets.

### 2. Layout instruction history reaches archive metadata only after promotion out of `generation_state`

**Severity:** Medium

During layout review, instructions accumulate under `generation_state.layout_instructions`. The finalise route writes `metadata['layout_instructions']` from top-level `state['layout_instructions']`, not directly from `generation_state.layout_instructions`. The normal UI path calls `/api/layout-complete`, which promotes the history into top-level state, so the browser workflow is usually correct. However, the archive metadata write depends on that separate promotion step rather than on the authoritative staged-generation location.

**Evidence:**

- `/api/cv/layout-refine` appends to `generation_state.layout_instructions`.
- `/api/layout-complete` falls back to `generation_state.layout_instructions` and then calls `conversation.complete_layout_review(...)`, which writes top-level `state['layout_instructions']`.
- `/api/finalise` reads only top-level `state['layout_instructions']` for metadata.

**Implication:** The UI path is covered, but the archive contract is fragile if finalisation is triggered without the layout-complete promotion step.

## Coverage Notes

### Explicit-save boundaries

- Cover-letter edits become canonical only when the user invokes `POST /api/cover-letter/save`.
- Screening-response drafts become canonical only when the user invokes `POST /api/screening/save`.

This is not a bug by itself, but it means in-progress browser edits are not guaranteed to survive session restore until the explicit save action runs.

### Session-only provenance by design

- `cover_letter_params` are preserved in session state for workflow continuity but are not copied into archive metadata.
- `extra_skill_matches` are preserved for generation logic but are not expected to appear verbatim in generated artifacts.
- Finalise writes archive metadata derived from session state; it does not broaden what reaches the generated CV itself.

## Source Notes

Primary files verified for this audit:

- [web/job-input.js](/Users/warnes/src/cv-builder/web/job-input.js)
- [web/questions-panel.js](/Users/warnes/src/cv-builder/web/questions-panel.js)
- [web/experience-review.js](/Users/warnes/src/cv-builder/web/experience-review.js)
- [web/skills-review.js](/Users/warnes/src/cv-builder/web/skills-review.js)
- [web/achievements-review.js](/Users/warnes/src/cv-builder/web/achievements-review.js)
- [web/summary-review.js](/Users/warnes/src/cv-builder/web/summary-review.js)
- [web/publications-review.js](/Users/warnes/src/cv-builder/web/publications-review.js)
- [web/rewrite-review.js](/Users/warnes/src/cv-builder/web/rewrite-review.js)
- [web/spell-check.js](/Users/warnes/src/cv-builder/web/spell-check.js)
- [web/layout-instruction.js](/Users/warnes/src/cv-builder/web/layout-instruction.js)
- [web/cover-letter.js](/Users/warnes/src/cv-builder/web/cover-letter.js)
- [web/screening-questions.js](/Users/warnes/src/cv-builder/web/screening-questions.js)
- [web/finalise.js](/Users/warnes/src/cv-builder/web/finalise.js)
- [scripts/routes/status_routes.py](/Users/warnes/src/cv-builder/scripts/routes/status_routes.py)
- [scripts/routes/review_routes.py](/Users/warnes/src/cv-builder/scripts/routes/review_routes.py)
- [scripts/routes/generation_routes.py](/Users/warnes/src/cv-builder/scripts/routes/generation_routes.py)
- [scripts/routes/master_data_routes.py](/Users/warnes/src/cv-builder/scripts/routes/master_data_routes.py)
- [scripts/utils/session_data_view.py](/Users/warnes/src/cv-builder/scripts/utils/session_data_view.py)
- [scripts/utils/conversation_manager.py](/Users/warnes/src/cv-builder/scripts/utils/conversation_manager.py)

## Recommended Follow-up

1. Materialize `achievement_edits` through the same shared content path used by preview/final generation, not only through ATS fallback logic.
2. Make finalise metadata read layout instructions from the staged-generation source of truth or centralize the promotion logic so archive writes cannot miss the instruction history.
