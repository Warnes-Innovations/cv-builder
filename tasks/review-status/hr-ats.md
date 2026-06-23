<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# HR / ATS Review Status

**Last Updated:** 2026-06-22 16:00 ET

**Executive Summary:** The application is comprehensively ATS-aware. It generates an `_ATS.docx` with Heading 1 section markers, a pipe-separated single-line contact block, phone normalization (`NNN-NNN-NNNN`), URL plain-text output, and a 16-check post-generation validation report that blocks downloads on critical failures. A live ATS match-score badge (0–100%, weighted 70% hard / 30% soft) updates within 600 ms as the user approves/rejects skills and rewrites. JSON-LD structured data with `knowsAbout` and `additionalType: HardSkill / SoftSkill` is embedded in the HTML output. Date-overlap detection runs at generation time. The three highest-priority remaining gaps are: (GAP-H1) skill hard/soft classification is rule-based heuristic rather than LLM-driven during job analysis; (GAP-H2) classification is not persisted back to `Master_CV_Data.json`; and (GAP-H3) there is no per-skill UI toggle for the user to override the hard/soft assignment. Six additional lower-priority gaps are documented below.

---

## Application Evaluation

### US-H1: ATS File Ingestion

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Single-column DOCX — no tables | ✅ Pass | `cv_orchestrator.py:4754-4760` — `doc.tables` count checked; presence → validation FAIL |
| No text boxes / shapes | ✅ Pass | `cv_orchestrator.py:4765-4773` — VML textbox + MC Fallback elements checked; presence → WARN |
| Contact info in body, not header/footer | ✅ Pass | `cv_orchestrator.py:3711-3729` — contact block written to document body as plain paragraph before any Heading 1 |
| ATS-safe fonts (Arial/Calibri/Times New Roman) | ⚠️ Partial | `cv_orchestrator.py:3836-3867` — `_setup_ats_styles` sets font sizes on Heading 1, Heading 2, List Bullet but does NOT set `doc.styles['Normal'].font.name`. The human DOCX explicitly sets `font.name = 'Calibri'` at line 4369. ATS DOCX relies on python-docx default (Calibri in practice but not guaranteed). (GAP-H8) |
| All URLs as plain text (no hyperlink objects) | ✅ Pass | `cv_orchestrator.py:3724-3726` — LinkedIn appended as string; no `part.relate_to()` call in the ATS code path |
| 100% text selectable (check 1) | ✅ Pass | `cv_orchestrator.py:4746-4752` — fails if < 100 chars extracted from paragraphs |
| `<script type="application/ld+json">` in HTML | ✅ Pass | `cv_orchestrator.py:1475-1581` — `_build_json_ld()` builds Schema.org/Person block embedded in `cv_data['json_ld_str']` and rendered into the HTML `<head>` |
| HTML JSON-LD validated post-generation | ✅ Pass | `cv_orchestrator.py:4884-4947` — checks 9–12 parse and verify JSON-LD structure and content |

**ATS failure modes guarded against:** Tables ✅, text boxes ✅ (WARN), headers/footers ✅, multi-column ✅, graphics N/A, custom fonts ⚠️ (partial — GAP-H8), invisible text N/A (not produced).

---

### US-H2: ATS Section Recognition

| Criterion | Status | Evidence |
|-----------|--------|---------|
| All section headings use `Heading 1` Word style | ✅ Pass | `cv_orchestrator.py:3735,3754,3759,3764,3797,3799,4229` — every `doc.add_paragraph` for a section heading passes `style='Heading 1'` |
| Heading text matches accepted labels | ✅ Pass | Labels used: `"Professional Summary"`, `"Technical Skills"`, `"Core Competencies"`, `"Work Experience"`, `"Education"`, `"Certifications"`, `"Publications"` — all in the US-H2 accepted set |
| No creative section names in ATS DOCX | ✅ Pass | Human DOCX supports user-overridden heading via `_resolve_human_skills_title`; ATS DOCX uses hardcoded ATS-safe strings only (lines 3754, 3759) |
| Heading text validated post-generation (check 5) | ✅ Pass | `cv_orchestrator.py:4785-4815` — compares headings against `STANDARD` frozenset (includes `"professional summary"`, `"work experience"`, `"technical skills"`, `"core competencies"`, etc.) |
| `"Publications"` heading enforced exactly (check 16) | ✅ Pass | `cv_orchestrator.py:4864-4877` — FAIL if heading text is not exactly `"Publications"` |

