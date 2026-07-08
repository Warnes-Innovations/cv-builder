<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Hiring-Manager Review Status

**Last Updated:** 2026-07-07 20:16 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### US-M1: First Impression — Page 1 Layout

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|-------------------------|
| 1 | Name, contact, summary, achievements, education all visible on page 1 | ✅ | `templates/cv-template.html:524-720` — single `#cv-body` two-column layout: left-col (contact/education/awards/certs/languages/skills), right-col (header/name, summary, achievements, experience). |
| 2 | Summary is role-specific (job title, years of experience, differentiator) | ✅ | `scripts/utils/cv_orchestrator.py:4072-4140` `_validate_summary()` — check 5 (job title, 4121-4131), check 6 (years-of-experience regex, 4133-4138), check 4 (top-3 required skills, 4107-4119). |
| 2b | Summary must not be generic boilerplate | ⚠ Partial | No generic/vague-phrase detector exists for the CV **summary**. `_validate_summary()` (cv_orchestrator.py:4072-4140) has no equivalent of the cover letter's `_CL_FILLER` list (`web/cover-letter.js:739-747`, which *does* include "seasoned professional", "passionate about", etc.). The story's own named failure mode ("seasoned professional with diverse experience") is guarded for cover letters but not for the CV summary. |
| 3 | Page 1 has no overflow | ⚠ Partial / at risk | `scripts/utils/layout_digest.py:62-72` selects `#page-one .left-col`, `#page-two .job-entry`, `#page-two .skill-group`, `#page-two .pub-item`, etc. — none of these IDs exist in the current template, which uses a single continuous `#cv-body` div (`templates/cv-template.html:66-72`, "Issue #70: unified continuous layout"). `build_layout_digest()` therefore always returns empty/zero counts, `template_markers` are always `False`, and `compare_layout_digests()` (layout_digest.py:265-278) drives confidence below `LOW_CONFIDENCE_THRESHOLD` almost every time, forcing `needs_exact_recheck=True` (`scripts/routes/generation_routes.py:954-959`). The exact-recheck fallback means the page-count *number* shown to the user is not silently wrong, but the fast delta-estimate + "contributors" explanation used during interactive Layout Review is effectively non-functional, and every layout tweak pays for a full re-render instead of the fast estimate the code was designed to give. Both files carry an explicit contract comment ("Update `layout_digest.py` … whenever this page topology changes") that was not honoured during the Issue #70 refactor. |
| 4 | No visibly unbalanced whitespace between columns | 🔲 Not Implemented | No automated column-balance/whitespace check found anywhere in `cv_orchestrator.py` or the layout-review code; the story itself frames this as a "visual QC guideline," and none of the automated checks (`_ats_checks`, `layout_digest`) inspect rendered whitespace. |

### US-M2: Work Experience — Credibility and Relevance

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|-------------------------|
| 1 | Every bullet starts with a strong action verb | ✅ | `cv_orchestrator.py:4655-4681` (`_STRONG_VERBS`/`_WEAK_VERBS`), `check_persuasion()` 4804-4970 flags `weak_verb`/`no_strong_verb` per bullet. |
| 2 | Each job entry has ≥2 bullets | ✅ (advisory) | `check_persuasion()` sparse-experience advisories, `cv_orchestrator.py:4971-5002` (0 bullets → warn, 1 bullet → info); surfaced to the user in `web/download-tab.js:463-469`. Advisory only — not a hard block at Finalise. |
| 3 | Bullets ≤2 lines | ✅ (advisory) | `check_persuasion()` "too_long" at >35 words (`cv_orchestrator.py:4897-4905`); a stricter char-based check (`long_bullet_warnings`, ≤200 chars for clean 2-line DOCX rendering) is surfaced in `web/download-tab.js:452-461`. |
| 4 | Job entries not split across pages | ✅ | `templates/cv-template.html:280` `.job-entry { page-break-inside: avoid; }`. |
| 5 | Relevance-ordered bullets (most relevant first) | ✅ | `cv_orchestrator.py:3696-3739` — default keyword-overlap relevance sort, overridable per-experience via applicant's `achievement_orders` (drag-reorder UI). |
| 6 | System warns if a bullet lacks an action verb | ✅ | `cv_orchestrator.py:4633-4651` `_enhance_achievement_for_ats()` logs a warning; `check_persuasion()` issues structured findings for the same condition. |

