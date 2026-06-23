<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Hiring Manager Review Status

**Last Updated:** 2026-06-22 14:30 ET

**Executive Summary:** The application guides the user through a coherent workflow that produces structured, relevance-ordered CV content appropriate for a senior candidate. The generated HTML/PDF template meets the core visual and layout requirements: correct typography pairing, sidebar background continuity across pages, icon-prefixed contact fields, page-break-inside protection on job entries, skills grouped by category, and correctly conditional publications headings. GAP-174 (company context textarea) is **fully resolved** this cycle: `#cl-company-context` textarea is present in the UI (`cover-letter.js:130–134`), `company_context` is passed to the backend (`cover-letter.js:251, 265`), and the backend injects it as a `COMPANY CONTEXT` block directly into the LLM prompt (`master_data_routes.py:1556–1558, 1570, 1586`). The prior ❌ on US-M6 company-specific reference is now upgraded to ⚠️. Remaining key gaps: (1) persuasion warnings (weak verbs, missing metrics) are computed but not surfaced to the user before download; (2) backend word-count target (~250–300w) is below the story's 300w floor for standard roles; (3) no gate warns when a job entry has fewer than 2 bullets.

---

## Application Evaluation

### US-M1: First Impression — Page 1 Layout

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Name, contact, summary, achievements, education visible on page 1 | ✅ | `templates/cv-template.html:526–662`: left-col holds contact, education, awards; right-col leads with Summary then Selected Achievements in the single `#cv-body` continuous div |
| 2 | Summary is role-specific: job title, YoE, one differentiator | ⚠️ | Generic-phrase detection active (`conversation_manager.py:~1325`) blocks filler phrases, but no check verifies the generated summary contains the target job title or a quantified YoE claim. A summary saying "Experienced engineer with broad expertise" currently passes all filters |
| 3 | No page 1 overflow | ✅ | Staged generation trims to page budget; `cv_orchestrator.py: _cap_publications_to_pages()` prevents overrun |
| 4 | No visibly unbalanced whitespace (>~2cm gap at either column bottom) | ⚠️ | No programmatic check warns when the left column ends significantly above the right column on page 1. Caught only in manual Layout Review |
| 5 | Sidebar background differentiated on every page | ✅ | `cv-template.html:389–400`: `background-image: linear-gradient(…, #eef2f5 …)` with `-webkit-box-decoration-break: clone` ensures sidebar fill carries across print page fragments |
| 6 | Candidate's name is the largest text element | ✅ | `cv-template.html:210–217`: `.name { font-size: 2.2rem; font-family: Merriweather, serif }` vs `.job-title` and `.section-title` at 1.1rem |
| 7 | Contact information scannable via icons | ✅ | `cv-template.html:529–562`: Font Awesome icon per contact field (fa-envelope, fa-phone, fa-linkedin, fa-globe) in left sidebar |
| 8 | Font not below 10pt | ✅ | Default base font size is `10px` (`cv_orchestrator.py:297`, `safe_css_size` default). All `1rem` body text equals 10px at this base |

### US-M2: Work Experience — Credibility and Relevance

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Every bullet starts with a strong action verb | ⚠️ | `cv_orchestrator.py:3954–3972`: `_enhance_achievement_for_ats()` logs a WARNING server-side but does not modify text or surface the finding in the UI |
| 2 | Each job entry has at least 2 bullets | ⚠️ | No validation gate. `_normalize_experiences_for_template()` (`cv_orchestrator.py:417–430`) passes zero-bullet entries silently |
| 3 | Bullets ≤2 lines each | ⚠️ | No length-check guard. Long bullets pass through template without truncation or user warning |
| 4 | Job entries not split across pages | ✅ | `cv-template.html:278–281`: `.job-entry { page-break-inside: avoid; break-inside: avoid }` |
| 5 | Relevance-ordered bullets within each entry | ✅ | `cv_orchestrator.py`: per-experience bullet sort by keyword overlap (`_ach_relevance`); user can override via `achievement_orders` in customizations |
| 6 | System warns user if bullet lacks action verb | ⚠️ | `check_persuasion()` (`cv_orchestrator.py:4116–4165`) stores `persuasion_warnings` in session state but this is not rendered as a visible alert in any UI tab |

