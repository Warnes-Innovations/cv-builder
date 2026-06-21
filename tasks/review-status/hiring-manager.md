<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Hiring Manager Persona Review
**Cycle:** 4
**Date:** 2026-06-18
**Time:** ~19:00 ET
**Reviewer:** Hiring Manager persona (technical hiring manager / department head)
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/cover-letter.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/routes/master_data_routes.py, templates/cv-template.html, scripts/utils/llm_client.py

---

## Application Evaluation

### Criteria Table

| Story | Criterion | Status | Evidence |
|-------|-----------|--------|----------|
| **US-M1** | Page 1 contains name, contact, summary, achievements, education — all visible without scrolling | ✅ | `cv-template.html:526-662`: left-col contains contact, education, awards; right-col contains summary then achievements; all within the same `#cv-body` single-page flow |
| **US-M1** | Summary is role-specific: contains job title/equivalent, years of experience, one specific differentiator | ⚠️ | Generic-phrase detection active (`llm_client.py:1037-1061`, `conversation_manager.py:1281`), but no server-side check that summary contains job title or explicit years-of-experience. Detection blocks phrases like "seasoned professional" but does not enforce specificity |
| **US-M1** | Page 1 has no overflow | ✅ | `cv_orchestrator.py:3054`: staged content selection trims to page budget; `_cap_publications_to_pages()` prevents overrun; `fillLastPage()` JS at template:827-858 extends sidebar to fill last page |
| **US-M1** | Page 1 has no visibly unbalanced whitespace (>~2cm gap) | ⚠️ | `cv-template.html:80-93`: left-col has `min-height: 279.4mm` applied via JS but `height: auto` in browser view. No programmatic check exists to warn the user if the left column ends significantly higher than the right column — purely a visual issue only caught in manual preview |
| **US-M1** | Sidebar background differentiated (light fill) on every page | ✅ | `cv-template.html:381-401` (print CSS): `background-image: linear-gradient(to right, #eef2f5 calc(32%-1px), …)` with `-webkit-box-decoration-break: clone` ensures sidebar colour carries across page fragments |
| **US-M1** | Name is largest text element | ✅ | `cv-template.html:210-217`: `.name { font-size: 2.2rem; font-family: Merriweather, serif }` — significantly larger than `.job-title` (1.1rem) or `.section-title` (1.1rem) |
| **US-M1** | Contact information scannable via icons | ✅ | `cv-template.html:526-562`: Font Awesome icon per contact field (fa-envelope, fa-phone, fa-linkedin, fa-globe) in left sidebar |
| **US-M1** | Font not below 10pt | ✅ | `cv-template.html:39`: `font-size: {{ base_font_size }}` defaults to `10px` (`safe_css_size` default in orchestrator:297). All body text is `1rem` = `10px` at this base |
| **US-M2** | Every bullet starts with a strong action verb | ⚠️ | `cv_orchestrator.py:3954-3972`: `_enhance_achievement_for_ats()` logs a WARNING when a bullet lacks a strong verb but does not modify the text or surface the warning to the user in the UI. `check_persuasion()` (line 4116) does surface warnings but only when the persuasion-check workflow step runs — not automatically surfaced at download time |
| **US-M2** | Each job entry has at least 2 bullets | ⚠️ | No validation gate exists to warn when a job entry has only 0 or 1 bullets. `_normalize_experiences_for_template()` passes through entries with zero achievements without warning |
| **US-M2** | Bullets are ≤2 lines each | ⚠️ | No length-check guard. Long bullets pass through the template without truncation or warning |
| **US-M2** | Job entries not split across pages (`page-break-inside: avoid`) | ✅ | `cv-template.html:278-281`: `.job-entry { page-break-inside: avoid }` applied. The more permissive `break-inside: auto` on `.right-col .section` does not override the more-specific `.job-entry` rule |
| **US-M2** | Relevance-ordered bullets within each entry (most relevant first) | ✅ | `cv_orchestrator.py:3209-3219`: per-experience bullet sort by keyword overlap (`_ach_relevance`); user override via `achievement_orders` in customizations |
| **US-M2** | System warns if a bullet lacks an action verb | ⚠️ | Warning exists as a backend log (`_enhance_achievement_for_ats`, line 3967) and in `check_persuasion()` results, but there is no UI gate that blocks generation or shows a pre-generation checklist item when bullets fail the verb test |
| **US-M3** | Skills grouped into named categories on PDF | ✅ | `cv-template.html:624-634`: `{% for cat in skills_by_category %}` renders `cat.category` as `<h4>` heading per group; `cv_orchestrator.py:533-595`: `_organize_skills_by_category()` groups and sorts by category |
| **US-M3** | Categories ordered by relevance to target role | ✅ | `cv_orchestrator.py:541-581`: `_sort_categories()` uses priority order (`standard`, `technical`, `academic` variants) and custom user overrides from `skill_category_order` |
| **US-M3** | No duplicate skills (exact or alias) | ✅ | `cv_orchestrator.py:503-531`: `_deduplicate_skills()` deduplicates by canonical synonym name via `_expansion_index`, merging aliases |
| **US-M3** | Skills section occupies no more than 1.5 sidebar columns total | ⚠️ | No programmatic cap on sidebar skills visual height. The `max_skills` config (default 20, line 3120) caps count but does not compute visual height. A candidate with 20 skills in 6 categories could overflow the sidebar |
| **US-M4** | `page-break-inside: avoid` on every job entry | ✅ | `cv-template.html:280`: `.job-entry { page-break-inside: avoid }` |
| **US-M4** | Sidebar content balanced across pages | ⚠️ | The single continuous left-col with float-left in print means sidebar content (contact, education, awards, skills) ends when those sections end; pages 2+ have an empty left column unless sidebar content is exceptionally long. A structural constraint, not a regression |
| **US-M4** | Total page count 2–3 for senior candidates; system warns if 1 or >3 | ✅ | `cv_orchestrator.py:5010-5028`: post-generation `cv_page_count` check warns at 1 page, passes at 2–3, warns at >3 up to absolute_max=4, fails above 4 |
| **US-M4** | Publications only when flagged relevant for the role type | ✅ | `cv_orchestrator.py:3419-3444`: publications excluded by default; `accepted_publications` list from customizations step controls inclusion |
| **US-M4** | Publications section headed "Selected Publications" (subset) vs "Publications" (full) | ✅ | `cv-template.html:691-695`: Jinja condition `{% if template_metadata.total_publications_count … > (publications | length) %}Selected Publications{% else %}Publications{% endif %}`. DOCX equivalent at `cv_orchestrator.py:4580` |
| **US-M5** | Fonts embedded in PDF | ✅ | WeasyPrint embeds fonts by default; template uses Google Fonts CDN `Inter` + `Merriweather` loaded at generation time. Headless Chrome print-to-PDF also embeds. Risk: CDN unavailability at generation time could fail embedding — no offline fallback |
| **US-M5** | Sidebar background present on every page, including pages 2+ | ✅ | `cv-template.html:388-401`: gradient with `box-decoration-break: clone` for WeasyPrint / Chrome |
| **US-M5** | No content clipped at page margins | ✅ | `@page { margin: var(--page-margin) }` at template:446-448; default `0.5in` is safe for US Letter; `safe_css_size` prevents injection |
| **US-M5** | Font Awesome icons rendered correctly | ⚠️ | Template loads Font Awesome from CDN (`cdnjs.cloudflare.com`) at line 21; requires network at generation time. No local fallback bundled |
| **US-M5** | Serif name / sans-serif body typography pairing | ✅ | `cv-template.html:211,49`: Merriweather serif for `.name`; Inter sans-serif for all body text |
| **US-M5** | Section titles uppercase with horizontal rule border | ✅ | `.section-title { text-transform: uppercase; border-bottom: 1px solid #ddd }` at template:233-245 |
| **US-M5** | Custom accent-coloured bullet points | ✅ | `.achievement-list li::before { color: var(--accent-color) }` at template:332-340 |
| **US-M6** | Company name and role title appear in paragraph 1 | ⚠️ | Backend prompt (master_data_routes.py:1555-1581) instructs the LLM to write for company/role but does not programmatically verify the generated text contains them. Client-side `_validateCoverLetter()` checks company name presence (Rule 2) but only after generation |
| **US-M6** | At least one company-specific reference (initiative, product, or value) | ❌ | No mechanism to extract or inject company-specific initiatives from the job posting. Prompt context is limited to structured job analysis fields. The `highlight` free-text field is the only escape hatch, with no UI guidance nudging the user to use it for this purpose |
| **US-M6** | Body paragraphs cite specific named achievements | ⚠️ | Prompt at line 1569-1570 passes top 4 achievements to the LLM and instructs "Reference concrete skills and achievements." Compliance depends entirely on LLM; no post-generation validation checks whether the letter actually names a specific achievement |
| **US-M6** | Closing ends with direct interview request | ✅ | Prompt at line 1580: "Close professionally with a call to action." Client-side Rule 4 (`cover-letter.js:531-543`) checks for CTA patterns including "interview" and flags if absent |
| **US-M6** | Length within role-appropriate range (300–400w standard; 400–500w exec; 500–600w research) | ⚠️ | Backend prompt targets "~250–300 words" (line 1576) — below the story's minimum of 300w. Client-side check enforces 250–400w. No role-type adaptation (exec/research tiers) is implemented |
| **US-M6** | Tone setting applied based on inferred employer type | ✅ | `_TONE_GUIDANCE` dict (master_data_routes.py:90-96) provides 5 tone presets. User selects explicitly; no auto-inference from job posting, which is a gap but not a failure of the implemented mechanism |
| **US-M7** | "Selected Publications" when subset shown; "Publications" when all shown | ✅ | `cv-template.html:691-695`, `cv_orchestrator.py:4580`: condition correctly uses `total_publications_count > len(publications)` |
| **US-M7** | Publication count not shown in CV or ATS document (`(4 of 52)` etc.) | ✅ | `.pub-count` CSS class is defined but never instantiated in the template HTML — the Jinja loop at line 698-713 does not emit it. No count notation rendered |
| **US-M7** | Each entry: authors, title, venue, year in scan-priority order | ✅ | `cv_orchestrator.py:855-869`: `formatted_citation` constructed as `{authors}. {title}. {venue_text} ({year})` or uses pre-formatted BibTeX string |
| **US-M7** | Entry count matches what user confirmed in customisation step | ✅ | `cv_orchestrator.py:3418-3461`: `accepted_publications` from session customizations drives selection; rejected keys excluded |
| **US-M7** | Publications always the final CV section | ✅ | `cv-template.html:688-715`: publications section is the last `{% if publications %}` block in `<main>`, after experiences |
| **US-M7** | Entries missing venue flagged to user during customisation | ⚠️ | `cv_orchestrator.py:894-896`: `entry['venue_warning']` is populated but neither `web/ui-core.js` nor `web/app.js` displays this field in the Publications Review tab UI. The flag is computed but never surfaced |
| **US-M7** | First-author status immediately apparent | ✅ | `cv-template.html:708-710`: star marker (`★`) appended to first-author entries with tooltip "First author" |