---

### US-H3: Contact Information Parsing

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Contact block is first content in document body | ✅ Pass | `cv_orchestrator.py:3699-3732` — name paragraph then contact paragraph precede any Heading 1 |
| Name, city/state, phone, email on 1–2 lines | ✅ Pass | `cv_orchestrator.py:3712-3728` — `contact_parts` joined with pipe separators into a single centered paragraph |
| Phone formatted as `NNN-NNN-NNNN` (no parentheses) | ✅ Pass | `cv_orchestrator.py:4086-4095` — `_normalize_phone()` strips non-digits and reformats to dashes |
| LinkedIn URL spelled out as plain text | ✅ Pass | `cv_orchestrator.py:3724-3726` — appended to `contact_parts` as a plain string; no `part.relate_to()` hyperlink object |
| No full street address (city + state only) | ✅ Pass | `cv_orchestrator.py:3714-3720` — extracts `city, state` from address dict; street not included |
| Credentials (Ph.D.) after name with comma separator | ⚠️ Partial | `name` field from `personal_info` is passed through verbatim (`cv_orchestrator.py:3700,3705`). A name stored as `"Gregory Warnes PhD"` (no comma separator) passes unchanged. No validation or warning is emitted. |

---

### US-H4: Keyword Matching and Scoring

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Post-generation keyword check vs ATS DOCX text | ✅ Pass | `cv_orchestrator.py:4845-4862` — check 8 (`ats_keyword_presence`) scans DOCX body text against `job_analysis['ats_keywords'][:15]`, case-insensitive substring match |
| System reports keyword, section, and match type | ✅ Pass | `scripts/utils/scoring.py:477-527` — `keyword_status` list includes `keyword`, `type`, `status`, `matched_in_sections`, `match_type` per entry |
| System warns when required keyword absent from DOCX | ✅ Pass | `cv_orchestrator.py:4856-4862` — WARN if ≤ 1/3 missing, FAIL if > 1/3 missing |
| Keyword variants normalized (case, hyphen/slash) | ⚠️ Partial | `scoring.py:450-475` — substring containment handles multi-word terms and case. Synonym map (`cv_orchestrator.py:142-152`) covers common aliases (e.g. `"ML"` → `"Machine Learning"`). Hyphen/underscore variants (e.g. `"scikit-learn"` vs `"scikit_learn"`) are not explicitly normalized. |
| `knowsAbout` verified to contain all approved skills | ⚠️ Partial | `cv_orchestrator.py:4921-4930` — check 11 passes if `len(knowsAbout) >= 3`. Does not verify that each individually approved skill appears in the array. (GAP-H6) |

---

### US-H5: Date and Employment History Parsing

| Criterion | Status | Evidence |
|-----------|--------|---------|
| All date ranges use em-dash `–` separator | ✅ Pass | `cv_orchestrator.py:3774` — f-string uses `" – "` (U+2013) between start and end dates |
| All dates include month and year | ⚠️ Partial | `cv_orchestrator.py:3774` passes `start_date`/`end_date` verbatim from master data. Year-only dates (e.g. `"2020"`) pass through unmodified. Check 7 validates format consistency, not presence of month component. (GAP-H5) |
| Job entry on one line: Title, Company, Location, Date Range | ✅ Pass | `cv_orchestrator.py:3767-3779` — pipe-separated single bold run with all four fields (`Title \| Company \| Location \| Date Range`) |
| No overlapping date ranges (system validates) | ✅ Pass | `cv_orchestrator.py:4612-4680` — `_detect_date_overlaps()` runs at generation time; same-company overlaps excluded (promotions handled) |
| `"Present"` used for current role | ✅ Pass | `cv_orchestrator.py:3774` — default value `'Present'`; `_parse_end_date()` maps `'current'`/`'now'`/`'ongoing'` → today |

---

### US-H6: ATS Output Validation Report

| Criterion | Status | Evidence |
|-----------|--------|---------|
| System runs programmatic ATS validation after generation | ✅ Pass | `validate_ats_report()` at `cv_orchestrator.py:4685-5031` implements 16 checks; called via `GET /api/ats-validate` |
| Results displayed in UI with pass/warn/fail per check | ✅ Pass | `download-tab.js:76-142` — `_renderValidationSummary()` renders expandable details table with ✅/⚠/❌ icons per check |
| Any FAIL blocks download with clear explanation | ✅ Pass | `download-tab.js:132-139,160-180` — critical fails grey out DOCX/HTML/PDF buttons; `keywordFail` blocks all formats; `_NON_BLOCKING_CHECKS` set separates advisory from critical |
| Any WARN allows download but shows specific issue | ✅ Pass | `download-tab.js:144-157` — `_NON_BLOCKING_CHECKS` set defines advisory-only check names; WARN never disables buttons |
| Validation results included in `metadata.json` | ✅ Pass | `generation_routes.py:1947` — `metadata['validation_results'] = conversation.state.get('validation_results') or {}` written at finalise |

