<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Resume Expert Persona

**Reviewer:** Resume Optimisation Expert (certified professional résumé writer / career strategist)
**Review date:** 2026-07-01
**Branch:** feature/multi-user-deployment

---

## Application Evaluation

### US-R1: Job Description Analysis Quality

**Criterion 1 — Required vs. preferred split**
PASS. `LLMClient.analyze_job_description` uses a structured JSON schema that maps `required_skills` to must-have skills and `preferred_skills` / `nice_to_have_requirements` to nice-to-haves (llm_client.py lines 305–310). The downstream selection logic in `_select_content_hybrid` (cv_orchestrator.py lines 3176–3180) keeps these lists separate: only `must_have_requirements` and `nice_to_have_requirements` are combined for relevance scoring after the split.

**Criterion 2 — Keyword deduplication**
PASS. A synonym map (`scripts/data/synonym_map.json`) is loaded at init and an `_expansion_index` dict maps all aliases to a canonical form (cv_orchestrator.py lines 120–127). `canonical_skill_name()` and `_deduplicate_skills()` normalise skill names on that index before display and scoring. `_ach_relevance()` also resolves synonyms when sorting bullets by keyword overlap.

**Criterion 3 — Domain inference accuracy**
PASS. The analysis schema includes `domain_confidence` (float 0.0–1.0, llm_client.py line 303). When `domain_confidence < 0.7`, the conversation manager (conversation_manager.py lines 733–747) prepends a `domain_clarification` question to the post-analysis Q&A so the user can correct the inference.

**Criterion 4 — Keyword frequency weighting**
PARTIAL. `ats_keywords` (top 10) are extracted by the LLM. The scoring function uses this set for matching but there is no explicit "mention-count" or "title-position" weighting in the orchestrator. The system relies on LLM discretion to surface the most important keywords first rather than a positional weight algorithm. The UI does not show which keywords were ranked higher due to first-paragraph or title placement.

**Acceptance criteria summary:**

- Required/preferred in distinct structures: YES
- Synonyms grouped: YES (synonym_map + canonical_skill_name)
- Domain inference with confidence + user prompt when ambiguous: YES
- Keyword positional weighting surfaced to user: NOT VERIFIED (LLM implicit only)

**Failure-mode check:** Treating preferred as must-haves — guarded by separate schema fields. Missing implicit requirements — LLM prompt captures culture_indicators and free-text requirements. Duplicated synonym keywords — handled by expansion index.

---

### US-R2: Content Selection Strategy

**Criterion 1 — Recency bias check**
PASS. `_select_content_hybrid` at line 3231 sorts experiences by `(-relevance_score, -end_date_ordinal)`. Relevance is primary; recency is a tie-breaker only.

**Criterion 2 — Achievement ordering within a job**
PASS. When no user-defined order exists, bullets are sorted by `_ach_relevance()` (keyword-overlap with ATS keywords) descending (cv_orchestrator.py lines 3275–3285). User-defined explicit ordering via the UI overrides this.

**Criterion 3 — Section inclusion logic for Publications**
PARTIAL PASS. A publications-gate question is added to the post-analysis Q&A when the candidate has publications but the inferred domain is non-research (conversation_manager.py lines 751–771). This is correct gating. However, the acceptance criterion requires a *ranked shortlist with per-item relevance scores and rationale*; the system provides user-driven accept/reject via `publication_decisions` without an LLM-generated per-item rationale.

**Criterion 4 — Publication selection quality**
PARTIAL. `_select_publications()` (cv_orchestrator.py lines 3738–3802) scores publications on: recency tier (+30/+20/+10), entry type bonus (+25/+20), and ATS-keyword title matches (+5 per hit). It also applies a one-domain bonus for genomics. First-author status is detected for template rendering only — not used as a selection factor. Per-item rationale is not exposed to the user. The acceptance criterion for "ranked publication shortlist with per-item relevance scores and rationale" is not met.

**Criterion 5 — Completeness without bloat**
PASS. A page-count iteration loop in `_handle_recommend_customizations` (conversation_manager.py lines 848–890) re-calls the LLM when estimated body pages are >25% over or <75% under budget. `_cap_cv_body_to_pages` (cv_orchestrator.py) enforces a hard budget by trimming in order (skills → achievements → bullets → experience entries). Page-count warnings are shown in the UI.

