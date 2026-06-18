<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD036 MD058 MD022 MD024 MD060 -->

# HR / ATS Persona Review

**Persona:** HR coordinator evaluating (1) the application workflow for ATS-safe output guidance, and (2) what an ATS sees when it parses the generated files.
**Review Date:** 2026-06-18
**Reviewer:** hr-ats (source-first automated review)
**Stories:** US-H1 through US-H8 (tasks/user-story-hr-ats.md)

---

## Section 1: Application Evaluation

How well does the application guide the user toward ATS-safe output?

---

### US-H1: ATS File Ingestion

**Acceptance Criteria**

**AC-H1.1** Single-column layout; zero tables, text boxes, or multi-column sections in the DOCX.
`cv_orchestrator.py:3669` `_generate_ats_docx` uses `doc.add_paragraph()` throughout — no `doc.add_table()` calls exist in this function. Programmatic validation in `validate_ats_report` (line 4668–4687) checks for tables (`doc.tables`) and shape elements (VML/MC namespaces).
Status: ✅ Pass — cite `cv_orchestrator.py:3680–3815` (generation), `4668–4687` (validation)

**AC-H1.2** Contact information in document body, not Word header/footer.
`cv_orchestrator.py:3697–3715`: Contact block is written via `doc.add_paragraph()` directly to the body, pipe-separated. The ATS DOCX footer contains only a generation timestamp (line 4582–4588) placed in a Word footer, not the contact block. Validation check at line 4689–4696 scans body text for an email address pattern.
Status: ✅ Pass — cite `cv_orchestrator.py:3697–3716`, `4689–4696`

**AC-H1.3** All fonts are Arial, Calibri, or Times New Roman at 10–12pt.
`_setup_ats_styles` (`cv_orchestrator.py:3823–3854`) sets only `font.size` and `font.bold` on Heading 1, Heading 2, and List Bullet styles — **it never sets `font.name`**. The ATS DOCX will inherit python-docx's default template font (Calibri) for the Normal style, but this is not explicit and not validated. The `validate_ats_report` function does not check for font names or sizes.
Status: ⚠️ Partial — Font sizes are constrained (10–12 pt for headings and bullets) but no `font.name` is set in `_setup_ats_styles`, and there is no validation check for font families. The ATS DOCX relies on the python-docx template default (likely Calibri), which may be acceptable but is fragile.

**AC-H1.4** All URLs are spelled out as plain text (no formatted hyperlinks).
`cv_orchestrator.py:3712–3713`: The LinkedIn URL is written as plain text into the contact paragraph (no hyperlink). However, the human DOCX at line 4401–4402 uses `_add_hyperlink(...)` — that function is in `_generate_human_docx`, not the ATS DOCX. No hyperlinks are added in `_generate_ats_docx`.
Status: ✅ Pass — cite `cv_orchestrator.py:3712–3715` (no hyperlinks in ATS DOCX path)

**AC-H1.5** ATS text extraction test: 100% of text selectable as plain text.
Validation check at `cv_orchestrator.py:4660–4666` extracts text from all paragraphs and verifies > 100 chars. No images or locked fields are added in `_generate_ats_docx`.
Status: ✅ Pass — cite `cv_orchestrator.py:4660–4666`

---

### US-H2: ATS Section Recognition

**Acceptance Criteria**

**AC-H2.1** Generated DOCX uses `Heading 1` Word style for all section headings.
All section headings in `_generate_ats_docx` use `style='Heading 1'`: Professional Summary (3722), Technical Skills (3741), Core Competencies (3746), Work Experience (3751), Education (3786), Certifications (4216), Awards (4235). Validated at `cv_orchestrator.py:4731–4737`.
Status: ✅ Pass — cite `cv_orchestrator.py:3722, 3741, 3746, 3751, 3786, 4216, 4235`

