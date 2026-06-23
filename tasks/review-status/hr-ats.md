<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# HR / ATS Review Status

**Last Updated:** 2026-06-22 20:30 ET

**Executive Summary:** The application is broadly ATS-aware. It generates an `_ATS.docx` with Heading 1 section markers, a pipe-separated single-line contact block, phone normalization, URL plain-text output, and a 16-check post-generation validation report that blocks downloads on critical failures. A live ATS match-score badge (0–100%) updates as the user approves/rejects skills and rewrites. JSON-LD structured data with `knowsAbout` and `additionalType: HardSkill / SoftSkill` is embedded in the HTML output. The three highest-priority gaps remaining are: (H1) skill hard/soft classification is rule-based rather than LLM-driven; (H2) classification is not persisted to `Master_CV_Data.json`; and (H3) there is no per-skill UI toggle for the user to override the hard/soft assignment. Eight additional lower-priority gaps are documented below.

---

## Changes Since Cycle 5 (2026-06-20)

One commit landed between cycles (`3057ea8`) touching HR/ATS-relevant files:

- **`index.html:186`** (GAP-169) — Spell-check CTA button label changed from `"Done — Generate CV →"` to `"Generate Preview →"`. This improves terminology accuracy but has no effect on any US-H acceptance criterion.

No ATS-story gaps were resolved between Cycle 5 and Cycle 6.

---

## Application Evaluation

### US-H1: ATS File Ingestion

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Single-column DOCX — no tables | ✅ Pass | `cv_orchestrator.py:4754-4760` — `doc.tables` count checked; presence → validation FAIL |
| No text boxes / shapes | ✅ Pass | `cv_orchestrator.py:4765-4773` — VML textbox + MC Fallback elements checked; presence → WARN |
| Contact info in body, not header/footer | ✅ Pass | `cv_orchestrator.py:3711-3729` — contact block written to document body as plain paragraph |
| ATS-safe fonts (Arial/Calibri/Times New Roman) | ⚠️ Partial | `cv_orchestrator.py:3836-3867` — `_setup_ats_styles` sets font sizes on Heading 1, Heading 2, List Bullet but does NOT set `doc.styles['Normal'].font.name`. Human DOCX explicitly sets `font.name = 'Calibri'` at line 4369. ATS DOCX relies on python-docx default — in practice Calibri, but unguaranteed. (GAP-H8) |
| All URLs as plain text (no hyperlink objects) | ✅ Pass | `cv_orchestrator.py:3724-3726` — LinkedIn appended as string; no `part.relate_to()` call in ATS path |
| 100% text selectable (no locked fields) | ✅ Pass | `cv_orchestrator.py:4746-4752` — check 1: fails if < 100 chars extracted |
| `<script type="application/ld+json">` in HTML | ✅ Pass | `cv_orchestrator.py:1475-1581` — `_build_json_ld()` builds Schema.org/Person block embedded in `cv_data['json_ld_str']` |
| HTML JSON-LD validated post-generation | ✅ Pass | `cv_orchestrator.py:4884-4947` — checks 9-12 parse and verify JSON-LD |

**ATS failure modes addressed:** Tables ✅, text boxes ✅ (WARN), headers/footers ✅, multi-column ✅, graphics N/A, custom fonts ⚠️ (partial — GAP-H8).

---

### US-H2: ATS Section Recognition

| Criterion | Status | Evidence |
|-----------|--------|---------|
| All section headings use `Heading 1` Word style | ✅ Pass | `cv_orchestrator.py:3735,3754,3759,3764,3797-3799,4229` — every `doc.add_paragraph` for section headings passes `style='Heading 1'` |
| Heading text matches accepted labels | ✅ Pass | Labels used: `"Professional Summary"`, `"Technical Skills"`, `"Core Competencies"`, `"Work Experience"`, `"Education"`, `"Certifications"`, `"Publications"` — all in US-H2 accepted set |
| No creative section names in ATS DOCX | ✅ Pass | Human DOCX supports user-overridden heading via `_resolve_human_skills_title`; ATS DOCX uses hardcoded ATS-safe strings only |
| Heading text validated post-generation | ✅ Pass | `cv_orchestrator.py:4785-4815` — check 5 compares headings against `STANDARD` frozenset (correct since commit `ae68789` which removed `'career history'` and `'selected publications'`) |
| `"Publications"` heading exact label enforced | ✅ Pass | `cv_orchestrator.py:4864-4877` — check 16 enforces exact string `"Publications"` and FAILs otherwise |

