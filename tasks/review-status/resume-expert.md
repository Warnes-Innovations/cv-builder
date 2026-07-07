<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Resume Expert Review Status

**Last Updated:** 2026-07-06 (cycle 91 — corrected US-R5 gap attribution)

**Executive Summary:** Source-verified resume expert persona review against user-story-resume-expert.md. All seven stories evaluated with file:line evidence. Key gaps: (1) Human-readable DOCX generation does not filter `candidate_to_confirm` skills — unverified skills can appear in the human DOCX despite being correctly blocked from HTML/PDF (via cv-template.html Jinja2 filter) and ATS DOCX (GAP-326 resolved: cv_orchestrator.py:3919); (2) US-R2 publication shortlist is only available via tab navigation rather than proactively surfaced; (3) US-R4 summary hook structure and line count lack programmatic enforcement. US-R6 and US-R7 fully pass all acceptance criteria.

---

## Application Evaluation

### US-R1: Job Description Analysis Quality

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Required vs. preferred split | ✅ Pass | `analyze_job_description` JSON schema maps `required_skills` → must-haves; `preferred_skills` / `nice_to_have_requirements` → nice-to-haves. `scripts/utils/llm_client.py:332–336`. Downstream `_select_content_hybrid` keeps these lists separate: `cv_orchestrator.py:3176–3180`. |
| Keyword deduplication | ✅ Pass | `_synonym_map` + `_expansion_index` loaded at init; `canonical_skill_name()` and `_deduplicate_skills()` normalise all forms. `cv_orchestrator.py:119–127, 507`. `_ach_relevance()` also resolves synonyms for bullet ordering (`cv_orchestrator.py:3281–3283`). |
| Domain inference accuracy | ✅ Pass | `domain_confidence` (float 0–1) included in analysis schema (`llm_client.py:330`). When < 0.7 a `domain_clarification` question is prepended to post-analysis Q&A so user can correct (`conversation_manager.py:734–747`). |
| Keyword frequency weighting | ⚠️ Partial | `ats_keywords` (top 10) extracted by LLM with explicit prompt instruction to rank by frequency and positional prominence (`llm_client.py:314`). No rule-based positional scoring in the orchestrator — relies on LLM discretion. UI does not expose why a keyword ranked higher than another. |

**US-R1 Acceptance Criteria Check:**
- Required/preferred in distinct display sections: YES — `review-table-base.js:440–460` renders "Required Skills" grid and "Preferred / Nice-to-Have" list separately.
- Synonyms grouped: YES — ATS keyword panel annotates synonyms (`review-table-base.js:465–473`).
- Domain confidence surfaced with low-confidence prompt: YES — `conversation_manager.py:736–747`.
- Keyword positional weighting surfaced to user: NOT VERIFIED (LLM-implicit only; no per-keyword frequency display).

---

### US-R2: Content Selection Strategy

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Recency bias check | ✅ Pass | `_select_content_hybrid` sorts `(-relevance_score, -end_date_ordinal)` — relevance primary, recency tie-breaker only. `cv_orchestrator.py:3231`. |
| Achievement ordering within a job | ✅ Pass | Bullets sorted by `_ach_relevance()` (keyword-overlap with ATS keywords, synonym-expanded) when no user order is set. User-defined explicit ordering via UI overrides this. `cv_orchestrator.py:3275–3285`. |
| Section inclusion logic (Publications) | ⚠️ Partial | Publications-gate question appended when candidate has publications but domain is non-research (`conversation_manager.py:749–771`). Gating is correct. However, **ranked shortlist with per-item relevance scores and rationale** is not presented before the user's accept/reject decisions — only the accept/reject UI is shown. |
| Publication selection quality | ⚠️ Partial | `_select_publications()` scores on: recency tier (±30/20/10), entry type bonus (±25/20), ATS keyword-title matches (±5/hit), and one genomics domain bonus (±15). `cv_orchestrator.py:3764–3806`. First-author status is detected (`is_first_author` flag, `cv_orchestrator.py:892–895`) and displayed in the UI table (star indicator, `publications-review.js:148`) but **not used as a scoring factor**. Per-item rationale is generated (heuristic text) but only visible in the table once it loads — the `relevance_score` field and `rationale` field are exposed (`publications-review.js:149–153`). The acceptance criterion requires a ranked shortlist surfaced proactively; the current implementation shows it reactively. |
| Completeness without bloat | ✅ Pass | Page-count iteration loop in `_handle_recommend_customizations` re-calls LLM when estimated body pages are >25% over or <75% under budget. `_cap_cv_body_to_pages` enforces hard budget by trimming skills → achievements → bullets → experience entries. `cv_orchestrator.py:3648–3699`. Page-count warnings shown in layout-instruction UI (`layout-instruction.js:510–539`). |
| Achievements diversity | ✅ Pass | `_apply_achievement_diversity()` enforces diversity across impact types after scoring. `cv_orchestrator.py:3308`. |