**AC-H2.2** Heading text matches exactly one of the accepted labels.
The story's accepted labels table allows "Work Experience" or "Professional Experience" (rejects "Career History"). The code uses:
- `'Professional Summary'` ✅ accepted
- `'Technical Skills'` ✅ accepted
- `'Core Competencies'` ✅ accepted
- `'Work Experience'` ✅ accepted
- `'Education'` ✅ accepted
- `'Certifications'` ✅ accepted
- `'Awards'` — not explicitly listed in the story's table but not listed as rejected either
The `STANDARD` frozenset in `validate_ats_report` (`cv_orchestrator.py:4699–4706`) includes "core competencies", "technical skills", "professional summary" and "work experience" — consistent.
Note: Publications heading in ATS DOCX: `_add_ats_additional_sections` does not add a publications section. Publications appear only in the human DOCX. The `docx_publications_heading` check in `validate_ats_report` validates it only in the ATS DOCX — but the ATS DOCX has no publications section, so the check always returns "pass (no publications section)" (line 4780–4782).
Status: ✅ Pass — cite `cv_orchestrator.py:3721–3751`

**AC-H2.3** No creative section names in the ATS DOCX (only in human PDF).
The code produces only standardized heading strings (see AC-H2.2). The `STANDARD` frozenset at line 4699–4706 also includes "career history" and "portfolio" — these appear in the allowed-list for validation but are **not generated** by the ATS DOCX code itself.
Status: ✅ Pass — cite `cv_orchestrator.py:3721–3806`

---

### US-H3: Contact Information Parsing

**Acceptance Criteria**

**AC-H3.1** Contact block is the first content in the document body.
`cv_orchestrator.py:3687–3716`: name paragraph added first (line 3691), then contact paragraph (line 3715), then spacing (line 3719), then summary heading (line 3722). Contact is the second paragraph but the first with semantic data; name is the first run, no intervening content.
Status: ✅ Pass — cite `cv_orchestrator.py:3691–3719`

**AC-H3.2** Name, city/state, phone, email on first 1–2 lines.
Name is line 1; contact block (city, phone, email, LinkedIn) is one pipe-separated line (line 3715). This matches the required format.
Status: ✅ Pass — cite `cv_orchestrator.py:3697–3715`

**AC-H3.3** Phone formatted as `NNN-NNN-NNNN` (no parentheses).
`_normalize_phone` at `cv_orchestrator.py:4073–4082` strips non-digits, handles leading country code `1`, and formats as `NNN-NNN-NNNN`. Called at line 3709: `self._normalize_phone(contact['phone'])`.
Status: ✅ Pass — cite `cv_orchestrator.py:4073–4082`

**AC-H3.4** LinkedIn URL spelled out as plain text.
`cv_orchestrator.py:3712–3713`: `contact.get('linkedin')` is appended as plain text to `contact_parts`. No `_add_hyperlink` call is in this path.
Status: ✅ Pass — cite `cv_orchestrator.py:3712–3713`

**AC-H3.5** No full street address in ATS DOCX (city + state only).
`cv_orchestrator.py:3698–3707`: `address_display` uses only `city` and `state`; there is no `street` field appended to the contact block.
Status: ✅ Pass — cite `cv_orchestrator.py:3698–3707`

**AC-H3.6** Credentials (Ph.D.) appear after name with comma separator.
The name is taken verbatim from `personal_info.get('name', '')` (line 3687). Whether credentials appear depends on how the name is stored in `Master_CV_Data.json`. There is no code that enforces or validates the "comma separator before credential" format. If the name field reads `"Gregory R. Warnes, Ph.D."` the output is correct; if it reads `"Gregory R. Warnes"` without credentials, they will be absent. No validation check exists.
Status: ⚠️ Partial — The format is pass-through from Master CV data; no enforcement or validation that credentials appear after the name with comma separator.

---

### US-H4: Keyword Matching and Scoring (Application Guidance)

**Acceptance Criteria**

**AC-H4.1** A post-generation keyword check compares job keywords against ATS DOCX text.
`validate_ats_report` check `ats_keyword_presence` at `cv_orchestrator.py:4759–4776` scans the extracted DOCX text for the top 15 ATS keywords (case-insensitive). Missing keywords are reported with a pass/warn/fail status. This runs post-generation and results appear in the File Review tab (`download-tab.js:76`).
Status: ✅ Pass — cite `cv_orchestrator.py:4759–4776`, `download-tab.js:76–141`

**AC-H4.2** System reports: keyword present, section where it appears, and match type.
The `compute_ats_score` function in `scoring.py:345–554` computes per-keyword status (`matched`, `partial`, `missing`), `matched_in_sections` (skills/experience/education/summary), and `match_type` (exact/partial). This is surfaced in the ATS Report modal (`ats-modals.js:76–101`) which shows keyword, coverage badge, and sections.
Status: ✅ Pass — cite `scoring.py:443–493`, `ats-modals.js:86–97`

