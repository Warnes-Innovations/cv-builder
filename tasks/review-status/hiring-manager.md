<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Hiring Manager Persona Review (US-M*)

**Reviewer role:** Hiring manager / department head evaluating both the application workflow and the generated human-readable materials.  
**Review date:** 2026-06-18  
**Source branch:** feature/multi-user-deployment  
**Story file:** `tasks/user-story-hiring-manager.md`

---

## Part 1 — Application Evaluation

### US-M1: First Impression — Page 1 Layout

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1a | Page 1 contains name, contact, summary, selected achievements, and education — all visible without scrolling | ✅ Pass | `templates/cv-template.html` renders name (`.name`), contact icons, summary (`.summary-text`), achievements (`.achievement-list`), and education in the sidebar in a single two-column layout block |
| 1b | Summary is role-specific: contains the job title, years of experience, and one specific differentiator | ⚠️ Partial | `cv_orchestrator.py:197` provides a generic fallback summary (`"Experienced professional applying for {title}"`) when the session summary is empty; no automated check enforces that the LLM-generated summary contains the required three elements |
| 1c | Page 1 has no overflow (content does not bleed onto page 2 from the fixed-height section) | ⚠️ Partial | The template uses variable-height content; no hard page-height cap is enforced at the data-selection layer. `validate_ats_report()` checks total page count post-generation (`cv_orchestrator.py:4921-4942`) but only warns — it does not prevent page-1 overflow before generation |
| 1d | Page 1 has no visibly unbalanced whitespace — both columns appear full or near-full | ⚠️ Partial | No programmatic balance check exists. The two-column flex layout fills space based on content volume; the UI has no whitespace-balance warning |

**Summary:** The structural skeleton supports all required page-1 elements, but no enforcement mechanism guarantees the summary is role-specific or that column balance is achieved.

---

### US-M2: Work Experience — Credibility and Relevance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 2a | Every bullet starts with a strong action verb | ⚠️ Partial | `_enhance_achievement_for_ats()` (`cv_orchestrator.py:3941-3959`) logs a `WARNING` when a bullet does not start with a strong verb but **does not modify or reject the bullet** — it passes text through unchanged. Warning reaches only the server log, not the UI |
| 2b | Each job entry has at least 2 bullets | ⚠️ Partial | `check_persuasion_quality()` (`cv_orchestrator.py:4118-4200`) detects thin entries but reports them as info-level findings. The content-selection layer (`_select_content_hybrid`) does not enforce a minimum of 2 bullets per experience |
| 2c | Bullets are ≤2 lines each | ⚠️ Partial | `LLMClient.check_word_count()` (`llm_client.py:1142`) flags bullets over 30 words but is only called during the rewrite phase, not at selection or generation time |
| 2d | Job entries are not split across pages (`page-break-inside: avoid`) | ✅ Pass | `cv-template.html:280` — `.job-entry { page-break-inside: avoid; }`. Also `break-inside: avoid` is present for cross-renderer compatibility |
| 2e | Relevance-ordered bullets within each entry | ✅ Pass | `_select_content_hybrid()` (`cv_orchestrator.py:3196-3211`) sorts `ordered_achievements` by keyword overlap. User can override via drag-drop (`achievement_orders` in customizations) |
| 2f | System warns if a bullet lacks an action verb (per Phase 2.4 refactor) | ⚠️ Partial | The warning is server-side only (`logger.warning` at `cv_orchestrator.py:3954-3956`). No user-visible UI warning is surfaced at generation or review time |

---

### US-M3: Skills Section Readability

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 3a | Skills grouped into named categories on the human-readable PDF | ✅ Pass | `_organize_skills_by_category()` (`cv_orchestrator.py:583-595`) groups skills; `_sort_categories()` (`cv_orchestrator.py:541-581`) organizes them. Template renders `skills_by_category` with `h4` category headings |
| 3b | Categories ordered by relevance to the target role | ✅ Pass | `_sort_categories()` uses `priority_orders` dict with `standard`, `technical`, `academic` variants (`cv_orchestrator.py:555-560`). Custom order from `customizations['skill_category_order']` takes precedence |
| 3c | No duplicate skills (exact match or obvious aliases) | ✅ Pass | `_deduplicate_skills()` (`cv_orchestrator.py:503-531`) deduplicates by canonical synonym name using the synonym map loaded at init |
| 3d | Skills section occupies no more than 1.5 sidebar columns total | ⚠️ Partial | `max_skills` defaults to 20 (config: `generation.max_skills`). No layout-space check prevents the skills section from overflowing its sidebar column; height is purely content-driven |

