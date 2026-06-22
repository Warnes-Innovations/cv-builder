<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# HR / ATS Persona Review — Cycle 5
**Date:** 2026-06-20
**Time:** ~10:00 ET
**Reviewer persona:** HR Coordinator / ATS Analyst
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/ats-refinement.js, web/ats-modals.js, web/download-tab.js, scripts/web_app.py, scripts/utils/cv_orchestrator.py, scripts/utils/conversation_manager.py, scripts/utils/scoring.py, scripts/routes/review_routes.py, scripts/routes/generation_routes.py

---

## Changes Since Cycle 4 (2026-06-18)

Two relevant commits landed between cycles:

- **`ae68789`** — Removed `'career history'` and `'selected publications'` from the ATS validator `STANDARD` frozenset (`cv_orchestrator.py:4785-4792`). Both are explicitly-rejected labels per US-H2; Cycle 4 noted their presence was incorrect.
- **`38c98ec`** — Added `CVOrchestrator._detect_date_overlaps()`, called in `generate_cv()` (line 2078), with results stored in `metadata.json` and `generated_files` session state. `download-tab.js:330-339` now renders an amber warning panel showing each overlap before the file grid. **GAP-H4 is resolved.**

---

## Application Evaluation

### US-H1: ATS File Ingestion

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Single-column DOCX — no tables | ✅ | `cv_orchestrator.py:4754-4760` — `doc.tables` count checked; presence is a validation FAIL |
| No text boxes / shapes | ✅ | `cv_orchestrator.py:4765-4773` — VML textbox + MC Fallback elements checked; presence is WARN |
| Contact info in body, not header/footer | ✅ | `cv_orchestrator.py:3711-3729` — contact block written to document body as plain paragraph |
| ATS-safe fonts (Arial/Calibri/Times New Roman) | ⚠️ | `cv_orchestrator.py:3836-3867` — `_setup_ats_styles` sets font sizes on Heading 1, Heading 2, and List Bullet but does NOT call `styles['Normal'].font.name` for the ATS DOCX. The human DOCX explicitly sets `font.name = 'Calibri'` at line 4369. The ATS DOCX relies on python-docx default (Calibri in most environments) but this is unguaranteed |
| All URLs spelled out as plain text | ✅ | LinkedIn URL added via `contact_parts.append(contact['linkedin'])` (line 3726) — no hyperlink object created; plain text only |
| 100% text selectable / extractable | ✅ | `cv_orchestrator.py:4746-4752` — validation check 1: extracts text and fails if < 100 chars |
| JSON-LD `<script type="application/ld+json">` in HTML | ✅ | `cv_orchestrator.py:1475-1581` — `_build_json_ld()` constructs full Schema.org/Person block; embedded in `cv_data['json_ld_str']` |
| HTML JSON-LD validated during report | ✅ | `cv_orchestrator.py:4884-4947` — checks 9-12 parse and verify JSON-LD structure |

**Failure modes addressed:** Tables ✅, text boxes ✅ (warn), headers/footers ✅, multi-column ✅, graphics N/A (structured HTML output), custom fonts ⚠️ (partial).

---

### US-H2: ATS Section Recognition

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Generated DOCX uses `Heading 1` style for all section headings | ✅ | `cv_orchestrator.py:3735,3754,3759,3764,3797-3799,4229` — all section calls use `style='Heading 1'` |
| Heading text matches accepted labels | ✅ | Labels used: `"Professional Summary"`, `"Technical Skills"`, `"Core Competencies"`, `"Work Experience"`, `"Education"`, `"Certifications"`, `"Publications"` — all in the accepted set per US-H2 |
| No creative section names in ATS DOCX | ✅ | Human DOCX may use a user-overridden skills heading via `_resolve_human_skills_title`; ATS DOCX always uses hardcoded ATS-safe strings |
| Heading text validated post-generation | ✅ | `cv_orchestrator.py:4785-4815` — check 5 compares headings against `STANDARD` frozenset; since `ae68789`, `'career history'` and `'selected publications'` are correctly absent from STANDARD |
| `"Publications"` heading exactly that label | ✅ | `cv_orchestrator.py:4864-4877` — check 16 enforces exact string `"Publications"` and fails otherwise |

**Design note:** The user story also lists "Contact Information" as an accepted section label. The ATS DOCX does not emit a Heading 1 for contact — the block appears before any section heading, which is standard ATS practice. Check 5's `STANDARD` frozenset includes `'contact'` as an accepted value but the DOCX never generates a contact heading, so no false positive occurs.

