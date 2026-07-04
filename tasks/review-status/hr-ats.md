<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# HR / ATS Persona Review

**Persona:** HR coordinator evaluating both the application workflow and what an ATS sees
**Review Date:** 2026-07-04 (status corrections cycle 65)
**Branch:** feature/multi-user-deployment
**Reviewer:** Automated persona evaluation (source-first)

---

## Application Evaluation

### US-H1: ATS File Ingestion — PARTIAL PASS

The application generates three output formats as specified: `*_ATS.docx`, `*.pdf`, and `*.html`. Generation is confirmed in `_generate_ats_docx`, `_generate_human_pdf`, and `generate_cv` in `cv_orchestrator.py` (lines 2169–2230).

#### DOCX path (confirmed)

- `_generate_ats_docx` uses python-docx to build a fully plain-text document with no tables, text boxes, or headers/footers.
- Contact information is placed in the document body as a paragraph (line 3853–3854), not in a Word header/footer. Pass.
- `_setup_ats_styles` sets Calibri as the default font for Normal, Heading 1, Heading 2, and List Bullet styles. Pass.
- No tables are added; no shapes are used. Pass.

**Gap (hyperlinks in ATS DOCX):** The `_generate_human_docx` method (line 4617) adds formatted hyperlinks using `_add_hyperlink`. The story requirement is that URLs be spelled out as plain text in the ATS DOCX. The ATS DOCX generator (`_generate_ats_docx`) does NOT use `_add_hyperlink` — the LinkedIn contact is added as a plain text string (line 3851). However, the underlying contact dict may contain a shortened form (e.g., `linkedin.com/in/...`) rather than the full HTTPS URL. There is no explicit plain-text full URL enforcement for LinkedIn in the ATS DOCX. Minor gap.

#### HTML path (confirmed)

- `_build_json_ld` (line 1495–1601) produces a Schema.org/Person block embedded in the HTML `<head>` via `json_ld_str`.
- The template emits a `<script type="application/ld+json">` block; the ATS validation checks confirm this is parsed correctly (lines 5455–5499).

#### PDF path

PDF is generated via Chrome headless or WeasyPrint from the HTML. US Letter size and font embedding are determined by the renderer, not explicitly configured in code. No programmatic check for US Letter page size or font embedding is performed.

---

### US-H2: ATS Section Recognition — PASS

The ATS DOCX uses `Heading 1` Word style for all section headings, confirmed in `_generate_ats_docx`:

- `'Professional Summary'` — Heading 1 (line 3860)
- `'Technical Skills'` — Heading 1 (line 3879)
- `'Core Competencies'` — Heading 1 (line 3884)
- `'Work Experience'` — Heading 1 (line 3889)
- `'Education'` — Heading 1 (line 3924)
- `'Certifications'` — Heading 1 (line 4415 via `_add_ats_additional_sections`)
- `'Awards'` — Heading 1 (line 4434)
- `'Publications'` / `'Selected Publications'` — validated in `validate_ats_report` (line 5393)

All section labels match accepted ATS labels per the story. The validation function `validate_ats_report` verifies that no unexpected headings appear (lines 5241–5263) and that Heading 1 style is present (lines 5265–5271).

**Terminology clarity:** Labels used are standard ATS vocabulary. "Work Experience" (not "Career History"), "Professional Summary" (not "About Me"), "Technical Skills" + "Core Competencies" (not "Toolkit"), "Education" (not "Academic Background"), "Certifications" (not "Credentials"). Pass.

---

### US-H3: Contact Information Parsing — PASS with advisory

The ATS DOCX contact block is built at lines 3836–3853. Key points:

- **City/state only, no street address:** `address_display` is used (city + state), not the full address. Pass.
- **Phone normalization:** `_normalize_phone` (line 4227–4236) converts phone to `NNN-NNN-NNNN` format (no parentheses). Pass.
- **Single line, pipe-separated:** `' | '.join(contact_parts)` renders all contact parts on a single line. Pass.
- **Name placement:** Candidate name is a bold run on its own paragraph before the contact line. Pass.
- **LinkedIn as plain text:** LinkedIn is appended as a string to `contact_parts` (line 3851), not as a hyperlink. Pass.
- **Ph.D./credentials in name field:** No special stripping or transformation of name credentials is performed. The name from `Master_CV_Data.json` is used as-is. If the user's name includes "Ph.D.", it will appear in the name field. Per the story, credentials should appear after the name with a comma separator — this is a data-contract concern (user's master data), not enforced programmatically.

