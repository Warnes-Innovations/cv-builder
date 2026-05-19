<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# HR / ATS Review Status

**Last Updated:** 2026-04-22 16:30 ET

**Executive Summary:** The ATS DOCX generation pipeline is substantially
implemented: single-column layout, Heading 1 section headings with standard
labels, normalized phone/contact formatting, hard/soft skill split, and a
17-check post-generation validation report that gates downloads on failures.
The keyword match score (compute_ats_score) is real, visible in the position
bar badge and the ATS Score tab, and persisted to metadata.json. The
remaining gaps are functional rather than structural: no UI control to
override hard/soft classification, no write-back of skill_type to master
data, per-item live score refresh fires only after batch submission, font
name is not explicitly enforced in the ATS DOCX (relying on python-docx
defaults), and three validation checks required by the story (PDF font
embedding, margin clipping, keyword density) are not implemented.

---

## Application Evaluation

---

### US-H1: ATS File Ingestion

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Single-column layout; zero tables in DOCX | ✅ | `_generate_ats_docx` builds paragraph-only document with no `doc.add_table()` call; validate check #2 confirms at runtime — `scripts/utils/cv_orchestrator.py:2757–2905, 3669–3675` |
| Zero text boxes / shapes | ✅ | Validate check #3 inspects VML and MC namespaces — `cv_orchestrator.py:3677–3683` |
| Contact information in document body, not Word header/footer | ✅ | Contact block is a plain `doc.add_paragraph()` after the candidate name paragraph — `cv_orchestrator.py:2771–2801` |
| All URLs spelled out as plain text (no formatted hyperlinks) | ✅ | LinkedIn appended as bare string via `contact_parts.append(contact['linkedin'])` — `cv_orchestrator.py:2793`; no python-docx hyperlink run created |
| ATS text 100% selectable | ✅ | Validate check #1 extracts text and fails if `len < 100` — `cv_orchestrator.py:3661–3665` |
| All fonts Arial / Calibri / Times New Roman at 10–12pt | ⚠️ | `_setup_ats_styles` sets `Pt(12)` for Heading 1 and `Pt(10)` for List Bullet but does **not** set `font.name` — relies on python-docx default template (Calibri). Not explicitly enforced or validated. — `cv_orchestrator.py:2909–2944` |

**Residual gap:** Font family depends on the python-docx default template being Calibri. No validation check enforces font name.

---

### US-H2: ATS Section Recognition

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Heading 1 Word style for all section headings | ✅ | "Professional Summary" `cv_orchestrator.py:2808`, "Technical Skills" `:2827`, "Core Competencies" `:2831`, "Work Experience" `:2838`, "Education" `:2872` — all use `style='Heading 1'` |
| Required section labels used verbatim | ✅ | Standard ATS labels used exclusively in `_generate_ats_docx` — `cv_orchestrator.py:2808–2905` |
| Standard heading validation at runtime | ⚠️ | Validate check #5 uses a `STANDARD` frozenset (`cv_orchestrator.py:3701–3709`) that includes **"career history"** — a label the story explicitly rejects. The validator passes a CV with "Career History" without warning. |
| No creative section names in ATS DOCX | ⚠️ | Generation uses correct labels, but there is no enforcement that the human PDF and the ATS DOCX differ in heading style. No differential test exists. |

**Residual gap:** STANDARD validation set is too permissive ("career history" passes). Cross-document heading differentiation is untested.

---

### US-H3: Contact Information Parsing

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Contact block is first content in document body | ✅ | Name paragraph is first, then pipe-separated contact line — `cv_orchestrator.py:2764–2801` |
| Name, city/state, phone, email on first 1–2 lines | ✅ | `' \| '.join(contact_parts)` — `cv_orchestrator.py:2795–2798` |
| Phone formatted as `NNN-NNN-NNNN` | ✅ | `_normalize_phone()` strips non-digits and rebuilds `{3}-{3}-{4}` — `cv_orchestrator.py:3125–3137` |
| LinkedIn URL as plain text | ✅ | `contact.get('linkedin')` appended as bare string — `cv_orchestrator.py:2793` |
| No full street address (city + state only) | ✅ generation / ⚠️ validation | Generation uses `address.city` / `address.state` only — `cv_orchestrator.py:2779–2788`. Validate check #4 verifies email **presence** but not street address **absence** — `cv_orchestrator.py:3685–3690`. |

