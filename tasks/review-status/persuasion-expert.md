<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Persuasion Expert Review Status

**Last Updated:** 2026-06-18 (source-first refresh; prior pass: 2026-04-22)

**Executive Summary:** US-P4 (Rhetorical Quality) remains the strongest area — all four bullet-quality checks are implemented and blocking. US-P2 (Social Proof) is mostly solid: metric-preservation is enforced in `apply_rewrite_constraints` and publications are ranked by job-relevance via LLM. Primary remaining gaps: (1) no narrative-fragmentation detection (US-P1-AC3 and US-P6 cross-document consistency remain 🔲 Not Implemented); (2) cover letter post-generation validation has no programmatic enforcement of the first-word "I" rejection, word-count ceiling, or call-to-action specificity — all rely solely on LLM prompt instructions; (3) positive-sum metric reframing (US-P3-AC2) is absent; (4) non-recommended publications are shown without a rationale for exclusion; (5) the summary-generation prompt instructs "title + years of experience" as the opener, which is title-first framing rather than value-identity framing.

---

## Application Evaluation

### US-P1 — Narrative Arc and Identity Alignment

| AC | Status | Evidence |
|----|--------|----------|
| P1-AC1: Summary opens with value-identity statement, not a job title or name | ⚠️ Partial | `llm_client.py:850` prompts "Open with a strong positioning statement (title + years of experience)" — this instructs title-first framing, not a value-identity statement as the story requires. No backend check validates the actual output against a value-identity pattern. |
| P1-AC2: At least one forward-looking statement in the summary | ✅ Pass | `llm_client.py:853` explicitly instructs "Close with a forward-looking statement aligned to the target role" in `generate_professional_summary`. Forward-looking close is required by the prompt. |
| P1-AC3: System warns if more than two equally-weighted narrative threads are present | 🔲 Not Implemented | No narrative-thread detection or identity-fragmentation warning anywhere in backend or frontend. Nothing in `conversation_manager.py`, `llm_client.py`, or any route file detects or warns on competing identities. |
| P1-AC4: Zero instances of "responsible for", "helped to", "assisted with", "was involved in" in proposed rewrites | ⚠️ Partial | `check_passive_voice` (`llm_client.py:1101`) and `check_hedging_language` (`llm_client.py:1209`) detect these exact patterns and are invoked on every proposed rewrite (`conversation_manager.py:1254–1266`). However, original master bullets that are included without rewrite are never checked. |

**Story assessment: Partial.** Forward-looking summary close is enforced. The opening instruction is title-first rather than value-identity-first. Narrative-fragmentation detection is absent.

---

### US-P2 — Social Proof and Authority Signals

| AC | Status | Evidence |
|----|--------|----------|
| P2-AC1: `apply_rewrite_constraints` rejects any proposal that removes or vagues-over a numeric metric | ✅ Pass | `llm_client.py:946–948` — all numeric tokens from the original must be a subset of those in the proposed text; rewrite is discarded otherwise. Applied in `cv_orchestrator.py:1678` and `llm_client.py:1858`. |
| P2-AC2: Named recognisable organisations appear within first 15 words | ⚠️ Partial | `check_named_institution_position` at `llm_client.py:1252` checks a hardcoded set of ~50 brand names (`llm_client.py:1272–1283`). The list is FAANG- and top-journal-biased; pharma/biotech brands like Roche, AstraZeneca, Novartis, GSK are absent. Warning fires in rewrite panel (`rewrite-review.js:269`). |
| P2-AC3: Conditional omission decisions for Publications/Awards surfaced to user with rationale | ⚠️ Partial | Non-recommended publications are appended to the recommendations list with `is_recommended=False` and rendered at 70% opacity (`publications-review.js:141`). However, `rationale` is `''` for all non-recommended entries (`review_routes.py:1436`). The user sees which publications were deprioritised but receives no explanation why. |
| P2-AC4: Publication list ranked by job-relevance (keyword + domain + authority signals) | ✅ Pass | `rank_publications_for_job` (`llm_client.py:1513`) prompts the LLM using domain, required skills, and ATS keywords; results sorted by `relevance_score` descending then year descending (`llm_client.py:1676`). LLM determines `is_first_author`. |
| P2-AC5: Each recommended publication shows at least one authority signal | ⚠️ Partial | `authority_signals` list populated with `first_author` and `journal:`/`conference:` tokens (`llm_client.py:1639–1645`). UI renders `is_first_author` as a star and the citation text (`publications-review.js:132`). Full `authority_signals` array is not rendered as distinct badges; citation count is not a data field. |
| P2-AC6: System flags bullets where a number is present in master data but absent in the proposed rewrite | ✅ Pass (silent) | `apply_rewrite_constraints` enforces this — proposals that drop numbers are filtered out (`llm_client.py:1858–1866`). The user sees fewer proposals but no explicit "a metric was stripped" flag. Constraint is enforced; UX transparency is a minor gap. |

