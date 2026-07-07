<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# HR/ATS Review Status

**Last Updated:** 2026-07-06 (cycle 92 source-first refresh)

**Executive Summary:** Source-verified HR/ATS persona review. The application is substantially ATS-compliant with strong implementations of DOCX structure, JSON-LD metadata, keyword scoring, and hard/soft skill classification. Seven gaps remain: (1) no hyperlink-object validation in `validate_ats_report` (US-H1 partial), (2) no dual acronym+full-form keyword injection (US-H4), (3) US-H6 advisory vs. blocking distinction is implemented for download gating but the readiness chip in both the File Review tab and the Finalise tab counts advisory-only failures as issues (GAP-NEW-ATS-01), (4) the "Blocked formats reflect ATS validation failures" footer sentence appears spuriously when only advisory fails are present (GAP-NEW-ATS-02), (5) US-H7 score update is a debounced server round-trip (not a true instant client-side update), (6) US-H8 user classification override does not retroactively update already-generated DOCX files, and (7) the `telephone` and `hasOccupation` fields are not validated in the JSON-LD completeness check.

---

## Application Evaluation

### US-H1: ATS File Ingestion

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Single-column layout; zero tables in ATS DOCX | ✅ Pass | `cv_orchestrator.py:3851` — `Document()` with no `add_table()` calls; `docx_zero_tables` check at line 5377 |
| Zero text boxes / shapes in ATS DOCX | ✅ Pass | `cv_orchestrator.py:5414–5425` — VML textbox check using Clark notation |
| Contact info in document body (not header/footer) | ✅ Pass | `cv_orchestrator.py:3870–3901` — contact is `doc.add_paragraph()` in body; `docx_contact_in_body` check at line 5428 |
| ATS-safe fonts (Arial / Calibri / Times New Roman) | ✅ Pass | `_setup_ats_styles` sets all styles to Calibri; font compliance check `docx_ats_safe_fonts` at line 5622 |
| All URLs spelled out as plain text | ⚠ Partial | `cv_orchestrator.py:3897–3898` — LinkedIn appended as raw string (no hyperlink object). BUT `validate_ats_report` has no check for embedded hyperlink `r:id` relationships. If a future code path creates hyperlink objects, there is no programmatic guard. |
| JSON-LD `<script type="application/ld+json">` in HTML head | ✅ Pass | `cv_orchestrator.py:946, 2144` — `json_ld_str` built and injected; `html_jsonld_present` check at line 5679 |
| HTML Schema.org/Person structured data | ✅ Pass | `cv_orchestrator.py:1573–1601` — `@type: Person`, `@context: https://schema.org`; check at line 5688 |
| PDF US Letter page size | ✅ Pass | `cv_orchestrator.py:5754–5778` — `pdf_us_letter` check |
| PDF fonts embedded | ✅ Pass | `cv_orchestrator.py:5781–` — `pdf_fonts_embedded` check |
| ATS text extraction test (100% selectable) | ✅ Pass | `cv_orchestrator.py:5399–5404` — `docx_text_selectable` check: passes if >100 chars extracted |

---

### US-H2: ATS Section Recognition

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Generated DOCX uses Heading 1 style for all section headings | ✅ Pass | All section headings use `style='Heading 1'`; validated by `docx_heading1_present` at line 5469 |
| "Professional Summary" heading | ✅ Pass | `cv_orchestrator.py:3907` — hardcoded `'Professional Summary'` |
| "Work Experience" heading | ✅ Pass | `cv_orchestrator.py:3938` — hardcoded `'Work Experience'` |
| "Education" heading | ✅ Pass | `'Education'` heading in ATS DOCX |
| "Technical Skills" / "Core Competencies" headings | ✅ Pass | `cv_orchestrator.py:3928, 3933` — exact strings used |
| "Certifications" heading (not "Credentials") | ✅ Pass | Hardcoded `'Certifications'` |
| "Publications" / "Selected Publications" heading | ✅ Pass | `docx_publications_heading` check at line 5606 |
| Standard heading validation rejects creative names | ✅ Pass | `cv_orchestrator.py:5437–5467` — `STANDARD` frozenset + `docx_standard_headings` check |
| Candidate name NOT a Heading style | ✅ Pass | `cv_orchestrator.py:3874–3880` — name is a bold 16pt run; comment explicitly states "not a Heading style" |

---