**Residual gap:** The ATS validation report does not flag if a full street address is injected via `contact.address_display`.

---

### US-H4: Keyword Matching and Scoring

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Post-generation keyword check against DOCX text | ✅ | Validate check #8 (`ats_keyword_presence`) — `cv_orchestrator.py:3774–3790` |
| System reports keyword present / section / match type | ✅ | `compute_ats_score` returns `keyword_status` list with `status`, `matched_in_sections`, `match_type` — `scoring.py:443–519` |
| Missing keyword warning or fail | ✅ | Validate check #8: warn if ≤ 1/3 missing; fail if > 1/3 missing — `cv_orchestrator.py:3782–3790` |
| `knowsAbout` in JSON-LD populated | ✅ | Validate check #11 verifies `len(ka) >= 3` — `cv_orchestrator.py:3821–3826`; generation at `cv_orchestrator.py:1244–1249` |
| Case-insensitive keyword normalization | ✅ | Validate check uses `text_lower` / `kw not in text_lower` — `cv_orchestrator.py:3774` |
| Hyphen / slash variant normalization | ⚠️ | `scoring.py` uses `synonym_map.json` for canonical matching, but `validate_ats_report` does **not** — plain substring search only — `cv_orchestrator.py:3774–3790` |
| All required keywords checked | ⚠️ | `validate_ats_report` limits check to first **15** ATS keywords — `cv_orchestrator.py:3774 ([:15])`. Roles with 20+ keywords will have unchecked keywords. |

**Residual gap:** The 15-keyword cap in validate_ats_report can silently pass CVs missing important keywords. synonym_map used by scoring.py is not applied in validate_ats_report.

---

### US-H5: Date and Employment History Parsing

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Job entry on one line: `Title \| Company \| Location \| Date Range` | ✅ | `entry_line = ' \| '.join(p for p in entry_parts if p)` — `cv_orchestrator.py:2839` |
| "Present" used for current role | ✅ | `exp.get('end_date', 'Present')` — `cv_orchestrator.py:2835` |
| Consistent date format validated | ✅ | Validate check #7 detects mixed formats and fails — `cv_orchestrator.py:3740–3762` |
| Date separator character enforced | ⚠️ | Generation uses ` – ` (U+2013 en-dash). Story calls for em-dash preferred. Neither is validated — `cv_orchestrator.py:3740–3762` |
| No overlapping date ranges | 🟲 | Not found in `validate_ats_report` or any pre-generation check — `cv_orchestrator.py:3600–4016` |

**Residual gap:** Overlapping date ranges are entirely unchecked. Year-only dates pass the consistency check despite failing the month+year accuracy requirement.

---

### US-H6: ATS Output Validation Report

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Programmatic validation runs after generation | ✅ | `GET /api/ats-validate` calls `validate_ats_report()` — `review_routes.py:2178–2229` |
| Results displayed with pass/warn/fail per check | ✅ | File Review tab renders a table with icon and detail per check — `download-tab.js:116–145` |
| Fail blocks download with explanation | ✅ | `blockDocx / blockHtml / blockPdf` flags disable download buttons — `download-tab.js:155–175` |
| Warn allows download but shows issue | ✅ | Warn rows render warning icon and detail but do not set block flags — `download-tab.js:116–145` |
| Validation results persisted to `metadata.json` | ✅ | `_try_patch_metadata(conversation, {'validation_results': ...})` — `review_routes.py:2224` |
| PDF fonts embedded check | 🟲 | Not in `validate_ats_report` — `cv_orchestrator.py:3600–4016` |
| PDF no clipped content at margins check | 🟲 | Not in `validate_ats_report` — `cv_orchestrator.py:3600–4016` |
| Keyword density within acceptable range | 🟲 | No density / stuffing check implemented |

**Residual gap:** Three checks from the story checklist are missing. Font embedding and clipping are deferred to human review; keyword stuffing detection is absent.

---

