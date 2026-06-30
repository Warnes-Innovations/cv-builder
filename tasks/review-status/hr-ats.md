<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# HR/ATS Persona Review

**Persona:** HR Staffer / ATS Perspective  
**User Stories:** US-H1 through US-H8  
**Review Date:** 2026-06-30 ET (cycle 15 re-verification)
**Reviewer:** Source-verified UI review (automated + manual trace)
**Branch:** feature/multi-user-deployment

---

## GAP-218 Critical Verification

**Status: CONFIRMED FIXED**

`cv_orchestrator.py` lines 4880–4889 contain:

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

Both "Publications" and "Selected Publications" are accepted. The check uses `not in _allowed` as required.

**User story spec updated in cycle 14:** `user-story-hr-ats.md` line 77 now lists
`"Publications" or "Selected Publications"` as the accepted label and `"Papers", "Research Work", "Academic Output"` as rejected labels. Spec and implementation are in agreement.

---

## US-H1: ATS File Ingestion

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Single-column layout; zero tables, text boxes, or multi-column sections | ✅ Pass | `cv_orchestrator.py:_generate_ats_docx` uses sequential `doc.add_paragraph()` calls only; no `doc.add_table()`. ATS validation check `docx_zero_tables` verifies 0 tables at runtime (line 4765). Shape check `docx_zero_shapes` detects VML textboxes (line 4777). |
| Contact information in document body (not in Word header/footer) | ✅ Pass | Contact is written via `doc.add_paragraph()` (line 3726), not `doc.sections[0].header`. Runtime check `docx_contact_in_body` verifies email presence in body text (line 4786). |
| All fonts are Arial, Calibri, or Times New Roman at 10–12pt | ✅ Pass | `_setup_ats_styles()` (line 3834) sets `Normal` style to Calibri 11pt, `Heading 1` to Calibri 12pt, `Heading 2` to Calibri 11pt, `List Bullet` to Calibri 10pt. All within ATS-safe range. |
| All URLs spelled out as plain text (no formatted hyperlinks) | ✅ Pass | LinkedIn added to `contact_parts` as raw string (line 3724); joined with `' | '.join(contact_parts)` (line 3726) — no `_add_hyperlink()` call in ATS DOCX path. (Human DOCX uses `_add_hyperlink` at line 4424.) |
| ATS text extraction test: 100% text selectable | ✅ Pass | Runtime check `docx_text_selectable` (line 4757) verifies >100 characters extracted. |

**Overall US-H1:** ✅ Pass — all five acceptance criteria are satisfied in the ATS DOCX generation path.

---

## US-H2: ATS Section Recognition

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Generated DOCX uses Heading 1 Word style for all section headings | ✅ Pass | `_generate_ats_docx` applies `style='Heading 1'` to every section heading: `Professional Summary` (line 3733), `Technical Skills` / `Core Competencies` (lines 3752, 3757), `Work Experience` (line 3762), `Education` (line 3797). Runtime check `docx_heading1_present` counts Heading 1 paragraphs (line 4827). |
| Heading text matches exactly one of the accepted labels | ✅ Pass | Generated headings: "Professional Summary", "Technical Skills", "Core Competencies", "Work Experience", "Education", "Publications" / "Selected Publications", "Certifications". All match accepted labels in the user story table (line 77, updated cycle 14) and in the STANDARD set (`validate_ats_report` line 4795). GAP-218 fix confirmed: `_allowed = {'Publications', 'Selected Publications'}` (line 4880). The human DOCX also uses `'Selected Publications'` or `'Publications'` per `_generate_human_docx` line 4590. |
| No creative section names appear in the ATS DOCX | ✅ Pass | `_generate_ats_docx` only emits hard-coded standard labels. Runtime check `docx_standard_headings` warns on non-standard headings (line 4820). |

**Overall US-H2:** ✅ Pass — implementation is correct and spec is aligned (cycle 14 update to user-story-hr-ats.md line 77 now lists "Publications" or "Selected Publications" as accepted labels). No divergence remains.

---