---

### US-H3: Contact Information Parsing

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Contact block is first content in document body | ✅ | `cv_orchestrator.py:3699-3732` — name paragraph then contact paragraph added before any Heading 1 |
| Name, city/state, phone, email on first 1-2 lines | ✅ | `cv_orchestrator.py:3712-3728` — contact parts joined with ` | ` into a single centered paragraph |
| Phone normalized to `NNN-NNN-NNNN` (no parentheses) | ✅ | `cv_orchestrator.py:4086-4095` — `_normalize_phone()` strips non-digits and reformats to `NNN-NNN-NNNN` |
| LinkedIn URL spelled out as plain text | ✅ | `cv_orchestrator.py:3724-3726` — `contact.get('linkedin')` appended as string, no hyperlink relationship created |
| No full street address (city + state only) | ✅ | `cv_orchestrator.py:3714-3720` — extracts `city, state` only from address dict |
| Credentials (Ph.D.) after name with comma separator | ⚠️ | No code enforces or validates credential format. The `name` field from `personal_info` is passed through unchanged (`cv_orchestrator.py:3700,3705`). A name stored as `"Gregory Warnes PhD"` without comma separator would appear verbatim. No warning is emitted |

---

### US-H4: Keyword Matching and Scoring

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Post-generation keyword check compares JD keywords to ATS DOCX text | ✅ | `cv_orchestrator.py:4845-4862` — check 8 (`ats_keyword_presence`) scans DOCX body text against `ats_keywords[:15]` (case-insensitive substring match) |
| System reports: keyword present, section where it appears, match type | ✅ | `scoring.py:477-527` — `compute_ats_score()` produces `keyword_status` list with `keyword`, `type`, `status`, `matched_in_sections`, `match_type` |
| System warns when keyword absent from ATS DOCX | ✅ | `cv_orchestrator.py:4856-4862` — WARN if ≤ 1/3 missing, FAIL if > 1/3 missing |
| Keyword variants normalized (case, hyphen/slash) | ⚠️ | `scoring.py:450-475` — uses substring containment (`kw_lower in term or term in kw_lower`) and token matching. No hyphen/slash normalization — `"Scikit-learn"` vs `"Scikit-Learn"` would pass substring match but `"scikit-learn"` vs `"scikit_learn"` would not. Synonym map in `cv_orchestrator.py:142-152` handles common aliases but hyphen-to-underscore variants are not normalized |
| `knowsAbout` verified to contain all approved skill names | ⚠️ | `cv_orchestrator.py:4921-4930` — check 11 (`html_jsonld_knows_about`) passes if `len(knowsAbout) >= 3`. Does NOT cross-check that each individually approved skill appears in `knowsAbout`. A session with 10 approved skills where only 3 generic defaults appear in `knowsAbout` would pass check 11 |

---

### US-H5: Date and Employment History Parsing

| Criterion | Status | Evidence |
|-----------|--------|---------|
| All date ranges use em-dash `–` separator | ✅ | `cv_orchestrator.py:3774` — `date_range = f"{exp.get('start_date', '')} – {exp.get('end_date', 'Present')}"` uses Unicode en-dash `–` (U+2013) |
| All dates include month and year | ⚠️ | `cv_orchestrator.py:3774` passes `start_date` / `end_date` verbatim from master data. Year-only dates (e.g. `"2020"`) in `Master_CV_Data.json` pass through unchanged. Validation check 7 verifies consistency of date formats present, not that month is included |
| Job entry on one line: `Title | Company | Location | Date Range` | ✅ | `cv_orchestrator.py:3767-3779` — assembles pipe-separated line with all four fields as a single bold paragraph |
| No overlapping date ranges | ✅ | `cv_orchestrator.py:4612-4680` — `_detect_date_overlaps()` runs during `generate_cv()` (line 2078); same-company overlaps excluded (promotions); warnings stored in `metadata.json` and `generated_files` session state |
| Overlap warnings displayed in UI | ✅ | `download-tab.js:330-339` — amber warning panel rendered before the file grid; shows `entry_a`, `entry_b`, and `overlap_description` for each overlap. **Resolved since Cycle 4 (commit `38c98ec`)** |
| "Present" used for current role (not future date) | ✅ | `cv_orchestrator.py:3774` — default is `'Present'` if `end_date` absent; `_parse_end_date()` at line 3151-3164 maps `'current'`, `'present'`, `'now'`, `'ongoing'` → today |

