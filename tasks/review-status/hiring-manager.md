<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Hiring Manager Review Status

**Last Updated:** 2026-06-29 10:45 ET

**Executive Summary:** The application provides a well-structured workflow for producing tailored CV and cover letter materials. Against the 7 US-M story criteria, implementation is strong for most of the application-facing concerns (workflow, publications logic, cover letter UI) but shows meaningful gaps in three areas: (1) the cover letter word-count target is narrower than the story specifies (250–400 words in code vs. 300–600 depending on role type in the story) and tone is never auto-inferred from the employer; (2) the validation chain for "Publications included only when role-relevant" is absent — publications are always selected if they exist; (3) the ATS validation / action-verb surfacing is log-only and never surfaced in the UI as a user-visible warning.

---

## Application Evaluation

### US-M1: First Impression — Page 1 Layout

**As-built assessment:** This story tests the generated HTML/PDF output, not the application UI directly. The template is the source of truth.

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Name is largest text element | ✅ Pass | `templates/cv-template.html:211` — `.name { font-size: 2.2rem; font-weight: 700; }` — largest heading in the file |
| Serif font for name, sans-serif body | ✅ Pass | `templates/cv-template.html:212` — Merriweather for `.name`; Inter for `.job-title` and all body text |
| Summary role-specific: job title, years, differentiator | ⚠️ Partial | `cv_orchestrator.py:195-197` — fallback summary is generic ("Experienced professional applying for..."). Primary path selects from `master_data`, but no code enforces that the summary contains job title or years-of-experience tokens. |
| Page 1 layout: 2-column sidebar left / main right | ✅ Pass | `templates/cv-template.html:379-423` — `#cv-body .left-col { float: left; width: 32%; }` + gradient faux-column technique |
| Sidebar background differentiated | ✅ Pass | `templates/cv-template.html:389-396` — `background-image: linear-gradient(to right, #eef2f5 calc(32% - 1px), …)` |
| Page 1 overflow prevention | ⚠️ Partial | No explicit "Page 1 must be exactly one printed page" enforcement. The page-count check (`cv_orchestrator.py:5011-5024`) fires post-generation for the ATS report, not as a pre-generation guard. There is no layout-preview overflow warning shown to the user before generating final files. |
| Page 1 no large blank whitespace | ⚠️ Partial | No automated whitespace-balance check. Layout review is LLM-driven freeform (Phase 12); no structured check for "bottom of either column ends >2 cm from page edge". |
| Contact info scannable | ✅ Pass | `templates/cv-template.html` uses Font Awesome icon-prefixed contact fields in the left sidebar |

**Summary:** US-M1 = ⚠️ Partial — Typography and layout structure are correct; summary specificity enforcement and page-1 overflow/whitespace checks are missing from the generation pipeline.

---

### US-M2: Work Experience — Credibility and Relevance

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Every bullet starts with strong action verb | ⚠️ Partial | `cv_orchestrator.py:3954-3971` — `_enhance_achievement_for_ats()` checks and logs a warning when a bullet does not start with a strong verb, but **never surfaces this warning to the user in the UI**. The check is a `logger.warning` only. |
| Verb starts with "Responsible for" caught | ✅ Pass | `cv_orchestrator.py:3992-3996` — `_WEAK_VERBS` frozenset includes `'Was responsible'`; `_WEAK_VERB_FIRST_WORDS_LOWER` catches the first word "was" |
| At least 2 bullets per job entry | 🔲 Not Implemented | No pre-generation or post-generation check enforces a minimum of 2 bullets per job entry. |
| Bullets ≤ 2 lines | 🔲 Not Implemented | `llm_client.py:1158-1185` — `check_word_count(text, max_words=30)` provides a 30-word bullet check but this is used in persuasion checks, not as a systematic pre-render pass. No line-length check. |
| Job entries not split across pages | ✅ Pass | `templates/cv-template.html:278-281` — `.job-entry { page-break-inside: avoid; }` confirmed in print CSS |
| Relevance-ordered bullets within each entry | ✅ Pass | `cv_orchestrator.py` — `achievement_orders` from `state['achievement_orders']` and bullet reorder UI (Phase 9) allow user-controlled ordering; LLM customization prompt instructs relevance-first ordering |

