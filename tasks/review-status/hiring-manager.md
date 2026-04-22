<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# Hiring Manager Review Status

**Last Updated:** 2026-04-20 17:30 ET
**Reviewer persona:** Technical hiring manager / department head — evaluates both the application workflow that prepares candidate materials and the human-readable outputs produced for review.
**Executive Summary:** The workflow consistently guides users through relevance-ordered customisation and surfaces persuasion warnings for weak bullets. Key gaps are in the generated outputs: the publications heading silently degrades to "Publications" when all entries are selected, venue-less entries render without warning, cover letter quality checks are not role-type-differentiated, and no automated warning fires when page count falls outside the expected 2–3 page range for a senior candidate.

---

## Application Evaluation

Covers the application workflow that prepares candidate materials (the 8-step customisation pipeline).

### US-M1: First Impression — Page 1 Layout

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Page 1 contains name, contact, summary, achievements, and education — all visible without scrolling | ⚠️ Partial | Template two-column layout (left-col: contact, education, skills, awards; right-col: summary, achievements, experience) is structurally correct per `templates/cv-template.html:88-100`. However, no automated check verifies that actual content volume fits within page 1; the layout-review stage handles this manually with visual inspection. |
| Summary is role-specific: job title or near-equivalent, years of experience, one differentiator | ⚠️ Partial | AI-generated summary workflow exists (`summary-review.js:buildSummaryFocusSection`); the model receives job analysis and master CV context. No post-generation validation confirms the job title or a differentiator is present in the accepted text. |
| No overflow on page 1 | ⚠️ Partial | Font-size and page-margin are configurable (`cv-template.html:35-37, cv_orchestrator.py:render_html_preview`), and the layout-review loop (`layout-instruction.js`) lets users iteratively fix overflow. No automated overflow detection fires during generation. |
| No visibly unbalanced whitespace on page 1 | ⚠️ Partial | Visual QC is the responsibility of the layout-review stage. No automated column-balance measurement is implemented. |

### US-M2: Work Experience — Credibility and Relevance

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Every bullet starts with a strong action verb (past tense for past roles, present for current) | ✅ Pass | `cv_orchestrator.py:check_persuasion()` (line 3197) classifies first words against `_STRONG_VERBS` and `_WEAK_VERBS`; findings are passed to the rewrite stage as `persuasion_warnings`, surfaced to the user in `rewrite-review.js:renderRewritePanel()`. |
| Each job entry has at least 2 bullets | 🔲 Not implemented | No minimum bullet count validation exists in `cv_orchestrator.py`, `web_app.py`, or any frontend module. A role with a single bullet passes without warning. |
| Bullets ≤ 2 lines each | 🔲 Not implemented | No line-length or word-count cap is enforced on individual bullets at generation or review time. |
| Job entries not split across pages | ✅ Pass | `templates/cv-template.html:279` — `.job-entry { page-break-inside: avoid; }` and `break-inside: avoid`. |
| Relevance-ordered bullets within each entry (most relevant first) | ✅ Pass | `cv_orchestrator.py:_select_content_hybrid()` sorts bullets by `_ach_relevance` (keyword-overlap score) when no user override is stored. User can further reorder via `achievement_orders` customisation key. |
| System warns if a bullet lacks an action verb | ✅ Pass | `cv_orchestrator.py:check_persuasion()` (line 3197) — `no_strong_verb` (info) and `weak_verb` (warning) findings surface in the rewrite-review persuasion panel. |

### US-M3: Skills Section Readability

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Skills grouped into named categories on human-readable PDF | ✅ Pass | `cv_orchestrator.py:_organize_skills_by_category()` organises skills into category dicts. Template renders `skills_by_category` with category headings in the sidebar. |
| Categories ordered by relevance to the target role | ⚠️ Partial | Default category priority is `['Core Expertise', 'Programming', 'Technical', 'Tools', 'General']` — not derived from job analysis. User can reorder manually via `saveSkillCategoryOrder()` in `skills-review.js`. No auto-relevance ranking of categories against job keywords. |
| No duplicate skills (exact match or obvious aliases) | ✅ Pass | `cv_orchestrator.py:_organize_skills_by_category()` deduplicates by canonical synonym key (`canonical_seen`); aliases are merged into the primary entry. |
| Skills section occupies no more than 1.5 sidebar columns total | 🔲 Not implemented | `max_skills` configuration limits count (default 20) but this is not a visual-size limit. No check warns when the skills section overflows the sidebar. |

