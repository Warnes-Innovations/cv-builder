<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Hiring Manager Review Status

**Last Updated:** 2026-06-30 10:45 ET

**Executive Summary:** The application workflow is substantially complete and well-aligned with the hiring-manager story. The HTML/CSS template correctly delivers the two-column layout, typographic pairing (Merriweather/Inter), `page-break-inside: avoid` on job entries, sidebar colour persistence across pages via the faux-column gradient technique, Font Awesome contact icons, and Schema.org JSON-LD in the HTML head. The cover letter backend handles role-differentiated word counts, company context injection, tone settings, and explicit interview-request wording. The publications pipeline correctly sets "Selected Publications" vs "Publications" headings and flags missing venues in the review UI. The main defects are: (1) the ATS-report DOCX validator incorrectly rejects "Selected Publications" as a heading — a bug that contradicts the story and the template's own logic; (2) action-verb failures in `_enhance_achievement_for_ats` log server-side only, not to the UI; (3) no minimum bullet-count guard per experience entry; and (4) page-count and cover-letter length checks are post-generation only — no pre-generation warnings.

---

## Application Evaluation

### US-M1: First Impression — Page 1 Layout

| Criterion | Status | Evidence |
|---|---|---|
| Name prominent at top | ✅ Pass | `cv-template.html:641` — `<h1 class="name">` uses Merriweather 2.2rem; largest text element on page |
| Contact in sidebar with Font Awesome icons | ✅ Pass | `cv-template.html:529–562` — FA icons for email, phone, LinkedIn, website |
| Professional summary first in right column | ✅ Pass | `cv-template.html:647–652` — Summary section appears first after header in right col |
| Selected achievements on page 1 | ✅ Pass | `cv-template.html:654–663` — Achievements section immediately follows summary |
| Education in sidebar | ✅ Pass | `cv-template.html:565–573` — Education rendered in left-col below contact block |
| 2-column layout (sidebar 32% left, main right) | ✅ Pass | `cv-template.html:86–99` — `.left-col { width: 32% }`, `.right-col { flex: 1 }` |
| Sidebar background differentiated | ✅ Pass | `cv-template.html:29` — `--sidebar-bg: #eef2f5`; print faux-column gradient persists across pages |
| Summary must be role-specific (not generic) | ⚠️ Partial | `cv_orchestrator.py:196–197` — fallback summary is generic: `"Experienced professional applying for {title}"`. Role-specific summary is LLM-generated; quality depends on LLM output, not structurally enforced |
| Page 1 has no visibly unbalanced whitespace | — N/A | Visual QC only; CSS continuous-flow model reduces but cannot eliminate imbalance; no automated check |
| Pre-generation warning for thin/overflow page 1 | 🔲 Not Implemented | Page-count check only runs post-generation via ATS report (`validate_ats_report`); no pre-generation user-visible alert |

### US-M2: Work Experience — Credibility and Relevance

| Criterion | Status | Evidence |
|---|---|---|
| Action-verb check on bullets | ⚠️ Partial | `cv_orchestrator.py:3965–3983` — `_enhance_achievement_for_ats` checks `_STRONG_VERBS_LOWER` and logs a warning server-side. Persuasion-check pipeline (`_WEAK_VERBS_LOWER`, `_VAGUE_PHRASES_RE`) does surface warnings to UI via `persuasion_warnings` state, but the `_enhance_achievement_for_ats` path is separate and is log-only |
| `page-break-inside: avoid` on job entries | ✅ Pass | `cv-template.html:280` — `.job-entry { page-break-inside: avoid; }` |
| Relevance-ordered bullets per entry | ✅ Pass | `cv_orchestrator.py:432–480` — `_apply_session_achievement_edits` preserves user-ordered bullets; `ordered_achievements` field respected by template `cv-template.html:675` |
| Job title + company on same line | ✅ Pass | `cv-template.html:670–673` — `job-role` and `job-company` in same `job-header` flex row |
| At least 2 bullets per job | ⚠️ Partial | Not enforced anywhere in the pipeline; no min-bullet validation in `validate_ats_report` |
| Bullets ≤2 lines each | — N/A | Not automatable without font metrics; not checked |
| System warns if bullet lacks action verb (Phase 2.4) | ⚠️ Partial | Persuasion warnings (weak verbs + vague phrases) surface to UI; `_enhance_achievement_for_ats` verb check is server-log-only |

### US-M3: Skills Section Readability