**US-H6 16-check gap analysis:**

| Check | Implemented | Notes |
| ----- | ----------- | ----- |
| 1 — DOCX text selectable | ✅ | `cv_orchestrator.py:4746` |
| 2 — Zero tables | ✅ | `cv_orchestrator.py:4754` |
| 3 — Zero text boxes / shapes | ✅ | `cv_orchestrator.py:4765` |
| 4 — Contact in body | ✅ | `cv_orchestrator.py:4776` |
| 5 — Standard heading text | ✅ | `cv_orchestrator.py:4785` |
| 6 — Heading 1 style present | ✅ | `cv_orchestrator.py:4817` |
| 7 — Date formats consistent | ✅ | `cv_orchestrator.py:4826` |
| 8 — Keywords from JD present | ✅ | `cv_orchestrator.py:4845` |
| 9 — Keyword density not stuffed | 🔲 Not Impl | No ceiling implemented. (GAP-H9) |
| 10 — HTML JSON-LD present and valid | ✅ | `cv_orchestrator.py:4900` |
| 11 — `knowsAbout` populated | ✅ | `cv_orchestrator.py:4921` |
| 12 — `name` + `email` present | ✅ | `cv_orchestrator.py:4932` |
| 13 — HTML renders correctly in browser | ⚠️ Partial | Check `html_renders_ok` verifies PDF generation success, not actual browser HTML rendering |
| 14 — PDF pages US Letter | ✅ | `cv_orchestrator.py:4985` |
| 15 — Fonts embedded in PDF | 🔲 Not Impl | Chrome/WeasyPrint embed fonts in practice but no programmatic check. (GAP-H10) |
| 16 — Publications heading exact | ✅ | `cv_orchestrator.py:4864` |

---

### US-H7: ATS Match Score Visibility

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Overall score (0–100%) computed and displayed after job analysis | ✅ Pass | `scoring.py:534` — `overall = round(0.7 * hard_score + 0.3 * soft_score, 1)`; badge displayed via `ats-refinement.js:150-181`; header element `#ats-score-badge` at `index.html:87` |
| Score weighted: hard skills count ~2.3× soft skills | ✅ Pass | `scoring.py:534` — 70% hard / 30% soft weighting satisfies "hard skills count twice as much" intent |
| Score updates live as user approves/rejects items | ✅ Pass | `ats-refinement.js:211-213` — `scheduleAtsRefresh` with 600 ms debounce; triggered from skills, experience, rewrite, and spell-check review panels |
| Score persisted to `metadata.json` at generation | ✅ Pass | `generation_routes.py:1700,1704` — `gen["ats_score"] = score` and `_try_patch_metadata(conv, {"ats_score": score})` |
| Score UI labels three states: Matched ✅ / Missing ❌ / Bonus ★ | ⚠️ Partial | `ats-modals.js:50-58` — `_keywordStatusBadge()` returns "Exact match", "Partial match", or "Missing" pills. Bonus keywords are grouped under a "Bonus Keywords" header (`ats-modals.js:22-26`) with an exact/partial/missing count but no ★ icon per individual row. (GAP-H7) |

---

### US-H8: Hard / Soft Skill Distinction in ATS Output

