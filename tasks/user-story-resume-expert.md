# User Story: Resume Optimisation Expert Perspective
**Persona:** A certified professional résumé writer / career strategist evaluating the quality, strategy, and correctness of the system's output  
**Scope:** Evaluating each stage where the system makes content or presentation decisions  
**Format:** Evaluation criteria presented as acceptance tests, with specific failure modes to guard against

---

## US-R1: Job Description Analysis Quality

**As a** resume optimisation expert,  
**I want to** verify that the system correctly classifies required vs. preferred qualifications and extracts the right keywords,  
**So that** the candidate's CV targets the right content and achieves maximum keyword density without overfitting.

**Evaluation Criteria:**
1. **Required vs. preferred split** — The system must distinguish "required" (MUST, required, essential) from "preferred" (preferred, a plus, nice to have). Conflating them leads to over-engineering the CV for nice-to-haves.
2. **Keyword deduplication** — Synonyms ("ML" and "Machine Learning") should be grouped, not counted as separate keywords.
3. **Domain inference accuracy** — The inferred role type (IC vs. leadership, domain focus) should match the actual job. A false "leadership" inference causes wrong content to be emphasised.
4. **Keyword frequency weighting** — Keywords appearing in the job title, first paragraph, or multiple times should be weighted higher than single-mention keywords.

**Failure Modes to Guard Against:**
- Treating preferred qualifications as must-haves → over-tailoring, losing breadth.
- Missing implicit requirements (e.g., "cross-functional team" implies stakeholder communication skills).
- Treating duplicated keywords (ML / machine learning / artificial intelligence) as three separate gaps.

**Acceptance Criteria:**
- Required and preferred qualifications displayed in visually distinct sections.
- Synonyms and acronym/expansion pairs grouped (e.g., "ML" ≡ "Machine Learning").
- Domain inference presented with confidence level; ambiguous cases prompt the user.

---

## US-R2: Content Selection Strategy

**As a** resume optimisation expert,  
**I want to** confirm that the system selects and orders content to maximise relevance to the target job while preserving the candidate's strongest material,  
**So that** the CV is not just keyword-optimised but strategically compelling.

**Evaluation Criteria:**
1. **Recency bias check** — Most-recent experience should not be automatically highest-scored if an older role is more relevant. Relevance score should be role-based, not recency-biased.
2. **Achievement ordering within a job** — The most job-relevant bullet should be first; the system must not preserve the original document order blindly.
3. **Section inclusion logic** — Publications should be included for research roles, excluded for industry roles. The system should justify conditional inclusions/exclusions. For research roles, the LLM must rank publications by relevance to the specific job (keyword overlap with `ats_keywords` and `required_skills`, domain alignment, first-author status, recency) and recommend a shortlist — not simply include all or include none.
4. **Publication selection quality** — The recommended publications shortlist should surface items that directly evidence the required skills and domain expertise, not the most-cited or most-recent regardless of relevance.
5. **Completeness without bloat** — For a senior candidate, the CV should be 2–3 pages. The system must not pad with marginally relevant content to fill pages, nor truncate critical content to fit.
6. **Selected Achievements quality** — The 4–6 selected achievements should represent diverse impact types (technical, leadership, business) appropriate to the role, not all from one domain.

**Failure Modes to Guard Against:**
- Recommending all experiences regardless of relevance (lazy inclusion).
- Always using original bullet order (missing reordering opportunity).
- Dropping Publications silently for a research role because they aren't scored highly by keyword matching.
- Including all publications indiscriminately for any research role, without filtering for relevance to this specific job.

**Acceptance Criteria:**
- Relevance score is based on semantic + keyword match, not recency rank.
- Bullet reordering is proposed and applied within each experience entry.
- Conditional section decisions (Publications, Languages, Awards) are shown with rationale.
- For any role where publications may be relevant, a ranked publication shortlist is presented with per-item relevance scores and rationale; it is never silently omitted or silently included in full.
- System warns if estimated CV length exceeds 3 pages or is under 1.5 pages.

---

## US-R3: Rewrite Quality and Constraint Adherence