### US-H7: ATS Match Score Visibility

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Overall match score (0–100%) computed and displayed | ✅ | `compute_ats_score` — `scoring.py:515–521`; badge in position bar — `index.html:72–85`; ATS Score tab — `ats-modals.js:306–317` |
| Score persisted to `metadata.json` | ✅ | `generation_routes.py:1819`: `metadata['ats_score'] = ats_score` |
| Per-skill states: Matched / Missing / Bonus | ✅ | `keyword_status` list with `status: matched/partial/missing` and `type: hard/soft/bonus` — `scoring.py:443–519`; rendered in ATS Report modal — `ats-modals.js:72–106` |
| Missing hard requirements highlighted prominently | ✅ | `_renderAtsReport` renders an orange warning box for `missingHard` — `ats-modals.js:253–261` |
| Hard skills weighted more than soft (2:1 per story) | ⚠️ | Implementation uses **0.7 hard + 0.3 soft** (≈ 2.3:1), not exactly 2:1 — `scoring.py:515` |
| Score updates after each individual approval/rejection | ⚠️ | `scheduleAtsRefresh()` called after **batch submission** only — `skills-review.js:1077`, `rewrite-review.js:409`. Per-item update not implemented. |
| "Bonus ★" label matches story definition | ⚠️ | Story: candidate has skill not in JD. Code: ATS keywords not in required/preferred lists — `scoring.py:498–506`. Semantically opposite to story intent. |

**Residual gap:** Live per-item score update is not implemented. "Bonus" semantics diverge from story definition. Weighting is slightly off from the stated 2:1.

---

### US-H8: Hard / Soft Skill Distinction in ATS Output

| Criterion | Status | Evidence |
|-----------|--------|----------|
| ATS DOCX separates "Technical Skills" from "Core Competencies" | ✅ | `hard_skills` → Heading 1 "Technical Skills"; `soft_skills` → Heading 1 "Core Competencies" — `cv_orchestrator.py:2821–2833` |
| JSON-LD `knowsAbout` entries include `additionalType: HardSkill / SoftSkill` | ✅ | `'additionalType': 'HardSkill' if ... == 'hard' else 'SoftSkill'` — `cv_orchestrator.py:1248` |
| LLM classifies every skill as hard or soft | ❌ | `_classify_skill_type` is a **rule-based heuristic** (checks stored `skill_type` field, category names against `_SOFT_SKILL_CATEGORIES`, skill names against `_SOFT_SKILL_NAMES`). No LLM call for classification. — `cv_orchestrator.py:3128–3147` |
| User can override classification in the UI | ❌ | Skills review table shows **read-only informational badges** sourced from job analysis data. No toggle or input to override. — `skills-review.js:663–670` |
| Classification (`skill_type`) persisted to `Master_CV_Data.json` | ❌ | `_classify_skill_type` reads `skill.get('skill_type')` but no harvest path writes `skill_type` back. `_harvest_add_skill` does not persist type. — `cv_orchestrator.py:3134, 3478–3515` |

**Residual gap:** Three story acceptance criteria are unmet: LLM-based classification, UI override, and master data persistence. The rule-based implementation is a solid foundation but does not reach the story's full contract.

---

## Generated Materials Evaluation

### ATS DOCX Structure

The generated `*_ATS.docx` is a clean paragraph-based document with:
- Heading 1 style for all section headings with standard labels
- Hard/soft skill split into "Technical Skills" / "Core Competencies"
- One-line job entries: `Title | Company | Location | Date Range`
- Phone normalized to `NNN-NNN-NNNN`
- No tables, no text boxes confirmed by validate_ats_report

**Gaps:** Font name is not explicitly set (relies on python-docx default Calibri). Date separator is en-dash, not em-dash. No explicit single-line enforcement for education entries comparable to job entry headers.

### HTML JSON-LD

The `<script type="application/ld+json">` block:
- Uses `@type: Person` with `https://schema.org` context ✅
- Populates `knowsAbout` with skills annotated with `additionalType: HardSkill / SoftSkill` ✅
- Includes `name`, `email`, `telephone`, `hasOccupation`, `alumniOf`, `sameAs` ✅
- Validation checks #9–12 cover these four HTML criteria in the post-generation report ✅

**Gap:** Story's "Bonus ★" definition requires `knowsAbout` entries to identify which skills are not in the JD. Current JSON-LD generation does not annotate "bonus" vs "required" skills.

### PDF

