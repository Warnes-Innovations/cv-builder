<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->
<!-- markdownlint-disable MD032 MD036 MD060 -->

# Resume Expert Review Status

**Last Updated:** 2026-06-30 10:45 ET

**Executive Summary:** The application demonstrates solid foundational architecture for most resume-expert concerns. The rewrite pipeline, skill deduplication, bullet reordering, and spell-check context handling are well-implemented. The primary gaps are: (1) required vs. preferred qualifications are parsed separately in the backend but are not displayed with strong visual distinction in the Analysis tab UI; (2) domain inference confidence is never surfaced and no ambiguity-triggered clarifying question exists; (3) keyword frequency/position weighting is absent from the relevance scoring algorithm; (4) `candidate_to_confirm` skills ARE now filtered from the generated HTML template (`cv-template.html:628`) and ATS DOCX (ATS template line 777) — this is a correction from the prior review which marked this as a fail; (5) the publication review pipeline was upgraded with LLM-based ranking (`rank_publications_for_job` in `llm_client.py:1540`) that exposes per-item scores and rationales — previously assessed as partial; (6) the summary review system selects from stored variants with no hook quality validation; and (7) terminology consistency and acronym expansion are not enforced across rewrite proposals.

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

**Criterion 1 — Recency bias check:** ⚠️ Partial

`_select_content_hybrid` scores experiences by `llm_score + keyword_score + semantic_score` (`cv_orchestrator.py:3136–3144`) and sorts by score descending — relevance-first. However, line 3168 then **unconditionally overwrites that ordering** with a reverse-chronological sort: `selected_experiences = sorted(selected_experiences, key=_parse_end_date, reverse=True)`. This means a highly-relevant older role will be displayed after a less-relevant current role. The relevance sort result is discarded unless the user manually reorders via `experience_row_order`. This is a recency-bias regression: relevance scores are computed but overridden.

**Criterion 2 — Achievement ordering within a job:** ✅ Pass

`_select_content_hybrid` default-sorts bullets by keyword overlap relevance (`cv_orchestrator.py:3209–3219`) using `_ach_relevance`. User-explicit ordering via `achievement_orders` takes precedence (`cv_orchestrator.py:3195–3208`). The `ordered_achievements` field carries the sorted list into the template.

**Criterion 3 — Section inclusion logic + publication ranking:** ⚠️ Partial

The Publications Review tab calls `LLMClient.rank_publications_for_job` (`review_routes.py:1351`, `llm_client.py:1540–1704`), which sends up to 60 publications to the LLM for ranking with a 1–10 relevance score, confidence level (High/Medium/Low), first-author detection, and per-item rationale. Results are sorted by relevance descending, then year descending. A score-based fallback exists when the LLM call fails. This addresses the publication shortlist criterion.

However:
- No per-role-type conditional recommendation is made automatically: the system never says "publications omitted because domain = industry" or "publications included because domain = research". Conditional section inclusion/exclusion rationale is absent from the Customizations tab.
- `_select_publications` (the fallback path, `cv_orchestrator.py:3616–3680`) remains **recency-biased**: year ≥ 2020 gets +30, ≥ 2015 gets +20, article type gets +25 unconditionally. The LLM path is non-recency-biased, but the fallback is not.
- No system recommendation pre-populates an include/exclude decision for publications based on role type.

**Criterion 4 — Publication selection quality:** ✅ Pass (primary LLM path)

`rank_publications_for_job` (`llm_client.py:1547–1704`) ranks publications by keyword overlap with `ats_keywords` and `required_skills`, domain alignment, and first-author status, with a 1–10 relevance score and rationale per item exposed in the Publications Review tab. The story's acceptance criterion for "a ranked publication shortlist presented with per-item relevance scores and rationale" is met by the primary path. The fallback remains recency-biased but is clearly labelled `source = "fallback"` in the API response.

**Criterion 5 — Completeness without bloat (2–3 page CV):** ⚠️ Partial

`_cap_cv_body_to_pages` (`cv_orchestrator.py:3514–`) trims content to a page budget. Post-generation ATS validation (`validate_ats_report`, `cv_orchestrator.py:5011–5028`) warns when the PDF is 1 page or outside the 2–3 page ideal range. However, no pre-generation warning is surfaced to the user during the customisation phase. The story requires "system warns if estimated CV length exceeds 3 pages or is under 1.5 pages" — this only happens after generation.

