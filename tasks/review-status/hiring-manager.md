<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Hiring Manager Persona Review

**Persona:** US-M* — Hiring Manager / Department Head  
**Cycle:** Source-first review, 2026-07-01; stale AC2.2/AC2.3 corrected 2026-07-04 (cycle 71)  
**Branch:** `feature/multi-user-deployment`

---

## Application Evaluation

### US-M1: First Impression — Page 1 Layout

**AC1.1** Page 1 contains name, contact, summary, selected achievements, and education — all visible without scrolling.

✅ **Pass** — `cv-template.html:639–683` renders name (`<h1 class="name">`), contact block (`.contact-info`, lines 527–563), education sidebar (`.sidebar-section` lines 565–574), professional summary (`<section class="section">`, lines 647–652), and selected achievements (`<section class="section">`, lines 654–663) all within `#cv-body`. Page 1 is the opening viewport of the single continuous column body.

**AC1.2** Summary is role-specific: contains the job title or near-equivalent, years of experience, and one specific differentiator.

⚠️ **Partial** — The orchestrator (`cv_orchestrator.py:1688`) applies approved summary rewrites from the LLM-generated summary, and `agent_bridge.py:219–221` instructs the LLM to generate "a 3-5 sentence plain-text summary." The backend builds the summary prompt with job analysis data (title, required skills, ATS keywords) injected via `build_render_ready_content`, so the LLM receives role context. However, there is no explicit post-generation validation that confirms the output contains the job title, a years-of-experience figure, and a differentiator. The quality of role-specificity is entirely LLM-dependent with no enforcement gate.

**AC1.3** Page 1 has no overflow.

⚠️ **Partial** — `cv_orchestrator.py` runs staged-generation layout estimation (`layout_digest.py` referenced at line 68–70 in the template comment). The ATS validation in `cv_orchestrator.py:5026–5040` checks page count but does not specifically verify that page 1 content does not bleed. The layout estimator produces a heuristic character count, not a pixel-accurate measurement. No per-page pixel overflow check exists.

**AC1.4** Page 1 has no visibly unbalanced whitespace (neither column ends with >~2 cm blank area).

🔲 **Not Implemented** — No automated check for column-balance whitespace exists in any of the source files reviewed. Page count is validated (`cv_orchestrator.py:5020–5040`) but column balance within page 1 is not measured.

---

### US-M2: Work Experience — Credibility and Relevance

**AC2.1** Every bullet starts with a strong action verb.

✅ **Pass** — Backend: `cv_orchestrator.py:3963–3981` (`_enhance_achievement_for_ats`) checks the opening word against `_STRONG_VERBS_LOWER` (line 3999) and logs a warning when the check fails. The `check_persuasion` method (lines 4140–4218) flags `weak_verb` and `no_strong_verb` findings; commit `ae04e11` (GAP-17) also added repeated opening-verb detection — when the same verb opens ≥3 bullets in one experience entry, subsequent occurrences are flagged as `repeated_verb` with severity `warning`. Frontend: `achievements-review.js:524–571` shows inline `⚠ Weak opening verb` badges in the Experience Bullets tab; `spell-check.js` now shows a pre-generation advisory count of weak-verb bullets before the user proceeds (GAP-09, commit `cb20ed8`); and `rewrite-review.js:101–116` surfaces persuasion warnings at the Rewrites stage requiring acknowledgment before proceeding.

**AC2.2** Each job entry has at least 2 bullets.

✅ **Pass (stale — cycle 71)** — `_detect_sparse_experiences()` at `cv_orchestrator.py:5100` (`min_bullets=2`) returns warnings for entries with fewer than 2 selected bullets. Called at line 2114; results included in metadata at line 2258. `download-tab.js:417–426` renders a yellow warning card: "Sparse experience entries (N) — fewer than 2 bullets: {company · title — 0 or 1 bullet selected}. Include at least 2 bullets per role to demonstrate impact."