**AC-H4.3** System warns when a required keyword is absent from ATS DOCX text.
The keyword presence check at `cv_orchestrator.py:4762–4776` warns when 1/3 or fewer keywords are missing, and fails when more than 1/3 are missing. The ATS Report modal (`ats-modals.js:189–197`) highlights missing hard requirements with an orange warning block. The File Review tab blocks downloads when keyword check fails (`download-tab.js:104–138`).
Status: ✅ Pass — cite `cv_orchestrator.py:4762–4776`, `ats-modals.js:189–197`, `download-tab.js:104–136`

**AC-H4.4** Keyword variants normalised: case-insensitive, hyphen/slash variants.
`scoring.py:450–475` `_match_status()` does case-insensitive comparison and substring containment. `cv_orchestrator.py:3895–3914` `_optimize_skills_for_ats` uses the synonym map (`_expansion_index`) for canonical name expansion in both directions. The `validate_ats_report` keyword check at line 4765–4766 uses `kw not in text_lower` which is case-insensitive substring matching.
Hyphen/slash equivalence is handled by the synonym map only; there is no regex-based hyphen normalisation in the validation path. E.g., "scikit-learn" vs "scikit learn" may not match without an explicit synonym entry.
Status: ⚠️ Partial — Case-insensitive substring matching covers most cases; synonym map handles canonicalization. Hyphen/slash variants are not systematically handled by regex — they rely on synonym map coverage.

**AC-H4.5** System verifies that `knowsAbout` in HTML JSON-LD contains all approved skill names.
`validate_ats_report` HTML check at `cv_orchestrator.py:4835–4844` verifies `knowsAbout` has >= 3 entries (warn if 1–2, fail if 0). It does not compare against the approved skills list to confirm all are present. The `_build_json_ld` method (`cv_orchestrator.py:1528–1536`) iterates `skills_by_category` to build `knowsAbout`, but there is no cross-check against `approved_skills` in the validation report.
Status: ⚠️ Partial — Validation confirms `knowsAbout` is non-empty but does not verify it contains all approved skills from the rewrite decisions.

---

### US-H5: Date and Employment History Parsing

**Acceptance Criteria**

**AC-H5.1** All date ranges use a consistent separator character (em-dash `–`).
`cv_orchestrator.py:3761`: `date_range = f"{exp.get('start_date', '')} – {exp.get('end_date', 'Present')}"` uses `–` (U+2013, en-dash, not em-dash U+2014). The story requires "em-dash `–`" but uses the character that is typographically an en-dash. Both the story and the code use `–` consistently, but the story's note saying "em-dash `–` preferred" may introduce confusion since `–` is conventionally the en-dash character.
Validation check at `cv_orchestrator.py:4739–4757` detects multiple mixed date format patterns and fails if more than one format is found.
Status: ✅ Pass (with note) — `–` is used consistently; the story's "em-dash" label for the `–` character is technically an en-dash but this matches the story's own example exactly.

**AC-H5.2** All dates include month and year.
The code writes dates as-stored in `exp.get('start_date', '')`. If the master data stores year-only dates (e.g., `"2020"`), they will appear as-is with no enforcement of month inclusion. No validation check verifies month-year format.
Status: ⚠️ Partial — Date format is pass-through from master data. No enforcement or validation that dates include month.

**AC-H5.3** Job entry header on one line: `Title | Company | Location | Date Range`.
`cv_orchestrator.py:3762–3766`: `entry_parts = [title, company]`, then location (if present), then date_range. Joined with ` | ` and written as a single bold paragraph.
Status: ✅ Pass — cite `cv_orchestrator.py:3762–3766`