**As a** resume optimisation expert,  
**I want to** verify that every proposed text rewrite substitutes terminology naturally, preserves all factual content, and reads like a human wrote it —  
**So that** the final CV is both ATS-optimised and credible to human reviewers.

**Evaluation Criteria:**
1. **Factual preservation** — Dates, company names, metrics (percentages, dollar figures, headcount) must be identical in the proposed text. The constraint validation (`apply_rewrite_constraints`) must catch violations.
2. **Naturalness** — Rewrites should not read as keyword-stuffed or robotic. "Leveraged synergistic ML/AI methodologies" is a failure. "Built ML models" → "Built ML/AI models" is a success.
3. **Keyword integration** — The job's terminology appears naturally in the sentence, not tacked onto the end. "…pipelines. MLOps." is a failure; "…MLOps pipeline deployment" is a success.
4. **No fabrication** — `skill_add` proposals must cite concrete evidence from experience entries. Weak-evidence additions must be flagged for user confirmation.
5. **Terminology consistency** — If "MLOps" is adopted for one bullet, the summary rewrite should also use "MLOps", not "productionizing ML pipelines".
6. **Acronym expansion** — Introduced keywords should include both forms on first use: "MLOps (ML Operations)".

**Failure Modes to Guard Against:**
- Removing a metric during a summary rewrite (e.g., "led team of 15" becoming "led a team").
- Adding a keyword at the end of a sentence as an appendage rather than substituting inline.
- `skill_add` without evidence (hallucinated skills).
- Inconsistent terminology across summary, bullets, and skills section.

**Acceptance Criteria:**
- `apply_rewrite_constraints` rejects any proposal that removes a number, date, or company name.
- Every `skill_add` proposal cites at least one experience ID as evidence.
- Inserted keywords appear mid-sentence, not appended.
- System enforces that introduced keywords are consistent across all rewrites in a batch.

---

## US-R4: Professional Summary Effectiveness

**As a** resume optimisation expert,  
**I want to** evaluate whether the proposed professional summary rewrite is strategically strong —  
**So that** the 4–6 line summary acts as a high-impact executive pitch rather than a keyword dump.

**Evaluation Criteria:**
1. **Hook quality** — The opening line should identify role type, years of experience, and a differentiated strength.
2. **Keyword coverage** — Top 3–5 required keywords embedded naturally, not literally copied from the job posting.
3. **No fluff** — Phrases like "results-driven professional" or "passionate about" are red flags.
4. **Leadership scope stated** — For senior/leadership roles, the summary should mention organisational impact (team size, budget, scope).
5. **Length** — 4–6 lines; not a paragraph block.

**Failure Modes to Guard Against:**
- Using the same summary for all roles (no customisation at all).
- Opening with name or title ("Gregory Warnes is a…").
- Listing keywords as a comma-separated sentence ("Expertise in: Python, ML, R…").

**Acceptance Criteria:**
- Proposed summary is role-specific (different from any stored `professional_summaries` variant unless a good match exists).
- Opening sentence is evaluable: contains role type + years experience + differentiator.
- System does not inject the phrase "results-driven" or similar filler.

---

## US-R5: Skills Section Optimisation

**As a** resume optimisation expert,  
**I want to** verify that the skills section accurately represents the candidate's demonstrated abilities in job-relevant terminology —  
**So that** ATS keyword scanning succeeds and the skills section adds credibility, not noise.

**Evaluation Criteria:**
1. **Terminology alignment** — Skill display names should use the job posting's phrasing where the underlying skill is equivalent.
2. **No fabrication** — Skills the candidate cannot demonstrate should never appear, even if the job requires them.
3. **Grouping logic** — Skills should be categorised sensibly for the role type (e.g., "Infrastructure & Cloud" de-emphasised for a pure research role).
4. **Density without redundancy** — Listing "Python", "Python 3", "Python (pandas, scikit-learn)" as three separate entries is redundant. One canonical form with parenthetical aliases.
5. **"Candidate to confirm" handling** — Weak-evidence additions must be visually flagged; they should not slip through, but they also should not be silently dropped.

