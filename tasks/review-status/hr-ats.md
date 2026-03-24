<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# HR ATS Review Status

**Last Updated:** 2026-03-23 01:35 EDT

**Executive Summary:** This file captures the source-verified HR/ATS review snapshot separately from the story specification so persona review subagents can work in parallel safely.

## Application Evaluation

**Reviewed against:** web/app.js, scripts/web_app.py, scripts/utils/cv_orchestrator.py:780-930, scripts/utils/cv_orchestrator.py:2081-2235, scripts/utils/cv_orchestrator.py:2890-3185

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | --------- | ----------- | -------- | ------------ | ------- |
| US-H* | 0 | 6 | 2 | 0 | 0 |

- US-H1: ⚠️ Partial. The ATS DOCX is paragraph-based and deliberately ATS-oriented, which is a meaningful implementation step beyond the older legacy snapshot, but the story’s stricter document contract is still not fully enforced. Evidence: scripts/utils/cv_orchestrator.py:2081-2235, scripts/utils/cv_orchestrator.py:2890-3185.
- US-H2: ⚠️ Partial. Standardized headings and validation checks exist, but the exact heading-level and label semantics required by the ATS story are still not consistently guaranteed. Evidence: scripts/utils/cv_orchestrator.py:2081-2235, scripts/utils/cv_orchestrator.py:2890-3185.
- US-H3: ⚠️ Partial. Contact information is included in ATS-friendly output, yet stronger normalization of field formatting and stricter placement assumptions remain incomplete. Evidence: scripts/utils/cv_orchestrator.py:2081-2235.
- US-H4: ⚠️ Partial. JSON-LD generation and ATS keyword-presence validation are both real, but the user still does not get the richer keyword-match visibility and section-level reasoning the story expects. Evidence: scripts/utils/cv_orchestrator.py:780-930, scripts/utils/cv_orchestrator.py:2890-3185.
- US-H5: ⚠️ Partial. Employment data is rendered in a structured ATS DOCX shape, but stronger overlap validation and tighter employment-header formatting rules were not verified. Evidence: scripts/utils/cv_orchestrator.py:2081-2235.
- US-H6: ⚠️ Partial. ATS validation exists and checks a substantial range of generated-file semantics, but it still behaves more like a downstream report than an automatic generation-stage contract. Evidence: scripts/utils/cv_orchestrator.py:2890-3185, scripts/web_app.py.
- US-H7: ❌ Fail. A candidate-facing ATS match score with live visibility and persisted explanation was not verified in the reviewed implementation. Evidence: web/app.js, scripts/web_app.py.
- US-H8: ❌ Fail. Hard-vs-soft skill classification and corresponding JSON-LD or ATS DOCX semantics were not verified in the reviewed code. Evidence: scripts/utils/cv_orchestrator.py:780-930, scripts/utils/cv_orchestrator.py:2081-2235.

## Generated Materials Evaluation

⚠️ Partial. ATS output is no longer hypothetical: paragraph-based DOCX generation, JSON-LD emission, and post-generation validation are all real. The remaining gap is that the stricter ATS-story semantics, scoring visibility, and skill-type modeling are still incomplete. Evidence: scripts/utils/cv_orchestrator.py:780-930, scripts/utils/cv_orchestrator.py:2081-2235, scripts/utils/cv_orchestrator.py:2890-3185.

## Additional Story Gaps / Proposed Story Items

- Add a visible ATS score and per-keyword reasoning model that users can inspect before finalising.
- Normalize ATS heading/contact/date rules into one explicit contract used by generation and validation.
- Add hard-vs-soft skill typing to the data and output pipeline rather than treating ATS skills as one flat list.