**AC2.3** Bullets are ≤2 lines each.

✅ **Pass (stale — cycle 71)** — `_detect_long_bullets()` at `cv_orchestrator.py:5075` (`max_chars=200`) returns warnings for bullets exceeding 200 characters ("Long bullets typically wrap to 3+ lines in the generated DOCX"). Called at line 2111; results in metadata at line 2257. `download-tab.js:406–415` renders a yellow warning card: "Long bullet points detected (N) — may exceed 2 lines: {company · title (N chars) text}. Consider shortening — aim for ≤200 characters."

**AC2.4** Job entries are not split across pages (`page-break-inside: avoid`).

✅ **Pass** — `cv-template.html:278–281` applies `page-break-inside: avoid` to `.job-entry`. `cv-style.css:91–93` applies the same rule to `.experience-item`. Both the HTML template and standalone CSS stylesheet enforce this rule.

**AC2.5** Relevance-ordered bullets within each entry (most relevant first, per content customisation step).

✅ **Pass** — `cv_orchestrator.py:3179–3221` implements per-experience bullet ordering. By default, bullets are sorted descending by keyword-overlap relevance score (`_ach_relevance`, line 3208–3216). User manual reordering is preserved via `achievement_orders` in customizations (lines 3184–3206). The template (`cv-template.html:675–681`) renders `ordered_achievements` when present.

**AC2.6** System warns if a bullet lacks an action verb.

✅ **Pass** — Backend `cv_orchestrator.py:4165–4173` generates `no_strong_verb` findings. Backend `ae04e11` (GAP-17) adds `repeated_verb` findings for ≥3 same-verb occurrences per experience. Frontend `achievements-review.js:542–571` shows inline verb badges in the Experience Bullets editor. `spell-check.js` pre-generation modal counts and shows weak-verb bullets (GAP-09). `rewrite-review.js:104–116` surfaces backend persuasion warnings at the Rewrites stage with acknowledgment gate.

---

### US-M3: Skills Section Readability

**AC3.1** Skills grouped into named categories on the human-readable PDF.

✅ **Pass** — `cv_orchestrator.py:533–595` (`_group_skills_by_category`, `_organize_skills_by_category`) groups skills by `category` field. `cv-template.html:610–635` renders each category as `<div class="skill-group"><h4>{{ cat.category }}</h4><ul class="skill-list">…</ul></div>`.

**AC3.2** Categories ordered by relevance to the target role.

✅ **Pass** — `cv_orchestrator.py:541–580` (`_sort_categories`) applies variant-specific priority orders (`standard`, `technical`, `academic`) and falls back to remaining categories alphabetically. The user can further specify `skill_category_order` in customizations (line 3469). For standard variant, priority is `['Core Expertise', 'Programming', 'Technical', 'Tools', 'General']`. Additionally, commit `4c90a09` (GAP-11) adds role-aware category ordering in the Skills review table: each category is scored by how many of its skills appear in the job's `required_skills` (2 pts) or `nice_to_have_skills` (1 pt), with categories sorted highest-scoring first in the review UI, giving the user an informed view of what to prioritize.

**AC3.3** No duplicate skills (exact match or obvious aliases).

✅ **Pass** — `cv_orchestrator.py:590–595` calls `_deduplicate_skills` before grouping. The deduplication logic uses canonical synonym matching.

**AC3.4** Skills section occupies no more than 1.5 sidebar columns total.

🔲 **Not Implemented** — No measurement or enforcement of the 1.5-sidebar-column size cap exists. `max_skills` parameter (lines 907, 2020, 2230) caps skill count but does not relate to a rendered column height check.

---

### US-M4: Multi-Page Flow and Readability

**AC4.1** `page-break-inside: avoid` applied to every job entry; split entries not permitted.

