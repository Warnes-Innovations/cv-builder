<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Resume Optimisation Expert — UI Review
**Persona:** US-R* (Resume Expert)
**Review date:** 2026-06-30
**Branch:** feature/multi-user-deployment
**Reviewer:** Source-verified (Claude Code)

---

## US-R1: Job Description Analysis Quality

### Criterion 1.1 — Required vs. preferred split (visually distinct sections)
**Status: ✅ Pass**

`bundle.js:3640–3659` renders `required_skills` in a `skill-grid` block under "🎯 Required Skills" and `preferred_skills` + `nice_to_have_requirements` combined under "⭐ Preferred / Nice-to-Have". Must-have requirements appear in a third block "✅ Must-Have Requirements" (`bundle.js:3677–3684`). Three visually distinct sections are present.

`llm_client.py:281–310` — `analyze_job_description()` prompt separates `required_skills`, `preferred_skills`, `must_have_requirements`, and `nice_to_have_requirements` into four distinct JSON keys.

### Criterion 1.2 — Keyword deduplication / synonym grouping
**Status: ⚠️ Partial**

`cv_orchestrator.py:116–120` loads `scripts/data/synonym_map.json` and builds `self._expansion_index` for downstream scoring. Synonym expansion is used in `_ach_relevance()` (line 3213) and `_deduplicate_skills()` (lines 503–593). However, the analysis phase does not deduplicate keywords: `analyze_job_description()` (`llm_client.py:298–310`) asks for `ats_keywords` as "top 10" without a synonym-grouping instruction. No post-processing merges "ML" + "Machine Learning" in the displayed keyword list.

**Missing:** No structural synonym-grouping applied to `ats_keywords` before display in the Analysis tab.

### Criterion 1.3 — Domain inference with confidence level; ambiguous cases prompt user
**Status: ⚠️ Partial**

`llm_client.py:303` returns `domain` as a free-text string only. No `domain_confidence` field is extracted. `bundle.js:3626` renders `data.domain` as a metadata chip with no confidence annotation. The post-analysis question flow may surface clarifying questions, but there is no code that checks domain confidence and conditionally prompts the user when confidence is low.

**Missing:** Domain confidence not extracted from LLM; no threshold-based conditional clarification prompt.

### Criterion 1.4 — Keyword frequency weighting
**Status: ⚠️ Partial**

`analyze_job_description()` (`llm_client.py:281–310`) requests "top 10 keywords" and the Analysis tab shows rank by array position (`bundle.js:3664`, `#1`…`#10`). There is no explicit frequency/title-position weighting instruction in the prompt. The LLM is expected to rank by importance, but no code enforces it.

**Missing:** No explicit frequency-weighting instruction; relies on LLM judgment.

---

## US-R2: Content Selection Strategy

### Criterion 2.1 — Recency bias check — relevance-primary
**Status: ✅ Pass — GAP-225 Confirmed Fixed**

`cv_orchestrator.py:3144–3165` hybrid sort:
```python
scored_experiences.sort(
    key=lambda x: (-x[1], -_parse_end_date(x[0]).toordinal()),
)
```
Score = `llm_score + keyword_score + semantic_score`. Recency (`-date_ordinal`) is strictly secondary, only breaking ties. The old reverse-chrono override is gone.

### Criterion 2.2 — Achievement ordering within a job (most relevant bullet first)
**Status: ✅ Pass**

`cv_orchestrator.py:3207–3217`: when no user-defined order exists in `achievement_orders`, bullets are sorted by `_ach_relevance()` which counts keyword overlap with synonym expansion via `self._expansion_index`. Applied before generation.

### Criterion 2.3 — Section inclusion logic with rationale (Publications, etc.)
**Status: ✅ Pass**

`publications-review.js:137` renders `pub.rationale` per item. `review_routes.py:1293–1457` serves LLM-ranked recommendations with confidence, rationale, first-author flag, and score. The UI shows recommended vs. non-recommended with a divider, pre-set accept/reject defaults, and per-item reasoning.

### Criterion 2.4 — Publication shortlist quality: relevance-ranked, not all-or-nothing
**Status: ✅ Pass**

`llm_client.py:1599–1704` — `rank_publications_for_job()` sends up to 60 publications to the LLM with domain, title, required skills, and ATS keywords. Returns per-item `relevance_score` (1–10), `confidence`, `is_first_author`, `rationale`. Results sorted by `(-relevance_score, -year)`. Publications are never silently included or excluded; the user sees a ranked shortlist with explicit accept/reject controls.