**Failure Modes to Guard Against:**
- Renaming a skill to something the candidate has not done ("Container Orchestration" renamed to "Container Orchestration (Kubernetes)" when candidate has never used Kubernetes).
- All skills listed alphabetically with no role-relevance ordering.
- Omitting high-relevance skills because they fall in a de-emphasised category.

**Acceptance Criteria:**
- Only `skills` entries present in `Master_CV_Data.json` (or explicitly approved additions) appear in the output.
- Skills ordered by relevance to the target role within each category group.
- Any approved additional skills are added to `Master_CV_Data.json` for future use, with relevant experience.
- Candidate-to-confirm items are clearly flagged in the skills review UI (e.g., asterisk, footnote, or distinct visual indicator). They must **never appear in generated output documents** — all generated PDF, DOCX, and HTML files must contain only clean, unmarked text. The marking is a review-step affordance only.

---

## US-R6: Rewrite Audit Traceability

**As a** resume optimisation expert,  
**I want to** review the complete audit trail of proposed, accepted, edited, and rejected rewrites —  
**So that** I can verify that every word in the final CV is traceable to either an approved rewrite or the original master data.

**Evaluation Criteria:**
1. **Full traceability** — Every field in the generated CV should be traceable to either: (a) the original `Master_CV_Data.json` value, or (b) a user-approved rewrite in `rewrite_audit`.
2. **Rejected rewrites reverted** — If a rewrite is rejected, the original text—not the proposed text—must appear in the output.
3. **Edited rewrites** — If a rewrite is edited, the user's final text—not the LLM's proposal—must appear.
4. **Audit completeness** — `rewrite_audit` must include all proposals, not just accepted ones.

**Acceptance Criteria:**
- `rewrite_audit` in `metadata.json` contains an entry for every proposal, with `outcome: accept | reject | edit` and `final` text.
- Diff between generated CV text and `rewrite_audit.final` values = zero unexplained changes.
- Audit non-empty even when all rewrites are rejected (audit records rejections).

---

## US-R7: Spell & Grammar Check Quality

**As a** resume optimisation expert,  
**I want to** verify that the spell/grammar checker raises accurate, useful flags and suppresses irrelevant noise —  
**So that** the candidate is not burdened with false positives, and genuine errors are caught reliably.

**Evaluation Criteria:**

1. **No false positives on technical vocabulary** — Domain terms (`MLOps`, `biostatistics`, `Bioconductor`, `WeasyPrint`, `scikit-learn`) must not be flagged when they appear in `custom_dictionary.json` or are correctly spelled recognised terms.
2. **No false positives on proper nouns** — Company names (Genentech, Pfizer, Torqata), candidate name, product names — never flagged.
3. **Fragment tolerance in bullets** — Bullets beginning with an action verb (`Led…`, `Designed…`, `Built…`) must not trigger sentence-fragment warnings. The system must detect `bullet` context and suppress fragment rules.
4. **Skill names treated as words/phrases** — `skill_name` context receives spelling-only checking; grammar rules are not applied.
5. **Corrections do not alter approved rewrite text beyond the flagged span** — Accepting a spelling correction for one word must not rewrite surrounding approved text.
6. **Custom dictionary seeded correctly** — On first run, the dictionary is pre-populated from `Master_CV_Data.json` (candidate name, companies, key technical terms) so common items are never flagged.
7. **Severity calibration** — Critical errors (misspelled common words) surfaced before minor stylistic suggestions; the list is sorted by severity.

**Failure Modes to Guard Against:**
- `MLOps` flagged as misspelling because it's not in a standard English dictionary.
- Bullet `"Led team of 15 engineers across 3 time zones"` flagged as a sentence fragment.
- Accepting a comma suggestion rewriting the entire sentence.
- Custom dictionary growing without bound (duplicate entries, whitespace variants).
- Checker runs on fields not shown to the user (internal metadata keys, JSON keys).

**Acceptance Criteria:**
- All terms in `custom_dictionary.json` produce zero flags, regardless of context.
- A test bullet beginning with a strong action verb produces zero fragment warnings.
- `skill_name` context entries produce only spelling flags, never grammar flags.
- Accepted corrections change exactly and only the flagged span in the source text.
- `custom_dictionary.json` is deduplicated on every write; no duplicate entries.
- Spell audit in `metadata.json` (`spell_audit` array) is non-empty when flags exist and fully empty (zero entries) when no flags were found.