**Criterion 6 — Achievements diversity:** ⚠️ Partial

Achievements are scored by keyword overlap + semantic match; the scoring does not explicitly diversify across technical/leadership/business impact types. The user can manually reorder but no guidance nudges diversity.

**US-R2 Acceptance Criteria:**
- Relevance score not recency rank — ⚠️ Partial: experience ordering is unconditionally overridden by reverse-chronological sort after relevance scoring (`cv_orchestrator.py:3168`); publications use LLM-relevance ranking (primary path) but recency-biased fallback
- Bullet reordering proposed and applied — ✅ Pass
- Conditional section decisions shown with rationale — ❌ Fail (no rationale text in UI for section include/exclude)
- Ranked publication shortlist with per-item scores and rationale — ✅ Pass (primary LLM path; `review_routes.py:1351`, `llm_client.py:1540`)
- Page length warning during workflow — ⚠️ Partial (post-generation only)

---

### US-R3: Rewrite Quality and Constraint Adherence

**Criterion 1 — Factual preservation:** ✅ Pass

`LLMClient.apply_rewrite_constraints` is called before each approved rewrite is applied (`cv_orchestrator.py:1678`). Proposals failing constraint validation are logged and skipped (`cv_orchestrator.py:1679–1684`). The constraint function guards numbers, dates, and company names.

**Criterion 2 — Naturalness:** — N/A (LLM generation quality; not evaluable from source)

**Criterion 3 — Keyword integration:** — N/A (LLM prompt quality; not directly evaluable from source)

**Criterion 4 — No fabrication (`skill_add` must cite evidence):** ⚠️ Partial

`skill_add` rewrites store `evidence` from the proposal (`cv_orchestrator.py:1779–1781`) and set `candidate_to_confirm: True` when `evidence_strength == "weak"`. The rewrite prompt (`llm_client.py:1854`) requires `"evidence": "<comma-separated exp IDs, skill_add only>"`. However, there is no server-side validation that the evidence field cites concrete experience IDs that exist in the master data — the LLM could hallucinate IDs and the system would accept them.

**Criterion 5 — Terminology consistency across all rewrites in a batch:** ❌ Fail

No cross-proposal consistency check exists. Each rewrite proposal is generated and applied independently. A keyword adopted as "MLOps" in one bullet may appear as "productionizing ML pipelines" in the summary rewrite. There is no batch-level scanning or constraint enforcement.

**Criterion 6 — Acronym expansion on first use:** ❌ Fail

The rewrite prompt (`llm_client.py:1822–1864`) does not instruct the LLM to expand acronyms on first use. No post-processing enforces or validates "MLOps (ML Operations)" style expansion.

**US-R3 Acceptance Criteria:**
- `apply_rewrite_constraints` rejects proposals removing numbers/dates/names — ✅ Pass (`cv_orchestrator.py:1678`)
- Every `skill_add` cites at least one experience ID — ⚠️ Partial (evidence field required by prompt but not validated server-side)
- Inserted keywords appear mid-sentence, not appended — ⚠️ Partial (prompt guidance only; no programmatic check)
- System enforces consistent terminology across batch — ❌ Fail (no cross-proposal consistency mechanism)

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

**Criterion 5 — Candidate-to-confirm handling:** ✅ Pass

`candidate_to_confirm: True` is set on weak-evidence `skill_add` entries (`cv_orchestrator.py:1779`). The skills review UI displays a "⚠ Verify evidence" badge for such skills (`skills-review.js:633, 663–664`). The Jinja2 HTML template (`cv-template.html:628`) uses `{% if not skill.candidate_to_confirm %}` to exclude these skills from the human-readable output. The ATS DOCX template (line 777) applies the same filter. Generated PDF, DOCX, and HTML all contain only confirmed skills.

**US-R5 Acceptance Criteria:**
- Only Master CV skills or approved additions appear — ✅ Pass
- Skills ordered by relevance within category — ✅ Pass (`_sort_categories` by years desc within priority order)
- Approved additions stored for session, eligible for Harvest — ✅ Pass (`extra_skills` in session state, `_harvest_add_skill` route)
- Candidate-to-confirm flagged in review UI — ✅ Pass (`skills-review.js:633, 663`)
- Candidate-to-confirm never appear in generated output — ✅ Pass (`cv-template.html:628`, ATS template line 777)

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