### Criterion 2.5 — Completeness without bloat: page length warning
**Status: ⚠️ Partial**

Post-generation: `web_app.py:5022–5041` — ATS validation includes `cv_page_count` check (configurable `ideal_min`/`ideal_max`, defaults 2–3); flags `warn` for 1 page, `fail` for >4 pages. This runs **after** PDF generation.

Pre-generation: `cv_orchestrator.py:3397–3414` applies `_cap_cv_body_to_pages()` when `max_cv_pages` is configured but shows no user-facing warning.

**Missing:** No proactive length warning during the customisation phase; warning is post-generation only.

### Criterion 2.6 — Selected Achievements: diverse impact types
**Status: ⚠️ Partial**

`cv_orchestrator.py:3225–3240` scores achievements by combined LLM + keyword + semantic score. No constraint enforces diversity across technical/leadership/business impact types. The system may favour keyword-dense achievements from a single domain.

**Missing:** No diversity-across-impact-types constraint in achievement selection.

---

## US-R3: Rewrite Quality and Constraint Adherence

### Criterion 3.1 — Factual preservation: apply_rewrite_constraints catches violations
**Status: ✅ Pass**

`llm_client.py:923–971` — `apply_rewrite_constraints()` (static method) checks:
1. All numeric tokens (`r'\d[\d,\.]*%?'`) from original are present in proposed (lines 956–959).
2. All Title-Case proper-name tokens (not in stop-word list) survive (lines 961–969).

Applied at proposal time (`llm_client.py:1885–1893`) and again at application time (`cv_orchestrator.py:1678–1684`).

### Criterion 3.2 — Naturalness (no keyword stuffing)
**Status: ⚠️ Partial**

`llm_client.py:1832–1838` instructs active voice, strong action verbs, no hedging, bullets under 30 words. No automated post-processing check validates that keywords appear mid-sentence rather than appended.

### Criterion 3.3 — Keyword integration (mid-sentence, not appendage)
**Status: ⚠️ Partial** (same as 3.2 — prompt-level guidance only, no structural check)

### Criterion 3.4 — No fabrication: skill_add must cite evidence
**Status: ✅ Pass**

`llm_client.py:743–748` — `propose_rewrites()` schema requires `evidence` (comma-separated exp IDs) and `evidence_strength` for `skill_add`.
`cv_orchestrator.py:1776–1790` — `apply_approved_rewrites()` stores `evidence` and sets `candidate_to_confirm: True` when `evidence_strength == "weak"`.
Rewrite prompt at line 1854 instructs LLM to supply experience IDs as evidence.

### Criterion 3.5 — Terminology consistency across rewrites
**Status: 🔲 Not Implemented**

No code validates that a keyword adopted in one bullet is consistently used across the summary and other bullets. The LLM processes all rewrites in one batch, providing implicit consistency, but no post-processing cross-field consistency check exists.

### Criterion 3.6 — Acronym expansion on first use
**Status: 🔲 Not Implemented**

No constraint in `apply_rewrite_constraints()`, the LLM prompt, or post-processing enforces acronym-expansion-on-first-use.

---

## US-R4: Professional Summary Effectiveness

### Criterion 4.1 — Hook quality (role type + years + differentiator)
**Status: ⚠️ Partial**

`llm_client.py:856–864` — generation prompt explicitly prohibits "title + years" opening formula and requires a "value-identity statement: strong verb + differentiating value claim". Years of experience is not required in the opening. No post-generation structural validation of the opening line.

### Criterion 4.2 — Keyword coverage
**Status: ✅ Pass**

`llm_client.py:860` — "Weave in 3–5 of the provided ATS keywords naturally". Keywords provided at line 869.

### Criterion 4.3 — No fluff
**Status: ✅ Pass**

Both generation and refinement prompts (`llm_client.py:841, 863`) explicitly forbid "passionate", "results-driven", "hard-working". `llm_client.py:1054–1061` includes a `_FLUFF_PHRASES` list used in persuasion quality checks.

### Criterion 4.4 — Leadership scope stated
**Status: ⚠️ Partial**

`role_level` is passed to the prompt (`llm_client.py:822–826`) but no explicit instruction mandates team size / budget / scope when `role_level` is "Leadership" or "Principal".