| Criterion | Status | Evidence |
|---|---|---|
| Skills grouped by named categories | ✅ Pass | `cv_orchestrator.py:533–595` — `_organize_skills_by_category` groups and sorts; `cv-template.html:624–634` renders per-category with `<h4>` labels |
| Categories ordered by role relevance | ✅ Pass | `cv_orchestrator.py:541–580` — priority orders per variant (`standard`, `technical`, `academic`); custom order via `skill_category_order` supported |
| No duplicate skills | ✅ Pass | `cv_orchestrator.py:503–531` — `_deduplicate_skills` normalises via canonical synonym map |
| Skills section occupies no more than 1.5 sidebar columns | ⚠️ Partial | Skills are in sidebar (correct column separation from experience), but no cap on sidebar skills length; `max_skills` param is optional and `None` by default in `render_html_preview` |
| No outdated/rare skills listed prominently | — N/A | LLM recommendation may filter these; no structural enforcement |

### US-M4: Multi-Page Flow and Readability

| Criterion | Status | Evidence |
|---|---|---|
| `page-break-inside: avoid` on every job entry | ✅ Pass | `cv-template.html:280` |
| Sidebar background colour on pages 2+ | ✅ Pass | `cv-template.html:381–401` — faux-column gradient on `#cv-body` with `box-decoration-break: clone` and `print-color-adjust: exact` ensures sidebar colour persists on all print pages |
| Total page count 2–3; warn if 1 or >3 | ✅ Pass | `cv_orchestrator.py:5022–5040` — warns on 1-page, warns on 4 pages, fails on >4 pages |
| Publications only when flagged relevant | ✅ Pass | `cv_orchestrator.py:3418–3447` — `accepted_publications` gate; `_select_publications` uses relevance scoring |
| No page opens with continuation bullet (entries kept together) | ✅ Pass | `page-break-inside: avoid` on `.job-entry` prevents mid-entry splits |
| Sidebar balanced across pages (not empty when main has content) | ⚠️ Partial | Sidebar content (contact/edu/awards/skills) floats across all pages via gradient, but no text-balancing logic; pages 2+ may show sidebar colour with no text content if sidebar is shorter than main column |
| Publications always last section | ✅ Pass | `cv-template.html:688` — publications is the final `<section>` in the right column; optional `pub-start-new-page` class adds explicit page break |

### US-M5: Visual Identity and Professionalism

| Criterion | Status | Evidence |
|---|---|---|
| Dark navy primary / accent blue / muted grey scheme | ✅ Pass | `cv-template.html:24–33` — `--primary-color: #2c3e50` (dark navy), `--accent-color: #2980b9` (accent blue), `--text-muted: #666` (muted grey), `--border-color: #d1d8dd` |
| Serif name / sans-serif body typographic pairing | ✅ Pass | `cv-template.html:22, 210–212` — Merriweather serif for `.name`, Inter sans-serif for body |
| Section titles uppercase with horizontal rule | ✅ Pass | `cv-template.html:229–246` — `.section-title { text-transform: uppercase; border-bottom: 1px solid #ddd; }` |
| Font Awesome icons for contact fields | ✅ Pass | `cv-template.html:21` — Font Awesome 6.0.0 CDN; icons used at lines 531, 537, 542, 553 |
| Accent-colour bullet points | ✅ Pass | `cv-template.html:332–340` — `.achievement-list li::before { content: "•"; color: var(--accent-color); }` |
| Fonts embedded in PDF (WeasyPrint) | ✅ Pass | `cv_orchestrator.py:1338–1362` — WeasyPrint subprocess embeds fonts by default |
| Chrome headless fallback tried first | ✅ Pass | `cv_orchestrator.py:1283–1337` — Chrome attempted first; falls back to WeasyPrint |
| Sidebar background in PDF | ✅ Pass | Gradient with `print-color-adjust: exact` and `box-decoration-break: clone` ensures colour rendering |
| No content clipped at margins | ✅ Pass | `cv-template.html:446–448` — `@page { size: letter; margin: var(--page-margin) }` configurable via `page_margin` |
| Schema.org JSON-LD in HTML `<head>` | ✅ Pass | `cv-template.html:18–20` — JSON-LD block from `_build_json_ld` |
| HTML is authoritative master; PDF derived from it | ✅ Pass | `cv_orchestrator.py:973–1017` — `generate_final_from_confirmed_html` writes HTML first, derives PDF from same file |

### US-M6: Cover Letter Tone and Relevance

