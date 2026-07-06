<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# HR/ATS Review Status

**Last Updated:** 2026-07-06 14:45 ET

**Executive Summary:** Source-verified HR/ATS persona review. The application is substantially ATS-compliant with strong implementations of DOCX structure, JSON-LD metadata, keyword scoring, and hard/soft skill classification. Five gaps remain: (1) no hyperlink-to-plain-text validation check in `validate_ats_report` (US-H1 partial), (2) no dual acronym+full-form keyword injection (US-H4 not implemented), (3) US-H6 blocking rules treat several structural failures as advisory only, (4) US-H7 score update is a debounced server round-trip, not a true client-side live update, and (5) US-H8 user classification override does not retroactively update already-generated DOCX files.

---

## Application Evaluation

### US-H1: ATS File Ingestion

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Single-column layout; zero tables in ATS DOCX | ✅ Pass | `cv_orchestrator.py:3850` — `Document()` with no `add_table()` calls; `docx_zero_tables` check at line 5377 |
| Zero text boxes / shapes in ATS DOCX | ✅ Pass | `cv_orchestrator.py:5389–5394` — VML textbox check |
| Contact info in document body (not header/footer) | ✅ Pass | `cv_orchestrator.py:3867–3885` — contact is `doc.add_paragraph()` in body; `docx_contact_in_body` check at line 5397 |
| ATS-safe fonts (Arial / Calibri / Times New Roman) | ✅ Pass | `cv_orchestrator.py:4005–4038` — `_setup_ats_styles` sets all styles to Calibri; font compliance check at line 5592 |
| All URLs spelled out as plain text | ⚠️ Partial | `cv_orchestrator.py:3882–3883` — LinkedIn appended as raw string (no hyperlink object). BUT `validate_ats_report` has no check for embedded hyperlink `r:id` relationships in the ATS DOCX. If a future code path adds links, there is no guard. |
| JSON-LD `<script type="application/ld+json">` in HTML head | ✅ Pass | `cv_orchestrator.py:946, 2144` — `json_ld_str` built and injected; `html_jsonld_present` check at line 5643 |
| HTML Schema.org/Person structured data | ✅ Pass | `cv_orchestrator.py:1573–1596` — JSON-LD `@type: Person`, `@context: https://schema.org`; validation at line 5654 |
| PDF US Letter page size | ✅ Pass | `cv_orchestrator.py:5726–5748` — `pdf_us_letter` check |
| PDF fonts embedded | ✅ Pass | `cv_orchestrator.py:5751–5790` — `pdf_fonts_embedded` check |
| ATS text extraction test (100% selectable) | ✅ Pass | `cv_orchestrator.py:5368–5374` — `docx_text_selectable` check: passes if >100 chars extracted |

---

### US-H2: ATS Section Recognition

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Generated DOCX uses Heading 1 style for all section headings | ✅ Pass | `cv_orchestrator.py:3892, 3911, 3916, 3920, 3956, 4579, 4598, 4628` — all use `style='Heading 1'`; validated at line 5439 |
| "Professional Summary" heading | ✅ Pass | `cv_orchestrator.py:3892` — hardcoded `'Professional Summary'` |
| "Work Experience" heading | ✅ Pass | `cv_orchestrator.py:3920` — hardcoded `'Work Experience'` |
| "Education" heading | ✅ Pass | `cv_orchestrator.py:3956` — `'Education'` |
| "Technical Skills" / "Core Competencies" headings | ✅ Pass | `cv_orchestrator.py:3911, 3916` — exact strings |
| "Certifications" heading (not "Credentials") | ✅ Pass | `cv_orchestrator.py:4581` — `'Certifications'` |
| "Publications" / "Selected Publications" heading | ✅ Pass | `cv_orchestrator.py:4628`; `docx_publications_heading` check at line 5576 |
| Standard heading validation rejects creative names | ✅ Pass | `cv_orchestrator.py:5407–5437` — `STANDARD` frozenset + `docx_standard_headings` check |
| Candidate name NOT a Heading style | ✅ Pass | `cv_orchestrator.py:3859–3864` — name is a bold run at 16pt, comment explicitly states "not a Heading style" |

