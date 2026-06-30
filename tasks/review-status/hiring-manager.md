<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Hiring Manager Persona UI Review

**Last Updated:** 2026-06-29 23:00 ET
**Persona:** Hiring Manager / Department Head
**Scope:** Application workflow guidance toward manager-ready materials + generated output quality
**Source branch:** feature/multi-user-deployment

---

## Executive Summary

The cv-builder application is structurally well-aligned with hiring-manager expectations. The generated CV template implements the 2-column layout, page-break hygiene, publication heading logic (Selected vs. full), and first-author marking demanded by the user stories. The cover letter system has tone differentiation and word-count targeting by role level. Six acceptance criteria pass fully; eight pass partially with meaningful gaps; three are not implemented or not verifiable from source alone.

Key risks to hiring-manager confidence:

1. **Cover letter closing is underspecified** — the prompt says "Close professionally with a call to action" but does not require a *direct interview request*, creating risk of passive closings that US-M6 explicitly flags as a failure mode.
2. **Publications are always included when `publications.bib` is populated** — there is no workflow gate asking whether publications are role-appropriate before adding them to the CV. US-M4 and US-M7 require publications only when flagged as relevant.
3. **Page-1 whitespace balance is not programmatically checked** — the template produces a two-column layout but no server-side measurement validates that neither column ends with a large blank gap.
4. **Action-verb validation exists but does not gate generation** — the rewrite system flags weak verbs, but approved bullets that still start passively can flow through to the final PDF unchallenged.
5. **Cover letter does not enforce a company-specific reference** — the prompt only injects `company_context` when the user explicitly provides it; if the user omits it, the letter can be fully generic.

---

## Application Evaluation

Evaluating whether the application *guides* the user toward hiring-manager-ready materials.

### US-M1: First Impression — Page 1 Layout (App Guidance)

**AC: Page 1 contains name, contact, summary, selected achievements, and education — all visible without scrolling.**

✅ Pass — `cv-template.html:526–608` renders the left column with Contact, Education, Awards, Certifications, Languages; right column renders Summary and Achievements directly after the header. All required elements are structurally present on page 1.

**AC: Summary is role-specific: contains the job title or near-equivalent, years of experience, and one specific differentiator.**

⚠️ Partial — The LLM rewrite system proposes summary rewrites incorporating job keywords. However, there is no structured check that the generated summary includes job title, years of experience, or a differentiator. The Summary Review tab (`index.html:213`) lets the user see the summary but provides no automated quality gate for these specific elements. Whether the LLM-proposed summary actually includes them depends entirely on model output quality.

**AC: Page 1 has no overflow (content does not bleed onto page 2 from the fixed-height section).**

⚠️ Partial — The layout uses a unified continuous column rather than fixed-height page 1 sections (`cv-template.html:66–99`). The page-count check (`cv_orchestrator.py:5011–5029`) warns if output is 1 page or >4 pages, but does not detect overflow from page 1 into page 2 specifically. The Layout Review step is the only overflow detection mechanism.

**AC: Page 1 has no visibly unbalanced whitespace — both columns appear full or near-full; gap greater than ~2cm is a flag.**

🔲 Not Implemented — No programmatic whitespace balance check exists. The layout freshness chip (`state-manager.js:120–177`) tracks stale vs. current preview but does not measure column fill. This is a visual QC concern left entirely to human review.

---

### US-M2: Work Experience — Credibility and Relevance (App Guidance)

**AC: Every bullet starts with a strong action verb (past tense for past roles, present for current).**

⚠️ Partial — `cv_orchestrator.py:3957–4165` implements `_check_bullet_verb` and `_enhance_achievement_for_ats`, which log warnings for weak verbs and produce `no_strong_verb` rewrite suggestions. However, the final-generation pipeline does not block weak-verb bullets if the user approves them. The guardrail is informational, not enforced at the generation gate.

**AC: Each job entry has at least 2 bullets.**

🔲 Not Implemented — No minimum-bullet enforcement exists in the orchestrator or ATS validation. The experience selection trims by relevance score but has no floor on bullet count per entry.

**AC: Bullets are ≤2 lines each.**