Validate checks confirm: PDF page count (warn if outside 2–3 page ideal), US Letter page size (check #14), selectable text (check #15).

**Gaps:** Font embedding and margin/clipping checks are not automated.

---

## Terminology and UX Assessment

| Issue | Current Term | Problem | Suggestion |
|-------|-------------|---------|-----------|
| Two "ATS" surfaces with different content | "ATS Report" button (keyword match score) vs "File Review" tab (structural validation) | A user looking for "the ATS report" finds two different things that overlap in purpose | Rename "ATS Report" button to "Keyword Match"; rename "File Review" tab to "Download & ATS Validation" |
| "Bonus Keywords" vs story's "Bonus ★" definition | `bonus` in `keyword_status` | Code: supplementary JD keywords. Story: candidate skills not in JD. Semantically opposite. | Rename `type: bonus` to `type: supplemental`; add separate `type: candidate_extra` |
| Hard/Soft badges appear interactive but are read-only | Hard / Soft badge with no affordance | Colored pill implies clickable; clicking does nothing | Add tooltip or implement the toggle |
| "Compute ATS Score" empty-state button implies score is optional | Button text | User who never visits ATS Score tab never sees the score | Auto-refresh score after skills decisions are submitted |
| "File Review" tab label does not signal ATS validation | `tab-download` / "⬇️ File Review" | HR persona expects "ATS Validation" or "Download & Validate" | Rename to "⬇️ Download & Validate" |

---

## Additional Story Gaps / Proposed Story Items

### GAP-H-A: Font Compliance Validation

`_setup_ats_styles` sets sizes/colors but not `font.name`. A future `docx_font_names` validation check should enumerate all explicit font name runs and warn on non-standard fonts.

### GAP-H-B: Overlapping Employment Date Validation

No check flags overlapping date ranges. Add a pre-generation validation step that computes tenure ranges and warns if any two experiences overlap by more than 30 days.

### GAP-H-C: Year-Only Date Rejection

Date consistency check (validate #7) does not reject year-only dates. Add a pattern check that warns when year-only dates are detected.

### GAP-H-D: Skill Type Override and Master Data Persistence

> **US-H9 (proposed):** As a user, I want to override the hard/soft classification of any skill in the Skills Review step, and have that override persist to my master CV profile, so that future CVs and ATS outputs use the correct classification without re-review.

### GAP-H-E: Synonym / Variant Normalization in Validate Report

`compute_ats_score` uses `synonym_map.json` but `validate_ats_report` does not. A CV that scores well on the ATS Score tab may still show keyword failures in the validation report for synonym variants.

---

**Reviewed against:** web/index.html, web/app.js, web/ats-modals.js, web/ats-refinement.js, web/skills-review.js, web/download-tab.js, web/rewrite-review.js, scripts/utils/cv_orchestrator.py, scripts/utils/scoring.py, scripts/routes/generation_routes.py, scripts/routes/review_routes.py, scripts/data/synonym_map.json

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🟲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-H1 | 5 | 1 | 0 | 0 | 0 |
| US-H2 | 2 | 2 | 0 | 0 | 0 |
| US-H3 | 4 | 1 | 0 | 0 | 0 |
| US-H4 | 5 | 2 | 0 | 0 | 0 |
| US-H5 | 3 | 1 | 0 | 1 | 0 |
| US-H6 | 5 | 0 | 0 | 3 | 0 |
| US-H7 | 4 | 3 | 0 | 0 | 0 |
| US-H8 | 2 | 0 | 3 | 0 | 0 |

**Key evidence references:**

- US-H1 font gap: `cv_orchestrator.py:2909–2944` (`_setup_ats_styles`, no `font.name` set)
- US-H2 permissive STANDARD set: `cv_orchestrator.py:3701–3709` (includes "career history")
- US-H3 phone normalization: `cv_orchestrator.py:3125–3137`
- US-H4 15-keyword cap: `cv_orchestrator.py:3774` (`[:15]`)
- US-H5 overlapping dates: not found in `cv_orchestrator.py:3600–4016`
- US-H6 17-check validation: `cv_orchestrator.py:3600–4016`
- US-H7 batch-only refresh: `skills-review.js:1077`, `rewrite-review.js:409`
- US-H7 70/30 weighting: `scoring.py:515`
- US-H8 rule-based classifier: `cv_orchestrator.py:3128–3147`
- US-H8 no UI override: `skills-review.js:663–670` (read-only badge)
- US-H8 no skill_type write-back: `cv_orchestrator.py:3478–3515` (`_harvest_add_skill`)
- US-H8 JSON-LD additionalType: `cv_orchestrator.py:1248`

**Evidence standard:** Every conclusion is supported by source citations sufficient for independent verification.
