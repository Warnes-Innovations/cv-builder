<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->
<!-- markdownlint-disable MD036 MD060 -->

# Resume Optimisation Expert Review

**Persona:** Certified professional résumé writer / career strategist  
**Date:** 2026-06-18  
**Reviewer:** Claude Sonnet 4.6 (source-first analysis)  
**Story file:** `tasks/user-story-resume-expert.md`  
**Rating key:** ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | — N/A

---

## Section 1: Application Evaluation

### US-R1: Job Description Analysis Quality

**AC1 — Required vs. preferred split displayed in visually distinct sections**

✅ Pass — `web/review-table-base.js:310–330` (`populateAnalysisTab`) renders required skills under `<h2>🎯 Required Skills</h2>` with `.skill-badge` chips, and preferred / nice-to-have items under `<h2>⭐ Preferred / Nice-to-Have</h2>` as an unordered list. The backend `llm_client.py:305–308` explicitly separates `required_skills`, `preferred_skills`, `must_have_requirements`, and `nice_to_have_requirements` in the job-analysis JSON schema.

**AC2 — Synonyms and acronym/expansion pairs grouped**

⚠️ Partial — `cv_orchestrator.py:154–160` (`canonical_skill_name`) and `cv_orchestrator.py:503–531` (`_deduplicate_skills`) do deduplicate skills at render time using `synonym_map.json`. However, deduplication happens only at the skills-render layer; the analysis tab and ATS keyword display do not collapse synonyms. A user reviewing the Analysis tab can still see `"ML"` and `"Machine Learning"` as separate ATS keyword badges (`review-table-base.js:334–341`). The story criterion requires synonyms to be grouped in the displayed keyword list, not just at generation time.

**AC3 — Domain inference presented with confidence level; ambiguous cases prompt the user**

⚠️ Partial — The `job_analysis` JSON includes `domain` and `role_level` (`llm_client.py:300–310`), and these are displayed in the Analysis tab as meta chips (`review-table-base.js:293–295`). However, no confidence level is attached to the domain inference. The analysis schema in `llm_client.py` does not include a `domain_confidence` field. Ambiguous inferences do not produce a clarification prompt to the user; the post-analysis questions (`conversation_manager.py:654–713`) ask about experience emphasis and positioning, not domain ambiguity.

**AC4 — Keyword frequency weighting (title, first paragraph, repeat appearances)**