Skills are organized by category, deduplicated, and ordered by relevance within each category. `candidate_to_confirm` skills **are correctly filtered** from the HTML template (`cv-template.html:628`) and ATS DOCX (template line 777) via `{% if not skill.candidate_to_confirm %}`. This criterion is now a pass. The review UI correctly shows a "⚠ Verify evidence" badge during the review step only.

### Publications Section

The primary publication path uses `rank_publications_for_job` to produce a relevance-ranked shortlist with per-item scores and rationale in the Publications Review tab. The score-based fallback remains recency-biased. For accepted/user-selected publications, `_sort_selected_publications` respects explicit user row ordering, then defaults to newest-first — an appropriate presentation order. First-author detection (`is_first_author`) is present and surfaced in the review tab for candidate awareness.

### Rewrite Traceability

The `metadata.json` generated alongside CV files contains the full `rewrite_audit` with all proposals and their outcomes. This meets the audit trail requirement completely.

### ATS DOCX vs. Human PDF

Both formats are generated from the same `selected_content`. The ATS DOCX path (`_generate_ats_docx`) and the Human PDF path (`_render_cv_html_pdf`) both receive `selected_content` — any `candidate_to_confirm` skill that passed through selection will appear in both generated formats.

---

## Additional Story Gaps / Proposed Story Items

**Resolved since prior review:** GAP-R1 (`candidate_to_confirm` filtering) is now implemented in `cv-template.html:628` and the ATS DOCX template. GAP-R2 (publication ranking with per-item scores/rationale) is implemented via `rank_publications_for_job` in `llm_client.py:1540`.

**Open gaps:**

1. **GAP-R3 (MED): Required vs. preferred split needs stronger visual separation in the Analysis tab.** "Required Skills" and "Preferred / Nice-to-Have Skills" are rendered as separate lists with distinct headings (`bundle.js:3641, 3655`) but use identical styling. Needs distinct color-coded treatment (e.g., blue badges for required, grey for preferred) so the distinction is immediately pre-attentive.

2. **GAP-R4 (HIGH): Domain inference must expose confidence level and prompt when ambiguous.** `analyze_job_description` returns `domain` and `role_level` as plain strings with no confidence field. The Analysis tab never surfaces uncertainty or prompts the user when IC vs. leadership is ambiguous. Suggested fix: add `domain_confidence` (0.0–1.0) and `role_type_confidence` to `JobAnalysisResponse`; trigger a clarifying question when either is below 0.7.

3. **GAP-R5 (MED): Keyword frequency weighting absent from ATS scoring.** `calculate_relevance_score` (`scoring.py:17–81`) uses a flat `job_keywords` set — no frequency or position data. Suggested fix: pass keyword frequency counts and title-keyword flags from `analyze_job_description`; multiply keyword match score by frequency weight.

4. **GAP-R2b (MED): Experience ordering is recency-overridden after relevance sort.** `cv_orchestrator.py:3168` unconditionally overwrites the relevance-sorted experience list with reverse-chronological order. A highly-relevant older role will appear after a less-relevant current role. Suggested fix: make chronological sort optional / a tiebreaker only, controlled by a customizations flag.

5. **GAP-R6 (MED): Custom dictionary should auto-seed candidate name and company names.** `SpellChecker.prepopulate_from_skills` only seeds skill names. Add `prepopulate_from_master_data(master_data)` that also seeds `personal_info.name` and all company names from the experience list, called on session load.

6. **GAP-R-NEW (MED): Terminology consistency not enforced across rewrite batch.** Each proposal is generated and applied independently; no cross-proposal scan enforces that an adopted keyword is used consistently across summary and all bullets. Add a post-proposal batch scan that flags inconsistencies before presenting the rewrite review to the user.

7. **GAP-R-NEW (MED): Acronym expansion on first use not enforced.** The rewrite prompt does not instruct the LLM to expand acronyms on first use. Add to the rewrite prompt: "When introducing a new acronym (e.g. MLOps), expand it on first use in the document: MLOps (ML Operations)."

