<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Resume-Expert Review Status

**Last Updated:** 2026-07-07 20:15 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely. Source code review of the seven acceptance-test stories (US-R1–US-R7) finds the application substantially more sophisticated than a typical keyword-stuffing CV tool: it has a real synonym/canonicalisation layer, a persuasion-quality check suite, a rewrite-constraint validator that protects metrics/dates/proper nouns, and a rewrite-audit traceability chain with an automated alignment verifier. The most consequential gaps are (1) a fully-built persuasion check (`check_generic_filler`, which already lists "results-driven" as banned filler) that is never wired into `run_persuasion_checks`, leaving fluff detection to prompt instructions alone; (2) no cross-rewrite terminology-consistency check across a batch; (3) no evidence-citation validation gate on `skill_add` proposals (prompt-only); (4) conditional-inclusion rationale exists for Publications but not for Languages/Awards; and (5) the CV-length warning threshold (≥3.5 pages) is looser than the story's stated 3-page threshold. The three recently-touched areas called out in scope (BibTeX drop-field confirm guard, Master CV `domain_relevance` field, professional-summary variant title-casing) are all verified present and correctly wired in current source.

## Application Evaluation

### US-R1: Job Description Analysis Quality

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Required vs. preferred split, visually distinct | ✅ Pass | `scripts/utils/llm_client.py:329-337` (`required_skills`/`preferred_skills`/`must_have_requirements`/`nice_to_have_requirements` are separate JSON keys); `web/review-table-base.js:566-585` renders "🎯 Required Skills" and "⭐ Preferred / Nice-to-Have" as separate headed sections; `web/message-queue.js:216-236` likewise separates "🎯 Required Skills", "⚠️ Skill Gaps", "⭐ Preferred Skills", "✨ Nice to Have" under distinct `<h4>` headers. |
| 2 | Keyword deduplication (synonyms/acronyms grouped) | ✅ Pass | `scripts/utils/cv_orchestrator.py:126-170` loads `scripts/data/synonym_map.json` into a bidirectional `_expansion_index` (`canonical_skill_name()`); `scripts/utils/scoring.py:449-522` (`compute_ats_score`) uses the same `synonym_map` to mark `match_type: "synonym"` so "ML" and "Machine Learning" score as one matched keyword, not two gaps. |
| 3 | Domain inference with confidence; ambiguous cases prompt user | ✅ Pass | `scripts/utils/llm_client.py:330` requires `domain_confidence` (0.0–1.0) in the analysis JSON schema; `scripts/utils/conversation_manager.py:787-802` prepends a `domain_clarification` question when `domain_confidence < 0.7`; `web/review-table-base.js:539-547` renders a confidence-tiered warning chip (High/Medium/Low, with ⚠ for <0.8). |
| 4 | Keyword frequency/positional weighting | ✅ Pass | `scripts/utils/llm_client.py:314` explicit prompt instruction: "rank by: (1) frequency of occurrence... (2) positional prominence (job title / requirements section keywords outrank body-text mentions)". Enforcement is prompt-only (no independent scoring pass), so quality depends on LLM compliance — noted but not down-graded since no code path exists to violate it either. |

**Failure modes:** Preferred-as-required conflation is structurally prevented by separate fields (not merged pre-render). Duplicate-keyword-as-3-gaps failure mode is mitigated by the synonym map in ATS scoring, but the synonym map (`scripts/data/synonym_map.json`) is a fixed, curated list — an unlisted synonym pair (e.g., a job-specific abbreviation not in the map) would still be treated as two separate keywords. This is a coverage limit, not a design flaw.

