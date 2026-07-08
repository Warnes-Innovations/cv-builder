<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Hr-Ats Review Status

**Last Updated:** 2026-07-07 20:16 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### US-H1: ATS File Ingestion

| # | Criterion (abbreviated) | Status | Notes / File:Line refs |
|---|--------------------------|--------|------------------------|
| 1 | Single-column layout; zero tables/text boxes/multi-column | ✅ | `scripts/utils/cv_orchestrator.py:4340-4502` (`_generate_ats_docx`) never creates a `docx.table.Table`, VML shape, or a multi-column `sectPr`; no `w:cols` / section-column code exists anywhere in the file (grep confirmed empty). Runtime check `docx_zero_tables` / `docx_zero_shapes` at `cv_orchestrator.py:5896-5915`. |
| 2 | Contact info in body (first paragraph), not header/footer | ✅ | `_generate_ats_docx` never touches `doc.sections[*].header/footer` (grep confirmed the only `.header`/`.footer` calls in the file are in `_generate_human_docx` at `cv_orchestrator.py:5492-5501`, the *human* DOCX). Name is paragraph 1, contact line is paragraph 2 (`cv_orchestrator.py:4365-4390`). |
| 3 | Fonts Arial/Calibri/Times New Roman, 10-12pt | ✅ | `_setup_ats_styles` (`cv_orchestrator.py:4504-4546`) forces Calibri for `Normal`, `Heading 1/2`, `List Bullet` at 10-12pt. Runtime check `docx_ats_safe_fonts` at `cv_orchestrator.py:6112-6141`. Minor: candidate-name run is `Pt(16)` (`cv_orchestrator.py:4368`), outside 10-12pt, but this is the name line, not body text — not flagged as a defect. |
| 4 | URLs spelled out as plain text, no hyperlinks | ✅ | `_add_hyperlink` (`cv_orchestrator.py:5304-5310`) is only invoked from `_generate_human_docx` (`cv_orchestrator.py:5482`) for publication citations. `_generate_ats_docx`'s contact line (`cv_orchestrator.py:4386-4389`) appends `contact['linkedin']` as a plain string via `doc.add_paragraph`, never via `add_hyperlink`. |
| 5 | 100% text selectable/copyable | ✅ | Runtime check `docx_text_selectable` at `cv_orchestrator.py:5888-5894` (extracts `doc.paragraphs` text, requires >100 chars). |

**Additional finding (US-H1-adjacent):** The `docx_contact_in_body` check (`cv_orchestrator.py:5917-5924`) only verifies an email regex is found *somewhere* in body text — it does not verify the email/phone are in the *first* paragraph as the AC specifies. In practice generation always puts contact info first, so this is a validation-coverage gap, not a functional failure.

### US-H2: ATS Section Recognition

| # | Criterion (abbreviated) | Status | Notes / File:Line refs |
|---|--------------------------|--------|------------------------|
| 1 | All section headings use Heading 1 Word style | ✅ | Every section (`Professional Summary`, `Technical Skills`, `Core Competencies`, `Work Experience`, `Education`, `Certifications`, `Awards`, `Publications`/`Selected Publications`) is added via `doc.add_paragraph(text, style='Heading 1')` — `cv_orchestrator.py:4396, 4417, 4422, 4427, 4462, 5100, 5119, 5147`. |
| 2 | Heading text matches an accepted label exactly | ⚠ Partial | Summary/Experience/Education/Skills/Publications/Certifications headings all match the story's accepted-label table exactly. **Contact is the exception**: the ATS DOCX never emits a "Contact Information" (or any) heading for the contact block — it is just a bold name paragraph followed by a plain contact-pipe paragraph (`cv_orchestrator.py:4360-4390`). This is literally the story's own **rejected** pattern: "Name-only block with no label" (`tasks/user-story-hr-ats.md:72`). |
| 3 | No creative section names in ATS DOCX | ✅ | Runtime check `docx_standard_headings` (`cv_orchestrator.py:5926-5957`) validates every `Heading` paragraph against a `STANDARD` allow-list; unexpected headings surface as a `warn`. |