---

### US-M4: Multi-Page Flow and Readability

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 4a | `page-break-inside: avoid` applied to every job entry; split entries not permitted | ✅ Pass | `cv-template.html:280` `.job-entry { page-break-inside: avoid; }`. Skill groups (`cv-template.html:178`) and publication items also carry equivalent rules |
| 4b | Sidebar content balanced across pages (not empty on any page that has main content) | ⚠️ Partial | The sidebar (contact, skills, education) exists on page 1 only. Pages 2+ are single-column main content. The sidebar does not continue onto subsequent pages, so the "balanced across pages" criterion cannot be met for any multi-page CV |
| 4c | Total page count 2–3 for senior candidate; system warns if 1 or >3 pages | ✅ Pass | `validate_ats_report()` (`cv_orchestrator.py:4921-4942`) warns on 1-page CVs and warns/fails on CVs exceeding `absolute_max` (default 4). Ideal range is configurable, defaulting to 2–3 |
| 4d | Publications included only when flagged as relevant | ✅ Pass | Publications rendered only if `selected_content.get('publications')` is non-empty (`cv-template.html:688`). Inclusion controlled via `publication_decisions` in the customization step |
| 4e | Publications headed "Selected Publications" vs "Publications" correctly | ✅ Pass | `cv-template.html:691-695`: heading is `"Selected Publications"` when `total_publications_count > publications|length`, else `"Publications"`. Same logic in DOCX (`cv_orchestrator.py:4567`) |

---

### US-M5: Visual Identity and Professionalism

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 5a | All fonts embedded in PDF | ✅ Pass | WeasyPrint embeds fonts by default. Template loads Merriweather (serif, candidate name) and Inter (sans-serif, body) via Google Fonts. For Chrome headless, embedding requires network access at generation time |
| 5b | Sidebar background colour present on every page, including pages 2+ | ⚠️ Partial | The sidebar with its differentiated background is rendered on page 1 only. Pages 2+ have no sidebar element; the sidebar background colour is absent from subsequent pages by design |
| 5c | No content clipped at page margins | ✅ Pass | `page_margin` defaults to `'0.5in'` (`cv_orchestrator.py:959, 1104`) and is passed to the template's `@page` rule |
| 5d | Font Awesome icons rendered correctly | ⚠️ Partial | Font Awesome 6 is loaded via CDN in the CV template. No bundled fallback exists — icons render as empty squares if the CDN is unreachable at generation time (offline environments) |
| 5e | PDF passes visual QC: compare rendered page images against a reference screenshot | 🔲 Not Implemented | No automated screenshot comparison is implemented. ATS validation checks PDF structure and page count but not pixel-level visual fidelity |

---

## Part 2 — Generated Materials Evaluation

### US-M6: Cover Letter Tone and Relevance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 6a | Company name and role title appear in paragraph 1 | ✅ Pass | LLM prompt (`master_data_routes.py:1545-1571`) provides `company` and `role` as explicit variables with instruction to write a tailored letter. No post-generation structural check exists, but prompt structure makes this highly likely |
| 6b | At least one company-specific reference (recent initiative, product, or value) if extractable from the job posting | ⚠️ Partial | The prompt passes `req_skills` and `keywords` extracted from `job_analysis`, but does not extract company-specific initiatives or products from the raw job posting text. `answers_snippet` (post-analysis Q&A) may carry company context if the user provided it, but this is not guaranteed |
| 6c | Body paragraphs cite specific, named achievements — not generic claims | ⚠️ Partial | `top_ach_titles` passes up to 4 achievement titles (`master_data_routes.py:1519`). The prompt says "Reference concrete skills and achievements" but achievement body text is not passed — only short titles. Named achievement citations in full are not enforced |
| 6d | Closing paragraph ends with a direct interview request | ⚠️ Partial | Prompt says "Close professionally with a call to action" (`master_data_routes.py:1570`). There is no explicit instruction to include a direct interview request (vs. a vague passive close). The `_OPENING_GUIDANCE` dict controls the opening style only |
| 6e | Length within role-appropriate range: 300–400w standard; 400–500w executive; 500–600w research/academic | ❌ Fail | The prompt hard-codes `~250–300 words` for all tones and roles (`master_data_routes.py:1566`). No role-type-based word-count range is applied. Academic and executive letters will be under-length by 150–300 words |
| 6f | Tone setting applied based on inferred employer type | ✅ Pass | `_TONE_GUIDANCE` dict (`master_data_routes.py:90-96`) provides tone hints for `startup/tech`, `pharma/biotech`, `academia`, `financial`, and `leadership`. Selected tone is injected into the LLM prompt |