### US-H3: Contact Information Parsing

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Contact block is first content in document body | ✅ Pass | `cv_orchestrator.py:3870–3901` — name paragraph then contact paragraph precede all headings |
| Name, city/state, phone, email on first 1–2 lines | ✅ Pass | `cv_orchestrator.py:3884–3900` — single pipe-separated contact line |
| Phone formatted as NNN-NNN-NNNN (no parentheses) | ✅ Pass | `cv_orchestrator.py:4285–4294` — `_normalize_phone()` strips parentheses, extracts 10 digits |
| LinkedIn URL as plain text | ✅ Pass | `cv_orchestrator.py:3897–3898` — raw string append, no hyperlink object created |
| No full street address (city + state only) | ✅ Pass | `cv_orchestrator.py:3883–3892` — comment "City/state only"; uses `address_display` or `city, state` |
| Credentials (Ph.D.) after name with comma separator | — N/A | Depends on master data `name` field value; no code enforces or validates credential separator format |
| Name casing check | ✅ Pass | `cv_orchestrator.py:5478–5489` — `docx_name_casing` check warns on ALL-CAPS or all-lowercase |

---

### US-H4: Keyword Matching and Scoring

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Post-generation keyword check against ATS DOCX text | ✅ Pass | `cv_orchestrator.py:5511–5567` — two-tier (required / supplemental) keyword matching with `_kw_in_text()` |
| System reports keyword present, section found, match type | ⚠ Partial | `scoring.py:530–545` — returns `matched_in_sections` and `match_type`. ATS Report modal (`ats-modals.js:120–138`) shows per-keyword section breakdown. File Review validation table shows only aggregated pass/warn/fail; per-keyword detail accessible via "ATS Report" modal button. |
| System warns when required keyword absent from ATS DOCX | ✅ Pass | `cv_orchestrator.py:5561–5567` — missing keywords trigger `fail` or `warn` |
| Keyword variants normalised (case, hyphen/slash) | ✅ Pass | `cv_orchestrator.py:5520–5536`; `scoring.py:468–522` |
| `knowsAbout` in HTML JSON-LD contains approved skill names | ✅ Pass | `cv_orchestrator.py:1548–1556`; `html_jsonld_knows_about` check at line 5697 |
| Both acronym and full form present ("MLOps / ML Operations") | 🔲 Not Implemented | No code generates dual acronym+full-form entries. Synonym map enables matching but does not inject both forms into generated text. |

---

### US-H5: Date and Employment History Parsing

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All date ranges use consistent separator (em-dash `–`) | ⚠ Partial | `cv_orchestrator.py:3948` — uses `–` (U+2013 en-dash). Story specifies em-dash (U+2014) but story examples also use U+2013. Date consistency check validates mixed formats, not specific dash character type. Low-risk discrepancy. |
| All dates include month and year | ⚠ Partial | `cv_orchestrator.py:5593–5603` — `docx_year_only_dates` warns when year-only dates detected. Warning only, not enforced at data entry. |
| Job entry header on one line: `Title | Company | Location | Date Range` | ✅ Pass | `cv_orchestrator.py:3941–3953` — pipe-joined on single line |
| No overlapping date ranges (system validates) | ✅ Pass | `cv_orchestrator.py:5156–5224, 2108–2130` — `_detect_date_overlaps()` runs at generation; surfaced in download tab |
| "Present" used for current role | ✅ Pass | `cv_orchestrator.py:3948` — `exp.get('end_date', 'Present')` |

---

### US-H6: ATS Output Validation Report

| Criterion | Status | Evidence |
|-----------|--------|----------|
| System runs programmatic ATS validation checks after generation | ✅ Pass | `cv_orchestrator.py:2234` — `validate_ats_report()` runs at generation; also on demand via `GET /api/ats-validate` |
| Validation covers DOCX, HTML, PDF (16+ checks) | ✅ Pass | `cv_orchestrator.py:5337–5793` — 18 named checks covering all three formats |
| Results displayed in UI with pass/warn/fail per check | ✅ Pass | `download-tab.js:80–173` — `_renderValidationSummary()` renders full table with advisory vs. blocking separation |
| Any fail blocks download with clear explanation | ⚠ Partial | `download-tab.js:178–188` — `_NON_BLOCKING_CHECKS` intentionally exempts 9 structural checks from blocking downloads on fail (date format, JSON-LD schema type, JSON-LD knowsAbout, heading text, heading style, page count, page size, shapes, publications heading). Advisory rationale is sound but diverges from story's "any fail blocks" intent. |
| Any warn allows download but shows specific issue | ✅ Pass | Warn-status checks do not set block flags; shown in amber row |
| Validation results included in `metadata.json` | ✅ Pass | `cv_orchestrator.py:2263–2271` — `ats_validation` key with checks, page_count, summary |
| ⚠ GAP-NEW-ATS-01: Readiness chip counts advisory fails | ❌ Gap | `download-tab.js:414` — `_atsFails` filter uses `c.status === 'fail'` with no exclusion of `_NON_BLOCKING_CHECKS`. Advisory-only failures (e.g. `docx_date_format_consistent` returning `fail`) cause the chip to go amber and show "ATS ⚠ N issues" even though all downloads remain available. Same issue in `finalise.js:175` — `atsFails` filter is identical. Both readiness indicators mis-report severity. |
| ⚠ GAP-NEW-ATS-02: Spurious "Blocked formats" footer sentence | ❌ Gap | `download-tab.js:258` — `if (summary.fail > 0 && files.length)` uses the raw `summary.fail` count from the backend, which includes advisory `fail`-status checks. This sentence ("Blocked formats reflect ATS validation failures for the corresponding output types") appears even when no format is actually blocked. |

