<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Hiring Manager Review Status

**Last Updated:** 2026-07-06 16:20 ET

**Executive Summary:** Fresh source-first review against cycle-87 codebase. The application workflow is well-structured and most story criteria are implemented. Key changes since the prior cycle: GAP-NEW-HM-07 (para1 check) and GAP-NEW-HM-08 (venue-unavailable in DOCX) are both resolved; the 0-bullet job-entry advisory is confirmed implemented; and the US-M7 "publication count" ❌ Fail finding from the prior review was a misread — the story criterion covers only generated documents, not the authoring UI. Remaining open issues: auto-tone suggestion from job analysis, executive/academic word count ranges diverge from story spec, page-1 sparseness check not implemented, and summary does not validate role-title or years-of-experience phrasing.

---

## Application Evaluation

### US-M1: First Impression — Page 1 Layout

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Name prominent at top | ✅ Pass | `cv-template.html:212` — `.name { font-size: 2.2rem; font-weight: 700 }`; largest text element on page |
| Contact information in sidebar | ✅ Pass | `cv-template.html:527–564` — sidebar left column with Font Awesome icon-prefixed contact fields (email, phone, LinkedIn, website) |
| Professional summary on page 1 | ✅ Pass | `cv-template.html:648–653` — Summary section is first element in right column |
| Selected Achievements on page 1 | ✅ Pass | `cv-template.html:655–663` — "Selected Achievements" second in right column, immediately after Summary |
| Education in sidebar | ✅ Pass | `cv-template.html:566–575` — Education in sidebar with degree, institution, year |
| 2-column layout with sidebar differentiation | ✅ Pass | `cv-template.html:86–93` — left-col 32% width with `background-color: var(--sidebar-bg)` (#eef2f5) |
| Page 1 overflow protection | ⚠️ Partial | `.job-entry { page-break-inside: avoid; break-inside: avoid }` (`cv-template.html:178–179`) and section-title keep-together (`lines 245–255`) prevent content splits. However no automated gate warns when summary + achievements push content onto page 2. Page-count check (`cv_orchestrator.py:5824–5844`) covers total pages only, not page-1 balance. |
| No visibly unbalanced whitespace | 🔲 Not Implemented | No check exists for "page 1 is half-full" condition. Story requires flagging a >2cm blank gap at bottom of either column. No such heuristic in `cv_orchestrator.py`, `layout-instruction.js`, or `web_app.py`. |
| Name is largest text element | ✅ Pass | `.name { font-size: 2.2rem }` vs. `.section-title { font-size: 1.1rem }` — name is 2× larger than any section heading |

---

### US-M2: Work Experience — Credibility and Relevance

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Job title bold, prominent | ✅ Pass | `cv-template.html:290–293` — `.job-role { font-weight: 700; font-size: 1rem }` |
| Company + date same line as title | ⚠️ Partial | `cv-template.html:671–675` — `job-header` flex row puts job-role and job-company on same line; dates are in a separate `.job-dates` div on the next line. Not strictly same line as story requires but acceptable adjacent layout. |
| Achievement bullets, not duty prose | ✅ Pass | `cv_orchestrator.py:4337–4344` — weak-verb detection flags "Responsible for," "Duties included," and passive constructions |
| Metrics where present | ✅ Pass | `cv_orchestrator.py:4356–4365` — `_METRIC_RE` pattern detects missing quantification and generates an advisory |
| Relevant bullets first | ✅ Pass | Template uses `exp.ordered_achievements` (`cv-template.html:676`) — relevance-driven ordering applied by orchestrator |
| At least 2 bullets per job | ⚠️ Partial | `cv_orchestrator.py:4485–4511` — 0-bullet entries generate a 'warn' advisory ("will render as bare title and dates only"); 1-bullet entries generate an 'info' advisory. Advisory exists for both cases but does not block generation — a 0-bullet entry can still be rendered. |
| Bullets ≤ 2 lines | ✅ Pass | `cv_orchestrator.py:4396–4411` — "too long" advisory when bullet exceeds 35 words |
| page-break-inside: avoid on job entries | ✅ Pass | `cv-template.html:178–180` — `page-break-inside: avoid; break-inside: avoid` on `.job-entry` |
| Relevance-ordered bullets within entries | ✅ Pass | `cv-template.html:676` — `exp.ordered_achievements` preferred; content customization step drives relevance ordering |
| System warns if bullet lacks action verb | ✅ Pass | `cv_orchestrator.py:4336–4366` — `no_strong_verb` and `weak_verb` advisory types generated |

---

### US-M3: Skills Section Readability

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Skills grouped into named categories | ✅ Pass | `cv-template.html:624–635` — skills rendered as `skill-group` divs with `h4` category label |
| Categories ordered by relevance | ✅ Pass | `cv_orchestrator.py:558–583` — `_sort_categories()` with variant-based priority order; custom `skill_category_order` from session overrides defaults |
| No duplicate skills | ✅ Pass | `cv_orchestrator.py:506–534` — `_deduplicate_skills()` merges by canonical synonym name using the synonym map |
| Skills section ≤ 1.5 sidebar columns | ⚠️ Partial | Skills capped via `generation.max_skills` config and Settings modal, but no explicit sidebar-overflow check. No advisory fires if skills overflow sidebar into undesirable layout. |
| Job-specific terms visible | ✅ Pass | Skill selection driven by ATS keyword match; categories ranked by relevance to role (`cv_orchestrator.py:558–598`) |
| No unsupported skills | ✅ Pass | `skills-review.js:730–734` — "Weak evidence" badge with tooltip when skill is `candidate_to_confirm` |

---

### US-M4: Multi-Page Flow and Readability

| Criterion | Status | Evidence |
|-----------|--------|---------|
| page-break-inside: avoid on job entries | ✅ Pass | `cv-template.html:178–180` — `page-break-inside: avoid; break-inside: avoid` |
| Sidebar colour fills full page height including pages 2+ | ✅ Pass | `cv-template.html:378–401` — faux-column gradient with `-webkit-box-decoration-break: clone; box-decoration-break: clone` |
| Total page count 2–3 for senior; warn if 1 or >3 | ✅ Pass | `cv_orchestrator.py:5824–5844` — warn on 1 page, pass on 2–3, warn on >3, fail on >4 |
| Publications only when relevant | ✅ Pass | `cv_orchestrator.py:3492–3500` — position-style default suppresses publications when domain excludes them; publications-gate question in customization flow |
| Publications section always final | ✅ Pass | `cv-template.html:689` — publications block is last element in right-column structure |
| "Selected Publications" heading when subset | ✅ Pass | `cv-template.html:692–696` — conditional on `total_publications_count > publications|length` |
| No page opening with continuation bullet | ⚠️ Partial | `.job-entry { page-break-inside: avoid }` prevents most splits. Very long single entries may still be forced to split by the renderer; no post-render automated verification of this |
| Sidebar textual content balanced across all pages | ⚠️ Partial | Faux-column technique fills sidebar visual background on all pages. No automated check that sidebar has textual content on pages where main content exists |
| "Selected Publications" — not full-list when all shown | ✅ Pass | `cv-template.html:692–696` and `cv_orchestrator.py:4979` — heading logic is conditional in both HTML and DOCX: "Selected" only when `total_count > len(publications)` |

---

### US-M5: Visual Identity and Professionalism

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Dark navy primary for headings/structure | ✅ Pass | `cv-template.html:25` — `--primary-color: #2c3e50` (dark navy) |
| Serif font for name, sans-serif for body | ✅ Pass | `cv-template.html:211` — `.name { font-family: 'Merriweather', serif }` (display heading); body `'Inter', sans-serif` (line 49) |
| Section titles uppercase with horizontal rule | ✅ Pass | `cv-template.html:233–246` — `.section-title { text-transform: uppercase; border-bottom: 1px solid #ddd }` |
| Icon-prefixed contact fields | ✅ Pass | `cv-template.html:531` — Font Awesome icons preceding every contact field |
| Font Awesome from CDN — offline risk | ⚠️ Partial | `cv-template.html:21` — CDN link only. If network unavailable at WeasyPrint or Chrome render time, icons render as blank squares. No bundled fallback. |
| Google Fonts from CDN — offline risk | ⚠️ Partial | `cv-template.html:22` — CDN link only. System font fallback substantially changes visual appearance. No bundled fallback. |
| All fonts embedded in generated PDF | ✅ Pass | `cv_orchestrator.py:5751–5791` — pypdf font-embedding check with warn if fonts missing |
| Sidebar background on every page | ✅ Pass | `cv-template.html:383–401` — faux-column gradient with `box-decoration-break: clone` |
| No content clipped at page margins | ✅ Pass | `@page { margin: var(--page-margin) }` — configurable via Layout panel; default 0.5in |

---

### US-M6: Cover Letter Tone and Relevance

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Company name and role title in paragraph 1 | ✅ Pass | `cover-letter.js:592–614` — `para1Check` limits scan to first 100 words of first body paragraph; warns (single missing) or fails (both missing) if company name or job title absent |
| At least one company-specific reference | ✅ Pass | `cover-letter.js:562–589` — company reference count check; `master_data_routes.py:1624–1627` — optional `company_context` field injected into LLM prompt |
| Body paragraphs cite specific named achievements | ✅ Pass | `master_data_routes.py:1582–1593` — top 4 achievements injected into prompt; lines 1629–1639 — up to 5 approved rewrites injected as "tailored CV bullets" |
| Closing with direct interview request | ✅ Pass | `cover-letter.js:651–676` — assertive vs. passive CTA detection; `master_data_routes.py:1668` — prompt explicitly requires "specific, confident request for an interview" and rejects passive closings |
| Length within role-appropriate range | ⚠️ Partial | Standard range (300–400w) now aligns with story spec (`master_data_routes.py:122`; `cover-letter.js:625`). Executive range: implementation 350–450w vs. story spec 400–500w. Academic range: implementation 400–500w vs. story spec 500–600w. Both exec and academic targets are ~50w below spec. |
| Tone applied based on inferred employer type | ⚠️ Partial | 5-tone guidance dict exists (`master_data_routes.py:97–103`: startup/tech, formal/traditional, pharma/biotech, academia, financial) and culture-cue enrichment is applied from `job_analysis.culture_indicators` (`lines 1604–1607`). However, tone is always manually selected by user; default hardcoded as `startup/tech` (`cover-letter.js:246`). No auto-suggestion from `job_analysis.domain`. |
| No generic salutation opener | ✅ Pass | `cover-letter.js:534–551` — six generic-opener patterns detected and flagged |
| Body must not open with "I" | ✅ Pass | `cover-letter.js:553–569` — first body token checked; flagged if matches "I" |

---

### US-M7: Selected Publications — Credibility and Relevance Signalling

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Heading "Selected Publications" when subset | ✅ Pass | `cv-template.html:692–696`; `cv_orchestrator.py:4979` — conditional on `total_count > len(publications)` in both HTML and DOCX paths |
| Heading "Publications" when full list shown | ✅ Pass | Same conditional else branch in both renderers |
| Publication count NOT shown in generated CV/ATS document | ✅ Pass | Template renders heading text only; `template_metadata.total_publications_count` is computed but not injected into the heading or any visible output field. No "(N of M)" suffix in generated files. |
| Each entry: authors, title, venue, year visible | ✅ Pass | `cv-template.html:700–715` — `formatted_citation` rendered with structured fields; `cv_orchestrator.py:858–901` builds citation from BibTeX with venue fallback chain |
| First-author visibility | ✅ Pass | `cv-template.html:709–711` — ★ star indicator when `is_first_author`; `cv_orchestrator.py:889–895` — `is_first_author` computed from owner last name vs. first BibTeX author token |
| Entry count matches user-confirmed count | ✅ Pass | `cv_orchestrator.py:3510–3514` — `accepted_publications` from user publication decisions; rejected keys excluded from selection |
| Publications always the final section | ✅ Pass | `cv-template.html:689` — publications block is structurally last in right-column; DOCX generator writes it last (`cv_orchestrator.py:4975–4999`) |
| Entries without venue flagged to user | ✅ Pass | Review UI: `publications-review.js:154` — ⚠ tooltip on venue-warning rows. Generated HTML: `cv-template.html` — `venue_warning` flag drives "[venue unavailable]" label. Generated DOCX: `cv_orchestrator.py:4994–4998` — orange italic "[venue unavailable]" appended in place. All three surfaces covered. |
| Publication count in review UI | — N/A | `publications-review.js:72` — "N of M publications recommended" shown in authoring UI. Story criterion AC7.2 is specifically "never shown in the **generated CV or ATS document**" — the review UI is an authoring tool, not a generated document. Generated documents do not show a count. This is not a story violation. |

---

## Generated Materials Evaluation

**CV Template — Pass overall:**
- Typographic hierarchy: Merriweather serif for name (2.2rem), Inter sans-serif for body (1rem). Clear visual distinction satisfying the story's display/body font pairing requirement.
- Colour scheme: dark navy (#2c3e50) primary, accent blue (#2980b9), sidebar grey (#eef2f5) — professional and consistent across sections.
- Page flow: `page-break-inside: avoid` on `.job-entry`; `break-after: avoid-page` on `.section-title` prevents orphaned headings (`cv-template.html:245–255`).
- Sidebar continuity: faux-column gradient (`cv-template.html:383–401`) maintains sidebar visual fill on all pages including 2+.

**Font loading risk — Partial:**
- Both Font Awesome and Google Fonts are loaded from external CDNs (`cv-template.html:21–22`). On air-gapped or restricted hosts, icons will appear as blank squares (Font Awesome) and body fonts fall back to system defaults (Google Fonts) — substantially degrading visual quality of generated PDFs.

**Summary validation — Partial:**
- `cv_orchestrator.py:3607–3656` checks: no "I" opening, word count 40–250w, single dense paragraph (>80 words, >5 sentences), top-3 required skills present. Does NOT check whether summary states the job title equivalent or includes years-of-experience language (both required by US-M1 acceptance criteria).

**Cover letter — Partial:**
- 8-rule client-side validation (`cover-letter.js:529–718`) is comprehensive: generic opener, "I" first, company reference, para-1 company/role check, role-differentiated word count, assertive CTA, named achievement, and filler-phrase detection.
- Backend prompt engineering is solid with culture-cue enrichment, approved rewrites injection, and direct interview-request directive.
- Word count for standard roles (300–400w) now aligns with story spec. Executive (350–450w) and academic (400–500w) targets remain below story spec (400–500w and 500–600w respectively).

**Publications — Pass:**
- Heading logic correctly differentiates "Selected" vs. full list in both HTML and DOCX. First-author star indicators, venue-warning in all three surfaces (review UI, generated HTML, generated DOCX), and user curation controls all implemented.

---

## Additional Story Gaps / Proposed Story Items

**GAP-HM-NEW-01: Auto-suggest cover letter tone from job analysis**
Job analysis extracts `domain` and `culture_indicators` (`master_data_routes.py:1604–1607`). A simple rule mapping inferred domain to one of the 5 tone options would prevent the default `startup/tech` tone being applied to pharma, academic, or financial roles. Could surface as a pre-selected default or an amber advisory.

**GAP-HM-NEW-02: Cover letter exec/academic word count below story spec**
Standard range (300–400w) now matches story spec. Executive range: implementation 350–450w vs. story 400–500w. Academic/research range: implementation 400–500w vs. story 500–600w. Both the backend prompt instruction (`master_data_routes.py:118–120`) and client-side validation (`cover-letter.js:621–625`) need updating for these two role types.

**GAP-HM-NEW-03: Page 1 fullness advisory**
Story (US-M1): flag if either column ends with a >2cm blank gap. No heuristic exists. Even a rough chars-on-page estimate or a post-render pixel measurement during layout review would help prevent sparse-looking first pages.

**GAP-HM-NEW-04: Summary does not validate role-title presence or years-of-experience**
`_validate_summary()` (`cv_orchestrator.py:3607–3656`) checks no-"I", word count, dense paragraph, and top-3 skills. Does not verify whether summary mentions the job title near-equivalent or quantifies years of experience. Both are required by US-M1 acceptance criteria for the summary.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/routes/master_data_routes.py, web/cover-letter.js, web/publications-review.js, web/skills-review.js, templates/cv-template.html

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-M1 | 6 | 1 | 0 | 1 | 0 |
| US-M2 | 7 | 2 | 0 | 0 | 0 |
| US-M3 | 5 | 1 | 0 | 0 | 0 |
| US-M4 | 7 | 2 | 0 | 0 | 0 |
| US-M5 | 5 | 2 | 0 | 0 | 0 |
| US-M6 | 6 | 2 | 0 | 0 | 0 |
| US-M7 | 8 | 0 | 0 | 0 | 1 |

**Key evidence references:**
- US-M1 name prominence: `cv-template.html:212` — `.name { font-size: 2.2rem }`
- US-M1 page-1 overflow (advisory only): `cv_orchestrator.py:5824–5844` — total page count only
- US-M1 whitespace (not implemented): no check found in cv_orchestrator.py or layout-instruction.js
- US-M2 weak verb detection: `cv_orchestrator.py:4336–4366`
- US-M2 0-bullet advisory: `cv_orchestrator.py:4485–4496` — 'warn' severity for empty experience
- US-M2 1-bullet advisory: `cv_orchestrator.py:4498–4511` — 'info' severity
- US-M3 skill deduplication: `cv_orchestrator.py:506–534`
- US-M3 category ordering: `cv_orchestrator.py:558–598`
- US-M4 page-break-inside: `cv-template.html:178–180`
- US-M4 sidebar fill: `cv-template.html:383–401`
- US-M5 CDN fonts risk: `cv-template.html:21–22`
- US-M5 font embedding check: `cv_orchestrator.py:5751–5791`
- US-M6 tone guidance dict: `master_data_routes.py:97–103`
- US-M6 tone default hardcoded: `cover-letter.js:246` — `|| 'startup/tech'`
- US-M6 culture-cue enrichment: `master_data_routes.py:1604–1607`
- US-M6 para1 check: `cover-letter.js:592–614` — first 100 words of first body paragraph
- US-M6 word count standard (300–400w): `master_data_routes.py:122`; `cover-letter.js:625`
- US-M6 word count exec/academic divergence: `master_data_routes.py:118–120` vs. story spec
- US-M7 heading conditional HTML: `cv-template.html:692–696`
- US-M7 heading conditional DOCX: `cv_orchestrator.py:4979`
- US-M7 first-author star HTML: `cv-template.html:709–711`
- US-M7 first-author DOCX: `cv_orchestrator.py:4953`
- US-M7 venue-warning review UI: `publications-review.js:154`
- US-M7 venue-warning DOCX: `cv_orchestrator.py:4994–4998`
- US-M7 pub count in review UI (N/A — authoring tool, not generated doc): `publications-review.js:72`

**Evidence standard:** Every conclusion supported by file:line evidence drawn from the current source. No findings taken from tasks/gaps.md or tasks/ui-review.md.