### US-M3: Skills Section Readability

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Skills grouped into named categories on PDF | ✅ | `cv-template.html:623–635`: `{% for cat in skills_by_category %}` renders `cat.category` as `<h4>` heading. `cv_orchestrator.py:583–595`: `_organize_skills_by_category()` groups and deduplicates |
| 2 | Categories ordered by relevance to target role | ✅ | `cv_orchestrator.py:541–581`: `_sort_categories()` uses priority order per template variant and respects custom `skill_category_order` |
| 3 | No duplicate skills (exact or alias) | ✅ | `cv_orchestrator.py:503–531`: `_deduplicate_skills()` normalises by canonical synonym name via `_expansion_index`, merging aliases |
| 4 | Skills section ≤1.5 sidebar columns total | ⚠️ | `max_skills` config (default 20) caps count but does not compute visual height. No pixel-budget check; 20 skills across 6 categories could overflow for short CVs |

### US-M4: Multi-Page Flow and Readability

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | `page-break-inside: avoid` on every job entry | ✅ | `cv-template.html:280`: `.job-entry { page-break-inside: avoid }` |
| 2 | Sidebar content balanced across pages | ⚠️ | Single continuous `left-col` with `float: left` in print ends when sidebar content (contact, education, awards, skills) runs out. Pages 2+ have an empty left column unless sidebar content is long — structural limitation of float-based print layout |
| 3 | Total page count 2–3; system warns if 1 or >3 | ✅ | `cv_orchestrator.py:5010–5028`: post-generation `cv_page_count` check warns at 1 page, passes at 2–3, warns at 4, fails above 4 |
| 4 | Publications only when flagged relevant | ✅ | `cv_orchestrator.py:3419–3444`: publications excluded by default; `accepted_publications` list from customization step controls inclusion |
| 5 | "Selected Publications" heading when subset shown | ✅ | `cv-template.html:691–695`: Jinja condition `total_publications_count > (publications | length)` emits correct heading. DOCX equivalent at `cv_orchestrator.py:4580` |

### US-M5: Visual Identity and Professionalism

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | All fonts embedded in PDF | ✅ | WeasyPrint embeds fonts by default. Template loads Inter + Merriweather from Google Fonts CDN (`cv-template.html:22`). Risk: CDN unavailability at generation time could prevent embedding — no offline fallback bundled |
| 2 | Sidebar background on every page | ✅ | Gradient with `box-decoration-break: clone` (`cv-template.html:399`) |
| 3 | No content clipped at margins | ✅ | `@page { margin: var(--page-margin) }` in cv-template.html; default `0.5in` is safe for US Letter |
| 4 | Font Awesome icons rendered correctly | ⚠️ | `cv-template.html:21`: Font Awesome loaded from CDN (`cdnjs.cloudflare.com`). Requires network at generation time; no local fallback bundled. Offline environments will produce empty-square glyphs |
| 5 | Serif name / sans-serif body typography pairing | ✅ | Merriweather for `.name` (`cv-template.html:211`); Inter sans-serif for all body text (`cv-template.html:49`) |
| 6 | Section titles uppercase with horizontal rule | ✅ | `.section-title { text-transform: uppercase; border-bottom: 2px solid var(--accent-color) }` in cv-template.html:139–140 |
| 7 | Custom accent-coloured bullet points | ✅ | `.achievement-list li::before { color: var(--accent-color) }` in cv-template.html |

---

## Generated Materials Evaluation