### US-R2: Content Selection Strategy

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Recency bias check — relevance-based, not recency-biased | ✅ Pass | `scripts/utils/cv_orchestrator.py:3631-3659`: experiences are scored via `calculate_relevance_score()` (importance + keyword + domain + semantic match) and only secondarily broken by end-date; code comment explicitly states "Hybrid sort: relevance-primary, recency-secondary within equal scores." |
| 2 | Achievement (bullet) reordering proposed and applied | ✅ Pass | `scripts/utils/llm_client.py:577` (`bullet_order` field in the recommendation schema) + `scripts/utils/llm_response_models.py:69` (`bullet_order: Optional[BulletOrder]`); user-adjustable via `web/workflow-steps.js:661-781` (bullet-reorder modal, pre-seeded from `recRecord.bullet_order`); applied at render time via `customizations['achievement_orders']` in `scripts/utils/cv_orchestrator.py:3698-3723`. |
| 3 | Conditional section inclusion/exclusion shown with rationale | ⚠ Partial | **Publications:** ✅ full support — `scripts/utils/conversation_manager.py:804-826` asks an `include_publications` gate question for non-research domains; `scripts/utils/cv_orchestrator.py:4244-4338` (`_select_publications`) scores and ranks with a human-readable `rationale` string per item (recency, type, keyword/required-skill matches, domain, first-author), surfaced to chat at `conversation_manager.py:993-1014` ("Top recommended publications for this role"). **Languages/Awards:** 🔲 Not Implemented — no equivalent gate question, ranking, or rationale logic found anywhere in `scripts/utils/*.py` or `web/*.js` (`grep` for `include_languages`/`include_awards`/`languages_rationale`/`awards_rationale` returns zero hits). These sections are simply always-included/excluded based on presence in master data with no reasoned justification shown to the user. |
| 4 | Publication shortlist quality (keyword/domain/first-author/recency, not just most-cited/recent) | ✅ Pass | `scripts/utils/cv_orchestrator.py:4244-4312`: scoring combines recency (30/20/10 pt tiers), type bonus, ATS-keyword title matches (+5 each), required-skill title matches (+8 each), domain match (+15), first-author bonus (+10) — matches the story's exact rubric (keyword overlap, domain alignment, first-author, recency). |
| 5 | Length warning: >3 pages or <1.5 pages | ⚠ Partial | `scripts/utils/conversation_manager.py:1066-1101` (`_estimate_cv_body_pages`) + `:978-989` warns only at `est_pages >= 3.5` (not the story's stated >3) and at `est_pages < 1.5` (matches). The upper threshold is looser than specified — a 3.1–3.4 page CV would generate no warning despite exceeding the story's "3 pages" ceiling. |
| 6 | Selected Achievements — diverse impact types | 🔲 Not Implemented | No diversity/impact-type scoring exists. `scripts/utils/scoring.py:calculate_relevance_score` scores by importance + keyword + domain + audience tags only; there is no code that checks or nudges toward a mix of technical/leadership/business achievement types among the 4–6 selected. Selection is purely relevance-ranked, so an edge case (e.g., all top-scoring achievements being technical) would produce a non-diverse set with no system-level correction. |

### US-R3: Rewrite Quality and Constraint Adherence

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `apply_rewrite_constraints` rejects proposals removing numbers/dates/proper names | ✅ Pass | `scripts/utils/llm_client.py:951-1000`: checks numeric-token superset (`nums_orig.issubset(nums_prop)`) and Title-Case proper-noun superset (with a curated stop-word list to avoid false positives on sentence-initial verbs); called at `llm_client.py:2013-2022` inside `propose_rewrites`, discarding (with a `warnings.warn`) any proposal that fails. |
| 2 | Naturalness (not keyword-stuffed) | ⚠ Partial | Enforced via prompt instructions only (`llm_client.py:1960-1967`: "Avoid hedging language", "Use active voice") plus post-hoc **advisory** persuasion checks (`check_strong_action_verb`, `check_passive_voice`, `check_hedging_language` — all wired into `run_persuasion_checks`, `conversation_manager.py:1510-1529`) that surface warnings but do not block generation. No hard gate exists against a "keyword-stuffed" rewrite passing through if the LLM ignores instructions. |
| 3 | Keyword integration mid-sentence, not appended | ✅ Pass | `scripts/utils/llm_client.py:1444-1470` (`check_keyword_appended`) specifically flags when an ATS keyword absent from the original appears in the final 3 tokens of the proposed text — directly implements the story's "…pipelines. MLOps." failure-mode detection. Wired into `run_persuasion_checks` (`conversation_manager.py:1541-1546`, gated on experience-bullet location) and surfaced to the user with badges requiring acknowledgement (`web/rewrite-review.js:154-158, 238-255, 603-679`). |
| 4 | `skill_add` cites evidence; weak evidence flagged | ⚠ Partial | Schema documents `evidence` (comma-sep exp IDs) and `evidence_strength` as `skill_add`-only fields (`llm_client.py:771-774, 1983-1984`), and weak evidence is propagated into `candidate_to_confirm` (`cv_orchestrator.py:1811-1816`, `apply_approved_rewrites`). **However**, there is no programmatic validation that a `skill_add` proposal actually *contains* a non-empty `evidence` value before it is accepted into `pending_rewrites` — enforcement is prompt-only. A hallucinated `skill_add` with `evidence: ""` and `evidence_strength: "strong"` would not be caught or down-graded to `candidate_to_confirm`. |
| 5 | Terminology consistency across summary/bullets/skills in one batch | 🔲 Not Implemented | No cross-item consistency check exists. `grep` for `terminology_consisten`/`consistent_terminology`/`keyword_consistency` across `scripts/utils/*.py` returns zero hits. Because `propose_rewrites` generates the whole batch in a single LLM call, consistency is likely in practice, but nothing in code verifies or corrects it if the LLM introduces "MLOps" in one bullet and "productionizing ML pipelines" in the summary. |
| 6 | Acronym expansion on first use | 🔲 Not Implemented | No code path builds or checks a "TERM (Full Expansion)" first-use pattern. This is left entirely to the LLM's judgement, with no prompt instruction found requiring it and no post-hoc check. |

### US-R4: Professional Summary Effectiveness

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Hook quality (role type + years + differentiator) | ⚠ Partial | Prompt requires "a value-identity statement: strong verb + differentiating value claim... NOT a title + years-of-experience formula" (`scripts/utils/llm_client.py:887`) — this actually *contradicts* the story's literal acceptance text ("Opening sentence... contains role type + years experience + differentiator"); the app's prompt deliberately avoids the title+years formula in favour of a value-claim opening. This is a **story/implementation disagreement worth resolving**, not necessarily a bug — the app's approach (avoid formulaic "X years of experience in Y" openers) is arguably better resume-writing practice, but it means the literal acceptance criterion as written will never pass by design. Client-side `_checkSummarySpecificity` (`web/summary-review.js:166-193`) checks for a quantified claim and a role-title echo, which partially covers this. |
| 2 | Keyword coverage (3–5 keywords, natural) | ✅ Pass | `llm_client.py:868, 898` ("Weave in 3–5 of the provided ATS keywords naturally"); reinforced by `check_keyword_appended` at the rewrite-refinement stage. |
| 3 | No fluff ("results-driven", "passionate about", etc.) | ⚠ Partial | Prompt explicitly bans this (`llm_client.py:869, 891`) **and** a ready-made detector exists — `_GENERIC_FILLER_PHRASES` (`llm_client.py:1076-1100`) includes `'results-driven'`, `'passionate about'`, `'hard working'`, `'dynamic professional'`, etc., feeding a `check_generic_filler` static method (~`llm_client.py:1409-1441`). **This check is never called** — `grep -rn "check_generic_filler" scripts/ web/` returns zero call sites outside its own definition; it is not in `run_persuasion_checks`'s check list (`conversation_manager.py:1508-1551`) alongside the other 8 wired checks. Client-side `_checkSummarySpecificity` (`web/summary-review.js:187`) has its own smaller, non-overlapping generic-phrase list (`'experienced professional'`, `'track record of success'`, `'seeking a challenging'`) that also excludes "results-driven". **Net effect: nothing in the running application would ever flag a generated summary containing "results-driven" even though the codebase already has the exact detector needed.** This is the single highest-value, lowest-effort fix identified in this review — wire `check_generic_filler` into `run_persuasion_checks` for `type == 'summary'` rewrites. |
| 4 | Leadership scope stated for senior roles | 🔲 Not Implemented | No code checks for team-size/budget/scope mentions conditioned on `role_level` being Staff/Principal/Leadership. Left entirely to the LLM prompt (no explicit instruction found requesting this either). |
| 5 | Length 4–6 lines | ⚠ Partial | Prompt says "3–5 sentences (≈80–150 words)" (`llm_client.py:867, 885`) — sentences, not lines, and 3–5 not 4–6. No code-level length/line-count validation exists to catch a summary that balloons into a paragraph block. |

### US-R5: Skills Section Optimisation

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Terminology alignment (job-posting phrasing where equivalent) | ✅ Pass | `canonical_skill_name()` (`cv_orchestrator.py:164-170`) maps aliases ("ML" → "Machine Learning", "sklearn" → "scikit-learn") via `scripts/data/synonym_map.json`; used in `_deduplicate_skills` (line 513-541) for all rendered output. |
| 2 | Skills ordered by role relevance within category | ✅ Pass | `scripts/utils/conversation_manager.py:1021-1063` (`_rank_skill_categories_by_relevance`) sorts categories by count of recommended/ATS-matched skills; `cv_orchestrator.py:551-591` (`_sort_categories`) sorts skills within a category by years-of-experience (a relevance proxy) rather than alphabetically. |
| 3 | Grouping sensible for role type (e.g., de-emphasise Infra for pure research) | ✅ Pass | `_rank_skill_categories_by_relevance` (above) is ATS-keyword driven per job, so a research-only job with no infra keywords in `ats_keywords` will naturally rank Infrastructure/Cloud low. |
| 4 | Density without redundancy (one canonical + parenthetical aliases) | ✅ Pass | `_deduplicate_skills()` (`cv_orchestrator.py:513-541`) merges "Python"/"Python 3"/aliased forms into one canonical entry, tracking merged names in an `aliases` list rather than emitting duplicate entries. |
| 5 | "Candidate to confirm" flagged in review UI, never in output docs | ✅ Pass | Review UI: `web/skills-review.js:697, 727-735` renders a "⚠ Weak evidence"/"⚠ Verify evidence" badge with an evidence tooltip. Output exclusion verified across **all three** render paths: ATS DOCX (`cv_orchestrator.py:4407-4408`, filters `candidate_to_confirm` before `_optimize_skills_for_ats`), Human DOCX (`cv_orchestrator.py:5427-5428`), and the shared HTML/PDF template (`templates/cv-template.html:629, 781` — Jinja `{% if not skill.candidate_to_confirm %}` guards both the on-page skills list and the embedded JSON-LD/ATS plaintext block). No leak path found. |

### US-R6: Rewrite Audit Traceability

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `rewrite_audit` entry for every proposal with outcome + final | ✅ Pass | `scripts/utils/conversation_manager.py:1332-1384` (`submit_rewrite_decisions`): iterates **all** submitted `decisions` (not just accepted ones) and appends `{**proposal, 'outcome':…, 'final':…}` to `audit` unconditionally; persisted into `metadata.json` via `cv_orchestrator.py:2262` (`'rewrite_audit': rewrite_audit or []`). |
| 2 | Rejected rewrites reverted to original in output | ✅ Pass | `approved_rewrites` (used to build render content) is populated only for `outcome != 'reject'` (`conversation_manager.py:1368-1372`); rejected items are never applied, so original master-data text passes through unchanged. |
| 3 | Edited rewrites use final user text, not LLM proposal | ✅ Pass | `conversation_manager.py:1370-1371`: `if outcome == 'edit' and final is not None: approved_entry['proposed'] = final` — the edited text overwrites the proposal before being applied. |
| 4 | Audit non-empty even when all rewrites rejected | ✅ Pass | Same loop builds `audit` unconditionally regardless of `outcome`, independent of the `approved` list — a rejection produces an audit entry with `outcome: 'reject'`. |
| — | Automated alignment verification (beyond story's ask) | ✅ Pass (bonus) | `scripts/utils/cv_orchestrator.py:5747-5806+` (`_verify_rewrite_audit_alignment`) diffs each `accept`/`edit` audit entry's expected text against the actually-rendered content and returns mismatch warnings — a stronger, automated version of the story's "diff = zero unexplained changes" acceptance test, invoked at generation time (`cv_orchestrator.py:2135-2138`) and surfaced via `rewrite_audit_mismatches` in the generation result (`cv_orchestrator.py:2275`). |

### US-R7: Spell & Grammar Check Quality

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | No false positives on technical vocabulary in custom dictionary | ✅ Pass | `scripts/utils/spell_checker.py:210-214`: any flagged token normalized-matching `custom_lower` is skipped entirely (before being added to `suggestions`), regardless of rule type. |
| 2 | No false positives on proper nouns | ✅ Pass | Same mechanism; `scripts/routes/review_routes.py:78-156` (`_prepopulate_spell_dict`) seeds candidate name, company names, institutions, award/cert names, languages into the dictionary at session start (see #6 below). |
| 3 | Fragment tolerance in bullets | ✅ Pass | `scripts/utils/spell_checker.py:30-36` (`SUPPRESSED_BULLET_RULES` includes `SENTENCE_FRAGMENT`, `UPPERCASE_SENTENCE_START`, etc.) suppressed specifically `if context == 'bullet'` (line 203-204). |
| 4 | `skill_name` context: spelling-only, no grammar | ✅ Pass | `spell_checker.py:206-208`: `if context == 'skill' and not self._is_spelling_rule(m): continue` — filters out all non-spelling rule matches for skill context. |
| 5 | Accepted correction changes only the flagged span | ✅ Pass | `scripts/utils/cv_orchestrator.py:1835-1866+` (`apply_accepted_spell_fixes`) groups fixes by `section_id` and applies them "against the exact span that LanguageTool flagged," processing offsets **in reverse order** so multiple fixes in one field don't shift each other — exactly the mechanism the story's failure mode ("accepting a comma suggestion rewriting the entire sentence") warns against. |
| 6 | Custom dictionary seeded from Master CV on first run | ✅ Pass | `scripts/routes/review_routes.py:78-156`: seeds skills, personal name/title, all experience company/title pairs, education institution/degree/field, awards, certifications, languages/proficiency — broader coverage than the story's minimum ask. |
| 7 | Severity calibration (critical before stylistic) | ✅ Pass | `web/spell-check.js:209-219` (`_sugSeverity`): spelling(0) < grammar(1) < style(2) < other(3), used to `.sort()` suggestions before rendering. |
| — | Dictionary deduplication on every write | ✅ Pass | `spell_checker.py:80-90` (`add_word`): checks `word.lower() not in {existing lowercased}` before appending — dedup enforced at write time, not just read time. Whitespace-variant dedup (e.g., "Bio conductor" vs "Bioconductor") is not normalized beyond `.strip()`, a minor edge case not covered. |

## Generated Materials Evaluation

Generated-output quality (as opposed to the tool's mechanics) is largely a function of the constraint/validation code already documented above, since this is an LLM-authored, template-rendered pipeline rather than a static generator:

- **Factual integrity of output text** is well-protected: `apply_rewrite_constraints` (US-R3.1) is a hard gate on every proposal before it can reach the rendered CV, and `_verify_rewrite_audit_alignment` (US-R6 bonus) catches any residual mismatch between what was approved and what actually rendered.
- **Skills section cleanliness**: verified end-to-end that unconfirmed ("candidate to confirm") skills never reach any of the three output formats (ATS DOCX / Human DOCX / HTML+PDF) — see US-R5.5 above. This is a meaningful integrity guarantee for a resume-writing tool: a candidate cannot accidentally ship an unverified skill claim.
- **Publications selection** is evidence-based and job-specific (US-R2.4), a genuine differentiator versus tools that dump a full publication list or omit it outright.
- **Professional summary quality** is the weakest link in the generated-materials chain: the "no fluff" guarantee exists only as a prompt instruction with an unused detector sitting right next to it (`check_generic_filler`), so a summary containing "results-driven" or "passionate about" could ship to a real candidate's CV undetected by the system, contradicting the persona's core expectation that this class of amateur phrasing is systematically prevented, not just discouraged in a prompt.
- **Terminology consistency across the whole document** (summary vs. bullets vs. skills, same keyword phrasing) is not independently verified anywhere; quality depends entirely on the LLM's single-call batch coherence with no fallback check.
- **Achievement diversity** (US-R2.6) has no system-level assurance; a candidate whose top-scoring achievements happen to cluster in one domain (e.g., all technical, no leadership/business) would get a CV that reads one-dimensionally with nothing flagging it.

### Recent-cycle spot checks (Cycles 102–103 scope)

| Item | Status | Evidence |
|------|--------|----------|
| BibTeX editor confirm-before-save guard (dropped-field safety) | ✅ Verified present | `web/master-cv.js:1642-1655` (`saveMasterPublication`): computes `droppedKeys = _pubModalOriginalExtraKeys.filter(k => !(k in fields))` and calls `confirmDialog(...)` with a danger-styled "Save anyway"/"Go back" choice before any field the curator didn't intend to remove is silently dropped. `_pubModalOriginalExtraKeys` is captured at modal-open time (`web/master-cv.js:1094-1097`). |
| Master CV experience `domain_relevance` field addition | ✅ Verified present | Form field at `web/master-cv.js:622-623` ("Domain Relevance (comma-separated)"); load path `web/master-cv.js:2134-2135`; save path `web/master-cv.js:2159, 2170` (`domain_relevance: domainRelevanceRaw.split(',')...`); consumed by scoring at `scripts/utils/scoring.py:57-62` (`calculate_relevance_score`'s domain-relevance bonus). The field is no longer editable only via raw JSON — it round-trips through the CRUD modal correctly. |
| Professional-summary variant label title-casing fix | ✅ Verified present | `web/master-cv.js:1831` and `web/summary-review.js:136`: both now compute `key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())`, so a stored key like `senior_leadership_pharma` renders as "Senior Leadership Pharma" (with the raw key shown as a smaller parenthetical for curator reference) in both the Master CV editor list and the customisation-workflow summary picker — consistent between the two surfaces. |

## Additional Story Gaps / Proposed Story Items

1. **US-R4.1 hook-quality criterion conflicts with the app's actual (arguably better) design choice.** The story literally asks for "role type + years of experience + differentiator" as the opening formula, but `scripts/utils/llm_client.py:887` explicitly instructs the LLM to avoid exactly that formula in favour of a value-claim opener. Recommend the story be revised to describe the *intent* (a strong, specific, non-generic hook) rather than a literal template, or explicitly bless the value-claim-first approach the app already implements — as written, this criterion can never pass without either the story or the prompt changing.
2. **Propose a new acceptance item under US-R4 or US-R7: "Generic filler phrases are programmatically detected, not just prompt-discouraged."** The infrastructure (`_GENERIC_FILLER_PHRASES` + `check_generic_filler`) already exists and is unused — this is a near-zero-cost fix (wire it into `run_persuasion_checks` for `type == 'summary'`) that would close a real, demonstrated gap between the story's intent and the current guarantee.
3. **Propose a new acceptance item under US-R3: "A batch-level terminology-consistency check flags divergent phrasing for the same introduced keyword across summary/bullets/skills."** Currently unimplemented and unenforced; worth an explicit criterion since the current story only implies it via the failure-mode list without a testable acceptance line.
4. **US-R2.3's "Conditional section decisions (Publications, Languages, Awards)" bundles three sections with wildly different implementation maturity** (Publications: fully built with per-item rationale; Languages/Awards: no equivalent logic at all). Recommend splitting into separate acceptance lines per section so partial completion is visible instead of hidden inside one bundled criterion.
5. **Terminology observation:** the app's Master CV UI now shows both a title-cased "pretty label" and the raw snake_case key side-by-side for professional-summary variants (`web/master-cv.js:1831`, comment references "no separate display-name field yet"). This is a reasonable stopgap but is itself evidence that the underlying data model still lacks a first-class display-name field — worth tracking as a follow-up gap distinct from the title-casing rendering fix that was just completed.
6. **US-R2.5's exact page-length threshold (>3 pages) does not match the implementation's threshold (≥3.5 pages).** Either the story or the implementation should be reconciled; as-is, a 3.2-page CV silently passes review with no warning despite technically exceeding the documented ceiling.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, plus supporting files: scripts/utils/llm_client.py, scripts/utils/scoring.py, scripts/utils/spell_checker.py, scripts/routes/review_routes.py, web/master-cv.js, web/summary-review.js, web/skills-review.js, web/review-table-base.js, web/rewrite-review.js, web/message-queue.js, web/workflow-steps.js, templates/cv-template.html

| Story | ✅ Pass | ⚠ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-R1 | 4 | 0 | 0 | 0 | 0 |
| US-R2 | 3 | 2 | 0 | 1 | 0 |
| US-R3 | 2 | 2 | 0 | 2 | 0 |
| US-R4 | 1 | 3 | 0 | 1 | 0 |
| US-R5 | 5 | 0 | 0 | 0 | 0 |
| US-R6 | 5 | 0 | 0 | 0 | 0 |
| US-R7 | 8 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- US-R1.2 (keyword dedup): `scripts/utils/cv_orchestrator.py:126-170` (synonym map) + `scripts/utils/scoring.py:449-522` (synonym-aware ATS scoring)
- US-R2.3 (Publications rationale): `scripts/utils/cv_orchestrator.py:4244-4338` (`_select_publications`)
- US-R2.3 (Languages/Awards rationale): not found in `scripts/utils/*.py` or `web/*.js`
- US-R3.3 (keyword-appended check): `scripts/utils/llm_client.py:1444-1470` (`check_keyword_appended`), wired at `scripts/utils/conversation_manager.py:1541-1546`
- US-R3.5 (terminology consistency): not found — `grep` for `terminology_consisten|consistent_terminology|keyword_consistency` across `scripts/utils/*.py` returns zero hits
- US-R4.3 (generic filler): detector exists at `scripts/utils/llm_client.py:1076-1100, 1409-1441` (`_GENERIC_FILLER_PHRASES`, `check_generic_filler`) but is never called — confirmed via `grep -rn "check_generic_filler" scripts/ web/` returning only its own definition
- US-R5.5 (candidate-to-confirm exclusion): `scripts/utils/cv_orchestrator.py:4407-4408` (ATS DOCX), `:5427-5428` (Human DOCX), `templates/cv-template.html:629,781` (HTML/PDF)
- US-R6 (audit alignment verifier): `scripts/utils/cv_orchestrator.py:5747-5806`
- US-R7.5 (span-only correction): `scripts/utils/cv_orchestrator.py:1835-1866` (`apply_accepted_spell_fixes`)
- Recent-cycle BibTeX guard: `web/master-cv.js:1642-1655`
- Recent-cycle `domain_relevance` field: `web/master-cv.js:622-623, 2134-2135, 2159-2170`
- Recent-cycle summary-label title-casing: `web/master-cv.js:1831`, `web/summary-review.js:136`

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
