<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->
<!-- markdownlint-disable MD032 MD036 MD060 -->

# Resume Expert Review Status

**Last Updated:** 2026-06-29 23:00 ET

**Executive Summary:** The application demonstrates solid foundational architecture for most resume-expert concerns. The rewrite pipeline, skill deduplication, bullet reordering, and spell-check context handling are well-implemented. The primary gaps are: (1) required vs. preferred qualifications are parsed separately in the backend but are not displayed as visually distinct sections in the Analysis tab UI; (2) the publication selection algorithm is recency/type-biased rather than relevance-first, and there is no per-publication relevance rationale surfaced to the user; (3) `candidate_to_confirm` skill markers appear only in the review UI but are never filtered out of generated output documents; (4) the summary review system selects from stored variants but does not generate a role-specific rewrite with hook quality validation; and (5) page-length warnings exist post-generation but not pre-generation during customisation.

---

## Application Evaluation

### US-R1: Job Description Analysis Quality

**Criterion 1 — Required vs. preferred split:** ⚠️ Partial

The backend correctly separates `required_skills` and `preferred_skills` / `nice_to_have_requirements` in `LLMClient.analyze_job_description` (`llm_client.py:304–309`). The `bundle.js` renders these into separate sections at line 3610–3657, with distinct list headings for required skills, preferred skills, and nice-to-have requirements. However, the Analysis tab UI (`bundle.js:3589–3657`) combines `preferred_skills` and `nice_to_have_requirements` into a single "Nice to Have" block — this conflation is not wrong but slightly loses granularity. More critically, there is no visual distinction (color, icon, or explicit labeling as "MUST HAVE / PREFERRED") that would make the split immediately obvious at a glance to a resume expert reviewing the analysis.

**Criterion 2 — Keyword deduplication:** ✅ Pass

`CVOrchestrator._deduplicate_skills` (`cv_orchestrator.py:503–531`) deduplicates by canonical synonym name via `_expansion_index`, merging aliases and keeping the entry with more years. `canonical_skill_name` (`cv_orchestrator.py:154–160`) maps `'ML' → 'Machine Learning'` etc. Synonym map loaded from `scripts/data/synonym_map.json`.

**Criterion 3 — Domain inference accuracy:** ⚠️ Partial

Domain is inferred by the LLM and stored as `job_analysis['domain']` (`conversation_manager.py:113`). The Analysis tab renders domain and role_level. However, there is no confidence level exposed alongside the domain inference, and no UI prompt when the domain is ambiguous (acceptance criterion 3 of US-R1 requires "ambiguous cases prompt the user"). The clarifying questions (`conversation_manager.py:654–677`) are role-specific but not triggered explicitly by domain ambiguity.

**Criterion 4 — Keyword frequency weighting:** 🔲 Not Implemented

`_select_content_hybrid` uses `calculate_relevance_score` which scores keyword overlap (`cv_orchestrator.py:3137`), but there is no evidence that keywords appearing in the job title, first paragraph, or multiple times receive higher weighting than single-mention keywords. The scoring utility is called with a flat `job_keywords` set with no frequency data passed through.

**US-R1 Acceptance Criteria:**
- Required and preferred displayed in visually distinct sections — ⚠️ Partial (separate lists rendered but not strongly visually separated)
- Synonyms grouped — ✅ Pass (`_deduplicate_skills`, `canonical_skill_name`)
- Domain inference with confidence + ambiguous prompt — ❌ Fail (no confidence level surfaced, no ambiguity prompt)

---

### US-R2: Content Selection Strategy

**Criterion 1 — Recency bias check:** ✅ Pass

`_select_content_hybrid` scores experiences by `llm_score + keyword_score + semantic_score` (`cv_orchestrator.py:3136–3144`), then sorts by score descending before applying chronological secondary sort. Relevance-based score takes precedence. Experiences are reverse-chronological by default (`cv_orchestrator.py:3168`) only as a tiebreaker within the relevance-sorted output, and user can override via `experience_row_order` (`cv_orchestrator.py:3173–3179`).

**Criterion 2 — Achievement ordering within a job:** ✅ Pass

`_select_content_hybrid` default-sorts bullets by keyword overlap relevance (`cv_orchestrator.py:3209–3219`) using `_ach_relevance`. User-explicit ordering via `achievement_orders` takes precedence (`cv_orchestrator.py:3195–3208`). The `ordered_achievements` field carries the sorted list into the template.

