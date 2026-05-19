<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# Hiring Manager Review Status

**Reviewed:** 2026-04-22  
**Reviewer:** Source-first systematic evaluation (hiring-manager persona)  
**Story file:** `tasks/user-story-hiring-manager.md`  
**Status symbols:** ✅ Pass · ⚠️ Partial · ❌ Fail · 🔲 Not Implemented · — N/A

**Source files examined:**
- `templates/cv-template.html`
- `scripts/utils/cv_orchestrator.py`
- `scripts/utils/llm_client.py`
- `scripts/routes/generation_routes.py`
- `scripts/routes/review_routes.py`
- `web/download-tab.js`
- `web/cover-letter.js`
- `web/layout-instruction.js`
- `web/ats-refinement.js`
- `web/publications-review.js`
- `web/rewrite-review.js`
- `web/skills-review.js`
- `web/state-manager.js`
- `web/summary-review.js`

---

## Story Tally

| Story | Description                              | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|------------------------------------------|---------|-----------|--------|------------|-------|
| US-M1 | First Impression — Page 1 Layout        | 0       | 4         | 0      | 0          | 0     |
| US-M2 | Work Experience — Credibility/Relevance  | 4       | 0         | 0      | 2          | 0     |
| US-M3 | Skills Section Readability              | 2       | 1         | 0      | 1          | 0     |
| US-M4 | Multi-Page Flow and Readability         | 3       | 2         | 0      | 0          | 0     |
| US-M5 | Visual Identity and Professionalism     | 2       | 3         | 0      | 0          | 0     |
| US-M6 | Cover Letter Tone and Relevance         | 1       | 2         | 0      | 3          | 0     |
| US-M7 | Selected Publications                   | 5       | 1         | 0      | 0          | 0     |
| **Total** |                                     | **17**  | **13**    | **0**  | **6**      | **0** |

**Notable changes from 2026-04-20 review:**
- US-M7 improved from 2✅/2⚠️/2❌ → 5✅/1⚠️/0❌ (publications heading conditional fixed; venue_warning fully wired through orchestrator, LLM client, API, and review UI)
- US-M4 improved from 1✅/4⚠️ → 3✅/2⚠️ (page count warning now fires in Download tab)
- US-M6 changed from 1✅/3⚠️/0❌/2🔲 → 1✅/2⚠️/0❌/3🔲 (cover letter company-specific reference and named achievement checks found absent)

---

## US-M1: First Impression — Page 1 Layout

| AC    | Criterion                                                                                             | Status | Evidence |
|-------|-------------------------------------------------------------------------------------------------------|--------|----------|
| M1-AC1 | Page 1 contains name, contact, summary, selected achievements, and education — all visible without scrolling | ⚠️ | Template implements 2-column layout with all 5 elements in correct columns (`templates/cv-template.html`). No automated check that content volume does not push any element to page 2. |
| M1-AC2 | Summary is role-specific: contains job title or near-equivalent, years of experience, and one specific differentiator | ⚠️ | `llm_client.py:668` `generate_professional_summary()` prompts for job title, domain, keywords, and references to real experience. No post-generation validation step confirms the accepted text actually contains these elements. `web/summary-review.js:37–138` lets user regenerate with custom instructions but does not gate submission on passing role-specificity checks. |
| M1-AC3 | Page 1 has no overflow — content does not bleed onto page 2 from the fixed-height section | ⚠️ | WeasyPrint renders to paginated output. No automated overflow detection; `generation_routes.py:755–758` (`_page_warning`) checks page count but not whether page 1 exceeds one page. Visual inspection required. |
| M1-AC4 | Page 1 has no visibly unbalanced whitespace — neither column ends with a large blank area | ⚠️ | Template renders sidebar and main columns independently; no automated measurement of column-fill ratio. Visual QC only. |

**Failure modes addressed:** Template places name as largest element (`cv-template.html`). Summary word count prompt targets 3–5 sentences (≈80–150 words, `llm_client.py:756`). Font size configurable via CSS.