| Criterion | Status | Evidence |
|---|---|---|
| Company name and role title in paragraph 1 | ✅ Pass | `master_data_routes.py:1603–1631` — company and role injected into prompt; LLM instructed to write tailored, personalised letter |
| Company-specific content when extractable from posting | ✅ Pass | `master_data_routes.py:1528, 1587–1589` — `company_context` field accepted from UI; injected with explicit "weave into letter" instruction |
| Body cites specific, named achievements | ✅ Pass | `master_data_routes.py:1549–1601` — up to 4 `selected_achievements` and up to 5 approved rewrite bullets injected into prompt |
| Closing ends with direct interview request | ✅ Pass | `master_data_routes.py:1630` — explicit prompt instruction: "Close with a specific, confident request for an interview… Avoid passive language such as 'I look forward to hearing from you.'" |
| Role-differentiated word count | ✅ Pass | `master_data_routes.py:111–122` — `_cover_letter_word_count_instruction`: standard 300–400w, executive 400–500w, academic/research 500–600w |
| Tone setting applied (startup/pharma/academic/financial) | ✅ Pass | `master_data_routes.py:95–103` — `_TONE_GUIDANCE` dict with 6 tones; `opening_style` controls opening format (formal/hook/narrative) |
| Post-generation length verification | ⚠️ Partial | Word count is in the prompt instruction; no post-generation check that the LLM obeyed the count range |
| Generic opening prevention | ⚠️ Partial | Relies on prompt design and LLM compliance; no post-generation check for generic opener patterns |

### US-M7: Selected Publications — Credibility and Relevance

| Criterion | Status | Evidence |
|---|---|---|
| Heading "Selected Publications" when subset shown | ✅ Pass | `cv-template.html:691–695` — `{% if total_publications_count > (publications|length) %} Selected Publications {% else %} Publications {% endif %}` |
| Heading "Publications" when full list shown | ✅ Pass | Same template condition handles both cases correctly |
| Never "Selected Publications" for full unfiltered list | ✅ Pass | Condition guards against this case |
| Publication count NOT shown in CV output | ✅ Pass | No `(N of M)` notation in template. `.pub-count` CSS class exists but is not used in any Jinja2 block |
| Each entry: authors, title, venue, year | ✅ Pass | `cv_orchestrator.py:864–870` — `formatted_citation` assembled as `"authors. title. venue (year)."` |
| First-author status visible | ✅ Pass | `cv_orchestrator.py:886–891` — `is_first_author` computed from owner last name vs leading author token; `cv-template.html:708–710` — ★ marker rendered |
| Venue missing → flag to user during Customise | ✅ Pass | `cv_orchestrator.py:894–896` — `venue_warning` set for entries without journal/booktitle/etc.; `publications-review.js:138` — ⚠ icon with tooltip rendered in review UI |
| Publications always final section | ✅ Pass | `cv-template.html:688` — publications section is last in right-column Jinja2 template |
| Entry count matches user-confirmed selections | ✅ Pass | `cv_orchestrator.py:3430–3441` — `accepted_pubs` gate preserves exact user-accepted set from `publication_decisions` |
| DOCX heading consistency with HTML template | ⚠️ Partial | `cv_orchestrator.py:4592` — DOCX generation applies same `total_count > len(publications)` rule — correct. However, `validate_ats_report` lines 4882–4889 asserts the DOCX heading must be exactly `"Publications"` and treats `"Selected Publications"` as a **fail** — this is a bug that contradicts the story and the template's own logic |
| Venue warning is blocking (user cannot submit without resolving) | ⚠️ Partial | Warning is shown; user can still submit publication decisions and proceed without resolving it |

---

## Generated Materials Evaluation

**Page 1 first impression:** Template places Name (Merriweather 2.2rem serif) as the largest element, then applicant tagline (accent blue uppercase), then summary then achievements in the right column, with contact/education/awards in the sidebar. This maps exactly to US-M1. The `pub-count` CSS class exists but is never populated, so no count notation appears in the output.

**Action-verb enforcement:** The system has two parallel verb-check paths. The persuasion-check pipeline (`_WEAK_VERBS_LOWER`, `_VAGUE_PHRASES_RE`) surfaces warnings to the UI correctly. The `_enhance_achievement_for_ats` path checks strong verbs but only logs server-side. For a candidate who bypasses the rewrite step, weak verbs may survive to final output without the user seeing a warning.

**Skills categories:** Three variant priority orders are defined (`standard`, `technical`, `academic`). Deduplication via synonym map prevents aliased double-listing. Sidebar placement separates skills visually from experience — correct scan pattern for hiring managers.