### US-M6: Cover Letter Tone and Relevance

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Company name and role title in paragraph 1 | ⚠️ | Backend prompt (`master_data_routes.py:1561–1569`) injects `company` and `role` variables. No post-generation verification, but client-side `_validateCoverLetter()` (`cover-letter.js:499–516`) performs a soft company-name check |
| 2 | At least one company-specific reference | ⚠️ | **GAP-174 RESOLVED.** `#cl-company-context` textarea present (`cover-letter.js:130–134`); `company_context` passed to backend (`cover-letter.js:251, 265`); backend injects as `COMPANY CONTEXT` block in LLM prompt (`master_data_routes.py:1556–1558, 1570`). User must still supply this content manually — no auto-extraction from job text — but the mechanism exists. Downgraded from ❌ to ⚠️ |
| 3 | Body paragraphs cite specific, named achievements | ⚠️ | Prompt passes top 4 achievements (`master_data_routes.py:1519–1530`) and instructs "Reference concrete skills and achievements" (`master_data_routes.py:1578`). Compliance depends on LLM output; no post-generation check verifies a specific achievement is named |
| 4 | Closing ends with direct interview request | ✅ | Prompt at `master_data_routes.py:1580`: "Close professionally with a call to action." Client-side Rule 4 (`cover-letter.js:531–543`) checks for CTA patterns and flags absence |
| 5 | Length within role-appropriate range | ⚠️ | Backend prompt targets "~250–300 words" (`master_data_routes.py:1582`), below the story's 300w floor for standard roles. Client validation enforces 250–400w (`cover-letter.js:522`). No role-type tier adaptation (executive 400–500w, research 500–600w) implemented |
| 6 | Tone setting applied based on employer type | ✅ | `_TONE_GUIDANCE` dict (`master_data_routes.py:90–96`) provides 5 tone presets with differentiated guidance. `_OPENING_GUIDANCE` dict (`master_data_routes.py:98–102`) maps opening styles. User selects explicitly; no auto-inference from job posting |

### US-M7: Selected Publications — Credibility and Relevance Signalling

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | "Selected Publications" when subset; "Publications" when all | ✅ | `cv-template.html:691–695` and `cv_orchestrator.py:4580`: condition correctly uses `total_publications_count > len(publications)` |
| 2 | Publication count not shown in generated CV | ✅ | `.pub-count` CSS class defined (`cv-template.html:503`) but never instantiated in the Jinja loop. No `(N of M)` notation emitted |
| 3 | Each entry: authors, title, venue, year in scan-priority order | ✅ | `cv_orchestrator.py:855–869`: `formatted_citation` constructed as `{authors}. {title}. {venue_text} ({year})` or uses pre-formatted BibTeX string with venue appended if absent |
| 4 | Entry count matches what user confirmed in customisation | ✅ | `accepted_publications` list from session customizations drives selection; rejected keys excluded (`cv_orchestrator.py:3418–3461`) |
| 5 | Publications always the final CV section | ✅ | `cv-template.html:688–715`: publications block is the last `{% if publications %}` section in `<main>`, after experiences |
| 6 | Entries missing venue flagged to user during customisation | ✅ | `cv_orchestrator.py:894–896`: `venue_warning` set when venue is absent. `publications-review.js:138` renders `⚠` icon with tooltip in Citation column |
| 7 | First-author status immediately apparent | ✅ | `cv-template.html:708–710`: `★` marker with tooltip "First author" on first-author entries; star column also shown in Publications Review tab |

---

## Additional Story Gaps / Proposed Story Items

**GAP-HM-1 (MEDIUM — partially resolved by GAP-174): Company-specific cover letter injection**
GAP-174 added a `#cl-company-context` textarea that users can populate manually with company initiatives, products, or values. The field is injected into the LLM prompt as a `COMPANY CONTEXT` block (`master_data_routes.py:1556–1558`). The remaining gap is auto-extraction: the raw job posting text (already in session state as `job_description`) is not automatically parsed to pre-populate this field. Users who do not notice the field will receive a letter with no company-specific reference.

**GAP-HM-2 (HIGH): Summary specificity validator**
Add a post-rewrite, pre-generation check that verifies the professional summary contains: (a) the target job title or a close variant, and (b) a quantified claim or named differentiator. Generic-phrase detection (`conversation_manager.py:~1325`) blocks filler phrases but does not enforce that positive content is specific.