**Failure modes not addressed:** Summary generic-language check is not enforced post-generation. No automated page 1 balance measurement.

---

## US-M2: Work Experience — Credibility and Relevance

| AC     | Criterion                                                                                              | Status | Evidence |
|--------|--------------------------------------------------------------------------------------------------------|--------|----------|
| M2-AC1 | Every bullet starts with a strong action verb (past tense for past roles, present for current)        | ✅     | `cv_orchestrator.py:3146–3255` `check_persuasion()` flags bullets lacking a strong verb. Results surfaced in `web/rewrite-review.js:46–58`; submit gated on `persuasionWarningsAcknowledged`. |
| M2-AC2 | Each job entry has at least 2 bullets                                                                  | 🔲     | No minimum bullet count check in `cv_orchestrator.py`, `generation_routes.py`, or frontend. A job entry with 1 accepted bullet silently renders. |
| M2-AC3 | Bullets are ≤ 2 lines each                                                                             | 🔲     | No bullet line-length or word-count check anywhere in orchestrator or frontend validators. |
| M2-AC4 | Job entries are not split across pages (`page-break-inside: avoid`)                                    | ✅     | `templates/cv-template.html:279` `.job-entry { page-break-inside: avoid; }` |
| M2-AC5 | Relevance-ordered bullets within each entry (most relevant first)                                      | ✅     | `cv_orchestrator.py:2453` `_select_content_hybrid()` sorts by keyword-overlap relevance by default; user can manually reorder via `web/rewrite-review.js`. |
| M2-AC6 | System warns if a bullet lacks an action verb                                                          | ✅     | `cv_orchestrator.py:3048–3069` defines `_STRONG_VERBS` / `_WEAK_VERBS`; `check_persuasion()` returns findings dict; `rewrite-review.js:358–363` gates advance on acknowledgment. |

**Failure modes addressed:** Passive phrasing ("Responsible for", "Duties included") detected via `_WEAK_VERBS` frozenset and surfaced in UI.

**Failure modes not addressed:** Single-bullet entries pass silently (GAP-HM-01). Paragraph-length bullets pass silently.

---

## US-M3: Skills Section Readability

| AC     | Criterion                                                                                              | Status | Evidence |
|--------|--------------------------------------------------------------------------------------------------------|--------|----------|
| M3-AC1 | Skills grouped into named categories on the human-readable PDF                                         | ✅     | `cv_orchestrator.py:405–490` `_organize_skills_by_category()` groups skills by `category` field and renders category headers in template. |
| M3-AC2 | Categories ordered by relevance to the target role                                                     | ⚠️     | `cv_orchestrator.py:459–465` uses hardcoded priority orders (`standard`, `technical`, `academic`) with no AI-derived relevance ranking from job analysis. User can manually reorder categories via `web/skills-review.js:359–400` `saveSkillCategoryOrder()`, which stores order in `session.skill_category_order`. No automatic inference of category relevance from job keywords. |
| M3-AC3 | No duplicate skills (exact match or obvious aliases)                                                   | ✅     | `cv_orchestrator.py:416–444` `canonical_seen` dict deduplicates by canonical synonym name; aliases merged into single entry. |
| M3-AC4 | Skills section occupies no more than 1.5 sidebar columns total                                         | 🔲     | `config.yaml` `generation.max_skills: 20` limits count. No check on rendered visual height or sidebar-column fill ratio. |

**Failure modes addressed:** Deduplication by canonical name catches "ML" / "Machine Learning" synonyms. Flat alphabetical list avoided by category grouping. Skills sorted by years within category.

**Failure modes not addressed:** Stale/rare skills can appear without age-based filtering. Visual overflow to 2+ columns not detected automatically.

---

## US-M4: Multi-Page Flow and Readability

