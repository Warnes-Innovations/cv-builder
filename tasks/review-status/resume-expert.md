<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD036 MD060 -->

# Resume Expert Review Status

**Last Updated:** 2026-04-20 17:30 ET

**Executive Summary:** Source-verified review against all resume-expert acceptance criteria. Three formerly-failing stories (US-R3, US-R4, US-R7) are elevated to Partial due to confirmed implementations of word-level diff rendering, AI summary generation with refinement, and full LanguageTool pipeline. All seven stories remain Partial — no story has reached full Pass. Primary blockers: no synonym grouping in analysis UI, default experience display is recency-ordered (not relevance-ordered), no batch-level terminology consistency enforcement, no automated rewrite-audit closed-loop verification, and uncertain spell-audit write-back to final generated content.

---

## Application Evaluation

**Reviewed against:** web/app.js, web/review-table-base.js, web/ats-modals.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/summary-review.js, web/publications-review.js, web/rewrite-review.js, web/spell-check.js, web/finalise.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/routes/review_routes.py, tasks/current-implemented-workflow.md

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | --------- | ----------- | -------- | ------------ | ------- |
| US-R1 | 0 | 3 | 0 | 1 | 0 |
| US-R2 | 0 | 5 | 0 | 1 | 0 |
| US-R3 | 0 | 3 | 0 | 3 | 0 |
| US-R4 | 0 | 2 | 0 | 3 | 0 |
| US-R5 | 0 | 3 | 0 | 2 | 0 |
| US-R6 | 0 | 3 | 0 | 1 | 0 |
| US-R7 | 0 | 4 | 0 | 3 | 0 |

### US-R1: Job Description Analysis Quality

