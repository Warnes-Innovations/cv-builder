<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# HR / ATS Persona Review — Cycle 4
**Date:** 2026-06-18  
**Time:** ~19:00 ET  
**Reviewer persona:** HR Coordinator / ATS Analyst  
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/ats-refinement.js, web/ats-modals.js, web/download-tab.js, scripts/web_app.py, scripts/utils/cv_orchestrator.py, scripts/utils/scoring.py, scripts/routes/review_routes.py, scripts/routes/generation_routes.py  

---

## Application Evaluation

### US-H1: ATS File Ingestion

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Single-column DOCX — no tables | ✅ | `cv_orchestrator.py:4755-4760` — `doc.tables` count checked; table presence is a validation FAIL |
| No text boxes / shapes | ✅ | `cv_orchestrator.py:4766-4773` — VML textbox + MC Fallback elements checked; presence is a WARN |
| Contact info in body, not header/footer | ✅ | `cv_orchestrator.py:3711-3728` — contact block written to document body as a paragraph, not to `doc.sections[x].header` |
| ATS-safe fonts (Arial/Calibri/Times New Roman) | ⚠️ | `cv_orchestrator.py:3843-3867` — `_setup_ats_styles` sets `Heading 1` and `Heading 2` font sizes and bold; **Normal body font is not explicitly set** for ATS DOCX. The human DOCX sets `Calibri` explicitly (`cv_orchestrator.py:4366-4370`) but the ATS DOCX `_setup_ats_styles` does not call `style.font.name` for Normal — relies on python-docx default (Calibri), which may vary |
| All URLs spelled out as plain text | ⚠️ | LinkedIn URL written as plain text in ATS contact line (`cv_orchestrator.py:3724-3726`). However, no explicit check strips hyperlink relationship from the LinkedIn paragraph — python-docx `add_paragraph()` text is plain, so this is fine in practice, but no explicit no-hyperlink enforcement |
| 100% text selectable / extractable | ✅ | `cv_orchestrator.py:4746-4752` — validation check 1: extracts text and fails if < 100 chars |
| JSON-LD `<script type="application/ld+json">` present in HTML | ✅ | `cv_orchestrator.py:1475-1581` — `_build_json_ld()` constructs full Schema.org/Person block; embedded in HTML head via `cv_data['json_ld_str']` |
| HTML JSON-LD validated during report | ✅ | `cv_orchestrator.py:4884-4947` — checks 9-12 parse and verify JSON-LD structure |

**Failure modes addressed:** Tables ✅, text boxes ✅ (warn), headers/footers ✅, multi-column ✅, graphics (n/a — HTML template is structured HTML not image-based), custom fonts ⚠️ (partial).

---

### US-H2: ATS Section Recognition

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Generated DOCX uses `Heading 1` style for all section headings | ✅ | `cv_orchestrator.py:3735,3754,3759,3764,3797-3799,4229` — all section calls use `style='Heading 1'` |
| Heading text matches accepted labels | ✅ | Labels used: `"Professional Summary"`, `"Technical Skills"`, `"Core Competencies"`, `"Work Experience"`, `"Education"`, `"Certifications"`, `"Publications"` — all in the accepted set |
| No creative section names in ATS DOCX | ✅ | Human DOCX can have a user-overridden skills heading (`_resolve_human_skills_title`); ATS DOCX always uses the hardcoded ATS-safe strings |
| Heading text validated post-generation | ✅ | `cv_orchestrator.py:4785-4815` — check 5 compares headings against `STANDARD` frozenset |
| `"Publications"` heading exactly that label | ✅ | `cv_orchestrator.py:4864-4877` — check 16 enforces exact string `"Publications"` and fails otherwise |

**Gap:** The user story's accepted-label table also includes `"Contact Information"` as a section label. The ATS DOCX does not emit a `Heading 1` labeled "Contact Information" — the contact block is a plain center-aligned paragraph above the summary. This is arguably correct ATS practice (contact before the first heading), but it means check 5 will not see a "Contact" Heading 1 either. The validation `STANDARD` frozenset (`cv_orchestrator.py:4785-4792`) includes `'contact'` as an accepted heading but the DOCX never generates one — so this ATS category goes unscanned.