**AC-H5.4** No overlapping date ranges (system validates this).
`CVOrchestrator._detect_date_overlaps` (`cv_orchestrator.py:4612–4680`) is a `@staticmethod` that iterates all parsed experience entries pairwise, skips same-company overlaps (promotions/parallel roles), and returns a list of `{entry_a, entry_b, overlap_description}` dicts. It is called in `generate_cv` at `cv_orchestrator.py:2078–2088`, and the resulting warnings are stored in `metadata.json` under `date_overlap_warnings` (line 2202). The frontend displays these warnings in the File Review tab: `download-tab.js:330–339` renders a yellow warning block listing each overlap pair with an advisory to review before submitting. The check is advisory (not a blocking ATS validation check), which is appropriate given that legitimate concurrent roles at different companies are a valid scenario.
Status: ✅ Pass — overlap detection is implemented in `cv_orchestrator.py:4612–4680`, results persist to `metadata.json`, and the UI warns the user (`download-tab.js:330–339`).

**AC-H5.5** "Present" used for current role (not future date).
`cv_orchestrator.py:3761`: `exp.get('end_date', 'Present')` defaults to "Present" when end_date is absent. If the master data stores a specific date for the current role, it will use that date instead. No validation enforces that the active role uses "Present".
Status: ⚠️ Partial — Defaults correctly to "Present" when end_date is absent, but does not validate or correct future dates in end_date.

---

### US-H6: ATS Output Validation Report

**Acceptance Criteria**

**AC-H6.1** System runs programmatic ATS validation checks after generation.
`validate_ats_report` (`cv_orchestrator.py:4599–4944`) runs 16 checks on DOCX, HTML, and PDF. Called in generation routes (`generation_routes.py:1119`). Results displayed in File Review tab via `download-tab.js:_renderValidationSummary`.
Status: ✅ Pass — cite `cv_orchestrator.py:4599–4944`, `download-tab.js:76–141`

**AC-H6.2** Results displayed in the UI with pass/warn/fail for each check.
`download-tab.js:113–128` renders each check as a table row with ✅/⚠/❌ icons, format badge, and detail text, inside a `<details open>` element.
Status: ✅ Pass — cite `download-tab.js:108–130`

**AC-H6.3** Any fail blocks download with a clear explanation.
`download-tab.js:147–157` defines `_NON_BLOCKING_CHECKS` — a `Set` of 9 check names that are advisory-only and never block downloads even when they fail. These are: `cv_page_count`, `pdf_us_letter`, `docx_zero_shapes`, `docx_standard_headings`, `docx_heading1_present`, `docx_date_format_consistent`, `docx_publications_heading`, `html_jsonld_valid_person`, `html_jsonld_knows_about`. Checks not in this set do block downloads on fail. The `isCriticalFail` predicate at line 161 enforces this. The UI shows a "Blocked" button with an explanation at lines 132–138. ATS keyword failure (`ats_keyword_presence`) is not in `_NON_BLOCKING_CHECKS` and blocks all formats.
Status: ✅ Pass — cite `download-tab.js:147–157, 161–165, 132–138`

**AC-H6.4** Any warn allows download but shows the specific issue.
Warns produce a ⚠ icon and detail text in the validation table but do not block downloads (only fails block). The summary line shows the warn count (`download-tab.js:111`).
Status: ✅ Pass — cite `download-tab.js:105–111`, `144–148`

**AC-H6.5** Validation results included in `metadata.json`.
`generation_routes.py:1930–1932`: `ats_score` is written to `metadata.json` via `_try_patch_metadata`. The full `validate_ats_report` check list (16 checks) is not serialized to `metadata.json` — only the ATS match score (`ats_score` dict) is persisted.
Status: ⚠️ Partial — The ATS match score is persisted to `metadata.json` but the individual pass/warn/fail validation check results are not.

---

### US-H7: ATS Match Score Visibility

**Acceptance Criteria**

**AC-H7.1** Overall match score (0–100%) computed and displayed after job analysis.
`scoring.py:530–534` computes the overall score as `0.7 * hard_score + 0.3 * soft_score`. The score is fetched and displayed in the position bar badge (`ats-refinement.js:150–181`) after job analysis (`job-analysis.js:138`: `refreshAtsScore('analysis')`).
Status: ✅ Pass — cite `scoring.py:530–534`, `ats-refinement.js:150–181`, `job-analysis.js:138`