---

### US-H6: ATS Output Validation Report

| Criterion | Status | Evidence |
|-----------|--------|---------|
| System runs programmatic ATS validation checks after generation | ✅ | `review_routes.py:2284-2340` — `GET /api/ats-validate` runs `validate_ats_report()` with 16 checks |
| Results displayed in UI with pass/warn/fail | ✅ | `download-tab.js:76-142` — `_renderValidationSummary()` renders an expandable details table with pass/warn/fail icons per check |
| Any FAIL blocks download with clear explanation | ✅ | `download-tab.js:132-139,160-180` — critical fails block DOCX/HTML/PDF downloads; `keywordFail` blocks all formats |
| Any WARN allows download but shows issue | ✅ | `download-tab.js:144-157` — `_NON_BLOCKING_CHECKS` set defines advisory-only checks; these warn but do not block downloads |
| Validation results included in `metadata.json` | ✅ | `review_routes.py:2321-2329` — `conversation.state['validation_results']` patched into `metadata.json` |

**Check gaps vs US-H6 checklist:**

| US-H6 Check | Status | Note |
|-------------|--------|------|
| 9 — Keyword density not stuffed | 🔲 | Not in the 16-check suite; no density ceiling implemented |
| 13 — HTML renders in browser | ⚠️ | Check named `html_renders_ok` (`cv_orchestrator.py:4954,4961`) verifies PDF was generated successfully, not actual browser rendering of the HTML |
| 15 — Fonts embedded in PDF | 🔲 | Not in the 16-check suite; Chrome/WeasyPrint embed fonts in practice but this is not verified programmatically |
| 16 — No clipped content at margins | 🔲 | Not in the 16-check suite |

---

### US-H7: ATS Match Score Visibility

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Overall match score (0–100%) computed and displayed after job analysis | ✅ | `scoring.py:534` — `overall = round(0.7 * hard_score + 0.3 * soft_score, 1)`; `ats-refinement.js:150-181` — badge displayed in position bar |
| Score is weighted: hard skills count 70%, soft 30% (≈ 2.33x) | ✅ | `scoring.py:534` — `0.7 * hard_score + 0.3 * soft_score`; meets the story's "hard skills count twice as much" intent |
| Score updates live as user approves/rejects customization items | ✅ | `ats-refinement.js:211-213` — `scheduleAtsRefresh` with 600ms debounce; called from `achievements-review.js:406`, `experience-review.js:342`, `skills-review.js:1081`, `rewrite-review.js:435`, `spell-check.js:169` |
| Score persisted to `metadata.json` at generation time | ✅ | `generation_routes.py:1700,1704` — `gen["ats_score"] = score` and `_try_patch_metadata(conv, {"ats_score": score})` |
| Score UI labels three per-skill states: Matched ✅, Missing ❌, Bonus ★ | ⚠️ | `ats-modals.js:169-219` and `ats-refinement.js:42-114` — keyword groups rendered with Matched/Missing badge per row (`_keywordStatusBadge`), Bonus group counted in summary line. However, the Bonus ★ star icon is NOT rendered per keyword row — the row `_keywordStatusBadge` function returns only "Exact match" or "Partial match" or "Missing" pills; no ★ icon distinguishes Bonus rows from Hard/Soft rows within the table |

---

### US-H8: Hard / Soft Skill Distinction in ATS Output

| Criterion | Status | Evidence |
|-----------|--------|---------|
| LLM classifies every extracted skill as hard or soft during job analysis | ⚠️ | Classification uses `_classify_skill_type()` at `cv_orchestrator.py:4098-4114` — rule-based heuristic, not LLM. Checks stored `skill_type` field first, then category-name matching against `_SOFT_SKILL_CATEGORIES` frozenset, then name matching against `_SOFT_SKILL_NAMES` frozenset. Unknown skills default to `'hard'` silently |
| Candidate's master CV skills classified and persisted to `Master_CV_Data.json` | ❌ | `skill_type` is read from `skill.get('skill_type')` (line 4104) as explicit override, but no code writes `skill_type` back to `Master_CV_Data.json`. Classification is computed at render time only; each session re-derives it |
| ATS DOCX separates skills into "Technical Skills" (hard) and "Core Competencies" (soft) | ✅ | `cv_orchestrator.py:3743-3761` — `hard_skills` and `soft_skills` lists built via `_classify_skill_type`, emitted under separate `Heading 1` paragraphs with ATS-standard labels |
| HTML JSON-LD `knowsAbout` entries include `"additionalType": "HardSkill"` or `"SoftSkill"` | ✅ | `cv_orchestrator.py:1528-1537` — each `DefinedTerm` entry includes `'additionalType': 'HardSkill' if ... == 'hard' else 'SoftSkill'` |
| User can override any skill classification in the UI | ❌ | No UI control found for per-skill hard/soft type toggle. `skills-review.js` exposes group and category overrides (`saveSkillGroupOverride`, `saveSkillCategoryOverride`) but no `skill_type` override. The `skill_type` stored field is read by `_classify_skill_type` but no UI panel writes it |
| Missing hard skills highlighted more prominently than missing soft | ✅ | `ats-modals.js:208-212` — distinct amber block for "Missing hard requirements" rendered separately from other keyword gaps |