---

### US-H3: Contact Information Parsing

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Contact block is first content in document body | ✅ | `cv_orchestrator.py:3699-3732` — name paragraph then contact paragraph added before any section heading |
| Name, city/state, phone, email on first 1-2 lines | ✅ | `cv_orchestrator.py:3712-3728` — contact parts joined with `' | '` into one paragraph |
| Phone normalized to `NNN-NNN-NNNN` (no parentheses) | ✅ | `cv_orchestrator.py:4086-4095` — `_normalize_phone()` strips non-digits and reformats to `NNN-NNN-NNNN` |
| LinkedIn URL spelled out as plain text | ✅ | `cv_orchestrator.py:3724-3726` — `contact.get('linkedin')` appended as plain text |
| No full street address (city + state only) | ✅ | `cv_orchestrator.py:3714-3720` — extracts `city, state` only from address dict |
| Credentials (Ph.D.) after name with comma separator | ⚠️ | No explicit formatting of credentials — depends entirely on how `personal_info.name` is stored in `Master_CV_Data.json`. The system passes the name field through unchanged; no code enforces `"Gregory R. Warnes, Ph.D."` format or warns if credentials are missing the comma separator |

---

### US-H4: Keyword Matching and Scoring

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Post-generation keyword check compares JD keywords to ATS DOCX text | ✅ | `cv_orchestrator.py:4845-4862` — check 8 (`ats_keyword_presence`) scans DOCX body text against `ats_keywords[:15]` |
| System reports: keyword present, section where it appears, match type | ✅ | `scoring.py:477-527` — `compute_ats_score()` produces `keyword_status` list with `keyword`, `type`, `status`, `matched_in_sections`, `match_type` |
| System warns when keyword absent from ATS DOCX | ✅ | `cv_orchestrator.py:4856-4862` — WARN if ≤ 1/3 missing, FAIL if > 1/3 missing |
| Keyword variants normalized (case, hyphen/slash) | ⚠️ | `scoring.py:450-475` — uses substring containment (`kw_lower in term or term in kw_lower`) and token matching. No hyphen/slash normalization (`"Scikit-learn"` vs `"Scikit-Learn"` would fail exact match and rely on substring — partial). Synonym map in `cv_orchestrator.py:142-152` expands common aliases but hyphen variants are not explicitly normalized |
| `knowsAbout` verified to contain all approved skill names | ⚠️ | `cv_orchestrator.py:4921-4930` — check 11 (`html_jsonld_knows_about`) fails if `knowsAbout` is empty or has fewer than 3 entries. Does NOT cross-check that skills in `knowsAbout` include each individually approved skill name |

---

### US-H5: Date and Employment History Parsing

| Criterion | Status | Evidence |
|-----------|--------|---------|
| All date ranges use em-dash `--` separator | ✅ | `cv_orchestrator.py:3774` — `date_range = f"{exp.get('start_date', '')} – {exp.get('end_date', 'Present')}"` uses Unicode en/em-dash `–` |
| All dates include month and year | ⚠️ | `cv_orchestrator.py:3774` passes `start_date` / `end_date` verbatim from master data — no validation that the stored date includes a month. Year-only dates in `Master_CV_Data.json` would pass through unchanged. Validation check 7 (`docx_date_format_consistent`) only checks for consistency of format, not completeness (month required) |
| Job entry on one line: `Title | Company | Location | Date Range` | ✅ | `cv_orchestrator.py:3767-3779` — assembles one pipe-separated line and adds it as a bold paragraph |
| No overlapping date ranges | ✅ | `cv_orchestrator.py:4612-4680` — `_detect_date_overlaps()` runs before generation; warnings logged and persisted to `metadata.json` (line 2202) |
| "Present" used for current role (not future date) | ✅ | `cv_orchestrator.py:3774` — default is `'Present'` if `end_date` is absent; `_parse_end_date()` at line 3151-3164 maps `'current'`, `'present'`, `'now'`, `'ongoing'` to today |