- ✅ **Required vs preferred split**: `populateAnalysisTab` (web/review-table-base.js) renders "Required Skills" as a colored pill grid and "Preferred / Nice-to-Have" as a separate bulleted list. Evidence: web/review-table-base.js `populateAnalysisTab`, sections "🎯 Required Skills" and "⭐ Preferred / Nice-to-Have".
- ⚠️ **Keyword deduplication via synonyms**: A synonym map (`scripts/data/synonym_map.json`) resolves aliases in ATS scoring (exposed via `/api/synonym-map`), but the analysis UI (web/review-table-base.js, web/ats-modals.js) does NOT group or label synonym pairs visually. Users see ML and Machine Learning as separate entries in the keyword display. Acceptance criterion "Synonyms and acronym/expansion pairs grouped" is unmet in the UI.
- ⚠️ **Keyword frequency weighting**: ATS keywords are rank-ordered (#1, #2, … badges rendered in `populateAnalysisTab`), implying the LLM assigned priority order. No UI label explains that these are frequency-weighted vs position-weighted. Evidence: web/review-table-base.js lines producing `kw-rank` spans.
- 🔲 **Domain inference confidence**: Domain is shown as a meta-chip badge (`🔬 ${data.domain}`). No confidence level is displayed. No "ambiguous domain → prompt user" pathway exists. Acceptance criterion "domain inference presented with confidence level; ambiguous cases prompt user" is not implemented.

**Story verdict: ⚠️ Partial** — required/preferred split ✅; synonym grouping in UI absent; domain confidence absent.

---

### US-R2: Content Selection Strategy

- ⚠️ **Recency bias in experience display**: `buildExperienceReviewTable` (web/experience-review.js:83–89) sorts experiences by `start_date` descending on first load — explicitly recency-ordered. The pane description text confirms: "Sorted by date (most recent first)." LLM `Emphasize/Include/De-emphasize/Omit` recommendations correct for this, but the default visual ordering still privileges recency. Acceptance criterion "relevance score, not recency rank" is met at the recommendation level but not at the initial sort order.
- ✅ **Bullet reordering proposed and applied**: `bullet_order` in recommendations includes suggested order, ATS impact, reasoning, and page-length impact. A reorder button (↕) appears in every experience row. Evidence: web/experience-review.js:155–168, `bulletOrderSummary` and `reorder` action handling.
- ✅ **Publications ranked shortlist**: `buildPublicationsReviewTable` (web/publications-review.js) renders each publication with `relevance_score` (0–10), `confidence` badge (High/Medium/Low), per-item `rationale`, `is_first_author` marker, `venue_warning`, and a recommended/not-recommended divider. Non-recommended publications are pre-excluded but visible. Evidence: web/publications-review.js, table columns Rank/Citation/Year/1st★/Score/Confidence/Reasoning/Include.
- ✅ **Page-length warning surfaced during customization**: A page-estimate widget lives in the experiences-review pane (`_updatePageEstimate`, web/review-table-base.js), calling `/api/cv/layout-estimate`. `page_length_warning` is propagated in review and layout responses. Evidence: web/review-table-base.js `page_length_warning`, web/layout-instruction.js:485,583,625.
- ⚠️ **Conditional section decisions**: Publications appear/disappear based on availability and are accompanied by relevance rationale. Other optional sections (Languages, Awards) do not have a UI panel showing inclusion/exclusion rationale. Acceptance criterion for "conditional section decisions shown with rationale" is partially met.
- 🔲 **Achievement diversity check**: No code checks whether the selected achievements span technical, leadership, and business impact types. Achievements are sorted by recommendation + importance score only. Evidence: web/achievements-review.js:127–133.

**Story verdict: ⚠️ Partial** — publication ranking and page estimate ✅; recency bias in initial sort; no diversity check.

---

### US-R3: Rewrite Quality and Constraint Adherence

- ✅ **Factual preservation (`apply_rewrite_constraints`)**: Static method is implemented, tested against 8 edge cases (numbers, dates, company names). Evidence: tests/test_llm_client.py:76–125.
- ✅ **Word-level diff rendering**: `computeWordDiff` + `renderDiffHtml` in web/rewrite-review.js:138–220 produce LCS-based inline diff; removed tokens shown as `<del>`, added tokens as `<ins>`. Keywords-introduced pills rank-ordered by position.
- ⚠️ **skill_add evidence flagging**: `evidence_strength` field tracked; `⚠ Candidate to confirm` badge rendered for `evidence_strength === 'weak'` proposals (web/rewrite-review.js:219–220). Orchestrator sets `candidate_to_confirm` flag (scripts/utils/cv_orchestrator.py:1486). However, no UI displays which specific experience ID evidences the skill addition; the acceptance criterion "every skill_add proposal cites at least one experience ID" is met at the backend data level but not surfaced to the reviewer.
- 🔲 **Terminology consistency (batch-wide)**: No code enforces that an introduced keyword (e.g., "MLOps") is consistently applied across summary, bullets, and skills section in the same batch. Relies entirely on LLM prompt intent.
- 🔲 **Keyword integration position (mid-sentence, not appended)**: Word diff helps users spot appended keywords, but no programmatic rule rejects proposals where the introduced keyword appears as a sentence-final appendage.
- 🔲 **Acronym expansion enforcement**: No code enforces "both forms on first use" (e.g., "MLOps (ML Operations)").

**Story verdict: ⚠️ Partial** — constraints ✅ and weak-badge ✅; consistency, placement, and expansion enforcement absent.

---

### US-R4: Professional Summary Effectiveness

- ✅ **Role-specific AI generation**: `buildSummaryFocusSection` calls `POST /api/generate-summary` with job context. A refinement-prompt textarea allows iterative requests ("Make it more concise", "Emphasise leadership", etc.). Cached `ai_generated` variant auto-loaded or regenerated. Evidence: web/summary-review.js.
- ✅ **Stored variants accessible**: Up to N stored summary variants from `Master_CV_Data.json` are rendered as radio buttons in a collapsible `<details>` panel; AI-generated is the primary/pre-selected path. Evidence: web/summary-review.js `_renderStoredSummaryRadios`.
- 🔲 **Opening-line quality validation**: No code evaluates whether the generated opening contains role type + years experience + differentiator. Enforced only by LLM prompt intent.
- 🔲 **Anti-fluff detection**: No regex or classifier rejects "results-driven", "passionate about", etc. from generated summaries.
- 🔲 **Length enforcement (4–6 lines)**: No UI or backend validation checks that the generated summary is 4–6 lines.

**Story verdict: ⚠️ Partial** — AI generation and stored-variants ✅; no output quality validation.

---

### US-R5: Skills Section Optimisation

- ✅ **Master-only skills; approved additions via harvest**: Skills come from `Master_CV_Data.json`; session additions eligible for master write-back only via explicit `POST /api/harvest/apply` during finalisation. Evidence: AGENTS.md, .github/copilot-instructions.md.
- ✅ **candidate_to_confirm never in generated output**: `cv_orchestrator.py:1486` sets the `candidate_to_confirm` flag; `PROJECT_SPECIFICATION.md` line 725 states the rewrite-review badge "is UI-only, not in generated output." Generated PDF/DOCX/HTML contain only unmarked skill text.
- ✅ **Group/category customization**: `saveSkillGroupOverride`, `saveSkillCategoryOverride`, `renameSkillCategory`, `saveSkillCategoryOrder` endpoints all present in web/skills-review.js backed by `/api/review-skill-*` routes.
- ⚠️ **Role-relevance ordering**: LLM provides grouping suggestions (category/group change recommendations in `_buildGroupingSuggestion`), but skills are not auto-re-sorted by role relevance. User must manually reorder. Acceptance criterion "skills ordered by relevance within each category" is advisory, not automatic.
- ⚠️ **Density without redundancy**: Subskill parenthetical grouping (`_skillInlineLabel`) prevents some redundancy. No UI warning when two entries are likely synonyms (e.g., "Python" and "Python 3"). `_buildGroupWarnings` flags overcrowded groups (≥5 skills or ≥90 chars) but not semantic duplicates.

**Story verdict: ⚠️ Partial** — master-only and candidate_to_confirm output handling ✅; relevance auto-sort and redundancy detection absent.

---

### US-R6: Rewrite Audit Traceability

- ✅ **rewrite_audit in metadata.json**: Present in all completed-session files; structure includes outcome (`accept`/`reject`/`edit`) and `final` text field. Note: field is `final` in code, not `final_text` as stated in the story acceptance criteria — documented in .github/copilot-instructions.md:88 (commit `576b75f`).
- ✅ **Rejected rewrites use original text**: Orchestrator skips non-accepted rewrites in final output construction. Approved rewrites keyed on proposal ID. Evidence: scripts/utils/cv_orchestrator.py:1483–1486, conversation_manager.py.
- ✅ **Edited rewrites use user text**: `final` field in audit stores user-edited text. Edit flow in web/rewrite-review.js restores decisions on tab re-navigation. Evidence: web/rewrite-review.js applyRewriteAction + saveRewriteEdit.
- 🔲 **Closed-loop verification (generated text ↔ audit.final = zero unexplained diff)**: No automated diff check between generated CV text and `rewrite_audit[*].final` values is performed. This acceptance criterion is aspirational only.

**Story verdict: ⚠️ Partial** — audit structure and rejection/edit handling ✅; closed-loop diff verification absent.

---

### US-R7: Spell & Grammar Check Quality

- ✅ **LanguageTool checking with context**: `populateSpellCheckTab` iterates sections, sends `{ text, context }` per section to `/api/spell-check` (web/spell-check.js:64–73). Context type is included so backend can apply context-specific rules.
- ✅ **Custom dictionary in use**: `custom_dict_size` returned in responses; custom dictionary terms contribute to suppressions. Stats summary shows "custom dictionary matches" count.
- ⚠️ **Fragment suppression in bullet context**: Context type `bullet` is defined in the applicant story and sent in section payloads, but backend enforcement of "no sentence-fragment warnings for bullet context" is not confirmed from available route source. `tasks/user-story-applicant.md:199` specifies the behaviour; backend implementation unverified in this review pass.
- ⚠️ **Proper-noun / technical-term seeding**: Custom dictionary exists; whether it is pre-seeded from `Master_CV_Data.json` (candidate name, company names, technical terms) on first run is not confirmed from available route source.
- ⚠️ **Severity calibration**: Stats summary (section count, word count, unknown words, grammar issues) is rendered; individual suggestions are rendered in order received from LanguageTool. No explicit re-sort by severity before display. Evidence: web/spell-check.js `renderSpellSuggestions`.
- 🔲 **skill_name context: spelling only, no grammar rules**: Context type `skill_name` defined in applicant story; backend enforcement of "grammar rules suppressed for skill_name" unverified in this review pass.
- 🔲 **Accepted corrections change only flagged span**: Accepted corrections update the section text; no evidence of span-precise write-back isolating exactly the flagged character range.
- 🔲 **Custom dictionary deduplication on write**: Not confirmed in available source.

**Story verdict: ⚠️ Partial** — LanguageTool pipeline ✅; fragment/skill_name context enforcement and span-precise write-back unverified.

---

## Generated Materials Evaluation

⚠️ Partial. Generated CVs benefit from ranked publication curation, experience bullet reordering, candidate_to_confirm exclusion from output, and audit-based rewrite tracking. However, summary output quality (opening-line structure, anti-fluff, length) is not validated post-generation; spell-audit write-back to final content is uncertain (known GAP-08/issue #49); and no automated post-generation audit verifies that generated text matches accepted rewrite decisions. Evidence: web/publications-review.js, web/summary-review.js, web/spell-check.js, scripts/utils/cv_orchestrator.py, tasks/ui-gap-implementation-plan.md:204.

---

## Additional Story Gaps / Proposed Story Items

- **GAP (HIGH)**: Spell-audit write-back to generated content is unreliable — preview generation may read a stale session key (`state.spell_check.audit`) rather than the completed `state.spell_audit` (tasks/ui-gap-implementation-plan.md:204, GAP-08/issue #49). Add a regression test that verifies accepted spell corrections appear in the final rendered HTML.
- **GAP (HIGH)**: Synonym grouping absent from analysis UI — synonyms are resolved internally for ATS scoring but users see "ML" and "Machine Learning" as two separate items in the keyword display. Add a grouped display with canonical ↔ alias annotation.
- **GAP (HIGH)**: Default experience sort is recency, not relevance. Consider displaying a relevance-ordered view as an option alongside the recency-ordered view, or promote the LLM recommendation strength as a secondary sort key.
- **GAP (MEDIUM)**: Domain inference confidence not surfaced. Add a confidence chip next to the domain badge; when confidence is below a threshold (e.g., < 0.6), prompt the user to confirm or correct the inferred domain before recommendations are generated.
- **GAP (MEDIUM)**: Rewrite audit closed-loop verification absent. Post-generation, compare generated CV text against `rewrite_audit[*].final` to confirm zero unexplained changes. Add this as a background consistency check that surfaces in the finalise tab.
- **Proposed story US-R8**: Summary output quality gate — before advancing from summary review, validate that the accepted summary is 4–6 lines, does not contain banned filler phrases ("results-driven", "passionate about"), and contains at least 3 of the top-5 ATS keywords.
- **Proposed story US-R9**: Skill evidence display — for every `skill_add` rewrite proposal, display the cited experience IDs and their titles so the reviewer can confirm the evidence is credible before accepting.

---

**Reviewed against:** web/app.js, web/ats-modals.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/summary-review.js, web/publications-review.js, web/rewrite-review.js, web/spell-check.js, web/finalise.js, web/review-table-base.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/routes/review_routes.py, scripts/data/synonym_map.json, tasks/current-implemented-workflow.md, tasks/user-story-resume-expert.md

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | --------- | ----------- | -------- | ------------ | ------- |
| US-R1 | 0 | 3 | 0 | 1 | 0 |
| US-R2 | 0 | 4 | 0 | 2 | 0 |
| US-R3 | 0 | 3 | 0 | 3 | 0 |
| US-R4 | 0 | 2 | 0 | 3 | 0 |
| US-R5 | 0 | 3 | 0 | 2 | 0 |
| US-R6 | 0 | 3 | 0 | 1 | 0 |
| US-R7 | 0 | 3 | 0 | 4 | 0 |

**Key evidence references:**
- web/review-table-base.js `populateAnalysisTab` — required/preferred split, keyword rank badges
- web/ats-modals.js `_renderAnalysisIntoEl` — modal view of required/preferred/keywords
- web/experience-review.js:83–89 — recency-based default sort (first load)
- web/publications-review.js — ranked publication table with relevance_score, confidence, rationale
- web/rewrite-review.js:138–220 — word-level LCS diff; keyword pills; weak-badge for skill_add
- web/summary-review.js — AI-generated summary + refinement + stored variants
- web/spell-check.js — LanguageTool pipeline, context field, custom_dict_size stats
- scripts/data/synonym_map.json — synonym resolution exists in backend, not exposed in analysis UI
- scripts/utils/cv_orchestrator.py:1486 — candidate_to_confirm flag, excluded from output per PROJECT_SPECIFICATION.md:725
- .github/copilot-instructions.md:88 — rewrite audit field is `final` in code (not `final_text`)
- tasks/ui-gap-implementation-plan.md:204 — spell-audit key mismatch (GAP-08/issue #49)

**Evidence standard:** Every conclusion supported by source evidence above.