### US-M4: Multi-Page Flow and Readability

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `page-break-inside: avoid` applied to every job entry | ✅ Pass | `templates/cv-template.html:279` — `.job-entry { page-break-inside: avoid; }`. Also `.skill-group` (line 178) and `.pub-item` (line 459). |
| Sidebar content balanced across pages | ⚠️ Partial | Print CSS uses `float: left` on `.left-col` with `box-decoration-break: clone` (`cv-template.html:415-425`) to repeat sidebar background across pages. No content-balancing mechanism automatically distributes sidebar items across pages. |
| Total page count 2–3 for senior candidate; system warns if output is 1 or >3 | ⚠️ Partial | Page count is tracked: `ats-refinement.js:_getPageLengthLabel()` reports estimate/exact count in the ATS badge. No toast, banner, or validation error fires when page count is outside the 2–3 range. |
| Publications included only when flagged as relevant for the role type | ⚠️ Partial | `cv_orchestrator.py:_select_publications()` scores publications by recency, type, and keyword overlap but has no "role type" gate. Publications are always eligible if present; no flag for role types that don't warrant them (e.g., pure industry IC roles). |
| Section heading reflects curation state ("Selected Publications" for subset, "Publications" for full list) | ✅ Pass | Fixed 2026-04-21. Template now renders "Selected Publications" when `total_publications_count > publications|length`, "Publications" otherwise. Count suffix removed entirely per updated US-M7 AC. |

### US-M5: Visual Identity and Professionalism

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All fonts embedded in the PDF | ⚠️ Partial | WeasyPrint (invoked as a subprocess) embeds fonts by default. Chrome headless `--headless=new` does not bundle webfonts from CDN links; the rendered PDF appearance depends on fonts cached in the Chrome user-data directory. Template loads Inter and Merriweather from Google Fonts CDN (`cv-template.html:23-24`). |
| Sidebar background colour present on every page | ✅ Pass | Print CSS: `#cv-body .left-col { background-color: var(--sidebar-bg) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; box-decoration-break: clone; }` (`cv-template.html:408-425`). |
| No content clipped at page margins | ✅ Pass | `@page { margin: var(--page-margin); }` with default `0.5in`; user-configurable per session via `page_margin` customisation key. |
| Font Awesome icons rendered correctly | ⚠️ Partial | Template loads Font Awesome 6 from a Cloudflare CDN link (`cv-template.html:22`). PDF generation running offline (no network) or in a sandboxed environment will not load the font; icons render as empty squares. |
| PDF passes visual QC: compare rendered page images against reference | ⚠️ Partial | The layout-review stage generates Chrome and WeasyPrint PDF variants side-by-side (`layout-instruction.js:renderPreviewOutputStatus`), enabling visual comparison. No automated diff against a saved reference image exists. |

---

## Generated Materials Evaluation

Covers the quality and calibration of output files delivered to the hiring manager.

