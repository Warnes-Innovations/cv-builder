<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Hiring Manager Persona Review

**Cycle:** 5
**Date:** 2026-06-20
**Time:** ~11:00 ET
**Reviewer:** Hiring Manager persona (technical hiring manager / department head)
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/cover-letter.js, web/publications-review.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/routes/master_data_routes.py

---

## Application Evaluation

### Criteria Table

| Story | Criterion | Status | Evidence |
| ----- | --------- | ------ | -------- |
| **US-M1** | Page 1 contains name, contact, summary, achievements, education — all visible without scrolling | ✅ | cv-template.html: left-col contains contact, education, awards; right-col contains summary then achievements; all within the same `#cv-body` single-page flow |
| **US-M1** | Summary is role-specific: contains job title/equivalent, years of experience, one specific differentiator | ⚠️ | Generic-phrase detection active (`llm_client.py` `check_summary_generic_phrases`, `conversation_manager.py:1325`), but no server-side check enforces that the summary contains the target job title or a quantified years-of-experience claim. Detection blocks filler phrases like "seasoned professional" but does not enforce specificity of positive content |
| **US-M1** | Page 1 has no overflow | ✅ | `cv_orchestrator.py`: staged content selection trims to page budget; `_cap_publications_to_pages()` prevents overrun |
| **US-M1** | Page 1 has no visibly unbalanced whitespace (>~2cm gap) | ⚠️ | No programmatic check warns the user when the left column ends significantly above the right column on page 1. Purely a visual issue caught only in manual preview |
| **US-M1** | Sidebar background differentiated (light fill) on every page | ✅ | cv-template.html: `background-image: linear-gradient(to right, #eef2f5 …)` with `box-decoration-break: clone` ensures sidebar colour carries across page fragments |
| **US-M1** | Name is largest text element | ✅ | cv-template.html: `.name { font-size: 2.2rem; font-family: Merriweather, serif }` — significantly larger than `.job-title` (1.1rem) or `.section-title` (1.1rem) |
| **US-M1** | Contact information scannable via icons | ✅ | cv-template.html: Font Awesome icon per contact field (fa-envelope, fa-phone, fa-linkedin, fa-globe) in left sidebar |
| **US-M1** | Font not below 10pt | ✅ | cv-template.html: `font-size: {{ base_font_size }}` defaults to `10px` (`safe_css_size` default in `cv_orchestrator.py:297`). All body text is `1rem = 10px` at this base |
| **US-M2** | Every bullet starts with a strong action verb | ⚠️ | `cv_orchestrator.py:3954-3972`: `_enhance_achievement_for_ats()` logs a WARNING when a bullet lacks a strong verb but does not modify the text or surface the warning to the user in the UI. `check_persuasion()` (`cv_orchestrator.py:4116`) results are stored in `persuasion_warnings` state (`web_app.py:120`) but not shown as a highlighted alert in the download/review tab |
| **US-M2** | Each job entry has at least 2 bullets | ⚠️ | No validation gate warns when a job entry has 0 or 1 bullets. `_normalize_experiences_for_template()` (`cv_orchestrator.py:417`) passes through entries with zero achievements without warning |
| **US-M2** | Bullets are ≤2 lines each | ⚠️ | No length-check guard. Long bullets pass through the template without truncation or warning |
| **US-M2** | Job entries not split across pages (`page-break-inside: avoid`) | ✅ | cv-template.html: `.job-entry { page-break-inside: avoid }` applied |
| **US-M2** | Relevance-ordered bullets within each entry (most relevant first) | ✅ | `cv_orchestrator.py:3209-3219`: per-experience bullet sort by keyword overlap (`_ach_relevance`); user override via `achievement_orders` in customizations |
| **US-M2** | System warns if a bullet lacks an action verb | ⚠️ | Warning exists as backend log (`_enhance_achievement_for_ats`, line 3967) and in `check_persuasion()` results, but there is no UI gate that blocks generation or shows a pre-generation checklist item when bullets fail the verb test |
| **US-M3** | Skills grouped into named categories on PDF | ✅ | cv-template.html: `{% for cat in skills_by_category %}` renders `cat.category` as `<h4>` heading per group; `cv_orchestrator.py:533-595`: `_organize_skills_by_category()` groups and sorts by category |
| **US-M3** | Categories ordered by relevance to target role | ✅ | `cv_orchestrator.py:541-581`: `_sort_categories()` uses priority order (`standard`, `technical`, `academic` variants) and custom user overrides from `skill_category_order` |
| **US-M3** | No duplicate skills (exact or alias) | ✅ | `cv_orchestrator.py:503-531`: `_deduplicate_skills()` deduplicates by canonical synonym name via `_expansion_index`, merging aliases |
| **US-M3** | Skills section occupies no more than 1.5 sidebar columns total | ⚠️ | No programmatic cap on sidebar skills visual height. The `max_skills` config (default 20, `cv_orchestrator.py:3120`) caps count but does not compute visual height. A candidate with 20 skills in 6 categories could overflow the sidebar |
| **US-M4** | `page-break-inside: avoid` on every job entry | ✅ | cv-template.html: `.job-entry { page-break-inside: avoid }` |
| **US-M4** | Sidebar content balanced across pages | ⚠️ | The single continuous left-col with float-left in print means sidebar content (contact, education, awards, skills) ends when those sections end; pages 2+ have an empty left column unless sidebar content is exceptionally long. Structural layout constraint, not a regression |
| **US-M4** | Total page count 2–3 for senior candidates; system warns if 1 or >3 | ✅ | `cv_orchestrator.py:5010-5028`: post-generation `cv_page_count` check warns at 1 page, passes at 2–3, warns at >3 up to absolute_max=4, fails above 4 |
| **US-M4** | Publications only when flagged relevant for the role type | ✅ | `cv_orchestrator.py:3419-3444`: publications excluded by default; `accepted_publications` list from customizations step controls inclusion |
| **US-M4** | Publications section headed "Selected Publications" (subset) vs "Publications" (full) | ✅ | cv-template.html: Jinja condition `{% if template_metadata.total_publications_count … > (publications \| length) %}Selected Publications{% else %}Publications{% endif %}`. DOCX equivalent at `cv_orchestrator.py:4580` |
| **US-M5** | Fonts embedded in PDF | ✅ | WeasyPrint embeds fonts by default; template uses Google Fonts CDN `Inter` + `Merriweather` loaded at generation time. Risk: CDN unavailability at generation time could fail embedding — no offline fallback |
| **US-M5** | Sidebar background present on every page, including pages 2+ | ✅ | cv-template.html: gradient with `box-decoration-break: clone` for WeasyPrint / Chrome |
| **US-M5** | No content clipped at page margins | ✅ | `@page { margin: var(--page-margin) }` in cv-template.html; default `0.5in` is safe for US Letter; `safe_css_size` prevents injection |
| **US-M5** | Font Awesome icons rendered correctly | ⚠️ | cv-template.html: Font Awesome loaded from CDN (`cdnjs.cloudflare.com`) at line 21; requires network at generation time. No local fallback bundled |
| **US-M5** | Serif name / sans-serif body typography pairing | ✅ | cv-template.html: Merriweather serif for `.name`; Inter sans-serif for all body text |
| **US-M5** | Section titles uppercase with horizontal rule border | ✅ | `.section-title { text-transform: uppercase; border-bottom: 1px solid #ddd }` in cv-template.html |
| **US-M5** | Custom accent-coloured bullet points | ✅ | `.achievement-list li::before { color: var(--accent-color) }` in cv-template.html |
| **US-M6** | Company name and role title appear in paragraph 1 | ⚠️ | Backend prompt (`master_data_routes.py:1559-1563`) instructs the LLM to write for company/role but does not programmatically verify the generated text contains them. Client-side `_validateCoverLetter()` checks company name presence (`cover-letter.js:499-516`) but only after generation, as a soft check |
| **US-M6** | At least one company-specific reference (initiative, product, or value) | ❌ | No mechanism to extract or inject company-specific initiatives from the job posting. The prompt context is limited to structured `job_analysis` fields (company name, role title, ATS keywords). The `highlight` free-text field is the only escape hatch (`master_data_routes.py:1574`), with no UI guidance nudging the user to supply company-specific intelligence there |
| **US-M6** | Body paragraphs cite specific named achievements | ⚠️ | Prompt at `master_data_routes.py:1569-1570` passes top 4 achievements to the LLM and instructs "Reference concrete skills and achievements." Compliance depends entirely on LLM output quality; no post-generation validation checks whether the letter actually names a specific achievement |
| **US-M6** | Closing ends with direct interview request | ✅ | Prompt at `master_data_routes.py:1580`: "Close professionally with a call to action." Client-side Rule 4 (`cover-letter.js:531-543`) checks for CTA patterns including "interview" and flags if absent |
| **US-M6** | Length within role-appropriate range (300–400w standard; 400–500w exec; 500–600w research) | ⚠️ | Backend prompt targets "~250–300 words" (`master_data_routes.py:1576`) — below the story's minimum of 300w for a standard role. Client-side check enforces 250–400w (`cover-letter.js:522`). No role-type adaptation (exec/research tiers) is implemented |
| **US-M6** | Tone setting applied based on inferred employer type | ✅ | `_TONE_GUIDANCE` dict (`master_data_routes.py:90-96`) provides 5 tone presets with differentiated guidance strings. User selects explicitly via `cl-tone-select`; no auto-inference from job posting, which is a gap but not a failure of the implemented mechanism |
| **US-M7** | "Selected Publications" when subset shown; "Publications" when all shown | ✅ | cv-template.html and `cv_orchestrator.py:4580`: condition correctly uses `total_publications_count > len(publications)` |
| **US-M7** | Publication count not shown in CV or ATS document (`(4 of 52)` etc.) | ✅ | `.pub-count` CSS class is defined but never instantiated in the template HTML — the Jinja loop does not emit it. No count notation rendered |
| **US-M7** | Each entry: authors, title, venue, year in scan-priority order | ✅ | `cv_orchestrator.py:855-869`: `formatted_citation` constructed as `{authors}. {title}. {venue_text} ({year})` or uses pre-formatted BibTeX string |
| **US-M7** | Entry count matches what user confirmed in customisation step | ✅ | `cv_orchestrator.py:3418-3461`: `accepted_publications` from session customizations drives selection; rejected keys excluded |
| **US-M7** | Publications always the final CV section | ✅ | cv-template.html: publications section is the last `{% if publications %}` block in `<main>`, after experiences |
| **US-M7** | Entries missing venue flagged to user during customisation | ✅ | `cv_orchestrator.py:894-896`: `entry['venue_warning']` is populated and IS rendered in the Publications Review tab: `publications-review.js:138` renders a `⚠` icon with tooltip text when `pub.venue_warning` is non-empty. **Correction from Cycle 4 review which incorrectly stated this was not surfaced.** |
| **US-M7** | First-author status immediately apparent | ✅ | cv-template.html: star marker (`★`) appended to first-author entries with tooltip "First author"; Publications Review tab also shows a first-author star column (`publications-review.js:132`) |