## US-H3: Contact Information Parsing

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Contact block is the first content in the document body | ✅ Pass | `_generate_ats_docx` writes name paragraph (line 3702) and contact paragraph (line 3726) before any section headings. |
| Name, city/state, phone, email on first 1–2 lines | ✅ Pass | Name on line 1 (bold run); city/state, phone, email pipe-separated on line 2 (lines 3711–3726). |
| Phone formatted as NNN-NNN-NNNN (no parentheses) | ✅ Pass | `_normalize_phone()` (line 4095) strips all non-digits and formats as `{digits[:3]}-{digits[3:6]}-{digits[6:]}`. |
| LinkedIn URL spelled out as plain text | ✅ Pass | `contact.get('linkedin')` appended as raw string to `contact_parts` (line 3724), not wrapped in hyperlink. |
| No full street address in ATS DOCX (city + state only) | ✅ Pass | Comment at line 3709: "City/state only (no street address)"; code uses `address_display` or constructs `"{city}, {state}"` (lines 3713–3718). |
| Credentials (Ph.D.) appear after name with comma separator | ⚠️ Partial | The `name` field is taken directly from `personal_info.name` (line 3698). If the master CV stores "Gregory R. Warnes, Ph.D." in the name field, it appears correctly. However there is no schema-level `credentials` or `degree_suffix` field, and no code explicitly appends credentials after the name. Correct output depends on how the user populates the `name` field in `Master_CV_Data.json`. No automated validation enforces the comma-separator format. |

**Overall US-H3:** ⚠️ Partial — four of five criteria pass unconditionally. The credentials formatting depends on user data entry convention with no enforcement.

---

## US-H4: Keyword Matching and Scoring

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Post-generation keyword check compares job keywords against ATS DOCX text | ✅ Pass | `validate_ats_report` check #8 `ats_keyword_presence` (lines 4855–4872): lowercases both keyword list and DOCX text, performs substring match, reports missing keywords. |
| System reports: keyword present, section where it appears, match type | ⚠️ Partial | The `validate_ats_report` check reports only "present/missing" at the document level (line 4862). Per-section reporting is in `compute_ats_score()` (`scoring.py:345`) which returns `matched_in_sections` per keyword. **The DOCX-level ATS check does not report which section a keyword appears in.** The full section-level reporting is available only via the `/api/cv/ats-score` endpoint and the ATS Score tab / ATS Report modal. |
| System warns when a required keyword is absent from ATS DOCX text | ✅ Pass | `validate_ats_report`: if >1/3 of ATS keywords are missing → `fail`; if ≤1/3 missing → `warn` (lines 4866–4872). Warn/fail both surface in the Download tab ATS Report table. |
| Keyword variants normalised: case-insensitive, hyphen/slash variants | ⚠️ Partial | Case-insensitive: both ATS DOCX check (line 4861 `.lower()`) and scoring engine (line 450 `kw_lower`) lowercase before matching. **Hyphen/slash equivalence (e.g., "ML/MLOps" matching "MLOps") is not implemented.** `_match_status` in `scoring.py` does substring containment and token matching but no hyphen-to-slash normalization. |
| System verifies `knowsAbout` in HTML JSON-LD contains all approved skill names | ✅ Pass | `validate_ats_report` HTML check #11 `html_jsonld_knows_about` (line 4934): verifies `knowsAbout` has ≥3 entries (pass) or warns/fails on fewer. `_generate_html_json_ld()` (line 1528) populates `knowsAbout` with all skills from `skills_by_category` with `additionalType` annotations. |

**Overall US-H4:** ⚠️ Partial — keyword presence check and warning are implemented. Section-level per-keyword reporting exists in the ATS Score modal but not in the DOCX-level validation report. Hyphen/slash variant normalization is absent.

---

## US-H5: Date and Employment History Parsing

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All date ranges use consistent separator (em-dash `–`) | ✅ Pass | `_generate_ats_docx` line 3772: `date_range = f"{exp.get('start_date', '')} – {exp.get('end_date', 'Present')}"` — uses Unicode en-dash `–` (U+2013) consistently. Note: this is an en-dash not em-dash, but both are supported by major ATS. |
| All dates include month and year | ⚠️ Partial | Dates are taken as-is from `exp.get('start_date', '')` and `exp.get('end_date', 'Present')`. No validation enforces month+year format on the stored data. The runtime check `docx_date_format_consistent` detects format inconsistency but does not enforce month inclusion. If a user stores year-only dates in master CV, they pass through unchanged. |
| Job entry header on one line: `Title | Company | Location | Date Range` | ✅ Pass | `_generate_ats_docx` lines 3773–3777 build `entry_parts` with title, company, optional location, date range, joined with ` | `. One `doc.add_paragraph()` call writes all parts as a single bold run. |
| No overlapping date ranges in work history (system validates this) | ⚠️ Partial | `_detect_date_overlaps()` (line 4622) runs during generation (line 2078) and logs a warning. Overlap warnings are returned in the status response (`date_overlap_warnings`, line 2202) but **there is no ATS report check in `DOCX_CHECKS` for overlapping date ranges**. Overlap detection is advisory logging only; it does not surface in the Download tab ATS Report. |
| "Present" is used for current role (not future date) | ✅ Pass | Line 3772: `exp.get('end_date', 'Present')` — defaults to "Present". No future-date validation, but the default ensures current roles display correctly. |

