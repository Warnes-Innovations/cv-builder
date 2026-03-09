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
3. **Section inclusion logic** — Publications should be included for research roles, excluded for industry roles. The system should justify conditional inclusions/exclusions.
4. **Completeness without bloat** — For a senior candidate, the CV should be 2–3 pages. The system must not pad with marginally relevant content to fill pages, nor truncate critical content to fit.
5. **Selected Achievements quality** — The 4–6 selected achievements should represent diverse impact types (technical, leadership, business) appropriate to the role, not all from one domain.

**Failure Modes to Guard Against:**
- Recommending all experiences regardless of relevance (lazy inclusion).
- Always using original bullet order (missing reordering opportunity).
- Dropping Publications silently for a research role because they aren't scored highly by keyword matching.

**Acceptance Criteria:**
- Relevance score is based on semantic + keyword match, not recency rank.
- Bullet reordering is proposed and applied within each experience entry.
- Conditional section decisions (Publications, Languages, Awards) are shown with rationale.
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
