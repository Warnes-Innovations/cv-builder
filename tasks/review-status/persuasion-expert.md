<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Persuasion Expert Review Status

**Last Updated:** 2026-06-20 (source-first refresh, rev 5 — full independent re-read of all 8 required source files; no inference from prior cycles)

**Cycle 5 source files read (fresh):**

`web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, `scripts/utils/llm_client.py`

Supplementary files verified for specific claims: `web/cover-letter.js`, `web/rewrite-review.js`, `web/publications-review.js`, `scripts/routes/master_data_routes.py`, `scripts/routes/review_routes.py`

**Cycle 5 status changes from cycle 4:**

1. **P1-AC1 upgraded ⚠️ Partial → ✅ Pass** — `llm_client.py:850` now explicitly instructs "Open with a value-identity statement: strong verb + differentiating value claim (e.g. 'Drives 3× revenue growth…', 'Builds ML pipelines that…') — NOT a title + years-of-experience formula". The prior cycle documented the old "title + years of experience" instruction; the current source has been corrected.

2. **All other AC statuses confirmed unchanged** — P5-AC3 word-count ceiling remains 400 (story requires 300); P5-AC4 CTA patterns still include passive phrases "hear from you" and "look forward to"; P6-AC1 gap (`post_analysis_answers` not passed to `generate_professional_summary`) confirmed still present at `master_data_routes.py:1154–1161`.

**Executive Summary (cycle 5):** Totals move from 9/11/0/4 to **10/10/0/4**. The one concrete regression-fix this cycle is the summary opening instruction, which now correctly specifies a value-identity-first prompt. The six persistent gaps remain: (1) narrative-fragmentation detection absent; (2) cover letter word-count ceiling at 400 vs story's 300; (3) CTA check accepts passive closes; (4) positive-sum framing not enforced; (5) `post_analysis_answers` not passed to summary generator; (6) no cross-document narrative framing check between cover letter and summary.

---

## Application Evaluation

### US-P1 — Narrative Arc and Identity Alignment

| AC | Status | Evidence |
| -- | ------ | -------- |
| P1-AC1: Summary opens with value-identity statement, not a job title or name | ✅ Pass | `llm_client.py:850` now instructs "Open with a value-identity statement: strong verb + differentiating value claim (e.g. 'Drives 3× revenue growth…', 'Builds ML pipelines that…') — NOT a title + years-of-experience formula". This replaced the old "title + years of experience" instruction and directly satisfies the story's requirement. No backend validation of the output exists, but the prompt instruction is correctly specified. |
| P1-AC2: At least one forward-looking statement in the summary | ✅ Pass | `llm_client.py:853` explicitly instructs "Close with a forward-looking statement aligned to the target role" in `generate_professional_summary`. Forward-looking close is required by the prompt. |
| P1-AC3: System warns if more than two equally-weighted narrative threads are present | 🔲 Not Implemented | No narrative-thread detection or identity-fragmentation warning anywhere in backend or frontend. Nothing in `conversation_manager.py`, `llm_client.py`, or any route file detects or warns on competing identities. |
| P1-AC4: Zero instances of "responsible for", "helped to", "assisted with", "was involved in" in proposed rewrites | ⚠️ Partial | `check_passive_voice` (`llm_client.py:1117`) and `check_hedging_language` (`llm_client.py:1226`) detect these exact patterns and are invoked on every proposed rewrite (`conversation_manager.py:1294–1311`). However, original master bullets that are included without rewrite are never checked. |

**Story assessment: Improved.** Forward-looking summary close is enforced. Opening instruction is now value-identity-first (cycle 5 fix — P1-AC1 upgraded to ✅). Narrative-fragmentation detection is absent.

---

### US-P2 — Social Proof and Authority Signals

| AC | Status | Evidence |
| -- | ------ | -------- |
| P2-AC1: `apply_rewrite_constraints` rejects any proposal that removes or vagues-over a numeric metric | ✅ Pass | `llm_client.py:945–948` — all numeric tokens from the original must be a subset of those in the proposed text; rewrite is discarded otherwise. Applied via `apply_rewrite_constraints` in `_propose_rewrites_via_chat` at `llm_client.py:1875–1883`. |
| P2-AC2: Named recognisable organisations appear within first 15 words | ⚠️ Partial | `check_named_institution_position` at `llm_client.py:1268` checks a hardcoded set of ~50 brand names (`llm_client.py:1289–1300`). The list covers FAANG, pharma (Pfizer, Moderna, Genentech, Amgen), universities, and top journals/conferences. Notable absences for biotech/global pharma: Roche, AstraZeneca, Novartis, GSK, Sanofi, Eli Lilly, Abbott, Illumina. Warning fires in rewrite panel (`rewrite-review.js:109`). |
| P2-AC3: Conditional omission decisions for Publications/Awards surfaced to user with rationale | ⚠️ Partial | Non-recommended publications are appended with `is_recommended=False` and rendered at 70% opacity (`publications-review.js:141`). However, `rationale` is `''` for all non-recommended entries (`review_routes.py:1436`). The user sees which publications were deprioritised but receives no explanation why. |
| P2-AC4: Publication list ranked by job-relevance (keyword + domain + authority signals) | ✅ Pass | `rank_publications_for_job` (`llm_client.py:1530`) prompts the LLM using domain, required skills, and ATS keywords; results sorted by `relevance_score` descending then year descending (`llm_client.py:1692`). LLM determines `is_first_author`. |
| P2-AC5: Each recommended publication shows at least one authority signal | ⚠️ Partial | `authority_signals` list populated with `first_author` and `journal:`/`conference:` tokens (`llm_client.py:1656–1662`). UI renders `is_first_author` as a star and the citation text (`publications-review.js:132`). Full `authority_signals` array is not rendered as distinct badges; citation count is not a data field. |
| P2-AC6: System flags bullets where a number is present in master data but absent in the proposed rewrite | ✅ Pass (silent) | `apply_rewrite_constraints` enforces this — proposals that drop numbers are filtered out (`llm_client.py:1875–1883`). The user sees fewer proposals but no explicit "a metric was stripped" flag. Constraint is enforced; UX transparency is a minor gap. |

**Story assessment: Mostly passing.** Metric-preservation and publication-ranking mechanics are solid. Gaps: institution name list is incomplete for global pharma; non-recommended publication rationale is always empty; authority signals are partially displayed in UI.

---

### US-P3 — Loss-Aversion and Urgency Framing

| AC | Status | Evidence |
| -- | ------ | -------- |
| P3-AC1: System identifies and proposes CAR (Challenge-Action-Result) structure for bullets where challenge language exists | ⚠️ Partial | `check_car_structure` (`llm_client.py:1325`) detects presence/absence of challenge and result patterns and fires as `severity='info'` when missing (`llm_client.py:1363`). Applied to experience bullets at `conversation_manager.py:1318–1321`. However: (a) the check fires on proposed rewrites, not on master data to detect preservation opportunities; (b) it does not generate a CAR-structured alternative proposal; (c) the check is only informational — no CAR-specific rewrite is offered. |
| P3-AC2: Rewrites prefer positive-sum metric framing ("increased X") over loss framing ("reduced Y") unless loss-framing is impressive | 🔲 Not Implemented | No positive-sum vs. loss-framing check or prompt instruction exists in `llm_client.py`, `conversation_manager.py`, or the rewrite prompt (`llm_client.py:1809–1854`). The rewrite prompt requires preserving metrics but does not specify framing direction. `check_has_result_clause` at `llm_client.py:1209` lists "reduced" as an equally valid result indicator alongside "increased" and "improved". |
| P3-AC3: Summary rewrite checked against generic filler phrases; flagged if more than one appears | ✅ Pass | `check_summary_generic_phrases` (`llm_client.py:1371`) with `_GENERIC_FILLER_PHRASES` set (`llm_client.py:1037`). Severity is `'warn'` at >2 matches, `'info'` for 2 or fewer. Applied at `conversation_manager.py:1323–1326`. |

**Story assessment: Partial.** Generic-phrase check passes. CAR check is reactive and informational only. Positive-sum framing is absent entirely.

---

### US-P4 — Rhetorical Quality of Bullet Points

| AC | Status | Evidence |
| -- | ------ | -------- |
| P4-AC1: Every proposed bullet begins with a verb from an approved strong-action-verb list | ✅ Pass | `check_strong_action_verb` (`llm_client.py:1079`); `_STRONG_ACTION_VERBS` set (`llm_client.py:972`) covers ~150 curated verbs across achievement, leadership, innovation, operational, and recognition categories. `_strip_intro_phrase()` called at line 1097 before verb extraction. Applied at `conversation_manager.py:1293–1295`. |
| P4-AC2: System flags any proposed bullet exceeding 30 words for compression review | ✅ Pass | `check_word_count` (`llm_client.py:1158`); 30-word threshold per docstring. `_strip_intro_phrase()` called at line 1176 before word count. Applied at `conversation_manager.py:1301–1303`. Warning surfaced in rewrite panel warnings section (`rewrite-review.js:108–118`). |
| P4-AC3: System flags passive voice constructions in proposed rewrites | ✅ Pass | `check_passive_voice` (`llm_client.py:1117`) with regex patterns for `was X`, `were X`, `responsible for`, `was tasked with`, `helped to`, etc. Applied at `conversation_manager.py:1297–1299`. |
| P4-AC4: System flags bullets where no result clause (outcome, impact, or metric) is present | ✅ Pass | `check_has_result_clause` (`llm_client.py:1188`); detects numeric tokens, outcome verbs, and causal phrases. Severity is `'info'`. Applied at `conversation_manager.py:1305–1307`. |

**Story assessment: Full pass.** All four checks implemented, wired into persuasion-check pipeline, and surface in rewrite panel. Warnings panel defaults open (`rewrite-review.js:107` `display:block`). Submit button disabled until `persuasionWarningsAcknowledged = true` (`rewrite-review.js:375–376`) with a secondary modal guard in `submitRewriteDecisions()` at line 384. When no warnings are present the flag is pre-set at line 52.

**Minor note:** Parallel-structure consistency across bullets within a single experience is not checked — the system checks each bullet in isolation.

---

### US-P5 — Cover Letter Persuasion Architecture

| AC | Status | Evidence |
| -- | ------ | -------- |
| P5-AC1: System rejects any draft where the first word is "I" and offers a rewrite prompt | ⚠️ Partial | Opening style is user-selectable via `_OPENING_GUIDANCE` (`master_data_routes.py:98–102`). `hook` and `narrative` styles instruct "Do NOT use a formal salutation." `_validateCoverLetter()` (`cover-letter.js:481–497`) checks for generic salutation openers (e.g. "Dear Hiring Manager"). However: (a) `formal` is the first/default option in the UI selector (`cover-letter.js:28`), producing "Dear {hiring_manager}," which may be followed by "I…" in sentence 1; (b) no check detects "I" as the first word of the first content sentence; (c) no rejection or rewrite offer is implemented for "I"-first content sentence outputs. |
| P5-AC2: Cover letter references at least the company name and one specific role requirement in a non-generic way | ⚠️ Partial | The generation prompt injects `company`, `role`, and `req_skills` (`master_data_routes.py:1560–1563`). `_validateCoverLetter()` checks company name mentions with a pass/warn/fail scale (`cover-letter.js:500–516`). No post-generation check verifies a specific role requirement is mentioned non-generically. |
| P5-AC3: Word count check enforced; letter exceeding 300 words triggers compression review flag | ⚠️ Partial | `_validateCoverLetter()` at `cover-letter.js:518–527` applies a programmatic word-count check with visual bar and colour coding. The UI label reads "Word count (250–400)" and the check passes anything in range 250–400 as green and flags 401+ as amber/red. The generation prompt targets ~250–300 words (`master_data_routes.py:1576`) but the UI ceiling is 400 — a 350-word letter receives a passing "good" status. Story requires flagging at 300. |
| P5-AC4: Closing sentence includes a specific proposed next step (flagged if absent) | ⚠️ Partial | `_validateCoverLetter()` checks the closing paragraph for a CTA pattern (`cover-letter.js:531–544`). However, `ctaPatterns` at line 532 includes passive phrases (`/hear from you/i`, `/look forward to/i`) — these pass the check despite not meeting the story's requirement for an active, specific next step. No distinction between active and passive CTA is enforced. |

**Story assessment: Partial.** All four rules have client-side programmatic checks in `_validateCoverLetter()`. P5-AC1 lacks a first-content-sentence "I" check (only generic salutation is checked). P5-AC3's word-count ceiling is 100 words too high. P5-AC4's CTA check accepts passive closes.

---

### US-P6 — Consistency of Persuasive Register

| AC | Status | Evidence |
| -- | ------ | -------- |
| P6-AC1: System enforces that clarification-answer context is applied consistently across all generated content | ⚠️ Partial | `post_analysis_answers` are injected into cover letter prompt (`master_data_routes.py:1531–1536`) and screening-response prompt. They are NOT passed to `generate_professional_summary` (`master_data_routes.py:1154–1161` — the call to `llm_client_ref['value'].generate_professional_summary` passes only `job_analysis`, `master_data`, `selected_experiences`, `refinement_prompt`, `previous_summary`). Style emphasis from user clarification does not affect the summary. |
| P6-AC2: Cover letter core argument is cross-checked against summary framing; mismatch flagged | 🔲 Not Implemented | No comparison between cover letter body and professional summary text exists in any route or utility. `_renderConsistencyReport` (`cover-letter.js:336–457`) checks only: company name, job title, ATS keyword presence, and date format consistency — no narrative or framing alignment. |
| P6-AC3: Prior screening-answer terminology compared against CV keyword choices; divergences presented as harmonisation suggestion | 🔲 Not Implemented | Screening tab generates responses with cover letter snippet and session answers as context, but no keyword extraction or comparison with CV terminology occurs. No harmonisation suggestion is generated or surfaced. |

**Story assessment: Mostly not implemented.** Session context (clarification answers) flows into cover letter and screening prompts but not into summary generation. No cross-document framing-alignment or keyword-harmonisation logic exists anywhere in the codebase.

---

## Generated Materials Evaluation

### Cover Letter

Provided by `cover-letter.js` + `master_data_routes.py`:

- ✅ Tone selection (5 presets: Startup/Tech, Pharma/Biotech, Academia, Financial, Leadership)
- ✅ Opening style selector (Formal / Hook / Narrative) — `cover-letter.js:27`, `master_data_routes.py:98`
- ✅ Hiring manager personalisation
- ✅ Prior session reuse ("use as starting point")
- ✅ Post-generation quality validation panel — `_validateCoverLetter()` with 4 checks (opening salutation, company reference, word count, CTA)
- ✅ Save to DOCX

Remaining structural weaknesses:

- Default opening style is `formal` ("Dear X,") — first option in selector at `cover-letter.js:28` — most users receive a salutation opener unless they actively change it
- Word-count ceiling in UI is 400 vs story's 300-word flag threshold; a 350-word letter passes as green
- CTA check accepts passive phrases ("I look forward to hearing from you") as passing; story requires active specific next-step language
- No enforcement of a "one focused value-proposition paragraph" structure
- No check that the letter mirrors 2–3 phrases directly from the job description verbatim
- No first-content-sentence "I" check (only salutation-style generic opener is checked)

### Professional Summary

- ✅ AI-generated per application; ATS keyword weaving in prompt (`llm_client.py:851`)
- ✅ **Opening instruction corrected (cycle 5)** — `llm_client.py:850` now instructs value-identity-first opening ("strong verb + differentiating value claim … NOT a title + years-of-experience formula")
- ✅ Forward-looking close instruction (`llm_client.py:853`)
- ✅ Generic filler phrase check (`check_summary_generic_phrases`)
- ✅ Refinement loop with user instructions (`summary-review.js`)
- ⚠️ Post-analysis clarification answers are NOT passed to `generate_professional_summary` — `master_data_routes.py:1154–1161` shows the call does not include `post_analysis_answers`

### Experience Bullets (Rewrites)

- ✅ Eight persuasion checks run on all proposed rewrites (`conversation_manager.py:1288–1342`)
- ✅ Word-level inline diff display per rewrite card
- ✅ Persuasion warning panel defaults open (`rewrite-review.js:107` `display:block`)
- ✅ Constraint prevents metric removal (`apply_rewrite_constraints`)
- ✅ Submit gate hard-disabled on persuasion-warning acknowledgement — `rewrite-review.js:375–376`; modal guard at line 384; no-warnings pre-set at line 52
- ✅ `_strip_intro_phrase()` prevents false-positive failures on label-prefixed bullets (`llm_client.py:1064`, `1097`, `1176`)
- ⚠️ Original master bullets not checked — only LLM-proposed rewrites are evaluated

---

## Additional Story Gaps / Proposed Story Items

### GAP-P-01: Unchecked original bullets

Original master CV bullets included without a rewrite are never run through persuasion checks. A candidate could include bullets full of hedging language or passive voice that pass through unchallenged.

**Proposed story — US-P7 (Passive Review of Included Originals):** System runs the four bullet-quality checks against all included original bullets and surfaces a summary of findings before the user leaves the Customise stage.

### GAP-P-02: Pattern-interrupt cover letter opening

The default opening style (`formal`) produces a salutation. The first-content-sentence may start with "I" without any check or flag.

**Proposed story — US-P8 (Pattern-Interrupt Cover Letter Generator):** Check the first word of the first non-salutation content paragraph; flag and offer rewrite if it begins with "I". Tighten word-count ceiling from 400 to 300 in `_validateCoverLetter` (`cover-letter.js:518–527`). Update `ctaPatterns` to require active-voice specificity (exclude "look forward to", "hear from you").

### GAP-P-03: Positive-sum metric framing preference

No rewrite constraint or prompt instruction prefers gain framing ("increased latency by 3×") over loss framing ("reduced latency by 66%").

**Proposed story — US-P9 (Positive-Sum Framing Check):** Add `check_positive_sum_framing` that detects reduction/loss framings for metrics and proposes an equivalent positive reframing for user review.

### GAP-P-04: Narrative thread fragmentation detection

No cross-experience narrative coherence check exists. The LLM `recommend_customizations` already returns an overall `reasoning` field describing the strategy — this could anchor a narrative-thread warning.

**Proposed story — US-P10 (Narrative Arc Coherence Warning):** System detects when selected experiences span three or more non-overlapping role domains and warns the user that the CV may signal identity fragmentation.

### GAP-P-05: Cover letter / summary framing cross-check

Cover letter is generated independently of the professional summary. Both can lead with different role identities.

**Proposed story — US-P11 (Cross-Document Framing Alignment):** After cover letter generation, compare the first paragraph claim against the professional summary's opening statement and flag if they lead with different role identities or contradictory value propositions.

### GAP-P-06: Post-analysis clarification context missing from summary generation

`post_analysis_answers` (style emphasis from user clarification step) are passed to cover letter and screening prompts but not to `generate_professional_summary`, producing a register mismatch between the summary and the rest of the application materials.

**Fix:** Pass `post_analysis_answers` to `generate_professional_summary` in `master_data_routes.py:1154–1161` and incorporate them as style/emphasis constraints in the generation prompt (`llm_client.py:754–879`).

---

## Summary Table

**Reviewed against:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, `scripts/utils/llm_client.py`, `web/cover-letter.js`, `web/rewrite-review.js`, `web/publications-review.js`, `scripts/routes/master_data_routes.py`, `scripts/routes/review_routes.py`

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
| US-P1 Narrative Arc | 2 | 1 | 0 | 1 | 0 |
| US-P2 Social Proof | 3 | 3 | 0 | 0 | 0 |
| US-P3 Loss-Aversion | 1 | 1 | 0 | 1 | 0 |
| US-P4 Bullet Quality | 4 | 0 | 0 | 0 | 0 |
| US-P5 Cover Letter | 0 | 4 | 0 | 0 | 0 |
| US-P6 Register Consistency | 0 | 1 | 0 | 2 | 0 |
| **Totals (24 ACs)** | **10** | **10** | **0** | **4** | **0** |

*Cycle 5 change: P1-AC1 upgraded from ⚠️ Partial to ✅ Pass — summary prompt now correctly instructs value-identity-first opening (`llm_client.py:850`).*

**Key evidence references (verified line numbers from 2026-06-20 source read, branch `feature/multi-user-deployment`):**

| Finding | File | Line |
| ------- | ---- | ---- |
| Summary prompt: value-identity-first opening (P1-AC1 — FIXED cycle 5) | `scripts/utils/llm_client.py` | 850 |
| Summary prompt: forward-looking close instruction | `scripts/utils/llm_client.py` | 853 |
| `apply_rewrite_constraints` numeric guard | `scripts/utils/llm_client.py` | 945–948 |
| `_STRONG_ACTION_VERBS` set | `scripts/utils/llm_client.py` | 972 |
| `_GENERIC_FILLER_PHRASES` set | `scripts/utils/llm_client.py` | 1037 |
| `_strip_intro_phrase()` helper | `scripts/utils/llm_client.py` | 1064 |
| `check_strong_action_verb` — calls `_strip_intro_phrase` | `scripts/utils/llm_client.py` | 1079, 1097 |
| `check_passive_voice` | `scripts/utils/llm_client.py` | 1117 |
| `check_word_count` (30-word limit) — calls `_strip_intro_phrase` | `scripts/utils/llm_client.py` | 1158, 1176 |
| `check_has_result_clause` | `scripts/utils/llm_client.py` | 1188 |
| `check_hedging_language` | `scripts/utils/llm_client.py` | 1226 |
| `check_named_institution_position` | `scripts/utils/llm_client.py` | 1268 |
| Branded-org list (global pharma incomplete) | `scripts/utils/llm_client.py` | 1289–1300 |
| `check_car_structure` (info-only) | `scripts/utils/llm_client.py` | 1325 |
| `check_summary_generic_phrases` | `scripts/utils/llm_client.py` | 1371 |
| `rank_publications_for_job` | `scripts/utils/llm_client.py` | 1530 |
| `authority_signals` in publication output | `scripts/utils/llm_client.py` | 1656–1662 |
| Sort by relevance_score descending then year | `scripts/utils/llm_client.py` | 1692 |
| Persuasion check pipeline orchestration | `scripts/utils/conversation_manager.py` | 1288–1342 |
| `_OPENING_GUIDANCE` dict (formal / hook / narrative) | `scripts/routes/master_data_routes.py` | 98–102 |
| Cover letter prompt "~250–300 words" | `scripts/routes/master_data_routes.py` | 1576 |
| `post_analysis_answers` injected into cover letter prompt | `scripts/routes/master_data_routes.py` | 1531–1536 |
| `post_analysis_answers` NOT passed to summary generator (gap) | `scripts/routes/master_data_routes.py` | 1154–1161 |
| Non-recommended pub rationale empty in fallback | `scripts/routes/review_routes.py` | 1436 |
| Non-recommended pub rendered at 70% opacity | `web/publications-review.js` | 141 |
| `is_first_author` star in publication table | `web/publications-review.js` | 132 |
| Persuasion warnings panel `display:block` (defaults open) | `web/rewrite-review.js` | 107 |
| `persuasionWarningsAcknowledged` pre-set when no warnings | `web/rewrite-review.js` | 52 |
| Submit gate: `submitBtn.disabled = (pending > 0) \|\| needsAck` | `web/rewrite-review.js` | 375–376 |
| `submitRewriteDecisions()` modal guard | `web/rewrite-review.js` | 384–391 |
| `_validateCoverLetter()` — generic salutation opener check | `web/cover-letter.js` | 481–497 |
| `_validateCoverLetter()` — company reference check | `web/cover-letter.js` | 500–516 |
| `_validateCoverLetter()` — word-count check (UI ceiling 400, not 300) | `web/cover-letter.js` | 518–527 |
| `_validateCoverLetter()` — CTA check (accepts passive closes) | `web/cover-letter.js` | 531–544 |
| `_renderConsistencyReport()` — keyword/company/date only (no narrative check) | `web/cover-letter.js` | 336–457 |

**Evidence standard:** Every conclusion verified against source code read during this session (2026-06-20 cycle 5). Line numbers reflect the current working tree on branch `feature/multi-user-deployment`.