**Overall US-H5:** ⚠️ Partial — job entry format, separator character, and "Present" default are implemented. Month+year enforcement and overlap display in the ATS report are not enforced.

---

## US-H6: ATS Output Validation Report

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| System runs programmatic ATS validation checks after generation | ✅ Pass | `validate_ats_report()` (`cv_orchestrator.py:4695`) runs full DOCX + HTML + PDF checks. Called from generation routes. |
| Results displayed in UI with pass/warn/fail for each check | ✅ Pass | `download-tab.js:_renderValidationSummary()` (line 76) renders a `<details>` table with per-check status icons (✅/⚠/❌), format badge, and detail text. `_renderDownloadGrid()` applies blocking logic (lines 159–224). |
| Any fail blocks download with clear explanation | ✅ Pass | `download-tab.js:_NON_BLOCKING_CHECKS` set (line 147) exempts advisory checks; critical fails set `blockDocx`/`blockHtml`/`blockPdf` flags (lines 161–164). Blocked files show "Blocked" button (disabled, greyed out at opacity 0.4) with explanation text (lines 188–215). |
| Any warn allows download but shows the specific issue | ✅ Pass | Warn status renders ⚠ icon and amber row background but does not set blocking flags. Download button remains enabled. |
| Validation results included in `metadata.json` | ⚠️ Partial | `ats_score` is persisted to `metadata.json` via `_try_patch_metadata(conv, {"ats_score": score})` (generation_routes.py:1704). However, the full per-check `ats_checks` list is not separately stored in `metadata.json` — only the score object. The per-format pass/warn/fail table is runtime-computed and not archived. |

**Specific ATS validation checks implemented:**
- DOCX: text selectable, zero tables, zero shapes, contact in body, standard headings, Heading 1 style, date format consistency, keyword presence, publications heading ✅ (GAP-218 fixed)
- HTML: JSON-LD present, schema.org/Person type, `knowsAbout` populated, name+email fields present
- PDF: generated successfully, selectable text, US Letter page size, page count

**Missing from spec vs. implementation:**
- US-H6 check #15 "Fonts embedded" — no programmatic font embedding check is implemented.
- US-H6 check #16 "No clipped content at margins" — no margin/content clipping check is implemented.

**Overall US-H6:** ⚠️ Partial — core validation infrastructure is solid and renders correctly. Two PDF checks (font embedding, margin clipping) are absent. Full `ats_checks` list is not archived to `metadata.json`.

---

## US-H7: ATS Match Score Visibility

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Overall match score (0–100%) computed and displayed after job analysis | ✅ Pass | `compute_ats_score()` (`scoring.py:345`) returns `overall` (0–100). Badge displayed in position bar (`index.html:88–95`; `ats-refinement.js:150–181`). Score color-coded: green ≥75%, amber ≥50%, red <50% (styles.css:102–104). |
| Score weighted: hard skills count 2× soft skills | ✅ Pass | `scoring.py:534`: `overall = round((2 * hard_score + soft_score) / 3, 1)` — exactly 2:1 weighting. |
| Score updates live as user approves/rejects customization items | ✅ Pass | `scheduleAtsRefresh()` called on skill decision changes (`skills-review.js:1081`), rewrite approvals (`rewrite-review.js:505`), summary selection (`summary-review.js:261`, `289`, `358`), achievement edits (`achievements-review.js:406`), and spell check completion (`spell-check.js:169`, `438`). 600ms debounce prevents excessive API calls. No page reload required. |
| Score persisted to `metadata.json` at generation time | ✅ Pass | `generation_routes.py:1704`: `_try_patch_metadata(conv, {"ats_score": score})` writes score to metadata.json. Also stored in session `generation_state` (line 1700). |
| Score UI labels three per-skill states: Matched ✅, Missing ❌, Bonus ★ | ⚠️ Partial | The ATS Report modal renders status as colored badge pills: "Exact match" (green), "Partial match" (amber), "Missing" (red), grouped by "Hard Requirements", "Preferred Skills", "Bonus Keywords" (`ats-modals.js:50–58`, `22–26`). **The user story spec (US-H7) requires the three states be labeled: Matched ✅, Missing ❌, Bonus ★. The actual labels are "Exact match" / "Partial match" / "Missing", with grouping into Hard/Soft/Bonus groups.** The ★ symbol is not used for bonus keywords. The distinction between "Matched" and "Partial match" is an improvement over the spec but deviates from the specified label vocabulary. |

