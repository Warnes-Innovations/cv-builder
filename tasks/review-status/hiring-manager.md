<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Hiring Manager UI Review — Cycle 7

**Persona:** Hiring Manager (US-M1 through US-M7)
**Date:** 2026-06-30
**Reviewer:** Source-verified automated review (Claude Code)
**Branch:** feature/multi-user-deployment

---

## GAP-218 Verification (Priority Item)

**Check:** `cv_orchestrator.py` around line 4882 — ATS heading validator accepts both "Publications" AND "Selected Publications".

✅ **Confirmed.** Lines 4874–4889 of `scripts/utils/cv_orchestrator.py`:

```python
_allowed = {'Publications', 'Selected Publications'}
wrong = [p.text.strip() for p in pub_headings
         if p.text.strip() not in _allowed]
if not wrong:
    _chk('docx_publications_heading', 'Publications heading text', 'docx',
         'pass', 'Heading is "Publications" or "Selected Publications"')
else:
    _chk('docx_publications_heading', 'Publications heading text', 'docx',
         'fail',
         f'Heading "{wrong[0]}" must be "Publications" or "Selected Publications"')
```

The `_allowed` set contains both values. GAP-218 is resolved.

---

## US-M1: First Impression — Page 1 Layout

| # | Acceptance Criterion | Status | Evidence / Notes |
|---|---|---|---|
| M1-1 | Page 1 contains name, contact, summary, selected achievements, and education — all visible without scrolling | ✅ Pass | `templates/cv-template.html` L526–686: sidebar (`aside.left-col`) contains contact, education, awards; `main.right-col` contains name header, summary section, selected achievements section. All rendered on page 1 in the single-flow layout. |
| M1-2 | Summary is role-specific: contains job title or near-equivalent, years of experience, and one specific differentiator | ⚠️ Partial | `cv_orchestrator.py` L195–198: default summary fallback is `"Experienced professional applying for {title}"` — generic. Role-specificity depends entirely on LLM output quality; no post-generation validation enforces that the chosen summary contains the job title or a specific differentiator. The `summary_focus_override` mechanism lets users select a summary variant but does not validate its content. |
| M1-3 | Page 1 has no overflow (content does not bleed onto page 2 from the fixed-height section) | ⚠️ Partial | `cv-template.html` L73–83: `.page { min-height: 279.4mm; overflow: visible; }`. The template uses a continuous single-`div` flow (`#cv-body`), not discrete pages. Page breaks are handled by CSS print rules and JS page-break markers (L826–858). No server-side check enforces that name/contact/summary/achievements fit on page 1; the Layout Review tab is a manual visual gate only. |
| M1-4 | Page 1 has no visibly unbalanced whitespace — both columns appear full or near-full | ⚠️ Partial | `cv-template.html` L826–858: JS `fillLastPage()` extends `#cv-body` min-height to fill the last page so sidebar gradient covers full height. This ensures sidebar background fills but does not balance content. Left-column density (contact + education + awards + skills) vs right-column density is data-dependent. No automated check flags sparse pages beyond the 1-page count warning (`cv_orchestrator.py` L5029–5031). |

**M1 Summary:** Layout structure is correct. The main gap is that automated validation does not enforce role-specificity in the summary or page-1 content density. Human review at the Layout Review step is the only gate for M1-2, M1-3, and M1-4.

---

## US-M2: Work Experience — Credibility and Relevance