### Criterion 4.5 — Length (4–6 lines)
**Status: ⚠️ Partial**

Prompt requires "3–5 sentences (≈80–150 words)" (`llm_client.py:857–858`). The acceptance criterion says "4–6 lines". These overlap but are not identical. No post-generation line-count validation.

### AC: Role-specific summary
**Status: ✅ Pass**

`session_data_view.py:352–361` — `professional_summaries()` overlays session variants over master variants. `cv_orchestrator.py:3380–3393` uses `SessionDataView.selected_summary()` to resolve the active summary variant without modifying master data.

### AC: System does not inject "results-driven" filler
**Status: ✅ Pass** (prompt-level prohibition at `llm_client.py:841, 863`)

---

## US-R5: Skills Section Optimisation

### Criterion 5.1 — Terminology alignment
**Status: ✅ Pass**

`cv_orchestrator.py:3268–3280` — skills scored by `calculate_skill_score()` against job keywords. Recommended skills prepended. `skill_rename` rewrite type (`cv_orchestrator.py:1737–1773`) enables renaming to job-preferred phrasing.

### Criterion 5.2 — No fabrication
**Status: ✅ Pass**

Only master CV skills or explicitly user-approved `extra_skills` (via customisations) are included. `skill_add` rewrites require evidence IDs.

### Criterion 5.3 — Grouping logic
**Status: ✅ Pass**

`cv_orchestrator.py:590–593` — `_group_skills_by_category()` calls `_deduplicate_skills()` with synonym map. Skills review UI shows AI-suggested grouping changes with ATS impact (`skills-review.js:710–713`).

### Criterion 5.4 — Density without redundancy
**Status: ✅ Pass**

`cv_orchestrator.py:503–593` — `_deduplicate_skills()` canonicalises via synonym map. CV template renders grouped skills as comma-separated values (`cv-template.html:628`, `{% if not skill.candidate_to_confirm %}`).

### Criterion 5.5 — Candidate-to-confirm handling
**Status: ✅ Pass (Review UI) + ✅ Pass (Output Documents)**