**Note on contact heading:** The ATS DOCX places the contact block as a plain paragraph before any section heading. No `"Contact Information"` Heading 1 is generated; this is standard ATS practice and not a defect.

---

### US-H3: Contact Information Parsing

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Contact block is first content in document body | ✅ Pass | `cv_orchestrator.py:3699-3732` — name paragraph then contact paragraph precede any Heading 1 |
| Name, city/state, phone, email on first 1-2 lines | ✅ Pass | `cv_orchestrator.py:3712-3728` — `contact_parts` joined with ` | ` into a single centered paragraph |
| Phone formatted as `NNN-NNN-NNNN` (no parentheses) | ✅ Pass | `cv_orchestrator.py:4086-4095` — `_normalize_phone()` strips non-digits and reformats |
| LinkedIn URL spelled out as plain text | ✅ Pass | `cv_orchestrator.py:3724-3726` — appended as string; no hyperlink object |
| No full street address (city + state only) | ✅ Pass | `cv_orchestrator.py:3714-3720` — extracts `city, state` only |
| Credentials (Ph.D.) after name with comma separator | ⚠️ Partial | No validation. The `name` field from `personal_info` is passed through verbatim (`cv_orchestrator.py:3700,3705`). A name stored as `"Gregory Warnes PhD"` (no comma) appears unchanged. No warning is emitted. |

---

### US-H4: Keyword Matching and Scoring

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Post-generation keyword check vs ATS DOCX text | ✅ Pass | `cv_orchestrator.py:4845-4862` — check 8 (`ats_keyword_presence`) scans DOCX body text against `ats_keywords[:15]`, case-insensitive substring |
| System reports: keyword present, section, match type | ✅ Pass | `scoring.py:477-527` — `keyword_status` list includes `keyword`, `type`, `status`, `matched_in_sections`, `match_type` per entry |
| System warns when keyword absent from ATS DOCX | ✅ Pass | `cv_orchestrator.py:4856-4862` — WARN if ≤ 1/3 missing, FAIL if > 1/3 missing |
| Keyword variants normalized (case, hyphen/slash) | ⚠️ Partial | `scoring.py:450-475` — substring containment handles multi-word terms. Synonym map (`cv_orchestrator.py:142-152`) covers common aliases. Hyphen-to-underscore variants (e.g. `"scikit-learn"` vs `"scikit_learn"`) are not normalized. |
| `knowsAbout` verified to contain all approved skills | ⚠️ Partial | `cv_orchestrator.py:4921-4930` — check 11 passes if `len(knowsAbout) >= 3`. Does not cross-check each individually approved skill. (GAP-H6) |

---

### US-H5: Date and Employment History Parsing

| Criterion | Status | Evidence |
|-----------|--------|---------|
| All date ranges use em-dash `–` separator | ✅ Pass | `cv_orchestrator.py:3774` — `f"{exp.get('start_date', '')} – {exp.get('end_date', 'Present')}"` uses Unicode U+2013 en-dash |
| All dates include month and year | ⚠️ Partial | `cv_orchestrator.py:3774` passes `start_date`/`end_date` verbatim from master data. Year-only dates (e.g. `"2020"`) pass through unchanged. Check 7 verifies format consistency, not month presence. (GAP-H5) |
| Job entry on one line: `Title | Company | Location | Date Range` | ✅ Pass | `cv_orchestrator.py:3767-3779` — pipe-separated single bold paragraph with all four fields |
| No overlapping date ranges | ✅ Pass | `cv_orchestrator.py:4612-4680` — `_detect_date_overlaps()` runs at generation time; same-company overlaps excluded (promotions) |
| Overlap warnings displayed in UI | ✅ Pass | `download-tab.js:330-339` — amber warning panel rendered before file grid; resolved in Cycle 4 (commit `38c98ec`) |
| `"Present"` used for current role | ✅ Pass | `cv_orchestrator.py:3774` — default `'Present'`; `_parse_end_date()` maps `'current'`/`'now'`/`'ongoing'` → today |

