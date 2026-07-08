<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Hiring-Manager Review Status

**Last Updated:** 2026-07-07 23:15 ET

**Executive Summary:** Follow-up pass (cycle 106) focused on independently re-verifying the GAP-391 venue-warning-glyph fix and re-confirming GAP-383 has not regressed. **GAP-391 is RESOLVED. GAP-383 remains RESOLVED (no regression).** As hiring-manager reviewer, I would sign off on this fix.

- **GAP-391 (publication venue-warning glyph leaking into delivered documents): RESOLVED.** Read all three claimed fix sites directly plus every other rendering path that touches publications:
  - `templates/cv-template.html` — the visible `<li class="pub-item">` block (`:699-713`) and the hidden plain-text ATS section (`:790-791`) both now emit only `pub.formatted_citation` (+ optional `pub-first-author` ★). No `pub-venue-warning` span, no `[venue unavailable]` text, anywhere in the template body. Only a now-dead, unreferenced CSS rule (`.pub-venue-warning { ... }`, `:505`) remains — cosmetic residue, not a functional leak.
  - ATS DOCX (`scripts/utils/cv_orchestrator.py:_add_ats_additional_sections`, publications loop at `:5159-5165`) — emits only `pub.get('formatted_citation', '').strip()`; comment at `:5160-5162` explicitly documents the intent (venue_warning is an in-app-only flag).
  - Human DOCX (`_generate_human_docx`, publications loop at `:5485-5499`) — emits only `pub.get('formatted_citation', '')`; matching comment at `:5486-5488`.
  - `web/publications-review.js` (in-app editor) **still renders** the `⚠` glyph with `venue_warning` as its tooltip at both table-build sites (`:157`, `:254`) — confirms the fix is correctly scoped to *delivered* documents only, not the internal review UI where the applicant can still act on the warning.
  - A distinct, legitimate warning surface (`publication_warnings`, built at `cv_orchestrator.py:4020-4026`, surfaced in the app's pre-submission "File Review" tab at `web/download-tab.js:445-454`) is **not** part of the generated CV/DOCX artifact — it's an in-app advisory checklist shown before download, analogous to the existing `summary_warnings` block. This is a separate, intended mechanism and not a re-emergence of GAP-391.
  - Regression tests exist and pass: `tests/test_cv_orchestrator.py::TestGenerateHumanDocx::test_human_docx_does_not_leak_venue_warning_glyph` and `tests/test_ats_generation.py::test_ats_docx_does_not_leak_venue_warning_glyph` — both assert the citation text survives while `"venue unavailable"` and `"⚠"` are absent from the generated DOCX text. Ran both directly this cycle: **2 passed**. Note: no equivalent regression test exists for the HTML/PDF template path (`tests/test_cv_template.py`, `tests/test_template_renderer.py` have no `venue` references) — manual source read confirms current correctness, but a future template edit could reintroduce the glyph with no test to catch it.
- **GAP-383 (weak-evidence skill filtering across formats): RESOLVED, re-confirmed no regression from the GAP-391 fix.** All three output paths still filter `candidate_to_confirm` skills: HTML/PDF (`scripts/utils/cv_orchestrator.py:221-224`), ATS DOCX (`:4416-4419`, GAP-326), and human DOCX (`:5439-5440`, GAP-342) — line numbers shifted by a handful of lines from the prior snapshot (217-224/4415-4416/5435-5436) purely due to the GAP-391 comment/edit insertions elsewhere in the file, not a logic change. `tests/test_cv_orchestrator.py::TestPrepareCvDataForTemplate::test_candidate_to_confirm_skills_excluded_from_html_pdf` still passes (ran directly this cycle: **1 passed**). PDF still derives from the same already-filtered HTML (`generate_pdf_variants_from_html`/`generate_final_from_confirmed_html`, `:998-1130`) rather than re-deriving skills, so no format can diverge from another.

GAP-388 (Finalise/Archive/Package terminology) and the rest of US-M1–M7 were **not** re-examined this cycle — this pass was scoped specifically to GAP-391 verification and GAP-383 regression-checking, per this cycle's committee-review instructions. Their prior findings (last verified 2026-07-07 22:02 ET) are retained below unchanged and should not be read as re-confirmed as of this timestamp.

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
| 6 | Missing-venue entries flagged during Customisation, not silently rendered | ✅ (GAP-391 fixed, re-verified 2026-07-07 23:15 ET) | The visible `⚠ [venue unavailable]` glyph has been **removed** from all three delivered-document paths: HTML/PDF (`templates/cv-template.html:699-713`, `:790-791` — only `.pub-first-author` ★ remains as a conditional marker; the `.pub-venue-warning` CSS rule at `:505` is now dead/unreferenced), ATS DOCX (`cv_orchestrator.py:5159-5165`), and human DOCX (`:5485-5499`). The `publication_warnings` advisory (built `:4020-4026`) is still surfaced at the File-Review/Finalise stage (`web/download-tab.js:445-454`) so the applicant is still warned and can fix the source BibTeX before submitting — but the defect marker no longer ships inside the artifact itself if they proceed anyway. The in-app editor (`web/publications-review.js:157,254`) still shows the `⚠` glyph with the warning text as intended, so the applicant retains full visibility to act on it during review. Regression tests (`tests/test_cv_orchestrator.py::test_human_docx_does_not_leak_venue_warning_glyph`, `tests/test_ats_generation.py::test_ats_docx_does_not_leak_venue_warning_glyph`) pass. |
| 7 | First-author visibility | ✅ | `is_first_author` detection (`cv_orchestrator.py:904-910`) rendered as a `★` "First author" mark (`templates/cv-template.html:709-711`). |

### Finalise / Archive Workflow (prior finding, last verified 2026-07-07 22:02 ET — not re-checked this cycle)

| Aspect | Status | Notes / File:Line refs |
|--------|--------|-------------------------|
| Reachability | ✅ | `web/index.html:151` (`step-finalise` nav item) and `:235` (`tab-finalise`) exist in the normal step sequence. `web/app.js:156-159` wires the action button (`id="finalise-action-btn"`) to `switchTab('finalise')` — no longer a dead-end/unreachable tab. |
| Readiness checklist | ✅ | `web/finalise.js:164-216` `_renderReadinessChecklist()` — checks CV PDF/DOCX/HTML presence, cover letter, screening Q&A, ATS validation pass/fail, layout freshness; clearly separates blocking (❌) vs. advisory (⚠) items (line 211-214). |
| Application status tracking | ✅ | Frontend: 8-state dropdown (queued/draft/ready/sent/interview/rejected/accepted/parked), `web/finalise.js:100-112`. Backend: `POST /api/finalise` (`scripts/routes/generation_routes.py:2097-2147`) validates the same enum, persists `application_status`/`notes`/`finalised_at` to `metadata.json`, and commits the output directory to git. `GET /api/finalise-meta` (2074-2095) restores prior status/notes on tab reopen. |
| Harvest handoff | ✅ | `showHarvestSection()` (`web/finalise.js:356-466`) loads `/api/harvest/candidates` and lets the applicant selectively write bullets/skills/summary variants back to Master CV — nothing is pre-selected. |
| **Terminology consistency (GAP-388)** | ❌ **Still broken, one layer down** | `web/index.html` chrome now consistently says "Finalise" — nav label `:151`, tab label `:235`, and the action button text itself, which was directly re-read this cycle and now shows `<span aria-hidden="true">✅</span> Finalise Application` at `:205` (previously "📦 Archive Application" per the prior review snapshot — that part of GAP-388 genuinely got fixed). But the tab's own rendered content, `web/finalise.js`, was **not** updated to match: file header comment `:9` "Finalise & archive tab"; intro copy `:81` "Archive this application to your CV history…"; primary button label `:127` `✅ Finalise &amp; Archive`, repeated on error state `:310`/`:350`; success banner `:328` `✅ Application archived!`; post-success button text `:339` `✅ Archived`. `web/download-tab.js:431` ("you can archive the application") and `web/final-generate.js:142-143` ("archive your application" / "confirms the package is complete") independently use yet other phrasing for the same action, without ever saying "finalise" as a verb even while referencing the "Finalise" tab by name. Net: the nav says "Finalise," the button inside says "Finalise & Archive," and the result says "Archived" — three labels for one action visible within a single flow. |

No functional defects found in the Finalise/Archive workflow itself; it is a complete, reachable, and reasonably well-designed step. The terminology issue is real and unresolved at the tab-content level even though the nav/button-label layer was fixed.

## Generated Materials Evaluation

### GAP-391 — publication venue-warning glyph baked into delivered documents (independently re-verified this cycle, 2026-07-07 23:15 ET)

Read the actual current source of every path that touches publication rendering — not the fix summary:

| Output path | Status | Evidence |
|---|---|---|
| HTML/PDF (visible) | ✅ | `templates/cv-template.html:699-713` — the `<li class="pub-item">` loop renders only `pub-citation` and, conditionally, `pub-first-author` (★). No `pub-venue-warning` span, no `venue_warning`/`unavailable` text present anywhere in the markup. |
| HTML (hidden ATS plain-text mirror) | ✅ | `templates/cv-template.html:790-791` — `{% for pub in publications %}{{ loop.index }}. {{ pub.formatted_citation }}` — plain citation only. |
| ATS DOCX | ✅ | `scripts/utils/cv_orchestrator.py:5159-5165` (`_add_ats_additional_sections`) — `citation = pub.get('formatted_citation', '').strip()`; only `citation` is written, guarded by an explicit GAP-391 comment (`:5160-5162`). |
| Human DOCX | ✅ | `scripts/utils/cv_orchestrator.py:5485-5499` (`_generate_human_docx`) — `citation = pub.get('formatted_citation', '')`; only `citation` (optionally hyperlinked) is written, guarded by the same comment pattern (`:5486-5488`). |
| In-app editor (should still warn) | ✅ | `web/publications-review.js:157,254` — `pub.venue_warning` still drives a `⚠` glyph with the warning text as its `title` tooltip in both places the publications table is built. Confirms the fix did *not* overreach into the editor where the applicant needs to see and act on the flag. |
| Pre-submission advisory (distinct mechanism, correctly untouched) | ✅ | `cv_orchestrator.py:4020-4026` builds a `publication_warnings` list from the same `venue_warning` field; `web/download-tab.js:445-454` renders it as an advisory box in the app's File-Review tab, not inside the generated artifact. This is a legitimate, separate warning surface (parallel to `summary_warnings`) — not a recurrence of the bug. |
| Regression tests | ✅ | `tests/test_cv_orchestrator.py::TestGenerateHumanDocx::test_human_docx_does_not_leak_venue_warning_glyph` and `tests/test_ats_generation.py::test_ats_docx_does_not_leak_venue_warning_glyph` both assert the citation text is preserved and `"venue unavailable"` / `"⚠"` are absent from DOCX output. Ran directly this cycle: 2 passed. **Gap:** no equivalent test exists for the HTML/PDF template path (`tests/test_cv_template.py`, `tests/test_template_renderer.py`) — recommend adding one so a future template edit can't silently reintroduce the glyph. |

**Conclusion: GAP-391 is RESOLVED.** A hiring manager receiving the HTML/PDF, ATS DOCX, or human DOCX will see a clean citation line with no internal data-quality marker, while the applicant still gets full visibility of the same warning inside the app (editor tooltip + pre-submission advisory) to fix the underlying BibTeX entry before generating.

### GAP-383 — weak-evidence skill filtering across formats (re-verified this cycle for regression from the GAP-391 fix)

Read all three filter sites directly rather than trusting the fix summary:

| Output path | Status | Evidence |
|---|---|---|
| HTML/PDF | ✅ | `_prepare_cv_data_for_template()`, `scripts/utils/cv_orchestrator.py:221-224`: `html_skills = [s for s in selected_content.get('skills', []) if not (isinstance(s, dict) and s.get('candidate_to_confirm'))]`, feeding `_organize_skills_by_category()` (`:225`). `render_html_preview()` (`:927-996`) calls this once; `generate_pdf_variants_from_html()` / `generate_final_from_confirmed_html()` (`:998-1130`) then convert the *already-rendered HTML file* to PDF rather than re-deriving skills from `selected_content` — so HTML and PDF structurally cannot diverge from each other. |
| ATS DOCX (GAP-326) | ✅ | `_generate_ats_docx()`, `:4416-4419`: `ats_skills = [s for s in content['skills'] if not (isinstance(s, dict) and s.get('candidate_to_confirm'))]`. Called with raw `selected_content` — applies the same rule independently against the same source data. |
| Human DOCX (GAP-342) | ✅ | `_generate_human_docx()`, `:5439-5440`: `skills_list = [s for s in cat.get('skills', []) if not (isinstance(s, dict) and s.get('candidate_to_confirm'))]`. Called with `cv_data` — the same object already produced by the HTML-path filter above — so this is filtering data that has already had `candidate_to_confirm` skills removed, with its own filter as a redundant second guard. Confirms Human DOCX cannot show a skill hidden from HTML/PDF, or vice versa. |

Line numbers shifted by roughly 3-5 lines from the prior review snapshot (previously 217-224/4415-4416/5435-5436) purely as a side effect of the GAP-391 comment insertions elsewhere in the same file — the filtering logic itself is byte-for-byte unchanged. `tests/test_cv_orchestrator.py::TestPrepareCvDataForTemplate::test_candidate_to_confirm_skills_excluded_from_html_pdf` still passes (ran directly this cycle: 1 passed).

**Conclusion: GAP-383 remains RESOLVED, no regression from the GAP-391 fix.** A hiring manager who receives the human DOCX, opens the PDF, or was shown the HTML preview during the applicant's review will see the identical accepted-skill set — no format-specific leakage of an unconfirmed (`candidate_to_confirm: true`) skill remains in any of the three formats.

The generated human-readable CV/PDF template (`templates/cv-template.html`) is well-executed relative to the story's visual and structural requirements: two-column layout with a clearly differentiated sidebar, serif/sans-serif contrast, action-verb/persuasion quality-checked bullets, relevance-sorted content, and a genuinely strong cover-letter quality gate (US-M6). The most material risks for the actual document a hiring manager receives are:

1. **CV summary has no generic-phrase guard** (US-M1.2b) — a "seasoned professional with diverse experience"-style summary would pass all six `_validate_summary()` checks as long as it happens to mention the role, years of experience, and a couple of required skills; the language itself is never screened for genericness the way the cover letter is. (Not re-checked this cycle; retained from prior snapshot.)
2. ~~Publication venue warnings can ship inside the final document (US-M7.6)~~ — **RESOLVED this cycle (GAP-391).** The `⚠ [venue unavailable]` marker has been removed from HTML/PDF, ATS DOCX, and human DOCX; it remains correctly visible only in the in-app editor and the pre-submission File-Review advisory. See "GAP-391" section above.
3. **Font Awesome / Google Fonts CDN dependency** (US-M5.8) is a deployment-environment risk specific to the multi-user server context, not a code defect per se. (Not re-checked this cycle; retained from prior snapshot.)

## Additional Story Gaps / Proposed Story Items

- **Layout-digest/template contract drift (engineering-facing, but undermines US-M1/US-M4 reliability):** `scripts/utils/layout_digest.py` still targets `#page-one`/`#page-two`/`#page-three` selectors from a per-page template structure that was replaced by a single continuous `#cv-body` flow during the "Issue #70" refactor. Both files carry an explicit "update this when the template changes" contract comment that was not honoured. Propose a story/engineering acceptance criterion: *the layout-digest heuristic's selectors must be exercised by an automated test against the live template so schema drift fails CI rather than silently degrading to a permanent low-confidence fallback.*
- **CV summary genericness check:** Propose extending `_validate_summary()` (or a new check) with the same filler/generic-phrase list already used for cover letters (`web/cover-letter.js:739-747`), so US-M1's named failure mode ("seasoned professional with diverse experience") is caught for the CV, not just the cover letter.
- ~~Missing-venue publications should gate generation, not decorate it~~ — **Superseded by the GAP-391 fix**: the glyph no longer renders into the candidate-facing HTML/PDF/DOCX at all (verified this cycle); the applicant is still advised via the in-app editor and File-Review tab. Residual, lower-priority suggestion: consider whether generation should also be soft-blocked (not just advised) when a `venue_warning` is present and unresolved at Finalise time — currently nothing prevents finalising with an unresolved venue warning, it is advisory only.
- **Dead CSS rule left behind by the GAP-391 fix:** `templates/cv-template.html:505` still defines `.pub-venue-warning { ... }` even though no element in the template references that class anymore. Harmless (unused CSS has no rendering effect) but should be deleted as part of general cleanup to avoid confusing a future reader into thinking the warning is still wired up.
- **No HTML/PDF-path regression test for GAP-391:** `tests/test_cv_orchestrator.py` and `tests/test_ats_generation.py` cover both DOCX paths well, but `tests/test_cv_template.py` / `tests/test_template_renderer.py` have no test asserting the rendered HTML excludes the venue-warning glyph. Recommend adding one so a future template edit can't silently reintroduce it.
- **Finalise/Archive terminology inconsistency — GAP-388, PARTIAL fix, re-verified this cycle:** the nav/action-button layer (`web/index.html:151,205,235`) was updated since the prior snapshot and now consistently reads "Finalise." However, the tab's own rendered content was not touched to match: `web/finalise.js` still headers itself "Finalise & archive tab" (`:9`), tells the user to "Archive this application to your CV history…" (`:81`), labels its button "✅ Finalise & Archive" (`:127`, `:310`, `:350`), and reports success as "✅ Application archived!" / "✅ Archived" (`:328`, `:339`); `web/download-tab.js:431` and `web/final-generate.js:142-143` separately use "archive the application" / "package is complete" without ever saying "finalise." Recommend picking a single primary term and propagating it through `finalise.js`, `download-tab.js`, and `final-generate.js`, not just `index.html`.
- **Skills-category relevance ordering is not job-aware by default** (US-M3.2): consider adding an LLM/keyword-driven default ordering (mirroring the achievement-bullet relevance sort already implemented in `_ach_relevance()`, `cv_orchestrator.py:3724-3734`) so category order matches the specific job posting out of the box, with manual drag-reorder remaining available as an override.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, plus supporting files: templates/cv-template.html, scripts/utils/layout_digest.py, scripts/routes/generation_routes.py, web/finalise.js, web/download-tab.js, web/cover-letter.js, web/skills-review.js, web/publications-review.js.

| Story | ✅ Pass | ⚠ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| GAP-391 (verify, this cycle) | 6 | 0 | 0 | 0 | 0 |
| GAP-383 (re-verify, this cycle) | 3 | 0 | 0 | 0 | 0 |
| GAP-388 (not re-checked this cycle; prior status shown) | 2 | 0 | 1 | 0 | 0 |
| US-M1 (not re-checked this cycle; prior status shown) | 2 | 2 | 0 | 1 | 0 |
| US-M2 (not re-checked this cycle; prior status shown) | 6 | 0 | 0 | 0 | 0 |
| US-M3 (not re-checked this cycle; prior status shown) | 2 | 1 | 0 | 1 | 0 |
| US-M4 (not re-checked this cycle; prior status shown) | 4 | 1 | 0 | 0 | 0 |
| US-M5 (not re-checked this cycle; prior status shown) | 7 | 1 | 0 | 1 | 0 |
| US-M6 (not re-checked this cycle; prior status shown) | 7 | 0 | 0 | 0 | 0 |
| US-M7 (item 6 updated this cycle: GAP-391 resolved) | 7 | 0 | 0 | 0 | 0 |
| Finalise/Archive re-check (not re-checked this cycle; prior status shown) | 3 | 0 | 1 | 0 | 0 |

**Key evidence references:**

- GAP-391 (this cycle): HTML/PDF visible list clean → `templates/cv-template.html:699-713`; hidden plain-text mirror clean → `:790-791`; dead CSS residue → `:505`; ATS DOCX clean → `scripts/utils/cv_orchestrator.py:5159-5165`; human DOCX clean → `:5485-5499`; in-app editor still warns (correct) → `web/publications-review.js:157,254`; pre-submission advisory (correct, distinct mechanism) → `cv_orchestrator.py:4020-4026`, `web/download-tab.js:445-454`; regression tests passing → `tests/test_cv_orchestrator.py::test_human_docx_does_not_leak_venue_warning_glyph`, `tests/test_ats_generation.py::test_ats_docx_does_not_leak_venue_warning_glyph`.
- GAP-383 (re-verified this cycle, no regression): HTML/PDF filter → `scripts/utils/cv_orchestrator.py:221-224`; ATS DOCX filter → `:4416-4419`; Human DOCX filter → `:5439-5440`; PDF derives from the same filtered HTML → `:998-1130`; test passing → `tests/test_cv_orchestrator.py::test_candidate_to_confirm_skills_excluded_from_html_pdf`.
- GAP-388 (prior finding, not re-checked this cycle): nav/button layer fixed → `web/index.html:151,205,235`; tab-content NOT fixed → `web/finalise.js:9,81,127,310,328,339,350`; `web/download-tab.js:431`; `web/final-generate.js:142-143`.
- US-M1 (prior finding): Page-1 overflow estimator broken → `scripts/utils/layout_digest.py:62-72` selectors vs. `templates/cv-template.html:66-72` structure (no `#page-one`/`#page-two`/`#page-three` exist).
- US-M1 (prior finding): Summary role-specificity checks → `scripts/utils/cv_orchestrator.py:4072-4140` `_validate_summary()`.
- US-M2 (prior finding): Action-verb/persuasion checks → `scripts/utils/cv_orchestrator.py:4655-4970` `check_persuasion()`.
- US-M3 (prior finding): Skill dedup → `scripts/utils/cv_orchestrator.py:513-541` `_deduplicate_skills()`.
- US-M4 (prior finding): Page-count validation → `scripts/utils/cv_orchestrator.py:6313-6336`.
- US-M5 (prior finding): PDF font-embedding check → `scripts/utils/cv_orchestrator.py:6271-6311`.
- US-M6 (prior finding): Cover-letter quality gate (word count, CTA, paragraph-1 role context) → `web/cover-letter.js:635-736`.
- US-M7.6 (updated this cycle): Venue-warning glyph removed from final output → see GAP-391 evidence above.
- Finalise/Archive (prior finding): reachability + status tracking → `web/index.html:151,235`, `web/app.js:156-159`, `web/finalise.js:100-216`, `scripts/routes/generation_routes.py:2074-2147`.

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