**Summary:** US-M2 = ⚠️ Partial — Page-break safety is implemented. Action-verb checking exists in the backend but is log-only; minimum bullet count and line-length checks are absent.

---

### US-M3: Skills Section Readability

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Skills grouped into named categories | ✅ Pass | `cv_orchestrator.py:533-595` — `_organize_skills_by_category()` → `_group_skills_by_category()` → `_sort_categories()` produces named category groups |
| Categories ordered by role relevance | ✅ Pass | `cv_orchestrator.py:555-579` — `priority_orders` dict with 'standard', 'technical', 'academic' variants; custom `category_order` from session overrides all |
| No duplicate skills | ✅ Pass | `cv_orchestrator.py:503-531` — `_deduplicate_skills()` uses canonical synonym map; merges aliases; keeps entry with more years |
| Skills section occupies ≤ 1.5 sidebar columns | ⚠️ Partial | `settings-gen-max-skills` (default 20) and `max_skills` config key limit count, but there is no CSS or layout enforcement that caps the skills section to 1.5 sidebar-columns of vertical space. Whether 20 skills overflows 1.5 columns depends on content, and no structural check exists. |

**Summary:** US-M3 = ✅ Pass with one ⚠️ item — Skills deduplication, grouping, and relevance ordering all implemented. The 1.5-column ceiling is a visual QC guideline without code enforcement.

---

### US-M4: Multi-Page Flow and Readability

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `page-break-inside: avoid` on every job entry | ✅ Pass | `templates/cv-template.html:278-281` — `.job-entry { … page-break-inside: avoid; }` |
| `break-inside: avoid` cross-browser | ✅ Pass | `templates/cv-template.html:280` — both `page-break-inside` and `break-inside` set |
| No page opens with continuation bullet from prior page | ✅ Pass | Follows from `page-break-inside: avoid` on `.job-entry` |
| Sidebar background fills every page | ✅ Pass | `templates/cv-template.html:388-401` — `box-decoration-break: clone` + `-webkit-box-decoration-break: clone` ensures sidebar gradient repeats on each print page fragment |
| Total page count 2–3 for senior candidate; warn if 1 or >3 | ✅ Pass | `cv_orchestrator.py:5011-5024` — `validate_ats_report()` checks `ideal_min=2`, `ideal_max=3`, `absolute_max=4`; emits warn/fail ATS check |
| Publications included only when relevant for role type | 🔲 Not Implemented | `cv_orchestrator.py:3416-3447` — publications are always selected when `self.publications` is non-empty (subject only to count/page cap and accept/reject decisions). No "role type" gate excludes publications for pure industry roles. The Customisation UI lets users manually reject all publications, but the system never auto-excludes them. |
| Sidebar not empty on any page with main content | ⚠️ Partial | Sidebar background fills via gradient clone, but sidebar content (skills, education, awards) is not balanced across pages by any code — if sidebar items fill only page 1, pages 2+ show an empty left column while the right column has experience content. This is a CSS/structural limitation. |
| Section headed "Selected Publications" when subset shown | ✅ Pass | `cv_orchestrator.py:4580-4582` (DOCX) and `templates/cv-template.html:691-695` (HTML) |

**Summary:** US-M4 = ⚠️ Partial — Page-break safety and page-count warning are in place. Publications are not auto-excluded for non-research roles. Sidebar content balance across pages is not actively managed.

---