| Criterion | Status | Evidence |
|-----------|--------|---------|
| LLM classifies every extracted skill as hard or soft during job analysis | ⚠️ Partial | `cv_orchestrator.py:4098-4114` — `_classify_skill_type()` is rule-based: checks stored `skill_type` field, then category-name matching against `_SOFT_SKILL_CATEGORIES` frozenset, then name matching against `_SOFT_SKILL_NAMES` frozenset. Novel names default to `'hard'` silently. LLM is not invoked for classification. (GAP-H1) |
| Candidate's master CV skills classified and `skill_type` persisted to `Master_CV_Data.json` | ❌ Fail | `skill_type` is read from `skill.get('skill_type')` (line 4104) as explicit override but no code path writes it back to master data. Classification is recomputed at render time each session. (GAP-H2) |
| ATS DOCX separates skills: "Technical Skills" (hard) / "Core Competencies" (soft) | ✅ Pass | `cv_orchestrator.py:3743-3761` — separate `Heading 1` paragraphs with ATS-standard labels; skill lists built from `_classify_skill_type` per skill |
| HTML JSON-LD `knowsAbout` includes `"additionalType": "HardSkill"/"SoftSkill"` | ✅ Pass | `cv_orchestrator.py:1528-1537` — each `DefinedTerm` entry includes `additionalType` derived from `_classify_skill_type(sk)` |
| User can override any skill classification in the UI | ❌ Fail | No `skill_type` toggle exists in `skills-review.js`. Category and group overrides are implemented (`skills-review.js:77-119`) but no hard/soft type selector. The `skill_type` field that `_classify_skill_type` reads at line 4104 is never written by any UI action. (GAP-H3) |
| Missing hard skills highlighted more prominently than missing soft | ✅ Pass | `ats-modals.js:208-212` — separate amber block for "Missing hard requirements" rendered before generic keyword gaps; `ats-refinement.js:47-55` — header summary line shows "Missing hard: X, Y" when hard keywords are absent |

---

## Generated Materials Evaluation

### ATS DOCX Structure

Section order in `_generate_ats_docx` (`cv_orchestrator.py:3682-3834`):
1. Candidate name — bold run, centered, 16pt (not a Heading style)
2. Contact line — plain centered paragraph, pipe-separated
3. Blank paragraph
4. `Professional Summary` — Heading 1
5. Summary text
6. `Technical Skills` — Heading 1 (if hard skills present)
7. `Core Competencies` — Heading 1 (if soft skills present)
8. `Work Experience` — Heading 1
9. Per-experience bold entry line + `List Bullet` achievements
10. `Education` — Heading 1
11. `Certifications` / `Awards` / `Publications` via `_add_ats_additional_sections` — Heading 1

**ATS DOCX compliance matrix:**

| Requirement | Status | Note |
|-------------|--------|------|
| Single-column | ✅ | Sequential paragraphs only; no `doc.add_table()` |
| No tables | ✅ | Validated by check 2 |
| No shapes | ✅ | Validated by check 3 |
| Contact in body | ✅ | Lines 3711–3729 |
| Standard heading labels | ✅ | All match US-H2 accepted set |
| Heading 1 style for all sections | ✅ | All `doc.add_paragraph(..., style='Heading 1')` |
| Phone format `NNN-NNN-NNNN` | ✅ | `_normalize_phone()` at line 4086 |
| URLs as plain text | ✅ | No `part.relate_to()` calls in ATS path |
| Font: Arial/Calibri/Times New Roman | ⚠️ | Font sizes set on named styles but `doc.styles['Normal'].font.name` not set; defaults to Calibri in practice but unguaranteed. (GAP-H8) |
| Em-dash `–` in date ranges | ✅ | Line 3774 uses U+2013 |
| Month + year in dates | ⚠️ | Verbatim passthrough from master data; year-only dates not rejected. (GAP-H5) |

### HTML / JSON-LD Structure

JSON-LD fields generated by `_build_json_ld` (`cv_orchestrator.py:1475-1581`):

| Field | Status | Note |
|-------|--------|------|
| `@context: https://schema.org` | ✅ | Line 1554 |
| `@type: Person` | ✅ | Line 1555 |
| `name` | ✅ | From `personal_info.name` |
| `jobTitle` | ✅ | From `job_analysis.title` |
| `description` | ✅ | Professional summary |
| `email` | ✅ | Conditional on presence |
| `telephone` | ✅ | Conditional on presence |
| `sameAs` | ✅ | LinkedIn + website via `safe_url()` |
| `address.addressLocality` | ✅ | City/state display string |
| `alumniOf` | ✅ | List of `EducationalOrganization` |
| `hasOccupation` | ✅ | List of `Role` entries with `startDate`/`endDate` |
| `knowsAbout` | ✅ | List of `DefinedTerm` with `name` + `additionalType: HardSkill/SoftSkill` |
| `award` | ✅ | Formatted award strings |

**Note:** `_validate_json_ld()` (line 1585) checks only `@context`, `@type`, `name`. The `email` and `telephone` required by US-H6 check 12 are caught by `validate_ats_report` check 12 (`cv_orchestrator.py:4932`) but not by the internal pre-generation validator.