**Criterion 3 — Section inclusion logic + publication ranking:** ⚠️ Partial

`_select_publications` (`cv_orchestrator.py:3616–3680`) scores publications by keyword title match, type, and domain — this is a form of relevance scoring. First-author status is detected (`cv_orchestrator.py:886–892`) and stored in `is_first_author`. However:
- The scoring function is **recency-biased**: year ≥ 2020 gets +30, ≥ 2015 gets +20, ≥ 2010 gets +10, and article type gets +25 unconditionally (`cv_orchestrator.py:3629–3648`). Recency outweighs keyword relevance (only +5 per keyword match in title) and type bonus outweighs domain for many cases.
- No per-publication relevance rationale is surfaced to the user in the Publications review tab.
- Conditional section inclusion/exclusion rationale is not shown in the UI (no message like "Publications included because domain = research").
- The acceptance criterion requiring a ranked shortlist with per-item scores and rationale is not met.

**Criterion 4 — Publication selection quality:** ⚠️ Partial (see Criterion 3)

First-author detection is present but carries no scoring bonus. Recency dominates over direct evidence relevance.

**Criterion 5 — Completeness without bloat (2–3 page CV):** ⚠️ Partial

`_cap_cv_body_to_pages` (`cv_orchestrator.py:3514–`) trims content to a page budget. Post-generation ATS validation (`validate_ats_report`, `cv_orchestrator.py:5011–5028`) warns when the PDF is 1 page or outside the 2–3 page ideal range. However, no pre-generation warning is surfaced to the user during the customisation phase. The story requires "system warns if estimated CV length exceeds 3 pages or is under 1.5 pages" — this only happens after generation.

**Criterion 6 — Achievements diversity:** ⚠️ Partial

Achievements are scored by keyword overlap + semantic match; the scoring does not explicitly diversify across technical/leadership/business impact types. The user can manually reorder but no guidance nudges diversity.

**US-R2 Acceptance Criteria:**
- Relevance score not recency rank — ✅ Pass (experiences); ⚠️ Partial (publications still recency-dominated)
- Bullet reordering proposed and applied — ✅ Pass
- Conditional section decisions shown with rationale — ❌ Fail (no rationale text in UI)
- Ranked publication shortlist with per-item scores and rationale — ❌ Fail
- Page length warning during workflow — ⚠️ Partial (post-generation only)

---

### US-R3: Rewrite Quality and Constraint Adherence

**Criterion 1 — Factual preservation:** ✅ Pass

`LLMClient.apply_rewrite_constraints` is called before each approved rewrite is applied (`cv_orchestrator.py:1678`). Proposals failing constraint validation are logged and skipped (`cv_orchestrator.py:1679–1684`). The constraint function guards numbers, dates, and company names.

**Criterion 2 — Naturalness:** — N/A (LLM generation quality; not evaluable from source)

**Criterion 3 — Keyword integration:** — N/A (LLM prompt quality; not directly evaluable from source)

**Criterion 4 — No fabrication (`skill_add` must cite evidence):** ⚠️ Partial

`skill_add` rewrites store `evidence` from the proposal (`cv_orchestrator.py:1779–1781`) and set `candidate_to_confirm: True` when `evidence_strength == "weak"`. However, the `evidence` field is free-text from the LLM, not a validated experience ID reference. There is no enforcement that the evidence cites a concrete experience entry ID from the master data.

**Criterion 5 — Terminology consistency:** — N/A (LLM prompt quality)

**Criterion 6 — Acronym expansion:** — N/A (LLM prompt quality)

**US-R3 Acceptance Criteria:**
- `apply_rewrite_constraints` rejects proposals removing numbers/dates/names — ✅ Pass (`cv_orchestrator.py:1678`)
- Every `skill_add` cites at least one experience ID — ⚠️ Partial (evidence stored but not validated as experience ID reference)
- Keywords appear mid-sentence — N/A
- Consistent terminology enforced — N/A

---

### US-R4: Professional Summary Effectiveness

**Criterion 1 — Hook quality:** ⚠️ Partial

The system selects from pre-authored summary variants in `Master_CV_Data.json` via `SessionDataView.selected_summary()` (`cv_orchestrator.py:3395`). There is a `summary_focus_override` mechanism (`conversation_manager.py:112`) and session-generated summaries (`session_summaries`). However, the system does not generate a fresh role-specific summary for the current job during the workflow. The Summary review tab renders the stored/selected text; it does not propose a job-tailored rewrite with hook quality evaluation.