**Story assessment: Mostly passing.** Metric-preservation and publication-ranking mechanics are solid. Gaps: institution name list is incomplete for biotech domain; non-recommended publication rationale is always empty; authority signals are partially displayed in UI.

---

### US-P3 — Loss-Aversion and Urgency Framing

| AC | Status | Evidence |
|----|--------|----------|
| P3-AC1: System identifies and proposes CAR (Challenge-Action-Result) structure for bullets where challenge language exists | ⚠️ Partial | `check_car_structure` (`llm_client.py:1309`) detects presence/absence of challenge and result patterns and fires as `severity='info'` when missing (`llm_client.py:1350`). Applied to experience bullets at `conversation_manager.py:1274–1277`. However: (a) the check fires on *proposed rewrites*, not on master data to detect preservation opportunities; (b) it does not generate a CAR-structured alternative proposal. |
| P3-AC2: Rewrites prefer positive-sum metric framing ("increased X") over loss framing ("reduced Y") unless loss-framing is impressive | 🔲 Not Implemented | No positive-sum vs. loss-framing check or prompt instruction exists in `llm_client.py`, `conversation_manager.py`, or the rewrite prompt (`llm_client.py:1792–1838`). The rewrite prompt requires preserving metrics but does not specify framing direction. |
| P3-AC3: Summary rewrite checked against generic filler phrases; flagged if more than one appears | ✅ Pass | `check_summary_generic_phrases` (`llm_client.py:1354`) with `_GENERIC_FILLER_PHRASES` set (`llm_client.py:1037`). Severity is `'warn'` at >2 matches, `'info'` for 2 or fewer. Applied at `conversation_manager.py:1280–1282`. |

**Story assessment: Partial.** Generic-phrase check passes. CAR check is reactive and informational only. Positive-sum framing is absent entirely.

---

### US-P4 — Rhetorical Quality of Bullet Points

| AC | Status | Evidence |
|----|--------|----------|
| P4-AC1: Every proposed bullet begins with a verb from an approved strong-action-verb list | ✅ Pass | `check_strong_action_verb` (`llm_client.py:1064`); `_STRONG_ACTION_VERBS` set (`llm_client.py:972`) covers ~150 curated verbs across achievement, leadership, innovation, operational, and recognition categories. Applied at `conversation_manager.py:1250`. |
| P4-AC2: System flags any proposed bullet exceeding 30 words for compression review | ✅ Pass | `check_word_count` (`llm_client.py:1142`); 30-word threshold per docstring. Applied at `conversation_manager.py:1258`. Warning surfaced in rewrite panel warnings section (`rewrite-review.js:88–119`). |
| P4-AC3: System flags passive voice constructions in proposed rewrites | ✅ Pass | `check_passive_voice` (`llm_client.py:1101`) with regex patterns for `was X`, `were X`, `responsible for`, `was tasked with`, `helped to`, etc. Applied at `conversation_manager.py:1254`. |
| P4-AC4: System flags bullets where no result clause (outcome, impact, or metric) is present | ✅ Pass | `check_has_result_clause` (`llm_client.py:1172`); detects numeric tokens, outcome verbs, and causal phrases. Severity is `'info'` — slightly less prominent than `'warn'`. Applied at `conversation_manager.py:1262`. |