**US-R2 Acceptance Criteria Check:**
- Relevance score is semantic + keyword, not recency rank: YES.
- Bullet reordering proposed and applied: YES.
- Conditional section decisions shown with rationale: PARTIALLY — publications gate question shown; rationale for per-publication decisions not shown until user enters the review tab.
- Ranked publication shortlist with per-item relevance scores and rationale, never silently omitted or included: PARTIAL FAIL — scores and rationale are present in the table but the shortlist is not proactively surfaced with a "here are the 5 publications most relevant to this role, ranked by…" framing. The gate question protects against silent full inclusion for industry roles but the per-item shortlist decision support is tab-interior.
- System warns if CV exceeds 3 pages or is under 1.5 pages: YES — `validate_ats_report` checks page count with `warn` at <2 pages and `fail` at >4 pages (`cv_orchestrator.py:5803–5814`); layout UI warns when >3 pages.

---

### US-R3: Rewrite Quality and Constraint Adherence

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Factual preservation | ✅ Pass | `apply_rewrite_constraints()` rejects proposals removing numeric tokens, percentages, or proper-noun Title-Case words. `llm_client.py:952–1000`. Called for every item in `apply_approved_rewrites()`. `cv_orchestrator.py:1698–1704`. |
| Naturalness | ✅ Pass | `check_keyword_appended()` flags rewrites where keyword appears as sentence-end appendage. `llm_client.py:1417`. Surfaced as persuasion warning in rewrite review UI. |
| Keyword integration | ✅ Pass | `check_keyword_appended()` detects appended keywords. Persuasion warnings displayed in rewrite review tab. |
| No fabrication (skill_add) | ✅ Pass | `evidence_strength == "weak"` triggers `candidate_to_confirm: True`. `cv_orchestrator.py:1799`. Amber "⚠ Weak evidence" / "⚠ Verify evidence" badge with evidence tooltip in skills review. `skills-review.js:727–731`. Evidence citation (comma-sep exp IDs) required in prompt schema. `llm_client.py:771–773`. |
| Terminology consistency | ✅ Pass | Batch terminology-consistency check in `run_persuasion_checks` detects abbreviated/expanded form conflicts across rewrites. `conversation_manager.py:1511`. |
| Acronym expansion | ⚠️ Partial | No rule-based enforcement of first-use acronym expansion (e.g., "MLOps (ML Operations)"). LLM instruction compliance only. |

**US-R3 Acceptance Criteria Check:**
- `apply_rewrite_constraints` rejects proposals that remove number, date, or company name: YES.
- Every `skill_add` proposal cites at least one experience ID as evidence: INSTRUCTED (in LLM prompt schema, `llm_client.py:771–773`); not runtime-enforced if LLM omits the field.
- Inserted keywords appear mid-sentence, not appended: YES — `check_keyword_appended` guards this.
- Introduced keywords consistent across batch: YES — batch consistency check present.

---