**Advisory:** The application does not validate or warn if the candidate name in `Master_CV_Data.json` is entirely in UPPERCASE or lowercase, which some ATS systems have trouble with. No normalization of name casing is applied.

---

### US-H4: Keyword Matching and Scoring — PASS

The ATS keyword strategy is implemented at multiple levels:

- `_optimize_skills_for_ats` (line 4046) reorders skills to maximize keyword match, using synonym expansion via `_expansion_index`. Skills matching `ats_keywords` or `required_skills` are prioritized.
- `compute_ats_score` in `scoring.py` (line 345–594) provides the live keyword analysis: case-insensitive matching, hyphen/slash variant normalization, synonym expansion via the synonym map.
- `validate_ats_report` check 8 (lines 5293–5349) performs a two-tier keyword check after generation: required-skill keywords (Tier 1, high-weight) and supplemental ATS keywords (Tier 2), with appropriate pass/warn/fail thresholds.
- Hyphen/slash variant normalization is implemented: `_kw_in_text` handles `"scikit-learn"` vs `"scikit learn"` equivalences (lines 5303–5318).
- `knowsAbout` in the HTML JSON-LD is populated with approved skill names (line 1596).

**Gap (keyword stuffing density check):** `validate_ats_report` check 8b (lines 5351–5373) warns when top ATS keywords appear fewer than 2 times. This is advisory. The story's acceptance criterion for keyword density is implemented as a warn-level check, not a hard block. Pass (advisory behavior is appropriate).

---

### US-H5: Date and Employment History Parsing — PASS

The ATS DOCX generates date ranges as:

```python
f"{exp.get('start_date', '')} – {exp.get('end_date', 'Present')}"
```

(line 3899) — using a Unicode en-dash `–` as the separator. The story specifies em-dash preferred. Both forms are ATS-safe.

Job entry format at line 3904: `Title | Company | Location | Date Range` on a single bold line. Pass.

`_detect_date_overlaps` (line 4982) detects overlapping employment date ranges and includes results in `metadata.json`. Pass.

`_detect_year_only_dates` (line 4955) warns when dates lack a month component; `validate_ats_report` check 7b (line 5376–5385) warns on year-only dates in the DOCX. Pass.

"Present" is used for current roles (the `end_date` default is `'Present'` at line 3899). Pass.

**Gap:** The application does not validate or block year-only dates from `Master_CV_Data.json` before generation; it only warns post-generation. Year-only dates pass through uncorrected into the generated DOCX.

---

### US-H6: ATS Output Validation Report — PARTIAL PASS

`validate_ats_report` (line 5133) runs 17 programmatic checks after generation:

**DOCX checks (12):** text selectable, zero tables, zero shapes/text boxes, contact info in body, standard heading text, Heading 1 style present, consistent date formats, ATS keyword presence (two-tier pass/warn/fail), ATS keyword density, year-only dates, publications heading text, ATS-safe fonts only.

**HTML checks (4):** JSON-LD present, JSON-LD is schema.org/Person, `knowsAbout` populated, required fields (name + email) present.

**PDF checks (2):** PDF generated successfully, PDF has selectable text.

Results are persisted to `metadata.json` (lines 2263–2271 in `generate_cv`). Pass.

**H6 gaps vs. story acceptance criteria:**

- **US Letter page size check:** Not implemented. No programmatic check that the PDF is US Letter.
- **Font embedding check:** Not implemented. pypdf is used only for page count and text extraction, not font embedding verification.
- **"Any fail blocks download":** The app does not currently block downloads based on ATS validation failures. Validation results are available in metadata but are not enforced as download gates in the UI finalise flow. Gap.
- **"Any warn allows download but shows specific issue":** Not confirmed in source. The ATS Report modal displays results, but the download path does not reference ATS check pass/warn/fail status. Gap.