---

### US-H7: ATS Match Score Visibility

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Overall match score (0–100%) displayed after job analysis | ✅ Pass | `job-analysis.js:144` — `refreshAtsScore('analysis')`; badge rendered at `ats-refinement.js:150–181` |
| Score weighted: hard skills count twice as soft | ✅ Pass | `scoring.py:574–575` — `overall = round((2 * hard_score + soft_score) / 3, 1)` |
| Score updates live as user approves/rejects items | ⚠ Partial | `ats-refinement.js:211–214` — 600ms debounced server round-trip. Triggered on skill changes (`skills-review.js:1194`), summary accept (`summary-review.js:261, 289, 358`), experience/achievement changes (`experience-review.js:390`, `achievements-review.js:463`), rewrites (`rewrite-review.js:665`), spell-check (`spell-check.js:169, 480`). No page reload required. Requires a server round-trip per action, not true instant client-side update. |
| Score persisted to `metadata.json` at generation | ✅ Pass | `cv_orchestrator.py:2254` — `'ats_score': ats_score_at_generation` in metadata |
| Score UI labels: Matched ✅, Missing ❌, Bonus ★ | ✅ Pass | `ats-modals.js:82–93` — `_keywordStatusBadge()` returns `❌ Missing`, `⚠ Partial`, `✅ Matched`, `★ Bonus match`; groups at lines 54–58 |
| "Basis" label translated to user-readable strings | ✅ Pass | `ats-modals.js:242` — inline object maps `review_checkpoint` → "During review", `post_generation` → "After generation", `analysis` → "After job analysis". Fallback `_buildSummaryDetail` at `ats-refinement.js:74` uses raw basis string only when no sections, keywords, or missing-hard data are available (extremely rare). |

---

### US-H8: Hard / Soft Skill Distinction in ATS Output

| Criterion | Status | Evidence |
|-----------|--------|----------|
| LLM classifies every extracted skill as hard or soft during job analysis | ⚠ Partial | Job analysis produces `required_skills` (→ hard) and `nice_to_have_skills` (→ soft) in `scoring.py:373–375`. `_classify_skill_type()` at `cv_orchestrator.py:4297–4313` reads stored `skill_type` first, then category/name heuristics. No explicit separate LLM call for skill classification; inferred from required vs. nice-to-have placement in the job analysis LLM response. |
| Master CV skills classified and persisted | ✅ Pass | `generation_routes.py:1041–1116` — `_harvest_update_skill_type()` writes `skill_type` back to master at harvest |
| ATS DOCX separates "Technical Skills" (hard) and "Core Competencies" (soft) | ✅ Pass | `cv_orchestrator.py:3915–3935` — `_classify_skill_type()` partitions; hard → `Technical Skills`, soft → `Core Competencies` |
| HTML JSON-LD `knowsAbout` includes `additionalType: HardSkill/SoftSkill` | ✅ Pass | `cv_orchestrator.py:1550–1553` — `"additionalType": "HardSkill"` or `"SoftSkill"` per entry |
| User can override classification in UI | ✅ Pass | `skills-review.js:973–993` — `skill-type-toggle` click → `saveSkillQualifierOverride()` with `skill_type` |
| Override propagates to generated documents | ⚠ Partial | Override saved to session `skill_qualifier_overrides` and applied at generation via `_classify_skill_type()`. But overrides applied after initial generation do not retroactively update existing DOCX files — re-generation required. Harvest propagates to master. |
| Missing hard skills highlighted more prominently | ✅ Pass | `ats-modals.js:250–258` — missing hard requirements in separate amber warning box; `ats-refinement.js:47–55` — missing hard skills appear first in badge summary |

---

## Generated Materials Evaluation

### ATS DOCX Structural Quality