### US-M6: Cover Letter Tone and Relevance

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Company name and role title appear in paragraph 1 | ⚠️ Partial | `cover-letter.js:_validateCoverLetter()` checks total mentions of company name across the full document (`companyCheck`) but does not verify that the mention is in paragraph 1. No role-title-in-P1 check exists. |
| At least one company-specific reference (recent initiative, product, or value) | 🔲 Not implemented | Neither `_validateCoverLetter()` nor the backend generation prompt includes a check or validation rule for company-specific references (products, recent news, values). |
| Body paragraphs cite specific, named achievements | 🔲 Not implemented | No validation rule checks that the generated body paragraphs contain named, specific achievements rather than generic claims. |
| Closing paragraph ends with a direct interview request | ✅ Pass | `cover-letter.js:_validateCoverLetter()` line 447 — `ctaCheck` pattern-matches the last paragraph against `/interview/i`, `/discuss/i`, `/look forward to/i`, and other direct request phrases. |
| Length within role-appropriate range | ⚠️ Partial | Validation uses a fixed 250–400 word target (`cover-letter.js:492-499`). The story requires role-differentiated targets: 300–400 standard, 400–500 executive, 500–600 research/academic. No role-type differentiation is implemented. |
| Tone setting applied based on inferred employer type | ⚠️ Partial | `cover-letter.js:COVER_LETTER_TONES` provides five choices (startup/tech, pharma/biotech, academia, financial, leadership). Tone is selected manually by the user from a dropdown; there is no auto-inference from job description text or job analysis fields. |

### US-M7: Selected Publications — Credibility and Relevance Signalling

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Section heading reflects curation state | ✅ Pass | Fixed 2026-04-21. Heading is "Selected Publications" when a subset is shown, "Publications" when the full accepted list is shown. Count suffix never rendered in generated documents. |
| Each entry: authors (first-author identifiable), title, venue, year — in scan priority order | ⚠️ Partial | `cv_orchestrator.py:_format_publications()` builds `formatted_citation` from BibTeX fields (authors, title, journal, year). `is_first_author` is detected and shown as ★ (`cv-template.html:648`). Entries missing both `journal` and `booktitle` now set `venue_warning` (fixed GAP-29, commit ad9edf0), triggering the `.pub-venue-warn` icon in the template. Scan priority order (authors → title → venue → year) is implicit in the citation format string and is not configurable. |
| Total entry count matches what applicant confirmed in Customisation step | ✅ Pass | `cv_orchestrator.py:_select_content_hybrid()` honours `customizations['accepted_publications']` list in display order when present. |
| Count indicator not shown in generated documents | ✅ Pass | Count suffix intentionally removed per updated US-M7 AC (2026-04-21). The count is not rendered in either the human PDF or ATS document. |
| Selected Publications is always the final section of the CV | ✅ Pass | `templates/cv-template.html:635-658` — publications section rendered last in the main column (`{% if publications %}` block appears after experiences). |
| No entry appears without a venue — entries missing journal/booktitle flagged during Customisation | ⚠️ Partial | Fixed 2026-04-21 (GAP-29, commit ad9edf0): `_format_publications()` now sets `venue_warning` for entries missing both `journal` and `booktitle`; the template renders a ⚠ icon. However the warning appears at generation time in the CV output, not proactively during the Customisation step. The story AC requires the user to be flagged before generation. |

---

## Additional Story Gaps / Proposed Story Items

The following issues are not covered by any current US-M* criterion but are source-verified and affect the hiring manager's experience of the output materials.

| ID | Proposed Story Item | Severity | Evidence |
|----|---------------------|----------|----------|
| GAP-HM-01 | **Minimum bullet count enforcement** — generation should warn when any included experience entry has fewer than 2 bullets. Thin entries look incomplete to a hiring manager. | High | No check in `cv_orchestrator.py` or frontend. |
| GAP-HM-02 | **Page count warning** — a toast or banner should fire when the estimated page count is 1 or >3 pages for a senior candidate. The page count is already tracked (`ats-refinement.js:_getPageLengthLabel`); the warning is simply not connected. | High | `ats-refinement.js:_getPageLengthLabel()` reads `generationState.pageCountExact/pageCountEstimate` but emits no warning. |
| GAP-HM-03 | **Auto-infer tone from job description** — cover letter tone should default to a suggested value derived from job analysis `employer_type` or `domain` fields rather than always defaulting to the first dropdown option. | Medium | `cover-letter.js:COVER_LETTER_TONES` — five tones defined, no inference logic. |
| GAP-HM-04 | **Role-differentiated cover letter word count** — validation target should be 300–400 for standard, 400–500 for executive, 500–600 for research/academic, not a universal 250–400. | Medium | `cover-letter.js:492` — hard-coded 250–400 range. |
| GAP-HM-05 | **Venue-missing publication warning** — entries whose BibTeX source has no `journal` or `booktitle` should be flagged during the Publications Customisation step. The infrastructure exists in the template (`.pub-venue-warn`) but `_format_publications()` never sets `venue_warning`. | High | `cv_orchestrator.py:_format_publications()` — no `venue_warning` key set; `cv-template.html:651` — template renders `{% if pub.venue_warning %}` that is never triggered. |