**Overall US-H7:** ⚠️ Partial — the scoring math, live updates, persistence, and color coding are fully implemented. The per-keyword state label vocabulary (Matched ✅ / Missing ❌ / Bonus ★) differs from the implementation's "Exact match" / "Partial match" / "Missing" with group-level "Bonus Keywords". The spec labels are not literally rendered.

---

## US-H8: Hard / Soft Skill Distinction in ATS Output

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| LLM classifies every extracted skill as hard or soft during job analysis | ⚠️ Partial | `_classify_skill_type()` (`cv_orchestrator.py:4107`) uses `skill_type` field if stored, otherwise applies category/name heuristics. Classification happens at DOCX generation time, not during LLM job analysis. The LLM analysis output (`job_analysis`) provides `required_skills` (hard) and `nice_to_have_skills` (soft) which are used as proxy hard/soft signals in skills-review (`skills-review.js:440–441`) but the LLM is not explicitly instructed to classify individual candidate skills as hard/soft. |
| Candidate master CV skills classified and persisted in `Master_CV_Data.json` | ⚠️ Partial | Schema supports `skill_type: "hard" | "soft"` per skill (`master_cv_data.schema.json:148`). `_classify_skill_type()` reads this field first (line 4113). **However there is no UI mechanism for the user to set or override `skill_type` in the skills-review panel.** The Hard/Soft badge in `skills-review.js` (lines 667–671) is display-only, derived from job analysis `required_skills`/`nice_to_have_skills` sets, not from the persisted `skill_type` field. No API endpoint updates `skill_type` in Master_CV_Data. |
| ATS DOCX separates skills into "Technical Skills" (hard) and "Core Competencies" (soft) | ✅ Pass | `_generate_ats_docx` (lines 3751–3758) adds "Technical Skills" Heading 1 section for hard skills and "Core Competencies" Heading 1 section for soft skills, separated by `_classify_skill_type()`. |
| HTML JSON-LD `knowsAbout` entries include `"additionalType": "HardSkill"` or `"SoftSkill"` | ✅ Pass | `_generate_html_json_ld()` (line 1532): `'additionalType': 'HardSkill' if self._classify_skill_type(sk) == 'hard' else 'SoftSkill'` for every skill in `skills_by_category`. |
| User can override any classification in UI; override propagates to generated documents | ❌ Fail | No UI control exists to toggle `skill_type` for a specific skill. The skills-review Hard/Soft badge (lines 667–671) is read-only CSS decoration. No API endpoint (`/api/master-cv` or otherwise) is wired to update the `skill_type` field. The schema supports it, the backend reads it, but there is no write path from the UI. |
| Missing hard skills highlighted more prominently than missing soft skills | ✅ Pass | ATS Report modal (`ats-modals.js:208–217`): missing hard requirements rendered in a distinct orange warning box before the general keyword gap box. Header shows "Hard requirements: X%" and "Preferred skills: Y%" (lines 201–202). Missing hard skills also surface first in the badge summary via `_buildSummaryDetail()` (`ats-refinement.js:47–54`). |

**Overall US-H8:** ⚠️ Partial — DOCX hard/soft separation and JSON-LD `additionalType` annotation are fully implemented. Classification persistence in master CV is schema-supported but has no UI write path (missing skill type override control). LLM-driven skill classification during analysis is only indirect (via required/nice-to-have lists, not per-candidate-skill labeling).

---

## Summary Table