| # | Acceptance Criterion | Status | Evidence / Notes |
|---|---|---|---|
| M2-1 | Every bullet starts with a strong action verb | ⚠️ Partial | `cv_orchestrator.py` L3963–3981: `_enhance_achievement_for_ats()` logs a `WARNING` when a bullet lacks a strong action verb from `_STRONG_VERBS` set (L3985–3998, 37 verbs). Never modifies text. `achievements-review.js` L524–570: weak-verb warning badge shown in bullet editor UI. The system warns but cannot guarantee compliance — user must act on warnings. |
| M2-2 | Each job entry has at least 2 bullets | ⚠️ Partial | No automated check enforces a minimum bullet count per job. The persuasion checks examine verb quality and vague language (`cv_orchestrator.py` L4150–4208) but do not count bullets per entry. |
| M2-3 | Bullets are ≤2 lines each | ⚠️ Partial | `cv_orchestrator.py` L4200–4208: "too short" is flagged (< 8 words). No equivalent check flags bullets that are too long (> ~2 lines). Enforcement is left to user judgment at the rewrite review step. |
| M2-4 | Job entries not split across pages (`page-break-inside: avoid`) | ✅ Pass | `cv-template.html` L278–281: `.job-entry { page-break-inside: avoid; }` applied. |
| M2-5 | Relevance-ordered bullets within each entry (most relevant first) | ✅ Pass | `cv-template.html` L675–676: template uses `exp.ordered_achievements if exp.ordered_achievements is defined else exp.achievements`. The `ordered_achievements` path preserves relevance ordering from the customization/rewrite step. |
| M2-6 | System warns if a bullet lacks an action verb | ✅ Pass | `cv_orchestrator.py` L3975–3978: logs `WARNING`. `achievements-review.js` L524–570: weak-verb warning badge rendered in bullet editor. `rewrite-review.js` L129: persuasion warnings passed to rewrite panel. |

**M2 Summary:** The page-break rule and action-verb warning system are implemented. Two gaps: no minimum-bullets-per-job check, and no maximum bullet length check.

---

## US-M3: Skills Section Readability

| # | Acceptance Criterion | Status | Evidence / Notes |
|---|---|---|---|
| M3-1 | Skills grouped into named categories on the human-readable PDF | ✅ Pass | `cv-template.html` L622–634: `{% for cat in skills_by_category %}<div class="skill-group"><h4>{{ cat.category }}</h4>`. `cv_orchestrator.py` L583–595: `_organize_skills_by_category()` groups and deduplicates. |
| M3-2 | Categories ordered by relevance to the target role | ✅ Pass | `cv_orchestrator.py` L555–580: `_sort_categories()` uses variant-based priority orders (`standard`, `technical`, `academic`) plus user-overridable `skill_category_order` from session customizations (`conversation_manager.py` L118). Custom order takes precedence. |
| M3-3 | No duplicate skills (exact match or obvious aliases) | ✅ Pass | `cv_orchestrator.py` L503–595: `_deduplicate_skills()` uses synonym map (`_load_synonym_map()` L142–152) + `canonical_skill_name()` (L154–160). All skills normalized before grouping. |
| M3-4 | Skills section occupies no more than 1.5 sidebar columns total | ⚠️ Partial | No server-side or client-side check enforces a skills-section height limit. The `max_skills` setting in Settings modal (`web/index.html` L619–623) caps skill count, but visual height in the sidebar depends on category names + proficiency strings. Human review at Layout Review is the only gate. |

**M3 Summary:** Category grouping, ordering, and deduplication are fully implemented. Height enforcement is absent.

---

## US-M4: Multi-Page Flow and Readability

