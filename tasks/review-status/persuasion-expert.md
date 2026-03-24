<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Persuasion Expert Review Status

**Last Updated:** 2026-03-23 01:35 EDT

**Executive Summary:** This file captures the source-verified persuasion expert review snapshot separately from the story specification so persona review subagents can work in parallel safely.

## Application Evaluation

**Reviewed against:** web/cover-letter.js:219-460, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/llm_client.py:520-700

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | --------- | ----------- | -------- | ------------ | ------- |
| US-P* | 1 | 5 | 0 | 0 | 0 |

- US-P1: ⚠️ Partial. Summary prompts push toward stronger positioning, but the reviewed code still does not enforce a narrative thread or identity coherence across the finished output. Evidence: scripts/utils/llm_client.py:520-660.
- US-P2: ⚠️ Partial. Rewrite constraints protect numbers, dates, and company names, which materially reduces factual persuasion regressions, but there is still limited enforcement against awkward keyword stuffing or omitted authority signals. Evidence: scripts/utils/llm_client.py:612-700.
- US-P3: ⚠️ Partial. CAR-style structure and related rhetoric checks exist, but they remain advisory rather than decisive gating on the final accepted rewrite set. Evidence: scripts/utils/conversation_manager.py.
- US-P4: ✅ Pass. Rewrite-review persuasion checks for strong verbs, passive voice, and weak bullet structure are source-verified and materially improve the quality of bullet review. Evidence: scripts/utils/conversation_manager.py.
- US-P5: ⚠️ Partial. Cover-letter prompting and client-side validation meaningfully improve openings, specificity, length, and closing CTA, but stronger organization-specific narrative and stricter opener rules are still missing. Evidence: web/cover-letter.js:219-460, scripts/web_app.py.
- US-P6: ⚠️ Partial. Cross-document consistency checks cover company, title, ATS keywords, and dates, but they do not yet enforce broader narrative or terminology harmony across CV, cover letter, and other outputs. Evidence: web/cover-letter.js:219-385, scripts/web_app.py.

## Generated Materials Evaluation

⚠️ Partial. The persuasion layer is no longer just prompt wishful thinking; it now has real rewrite and cover-letter safeguards. The main remaining gap is that those checks are incomplete and mostly advisory outside rewrite review. Evidence: web/cover-letter.js:219-460, scripts/utils/conversation_manager.py, scripts/utils/llm_client.py:520-700.

## Additional Story Gaps / Proposed Story Items

- Add a post-generation persuasion pass for summaries and cover letters, not just rewrite proposals.
- Enforce broader cross-document narrative consistency, not only company/title/keyword/date matching.
- Strengthen authority-signal and accomplishment-structure checks so persuasive quality is less dependent on prompt luck.