## Review Status — 2026-03-19 11:24:03 EDT

### US-R1 — Resume Expert

**Evaluation Criteria**

| Criterion | Status | Evidence |
|---|---|---|
| Required vs. preferred split | ✅ Pass | `web/app.js:2900`, `web/app.js:2916`, and `web/app.js:2942` render distinct Required Skills, Preferred / Nice-to-Have, and Must-Have sections. |
| Keyword deduplication | ✅ Pass | `scripts/utils/cv_orchestrator.py:canonical_skill_name` and `_expansion_index` group aliases and acronym/expansion pairs before skill organization and scoring. |
| Domain inference accuracy | ⚠️ Partial | `scripts/web_app.py:_fallback_post_analysis_questions` asks follow-up questions for leadership/domain emphasis, but no reviewed analysis-panel code presents domain inference confidence or a correction path for ambiguous inference. |
| Keyword frequency weighting | ⚠️ Partial | `web/app.js:2924` preserves ATS keyword ranking in the UI, but no deterministic weighting logic based on title/first paragraph/repetition is visible in the reviewed files. |

**Failure Modes Present**

| Failure Mode | Status | Evidence |
|---|---|---|
| Treating preferred qualifications as must-haves | ⚠️ Partial | The UI keeps the split visible, but `scripts/utils/cv_orchestrator.py:1187-1189` merges must-have and nice-to-have requirements into one `job_requirements` list for downstream scoring. |
| Missing implicit requirements | ❌ Fail | No reviewed code infers implicit requirements like stakeholder communication from phrases such as “cross-functional team”; not found in the requested files. |
| Treating duplicated keywords as separate gaps | ✅ Pass | `scripts/utils/cv_orchestrator.py:canonical_skill_name` and `_expansion_index` normalize aliases before selection and ordering. |

**Acceptance Criteria**

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| Required and preferred qualifications displayed in visually distinct sections | ✅ Pass | `web/app.js:2900`, `web/app.js:2916`, and `web/app.js:2942`. |
| Synonyms and acronym/expansion pairs grouped | ✅ Pass | `scripts/utils/cv_orchestrator.py:canonical_skill_name` and `_organize_skills_by_category`. |
| Domain inference presented with confidence level; ambiguous cases prompt the user | ⚠️ Partial | Prompting exists in `scripts/web_app.py:_fallback_post_analysis_questions`, but no reviewed analysis UI shows domain-inference confidence or ambiguity-specific correction controls. |

### US-R2 — Resume Expert

**Evaluation Criteria**

| Criterion | Status | Evidence |
|---|---|---|
| Recency bias check | ✅ Pass | `scripts/utils/cv_orchestrator.py:1205-1213` scores experiences with LLM boost, keyword score, and semantic score; no recency term is applied. |
| Achievement ordering within a job | ✅ Pass | `scripts/utils/cv_orchestrator.py:1217-1257` reorders bullets by user order or keyword overlap, and rendering reads `ordered_achievements` at `scripts/utils/cv_orchestrator.py:1759`. |
| Section inclusion logic | ⚠️ Partial | Publications get explicit review/rationale in `scripts/web_app.py:/api/publication-recommendations` and `web/app.js:buildPublicationsReviewTable`, but no comparable reviewed logic surfaces conditional Languages or Awards decisions with rationale. |
| Publication selection quality | ✅ Pass | `scripts/web_app.py:/api/publication-recommendations` uses LLM ranking with fallback scoring, and `web/app.js:4930-5075` shows rank, score, confidence, rationale, and inclusion toggles. |
| Completeness without bloat | ⚠️ Partial | `web/app.js:_updatePageEstimate` and `web/app.js:5542` warn about short/long output, but this is heuristic page estimation rather than hard content-governance logic. |
| Selected achievements quality | ❌ Fail | `scripts/utils/cv_orchestrator.py:1268-1275` selects the top scored achievements only; no reviewed logic enforces diversity across technical, leadership, and business impact types. |

**Failure Modes Present**