### US-M3: Skills Section Readability

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|-------------------------|
| 1 | Skills grouped into named categories | ✅ | `templates/cv-template.html:611-637` `.skill-group` per category. |
| 2 | Categories ordered by relevance to the role | ⚠ Partial | `cv_orchestrator.py:551-591` `_sort_categories()` uses either the applicant's manually-reordered `skill_category_order` (`web/skills-review.js:1073-1090` drag-reorder) or one of three **hardcoded** generic priority lists (`standard`/`technical`/`academic`, lines 565-569) keyed off template variant — not a per-job relevance score. Ordering is either manual curation or a coarse static default, not automatic job-relevance ranking. |
| 3 | No duplicate skills (exact or alias) | ✅ | `cv_orchestrator.py:513-541` `_deduplicate_skills()` merges by canonical/alias name. |
| 4 | Skills section ≤1.5 sidebar columns | 🔲 Not Implemented | `max_skills` (default 20, `cv_orchestrator.py:3614`) caps item *count*, not physical space; no character/column-based cap exists. Settings UI (`web/index.html:643-645`) allows Max Skills up to 100 with no warning about sidebar overflow. |

### US-M4: Multi-Page Flow and Readability

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|-------------------------|
| 1 | `page-break-inside: avoid` on every job entry | ✅ | Same evidence as US-M2.4. |
| 2 | Sidebar content balanced across pages (not empty where main has content) | ⚠ Partial | The faux-column CSS technique (`templates/cv-template.html:378-414`, `box-decoration-break: clone`) guarantees the sidebar **background colour** continues on every printed page, but there is no code-level guarantee sidebar **content** (education/awards/skills) extends to match the right column's length. If left-column text runs out before the right column does, later pages show a coloured-but-textually-empty sidebar band — satisfies the *background* requirement (US-M5) but not fully the *content-balance* requirement here. |
| 3 | Total page count 2–3; warns if 1 or >3 | ✅ | `cv_orchestrator.py:6313-6336` — exact PDF-page-count check (`cv_page_count`) with configurable `ideal_min`/`ideal_max`/`absolute_max` (defaults 2/3/4); warns at 1 page, warns at >3 (≤4), fails at >4. |
| 4 | Publications only when relevant | ✅ | `scripts/utils/conversation_manager.py:805-824` — explicit Yes/No inclusion prompt gated on `has_publications` and inferred domain. |
| 5 | "Selected Publications" heading only when a subset is shown | ✅ | `templates/cv-template.html:690-696` and `cv_orchestrator.py:5141-5146` (ATS DOCX) both derive the heading from `total_publications_count > len(publications)`. |