---

### US-M7: Selected Publications — Credibility and Relevance Signalling

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 7a | Heading is "Selected Publications" (subset) or "Publications" (full list); never misapplied | ✅ Pass | `cv-template.html:691-695` and `cv_orchestrator.py:4567` both implement identical logic: heading is "Selected Publications" when `total_count > len(publications)`, else "Publications" |
| 7b | Publication count is never shown in the generated CV or ATS document | ✅ Pass | The template and DOCX generator do not emit count notation (e.g. "(4 of 52)"). `template_metadata.total_publications_count` is used internally for heading logic only and is never rendered |
| 7c | Each entry displays: authors (first-author identifiable), title, venue, year — in scan-priority order | ✅ Pass | `_format_publications()` (`cv_orchestrator.py:767-899`) extracts `formatted_citation` (authors, title, venue, year). First-author status is indicated by a ★ star marker (`cv-template.html:708-710`) via the `is_first_author` flag. First author is detected by last-name comparison (`cv_orchestrator.py:887-891`) |
| 7d | Total entry count matches what the applicant confirmed in Customisation — not full `publications.bib` count | ✅ Pass | `_select_content_hybrid()` respects `max_publications` and `publication_decisions` from customizations. `_format_publications()` processes only the curated `selected_content['publications']` subset |
| 7e | "Selected Publications" is always the final section of the CV | ✅ Pass | Publications section is the last `<section>` in `cv-template.html:688-715`, after all Experience content. No mechanism exists to move it earlier |
| 7f | No entry appears without a venue; missing-venue entries flagged to user during Customisation | ⚠️ Partial | `_format_publications()` sets `entry['venue_warning']` (`cv_orchestrator.py:896`) when no venue is found. However, the HTML template (`cv-template.html:698-713`) does not render the `venue_warning` field as a visible indicator. Missing-venue entries are silently emitted into the generated CV |

---

## Terminology Review

| Term used in UI / output | Assessment |
|--------------------------|------------|
| "CV Customizer" (header, `index.html:41`) | Clear and accurate |
| "ATS" (throughout UI) | Jargon — no inline tooltip or glossary |
| "Selected Publications" / "Publications" (heading logic) | Correctly implemented and semantically precise (US-M7a) |
| "Technical Skills" (default skills heading, `cv_orchestrator.py:349`) | Appropriate for technical roles; may not fit management or academic CVs without user override |
| Generic fallback summary text (`cv_orchestrator.py:197`) | "Experienced professional applying for…" — this placeholder text is manager-facing failure mode per US-M1 |

---

## Top Findings

### Critical — directly affects hiring manager's first impression or a key output

1. **US-M6e FAIL — Cover letter word count is uniformly too short for non-standard roles.**  
   The prompt hard-codes `~250–300 words` (`master_data_routes.py:1566`) for all role types. The story requires 400–500w for executive and 500–600w for research/academic. A 250-word academic cover letter signals the candidate did not tailor the submission.

2. **US-M2a / US-M2f — Weak-verb detection is server-side only; hiring manager never benefits.**  
   `_enhance_achievement_for_ats()` (`cv_orchestrator.py:3954-3956`) logs a warning but does not surface it in the UI. Bullets starting with "Responsible for," "Assisted," or no verb pass silently into the final PDF.

3. **US-M5b / US-M4b — Sidebar absent on pages 2+.**  
   The two-column layout with a differentiated sidebar background is page-1 only. Pages 2 and 3 have no sidebar, breaking visual consistency across the document. A hiring manager scanning from page 2 sees a different visual structure.

### Significant — affects credibility or output quality

4. **US-M7f — Missing-venue publication warning not surfaced.**  
   `venue_warning` is computed (`cv_orchestrator.py:896`) but neither the template nor the customization UI renders it. A publication without a journal or conference name will appear in the final CV without any flag, which is a credibility risk in research/scientific roles.

5. **US-M6d — Cover letter close is not enforced as a direct interview request.**  
   The prompt says "call to action" but does not require a specific interview request. Passive closings ("I look forward to hearing from you") will pass through without detection.

6. **US-M1b — Generic fallback summary not blocked.**  
   When the session summary is empty, the generic placeholder (`cv_orchestrator.py:197`) reaches the generated PDF without any UI warning to the user.

### Minor

7. **US-M5d — Font Awesome icons require CDN network access at generation time.** No bundled fallback for offline or server-side generation environments.

8. **US-M5e — No automated visual PDF QC.** ATS validation confirms page count and structure but not pixel-level rendering fidelity.