| Failure Mode | Status | Evidence |
|---|---|---|
| Recommending all experiences regardless of relevance | ✅ Pass | `scripts/utils/cv_orchestrator.py:1205-1214` computes and sorts relevance scores rather than including everything blindly. |
| Always using original bullet order | ✅ Pass | `scripts/utils/cv_orchestrator.py:1217-1257` actively reorders bullets. |
| Dropping Publications silently for a research role | ✅ Pass | `web/app.js:4930-5075` builds an explicit ranked publication review table whenever recommendations exist; non-recommended items are also surfaced below a divider. |
| Including all publications indiscriminately for any research role | ✅ Pass | `scripts/web_app.py:/api/publication-recommendations` marks only recommended items as preselected and appends the remainder as `is_recommended: False`. |

**Acceptance Criteria**

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| Relevance score is based on semantic + keyword match, not recency rank | ✅ Pass | `scripts/utils/cv_orchestrator.py:1205-1213`. |
| Bullet reordering is proposed and applied within each experience entry | ✅ Pass | `scripts/web_app.py:/api/proposed-bullet-order`, `scripts/utils/cv_orchestrator.py:1217-1257`, and `scripts/utils/cv_orchestrator.py:1759`. |
| Conditional section decisions (Publications, Languages, Awards) are shown with rationale | ⚠️ Partial | Publications satisfy this in `web/app.js:4930-5075`; Languages and Awards rationale UI was not found in the reviewed files. |
| Ranked publication shortlist with per-item relevance scores and rationale is presented when publications may be relevant | ✅ Pass | `scripts/web_app.py:/api/publication-recommendations` and `web/app.js:5002-5040`. |
| System warns if estimated CV length exceeds 3 pages or is under 1.5 pages | ✅ Pass | `web/app.js:_updatePageEstimate` and `web/app.js:5542`. |

### US-R3 — Resume Expert

**Evaluation Criteria**

| Criterion | Status | Evidence |
|---|---|---|
| Factual preservation | ⚠️ Partial | `scripts/utils/cv_orchestrator.py:apply_approved_rewrites` calls `LLMClient.apply_rewrite_constraints` and skips violations, but the reviewed files do not show equivalent validation at proposal-review time and the validator implementation itself was not in the requested file set. |
| Naturalness | ⚠️ Partial | `scripts/utils/conversation_manager.py:run_persuasion_checks` checks passive voice, hedging, CAR structure, and generic summary phrases, but no explicit reviewed check targets keyword stuffing or robotic phrasing. |
| Keyword integration | ❌ Fail | No reviewed code enforces that introduced keywords appear inline rather than as sentence-end appendages; not found in the requested files. |
| No fabrication | ⚠️ Partial | `scripts/utils/cv_orchestrator.py:780` flags weak `skill_add` entries as `candidate_to_confirm`, but no reviewed enforcement requires concrete experience-ID evidence for every `skill_add`. |
| Terminology consistency | ⚠️ Partial | `scripts/utils/conversation_manager.py:970` says re-runs should preserve terminology and tone of accepted rewrites, but no reviewed batch-wide enforcement keeps terminology aligned across summary, bullets, and skills. |
| Acronym expansion | 🔲 Not Implemented | No reviewed code expands introduced acronyms on first use; not found in the requested files. |

**Failure Modes Present**

| Failure Mode | Status | Evidence |
|---|---|---|
| Removing a metric during a summary rewrite | ⚠️ Partial | Constraint checking is invoked in `scripts/utils/cv_orchestrator.py:apply_approved_rewrites`, but only at application time in the reviewed files. |
| Adding a keyword at the end of a sentence as an appendage | ❌ Fail | No reviewed check detects or blocks appendage-style keyword insertion. |
| `skill_add` without evidence | ⚠️ Partial | `renderRewriteCard` shows evidence when present in `web/app.js:renderRewriteCard`, but no reviewed validator requires evidence or experience IDs. |
| Inconsistent terminology across summary, bullets, and skills section | ⚠️ Partial | `scripts/utils/conversation_manager.py:970` preserves terminology only on later re-runs; no first-pass consistency enforcement was found. |