---

### Failure Mode Analysis by Story

#### US-M1 — Page 1 Layout

- Summary role-specificity: The system detects generic filler phrases during rewrite review, but no check enforces that the summary contains the target job title or a quantified years-of-experience claim. A summary that says "Experienced data scientist with a passion for impact" passes all current checks despite being generic.
- Whitespace balance: No automated check warns when the left column ends more than ~2cm above the right column on page 1.

#### US-M2 — Work Experience

- Minimum bullet count: No gate warns when a job entry has 0 or 1 bullets. The template renders them silently (`cv_orchestrator.py:417`, `_normalize_experiences_for_template`).
- Bullet length: No truncation or warning for bullets exceeding 2 lines.
- Action verb surface: `_enhance_achievement_for_ats()` correctly identifies missing strong verbs but logs to the server log only. `check_persuasion()` results are stored in `persuasion_warnings` state but not surfaced as a highlighted alert in the download/review tab.

#### US-M3 — Skills

- Skills section length: 20 skills across 6 categories (possible with default config) can produce a sidebar that outweighs the right-column content on page 1 for shorter CVs. No pixel-budget check exists.

#### US-M4 — Multi-page flow

- Sidebar empty on pages 2+: Structural limitation of the float-based print layout. The gradient ensures colour continuity but not content continuity. Pages 2 and 3 have an empty left column.