| AC     | Criterion                                                                                              | Status | Evidence |
|--------|--------------------------------------------------------------------------------------------------------|--------|----------|
| M4-AC1 | `page-break-inside: avoid` applied to every job entry; split entries not permitted                     | ✅     | `templates/cv-template.html:279` `.job-entry { page-break-inside: avoid; }` |
| M4-AC2 | Sidebar content balanced across pages (not empty on any page that has main content)                    | ⚠️     | `templates/cv-template.html:384–425` print CSS uses `box-decoration-break: clone` to repeat sidebar background on all pages. Sidebar BACKGROUND repeats, but sidebar CONTENT (contact, education, awards) appears once on page 1 only. Pages 2+ may have empty sidebar content area with background colour only. |
| M4-AC3 | Total page count is 2–3 for a senior candidate; system warns if output is 1 or >3 pages               | ✅     | `generation_routes.py:755–758` `_page_warning()` returns true when `page_count < 2.0 or > 3.0`. `web/download-tab.js:76–92` `_renderValidationSummary()` shows amber badge "⚠ Senior candidate target is 2–3 pages" when `pageCount < 1.5 || pageCount > 3`. |
| M4-AC4 | Publications included only when flagged as relevant for the role type                                  | ⚠️     | `cv_orchestrator.py:2698–2751` `_select_publications()` scores by recency, type, and keyword overlap. No role-type gate (e.g., suppressing publications entirely for pure industry/non-research roles). Publications are shown whenever the user has `publications.bib` entries, regardless of whether the job is research-oriented. |
| M4-AC5 | When publications included, section headed "Selected Publications" — not "Publications" — signalling curation | ✅  | `templates/cv-template.html:638–642`: `{% if template_metadata.total_publications_count and template_metadata.total_publications_count > (publications | length) %}Selected Publications{% else %}Publications{% endif %}`. Correctly shows "Selected Publications" when `total_publications_count > displayed_count`, "Publications" when all bib entries are displayed. |

**Failure modes addressed:** Job-entry page splits prevented by CSS. Page count surfaced at Download step with warning badge.

**Failure modes not addressed:** Sidebar content distribution across pages not automated (only background repeats). No role-type gate to suppress publications for non-research roles.

---

## US-M5: Visual Identity and Professionalism

| AC     | Criterion                                                                                              | Status | Evidence |
|--------|--------------------------------------------------------------------------------------------------------|--------|----------|
| M5-AC1 | All fonts embedded in the PDF (WeasyPrint embeds by default; verify for Chrome headless fallback)      | ⚠️     | WeasyPrint (primary): embeds fonts by default ✅. Chrome headless (fallback): `templates/cv-template.html:22–24` loads Inter and Merriweather from Google Fonts CDN and Font Awesome from Cloudflare CDN — both require network access at generation time; fonts not embedded if CDN is unavailable. |
| M5-AC2 | Sidebar background colour present on every page, including pages 2+                                   | ✅     | `templates/cv-template.html:408–425` print CSS: `.cv-sidebar::before { box-decoration-break: clone; -webkit-box-decoration-break: clone; }` repeats sidebar background on all printed pages. |
| M5-AC3 | No content clipped at page margins                                                                     | ✅     | Margin configuration via CSS variables in template; configurable without overflows by default layout. |
| M5-AC4 | Font Awesome icons rendered correctly (requires network or bundled font file at generation time)       | ⚠️     | `templates/cv-template.html:22` Font Awesome 6 loaded from Cloudflare CDN. Rendering fails silently (blank squares) in offline environments. No bundled fallback. |
| M5-AC5 | PDF passes visual QC: compare rendered page images against a reference screenshot                      | ⚠️     | No automated visual regression test exists. Side-by-side HTML preview is available via `cv-preview.sh`. Manual inspection required for each generated PDF. |

**Failure modes addressed:** Sidebar background repeats on all pages. WeasyPrint embeds fonts on primary rendering path.

**Failure modes not addressed:** Chrome headless fallback path has CDN-dependent font/icon loading. No automated visual regression baseline.

---

## US-M6: Cover Letter Tone and Relevance