— N/A — Line length enforcement is not feasible at content-generation time; this is a rendering concern. The layout preview allows visual inspection.

**AC: Job entries are not split across pages (`page-break-inside: avoid`).**

✅ Pass — `cv-template.html:278–281` applies `page-break-inside: avoid; break-inside: avoid` to `.job-entry`. The `section-title + first content block` also has `break-before: avoid-page` (`cv-template.html:250–256`).

**AC: Relevance-ordered bullets within each entry (most relevant first, per content customisation step).**

⚠️ Partial — `cv_orchestrator.py:3061–3073` scores and sorts bullets by relevance. The `ordered_achievements` field preserves this order for template rendering. However, the ACH Editor tab (`index.html:209`) allows users to manually reorder bullets, and if the user reorders into a suboptimal sequence, no re-relevance-sort is applied after editing.

**AC: System warns if a bullet lacks an action verb (per Phase 2.4 refactor).**

✅ Pass — `cv_orchestrator.py:4144–4164` produces `no_strong_verb` type rewrite proposals surfaced in the Rewrites tab.

---

### US-M3: Skills Section Readability (App Guidance)

**AC: Skills grouped into named categories on the human-readable PDF.**

✅ Pass — `cv_orchestrator.py:533–595` (`_organize_skills_by_category`) groups skills by `category` field, deduplicates by canonical synonym name, and sorts categories by priority order.

**AC: Categories ordered by relevance to the target role.**

⚠️ Partial — `cv_orchestrator.py:549–579` (`_sort_categories`) uses variant-specific priority orders (`standard`, `technical`, `academic`) and respects a `skill_category_order` override from session customizations. However, there is no LLM-driven per-role reordering that automatically puts categories matching the job posting's primary requirements first. Ordering is variant-preset rather than dynamically computed from job analysis.

**AC: No duplicate skills (exact match or obvious aliases).**

✅ Pass — `cv_orchestrator.py:503–531` (`_deduplicate_skills`) uses the synonym map to merge aliases to a canonical form before rendering.

**AC: Skills section occupies no more than 1.5 sidebar columns total.**

🔲 Not Implemented — `settings.generation.max_skills` (default 20) caps total skills count, but there is no direct measurement of rendered sidebar column height.

---

### US-M4: Multi-Page Flow and Readability (App Guidance)

**AC: `page-break-inside: avoid` applied to every job entry; split entries are not permitted.**

✅ Pass — `cv-template.html:278–281`: `.job-entry { page-break-inside: avoid; break-inside: avoid }`. Also confirmed via print CSS (`cv-template.html:425–430`).

**AC: Sidebar content is balanced across pages (not empty on any page that has main content).**

⚠️ Partial — The faux-column gradient technique (`cv-template.html:381–401`) ensures the sidebar *background colour* extends to the bottom of every page even when sidebar content ends. However, sidebar content itself is only rendered if data exists. There is no mechanism to inject placeholder sidebar content on page 2+ when the sidebar's printable content is exhausted. Page 2 with full right column and empty-text left column (bar the gradient) will appear background-balanced but content-empty.

**AC: Total page count is 2–3 for a senior candidate; system warns if output is 1 or >3 pages.**

✅ Pass — `cv_orchestrator.py:5011–5029`: warns at 1 page, passes 2–3 pages, warns at 3–4 pages, fails at >4 pages. Config keys `generation.page_count.ideal_min/max/absolute_max`.

**AC: Publications included only when flagged as relevant for the role type.**

⚠️ Partial — The Publications Review tab (`index.html:214`) and `publication_decisions` session state (`conversation_manager.py:111`) allow the user to accept or reject individual publications. However, there is no workflow gate that asks whether publications are appropriate for the role *type* before they appear. By default, `_select_publications` runs whenever `self.publications` is non-empty, regardless of whether the job is research/academic or industry.

**AC: When publications are included, the section is headed "Selected Publications" — not "Publications" — signalling deliberate curation.**