---

### US-H6: ATS Output Validation Report

| Criterion | Status | Evidence |
|-----------|--------|---------|
| System runs programmatic ATS validation checks after generation | ✅ Pass | `review_routes.py:2284-2340` — `GET /api/ats-validate` runs `validate_ats_report()` (16 checks) |
| Results displayed in UI with pass/warn/fail per check | ✅ Pass | `download-tab.js:76-142` — `_renderValidationSummary()` renders expandable details table with icons per check |
| Any FAIL blocks download with clear explanation | ✅ Pass | `download-tab.js:132-139,160-180` — critical fails grey out DOCX/HTML/PDF buttons; `keywordFail` blocks all formats |
| Any WARN allows download but shows specific issue | ✅ Pass | `download-tab.js:144-157` — `_NON_BLOCKING_CHECKS` set defines advisory-only checks |
| Validation results included in `metadata.json` | ✅ Pass | `review_routes.py:2321-2329` — results patched into `metadata.json` |

**Check gaps vs US-H6 checklist (16-item):**

| US-H6 Check | Status | Note |
|-------------|--------|------|
| 9 — Keyword density not stuffed | 🔲 Not Impl | No density ceiling implemented. (GAP-H9) |
| 13 — HTML renders correctly in browser | ⚠️ Partial | Check `html_renders_ok` (`cv_orchestrator.py:4954`) verifies PDF generation success, not actual browser HTML rendering. |
| 15 — Fonts embedded in PDF | 🔲 Not Impl | Not in 16-check suite; Chrome/WeasyPrint embed fonts in practice but unverified. (GAP-H10) |
| 16 — No clipped content at margins | 🔲 Not Impl | Not in 16-check suite. |

---

### US-H7: ATS Match Score Visibility

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Overall score (0–100%) computed and displayed after job analysis | ✅ Pass | `scoring.py:534` — `overall = round(0.7 * hard_score + 0.3 * soft_score, 1)`; badge displayed via `ats-refinement.js:150-181` |
| Score weighted: hard skills count ~2.3x soft skills | ✅ Pass | `scoring.py:534` — 70% hard / 30% soft weighting meets "hard skills count twice as much" intent |
| Score updates live as user approves/rejects items | ✅ Pass | `ats-refinement.js:211-213` — `scheduleAtsRefresh` with 600ms debounce; triggered from skills, experience, rewrite, and spell-check review panels |
| Score persisted to `metadata.json` at generation time | ✅ Pass | `generation_routes.py:1700,1704` — `gen["ats_score"] = score` and `_try_patch_metadata(conv, {"ats_score": score})` |
| Score UI labels three states: Matched ✅, Missing ❌, Bonus ★ | ⚠️ Partial | `ats-modals.js:50-58` — `_keywordStatusBadge()` returns "Exact match", "Partial match", or "Missing" pills. No ★ icon per Bonus keyword row. Bonus count appears only in the group header summary line. (GAP-H7) |

---

### US-H8: Hard / Soft Skill Distinction in ATS Output

| Criterion | Status | Evidence |
|-----------|--------|---------|
| LLM classifies every extracted skill as hard or soft during job analysis | ⚠️ Partial | `cv_orchestrator.py:4098-4114` — `_classify_skill_type()` is rule-based: checks stored `skill_type` field, then category-name matching against `_SOFT_SKILL_CATEGORIES` frozenset, then name matching against `_SOFT_SKILL_NAMES` frozenset. Novel names default to `'hard'` silently. LLM not invoked for classification. (GAP-H1) |
| Master CV skills classified and persisted to `Master_CV_Data.json` | ❌ Fail | `skill_type` is read from `skill.get('skill_type')` (line 4104) as explicit override but no code path writes it back. Classification is computed at render time each session. (GAP-H2) |
| ATS DOCX separates skills: "Technical Skills" (hard) / "Core Competencies" (soft) | ✅ Pass | `cv_orchestrator.py:3743-3761` — separate Heading 1 paragraphs with ATS-standard labels |
| HTML JSON-LD `knowsAbout` includes `"additionalType": "HardSkill"/"SoftSkill"` | ✅ Pass | `cv_orchestrator.py:1528-1537` — each `DefinedTerm` entry includes `additionalType` based on `_classify_skill_type` |
| User can override any skill classification in the UI | ❌ Fail | No `skill_type` toggle in `skills-review.js`. Group and category overrides exist but no hard/soft type override. The `skill_type` stored field that `_classify_skill_type` reads (line 4104) is never written by any UI action. (GAP-H3) |
| Missing hard skills highlighted more prominently than missing soft | ✅ Pass | `ats-modals.js:208-212` — separate amber block for "Missing hard requirements" rendered before other keyword gaps |