### US-M5: Visual Identity and Professionalism

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Consistent colour scheme (navy primary, accent blue, muted grey) | ✅ Pass | `templates/cv-template.html` — CSS variables `--primary-color`, `--secondary-color`, `--accent-color`, `--text-muted` define a consistent palette |
| Serif/sans-serif typographic pairing | ✅ Pass | Merriweather for `.name`; Inter throughout body — `templates/cv-template.html:210-227` |
| Section titles uppercase with border-bottom | ✅ Pass | `.section-title { text-transform: uppercase; border-bottom: 1px solid #ddd; }` — `templates/cv-template.html:233-246` |
| Font Awesome icon-prefixed contact fields | ✅ Pass | `index.html:23` and template — FA 6 Free loaded; icons present in contact sidebar |
| Custom bullet colour (accent colour) | ✅ Pass | `.achievement-list li::before { color: var(--accent-color); }` — `templates/cv-template.html:332-338` |
| Fonts embedded in PDF (WeasyPrint) | ✅ Pass | WeasyPrint embeds fonts by default; `cv_orchestrator.py:1261-1295` — WeasyPrint is the secondary/fallback renderer; Chrome headless is primary |
| Sidebar background on pages 2+ | ✅ Pass | `box-decoration-break: clone` as noted in US-M4 |
| No content clipped at margins | ✅ Pass | `cv_orchestrator.py:956-960` — `page_margin` configurable; defaults to `0.5in` |
| Schema.org JSON-LD in HTML `<head>` | ✅ Pass | `cv_orchestrator.py:943` — `cv_data['json_ld_str'] = self._build_json_ld(cv_data, job_analysis)` passed into template |
| PDF vs HTML diagnostic distinction | ✅ Pass | `_convert_html_to_pdf()` (`cv_orchestrator.py:1261`) documents Chrome-first, WeasyPrint fallback; HTML is the authoritative master document |

**Summary:** US-M5 = ✅ Pass — All visual identity requirements are implemented.

---

### US-M6: Cover Letter Tone and Relevance

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Company name in paragraph 1 | ⚠️ Partial | `cover-letter.js:487-527` — client-side validator checks company name is mentioned (≥2 times for "pass"), but this is post-generation validation only; the LLM prompt at `headless_session.py:427-430` does not explicitly require "company name in paragraph 1". |
| At least one company-specific reference (initiative, product, value) | ⚠️ Partial | UI provides an optional "Company context" textarea (`cover-letter.js:130-134`) which passes `company_context` to the API. Whether the LLM actually uses it to cite a "recent initiative, product, or value" depends entirely on LLM execution — no structural enforcement in the prompt. |
| Body cites specific, named achievements | ⚠️ Partial | The LLM prompt (`headless_session.py:427-430`) passes job analysis JSON but not the candidate's approved achievements or accepted rewrites. Named achievements must come from the LLM's general context, not from the structured output of the customization phase. |
| Closing ends with a direct interview request | ⚠️ Partial | `cover-letter.js:542-555` — validator checks for CTA patterns like `/interview/i`, `/discuss/i` etc. in the last paragraph, but this is a post-generation client-side check rather than a prompt constraint. |
| Length 300–400w standard; 400–500w executive; 500–600w academic | ❌ Fail | `cover-letter.js:533-534` — the word-count target is hard-coded at **250–400 words** for all cover letters regardless of role type. The story requires role-differentiated ranges (executive: 400–500; academic: 500–600). No role-type inference adjusts the target. |
| Tone auto-applied based on inferred employer type | ❌ Fail | `cover-letter.js:19-25` — tone is a **user-selected dropdown** (Startup/Tech, Pharma/Biotech, Academia, Financial Services, Leadership/Exec). The system never auto-infers employer type from the job analysis to pre-select a tone. Story criterion: "applied based on inferred employer type". |
| No resume repetition | — N/A | Not verifiable from source alone; depends on LLM output quality. |

**Summary:** US-M6 = ❌ Fail on 2 AC items — Word-count target ignores role type; tone is not auto-inferred from employer type. Other criteria are partially implemented with post-generation validation but no prompt-level enforcement.