---

### US-H3: Contact Information Parsing

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Contact block is first content in document body | ✅ Pass | `cv_orchestrator.py:3856–3886` — name paragraph then contact paragraph added before any heading |
| Name, city/state, phone, email on first 1-2 lines | ✅ Pass | `cv_orchestrator.py:3870–3885` — single pipe-separated line |
| Phone formatted as NNN-NNN-NNNN (no parentheses) | ✅ Pass | `cv_orchestrator.py:4268–4277` — `_normalize_phone()` |
| LinkedIn URL as plain text | ✅ Pass | `cv_orchestrator.py:3882–3883` — raw string append, no hyperlink object |
| No full street address (city + state only) | ✅ Pass | `cv_orchestrator.py:3868, 3872–3877` — code comment "City/state only"; uses `address_display` or `city, state` |
| Credentials (Ph.D.) after name with comma separator | — N/A | Depends on master data `name` field value; no code enforces or validates credential separator format |
| Name casing check | ✅ Pass | `cv_orchestrator.py:5447–5459` — `docx_name_casing` check warns on ALL-CAPS or all-lowercase |

---

### US-H4: Keyword Matching and Scoring

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Post-generation keyword check against ATS DOCX text | ✅ Pass | `cv_orchestrator.py:5481–5537` — two-tier (required / supplemental) keyword matching |
| System reports keyword present, section found, match type | ⚠️ Partial | `scoring.py:530–545` — returns `matched_in_sections` and `match_type`. ATS Report modal (`ats-modals.js:120–138`) shows per-keyword section breakdown. The File Review download tab validation table reports only aggregated pass/warn/fail, not per-keyword detail — but the detail is accessible via "ATS Report" modal. |
| System warns when required keyword absent from ATS DOCX | ✅ Pass | `cv_orchestrator.py:5531–5537` — missing keywords trigger `fail` or `warn` |
| Keyword variants normalised (case, hyphen/slash) | ✅ Pass | `cv_orchestrator.py:5490–5506`; `scoring.py:468–522` |
| `knowsAbout` in HTML JSON-LD contains approved skill names | ✅ Pass | `cv_orchestrator.py:1548–1556`; `html_jsonld_knows_about` check at line 5665 |
| Both acronym and full form present ("MLOps / ML Operations") | 🔲 Not Implemented | No code generates dual acronym+full-form entries. Synonym map enables matching but does not inject both forms into generated text. |

---

### US-H5: Date and Employment History Parsing

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All date ranges use consistent separator (em-dash `–`) | ⚠️ Partial | `cv_orchestrator.py:3931` — uses en-dash `–` (U+2013). Story specifies em-dash but the story's own examples also use U+2013. Consistency check at line 5461 validates mixed formats but not specific dash character type. Low-risk discrepancy. |
| All dates include month and year | ⚠️ Partial | `cv_orchestrator.py:5563–5573` — `docx_year_only_dates` warns when year-only dates detected. Warning only, not enforced at data entry. |
| Job entry header on one line: `Title | Company | Location | Date Range` | ✅ Pass | `cv_orchestrator.py:3924–3936` — pipe-joined on single line |
| No overlapping date ranges (system validates) | ✅ Pass | `cv_orchestrator.py:5156–5224, 2108–2130` — `_detect_date_overlaps()` runs at generation; surfaced in download tab at `download-tab.js:450–459` |
| "Present" used for current role | ✅ Pass | `cv_orchestrator.py:3931` — `exp.get('end_date', 'Present')` |

---

### US-H6: ATS Output Validation Report

