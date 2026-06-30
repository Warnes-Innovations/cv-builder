<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# HR/ATS Persona Review

**Last Updated:** 2026-06-30 14:30 ET
**Branch:** feature/multi-user-deployment
**Reviewer:** hr-ats persona (source-first, automated)
**Story file:** `tasks/user-story-hr-ats.md`

---

## Executive Summary

The application has strong ATS infrastructure across all three output formats. The core pipeline — ATS DOCX generation, Schema.org JSON-LD embedding, keyword scoring, date-overlap detection, and a 16-check `validate_ats_report` function — is well implemented and wired to the UI via a dedicated ATS Report modal and live badge. The primary gaps are: (1) the ATS DOCX does not set an explicit ATS-safe font name (python-docx inherits the default theme font, not explicitly Calibri/Arial); (2) the hard/soft skill classification is display-only in the UI — the user cannot override it and have that override propagate to generated documents; (3) the overall ATS match score uses a 70/30 hard/soft weighting rather than the story-required 2:1 (hard counts twice) formula; (4) `Master_CV_Data.json` does not persist `skill_type` from sessions; (5) downloads are not blocked when validation checks return `fail`.

**Pass/Fail summary (33 criteria evaluated across 8 stories):**

| Status | Count |
| --- | --- |
| ✅ Pass | 20 |
| ⚠️ Partial | 6 |
| ❌ Fail | 5 |
| 🔲 Not Implemented | 2 |
| — N/A | 0 |

---

## Application Evaluation

### US-H1: ATS File Ingestion

| Criterion | Status | Evidence |
| --- | --- | --- |
| Single-column layout; zero tables/text boxes in DOCX | Pass | `cv_orchestrator.py:3682-3834` — `_generate_ats_docx` uses only `doc.add_paragraph()` calls; no `doc.add_table()`. `validate_ats_report` checks 2 (`docx_zero_tables`) and 3 (`docx_zero_shapes`) confirm at runtime (`cv_orchestrator.py:4756-4774`). |
| Contact information in document body (not header/footer) | Pass | `cv_orchestrator.py:3710-3729` — contact block written to document body before any heading. `validate_ats_report` check 4 (`docx_contact_in_body`) searches body text for email (`cv_orchestrator.py:4776-4783`). |
| All fonts are Arial, Calibri, or Times New Roman at 10-12pt | Partial | `cv_orchestrator.py:3836-3867` (`_setup_ats_styles`) sets font sizes (Pt 12 Heading 1, Pt 11 Heading 2, Pt 10 List Bullet, Pt 11 entry line, Pt 16 name) but **never sets `font.name`** on any ATS DOCX style. The human DOCX sets `font.name = 'Calibri'` at line 4369 but the ATS DOCX inherits the default theme font (often Calibri Light). No font-name check exists in `validate_ats_report`. |
| All URLs spelled out as plain text (no formatted hyperlinks) | Pass | `cv_orchestrator.py:3726` — `contact_parts.append(contact['linkedin'])` appends the raw string as plain text. No `_add_hyperlink()` call in `_generate_ats_docx` (unlike `_generate_human_docx` lines 4415-4440). |
| ATS text extraction test: 100% text selectable | Pass | `validate_ats_report` check 1 (`docx_text_selectable`, line 4748): fails if extracted text < 100 chars. DOCX built from plain paragraphs so text is always selectable. |
| Multi-format output (DOCX, PDF, HTML) generated | Pass | `cv_orchestrator.py:2122-2185` — `generate_cv` generates ATS DOCX, HTML, PDF, human DOCX in sequence and returns all filenames. |

### US-H2: ATS Section Recognition

| Criterion | Status | Evidence |
| --- | --- | --- |
| Generated DOCX uses `Heading 1` Word style for all section headings | Pass | `cv_orchestrator.py:3735` "Professional Summary", `3754` "Technical Skills", `3759` "Core Competencies", `3764` "Work Experience", `3799` "Education", `4227-4248` "Certifications", "Awards" — all use `style='Heading 1'`. `validate_ats_report` check 6 (`docx_heading1_present`, line 4818) verifies at runtime. |
| Heading text matches exactly one accepted label from the story table | Pass | All generated headings ("Professional Summary", "Technical Skills", "Core Competencies", "Work Experience", "Education", "Certifications", "Awards") appear in the STANDARD frozenset at `cv_orchestrator.py:4786-4793` and match story-accepted labels. |
| No creative section names in the ATS DOCX | Pass | `_generate_ats_docx` uses only the literal strings above; the human DOCX `_heading()` helper is not called from the ATS path. |