**Gap:** Date overlap detection results are logged and persisted to metadata but are **not surfaced in the UI** during the workflow. A user with overlapping roles would see no warning during generation.

---

### US-H6: ATS Output Validation Report

| Criterion | Status | Evidence |
|-----------|--------|---------|
| System runs programmatic ATS validation checks after generation | ✅ | `review_routes.py:2284-2340` — `GET /api/ats-validate` runs `validate_ats_report()` with 16 checks |
| Results displayed in UI with pass/warn/fail | ✅ | `download-tab.js:76-142` — `_renderValidationSummary()` renders a details table with pass/warn/fail icons per check |
| Any FAIL blocks download with clear explanation | ✅ | `download-tab.js:132-139,160-180` — critical fails block DOCX/HTML/PDF downloads; `keywordFail` blocks all |
| Any WARN allows download but shows issue | ✅ | `download-tab.js:144-157` — `_NON_BLOCKING_CHECKS` set defines advisory-only checks |
| Validation results included in `metadata.json` | ✅ | `review_routes.py:2321-2329` — `conversation.state['validation_results']` patched into `metadata.json` |

**Check gaps vs US-H6 checklist:**
- Check 9 (keyword density not stuffed) — 🔲 Not implemented; no density ceiling check
- Check 13 (HTML renders correctly in browser) — ⚠️ The check named `html_renders_ok` (`cv_orchestrator.py:4954,4961`) verifies the PDF was generated successfully, not actual browser rendering of the HTML file
- Fonts embedded in PDF (check 15 of story) — 🔲 Not in the 16-check suite
- No clipped content at margins — 🔲 Not in the 16-check suite

---

### US-H7: ATS Match Score Visibility

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Overall match score (0-100%) computed and displayed after job analysis | ✅ | `scoring.py:530-534` — `overall = round(0.7 * hard_score + 0.3 * soft_score, 1)`; `ats-refinement.js:150-181` — badge displayed in position bar |
| Score is weighted: hard skills count twice as much as soft | ✅ | `scoring.py:534` — `overall = round(0.7 * hard_score + 0.3 * soft_score, 1)` — hard skills weight is 2.33x soft |
| Score updates live as user approves/rejects customization items | ✅ | `ats-refinement.js:211-213` — `scheduleAtsRefresh` with 600ms debounce called from `achievements-review.js:406`, `experience-review.js:342`, `skills-review.js:1081`, `rewrite-review.js:435`, `spell-check.js:169` |
| Score persisted to `metadata.json` at generation time | ✅ | `generation_routes.py:1700,1704` — `gen["ats_score"] = score` and `_try_patch_metadata(conv, {"ats_score": score})` |
| Score UI labels three per-skill states: Matched, Missing, Bonus | ⚠️ | `ats-modals.js:169-219` and `ats-refinement.js:42-114` — Hard/Soft/Bonus groups rendered with match/missing status but Bonus does not use a distinct star (★) icon as required by the acceptance criterion — it appears in the group count but not per-row |

---

### US-H8: Hard / Soft Skill Distinction in ATS Output

| Criterion | Status | Evidence |
|-----------|--------|---------|
| LLM classifies every extracted skill as hard or soft during job analysis | ⚠️ | Classification uses `_classify_skill_type()` at `cv_orchestrator.py:4098-4114` — **not the LLM**. The function uses category-name heuristics and a hardcoded `_SOFT_SKILL_NAMES` frozenset. LLM classification is not invoked |
| Candidate's master CV skills classified and persisted in `Master_CV_Data.json` | ❌ | The `skill_type` field is read from `skill.get('skill_type')` (line 4104) as an explicit override, but no code writes `skill_type` back to `Master_CV_Data.json`. Classification is computed at render time only |
| ATS DOCX separates skills into "Technical Skills" (hard) and "Core Competencies" (soft) | ✅ | `cv_orchestrator.py:3743-3761` — `hard_skills` and `soft_skills` lists built via `_classify_skill_type`, emitted under separate `Heading 1` paragraphs |
| HTML JSON-LD `knowsAbout` entries include `"additionalType": "HardSkill"` or `"SoftSkill"` | ✅ | `cv_orchestrator.py:1528-1537` — each `DefinedTerm` entry includes `'additionalType': 'HardSkill' if ... == 'hard' else 'SoftSkill'` |
| User can override any skill classification in the UI | ❌ | No UI control found for per-skill hard/soft toggle. `skills-review.js` has no `skill_type` or classification override render. The `skill_type` stored field is read but no UI writes it |
| Missing hard skills highlighted more prominently than missing soft | ✅ | `ats-modals.js:208-212` — a distinct amber block for "Missing hard requirements" is rendered separately from other keyword gaps |