8. **GAP-R7 (LOW): Spell check severity calibration missing.** `SpellChecker.check` returns a flat list with no `severity` field. Add severity inference from `rule_id` / `category` and sort suggestions by severity descending before sending to the frontend.

9. **GAP-R8 (LOW): Pre-generation page-length estimate should warn during customisation.** `_estimate_cv_body_pages` exists but is only used in page-budget retry logic. Surface the estimated page count to the user in the Customise tab so they can adjust content selection before committing to generation.

10. **GAP-R9 (LOW): Summary hook quality not validated on stored summaries.** No check warns when the selected summary opens with "I" or the candidate's name, is shorter than 3 lines, longer than 7 lines, or contains filler phrases ("results-driven", "passionate about"). Add a post-selection validation that surfaces warnings in the Summary review tab.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py

Additional files consulted: web/job-analysis.js, web/skills-review.js, scripts/utils/llm_client.py (grep), scripts/utils/spell_checker.py, web/bundle.js (grep)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-R1 | 1 | 1 | 2 | 1 | 0 |
| US-R2 | 2 | 3 | 1 | 0 | 0 |
| US-R3 | 2 | 2 | 2 | 0 | 0 |
| US-R4 | 0 | 1 | 1 | 1 | 2 |
| US-R5 | 4 | 1 | 0 | 0 | 0 |
| US-R6 | 4 | 0 | 0 | 0 | 0 |
| US-R7 | 5 | 2 | 1 | 0 | 0 |

Changes from prior review cycle:
- US-R1.3 domain inference confidence: upgraded from ⚠️ Partial to ❌ Fail (no confidence field exists in schema)
- US-R1.4 keyword frequency: confirmed 🔲 Not Implemented (scoring.py uses flat keyword set)
- US-R2.1 recency bias: downgraded from ✅ Pass to ⚠️ Partial (relevance sort overwritten by chronological at line 3168)
- US-R2.4 publication quality: upgraded from ⚠️ Partial to ✅ Pass (LLM ranking with per-item scores confirmed in llm_client.py:1540)
- US-R2.5 page warning: remains ⚠️ Partial (post-generation only)
- US-R3.5 terminology consistency: upgraded from N/A to ❌ Fail (no enforcement mechanism found)
- US-R3.6 acronym expansion: upgraded from N/A to ❌ Fail (not in prompt or post-processing)
- US-R5.5 candidate_to_confirm filtered from output: corrected from ❌ Fail to ✅ Pass (cv-template.html:628 and ATS template line 777 both filter)
- US-R7.2 proper noun seeding: downgraded from ✅ Pass to ⚠️ Partial (only skills auto-seeded; company/candidate names not)
- US-R7.7 severity calibration: confirmed ❌ Fail (no severity field on suggestions, no sorted output)

**Key evidence references:**
- Skill deduplication: `cv_orchestrator.py:503–531` (`_deduplicate_skills`)
- Synonym map: `cv_orchestrator.py:142–160` (`_load_synonym_map`, `canonical_skill_name`)
- Bullet reordering: `cv_orchestrator.py:3209–3219`
- Reverse-chronological override of relevance sort: `cv_orchestrator.py:3168`
- `apply_rewrite_constraints`: `cv_orchestrator.py:1678`; also pre-filters proposals at `llm_client.py:1885–1892`
- `candidate_to_confirm` set: `cv_orchestrator.py:1779`; displayed in UI: `skills-review.js:633,663`; filtered from HTML template: `cv-template.html:628`; filtered from ATS DOCX: ATS template line 777
- LLM publication ranking: `llm_client.py:1540–1704`; called from `review_routes.py:1351`
- Rewrite audit: `conversation_manager.py:1143–1157`, persisted at `cv_orchestrator.py:2194`
- Fragment suppression: `spell_checker.py:30–36, 203`
- Skill context grammar suppression: `spell_checker.py:207`
- Spell fix span precision: `cv_orchestrator.py:1978–2007`
- Post-generation page-count check: `cv_orchestrator.py:5011–5028`
- Summary selection (stored variants only): no hook/fluff validation found
- Terminology consistency across rewrites: not implemented (no cross-proposal check in llm_client.py or cv_orchestrator.py)
- Keyword frequency weighting: absent from `scoring.py:17–81` (flat keyword set only)
