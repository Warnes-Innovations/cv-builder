<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->
<!-- markdownlint-disable MD036 MD060 -->

# Resume Expert Review Status

**Last Updated:** 2026-06-22 12:00 ET

**Executive Summary:** The application earns 15 Pass, 10 Partial, and 2 Fail across the seven story groups. The two hard failures are keyword-frequency weighting (US-R1 AC4) and cross-rewrite terminology consistency (US-R3 AC4) — both structural gaps that require new code, not prompt tuning. The most consequential single defect is that `candidate_to_confirm` skills (weak-evidence `skill_add` proposals) bypass all generated-output filters and appear unmarked in every PDF, DOCX, and HTML file. The spell/grammar subsystem and the rewrite audit trail are the strongest areas; the job-analysis display layer has unresolved visual inconsistency. No source-code changes relevant to this persona occurred between the Cycle 5 review (2026-06-20) and this refresh (2026-06-22); ratings and evidence are unchanged.

---

## Application Evaluation

### US-R1: Job Description Analysis Quality

**AC1 — Required vs. preferred displayed in visually distinct sections**

⚠️ Partial — The Analysis tab (`ats-modals.js:282–293`) renders `required_skills` under `<h4>Required Skills</h4>` with green/red pill chips and `preferred_skills` under `<h4>Preferred / Nice-to-have</h4>` as a separate list — visually distinct. The conversation-panel card rendered immediately after job analysis (`message-queue.js:215–229`) renders all three groups (`required_skills`, `preferred_skills`, `nice_to_have_requirements`) as plain icon-prefixed `<h4>` headings inside a single unstyled `div.content.job-analysis` with no background colour, border colour, or CSS-class distinction. Users see the conversation card first; the two-panel inconsistency remains open.

**AC2 — Synonyms and acronym/expansion pairs grouped**

⚠️ Partial — `cv_orchestrator.py:503–531` (`_deduplicate_skills`) deduplicates using `canonical_skill_name` backed by `synonym_map.json`. This operates at the render/generation layer only. The LLM `ats_keywords` array returned by `analyze_job_description` (`llm_client.py:276–323`) is displayed raw in both the conversation-panel chip list (`message-queue.js:230–235`) and the Analysis tab keyword badges (`ats-modals.js:298–301`). Synonym pairs such as `"ML"` and `"Machine Learning"` can appear as separate ATS keyword entries.

**AC3 — Domain inference presented with confidence level; ambiguous cases prompt the user**

⚠️ Partial — `job_analysis` JSON exposes `domain` and `role_level` and these appear in the Analysis tab header block (`ats-modals.js:272`). The LLM schema (`llm_client.py:299–310`) has no `domain_confidence` field. Ambiguous domain inferences do not trigger clarification. The post-analysis questions (`conversation_manager.py:654–713`) target experience-emphasis and positioning, not domain ambiguity.

**AC4 — Keyword frequency weighting (title, first paragraph, repeated appearances)**

❌ Fail — `analyze_job_description` prompt (`llm_client.py:281–310`) requests `ats_keywords` as a flat list of "top 10 keywords" with no instruction to weight by position or repetition count. The ATS keyword rank badges in the UI are positional (list order). No preprocessing counts keyword occurrences or boosts title-line or repeated-mention keywords before or after the LLM call.

---

### US-R2: Content Selection Strategy

**AC1 — Relevance score based on semantic + keyword match, not recency rank**

✅ Pass — `build_render_ready_content` (`cv_orchestrator.py:3130–3145`) computes `llm_score + keyword_score + semantic_score` per experience. The conversation system prompt (`conversation_manager.py:417`) explicitly states recommendation level "IS ABOUT HOW RELEVANT THE EXPERIENCE IS TO THE JOB, NOT CONFIDENCE." Final output ordering is reverse-chronological only after relevance sorting is applied and the user has not manually reordered.

**AC2 — Bullet reordering proposed and applied within each experience entry**

✅ Pass — Per-experience bullet ordering defaults to keyword-overlap relevance (`cv_orchestrator.py:3209–3219`); user drag-to-reorder overrides via `achievement_orders` in customizations (`cv_orchestrator.py:3186–3224`). The Experience Bullets tab provides UI for manual reordering.

**AC3 — Conditional section decisions (Publications, Languages, Awards) shown with rationale**