✅ **Pass** — `cv-template.html:278–281` (`page-break-inside: avoid` on `.job-entry`) and `cv-style.css:91–93` (`page-break-inside: avoid` on `.experience-item`) both enforce this. The template also applies `break-after: avoid-page; page-break-after: avoid` to `.section-title` (line 244–245) plus a "keep-together" rule for the title and first content block (lines 249–256).

**AC4.2** Sidebar content is balanced across pages (not empty on any page that has main content).

⚠️ **Partial** — The template uses a faux-column technique (`cv-template.html:381–401`): a `background-image: linear-gradient` on `#cv-body` paints the sidebar background color across all print pages even when sidebar content ends before the right column. This ensures visual balance (sidebar background fills the page height), but it does not ensure sidebar *content* appears on every page. If the sidebar has no content on page 2 (which is typical since sidebar has contact/education/awards fixed on page 1), the gradient fakes the visual but no actual sidebar items appear on subsequent pages. The user story specifies "Sidebar content is balanced across pages (not empty on any page that has main content)" — the current implementation satisfies the visual color balance but not the content balance criterion.

**AC4.3** Total page count is 2–3 for a senior candidate; system warns if output is 1 or >3 pages.

✅ **Pass** — `cv_orchestrator.py:5020–5040` validates page count against configurable `ideal_min` (default 2), `ideal_max` (default 3), and `absolute_max` (default 4). A single page triggers `warn`; above `absolute_max` triggers `fail`. The ATS report surfaces these findings to the user. Commit `cb20ed8` (GAP-05) additionally promotes this from advisory to a hard blocking gate: `_confirmProceedToGenerate()` in `web/spell-check.js` now shows a dedicated confirm dialog when `pageWarning` is set; the user must explicitly acknowledge before generation can proceed.

**AC4.4** Publications included only when flagged as relevant for the role type.

⚠️ **Partial** — `cv_orchestrator.py:3416–3460` selects publications by relevance scoring (recency, article type, keyword overlap) but does not gate publication inclusion on role type. Publications are always included when `self.publications` is non-empty, unless the user explicitly rejects them via `rejected_publications` in customizations (line 3418). The story criterion requires automatic suppression for non-research roles; this requires user action rather than automatic role-type gating.

**AC4.5** When publications are included, the section is headed "Selected Publications" — not "Publications" — signalling deliberate curation.

⚠️ **Partial** — The heading logic at `cv-template.html:691–695` applies "Selected Publications" only when `total_publications_count > (publications | length)` (i.e., a subset was selected). When all publications are included, the heading reads "Publications." This is correct per US-M7 (which specifies the *opposite* rule: "Selected Publications" only when a subset). However, for AC4.5 as stated in US-M4, the heading is "Selected Publications" only if some were filtered out — which is implementation-correct per the story specification.

---

### US-M5: Visual Identity and Professionalism

**AC5.1** All fonts embedded in the PDF.

⚠️ **Partial** — WeasyPrint embeds fonts by default when the font files are available at render time. `cv_orchestrator.py:1269–1395` uses Chrome headless as primary with WeasyPrint as fallback. The template loads Google Fonts from a CDN (`cv-template.html:22`). In offline or headless environments, CDN fonts may not be available, causing fallback to system fonts that may not be embedded. No explicit verification step checks that fonts are embedded in the output PDF.

**AC5.2** Sidebar background colour present on every page, including pages 2+.

✅ **Pass** — `cv-template.html:381–401` implements the faux-column gradient technique with `-webkit-box-decoration-break: clone; box-decoration-break: clone` ensuring the sidebar background gradient is reproduced on every page fragment in print. Both `-webkit-print-color-adjust: exact` and `print-color-adjust: exact` are applied.

**AC5.3** No content clipped at page margins.

⚠️ **Partial** — Page margins are controlled by the `--page-margin` CSS variable (default `0.5in`, `cv-template.html:33`) and applied via `@page { margin: var(--page-margin) }` (line 447–448). The layout review step allows the user to adjust margins. No automated clipping detection exists.