---

### Failure Mode Analysis by Story

**US-M1 — Page 1 Layout**
- Summary role-specificity: The system detects generic filler phrases during rewrite review, but no check enforces that the summary contains the target job title or a quantified years-of-experience claim. A summary that says "Experienced data scientist with a passion for impact" passes all current checks despite being generic.
- Whitespace balance: No automated check warns when the left column ends more than ~2cm above the right column on page 1.

**US-M2 — Work Experience**
- Minimum bullet count: No gate warns when a job entry has 0 or 1 bullets. The template renders them silently.
- Bullet length: No truncation or warning for bullets exceeding 2 lines.
- Action verb surface: `_enhance_achievement_for_ats()` correctly identifies missing strong verbs but logs to the server log only. `check_persuasion()` results are stored in `persuasion_warnings` state but not shown as a highlighted alert in the download/review tab.

**US-M3 — Skills**
- Skills section length: 20 skills across 6 categories (possible with default config) can produce a sidebar that outweighs the right-column content on page 1 for shorter CVs. No pixel-budget check exists.

**US-M4 — Multi-page flow**
- Sidebar empty on pages 2+: Structural limitation of the float-based print layout. The gradient ensures colour continuity but not content continuity. Pages 2 and 3 have an empty left column.

**US-M6 — Cover Letter**
- Company-specific reference: The biggest gap. The prompt does not extract or require company-specific context from the job posting. No UI prompt or guidance nudges users to supply this via the `highlight` field.
- Word count below story spec: Backend targets 250–300 words vs. story minimum of 300w. Executive and research tiers not implemented.
- Tone auto-inference: Not implemented; users may leave the default "startup/tech" for pharma or academic roles.