⚠️ Partial — `cv_orchestrator.py:4581` (ATS DOCX) and `cv-template.html:691–695` (HTML/PDF) implement correct heading logic. Edge-case bug: when `self.publications` is empty (no `.bib` file loaded) but `selected_publications` is non-empty (from session decisions), `total_publications_count = 0` makes `0 > N` false, so heading defaults to `"Publications"` even when the list is a subset.

---

### US-M5: Visual Identity and Professionalism (App Guidance)

**AC: All fonts embedded in the PDF.**

⚠️ Partial — `cv-template.html:22` loads fonts from Google Fonts CDN at render time. WeasyPrint and Chrome headless will embed these if network access is available, but the template does not bundle fonts locally. In network-isolated environments, fonts fall back to system defaults, breaking the Merriweather/Inter pairing with no user warning.

**AC: Sidebar background colour present on every page, including pages 2+.**

✅ Pass — `cv-template.html:381–401` implements the faux-column gradient technique using `-webkit-box-decoration-break: clone` to repeat the gradient on every page fragment. Literal hex values are used (not CSS variables) for reliable Chromium print rendering.

**AC: No content clipped at page margins.**

⚠️ Partial — `@page { size: letter; margin: var(--page-margin) }` uses a configurable margin (default `0.5in`). No automated test verifies content stays within the printable area.

**AC: Font Awesome icons rendered correctly.**

⚠️ Partial — `cv-template.html:21`: Font Awesome loaded from Cloudflare CDN. Same network-isolation caveat as Google Fonts. Contact icons and section title icons will render as blank squares in offline PDF generation.

**AC: PDF passes visual QC: compare rendered page images against a reference screenshot.**

🔲 Not Implemented — No automated visual regression test exists. The Layout Review step provides a browser-rendered iframe preview for human inspection only.

---

### US-M6: Cover Letter Tone and Relevance (App Guidance)

**AC: Company name and role title appear in paragraph 1.**

⚠️ Partial — `master_data_routes.py:1603–1631` injects company name and role into the prompt context. However, the prompt does not explicitly require company name and role title to appear in *paragraph 1*. Whether the LLM places them in paragraph 1 is probabilistic. No post-generation validation checks paragraph 1 content.

**AC: At least one company-specific reference (recent initiative, product, or value) if extractable from the job posting.**

⚠️ Partial — `master_data_routes.py:1528` captures `company_context` from the user. `master_data_routes.py:1586–1588` injects it into the prompt if provided. If the user does not provide `company_context`, the letter will have no company-specific references — there is no fallback that attempts to extract specifics from the job description text.

**AC: Body paragraphs cite specific, named achievements — not generic claims.**

⚠️ Partial — `master_data_routes.py:1591–1601` injects up to 5 approved rewrite bullets and provides top achievements. However, this is guidance to the LLM, not a structural guarantee. No post-generation parsing checks whether the letter body contains measurable achievement references.

**AC: Closing paragraph ends with a direct interview request.**

⚠️ Partial — `master_data_routes.py:1630`: `"Close professionally with a call to action."` This instruction does not specifically require a *direct interview request*. The closing could be "I look forward to potentially discussing this opportunity" — which US-M6 lists as a failure mode.

**AC: Length within the role-appropriate range: 300–400w standard; 400–500w executive; 500–600w research/academic.**

✅ Pass — `master_data_routes.py:111–122` (`_cover_letter_word_count_instruction`) returns role-differentiated word count targets. The LLM prompt includes the word count instruction. No post-generation word count validation exists, but the instruction is present.

**AC: Tone setting applied based on inferred employer type.**

✅ Pass — `master_data_routes.py:96–103` defines `_TONE_GUIDANCE` for startup/tech, pharma/biotech, academia, financial, leadership. User selects tone; it is injected into the prompt.

---

### US-M7: Selected Publications — Credibility and Relevance (App Guidance)

**AC: Section heading "Selected Publications" when subset shown; "Publications" when all shown.**

⚠️ Partial — Logic exists and is correct for the normal case (`cv_orchestrator.py:4581`, `cv-template.html:691–695`). Edge-case bug: when `self.publications` is empty but session decisions provide publications, `total_publications_count = 0` forces heading to `"Publications"` regardless of curation state.

**AC: The publication count is never shown in the generated CV or ATS document.**