**Publications quality:** The review table ranks by relevance score, shows first-author ★, flags missing venues with ⚠, and lets the user curate. The final template switches headings based on count. The only defect is in the ATS-report validator's DOCX check — the rendered HTML/PDF output is correct.

**Cover letter:** The backend is well-specified with all structural acceptance criteria met at the prompt level. LLM compliance at runtime (word count, no generic opener) is the remaining variable; no post-generation checks exist.

---

## Additional Story Gaps / Proposed Story Items

1. **GAP-NEW-HM-01** (MEDIUM — BUG): DOCX ATS validator (`cv_orchestrator.py:4882–4889`) asserts publications heading must be exactly `"Publications"` and fails on `"Selected Publications"`. This directly contradicts US-M7 and the HTML template's own heading logic at line 4592. The validator should apply the same `total_count > selected_count` rule used by the DOCX generator and HTML template.

2. **GAP-NEW-HM-02** (LOW): No post-generation cover letter length verification. The prompt targets a word count range; a simple post-generation check against `_cover_letter_word_count_instruction` bounds would enforce US-M6 acceptance criterion.

3. **GAP-NEW-HM-03** (LOW): Minimum bullet count per experience entry (US-M2: ≥2 bullets) is not validated anywhere. Could be added to `validate_ats_report` as a new DOCX check.

4. **GAP-NEW-HM-04** (LOW): `_enhance_achievement_for_ats` verb-check warning is server-log-only and separate from the `persuasion_warnings` UI path. If this check should surface to the user, the two paths need unification.

5. **GAP-NEW-HM-05** (LOW): Publication venue warning in review UI is advisory only. A candidate can accept a venue-less publication with no barrier. Acceptance criterion says entries missing venue are "flagged during Customisation" — flag exists but is not blocking.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/routes/master_data_routes.py, web/publications-review.js, templates/cv-template.html

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-M1 (Page 1 Layout) | 7 | 1 | 0 | 1 | 1 |
| US-M2 (Work Experience) | 3 | 3 | 0 | 0 | 1 |
| US-M3 (Skills Readability) | 3 | 1 | 0 | 0 | 1 |
| US-M4 (Multi-Page Flow) | 5 | 1 | 0 | 0 | 0 |
| US-M5 (Visual Identity) | 11 | 0 | 0 | 0 | 0 |
| US-M6 (Cover Letter) | 5 | 2 | 0 | 0 | 0 |
| US-M7 (Publications) | 8 | 3 | 0 | 0 | 0 |
| **Total** | **42** | **11** | **0** | **1** | **3** |

**Key evidence references:**

- `templates/cv-template.html:86–99` — two-column layout (32% sidebar / 68% main)
- `templates/cv-template.html:280` — `page-break-inside: avoid` on `.job-entry`
- `templates/cv-template.html:381–401` — sidebar background persistence via faux-column gradient + `box-decoration-break: clone`
- `templates/cv-template.html:641` — candidate name as largest element (Merriweather 2.2rem)
- `templates/cv-template.html:691–695` — "Selected Publications" vs "Publications" conditional heading
- `scripts/utils/cv_orchestrator.py:503–531` — `_deduplicate_skills` with canonical synonym map
- `scripts/utils/cv_orchestrator.py:541–580` — skills category ordering by template variant
- `scripts/utils/cv_orchestrator.py:3965–3983` — action-verb check (server-log-only path)
- `scripts/utils/cv_orchestrator.py:4003–4027` — `_WEAK_VERBS` / `_VAGUE_PHRASES` persuasion check (surfaces to UI)
- `scripts/utils/cv_orchestrator.py:4592` — DOCX "Selected Publications" heading logic (correct)
- `scripts/utils/cv_orchestrator.py:4882–4889` — DOCX ATS validator incorrectly rejects "Selected Publications" — **BUG**
- `scripts/utils/cv_orchestrator.py:5022–5040` — page count validation (warns 1-page, fails >4)
- `scripts/utils/cv_orchestrator.py:886–891` — first-author detection from author string
- `scripts/utils/cv_orchestrator.py:894–896` — venue_warning flag for missing venue entries
- `scripts/routes/master_data_routes.py:111–122` — role-differentiated cover letter word count
- `scripts/routes/master_data_routes.py:1587–1630` — cover letter prompt: company context, tone, achievements, interview-request closing
- `web/publications-review.js:138` — venue warning ⚠ icon in customisation UI (advisory, not blocking)