---

## Generated Materials Evaluation

### ATS DOCX Structure

**Section ordering in `_generate_ats_docx` (`cv_orchestrator.py:3682-3834`):**
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
| Single-column | ✅ | All content added as sequential paragraphs; no `doc.add_table()` calls |
| No tables | ✅ | Confirmed by validation check 2 |
| No shapes | ✅ | Confirmed by validation check 3 |
| Contact in body | ✅ | Lines 3711-3729 |
| Standard heading labels | ✅ | All match accepted labels per US-H2 |
| Heading 1 style for all sections | ✅ | All `doc.add_paragraph(..., style='Heading 1')` |
| Phone format `NNN-NNN-NNNN` | ✅ | `_normalize_phone()` at line 4086 |
| Full URL as plain text | ✅ | No hyperlink objects created in ATS path |
| Font: Arial/Calibri/Times New Roman | ⚠️ | `_setup_ats_styles` sets font sizes on Heading 1, Heading 2, List Bullet but does not call `doc.styles['Normal'].font.name = 'Calibri'`. Human DOCX sets this explicitly at line 4369 |
| Em-dash `–` in date ranges | ✅ | Line 3774 uses Unicode en-dash U+2013 `–` |
| Month + year in dates | ⚠️ | Passes master data verbatim; year-only dates not caught |

### HTML / JSON-LD Structure

**JSON-LD fields generated (`_build_json_ld`, `cv_orchestrator.py:1475-1581`):**

| Field | Status | Note |
|-------|--------|------|
| `@context: https://schema.org` | ✅ | Line 1554 |
| `@type: Person` | ✅ | Line 1555 |
| `name` | ✅ | From `personal_info.name` |
| `jobTitle` | ✅ | From `job_analysis.title` |
| `description` | ✅ | Professional summary |
| `email` | ✅ | Conditional on presence, line 1560 |
| `telephone` | ✅ | Conditional on presence, line 1562 |
| `sameAs` | ✅ | LinkedIn + website URLs via `safe_url()` |
| `address.addressLocality` | ✅ | City/state display string |
| `alumniOf` | ✅ | List of `EducationalOrganization` |
| `hasOccupation` | ✅ | List of `Role` entries |
| `knowsAbout` | ✅ | List of `DefinedTerm` with `name` + `additionalType` |
| `award` | ✅ | Formatted award strings |

**Structural note:** `_validate_json_ld()` (line 1585-1596) checks only `['@context', '@type', 'name']`. The `email` and `telephone` fields required by US-H3 and US-H6 check 12 are not in internal JSON-LD validation, though they are covered by `validate_ats_report` check 12.

### PDF Structure

- Chrome headless (primary) or WeasyPrint (fallback) — PDF generation success checked at `cv_orchestrator.py:4954-4961` (check 13)
- US Letter size verified at `cv_orchestrator.py:4985-5005` (check 14)
- Selectable text checked at `cv_orchestrator.py:4964-4973` (check 15)
- Font embedding: Chrome headless and WeasyPrint embed fonts in practice but this is not validated programmatically — no check 15-equivalent for embedding

---

## Gap Status (Updated)

### Resolved Since Cycle 4

| Gap | Resolution |
|-----|-----------|
| GAP-H4 (Date Overlap Warnings Not Surfaced in UI) | ✅ Resolved — `download-tab.js:330-339` renders overlap warnings in amber panel; `cv_orchestrator.py:2078-2088` detects overlaps at generation time (`commit 38c98ec`) |

### Remaining Open Gaps