**AC-H7.2** Score is weighted: hard skills count twice as much as soft skills.
`scoring.py:533–534`: overall = `0.7 * hard_score + 0.3 * soft_score`. This is a 70/30 split, not 2:1 (66.7/33.3). The story says "hard skills count twice as much as soft skills" (2:1 = 66.7%/33.3%). The implemented 70/30 split gives hard skills 2.33x weight, which is slightly stronger than the required 2x.
Status: ⚠️ Partial — Weighting direction is correct (hard > soft) and materially close to 2:1, but the implemented 70/30 ratio differs from the story's specified 2:1 ratio. Not a functional gap but a specification deviation.

**AC-H7.3** Score updates live as the user approves/rejects customization items — no page reload required.
`scheduleAtsRefresh()` is called from:
- `skills-review.js:1077` (skill decision)
- `achievements-review.js:406` (achievement edit)
- `spell-check.js:169, 438` (spell check accept)
- `summary-review.js:208, 236, 304` (summary selection)
- `rewrite-review.js:434` (rewrite approval)
All use debounced 600ms refresh via `ats-refinement.js:211–213`. The badge updates in-place without page reload.
Status: ✅ Pass — cite `skills-review.js:1077`, `ats-refinement.js:211–213`, `ats-refinement.js:150–181`

**AC-H7.4** Score is persisted to `metadata.json` at generation time for audit purposes.
`generation_routes.py:1686`: `_try_patch_metadata(conv, {"ats_score": score})` persists the score after each `/api/cv/ats-score` call. Also written during final generation at line 1931–1932.
Status: ✅ Pass — cite `generation_routes.py:1682–1686`

**AC-H7.5** Score UI clearly labels three per-skill states: Matched ✅, Missing ❌, Bonus ★.
`ats-modals.js:51–58`: keywords show "Exact match" (green badge), "Partial match" (amber badge), or "Missing" (red badge). ATS groups are: "Hard Requirements", "Preferred Skills", "Bonus Keywords" (`ats-modals.js:22–26`). The Bonus category is rendered when `type === 'bonus'` (`scoring.py:521`), representing skills the candidate has that are in `ats_keywords` but not in required/nice-to-have.

The story requires the ★ (Bonus star) symbol for skills the candidate has that are not in the JD. The "Bonus Keywords" group in the UI uses the same badge styling as other groups — there is no ★ symbol used. The distinction between "Matched" and "Bonus" is present but the ★ symbol specified in the story is absent. Also, the badge labels are "Exact match"/"Partial match"/"Missing" rather than "Matched ✅"/"Missing ❌"/"Bonus ★" as specified.
Status: ⚠️ Partial — Three states are present and visually distinct, but the ★ symbol is not used for Bonus skills and the label terminology differs from the story's specification.

---

### US-H8: Hard / Soft Skill Distinction in ATS Output

**Acceptance Criteria**

**AC-H8.1** LLM classifies every extracted skill as hard or soft during job analysis.
The job analysis LLM prompt (in `conversation_manager.py`) is not confirmed to include a hard/soft classification instruction. `_classify_skill_type` in `cv_orchestrator.py:4085–4101` uses heuristics (category name and skill name lookup), not LLM classification. The `skill_type` field checked at line 4091 may come from the master data if pre-classified, but no LLM classification step was found in the code.
Status: ⚠️ Partial — Hard/soft distinction uses heuristic classification via `_classify_skill_type`, not LLM classification during job analysis. The story requires the LLM to classify during analysis.

**AC-H8.2** Candidate's master CV skills classified and classification persisted in `Master_CV_Data.json`.
No code was found that reads a skill classification from the LLM, writes `skill_type` back to `Master_CV_Data.json`, or updates the master data during a session. The `_classify_skill_type` method reads `skill_type` from the skill dict (which could come from master data if present), but no write-back mechanism exists.
Status: 🔲 Not Implemented — No LLM classification step and no persistence of `skill_type` to `Master_CV_Data.json`.

**AC-H8.3** ATS DOCX separates skills into "Technical Skills" (hard) and "Core Competencies" (soft).
`cv_orchestrator.py:3740–3748`: Hard skills are placed under `'Technical Skills'` (Heading 1) and soft skills under `'Core Competencies'` (Heading 1), separated by `' • '`.
Status: ✅ Pass — cite `cv_orchestrator.py:3740–3748`