### US-H3: Contact Information Parsing

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Contact block first in body | ✅ | `cv_orchestrator.py:4365-4390` — name then contact line are the first two paragraphs added. |
| 2 | Name, city/state, phone, email on first 1-2 lines | ✅ | Same lines; order is city/state → phone → email → linkedin, joined with `' | '` (`cv_orchestrator.py:4374-4389`), matching the story's example format exactly. |
| 3 | Phone as `585-678-6661` (no parens) | ✅ | `_normalize_phone` (`cv_orchestrator.py:4773-4783`) strips all non-digits and reformats to `NNN-NNN-NNNN`. |
| 4 | LinkedIn as plain text | ✅ | See US-H1 #4 above — no hyperlink relationship created in the ATS DOCX. |
| 5 | No full street address, city+state only | ✅ | Contact block only ever uses `contact['address_display']` or `city, state` (`cv_orchestrator.py:4376-4381`); no street-address field is read. |
| 6 | Credentials (Ph.D.) after name, comma-separated | 🔲 Not Implemented | No dedicated `credentials`/`suffix` field exists anywhere (`MASTER_CV_DATA_SPECIFICATION.md`, `schemas/master_cv_data.schema.json`, `master_data_validator.py` all grep-empty for `credential`/`suffix`/`honorific`). The candidate's `name` is a single free-text string (`personal.get('name', '')`, `cv_orchestrator.py:4361`) — any "Ph.D." suffix depends entirely on how the user typed it into Master CV data; there is no app-level enforcement or template for the comma-separated pattern the story requires. |

### US-H4: Keyword Matching and Scoring

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Post-generation keyword check vs ATS DOCX text | ✅ | `ats_keyword_presence` check, two-tier (required vs. supplemental) — `cv_orchestrator.py:6001-6057`. |
| 2 | Reports keyword present + section + match type | ⚠ Partial | The DOCX-level check reports pass/warn/fail and *which keywords* are missing (`cv_orchestrator.py:6044-6057`) but not a per-keyword "section where it appears" breakdown at the DOCX-validation layer. The **section-level breakdown does exist**, but only in the separate live ATS-score pipeline (`scripts/utils/scoring.py:379-522`, `_match_status` returns `matched_in_sections`), surfaced in `web/ats-modals.js:107-140`. So the capability exists, but split across two different scoring systems rather than one unified report (see cross-cutting finding below). |
| 3 | Warns when required keyword absent from ATS DOCX | ✅ | `cv_orchestrator.py:6044-6057`, tiered by required vs. optional. |
| 4 | Keyword variants normalised (case, hyphen/slash) | ✅ | `_kw_in_text` helper (`cv_orchestrator.py:6010-6026`) does case-insensitive matching plus hyphen/slash normalisation; mirrored in `scripts/utils/scoring.py:467-522` for the live score. |
| 5 | `knowsAbout` verified against approved rewrite decisions | ⚠ Partial | `html_jsonld_knows_about` check (`cv_orchestrator.py:6185-6194`) only verifies `knowsAbout` is non-empty (≥3 entries = pass), not that it contains every *approved* skill from the rewrite/customization decisions. No cross-check against `customizations['approved_skills']` was found in `validate_ats_report`. |

### US-H5: Date and Employment History Parsing

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Consistent separator (em-dash `–`) | ✅ | `date_range = f"{start} – {end}"` hardcodes en-dash `–` (`cv_orchestrator.py:4437`); runtime check `docx_date_format_consistent` (`cv_orchestrator.py:5981-5999`) flags mixed formats. |
| 2 | All dates include month + year | ✅ | Runtime check `docx_year_only_dates` (`cv_orchestrator.py:6083-6093`) warns on year-only entries via regex. |
| 3 | One-line `Title \| Company \| Location \| Date Range` | ✅ | `cv_orchestrator.py:4429-4447` builds exactly this pipe-joined single line. |
| 4 | No overlapping date ranges (system validates) | ✅ | `_detect_date_overlaps` (`cv_orchestrator.py:5676-5738`) parses dates, treats same-company entries as promotions (excluded), flags true overlaps; surfaced in UI at `web/download-tab.js:496-505`. |
| 5 | "Present" used, not future dates | ⚠ Partial | Default end-date label is `'Present'` (`cv_orchestrator.py:4437`), but there is **no explicit check rejecting/warning on a future end date** typed directly into Master CV data (grep for "future" in `cv_orchestrator.py` returns no relevant validation). Not a formal AC failure (future-date checking is only in the "Failure Modes" table, not the AC list) but worth a follow-up story item. |