### US-R4: Professional Summary Effectiveness

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Hook quality (role type + years + differentiator) | ⚠️ Partial | `_validate_summary()` checks: opens with "I" (warns), word count range. No check that opening line contains role type + years + differentiator. `cv_orchestrator.py:3606–3646`. LLM prompt instructs "Open with a value-identity statement…" (`llm_client.py:887`) but this is not validated post-generation. |
| Keyword coverage | ✅ Pass | `_validate_summary()` checks top-3 required skills present and warns if missing. `cv_orchestrator.py:3632–3645`. |
| No fluff | ✅ Pass | `check_summary_generic_phrases()` (`llm_client.py:1410–1441`) flags "results-driven", "passionate about" etc. with `warn` severity. LLM prompts also prohibit these. `llm_client.py:869, 891`. |
| Leadership scope stated | ⚠️ Partial | No code-level check for team size / budget / scope in the summary for leadership roles. LLM instruction only. |
| Length (4–6 lines) | ⚠️ Partial | Word-count range (40–250 words) validated (`cv_orchestrator.py:3621–3629`). No *line-count* check. A 250-word dense paragraph block passes the word-count gate but violates the 4–6 line acceptance criterion. |

**US-R4 Acceptance Criteria Check:**
- Proposed summary is role-specific: YES — per-session `summary_focus` and `ai_recommended` key mechanisms ensure uniqueness from stored variants.
- Opening sentence evaluable (role type + years + differentiator): NOT VALIDATED programmatically — LLM instruction only.
- System does not inject "results-driven" or similar filler: YES — `check_summary_generic_phrases` guards this.

---

### US-R5: Skills Section Optimisation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Terminology alignment | ✅ Pass | `_deduplicate_skills()` canonicalises to synonym-map preferred names. `skill_rename` rewrite type allows aligning display names to job posting terminology. `cv_orchestrator.py:507, 1757–1793`. |
| No fabrication | ✅ Pass | Only skills from `Master_CV_Data.json` via `SessionDataView.normalized_skills()` or explicitly approved extra skills enter the pipeline. `candidate_to_confirm` marks unverified additions. |
| Grouping logic | ✅ Pass | `_sort_categories()` applies template-variant-specific priority orders. `_rank_skill_categories_by_relevance()` derives a session-specific category order from ATS keyword overlap. `cv_orchestrator.py:586–595`. |
| Density without redundancy | ✅ Pass | `_deduplicate_skills()` merges synonym entries. `_group_inline_skills()` combines skills sharing a `group` key into a single inline entry. |
| Candidate-to-confirm handling | ⚠️ Partial | Amber "⚠ Weak evidence" / "⚠ Verify evidence" badge in review UI (`skills-review.js:730–731`). HTML/PDF templates filter unconfirmed skills via `{% if not skill.candidate_to_confirm %}` at `cv-template.html:629, 781`. ATS DOCX also filters (fixed in GAP-326): `ats_skills = [s for s in content['skills'] if not s.get('candidate_to_confirm')]` at `cv_orchestrator.py:3919`. **Gap:** `_generate_human_docx()` uses `skills_by_category = content.get('skills_by_category', [])` at `cv_orchestrator.py:4919`, where `skills_by_category` is prepared by `_prepare_cv_data_for_template()` → `_organize_skills_by_category(selected_content.get('skills', []), ...)` at lines 210–215 — no `candidate_to_confirm` filter applied. Unverified skills appear in the human-readable DOCX. |

**US-R5 Acceptance Criteria Check:**
- Only master CV skills or approved additions appear in output: YES.
- Skills ordered by relevance within category: YES.
- Approved additions session-state only until Harvest: YES.
- Candidate-to-confirm items flagged in review UI and NEVER in generated documents: PARTIAL FAIL — HTML/PDF template correctly filters them (cv-template.html:629, 781); ATS DOCX correctly filters them (cv_orchestrator.py:3919, GAP-326 resolved); human DOCX does not filter (cv_orchestrator.py:4919–4944).

**Open gap (US-R5-HUMAN-DOCX):** `_generate_human_docx` must pre-filter `candidate_to_confirm` skills. Since it reads from `content['skills_by_category']` which is already organized, the cleanest fix is to add a filter in `_organize_skills_by_category` before processing, or filter inline at `cv_orchestrator.py:4938`: `skills_list = [s for s in cat.get('skills', []) if not (isinstance(s, dict) and s.get('candidate_to_confirm'))]`.

---