**Criterion 2 — Keyword coverage:** — N/A (depends on authored content and LLM rewrite quality)

**Criterion 3 — No fluff check:** ❌ Fail

`check_summary_generic_phrases` in `LLMClient` is run as a persuasion check during rewrite review (`conversation_manager.py:1324–1325`) — but only for rewrite proposals, not for the baseline selected summary. No UI warning flags filler phrases in the stored summary before it reaches the generated document.

**Criterion 4 — Leadership scope stated for senior roles:** — N/A (LLM/authored content)

**Criterion 5 — Length (4–6 lines):** 🔲 Not Implemented (no length validation on stored summaries)

**US-R4 Acceptance Criteria:**
- Proposed summary is role-specific — ⚠️ Partial (selection from stored variants, not fresh generation)
- Opening sentence evaluable: role type + years + differentiator — 🔲 Not validated
- System does not inject "results-driven" filler — ❌ Fail (no validation on stored summaries; only checked on rewrite proposals)

---

### US-R5: Skills Section Optimisation

**Criterion 1 — Terminology alignment:** ✅ Pass

`canonical_skill_name` maps aliases to canonical forms (`cv_orchestrator.py:154–160`). The `skill_rename` rewrite type allows renaming to job-aligned terminology (`cv_orchestrator.py:1737–1773`).

**Criterion 2 — No fabrication:** ✅ Pass

Only skills from `Master_CV_Data.json` (via `SessionDataView.normalized_skills()`) or explicitly approved `extra_skills` appear in output (`cv_orchestrator.py:3100–3105, 3353–3368`).

**Criterion 3 — Grouping logic:** ✅ Pass

`_sort_categories` uses template-variant-specific priority orders (`cv_orchestrator.py:555–580`): `academic` variant de-emphasises Infrastructure & Cloud, emphasises Research. Custom category order from session is supported (`skill_category_order`).

**Criterion 4 — Density without redundancy:** ✅ Pass

`_deduplicate_skills` (`cv_orchestrator.py:503–531`) collapses synonyms to one canonical form with aliases. `_group_inline_skills` groups skills sharing a `group` key into a single inline entry.

**Criterion 5 — Candidate-to-confirm handling:** ⚠️ Partial — critical gap

`candidate_to_confirm: True` is set on weak-evidence `skill_add` entries (`cv_orchestrator.py:1779`). The skills review UI displays a "⚠ Verify evidence" badge for such skills (`skills-review.js:663–664`). **However, the CV template (`cv-template.html:629, 777`) renders all skills in `skills_by_category` without filtering on `candidate_to_confirm`.** There is no code in `_organize_skills_by_category`, `_skill_inline_label`, or the Jinja2 template that excludes `candidate_to_confirm: True` skills from the generated PDF/DOCX/HTML. The skill name in the generated document is clean (no badge text), but the skill itself is still included even without the user explicitly confirming it.

**US-R5 Acceptance Criteria:**
- Only Master CV skills or approved additions appear — ✅ Pass
- Skills ordered by relevance within category — ✅ Pass (`_sort_categories` by years desc within priority order)
- Approved additions stored for session, eligible for Harvest — ✅ Pass (`extra_skills` in session state, `_harvest_add_skill` route)
- Candidate-to-confirm flagged in review UI — ✅ Pass (`skills-review.js:633, 663`)
- Candidate-to-confirm never appear in generated output — ❌ Fail (no filter applied; `candidate_to_confirm` skills pass through `_select_content_hybrid` into template rendering without exclusion)

---

### US-R6: Rewrite Audit Traceability

**Criterion 1 — Full traceability:** ✅ Pass

`submit_rewrite_decisions` (`conversation_manager.py:1114–1166`) builds `rewrite_audit` containing every proposal merged with its outcome. `generate_cv` writes `rewrite_audit` to `metadata.json` (`cv_orchestrator.py:2194`). State initialised with `'rewrite_audit': []` (`conversation_manager.py:101`).

**Criterion 2 — Rejected rewrites reverted:** ✅ Pass

Only non-rejected items go into `approved_rewrites` (`conversation_manager.py:1150–1154`). Rejected items stay in audit only and are never applied to content.

**Criterion 3 — Edited rewrites use user's text:** ✅ Pass

When `outcome == 'edit'`, `approved_entry['proposed'] = final_text` (`conversation_manager.py:1153`), so the user's text replaces the LLM proposal before `apply_approved_rewrites` is called.