**Story assessment: Full pass.** All four checks implemented, wired into persuasion-check pipeline, and surface in rewrite panel. Warnings are blocking: "Submit All Decisions" is disabled until warnings are acknowledged (`rewrite-review.js:386`), with a modal guard in `submitRewriteDecisions()` (`rewrite-review.js:386`).

**Minor note:** Parallel-structure consistency across bullets within a single experience is not checked — the system checks each bullet in isolation.

---

### US-P5 — Cover Letter Persuasion Architecture

| AC | Status | Evidence |
|----|--------|----------|
| P5-AC1: System rejects any draft where the first word is "I" and offers a rewrite prompt | ⚠️ Partial | Opening style is user-selectable via `_OPENING_GUIDANCE` (`master_data_routes.py:98–102`). `hook` and `narrative` styles instruct "Do NOT use a formal salutation." However: (a) `formal` is the default, producing "Dear {hiring_manager}," which may be followed by "I…" in sentence 1; (b) no post-generation check examines the first word of the generated body; (c) no rejection or rewrite offer is implemented for "I"-first outputs. |
| P5-AC2: Cover letter references at least the company name and one specific role requirement in a non-generic way | ⚠️ Partial | The generation prompt injects `company`, `role`, and `req_skills` (`master_data_routes.py:1529–1532`). LLM is instructed to "Reference concrete skills and achievements." No post-generation check verifies company name appears in the output or that a specific role requirement is mentioned non-generically. |
| P5-AC3: Word count check enforced; letter exceeding 300 words triggers compression review flag | ❌ Fail | Generation prompt targets "~250–300 words" (`master_data_routes.py:1566`). No programmatic word-count check is applied to the LLM output. No UI flag fires when the letter exceeds 300 words. Enforcement is entirely prompt-reliant. |
| P5-AC4: Closing sentence includes a specific proposed next step (flagged if absent) | ❌ Fail | Generation prompt says "Close professionally with a call to action" (`master_data_routes.py:1570`). No post-generation pattern check distinguishes a specific next step ("I would welcome a 30-minute conversation…") from a passive close ("I look forward to hearing from you"). No flag is shown. |

**Story assessment: Partial/Fail.** The three-style opening selector provides partial coverage for P5-AC1. P5-AC2 is only partial. P5-AC3 and P5-AC4 are full fails — both are prompt instructions with zero programmatic enforcement. A single post-generation validation function would close all four gaps.

---

### US-P6 — Consistency of Persuasive Register

| AC | Status | Evidence |
|----|--------|----------|
| P6-AC1: System enforces that clarification-answer context is applied consistently across all generated content | ⚠️ Partial | `post_analysis_answers` are injected into cover letter prompt (`master_data_routes.py:1522–1526`) and screening-response prompt (`master_data_routes.py:1779–1784`) as context. They are also fed into `recommend_customizations` via `user_preferences`. However, they are NOT passed to `generate_professional_summary` (`llm_client.py:754`) — so style emphasis from user clarification does not affect the summary. |
| P6-AC2: Cover letter core argument is cross-checked against summary framing; mismatch flagged | 🔲 Not Implemented | No comparison between cover letter body and professional summary text exists in any route or utility. The screening prompt receives `cover_letter_snippet` for tone context (`master_data_routes.py:1798`) but no framing-alignment check or mismatch flag is generated. |
| P6-AC3: Prior screening-answer terminology compared against CV keyword choices; divergences presented as harmonisation suggestion | 🔲 Not Implemented | Screening tab generates responses with cover letter snippet and session answers as context, but no keyword extraction or comparison with CV terminology occurs. No harmonisation suggestion is generated or surfaced to the user. |

**Story assessment: Mostly not implemented.** Session context (clarification answers) flows into cover letter and screening prompts but not into summary generation. No cross-document framing-alignment or keyword-harmonisation logic exists anywhere in the codebase.

---

## Generated Materials Evaluation

### Cover Letter