**US-M7 — Publications**
- `venue_warning` not surfaced in UI: The orchestrator correctly sets `entry['venue_warning']` but neither the Publications Review tab nor any pre-generation validation step shows this warning to the user.

---

## Generated Materials Evaluation

### CV Document Quality

**Relevance and specificity (strong):** Bullet ordering by keyword overlap (`cv_orchestrator.py:3209-3219`), relevance scoring for experience selection (`cv_orchestrator.py:3127-3168`), and skills deduplication with synonym canonicalization directly serve the hiring manager's need to see the most relevant content first.

**Quantified impact (partial):** The system flags bullets lacking metrics (Rule: `no_metric`, severity `warning` in `check_persuasion()`) but does not block generation or require the user to resolve these warnings. A generated CV may reach the hiring manager with unquantified bullets if the user skips the persuasion check step.

**Professionalism — typography and layout (strong):** Merriweather + Inter pairing is a strong, professional combination appropriate for a senior candidate. Dark navy (#2c3e50) primary with accent blue (#2980b9). Page numbers via `@page` counter are present. Section titles uppercase with border-bottom. Custom accent-coloured achievement bullets.

**First-impression (10-15 second test) (strong):** Right column leads with Summary then Selected Achievements before Work Experience — correct for a senior candidate. A hiring manager scanning page 1 sees positioning statement and 4–6 high-impact achievements before reading job history.

**ATS plaintext section (bonus):** The template includes a hidden `<section id="plaintext">` (template:726-792) with structured plain text for ATS parsers — not all CV generation tools include this.

### Cover Letter Quality

**Tone implementation (strong):** Five tone presets are implemented with distinct, differentiated guidance strings. Academia preset specifically references publications and teaching experience. Pharma preset references regulatory rigour.

**Opening flexibility (strong):** Three opening styles (formal salutation, attention hook, narrative) give meaningful control. Hook and narrative styles are clearly differentiated from generic openers.

**Critical weakness — generic company reference:** The generated letter will name the company and role but cannot include company-specific content unless the user manually enters it in the `highlight` field. The prompt does not inject job posting text or any company research. A hiring manager will immediately identify a letter that mentions the company name but contains no specific reference to what the company does.

**Word count mismatch:** Backend targets ~250–300 words; story requires 300–400w minimum. A 270-word letter that passes all client checks may read as thin to a hiring manager expecting at least 3 substantive paragraphs.

---

## Additional Story Gaps / Proposed Story Items

**GAP-HM-1 (HIGH): Summary specificity validator**
Add a server-side check (post-rewrite, pre-generation) that verifies the professional summary contains: (a) the target job title or close variant, and (b) a quantified claim or specific differentiator. The generic-phrase check catches "seasoned professional" but not "Experienced engineer with broad expertise."

**GAP-HM-2 (HIGH): Company-specific cover letter injection**
The cover letter generation prompt should receive the full job posting text so the LLM can extract company-specific signals (mission, recent product mention, team name) and weave them into the letter. This is the single largest quality gap from a hiring manager's perspective.

**GAP-HM-3 (MEDIUM): Minimum bullet count gate**
Add a validation check (pre-generation or post-content-selection) that warns when any job entry has fewer than 2 bullets. Surface in the Experiences Review tab and in the ATS report.

**GAP-HM-4 (MEDIUM): `venue_warning` displayed in Publications Review tab**
The orchestrator computes `entry['venue_warning']` but the Publications Review tab UI never renders it. Add a warning icon or alert when `venue_warning` is non-empty so the user can address missing venues before generation.

**GAP-HM-5 (MEDIUM): Role-type cover letter word-count tiers**
Implement the three word-count tiers (300–400w standard, 400–500w executive, 500–600w research/academic). The backend can infer role type from `job_analysis.role_level` and `job_analysis.domain` already populated by the analysis step.

**GAP-HM-6 (LOW): Sidebar balance warning for short CVs**
For CVs where the left column is estimated to end significantly above the right column on page 1, surface a layout suggestion in the Layout Review tab.

**GAP-HM-7 (LOW): Auto-infer cover letter tone from job analysis**
When `job_analysis.domain` is populated (e.g. "pharmaceutical", "academia"), pre-select the appropriate `cl-tone-select` value rather than defaulting to "startup/tech."

---

## Evidence Summary

| Criterion | Source File | Key Line(s) |
|-----------|-------------|-------------|
| Sidebar background on all pages | templates/cv-template.html | 381-401 (gradient + box-decoration-break) |
| Page-break-inside on job entries | templates/cv-template.html | 280 |
| Section title keeps-with-content | templates/cv-template.html | 250-256 |
| Publications heading logic (HTML) | templates/cv-template.html | 691-695 |
| Publications heading logic (DOCX) | scripts/utils/cv_orchestrator.py | 4578-4581 |
| Publication count NOT shown | templates/cv-template.html | 503 (`.pub-count` defined but never emitted in Jinja loop) |
| First-author star marker | templates/cv-template.html | 708-710 |
| Venue warning computed | scripts/utils/cv_orchestrator.py | 894-896 |
| Venue warning NOT surfaced in UI | web/ui-core.js, web/app.js | (not found — no `venue_warning` display) |
| Skill deduplication | scripts/utils/cv_orchestrator.py | 503-531 |
| Skill category sorting | scripts/utils/cv_orchestrator.py | 541-581 |
| Bullet relevance ordering | scripts/utils/cv_orchestrator.py | 3209-3219 |
| Page count validation | scripts/utils/cv_orchestrator.py | 5010-5028 |
| Generic summary phrase detection | scripts/utils/llm_client.py | 1037-1061, 1371-1403 |
| Action verb check (backend only) | scripts/utils/cv_orchestrator.py | 3954-3972 |
| Cover letter tone guidance | scripts/routes/master_data_routes.py | 90-102 |
| Cover letter prompt (word count) | scripts/routes/master_data_routes.py | 1576 (~250-300w, below story's 300w minimum) |
| Cover letter client-side validation | web/cover-letter.js | 475-558 |
| Cover letter word count check | web/cover-letter.js | 518-528 (250-400w) |
| CTA closing check | web/cover-letter.js | 531-543 |
| Company reference check | web/cover-letter.js | 499-516 |
| Font Awesome CDN dependency | templates/cv-template.html | 21 (no local fallback) |
| Google Fonts CDN dependency | templates/cv-template.html | 22 (no local fallback) |
| Base font size default | templates/cv-template.html | 39; scripts/utils/cv_orchestrator.py:297 (10px) |
| Name largest element | templates/cv-template.html | 210-217 (2.2rem Merriweather) |