**Criterion 4 — Audit completeness:** ✅ Pass

All proposals (not just accepted) are added to `audit` list (`conversation_manager.py:1143–1148`). The audit record includes `outcome` and `final` fields for every item.

**US-R6 Acceptance Criteria:**
- `rewrite_audit` contains every proposal with outcome/final — ✅ Pass
- Diff between generated text and audit.final = zero unexplained changes — ✅ Pass (constraint validation prevents extra transformations)
- Audit non-empty even when all rejected — ✅ Pass

---

### US-R7: Spell & Grammar Check Quality

**Criterion 1 — No false positives on technical vocabulary:** ✅ Pass

`SpellChecker.check` (`spell_checker.py:210–213`) skips any flagged word that appears (case-insensitively) in `custom_dictionary.json`. `prepopulate_from_skills` (`spell_checker.py:92–103`) pre-seeds the dictionary from skill names.

**Criterion 2 — No false positives on proper nouns:** ✅ Pass (conditional)

Company names and the candidate name will be skipped once added to `custom_dictionary.json`. Pre-population from skills covers technical terms; proper nouns would need explicit addition, which is supported via `add_word`.

**Criterion 3 — Fragment tolerance in bullets:** ✅ Pass

`SUPPRESSED_BULLET_RULES` (`spell_checker.py:30–36`) includes `SENTENCE_FRAGMENT` and `PUNCTUATION_PARAGRAPH`. When `context == 'bullet'`, these rules are skipped (`spell_checker.py:203`).

**Criterion 4 — Skill names treated as words/phrases only:** ✅ Pass

When `context == 'skill'`, only spelling rules are surfaced, not grammar rules (`spell_checker.py:207`). `_is_spelling_rule` filters on morfologik/hunspell/spelling/misspell/typo rule IDs.

**Criterion 5 — Corrections do not alter surrounding text:** ✅ Pass

`_apply_spell_fixes_to_text` (`cv_orchestrator.py:1978–2007`) applies fixes in reverse offset order to prevent position shift, replaces only the exact span `[offset:offset+length]`, and validates the original text at the span before replacing.

**Criterion 6 — Custom dictionary seeded correctly:** ⚠️ Partial

`prepopulate_from_skills` seeds from skill names. However, candidate name and company names from `Master_CV_Data.json` are not automatically pre-seeded. The requirement states "candidate name, companies, key technical terms" should be pre-populated; companies and candidate name require manual `add_word` calls.

**Criterion 7 — Severity calibration:** 🔲 Not Implemented

`SpellChecker.check` returns a flat list of `suggestions` with `message`, `category`, and `rule_id` but no explicit `severity` field (`spell_checker.py:225–235`). Sorting by severity before display is not implemented in the backend; the frontend would need to infer and sort severity from `rule_id` or `category`.

**US-R7 Acceptance Criteria:**
- All custom dict terms produce zero flags — ✅ Pass
- Action-verb bullet produces zero fragment warnings — ✅ Pass
- Skill context entries produce only spelling flags — ✅ Pass
- Accepted corrections change only the flagged span — ✅ Pass
- `custom_dictionary.json` deduplicated on every write — ✅ Pass (`add_word` checks lower-case set before appending)

---

## Generated Materials Evaluation

### Summary Block

The generated professional summary is drawn verbatim from the selected variant in `Master_CV_Data.json` (with possible rewrite applied if user accepted one). There is no system-level validation that the summary opens with role type + years + differentiator, is 4–6 lines, or excludes filler phrases. `check_summary_generic_phrases` exists in the LLM client but is only applied to rewrite proposals, not to the baseline selected summary.

### Skills Section

Skills are organized by category, deduplicated, and ordered by relevance within each category. `candidate_to_confirm` skills are **not filtered out** of the generated DOCX/PDF/HTML. This is the most critical gap in the generated materials: a skill with unverified evidence will silently appear in the final CV documents without any indicator, despite the user seeing a warning badge only during the review step.

### Publications Section

Publications are selected by a recency-biased scoring algorithm. First-author flag (`is_first_author`) is detected but carries no scoring bonus. No per-publication relevance rationale or confidence score is presented to the user. The user can accept/reject each publication in the review tab, but without scores or rationale to guide those decisions.

### Rewrite Traceability

The `metadata.json` generated alongside CV files contains the full `rewrite_audit` with all proposals and their outcomes. This meets the audit trail requirement completely.