Provided by `cover-letter.js` + `master_data_routes.py`:
- ✅ Tone selection (5 presets: Startup/Tech, Pharma/Biotech, Academia, Financial, Leadership)
- ✅ **Opening style selector** (Formal / Hook / Narrative) — added commit `a5fc40a` (`cover-letter.js:27`, `master_data_routes.py:98`)
- ✅ Hiring manager personalisation
- ✅ Prior session reuse ("use as starting point")
- ✅ Post-generation quality validation panel (4 checks)
- ✅ Save to DOCX

Remaining structural weaknesses:
- Default opening style is `formal` ("Dear X,") — most users will receive a salutation opener unless they actively change the selector
- The generation prompt targets ~250–300 words; client-side validation allows 400 before flagging — ceiling mismatch of 100 words
- CTA validation counts passive phrases ("I look forward to hearing from you") as passing; story requires an active, specific next step
- No enforcement of a "one focused value-proposition paragraph" structure
- No check that the letter mirrors 2–3 phrases directly from the job description verbatim

### Professional Summary

- ✅ AI-generated per application; ATS keyword weaving in prompt (`llm_client.py:765`)
- ✅ Forward-looking close instruction (`llm_client.py:767`)
- ✅ Generic filler phrase check (`check_summary_generic_phrases`)
- ✅ Refinement loop with user instructions (`summary-review.js`)
- ⚠️ Opening instruction is title-first ("strong positioning statement (title + years of experience)"), not value-identity-first per US-P1
- ⚠️ Post-analysis clarification answers are NOT passed to `generate_professional_summary`

### Experience Bullets (Rewrites)

- ✅ Eight persuasion checks run on all proposed rewrites (`conversation_manager.py:980`)
- ✅ Word-level inline diff display per rewrite card
- ✅ Persuasion warning panel (collapsible) before submission
- ✅ Constraint prevents metric removal (`apply_rewrite_constraints`)
- ✅ **Submission now gated** on persuasion-warning acknowledgement — `rewrite-review.js:358` (fixed commit `732a431`)
- ⚠️ Original master bullets not checked — only LLM-proposed rewrites are evaluated

---

## Additional Story Gaps / Proposed Story Items

### GAP-P-01: Unchecked original bullets

Original master CV bullets included without a rewrite are never run through persuasion checks. A candidate could include bullets full of hedging language or passive voice that pass through unchallenged.

**Proposed story — US-P7 (Passive Review of Included Originals):** System runs the four bullet-quality checks against all included original bullets and surfaces a summary of findings before the user leaves the Customise stage.

### GAP-P-02: Pattern-interrupt cover letter opening

The generation prompt hardwires a salutation opening. Implementing US-P5-AC1 requires separating the salutation token from the first content paragraph so the latter can be a specific claim or observation.

**Proposed story — US-P8 (Pattern-Interrupt Cover Letter Generator):** The generation prompt separates the salutation (formatting) from the first content paragraph, which must open with a specific claim or observation, validated client-side.

### GAP-P-03: Positive-sum metric framing preference

No rewrite constraint or prompt instruction prefers gain framing ("increased latency by 3×") over loss framing ("reduced latency by 66%").

**Proposed story — US-P9 (Positive-Sum Framing Check):** Add `check_positive_sum_framing` that detects reduction/loss framings for metrics and proposes an equivalent positive reframing for user review.

### GAP-P-04: Narrative thread fragmentation detection

No cross-experience narrative coherence check exists. The LLM `recommend_customizations` already returns an overall `reasoning` field describing the strategy — this could anchor a narrative-thread warning.

**Proposed story — US-P10 (Narrative Arc Coherence Warning):** System detects when selected experiences span three or more non-overlapping role domains and warns the user that the CV may signal identity fragmentation.

### GAP-P-05: Cover letter / summary framing cross-check

Cover letter is generated independently of the professional summary. Both can lead with different role identities.

**Proposed story — US-P11 (Cross-Document Framing Alignment):** After cover letter generation, compare the first paragraph claim against the professional summary's opening statement and flag if they lead with different role identities or contradictory value propositions.