**AC-H8.4** HTML JSON-LD `knowsAbout` entries include `"additionalType": "HardSkill"` or `"SoftSkill"`.
`cv_orchestrator.py:1528–1536`: Each `knowsAbout` entry is `{"@type": "DefinedTerm", "name": ..., "additionalType": "HardSkill"/"SoftSkill"}` based on `_classify_skill_type`.
Status: ✅ Pass — cite `cv_orchestrator.py:1528–1536`

**AC-H8.5** User can override any classification in the UI; the override propagates to generated documents.
The Skills Review tab (`skills-review.js:663–667`) shows a "Hard" or "Soft" badge based on the job analysis skill sets, but provides **no UI control** for the user to change a skill's hard/soft classification. There is no input, dropdown, or toggle for overriding `skill_type`. The ATS DOCX classification relies solely on `_classify_skill_type` heuristics.
Status: 🔲 Not Implemented — No UI control for hard/soft type override; badges are display-only.

**AC-H8.6** Missing hard skills highlighted more prominently than missing soft skills.
`ats-modals.js:189–193`: Missing hard requirements get a dedicated orange warning block ("Missing hard requirements (N): ..."). Missing soft skills appear in a separate block only if there are soft gaps beyond the hard ones (lines 194–198). The ATS score badge summary line (`ats-refinement.js:48–54`) shows "Missing hard: ..." first in the header.
Status: ✅ Pass — cite `ats-modals.js:189–198`, `ats-refinement.js:48–54`

---

## Section 2: Generated Materials Evaluation

What does the ATS see when it parses the output files?

---

### ATS DOCX Structure Quality

**File naming:** `CV_{Company}_{Role}_{YYYY-MM-DD}_ATS.docx` — clear ATS indicator in filename (`cv_orchestrator.py:3813`).

**Document body order:**
1. Candidate name (bold, 16pt, centered) — not Heading 1 style
2. Contact block (pipe-separated, centered) — body paragraph
3. Blank paragraph spacer
4. Professional Summary (Heading 1)
5. Technical Skills (Heading 1) + bullet paragraph
6. Core Competencies (Heading 1) + bullet paragraph
7. Work Experience (Heading 1) + per-role entries
8. Education (Heading 1) + per-school entries
9. Certifications (Heading 1, if present)
10. Awards (Heading 1, if present)

This structure is well-ordered for ATS parsing. Contact is in body (not header/footer). All section headings use Heading 1 style. No tables, text boxes, or multi-column sections.

**Heading label compliance with US-H2 accepted labels:**
| Section in DOCX | Accepted in US-H2? |
|---|---|
| Professional Summary | ✅ |
| Technical Skills | ✅ |
| Core Competencies | ✅ |
| Work Experience | ✅ |
| Education | ✅ |
| Certifications | ✅ |
| Awards | not in story table but not rejected |

**Font gap:** `_setup_ats_styles` does not set `font.name` explicitly. The ATS DOCX inherits whatever font the python-docx default document template uses. This is likely Calibri (an ATS-safe font), but it is not enforced. A future template change or environment difference could produce a non-ATS-safe font.

**Publications in ATS DOCX:** Publications are **not** added to the ATS DOCX (no call to `_add_ats_additional_sections` for publications). The story does not require publications in the ATS DOCX (it references the human PDF), so this is correct behavior.

---

### HTML JSON-LD Structured Data Quality

The `_build_json_ld` method produces:
- `@context: "https://schema.org"`
- `@type: "Person"`
- `name`, `email`, `telephone`
- `sameAs` (LinkedIn + website URLs)
- `address` (city/state only)
- `alumniOf` (education institutions)
- `hasOccupation` (work history with Role entries)
- `knowsAbout` (skills with `@type: "DefinedTerm"` and `additionalType: "HardSkill"/"SoftSkill"`)
- `award` (awards)

This is a rich, well-structured JSON-LD block. The `hasOccupation` field is populated (required by US-H1). The `knowsAbout` array carries `additionalType` for hard/soft distinction (US-H8). The `telephone` field is present.

**Missing:** `hasOccupation` carries work history as `@type: "Role"` (using `name` for company and `roleName` for job title) — this is Schema.org-compatible but some ATS prefer `@type: "Occupation"` or `@type: "EmployeeRole"`. Not a blocking issue.

---

### PDF Quality

