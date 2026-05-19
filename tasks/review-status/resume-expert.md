<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD036 MD060 -->

# Resume Expert Review Status

**Last Updated:** 2026-04-22 16:30 ET

**Executive Summary:** Source-verified review against all resume-expert acceptance criteria. US-R7 (Spell & Grammar Check Quality) is substantially upgraded this cycle: five criteria previously marked Not Implemented are now confirmed Pass after verifying `scripts/utils/spell_checker.py`, `scripts/routes/review_routes.py`, and `scripts/utils/cv_orchestrator.py`. GAP-08 (spell-audit write-back key mismatch) is confirmed resolved — spell corrections flow end-to-end into generated content. US-R1 through US-R6 are unchanged from the previous review; primary open gaps remain synonym grouping in analysis UI, recency-biased default experience sort, batch-level terminology consistency, and rewrite-audit closed-loop verification.

---

## Application Evaluation

**Reviewed against:** web/app.js, web/review-table-base.js, web/ats-modals.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/summary-review.js, web/publications-review.js, web/rewrite-review.js, web/spell-check.js, web/finalise.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/routes/review_routes.py, scripts/utils/spell_checker.py, tasks/current-implemented-workflow.md

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | --------- | ----------- | -------- | ------------ | ------- |
| US-R1 | 0 | 3 | 0 | 1 | 0 |
| US-R2 | 0 | 4 | 0 | 2 | 0 |
| US-R3 | 0 | 3 | 0 | 3 | 0 |
| US-R4 | 0 | 2 | 0 | 3 | 0 |
| US-R5 | 0 | 3 | 0 | 2 | 0 |
| US-R6 | 0 | 3 | 0 | 1 | 0 |
| US-R7 | 6 | 1 | 0 | 0 | 0 |

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

- ✅ **LanguageTool checking with context**: `populateSpellCheckTab` iterates sections, sends `{ text, context }` per section to `/api/spell-check` (web/spell-check.js:64–73). Context type is included so backend applies context-specific rules.
- ✅ **Fragment tolerance in bullet context**: `SUPPRESSED_BULLET_RULES` frozenset in `scripts/utils/spell_checker.py:30–35` includes `SENTENCE_FRAGMENT`, `PUNCTUATION_PARAGRAPH`, `UPPERCASE_SENTENCE_START`, `WORD_CONTAINS_UNDERSCORE`, and `EN_UNPAIRED_BRACKETS`. Applied at `spell_checker.py:202`: `if context == 'bullet' and rule_id in self.SUPPRESSED_BULLET_RULES: continue`. Experience achievement bullets are given `context='bullet'` in `review_routes.py` (~line 1860).
- ✅ **skill context: grammar rules suppressed**: `spell_checker.py:207–208` applies `if context == 'skill' and not self._is_spelling_rule(m): continue`. All skill, education, certification, language, award, and publication sections receive `context='skill'` from `review_routes.py:1678`.
- ✅ **Custom dictionary pre-seeded from Master_CV_Data.json**: `_prepopulate_spell_dict()` at `review_routes.py:79–154` collects candidate name, title, company names, job titles, education institutions, degree fields, award titles, certification names/issuers, language names, and skill names, then calls `_spell_checker.prepopulate_from_skills(all_names)` before building sections. Called on every `GET /api/spell-check-sections` request.
- ✅ **Custom dictionary deduplication on write**: `spell_checker.py:84–88` — `add_word()` builds a lowercase set of existing words and skips adding if the lowercased candidate is already present.
- ✅ **Accepted corrections change exactly and only the flagged span**: `cv_orchestrator._apply_spell_fixes_to_text()` at `cv_orchestrator.py:1686–1706` processes fixes in reverse offset order, validates `current_span == original` before applying, and replaces exactly `updated[offset:offset + length]`.
- ⚠️ **Severity calibration**: `stats` summary (section count, word count, unknown words, grammar issues) is rendered; individual suggestions are rendered in the order received from LanguageTool. No explicit re-sort by severity is applied before display in `renderSpellSuggestions` (web/spell-check.js:167–240). Critical misspellings are not guaranteed to surface before minor stylistic suggestions.

**Story verdict: ⚠️ Partial** — six of seven acceptance criteria now confirmed Pass; severity calibration (sort by severity before display) remains missing.

---

## Generated Materials Evaluation

⚠️ Partial. Generated CVs benefit from ranked publication curation, experience bullet reordering, `candidate_to_confirm` exclusion from output, audit-based rewrite tracking, and — as of this review cycle — confirmed end-to-end spell-correction write-back. The formerly-open GAP-08 (spell-audit key mismatch) is resolved: `submitSpellCheckDecisions` sends `_spellSugMap` entries to `/api/spell-check-complete`, backend stores them in `state['spell_audit']`, and `cv_orchestrator.apply_accepted_spell_fixes` applies span-precise corrections before generation (evidence: web/spell-check.js:376–399, cv_orchestrator.py:1501–1706). Remaining gaps: summary output quality (opening-line structure, anti-fluff phrases, length) is not validated post-generation; no automated post-generation audit verifies that generated text matches accepted rewrite decisions; severity calibration in spell suggestions is absent.