⚠️ Partial — Publications: the Publications review tab shows LLM `rationale`, `relevance_score`, and `confidence` per item (`publications-review.js:108–150`). Languages and Awards have no per-section rationale UI — they are included or excluded wholesale by the customizations dict with no explanation surfaced to the user.

**AC4 — Ranked publication shortlist with per-item relevance scores and rationale**

✅ Pass — `llm_client.py:1537–1666` (`rank_publications_for_job`) produces per-item `relevance_score` (1–10), `confidence` (High/Medium/Low), and `rationale`. The publications table (`publications-review.js:82–150`) displays rank column, score badge, confidence badge, and reasoning column. Recommended publications are pre-selected; non-recommended are pre-excluded with a divider. Score-based fallback is used when LLM fails.

**AC5 — System warns if estimated CV length exceeds 3 pages or is under 1.5 pages**

✅ Pass — `cv_orchestrator.py:5014–5028` checks `page_count` against `ideal_min` (default 2), `ideal_max` (default 3), and `absolute_max` (default 4). A 1-page CV triggers `warn`. A CV exceeding `absolute_max` triggers `fail`. Warning propagates through the ATS report API and renders in the ATS report tab. Note: the story threshold is 1.5 pages; the implementation threshold is 2.0 pages (more conservative).

**AC6 — Selected Achievements represent diverse impact types appropriate to the role**

⚠️ Partial — `recommend_customizations` LLM prompt includes achievement recommendations with relevance reasoning (`llm_client.py:573–596`). No diversity constraint (technical / leadership / business balance) exists in the prompt or in the scoring pipeline. A heavily keyword-matched role can produce an all-technical achievement selection.

---

### US-R3: Rewrite Quality and Constraint Adherence

**AC1 — `apply_rewrite_constraints` rejects proposals that remove numbers, dates, or company names**

✅ Pass — `LLMClient.apply_rewrite_constraints` (`llm_client.py:913–961`) extracts numeric tokens (`\d[\d,\.]*%?`) and Title-Case proper nouns (filtered against a stop-word list). It asserts `original_tokens.issubset(proposed_tokens)` for both sets. Called before each rewrite is applied at `cv_orchestrator.py:1678`. Violations cause the original text to be preserved with a logged warning.

**AC2 — Every `skill_add` proposal cites at least one experience ID as evidence**

⚠️ Partial — The LLM rewrite schema includes an `evidence` field (`llm_client.py:736–747`). `apply_approved_rewrites` (`cv_orchestrator.py:1776–1790`) stores the `evidence` value in the new skill dict. No validation enforces `evidence` is non-empty before the `skill_add` is accepted; an empty or absent `evidence` field produces a skill entry with no source citation. The `⚠ Verify evidence` badge in the skills review UI indicates the gap (`skills-review.js:663`), but the backend does not gate on it.

**AC3 — Inserted keywords appear mid-sentence, not appended**

⚠️ Partial — The LLM summary prompt (`llm_client.py:833, 854`) and rewrite instructions prohibit keyword appending and require natural integration. No programmatic check validates keyword placement in the returned text. Persuasion checks (`check_strong_action_verb`, `_check_generic_summary`) do not test for end-of-sentence keyword appending.

**AC4 — Introduced keywords are consistent across all rewrites in a batch**

❌ Fail — Each rewrite proposal is generated independently by `propose_rewrites` (`llm_client.py:722–870`). No post-processing pass extracts newly introduced terminology from accepted proposals and checks other proposals in the same batch for inconsistency. A summary rewrite and a bullet rewrite can apply different phrasing for the same underlying concept.

---

### US-R4: Professional Summary Effectiveness

**AC1 — Proposed summary is role-specific (different from stored variants unless good match)**

✅ Pass — Summary rewrite is generated per-job via `propose_rewrites` after job analysis and customizations are applied. The LLM receives the full `professional_summaries` variants from master data as context. The rewrite prompt (`llm_client.py:844–863`) instructs a job-specific output distinct from boilerplate.

**AC2 — Opening sentence contains role type + years experience + differentiator**