| Criterion | Status | Evidence |
|-----------|--------|----------|
| System runs programmatic ATS validation checks after generation | ✅ Pass | `cv_orchestrator.py:2232–2234` — `validate_ats_report()` runs after all files generated |
| Validation covers DOCX, HTML, PDF (16+ checks) | ✅ Pass | `cv_orchestrator.py:5307–5793` — text selectable, zero tables, zero shapes, contact in body, standard headings, Heading 1, date format, keyword presence, keyword density, year-only dates, publications heading, font compliance, JSON-LD valid/knowsAbout/fields, PDF page size, font embedding |
| Results displayed in UI with pass/warn/fail per check | ✅ Pass | `download-tab.js:80–145` — `_renderValidationSummary()` renders full table |
| Any fail blocks download with clear explanation | ⚠️ Partial | `download-tab.js:148–161` — `_NON_BLOCKING_CHECKS` exempts `docx_zero_shapes`, `docx_standard_headings`, `docx_heading1_present`, `docx_date_format_consistent`, `html_jsonld_valid_person`, `html_jsonld_knows_about` from blocking downloads even on fail. Story intent ("any fail blocks download") is not fully met. |
| Any warn allows download but shows specific issue | ✅ Pass | `download-tab.js:165–168` — warn-status checks do not set block flags |
| Validation results included in `metadata.json` | ✅ Pass | `cv_orchestrator.py:2263–2271` — `ats_validation` key with checks, page_count, summary |

---

### US-H7: ATS Match Score Visibility

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Overall match score (0-100%) displayed after job analysis | ✅ Pass | `job-analysis.js:138` — `refreshAtsScore('analysis')`; badge rendered at `ats-refinement.js:150–181` |
| Score weighted: hard skills count twice as soft | ✅ Pass | `scoring.py:574–575` — `overall = round((2 * hard_score + soft_score) / 3, 1)` |
| Score updates live as user approves/rejects items | ⚠️ Partial | `ats-refinement.js:211–214` — 600ms debounced backend call. Triggered on skill changes (`skills-review.js:1194`), summary accept (`summary-review.js:261, 289, 358`), experience/achievement changes, rewrites, spell-check. No page reload — but requires a server round-trip per change, not a true client-side instant update. |
| Score persisted to `metadata.json` at generation | ✅ Pass | `cv_orchestrator.py:2254` — `'ats_score': ats_score_at_generation` |
| Score UI labels: Matched ✅, Missing ❌, Bonus ★ | ✅ Pass | `ats-modals.js:82–93` — `_keywordStatusBadge()` returns `❌ Missing`, `✅ Matched`, `★ Bonus match`; groups at line 54–58 |

---

### US-H8: Hard / Soft Skill Distinction in ATS Output

| Criterion | Status | Evidence |
|-----------|--------|----------|
| LLM classifies every extracted skill as hard or soft during job analysis | ⚠️ Partial | Job analysis extracts `required_skills` (→ hard) and `nice_to_have_skills` (→ soft) in `scoring.py:373–375`. `_classify_skill_type()` at `cv_orchestrator.py:4280–4296` uses stored field first, then category/name heuristics. No explicit LLM skill-classification call during analysis — inferred from required vs. nice-to-have placement. |
| Master CV skills classified and persisted | ✅ Pass | `generation_routes.py:1041–1116` — `_harvest_update_skill_type()` writes `skill_type` back to master at harvest |
| ATS DOCX separates "Technical Skills" (hard) and "Core Competencies" (soft) | ✅ Pass | `cv_orchestrator.py:3905–3918` — `_classify_skill_type()` partitions; hard → `Technical Skills`, soft → `Core Competencies` |
| HTML JSON-LD `knowsAbout` includes `additionalType: HardSkill/SoftSkill` | ✅ Pass | `cv_orchestrator.py:1550–1553` — `"additionalType": "HardSkill"` or `"SoftSkill"` per entry |
| User can override classification in UI | ✅ Pass | `skills-review.js:973–993` — `skill-type-toggle` click → `saveSkillQualifierOverride()` with `skill_type` |
| Override propagates to generated documents | ⚠️ Partial | Override saved to session `skill_qualifier_overrides` and applied at generation via `_classify_skill_type()` (line 4286). But overrides after initial generation do not retroactively update existing DOCX files — re-generation required. Harvest propagates to master (`generation_routes.py:1096`). |
| Missing hard skills highlighted more prominently | ✅ Pass | `ats-modals.js:250–258` — missing hard requirements in separate amber warning box; `ats-refinement.js:47–55` — missing hard skills appear first in summary |

---

## Generated Materials Evaluation