### PDF Structure

- Generation success: check `html_renders_ok` (`cv_orchestrator.py:4954-4962`)
- US Letter size: check `pdf_us_letter` (`cv_orchestrator.py:4985-5005`)
- Selectable text: check `pdf_has_text` (`cv_orchestrator.py:4964-4973`)
- Font embedding: not verified programmatically (GAP-H10)

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/ats-refinement.js, web/ats-modals.js, web/download-tab.js, web/skills-review.js, scripts/web_app.py, scripts/utils/cv_orchestrator.py, scripts/utils/conversation_manager.py, scripts/utils/scoring.py, scripts/routes/generation_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-H1 ATS File Ingestion | 6 | 1 | 0 | 0 | 0 |
| US-H2 Section Recognition | 5 | 0 | 0 | 0 | 0 |
| US-H3 Contact Parsing | 5 | 1 | 0 | 0 | 0 |
| US-H4 Keyword Matching | 3 | 2 | 0 | 0 | 0 |
| US-H5 Date Parsing | 4 | 1 | 0 | 0 | 0 |
| US-H6 Validation Report | 5 | 1 | 0 | 2 | 0 |
| US-H7 Score Visibility | 4 | 1 | 0 | 0 | 0 |
| US-H8 Hard/Soft Distinction | 4 | 1 | 2 | 0 | 0 |

**Key evidence references:**
- US-H1: ATS DOCX tables check → `scripts/utils/cv_orchestrator.py:4754`
- US-H1: Contact block in body → `scripts/utils/cv_orchestrator.py:3711`
- US-H1: JSON-LD builder → `scripts/utils/cv_orchestrator.py:1475`
- US-H2: Heading 1 style enforcement → `scripts/utils/cv_orchestrator.py:3735,3754,3759,3764`
- US-H2: STANDARD frozenset → `scripts/utils/cv_orchestrator.py:4785`
- US-H3: Phone normalization → `scripts/utils/cv_orchestrator.py:4086`
- US-H4: Keyword presence check → `scripts/utils/cv_orchestrator.py:4845`
- US-H4: ATS score computation → `scripts/utils/scoring.py:345`
- US-H5: Date range format → `scripts/utils/cv_orchestrator.py:3774`
- US-H5: Overlap detection → `scripts/utils/cv_orchestrator.py:4612`
- US-H6: Validation 16-check function → `scripts/utils/cv_orchestrator.py:4685`
- US-H6: Download blocking logic → `web/download-tab.js:104,147,160`
- US-H7: Score weighting (70%/30%) → `scripts/utils/scoring.py:534`
- US-H7: Badge update → `web/ats-refinement.js:150`
- US-H7: Score persistence → `scripts/routes/generation_routes.py:1700`
- US-H7: Bonus icon gap → `web/ats-modals.js:50`
- US-H8: Skill classification heuristic → `scripts/utils/cv_orchestrator.py:4098`
- US-H8: JSON-LD `additionalType` → `scripts/utils/cv_orchestrator.py:1528`
- US-H8: ATS DOCX Technical/Competencies split → `scripts/utils/cv_orchestrator.py:3743`
- US-H8: No `skill_type` UI override → `web/skills-review.js:667`

**Open gaps (priority order):**

| Gap | Priority | Story | Description |
|-----|----------|-------|-------------|
| GAP-H1 | HIGH | US-H8 | Skill classification is rule-based heuristic, not LLM-driven during job analysis |
| GAP-H3 | HIGH | US-H8 | No per-skill hard/soft override toggle in skills-review UI |
| GAP-H2 | HIGH | US-H8 | `skill_type` classification not written back to `Master_CV_Data.json` |
| GAP-H5 | MED | US-H5 | Month required in dates not enforced; year-only dates pass through silently |
| GAP-H6 | MED | US-H4 | `knowsAbout` check only validates count ≥ 3, not per-approved-skill cross-check |
| GAP-H7 | LOW | US-H7 | Bonus ★ icon absent per keyword row; only in group header summary |
| GAP-H8 | LOW | US-H1 | ATS DOCX `Normal` style `font.name` not explicitly set to Calibri |
| GAP-H9 | LOW | US-H6 | Keyword density "not stuffed" check (US-H6 #9) absent from 16-check suite |
| GAP-H10 | LOW | US-H6 | PDF font embedding not verified programmatically (US-H6 #15) |

**Evidence standard:** Every conclusion above is independently verifiable from the cited source file and line number.