**Acceptance Criteria**

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| `apply_rewrite_constraints` rejects proposals that remove a number, date, or company name | ⚠️ Partial | `scripts/utils/cv_orchestrator.py:apply_approved_rewrites` invokes the check and comments that protected tokens are guarded, but the validator behavior is not fully visible in the requested files. |
| Every `skill_add` proposal cites at least one experience ID as evidence | ❌ Fail | No reviewed code enforces experience-ID citation for `skill_add`; not found in the requested files. |
| Inserted keywords appear mid-sentence, not appended | ❌ Fail | No reviewed enforcement was found. |
| System enforces introduced keywords are consistent across all rewrites in a batch | ❌ Fail | No reviewed batch-consistency enforcement was found. |

### US-R4 — Resume Expert

**Evaluation Criteria**

| Criterion | Status | Evidence |
|---|---|---|
| Hook quality | ⚠️ Partial | `scripts/web_app.py:/api/generate-summary` generates a role-specific summary from `job_analysis` and selected experiences, but no reviewed code validates role type + years + differentiator in the opening line. |
| Keyword coverage | ⚠️ Partial | Summary generation is job-aware in `scripts/web_app.py:/api/generate-summary`, but the reviewed files do not verify that the top 3-5 required keywords are embedded naturally. |
| No fluff | ❌ Fail | `scripts/utils/conversation_manager.py:run_persuasion_checks` checks generic phrases only for rewrite proposals; `scripts/web_app.py:/api/generate-summary` bypasses that reviewed safeguard. |
| Leadership scope stated | ⚠️ Partial | The UI allows refinement prompts such as “Emphasise my leadership experience” in `web/app.js:4736-4905`, but no reviewed logic requires leadership scope for senior roles. |
| Length | ❌ Fail | No reviewed summary-generation or selection code enforces a 4-6 line summary. |

**Failure Modes Present**

| Failure Mode | Status | Evidence |
|---|---|---|
| Using the same summary for all roles | ⚠️ Partial | `web/app.js:4736-4905` auto-generates an `ai_generated` summary per session, but stored summaries can still be selected without a reviewed “good match” check. |
| Opening with name or title | ❌ Fail | No reviewed validation blocks openings like a candidate name/title lead; not found in the requested files. |
| Listing keywords as a comma-separated sentence | ❌ Fail | No reviewed validation blocks list-style keyword dumping in generated summaries. |

**Acceptance Criteria**

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| Proposed summary is role-specific unless a good stored match exists | ⚠️ Partial | `scripts/web_app.py:955-958` stores and auto-selects `ai_generated`, but no reviewed comparison against stored variants determines whether a stored summary is already a strong match. |
| Opening sentence contains role type + years experience + differentiator | ❌ Fail | No reviewed structural validation was found. |
| System does not inject “results-driven” or similar filler | ❌ Fail | No reviewed guard covers the `generate-summary` path. |

### US-R5 — Resume Expert

**Evaluation Criteria**

| Criterion | Status | Evidence |
|---|---|---|
| Terminology alignment | ⚠️ Partial | `scripts/utils/cv_orchestrator.py:canonical_skill_name` normalizes equivalent skills, but no reviewed code systematically renames displayed skills to match job-post phrasing. |
| No fabrication | ⚠️ Partial | Output skills come from master data plus explicitly approved extras in `scripts/utils/cv_orchestrator.py:1285-1314`, but reviewed skill-approval flow does not require evidence before a user includes an AI-suggested new skill. |
| Grouping logic | ⚠️ Partial | Skill grouping is inherited from master-data categories in `_organize_skills_by_category`, but no reviewed logic rebalances categories by role type. |
| Density without redundancy | ✅ Pass | `scripts/utils/cv_orchestrator.py:canonical_skill_name` and `_organize_skills_by_category` merge aliases and preserve canonical forms. |
| Candidate-to-confirm handling | ⚠️ Partial | `scripts/utils/cv_orchestrator.py:780` marks weak-evidence `skill_add` items as `candidate_to_confirm`, and `web/app.js:4093` flags AI-suggested skills as “⚠ Not in CV profile,” but the reviewed UI does not clearly surface evidence-strength-based `candidate_to_confirm` status. |