| # | Acceptance Criterion | Status | Evidence / Notes |
|---|---|---|---|
| M4-1 | `page-break-inside: avoid` applied to every job entry; split entries not permitted | ✅ Pass | `cv-template.html` L278–281: `.job-entry { page-break-inside: avoid; }`. Also applied to `.pub-item` (L499). |
| M4-2 | Sidebar content balanced across pages (not empty on any page that has main content) | ✅ Pass | `cv-template.html` L381–414: faux-column technique with CSS `background-image: linear-gradient(to right, #eef2f5 ...)` on `#cv-body` with `-webkit-box-decoration-break: clone; box-decoration-break: clone` ensures sidebar background colour persists on every print page. `fillLastPage()` JS (L826–858) extends `#cv-body` to fill last page. Note: this ensures visual sidebar *presence* (background colour) but sidebar content itself ends when the left-column material is exhausted. |
| M4-3 | Total page count 2–3 for senior candidate; warns if 1 or >3 pages | ✅ Pass | `cv_orchestrator.py` L5022–5040: `validate_ats_report()` checks page count with `ideal_min=2`, `ideal_max=3`, `absolute_max=4` (config-driven). 1 page = `warn`; >4 pages = `fail`. Results surface in ATS Report modal (`web/index.html` L103–104). |
| M4-4 | Publications included only when flagged as relevant for the role type | ⚠️ Partial | `cv_orchestrator.py` L3416–3460: publications are always selected if present in master data (capped by `max_pubs` setting). There is no automated role-type gate that suppresses publications for purely industry roles. User must manually accept/reject in the Publications Review tab (`state: publication_decisions`, `conversation_manager.py` L111). Default behaviour is include-if-present. |
| M4-5 | When publications included, heading is "Selected Publications" if subset shown | ✅ Pass | `cv-template.html` L691–695: `{% if template_metadata.total_publications_count > publications\|length %} Selected Publications {% else %} Publications {% endif %}`. `cv_orchestrator.py` L4590: same logic in DOCX. `cv-template.html` L787: same in plaintext ATS block. Consistent across all output formats. |

**M4 Summary:** Core multi-page flow is solid. The one gap is that publications are not automatically gated by role type — this is a user-action gap, not a code defect.

---

## US-M5: Visual Identity and Professionalism

| # | Acceptance Criterion | Status | Evidence / Notes |
|---|---|---|---|
| M5-1 | All fonts embedded in the PDF | ✅ Pass | `cv-template.html` L22: Inter and Merriweather loaded from Google Fonts CDN. `cv_orchestrator.py` L1338–1362: WeasyPrint subprocess embeds fonts by default at generation time. Network-dependency risk: if CDN unavailable at generation time, fonts fall back to system fonts. No bundled local font file as offline fallback. |
| M5-2 | Sidebar background colour present on every page including pages 2+ | ✅ Pass | `cv-template.html` L388–400: linear-gradient background on `#cv-body` with `-webkit-box-decoration-break: clone` paints sidebar colour on every page fragment. |
| M5-3 | No content clipped at page margins | ✅ Pass | `cv-template.html` L446–448: `@page { size: letter; margin: var(--page-margin); }`. Default 0.5in. No overflow-hidden on print columns. |
| M5-4 | Font Awesome icons rendered correctly | ⚠️ Partial | `cv-template.html` L21: Font Awesome 6.0.0 loaded from cdnjs CDN. No bundled local fallback. Risk is low in practice (CDN cached by renderer on first use) but is a theoretical failure mode matching the US-M5 failure mode description. |
| M5-5 | PDF passes visual QC: compare rendered page images against reference screenshot | — N/A | Cannot be verified from source code alone — requires runtime rendering comparison. The Layout Review tab with iframe preview provides a human visual QC gate. |
| M5-6 | Serif font for candidate name; sans-serif for body | ✅ Pass | `cv-template.html` L211: `.name { font-family: 'Merriweather', serif; font-size: 2.2rem; }` — largest text element. Body: L49: `body { font-family: 'Inter', sans-serif; }`. |
| M5-7 | Section titles: uppercase, border-bottom | ✅ Pass | `cv-template.html` L233–246: `.section-title { text-transform: uppercase; border-bottom: 1px solid #ddd; }`. |
| M5-8 | Icon-prefixed contact fields | ✅ Pass | `cv-template.html` L529–562: each contact field uses `<i class="fas fa-...">` Font Awesome icon. |
| M5-9 | Bullet points custom-styled with accent colour | ✅ Pass | `cv-template.html` L332–339: `.achievement-list li::before { content: "•"; color: var(--accent-color); }`. |

**M5 Summary:** Visual identity is well-implemented. Two CDN dependencies (Google Fonts, Font Awesome) are not guarded with local fallbacks.

---

## US-M6: Cover Letter Tone and Relevance