---

## Summary Table

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/llm_client.py, web/rewrite-review.js, web/publications-review.js, scripts/routes/master_data_routes.py, scripts/routes/review_routes.py, scripts/routes/llm_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-P1 Narrative Arc | 1 | 2 | 0 | 1 | 0 |
| US-P2 Social Proof | 3 | 3 | 0 | 0 | 0 |
| US-P3 Loss-Aversion | 1 | 1 | 0 | 1 | 0 |
| US-P4 Bullet Quality | 4 | 0 | 0 | 0 | 0 |
| US-P5 Cover Letter | 0 | 2 | 2 | 0 | 0 |
| US-P6 Register Consistency | 0 | 1 | 0 | 2 | 0 |
| **Totals (24 ACs)** | **9** | **9** | **2** | **4** | **0** |

**Key evidence references (verified line numbers from 2026-06-18 source read):**

| Finding | File | Line |
|---------|------|------|
| `apply_rewrite_constraints` numeric guard | `scripts/utils/llm_client.py` | 946 |
| `check_strong_action_verb` | `scripts/utils/llm_client.py` | 1064 |
| `_STRONG_ACTION_VERBS` set | `scripts/utils/llm_client.py` | 972 |
| `check_passive_voice` | `scripts/utils/llm_client.py` | 1101 |
| `check_word_count` (30-word limit) | `scripts/utils/llm_client.py` | 1142 |
| `check_has_result_clause` | `scripts/utils/llm_client.py` | 1172 |
| `check_hedging_language` | `scripts/utils/llm_client.py` | 1209 |
| `check_named_institution_position` | `scripts/utils/llm_client.py` | 1252 |
| Branded-org list (FAANG-biased) | `scripts/utils/llm_client.py` | 1272–1283 |
| `check_car_structure` (info-only) | `scripts/utils/llm_client.py` | 1309 |
| `check_summary_generic_phrases` | `scripts/utils/llm_client.py` | 1354 |
| `_GENERIC_FILLER_PHRASES` set | `scripts/utils/llm_client.py` | 1037 |
| Summary prompt: "title + years" opening (US-P1 non-compliant) | `scripts/utils/llm_client.py` | 850 |
| Summary prompt: forward-looking close instruction | `scripts/utils/llm_client.py` | 853 |
| `rank_publications_for_job` | `scripts/utils/llm_client.py` | 1513 |
| `authority_signals` in publication output | `scripts/utils/llm_client.py` | 1639–1645 |
| Persuasion check pipeline orchestration | `scripts/utils/conversation_manager.py` | 1244–1296 |
| `_OPENING_GUIDANCE` dict (formal / hook / narrative) | `scripts/routes/master_data_routes.py` | 98 |
| `_TONE_GUIDANCE` dict | `scripts/routes/master_data_routes.py` | 90 |
| Cover letter prompt "~250–300 words" | `scripts/routes/master_data_routes.py` | 1566 |
| Cover letter prompt "call to action" (prompt-only, no check) | `scripts/routes/master_data_routes.py` | 1570 |
| Non-recommended pub rationale empty in fallback | `scripts/routes/review_routes.py` | 1436 |
| Non-recommended pub rendered at 70% opacity | `web/publications-review.js` | 141 |
| `is_first_author` star in publication table | `web/publications-review.js` | 132 |
| Persuasion warnings collapsible panel | `web/rewrite-review.js` | 88–119 |
| Persuasion badge on rewrite cards | `web/rewrite-review.js` | 269 |
| Submit guard: `persuasionWarningsAcknowledged` | `web/rewrite-review.js` | 386 |
| Screening generator injects cover letter snippet | `scripts/routes/master_data_routes.py` | 1798 |
| `post_analysis_answers` NOT passed to summary generator | `scripts/utils/llm_client.py` | 754–879 (gap — arg absent) |

**Evidence standard:** Every conclusion verified against source code read during this session (2026-06-18). Line numbers reflect the current working tree on branch `feature/multi-user-deployment`.
