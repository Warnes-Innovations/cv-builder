<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Hiring Manager Persona Review (US-M*)

**Reviewer role:** Hiring manager / department head evaluating both the application workflow and the generated human-readable materials.
**Review date:** 2026-06-18
**Cycle:** 3 (source-code direct — no prior review documents used as inputs)
**Source branch:** feature/multi-user-deployment
**Story file:** `tasks/user-story-hiring-manager.md`

---

## Part 1 — Application Evaluation

### US-M1: First Impression — Page 1 Layout

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1a | Page 1 contains name, contact, summary, selected achievements, and education — all visible without scrolling | ✅ Pass | `templates/cv-template.html`: two-column layout renders `.left-col` (contact, skills, education) and `.right-col` (name heading, summary, achievements) as a single body block |
| 1b | Summary is role-specific: contains the job title, years of experience, and one specific differentiator | ⚠️ Partial | `cv_orchestrator.py:197` falls back to `"Experienced professional applying for {title}"` when `selected_content['summary']` is empty — a manager-facing failure. No enforcement mechanism checks that the LLM-generated summary contains all three required elements |
| 1c | Page 1 has no overflow (content does not bleed onto page 2 from the fixed-height section) | ⚠️ Partial | No hard page-height cap is enforced at the data-selection layer. `validate_ats_report()` (`cv_orchestrator.py:4685`) checks total page count post-generation but cannot prevent page-1 overflow |
| 1d | Page 1 has no visibly unbalanced whitespace — both columns appear full or near-full | ⚠️ Partial | No programmatic whitespace-balance check. `max_skills=20` limits sidebar length but no minimum is enforced. Column fill is purely content-volume driven |

**Summary:** Structural skeleton supports all required page-1 elements. Generic fallback summary (1b) is the primary credibility risk; no validator blocks it from reaching the generated PDF.

---

### US-M2: Work Experience — Credibility and Relevance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 2a | Every bullet starts with a strong action verb | ⚠️ Partial | `_enhance_achievement_for_ats()` (`cv_orchestrator.py:3954–3972`) logs a `WARNING` but returns text unchanged. However, `check_persuasion_quality()` now surfaces issues to the user in the Download tab via `_fetchPersuasionHtml()` (`download-tab.js:232–293`) — weak-verb bullets are shown with severity badges and suggestions |
| 2b | Each job entry has at least 2 bullets | ⚠️ Partial | `check_persuasion_quality()` (`cv_orchestrator.py:4118–4200`) detects issues and reports them via the persuasion panel. No minimum-bullet-count enforcement at content-selection time |
| 2c | Bullets are ≤2 lines each | ⚠️ Partial | `LLMClient.check_word_count()` flags bullets over 30 words but only at the rewrite phase; not enforced at generation time |
| 2d | Job entries are not split across pages (`page-break-inside: avoid`) | ✅ Pass | `cv-template.html:280` — `.job-entry { page-break-inside: avoid; }`. Modern `break-inside: avoid` also absent from the job-entry rule but the `page-break-inside` form covers both WeasyPrint and Chrome print |
| 2e | Relevance-ordered bullets within each entry | ✅ Pass | `_select_content_hybrid()` (`cv_orchestrator.py:3196–3211`) sorts `ordered_achievements` by keyword overlap; user can override via drag-drop (`achievement_orders` in customizations) |
| 2f | System warns if a bullet lacks an action verb | ✅ Pass | Weak-verb and no-strong-verb findings surface in the Download tab persuasion panel with `warning`/`info` severity respectively (`download-tab.js:261–282`). This is an improvement from the prior cycle; warnings now reach the user |

**Note from prior cycle (US-M2f):** The previous review marked this ⚠️ Partial because warnings were server-side only. The persuasion panel in the Download tab now surfaces these findings to the user. Status upgraded to ✅ Pass.

---

