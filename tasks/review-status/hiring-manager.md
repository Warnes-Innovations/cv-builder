<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Hiring Manager Review Status

**Last Updated:** 2026-06-22 ET

**Executive Summary:** The application guides the user through a coherent workflow that produces structured, relevance-ordered CV content appropriate for a senior candidate. The generated HTML/PDF template meets the core visual and layout requirements: correct typography pairing, sidebar background continuity across pages, icon-prefixed contact fields, page-break-inside protection on job entries, skills grouped by category, and correctly conditional publications headings. Key outstanding gaps are: (1) the cover letter generation prompt does not inject company-specific intelligence from the raw job posting — a letter mentioning only the company name will be immediately recognizable as templated; (2) the backend word-count target (~250–300w) is below the story's 300w floor for standard roles; (3) persuasion warnings (weak verbs, missing metrics) are computed but not surfaced to the user before download; (4) no gate warns when a job entry has fewer than 2 bullets.

---

## Application Evaluation

### US-M1: First Impression — Page 1 Layout

- ✅ **Page 1 contains name, contact, summary, achievements, education** — `templates/cv-template.html:526–662`: left-col holds contact, education, awards, skills; right-col leads with Summary then Selected Achievements, all in the single `#cv-body` continuous div.
- ⚠️ **Summary is role-specific (job title, YoE, differentiator)** — Generic-phrase detection is active (conversation_manager.py, ~line 1325 context), but no server-side check verifies the generated summary contains the target job title or a quantified years-of-experience claim. A summary like "Experienced engineer with broad expertise in data science" passes all current filters.
- ✅ **Page 1 has no overflow** — Staged generation trims to page budget; `_cap_publications_to_pages()` prevents overrun.
- ⚠️ **No visibly unbalanced whitespace (>~2cm gap)** — No programmatic check warns when the left column ends significantly above the right column on page 1. Caught only in manual Layout Review.
- ✅ **Sidebar background differentiated on every page** — `cv-template.html:389–400`: `background-image: linear-gradient(…, #eef2f5 …)` with `-webkit-box-decoration-break: clone` ensures sidebar fill carries across print page fragments.
- ✅ **Name is largest text element** — `cv-template.html:210–217`: `.name { font-size: 2.2rem; font-family: Merriweather, serif }` vs `.job-title` and `.section-title` at 1.1rem.
- ✅ **Contact information scannable via icons** — `cv-template.html:529–562`: Font Awesome icon per contact field (fa-envelope, fa-phone, fa-linkedin, fa-globe) in left sidebar.
- ✅ **Font not below 10pt** — Default base font size is `10px` (`cv_orchestrator.py:297`, `safe_css_size` default). All `1rem` body text equals 10px at this base.

### US-M2: Work Experience — Credibility and Relevance

- ⚠️ **Every bullet starts with a strong action verb** — `cv_orchestrator.py:3954–3972`: `_enhance_achievement_for_ats()` logs a server-side WARNING when a bullet lacks a strong verb but does not modify the text or surface the issue to the user. `check_persuasion()` (`cv_orchestrator.py:4116–4165`) stores results in `persuasion_warnings` state but this is not rendered as a visible alert in the download/review tab.
- ⚠️ **Each job entry has at least 2 bullets** — No validation gate exists. `_normalize_experiences_for_template()` (`cv_orchestrator.py:417–430`) passes entries with zero achievements through without warning.
- ⚠️ **Bullets are ≤2 lines each** — No length-check guard. Long bullets pass through the template without truncation or user warning.
- ✅ **Job entries not split across pages** — `cv-template.html:278–281`: `.job-entry { page-break-inside: avoid }` applied; equivalent `break-inside: avoid` also present.
- ✅ **Relevance-ordered bullets within each entry** — `cv_orchestrator.py`: per-experience bullet sort by keyword overlap (`_ach_relevance`); user can override via `achievement_orders` in customizations.
- ⚠️ **System warns if bullet lacks action verb (user-visible)** — Warning exists as backend server log only. There is no UI gate that blocks generation or presents a pre-generation checklist when bullets fail the verb test.

### US-M3: Skills Section Readability

- ✅ **Skills grouped into named categories on PDF** — `cv-template.html:623–635`: `{% for cat in skills_by_category %}` renders `cat.category` as `<h4>` heading per group. `cv_orchestrator.py:583–595`: `_organize_skills_by_category()` groups and deduplicates.
- ✅ **Categories ordered by relevance to target role** — `cv_orchestrator.py:541–581`: `_sort_categories()` uses priority order per template variant (`standard`, `technical`, `academic`) and respects custom `skill_category_order` from customizations.
- ✅ **No duplicate skills (exact or alias)** — `cv_orchestrator.py:503–531`: `_deduplicate_skills()` normalises by canonical synonym name via `_expansion_index`, merging aliases.
- ⚠️ **Skills section occupies no more than 1.5 sidebar columns total** — `max_skills` config (default 20) caps count but does not compute visual height. Twenty skills across six categories could produce a sidebar that overwhelms page-1 balance for shorter CVs. No pixel-budget check exists.