### US-M5: Visual Identity and Professionalism

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|-------------------------|
| 1 | Consistent colour scheme (navy/blue/grey/border) | ✅ | `templates/cv-template.html:24-33` CSS custom properties. |
| 2 | Serif name / sans-serif body typography | ✅ | `templates/cv-template.html:210-227` (Merriweather name, Inter body). |
| 3 | Uppercase section titles with rule | ✅ | `templates/cv-template.html:233-246`. |
| 4 | Icon-prefixed contact fields | ✅ | `templates/cv-template.html:530-563` (Font Awesome icons per contact field). |
| 5 | Custom-styled bullets | ✅ | `templates/cv-template.html:332-340` (accent-coloured `::before` bullet glyph). |
| 6 | No pagination artefacts; sidebar bg on every page | ✅ | Faux-column gradient technique, `templates/cv-template.html:378-414`. |
| 7 | Fonts embedded in the PDF | ✅ | `cv_orchestrator.py:6271-6311` — dedicated `pdf_fonts_embedded` check walks each page's `/Font` resources for a `/FontDescriptor` with an embedded `/FontFile*`. |
| 8 | Font Awesome icons render correctly | ⚠ Partial / operational risk | Font Awesome and Google Fonts (Merriweather/Inter) are loaded exclusively from external CDNs (`templates/cv-template.html:21-22`, `cdnjs.cloudflare.com`, `fonts.googleapis.com`) — no local/bundled font file was found anywhere in `cv_orchestrator.py`. The story text explicitly allows "requires network or bundled font file," so this is not a hard failure of the letter of the criterion, but on a server without outbound internet access at PDF-generation time (a real possibility for the `feature/multi-user-deployment` branch's server-hosted deployment model), icons render as empty squares and the display font silently falls back — exactly the two failure modes the story names. |
| 9 | PDF passes visual QC vs. reference screenshot | 🔲 Not Implemented | No automated screenshot-diff / visual regression check found in the codebase. |

### US-M6: Cover Letter Tone and Relevance

This is the most thoroughly-covered story in the codebase — effectively a full pass, with checks that exceed the story's own bar.

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|-------------------------|
| 1 | Company name + role title in paragraph 1 | ✅ | `web/cover-letter.js:635-657` `para1Check` — fails/warns if either is missing from the first body paragraph. |
| 2 | Company-specific reference | ✅ | `web/cover-letter.js:610-633` `substanceCheck` — keyword-overlap between applicant-entered company context and letter text. |
| 3 | Body cites specific/named achievements | ✅ | `web/cover-letter.js:721-736` `achievementCheck` (quantified/named-achievement regexes). |
| 4 | Closing = direct interview request, not passive | ✅ | `web/cover-letter.js:694-719` `ctaCheck` — explicitly **fails** passive closings ("I look forward to hearing from you") and requires an assertive CTA ("interview", "contact me", etc.). |
| 5 | Length 300–400 / 400–500 / 500–600 by role type | ✅ | `web/cover-letter.js:659-692` — role-differentiated word-count targets that match the story's numbers exactly (standard/executive/academic). |
| 6 | Tone setting by employer type | ✅ | `web/cover-letter.js:64` `COVER_LETTER_TONES` selectable dropdown (startup/pharma/academic/financial etc.). |
| Extra | Generic-opening / filler-phrase / "I-first" gates | ✅ (exceeds story) | `web/cover-letter.js:552-569` (generic salutation), 571-587 ("I"-first body gate), 739-757 (filler-phrase list: "results-driven", "seasoned professional", etc.). |

### US-M7: Selected Publications — Credibility and Relevance Signalling

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|-------------------------|
| 1 | Heading "Selected Publications" only when a subset is shown | ✅ | Same evidence as US-M4.5, plus DOCX path. |
| 2 | Publication count never shown in the generated CV/ATS doc | ✅ | `.pub-count` CSS class is defined (`templates/cv-template.html:503`) but not referenced anywhere in the template body markup; the ATS DOCX generator (`cv_orchestrator.py:5138-5154`) emits plain citation text with no "(N of M)" suffix. |
| 3 | Each entry shows authors/title/venue/year, in scan-priority order | ✅ | `formatted_citation` construction, `cv_orchestrator.py:882-887`: `f"{authors}. {title}. {venue_text} ({year})."`. |
| 4 | Entry count matches Customisation-confirmed selection, not full `.bib` | ✅ | `cv_orchestrator.py:3975-3992` — `accepted_pubs`/`rejected_pubs` honour the applicant's per-publication accept/reject decisions from the Customisation step. |
| 5 | Selected Publications always the final section | ✅ | Structural position confirmed — last conditional section in the template's main column, `templates/cv-template.html:689-719`. |
| 6 | Missing-venue entries flagged during Customisation, not silently rendered | ⚠ Partial | The system does **not** silently render without a venue (good) — but instead of catching this purely during Customisation, it bakes a visible `⚠ [venue unavailable]` glyph directly into the **final human-readable HTML/PDF** (`templates/cv-template.html:712-714`, `.pub-venue-warning`) and into the ATS DOCX (`" [venue unavailable]"` suffix, `cv_orchestrator.py:5150-5151`). A separate `publication_warnings` list is surfaced at the File-Review/Finalise stage (`web/download-tab.js:441-450`, "Add missing journal or conference names… before submitting"), so the applicant *is* warned before archiving — but nothing in the pipeline blocks generation or strips the glyph, so an applicant who dismisses that late-stage warning can still send a hiring manager a CV containing a visible defect marker rather than either a clean entry or an excluded one. This is arguably worse for credibility than the failure mode the story is trying to prevent. |
| 7 | First-author visibility | ✅ | `is_first_author` detection (`cv_orchestrator.py:904-910`) rendered as a `★` "First author" mark (`templates/cv-template.html:709-711`). |

### Finalise / Archive Workflow (Cycles 102–103 re-check)

Specifically re-verified per the task's request, since this tab was recently made reachable for the first time.

| Aspect | Status | Notes / File:Line refs |
|--------|--------|-------------------------|
| Reachability | ✅ | `web/index.html:151` (`step-finalise` nav item) and `:235` (`tab-finalise`) exist in the normal step sequence (Interview Prep → Thank You → **Finalise** → Update Master CV). `web/app.js:156-162` wires a dedicated "📦 Archive Application" action button to `switchTab('finalise')` — no longer a dead-end/unreachable tab. |
| Readiness checklist | ✅ | `web/finalise.js:164-216` `_renderReadinessChecklist()` — checks CV PDF/DOCX/HTML presence, cover letter, screening Q&A, ATS validation pass/fail, layout freshness; clearly separates blocking (❌) vs. advisory (⚠) items (line 211-214). |
| Application status tracking | ✅ | Frontend: 8-state dropdown (queued/draft/ready/sent/interview/rejected/accepted/parked), `web/finalise.js:100-112`. Backend: `POST /api/finalise` (`scripts/routes/generation_routes.py:2097-2147`) validates the same enum, persists `application_status`/`notes`/`finalised_at` to `metadata.json`, and commits the output directory to git. `GET /api/finalise-meta` (2074-2095) restores prior status/notes on tab reopen. |
| Harvest handoff | ✅ | `showHarvestSection()` (`web/finalise.js:356-466`) loads `/api/harvest/candidates` and lets the applicant selectively write bullets/skills/summary variants back to Master CV — nothing is pre-selected. |

No functional defects found in the Finalise/Archive workflow itself; it is now a complete, reachable, and reasonably well-designed step. The only issue found is a **terminology** one — see below.

## Generated Materials Evaluation

The generated human-readable CV/PDF template (`templates/cv-template.html`) is well-executed relative to the story's visual and structural requirements: two-column layout with a clearly differentiated sidebar, serif/sans-serif contrast, action-verb/persuasion quality-checked bullets, relevance-sorted content, and a genuinely strong cover-letter quality gate (US-M6). The most material risks for the actual document a hiring manager receives are:

1. **CV summary has no generic-phrase guard** (US-M1.2b) — a "seasoned professional with diverse experience"-style summary would pass all six `_validate_summary()` checks as long as it happens to mention the role, years of experience, and a couple of required skills; the language itself is never screened for genericness the way the cover letter is.
2. **Publication venue warnings can ship inside the final document** (US-M7.6) — the `⚠ [venue unavailable]` marker is a visible defect in the artifact itself, not just an internal QA flag, if the applicant proceeds past the File-Review warning without fixing the source BibTeX entry.
3. **Font Awesome / Google Fonts CDN dependency** (US-M5.8) is a deployment-environment risk specific to the multi-user server context, not a code defect per se.

## Additional Story Gaps / Proposed Story Items

- **Layout-digest/template contract drift (engineering-facing, but undermines US-M1/US-M4 reliability):** `scripts/utils/layout_digest.py` still targets `#page-one`/`#page-two`/`#page-three` selectors from a per-page template structure that was replaced by a single continuous `#cv-body` flow during the "Issue #70" refactor. Both files carry an explicit "update this when the template changes" contract comment that was not honoured. Propose a story/engineering acceptance criterion: *the layout-digest heuristic's selectors must be exercised by an automated test against the live template so schema drift fails CI rather than silently degrading to a permanent low-confidence fallback.*
- **CV summary genericness check:** Propose extending `_validate_summary()` (or a new check) with the same filler/generic-phrase list already used for cover letters (`web/cover-letter.js:739-747`), so US-M1's named failure mode ("seasoned professional with diverse experience") is caught for the CV, not just the cover letter.
- **Missing-venue publications should gate generation, not decorate it:** Propose changing behaviour so a publication with `venue_warning` is either (a) excluded from the final render by default until the applicant fixes it, or (b) blocks Finalise/Archive outright, rather than rendering a visible warning glyph into the candidate-facing HTML/PDF/DOCX.
- **Finalise/Archive terminology inconsistency (new finding, not previously covered by any story):** the same feature is called "Finalise" (nav step label `web/index.html:151`, tab id, and the tab's own `<h1>✅ Finalise Application`, `web/finalise.js:79`), "Archive" (action button `📦 Archive Application`, `web/app.js:159`, and the tab's intro copy "Archive this application to your CV history…", `web/finalise.js:81-83`), and "mark the application ready to send and record its status" (nav tooltip, `web/index.html:151`) — three overlapping framings for one step. Recommend picking a single primary term (suggest "Finalise & Archive," which the button text already partially uses) and using it consistently in the nav label, tab header, and button.
- **Skills-category relevance ordering is not job-aware by default** (US-M3.2): consider adding an LLM/keyword-driven default ordering (mirroring the achievement-bullet relevance sort already implemented in `_ach_relevance()`, `cv_orchestrator.py:3724-3734`) so category order matches the specific job posting out of the box, with manual drag-reorder remaining available as an override.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, plus supporting files: templates/cv-template.html, scripts/utils/layout_digest.py, scripts/routes/generation_routes.py, web/finalise.js, web/download-tab.js, web/cover-letter.js, web/skills-review.js, web/publications-review.js.

| Story | ✅ Pass | ⚠ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-M1 | 2 | 2 | 0 | 1 | 0 |
| US-M2 | 6 | 0 | 0 | 0 | 0 |
| US-M3 | 2 | 1 | 0 | 1 | 0 |
| US-M4 | 4 | 1 | 0 | 0 | 0 |
| US-M5 | 7 | 1 | 0 | 1 | 0 |
| US-M6 | 7 | 0 | 0 | 0 | 0 |
| US-M7 | 6 | 1 | 0 | 0 | 0 |
| Finalise/Archive re-check | 3 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- US-M1: Page-1 overflow estimator broken → `scripts/utils/layout_digest.py:62-72` selectors vs. `templates/cv-template.html:66-72` structure (no `#page-one`/`#page-two`/`#page-three` exist).
- US-M1: Summary role-specificity checks → `scripts/utils/cv_orchestrator.py:4072-4140` `_validate_summary()`.
- US-M2: Action-verb/persuasion checks → `scripts/utils/cv_orchestrator.py:4655-4970` `check_persuasion()`.
- US-M3: Skill dedup → `scripts/utils/cv_orchestrator.py:513-541` `_deduplicate_skills()`.
- US-M4: Page-count validation → `scripts/utils/cv_orchestrator.py:6313-6336`.
- US-M5: PDF font-embedding check → `scripts/utils/cv_orchestrator.py:6271-6311`.
- US-M6: Cover-letter quality gate (word count, CTA, paragraph-1 role context) → `web/cover-letter.js:635-736`.
- US-M7: Venue-warning glyph baked into final output → `templates/cv-template.html:712-714`, `scripts/utils/cv_orchestrator.py:5150-5151`.
- Finalise/Archive: reachability + status tracking → `web/index.html:151,235`, `web/app.js:156-162`, `web/finalise.js:100-216`, `scripts/routes/generation_routes.py:2074-2147`.

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
