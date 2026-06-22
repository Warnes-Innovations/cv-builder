<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->
<!-- markdownlint-disable MD036 MD060 -->

# Resume Optimisation Expert Review

**Persona:** Certified professional résumé writer / career strategist  
**Date:** 2026-06-20 (Cycle 5 update)  
**Reviewer:** Claude Sonnet 4.6 (source-first analysis)  
**Story file:** `tasks/user-story-resume-expert.md`  
**Rating key:** ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | — N/A

---

## Section 1: Application Evaluation

### US-R1: Job Description Analysis Quality

**AC1 — Required vs. preferred split displayed in visually distinct sections**

⚠️ Partial — **Cycle 5 update (retains prior split verdict):** The analysis tab (`review-table-base.js`) renders required skills under `<h2>🎯 Required Skills</h2>` with `.skill-badge` chips and preferred under `<h2>⭐ Preferred / Nice-to-Have</h2>` as a distinct list. This tab-level rendering passes. However, the conversation-panel card (`message-queue.js:215–229`) renders all three groups (`required_skills`, `preferred_skills`, `nice_to_have_requirements`) as plain icon-differentiated headings inside a single unstyled card — no background colour, no border distinction, no CSS class differentiation. Users see the conversation card first (immediately after job analysis) before the analysis tab is populated. The two-panel inconsistency introduced in Cycle 4 finding C4-3 is confirmed still present. The analysis tab earns ✅; the conversation card earns ❌; overall rating remains ⚠️ Partial.

**AC2 — Synonyms and acronym/expansion pairs grouped**

⚠️ Partial — `cv_orchestrator.py:503–531` (`_deduplicate_skills`) deduplicates using `canonical_skill_name` and `synonym_map.json` at the render/generation layer. The analysis tab ATS keyword badge list (`review-table-base.js`) and the conversation-panel ATS keyword chips (`message-queue.js:230–235`) still display the raw LLM output, which is not deduplicated. Users can see `"ML"` and `"Machine Learning"` as separate badges.

**AC3 — Domain inference presented with confidence level; ambiguous cases prompt the user**

⚠️ Partial — `job_analysis` JSON includes `domain` and `role_level` and these are displayed in the Analysis tab. No `domain_confidence` field exists in the LLM schema (`llm_client.py:252–316`). Ambiguous inferences do not trigger a user clarification. The post-analysis questions (`conversation_manager.py:654–713`) ask about experience emphasis, not domain ambiguity.

**AC4 — Keyword frequency weighting (title, first paragraph, repeat appearances)**

❌ Fail — `analyze_job_description` prompt (`llm_client.py:252–316`) requests `ats_keywords` as a flat list of "top 10 keywords" with no position or frequency weighting instruction. The ATS keyword rank badges in the UI are based on list order only. No preprocessing counts keyword occurrences or boosts title-line or repeated-mention keywords. No change from Cycle 4.

---

### US-R2: Content Selection Strategy

**AC1 — Relevance score based on semantic + keyword match, not recency rank**

✅ Pass — Content selection uses `calculate_relevance_score` from `scoring.py` (keyword + semantic + experience-level alignment). The LLM recommendation system prompt at `conversation_manager.py:415–477` explicitly instructs that recommendation level is "about how relevant the experience is to the job, not recency." No change from prior cycles.

**AC2 — Bullet reordering proposed and applied within each experience entry**

✅ Pass — `POST /api/reorder-bullets` (`review_routes.py:1472`); ordered achievements persisted in `selected_exp['ordered_achievements']` (`cv_orchestrator.py:479`). The Bullets tab provides UI for reordering. No change from prior cycles.

**AC3 — Conditional section decisions (Publications, Languages, Awards) shown with rationale**

⚠️ Partial — Publications have full LLM-driven per-item rationale in the Publications review tab. Languages and Awards are included/excluded wholesale from the `customizations` dict with no per-section rationale shown to the user. No change from Cycle 4.

**AC4 — Ranked publication shortlist with per-item relevance scores and rationale**

✅ Pass — `llm_client.py:1513–1666` (`rank_publications_for_job`) produces per-item `relevance_score`, `confidence`, and `rationale`. Publications review table displays rank, score, confidence badge, and reasoning column. Score-based fallback used on LLM failure. No change from Cycle 4.