---

## Generated Materials Evaluation

### ATS DOCX Structure

**Section ordering in `_generate_ats_docx` (cv_orchestrator.py:3682-3834):**
1. Name (bold run, centered, 16pt) — not a Heading style
2. Contact line (plain paragraph, centered)
3. Blank paragraph
4. `Professional Summary` (Heading 1)
5. Summary text
6. `Technical Skills` (Heading 1, if hard skills present)
7. `Core Competencies` (Heading 1, if soft skills present)
8. `Work Experience` (Heading 1)
9. Per-experience entries (bold run, bullets via `List Bullet` style)
10. `Education` (Heading 1)
11. Additional sections via `_add_ats_additional_sections` → `Certifications` / `Publications` (Heading 1)

**ATS DOCX compliance matrix:**

| ATS Requirement | Status | Note |
|-----------------|--------|------|
| Single-column | ✅ | All content added as sequential paragraphs |
| No tables | ✅ | No `doc.add_table()` calls in ATS path |
| No shapes | ✅ | No inline shapes |
| Contact in body | ✅ | Lines 3711-3729 |
| Standard heading labels | ✅ | All match accepted labels |
| Heading 1 style for all sections | ✅ | All `doc.add_paragraph(..., style='Heading 1')` |
| Phone format `NNN-NNN-NNNN` | ✅ | `_normalize_phone()` at line 4086 |
| Full URL as plain text | ✅ | No hyperlink objects created |
| Font: Arial/Calibri/Times New Roman | ⚠️ | ATS DOCX `_setup_ats_styles` does not explicitly set `Normal.font.name` — relies on python-docx default. Heading 1 and List Bullet fonts are set to sizes but not to named font families |
| Em-dash `--` in date ranges | ✅ | Line 3774 uses `–` |
| Month + year in dates | ⚠️ | Passes through master data verbatim; year-only entries not caught |

### HTML / JSON-LD Structure

**JSON-LD fields generated (`_build_json_ld`, cv_orchestrator.py:1475-1581):**
- `@context`: `https://schema.org` ✅
- `@type`: `Person` ✅
- `name`: from `personal_info.name` ✅
- `jobTitle`: from `job_analysis.title` ✅
- `description`: professional summary ✅
- `email`: conditional on presence ✅
- `telephone`: conditional ✅
- `sameAs`: LinkedIn + website URLs ✅
- `address.addressLocality`: city/state display ✅
- `alumniOf`: list of `EducationalOrganization` ✅
- `hasOccupation`: list of `Role` entries ✅
- `knowsAbout`: list of `DefinedTerm` with `name` + `additionalType` ✅
- `award`: list of formatted award strings ✅

**Structural note:** `_validate_json_ld()` (line 1585-1596) checks only `['@context', '@type', 'name']`. The `email` and `telephone` fields — which the user story requires for US-H3 and US-H6 check 12 — are not in the JSON-LD internal validation, though they are covered by `validate_ats_report` check 12.

### PDF Structure

- Chrome headless (primary) or WeasyPrint (fallback) — check confirms PDF generation success
- US Letter size verified at `cv_orchestrator.py:4985-5005` (check 14)
- Selectable text checked at `cv_orchestrator.py:4964-4973` (check 15)
- Font embedding not validated (no check in the 16-check suite)

---

## Additional Story Gaps / Proposed Story Items