| # | Acceptance Criterion | Status | Evidence / Notes |
|---|---|---|---|
| M6-1 | Company name and role title appear in paragraph 1 | ⚠️ Partial | `scripts/routes/master_data_routes.py` L1609–1611: LLM prompt includes company and role in `TARGET ROLE` block but does not explicitly instruct LLM to place both in paragraph 1. Client-side validation (`cover-letter.js` L524–541) checks total mention count (pass = ≥2) but not paragraph-1 placement. |
| M6-2 | At least one company-specific reference if extractable from job posting | ✅ Pass | `cover-letter.js` L130–133: "Company context" textarea in UI. `master_data_routes.py` L1586–1589: company context injected into prompt with instruction to weave specifics into the letter. `cover-letter.js` L528: validation warns if company name not detected. |
| M6-3 | Body paragraphs cite specific, named achievements — not generic claims | ✅ Pass | `master_data_routes.py` L1549–1560: top 4 achievements from master CV injected. L1591–1601: approved CV rewrite bullets (up to 5) injected with instruction to reference at least one. `cover-letter.js` L606–620: client-side validation checks for quantified achievements. |
| M6-4 | Closing paragraph ends with a direct interview request | ✅ Pass | `master_data_routes.py` L1630: prompt instructs "Close with a specific, confident request for an interview… Avoid passive language such as 'I look forward to hearing from you.'" `cover-letter.js` L578–603: client-side validation checks for assertive vs passive CTA; passive flagged as `warn`. |
| M6-5 | Length within role-appropriate range: 300–400w standard; 400–500w executive; 500–600w research/academic | ✅ Pass | `master_data_routes.py` L111–122: `_cover_letter_word_count_instruction()` returns role-differentiated target. L1625: target injected into prompt. `cover-letter.js` L543–576: client-side word count validation with same 3-tier targets and colour-coded progress bar. |
| M6-6 | Tone setting applied based on employer type | ✅ Pass | `master_data_routes.py` L97–103: `_TONE_GUIDANCE` dict with 5 tone categories (startup/tech, pharma/biotech, academia, financial, leadership). `cover-letter.js` L19–25: UI tone selector. `master_data_routes.py` L1569: `tone_hint` injected into prompt. Note: tone is user-selected, not auto-inferred from employer type — user judgment required. |

**M6 Summary:** Cover letter generation quality controls are strong. One gap: company name and role title are not explicitly enforced in paragraph 1 specifically.

---

## US-M7: Selected Publications — Credibility and Relevance Signalling

| # | Acceptance Criterion | Status | Evidence / Notes |
|---|---|---|---|
| M7-1 | Section heading is "Selected Publications" when subset shown; "Publications" when full list shown. Never "Selected Publications" for unfiltered list | ✅ Pass | `cv-template.html` L691–695: `{% if template_metadata.total_publications_count > publications\|length %} Selected Publications {% else %} Publications {% endif %}`. Logic based on `total_publications_count` (total in master) vs rendered count. `cv_orchestrator.py` L4590: same logic in DOCX. `cv-template.html` L787: same in ATS plaintext. All three output formats are consistent. |
| M7-2 | Publication count never shown in generated CV (no "(4 of 52)" or similar suffix) | ✅ Pass | `cv-template.html` L688–714: no count suffix in heading or adjacent text. `.pub-count` CSS class (L503) is defined but never instantiated in the Jinja template. No count is displayed. |
| M7-3 | Each entry displays: authors, title, venue, year — in scan-priority order | ✅ Pass | `cv_orchestrator.py` L864–869: fallback citation format: `f"{authors}. {title}. {venue_text} ({year})."`. For pre-formatted entries, venue appended if missing (L857–862). `_format_publications()` (L767–899) resolves venue from journal, booktitle, institution, school, publisher, organization, howpublished, or series fields. |
| M7-4 | Total entry count matches what applicant confirmed in Customisation step | ✅ Pass | `cv_orchestrator.py` L3428–3439: when `accepted_publications` is set, only accepted keys are included. `conversation_manager.py` L111: `publication_decisions` state persists user choices. Confirmed selection is honoured exactly. |
| M7-5 | Selected Publications is always the final section of the CV | ✅ Pass | `cv-template.html` L688–715: publications section is the last block in `main.right-col`, after experience. No other section follows it in the Jinja template. |
| M7-6 | No entry appears without a venue — missing-venue entries flagged to user during Customisation | ⚠️ Partial | `cv_orchestrator.py` L894–896: `entry['venue_warning']` set when venue absent. `publications-review.js` L138: `pub.venue_warning` shown as `⚠` icon in UI. However, user is **not blocked** from accepting a no-venue publication — the warning is informational, and the entry will still render without venue text. |
| M7-7 | First-author visibility in citation | ✅ Pass | `cv_orchestrator.py` L886–892: `is_first_author` flag set by last-name match against first author token. `cv-template.html` L708–710: `{% if pub.is_first_author %}<span class="pub-first-author" title="First author">★</span>{% endif %}`. |
| M7-8 | GAP-218: ATS heading validator accepts both "Publications" and "Selected Publications" | ✅ Pass | `cv_orchestrator.py` L4880: `_allowed = {'Publications', 'Selected Publications'}`. Both values pass the DOCX validation check. GAP-218 is confirmed resolved. |