⚠️ Partial — The summary prompt (`llm_client.py:850`) was updated (GAP-163) to require "a value-identity statement: strong verb + differentiating value claim (e.g. 'Drives 3× revenue growth…', 'Builds ML pipelines that…') — NOT a title + years-of-experience formula." This explicitly removes years-of-experience from the opening, which diverges from the user story's three-element requirement (role type + years + differentiator). The new approach produces a stronger industry hook but the literal story acceptance criterion is not met. No structural validation of any opening formula exists in code.

**AC3 — System does not inject "results-driven" or similar filler**

✅ Pass — `LLMClient._GENERIC_FILLER_PHRASES` (`llm_client.py:1037–1061`) includes `'results-driven'`, `'passionate about'`, `'dynamic professional'`, and 17 other phrases. `_check_generic_summary` (`llm_client.py:1372–1402`) flags them in persuasion checks. The rewrite prompt explicitly prohibits them at `llm_client.py:854`.

---

### US-R5: Skills Section Optimisation

**AC1 — Only skills from `Master_CV_Data.json` (or explicitly approved additions) appear in output**

✅ Pass — `build_render_ready_content` selects skills from `master_data` via `session_view.normalized_skills()`. The `skill_add` path (`cv_orchestrator.py:1776–1790`) adds only user-approved proposals. No hallucination path exists: skills not in master data or user-approved extra skills cannot reach the template.

**AC2 — Skills ordered by relevance within each category group**

⚠️ Partial — `_sort_categories` (`cv_orchestrator.py:564–580`) sorts within each category by `(-x.get('years', 0), x.get('name', ''))`: years-of-experience descending, then alphabetical. Job-relevance weighting is not applied within categories. A high-relevance skill with fewer years (e.g., 5 years Python for a Python-required role) can appear below a low-relevance skill with more years (e.g., 20 years SAS).

**AC3 — Approved additional skills eligible for Harvest write-back only (not automatic)**

✅ Pass — Session-added skills are stored in `state['extra_skills']` (`conversation_manager.py:113`). Write-back to `Master_CV_Data.json` is an explicit user action in the Harvest tab; there is no automatic write-back path.

**AC4 — Candidate-to-confirm items clearly flagged in skills review UI; never appear in generated output documents**

⚠️ Partial — The review-UI flag is present: `skills-review.js:633,663–665` renders a red `⚠ Verify evidence` badge for any skill where `candidate_to_confirm === true`. The generated-output exclusion requirement is **not met**: `_organize_skills_by_category` (`cv_orchestrator.py:583–595`) does not filter on `candidate_to_confirm`. All skills, including weak-evidence additions with `candidate_to_confirm: True`, flow through `_sort_categories` and into `skills_by_category` at line 207. The template (`templates/cv-template.html`) renders `skill.display_name` with no guard on `candidate_to_confirm`. Weak-evidence skills approved in the review UI appear identically to verified skills in generated PDF, DOCX, and HTML files.

---

### US-R6: Rewrite Audit Traceability

**AC1 — `rewrite_audit` contains an entry for every proposal with `outcome: accept|reject|edit` and `final` text**

✅ Pass — `submit_rewrite_decisions` (`conversation_manager.py:1138–1148`) iterates all decisions and appends every entry — including rejections — to the `audit` list unconditionally before storing. `self.state['rewrite_audit'] = audit` at line 1157. The `rewrite-review.js` submit gate enforces that all proposals receive a decision before submission, ensuring the audit is complete.

**AC2 — Diff between generated CV text and `rewrite_audit.final` values = zero unexplained changes**

— N/A (requires runtime verification against an actual generated CV; cannot be confirmed from static analysis alone)

**AC3 — Audit non-empty even when all rewrites are rejected**

✅ Pass — As established in AC1, `submit_rewrite_decisions` appends every proposal entry unconditionally regardless of outcome. An all-rejected scenario produces a fully populated audit recording all rejections with `outcome: 'reject'` and `final: null`.

---

### US-R7: Spell & Grammar Check Quality

**AC1 — All terms in `custom_dictionary.json` produce zero flags**

✅ Pass — `spell_checker.py:194–213`: for each LanguageTool match, `flagged = text[m.offset:m.offset+m.errorLength]`; if `_normalize_word(flagged)` appears in `custom_lower` (the lower-cased custom word set), the match is skipped and `stats['custom_dict_hits']` is incremented. No custom-dict term can reach the suggestion list.

**AC2 — A bullet beginning with a strong action verb produces zero fragment warnings**