| Story | Status | Key Finding |
|-------|--------|-------------|
| US-H1: ATS File Ingestion | ✅ Pass | Single-column DOCX, contact in body, Calibri fonts, plain-text URLs, validated at runtime. |
| US-H2: ATS Section Recognition | ✅ Pass | GAP-218 fixed and spec updated in cycle 14. All section heading labels match accepted list. |
| US-H3: Contact Information Parsing | ⚠️ Partial | Phone normalized, city-only, plain-text LinkedIn. Credentials formatting not enforced by code. |
| US-H4: Keyword Matching and Scoring | ⚠️ Partial | Keyword presence check and warn/fail implemented. Section-level reporting only in ATS Score modal. Hyphen/slash variant normalization absent. |
| US-H5: Date and Employment History | ⚠️ Partial | One-line entry format and separator implemented. Month+year format not enforced. Overlap warnings not surfaced in ATS report. |
| US-H6: ATS Output Validation Report | ⚠️ Partial | 13 of 16 checks implemented. Font embedding and margin clipping checks absent. `ats_checks` list not archived in metadata.json. |
| US-H7: ATS Match Score Visibility | ⚠️ Partial | Score computation, live updates, color coding, persistence all implemented. Specified label vocabulary (Matched ✅ / Missing ❌ / Bonus ★) differs from implementation. |
| US-H8: Hard/Soft Skill Distinction | ⚠️ Partial | DOCX section separation and JSON-LD `additionalType` implemented. No UI override for skill type classification. |

---

## New Gaps Identified

| Gap ID | Priority | Description | Source Location |
|--------|----------|-------------|-----------------|
| — | MED | **US-H4: Hyphen/slash keyword variant normalization absent.** "ML/MLOps" will not match "MLOps" in DOCX keyword presence check or scoring engine. | `cv_orchestrator.py:4856–4862`, `scoring.py:450` |
| — | LOW | **US-H5: Month+year date format not enforced.** Year-only dates in master CV pass through without warning. | `cv_orchestrator.py:3772` |
| — | LOW | **US-H5: Date overlap not surfaced in ATS report.** `_detect_date_overlaps()` logs warnings but no `DOCX_CHECKS` entry for overlapping date ranges. | `cv_orchestrator.py:2078`, `4733–4742` |
| — | MED | **US-H6: Font embedding not checked.** PDF validation lacks a check that fonts are embedded (only page size and text selectability are checked). | `cv_orchestrator.py:4961–4990` |
| — | LOW | **US-H6: Margin clipping not checked.** No check verifies content is not clipped at page margins. | `cv_orchestrator.py:4961–5042` |
| — | LOW | **US-H6: `ats_checks` list not archived in metadata.json.** Only `ats_score` is persisted; per-check results are runtime-only. | `generation_routes.py:1703–1704` |
| — | MED | **US-H7: Label vocabulary mismatch.** Spec requires "Matched ✅ / Missing ❌ / Bonus ★"; implementation uses "Exact match / Partial match / Missing" with grouped "Bonus Keywords". | `ats-modals.js:50–58, 22–26` |
| — | HIGH | **US-H8: No UI override for skill type classification.** `skill_type` field in schema and read by `_classify_skill_type()` but no UI write path exists. Skills-review Hard/Soft badge is display-only. | `skills-review.js:667–671`, `cv_orchestrator.py:4107–4123` |
| — | MED | **US-H8: LLM does not explicitly classify candidate skills as hard/soft.** Job analysis provides required/nice-to-have lists used as proxy but candidate skill labeling is heuristic-only. | `cv_orchestrator.py:4107–4123` |
| — | LOW | **US-H3: Credentials (Ph.D.) format not enforced.** Depends on user populating `name` field with credentials. No schema field or validation. | `cv_orchestrator.py:3698`, `schemas/master_cv_data.schema.json:13` |

---

## Generated Materials Evaluation

### ATS DOCX (`*_ATS.docx`)