### US-H6: ATS Output Validation Report

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Programmatic ATS validation after generation | ✅ | `validate_ats_report()` (`cv_orchestrator.py:5827` onward) runs 17+ checks across DOCX/HTML/PDF, invoked at `cv_orchestrator.py:2249` right after final files are written. |
| 2 | Pass/warn/fail displayed in UI | ❌ | **Reproduced, confirmed bug.** `web/download-tab.js:259` references `blockingFails` inside `_renderDownloadGrid()`, but that variable is only declared in the *sibling* function `_renderValidationSummary()` (`download-tab.js:110`) — it does not exist in `_renderDownloadGrid`'s scope. Any time the File Review tab renders with ≥1 generated file (the normal case), `_renderDownloadGrid` throws `ReferenceError: blockingFails is not defined` **before** `content.innerHTML` is ever assigned (the assignment happens at `download-tab.js:517`/`529`, both *after* the throwing call at `download-tab.js:509`). The call site, `review-table-base.js:412` (`await populateDownloadTab(tabData.cv);`), has no surrounding try/catch, so the whole tab silently gets stuck on the "Running ATS validation…" placeholder text set at `download-tab.js:387`. **The same bug is present in the shipped `web/bundle.js:16951`** (the sibling variable got renamed to `blockingFails2` by the bundler at `bundle.js:16833`, but the stray reference at line 16951 was left unrenamed), so this is a live production defect, not a stale-source artifact. Reproduced with a minimal Node harness invoking `populateDownloadTab()` with one ATS-fail check and files present — confirmed `ReferenceError: blockingFails is not defined` at `download-tab.js:259:3`. |
| 3 | Any fail blocks download with explanation | ⚠ Partial | The *intended* logic (`download-tab.js:190-263`) correctly computes `blockDocx`/`blockHtml`/`blockPdf` per format and renders a "Blocked" disabled button with explanation text — but it never runs because of the crash in finding #2 above. Once patched, this logic looks correct. |
| 4 | Any warn allows download, shows issue | ⚠ Partial | Same as above — logic present (`_NON_BLOCKING_CHECKS` set, `download-tab.js:178-188`) but unreachable due to the crash. |
| 5 | Validation results in `metadata.json` | ✅ | `metadata['ats_validation'] = {checks, page_count, summary}` written at `cv_orchestrator.py:2278-2286`. |

### US-H7: ATS Match Score Visibility

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Overall score 0-100% after job analysis | ✅ | `compute_ats_score()` (`scripts/utils/scoring.py:345-595`), invoked via `/api/cv/ats-score` (`scripts/routes/generation_routes.py:1796-1899`). |
| 2 | Weighted: hard counts 2x soft | ✅ | `overall = round((2 * hard_score + soft_score) / 3, 1)` — `scripts/utils/scoring.py:574-575`. |
| 3 | Live update on approve/reject, no reload | ✅ | `scheduleAtsRefresh()` called from `achievements-review.js`, `experience-review.js`, `layout-instruction.js`, `rewrite-review.js`, `skills-review.js`, `spell-check.js`, `summary-review.js` (grep-confirmed); debounced 600ms (`web/ats-refinement.js:259-264`); badge updated via `updateAtsBadge()` without page reload. |
| 4 | Persisted to `metadata.json` for audit | ⚠ Partial | Two different scorers coexist and both write to `metadata['ats_score']` at different times with **incompatible shapes**: (a) at initial generation, `metadata['ats_score'] = ats_score_at_generation`, a plain **int 0-100** from the older, unrelated `_validate_ats_compatibility()` heuristic (`cv_orchestrator.py:2269`, scorer at `cv_orchestrator.py:5156-5218` — additive contact/summary/skills/experience/education points, *not* the hard/soft-weighted formula); (b) later, `/api/cv/ats-score` overwrites it with the weighted **dict** from `compute_ats_score()` (`generation_routes.py:1893-1897`), and Finalise (`generation_routes.py:2165-2167`) persists that dict version into the final `metadata.json`. So the field's type/semantics silently change over the session lifetime — any downstream/audit tooling reading `metadata.json.ats_score` must handle both an int and a dict shape depending on when the file is read. |
| 5 | UI labels Matched ✅ / Missing ❌ / Bonus ★ | ⚠ Partial | The three badges exist verbatim in the UI (`web/ats-modals.js:82-93`, `54-58`: `'★ Bonus Keywords'`), satisfying the *display* requirement. However, the story defines "Bonus" as **"candidate has skill not in JD"**, while the code's `bonus` type (`scripts/utils/scoring.py:563-568`) is actually **extra JD-side ATS keywords not already classified as hard/soft requirement** — i.e., still keywords the *job posting* mentions, not skills the *candidate* has beyond the JD. This is a semantic mismatch between the story's mental model and the implementation; a genuine "candidate has a bonus skill the JD didn't ask for" surfacing does not appear to exist anywhere in `scoring.py` or `ats-modals.js`. |