### GAP-H1 (HIGH): Skill Classification Not LLM-Driven
**US-H8** requires the LLM to classify every extracted skill as hard or soft during job analysis. The current implementation uses a rule-based heuristic (`_classify_skill_type` at `cv_orchestrator.py:4098-4114`) with a hardcoded soft-skill frozenset. Novel skill names that do not appear in the hardcoded lists default to "hard" silently.

### GAP-H2 (HIGH): Skill Type Not Persisted to Master CV Data
**US-H8** requires classification to be persisted in `Master_CV_Data.json`. No write-back occurs. Each session re-classifies skills at render time.

### GAP-H3 (HIGH): No Per-Skill Hard/Soft Override in UI
**US-H8** requires the user to override any skill classification. No override control exists in `skills-review.js`. The `skill_type` stored field is read but no UI panel allows the user to toggle it.

### GAP-H4 (MED): Date Overlap Warnings Not Surfaced in UI
**US-H5** validation detects overlapping dates (`_detect_date_overlaps`) and stores results in `metadata.json` but no UI panel shows these warnings during the workflow. Users with parallel consulting/employment roles receive no visual feedback.

### GAP-H5 (MED): Month Required in Dates Not Enforced
**US-H5** requires `January 2020–Present` format. Year-only dates in `Master_CV_Data.json` pass through to the ATS DOCX unchanged. Validation check 7 checks consistency of format, not completeness (month required).

### GAP-H6 (MED): `knowsAbout` Cross-Check Is Coarse
**US-H4** requires the system to verify that `knowsAbout` contains all approved skill names from rewrite decisions. Check 11 only validates `len(ka) >= 3`. No check confirms each individually approved skill appears in `knowsAbout`.

### GAP-H7 (LOW): Bonus Skill State Missing Star Icon in Score UI
**US-H7** requires three per-skill state labels: Matched, Missing, Bonus ★. The current badge summary distinguishes Bonus as a count group but does not use a star icon in keyword table rows.

### GAP-H8 (LOW): ATS DOCX Normal Font Name Not Explicitly Set
**US-H1** requires Arial, Calibri, or Times New Roman. The ATS DOCX generator sets font sizes on `Heading 1` and `List Bullet` but does not call `doc.styles['Normal'].font.name = 'Calibri'`. The human DOCX does (line 4370).

### GAP-H9 (LOW): Keyword Density ("Not Stuffed") Check Absent
**US-H6** advisory check 9 requires warning when keyword density is unnaturally high. No density ceiling check is implemented.

### GAP-H10 (LOW): PDF Font Embedding Not Validated
**US-H6** item 15 ("Fonts embedded") is not in the 16-check ATS report. Chrome headless and WeasyPrint produce embedded fonts in practice, but this is unverified programmatically.

---

## Evidence Summary

| Story | Overall Status | Critical Gaps |
|-------|---------------|---------------|
| US-H1: ATS File Ingestion | ✅ Mostly pass | ATS DOCX Normal font name not explicit (GAP-H8) |
| US-H2: ATS Section Recognition | ✅ Pass | Contact heading omitted by design; no functional gap |
| US-H3: Contact Information Parsing | ✅ Mostly pass | Credential format (Ph.D. comma) not enforced by code |
| US-H4: Keyword Matching | ⚠️ Partial | `knowsAbout` cross-check coarse (GAP-H6); hyphen variants not normalized |
| US-H5: Date Parsing | ⚠️ Partial | Month not enforced (GAP-H5); overlap warning not shown in UI (GAP-H4) |
| US-H6: ATS Validation Report | ⚠️ Partial | Keyword density check absent (GAP-H9); font-embed check absent (GAP-H10) |
| US-H7: ATS Match Score Visibility | ✅ Mostly pass | Bonus star icon missing (GAP-H7) |
| US-H8: Hard/Soft Skill Distinction | ❌ Partial | No LLM classification (GAP-H1); no persistence (GAP-H2); no UI override (GAP-H3) |

**Priority order for next cycle:** GAP-H1 → GAP-H3 → GAP-H2 → GAP-H4 → GAP-H5 → GAP-H6 → GAP-H7 → GAP-H8 → GAP-H9 → GAP-H10