---

## Additional Story Gaps / Proposed Story Items

- **GAP (HIGH) — OPEN**: Synonym grouping absent from analysis UI — synonyms are resolved internally for ATS scoring but users see "ML" and "Machine Learning" as two separate items in the keyword display. Add a grouped display with canonical ↔ alias annotation in `populateAnalysisTab` (web/review-table-base.js:210+).
- **GAP (HIGH) — OPEN**: Default experience sort is recency, not relevance (`experience-review.js:87–92`). Consider displaying a relevance-ordered view alongside the recency-ordered view, or promote LLM recommendation strength as a secondary sort key.
- **GAP (MEDIUM) — OPEN**: Domain inference confidence not surfaced. The domain badge shows only the inferred value (`web/review-table-base.js:241`); no confidence score or "ambiguous domain → prompt user" pathway exists.
- **GAP (MEDIUM) — OPEN**: Rewrite audit closed-loop verification absent. Post-generation, no code compares generated CV text against `rewrite_audit[*].final` to confirm zero unexplained changes.
- **GAP (LOW) — RESOLVED**: Spell-audit write-back to final generated content (formerly GAP-08/issue #49). Confirmed resolved: span-precise `apply_accepted_spell_fixes` flows through generation pipeline (cv_orchestrator.py:1501–1706, web/spell-check.js:345–399).
- **Proposed story US-R8**: Summary output quality gate — before advancing from summary review, validate that the accepted summary is 4–6 lines, does not contain banned filler phrases ("results-driven", "passionate about"), and contains at least 3 of the top-5 ATS keywords.
- **Proposed story US-R9**: Skill evidence display — for every `skill_add` rewrite proposal, display the cited experience IDs and their titles so the reviewer can confirm the evidence is credible before accepting. (Evidence field in rewrite card at web/rewrite-review.js:254 shows `r.evidence` text but not structured experience IDs.)

---

**Reviewed against:** web/app.js, web/ats-modals.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/summary-review.js, web/publications-review.js, web/rewrite-review.js, web/spell-check.js, web/finalise.js, web/review-table-base.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/routes/review_routes.py, scripts/utils/spell_checker.py, scripts/data/synonym_map.json, tasks/current-implemented-workflow.md, tasks/user-story-resume-expert.md

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | --------- | ----------- | -------- | ------------ | ------- |
| US-R1 | 0 | 3 | 0 | 1 | 0 |
| US-R2 | 0 | 4 | 0 | 2 | 0 |
| US-R3 | 0 | 3 | 0 | 3 | 0 |
| US-R4 | 0 | 2 | 0 | 3 | 0 |
| US-R5 | 0 | 3 | 0 | 2 | 0 |
| US-R6 | 0 | 3 | 0 | 1 | 0 |
| US-R7 | 6 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- web/review-table-base.js `populateAnalysisTab` — required/preferred split, keyword rank badges, domain badge (no confidence)
- web/ats-modals.js `_renderAnalysisIntoEl` — modal view of required/preferred/keywords
- web/experience-review.js:87–92 — recency-based default sort (first load)
- web/publications-review.js — ranked publication table with relevance_score, confidence, rationale
- web/rewrite-review.js:219–254 — word-level LCS diff; keyword pills; weak-badge for skill_add; r.evidence text shown but not structured experience IDs
- web/summary-review.js — AI-generated summary + refinement + stored variants; no quality gate
- web/spell-check.js:64–73 — context-aware LanguageTool invocation per section
- web/spell-check.js:376–399 — `submitSpellCheckDecisions` sends `_spellSugMap` to `/api/spell-check-complete`
- scripts/utils/spell_checker.py:30–35 — `SUPPRESSED_BULLET_RULES` frozenset (SENTENCE_FRAGMENT etc.)
- scripts/utils/spell_checker.py:207–208 — skill context: grammar rules suppressed
- scripts/utils/spell_checker.py:84–88 — `add_word()` lowercase deduplication
- scripts/utils/spell_checker.py:92–100 — `prepopulate_from_skills()` method
- scripts/routes/review_routes.py:79–154 — `_prepopulate_spell_dict()` populates dict from master data (name, companies, skills, institutions, certs, languages)
- scripts/routes/review_routes.py:1666–1900 — `spell_check_sections` assigns correct context per section type (`'bullet'` for achievements, `'skill'` for everything else)
- scripts/utils/cv_orchestrator.py:1501–1706 — `apply_accepted_spell_fixes` + `_apply_spell_fixes_to_text`: span-precise, reverse-order, original-validation corrections
- scripts/utils/cv_orchestrator.py:1486 — `candidate_to_confirm` flag; excluded from output
- .github/copilot-instructions.md:88 — rewrite audit field is `final` in code (not `final_text`)
- scripts/data/synonym_map.json — synonym resolution exists in backend, not exposed in analysis UI

**Evidence standard:** Every conclusion is supported by evidence sufficient for another reviewer to verify it independently.