**AC5.4** Font Awesome icons rendered correctly.

⚠️ **Partial** — `cv-template.html:21` loads Font Awesome 6 from `cdnjs.cloudflare.com`. In a network-available environment this works. For offline/headless PDF generation, the CDN font may not be available, causing icon glyphs to render as empty squares. No bundled Font Awesome fallback is included in the template.

**AC5.5** PDF passes visual QC against a reference screenshot.

🔲 **Not Implemented** — No automated visual QC comparing rendered page images against a reference screenshot exists in any reviewed source file.

---

### US-M6: Cover Letter Tone and Relevance

**AC6.1** Company name and role title appear in paragraph 1.

⚠️ **Partial** — `master_data_routes.py:1608–1631` constructs the cover letter prompt with company name and role in the "TARGET ROLE" block. The prompt instructs the LLM to write "3–4 paragraphs" and to close with a specific interview request. However, there is no post-generation validation that the company name and role title appear specifically in paragraph 1. The client-side validator (`cover-letter.js:524–540`) checks that the company name appears at least once, but does not verify it is in paragraph 1.

**AC6.2** At least one company-specific reference if extractable from the job posting.

✅ **Pass** — `cover-letter.js:130–134` provides a `cl-company-context` textarea for the user to paste company-specific initiatives/products/values. `master_data_routes.py:1586–1589` injects this as `COMPANY CONTEXT` into the prompt with explicit instruction to "weave these specifics into the letter" (line 1629). This is user-facilitated rather than automatically extracted, but the mechanism is present and functional.

**AC6.3** Body paragraphs cite specific, named achievements — not generic claims.

⚠️ **Partial** — `master_data_routes.py:1592–1601` injects up to 5 approved rewrite bullets into the prompt as "TAILORED CV BULLETS (approved by candidate — reference at least one in the letter)." The prompt also includes top achievements from the master data (`top_ach_titles`, lines 1549–1560). The client-side validator (`cover-letter.js:606–620`) checks for quantified achievements (percentages, dollar amounts, action verbs). However, there is no enforcement that the LLM actually uses named achievements rather than generic paraphrasing.

**AC6.4** Closing paragraph ends with a direct interview request.

✅ **Pass** — `master_data_routes.py:1630` explicitly instructs: "Close with a specific, confident request for an interview or a conversation about the role. Name the role explicitly. Avoid passive language such as 'I look forward to hearing from you.'" The client-side validator (`cover-letter.js:578–603`) checks the last paragraph for assertive CTA patterns (interview, discuss, available for) and warns on passive closings.

**AC6.5** Length within range: 300–400w standard; 400–500w executive; 500–600w research/academic.

✅ **Pass** — `master_data_routes.py:111–122` (`_cover_letter_word_count_instruction`) returns the correct range based on role_level and domain. The range is injected into the prompt (line 1625). Client-side validator (`cover-letter.js:543–576`) applies the same role-differentiated targets with a progress bar and pass/warn/fail status.

**AC6.6** Tone setting applied based on inferred employer type.

✅ **Pass** — `master_data_routes.py:97–103` defines `_TONE_GUIDANCE` for five employer types (startup/tech, pharma/biotech, academia, financial, leadership). `cover-letter.js:19–25` exposes all five tones in the UI dropdown. The selected tone's guidance is injected into the LLM prompt (`master_data_routes.py:1569`, line 1606). The user selects the tone rather than it being automatically inferred, but the mapping is complete and applied correctly.

---

## Generated Materials Evaluation

### US-M7: Selected Publications — Credibility and Relevance Signalling

**AC7.1** Section heading is "Selected Publications" when a subset is shown; "Publications" when all are shown.