✅ Pass — No count suffix patterns found in template or orchestrator code.

**AC: Each entry displays: authors (first-author identifiable), title, venue, year.**

⚠️ Partial — `cv_orchestrator.py:855–898` formats publications with `formatted_citation` (authors, title, venue, year) and sets `is_first_author`. `cv-template.html:708–710` renders `★` for first-author entries. However, first-author detection (`cv_orchestrator.py:886–891`) compares only the owner's last name against the first author token — unreliable for common surnames or non-standard BibTeX author formats. No fallback or user notification exists for failed detection.

**AC: Total entry count matches what the applicant confirmed in the Customisation step.**

✅ Pass — `cv_orchestrator.py:3430–3442` respects `accepted_publications` from session decisions.

**AC: Selected Publications is always the final section of the CV.**

✅ Pass — `cv-template.html:688–715`: publications section appears at the end of the right-column `<main>`, after all other sections.

**AC: No entry appears without a venue; entries missing `journal` or `booktitle` are flagged during Customisation.**

⚠️ Partial — `cv_orchestrator.py:895–896` sets `venue_warning = 'No journal or conference name found in BibTeX entry'` on entries lacking a venue. However, this field is not rendered as visible user feedback in the Publications Review tab. The warning is computed but not shown during customisation.

---

## Generated Materials Evaluation

### CV Quality Assessment (Template + Orchestrator → Output)

**Completeness:** All required sections are architecturally present: Name/tagline header, icon-prefixed contact block (sidebar), Education (sidebar), Awards (sidebar), Professional Summary, Achievements (right column), Work Experience with dated entries, Skills by category, Publications (final section).

**Layout credibility:** The 2-column layout with `--sidebar-bg: #eef2f5` differentiation, Merriweather serif for the name, Inter sans-serif for body, uppercase section titles with `border-bottom`, and Font Awesome icon-prefixed contact fields satisfy the US-M5 visual requirements structurally.

**Metric-bearing bullets:** The rewrite system encourages metric inclusion via the LLM prompt, and `_enhance_achievement_for_ats` logs warnings for weak verbs. The system cannot guarantee metric insertion where none exist in the master data.

**Relevance ordering:** `_select_experiences` and `_sort_categories` ensure the highest-relevance experiences and skills appear first by relevance score. The ACH Editor allows per-entry bullet reordering, but the system does not re-sort after user edits.

**Persuasiveness:** `persuasion_checks` runs after content selection and produces warnings for generic or passive language. These are shown in the Rewrites tab. The quality of final bullets depends on which rewrites the user approves.

### Cover Letter Quality Assessment

**Structure:** The prompt produces 3–4 paragraphs with tone differentiation, word count targets by role level, and company/role injected. Three opening styles (formal, hook, narrative) are available. The closing instruction is generic ("call to action") rather than prescriptive.

**Company-specific content:** Only included when user provides `company_context`. The system does not extract company signals from the job description text automatically. This is the largest structural gap for hiring-manager credibility.

**Achievement references:** Up to 5 approved rewrite bullets and top 5 achievements are injected into the prompt. These give the LLM material for specific references, but structural enforcement is absent.

**Length enforcement:** The LLM is instructed on word count but not validated post-generation.

---

## Additional Gaps Relevant to Hiring Outcomes

**GAP-HM-01 (HIGH):** No workflow prompt asks "Are publications appropriate for this role?" before including them. Publications auto-include whenever `publications.bib` is non-empty and relevance scores are positive. An industry-focused job application could include publications the hiring manager finds puzzling.

**GAP-HM-02 (HIGH):** Cover letter prompt instructs "call to action" but does not require a *direct interview request*. The US-M6 failure mode ("I look forward to potentially discussing…") is unguarded. Prompt should be strengthened to require a specific interview request.

**GAP-HM-03 (MED):** Company-specific reference in the cover letter is fully optional and user-driven. The app should attempt to extract company signals from the job description text and pre-populate `company_context`, or at minimum prompt the user to provide context before generation.

**GAP-HM-04 (MED):** First-author detection in publications uses only last-name string matching (`cv_orchestrator.py:886–891`). Authors with common surnames or non-standard BibTeX formats may be incorrectly marked `is_first_author = False`, causing the `★` to be absent with no user notification.