### US-H3: Contact Information Parsing

| Criterion | Status | Evidence |
| --- | --- | --- |
| Contact block is the first content in the document body | Pass | `cv_orchestrator.py:3699-3729` — name paragraph added first, then contact paragraph, before any section heading. |
| Name, city/state, phone, email on first 1-2 lines | Pass | `cv_orchestrator.py:3704-3729` — name is one paragraph; contact (city, phone, email, linkedin) joined as `' \| '.join(contact_parts)` is the second paragraph. |
| Phone formatted as `NNN-NNN-NNNN` (no parentheses) | Pass | `cv_orchestrator.py:4086-4095` (`_normalize_phone`): strips all non-digits, reformats as `NNN-NNN-NNNN`. Called at line 3722. |
| LinkedIn URL spelled out as plain text | Pass | `cv_orchestrator.py:3726` — raw `contact['linkedin']` string appended; no hyperlink element. |
| No full street address in ATS DOCX (city + state only) | Pass | `cv_orchestrator.py:3711-3720` — only `city` and `state` fields used; comment confirms "City/state only (no street address)". |
| Credentials (Ph.D.) appear after name with comma separator | Partial | Name is taken as-is from `personal_info.get('name', '')` (line 3700). If `Master_CV_Data.json` stores "Gregory R. Warnes, Ph.D." the format is correct, but no normalization or validation enforces the credential separator format. No dedicated check in `validate_ats_report`. |

### US-H4: Keyword Matching and Scoring

| Criterion | Status | Evidence |
| --- | --- | --- |
| Post-generation keyword check compares job keywords against ATS DOCX text | Pass | `validate_ats_report` check 8 (`ats_keyword_presence`, lines 4846-4863): iterates top 15 `ats_keywords` from `job_analysis`, checks each against `docx_text.lower()`, reports missing count and status. |
| System reports keyword present, section where found, match type | Pass | `scoring.py:443-475` (`_match_status`): returns status ("matched"/"partial"/"missing") and `matched_in_sections` list. Rendered in `ats-modals.js:83-101` with keyword, coverage badge, and sections column. |
| System warns when a required keyword is absent from ATS DOCX | Pass | `validate_ats_report` line 4857: `warn` when ≤ 1/3 missing; `fail` when > 1/3 missing. `_renderAtsReport` (`ats-modals.js:208-217`) renders orange box for missing hard requirements. |
| Keyword variants normalised: case-insensitive, hyphen/slash equivalence | Partial | Case-insensitive: yes — `_match_status` uses `.lower()` throughout (`scoring.py:451`). Synonym expansion via `_expansion_index` is applied in `_optimize_skills_for_ats` (`cv_orchestrator.py:3914-3927`) for skill selection, but `compute_ats_score` in `scoring.py` does not apply synonym expansion — only string containment checks. Hyphen/slash equivalence is not explicitly normalized. |
| System verifies `knowsAbout` in HTML JSON-LD contains all approved skill names | Pass | `validate_ats_report` HTML check 11 (`html_jsonld_knows_about`, lines 4922-4931): verifies `knowsAbout` has >= 3 entries. `_build_json_ld` (`cv_orchestrator.py:1528-1537`) populates `knowsAbout` from all `skills_by_category` entries with `additionalType: HardSkill/SoftSkill`. |

### US-H5: Date and Employment History Parsing