- **No tables**: Confirmed — `cv_orchestrator.py:5407–5412` validates zero tables.
- **No text boxes/shapes**: Confirmed — VML/MC check at line 5414; advisory (`_NON_BLOCKING_CHECKS`).
- **Heading hierarchy**: Correct — Heading 1 for all sections, name as bold run (not Heading style), preventing ATS heading hierarchy confusion.
- **Font compliance**: Calibri throughout (ATS-safe); set at `_setup_ats_styles`. Check at `docx_ats_safe_fonts`.
- **Contact block**: Single pipe-separated line in body. Correct order: city | phone | email | LinkedIn.
- **Phone normalisation**: `_normalize_phone()` at line 4285 handles all common formats. Output: NNN-NNN-NNNN.
- **LinkedIn as plain text**: Raw string append at line 3897 — no hyperlink object in ATS path. Correct.
- **Date separator**: Uses `–` (U+2013 en-dash). Story examples also use U+2013. Low-risk.
- **Year-only dates**: `docx_year_only_dates` warns; shown in File Review tab.
- **Date overlap**: Detection and UI display implemented.
- **Candidate name casing**: `docx_name_casing` check at line 5478.

### HTML JSON-LD Structured Data Quality

- **Schema.org/Person**: Correct context and type.
- **Required fields present**: `name`, `email`, `telephone`, `hasOccupation`, `alumniOf`, `knowsAbout`, `sameAs`, `award`.
- **`knowsAbout` skill typing**: Each entry has `@type: DefinedTerm` and `additionalType: HardSkill/SoftSkill`.
- **Validation gap**: `validate_ats_report` at line 5706 only checks `name` and `email` for the `html_required_fields` check. `telephone` and `hasOccupation` completeness are not validated programmatically despite both being required by US-H1.

### Keyword Strategy

- **Synonym matching**: Implemented via `_synonym_map` + `_expansion_index`; used in `scoring.py:446–520`.
- **Keyword enrichment**: `_enhance_summary_for_ats()` and `_enhance_achievement_for_ats()` inject job-specific keywords at generation.
- **Acronym+full form injection**: NOT implemented — system matches synonyms but does not automatically generate both "MLOps" and "ML Operations" in text.
- **Keyword density check**: Warns if top-5 keywords appear fewer than 2× (`cv_orchestrator.py:5569–5591`).

### PDF Quality

- **US Letter page size**: Validated at generation.
- **Font embedding**: Validated; warns if unembedded.
- **Clipped content check**: NOT implemented — no margin/overflow check in `validate_ats_report`.

---

## Terminology Evaluation

| Term | Location | Assessment |
|------|----------|------------|
| "ATS" (unexplained on first use) | `index.html` | Badge tooltip explains "Applicant Tracking System (ATS) match score". Acceptable. |
| "Hard Requirements" vs "Preferred Skills" | `ats-modals.js:54–58` | Clear and appropriate for user-facing text. |
| "★ Bonus Keywords" | `ats-modals.js:57` | Slightly ambiguous — "bonus" could mean extra candidate skills or keywords that are a bonus to include. "Candidate Extras" or "Added Value" would be clearer. |
| "ATS keyword failure blocks all downloads" | `download-tab.js:140` | Clear and direct. |
| "Compute ATS Score" | `ats-modals.js:403` | Clear action verb. |
| "Completeness check step" | `download-tab.js:381` | Slightly developer-centric. "Submission Review" or "Final Check" would better match user mental model. |
| "Basis: review_checkpoint" | `ats-refinement.js:74` | Raw basis string shown only in the fallback path of `_buildSummaryDetail` when there are no missing hard keywords, no section scores, and no matched keywords — an extremely rare state. The ATS modal translates basis to user-readable text at `ats-modals.js:242`. Low-priority. |
| "⛔ Blocked — output file could not be generated" | `download-tab.js:199` | Misleading — file may exist; block is due to ATS validation failure, not a generation failure. Should read "⛔ Blocked by ATS validation — fix required". |

---

## Gaps and Proposed Story Items

**GAP-NEW-ATS-01 (HIGH): Readiness chip and finalise checklist count advisory fails as issues**
`download-tab.js:414` computes `_atsFails` as `c.status === 'fail' || c.status === 'error'` with no exclusion of `_NON_BLOCKING_CHECKS`. Same pattern at `finalise.js:175`. Advisory-only failures (e.g. `docx_date_format_consistent` backend status `fail`, `html_jsonld_valid_person` backend status `fail`) cause both the File Review header chip and the Finalise submission readiness checklist to go amber and show "ATS ⚠ N issues" even when all downloads are available. Fix: filter `_atsFails` to exclude names in `_NON_BLOCKING_CHECKS`, or change advisory checks to use `warn` status on the backend so `summary.fail` only counts genuinely blocking failures.