### US-M3: Skills Section Readability

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 3a | Skills grouped into named categories on the human-readable PDF | ✅ Pass | `_organize_skills_by_category()` (`cv_orchestrator.py:583–595`) groups skills. Template renders `skills_by_category` with `h4` category headings in the sidebar |
| 3b | Categories ordered by relevance to the target role | ✅ Pass | `_sort_categories()` (`cv_orchestrator.py:541–581`) uses `priority_orders` dict (`standard`, `technical`, `academic` variants). Custom order from `customizations['skill_category_order']` takes precedence |
| 3c | No duplicate skills (exact match or obvious aliases) | ✅ Pass | `_deduplicate_skills()` (`cv_orchestrator.py:503–531`) deduplicates by canonical synonym name |
| 3d | Skills section occupies no more than 1.5 sidebar columns total | ⚠️ Partial | `max_skills` defaults to 20 (`config: generation.max_skills`). No layout-space check prevents overflow of the sidebar column; height is purely content-driven |

---

### US-M4: Multi-Page Flow and Readability

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 4a | `page-break-inside: avoid` applied to every job entry; split entries not permitted | ✅ Pass | `cv-template.html:280`: `.job-entry { page-break-inside: avoid; }`. Skill groups (`cv-template.html:178`) and publication items (`cv-template.html:499`) also carry equivalent rules |
| 4b | Sidebar content balanced across pages (not empty on any page that has main content) | ✅ Pass | **Updated this cycle.** The template uses a faux-column gradient technique (Issue #70 fix, `cv-template.html:378–414`): `background-image: linear-gradient(to right, #eef2f5 calc(32% - 1px), ...)` on `#cv-body` with `box-decoration-break: clone` paints the sidebar background on every print page. A `fillLastPage()` JS function (`cv-template.html:827+`) extends the body to cover the last page. Sidebar visually continues across all pages |
| 4c | Total page count 2–3 for senior candidate; system warns if 1 or >3 pages | ✅ Pass | `validate_ats_report()` warns on 1-page CVs and warns/fails on CVs exceeding `absolute_max` (default 4). Ideal range configurable, defaulting to 2–3 |
| 4d | Publications included only when flagged as relevant | ✅ Pass | Publications rendered only if `selected_content.get('publications')` is non-empty (`cv-template.html:688`). Inclusion controlled via `publication_decisions` in the customization step |
| 4e | Publications headed "Selected Publications" vs "Publications" correctly | ✅ Pass | `cv-template.html:691–695`: heading is "Selected Publications" when `total_publications_count > publications|length`, else "Publications". Identical logic in DOCX (`cv_orchestrator.py:4567`) |

**Note from prior cycle (US-M4b):** Previously marked ⚠️ Partial based on the assumption the sidebar only appeared on page 1. The Issue #70 faux-column fix confirms the sidebar background paints on all pages. Status upgraded to ✅ Pass.

---

### US-M5: Visual Identity and Professionalism

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 5a | All fonts embedded in PDF | ✅ Pass | WeasyPrint embeds fonts by default. Template loads Merriweather (serif, candidate name) and Inter (sans-serif, body) via Google Fonts. Chrome headless requires network access at generation time |
| 5b | Sidebar background colour present on every page, including pages 2+ | ✅ Pass | **Updated this cycle.** Same faux-column technique as US-M4b: linear gradient on `#cv-body` with `box-decoration-break: clone` and `print-color-adjust: exact` ensures the sidebar background renders on every page (`cv-template.html:388–400`) |
| 5c | No content clipped at page margins | ✅ Pass | `page_margin` defaults to `'0.5in'` (`cv_orchestrator.py:959, 1104`) and is passed to the template's `@page` rule |
| 5d | Font Awesome icons rendered correctly | ⚠️ Partial | Font Awesome 6 loaded via CDN (`cv-template.html` and `index.html`). No bundled fallback exists — icons render as empty squares if the CDN is unreachable at generation time (server-side WeasyPrint in offline environments) |
| 5e | PDF passes visual QC: compare rendered page images against a reference screenshot | 🔲 Not Implemented | No automated screenshot comparison exists. ATS validation (`validate_ats_report`) checks page count and structure but not pixel-level visual fidelity |

**Note from prior cycle (US-M5b):** Previously marked ⚠️ Partial. The faux-column technique resolves this; sidebar background is present on all pages. Status upgraded to ✅ Pass.

---

## Part 2 — Generated Materials Evaluation

### US-M6: Cover Letter Tone and Relevance

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 6a | Company name and role title appear in paragraph 1 | ✅ Pass | `master_data_routes.py:1529–1530` extracts `company` and `role` from `job_analysis` and passes both explicitly to the LLM prompt. Client-side validation (`cover-letter.js:499–515`) also checks for company name mention count |
| 6b | At least one company-specific reference (recent initiative, product, or value) if extractable from the job posting | ⚠️ Partial | The prompt passes `req_skills` and `keywords` from `job_analysis` but does not extract company-specific initiatives or products from raw job posting text. `answers_snippet` may carry company context if the user provided post-analysis answers, but this is not guaranteed |
| 6c | Body paragraphs cite specific, named achievements — not generic claims | ⚠️ Partial | `top_ach_titles` passes up to 4 achievement titles (`master_data_routes.py:1519`). The prompt says "Reference concrete skills and achievements" but achievement body text is not passed — only short title strings. Full named achievement text is not enforced in the generated letter |
| 6d | Closing paragraph ends with a direct interview request | ⚠️ Partial | Prompt line: `"Close professionally with a call to action."` (`master_data_routes.py:1570`). Client-side CTA check (`cover-letter.js:530–544`) accepts patterns including `hear from you` and `look forward to` — passive closings pass this check. No explicit requirement for a direct interview request |
| 6e | Length within role-appropriate range: 300–400w standard; 400–500w executive; 500–600w research/academic | ❌ Fail | The LLM prompt hard-codes `~250–300 words` for all tones and roles (`master_data_routes.py:1566`). The client-side validator targets `250–400` words uniformly (`cover-letter.js:521–528`). No role-type-based word-count range is applied. Academic and executive letters will be significantly under-length (150–300 words short of the story requirement) |
| 6f | Tone setting applied based on inferred employer type | ✅ Pass | `_TONE_GUIDANCE` dict (`master_data_routes.py:90–96`) provides tone hints for `startup/tech`, `pharma/biotech`, `academia`, `financial`, and `leadership`. Selected tone is injected into the LLM prompt (`master_data_routes.py:1548`) |

---

### US-M7: Selected Publications — Credibility and Relevance Signalling

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 7a | Heading is "Selected Publications" (subset) or "Publications" (full list); never misapplied | ✅ Pass | `cv-template.html:691–695`: heading is "Selected Publications" when `total_publications_count > publications|length`, else "Publications". DOCX follows identical logic (`cv_orchestrator.py:4567`) |
| 7b | Publication count is never shown in the generated CV or ATS document | ✅ Pass | No count notation (e.g. "(4 of 52)") is rendered in the template or DOCX generator. `template_metadata.total_publications_count` is used internally for heading logic only |
| 7c | Each entry displays: authors (first-author identifiable), title, venue, year — in scan-priority order | ✅ Pass | `_format_publications()` (`cv_orchestrator.py:767–899`) extracts `formatted_citation` (authors, title, venue, year). First-author status is indicated by a ★ star marker (`cv-template.html:708–710`) via the `is_first_author` flag. First author is detected by last-name comparison (`cv_orchestrator.py:887–891`) |
| 7d | Total entry count matches what the applicant confirmed in Customisation | ✅ Pass | `_select_content_hybrid()` respects `max_publications` and `publication_decisions` from customizations. Only the curated `selected_content['publications']` subset is processed |
| 7e | "Selected Publications" is always the final section of the CV | ✅ Pass | Publications section is the last `<section>` in `cv-template.html:688–715`, after all Experience content |
| 7f | No entry appears without a venue; missing-venue entries flagged to user during Customisation | ⚠️ Partial | `_format_publications()` computes `entry['venue_warning']` (`cv_orchestrator.py:896`) when no venue is found. However, neither `cv-template.html` nor the customization UI renders this field as a visible indicator to the user. Missing-venue entries are silently emitted into the final CV — a credibility risk for research/scientific roles |

---

## Employment Date Overlap Detection

`_detect_date_overlaps()` (`cv_orchestrator.py:4612–4680`) is implemented and functional:
- Parses dates in six formats plus year-only extraction via regex
- Treats "current"/"present"/"now" as today's date for end dates
- Skips same-company overlaps (promotions, parallel internal roles)
- Stores warnings in `metadata.json` under `date_overlap_warnings`
- **Surfaced to user:** `download-tab.js:330–338` renders a yellow amber banner listing each overlapping pair with their date ranges in the Download tab

The overlap detection works on the *selected* experience entries for the current CV, not the full master data list. This is correct behaviour.

---

## Terminology Review

| Term used in UI / output | Assessment |
|--------------------------|------------|
| "CV Customizer" (header, `index.html:41`) | Clear and accurate |
| "ATS" (throughout UI) | Jargon — no inline tooltip or glossary. Acceptable for a power-user tool but a barrier to first-time users |
| "Selected Publications" / "Publications" (heading logic) | Correctly implemented and semantically precise (US-M7a) |
| "Technical Skills" (default skills heading, `cv_orchestrator.py:349`) | Appropriate for technical roles; may not suit management or academic CVs without user override |
| Generic fallback summary (`cv_orchestrator.py:197`) | `"Experienced professional applying for…"` — this placeholder text is a hiring-manager failure mode per US-M1b if it reaches the generated PDF |
| Cover letter validation label "Word count (250–400)" (`cover-letter.js:526`) | Mismatch with the user story requirement (300–400 standard; 400–500 executive; 500–600 academic). Label is internally consistent but the ceiling is too low for non-standard roles |

---

## Top Findings

### Critical — directly affects hiring manager's first impression or a key output

1. **US-M6e FAIL — Cover letter word count is uniformly under-length for executive and academic roles.**
   The LLM prompt hard-codes `~250–300 words` (`master_data_routes.py:1566`) for all tones. The client-side validator targets `250–400` words uniformly (`cover-letter.js:521–528`). The user story requires 400–500w for executive and 500–600w for research/academic. An academic cover letter at 250 words signals the candidate did not tailor the submission — a direct fail condition for those role types.

2. **US-M1b — Generic fallback summary not blocked from the generated PDF.**
   When `selected_content['summary']` is empty, `cv_orchestrator.py:197` substitutes `"Experienced professional applying for {position}"`. This placeholder can reach the generated PDF without any UI warning. A hiring manager seeing this on page 1 immediately discounts the application.

### Significant — affects credibility or output quality

3. **US-M7f — Missing-venue publication warning not surfaced to user.**
   `entry['venue_warning']` is computed (`cv_orchestrator.py:896`) but neither `cv-template.html` nor the customization UI renders it. A publication without a journal or conference name will appear silently in the final CV — an immediate credibility signal failure for research/scientific roles.

4. **US-M6d — Cover letter CTA check does not require a direct interview request.**
   The client-side check (`cover-letter.js:532–536`) accepts passive patterns like `hear from you` and `look forward to`, which are the exact failure modes listed in the user story. The prompt only says "call to action" — not "request a specific interview."

5. **US-M6c — Achievement body text not passed to cover letter LLM.**
   Only up to 4 achievement titles are provided (`master_data_routes.py:1519`). The prompt instructs the LLM to "reference concrete skills and achievements" but without the bullet text, the LLM generates generic claims rather than named, specific achievements.

### Minor — implementation quality or edge cases

6. **US-M5d — Font Awesome icons require CDN network access at generation time.**
   No bundled fallback for offline or server-side generation environments (WeasyPrint running without external network access).

7. **US-M5e — No automated visual PDF QC.**
   ATS validation confirms page count and structure but not pixel-level rendering fidelity.

8. **US-M2b — Minimum bullet count per job entry not enforced at content selection.**
   The persuasion panel warns about thin entries post-generation but does not prevent a 1-bullet job entry from being included in the final PDF.

---

## Changes from Prior Review Cycle

| Finding | Prior Status | Current Status | Reason |
|---------|-------------|----------------|--------|
| US-M2f: Weak-verb warnings user-visible | ⚠️ Partial | ✅ Pass | Persuasion panel in Download tab (`download-tab.js:232–293`) surfaces weak-verb and no-verb findings with severity badges |
| US-M4b: Sidebar content on pages 2+ | ⚠️ Partial | ✅ Pass | Issue #70 faux-column gradient fix (`cv-template.html:378–414`) paints sidebar background on every print page via `box-decoration-break: clone` |
| US-M5b: Sidebar background on pages 2+ | ⚠️ Partial | ✅ Pass | Same faux-column fix as US-M4b |
| Date overlap: UI visibility | Not checked | ✅ Pass | `download-tab.js:330–338` renders amber banner with overlap details |