❌ Fail — The `analyze_job_description` prompt (`llm_client.py:252–316`) asks the LLM to identify `ats_keywords` as a flat list of "top 10 keywords" with no instruction to weight by position or frequency. The ATS keyword list is displayed with rank badges (#1, #2…) based purely on list position (`review-table-base.js:337`), not on derived frequency or positional weight. There is no code that counts keyword occurrences or boosts keywords appearing in the job title or opening paragraph.

---

### US-R2: Content Selection Strategy

**AC1 — Relevance score based on semantic + keyword match, not recency rank**

✅ Pass — `cv_orchestrator.py:3603–3666` (`_select_publications`) does use recency as one component, but the primary content selection (`_select_content_hybrid`) uses `calculate_relevance_score` from `scoring.py` which combines keyword match, semantic similarity, and experience-level alignment. Experience recommendations are driven by the LLM (`llm_client.py:325–825`) with relevance-based reasoning per the system prompt at `conversation_manager.py:415–477`, which explicitly instructs the LLM that recommendation level is "about how relevant the experience is to the job, not recency."

**AC2 — Bullet reordering proposed and applied within each experience entry**

✅ Pass — The LLM recommendations include bullet-level rewrite proposals; the system supports `reorder_bullets` via `POST /api/reorder-bullets` (`review_routes.py:1472`). The Experience Bullets tab (`tab-ach-editor`) provides UI for users to reorder bullets. Ordered achievements are persisted in `selected_exp['ordered_achievements']` (`cv_orchestrator.py:479`).

**AC3 — Conditional section decisions (Publications, Languages, Awards) shown with rationale**

⚠️ Partial — The publications section has full LLM-driven recommendation with per-item rationale visible in the Publications review tab (`publications-review.js:137`). Languages and Awards do not receive the same treatment — they are included/excluded wholesale based on the `customizations` dict without per-section rationale shown to the user. The user story requires all conditional inclusions/exclusions to be shown with rationale.

**AC4 — Ranked publication shortlist with per-item relevance scores and rationale**

✅ Pass — `llm_client.py:1513–1666` (`rank_publications_for_job`) uses the LLM to produce per-publication `relevance_score` (1–10), `confidence` (High/Medium/Low), and `rationale`. The publications review table (`publications-review.js:91–160`) displays rank, score, confidence badge, and reasoning column. A score-based fallback (`review_routes.py:1365–1396`) is used when the LLM call fails, but it provides only `'Medium'` confidence and empty rationale.

**AC5 — System warns if CV length exceeds 3 pages or is under 1.5 pages**

✅ Pass — `generation_routes.py:756–759` (`_page_warning`) returns `True` if `page_count < 2.0 or page_count > 3.0`. This warning propagates to `page_length_warning` in API responses and is rendered in the UI as a yellow or red page-estimate widget (`review-table-base.js:624–654`, `styles.css:1328`). Note: the story warns below 1.5 pages; the implementation warns below 2.0 pages, which is more conservative.

**AC6 — Selected Achievements represent diverse impact types appropriate to the role**

⚠️ Partial — The LLM prompt for `recommend_customizations` includes achievement recommendations with reasoning (`llm_client.py:852–863`). However, there is no explicit diversity constraint in the prompt (technical/leadership/business balance). The LLM is instructed to provide relevance-based reasoning but not to ensure impact-type diversity. A purely keyword-matching LLM call can return achievements all of the same type.

---

### US-R3: Rewrite Quality and Constraint Adherence

**AC1 — `apply_rewrite_constraints` rejects proposals that remove numbers, dates, or company names**

✅ Pass — `llm_client.py:913–961` (`apply_rewrite_constraints`) extracts numeric tokens (`\d[\d,\.]*%?`) and Title-Case proper nouns from both original and proposed text, then asserts the original sets are subsets of the proposed sets. The function is called before each approved rewrite is applied (`cv_orchestrator.py:1678`). Proposals that fail are skipped with a logged warning and the original text is preserved (`cv_orchestrator.py:1679–1684`).

**AC2 — Every `skill_add` proposal cites at least one experience ID as evidence**

⚠️ Partial — The LLM proposal schema in `llm_client.py:736–747` includes an `evidence` field for `skill_add`. The `apply_approved_rewrites` method (`cv_orchestrator.py:1776–1790`) stores `evidence` in the new skill dict. However, there is no validation that `evidence` is non-empty before accepting a `skill_add` proposal. If the LLM returns an empty `evidence` field, the skill is added without any cited source. The story requires enforcement, not just prompting.

**AC3 — Inserted keywords appear mid-sentence, not appended**

⚠️ Partial — The LLM system prompt for rewrites (`llm_client.py:833, 854`) instructs "substitute terminology naturally" and prohibits keyword appending, but this is a prompt-level constraint only. There is no programmatic check that validates keyword placement within the proposed text. The persuasion checks (`llm_client.py:963+`) catch some quality issues (passive voice, weak verbs) but do not test for end-of-sentence keyword appending specifically.

**AC4 — Introduced keywords are consistent across all rewrites in a batch**

❌ Fail — There is no batch-level terminology consistency enforcement. Each rewrite proposal is generated independently, and the LLM may use `"MLOps"` in a bullet and `"productionizing ML pipelines"` in the summary. `propose_rewrites` returns a list of independent proposals (`llm_client.py:722–870`). No post-processing step checks or enforces cross-proposal term consistency. The story criterion is not implemented.

---

### US-R4: Professional Summary Effectiveness

**AC1 — Proposed summary is role-specific (different from stored variants unless good match)**

✅ Pass — The summary rewrite is generated per-job via `propose_rewrites` after job analysis and customizations are applied. The LLM has access to `professional_summaries` stored variants via `master_data` in the system prompt (`conversation_manager.py:484–514`). The system prompt instructs the LLM to use stored summaries only "if a good match exists" (per `llm_client.py:830–860`). Per-session summary rewrites are distinct from master data by design.

**AC2 — Opening sentence is evaluable: contains role type + years experience + differentiator**

⚠️ Partial — The LLM is instructed in the rewrite prompt to produce a strong opening line, and the persuasion check `_check_generic_summary` (`llm_client.py:1355–1385`) detects filler phrases. However, there is no structural validation that the proposed summary opening contains all three elements (role type, years, differentiator). A summary opening with only the role type and a differentiator (no years) would pass all current checks.

**AC3 — System does not inject "results-driven" or similar filler**

✅ Pass — `llm_client.py:1036–1052` defines `_GENERIC_FILLER_PHRASES` including `'results-driven'`, `'passionate about'`, `'dynamic professional'`, etc. The `_check_generic_summary` persuasion check flags these phrases with `'severity': 'warn'` when more than one is found, and the rewrite prompt at line 833 explicitly instructs "No generic filler (e.g. 'passionate', 'results-driven', 'hard-working')."

---

### US-R5: Skills Section Optimisation

**AC1 — Only skills from `Master_CV_Data.json` (or explicitly approved additions) appear in output**

✅ Pass — `build_render_ready_content` (`cv_orchestrator.py:2296–2327`) selects content from `master_data` via `_select_content_hybrid`, then applies only approved rewrites (`apply_approved_rewrites`). The `skill_add` path (`cv_orchestrator.py:1776–1790`) adds only skills that appear in the user-approved `approved_rewrites` list. Skills are not injected from any other source.

**AC2 — Skills ordered by relevance within each category group**

⚠️ Partial — `cv_orchestrator.py:564–580` (`_sort_categories`) sorts skills within each category by `(-years, name)` — most years of experience first, alphabetically as tiebreaker. This is years-based ordering, not job-relevance ordering. The category ordering itself follows a variant-based priority list (`standard`, `technical`, `academic`), which is role-type relevant but not per-skill relevance-scored. The story requires relevance-to-target-role ordering within each category.

**AC3 — Approved additional skills eligible for Harvest write-back only (not automatic)**

✅ Pass — Extra skills added during session (`conversation_manager.py:113`) are stored in `state['extra_skills']` and are session-scoped. Write-back to `Master_CV_Data.json` is handled only through the Harvest workflow tab (`tab-harvest`), which is an explicit, separate user action. There is no automatic write-back path.

**AC4 — Candidate-to-confirm items clearly flagged in skills review UI; never appear in generated output**

❌ Fail — The `candidate_to_confirm` flag is set in `cv_orchestrator.py:1779` for weak-evidence `skill_add` proposals. However, examining the skills review UI (`web/skills-review.js`) and the template rendering path, there is **no visual indicator** (asterisk, footnote, or distinct badge) for `candidate_to_confirm` skills in the review UI. Searching `web/` (excluding `bundle.js`) finds zero references to `candidate_to_confirm` in any rendering code. Furthermore, nothing in the template rendering or DOCX generation pipeline strips `candidate_to_confirm: True` entries from the output — the skill is added to `content['skills']` and processed identically to confirmed skills. Both the UI flag requirement and the output-exclusion requirement are unimplemented.

---

### US-R6: Rewrite Audit Traceability

**AC1 — `rewrite_audit` contains an entry for every proposal with `outcome` and `final` text**

⚠️ Partial — `rewrite_audit` is persisted to `metadata.json` at generation time (`cv_orchestrator.py:2182`). The session state tracks `rewrite_audit` (`conversation_manager.py:101`). The spell-check module sets `entry.outcome = 'accept'` or `'reject'` (`spell-check.js:286, 306, 319`). The rewrite-review UI tracks `dec.outcome` (`rewrite-review.js:319`). However, the audit record is populated from `approved_rewrites` (accepted only) plus the session's `rewrite_audit` list. **Rejected proposals are not guaranteed to appear in `rewrite_audit`** — the `_handle_submit_rewrites` path records only `approved_count` and `rejected_count` totals, not individual rejected proposal records.

**AC2 — Diff between generated CV text and `rewrite_audit.final` values = zero unexplained changes**

— N/A (requires runtime verification against an actual generated CV; cannot be confirmed from static analysis)

**AC3 — Audit non-empty even when all rewrites are rejected**

❌ Fail — From `rewrite-review.js:361`, the count tracks accepted proposals. There is no code path that appends a rejected proposal to `rewrite_audit` with `outcome: 'reject'`. If a user rejects all proposals and proceeds to generation, `rewrite_audit` in `metadata.json` will be an empty list (`cv_orchestrator.py:2182` uses `rewrite_audit or []`), violating this acceptance criterion.

---

### US-R7: Spell & Grammar Check Quality

**AC1 — All terms in `custom_dictionary.json` produce zero flags**

✅ Pass — `spell_checker.py:194–213` builds `custom_lower` from the dictionary and skips any flagged word whose normalized form appears in it (`stats['custom_dict_hits'] += 1; continue`). Terms in the dictionary will not produce suggestion entries.

**AC2 — Bullet beginning with a strong action verb produces zero fragment warnings**

✅ Pass — `spell_checker.py:30–36` defines `SUPPRESSED_BULLET_RULES` including `'SENTENCE_FRAGMENT'` and `'PUNCTUATION_PARAGRAPH'`. When `context == 'bullet'`, these rules are skipped (`spell_checker.py:203`). Action-verb-led bullets will not trigger fragment warnings.

**AC3 — `skill_name` context entries produce only spelling flags, never grammar flags**

✅ Pass — `spell_checker.py:206–208`: when `context == 'skill'`, the checker filters out any match that is not a spelling rule via `_is_spelling_rule(m)`. Grammar flags are suppressed for skill context.

**AC4 — Accepted corrections change exactly and only the flagged span in the source text**

✅ Pass — `cv_orchestrator.py:1803–1980` (`apply_accepted_spell_fixes`) groups accepted fixes by `section_id` and applies them in reverse-offset order. Applying in reverse order ensures that accepting one fix does not shift the offset of other spans. Only the exact flagged span is replaced.

**AC5 — `custom_dictionary.json` is deduplicated on every write; no duplicate entries**

✅ Pass — `spell_checker.py:81–90` (`add_word`): before appending a new word, it builds `lower = {w.lower() for w in self._custom_words}` and checks `if word.lower() not in lower`. Only new words are appended. `prepopulate_from_skills` (`spell_checker.py:92–103`) does the same check. All write paths are duplicate-safe (note: pre-existing duplicates in an externally edited file are not removed on load, but no write path can introduce them).

---

## Section 2: Generated Materials Evaluation

**Note:** The generated-materials evaluation is based on the code paths that produce output. Runtime confirmation against actual generated files is required for full verification.

### Summary rewrite in generated documents

⚠️ Partial — Factual preservation via `apply_rewrite_constraints` is enforced. The `_check_generic_summary` persuasion check detects filler. However, acronym expansion (US-R3 AC6: "introduced keywords should include both forms on first use") is a prompt-level instruction only. There is no programmatic verification that `"MLOps (ML Operations)"` form is used on first occurrence in the output HTML or DOCX.

### Skills section in generated output

❌ Fail — `candidate_to_confirm: True` skills flow through `_organize_skills_by_category` and into the template without any filtering or notation. Weak-evidence skill additions approved by the user will appear identically to verified skills in the generated PDF, DOCX, and HTML. The story requires these to be excluded from all generated documents.

### Publications in generated output

✅ Pass — The publication selection pipeline uses LLM-based ranking with a score-based fallback. User decisions from the publications review tab are persisted as `publication_decisions` and applied before generation. Non-recommended publications excluded by the user are excluded from the rendered output.

### Spell-check corrections in generated output

✅ Pass — `build_render_ready_content` (`cv_orchestrator.py:2324`) calls `apply_accepted_spell_fixes` as the final step before template rendering. Only `outcome: 'accept'` entries are applied; rejected suggestions retain the original text.

---

## Terminology Review

| Term used in UI | Assessment |
|---|---|
| "Required Skills" (Analysis tab) | Clear — matches story intent |
| "Preferred / Nice-to-Have" (Analysis tab) | Clear — distinct section, unambiguous |
| "ATS Keywords" with rank badges | Appropriate — rank implies priority |
| "Candidate to confirm" (internal state only) | **Never shown to user** — missing from UI entirely |
| "Evidence" field in `skill_add` proposals | Not surfaced in the skills review UI |
| "Rationale" column in publications table | Clear and useful |
| "Confidence" badge (High/Medium/Low) | Clear for publications; absent for domain inference |

---

## Summary Table

| Story | Criterion | Rating |
|---|---|---|
| US-R1 | Required/preferred visually distinct | ✅ |
| US-R1 | Synonyms grouped | ⚠️ |
| US-R1 | Domain inference with confidence | ⚠️ |
| US-R1 | Keyword frequency weighting | ❌ |
| US-R2 | Relevance score not recency-based | ✅ |
| US-R2 | Bullet reordering proposed and applied | ✅ |
| US-R2 | Conditional section decisions with rationale | ⚠️ |
| US-R2 | Ranked publication shortlist | ✅ |
| US-R2 | Page length warning | ✅ |
| US-R2 | Achievement diversity | ⚠️ |
| US-R3 | `apply_rewrite_constraints` guards numbers/names | ✅ |
| US-R3 | `skill_add` requires evidence | ⚠️ |
| US-R3 | Keywords appear mid-sentence | ⚠️ |
| US-R3 | Cross-rewrite terminology consistency | ❌ |
| US-R4 | Summary is role-specific | ✅ |
| US-R4 | Opening sentence evaluable | ⚠️ |
| US-R4 | No filler phrases | ✅ |
| US-R5 | Skills only from master or approved additions | ✅ |
| US-R5 | Skills ordered by relevance within category | ⚠️ |
| US-R5 | Extra skills Harvest-only write-back | ✅ |
| US-R5 | Candidate-to-confirm flagged in UI + excluded from output | ❌ |
| US-R6 | Audit contains all proposals with outcome | ⚠️ |
| US-R6 | Audit non-empty when all rejected | ❌ |
| US-R7 | Custom dict produces zero flags | ✅ |
| US-R7 | Bullet fragment suppression | ✅ |
| US-R7 | Skill context grammar suppression | ✅ |
| US-R7 | Accepted correction changes exact span only | ✅ |
| US-R7 | Dictionary deduplicated on write | ✅ |

**Totals:** 14 ✅ Pass | 9 ⚠️ Partial | 4 ❌ Fail | 0 🔲 Not Implemented

---

## Priority Findings (Top 5)

### 1. `candidate_to_confirm` skills appear unmarked in all generated output (US-R5 AC4)

**Severity: High.**  
Weak-evidence `skill_add` proposals flagged `candidate_to_confirm: True` in `cv_orchestrator.py:1779` flow through `_organize_skills_by_category` and into the generated PDF, DOCX, and HTML without any visual distinction or exclusion. The user story requires these to (a) be visually flagged in the review UI, and (b) never appear in generated documents. Neither requirement is met. A candidate who approves a suggested skill "for review purposes" will unknowingly send it in submitted materials.

**Fix needed:** In the skills review UI, add a `⚠*` badge for `candidate_to_confirm` entries with a tooltip/footnote explaining they need confirmation. In `build_render_ready_content`, filter `content['skills']` to exclude any entry where `candidate_to_confirm: True` before passing to the template renderer.

### 2. Rejected rewrites absent from `rewrite_audit` (US-R6 AC3)

**Severity: High.**  
The rewrite audit is incomplete — only accepted proposals are reliably recorded. If the user rejects all rewrites, `rewrite_audit` in `metadata.json` will be empty, making the output untraceable. The story requires an audit entry for every proposal regardless of outcome.

**Fix needed:** In the rewrite-review submission handler, append every proposal to `rewrite_audit` with `outcome: 'accept'`, `'reject'`, or `'edit'` and the `final` text (original text for rejected, user-edited text for `edit`).

### 3. No cross-rewrite terminology consistency enforcement (US-R3 AC4)

**Severity: High.**  
Rewrites are proposed and reviewed independently. There is no mechanism to ensure that an adopted keyword (e.g., `"MLOps"`) appears consistently across all proposals in the same batch. A summary rewrite and a bullet rewrite can use different phrasing for the same concept.

**Fix needed:** After the LLM returns a batch of proposals, run a post-processing pass that extracts newly introduced terminology from accepted proposals and checks all other proposals in the batch for inconsistency. Alternatively, include the full accepted batch in a follow-up LLM terminology-normalisation pass before final generation.

### 4. Keyword frequency weighting absent from job analysis (US-R1 AC4)

**Severity: Medium.**  
The `ats_keywords` list is presented with positional rank badges but the rank is simply the LLM's list order, not a computed frequency/position weight. Keywords appearing in the job title or repeated multiple times in the posting are not systematically weighted higher.

**Fix needed:** Add a preprocessing step after the raw job text is received — count keyword occurrences and detect title-line keywords. Pass these counts to the LLM prompt as a weighted frequency table, or post-process the LLM's keyword list by boosting items that appear in the job title or opening paragraph.

### 5. Skills ordered by years-of-experience, not job relevance (US-R5 AC2)

**Severity: Medium.**  
`_sort_categories` (`cv_orchestrator.py:564`) sorts within each category by `(-years, name)`. A candidate's longest-held skill (e.g., `"SAS"`, 20 years) will appear before a highly relevant newer skill (e.g., `"Python"`, 5 years) even when the target job is a Python role. The story requires relevance-to-target-role ordering within each category.

**Fix needed:** Pass `job_analysis.required_skills` and `ats_keywords` into `_sort_categories` and boost skills that appear in those lists before non-matching skills. Years-of-experience can remain as a secondary tiebreaker within the matched set.
