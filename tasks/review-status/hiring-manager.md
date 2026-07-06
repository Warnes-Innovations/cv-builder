<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Hiring Manager Review Status

**Last Updated:** 2026-07-06 14:30 ET

**Executive Summary:** Source-verified hiring manager persona review. The application is well-structured for guiding users toward professional output. Most story criteria are implemented; the primary gaps are: no automatic tone pre-selection from job analysis, cover letter word count targets diverge from story spec, publication count exposed in review UI (ambiguously contradicts story), and no automated page-1 sparseness check. Generated materials quality controls (action verb advisory, weak-bullet detection, 2-bullet minimum advisory, deduplication) are all implemented.

---

## Application Evaluation

### US-M1: First Impression — Page 1 Layout

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Name prominent at top | ✅ Pass | `cv-template.html:642` — `<h1 class="name">{{ personal_info.name }}</h1>`; `.name { font-size: 2.2rem; font-weight: 700 }` at line 212 — largest text element |
| Contact information in sidebar | ✅ Pass | `cv-template.html:528–564` — sidebar left column with Font Awesome icon-prefixed contact fields (email, phone, LinkedIn, website) |
| Professional summary on page 1 | ✅ Pass | `cv-template.html:648–653` — Summary section is first in right column |
| Selected Achievements on page 1 | ✅ Pass | `cv-template.html:655–663` — "Selected Achievements" second in right column, after Summary |
| Education in sidebar | ✅ Pass | `cv-template.html:566–575` — Education in sidebar with degree, institution, year |
| 2-column layout with sidebar differentiation | ✅ Pass | `cv-template.html:86–93` — left-col 32% width with `background-color: var(--sidebar-bg)` (#eef2f5) |
| Page 1 overflow protection | ⚠️ Partial | `.job-entry { page-break-inside: avoid }` (cv-template.html:278–281) and section-title keep-together (lines 250–255) prevent splits. However, no automated gate warns when summary + achievements push onto page 2. ATS check (cv_orchestrator.py:5796–5814) checks total pages, not page-1 balance. |
| No visibly unbalanced whitespace | 🔲 Not Implemented | No automated check for "page 1 is half-full" condition. Story requires flagging a >2cm blank gap. No such check in `cv_orchestrator.py` or `layout-instruction.js`. |
| Name is largest text element | ✅ Pass | `.name { font-size: 2.2rem }` (line 212) vs. `.section-title { font-size: 1.1rem }` (line 235) — name is 2× larger |

---

### US-M2: Work Experience — Credibility and Relevance

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Job title bold, prominent | ✅ Pass | `cv-template.html:290–293` — `.job-role { font-weight: 700; font-size: 1rem }` |
| Company + date same line as title | ⚠️ Partial | `cv-template.html:671–675` — `job-header` flex row puts job-role and job-company on same line; dates are a separate `.job-dates` div below. Acceptable layout but date is not on same line as company. |
| Achievement bullets, not duty prose | ✅ Pass | `cv_orchestrator.py:4337–4344` — weak verb detection flags "Responsible for," "Duties included" patterns |
| Metrics where present | ✅ Pass | `cv_orchestrator.py:4356–4365` — `_METRIC_RE` detects missing quantification; advisory generated |
| Relevant bullets first | ✅ Pass | `cv-template.html:676` — `exp.ordered_achievements` preferred; relevance-driven ordering |
| At least 2 bullets per job | ⚠️ Partial | `cv_orchestrator.py:4465–4483` — advisory fires for count == 1 only; count == 0 (all bullets rejected) is not guarded |
| Bullets ≤ 2 lines | ✅ Pass | `cv_orchestrator.py:4391–4399` — "too long" advisory at >35 words |
| page-break-inside: avoid on job entries | ✅ Pass | `cv-template.html:278–281` |
| Relevance-ordered bullets within entries | ✅ Pass | Template uses `exp.ordered_achievements` (cv-template.html:676) |
| System warns if bullet lacks action verb | ✅ Pass | `cv_orchestrator.py:4336–4354` — weak_verb and no_strong_verb advisories |

---

### US-M3: Skills Section Readability

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Skills grouped into named categories | ✅ Pass | `cv-template.html:624–635` — skills rendered as `skill-group` divs with `h4` category label |
| Categories ordered by relevance | ✅ Pass | `cv_orchestrator.py:558–583` — `_sort_categories()` with priority order by template variant; custom `skill_category_order` from session |
| No duplicate skills | ✅ Pass | `cv_orchestrator.py:506–529` — `_deduplicate_skills()` merges by canonical synonym name |
| Skills section ≤ 1.5 sidebar columns | ⚠️ Partial | No automated check for skills section length relative to sidebar space. Skills capped via `generation.max_skills` config but no explicit sidebar-overflow guard |
| Job-specific terms visible | ✅ Pass | Skills ordered by relevance score; ATS keyword match drives selection |
| No unsupported skills | ✅ Pass | `web/skills-review.js:730–734` — "Weak evidence" badge with tooltip when skill is `candidate_to_confirm` |

---

### US-M4: Multi-Page Flow and Readability

| Criterion | Status | Evidence |
|-----------|--------|---------|
| page-break-inside: avoid on job entries | ✅ Pass | `cv-template.html:278–281` |
| Sidebar colour fills full page height including pages 2+ | ✅ Pass | `cv-template.html:378–401` — faux-column gradient with `-webkit-box-decoration-break: clone` |
| Total page count 2–3 for senior; warn if 1 or >3 | ✅ Pass | `cv_orchestrator.py:5803–5814` — warn on 1, pass on 2–3, warn on >3, fail on >4 |
| Publications only when relevant | ✅ Pass | `cv_orchestrator.py:3492–3500` — position-style default suppresses publications when domain excludes them |
| Publications section always final | ✅ Pass | `cv-template.html:689` — publications block is last in right-col structure |
| "Selected Publications" heading when subset | ✅ Pass | `cv-template.html:692–696` — conditional: "Selected Publications" when `total_publications_count > publications|length` |
| No page opening with continuation bullet | ⚠️ Partial | `.job-entry { page-break-inside: avoid }` handles most cases but very long entries may be forced to split by renderer. No post-render automated verification. |
| Page 3 sidebar content balanced | ⚠️ Partial | Faux-column fills sidebar visual bg on all pages; no automated check that sidebar has textual content on pages where main content exists |
| "Selected Publications" heading — not full-list when shown fully | ✅ Pass | Conditional logic in both HTML template (line 692–696) and DOCX generator (cv_orchestrator.py:4950–4951) |

---

### US-M5: Visual Identity and Professionalism

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Dark navy primary for headings | ✅ Pass | `cv-template.html:25` — `--primary-color: #2c3e50` |
| Serif font for name, sans-serif for body | ✅ Pass | `cv-template.html:211` — `.name { font-family: 'Merriweather', serif }`; body `'Inter', sans-serif` (line 49) |
| Section titles uppercase with border-bottom | ✅ Pass | `cv-template.html:233–246` — `.section-title { text-transform: uppercase; border-bottom: 1px solid #ddd }` |
| Icon-prefixed contact fields | ✅ Pass | `cv-template.html:531` — Font Awesome icons |
| Font Awesome from CDN — offline risk | ⚠️ Partial | `cv-template.html:21` — CDN link. No bundled fallback. If network unavailable at render time, icons show as blank squares. |
| Google Fonts from CDN — offline risk | ⚠️ Partial | `cv-template.html:22` — CDN link. No bundled fallback. System font fallback changes visual appearance significantly. |
| PDF font embedding checked | ✅ Pass | `cv_orchestrator.py:5751–5791` — pypdf check with warn if fonts not embedded |
| Sidebar background on every page | ✅ Pass | `cv-template.html:383–401` — faux-column gradient with `box-decoration-break: clone` |
| No content clipped at margins | ✅ Pass | `@page { margin: var(--page-margin) }` configurable via Layout panel |

---

### US-M6: Cover Letter Tone and Relevance

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Company name and role in paragraph 1 | ✅ Pass | `cover-letter.js:583–605` — para1 check; warns if company name or job title missing in first 100 words |
| Company-specific reference | ✅ Pass | `cover-letter.js:562–580` — company reference check; `master_data_routes.py:1624–1627` — company_context injected into prompt |
| Body paragraphs cite specific achievements | ✅ Pass | `master_data_routes.py:1582–1593` — top 4 achievements injected into prompt; lines 1629–1639 — approved rewrites injected |
| Closing with direct interview request | ✅ Pass | `cover-letter.js:642–675` — assertive vs. passive CTA detection; `master_data_routes.py:1668` — prompt requires direct interview request |
| Length within role-appropriate range | ⚠️ Partial | **Mismatch with story spec**: Story requires 300–400w standard. Backend uses 250–300w standard (`master_data_routes.py:122`); client validation uses hi-end of 300w (`cover-letter.js:616`). Letters targeting 280w may read thin for substantive roles. |
| Tone applied based on inferred employer type | ⚠️ Partial | 5-tone guidance dict exists (`master_data_routes.py:97–103`) but tone is always manually selected. Default is hardcoded `startup/tech` (`cover-letter.js:246`). No auto-suggestion from `job_analysis.domain` or `culture_indicators`. |
| No generic opening | ✅ Pass | `cover-letter.js:526–542` |
| "I" as first body word flagged | ✅ Pass | `cover-letter.js:544–560` |

---

### US-M7: Selected Publications — Credibility and Relevance Signalling

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Heading "Selected Publications" when subset | ✅ Pass | `cv-template.html:692–696`; `cv_orchestrator.py:4950–4951` |
| Heading "Publications" when full list | ✅ Pass | Same conditional else branch |
| Publication count NOT shown in generated CV/ATS doc | ✅ Pass | Template renders heading text only; no count suffix in generated documents |
| Each entry: authors, title, venue, year | ✅ Pass | `cv-template.html:700–715` — `formatted_citation` rendered with venue warning flag |
| First-author visibility | ✅ Pass | `cv-template.html:709–711` — ★ star for first author; DOCX: `cv_orchestrator.py:4953` |
| Entry count matches user-confirmed count | ✅ Pass | `cv_orchestrator.py:3510–3514` — accepted_publications from user decisions |
| Publications always final section | ✅ Pass | `cv-template.html:689` — structurally last in right-col |
| Entries without venue flagged | ✅ Pass | `publications-review.js:154` — ⚠ tooltip in review UI; `cv_orchestrator.py:4966–4970` — "[venue unavailable]" in DOCX |
| Publication count in review UI | ❌ Fail | `publications-review.js:70–73` — context note shows `"N of M publications recommended"`. Story criterion: count "never shown" — ambiguous whether this covers the review UI or only the generated document. If covering the UI, this is a Fail. The raw "of 52" figure may inadvertently pressure users to add more publications. |

---

## Generated Materials Evaluation

**CV Template — Pass overall:**
- Typographic hierarchy: Merriweather serif for name (2.2rem), Inter sans-serif for body (1rem). Clear visual distinction.
- Colour scheme: dark navy (#2c3e50) primary, accent blue (#2980b9), sidebar grey (#eef2f5) — professional and consistent.
- Page flow: `page-break-inside: avoid` on `.job-entry`; `break-after: avoid-page` on `.section-title` prevents orphaned headings.
- Sidebar continuity: faux-column gradient (`cv-template.html:383–401`) maintains visual consistency on pages 2+.

**Font loading risk — Partial:**
- Both Font Awesome and Google Fonts are loaded from external CDNs (`cv-template.html:21–22`). WeasyPrint may fetch these at render time; Chrome headless also requires network access. On air-gapped or restricted hosts, icons will appear as blank squares and body fonts will fall back to system defaults — substantially degrading visual quality.

**Summary validation — Partial:**
- `cv_orchestrator.py:3607–3646` checks: no "I" opening, word count 40–250w, top-3 required skills. Does not check whether the summary states the job title equivalent or years of experience (both required by US-M1 acceptance criteria).

**Cover letter — Partial:**
- Quality controls (5 client-side rules) are robust. Backend prompt engineering is solid. Word count target for standard roles is 250–300w (code) vs. 300–400w (story spec) — letters will often be shorter than managers expect.

**Publications — Pass:**
- Heading logic correctly differentiates "Selected" vs. full list in both HTML and DOCX. First-author visibility, venue warnings, and user curation controls all implemented.

---

## Additional Story Gaps / Proposed Story Items

**GAP-HM-NEW-01: Auto-suggest cover letter tone from job analysis**
Job analysis extracts `domain` and `culture_indicators` (`master_data_routes.py:1604`). A simple mapping to pre-select the tone dropdown (or display a hint) would prevent the common error of generating a pharma cover letter with startup language.

**GAP-HM-NEW-02: Cover letter word count standard target mismatch**
Backend targets 250–300w for standard roles (`master_data_routes.py:122`); story spec requires 300–400w. Align both backend prompt and client validation to the story spec range.

**GAP-HM-NEW-03: Page 1 fullness advisory**
Story (US-M1): flag if either column ends with a >2cm blank gap. No heuristic exists. Even a rough chars-on-page estimate would help prevent sparse-looking first pages.

**GAP-HM-NEW-04: Summary does not validate role-title presence or years-of-experience**
`_validate_summary()` (cv_orchestrator.py:3607) checks skills but not job-title near-match or "X years of experience" language. Both are required by US-M1 acceptance criteria for the summary.

**GAP-HM-NEW-05: 0-bullet job entry not guarded**
`cv_orchestrator.py:4470` — advisory fires only for count == 1. A job with all bullets rejected (count == 0) renders as a bare title with company/dates only. This is a credibility failure. Add a hard advisory (or gate) for count == 0.

**GAP-HM-NEW-06: Publication count in review UI vs. story intent**
`publications-review.js:72–73` shows "N of M publications recommended." If the story intent is that candidates should never see the total count (to prevent prestige-signalling pressure), the "of M" portion should be removed from the UI context note. If the intent is only for generated documents, this is N/A.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/routes/master_data_routes.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, web/cover-letter.js, web/publications-review.js, web/skills-review.js, templates/cv-template.html

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-M1 | 6 | 1 | 0 | 1 | 0 |
| US-M2 | 7 | 2 | 0 | 0 | 0 |
| US-M3 | 5 | 1 | 0 | 0 | 0 |
| US-M4 | 6 | 3 | 0 | 0 | 0 |
| US-M5 | 5 | 2 | 0 | 0 | 0 |
| US-M6 | 6 | 2 | 0 | 0 | 0 |
| US-M7 | 7 | 0 | 1 | 0 | 0 |

**Key evidence references:**
- US-M1 name prominence: `cv-template.html:210–218` — `.name { font-size: 2.2rem }`
- US-M1 page-1 overflow (no gate): `cv_orchestrator.py:5796–5814` — total page count only
- US-M1 whitespace (not implemented): no check found in cv_orchestrator.py or layout-instruction.js
- US-M2 weak verb detection: `cv_orchestrator.py:4336–4354`
- US-M2 2-bullet advisory: `cv_orchestrator.py:4465–4483`
- US-M2 0-bullet gap: `cv_orchestrator.py:4470` — `if bullet_count == 1:` only
- US-M3 skill deduplication: `cv_orchestrator.py:506–529`
- US-M3 category ordering: `cv_orchestrator.py:558–583`
- US-M4 page-break-inside: `cv-template.html:278–281`
- US-M4 sidebar fill: `cv-template.html:383–401`
- US-M5 CDN fonts risk: `cv-template.html:21–22`
- US-M5 font embedding check: `cv_orchestrator.py:5751–5791`
- US-M6 tone guidance dict: `master_data_routes.py:97–103`
- US-M6 word count mismatch: `master_data_routes.py:118–122` (250–300w) vs. story 300–400w
- US-M6 tone default hardcoded: `cover-letter.js:246` — `|| 'startup/tech'`
- US-M6 para1 check: `cover-letter.js:583–605`
- US-M7 heading conditional HTML: `cv-template.html:692–696`
- US-M7 heading conditional DOCX: `cv_orchestrator.py:4950–4951`
- US-M7 first-author star: `cv-template.html:709–711`
- US-M7 pub count in UI: `publications-review.js:70–73`

**Evidence standard:** Every conclusion supported by file:line evidence. No findings taken from tasks/gaps.md or tasks/ui-review.md.