| AC     | Criterion                                                                                              | Status | Evidence |
|--------|--------------------------------------------------------------------------------------------------------|--------|----------|
| M6-AC1 | Company name and role title appear in paragraph 1                                                      | ⚠️     | `web/cover-letter.js:469–543` `_validateCoverLetter()` Rule 1 checks for company name presence in the full letter text (mention count). Checks that company name appears in the text but does not verify it appears specifically in paragraph 1. Role title check is not implemented separately. |
| M6-AC2 | At least one company-specific reference (recent initiative, product, or value) if extractable from job posting | 🔲  | `_validateCoverLetter()` Rule 2 counts company name mentions (`≥2 = pass`, `= 1 = warn`). No check for whether a company-specific initiative, product, or value is referenced. The AC requires content depth beyond name repetition. |
| M6-AC3 | Body paragraphs cite specific, named achievements — not generic claims                                 | 🔲     | `_validateCoverLetter()` performs 4 checks: salutation, company name count, word count, CTA closing. No check that body text contains a named achievement or specific quantified claim. |
| M6-AC4 | Closing paragraph ends with a direct interview request                                                 | ✅     | `cover-letter.js:538–543` `ctaCheck`: tests for CTA phrases ("interview", "discuss", "speak", "meet", "call", "connect"); warns if absent. |
| M6-AC5 | Length within role-appropriate range: 300–400w standard; 400–500w executive; 500–600w research/academic | ⚠️     | `cover-letter.js:518` `wcStatus = words >= 250 && words <= 400 ? 'pass' : ...` — fixed range regardless of role type. Role-differentiated thresholds not implemented. |
| M6-AC6 | Tone setting applied based on inferred employer type                                                   | ⚠️     | `cover-letter.js:20–28` defines `COVER_LETTER_TONES` (startup/tech, pharma/biotech, academia, financial, leadership/exec). Tone is a manual user dropdown. No auto-inference from `job_analysis.domain` or `employer_type` fields. |

**Failure modes addressed:** CTA closing check prevents passive "I look forward to hearing from you" closings going unwarned. Word count check catches extreme length outliers.

**Failure modes not addressed:** Company-specific content depth not checked (GAP-HM-07). Named achievement validation absent (GAP-HM-03 equivalent). Role-differentiated word count ranges not implemented (GAP-HM-04). Tone not auto-inferred from job analysis (GAP-HM-03).

---

## US-M7: Selected Publications — Credibility and Relevance Signalling

| AC     | Criterion                                                                                              | Status | Evidence |
|--------|--------------------------------------------------------------------------------------------------------|--------|----------|
| M7-AC1 | Section heading "Selected Publications" when subset shown; "Publications" when all shown               | ✅     | `templates/cv-template.html:638–642` conditional: `total_publications_count > (publications \| length)` → "Selected Publications"; else → "Publications". `total_publications_count` = full bib count (`cv_orchestrator.py:225`); `publications\|length` = displayed count. |
| M7-AC2 | Publication count never shown in generated CV or ATS document (no "(4 of 52)" suffix)                 | ✅     | No count-suffix injection in template (`cv-template.html:636–658`) or ATS plain-text section (`cv-template.html:731`). |
| M7-AC3 | Each entry displays: authors (first-author identifiable), title, venue, year                          | ⚠️     | `cv-template.html:648` renders `pub.formatted_citation` (APA format via `bibtex_parser`); `cv-template.html:649–651` adds ★ badge when `pub.is_first_author`. APA format includes all 4 required fields, but places year second (Authors. (Year). Title. Journal.) rather than last as story specifies for scan priority. First-author identification is clear via ★ badge. |
| M7-AC4 | Total entry count matches applicant's confirmed selection — not full `.bib` count                      | ✅     | `cv_orchestrator.py` `_select_content_hybrid()` honoring `accepted_publications` from session state. Count in CV output = accepted count, not total bib count. |
| M7-AC5 | Selected Publications is always the final section of the CV                                            | ✅     | `templates/cv-template.html:636–658` publications section rendered after all experience sections in main content column. |
| M7-AC6 | No entry appears without a venue — entries missing `journal`/`booktitle` flagged during Customisation  | ✅     | `cv_orchestrator.py:627` sets `venue_warning`; `llm_client.py:1563–1564` sets `venue_warning` in LLM ranking path; `review_routes.py:1358–1364` and `1410–1416` set `venue_warning` in fallback and not-recommended paths. `publications-review.js:138` renders ⚠ icon next to citation during Customisation step. `cv-template.html:652–653` renders ⚠ on generated CV output. |