### US-R6: Rewrite Audit Traceability

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Full traceability | ✅ Pass | `submit_rewrite_decisions()` builds `rewrite_audit` with every decision (proposal + outcome). Saved to `metadata.json`. `conversation_manager.py:1229–1281`. |
| Rejected rewrites reverted | ✅ Pass | Only items where `outcome != 'reject'` added to `approved_rewrites`. Rejected items audited but never applied. |
| Edited rewrites | ✅ Pass | When `outcome == 'edit'` and `final_text` is set, `proposed` is replaced with `final_text` before adding to `approved_rewrites`. `conversation_manager.py:1265–1268`. |
| Audit completeness | ✅ Pass | All decisions including rejections recorded. `_verify_rewrite_audit_alignment()` runs at generation time and logs mismatches to metadata. `cv_orchestrator.py:5227–5302`. |

**US-R6 Acceptance Criteria Check:** All four criteria met.

---

### US-R7: Spell & Grammar Check Quality

| Criterion | Status | Evidence |
|-----------|--------|----------|
| No false positives on technical vocab | ✅ Pass | `_prepopulate_spell_dict()` seeds custom dictionary from skill names, company names, candidate name, institution names, certification issuers, and languages. `review_routes.py:78–156`. Flagged words in custom dictionary silently skipped. `spell_checker.py:210–214`. |
| No false positives on proper nouns | ✅ Pass | All `experience[*].company` and `personal_info.name` added to custom dictionary. `review_routes.py:116–121`. |
| Fragment tolerance in bullets | ✅ Pass | `SpellChecker.SUPPRESSED_BULLET_RULES` explicitly suppresses `SENTENCE_FRAGMENT`, `PUNCTUATION_PARAGRAPH`, `UPPERCASE_SENTENCE_START`, `WORD_CONTAINS_UNDERSCORE`, `EN_UNPAIRED_BRACKETS` when `context == 'bullet'`. `spell_checker.py:30–36`. |
| Skill names grammar-only check | ✅ Pass | When `context == 'skill'`, all non-spelling LanguageTool matches dropped. `spell_checker.py:207–208`. |
| Corrections do not alter surrounding text | ✅ Pass | `_apply_spell_fixes_to_text()` applies fixes in reverse offset order and validates each fix against expected original span before substituting. |
| Custom dictionary seeded correctly | ✅ Pass | `_prepopulate_spell_dict()` seeds from master data on spell-check initiation. `review_routes.py:1771, 1986`. |
| Severity calibration | ✅ Pass | `spell-check.js` sorts suggestions by `_sugSeverity()`: spelling/typo (0) → grammar (1) → style (2) → other (3). Spelling errors surface first. |

**Minor gap (GAP-PUB-SEED):** `_prepopulate_spell_dict` does not collect author names, journal names, or conference names from `publications`. A technical term appearing only in a publication title (not already in skills or companies) could generate a false positive during spell-check of the publications section.

---

## Generated Materials Evaluation

### Publication Ranked Shortlist — US-R2 Partial Gap

The publications review tab exists and exposes `relevance_score` and `rationale` per publication (`publications-review.js:149–153`). The algorithm scores on recency, entry type, keyword-title match, and domain bonus (`cv_orchestrator.py:3764–3806`). Scores are displayed in the table (e.g., "7.5/10").

**Gap:** First-author status is detected (`cv_orchestrator.py:892–895`) and shown in the table as a star indicator but contributes **0 points** to the scoring function. The US-R2 acceptance criterion explicitly lists "first-author status" as a scoring factor. Adding a modest first-author score boost would align the algorithm to the acceptance criterion.

**Gap:** The acceptance criterion states "a ranked publication shortlist is presented with per-item relevance scores and rationale; it is never silently omitted or silently included in full." The system meets the "never silently included in full" requirement via the publications-gate question. However, the ranked shortlist with scores/rationale is not presented to the user before they enter the publications review tab — there is no proactive summary message like "I have ranked your 12 publications; the top 4 recommended for this role are X, Y, Z…" The ranked table is there but only accessible by navigation.

### Candidate-to-Confirm Skills in Human DOCX — US-R5 Open Gap

Three of four output paths correctly filter `candidate_to_confirm` skills:

- **HTML/PDF template** (`cv-template.html:629, 781`): Jinja2 `{% if not skill.candidate_to_confirm %}` filter — ✅ PASS
- **ATS DOCX** (`cv_orchestrator.py:3919`): explicit Python filter `ats_skills = [s for s in content['skills'] if not s.get('candidate_to_confirm')]` — ✅ PASS (GAP-326 resolved)

**Remaining gap**: The **human DOCX** generation path (`_generate_human_docx`, lines 4919–4944) reads `skills_by_category` from the template-prep dict and iterates each category's skills list with no `candidate_to_confirm` filter. A user who accepts a weak-evidence `skill_add` rewrite but does not explicitly omit it will see that skill appear in the human-readable DOCX, violating the acceptance criterion.

**Required fix location:** `cv_orchestrator.py:4938` — filter inline:
`skills_list = [s for s in cat.get('skills', []) if not (isinstance(s, dict) and s.get('candidate_to_confirm'))]`

### Summary Hook Structure — US-R4

No programmatic enforcement of the opening-line structure (role type + years + differentiator) beyond the "I" prefix check. A summary that opens with "Seasoned professional with expertise in…" would pass all current validators (no I-prefix, word count in range, top-3 skills present, no filler phrases) but would fail the hook-quality acceptance criterion.

The LLM prompt instructs "Open with a value-identity statement: strong verb + differentiating value claim (e.g. 'Drives 3× revenue growth…', 'Builds ML pipelines that…') — NOT a title + years-of-experience formula" (`llm_client.py:887`). This guards against the literal "title + years" anti-pattern but the validator does not verify compliance.

### Terminology Clarity Assessment

| Term | Assessment |
|------|-----------|
| "ATS" | Clear. Badge tooltip expands to "Applicant Tracking System match score". `index.html:92`. |
| "Emphasize / Include / De-emphasize / Omit" | Standard professional terms; well-defined in the system prompt and recommendation-helpers. |
| "Rewrites" vs "Edits" | Appropriately distinct; "Rewrites" = LLM-proposed changes; user edits within the rewrite review UI. |
| "Harvest" | Creative metaphor for promoting improvements back to master CV. Not standard industry terminology but explained in the step tooltip. Acceptable. |
| "Candidate to confirm" | Appropriately cautious phrasing for weak-evidence skill additions. Tooltip expands to show the evidence basis. |
| "ATS Report" button | Clear for tech-savvy users; hiring-manager or first-time users may not know what ATS means without the tooltip. Tooltip text is adequate. |
| "File Review" step label | Slightly ambiguous — "File Review" could mean reviewing the files or reviewing via a file. "Download & Review" or "Review Generated Files" would be clearer. |
| Publications in the analysis tab | Not shown at analysis time — user does not know the system will handle publications until they reach the Customise → Publications sub-tab. No explicit mention in post-analysis workflow messaging. |

---

## Additional Story Gaps / Proposed Story Items

### US-R-NEW-1: First-Author Status as Publication Score Factor
**Gap:** `is_first_author` is detected and displayed (star in UI) but contributes 0 points to `_select_publications()` scoring. The acceptance criterion for US-R2 criterion 4 ("first-author status") is not met in the scoring algorithm.
**Proposed:** Add a first-author bonus (e.g., +10 points, normalized) to `_select_publications()` at `cv_orchestrator.py:3763–3806`.

### US-R-NEW-2: Summary Opening-Line Quality Gate
**Gap:** No programmatic validator checks that the opening sentence of the generated summary contains a value-identity statement (strong verb + differentiating value claim) rather than a generic opener. The "I"-prefix check is the only structural opening-line validation.
**Proposed:** Add a `_validate_summary_hook()` check in `_validate_summary()` that tests whether the first sentence opens with a word from `_STRONG_ACTION_VERBS` or a role-level indicator, and flags generic openers like "Seasoned professional," "Experienced [title]," or "Proven [adjective]."

### US-R-NEW-3: Summary Line-Count Enforcement
**Gap:** `_validate_summary()` validates word count (40–250 words) but not line count (4–6 lines per acceptance criterion). A dense 250-word single-paragraph block passes validation.
**Proposed:** Add a line-count check: split on `.` or `\n`, count sentences, warn if > 7 (too blocky) or < 3 (too terse for senior candidates).