**Criterion 6 — Achievements diversity**
PASS. `_apply_achievement_diversity()` is called after scoring (cv_orchestrator.py line 3308) to enforce diversity across impact types.

**Failure-mode check:** Lazy inclusion — guarded by Omit decision mechanism. Missing bullet reordering — implemented. Silent publication omission/inclusion — guarded by gate question and count/page cap; but per-item rationale shortlist is absent.

---

### US-R3: Rewrite Quality and Constraint Adherence

**Criterion 1 — Factual preservation**
PASS. `apply_rewrite_constraints()` (llm_client.py line 924) rejects any proposal that removes numeric tokens, percentages, or dates from the original text. `apply_approved_rewrites()` (cv_orchestrator.py line 1698) calls this gate for every item; non-compliant items are skipped with a logged warning.

**Criterion 2 — Naturalness**
PASS (with runtime LLM caveat). `check_keyword_appended()` flags rewrites where a keyword appears as a sentence-end appendage (llm_client.py line 1417). The persuasion-check pipeline surfaces these as warnings in the rewrite review UI.

**Criterion 3 — Keyword integration**
PASS. `check_keyword_appended()` detects and flags appended keywords. Persuasion warnings displayed in rewrite review tab.

**Criterion 4 — No fabrication**
PASS for skill_add. When `evidence_strength == "weak"`, the skill entry receives `candidate_to_confirm: True` (cv_orchestrator.py line 1799). This flag is displayed in the skills review UI as an amber "⚠ Weak evidence" / "⚠ Verify evidence" badge with tooltip showing the evidence text (skills-review.js lines 727–728).

**Criterion 5 — Terminology consistency**
PASS. `run_persuasion_checks` includes a batch terminology-consistency check (conversation_manager.py lines 1469–1522) that detects when both abbreviated and expanded forms of the same term (e.g., "ML" / "Machine Learning") appear in different rewrites and surfaces an `info`-severity warning.

**Criterion 6 — Acronym expansion**
PARTIAL (LLM quality only). No explicit rule-based enforcement of first-use expansion (e.g., "MLOps (ML Operations)") exists. This depends on LLM instruction compliance.

**Failure-mode check:** Metric removal — blocked by `apply_rewrite_constraints`. Appended keyword — flagged by `check_keyword_appended`. Skill hallucination — guarded by `candidate_to_confirm` and evidence citation. Terminology inconsistency — flagged by batch consistency check.

---

### US-R4: Professional Summary Effectiveness

**Criterion 1 — Hook quality**
PARTIAL (LLM quality). `_validate_summary()` (cv_orchestrator.py lines 3595–3634) checks: opens with "I" (warns), word count (40–250 range), and top-3 required skills present. It does not verify that the opening line contains role type + years of experience + differentiator as the acceptance criterion requires.

**Criterion 2 — Keyword coverage**
PASS. `_validate_summary()` explicitly checks that the top-3 required skills from `job_analysis.required_skills` appear in the summary text and warns if missing.

**Criterion 3 — No fluff**
PASS. `check_summary_generic_phrases()` (via persuasion checks) flags phrases like "results-driven", "passionate about" with `warn` severity when more than 2 are found.

**Criterion 4 — Leadership scope**
PARTIAL (LLM quality). No code-level enforcement — relies on LLM following system prompt instructions.

**Criterion 5 — Length**
PARTIAL. `_validate_summary()` enforces a word count range (40–250 words) but the criterion requires 4–6 *lines*. A 250-word paragraph block could still violate the 4–6 line intent. No line-count check exists.

**Failure-mode check:** Same summary for all roles — guarded by session-specific `summary_focus` and `ai_recommended` key mechanisms. Opening with name/title — "I" is caught; "Gregory Warnes is a…" pattern is not. Comma-separated keyword dump — flagged by generic_phrases check.

---

### US-R5: Skills Section Optimisation

**Criterion 1 — Terminology alignment**
PASS. `_deduplicate_skills()` canonicalises to synonym map preferred names. The `skill_rename` rewrite type allows aligning display names to job posting terminology.

**Criterion 2 — No fabrication**
PASS. Only skills from `Master_CV_Data.json` (via `SessionDataView.normalized_skills()`) or explicitly approved extra skills enter the pipeline. `candidate_to_confirm` marks unverified additions.