### ATS DOCX Structural Quality

- **No tables**: Confirmed — `cv_orchestrator.py:5377` validates.
- **No text boxes/shapes**: Confirmed — VML/MC check at line 5389.
- **Heading hierarchy**: Correct — Heading 1 for all sections, name as bold run (not Heading style), preventing ATS heading hierarchy confusion.
- **Font compliance**: Calibri throughout (ATS-safe); set at `_setup_ats_styles()` line 4005.
- **Contact block**: Single pipe-separated line in body. Correct order: city | phone | email | LinkedIn.
- **Phone normalisation**: `_normalize_phone()` at line 4268 handles all common formats correctly.
- **LinkedIn as plain text**: Raw string append at line 3882 — no hyperlink object created in ATS path. Correct.
- **Date separator**: Uses `–` (U+2013 en-dash). Story examples also use U+2013. Low-risk.
- **Year-only dates**: Detection warns; shown in File Review tab.
- **Date overlap**: Detection and UI display implemented.

### HTML JSON-LD Structured Data Quality

- **Schema.org/Person**: Correct context and type.
- **Required fields present**: `name`, `email`, `telephone`, `hasOccupation`, `alumniOf`, `knowsAbout`, `sameAs`, `award`.
- **`knowsAbout` skill typing**: Each entry has `@type: DefinedTerm` and `additionalType: HardSkill/SoftSkill` — exceeds basic story requirement.
- **Validation gap**: `validate_ats_report` only checks `name` and `email` in JSON-LD (line 5676). `telephone` and `hasOccupation` completeness are not programmatically validated.

### Keyword Strategy

- **Synonym matching**: Implemented via `_synonym_map` + `_expansion_index` (`cv_orchestrator.py:119–127`); used in `scoring.py:446–520`.
- **Keyword enrichment**: `_enhance_summary_for_ats()` and `_enhance_achievement_for_ats()` inject job-specific keywords at generation.
- **Acronym+full form injection**: NOT implemented — system matches synonyms but does not automatically generate both "MLOps" and "ML Operations" in text.
- **Keyword density check**: Warns if top-5 keywords appear fewer than 2× (`cv_orchestrator.py:5539–5561`).

### PDF Quality

- **US Letter page size**: Validated at generation.
- **Font embedding**: Validated; warns if unembedded.
- **Clipped content check**: NOT implemented — no margin/overflow check in `validate_ats_report`.

---

## Terminology Evaluation

| Term | Location | Assessment |
|------|----------|------------|
| "ATS" (unexplained on first use) | `index.html:92, 107` | Badge tooltip explains "Applicant Tracking System (ATS) match score". Button tooltip at line 107 fully explains it. Acceptable. |
| "Hard Requirements" vs "Preferred Skills" | `ats-modals.js:54–58` | Clear and appropriate for user-facing text. |
| "★ Bonus Keywords" | `ats-modals.js:57` | Slightly ambiguous — "bonus" could mean the user has extra skills or the keyword is a bonus to include. "Candidate Extras" or "Added Value" would be clearer. |
| "ATS keyword failure blocks all downloads" | `download-tab.js:140` | Clear and direct. |
| "Compute ATS Score" | `ats-modals.js:399` | Clear action verb. |
| "Completeness check step" | `download-tab.js:381` | Slightly developer-centric. "Submission Review" or "Final Check" would better match user mental model. |
| "Basis: review_checkpoint" | `ats-refinement.js:74` — surfaced in score modal | Technical/developer-centric. Users won't understand "review_checkpoint" vs "post_generation". Should be translated or hidden. |
| "⛔ Blocked — output file could not be generated" | `download-tab.js:199` | Misleading — file may exist; block is due to ATS validation failure, not a generation failure. Should read "⛔ Blocked by ATS validation — fix required". |

---

## Additional Story Gaps / Proposed Story Items

**US-H9 (Proposed): Hyperlink-Object Validation in ATS DOCX**
`validate_ats_report` has no check for embedded hyperlink relationships (`r:id`) in the ATS DOCX. A check using `doc.part.rels` to confirm zero hyperlinks would close the US-H1 "URLs as plain text" acceptance criterion programmatically.