---

### US-M7: Selected Publications — Credibility and Relevance Signalling

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Heading "Selected Publications" when subset shown; "Publications" when all | ✅ Pass | `templates/cv-template.html:691-695` — Jinja2 conditional: `{% if template_metadata.total_publications_count and total_publications_count > (publications | length) %} Selected Publications {% else %} Publications {% endif %}` |
| Same heading logic in DOCX | ✅ Pass | `cv_orchestrator.py:4580-4582` — `heading_text = 'Selected Publications' if (total_count and total_count > len(publications)) else 'Publications'` |
| Publication count never shown in CV | ✅ Pass | No `(N of M)` suffix in either the template or the DOCX generator. `total_publications_count` is passed to template metadata but only used for the heading conditional, never rendered as text. |
| Each entry: authors, title, venue, year | ✅ Pass | `cv_orchestrator.py:860-869` — citation formatted as `{authors}. {title}. {venue} ({year}).` (fallback path); `formatted_citation` from `format_publication()` (primary path) uses APA style |
| First-author visibility | ✅ Pass | `cv_orchestrator.py:886-892` — `is_first_author` flag set by comparing owner last name to first token of authors field. `cv-template.html:708-710` renders a star marker for first-author entries |
| Entries without venue flagged to user during Customisation | ⚠️ Partial | `cv_orchestrator.py:894-896` — `venue_warning` field set on pub entry when no venue found. However, this flag is **never rendered in the Publications Review tab UI** (no evidence in `index.html` or any JS tab renderer). The flag is computed but not surfaced to the user during Customisation as required. |
| Total entry count matches user-confirmed count | ✅ Pass | `cv_orchestrator.py:3430-3447` — accepted/rejected publication decisions from `publication_decisions` dict are respected; only explicitly accepted publications from the Customisation phase are included |
| Publications always final section of CV | ✅ Pass | `templates/cv-template.html:690-714` — publications section rendered last in the `<main>` column; no section ordering override places anything after it |
| "Selected Publications" never used for full unfiltered list | ✅ Pass | Heading logic `(total_count > len(publications))` is correct: heading is "Publications" when all available entries are shown |

**Summary:** US-M7 = ⚠️ Partial — Heading logic, first-author display, count suppression, and ordering are all correct. The only gap is that the `venue_warning` flag computed at `cv_orchestrator.py:896` is never surfaced to the user in the Publications Review tab.

---

## Additional Story Gaps / Proposed Story Items

1. **GAP-CL-1 (NEW):** Cover letter word-count targets should be role-differentiated — standard: 300–400w; executive: 400–500w; research/academic: 500–600w. Current code is flat 250–400w in `cover-letter.js:534`. Add role-level detection from `job_analysis.role_level` and `job_analysis.domain` to select the appropriate range, and pass a word-count target into the LLM prompt.

2. **GAP-CL-2 (NEW):** Auto-infer cover letter tone from job analysis (`job_analysis.domain` or `job_analysis.company` industry signals) and pre-select the closest tone in the dropdown, with user override remaining available. Currently requires manual selection (`cover-letter.js:19-25`).

3. **GAP-CL-3 (NEW):** Cover letter LLM prompt at `headless_session.py:427-430` does not inject the candidate's `approved_rewrites` or `selected_achievements`, so the letter cannot cite named accomplishments from the tailored CV. The prompt should pass structured achievement data so the LLM can write body paragraphs that cite specific accomplishments by name.

4. **GAP-PUB-1 (NEW):** `venue_warning` field computed in `cv_orchestrator.py:894-896` is never shown to the user in the Publications Review tab. Add a visual warning indicator next to the publication entry in the review table so users can address missing venue metadata before generation.