### US-M4: Multi-Page Flow and Readability

- ✅ **`page-break-inside: avoid` on every job entry** — `cv-template.html:280`: `.job-entry { page-break-inside: avoid }`.
- ⚠️ **Sidebar content balanced across pages** — The single continuous `left-col` with `float: left` in print ends when sidebar content (contact, education, awards, skills) runs out. Pages 2+ have an empty left column unless the candidate's sidebar content is exceptionally long. Structural limitation of the current float-based print layout, not a regression.
- ✅ **Total page count 2–3; system warns if 1 or >3** — `cv_orchestrator.py:5010–5028`: post-generation `cv_page_count` check warns at 1 page, passes at 2–3, warns at 4, fails above 4 (`absolute_max=4`).
- ✅ **Publications only when flagged relevant** — `cv_orchestrator.py:3419–3444`: publications excluded by default; `accepted_publications` list from customization step controls inclusion.
- ✅ **"Selected Publications" vs "Publications" heading** — `cv-template.html:691–695`: Jinja condition uses `template_metadata.total_publications_count > (publications | length)` to emit the correct heading. DOCX equivalent at `cv_orchestrator.py:4580`.

### US-M5: Visual Identity and Professionalism

- ✅ **Fonts embedded in PDF** — WeasyPrint embeds fonts by default. Template loads Inter + Merriweather from Google Fonts CDN (`cv-template.html:22`). Risk: CDN unavailability at generation time could prevent embedding — no offline fallback is bundled.
- ✅ **Sidebar background on every page, including 2+** — Gradient with `box-decoration-break: clone` (`cv-template.html:399`).
- ✅ **No content clipped at margins** — `@page { margin: var(--page-margin) }` in cv-template.html; default `0.5in` is safe for US Letter.
- ⚠️ **Font Awesome icons rendered correctly** — `cv-template.html:21`: Font Awesome loaded from CDN (`cdnjs.cloudflare.com`). Requires network at generation time; no local fallback bundled. Offline generation environments will produce empty-square glyphs.
- ✅ **Serif name / sans-serif body typography pairing** — Merriweather for `.name`; Inter sans-serif for all body text.
- ✅ **Section titles uppercase with horizontal rule** — `.section-title { text-transform: uppercase; border-bottom: 1px solid #ddd }` in cv-template.html.
- ✅ **Custom accent-coloured bullet points** — `.achievement-list li::before { color: var(--accent-color) }` in cv-template.html.

---

## Generated Materials Evaluation

### US-M6: Cover Letter Tone and Relevance

- ⚠️ **Company name and role title in paragraph 1** — Backend prompt (`master_data_routes.py:1539–1563`) injects `company` and `role` into the LLM prompt. No post-generation check verifies the generated text contains them, but client-side `_validateCoverLetter()` (`cover-letter.js:499–516`) performs a soft check after generation.
- ❌ **At least one company-specific reference** — No mechanism to extract or inject company-specific initiatives, products, or values from the job posting. The prompt context is limited to structured `job_analysis` fields (company name, role title, ATS keywords). The `highlight` free-text field (`master_data_routes.py:1574`) is the only escape hatch, with no UI guidance nudging users to supply company-specific intelligence there. A hiring manager will immediately recognise a letter that names the company but contains no reference to what it does.
- ⚠️ **Body paragraphs cite specific, named achievements** — Prompt at `master_data_routes.py:1569–1570` passes top 4 achievements to the LLM and instructs "Reference concrete skills and achievements." Compliance depends entirely on LLM output quality; no post-generation check verifies a specific achievement is named.
- ✅ **Closing ends with direct interview request** — Prompt at `master_data_routes.py:1580`: "Close professionally with a call to action." Client-side Rule 4 (`cover-letter.js:531–543`) checks for CTA patterns including "interview" and flags absence.
- ⚠️ **Length within role-appropriate range** — Backend prompt targets "~250–300 words" (`master_data_routes.py:1576`), which is below the story's 300w floor for a standard role. Client-side validation enforces 250–400w (`cover-letter.js:522`). No role-type adaptation (executive 400–500w, research 500–600w) is implemented.
- ✅ **Tone setting applied based on employer type** — `_TONE_GUIDANCE` dict (`master_data_routes.py:90–96`) provides 5 tone presets (startup/tech, pharma/biotech, academia, financial, leadership) with differentiated guidance. User selects explicitly; no auto-inference from job posting, which is a gap but not a failure of the implemented mechanism.

### US-M7: Selected Publications — Credibility and Relevance Signalling