✅ **Pass** — HTML template: `cv-template.html:691–695` renders "Selected Publications" when `total_publications_count > (publications | length)`, otherwise "Publications." ATS DOCX: `cv_orchestrator.py:4586–4591` applies the same logic. ATS validator: `cv_orchestrator.py:4874–4889` validates that the DOCX heading is either "Publications" or "Selected Publications" — `_allowed = {'Publications', 'Selected Publications'}` (line 4880). GAP-218 is confirmed resolved.

**AC7.2** Publication count never shown in the generated CV or ATS document (no "(4 of 52)" or similar suffix).

✅ **Pass** — The `.pub-count` CSS class is defined in `cv-template.html:503` but never instantiated as a rendered element in the template body. The template heading (lines 691–695) contains only the heading text and no count suffix. The ATS DOCX heading (line 4590–4591) similarly omits any count notation. No `(N of M)` or similar pattern appears in either template.

**AC7.3** Each entry displays: authors, title, venue, year — in that order of scan priority.

✅ **Pass** — `cv_orchestrator.py:813–896` formats publications via `format_publication` (APA style from `bibtex_parser.py`) and the `formatted_citation` field is used in both the HTML template (`cv-template.html:702–707`) and DOCX generation (`cv_orchestrator.py:4593–4603`). The APA citation format places authors, title, journal/venue, and year in standard order. First-author status is marked with a `★` indicator (`cv-template.html:708–710`) when `pub.is_first_author` is set (orchestrator line 888–892).

**AC7.4** Total entry count matches what the applicant confirmed in the Customisation step.

✅ **Pass** — `cv_orchestrator.py:3428–3440` preserves accepted_publications from the user's explicit confirmation: when `accepted_pubs` is not None, only the keys in `accepted_pubs` (minus `rejected_pubs`) are included. The order is also preserved per the user's decision.

**AC7.5** Selected Publications is always the final section of the CV.

✅ **Pass** — `cv-template.html:688–715` renders the publications section as the last `<section>` element in `<main class="right-col">`, after Experiences. The template structure guarantees this ordering: Summary → Achievements → Experience → Publications. No mechanism allows publications to appear before experience.

**AC7.6** No entry appears without a venue — entries missing a venue are flagged during Customisation.

⚠️ **Partial** — `cv_orchestrator.py:894–896` sets `entry['venue_warning']` to a non-empty string when no venue is found. This flag propagates to the publications-review tab: `publications-review.js:138` renders a `⚠` icon (with tooltip) in the UI when `pub.venue_warning` is truthy. However, the flag is informational only — it does not block the user from accepting a venue-less publication, and the HTML/DOCX template does not visually distinguish venue-less entries for the hiring manager reading the output. The criterion "flagged to the user during Customisation rather than silently rendered without venue" is met for the UI, but silently rendered without warning in the generated PDF/DOCX.

---

## Summary Table