**Failure Modes Present**

| Failure Mode | Status | Evidence |
|---|---|---|
| Renaming a skill to something the candidate has not done | ❌ Fail | `scripts/utils/cv_orchestrator.py:apply_approved_rewrites` allows `skill_rename`, but no reviewed evidence check validates renamed skill scope. |
| All skills listed alphabetically with no role-relevance ordering | ✅ Pass | `scripts/utils/cv_orchestrator.py:1292-1304` sorts remaining skills by calculated relevance score. |
| Omitting high-relevance skills because they fall in a de-emphasised category | ⚠️ Partial | Relevance ordering exists, but no reviewed category-level override logic ensures high-relevance skills survive category de-emphasis decisions. |

**Acceptance Criteria**

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| Only master-data skills or explicitly approved additions appear in output | ✅ Pass | `scripts/utils/cv_orchestrator.py:1285-1314` builds `selected_skills` from existing skills plus approved `extra_skills`. |
| Skills ordered by relevance to the target role within each category group | ⚠️ Partial | Relevance sorting is visible in `scripts/utils/cv_orchestrator.py:1292-1304`, but the reviewed files do not show per-category relevance ordering guarantees in final grouped output. |
| Approved additional skills are added to `Master_CV_Data.json` for future use, with relevant experience | ❌ Fail | `web/app.js:5310-5360` says extra skills are added “for this CV only,” and persistent write-back requires separate harvest flow in `scripts/web_app.py:harvest_apply`. |
| Candidate-to-confirm items are clearly flagged in review UI and never appear marked in generated output | ⚠️ Partial | The review UI flags non-profile skills in `web/app.js:4093`; no reviewed renderer emits candidate markers into output, but there is no dedicated evidence-strength flag shown in the skills-review UI. |

### US-R6 — Resume Expert

**Evaluation Criteria**

| Criterion | Status | Evidence |
|---|---|---|
| Full traceability | ⚠️ Partial | `scripts/utils/cv_orchestrator.py:generate_cv` writes `approved_rewrites` and `rewrite_audit` into `metadata.json`, but `rewrite_audit.final` is not fully populated for accept/reject outcomes and no reviewed end-to-end diff verifier exists. |
| Rejected rewrites reverted | ✅ Pass | `scripts/utils/conversation_manager.py:submit_rewrite_decisions` excludes rejected items from `approved_rewrites`, and `scripts/utils/cv_orchestrator.py:apply_approved_rewrites` applies approved items only. |
| Edited rewrites use user final text | ✅ Pass | `scripts/utils/conversation_manager.py:771-776` replaces `proposed` with `final_text` for edited approvals before generation. |
| Audit completeness | ✅ Pass | `scripts/utils/conversation_manager.py:763-779` appends an audit record for every decision regardless of outcome. |

**Failure Modes Present**

| Failure Mode | Status | Evidence |
|---|---|---|
| Untraceable generated text | ⚠️ Partial | Metadata carries audit data, but reviewed code does not prove complete field-level traceability or zero unexplained diffs. |
| Rejected rewrites leaking into output | ✅ Pass | Rejected items are not carried into `approved_rewrites`. |
| Edited rewrites losing the user’s final text | ✅ Pass | Edited text replaces `proposed` before generation in `scripts/utils/conversation_manager.py:771-776`. |
| Audit missing rejected proposals | ✅ Pass | `scripts/utils/conversation_manager.py:763-779` records all decisions. |

**Acceptance Criteria**

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| `rewrite_audit` in `metadata.json` contains every proposal, with `outcome` and `final` text | ⚠️ Partial | Every proposal is recorded and `metadata.json` includes `rewrite_audit` via `scripts/utils/cv_orchestrator.py:930`, but `web/app.js:6008` sends `final_text: null` for non-edit decisions so `final` is not populated for accepts/rejects. |
| Diff between generated CV text and `rewrite_audit.final` values = zero unexplained changes | ❌ Fail | No reviewed diff-verification logic exists, and `final` is incomplete for accepted/rejected rewrites. |
| Audit non-empty even when all rewrites are rejected | ✅ Pass | `scripts/utils/conversation_manager.py:763-779` records all outcomes, including rejections. |