**Failure modes addressed:** "Publications" with 25 entries prevented by user acceptance workflow + display count matching accepted count. First-author / co-author distinction made explicit via ★ badge. Venue-less entries flagged during Customisation (not just at render time).

**Failure modes not addressed:** APA citation format places year second rather than in last (scan priority) position — minor formatting divergence from spec.

---

## Gap Register

| ID        | Description                                                                                         | Priority | Status      | Evidence |
|-----------|-----------------------------------------------------------------------------------------------------|----------|-------------|----------|
| GAP-HM-01 | No minimum bullet count check — job entries with 1 bullet render silently                          | High     | 🔲 Open    | No check in `cv_orchestrator.py`, `generation_routes.py`, or frontend validators. |
| GAP-HM-02 | Page count warning not connected to Download tab                                                    | High     | ✅ Resolved | `download-tab.js:76–92` `_renderValidationSummary()` fires amber badge when page count outside 2–3 range. Resolved in current codebase. |
| GAP-HM-03 | Cover letter tone not auto-inferred from job analysis domain/employer type                          | Medium   | ⚠️ Open    | `cover-letter.js:20–28` COVER_LETTER_TONES defined; tone is manual dropdown only. `job_analysis.domain` not used for inference. |
| GAP-HM-04 | Cover letter word count uses fixed 250–400 instead of role-differentiated ranges                    | Medium   | ⚠️ Open    | `cover-letter.js:518` hardcoded `words >= 250 && words <= 400`. Story requires 300–400w standard / 400–500w executive / 500–600w research. |
| GAP-HM-05 | Venue-missing publication warning not shown during Customisation step                               | High     | ✅ Resolved | `publications-review.js:138` renders ⚠ icon during Customisation; `cv_orchestrator.py:627` + `llm_client.py:1563` + `review_routes.py:1358,1410` all set `venue_warning`. Resolved in current codebase. |
| GAP-HM-06 | Page count warning fires only at Download step; no warning during Layout Review where user can still adjust | Medium | ⚠️ Open | `web/layout-instruction.js:514,621,663` stores `pageWarning` flag in state but never renders a warning banner in the layout review tab UI. `web/ats-refinement.js:43–56` shows text label only ("Length N pages"), no amber/warning styling. |
| GAP-HM-07 | Cover letter Rule 2 checks only company name mention count — not whether a company-specific initiative, product, or value is referenced | Medium | 🔲 Open | `cover-letter.js` `_validateCoverLetter()` Rule 2: `mentions >= 2 ? 'pass' : 'warn'`. AC requires "at least one company-specific reference (recent initiative, product, or value) if extractable from job posting." |
| GAP-HM-08 | Cover letter body paragraph named-achievement check absent                                          | Medium   | 🔲 Open    | `_validateCoverLetter()` has no check for a named achievement or specific quantified claim in the body text. AC3 requires body paragraphs cite specific, named achievements. |
| GAP-HM-09 | No bullet line-length or word-count check — paragraph-length bullets render without warning         | Low      | 🔲 Open    | No check in `cv_orchestrator.py` or frontend. Paragraph bullets are a hiring manager credibility flag per story Failure Modes. |
| GAP-HM-10 | Skill category ordering not auto-derived from job analysis keywords                                  | Low      | ⚠️ Open    | `cv_orchestrator.py:459–465` uses hardcoded priority orders by CV variant. `job_analysis.required_skills` and `ats_keywords` not used to reorder categories. User can manually reorder via `skills-review.js`. |