---

### US-H7: ATS Match Score Visibility — PASS

The ATS score system is fully implemented:

- **Overall score (0–100%):** `compute_ats_score` returns `overall` (0–100%), `hard_requirement_score`, and `soft_requirement_score`.
- **Weighted scoring (hard 2x soft):** `overall = round((2 * hard_score + soft_score) / 3, 1)` (scoring.py line 575). Pass.
- **Live badge, no page reload:** `updateAtsBadge` (ats-refinement.js line 150) updates the header badge. `scheduleAtsRefresh` is called from `skills-review.js`, `summary-review.js`, `experience-review.js`, `rewrite-review.js`, `spell-check.js` etc. — score refreshes as the user approves/rejects items. Pass.
- **Score persisted to metadata.json:** `_try_patch_metadata(conv, {"ats_score": score})` (generation_routes.py line 1857), and `ats_score_at_generation` is saved in `metadata` (cv_orchestrator.py line 2254). Pass.
- **Per-skill states:** The ATS Report modal renders Matched (green ✅), Missing (red ❌), Partial (amber ⚠), and Bonus keywords grouped under "★ Bonus Keywords". Pass.

**Resolved (stale, cycle 60):** `_keywordStatusBadge()` in `ats-modals.js:89–91` now shows a `★ Bonus match` badge (amber/gold: `#fef9c3`/`#854d0e`) for matched bonus keywords rather than the generic `✅ Matched` green badge. Per-row ★ badge is present; the previously-reported "table-section level only" gap is resolved.

---

### US-H8: Hard / Soft Skill Distinction in ATS Output — PASS with gap

- **Classification:** `_classify_skill_type` (line 4239–4255) classifies each skill using: (1) explicit `skill_type` field (user-overridable), (2) category-based heuristics, (3) name-based heuristics. Pass.
- **ATS DOCX separation:** Hard skills → "Technical Skills" (Heading 1); soft skills → "Core Competencies" (Heading 1) (lines 3878–3886). Pass.
- **HTML JSON-LD `knowsAbout` with `additionalType`:** Each entry carries `"additionalType": "HardSkill"` or `"SoftSkill"` (line 1552). Pass.
- **User override:** The `skill_type` field in the skill dict takes precedence. Skills review UI allows overrides which propagate to generated documents. Pass.
- **Missing hard skills more prominent:** Missing hard requirements are shown in a dedicated amber/red callout box in the ATS Report (ats-modals.js line 252–256), separate from other missing keywords. Pass.

**Gap (Master CV write-back):** The story requires hard/soft classification to be persisted in `Master_CV_Data.json`. `_classify_skill_type` computes classification at render time from the `skill_type` field or heuristics. If the user has no `skill_type` field, classification is ephemeral (recomputed each run). The harvest workflow does not appear to write back `skill_type` classifications to `Master_CV_Data.json`. Gap.

---

## Generated Materials Evaluation

### ATS DOCX Format

- No tables: confirmed (no `doc.add_table()` call in `_generate_ats_docx`).
- No text boxes: confirmed (no shapes API used).
- Contact in body, not in Word header/footer: confirmed.
- Single-column layout: confirmed (python-docx default; no multi-column sections created).
- ATS-safe fonts (Calibri): confirmed for all paragraph styles via `_setup_ats_styles`.
- LinkedIn URL as plain text, not hyperlink: confirmed (line 3851).
- Section headings as Heading 1 style: confirmed.
- Job entry format `Title | Company | Location | Date Range` on one bold line: confirmed.
- Date range uses en-dash separator: confirmed.

### HTML JSON-LD Structured Data

`_build_json_ld` populates: `name`, `email`, `telephone`, `sameAs` (LinkedIn + website), `alumniOf`, `hasOccupation` (work history as Role entries), `knowsAbout` (skills with `additionalType: HardSkill/SoftSkill`), `award`, `address`, `jobTitle`, `description`.