### ATS DOCX vs. Human PDF

Both formats are generated from the same `selected_content`. The ATS DOCX path (`_generate_ats_docx`) and the Human PDF path (`_render_cv_html_pdf`) both receive `selected_content` — any `candidate_to_confirm` skill that passed through selection will appear in both generated formats.

---

## Additional Story Gaps / Proposed Story Items

1. **GAP-R1 (HIGH): `candidate_to_confirm` skills must be excluded from generated output.** The `_organize_skills_by_category` function and/or `_select_content_hybrid` should filter skills with `candidate_to_confirm: True` unless the user has explicitly confirmed them via a distinct UI action. Currently they pass silently into the generated document.

2. **GAP-R2 (HIGH): Publication ranking must expose per-item relevance rationale.** The `_select_publications` result should include a relevance score and short rationale (keyword matches, domain alignment, first-author status) surfaced in the Publications review tab alongside the accept/reject controls.

3. **GAP-R3 (MED): Required vs. preferred split needs stronger visual separation in the Analysis tab.** "Required Skills" and "Preferred / Nice-to-Have Skills" should use distinct visual treatment (color-coded badges, section heading with icon, or separate collapsible cards) so the distinction is immediately clear without reading carefully.

4. **GAP-R4 (MED): Domain inference should expose confidence level and prompt when ambiguous.** The Analysis tab should show a confidence indicator next to the inferred domain/role type, and surface a clarifying question when confidence is below a threshold.

5. **GAP-R5 (MED): Keyword frequency weighting missing from ATS scoring.** Keywords appearing in the job title, first paragraph, or repeated multiple times should receive a higher weight multiplier in `calculate_relevance_score`.

6. **GAP-R6 (MED): Custom dictionary should auto-seed candidate name and company names.** `SpellChecker.prepopulate_from_skills` covers technical terms; an additional `prepopulate_from_master_data(master_data)` call should seed candidate name and all company names from master data.

7. **GAP-R7 (LOW): Spell check severity calibration missing.** `SpellChecker.check` should return a `severity` field ('error', 'warning', 'info') on each suggestion, and the spell-check tab UI should sort by severity descending.

8. **GAP-R8 (LOW): Pre-generation page-length estimate should warn during customisation.** The `_estimate_cv_body_pages` method exists but is only used for page-budget retry logic in `_handle_recommend_customizations`. The estimated page count should be surfaced to the user in the Customise tab before generation.

9. **GAP-R9 (LOW): Summary hook quality not validated on stored summaries.** Add a post-selection check that warns when the selected summary opens with "I" or a name, is shorter than 3 lines, longer than 7 lines, or contains known filler phrases.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py

Additional files consulted: web/job-analysis.js, web/skills-review.js, scripts/utils/llm_client.py (grep), scripts/utils/spell_checker.py, web/bundle.js (grep)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-R1 | 1 | 2 | 1 | 1 | 0 |
| US-R2 | 2 | 3 | 1 | 0 | 0 |
| US-R3 | 2 | 1 | 0 | 0 | 4 |
| US-R4 | 0 | 1 | 1 | 1 | 2 |
| US-R5 | 3 | 1 | 1 | 0 | 0 |
| US-R6 | 4 | 0 | 0 | 0 | 0 |
| US-R7 | 5 | 1 | 0 | 1 | 0 |

**Key evidence references:**
- Skill deduplication: `cv_orchestrator.py:503–531` (`_deduplicate_skills`)
- Synonym map: `cv_orchestrator.py:142–160` (`_load_synonym_map`, `canonical_skill_name`)
- Bullet reordering: `cv_orchestrator.py:3209–3219`
- `apply_rewrite_constraints`: `cv_orchestrator.py:1678`
- `candidate_to_confirm` set: `cv_orchestrator.py:1779`; displayed in UI: `skills-review.js:633,663`; NOT filtered in template: `cv-template.html:629`
- Rewrite audit: `conversation_manager.py:1143–1157`, persisted at `cv_orchestrator.py:2194`
- Fragment suppression: `spell_checker.py:30–36, 203`
- Skill context grammar suppression: `spell_checker.py:207`
- Spell fix span precision: `cv_orchestrator.py:1978–2007`
- Publication scoring (recency-biased): `cv_orchestrator.py:3616–3680`
- Post-generation page-count check: `cv_orchestrator.py:5011–5028`
- Summary selection (stored variants only): `cv_orchestrator.py:3395`; no hook quality check on baseline