**Review UI:** `skills-review.js:633, 663–664` — `candidateBadge` rendered as `'⚠ Verify evidence'` in red (#9f1239) with tooltip.

**Output documents:** `cv-template.html:628` — Jinja guard `{% if not skill.candidate_to_confirm %}` excludes unconfirmed skills from human CV HTML. Line 777 repeats the guard for ATS DOCX plain-text. Unconfirmed skills never appear in PDF, DOCX, or HTML output.

### All US-R5 Acceptance Criteria: ✅ Pass

---

## US-R6: Rewrite Audit Traceability

### Criterion 6.1 — rewrite_audit contains every proposal
**Status: ✅ Pass**

`conversation_manager.py:1138–1157` — `submit_rewrite_decisions()` builds `audit` by iterating all decisions (line 1144–1148), including rejections. Stored at `self.state['rewrite_audit']`.

`cv_orchestrator.py:2194` — `rewrite_audit` written to `metadata.json`.

### Criterion 6.2 — Rejected rewrites revert to original
**Status: ✅ Pass**

`conversation_manager.py:1150` — only non-rejected items enter `approved_rewrites`. `apply_approved_rewrites()` applies only approved items; rejected proposals never modify content.

### Criterion 6.3 — Edited rewrites use user's final text
**Status: ✅ Pass**

`conversation_manager.py:1152–1153` — `if outcome == 'edit' and final is not None: approved_entry['proposed'] = final`.

### Criterion 6.4 — Audit completeness including rejections
**Status: ✅ Pass**

`audit.append({**proposal, 'outcome': outcome, 'final': final})` called for every decision, including `reject` (`conversation_manager.py:1144–1148`).

### All US-R6 Acceptance Criteria: ✅ Pass

---

## US-R7: Spell & Grammar Check Quality

### Criterion 7.1 — No false positives on technical vocabulary
**Status: ✅ Pass**

`spell_checker.py:210–214` — skips any flagged word whose normalized form is in `custom_lower`. `review_routes.py:78–156` — `_prepopulate_spell_dict()` seeds dictionary from master CV skills, companies, institutions, certifications.

### Criterion 7.2 — No false positives on proper nouns
**Status: ✅ Pass**

Same mechanism as 7.1. Company names seeded via `review_routes.py:116–122`.

### Criterion 7.3 — Fragment tolerance in bullets
**Status: ✅ Pass**

`spell_checker.py:30–36` — `SUPPRESSED_BULLET_RULES` frozenset: `SENTENCE_FRAGMENT`, `PUNCTUATION_PARAGRAPH`, `UPPERCASE_SENTENCE_START`, `WORD_CONTAINS_UNDERSCORE`, `EN_UNPAIRED_BRACKETS`. Suppressed when `context == 'bullet'` (line 203–204).

### Criterion 7.4 — Skill names receive spelling-only checking
**Status: ✅ Pass**

`spell_checker.py:206–208` — `if context == 'skill' and not self._is_spelling_rule(m): continue`.

### Criterion 7.5 — Corrections change only the flagged span
**Status: ✅ Pass**

`cv_orchestrator.py:1994–2006` — fixes sorted by offset descending (reverse), applied as slice replacements. Guard at lines 2001–2004 verifies the span still matches `original` before replacing.

### Criterion 7.6 — Custom dictionary seeded from master data
**Status: ✅ Pass**

`review_routes.py:78–156` — seeds skills, name, title, company names, education institutions/degrees/fields, award titles, certification names/issuers, language names. Called before spell check at `review_routes.py:1731, 1946`.

### Criterion 7.7 — Severity calibration (critical errors first)
**Status: ⚠️ Partial**

`spell_checker.py:225–243` — suggestions returned in LanguageTool's native offset order, not severity order. No severity-based sorting occurs in `check()` or in the spell-check route.

**Missing:** Spell results not sorted by severity (spelling errors before stylistic grammar suggestions).

### US-R7 Acceptance Criteria Summary

| Criterion | Status |
|---|---|
| Custom dictionary words → zero flags | ✅ Pass |
| Action-verb bullet → zero fragment warnings | ✅ Pass |
| skill_name context → spelling only | ✅ Pass |
| Accepted corrections change exactly the flagged span | ✅ Pass |
| custom_dictionary.json deduplicated on write | ✅ Pass (`add_word()` line 85–86 deduplicates) |

---

## GAP-225 Specific Verification

**Status: ✅ Confirmed Fixed**

`cv_orchestrator.py:3144–3165` — sort key is `(-score, -date_ordinal)`. Relevance is primary; recency only breaks ties. No reverse-chrono override remains. User-explicit `experience_row_order` (lines 3171–3177) correctly overrides the hybrid sort only when set.

---

## Summary by User Story

| Story | Status | Primary Gap |
|---|---|---|
| US-R1: Analysis quality | ⚠️ Partial | Domain confidence absent; keyword dedup/frequency relies on LLM |
| US-R2: Content selection | ⚠️ Partial | No pre-generation page-length warning; no achievement diversity constraint |
| US-R3: Rewrite quality | ⚠️ Partial | No terminology consistency check; no acronym expansion enforcement; no mid-sentence placement check |
| US-R4: Summary effectiveness | ⚠️ Partial | Opening-line structure not validated; length target slightly mismatched |
| US-R5: Skills section | ✅ Pass | All acceptance criteria met |
| US-R6: Rewrite audit | ✅ Pass | All acceptance criteria met |
| US-R7: Spell/grammar | ⚠️ Partial | No severity-based sorting of spell results |

---

## New Gaps Identified

| Gap ID | Severity | Description |
|---|---|---|
| GAP-226 | MED | Analysis tab: `ats_keywords` not deduplicated/synonym-grouped before display |
| GAP-227 | MED | Analysis tab: no `domain_confidence` field; no conditional clarification prompt for ambiguous domain |
| GAP-228 | MED | Analysis prompt: no explicit keyword-frequency/title-position weighting instruction |
| GAP-229 | LOW | Rewrite proposals: no post-LLM check that introduced keywords appear mid-sentence |
| GAP-230 | MED | Rewrite system: no cross-field terminology consistency check after batch generation |
| GAP-231 | LOW | Rewrite system: no acronym-expansion-on-first-use enforcement |
| GAP-232 | MED | Professional summary: opening-line not validated post-generation; length mismatch (3–5 sentences vs 4–6 lines criterion) |
| GAP-233 | MED | Achievement selection: no diversity-across-impact-types constraint (technical/leadership/business) |
| GAP-234 | LOW | Spell check: results not sorted by severity (spelling before stylistic grammar) |
| GAP-235 | MED | Page length: no proactive user-visible warning during customisation if estimated CV exceeds 3 pages or is under 1.5 pages |
