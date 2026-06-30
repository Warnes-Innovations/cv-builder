<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Persuasion Expert UI Review

**Persona:** Persuasion strategist (Scott Adams / Robert Cialdini school)
**Reviewed:** 2026-06-30
**Branch:** feature/multi-user-deployment
**Source files examined:**
- `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`
- `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, `scripts/utils/llm_client.py`
- `scripts/routes/master_data_routes.py` (cover letter generation)

---

## US-P1: Narrative Arc and Identity Alignment

### Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| P1-1 | Professional summary opens with a value-identity statement, not a job title or name | ✅ Pass | `llm_client.py` lines 855–863: `generate_professional_summary()` prompt explicitly instructs "Open with a value-identity statement: strong verb + differentiating value claim (e.g. 'Drives 3× revenue growth…', 'Builds ML pipelines that…') — NOT a title + years-of-experience formula" |
| P1-2 | At least one forward-looking statement in the summary | ✅ Pass | `llm_client.py` line 865: Summary prompt includes "Close with a forward-looking statement aligned to the target role" |
| P1-3 | System warns if more than two equally-weighted narrative threads are present | ❌ Fail | No multi-thread narrative detection exists anywhere in the codebase. The `check_summary_generic_phrases()` function (`llm_client.py` lines 1381–1413) only detects generic filler phrases; there is no narrative-thread-count analysis. |
| P1-4 | Zero instances of "responsible for", "helped to", "assisted with", "was involved in" in proposed rewrites | ✅ Pass | `llm_client.py` lines 1145–1163 (`check_passive_voice()`): regex patterns `\bresponsible\s+for\b`, `\bhelped\s+(?:to\s+)?`, `\bwas\s+involved\s+in\b`, `\bassisted\s+(?:with|with)\b` all checked and flagged as `severity='warn'`. Rewrite prompt at lines 1832–1837 explicitly lists these as disallowed. |

**Summary:** 3/4 pass. The narrative-thread coherence check (P1-3) is not implemented; no code exists to detect "competing narratives" or count dominant narrative threads.

---

## US-P2: Social Proof and Authority Signals

### Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| P2-1 | `apply_rewrite_constraints` rejects any proposal that removes or vagues-over a numeric metric | ✅ Pass | `llm_client.py` lines 923–971 (`apply_rewrite_constraints()`): `nums_orig.issubset(nums_prop)` check at lines 956–959 rejects any rewrite that drops a number from the original. Constraint enforced by `propose_rewrites()` at lines 1884–1893. |
| P2-2 | Named recognisable organisations appear within the first 15 words of their respective bullet | ⚠️ Partial | `llm_client.py` lines 1278–1333 (`check_named_institution_position()`): checks a hardcoded list of branded orgs against first 15 words, flags as `severity='info'` (not 'warn'). The hardcoded list is incomplete — e.g. "BMS", "Roche", "AstraZeneca", "Penn" are absent. Flagged as info-only, not blocking. |
| P2-3 | Conditional omission decisions for Publications/Awards surfaced to user with rationale, not silently dropped | ⚠️ Partial | Publication decisions recorded in `publication_decisions` state (conversation_manager.py line 111) and Publications review tab exists (`index.html` line 214). `rank_publications_for_job()` provides per-publication rationale (`llm_client.py` lines 1540–1703). However, no explicit UI warning is triggered when a publication is excluded — omissions are applied silently via `customizations['rejected_publications']` (conversation_manager.py lines 1083–1099) without a visible user-facing explanation at exclusion time. |
| P2-4 | Publication recommendation list ranked by job-relevance (keyword + domain + authority signals), not recency or citation count | ✅ Pass | `llm_client.py` lines 1540–1703 (`rank_publications_for_job()`): LLM ranks by `relevance_score` 1–10 based on domain/skills/keywords match. Results sorted by `(-relevance_score, -year)` at line 1702. Prompt asks to "Select and rank up to N publications most relevant for this role." |
| P2-5 | Each recommended publication shows at least one authority signal alongside its relevance rationale | ✅ Pass | `llm_client.py` lines 1665–1676: `authority_signals` list built per result — `first_author` (from LLM), `journal: {name}` or `conference: {name}`. `venue_warning` flags missing venue. Publications review tab available to display these. |
| P2-6 | System flags bullets where a number is present in master data but absent in the proposed rewrite | ✅ Pass | `llm_client.py` lines 956–959 (`apply_rewrite_constraints()`): extracts numeric tokens from original; returns `False` (rewrite rejected) if original numbers not all present in proposed text. Every proposal filtered at lines 1884–1893. |

**Summary:** 4/6 pass, 2 partial. The hardcoded org list is narrow for life-science roles; publication omission rationale is available in state but not surfaced proactively when exclusions are applied.

---

## US-P3: Loss-Aversion and Urgency Framing

### Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| P3-1 | System identifies and proposes CAR (Challenge-Action-Result) structure for experience bullets where challenge language exists in master data | ⚠️ Partial | `llm_client.py` lines 1335–1378 (`check_car_structure()`): detects CAR presence via regex on *proposed rewrites*; flags missing CAR as `severity='info'`. However, no proactive CAR suggestion occurs during the Customise phase where challenge language may exist in source master-data bullets. |
| P3-2 | Rewrites prefer positive-sum metric framing ("increased X") over loss framing ("reduced Y") unless loss-framing is the impressive result | 🔲 Not Implemented | No positive-sum vs. loss-framing analysis exists in any check function. `check_has_result_clause()` (`llm_client.py` lines 1198–1233) treats "reduced" as a valid result indicator without distinguishing framing direction. The rewrite prompt does not instruct the LLM on framing preference. |
| P3-3 | Summary rewrite is checked against a short list of generic filler phrases; flagged if more than one appears | ✅ Pass | `llm_client.py` lines 1380–1413 (`check_summary_generic_phrases()`): 19-item `_GENERIC_FILLER_PHRASES` set checked against summary text. `pass=False` if >1 filler found; `severity='warn'` if >2 found. Triggered in `run_persuasion_checks()` when `location == 'summary'` (conversation_manager.py line 1324). |

**Summary:** 1/3 pass, 1 partial, 1 not implemented. Positive-sum framing preference is entirely absent. CAR detection covers proposed rewrites but not source data where challenge language already exists.

---

## US-P4: Rhetorical Quality of Bullet Points

### Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| P4-1 | Every proposed bullet begins with a verb from an approved strong-action-verb list | ✅ Pass | `llm_client.py` lines 982–1044 (`_STRONG_ACTION_VERBS` set, ~120 verbs) and lines 1088–1124 (`check_strong_action_verb()`): first word extracted and checked against the set. Fails → `severity='warn'`. Applied to all rewrites in `run_persuasion_checks()` (conversation_manager.py line 1294). |
| P4-2 | System flags any proposed bullet exceeding 30 words for compression review | ✅ Pass | `llm_client.py` lines 1167–1196 (`check_word_count(max_words=30)`): counts words after stripping intro phrase; flags as `severity='warn'`. Applied to all rewrites (conversation_manager.py line 1302). Rewrite prompt at line 1838 also instructs "Keep bullet text under 30 words". |
| P4-3 | System flags passive voice constructions in proposed rewrites | ✅ Pass | `llm_client.py` lines 1126–1165 (`check_passive_voice()`): 7 passive patterns including "was responsible for", "was involved in", "was tasked with". Severity='warn'. Applied to all rewrites (conversation_manager.py line 1299). |
| P4-4 | System flags bullets where no result clause (outcome, impact, or metric) is present | ✅ Pass | `llm_client.py` lines 1198–1233 (`check_has_result_clause()`): heuristic scan for number, outcome verbs, result connectors. Flags as `severity='info'`. Applied to all rewrites (conversation_manager.py line 1305). |

**Summary:** 4/4 pass. The bullet rhetorical check suite is fully implemented. Note: all checks apply to *proposed rewrites only*, not to original master-data bullets.

---

## US-P5: Cover Letter Persuasion Architecture

### Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| P5-1 | System rejects any draft where the first word is "I" and offers a rewrite prompt | 🔲 Not Implemented | No post-generation first-word check exists. `master_data_routes.py` lines 1603–1654: prompt provides `_OPENING_GUIDANCE` styles (formal/hook/narrative) but there is no programmatic check that the generated letter does not begin with "I". No rejection or re-prompt logic exists. |
| P5-2 | Cover letter references at least the company name and one specific role requirement in a non-generic way | ✅ Pass | `master_data_routes.py` lines 1609–1611: prompt includes company name and `req_skills` from job analysis. Line 1629: "Reference concrete skills and achievements from the candidate profile." Company context block is woven in when provided. No post-generation verification that company name appears in output. |
| P5-3 | Word count check enforced; letter exceeding 300 words triggers a compression review flag | ❌ Fail | `master_data_routes.py` lines 111–122: `_cover_letter_word_count_instruction()` specifies word counts as a generation target — 300–400 words standard, 400–500 exec, 500–600 academic. This is a *generation instruction*, not a post-generation check. No code counts generated letter words or surfaces a compression flag. The user story specifies 300-word maximum; the code targets 300–400 minimum for standard roles — a directional mismatch. |
| P5-4 | Closing sentence includes a specific proposed next step; flagged if absent | ⚠️ Partial | `master_data_routes.py` line 1630: prompt instructs "Close with a specific, confident request for an interview or a conversation about the role. Name the role explicitly. Avoid passive language such as 'I look forward to hearing from you.'" This is a generation instruction only — no post-generation check detects whether a CTA is absent or passive and flags it. |

**Summary:** 1/4 pass, 1 partial, 1 fail, 1 not implemented. Cover letter generation relies entirely on prompt instructions with no post-generation validation. The "I as first word" gate (P5-1), the 300-word enforcement (P5-3), and the CTA presence check (P5-4) are all missing as executable guards.

**Additional finding — word count spec mismatch:** US-P5 specifies "maximum 300 words." The implementation targets 300–400 words for standard roles and up to 600 for academic roles. The spec and implementation are directionally misaligned; the app generates longer letters than the persona story requires.

---

## US-P6: Consistency of Persuasive Register

### Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| P6-1 | System enforces that clarification-answer context is applied consistently across all generated content in the session | ⚠️ Partial | `post_analysis_answers` is passed to: summary generation (`llm_client.py` line 829), customization recommendations (conversation_manager.py line 763), and cover letter generation (`master_data_routes.py` lines 1562–1567). It is NOT passed to `propose_rewrites()` or to screening answer generation — so terminology consistency is not enforced across all touchpoints. |
| P6-2 | Cover letter core argument is cross-checked against summary framing; mismatch flagged for user review | 🔲 Not Implemented | No cross-document comparison exists. Summary and cover letter are generated independently with no code that compares their core claims, terminology, or narrative angle. |
| P6-3 | Prior screening-answer terminology compared against CV keyword choices; divergences presented as a harmonisation suggestion | 🔲 Not Implemented | No keyword comparison between screening answers and CV content exists. Screening responses are stored in `screening_responses` state (conversation_manager.py line 107) and a snippet is referenced in the cover letter prompt (lines 1879–1897), but only as contextual grounding — not as a keyword-harmonisation check. |

**Summary:** 0/3 pass, 1 partial, 2 not implemented. Cross-document consistency is the largest architectural gap. The `post_analysis_answers` thread is woven through several (but not all) generation steps. No semantic cross-referencing between the CV, cover letter, and screening answers exists.

---

## Overall Findings

### Implemented and Working
- **Bullet rhetorical checks** (US-P4): All 4 checks implemented and wired (`check_strong_action_verb`, `check_passive_voice`, `check_word_count`, `check_has_result_clause`).
- **Rewrite constraint guard** (US-P2-1, P2-6): `apply_rewrite_constraints()` enforces numeric/proper-noun preservation on every proposed rewrite.
- **Summary quality controls** (US-P1-1, P1-2, P1-4, P3-3): Summary prompt enforces value-identity opening, forward-looking close, and filters generic filler.
- **Publication relevance ranking** (US-P2-4, P2-5): `rank_publications_for_job()` ranks by job-relevance with first-author and journal/conference authority signals.

### Partial / Incomplete
- **Named institution positioning** (US-P2-2): Hardcoded org list is too narrow; flagged as info-severity only, not blocking.
- **Publication omission disclosure** (US-P2-3): Decisions tracked in state but no proactive UI warning when publications are excluded.
- **CAR structure detection** (US-P3-1): Check exists for rewrites; no proactive identification of challenge language in source master data.
- **Clarification-answer consistency** (US-P6-1): Passed to summary/customization/cover-letter but missing from rewrite proposals and screening.
- **Cover letter CTA presence** (US-P5-4): Instructed in prompt but no post-generation programmatic check.

### Not Implemented (New Gaps)

| Gap ID | Story | Description |
|--------|-------|-------------|
| — | US-P1-3 | Narrative-thread coherence warning — no detection of multiple equally-weighted narrative threads in selected content |
| — | US-P3-2 | Positive-sum framing preference — no framing direction analysis in checks or rewrite prompts |
| — | US-P5-1 | Cover letter "I as first word" gate — no post-generation check with rewrite offer |
| — | US-P5-3 | Cover letter word count enforcement — 300-word max not enforced; targets 300–400 (spec mismatch) |
| — | US-P6-2 | Cover letter × summary cross-check — no cross-document narrative alignment check |
| — | US-P6-3 | CV × screening terminology harmonisation — no keyword comparison across documents |

### Priority Assessment
1. **HIGH** — Cover letter post-generation validation (P5-1/P5-3/P5-4): three missing runtime guards implementable as one validation function in `master_data_routes.py` after line 1644.
2. **MED** — Positive-sum framing preference (P3-2): add a `check_metric_framing()` function to `llm_client.py` and update the rewrite prompt.
3. **MED** — Publication omission disclosure (P2-3): surface a visible warning in the Publications review tab when entries are moved to `rejected_publications`.
4. **LOW** — Cross-document consistency (P6-2/P6-3): architecturally new; would require a dedicated comparison pass after all three document types are generated.
5. **LOW** — Narrative thread detection (P1-3): requires LLM-based semantic clustering of selected experiences; no existing hook.