**GAP-HM-05 (MED):** `venue_warning` field is populated by the orchestrator but not rendered in the Publications Review tab. Users cannot see during customisation which publications lack a venue, leading to unprofessional citations in the final output.

**GAP-HM-06 (MED):** No minimum bullet count per job entry is enforced. A job entry with a single bullet is not caught by the validator. A minimum of 2 bullets per entry should be enforced with a UI warning.

**GAP-HM-07 (LOW):** Font Awesome and Google Fonts are loaded from CDNs at PDF generation time. In restricted network environments, icons render as blank squares and the font pairing degrades. A local bundle fallback would ensure consistent quality.

**GAP-HM-08 (LOW):** Summary quality is not validated structurally. The app does not check whether the generated/selected summary contains the job title, years of experience, or a differentiator — the three elements US-M1 requires for a role-specific summary.

---

## Reviewed Against

- `/Users/warnes/src/cv-builder/tasks/user-story-hiring-manager.md`
- `/Users/warnes/src/cv-builder/web/index.html`
- `/Users/warnes/src/cv-builder/web/app.js`
- `/Users/warnes/src/cv-builder/web/ui-core.js`
- `/Users/warnes/src/cv-builder/web/state-manager.js`
- `/Users/warnes/src/cv-builder/web/styles.css`
- `/Users/warnes/src/cv-builder/scripts/web_app.py`
- `/Users/warnes/src/cv-builder/scripts/utils/conversation_manager.py`
- `/Users/warnes/src/cv-builder/scripts/utils/cv_orchestrator.py`
- `/Users/warnes/src/cv-builder/scripts/routes/master_data_routes.py`
- `/Users/warnes/src/cv-builder/templates/cv-template.html`

---

## Summary Table

| User Story | Acceptance Criterion | Status | Evidence |
| --- | --- | --- | --- |
| US-M1 | Page 1 complete (name, contact, summary, achievements, education) | ✅ Pass | cv-template.html:526–608 |
| US-M1 | Summary is role-specific (title, years, differentiator) | ⚠️ Partial | No structural validation of summary content |
| US-M1 | Page 1 has no overflow | ⚠️ Partial | Layout preview only; no automated overflow check |
| US-M1 | No visibly unbalanced whitespace on page 1 | 🔲 Not Implemented | No column-fill measurement |
| US-M2 | Every bullet starts with strong action verb | ⚠️ Partial | Warns but does not block weak verbs at generation |
| US-M2 | Each job entry has ≥2 bullets | 🔲 Not Implemented | No minimum enforcement |
| US-M2 | Bullets ≤2 lines each | — N/A | Rendering concern; layout preview available |
| US-M2 | Job entries not split across pages | ✅ Pass | cv-template.html:278–281 |
| US-M2 | Relevance-ordered bullets per entry | ⚠️ Partial | Sorted by relevance but user edits can override order |
| US-M2 | System warns on missing action verb | ✅ Pass | cv_orchestrator.py:4144–4164 |
| US-M3 | Skills grouped into named categories | ✅ Pass | cv_orchestrator.py:533–595 |
| US-M3 | Categories ordered by relevance to role | ⚠️ Partial | Variant-preset order; not dynamically job-driven |
| US-M3 | No duplicate skills | ✅ Pass | cv_orchestrator.py:503–531 (synonym map) |
| US-M3 | Skills section ≤1.5 sidebar columns | 🔲 Not Implemented | max_skills cap exists but no height measurement |
| US-M4 | page-break-inside: avoid on job entries | ✅ Pass | cv-template.html:278–281 |
| US-M4 | Sidebar content balanced across pages | ⚠️ Partial | Sidebar background extends; text content not balanced |
| US-M4 | Page count 2–3; warn if 1 or >3 | ✅ Pass | cv_orchestrator.py:5011–5029 |
| US-M4 | Publications only when role-appropriate | ⚠️ Partial | Auto-included; no role-type gate |
| US-M4 | Publications heading: Selected vs. full | ⚠️ Partial | Logic correct; edge-case bug when .bib empty |
| US-M5 | Fonts embedded in PDF | ⚠️ Partial | CDN-loaded; fails in network-isolated environments |
| US-M5 | Sidebar background on every page | ✅ Pass | cv-template.html:381–401 (faux-column gradient) |
| US-M5 | No content clipped at margins | ⚠️ Partial | Configurable margin; no automated clip check |
| US-M5 | Font Awesome icons rendered | ⚠️ Partial | CDN-loaded; fails offline |
| US-M5 | PDF visual QC vs. reference screenshot | 🔲 Not Implemented | No automated visual regression |
| US-M6 | Company name + role in paragraph 1 | ⚠️ Partial | LLM guided but not enforced; no post-gen check |
| US-M6 | Company-specific reference in letter | ⚠️ Partial | Only when user provides company_context |
| US-M6 | Body cites specific named achievements | ⚠️ Partial | LLM guided with bullets; not structurally enforced |
| US-M6 | Closing ends with direct interview request | ⚠️ Partial | "Call to action" instruction only; not prescriptive |
| US-M6 | Length within role-appropriate range | ✅ Pass | master_data_routes.py:111–122 |
| US-M6 | Tone applied based on employer type | ✅ Pass | _TONE_GUIDANCE dict; user selects tone |
| US-M7 | Heading: Selected vs. full Publications | ⚠️ Partial | Logic correct; edge-case bug when bib empty |
| US-M7 | Publication count never shown in CV | ✅ Pass | No count suffix found in template or orchestrator |
| US-M7 | Each entry: authors, title, venue, year | ⚠️ Partial | First-author detection unreliable for common surnames |
| US-M7 | Entry count matches confirmed decisions | ✅ Pass | cv_orchestrator.py:3430–3442 |
| US-M7 | Publications always final section | ✅ Pass | cv-template.html:688–715 |
| US-M7 | Entries without venue flagged during Customisation | ⚠️ Partial | venue_warning computed but not rendered in UI |