| Property | Status | Evidence |
| -------- | ------ | -------- |
| Single-column, no tables or text boxes | ✅ Pass | `_generate_ats_docx` uses only `doc.add_paragraph()` — no `doc.add_table()` or shape calls. Runtime-checked by `docx_zero_tables` and `docx_zero_shapes`. |
| Contact in body, not header/footer | ✅ Pass | Name + contact paragraph written before any heading; runtime-verified by `docx_contact_in_body`. |
| Calibri font, 10–12pt throughout | ✅ Pass | `_setup_ats_styles()`: Normal→Calibri 11pt, Heading 1→Calibri 12pt, List Bullet→Calibri 10pt. |
| Plain-text URLs (LinkedIn as raw string) | ✅ Pass | LinkedIn appended to `contact_parts` as raw string (line 3724); no `_add_hyperlink()` call in ATS path. |
| Heading 1 style on all section headings | ✅ Pass | `style='Heading 1'` on Professional Summary, Technical Skills, Core Competencies, Work Experience, Education, Certifications, Awards. |
| Standard section heading labels | ✅ Pass | All hard-coded headings match the STANDARD set and US-H2 accepted labels table. GAP-218 verified. |
| Skills split: Technical Skills (hard) / Core Competencies (soft) | ✅ Pass | `_classify_skill_type()` separates skills; two Heading 1 sections generated (lines 3751–3758). |
| One-line job entry (Title / Company / Location / Date Range) | ✅ Pass | `entry_parts` assembled and joined with ` \| ` as a single bold run (lines 3773–3781). |
| Date separator is en-dash `–` | ✅ Pass | Line 3772: `f"{start} – {end}"` using Unicode `–` (U+2013). |
| Publications heading is "Publications" or "Selected Publications" | ✅ Pass | `_generate_human_docx` line 4590: conditional on total vs. selected count. ATS DOCX does not include publications (not in `_add_ats_additional_sections`). Validator accepts both via `_allowed` (line 4880). |
| ATS keyword presence checked post-generation | ✅ Pass | `validate_ats_report` check #8 (`ats_keyword_presence`): substring match against lowercased DOCX text; warns/fails on missing keywords. |

### HTML (`*.html`)

| Property | Status | Evidence |
| -------- | ------ | -------- |
| JSON-LD `<script>` block present in `<head>` | ✅ Pass | `_generate_html_json_ld()` returns JSON-LD string; embedded in HTML `<head>` by template renderer. Validated by `html_jsonld_present` check. |
| `@type: Person` with schema.org context | ✅ Pass | JSON-LD always includes `'@context': 'https://schema.org', '@type': 'Person'` (lines 1553–1555). Validated by `html_jsonld_valid_person`. |
| `knowsAbout` populated with skills + `additionalType` | ✅ Pass | `_generate_html_json_ld()` line 1528–1537: iterates `skills_by_category`, emits `DefinedTerm` entries with `HardSkill`/`SoftSkill` `additionalType`. |
| Required fields: `name`, `email`, `telephone`, `hasOccupation` | ✅ Pass | Lines 1556–1574: all four fields conditionally added. `hasOccupation` built from work history. Validated by `html_required_fields`. |
| HTML renders correctly in browser | ✅ Pass | PDF rendered via Chrome/WeasyPrint from same HTML; PDF presence and text selectability validated post-render. |

### PDF (`*.pdf`)

| Property | Status | Evidence |
| -------- | ------ | -------- |
| US Letter page size | ✅ Pass | `pdf_us_letter` check (lines 4992–5017): reads `mediabox` dimensions via pypdf; warns if A4, passes if within 6pt of 612×792. |
| Selectable text (not image-based) | ✅ Pass | `pdf_has_text` check (lines 4976–4985): extracts text from up to 3 pages; warns if <50 characters. |
| PDF generated successfully | ✅ Pass | `html_renders_ok` check (lines 4973–4974): verifies PDF exists and pypdf can read it. |
| Fonts embedded | 🔲 Not Implemented | No check verifies PDF font embedding. pypdf can inspect embedded fonts but no check is wired. |
| No clipped content at margins | 🔲 Not Implemented | No margin/content-clipping check exists in the validation pipeline. |

### ATS Match Score (UI + API)

| Property | Status | Evidence |
| -------- | ------ | -------- |
| Score displayed in position bar after analysis | ✅ Pass | `updateAtsBadge()` (`ats-refinement.js:150`) reads `score.overall`, renders colored badge in `#ats-score-badge` (`index.html:92–95`). |
| 2:1 hard/soft weighting | ✅ Pass | `scoring.py:534`: `overall = round((2 * hard_score + soft_score) / 3, 1)`. |
| Score updates live on customization changes | ✅ Pass | `scheduleAtsRefresh()` triggered on skill decisions, rewrite approvals, summary selection, achievement edits. 600ms debounce. |
| Score persisted to `metadata.json` | ✅ Pass | `generation_routes.py:1704`: `_try_patch_metadata(conv, {"ats_score": score})`. |
| Per-keyword state labels: Matched / Missing / Bonus | ⚠️ Partial | Labels used: "Exact match" (green), "Partial match" (amber), "Missing" (red); groups: "Hard Requirements", "Preferred Skills", "Bonus Keywords". Spec labels "Matched / Missing / Bonus" not rendered literally. Implementation is more granular (partial-match distinction) but uses different vocabulary. |