✅ Pass — `spell_checker.py:30–36` defines `SUPPRESSED_BULLET_RULES` as a frozenset including `'SENTENCE_FRAGMENT'`, `'PUNCTUATION_PARAGRAPH'`, `'UPPERCASE_SENTENCE_START'`, `'WORD_CONTAINS_UNDERSCORE'`, and `'EN_UNPAIRED_BRACKETS'`. When `context == 'bullet'`, any match whose `ruleId` is in this frozenset is skipped at `spell_checker.py:203–204`.

**AC3 — `skill_name` context entries produce only spelling flags, never grammar flags**

✅ Pass — `spell_checker.py:207–208`: when `context == 'skill'`, any match where `_is_spelling_rule(m)` returns False is filtered out. `_is_spelling_rule` checks for `morfologik`, `hunspell`, `spelling`, `misspell`, or `typo` in the rule ID or category (`spell_checker.py:145–151`). Non-spelling grammar rules are suppressed.

**AC4 — Accepted corrections change exactly and only the flagged span in the source text**

✅ Pass — `apply_accepted_spell_fixes` (`cv_orchestrator.py:1800–1980`) groups accepted fixes by `section_id`, then processes each group in reverse offset order so earlier spans do not shift later spans. Only the exact `[offset:offset+length]` region is replaced with the accepted suggestion.

**AC5 — `custom_dictionary.json` is deduplicated on every write; no duplicate entries**

✅ Pass — `add_word` (`spell_checker.py:80–90`) builds `lower = {w.lower() for w in self._custom_words}` and guards `if word.lower() not in lower` before appending. `prepopulate_from_skills` (`spell_checker.py:92–103`) uses the same `lower` set guard. No write path can introduce duplicate entries.

**AC6 — Severity-sorted flags (critical errors before minor suggestions)**

⚠️ Partial (finding C4-2, open) — `spell_checker.py:241` returns suggestions in LanguageTool's native iteration order. No sort pass is applied. The caller (`review_routes.py`) does not reorder by severity before returning the spell-check response. Critical misspellings and minor stylistic suggestions are interleaved in the order LanguageTool emits them.

---

## Generated Materials Evaluation

### Summary rewrite in generated documents

⚠️ Partial — Factual preservation via `apply_rewrite_constraints` (`llm_client.py:913–961`) is enforced at write time. Generic filler detection via `_check_generic_summary` (`llm_client.py:1372–1402`) is active. Acronym expansion (US-R3: "introduced keywords should include both forms on first use") is a prompt-level instruction only; no programmatic verification confirms acronym pairing in proposals before they are accepted. The summary-opening approach changed in GAP-163: the prompt now produces value-claim hooks rather than a title+years+differentiator opening, which is industry-stronger but diverges from the user-story AC.

### Skills section in generated output

❌ Fail — The skills review UI correctly flags `candidate_to_confirm` skills with a red `⚠ Verify evidence` badge (`skills-review.js:633,663`). The generated-output path is unguarded: `candidate_to_confirm: True` skills flow through `_organize_skills_by_category` (`cv_orchestrator.py:583`) and `skills_by_category` into the template at `templates/cv-template.html` without any filtering. Skills approved as "candidate to confirm" during review will appear unmarked in all generated PDF, DOCX, and HTML files.

### Publications in generated output

✅ Pass — LLM-based ranking (`llm_client.py:1537–1666`) with score-based fallback. User decisions from the publications review tab are persisted as `publication_decisions` in session state and applied in `build_render_ready_content` (`cv_orchestrator.py`) before generation. Non-recommended publications excluded by the user are excluded from the rendered output. First-author detection is implemented.

### Spell-check corrections in generated output

✅ Pass — `build_render_ready_content` calls `apply_accepted_spell_fixes` as the final step before template rendering. Only `outcome: 'accept'` entries are applied. Offset-reversed application ensures multi-fix sections are correct.

---

## Additional Story Gaps / Proposed Story Items

1. **Severity-sorted spell-check list** — US-R7 does not include an acceptance criterion for severity ordering, but the story description requires it ("Critical errors surfaced before minor stylistic suggestions"). Add an explicit AC: "The spell-check flag list is sorted by severity: TYPO/MISSPELLING items before grammar suggestions before stylistic tips."