### US-R-NEW-4: Publication Spell-Dictionary Seeding
**Gap (minor):** `_prepopulate_spell_dict()` does not seed author names, journal names, or conference names from the publications BibTeX file. A domain-specific term appearing only in a publication citation could generate a false positive.
**Proposed:** Extend `_prepopulate_spell_dict()` to collect `journal`, `booktitle`, `institution`, and `school` fields from `orchestrator.publications`.

### US-R-NEW-5: Proactive Publication Shortlist Summary
**Gap (UX):** The ranked publication shortlist is accessible only by navigating to the Publications sub-tab. No proactive assistant message says "I recommend these N publications for this role, ranked by relevance." The acceptance criterion expects the ranked shortlist to be "presented," not merely available.
**Proposed:** After customisation recommendations are generated, include a publications summary in the assistant message: "Your top recommended publications for this role are: [ranked list with scores]." This mirrors the existing experience/achievement recommendation summary.

### US-R-NEW-6: Implicit Requirement Extraction Display
**Gap (analysis quality):** US-R1 mentions that implicit requirements (e.g., "cross-functional team" implies stakeholder communication skills) should not be missed. The LLM may extract these into `culture_indicators` or free-text requirement fields, but no explicit "implicit requirements" section is shown to the user. Users cannot verify whether the system has inferred implicit needs correctly.
**Proposed:** Add an optional "Inferred Implicit Requirements" section to the Analysis tab, populated from `culture_indicators` and any requirements not explicitly listed as must-have or preferred.

---

**Reviewed against:** web/index.html, web/app.js (web/src/), web/message-queue.js, web/job-analysis.js, web/review-table-base.js, web/publications-review.js, web/skills-review.js, web/spell-check.js, web/layout-instruction.js, web/ats-modals.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/utils/llm_client.py, scripts/utils/spell_checker.py, scripts/routes/review_routes.py, templates/cv-template.html

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-R1 | 3 | 1 | 0 | 0 | 0 |
| US-R2 | 3 | 2 | 0 | 0 | 0 |  
| US-R3 | 5 | 1 | 0 | 0 | 0 |
| US-R4 | 2 | 3 | 0 | 0 | 0 |
| US-R5 | 4 | 1 | 0 | 0 | 0 |
| US-R6 | 4 | 0 | 0 | 0 | 0 |
| US-R7 | 7 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- US-R1 (Required/preferred split): `llm_client.py:332–336`, `cv_orchestrator.py:3176–3180`
- US-R1 (Domain confidence + prompt): `conversation_manager.py:734–747`
- US-R2 (Recency bias): `cv_orchestrator.py:3231`
- US-R2 (Bullet reordering): `cv_orchestrator.py:3275–3285`
- US-R2 (Publications gate): `conversation_manager.py:749–771`
- US-R2 (Publications scoring): `cv_orchestrator.py:3764–3806`
- US-R2 (First-author detection — display only): `cv_orchestrator.py:892–895`; `publications-review.js:148`
- US-R2 (Page budget): `cv_orchestrator.py:3648–3699`; `layout-instruction.js:510–539`
- US-R3 (Factual constraint guard): `llm_client.py:952–1000`; `cv_orchestrator.py:1698–1704`
- US-R3 (Keyword appended check): `llm_client.py:1417`
- US-R3 (skill_add weak evidence): `cv_orchestrator.py:1799`; `skills-review.js:727–731`
- US-R4 (Summary validation): `cv_orchestrator.py:3606–3646`
- US-R4 (No filler): `llm_client.py:1410–1441`, `llm_client.py:869, 891`
- US-R5 (candidate_to_confirm template filter): `templates/cv-template.html:629, 781`
- US-R6 (Audit trail): `conversation_manager.py:1229–1281`; `cv_orchestrator.py:5227–5302`
- US-R7 (Fragment suppression): `spell_checker.py:30–36`
- US-R7 (Dictionary seeding): `review_routes.py:78–156`

**Evidence standard:** Every conclusion supported by file:line evidence from current source, verified 2026-07-06.