**GAP-NEW-ATS-02 (MEDIUM): "Blocked formats reflect..." footer appears spuriously**
`download-tab.js:258` — `if (summary.fail > 0 && files.length)` appends "Blocked formats reflect ATS validation failures for the corresponding output types." `summary.fail` is the raw backend count and includes advisory `fail`-status checks. This sentence appears even when no format is blocked. Fix: replace `summary.fail > 0` with `blockingFails.length > 0` (which is already computed in scope at line 110).

**US-H9 (Proposed): Hyperlink-Object Validation in ATS DOCX**
`validate_ats_report` has no check for embedded hyperlink relationships (`r:id`) in the ATS DOCX. A check using `doc.part.rels` to confirm zero hyperlinks would close the US-H1 "URLs as plain text" acceptance criterion programmatically.

**US-H10 (Proposed): `hasOccupation` and `telephone` Completeness in JSON-LD Validation**
The `html_required_fields` check at `cv_orchestrator.py:5706` only validates `name` and `email`. US-H1 and US-H6 list `telephone` and `hasOccupation` as required structured-data fields. These should be added to the validation check.

**US-H11 (Proposed): Acronym + Full-Form Keyword Injection**
US-H4 requires both acronym and full form present ("MLOps (ML Operations)"). No current code generates dual forms in output text. A keyword enrichment step that appends the full form parenthetically when an acronym is detected (or vice versa) is needed.

**US-H12 (Proposed): PDF Margin / Clipped-Content Check**
US-H6 item "No clipped content at margins" has no corresponding validation check in `validate_ats_report`. A pypdf-based BBox vs. MediaBox comparison would catch overflow content.

**US-H13 (Proposed): Credential-Separator Format Validation**
US-H3 requires credentials (Ph.D.) appear after name with comma separator. No code enforces or validates this. An acceptance check on the `name` field would prevent ATS name-field mis-parsing.

---

**Reviewed against:** `web/ats-modals.js`, `web/ats-refinement.js`, `web/download-tab.js`, `web/skills-review.js`, `web/finalise.js`, `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/cv_orchestrator.py`, `scripts/utils/scoring.py`, `scripts/routes/generation_routes.py`, `scripts/routes/review_routes.py`, `scripts/routes/status_routes.py`

| Story | ✅ Pass | ⚠ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-H1 | 9 | 1 | 0 | 0 | 0 |
| US-H2 | 9 | 0 | 0 | 0 | 0 |
| US-H3 | 6 | 0 | 0 | 0 | 1 |
| US-H4 | 4 | 1 | 0 | 1 | 0 |
| US-H5 | 3 | 2 | 0 | 0 | 0 |
| US-H6 | 4 | 1 | 2 | 0 | 0 |
| US-H7 | 5 | 1 | 0 | 0 | 0 |
| US-H8 | 5 | 2 | 0 | 0 | 0 |

**Key evidence references:**
- US-H1 (table check): `validate_ats_report` → `cv_orchestrator.py:5377`
- US-H1 (JSON-LD build): `_build_json_ld` → `cv_orchestrator.py:1495–1601`
- US-H2 (section headings): `_generate_ats_docx` → `cv_orchestrator.py:3907–3956`
- US-H3 (phone normalize): `_normalize_phone` → `cv_orchestrator.py:4285–4294`
- US-H4 (keyword check): `ats_keyword_presence` → `cv_orchestrator.py:5511–5567`
- US-H4 (synonym matching): `compute_ats_score` → `scoring.py:446–595`
- US-H5 (date overlap): `_detect_date_overlaps` → `cv_orchestrator.py:5156–5224`
- US-H6 (blocking rules): `_NON_BLOCKING_CHECKS` → `download-tab.js:178–188`
- US-H6 (GAP-NEW-ATS-01): readiness chip → `download-tab.js:414`, `finalise.js:175`
- US-H6 (GAP-NEW-ATS-02): spurious footer → `download-tab.js:258`
- US-H7 (2:1 weighting): `scoring.py:574–575`
- US-H7 (live refresh): `scheduleAtsRefresh` → `ats-refinement.js:211–214`
- US-H7 (basis translation): `ats-modals.js:242`
- US-H8 (hard/soft DOCX split): `cv_orchestrator.py:3915–3935`
- US-H8 (`additionalType` JSON-LD): `cv_orchestrator.py:1550–1553`
- US-H8 (type override UI): `skills-review.js:973–993`

**Evidence standard:** Every conclusion supported by file:line evidence. `tasks/gaps.md` was not consulted.