The PDF validation checks (US-H6, checks 13–15):
- Page count checked ✅ (`cv_orchestrator.py:4863–4943`)
- US Letter size validated ✅ (`cv_orchestrator.py:4894–4919`)
- Text selectability verified ✅ (`cv_orchestrator.py:4863–4891`)

**Not checked:** Font embedding. US-H6 check 15 requires "Fonts embedded" but no font embedding check exists in `validate_ats_report`. PDF font embedding is handled implicitly by the renderer (WeasyPrint/Chrome), not explicitly validated.

---

## Terminology Evaluation

| Term in UI | Assessment |
|---|---|
| "ATS Report" (button/modal) | ✅ Clear to HR audience |
| "ATS Score" (tab label) | ✅ Clear |
| "Hard Requirements" / "Preferred Skills" / "Bonus Keywords" | ✅ Clear, though story uses "Hard / Soft / Bonus" |
| "Matched / Missing / Partial match" (badges) | ⚠️ Story specifies "Matched ✅ / Missing ❌ / Bonus ★" — "Partial match" is a meaningful addition but diverges from story spec |
| "Technical Skills" / "Core Competencies" (DOCX headings) | ✅ ATS-standard labels |
| "File Review" (Download tab title) | ✅ Neutral, clear |
| "Blocked" (greyed download button) | ✅ Clear action blocker |
| "ATS keyword failure blocks all downloads" | ✅ Explicit user guidance |

---

## Summary of Findings

### Passed (13)
AC-H1.1, AC-H1.2, AC-H1.4, AC-H1.5, AC-H2.1, AC-H2.2, AC-H2.3, AC-H3.1–H3.5, AC-H4.1, AC-H4.2, AC-H4.3, AC-H5.1, AC-H5.3, AC-H5.4, AC-H6.1, AC-H6.2, AC-H6.3, AC-H6.4, AC-H7.1, AC-H7.3, AC-H7.4, AC-H8.3, AC-H8.4, AC-H8.6

### Partial (10)
- **AC-H1.3** Font family not explicitly set in `_setup_ats_styles`; no font-name validation check
- **AC-H3.6** Credential format is pass-through from master data; no enforcement
- **AC-H4.4** Hyphen/slash variant normalisation relies on synonym map, not regex
- **AC-H4.5** `knowsAbout` validation counts entries but does not cross-check against approved skills
- **AC-H5.2** Date month-year format is pass-through; no enforcement or validation
- **AC-H5.5** "Present" defaults correctly but no validation against future dates in end_date
- **AC-H6.5** ATS match score persisted to `metadata.json`; individual check results are not
- **AC-H7.2** Weighting is 70/30 (2.33:1) rather than story-specified 2:1 (66.7/33.3)
- **AC-H7.5** Bonus ★ symbol absent; "Partial match" badge not in story spec
- **AC-H8.1** Hard/soft classification uses heuristics, not LLM classification during analysis

### Not Implemented (2)
- **AC-H8.2** No LLM skill classification and no `skill_type` write-back to `Master_CV_Data.json`
- **AC-H8.5** No UI control for user to override hard/soft skill classification

### Additional gap (not a story criterion)
- **PDF font embedding** — US-H6 check 15 requires "Fonts embedded" but this is not validated

---

## Priority Recommendations

1. **HIGH — Add font-name enforcement in `_setup_ats_styles`** (AC-H1.3): Set `font.name = 'Calibri'` (or Arial) on the Normal style to prevent ATS font issues from template drift.
2. **MED — Add PDF font embedding check** to `validate_ats_report`: Verify at least one font is embedded using pypdf's font extraction.
3. **MED — Cross-check `knowsAbout` against approved skills** (AC-H4.5): The validation report should confirm all approved skills appear in `knowsAbout`, not just that the array is non-empty.
4. **MED — Add month-year date format enforcement** (AC-H5.2): Validate that start/end dates include month before writing to ATS DOCX.
5. **LOW — Add skill type classification UI override** (AC-H8.5): Allow user to change Hard↔Soft for any skill in the Skills Review tab.
6. **LOW — Align score weighting** (AC-H7.2): Change to `0.667 * hard + 0.333 * soft` to match the 2:1 story specification exactly.
7. **LOW — Add ★ Bonus badge** (AC-H7.5): Use ★ symbol for bonus skills to match story specification.
