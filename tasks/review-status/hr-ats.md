<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# HR ATS Review Status

**Last Updated:** 2026-03-22 23:09 EDT

**Executive Summary:** This file captures the source-verified HR/ATS review snapshot separately from the story specification so sub-agents can work in parallel safely. This legacy snapshot has been normalized to the current section structure without re-running the HR/ATS review.

## Application Evaluation

The preserved HR/ATS findings below remain in their original aggregate form from the earlier source-first review.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-H* | 0 | 1 | 5 | 2 | 0 |

**Key evidence references:**
- US-H1: ATS DOCX is paragraph-based with body contact lines, but ATS font family/size constraints are not enforced and contact is not in the first paragraph → scripts/utils/cv_orchestrator.py:1424, scripts/utils/cv_orchestrator.py:1435, scripts/utils/cv_orchestrator.py:1559
- US-H2: ATS headings are written as `Heading 2` with labels like `PROFESSIONAL SUMMARY`, `CORE COMPETENCIES`, and `PROFESSIONAL EXPERIENCE`, not the accepted `Heading 1` labels in the story → scripts/utils/cv_orchestrator.py:1460, scripts/utils/cv_orchestrator.py:1471, scripts/utils/cv_orchestrator.py:1482
- US-H3: Contact data is emitted on the second body paragraph and phone/name formatting is passed through raw source values with no ATS normalization → scripts/utils/cv_orchestrator.py:1428, scripts/utils/cv_orchestrator.py:1435
- US-H4: A post-generation ATS keyword presence check exists, but it reports aggregate presence only; section-level reporting, exact/variant match typing, and verification that `knowsAbout` contains all approved rewrite skill names were not found in any reviewed source file → scripts/utils/cv_orchestrator.py:2338, scripts/utils/cv_orchestrator.py:2411
- US-H5: ATS job entries are split across title/company and date/location paragraphs, and overlap validation was not found in any reviewed source file → scripts/utils/cv_orchestrator.py:1486, scripts/utils/cv_orchestrator.py:1497
- US-H6: ATS validation runs from the download-tab flow and cached validation results are only written to `metadata.json` during finalise, not during generation → web/app.js:5475, scripts/web_app.py:3861, scripts/web_app.py:3973
- US-H7: HR-ATS match-score UI and generation-time metadata persistence were not found in reviewed source files; the only live `% match` badge is for screening-question experience matching, not ATS scoring → web/app.js:8687
- US-H8: Hard/soft skill classification, JSON-LD `additionalType`, and UI override propagation were not found in reviewed source files; ATS DOCX emits one `CORE COMPETENCIES` list rather than separate hard/soft sections → scripts/utils/cv_orchestrator.py:1471

## Generated Materials Evaluation

The legacy HR/ATS snapshot mixed output-quality findings into the preserved aggregate summary above rather than separating them into a distinct generated-materials section. A refreshed HR/ATS pass should split those findings explicitly.

## Additional Story Gaps / Proposed Story Items

None recorded yet.

**Evidence standard:**
- This file preserves a pre-existing legacy snapshot.
- Any refreshed findings should cite repository-relative source paths with line numbers and enough supporting evidence for independent verification.
