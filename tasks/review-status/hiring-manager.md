<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Hiring Manager Review Status

**Last Updated:** 2026-07-06 (cycle 91+, source-first)

**Executive Summary:** Fresh source-first review against the feature/multi-user-deployment branch
(cycle 91). Core application workflow, CV layout/structure, work experience quality controls, skills
organisation, publications labelling, and most cover-letter checks are solidly implemented. Four new
gaps are identified. Two are MEDIUM priority: (1) the summary validator does not check for role-title
or years-of-experience language, and (2) there is no warning when company context is absent from the
cover letter prompt. The other two are LOW: executive/academic cover-letter word-count targets are
~50 words below story spec, and the tone selector silently defaults to `startup/tech` when the job
domain is empty.

**Evidence standard:** Every finding is derived from direct file:line inspection of current source.
No findings taken from `tasks/gaps.md` or `tasks/ui-review.md`.

---

## Application Evaluation

### US-M1: First Impression — Page 1 Layout

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Name prominent at top | ✅ Pass | `cv-template.html` — `.name { font-size: 2.2rem; font-weight: 700 }` is the largest text element on the page; `.section-title` is `1.1rem` |
| Contact information in sidebar | ✅ Pass | Template sidebar left column uses Font Awesome icon-prefixed fields (email, phone, LinkedIn, website) |
| Professional summary on page 1 | ✅ Pass | Summary is the first element in the right column of the template |
| Selected Achievements on page 1 | ✅ Pass | Achievements section immediately follows Summary in right column |
| Education in sidebar | ✅ Pass | Education with degree, institution, year is in the sidebar |
| 2-column layout with sidebar differentiation | ✅ Pass | Left column `background-color: var(--sidebar-bg)` (#eef2f5) creates clear visual separation |
| Page 1 overflow protection | ⚠️ Partial | `.job-entry { page-break-inside: avoid }` (`styles.css:178`) prevents entry splits; section-title keep-together prevents orphaned headings. No automated gate warns when page 1 content spills due to an oversized summary or too many achievements |
| No visibly unbalanced whitespace | 🔲 Not Implemented | No heuristic checks for a >2cm blank gap at the bottom of either column (US-M1 acceptance criterion). Not present in `cv_orchestrator.py`, `layout-instruction.js`, or `web_app.py` |
| Summary is role-specific: title, years, differentiator | ⚠️ Partial | `cv_orchestrator.py:3607–3656` — `_validate_summary()` checks no-"I" opening, word count (40–250), dense-paragraph structure, and top-3 required skills. Does NOT check for job title/near-equivalent or years-of-experience language. Both are required by US-M1 acceptance criteria for a role-specific summary |

**New gap: GAP-HM-NEW-04 (MEDIUM)** — `_validate_summary()` does not verify that the summary
mentions the job title (or equivalent) or quantifies years of experience.  
**Existing gap: GAP-HM-NEW-03 (LOW)** — No page-1 column-fullness advisory.

---

### US-M2: Work Experience — Credibility and Relevance

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Job title bold and prominent | ✅ Pass | Template `.job-role { font-weight: 700; font-size: 1rem }` |
| Company + date adjacent to title | ✅ Pass | `.job-header` flex row; dates in `.job-dates` div immediately below — adjacent and scannable |
| Achievement bullets, not duty prose | ✅ Pass | `cv_orchestrator.py:4182–4228` — `_WEAK_VERBS` frozenset detects "Responsible for," "Duties included," "Key player," etc.; advisories surfaced at rewrite review |
| Metrics where present | ✅ Pass | `cv_orchestrator.py` — `_METRIC_RE` pattern detects missing quantification and generates advisory |
| Relevant bullets first | ✅ Pass | `ordered_achievements` in template; keyword-overlap sort at `cv_orchestrator.py:3275–3285`; user can override via Experience Bullets tab |
| At least 2 bullets per job | ⚠️ Partial | `cv_orchestrator.py:4485–4511` — 0-bullet entries fire a `warn` advisory ("will render as bare title and dates only"); 1-bullet entries fire an `info` advisory. Neither blocks generation |
| Bullets ≤ 2 lines each | ✅ Pass | "too long" advisory at >35 words per bullet |
| page-break-inside: avoid on job entries | ✅ Pass | `styles.css:178` — `page-break-inside: avoid; break-inside: avoid` on `.job-entry` |
| Relevance-ordered bullets within each entry | ✅ Pass | Orchestrator sorts `ordered_achievements` by keyword-overlap relevance by default |
| System warns if bullet lacks action verb | ✅ Pass | `cv_orchestrator.py:4336–4366` — `no_strong_verb` and `weak_verb` advisory types generated; `llm_client.py:1118–1152` — `check_strong_action_verb()` used in rewrite review phase |

---

### US-M3: Skills Section Readability

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Skills grouped into named categories | ✅ Pass | Template renders `skill-group` divs with `h4` category label |
| Categories ordered by relevance | ✅ Pass | `cv_orchestrator.py:558–598` — `_sort_categories()` with variant-based priority; `skill_category_order` from session overrides default |
| No duplicate skills | ✅ Pass | `cv_orchestrator.py:506–534` — `_deduplicate_skills()` merges by canonical synonym name via synonym map |
| Skills section ≤ 1.5 sidebar columns | ⚠️ Partial | Skills capped via `generation.max_skills` config and Settings modal. No sidebar-overflow check; no advisory fires if rendered skills overflow the visual sidebar |
| Job-specific terms visible | ✅ Pass | Skill selection driven by ATS keyword match; categories ranked by role relevance |
| No unsupported skills | ✅ Pass | "Weak evidence" badge on `candidate_to_confirm` skills in the Skills review tab |

---

### US-M4: Multi-Page Flow and Readability

| Criterion | Status | Evidence |
|-----------|--------|---------|
| page-break-inside: avoid on job entries | ✅ Pass | `styles.css:178` — `page-break-inside: avoid; break-inside: avoid` on `.job-entry`; also on `.pub-item` (`styles.css:499`) |
| Sidebar colour fills full page height on all pages | ✅ Pass | Template faux-column gradient with `box-decoration-break: clone` fills sidebar background across all pages |
| Total page count 2–3; warn if 1 or >3 | ✅ Pass | `cv_orchestrator.py:5824–5844` — warn at 1 page, pass at 2–3, warn at >3, flag at >4 |
| Publications only when relevant | ✅ Pass | `cv_orchestrator.py:3492–3500` — position-style default suppresses publications for non-research roles; user can override via Publications review tab |
| Publications are always the final section | ✅ Pass | Publications block is structurally last in the right-column template; DOCX generator writes it last |
| "Selected Publications" heading when subset shown | ✅ Pass | HTML and DOCX both conditional: heading is "Selected" only when `total_count > len(publications)` |
| No page opening with a continuation bullet | ⚠️ Partial | `.job-entry { page-break-inside: avoid }` prevents most splits. Very long single entries may still force a renderer split; no post-render automated check |
| Sidebar has textual content on all pages with main content | ⚠️ Partial | Faux-column fills the sidebar background but does not guarantee sidebar text content on pages 2+; no automated check |

---

### US-M5: Visual Identity and Professionalism

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Dark navy primary for headings/structure | ✅ Pass | `--primary-color: #2c3e50` (dark navy) in template |
| Serif name font / sans-serif body | ✅ Pass | `.name { font-family: 'Merriweather', serif }` for display; `'Inter', sans-serif` for body |
| Section titles uppercase with horizontal rule | ✅ Pass | `.section-title { text-transform: uppercase; border-bottom: 1px solid #ddd }` |
| Icon-prefixed contact fields | ✅ Pass | Font Awesome icons on every contact field in sidebar |
| All fonts embedded in generated PDF | ✅ Pass | `cv_orchestrator.py:5751–5791` — pypdf font-embedding check with warn if fonts missing |
| Sidebar background on every page | ✅ Pass | `box-decoration-break: clone` in template |
| No content clipped at page margins | ✅ Pass | `@page { margin: var(--page-margin) }` — configurable via Layout panel; default 0.5in |
| Font Awesome from CDN — offline rendering risk | ⚠️ Partial | CDN link only in template. If network is unavailable at WeasyPrint or Chrome render time, icons render as blank squares. No bundled fallback |
| Google Fonts from CDN — offline rendering risk | ⚠️ Partial | CDN link only. System-font fallback substantially changes PDF appearance. No bundled fallback |

---

## Generated Materials Evaluation

### US-M6: Cover Letter Tone and Relevance

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Company name and role title in paragraph 1 | ✅ Pass | `cover-letter.js:592–614` — `para1Check` limits scan to first 100 words of first body paragraph; warns (single missing) or fails (both missing) |
| At least one company-specific reference | ⚠️ Partial | `cover-letter.js:562–589` — company reference count check validates company name appears. BUT the prompt only injects company-specific context when the user fills `company_context` (`master_data_routes.py:1640–1643`). No warning is surfaced when company context is empty and a company name is known from job analysis. The letter can pass the name-count check (company mentioned twice) without containing any company-specific substance |
| Body paragraphs cite specific named achievements | ✅ Pass | `master_data_routes.py:1582–1609` — top 4 achievements injected into prompt; up to 5 approved rewrites injected as "tailored CV bullets" |
| Closing with direct interview request | ✅ Pass | `cover-letter.js:651–676` — assertive vs. passive CTA distinction enforced in client-side validation; `master_data_routes.py:1684` — prompt explicitly rejects passive closings |
| Length within role-appropriate range | ⚠️ Partial | Standard (300–400w) aligns with story spec. Executive: implementation 350–450w vs. story spec 400–500w. Academic: implementation 400–500w vs. story spec 500–600w. Both exec and academic targets are ~50w below spec at the upper bound |
| Tone applied based on inferred employer type | ⚠️ Partial | 5-tone guidance dict (`master_data_routes.py:97–103`). Culture-cue enrichment from `job_analysis.culture_indicators` applied automatically (`lines 1619–1623`). However, tone selector defaults to `startup/tech` (`cover-letter.js:246`) when domain does not match any regex — no advisory fires for the mismatch |
| No generic salutation opener | ✅ Pass | `cover-letter.js:534–551` — six generic-opener patterns detected and flagged |
| Body must not open with "I" | ✅ Pass | `cover-letter.js:553–569` — first body token checked |
| Filler phrases rejected | ✅ Pass | `cover-letter.js:698–717` — 18-phrase filler list with warn/fail thresholds |
| Backend persuasion checks (passive voice, hedging, generic phrases) | ✅ Pass | `master_data_routes.py:1709–1731` — three `LLMClient` checks run on generated body; warnings surfaced in validation panel (GAP-339 implemented) |

**New gap: GAP-HM-NEW-01 (MEDIUM)** — No warning when `company_context` is empty but a company
name is known. The letter passes the company-reference count check without company-specific substance.

**New gap: GAP-HM-NEW-02 (LOW)** — Executive (350–450w) and academic (400–500w) word-count targets
are below story spec (400–500w and 500–600w respectively). Affects both `master_data_routes.py:118–120`
and `cover-letter.js:621–625`.

---

### US-M7: Selected Publications — Credibility and Relevance Signalling

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Heading "Selected Publications" when showing a subset | ✅ Pass | `cv-template.html:692–696`; `cv_orchestrator.py:4981` — conditional on `total_count > len(publications)` in both HTML and DOCX |
| Heading "Publications" when full list shown | ✅ Pass | Same conditional else branch in both renderers |
| Publication count NOT shown in generated CV or ATS document | ✅ Pass | `template_metadata.total_publications_count` is computed internally but is not rendered in any visible output element or heading suffix |
| Each entry: authors, title, venue, year — in scan priority order | ✅ Pass | `formatted_citation` built from BibTeX fields by `cv_orchestrator.py:858–901`; structured citation with venue fallback chain |
| First-author visibility | ✅ Pass | `cv-template.html:709–711` — ★ symbol when `is_first_author`; `cv_orchestrator.py:889–895` — `is_first_author` computed from owner last name vs. first BibTeX author token |
| Entry count matches user-confirmed count | ✅ Pass | `cv_orchestrator.py:3510–3522` — `accepted_publications` from user decisions; rejected keys excluded |
| Publications always the final section | ✅ Pass | Publications block is structurally last in right-column template; DOCX generator writes it last |
| Entries without venue flagged to user | ✅ Pass | Review UI: `publications-review.js:154` — ⚠ tooltip on venue-warning rows. Generated HTML: `[venue unavailable]` label when `venue_warning` set. Generated DOCX: `cv_orchestrator.py:4994–4998` — orange italic "[venue unavailable]" appended |
| Publication count in review authoring UI (N/A — authoring tool only) | — N/A | `publications-review.js:72` — "N of M publications recommended" is shown in the review UI (an authoring tool), not in generated documents. Story criterion is specifically about generated CV/ATS documents. Not a story violation |

---

## Summary of New Gaps

| Gap ID | Story | Priority | Description |
| ------ | ----- | -------- | ----------- |
| GAP-HM-NEW-01 | US-M6 | MEDIUM | No warning when cover letter company context is empty — company-reference count check passes on name mentions alone, with no company-specific substance |
| GAP-HM-NEW-02 | US-M6 | LOW | Executive and academic word-count targets ~50w below story spec in both backend prompt and client-side validation |
| GAP-HM-NEW-03 | US-M1 | LOW | No page-1 column-fullness advisory (>2cm blank gap heuristic) |
| GAP-HM-NEW-04 | US-M1 | MEDIUM | `_validate_summary()` does not check for job title or years-of-experience language in the summary — both are US-M1 acceptance criteria |

---

## Story Pass/Partial/Not-Implemented Summary

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| ----- | ------- | --------- | ------ | ---------- |
| US-M1 | 6 | 1 | 0 | 1 |
| US-M2 | 8 | 1 | 0 | 0 |
| US-M3 | 5 | 1 | 0 | 0 |
| US-M4 | 6 | 2 | 0 | 0 |
| US-M5 | 7 | 2 | 0 | 0 |
| US-M6 | 7 | 3 | 0 | 0 |
| US-M7 | 8 | 0 | 0 | 0 |

**Key evidence references (file:line):**

- US-M1 summary validation: `cv_orchestrator.py:3607–3656` — no job-title or years check
- US-M1 page-1 sparseness: not found in `cv_orchestrator.py`, `layout-instruction.js`, or `web_app.py`
- US-M2 weak verb: `cv_orchestrator.py:4182–4228`; `llm_client.py:1118–1152`
- US-M2 0-bullet advisory: `cv_orchestrator.py:4485–4496`
- US-M3 skill deduplication: `cv_orchestrator.py:506–534`
- US-M4 page-break-inside: `styles.css:178`; `styles.css:499`
- US-M4 faux-column: template `box-decoration-break: clone`
- US-M5 CDN font risk: template font/icon CDN links (lines 21–22)
- US-M5 font embedding check: `cv_orchestrator.py:5751–5791`
- US-M6 tone default hardcoded: `cover-letter.js:246` — `|| 'startup/tech'`
- US-M6 culture-cue enrichment: `master_data_routes.py:1619–1623`
- US-M6 company_context optional block: `master_data_routes.py:1640–1643`
- US-M6 para1 check: `cover-letter.js:592–614`
- US-M6 assertive CTA: `cover-letter.js:651–676`; `master_data_routes.py:1684`
- US-M6 word count ranges: `master_data_routes.py:118–122`; `cover-letter.js:621–625`
- US-M6 persuasion checks: `master_data_routes.py:1709–1731`
- US-M7 heading HTML: `cv-template.html:692–696`
- US-M7 heading DOCX: `cv_orchestrator.py:4981`
- US-M7 first-author HTML: `cv-template.html:709–711`
- US-M7 venue-warning DOCX: `cv_orchestrator.py:4994–4998`
- US-M7 pub-review count (N/A — authoring UI): `publications-review.js:72`