**M7 Summary:** Publications handling is very strong. One gap: no-venue publications produce a visible warning but are not blocked from being included in the final output.

---

## Overall Assessment

### Pass / Partial / Fail Summary

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | — N/A |
|-------|--------|-----------|--------|-------|
| US-M1 | 1 | 3 | 0 | 0 |
| US-M2 | 3 | 3 | 0 | 0 |
| US-M3 | 3 | 1 | 0 | 0 |
| US-M4 | 4 | 1 | 0 | 0 |
| US-M5 | 7 | 2 | 0 | 1 |
| US-M6 | 5 | 1 | 0 | 0 |
| US-M7 | 7 | 1 | 0 | 0 |
| **Total** | **30** | **12** | **0** | **1** |

No ❌ Fail findings. All shortfalls are ⚠️ Partial — warnings exist, user action is required, or enforcement is visual/manual rather than automated.

### Key Strengths

1. **2-column layout** with sidebar colour differentiation, Merriweather serif for name (largest element), Inter sans-serif for body — fully matches US-M5 visual requirements.
2. **Page-break enforcement** for job entries and publication items — confirmed via `page-break-inside: avoid`.
3. **Sidebar gradient clone** ensures sidebar colour persists on pages 2+ even when sidebar content is exhausted.
4. **Publications heading logic** is consistent across HTML, DOCX, and ATS plaintext output. GAP-218 is confirmed resolved.
5. **Publication count never displayed** — `.pub-count` CSS class defined but not instantiated.
6. **Cover letter quality controls** are strong: role-differentiated word count targets (backend prompt + frontend validation), assertive CTA instruction + client validation, achievement citation checks.
7. **Skills deduplication** via synonym map prevents duplicates and aliases.
8. **Page count warnings** for 1-page (warn) and >4-page (fail) output via `validate_ats_report()`.

### Open Gaps (No Existing GAP IDs Found in Source)

1. **Summary role-specificity validation** (US-M1): No post-generation check confirms the selected summary contains the target job title or a specific differentiator. Recommend adding a persuasion check rule.
2. **Cover letter paragraph-1 placement** (US-M6): Company name mention count is validated (≥2) but paragraph-1 placement is not enforced. A simple paragraph-split check on the letter body would close this.
3. **Minimum bullets per job** (US-M2): No check warns when a selected job entry has fewer than 2 bullets. Low priority as users see bullet counts in the Experience Bullets tab.
4. **Maximum bullet length** (US-M2): No check flags bullets > ~2 lines. Low priority.
5. **Publications not auto-gated by role type** (US-M4): Include-if-present default requires manual action for industry roles. Consider a recommended-exclude advisory for non-research/non-academic role types.
6. **No-venue publications not blocked** (US-M7): Warning present but not enforced. Consider making accept confirmation require explicit acknowledgment of missing venue.