---

## Generated Materials Evaluation

### ATS DOCX Structure

Section order in `_generate_ats_docx` (`cv_orchestrator.py:3682-3834`):
1. Candidate name — bold run, centered, 16pt (not a Heading style)
2. Contact line — plain paragraph, centered, pipe-separated
3. Blank paragraph
4. `Professional Summary` — Heading 1
5. Summary text
6. `Technical Skills` — Heading 1 (if hard skills present)
7. `Core Competencies` — Heading 1 (if soft skills present)
8. `Work Experience` — Heading 1
9. Per-experience bold entry line + `List Bullet` achievements
10. `Education` — Heading 1
11. Additional sections via `_add_ats_additional_sections` → `Certifications` / `Publications` — Heading 1

**ATS DOCX compliance matrix:**

| Requirement | Status | Note |
|-------------|--------|------|
| Single-column | ✅ | Sequential paragraphs only; no `doc.add_table()` |
| No tables | ✅ | Validated by check 2 |
| No shapes | ✅ | Validated by check 3 |
| Contact in body | ✅ | Lines 3711-3729 |
| Standard heading labels | ✅ | All match US-H2 accepted set |
| Heading 1 style for all sections | ✅ | All `doc.add_paragraph(..., style='Heading 1')` |
| Phone format `NNN-NNN-NNNN` | ✅ | `_normalize_phone()` at line 4086 |
| URLs as plain text | ✅ | No hyperlink objects in ATS path |
| Font: Arial/Calibri/Times New Roman | ⚠️ | `_setup_ats_styles` sets font sizes on Heading 1/2 and List Bullet but does not set `doc.styles['Normal'].font.name`. Human DOCX sets this explicitly at line 4369. (GAP-H8) |
| Em-dash `–` in date ranges | ✅ | Line 3774 uses U+2013 |
| Month + year in dates | ⚠️ | Verbatim passthrough from master data; year-only dates not caught. (GAP-H5) |

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
| `hasOccupation` | ✅ | List of `Role` entries |
| `knowsAbout` | ✅ | List of `DefinedTerm` with `name` + `additionalType: HardSkill/SoftSkill` |
| `award` | ✅ | Formatted award strings |

**Structural note:** `_validate_json_ld()` (line 1585-1596) checks only `['@context', '@type', 'name']`. The `email` and `telephone` fields required by US-H3 / US-H6 check 12 are covered by `validate_ats_report` check 12 but not by internal JSON-LD validation.

### PDF Structure

- Generation success: check `html_renders_ok` (`cv_orchestrator.py:4954-4962`)
- US Letter size: check `pdf_us_letter` (`cv_orchestrator.py:4985-5005`)
- Selectable text: check `pdf_has_text` (`cv_orchestrator.py:4964-4973`)
- Font embedding: not verified programmatically (GAP-H10)

---

## Additional Story Gaps / Proposed Story Items

**Terminology gap:** The UI uses the label "ATS Score" for the match score badge. The user story labels these states as Matched ✅ / Missing ❌ / Bonus ★. The download tab calls the 16-check suite "ATS Report" — this label is correct and consistent, but the File Review tab (named "⬇️ File Review" in the tab bar and "File Review" in the download-tab.js header) is not called "ATS Report" in the navigation, which may leave users unsure where to find it.