| Story | Criterion | Status |
|-------|-----------|--------|
| US-M1 | Page 1 complete: name, contact, summary, achievements, education visible | ✅ Pass |
| US-M1 | Summary is role-specific (job title, years, differentiator) | ⚠️ Partial |
| US-M1 | Page 1 no overflow | ⚠️ Partial |
| US-M1 | Page 1 no unbalanced whitespace | 🔲 Not Implemented |
| US-M2 | Every bullet starts with strong action verb | ✅ Pass |
| US-M2 | Each job entry has ≥2 bullets | ✅ Pass (stale corrected cycle 71) |
| US-M2 | Bullets ≤2 lines each | ✅ Pass (stale corrected cycle 71) |
| US-M2 | Job entries not split across pages | ✅ Pass |
| US-M2 | Relevance-ordered bullets within each entry | ✅ Pass |
| US-M2 | System warns if bullet lacks action verb | ✅ Pass |
| US-M3 | Skills grouped into named categories | ✅ Pass |
| US-M3 | Categories ordered by relevance to role | ✅ Pass |
| US-M3 | No duplicate skills | ✅ Pass |
| US-M3 | Skills section ≤1.5 sidebar columns | 🔲 Not Implemented |
| US-M4 | page-break-inside: avoid on job entries | ✅ Pass |
| US-M4 | Sidebar content balanced across pages | ⚠️ Partial |
| US-M4 | Page count 2–3, hard gate if 1 or >3 (GAP-05 resolved) | ✅ Pass |
| US-M4 | Publications only when role-relevant | ⚠️ Partial |
| US-M4 | Publications heading correct (Selected vs full) | ⚠️ Partial |
| US-M5 | Fonts embedded in PDF | ⚠️ Partial |
| US-M5 | Sidebar background on every page | ✅ Pass |
| US-M5 | No content clipped at margins | ⚠️ Partial |
| US-M5 | Font Awesome icons rendered | ⚠️ Partial |
| US-M5 | PDF visual QC against reference | 🔲 Not Implemented |
| US-M6 | Company name + role title in paragraph 1 | ⚠️ Partial |
| US-M6 | Company-specific reference in letter | ✅ Pass |
| US-M6 | Body cites specific named achievements | ⚠️ Partial |
| US-M6 | Closing ends with direct interview request | ✅ Pass |
| US-M6 | Length within role-differentiated word range | ✅ Pass |
| US-M6 | Tone applied based on employer type | ✅ Pass |
| US-M7 | Section heading correct (Selected vs full) | ✅ Pass |
| US-M7 | No count notation in heading | ✅ Pass |
| US-M7 | Each entry: authors, title, venue, year | ✅ Pass |
| US-M7 | Count matches applicant confirmation | ✅ Pass |
| US-M7 | Publications always final section | ✅ Pass |
| US-M7 | Venue-less entries flagged during Customisation | ⚠️ Partial |

---

## Open Issues Identified

**GAP-NEW-HM-01** — `🔲` No minimum-bullet-count enforcement (US-M2 AC2.2): The system does not warn or block when a job entry has fewer than 2 bullets. Add a check in `check_persuasion` or the pre-generation validation step.

**GAP-NEW-HM-02** — `🔲` No bullet line-length enforcement (US-M2 AC2.3): No rendered-line-count check on individual bullets exists. Could be addressed by a word-count heuristic (e.g., >35 words suggests multi-line) as an approximation.

**GAP-NEW-HM-03** — `🔲` Skills section size not enforced (US-M3 AC3.4): No check verifies that the skills section fits within 1.5 sidebar columns. The `max_skills` parameter caps count but not rendered height.

**GAP-NEW-HM-04** — `🔲` No automated column-balance whitespace check (US-M1 AC1.4): The layout estimator does not detect large bottom-of-column blank areas. Requires pixel-level measurement or a layout-digest heuristic.

**GAP-NEW-HM-05** — `⚠️` Font Awesome and Google Fonts depend on CDN availability at PDF render time (`cv-template.html:21-22`): In offline or headless server environments, icons render as empty squares and fonts fall back to system fonts. Consider bundling FA and Inter/Merriweather font files.

**GAP-NEW-HM-06** — `⚠️` Publications not automatically suppressed for non-research roles (US-M4 AC4.4): The system selects and scores publications by relevance, but always includes them if present. An explicit role-type gate (suppressing publications for pure business/leadership/industry roles) is not implemented.

**GAP-NEW-HM-07** — `⚠️` Cover letter paragraph-1 company/role verification not enforced (US-M6 AC6.1): The backend prompt instructs the LLM but no post-generation check confirms that company name and role title appear in the first paragraph. Add a validation step in `_validateCoverLetter` to locate these terms in the first non-empty paragraph.

**GAP-NEW-HM-08** — `⚠️` Venue-less publications render without warning in generated PDF/DOCX (US-M7 AC7.6): The `venue_warning` flag surfaces in the Publications review UI but does not produce a visible marker in the generated output. Consider blocking acceptance of venue-less entries or rendering a visible `[venue unavailable]` placeholder in the DOCX.