**Criterion 3 — Grouping logic**
PASS. `_sort_categories()` applies template-variant-specific priority orders (e.g., academic: Research first; standard: Core Expertise first) and `_rank_skill_categories_by_relevance()` derives a session-specific category order from ATS keyword overlap.

**Criterion 4 — Density without redundancy**
PASS. `_deduplicate_skills()` merges synonym entries. `_group_inline_skills()` combines skills sharing a `group` key into a single inline entry with canonical name and parenthetical aliases.

**Criterion 5 — Candidate-to-confirm handling**
PASS (review-time UI). The amber "⚠ Weak evidence" / "⚠ Verify evidence" badge with evidence tooltip is rendered in the skills review tab (skills-review.js lines 727–728).

**OPEN ISSUE:** The acceptance criterion states candidate-to-confirm items must "never appear in generated output documents — all generated PDF, DOCX, and HTML files must contain only clean, unmarked text." The `candidate_to_confirm` flag is a review-step affordance only (correct), meaning the skill itself can appear in output without its badge. However, no code path enforces that an unconfirmed skill is *excluded* from generated documents by default — it passes through if the user has not explicitly omitted it. Whether this constitutes a gap depends on the intended workflow: if "candidate to confirm" means "the user must confirm it before it can appear in output," then an exclusion-by-default mechanism is missing. If it means "flag it for the user to decide," then the current behaviour is correct. The acceptance criterion wording ("never appear in generated output documents") suggests the former intent.

---

### US-R6: Rewrite Audit Traceability

**Criterion 1 — Full traceability**
PASS. `submit_rewrite_decisions()` (conversation_manager.py lines 1229–1281) builds `rewrite_audit` with every decision merged with its original proposal. Saved to `metadata.json` at generation time.

**Criterion 2 — Rejected rewrites reverted**
PASS. Only items where `outcome != 'reject'` are added to `approved_rewrites`; rejected items are audited but never applied.

**Criterion 3 — Edited rewrites**
PASS. When `outcome == 'edit'` and `final_text` is not None, `proposed` is replaced with `final_text` before adding to `approved_rewrites` (conversation_manager.py lines 1265–1268).

**Criterion 4 — Audit completeness**
PASS. All decisions including rejections are recorded in `rewrite_audit`. `_verify_rewrite_audit_alignment()` runs at generation time and logs mismatches to metadata.

**Failure-mode check:** All acceptance criteria met.

---

### US-R7: Spell & Grammar Check Quality

**Criterion 1 — No false positives on technical vocabulary**
PASS. `_prepopulate_spell_dict()` (review_routes.py lines 78–156) seeds the custom dictionary from all master CV data: skill names, company names, candidate name, institution names, certification issuers, and languages. Flagged words in the custom dictionary are silently skipped (spell_checker.py lines 210–214).

**Criterion 2 — No false positives on proper nouns**
PASS (via pre-population). All `experience[*].company` and `personal_info.name` values are added to the custom dictionary.

**Criterion 3 — Fragment tolerance in bullets**
PASS. `SpellChecker.SUPPRESSED_BULLET_RULES` (spell_checker.py lines 30–36) explicitly suppresses `SENTENCE_FRAGMENT`, `PUNCTUATION_PARAGRAPH`, `UPPERCASE_SENTENCE_START`, `WORD_CONTAINS_UNDERSCORE`, and `EN_UNPAIRED_BRACKETS` when `context == 'bullet'`.

**Criterion 4 — Skill names grammar-only check**
PASS. When `context == 'skill'`, all non-spelling LanguageTool matches are dropped (spell_checker.py lines 207–208).

**Criterion 5 — Corrections do not alter approved rewrite text beyond flagged span**
PASS. `_apply_spell_fixes_to_text()` applies fixes in reverse offset order and validates each fix against the expected original span before substituting.

**Criterion 6 — Custom dictionary seeded correctly**
PASS. `_prepopulate_spell_dict()` seeds from master data (name, skills, companies, institutions, languages). Called at spell-check initiation.

**Criterion 7 — Severity calibration**
PASS. `spell-check.js` line 219 sorts suggestions by `_sugSeverity()`: spelling/typo (0) → grammar (1) → style (2) → other (3). Spelling errors surface first.

**Deduplication:** `SpellChecker.add_word()` performs case-insensitive deduplication. `prepopulate_from_skills()` uses a lowercase set to prevent duplicates.