### US-H8: Hard / Soft Skill Distinction in ATS Output

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | LLM classifies every skill hard/soft during job analysis | ✅ (heuristic fallback) | `_classify_skill_type()` (`cv_orchestrator.py:4785-4802`) checks an explicit `skill_type` field first, else falls back to category/name heuristics (`_SOFT_SKILL_CATEGORIES`, `_SOFT_SKILL_NAMES`, `cv_orchestrator.py:4757-4771`). Whether the *LLM itself* assigns `skill_type` during job analysis vs. relying purely on the static heuristic list was not verifiable from `cv_orchestrator.py`/`scoring.py` alone — the heuristic guarantees a classification either way, but "LLM classifies every extracted skill" as a distinct LLM-driven step wasn't directly evidenced in the files reviewed. |
| 2 | Persisted in `Master_CV_Data.json` | ✅ | `skill_type: "hard" | "soft" (optional)` documented at `MASTER_CV_DATA_SPECIFICATION.md:171` and present in `schemas/master_cv_data.schema.json:148`. |
| 3 | ATS DOCX splits Technical Skills (hard) / Core Competencies (soft) | ✅ | `cv_orchestrator.py:4404-4424` — exact match to story's required format, including the section labels. |
| 4 | HTML JSON-LD `knowsAbout` carries `additionalType` | ✅ | `cv_orchestrator.py:1563-1572`: `'additionalType': 'HardSkill' if self._classify_skill_type(sk) == 'hard' else 'SoftSkill'` — exact match to story's required JSON-LD shape. |
| 5 | User can override classification, propagates to output | ✅ | `web/skills-review.js:281-302` (`payload.skill_type = normalizedSkillType`), `483-484` (`window._skillTypeOverrides[...] = overrides.skill_type`), `745` (toggle button flips hard↔soft). Stored override flows back through `skill_type` which `_classify_skill_type` reads first (`cv_orchestrator.py:4792-4794`), so it does propagate to both the ATS DOCX split and the JSON-LD `additionalType`. |
| 6 | Missing hard skills highlighted more prominently than soft | ✅ | `web/ats-modals.js:257-266` — missing hard requirements get their own distinct amber callout box *before* the generic "remaining keyword gaps" box for missing soft/bonus keywords. |

## Generated Materials Evaluation

- **ATS DOCX** is well-constructed for machine parsing: single column, no tables/shapes, Calibri throughout, plain-text URLs, Heading-1 sectioning, hard/soft skill split, consistent em-dash date ranges, keyword-tiered validation. The one structural gap is the **absent "Contact Information" heading** (US-H2), which mirrors the story's own documented rejected pattern.
- **HTML/JSON-LD** output is strong: valid Schema.org/Person, `knowsAbout` with `additionalType` HardSkill/SoftSkill, `hasOccupation`, `alumniOf`, `sameAs`. One inconsistency: `json_ld['telephone'] = contact['phone']` (`cv_orchestrator.py:1598`) is **not** run through `_normalize_phone()`, unlike the DOCX contact line (`cv_orchestrator.py:4383`) — so the phone number format required by US-H3 (`585-678-6661`, no parens) is guaranteed in the DOCX but not guaranteed in the HTML JSON-LD if the source `Master_CV_Data.json` stores the phone with parentheses/spaces.
- **PDF** validation (page size, embedded fonts, selectable text, page count) is thorough and well-implemented (`cv_orchestrator.py:6213-6329`).
- **The validation report itself is not reliably visible to the user** — see US-H6 finding #2, a confirmed, reproducible `ReferenceError` that breaks File Review tab rendering in the common case (any generated file present). This is the single most consequential finding in this review: all the well-built validation logic behind it is effectively invisible to HR/candidates using the app as shipped.