5. **GAP-PUB-2 (EXISTING, US-M4):** No role-type gate for publication inclusion. When `job_analysis.domain` indicates an industry (non-research) role or `role_level` is "management", publications should be excluded by default (user must opt in). Currently always included when `self.publications` is non-empty.

6. **GAP-M1-1 (NEW):** No automated summary-specificity check. After the LLM selects or generates the professional summary, validate that it contains at least one of: the job title string (fuzzy match), a years-of-experience claim, or a named differentiator. Flag in the Summary review tab if absent.

7. **GAP-M2-1 (EXISTING, US-M2):** Action-verb check is backend-only (log). Surface as a review-tab warning in the "Experience Bullets" tab with a count of flagged bullets and the ability to navigate to the offending entry.

8. **GAP-M2-2 (NEW):** Minimum 2 bullets per job entry not enforced. Add a pre-generation check in `build_render_ready_content()` and surface a warning if any included job has fewer than 2 visible achievements.

---

## Terminology / Label Clarity Audit

| Location | Current Label | Issue | Severity |
|----------|--------------|-------|----------|
| Workflow nav bar `index.html:123` | `⚙️ Customise` | Ambiguous for a non-technical user — does not communicate that this is content selection (experience, skills, summary). "Tailor Content" would be clearer. | Medium |
| Workflow nav bar `index.html:133` | `⬇️ Download` | Mismatches the corresponding tab label "File Review" (`index.html:218`). Users see two different names for the same phase. Standardize to one name. | Medium |
| Tab bar `index.html:204` and `index.html:211` | `📊 Experiences` and `📊 ATS Score` | Two tabs share the chart-bar emoji, causing visual ambiguity on quick scan. Use distinct icons. | Low |
| Cover letter `cover-letter.js:19-25` | Tone dropdown, no auto-suggestion | Tone must be manually selected without any hint from the job analysis. A "Suggested: Pharma/Biotech (based on job description)" indication would reduce user effort. | Medium |
| LLM status badge `index.html:55` | `Not ready` | Vague — does not distinguish "API key missing", "server starting", or "model loading". | Low |

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, web/cover-letter.js, templates/cv-template.html, scripts/utils/headless_session.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-M1 | 5 | 3 | 0 | 0 | 0 |
| US-M2 | 3 | 1 | 0 | 2 | 0 |
| US-M3 | 4 | 1 | 0 | 0 | 0 |
| US-M4 | 6 | 2 | 0 | 1 | 0 |
| US-M5 | 10 | 0 | 0 | 0 | 0 |
| US-M6 | 0 | 4 | 2 | 0 | 1 |
| US-M7 | 7 | 1 | 0 | 0 | 0 |

**Key evidence references:**

- `templates/cv-template.html:278-281` — `.job-entry { page-break-inside: avoid; }` (US-M2, US-M4)
- `templates/cv-template.html:388-401` — sidebar faux-column gradient with `box-decoration-break: clone` (US-M4, US-M5)
- `templates/cv-template.html:691-695` — "Selected Publications" vs "Publications" heading conditional (US-M7)
- `templates/cv-template.html:708-710` — first-author star marker (US-M7)
- `cv_orchestrator.py:3954-3971` — `_enhance_achievement_for_ats()`: action-verb check is log-only, never surfaced in UI (US-M2)
- `cv_orchestrator.py:4580-4582` — DOCX publications heading logic mirrors template (US-M7)
- `cv_orchestrator.py:894-896` — `venue_warning` computed but never rendered in UI (US-M7)
- `cv_orchestrator.py:5011-5024` — page-count check in `validate_ats_report()` warns at 1 or >4 pages (US-M4)
- `headless_session.py:413-434` — cover letter LLM prompt: job analysis JSON injected but no candidate achievements, no word-count constraint, no employer-type inference (US-M6)
- `cover-letter.js:533-534` — word-count validator hard-coded to 250–400 words for all roles (US-M6)
- `cover-letter.js:19-25` — tone is a manual dropdown, never auto-inferred (US-M6)