**Minor gap:** `_prepopulate_spell_dict` does not seed technical terms from publications (author names, journal names). A field-specific term in a publication title not present in the skill list could still trigger a false positive during spell-check of the publications section.

---

## Generated Materials Evaluation

### Publication Ranked Shortlist (US-R2 Acceptance Criterion)

The acceptance criterion states: "For any role where publications may be relevant, a ranked publication shortlist is presented with per-item relevance scores and rationale; it is never silently omitted or silently included in full."

The publications review tab (`tab-publications-review`) exists in the UI. Backend provides user-driven accept/reject via `publication_decisions`. The algorithm in `_select_publications()` does produce a ranked order by score but does not expose individual scores or per-item rationale to the user. This gap means users accept/reject publications without knowing which ones the system judged most relevant or why. This is particularly important for candidates with large publication records.

### Candidate-to-Confirm Skills in Generated Documents (US-R5)

As noted in US-R5, no stripping mechanism for `candidate_to_confirm` skills exists at generation time. The UI badge is correctly review-only; the skill name itself appears clean in output (the badge marker does not appear in documents). Whether unconfirmed skills should be automatically excluded from output (requiring explicit user approval to include them) is an open design question. The current implementation treats `candidate_to_confirm: True` as informational and includes the skill in output unless the user explicitly omits it.

### Summary Hook Structure (US-R4 Criterion 1)

No programmatic enforcement of the opening-line structure (role type + years + differentiator) exists. The word-count range (40–250 words) is verified; line count (4–6 lines) is not. These validations depend entirely on LLM instruction compliance.

---

## Terminology Clarity Assessment

- **"ATS"** is used throughout with tooltip on the badge ("Applicant Tracking System match score"). Good.
- **"Emphasize / Include / De-emphasize / Omit"** — standard professional terms, well-defined in the system prompt. Clear.
- **"Rewrites"** — appropriate; correctly distinguished from "edits."
- **"Harvest"** — creative metaphor for promoting improvements to the master CV; not standard industry terminology but adequately explained via tooltip ("save refined bullets, new skills, and summary variants back to your Master CV").
- **"Candidate to confirm"** — appropriately cautious phrasing for weak-evidence skill additions.
- **"Master CV"** vs session content distinction — consistently maintained throughout.
- **Publication handling** — the gap here is that the publications review UI does not communicate relevance scores or rationale, so users cannot make informed decisions about which publications to include.

---

## Summary of Findings

| Story | Status | Key Finding |
| ----- | ------ | ----------- |
| US-R1 (Analysis Quality) | PASS with gap | Keyword positional weighting is LLM-implicit; not surfaced to user |
| US-R2 (Content Selection) | PARTIAL | Publication ranked shortlist with per-item rationale not implemented; page-count gating strong |
| US-R3 (Rewrite Quality) | PASS | Constraint guard, consistency check, appended-keyword detection all present |
| US-R4 (Summary) | PARTIAL | Word-count checked (40–250 words); line-count (4–6) not checked; hook structure not validated |
| US-R5 (Skills) | PASS with open question | Candidate-to-confirm badge in UI correct; whether unconfirmed skills should be excluded from output by default is unresolved |
| US-R6 (Audit) | PASS | Full rewrite audit trail including rejections and edits; `_verify_rewrite_audit_alignment` in place |
| US-R7 (Spell Check) | PASS | Fragment suppression, severity sort, deduplication, and master-data seeding all implemented; publication terms not seeded (minor) |

### Priority Gaps

1. **GAP-PUB-RANK**: Publication ranked shortlist with per-item relevance scores and rationale is not shown to the user before accept/reject decisions. Users see the publications list but not why the algorithm ranked them in that order (US-R2 Criterion 4 and acceptance criterion).

2. **GAP-SUM-LINE**: Summary line-count enforcement missing. The system validates word count (40–250) but not the 4–6 line constraint. A dense paragraph block would pass validation (US-R4 Criterion 5).

3. **GAP-SUM-HOOK**: No programmatic check that the opening sentence contains role type + years of experience + differentiator. The "I"-prefix check is the only opening-structure validation (US-R4 Criterion 1).

4. **GAP-PUB-SEED**: Publications author names and journal names not seeded into the custom spell dictionary, risking false positives during spell-check of the publications section (US-R7 minor).