## Additional Story Gaps / Proposed Story Items

- **Terminology drift — two competing "ATS score" concepts.** The codebase maintains both a legacy additive `_validate_ats_compatibility()` score (0-100 int, contact/summary/skills/experience/education points) and a newer hard/soft-weighted `compute_ats_score()` (dict with `overall`, `hard_requirement_score`, etc.), both of which write to the same `metadata['ats_score']` key at different times with different shapes. The story set should add an explicit AC requiring a single canonical ATS-score representation, or at minimum a documented, stable schema for `metadata.json.ats_score`.
- **Proposed story item:** "Bonus skill" as the story defines it (candidate skill not requested by the JD) does not appear to be implemented anywhere — only "extra JD keywords beyond required/nice-to-have" is implemented under that label. Suggest either (a) renaming the code's `bonus` type to something like `supplemental_keyword` to avoid the clash, or (b) adding a genuine "candidate skills beyond the JD" comparison and using `bonus` for that.
- **Proposed story item:** No explicit "future end date" validation exists (only overlap detection). The story's own failure-mode table calls this out but no AC covers it — worth adding as a formal AC in a future revision of US-H5.
- **Proposed story item:** Add an AC to US-H2 requiring the Contact section to carry an explicit heading (or an AC clarifying that a labelless contact block is acceptable) — the current story text and current implementation contradict each other on this point.
- **Terminology observed as clear and consistent:** "ATS DOCX" / "Human PDF" / "Human DOCX" labelling in Settings (`index.html:663-665`) and File Review descriptions (`download-tab.js:44-68`) is unambiguous and matches the mental model an HR/ATS-savvy user would expect. No jargon or inconsistency issues found in this area.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, plus supporting web/download-tab.js, web/ats-modals.js, web/ats-refinement.js, web/skills-review.js, web/final-generate.js, web/review-table-base.js, scripts/utils/scoring.py, scripts/routes/generation_routes.py, MASTER_CV_DATA_SPECIFICATION.md, schemas/master_cv_data.schema.json.

| Story | ✅ Pass | ⚠ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-H1 | 5 | 0 | 0 | 0 | 0 |
| US-H2 | 2 | 1 | 0 | 0 | 0 |
| US-H3 | 5 | 0 | 0 | 1 | 0 |
| US-H4 | 3 | 2 | 0 | 0 | 0 |
| US-H5 | 4 | 1 | 0 | 0 | 0 |
| US-H6 | 2 | 2 | 1 | 0 | 0 |
| US-H7 | 3 | 2 | 0 | 0 | 0 |
| US-H8 | 6 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- US-H2: Missing "Contact Information" heading → `scripts/utils/cv_orchestrator.py:4360-4390` (no heading style applied to contact block).
- US-H6: `blockingFails` ReferenceError crashes File Review tab → `web/download-tab.js:259` (undefined in `_renderDownloadGrid` scope; defined only in sibling `_renderValidationSummary` at line 110); reproduced live in `web/bundle.js:16951`.
- US-H7: Two incompatible `ats_score` representations (int vs. dict) persisted to `metadata.json` at different times → `scripts/utils/cv_orchestrator.py:2269` vs. `scripts/routes/generation_routes.py:1893-1897, 2165-2167`.
- US-H7/US-H8: `knowsAbout` `additionalType` HardSkill/SoftSkill implemented exactly as specified → `scripts/utils/cv_orchestrator.py:1563-1572`.
- US-H3: Phone normalized in DOCX but not in JSON-LD → `scripts/utils/cv_orchestrator.py:4383` vs. `scripts/utils/cv_orchestrator.py:1598`.

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