**Proposed story US-H9:** _As an HR coordinator, I want the system to warn me if the ATS DOCX body text contains any keyword that is repeated at an unnaturally high density, so that the application is not flagged as keyword-stuffed by ATS keyword-density filters._ (Covers GAP-H9 / US-H6 check 9.)

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/ats-refinement.js, web/ats-modals.js, web/download-tab.js, web/skills-review.js, scripts/web_app.py, scripts/utils/cv_orchestrator.py, scripts/utils/conversation_manager.py, scripts/utils/scoring.py, scripts/routes/review_routes.py, scripts/routes/generation_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-H1 ATS File Ingestion | 6 | 1 | 0 | 0 | 0 |
| US-H2 Section Recognition | 5 | 0 | 0 | 0 | 0 |
| US-H3 Contact Parsing | 5 | 1 | 0 | 0 | 0 |
| US-H4 Keyword Matching | 3 | 2 | 0 | 0 | 0 |
| US-H5 Date Parsing | 4 | 1 | 0 | 0 | 0 |
| US-H6 Validation Report | 5 | 1 | 0 | 3 | 0 |
| US-H7 Score Visibility | 4 | 1 | 0 | 0 | 0 |
| US-H8 Hard/Soft Distinction | 4 | 1 | 2 | 0 | 0 |

**Key evidence references:**
- US-H1: ATS DOCX tables check → scripts/utils/cv_orchestrator.py:4754
- US-H1: Contact block in body → scripts/utils/cv_orchestrator.py:3711
- US-H1: JSON-LD builder → scripts/utils/cv_orchestrator.py:1475
- US-H2: Heading 1 style enforcement → scripts/utils/cv_orchestrator.py:3735,3754,3759,3764
- US-H2: STANDARD frozenset → scripts/utils/cv_orchestrator.py:4785
- US-H3: Phone normalization → scripts/utils/cv_orchestrator.py:4086
- US-H4: Keyword presence check → scripts/utils/cv_orchestrator.py:4845
- US-H4: ATS score computation → scripts/utils/scoring.py:345
- US-H5: Date range format → scripts/utils/cv_orchestrator.py:3774
- US-H5: Overlap detection → scripts/utils/cv_orchestrator.py:4612
- US-H5: Overlap UI → web/download-tab.js:330
- US-H6: Validation 16-check function → scripts/utils/cv_orchestrator.py:4685
- US-H6: /api/ats-validate route → scripts/routes/review_routes.py:2284
- US-H6: Download blocking logic → web/download-tab.js:104,147,160
- US-H7: Score weighting → scripts/utils/scoring.py:534
- US-H7: Badge update → web/ats-refinement.js:150
- US-H7: Score persistence → scripts/routes/generation_routes.py:1700
- US-H7: Bonus icon gap → web/ats-modals.js:50
- US-H8: Skill classification heuristic → scripts/utils/cv_orchestrator.py:4097
- US-H8: JSON-LD additionalType → scripts/utils/cv_orchestrator.py:1528
- US-H8: ATS DOCX Technical/Competencies split → scripts/utils/cv_orchestrator.py:3743
- US-H8: No skill_type UI override → web/skills-review.js:667

**Open gaps (priority order):**

| Gap | Priority | Story | Description |
|-----|----------|-------|-------------|
| GAP-H1 | HIGH | US-H8 | Skill classification is rule-based, not LLM-driven |
| GAP-H3 | HIGH | US-H8 | No per-skill hard/soft override in skills-review UI |
| GAP-H2 | HIGH | US-H8 | Skill `skill_type` classification not persisted to `Master_CV_Data.json` |
| GAP-H5 | MED | US-H5 | Month required in dates not enforced; year-only dates pass through |
| GAP-H6 | MED | US-H4 | `knowsAbout` check only validates count ≥ 3, not per-approved-skill coverage |
| GAP-H7 | LOW | US-H7 | Bonus ★ icon absent per keyword row in ATS Report; only visible in group header |
| GAP-H8 | LOW | US-H1 | ATS DOCX `Normal` style font name not explicitly set to Calibri |
| GAP-H9 | LOW | US-H6 | Keyword density "not stuffed" check absent from 16-check suite |
| GAP-H10 | LOW | US-H6 | PDF font embedding not verified programmatically |

**Evidence standard:** Every conclusion above is independently verifiable from the cited source file and line number.