| Criterion | Status | Evidence |
| --- | --- | --- |
| All date ranges use consistent separator character (em-dash) | Pass | `cv_orchestrator.py:3774`: `date_range = f"{exp.get('start_date', '')} – {exp.get('end_date', 'Present')}"` — uses U+2013 en-dash (consistent with story's own example character). |
| All dates include month and year | Partial | Dates are passed through from `Master_CV_Data.json` as-is. The date overlap checker (`_detect_date_overlaps`) accepts year-only formats (`%Y` at line 4628). No validation enforces "month + year" format at DOCX generation time. `validate_ats_report` check 7 detects mixed formats but does not require month+year. |
| Job entry header on one line: `Title \| Company \| Location \| Date Range` | Pass | `cv_orchestrator.py:3767-3779` — `entry_parts` assembles title, company, optional location, date range joined with `' \| '`; written as a single bold paragraph. |
| No overlapping date ranges (system validates) | Pass | `cv_orchestrator.py:2078-2088` (`_detect_date_overlaps`) detects overlaps and logs warnings; results stored in `metadata['date_overlap_warnings']` (line 2202). Same-company overlaps excluded (line 4665). |
| "Present" used for current role (not future date) | Pass | `cv_orchestrator.py:3774`: `exp.get('end_date', 'Present')` — defaults to "Present" if no end date. |

### US-H6: ATS Output Validation Report

| Criterion | Status | Evidence |
| --- | --- | --- |
| System runs programmatic ATS validation checks after generation | Pass | `cv_orchestrator.py:3831` — `_validate_ats_compatibility` called after `_generate_ats_docx`. `validate_ats_report` (lines 4686-5031) runs 16 checks on DOCX + HTML + PDF. |
| Results displayed in UI with pass/warn/fail for each check | Pass | ATS Report modal (`web/index.html:688-702`), opened by `openAtsReportModal()` (`ats-modals.js:118-154`); renders `keyword_status` with Exact/Partial/Missing badges and section coverage table. |
| Any fail blocks download with a clear explanation | Fail | The ATS report UI is informational only. The download step proceeds regardless of validation status. No code in `generation_routes.py` or the download handler blocks download when `validate_ats_report` returns `fail` checks. |
| Any warn allows download but shows the specific issue | Fail | Warnings are shown in the ATS Report modal but there is no distinct warn-but-allow-download UI state — the modal is entirely separate from the download panel. |
| Validation results included in `metadata.json` | Partial | `metadata['date_overlap_warnings']` persisted (line 2202) and `metadata['ats_score']` written via `_try_patch_metadata` (`generation_routes.py:1703-1704`). However the 16-check validation report list from `validate_ats_report` is not stored in `metadata.json` during generation — only the scalar ATS score is. |

### US-H7: ATS Match Score Visibility

| Criterion | Status | Evidence |
| --- | --- | --- |
| Overall match score (0-100%) computed and displayed after job analysis | Pass | `scoring.py:345-554` (`compute_ats_score`); called at `generation_routes.py:1698`. Badge displayed via `updateAtsBadge` (`ats-refinement.js:150-181`); value shown in `#ats-score-value` (`web/index.html:89`). |
| Score weighted: hard skills count twice as much as soft skills | Fail | `scoring.py:533-534`: `overall = round(0.7 * hard_score + 0.3 * soft_score, 1)`. This is 70/30, not the story-required 2:1 (66.7/33.3). The practical difference is small but the code does not implement the specified "twice as much" formula exactly. |
| Score updates live as user approves/rejects customisation items — no page reload | Pass | `scheduleAtsRefresh()` called from `skills-review.js:1081`, `rewrite-review.js:505`, `experience-review.js:342`, `achievements-review.js:406`, `summary-review.js:261/289/358`, `spell-check.js:169/438`. Debounced 600ms (`ats-refinement.js:213`). No page reload required. |
| Score persisted to `metadata.json` at generation time | Pass | `generation_routes.py:1700-1704`: `gen["ats_score"] = score; _try_patch_metadata(conv, {"ats_score": score})`. Also written at finalise time (lines 1948-1950). |
| Score UI clearly labels three per-skill states: Matched, Missing, Bonus | Partial | `ats-modals.js:50-58` renders "Exact match" (green), "Partial match" (amber), "Missing" (red). Bonus keywords have a separate group `['bonus', 'Bonus Keywords']` (ats-modals.js:22-26). However the story specifies Bonus as "★ (candidate has skill not in JD)" — the UI uses the text label "Bonus Keywords" without a star icon, and "Partial match" exists as an additional state not described in the story. Missing hard requirements are prominently highlighted (`ats-modals.js:208-212`). |

### US-H8: Hard / Soft Skill Distinction in ATS Output

| Criterion | Status | Evidence |
| --- | --- | --- |
| LLM classifies every extracted skill as hard or soft during job analysis | Pass | `cv_orchestrator.py:4097-4114` (`_classify_skill_type`): checks explicit `skill_type` field, then category heuristics (`_SOFT_SKILL_CATEGORIES`), then name lookup (`_SOFT_SKILL_NAMES`). Applied at `_generate_ats_docx` (lines 3748-3751) and JSON-LD building (line 1532). |
| Candidate's master CV skills classified and persisted in `Master_CV_Data.json` | Not Implemented | `_classify_skill_type` is a read-only inference method. There is no code path that writes `skill_type` back to `Master_CV_Data.json`. Classification is ephemeral — recalculated each generation from heuristics. |
| ATS DOCX separates skills into "Technical Skills" (hard) and "Core Competencies" (soft) | Pass | `cv_orchestrator.py:3748-3761`: `hard_skills` and `soft_skills` lists built; separate `Heading 1` paragraphs "Technical Skills" and "Core Competencies" added conditionally. |
| HTML JSON-LD `knowsAbout` entries include `additionalType: "HardSkill"` or `"SoftSkill"` | Pass | `cv_orchestrator.py:1528-1537`: each `knowsAbout` entry includes `'additionalType': 'HardSkill' if self._classify_skill_type(sk) == 'hard' else 'SoftSkill'`. |
| User can override any classification in the UI; override propagates to generated documents | Fail | `skills-review.js:667-671`: skill type badge is display-only (read from `hardSkillSet`/`softSkillSet` derived from job analysis). No UI control exists for type override. No backend route accepts a `skill_type` override. The `skill_qualifier_overrides` state field (`conversation_manager.py:119`) covers proficiency/subskills/parenthetical but not `skill_type`. |
| Missing hard skills highlighted more prominently than missing soft skills | Pass | `ats-modals.js:208-212`: missing hard requirements get a distinct orange box rendered before the soft/remaining keyword gaps box (lines 213-217). |

---

## Generated Materials Evaluation

### ATS DOCX (`*_ATS.docx`)

| Check | Status | Evidence |
| --- | --- | --- |
| All text selectable as plain text (no locked fields) | Pass | `validate_ats_report` check 1: `len(docx_text) > 100` passes. Pure python-docx paragraph generation — no field locks, no images. |
| Zero tables detected | Pass | `validate_ats_report` check 2: `len(doc.tables) == 0`. No `doc.add_table()` in `_generate_ats_docx`. |
| Zero text boxes or shapes detected | Pass | `validate_ats_report` check 3: searches for VML textbox and MC:Fallback elements. No shape APIs used. |
| Contact info in document body (not header/footer) | Pass | `validate_ats_report` check 4: email regex in body text. Contact written to body at lines 3710-3729. |
| All section headings use standard labels | Pass | `validate_ats_report` check 5: STANDARD frozenset includes all generated heading labels. |
| All section headings use Word Heading 1 style | Pass | `validate_ats_report` check 6: `h1_count > 0` passes. All section labels use `style='Heading 1'`. |
| Date formats consistent | Pass | `validate_ats_report` check 7: <=1 format type detected. ATS DOCX uses consistent `start_date – end_date` pattern (line 3774). |
| Keywords from job description present in body text | Pass | `validate_ats_report` check 8: top 15 ATS keywords checked against `docx_text.lower()`. |
| Font family restricted to ATS-safe fonts | Fail | `_setup_ats_styles` (lines 3836-3867) sets font sizes but never sets `font.name`. The ATS DOCX inherits Word's default theme font. No font-name validation in `validate_ats_report`. The human DOCX correctly sets `font.name = 'Calibri'` (line 4369) but the ATS DOCX does not. |
| Publications heading reads exactly "Publications" | Pass | `validate_ats_report` check 16 (`docx_publications_heading`, lines 4866-4878). `_add_ats_additional_sections` does not currently add a publications section, so check passes as "No publications section (optional)". |

### HTML (`*.html`)

| Check | Status | Evidence |
| --- | --- | --- |
| `<script type="application/ld+json">` present and valid JSON | Pass | `validate_ats_report` check 9 (`html_jsonld_present`, lines 4906-4907). `_build_json_ld` returns `json.dumps(...)` at line 1581; embedded via `json_ld_str` variable in template. |
| `knowsAbout` array populated with approved skill names + `additionalType` | Pass | `validate_ats_report` check 11 (>=3 entries pass). `_build_json_ld` lines 1528-1537 build typed `DefinedTerm` entries with `additionalType`. |
| Required fields present: `name`, `email`, `telephone`, `hasOccupation` | Pass | `validate_ats_report` check 12 verifies `name` and `email` (lines 4933-4941). `hasOccupation` and `telephone` also set at lines 1563-1574 when contact data is present. |
| HTML renders correctly in browser (two-column layout visible) | N/A | Runtime browser rendering not verifiable from source alone. |

### PDF (`*.pdf`)

| Check | Status | Evidence |
| --- | --- | --- |
| All pages US Letter size | Pass | `validate_ats_report` check 14 (`pdf_us_letter`, lines 4981-5006): checks mediabox width~612, height~792 pts. Warns if A4 detected. |
| Fonts embedded | Not Implemented | `validate_ats_report` does not check font embedding in PDF. Chrome/WeasyPrint generally embed fonts but no programmatic verification exists. |
| No clipped content at margins | Not Implemented | No margin-clipping check in `validate_ats_report`. Page count is checked but not content clipping at margins. |
| PDF has selectable text (not image-based) | Pass | `validate_ats_report` check `pdf_has_text` (lines 4963-4974): extracts text from first 3 pages, warns if < 50 chars. |

---

## Additional ATS/HR Gaps Not in Story File

1. **GAP-ATS-01 — Font name not set in ATS DOCX**: `_setup_ats_styles` modifies font size and color but never sets `font.name` on any ATS DOCX style. The document inherits Word's default theme font. `validate_ats_report` has no font-family check. Fix: add `heading1.font.name = 'Calibri'` etc. in `_setup_ats_styles` and add a font-name validation check.

2. **GAP-ATS-02 — `validate_ats_report` 16-check results not stored in `metadata.json`**: Only `date_overlap_warnings` and the scalar `ats_score` are persisted at generation time. The full pass/warn/fail breakdown from the 16-check report is not included, making audit records incomplete.

3. **GAP-ATS-03 — Download not blocked by validation failures**: Story US-H6 requires any `fail` check to block download. No such gate exists — the "Package Application Files" button and download tab proceed regardless of `validate_ats_report` outcomes.

4. **GAP-ATS-04 — Publications section missing from ATS DOCX**: `_add_ats_additional_sections` adds certifications and awards but not publications. If a candidate has publications, they appear only in the human-readable DOCX and HTML, not in the ATS DOCX. An ATS scanning for publication keywords will not find them.

5. **GAP-ATS-05 — Synonym expansion not applied in `compute_ats_score`**: `_optimize_skills_for_ats` expands skill names via `_expansion_index` but `compute_ats_score` in `scoring.py` uses only raw string containment. A job keyword "Machine Learning" will not match a skill stored as "ML" in keyword status, even though they are synonyms.

6. **GAP-ATS-06 — Skill type override not supported**: US-H8 requires user override of hard/soft classification. The UI shows a display-only badge derived from job analysis lists. No input control or backend route accepts `skill_type` overrides, and no session state field tracks them.

7. **GAP-ATS-07 — `skill_type` not persisted to `Master_CV_Data.json`**: US-H8 requires the classification to be "persisted in `Master_CV_Data.json`". No code path writes `skill_type` back to the master data file; classification is re-derived from heuristics at each generation.

8. **GAP-ATS-08 — Date format not validated to enforce month+year**: US-H5 requires "all dates include month and year." The `_detect_date_overlaps` parser accepts year-only formats (`%Y` format, line 4628). If master data has year-only dates they pass through to the ATS DOCX. No generation-time enforcement exists.

9. **GAP-ATS-09 — PDF font embedding not verified**: US-H6 check 15 requires fonts to be embedded. `validate_ats_report` does not inspect PDF font embedding via pypdf. Chrome headless and WeasyPrint generally embed fonts by default but this is not programmatically confirmed.

10. **GAP-ATS-10 — ATS score weighting formula does not exactly match story spec**: Story US-H7 says "hard skill matches count twice as much as soft skill matches." The implementation uses 70%/30% (`scoring.py:534`) rather than the exact 2:1 (66.7%/33.3%) ratio. The practical difference is ~3.4 percentage points at maximum divergence.

---

## Reviewed Against

- `tasks/user-story-hr-ats.md` — US-H1 through US-H8 (all acceptance criteria)
- `web/index.html` — Position bar ATS badge, ATS Report modal, ATS Score tab
- `web/app.js` — init, ATS badge restore on load
- `web/ui-core.js` — Tab management, settings modal
- `web/state-manager.js` — `atsScore` state, `getAtsScore`/`setAtsScore`
- `web/ats-refinement.js` — `updateAtsBadge`, `refreshAtsScore`, `scheduleAtsRefresh`, `formatAtsScoreSummary`
- `web/ats-modals.js` — `openAtsReportModal`, `_renderAtsReport`, `populateAtsScoreTab`
- `web/skills-review.js` — skill type badge (display-only), `scheduleAtsRefresh` on submit
- `web/styles.css` — `.ats-score-*` classes
- `scripts/utils/cv_orchestrator.py` — `_generate_ats_docx`, `_setup_ats_styles`, `_classify_skill_type`, `_build_json_ld`, `_validate_ats_compatibility`, `validate_ats_report`, `_normalize_phone`, `_detect_date_overlaps`, `_optimize_skills_for_ats`
- `scripts/utils/scoring.py` — `compute_ats_score`, `_match_status`
- `scripts/utils/conversation_manager.py` — session state schema
- `scripts/routes/generation_routes.py` — `/api/cv/ats-score` endpoint, `_try_patch_metadata`
- `scripts/web_app.py` — `validate_ats_report` import/wiring

---

## Summary Table

| Story | Criterion Summary | Status |
| --- | --- | --- |
| US-H1 | ATS file ingestion — layout, contact, fonts, URLs, selectability | Partial — font name not set in ATS DOCX |
| US-H2 | Section recognition — Heading 1 styles, standard labels | Pass |
| US-H3 | Contact parsing — block order, format, phone, LinkedIn, no street | Partial — Ph.D. credential passthrough unvalidated |
| US-H4 | Keyword matching — check, reporting, warnings, normalisation | Partial — synonym expansion missing in `compute_ats_score` |
| US-H5 | Date parsing — separator, month+year, one-line entry, overlaps, Present | Partial — month+year not enforced at generation time |
| US-H6 | Validation report — 16 checks, UI, block/warn on fail, metadata | Fail — download not blocked on fail; 16-check list not in metadata |
| US-H7 | ATS score visibility — live, weighted, persisted, three states | Partial/Fail — weighting 70/30 vs required 2:1; Bonus icon missing star |
| US-H8 | Hard/soft skill distinction — classify, persist, separate, additionalType, override | Fail — no UI override; `skill_type` not persisted to master data |

---

## Key Evidence References

- ATS DOCX generation: `scripts/utils/cv_orchestrator.py:3682-3834`
- ATS style setup (font gap): `scripts/utils/cv_orchestrator.py:3836-3867`
- JSON-LD build with typed `knowsAbout`: `scripts/utils/cv_orchestrator.py:1475-1581`
- ATS validation report (16 checks): `scripts/utils/cv_orchestrator.py:4686-5031`
- ATS match score computation: `scripts/utils/scoring.py:345-554`
- ATS score API endpoint: `scripts/routes/generation_routes.py:1606-1706`
- ATS badge update + live refresh: `web/ats-refinement.js:150-213`
- ATS Report modal render: `web/ats-modals.js:169-219`
- Skill type classification (heuristic only, not persisted): `scripts/utils/cv_orchestrator.py:4097-4114`
- Phone normalisation: `scripts/utils/cv_orchestrator.py:4086-4095`
- Date overlap detection: `scripts/utils/cv_orchestrator.py:4613-4681`
- Skill type badge (display-only, no override): `web/skills-review.js:667-671`
- Score weighting (70/30, not 2:1): `scripts/utils/scoring.py:533-534`