**US-H10 (Proposed): `hasOccupation` and `telephone` Completeness in JSON-LD Validation**
The HTML JSON-LD check at `cv_orchestrator.py:5676` only validates `name` and `email`. The US-H6 story lists `name`, `email`, `telephone`, and `hasOccupation` as required. These should be added to the `html_required_fields` validation check.

**US-H11 (Proposed): Acronym + Full-Form Keyword Injection**
US-H4 requires both acronym and full form present ("MLOps (ML Operations)"). No current code generates dual forms in output text. A keyword enrichment step that appends the full form parenthetically when an acronym is detected (or vice versa) is needed.

**US-H12 (Proposed): PDF Margin / Clipped-Content Check**
US-H6 item 16 ("No clipped content at margins") has no corresponding validation check in `validate_ats_report`. A pypdf-based BBox vs. MediaBox comparison would catch overflow content.

**US-H13 (Proposed): Blocking Rule Alignment with Story Intent**
US-H6 says "Any fail blocks download." The `_NON_BLOCKING_CHECKS` set in `download-tab.js:151–161` exempts six checks from blocking. Story intent should be reconciled: either update the story to enumerate advisory checks, or tighten the blocking logic for structural failures (no Heading 1, invalid JSON-LD schema).

**US-H14 (Proposed): Credential-Separator Format Validation**
US-H3 requires credentials (Ph.D.) appear after name with comma separator. No code enforces or validates this. An acceptance check on the `name` field in master data would prevent ATS name-field mis-parsing.

**US-H15 (Proposed): "Basis" Label Translation**
The `basis` string ("review_checkpoint", "post_generation", "analysis") is surfaced verbatim in the ATS Score modal (`ats-modals.js:241`). These are internal labels that should map to user-readable equivalents: "During review", "After generation", "After job analysis".

---

**Reviewed against:** web/index.html, web/app.js, web/ats-modals.js, web/ats-refinement.js, web/skills-review.js, web/download-tab.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/utils/scoring.py, scripts/routes/generation_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-H1 | 9 | 1 | 0 | 0 | 0 |
| US-H2 | 9 | 0 | 0 | 0 | 0 |
| US-H3 | 6 | 0 | 0 | 0 | 1 |
| US-H4 | 4 | 1 | 0 | 1 | 0 |
| US-H5 | 3 | 2 | 0 | 0 | 0 |
| US-H6 | 4 | 1 | 0 | 0 | 0 |
| US-H7 | 4 | 1 | 0 | 0 | 0 |
| US-H8 | 5 | 2 | 0 | 0 | 0 |

**Key evidence references:**
- US-H1 (table check): `validate_ats_report` → `cv_orchestrator.py:5377`
- US-H1 (JSON-LD build): `_build_json_ld` → `cv_orchestrator.py:1495–1601`
- US-H2 (section headings): `_generate_ats_docx` → `cv_orchestrator.py:3891–3956`
- US-H3 (phone normalize): `_normalize_phone` → `cv_orchestrator.py:4268–4277`
- US-H4 (keyword check): `ats_keyword_presence` → `cv_orchestrator.py:5481–5537`
- US-H4 (synonym matching): `compute_ats_score` → `scoring.py:446–595`
- US-H5 (date overlap): `_detect_date_overlaps` → `cv_orchestrator.py:5156–5224`
- US-H6 (blocking rules): `_NON_BLOCKING_CHECKS` → `download-tab.js:151–161`
- US-H7 (2:1 weighting): `scoring.py:574–575`
- US-H7 (live refresh): `scheduleAtsRefresh` → `ats-refinement.js:211–214`
- US-H8 (hard/soft DOCX split): `cv_orchestrator.py:3905–3918`
- US-H8 (`additionalType` JSON-LD): `cv_orchestrator.py:1550–1553`
- US-H8 (type override UI): `skills-review.js:973–993`
- US-H8 (harvest persist): `generation_routes.py:1041–1116`

**Evidence standard:** Every conclusion supported by file:line evidence. tasks/gaps.md was not consulted.