---

## Key Evidence References

| File | Lines | Relevance |
| --- | --- | --- |
| `/Users/warnes/src/cv-builder/templates/cv-template.html` | 86–99 | 2-column layout structure |
| `/Users/warnes/src/cv-builder/templates/cv-template.html` | 210–227 | Merriweather name, Inter tagline |
| `/Users/warnes/src/cv-builder/templates/cv-template.html` | 278–281 | `.job-entry { page-break-inside: avoid }` |
| `/Users/warnes/src/cv-builder/templates/cv-template.html` | 381–401 | Faux-column gradient for sidebar on all pages |
| `/Users/warnes/src/cv-builder/templates/cv-template.html` | 526–608 | Sidebar: Contact, Education, Awards, Certs, Languages |
| `/Users/warnes/src/cv-builder/templates/cv-template.html` | 688–715 | Publications section (final) with heading logic |
| `/Users/warnes/src/cv-builder/templates/cv-template.html` | 708–710 | First-author star rendering |
| `/Users/warnes/src/cv-builder/scripts/utils/cv_orchestrator.py` | 503–531 | Skill deduplication via synonym map |
| `/Users/warnes/src/cv-builder/scripts/utils/cv_orchestrator.py` | 549–579 | Category sort by variant preset |
| `/Users/warnes/src/cv-builder/scripts/utils/cv_orchestrator.py` | 886–896 | First-author detection; venue_warning flag |
| `/Users/warnes/src/cv-builder/scripts/utils/cv_orchestrator.py` | 4144–4164 | Action verb warning generation |
| `/Users/warnes/src/cv-builder/scripts/utils/cv_orchestrator.py` | 4577–4582 | ATS DOCX: Selected vs. Publications heading |
| `/Users/warnes/src/cv-builder/scripts/utils/cv_orchestrator.py` | 5011–5029 | Page count validation (warn at 1 or >3) |
| `/Users/warnes/src/cv-builder/scripts/routes/master_data_routes.py` | 96–122 | Cover letter tone guidance + word count |
| `/Users/warnes/src/cv-builder/scripts/routes/master_data_routes.py` | 1603–1631 | Cover letter LLM prompt structure |