### GAP-H1 (HIGH): Skill Classification Not LLM-Driven
**US-H8** requires the LLM to classify every extracted skill as hard or soft during job analysis. Current implementation uses a rule-based heuristic (`_classify_skill_type` at `cv_orchestrator.py:4098-4114`) with a hardcoded soft-skill frozenset. Novel skill names not in the hardcoded sets default to `'hard'` silently. The LLM is not invoked for classification.

### GAP-H2 (HIGH): Skill Type Not Persisted to Master CV Data
**US-H8** requires classification to be persisted in `Master_CV_Data.json`. No write-back occurs. Each session re-classifies skills at render time from the rule-based heuristic. If a user intends to permanently mark "Coaching" as a soft skill, that designation is lost between sessions.

### GAP-H3 (HIGH): No Per-Skill Hard/Soft Override in UI
**US-H8** requires the user to override any skill classification. `skills-review.js` exposes group and category overrides but no `skill_type` toggle. The `skill_type` stored field is read by `_classify_skill_type` as an explicit override (line 4104-4105) but no UI surface writes it.

### GAP-H5 (MED): Month Required in Dates Not Enforced
**US-H5** requires `January 2020–Present` format. Year-only dates in `Master_CV_Data.json` pass through to the ATS DOCX unchanged. Validation check 7 verifies consistency of format across the document, not that each date includes a month.

### GAP-H6 (MED): `knowsAbout` Cross-Check Is Coarse
**US-H4** requires the system to verify that `knowsAbout` contains all approved skill names from rewrite decisions. Check 11 (`cv_orchestrator.py:4921-4930`) only validates `len(knowsAbout) >= 3`. No per-skill cross-check is performed.

### GAP-H7 (LOW): Bonus Skill State Missing Star Icon per Row in Score UI
**US-H7** requires three per-skill state labels: Matched ✅, Missing ❌, Bonus ★. The `_keywordStatusBadge()` function in `ats-modals.js:50-58` returns only "Missing", "Partial match", or "Exact match" pills — no ★ icon distinguishes Bonus keyword rows in the table. The Bonus count is visible only in the group header summary line.

### GAP-H8 (LOW): ATS DOCX Normal Font Name Not Explicitly Set
**US-H1** requires Arial, Calibri, or Times New Roman. `_setup_ats_styles` (`cv_orchestrator.py:3836-3867`) sets font sizes on Heading 1 and List Bullet but does not call `doc.styles['Normal'].font.name = 'Calibri'`. The human DOCX sets this at line 4369. In practice python-docx defaults to Calibri, but it is unguaranteed.

### GAP-H9 (LOW): Keyword Density ("Not Stuffed") Check Absent
**US-H6** advisory check 9 requires warning when keyword density is unnaturally high. No density ceiling check is implemented in the 16-check suite.

### GAP-H10 (LOW): PDF Font Embedding Not Validated
**US-H6** item 15 ("Fonts embedded") is not in the 16-check ATS report. Chrome headless and WeasyPrint produce embedded fonts in practice, but this is unverified programmatically.

---

## Evidence Summary

| Story | Overall Status | Open Gaps |
|-------|---------------|-----------|
| US-H1: ATS File Ingestion | ✅ Mostly pass | ATS DOCX Normal font name not explicit (GAP-H8) |
| US-H2: ATS Section Recognition | ✅ Pass | No functional gap; contact heading omitted by design |
| US-H3: Contact Information Parsing | ✅ Mostly pass | Credential format (Ph.D. comma) not enforced by code |
| US-H4: Keyword Matching | ⚠️ Partial | `knowsAbout` cross-check coarse (GAP-H6); hyphen variants not normalized |
| US-H5: Date Parsing | ⚠️ Partial | Month not enforced (GAP-H5); overlap warnings now shown ✅ |
| US-H6: ATS Validation Report | ⚠️ Partial | Keyword density check absent (GAP-H9); font-embed check absent (GAP-H10) |
| US-H7: ATS Match Score Visibility | ✅ Mostly pass | Bonus star icon missing per row (GAP-H7) |
| US-H8: Hard/Soft Skill Distinction | ❌ Partial | No LLM classification (GAP-H1); no persistence (GAP-H2); no UI override (GAP-H3) |

**Priority order for next cycle:** GAP-H1 → GAP-H3 → GAP-H2 → GAP-H5 → GAP-H6 → GAP-H7 → GAP-H8 → GAP-H9 → GAP-H10