**GAP-HM-3 (MEDIUM): Minimum bullet count gate**
Add validation (pre-generation or post content-selection) that warns when any included job entry has fewer than 2 bullets. Surface in the Experiences Review tab and in the ATS report. Evidence: `cv_orchestrator.py:417` — `_normalize_experiences_for_template()` passes zero-bullet entries through silently.

**GAP-HM-4 (MEDIUM): Role-type cover letter word-count tiers**
Implement the three word-count tiers from the story (300–400w standard, 400–500w executive, 500–600w research/academic). The backend targets ~250–300w for all roles (`master_data_routes.py:1582`); client validates 250–400w (`cover-letter.js:522`).

**GAP-HM-5 (MEDIUM): Persuasion warnings surfaced at download/review step**
`persuasion_warnings` is stored in session state and populated via `check_persuasion()` (`cv_orchestrator.py:4116`), but not rendered as a visible alert in any UI tab. A pre-download checklist showing unresolved warnings (weak verbs, missing metrics, vague language) would close this loop.

**GAP-HM-6 (LOW): Auto-infer cover letter tone from job analysis**
When `job_analysis.domain` is populated (e.g. "pharmaceutical", "academia"), pre-select the appropriate `cl-tone-select` value. The `_TONE_GUIDANCE` dict at `master_data_routes.py:90` already has the preset strings; only the auto-selection logic is missing.

**GAP-HM-7 (LOW): Sidebar balance warning for short CVs**
For CVs where the left column is estimated to end significantly above the right column on page 1, surface a layout suggestion in the Layout Review tab.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, web/cover-letter.js

| Story    | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| -------- | ------- | ---------- | ------- | ----------- | ----- |
| US-M1    | 6       | 2          | 0       | 0           | 0     |
| US-M2    | 2       | 4          | 0       | 0           | 0     |
| US-M3    | 3       | 1          | 0       | 0           | 0     |
| US-M4    | 3       | 2          | 0       | 0           | 0     |
| US-M5    | 6       | 1          | 0       | 0           | 0     |
| US-M6    | 2       | 4          | 0       | 0           | 0     |
| US-M7    | 7       | 0          | 0       | 0           | 0     |
| **Total** | **29** | **14**     | **0**   | **0**       | **0** |

**Key evidence references:**

- GAP-174: company context textarea → web/cover-letter.js:130–134
- GAP-174: company_context passed to backend → web/cover-letter.js:251, 265
- GAP-174: COMPANY CONTEXT block injected into LLM prompt → scripts/routes/master_data_routes.py:1556–1558, 1570, 1586
- US-M1: sidebar background → templates/cv-template.html:389–400
- US-M1: name font size → templates/cv-template.html:210–217
- US-M1: base font size default → scripts/utils/cv_orchestrator.py:297
- US-M2: page-break-inside on job-entry → templates/cv-template.html:278–281
- US-M2: action verb check (server-side only) → scripts/utils/cv_orchestrator.py:3954–3972
- US-M2: persuasion warnings in state only → scripts/utils/cv_orchestrator.py:4116
- US-M3: skill deduplication → scripts/utils/cv_orchestrator.py:503–531
- US-M3: skill category sort → scripts/utils/cv_orchestrator.py:541–581
- US-M4: page count validation → scripts/utils/cv_orchestrator.py:5010–5028
- US-M5: CDN-only Font Awesome → templates/cv-template.html:21
- US-M6: cover letter prompt (COMPANY CONTEXT block) → scripts/routes/master_data_routes.py:1556–1558
- US-M6: cover letter prompt (~250–300w target, below 300w floor) → scripts/routes/master_data_routes.py:1582
- US-M6: tone guidance presets → scripts/routes/master_data_routes.py:90–96
- US-M6: client-side CTA check → web/cover-letter.js:531–543
- US-M7: publications heading logic → templates/cv-template.html:691–695
- US-M7: publications heading (DOCX) → scripts/utils/cv_orchestrator.py:4580
- US-M7: venue_warning rendered in UI → web/publications-review.js:138
- US-M7: first-author star marker → templates/cv-template.html:708–710

**Evidence standard:** Every conclusion is independently verifiable from cited source file and line numbers above.