**AC5 — System warns if CV length exceeds 3 pages or is under 1.5 pages**

✅ Pass — `generation_routes.py:756–759` (`_page_warning`) triggers when `page_count < 2.0 or page_count > 3.0`. Warning propagates to `page_length_warning` in API response and renders in UI. Note: story threshold is 1.5 pages; implementation threshold is 2.0 pages (more conservative). No change from Cycle 4.

**AC6 — Selected Achievements represent diverse impact types appropriate to the role**

⚠️ Partial — `recommend_customizations` LLM prompt includes achievement recommendations with relevance reasoning (`llm_client.py:852–863`). No explicit diversity constraint (technical / leadership / business balance) is in the prompt. A keyword-dominated call can return achievements all of the same type. No change from Cycle 4.

---

### US-R3: Rewrite Quality and Constraint Adherence

**AC1 — `apply_rewrite_constraints` rejects proposals that remove numbers, dates, or company names**

✅ Pass — `LLMClient.apply_rewrite_constraints` (`llm_client.py:913–961`) extracts numeric tokens and Title-Case proper nouns, then asserts originals are subsets of the proposed set. Called before each rewrite is applied (`cv_orchestrator.py:1678`). Constraint violations cause the original text to be preserved. No change from Cycle 4.

**AC2 — Every `skill_add` proposal cites at least one experience ID as evidence**

⚠️ Partial — The LLM schema includes an `evidence` field (`llm_client.py:736–747`). `apply_approved_rewrites` stores `evidence` in the new skill dict (`cv_orchestrator.py:1776–1790`). No validation enforces `evidence` is non-empty before the `skill_add` is accepted. An empty `evidence` field results in a skill added with no cited source. No change from Cycle 4.

**AC3 — Inserted keywords appear mid-sentence, not appended**

⚠️ Partial — The LLM system prompt instructs natural substitution and prohibits keyword appending (`llm_client.py:833, 854`). No programmatic check validates keyword placement in proposed text. The persuasion checks catch passive voice and weak verbs but not end-of-sentence keyword appending. No change from Cycle 4.

**AC4 — Introduced keywords are consistent across all rewrites in a batch**

❌ Fail — Each rewrite proposal is generated independently. No batch-level terminology consistency enforcement exists. `propose_rewrites` returns a list of independent proposals (`llm_client.py:722–870`). No post-processing checks or enforces cross-proposal term consistency. No change from Cycle 4.

---

### US-R4: Professional Summary Effectiveness

**AC1 — Proposed summary is role-specific (different from stored variants unless good match)**

✅ Pass — Summary rewrite is generated per-job via `propose_rewrites` after job analysis and customizations are applied. The LLM has access to `professional_summaries` stored variants. Per-session summary rewrites are distinct from master data by design. No change from Cycle 4.

**AC2 — Opening sentence is evaluable: contains role type + years experience + differentiator**

⚠️ Partial — **Cycle 5 update:** The summary prompt was revised in commit `6ad34fa` (GAP-163) to explicitly require "a value-identity statement: strong verb + differentiating value claim (e.g. 'Drives 3× revenue growth…') — NOT a title + years-of-experience formula" (`llm_client.py:850`). This introduces a tension with the user-story criterion, which requires the opening to contain "role type + years experience + differentiator." The implementation now deliberately omits years from the opening, substituting a value-claim opening. The story's three-element formula is not met. However, the new prompt produces a stronger resume hook by industry standards — a genuinely evaluable, differentiating opening. No structural validation of any opening formula exists. Rating remains ⚠️ Partial: the prompt change improves quality but diverges from the story's three-element requirement; the story AC may need to be updated to reflect the improved approach.

**AC3 — System does not inject "results-driven" or similar filler**

✅ Pass — `llm_client.py:1036–1052` defines `_GENERIC_FILLER_PHRASES` and `_check_generic_summary` flags them. The rewrite prompt explicitly prohibits `"hard-working"`, `"passionate"`, `"results-driven"` (`llm_client.py:854`). No change from Cycle 4.

---

### US-R5: Skills Section Optimisation

**AC1 — Only skills from `Master_CV_Data.json` (or explicitly approved additions) appear in output**

✅ Pass — `build_render_ready_content` selects content via `_select_content_hybrid` from `master_data`, then applies only `approved_rewrites`. `skill_add` path (`cv_orchestrator.py:1776–1790`) adds only user-approved skills. No change from Cycle 4.