### US-R7 — Resume Expert

**Evaluation Criteria**

| Criterion | Status | Evidence |
|---|---|---|
| No false positives on technical vocabulary | ⚠️ Partial | `scripts/web_app.py:_prepopulate_spell_dict` seeds the custom dictionary from skills plus the candidate name, but no reviewed code seeds company names or broader technical terminology beyond what appears in skills. |
| No false positives on proper nouns | ❌ Fail | `scripts/web_app.py:_prepopulate_spell_dict` adds the candidate name only; company and product names were not found in the reviewed seeding logic. |
| Fragment tolerance in bullets | ⚠️ Partial | `scripts/web_app.py:/api/spell-check` accepts `context='bullet'`, and `scripts/web_app.py:/api/spell-check-sections` tags approved rewrites as `bullet`, but no reviewed suppression rule for fragment warnings is visible. |
| Skill names treated as words/phrases | 🔲 Not Implemented | The reviewed files define a `skill` context in `/api/spell-check`, but `scripts/web_app.py:/api/spell-check-sections` does not emit any skill-context sections for review. |
| Corrections do not alter approved rewrite text beyond the flagged span | ❌ Fail | `web/app.js:applySpellReplacement` updates only the in-memory audit entry and card display, while `scripts/utils/conversation_manager.py:complete_spell_check` merely stores `spell_audit`; no reviewed code applies accepted corrections back into generated content. |
| Custom dictionary seeded correctly | ❌ Fail | First-run prepopulation in `scripts/web_app.py:_prepopulate_spell_dict` does not include companies or other non-skill master-data terms. |
| Severity calibration | 🔲 Not Implemented | `web/app.js:renderSpellSuggestions` renders suggestions in returned order; no reviewed severity sort was found. |

**Failure Modes Present**

| Failure Mode | Status | Evidence |
|---|---|---|
| `MLOps` flagged because it is not in a standard dictionary | ⚠️ Partial | If the term exists in skills it will be preloaded by `_prepopulate_spell_dict`; otherwise no reviewed safeguard was found. |
| Bullet “Led team of 15 engineers…” flagged as a sentence fragment | ⚠️ Partial | Bullet context exists, but reviewed fragment-suppression logic was not found. |
| Accepting a comma suggestion rewrites the entire sentence | ⚠️ Partial | The reviewed code avoids full-sentence mutation by not applying accepted corrections back to source text at all, which prevents this exact failure mode but also means accepted corrections never reach output. |
| Custom dictionary growing without bound | ⚠️ Partial | `scripts/web_app.py:/api/custom-dictionary` strips whitespace before add, but deduplication behavior is delegated outside the requested file set. |
| Checker runs on fields not shown to the user | ✅ Pass | `scripts/web_app.py:/api/spell-check-sections` includes only the visible summary and approved rewrites. |

**Acceptance Criteria**

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| All terms in `custom_dictionary.json` produce zero flags, regardless of context | ⚠️ Partial | The reviewed files expose dictionary add/get endpoints, but zero-flag behavior across all contexts was not demonstrated in the requested file set. |
| A strong action-verb bullet produces zero fragment warnings | ⚠️ Partial | Bullet context is passed through the reviewed API, but zero-fragment suppression is not shown. |
| `skill_name` context entries produce only spelling flags, never grammar flags | 🔲 Not Implemented | No reviewed spell-check section emits skill-context entries. |
| Accepted corrections change exactly and only the flagged span in the source text | ❌ Fail | Accepted spell actions are recorded in audit only; they are not written back into CV text in the reviewed files. |
| `custom_dictionary.json` is deduplicated on every write | 🔲 Not Implemented | No reviewed deduplication logic was found in the requested files. |
| Spell audit in `metadata.json` is non-empty when flags exist and fully empty when none were found | ✅ Pass | `web/app.js:completeSpellCheckFastPath` posts `[]` when no flags exist, `web/app.js:6578-6607` records decisions when flags do exist, and `scripts/web_app.py:3971` writes `spell_audit` into metadata on finalise. |