2. **Manual bullet edits bypass audit** (finding C4-1) — When the user edits a bullet directly in the Experience Bullets tab (`_apply_session_achievement_edits` at `cv_orchestrator.py:432`), no audit entry is written to `rewrite_audit`. This is outside the scope of US-R6 as written, but traceability is incomplete. Proposed: "Any direct user edit to an experience bullet or summary that bypasses the rewrite-review flow must generate an audit entry with `outcome: 'direct_edit'` and `final` equal to the user's text."

3. **`skill_add` evidence enforcement** — US-R3 AC2 specifies evidence must be cited. Proposed: Gate the `skill_add` path — reject any `skill_add` proposal where `evidence` is empty or absent, surfacing a validation error in the rewrite review UI rather than silently adding an unevidenced skill.

4. **Summary opening formula vs. value-claim standard** — US-R4 AC2 is in tension with the GAP-163 implementation. Proposed updated AC: "The opening sentence contains a value-identity claim with a strong verb and a quantified differentiator (e.g., 'Drives 40% faster time-to-insight by…'). Years of experience may appear in sentences 2–3 rather than the opening." This aligns the story with the improved prompt while preserving evaluability.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py

Additional files read: scripts/utils/llm_client.py, scripts/utils/spell_checker.py, scripts/routes/review_routes.py, web/skills-review.js, web/publications-review.js, web/ats-modals.js, web/message-queue.js, web/review-table-base.js, templates/cv-template.html

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-R1 | 0 | 3 | 1 | 0 | 0 |
| US-R2 | 4 | 2 | 0 | 0 | 0 |
| US-R3 | 1 | 2 | 1 | 0 | 0 |
| US-R4 | 2 | 1 | 0 | 0 | 0 |
| US-R5 | 3 | 1 | 0 | 0 | 0 |
| US-R6 | 2 | 0 | 0 | 0 | 1 |
| US-R7 | 5 | 1 | 0 | 0 | 0 |
| **Total** | **17** | **10** | **2** | **0** | **1** |

**Key evidence references:**

- US-R1 AC1 (Analysis tab pass): web/ats-modals.js:282–293
- US-R1 AC1 (Conversation card fail): web/message-queue.js:215–229
- US-R1 AC4: scripts/utils/llm_client.py:281–310
- US-R2 AC1: scripts/utils/cv_orchestrator.py:3130–3145; scripts/utils/conversation_manager.py:415–477
- US-R2 AC4: scripts/utils/llm_client.py:1537–1666; web/publications-review.js:82–150
- US-R3 AC1: scripts/utils/llm_client.py:913–961; scripts/utils/cv_orchestrator.py:1678
- US-R3 AC4: scripts/utils/llm_client.py:722–870 (no cross-proposal enforcement)
- US-R4 AC2: scripts/utils/llm_client.py:850 (GAP-163 value-identity opening)
- US-R4 AC3: scripts/utils/llm_client.py:1037–1061, 1372–1402
- US-R5 AC4 (UI pass): web/skills-review.js:633,663–665
- US-R5 AC4 (output fail): scripts/utils/cv_orchestrator.py:583–595; templates/cv-template.html
- US-R6 AC1: scripts/utils/conversation_manager.py:1138–1157
- US-R7 AC1–AC5: scripts/utils/spell_checker.py:80–244; scripts/utils/cv_orchestrator.py:1800–1980
- Spell-check severity gap (C4-2): scripts/utils/spell_checker.py:241

**Evidence standard:** Every conclusion is independently verifiable from the cited source lines. Runtime generation outputs were not analyzed; the generated-output skill-filter gap (US-R5 AC4) is confirmed by the absence of `candidate_to_confirm` filtering in `cv_orchestrator.py:583–595` and the template's unconditional `skill.display_name` rendering.

---

## Open Findings from Prior Cycles

| ID | Finding | Status |
|----|---------|--------|
| C4-1 | Manual achievement edits via `_apply_session_achievement_edits` write no audit record | Open — no fix detected |
| C4-2 | Spell-check suggestions returned in LanguageTool iteration order, not severity order | Open — no fix detected |
| C4-3 | Conversation-panel analysis card lacks visual distinction between required/preferred skills | Open — formalised as US-R1 AC1 ⚠️ |
| US-R5 AC4 | `candidate_to_confirm` skills appear unmarked in generated PDF/DOCX/HTML | Open — highest severity |