**AC2 — Skills ordered by relevance within each category group**

⚠️ Partial — `_sort_categories` (`cv_orchestrator.py:564–580`) sorts within each category by `(-x.get('years', 0), x.get('name', ''))` — years-of-experience descending, then alphabetical. A high-relevance skill with fewer years (e.g., `"Python"`, 5 years) can appear below a low-relevance skill with more years (e.g., `"SAS"`, 20 years) when the target role requires Python. No job-relevance weighting is applied within categories. No change from Cycle 4.

**AC3 — Approved additional skills eligible for Harvest write-back only (not automatic)**

✅ Pass — Session-added skills stored in `state['extra_skills']` (`conversation_manager.py:113`). Write-back to `Master_CV_Data.json` is an explicit user action in the Harvest tab. No automatic write-back path. No change from Cycle 4.

**AC4 — Candidate-to-confirm items clearly flagged in skills review UI; never appear in generated output**

⚠️ Partial — **Cycle 5: no change from Cycle 4.** The review-UI badge (`skills-review.js:633, 663–665`) renders a red `⚠ Verify evidence` span for `candidate_to_confirm: True` skills — the UI flag requirement is met. The generated-output exclusion requirement is **still not met**: `_organize_skills_by_category` (`cv_orchestrator.py:583–595`) does not filter on `candidate_to_confirm`. All skills, including weak-evidence additions, flow through to `skills_by_category` at line 207 and are passed directly to the template. The template (`cv-template.html:628–629`) renders `skill.name` or `skill.display_name` with no `candidate_to_confirm` guard. Weak-evidence skills approved through the review UI appear identically to verified skills in generated PDF, DOCX, and HTML.

---

### US-R6: Rewrite Audit Traceability

**AC1 — `rewrite_audit` contains an entry for every proposal with `outcome` and `final` text**

✅ Pass — `conversation_manager.py:1144–1148` (`submit_rewrite_decisions`) appends every decision (including rejections) to `audit` unconditionally. `self.state['rewrite_audit'] = audit` at line 1157 stores all entries. The `rewrite-review.js:376` submit gate enforces all proposals receive a decision before the audit is written. No change from Cycle 4.

**AC2 — Diff between generated CV text and `rewrite_audit.final` values = zero unexplained changes**

— N/A (requires runtime verification against an actual generated CV; cannot be confirmed from static analysis)

**AC3 — Audit non-empty even when all rewrites are rejected**

✅ Pass — As established in AC1, `submit_rewrite_decisions` appends every proposal unconditionally. All-rejected scenarios produce a fully populated audit. No change from Cycle 4.

---

### US-R7: Spell & Grammar Check Quality

**AC1 — All terms in `custom_dictionary.json` produce zero flags**

✅ Pass — `spell_checker.py:194–213` builds `custom_lower` and skips flagged words whose normalized form appears in it. No change from Cycle 4.

**AC2 — Bullet beginning with a strong action verb produces zero fragment warnings**

✅ Pass — `spell_checker.py:30–36` defines `SUPPRESSED_BULLET_RULES` including `'SENTENCE_FRAGMENT'`. When `context == 'bullet'` these rules are skipped. No change from Cycle 4.

**AC3 — `skill_name` context entries produce only spelling flags, never grammar flags**

✅ Pass — `spell_checker.py:206–208`: when `context == 'skill'`, any match not identified by `_is_spelling_rule(m)` is filtered out. No change from Cycle 4.

**AC4 — Accepted corrections change exactly and only the flagged span in the source text**

✅ Pass — `cv_orchestrator.py:1803–1980` (`apply_accepted_spell_fixes`) applies fixes in reverse-offset order. Only the exact flagged span is replaced. No change from Cycle 4.

**AC5 — `custom_dictionary.json` is deduplicated on every write; no duplicate entries**

✅ Pass — `spell_checker.py:81–90` (`add_word`) and `prepopulate_from_skills` both check `word.lower() not in lower` before appending. No write path can introduce duplicates. No change from Cycle 4.

---

## Section 2: Generated Materials Evaluation

**Note:** The generated-materials evaluation is based on the code paths that produce output. Runtime confirmation against actual generated files is required for full verification.

### Summary rewrite in generated documents

