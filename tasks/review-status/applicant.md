<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 -->

# Applicant Review Status

**Last Updated:** 2026-03-23 01:35 EDT

**Executive Summary:** This file captures the source-verified applicant review snapshot separately from the story specification so persona review subagents can work in parallel safely.

## Application Evaluation

**Reviewed against:** web/app.js, web/publications-review.js:1-169, web/cover-letter.js:219-460, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py:2081-2235, scripts/utils/cv_orchestrator.py:2890-3185

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | --------- | ----------- | -------- | ------------ | ------- |
| US-A* | 2 | 10 | 3 | 0 | 0 |

- US-A1: ⚠️ Partial. Job intake supports pasted descriptions, URL ingestion, and protected-site fallback guidance, but the reviewed flow still lacks a dedicated editable confirmation checkpoint for extracted company, role, and date fields before analysis proceeds. Evidence: web/app.js, scripts/web_app.py.
- US-A2: ⚠️ Partial. Analysis and clarification prompts are present, but clarifications still render as a dense batch and prior-session defaults keyed to similar roles were not verified in the reviewed code. Evidence: web/app.js, scripts/web_app.py.
- US-A3: ⚠️ Partial. The customization stage has real review tables, publication ranking, and bullet-level reordering within experience entries, but broader row-level ordering and stronger inline rationale for all content classes remain incomplete. Evidence: web/publications-review.js:1-169, scripts/utils/cv_orchestrator.py:2081-2235.
- US-A4: ✅ Pass. Rewrite review is one of the strongest applicant-facing flows: inline diff, accept/edit/reject handling, and audit capture are all source-verified. Evidence: web/app.js, scripts/utils/conversation_manager.py.
- US-A4b: ⚠️ Partial. Spell-check endpoints, review surfaces, and audit persistence exist, but accepted corrections were not source-verified as writing back into the generated CV text itself. Evidence: web/app.js, scripts/web_app.py, scripts/utils/conversation_manager.py.
- US-A5a: ❌ Fail. A story-complete HTML preview stage was not verified in the current frontend; the staged preview promised by the applicant stories is still not implemented as its own dependable review checkpoint. Evidence: web/app.js, scripts/web_app.py.
- US-A5b: ❌ Fail. Layout refinement is only partially surfaced; backend and preview scaffolding exist, but the full applicant-facing layout-instruction loop with refreshed preview and explicit confirmation is still incomplete. Evidence: web/app.js, scripts/web_app.py.
- US-A5c: ⚠️ Partial. Final document validation exists, including ATS-oriented checks and PDF/HTML inspection, but it is still more of a downstream report than a generation-stage quality gate. Evidence: scripts/utils/cv_orchestrator.py:2890-3185.
- US-A6: ⚠️ Partial. Earlier-stage re-entry and rerun mechanisms exist, but changed-item highlighting and layout-only refinement remain incomplete. Evidence: web/app.js, scripts/web_app.py, scripts/utils/conversation_manager.py.
- US-A7: ✅ Pass. Cover-letter generation and client-side validation are both implemented, including opening, company-reference, word-count, and call-to-action checks. Evidence: web/cover-letter.js:219-460, scripts/web_app.py.
- US-A8: ⚠️ Partial. The app supports downstream screening-question generation and role-tailored prompts, but the overall applicant narrative across CV, cover letter, and screening materials is not yet strongly harmonized. Evidence: web/cover-letter.js:219-460, scripts/web_app.py.
- US-A9: ⚠️ Partial. Finalise/archive behavior is real, but the reviewed flow still lacks the stronger match-summary and packaging clarity the applicant story expects. Evidence: scripts/web_app.py, scripts/utils/cv_orchestrator.py:2890-3185.
- US-A10: ❌ Fail. The natural-language master-data update and structured ingestion workflow were not found in the reviewed code. Evidence: web/app.js, web/master-cv.js, scripts/web_app.py.
- US-A11: ⚠️ Partial. Explicit write-back exists through harvest/apply and the Master CV surface, but the broader structured maintenance/editor experience is still incomplete. Evidence: web/finalise.js, web/master-cv.js, scripts/web_app.py.
- US-A12: ⚠️ Partial. The app supports some stage re-entry and rerun behavior, but not every completed stage exposes the same clarity, comparison, or recovery ergonomics. Evidence: web/app.js, scripts/web_app.py, scripts/utils/conversation_manager.py.

## Generated Materials Evaluation

⚠️ Partial. The generated-material story is strongest around rewrite review, publication recommendation, and cover-letter validation, but still weakest where the applicant workflow promised staged preview, richer artifact review, and stronger final package summarization. Evidence: web/publications-review.js:1-169, web/cover-letter.js:219-460, scripts/utils/cv_orchestrator.py:2890-3185.

## Additional Story Gaps / Proposed Story Items

- Add an explicit intake-confirmation substep before analysis so extracted employer, role, and timing metadata can be corrected in one place.
- Finish the promised staged `HTML preview -> layout review -> final generation` flow rather than treating generation as one bundled step.
- Add a clearer final applicant summary card that reports package readiness, match quality, and any unresolved quality warnings.