`_validate_json_ld` checks required fields and logs warnings. `validate_ats_report` checks 9–12 programmatically verify the JSON-LD block after generation.

**Minor gap:** `hasOccupation` entries use `'@type': 'Role'` (line 1509), not `'@type': 'Occupation'`. The Schema.org spec supports `Role` as a value for `hasOccupation`, but some ATS structured-data parsers expect an `Occupation` node. This could reduce structured-data match accuracy on modern ATS. Minor gap.

---

## Terminology Clarity Evaluation

| Term                                   | Usage                                                                  | Assessment                               |
| -------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| ATS                                    | Header badge tooltip: "Applicant Tracking System (ATS) match score"    | Clear - acronym spelled out on first use |
| Hard requirements / Soft requirements  | ATS Report modal (ats-modals.js line 240-241)                          | Clear for HR audience                    |
| Technical Skills / Core Competencies   | DOCX section headings                                                  | Standard ATS vocabulary - pass           |
| Work Experience / Professional Summary | DOCX section headings                                                  | Standard ATS vocabulary - pass           |
| Matched / Missing / Partial / Bonus    | ATS Report keyword table                                               | Clear and intuitive for HR review        |
| Score thresholds                       | ">=75% Strong match", "50-74% Partial match", "<50% Low match"         | Appropriately calibrated for HR use      |

No non-standard creative section names appear in the ATS DOCX. All terminology is conventional to ATS workflows.

---

## Consolidated Gap Table

| Story  | Criterion                                        | Status  | Gap                                                           |
| ------ | ------------------------------------------------ | ------- | ------------------------------------------------------------- |
| US-H1  | DOCX: no tables, shapes, headers/footers         | PASS    | -                                                             |
| US-H1  | DOCX: LinkedIn as plain-text full URL            | PARTIAL | LinkedIn may be shortened; no https:// enforcement            |
| US-H1  | PDF: US Letter size                              | FAIL    | Not checked programmatically                                  |
| US-H1  | PDF: Fonts embedded                              | FAIL    | Not checked                                                   |
| US-H2  | Heading 1 style for all section headings         | PASS    | -                                                             |
| US-H2  | Standard heading labels only                     | PASS    | -                                                             |
| US-H3  | Contact block: phone NNN-NNN-NNNN, city/state    | PASS    | -                                                             |
| US-H3  | Name casing validation                           | FAIL    | No casing check/warning                                       |
| US-H4  | Keyword presence in ATS DOCX body                | PASS    | -                                                             |
| US-H4  | `knowsAbout` populated                           | PASS    | -                                                             |
| US-H4  | Post-generation keyword gap warning              | PASS    | -                                                             |
| US-H5  | Date format consistent, en-dash separator        | PASS    | -                                                             |
| US-H5  | Year-only date blocking (pre-generation)         | PARTIAL | Only warns post-generation, not a blocking gate               |
| US-H6  | 16+ ATS checks run after generation              | PASS    | -                                                             |
| US-H6  | Results persisted to metadata.json               | PASS    | -                                                             |
| US-H6  | US Letter + font embedding PDF checks            | FAIL    | Not implemented                                               |
| US-H6  | Download blocked on fail                         | FAIL    | Not implemented                                               |
| US-H7  | Live ATS score badge, no page reload             | PASS    | -                                                             |
| US-H7  | Weighted 2:1 hard/soft                           | PASS    | -                                                             |
| US-H7  | Score persisted to metadata.json                 | PASS    | -                                                             |
| US-H7  | Bonus (star) per-row badge                       | PARTIAL | Bonus group labeled star but per-row shows Matched            |
| US-H8  | DOCX: Technical Skills / Core Competencies split | PASS    | -                                                             |
| US-H8  | JSON-LD `additionalType: HardSkill/SoftSkill`    | PASS    | -                                                             |
| US-H8  | Master CV skill_type write-back (harvest)        | FAIL    | Classification not persisted back to Master_CV_Data.json      |
| All    | `hasOccupation` type as Occupation vs Role       | PARTIAL | Uses Role; Occupation preferred by some ATS parsers           |