⚠️ Partial — Factual preservation via `apply_rewrite_constraints` is enforced. The `_check_generic_summary` persuasion check detects filler. Acronym expansion (US-R3 AC6: "introduced keywords should include both forms on first use") is a prompt-level instruction only — no programmatic verification. **Cycle 5 note:** The summary-opening approach changed (GAP-163); the new value-identity opening is industry-stronger but diverges from the user-story's three-element formula.

### Skills section in generated output

❌ Fail — **Cycle 5: confirmed unchanged.** While the skills review UI flags `candidate_to_confirm` skills with a `⚠ Verify evidence` badge, the generated-output path remains unguarded. `candidate_to_confirm: True` skills flow through `_organize_skills_by_category` (`cv_orchestrator.py:207–211`) and `skills_by_category` into the template at `cv-template.html:628–629` without any filtering. Skills approved as "candidate to confirm" in the review UI will appear unmarked in all generated PDF, DOCX, and HTML files.

### Publications in generated output

✅ Pass — LLM-based ranking with score-based fallback. User decisions from the publications review tab are persisted as `publication_decisions` and applied before generation. Non-recommended publications excluded by the user are excluded from the rendered output.

### Spell-check corrections in generated output

✅ Pass — `build_render_ready_content` (`cv_orchestrator.py:2337`) calls `apply_accepted_spell_fixes` as the final step before template rendering. Only `outcome: 'accept'` entries are applied.

---

## Terminology Review

| Term used in UI | Assessment |
|---|---|
| "Required Skills" (Analysis tab) | Clear — matches story intent |
| "Preferred / Nice-to-Have" (Analysis tab) | Clear — distinct section, unambiguous |
| "Required Skills" / "Preferred Skills" / "Nice to Have" (conversation panel) | Inconsistent visual weight — icon-differentiated only, no colour/border distinction (C4-3 open) |
| "ATS Keywords" with rank badges | Appropriate — rank implies priority; but rank = list order, not frequency-weighted |
| "Candidate to confirm" / "⚠ Verify evidence" | Badge confirmed in skills review UI (`skills-review.js:663–665`); absent from generated documents |
| "Evidence" field in `skill_add` proposals | Not surfaced in the skills review UI (only the badge, not the cited experience IDs) |
| "Rationale" column in publications table | Clear and useful |
| "Confidence" badge (High/Medium/Low) | Clear for publications; absent for domain inference |
| Value-identity summary opening | **Cycle 5 new:** Prompt now produces value-claim hooks rather than title+years+differentiator; stronger industry practice but story AC requires years |

---

## Summary Table

| Story | Criterion | Rating |
|---|---|---|
| US-R1 | Required/preferred visually distinct | ⚠️ |
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
| US-R5 | Candidate-to-confirm flagged in UI + excluded from output | ⚠️ |
| US-R6 | Audit contains all proposals with outcome | ✅ |
| US-R6 | Audit non-empty when all rejected | ✅ |
| US-R7 | Custom dict produces zero flags | ✅ |
| US-R7 | Bullet fragment suppression | ✅ |
| US-R7 | Skill context grammar suppression | ✅ |
| US-R7 | Accepted correction changes exact span only | ✅ |
| US-R7 | Dictionary deduplicated on write | ✅ |

**Totals:** 15 ✅ Pass | 10 ⚠️ Partial | 2 ❌ Fail | 0 🔲 Not Implemented  
*(Cycle 5: US-R1 AC1 ✅→⚠️ — downgraded due to conversation-panel visual inconsistency confirmed by source read)*  
*(Prior: Cycle 3: US-R6 AC1 ⚠️→✅, US-R6 AC3 ❌→✅, US-R5 AC4 ❌→⚠️)*  
*(Prior: Cycle 4: C4-1/C4-2/C4-3 findings added; all Cycle 3 assessments confirmed)*

---

## Priority Findings (Top 5)

### 1. `candidate_to_confirm` skills appear unmarked in all generated output (US-R5 AC4)

**Severity: High.**  
The review UI flag is confirmed present (`skills-review.js:663–665` renders a red `⚠ Verify evidence` badge). However, weak-evidence `skill_add` proposals flagged `candidate_to_confirm: True` (`cv_orchestrator.py:1779`) flow through `_organize_skills_by_category` at line 207 and into `skills_by_category` with no filter. The template (`cv-template.html:628–629`) renders `skill.name` or `skill.display_name` directly. A candidate who approves a suggested skill "for review purposes" will unknowingly send it in all generated materials.