---

## Story Tally

**Reviewed against:** `tasks/user-story-hiring-manager.md`, `templates/cv-template.html`, `web/cover-letter.js`, `web/summary-review.js`, `web/skills-review.js`, `web/achievements-review.js`, `web/experience-review.js`, `web/rewrite-review.js`, `web/ats-refinement.js`, `web/layout-instruction.js`, `web/finalise.js`, `web/job-analysis.js`, `web/ats-modals.js`, `scripts/utils/cv_orchestrator.py`, `tasks/current-implemented-workflow.md`

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-M1 | 0 | 4 | 0 | 0 | 0 |
| US-M2 | 4 | 0 | 0 | 2 | 0 |
| US-M3 | 2 | 1 | 0 | 1 | 0 |
| US-M4 | 1 | 4 | 0 | 0 | 0 |
| US-M5 | 2 | 3 | 0 | 0 | 0 |
| US-M6 | 1 | 3 | 0 | 2 | 0 |
| US-M7 | 2 | 2 | 2 | 0 | 0 |
| **Total** | **12** | **17** | **2** | **5** | **0** |

**Top 5 gaps by severity:**

1. **[❌ HIGH] US-M7-AC1 — Publications heading degrades to "Publications"** when all bib entries are selected. `cv-template.html:636-643`. Story requires ALWAYS "Selected Publications". Fix: remove the conditional; always use "Selected Publications" when the section is present.

2. **[❌ HIGH] US-M7-AC6 — Venue-less publications silently rendered**. `cv_orchestrator.py:_format_publications()` never sets `venue_warning`; CSS infrastructure exists but is dead. Entries without a journal/booktitle field render without indication. Fix: set `venue_warning` when neither field is present.

3. **[🔲 HIGH] US-M2-AC2 — No minimum-bullet-count warning**. A role with a single bullet passes generation without any notice. Fix: add a validation step in `check_persuasion()` or as a pre-generation gate.

4. **[⚠️ HIGH] US-M4-AC3 — No page-count out-of-range warning**. Page count is tracked but no warning fires when count is outside 2–3. Fix: fire a toast/banner when `pageCountExact` or `pageCountEstimate` is 1 or >3.

5. **[🔲 MEDIUM] US-M6-AC2+AC3 — No company-specific reference or named-achievement validation in cover letter**. Validation checks company-name mentions and word count but nothing verifies that the letter contains company-specific content or named achievements.

**Key evidence references:**
- `templates/cv-template.html:636-643` — publications heading conditional (US-M7-AC1, AC4)
- `cv_orchestrator.py:_format_publications()` — missing `venue_warning` setter (US-M7-AC6)
- `cv_orchestrator.py:check_persuasion()` line 3197 — action-verb check (US-M2-AC1, AC6)
- `cv_orchestrator.py:_select_content_hybrid()` — keyword-ordered bullets (US-M2-AC5)
- `cv-template.html:279` — `.job-entry { page-break-inside: avoid; }` (US-M2-AC4, US-M4-AC1)
- `ats-refinement.js:_getPageLengthLabel()` — page count tracked but no warning (US-M4-AC3)
- `cover-letter.js:492` — fixed 250-400 word count (US-M6-AC5)
- `cover-letter.js:COVER_LETTER_TONES` — manual tone selection, no inference (US-M6-AC6)
- `cv-template.html:408-425` — sidebar bg print CSS (US-M5-AC2)

**Evidence standard:** Every conclusion above is supported by source file + line references. No reliance on prior review documents or inference from UI screenshots.