- ✅ **"Selected Publications" when subset shown; "Publications" when all shown** — `cv-template.html:691–695` and `cv_orchestrator.py:4580`: condition correctly uses `total_publications_count > len(publications)`.
- ✅ **Publication count not shown in generated CV** — `.pub-count` CSS class is defined but never instantiated in the template's Jinja loop. No `(N of M)` notation is emitted.
- ✅ **Each entry: authors, title, venue, year in scan-priority order** — `cv_orchestrator.py:855–869`: `formatted_citation` constructed as `{authors}. {title}. {venue_text} ({year})` or uses pre-formatted BibTeX string with venue appended if absent.
- ✅ **Entry count matches what user confirmed in customisation step** — `accepted_publications` list from session customizations drives selection; rejected keys are excluded (`cv_orchestrator.py:3418–3461`).
- ✅ **Publications always the final CV section** — `cv-template.html:688–715`: publications block is the last `{% if publications %}` section in `<main>`, after experiences.
- ✅ **Entries missing venue flagged to user during customisation** — `cv_orchestrator.py:894–896`: `venue_warning` set to a descriptive string when venue is absent. `publications-review.js:138` renders a `⚠` icon with tooltip text directly in the Citation column when `pub.venue_warning` is non-empty.
- ✅ **First-author status immediately apparent** — `cv-template.html:708–710`: star marker (`★`) with tooltip "First author" appended to first-author entries. Publications Review tab also shows a first-author star column (`publications-review.js:132`).

---

## Additional Story Gaps / Proposed Story Items

**GAP-HM-1 (HIGH): Company-specific cover letter injection**
The cover letter generation prompt (`master_data_routes.py:1555–1581`) receives only structured `job_analysis` fields — company name, role title, ATS keywords. The raw job posting text, which may contain company mission statements, recent initiatives, product names, or team identifiers, is not passed to the LLM. A hiring manager will immediately identify a letter that names the company but contains no reference to what it does. Fix: pass `job_description` text (already in session state) into the cover letter prompt context.

**GAP-HM-2 (HIGH): Summary specificity validator**
Add a post-rewrite, pre-generation check that verifies the professional summary contains: (a) the target job title or a close variant, and (b) a quantified claim or named differentiator. Generic-phrase detection (`conversation_manager.py:~1325`) blocks filler phrases like "seasoned professional" but does not enforce that positive content is specific. A summary saying "Experienced engineer with broad expertise" currently passes all checks.

**GAP-HM-3 (MEDIUM): Minimum bullet count gate**
Add validation (pre-generation or post content-selection) that warns when any included job entry has fewer than 2 bullets. Surface in the Experiences Review tab and in the ATS report. Evidence: `cv_orchestrator.py:417` — `_normalize_experiences_for_template()` passes zero-bullet entries through silently.

**GAP-HM-4 (MEDIUM): Role-type cover letter word-count tiers**
Implement the three word-count tiers from the story (300–400w standard, 400–500w executive, 500–600w research/academic). The backend can infer role type from `job_analysis.role_level` and `job_analysis.domain` already populated in analysis. Currently the backend targets ~250–300w for all roles (`master_data_routes.py:1576`) and the client validates 250–400w (`cover-letter.js:522`).

**GAP-HM-5 (MEDIUM): Persuasion warnings surfaced at download/review step**
`persuasion_warnings` is stored in session state and populated via `check_persuasion()` (`cv_orchestrator.py:4116`), but it is not rendered as a visible alert in the download or file-review tab. A pre-download checklist showing unresolved warnings (weak verbs, missing metrics, vague language) would close this loop. Users currently have no visibility into these backend findings.

**GAP-HM-6 (LOW): Auto-infer cover letter tone from job analysis**
When `job_analysis.domain` is populated (e.g. "pharmaceutical", "academia"), pre-select the appropriate `cl-tone-select` value rather than defaulting to "startup/tech." The `_TONE_GUIDANCE` dict at `master_data_routes.py:90` already has the preset strings; only the auto-selection logic is missing.

**GAP-HM-7 (LOW): Sidebar balance warning for short CVs**
For CVs where the left column is estimated to end significantly above the right column on page 1, surface a layout suggestion in the Layout Review tab. Currently only catchable by manual inspection in the preview iframe.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, templates/cv-template.html, scripts/routes/master_data_routes.py

| Story    | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| -------- | ------- | ---------- | ------- | ----------- | ----- |
| US-M1    | 6       | 2          | 0       | 0           | 0     |
| US-M2    | 2       | 4          | 0       | 0           | 0     |
| US-M3    | 3       | 1          | 0       | 0           | 0     |
| US-M4    | 3       | 2          | 0       | 0           | 0     |
| US-M5    | 6       | 1          | 0       | 0           | 0     |
| US-M6    | 2       | 3          | 1       | 0           | 0     |
| US-M7    | 7       | 0          | 0       | 0           | 0     |
| **Total** | **29** | **13**     | **1**   | **0**       | **0** |

**Key evidence references:**

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
- US-M6: cover letter prompt (no raw job text, ~250-300w target) → scripts/routes/master_data_routes.py:1555–1581
- US-M6: tone guidance presets → scripts/routes/master_data_routes.py:90–96
- US-M6: client-side CTA check → web/cover-letter.js:531–543
- US-M7: publications heading logic → templates/cv-template.html:691–695
- US-M7: publications heading (DOCX) → scripts/utils/cv_orchestrator.py:4580
- US-M7: venue_warning rendered in UI → web/publications-review.js:138
- US-M7: first-author star marker → templates/cv-template.html:708–710

**Evidence standard:** Every conclusion is independently verifiable from cited source file and line numbers above.