**Fix needed:** In `_organize_skills_by_category` or the `_sort_categories` call chain, filter out any entry where `candidate_to_confirm == True` before returning `skills_by_category`. Alternatively, filter in `build_render_ready_content` before passing content to the template renderer.

### 2. No cross-rewrite terminology consistency enforcement (US-R3 AC4)

**Severity: High.**  
Rewrites are proposed and reviewed independently. No mechanism ensures that an adopted keyword (e.g., `"MLOps"`) appears consistently across all proposals in a batch. A summary rewrite and a bullet rewrite can use different phrasing for the same concept. `propose_rewrites` returns a list of independent proposals (`llm_client.py:722–870`).

**Fix needed:** After the LLM returns a batch of proposals, run a post-processing pass that extracts newly introduced terminology from accepted proposals and checks all other proposals in the batch for inconsistency. Or include the full accepted batch in a follow-up LLM terminology-normalisation pass before final generation.

### 3. Required/preferred visual distinction absent from conversation-panel analysis card (US-R1 AC1, C4-3)

**Severity: Medium.**  
`message-queue.js:215–229` renders all three skill groups (required, preferred, nice-to-have) as plain icon-prefixed `<h4>` headings within a single unstyled `div.content.job-analysis`. No background colour, border colour, or CSS class differentiates them visually. The analysis tab renders correctly with styled `.skill-badge` chips and distinct `<h2>` headings, but users encounter the conversation card first.

**Fix needed:** In `message-queue.js:215–229`, wrap required-skills and nice-to-have blocks in differently styled containers (e.g., green border for required, amber border for preferred) matching the visual distinction in the analysis tab.

### 4. Keyword frequency weighting absent from job analysis (US-R1 AC4)

**Severity: Medium.**  
The `ats_keywords` list is presented with positional rank badges, but the rank is simply the LLM's output order, not a computed frequency/position weight. Keywords appearing in the job title or repeated multiple times in the posting are not systematically weighted higher.

**Fix needed:** Add a preprocessing step after the raw job text is received — count keyword occurrences and detect title-line keywords. Pass these counts to the LLM prompt as a weighted frequency table, or post-process the LLM's keyword list by boosting items that appear in the job title or opening paragraph.

### 5. Summary opening no longer meets three-element story criterion (US-R4 AC2)

**Severity: Low — may require story update rather than code change.**  
Commit `6ad34fa` (GAP-163) updated the summary LLM prompt (`llm_client.py:850`) to require "a value-identity statement: strong verb + differentiating value claim — NOT a title + years-of-experience formula." This deliberately removes `years of experience` from the opening line. The user story (US-R4 AC2) requires the opening sentence to contain "role type + years experience + differentiator." The implementation now produces a stronger industry hook but violates the literal story criterion. The story AC should be updated to reflect the value-identity opening standard, or a structural check should be added to confirm the opening contains a value claim with quantified achievement.

---

## Cycle 5 Change Summary (2026-06-20)

**Source changes detected since Cycle 4:**

1. **GAP-163 (commit 6ad34fa):** Summary LLM prompt changed at `llm_client.py:850` — now requires value-identity opening (strong verb + differentiating claim) instead of title + years + differentiator. Affects US-R4 AC2 assessment. Rating unchanged (⚠️) but rationale updated.
2. **Rating change: US-R1 AC1 ✅→⚠️** — Cycle 4 marked this ✅ but Cycle 4 finding C4-3 identified the conversation-panel card gap. This cycle formalises the downgrade to ⚠️ Partial, splitting the verdict between the analysis tab (passes) and the conversation-panel card (fails). The summary table row was not updated in Cycle 4 to reflect C4-3; corrected in Cycle 5.

**Findings still open from prior cycles (no code change detected):**

- C4-1: Manual achievement edits bypass `rewrite_audit` — `_apply_session_achievement_edits` writes no audit record
- C4-2: Spell-check suggestions not sorted by severity — `spell_checker.py:241` returns suggestions in LanguageTool iteration order
- C4-3: Conversation-panel analysis card lacks visual distinction between required/preferred (now formalised in summary table)
- US-R5 AC4 output exclusion: `candidate_to_confirm` skills appear in generated documents