#### US-M6 — Cover Letter

- Company-specific reference: The biggest gap. The prompt does not extract or require company-specific context beyond the company name and role title from the structured job analysis. No UI prompt or guidance nudges users to supply this via the `highlight` field.
- Word count below story spec: Backend targets ~250–300 words; story requires 300–400w minimum for a standard role. A 270-word letter that passes all client checks may read as thin to a hiring manager expecting at least 3 substantive paragraphs.
- Tone auto-inference: Not implemented; users may leave the default "startup/tech" for pharma or academic roles.

---

## Generated Materials Evaluation

### CV Document Quality

**Relevance and specificity (strong):** Bullet ordering by keyword overlap (`cv_orchestrator.py:3209-3219`), relevance scoring for experience selection (`cv_orchestrator.py:3127-3168`), and skills deduplication with synonym canonicalization directly serve the hiring manager's need to see the most relevant content first.

**Quantified impact (partial):** The system flags bullets lacking metrics (rule: `no_metric`, severity `warning` in `check_persuasion()`) but does not block generation or require the user to resolve these warnings. A generated CV may reach the hiring manager with unquantified bullets if the user skips the persuasion check step.

**Professionalism — typography and layout (strong):** Merriweather + Inter pairing is a strong, professional combination appropriate for a senior candidate. Dark navy (#2c3e50) primary with accent blue (#2980b9). Page numbers via `@page` counter are present. Section titles uppercase with border-bottom. Custom accent-coloured achievement bullets.

**First-impression (10-15 second test) (strong):** Right column leads with Summary then Selected Achievements before Work Experience — correct for a senior candidate. A hiring manager scanning page 1 sees positioning statement and 4–6 high-impact achievements before reading job history.

**ATS plaintext section (bonus):** The template includes a hidden `<section id="plaintext">` with structured plain text for ATS parsers — not all CV generation tools include this.

### Cover Letter Quality

**Tone implementation (strong):** Five tone presets are implemented with distinct, differentiated guidance strings (`master_data_routes.py:90-96`). Academia preset specifically references publications and teaching experience. Pharma preset references regulatory rigour.

**Opening flexibility (strong):** Three opening styles (formal salutation, attention hook, narrative) give meaningful control (`master_data_routes.py:98-102`). Hook and narrative styles are clearly differentiated from generic openers.

**Critical weakness — generic company reference:** The generated letter will name the company and role but cannot include company-specific content unless the user manually enters it in the `highlight` field. The prompt does not inject job posting text or any company research beyond `job_analysis.company` and `job_analysis.title`. A hiring manager will immediately identify a letter that mentions the company name but contains no specific reference to what the company does, its recent initiatives, or its values.

**Word count mismatch:** Backend targets ~250–300 words (`master_data_routes.py:1576`); story requires 300–400w minimum. A 270-word letter that passes all client checks may read as thin to a hiring manager expecting at least 3 substantive paragraphs.

### Publications Quality

**Venue warning surfaced (corrected):** The Cycle 4 review incorrectly stated that `venue_warning` was not surfaced in the UI. `publications-review.js:138` renders a `⚠` icon with tooltip text directly in the Citation column when `pub.venue_warning` is non-empty. This criterion is correctly ✅ Pass.

---

## Additional Story Gaps / Proposed Story Items

**GAP-HM-1 (HIGH): Summary specificity validator**
Add a server-side check (post-rewrite, pre-generation) that verifies the professional summary contains: (a) the target job title or close variant, and (b) a quantified claim or specific differentiator. The generic-phrase check catches "seasoned professional" but not "Experienced engineer with broad expertise."

**GAP-HM-2 (HIGH): Company-specific cover letter injection**
The cover letter generation prompt should receive the full job posting text so the LLM can extract company-specific signals (mission, recent product mention, team name) and weave them into the letter. The prompt at `master_data_routes.py:1555-1581` currently receives only structured fields from `job_analysis`, not the raw posting text. This is the single largest quality gap from a hiring manager's perspective.

**GAP-HM-3 (MEDIUM): Minimum bullet count gate**
Add a validation check (pre-generation or post-content-selection) that warns when any job entry has fewer than 2 bullets. Surface in the Experiences Review tab and in the ATS report. Evidence: `cv_orchestrator.py:417` — `_normalize_experiences_for_template()` passes through entries with zero achievements without warning.

**GAP-HM-4 (MEDIUM): Role-type cover letter word-count tiers**
Implement the three word-count tiers (300–400w standard, 400–500w executive, 500–600w research/academic). The backend can infer role type from `job_analysis.role_level` and `job_analysis.domain` already populated by the analysis step. Currently the backend targets ~250–300w for all roles (`master_data_routes.py:1576`) and the client validates 250–400w (`cover-letter.js:522`).

**GAP-HM-5 (MEDIUM): Sidebar balance warning for short CVs**
For CVs where the left column is estimated to end significantly above the right column on page 1, surface a layout suggestion in the Layout Review tab.

**GAP-HM-6 (LOW): Auto-infer cover letter tone from job analysis**
When `job_analysis.domain` is populated (e.g. "pharmaceutical", "academia"), pre-select the appropriate `cl-tone-select` value rather than defaulting to "startup/tech." The `_TONE_GUIDANCE` dict at `master_data_routes.py:90` already has the preset strings; only auto-selection is missing.

**GAP-HM-7 (LOW): Persuasion warnings surfaced at download/review step**
`persuasion_warnings` is stored in `StatusResponse` (`web_app.py:120`) and populated via `check_persuasion()`, but it is not rendered as a visible alert in the download or file-review tab. A pre-download checklist showing unresolved warnings (weak verbs, missing metrics) would close this loop.

---

## Evidence Summary

| Criterion | Source File | Key Line(s) |
| --------- | ----------- | ----------- |
| Sidebar background on all pages | templates/cv-template.html | gradient + box-decoration-break |
| Page-break-inside on job entries | templates/cv-template.html | `.job-entry { page-break-inside: avoid }` |
| Publications heading logic (HTML) | templates/cv-template.html | `{% if total_publications_count > … %}Selected Publications{% else %}Publications{% endif %}` |
| Publications heading logic (DOCX) | scripts/utils/cv_orchestrator.py | 4578-4581 |
| Publication count NOT shown | templates/cv-template.html | `.pub-count` defined but never emitted in Jinja loop |
| First-author star marker (template) | templates/cv-template.html | `★` marker with is_first_author condition |
| First-author star (review tab) | web/publications-review.js | 132 |
| Venue warning computed | scripts/utils/cv_orchestrator.py | 894-896 |
| Venue warning rendered in UI | web/publications-review.js | 138 — `venueWarn` rendered as `⚠` icon with tooltip |
| Skill deduplication | scripts/utils/cv_orchestrator.py | 503-531 |
| Skill category sorting | scripts/utils/cv_orchestrator.py | 541-581 |
| Bullet relevance ordering | scripts/utils/cv_orchestrator.py | 3209-3219 |
| Page count validation | scripts/utils/cv_orchestrator.py | 5010-5028 |
| Generic summary phrase detection | scripts/utils/conversation_manager.py | 1325 |
| Action verb check (backend only) | scripts/utils/cv_orchestrator.py | 3954-3972 |
| Persuasion warnings in state | scripts/web_app.py | 120 (`persuasion_warnings` field) |
| Cover letter tone guidance | scripts/routes/master_data_routes.py | 90-96 |
| Cover letter prompt (word count) | scripts/routes/master_data_routes.py | 1576 (~250-300w, below story's 300w minimum) |
| Cover letter client-side validation | web/cover-letter.js | 475-558 |
| Cover letter word count check | web/cover-letter.js | 522 (250-400w) |
| CTA closing check | web/cover-letter.js | 531-543 |
| Company reference check | web/cover-letter.js | 499-516 |
| Font Awesome CDN dependency | templates/cv-template.html | line 21 (no local fallback) |
| Google Fonts CDN dependency | templates/cv-template.html | line 22 (no local fallback) |
| Base font size default | scripts/utils/cv_orchestrator.py | 297 (10px) |
| Name largest element | templates/cv-template.html | `.name { font-size: 2.2rem; font-family: Merriweather }` |
| Cover letter no auto-tone inference | web/cover-letter.js | 19-25 (COVER_LETTER_TONES list, no auto-select logic) |
